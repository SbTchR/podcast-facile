import type { LibraryPreset } from './audioLibrary';
import { CURATED_JINGLE_ENDINGS } from './curatedJingleEndings';

export interface JingleEnding {
  id: string; title: string; icon: string; filename: string; duration: number;
  sourcePage: string; author: string; licenseName: string; licenseUrl: string; changes: string;
}

// Preserve credit information for recordings embedded in earlier project files.
export const LEGACY_JINGLE_ENDINGS: JingleEnding[] = [
  {
    "id": "jingle-ending-bell",
    "title": "Cloche",
    "icon": "🔔",
    "filename": "bell.wav",
    "duration": 2.5,
    "sourcePage": "https://commons.wikimedia.org/wiki/File:WWS_IcebreakerKunashipsbell.ogg",
    "author": "Monika Widzicka / Work With Sounds",
    "licenseName": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "changes": "Extrait court (2.50 s), mono 44,1 kHz, niveau et fondus ajustés ; mixage facultatif à la fin du jingle."
  },
  {
    "id": "jingle-ending-horn",
    "title": "Klaxon",
    "icon": "🚗",
    "filename": "horn.wav",
    "duration": 2.5,
    "sourcePage": "https://commons.wikimedia.org/wiki/File:Car_Horn.wav",
    "author": "15HPanska_Ruttner_Jan",
    "licenseName": "CC0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "changes": "Extrait court (2.50 s), mono 44,1 kHz, niveau et fondus ajustés ; mixage facultatif à la fin du jingle."
  },
  {
    "id": "jingle-ending-ship",
    "title": "Corne de bateau",
    "icon": "🚢",
    "filename": "ship.wav",
    "duration": 1.89,
    "sourcePage": "https://commons.wikimedia.org/wiki/File:Bl%C3%BCmlisalp_Horn.ogg",
    "author": "Nachtbold",
    "licenseName": "CC0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "changes": "Extrait court (1.89 s), mono 44,1 kHz, niveau et fondus ajustés ; mixage facultatif à la fin du jingle."
  },
  {
    "id": "jingle-ending-drumroll",
    "title": "Roulement de tambour",
    "icon": "🥁",
    "filename": "drumroll.wav",
    "duration": 2.782721088435374,
    "sourcePage": "https://commons.wikimedia.org/wiki/File:Drum_Roll_Intro.ogg",
    "author": "Iwan Sounds and DIY",
    "licenseName": "CC0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "changes": "Extrait court (2.78 s), mono 44,1 kHz, niveau et fondus ajustés ; mixage facultatif à la fin du jingle."
  },
  {
    "id": "jingle-ending-bicycle",
    "title": "Sonnette de vélo",
    "icon": "🚲",
    "filename": "bicycle.wav",
    "duration": 1.29,
    "sourcePage": "https://commons.wikimedia.org/wiki/File:Rotating-bicycle-bell.wav",
    "author": "AntumDeluge",
    "licenseName": "CC0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "changes": "Extrait court (1.29 s), mono 44,1 kHz, niveau et fondus ajustés ; mixage facultatif à la fin du jingle."
  },
  {
    "id": "jingle-ending-doorbell",
    "title": "Ding-dong",
    "icon": "🏠",
    "filename": "doorbell.wav",
    "duration": 2.8,
    "sourcePage": "https://commons.wikimedia.org/wiki/File:Sound_Effect_-_Door_Bell.ogg",
    "author": "Amada44",
    "licenseName": "Domaine public",
    "licenseUrl": "https://creativecommons.org/publicdomain/mark/1.0/",
    "changes": "Extrait court (2.80 s), mono 44,1 kHz, niveau et fondus ajustés ; mixage facultatif à la fin du jingle."
  }
];

// A deliberately short selection, separate from the complete podcast sound library.
export const JINGLE_ENDINGS = CURATED_JINGLE_ENDINGS;
export const JINGLE_CREDIT_ENDINGS = [...JINGLE_ENDINGS, ...LEGACY_JINGLE_ENDINGS];

export function endingPreviewPreset(ending: JingleEnding): LibraryPreset {
  const audioUrl = `${import.meta.env.BASE_URL}audio/jingle-endings/${ending.filename}`;
  return { ...ending, kind: 'sfx', category: 'Fin de jingle', description: 'Un son court pour terminer le jingle.', tags: [], audioUrl, fallbackUrl: audioUrl, license: ending.licenseName, attribution: `${ending.title} — ${ending.author} — ${ending.licenseName}`, origin: 'recording' };
}
