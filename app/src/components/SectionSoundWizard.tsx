import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import type { AudioAsset, BlockType, PodcastBlock, PodcastProject, SectionAudioLayer } from '../types';
import { loadLibraryAudio, type LibraryKind, type LibraryPreset, type SoundGroup } from '../data/audioLibrary';
import { getTimeline, formatTime, getBlockDuration, playProject } from '../audio/engine';
import { putSectionLayer, removeSectionLayer, resolveSectionLayers, syncLayerPauses } from '../audio/sectionLayers';
import { anchorAtTime, editLayerOnTimeline, scopeSection } from '../audio/sectionTimeline';
import type { PreviewSession } from '../audio/libraryPreview';
import { AudioExcerpt } from './AudioExcerpt';
import { SectionTimeline } from './SectionTimeline';
import { useSectionPlayback } from './useSectionPlayback';
import { VoiceSettings } from './VoiceSettings';
import { removeVoicePiece, removeNarrativeBlock, splitVoice, voiceSplitPoint } from '../audio/voiceEditing';

export interface WizardUI {
  Modal: ComponentType<{ title: string; onClose: () => void; wide?: boolean; children: ReactNode }>;
  FilePicker: ComponentType<{ label: string; onFile: (file: File) => void }>;
  Library: ComponentType<{ kind: LibraryKind; initialSoundGroup?: SoundGroup; onClose: () => void; onChoose: (preset: LibraryPreset) => Promise<void> }>;
  Recorder?: ComponentType<{ onReady: (blob: Blob, duration: number) => Promise<void> | void; onBusyChange?: (busy: boolean) => void }>;
  createBlock: (type: BlockType, sectionId: string) => PodcastBlock;
  BlockEditor: ComponentType<{
    block: PodcastBlock; assets: AudioAsset[]; podcastTitle: string; isNew: boolean; embedded?: boolean;
    onClose: () => void; onSave: (block: PodcastBlock) => void; onRegisterAsset: RegisterAsset;
    onPreview: (block: PodcastBlock) => Promise<PreviewSession>; onBusyChange?: (busy: boolean) => void;
  }>;
  Preview: ComponentType<{ previewId: string; onStart: (signal: AbortSignal) => Promise<PreviewSession>; disabled?: boolean; label?: string }>;
}
export type RegisterAsset = (blob: Blob, name: string, mimeType?: string, knownDuration?: number, metadata?: Pick<AudioAsset, 'source' | 'libraryId'>) => Promise<AudioAsset>;

export function SectionSoundWizard({ project, sectionId, kind, initial, initialVoiceId, initialBlockId, newBlockType, onClose, onSave, onRegisterAsset, ui }: {
  project: PodcastProject; sectionId: string; kind: 'voice' | 'music' | 'sfx'; initial?: SectionAudioLayer; initialVoiceId?: string; initialBlockId?: string; newBlockType?: 'voice' | 'silence' | 'transition';
  onClose: () => void; onSave: (draft: PodcastProject) => void; onRegisterAsset: RegisterAsset; ui: WizardUI;
}) {
  const [phase, setPhase] = useState(kind);
  const [draft, setDraft] = useState<PodcastProject>(() => {
    const scoped = scopeSection(project, sectionId);
    return { ...scoped, sections: scoped.sections.map(section => ({ ...section, audioLayers: section.audioLayers?.map(layer => ({ ...layer, start: { ...layer.start }, end: layer.end ? { ...layer.end } : undefined })) })), blocks: scoped.blocks.map(block => ({ ...block })) };
  });
  const [addedAssets, setAddedAssets] = useState<AudioAsset[]>([]);
  const assets = useMemo(() => [...new Map([...project.assets, ...addedAssets].map(asset => [asset.id, asset])).values()], [project.assets, addedAssets]);
  const scoped = useMemo(() => ({ ...draft, assets }), [draft, assets]);
  const section = scoped.sections[0];
  const layers = section.audioLayers ?? [];
  const [selectedId, setSelectedId] = useState(initialVoiceId ? undefined : initial?.id ?? layers.find(layer => layer.kind === kind)?.id);
  const [selectedVoiceId, setSelectedVoiceId] = useState(initialVoiceId ?? initialBlockId);
  const [itemEditor, setItemEditor] = useState<{ block: PodcastBlock; isNew: boolean } | null>(() => {
    const existing = project.blocks.find(block => block.id === initialBlockId && block.sectionId === sectionId);
    return existing ? { block: existing, isNew: false } : newBlockType ? { block: ui.createBlock(newBlockType, sectionId), isNew: true } : null;
  });
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryGroup, setLibraryGroup] = useState<SoundGroup>('effect');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<{ draft: PodcastProject; voiceId?: string; layerId?: string; phase: 'voice' | 'music' | 'sfx'; position: number }[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  const transportRef = useRef<HTMLButtonElement>(null);
  const draftRef = useRef(draft); draftRef.current = draft;
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
  const { Modal, FilePicker, Library, Recorder, BlockEditor } = ui;
  const canPlay = duration > 0 && !invalid.length && !loading && !itemEditor;
  const canSplit = selectedVoice && voiceSplitPoint(scoped, selectedVoice.id, player.position) !== undefined;
  const shortcuts = useRef({ canPlay, libraryOpen, toggle: player.toggle });
  shortcuts.current = { canPlay, libraryOpen, toggle: player.toggle };
  useEffect(() => {
    transportRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      const current = shortcuts.current;
      const dialog = editorRef.current?.closest('[data-podcast-dialog]');
      if (event.code !== 'Space' || event.ctrlKey || event.altKey || event.metaKey || current.libraryOpen || !current.canPlay || document.querySelectorAll('[data-podcast-dialog]').item(document.querySelectorAll('[data-podcast-dialog]').length - 1) !== dialog) return;
      const target = event.target as HTMLElement | null;
      // Text entry and native controls keep their usual Space behavior.
      if (target?.closest('input, textarea, select, button, summary, [contenteditable="true"], [role="textbox"]')) return;
      event.preventDefault(); event.stopPropagation();
      if (!event.repeat) void current.toggle();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, []);
  const commit = (next: PodcastProject) => {
    const snapshot = { draft: draftRef.current, voiceId: selectedVoiceId, layerId: selectedId, phase, position: player.position };
    setHistory(current => [...current.slice(-39), snapshot]);
    draftRef.current = next; setDraft(next); setError('');
  };
  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    player.seek(previous.position); draftRef.current = previous.draft; setDraft(previous.draft);
    setSelectedVoiceId(previous.voiceId); setSelectedId(previous.layerId); setPhase(previous.phase); setHistory(current => current.slice(0, -1)); setError('');
  };
  const cutVoice = () => {
    if (!selectedVoice || !canSplit) return;
    const id = crypto.randomUUID();
    const next = splitVoice(scoped, selectedVoice.id, player.position, id);
    player.stop(); syncLayerPauses(next); commit(next); setSelectedVoiceId(id);
  };
  const deleteVoice = () => {
    if (!selectedVoice) return;
    const start = timeline.find(entry => entry.block.id === selectedVoice.id)?.start ?? 0;
    const next = removeVoicePiece(scoped, selectedVoice.id);
    player.seek(Math.min(start, getTimeline(next).at(-1)?.end ?? 0));
    syncLayerPauses(next); commit(next); setSelectedVoiceId(undefined);
  };

  const change = (layer: SectionAudioLayer, pauseAfterId: string | null = layer.afterBlockId ?? null) => {
    player.stop(); setError('');
    const current = draftRef.current;
    const next = { ...current, sections: current.sections.map(s => ({ ...s })), blocks: [...current.blocks] };
    putSectionLayer(next, sectionId, layer, pauseAfterId); commit(next);
  };
  const update = (values: Partial<SectionAudioLayer>) => { if (selected) change({ ...selected, ...values }); };
  const edit = (layer: SectionAudioLayer, action: 'move' | 'start' | 'end', at: number) => { if (!loading) change(editLayerOnTimeline(scoped, layer, action, at), null); };
  const select = (layer: SectionAudioLayer) => { if (loading) return; player.stop(); setSelectedVoiceId(undefined); setPhase(layer.kind); setSelectedId(layer.id); };
  const selectVoice = (block: PodcastBlock) => { player.stop(); setSelectedId(undefined); setPhase('voice'); setSelectedVoiceId(block.id); };
  const updateVoice = (values: Partial<PodcastBlock>) => {
    player.stop();
    const current = draftRef.current;
    commit({ ...current, blocks: current.blocks.map(block => block.id === selectedVoiceId ? { ...block, ...values } : block) });
  };
  const movePhase = (next: 'voice' | 'music' | 'sfx') => { player.stop(); setSelectedVoiceId(undefined); setPhase(next); setSelectedId(layers.find(layer => layer.kind === next)?.id); setError(''); };
  const addAsset = (chosen: AudioAsset, preset?: LibraryPreset) => {
    if (!mounted.current || phase === 'voice') return;
    setAddedAssets(current => [...current.filter(a => a.id !== chosen.id), chosen]);
    const sourceStart = Math.min(preset?.clipStart ?? 0, Math.max(0, chosen.duration - .05));
    const sourceEnd = Math.min(chosen.duration, sourceStart + (preset?.clipDuration ?? chosen.duration));
    const ambience = preset?.soundGroup === 'ambience';
    const background = phase === 'music' || ambience;
    const at = background ? 0 : Math.min(player.position, Math.max(0, duration - .05));
    const layer: SectionAudioLayer = {
      id: crypto.randomUUID(), kind: phase, title: chosen.name, assetId: chosen.id, sourceStart, sourceEnd,
      soundGroup: phase === 'sfx' ? preset?.soundGroup ?? 'effect' : undefined,
      start: anchorAtTime(timeline, at), end: background ? { edge: 'end' } : undefined,
      volume: ambience ? 35 : phase === 'music' ? 32 : 55, pauseVolume: phase === 'music' ? 75 : undefined, fadeIn: background ? 'normal' : 'none', fadeOut: background ? 'normal' : 'short', repeat: background && sourceEnd - sourceStart < duration,
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
    const current = draftRef.current;
    const next = { ...current, sections: current.sections.map(s => ({ ...s })), blocks: [...current.blocks] };
    removeSectionLayer(next, sectionId, selected.id); commit(next);
    setSelectedId(undefined);
  };
  const excerptChange = (sourceStart: number, sourceEnd: number) => {
    if (!selected) return;
    update({ sourceStart, sourceEnd, end: selected.pauseBlockId ? selected.end : !selected.repeat && position ? anchorAtTime(timeline, Math.min(duration, position.start + sourceEnd - sourceStart), true) : selected.end });
  };

  const registerVoiceAsset: RegisterAsset = async (...args) => {
    const chosen = await onRegisterAsset(...args);
    if (mounted.current) setAddedAssets(current => [...current.filter(asset => asset.id !== chosen.id), chosen]);
    return chosen;
  };
  const openItem = (block: PodcastBlock, isNew = false) => {
    player.stop(); setPhase('voice'); setSelectedId(undefined); setSelectedVoiceId(block.type === 'voice' ? block.id : undefined);
    setItemEditor({ block, isNew }); setError('');
  };
  const keepItem = (block: PodcastBlock) => {
    const current = draftRef.current;
    const exists = current.blocks.some(item => item.id === block.id);
    const next = { ...current, blocks: exists ? current.blocks.map(item => item.id === block.id ? block : item) : [...current.blocks, block] };
    syncLayerPauses(next); commit(next); setItemEditor(null); setSelectedVoiceId(block.type === 'voice' ? block.id : undefined);
  };
  const moveItem = (block: PodcastBlock, direction: -1 | 1) => {
    player.stop();
    const current = draftRef.current;
    const from = current.blocks.findIndex(item => item.id === block.id);
    const target = blocks[blocks.findIndex(item => item.id === block.id) + direction];
    if (!target) return;
    const to = current.blocks.findIndex(item => item.id === target.id);
    const next = { ...current, blocks: [...current.blocks] };
    [next.blocks[from], next.blocks[to]] = [next.blocks[to], next.blocks[from]];
    syncLayerPauses(next); commit(next);
  };
  const deleteItem = (block: PodcastBlock) => {
    player.stop(); const next = removeNarrativeBlock(scoped, block.id); syncLayerPauses(next); commit(next);
    setSelectedVoiceId(undefined); player.seek(Math.min(player.position, getTimeline(next).at(-1)?.end ?? 0));
  };

  return <>
    <Modal title={section.title} onClose={() => { if (!loading) onClose(); }} wide>
      <div className="part-sound-editor" ref={editorRef}>
        <nav className="sound-phase-tabs" aria-label="Édition de la partie">{(['voice','music','sfx'] as const).map(item => <button key={item} disabled={loading} className={phase === item ? 'selected' : ''} aria-pressed={phase === item} onClick={() => movePhase(item)}>{item === 'voice' ? 'Enregistrements vocaux' : item === 'music' ? 'Musiques de fond' : 'Ambiances et bruitages'}</button>)}</nav>
        <div className="sound-editor-heading"><div className="sound-editor-actions">{phase === 'voice' ? <>{(['voice', 'silence', 'transition'] as const).map(type => <button className="secondary-button" key={type} disabled={loading || Boolean(itemEditor)} onClick={() => openItem(ui.createBlock(type, sectionId), true)}>＋ {type === 'voice' ? 'Enregistrer une voix' : type === 'silence' ? 'Pause/Musique seule' : 'Transition'}</button>)}</> : <><button className="secondary-button" disabled={loading} onClick={() => { player.stop(); setLibraryGroup('effect'); setLibraryOpen(true); }}>＋ Ajouter {phase === 'music' ? 'une musique' : 'un bruitage'}</button>{phase === 'sfx' && <button className="secondary-button" disabled={loading} onClick={() => { player.stop(); setLibraryGroup('ambience'); setLibraryOpen(true); }}>＋ Ajouter une ambiance</button>}</>}</div></div>
        <div className="section-transport" aria-label="Lecture et découpe de la partie">
          <button ref={transportRef} className="primary-button compact" disabled={!canPlay} aria-label={player.status === 'loading' ? 'Annuler le chargement de la partie' : player.status === 'playing' ? 'Mettre la partie en pause' : 'Écouter la partie avec les voix'} onClick={() => void player.toggle()}>{player.status === 'loading' ? 'Chargement…' : player.status === 'playing' ? 'Ⅱ Pause' : '▶ Écouter la partie'}</button>
          <output aria-label="Position de lecture">{player.position.toFixed(1).replace('.', ',')} s / {formatTime(duration)}</output><kbd>Espace</kbd>
          <span className="transport-spacer" />
          {selectedVoice && <><button className="secondary-button compact" disabled={!canSplit || loading || Boolean(itemEditor)} onClick={cutVoice} title={canSplit ? 'Créer deux morceaux à la position du repère' : 'Place le repère à l’intérieur de la voix sélectionnée'}>✂ Scinder au repère</button><button className="danger-text" disabled={loading || Boolean(itemEditor)} onClick={deleteVoice}>Supprimer ce morceau</button></>}
          <button className="ghost-button compact" disabled={!history.length || loading || Boolean(itemEditor)} onClick={undo} aria-label="Annuler la dernière modification">↶ Annuler</button>
        </div>
        <SectionTimeline project={scoped} selectedId={selectedId} selectedVoiceId={selectedVoiceId} phase={phase === 'voice' ? undefined : phase} playhead={player.position} onSeek={at => { if (!loading) player.seek(at); }} onSelect={select} onSelectVoice={block => { if (!loading) selectVoice(block); }} onEdit={edit} />
        {phase === 'voice' && selectedVoice && !itemEditor && <p className="voice-cut-help">Clique sur la règle pour placer une coupe. Deux coupes permettent de supprimer un passage au milieu.</p>}
        {phase === 'voice' && <div className="part-recording-list">{blocks.map((block, index) => <article className={`part-recording-row ${selectedVoiceId === block.id ? 'selected' : ''}`} key={block.id}>
          <button className="part-recording-select" disabled={loading || Boolean(itemEditor)} onClick={() => block.type === 'voice' ? selectVoice(block) : openItem(block)}><span aria-hidden="true">{block.type === 'voice' ? '🎙' : block.type === 'silence' ? '⏸' : '↗'}</span><span><strong>{block.title}</strong><small>{block.type === 'silence' ? 'Pause/Musique seule · ' : ''}{formatTime(getBlockDuration(block, assets))}</small></span></button>
          <button className="ghost-button compact" disabled={loading || Boolean(itemEditor)} onClick={() => openItem(block)}>✎ Modifier</button>
          <button className="mini-button" aria-label={`Monter ${block.title}`} disabled={index === 0 || loading || Boolean(itemEditor)} onClick={() => moveItem(block, -1)}>↑</button><button className="mini-button" aria-label={`Descendre ${block.title}`} disabled={index === blocks.length - 1 || loading || Boolean(itemEditor)} onClick={() => moveItem(block, 1)}>↓</button>
          <button className="mini-button danger" aria-label={`Retirer ${block.title}`} disabled={loading || Boolean(itemEditor)} onClick={() => deleteItem(block)}>×</button>
        </article>)}{!blocks.length && !itemEditor && <p className="sound-editor-empty">Enregistre une première voix, puis ajoute une pause ou une transition si tu le souhaites.</p>}</div>}
        {itemEditor && <div className="part-inline-editor" hidden={phase !== 'voice'}><BlockEditor key={itemEditor.block.id} embedded block={itemEditor.block} assets={assets} podcastTitle={project.title} isNew={itemEditor.isNew} onClose={() => setItemEditor(null)} onSave={keepItem} onRegisterAsset={registerVoiceAsset} onBusyChange={setLoading} onPreview={block => playProject({ ...scoped, sections: scoped.sections.map(section => ({ ...section, audioLayers: [] })), blocks: [block] }, 0)} /></div>}
        {phase === 'voice' && selectedVoice && !itemEditor && <><div className="setting-title-row"><h4>{selectedVoice.title}</h4><button className="secondary-button compact" onClick={() => openItem(selectedVoice)}>Modifier l’enregistrement et le texte</button></div><VoiceSettings block={selectedVoice} onChange={updateVoice} /></>}
        {phase !== 'voice' && selected && asset && <div className="sound-inspector">
          <div className="setting-title-row"><h4>{selected.title}</h4><button className="danger-text" onClick={remove}>Retirer ce son</button></div>
          {!position && <button className="secondary-button compact" onClick={() => {
            const at = Math.min(player.position, Math.max(0, duration - .05));
            change({ ...selected, start: anchorAtTime(timeline, at), end: selected.repeat ? { edge: 'end' } : anchorAtTime(timeline, Math.min(duration, at + selected.sourceEnd - selected.sourceStart), true) }, null);
          }}>Placer au repère d’écoute</button>}
          <div className="sound-position-fields">
            {selected.pauseBlockId && <label className="field"><span>Entendre le son seul après</span><select value={selected.afterBlockId} onChange={event => change(selected, event.target.value)}>{blocks.map(block => <option key={block.id} value={block.id}>{block.title}</option>)}</select></label>}
            <label className="field music-volume-slider"><span>{selected.kind === 'music' ? 'Volume sous les voix' : 'Volume'} · {selected.volume}%</span><input aria-label={selected.kind === 'music' ? 'Volume sous les voix' : 'Volume du son'} type="range" min="0" max="100" value={selected.volume} onChange={event => update({ volume: Number(event.target.value), ...(selected.pauseVolume !== undefined ? { pauseVolume: Math.max(selected.pauseVolume, Number(event.target.value)) } : {}) })} /></label>
          </div>
          {selected.kind === 'music' && <div className="music-pause-level">
            <label className="check-row"><input type="checkbox" checked={selected.pauseVolume !== undefined} onChange={event => update({ pauseVolume: event.target.checked ? Math.max(75, selected.volume) : undefined })} /> Remonter la musique pendant les pauses</label>
            {selected.pauseVolume !== undefined && <label className="field music-volume-slider"><span>Volume pendant les pauses · {Math.max(selected.volume, selected.pauseVolume)}%</span><input type="range" aria-label="Volume pendant les pauses" min={selected.volume} max="100" value={Math.max(selected.volume, selected.pauseVolume)} onChange={event => update({ pauseVolume: Number(event.target.value) })} /></label>}
          </div>}
          <details className="sound-excerpt" open><summary>Extrait du fichier</summary><AudioExcerpt asset={asset} start={selected.sourceStart} end={selected.sourceEnd} onChange={excerptChange} compact /></details>
          <div className="sound-options">
            {selected.kind === 'music' || selected.soundGroup === 'ambience' ? <label className="check-row"><input type="checkbox" checked={selected.repeat} onChange={event => update({ repeat: event.target.checked })} /> Répéter l’extrait dans la zone choisie</label> : <label className="check-row"><input type="checkbox" checked={Boolean(selected.pauseBlockId)} onChange={event => event.target.checked ? change(selected, blocks.find(block => block.type === 'voice')?.id ?? blocks[0]?.id ?? null) : change({ ...selected, start: { edge: 'start' }, end: undefined }, null)} /> Créer une pause pour entendre ce bruitage seul</label>}
            <details className="optional-settings"><summary>Fondus <small>facultatif</small></summary><div className="settings-columns">{(['fadeIn','fadeOut'] as const).map(key => <label className="field" key={key}><span>{key === 'fadeIn' ? 'Arrivée du son' : 'Fin du son'}</span><select value={selected[key]} onChange={event => update({ [key]: event.target.value })}><option value="none">Directe</option><option value="short">Fondu court · 0,5 s</option><option value="normal">Fondu doux · 1,5 s</option></select></label>)}</div></details>
          </div>
        </div>}
        {phase !== 'voice' && !selected && !selectedVoice && <p className="sound-editor-empty">{layers.some(layer => layer.kind === phase) ? 'Choisis une piste à modifier.' : phase === 'music' ? 'Ajoute une musique ou passe aux ambiances et bruitages.' : 'Ajoute une ambiance ou un bruitage, puis enregistre la partie.'}</p>}
        {phase !== 'voice' && <div className="sound-import-actions"><FilePicker label={`Importer ${phase === 'music' ? 'une musique' : 'un son'}`} onFile={file => void importFile(file)} />{phase === 'sfx' && Recorder && <details><summary>Enregistrer mon bruitage</summary><Recorder onBusyChange={busy => { if (busy) player.stop(); setLoading(busy); }} onReady={async (blob, recordedDuration) => addAsset(await onRegisterAsset(blob, 'Mon bruitage enregistré', blob.type, recordedDuration, { source: 'recording' }))} /></details>}</div>}
        {itemEditor && phase !== 'voice' && <p className="jingle-production-note">Une prise est en cours de modification. Reviens dans « Enregistrements vocaux » pour la garder ou l’annuler.</p>}
        {(error || player.error) && <p className="error-box" role="alert">{error || player.error}</p>}
        {invalid.length > 0 && <p className="error-box" role="alert">{invalid.length} son{invalid.length > 1 ? 's' : ''} à replacer : clique sur la piste pour corriger son début ou sa fin.</p>}
      </div>
      <div className="modal-footer"><button className="ghost-button" disabled={loading} onClick={onClose}>Annuler</button><span className="footer-spacer" />{phase === 'music' && !selectedVoice && <button className="ghost-button" disabled={loading} onClick={() => movePhase('sfx')}>Ambiances et bruitages →</button>}<button className="primary-button" disabled={loading || Boolean(itemEditor) || invalid.length > 0} onClick={() => { player.stop(); onSave(scoped); }}>✓ Enregistrer la partie</button></div>
    </Modal>
    {libraryOpen && phase !== 'voice' && <Library kind={phase} initialSoundGroup={libraryGroup} onClose={() => setLibraryOpen(false)} onChoose={chooseLibrary} />}
  </>;
}
