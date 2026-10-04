import type { JingleVoicePart, PodcastBlock } from '../types';

export const RADIO_JINGLE_PARTS = ['title', 'title-echo', 'intro', 'intro-echo', 'title-alt', 'title-alt-echo', 'hook'] as const satisfies readonly JingleVoicePart[];
export const isJinglePartEnabled = (jingle: NonNullable<PodcastBlock['jingle']>, part: JingleVoicePart) => jingle.enabledParts?.[part] !== false;

export const JINGLE_ECHO_OVERLAP = .5;
export const JINGLE_PART_LABELS: Record<JingleVoicePart, string> = {
  title: 'Titre 1', 'title-echo': 'Écho du titre 1', intro: 'Présentation', 'intro-echo': 'Écho de la présentation',
  'title-alt': 'Titre 2', 'title-alt-echo': 'Écho du titre 2', hook: 'Accroche',
};
export const isJingleEcho = (part: JingleVoicePart) => part.endsWith('-echo');

/** An editable prompt, never an automatic reuse of the preceding recording. */
export function lastJingleWords(text: string): string {
  return (text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) ?? []).slice(-3).join(' ');
}

export function jinglePartScript(jingle: NonNullable<PodcastBlock['jingle']>, podcastTitle: string, part: JingleVoicePart): string {
  const title = jingle.scripts?.title ?? podcastTitle;
  const intro = jingle.scripts?.intro ?? 'Le podcast qui vous fait découvrir le monde.';
  const secondTitle = jingle.scripts?.['title-alt'] ?? title;
  const defaults: Record<JingleVoicePart, string> = {
    title, 'title-echo': lastJingleWords(title), intro, 'intro-echo': lastJingleWords(intro),
    'title-alt': secondTitle, 'title-alt-echo': lastJingleWords(secondTitle), hook: 'Épisode 1 : les aventures de Christophe Colomb.',
  };
  return jingle.scripts?.[part] ?? defaults[part];
}

export function jinglePartSpeaker(jingle: NonNullable<PodcastBlock['jingle']>, part: JingleVoicePart): string {
  if (isJingleEcho(part)) return 'Voix 2';
  if (part === 'intro' && jingle.introVoices === 'duo') return 'Voix 1 + voix 2';
  if (part === 'hook' && jingle.hookVoice === 'voice-2') return 'Voix 2';
  return 'Voix 1';
}

export function jinglePartSpeakerClass(jingle: NonNullable<PodcastBlock['jingle']>, part: JingleVoicePart): string {
  const speaker = jinglePartSpeaker(jingle, part);
  return speaker === 'Voix 1 + voix 2' ? 'speaker-both' : speaker === 'Voix 2' ? 'speaker-voice-2' : 'speaker-voice-1';
}
