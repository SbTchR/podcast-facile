const BASE_LOADER_URL = './runtime-loader.js?v=20260722-audio-1';

const EXTRA_HISTORY_SOUNDS = `,
  {
    id: 'sfx-military-drumbeat', kind: 'sfx', title: 'Tambour militaire', category: 'Guerres & combats', icon: '🥁', duration: 39,
    description: 'Rythme de tambour de style militaire, utile pour une marche, une mobilisation ou une scène de campement.',
    tags: ['tambour', 'armée', 'marche', 'campement'], filename: 'Militarydrumbeat.ogg',
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Militarydrumbeat.ogg', fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Militarydrumbeat.ogg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Militarydrumbeat.ogg', author: 'SvonHalenbach', license: 'Domaine public',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/', attribution: 'Militarydrumbeat — SvonHalenbach — domaine public.', origin: 'synthesized', clipDuration: 15
  },
  {
    id: 'sfx-1960s-factory-civil-defense-siren', kind: 'sfx', title: 'Sirène d’usine et de défense civile des années 1960', category: 'Transports & industrie', icon: '📢', duration: 30.2,
    description: 'Sirène électrique historique utilisée dans une usine pour les changements de poste et comme signal de défense civile.',
    tags: ['sirène', 'usine', 'défense civile', 'alerte'], filename: 'WWS Siren.ogg',
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/97/WWS_Siren.ogg', fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/97/WWS_Siren.ogg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:WWS_Siren.ogg', author: 'Konrad Gutkowski et Jonathan Nicolai / Work With Sounds', license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', attribution: 'WWS Siren — Konrad Gutkowski et Jonathan Nicolai / Work With Sounds — CC BY 4.0.', origin: 'recording', clipDuration: 12
  },
  {
    id: 'sfx-19th-century-fire-brigade-bell', kind: 'sfx', title: 'Cloche de pompiers de la fin du XIXe siècle', category: 'Sociétés & lieux historiques', icon: '🚒', duration: 20,
    description: 'Cloche montée sur un véhicule de pompiers à deux essieux, utilisée pour réclamer le passage en cas d’incendie.',
    tags: ['pompiers', 'cloche', 'XIXe siècle', 'incendie'], filename: 'WWS Firedepartmentbell.ogg',
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/WWS_Firedepartmentbell.ogg', fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/WWS_Firedepartmentbell.ogg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:WWS_Firedepartmentbell.ogg', author: 'Konrad Gutkowski et Jonathan Nicolai / Work With Sounds', license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', attribution: 'WWS Firedepartmentbell — Konrad Gutkowski et Jonathan Nicolai / Work With Sounds — CC BY 4.0.', origin: 'recording', clipDuration: 12
  }`;

async function boot() {
  try {
    const response = await fetch(BASE_LOADER_URL, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Impossible de charger le moteur audio (HTTP ${response.status}).`);
    const source = await response.text();
    const marker = '\n];\n\nconst CATEGORY_RENAMES = new Map([';
    const index = source.indexOf(marker);
    if (index === -1) throw new Error('Point d’insertion des bruitages historiques introuvable.');
    const patchedSource = source.slice(0, index) + EXTRA_HISTORY_SOUNDS + source.slice(index);
    const blobUrl = URL.createObjectURL(new Blob([patchedSource], { type: 'text/javascript' }));
    try {
      await import(blobUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } catch (error) {
    console.error('[Podcast Facile] Ajouts historiques non chargés', error);
    await import(BASE_LOADER_URL);
  }
}

void boot();
