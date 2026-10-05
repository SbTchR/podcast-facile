// ScriptProcessor is deliberately limited to WebKit file export. WebKit adds
// 1% noise to AudioWorklet inputs even when recording a musical mix offline:
// https://github.com/WebKit/WebKit/blob/main/Source/WebCore/Modules/webaudio/AudioWorkletNode.cpp
// The recording callback preserves the PCM without changing privacy settings.
export const PCM_CAPTURE_FRAMES = 4096;

/** Flush the final callback, including podcasts shorter than one audio block. */
export function pcmCaptureRenderLength(frames: number): number {
  return (Math.ceil(frames / PCM_CAPTURE_FRAMES) + 1) * PCM_CAPTURE_FRAMES;
}

export function createPcmCapture(context: OfflineAudioContext, frames: number): {
  node: AudioNode; finish: () => AudioBuffer; dispose: () => void;
} {
  const node = context.createScriptProcessor(PCM_CAPTURE_FRAMES, 2, 2);
  const channels = [new Float32Array(frames), new Float32Array(frames)];
  let cursor = 0;
  node.onaudioprocess = event => {
    const count = Math.min(event.inputBuffer.length, frames - cursor);
    if (!count) return;
    for (let channel = 0; channel < 2; channel++) {
      channels[channel].set(event.inputBuffer.getChannelData(channel).subarray(0, count), cursor);
    }
    cursor += count;
  };
  // The silent output keeps the recorder in the offline graph. Only its input
  // is exported: callback latency and the flush padding never enter the file.
  node.connect(context.destination);
  const dispose = () => { node.onaudioprocess = null; node.disconnect(); };
  return {
    node,
    finish: () => {
      if (cursor !== frames) throw new Error('Le mixage audio est incomplet. Réessaie le téléchargement.');
      const buffer = new AudioBuffer({ numberOfChannels: 2, length: frames, sampleRate: context.sampleRate });
      channels.forEach((channel, index) => buffer.copyToChannel(channel, index));
      return buffer;
    },
    dispose,
  };
}
