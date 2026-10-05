type Context = AudioContext | OfflineAudioContext;

/** Feed-forward echoes avoid Safari's offline-render crash on feedback cycles.
 * Keep repetitions down to -80 dB; the omitted tail is inaudible.
 * Use the same graph for editor playback and exported files.
 */
export function connectEcho(context: Context, input: AudioNode, output: AudioNode, seconds: number, feedback: 0.18 | 0.24): void {
  let previous = input;
  for (let level = 1; level >= 0.0001; level *= feedback) {
    const delay = context.createDelay(seconds);
    delay.delayTime.value = seconds;
    previous.connect(delay);
    const gain = context.createGain();
    gain.gain.value = level;
    delay.connect(gain).connect(output);
    previous = delay;
  }
}
