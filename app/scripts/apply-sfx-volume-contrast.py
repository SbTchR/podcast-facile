from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ENGINE_PATH = ROOT / 'src' / 'audio' / 'engine.ts'
MARKER = '// SFX volume contrast: 20260722-sfx-volume-contrast-1'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: attendu 1 occurrence, trouvé {count}.')
    return text.replace(old, new, 1)


engine = ENGINE_PATH.read_text(encoding='utf-8')
if MARKER in engine:
    raise RuntimeError('La passe de contraste des bruitages a déjà été appliquée.')

engine = replace_once(
    engine,
    "function volumeValue(level: VolumeLevel): number {\n  return level === 'low' ? 0.62 : level === 'high' ? 1.22 : 0.92;\n}",
    "function volumeValue(level: VolumeLevel): number {\n  return level === 'low' ? 0.62 : level === 'high' ? 1.22 : 0.92;\n}\n\n"
    f"{MARKER}\n"
    "function soundEffectVolumeValue(level: VolumeLevel): number {\n"
    "  return level === 'low' ? 0.08 : level === 'high' ? 1.05 : 0.28;\n"
    "}",
    'échelle dédiée aux bruitages',
)

engine = replace_once(
    engine,
    "    volumeValue(block.volume),\n    block.fadeIn,",
    "    block.type === 'sfx' ? soundEffectVolumeValue(block.volume) : volumeValue(block.volume),\n    block.fadeIn,",
    'utilisation du gain dédié',
)

ENGINE_PATH.write_text(engine, encoding='utf-8')
print('Contraste des volumes de bruitage renforcé : 0.08 / 0.28 / 1.05.')
