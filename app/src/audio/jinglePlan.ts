import type { AudioAsset, JingleTake, JingleVoicePart, PodcastBlock } from '../types';
import { RADIO_JINGLE_PARTS, JINGLE_ECHO_OVERLAP, isJingleEcho } from './jingleParts';

type LegacyJinglePart = Exclude<JingleVoicePart, 'title-echo' | 'intro-echo' | 'title-alt-echo'>;

export const JINGLE_PARTS: LegacyJinglePart[] = ['title', 'title-alt', 'intro', 'hook'];
const LEGACY_PARTS: LegacyJinglePart[] = ['title', 'intro', 'hook'];
export const JINGLE_LEAD = 3.2;
export const JINGLE_TAIL = 3.2;
export const JINGLE_TITLE_TAIL = 1.15;
export const JINGLE_VOICE_GAP = 0.18;
export const JINGLE_MUSIC_LIFT = 0.8;
// The echo starts 0.5 seconds later than before, measured from the first title.
export const JINGLE_ECHO_DELAY = 1.5;
export const JINGLE_INTRO_GAP = .83;
export const JINGLE_RETURN_GAP = .3;
const WEIGHTS: Record<LegacyJinglePart, number> = { title: .24, 'title-alt': .16, intro: .34, hook: .26 };
export const JINGLE_ECHO_PAUSE = 0;
export const JINGLE_AFTER_ECHO = 2;
export const JINGLE_AFTER_INTRO = 2;
export const JINGLE_AFTER_SECOND_TITLE = 1.5;
export const isGuidedJingle = (block: PodcastBlock): block is PodcastBlock & { jingle: NonNullable<PodcastBlock['jingle']> } => block.jingle?.production === 'guided-v3' || block.jingle?.production === 'guided-v4' || block.jingle?.production === 'guided-v5' || block.jingle?.production === 'guided-v6' || block.jingle?.production === 'guided-v7';

export interface JingleVoiceCue {
  part: JingleVoicePart;
  start: number;
  duration: number;
  echo: boolean;
}

interface LegacyGuidedJinglePlan {
  total: number;
  window: number;
  used: number;
  limits: Record<LegacyJinglePart, number>;
  durations: Record<LegacyJinglePart, number>;
  starts: Record<LegacyJinglePart, number>;
  titleReturnStart: number | undefined;
  complete: boolean;
  fits: boolean;
  ready: boolean;
  outroStart: number;
  echoStart?: number;
  voices?: JingleVoiceCue[];
  musicBreaks?: { afterEcho: number; afterIntro: number; afterTitle: number };
}

export interface GuidedJinglePlan extends Omit<LegacyGuidedJinglePlan, 'limits' | 'durations' | 'starts'> {
  limits: Record<JingleVoicePart, number>;
  durations: Record<JingleVoicePart, number>;
  starts: Record<JingleVoicePart, number>;
}

type RadioTimes = Record<JingleVoicePart, number>;
const echoOnset = (duration: number) => Math.max(.15, duration - JINGLE_ECHO_OVERLAP);
const pairDuration = (phrase: number, reply: number) => reply > 0 ? Math.max(phrase, echoOnset(phrase) + reply) : phrase;
const radioCost = (takes: RadioTimes) => pairDuration(takes.title, takes['title-echo']) + pairDuration(takes.intro, takes['intro-echo']) + pairDuration(takes['title-alt'], takes['title-alt-echo']) + takes.hook;

function getRadioPlan(block: PodcastBlock, assets: AudioAsset[], total: number, hasMusic: boolean): GuidedJinglePlan {
  const durations = Object.fromEntries(RADIO_JINGLE_PARTS.map(part => [part, jingleTakeDuration(block.jingle?.takes?.[part], assets)])) as RadioTimes;
  const extended = total >= 30;
  const window = Math.max(0, total - JINGLE_LEAD - JINGLE_TAIL - JINGLE_AFTER_ECHO - JINGLE_AFTER_INTRO - JINGLE_AFTER_SECOND_TITLE);
  const reserved: RadioTimes = { title: extended ? 2.5 : 1.8, 'title-echo': extended ? 1.1 : .9, intro: extended ? 7 : 4.3, 'intro-echo': extended ? 1.1 : .9, 'title-alt': extended ? 2.5 : 1.8, 'title-alt-echo': extended ? 1.1 : .9, hook: extended ? 4.5 : 2.7 };
  const used = radioCost(durations);
  const limits = Object.fromEntries(RADIO_JINGLE_PARTS.map(part => {
    const others = Object.fromEntries(RADIO_JINGLE_PARTS.map(other => [other, other === part ? 0 : durations[other] || reserved[other]])) as RadioTimes;
    let low = 0, high = total;
    for (let i = 0; i < 36; i++) {
      const middle = (low + high) / 2;
      if (radioCost({ ...others, [part]: middle }) <= window) low = middle;
      else high = middle;
    }
    // Responses stay short; reserve the useful speaking time for the sentences.
    const guide = isJingleEcho(part) ? extended ? 2.5 : 1.8 : part === 'title' || part === 'title-alt' ? extended ? 4 : 3 : total;
    const maximum = Math.min(low, Math.max(guide, durations[part]));
    return [part, Math.floor((maximum + 1e-7) * 10) / 10];
  })) as RadioTimes;
  const afterIntro = JINGLE_AFTER_INTRO + Math.min(extended ? 2 : 1, Math.max(0, window - used));
  const starts = Object.fromEntries(RADIO_JINGLE_PARTS.map(part => [part, 0])) as RadioTimes;
  starts.title = JINGLE_LEAD;
  starts['title-echo'] = starts.title + echoOnset(durations.title);
  starts.intro = starts.title + pairDuration(durations.title, durations['title-echo']) + JINGLE_AFTER_ECHO;
  starts['intro-echo'] = starts.intro + echoOnset(durations.intro);
  starts['title-alt'] = starts.intro + pairDuration(durations.intro, durations['intro-echo']) + afterIntro;
  starts['title-alt-echo'] = starts['title-alt'] + echoOnset(durations['title-alt']);
  starts.hook = starts['title-alt'] + pairDuration(durations['title-alt'], durations['title-alt-echo']) + JINGLE_AFTER_SECOND_TITLE;
  const voices = RADIO_JINGLE_PARTS.map(part => ({ part, start: starts[part], duration: durations[part], echo: isJingleEcho(part) }));
  const complete = RADIO_JINGLE_PARTS.every(part => durations[part] >= .15);
  const fits = used <= window + .001 && total >= 12;
  return { total, window, used, limits, durations, starts, titleReturnStart: starts['title-alt'], complete, fits, ready: hasMusic && complete && fits, outroStart: starts.hook + durations.hook, echoStart: starts['title-echo'], voices, musicBreaks: { afterEcho: JINGLE_AFTER_ECHO, afterIntro, afterTitle: JINGLE_AFTER_SECOND_TITLE } };
}

export function getGuidedJinglePlan(block: PodcastBlock, assets: AudioAsset[], fallbackDuration = 0): GuidedJinglePlan {
  if (block.jingle?.production === 'guided-v7') {
    const music = assets.find(asset => asset.id === block.jingle?.musicAssetId);
    return getRadioPlan(block, assets, music?.duration ?? fallbackDuration, Boolean(music));
  }
  const plan = getLegacyGuidedPlan(block, assets, fallbackDuration);
  const completeTimes = (times: Record<LegacyJinglePart, number>): RadioTimes => ({ 'title-echo': 0, 'intro-echo': 0, 'title-alt-echo': 0, ...times });
  return { ...plan, limits: completeTimes(plan.limits), durations: completeTimes(plan.durations), starts: completeTimes(plan.starts) };
}

function getComposedPlan(block: PodcastBlock, assets: AudioAsset[], total: number, hasMusic: boolean): LegacyGuidedJinglePlan {
  const durations = Object.fromEntries(JINGLE_PARTS.map(part => [part, jingleTakeDuration(block.jingle?.takes?.[part], assets)])) as Record<LegacyJinglePart, number>;
  // Take 1 is heard twice; take 2 appears only after the presentation.
  // Reserve every requested music break before allocating recording time.
  const window = Math.max(0, total - JINGLE_LEAD - JINGLE_TAIL - JINGLE_ECHO_PAUSE - JINGLE_AFTER_ECHO - JINGLE_AFTER_INTRO - JINGLE_AFTER_SECOND_TITLE);
  const cost = (takes: Record<LegacyJinglePart, number>) => 2 * takes.title + takes['title-alt'] + takes.intro + takes.hook;
  const extended = total >= 30;
  const reserved: Record<LegacyJinglePart, number> = { title: extended ? 2.5 : 1.8, 'title-alt': extended ? 2.5 : 1.8, intro: extended ? 8 : 3.8, hook: extended ? 5 : 2.7 };
  const used = cost(durations);
  const limits = Object.fromEntries(JINGLE_PARTS.map(part => {
    const others = Object.fromEntries(JINGLE_PARTS.map(other => [other, other === part ? 0 : durations[other] || reserved[other]])) as Record<LegacyJinglePart, number>;
    let maximum = Math.max(0, (window - cost(others)) / (part === 'title' ? 2 : 1));
    if ((part === 'title' || part === 'title-alt') && (!durations.intro || !durations.hook)) {
      maximum = Math.min(maximum, Math.max(extended ? 4 : 3, durations[part]));
    }
    return [part, Math.floor((maximum + 1e-7) * 10) / 10];
  })) as Record<LegacyJinglePart, number>;
  // Give the presentation a little breathing room. Remaining time belongs to
  // the musical ending, never to an unexpectedly long pause before the hook.
  const afterIntro = JINGLE_AFTER_INTRO + Math.min(extended ? 2 : 1, Math.max(0, window - used));
  const titleStart = JINGLE_LEAD;
  const echoStart = titleStart + durations.title + JINGLE_ECHO_PAUSE;
  const introStart = echoStart + durations.title + JINGLE_AFTER_ECHO;
  const secondTitleStart = introStart + durations.intro + afterIntro;
  const hookStart = secondTitleStart + durations['title-alt'] + JINGLE_AFTER_SECOND_TITLE;
  const starts: Record<LegacyJinglePart, number> = { title: titleStart, 'title-alt': secondTitleStart, intro: introStart, hook: hookStart };
  const voices: JingleVoiceCue[] = [
    { part: 'title', start: titleStart, duration: durations.title, echo: false },
    { part: 'title', start: echoStart, duration: durations.title, echo: true },
    { part: 'intro', start: introStart, duration: durations.intro, echo: false },
    { part: 'title-alt', start: secondTitleStart, duration: durations['title-alt'], echo: false },
    { part: 'hook', start: hookStart, duration: durations.hook, echo: false },
  ];
  const complete = JINGLE_PARTS.every(part => durations[part] >= .15);
  const fits = used <= window + .001 && total >= 12;
  return { total, window, used, limits, durations, starts, titleReturnStart: secondTitleStart, complete, fits, ready: hasMusic && complete && fits, outroStart: hookStart + durations.hook, echoStart, voices, musicBreaks: { afterEcho: JINGLE_AFTER_ECHO, afterIntro, afterTitle: JINGLE_AFTER_SECOND_TITLE } };
}

// Reserve short, audible breaks rather than charging every recording for the
// longest musical gaps. Restore the more spacious rhythm when the takes allow it.
const COMPACT_GAPS = { intro: .3, return: .12, lift: .4 };

function getFlexiblePlan(block: PodcastBlock, assets: AudioAsset[], total: number, hasMusic: boolean) {
  const durations = Object.fromEntries(JINGLE_PARTS.map(part => [part, jingleTakeDuration(block.jingle?.takes?.[part], assets)])) as Record<LegacyJinglePart, number>;
  const window = Math.max(0, total - JINGLE_LEAD - JINGLE_TAIL - JINGLE_ECHO_DELAY - COMPACT_GAPS.intro - COMPACT_GAPS.return - COMPACT_GAPS.lift);
  const cost = (takes: Record<LegacyJinglePart, number>) => Math.max(takes.title - JINGLE_ECHO_DELAY, takes['title-alt']) + takes.title + takes.intro + takes.hook;
  const used = cost(durations);
  const extended = total >= 30;
  // Short title takes leave most of the speaking time for the two actual
  // sentences. A missing hook keeps a useful slot while the intro is recorded.
  const reserved: Record<LegacyJinglePart, number> = { title: extended ? 3 : 2.5, 'title-alt': durations.title || (extended ? 3 : 2.5), intro: extended ? 7 : 4.5, hook: extended ? 5 : 3.5 };
  const limits = Object.fromEntries(JINGLE_PARTS.map(part => {
    const others = Object.fromEntries(JINGLE_PARTS.map(other => [other, other === part ? 0 : durations[other] || reserved[other]])) as Record<LegacyJinglePart, number>;
    let low = 0, high = total;
    for (let i = 0; i < 32; i++) {
      const middle = (low + high) / 2;
      if (cost({ ...others, [part]: middle }) <= window) low = middle;
      else high = middle;
    }
    // Guide the first two recordings towards concise titles. Existing takes
    // can still be kept when they fit; re-recording never invents extra time.
    if ((part === 'title' || part === 'title-alt') && (durations.intro === 0 || durations.hook === 0)) {
      const titleGuide = part === 'title-alt' ? Math.max(extended ? 5 : 3.5, durations.title + .75) : extended ? 5 : 3.5;
      low = Math.min(low, Math.max(titleGuide, durations[part]));
    }
    return [part, Math.floor((low + 1e-7) * 10) / 10];
  })) as Record<LegacyJinglePart, number>;
  const extraGaps = JINGLE_INTRO_GAP + JINGLE_RETURN_GAP + JINGLE_MUSIC_LIFT - COMPACT_GAPS.intro - COMPACT_GAPS.return - COMPACT_GAPS.lift;
  const breathingRoom = Math.min(1, Math.max(0, window - used) / extraGaps);
  const introGap = COMPACT_GAPS.intro + breathingRoom * (JINGLE_INTRO_GAP - COMPACT_GAPS.intro);
  const returnGap = COMPACT_GAPS.return + breathingRoom * (JINGLE_RETURN_GAP - COMPACT_GAPS.return);
  const musicLift = COMPACT_GAPS.lift + breathingRoom * (JINGLE_MUSIC_LIFT - COMPACT_GAPS.lift);
  const titleStart = JINGLE_LEAD;
  const echoStart = titleStart + JINGLE_ECHO_DELAY;
  const introStart = Math.max(titleStart + durations.title, echoStart + durations['title-alt']) + introGap;
  const titleReturnStart = introStart + durations.intro + returnGap;
  const hookStart = Math.max(titleReturnStart + durations.title + musicLift, total - JINGLE_TAIL - durations.hook);
  const starts: Record<LegacyJinglePart, number> = { title: titleStart, 'title-alt': echoStart, intro: introStart, hook: hookStart };
  const complete = JINGLE_PARTS.every(part => durations[part] >= .15);
  const fits = used <= window + .001 && total >= 12;
  return { total, window, used, limits, durations, starts, titleReturnStart, complete, fits, ready: hasMusic && complete && fits, outroStart: hookStart + durations.hook };
}

export function jingleTakeDuration(take: JingleTake | undefined, assets: AudioAsset[]): number {
  if (!take) return 0;
  const asset = assets.find((item) => item.id === take.assetId);
  if (!asset || !Number.isFinite(take.sourceStart) || !Number.isFinite(take.sourceEnd)) return 0;
  return Math.max(0, Math.min(asset.duration, take.sourceEnd) - Math.max(0, take.sourceStart));
}

function getLegacyGuidedPlan(block: PodcastBlock, assets: AudioAsset[], fallbackDuration = 0): LegacyGuidedJinglePlan {
  const jingle = block.jingle;
  const music = assets.find((item) => item.id === jingle?.musicAssetId);
  const total = music?.duration ?? fallbackDuration;
  if (jingle?.production === 'guided-v6') return getComposedPlan(block, assets, total, Boolean(music));
  if (jingle?.production === 'guided-v5') return getFlexiblePlan(block, assets, total, Boolean(music));
  if (jingle?.production === 'guided-v4') {
    const window = Math.max(0, total - JINGLE_LEAD - JINGLE_TAIL - JINGLE_ECHO_DELAY - JINGLE_INTRO_GAP - JINGLE_RETURN_GAP - JINGLE_MUSIC_LIFT);
    const durations = Object.fromEntries(JINGLE_PARTS.map(part => [part, jingleTakeDuration(jingle.takes?.[part], assets)])) as Record<LegacyJinglePart, number>;
    // The two title takes may overlap. The first take is also played after the intro.
    const cost = (takes: Record<LegacyJinglePart, number>) => Math.max(takes.title - JINGLE_ECHO_DELAY, takes['title-alt']) + takes.title + takes.intro + takes.hook;
    const used = cost(durations);
    const limits = Object.fromEntries(JINGLE_PARTS.map(part => {
      const others = JINGLE_PARTS.filter(other => other !== part);
      const without = { ...durations, [part]: 0 };
      const available = Math.max(0, window - cost(without));
      const waitingWeight = WEIGHTS[part] + others.reduce((sum, other) => sum + (durations[other] > 0 ? 0 : WEIGHTS[other]), 0);
      const allowance = available * WEIGHTS[part] / waitingWeight;
      let low = 0, high = total;
      for (let i = 0; i < 32; i++) {
        const middle = (low + high) / 2;
        if (cost({ ...without, [part]: middle }) - cost(without) <= allowance) low = middle;
        else high = middle;
      }
      return [part, Math.floor((low + 1e-7) * 10) / 10];
    })) as Record<LegacyJinglePart, number>;
    const titleStart = JINGLE_LEAD;
    const echoStart = titleStart + JINGLE_ECHO_DELAY;
    const introStart = Math.max(titleStart + durations.title, echoStart + durations['title-alt']) + JINGLE_INTRO_GAP;
    const titleReturnStart = introStart + durations.intro + JINGLE_RETURN_GAP;
    const hookStart = Math.max(titleReturnStart + durations.title + JINGLE_MUSIC_LIFT, total - JINGLE_TAIL - durations.hook);
    const starts: Record<LegacyJinglePart, number> = { title: titleStart, 'title-alt': echoStart, intro: introStart, hook: hookStart };
    const complete = JINGLE_PARTS.every(part => durations[part] >= .15);
    const fits = used <= window + .025 && total >= 12;
    return { total, window, used, limits, durations, starts, titleReturnStart, complete, fits, ready: Boolean(music) && complete && fits, outroStart: hookStart + durations.hook };
  }
  // Saved three-take jingles retain their duration until explicitly edited.
  const window = Math.max(0, total - JINGLE_LEAD - JINGLE_TAIL - JINGLE_TITLE_TAIL - JINGLE_VOICE_GAP - JINGLE_MUSIC_LIFT);
  const durations = Object.fromEntries(JINGLE_PARTS.map((part) => [part, jingleTakeDuration(jingle?.takes?.[part], assets)])) as Record<LegacyJinglePart, number>;
  const used = LEGACY_PARTS.reduce((sum, part) => sum + durations[part], 0);
  const legacyWeights = { title: .24, 'title-alt': 0, intro: .42, hook: .34 };
  const limits = Object.fromEntries(JINGLE_PARTS.map((part) => {
    if (part === 'title-alt') return [part, 0];
    const others = LEGACY_PARTS.filter((other) => other !== part);
    const available = Math.max(0, window - others.reduce((sum, other) => sum + durations[other], 0));
    const waitingWeight = legacyWeights[part] + others.reduce((sum, other) => sum + (durations[other] > 0 ? 0 : legacyWeights[other]), 0);
    // Reclaim unused time from previous takes, keeping room for those still to record.
    return [part, Math.floor((available * legacyWeights[part] / waitingWeight + 1e-7) * 10) / 10];
  })) as Record<LegacyJinglePart, number>;
  const titleStart = JINGLE_LEAD;
  const introStart = titleStart + durations.title + JINGLE_TITLE_TAIL + JINGLE_VOICE_GAP;
  const hookStart = Math.max(introStart + durations.intro + JINGLE_MUSIC_LIFT, total - JINGLE_TAIL - durations.hook);
  const starts: Record<LegacyJinglePart, number> = { title: titleStart, 'title-alt': titleStart + 1, intro: introStart, hook: hookStart };
  const complete = LEGACY_PARTS.every((part) => durations[part] >= 0.15);
  const fits = used <= window + 0.025 && total >= 12;
  return { total, window, used, limits, durations, starts, titleReturnStart: undefined, complete, fits, ready: Boolean(music) && complete && fits, outroStart: hookStart + durations.hook };
}

/** The optional sound fits inside the musical ending, after the final words. */
export function getGuidedJingleEndingPlan(block: PodcastBlock, assets: AudioAsset[]) {
  if (!block.jingle?.ending) return null;
  const asset = assets.find(item => item.id === block.jingle!.ending!.assetId);
  if (!asset || !Number.isFinite(asset.duration) || asset.duration <= 0) return null;
  const plan = getGuidedJinglePlan(block, assets);
  const duration = Math.min(asset.duration, JINGLE_TAIL - .3);
  return { assetId: asset.id, start: Math.max(plan.outroStart + .15, plan.total - duration - .15), duration, volume: Math.max(0, Math.min(100, block.jingle.ending.volume ?? 65)) / 100 };
}

/** Detect pauses outside the spoken phrase without cutting or accelerating words. */
export async function analyseJingleRecording(blob: Blob): Promise<{ duration: number; sourceStart: number; sourceEnd: number }> {
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    const frame = Math.max(1, Math.floor(buffer.sampleRate * 0.01));
    const envelope: number[] = [];
    for (let at = 0; at < buffer.length; at += frame) {
      let energy = 0;
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const samples = buffer.getChannelData(channel);
        for (let i = at; i < Math.min(at + frame, samples.length); i++) energy += samples[i] * samples[i];
      }
      envelope.push(Math.sqrt(energy / (frame * buffer.numberOfChannels)));
    }
    let peak = 0;
    for (const value of envelope) peak = Math.max(peak, value);
    const threshold = Math.max(0.004, peak * 0.035);
    const first = envelope.findIndex((value) => value >= threshold);
    let last = envelope.length - 1;
    while (last >= 0 && envelope[last] < threshold) last--;
    if (first < 0 || last < first) throw new Error('Cette prise semble silencieuse. Vérifie le micro puis réenregistre ta phrase.');
    const sourceStart = Math.max(0, first * 0.01 - 0.06);
    const sourceEnd = Math.min(buffer.duration, (last + 1) * 0.01 + 0.1);
    return { duration: buffer.duration, sourceStart, sourceEnd };
  } finally { await context.close(); }
}
