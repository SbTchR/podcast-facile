import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createLibraryPreviewSession, getLibraryPreviewDuration, type PreviewSession } from './audio/libraryPreview';
import { TRANSITION_RECORDINGS } from './data/podcastTransitions';
import { usedLibraryCredits } from './audio/libraryCredits';
import { useDialog } from './useDialog';
import { AudioExcerpt } from './components/AudioExcerpt';
import { SectionSoundWizard } from './components/SectionSoundWizard';
import { SectionAudioOverview } from './components/SectionAudioOverview';
import { JingleSectionOverview } from './components/JingleSectionOverview';
import { SectionElementCard } from './components/SectionElementCard';
import { removeNarrativeBlock } from './audio/voiceEditing';
import { removeSectionLayer, syncLayerPauses } from './audio/sectionLayers';
import { applySectionArrangement } from './audio/sectionTimeline';
import { JingleWizard } from './components/JingleWizard';
import { VoiceScript } from './components/VoiceScript';
import { getGuidedJinglePlan, isGuidedJingle } from './audio/jinglePlan';
import { VOICE_SPEAKER_LABELS, voiceSpeakerClass } from './audio/voiceSpeakers';
import { JINGLE_CREDIT_BEDS, getJingleBed } from './data/jingleBeds';
import { JINGLE_CREDIT_ENDINGS } from './data/jingleEndings';
import { AUDIO_LIBRARY, LIBRARY_CATEGORIES, SOUND_CATEGORIES, availableLibrarySounds, loadLibraryAudio, type LibraryKind, type LibraryPreset, type SoundGroup } from './data/audioLibrary';
import {
  formatTime,
  getAudioDuration,
  getBlockDuration,
  getProjectDuration,
  getTimeline,
  playProject,
  renderProjectToWav,
  transitionVolumeValue,
  transitionDurationLimit,
  type PlaybackController,
} from './audio/engine';
import { deleteProject, listProjects, loadProject, saveProject } from './storage/db';
import { deserializeProject, serializeProject } from './storage/projectFile';
import type {
  AudioAsset,
  BackgroundAudio,
  BlockType,
  FadeLevel,
  PodcastBlock,
  PodcastProject,
  PodcastSection,
  Screen,
  SectionGuideType,
  SectionAudioLayer,
  JingleVoicePart,
  TransitionPreset,
  VoiceEffect,
  VoiceSoundCue,
  VolumeLevel,
} from './types';

// Student UX and streaming previews: 20260930-student-ux-1
// Guided structure and audio levels: 20260722-guided-structure-1
// Real transitions and coherent previews: 20260722-real-transitions-preview-1
const APP_NAME = 'Podcast Facile';
const WELCOME_TEXT = 'Enregistre ta voix, ajoute quelques sons et télécharge ton podcast. Aucun montage compliqué.';
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const blockLabels: Record<BlockType, string> = {
  voice: 'Voix',
  music: 'Musique',
  sfx: 'Bruitage',
  silence: 'Pause/Musique seule',
  jingle: 'Jingle',
  transition: 'Transition',
};

const blockIcons: Record<BlockType, string> = {
  voice: '🎙️',
  music: '🎵',
  sfx: '🔊',
  silence: '⏸️',
  jingle: '📻',
  transition: '✨',
};

type TransitionRecording = (typeof TRANSITION_RECORDINGS)[number];

const voiceEffectLabels: Record<VoiceEffect, string> = {
  none: 'Aucun effet',
  phone: 'Effet téléphone',
  echo: 'Rêve',
  distant: 'Caverne',
  deep: 'Voix grave',
  high: 'Voix aiguë',
  'very-high': 'Voix très aiguë',
};

const sectionGuideContent: Record<SectionGuideType, {
  title: string;
  icon: string;
  summary: string;
  prompts: string[];
  examples: string[];
}> = {
  'intro-jingle': {
    title: 'Jingle d’intro', icon: '🎬',
    summary: 'Ouvre le podcast avec une identité sonore courte et annonce clairement le programme.',
    prompts: ['Présente le nom du podcast.', 'Annonce le thème général en une phrase.', 'Donne envie d’écouter la suite.'],
    examples: ['« Bienvenue dans “…”, le podcast qui parle de… »', '« Installez-vous : aujourd’hui, nous allons… »'],
  },
  introduction: {
    title: 'Introduction', icon: '👋',
    summary: 'Présente le sujet, la question principale et le chemin que suivra l’épisode.',
    prompts: ['Explique pourquoi le sujet mérite qu’on s’y intéresse.', 'Pose une question directrice.', 'Annonce brièvement les grandes parties.'],
    examples: ['« Aujourd’hui, nous allons chercher à comprendre… »', '« Pour commencer, posons-nous cette question : … »', '« Nous verrons d’abord…, puis…, avant de… »'],
  },
  part: {
    title: 'Partie', icon: '🧩',
    summary: 'Développe une idée importante avec des explications, des faits et des exemples.',
    prompts: ['Commence par l’idée principale de cette partie.', 'Ajoute un exemple ou un fait utile.', 'Termine par une transition vers la suite.'],
    examples: ['« Tout d’abord, il faut comprendre que… »', '« Un élément important est… »', '« Cet exemple montre que… »', '« Passons maintenant à… »'],
  },
  'intermediate-jingle': {
    title: 'Jingle intermédiaire', icon: '🔀',
    summary: 'Crée une respiration sonore et signale clairement le passage vers une nouvelle étape.',
    prompts: ['Résume très brièvement ce qui vient d’être dit.', 'Annonce la partie suivante.', 'Garde une formulation courte et rythmée.'],
    examples: ['« Après cette première étape, poursuivons avec… »', '« Dans un instant, nous allons découvrir… »'],
  },
  conclusion: {
    title: 'Conclusion', icon: '✅',
    summary: 'Rassemble les idées essentielles, répond à la question de départ et propose une ouverture.',
    prompts: ['Rappelle les deux ou trois idées principales.', 'Formule une réponse claire.', 'Termine par une ouverture ou une invitation à réfléchir.'],
    examples: ['« Pour résumer, nous avons vu que… »', '« Nous pouvons donc retenir que… »', '« Il reste maintenant à se demander… »'],
  },
  'final-jingle': {
    title: 'Jingle final', icon: '🏁',
    summary: 'Ferme l’épisode avec une signature sonore, un remerciement et éventuellement un rendez-vous.',
    prompts: ['Remercie les auditeurs.', 'Rappelle le nom du podcast.', 'Invite à écouter un prochain épisode.'],
    examples: ['« Merci d’avoir écouté “…”. »', '« À bientôt pour un nouvel épisode consacré à… »'],
  },
};

function cloneBlock(block: PodcastBlock): PodcastBlock {
  return {
    ...block,
    background: block.background ? { ...block.background } : undefined,
    jingle: block.jingle ? { ...block.jingle, takes: block.jingle.takes ? Object.fromEntries(Object.entries(block.jingle.takes).map(([part, take]) => [part, take ? { ...take } : undefined])) : undefined, scripts: block.jingle.scripts ? { ...block.jingle.scripts } : undefined, enabledParts: block.jingle.enabledParts ? { ...block.jingle.enabledParts } : undefined, effects: block.jingle.effects ? Object.fromEntries(Object.entries(block.jingle.effects).map(([part, values]) => [part, values ? { ...values } : undefined])) : undefined } : undefined,
    voiceCues: block.voiceCues?.map((cue) => ({ ...cue })),
  };
}

function cloneProject(project: PodcastProject): PodcastProject {
  return {
    ...project,
    sections: project.sections.map((section) => ({ ...section, audioLayers: section.audioLayers?.map((layer) => ({ ...layer, start: { ...layer.start }, end: layer.end ? { ...layer.end } : undefined })) })),
    blocks: project.blocks.map(cloneBlock),
    assets: project.assets.map((asset) => ({ ...asset, blob: asset.blob })),
  };
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'podcast';
}

const PREVIEW_STOP_EVENT = 'podcast-facile-stop-preview';

function requestExclusivePreview(ownerId: string): void {
  window.dispatchEvent(new CustomEvent<string>(PREVIEW_STOP_EVENT, { detail: ownerId }));
}

function TimedPreviewButton({ previewId, onStart, disabled = false, label = 'Écouter l’aperçu', compact = false }: {
  previewId: string;
  onStart: (signal: AbortSignal) => Promise<PreviewSession>;
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
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    requestRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
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
      const controller = new AbortController();
      abortRef.current = controller;
      const session = await onStart(controller.signal);
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
      <button className={`preview-control ${status}`} disabled={disabled} onClick={() => void toggle()} aria-busy={status === 'loading'} aria-label={status === 'loading' ? 'Annuler le chargement' : status === 'playing' ? 'Arrêter l’aperçu' : label}>
        <span className="preview-control-main">
          {status === 'loading' ? <i className="preview-spinner" aria-hidden="true" /> : <span aria-hidden="true">{status === 'playing' ? '■' : '▶'}</span>}
          <strong>{status === 'loading' ? 'Chargement…' : status === 'playing' ? 'Arrêter' : label}</strong>
          {status === 'playing' && <small>{formatTime(elapsed)} / {formatTime(duration)}</small>}
        </span>
        {status === 'playing' && <span className="preview-progress" aria-hidden="true"><i style={{ width: `${progress}%` }} /></span>}
      </button>
      {status === 'loading' && <small className="preview-loading-note">Clique à nouveau pour annuler.</small>}
      {error && <small className="preview-error" role="alert">{error}</small>}
    </div>
  );
}

function makeSection(title: string, kind: PodcastSection['kind'] = 'standard', guideType?: SectionGuideType): PodcastSection {
  return { id: crypto.randomUUID(), title, collapsed: false, kind, guideType };
}

function makeBlock(type: BlockType, sectionId: string): PodcastBlock {
  const duration = type === 'silence' ? 1 : type === 'transition' ? 1.2 : type === 'jingle' ? 10 : 0;
  return {
    id: crypto.randomUUID(),
    sectionId,
    type,
    title: type === 'voice' ? 'Nouvelle voix' : type === 'music' ? 'Nouvelle musique' : type === 'sfx' ? 'Nouveau bruitage' : type === 'silence' ? 'Pause/Musique seule' : type === 'jingle' ? 'Mon jingle' : 'Transition',
    duration,
    trimStart: 0,
    trimEnd: duration,
    volume: 'normal',
    musicVolume: type === 'music' ? 30 : undefined,
    fadeIn: type === 'voice' ? 'short' : 'normal',
    fadeOut: type === 'voice' ? 'short' : 'normal',
    voiceEffect: 'none',
    speaker: type === 'voice' ? 'voice-1' : undefined,
    voiceEnhancement: type === 'voice' ? 'magic-boost' : 'natural',
    voiceCues: type === 'voice' ? [] : undefined,
    transitionPreset: undefined,
    transitionVolume: type === 'transition' ? 'normal' : undefined,
    jingle: type === 'jingle' ? { style: 'modern-radio', musicLevel: 'low', musicVolume: 32, production: 'guided-v9', bedId: getJingleBed('modern-radio', undefined, 'extended').id, signatureFx: false } : undefined,
  };
}

function makeGuidedSection(guideType: SectionGuideType, existingSections: PodcastSection[]): { section: PodcastSection; block?: PodcastBlock } {
  const isJingle = guideType === 'intro-jingle' || guideType === 'intermediate-jingle' || guideType === 'final-jingle';
  const partNumber = existingSections.filter((section) => section.guideType === 'part').length + 1;
  const title = guideType === 'part' ? `Partie ${partNumber}` : sectionGuideContent[guideType].title;
  const section = makeSection(title, isJingle ? 'jingle' : 'standard', guideType);
  if (!isJingle) return { section };
  const block = makeBlock('jingle', section.id);
  block.title = title;
  return { section, block };
}

function createProject(title: string, author: string): PodcastProject {
  const now = new Date().toISOString();
  const sections: PodcastSection[] = [];
  const blocks: PodcastBlock[] = [];
  const preset: SectionGuideType[] = ['intro-jingle', 'introduction', 'part', 'part', 'intermediate-jingle', 'part', 'conclusion', 'final-jingle'];
  for (const guideType of preset) {
    const created = makeGuidedSection(guideType, sections);
    if (created.section.kind === 'jingle' || guideType === 'conclusion' || (guideType === 'part' && sections.some((section) => section.guideType === 'part'))) created.section.collapsed = true;
    sections.push(created.section);
    if (created.block) blocks.push(created.block);
  }
  return {
    id: crypto.randomUUID(),
    title: title.trim() || 'Mon podcast',
    author: author.trim(),
    targetDuration: undefined,
    templateId: 'guided',
    sections,
    blocks,
    assets: [],
    createdAt: now,
    updatedAt: now,
  };
}

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [project, setProject] = useState<PodcastProject | null>(null);
  const [projects, setProjects] = useState<PodcastProject[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving'>('saved');
  const [toast, setToast] = useState<string>('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [sectionHelp, setSectionHelp] = useState<PodcastSection | null>(null);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [carouselPosition, setCarouselPosition] = useState(0);
  const [carouselThumbSize, setCarouselThumbSize] = useState(100);
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const update = () => {
      const overflow = Math.max(0, carousel.scrollWidth - carousel.clientWidth);
      setCarouselThumbSize(Math.max(12, Math.min(100, carousel.clientWidth / Math.max(1, carousel.scrollWidth) * 100)));
      setCarouselPosition(overflow ? Math.max(0, Math.min(100, carousel.scrollLeft / overflow * 100)) : 0);
    };
    const observer = new ResizeObserver(update); observer.observe(carousel);
    carousel.addEventListener('scroll', update, { passive: true }); update();
    return () => { observer.disconnect(); carousel.removeEventListener('scroll', update); };
  }, [screen, project?.sections.length]);
  const selectedSection = project?.sections.find(section => section.id === selectedSectionId) ?? project?.sections[0];
  const selectedSectionIndex = project?.sections.findIndex(section => section.id === selectedSection?.id) ?? -1;
  useEffect(() => {
    const card = Array.from(carouselRef.current?.children ?? []).find(child => (child as HTMLElement).dataset.sectionId === selectedSection?.id);
    card?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [selectedSection?.id, project?.sections.length]);
  const [addSectionId, setAddSectionId] = useState<string | null>(null);
  const [editingLayer, setEditingLayer] = useState<{ sectionId: string; kind: 'voice' | 'music' | 'sfx'; initial?: SectionAudioLayer; initialVoiceId?: string; initialBlockId?: string; newBlockType?: 'voice' | 'silence' | 'transition' } | null>(null);
  const [editingBlock, setEditingBlock] = useState<PodcastBlock | null>(null);
  const [editingIsNew, setEditingIsNew] = useState(false);
  const [editingJinglePart, setEditingJinglePart] = useState<JingleVoicePart>();
  const [setupTitle, setSetupTitle] = useState('');
  const [setupAuthor, setSetupAuthor] = useState('');
  const undoRef = useRef<PodcastProject[]>([]);
  const redoRef = useRef<PodcastProject[]>([]);

  const playbackRef = useRef<PlaybackController | null>(null);
  const playbackTimerRef = useRef<number | null>(null);
  const playbackRequestRef = useRef(0);
  const [playbackStatus, setPlaybackStatus] = useState<'stopped' | 'loading' | 'playing' | 'paused'>('stopped');
  const [playbackDisplayDuration, setPlaybackDisplayDuration] = useState(0);
  const [playbackKind, setPlaybackKind] = useState<'project' | 'block'>('project');
  const [elapsed, setElapsed] = useState(0);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  const refreshProjects = useCallback(async () => {
    try {
      setProjects(await listProjects());
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Impossible de lire les projets locaux.');
    }
  }, []);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    requestExclusivePreview(`screen-${screen}`);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [screen]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const applyChange = useCallback((mutator: (draft: PodcastProject) => void, recordHistory = true) => {
    setProject((current) => {
      if (!current) return current;
      if (recordHistory) {
        undoRef.current.push(cloneProject(current));
        if (undoRef.current.length > 40) undoRef.current.shift();
        redoRef.current = [];
      }
      const draft = cloneProject(current);
      mutator(draft);
      syncLayerPauses(draft);
      draft.updatedAt = new Date().toISOString();
      return draft;
    });
    setDirty(true);
    setSaveState('dirty');
  }, []);

  const saveCurrentProject = useCallback(async (showToast = true) => {
    if (!project) return;
    setSaveState('saving');
    try {
      const next = { ...project, updatedAt: new Date().toISOString() };
      await saveProject(next);
      setProject(next);
      setDirty(false);
      setSaveState('saved');
      if (showToast) setToast('Projet sauvegardé sur cet appareil.');
      await refreshProjects();
    } catch (error) {
      setSaveState('dirty');
      setToast(error instanceof Error ? error.message : 'Échec de la sauvegarde.');
    }
  }, [project, refreshProjects]);

  useEffect(() => {
    if (!project || !dirty) return;
    const timeout = window.setTimeout(() => void saveCurrentProject(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [dirty, project, saveCurrentProject]);

  const stopPlayback = useCallback(() => {
    playbackRequestRef.current += 1;
    if (playbackTimerRef.current !== null) window.clearInterval(playbackTimerRef.current);
    playbackTimerRef.current = null;
    const controller = playbackRef.current;
    playbackRef.current = null;
    if (controller) void controller.stop().catch(() => undefined);
    setPlaybackStatus('stopped');
    setActiveBlockId(null);
  }, []);

  useEffect(() => () => { void stopPlayback(); }, [stopPlayback]);

  useEffect(() => {
    const listener = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== 'global-player') stopPlayback();
    };
    window.addEventListener(PREVIEW_STOP_EVENT, listener);
    return () => window.removeEventListener(PREVIEW_STOP_EVENT, listener);
  }, [stopPlayback]);

  const beginPlayback = useCallback(async (offset = 0) => {
    if (!project || getProjectDuration(project) <= 0) return;
    requestExclusivePreview('global-player');
    stopPlayback();
    const request = ++playbackRequestRef.current;
    setPlaybackKind('project');
    setPlaybackDisplayDuration(getProjectDuration(project));
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
  }, [project, stopPlayback]);

  const togglePause = useCallback(async () => {
    const controller = playbackRef.current;
    if (!controller) {
      await beginPlayback(elapsed);
      return;
    }
    if (playbackStatus === 'loading') return;
    if (playbackStatus === 'playing') {
      await controller.pause();
      setPlaybackStatus('paused');
    } else {
      await controller.resume();
      setPlaybackStatus('playing');
    }
  }, [beginPlayback, elapsed, playbackStatus]);

  const undo = useCallback(() => {
    if (!project || undoRef.current.length === 0) return;
    const previous = undoRef.current.pop()!;
    redoRef.current.push(cloneProject(project));
    setProject(previous);
    setDirty(true);
    setSaveState('dirty');
  }, [project]);

  const redo = useCallback(() => {
    if (!project || redoRef.current.length === 0) return;
    const next = redoRef.current.pop()!;
    undoRef.current.push(cloneProject(project));
    setProject(next);
    setDirty(true);
    setSaveState('dirty');
  }, [project]);

  const openProject = async (id: string) => {
    const loaded = await loadProject(id);
    if (!loaded) {
      setToast('Ce projet est introuvable.');
      return;
    }
    await stopPlayback();
    undoRef.current = [];
    redoRef.current = [];
    setProject(loaded);
    setDirty(false);
    setSaveState('saved');
    setElapsed(0);
    setScreen('editor');
  };

  const startSetup = () => {
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

  const goHome = async () => {
    if (dirty) await saveCurrentProject(false);
    await stopPlayback();
    setScreen('home');
    setProject(null);
    setElapsed(0);
    await refreshProjects();
  };

  const registerAsset = async (file: Blob, name: string, mimeType = file.type || 'audio/webm', knownDuration?: number, metadata?: Pick<AudioAsset, 'source' | 'libraryId'>): Promise<AudioAsset> => {
    if (file.size > MAX_FILE_SIZE) throw new Error('Ce fichier dépasse la limite de 50 Mo.');
    const duration = knownDuration ?? await getAudioDuration(file);
    const asset: AudioAsset = { id: crypto.randomUUID(), name, mimeType, duration, blob: file, ...metadata };
    applyChange((draft) => { draft.assets.push(asset); });
    return asset;
  };

  const saveBlock = (block: PodcastBlock) => {
    applyChange((draft) => {
      const existingIndex = draft.blocks.findIndex((item) => item.id === block.id);
      if (existingIndex >= 0) draft.blocks[existingIndex] = block;
      else {
        const indexes = draft.blocks.map((item, index) => item.sectionId === block.sectionId ? index : -1).filter((index) => index >= 0);
        const insertAt = indexes.length ? Math.max(...indexes) + 1 : draft.blocks.length;
        draft.blocks.splice(insertAt, 0, block);
      }
    });
    setEditingBlock(null);
    setEditingIsNew(false);
  };

  const addVoice = (sectionId: string) => {
    const block = makeBlock('voice', sectionId);
    block.title = `Voix ${(project?.blocks.filter((item) => item.sectionId === sectionId && item.type === 'voice').length ?? 0) + 1}`;
    setEditingBlock(block);
    setEditingIsNew(true);
  };

  const addGuidedSection = (guideType: SectionGuideType) => {
    if (!project) return;
    const created = makeGuidedSection(guideType, project.sections);
    applyChange((draft) => {
      const index = draft.sections.findIndex(section => section.id === selectedSection?.id);
      draft.sections.splice(index < 0 ? draft.sections.length : index + 1, 0, created.section);
      if (created.block) draft.blocks.push(created.block);
    });
    setAddSectionOpen(false);
    setSelectedSectionId(created.section.id);
    if (created.block) {
      setEditingBlock(created.block);
      setEditingIsNew(true);
    }
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

  const exportProjectFile = async () => {
    if (!project) return;
    setRendering(true);
    try {
      const blob = await serializeProject(project);
      downloadBlob(blob, `${safeFilename(project.title)}.podfacile`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Impossible d’exporter la sauvegarde.');
    } finally {
      setRendering(false);
    }
  };

  const importProjectFile = async (file: File) => {
    try {
      const imported = await deserializeProject(file);
      await saveProject(imported);
      setToast('Projet importé.');
      await refreshProjects();
      await openProject(imported.id);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Ce fichier ne peut pas être importé.');
    }
  };

  const exportWav = async () => {
    if (!project) return;
    setRendering(true);
    setToast('Création du fichier WAV en cours…');
    try {
      const wav = await renderProjectToWav(project);
      downloadBlob(wav, `${safeFilename(project.title)}.wav`);
      setToast('Le podcast WAV a été créé.');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'L’export WAV a échoué.');
    } finally {
      setRendering(false);
    }
  };

  const projectDuration = project ? getProjectDuration(project) : 0;
  const timeline = useMemo(() => project ? getTimeline(project) : [], [project]);

  if (screen === 'home') {
    return (
      <HomeScreen
        projects={projects}
        onCreate={startSetup}
        onOpen={openProject}
        onDelete={async (id) => {
          if (!window.confirm('Supprimer définitivement ce projet enregistré sur cet appareil ?')) return;
          await deleteProject(id);
          await refreshProjects();
        }}
        onDuplicate={async (source) => {
          const copy = cloneProject(source);
          copy.id = crypto.randomUUID();
          copy.title = `${copy.title} – copie`;
          copy.createdAt = new Date().toISOString();
          copy.updatedAt = copy.createdAt;
          await saveProject(copy);
          await refreshProjects();
          setToast('Projet dupliqué.');
        }}
        onImport={importProjectFile}
        onHelp={() => setHelpOpen(true)}
      />
    );
  }

  if (screen === 'setup') {
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

  if (!project) return null;

  if (screen === 'export') {
    return (
      <ExportScreen
        project={project}
        duration={projectDuration}
        rendering={rendering}
        onBack={() => setScreen('editor')}
        onListen={() => playProject(project, 0)}
        onExportWav={() => void exportWav()}
        onExportProject={() => void exportProjectFile()}
      />
    );
  }

  return (
    <div className="app-shell">
      <EditorTopbar
        project={project}
        duration={projectDuration}
        saveState={saveState}
        canUndo={undoRef.current.length > 0}
        canRedo={redoRef.current.length > 0}
        onHome={() => void goHome()}
        onSave={() => void saveCurrentProject()}
        onUndo={undo}
        onRedo={redo}
        onHelp={() => setHelpOpen(true)}
        onExport={() => setScreen('export')}
      />

      <main className="editor-main" aria-label={`Montage de ${project.title}`}>

        <div className="section-carousel-toolbar">
          <div className="section-carousel-nav"><button className="secondary-button compact" aria-label="Section précédente" disabled={selectedSectionIndex <= 0} onClick={() => setSelectedSectionId(project.sections[selectedSectionIndex - 1].id)}>←</button><button className="secondary-button compact" aria-label="Section suivante" disabled={selectedSectionIndex >= project.sections.length - 1} onClick={() => setSelectedSectionId(project.sections[selectedSectionIndex + 1].id)}>→</button></div>
          <span className="section-selection-label">{selectedSection ? `Après « ${selectedSection.title} »` : 'Ton podcast'}</span>
          <button className="add-section-button" onClick={() => setAddSectionOpen(true)}>＋ Ajouter une section</button>
          <div className="section-carousel-position" aria-hidden="true"><div className="carousel-position-track"><span className="carousel-position-thumb" style={{ width: `${carouselThumbSize}%`, left: `${carouselPosition * (100 - carouselThumbSize) / 100}%` }} /></div></div>
        </div>
        <div className="section-carousel" ref={carouselRef} tabIndex={0} role="region" aria-label="Trame du podcast">
        {project.sections.map((section, sectionIndex) => {
          const blocks = project.blocks.filter((block) => block.sectionId === section.id);
          const duration = blocks.reduce((sum, block) => sum + getBlockDuration(block, project.assets), 0);
          return (
            <SectionPanel
              key={section.id}
              section={section}
              sectionIndex={sectionIndex}
              sectionCount={project.sections.length}
              blocks={blocks}
              assets={project.assets}
              project={project}
              onAddLayer={(kind) => setEditingLayer({ sectionId: section.id, kind })}
              onEditLayer={(initial) => setEditingLayer({ sectionId: section.id, kind: initial.kind, initial })}
              onEditVoiceInTimeline={(voice) => setEditingLayer({ sectionId: section.id, kind: 'voice', initialVoiceId: voice.id })}
              onEditPart={() => setEditingLayer({ sectionId: section.id, kind: 'voice' })}
              onPreviewSection={() => playProject({ ...project, sections: [section], blocks }, 0)}
              onPreviewBlock={block => playProject({ ...project, sections: project.sections.map(item => ({ ...item, audioLayers: [] })), blocks: [block] }, 0)}
              onToggleJinglePart={(block, part, included) => {
                requestExclusivePreview('jingle-toggle'); stopPlayback();
                applyChange(draft => {
                  const current = draft.blocks.find(item => item.id === block.id);
                  if (current?.jingle) current.jingle = { ...current.jingle, production: 'guided-v9', enabledParts: { ...current.jingle.enabledParts, [part]: included } };
                });
              }}
              onDeleteLayer={layer => {
                if (!window.confirm(`Supprimer « ${layer.title} » ?`)) return;
                applyChange(draft => removeSectionLayer(draft, section.id, layer.id));
              }}
              duration={duration}
              onRename={(title) => applyChange((draft) => { const item = draft.sections.find((candidate) => candidate.id === section.id); if (item) item.title = title; })}
              selected={selectedSection?.id === section.id}
              onSelect={() => setSelectedSectionId(section.id)}
              onHelp={() => setSectionHelp(section)}
              onAdd={() => setEditingLayer({ sectionId: section.id, kind: 'voice' })}
              onAddVoice={() => setEditingLayer({ sectionId: section.id, kind: 'voice', newBlockType: 'voice' })}
              onMoveSection={(direction) => applyChange((draft) => {
                const index = draft.sections.findIndex((item) => item.id === section.id);
                const target = index + direction;
                if (target < 0 || target >= draft.sections.length) return;
                [draft.sections[index], draft.sections[target]] = [draft.sections[target], draft.sections[index]];
              })}
              onDeleteSection={() => {
                const contentWarning = blocks.length > 0 ? ' et tout son contenu' : '';
                if (!window.confirm(`Supprimer la section « ${section.title} »${contentWarning} ?`)) return;
                applyChange((draft) => {
                  draft.blocks = draft.blocks.filter((item) => item.sectionId !== section.id);
                  draft.sections = draft.sections.filter((item) => item.id !== section.id);
                });
              }}
              onEdit={(block, part) => { if (section.kind !== 'jingle' && ['voice', 'silence', 'transition'].includes(block.type)) { setEditingLayer({ sectionId: section.id, kind: 'voice', initialBlockId: block.id }); return; } setEditingJinglePart(part); setEditingBlock(cloneBlock(block)); setEditingIsNew(false); }}
              onDelete={(block) => {
                if (!window.confirm(`Supprimer « ${block.title} » ?`)) return;
                applyChange(draft => { if (['voice', 'silence', 'transition'].includes(block.type)) Object.assign(draft, removeNarrativeBlock(draft, block.id)); else draft.blocks = draft.blocks.filter(item => item.id !== block.id); });
              }}
            />
          );
        })}

        </div>
      </main>

      <GlobalPlayer
        status={playbackStatus}
        elapsed={elapsed}
        duration={playbackStatus === 'stopped' ? projectDuration : playbackDisplayDuration}
        seekable={playbackKind === 'project'}
        activeTitle={timeline.find((entry) => entry.block.id === activeBlockId)?.block.title}
        onPlayPause={() => void togglePause()}
        onStop={() => { setElapsed(0); void stopPlayback(); }}
        onSeek={(value) => { if (playbackKind !== 'project') return; setElapsed(value); if (playbackStatus !== 'stopped') void beginPlayback(value); }}
      />

      {addSectionId && (
        <AddBlockModal
          onClose={() => setAddSectionId(null)}
          onChoose={(type) => {
            const block = makeBlock(type, addSectionId);
            setAddSectionId(null);
            setEditingBlock(block);
            setEditingIsNew(true);
          }}
        />
      )}

      {addSectionOpen && <AddSectionModal onClose={() => setAddSectionOpen(false)} onChoose={addGuidedSection} />}

      {editingBlock && (
        <BlockEditorModal
          key={`${editingBlock.id}-${editingIsNew ? 'new' : 'edit'}`}
          block={editingBlock}
          podcastTitle={project.title}
          assets={project.assets}
          isNew={editingIsNew}
          initialJinglePart={editingIsNew ? undefined : editingJinglePart}
          onClose={closeBlockEditor}
          onSave={saveBlock}
          onRegisterAsset={registerAsset}
          onPreview={(block) => playProject({ ...project, sections: project.sections.map((item) => ({ ...item, audioLayers: [] })), blocks: [block] }, 0)}
        />
      )}

      {editingLayer && <SectionSoundWizard key={editingLayer.initial?.id ?? editingLayer.initialVoiceId ?? editingLayer.initialBlockId ?? `${editingLayer.sectionId}-${editingLayer.kind}`} project={project} {...editingLayer} onClose={() => setEditingLayer(null)} onRegisterAsset={registerAsset} ui={{ Modal, FilePicker, Library: AudioLibraryModal, Preview: TimedPreviewButton, Recorder, BlockEditor: BlockEditorModal, createBlock: makeBlock }} onSave={(edited) => {
        applyChange((draft) => applySectionArrangement(draft, edited, editingLayer.sectionId));
        setEditingLayer(null);
      }} />}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
      {sectionHelp && <SectionHelpModal section={sectionHelp} onClose={() => setSectionHelp(null)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function HomeScreen({
  projects,
  onCreate,
  onOpen,
  onDelete,
  onDuplicate,
  onImport,
  onHelp,
}: {
  projects: PodcastProject[];
  onCreate: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (project: PodcastProject) => void;
  onImport: (file: File) => void;
  onHelp: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="home-screen">
      <header className="home-header">
        <div className="brand"><span className="brand-mark">PF</span><span>{APP_NAME}</span></div>
        <button className="ghost-button" onClick={onHelp}>? Aide</button>
      </header>
      <main className="home-content">
        <section className="home-hero">
          <div className="hero-symbol" aria-hidden="true"><span>🎙️</span><span>＋</span><span>🎵</span></div>
          <h1>Ton premier podcast commence ici.</h1>
          <p>{WELCOME_TEXT}</p>
          <div className="hero-actions">
            <button className="primary-button large" onClick={onCreate}>Créer un nouveau podcast</button>
            <button className="secondary-button large" disabled={projects.length === 0} onClick={() => document.getElementById('saved-projects')?.scrollIntoView({ behavior: 'smooth' })}>Reprendre un projet</button>
          </div>
          <p className="privacy-line">🔒 Tes fichiers restent sur cet appareil. Rien n’est envoyé sur internet.</p>
        </section>

        <section id="saved-projects" className="saved-projects">
          <div className="section-heading-row">
            <div><h2>Projets enregistrés</h2><p>Les projets restent dans ce navigateur tant que ses données ne sont pas effacées.</p></div>
            <button className="secondary-button" onClick={() => inputRef.current?.click()}>Ouvrir une sauvegarde</button>
            <input ref={inputRef} type="file" accept=".podfacile,application/json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) onImport(file); event.currentTarget.value = ''; }} />
          </div>
          {projects.length === 0 ? (
            <div className="empty-projects"><div>📭</div><strong>Aucun projet sauvegardé</strong><p>Crée ton premier podcast ou ouvre une sauvegarde.</p></div>
          ) : (
            <div className="project-list">
              {projects.map((project) => (
                <article className="project-row" key={project.id}>
                  <div className="project-icon">🎧</div>
                  <div className="project-details"><h3>{project.title}</h3><p>{project.author || 'Auteur non indiqué'} · modifié le {new Date(project.updatedAt).toLocaleDateString('fr-CH')}</p></div>
                  <div className="project-actions">
                    <button className="primary-button compact" onClick={() => onOpen(project.id)}>Ouvrir</button>
                    <button className="icon-text-button" onClick={() => onDuplicate(project)}>⧉ Dupliquer</button>
                    <button className="icon-text-button danger" onClick={() => onDelete(project.id)}>🗑 Supprimer</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function SetupScreen({ title, author, onTitle, onAuthor, onBack, onFinish }: {
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
        <p className="lead">Choisis un titre. Un plan avec une introduction, des parties et une conclusion sera prêt pour toi. Tu pourras l’adapter.</p>
        <div className="setup-form-grid setup-form-simple">
          <label className="field"><span>Titre du podcast <b>*</b></span><input autoFocus value={title} onChange={(event) => onTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && title.trim()) onFinish(); }} placeholder="Ex. Magellan : héros ou envahisseur ?" /></label>
          <label className="field"><span>Nom de l’élève ou du groupe <small>(facultatif)</small></span><input value={author} onChange={(event) => onAuthor(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && title.trim()) onFinish(); }} placeholder="Ex. Groupe 3" /></label>
        </div>
        <div className="setup-footer"><button className="secondary-button large" onClick={onBack}>Annuler</button><button className="primary-button large" disabled={!title.trim()} onClick={onFinish}>Créer le podcast →</button></div>
      </main>
    </div>
  );
}

function EditorTopbar({ project, duration, saveState, canUndo, canRedo, onHome, onSave, onUndo, onRedo, onHelp, onExport }: {
  project: PodcastProject; duration: number; saveState: 'saved' | 'dirty' | 'saving'; canUndo: boolean; canRedo: boolean;
  onHome: () => void; onSave: () => void; onUndo: () => void; onRedo: () => void; onHelp: () => void; onExport: () => void;
}) {
  return (
    <header className="editor-topbar">
      <button className="brand-button" onClick={onHome}><span className="brand-mark">PF</span><span className="brand-name">{APP_NAME}</span></button>
      <div className="topbar-project"><strong>{project.title}</strong><span className={`save-indicator ${saveState}`}>{saveState === 'saved' ? '✓ Sauvegardé' : saveState === 'saving' ? 'Sauvegarde…' : '● Modifications non sauvegardées'}</span></div>
      <div className="topbar-actions">
        <button className="toolbar-button" aria-label="Enregistrer le projet" onClick={onSave}>💾 <span>Enregistrer</span></button>
        <button className="toolbar-button" disabled={!canUndo} onClick={onUndo} title="Annuler">↶</button>
        <button className="toolbar-button" disabled={!canRedo} onClick={onRedo} title="Rétablir">↷</button>
        <button className="toolbar-button" aria-label="Aide" onClick={onHelp}>? <span>Aide</span></button>
        <span className="duration-chip">⏱ {formatTime(duration)}</span>
        <button className="primary-button compact" onClick={onExport}>Télécharger →</button>
      </div>
    </header>
  );
}

function SectionPanel({
  section, sectionIndex, sectionCount, blocks, assets, duration, project, onAddLayer, onEditLayer, onDeleteLayer, onEditVoiceInTimeline, onPreviewSection, onPreviewBlock, onEditPart, onToggleJinglePart,
  onRename, selected, onSelect, onHelp, onAdd, onAddVoice, onMoveSection, onDeleteSection, onEdit, onDelete,
}: {
  section: PodcastSection; sectionIndex: number; sectionCount: number; blocks: PodcastBlock[]; assets: AudioAsset[]; duration: number; project: PodcastProject;
  onEditPart: () => void; onAddLayer: (kind: 'music' | 'sfx') => void; onEditLayer: (layer: SectionAudioLayer) => void; onDeleteLayer: (layer: SectionAudioLayer) => void;
  onEditVoiceInTimeline: (block: PodcastBlock) => void; onPreviewSection: () => Promise<PreviewSession>; onPreviewBlock: (block: PodcastBlock) => Promise<PreviewSession>;
  onToggleJinglePart: (block: PodcastBlock, part: JingleVoicePart, included: boolean) => void;
  onRename: (title: string) => void; selected: boolean; onSelect: () => void; onHelp: () => void; onAdd: () => void; onAddVoice: () => void;
  onMoveSection: (direction: -1 | 1) => void; onDeleteSection: () => void; onEdit: (block: PodcastBlock, part?: JingleVoicePart) => void; onDelete: (block: PodcastBlock) => void;
}) {
  const mainJingle = blocks.find(block => block.type === 'jingle');
  const jingleReady = mainJingle ? (isGuidedJingle(mainJingle) ? getGuidedJinglePlan(mainJingle, assets).ready : getBlockDuration(mainJingle, assets) > 0) : false;
  return <section className={`podcast-section ${section.kind === 'jingle' ? 'jingle-section' : ''} ${selected ? 'selected-section' : ''}`} data-section-id={section.id} onPointerDown={onSelect} onFocusCapture={onSelect}>
    <div className="podcast-section-header">
      <button className="section-select-button" aria-label={`Sélectionner ${section.title}`} aria-pressed={selected} onClick={onSelect}>{sectionIndex + 1}</button>
      <input className="section-title-input" value={section.title} onChange={event => onRename(event.target.value)} aria-label="Nom de la section" />
      <button className="section-help-button" onClick={onHelp} title="Conseils et exemples pour cette section" aria-label={`Aide pour ${section.title}`}>?</button>
      {section.kind === 'jingle' && <span className="section-kind-badge">Jingle</span>}
      <span className="section-duration">{formatTime(duration)}</span>
      <button className="mini-button" disabled={sectionIndex === 0} onClick={() => onMoveSection(-1)} title="Déplacer la section vers la gauche">←</button>
      <button className="mini-button" disabled={sectionIndex === sectionCount - 1} onClick={() => onMoveSection(1)} title="Déplacer la section vers la droite">→</button>
      <button className="mini-button danger" onClick={onDeleteSection} title="Supprimer la section">×</button>
    </div>
    <div className="block-stack">
      <div className="section-edit-action"><div className="section-primary-actions">
        {section.kind === 'jingle' ? mainJingle && <><button className="secondary-button compact" onClick={() => onEdit(mainJingle)}>✎ Editer le jingle</button><TimedPreviewButton previewId={`jingle-section-${mainJingle.id}`} label="Écouter le jingle" disabled={!jingleReady} onStart={onPreviewSection} /></> : <><button className="secondary-button compact" onClick={onEditPart}>✎ Editer la partie</button>{duration > 0 && <TimedPreviewButton previewId={`section-${section.id}`} label="Écouter cette partie" onStart={onPreviewSection} />}</>}
      </div></div>
      {section.kind !== 'jingle' && <SectionAudioOverview project={project} sectionId={section.id} onAdd={onAddLayer} onEdit={onEditLayer} onVoice={onEditVoiceInTimeline} onOpenVoice={onEditPart} />}
      {!blocks.length && <div className="empty-section"><strong>{section.kind === 'jingle' ? 'Prépare une courte signature sonore.' : 'À toi de parler !'}</strong><p>{sectionGuideContent[section.guideType ?? 'part'].prompts[0]}</p></div>}
      {blocks.map(block => {
        if (block.type === 'jingle' && ['guided-v7', 'guided-v8', 'guided-v9'].includes(block.jingle?.production ?? '') && block.jingle?.takes) return <JingleSectionOverview key={block.id} block={block} assets={assets} podcastTitle={project.title} onEdit={part => onEdit(block, part)} onToggle={(part, included) => onToggleJinglePart(block, part, included)} Preview={TimedPreviewButton} />;
        const layer = section.audioLayers?.find(item => item.pauseBlockId === block.id);
        return <SectionBlockCard key={block.id} block={block} assets={assets} onEdit={() => layer ? onEditLayer(layer) : onEdit(block)} onDelete={() => layer ? onDeleteLayer(layer) : onDelete(block)} onPreview={() => onPreviewBlock(block)} />;
      })}
      {section.kind !== 'jingle' && <div className="narrative-actions"><button className="primary-button compact" onClick={onAddVoice}>🎙 Enregistrer une voix</button><button className="ghost-button compact" onClick={onAdd}>＋ Transition ou pause</button></div>}
    </div>
  </section>;
}

function SectionBlockCard({ block, assets, onEdit, onDelete, onPreview }: {
  block: PodcastBlock; assets: AudioAsset[]; onEdit: () => void; onDelete: () => void; onPreview: () => Promise<PreviewSession>;
}) {
  const duration = getBlockDuration(block, assets);
  const unprepared = block.type === 'jingle' && duration === 0;
  const title = block.type === 'silence' && block.title === 'Pause' ? 'Pause/Musique seule' : block.title;
  const label = block.type === 'voice' ? 'cette voix' : block.type === 'silence' ? 'cette pause' : block.type === 'transition' ? 'cette transition' : 'cet élément';
  const speaker = block.type === 'voice' && block.speaker ? `${VOICE_SPEAKER_LABELS[block.speaker]} · ` : '';
  return <SectionElementCard className={`block-${block.type} ${block.type === 'voice' ? voiceSpeakerClass(block.speaker) : ''}`} icon={blockIcons[block.type]} title={title} detail={unprepared ? 'Facultatif · à préparer' : `${speaker}${duration.toFixed(1).replace('.', ',')} s${block.voiceEffect !== 'none' ? ' · ' + voiceEffectLabels[block.voiceEffect] : ''}`} onEdit={onEdit} onDelete={onDelete}>
    <TimedPreviewButton previewId={`element-${block.id}`} label={`Écouter ${label}`} disabled={unprepared || duration <= 0} onStart={onPreview} />
  </SectionElementCard>;
}

function AddSectionModal({ onClose, onChoose }: { onClose: () => void; onChoose: (type: SectionGuideType) => void }) {
  const choices: SectionGuideType[] = ['intro-jingle', 'intermediate-jingle', 'final-jingle', 'introduction', 'part', 'conclusion'];
  return (
    <Modal title="Ajouter une section" onClose={onClose} wide>
      <p className="modal-lead">Choisis le rôle de cette nouvelle section. Tu pourras ensuite la renommer, la déplacer ou la supprimer.</p>
      <div className="section-type-grid">
        {choices.map((type) => {
          const content = sectionGuideContent[type];
          return <button key={type} className={`section-type-choice ${type.includes('jingle') ? 'jingle-choice' : ''}`} onClick={() => onChoose(type)}><span>{content.icon}</span><strong>{content.title}</strong><small>{content.summary}</small></button>;
        })}
      </div>
    </Modal>
  );
}

function SectionHelpModal({ section, onClose }: { section: PodcastSection; onClose: () => void }) {
  const guideType = section.guideType ?? (section.kind === 'jingle' ? 'intermediate-jingle' : 'part');
  const content = sectionGuideContent[guideType];
  return (
    <Modal title={`Aide · ${section.title}`} onClose={onClose}>
      <div className="section-help-content">
        <div className="section-help-intro"><span>{content.icon}</span><p>{content.summary}</p></div>
        <h3>Que dire dans cette partie ?</h3>
        <ul>{content.prompts.map((prompt) => <li key={prompt}>{prompt}</li>)}</ul>
        <h3>Phrases pour démarrer</h3>
        <div className="example-phrases">{content.examples.map((example) => <p key={example}>{example}</p>)}</div>
        <p className="section-help-note">Ces formulations sont des points de départ : adapte-les librement à ton sujet et à ton ton.</p>
      </div>
    </Modal>
  );
}

function BackgroundTimingControl({ label, checked, seconds, onChecked, onSeconds }: {
  label: string;
  checked: boolean;
  seconds: 1 | 2 | 3;
  onChecked: (checked: boolean) => void;
  onSeconds: (seconds: 1 | 2 | 3) => void;
}) {
  return (
    <div className={`background-timing ${checked ? 'enabled' : ''}`}>
      <label className="check-row"><input type="checkbox" checked={checked} onChange={(event) => onChecked(event.target.checked)} /> {label}</label>
      {checked && <div className="timing-buttons" aria-label={`${label} : durée`}>{([1, 2, 3] as const).map((value) => <button key={value} className={seconds === value ? 'selected' : ''} onClick={() => onSeconds(value)}>{value} s</button>)}</div>}
    </div>
  );
}

function AddBlockModal({ onClose, onChoose }: { onClose: () => void; onChoose: (type: BlockType) => void }) {
  const choices: { type: BlockType; title: string; description: string }[] = [
    { type: 'transition', title: 'Ajouter une transition', description: 'Un court son pour passer à la suite' },
    { type: 'silence', title: 'Ajouter une pause/musique seule', description: 'Laisse passer la musique sans voix · de 0,5 à 10 secondes' },
  ];
  return (
    <Modal title="Ajouter à la suite des voix" onClose={onClose} wide>
      <p className="modal-lead">Choisis ce que tu veux entendre ensuite.</p>
      <div className="add-choice-grid">
        {choices.map((choice) => <button key={choice.type} className={`add-choice block-${choice.type}`} onClick={() => onChoose(choice.type)}><span>{blockIcons[choice.type]}</span><strong>{choice.title}</strong><small>{choice.description}</small></button>)}
      </div>
      <p className="privacy-note">🔒 Les enregistrements et fichiers importés restent sur cet appareil.</p>
    </Modal>
  );
}

function BlockEditorModal({ block: initialBlock, assets, podcastTitle, isNew, initialJinglePart, onBusyChange, onClose, onSave, onRegisterAsset, onPreview }: {
  onBusyChange?: (busy: boolean) => void; initialJinglePart?: JingleVoicePart; block: PodcastBlock; assets: AudioAsset[]; podcastTitle: string; isNew: boolean; onClose: () => void; onSave: (block: PodcastBlock) => void;
  onRegisterAsset: (blob: Blob, name: string, mimeType?: string, knownDuration?: number, metadata?: Pick<AudioAsset, 'source' | 'libraryId'>) => Promise<AudioAsset>;
  onPreview: (block: PodcastBlock) => Promise<PreviewSession>;
}) {
  type LibraryTarget = 'block' | 'background' | 'voiceCue' | 'musicAssetId' | 'openingAssetId' | 'closingAssetId';
  const [block, setBlock] = useState<PodcastBlock>(() => cloneBlock(initialBlock));
  const [error, setError] = useState('');
  const [libraryTarget, setLibraryTarget] = useState<LibraryTarget | null>(null);
  const [cueInsertTime, setCueInsertTime] = useState(0);
  const [showSfxRecorder, setShowSfxRecorder] = useState(false);
  const [transitionLoadingId, setTransitionLoadingId] = useState<string | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [transcriptionBusy, setTranscriptionBusy] = useState(false);
  useEffect(() => { onBusyChange?.(voiceBusy || transcriptionBusy || Boolean(transitionLoadingId)); }, [voiceBusy, transcriptionBusy, transitionLoadingId, onBusyChange]);
  const selectedAsset = assets.find((asset) => asset.id === block.assetId);
  const requiresAsset = block.type === 'voice' || block.type === 'music' || block.type === 'sfx';
  const canSave = block.type === 'transition' ? Boolean(block.assetId && block.transitionPreset) : !requiresAsset || Boolean(block.assetId);

  const update = <K extends keyof PodcastBlock>(key: K, value: PodcastBlock[K]) => setBlock((current) => ({ ...current, [key]: value }));

  const importForBlock = async (file: File) => {
    setError('');
    try {
      const asset = await onRegisterAsset(file, file.name, file.type, undefined, { source: 'import' });
      setBlock((current) => ({ ...current, assetId: asset.id, duration: asset.duration, trimStart: 0, trimEnd: asset.duration, title: current.title.startsWith('Nou') ? file.name.replace(/\.[^.]+$/, '') : current.title }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Ce fichier audio ne peut pas être utilisé.');
    }
  };

  const attachAsset = async (field: 'background' | 'musicAssetId' | 'voiceAssetId' | 'openingAssetId' | 'closingAssetId', file: File) => {
    setError('');
    try {
      const asset = await onRegisterAsset(file, file.name, file.type, undefined, { source: 'import' });
      setBlock((current) => {
        if (field === 'background') return { ...current, background: { assetId: asset.id, level: 'low', volume: 32, startBefore: true, startBeforeSeconds: 2, continueAfter: true, continueAfterSeconds: 2 } };
        return { ...current, jingle: { ...(current.jingle ?? { style: 'modern-radio', musicLevel: 'low', musicVolume: 32, voiceEnhancement: 'magic-boost', musicLeadSeconds: 2, musicTailSeconds: 3 }), [field]: asset.id } };
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Ce fichier audio ne peut pas être utilisé.');
    }
  };

  const addVoiceCueAsset = (asset: AudioAsset, at: number) => {
    setBlock((current) => {
      const voiceDuration = Math.max(0.2, (current.trimEnd - current.trimStart) || current.duration);
      const safeAt = Math.min(Math.max(0, at), Math.max(0, voiceDuration - 0.2));
      const remaining = Math.max(0.2, voiceDuration - safeAt);
      const duration = Math.max(0.2, Math.min(2, asset.duration || 2, remaining));
      const cue: VoiceSoundCue = { id: crypto.randomUUID(), assetId: asset.id, at: safeAt, duration, sourceStart: 0, sourceEnd: duration, level: 'low' };
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

  const chooseLibraryPreset = async (preset: LibraryPreset) => {
    setError('');
    try {
      const existing = assets.find((asset) => asset.libraryId === preset.id);
      const asset = existing ?? await onRegisterAsset(
        await loadLibraryAudio(preset),
        preset.title,
        undefined,
        undefined,
        { source: 'library', libraryId: preset.id },
      );
      if (libraryTarget === 'voiceCue') {
        addVoiceCueAsset(asset, cueInsertTime);
        setLibraryTarget(null);
        return;
      }
      setBlock((current) => {
        if (libraryTarget === 'block') {
          const trimStart = Math.min(asset.duration, Math.max(0, preset.clipStart ?? 0));
          const suggestedDuration = preset.clipDuration ?? Math.max(0.05, asset.duration - trimStart);
          const trimEnd = Math.min(asset.duration, Math.max(trimStart + 0.05, trimStart + suggestedDuration));
          return {
            ...current,
            assetId: asset.id,
            duration: trimEnd - trimStart,
            trimStart,
            trimEnd,
            title: current.title.startsWith('Nou') ? preset.title : current.title,
          };
        }
        if (libraryTarget === 'background') {
          return { ...current, background: { assetId: asset.id, level: 'low', volume: 32, startBefore: true, startBeforeSeconds: 2, continueAfter: true, continueAfterSeconds: 2 } };
        }
        if (libraryTarget) {
          return { ...current, jingle: { ...(current.jingle ?? { style: 'modern-radio', musicLevel: 'low', musicVolume: 32, voiceEnhancement: 'magic-boost', musicLeadSeconds: 2, musicTailSeconds: 3 }), [libraryTarget]: asset.id } };
        }
        return current;
      });
      setLibraryTarget(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de télécharger ce son.');
      throw reason;
    }
  };


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
      const clipDuration = Math.min(transitionDurationLimit(preset.id), preset.clipDuration ?? preset.duration, Math.max(0.05, asset.duration - trimStart));
      setBlock((current) => ({
        ...current,
        transitionPreset: recording.preset,
        assetId: asset.id,
        title: current.title === 'Transition' || current.title.startsWith('Nouvelle') || TRANSITION_RECORDINGS.some(item => item.label === current.title) ? recording.label : current.title,
        duration: clipDuration,
        trimStart,
        trimEnd: trimStart + clipDuration,
        fadeIn: 'none',
        fadeOut: 'none',
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger cette transition.');
    } finally {
      setTransitionLoadingId(null);
    }
  };

  const libraryKind: LibraryKind = libraryTarget === 'voiceCue'
    ? 'sfx'
    : libraryTarget === 'block'
      ? (block.type === 'sfx' ? 'sfx' : 'music')
    : libraryTarget === 'openingAssetId' || libraryTarget === 'closingAssetId'
      ? 'sfx'
      : 'music';

  return (
    <>
      <Modal title={`${isNew ? 'Ajouter' : 'Modifier'} : ${blockLabels[block.type]}`} onClose={onClose} wide>
        <div className="editor-modal-body">
          {block.type !== 'jingle' && <label className="field"><span>Nom de l’élément</span><input value={block.title} onChange={(event) => update('title', event.target.value)} /></label>}
          {block.type === 'voice' && <label className="field voice-speaker-select"><span>Voix dans cet enregistrement</span><select value={block.speaker ?? (isNew ? 'voice-1' : '')} onChange={event => update('speaker', (event.target.value || undefined) as PodcastBlock['speaker'])}><option value="">Non définie</option><option value="voice-1">Voix 1</option><option value="voice-2">Voix 2</option><option value="both">Voix 1 et 2</option></select></label>}
          {block.type === 'voice' && <VoiceScript value={block.script ?? ''} onChange={text => update('script', text)} asset={selectedAsset} start={block.trimStart} end={block.trimEnd || selectedAsset?.duration} disabled={voiceBusy} onBusyChange={setTranscriptionBusy} />}

          {requiresAsset && (
            <div className="audio-source-panel">
              <h3>{block.type === 'voice' ? 'Ta voix' : block.type === 'music' ? 'Choisir une musique' : 'Choisir un bruitage'}</h3>
              {block.type === 'voice' && <fieldset className="voice-recorder" disabled={transcriptionBusy}><Recorder onBusyChange={setVoiceBusy} onReady={async (blob, duration) => { const asset = await onRegisterAsset(blob, `Enregistrement ${new Date().toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}`, blob.type, duration, { source: 'recording' }); setBlock((current) => ({ ...current, assetId: asset.id, duration: asset.duration, trimStart: 0, trimEnd: asset.duration })); }} /></fieldset>}
              <div className="source-actions">
                {block.type !== 'voice' && <button className="primary-button file-button" onClick={() => { requestExclusivePreview('window-change'); setLibraryTarget('block'); }}>{block.type === 'music' ? '🎼 Ouvrir la bibliothèque musicale' : '🔊 Ouvrir la bibliothèque de bruitages'}</button>}
                <FilePicker label={block.type === 'voice' ? 'Importer un enregistrement' : block.type === 'music' ? 'Importer ma propre musique' : 'Importer mon propre bruitage'} onFile={importForBlock} />
                {block.type === 'sfx' && <button className="record-sfx-button" onClick={() => setShowSfxRecorder((visible) => !visible)}>● Enregistrer mon propre bruitage</button>}
              </div>
              {block.type === 'sfx' && showSfxRecorder && <div className="inline-sfx-recorder"><Recorder onReady={async (blob, duration) => { const asset = await onRegisterAsset(blob, `Bruitage enregistré ${new Date().toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}`, blob.type, duration, { source: 'recording' }); setBlock((current) => ({ ...current, assetId: asset.id, duration: asset.duration, trimStart: 0, trimEnd: asset.duration, title: current.title.startsWith('Nouveau') ? 'Mon bruitage enregistré' : current.title })); setShowSfxRecorder(false); }} /></div>}
              {selectedAsset ? <div className="selected-audio">✓ {selectedAsset.name} · {formatTime(selectedAsset.duration)}{selectedAsset.source === 'library' ? ' · bibliothèque intégrée' : ''}</div> : <div className="missing-audio">Aucun fichier sélectionné</div>}
              {block.type !== 'voice' && <p className="library-note">Les sons de la bibliothèque proviennent de sources libres ou sous licence. Ils sont téléchargés lors de leur premier ajout. Les sources et crédits sont indiqués pour chaque son.</p>}
            </div>
          )}

          {selectedAsset && block.type !== 'transition' && (
            <details className="optional-settings"><summary>Raccourcir cet enregistrement <small>facultatif</small></summary><TrimControl asset={selectedAsset} start={block.trimStart} end={block.trimEnd || selectedAsset.duration} onChange={(start, end) => setBlock((current) => ({ ...current, trimStart: start, trimEnd: end, duration: end - start, voiceCues: current.voiceCues?.filter((cue) => cue.at < end - start) }))} /></details>
          )}

          {block.type === 'voice' && selectedAsset && Boolean(block.voiceCues?.length) && (
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
          )}

          {block.type === 'silence' && (
            <div className="setting-group"><h3>Durée de la pause</h3><div className="segmented-wrap">{[0.5, 1, 2, 3].map((value) => <button key={value} className={block.duration === value ? 'selected' : ''} onClick={() => update('duration', value)}>{value} s</button>)}</div><label className="field compact-field"><span>Durée personnalisée</span><input type="number" min="0.5" max="10" step="0.5" value={block.duration} onChange={(event) => update('duration', Math.min(10, Math.max(0.5, Number(event.target.value))))} /></label></div>
          )}

          {block.type === 'transition' && (
            <div className="setting-group transition-recordings-panel">
              <div className="setting-title-row"><div><h3>Choisir une transition</h3><p>Écoute les sons, puis clique sur celui qui convient à ta rubrique. Des ponctuations courtes et des zappings radio jusqu’à 8 secondes.</p></div><span className="recording-badge">Sons courts · CC0</span></div>
              <div className="transition-recording-grid">
                {TRANSITION_RECORDINGS.map((recording) => {
                  const preset = AUDIO_LIBRARY.find((candidate) => candidate.id === recording.libraryId);
                  const selected = block.transitionPreset === recording.preset && selectedAsset?.libraryId === recording.libraryId;
                  return (
                    <article key={recording.libraryId} className={`transition-recording-card ${selected ? 'selected' : ''}`}>
                      <button aria-pressed={selected} disabled={Boolean(transitionLoadingId)} onClick={() => void chooseTransitionRecording(recording)}>
                        <span>{recording.icon}</span><span><strong>{recording.label}</strong><small>{recording.description}</small></span>
                        <em>{transitionLoadingId === recording.libraryId ? <i className="preview-spinner" /> : selected ? '✓' : `${Math.min(transitionDurationLimit(recording.libraryId), preset?.clipDuration ?? preset?.duration ?? 0).toFixed(1).replace('.', ',')} s`}</em>
                      </button>
                      {preset && <div className="transition-recording-actions">
                        <TimedPreviewButton previewId={`transition-card-${preset.id}`} compact label={`Écouter ${recording.label}`} disabled={Boolean(transitionLoadingId)} onStart={signal => createLibraryPreviewSession(preset, signal, transitionVolumeValue(block.transitionVolume, preset.id))} />
                        <a href={preset.sourcePage} target="_blank" rel="noreferrer" title={`${preset.author} · ${preset.license}`}>ⓘ Source · {preset.license}</a>
                      </div>}
                    </article>
                  );
                })}
              </div>
              {selectedAsset ? <div className="selected-audio">✓ {selectedAsset.name} · extrait de {block.duration.toFixed(1).replace('.', ',')} s</div> : <div className="missing-audio">Écoute un aperçu sur chaque carte, puis choisis une transition pour l’ajouter.</div>}
              <ChoiceSetting title="Volume de la transition" value={block.transitionVolume ?? 'normal'} options={[["low", "Discret"], ["normal", "Normal"], ["high", "Fort"]]} onChange={(value) => { requestExclusivePreview('transition-volume'); update('transitionVolume', value as VolumeLevel); }} />
            </div>
          )}

          {block.type === 'jingle' && (
            <JingleWizard initialPart={initialJinglePart} block={block} assets={assets} podcastTitle={podcastTitle} onBlock={setBlock} onRegisterAsset={onRegisterAsset} onPreview={onPreview} onSave={onSave} onClose={onClose} isNew={isNew} FilePicker={FilePicker} Preview={TimedPreviewButton} Recorder={Recorder} />
          )}

          {(block.type === 'music' || block.type === 'sfx') && (
            <div className="settings-columns">
              {block.type === 'music' ? (
                <MusicVolumeSlider title="Volume de la musique" value={musicVolumePercent(block.musicVolume, standaloneMusicFallback(block.volume))} onChange={(value) => update('musicVolume', value)} />
              ) : (
                <ChoiceSetting title="Volume" value={block.volume} options={[['low', 'Discret'], ['normal', 'Normal'], ['high', 'Fort']]} onChange={(value) => update('volume', value as VolumeLevel)} />
              )}
              <details className="optional-settings fade-settings"><summary>Arrivée et fin du son <small>facultatif</small></summary><p>Un fondu fait apparaître ou disparaître le son en douceur.</p>
              <ChoiceSetting title="Début" value={block.fadeIn} options={[["none", "Direct"], ["short", "Fondu court"], ["normal", "Fondu normal"]]} onChange={(value) => update('fadeIn', value as FadeLevel)} />
              <ChoiceSetting title="Fin" value={block.fadeOut} options={[["none", "Directe"], ["short", "Fondu court"], ["normal", "Fondu normal"]]} onChange={(value) => update('fadeOut', value as FadeLevel)} />
              </details>
            </div>
          )}

          {block.type === 'voice' && (
            <>
              {block.background && <details className="optional-settings"><summary>Musique déjà liée à cette voix</summary><div className="setting-group background-setting">
                <div className="setting-title-row"><div><h3>Musique de fond</h3><p>L’application baisse automatiquement la musique pendant la voix.</p></div>{block.background && <button className="danger-text" onClick={() => update('background', undefined)}>Retirer</button>}</div>
                {!block.background ? (
                  <div className="source-actions">
                    <button className="primary-button file-button" onClick={() => { requestExclusivePreview('window-change'); setLibraryTarget('background'); }}>🎼 Choisir dans la bibliothèque</button>
                    <FilePicker label="Importer une musique de fond" onFile={(file) => attachAsset('background', file)} />
                  </div>
                ) : (
                  <div className="background-controls">
                    <div className="selected-audio">✓ {assets.find((asset) => asset.id === block.background?.assetId)?.name ?? 'Musique choisie'}</div>
                    <MusicVolumeSlider title="Volume de la musique" value={musicVolumePercent(block.background.volume, backgroundMusicFallback(block.background.level))} onChange={(value) => setBlock((current) => ({ ...current, background: current.background ? { ...current.background, volume: value } : undefined }))} />
                    <BackgroundTimingControl label="Commencer avant la voix" checked={block.background.startBefore} seconds={block.background.startBeforeSeconds ?? 2} onChecked={(checked) => setBlock((current) => ({ ...current, background: current.background ? { ...current.background, startBefore: checked, startBeforeSeconds: current.background.startBeforeSeconds ?? 2 } : undefined }))} onSeconds={(seconds) => setBlock((current) => ({ ...current, background: current.background ? { ...current.background, startBeforeSeconds: seconds } : undefined }))} />
                    <BackgroundTimingControl label="Continuer après la voix" checked={block.background.continueAfter} seconds={block.background.continueAfterSeconds ?? 2} onChecked={(checked) => setBlock((current) => ({ ...current, background: current.background ? { ...current.background, continueAfter: checked, continueAfterSeconds: current.background.continueAfterSeconds ?? 2 } : undefined }))} onSeconds={(seconds) => setBlock((current) => ({ ...current, background: current.background ? { ...current.background, continueAfterSeconds: seconds } : undefined }))} />
                    <button className="secondary-button compact" onClick={() => { requestExclusivePreview('window-change'); setLibraryTarget('background'); }}>Changer de musique</button>
                  </div>
                )}
              </div></details>}
              <p className="voice-arrangement-note">Clique sur la voix dans la trame pour régler son volume et ses effets.</p>
            </>
          )}

          {error && <div className="error-box">{error}</div>}
        </div>
        {block.type !== 'jingle' && <div className="modal-footer">
          {block.type !== 'transition' && <TimedPreviewButton previewId={`block-editor-${block.id}`} onStart={() => onPreview(block)} disabled={!canSave} />}
          <span className="footer-spacer" />
          <button className="ghost-button" disabled={voiceBusy || transcriptionBusy || Boolean(transitionLoadingId)} onClick={onClose}>Annuler</button>
          <button className="primary-button" disabled={!canSave || !block.title.trim() || voiceBusy || transcriptionBusy || Boolean(transitionLoadingId)} onClick={() => onSave(block)}>✓ {isNew ? 'Ajouter' : 'Enregistrer'}</button>
        </div>}
      </Modal>
      {libraryTarget && <AudioLibraryModal kind={libraryKind} onClose={() => setLibraryTarget(null)} onChoose={chooseLibraryPreset} />}
    </>
  );
}

type BrowserAudioSessionType = 'auto' | 'playback' | 'play-and-record';

function setBrowserAudioSession(type: BrowserAudioSessionType): void {
  try {
    const session = (navigator as Navigator & { audioSession?: { type: BrowserAudioSessionType } }).audioSession;
    if (session) session.type = type;
  } catch {
    // API expérimentale : ignorer sur les navigateurs qui ne la prennent pas en charge.
  }
}

function restoreBrowserAudioSession(): void {
  // WebKit recommande de quitter explicitement le mode capture après l’arrêt du micro.
  setBrowserAudioSession('playback');
  window.setTimeout(() => setBrowserAudioSession('auto'), 0);
}

function VoiceCueEditor({ asset, trimStart, trimEnd, cues, assets, onCues, onAddLibrary, onImport }: {
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
  const [loading, setLoading] = useState(false);
  const previewIdRef = useRef(`voice-cue-${crypto.randomUUID()}`);
  const duration = Math.max(0.2, trimEnd - trimStart || asset.duration);

  useEffect(() => {
    const url = URL.createObjectURL(asset.blob);
    setAudioUrl(url);
    setPosition(0);
    setPlaying(false);
    return () => URL.revokeObjectURL(url);
  }, [asset.blob]);

  const stopVoicePreview = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    const listener = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== previewIdRef.current) stopVoicePreview();
    };
    window.addEventListener(PREVIEW_STOP_EVENT, listener);
    return () => window.removeEventListener(PREVIEW_STOP_EVENT, listener);
  }, [stopVoicePreview]);

  const seek = (value: number) => {
    const safe = Math.min(duration, Math.max(0, value));
    setPosition(safe);
    const audio = audioRef.current;
    if (audio) audio.currentTime = trimStart + safe;
  };

  const toggle = async () => {
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
      <audio ref={audioRef} src={audioUrl || undefined} preload="auto" playsInline
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          const relative = Math.max(0, audio.currentTime - trimStart);
          if (relative >= duration) { audio.pause(); audio.currentTime = trimStart; setPosition(0); setPlaying(false); }
          else setPosition(relative);
        }}
        onWaiting={() => setLoading(true)} onCanPlay={() => setLoading(false)} onPause={() => setPlaying(false)} onPlay={() => { setLoading(false); setPlaying(true); }} />
      <div className="cue-player">
        <button className="cue-play-button" onClick={() => void toggle()} aria-busy={loading}>{loading ? <i className="preview-spinner" /> : playing ? 'Ⅱ' : '▶'}</button>
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
            const assetDuration = Math.max(0.05, cueAsset?.duration ?? cue.duration);
            const sourceStart = Math.min(Math.max(0, cue.sourceStart ?? 0), Math.max(0, assetDuration - 0.05));
            const legacyEnd = sourceStart + Math.max(0.05, cue.duration);
            const sourceEnd = Math.min(assetDuration, Math.max(sourceStart + 0.05, cue.sourceEnd ?? legacyEnd));
            const maxTimelineDuration = Math.max(0.05, duration - cue.at);
            const usedDuration = Math.min(sourceEnd - sourceStart, maxTimelineDuration);
            return (
              <div className="cue-row" key={cue.id}>
                <button className="cue-position" onClick={() => seek(cue.at)}>{cue.at.toFixed(1)} s</button>
                <div className="cue-name"><strong>{cueAsset?.name ?? `Bruitage ${index + 1}`}</strong><small>Extrait {sourceStart.toFixed(1)}–{sourceEnd.toFixed(1)} s · {usedDuration.toFixed(1)} s utilisé</small></div>
                <label><span>Niveau</span><select value={cue.level} onChange={(event) => updateCue(cue.id, { level: event.target.value as VoiceSoundCue['level'] })}><option value="low">Discret</option><option value="normal">Normal</option><option value="high">Fort</option></select></label>
                <details className="optional-settings cue-source-range"><summary>Plage du fichier</summary>{cueAsset && <AudioExcerpt asset={cueAsset} start={sourceStart} end={sourceEnd} onChange={(sourceStart, sourceEnd) => updateCue(cue.id, { sourceStart, sourceEnd, duration: Math.min(sourceEnd - sourceStart, maxTimelineDuration) })} />}</details>
                <button className="secondary-button compact" onClick={() => updateCue(cue.id, { at: Math.min(position, Math.max(0, duration - 0.2)) })}>Placer ici</button>
                <button className="mini-button danger" onClick={() => onCues(cues.filter((candidate) => candidate.id !== cue.id))} title="Supprimer ce bruitage">×</button>
              </div>
            );
          })}
        </div>
      )}
      <p className="cue-help">Choisis le début et la fin dans le fichier du bruitage. L’aperçu puis l’export utilisent exactement cette plage.</p>
    </div>
  );
}

function Recorder({ onReady, onBusyChange, maxSeconds, showHint = true }: { onReady: (blob: Blob, duration: number) => Promise<void> | void; onBusyChange?: (busy: boolean) => void; maxSeconds?: number; showHint?: boolean }) {
  const [state, setState] = useState<'idle' | 'countdown' | 'recording' | 'paused' | 'processing'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [countdown, setCountdown] = useState(true);
  const [count, setCount] = useState(3);
  const [error, setError] = useState('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  useEffect(() => { onBusyChange?.(state !== 'idle'); }, [state, onBusyChange]);

  const cleanup = () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    restoreBrowserAudioSession();
  };
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (recorderRef.current) { recorderRef.current.onstop = null; if (recorderRef.current.state !== 'inactive') recorderRef.current.stop(); }
      cleanup();
    };
  }, []);

  const runTimer = (started: number) => {
    timerRef.current = window.setInterval(() => {
      const value = (performance.now() - started) / 1000;
      elapsedRef.current = value;
      setSeconds(value);
      // Leave a small margin for the final encoded microphone frame.
      if (maxSeconds && value >= Math.max(0.15, maxSeconds - 0.1) && recorderRef.current?.state === 'recording') {
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
        recorderRef.current.stop();
      }
    }, maxSeconds ? 25 : 100);
  };

  const beginActualRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('L’enregistrement micro n’est pas pris en charge par ce navigateur.');
      // La catégorie playback est incompatible avec la capture sur iOS.
      setBrowserAudioSession('play-and-record');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (!mountedRef.current) { stream.getTracks().forEach((track) => track.stop()); restoreBrowserAudioSession(); return; }
      streamRef.current = stream;
      const candidates = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
      const mimeType = candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      elapsedRef.current = 0;
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        setState('processing');
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const duration = Math.max(0.2, elapsedRef.current);
        cleanup();
        try { await onReady(blob, duration); if (mountedRef.current) { setState('idle'); setSeconds(0); elapsedRef.current = 0; } } catch (reason) { if (mountedRef.current) { setError(reason instanceof Error ? reason.message : 'Impossible de conserver l’enregistrement.'); setState('idle'); } }
      };
      recorder.start(250);
      setSeconds(0);
      setState('recording');
      const started = performance.now();
      runTimer(started);
    } catch (reason) {
      cleanup();
      setState('idle');
      setError(reason instanceof Error ? reason.message : 'Le microphone est inaccessible.');
    }
  };

  const start = async () => {
    requestExclusivePreview('microphone-recording');
    setError('');
    if (countdown) {
      setState('countdown');
      for (let value = 3; value >= 1; value -= 1) {
        setCount(value);
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
        if (!mountedRef.current) return;
      }
    }
    await beginActualRecording();
  };

  const pause = () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (state === 'recording') { recorder.pause(); setState('paused'); if (timerRef.current !== null) window.clearInterval(timerRef.current); }
    else if (state === 'paused') {
      recorder.resume();
      setState('recording');
      const base = performance.now() - elapsedRef.current * 1000;
      runTimer(base);
    }
  };

  return (
    <div className={`recorder recorder-${state}`}>
      <div className="recorder-display">
        <div className="mic-animation"><i /><i /><i /><i /><i /></div>
        <div><strong>{state === 'idle' ? 'Prêt à enregistrer' : state === 'countdown' ? `Départ dans ${count}` : state === 'processing' ? 'Traitement…' : state === 'paused' ? 'En pause' : 'Enregistrement en cours'}</strong><span>{maxSeconds ? `${Math.max(0, maxSeconds - seconds).toFixed(1).replace('.', ',')} s restantes` : formatTime(seconds)}</span></div>
      </div>
      {maxSeconds && <progress className="jingle-record-progress" aria-label="Temps d’enregistrement utilisé" max={maxSeconds} value={Math.min(seconds, maxSeconds)} />}
      {showHint && state === 'idle' && <p className="recorder-hint">Autorise le microphone si le navigateur le demande. Parle, puis clique sur « Terminer » pour garder ta voix.{maxSeconds ? ' Le micro s’arrête automatiquement à la limite indiquée.' : ''}</p>}
      <div className="recorder-actions">
        {state === 'idle' && <button className="record-button" onClick={() => void start()}>● Enregistrer</button>}
        {(state === 'recording' || state === 'paused') && <button className="secondary-button compact" onClick={pause}>{state === 'recording' ? 'Ⅱ Pause' : '▶ Reprendre'}</button>}
        {(state === 'recording' || state === 'paused') && <button className="primary-button compact" onClick={() => recorderRef.current?.stop()}>■ Terminer</button>}
        {state === 'idle' && <label className="check-row"><input type="checkbox" checked={countdown} onChange={(event) => setCountdown(event.target.checked)} /> Compte à rebours de 3 secondes</label>}
      </div>
      {error && <div className="error-box small">{error}</div>}
    </div>
  );
}

function FilePicker({ label, onFile }: { label: string; onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return <><button className="secondary-button file-button" onClick={() => inputRef.current?.click()}>↑ {label}</button><input ref={inputRef} hidden type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm" onChange={(event) => { const file = event.target.files?.[0]; if (file) onFile(file); event.currentTarget.value = ''; }} /></>;
}

function TrimControl({ asset, start, end, onChange }: { asset: AudioAsset; start: number; end: number; onChange: (start: number, end: number) => void }) {
  return <AudioExcerpt asset={asset} start={start} end={end} onChange={onChange} />;
}


function AudioLibraryModal({ kind, initialSoundGroup = 'effect', onClose, onChoose }: { kind: LibraryKind; initialSoundGroup?: SoundGroup; onClose: () => void; onChoose: (preset: LibraryPreset) => Promise<void> }) {
  const dialogRef = useDialog(onClose);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Toutes');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [soundGroup, setSoundGroup] = useState(initialSoundGroup);

  useEffect(() => { requestExclusivePreview('audio-library-window'); }, []);

  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
  const searchWords = normalize(search).trim().split(/\s+/).filter(Boolean);
  const available = availableLibrarySounds(kind, soundGroup);
  const categories = kind === 'music' ? LIBRARY_CATEGORIES.music : SOUND_CATEGORIES[soundGroup];
  const results = available.filter((preset) => {
    if (category !== 'Toutes' && preset.category !== category && !preset.secondaryCategories?.includes(category)) return false;
    const text = normalize([preset.title, preset.description, preset.category, ...(preset.secondaryCategories ?? []), ...preset.tags].join(' '));
    return searchWords.every((word) => text.includes(word));
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
      <div ref={dialogRef} data-podcast-dialog tabIndex={-1} className="modal audio-library-modal" role="dialog" aria-modal="true" aria-label={kind === 'music' ? 'Bibliothèque musicale' : 'Bibliothèque de sons'}>
        <div className="modal-header"><div><h2>{kind === 'music' ? 'Bibliothèque musicale' : 'Bibliothèque de sons'}</h2><small>{available.length} {kind === 'music' ? 'musiques' : soundGroup === 'ambience' ? 'ambiances' : 'bruitages'} disponibles</small></div><button onClick={onClose} aria-label="Fermer">×</button></div>
        <div className="library-toolbar">
          {kind === 'sfx' && <div className="library-sound-tabs" role="tablist" aria-label="Type de son">{(['effect', 'ambience'] as const).map(group => <button key={group} role="tab" id={`sound-tab-${group}`} aria-selected={soundGroup === group} aria-controls="sound-library-results" tabIndex={soundGroup === group ? 0 : -1} disabled={Boolean(addingId)} onClick={() => { requestExclusivePreview('library-group'); setSoundGroup(group); setCategory('Toutes'); setError(''); }} onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); const next = group === 'effect' ? 'ambience' : 'effect'; requestExclusivePreview('library-group'); setSoundGroup(next); setCategory('Toutes'); document.getElementById(`sound-tab-${next}`)?.focus(); } }}><span>{group === 'effect' ? '🔔 Bruitages' : '🌿 Ambiances'}</span><small>{availableLibrarySounds('sfx', group).length}</small></button>)}</div>}
          <p className="library-instructions">{kind === 'music' ? 'Du jazz discret aux rythmes funk, électro, rock et du monde. Écoute un extrait, puis choisis le style qui accompagne ton récit.' : soundGroup === 'effect' ? 'Des sons courts pour une action, une réaction ou une transition.' : 'Un décor sonore à placer derrière les voix, sur la durée de ton choix.'}</p>
          <label className="library-search"><span aria-hidden="true">⌕</span><input autoFocus aria-label="Rechercher un son" placeholder={kind === 'music' ? 'Rechercher : funk, électro, sport, voyage, piano…' : soundGroup === 'ambience' ? 'Rechercher : médiéval, front, forêt…' : 'Rechercher : canon, cheval, cloche…'} value={search} onChange={(event) => setSearch(event.target.value)} />{search && <button aria-label="Effacer la recherche" onClick={() => setSearch('')}>×</button>}</label>
          <label className="library-category-select"><span>Catégorie</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="Toutes">Toutes les catégories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <div className="library-results-heading"><strong role="status">{results.length} résultat{results.length > 1 ? 's' : ''}</strong>{(category !== 'Toutes' || search) && <button onClick={() => { setCategory('Toutes'); setSearch(''); }}>Tout afficher</button>}</div>
        <div className="library-grid" id="sound-library-results" role={kind === 'sfx' ? 'tabpanel' : undefined} aria-labelledby={kind === 'sfx' ? `sound-tab-${soundGroup}` : undefined}>
          {results.map((preset) => (
            <article className="library-card" key={preset.id}>
              <div className="library-card-icon">{preset.icon}</div>
              <div className="library-card-copy"><span>{preset.category}</span><h3>{preset.title}</h3><p>{preset.description}</p><small>{kind === 'sfx' ? `${(preset.clipDuration ?? preset.duration).toLocaleString('fr', { maximumFractionDigits: 1 })} s` : formatTime(preset.clipDuration ?? preset.duration)}{preset.clipDuration && preset.clipDuration < preset.duration ? ' · extrait conseillé' : ''} · {preset.tags.slice(0, 3).join(' · ')}</small><a className="library-source-link" href={preset.sourcePage} target="_blank" rel="noreferrer" title={`${preset.author} · ${preset.license}`}>ⓘ Source</a></div>
              <div className="library-card-actions"><TimedPreviewButton previewId={`library-${preset.id}`} label={`Écouter · ${Math.ceil(getLibraryPreviewDuration(preset))} s`} onStart={(signal) => createLibraryPreviewSession(preset, signal)} disabled={Boolean(addingId)} compact /><button className="primary-button compact" disabled={Boolean(addingId)} aria-label={`Ajouter ${preset.title}`} onClick={() => void add(preset)}>{addingId === preset.id ? 'Ajout…' : '＋ Ajouter'}</button></div>
            </article>
          ))}
          {results.length === 0 && <div className="library-no-result"><span>🔎</span><strong>Aucun son trouvé</strong><p>Essaie un mot plus simple ou choisis une autre catégorie.</p><button className="secondary-button compact" onClick={() => { setSearch(''); setCategory('Toutes'); }}>Afficher tous les sons</button></div>}
        </div>
        <div className="library-footer-note"><a href="./audio-credits.html" target="_blank" rel="noreferrer">Sources et licences de tous les sons</a><span>Aperçus courts. Le son choisi est conservé dans ton projet après l’ajout.</span></div>
        {error && <div className="error-box library-error">{error}</div>}
      </div>
    </div>
  );
}

// Jingle fades and music sliders: 20260807-jingle-music-mixing-1
function musicVolumePercent(value: number | undefined, fallback: number): number {
  return Math.round(Math.min(100, Math.max(0, Number.isFinite(value) ? value as number : fallback)));
}

function standaloneMusicFallback(level: VolumeLevel): number {
  return level === 'low' ? 18 : level === 'high' ? 45 : 30;
}

function backgroundMusicFallback(level: 'very-low' | 'low' | 'present'): number {
  return level === 'very-low' ? 20 : level === 'present' ? 45 : 32;
}

function MusicVolumeSlider({ title, value, onChange }: { title: string; value: number; onChange: (value: number) => void }) {
  const safeValue = musicVolumePercent(value, 30);
  return (
    <label className="music-volume-slider">
      <span className="music-volume-heading"><strong>{title}</strong><output>{safeValue} %</output></span>
      <input aria-label={title} type="range" min="0" max="100" step="1" value={safeValue} onChange={(event) => onChange(Number(event.target.value))} />
      <small>0 % = muet · 100 % = maximum</small>
    </label>
  );
}

function ChoiceSetting({ title, value, options, onChange }: { title: string; value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return <div className="choice-setting"><h3>{title}</h3><div className="choice-buttons">{options.map(([key, label]) => <button key={key} className={value === key ? 'selected' : ''} onClick={() => onChange(key)}>{label}</button>)}</div></div>;
}

function GlobalPlayer({ status, elapsed, duration, seekable, activeTitle, onPlayPause, onStop, onSeek }: {
  status: 'stopped' | 'loading' | 'playing' | 'paused'; elapsed: number; duration: number; seekable: boolean; activeTitle?: string;
  onPlayPause: () => void; onStop: () => void; onSeek: (value: number) => void;
}) {
  return (
    <div className="global-player">
      <button className="player-main-button" aria-label={status === 'playing' ? 'Mettre le podcast en pause' : 'Écouter le podcast'} disabled={duration <= 0 || status === 'loading'} onClick={onPlayPause} aria-busy={status === 'loading'}>{status === 'loading' ? <i className="preview-spinner" /> : status === 'playing' ? 'Ⅱ' : '▶'}</button>
      <button className="player-stop-button" aria-label="Arrêter la lecture" disabled={status === 'stopped'} onClick={onStop}>■</button>
      <div className="player-track"><div className="player-title"><strong>{activeTitle || (duration > 0 ? 'Podcast complet' : 'Ajoute un premier élément')}</strong><span>{formatTime(elapsed)} / {formatTime(duration)}</span></div><input aria-label="Position de lecture" type="range" min="0" max={Math.max(0.01, duration)} step="0.05" value={Math.min(elapsed, duration)} disabled={duration <= 0 || !seekable} onChange={(event) => onSeek(Number(event.target.value))} /></div>
    </div>
  );
}

function ExportScreen({ project, duration, rendering, onBack, onListen, onExportWav, onExportProject }: {
  project: PodcastProject; duration: number; rendering: boolean; onBack: () => void; onListen: () => Promise<PreviewSession>; onExportWav: () => void; onExportProject: () => void;
}) {
  const warnings: string[] = [];
  if (!project.blocks.some((block) => (block.type === 'voice' && block.assetId) || block.jingle?.voiceAssetId || Object.values(block.jingle?.takes ?? {}).some((take) => take?.assetId))) warnings.push('Le podcast ne contient encore aucun enregistrement vocal.');
  const usedJingleBeds = JINGLE_CREDIT_BEDS.filter((bed) => project.blocks.some((block) => isGuidedJingle(block) && block.jingle.bedId === bed.id && getBlockDuration(block, project.assets) > 0));
  const usedEndings = JINGLE_CREDIT_ENDINGS.filter(ending => project.blocks.some(block => isGuidedJingle(block) && block.jingle.ending?.presetId === ending.id && getBlockDuration(block, project.assets) > 0));
  const usedJingleSounds = [...usedJingleBeds, ...usedEndings];
  const jingleCredits = usedJingleSounds.filter((bed, index) => usedJingleSounds.findIndex((other) => other.sourcePage === bed.sourcePage && other.licenseUrl === bed.licenseUrl && other.changes === bed.changes) === index);
  const libraryCredits = usedLibraryCredits(project);
  const creditsText = [...jingleCredits.map((bed) => `${bed.title} — ${bed.author}\nSource : ${bed.sourcePage}\nLicence ${bed.licenseName} : ${bed.licenseUrl}\n${bed.changes}\n`), ...libraryCredits.map(preset => `${preset.title}\n${preset.attribution}\n`)].join('\n');
  const unprepared = project.blocks.filter((block) => block.type === 'jingle' && getBlockDuration(block, project.assets) === 0);
  if (unprepared.length) warnings.push(`${unprepared.length} jingle${unprepared.length > 1 ? 's' : ''} non préparé${unprepared.length > 1 ? 's' : ''} : ils ne seront pas inclus dans le fichier audio.`);
  const empty = project.blocks.filter((block) => ['voice', 'music', 'sfx'].includes(block.type) && !block.assetId);
  if (empty.length) warnings.push(`${empty.length} élément${empty.length > 1 ? 's sont vides' : ' est vide'}.`);
  if (project.targetDuration && duration > project.targetDuration * 1.1) warnings.push(`Le podcast dépasse la durée cible de ${formatTime(project.targetDuration)}.`);
  if (project.targetDuration && duration < project.targetDuration * 0.7) warnings.push(`Le podcast est nettement plus court que la durée cible de ${formatTime(project.targetDuration)}.`);
  if (project.blocks.some((block) => block.type === 'music' && musicVolumePercent(block.musicVolume, standaloneMusicFallback(block.volume)) > 70)) warnings.push('Une musique réglée au-dessus de 70 % peut fatiguer l’écoute.');
  if (project.blocks.some((block) => block.type === 'voice' && block.background && musicVolumePercent(block.background.volume, backgroundMusicFallback(block.background.level)) > 60)) warnings.push('Une musique de fond réglée au-dessus de 60 % peut masquer certains mots. Écoute le résultat avant l’export.');
  return (
    <div className="export-screen">
      <header className="simple-header"><button className="ghost-button" onClick={onBack}>← Retour au montage</button><div className="brand"><span className="brand-mark">PF</span><span>{APP_NAME}</span></div><span /></header>
      <main className="export-content">
        <div className="export-icon">🎧</div><h1>Ton podcast est prêt à être vérifié</h1><h2>{project.title}</h2>
        {(jingleCredits.length > 0 || libraryCredits.length > 0) && <section className="export-panel"><h3>Crédits des musiques et des sons</h3><p>À joindre à la description si tu publies ton podcast.</p>{jingleCredits.map((bed) => <p key={bed.id}>{bed.title} — {bed.author} · <a href={bed.licenseUrl} target="_blank" rel="noreferrer">{bed.licenseName}</a></p>)}{libraryCredits.map(preset => <p key={preset.id}>{preset.title} — {preset.author} · <a href={preset.licenseUrl} target="_blank" rel="noreferrer">{preset.license}</a></p>)}<button className="secondary-button" onClick={() => downloadBlob(new Blob([creditsText], { type: 'text/plain;charset=utf-8' }), `${safeFilename(project.title)}-credits.txt`)}>Télécharger les crédits</button></section>}
        <div className="export-summary"><div><span>Durée totale</span><strong>{formatTime(duration)}</strong></div><div><span>Éléments</span><strong>{project.blocks.length}</strong></div><div><span>Sections</span><strong>{project.sections.length}</strong></div></div>
        <TimedPreviewButton previewId="export-full-podcast" onStart={onListen} disabled={duration <= 0} label="Écouter le podcast complet" />
        <section className="checks-panel"><h3>Vérifications</h3>{warnings.length === 0 ? <div className="check-success">✓ Aucun problème évident détecté.</div> : warnings.map((warning) => <div className="warning-row" key={warning}>⚠ {warning}</div>)}<p>Ces avertissements ne bloquent jamais l’export.</p></section>
        <section className="export-actions-panel"><div><h3>Exporter le fichier audio</h3><p>Format WAV, compatible avec la plupart des appareils et logiciels.</p></div><button className="primary-button large" disabled={rendering || duration <= 0} onClick={onExportWav}>{rendering ? 'Création…' : 'Télécharger le podcast (.wav)'}</button></section>
        <section className="export-actions-panel secondary"><div><h3>Garder ton projet pour le modifier</h3><p>Pour continuer sur un autre appareil ou reprendre ton travail plus tard. Ouvre ce fichier avec « Ouvrir une sauvegarde » sur l’accueil.</p></div><button className="secondary-button" disabled={rendering} onClick={onExportProject}>Télécharger la sauvegarde</button></section>
      </main>
    </div>
  );
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return <Modal title="Aide rapide" onClose={onClose}><div className="help-steps"><div><span>1</span><p><strong>Enregistre les voix.</strong><br />Dans chaque partie, ajoute tes voix puis les transitions ou pauses utiles.</p></div><div><span>2</span><p><strong>Place les musiques de fond.</strong><br />Ouvre les pistes de la partie. Ajoute la musique, choisis l’extrait puis déplace et découpe le son en écoutant le mixage avec les voix.</p></div><div><span>3</span><p><strong>Ajoute les ambiances et bruitages.</strong><br />Choisis une ambiance pour le décor, ou un bruitage court pour une action ou une transition. Place-les sur la trame en écoutant avec les voix.</p></div><div><span>4</span><p><strong>Écoute et télécharge.</strong><br />Vérifie la partie ou le podcast complet, puis télécharge le WAV et une sauvegarde .podfacile.</p></div></div><div className="important-note"><strong>Important</strong><p>Les projets enregistrés uniquement dans le navigateur peuvent disparaître si ses données sont effacées. Télécharge régulièrement une sauvegarde .podfacile.</p></div></Modal>;
}

function Modal({ title, onClose, wide = false, children }: { title: string; onClose: () => void; wide?: boolean; children: React.ReactNode }) {
  useEffect(() => { requestExclusivePreview('modal-window'); }, []);
  const dialogRef = useDialog(onClose);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div ref={dialogRef} data-podcast-dialog tabIndex={-1} className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}><div className="modal-header"><h2>{title}</h2><button onClick={onClose} aria-label="Fermer">×</button></div>{children}</div></div>;
}

export default App;

// Traitement vocal et minutage de jingle : 20260808-vocal-magic-boost-jingle-timing-1
