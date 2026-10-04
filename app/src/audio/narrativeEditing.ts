import type { PodcastProject } from '../types';
import { syncLayerPauses } from './sectionLayers';

const managedIds = (project: PodcastProject) => new Set(project.sections.flatMap(section => section.audioLayers?.map(layer => layer.pauseBlockId) ?? []));

/** Sequential clips snap before another clip; linked sounds keep their anchors. */
export function reorderNarrativeBlock(project: PodcastProject, blockId: string, beforeId?: string): PodcastProject {
  const block = project.blocks.find(item => item.id === blockId);
  const managed = managedIds(project);
  if (!block || block.type === 'jingle' || managed.has(blockId) || beforeId === blockId) return project;
  if (beforeId && !project.blocks.some(item => item.id === beforeId && item.sectionId === block.sectionId && !managed.has(item.id))) return project;
  if (project.blocks.filter(item => item.sectionId === block.sectionId && !managed.has(item.id)).length < 2) return project;
  const blocks = project.blocks.filter(item => item.id !== blockId);
  const at = beforeId ? blocks.findIndex(item => item.id === beforeId) : blocks.reduce((last, item, index) => item.sectionId === block.sectionId ? index + 1 : last, 0);
  blocks.splice(at < 0 ? blocks.length : at, 0, block);
  const next = { ...project, blocks };
  syncLayerPauses(next);
  return next.blocks.every((item, index) => item.id === project.blocks[index]?.id) ? project : next;
}

/** A duplicate references the original audio but has independent editable settings. */
export function duplicateNarrativeBlock(project: PodcastProject, blockId: string, copyId: string): PodcastProject {
  const index = project.blocks.findIndex(item => item.id === blockId);
  const block = project.blocks[index];
  if (!block || block.type === 'jingle' || managedIds(project).has(blockId) || project.blocks.some(item => item.id === copyId)) return project;
  const copy = { ...block, id: copyId, title: `${block.title} – copie`, background: block.background ? { ...block.background } : undefined,
    voiceCues: block.voiceCues?.map(cue => ({ ...cue, id: `${cue.id}-${copyId}` })) };
  const next = { ...project, blocks: [...project.blocks] };
  next.blocks.splice(index + 1, 0, copy);
  syncLayerPauses(next);
  return next;
}
