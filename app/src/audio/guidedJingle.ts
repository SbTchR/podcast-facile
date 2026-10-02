import type { AudioAsset, JingleVoicePart, PodcastBlock } from '../types';
import { getGuidedJinglePlan, getGuidedJingleEndingPlan, JINGLE_PARTS } from './jinglePlan';
import { STUDIO_STYLES, studioVoiceGain } from './jingleStudio';

type Context = AudioContext | OfflineAudioContext;
type Style = NonNullable<PodcastBlock['jingle']>['style'];

function roomImpulse(context: Context, seconds: number): AudioBuffer {
  const buffer = context.createBuffer(2, Math.ceil(context.sampleRate * seconds), context.sampleRate);
  let seed = 8821;
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) { seed = seed * 48271 % 2147483647; data[i] = (seed / 2147483647 * 2 - 1) * Math.pow(1 - i / data.length, 4); }
  }
  return buffer;
}

function connectPhrase(context: Context, input: AudioNode, output: AudioNode, style: Style, part: JingleVoicePart): void {
  const profile = STUDIO_STYLES[style];
  const title = part === 'title' || part === 'title-alt';
  const highpass = context.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = title ? profile.highpass : 100;
  const lowpass = context.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = title ? Math.max(7000, profile.lowpass) : 15000;
  const warmth = context.createBiquadFilter(); warmth.type = 'lowshelf'; warmth.frequency.value = 220; warmth.gain.value = title ? profile.warmth : 1;
  const presence = context.createBiquadFilter(); presence.type = 'peaking'; presence.frequency.value = 3000; presence.Q.value = 0.8; presence.gain.value = title ? Math.min(3.5, profile.presence) : 2;
  const compressor = context.createDynamicsCompressor(); compressor.threshold.value = -20; compressor.knee.value = 10; compressor.ratio.value = 3; compressor.attack.value = 0.002; compressor.release.value = 0.14;
  input.connect(highpass).connect(lowpass).connect(warmth).connect(presence).connect(compressor);
  const dry = context.createGain(); dry.gain.value = 1.3; compressor.connect(dry).connect(output);
  const convolver = context.createConvolver(); convolver.buffer = roomImpulse(context, title ? .48 : .38);
  const wet = context.createGain(); wet.gain.value = title ? .1 : .075;
  compressor.connect(convolver).connect(wet).connect(output);
}

function connectTitleRepeat(context: Context, input: AudioNode, output: AudioNode, style: Style): void {
  // A lightly saturated, narrower voice makes the audible repeat distinct from
  // the first title. Keep its timing and pitch intact, with no robotic doubling.
  const highpass = context.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = style === 'serious' ? 180 : 250;
  const presence = context.createBiquadFilter(); presence.type = 'peaking'; presence.frequency.value = 1800; presence.Q.value = 0.7; presence.gain.value = 2.5;
  const electric = context.createWaveShaper();
  const drive = style === 'dynamic' || style === 'modern-radio' ? 2.4 : 1.8;
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) { const value = i * 2 / (curve.length - 1) - 1; curve[i] = Math.atan(drive * value) / drive; }
  electric.curve = curve; electric.oversample = '2x';
  const lowpass = context.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = style === 'mysterious' ? 4200 : 5200;
  const compressor = context.createDynamicsCompressor(); compressor.threshold.value = -20; compressor.knee.value = 10; compressor.ratio.value = 3; compressor.attack.value = 0.002; compressor.release.value = 0.14;
  const repeats: Record<Style, number> = { dynamic: 0.72, adventure: 0.68, historical: 0.68, mysterious: 0.7, serious: 0.65, 'modern-radio': 0.72 };
  const audible = context.createGain(); audible.gain.value = 1.3 * repeats[style];
  input.connect(highpass).connect(presence).connect(electric).connect(lowpass).connect(compressor).connect(audible).connect(output);
  const room = context.createConvolver(); room.buffer = roomImpulse(context, .42);
  const wet = context.createGain(); wet.gain.value = .075;
  audible.connect(room).connect(wet).connect(output);
}

function musicLevel(buffer: AudioBuffer): number {
  let sum = 0, count = 0, peak = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const samples = buffer.getChannelData(ch);
    for (let i = 0; i < samples.length; i++) { peak = Math.max(peak, Math.abs(samples[i])); if (i % 16 === 0) { sum += samples[i] * samples[i]; count++; } }
  }
  return Math.min(0.8, 0.45 / Math.max(0.01, peak), 0.16 / Math.max(0.01, Math.sqrt(sum / Math.max(1, count))));
}

function envelope(gain: GainNode, points: [number, number][], start: number, offset: number): void {
  points.sort((a, b) => a[0] - b[0]);
  let value = points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [at, next] = points[i]; const [before, previous] = points[i - 1];
    if (offset <= at) { value = previous + (next - previous) * Math.min(1, Math.max(0, (offset - before) / Math.max(0.001, at - before))); break; }
    value = next;
  }
  gain.gain.setValueAtTime(value, start);
  for (const [at, next] of points) if (at > offset) gain.gain.linearRampToValueAtTime(next, start + at - offset);
}

export function scheduleGuidedJingle(context: Context, destination: AudioNode, block: PodcastBlock, assets: AudioAsset[], cache: Map<string, AudioBuffer>, start: number, offset: number): void {
  const plan = getGuidedJinglePlan(block, assets);
  if (!plan.ready || offset >= plan.total) return;
  const jingle = block.jingle!;
  const music = cache.get(jingle.musicAssetId!);
  if (!music) throw new Error('La musique du jingle est introuvable.');
  const full = musicLevel(music);
  const percent = Math.max(0, Math.min(100, jingle.musicVolume ?? 32)) / 100;
  const under = full * percent;
  const outro = full * 1.35;
  const musicGain = context.createGain(); musicGain.connect(destination);
  const speechEnd = plan.titleReturnStart === undefined ? plan.starts.intro + plan.durations.intro : plan.titleReturnStart + plan.durations.title;
  const liftRamp = Math.min(.2, Math.max(0, plan.starts.hook - speechEnd) / 3);
  envelope(musicGain, [[0, 0], [0.16, full], [plan.starts.title - 0.2, full], [plan.starts.title, under], [speechEnd, under], [speechEnd + liftRamp, full], [plan.starts.hook - liftRamp, full], [plan.starts.hook, under], [plan.outroStart, under], [plan.outroStart + 0.32, outro], [plan.total - 0.6, outro], [plan.total, 0]], start, offset);
  const bed = context.createBufferSource(); bed.buffer = music;
  // The complete music remains the clock, including any optional final sound.
  bed.connect(musicGain); bed.start(start, offset, plan.total - offset);

  const phrase = (part: JingleVoicePart, at: number, repeat = false) => {
    const take = jingle.takes![part]!;
    const buffer = cache.get(take.assetId);
    if (!buffer) throw new Error('Une phrase du jingle est introuvable.');
    const consumed = Math.max(0, offset - at);
    const duration = plan.durations[part] - consumed;
    if (duration <= 0) return;
    const source = context.createBufferSource(); source.buffer = buffer;
    const gain = context.createGain(); source.connect(gain);
    if (repeat) connectTitleRepeat(context, gain, destination, jingle.style);
    else connectPhrase(context, gain, destination, jingle.style, part);
    const now = start + Math.max(0, at - offset);
    const level = studioVoiceGain(buffer);
    gain.gain.setValueAtTime(level, now);
    source.start(now, take.sourceStart + consumed, duration);
  };
  if (jingle.production === 'guided-v4' || jingle.production === 'guided-v5') {
    for (const part of JINGLE_PARTS) phrase(part, plan.starts[part], part === 'title-alt');
    phrase('title', plan.titleReturnStart!);
  } else {
    for (const part of ['title', 'intro', 'hook'] as const) phrase(part, plan.starts[part]);
    phrase('title', plan.starts.title + 1, true);
  }

  const ending = getGuidedJingleEndingPlan(block, assets);
  if (jingle.ending && !ending) throw new Error('Le bruitage final du jingle est introuvable.');
  if (ending && offset < ending.start + ending.duration) {
    const buffer = cache.get(ending.assetId);
    if (!buffer) throw new Error('Le bruitage final du jingle est introuvable.');
    let peak = .01;
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) for (const value of buffer.getChannelData(ch)) peak = Math.max(peak, Math.abs(value));
    const level = Math.min(4, .36 / peak) * ending.volume;
    const consumed = Math.max(0, offset - ending.start);
    const remaining = ending.duration - consumed;
    const at = start + Math.max(0, ending.start - offset);
    const gain = context.createGain(); gain.connect(destination);
    envelope(gain, [[0,0],[.008,level],[Math.max(.009, ending.duration - .12),level],[ending.duration,0]], at, consumed);
    const source = context.createBufferSource(); source.buffer = buffer; source.connect(gain);
    source.start(at, consumed, remaining);
  }
}
