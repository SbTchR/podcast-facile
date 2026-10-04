import type { JingleVoicePart } from '../types';
import type { GuidedJinglePlan } from '../audio/jinglePlan';
import type { JingleMusicSlot } from '../audio/adaptiveJinglePlan';
import { JINGLE_PART_LABELS, isJingleEcho } from '../audio/jingleParts';

const seconds = (value: number) => value.toFixed(1).replace('.', ',') + ' s';
const MUSIC_LABELS: Record<JingleMusicSlot, string> = { opening: 'Musique d’intro', afterEcho: 'Après le titre 1', afterIntro: 'Après la présentation', afterTitle: 'Après le titre 2', ending: 'Musique finale' };
const SHORT_LABELS: Record<JingleVoicePart, string> = { title: 'T1', 'title-echo': 'É1', intro: 'Intro', 'intro-echo': 'Éi', 'title-alt': 'T2', 'title-alt-echo': 'É2', hook: 'Accroche' };

export function JingleTiming({ plan, onTake, compact = false }: { plan: GuidedJinglePlan; compact?: boolean; onTake: (part: JingleVoicePart) => void }) {
  const slots: JingleMusicSlot[] = ['opening', 'afterEcho', 'afterIntro', 'afterTitle', 'ending'];
  const fallbackMusic: { slot: JingleMusicSlot; start: number; duration: number }[] = [];
  let cursor = 0;
  for (const cue of [...(plan.voices ?? [])].sort((a, b) => a.start - b.start)) {
    if (cue.duration <= 0) continue;
    if (cue.start > cursor) fallbackMusic.push({ slot: slots[Math.min(fallbackMusic.length, 4)], start: cursor, duration: cue.start - cursor });
    cursor = Math.max(cursor, cue.start + cue.duration);
  }
  if (cursor < plan.total) fallbackMusic.push({ slot: 'ending', start: cursor, duration: plan.total - cursor });
  const timing = plan.timing ?? (plan.voices?.length ? { provisional: !plan.complete, music: fallbackMusic } : undefined);
  if (!timing || !plan.total || !plan.fits) return null;
  const position = (start: number, duration: number) => ({ left: Math.max(0, start / plan.total * 100) + '%', width: Math.max(0, Math.min(duration, plan.total - start) / plan.total * 100) + '%' });
  const ticks = Array.from({ length: Math.floor(plan.total / 5) + 1 }, (_, i) => i * 5);
  return <div className={`jingle-timing ${compact ? 'compact' : ''}`} >
    {!compact && <div className="jingle-timing-caption"><strong>Le rythme de ton jingle</strong><span>{timing.provisional ? 'Prévision · mise à jour à chaque prise' : seconds(plan.used) + ' de paroles · ' + seconds(plan.total - plan.used) + ' de passages musicaux'}</span></div>}
    <div className="jingle-timing-axis" aria-hidden="true">{ticks.map(at => <span key={at} style={{ left: at / plan.total * 100 + '%' }}>{at}s</span>)}</div>
    <div className="jingle-timing-row"><span>Musique</span><div className="jingle-timing-track">{timing.music.map(segment => <div key={segment.slot} className="jingle-timing-music" style={position(segment.start, segment.duration)} title={MUSIC_LABELS[segment.slot] + ' · ' + seconds(segment.duration)} aria-label={MUSIC_LABELS[segment.slot] + ', ' + seconds(segment.duration)} />)}</div></div>
    {([false, true] as const).map(echo => <div key={String(echo)} className="jingle-timing-row"><span>{echo ? 'Réponses' : 'Phrases'}</span><div className="jingle-timing-track">{plan.voices?.filter(cue => isJingleEcho(cue.part) === echo && cue.duration > 0).map(cue => <button key={cue.part} className={'jingle-timing-voice' + (echo ? ' reply' : '')} style={position(cue.start, cue.duration)} title={JINGLE_PART_LABELS[cue.part] + ' · ' + seconds(cue.start) + ' → ' + seconds(cue.start + cue.duration)} aria-label={'Modifier ' + JINGLE_PART_LABELS[cue.part].toLocaleLowerCase('fr') + ', de ' + seconds(cue.start) + ' à ' + seconds(cue.start + cue.duration)} onClick={() => onTake(cue.part)}><span>{SHORT_LABELS[cue.part]}</span></button>)}</div></div>)}

  </div>;
}
