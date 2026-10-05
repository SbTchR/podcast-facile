import type { PodcastProject } from '../types';
import { renderProjectAudio } from './engine';

/** Encode the offline mix without blocking the editor or depending on MediaRecorder. */
export async function renderProjectToMp3(project: PodcastProject): Promise<Blob> {
  const buffer = await renderProjectAudio(project);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => {
    const samples = new Float32Array(buffer.length);
    buffer.copyFromChannel(samples, index);
    return samples;
  });
  const worker = new Worker(new URL('./mp3.worker.ts', import.meta.url), { type: 'module' });
  try {
    return await new Promise<Blob>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<{ blob?: Blob; error?: string }>) => {
        if (event.data.blob?.size) resolve(event.data.blob);
        else reject(new Error(event.data.error || 'Le fichier MP3 est vide.'));
      };
      worker.onerror = () => reject(new Error('Impossible de créer le MP3. Réessaie ou choisis le format WAV.'));
      worker.postMessage({ channels, sampleRate: buffer.sampleRate }, channels.map(channel => channel.buffer));
    });
  } finally {
    worker.terminate();
  }
}
