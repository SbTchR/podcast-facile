import type { PodcastBlock, PodcastProject, SectionAudioLayer } from '../types';
import { scopeSection } from '../audio/sectionTimeline';
import { SectionTimeline } from './SectionTimeline';

export function SectionAudioOverview({ project, sectionId, onEdit, onVoice }: {
  project: PodcastProject; sectionId: string;
  onEdit: (layer: SectionAudioLayer) => void; onVoice: (block: PodcastBlock) => void;
}) {
  const scoped = scopeSection(project, sectionId);
  return <div className="section-audio-overview">
    <SectionTimeline project={scoped} compact onSelect={onEdit} onSelectBlock={onVoice} />
  </div>;
}
