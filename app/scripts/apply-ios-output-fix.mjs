import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const enginePath = path.resolve(scriptDir, '../src/audio/engine.ts');
let engine = fs.readFileSync(enginePath, 'utf8');

const start = engine.indexOf('export async function playProject(');
const end = engine.indexOf('\nfunction audioBufferToWav', start);

if (start < 0 || end < 0) {
  throw new Error('La fonction playProject est introuvable dans le moteur audio.');
}

const replacement = `export async function playProject(project: PodcastProject, offset = 0): Promise<PlaybackController> {
  const context = new AudioContext();
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  try {
    const audioSession = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (audioSession) audioSession.type = 'playback';
  } catch {
    // L’API Audio Session n’existe pas sur toutes les versions de Safari.
  }

  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -8;
  compressor.knee.value = 12;
  compressor.ratio.value = 8;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.2;

  let mediaElement: HTMLAudioElement | null = null;
  let mediaStream: MediaStream | null = null;

  if (isIOS && typeof context.createMediaStreamDestination === 'function') {
    const mediaDestination = context.createMediaStreamDestination();
    compressor.connect(mediaDestination);
    mediaStream = mediaDestination.stream;

    mediaElement = document.createElement('audio');
    mediaElement.autoplay = true;
    mediaElement.muted = false;
    mediaElement.volume = 1;
    mediaElement.setAttribute('playsinline', '');
    mediaElement.setAttribute('webkit-playsinline', '');
    mediaElement.setAttribute('aria-hidden', 'true');
    mediaElement.style.position = 'fixed';
    mediaElement.style.width = '1px';
    mediaElement.style.height = '1px';
    mediaElement.style.opacity = '0';
    mediaElement.style.pointerEvents = 'none';
    mediaElement.srcObject = mediaStream;
    document.body.appendChild(mediaElement);

    // Cette première tentative a lieu directement pendant le clic utilisateur.
    void mediaElement.play().catch(() => undefined);
  } else {
    compressor.connect(context.destination);
  }

  // Déverrouillage Web Audio immédiat, lui aussi pendant le clic.
  const unlockPromise = context.state === 'suspended'
    ? context.resume().then(() => undefined)
    : Promise.resolve();

  const cleanupMedia = () => {
    if (mediaElement) {
      mediaElement.pause();
      mediaElement.srcObject = null;
      mediaElement.remove();
      mediaElement = null;
    }
    mediaStream?.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  };

  try {
    const cache = await decodeProjectAssets(context, project, offset);
    await unlockPromise;
    if (context.state === 'suspended') await context.resume();

    const startAt = context.currentTime + 0.25;
    await scheduleProject(context, compressor, project, offset, startAt, cache);

    if (mediaElement) {
      try {
        await mediaElement.play();
      } catch {
        throw new Error('Safari a bloqué la sortie audio. Vérifie le volume multimédia puis touche de nouveau Lecture.');
      }
    }

    const totalDuration = getProjectDuration(project);
    return {
      context,
      totalDuration,
      startOffset: offset,
      getElapsed: () => Math.min(totalDuration, offset + Math.max(0, context.currentTime - startAt)),
      pause: async () => {
        mediaElement?.pause();
        await context.suspend();
      },
      resume: async () => {
        await context.resume();
        if (mediaElement) await mediaElement.play();
      },
      stop: async () => {
        cleanupMedia();
        if (context.state !== 'closed') await context.close();
      },
    };
  } catch (error) {
    cleanupMedia();
    if (context.state !== 'closed') await context.close().catch(() => undefined);
    throw error;
  }
}
`;

engine = engine.slice(0, start) + replacement + engine.slice(end);
fs.writeFileSync(enginePath, engine);
console.log('Sortie audio iOS routée via un élément média HTML.');
