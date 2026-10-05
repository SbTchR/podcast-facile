// Capture the actual mixed signal, before OfflineAudioContext buffer readback.
class PodcastPcmCapture extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.frames = options.processorOptions.frames;
    this.channels = [new Float32Array(this.frames), new Float32Array(this.frames)];
    this.cursor = 0;
  }
  process(inputs, outputs) {
    if (!this.channels) return false;
    const input = inputs[0];
    const output = outputs[0];
    const count = Math.min(output[0].length, this.frames - this.cursor);
    for (let channel = 0; channel < 2; channel++) {
      const samples = input[channel] ?? input[0];
      if (samples) {
        this.channels[channel].set(samples.subarray(0, count), this.cursor);
        output[channel].set(samples);
      }
    }
    this.cursor += count;
    if (this.cursor === this.frames) {
      this.port.postMessage(this.channels, this.channels.map(channel => channel.buffer));
      this.channels = null;
    }
    return true;
  }
}
registerProcessor('podcast-pcm-capture', PodcastPcmCapture);
