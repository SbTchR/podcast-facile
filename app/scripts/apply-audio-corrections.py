from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIB_PATH = ROOT / 'src' / 'data' / 'audioLibrary.ts'
APP_PATH = ROOT / 'src' / 'App.tsx'
ENGINE_PATH = ROOT / 'src' / 'audio' / 'engine.ts'

PD_LICENSE = 'https://creativecommons.org/publicdomain/mark/1.0/'
CC_BY_3 = 'https://creativecommons.org/licenses/by/3.0/'
CC_BY_4 = 'https://creativecommons.org/licenses/by/4.0/'

SFX_CATEGORIES = [
    'Guerres & combats',
    'Sociétés & lieux historiques',
    'Nature & paysages',
    'Transports & industrie',
    'Vie quotidienne & objets',
    'Voix & foule',
]

CATEGORY_RENAMES = {
    'Histoire & action': 'Guerres & combats',
    'Lieux & ambiances': 'Sociétés & lieux historiques',
    'Nature & animaux': 'Nature & paysages',
    'Transports & machines': 'Transports & industrie',
    'Voix & personnes': 'Voix & foule',
}

CATEGORY_CORRECTIONS = {
    'sfx-historic-smithy-cutting': 'Transports & industrie',
    'sfx-smithy-forging': 'Transports & industrie',
    'sfx-music-box': 'Vie quotidienne & objets',
    'sfx-mall': 'Sociétés & lieux historiques',
    'sfx-toilet-flush': 'Vie quotidienne & objets',
    'sfx-church-bells': 'Sociétés & lieux historiques',
    'sfx-playground': 'Sociétés & lieux historiques',
    'sfx-gombe-market': 'Sociétés & lieux historiques',
    'sfx-coins': 'Vie quotidienne & objets',
    'sfx-market-rain': 'Sociétés & lieux historiques',
    'sfx-group-laughter': 'Voix & foule',
    'sfx-baby-laugh': 'Voix & foule',
    'sfx-city-street': 'Sociétés & lieux historiques',
    'sfx-seaport-ambience': 'Transports & industrie',
    'sfx-shop-doorbell': 'Vie quotidienne & objets',
    'sfx-door-knocker': 'Vie quotidienne & objets',
    'sfx-door-handle': 'Vie quotidienne & objets',
    'sfx-cellar-door': 'Vie quotidienne & objets',
    'sfx-elevator': 'Vie quotidienne & objets',
    'sfx-squeaky-door': 'Vie quotidienne & objets',
    'sfx-doorbell': 'Vie quotidienne & objets',
    'sfx-old-door': 'Vie quotidienne & objets',
    'sfx-steps-walking': 'Vie quotidienne & objets',
    'sfx-steps-church': 'Sociétés & lieux historiques',
    'sfx-writing-inkpen': 'Vie quotidienne & objets',
    'sfx-restaurant': 'Voix & foule',
    'sfx-busy-common-room': 'Voix & foule',
    'sfx-applause': 'Voix & foule',
    'sfx-baby-cry': 'Voix & foule',
    'sfx-male-crying': 'Voix & foule',
    'sfx-human-cough': 'Voix & foule',
    'sfx-wheeze': 'Voix & foule',
    'sfx-human-whistling': 'Voix & foule',
    'sfx-human-sneeze': 'Voix & foule',
    'sfx-explosion': 'Guerres & combats',
    'sfx-explosions': 'Guerres & combats',
    'sfx-sword-fight-real': 'Guerres & combats',
    'sfx-sword-hit-real': 'Guerres & combats',
    'sfx-sword-unsheathe-real': 'Guerres & combats',
    'sfx-wilhelm-scream': 'Guerres & combats',
    'sfx-male-scream-fear': 'Voix & foule',
}

NEW_HISTORY_SOUNDS = [
    {
        'id': 'sfx-gunshots-simulated', 'kind': 'sfx', 'title': 'Série de coups de feu simulés',
        'category': 'Guerres & combats', 'icon': '🔫', 'duration': 5.9,
        'description': 'Suite de détonations fabriquées pour un livre audio à partir de ballons éclatés et d’un montage Audacity. Ce ne sont pas de vrais tirs.',
        'tags': ['coups de feu', 'détonations', 'combat', 'révolution'], 'filename': 'Gunshots 8.ogg',
        'audioUrl': 'https://upload.wikimedia.org/wikipedia/commons/transcoded/e/ee/Gunshots_8.ogg/Gunshots_8.ogg.mp3',
        'fallbackUrl': 'https://upload.wikimedia.org/wikipedia/commons/e/ee/Gunshots_8.ogg',
        'sourcePage': 'https://commons.wikimedia.org/wiki/File:Gunshots_8.ogg', 'author': 'aradlaw',
        'license': 'Domaine public', 'licenseUrl': PD_LICENSE,
        'attribution': 'Gunshots 8 — aradlaw — domaine public.', 'origin': 'simulated',
    },
    {
        'id': 'sfx-cannon-reveille', 'kind': 'sfx', 'title': 'Salve de canon et réveil militaire',
        'category': 'Guerres & combats', 'icon': '💥', 'duration': 30.3,
        'description': 'Détonation de canon suivie d’une sonnerie militaire de réveil, utile pour une caserne, un siège ou une cérémonie.',
        'tags': ['canon', 'armée', 'caserne', 'cérémonie'], 'filename': '01 Salute Cannon Reveille.ogg',
        'audioUrl': 'https://upload.wikimedia.org/wikipedia/commons/transcoded/2/2d/01_Salute_Cannon_Reveille.ogg/01_Salute_Cannon_Reveille.ogg.mp3',
        'fallbackUrl': 'https://upload.wikimedia.org/wikipedia/commons/2/2d/01_Salute_Cannon_Reveille.ogg',
        'sourcePage': 'https://commons.wikimedia.org/wiki/File:01_Salute_Cannon_Reveille.ogg',
        'author': 'United States Military Academy Hellcats', 'license': 'Domaine public', 'licenseUrl': PD_LICENSE,
        'attribution': 'Salute Cannon/Reveille — U.S. Military Academy Hellcats — domaine public.',
        'origin': 'recording', 'clipDuration': 12,
    },
    {
        'id': 'sfx-large-crowd-cheering', 'kind': 'sfx', 'title': 'Foule nombreuse et acclamations',
        'category': 'Voix & foule', 'icon': '📣', 'duration': 61.2,
        'description': 'Murmures, cris et acclamations d’une foule dense pour une manifestation, une place publique ou un événement collectif.',
        'tags': ['foule', 'acclamations', 'manifestation', 'place publique'], 'filename': 'Festival concert people crowd.ogg',
        'audioUrl': 'https://upload.wikimedia.org/wikipedia/commons/transcoded/1/15/Festival_concert_people_crowd.ogg/Festival_concert_people_crowd.ogg.mp3',
        'fallbackUrl': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Festival_concert_people_crowd.ogg',
        'sourcePage': 'https://commons.wikimedia.org/wiki/File:Festival_concert_people_crowd.ogg',
        'author': 'stephan / PDSounds.org', 'license': 'Domaine public', 'licenseUrl': PD_LICENSE,
        'attribution': 'Festival concert people crowd — stephan / PDSounds.org — domaine public.',
        'origin': 'recording', 'clipDuration': 15,
    },
    {
        'id': 'sfx-provence-market', 'kind': 'sfx', 'title': 'Marché provençal animé',
        'category': 'Sociétés & lieux historiques', 'icon': '🧺', 'duration': 273,
        'description': 'Ambiance réelle d’un marché de Toulon avec voix, vendeurs et activité commerciale.',
        'tags': ['marché', 'vendeurs', 'commerce', 'ville'], 'filename': 'Marche-de-provence.ogg',
        'audioUrl': 'https://upload.wikimedia.org/wikipedia/commons/transcoded/2/2c/Marche-de-provence.ogg/Marche-de-provence.ogg.mp3',
        'fallbackUrl': 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Marche-de-provence.ogg',
        'sourcePage': 'https://commons.wikimedia.org/wiki/File:Marche-de-provence.ogg', 'author': 'Jacques Lahitte',
        'license': 'CC BY 3.0', 'licenseUrl': CC_BY_3,
        'attribution': 'Marché de Provence — Jacques Lahitte — CC BY 3.0.', 'origin': 'recording', 'clipDuration': 15,
    },
    {
        'id': 'sfx-fireworks-detonations', 'kind': 'sfx', 'title': 'Détonations de feux d’artifice',
        'category': 'Sociétés & lieux historiques', 'icon': '🎆', 'duration': 39,
        'description': 'Crépitements, détonations et réactions du public. Peut évoquer une fête ou une commémoration, sans être présenté comme une bataille réelle.',
        'tags': ['feux d’artifice', 'détonations', 'fête', 'commémoration'], 'filename': 'Noises and fireworks.ogg',
        'audioUrl': 'https://upload.wikimedia.org/wikipedia/commons/transcoded/a/a9/Noises_and_fireworks.ogg/Noises_and_fireworks.ogg.mp3',
        'fallbackUrl': 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Noises_and_fireworks.ogg',
        'sourcePage': 'https://commons.wikimedia.org/wiki/File:Noises_and_fireworks.ogg', 'author': 'ezwa',
        'license': 'Domaine public', 'licenseUrl': PD_LICENSE,
        'attribution': 'Noises and fireworks — ezwa — domaine public.', 'origin': 'recording', 'clipDuration': 12,
    },
    {
        'id': 'sfx-rotary-printing-press-1926', 'kind': 'sfx', 'title': 'Presse rotative de journal de 1926',
        'category': 'Transports & industrie', 'icon': '📰', 'duration': 119,
        'description': 'Fonctionnement mécanique d’une presse rotative historique utilisée pour imprimer des journaux.',
        'tags': ['presse', 'journal', 'imprimerie', 'industrie'], 'filename': 'WWS Rotaryprintingpress.ogg',
        'audioUrl': 'https://upload.wikimedia.org/wikipedia/commons/transcoded/7/70/WWS_Rotaryprintingpress.ogg/WWS_Rotaryprintingpress.ogg.mp3',
        'fallbackUrl': 'https://upload.wikimedia.org/wikipedia/commons/7/70/WWS_Rotaryprintingpress.ogg',
        'sourcePage': 'https://commons.wikimedia.org/wiki/File:WWS_Rotaryprintingpress.ogg',
        'author': 'Konrad Gutkowski / Work With Sounds', 'license': 'CC BY 4.0', 'licenseUrl': CC_BY_4,
        'attribution': 'Rotary printing press — Konrad Gutkowski / Work With Sounds — CC BY 4.0.',
        'origin': 'recording', 'clipDuration': 15,
    },
    {
        'id': 'sfx-military-drumbeat', 'kind': 'sfx', 'title': 'Tambour militaire',
        'category': 'Guerres & combats', 'icon': '🥁', 'duration': 39,
        'description': 'Rythme de tambour de style militaire, utile pour une marche, une mobilisation ou une scène de campement.',
        'tags': ['tambour', 'armée', 'marche', 'campement'], 'filename': 'Militarydrumbeat.ogg',
        'audioUrl': 'https://upload.wikimedia.org/wikipedia/commons/transcoded/b/b1/Militarydrumbeat.ogg/Militarydrumbeat.ogg.mp3',
        'fallbackUrl': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Militarydrumbeat.ogg',
        'sourcePage': 'https://commons.wikimedia.org/wiki/File:Militarydrumbeat.ogg', 'author': 'SvonHalenbach',
        'license': 'Domaine public', 'licenseUrl': PD_LICENSE,
        'attribution': 'Militarydrumbeat — SvonHalenbach — domaine public.', 'origin': 'synthesized', 'clipDuration': 15,
    },
    {
        'id': 'sfx-1960s-factory-civil-defense-siren', 'kind': 'sfx',
        'title': 'Sirène d’usine et de défense civile des années 1960',
        'category': 'Transports & industrie', 'icon': '📢', 'duration': 30.2,
        'description': 'Sirène électrique historique utilisée dans une usine pour les changements de poste et comme signal de défense civile.',
        'tags': ['sirène', 'usine', 'défense civile', 'alerte'], 'filename': 'WWS Siren.ogg',
        'audioUrl': 'https://upload.wikimedia.org/wikipedia/commons/transcoded/9/97/WWS_Siren.ogg/WWS_Siren.ogg.mp3',
        'fallbackUrl': 'https://upload.wikimedia.org/wikipedia/commons/9/97/WWS_Siren.ogg',
        'sourcePage': 'https://commons.wikimedia.org/wiki/File:WWS_Siren.ogg',
        'author': 'Konrad Gutkowski et Jonathan Nicolai / Work With Sounds',
        'license': 'CC BY 4.0', 'licenseUrl': CC_BY_4,
        'attribution': 'WWS Siren — Konrad Gutkowski et Jonathan Nicolai / Work With Sounds — CC BY 4.0.',
        'origin': 'recording', 'clipDuration': 12,
    },
    {
        'id': 'sfx-19th-century-fire-brigade-bell', 'kind': 'sfx',
        'title': 'Cloche de pompiers de la fin du XIXe siècle',
        'category': 'Sociétés & lieux historiques', 'icon': '🚒', 'duration': 20,
        'description': 'Cloche montée sur un véhicule de pompiers à deux essieux, utilisée pour réclamer le passage en cas d’incendie.',
        'tags': ['pompiers', 'cloche', 'XIXe siècle', 'incendie'], 'filename': 'WWS Firedepartmentbell.ogg',
        'audioUrl': 'https://upload.wikimedia.org/wikipedia/commons/transcoded/8/8a/WWS_Firedepartmentbell.ogg/WWS_Firedepartmentbell.ogg.mp3',
        'fallbackUrl': 'https://upload.wikimedia.org/wikipedia/commons/8/8a/WWS_Firedepartmentbell.ogg',
        'sourcePage': 'https://commons.wikimedia.org/wiki/File:WWS_Firedepartmentbell.ogg',
        'author': 'Konrad Gutkowski et Jonathan Nicolai / Work With Sounds',
        'license': 'CC BY 4.0', 'licenseUrl': CC_BY_4,
        'attribution': 'WWS Firedepartmentbell — Konrad Gutkowski et Jonathan Nicolai / Work With Sounds — CC BY 4.0.',
        'origin': 'recording', 'clipDuration': 12,
    },
]


def replace_between(source: str, start_marker: str, end_marker: str, replacement: str, label: str) -> str:
    start = source.find(start_marker)
    end = source.find(end_marker, start + len(start_marker))
    if start < 0 or end < 0:
        raise RuntimeError(f'Bloc introuvable : {label}')
    return source[:start] + replacement + source[end:]


# Bibliothèque : ajout, reclassement et catégories stables.
library = LIB_PATH.read_text(encoding='utf-8')
marker = 'export const AUDIO_LIBRARY: LibraryPreset[] = '
array_start = library.index('[', library.index(marker) + len(marker))
array_end = library.index('] as LibraryPreset[];', array_start) + 1
items: list[dict] = json.loads(library[array_start:array_end])
by_id = {item['id']: item for item in items}
for item in NEW_HISTORY_SOUNDS:
    by_id[item['id']] = item
items = list(by_id.values())
for item in items:
    if item.get('kind') != 'sfx':
        continue
    item['category'] = CATEGORY_RENAMES.get(item.get('category', ''), item.get('category', 'Vie quotidienne & objets'))
    item['category'] = CATEGORY_CORRECTIONS.get(item['id'], item['category'])
    if item['category'] not in SFX_CATEGORIES:
        item['category'] = 'Vie quotidienne & objets'

music = [item for item in items if item.get('kind') == 'music']
sfx_rank = {name: index for index, name in enumerate(SFX_CATEGORIES)}
sfx = sorted(
    [item for item in items if item.get('kind') == 'sfx'],
    key=lambda item: (sfx_rank[item['category']], item['title']),
)
items = music + sfx
library = library[:array_start] + json.dumps(items, ensure_ascii=False, indent=2) + library[array_end:]
library, category_count = re.subn(
    r"export const LIBRARY_CATEGORIES: Record<LibraryKind, string\[]> = \{.*?\n\};",
    "export const LIBRARY_CATEGORIES: Record<LibraryKind, string[]> = {\n"
    "  music: ['Époques historiques', 'Épique & action', 'Mystère & tension', 'Lieux & voyages', 'Calme & émotion'],\n"
    "  sfx: ['Guerres & combats', 'Sociétés & lieux historiques', 'Nature & paysages', 'Transports & industrie', 'Vie quotidienne & objets', 'Voix & foule'],\n"
    "};",
    library,
    count=1,
    flags=re.DOTALL,
)
if category_count != 1:
    raise RuntimeError('Déclaration des catégories introuvable.')
LIB_PATH.write_text(library, encoding='utf-8')

# Interface : ne pas prétendre que les sons sont générés par l’application.
app = APP_PATH.read_text(encoding='utf-8')
old_notice = 'Les sons intégrés sont produits directement par l’application. Ils fonctionnent hors ligne et ne nécessitent aucun crédit externe.'
new_notice = 'Les sons de la bibliothèque proviennent de sources libres ou sous licence. Ils sont téléchargés lors de leur premier ajout. Les sources et crédits sont indiqués pour chaque son.'
if app.count(old_notice) != 1:
    raise RuntimeError('Texte trompeur sur les sons introuvable ou dupliqué.')
app = app.replace(old_notice, new_notice, 1)
APP_PATH.write_text(app, encoding='utf-8')

# Moteur : la vitesse des effets grave/aigu doit modifier la durée réelle,
# la quantité de source lue, la musique de fond et les repères de bruitages.
engine = ENGINE_PATH.read_text(encoding='utf-8')
engine = replace_between(
    engine,
    'export function getBlockDuration(',
    '\n\nexport function getTimeline',
    '''function voicePlaybackRate(effect: VoiceEffect): number {
  return effect === 'deep' ? 0.9 : effect === 'high' ? 1.1 : 1;
}

export function getBlockDuration(block: PodcastBlock): number {
  if (block.type === 'silence') return Math.max(0.1, block.duration);
  if (block.type === 'transition') return Math.min(3, Math.max(0.5, block.duration));
  if (block.type === 'jingle') {
    return block.jingle?.length === 'short' ? 6 : block.jingle?.length === 'long' ? 15 : 10;
  }
  const sourceDuration = Math.max(0, block.trimEnd - block.trimStart || block.duration);
  const rate = block.type === 'voice' ? voicePlaybackRate(block.voiceEffect) : 1;
  const coreDuration = sourceDuration / rate;
  if (block.type === 'voice' && block.background) {
    return coreDuration + (block.background.startBefore ? PRE_ROLL : 0) + (block.background.continueAfter ? POST_ROLL : 0);
  }
  return coreDuration;
}''',
    'durée des effets vocaux',
)

start_before = '''  const safeOffset = loop ? offset % buffer.duration : Math.min(offset, Math.max(0, buffer.duration - 0.01));
  source.start(start, safeOffset, loop ? undefined : Math.min(duration, buffer.duration - safeOffset));'''
start_after = '''  const safeOffset = loop ? offset % buffer.duration : Math.min(offset, Math.max(0, buffer.duration - 0.01));
  const playbackRate = voicePlaybackRate(effect);
  source.start(start, safeOffset, loop ? undefined : Math.min(duration * playbackRate, buffer.duration - safeOffset));'''
if engine.count(start_before) != 1:
    raise RuntimeError('Planification de la source audio introuvable ou dupliquée.')
engine = engine.replace(start_before, start_after, 1)

engine = replace_between(
    engine,
    'async function scheduleVoiceBlock(',
    '\n\nasync function scheduleJingle',
    '''async function scheduleVoiceBlock(
  context: RenderContext,
  destination: AudioNode,
  block: PodcastBlock,
  project: PodcastProject,
  cache: Map<string, AudioBuffer>,
  start: number,
  localOffset: number,
): Promise<void> {
  const voiceAsset = assetById(project, block.assetId);
  if (!voiceAsset) return;
  const coreSourceDuration = Math.max(0, block.trimEnd - block.trimStart || block.duration);
  const playbackRate = voicePlaybackRate(block.voiceEffect);
  const coreTimelineDuration = coreSourceDuration / playbackRate;
  const pre = block.background?.startBefore ? PRE_ROLL : 0;
  const post = block.background?.continueAfter ? POST_ROLL : 0;
  const total = pre + coreTimelineDuration + post;
  const remainingTotal = total - localOffset;
  if (remainingTotal <= 0) return;

  if (block.background) {
    const background = assetById(project, block.background.assetId);
    if (background) {
      const bgGain = context.createGain();
      bgGain.connect(destination);
      const level = backgroundValue(block.background.level);
      const bgStart = start;
      const voiceStartRelative = Math.max(0, pre - localOffset);
      const voiceRemaining = Math.max(0, coreTimelineDuration - Math.max(0, localOffset - pre));
      bgGain.gain.setValueAtTime(0.0001, bgStart);
      bgGain.gain.linearRampToValueAtTime(level * 1.35, bgStart + Math.min(0.5, remainingTotal / 4));
      if (voiceRemaining > 0) {
        bgGain.gain.linearRampToValueAtTime(level, bgStart + voiceStartRelative + 0.08);
        bgGain.gain.setValueAtTime(level, bgStart + voiceStartRelative + voiceRemaining);
        if (post > 0) bgGain.gain.linearRampToValueAtTime(level * 1.25, Math.min(bgStart + remainingTotal, bgStart + voiceStartRelative + voiceRemaining + 0.18));
      }
      bgGain.gain.linearRampToValueAtTime(0.0001, bgStart + remainingTotal);
      const bgBuffer = await decodeAsset(context, background, cache);
      const bgSource = context.createBufferSource();
      bgSource.buffer = bgBuffer;
      bgSource.loop = true;
      bgSource.connect(bgGain);
      bgSource.start(bgStart, localOffset % bgBuffer.duration);
      bgSource.stop(bgStart + remainingTotal + 0.03);
    }
  }

  const voiceTimelineStart = pre;
  const consumedVoiceTimeline = Math.max(0, localOffset - voiceTimelineStart);
  if (consumedVoiceTimeline < coreTimelineDuration) {
    const consumedVoiceSource = Math.min(coreSourceDuration, consumedVoiceTimeline * playbackRate);
    const delay = Math.max(0, voiceTimelineStart - localOffset);
    const voiceDuration = (coreSourceDuration - consumedVoiceSource) / playbackRate;
    await scheduleAsset(
      context,
      destination,
      voiceAsset,
      cache,
      start + delay,
      block.trimStart + consumedVoiceSource,
      voiceDuration,
      volumeValue(block.volume),
      block.fadeIn === 'none' ? 'short' : block.fadeIn,
      block.fadeOut === 'none' ? 'short' : block.fadeOut,
      block.voiceEffect,
    );
  }

  for (const cue of block.voiceCues ?? []) {
    const cueAsset = assetById(project, cue.assetId);
    if (!cueAsset) continue;
    const cueAtSource = Math.min(Math.max(0, cue.at), coreSourceDuration);
    const cueAtTimeline = cueAtSource / playbackRate;
    const cueDuration = Math.min(Math.max(0.2, cue.duration), Math.max(0, coreTimelineDuration - cueAtTimeline));
    if (cueDuration <= 0) continue;
    const cueTimelineStart = pre + cueAtTimeline;
    if (localOffset >= cueTimelineStart + cueDuration) continue;
    const consumedCue = Math.max(0, localOffset - cueTimelineStart);
    const cueDelay = Math.max(0, cueTimelineStart - localOffset);
    await scheduleAsset(
      context,
      destination,
      cueAsset,
      cache,
      start + cueDelay,
      consumedCue,
      cueDuration - consumedCue,
      voiceCueValue(cue.level),
      'none',
      'short',
    );
  }
}''',
    'planification des voix et bruitages synchronisés',
)
ENGINE_PATH.write_text(engine, encoding='utf-8')

# Vérifications explicites.
combined = LIB_PATH.read_text(encoding='utf-8')
for required in (
    'sfx-explosion', 'sfx-explosions', 'sfx-gunshots-simulated', 'sfx-cannon-reveille',
    'sfx-large-crowd-cheering', 'sfx-provence-market', 'sfx-fireworks-detonations',
    'sfx-rotary-printing-press-1926', 'sfx-military-drumbeat',
    'sfx-1960s-factory-civil-defense-siren', 'sfx-19th-century-fire-brigade-bell',
):
    if required not in combined:
        raise RuntimeError(f'Bruitage attendu absent : {required}')
for category in SFX_CATEGORIES:
    if category not in combined:
        raise RuntimeError(f'Catégorie attendue absente : {category}')
engine_check = ENGINE_PATH.read_text(encoding='utf-8')
for required in ('voicePlaybackRate', 'coreTimelineDuration', 'duration * playbackRate', 'cueAtSource / playbackRate'):
    if required not in engine_check:
        raise RuntimeError(f'Correctif moteur attendu absent : {required}')
if old_notice in APP_PATH.read_text(encoding='utf-8'):
    raise RuntimeError('Le texte trompeur sur les sons subsiste.')

print(f'Correctifs audio consolidés : {len(sfx)} bruitages, {len(NEW_HISTORY_SOUNDS)} ajouts historiques et effets grave/aigu synchronisés.')
