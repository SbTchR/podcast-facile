import type { TimelineEntry } from './engine';
import type { ResolvedLayer } from './sectionLayers';

export type GainPoint = [number, number];
const levels = new WeakMap<AudioBuffer, number>();
const percent = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0)) / 100;

/** Comparable music levels across files; a linear slider with peak headroom. */
export function sectionMusicGain(buffer: AudioBuffer, volume: number): number {
  let full = levels.get(buffer);
  if (full === undefined) {
    let peak = 0, sum = 0, count = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const samples = buffer.getChannelData(channel);
      for (let i = 0; i < samples.length; i++) {
        peak = Math.max(peak, Math.abs(samples[i]));
        if (i % 16 === 0) { sum += samples[i] * samples[i]; count++; }
      }
    }
    const rms = Math.sqrt(sum / Math.max(1, count));
    full = rms > .001 ? Math.min(4, .18 / rms, .85 / Math.max(.001, peak)) : 1;
    levels.set(buffer, full);
  }
  return full * percent(volume);
}

export function envelopeValue(points: GainPoint[], at: number): number {
  if (at <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [end, value] = points[i], [start, previous] = points[i - 1];
    if (at <= end) return previous + (value - previous) * (at - start) / Math.max(.000001, end - start);
  }
  return points.at(-1)![1];
}

/** Only explicit pauses raise the music; voice boundaries and seeking remain exact. */
export function sectionMusicEnvelope(item: ResolvedLayer, timeline: TimelineEntry[], full: number, fadeIn: number, fadeOut: number): GainPoint[] {
  const duration = item.end - item.start;
  const under = full * percent(item.layer.volume);
  const pauseVolumeEnabled = item.layer.pauseVolumeEnabled !== false;
  const solo = full * percent(Math.max(item.layer.volume, item.layer.pauseVolume ?? 75));
  const voicePoints: GainPoint[] = [[0, under]];
  const pauses: { start: number; end: number }[] = [];
  if (pauseVolumeEnabled) for (const entry of timeline) {
    if (entry.block.sectionId !== item.sectionId || entry.block.type !== 'silence') continue;
    const start = Math.max(item.start, entry.start) - item.start, end = Math.min(item.end, entry.end) - item.start;
    if (end <= start) continue;
    const last = pauses.at(-1);
    if (last && start <= last.end + .001) last.end = Math.max(last.end, end);
    else pauses.push({ start, end });
  }
  for (const { start, end } of pauses) {
    const ramp = Math.min(.3, (end - start) / 3);
    if (start === 0) voicePoints[0] = [0, solo];
    else voicePoints.push([start, under], [start + ramp, solo]);
    if (end < duration) voicePoints.push([end - ramp, solo], [end, under]);
    else voicePoints.push([end, solo]);
  }
  if (voicePoints.at(-1)![0] < duration) voicePoints.push([duration, under]);
  const times = [...new Set([0, duration, fadeIn, duration - fadeOut, ...voicePoints.map(point => point[0])])].filter(at => at >= 0 && at <= duration).sort((a, b) => a - b);
  return times.map(at => [at, envelopeValue(voicePoints, at) * Math.max(0, Math.min(fadeIn ? at / fadeIn : 1, fadeOut ? (duration - at) / fadeOut : 1, 1))]);
}
