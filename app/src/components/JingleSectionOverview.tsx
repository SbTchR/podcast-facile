import type { AudioAsset, JingleVoicePart, PodcastBlock } from '../types';
import { getGuidedJinglePlan } from '../audio/jinglePlan';
import { RADIO_JINGLE_PARTS, JINGLE_PART_LABELS, isJinglePartEnabled, jinglePartScript, jinglePartSpeakerClass } from '../audio/jingleParts';
import { previewRadioJingleTakes } from '../audio/radioJingleVoice';
import type { WizardUI } from './SectionSoundWizard';
import { SectionElementCard } from './SectionElementCard';
import { JingleTiming } from './JingleTiming';

export function JingleSectionOverview({ block, assets, podcastTitle, onEdit, onToggle, Preview }: {
  block: PodcastBlock; assets: AudioAsset[]; podcastTitle: string; onEdit: (part?: JingleVoicePart) => void; onToggle: (part: JingleVoicePart, included: boolean) => void; Preview: WizardUI['Preview'];
}) {
  const jingle = block.jingle!;
  const plan = getGuidedJinglePlan(block, assets);
  return <div className="jingle-section-content">
    <JingleTiming plan={plan} compact onTake={onEdit} jingle={jingle} />
    <div className="jingle-part-list">{RADIO_JINGLE_PARTS.filter(part => jingle.mode !== 'simple' || isJinglePartEnabled(jingle, part)).map(part => {
      const take = jingle.takes?.[part], asset = assets.find(item => item.id === take?.assetId);
      return <SectionElementCard key={part} className={`jingle-part-card ${jinglePartSpeakerClass(jingle, part)}`} icon="🎙" title={JINGLE_PART_LABELS[part]}
        detail={take && asset ? `${(take.sourceEnd - take.sourceStart).toFixed(1).replace('.', ',')} s · ${jinglePartScript(jingle, podcastTitle, part)}` : 'À enregistrer'}
        included={isJinglePartEnabled(jingle, part)} onInclude={included => onToggle(part, included)} onEdit={() => onEdit(part)} editLabel={take && asset ? 'Modifier' : 'Enregistrer'}>
        {take && asset && <Preview previewId={`jingle-part-${block.id}-${part}`} label={`Écouter ${JINGLE_PART_LABELS[part].toLocaleLowerCase('fr')}`} onStart={signal => previewRadioJingleTakes([{ part, take, asset, at: 0 }], jingle.style, signal, jingle.effects)} />}
      </SectionElementCard>;
    })}</div>
  </div>;
}
