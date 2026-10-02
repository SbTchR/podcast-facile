import type { AudioAnchor, PodcastProject, SectionAudioLayer } from '../types';
import type { TimelineEntry } from './engine';

export interface ResolvedLayer {
  sectionId: string;
  layer: SectionAudioLayer;
  start: number;
  end: number;
  sourceStart: number;
  sourceEnd: number;
}

export function resolveSectionLayers(project: PodcastProject, timeline: TimelineEntry[]): ResolvedLayer[] {
  const result: ResolvedLayer[] = [];
  for (const section of project.sections) {
    const entries = timeline.filter((entry) => entry.block.sectionId === section.id);
    if (!entries.length) continue;
    const sectionStart = entries[0].start;
    const sectionEnd = entries.at(-1)!.end;
    const anchorTime = (anchor: AudioAnchor): number | null => {
      const entry = anchor.blockId ? entries.find((item) => item.block.id === anchor.blockId) : undefined;
      if (anchor.blockId && !entry) return null;
      const base = entry ? (anchor.edge === 'end' ? entry.end : entry.start) : anchor.edge === 'end' ? sectionEnd : sectionStart;
      const offset = Number.isFinite(anchor.seconds) ? Math.max(0, anchor.seconds ?? 0) : 0;
      return Math.min(entry?.end ?? sectionEnd, base + offset);
    };
    for (const layer of section.audioLayers ?? []) {
      const asset = project.assets.find((item) => item.id === layer.assetId);
      if (!asset || !Number.isFinite(asset.duration) || asset.duration <= 0) continue;
      const start = anchorTime(layer.start);
      const requestedEnd = layer.end ? anchorTime(layer.end) : sectionEnd;
      if (start === null || requestedEnd === null) continue;
      const sourceStart = Math.min(Math.max(0, layer.sourceStart), Math.max(0, asset.duration - 0.05));
      const sourceEnd = Math.min(asset.duration, Math.max(sourceStart + 0.05, layer.sourceEnd));
      const end = Math.min(sectionEnd, requestedEnd, layer.repeat ? Infinity : start + sourceEnd - sourceStart);
      if (end > start) result.push({ sectionId: section.id, layer, start, end, sourceStart, sourceEnd });
    }
  }
  return result;
}

export function describeLayerPlacement(layer: SectionAudioLayer, project: Pick<PodcastProject, 'blocks'>): string {
  const title = (id?: string) => project.blocks.find((block) => block.id === id)?.title ?? 'enregistrement supprimé';
  if (layer.pauseBlockId) return `Entre les voix · après ${title(layer.afterBlockId)}`;
  const start = layer.start.blockId ? `${(layer.start.seconds ?? 0) > 0 ? `${layer.start.seconds?.toFixed(1)} s dans` : layer.start.edge === 'end' ? 'Après' : 'Début de'} ${title(layer.start.blockId)}` : 'Début de la partie';
  if (layer.kind === 'sfx' && layer.soundGroup !== 'ambience') return start;
  if (!layer.start.blockId && layer.end?.edge === 'end' && !layer.end.blockId) return 'Toute la partie';
  return `${start} → ${layer.end?.blockId ? `${layer.end.edge === 'start' ? `${layer.end.seconds?.toFixed(1)} s dans` : 'fin de'} ${title(layer.end.blockId)}` : 'fin de la partie'}`;
}

/** Inserts a dedicated gap only for a sound explicitly placed between recordings. */
export function putSectionLayer(project: PodcastProject, sectionId: string, layer: SectionAudioLayer, pauseAfterId: string | null): void {
  const section = project.sections.find((item) => item.id === sectionId);
  if (!section) return;
  const previous = section.audioLayers?.find((item) => item.id === layer.id);
  if (previous?.pauseBlockId) project.blocks = project.blocks.filter((block) => block.id !== previous.pauseBlockId);
  const saved = { ...layer, start: { ...layer.start }, end: layer.end ? { ...layer.end } : undefined };
  if (pauseAfterId) {
    const index = project.blocks.findIndex((block) => block.id === pauseAfterId && block.sectionId === sectionId);
    if (index < 0) throw new Error('Choisis un enregistrement encore présent dans cette partie.');
    const pauseId = previous?.pauseBlockId ?? layer.pauseBlockId ?? crypto.randomUUID();
    project.blocks.splice(index + 1, 0, { id: pauseId, sectionId, type: 'silence', title: `Après ${project.blocks[index].title}`, duration: layer.sourceEnd - layer.sourceStart, trimStart: 0, trimEnd: 0, volume: 'normal', fadeIn: 'none', fadeOut: 'none', voiceEffect: 'none' });
    saved.pauseBlockId = pauseId;
    saved.afterBlockId = pauseAfterId;
    saved.start = { blockId: pauseId, edge: 'start' };
    saved.end = { blockId: pauseId, edge: 'end' };
  } else { delete saved.pauseBlockId; delete saved.afterBlockId; }
  section.audioLayers = previous ? section.audioLayers!.map(item => item.id === layer.id ? saved : item) : [...(section.audioLayers ?? []), saved];
}

export function removeSectionLayer(project: PodcastProject, sectionId: string, layerId: string): void {
  const section = project.sections.find((item) => item.id === sectionId);
  const layer = section?.audioLayers?.find((item) => item.id === layerId);
  if (layer?.pauseBlockId) project.blocks = project.blocks.filter((block) => block.id !== layer.pauseBlockId);
  if (section) section.audioLayers = section.audioLayers?.filter((item) => item.id !== layerId);
}

/** Keep dedicated sound gaps attached to their voice as the narrative is reordered. */
export function syncLayerPauses(project: PodcastProject): void {
  for (const section of project.sections) {
    for (const layer of section.audioLayers ?? []) {
      if (!layer.pauseBlockId || !layer.afterBlockId) continue;
      const pause = project.blocks.find((block) => block.id === layer.pauseBlockId);
      if (!pause) continue;
      project.blocks = project.blocks.filter((block) => block.id !== pause.id);
      const index = project.blocks.findIndex((block) => block.id === layer.afterBlockId && block.sectionId === section.id);
      if (index >= 0) project.blocks.splice(index + 1, 0, { ...pause, title: `Après ${project.blocks[index].title}` });
    }
  }
}
