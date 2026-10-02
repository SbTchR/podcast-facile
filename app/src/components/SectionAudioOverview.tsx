import type { PodcastBlock, PodcastProject, SectionAudioLayer } from '../types';
import { getTimeline } from '../audio/engine';
import { scopeSection } from '../audio/sectionTimeline';
import { SectionTimeline } from './SectionTimeline';

export function SectionAudioOverview({ project, sectionId, onAdd, onEdit, onVoice }: {
  project: PodcastProject; sectionId: string; onAdd: (kind: 'music' | 'sfx') => void;
  onEdit: (layer: SectionAudioLayer) => void; onVoice: (block: PodcastBlock) => void;
}) {
  const scoped = scopeSection(project, sectionId);
  const duration = getTimeline(scoped).at(-1)?.end ?? 0;
  if (duration <= 0) return null;
  return <div className="section-audio-overview">
    <SectionTimeline project={scoped} compact onSelect={onEdit} onSelectVoice={onVoice} onOpenTrack={onAdd} />
  </div>;
}
