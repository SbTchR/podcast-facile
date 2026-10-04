#!/usr/bin/env python3
"""Rebuild the maintained podcast beds (curl, ffmpeg and ffprobe required)."""
import argparse
import concurrent.futures
import hashlib
import html
import json
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'public/audio/podcast-music'
CHANGES = 'Extrait de fond sélectionné, niveau harmonisé à −20 LUFS, microfondus de 80 ms, MP3 stéréo 160 kbit/s à 44,1 kHz. Tempo et hauteur conservés.'

def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def duration(path):
    return float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)]))

def loudness(path):
    result = subprocess.run(['ffmpeg', '-hide_banner', '-nostdin', '-i', str(path),
                             '-af', 'loudnorm=I=-20:TP=-2:LRA=11:print_format=json', '-f', 'null', '-'],
                            check=True, capture_output=True, text=True)
    measurements, _ = json.JSONDecoder().raw_decode(result.stderr[result.stderr.rfind('{'):])
    return measurements

def prepare(row, cached, force):
    output = PACK / row['filename']
    previous = cached.get(row['id'])
    if not force and previous and output.exists() and sha(output) == previous['sha256']:
        assert all(previous[k] == v for k, v in row.items()), f"Recipe changed: {row['id']}; rerun with --force"
        return previous
    cache = Path(tempfile.gettempdir()) / 'podcast-facile-music-originals'
    cache.mkdir(exist_ok=True)
    original = cache / (row['id'] + '.mp3')
    if not original.exists():
        pending = original.with_suffix('.download')
        run(['curl', '-fLsS', '--retry', '2', '--max-time', '90', row['sourceUrl'], '-o', str(pending)])
        assert duration(pending) >= row['excerptStart'] + row['excerptDuration'], row['id']
        pending.replace(original)
    original_hash = sha(original)
    if previous:
        assert original_hash == previous['originalSha256'], f"Upstream changed: {row['id']}"
    start, length = row['excerptStart'], row['excerptDuration']
    # Materialise the slice before measuring: FFmpeg look-ahead filters must not
    # include later parts of the original in this excerpt's loudness statistics.
    with tempfile.TemporaryDirectory(prefix='podcast-music-excerpt-') as scratch:
        excerpt = Path(scratch) / 'excerpt.wav'
        run(['ffmpeg', '-hide_banner', '-nostdin', '-v', 'error', '-ss', str(start), '-i', str(original),
             '-t', str(length), '-ar', '44100', '-ac', '2', '-codec:a', 'pcm_f32le', str(excerpt)])
        fade = f"afade=t=in:d=0.08,afade=t=out:st={length - .08}:d=0.08"
        base = ['ffmpeg', '-hide_banner', '-nostdin', '-v', 'info', '-i', str(excerpt)]
        first = subprocess.run(base + ['-af', fade + ',loudnorm=I=-20:TP=-2:LRA=11:print_format=json', '-f', 'null', '-'], check=True, capture_output=True, text=True)
        measurements, _ = json.JSONDecoder().raw_decode(first.stderr[first.stderr.rfind('{'):])
        norm = 'loudnorm=I=-20:TP=-2:LRA=11:linear=true:' + ':'.join([
            'measured_I=' + measurements['input_i'], 'measured_TP=' + measurements['input_tp'],
            'measured_LRA=' + measurements['input_lra'], 'measured_thresh=' + measurements['input_thresh'],
            'offset=' + measurements['target_offset'],
        ])
        # Preserve the groove and dynamics with a fixed gain whenever the
        # measured peak already leaves headroom for the MP3 encoding.
        gain = -20 - float(measurements['input_i'])
        if float(measurements['input_tp']) + gain <= -2.4:
            norm = f'volume={gain:.3f}dB'
        pending = output.with_suffix('.pending.mp3')
        encode = ['-y', '-af', fade + ',' + norm, '-ar', '44100', '-ac', '2', '-codec:a', 'libmp3lame', '-b:a', '160k',
                  '-map_metadata', '-1', '-metadata', 'title=' + row['originalTitle'], '-metadata', 'artist=' + row['author'],
                  '-metadata', 'copyright=' + row['license'] + ' ' + row['licenseUrl'], str(pending)]
        run(base + encode)
        encoded = loudness(pending)
        if abs(float(encoded['input_i']) + 20) > .8:
            # Check the encoded file too: gating and MP3 encoding can change the
            # measured level. Correct from the WAV again, without lossy re-encoding.
            correction = -20 - float(encoded['input_i'])
            if float(encoded['input_tp']) + correction <= -2.4:
                encode[2] += f',volume={correction:.3f}dB'
            else:
                encode[2] = fade + ',loudnorm=I=-20:TP=-2:LRA=11:offset=' + measurements['target_offset']
            run(base + encode)
            encoded = loudness(pending)
        assert abs(float(encoded['input_i']) + 20) <= .8, f"Loudness outside target: {row['id']}"
        assert float(encoded['input_tp']) <= -1.2, f"Insufficient peak headroom: {row['id']}"
        pending.replace(output)
    result = {**row, 'originalSha256': original_hash, 'originalDuration': round(duration(original), 3),
              'preparedDuration': round(duration(output), 3), 'sha256': sha(output), 'changes': CHANGES}
    print(f"Prepared {row['id']}: {result['preparedDuration']} s", flush=True)
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--force', action='store_true')
    parser.add_argument('--jobs', type=int, default=3)
    parser.add_argument('--force-id', action='append', default=[], help='Rebuild one selection without rebuilding the rest; repeat for multiple IDs.')
    args = parser.parse_args()
    rows = json.loads((PACK / 'selection.json').read_text())
    previous = json.loads((PACK / 'sources.json').read_text()) if (PACK / 'sources.json').exists() else []
    cached = {row['id']: row for row in previous}
    assert set(args.force_id) <= {row['id'] for row in rows}, 'Unknown --force-id'
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.jobs) as pool:
        sources = list(pool.map(lambda row: prepare(row, cached, args.force or row['id'] in args.force_id), rows))
    (PACK / 'sources.json').write_text(json.dumps(sources, ensure_ascii=False, indent=2) + '\n')
    presets = []
    for row in sources:
        preset = {key: row[key] for key in ['id', 'title', 'category', 'icon', 'description', 'tags', 'filename', 'sourcePage', 'author', 'license', 'licenseUrl']}
        preset.update(kind='music', duration=row['preparedDuration'], clipStart=0, clipDuration=row['preparedDuration'], audioUrl='audio/podcast-music/' + row['filename'],
                      fallbackUrl='audio/podcast-music/' + row['filename'], origin='recording',
                      attribution=f"{row['originalTitle']} — {row['author']} — {row['license']}. Source : {row['sourcePage']}. Licence : {row['licenseUrl']}. {CHANGES}")
        if 'sourceBpm' in row:
            tempo = str(row['sourceBpm']) + ' bpm'
            preset['tags'] = [row['tags'][0], tempo, *[tag for tag in row['tags'][1:] if tag != tempo]]
        presets.append(preset)
    (ROOT / 'src/data/podcastMusic.ts').write_text("// Generated by scripts/prepare-podcast-music.py; edit selection.json.\nimport type { LibraryPreset } from './audioLibrary';\n\nexport const PODCAST_MUSIC: LibraryPreset[] = " + json.dumps(presets, ensure_ascii=False, indent=2) + ';\n')
    e = html.escape
    credits = '<!-- podcast-music:start --><h2>Musiques de fond — sélection podcast</h2><p>' + f'{len(sources)} fonds instrumentaux. Des accompagnements radio, des thèmes de récit et des rythmes funk, R&B, électro, disco, rock, country, calypso, tango, cumbia, ska et chiptune. Extraits locaux de 90 à 120 secondes. ' + e(CHANGES) + ' Joindre les crédits des musiques utilisées à la description du podcast.</p><table><thead><tr><th>Titre dans l’application / original</th><th>Auteur</th><th>Licence</th><th>Source et modifications</th></tr></thead><tbody>'
    for row in sources:
        credits += '<tr><td>' + e(row['title'] + ' / ' + row['originalTitle']) + '</td><td>' + e(row['author']) + '</td><td><a href="' + e(row['licenseUrl']) + '">' + e(row['license']) + '</a></td><td><a href="' + e(row['sourcePage']) + '">Source</a> · ' + e(CHANGES) + f" Extrait original : {row['excerptStart']}–{row['excerptStart'] + row['excerptDuration']} s." + '</td></tr>'
    credits += '</tbody></table><!-- podcast-music:end -->'
    path = ROOT / 'public/audio-credits.html'
    page = path.read_text()
    if '<!-- podcast-music:start -->' in page:
        start = page.index('<!-- podcast-music:start -->')
        end = page.index('<!-- podcast-music:end -->', start) + len('<!-- podcast-music:end -->')
        page = page[:start] + credits + page[end:]
    else:
        page = page.replace('<!-- curated-sounds:start -->', credits + '<!-- curated-sounds:start -->', 1)
    path.write_text(page)
    print(f"{len(presets)} podcast beds ready ({sum((PACK / r['filename']).stat().st_size for r in sources) / 1e6:.1f} MB).")

if __name__ == '__main__':
    main()
