import type { JingleVoicePart, PodcastBlock } from '../types';
import type { GuidedJinglePlan } from './jinglePlan';
import { estimateTakes, type JingleMusicSegment, type JingleMusicSlot, type RadioDurations } from './adaptiveJinglePlan';
import { RADIO_JINGLE_PARTS, JINGLE_ECHO_OVERLAP, isJingleEcho, isJinglePartEnabled } from './jingleParts';

const GROUPS: { parts: JingleVoicePart[]; slot: JingleMusicSlot }[] = [
  { parts: ['title', 'title-echo'], slot: 'afterEcho' },
  { parts: ['intro', 'intro-echo'], slot: 'afterIntro' },
  { parts: ['title-alt', 'title-alt-echo'], slot: 'afterTitle' },
  { parts: ['hook'], slot: 'ending' },
];
const emptyTimes = () => Object.fromEntries(RADIO_JINGLE_PARTS.map(part => [part, 0])) as RadioDurations;
const echoOnset = (duration: number) => duration > 0 ? Math.max(.15, duration - JINGLE_ECHO_OVERLAP) : 0;
const pairDuration = (main: number, reply: number) => Math.max(main, reply > 0 ? echoOnset(main) + reply : 0);

/** Optional voices share the fixed music bed. Advice never cuts or rejects a take. */
export function getFlexibleRadioPlan(jingle: NonNullable<PodcastBlock['jingle']>, recorded: RadioDurations, total: number, hasMusic: boolean): GuidedJinglePlan {
  const enabled = RADIO_JINGLE_PARTS.filter(part => isJinglePartEnabled(jingle, part));
  const groups = GROUPS.filter(group => group.parts.some(part => enabled.includes(part)));
  const durations = Object.fromEntries(RADIO_JINGLE_PARTS.map(part => [part, enabled.includes(part) ? recorded[part] : 0])) as RadioDurations;
  const cost = (takes: RadioDurations) => groups.reduce((sum, group) => sum + pairDuration(takes[group.parts[0]], group.parts[1] ? takes[group.parts[1]] : 0), 0);
  const minimumMusic = groups.length ? 6 + Math.max(0, groups.length - 1) * 1.5 : 0;
  const window = Math.max(0, total - minimumMusic);
  const used = cost(durations);
  const estimates = estimateTakes(jingle, durations);
  const expected = Object.fromEntries(RADIO_JINGLE_PARTS.map(part => [part, enabled.includes(part) ? durations[part] || estimates[part] : 0])) as RadioDurations;
  // Missing phrases get a provisional place; measured recordings remain intact.
  const reservation = (fraction: number) => Object.fromEntries(RADIO_JINGLE_PARTS.map(part => [part, !enabled.includes(part) ? 0 : durations[part] || estimates[part] * fraction])) as RadioDurations;
  let low = 0, high = 1;
  for (let i = 0; i < 36; i++) {
    const middle = (low + high) / 2;
    if (cost(reservation(middle)) <= window) low = middle;
    else high = middle;
  }
  const complete = enabled.every(part => durations[part] >= .15);
  const layout = complete ? durations : reservation(low);
  const adviceScale = Math.min(1, window / Math.max(.001, cost(Object.fromEntries(RADIO_JINGLE_PARTS.map(part => [part, enabled.includes(part) ? estimates[part] : 0])) as RadioDurations)));
  const limits = Object.fromEntries(RADIO_JINGLE_PARTS.map(part => [part, enabled.includes(part) ? Math.max(.5, Math.round(estimates[part] * adviceScale * 10) / 10) : 0])) as RadioDurations;
  const starts = emptyTimes();
  const segments: JingleMusicSegment[] = [];
  if (!groups.length) {
    segments.push({ slot: 'opening', start: 0, duration: Math.max(0, total - 3) }, { slot: 'ending', start: Math.max(0, total - 3), duration: Math.min(3, total) });
  } else {
    const slots = ['opening', ...groups.slice(0, -1).map(group => group.slot), 'ending'] as JingleMusicSlot[];
    const music = Object.fromEntries(slots.map(slot => [slot, slot === 'opening' || slot === 'ending' ? 3 : 1.5])) as Record<JingleMusicSlot, number>;
    const weight = (slot: JingleMusicSlot) => slot === 'afterIntro' ? 1.2 + Math.min(1, pairDuration(layout.intro, layout['intro-echo']) / 6) : slot === 'afterEcho' ? 1 + Math.min(.75, pairDuration(layout.title, layout['title-echo']) / 4) : slot === 'afterTitle' ? .8 + Math.min(.5, pairDuration(layout['title-alt'], layout['title-alt-echo']) / 5) : 1;
    let extra = Math.max(0, total - cost(layout) - minimumMusic);
    let active = [...slots];
    while (extra > 1e-8 && active.length) {
      const sum = active.reduce((value, slot) => value + weight(slot), 0);
      // With a single phrase there is no intermediate gap: both edges share the music.
      const capped = groups.length > 1 ? active.filter(slot => (slot === 'opening' || slot === 'ending') && extra * weight(slot) / sum > 5 - music[slot]) : [];
      if (capped.length) {
        for (const slot of capped) { extra -= 5 - music[slot]; music[slot] = 5; }
        active = active.filter(slot => !capped.includes(slot));
      } else { for (const slot of active) music[slot] += extra * weight(slot) / sum; extra = 0; }
    }
    let cursor = music.opening;
    segments.push({ slot: 'opening', start: 0, duration: cursor });
    groups.forEach((group, index) => {
      const [main, reply] = group.parts;
      starts[main] = cursor;
      if (reply) starts[reply] = cursor + echoOnset(layout[main]);
      cursor += pairDuration(layout[main], reply ? layout[reply] : 0);
      const slot = index === groups.length - 1 ? 'ending' : group.slot;
      segments.push({ slot, start: cursor, duration: music[slot] });
      cursor += music[slot];
    });
  }
  const fits = used <= window + .001 && total >= minimumMusic && total > 0;
  return {
    total, window, used, limits, durations, starts, complete, fits, ready: hasMusic && complete && fits,
    outroStart: segments.at(-1)?.start ?? 0, titleReturnStart: starts['title-alt'], echoStart: starts['title-echo'],
    voices: enabled.filter(part => durations[part] > 0).map(part => ({ part, start: starts[part], duration: durations[part], echo: isJingleEcho(part) })).sort((a, b) => a.start - b.start),
    musicBreaks: { afterEcho: segments.find(segment => segment.slot === 'afterEcho')?.duration ?? 0, afterIntro: segments.find(segment => segment.slot === 'afterIntro')?.duration ?? 0, afterTitle: segments.find(segment => segment.slot === 'afterTitle')?.duration ?? 0 },
    timing: { music: segments, estimates, predictedSpeech: cost(expected), provisional: !complete },
  };
}
