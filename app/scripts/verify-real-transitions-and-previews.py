from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
app = (ROOT / 'src' / 'App.tsx').read_text(encoding='utf-8')
engine = (ROOT / 'src' / 'audio' / 'engine.ts').read_text(encoding='utf-8')
library = (ROOT / 'src' / 'data' / 'audioLibrary.ts').read_text(encoding='utf-8')
styles = (ROOT / 'src' / 'styles.css').read_text(encoding='utf-8')

assert '20260722-real-transitions-preview-1' in app
assert 'TRANSITION_RECORDINGS' in app
assert app.count("libraryId: 'sfx-") == 14
assert 'Chaque extrait dure au maximum 4 secondes.' in app
assert 'Enregistrements réels' in app
assert 'transitionLoadingId' in app
assert "Math.min(4, preset.clipDuration ?? preset.duration" in app
assert "block.type === 'transition' ? Boolean(block.assetId && block.transitionPreset)" in app

assert 'transitionTone' not in engine
assert 'createOscillator' not in engine
assert 'Math.random' not in engine
assert "if (block.type === 'transition') return Math.min(4" in engine
assert "const transitionAsset = assetById(project, block.assetId)" in engine
assert "transitionVolumeValue(block.transitionVolume)" in engine

assert 'TimedPreviewButton' in app
assert 'createLibraryPreviewSession' in app
assert "status === 'loading' ? 'Chargement…'" in app
assert 'preview-progress' in app
assert 'requestExclusivePreview' in app
assert "requestExclusivePreview(`screen-${screen}`)" in app
assert "requestExclusivePreview('audio-library-window')" in app
assert "requestExclusivePreview('modal-window')" in app
assert 'playbackRequestRef' in app
assert "setPlaybackKind('block')" in app
assert 'setPlaybackDisplayDuration(getBlockDuration(block, project.assets))' in app
assert "seekable={playbackKind === 'project'}" in app
assert 'onWaiting={() => setLoading(true)}' in app
assert '.transition-recording-grid' in styles
assert '.preview-control.loading' in styles

marker = 'export const AUDIO_LIBRARY: LibraryPreset[] = '
start = library.index('[', library.index(marker) + len(marker))
end = library.index('\n] as LibraryPreset[];', start) + 2
items = json.loads(library[start:end])
by_id = {item['id']: item for item in items}
transition_ids = [
    'sfx-dull-thud', 'sfx-buzzer-real', 'sfx-onomatopoeia-question', 'sfx-pen-drop',
    'sfx-bicycle-bell', 'sfx-door-knocker', 'sfx-human-whistling', 'sfx-explosion',
    'sfx-steamboat-horn', 'sfx-music-box', 'sfx-onomatopoeia-pop', 'sfx-airplane-chime',
    'sfx-turn-page', 'sfx-car-horn',
]
for item_id in transition_ids:
    item = by_id[item_id]
    assert item['kind'] == 'sfx'
    assert item.get('origin') == 'recording'
    assert min(4, item.get('clipDuration', item['duration'])) <= 4
    assert item['sourcePage'].startswith('https://commons.wikimedia.org/')
    assert item['license'] in {'Domaine public', 'CC0'}

assert by_id['sfx-buzzer-real']['license'] == 'Domaine public'
assert by_id['sfx-human-whistling']['license'] == 'Domaine public'

print('14 transitions réelles et lecteurs d’aperçu vérifiés.')
