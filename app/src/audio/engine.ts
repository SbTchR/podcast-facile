import type { AudioAsset, FadeLevel, PodcastBlock, PodcastProject, VoiceEffect, VoiceEnhancement, VolumeLevel } from '../types';

import { resolveSectionLayers } from './sectionLayers';
import { connectStudioVoice, scheduleSignatureFx, applyStudioMusicEnvelope, studioVoiceGain } from './jingleStudio';
import { getGuidedJinglePlan, isGuidedJingle } from './jinglePlan';
import { scheduleGuidedJingle } from './guidedJingle';

type RenderContext = AudioContext | OfflineAudioContext;

const SAMPLE_RATE = 44100;
const DEFAULT_BACKGROUND_ROLL = 2;

function backgroundLeadIn(background: PodcastBlock['background']): number {
  if (!background?.startBefore) return 0;
  return Math.min(3, Math.max(1, background.startBeforeSeconds ?? DEFAULT_BACKGROUND_ROLL));
}

function backgroundTail(background: PodcastBlock['background']): number {
  if (!background?.continueAfter) return 0;
  return Math.min(3, Math.max(1, background.continueAfterSeconds ?? DEFAULT_BACKGROUND_ROLL));
}

export interface TimelineEntry {
  block: PodcastBlock;
  start: number;
  end: number;
  duration: number;
}

export interface PlaybackController {
  context: AudioContext;
  totalDuration: number;
  startOffset: number;
  getElapsed: () => number;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
}

export function formatTime(seconds: number): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const minutes = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function voicePlaybackRate(effect: VoiceEffect): number {
  return effect === 'deep' ? 0.9 : effect === 'high' ? 1.12 : effect === 'very-high' ? 1.24 : 1;
}

const DEFAULT_JINGLE_LEAD_SECONDS = 2;
const DEFAULT_JINGLE_TAIL_SECONDS = 3;
const JINGLE_CLOSING_WINDOW_SECONDS = 4;
const JINGLE_CLOSING_FADE_SECONDS = 2.2;

function jingleTiming(value: number | undefined, fallback: 1 | 2 | 3 | 4): 1 | 2 | 3 | 4 {
  return value === 1 || value === 2 || value === 3 || value === 4 ? value : fallback;
}

function jingleLeadIn(block: PodcastBlock): number {
  return jingleTiming(block.jingle?.musicLeadSeconds, DEFAULT_JINGLE_LEAD_SECONDS);
}

function jingleTail(block: PodcastBlock): number {
  return jingleTiming(block.jingle?.musicTailSeconds, DEFAULT_JINGLE_TAIL_SECONDS);
}

export function getBlockDuration(block: PodcastBlock, assets: AudioAsset[] = []): number {
  if (block.type === 'silence') return Math.max(0.1, block.duration);
  if (block.type === 'transition') return Math.min(4, Math.max(0.05, block.duration));
  if (block.type === 'jingle') {
    if (isGuidedJingle(block)) {
      const plan = getGuidedJinglePlan(block, assets);
      return plan.ready ? plan.total : 0;
    }
    const jingleAssetIds = [block.jingle?.musicAssetId, block.jingle?.voiceAssetId, block.jingle?.openingAssetId, block.jingle?.closingAssetId];
    if (!jingleAssetIds.some((id) => assets.some((asset) => asset.id === id))) return 0;
    const legacyFallback = block.jingle?.length === 'short' ? 6 : block.jingle?.length === 'long' ? 15 : Math.max(2.5, block.duration || 10);
    const voice = assets.find((asset) => asset.id === block.jingle?.voiceAssetId);
    if (!voice) return legacyFallback;
    const closing = assets.find((asset) => asset.id === block.jingle?.closingAssetId);
    const closingTail = Math.min(JINGLE_CLOSING_WINDOW_SECONDS, closing?.duration ?? 0);
    return jingleLeadIn(block) + voice.duration + Math.max(jingleTail(block), closingTail);
  }
  const sourceDuration = Math.max(0, block.trimEnd - block.trimStart || block.duration);
  const rate = block.type === 'voice' ? voicePlaybackRate(block.voiceEffect) : 1;
  const coreDuration = sourceDuration / rate;
  if (block.type === 'voice' && block.background) {
    return coreDuration + backgroundLeadIn(block.background) + backgroundTail(block.background);
  }
  return coreDuration;
}

function getBlocksInPlaybackOrder(project: PodcastProject): PodcastBlock[] {
  const knownSectionIds = new Set(project.sections.map((section) => section.id));
  const blocksBySection = new Map<string, PodcastBlock[]>();
  const orphanBlocks: PodcastBlock[] = [];

  for (const block of project.blocks) {
    if (!knownSectionIds.has(block.sectionId)) {
      orphanBlocks.push(block);
      continue;
    }
    const sectionBlocks = blocksBySection.get(block.sectionId) ?? [];
    sectionBlocks.push(block);
    blocksBySection.set(block.sectionId, sectionBlocks);
  }

  return project.sections.flatMap((section) => blocksBySection.get(section.id) ?? []).concat(orphanBlocks);
}

export function getTimeline(project: PodcastProject): TimelineEntry[] {
  let cursor = 0;
  return getBlocksInPlaybackOrder(project).map((block) => {
    const duration = getBlockDuration(block, project.assets);
    const entry = { block, start: cursor, end: cursor + duration, duration };
    cursor += duration;
    return entry;
  });
}

export function getProjectDuration(project: PodcastProject): number {
  return getTimeline(project).at(-1)?.end ?? 0;
}

export async function getAudioDuration(blob: Blob): Promise<number> {
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    return buffer.duration;
  } finally {
    await context.close();
  }
}

function volumeValue(level: VolumeLevel): number {
  return level === 'low' ? 0.62 : level === 'high' ? 1.22 : 0.92;
}

// SFX volume contrast: 20260722-sfx-volume-contrast-1
function soundEffectVolumeValue(level: VolumeLevel): number {
  return level === 'low' ? 0.08 : level === 'high' ? 1.05 : 0.28;
}

function voiceVolumeValue(level: VolumeLevel): number {
  return level === 'low' ? 0.62 : level === 'high' ? 1.38 : 0.92;
}

function musicVolumePercent(value: number | undefined, fallback: number): number {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value as number : fallback));
}

function standaloneMusicFallback(level: VolumeLevel): number {
  return level === 'low' ? 18 : level === 'high' ? 45 : 30;
}

function backgroundMusicFallback(level: 'very-low' | 'low' | 'present'): number {
  return level === 'very-low' ? 20 : level === 'present' ? 45 : 32;
}

function standaloneMusicValue(value: number | undefined, legacyLevel: VolumeLevel): number {
  const ratio = musicVolumePercent(value, standaloneMusicFallback(legacyLevel)) / 100;
  return 0.65 * ratio * ratio;
}

function backgroundMusicValue(value: number | undefined, legacyLevel: 'very-low' | 'low' | 'present'): number {
  const ratio = musicVolumePercent(value, backgroundMusicFallback(legacyLevel)) / 100;
  return 0.24 * ratio * ratio;
}

function voiceCueValue(level: 'low' | 'normal' | 'high'): number {
  return level === 'low' ? 0.14 : level === 'high' ? 1.0 : 0.48;
}

function transitionVolumeValue(level: VolumeLevel | undefined): number {
  return level === 'low' ? 0.11 : level === 'high' ? 0.7 : 0.34;
}

function fadeSeconds(level: FadeLevel): number {
  return level === 'short' ? 0.5 : level === 'normal' ? 1.5 : 0;
}

async function decodeAsset(context: RenderContext, asset: AudioAsset, cache: Map<string, AudioBuffer>): Promise<AudioBuffer> {
  const cached = cache.get(asset.id);
  if (cached) return cached;
  if (!(asset.blob instanceof Blob)) {
    throw new Error(`Le fichier audio « ${asset.name} » n’est plus lisible. Réimporte ce son dans le projet.`);
  }
  if (asset.blob.size === 0) {
    throw new Error(`L’enregistrement « ${asset.name} » a été perdu par une ancienne sauvegarde Safari. Réenregistre uniquement cet élément.`);
  }
  try {
    const original = await asset.blob.arrayBuffer();
    const copy = original.slice(0);
    const buffer = await context.decodeAudioData(copy);
    cache.set(asset.id, buffer);
    return buffer;
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'format non reconnu';
    throw new Error(`Impossible de décoder « ${asset.name} » : ${detail}`);
  }
}

function assetById(project: PodcastProject, id?: string): AudioAsset | undefined {
  return id ? project.assets.find((asset) => asset.id === id) : undefined;
}

function makeReverbImpulse(context: RenderContext, duration = 1.8, decay = 2.8): AudioBuffer {
  const frames = Math.max(1, Math.floor(context.sampleRate * duration));
  const impulse = context.createBuffer(2, frames, context.sampleRate);
  let seed = 1729;
  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let index = 0; index < frames; index += 1) {
      seed = (seed * 48271) % 2147483647;
      const noise = (seed / 2147483647) * 2 - 1;
      const envelope = Math.pow(1 - index / frames, decay);
      data[index] = noise * envelope * (channel === 0 ? 0.9 : 0.82);
    }
  }
  return impulse;
}

function connectVoiceEffect(context: RenderContext, source: AudioBufferSourceNode, effect: VoiceEffect, output: AudioNode): AudioNode {
  if (effect === 'phone') {
    const highpass = context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 450;
    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 3200;
    source.connect(highpass).connect(lowpass).connect(output);
    return output;
  }
  if (effect === 'echo') {
    const dry = context.createGain();
    const delay = context.createDelay(1);
    const feedback = context.createGain();
    const dreamFilter = context.createBiquadFilter();
    dry.gain.value = 0.84;
    delay.delayTime.value = 0.22;
    feedback.gain.value = 0.24;
    dreamFilter.type = 'lowpass';
    dreamFilter.frequency.value = 2800;
    source.connect(dry).connect(output);
    source.connect(delay).connect(feedback).connect(delay);
    delay.connect(dreamFilter).connect(output);
    return output;
  }
  if (effect === 'distant') {
    const highpass = context.createBiquadFilter();
    const lowpass = context.createBiquadFilter();
    const dry = context.createGain();
    const predelay = context.createDelay(0.3);
    const convolver = context.createConvolver();
    const wet = context.createGain();
    const early = context.createDelay(0.3);
    const earlyGain = context.createGain();
    highpass.type = 'highpass';
    highpass.frequency.value = 170;
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 3300;
    dry.gain.value = 0.32;
    predelay.delayTime.value = 0.045;
    convolver.buffer = makeReverbImpulse(context);
    wet.gain.value = 0.68;
    early.delayTime.value = 0.105;
    earlyGain.gain.value = 0.2;
    source.connect(highpass).connect(lowpass);
    lowpass.connect(dry).connect(output);
    lowpass.connect(predelay).connect(convolver).connect(wet).connect(output);
    lowpass.connect(early).connect(earlyGain).connect(output);
    return output;
  }
  if (effect === 'deep') source.playbackRate.value = 0.9;
  if (effect === 'high') source.playbackRate.value = 1.12;
  if (effect === 'very-high') source.playbackRate.value = 1.24;
  source.connect(output);
  return output;
}

function connectMagicBoost(context: RenderContext, input: AudioNode, destination: AudioNode): void {
  const rumbleFilter = context.createBiquadFilter();
  const warmth = context.createBiquadFilter();
  const presence = context.createBiquadFilter();
  const air = context.createBiquadFilter();
  const compressor = context.createDynamicsCompressor();
  const makeup = context.createGain();
  const limiter = context.createDynamicsCompressor();

  rumbleFilter.type = 'highpass';
  rumbleFilter.frequency.value = 75;
  rumbleFilter.Q.value = 0.7;
  warmth.type = 'lowshelf';
  warmth.frequency.value = 160;
  warmth.gain.value = 2.2;
  presence.type = 'peaking';
  presence.frequency.value = 2800;
  presence.Q.value = 0.9;
  presence.gain.value = 2.6;
  air.type = 'highshelf';
  air.frequency.value = 7200;
  air.gain.value = 1.1;
  compressor.threshold.value = -20;
  compressor.knee.value = 14;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.012;
  compressor.release.value = 0.18;
  makeup.gain.value = 1.22;
  limiter.threshold.value = -1.2;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.06;

  input.connect(rumbleFilter).connect(warmth).connect(presence).connect(air).connect(compressor).connect(makeup).connect(limiter).connect(destination);
}

function createMasterSafetyLimiter(context: RenderContext, destination: AudioNode): DynamicsCompressorNode {
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -1.2;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.06;
  limiter.connect(destination);
  return limiter;
}

function applyFades(gain: GainNode, start: number, duration: number, fadeIn: FadeLevel, fadeOut: FadeLevel, peak: number, elapsed = 0): void {
  const inSeconds = Math.min(fadeSeconds(fadeIn), duration / 2);
  const outSeconds = Math.min(fadeSeconds(fadeOut), duration / 2);
  gain.gain.cancelScheduledValues(start);
  if (inSeconds > 0 && elapsed < inSeconds) {
    const initial = peak * Math.max(0.001, elapsed / inSeconds);
    gain.gain.setValueAtTime(initial, start);
    gain.gain.linearRampToValueAtTime(peak, start + (inSeconds - elapsed));
  } else {
    gain.gain.setValueAtTime(peak, start);
  }
  if (outSeconds > 0) {
    const fadeStart = start + Math.max(0, duration - outSeconds);
    gain.gain.setValueAtTime(peak, fadeStart);
    gain.gain.linearRampToValueAtTime(0.0001, start + duration);
  }
}

async function scheduleAsset(
  context: RenderContext,
  destination: AudioNode,
  asset: AudioAsset,
  cache: Map<string, AudioBuffer>,
  start: number,
  offset: number,
  duration: number,
  volume: number,
  fadeIn: FadeLevel,
  fadeOut: FadeLevel,
  effect: VoiceEffect = 'none',
  enhancement: VoiceEnhancement = 'natural',
  loop = false,
): Promise<void> {
  if (duration <= 0) return;
  const buffer = await decodeAsset(context, asset, cache);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = loop;
  const gain = context.createGain();
  applyFades(gain, start, duration, fadeIn, fadeOut, volume, offset);
  connectVoiceEffect(context, source, effect, gain);
  if (enhancement === 'magic-boost') connectMagicBoost(context, gain, destination);
  else gain.connect(destination);
  const safeOffset = loop ? offset % buffer.duration : Math.min(offset, Math.max(0, buffer.duration - 0.01));
  const playbackRate = voicePlaybackRate(effect);
  source.start(start, safeOffset, loop ? undefined : Math.min(duration * playbackRate, buffer.duration - safeOffset));
  source.stop(start + duration + 0.03);
}



async function scheduleVoiceBlock(
  context: RenderContext,
  destination: AudioNode,
  block: PodcastBlock,
  project: PodcastProject,
  cache: Map<string, AudioBuffer>,
  start: number,
  localOffset: number,
): Promise<void> {
  const voiceAsset = assetById(project, block.assetId);
  if (!voiceAsset) return;
  const coreSourceDuration = Math.max(0, block.trimEnd - block.trimStart || block.duration);
  const playbackRate = voicePlaybackRate(block.voiceEffect);
  const coreTimelineDuration = coreSourceDuration / playbackRate;
  const pre = backgroundLeadIn(block.background);
  const post = backgroundTail(block.background);
  const total = pre + coreTimelineDuration + post;
  const remainingTotal = total - localOffset;
  if (remainingTotal <= 0) return;

  if (block.background) {
    const background = assetById(project, block.background.assetId);
    if (background) {
      const bgGain = context.createGain();
      bgGain.connect(destination);
      const level = backgroundMusicValue(block.background.volume, block.background.level);
      const bgStart = start;
      const voiceStartRelative = Math.max(0, pre - localOffset);
      const voiceRemaining = Math.max(0, coreTimelineDuration - Math.max(0, localOffset - pre));
      bgGain.gain.setValueAtTime(block.voiceCutStart ? level : 0.0001, bgStart);
      if (!block.voiceCutStart) bgGain.gain.linearRampToValueAtTime(level * 1.35, bgStart + Math.min(0.5, remainingTotal / 4));
      if (voiceRemaining > 0) {
        bgGain.gain.linearRampToValueAtTime(level, bgStart + voiceStartRelative + 0.08);
        bgGain.gain.setValueAtTime(level, bgStart + voiceStartRelative + voiceRemaining);
        if (post > 0) bgGain.gain.linearRampToValueAtTime(level * 1.25, Math.min(bgStart + remainingTotal, bgStart + voiceStartRelative + voiceRemaining + 0.18));
      }
      if (!block.voiceCutEnd) bgGain.gain.linearRampToValueAtTime(0.0001, bgStart + remainingTotal);
      const bgBuffer = await decodeAsset(context, background, cache);
      const bgSource = context.createBufferSource();
      bgSource.buffer = bgBuffer;
      bgSource.loop = true;
      bgSource.connect(bgGain);
      bgSource.start(bgStart, ((block.background.sourceOffsetSeconds ?? 0) + localOffset) % bgBuffer.duration);
      bgSource.stop(bgStart + remainingTotal + 0.03);
    }
  }

  const voiceTimelineStart = pre;
  const consumedVoiceTimeline = Math.max(0, localOffset - voiceTimelineStart);
  if (consumedVoiceTimeline < coreTimelineDuration) {
    const consumedVoiceSource = Math.min(coreSourceDuration, consumedVoiceTimeline * playbackRate);
    const delay = Math.max(0, voiceTimelineStart - localOffset);
    const voiceDuration = (coreSourceDuration - consumedVoiceSource) / playbackRate;
    await scheduleAsset(
      context,
      destination,
      voiceAsset,
      cache,
      start + delay,
      block.trimStart + consumedVoiceSource,
      voiceDuration,
      voiceVolumeValue(block.volume),
      block.fadeIn === 'none' && !block.voiceCutStart ? 'short' : block.fadeIn,
      block.fadeOut === 'none' && !block.voiceCutEnd ? 'short' : block.fadeOut,
      block.voiceEffect,
      block.voiceEnhancement ?? 'magic-boost',
    );
  }

  for (const cue of block.voiceCues ?? []) {
    const cueAsset = assetById(project, cue.assetId);
    if (!cueAsset) continue;
    const cueAtSource = Math.min(Math.max(0, cue.at), coreSourceDuration);
    const cueAtTimeline = cueAtSource / playbackRate;
    const sourceStart = Math.min(Math.max(0, cue.sourceStart ?? 0), Math.max(0, cueAsset.duration - 0.05));
    const legacyEnd = sourceStart + Math.max(0.05, cue.duration);
    const sourceEnd = Math.min(cueAsset.duration, Math.max(sourceStart + 0.05, cue.sourceEnd ?? legacyEnd));
    const selectedDuration = sourceEnd - sourceStart;
    const cueDuration = Math.min(selectedDuration, Math.max(0, coreTimelineDuration - cueAtTimeline));
    if (cueDuration <= 0) continue;
    const cueTimelineStart = pre + cueAtTimeline;
    if (localOffset >= cueTimelineStart + cueDuration) continue;
    const consumedCue = Math.max(0, localOffset - cueTimelineStart);
    const cueDelay = Math.max(0, cueTimelineStart - localOffset);
    await scheduleAsset(
      context,
      destination,
      cueAsset,
      cache,
      start + cueDelay,
      sourceStart + consumedCue,
      cueDuration - consumedCue,
      voiceCueValue(cue.level),
      'none',
      cue.cutEnd ? 'none' : 'short',
    );
  }
}

type JingleStyle = NonNullable<PodcastBlock['jingle']>['style'];

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
};

async function scheduleJingle(
  context: RenderContext,
  destination: AudioNode,
  block: PodcastBlock,
  project: PodcastProject,
  cache: Map<string, AudioBuffer>,
  start: number,
  localOffset: number,
): Promise<void> {
  if (isGuidedJingle(block)) {
    scheduleGuidedJingle(context, destination, block, project.assets, cache, start, localOffset);
    return;
  }
  const total = getBlockDuration(block, project.assets);
  const remaining = total - localOffset;
  if (remaining <= 0) return;
  const style = block.jingle?.style ?? 'modern-radio';
  const profile = JINGLE_STYLE_PROFILES[style];
  const leadIn = jingleLeadIn(block);
  const tail = jingleTail(block);
  const music = assetById(project, block.jingle?.musicAssetId);
  const voice = assetById(project, block.jingle?.voiceAssetId);
  const opening = assetById(project, block.jingle?.openingAssetId);
  const closing = assetById(project, block.jingle?.closingAssetId);

  if (music) {
    const level = backgroundMusicValue(block.jingle?.musicVolume, block.jingle?.musicLevel ?? 'low');
    const gain = context.createGain();
    gain.connect(destination);
    const voiceStartNow = Math.max(0, leadIn - localOffset);
    const voiceLength = voice ? Math.min(voice.duration, Math.max(0, total - leadIn - tail)) : 0;
    if (block.jingle?.production === 'studio-v2') {
      applyStudioMusicEnvelope(gain, start, total, localOffset, leadIn, voiceLength, level, profile);
    } else {
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(level * profile.intro, start + Math.min(style === 'mysterious' ? 0.8 : 0.35, remaining / 4));
    if (voiceLength > 0) {
      gain.gain.linearRampToValueAtTime(level * profile.duck, start + voiceStartNow + 0.1);
      gain.gain.setValueAtTime(level * profile.duck, start + voiceStartNow + voiceLength);
      gain.gain.linearRampToValueAtTime(level * profile.outro, Math.min(start + remaining, start + voiceStartNow + voiceLength + 0.25));
    }
    gain.gain.linearRampToValueAtTime(0.0001, start + remaining);
    }
    const buffer = await decodeAsset(context, music, cache);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    source.start(start, localOffset % buffer.duration);
    source.stop(start + remaining + 0.03);
  }

  if (opening && localOffset < (block.jingle?.production === 'studio-v2' ? Math.min(opening.duration, 1.5) : opening.duration)) {
    const openingWindow = block.jingle?.production === 'studio-v2' ? Math.min(opening.duration, 1.5) : opening.duration;
    await scheduleAsset(context, destination, opening, cache, start, localOffset, Math.min(openingWindow - localOffset, remaining), profile.opening, 'short', 'short');
  }
  if (voice) {
    const consumed = Math.max(0, localOffset - leadIn);
    const delay = Math.max(0, leadIn - localOffset);
    const voiceDuration = Math.min(voice.duration - consumed, total - leadIn - tail);
    if (voiceDuration > 0) {
      if (block.jingle?.production === 'studio-v2') {
        const bus = context.createGain();
        if (block.jingle.voiceEnhancement === 'natural') bus.connect(destination);
        else connectStudioVoice(context, bus, destination, style);
        const buffer = await decodeAsset(context, voice, cache);
        const normalization = block.jingle.voiceEnhancement === 'natural' ? 1 : studioVoiceGain(buffer);
        const peak = profile.voice * normalization;
        const source = context.createBufferSource(); source.buffer = buffer;
        const gain = context.createGain(); source.connect(gain).connect(bus);
        const at = start + delay;
        const edgeFade = Math.min(0.02, voiceDuration / 4);
        gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(peak, at + edgeFade);
        gain.gain.setValueAtTime(peak, at + voiceDuration - edgeFade); gain.gain.linearRampToValueAtTime(0, at + voiceDuration);
        source.start(at, consumed, voiceDuration);
      } else {
        await scheduleAsset(context, destination, voice, cache, start + delay, consumed, voiceDuration, profile.voice, 'short', 'short', profile.voiceEffect, block.jingle?.voiceEnhancement ?? 'magic-boost');
      }
    }
  }
  if (block.jingle?.production === 'studio-v2' && block.jingle.signatureFx !== false && !closing) {
    scheduleSignatureFx(context, destination, style, leadIn + (voice?.duration ?? 0), total, start, localOffset);
  }
  if (closing) {
    const closingDuration = Math.min(JINGLE_CLOSING_WINDOW_SECONDS, closing.duration, total);
    const closingStart = total - closingDuration;
    if (localOffset < total && localOffset < closingStart + closingDuration) {
      const delay = Math.max(0, closingStart - localOffset);
      const timelineAtPlayback = localOffset + delay;
      const consumed = Math.max(0, timelineAtPlayback - closingStart);
      const duration = Math.min(closingDuration - consumed, remaining - delay);
      if (duration > 0) {
        const buffer = await decodeAsset(context, closing, cache);
        const source = context.createBufferSource();
        const gain = context.createGain();
        const playbackStart = start + delay;
        const fadeDuration = Math.min(JINGLE_CLOSING_FADE_SECONDS, closingDuration);
        const fadeStart = total - fadeDuration;
        const fadeProgress = timelineAtPlayback <= fadeStart ? 0 : Math.min(1, (timelineAtPlayback - fadeStart) / fadeDuration);
        const initialGain = Math.max(0.0001, profile.closing * (1 - fadeProgress));
        const playbackEndTimeline = timelineAtPlayback + duration;
        const endProgress = playbackEndTimeline <= fadeStart ? 0 : Math.min(1, (playbackEndTimeline - fadeStart) / fadeDuration);
        const endGain = Math.max(0.0001, profile.closing * (1 - endProgress));
        source.buffer = buffer;
        source.connect(gain).connect(destination);
        gain.gain.setValueAtTime(initialGain, playbackStart);
        if (timelineAtPlayback < fadeStart && playbackEndTimeline > fadeStart) {
          gain.gain.setValueAtTime(profile.closing, playbackStart + fadeStart - timelineAtPlayback);
        }
        gain.gain.linearRampToValueAtTime(endGain, playbackStart + duration);
        source.start(playbackStart, consumed, duration);
        source.stop(playbackStart + duration + 0.03);
      }
    }
  }
}

async function scheduleBlock(
  context: RenderContext,
  destination: AudioNode,
  block: PodcastBlock,
  project: PodcastProject,
  cache: Map<string, AudioBuffer>,
  start: number,
  localOffset: number,
): Promise<void> {
  const total = getBlockDuration(block, project.assets);
  if (localOffset >= total) return;
  if (block.type === 'silence') return;
  if (block.type === 'transition') {
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
  }
  if (block.type === 'jingle') {
    await scheduleJingle(context, destination, block, project, cache, start, localOffset);
    return;
  }
  if (block.type === 'voice') {
    await scheduleVoiceBlock(context, destination, block, project, cache, start, localOffset);
    return;
  }
  const asset = assetById(project, block.assetId);
  if (!asset) return;
  const sourceOffset = block.trimStart + localOffset;
  const duration = total - localOffset;
  await scheduleAsset(
    context,
    destination,
    asset,
    cache,
    start,
    sourceOffset,
    duration,
    block.type === 'sfx' ? soundEffectVolumeValue(block.volume) : standaloneMusicValue(block.musicVolume, block.volume),
    block.fadeIn,
    block.fadeOut,
  );
}

function referencedAssetIds(project: PodcastProject, offset = 0): Set<string> {
  const ids = new Set<string>();
  const blocks = getTimeline(project).filter((entry) => entry.end > offset).map((entry) => entry.block);
  for (const block of blocks) {
    if (isGuidedJingle(block)) {
      if (block.jingle.musicAssetId) ids.add(block.jingle.musicAssetId);
      for (const take of Object.values(block.jingle.takes ?? {})) if (take) ids.add(take.assetId);
      if (block.jingle.ending) ids.add(block.jingle.ending.assetId);
      continue;
    }
    if (block.assetId) ids.add(block.assetId);
    if (block.background?.assetId) ids.add(block.background.assetId);
    for (const cue of block.voiceCues ?? []) ids.add(cue.assetId);
    if (block.jingle?.musicAssetId) ids.add(block.jingle.musicAssetId);
    if (block.jingle?.voiceAssetId) ids.add(block.jingle.voiceAssetId);
    if (block.jingle?.openingAssetId) ids.add(block.jingle.openingAssetId);
    if (block.jingle?.closingAssetId) ids.add(block.jingle.closingAssetId);
  }
  for (const item of resolveSectionLayers(project, getTimeline(project))) {
    if (item.end > offset) ids.add(item.layer.assetId);
  }
  return ids;
}

async function decodeProjectAssets(context: RenderContext, project: PodcastProject, offset = 0): Promise<Map<string, AudioBuffer>> {
  const cache = new Map<string, AudioBuffer>();
  const ids = referencedAssetIds(project, offset);
  const assets = project.assets.filter((asset) => ids.has(asset.id));
  await Promise.all(assets.map((asset) => decodeAsset(context, asset, cache)));
  return cache;
}

async function scheduleProject(
  context: RenderContext,
  destination: AudioNode,
  project: PodcastProject,
  offset: number,
  baseStart: number,
  cache: Map<string, AudioBuffer>,
): Promise<void> {
  const timeline = getTimeline(project);
  let scheduleCursor = baseStart;
  for (const entry of timeline) {
    if (offset >= entry.end) continue;
    const localOffset = Math.max(0, offset - entry.start);
    await scheduleBlock(context, destination, entry.block, project, cache, scheduleCursor, localOffset);
    scheduleCursor += entry.duration - localOffset;
  }
  for (const item of resolveSectionLayers(project, timeline)) {
    if (item.end <= offset) continue;
    const asset = assetById(project, item.layer.assetId);
    if (!asset) continue;
    const buffer = await decodeAsset(context, asset, cache);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = item.layer.repeat;
    source.loopStart = item.sourceStart;
    source.loopEnd = item.sourceEnd;
    const consumed = Math.max(0, offset - item.start);
    const playbackStart = baseStart + Math.max(0, item.start - offset);
    const remaining = item.end - Math.max(offset, item.start);
    const fullDuration = item.end - item.start;
    const inSeconds = Math.min(fadeSeconds(item.layer.fadeIn), fullDuration / 2);
    const outSeconds = Math.min(fadeSeconds(item.layer.fadeOut), fullDuration / 2);
    const ratio = Math.max(0, Math.min(100, item.layer.volume)) / 100;
    const peak = (item.layer.kind === 'music' ? 0.24 : 1) * ratio * ratio;
    const valueAt = (at: number) => peak * Math.min(inSeconds ? Math.min(1, at / inSeconds) : 1, outSeconds ? Math.min(1, (fullDuration - at) / outSeconds) : 1);
    const gain = context.createGain();
    source.connect(gain).connect(destination);
    gain.gain.setValueAtTime(valueAt(consumed), playbackStart);
    if (consumed < inSeconds) gain.gain.linearRampToValueAtTime(peak, playbackStart + inSeconds - consumed);
    if (outSeconds && consumed < fullDuration - outSeconds) gain.gain.setValueAtTime(peak, playbackStart + fullDuration - outSeconds - consumed);
    gain.gain.linearRampToValueAtTime(outSeconds ? 0 : peak, playbackStart + remaining);
    const sourceOffset = item.sourceStart + (item.layer.repeat ? consumed % (item.sourceEnd - item.sourceStart) : consumed);
    source.start(playbackStart, sourceOffset, item.layer.repeat ? undefined : remaining);
    source.stop(playbackStart + remaining);
  }
}

export async function playProject(project: PodcastProject, offset = 0): Promise<PlaybackController> {
  const context = new AudioContext();
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  try {
    const audioSession = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (audioSession) audioSession.type = 'playback';
  } catch {
    // L’API Audio Session n’existe pas sur toutes les versions de Safari.
  }

  let mediaElement: HTMLAudioElement | null = null;
  let mediaStream: MediaStream | null = null;
  let outputBus: AudioNode;

  if (isIOS && typeof context.createMediaStreamDestination === 'function') {
    const mediaDestination = context.createMediaStreamDestination();
    outputBus = createMasterSafetyLimiter(context, mediaDestination);
    mediaStream = mediaDestination.stream;

    mediaElement = document.createElement('audio');
    mediaElement.autoplay = true;
    mediaElement.muted = false;
    mediaElement.volume = 1;
    mediaElement.setAttribute('playsinline', '');
    mediaElement.setAttribute('webkit-playsinline', '');
    mediaElement.setAttribute('aria-hidden', 'true');
    mediaElement.style.position = 'fixed';
    mediaElement.style.width = '1px';
    mediaElement.style.height = '1px';
    mediaElement.style.opacity = '0';
    mediaElement.style.pointerEvents = 'none';
    mediaElement.srcObject = mediaStream;
    document.body.appendChild(mediaElement);

    // Cette première tentative a lieu directement pendant le clic utilisateur.
    void mediaElement.play().catch(() => undefined);
  } else {
    outputBus = createMasterSafetyLimiter(context, context.destination);
  }

  // Déverrouillage Web Audio immédiat, lui aussi pendant le clic.
  const unlockPromise = context.state === 'suspended'
    ? context.resume().then(() => undefined)
    : Promise.resolve();

  const cleanupMedia = () => {
    if (mediaElement) {
      mediaElement.pause();
      mediaElement.srcObject = null;
      mediaElement.remove();
      mediaElement = null;
    }
    mediaStream?.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  };

  try {
    const cache = await decodeProjectAssets(context, project, offset);
    await unlockPromise;
    if (context.state === 'suspended') await context.resume();

    const startAt = context.currentTime + 0.25;
    await scheduleProject(context, outputBus, project, offset, startAt, cache);

    if (mediaElement) {
      try {
        await mediaElement.play();
      } catch {
        throw new Error('Safari a bloqué la sortie audio. Vérifie le volume multimédia puis touche de nouveau Lecture.');
      }
    }

    const totalDuration = getProjectDuration(project);
    return {
      context,
      totalDuration,
      startOffset: offset,
      getElapsed: () => Math.min(totalDuration, offset + Math.max(0, context.currentTime - startAt)),
      pause: async () => {
        mediaElement?.pause();
        await context.suspend();
      },
      resume: async () => {
        await context.resume();
        if (mediaElement) await mediaElement.play();
      },
      stop: async () => {
        cleanupMedia();
        if (context.state !== 'closed') await context.close();
      },
    };
  } catch (error) {
    cleanupMedia();
    if (context.state !== 'closed') await context.close().catch(() => undefined);
    throw error;
  }
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const length = buffer.length * channels * 2 + 44;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);
  let offset = 0;
  const writeString = (value: string) => {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
    offset += value.length;
  };
  writeString('RIFF');
  view.setUint32(offset, length - 8, true); offset += 4;
  writeString('WAVE');
  writeString('fmt ');
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, channels, true); offset += 2;
  view.setUint32(offset, buffer.sampleRate, true); offset += 4;
  view.setUint32(offset, buffer.sampleRate * channels * 2, true); offset += 4;
  view.setUint16(offset, channels * 2, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;
  writeString('data');
  view.setUint32(offset, length - offset - 4, true); offset += 4;

  const channelData = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
  for (let index = 0; index < buffer.length; index += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][index]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export async function renderProjectToWav(project: PodcastProject): Promise<Blob> {
  const duration = Math.max(0.1, getProjectDuration(project));
  const context = new OfflineAudioContext(2, Math.ceil(duration * SAMPLE_RATE), SAMPLE_RATE);
  const outputBus = createMasterSafetyLimiter(context, context.destination);
  const cache = await decodeProjectAssets(context, project);
  await scheduleProject(context, outputBus, project, 0, 0, cache);
  const rendered = await context.startRendering();
  return audioBufferToWav(rendered);
}

// Traitement vocal et minutage de jingle : 20260808-vocal-magic-boost-jingle-timing-1
