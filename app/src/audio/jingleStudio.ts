import type { PodcastBlock } from '../types';
type Context = AudioContext | OfflineAudioContext;
export type JingleStyle = NonNullable<PodcastBlock['jingle']>['style'];

export const STUDIO_STYLES: Record<JingleStyle, { label: string; description: string; highpass: number; lowpass: number; warmth: number; presence: number; compression: number; room: number; wet: number; delay: number; delayWet: number; fxDuration: number; fxPitch: number }> = {
  dynamic: { label: 'Dynamique', description: 'Voix brillante et serrée, rebond court, impact et balayage final.', highpass: 110, lowpass: 13000, warmth: 0, presence: 4, compression: 4.5, room: 0.25, wet: 0.05, delay: 0.065, delayWet: 0.12, fxDuration: 1.4, fxPitch: 90 },
  adventure: { label: 'Aventure', description: 'Voix chaude et ample, espace cinématographique, montée et impact grave.', highpass: 85, lowpass: 11000, warmth: 3, presence: 1.5, compression: 3, room: 1.1, wet: 0.18, delay: 0.12, delayWet: 0.06, fxDuration: 2.6, fxPitch: 55 },
  mysterious: { label: 'Mystère', description: 'Voix feutrée, écho discret, souffle et note suspendue en finale.', highpass: 150, lowpass: 6500, warmth: 1, presence: -1, compression: 2.5, room: 1.5, wet: 0.24, delay: 0.19, delayWet: 0.18, fxDuration: 2.7, fxPitch: 170 },
  serious: { label: 'Sérieux', description: 'Voix nette et naturelle, niveau régulier, ponctuation finale sobre.', highpass: 85, lowpass: 15000, warmth: 1, presence: 2, compression: 2.5, room: 0.2, wet: 0, delay: 0, delayWet: 0, fxDuration: 0.9, fxPitch: 240 },
  historical: { label: 'Historique', description: 'Voix chaude et patinée, réverbération de salle, cloche douce en finale.', highpass: 100, lowpass: 5200, warmth: 4, presence: -1, compression: 2.8, room: 1.3, wet: 0.22, delay: 0, delayWet: 0, fxDuration: 2.8, fxPitch: 330 },
  'modern-radio': { label: 'Radio moderne', description: 'Voix présente et claire, double court, balayage et signature radio.', highpass: 110, lowpass: 12500, warmth: 1, presence: 4.5, compression: 4, room: 0.3, wet: 0.04, delay: 0.085, delayWet: 0.13, fxDuration: 1.8, fxPitch: 130 },
};

function impulse(context: Context, duration: number): AudioBuffer {
  const buffer = context.createBuffer(2, Math.ceil(context.sampleRate * duration), context.sampleRate);
  let seed = 2909;
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) { seed = seed * 48271 % 2147483647; data[i] = (seed / 2147483647 * 2 - 1) * Math.pow(1 - i / data.length, 3.5); }
  }
  return buffer;
}

export function connectStudioVoice(context: Context, input: AudioNode, output: AudioNode, style: JingleStyle): void {
  const p = STUDIO_STYLES[style];
  const highpass = context.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = p.highpass;
  const lowpass = context.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = p.lowpass;
  const warmth = context.createBiquadFilter(); warmth.type = 'lowshelf'; warmth.frequency.value = 220; warmth.gain.value = p.warmth;
  const presence = context.createBiquadFilter(); presence.type = 'peaking'; presence.frequency.value = 3200; presence.Q.value = 0.8; presence.gain.value = p.presence;
  const compressor = context.createDynamicsCompressor(); compressor.threshold.value = -22; compressor.knee.value = 8; compressor.ratio.value = p.compression; compressor.attack.value = 0.006; compressor.release.value = style === 'dynamic' ? 0.08 : 0.16;
  input.connect(highpass).connect(lowpass).connect(warmth).connect(presence).connect(compressor);
  const dry = context.createGain(); dry.gain.value = 1.5; compressor.connect(dry).connect(output);
  if (p.wet > 0) { const convolver = context.createConvolver(); convolver.buffer = impulse(context, p.room); const wet = context.createGain(); wet.gain.value = p.wet * 1.5; compressor.connect(convolver).connect(wet).connect(output); }
  if (p.delay > 0) { const delay = context.createDelay(0.5); delay.delayTime.value = p.delay; const wet = context.createGain(); wet.gain.value = p.delayWet * 1.5; compressor.connect(delay).connect(wet).connect(output); }
}

/** Original, deterministic PCM FX beds: no download, license dependency, or random export variation. */
export function makeSignatureFx(context: Context, style: JingleStyle): AudioBuffer {
  const p = STUDIO_STYLES[style];
  const buffer = context.createBuffer(2, Math.ceil(context.sampleRate * p.fxDuration), context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let seed = 9281 + channel * 149;
    let filteredNoise = 0;
    let phase = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / context.sampleRate;
      const progress = t / p.fxDuration;
      seed = seed * 48271 % 2147483647;
      const noise = seed / 2147483647 * 2 - 1;
      filteredNoise += (noise - filteredNoise) * (0.03 + 0.65 * (1 - progress));
      const tail = Math.pow(1 - progress, 2);
      const onset = Math.min(1, t / 0.015);
      const frequency = p.fxPitch * (style === 'historical' ? 1 : 1 + 2.8 * Math.exp(-t * 8));
      phase += 2 * Math.PI * frequency / context.sampleRate;
      let tone = Math.sin(phase) * Math.exp(-t * (style === 'adventure' ? 3 : 5));
      let sweep = filteredNoise * Math.sin(Math.PI * progress) * tail * 0.24;
      if (style === 'historical') { tone = (Math.sin(phase) + 0.45 * Math.sin(phase * 2.71) + 0.22 * Math.sin(phase * 4.13)) * Math.exp(-t * 2); sweep *= 0.1; }
      if (style === 'mysterious') { tone = (Math.sin(phase) + 0.3 * Math.sin(phase * 1.498)) * Math.sin(Math.PI * progress) * 0.3; sweep *= 0.7; }
      if (style === 'serious') { tone *= 0.4; sweep *= 0.15; }
      if (style === 'modern-radio') tone += 0.2 * Math.sin(2 * Math.PI * (channel === 0 ? 880 : 882) * t) * Math.exp(-Math.max(0, t - 0.12) * 8) * Math.min(1, t / 0.12);
      data[i] = (tone * 0.36 + sweep) * tail * onset;
    }
  }
  return buffer;
}

export function scheduleSignatureFx(context: Context, output: AudioNode, style: JingleStyle, timelineStart: number, total: number, start: number, localOffset: number): void {
  const buffer = makeSignatureFx(context, style);
  const fxStart = Math.max(timelineStart + 0.08, total - buffer.duration);
  const consumed = Math.max(0, localOffset - fxStart);
  const delay = Math.max(0, fxStart - localOffset);
  const duration = Math.min(buffer.duration - consumed, total - Math.max(localOffset, fxStart));
  if (duration <= 0) return;
  const source = context.createBufferSource(); source.buffer = buffer;
  const gain = context.createGain(); gain.gain.setValueAtTime(style === 'serious' ? 0.55 : 0.8, start + delay); gain.gain.linearRampToValueAtTime(0, start + delay + duration);
  source.connect(gain).connect(output); source.start(start + delay, consumed, duration);
}

export function applyStudioMusicEnvelope(gain: GainNode, start: number, total: number, localOffset: number, lead: number, voiceDuration: number, level: number, profile: { intro: number; duck: number; outro: number }): void {
  const points: [number, number][] = [[0, 0], [Math.min(0.35, total / 4), level * profile.intro]];
  if (voiceDuration > 0) points.push([Math.max(0.36, lead - 0.18), level * profile.intro], [lead + 0.06, level * profile.duck], [lead + voiceDuration, level * profile.duck], [Math.min(total - 0.6, lead + voiceDuration + 0.25), level * profile.outro]);
  points.push([Math.max(0, total - 0.6), level * (voiceDuration > 0 ? profile.outro : profile.intro)], [total, 0]);
  points.sort((a, b) => a[0] - b[0]);
  let initial = points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [at, value] = points[i]; const [previousAt, previousValue] = points[i - 1];
    if (localOffset <= at) { initial = previousValue + (value - previousValue) * Math.min(1, Math.max(0, (localOffset - previousAt) / Math.max(0.001, at - previousAt))); break; }
    initial = value;
  }
  gain.gain.setValueAtTime(initial, start);
  for (const [at, value] of points) if (at > localOffset && at <= total) gain.gain.linearRampToValueAtTime(value, start + at - localOffset);
}

export function studioVoiceGain(buffer: AudioBuffer): number {
  const data = buffer.getChannelData(0);
  let sum = 0, count = 0, peak = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const samples = buffer.getChannelData(channel);
    for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  }
  for (let i = 0; i < data.length; i += 64) { if (Math.abs(data[i]) < 0.005) continue; sum += data[i] * data[i]; count++; }
  const rms = Math.sqrt(sum / Math.max(1, count));
  // Spoken consonants can be much louder than the average voice. Keep room for
  // the style EQ and makeup gain; a compressor's attack does not catch every peak.
  return rms > 0.005 ? Math.min(4, 0.14 / rms, 0.42 / Math.max(0.001, peak)) : 1;
}
