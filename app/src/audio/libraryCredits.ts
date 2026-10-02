import { AUDIO_LIBRARY, type LibraryPreset } from '../data/audioLibrary';
import type { PodcastProject } from '../types';
import { getTimeline } from './engine';
import { resolveSectionLayers } from './sectionLayers';

// Credit only sounds still referenced by the rendered podcast, including legacy backgrounds.
export function usedLibraryCredits(project: PodcastProject): LibraryPreset[] {
  const timeline = getTimeline(project);
  const used = new Set<string>();
  for (const { block, start, end } of timeline) {
    if (end <= start) continue;
    for (const id of [block.assetId, block.background?.assetId, block.jingle?.musicAssetId,
      block.jingle?.openingAssetId, block.jingle?.closingAssetId,
      ...((block.voiceCues ?? []).map(cue => cue.assetId))]) {
      if (id) used.add(id);
    }
  }
  for (const item of resolveSectionLayers(project, timeline)) if (item.end > item.start) used.add(item.layer.assetId);
  const ids = new Set(project.assets.filter(asset => used.has(asset.id)).map(asset => asset.libraryId));
  return AUDIO_LIBRARY.filter(preset => ids.has(preset.id));
}
