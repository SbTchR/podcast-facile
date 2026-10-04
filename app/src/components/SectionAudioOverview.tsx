import type { PodcastBlock, PodcastProject, SectionAudioLayer } from '../types';
import { getTimeline } from '../audio/engine';
import { scopeSection } from '../audio/sectionTimeline';
import { SectionTimeline } from './SectionTimeline';

export function SectionAudioOverview({ project, sectionId, onAdd, onEdit, onVoice, onOpenVoice }: {
  project: PodcastProject; sectionId: string; onAdd: (kind: 'music' | 'sfx') => void;
  onEdit: (layer: SectionAudioLayer) => void; onVoice: (block: PodcastBlock) => void; onOpenVoice: () => void;
}) {
  const scoped = scopeSection(project, sectionId);
  const duration = getTimeline(scoped).at(-1)?.end ?? 0;
  return <div className="section-audio-overview">
    <SectionTimeline project={scoped} compact onSelect={onEdit} onSelectBlock={onVoice} onOpenVoice={onOpenVoice} onOpenTrack={duration > 0 ? onAdd : undefined} />
  </div>;
}
