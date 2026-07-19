from __future__ import annotations

import hashlib
import html
import json
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
LIB_PATH = ROOT / 'src' / 'data' / 'audioLibrary.ts'
APP_PATH = ROOT / 'src' / 'App.tsx'
CREDITS_PATH = ROOT / 'public' / 'audio-credits.html'


def replace_required(source: str, before: str, after: str, label: str) -> str:
    if before not in source:
        raise RuntimeError(f'Correctif introuvable : {label}')
    return source.replace(before, after, 1)


def commons_urls(filename: str) -> tuple[str, str, str]:
    normalized = filename.replace(' ', '_')
    digest = hashlib.md5(normalized.encode('utf-8')).hexdigest()
    encoded = quote(normalized, safe="_(),.-")
    original = f'https://upload.wikimedia.org/wikipedia/commons/{digest[0]}/{digest[:2]}/{encoded}'
    transcode = f'https://upload.wikimedia.org/wikipedia/commons/transcoded/{digest[0]}/{digest[:2]}/{encoded}/{encoded}.mp3'
    page = f'https://commons.wikimedia.org/wiki/File:{encoded}'
    return transcode, original, page


def recording(
    *,
    id: str,
    title: str,
    category: str,
    icon: str,
    duration: float,
    description: str,
    tags: list[str],
    filename: str,
    author: str,
    license: str,
    license_url: str,
    attribution: str,
    clip_duration: float | None = None,
    clip_start: float | None = None,
) -> dict:
    audio_url, fallback_url, source_page = commons_urls(filename)
    item = {
        'id': id,
        'kind': 'sfx',
        'title': title,
        'category': category,
        'icon': icon,
        'duration': duration,
        'description': description,
        'tags': tags,
        'filename': filename,
        'audioUrl': audio_url,
        'fallbackUrl': fallback_url,
        'sourcePage': source_page,
        'author': author,
        'license': license,
        'licenseUrl': license_url,
        'attribution': attribution,
        'origin': 'recording',
    }
    if clip_start is not None:
        item['clipStart'] = clip_start
    if clip_duration is not None:
        item['clipDuration'] = clip_duration
    return item


def generated(
    *, id: str, effect: str, title: str, category: str, icon: str,
    duration: float, description: str, tags: list[str]
) -> dict:
    return {
        'id': id,
        'kind': 'sfx',
        'title': title,
        'category': category,
        'icon': icon,
        'duration': duration,
        'description': description,
        'tags': tags,
        'filename': f'{effect}.wav',
        'audioUrl': f'generated:{effect}',
        'fallbackUrl': f'generated:{effect}',
        'sourcePage': '',
        'author': 'Podcast Facile',
        'license': 'Créé dans l’application',
        'licenseUrl': '',
        'attribution': 'Effet sonore synthétisé localement par Podcast Facile.',
        'origin': 'generated',
    }


library = LIB_PATH.read_text(encoding='utf-8')
library = replace_required(
    library,
    '  attribution: string;\n}',
    "  attribution: string;\n  clipStart?: number;\n  clipDuration?: number;\n  origin?: 'recording' | 'generated';\n}",
    'métadonnées des extraits et origine',
)

marker = 'export const AUDIO_LIBRARY: LibraryPreset[] = '
array_start = library.index('[', library.index(marker))
array_end = library.index('] as LibraryPreset[];', array_start) + 1
items: list[dict] = json.loads(library[array_start:array_end])
by_id = {item['id']: item for item in items}

corrections = {
    'sfx-explosion': {
        'title': 'Explosion courte',
        'description': 'Détonation réelle et brève pour une explosion, une bataille ou une destruction.',
        'tags': ['explosion', 'détonation', 'bataille', 'destruction'],
        'clipDuration': 1.6,
    },
    'sfx-metal': {
        'title': 'Métal jeté au sol',
        'category': 'Objets · Impacts',
        'icon': '🔩',
        'description': 'Plusieurs morceaux d’aluminium tombent et s’entrechoquent sur l’asphalte. À utiliser pour une chute de métal ou un atelier, pas comme duel d’épées.',
        'tags': ['métal', 'chute', 'impact', 'atelier'],
        'clipDuration': 4,
    },
    'sfx-airport': {
        'title': 'Annonce dans un aéroport',
        'category': 'Lieux · Transports',
        'description': 'Annonce publique enregistrée dans un aéroport.',
        'tags': ['annonce', 'aéroport', 'voyage', 'terminal'],
        'clipDuration': 12,
    },
    'sfx-earthquake': {
        'title': 'Grondement et vibrations',
        'description': 'Long grondement avec vibrations, utile pour évoquer un séisme ou l’effondrement d’un bâtiment.',
        'tags': ['grondement', 'vibrations', 'séisme', 'catastrophe'],
        'clipDuration': 10,
    },
    'sfx-breeze': {
        'title': 'Brise, oiseaux et oies',
        'description': 'Brise de campagne avec chants d’oiseaux et cris d’oies.',
        'tags': ['vent', 'oiseaux', 'oies', 'campagne'],
        'clipDuration': 12,
    },
    'sfx-fire': {
        'title': 'Herbes sèches et bois au feu',
        'description': 'Crépitement d’herbes sèches et de bois dans un foyer ouvert.',
        'tags': ['feu', 'crépitement', 'bois', 'foyer'],
        'clipDuration': 10,
    },
    'sfx-old-door': {
        'title': 'Vieille porte qui se ferme',
        'description': 'Fermeture d’une ancienne porte en bois.',
        'clipDuration': 5.5,
    },
    'sfx-door-handle': {
        'title': 'Poignée de porte grinçante',
        'description': 'Grincement d’une poignée et de son mécanisme.',
        'clipDuration': 5.1,
    },
    'sfx-coins': {
        'title': 'Sac de pièces manipulé',
        'description': 'Un sac et plusieurs pièces de monnaie sont manipulés.',
        'clipDuration': 6,
    },
}
for item_id, values in corrections.items():
    if item_id not in by_id:
        raise RuntimeError(f'Bruitage existant introuvable : {item_id}')
    by_id[item_id].update(values)

clip_durations = {
    'sfx-church-bells': 12,
    'sfx-book-pages': 8,
    'sfx-clock': 8,
    'sfx-keyboard': 8,
    'sfx-bus': 15,
    'sfx-boat-wharf': 12,
    'sfx-boat-landing': 12,
    'sfx-birds': 12,
    'sfx-country-night': 12,
    'sfx-flowing-water': 10,
    'sfx-mall': 15,
    'sfx-playground': 12,
    'sfx-drill': 8,
    'sfx-applause': 8,
}
for item_id, clip_duration in clip_durations.items():
    if item_id in by_id:
        by_id[item_id]['clipDuration'] = clip_duration

for item in items:
    if item.get('kind') == 'sfx':
        item.setdefault('origin', 'recording')

CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/'
PD = 'https://creativecommons.org/publicdomain/mark/1.0/'
BY4 = 'https://creativecommons.org/licenses/by/4.0/'
BYSA3 = 'https://creativecommons.org/licenses/by-sa/3.0/'
BYSA4 = 'https://creativecommons.org/licenses/by-sa/4.0/'

new_items = [
    recording(id='sfx-car-horn', title='Klaxon de voiture', category='Véhicules', icon='🚗', duration=3.5,
              description='Klaxon bref d’une voiture.', tags=['voiture', 'klaxon', 'route', 'circulation'],
              filename='Car Horn.wav', author='15HPanska_Ruttner_Jan', license='CC0', license_url=CC0,
              attribution='Car Horn — 15HPanska_Ruttner_Jan — CC0.'),
    recording(id='sfx-train-horn', title='Klaxon de train', category='Véhicules', icon='🚆', duration=5,
              description='Avertisseur réel d’un train.', tags=['train', 'klaxon', 'gare', 'rail'],
              filename='WWS Signalhorntrainhorn.ogg', author='Konrad Gutkowski / Work With Sounds', license='CC BY 4.0', license_url=BY4,
              attribution='WWS Signalhorntrainhorn — Konrad Gutkowski / Work With Sounds — CC BY 4.0.'),
    recording(id='sfx-bicycle-bell', title='Sonnette de vélo', category='Véhicules', icon='🚲', duration=1.3,
              description='Sonnette tournante de vélo pour signaler un passage.', tags=['vélo', 'sonnette', 'rue', 'cycliste'],
              filename='Rotating-bicycle-bell.wav', author='AntumDeluge', license='CC0', license_url=CC0,
              attribution='Rotating-bicycle-bell — AntumDeluge — CC0.'),
    recording(id='sfx-airplane-chime', title='Signal sonore dans un avion', category='Véhicules', icon='✈️', duration=2.9,
              description='Double signal entendu dans la cabine d’un avion.', tags=['avion', 'cabine', 'signal', 'voyage'],
              filename='Airplane Chime Sound Effect.ogg', author='Sharelk', license='CC0', license_url=CC0,
              attribution='Airplane Chime Sound Effect — Sharelk — CC0.'),
    recording(id='sfx-airplane-cabin', title='Ambiance dans un avion', category='Véhicules', icon='🛫', duration=15,
              description='Bruit continu enregistré dans la cabine d’un avion.', tags=['avion', 'cabine', 'moteur', 'voyage'],
              filename='Sound in air plane 1.ogg', author='Contributeur de PDSounds.org', license='Domaine public', license_url=PD,
              attribution='Fichier issu de PDSounds.org, domaine public.', clip_duration=12),
    recording(id='sfx-motorcycle', title='Moto de course', category='Véhicules', icon='🏍️', duration=76,
              description='Moteur et accélérations d’une moto de course.', tags=['moto', 'moteur', 'accélération', 'course'],
              filename='WWS MotorcycleTOMOSD-9.ogg', author='Technical Museum of Slovenia / Work With Sounds', license='CC BY 4.0', license_url=BY4,
              attribution='WWS MotorcycleTOMOSD-9 — Work With Sounds — CC BY 4.0.', clip_duration=10),
    recording(id='sfx-passing-train', title='Train qui passe', category='Véhicules', icon='🚂', duration=44,
              description='Passage réel d’un train de marchandises.', tags=['train', 'passage', 'rail', 'marchandises'],
              filename='UP through Chehalis 6811.ogg', author='Chris Light', license='CC BY-SA 4.0', license_url=BYSA4,
              attribution='UP through Chehalis 6811 — Chris Light — CC BY-SA 4.0.', clip_duration=12),
    recording(id='sfx-door-knocker', title='Heurtoir de porte', category='Vie quotidienne', icon='✊', duration=1.5,
              description='Trois coups donnés avec un heurtoir métallique.', tags=['porte', 'frapper', 'heurtoir', 'maison'],
              filename='Door knocker audio.ogg', author='Mx. Granger', license='CC0', license_url=CC0,
              attribution='Door knocker audio — Mx. Granger — CC0.'),
    recording(id='sfx-doorbell', title='Sonnette de porte', category='Vie quotidienne', icon='🔔', duration=3.7,
              description='Sonnerie électrique d’une porte d’entrée.', tags=['sonnette', 'porte', 'maison', 'visiteur'],
              filename='Sound Effect - Door Bell.ogg', author='Amada44', license='Domaine public', license_url=PD,
              attribution='Sound Effect - Door Bell — Amada44 — domaine public.'),
    recording(id='sfx-telephone', title='Téléphone : composer et sonner', category='Vie quotidienne', icon='☎️', duration=40,
              description='Composition d’un numéro puis sonnerie téléphonique.', tags=['téléphone', 'sonnerie', 'appel', 'composer'],
              filename='Telephone.ogg', author='Dsw4', license='Domaine public', license_url=PD,
              attribution='Telephone — Dsw4 — domaine public.', clip_duration=9),
    recording(id='sfx-toilet-flush', title='Chasse d’eau', category='Vie quotidienne', icon='🚽', duration=7.2,
              description='Chasse d’eau réelle.', tags=['toilettes', 'eau', 'maison', 'salle de bain'],
              filename='Toilet-flush.ogg', author='DrTrumpet', license='CC BY-SA 4.0', license_url=BYSA4,
              attribution='Toilet-flush — DrTrumpet — CC BY-SA 4.0.'),
    recording(id='sfx-kitchen-tidying', title='Rangement dans une cuisine', category='Vie quotidienne', icon='🍽️', duration=57,
              description='Vaisselle et objets manipulés pendant le rangement d’une cuisine.', tags=['cuisine', 'vaisselle', 'rangement', 'maison'],
              filename='Kitchen tidy up.ogg', author='Contributeur de PDSounds.org', license='Domaine public', license_url=PD,
              attribution='Fichier issu de PDSounds.org, domaine public.', clip_duration=10),
    recording(id='sfx-dull-thud', title='Choc sourd', category='Objets · Impacts', icon='💢', duration=0.4,
              description='Impact sec et grave, utile pour une chute ou un coup hors champ.', tags=['choc', 'impact', 'chute', 'coup'],
              filename='Dull thud.ogg', author='Contributeur de PDSounds.org', license='Domaine public', license_url=PD,
              attribution='Fichier issu de PDSounds.org, domaine public.'),
    recording(id='sfx-music-box', title='Boîte à musique', category='Objets · Ambiances', icon='🎠', duration=2.1,
              description='Courte phrase jouée par une boîte à musique.', tags=['boîte à musique', 'mélodie', 'objet', 'souvenir'],
              filename='Music Box Sound Effect.ogg', author='Contributeur Wikimedia Commons', license='Domaine public', license_url=PD,
              attribution='Music Box Sound Effect — domaine public.'),
    recording(id='sfx-restaurant', title='Restaurant animé', category='Lieux · Ambiances', icon='🍽️', duration=76,
              description='Conversations et vaisselle dans un restaurant fréquenté.', tags=['restaurant', 'foule', 'repas', 'conversation'],
              filename='Restaurant ambience.ogg', author='stephan / PDSounds.org', license='Domaine public', license_url=PD,
              attribution='Restaurant ambience — stephan / PDSounds.org — domaine public.', clip_duration=15),
    recording(id='sfx-city-street', title='Rue en ville', category='Lieux · Ambiances', icon='🏙️', duration=267,
              description='Rue urbaine avec voitures, deux-roues, oiseaux et avions lointains.', tags=['ville', 'rue', 'circulation', 'ambiance'],
              filename='Sunday in the city street noise1.ogg', author='cori / PDSounds.org', license='Domaine public', license_url=PD,
              attribution='Sunday in the city street noise1 — cori / PDSounds.org — domaine public.', clip_duration=15),
    recording(id='sfx-market-rain', title='Marché sous la pluie', category='Lieux · Ambiances', icon='☔', duration=200,
              description='Foule, vendeur, guitare et pluie dans un marché couvert.', tags=['marché', 'pluie', 'foule', 'commerce'],
              filename='Flea market in the rain.ogg', author='stephan / PDSounds.org', license='Domaine public', license_url=PD,
              attribution='Flea market in the rain — stephan / PDSounds.org — domaine public.', clip_duration=15),
    recording(id='sfx-smithy-forging', title='Forge : acier martelé', category='Histoire · Travail', icon='🔨', duration=116,
              description='Travail réel du métal au marteau dans une forge.', tags=['forge', 'marteau', 'acier', 'artisan'],
              filename='WWS Smithysteelforging2.ogg', author='Monika Widzicka / Work With Sounds', license='CC BY 4.0', license_url=BY4,
              attribution='WWS Smithysteelforging2 — Monika Widzicka / Work With Sounds — CC BY 4.0.', clip_duration=10),
    recording(id='sfx-dog-bark', title='Chien qui aboie', category='Animaux', icon='🐕', duration=2.6,
              description='Plusieurs aboiements brefs d’un chien.', tags=['chien', 'aboiement', 'animal', 'maison'],
              filename='Barking of a dog.ogg', author='Amada44', license='CC BY-SA 3.0', license_url=BYSA3,
              attribution='Barking of a dog — Amada44 — CC BY-SA 3.0.'),
    recording(id='sfx-cat-meow', title='Chat qui miaule', category='Animaux', icon='🐈', duration=0.8,
              description='Miaulement court d’un chat.', tags=['chat', 'miaulement', 'animal', 'maison'],
              filename='Meow.ogg', author='Dan Crosby', license='CC BY-SA 3.0', license_url=BYSA3,
              attribution='Meow — Dan Crosby — CC BY-SA 3.0.'),
    recording(id='sfx-horse-neigh', title='Cheval qui hennit', category='Animaux', icon='🐎', duration=2.3,
              description='Hennissement réel d’un cheval.', tags=['cheval', 'hennissement', 'animal', 'écurie'],
              filename='Wiehern.ogg', author='Hü', license='Domaine public', license_url=PD,
              attribution='Wiehern — Hü — domaine public.'),
    recording(id='sfx-rooster', title='Coq qui chante', category='Animaux', icon='🐓', duration=3.8,
              description='Chant réel d’un coq.', tags=['coq', 'ferme', 'matin', 'animal'],
              filename='Rooster crowing.ogg', author="Filo gèn'", license='CC BY-SA 4.0', license_url=BYSA4,
              attribution="Rooster crowing — Filo gèn' — CC BY-SA 4.0."),
    recording(id='sfx-owl', title='Cri de hibou', category='Animaux', icon='🦉', duration=3.6,
              description='Cri d’un hibou des marais.', tags=['hibou', 'oiseau', 'nuit', 'forêt'],
              filename='Short-eared Owl.ogg', author='Jamescandless', license='CC BY-SA 3.0', license_url=BYSA3,
              attribution='Short-eared Owl — Jamescandless — CC BY-SA 3.0.'),
    recording(id='sfx-frogs', title='Grenouilles la nuit', category='Animaux', icon='🐸', duration=33,
              description='Chœur de grenouilles enregistré près d’un lac après la tombée de la nuit.', tags=['grenouilles', 'lac', 'nuit', 'nature'],
              filename='Frog sounds.ogg', author='Hughesdarren', license='CC BY-SA 4.0', license_url=BYSA4,
              attribution='Frog sounds — Hughesdarren — CC BY-SA 4.0.', clip_duration=12),
    recording(id='sfx-bumblebee', title='Bourdon en gros plan', category='Animaux', icon='🐝', duration=44,
              description='Bourdonnement rapproché d’un bourdon.', tags=['bourdon', 'abeille', 'insecte', 'jardin'],
              filename='Hummel bee.ogg', author='soerena / PDSounds.org', license='Domaine public', license_url=PD,
              attribution='Hummel bee — soerena / PDSounds.org — domaine public.', clip_duration=8),
    generated(id='sfx-sword-clash', effect='sword-clash', title='Choc d’épées', category='Histoire · Action', icon='⚔️', duration=1.2,
              description='Impact métallique bref créé pour évoquer deux lames qui se heurtent.', tags=['épée', 'duel', 'métal', 'combat']),
    generated(id='sfx-sword-duel', effect='sword-duel', title='Duel d’épées', category='Histoire · Action', icon='🤺', duration=2.8,
              description='Suite de plusieurs chocs métalliques créée pour une courte scène de duel.', tags=['épées', 'duel', 'combat', 'bataille']),
    generated(id='sfx-footsteps-corridor', effect='footsteps-corridor', title='Pas dans un couloir', category='Vie quotidienne', icon='👣', duration=3.2,
              description='Pas réguliers avec une légère résonance de couloir.', tags=['pas', 'marche', 'couloir', 'approche']),
    generated(id='sfx-camera-shutter', effect='camera-shutter', title='Appareil photo', category='Objets · Impacts', icon='📷', duration=0.7,
              description='Déclenchement mécanique bref d’un appareil photo.', tags=['photo', 'appareil', 'déclic', 'journalisme']),
    generated(id='sfx-glass-break', effect='glass-break', title='Verre qui se brise', category='Objets · Impacts', icon='🪟', duration=1.8,
              description='Fracas bref créé pour évoquer une vitre ou un verre cassé.', tags=['verre', 'vitre', 'casse', 'accident']),
    generated(id='sfx-heartbeat', effect='heartbeat', title='Battements de cœur', category='Corps · Émotions', icon='❤️', duration=4,
              description='Double battement grave et régulier pour la peur ou le suspense.', tags=['cœur', 'peur', 'suspense', 'tension']),
    generated(id='sfx-notification', effect='notification', title='Notification positive', category='Podcast · Signaux', icon='🔔', duration=0.9,
              description='Deux notes claires pour annoncer une information ou une réussite.', tags=['notification', 'signal', 'réussite', 'information']),
    generated(id='sfx-error-buzz', effect='error-buzz', title='Erreur / mauvaise réponse', category='Podcast · Signaux', icon='❌', duration=0.8,
              description='Signal grave et court pour une erreur ou une réponse incorrecte.', tags=['erreur', 'quiz', 'échec', 'signal']),
    generated(id='sfx-school-bell', effect='school-bell', title='Sonnerie d’école', category='École · Société', icon='🏫', duration=2.6,
              description='Cloche résonnante créée pour annoncer le début ou la fin d’un cours.', tags=['école', 'sonnerie', 'classe', 'récréation']),
    generated(id='sfx-dramatic-hit', effect='dramatic-hit', title='Impact dramatique', category='Podcast · Signaux', icon='🎬', duration=2,
              description='Impact grave pour souligner une révélation ou un moment important.', tags=['impact', 'dramatique', 'révélation', 'suspense']),
    generated(id='sfx-horse-gallop', effect='horse-gallop', title='Sabots au galop', category='Histoire · Action', icon='🐎', duration=3.2,
              description='Rythme de sabots créé pour évoquer un cheval au galop.', tags=['cheval', 'galop', 'sabots', 'course']),
    generated(id='sfx-magic-shimmer', effect='magic-shimmer', title='Scintillement magique', category='Podcast · Signaux', icon='✨', duration=2,
              description='Suite de petites notes brillantes pour une découverte ou un effet merveilleux.', tags=['magie', 'scintillement', 'découverte', 'merveilleux']),
    generated(id='sfx-cash-register', effect='cash-register', title='Caisse enregistreuse', category='Vie quotidienne', icon='🧾', duration=1.1,
              description='Déclic mécanique suivi d’une petite cloche de caisse.', tags=['caisse', 'commerce', 'argent', 'magasin']),
]

existing_ids = {item['id'] for item in items}
for item in new_items:
    if item['id'] not in existing_ids:
        items.append(item)
        existing_ids.add(item['id'])

music = [item for item in items if item.get('kind') == 'music']
sfx = [item for item in items if item.get('kind') == 'sfx']
sfx.sort(key=lambda item: (item.get('category', ''), item.get('title', '')))
items = music + sfx

array_json = json.dumps(items, ensure_ascii=False, indent=2)
library = library[:array_start] + array_json + library[array_end:]

SYNTH_CODE = r'''
const generatedAudioCache = new Map<string, Blob>();
const GENERATED_SAMPLE_RATE = 44100;

function encodeGeneratedWav(samples: Float32Array): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => { for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index)); };
  write(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, GENERATED_SAMPLE_RATE, true);
  view.setUint32(28, GENERATED_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(44 + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

function synthesizeGeneratedEffect(effect: string): Blob {
  const durations: Record<string, number> = {
    'sword-clash': 1.2,
    'sword-duel': 2.8,
    'footsteps-corridor': 3.2,
    'camera-shutter': 0.7,
    'glass-break': 1.8,
    heartbeat: 4,
    notification: 0.9,
    'error-buzz': 0.8,
    'school-bell': 2.6,
    'dramatic-hit': 2,
    'horse-gallop': 3.2,
    'magic-shimmer': 2,
    'cash-register': 1.1,
  };
  const duration = durations[effect] ?? 1;
  const samples = new Float32Array(Math.ceil(duration * GENERATED_SAMPLE_RATE));
  let seed = 2166136261;
  for (const character of effect) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const mix = (index: number, value: number) => { if (index >= 0 && index < samples.length) samples[index] += value; };
  const tone = (start: number, length: number, frequency: number, amplitude: number, decay = 7, sweep = 0) => {
    const first = Math.floor(start * GENERATED_SAMPLE_RATE);
    const count = Math.max(1, Math.floor(length * GENERATED_SAMPLE_RATE));
    let phase = 0;
    for (let index = 0; index < count; index += 1) {
      const ratio = index / count;
      const currentFrequency = frequency * (1 + sweep * ratio);
      phase += 2 * Math.PI * currentFrequency / GENERATED_SAMPLE_RATE;
      const envelope = Math.exp(-decay * ratio) * Math.min(1, index / 25);
      mix(first + index, Math.sin(phase) * amplitude * envelope);
    }
  };
  const noise = (start: number, length: number, amplitude: number, decay = 8, bright = true) => {
    const first = Math.floor(start * GENERATED_SAMPLE_RATE);
    const count = Math.max(1, Math.floor(length * GENERATED_SAMPLE_RATE));
    let smooth = 0;
    for (let index = 0; index < count; index += 1) {
      const ratio = index / count;
      const white = random() * 2 - 1;
      smooth = smooth * 0.93 + white * 0.07;
      const value = bright ? white - smooth : smooth * 3.2;
      mix(first + index, value * amplitude * Math.exp(-decay * ratio));
    }
  };
  const thump = (start: number, amplitude = 0.7) => {
    tone(start, 0.22, 85, amplitude, 8, -0.42);
    tone(start, 0.16, 48, amplitude * 0.55, 7, -0.22);
    noise(start, 0.07, amplitude * 0.18, 11, false);
  };
  const metallic = (start: number, amplitude = 0.72) => {
    noise(start, 0.055, amplitude * 0.55, 12, true);
    [[920, 0.34], [1510, 0.28], [2370, 0.2], [3610, 0.14], [4870, 0.08]].forEach(([frequency, level], index) => {
      tone(start + index * 0.0015, 0.72 - index * 0.06, frequency, amplitude * level, 6 + index * 0.7, index % 2 ? -0.035 : 0.02);
    });
  };

  switch (effect) {
    case 'sword-clash':
      metallic(0.04, 0.95);
      noise(0.065, 0.12, 0.2, 8, false);
      break;
    case 'sword-duel':
      [0.05, 0.48, 0.9, 1.36, 1.82, 2.25].forEach((at, index) => metallic(at, index % 2 ? 0.72 : 0.92));
      break;
    case 'footsteps-corridor':
      [0.14, 0.62, 1.08, 1.56, 2.02, 2.5, 2.94].forEach((at, index) => {
        thump(at, index % 2 ? 0.48 : 0.58);
        noise(at + 0.01, 0.13, 0.09, 7, true);
        tone(at + 0.04, 0.42, 180 + (index % 2) * 35, 0.08, 4);
      });
      break;
    case 'camera-shutter':
      noise(0.04, 0.045, 0.72, 16, true);
      tone(0.05, 0.12, 1450, 0.24, 12);
      noise(0.22, 0.06, 0.65, 15, true);
      tone(0.23, 0.19, 820, 0.18, 9, -0.2);
      break;
    case 'glass-break':
      noise(0.025, 0.18, 0.78, 10, true);
      for (let index = 0; index < 18; index += 1) {
        const at = 0.04 + random() * 0.55;
        const frequency = 1800 + random() * 6200;
        tone(at, 0.28 + random() * 0.65, frequency, 0.08 + random() * 0.12, 7 + random() * 5, (random() - 0.5) * 0.08);
      }
      noise(0.12, 0.95, 0.12, 6, true);
      break;
    case 'heartbeat':
      [0.2, 1.2, 2.2, 3.2].forEach((at) => { thump(at, 0.68); thump(at + 0.22, 0.46); });
      break;
    case 'notification':
      tone(0.03, 0.42, 880, 0.42, 5);
      tone(0.24, 0.58, 1320, 0.44, 5);
      tone(0.24, 0.58, 1760, 0.16, 6);
      break;
    case 'error-buzz':
      tone(0.02, 0.34, 190, 0.48, 2.5);
      tone(0.02, 0.34, 285, 0.24, 2.8);
      tone(0.43, 0.31, 155, 0.46, 2.5);
      tone(0.43, 0.31, 232, 0.22, 2.8);
      break;
    case 'school-bell':
      [0.02, 0.62, 1.22].forEach((at, index) => {
        tone(at, 1.25, 720, 0.44 - index * 0.04, 5.4);
        tone(at, 1.1, 1150, 0.27, 5.8);
        tone(at, 0.95, 1840, 0.16, 6.2);
      });
      break;
    case 'dramatic-hit':
      noise(0.015, 0.12, 0.58, 12, false);
      tone(0.02, 1.75, 62, 0.78, 5.2, -0.32);
      tone(0.02, 1.25, 123, 0.28, 6.2, -0.18);
      noise(0.06, 0.9, 0.12, 7, true);
      break;
    case 'horse-gallop':
      [0.08, 0.25, 0.58, 0.76, 1.12, 1.29, 1.63, 1.82, 2.16, 2.34, 2.7, 2.87].forEach((at, index) => {
        thump(at, index % 4 < 2 ? 0.52 : 0.62);
        noise(at, 0.08, 0.1, 9, true);
      });
      break;
    case 'magic-shimmer':
      [0, 0.16, 0.33, 0.52, 0.74, 0.98, 1.25].forEach((at, index) => {
        const frequency = 920 * Math.pow(2, index / 7);
        tone(at, 0.72, frequency, 0.22, 5.5);
        tone(at, 0.62, frequency * 1.5, 0.09, 6.2);
      });
      break;
    case 'cash-register':
      noise(0.03, 0.065, 0.58, 14, true);
      tone(0.1, 0.18, 340, 0.18, 9);
      tone(0.3, 0.72, 1560, 0.36, 5.5);
      tone(0.3, 0.68, 2340, 0.18, 6.2);
      break;
    default:
      tone(0, duration, 440, 0.3, 5);
  }

  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  if (peak > 0.92) {
    const scale = 0.92 / peak;
    for (let index = 0; index < samples.length; index += 1) samples[index] *= scale;
  }
  return encodeGeneratedWav(samples);
}

function loadGeneratedAudio(preset: LibraryPreset): Blob {
  const effect = preset.audioUrl.slice('generated:'.length);
  const cached = generatedAudioCache.get(effect);
  if (cached) return cached;
  const blob = synthesizeGeneratedEffect(effect);
  generatedAudioCache.set(effect, blob);
  return blob;
}
'''

library = replace_required(
    library,
    'const blobCache = new Map<string, Promise<Blob>>();',
    SYNTH_CODE + '\nconst blobCache = new Map<string, Promise<Blob>>();',
    'générateur local de bruitages',
)
library = replace_required(
    library,
    "export const loadLibraryAudio = async (preset: LibraryPreset): Promise<Blob> => {\n  const cached = blobCache.get(preset.id);",
    "export const loadLibraryAudio = async (preset: LibraryPreset): Promise<Blob> => {\n  if (preset.audioUrl.startsWith('generated:')) return loadGeneratedAudio(preset);\n  const cached = blobCache.get(preset.id);",
    'chargement des effets créés localement',
)
LIB_PATH.write_text(library, encoding='utf-8')

app = APP_PATH.read_text(encoding='utf-8')
app = replace_required(
    app,
    '''        if (libraryTarget === 'block') {
          return {
            ...current,
            assetId: asset.id,
            duration: asset.duration,
            trimStart: 0,
            trimEnd: asset.duration,
            title: current.title.startsWith('Nou') ? preset.title : current.title,
          };
        }''',
    '''        if (libraryTarget === 'block') {
          const trimStart = Math.min(asset.duration, Math.max(0, preset.clipStart ?? 0));
          const suggestedDuration = preset.clipDuration ?? Math.max(0.05, asset.duration - trimStart);
          const trimEnd = Math.min(asset.duration, Math.max(trimStart + 0.05, trimStart + suggestedDuration));
          return {
            ...current,
            assetId: asset.id,
            duration: trimEnd - trimStart,
            trimStart,
            trimEnd,
            title: current.title.startsWith('Nou') ? preset.title : current.title,
          };
        }''',
    'extrait recommandé lors de l’ajout',
)

old_preview = '''      const blob = await loadLibraryAudio(preset);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = stopPreview;
      audio.onerror = () => { setError('Le navigateur ne parvient pas à lire cet aperçu.'); stopPreview(); };
      await audio.play();
      setPlayingId(preset.id);'''
new_preview = '''      const blob = await loadLibraryAudio(preset);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      const previewStart = Math.max(0, preset.clipStart ?? 0);
      const previewDuration = Math.max(0.05, preset.clipDuration ?? preset.duration);
      const previewEnd = previewStart + previewDuration;
      await new Promise<void>((resolve, reject) => {
        audio.onloadedmetadata = () => resolve();
        audio.onerror = () => reject(new Error('Le navigateur ne parvient pas à lire cet aperçu.'));
        audio.load();
      });
      audio.currentTime = Math.min(previewStart, Math.max(0, audio.duration - 0.05));
      audio.ontimeupdate = () => { if (audio.currentTime >= previewEnd) stopPreview(); };
      audio.onended = stopPreview;
      await audio.play();
      setPlayingId(preset.id);'''
app = replace_required(app, old_preview, new_preview, 'aperçu limité à l’extrait utile')
app = replace_required(
    app,
    '''        <div className="library-info"><strong>Enregistrements réels</strong><span>Les fichiers proviennent de Wikimedia Commons. Une connexion est nécessaire au premier aperçu ou ajout ; le son est ensuite conservé dans le projet. <a href="./audio-credits.html" target="_blank" rel="noreferrer">Crédits et licences</a></span></div>''',
    '''        <div className="library-info"><strong>Sons vérifiés</strong><span>La bibliothèque réunit des enregistrements réels de Wikimedia Commons et quelques effets courts créés directement dans l’application. Une connexion n’est nécessaire que pour les enregistrements externes. <a href="./audio-credits.html" target="_blank" rel="noreferrer">Crédits et licences</a></span></div>''',
    'texte de présentation de la bibliothèque',
)
app = replace_required(
    app,
    '''<small>{formatTime(preset.duration)} · {preset.tags.slice(0, 3).join(' · ')}</small><div className="library-credit"><a href={preset.sourcePage} target="_blank" rel="noreferrer">Source</a><span>·</span><a href={preset.licenseUrl} target="_blank" rel="noreferrer">{preset.license}</a><span>· {preset.author}</span></div>''',
    '''<small>{formatTime(preset.clipDuration ?? preset.duration)}{preset.clipDuration && preset.clipDuration < preset.duration ? ' · extrait conseillé' : ''} · {preset.tags.slice(0, 3).join(' · ')}</small><div className="library-credit">{preset.origin === 'generated' ? <span>Créé dans l’application · disponible hors ligne</span> : <><a href={preset.sourcePage} target="_blank" rel="noreferrer">Source</a><span>·</span><a href={preset.licenseUrl} target="_blank" rel="noreferrer">{preset.license}</a><span>· {preset.author}</span></>}</div>''',
    'crédits et durée des cartes',
)
APP_PATH.write_text(app, encoding='utf-8')

rows = []
for item in items:
    if item.get('origin') == 'generated':
        source_cell = 'Créé localement, sans téléchargement'
        license_cell = html.escape(item['license'])
    else:
        source_cell = f'<a href="{html.escape(item["sourcePage"])}">Source</a>'
        license_cell = f'<a href="{html.escape(item["licenseUrl"])}">{html.escape(item["license"])}</a>'
    rows.append(
        '<tr>'
        f'<td>{html.escape(item["title"])}</td>'
        f'<td>{"Musique" if item["kind"] == "music" else "Bruitage"}</td>'
        f'<td>{html.escape(item["author"])}</td>'
        f'<td>{license_cell}</td>'
        f'<td>{source_cell}</td>'
        '</tr>'
    )
credits = '''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Crédits audio — Podcast Facile</title><style>body{font:16px system-ui;margin:0;background:#f7f9fc;color:#17243b}main{max-width:1100px;margin:auto;padding:32px 18px}h1{margin-bottom:8px}p{line-height:1.5}table{width:100%;border-collapse:collapse;background:white;border-radius:14px;overflow:hidden}th,td{text-align:left;padding:10px;border-bottom:1px solid #e5e9f1;font-size:14px}th{background:#edf3ff}a{color:#2457d6}@media(max-width:700px){table,tbody,tr,td{display:block}thead{display:none}tr{padding:10px;border-bottom:1px solid #ddd}td{border:0;padding:4px 8px}}</style></head><body><main><h1>Crédits audio — Podcast Facile</h1><p>Les enregistrements externes sont hébergés par Wikimedia Commons et restent associés à leur auteur et à leur licence. Les effets indiqués comme « créés localement » sont synthétisés par l’application et ne nécessitent aucune connexion.</p><table><thead><tr><th>Titre dans l’application</th><th>Type</th><th>Auteur</th><th>Licence</th><th>Fichier</th></tr></thead><tbody>''' + ''.join(rows) + '</tbody></table></main></body></html>'
CREDITS_PATH.parent.mkdir(parents=True, exist_ok=True)
CREDITS_PATH.write_text(credits, encoding='utf-8')

if 'Chocs métalliques / épées' in library or 'Chocs métalliques / épées' in app:
    raise RuntimeError('L’ancien intitulé trompeur des épées subsiste.')
if library.count("'origin'") == 0 and '"origin"' not in library:
    raise RuntimeError('Les origines des sons ne sont pas présentes.')
if 'generated:sword-clash' not in library or 'sfx-dog-bark' not in library or 'clipDuration' not in app:
    raise RuntimeError('La nouvelle bibliothèque de bruitages est incomplète.')

print(f'Bibliothèque de bruitages auditée : {len([item for item in items if item["kind"] == "sfx"])} sons, dont {len([item for item in items if item.get("origin") == "generated"])} effets locaux.')
