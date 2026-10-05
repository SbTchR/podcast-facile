import type { VoiceSpeaker, PodcastProject } from '../types';

export const VOICE_SPEAKER_LABELS: Record<VoiceSpeaker, string> = {
  'voice-1': 'Voix 1',
  'voice-2': 'Voix 2',
  both: 'Voix 1 et 2',
};

export function voiceSpeakerClass(speaker?: VoiceSpeaker): string {
  return speaker ? `speaker-${speaker}` : '';
}

export function voiceSpeakerLabel(speaker: VoiceSpeaker, names?: PodcastProject['speakerNames']): string {
  if (speaker === 'both') return names?.['voice-1'] && names?.['voice-2'] ? `${names['voice-1']} et ${names['voice-2']}` : VOICE_SPEAKER_LABELS.both;
  return names?.[speaker] || VOICE_SPEAKER_LABELS[speaker];
}
