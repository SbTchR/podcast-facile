import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import type { AudioAsset, PodcastBlock, PodcastProject, SectionAudioLayer } from '../types';
import { loadLibraryAudio, type LibraryKind, type LibraryPreset } from '../data/audioLibrary';
import { getTimeline, formatTime } from '../audio/engine';
import { putSectionLayer, removeSectionLayer, resolveSectionLayers } from '../audio/sectionLayers';
import { anchorAtTime, editLayerOnTimeline, scopeSection } from '../audio/sectionTimeline';
import type { PreviewSession } from '../audio/libraryPreview';
import { AudioExcerpt } from './AudioExcerpt';
import { SectionTimeline } from './SectionTimeline';
import { useSectionPlayback } from './useSectionPlayback';
import { VoiceSettings } from './VoiceSettings';

export interface WizardUI {
  Modal: ComponentType<{ title: string; onClose: () => void; wide?: boolean; children: ReactNode }>;
  FilePicker: ComponentType<{ label: string; onFile: (file: File) => void }>;
  Library: ComponentType<{ kind: LibraryKind; onClose: () => void; onChoose: (preset: LibraryPreset) => Promise<void> }>;
  Recorder?: ComponentType<{ onReady: (blob: Blob, duration: number) => Promise<void> | void; onBusyChange?: (busy: boolean) => void }>;
  Preview: ComponentType<{ previewId: string; onStart: (signal: AbortSignal) => Promise<PreviewSession>; disabled?: boolean; label?: string }>;
}
export type RegisterAsset = (blob: Blob, name: string, mimeType?: string, knownDuration?: number, metadata?: Pick<AudioAsset, 'source' | 'libraryId'>) => Promise<AudioAsset>;

export function SectionSoundWizard({ project, sectionId, kind, initial, initialVoiceId, onClose, onSave, onRegisterAsset, ui }: {
  project: PodcastProject; sectionId: string; kind: 'music' | 'sfx'; initial?: SectionAudioLayer; initialVoiceId?: string;
  onClose: () => void; onSave: (draft: PodcastProject) => void; onRegisterAsset: RegisterAsset; ui: WizardUI;
}) {
  const [phase, setPhase] = useState(kind);
  const [draft, setDraft] = useState(() => {
    const scoped = scopeSection(project, sectionId);
    return { ...scoped, sections: scoped.sections.map(section => ({ ...section, audioLayers: section.audioLayers?.map(layer => ({ ...layer, start: { ...layer.start }, end: layer.end ? { ...layer.end } : undefined })) })), blocks: scoped.blocks.map(block => ({ ...block })) };
  });
  const [addedAssets, setAddedAssets] = useState<AudioAsset[]>([]);
  const assets = useMemo(() => [...new Map([...project.assets, ...addedAssets].map(asset => [asset.id, asset])).values()], [project.assets, addedAssets]);
  const scoped = useMemo(() => ({ ...draft, assets }), [draft, assets]);
  const section = scoped.sections[0];
  const layers = section.audioLayers ?? [];
  const [selectedId, setSelectedId] = useState(initialVoiceId ? undefined : initial?.id ?? layers.find(layer => layer.kind === kind)?.id);
  const [selectedVoiceId, setSelectedVoiceId] = useState(initialVoiceId);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const player = useSectionPlayback(scoped);
  const timeline = getTimeline(scoped);
  const duration = timeline.at(-1)?.end ?? 0;
  const resolved = resolveSectionLayers(scoped, timeline);
  const selected = layers.find(layer => layer.id === selectedId);
  const selectedVoice = scoped.blocks.find(block => block.id === selectedVoiceId && block.type === 'voice');
  const position = resolved.find(item => item.layer.id === selectedId);
  const asset = assets.find(item => item.id === selected?.assetId);
  const invalid = layers.filter(layer => !resolved.some(item => item.layer.id === layer.id));
  const blocks = scoped.blocks.filter(block => !layers.some(layer => layer.pauseBlockId === block.id));
  const { Modal, FilePicker, Library, Recorder } = ui;

  const change = (layer: SectionAudioLayer, pauseAfterId: string | null = layer.afterBlockId ?? null) => {
    player.stop(); setError('');
    setDraft(current => {
      const next = { ...current, sections: current.sections.map(s => ({ ...s })), blocks: [...current.blocks] };
      putSectionLayer(next, sectionId, layer, pauseAfterId);
      return next;
    });
  };
  const update = (values: Partial<SectionAudioLayer>) => { if (selected) change({ ...selected, ...values }); };
  const edit = (layer: SectionAudioLayer, action: 'move' | 'start' | 'end', at: number) => change(editLayerOnTimeline(scoped, layer, action, at), null);
  const select = (layer: SectionAudioLayer) => { player.stop(); setSelectedVoiceId(undefined); setPhase(layer.kind); setSelectedId(layer.id); };
  const selectVoice = (block: PodcastBlock) => { player.stop(); setSelectedId(undefined); setSelectedVoiceId(block.id); };
  const updateVoice = (values: Partial<PodcastBlock>) => {
    player.stop();
    setDraft(current => ({ ...current, blocks: current.blocks.map(block => block.id === selectedVoiceId ? { ...block, ...values } : block) }));
  };
  const movePhase = (next: 'music' | 'sfx') => { player.stop(); setSelectedVoiceId(undefined); setPhase(next); setSelectedId(layers.find(layer => layer.kind === next)?.id); setError(''); };
  const addAsset = (chosen: AudioAsset, preset?: LibraryPreset) => {
    if (!mounted.current) return;
    setAddedAssets(current => [...current.filter(a => a.id !== chosen.id), chosen]);
    const sourceStart = Math.min(preset?.clipStart ?? 0, Math.max(0, chosen.duration - .05));
    const sourceEnd = Math.min(chosen.duration, sourceStart + (preset?.clipDuration ?? chosen.duration));
    const at = phase === 'music' ? 0 : Math.min(player.position, Math.max(0, duration - .05));
    const layer: SectionAudioLayer = {
      id: crypto.randomUUID(), kind: phase, title: chosen.name, assetId: chosen.id, sourceStart, sourceEnd,
      start: anchorAtTime(timeline, at), end: phase === 'music' ? { edge: 'end' } : undefined,
      volume: phase === 'music' ? 32 : 55, fadeIn: phase === 'music' ? 'normal' : 'none', fadeOut: phase === 'music' ? 'normal' : 'short', repeat: phase === 'music' && sourceEnd - sourceStart < duration,
    };
    change(layer, null); setSelectedVoiceId(undefined); setSelectedId(layer.id); setLibraryOpen(false);
  };
  const chooseLibrary = async (preset: LibraryPreset) => {
    const existing = assets.find(item => item.libraryId === preset.id);
    const chosen = existing ?? await onRegisterAsset(await loadLibraryAudio(preset), preset.title, undefined, undefined, { source: 'library', libraryId: preset.id });
    addAsset(chosen, preset);
  };
  const importFile = async (file: File) => {
    player.stop(); setLoading(true); setError('');
    try { addAsset(await onRegisterAsset(file, file.name, file.type, undefined, { source: 'import' })); }
    catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : 'Impossible de lire ce son.'); }
    finally { if (mounted.current) setLoading(false); }
  };
  const remove = () => {
    if (!selected) return;
    player.stop();
    setDraft(current => {
      const next = { ...current, sections: current.sections.map(s => ({ ...s })), blocks: [...current.blocks] };
      removeSectionLayer(next, sectionId, selected.id); return next;
    });
    setSelectedId(undefined);
  };
  const excerptChange = (sourceStart: number, sourceEnd: number) => {
    if (!selected) return;
    update({ sourceStart, sourceEnd, end: selected.pauseBlockId ? selected.end : !selected.repeat && position ? anchorAtTime(timeline, Math.min(duration, position.start + sourceEnd - sourceStart), true) : selected.end });
  };

  return <>
    <Modal title={section.title} onClose={onClose} wide>
      <div className="part-sound-editor">
        <nav className="sound-phase-tabs" aria-label="Étapes de l’habillage">{(['music','sfx'] as const).map((item, index) => <button key={item} disabled={loading} className={phase === item ? 'selected' : ''} aria-pressed={phase === item} onClick={() => movePhase(item)}><span>{index + 1}</span>{item === 'music' ? 'Musiques de fond' : 'Bruitages'}</button>)}</nav>
        <div className="sound-editor-heading"><div className="sound-editor-actions"><button className="secondary-button" disabled={loading} onClick={() => { player.stop(); setLibraryOpen(true); }}>＋ Ajouter {phase === 'music' ? 'une musique' : 'un bruitage'}</button><button className="secondary-button" disabled={duration <= 0 || Boolean(invalid.length) || loading} aria-label={player.status === 'loading' ? 'Annuler le chargement de la partie' : player.status === 'playing' ? 'Mettre la partie en pause' : 'Écouter la partie avec les voix'} onClick={() => void player.toggle()}>{player.status === 'loading' ? 'Chargement…' : player.status === 'playing' ? 'Ⅱ Pause' : '▶ Écouter la partie'}</button><span>{formatTime(player.position)} / {formatTime(duration)}</span></div></div>
        <SectionTimeline project={scoped} selectedId={selectedId} selectedVoiceId={selectedVoiceId} phase={phase} playhead={player.position} onSeek={player.seek} onSelect={select} onSelectVoice={selectVoice} onEdit={edit} />
        {selectedVoice && <VoiceSettings block={selectedVoice} onChange={updateVoice} />}
        {selected && asset && <div className="sound-inspector">
          <div className="setting-title-row"><h4>{selected.title}</h4><button className="danger-text" onClick={remove}>Retirer ce son</button></div>
          {!position && <button className="secondary-button compact" onClick={() => {
            const at = Math.min(player.position, Math.max(0, duration - .05));
            change({ ...selected, start: anchorAtTime(timeline, at), end: selected.repeat ? { edge: 'end' } : anchorAtTime(timeline, Math.min(duration, at + selected.sourceEnd - selected.sourceStart), true) }, null);
          }}>Placer au repère d’écoute</button>}
          <div className="sound-position-fields">
            {selected.pauseBlockId && <label className="field"><span>Entendre le son seul après</span><select value={selected.afterBlockId} onChange={event => change(selected, event.target.value)}>{blocks.map(block => <option key={block.id} value={block.id}>{block.title}</option>)}</select></label>}
            <label className="field music-volume-slider"><span>Volume · {selected.volume}%</span><input aria-label="Volume du son" type="range" min="0" max="100" value={selected.volume} onChange={event => update({ volume: Number(event.target.value) })} /></label>
          </div>
          <details className="sound-excerpt" open><summary>Extrait du fichier</summary><AudioExcerpt asset={asset} start={selected.sourceStart} end={selected.sourceEnd} onChange={excerptChange} compact /></details>
          <div className="sound-options">
            {selected.kind === 'music' ? <label className="check-row"><input type="checkbox" checked={selected.repeat} onChange={event => update({ repeat: event.target.checked })} /> Répéter l’extrait dans la zone choisie</label> : <label className="check-row"><input type="checkbox" checked={Boolean(selected.pauseBlockId)} onChange={event => event.target.checked ? change(selected, blocks.find(block => block.type === 'voice')?.id ?? blocks[0]?.id ?? null) : change({ ...selected, start: { edge: 'start' }, end: undefined }, null)} /> Créer une pause pour entendre ce bruitage seul</label>}
            <details className="optional-settings"><summary>Fondus <small>facultatif</small></summary><div className="settings-columns">{(['fadeIn','fadeOut'] as const).map(key => <label className="field" key={key}><span>{key === 'fadeIn' ? 'Arrivée du son' : 'Fin du son'}</span><select value={selected[key]} onChange={event => update({ [key]: event.target.value })}><option value="none">Directe</option><option value="short">Fondu court · 0,5 s</option><option value="normal">Fondu doux · 1,5 s</option></select></label>)}</div></details>
          </div>
        </div>}
        {!selected && !selectedVoice && <p className="sound-editor-empty">{layers.some(layer => layer.kind === phase) ? 'Choisis une piste à modifier.' : phase === 'music' ? 'Ajoute une musique ou passe aux bruitages.' : 'Ajoute un bruitage ou enregistre la partie.'}</p>}
        <div className="sound-import-actions"><FilePicker label={`Importer ${phase === 'music' ? 'une musique' : 'un bruitage'}`} onFile={file => void importFile(file)} />{phase === 'sfx' && Recorder && <details><summary>Enregistrer mon bruitage</summary><Recorder onBusyChange={busy => { if (busy) player.stop(); setLoading(busy); }} onReady={async (blob, recordedDuration) => addAsset(await onRegisterAsset(blob, 'Mon bruitage enregistré', blob.type, recordedDuration, { source: 'recording' }))} /></details>}</div>
        {(error || player.error) && <p className="error-box" role="alert">{error || player.error}</p>}
        {invalid.length > 0 && <p className="error-box" role="alert">{invalid.length} son{invalid.length > 1 ? 's' : ''} à replacer : clique sur la piste pour corriger son début ou sa fin.</p>}
      </div>
      <div className="modal-footer"><button className="ghost-button" disabled={loading} onClick={onClose}>Annuler</button><span className="footer-spacer" />{phase === 'music' && !selectedVoice && <button className="ghost-button" disabled={loading} onClick={() => movePhase('sfx')}>Bruitages →</button>}<button className="primary-button" disabled={loading || invalid.length > 0} onClick={() => { player.stop(); onSave(scoped); }}>✓ Enregistrer la partie</button></div>
    </Modal>
    {libraryOpen && <Library kind={phase} onClose={() => setLibraryOpen(false)} onChoose={chooseLibrary} />}
  </>;
}
