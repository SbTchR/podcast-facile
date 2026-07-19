from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP_PATH = ROOT / 'src' / 'App.tsx'
TYPES_PATH = ROOT / 'src' / 'types.ts'
ENGINE_PATH = ROOT / 'src' / 'audio' / 'engine.ts'
STYLES_PATH = ROOT / 'src' / 'styles.css'


def replace_required(source: str, before: str, after: str, label: str) -> str:
    if before not in source:
        raise RuntimeError(f'Correctif introuvable : {label}')
    return source.replace(before, after, 1)


def replace_between(source: str, start_marker: str, end_marker: str, replacement: str, label: str) -> str:
    start = source.find(start_marker)
    end = source.find(end_marker, start + len(start_marker))
    if start < 0 or end < 0:
        raise RuntimeError(f'Bloc introuvable : {label}')
    return source[:start] + replacement + source[end:]


app = APP_PATH.read_text()

app = replace_required(
    app,
    "import { templates } from './data/templates';\n",
    '',
    'suppression des modèles de départ',
)

app = replace_required(
    app,
    "  VoiceEffect,\n  VolumeLevel,",
    "  VoiceEffect,\n  VoiceSoundCue,\n  VolumeLevel,",
    'import VoiceSoundCue',
)

app = replace_required(
    app,
    "    jingle: block.jingle ? { ...block.jingle } : undefined,\n  };",
    "    jingle: block.jingle ? { ...block.jingle } : undefined,\n    voiceCues: block.voiceCues?.map((cue) => ({ ...cue })),\n  };",
    'copie des bruitages synchronisés',
)

app = replace_required(
    app,
    "function makeSection(title: string): PodcastSection {\n  return { id: crypto.randomUUID(), title, collapsed: false };\n}",
    "function makeSection(title: string, kind: PodcastSection['kind'] = 'standard'): PodcastSection {\n  return { id: crypto.randomUUID(), title, collapsed: false, kind };\n}",
    'types de sections',
)

app = replace_required(
    app,
    "    voiceEffect: 'none',\n    transitionPreset:",
    "    voiceEffect: 'none',\n    voiceCues: type === 'voice' ? [] : undefined,\n    transitionPreset:",
    'initialisation des repères sonores',
)

app = replace_between(
    app,
    'function createProject(',
    '\nfunction App()',
    '''function createProject(title: string, author: string): PodcastProject {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: title.trim() || 'Mon podcast',
    author: author.trim(),
    targetDuration: undefined,
    templateId: 'free',
    sections: [makeSection('Mon podcast')],
    blocks: [],
    assets: [],
    createdAt: now,
    updatedAt: now,
  };
}
''',
    'création simplifiée du projet',
)

app = replace_required(
    app,
    "  const [setupTemplateId, setSetupTemplateId] = useState('free');\n  const [setupSections, setSetupSections] = useState<string[]>(templates[0].sections);\n  const [setupTitle, setSetupTitle] = useState('');\n  const [setupAuthor, setSetupAuthor] = useState('');\n  const [setupTarget, setSetupTarget] = useState('');",
    "  const [setupTitle, setSetupTitle] = useState('');\n  const [setupAuthor, setSetupAuthor] = useState('');",
    'état simplifié de création',
)

app = replace_between(
    app,
    '  const startSetup = () => {',
    '\n  const goHome = async',
    '''  const startSetup = () => {
    setSetupTitle('');
    setSetupAuthor('');
    setScreen('setup');
  };

  const finishSetup = () => {
    if (!setupTitle.trim()) {
      setToast('Indique un titre pour commencer.');
      return;
    }
    const next = createProject(setupTitle, setupAuthor);
    setProject(next);
    undoRef.current = [];
    redoRef.current = [];
    setDirty(true);
    setSaveState('dirty');
    setScreen('editor');
  };
''',
    'parcours de création simplifié',
)

app = replace_required(
    app,
    '  const exportProjectFile = async () => {',
    '''  const addJingleSection = () => {
    const number = (project?.sections.filter((section) => section.kind === 'jingle').length ?? 0) + 1;
    const section = makeSection(number === 1 ? 'Jingle' : `Jingle ${number}`, 'jingle');
    const block = makeBlock('jingle', section.id);
    applyChange((draft) => {
      draft.sections.push(section);
      draft.blocks.push(block);
    });
    setEditingBlock(block);
    setEditingIsNew(true);
  };

  const closeBlockEditor = () => {
    if (editingIsNew && editingBlock?.type === 'jingle' && project?.sections.find((section) => section.id === editingBlock.sectionId)?.kind === 'jingle') {
      applyChange((draft) => {
        draft.blocks = draft.blocks.filter((item) => item.id !== editingBlock.id);
        draft.sections = draft.sections.filter((item) => item.id !== editingBlock.sectionId);
      });
    }
    setEditingBlock(null);
    setEditingIsNew(false);
  };

  const exportProjectFile = async () => {''',
    'ajout des sections jingle',
)

app = replace_between(
    app,
    "  if (screen === 'setup') {",
    '\n  if (!project) return null;',
    '''  if (screen === 'setup') {
    return (
      <SetupScreen
        title={setupTitle}
        author={setupAuthor}
        onTitle={setSetupTitle}
        onAuthor={setSetupAuthor}
        onBack={() => setScreen('home')}
        onFinish={finishSetup}
      />
    );
  }
''',
    'écran de création simplifié',
)

app = replace_required(
    app,
    '          <button className="primary-button add-main" onClick={() => setAddSectionId(project.sections[0]?.id ?? null)}>＋ Ajouter un élément</button>\n',
    '',
    'suppression du bouton Ajouter un élément redondant',
)

app = replace_required(
    app,
    '''              onDeleteSection={() => {
                if (blocks.length > 0) { setToast('Une section contenant des éléments ne peut pas être supprimée.'); return; }
                if (!window.confirm(`Supprimer la section « ${section.title} » ?`)) return;
                applyChange((draft) => { draft.sections = draft.sections.filter((item) => item.id !== section.id); });
              }}''',
    '''              onDeleteSection={() => {
                if (section.kind === 'jingle') {
                  if (!window.confirm(`Supprimer le jingle « ${section.title} » ?`)) return;
                  applyChange((draft) => {
                    draft.blocks = draft.blocks.filter((item) => item.sectionId !== section.id);
                    draft.sections = draft.sections.filter((item) => item.id !== section.id);
                  });
                  return;
                }
                if (blocks.length > 0) { setToast('Une section contenant des éléments ne peut pas être supprimée.'); return; }
                if (!window.confirm(`Supprimer la section « ${section.title} » ?`)) return;
                applyChange((draft) => { draft.sections = draft.sections.filter((item) => item.id !== section.id); });
              }}''',
    'suppression complète des sections jingle',
)

app = replace_required(
    app,
    '''              onDropBlock={(draggedId, beforeId) => applyChange((draft) => {
                const fromIndex = draft.blocks.findIndex((item) => item.id === draggedId);''',
    '''              onDropBlock={(draggedId, beforeId) => applyChange((draft) => {
                if (section.kind === 'jingle') return;
                const fromIndex = draft.blocks.findIndex((item) => item.id === draggedId);''',
    'protection des sections jingle',
)

app = replace_required(
    app,
    '''        <button className="add-section-button" onClick={() => applyChange((draft) => { draft.sections.push(makeSection('Nouvelle section')); })}>＋ Ajouter une section</button>''',
    '''        <div className="section-add-actions">
          <button className="add-section-button" onClick={() => applyChange((draft) => { draft.sections.push(makeSection('Nouvelle section')); })}>＋ Ajouter une section</button>
          <button className="add-jingle-button" onClick={addJingleSection}>📻 Ajouter un jingle</button>
        </div>''',
    'bouton Ajouter un jingle',
)

app = replace_required(
    app,
    '''          onClose={() => { setEditingBlock(null); setEditingIsNew(false); }}''',
    '          onClose={closeBlockEditor}',
    'annulation propre des nouveaux jingles',
)

app = replace_between(
    app,
    'function SetupScreen({',
    '\nfunction EditorTopbar',
    '''function SetupScreen({ title, author, onTitle, onAuthor, onBack, onFinish }: {
  title: string;
  author: string;
  onTitle: (value: string) => void;
  onAuthor: (value: string) => void;
  onBack: () => void;
  onFinish: () => void;
}) {
  return (
    <div className="setup-screen">
      <header className="simple-header"><button className="ghost-button" onClick={onBack}>← Retour</button><div className="brand"><span className="brand-mark">PF</span><span>{APP_NAME}</span></div><span /></header>
      <main className="setup-content setup-content-simple">
        <h1>Nouveau podcast</h1>
        <p className="lead">Donne simplement un titre à ton projet. Tu ajouteras ensuite les sections et les sons au fur et à mesure.</p>
        <div className="setup-form-grid setup-form-simple">
          <label className="field"><span>Titre du podcast <b>*</b></span><input autoFocus value={title} onChange={(event) => onTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && title.trim()) onFinish(); }} placeholder="Ex. Magellan : héros ou envahisseur ?" /></label>
          <label className="field"><span>Nom de l’élève ou du groupe <small>(facultatif)</small></span><input value={author} onChange={(event) => onAuthor(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && title.trim()) onFinish(); }} placeholder="Ex. Groupe 3" /></label>
        </div>
        <div className="setup-footer"><button className="secondary-button large" onClick={onBack}>Annuler</button><button className="primary-button large" disabled={!title.trim()} onClick={onFinish}>Créer le podcast →</button></div>
      </main>
    </div>
  );
}
''',
    'nouvel écran de création',
)

app = replace_required(
    app,
    '''    <section className="podcast-section" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const id = event.dataTransfer.getData('text/plain') || draggedId; if (id) onDropBlock(id); setDraggedId(null); }}>''',
    '''    <section className={`podcast-section ${section.kind === 'jingle' ? 'jingle-section' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (section.kind === 'jingle') return; const id = event.dataTransfer.getData('text/plain') || draggedId; if (id) onDropBlock(id); setDraggedId(null); }}>''',
    'apparence des sections jingle',
)

app = replace_required(
    app,
    '''        <input className="section-title-input" value={section.title} onChange={(event) => onRename(event.target.value)} aria-label="Nom de la section" />
        <span className="section-duration">''',
    '''        <input className="section-title-input" value={section.title} onChange={(event) => onRename(event.target.value)} aria-label="Nom de la section" />
        {section.kind === 'jingle' && <span className="section-kind-badge">Jingle</span>}
        <span className="section-duration">''',
    'badge de section jingle',
)

app = replace_required(
    app,
    '''          {blocks.length === 0 && <div className="empty-section">Cette section est vide. Ajoute une voix, une musique ou un autre élément.</div>}''',
    '''          {blocks.length === 0 && <div className="empty-section">{section.kind === 'jingle' ? 'Configure ce jingle pour l’utiliser dans ton podcast.' : 'Cette section est vide. Ajoute une voix, une musique ou un autre élément.'}</div>}''',
    'message des sections vides',
)

app = replace_required(
    app,
    '''          <button className="add-inside-button" onClick={onAdd}>＋ Ajouter un élément dans cette section</button>''',
    '''          {section.kind !== 'jingle' && <button className="add-inside-button" onClick={onAdd}>＋ Ajouter un élément dans cette section</button>}''',
    'masquage de l’ajout dans un jingle',
)

app = replace_required(
    app,
    '''<small>{formatTime(getBlockDuration(block))}{block.background ? ' · musique de fond' : ''}{block.voiceEffect !== 'none' ? ` · ${voiceEffectLabels[block.voiceEffect]}` : ''}</small>''',
    '''<small>{formatTime(getBlockDuration(block))}{block.background ? ' · musique de fond' : ''}{block.voiceCues?.length ? ` · ${block.voiceCues.length} bruitage${block.voiceCues.length > 1 ? 's' : ''} synchronisé${block.voiceCues.length > 1 ? 's' : ''}` : ''}{block.voiceEffect !== 'none' ? ` · ${voiceEffectLabels[block.voiceEffect]}` : ''}</small>''',
    'résumé des bruitages synchronisés',
)

app = replace_required(
    app,
    '''        <button onClick={onDuplicate}>⧉ <span>Dupliquer</span></button>''',
    '''        {block.type !== 'jingle' && <button onClick={onDuplicate}>⧉ <span>Dupliquer</span></button>}''',
    'jingle unique par section',
)

app = replace_required(
    app,
    "    { type: 'jingle', title: 'Créer un jingle', description: 'Introduction guidée et automatique' },\n",
    '',
    'retrait du jingle dans les éléments ordinaires',
)

app = replace_required(
    app,
    "  type LibraryTarget = 'block' | 'background' | 'musicAssetId' | 'openingAssetId' | 'closingAssetId';",
    "  type LibraryTarget = 'block' | 'background' | 'voiceCue' | 'musicAssetId' | 'openingAssetId' | 'closingAssetId';",
    'cible bibliothèque pour les repères sonores',
)

app = replace_required(
    app,
    "  const [libraryTarget, setLibraryTarget] = useState<LibraryTarget | null>(null);",
    "  const [libraryTarget, setLibraryTarget] = useState<LibraryTarget | null>(null);\n  const [cueInsertTime, setCueInsertTime] = useState(0);",
    'position du nouveau bruitage',
)

app = replace_required(
    app,
    '  const chooseLibraryPreset = async (preset: LibraryPreset) => {',
    '''  const addVoiceCueAsset = (asset: AudioAsset, at: number) => {
    setBlock((current) => {
      const voiceDuration = Math.max(0.2, (current.trimEnd - current.trimStart) || current.duration);
      const safeAt = Math.min(Math.max(0, at), Math.max(0, voiceDuration - 0.2));
      const remaining = Math.max(0.2, voiceDuration - safeAt);
      const duration = Math.max(0.2, Math.min(2, asset.duration || 2, remaining));
      const cue: VoiceSoundCue = { id: crypto.randomUUID(), assetId: asset.id, at: safeAt, duration, level: 'low' };
      return { ...current, voiceCues: [...(current.voiceCues ?? []), cue].sort((left, right) => left.at - right.at) };
    });
  };

  const importVoiceCue = async (file: File, at: number) => {
    setError('');
    try {
      const asset = await onRegisterAsset(file, file.name, file.type, undefined, { source: 'import' });
      addVoiceCueAsset(asset, at);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Ce bruitage ne peut pas être utilisé.');
    }
  };

  const chooseLibraryPreset = async (preset: LibraryPreset) => {''',
    'ajout des bruitages à un repère',
)

app = replace_required(
    app,
    '''      setBlock((current) => {
        if (libraryTarget === 'block') {''',
    '''      if (libraryTarget === 'voiceCue') {
        addVoiceCueAsset(asset, cueInsertTime);
        setLibraryTarget(null);
        return;
      }
      setBlock((current) => {
        if (libraryTarget === 'block') {''',
    'sélection du bruitage synchronisé',
)

app = replace_required(
    app,
    '''  const libraryKind: LibraryKind = libraryTarget === 'block'
    ? (block.type === 'sfx' ? 'sfx' : 'music')''',
    '''  const libraryKind: LibraryKind = libraryTarget === 'voiceCue'
    ? 'sfx'
    : libraryTarget === 'block'
      ? (block.type === 'sfx' ? 'sfx' : 'music')''',
    'bibliothèque de bruitages synchronisés',
)

app = replace_required(
    app,
    '''          {selectedAsset && (
            <TrimControl asset={selectedAsset} start={block.trimStart} end={block.trimEnd || selectedAsset.duration} onChange={(start, end) => setBlock((current) => ({ ...current, trimStart: start, trimEnd: end, duration: end - start }))} />
          )}''',
    '''          {selectedAsset && (
            <TrimControl asset={selectedAsset} start={block.trimStart} end={block.trimEnd || selectedAsset.duration} onChange={(start, end) => setBlock((current) => ({ ...current, trimStart: start, trimEnd: end, duration: end - start, voiceCues: current.voiceCues?.filter((cue) => cue.at < end - start) }))} />
          )}

          {block.type === 'voice' && selectedAsset && (
            <VoiceCueEditor
              asset={selectedAsset}
              trimStart={block.trimStart}
              trimEnd={block.trimEnd || selectedAsset.duration}
              cues={block.voiceCues ?? []}
              assets={assets}
              onCues={(voiceCues) => update('voiceCues', voiceCues)}
              onAddLibrary={(at) => { setCueInsertTime(at); setLibraryTarget('voiceCue'); }}
              onImport={(file, at) => importVoiceCue(file, at)}
            />
          )}''',
    'éditeur de bruitages dans une voix',
)

voice_cue_component = r'''function VoiceCueEditor({ asset, trimStart, trimEnd, cues, assets, onCues, onAddLibrary, onImport }: {
  asset: AudioAsset;
  trimStart: number;
  trimEnd: number;
  cues: VoiceSoundCue[];
  assets: AudioAsset[];
  onCues: (cues: VoiceSoundCue[]) => void;
  onAddLibrary: (at: number) => void;
  onImport: (file: File, at: number) => Promise<void> | void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const duration = Math.max(0.2, trimEnd - trimStart || asset.duration);

  useEffect(() => {
    const url = URL.createObjectURL(asset.blob);
    setAudioUrl(url);
    setPosition(0);
    setPlaying(false);
    return () => URL.revokeObjectURL(url);
  }, [asset.blob]);

  const seek = (value: number) => {
    const safe = Math.min(duration, Math.max(0, value));
    setPosition(safe);
    const audio = audioRef.current;
    if (audio) audio.currentTime = trimStart + safe;
  };

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      setPlaying(false);
      return;
    }
    setBrowserAudioSession('playback');
    if (audio.currentTime < trimStart || audio.currentTime >= trimEnd) audio.currentTime = trimStart + position;
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  const updateCue = (id: string, values: Partial<VoiceSoundCue>) => {
    onCues(cues.map((cue) => cue.id === id ? { ...cue, ...values } : cue).sort((left, right) => left.at - right.at));
  };

  return (
    <div className="voice-cue-editor">
      <div className="setting-title-row">
        <div><h3>Bruitages derrière la voix</h3><p>Écoute ta voix, mets en pause à l’endroit voulu, puis ajoute un bruitage exactement ici.</p></div>
        <span className="cue-count">{cues.length || 'Aucun'} repère{cues.length > 1 ? 's' : ''}</span>
      </div>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        playsInline
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          const relative = Math.max(0, audio.currentTime - trimStart);
          if (relative >= duration) {
            audio.pause();
            audio.currentTime = trimStart;
            setPosition(0);
            setPlaying(false);
          } else {
            setPosition(relative);
          }
        }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
      <div className="cue-player">
        <button className="cue-play-button" onClick={() => void toggle()}>{playing ? 'Ⅱ' : '▶'}</button>
        <span className="cue-time">{position.toFixed(1)} s</span>
        <div className="cue-range-shell">
          <input type="range" min="0" max={duration} step="0.05" value={Math.min(position, duration)} onChange={(event) => { audioRef.current?.pause(); seek(Number(event.target.value)); }} />
          {cues.map((cue) => <button key={cue.id} className="cue-marker" style={{ left: `${Math.min(100, Math.max(0, cue.at / duration * 100))}%` }} onClick={() => seek(cue.at)} title={`Bruitage à ${cue.at.toFixed(1)} s`} />)}
        </div>
        <span className="cue-time">{duration.toFixed(1)} s</span>
      </div>
      <div className="cue-add-actions">
        <button className="primary-button compact" onClick={() => { audioRef.current?.pause(); onAddLibrary(position); }}>🔊 Ajouter un bruitage ici</button>
        <FilePicker label="Importer un bruitage ici" onFile={(file) => { audioRef.current?.pause(); void onImport(file, position); }} />
      </div>
      {cues.length > 0 && (
        <div className="cue-list">
          {cues.map((cue, index) => {
            const cueAsset = assets.find((candidate) => candidate.id === cue.assetId);
            const maxDuration = Math.max(0.2, Math.min(8, cueAsset?.duration ?? 8, duration - cue.at));
            return (
              <div className="cue-row" key={cue.id}>
                <button className="cue-position" onClick={() => seek(cue.at)}>{cue.at.toFixed(1)} s</button>
                <div className="cue-name"><strong>{cueAsset?.name ?? `Bruitage ${index + 1}`}</strong><small>Commence à cet endroit dans la voix</small></div>
                <label><span>Niveau</span><select value={cue.level} onChange={(event) => updateCue(cue.id, { level: event.target.value as VoiceSoundCue['level'] })}><option value="low">Discret</option><option value="normal">Normal</option><option value="high">Fort</option></select></label>
                <label className="cue-duration"><span>Durée · {Math.min(cue.duration, maxDuration).toFixed(1)} s</span><input type="range" min="0.2" max={maxDuration} step="0.1" value={Math.min(cue.duration, maxDuration)} onChange={(event) => updateCue(cue.id, { duration: Number(event.target.value) })} /></label>
                <button className="secondary-button compact" onClick={() => updateCue(cue.id, { at: Math.min(position, Math.max(0, duration - 0.2)) })}>Placer ici</button>
                <button className="mini-button danger" onClick={() => onCues(cues.filter((candidate) => candidate.id !== cue.id))} title="Supprimer ce bruitage">×</button>
              </div>
            );
          })}
        </div>
      )}
      <p className="cue-help">Le bouton « Écouter l’aperçu » en bas de la fenêtre permet de vérifier la voix, la musique de fond et tous les bruitages ensemble.</p>
    </div>
  );
}

'''

app = replace_required(
    app,
    'function Recorder({ onReady }: { onReady: (blob: Blob, duration: number) => Promise<void> | void }) {',
    voice_cue_component + 'function Recorder({ onReady }: { onReady: (blob: Blob, duration: number) => Promise<void> | void }) {',
    'composant de placement des bruitages',
)

APP_PATH.write_text(app)

# Types partagés

types = TYPES_PATH.read_text()
types = replace_required(
    types,
    "export type TransitionPreset = 'fade' | 'whoosh' | 'bell' | 'radio' | 'page' | 'percussion' | 'rise' | 'mystery';",
    "export type TransitionPreset = 'fade' | 'whoosh' | 'bell' | 'radio' | 'page' | 'percussion' | 'rise' | 'mystery';\nexport type VoiceCueLevel = 'low' | 'normal' | 'high';\n\nexport interface VoiceSoundCue {\n  id: string;\n  assetId: string;\n  at: number;\n  duration: number;\n  level: VoiceCueLevel;\n}",
    'type VoiceSoundCue',
)
types = replace_required(
    types,
    '  background?: BackgroundAudio;\n  transitionPreset?: TransitionPreset;',
    '  background?: BackgroundAudio;\n  voiceCues?: VoiceSoundCue[];\n  transitionPreset?: TransitionPreset;',
    'repères dans PodcastBlock',
)
types = replace_required(
    types,
    'export interface PodcastSection {\n  id: string;\n  title: string;\n  collapsed: boolean;\n}',
    "export interface PodcastSection {\n  id: string;\n  title: string;\n  collapsed: boolean;\n  kind?: 'standard' | 'jingle';\n}",
    'type de section',
)
TYPES_PATH.write_text(types)

# Moteur audio : les bruitages sont superposés à la voix, sans créer de piste visible.

engine = ENGINE_PATH.read_text()
engine = replace_required(
    engine,
    "function backgroundValue(level: 'very-low' | 'low' | 'present'): number {\n  return level === 'very-low' ? 0.08 : level === 'present' ? 0.23 : 0.14;\n}",
    "function backgroundValue(level: 'very-low' | 'low' | 'present'): number {\n  return level === 'very-low' ? 0.08 : level === 'present' ? 0.23 : 0.14;\n}\n\nfunction voiceCueValue(level: 'low' | 'normal' | 'high'): number {\n  return level === 'low' ? 0.24 : level === 'high' ? 0.78 : 0.48;\n}",
    'niveaux des bruitages synchronisés',
)

voice_start = engine.find('async function scheduleVoiceBlock(')
voice_end = engine.find('\n}\n\nasync function scheduleJingle', voice_start)
if voice_start < 0 or voice_end < 0:
    raise RuntimeError('Bloc scheduleVoiceBlock introuvable')
voice_block = engine[voice_start:voice_end]
cue_schedule = r'''

  for (const cue of block.voiceCues ?? []) {
    const cueAsset = assetById(project, cue.assetId);
    if (!cueAsset) continue;
    const cueAt = Math.min(Math.max(0, cue.at), coreDuration);
    const cueDuration = Math.min(Math.max(0.2, cue.duration), Math.max(0, coreDuration - cueAt));
    if (cueDuration <= 0) continue;
    const cueTimelineStart = pre + cueAt;
    if (localOffset >= cueTimelineStart + cueDuration) continue;
    const consumedCue = Math.max(0, localOffset - cueTimelineStart);
    const cueDelay = Math.max(0, cueTimelineStart - localOffset);
    await scheduleAsset(
      context,
      destination,
      cueAsset,
      cache,
      start + cueDelay,
      consumedCue,
      cueDuration - consumedCue,
      voiceCueValue(cue.level),
      'none',
      'short',
    );
  }
'''
voice_block = voice_block + cue_schedule
engine = engine[:voice_start] + voice_block + engine[voice_end:]

engine = replace_required(
    engine,
    '    if (block.background?.assetId) ids.add(block.background.assetId);',
    "    if (block.background?.assetId) ids.add(block.background.assetId);\n    for (const cue of block.voiceCues ?? []) ids.add(cue.assetId);",
    'préchargement des bruitages synchronisés',
)
ENGINE_PATH.write_text(engine)

# Styles supplémentaires

styles = STYLES_PATH.read_text()
styles += r'''

/* Interface élèves v2 : création simplifiée, sections jingle et bruitages synchronisés */
.setup-content-simple { max-width: 760px; padding-top: 70px; }
.setup-form-simple { grid-template-columns: 1fr; margin-top: 32px; }
.section-add-actions { display: flex; justify-content: center; flex-wrap: wrap; gap: 12px; margin: 24px 0 105px; }
.section-add-actions .add-section-button { margin: 0; }
.add-jingle-button { min-height: 48px; padding: 0 22px; border: 1px solid rgba(209,72,105,.35); border-radius: 13px; background: #fff0f4; color: #9f2948; font-weight: 800; }
.add-jingle-button:hover { background: #ffe4ec; border-color: rgba(209,72,105,.6); }
.jingle-section { border-color: rgba(209,72,105,.38); box-shadow: 0 12px 30px rgba(209,72,105,.08); }
.jingle-section .podcast-section-header { background: linear-gradient(90deg, #fff4f7, #fff); }
.section-kind-badge { padding: 5px 9px; border-radius: 999px; color: #9f2948; background: #ffe3eb; font-size: .75rem; font-weight: 850; text-transform: uppercase; letter-spacing: .04em; }
.voice-cue-editor { margin-top: 18px; padding: 19px; border: 1px solid #cfd9ef; border-radius: 16px; background: linear-gradient(180deg, #f7faff, #fff); }
.voice-cue-editor h3 { margin-bottom: 5px; }
.voice-cue-editor .setting-title-row { align-items: flex-start; }
.cue-count { flex: 0 0 auto; padding: 6px 10px; border-radius: 999px; background: var(--primary-soft); color: var(--primary-dark); font-size: .78rem; font-weight: 800; }
.cue-player { display: grid; grid-template-columns: 44px 52px minmax(140px,1fr) 52px; align-items: center; gap: 9px; margin: 14px 0; }
.cue-play-button { width: 44px; height: 44px; border: 0; border-radius: 50%; color: white; background: var(--primary); font-weight: 900; box-shadow: 0 6px 16px rgba(36,87,214,.25); }
.cue-time { color: #536078; font-size: .82rem; font-variant-numeric: tabular-nums; text-align: center; }
.cue-range-shell { position: relative; min-width: 0; }
.cue-range-shell > input { width: 100%; accent-color: var(--primary); }
.cue-marker { position: absolute; top: 50%; width: 13px; height: 13px; padding: 0; border: 2px solid white; border-radius: 50%; background: var(--sfx); box-shadow: 0 1px 5px rgba(0,0,0,.28); transform: translate(-50%,-50%); }
.cue-add-actions { display: flex; flex-wrap: wrap; gap: 9px; margin: 12px 0 15px; }
.cue-list { display: grid; gap: 9px; margin-top: 12px; }
.cue-row { display: grid; grid-template-columns: 58px minmax(150px,1fr) 105px minmax(130px,1fr) auto 36px; align-items: end; gap: 9px; padding: 12px; border: 1px solid #e0e6f1; border-radius: 12px; background: white; }
.cue-position { align-self: center; min-height: 36px; border: 0; border-radius: 9px; background: #fff0e4; color: #a34d08; font-weight: 850; }
.cue-name { align-self: center; min-width: 0; }
.cue-name strong, .cue-name small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cue-name small { margin-top: 3px; color: var(--muted); }
.cue-row label { display: grid; gap: 5px; color: #4c5870; font-size: .76rem; font-weight: 750; }
.cue-row select { min-height: 38px; border: 1px solid var(--border); border-radius: 9px; background: white; padding: 0 8px; }
.cue-duration input { width: 100%; accent-color: var(--sfx); }
.cue-help { margin: 12px 0 0; font-size: .83rem; }
@media (max-width: 900px) {
  .cue-row { grid-template-columns: 58px minmax(0,1fr) 105px 36px; align-items: center; }
  .cue-duration { grid-column: 2 / 4; }
  .cue-row .secondary-button { grid-column: 2 / 4; }
}
@media (max-width: 620px) {
  .cue-player { grid-template-columns: 44px 1fr 52px; }
  .cue-player .cue-time:first-of-type { display: none; }
  .cue-row { grid-template-columns: 52px 1fr 36px; }
  .cue-row label, .cue-duration, .cue-row .secondary-button { grid-column: 1 / 4; }
}
'''
STYLES_PATH.write_text(styles)

print('Interface élèves v2 et bruitages synchronisés appliqués.')
