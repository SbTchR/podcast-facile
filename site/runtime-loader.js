const BUNDLE_URL = './assets/index-CoCR-8bA.js';

const LIBRARY_NOTICE_BEFORE = 'Les sons intégrés sont produits directement par l’application. Ils fonctionnent hors ligne et ne nécessitent aucun crédit externe.';
const LIBRARY_NOTICE_AFTER = 'Les sons de la bibliothèque proviennent de sources libres ou sous licence. Ils sont téléchargés lors de leur premier ajout. Les sources et crédits sont indiqués pour chaque son.';

const NEW_HISTORY_SOUNDS = [
  {
    id: 'sfx-gunshots-simulated', kind: 'sfx', title: 'Série de coups de feu simulés', category: 'Guerres & combats', icon: '🔫', duration: 5.9,
    description: 'Suite de détonations fabriquées pour un livre audio à partir de ballons éclatés et d’un montage Audacity. Ce ne sont pas de vrais tirs.',
    tags: ['coups de feu', 'détonations', 'combat', 'révolution'], filename: 'Gunshots 8.ogg',
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ee/Gunshots_8.ogg', fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ee/Gunshots_8.ogg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Gunshots_8.ogg', author: 'aradlaw', license: 'Domaine public',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/', attribution: 'Gunshots 8 — aradlaw — domaine public.', origin: 'simulated'
  },
  {
    id: 'sfx-cannon-reveille', kind: 'sfx', title: 'Salve de canon et réveil militaire', category: 'Guerres & combats', icon: '💥', duration: 30.3,
    description: 'Détonation de canon suivie d’une sonnerie militaire de réveil, utile pour une caserne, un siège ou une cérémonie.',
    tags: ['canon', 'armée', 'caserne', 'cérémonie'], filename: '01 Salute Cannon Reveille.ogg',
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/01_Salute_Cannon_Reveille.ogg', fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/01_Salute_Cannon_Reveille.ogg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:01_Salute_Cannon_Reveille.ogg', author: 'United States Military Academy Hellcats', license: 'Domaine public',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/', attribution: 'Salute Cannon/Reveille — U.S. Military Academy Hellcats — domaine public.', origin: 'recording', clipDuration: 12
  },
  {
    id: 'sfx-large-crowd-cheering', kind: 'sfx', title: 'Foule nombreuse et acclamations', category: 'Voix & foule', icon: '📣', duration: 61.2,
    description: 'Murmures, cris et acclamations d’une foule dense pour une manifestation, une place publique ou un événement collectif.',
    tags: ['foule', 'acclamations', 'manifestation', 'place publique'], filename: 'Festival concert people crowd.ogg',
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Festival_concert_people_crowd.ogg', fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Festival_concert_people_crowd.ogg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Festival_concert_people_crowd.ogg', author: 'stephan / PDSounds.org', license: 'Domaine public',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/', attribution: 'Festival concert people crowd — stephan / PDSounds.org — domaine public.', origin: 'recording', clipDuration: 15
  },
  {
    id: 'sfx-provence-market', kind: 'sfx', title: 'Marché provençal animé', category: 'Sociétés & lieux historiques', icon: '🧺', duration: 273,
    description: 'Ambiance réelle d’un marché de Toulon avec voix, vendeurs et activité commerciale.', tags: ['marché', 'vendeurs', 'commerce', 'ville'],
    filename: 'Marche-de-provence.ogg', audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Marche-de-provence.ogg',
    fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Marche-de-provence.ogg', sourcePage: 'https://commons.wikimedia.org/wiki/File:Marche-de-provence.ogg',
    author: 'Jacques Lahitte', license: 'CC BY 3.0', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    attribution: 'Marché de Provence — Jacques Lahitte — CC BY 3.0.', origin: 'recording', clipDuration: 15
  },
  {
    id: 'sfx-fireworks-detonations', kind: 'sfx', title: 'Détonations de feux d’artifice', category: 'Sociétés & lieux historiques', icon: '🎆', duration: 39,
    description: 'Crépitements, détonations et réactions du public. Peut évoquer une fête ou une commémoration, sans être présenté comme une bataille réelle.',
    tags: ['feux d’artifice', 'détonations', 'fête', 'commémoration'], filename: 'Noises and fireworks.ogg',
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Noises_and_fireworks.ogg', fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Noises_and_fireworks.ogg',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Noises_and_fireworks.ogg', author: 'ezwa', license: 'Domaine public',
    licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/', attribution: 'Noises and fireworks — ezwa — domaine public.', origin: 'recording', clipDuration: 12
  },
  {
    id: 'sfx-rotary-printing-press-1926', kind: 'sfx', title: 'Presse rotative de journal de 1926', category: 'Transports & industrie', icon: '📰', duration: 119,
    description: 'Fonctionnement mécanique d’une presse rotative historique utilisée pour imprimer des journaux.', tags: ['presse', 'journal', 'imprimerie', 'industrie'],
    filename: 'WWS Rotaryprintingpress.ogg', audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/70/WWS_Rotaryprintingpress.ogg',
    fallbackUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/70/WWS_Rotaryprintingpress.ogg', sourcePage: 'https://commons.wikimedia.org/wiki/File:WWS_Rotaryprintingpress.ogg',
    author: 'Konrad Gutkowski / Work With Sounds', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'Rotary printing press — Konrad Gutkowski / Work With Sounds — CC BY 4.0.', origin: 'recording', clipDuration: 15
  },
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
  }
];

const CATEGORY_RENAMES = new Map([
  ['Histoire & action', 'Guerres & combats'],
  ['Lieux & ambiances', 'Sociétés & lieux historiques'],
  ['Nature & animaux', 'Nature & paysages'],
  ['Transports & machines', 'Transports & industrie'],
  ['Voix & personnes', 'Voix & foule']
]);

const CATEGORY_CORRECTIONS = new Map([
  ['sfx-historic-smithy-cutting', 'Transports & industrie'], ['sfx-smithy-forging', 'Transports & industrie'],
  ['sfx-music-box', 'Vie quotidienne & objets'], ['sfx-mall', 'Sociétés & lieux historiques'], ['sfx-toilet-flush', 'Vie quotidienne & objets'],
  ['sfx-church-bells', 'Sociétés & lieux historiques'], ['sfx-playground', 'Sociétés & lieux historiques'], ['sfx-gombe-market', 'Sociétés & lieux historiques'],
  ['sfx-coins', 'Vie quotidienne & objets'], ['sfx-market-rain', 'Sociétés & lieux historiques'], ['sfx-group-laughter', 'Voix & foule'],
  ['sfx-baby-laugh', 'Voix & foule'], ['sfx-city-street', 'Sociétés & lieux historiques'], ['sfx-seaport-ambience', 'Transports & industrie'],
  ['sfx-shop-doorbell', 'Vie quotidienne & objets'], ['sfx-door-knocker', 'Vie quotidienne & objets'], ['sfx-door-handle', 'Vie quotidienne & objets'],
  ['sfx-cellar-door', 'Vie quotidienne & objets'], ['sfx-elevator', 'Vie quotidienne & objets'], ['sfx-squeaky-door', 'Vie quotidienne & objets'],
  ['sfx-doorbell', 'Vie quotidienne & objets'], ['sfx-old-door', 'Vie quotidienne & objets'], ['sfx-steps-walking', 'Vie quotidienne & objets'],
  ['sfx-steps-church', 'Sociétés & lieux historiques'], ['sfx-writing-inkpen', 'Vie quotidienne & objets'], ['sfx-restaurant', 'Voix & foule'],
  ['sfx-busy-common-room', 'Voix & foule'], ['sfx-applause', 'Voix & foule'], ['sfx-baby-cry', 'Voix & foule'],
  ['sfx-male-crying', 'Voix & foule'], ['sfx-human-cough', 'Voix & foule'], ['sfx-wheeze', 'Voix & foule'],
  ['sfx-human-whistling', 'Voix & foule'], ['sfx-human-sneeze', 'Voix & foule'], ['sfx-explosion', 'Guerres & combats'],
  ['sfx-explosions', 'Guerres & combats'], ['sfx-sword-fight-real', 'Guerres & combats'], ['sfx-sword-hit-real', 'Guerres & combats'],
  ['sfx-sword-unsheathe-real', 'Guerres & combats'], ['sfx-wilhelm-scream', 'Guerres & combats'], ['sfx-male-scream-fear', 'Voix & foule']
]);

function replaceOnce(source, before, after, label) {
  const index = source.indexOf(before);
  if (index === -1) throw new Error(`Correctif introuvable : ${label}. Le bundle a probablement changé.`);
  if (source.indexOf(before, index + before.length) !== -1) throw new Error(`Correctif ambigu : ${label}. Plusieurs occurrences ont été trouvées.`);
  return source.slice(0, index) + after + source.slice(index + before.length);
}

function setCategoryForSound(source, id, category) {
  const idMarker = `id:\`${id}\``;
  const objectStart = source.indexOf(idMarker);
  if (objectStart === -1) throw new Error(`Son introuvable pour reclassement : ${id}`);
  const nextObject = source.indexOf('},{id:`', objectStart + idMarker.length);
  const arrayEnd = source.indexOf('],b={music:', objectStart + idMarker.length);
  const objectEnd = [nextObject, arrayEnd].filter((value) => value !== -1).sort((a, b) => a - b)[0] ?? source.length;
  const categoryMarker = 'category:`';
  const categoryStart = source.indexOf(categoryMarker, objectStart);
  if (categoryStart === -1 || categoryStart > objectEnd) throw new Error(`Catégorie introuvable pour : ${id}`);
  const valueStart = categoryStart + categoryMarker.length;
  const valueEnd = source.indexOf('`', valueStart);
  if (valueEnd === -1 || valueEnd > objectEnd) throw new Error(`Catégorie illisible pour : ${id}`);
  return source.slice(0, valueStart) + category + source.slice(valueEnd);
}

function serializeSound(sound) {
  const fields = Object.entries(sound).map(([key, value]) => {
    if (typeof value === 'string') return `${key}:\`${value.replaceAll('`', '\\`')}\``;
    if (typeof value === 'number' || typeof value === 'boolean') return `${key}:${value}`;
    if (Array.isArray(value)) return `${key}:[${value.map((item) => `\`${String(item).replaceAll('`', '\\`')}\``).join(',')}]`;
    throw new TypeError(`Champ non sérialisable dans la bibliothèque audio : ${key}`);
  });
  return `{${fields.join(',')}}`;
}

export function transformBundle(originalSource) {
  let source = originalSource;
  source = replaceOnce(source, LIBRARY_NOTICE_BEFORE, LIBRARY_NOTICE_AFTER, 'texte sur les sources audio');
  for (const [oldCategory, newCategory] of CATEGORY_RENAMES) source = source.replaceAll(`\`${oldCategory}\``, `\`${newCategory}\``);
  for (const [id, category] of CATEGORY_CORRECTIONS) source = setCategoryForSound(source, id, category);
  source = replaceOnce(source, '],b={music:', `,${NEW_HISTORY_SOUNDS.map(serializeSound).join(',')}],b={music:`, 'insertion des nouveaux bruitages historiques');

  const durationBefore = 'function T(e){if(e.type===`silence`)return Math.max(.1,e.duration);if(e.type===`transition`)return Math.min(3,Math.max(.5,e.duration));if(e.type===`jingle`)return e.jingle?.length===`short`?6:e.jingle?.length===`long`?15:10;let t=Math.max(0,e.trimEnd-e.trimStart||e.duration);return e.type===`voice`&&e.background?t+(e.background.startBefore?te:0)+(e.background.continueAfter?ne:0):t}';
  const durationAfter = 'function T(e){if(e.type===`silence`)return Math.max(.1,e.duration);if(e.type===`transition`)return Math.min(3,Math.max(.5,e.duration));if(e.type===`jingle`)return e.jingle?.length===`short`?6:e.jingle?.length===`long`?15:10;let t=Math.max(0,e.trimEnd-e.trimStart||e.duration),n=e.type===`voice`?(e.voiceEffect===`deep`?.9:e.voiceEffect===`high`?1.1:1):1;t/=n;return e.type===`voice`&&e.background?t+(e.background.startBefore?te:0)+(e.background.continueAfter?ne:0):t}';
  source = replaceOnce(source, durationBefore, durationAfter, 'durée des effets grave et aigu');

  const playbackBefore = 'async function fe(e,t,n,r,i,a,o,s,c,l,u=`none`,d=!1){if(o<=0)return;let f=await E(e,n,r),p=e.createBufferSource();p.buffer=f,p.loop=d;let m=e.createGain();de(m,i,o,c,l,s,a),ue(e,p,u,m),m.connect(t);let h=d?a%f.duration:Math.min(a,Math.max(0,f.duration-.01));p.start(i,h,d?void 0:Math.min(o,f.duration-h)),p.stop(i+o+.03)}';
  const playbackAfter = 'async function fe(e,t,n,r,i,a,o,s,c,l,u=`none`,d=!1){if(o<=0)return;let f=await E(e,n,r),p=e.createBufferSource();p.buffer=f,p.loop=d;let m=e.createGain();de(m,i,o,c,l,s,a),ue(e,p,u,m),m.connect(t);let h=d?a%f.duration:Math.min(a,Math.max(0,f.duration-.01)),g=u===`deep`?.9:u===`high`?1.1:1;p.start(i,h,d?void 0:Math.min(o*g,f.duration-h)),p.stop(i+o+.03)}';
  source = replaceOnce(source, playbackBefore, playbackAfter, 'lecture des effets grave et aigu');

  const voiceScheduleBefore = 'async function k(e,t,n,r,i,a,o){let s=D(r,n.assetId);if(!s)return;let c=Math.max(0,n.trimEnd-n.trimStart||n.duration),l=n.background?.startBefore?te:0,u=n.background?.continueAfter?ne:0,d=l+c+u-o;if(d<=0)return;if(n.background){let s=D(r,n.background.assetId);if(s){let r=e.createGain();r.connect(t);let f=se(n.background.level),p=a,m=Math.max(0,l-o),h=Math.max(0,c-Math.max(0,o-l));r.gain.setValueAtTime(1e-4,p),r.gain.linearRampToValueAtTime(f*1.35,p+Math.min(.5,d/4)),h>0&&(r.gain.linearRampToValueAtTime(f,p+m+.08),r.gain.setValueAtTime(f,p+m+h),u>0&&r.gain.linearRampToValueAtTime(f*1.25,Math.min(p+d,p+m+h+.18))),r.gain.linearRampToValueAtTime(1e-4,p+d);let g=await E(e,s,i),_=e.createBufferSource();_.buffer=g,_.loop=!0,_.connect(r),_.start(p,o%g.duration),_.stop(p+d+.03)}}let f=l,p=Math.max(0,o-f);if(p>=c)return;let m=Math.max(0,f-o),h=c-p;await fe(e,t,s,i,a+m,n.trimStart+p,h,oe(n.volume),n.fadeIn===`none`?`short`:n.fadeIn,n.fadeOut===`none`?`short`:n.fadeOut,n.voiceEffect);for(let s of n.voiceCues??[]){let n=D(r,s.assetId);if(!n)continue;let u=Math.min(Math.max(0,s.at),c),d=Math.min(Math.max(.2,s.duration),Math.max(0,c-u));if(d<=0)continue;let f=l+u;if(o>=f+d)continue;let p=Math.max(0,o-f);await fe(e,t,n,i,a+Math.max(0,f-o),p,d-p,ce(s.level),`none`,`short`)}}';
  const voiceScheduleAfter = 'async function k(e,t,n,r,i,a,o){let s=D(r,n.assetId);if(!s)return;let c=Math.max(0,n.trimEnd-n.trimStart||n.duration),q=n.voiceEffect===`deep`?.9:n.voiceEffect===`high`?1.1:1,v=c/q,l=n.background?.startBefore?te:0,u=n.background?.continueAfter?ne:0,d=l+v+u-o;if(d<=0)return;if(n.background){let s=D(r,n.background.assetId);if(s){let r=e.createGain();r.connect(t);let f=se(n.background.level),p=a,m=Math.max(0,l-o),h=Math.max(0,v-Math.max(0,o-l));r.gain.setValueAtTime(1e-4,p),r.gain.linearRampToValueAtTime(f*1.35,p+Math.min(.5,d/4)),h>0&&(r.gain.linearRampToValueAtTime(f,p+m+.08),r.gain.setValueAtTime(f,p+m+h),u>0&&r.gain.linearRampToValueAtTime(f*1.25,Math.min(p+d,p+m+h+.18))),r.gain.linearRampToValueAtTime(1e-4,p+d);let g=await E(e,s,i),_=e.createBufferSource();_.buffer=g,_.loop=!0,_.connect(r),_.start(p,o%g.duration),_.stop(p+d+.03)}}let f=l,p=Math.max(0,o-f);if(p>=v)return;let m=Math.max(0,f-o),x=Math.min(c,p*q),h=(c-x)/q;await fe(e,t,s,i,a+m,n.trimStart+x,h,oe(n.volume),n.fadeIn===`none`?`short`:n.fadeIn,n.fadeOut===`none`?`short`:n.fadeOut,n.voiceEffect);for(let s of n.voiceCues??[]){let n=D(r,s.assetId);if(!n)continue;let u=Math.min(Math.max(0,s.at),c),g=u/q,d=Math.min(Math.max(.2,s.duration),Math.max(0,v-g));if(d<=0)continue;let f=l+g;if(o>=f+d)continue;let p=Math.max(0,o-f);await fe(e,t,n,i,a+Math.max(0,f-o),p,d-p,ce(s.level),`none`,`short`)}}';
  source = replaceOnce(source, voiceScheduleBefore, voiceScheduleAfter, 'synchronisation des effets grave et aigu');

  return `${source}\n//# sourceURL=podcast-facile-patched.js`;
}

async function boot() {
  try {
    const response = await fetch(BUNDLE_URL, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Impossible de charger l’application (HTTP ${response.status}).`);
    const patchedSource = transformBundle(await response.text());
    const blobUrl = URL.createObjectURL(new Blob([patchedSource], { type: 'text/javascript' }));
    try {
      await import(blobUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } catch (error) {
    console.error('[Podcast Facile] Échec du chargement corrigé', error);
    const root = document.getElementById('root');
    if (root) root.innerHTML = `<main style="max-width:720px;margin:64px auto;padding:24px;font-family:system-ui,sans-serif;color:#182238"><h1>Podcast Facile ne peut pas démarrer</h1><p>Un correctif audio n’a pas pu être appliqué à la version actuelle.</p><pre style="white-space:pre-wrap;background:#f1f4f9;padding:16px;border-radius:10px">${String(error instanceof Error ? error.message : error)}</pre><p>Recharge la page. Si le problème persiste, signale ce message précis.</p></main>`;
  }
}

if (typeof window !== 'undefined') void boot();
