#!/usr/bin/env python3
"""Prepare the credited 25/35-second jingle beds from their original MP3 files.

Usage: python3 app/scripts/prepare-jingle-beds.py /path/to/originals
Source filenames and arrangements are documented in the public sources.json.
Fetching recordings is deliberately separate from this local process. Use
--version 3 with the older sources to reproduce the previous short beds.
Use --version 5 to reproduce the selected Pixabay arrangements.
Requires ffmpeg. The application plays these prepared files once, without
looping, changing tempo or generating an ending sound.
"""
import argparse
import array
import hashlib
import json
import math
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
RATE = 44100
CHANNELS = 2
# Source times and musical arrangements are kept in the public manifest.


def frame(seconds):
    return round(seconds * RATE) * CHANNELS


def join(left, right, seconds):
    """A short linear crossfade avoids clicks and retains the music's pitch."""
    n = min(frame(seconds), len(left), len(right))
    if not n:
        return left + right
    result = left[:-n]
    frames = n // CHANNELS
    for i in range(n):
        blend = (i // CHANNELS + 1) / (frames + 1)
        result.append(left[len(left) - n + i] * (1 - blend) + right[i] * blend)
    result.extend(right[n:])
    return result


def prepare(source, destination, edit, license_name, fade_out=.3, author='Kevin MacLeod / Incompetech', title='', segments=None):
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(source),
                                  '-f', 'f32le', '-ac', '2', '-ar', str(RATE), 'pipe:1'])
    samples = array.array('f', raw)
    start, end, loop_start, loop_end, repeats, crossfade = edit
    source_duration = len(samples) / (CHANNELS * RATE)
    assert 0 <= start < end <= source_duration
    if segments:
        # Ordered excerpts can remove or repeat a central phrase while keeping
        # the recording's opening and ending. No tempo or pitch adjustment.
        result = array.array('f')
        for segment in segments:
            first, last = segment['sourceStart'], segment['sourceEnd']
            assert start <= first < last <= end
            result = join(result, samples[frame(first):frame(last)], segment.get('crossfadeSeconds', 0))
    elif repeats:
        assert start < loop_start < loop_end < end
        result = samples[frame(start):frame(loop_end)]
        phrase = samples[frame(loop_start):frame(loop_end)]
        for _ in range(repeats):
            result = join(result, phrase, crossfade)
        result = join(result, samples[frame(loop_end):frame(end)], crossfade)
    else:
        result = samples[frame(start):frame(end)]
    # Brief clean entry and a natural musical release, no appended silence.
    attack = frame(.025)
    release = frame(fade_out)
    for i in range(attack):
        result[i] *= (i // CHANNELS) / (attack // CHANNELS)
    for i in range(release):
        result[len(result) - release + i] *= 1 - (i // CHANNELS) / (release // CHANNELS)
    # Leave headroom for MP3 reconstruction and the native preview player.
    scale = min(1, .9 / max(abs(x) for x in result))
    if scale < 1:
        result = array.array('f', (x * scale for x in result))
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(RATE),
                    '-ac', '2', '-i', 'pipe:0', '-c:a', 'libmp3lame', '-b:a', '192k',
                    '-metadata', f'artist={author}', '-metadata', f'title={title}',
                    '-metadata', f'comment={license_name}; Podcast Facile jingle arrangement',
                    str(destination)], input=result.tobytes(), check=True)
    # Measure audible windows in the prepared PCM rather than MP3 container padding.
    window = frame(3)
    rms = lambda values: math.sqrt(sum(x * x for x in values) / len(values))
    metrics = dict(duration=len(result) / (RATE * CHANNELS),
                   openingRms=rms(result[:window]), endingRms=rms(result[-window:]),
                   peak=max(abs(x) for x in result))
    assert metrics['openingRms'] > .035, f'{source.name}: opening too quiet'
    assert metrics['endingRms'] > .012, f'{source.name}: ending too quiet'
    return metrics


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('originals', type=Path)
    parser.add_argument('--version', type=int, choices=[3, 4, 5], default=4)
    args = parser.parse_args()
    manifest_path = ROOT / 'public/audio/jingles/sources.json'
    manifest = json.loads(manifest_path.read_text())
    for item in manifest:
        if item.get('version', 3) != args.version:
            continue
        source = args.originals / item.get('originalFile', item['file'])
        destination = manifest_path.parent / item['file']
        if source.resolve() == destination.resolve():
            raise ValueError('Keep the original recordings in a separate directory.')
        if hashlib.sha256(source.read_bytes()).hexdigest() != (item.get('originalSha256') or item.get('sha256')):
            raise ValueError(f'{source.name}: unexpected original recording')
        preparation = item['preparation']
        edit = [preparation[key] for key in ['sourceStart', 'sourceEnd', 'phraseStart', 'phraseEnd', 'repetitions', 'crossfadeSeconds']]
        metrics = prepare(source, destination, edit, item['license'], preparation.get('fadeOutSeconds', .3), item['author'], item['title'], preparation.get('segments'))
        if 'targetDuration' in item:
            assert abs(metrics['duration'] - item['targetDuration']) < 1 / RATE
        item['originalSha256'] = hashlib.sha256(source.read_bytes()).hexdigest()
        item['sha256'] = hashlib.sha256(destination.read_bytes()).hexdigest()
        item['preparedDuration'] = metrics['duration']
        print(item['file'], json.dumps(metrics))
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
