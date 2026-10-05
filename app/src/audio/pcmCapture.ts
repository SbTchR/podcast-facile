/** Read WebKit's mixed PCM through its audio processing thread. Offline buffer
 * readback can add audible fingerprint noise on complex graphs in Safari.
 * This captures the same signal sent to the destination, without changing any
 * browser privacy setting or the mix's filters, effects and levels.
 */
export async function createPcmCapture(context: OfflineAudioContext): Promise<{ node: AudioWorkletNode; result: Promise<AudioBuffer> }> {
  await context.audioWorklet.addModule(new URL('./pcmCapture.worklet.js', import.meta.url).href);
  const node = new AudioWorkletNode(context, 'podcast-pcm-capture', {
    numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2],
    channelCount: 2, channelCountMode: 'explicit', processorOptions: { frames: context.length },
  });
  const result = new Promise<AudioBuffer>((resolve, reject) => {
    node.onprocessorerror = () => reject(new Error('Le mixage audio a échoué. Réessaie le téléchargement.'));
    node.port.onmessage = (event: MessageEvent<Float32Array[]>) => {
      const channels = event.data;
      if (channels.length !== 2 || channels.some(channel => channel.length !== context.length)) {
        reject(new Error('Le mixage audio est incomplet. Réessaie le téléchargement.'));
        return;
      }
      const buffer = new AudioBuffer({ numberOfChannels: 2, length: context.length, sampleRate: context.sampleRate });
      channels.forEach((channel, index) => buffer.copyToChannel(channel as Float32Array<ArrayBuffer>, index));
      resolve(buffer);
      node.port.close();
    };
  });
  // Rendering errors are reported by the caller; avoid a second unhandled rejection.
  void result.catch(() => {});
  node.connect(context.destination);
  return { node, result };
}
