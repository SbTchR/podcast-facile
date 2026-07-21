from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
LIB_PATH = ROOT / 'src' / 'data' / 'audioLibrary.ts'
APP_PATH = ROOT / 'src' / 'App.tsx'
STYLES_PATH = ROOT / 'src' / 'styles.css'

PIXABAY_LICENSE = 'https://pixabay.com/service/license-summary/'
PD_LICENSE = 'https://creativecommons.org/publicdomain/mark/1.0/'


def external_recording(
    *, id: str, title: str, category: str, icon: str, duration: float,
    description: str, tags: list[str], audio_url: str, source_page: str,
    author: str, clip_duration: float | None = None,
) -> dict:
    item = {
        'id': id,
        'kind': 'sfx',
        'title': title,
        'category': category,
        'icon': icon,
        'duration': duration,
        'description': description,
        'tags': tags,
        'filename': audio_url.split('filename=')[-1],
        'audioUrl': audio_url,
        'fallbackUrl': audio_url,
        'sourcePage': source_page,
        'author': author,
        'license': 'Pixabay Content License',
        'licenseUrl': PIXABAY_LICENSE,
        'attribution': f'{title} — {author} — Pixabay Content License.',
        'origin': 'recording',
    }
    if clip_duration is not None:
        item['clipDuration'] = clip_duration
    return item


def commons_recording(
    *, id: str, title: str, icon: str, duration: float, description: str,
    tags: list[str], filename: str, author: str, attribution: str,
    clip_duration: float | None = None,
) -> dict:
    normalized = filename.replace(' ', '_')
    digest = hashlib.md5(normalized.encode('utf-8')).hexdigest()
    encoded = quote(normalized, safe="_(),.-")
    original = f'https://upload.wikimedia.org/wikipedia/commons/{digest[0]}/{digest[:2]}/{encoded}'
    transcode = f'https://upload.wikimedia.org/wikipedia/commons/transcoded/{digest[0]}/{digest[:2]}/{encoded}/{encoded}.mp3'
    item = {
        'id': id,
        'kind': 'sfx',
        'title': title,
        'category': 'Vie quotidienne & objets',
        'icon': icon,
        'duration': duration,
        'description': description,
        'tags': tags,
        'filename': filename,
        'audioUrl': transcode,
        'fallbackUrl': original,
        'sourcePage': f'https://commons.wikimedia.org/wiki/File:{encoded}',
        'author': author,
        'license': 'Domaine public',
        'licenseUrl': PD_LICENSE,
        'attribution': attribution,
        'origin': 'recording',
    }
    if clip_duration is not None:
        item['clipDuration'] = clip_duration
    return item


EXTERNAL_SFX = [
    external_recording(
        id='sfx-sword-fight-real',
        title='Combat d’épées enregistré',
        category='Histoire & action',
        icon='⚔️',
        duration=78,
        description='Longue succession de chocs, frottements et mouvements d’épées. Il s’agit d’un effet de bruitage enregistré, pas d’un son synthétisé.',
        tags=['épées', 'combat', 'métal', 'médiéval'],
        audio_url='https://cdn.pixabay.com/download/audio/2021/08/04/audio_357038f64c.mp3?filename=sword-against-sword-6341.mp3',
        source_page='https://pixabay.com/sound-effects/film-special-effects-sword-against-sword-6341/',
        author='Fenodyrie / Freesound community',
        clip_duration=12,
    ),
    external_recording(
        id='sfx-sword-unsheathe-real',
        title='Épée dégainée',
        category='Histoire & action',
        icon='🗡️',
        duration=3,
        description='Lame métallique retirée rapidement de son fourreau.',
        tags=['épée', 'lame', 'fourreau', 'dégainer'],
        audio_url='https://cdn.pixabay.com/download/audio/2021/08/04/audio_d08b83b6d7.mp3?filename=unsheath_sword-6113.mp3',
        source_page='https://pixabay.com/sound-effects/film-special-effects-unsheath-sword-6113/',
        author='Freesound community',
    ),
    external_recording(
        id='sfx-sword-hit-real',
        title='Coup d’épée isolé',
        category='Histoire & action',
        icon='🛡️',
        duration=2,
        description='Impact métallique bref d’une épée, utile pour ponctuer un combat.',
        tags=['épée', 'impact', 'combat', 'métal'],
        audio_url='https://cdn.pixabay.com/download/audio/2021/08/09/audio_4dd68e8e36.mp3?filename=sword-hit-7160.mp3',
        source_page='https://pixabay.com/sound-effects/film-special-effects-sword-hit-7160/',
        author='Freesound community',
    ),
    external_recording(
        id='sfx-male-scream-fear',
        title='Cri masculin de peur',
        category='Voix & personnes',
        icon='😱',
        duration=1.5,
        description='Cri masculin très bref exprimant la peur ou la douleur.',
        tags=['cri', 'homme', 'peur', 'douleur'],
        audio_url='https://cdn.pixabay.com/download/audio/2022/10/16/audio_d7410dcb38.mp3?filename=male-scream-in-fear-123079.mp3',
        source_page='https://pixabay.com/sound-effects/people-male-scream-in-fear-123079/',
        author='Universfield',
    ),
    commons_recording(
        id='sfx-cutting-beet-greens',
        title='Couteau découpant des feuilles de betterave',
        icon='🔪',
        duration=12,
        description='Découpe réelle de feuilles de betterave sur un plan de travail.',
        tags=['couteau', 'découpe', 'légumes', 'cuisine'],
        filename='Cutting beet greens.ogg',
        author='hugh / PDSounds.org',
        attribution='Cutting beet greens — hugh / PDSounds.org — domaine public.',
        clip_duration=10,
    ),
]

SFX_CATEGORIES = [
    'Histoire & action',
    'Lieux & ambiances',
    'Nature & animaux',
    'Transports & machines',
    'Vie quotidienne & objets',
    'Voix & personnes',
]
MUSIC_CATEGORIES = [
    'Époques historiques',
    'Épique & action',
    'Mystère & tension',
    'Lieux & voyages',
    'Calme & émotion',
]


def item_text(item: dict) -> str:
    return ' '.join([
        str(item.get('category', '')),
        str(item.get('title', '')),
        str(item.get('description', '')),
        ' '.join(str(tag) for tag in item.get('tags', [])),
    ]).lower()


def classify_sfx(item: dict) -> str:
    text = item_text(item)
    if any(word in text for word in (
        'bataille', 'combat', 'épée', 'sword', 'médiéval', 'moyen âge', 'armée',
        'militaire', 'guerre', 'forge', 'clairon', 'canon', 'explosion', 'armure',
    )):
        return 'Histoire & action'
    if any(word in text for word in (
        'cheval', 'chien', 'chat', 'vache', 'cochon', 'mouton', 'canard', 'coq', 'hibou',
        'grenouille', 'loup', 'bourdon', 'oiseau', 'animal', 'forêt', 'jungle', 'pluie',
        'orage', 'vent', 'ruisseau', 'rivière', 'vague', 'feu de camp', 'nature',
    )):
        return 'Nature & animaux'
    if any(word in text for word in (
        'train', 'locomotive', 'métro', 'gare', 'avion', 'hélicoptère', 'voiture', 'moto',
        'scooter', 'vélo', 'bateau', 'navire', 'port', 'moteur', 'machine', 'industrie',
        'compresseur', 'perceuse', 'tronçonneuse', 'vapeur', 'circulation', 'aéroport',
    )):
        return 'Transports & machines'
    if any(word in text for word in (
        'rire', 'pleur', 'cri', 'toux', 'éternu', 'ronfl', 'respiration', 'sifflement humain',
        'applaud', 'conversation', 'voix', 'bébé', 'personne', 'public',
    )):
        return 'Voix & personnes'
    if any(word in text for word in (
        'restaurant', 'marché', 'rue', 'ville', 'centre commercial', 'cour d’école', 'salle',
        'café', 'église', 'tunnel', 'ambiance', 'terrain de jeu', 'hall', 'foule',
    )):
        return 'Lieux & ambiances'
    return 'Vie quotidienne & objets'


def classify_music(item: dict) -> str:
    text = item_text(item)
    if any(word in text for word in (
        'médiéval', 'moyen âge', 'renaissance', 'baroque', 'xii', 'xiii', 'xve', 'xvi',
        'xvii', 'hildegarde', 'monteverdi', 'janequin', 'binchois', 'antiquité', 'égypte',
    )):
        return 'Époques historiques'
    if any(word in text for word in ('épique', 'combat', 'bataille', 'action', 'aventure', 'conquête', 'héros')):
        return 'Épique & action'
    if any(word in text for word in ('mystère', 'suspense', 'tension', 'menace', 'sombre', 'inquiét', 'danger')):
        return 'Mystère & tension'
    if any(word in text for word in ('forêt', 'mer', 'port', 'fleuve', 'eau', 'voyage', 'exploration', 'désert', 'île', 'monde', 'paysage')):
        return 'Lieux & voyages'
    return 'Calme & émotion'


library = LIB_PATH.read_text(encoding='utf-8')
marker = 'export const AUDIO_LIBRARY: LibraryPreset[] = '
array_start = library.index('[', library.index(marker) + len(marker))
array_end = library.index('] as LibraryPreset[];', array_start) + 1
items: list[dict] = json.loads(library[array_start:array_end])
existing = {item['id'] for item in items}
for item in EXTERNAL_SFX:
    if item['id'] not in existing:
        items.append(item)
        existing.add(item['id'])

for item in items:
    item['category'] = classify_music(item) if item.get('kind') == 'music' else classify_sfx(item)

music_rank = {name: index for index, name in enumerate(MUSIC_CATEGORIES)}
sfx_rank = {name: index for index, name in enumerate(SFX_CATEGORIES)}
music = sorted([item for item in items if item.get('kind') == 'music'], key=lambda item: (music_rank[item['category']], item['title']))
sfx = sorted([item for item in items if item.get('kind') == 'sfx'], key=lambda item: (sfx_rank[item['category']], item['title']))
items = music + sfx
library = library[:array_start] + json.dumps(items, ensure_ascii=False, indent=2) + library[array_end:]
library = re.sub(
    r"export const LIBRARY_CATEGORIES: Record<LibraryKind, string\[]> = \{.*?\n\};",
    "export const LIBRARY_CATEGORIES: Record<LibraryKind, string[]> = {\n"
    "  music: ['Époques historiques', 'Épique & action', 'Mystère & tension', 'Lieux & voyages', 'Calme & émotion'],\n"
    "  sfx: ['Histoire & action', 'Lieux & ambiances', 'Nature & animaux', 'Transports & machines', 'Vie quotidienne & objets', 'Voix & personnes'],\n"
    "};",
    library,
    count=1,
    flags=re.DOTALL,
)
LIB_PATH.write_text(library, encoding='utf-8')

app = APP_PATH.read_text(encoding='utf-8')
app = app.replace(
    "<small>{AUDIO_LIBRARY.filter((item) => item.kind === kind).length} enregistrements libres</small>",
    "<small>{AUDIO_LIBRARY.filter((item) => item.kind === kind).length} sons disponibles</small>",
)
app = app.replace(
    "placeholder={kind === 'music' ? 'Rechercher : médiéval, ville, mystère…' : 'Rechercher : canon, pluie, bateau…'}",
    "placeholder={kind === 'music' ? 'Rechercher : médiéval, épique, calme, forêt…' : 'Rechercher : cheval, bataille, pluie, gare…'}",
)
app, info_count = re.subn(
    r'\s*<div className="library-info">.*?</div>',
    '',
    app,
    count=1,
    flags=re.DOTALL,
)
if info_count != 1:
    raise RuntimeError('Encadré de sources de la bibliothèque introuvable.')
app, credit_count = re.subn(
    r'<div className="library-credit">.*?</div>',
    '<a className="library-source-link" href={preset.sourcePage} target="_blank" rel="noreferrer" title={`${preset.author} · ${preset.license}`}>ⓘ Source</a>',
    app,
    count=1,
    flags=re.DOTALL,
)
if credit_count != 1:
    raise RuntimeError('Crédits détaillés des cartes introuvables.')
footer_anchor = '{error && <div className="error-box library-error">{error}</div>}'
footer = '''<div className="library-footer-note"><a href="./audio-credits.html" target="_blank" rel="noreferrer">Sources et licences de tous les sons</a><span>Les fichiers sont téléchargés au premier ajout puis conservés dans le projet.</span></div>\n        ''' + footer_anchor
if footer_anchor not in app:
    raise RuntimeError('Point d’insertion de la note de crédits introuvable.')
app = app.replace(footer_anchor, footer, 1)
APP_PATH.write_text(app, encoding='utf-8')

styles = STYLES_PATH.read_text(encoding='utf-8')
styles += '''

.library-source-link {
  display: inline-flex;
  width: fit-content;
  margin-top: .3rem;
  color: #667085;
  font-size: .74rem;
  text-decoration: none;
  opacity: .7;
}
.library-source-link:hover { opacity: 1; text-decoration: underline; }
.library-footer-note {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: .3rem .75rem;
  padding: 8px 18px 16px;
  text-align: center;
  color: #667085;
  font-size: .78rem;
  line-height: 1.4;
}
.library-footer-note a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
'''
STYLES_PATH.write_text(styles, encoding='utf-8')

music_categories = sorted({item['category'] for item in music})
sfx_categories = sorted({item['category'] for item in sfx})
if set(music_categories) != set(MUSIC_CATEGORIES):
    raise RuntimeError(f'Catégories musicales inattendues : {music_categories}')
if set(sfx_categories) != set(SFX_CATEGORIES):
    raise RuntimeError(f'Catégories de bruitages inattendues : {sfx_categories}')
combined = LIB_PATH.read_text(encoding='utf-8') + APP_PATH.read_text(encoding='utf-8')
for required in ('sfx-sword-fight-real', 'sfx-sword-unsheathe-real', 'sfx-sword-hit-real', 'sfx-male-scream-fear', 'sfx-cutting-beet-greens', 'library-footer-note', 'library-source-link'):
    if required not in combined:
        raise RuntimeError(f'Élément attendu absent : {required}')
if 'library-info' in APP_PATH.read_text(encoding='utf-8') or 'library-credit' in APP_PATH.read_text(encoding='utf-8'):
    raise RuntimeError('L’ancien affichage encombrant des sources subsiste.')

print(f'Bibliothèques simplifiées : {len(sfx)} bruitages dans {len(sfx_categories)} catégories et {len(music)} musiques dans {len(music_categories)} catégories.')
