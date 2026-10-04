export type Screen = 'home' | 'setup' | 'editor' | 'export';
export type BlockType = 'voice' | 'music' | 'sfx' | 'silence' | 'jingle' | 'transition';
export type VolumeLevel = 'low' | 'normal' | 'high';
export type FadeLevel = 'none' | 'short' | 'normal';
export type VoiceEffect = 'none' | 'phone' | 'echo' | 'distant' | 'deep' | 'high' | 'very-high';
export type VoiceEnhancement = 'natural' | 'magic-boost';
export type TransitionPreset = 'fade' | 'whoosh' | 'bell' | 'radio' | 'page' | 'percussion' | 'rise' | 'mystery' | 'impact' | 'sparkle' | 'heartbeat' | 'rewind' | 'drop' | 'question' | 'failure' | 'surprise' | 'portal' | 'cinematic';
export type VoiceCueLevel = 'low' | 'normal' | 'high';

export interface VoiceSoundCue {
  id: string;
  assetId: string;
  at: number;
  duration: number;
  sourceStart?: number;
  sourceEnd?: number;
  level: VoiceCueLevel;
  cutEnd?: boolean;
}

export interface AudioAsset {
  id: string;
  name: string;
  mimeType: string;
  duration: number;
  blob: Blob;
  source?: 'recording' | 'import' | 'library';
  libraryId?: string;
}

export type JingleVoicePart = 'title' | 'title-echo' | 'title-alt' | 'title-alt-echo' | 'intro' | 'intro-echo' | 'hook';
export interface JingleVoiceEffects {
  reverb: number;
  enhancement: number;
  phone: number;
}

export interface JingleTake {
  assetId: string;
  sourceStart: number;
  sourceEnd: number;
}

// Jingle fades and music sliders: 20260807-jingle-music-mixing-1
export interface BackgroundAudio {
  assetId: string;
  level: 'very-low' | 'low' | 'present';
  volume?: number;
  startBefore: boolean;
  startBeforeSeconds?: 1 | 2 | 3;
  continueAfter: boolean;
  continueAfterSeconds?: 1 | 2 | 3;
  sourceOffsetSeconds?: number;
}

export interface PodcastBlock {
  id: string;
  sectionId: string;
  type: BlockType;
  title: string;
  assetId?: string;
  duration: number;
  trimStart: number;
  trimEnd: number;
  volume: VolumeLevel;
  musicVolume?: number;
  fadeIn: FadeLevel;
  fadeOut: FadeLevel;
  voiceEffect: VoiceEffect;
  voiceEnhancement?: VoiceEnhancement;
  /** Inner edit boundaries use direct joins instead of the legacy voice fades. */
  voiceCutStart?: boolean;
  voiceCutEnd?: boolean;
  script?: string;
  background?: BackgroundAudio;
  voiceCues?: VoiceSoundCue[];
  transitionPreset?: TransitionPreset;
  transitionVolume?: VolumeLevel;
  jingle?: {
    musicAssetId?: string;
    voiceAssetId?: string;
    openingAssetId?: string;
    closingAssetId?: string;
    style: 'dynamic' | 'adventure' | 'mysterious' | 'serious' | 'historical' | 'modern-radio';
    length?: 'short' | 'normal' | 'long';
    musicLevel: 'very-low' | 'low' | 'present';
    musicVolume?: number;
    voiceEnhancement?: VoiceEnhancement;
    musicLeadSeconds?: 1 | 2 | 3 | 4;
    musicTailSeconds?: 1 | 2 | 3 | 4;
    production?: 'studio-v2' | 'guided-v3' | 'guided-v4' | 'guided-v5' | 'guided-v6' | 'guided-v7' | 'guided-v8';
    signatureFx?: boolean;
    bedId?: string;
    takes?: Partial<Record<JingleVoicePart, JingleTake>>;
    scripts?: Partial<Record<JingleVoicePart, string>>;
    effects?: Partial<Record<JingleVoicePart, JingleVoiceEffects>>;
    introVoices?: 'voice-1' | 'duo';
    hookVoice?: 'voice-1' | 'voice-2';
    ending?: { assetId: string; presetId: string; volume: number };
  };
}

export type SectionGuideType = 'intro-jingle' | 'introduction' | 'part' | 'intermediate-jingle' | 'conclusion' | 'final-jingle';

export interface AudioAnchor {
  edge: 'start' | 'end';
  blockId?: string;
  seconds?: number;
}

/** A sound on top of the narrative. Anchors follow recordings when reordered. */
export interface SectionAudioLayer {
  id: string;
  kind: 'music' | 'sfx';
  soundGroup?: 'effect' | 'ambience';
  title: string;
  assetId: string;
  sourceStart: number;
  sourceEnd: number;
  start: AudioAnchor;
  end?: AudioAnchor;
  volume: number;
  /** Music level during explicit pauses; undefined keeps a constant level. */
  pauseVolume?: number;
  fadeIn: FadeLevel;
  fadeOut: FadeLevel;
  repeat: boolean;
  pauseBlockId?: string;
  afterBlockId?: string;
}

export interface PodcastSection {
  id: string;
  title: string;
  collapsed: boolean;
  kind?: 'standard' | 'jingle';
  guideType?: SectionGuideType;
  audioLayers?: SectionAudioLayer[];
}

export interface PodcastProject {
  id: string;
  title: string;
  author: string;
  targetDuration?: number;
  templateId: string;
  sections: PodcastSection[];
  blocks: PodcastBlock[];
  assets: AudioAsset[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  id: string;
  title: string;
  author: string;
  updatedAt: string;
  duration: number;
}

export interface TemplateDefinition {
  id: string;
  title: string;
  description: string;
  sections: string[];
}

// Traitement vocal et minutage de jingle : 20260808-vocal-magic-boost-jingle-timing-1
