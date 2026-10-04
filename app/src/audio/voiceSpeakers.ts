import type { VoiceSpeaker } from '../types';

export const VOICE_SPEAKER_LABELS: Record<VoiceSpeaker, string> = {
  'voice-1': 'Voix 1',
  'voice-2': 'Voix 2',
  both: 'Voix 1 et 2',
};

export function voiceSpeakerClass(speaker?: VoiceSpeaker): string {
  return speaker ? `speaker-${speaker}` : '';
}
