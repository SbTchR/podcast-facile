#!/usr/bin/env python3
"""Prepare the hand-picked CC0 sound library; keep original recordings in /tmp.

Requires ffmpeg. The manifest records each source, excerpt, and content hash.
Existing verified excerpts are reused. --force rebuilds them; --refresh-endings
also rebuilds the eight optional jingle endings. Composites reference recorded
CC0 excerpts with an explicit recipe, never undocumented historical archives.
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
DEST = ROOT / 'public/audio/curated-sounds'
CACHE = Path('/tmp/podcast-facile-curated-originals')
RATE = 44100


def digest(data):
    return hashlib.sha256(data).hexdigest()


def recipe_digest(row):
    fields = ['sourceId', 'downloadUrl', 'soundGroup', 'startSeconds', 'maxSeconds', 'mix']
    recipe = {key: row.get(key) for key in fields}
    if row.get('minSeconds'):
        recipe['minSeconds'] = row['minSeconds']
    return digest(json.dumps(recipe, sort_keys=True).encode())


def reuse(row, force=False):
    file = DEST / row.get('filename', '')
    recipe = recipe_digest(row)
    if not force and file.is_file() and row.get('sha256') == digest(file.read_bytes()):
        if row.get('preparationRecipeSha256', recipe) == recipe:
            return {**row, 'preparationRecipeSha256': recipe}
    return None


def prepare(row, force=False):
    cached = reuse(row, force)
    if cached:
        return cached
    CACHE.mkdir(parents=True, exist_ok=True)
    original = CACHE / (row['sourceId'] + '.mp3')
    if not original.exists():
        request = urllib.request.Request(row['downloadUrl'], headers={'User-Agent': 'PodcastFacile/1.0 (CC0 audio preparation)'})
        with urllib.request.urlopen(request, timeout=45) as response:
            content = response.read()
        if not content or content[:1] == b'<':
            raise ValueError(f"Not an audio file: {row['downloadUrl']}")
        original.write_bytes(content)
    original_hash = digest(original.read_bytes())
    if row.get('originalSha256') and row['originalSha256'] != original_hash:
        raise ValueError(f"Source changed: {row['id']}")
    channels = 2 if row['soundGroup'] == 'ambience' else 1
    decoded = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(original), '-ar', str(RATE), '-ac', str(channels), '-f', 'f32le', '-'], check=True, capture_output=True).stdout
    samples = array.array('f'); samples.frombytes(decoded)
    if sys.byteorder != 'little':
        samples.byteswap()
    frames = len(samples) // channels
    start = int(row.get('startSeconds', 0) * RATE)
    if start >= frames:
        raise ValueError(f"Excerpt starts beyond recording: {row['id']}")
    if channels == 1:
        # Find the actual attack; keep 20 ms before it so transients stay intact.
        window = RATE // 100
        levels = [math.sqrt(sum(v*v for v in samples[i:i+window]) / max(1, len(samples[i:i+window]))) for i in range(0, len(samples), window)]
        threshold = max(levels) * .08
        onset = next((i for i, level in enumerate(levels) if level >= threshold), 0)
        start = max(start, max(0, onset * window - int(.02 * RATE)))
    stop = min(frames, start + int(row['maxSeconds'] * RATE))
    if channels == 1:
        window = RATE // 100
        segment_levels = [(i, math.sqrt(sum(v*v for v in samples[i:min(stop, i+window)]) / max(1, min(stop, i+window)-i))) for i in range(start, stop, window)]
        cutoff = max(level for _, level in segment_levels) * .03
        last = max(i for i, level in segment_levels if level >= cutoff)
        stop = min(stop, last + window + int(.12 * RATE))
        stop = min(frames, max(stop, start + int(row.get('minSeconds', 0) * RATE)))
    if stop <= start:
        raise ValueError(f"Empty excerpt: {row['id']}")
    prepared = samples[start*channels:stop*channels]
    peak = max(abs(v) for v in prepared)
    if peak < .0001:
        raise ValueError(f"Silent excerpt: {row['id']}")
    # Leave enough headroom for MP3 reconstruction of sharp transients.
    gain = min(16, .65 / peak)
    length = stop - start
    fade_in = int(RATE * (.035 if channels == 2 else .004))
    fade_out = min(length // 8, int(RATE * (.035 if channels == 2 else .08)))
    for frame in range(length):
        envelope = min(1, frame / max(1, fade_in), (length - 1 - frame) / max(1, fade_out))
        for channel in range(channels):
            index = frame * channels + channel
            prepared[index] *= gain * envelope
    if sys.byteorder != 'little':
        prepared.byteswap()
    if channels == 2:
        # Field ambiences sometimes have one loud crack and a nearly inaudible bed.
        # Gentle loudness normalization makes the setting recognizable under speech.
        balanced = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(RATE), '-ac', '2', '-i', 'pipe:0', '-af', 'loudnorm=I=-22:TP=-5:LRA=7', '-ar', str(RATE), '-f', 'f32le', '-'], input=prepared.tobytes(), check=True, capture_output=True).stdout
        prepared = array.array('f'); prepared.frombytes(balanced)
        length = len(prepared) // channels
    filename = row['id'] + '.mp3'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(RATE), '-ac', str(channels), '-i', 'pipe:0', '-c:a', 'libmp3lame', '-b:a', '128k', '-write_xing', '1', '-metadata', f"title={row['title']}", '-metadata', f"artist={row['author']}", str(DEST / filename)], input=prepared.tobytes(), check=True)
    duration = round(length / RATE, 4)
    changes = 'Extrait sélectionné, silence initial retiré, niveau harmonisé, MP3 128 kbit/s à 44,1 kHz.' if channels == 1 else f'Extrait de {duration:g} secondes, niveau et dynamique harmonisés pour un fond sonore, stéréo, MP3 128 kbit/s à 44,1 kHz.'
    return {**row, 'filename': filename, 'sourceStart': round(start / RATE, 4), 'preparedDuration': duration, 'channels': channels, 'originalSha256': original_hash, 'sha256': digest((DEST / filename).read_bytes()), 'bytes': (DEST / filename).stat().st_size, 'changes': changes, 'preparationRecipeSha256': recipe_digest(row)}


def prepare_mix(row, by_id, force=False):
    # A recipe only combines the licensed local recordings in the manifest.
    dependencies = [by_id[event['soundId']] for event in row['mix']]
    current_sources = [{key: sound[key] for key in ['id', 'title', 'sourcePage', 'author', 'license', 'licenseUrl', 'sha256', 'originalSha256']} for sound in {sound['id']: sound for sound in dependencies}.values()]
    if all(sound['license'] == 'CC0' for sound in current_sources) is False:
        raise ValueError(f"Composite needs CC0 components: {row['id']}")
    dependency_hash = digest(json.dumps(current_sources, sort_keys=True).encode())
    cached = reuse(row, force)
    if cached and row.get('originalSha256') == dependency_hash:
        return cached
    duration = row['maxSeconds']
    mixed = array.array('f', [0]) * (int(duration * RATE) * 2)
    for event in row['mix']:
        sound = by_id[event['soundId']]
        raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(DEST / sound['filename']), '-ar', str(RATE), '-ac', '2', '-f', 'f32le', '-'])
        samples = array.array('f'); samples.frombytes(raw)
        if sys.byteorder != 'little':
            samples.byteswap()
        source_start = int(event.get('sourceStart', 0) * RATE) * 2
        source_duration = int(event.get('duration', sound['preparedDuration']) * RATE) * 2
        samples = samples[source_start:source_start + source_duration]
        if not samples:
            raise ValueError(f"Empty composite component: {row['id']}")
        position = int(event['at'] * RATE) * 2
        end = min(len(mixed), position + (int(event['duration'] * RATE) * 2 if event.get('repeat') else len(samples)))
        for index in range(position, end):
            mixed[index] += samples[(index-position) % len(samples)] * event['gain']
    peak = max(abs(value) for value in mixed)
    if peak < .0001:
        raise ValueError(f"Silent composite: {row['id']}")
    gain = min(4, .65 / peak)
    fade = int(.05 * RATE) * 2
    for index in range(len(mixed)):
        envelope = min(1, index / fade, (len(mixed)-1-index) / fade)
        mixed[index] *= gain * envelope
    if sys.byteorder != 'little':
        mixed.byteswap()
    filename = row['id'] + '.mp3'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(RATE), '-ac', '2', '-i', 'pipe:0', '-af', 'loudnorm=I=-22:TP=-5:LRA=7', '-ar', str(RATE), '-c:a', 'libmp3lame', '-b:a', '128k', '-metadata', f"title={row['title']}", str(DEST / filename)], input=mixed.tobytes(), check=True)
    output = (DEST / filename).read_bytes()
    return {**row, 'filename': filename, 'preparedDuration': duration, 'channels': 2, 'sourceStart': 0, 'components': current_sources, 'originalSha256': dependency_hash, 'sha256': digest(output), 'bytes': len(output), 'preparationRecipeSha256': recipe_digest(row), 'changes': 'Reconstitution sonore : montage de bruitages CC0, niveau harmonisé, stéréo 44,1 kHz, MP3 128 kbit/s. Les sources de chaque composant sont indiquées ci-dessous.'}


def write_presets(rows):
    presets = []
    for row in rows:
        path = 'audio/curated-sounds/' + row['filename']
        presets.append({key: row[key] for key in ['id', 'title', 'icon', 'category', 'soundGroup', 'description', 'tags', 'filename', 'sourcePage', 'author', 'license', 'licenseUrl']} | {'kind': 'sfx', 'duration': row['preparedDuration'], 'audioUrl': path, 'fallbackUrl': path, 'attribution': f"{row['title']} — {row['author']} / {row.get('provider', 'LaSonothèque')} — CC0.", 'origin': 'reconstruction' if row.get('mix') else 'recording'})
    target = ROOT / 'src/data/curatedSounds.ts'
    target.write_text("import type { LibraryPreset } from './audioLibrary';\n\n// Short, recognizable effects and separate background ambiences. Sources and preparation\n// are recorded in public/audio/curated-sounds/sources.json.\nexport const CURATED_SOUNDS: LibraryPreset[] = " + json.dumps(presets, ensure_ascii=False, indent=2) + ' as LibraryPreset[];\n')


def write_endings(rows):
    target = ROOT / 'public/audio/jingle-endings'
    manifest = target / 'sources.json'
    # Never alter existing audio or credit IDs: saved projects embed those recordings.
    sources = [row for row in json.loads(manifest.read_text()) if not row['id'].endswith('-v2')]
    choices = [('cloche', 'Cloche', 2.65, False), ('klaxon', 'Klaxon', 2.65, False), ('bateau', 'Corne de bateau', 2.65, False), ('tambour', 'Roulement de tambour', 2.8, True), ('velo', 'Sonnette de vélo', 1.5, False), ('ding-dong', 'Ding-dong', 2.65, False), ('badum-tss', 'Ba-dum-tss !', 2.8, False), ('magie', 'Étincelle magique', 2.65, False)]
    endings = []
    for slug, title, maximum, keep_tail in choices:
        row = next(row for row in rows if row['id'] == 'sfx-clear-' + slug)
        duration = min(maximum, row['preparedDuration'])
        start = max(0, row['preparedDuration'] - duration) if keep_tail else 0
        filename = slug + '-v2.wav'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(start), '-i', str(DEST / row['filename']), '-t', str(duration), '-ar', str(RATE), '-ac', '1', '-af', f'afade=t=in:d=0.004,afade=t=out:st={max(0, duration-.08)}:d=0.08', '-c:a', 'pcm_s16le', str(target / filename)], check=True)
        actual = len(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(target / filename), '-f', 's16le', '-'])) / 2 / RATE
        ending = {'id': 'jingle-ending-' + slug + '-v2', 'title': title, 'icon': row['icon'], 'filename': filename, 'duration': actual, 'sourcePage': row['sourcePage'], 'author': row['author'], 'licenseName': row['license'], 'licenseUrl': row['licenseUrl'], 'changes': f'Extrait court ({actual:.2f} s), niveau harmonisé, mono 44,1 kHz ; mixage facultatif à la fin du jingle.'}
        endings.append(ending)
        sources.append({**ending, 'originalFilename': row['sourceId'] + '.mp3', 'originalUrl': row['downloadUrl'], 'sourceStart': round(row['sourceStart'] + start, 4), 'preparedFrom': 'audio/curated-sounds/' + row['filename'], 'preparedDuration': actual, 'originalSha256': row['originalSha256'], 'sha256': digest((target / filename).read_bytes())})
    manifest.write_text(json.dumps(sources, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'src/data/curatedJingleEndings.ts').write_text("import type { JingleEnding } from './jingleEndings';\n\nexport const CURATED_JINGLE_ENDINGS: JingleEnding[] = " + json.dumps(endings, ensure_ascii=False, indent=2) + ';\n')


def write_credits(rows):
    page = ROOT / 'public/audio-credits.html'
    content = page.read_text()
    begin, end = '<!-- curated-sounds:start -->', '<!-- curated-sounds:end -->'
    entries = []
    for row in rows:
        values = [html.escape(str(row[key])) for key in ['title', 'author', 'sourcePage', 'licenseUrl', 'changes']]
        title, author, source, licence, changes = values
        label = 'Ambiance' if row['soundGroup'] == 'ambience' else 'Bruitage'
        provider = html.escape(row.get('provider', 'LaSonothèque'))
        components = ''.join(f'<br><a href="{html.escape(sound["sourcePage"])}">{html.escape(sound["title"])}</a> — {html.escape(sound["author"])} — <a href="{html.escape(sound["licenseUrl"])}">CC0</a>' for sound in row.get('components', []))
        entries.append(f'<tr><td>{title}</td><td>{label}</td><td>{author} / {provider}</td><td><a href="{licence}">CC0</a></td><td><a href="{source}">Source</a> · {changes}{components}</td></tr>')
    effects = sum(row['soundGroup'] == 'effect' for row in rows)
    ambiences = len(rows) - effects
    section = begin + f'<h2>Bruitages et ambiances — sélection actuelle</h2><p>{effects} bruitages courts et {ambiences} ambiances, sélectionnés dans <a href="https://lasonotheque.org/">LaSonothèque</a> et <a href="https://freesound.org/">Freesound</a>. Les huit sons de fin de jingle sont des extraits de cette sélection. Fichiers sous <a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 (domaine public)</a>, conservés localement avec leurs sources et leurs licences. Les scènes historiques montées sont des reconstitutions, pas des archives d’époque.</p><table><thead><tr><th>Titre</th><th>Type</th><th>Auteur</th><th>Licence</th><th>Fichier</th></tr></thead><tbody>' + ''.join(entries) + '</tbody></table><h2>Musiques de la bibliothèque et anciens sons</h2><p>Les musiques du podcast conservent leurs licences. Les anciens sons restent associés à leurs crédits dans les projets sauvegardés.</p>' + end
    if begin in content:
        left, remainder = content.split(begin, 1)
        _, right = remainder.split(end, 1)
        content = left + section + right
    else:
        content = content.replace('<table>', section + '<table>', 1)
    page.write_text(content)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--jobs', type=int, default=4)
    parser.add_argument('--force', action='store_true')
    parser.add_argument('--refresh-endings', action='store_true')
    args = parser.parse_args()
    DEST.mkdir(parents=True, exist_ok=True)
    manifest = DEST / 'sources.json'
    rows = json.loads(manifest.read_text())
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.jobs) as pool:
        recordings = list(pool.map(lambda row: prepare(row, args.force), [row for row in rows if not row.get('mix')]))
    by_id = {row['id']: row for row in recordings}
    for row in rows:
        if row.get('mix'):
            by_id[row['id']] = prepare_mix(row, by_id, args.force)
    prepared = [by_id[row['id']] for row in rows]
    manifest.write_text(json.dumps(prepared, ensure_ascii=False, indent=2) + '\n')
    write_presets(prepared)
    if args.refresh_endings:
        write_endings(prepared)
    write_credits(prepared)
    print(f"Prepared {len(prepared)} local sounds ({sum(r['bytes'] for r in prepared)/1e6:.1f} MB), with source hashes and credits.")
