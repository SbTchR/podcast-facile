from __future__ import annotations

import hashlib
import html
import json
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
LIB_PATH = ROOT / 'src' / 'data' / 'audioLibrary.ts'
CREDITS_PATH = ROOT / 'public' / 'audio-credits.html'


def commons_urls(filename: str) -> tuple[str, str, str]:
    normalized = filename.replace(' ', '_')
    digest = hashlib.md5(normalized.encode('utf-8')).hexdigest()
    encoded = quote(normalized, safe="_(),.-")
    original = f'https://upload.wikimedia.org/wikipedia/commons/{digest[0]}/{digest[:2]}/{encoded}'
    page = f'https://commons.wikimedia.org/wiki/File:{encoded}'
    if normalized.lower().endswith('.mp3'):
        return original, original, page
    transcode = f'https://upload.wikimedia.org/wikipedia/commons/transcoded/{digest[0]}/{digest[:2]}/{encoded}/{encoded}.mp3'
    return transcode, original, page


def preset(
    *, id: str, kind: str, title: str, category: str, icon: str, duration: float,
    description: str, tags: list[str], filename: str, author: str,
    license: str, license_url: str, attribution: str,
    clip_duration: float | None = None, clip_start: float | None = None,
) -> dict:
    audio_url, fallback_url, source_page = commons_urls(filename)
    item = {
        'id': id,
        'kind': kind,
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
BY25 = 'https://creativecommons.org/licenses/by/2.5/'
BY3 = 'https://creativecommons.org/licenses/by/3.0/'
BY4 = 'https://creativecommons.org/licenses/by/4.0/'
BYSA3 = 'https://creativecommons.org/licenses/by-sa/3.0/'
BYSA4 = 'https://creativecommons.org/licenses/by-sa/4.0/'

historical_sfx = [
    preset(id='sfx-horse-gallop-pavement', kind='sfx', title='Cheval au galop sur des pavés', category='Histoire · Chevaux', icon='🐎', duration=27,
           description='Une jument ferrée court sur la cour pavée d’un musée agricole.', tags=['cheval', 'galop', 'sabots', 'pavés'],
           filename='WWS Clatterofhorseshoesonthepavement.ogg', author='Monika Widzicka / Work With Sounds', license='CC BY 4.0', license_url=BY4,
           attribution='Clatter of horseshoes on the pavement — Monika Widzicka / Work With Sounds — CC BY 4.0.', clip_duration=10),
    preset(id='sfx-steam-locomotive', kind='sfx', title='Locomotive à vapeur en fonctionnement', category='Histoire · Révolution industrielle', icon='🚂', duration=35,
           description='Mécanisme, souffle et roulement d’une locomotive à vapeur.', tags=['locomotive', 'vapeur', 'train', 'industrie'],
           filename='WWS Steamlocomotive.ogg', author='Konrad Gutkowski / Work With Sounds', license='CC BY 4.0', license_url=BY4,
           attribution='Steam locomotive — Konrad Gutkowski / Work With Sounds — CC BY 4.0.', clip_duration=12),
    preset(id='sfx-steam-locomotive-air-pump', kind='sfx', title='Pompe à air d’une locomotive à vapeur', category='Histoire · Révolution industrielle', icon='⚙️', duration=72,
           description='Pompe à air mécanique d’une locomotive à vapeur historique.', tags=['pompe', 'locomotive', 'vapeur', 'mécanisme'],
           filename='WWS Airpumpsteamlocomotive.ogg', author='Konrad Gutkowski et Julian Blaschke / Work With Sounds', license='CC BY 4.0', license_url=BY4,
           attribution='Air pump of a steam locomotive — Work With Sounds — CC BY 4.0.', clip_duration=10),
    preset(id='sfx-prussian-steam-train', kind='sfx', title='Locomotive prussienne P8 passant en gare', category='Histoire · Révolution industrielle', icon='🚉', duration=27,
           description='Passage d’une locomotive à vapeur prussienne de type P8 près d’un quai.', tags=['locomotive', 'prussienne', 'gare', 'vapeur'],
           filename='WWS PrussianpassengersteamlocomotiveP-8.ogg', author='Konrad Gutkowski / Work With Sounds', license='CC BY 4.0', license_url=BY4,
           attribution='Prussian passenger steam locomotive P8 — Work With Sounds — CC BY 4.0.', clip_duration=12),
    preset(id='sfx-traction-engine-steam', kind='sfx', title='Machine routière à vapeur libérant la pression', category='Histoire · Révolution industrielle', icon='💨', duration=28,
           description='Une machine de traction Aveling & Porter libère un puissant jet de vapeur.', tags=['vapeur', 'machine', 'pression', 'industrie'],
           filename='Aveling & Porter traction engine releasing steam.ogg', author='LouiseBrown1981', license='CC BY-SA 3.0', license_url=BYSA3,
           attribution='Aveling & Porter traction engine releasing steam — LouiseBrown1981 — CC BY-SA 3.0.', clip_duration=8),
    preset(id='sfx-steam-engine-general', kind='sfx', title='Machine à vapeur régulière', category='Histoire · Révolution industrielle', icon='🏭', duration=45.4,
           description='Fonctionnement régulier d’une ancienne machine à vapeur.', tags=['machine à vapeur', 'moteur', 'usine', 'industrie'],
           filename='Steam engine.ogg', author='Contributeur de PDSounds.org', license='Domaine public', license_url=PD,
           attribution='Steam engine — PDSounds.org — domaine public.', clip_duration=12),
    preset(id='sfx-witte-engine-1925', kind='sfx', title='Moteur agricole à essence de 1925', category='Histoire · Moteurs anciens', icon='🛠️', duration=220,
           description='Moteur fixe Witte des années 1920 utilisé notamment pour pomper de l’eau.', tags=['moteur', '1920', 'agriculture', 'essence'],
           filename='WWS Wittecombustionengine.ogg', author='Monika Widzicka / Work With Sounds', license='CC BY 4.0', license_url=BY4,
           attribution='Witte combustion engine — Monika Widzicka / Work With Sounds — CC BY 4.0.', clip_duration=12),
    preset(id='sfx-motor-polski-engine', kind='sfx', title='Ancien moteur Motor Polski', category='Histoire · Moteurs anciens', icon='🔧', duration=239,
           description='Fonctionnement d’un ancien moteur fixe Motor Polski conservé dans un musée agricole.', tags=['moteur ancien', 'agriculture', 'machine', 'Pologne'],
           filename='WWS MotorPolskicombustionengine.ogg', author='Monika Widzicka / Work With Sounds', license='CC BY 4.0', license_url=BY4,
           attribution='Motor Polski combustion engine — Monika Widzicka / Work With Sounds — CC BY 4.0.', clip_duration=12),
    preset(id='sfx-v8-engine', kind='sfx', title='Moteur automobile V8', category='Histoire · Moteurs anciens', icon='🚘', duration=10.3,
           description='Son caractéristique d’un moteur automobile V8.', tags=['V8', 'voiture', 'moteur', 'automobile'],
           filename='MAC3.OGG', author='Mustangworld / Type0', license='CC BY-SA 3.0', license_url=BYSA3,
           attribution='V8 engine sound — Mustangworld / Type0 — CC BY-SA 3.0.'),
    preset(id='sfx-ferrari-250-gto', kind='sfx', title='Moteur de Ferrari 250 GTO', category='Histoire · Moteurs anciens', icon='🏎️', duration=60,
           description='Moteur d’une Ferrari 250 GTO, modèle emblématique des années 1960.', tags=['Ferrari', '1960', 'voiture', 'moteur'],
           filename='Ferrari 250 GTO, Engine Sound.ogg', author='Provo rossi', license='CC BY 4.0', license_url=BY4,
           attribution='Ferrari 250 GTO, Engine Sound — Provo rossi — CC BY 4.0.', clip_duration=12),
    preset(id='sfx-historic-ship-engine', kind='sfx', title='Moteur d’un navire historique restauré', category='Histoire · Navigation', icon='🚢', duration=131,
           description='Moteur à combustion actuel du brise-glace historique Kuna, construit à l’origine en 1884 comme navire à vapeur.', tags=['navire', 'moteur', 'brise-glace', 'salle des machines'],
           filename='WWS IcebreakerKunashipsengine.ogg', author='Monika Widzicka / Work With Sounds', license='CC BY 4.0', license_url=BY4,
           attribution='Icebreaker Kuna ship engine — Monika Widzicka / Work With Sounds — CC BY 4.0.', clip_duration=12),
    preset(id='sfx-steamship-telegraph', kind='sfx', title='Télégraphe de machine d’un navire à vapeur', category='Histoire · Navigation', icon='🕹️', duration=27,
           description='Le télégraphe de la salle des machines du navire-musée à vapeur Sołdek transmet un ordre de vitesse.', tags=['télégraphe', 'navire à vapeur', 'pont', 'salle des machines'],
           filename='WWS ShipSodekengineordertelegraph.ogg', author='Monika Widzicka / Work With Sounds', license='CC BY 4.0', license_url=BY4,
           attribution='Sołdek engine order telegraph — Monika Widzicka / Work With Sounds — CC BY 4.0.', clip_duration=10),
    preset(id='sfx-historic-ship-bell', kind='sfx', title='Cloche de navire', category='Histoire · Navigation', icon='🔔', duration=18,
           description='Cloche du brise-glace historique Kuna, utilisée pour marquer les heures de quart.', tags=['cloche', 'navire', 'quart', 'pont'],
           filename='WWS IcebreakerKunashipsbell.ogg', author='Monika Widzicka / Work With Sounds', license='CC BY 4.0', license_url=BY4,
           attribution='Icebreaker Kuna ship bell — Monika Widzicka / Work With Sounds — CC BY 4.0.', clip_duration=8),
    preset(id='sfx-seaport-ambience', kind='sfx', title='Port maritime : machines, mouettes et vagues', category='Lieux historiques · Ports', icon='⚓', duration=725,
           description='Ambiance de port avec machines lointaines, mouettes, bateau occasionnel et vagues sur la jetée.', tags=['port', 'mouettes', 'vagues', 'bateau'],
           filename='Algemene sfeer van een zeehaven - SoundCloud - Beeld en Geluid.ogg', author='Eigen Opnames / Beeld en Geluid', license='CC BY-SA 3.0', license_url=BYSA3,
           attribution='Algemene sfeer van een zeehaven — Eigen Opnames / Beeld en Geluid — CC BY-SA 3.0.', clip_duration=15),
    preset(id='sfx-station-hall', kind='sfx', title='Hall de gare animé', category='Lieux historiques · Gares', icon='🚉', duration=41,
           description='Hall de gare avec voyageurs, cafés, kiosques et annonces réverbérées.', tags=['gare', 'voyageurs', 'annonces', 'hall'],
           filename='WWS TheStationHallOfTheTampereStation.ogg', author='Laura Vaara / Work With Sounds', license='CC BY 4.0', license_url=BY4,
           attribution='Tampere station hall — Laura Vaara / Work With Sounds — CC BY 4.0.', clip_duration=15),
    preset(id='sfx-1950s-signal-horn', kind='sfx', title='Cor de signalisation ferroviaire des années 1950', category='Histoire · Signaux', icon='📯', duration=10,
           description='Cor métallique utilisé par un agent de manœuvre d’un chemin de fer industriel dans les années 1950.', tags=['cor', 'signal', 'chemin de fer', '1950'],
           filename='WWS Signalhorn.ogg', author='Work With Sounds / LWL Industrial Museum', license='CC BY 4.0', license_url=BY4,
           attribution='Signal horn — Work With Sounds — CC BY 4.0.'),
    preset(id='sfx-1950s-signal-whistle', kind='sfx', title='Sifflet ferroviaire de manœuvre des années 1950', category='Histoire · Signaux', icon='📣', duration=11,
           description='Sifflet utilisé pour communiquer pendant les manœuvres d’un chemin de fer industriel.', tags=['sifflet', 'train', 'manœuvre', '1950'],
           filename='WWS SignallingWhistle.ogg', author='Work With Sounds / LWL Industrial Museum', license='CC BY 4.0', license_url=BY4,
           attribution='Signalling whistle — Work With Sounds — CC BY 4.0.'),
    preset(id='sfx-historic-smithy-cutting', kind='sfx', title='Acier chaud coupé dans une forge historique', category='Histoire · Artisanat', icon='⚒️', duration=12,
           description='Un forgeron coupe manuellement une pièce d’acier chaud avec un ciseau et un marteau.', tags=['forge', 'acier', 'marteau', 'artisan'],
           filename='WWS Watersmithysteelcutting.ogg', author='Work With Sounds', license='CC BY 4.0', license_url=BY4,
           attribution='Water smithy steel cutting — Work With Sounds — CC BY 4.0.'),
    preset(id='sfx-dense-forest-ambience', kind='sfx', title='Forêt dense : oiseaux, insectes et vent', category='Lieux historiques · Nature', icon='🌴', duration=123,
           description='Ambiance naturelle de forêt avec oiseaux, corneilles, insectes et souffle du vent.', tags=['forêt', 'jungle', 'oiseaux', 'insectes'],
           filename='20090610 0 ambience.ogg', author='nille / PDSounds.org', license='Domaine public', license_url=PD,
           attribution='Forest ambience — nille / PDSounds.org — domaine public.', clip_duration=15),
    preset(id='sfx-busy-common-room', kind='sfx', title='Salle animée avec conversations', category='Lieux historiques · Société', icon='🍺', duration=1200,
           description='Fond sonore doux d’un café rempli de personnes qui discutent, utilisable comme salle commune ou auberge sans prétendre à une reconstitution historique.', tags=['salle', 'conversations', 'auberge', 'foule'],
           filename='Cafe ambiance.ogg', author='Marble Toast', license='CC0', license_url=CC0,
           attribution='Cafe ambiance — Marble Toast — CC0.', clip_duration=15),
    preset(id='sfx-wilhelm-scream', kind='sfx', title='Cri de douleur — Wilhelm', category='Histoire · Action', icon='😱', duration=1.6,
           description='Le célèbre cri de douleur utilisé comme effet sonore au cinéma depuis les années 1950.', tags=['cri', 'douleur', 'chute', 'combat'],
           filename='Wilhelm Scream.ogg', author='Enregistrement patrimonial publié sur Wikimedia Commons', license='CC0', license_url=CC0,
           attribution='Wilhelm Scream — CC0.'),
    preset(id='sfx-military-reveille', kind='sfx', title='Réveil militaire au clairon', category='Histoire · Armée', icon='🎺', duration=23,
           description='Sonnerie militaire américaine « Reveille » jouée au clairon.', tags=['clairon', 'armée', 'réveil', 'caserne'],
           filename='Reveille.ogg', author='Sgt. Codie Lynn Williams, U.S. Marine Corps', license='Domaine public', license_url=PD,
           attribution='Reveille — Sgt. Codie Lynn Williams, U.S. Marine Corps — domaine public.', clip_duration=12),
    preset(id='sfx-steamboat-horn', kind='sfx', title='Corne d’un bateau à vapeur', category='Histoire · Navigation', icon='🛳️', duration=1.9,
           description='Coup de corne bref du bateau à vapeur Blümlisalp.', tags=['bateau à vapeur', 'corne', 'lac', 'navigation'],
           filename='Blümlisalp Horn.ogg', author='Nachtbold', license='CC0', license_url=CC0,
           attribution='Blümlisalp Horn — Nachtbold — CC0.'),
    preset(id='sfx-gombe-market', kind='sfx', title='Grand marché très animé', category='Lieux historiques · Marchés', icon='🧺', duration=504,
           description='Long enregistrement d’un grand marché de Gombe avec vendeurs, clients et activité commerciale.', tags=['marché', 'vendeurs', 'foule', 'commerce'],
           filename='Ambient sound recording of Gombe Main Market.ogg', author='Bembety', license='CC BY-SA 4.0', license_url=BYSA4,
           attribution='Ambient sound recording of Gombe Main Market — Bembety — CC BY-SA 4.0.', clip_duration=15),
]


def audionautix(*, id: str, title: str, category: str, icon: str, duration: float, description: str, tags: list[str], filename: str) -> dict:
    return preset(id=id, kind='music', title=title, category=category, icon=icon, duration=duration,
                  description=description, tags=tags, filename=filename,
                  author='Jason Shaw / Audionautix', license='CC BY 3.0', license_url=BY3,
                  attribution=f'{title} — Jason Shaw / Audionautix — CC BY 3.0.', clip_duration=min(30, duration))


historical_music = [
    preset(id='music-medieval-story', kind='music', title='Récit médiéval', category='Époques · Moyen Âge', icon='🏰', duration=138,
           description='Musique cinématique aux couleurs médiévales, pensée pour les récits, marchés et contes.', tags=['médiéval', 'récit', 'marché', 'conte'],
           filename='Medieval Story by Frank Schröter.ogg', author='Frank Schröter', license='CC BY 4.0', license_url=BY4,
           attribution='Medieval Story — Frank Schröter — CC BY 4.0.', clip_duration=30),
    preset(id='music-medieval-dream', kind='music', title='Rêve médiéval', category='Époques · Moyen Âge', icon='🕯️', duration=141,
           description='Musique médiévale calme avec harpe et flûte à bec.', tags=['médiéval', 'calme', 'harpe', 'flûte'],
           filename='Medieval Dream by Frank Schröter.ogg', author='Frank Schröter', license='CC BY 4.0', license_url=BY4,
           attribution='Medieval Dream — Frank Schröter — CC BY 4.0.', clip_duration=30),
    preset(id='music-dueil-angoisseux', kind='music', title='Dueil angoisseux — XVe siècle', category='Époques · Moyen Âge', icon='📜', duration=125,
           description='Œuvre de Gilles Binchois dans une interprétation de Tetraktys.', tags=['XVe siècle', 'Binchois', 'médiéval', 'mélancolie'],
           filename='Dueil angoisseux.ogg', author='Gilles Binchois / interprétation Tetraktys', license='CC BY 3.0', license_url=BY3,
           attribution='Dueil angoisseux — Tetraktys — CC BY 3.0.', clip_duration=30),
    preset(id='music-breves-dies', kind='music', title='Breves dies hominis — musique médiévale', category='Époques · Moyen Âge', icon='⛪', duration=212,
           description='Chant médiéval attribué à Léonin ou Pérotin, interprété par Makemi.', tags=['chant', 'médiéval', 'Léonin', 'Pérotin'],
           filename='Breves dies hominis.ogg', author='Makemi', license='Domaine public', license_url=PD,
           attribution='Breves dies hominis — interprétation Makemi — domaine public.', clip_duration=30),
    preset(id='music-a-chantar', kind='music', title='A Chantar — chant occitan du XIIe siècle', category='Époques · Moyen Âge', icon='🎶', duration=71,
           description='Chanson occitane de la Comtesse de Die, seule mélodie conservée d’une trobairitz.', tags=['Occitanie', 'XIIe siècle', 'troubadour', 'chant'],
           filename='A Chantar.ogg', author='Comtesse de Die / chant Makemi', license='CC BY-SA 3.0', license_url=BYSA3,
           attribution='A Chantar — Makemi — CC BY-SA 3.0.', clip_duration=30),
    preset(id='music-o-frondens', kind='music', title='O frondens virga — Hildegarde de Bingen', category='Époques · Moyen Âge', icon='🌿', duration=118,
           description='Chant médiéval d’Hildegarde de Bingen interprété en direct par Makemi.', tags=['Hildegarde', 'chant', 'médiéval', 'religion'],
           filename='O frondens.ogg', author='Hildegarde de Bingen / interprétation Makemi', license='CC BY-SA 3.0', license_url=BYSA3,
           attribution='O frondens virga — Makemi — CC BY-SA 3.0.', clip_duration=30),
    preset(id='music-santa-maria', kind='music', title='Santa Maria, Strela do Dia — XIIIe siècle', category='Époques · Moyen Âge', icon='⭐', duration=150,
           description='Cantiga de Santa María issue de la cour d’Alphonse X, interprétée par Makemi.', tags=['Espagne', 'XIIIe siècle', 'cantiga', 'médiéval'],
           filename='Santa Maria.ogg', author='Interprétation Makemi', license='Domaine public', license_url=PD,
           attribution='Santa Maria, Strela do Dia — interprétation Makemi — domaine public.', clip_duration=30),
    preset(id='music-monteverdi-battle', kind='music', title='Monteverdi — musique de bataille', category='Époques · XVIIe siècle', icon='⚔️', duration=143,
           description='Passage de bataille du Combattimento di Tancredi e Clorinda de Claudio Monteverdi.', tags=['Monteverdi', 'bataille', 'baroque', 'XVIIe siècle'],
           filename='Monteverdi - Combattimento - Battle music.ogg', author='Trisdee na Patalung et ensemble', license='CC BY 2.5', license_url=BY25,
           attribution='Monteverdi, Combattimento — Trisdee na Patalung et ensemble — CC BY 2.5.', clip_duration=30),
    preset(id='music-janequin-la-guerre', kind='music', title='Janequin — La Guerre', category='Époques · Renaissance', icon='🛡️', duration=347,
           description='Œuvre de Clément Janequin composée pour évoquer la bataille de Marignan.', tags=['Renaissance', 'Marignan', 'guerre', 'Janequin'],
           filename='La Guerre by Clément Janequin.ogg', author='Cherry Creek High School Meistersingers / Struhs', license='CC0', license_url=CC0,
           attribution='La Guerre de Clément Janequin — Meistersingers / Struhs — CC0.', clip_duration=30),
    audionautix(id='music-egyptian-crawl', title='Égypte ancienne et désert', category='Lieux · Monde ancien', icon='🏺', duration=134,
                description='Ambiance instrumentale évocatrice du désert et de l’Égypte.', tags=['Égypte', 'désert', 'Antiquité', 'exotique'], filename='Audionautix-com-ccby-egyptiancrawl.mp3'),
    audionautix(id='music-epic-series', title='Grande aventure épique', category='Ambiances · Épique', icon='🏔️', duration=120,
                description='Musique ample pour une expédition, une conquête ou un moment décisif.', tags=['épique', 'aventure', 'conquête', 'héros'], filename='Audionautix-com-ccby-epicseries.mp3'),
    audionautix(id='music-epic-tv-theme', title='Générique historique épique', category='Ambiances · Épique', icon='👑', duration=97,
                description='Thème orchestral convenant à une introduction historique ambitieuse.', tags=['épique', 'générique', 'histoire', 'royal'], filename='Audionautix-com-ccby-epictvtheme.mp3'),
    audionautix(id='music-fight-scene', title='Scène de combat', category='Ambiances · Action', icon='⚔️', duration=140,
                description='Musique rythmée pour une bataille, une poursuite ou une confrontation.', tags=['combat', 'bataille', 'action', 'tension'], filename='Audionautix-com-ccby-fightscene.mp3'),
    audionautix(id='music-forest-rhythm', title='Rythme de la forêt', category='Lieux · Nature', icon='🌲', duration=232,
                description='Fond instrumental organique pour une forêt, une exploration ou un territoire sauvage.', tags=['forêt', 'nature', 'exploration', 'rythme'], filename='Audionautix-com-ccby-forestrhythm.mp3'),
    audionautix(id='music-intense-suspense', title='Suspense intense', category='Ambiances · Tension', icon='⏳', duration=93,
                description='Montée de tension pour une menace, une enquête ou un tournant dramatique.', tags=['suspense', 'danger', 'enquête', 'tension'], filename='Audionautix-com-ccby-intensesuspense.mp3'),
    audionautix(id='music-autumn-sunset', title='Paysage calme et nostalgique', category='Ambiances · Calme', icon='🍂', duration=96,
                description='Musique acoustique lente pour un paysage, un souvenir ou une conclusion.', tags=['calme', 'paysage', 'nostalgie', 'conclusion'], filename='Audionautix-com-ccby-autumnsunset.mp3'),
    audionautix(id='music-azimuth', title='Exploration lointaine', category='Lieux · Exploration', icon='🧭', duration=255,
                description='Musique électronique progressive pour un voyage, une découverte ou un espace inconnu.', tags=['exploration', 'voyage', 'découverte', 'lointain'], filename='Audionautix-com-ccby-azimuth.mp3'),
    audionautix(id='music-event-horizon', title='Menace et monde inconnu', category='Ambiances · Tension', icon='🌌', duration=198,
                description='Ambiance sombre et ample pour une catastrophe, une menace ou un monde inconnu.', tags=['menace', 'catastrophe', 'sombre', 'inconnu'], filename='Audionautix-com-ccby-eventhorizon.mp3'),
    audionautix(id='music-legends-river', title='Légendes du fleuve', category='Lieux · Eau et ports', icon='🌊', duration=116,
                description='Fond instrumental pour un fleuve, un port ou un récit de navigation.', tags=['fleuve', 'port', 'navigation', 'légende'], filename='Audionautix-com-ccby-legendsoftheriver.mp3'),
    audionautix(id='music-atlantis', title='Cité engloutie et exploration maritime', category='Lieux · Eau et ports', icon='🔱', duration=114,
                description='Musique mystérieuse pour une mer lointaine, une île ou une cité perdue.', tags=['mer', 'île', 'mystère', 'exploration'], filename='Audionautix-com-ccby-atlantis.mp3'),
]

library = LIB_PATH.read_text(encoding='utf-8')
marker = 'export const AUDIO_LIBRARY: LibraryPreset[] = '
array_start = library.index('[', library.index(marker) + len(marker))
array_end = library.index('] as LibraryPreset[];', array_start) + 1
items: list[dict] = json.loads(library[array_start:array_end])
existing_ids = {item['id'] for item in items}
for item in historical_sfx + historical_music:
    if item['id'] not in existing_ids:
        items.append(item)
        existing_ids.add(item['id'])

music = sorted([item for item in items if item.get('kind') == 'music'], key=lambda item: (item.get('category', ''), item.get('title', '')))
sfx = sorted([item for item in items if item.get('kind') == 'sfx'], key=lambda item: (item.get('category', ''), item.get('title', '')))
items = music + sfx
library = library[:array_start] + json.dumps(items, ensure_ascii=False, indent=2) + library[array_end:]
LIB_PATH.write_text(library, encoding='utf-8')

rows = []
for item in items:
    rows.append(
        '<tr>'
        f'<td>{html.escape(item["title"])}</td>'
        f'<td>{"Musique" if item["kind"] == "music" else "Bruitage"}</td>'
        f'<td>{html.escape(item["author"])}</td>'
        f'<td><a href="{html.escape(item["licenseUrl"])}">{html.escape(item["license"])}</a></td>'
        f'<td><a href="{html.escape(item["sourcePage"])}">Source</a></td>'
        '</tr>'
    )
credits = '''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Crédits audio — Podcast Facile</title><style>body{font:16px system-ui;margin:0;background:#f7f9fc;color:#17243b}main{max-width:1100px;margin:auto;padding:32px 18px}h1{margin-bottom:8px}p{line-height:1.5}table{width:100%;border-collapse:collapse;background:white;border-radius:14px;overflow:hidden}th,td{text-align:left;padding:10px;border-bottom:1px solid #e5e9f1;font-size:14px}th{background:#edf3ff}a{color:#2457d6}@media(max-width:700px){table,tbody,tr,td{display:block}thead{display:none}tr{padding:10px;border-bottom:1px solid #ddd}td{border:0;padding:4px 8px}}</style></head><body><main><h1>Crédits audio — Podcast Facile</h1><p>Les bruitages sont exclusivement des enregistrements réels. Les musiques et les enregistrements externes sont hébergés par Wikimedia Commons et restent associés à leur auteur et à leur licence.</p><table><thead><tr><th>Titre dans l’application</th><th>Type</th><th>Auteur</th><th>Licence</th><th>Fichier</th></tr></thead><tbody>''' + ''.join(rows) + '</tbody></table></main></body></html>'
CREDITS_PATH.write_text(credits, encoding='utf-8')

sfx_count = len(sfx)
music_count = len(music)
if sfx_count < 120:
    raise RuntimeError(f'Bibliothèque historique insuffisante : {sfx_count} bruitages.')
if music_count < 30:
    raise RuntimeError(f'Bibliothèque musicale insuffisante : {music_count} morceaux.')
combined = LIB_PATH.read_text(encoding='utf-8')
for forbidden in ('generated:', 'synthesizeGeneratedEffect', 'loadGeneratedAudio'):
    if forbidden in combined:
        raise RuntimeError(f'Un son synthétique subsiste : {forbidden}')
required_ids = {
    'sfx-horse-gallop-pavement', 'sfx-steam-locomotive', 'sfx-seaport-ambience',
    'sfx-steamship-telegraph', 'sfx-dense-forest-ambience', 'music-medieval-story',
    'music-monteverdi-battle', 'music-epic-series', 'music-egyptian-crawl',
}
missing = sorted(required_ids - {item['id'] for item in items})
if missing:
    raise RuntimeError(f'Éléments historiques manquants : {missing}')

print(f'Bibliothèque historique enrichie : {sfx_count} bruitages réels et {music_count} musiques.')
