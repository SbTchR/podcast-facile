import assert from 'node:assert/strict';
import { typescriptModuleUrl, loadAudioEngine } from './audio-test-module.mjs';
const { getGuidedJinglePlan, getGuidedJingleEndingPlan } = await import(await typescriptModuleUrl(new URL('../src/audio/jinglePlan.ts', import.meta.url)));
const { RADIO_JINGLE_PARTS } = await import(await typescriptModuleUrl(new URL('../src/audio/jingleParts.ts', import.meta.url)));
const { composedJingleMusicEnvelope } = await import(await typescriptModuleUrl(new URL('../src/audio/guidedJingle.ts', import.meta.url)));
const { getBlockDuration } = await loadAudioEngine();
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, actual + ' != ' + expected);
const durations = [2, .9, 4, .8, 2, .9, 2.4];
const assets = [{ id: 'music', duration: 25 }, { id: 'ending', duration: 3 }, ...RADIO_JINGLE_PARTS.map((id, i) => ({ id, duration: durations[i] }))];
const takes = Object.fromEntries(RADIO_JINGLE_PARTS.map((part, i) => [part, { assetId: part, sourceStart: 0, sourceEnd: durations[i] }]));
const jingle = { production: 'guided-v9', style: 'modern-radio', musicAssetId: 'music', takes, ending: { assetId: 'ending', volume: 65 } };
// Every combination, including reply-only and music-only, has a complete fixed bed.
for (let mask = 0; mask < 128; mask++) {
  const enabledParts = Object.fromEntries(RADIO_JINGLE_PARTS.map((part, i) => [part, Boolean(mask & 1 << i)]));
  const block = { type: 'jingle', jingle: { ...jingle, enabledParts } };
  const plan = getGuidedJinglePlan(block, assets);
  assert.equal(plan.ready, true);
  close(getBlockDuration(block, assets), 25);
  assert.equal(plan.voices.length, RADIO_JINGLE_PARTS.filter(part => enabledParts[part]).length);
  close(plan.used + plan.timing.music.reduce((sum, segment) => sum + segment.duration, 0), 25);
  close(plan.outroStart + plan.timing.music.at(-1).duration, 25);
  for (const cue of plan.voices) {
    assert.ok(enabledParts[cue.part]);
    close(cue.duration, takes[cue.part].sourceEnd);
    assert.ok(cue.start >= 3 && cue.start + cue.duration <= 22 + 1e-6);
  }
  for (const segment of plan.timing.music) assert.ok(segment.duration >= 0 && segment.start + segment.duration <= 25 + 1e-6);
  const envelope = composedJingleMusicEnvelope(plan, .5, .15);
  assert.ok(envelope.every(([at, volume]) => Number.isFinite(at) && at >= 0 && at <= 25 && volume >= 0));
  const ending = getGuidedJingleEndingPlan(block, assets);
  assert.ok(ending.start >= plan.outroStart && ending.start + ending.duration <= 25);
  // Disabling is reversible; source takes are never removed or modified.
  assert.deepEqual(block.jingle.takes, takes);
}
const missing = { type: 'jingle', jingle: { ...jingle, takes: { hook: takes.hook } } };
assert.equal(getGuidedJinglePlan(missing, assets).complete, false);
const onlyHook = { ...missing, jingle: { ...missing.jingle, enabledParts: Object.fromEntries(RADIO_JINGLE_PARTS.filter(part => part !== 'hook').map(part => [part, false])) } };
assert.equal(getGuidedJinglePlan(onlyHook, assets).ready, true, 'Any single take can be recorded first and used by itself.');
const overlong = { type: 'jingle', jingle: { ...jingle, takes: { ...takes, intro: { assetId: 'long', sourceStart: 0, sourceEnd: 40 } } } };
const tooLong = getGuidedJinglePlan(overlong, [...assets, { id: 'long', duration: 40 }]);
assert.equal(tooLong.complete, true);
assert.equal(tooLong.ready, false);
close(tooLong.durations.intro, 40);
close(getBlockDuration(overlong, [...assets, { id: 'long', duration: 40 }]), 0);
assert.equal(getGuidedJinglePlan({ ...overlong, jingle: { ...overlong.jingle, enabledParts: { intro: false } } }, assets).ready, true);
console.log('Flexible jingles: 128 optional combinations, full takes, independent order, continuous music, ending placement and overrun protection verified.');
