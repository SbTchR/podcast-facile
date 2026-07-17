import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(scriptDir, '../src/App.tsx');
let app = fs.readFileSync(appPath, 'utf8');

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Correctif introuvable : ${label}`);
  return source.replace(before, after);
}

app = replaceRequired(
  app,
  `function Recorder({ onReady }: { onReady: (blob: Blob, duration: number) => Promise<void> | void }) {`,
  `type BrowserAudioSessionType = 'auto' | 'playback' | 'play-and-record';

function setBrowserAudioSession(type: BrowserAudioSessionType): void {
  try {
    const session = (navigator as Navigator & { audioSession?: { type: BrowserAudioSessionType } }).audioSession;
    if (session) session.type = type;
  } catch {
    // API expérimentale : ignorer sur les navigateurs qui ne la prennent pas en charge.
  }
}

function restoreBrowserAudioSession(): void {
  // WebKit recommande de quitter explicitement le mode capture après l’arrêt du micro.
  setBrowserAudioSession('playback');
  window.setTimeout(() => setBrowserAudioSession('auto'), 0);
}

function Recorder({ onReady }: { onReady: (blob: Blob, duration: number) => Promise<void> | void }) {`,
  'helpers AudioSession de l’enregistreur',
);

app = replaceRequired(
  app,
  `    streamRef.current?.getTracks().forEach((track) => track.stop());\n    streamRef.current = null;\n  };`,
  `    streamRef.current?.getTracks().forEach((track) => track.stop());\n    streamRef.current = null;\n    restoreBrowserAudioSession();\n  };`,
  'restauration AudioSession après capture',
);

app = replaceRequired(
  app,
  `      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('L’enregistrement micro n’est pas pris en charge par ce navigateur.');\n      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });`,
  `      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('L’enregistrement micro n’est pas pris en charge par ce navigateur.');\n      // La catégorie playback est incompatible avec la capture sur iOS.\n      setBrowserAudioSession('play-and-record');\n      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });`,
  'activation play-and-record avant getUserMedia',
);

if (!app.includes("setBrowserAudioSession('play-and-record')")) {
  throw new Error('Le mode play-and-record n’a pas été ajouté à l’enregistreur.');
}

fs.writeFileSync(appPath, app);
console.log('Session audio iOS compatible avec la capture micro.');
