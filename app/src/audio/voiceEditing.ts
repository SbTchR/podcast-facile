import type { AudioAnchor, PodcastBlock, PodcastProject, VoiceSoundCue } from '../types';
import { getTimeline } from './engine';
import { resolveSectionLayers } from './sectionLayers';
import { anchorAtTime, scopeSection } from './sectionTimeline';

function voiceBounds(project: PodcastProject, blockId: string) {
  const block = project.blocks.find(item => item.id === blockId && item.type === 'voice');
  const asset = project.assets.find(item => item.id === block?.assetId);
  if (!block || !asset) return undefined;
  const timeline = getTimeline(scopeSection(project, block.sectionId));
  const entry = timeline.find(item => item.block.id === blockId)!;
  const pre = block.background?.startBefore ? Math.min(3, Math.max(1, block.background.startBeforeSeconds ?? 2)) : 0;
  const post = block.background?.continueAfter ? Math.min(3, Math.max(1, block.background.continueAfterSeconds ?? 2)) : 0;
  const from = Math.max(0, block.trimStart);
  const to = Math.min(asset.duration, block.trimEnd || from + block.duration);
  const rate = (to - from) / Math.max(.001, entry.duration - pre - post);
  return { block, entry, from, to, rate, pre, post };
}

/** The playhead is in part time; source cuts also respect pitch/speed effects. */
export function voiceSplitPoint(project: PodcastProject, blockId: string, at: number): number | undefined {
  const bounds = voiceBounds(project, blockId);
  if (!bounds || !Number.isFinite(at)) return undefined;
  const source = bounds.from + (at - bounds.entry.start - bounds.pre) * bounds.rate;
  return source >= bounds.from + .1 && source <= bounds.to - .1 ? source : undefined;
}

function sliceCues(block: PodcastBlock, from: number, to: number, rate: number, suffix: string, project: PodcastProject): VoiceSoundCue[] {
  return (block.voiceCues ?? []).flatMap(cue => {
    const asset = project.assets.find(item => item.id === cue.assetId);
    if (!asset) return [];
    const sourceStart = Math.max(0, cue.sourceStart ?? 0);
    const sourceEnd = Math.min(asset.duration, cue.sourceEnd ?? sourceStart + cue.duration);
    const start = Math.max(0, cue.at) / rate;
    const end = start + Math.max(0, sourceEnd - sourceStart);
    const clippedStart = Math.max(from / rate, start), clippedEnd = Math.min(to / rate, end);
    if (clippedEnd <= clippedStart) return [];
    return [{ ...cue, id: `${cue.id}${suffix}`, at: (clippedStart - from / rate) * rate,
      duration: clippedEnd - clippedStart, sourceStart: sourceStart + clippedStart - start,
      sourceEnd: sourceStart + clippedEnd - start, cutEnd: cue.cutEnd || clippedEnd < end - .001 }];
  });
}

/** A split references two excerpts of the original asset; the source is never overwritten. */
export function splitVoice(project: PodcastProject, blockId: string, at: number, rightId: string): PodcastProject {
  const source = voiceSplitPoint(project, blockId, at);
  const bounds = voiceBounds(project, blockId);
  if (source === undefined || !bounds || project.blocks.some(block => block.id === rightId)) return project;
  const { block, entry, from, to, rate } = bounds;
  const cut = at - entry.start;
  const baseTitle = block.title.replace(/ · morceau \d+$/, '');
  const number = Math.max(1, ...project.blocks.filter(item => item.assetId === block.assetId).map(item => Number(item.title.match(/ · morceau (\d+)$/)?.[1] ?? 1))) + 1;
  const left: PodcastBlock = { ...block, title: / · morceau \d+$/.test(block.title) ? block.title : `${baseTitle} · morceau 1`, trimEnd: source, duration: source - from,
    fadeOut: 'none', voiceCutEnd: true, background: block.background ? { ...block.background, continueAfter: false } : undefined,
    voiceCues: sliceCues(block, 0, source - from, rate, '', project) };
  const right: PodcastBlock = { ...block, id: rightId, title: `${baseTitle} · morceau ${number}`, trimStart: source, trimEnd: to, duration: to - source,
    fadeIn: 'none', voiceCutStart: true, background: block.background ? { ...block.background, startBefore: false, sourceOffsetSeconds: (block.background.sourceOffsetSeconds ?? 0) + cut } : undefined,
    voiceCues: sliceCues(block, source - from, to - from, rate, `-${rightId}`, project) };
  const anchor = (value: AudioAnchor, end = false): AudioAnchor => {
    if (value.blockId !== blockId) return value;
    const offset = value.edge === 'end' ? entry.duration : Math.min(entry.duration, Math.max(0, value.seconds ?? 0));
    if (offset < cut || (end && Math.abs(offset - cut) < .001)) return offset >= cut - .001 ? { blockId, edge: 'end' } : { blockId, edge: 'start', seconds: offset };
    return offset >= entry.duration - .001 ? { blockId: rightId, edge: 'end' } : { blockId: rightId, edge: 'start', seconds: offset - cut };
  };
  return { ...project, blocks: project.blocks.flatMap(item => item.id === blockId ? [left, right] : [item]),
    sections: project.sections.map(section => section.id !== block.sectionId ? section : { ...section, audioLayers: section.audioLayers?.map(layer => ({ ...layer, start: anchor(layer.start), end: layer.end ? anchor(layer.end, true) : undefined, afterBlockId: layer.afterBlockId === blockId ? rightId : layer.afterBlockId })) }) };
}

/** Close the deleted gap while keeping tracks attached to the surviving voices. */
export function removeNarrativeBlock(project: PodcastProject, blockId: string): PodcastProject {
  const block = project.blocks.find(item => item.id === blockId && ['voice', 'silence', 'transition'].includes(item.type));
  if (!block) return project;
  const before = scopeSection(project, block.sectionId);
  const timeline = getTimeline(before);
  const entry = timeline.find(item => item.block.id === blockId)!;
  const blocks = project.blocks.filter(item => item.id !== blockId);
  const after = { ...before, blocks: blocks.filter(item => item.sectionId === block.sectionId) };
  const nextTimeline = getTimeline(after);
  const anchor = (value: AudioAnchor, end = false) => value.blockId === blockId ? anchorAtTime(nextTimeline, entry.start, end) : value;
  const previous = timeline.slice(0, timeline.indexOf(entry)).at(-1)?.block.id;
  const previouslyPlaced = new Set(resolveSectionLayers(before, timeline).map(item => item.layer.id));
  const section = { ...before.sections[0], audioLayers: before.sections[0].audioLayers?.map(layer => ({ ...layer, start: anchor(layer.start), end: layer.end ? anchor(layer.end, true) : undefined, afterBlockId: layer.afterBlockId === blockId ? previous : layer.afterBlockId })) };
  const placed = new Set(resolveSectionLayers({ ...after, sections: [section] }, nextTimeline).map(item => item.layer.id));
  // A track wholly inside the removed time has no playable range left. Assets
  // and the caller's undo snapshot retain it, including its original anchors.
  section.audioLayers = section.audioLayers?.filter(layer => !previouslyPlaced.has(layer.id) || placed.has(layer.id));
  return { ...project, blocks, sections: project.sections.map(item => item.id === block.sectionId ? section : item) };
}

/** The cutting toolbar only removes voice pieces. */
export function removeVoicePiece(project: PodcastProject, blockId: string): PodcastProject {
  return project.blocks.some(block => block.id === blockId && block.type === 'voice') ? removeNarrativeBlock(project, blockId) : project;
}
