import type { AudioAsset, JingleTake, JingleVoicePart, PodcastBlock } from '../types';
import type { PreviewSession } from './libraryPreview';
import { isJingleEcho } from './jingleParts';
import { STUDIO_STYLES, studioVoiceGain } from './jingleStudio';

type Context = AudioContext | OfflineAudioContext;
type Style = NonNullable<PodcastBlock['jingle']>['style'];
const rooms: Record<Style, number> = { dynamic: 1, adventure: 1.25, historical: 1.3, mysterious: 1.4, serious: 1, 'modern-radio': 1.1 };
const broadcastRooms: Record<Style, number> = { dynamic: 2.7, adventure: 3.2, historical: 3.4, mysterious: 3.6, serious: 2.6, 'modern-radio': 3 };
export const RADIO_REPLY_GAIN = 10 ** (-12 / 20);
const impulses = new WeakMap<Context, Map<number, AudioBuffer>>();

function roomImpulse(context: Context, seconds: number): AudioBuffer {
  let cached = impulses.get(context);
  if (!cached) { cached = new Map(); impulses.set(context, cached); }
  const existing = cached.get(seconds);
  if (existing) return existing;
  const buffer = context.createBuffer(2, Math.ceil(context.sampleRate * seconds), context.sampleRate);
  let seed = 19607;
  for (let channel = 0; channel < 2; channel++) {
    const samples = buffer.getChannelData(channel);
    for (let i = 0; i < samples.length; i++) {
      seed = seed * 48271 % 2147483647;
      const density = Math.min(1, i / (context.sampleRate * .012));
      samples[i] = (seed / 2147483647 * 2 - 1) * Math.exp(-5.5 * i / samples.length) * density;
    }
  }
  cached.set(seconds, buffer);
  return buffer;
}

function addRoom(context: Context, input: AudioNode, output: AudioNode, seconds: number, level: number, predelay: number, phone = false): void {
  const delay = context.createDelay(.1); delay.delayTime.value = predelay;
  const room = context.createConvolver(); room.buffer = roomImpulse(context, seconds);
  const wet = context.createGain(); wet.gain.value = level;
  input.connect(delay).connect(room);
  if (phone) {
    const band = context.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 1700; band.Q.value = .7;
    room.connect(band).connect(wet).connect(output);
  } else room.connect(wet).connect(output);
}

/** Dedicated recordings receive different processing; no voice fades or pitch changes. */
export function connectRadioJingleVoice(context: Context, input: AudioNode, output: AudioNode, style: Style, part: JingleVoicePart, broadcast = false): void {
  const echo = isJingleEcho(part);
  const title = part === 'title' || part === 'title-alt';
  // Attenuate the whole reply chain, including its resonance and slap.
  const destination = echo && broadcast ? context.createGain() : output;
  if (destination !== output) { (destination as GainNode).gain.value = RADIO_REPLY_GAIN; destination.connect(output); }
  const profile = STUDIO_STYLES[style];
  const highpass = context.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = echo ? 400 : title ? profile.highpass : 90;
  const lowpass = context.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = echo ? 3200 : title ? Math.max(9000, profile.lowpass) : 16000;
  const presence = context.createBiquadFilter(); presence.type = 'peaking'; presence.frequency.value = echo ? 1600 : 3000; presence.Q.value = echo ? 1.1 : .8; presence.gain.value = echo ? 3 : title ? Math.max(1.5, Math.min(3.5, profile.presence)) : 1.8;
  const compressor = context.createDynamicsCompressor(); compressor.threshold.value = -22; compressor.knee.value = 9; compressor.ratio.value = title || echo ? 3.5 : 3; compressor.attack.value = .003; compressor.release.value = .12;
  input.connect(highpass).connect(presence);
  if (echo) {
    const saturation = context.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) curve[i] = Math.atan(1.8 * (i * 2 / (curve.length - 1) - 1)) / Math.atan(1.8);
    saturation.curve = curve; saturation.oversample = '2x';
    // Two lowpass stages give the reply a recognisable telephone bandwidth.
    const radioBand = context.createBiquadFilter(); radioBand.type = 'lowpass'; radioBand.frequency.value = 3400;
    presence.connect(saturation).connect(lowpass).connect(radioBand).connect(compressor);
  } else {
    const warmth = context.createBiquadFilter(); warmth.type = 'lowshelf'; warmth.frequency.value = 220; warmth.gain.value = title ? profile.warmth : 1;
    presence.connect(warmth).connect(lowpass).connect(compressor);
  }
  const dry = context.createGain(); dry.gain.value = echo ? 1.35 : title ? 1.22 : 1.3;
  compressor.connect(dry).connect(destination);
  if (echo) {
    const slap = context.createDelay(.2); slap.delayTime.value = .095;
    const feedback = context.createGain(); feedback.gain.value = .18;
    const wet = context.createGain(); wet.gain.value = .22;
    compressor.connect(slap); slap.connect(feedback).connect(slap); slap.connect(wet).connect(destination);
    addRoom(context, compressor, destination, .65, .18, .012, true);
  } else {
    addRoom(context, compressor, destination, title ? (broadcast ? broadcastRooms[style] : rooms[style]) : .38, title ? (broadcast ? 1.08 : .32) : .065, title ? (broadcast ? .045 : .022) : .012);
    if (title && broadcast) for (const [seconds, level] of [[.085, .2], [.145, .12], [.215, .07]]) {
      const reflection = context.createDelay(.3); reflection.delayTime.value = seconds;
      const levelNode = context.createGain(); levelNode.gain.value = level;
      compressor.connect(reflection).connect(levelNode).connect(destination);
    }
  }
}

/** Preserve headroom when two different voices overlap over the music. */
export function radioJingleBus(context: Context, destination: AudioNode): AudioNode {
  const compressor = context.createDynamicsCompressor(); compressor.threshold.value = -4.5; compressor.knee.value = 4; compressor.ratio.value = 8; compressor.attack.value = .001; compressor.release.value = .09;
  const headroom = context.createGain(); headroom.gain.value = .95;
  compressor.connect(headroom).connect(destination);
  return compressor;
}

export async function previewRadioJingleTakes(takes: { part: JingleVoicePart; asset: AudioAsset; take: JingleTake; at: number }[], style: Style, signal: AbortSignal): Promise<PreviewSession> {
  const context = new AudioContext();
  let stopped = false;
  let closing: Promise<void> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    if (stopped) return closing;
    stopped = true;
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
    closing = context.close();
    return closing;
  };
  const abort = () => { void stop(); };
  const check = () => { if (signal.aborted || stopped) throw new DOMException('Aperçu annulé.', 'AbortError'); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    check();
    await context.resume();
    const decoded = await Promise.all(takes.map(async cue => ({ ...cue, buffer: await context.decodeAudioData(await cue.asset.blob.arrayBuffer()) })));
    check();
    const bus = radioJingleBus(context, context.destination);
    const start = context.currentTime + .025;
    let duration = 0;
    for (const cue of decoded) {
      const sourceStart = Math.max(0, cue.take.sourceStart);
      const length = Math.min(cue.buffer.duration, cue.take.sourceEnd) - sourceStart;
      if (length <= 0) throw new Error('Cette prise est vide. Réenregistre-la.');
      const source = context.createBufferSource(); source.buffer = cue.buffer;
      const gain = context.createGain(); gain.gain.value = studioVoiceGain(cue.buffer);
      source.connect(gain);
      connectRadioJingleVoice(context, gain, bus, style, cue.part, true);
      source.start(start + cue.at, sourceStart, length);
      const tail = isJingleEcho(cue.part) ? .7 : cue.part === 'title' || cue.part === 'title-alt' ? broadcastRooms[style] + .05 : .4;
      duration = Math.max(duration, cue.at + length + tail);
    }
    timer = setTimeout(() => { void stop(); }, (duration + .06) * 1000);
    return { totalDuration: duration, getElapsed: () => stopped ? duration : Math.min(duration, Math.max(0, context.currentTime - start)), stop };
  } catch (error) { await stop(); throw error; }
}
