#!/usr/bin/env python3
"""Prepare short, local final sounds; keep the original recordings and credits."""
import array
import hashlib
import json
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / 'public/audio/jingle-endings'
CACHE = Path('/tmp/podcast-facile-jingle-endings')
TARGET.mkdir(parents=True, exist_ok=True)
CACHE.mkdir(parents=True, exist_ok=True)
manifest = json.loads((TARGET / 'sources.json').read_text())
for item in manifest:
    if item.get('preparedFrom'):
        # Curated CC0 endings have a different preparation recipe and immutable IDs.
        continue
    original = CACHE / item['originalFilename']
    if not original.exists():
        request = urllib.request.Request(item['originalUrl'], headers={'User-Agent': 'PodcastFacile/0.3 (educational audio preparation)'})
        with urllib.request.urlopen(request, timeout=30) as response:
            original.write_bytes(response.read())
    output = TARGET / item['filename']
    start, duration = item['sourceStart'], item['duration']
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', str(start), '-i', str(original), '-t', str(duration), '-ar', '44100', '-ac', '1', '-af', f'afade=t=in:d=0.006,afade=t=out:st={duration - .12}:d=0.12', '-c:a', 'pcm_s16le', str(output)], check=True)
    samples = array.array('h', subprocess.check_output(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', str(output), '-f', 's16le', '-']))
    peak = max((abs(value) for value in samples), default=1) / 32768
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', str(start), '-i', str(original), '-t', str(duration), '-ar', '44100', '-ac', '1', '-af', f'volume={.72 / max(.001, peak)},afade=t=in:d=0.006,afade=t=out:st={duration - .12}:d=0.12', '-c:a', 'pcm_s16le', str(output)], check=True)
    item['preparedDuration'] = len(samples) / 44100
    item['sha256'] = hashlib.sha256(output.read_bytes()).hexdigest()
    item['originalSha256'] = hashlib.sha256(original.read_bytes()).hexdigest()
    item['changes'] = f"Extrait court ({item['preparedDuration']:.2f} s), mono 44,1 kHz, niveau et fondus ajustés ; mixage facultatif à la fin du jingle."
    print(f"{item['title']}: {item['preparedDuration']:.2f} s, {output.stat().st_size / 1024:.0f} Ko", flush=True)
(TARGET / 'sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
