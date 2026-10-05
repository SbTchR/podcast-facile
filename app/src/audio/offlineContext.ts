/** Build the entire offline graph before activating any source.
 * WebKit recalculates fingerprint noise when a node is created. Starting sources
 * while still adding nodes repeatedly counts the connected graph and can make
 * the exported audio noisy, even though realtime playback sounds correct.
 */
export function createProjectOfflineContext(channels: number, frames: number, sampleRate: number): OfflineAudioContext {
  const context = new OfflineAudioContext(channels, frames, sampleRate);
  const playbackJobs: (() => void)[] = [];
  const createSource = context.createBufferSource.bind(context);
  context.createBufferSource = () => {
    const source = createSource();
    const start = source.start.bind(source);
    const stop = source.stop.bind(source);
    source.start = (...args: Parameters<AudioBufferSourceNode['start']>) => {
      playbackJobs.push(() => start(...args));
    };
    source.stop = (...args: Parameters<AudioBufferSourceNode['stop']>) => {
      playbackJobs.push(() => stop(...args));
    };
    return source;
  };
  const render = context.startRendering.bind(context);
  context.startRendering = () => {
    for (const play of playbackJobs.splice(0)) play();
    return render();
  };
  return context;
}
