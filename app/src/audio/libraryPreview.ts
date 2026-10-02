import { getCachedLibraryAudio, resolveLibraryAudioUrl, type LibraryPreset } from '../data/audioLibrary';

export interface PreviewSession {
  totalDuration: number;
  getElapsed: () => number;
  stop: () => Promise<void> | void;
}

export function getLibraryPreviewDuration(preset: LibraryPreset): number {
  return Math.max(0.05, Math.min(12, preset.clipDuration ?? preset.duration));
}

// Stream only what playback needs; adding a sound still downloads the complete file.
export async function createLibraryPreviewSession(preset: LibraryPreset, signal: AbortSignal): Promise<PreviewSession> {
  const cached = getCachedLibraryAudio(preset);
  const objectUrl = cached ? URL.createObjectURL(cached) : undefined;
  const sources = objectUrl ? [objectUrl] : [...new Set([preset.audioUrl, preset.fallbackUrl].map(url => resolveLibraryAudioUrl(url)))];
  try {
    for (const source of sources) {
      if (signal.aborted) throw new DOMException('Aperçu annulé.', 'AbortError');
      try {
        return await startAudio(source, preset, signal, objectUrl);
      } catch (error) {
        if (signal.aborted || (error instanceof DOMException && error.name === 'NotAllowedError')) throw error;
      }
    }
    throw new Error('Ce son ne se charge pas. Vérifie ta connexion ou essaie un autre son.');
  } catch (error) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function startAudio(source: string, preset: LibraryPreset, signal: AbortSignal, objectUrl?: string): Promise<PreviewSession> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.setAttribute('playsinline', '');
    let start = Math.max(0, preset.clipStart ?? 0);
    let duration = getLibraryPreviewDuration(preset);
    let settled = false;
    let stopped = false;

    const stop = () => {
      if (stopped) return;
      stopped = true;
      window.clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      audio.onloadedmetadata = null;
      audio.ontimeupdate = null;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      stop();
      reject(error);
    };
    const abort = () => {
      fail(new DOMException('Aperçu annulé.', 'AbortError'));
      stop();
    };
    const timeout = window.setTimeout(() => fail(new Error('Le chargement de ce son prend trop de temps.')), 12000);
    signal.addEventListener('abort', abort, { once: true });
    audio.onerror = () => {
      if (settled) stop();
      else fail(new Error('Le navigateur ne parvient pas à lire cet aperçu.'));
    };
    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration)) {
        start = Math.min(start, Math.max(0, audio.duration - 0.05));
        duration = Math.min(duration, Math.max(0.05, audio.duration - start));
      }
      if (start > 0) audio.currentTime = start;
    };
    audio.ontimeupdate = () => {
      if (audio.currentTime >= start + duration) stop();
    };
    audio.onended = stop;
    audio.src = source;
    // Start within the click gesture, including on Safari. Do not await a fetch or metadata first.
    void audio.play().then(() => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve({
        totalDuration: duration,
        getElapsed: () => stopped ? duration : Math.min(duration, Math.max(0, audio.currentTime - start)),
        stop,
      });
    }, fail);
  });
}
