import type { AudioAsset, RecordingTake } from '../types';
import type { PreviewSession } from '../audio/libraryPreview';
import type { WizardUI } from './SectionSoundWizard';

export function RecordingTakeList({ takes, assets, selectedAssetId, disabled, onSelect, onPreview, Preview }: {
  takes: RecordingTake[]; assets: AudioAsset[]; selectedAssetId?: string; disabled?: boolean;
  onSelect: (take: RecordingTake) => void; onPreview: (take: RecordingTake, signal: AbortSignal) => Promise<PreviewSession>; Preview: WizardUI['Preview'];
}) {
  if (!takes.length) return null;
  return <div className="recording-takes"><h4>Mes prises <small>{takes.length} · une seule dans le podcast</small></h4><div className="recording-take-list">{takes.map((take, index) => {
    const asset = assets.find(item => item.id === take.assetId);
    if (!asset) return null;
    const chosen = take.assetId === selectedAssetId;
    return <div key={take.id} className={`recording-take-row ${chosen ? 'chosen' : ''}`}><span><strong>Prise {index + 1}</strong><small>{(take.sourceEnd - take.sourceStart).toFixed(1).replace('.', ',')} s</small></span><Preview previewId={`saved-take-${take.id}`} label="Écouter" disabled={disabled} onStart={signal => onPreview(take, signal)} /><button className="secondary-button compact" disabled={disabled || chosen} aria-pressed={chosen} aria-label={`Utiliser la prise ${index + 1}`} onClick={() => onSelect(take)}>{chosen ? '✓ Choisie' : 'Utiliser'}</button></div>;
  })}</div></div>;
}
