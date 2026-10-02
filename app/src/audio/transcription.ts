export type TranscriptLanguage = 'fr' | 'de' | 'en';
export interface TranscriptionProgress { stage: 'loading' | 'transcribing'; percent?: number }
export interface TranscriptionResult { text: string }

/** Decode only on this device, and send PCM to our own worker, never to a server. */
export async function transcriptionSamples(blob: Blob, sourceStart = 0, sourceEnd?: number): Promise<Float32Array> {
  const context = new AudioContext();
  let decoded: AudioBuffer;
  try { decoded = await context.decodeAudioData(await blob.arrayBuffer()); }
  finally { await context.close(); }
  const start = Math.max(0, Math.min(decoded.duration, sourceStart));
  const end = Math.max(start, Math.min(decoded.duration, sourceEnd ?? decoded.duration));
  if (end - start < .15) throw new Error('L’essai est trop court pour être transcrit.');
  const rate = 16000;
  const offline = new OfflineAudioContext(1, Math.ceil((end - start) * rate), rate);
  const source = offline.createBufferSource(); source.buffer = decoded;
  source.connect(offline.destination); source.start(0, start, end - start);
  const samples = (await offline.startRendering()).getChannelData(0).slice();
  let energy = 0;
  for (const value of samples) energy += value * value;
  if (Math.sqrt(energy / samples.length) < .0015) throw new Error('Cet essai semble silencieux. Vérifie le micro et réenregistre.');
  return samples;
}

export class LocalTranscriber {
  private worker?: Worker;
  private pending?: { resolve: (result: TranscriptionResult) => void; reject: (reason: Error) => void; progress: (value: TranscriptionProgress) => void };

  async transcribe(samples: Float32Array, language: TranscriptLanguage, progress: (value: TranscriptionProgress) => void): Promise<TranscriptionResult> {
    if (this.pending) throw new Error('Une transcription est déjà en cours.');
    if (!this.worker) {
      this.worker = new Worker(new URL('./transcription.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = ({ data }) => {
        if (!this.pending) return;
        if (data.type === 'progress') this.pending.progress(data.progress);
        else if (data.type === 'done') { const request = this.pending; this.pending = undefined; request.resolve({ text: data.text }); }
        else if (data.type === 'error') { const request = this.pending; this.pending = undefined; request.reject(new Error(data.error)); this.worker?.terminate(); this.worker = undefined; }
      };
      this.worker.onerror = () => { this.pending?.reject(new Error('La transcription n’a pas pu démarrer. Réessaie avec un navigateur récent.')); this.pending = undefined; this.worker?.terminate(); this.worker = undefined; };
    }
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject, progress };
      this.worker!.postMessage({ type: 'transcribe', samples, language }, [samples.buffer]);
    });
  }

  cancel(): void {
    this.pending?.reject(new DOMException('Transcription annulée.', 'AbortError'));
    this.pending = undefined;
    this.worker?.terminate(); this.worker = undefined;
  }

  dispose(): void {
    if (this.pending) { this.cancel(); return; }
    const worker = this.worker; this.worker = undefined;
    if (!worker) return;
    worker.onmessage = ({ data }) => { if (data.type === 'disposed') worker.terminate(); };
    worker.postMessage({ type: 'dispose' });
    window.setTimeout(() => worker.terminate(), 1000);
  }
}
