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


def commons_urls(filename: str) -> tuple[str, str, str]:
    normalized = filename.replace(' ', '_')
    digest = hashlib.md5(normalized.encode('utf-8')).hexdigest()
    encoded = quote(normalized, safe="_(),.-")
    original = f'https://upload.wikimedia.org/wikipedia/commons/{digest[0]}/{digest[:2]}/{encoded}'
    transcode = f'https://upload.wikimedia.org/wikipedia/commons/transcoded/{digest[0]}/{digest[:2]}/{encoded}/{encoded}.mp3'
    page = f'https://commons.wikimedia.org/wiki/File:{encoded}'
    return transcode, original, page


def text_for(item: dict) -> str:
    return ' '.join([
        str(item.get('title', '')),
        str(item.get('description', '')),
        str(item.get('category', '')),
        ' '.join(str(tag) for tag in item.get('tags', [])),
    ]).lower()


def general_sfx_category(item: dict) -> str:
    text = text_for(item)
    if any(word in text for word in (
        'voix', 'personne', 'rire', 'pleur', 'cri', 'toux', 'éternu', 'respiration',
        'ronflement', 'applaud', 'public', 'bébé', 'sifflement humain', 'conversation',
    )):
        return 'Voix & personnes'
    if any(word in text for word in (
        'animal', 'chien', 'chat', 'cheval', 'vache', 'cochon', 'mouton', 'canard',
        'coq', 'hibou', 'grenouille', 'loup', 'oiseau', 'bourdon', 'insecte', 'forêt',
        'jungle', 'pluie', 'orage', 'vent', 'ruisseau', 'mer', 'vague', 'feu de camp',
    )):
        return 'Nature & animaux'
    if any(word in text for word in (
        'train', 'gare', 'métro', 'locomotive', 'voiture', 'moteur', 'avion', 'hélicoptère',
        'bateau', 'navire', 'port', 'scooter', 'moto', 'bus', 'trafic', 'circulation',
        'machine', 'industrie', 'compresseur', 'perceuse', 'tronçonneuse', 'vapeur',
    )):
        return 'Transports & machines'
    if any(word in text for word in (
        'histoire', 'bataille', 'combat', 'épée', 'armure', 'canon', 'explosion', 'forge',
        'militaire', 'clairon', 'marteau', 'acier', 'médiéval', 'pirate', 'douleur',
    )):
        return 'Histoire & action'
    if any(word in text for word in (
        'ambiance', 'marché', 'restaurant', 'café', 'salle', 'rue', 'ville', 'aéroport',
        'église', 'centre commercial', 'cour', 'terrain de jeu', 'tunnel', 'foule', 'port',
    )):
        return 'Lieux & ambiances'
    return 'Vie quotidienne & objets'


def general_music_category(item: dict) -> str:
    text = text_for(item)
    if any(word in text for word in (
        'moyen âge', 'médiéval', 'renaissance', 'baroque', 'xii', 'xiii', 'xve', 'xvi',
        'xvii', 'antiquité', 'égypte', 'hildegarde', 'monteverdi', 'janequin', 'binchois',
    )):
        return 'Époques historiques'
    if any(word in text for word in ('épique', 'combat', 'bataille', 'action', 'aventure', 'conquête', 'héros')):
        return 'Épique & action'
    if any(word in text for word in ('mystère', 'mystérieux', 'suspense', 'tension', 'menace', 'sombre', 'catastrophe')):
        return 'Mystère & tension'
    if any(word in text for word in ('forêt', 'mer', 'port', 'fleuve', 'voyage', 'exploration', 'désert', 'île', 'paysage', 'ville')):
        return 'Lieux & voyages'
    return 'Calme & émotion'


library = LIB_PATH.read_text(encoding='utf-8')
marker = 'export const AUDIO_LIBRARY: LibraryPreset[] = '
array_start = library.index('[', library.index(marker) + len(marker))
array_end = library.index('] as LibraryPreset[];', array_start) + 1
items: list[dict] = json.loads(library[array_start:array_end])

# Enregistrement réel supplémentaire, plus fidèle qu’un effet générique de couteau.
if not any(item.get('id') == 'sfx-cutting-beet-greens' for item in items):
    audio_url, fallback_url, source_page = commons_urls('Cutting beet greens.ogg')
    items.append({
        'id': 'sfx-cutting-beet-greens',
        'kind': 'sfx',
        'title': 'Couteau découpant des feuilles de betterave',
        'category': 'Vie quotidienne & objets',
        'icon': '🔪',
        'duration': 12,
        'description': 'Découpe réelle de feuilles de betterave sur un plan de travail.',
        'tags': ['couteau', 'découpe', 'légumes', 'cuisine'],
        'filename': 'Cutting beet greens.ogg',
        'audioUrl': audio_url,
        'fallbackUrl': fallback_url,
        'sourcePage': source_page,
        'author': 'hugh / PDSounds.org',
        'license': 'Domaine public',
        'licenseUrl': 'https://creativecommons.org/publicdomain/mark/1.0/',
        'attribution': 'Cutting beet greens — hugh / PDSounds.org — domaine public.',
        'origin': 'recording',
        'clipDuration': 10,
    })

for item in items:
    item['category'] = general_music_category(item) if item.get('kind') == 'music' else general_sfx_category(item)

music_order = ['Époques historiques', 'Épique & action', 'Mystère & tension', 'Lieux & voyages', 'Calme & émotion']
sfx_order = ['Histoire & action', 'Lieux & ambiances', 'Nature & animaux', 'Transports & machines', 'Vie quotidienne & objets', 'Voix & personnes']
order = {'music': {name: index for index, name in enumerate(music_order)}, 'sfx': {name: index for index, name in enumerate(sfx_order)}}
items.sort(key=lambda item: (0 if item.get('kind') == 'music' else 1, order[item['kind']].get(item['category'], 99), item.get('title', '')))
library = library[:array_start] + json.dumps(items, ensure_ascii=False, indent=2) + library[array_end:]

# Remplace les catégories dérivées par un ordre stable et très court.
library = re.sub(
    r"export const LIBRARY_CATEGORIES: Record<LibraryKind, string\[]> = \{.*?\n\};",
    "export const LIBRARY_CATEGORIES: Record<LibraryKind, string[]> = {\n"
    "  music: ['Époques historiques', 'Épique & action', 'Mystère & tension', 'Lieux & voyages', 'Calme & émotion'],\n"
    "  sfx: ['Histoire & action', 'Lieux & ambiances', 'Nature & animaux', 'Transports & machines', 'Vie quotidienne & objets', 'Voix & personnes'],\n"
    "};",
    library,
    count=1,
    flags=re.S,
)
LIB_PATH.write_text(library, encoding='utf-8')

app = APP_PATH.read_text(encoding='utf-8')
# Supprime le grand encadré vert d’information, quelle que soit sa formulation exacte.
app, removed_info = re.subn(
    r'\s*<div className="library-info">.*?</div>',
    '',
    app,
    count=1,
    flags=re.S,
)
if removed_info != 1:
    raise RuntimeError('Encadré d’information de la bibliothèque introuvable.')

# Remplace les crédits détaillés de chaque carte par un lien discret.
app, replaced_credit = re.subn(
    r'<div className="library-credit">.*?</div>',
    '<a className="library-source-link" href={preset.sourcePage} target="_blank" rel="noreferrer" title={`${preset.author} · ${preset.license}`}>ⓘ Source</a>',
    app,
    count=1,
    flags=re.S,
)
if replaced_credit != 1:
    raise RuntimeError('Crédits détaillés des cartes introuvables.')

footer_anchor = '        {error && <div className="error-box library-error">{error}</div>}'
footer_replacement = '''        <div className="library-footer-note">
          <a href="./audio-credits.html" target="_blank" rel="noreferrer">Sources et licences de tous les sons</a>
          <span>Les fichiers sont téléchargés au premier ajout puis conservés dans le projet.</span>
        </div>
        {error && <div className="error-box library-error">{error}</div>}'''
if footer_anchor not in app:
    raise RuntimeError('Point d’insertion du lien global de crédits introuvable.')
app = app.replace(footer_anchor, footer_replacement, 1)
APP_PATH.write_text(app, encoding='utf-8')

styles = STYLES_PATH.read_text(encoding='utf-8')
styles += '''

/* Bibliothèques simplifiées pour les élèves */
.library-source-link {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  margin-top: .35rem;
  font-size: .75rem;
  color: var(--muted, #667085);
  text-decoration: none;
  opacity: .72;
}
.library-source-link:hover { opacity: 1; text-decoration: underline; }
.library-footer-note {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: .35rem .75rem;
  padding: .75rem 1rem 1rem;
  font-size: .78rem;
  color: var(--muted, #667085);
  text-align: center;
}
.library-footer-note a { color: inherit; }
'''
STYLES_PATH.write_text(styles, encoding='utf-8')

sfx_categories = sorted({item['category'] for item in items if item.get('kind') == 'sfx'})
music_categories = sorted({item['category'] for item in items if item.get('kind') == 'music'})
if set(sfx_categories) != set(sfx_order):
    raise RuntimeError(f'Catégories de bruitages inattendues : {sfx_categories}')
if set(music_categories) != set(music_order):
    raise RuntimeError(f'Catégories musicales inattendues : {music_categories}')
if 'library-info' in app or 'library-credit' in app:
    raise RuntimeError('L’ancien affichage encombrant des sources subsiste.')
if 'sfx-cutting-beet-greens' not in library:
    raise RuntimeError('Le nouvel enregistrement de découpe est absent.')

print(f'Bibliothèques simplifiées : {len(sfx_categories)} catégories de bruitages, {len(music_categories)} catégories musicales, {len(items)} éléments au total.')
