import type { AudioAsset, JingleTake, JingleVoicePart, PodcastBlock, RecordingTake } from '../types';

function withCurrent(history: RecordingTake[] = [], current?: JingleTake): RecordingTake[] {
  if (!current) return history;
  const selected = { ...current, id: current.assetId };
  return history.some(take => take.assetId === current.assetId)
    ? history.map(take => take.assetId === current.assetId ? { ...take, ...current } : take)
    : [...history, selected];
}
export function voiceTakes(block: PodcastBlock): RecordingTake[] {
  return withCurrent(block.voiceTakes, block.assetId ? { assetId: block.assetId, sourceStart: block.trimStart, sourceEnd: block.trimEnd || block.duration } : undefined);
}
export function selectVoiceTake(block: PodcastBlock, take: RecordingTake): PodcastBlock {
  return { ...block, voiceTakes: voiceTakes(block), assetId: take.assetId, trimStart: take.sourceStart, trimEnd: take.sourceEnd,
    duration: take.sourceEnd - take.sourceStart, voiceCutStart: false, voiceCutEnd: false,
    voiceCues: block.voiceCues?.filter(cue => cue.at < take.sourceEnd - take.sourceStart) };
}
export function keepVoiceTake(block: PodcastBlock, asset: AudioAsset): PodcastBlock {
  const take = { id: asset.id, assetId: asset.id, sourceStart: 0, sourceEnd: asset.duration };
  return { ...selectVoiceTake(block, take), voiceTakes: [...voiceTakes(block), take] };
}
export function jingleTakes(jingle: NonNullable<PodcastBlock['jingle']>, part: JingleVoicePart): RecordingTake[] {
  return withCurrent(jingle.takeHistory?.[part], jingle.takes?.[part]);
}
export function selectJingleTake(jingle: NonNullable<PodcastBlock['jingle']>, part: JingleVoicePart, take: RecordingTake): NonNullable<PodcastBlock['jingle']> {
  return { ...jingle, takeHistory: { ...jingle.takeHistory, [part]: jingleTakes(jingle, part) },
    takes: { ...jingle.takes, [part]: { assetId: take.assetId, sourceStart: take.sourceStart, sourceEnd: take.sourceEnd } } };
}
export function keepJingleTake(jingle: NonNullable<PodcastBlock['jingle']>, part: JingleVoicePart, take: JingleTake): NonNullable<PodcastBlock['jingle']> {
  const saved = { ...take, id: take.assetId };
  return { ...selectJingleTake(jingle, part, saved), takeHistory: { ...jingle.takeHistory, [part]: [...jingleTakes(jingle, part), saved] } };
}
