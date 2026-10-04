#!/usr/bin/env python3
"""Prepare reproducible, short CC0 transitions from the credited source manifest.

Requires ffmpeg. Downloads stay in /tmp; excerpts and provenance ship with the app.
Existing sources and prepared files are hash checked before reuse. --force rebuilds.
"""
import argparse
import array
import concurrent.futures
import hashlib
import html
import json
import math
from pathlib import Path
import subprocess
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public/audio/podcast-transitions'
CACHE = Path('/tmp/podcast-facile-transition-originals')
RATE = 44100
VERSION = 4


def digest(data):
    return hashlib.sha256(data).hexdigest()


def decode(path):
    data = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ar', str(RATE),
                           '-ac', '2', '-f', 'f32le', '-'], check=True, capture_output=True).stdout
    samples = array.array('f')
    samples.frombytes(data)
    if sys.byteorder != 'little':
        samples.byteswap()
    return samples


def db(value):
    return 20 * math.log10(max(1e-12, value))


def levels(samples):
    # 10 ms windows, averaged over both channels; quiet tails do not lower the target.
    width = RATE // 100 * 2
    windows = [math.sqrt(sum(v*v for v in samples[i:i+width]) / len(samples[i:i+width]))
               for i in range(0, len(samples), width)]
    loudest = max(windows, default=0)
    active = [v for v in windows if v >= loudest * .08]
    rms = math.sqrt(sum(v*v for v in active) / max(1, len(active)))
    return windows, rms, max(map(abs, samples), default=0)


def recipe(row):
    settings = {key: row[key] for key in ['downloadUrl', 'startSeconds', 'maxSeconds']}
    if 'peakCompression' in row:
        settings['peakCompression'] = row['peakCompression']
    return digest(json.dumps(settings | {'version': VERSION}, sort_keys=True).encode())


def prepare(row, force):
    assert row['license'] == 'CC0'
    filename = row['id'] + '.mp3'
    output = DEST / filename
    if not force and output.exists() and row.get('preparationRecipeSha256') == recipe(row):
        if digest(output.read_bytes()) == row.get('sha256'):
            return row
    original = CACHE / filename
    if not original.exists():
        request = urllib.request.Request(row['downloadUrl'], headers={'User-Agent': 'PodcastFacile/1.0'})
        with urllib.request.urlopen(request, timeout=45) as response:
            content = response.read()
        if not content or content.lstrip().startswith(b'<'):
            raise ValueError('Invalid audio: ' + row['id'])
        original.write_bytes(content)
    source_hash = digest(original.read_bytes())
    if row.get('downloadSha256') and row['downloadSha256'] != source_hash:
        raise ValueError('Source changed: ' + row['id'])
    samples = decode(original)
    start = int(row['startSeconds'] * RATE) * 2
    maximum = int(min(7.95, row['maxSeconds']) * RATE) * 2
    samples = samples[start:start+maximum]
    windows, rms, peak = levels(samples)
    if peak < .0001:
        raise ValueError('Silent transition: ' + row['id'])
    # Keep 20 ms before the attack and 80 ms after the audible tail.
    audible = [i for i, value in enumerate(windows) if value >= max(windows) * .015]
    first = max(0, audible[0] * (RATE // 100) - int(.02 * RATE))
    last = min(len(samples) // 2, (audible[-1]+1) * (RATE // 100) + int(.08 * RATE))
    samples = samples[first*2:last*2]
    _, rms, peak = levels(samples)
    # Tame isolated peaks in paper/percussion before normalizing the audible body.
    compressed = db(peak / rms) > 14
    if compressed:
        compression = row.get('peakCompression', {'thresholdRmsMultiple': 2, 'ratio': 4})
        threshold = max(.001, min(1, rms * compression['thresholdRmsMultiple']))
        ratio = compression['ratio']
        if sys.byteorder != 'little':
            samples.byteswap()
        data = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(RATE),
                               '-ac', '2', '-i', '-', '-af',
                               f'acompressor=threshold={threshold}:ratio={ratio}:attack=0.1:release=40:detection=peak',
                               '-f', 'f32le', '-'], input=samples.tobytes(),
                              check=True, capture_output=True).stdout
        samples = array.array('f')
        samples.frombytes(data)
        if sys.byteorder != 'little':
            samples.byteswap()
        _, rms, peak = levels(samples)
    # Target -17 dBFS active RMS; MP3 encoding can overshoot, so reserve 2.5 dB.
    gain = min(10**(-17/20) / rms, 10**(-2.5/20) / peak)
    duration = len(samples) / (2 * RATE)
    fade_in = min(int(.005 * RATE), len(samples) // 4)
    fade_out = min(int(.065 * RATE), len(samples) // 4)
    frames = len(samples) // 2
    for frame in range(frames):
        envelope = min(1, frame / max(1, fade_in), (frames-1-frame) / max(1, fade_out))
        samples[frame*2] *= gain * envelope
        samples[frame*2+1] *= gain * envelope
    if sys.byteorder != 'little':
        samples.byteswap()
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(RATE), '-ac', '2',
                    '-i', '-', '-codec:a', 'libmp3lame', '-b:a', '192k', '-map_metadata', '-1', str(output)],
                   input=samples.tobytes(), check=True)
    decoded = decode(output)
    _, final_rms, final_peak = levels(decoded)
    return {**row, 'filename': filename, 'preparedDuration': round(duration, 4), 'channels': 2,
            'sourceStart': round(row['startSeconds'] + first/RATE, 4),
            'downloadSha256': source_hash, 'sha256': digest(output.read_bytes()),
            'bytes': output.stat().st_size, 'activeRmsDb': round(db(final_rms), 2),
            'peakDb': round(db(final_peak), 2), 'gainDb': round(db(gain), 2), 'compressedPeaks': compressed,
            'preparationRecipeSha256': recipe(row),
            'changes': 'Extrait court, silences retirés, niveau harmonisé, fondus de 5/65 ms, MP3 stéréo 192 kbit/s.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--force', action='store_true')
    parser.add_argument('--jobs', type=int, default=3)
    args = parser.parse_args()
    CACHE.mkdir(parents=True, exist_ok=True)
    manifest = DEST / 'sources.json'
    rows = json.loads(manifest.read_text())
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.jobs) as pool:
        rows = list(pool.map(lambda row: prepare(row, args.force), rows))
    manifest.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + '\n')
    presets = []
    for row in rows:
        preset = {key: row[key] for key in ['id', 'title', 'icon', 'description', 'tags',
                                            'sourcePage', 'author', 'license', 'licenseUrl']}
        preset.update(kind='sfx', category='Transitions et ponctuation', soundGroup='effect',
                      filename=row['filename'], duration=row['preparedDuration'],
                      audioUrl='audio/podcast-transitions/' + row['filename'],
                      fallbackUrl='audio/podcast-transitions/' + row['filename'], origin='recording',
                      attribution=f"{row['title']} — {row['author']} / {row['provider']} — CC0. {row['changes']}")
        presets.append(preset)
    source = "import type { LibraryPreset } from './audioLibrary';\nimport type { TransitionPreset } from '../types';\n\n"
    source += '// Generated by scripts/prepare-podcast-transitions.py; source recipes and hashes ship with the audio.\n'
    source += 'export const PODCAST_TRANSITIONS: LibraryPreset[] = ' + json.dumps(presets, ensure_ascii=False, indent=2) + ';\n\n'
    source += 'export const TRANSITION_RECORDINGS: { preset: TransitionPreset; libraryId: string; label: string; icon: string; description: string }[] = '
    source += json.dumps([dict(preset=row['transitionPreset'], libraryId=row['id'], label=row['title'],
                              icon=row['icon'], description=row['description']) for row in rows], ensure_ascii=False, indent=2) + ';\n'
    (ROOT / 'src/data/podcastTransitions.ts').write_text(source)
    credits = ROOT / 'public/audio-credits.html'
    content = credits.read_text()
    start_marker, end_marker = '<!-- podcast-transitions:start -->', '<!-- podcast-transitions:end -->'
    section = start_marker + f'<h2>Transitions — radio et podcast</h2><p>{len(rows)} effets sous CC0 : extraits sélectionnés, silences retirés, niveau harmonisé et fondus courts. Les sources et recettes figurent dans audio/podcast-transitions/sources.json.</p>'
    section += '<table><thead><tr><th>Son</th><th>Auteur</th><th>Licence</th><th>Source et modifications</th></tr></thead><tbody>'
    for row in rows:
        section += f'<tr><td>{html.escape(row["title"])}</td><td>{html.escape(row["author"])}</td><td><a href="{row["licenseUrl"]}">CC0</a></td><td><a href="{html.escape(row["sourcePage"], quote=True)}">{row["provider"]}</a> · {html.escape(row["changes"])} Extrait : {row["sourceStart"]:.2f}–{row["sourceStart"] + row["preparedDuration"]:.2f} s.</td></tr>'
    section += '</tbody></table>' + end_marker
    if start_marker in content:
        start = content.index(start_marker)
        end = content.index(end_marker, start) + len(end_marker)
        content = content[:start] + section + content[end:]
    else:
        content = content.replace('</main>', section + '</main>', 1)
    credits.write_text(content)
    for row in rows:
        print(f"{row['title']}: {row['preparedDuration']:.2f}s, RMS {row['activeRmsDb']:.1f} dBFS, crête {row['peakDb']:.1f} dBFS")


if __name__ == '__main__':
    main()
