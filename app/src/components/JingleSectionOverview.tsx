import type { AudioAsset, JingleVoicePart, PodcastBlock } from '../types';
import { getGuidedJinglePlan } from '../audio/jinglePlan';
import { RADIO_JINGLE_PARTS, JINGLE_PART_LABELS, isJingleEcho, jinglePartScript } from '../audio/jingleParts';
import { previewRadioJingleTakes } from '../audio/radioJingleVoice';
import type { PreviewSession } from '../audio/libraryPreview';
import type { WizardUI } from './SectionSoundWizard';
import { JingleTiming } from './JingleTiming';

export function JingleSectionOverview({ block, assets, podcastTitle, onEdit, onPreview, Preview }: {
  block: PodcastBlock; assets: AudioAsset[]; podcastTitle: string; onEdit: (part?: JingleVoicePart) => void;
  onPreview: () => Promise<PreviewSession>; Preview: WizardUI['Preview'];
}) {
  const jingle = block.jingle!;
  const plan = getGuidedJinglePlan(block, assets);
  return <div className="jingle-section-content">
    <h3 className="narrative-heading"><span className="stage-number">1</span> Voix du jingle</h3>
    <div className="jingle-part-list">{RADIO_JINGLE_PARTS.map(part => {
      const take = jingle.takes?.[part], asset = assets.find(item => item.id === take?.assetId);
      return <article key={part} className={`jingle-part-card ${isJingleEcho(part) ? 'reply' : ''}`}>
        <span className="block-icon" aria-hidden="true">🎙</span>
        <div className="block-info"><strong>{JINGLE_PART_LABELS[part]}</strong><small>{take && asset ? `${plan.durations[part].toFixed(1).replace('.', ',')} s · ${jinglePartScript(jingle, podcastTitle, part)}` : 'À enregistrer'}</small></div>
        <button className="jingle-part-edit" onClick={() => onEdit(part)}>✎ {take && asset ? 'Modifier' : 'Enregistrer'}</button>
        {take && asset && <Preview previewId={`jingle-part-${block.id}-${part}`} label={`Écouter ${JINGLE_PART_LABELS[part].toLocaleLowerCase('fr')}`} onStart={signal => previewRadioJingleTakes([{ part, take, asset, at: 0 }], jingle.style, signal, jingle.effects)} />}
      </article>;
    })}</div>
    <div className="narrative-actions"><button className="ghost-button compact" onClick={() => onEdit()}>✎ Modifier le jingle</button><Preview previewId={`jingle-section-${block.id}`} label="Écouter le jingle" disabled={!plan.ready} onStart={onPreview} /></div>
    <JingleTiming plan={plan} compact onTake={onEdit} />
  </div>;
}
