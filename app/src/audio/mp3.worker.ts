import { Mp3Encoder } from '@breezystack/lamejs';

self.onmessage = (event: MessageEvent<{ channels: Float32Array[]; sampleRate: number }>) => {
  try {
    const { channels, sampleRate } = event.data;
    let peak = 0;
    for (const channel of channels) for (const value of channel) {
      if (!Number.isFinite(value)) throw new Error('Le rendu audio contient des données invalides.');
      peak = Math.max(peak, Math.abs(value));
    }
    const scale = peak > 1 ? .98 / peak : 1;
    const encoder = new Mp3Encoder(channels.length, sampleRate, 192);
    const parts: ArrayBuffer[] = [];
    const pcm = channels.map(() => new Int16Array(1152));
    for (let offset = 0; offset < channels[0].length; offset += 1152) {
      const length = Math.min(1152, channels[0].length - offset);
      channels.forEach((channel, index) => {
        for (let i = 0; i < length; i++) {
          const value = Math.max(-1, Math.min(1, channel[offset + i] * scale));
          pcm[index][i] = value * (value < 0 ? 32768 : 32767);
        }
      });
      const bytes = encoder.encodeBuffer(pcm[0].subarray(0, length), pcm[1]?.subarray(0, length));
      if (bytes.length) parts.push(new Uint8Array(bytes).buffer);
    }
    const tail = encoder.flush();
    if (tail.length) parts.push(new Uint8Array(tail).buffer);
    self.postMessage({ blob: new Blob(parts, { type: 'audio/mpeg' }) });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'L’encodage MP3 a échoué.' });
  }
};
