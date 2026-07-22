from __future__ import annotations

import html
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APP_PATH = ROOT / 'src' / 'App.tsx'
ENGINE_PATH = ROOT / 'src' / 'audio' / 'engine.ts'
TYPES_PATH = ROOT / 'src' / 'types.ts'
LIBRARY_PATH = ROOT / 'src' / 'data' / 'audioLibrary.ts'
CREDITS_PATH = ROOT / 'public' / 'audio-credits.html'
STYLES_PATH = ROOT / 'src' / 'styles.css'

CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/'
PD = 'https://creativecommons.org/publicdomain/mark/1.0/'
BY3 = 'https://creativecommons.org/licenses/by/3.0/'
BY4 = 'https://creativecommons.org/licenses/by/4.0/'
BYSA3 = 'https://creativecommons.org/licenses/by-sa/3.0/'

EXTRA_CATEGORY = 'Chocs, impacts, transitions'


def replace_between(source: str, start_marker: str, end_marker: str, replacement: str, label: str) -> str:
    start = source.find(start_marker)
    end = source.find(end_marker, start + len(start_marker))
    if start < 0 or end < 0:
        raise RuntimeError(f'Bloc introuvable : {label}')
    return source[:start] + replacement + source[end:]


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f'Remplacement ambigu ({count}) : {label}')
    return source.replace(old, new, 1)


def freesound(
    *, id: str, title: str, category: str, icon: str, duration: float, description: str,
    tags: list[str], sound_id: int, user: str, preview_key: str, clip_duration: float | None = None,
    secondary: bool = False,
) -> dict:
    item = {
        'id': id, 'kind': 'sfx', 'title': title, 'category': category, 'icon': icon,
        'duration': duration, 'description': description, 'tags': tags,
        'filename': f'Freesound {sound_id}.mp3',
        'audioUrl': f'https://cdn.freesound.org/previews/{str(sound_id)[:3]}/{preview_key}-hq.mp3',
        'fallbackUrl': f'https://cdn.freesound.org/previews/{str(sound_id)[:3]}/{preview_key}-lq.mp3',
        'sourcePage': f'https://freesound.org/people/{user}/sounds/{sound_id}/',
        'author': user, 'license': 'CC0', 'licenseUrl': CC0,
        'attribution': f'{title} — {user} / Freesound — CC0.', 'origin': 'recording',
    }
    if clip_duration is not None:
        item['clipDuration'] = clip_duration
    if secondary:
        item['secondaryCategories'] = [EXTRA_CATEGORY]
    return item


def commons_sfx(
    *, id: str, title: str, category: str, icon: str, duration: float, description: str,
    tags: list[str], filename: str, path: str, author: str, license: str, license_url: str,
    clip_duration: float | None = None, secondary: bool = False,
) -> dict:
    encoded_name = filename.replace(' ', '_')
    original = f'https://upload.wikimedia.org/wikipedia/commons/{path}/{encoded_name}'
    audio = original if filename.lower().endswith(('.mp3', '.wav')) else f'https://upload.wikimedia.org/wikipedia/commons/transcoded/{path}/{encoded_name}/{encoded_name}.mp3'
    item = {
        'id': id, 'kind': 'sfx', 'title': title, 'category': category, 'icon': icon,
        'duration': duration, 'description': description, 'tags': tags, 'filename': filename,
        'audioUrl': audio, 'fallbackUrl': original,
        'sourcePage': f'https://commons.wikimedia.org/wiki/File:{encoded_name}',
        'author': author, 'license': license, 'licenseUrl': license_url,
        'attribution': f'{title} — {author} — {license}.', 'origin': 'recording',
    }
    if clip_duration is not None:
        item['clipDuration'] = clip_duration
    if secondary:
        item['secondaryCategories'] = [EXTRA_CATEGORY]
    return item


NEW_SFX = [
    freesound(id='sfx-medieval-battle-ambience', title='Bataille médiévale — chevaux, épées et cris', category='Guerres & combats', icon='⚔️', duration=207.8,
              description='Reconstitution de combat viking avec épées, boucliers, chevaux et combattants qui crient.', tags=['médiéval', 'bataille', 'épées', 'chevaux', 'cris'], sound_id=376646, user='DeadVDI', preview_key='376646_6972943', clip_duration=20),
    freesound(id='sfx-medieval-castle-ambience', title='Château et village médiéval', category='Sociétés & lieux historiques', icon='🏰', duration=40.4,
              description='Ambiance composite de château, village, taverne et souterrains pour installer un décor médiéval.', tags=['château', 'village', 'taverne', 'médiéval'], sound_id=578072, user='ramonmineiro', preview_key='578072_5020041', clip_duration=20),
    freesound(id='sfx-medieval-market-ambience', title='Marché médiéval animé', category='Sociétés & lieux historiques', icon='🧺', duration=9.6,
              description='Voix, marchandage et agitation d’un marché médiéval reconstitué.', tags=['marché', 'médiéval', 'marchands', 'foule'], sound_id=424790, user='bolkmar', preview_key='424790_2927958'),
    freesound(id='sfx-horse-gallop-grass', title='Chevaux au galop dans l’herbe', category='Nature & paysages', icon='🐎', duration=9.9,
              description='Galop sur sol souple et herbe haute, avec approche puis passage des chevaux.', tags=['chevaux', 'galop', 'herbe', 'passage'], sound_id=479704, user='craigsmith', preview_key='479704_2524442'),
    freesound(id='sfx-pirate-ship-ambience', title='Bateau pirate en mer', category='Transports & industrie', icon='🏴‍☠️', duration=157.2,
              description='Bois qui craque, cordages, vent et mer autour d’un voilier, utilisable comme pont de bateau pirate.', tags=['pirate', 'voilier', 'mer', 'cordages', 'bois'], sound_id=265622, user='cabro', preview_key='265622_826105', clip_duration=20),
    freesound(id='sfx-naval-battle-ambience', title='Bataille navale de pirates', category='Guerres & combats', icon='💣', duration=14,
              description='Montage de canons, impacts et activité de pont évoquant une bataille navale à l’époque de la voile.', tags=['bataille navale', 'pirates', 'canons', 'navire'], sound_id=576054, user='istudeny', preview_key='576054_4914751'),
    freesound(id='sfx-old-phone-ringing', title='Téléphone ancien qui sonne', category='Vie quotidienne & objets', icon='☎️', duration=11.6,
              description='Sonnerie insistante d’un téléphone ancien avant que quelqu’un décroche.', tags=['téléphone', 'sonnerie', 'appel', 'ancien'], sound_id=610191, user='BennettFilmTeacher', preview_key='610191_7254895', clip_duration=8),
    commons_sfx(id='sfx-phone-ringback-waiting', title='Téléphone — attente de réponse', category='Vie quotidienne & objets', icon='📞', duration=20,
                description='Tonalité d’appel entendue pendant l’attente avant que le correspondant réponde.', tags=['téléphone', 'attente', 'tonalité', 'appel'], filename='US ringback tone.ogg', path='c/cd', author='Edokter', license='CC0', license_url=CC0, clip_duration=8),
    commons_sfx(id='sfx-onomatopoeia-question', title='Onomatopée — interrogation', category='Voix & foule', icon='❓', duration=1,
                description='Très courte exclamation montante pour marquer une question ou une incompréhension.', tags=['onomatopée', 'interrogation', 'question', 'hein'], filename='Whoot sound.ogg', path='5/51', author='MJL', license='Domaine public', license_url=PD, secondary=True),
    commons_sfx(id='sfx-onomatopoeia-failure', title='Onomatopée — échec et désarroi', category='Voix & foule', icon='📉', duration=4.8,
                description='Bref trombone triste pour souligner un échec, une déception ou le désarroi.', tags=['onomatopée', 'échec', 'désarroi', 'déception'], filename='Sad Trombone.wav', path='3/3e', author='Sad Tromboner', license='CC BY 4.0', license_url=BY4, secondary=True),
    commons_sfx(id='sfx-onomatopoeia-pop', title='Onomatopée — pop', category='Voix & foule', icon='🫧', duration=12.1,
                description='Pop produit avec la bouche, utile pour une apparition, un changement ou une bulle.', tags=['onomatopée', 'pop', 'bouche', 'apparition'], filename='Mouth pop.ogg', path='c/c1', author='cori / PDSounds.org', license='Domaine public', license_url=PD, clip_duration=2.2, secondary=True),
    commons_sfx(id='sfx-onomatopoeia-mystery', title='Onomatopée — mystère', category='Voix & foule', icon='🕵️', duration=77.8,
                description='Courte ponctuation musicale inquiétante pour introduire un doute ou une révélation.', tags=['onomatopée', 'mystère', 'suspense', 'révélation'], filename='Suspense.ogg', path='e/e1', author='Robinhood76', license='CC BY-SA 3.0', license_url=BYSA3, clip_duration=4, secondary=True),
    commons_sfx(id='sfx-onomatopoeia-surprise', title='Onomatopée — surprise', category='Voix & foule', icon='❗', duration=0.6,
                description='Très brève exclamation « oh ! » pour accentuer une surprise.', tags=['onomatopée', 'surprise', 'oh', 'réaction'], filename='En-us-oh-surprise.ogg', path='9/9a', author='Sven', license='CC BY-SA 3.0', license_url=BYSA3, secondary=True),
]


MUSIC_FILES = [
    ('music-chase-action', 'Course-poursuite', '🏃', 75, 'Rythme soutenu pour une fuite, une enquête qui accélère ou un montage d’action.', ['course-poursuite', 'action', 'urgence'], 'Audionautix-com-ccby-chasinit.mp3', 'c/cd'),
    ('music-in-a-hurry', 'Quelqu’un de pressé', '⏱️', 156, 'Musique vive et légèrement comique pour une scène où tout doit aller très vite.', ['pressé', 'vitesse', 'comédie', 'urgence'], 'Audionautix-com-ccby-getamoveon.mp3', '3/37'),
    ('music-far-west-banjo', 'Far West — banjo en mouvement', '🤠', 75, 'Banjo énergique pour une chevauchée, un saloon ou une aventure dans l’Ouest.', ['far west', 'banjo', 'western', 'aventure'], 'Audionautix-com-ccby-banjohop.mp3', '8/82'),
    ('music-action-intro', 'Introduction d’action', '🎬', 48, 'Départ direct et cinématographique pour annoncer une séquence d’action.', ['action', 'introduction', 'cinéma', 'tension'], 'Audionautix-com-ccby-introaction.mp3', '5/5a'),
    ('music-ashes-empire', 'Empire en cendres', '🔥', 222, 'Fond orchestral ample pour une chute d’empire, une bataille décisive ou un récit héroïque.', ['épique', 'empire', 'bataille', 'orchestral'], 'Audionautix-com-ccby-ashesofanempire.mp3', '6/6c'),
    ('music-line-of-fire', 'Sous le feu', '🎖️', 69, 'Tension rythmique de film pour une offensive, une mission dangereuse ou un compte à rebours.', ['action', 'mission', 'danger', 'film'], 'Audionautix-com-ccby-lineoffire.mp3', 'd/d2'),
]

NEW_MUSIC = []
for music_id, title, icon, duration, description, tags, filename, path in MUSIC_FILES:
    encoded = filename.replace(' ', '_')
    NEW_MUSIC.append({
        'id': music_id, 'kind': 'music', 'title': title, 'category': 'Épique & action', 'icon': icon,
        'duration': duration, 'description': description, 'tags': tags, 'filename': filename,
        'audioUrl': f'https://upload.wikimedia.org/wikipedia/commons/{path}/{encoded}',
        'fallbackUrl': f'https://upload.wikimedia.org/wikipedia/commons/{path}/{encoded}',
        'sourcePage': f'https://commons.wikimedia.org/wiki/File:{encoded}',
        'author': 'Jason Shaw / Audionautix', 'license': 'CC BY 3.0', 'licenseUrl': BY3,
        'attribution': f'{title} — Jason Shaw / Audionautix — CC BY 3.0.',
        'origin': 'recording', 'clipDuration': min(30, duration),
    })


SHORT_IDS = {
    'sfx-dull-thud', 'sfx-camera-real', 'sfx-buzzer-real', 'sfx-pen-drop', 'sfx-bicycle-bell',
    'sfx-door-knocker', 'sfx-male-scream-fear', 'sfx-human-whistling', 'sfx-wilhelm-scream',
    'sfx-explosion', 'sfx-steamboat-horn', 'sfx-sword-hit-real', 'sfx-music-box',
    'sfx-airplane-chime', 'sfx-sword-unsheathe-real', 'sfx-machinery-clunk', 'sfx-turn-page',
    'sfx-doorbell', 'sfx-old-phone-ringing', 'sfx-onomatopoeia-question',
    'sfx-onomatopoeia-failure', 'sfx-onomatopoeia-pop', 'sfx-onomatopoeia-mystery',
    'sfx-onomatopoeia-surprise',
}


# Bibliothèque : métadonnées secondaires, nouveaux enregistrements et nouvelles musiques.
library = LIBRARY_PATH.read_text(encoding='utf-8')
library = replace_once(library, "  category: string;\n", "  category: string;\n  secondaryCategories?: string[];\n", 'catégories secondaires')
marker = 'export const AUDIO_LIBRARY: LibraryPreset[] = '
array_start = library.index('[', library.index(marker) + len(marker))
array_end = library.index('] as LibraryPreset[];', array_start) + 1
items: list[dict] = json.loads(library[array_start:array_end])
by_id = {item['id']: item for item in items}
for item in NEW_SFX + NEW_MUSIC:
    by_id[item['id']] = item
for item_id in SHORT_IDS:
    if item_id not in by_id:
        raise RuntimeError(f'Bruitage court introuvable : {item_id}')
    categories = by_id[item_id].setdefault('secondaryCategories', [])
    if EXTRA_CATEGORY not in categories:
        categories.append(EXTRA_CATEGORY)

music_categories = ['Époques historiques', 'Épique & action', 'Mystère & tension', 'Lieux & voyages', 'Calme & émotion']
sfx_categories = [EXTRA_CATEGORY, 'Guerres & combats', 'Sociétés & lieux historiques', 'Nature & paysages', 'Transports & industrie', 'Vie quotidienne & objets', 'Voix & foule']
music_rank = {name: index for index, name in enumerate(music_categories)}
sfx_rank = {name: index for index, name in enumerate(sfx_categories[1:])}
music = sorted((item for item in by_id.values() if item.get('kind') == 'music'), key=lambda item: (music_rank.get(item['category'], 99), item['title']))
sfx = sorted((item for item in by_id.values() if item.get('kind') == 'sfx'), key=lambda item: (sfx_rank.get(item['category'], 99), item['title']))
items = music + sfx
library = library[:array_start] + json.dumps(items, ensure_ascii=False, indent=2) + library[array_end:]
library, category_count = re.subn(
    r"export const LIBRARY_CATEGORIES: Record<LibraryKind, string\[]> = \{.*?\n\};",
    "export const LIBRARY_CATEGORIES: Record<LibraryKind, string[]> = {\n"
    f"  music: {json.dumps(music_categories, ensure_ascii=False)},\n"
    f"  sfx: {json.dumps(sfx_categories, ensure_ascii=False)},\n"
    "};",
    library,
    count=1,
    flags=re.DOTALL,
)
if category_count != 1:
    raise RuntimeError('Catégories de bibliothèque introuvables.')
LIBRARY_PATH.write_text(library, encoding='utf-8')


# Types de projet : rétrocompatibles grâce aux champs optionnels.
types = TYPES_PATH.read_text(encoding='utf-8')
types = re.sub(r"export type VoiceEffect = .*?;", "export type VoiceEffect = 'none' | 'phone' | 'echo' | 'distant' | 'deep' | 'high';", types, count=1)
types = re.sub(
    r"export type TransitionPreset = .*?;",
    "export type TransitionPreset = 'fade' | 'whoosh' | 'bell' | 'radio' | 'page' | 'percussion' | 'rise' | 'mystery' | 'impact' | 'sparkle' | 'heartbeat' | 'rewind' | 'drop' | 'question' | 'failure' | 'surprise' | 'portal' | 'cinematic';",
    types,
    count=1,
)
types = replace_once(types, "  duration: number;\n  level: VoiceCueLevel;\n", "  duration: number;\n  sourceStart?: number;\n  sourceEnd?: number;\n  level: VoiceCueLevel;\n", 'plage des bruitages synchronisés')
types = replace_once(types, "  transitionPreset?: TransitionPreset;\n", "  transitionPreset?: TransitionPreset;\n  transitionVolume?: VolumeLevel;\n", 'volume des transitions')
TYPES_PATH.write_text(types, encoding='utf-8')


# Interface principale.
app = APP_PATH.read_text(encoding='utf-8')
app = replace_between(
    app,
    'const transitionLabels:',
    '\n\nconst voiceEffectLabels:',
    '''const transitionLabels: Record<TransitionPreset, string> = {
  fade: 'Fondu simple',
  whoosh: 'Whoosh',
  bell: 'Cloche',
  radio: 'Effet radio',
  page: 'Page tournée',
  percussion: 'Courte percussion',
  rise: 'Montée musicale',
  mystery: 'Transition mystérieuse',
  impact: 'Impact grave',
  sparkle: 'Étincelles',
  heartbeat: 'Battement',
  rewind: 'Retour arrière',
  drop: 'Chute sonore',
  question: 'Interrogation',
  failure: 'Échec',
  surprise: 'Surprise',
  portal: 'Portail',
  cinematic: 'Impact cinématique',
};''',
    'libellés de transition',
)
app = replace_between(
    app,
    'const voiceEffectLabels:',
    '\n\nfunction cloneBlock',
    '''const voiceEffectLabels: Record<VoiceEffect, string> = {
  none: 'Aucun effet',
  phone: 'Effet téléphone',
  echo: 'Rêve',
  distant: 'Voix lointaine (réverbération)',
  deep: 'Voix grave',
  high: 'Voix aiguë +',
};''',
    'libellés des effets vocaux',
)
app = replace_once(app, "    transitionPreset: type === 'transition' ? 'fade' : undefined,\n", "    transitionPreset: type === 'transition' ? 'fade' : undefined,\n    transitionVolume: type === 'transition' ? 'normal' : undefined,\n", 'volume initial des transitions')
app = replace_once(
    app,
    "      const cue: VoiceSoundCue = { id: crypto.randomUUID(), assetId: asset.id, at: safeAt, duration, level: 'low' };",
    "      const cue: VoiceSoundCue = { id: crypto.randomUUID(), assetId: asset.id, at: safeAt, duration, sourceStart: 0, sourceEnd: duration, level: 'low' };",
    'plage initiale du bruitage',
)
app = replace_once(
    app,
    "            <div className=\"setting-group\"><h3>Type de transition</h3><div className=\"option-grid\">{(Object.keys(transitionLabels) as TransitionPreset[]).map((preset) => <button key={preset} className={block.transitionPreset === preset ? 'selected' : ''} onClick={() => update('transitionPreset', preset)}>{transitionLabels[preset]}</button>)}</div><label className=\"field compact-field\"><span>Durée</span><input type=\"range\" min=\"0.5\" max=\"3\" step=\"0.1\" value={block.duration} onChange={(event) => update('duration', Number(event.target.value))} /><strong>{block.duration.toFixed(1)} s</strong></label></div>",
    "            <div className=\"setting-group\"><h3>Type de transition</h3><div className=\"option-grid\">{(Object.keys(transitionLabels) as TransitionPreset[]).map((preset) => <button key={preset} className={block.transitionPreset === preset ? 'selected' : ''} onClick={() => update('transitionPreset', preset)}>{transitionLabels[preset]}</button>)}</div><div className=\"transition-controls\"><label className=\"field compact-field\"><span>Durée</span><input type=\"range\" min=\"0.5\" max=\"3\" step=\"0.1\" value={block.duration} onChange={(event) => update('duration', Number(event.target.value))} /><strong>{block.duration.toFixed(1)} s</strong></label><ChoiceSetting title=\"Volume de la transition\" value={block.transitionVolume ?? 'normal'} options={[[\"low\", \"Discret\"], [\"normal\", \"Normal\"], [\"high\", \"Fort\"]]} onChange={(value) => update('transitionVolume', value as VolumeLevel)} /></div></div>",
    'contrôle du volume des transitions',
)
app = replace_once(app, "    if (category !== 'Toutes' && preset.category !== category) return false;", "    if (category !== 'Toutes' && preset.category !== category && !preset.secondaryCategories?.includes(category)) return false;", 'filtre multi-catégories')
app = replace_once(app, "    return [preset.title, preset.description, preset.category, ...preset.tags].join(' ').toLocaleLowerCase('fr').includes(normalizedSearch);", "    return [preset.title, preset.description, preset.category, ...(preset.secondaryCategories ?? []), ...preset.tags].join(' ').toLocaleLowerCase('fr').includes(normalizedSearch);", 'recherche multi-catégories')

voice_cue_editor = r'''function VoiceCueEditor({ asset, trimStart, trimEnd, cues, assets, onCues, onAddLibrary, onImport }: {
  asset: AudioAsset;
  trimStart: number;
  trimEnd: number;
  cues: VoiceSoundCue[];
  assets: AudioAsset[];
  onCues: (cues: VoiceSoundCue[]) => void;
  onAddLibrary: (at: number) => void;
  onImport: (file: File, at: number) => Promise<void> | void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const duration = Math.max(0.2, trimEnd - trimStart || asset.duration);

  useEffect(() => {
    const url = URL.createObjectURL(asset.blob);
    setAudioUrl(url);
    setPosition(0);
    setPlaying(false);
    return () => URL.revokeObjectURL(url);
  }, [asset.blob]);

  const seek = (value: number) => {
    const safe = Math.min(duration, Math.max(0, value));
    setPosition(safe);
    const audio = audioRef.current;
    if (audio) audio.currentTime = trimStart + safe;
  };

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      setPlaying(false);
      return;
    }
    setBrowserAudioSession('playback');
    if (audio.currentTime < trimStart || audio.currentTime >= trimEnd) audio.currentTime = trimStart + position;
    try { await audio.play(); setPlaying(true); }
    catch { setPlaying(false); }
  };

  const updateCue = (id: string, values: Partial<VoiceSoundCue>) => {
    onCues(cues.map((cue) => cue.id === id ? { ...cue, ...values } : cue).sort((left, right) => left.at - right.at));
  };

  return (
    <div className="voice-cue-editor">
      <div className="setting-title-row">
        <div><h3>Bruitages derrière la voix</h3><p>Écoute ta voix, mets en pause à l’endroit voulu, puis ajoute un bruitage exactement ici.</p></div>
        <span className="cue-count">{cues.length || 'Aucun'} repère{cues.length > 1 ? 's' : ''}</span>
      </div>
      <audio ref={audioRef} src={audioUrl} preload="auto" playsInline
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          const relative = Math.max(0, audio.currentTime - trimStart);
          if (relative >= duration) { audio.pause(); audio.currentTime = trimStart; setPosition(0); setPlaying(false); }
          else setPosition(relative);
        }}
        onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
      <div className="cue-player">
        <button className="cue-play-button" onClick={() => void toggle()}>{playing ? 'Ⅱ' : '▶'}</button>
        <span className="cue-time">{position.toFixed(1)} s</span>
        <div className="cue-range-shell">
          <input type="range" min="0" max={duration} step="0.05" value={Math.min(position, duration)} onChange={(event) => { audioRef.current?.pause(); seek(Number(event.target.value)); }} />
          {cues.map((cue) => <button key={cue.id} className="cue-marker" style={{ left: `${Math.min(100, Math.max(0, cue.at / duration * 100))}%` }} onClick={() => seek(cue.at)} title={`Bruitage à ${cue.at.toFixed(1)} s`} />)}
        </div>
        <span className="cue-time">{duration.toFixed(1)} s</span>
      </div>
      <div className="cue-add-actions">
        <button className="primary-button compact" onClick={() => { audioRef.current?.pause(); onAddLibrary(position); }}>🔊 Ajouter un bruitage ici</button>
        <FilePicker label="Importer un bruitage ici" onFile={(file) => { audioRef.current?.pause(); void onImport(file, position); }} />
      </div>
      {cues.length > 0 && (
        <div className="cue-list">
          {cues.map((cue, index) => {
            const cueAsset = assets.find((candidate) => candidate.id === cue.assetId);
            const assetDuration = Math.max(0.05, cueAsset?.duration ?? cue.duration);
            const sourceStart = Math.min(Math.max(0, cue.sourceStart ?? 0), Math.max(0, assetDuration - 0.05));
            const legacyEnd = sourceStart + Math.max(0.05, cue.duration);
            const sourceEnd = Math.min(assetDuration, Math.max(sourceStart + 0.05, cue.sourceEnd ?? legacyEnd));
            const maxTimelineDuration = Math.max(0.05, duration - cue.at);
            const usedDuration = Math.min(sourceEnd - sourceStart, maxTimelineDuration);
            return (
              <div className="cue-row" key={cue.id}>
                <button className="cue-position" onClick={() => seek(cue.at)}>{cue.at.toFixed(1)} s</button>
                <div className="cue-name"><strong>{cueAsset?.name ?? `Bruitage ${index + 1}`}</strong><small>Extrait {sourceStart.toFixed(1)}–{sourceEnd.toFixed(1)} s · {usedDuration.toFixed(1)} s utilisé</small></div>
                <label><span>Niveau</span><select value={cue.level} onChange={(event) => updateCue(cue.id, { level: event.target.value as VoiceSoundCue['level'] })}><option value="low">Discret</option><option value="normal">Normal</option><option value="high">Fort</option></select></label>
                <div className="cue-source-range">
                  <strong>Plage du fichier</strong>
                  <label><span>Début · {sourceStart.toFixed(1)} s</span><input type="range" min="0" max={Math.max(0, sourceEnd - 0.05)} step="0.05" value={sourceStart} onChange={(event) => { const nextStart = Number(event.target.value); updateCue(cue.id, { sourceStart: nextStart, sourceEnd, duration: Math.min(sourceEnd - nextStart, maxTimelineDuration) }); }} /></label>
                  <label><span>Fin · {sourceEnd.toFixed(1)} s</span><input type="range" min={Math.min(assetDuration, sourceStart + 0.05)} max={assetDuration} step="0.05" value={sourceEnd} onChange={(event) => { const nextEnd = Number(event.target.value); updateCue(cue.id, { sourceStart, sourceEnd: nextEnd, duration: Math.min(nextEnd - sourceStart, maxTimelineDuration) }); }} /></label>
                </div>
                <button className="secondary-button compact" onClick={() => updateCue(cue.id, { at: Math.min(position, Math.max(0, duration - 0.2)) })}>Placer ici</button>
                <button className="mini-button danger" onClick={() => onCues(cues.filter((candidate) => candidate.id !== cue.id))} title="Supprimer ce bruitage">×</button>
              </div>
            );
          })}
        </div>
      )}
      <p className="cue-help">Choisis le début et la fin dans le fichier du bruitage. L’aperçu puis l’export utilisent exactement cette plage.</p>
    </div>
  );
}'''
app = replace_between(app, 'function VoiceCueEditor(', '\n\nfunction Recorder', voice_cue_editor, 'éditeur des bruitages synchronisés')

jingle_settings = r'''function JingleSettings({ block, assets, onBlock, onAttach, onOpenLibrary }: {
  block: PodcastBlock; assets: AudioAsset[]; onBlock: React.Dispatch<React.SetStateAction<PodcastBlock>>;
  onAttach: (field: 'background' | 'musicAssetId' | 'voiceAssetId' | 'openingAssetId' | 'closingAssetId', file: File) => void;
  onOpenLibrary: (target: 'musicAssetId' | 'openingAssetId' | 'closingAssetId') => void;
}) {
  const jingle = block.jingle ?? { style: 'modern-radio' as const, length: 'normal' as const, musicLevel: 'low' as const };
  const updateJingle = (values: Partial<NonNullable<PodcastBlock['jingle']>>) => onBlock((current) => ({ ...current, jingle: { ...(current.jingle ?? jingle), ...values } }));
  const removeJingleAsset = (field: 'musicAssetId' | 'voiceAssetId' | 'openingAssetId' | 'closingAssetId') => onBlock((current) => {
    const nextJingle = { ...(current.jingle ?? jingle) };
    delete nextJingle[field];
    return { ...current, jingle: nextJingle };
  });
  const assetName = (id?: string) => assets.find((asset) => asset.id === id)?.name;
  const styleNames: Record<NonNullable<PodcastBlock['jingle']>['style'], string> = {
    dynamic: 'Dynamique', adventure: 'Aventure', mysterious: 'Mystérieux', serious: 'Sérieux', historical: 'Historique', 'modern-radio': 'Radio moderne',
  };
  const styleDescriptions: Record<NonNullable<PodcastBlock['jingle']>['style'], string> = {
    dynamic: 'Départ très rapide, musique énergique, voix en avant et impact grave.',
    adventure: 'Intro plus ample, montée héroïque et finale cinématographique.',
    mysterious: 'Entrée lente, musique plus feutrée et voix légèrement onirique.',
    serious: 'Niveaux retenus, voix claire et ponctuation sobre.',
    historical: 'Entrée solennelle, cloche et légère réverbération de la voix.',
    'modern-radio': 'Rythme court, voix filtrée façon studio radio et signature radio.',
  };
  const selected = (field: 'musicAssetId' | 'voiceAssetId' | 'openingAssetId' | 'closingAssetId', id?: string) => id ? <div className="jingle-selected"><small>✓ {assetName(id)}</small><button className="danger-text" onClick={() => removeJingleAsset(field)}>Retirer</button></div> : null;
  return (
    <div className="jingle-builder">
      <div className="jingle-step"><span>1</span><div><h3>Musique</h3><div className="source-actions"><button className="primary-button compact" onClick={() => onOpenLibrary('musicAssetId')}>🎼 Bibliothèque musicale</button><FilePicker label="Importer une musique" onFile={(file) => onAttach('musicAssetId', file)} /></div>{selected('musicAssetId', jingle.musicAssetId)}</div></div>
      <div className="jingle-step"><span>2</span><div><h3>Texte avec ta voix</h3><Recorder onReady={async (blob, duration) => { const file = new File([blob], 'voix-jingle.webm', { type: blob.type }); onAttach('voiceAssetId', file); void duration; }} /><FilePicker label="Ou importer une voix" onFile={(file) => onAttach('voiceAssetId', file)} />{selected('voiceAssetId', jingle.voiceAssetId)}</div></div>
      <div className="jingle-step"><span>3</span><div><h3>Bruits facultatifs</h3><div className="jingle-sound-grid"><div><strong>Ouverture</strong><div className="source-actions"><button className="secondary-button compact" onClick={() => onOpenLibrary('openingAssetId')}>🔊 Bibliothèque</button><FilePicker label="Importer" onFile={(file) => onAttach('openingAssetId', file)} /></div>{selected('openingAssetId', jingle.openingAssetId)}</div><div><strong>Fermeture</strong><div className="source-actions"><button className="secondary-button compact" onClick={() => onOpenLibrary('closingAssetId')}>🔊 Bibliothèque</button><FilePicker label="Importer" onFile={(file) => onAttach('closingAssetId', file)} /></div>{selected('closingAssetId', jingle.closingAssetId)}</div></div></div></div>
      <div className="settings-columns">
        <ChoiceSetting title="Style" value={jingle.style} options={[["dynamic", "Dynamique"], ["adventure", "Aventure"], ["mysterious", "Mystérieux"], ["serious", "Sérieux"], ["historical", "Historique"], ["modern-radio", "Radio moderne"]]} onChange={(value) => updateJingle({ style: value as NonNullable<PodcastBlock['jingle']>['style'] })} />
        <ChoiceSetting title="Durée" value={jingle.length} options={[["short", "Courte · 6 s"], ["normal", "Normale · 10 s"], ["long", "Longue · 15 s"]]} onChange={(value) => updateJingle({ length: value as 'short' | 'normal' | 'long' })} />
        <ChoiceSetting title="Musique sous la voix" value={jingle.musicLevel} options={[["very-low", "Très discrète"], ["low", "Discrète"], ["present", "Présente"]]} onChange={(value) => updateJingle({ musicLevel: value as 'very-low' | 'low' | 'present' })} />
      </div>
      <p className="jingle-style-description"><strong>{styleNames[jingle.style]} :</strong> {styleDescriptions[jingle.style]}</p>
    </div>
  );
}'''
app = replace_between(app, 'function JingleSettings(', '\n\nfunction AudioLibraryModal', jingle_settings, 'éditeur de jingle')
APP_PATH.write_text(app, encoding='utf-8')


# Moteur audio : plages, réverbération, transitions et profils de jingle.
engine = ENGINE_PATH.read_text(encoding='utf-8')
engine = re.sub(r"function voicePlaybackRate\(effect: VoiceEffect\): number \{.*?\n\}", "function voicePlaybackRate(effect: VoiceEffect): number {\n  return effect === 'deep' ? 0.9 : effect === 'high' ? 1.16 : 1;\n}", engine, count=1, flags=re.DOTALL)
engine = replace_once(engine, "function voiceCueValue(level: 'low' | 'normal' | 'high'): number {\n  return level === 'low' ? 0.24 : level === 'high' ? 0.78 : 0.48;\n}\n", "function voiceCueValue(level: 'low' | 'normal' | 'high'): number {\n  return level === 'low' ? 0.24 : level === 'high' ? 0.78 : 0.48;\n}\n\nfunction transitionVolumeValue(level: VolumeLevel | undefined): number {\n  return level === 'low' ? 0.2 : level === 'high' ? 0.52 : 0.34;\n}\n", 'niveau des transitions')

voice_effect = r'''function makeReverbImpulse(context: RenderContext, duration = 1.8, decay = 2.8): AudioBuffer {
  const frames = Math.max(1, Math.floor(context.sampleRate * duration));
  const impulse = context.createBuffer(2, frames, context.sampleRate);
  let seed = 1729;
  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let index = 0; index < frames; index += 1) {
      seed = (seed * 48271) % 2147483647;
      const noise = (seed / 2147483647) * 2 - 1;
      const envelope = Math.pow(1 - index / frames, decay);
      data[index] = noise * envelope * (channel === 0 ? 0.9 : 0.82);
    }
  }
  return impulse;
}

function connectVoiceEffect(context: RenderContext, source: AudioBufferSourceNode, effect: VoiceEffect, output: AudioNode): AudioNode {
  if (effect === 'phone') {
    const highpass = context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 450;
    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 3200;
    source.connect(highpass).connect(lowpass).connect(output);
    return output;
  }
  if (effect === 'echo') {
    const dry = context.createGain();
    const delay = context.createDelay(1);
    const feedback = context.createGain();
    const dreamFilter = context.createBiquadFilter();
    dry.gain.value = 0.84;
    delay.delayTime.value = 0.22;
    feedback.gain.value = 0.24;
    dreamFilter.type = 'lowpass';
    dreamFilter.frequency.value = 2800;
    source.connect(dry).connect(output);
    source.connect(delay).connect(feedback).connect(delay);
    delay.connect(dreamFilter).connect(output);
    return output;
  }
  if (effect === 'distant') {
    const highpass = context.createBiquadFilter();
    const lowpass = context.createBiquadFilter();
    const dry = context.createGain();
    const predelay = context.createDelay(0.3);
    const convolver = context.createConvolver();
    const wet = context.createGain();
    const early = context.createDelay(0.3);
    const earlyGain = context.createGain();
    highpass.type = 'highpass';
    highpass.frequency.value = 170;
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 3300;
    dry.gain.value = 0.32;
    predelay.delayTime.value = 0.045;
    convolver.buffer = makeReverbImpulse(context);
    wet.gain.value = 0.68;
    early.delayTime.value = 0.105;
    earlyGain.gain.value = 0.2;
    source.connect(highpass).connect(lowpass);
    lowpass.connect(dry).connect(output);
    lowpass.connect(predelay).connect(convolver).connect(wet).connect(output);
    lowpass.connect(early).connect(earlyGain).connect(output);
    return output;
  }
  if (effect === 'deep') source.playbackRate.value = 0.9;
  if (effect === 'high') source.playbackRate.value = 1.16;
  source.connect(output);
  return output;
}'''
engine = replace_between(engine, 'function connectVoiceEffect(', '\n\nfunction applyFades', voice_effect, 'effets vocaux')

transition_tone = r'''function transitionTone(context: RenderContext, destination: AudioNode, preset: TransitionPreset, start: number, duration: number, peak = 0.34): void {
  const makeGain = (level = peak) => {
    const gain = context.createGain();
    gain.connect(destination);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(level, start + Math.min(0.06, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    return gain;
  };
  const tone = (frequency: number, endFrequency: number, offset = 0, length = duration, type: OscillatorType = 'triangle', level = peak) => {
    const safeLength = Math.max(0.05, Math.min(length, duration - offset));
    if (safeLength <= 0) return;
    const gain = context.createGain();
    gain.connect(destination);
    gain.gain.setValueAtTime(0.0001, start + offset);
    gain.gain.linearRampToValueAtTime(level, start + offset + Math.min(0.035, safeLength / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + safeLength);
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(30, frequency), start + offset);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), start + offset + safeLength);
    oscillator.connect(gain);
    oscillator.start(start + offset);
    oscillator.stop(start + offset + safeLength);
  };

  if (preset === 'sparkle') {
    [0, 0.13, 0.27].forEach((offset, index) => tone(760 + index * 330, 1120 + index * 390, offset, Math.min(0.65, duration - offset), 'sine', peak * 0.72));
    return;
  }
  if (preset === 'heartbeat') {
    tone(95, 48, 0, Math.min(0.22, duration), 'sine', peak * 1.2);
    tone(82, 42, Math.min(0.28, duration * 0.42), Math.min(0.28, duration * 0.45), 'sine', peak);
    return;
  }
  if (preset === 'question') {
    tone(330, 420, 0, duration * 0.42, 'sine', peak * 0.85);
    tone(470, 690, duration * 0.5, duration * 0.5, 'sine', peak);
    return;
  }
  if (preset === 'failure') {
    [390, 330, 275, 185].forEach((frequency, index) => tone(frequency, frequency * 0.96, index * duration * 0.21, duration * 0.24, 'square', peak * 0.58));
    return;
  }
  if (preset === 'surprise') {
    [360, 620, 980].forEach((frequency, index) => tone(frequency, frequency * 1.12, index * duration * 0.16, duration * 0.36, 'sine', peak * 0.8));
    return;
  }
  if (preset === 'impact' || preset === 'cinematic') {
    tone(preset === 'cinematic' ? 105 : 145, 38, 0, duration, 'sine', peak * 1.35);
    if (preset === 'cinematic') tone(360, 72, 0, duration * 0.68, 'sawtooth', peak * 0.35);
    return;
  }
  if (preset === 'drop') {
    tone(1050, 65, 0, duration, 'sine', peak);
    return;
  }
  if (preset === 'whoosh' || preset === 'page' || preset === 'radio' || preset === 'rewind' || preset === 'portal') {
    const gain = makeGain(preset === 'page' ? peak * 0.75 : peak);
    const frames = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 811;
    for (let index = 0; index < frames; index += 1) {
      seed = (seed * 48271) % 2147483647;
      const progress = index / frames;
      const noise = (seed / 2147483647) * 2 - 1;
      const shape = preset === 'page' ? Math.sin(progress * Math.PI * 8) : preset === 'portal' ? Math.sin(progress * Math.PI * 22) : 1;
      data[index] = noise * shape * (preset === 'rewind' ? progress : 1 - progress);
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = preset === 'radio' || preset === 'portal' ? 'bandpass' : 'lowpass';
    const first = preset === 'rewind' ? 6200 : preset === 'radio' ? 1800 : preset === 'portal' ? 420 : 350;
    const last = preset === 'rewind' ? 420 : preset === 'radio' ? 700 : preset === 'portal' ? 3200 : 6500;
    filter.frequency.setValueAtTime(first, start);
    filter.frequency.exponentialRampToValueAtTime(last, start + duration);
    source.connect(filter).connect(gain);
    source.start(start);
    return;
  }

  const oscillator = context.createOscillator();
  const gain = makeGain();
  oscillator.type = preset === 'bell' ? 'sine' : preset === 'percussion' ? 'square' : 'triangle';
  const startFrequency = preset === 'mystery' ? 190 : preset === 'rise' ? 260 : 520;
  const endFrequency = preset === 'mystery' ? 110 : preset === 'rise' ? 950 : 360;
  oscillator.frequency.setValueAtTime(startFrequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
  oscillator.connect(gain);
  oscillator.start(start);
  oscillator.stop(start + duration);
}'''
engine = replace_between(engine, 'function transitionTone(', '\n\nasync function scheduleVoiceBlock', transition_tone, 'sons de transition')

schedule_voice = engine[engine.find('async function scheduleVoiceBlock('):engine.find('\n\nasync function scheduleJingle')]
old_cue = r'''  for (const cue of block.voiceCues ?? []) {
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
  }'''
new_cue = r'''  for (const cue of block.voiceCues ?? []) {
    const cueAsset = assetById(project, cue.assetId);
    if (!cueAsset) continue;
    const cueAtSource = Math.min(Math.max(0, cue.at), coreSourceDuration);
    const cueAtTimeline = cueAtSource / playbackRate;
    const sourceStart = Math.min(Math.max(0, cue.sourceStart ?? 0), Math.max(0, cueAsset.duration - 0.05));
    const legacyEnd = sourceStart + Math.max(0.05, cue.duration);
    const sourceEnd = Math.min(cueAsset.duration, Math.max(sourceStart + 0.05, cue.sourceEnd ?? legacyEnd));
    const selectedDuration = sourceEnd - sourceStart;
    const cueDuration = Math.min(selectedDuration, Math.max(0, coreTimelineDuration - cueAtTimeline));
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
      sourceStart + consumedCue,
      cueDuration - consumedCue,
      voiceCueValue(cue.level),
      'none',
      'short',
    );
  }'''
if old_cue not in schedule_voice:
    raise RuntimeError('Planification des bruitages synchronisés introuvable.')
engine = engine.replace(old_cue, new_cue, 1)

jingle_engine = r'''type JingleStyle = NonNullable<PodcastBlock['jingle']>['style'];

const JINGLE_STYLE_PROFILES: Record<JingleStyle, {
  voiceStart: number; intro: number; duck: number; outro: number; voice: number;
  opening: number; closing: number; fallback: TransitionPreset; fallbackGain: number; voiceEffect: VoiceEffect;
}> = {
  dynamic: { voiceStart: 0.65, intro: 2.9, duck: 1.05, outro: 2.35, voice: 1.08, opening: 1, closing: 1, fallback: 'impact', fallbackGain: 0.46, voiceEffect: 'none' },
  adventure: { voiceStart: 1.25, intro: 2.6, duck: 0.92, outro: 2.25, voice: 1.02, opening: 0.92, closing: 1.05, fallback: 'cinematic', fallbackGain: 0.44, voiceEffect: 'none' },
  mysterious: { voiceStart: 1.6, intro: 1.65, duck: 0.68, outro: 1.35, voice: 0.94, opening: 0.7, closing: 0.78, fallback: 'mystery', fallbackGain: 0.3, voiceEffect: 'echo' },
  serious: { voiceStart: 1, intro: 1.45, duck: 0.62, outro: 1.25, voice: 1, opening: 0.55, closing: 0.62, fallback: 'percussion', fallbackGain: 0.27, voiceEffect: 'none' },
  historical: { voiceStart: 1.35, intro: 1.85, duck: 0.78, outro: 1.55, voice: 0.96, opening: 0.84, closing: 0.88, fallback: 'bell', fallbackGain: 0.34, voiceEffect: 'distant' },
  'modern-radio': { voiceStart: 0.8, intro: 2.25, duck: 0.88, outro: 2, voice: 1.06, opening: 0.95, closing: 0.98, fallback: 'radio', fallbackGain: 0.4, voiceEffect: 'phone' },
};

async function scheduleJingle(
  context: RenderContext,
  destination: AudioNode,
  block: PodcastBlock,
  project: PodcastProject,
  cache: Map<string, AudioBuffer>,
  start: number,
  localOffset: number,
): Promise<void> {
  const total = getBlockDuration(block);
  const remaining = total - localOffset;
  if (remaining <= 0) return;
  const style = block.jingle?.style ?? 'modern-radio';
  const profile = JINGLE_STYLE_PROFILES[style];
  const music = assetById(project, block.jingle?.musicAssetId);
  const voice = assetById(project, block.jingle?.voiceAssetId);
  const opening = assetById(project, block.jingle?.openingAssetId);
  const closing = assetById(project, block.jingle?.closingAssetId);

  if (music) {
    const level = backgroundValue(block.jingle?.musicLevel ?? 'low');
    const gain = context.createGain();
    gain.connect(destination);
    const voiceStartNow = Math.max(0, profile.voiceStart - localOffset);
    const voiceLength = voice ? Math.min(voice.duration, Math.max(0, total - profile.voiceStart - 0.8)) : 0;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(level * profile.intro, start + Math.min(style === 'mysterious' ? 0.8 : 0.35, remaining / 4));
    if (voiceLength > 0) {
      gain.gain.linearRampToValueAtTime(level * profile.duck, start + voiceStartNow + 0.1);
      gain.gain.setValueAtTime(level * profile.duck, start + voiceStartNow + voiceLength);
      gain.gain.linearRampToValueAtTime(level * profile.outro, Math.min(start + remaining, start + voiceStartNow + voiceLength + 0.25));
    }
    gain.gain.linearRampToValueAtTime(0.0001, start + remaining);
    const buffer = await decodeAsset(context, music, cache);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    source.start(start, localOffset % buffer.duration);
    source.stop(start + remaining + 0.03);
  } else {
    transitionTone(context, destination, profile.fallback, start, remaining, profile.fallbackGain);
  }

  if (opening && localOffset < Math.min(opening.duration, 1.5)) {
    await scheduleAsset(context, destination, opening, cache, start, localOffset, Math.min(opening.duration - localOffset, remaining), profile.opening, 'short', 'short');
  }
  if (voice) {
    const consumed = Math.max(0, localOffset - profile.voiceStart);
    const delay = Math.max(0, profile.voiceStart - localOffset);
    const voiceDuration = Math.min(voice.duration - consumed, total - profile.voiceStart - 0.8);
    if (voiceDuration > 0) {
      await scheduleAsset(context, destination, voice, cache, start + delay, consumed, voiceDuration, profile.voice, 'short', 'short', profile.voiceEffect);
    }
  }
  if (closing) {
    const closingStart = Math.max(0, total - Math.min(1.5, closing.duration));
    if (localOffset < total) {
      const delay = Math.max(0, closingStart - localOffset);
      const consumed = Math.max(0, localOffset - closingStart);
      const duration = Math.min(closing.duration - consumed, remaining - delay);
      if (duration > 0) await scheduleAsset(context, destination, closing, cache, start + delay, consumed, duration, profile.closing, 'short', 'short');
    }
  }
}'''
engine = replace_between(engine, 'async function scheduleJingle(', '\n\nasync function scheduleBlock', jingle_engine, 'profils de jingle')
engine = replace_once(engine, "    transitionTone(context, destination, block.transitionPreset ?? 'fade', start, total - localOffset);", "    transitionTone(context, destination, block.transitionPreset ?? 'fade', start, total - localOffset, transitionVolumeValue(block.transitionVolume));", 'volume à la lecture des transitions')
ENGINE_PATH.write_text(engine, encoding='utf-8')


# Styles complémentaires, identifiés par un marqueur pour rester idempotents.
styles = STYLES_PATH.read_text(encoding='utf-8')
style_marker = '/* Extension durable : plages, jingles et transitions */'
if style_marker not in styles:
    styles += r'''

/* Extension durable : plages, jingles et transitions */
.transition-controls { display: grid; grid-template-columns: minmax(0, 1fr) minmax(210px, .55fr); gap: 14px; align-items: end; }
.transition-controls .choice-setting { padding: 11px; }
.transition-controls .choice-buttons { grid-template-columns: repeat(3, 1fr); }
.jingle-selected { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 8px; padding: 8px 10px; border-radius: 9px; background: #e8f5ef; }
.jingle-selected small { min-width: 0; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jingle-style-description { margin: 0; padding: 11px 13px; border-radius: 10px; background: #edf3ff; color: #334b79; font-size: .83rem; line-height: 1.45; }
.cue-source-range { display: grid; grid-template-columns: 1fr 1fr; gap: 7px 10px; }
.cue-source-range > strong { grid-column: 1 / -1; color: #4c5870; font-size: .76rem; }
.cue-source-range input { width: 100%; accent-color: var(--sfx); }
@media (max-width: 900px) {
  .cue-row { grid-template-columns: 58px minmax(0,1fr) 105px 36px; }
  .cue-source-range { grid-column: 2 / 4; }
}
@media (max-width: 650px) {
  .transition-controls { grid-template-columns: 1fr; }
  .cue-source-range { grid-template-columns: 1fr; }
  .cue-source-range > strong { grid-column: 1; }
}
'''
STYLES_PATH.write_text(styles, encoding='utf-8')


# Page de crédits générée depuis la bibliothèque finale.
rows = []
for item in items:
    rows.append(
        '<tr>'
        f'<td>{html.escape(item["title"])}</td>'
        f'<td>{"Musique" if item["kind"] == "music" else "Bruitage"}</td>'
        f'<td>{html.escape(item["author"])}</td>'
        f'<td><a href="{html.escape(item["licenseUrl"], quote=True)}">{html.escape(item["license"])}</a></td>'
        f'<td><a href="{html.escape(item["sourcePage"], quote=True)}">Source</a></td>'
        '</tr>'
    )
credits = '''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Crédits audio — Podcast Facile</title><style>body{font:16px system-ui;margin:0;background:#f7f9fc;color:#17243b}main{max-width:1100px;margin:auto;padding:32px 18px}h1{margin-bottom:8px}p{line-height:1.5}table{width:100%;border-collapse:collapse;background:white;border-radius:14px;overflow:hidden}th,td{text-align:left;padding:10px;border-bottom:1px solid #e5e9f1;font-size:14px}th{background:#edf3ff}a{color:#2457d6}@media(max-width:700px){table,tbody,tr,td{display:block}thead{display:none}tr{padding:10px;border-bottom:1px solid #ddd}td{border:0;padding:4px 8px}}</style></head><body><main><h1>Crédits audio — Podcast Facile</h1><p>Les musiques et bruitages proviennent de sources libres ou sous licence. Chaque fichier reste associé à son auteur, à sa page source et à sa licence.</p><table><thead><tr><th>Titre dans l’application</th><th>Type</th><th>Auteur</th><th>Licence</th><th>Fichier</th></tr></thead><tbody>''' + ''.join(rows) + '</tbody></table></main></body></html>'
CREDITS_PATH.write_text(credits, encoding='utf-8')

print(f'Extension éditeur appliquée : {len(music)} musiques, {len(sfx)} bruitages.')
