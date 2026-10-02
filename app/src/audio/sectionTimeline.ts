import type { AudioAnchor, AudioAsset, PodcastProject, SectionAudioLayer } from '../types';
import { getTimeline, type TimelineEntry } from './engine';
import { resolveSectionLayers } from './sectionLayers';

export const clampTime = (value: number, min: number, max: number) => Math.min(Math.max(min, max), Math.max(min, Number.isFinite(value) ? value : min));
export const roundTime = (value: number) => Math.round(value * 10) / 10;

export function scopeSection(project: PodcastProject, sectionId: string): PodcastProject {
  return { ...project, sections: project.sections.filter(section => section.id === sectionId), blocks: project.blocks.filter(block => block.sectionId === sectionId) };
}

/** Commit this part's arrangement without replacing any other part or its assets. */
export function applySectionArrangement(project: PodcastProject, edited: PodcastProject, sectionId: string): void {
  const section = project.sections.find(item => item.id === sectionId);
  const changed = edited.sections.find(item => item.id === sectionId);
  if (!section || !changed) return;
  section.audioLayers = changed.audioLayers;
  const index = project.blocks.findIndex(block => block.sectionId === sectionId);
  const others = project.blocks.filter(block => block.sectionId !== sectionId);
  others.splice(index < 0 ? others.length : Math.min(index, others.length), 0, ...edited.blocks.filter(block => block.sectionId === sectionId));
  project.blocks = others;
}

/** Store visual positions on recordings, so the sounds follow later reordering. */
export function anchorAtTime(timeline: TimelineEntry[], time: number, end = false): AudioAnchor {
  const duration = timeline.at(-1)?.end ?? 0;
  const at = clampTime(time, 0, duration);
  if (at <= 0) return { edge: 'start' };
  if (end && at >= duration - 0.001) return { edge: 'end' };
  const entry = timeline.find(item => item.duration > 0 && at >= item.start && (end ? at <= item.end : at < item.end)) ?? timeline.at(-1);
  if (!entry) return { edge: end ? 'end' : 'start' };
  if (end && Math.abs(at - entry.end) < 0.001) return { blockId: entry.block.id, edge: 'end' };
  return { blockId: entry.block.id, edge: 'start', seconds: Math.max(0, at - entry.start) };
}

/** A move keeps the selected audio; trimming a non-looping clip trims its source. */
export function editLayerOnTimeline(project: PodcastProject, layer: SectionAudioLayer, action: 'move' | 'start' | 'end', value: number): SectionAudioLayer {
  const timeline = getTimeline(project);
  const current = resolveSectionLayers(project, timeline).find(item => item.layer.id === layer.id);
  const asset = project.assets.find(item => item.id === layer.assetId);
  if (!current || !asset || layer.pauseBlockId) return layer;
  const duration = timeline.at(-1)?.end ?? 0;
  let { start, end, sourceStart, sourceEnd } = current;
  if (action === 'move') {
    const length = end - start;
    start = clampTime(roundTime(value), 0, duration - length);
    end = start + length;
  } else if (action === 'start') {
    const next = clampTime(roundTime(value), layer.repeat ? 0 : Math.max(0, start - sourceStart), end - 0.05);
    if (!layer.repeat) sourceStart = clampTime(sourceStart + next - start, 0, sourceEnd - 0.05);
    start = next;
  } else {
    const next = clampTime(roundTime(value), start + 0.05, layer.repeat ? duration : Math.min(duration, start + asset.duration - sourceStart));
    if (!layer.repeat) sourceEnd = sourceStart + next - start;
    end = next;
  }
  return { ...layer, sourceStart, sourceEnd, start: anchorAtTime(timeline, start), end: anchorAtTime(timeline, end, true) };
}

const waveformCache = new WeakMap<Blob, Promise<number[]>>();
export function assetWaveform(asset: AudioAsset): Promise<number[]> {
  const cached = waveformCache.get(asset.blob);
  if (cached) return cached;
  const pending = (async () => {
    const context = new AudioContext();
    try {
      const buffer = await context.decodeAudioData(await asset.blob.arrayBuffer());
      const samples = buffer.getChannelData(0);
      const stride = Math.max(1, Math.floor(samples.length / 240));
      const peaks = Array.from({ length: 240 }, (_, index) => {
        let peak = 0;
        for (let i = index * stride; i < Math.min(samples.length, (index + 1) * stride); i += Math.max(1, Math.floor(stride / 80))) peak = Math.max(peak, Math.abs(samples[i]));
        return peak;
      });
      const maximum = Math.max(0.01, ...peaks);
      return peaks.map(value => value / maximum);
    } finally { await context.close(); }
  })();
  waveformCache.set(asset.blob, pending);
  pending.catch(() => waveformCache.delete(asset.blob));
  return pending;
}
