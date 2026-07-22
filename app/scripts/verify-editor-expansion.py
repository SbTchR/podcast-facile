from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
library = (ROOT / 'src' / 'data' / 'audioLibrary.ts').read_text(encoding='utf-8')
app = (ROOT / 'src' / 'App.tsx').read_text(encoding='utf-8')
engine = (ROOT / 'src' / 'audio' / 'engine.ts').read_text(encoding='utf-8')
types = (ROOT / 'src' / 'types.ts').read_text(encoding='utf-8')
credits = (ROOT / 'public' / 'audio-credits.html').read_text(encoding='utf-8')

marker = 'export const AUDIO_LIBRARY: LibraryPreset[] = '
start = library.index('[', library.index(marker) + len(marker))
end = library.index('] as LibraryPreset[];', start) + 1
items: list[dict] = json.loads(library[start:end])
ids = [item['id'] for item in items]
assert len(ids) == len(set(ids)), 'La bibliothèque contient des identifiants dupliqués.'

expected_sfx = {
    'sfx-medieval-battle-ambience', 'sfx-medieval-castle-ambience', 'sfx-medieval-market-ambience',
    'sfx-horse-gallop-grass', 'sfx-pirate-ship-ambience', 'sfx-naval-battle-ambience',
    'sfx-old-phone-ringing', 'sfx-phone-ringback-waiting', 'sfx-onomatopoeia-question',
    'sfx-onomatopoeia-failure', 'sfx-onomatopoeia-pop', 'sfx-onomatopoeia-mystery',
    'sfx-onomatopoeia-surprise',
}
expected_music = {
    'music-chase-action', 'music-in-a-hurry', 'music-far-west-banjo', 'music-action-intro',
    'music-ashes-empire', 'music-line-of-fire',
}
assert expected_sfx <= set(ids), f'Bruitages manquants : {sorted(expected_sfx - set(ids))}'
assert expected_music <= set(ids), f'Musiques manquantes : {sorted(expected_music - set(ids))}'

short_items = [item for item in items if 'Chocs, impacts, transitions' in item.get('secondaryCategories', [])]
assert len(short_items) >= 20, 'La catégorie secondaire ne contient pas assez de bruitages courts.'
assert all(item['category'] != 'Chocs, impacts, transitions' for item in short_items), 'Un bruitage a perdu sa catégorie principale.'
assert len({item['audioUrl'] for item in short_items}) == len(short_items), 'La catégorie secondaire duplique un fichier audio.'
assert 'secondaryCategories?.includes(category)' in app

transition_members = ['impact', 'sparkle', 'heartbeat', 'rewind', 'drop', 'question', 'failure', 'surprise', 'portal', 'cinematic']
for preset in transition_members:
    assert f"'{preset}'" in types
assert 'const TRANSITION_RECORDINGS: TransitionRecording[]' in app
assert app.count("libraryId: 'sfx-") == 14
assert "transitionVolume?: VolumeLevel" in types
assert 'transitionVolumeValue(block.transitionVolume)' in engine
assert 'transitionTone' not in engine

assert "echo: 'Rêve'" in app
assert "distant: 'Caverne'" in app
assert 'createConvolver()' in engine
assert "effect === 'high' ? 1.12" in engine
assert "effect === 'very-high' ? 1.24" in engine
assert 'sourceStart + consumedCue' in engine
assert 'cue.sourceEnd ?? legacyEnd' in engine

for style in ['dynamic', 'adventure', 'mysterious', 'serious', 'historical', 'modern-radio']:
    assert f'{style}:' in engine or f"'{style}':" in engine
assert 'removeJingleAsset' in app
assert 'jingle-style-description' in app
assert "historical: 'Historique'" in app

items_by_id = {item['id']: item for item in items}
for item_id in expected_sfx | expected_music:
    assert items_by_id[item_id]['sourcePage'] in credits

print(f'Extension vérifiée : {len(items)} fichiers uniques, {len(short_items)} bruitages multi-classés.')
