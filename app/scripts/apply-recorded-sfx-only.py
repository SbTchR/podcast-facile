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
    *, id: str, title: str, category: str, icon: str, duration: float,
    description: str, tags: list[str], filename: str, author: str,
    license: str, license_url: str, attribution: str,
    clip_duration: float | None = None, clip_start: float | None = None,
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


PD = 'https://creativecommons.org/publicdomain/mark/1.0/'
CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/'
BY3 = 'https://creativecommons.org/licenses/by/3.0/'
BY4 = 'https://creativecommons.org/licenses/by/4.0/'
BYSA25 = 'https://creativecommons.org/licenses/by-sa/2.5/'
BYSA3 = 'https://creativecommons.org/licenses/by-sa/3.0/'
BYSA4 = 'https://creativecommons.org/licenses/by-sa/4.0/'

new_recordings = [
    recording(id='sfx-steps-walking', title='Pas en marchant', category='Mouvements · Pas', icon='👣', duration=3.6,
              description='Une personne marche à un rythme régulier.', tags=['pas', 'marche', 'personne', 'déplacement'],
              filename='ZapSibAudio-Steps.ogg', author='Maksim Pinigin', license='CC BY-SA 4.0', license_url=BYSA4,
              attribution='ZapSibAudio-Steps — Maksim Pinigin — CC BY-SA 4.0.'),
    recording(id='sfx-steps-concrete', title='Pas sur du béton', category='Mouvements · Pas', icon='👟', duration=0.8,
              description='Deux pas courts enregistrés sur une surface en béton.', tags=['pas', 'béton', 'marche', 'sol'],
              filename='Concrete Steps 2.ogg', author='Pwaivers', license='CC BY-SA 3.0', license_url=BYSA3,
              attribution='Concrete Steps 2 — Pwaivers — CC BY-SA 3.0.'),
    recording(id='sfx-steps-church', title='Pas résonnant dans une église', category='Mouvements · Pas', icon='⛪', duration=30,
              description='Plusieurs personnes marchent dans une église avec une forte réverbération.', tags=['pas', 'église', 'réverbération', 'intérieur'],
              filename='Church people walking steps with reverb.ogg', author='Contributeur de PDSounds.org', license='Domaine public', license_url=PD,
              attribution='Fichier issu de PDSounds.org, domaine public.', clip_duration=10),
    recording(id='sfx-camera-real', title='Déclencheur d’appareil photo', category='Objets · Appareils', icon='📷', duration=0.4,
              description='Déclic réel et très court d’un appareil photo.', tags=['photo', 'appareil', 'déclic', 'journalisme'],
              filename='Camerasound.ogg', author='Jasbinkarki', license='CC BY-SA 3.0', license_url=BYSA3,
              attribution='Camerasound — Jasbinkarki — CC BY-SA 3.0.'),
    recording(id='sfx-buzzer-real', title='Buzzer', category='Objets · Signaux', icon='🚫', duration=1,
              description='Signal électrique bref de type buzzer.', tags=['buzzer', 'alarme', 'erreur', 'signal'],
              filename='Buzzer.ogg', author='BlastOButter42', license='CC BY-SA 3.0', license_url=BYSA3,
              attribution='Buzzer — BlastOButter42 — CC BY-SA 3.0.'),
    recording(id='sfx-machinery-clunk', title='Coup sourd de machine', category='Industrie · Machines', icon='⚙️', duration=3.1,
              description='Bruit mécanique grave avec un claquement net.', tags=['machine', 'mécanisme', 'claquement', 'industrie'],
              filename='Clunk noise - machinery.ogg', author='Secretlondon', license='CC BY-SA 2.5', license_url=BYSA25,
              attribution='Clunk noise - machinery — Secretlondon — CC BY-SA 2.5.'),
    recording(id='sfx-glass-clinking', title='Verres qui s’entrechoquent', category='Objets · Vaisselle', icon='🥂', duration=66,
              description='Tintements répétés de verres posés et entrechoqués.', tags=['verres', 'tintement', 'table', 'vaisselle'],
              filename='Binging glass.ogg', author='hugh / PDSounds.org', license='Domaine public', license_url=PD,
              attribution='Binging glass — hugh / PDSounds.org — domaine public.', clip_duration=7),
    recording(id='sfx-wine-glass', title='Verre à vin', category='Objets · Vaisselle', icon='🍷', duration=6.6,
              description='Tintement clair produit par un verre à vin.', tags=['verre', 'vin', 'tintement', 'vaisselle'],
              filename='Wine glass.ogg', author='Contributeur Wikimedia Commons', license='Domaine public', license_url=PD,
              attribution='Wine glass — domaine public.'),
    recording(id='sfx-writing-inkpen', title='Écriture au stylo à encre', category='École · Bureau', icon='✒️', duration=20,
              description='Un stylo à encre écrit sur une feuille de papier.', tags=['écriture', 'stylo', 'papier', 'bureau'],
              filename='Writing with inkpen.ogg', author='stephan / PDSounds.org', license='Domaine public', license_url=PD,
              attribution='Writing with inkpen — stephan / PDSounds.org — domaine public.', clip_duration=8),
    recording(id='sfx-writing-feltpen', title='Écriture au feutre', category='École · Bureau', icon='🖊️', duration=20,
              description='Un feutre écrit sur une feuille de papier.', tags=['écriture', 'feutre', 'papier', 'école'],
              filename='Writing with feltpen.ogg', author='stephan / PDSounds.org', license='Domaine public', license_url=PD,
              attribution='Writing with feltpen — stephan / PDSounds.org — domaine public.', clip_duration=8),
    recording(id='sfx-turn-page', title='Tourner une page', category='École · Bureau', icon='📄', duration=3.4,
              description='Une page de livre est tournée une seule fois.', tags=['page', 'livre', 'papier', 'lecture'],
              filename='Turning a page.ogg', author='Contributeur de PDSounds.org', license='Domaine public', license_url=PD,
              attribution='Fichier issu de PDSounds.org, domaine public.'),
    recording(id='sfx-pen-drop', title='Stylo tombant au sol', category='École · Bureau', icon='🖊️', duration=1.1,
              description='Un stylo en plastique tombe sur un sol en marbre.', tags=['stylo', 'chute', 'sol', 'objet'],
              filename='Pen dropped.ogg', author='Contributeur Wikimedia Commons', license='CC0', license_url=CC0,
              attribution='Pen dropped — CC0.'),
    recording(id='sfx-paperclips', title='Trombones qui tombent', category='École · Bureau', icon='📎', duration=35,
              description='Des trombones métalliques tombent et s’entrechoquent.', tags=['trombones', 'métal', 'bureau', 'chute'],
              filename='Paperclips dropped jangled.ogg', author='Contributeur de PDSounds.org', license='Domaine public', license_url=PD,
              attribution='Fichier issu de PDSounds.org, domaine public.', clip_duration=5),
    recording(id='sfx-cellar-door', title='Porte de cave avec serrure', category='Vie quotidienne · Portes', icon='🗝️', duration=18,
              description='Ouverture d’une porte de cave avec serrure métallique et grincement.', tags=['porte', 'cave', 'serrure', 'grincement'],
              filename='Springlocked cellar door.ogg', author='Contributeur de PDSounds.org', license='Domaine public', license_url=PD,
              attribution='Fichier issu de PDSounds.org, domaine public.', clip_duration=10),
    recording(id='sfx-squeaky-door', title='Porte qui grince', category='Vie quotidienne · Portes', icon='🚪', duration=8.5,
              description='Une porte s’ouvre avec un grincement prolongé.', tags=['porte', 'grincement', 'maison', 'mystère'],
              filename='Squeaky door.ogg', author='Contributeur de PDSounds.org', license='Domaine public', license_url=PD,
              attribution='Fichier issu de PDSounds.org, domaine public.'),
    recording(id='sfx-shop-doorbell', title='Clochette de magasin', category='Vie quotidienne · Portes', icon='🏪', duration=4.2,
              description='Ancienne clochette de porte à l’entrée d’un magasin.', tags=['magasin', 'clochette', 'porte', 'commerce'],
              filename='Ladenklingel.ogg', author='Manfred Heyde', license='CC BY-SA 3.0', license_url=BYSA3,
              attribution='Ladenklingel — Manfred Heyde — CC BY-SA 3.0.'),
    recording(id='sfx-train-doors', title='Portes de train qui se ferment', category='Véhicules · Train', icon='🚇', duration=8.9,
              description='Fermeture hydraulique de portes de train.', tags=['train', 'portes', 'fermeture', 'métro'],
              filename='Train doors closing.ogg', author='Contributeur de PDSounds.org', license='Domaine public', license_url=PD,
              attribution='Fichier issu de PDSounds.org, domaine public.'),
    recording(id='sfx-kettle-whistle', title='Bouilloire qui siffle', category='Vie quotidienne · Cuisine', icon='🫖', duration=17,
              description='Sifflement continu d’une bouilloire sur une cuisinière.', tags=['bouilloire', 'sifflement', 'cuisine', 'eau'],
              filename='Kettle whistle.ogg', author='Secretlondon', license='CC BY-SA 2.5', license_url=BYSA25,
              attribution='Kettle whistle — Secretlondon — CC BY-SA 2.5.', clip_duration=8),
    recording(id='sfx-campfire', title='Feu de camp', category='Nature · Feu', icon='🏕️', duration=60,
              description='Crépitement régulier d’un petit feu de camp.', tags=['feu', 'camp', 'crépitement', 'bois'],
              filename='Campfire sound ambience.ogg', author='Glaneur de sons', license='Domaine public', license_url=PD,
              attribution='Campfire sound ambience — domaine public.', clip_duration=12),
    recording(id='sfx-brook', title='Petit ruisseau', category='Nature · Eau', icon='💧', duration=36,
              description='Écoulement d’eau enregistré près d’un petit ruisseau.', tags=['ruisseau', 'eau', 'nature', 'vallée'],
              filename='Brook sound.ogg', author='TwoWings', license='CC BY-SA 3.0', license_url=BYSA3,
              attribution='Brook sound — TwoWings — CC BY-SA 3.0.', clip_duration=12),
    recording(id='sfx-small-stream', title='Petit cours d’eau', category='Nature · Eau', icon='🏞️', duration=22,
              description='Écoulement continu d’un petit cours d’eau.', tags=['eau', 'ruisseau', 'rivière', 'nature'],
              filename='Sound Effects - The sound of a small stream.ogg', author='Amada44', license='CC BY-SA 3.0', license_url=BYSA3,
              attribution='The sound of a small stream — Amada44 — CC BY-SA 3.0.', clip_duration=10),
    recording(id='sfx-rain-thunder-steps', title='Pluie, tonnerre et pas', category='Nature · Météo', icon='🌧️', duration=90,
              description='Une personne marche sous la pluie pendant qu’un orage gronde.', tags=['pluie', 'tonnerre', 'pas', 'orage'],
              filename='Rain thunder steps.ogg', author='Contributeur de PDSounds.org', license='Domaine public', license_url=PD,
              attribution='Fichier issu de PDSounds.org, domaine public.', clip_duration=15),
    recording(id='sfx-wood-ice-crackling', title='Bois et glace qui craquent', category='Nature · Matières', icon='🪵', duration=74,
              description='Craquements secs de bois, de feu et de glace.', tags=['bois', 'glace', 'craquement', 'feu'],
              filename='Bones breaking wood fire ice crackling.ogg', author='Contributeur de PDSounds.org', license='Domaine public', license_url=PD,
              attribution='Fichier issu de PDSounds.org, domaine public.', clip_duration=10),
    recording(id='sfx-human-sneeze', title='Éternuement', category='Voix · Corps', icon='🤧', duration=3.4,
              description='Un éternuement humain réel.', tags=['éternuement', 'personne', 'santé', 'voix'],
              filename='Sneezing.ogg', author='jc / PDSounds.org', license='Domaine public', license_url=PD,
              attribution='Sneezing — jc / PDSounds.org — domaine public.'),
    recording(id='sfx-human-cough', title='Petite série de toux', category='Voix · Corps', icon='😷', duration=3.1,
              description='Plusieurs toux humaines courtes.', tags=['toux', 'personne', 'santé', 'voix'],
              filename='Short coughs.ogg', author='Contributeur de PDSounds.org', license='Domaine public', license_url=PD,
              attribution='Short coughs — PDSounds.org — domaine public.'),
    recording(id='sfx-group-laughter', title='Petit groupe qui rit', category='Voix · Émotions', icon='😂', duration=6.3,
              description='Rires naturels d’un petit groupe de personnes.', tags=['rire', 'groupe', 'joie', 'public'],
              filename='Small group laughter.ogg', author='Contributeur Wikimedia Commons', license='Domaine public', license_url=PD,
              attribution='Small group laughter — domaine public.'),
    recording(id='sfx-baby-laugh', title='Rire de bébé', category='Voix · Émotions', icon='👶', duration=2.5,
              description='Rire bref et naturel d’un bébé.', tags=['bébé', 'rire', 'joie', 'enfant'],
              filename='Baby Laugh.ogg', author='Contributeur Wikimedia Commons', license='CC BY 3.0', license_url=BY3,
              attribution='Baby Laugh — CC BY 3.0.'),
    recording(id='sfx-male-crying', title='Homme qui pleure', category='Voix · Émotions', icon='😢', duration=7.8,
              description='Pleurs et sanglots d’un homme.', tags=['pleurs', 'homme', 'tristesse', 'émotion'],
              filename='Male crying and weeping.ogg', author='Contributeur Wikimedia Commons', license='CC BY-SA 4.0', license_url=BYSA4,
              attribution='Male crying and weeping — CC BY-SA 4.0.'),
    recording(id='sfx-baby-cry', title='Bébé qui pleure', category='Voix · Émotions', icon='😭', duration=18,
              description='Pleurs prolongés d’un bébé réclamant de l’attention.', tags=['bébé', 'pleurs', 'enfant', 'émotion'],
              filename='Baby long wanting cry.ogg', author='natalie / PDSounds.org', license='Domaine public', license_url=PD,
              attribution='Baby long wanting cry — natalie / PDSounds.org — domaine public.', clip_duration=8),
    recording(id='sfx-snoring', title='Ronflement', category='Voix · Corps', icon='😴', duration=10,
              description='Ronflement humain régulier.', tags=['ronflement', 'sommeil', 'personne', 'nuit'],
              filename='Zzz.ogg', author='Béotien lambda', license='CC BY-SA 3.0', license_url=BYSA3,
              attribution='Zzz — Béotien lambda — CC BY-SA 3.0.'),
    recording(id='sfx-human-whistling', title='Sifflement humain', category='Voix · Corps', icon='😗', duration=1.5,
              description='Une personne produit un sifflement bref.', tags=['sifflement', 'personne', 'signal', 'voix'],
              filename='Human whistling.ogg', author='TwoWings', license='CC BY-SA 3.0', license_url=BYSA3,
              attribution='Human whistling — TwoWings — CC BY-SA 3.0.'),
    recording(id='sfx-wheeze', title='Respiration sifflante', category='Voix · Corps', icon='🫁', duration=8.5,
              description='Respiration humaine sifflante enregistrée à des fins médicales.', tags=['respiration', 'souffle', 'santé', 'personne'],
              filename='Wheeze2O.ogg', author='Jmh649', license='CC BY-SA 3.0', license_url=BYSA3,
              attribution='Wheeze2O — Jmh649 — CC BY-SA 3.0.', clip_duration=6),
    recording(id='sfx-cow-moo', title='Vache qui meugle', category='Animaux · Ferme', icon='🐄', duration=3,
              description='Un meuglement isolé de vache.', tags=['vache', 'meuglement', 'ferme', 'animal'],
              filename='Single Cow Moo.ogg', author='MichaeltheFox8621', license='CC BY-SA 4.0', license_url=BYSA4,
              attribution='Single Cow Moo — MichaeltheFox8621 — CC BY-SA 4.0.'),
    recording(id='sfx-pig-oink', title='Cochon qui grogne', category='Animaux · Ferme', icon='🐖', duration=0.3,
              description='Grognement très court d’un cochon.', tags=['cochon', 'grognement', 'ferme', 'animal'],
              filename='Mudchute pig 1.ogg', author='Secretlondon', license='CC BY-SA 2.5', license_url=BYSA25,
              attribution='Mudchute pig 1 — Secretlondon — CC BY-SA 2.5.'),
    recording(id='sfx-sheep-bleat', title='Mouton qui bêle', category='Animaux · Ferme', icon='🐑', duration=5,
              description='Bêlement réel d’un mouton.', tags=['mouton', 'bêlement', 'ferme', 'animal'],
              filename='Sheep bleating.ogg', author='earthcalling', license='Domaine public', license_url=PD,
              attribution='Sheep bleating — earthcalling — domaine public.'),
    recording(id='sfx-duck-calls', title='Canard huppé', category='Animaux · Oiseaux', icon='🦆', duration=4.2,
              description='Plusieurs appels d’un canard huppé.', tags=['canard', 'oiseau', 'cri', 'étang'],
              filename='Tufted Duck.ogg', author='Jamescandless', license='CC BY-SA 3.0', license_url=BYSA3,
              attribution='Tufted Duck — Jamescandless — CC BY-SA 3.0.'),
    recording(id='sfx-wolf-howls', title='Loups qui hurlent', category='Animaux · Sauvages', icon='🐺', duration=28,
              description='Plusieurs loups hurlent ensemble.', tags=['loups', 'hurlement', 'nuit', 'animal'],
              filename='Wolf howls.ogg', author='U.S. Fish and Wildlife Service', license='Domaine public', license_url=PD,
              attribution='Wolf howls — U.S. Fish and Wildlife Service — domaine public.', clip_duration=12),
    recording(id='sfx-guinea-pig', title='Cochon d’Inde réclamant à manger', category='Animaux · Domestiques', icon='🐹', duration=29,
              description='Cris répétés d’un cochon d’Inde qui réclame de la nourriture.', tags=['cochon d’Inde', 'cri', 'animal', 'nourriture'],
              filename='Screaming-guinea-pig.ogg', author='Valderifs', license='CC BY-SA 4.0', license_url=BYSA4,
              attribution='Screaming-guinea-pig — Valderifs — CC BY-SA 4.0.', clip_duration=8),
    recording(id='sfx-helicopter-takeoff', title='Hélicoptère de secours au décollage', category='Véhicules · Aériens', icon='🚁', duration=42,
              description='Un hélicoptère de secours décolle dans une zone résidentielle.', tags=['hélicoptère', 'décollage', 'secours', 'moteur'],
              filename='Rescue helicopter take off.ogg', author='Teacoolish', license='CC BY-SA 4.0', license_url=BYSA4,
              attribution='Rescue helicopter take off — Teacoolish — CC BY-SA 4.0.', clip_duration=12),
    recording(id='sfx-airplane-flyover', title='Avion qui passe', category='Véhicules · Aériens', icon='✈️', duration=47,
              description='Passage aérien d’un avion Antonov AN-24.', tags=['avion', 'passage', 'moteur', 'ciel'],
              filename='Sound of AN-24 airplane.ogg', author='Grachev', license='Domaine public', license_url=PD,
              attribution='Sound of AN-24 airplane — Grachev — domaine public.', clip_duration=12),
    recording(id='sfx-foghorn-real', title='Corne de brume', category='Véhicules · Navigation', icon='📯', duration=133,
              description='Puissante corne de brume maritime utilisée pour guider les bateaux.', tags=['corne de brume', 'bateau', 'mer', 'signal'],
              filename='WWS Foghorn.ogg', author='Work With Sounds', license='CC BY 4.0', license_url=BY4,
              attribution='WWS Foghorn — Work With Sounds — CC BY 4.0.', clip_duration=10),
    recording(id='sfx-underground-arrival', title='Métro arrivant en station', category='Véhicules · Train', icon='🚇', duration=42,
              description='Une rame du métro londonien arrive dans une station.', tags=['métro', 'arrivée', 'station', 'train'],
              filename='London Underground 1996 Stock train arriving in a station.ogg', author='Contributeur Wikimedia Commons', license='CC BY-SA 4.0', license_url=BYSA4,
              attribution='London Underground train arriving — CC BY-SA 4.0.', clip_duration=12),
    recording(id='sfx-train-stopping', title='Train s’arrêtant en gare', category='Véhicules · Train', icon='🚆', duration=93,
              description='Un train intercity ralentit puis s’arrête en gare.', tags=['train', 'freinage', 'gare', 'arrêt'],
              filename='WWS TrainStoppingAtTheTrainStation.ogg', author='Laura Vaara / Work With Sounds', license='CC BY 4.0', license_url=BY4,
              attribution='WWS TrainStoppingAtTheTrainStation — Work With Sounds — CC BY 4.0.', clip_duration=15),
    recording(id='sfx-station-tunnel', title='Tunnel sous une gare', category='Lieux · Transports', icon='🚉', duration=132,
              description='Ambiance réverbérante d’un tunnel piétonnier sous une gare.', tags=['gare', 'tunnel', 'pas', 'ambiance'],
              filename='WWS TheStationTunnelOfTheTampereStation.ogg', author='Laura Vaara / Work With Sounds', license='CC BY 4.0', license_url=BY4,
              attribution='WWS TheStationTunnelOfTheTampereStation — Work With Sounds — CC BY 4.0.', clip_duration=15),
    recording(id='sfx-traffic-people', title='Circulation et passants', category='Lieux · Ville', icon='🚦', duration=421,
              description='Ambiance de rue avec automobiles et conversations de passants.', tags=['circulation', 'voitures', 'passants', 'ville'],
              filename='Sounds of Automobile and People.ogg', author='Ready Street', license='CC BY-SA 4.0', license_url=BYSA4,
              attribution='Sounds of Automobile and People — Ready Street — CC BY-SA 4.0.', clip_duration=15),
    recording(id='sfx-scooter-exhaust', title='Scooter au ralenti et accélérations', category='Véhicules · Route', icon='🛵', duration=51,
              description='Son d’échappement d’un scooter avec variations de régime.', tags=['scooter', 'moteur', 'accélération', 'route'],
              filename='Activa Sound.ogg', author='Aash Gates', license='CC BY-SA 4.0', license_url=BYSA4,
              attribution='Activa Sound — Aash Gates — CC BY-SA 4.0.', clip_duration=10),
]

library = LIB_PATH.read_text(encoding='utf-8')
marker = 'export const AUDIO_LIBRARY: LibraryPreset[] = '
array_start = library.index('[', library.index(marker) + len(marker))
array_end = library.index('] as LibraryPreset[];', array_start) + 1
items: list[dict] = json.loads(library[array_start:array_end])
items = [item for item in items if item.get('kind') != 'sfx' or not (item.get('origin') == 'generated' or str(item.get('audioUrl', '')).startswith('generated:'))]
for item in items:
    if item.get('kind') == 'sfx':
        item['origin'] = 'recording'

existing_ids = {item['id'] for item in items}
for item in new_recordings:
    if item['id'] not in existing_ids:
        items.append(item)
        existing_ids.add(item['id'])

items = [item for item in items if item.get('id') not in {'sfx-small-stream', 'sfx-writing-feltpen', 'sfx-wine-glass'}]
music = [item for item in items if item.get('kind') == 'music']
sfx = sorted([item for item in items if item.get('kind') == 'sfx'], key=lambda item: (item.get('category', ''), item.get('title', '')))
items = music + sfx
library = library[:array_start] + json.dumps(items, ensure_ascii=False, indent=2) + library[array_end:]

start = library.find('const generatedAudioCache =')
end = library.find('const blobCache =', start)
if start >= 0 and end >= 0:
    library = library[:start] + library[end:]
library = library.replace("  origin?: 'recording' | 'generated';", "  origin?: 'recording';")
library = library.replace("  if (preset.audioUrl.startsWith('generated:')) return loadGeneratedAudio(preset);\n", '')
LIB_PATH.write_text(library, encoding='utf-8')

app = APP_PATH.read_text(encoding='utf-8')
app = replace_required(
    app,
    'La bibliothèque réunit des enregistrements réels de Wikimedia Commons et quelques effets courts créés directement dans l’application. Une connexion n’est nécessaire que pour les enregistrements externes.',
    'La bibliothèque contient uniquement des enregistrements réels provenant de Wikimedia Commons. Une connexion est nécessaire au premier aperçu ou ajout ; le son est ensuite conservé dans le projet.',
    'présentation exclusivement fondée sur les enregistrements',
)
old_credit = '''{preset.origin === 'generated' ? <span>Créé dans l’application · disponible hors ligne</span> : <><a href={preset.sourcePage} target="_blank" rel="noreferrer">Source</a><span>·</span><a href={preset.licenseUrl} target="_blank" rel="noreferrer">{preset.license}</a><span>· {preset.author}</span></>}'''
new_credit = '''<><a href={preset.sourcePage} target="_blank" rel="noreferrer">Source</a><span>·</span><a href={preset.licenseUrl} target="_blank" rel="noreferrer">{preset.license}</a><span>· {preset.author}</span></>'''
app = replace_required(app, old_credit, new_credit, 'crédits des enregistrements réels')
APP_PATH.write_text(app, encoding='utf-8')

rows = []
for item in items:
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
credits = '''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Crédits audio — Podcast Facile</title><style>body{font:16px system-ui;margin:0;background:#f7f9fc;color:#17243b}main{max-width:1100px;margin:auto;padding:32px 18px}h1{margin-bottom:8px}p{line-height:1.5}table{width:100%;border-collapse:collapse;background:white;border-radius:14px;overflow:hidden}th,td{text-align:left;padding:10px;border-bottom:1px solid #e5e9f1;font-size:14px}th{background:#edf3ff}a{color:#2457d6}@media(max-width:700px){table,tbody,tr,td{display:block}thead{display:none}tr{padding:10px;border-bottom:1px solid #ddd}td{border:0;padding:4px 8px}}</style></head><body><main><h1>Crédits audio — Podcast Facile</h1><p>Tous les sons de la bibliothèque sont des enregistrements réels hébergés par Wikimedia Commons. Chaque fichier reste associé à son auteur et à sa licence.</p><table><thead><tr><th>Titre dans l’application</th><th>Type</th><th>Auteur</th><th>Licence</th><th>Fichier</th></tr></thead><tbody>''' + ''.join(rows) + '</tbody></table></main></body></html>'
CREDITS_PATH.write_text(credits, encoding='utf-8')

sfx_count = len(sfx)
if not 80 <= sfx_count <= 100:
    raise RuntimeError(f'La bibliothèque doit contenir entre 80 et 100 bruitages réels, résultat : {sfx_count}.')
combined = LIB_PATH.read_text(encoding='utf-8') + APP_PATH.read_text(encoding='utf-8')
for forbidden in ('generated:', 'synthesizeGeneratedEffect', 'loadGeneratedAudio', 'Créé dans l’application', 'disponible hors ligne'):
    if forbidden in combined:
        raise RuntimeError(f'Un élément synthétique subsiste : {forbidden}')
if any(item.get('origin') != 'recording' for item in sfx):
    raise RuntimeError('Tous les bruitages doivent être des enregistrements réels.')

print(f'Bibliothèque exclusivement réelle : {sfx_count} bruitages.')
