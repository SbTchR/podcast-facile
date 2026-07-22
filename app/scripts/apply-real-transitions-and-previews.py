from __future__ import annotations

import html
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APP_PATH = ROOT / 'src' / 'App.tsx'
ENGINE_PATH = ROOT / 'src' / 'audio' / 'engine.ts'
LIBRARY_PATH = ROOT / 'src' / 'data' / 'audioLibrary.ts'
CREDITS_PATH = ROOT / 'public' / 'audio-credits.html'
STYLES_PATH = ROOT / 'src' / 'styles.css'
MARKER = '// Real transitions and coherent previews: 20260722-real-transitions-preview-1'


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: attendu 1 occurrence, trouvé {count}.')
    return source.replace(old, new, 1)


def replace_between(source: str, start_marker: str, end_marker: str, replacement: str, label: str) -> str:
    start = source.find(start_marker)
    end = source.find(end_marker, start + len(start_marker))
    if start < 0 or end < 0:
        raise RuntimeError(f'{label}: bloc introuvable.')
    return source[:start] + replacement + source[end:]


app = APP_PATH.read_text(encoding='utf-8')
if MARKER in app:
    raise RuntimeError('La passe des transitions réelles a déjà été appliquée.')

app = replace_once(app, "const APP_NAME = 'Podcast Facile';", f"{MARKER}\nconst APP_NAME = 'Podcast Facile';", 'marqueur de version')

transition_catalog = '''type TransitionRecording = {
  preset: TransitionPreset;
  libraryId: string;
  label: string;
  icon: string;
  description: string;
};

const TRANSITION_RECORDINGS: TransitionRecording[] = [
  { preset: 'impact', libraryId: 'sfx-dull-thud', label: 'Impact sourd', icon: '💥', description: 'Un coup sec pour ponctuer une idée.' },
  { preset: 'failure', libraryId: 'sfx-buzzer-real', label: 'Buzzer d’échec', icon: '🚫', description: 'Un signal immédiatement reconnaissable.' },
  { preset: 'question', libraryId: 'sfx-onomatopoeia-question', label: 'Interrogation', icon: '❓', description: 'Une courte réaction vocale interrogative.' },
  { preset: 'drop', libraryId: 'sfx-pen-drop', label: 'Objet qui tombe', icon: '🖊️', description: 'Un petit objet heurte le sol.' },
  { preset: 'bell', libraryId: 'sfx-bicycle-bell', label: 'Sonnette', icon: '🔔', description: 'Une sonnette de vélo claire et légère.' },
  { preset: 'fade', libraryId: 'sfx-door-knocker', label: 'Coups à la porte', icon: '🚪', description: 'Trois coups brefs sur un heurtoir.' },
  { preset: 'rise', libraryId: 'sfx-human-whistling', label: 'Sifflement', icon: '😗', description: 'Un sifflement humain très court.' },
  { preset: 'cinematic', libraryId: 'sfx-explosion', label: 'Explosion', icon: '💣', description: 'Une détonation unique et nette.' },
  { preset: 'portal', libraryId: 'sfx-steamboat-horn', label: 'Corne de bateau', icon: '🛳️', description: 'Un bref appel de bateau à vapeur.' },
  { preset: 'mystery', libraryId: 'sfx-music-box', label: 'Boîte à musique', icon: '🎠', description: 'Une ponctuation musicale intrigante.' },
  { preset: 'sparkle', libraryId: 'sfx-onomatopoeia-pop', label: 'Pop vocal', icon: '🫧', description: 'Un petit “pop” produit avec la bouche.' },
  { preset: 'radio', libraryId: 'sfx-airplane-chime', label: 'Signal sonore', icon: '✈️', description: 'Le carillon bref entendu dans un avion.' },
  { preset: 'page', libraryId: 'sfx-turn-page', label: 'Page tournée', icon: '📄', description: 'Une vraie page tournée, idéale pour changer de chapitre.' },
  { preset: 'whoosh', libraryId: 'sfx-car-horn', label: 'Klaxon bref', icon: '🚗', description: 'Un coup de klaxon court et reconnaissable.' },
];'''
app = replace_between(app, 'const transitionLabels: Record<TransitionPreset, string> = {', '\n\nconst voiceEffectLabels', transition_catalog, 'catalogue des transitions')

safe_filename = '''function safeFilename(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'podcast';
}'''

preview_support = safe_filename + r'''

const PREVIEW_STOP_EVENT = 'podcast-facile-stop-preview';

interface PreviewSession {
  totalDuration: number;
  getElapsed: () => number;
  stop: () => Promise<void> | void;
}

function requestExclusivePreview(ownerId: string): void {
  window.dispatchEvent(new CustomEvent<string>(PREVIEW_STOP_EVENT, { detail: ownerId }));
}

async function createLibraryPreviewSession(preset: LibraryPreset): Promise<PreviewSession> {
  const blob = await loadLibraryAudio(preset);
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.preload = 'auto';
  audio.setAttribute('playsinline', '');
  const previewStart = Math.max(0, preset.clipStart ?? 0);
  const requestedDuration = Math.max(0.05, preset.clipDuration ?? preset.duration);
  try {
    await new Promise<void>((resolve, reject) => {
      audio.onloadedmetadata = () => resolve();
      audio.onerror = () => reject(new Error('Le navigateur ne parvient pas à lire cet aperçu.'));
      audio.load();
    });
    const safeStart = Math.min(previewStart, Math.max(0, audio.duration - 0.05));
    const totalDuration = Math.min(requestedDuration, Math.max(0.05, audio.duration - safeStart));
    audio.currentTime = safeStart;
    await audio.play();
    return {
      totalDuration,
      getElapsed: () => Math.min(totalDuration, Math.max(0, audio.currentTime - safeStart)),
      stop: () => {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        URL.revokeObjectURL(url);
      },
    };
  } catch (error) {
    audio.pause();
    URL.revokeObjectURL(url);
    throw error;
  }
}

function TimedPreviewButton({ previewId, onStart, disabled = false, label = 'Écouter l’aperçu', compact = false }: {
  previewId: string;
  onStart: () => Promise<PreviewSession>;
  disabled?: boolean;
  label?: string;
  compact?: boolean;
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const sessionRef = useRef<PreviewSession | null>(null);
  const timerRef = useRef<number | null>(null);
  const requestRef = useRef(0);

  const stop = useCallback(() => {
    requestRef.current += 1;
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session) void Promise.resolve(session.stop()).catch(() => undefined);
    setStatus('idle');
    setElapsed(0);
  }, []);

  useEffect(() => {
    const listener = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== previewId) stop();
    };
    window.addEventListener(PREVIEW_STOP_EVENT, listener);
    return () => {
      window.removeEventListener(PREVIEW_STOP_EVENT, listener);
      stop();
    };
  }, [previewId, stop]);

  const toggle = async () => {
    if (status !== 'idle') {
      stop();
      return;
    }
    requestExclusivePreview(previewId);
    const request = ++requestRef.current;
    setError('');
    setElapsed(0);
    setDuration(0);
    setStatus('loading');
    try {
      const session = await onStart();
      if (request !== requestRef.current) {
        await Promise.resolve(session.stop());
        return;
      }
      sessionRef.current = session;
      setDuration(session.totalDuration);
      setStatus('playing');
      timerRef.current = window.setInterval(() => {
        const current = sessionRef.current;
        if (!current) return;
        const value = current.getElapsed();
        setElapsed(value);
        if (value >= current.totalDuration - 0.04) stop();
      }, 80);
    } catch (reason) {
      if (request !== requestRef.current) return;
      setStatus('idle');
      setError(reason instanceof Error ? reason.message : 'Impossible de lire cet aperçu.');
    }
  };

  const progress = duration > 0 ? Math.min(100, elapsed / duration * 100) : 0;
  return (
    <div className={`timed-preview ${compact ? 'compact' : ''}`}>
      <button className={`preview-control ${status}`} disabled={disabled} onClick={() => void toggle()} aria-busy={status === 'loading'}>
        <span className="preview-control-main">
          {status === 'loading' ? <i className="preview-spinner" aria-hidden="true" /> : <span aria-hidden="true">{status === 'playing' ? '■' : '▶'}</span>}
          <strong>{status === 'loading' ? 'Chargement…' : status === 'playing' ? 'Arrêter' : label}</strong>
          {status === 'playing' && <small>{formatTime(elapsed)} / {formatTime(duration)}</small>}
        </span>
        {status === 'playing' && <span className="preview-progress" aria-hidden="true"><i style={{ width: `${progress}%` }} /></span>}
      </button>
      {error && <small className="preview-error" role="alert">{error}</small>}
    </div>
  );
}'''
app = replace_once(app, safe_filename, preview_support, 'lecteur d’aperçu partagé')

app = replace_once(app, "    transitionPreset: type === 'transition' ? 'fade' : undefined,", "    transitionPreset: undefined,", 'transition sans synthèse par défaut')

app = replace_once(
    app,
    "  const playbackRef = useRef<PlaybackController | null>(null);\n  const playbackTimerRef = useRef<number | null>(null);\n  const [playbackStatus, setPlaybackStatus] = useState<'stopped' | 'playing' | 'paused'>('stopped');",
    "  const playbackRef = useRef<PlaybackController | null>(null);\n  const playbackTimerRef = useRef<number | null>(null);\n  const playbackRequestRef = useRef(0);\n  const [playbackStatus, setPlaybackStatus] = useState<'stopped' | 'loading' | 'playing' | 'paused'>('stopped');",
    'état de chargement du lecteur global',
)

app = replace_once(
    app,
    "  useEffect(() => {\n    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });\n  }, [screen]);",
    "  useEffect(() => {\n    requestExclusivePreview(`screen-${screen}`);\n    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });\n  }, [screen]);",
    'arrêt au changement d’écran',
)

app = replace_once(app, "  const stopPlayback = useCallback(() => {\n    if (playbackTimerRef.current !== null)", "  const stopPlayback = useCallback(() => {\n    playbackRequestRef.current += 1;\n    if (playbackTimerRef.current !== null)", 'annulation des chargements globaux')

app = replace_once(
    app,
    "  useEffect(() => () => { void stopPlayback(); }, [stopPlayback]);",
    "  useEffect(() => () => { void stopPlayback(); }, [stopPlayback]);\n\n  useEffect(() => {\n    const listener = (event: Event) => {\n      if ((event as CustomEvent<string>).detail !== 'global-player') stopPlayback();\n    };\n    window.addEventListener(PREVIEW_STOP_EVENT, listener);\n    return () => window.removeEventListener(PREVIEW_STOP_EVENT, listener);\n  }, [stopPlayback]);",
    'coordination avec le lecteur global',
)

new_begin_playback = '''  const beginPlayback = useCallback(async (offset = 0) => {
    if (!project || getProjectDuration(project) <= 0) return;
    requestExclusivePreview('global-player');
    stopPlayback();
    const request = ++playbackRequestRef.current;
    setPlaybackStatus('loading');
    try {
      const controller = await playProject(project, offset);
      if (request !== playbackRequestRef.current) {
        await controller.stop();
        return;
      }
      playbackRef.current = controller;
      setElapsed(offset);
      setPlaybackStatus('playing');
      playbackTimerRef.current = window.setInterval(() => {
        const current = playbackRef.current;
        if (!current) return;
        const value = current.getElapsed();
        setElapsed(value);
        const active = getTimeline(project).find((entry) => value >= entry.start && value < entry.end);
        setActiveBlockId(active?.block.id ?? null);
        if (value >= current.totalDuration - 0.04) void stopPlayback();
      }, 100);
    } catch (error) {
      if (request !== playbackRequestRef.current) return;
      setToast(error instanceof Error ? error.message : 'La lecture audio a échoué.');
      stopPlayback();
    }
  }, [project, stopPlayback]);'''
app = replace_between(app, '  const beginPlayback = useCallback(async (offset = 0) => {', '\n\n  const togglePause', new_begin_playback, 'lecture globale annulable')
app = replace_once(app, "    if (playbackStatus === 'playing') {", "    if (playbackStatus === 'loading') return;\n    if (playbackStatus === 'playing') {", 'pause pendant le chargement')

app = replace_once(app, "        onListen={() => void beginPlayback(0)}", "        onListen={() => playProject(project, 0)}", 'aperçu de l’écran export')
app = replace_once(app, "              activeBlockId={activeBlockId}", "              activeBlockId={activeBlockId}\n              playbackStatus={playbackStatus}", 'état du lecteur dans les sections')

old_card_play = '''              onPlay={(block) => {
                const previewProject = { ...project, blocks: [block] };
                stopPlayback();
                void playProject(previewProject, 0).then((controller) => {
                  playbackRef.current = controller;
                  setElapsed(0);
                  setActiveBlockId(block.id);
                  setPlaybackStatus('playing');
                  window.setTimeout(() => stopPlayback(), (controller.totalDuration + 0.25) * 1000);
                }).catch((error) => {
                  setToast(error instanceof Error ? error.message : 'Impossible de lire cet élément.');
                  stopPlayback();
                });
              }}'''
new_card_play = '''              onPlay={(block) => {
                if (activeBlockId === block.id && (playbackStatus === 'playing' || playbackStatus === 'paused')) {
                  void togglePause();
                  return;
                }
                requestExclusivePreview('global-player');
                stopPlayback();
                const request = ++playbackRequestRef.current;
                const previewProject = { ...project, blocks: [block] };
                setElapsed(0);
                setActiveBlockId(block.id);
                setPlaybackStatus('loading');
                void playProject(previewProject, 0).then((controller) => {
                  if (request !== playbackRequestRef.current) {
                    void controller.stop();
                    return;
                  }
                  playbackRef.current = controller;
                  setPlaybackStatus('playing');
                  playbackTimerRef.current = window.setInterval(() => {
                    const current = playbackRef.current;
                    if (!current) return;
                    const value = current.getElapsed();
                    setElapsed(value);
                    if (value >= current.totalDuration - 0.04) void stopPlayback();
                  }, 80);
                }).catch((error) => {
                  if (request !== playbackRequestRef.current) return;
                  setToast(error instanceof Error ? error.message : 'Impossible de lire cet élément.');
                  stopPlayback();
                });
              }}'''
app = replace_once(app, old_card_play, new_card_play, 'aperçu des cartes avec chargement')

old_editor_preview = '''          onPreview={(block) => {
            const previewProject = { ...project, blocks: [block] };
            stopPlayback();
            void playProject(previewProject, 0).then((controller) => {
              playbackRef.current = controller;
              setElapsed(0);
              setActiveBlockId(block.id);
              setPlaybackStatus('playing');
              window.setTimeout(() => stopPlayback(), (controller.totalDuration + 0.25) * 1000);
            }).catch((error) => {
              setToast(error instanceof Error ? error.message : 'Impossible de lire cet élément.');
              stopPlayback();
            });
          }}'''
app = replace_once(app, old_editor_preview, "          onPreview={(block) => playProject({ ...project, blocks: [block] }, 0)}", 'aperçu local de l’éditeur')

app = replace_once(
    app,
    "  section, sectionIndex, sectionCount, blocks, assets, duration, activeBlockId,\n  onRename,",
    "  section, sectionIndex, sectionCount, blocks, assets, duration, activeBlockId, playbackStatus,\n  onRename,",
    'propriété de statut des sections',
)
app = replace_once(
    app,
    "  section: PodcastSection; sectionIndex: number; sectionCount: number; blocks: PodcastBlock[]; assets: AudioAsset[]; duration: number; activeBlockId: string | null;",
    "  section: PodcastSection; sectionIndex: number; sectionCount: number; blocks: PodcastBlock[]; assets: AudioAsset[]; duration: number; activeBlockId: string | null; playbackStatus: 'stopped' | 'loading' | 'playing' | 'paused';",
    'type du statut des sections',
)
app = replace_once(app, "              active={block.id === activeBlockId}\n              canMoveUp", "              active={block.id === activeBlockId}\n              playbackStatus={playbackStatus}\n              canMoveUp", 'statut des cartes')
app = replace_once(
    app,
    "function BlockCard({ block, assets, active, canMoveUp, canMoveDown, onPlay,",
    "function BlockCard({ block, assets, active, playbackStatus, canMoveUp, canMoveDown, onPlay,",
    'propriété du lecteur de carte',
)
app = replace_once(
    app,
    "  block: PodcastBlock; assets: AudioAsset[]; active: boolean; canMoveUp: boolean; canMoveDown: boolean;",
    "  block: PodcastBlock; assets: AudioAsset[]; active: boolean; playbackStatus: 'stopped' | 'loading' | 'playing' | 'paused'; canMoveUp: boolean; canMoveDown: boolean;",
    'type du lecteur de carte',
)
app = replace_once(
    app,
    "      <button className=\"round-play\" onClick={onPlay} aria-label={`Lire ${block.title}`}>▶</button>",
    "      <button className=\"round-play\" onClick={onPlay} aria-label={`Lire ${block.title}`} aria-busy={active && playbackStatus === 'loading'}>{active && playbackStatus === 'loading' ? <i className=\"preview-spinner\" /> : active && playbackStatus === 'playing' ? 'Ⅱ' : '▶'}</button>",
    'visuel de chargement des cartes',
)

app = replace_once(app, "  onPreview: (block: PodcastBlock) => void;", "  onPreview: (block: PodcastBlock) => Promise<PreviewSession>;", 'type de l’aperçu de bloc')
app = replace_once(app, "  const [showSfxRecorder, setShowSfxRecorder] = useState(false);", "  const [showSfxRecorder, setShowSfxRecorder] = useState(false);\n  const [transitionLoadingId, setTransitionLoadingId] = useState<string | null>(null);", 'chargement des transitions')
app = replace_once(app, "  const canSave = !requiresAsset || Boolean(block.assetId);", "  const canSave = block.type === 'transition' ? Boolean(block.assetId && block.transitionPreset) : !requiresAsset || Boolean(block.assetId);", 'transition réelle obligatoire')
app = replace_once(app, "          {selectedAsset && (", "          {selectedAsset && block.type !== 'transition' && (", 'plage fixe des transitions')

transition_chooser = r'''

  const chooseTransitionRecording = async (recording: TransitionRecording) => {
    requestExclusivePreview('transition-selection');
    setError('');
    setTransitionLoadingId(recording.libraryId);
    try {
      const preset = AUDIO_LIBRARY.find((candidate) => candidate.id === recording.libraryId && candidate.kind === 'sfx');
      if (!preset) throw new Error('Cet enregistrement de transition est introuvable.');
      const existing = assets.find((asset) => asset.libraryId === preset.id);
      const asset = existing ?? await onRegisterAsset(
        await loadLibraryAudio(preset),
        preset.title,
        undefined,
        undefined,
        { source: 'library', libraryId: preset.id },
      );
      const trimStart = Math.min(asset.duration, Math.max(0, preset.clipStart ?? 0));
      const clipDuration = Math.min(4, preset.clipDuration ?? preset.duration, Math.max(0.05, asset.duration - trimStart));
      setBlock((current) => ({
        ...current,
        transitionPreset: recording.preset,
        assetId: asset.id,
        title: current.title === 'Transition' || current.title.startsWith('Nouvelle') ? recording.label : current.title,
        duration: clipDuration,
        trimStart,
        trimEnd: trimStart + clipDuration,
        fadeIn: 'none',
        fadeOut: 'short',
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger cette transition.');
    } finally {
      setTransitionLoadingId(null);
    }
  };'''
app = replace_once(app, "\n  const libraryKind: LibraryKind =", transition_chooser + "\n\n  const libraryKind: LibraryKind =", 'sélection des transitions enregistrées')

old_transition_ui = '''            <div className="setting-group"><h3>Type de transition</h3><div className="option-grid">{(Object.keys(transitionLabels) as TransitionPreset[]).map((preset) => <button key={preset} className={block.transitionPreset === preset ? 'selected' : ''} onClick={() => update('transitionPreset', preset)}>{transitionLabels[preset]}</button>)}</div><div className="transition-controls"><label className="field compact-field"><span>Durée</span><input type="range" min="0.5" max="3" step="0.1" value={block.duration} onChange={(event) => update('duration', Number(event.target.value))} /><strong>{block.duration.toFixed(1)} s</strong></label><ChoiceSetting title="Volume de la transition" value={block.transitionVolume ?? 'normal'} options={[["low", "Discret"], ["normal", "Normal"], ["high", "Fort"]]} onChange={(value) => update('transitionVolume', value as VolumeLevel)} /></div></div>'''
new_transition_ui = '''            <div className="setting-group transition-recordings-panel">
              <div className="setting-title-row"><div><h3>Enregistrement de transition</h3><p>Choisis un son réel, libre et reconnaissable. Chaque extrait dure au maximum 4 secondes.</p></div><span className="recording-badge">Enregistrements réels</span></div>
              <div className="transition-recording-grid">
                {TRANSITION_RECORDINGS.map((recording) => {
                  const preset = AUDIO_LIBRARY.find((candidate) => candidate.id === recording.libraryId);
                  const selected = block.transitionPreset === recording.preset && selectedAsset?.libraryId === recording.libraryId;
                  return (
                    <article key={recording.libraryId} className={`transition-recording-card ${selected ? 'selected' : ''}`}>
                      <button disabled={Boolean(transitionLoadingId)} onClick={() => void chooseTransitionRecording(recording)}>
                        <span>{recording.icon}</span><span><strong>{recording.label}</strong><small>{recording.description}</small></span>
                        <em>{transitionLoadingId === recording.libraryId ? <i className="preview-spinner" /> : selected ? '✓' : formatTime(Math.min(4, preset?.clipDuration ?? preset?.duration ?? 0))}</em>
                      </button>
                      {preset && <a href={preset.sourcePage} target="_blank" rel="noreferrer" title={`${preset.author} · ${preset.license}`}>ⓘ Source · {preset.license}</a>}
                    </article>
                  );
                })}
              </div>
              {selectedAsset ? <div className="selected-audio">✓ {selectedAsset.name} · extrait de {formatTime(block.duration)}</div> : <div className="missing-audio">Choisis un enregistrement pour activer l’aperçu et l’ajout.</div>}
              <ChoiceSetting title="Volume de la transition" value={block.transitionVolume ?? 'normal'} options={[["low", "Discret"], ["normal", "Normal"], ["high", "Fort"]]} onChange={(value) => update('transitionVolume', value as VolumeLevel)} />
            </div>'''
app = replace_once(app, old_transition_ui, new_transition_ui, 'interface des transitions réelles')

app = replace_once(
    app,
    "          <button className=\"secondary-button\" onClick={() => onPreview(block)} disabled={!canSave}>▶ Écouter l’aperçu</button>",
    "          <TimedPreviewButton previewId={`block-editor-${block.id}`} onStart={() => onPreview(block)} disabled={!canSave} />",
    'aperçu de l’éditeur avec progression',
)

app = replace_once(app, "onClick={() => setLibraryTarget('block')}", "onClick={() => { requestExclusivePreview('window-change'); setLibraryTarget('block'); }}", 'arrêt avant bibliothèque principale')
background_library_buttons = "onClick={() => setLibraryTarget('background')}"
if app.count(background_library_buttons) != 2:
    raise RuntimeError(f'arrêt avant bibliothèque de fond: attendu 2 occurrences, trouvé {app.count(background_library_buttons)}.')
app = app.replace(background_library_buttons, "onClick={() => { requestExclusivePreview('window-change'); setLibraryTarget('background'); }}")
app = app.replace("onClick={() => onOpenLibrary(", "onClick={() => { requestExclusivePreview('window-change'); onOpenLibrary(")
app = app.replace(")}>🎼 Bibliothèque musicale</button>", "); }}>🎼 Bibliothèque musicale</button>")
app = app.replace(")}>🔊 Bibliothèque</button>", "); }}>🔊 Bibliothèque</button>")

# Le lecteur de la voix synchronisée possède déjà une glissière ; on lui ajoute le chargement et l’exclusivité.
app = replace_once(app, "  const [playing, setPlaying] = useState(false);\n  const duration", "  const [playing, setPlaying] = useState(false);\n  const [loading, setLoading] = useState(false);\n  const previewIdRef = useRef(`voice-cue-${crypto.randomUUID()}`);\n  const duration", 'état du lecteur vocal')
app = replace_once(
    app,
    "  const seek = (value: number) => {",
    "  const stopVoicePreview = useCallback(() => {\n    audioRef.current?.pause();\n    setPlaying(false);\n    setLoading(false);\n  }, []);\n\n  useEffect(() => {\n    const listener = (event: Event) => {\n      if ((event as CustomEvent<string>).detail !== previewIdRef.current) stopVoicePreview();\n    };\n    window.addEventListener(PREVIEW_STOP_EVENT, listener);\n    return () => window.removeEventListener(PREVIEW_STOP_EVENT, listener);\n  }, [stopVoicePreview]);\n\n  const seek = (value: number) => {",
    'exclusivité du lecteur vocal',
)
old_voice_toggle = '''  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      setPlaying(false);
      return;
    }
    setBrowserAudioSession('playback');
    if (audio.currentTime < trimStart || audio.currentTime >= trimEnd) audio.currentTime = trimStart + position;
    try { await audio.play(); setPlaying(true); }
    catch { setPlaying(false); }
  };'''
new_voice_toggle = '''  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused || loading) {
      stopVoicePreview();
      return;
    }
    requestExclusivePreview(previewIdRef.current);
    setBrowserAudioSession('playback');
    setLoading(audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA);
    if (audio.currentTime < trimStart || audio.currentTime >= trimEnd) audio.currentTime = trimStart + position;
    try { await audio.play(); setLoading(false); setPlaying(true); }
    catch { setLoading(false); setPlaying(false); }
  };'''
app = replace_once(app, old_voice_toggle, new_voice_toggle, 'chargement du lecteur vocal')
app = replace_once(app, "        onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />", "        onWaiting={() => setLoading(true)} onCanPlay={() => setLoading(false)} onPause={() => setPlaying(false)} onPlay={() => { setLoading(false); setPlaying(true); }} />", 'événements du lecteur vocal')
app = replace_once(app, "        <button className=\"cue-play-button\" onClick={() => void toggle()}>{playing ? 'Ⅱ' : '▶'}</button>", "        <button className=\"cue-play-button\" onClick={() => void toggle()} aria-busy={loading}>{loading ? <i className=\"preview-spinner\" /> : playing ? 'Ⅱ' : '▶'}</button>", 'bouton du lecteur vocal')

new_library_modal = r'''function AudioLibraryModal({ kind, onClose, onChoose }: { kind: LibraryKind; onClose: () => void; onChoose: (preset: LibraryPreset) => Promise<void> }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Toutes');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { requestExclusivePreview('audio-library-window'); }, []);

  const normalizedSearch = search.trim().toLocaleLowerCase('fr');
  const results = AUDIO_LIBRARY.filter((preset) => {
    if (preset.kind !== kind) return false;
    if (category !== 'Toutes' && preset.category !== category && !preset.secondaryCategories?.includes(category)) return false;
    if (!normalizedSearch) return true;
    return [preset.title, preset.description, preset.category, ...(preset.secondaryCategories ?? []), ...preset.tags].join(' ').toLocaleLowerCase('fr').includes(normalizedSearch);
  });

  const add = async (preset: LibraryPreset) => {
    requestExclusivePreview('library-add');
    setAddingId(preset.id);
    setError('');
    try {
      await onChoose(preset);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible d’ajouter ce son.');
      setAddingId(null);
    }
  };

  return (
    <div className="modal-backdrop library-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="modal audio-library-modal" role="dialog" aria-modal="true" aria-label={kind === 'music' ? 'Bibliothèque musicale' : 'Bibliothèque de bruitages'}>
        <div className="modal-header"><div><h2>{kind === 'music' ? 'Bibliothèque musicale' : 'Bibliothèque de bruitages'}</h2><small>{AUDIO_LIBRARY.filter((item) => item.kind === kind).length} sons disponibles</small></div><button onClick={onClose} aria-label="Fermer">×</button></div>
        <div className="library-toolbar">
          <label className="library-search"><span>⌕</span><input autoFocus placeholder={kind === 'music' ? 'Rechercher : médiéval, épique, calme, forêt…' : 'Rechercher : cheval, bataille, pluie, gare…'} value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <div className="library-categories"><button className={category === 'Toutes' ? 'selected' : ''} onClick={() => setCategory('Toutes')}>Toutes</button>{LIBRARY_CATEGORIES[kind].map((item) => <button key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
        </div>
        <div className="library-results-heading"><strong>{results.length} résultat{results.length > 1 ? 's' : ''}</strong>{category !== 'Toutes' && <button onClick={() => setCategory('Toutes')}>Effacer le filtre</button>}</div>
        <div className="library-grid">
          {results.map((preset) => (
            <article className="library-card" key={preset.id}>
              <div className="library-card-icon">{preset.icon}</div>
              <div className="library-card-copy"><span>{preset.category}</span><h3>{preset.title}</h3><p>{preset.description}</p><small>{formatTime(preset.clipDuration ?? preset.duration)}{preset.clipDuration && preset.clipDuration < preset.duration ? ' · extrait conseillé' : ''} · {preset.tags.slice(0, 3).join(' · ')}</small><a className="library-source-link" href={preset.sourcePage} target="_blank" rel="noreferrer" title={`${preset.author} · ${preset.license}`}>ⓘ Source</a></div>
              <div className="library-card-actions"><TimedPreviewButton previewId={`library-${preset.id}`} onStart={() => createLibraryPreviewSession(preset)} disabled={Boolean(addingId)} compact /><button className="primary-button compact" disabled={Boolean(addingId)} onClick={() => void add(preset)}>{addingId === preset.id ? 'Ajout…' : '＋ Ajouter'}</button></div>
            </article>
          ))}
          {results.length === 0 && <div className="library-no-result"><span>🔎</span><strong>Aucun son trouvé</strong><p>Essaie un mot plus simple ou choisis une autre catégorie.</p></div>}
        </div>
        <div className="library-footer-note"><a href="./audio-credits.html" target="_blank" rel="noreferrer">Sources et licences de tous les sons</a><span>Les fichiers sont téléchargés au premier ajout puis conservés dans le projet.</span></div>
        {error && <div className="error-box library-error">{error}</div>}
      </div>
    </div>
  );
}'''
app = replace_between(app, 'function AudioLibraryModal(', '\n\nfunction ChoiceSetting', new_library_modal, 'bibliothèque avec aperçus cohérents')

app = replace_once(
    app,
    "  status: 'stopped' | 'playing' | 'paused'; elapsed: number; duration: number; activeTitle?: string;",
    "  status: 'stopped' | 'loading' | 'playing' | 'paused'; elapsed: number; duration: number; activeTitle?: string;",
    'type du lecteur global',
)
app = replace_once(
    app,
    "      <button className=\"player-main-button\" disabled={duration <= 0} onClick={onPlayPause}>{status === 'playing' ? 'Ⅱ' : '▶'}</button>",
    "      <button className=\"player-main-button\" disabled={duration <= 0 || status === 'loading'} onClick={onPlayPause} aria-busy={status === 'loading'}>{status === 'loading' ? <i className=\"preview-spinner\" /> : status === 'playing' ? 'Ⅱ' : '▶'}</button>",
    'chargement du lecteur global',
)
app = replace_once(
    app,
    "function ExportScreen({ project, duration, rendering, onBack, onListen, onExportWav, onExportProject }: {\n  project: PodcastProject; duration: number; rendering: boolean; onBack: () => void; onListen: () => void; onExportWav: () => void; onExportProject: () => void;",
    "function ExportScreen({ project, duration, rendering, onBack, onListen, onExportWav, onExportProject }: {\n  project: PodcastProject; duration: number; rendering: boolean; onBack: () => void; onListen: () => Promise<PreviewSession>; onExportWav: () => void; onExportProject: () => void;",
    'type de l’aperçu d’export',
)
app = replace_once(
    app,
    "        <button className=\"secondary-button large listen-button\" disabled={duration <= 0} onClick={onListen}>▶ Écouter le podcast complet</button>",
    "        <TimedPreviewButton previewId=\"export-full-podcast\" onStart={onListen} disabled={duration <= 0} label=\"Écouter le podcast complet\" />",
    'aperçu d’export avec progression',
)

app = replace_once(
    app,
    "function Modal({ title, onClose, wide = false, children }: { title: string; onClose: () => void; wide?: boolean; children: React.ReactNode }) {\n  useEffect(() => {",
    "function Modal({ title, onClose, wide = false, children }: { title: string; onClose: () => void; wide?: boolean; children: React.ReactNode }) {\n  useEffect(() => { requestExclusivePreview('modal-window'); }, []);\n  useEffect(() => {",
    'arrêt à l’ouverture des fenêtres',
)

app = replace_once(
    app,
    "  const [playbackStatus, setPlaybackStatus] = useState<'stopped' | 'loading' | 'playing' | 'paused'>('stopped');\n  const [elapsed, setElapsed] = useState(0);",
    "  const [playbackStatus, setPlaybackStatus] = useState<'stopped' | 'loading' | 'playing' | 'paused'>('stopped');\n  const [playbackDisplayDuration, setPlaybackDisplayDuration] = useState(0);\n  const [playbackKind, setPlaybackKind] = useState<'project' | 'block'>('project');\n  const [elapsed, setElapsed] = useState(0);",
    'durée propre à chaque aperçu',
)
app = replace_once(app, "    const request = ++playbackRequestRef.current;\n    setPlaybackStatus('loading');", "    const request = ++playbackRequestRef.current;\n    setPlaybackKind('project');\n    setPlaybackDisplayDuration(getProjectDuration(project));\n    setPlaybackStatus('loading');", 'durée de lecture du projet')
app = replace_once(app, "                const previewProject = { ...project, blocks: [block] };\n                setElapsed(0);", "                const previewProject = { ...project, blocks: [block] };\n                setPlaybackKind('block');\n                setPlaybackDisplayDuration(getBlockDuration(block, project.assets));\n                setElapsed(0);", 'durée de lecture d’un bloc')
app = replace_once(app, "                    if (value >= current.totalDuration - 0.04) void stopPlayback();\n                  }, 80);", "                    if (value >= current.totalDuration - 0.04) { setElapsed(0); void stopPlayback(); }\n                  }, 80);", 'remise à zéro après l’aperçu d’un bloc')
app = replace_once(app, "        duration={projectDuration}\n        activeTitle={timeline.find", "        duration={playbackStatus === 'stopped' ? projectDuration : playbackDisplayDuration}\n        seekable={playbackKind === 'project'}\n        activeTitle={timeline.find", 'lecteur global adapté à l’aperçu')
app = replace_once(app, "        onSeek={(value) => { setElapsed(value); if (playbackStatus !== 'stopped') void beginPlayback(value); }}", "        onSeek={(value) => { if (playbackKind !== 'project') return; setElapsed(value); if (playbackStatus !== 'stopped') void beginPlayback(value); }}", 'recherche limitée au podcast complet')
app = replace_once(app, "function GlobalPlayer({ status, elapsed, duration, activeTitle, onPlayPause, onStop, onSeek }: {\n  status: 'stopped' | 'loading' | 'playing' | 'paused'; elapsed: number; duration: number; activeTitle?: string;", "function GlobalPlayer({ status, elapsed, duration, seekable, activeTitle, onPlayPause, onStop, onSeek }: {\n  status: 'stopped' | 'loading' | 'playing' | 'paused'; elapsed: number; duration: number; seekable: boolean; activeTitle?: string;", 'type du lecteur global')
app = replace_once(app, "disabled={duration <= 0} onChange={(event) => onSeek(Number(event.target.value))}", "disabled={duration <= 0 || !seekable} onChange={(event) => onSeek(Number(event.target.value))}", 'curseur de l’aperçu de bloc')

APP_PATH.write_text(app, encoding='utf-8')


engine = ENGINE_PATH.read_text(encoding='utf-8')
engine = replace_once(engine, ', TransitionPreset, VoiceEffect, VolumeLevel', ', VoiceEffect, VolumeLevel', 'import des transitions synthétiques')
engine = replace_once(engine, "if (block.type === 'transition') return Math.min(3, Math.max(0.5, block.duration));", "if (block.type === 'transition') return Math.min(4, Math.max(0.05, block.duration));", 'durée des transitions enregistrées')
engine = replace_between(engine, 'function transitionTone(', '\n\nasync function scheduleVoiceBlock', '', 'suppression du synthétiseur de transition')

new_jingle_profiles = '''type JingleStyle = NonNullable<PodcastBlock['jingle']>['style'];

const JINGLE_STYLE_PROFILES: Record<JingleStyle, {
  voiceStart: number; intro: number; duck: number; outro: number; voice: number;
  opening: number; closing: number; voiceEffect: VoiceEffect;
}> = {
  dynamic: { voiceStart: 0.65, intro: 2.9, duck: 1.05, outro: 2.35, voice: 1.08, opening: 1, closing: 1, voiceEffect: 'none' },
  adventure: { voiceStart: 1.25, intro: 2.6, duck: 0.92, outro: 2.25, voice: 1.02, opening: 0.92, closing: 1.05, voiceEffect: 'none' },
  mysterious: { voiceStart: 1.6, intro: 1.65, duck: 0.68, outro: 1.35, voice: 0.94, opening: 0.7, closing: 0.78, voiceEffect: 'echo' },
  serious: { voiceStart: 1, intro: 1.45, duck: 0.62, outro: 1.25, voice: 1, opening: 0.55, closing: 0.62, voiceEffect: 'none' },
  historical: { voiceStart: 1.35, intro: 1.85, duck: 0.78, outro: 1.55, voice: 0.96, opening: 0.84, closing: 0.88, voiceEffect: 'distant' },
  'modern-radio': { voiceStart: 0.8, intro: 2.25, duck: 0.88, outro: 2, voice: 1.06, opening: 0.95, closing: 0.98, voiceEffect: 'phone' },
};'''
engine = replace_between(engine, "type JingleStyle = NonNullable<PodcastBlock['jingle']>['style'];", '\n\nasync function scheduleJingle', new_jingle_profiles, 'jingles sans son synthétique')
engine = replace_once(engine, "  } else {\n    transitionTone(context, destination, profile.fallback, start, remaining, profile.fallbackGain);\n  }", "  }", 'suppression du bruit artificiel des jingles')

old_transition_schedule = '''  if (block.type === 'transition') {
    transitionTone(context, destination, block.transitionPreset ?? 'fade', start, total - localOffset, transitionVolumeValue(block.transitionVolume));
    return;
  }'''
new_transition_schedule = '''  if (block.type === 'transition') {
    const transitionAsset = assetById(project, block.assetId);
    if (!transitionAsset) return;
    const sourceOffset = block.trimStart + localOffset;
    const duration = Math.min(4, total - localOffset);
    await scheduleAsset(
      context,
      destination,
      transitionAsset,
      cache,
      start,
      sourceOffset,
      duration,
      transitionVolumeValue(block.transitionVolume),
      'none',
      'short',
    );
    return;
  }'''
engine = replace_once(engine, old_transition_schedule, new_transition_schedule, 'lecture des transitions enregistrées')
ENGINE_PATH.write_text(engine, encoding='utf-8')


# Corrige les deux crédits sélectionnés dont la page Commons indique désormais le domaine public.
library = LIBRARY_PATH.read_text(encoding='utf-8')
library_marker = 'export const AUDIO_LIBRARY: LibraryPreset[] = '
array_start = library.index('[', library.index(library_marker) + len(library_marker))
array_end = library.index('\n] as LibraryPreset[];', array_start) + 2
items = json.loads(library[array_start:array_end])
by_id = {item['id']: item for item in items}
pd_url = 'https://creativecommons.org/publicdomain/mark/1.0/'
for item_id, author in [('sfx-buzzer-real', 'BlastOButter42'), ('sfx-human-whistling', 'TwoWings')]:
    item = by_id[item_id]
    item['license'] = 'Domaine public'
    item['licenseUrl'] = pd_url
    item['attribution'] = f'{item["title"]} — {author} — domaine public.'
LIBRARY_PATH.write_text(library[:array_start] + json.dumps(items, ensure_ascii=False, indent=2) + library[array_end:], encoding='utf-8')

rows = []
for item in items:
    rows.append(
        '<tr>'
        f'<td>{html.escape(item["title"])}</td>'
        f'<td>{"Musique" if item["kind"] == "music" else "Bruitage"}</td>'
        f'<td>{html.escape(item["author"])}</td>'
        f'<td><a href="{html.escape(item["licenseUrl"], quote=True)}">{html.escape(item["license"])}</a></td>'
        f'<td><a href="{html.escape(item["sourcePage"], quote=True)}">Source</a></td>'
        '</tr>'
    )
credits = '''<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Crédits audio — Podcast Facile</title><style>body{font:16px system-ui;margin:0;background:#f7f9fc;color:#17243b}main{max-width:1100px;margin:auto;padding:32px 18px}h1{margin-bottom:8px}p{line-height:1.5}table{width:100%;border-collapse:collapse;background:white;border-radius:14px;overflow:hidden}th,td{text-align:left;padding:10px;border-bottom:1px solid #e5e9f1;font-size:14px}th{background:#edf3ff}a{color:#2457d6}@media(max-width:700px){table,tbody,tr,td{display:block}thead{display:none}tr{padding:10px;border-bottom:1px solid #ddd}td{border:0;padding:4px 8px}}</style></head><body><main><h1>Crédits audio — Podcast Facile</h1><p>Les musiques et bruitages proviennent de sources libres ou sous licence. Chaque fichier reste associé à son auteur, à sa page source et à sa licence.</p><table><thead><tr><th>Titre dans l’application</th><th>Type</th><th>Auteur</th><th>Licence</th><th>Fichier</th></tr></thead><tbody>''' + ''.join(rows) + '</tbody></table></main></body></html>'
CREDITS_PATH.write_text(credits, encoding='utf-8')


styles = STYLES_PATH.read_text(encoding='utf-8')
styles += r'''

/* Transitions enregistrées et aperçus cohérents 20260722-real-transitions-preview-1 */
.preview-spinner { display: inline-block; width: 15px; height: 15px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: preview-spin .75s linear infinite; }
@keyframes preview-spin { to { transform: rotate(360deg); } }
.timed-preview { min-width: 190px; display: grid; gap: 5px; }
.timed-preview.compact { min-width: 150px; }
.preview-control { position: relative; width: 100%; min-height: 44px; overflow: hidden; padding: 9px 13px; border: 1px solid #b9c8e4; border-radius: 10px; background: #fff; color: var(--primary); }
.preview-control:hover:not(:disabled) { border-color: var(--primary); background: var(--primary-soft); }
.preview-control.loading { color: #52627e; background: #f3f6fb; }
.preview-control.playing { border-color: var(--primary); background: #edf2ff; }
.preview-control-main { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 8px; }
.preview-control-main strong { font-size: .9rem; }
.preview-control-main small { margin-left: auto; color: #53617a; font-variant-numeric: tabular-nums; }
.preview-progress { position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: #dbe4f5; }
.preview-progress i { display: block; height: 100%; border-radius: inherit; background: var(--primary); transition: width .08s linear; }
.preview-error { color: var(--danger); line-height: 1.3; }
.library-card-actions .timed-preview { flex: 1 1 165px; }
.library-card-actions .preview-control { min-height: 38px; padding: 7px 10px; }
.recording-badge { padding: 6px 10px; border-radius: 999px; background: #e7f7ef; color: #16724a; font-size: .78rem; font-weight: 800; white-space: nowrap; }
.transition-recording-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 14px; }
.transition-recording-card { overflow: hidden; border: 1px solid #d7dfec; border-radius: 13px; background: #fff; transition: border-color .16s ease, box-shadow .16s ease; }
.transition-recording-card.selected { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(37, 87, 214, .12); }
.transition-recording-card > button { width: 100%; display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; gap: 9px; align-items: center; padding: 12px; border: 0; background: transparent; color: var(--ink); text-align: left; }
.transition-recording-card > button:hover:not(:disabled) { background: #f6f8ff; }
.transition-recording-card > button > span:first-child { font-size: 1.35rem; text-align: center; }
.transition-recording-card > button > span:nth-child(2) { display: grid; gap: 3px; }
.transition-recording-card > button small { color: var(--muted); line-height: 1.3; }
.transition-recording-card > button em { min-width: 29px; color: var(--primary); font-size: .78rem; font-style: normal; font-weight: 800; text-align: right; }
.transition-recording-card > a { display: block; padding: 6px 12px 8px 55px; border-top: 1px solid #edf0f5; color: #5c6d8b; font-size: .72rem; text-decoration: none; }
.transition-recording-card > a:hover { color: var(--primary); text-decoration: underline; }
.modal-footer > .timed-preview { min-width: 230px; }
.round-play .preview-spinner, .player-main-button .preview-spinner, .cue-play-button .preview-spinner { width: 14px; height: 14px; }
@media (max-width: 700px) {
  .transition-recording-grid { grid-template-columns: 1fr; }
  .recording-badge { white-space: normal; text-align: center; }
  .modal-footer > .timed-preview { width: 100%; min-width: 0; }
  .preview-control-main { flex-wrap: wrap; }
  .preview-control-main small { width: 100%; margin: 0; }
}
'''
STYLES_PATH.write_text(styles, encoding='utf-8')

print('Transitions réelles et lecteurs d’aperçu cohérents appliqués.')
