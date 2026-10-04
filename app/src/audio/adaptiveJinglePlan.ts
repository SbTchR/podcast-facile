import type { JingleVoicePart, PodcastBlock } from '../types';
import type { GuidedJinglePlan } from './jinglePlan';
import { RADIO_JINGLE_PARTS, JINGLE_ECHO_OVERLAP, isJingleEcho, jinglePartScript } from './jingleParts';

export type RadioDurations = Record<JingleVoicePart, number>;
export type JingleMusicSlot = 'opening' | 'afterEcho' | 'afterIntro' | 'afterTitle' | 'ending';
export interface JingleMusicSegment { slot: JingleMusicSlot; start: number; duration: number }
export interface AdaptiveJingleTiming {
  music: JingleMusicSegment[];
  estimates: RadioDurations;
  predictedSpeech: number;
  provisional: boolean;
}
export const JINGLE_MUSIC_MINIMUMS: Record<JingleMusicSlot, number> = { opening: 3, afterEcho: 1.5, afterIntro: 1.5, afterTitle: 1.5, ending: 3 };
export const JINGLE_MUSIC_EDGE_MAX = 5;
export const JINGLE_MINIMUM_MUSIC = Object.values(JINGLE_MUSIC_MINIMUMS).reduce((sum, duration) => sum + duration, 0);
const MUSIC_SLOTS = Object.keys(JINGLE_MUSIC_MINIMUMS) as JingleMusicSlot[];
const MINIMUM_WAITING: RadioDurations = { title: .8, 'title-echo': .5, intro: 2, 'intro-echo': .5, 'title-alt': .8, 'title-alt-echo': .5, hook: 2 };
const echoOnset = (duration: number) => Math.max(.15, duration - JINGLE_ECHO_OVERLAP);
const pairDuration = (main: number, reply: number) => reply > 0 ? Math.max(main, echoOnset(main) + reply) : main;
export const radioSpeechDuration = (takes: RadioDurations) => pairDuration(takes.title, takes['title-echo']) + pairDuration(takes.intro, takes['intro-echo']) + pairDuration(takes['title-alt'], takes['title-alt-echo']) + takes.hook;

/** Reading estimates reserve a fair place for missing takes; recordings always win. */
function estimateTakes(jingle: NonNullable<PodcastBlock['jingle']>, durations: RadioDurations): RadioDurations {
  const estimates = Object.fromEntries(RADIO_JINGLE_PARTS.map(part => {
    const text = jinglePartScript(jingle, '', part);
    const words = (text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) ?? []).length;
    const echo = isJingleEcho(part);
    const fallback = echo ? 1 : part === 'intro' ? 4.5 : part === 'hook' ? 3.5 : 2;
    const reading = words ? words / (echo ? 2.6 : 2.3) + (echo ? .12 : .35) : fallback;
    return [part, Math.max(MINIMUM_WAITING[part], echo ? Math.min(3, reading) : reading)];
  })) as RadioDurations;
  if (!jingle.scripts?.['title-alt'] && durations.title > 0) estimates['title-alt'] = Math.max(estimates['title-alt'], durations.title);
  return estimates;
}

/** Opening/finale stay between 3 and 5 seconds; longer sentences get more breath. */
function distributeMusic(available: number, takes: RadioDurations): Record<JingleMusicSlot, number> {
  const music = { ...JINGLE_MUSIC_MINIMUMS };
  const weights: Record<JingleMusicSlot, number> = {
    opening: 1,
    afterEcho: 1 + Math.min(.75, pairDuration(takes.title, takes['title-echo']) / 4),
    afterIntro: 1.2 + Math.min(1, pairDuration(takes.intro, takes['intro-echo']) / 6),
    afterTitle: .8 + Math.min(.5, pairDuration(takes['title-alt'], takes['title-alt-echo']) / 5),
    ending: 1,
  };
  let extra = Math.max(0, available - JINGLE_MINIMUM_MUSIC);
  let active = [...MUSIC_SLOTS];
  while (extra > 1e-8 && active.length) {
    const weight = active.reduce((sum, slot) => sum + weights[slot], 0);
    const capped = active.filter(slot => (slot === 'opening' || slot === 'ending') && extra * weights[slot] / weight > JINGLE_MUSIC_EDGE_MAX - music[slot]);
    if (capped.length) {
      for (const slot of capped) { extra -= JINGLE_MUSIC_EDGE_MAX - music[slot]; music[slot] = JINGLE_MUSIC_EDGE_MAX; }
      active = active.filter(slot => !capped.includes(slot));
    } else {
      for (const slot of active) music[slot] += extra * weights[slot] / weight;
      extra = 0;
    }
  }
  return music;
}

export function getAdaptiveRadioPlan(jingle: NonNullable<PodcastBlock['jingle']>, durations: RadioDurations, total: number, hasMusic: boolean): GuidedJinglePlan {
  const window = Math.max(0, total - JINGLE_MINIMUM_MUSIC);
  const used = radioSpeechDuration(durations);
  const estimates = estimateTakes(jingle, durations);
  const expected = Object.fromEntries(RADIO_JINGLE_PARTS.map(part => [part, durations[part] || estimates[part]])) as RadioDurations;
  // Scale only the missing reservations, never a recorded voice or its playback.
  const reserveAt = (fraction: number) => Object.fromEntries(RADIO_JINGLE_PARTS.map(part => [part, durations[part] || MINIMUM_WAITING[part] + fraction * (estimates[part] - MINIMUM_WAITING[part])])) as RadioDurations;
  let low = 0, high = 1;
  for (let i = 0; i < 36; i++) {
    const middle = (low + high) / 2;
    if (radioSpeechDuration(reserveAt(middle)) <= window) low = middle;
    else high = middle;
  }
  const reserved = reserveAt(low);
  const limits = Object.fromEntries(RADIO_JINGLE_PARTS.map(part => {
    let low = 0, high = window;
    for (let i = 0; i < 36; i++) {
      const middle = (low + high) / 2;
      if (radioSpeechDuration({ ...reserved, [part]: middle }) <= window - .04) low = middle;
      else high = middle;
    }
    // Keep responses concise and guide titles by the prepared text, not a fixed cap.
    const guide = isJingleEcho(part) ? 3 : part === 'title' || part === 'title-alt' ? estimates[part] * 1.6 + .4 : window;
    const maximum = Math.max(durations[part], Math.min(low, Math.max(guide, durations[part])));
    return [part, Math.max(durations[part], Math.floor((maximum + 1e-7) * 10) / 10)];
  })) as RadioDurations;
  const complete = RADIO_JINGLE_PARTS.every(part => durations[part] >= .15);
  const layout = complete ? durations : reserved;
  const music = distributeMusic(total - radioSpeechDuration(layout), layout);
  const starts = Object.fromEntries(RADIO_JINGLE_PARTS.map(part => [part, 0])) as RadioDurations;
  starts.title = music.opening;
  starts['title-echo'] = starts.title + echoOnset(layout.title);
  const firstEnd = starts.title + pairDuration(layout.title, layout['title-echo']);
  starts.intro = firstEnd + music.afterEcho;
  starts['intro-echo'] = starts.intro + echoOnset(layout.intro);
  const introEnd = starts.intro + pairDuration(layout.intro, layout['intro-echo']);
  starts['title-alt'] = introEnd + music.afterIntro;
  starts['title-alt-echo'] = starts['title-alt'] + echoOnset(layout['title-alt']);
  const secondEnd = starts['title-alt'] + pairDuration(layout['title-alt'], layout['title-alt-echo']);
  starts.hook = secondEnd + music.afterTitle;
  const outroStart = starts.hook + layout.hook;
  const fits = used <= window + .001 && total >= JINGLE_MINIMUM_MUSIC + 1;
  const segments: JingleMusicSegment[] = [
    { slot: 'opening', start: 0, duration: music.opening },
    { slot: 'afterEcho', start: firstEnd, duration: music.afterEcho },
    { slot: 'afterIntro', start: introEnd, duration: music.afterIntro },
    { slot: 'afterTitle', start: secondEnd, duration: music.afterTitle },
    { slot: 'ending', start: outroStart, duration: music.ending },
  ];
  return {
    total, window, used, limits, durations, starts, complete, fits, ready: hasMusic && complete && fits,
    outroStart, titleReturnStart: starts['title-alt'], echoStart: starts['title-echo'],
    voices: RADIO_JINGLE_PARTS.map(part => ({ part, start: starts[part], duration: durations[part], echo: isJingleEcho(part) })),
    musicBreaks: { afterEcho: music.afterEcho, afterIntro: music.afterIntro, afterTitle: music.afterTitle },
    timing: { music: segments, estimates, predictedSpeech: radioSpeechDuration(expected), provisional: !complete },
  };
}
