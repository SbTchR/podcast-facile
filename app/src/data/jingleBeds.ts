import type { PodcastBlock } from '../types';

export type JingleStyle = NonNullable<PodcastBlock['jingle']>['style'];
export type JingleVariant = 'standard' | 'extended';
export interface JingleBed {
  id: string;
  style: JingleStyle;
  variant: JingleVariant;
  label: string;
  title: string;
  description: string;
  effect: string;
  duration: number;
  filename: string;
  sourcePage: string;
  author: string;
  licenseName: string;
  licenseUrl: string;
  changes: string;
}

// Prepared, fixed musical beds; the podcast's general library stays separate.
export const JINGLE_BEDS: JingleBed[] = [
  {
    "id": "jingle-bed-dynamic-25-v5",
    "style": "dynamic",
    "label": "Dynamique",
    "title": "Hurry Funk Intro",
    "description": "Un générique funk rythmé pour démarrer avec énergie.",
    "effect": "Titre brillant, rappel électrique bien audible.",
    "duration": 25,
    "filename": "dynamic-pixabay-25.mp3",
    "sourcePage": "https://pixabay.com/music/upbeat-hurry-funk-intro-326085/",
    "author": "Diamond_Tunes",
    "licenseUrl": "https://pixabay.com/service/license-summary/",
    "variant": "standard",
    "licenseName": "Pixabay Content License",
    "changes": "Arrangement de 25 secondes pour le mixage avec les voix du jingle : extrait avec fin musicale conservée ; raccords, niveau et fin musicale ajustés."
  },
  {
    "id": "jingle-bed-dynamic-35-v5",
    "style": "dynamic",
    "label": "Dynamique",
    "title": "Hurry Funk Intro",
    "description": "Un générique funk rythmé pour démarrer avec énergie.",
    "effect": "Titre brillant, rappel électrique bien audible.",
    "duration": 35,
    "filename": "dynamic-pixabay-35.mp3",
    "sourcePage": "https://pixabay.com/music/upbeat-hurry-funk-intro-326085/",
    "author": "Diamond_Tunes",
    "licenseUrl": "https://pixabay.com/service/license-summary/",
    "variant": "extended",
    "licenseName": "Pixabay Content License",
    "changes": "Arrangement de 35 secondes pour le mixage avec les voix du jingle : phrases musicales centrales raccourcies ou reprises, sans changement de tempo ni de hauteur ; raccords, niveau et fin musicale ajustés."
  },
  {
    "id": "jingle-bed-adventure-25-v5",
    "style": "adventure",
    "label": "Aventure",
    "title": "Spirit Of Adventure Powerful Opening",
    "description": "Une ouverture épique pour partir à l’aventure.",
    "effect": "Titre ample, rappel électrique chaleureux.",
    "duration": 25,
    "filename": "adventure-pixabay-25.mp3",
    "sourcePage": "https://pixabay.com/music/main-title-spirit-of-adventure-powerful-opening-146810/",
    "author": "Hot_Dope",
    "licenseUrl": "https://pixabay.com/service/license-summary/",
    "variant": "standard",
    "licenseName": "Pixabay Content License",
    "changes": "Arrangement de 25 secondes pour le mixage avec les voix du jingle : phrases musicales centrales raccourcies ou reprises, sans changement de tempo ni de hauteur ; raccords, niveau et fin musicale ajustés."
  },
  {
    "id": "jingle-bed-adventure-35-v5",
    "style": "adventure",
    "label": "Aventure",
    "title": "Spirit Of Adventure Powerful Opening",
    "description": "Une ouverture épique pour partir à l’aventure.",
    "effect": "Titre ample, rappel électrique chaleureux.",
    "duration": 35,
    "filename": "adventure-pixabay-35.mp3",
    "sourcePage": "https://pixabay.com/music/main-title-spirit-of-adventure-powerful-opening-146810/",
    "author": "Hot_Dope",
    "licenseUrl": "https://pixabay.com/service/license-summary/",
    "variant": "extended",
    "licenseName": "Pixabay Content License",
    "changes": "Arrangement de 35 secondes pour le mixage avec les voix du jingle : phrases musicales centrales raccourcies ou reprises, sans changement de tempo ni de hauteur ; raccords, niveau et fin musicale ajustés."
  },
  {
    "id": "jingle-bed-historical-25-v5",
    "style": "historical",
    "label": "Historique",
    "title": "Short Heroic Orchestral Loop",
    "description": "Un thème orchestral héroïque pour voyager dans le temps.",
    "effect": "Titre chaleureux, rappel électrique et espace de salle léger.",
    "duration": 25,
    "filename": "historical-pixabay-25.mp3",
    "sourcePage": "https://pixabay.com/music/adventure-short-heroic-orchestral-loop-541095/",
    "author": "NR-Music",
    "licenseUrl": "https://pixabay.com/service/license-summary/",
    "variant": "standard",
    "licenseName": "Pixabay Content License",
    "changes": "Arrangement de 25 secondes pour le mixage avec les voix du jingle : phrases musicales centrales raccourcies ou reprises, sans changement de tempo ni de hauteur ; raccords, niveau et fin musicale ajustés."
  },
  {
    "id": "jingle-bed-historical-35-v5",
    "style": "historical",
    "label": "Historique",
    "title": "Short Heroic Orchestral Loop",
    "description": "Un thème orchestral héroïque pour voyager dans le temps.",
    "effect": "Titre chaleureux, rappel électrique et espace de salle léger.",
    "duration": 35,
    "filename": "historical-pixabay-35.mp3",
    "sourcePage": "https://pixabay.com/music/adventure-short-heroic-orchestral-loop-541095/",
    "author": "NR-Music",
    "licenseUrl": "https://pixabay.com/service/license-summary/",
    "variant": "extended",
    "licenseName": "Pixabay Content License",
    "changes": "Arrangement de 35 secondes pour le mixage avec les voix du jingle : phrases musicales centrales raccourcies ou reprises, sans changement de tempo ni de hauteur ; raccords, niveau et fin musicale ajustés."
  },
  {
    "id": "jingle-bed-mysterious-25-v5",
    "style": "mysterious",
    "label": "Mystère",
    "title": "Cinematic of Emotions - Intro 11",
    "description": "Une ambiance cinématographique pour installer le suspense.",
    "effect": "Titre feutré, rappel électrique adapté à l’enquête.",
    "duration": 25,
    "filename": "mysterious-pixabay-25.mp3",
    "sourcePage": "https://pixabay.com/music/main-title-cinematic-of-emotions-intro-11-272366/",
    "author": "Voidwave",
    "licenseUrl": "https://pixabay.com/service/license-summary/",
    "variant": "standard",
    "licenseName": "Pixabay Content License",
    "changes": "Arrangement de 25 secondes pour le mixage avec les voix du jingle : phrases musicales centrales raccourcies ou reprises, sans changement de tempo ni de hauteur ; raccords, niveau et fin musicale ajustés."
  },
  {
    "id": "jingle-bed-mysterious-35-v5",
    "style": "mysterious",
    "label": "Mystère",
    "title": "Cinematic of Emotions - Intro 11",
    "description": "Une ambiance cinématographique pour installer le suspense.",
    "effect": "Titre feutré, rappel électrique adapté à l’enquête.",
    "duration": 35,
    "filename": "mysterious-pixabay-35.mp3",
    "sourcePage": "https://pixabay.com/music/main-title-cinematic-of-emotions-intro-11-272366/",
    "author": "Voidwave",
    "licenseUrl": "https://pixabay.com/service/license-summary/",
    "variant": "extended",
    "licenseName": "Pixabay Content License",
    "changes": "Arrangement de 35 secondes pour le mixage avec les voix du jingle : phrases musicales centrales raccourcies ou reprises, sans changement de tempo ni de hauteur ; raccords, niveau et fin musicale ajustés."
  },
  {
    "id": "jingle-bed-serious-25-v5",
    "style": "serious",
    "label": "Sérieux",
    "title": "Flash News 30 Seconds Buildup",
    "description": "Un générique d’actualité pour présenter un sujet avec assurance.",
    "effect": "Titre net, rappel électrique discret mais présent.",
    "duration": 25,
    "filename": "serious-pixabay-25.mp3",
    "sourcePage": "https://pixabay.com/music/upbeat-flash-news-30-seconds-buildup-431803/",
    "author": "Sonican",
    "licenseUrl": "https://pixabay.com/service/license-summary/",
    "variant": "standard",
    "licenseName": "Pixabay Content License",
    "changes": "Arrangement de 25 secondes pour le mixage avec les voix du jingle : phrases musicales centrales raccourcies ou reprises, sans changement de tempo ni de hauteur ; raccords, niveau et fin musicale ajustés."
  },
  {
    "id": "jingle-bed-serious-35-v5",
    "style": "serious",
    "label": "Sérieux",
    "title": "Flash News 30 Seconds Buildup",
    "description": "Un générique d’actualité pour présenter un sujet avec assurance.",
    "effect": "Titre net, rappel électrique discret mais présent.",
    "duration": 35,
    "filename": "serious-pixabay-35.mp3",
    "sourcePage": "https://pixabay.com/music/upbeat-flash-news-30-seconds-buildup-431803/",
    "author": "Sonican",
    "licenseUrl": "https://pixabay.com/service/license-summary/",
    "variant": "extended",
    "licenseName": "Pixabay Content License",
    "changes": "Arrangement de 35 secondes pour le mixage avec les voix du jingle : phrases musicales centrales raccourcies ou reprises, sans changement de tempo ni de hauteur ; raccords, niveau et fin musicale ajustés."
  },
  {
    "id": "jingle-bed-modern-radio-25-v4",
    "style": "modern-radio",
    "label": "Radio",
    "title": "Funky Chunk",
    "description": "Basse, guitare et cuivres : un générique funk chaleureux et entraînant.",
    "effect": "Titre présent, rappel électrique pour une signature radio.",
    "duration": 25,
    "filename": "modern-radio-25.mp3",
    "sourcePage": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1500054",
    "author": "Kevin MacLeod / Incompetech",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "variant": "standard",
    "licenseName": "CC BY 4.0",
    "changes": "Adaptation pour jingle : extrait calibré à 25 ou 35 secondes, phrases musicales prolongées selon le style, niveau et fondus ajustés ; mixage avec les voix du podcast."
  },
  {
    "id": "jingle-bed-modern-radio-35-v4",
    "style": "modern-radio",
    "label": "Radio",
    "title": "Funky Chunk",
    "description": "Basse, guitare et cuivres : un générique funk chaleureux et entraînant.",
    "effect": "Titre présent, rappel électrique pour une signature radio.",
    "duration": 35,
    "filename": "modern-radio-35.mp3",
    "sourcePage": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1500054",
    "author": "Kevin MacLeod / Incompetech",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "variant": "extended",
    "licenseName": "CC BY 4.0",
    "changes": "Adaptation pour jingle : extrait calibré à 25 ou 35 secondes, phrases musicales prolongées selon le style, niveau et fondus ajustés ; mixage avec les voix du podcast."
  }
];
export const JINGLE_STYLES = JINGLE_BEDS.filter((bed) => bed.variant === 'standard');
const LEGACY_JINGLE_BEDS: JingleBed[] = [
  {
    "id": "jingle-bed-dynamic-v3.1",
    "style": "dynamic",
    "label": "Dynamique",
    "title": "Disco Sting",
    "description": "Synthés, basse et batterie : un départ disco énergique.",
    "effect": "Titre clair, répétition plus douce une seconde après.",
    "duration": 17.08448979591837,
    "filename": "dynamic.mp3",
    "sourcePage": "https://commons.wikimedia.org/wiki/File:Disco_Sting_(ISRC_USUAN1100363).mp3",
    "author": "Kevin MacLeod / Incompetech",
    "licenseUrl": "https://creativecommons.org/licenses/by/3.0/",
    "variant": "standard",
    "licenseName": "CC BY 3.0",
    "changes": "Retrait des silences extérieurs, maintien d’une phrase musicale centrale selon le style, niveau et fondus ajustés ; mixage avec les voix."
  },
  {
    "id": "jingle-bed-adventure-v3.1",
    "style": "adventure",
    "label": "Aventure",
    "title": "Hero Theme",
    "description": "Piano et orchestre : une courte ouverture héroïque.",
    "effect": "Titre ample, espace orchestral et rappel discret.",
    "duration": 19.55,
    "filename": "adventure.mp3",
    "sourcePage": "https://commons.wikimedia.org/wiki/File:Hero_Theme_(ISRC_USUAN1100491).mp3",
    "author": "Kevin MacLeod / Incompetech",
    "licenseUrl": "https://creativecommons.org/licenses/by/3.0/",
    "variant": "standard",
    "licenseName": "CC BY 3.0",
    "changes": "Retrait des silences extérieurs, maintien d’une phrase musicale centrale selon le style, niveau et fondus ajustés ; mixage avec les voix."
  },
  {
    "id": "jingle-bed-historical-v3.1",
    "style": "historical",
    "label": "Historique",
    "title": "The Curtain Rises",
    "description": "Ouverture orchestrale classique pour raconter et voyager dans le temps.",
    "effect": "Titre chaleureux, réverbération de salle légère.",
    "duration": 22.97,
    "filename": "historical.mp3",
    "sourcePage": "https://commons.wikimedia.org/wiki/File:The_Curtain_Rises_(ISRC_USUAN1500011).mp3",
    "author": "Kevin MacLeod / Incompetech",
    "licenseUrl": "https://creativecommons.org/licenses/by/3.0/",
    "variant": "standard",
    "licenseName": "CC BY 3.0",
    "changes": "Retrait des silences extérieurs, maintien d’une phrase musicale centrale selon le style, niveau et fondus ajustés ; mixage avec les voix."
  },
  {
    "id": "jingle-bed-mysterious-v3.1",
    "style": "mysterious",
    "label": "Mystère",
    "title": "Mystery Sting",
    "description": "Une introduction courte pour une énigme ou une enquête.",
    "effect": "Titre feutré, écho doux et un peu d’espace.",
    "duration": 17.15,
    "filename": "mysterious.mp3",
    "sourcePage": "https://commons.wikimedia.org/wiki/File:Mystery_Sting_(ISRC_USUAN1100430).mp3",
    "author": "Kevin MacLeod / Incompetech",
    "licenseUrl": "https://creativecommons.org/licenses/by/3.0/",
    "variant": "standard",
    "licenseName": "CC BY 3.0",
    "changes": "Retrait des silences extérieurs, maintien d’une phrase musicale centrale selon le style, niveau et fondus ajustés ; mixage avec les voix."
  },
  {
    "id": "jingle-bed-serious-v3.1",
    "style": "serious",
    "label": "Sérieux",
    "title": "Piano Between",
    "description": "Piano sobre pour présenter un sujet ou un reportage.",
    "effect": "Titre net, rappel très discret ; présentation naturelle.",
    "duration": 20.13,
    "filename": "serious.mp3",
    "sourcePage": "https://commons.wikimedia.org/wiki/File:Piano_Between_(ISRC_USUAN1100490).mp3",
    "author": "Kevin MacLeod / Incompetech",
    "licenseUrl": "https://creativecommons.org/licenses/by/3.0/",
    "variant": "standard",
    "licenseName": "CC BY 3.0",
    "changes": "Retrait des silences extérieurs, maintien d’une phrase musicale centrale selon le style, niveau et fondus ajustés ; mixage avec les voix."
  },
  {
    "id": "jingle-bed-modern-radio-v3.1",
    "style": "modern-radio",
    "label": "Radio",
    "title": "NewsSting",
    "description": "Un générique d’actualité avec cuivres et rythme radio.",
    "effect": "Titre présent, double plus doux et filtré une seconde après.",
    "duration": 19.32,
    "filename": "modern-radio.mp3",
    "sourcePage": "https://commons.wikimedia.org/wiki/File:NewsSting_(ISRC_USUAN1100361).mp3",
    "author": "Kevin MacLeod / Incompetech",
    "licenseUrl": "https://creativecommons.org/licenses/by/3.0/",
    "variant": "standard",
    "licenseName": "CC BY 3.0",
    "changes": "Retrait des silences extérieurs, maintien d’une phrase musicale centrale selon le style, niveau et fondus ajustés ; mixage avec les voix."
  }
];
// Previous music remains credited for projects that already contain it.
const PREVIOUS_JINGLE_BEDS: JingleBed[] = [
  {
    "id": "jingle-bed-dynamic-25-v4",
    "style": "dynamic",
    "label": "Dynamique",
    "title": "Disco Sting",
    "description": "Synthés, basse et batterie : un départ disco énergique.",
    "effect": "Titre brillant, rappel électrique bien audible.",
    "duration": 25,
    "filename": "dynamic-25.mp3",
    "sourcePage": "https://commons.wikimedia.org/wiki/File:Disco_Sting_(ISRC_USUAN1100363).mp3",
    "author": "Kevin MacLeod / Incompetech",
    "licenseUrl": "https://creativecommons.org/licenses/by/3.0/",
    "variant": "standard",
    "licenseName": "CC BY 3.0",
    "changes": "Adaptation pour jingle : extrait calibré à 25 ou 35 secondes, phrases musicales prolongées selon le style, niveau et fondus ajustés ; mixage avec les voix du podcast."
  },
  {
    "id": "jingle-bed-dynamic-35-v4",
    "style": "dynamic",
    "label": "Dynamique",
    "title": "Disco Sting",
    "description": "Synthés, basse et batterie : un départ disco énergique.",
    "effect": "Titre brillant, rappel électrique bien audible.",
    "duration": 35,
    "filename": "dynamic-35.mp3",
    "sourcePage": "https://commons.wikimedia.org/wiki/File:Disco_Sting_(ISRC_USUAN1100363).mp3",
    "author": "Kevin MacLeod / Incompetech",
    "licenseUrl": "https://creativecommons.org/licenses/by/3.0/",
    "variant": "extended",
    "licenseName": "CC BY 3.0",
    "changes": "Adaptation pour jingle : extrait calibré à 25 ou 35 secondes, phrases musicales prolongées selon le style, niveau et fondus ajustés ; mixage avec les voix du podcast."
  },
  {
    "id": "jingle-bed-adventure-25-v4",
    "style": "adventure",
    "label": "Aventure",
    "title": "Hero Theme",
    "description": "Piano et orchestre : une courte ouverture héroïque.",
    "effect": "Titre ample, rappel électrique chaleureux.",
    "duration": 25,
    "filename": "adventure-25.mp3",
    "sourcePage": "https://commons.wikimedia.org/wiki/File:Hero_Theme_(ISRC_USUAN1100491).mp3",
    "author": "Kevin MacLeod / Incompetech",
    "licenseUrl": "https://creativecommons.org/licenses/by/3.0/",
    "variant": "standard",
    "licenseName": "CC BY 3.0",
    "changes": "Adaptation pour jingle : extrait calibré à 25 ou 35 secondes, phrases musicales prolongées selon le style, niveau et fondus ajustés ; mixage avec les voix du podcast."
  },
  {
    "id": "jingle-bed-adventure-35-v4",
    "style": "adventure",
    "label": "Aventure",
    "title": "Hero Theme",
    "description": "Piano et orchestre : une courte ouverture héroïque.",
    "effect": "Titre ample, rappel électrique chaleureux.",
    "duration": 35,
    "filename": "adventure-35.mp3",
    "sourcePage": "https://commons.wikimedia.org/wiki/File:Hero_Theme_(ISRC_USUAN1100491).mp3",
    "author": "Kevin MacLeod / Incompetech",
    "licenseUrl": "https://creativecommons.org/licenses/by/3.0/",
    "variant": "extended",
    "licenseName": "CC BY 3.0",
    "changes": "Adaptation pour jingle : extrait calibré à 25 ou 35 secondes, phrases musicales prolongées selon le style, niveau et fondus ajustés ; mixage avec les voix du podcast."
  },
  {
    "id": "jingle-bed-historical-25-v4",
    "style": "historical",
    "label": "Historique",
    "title": "The Curtain Rises",
    "description": "Ouverture orchestrale classique pour raconter et voyager dans le temps.",
    "effect": "Titre chaleureux, rappel électrique et espace de salle léger.",
    "duration": 25,
    "filename": "historical-25.mp3",
    "sourcePage": "https://commons.wikimedia.org/wiki/File:The_Curtain_Rises_(ISRC_USUAN1500011).mp3",
    "author": "Kevin MacLeod / Incompetech",
    "licenseUrl": "https://creativecommons.org/licenses/by/3.0/",
    "variant": "standard",
    "licenseName": "CC BY 3.0",
    "changes": "Adaptation pour jingle : extrait calibré à 25 ou 35 secondes, phrases musicales prolongées selon le style, niveau et fondus ajustés ; mixage avec les voix du podcast."
  },
  {
    "id": "jingle-bed-historical-35-v4",
    "style": "historical",
    "label": "Historique",
    "title": "The Curtain Rises",
    "description": "Ouverture orchestrale classique pour raconter et voyager dans le temps.",
    "effect": "Titre chaleureux, rappel électrique et espace de salle léger.",
    "duration": 35,
    "filename": "historical-35.mp3",
    "sourcePage": "https://commons.wikimedia.org/wiki/File:The_Curtain_Rises_(ISRC_USUAN1500011).mp3",
    "author": "Kevin MacLeod / Incompetech",
    "licenseUrl": "https://creativecommons.org/licenses/by/3.0/",
    "variant": "extended",
    "licenseName": "CC BY 3.0",
    "changes": "Adaptation pour jingle : extrait calibré à 25 ou 35 secondes, phrases musicales prolongées selon le style, niveau et fondus ajustés ; mixage avec les voix du podcast."
  },
  {
    "id": "jingle-bed-mysterious-25-v4",
    "style": "mysterious",
    "label": "Mystère",
    "title": "Crypto",
    "description": "Flûte, pulsation feutrée et textures électroniques pour une enquête.",
    "effect": "Titre feutré, rappel électrique adapté à l’enquête.",
    "duration": 25,
    "filename": "mysterious-25.mp3",
    "sourcePage": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600013",
    "author": "Kevin MacLeod / Incompetech",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "variant": "standard",
    "licenseName": "CC BY 4.0",
    "changes": "Adaptation pour jingle : extrait calibré à 25 ou 35 secondes, phrases musicales prolongées selon le style, niveau et fondus ajustés ; mixage avec les voix du podcast."
  },
  {
    "id": "jingle-bed-mysterious-35-v4",
    "style": "mysterious",
    "label": "Mystère",
    "title": "Crypto",
    "description": "Flûte, pulsation feutrée et textures électroniques pour une enquête.",
    "effect": "Titre feutré, rappel électrique adapté à l’enquête.",
    "duration": 35,
    "filename": "mysterious-35.mp3",
    "sourcePage": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1600013",
    "author": "Kevin MacLeod / Incompetech",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "variant": "extended",
    "licenseName": "CC BY 4.0",
    "changes": "Adaptation pour jingle : extrait calibré à 25 ou 35 secondes, phrases musicales prolongées selon le style, niveau et fondus ajustés ; mixage avec les voix du podcast."
  },
  {
    "id": "jingle-bed-serious-25-v4",
    "style": "serious",
    "label": "Sérieux",
    "title": "Impact Moderato",
    "description": "Guitare et percussions sobres : un générique posé de reportage.",
    "effect": "Titre net, rappel électrique discret mais présent.",
    "duration": 25,
    "filename": "serious-25.mp3",
    "sourcePage": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100618",
    "author": "Kevin MacLeod / Incompetech",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "variant": "standard",
    "licenseName": "CC BY 4.0",
    "changes": "Adaptation pour jingle : extrait calibré à 25 ou 35 secondes, phrases musicales prolongées selon le style, niveau et fondus ajustés ; mixage avec les voix du podcast."
  },
  {
    "id": "jingle-bed-serious-35-v4",
    "style": "serious",
    "label": "Sérieux",
    "title": "Impact Moderato",
    "description": "Guitare et percussions sobres : un générique posé de reportage.",
    "effect": "Titre net, rappel électrique discret mais présent.",
    "duration": 35,
    "filename": "serious-35.mp3",
    "sourcePage": "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100618",
    "author": "Kevin MacLeod / Incompetech",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "variant": "extended",
    "licenseName": "CC BY 4.0",
    "changes": "Adaptation pour jingle : extrait calibré à 25 ou 35 secondes, phrases musicales prolongées selon le style, niveau et fondus ajustés ; mixage avec les voix du podcast."
  }
];
// Old projects retain the credits of the recording they actually contain.
export const JINGLE_CREDIT_BEDS = [...JINGLE_BEDS, ...PREVIOUS_JINGLE_BEDS, ...LEGACY_JINGLE_BEDS];

export function getJingleBed(style: JingleStyle, bedId?: string, variant: JingleVariant = 'standard'): JingleBed {
  const savedVariant = JINGLE_CREDIT_BEDS.find(bed => bed.style === style && bed.id === bedId)?.variant;
  return JINGLE_BEDS.find((bed) => bed.style === style && bed.id === bedId)
    ?? JINGLE_BEDS.find((bed) => bed.style === style && bed.variant === (savedVariant ?? variant))
    ?? JINGLE_STYLES[5];
}

export function getJingleVariants(style: JingleStyle): JingleBed[] {
  return JINGLE_BEDS.filter((bed) => bed.style === style);
}

const cache = new Map<string, Promise<Blob>>();
export async function loadJingleBed(bed: JingleBed): Promise<Blob> {
  const cached = cache.get(bed.id);
  if (cached) return cached;
  const request = fetch(`${import.meta.env.BASE_URL}audio/jingles/${bed.filename}?v=${bed.id}`, { signal: AbortSignal.timeout(12000) }).then(async (response) => {
    if (!response.ok) throw new Error('La musique du jingle ne se charge pas. Réessaie.');
    const blob = await response.blob();
    if (!blob.size) throw new Error('La musique du jingle est vide.');
    return blob;
  });
  cache.set(bed.id, request);
  try { return await request; } catch (error) { cache.delete(bed.id); throw error; }
}
