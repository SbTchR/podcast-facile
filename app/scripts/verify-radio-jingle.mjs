import assert from 'node:assert/strict';
import { loadAudioEngine, typescriptModuleUrl } from './audio-test-module.mjs';
const { getGuidedJinglePlan, JINGLE_TAIL } = await import(await typescriptModuleUrl(new URL('../src/audio/jinglePlan.ts', import.meta.url)));
const { RADIO_JINGLE_PARTS, lastJingleWords, jinglePartScript, jinglePartSpeaker } = await import(await typescriptModuleUrl(new URL('../src/audio/jingleParts.ts', import.meta.url)));
const { composedJingleMusicEnvelope } = await import(await typescriptModuleUrl(new URL('../src/audio/guidedJingle.ts', import.meta.url)));
const { getBlockDuration } = await loadAudioEngine();
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);
const draft = { type: 'jingle', jingle: { production: 'guided-v7', style: 'modern-radio', musicAssetId: 'music', takes: {} } };
const durations = [1.8, .9, 4.3, .9, 1.8, .9, 2.7];
const assets = [{ id: 'music', duration: 25 }, ...RADIO_JINGLE_PARTS.map((part, i) => ({ id: part, duration: durations[i] + .4 }))];
const takes = Object.fromEntries(RADIO_JINGLE_PARTS.map((part, i) => [part, { assetId: part, sourceStart: .2, sourceEnd: durations[i] + .2 }]));
const block = { ...draft, jingle: { ...draft.jingle, takes } };
const plan = getGuidedJinglePlan(block, assets);
assert.equal(plan.ready, true);
assert.equal(getBlockDuration(block, assets), 25);
assert.equal(plan.voices.length, 7);
assert.deepEqual(plan.voices.map(cue => cue.part), RADIO_JINGLE_PARTS);
assert.equal(new Set(plan.voices.map(cue => takes[cue.part].assetId)).size, 7, 'Each voice and reply has its own recording.');
for (const [main, echo] of [['title', 'title-echo'], ['intro', 'intro-echo'], ['title-alt', 'title-alt-echo']]) {
  close(plan.starts[echo], plan.starts[main] + plan.durations[main] - .5);
  assert.ok(plan.voices.find(cue => cue.part === echo).echo);
}
const end = part => plan.starts[part] + plan.durations[part];
close(plan.starts.intro - Math.max(end('title'), end('title-echo')), 2);
close(plan.starts['title-alt'] - Math.max(end('intro'), end('intro-echo')), plan.musicBreaks.afterIntro);
close(plan.starts.hook - Math.max(end('title-alt'), end('title-alt-echo')), 1.5);
assert.ok(plan.total - plan.outroStart >= JINGLE_TAIL);
for (const part of RADIO_JINGLE_PARTS) assert.equal(getBlockDuration(block, assets.filter(asset => asset.id !== part)), 0, 'An absent reply cannot be substituted by the full phrase.');
const tiny = { ...block, jingle: { ...block.jingle, takes: { ...takes, title: { ...takes.title, sourceEnd: .4 } } } };
const tinyPlan = getGuidedJinglePlan(tiny, assets);
assert.ok(tinyPlan.starts['title-echo'] >= tinyPlan.starts.title + .15, 'An exceptionally short title never puts the reply before the title.');
assert.equal(lastJingleWords('« Voyage dans le monde et dans le temps ! »'), 'dans le temps');
assert.equal(lastJingleWords('Destination Deutschland'), 'Destination Deutschland');
assert.equal(lastJingleWords(''), '');
assert.equal(jinglePartScript({ scripts: { title: 'À la découverte du monde' } }, '', 'title-echo'), 'découverte du monde');
assert.equal(jinglePartScript({ scripts: { 'intro-echo': 'le monde' } }, '', 'intro-echo'), 'le monde', 'An edited reply is preserved.');
assert.equal(jinglePartSpeaker({ introVoices: 'duo' }, 'intro'), 'Voix 1 + voix 2');
assert.equal(jinglePartSpeaker({ hookVoice: 'voice-2' }, 'hook'), 'Voix 2');
const envelope = composedJingleMusicEnvelope(plan, 1, .32);
const levelAt = at => {
  for (let i = 1; i < envelope.length; i++) if (at <= envelope[i][0]) {
    const [before, from] = envelope[i - 1], [after, to] = envelope[i];
    return from + (to - from) * (at - before) / Math.max(.00001, after - before);
  }
  return envelope.at(-1)[1];
};
for (const cue of plan.voices) close(levelAt(cue.start + cue.duration / 2), .32);
close(levelAt(end('title-echo') + .6), 1);
close(levelAt(plan.outroStart + 1), 1.35);
for (const total of [25, 35]) for (const fraction of [.5, .8, 1]) {
  const available = [{ id: 'music', duration: total }];
  const recorded = { ...draft, jingle: { ...draft.jingle, takes: {} } };
  for (const part of RADIO_JINGLE_PARTS) {
    const maximum = getGuidedJinglePlan(recorded, available).limits[part];
    const duration = Math.floor(maximum * fraction * 10) / 10;
    assert.ok(duration >= .15, `${part} needs useful recording time.`);
    available.push({ id: part, duration });
    recorded.jingle.takes[part] = { assetId: part, sourceStart: 0, sourceEnd: duration };
    const after = getGuidedJinglePlan(recorded, available);
    for (const earlier of Object.keys(recorded.jingle.takes)) assert.ok(after.durations[earlier] <= after.limits[earlier] + .025, `${part} must not invalidate ${earlier}.`);
  }
  const complete = getGuidedJinglePlan(recorded, available);
  assert.equal(complete.ready, true, 'Even all seven displayed maxima fit the music.');
  assert.ok(complete.total - complete.outroStart >= JINGLE_TAIL - .001);
  for (const part of RADIO_JINGLE_PARTS) {
    const duration = complete.limits[part];
    const replaced = { ...recorded, jingle: { ...recorded.jingle, takes: { ...recorded.jingle.takes, [part]: { assetId: part, sourceStart: 0, sourceEnd: duration } } } };
    assert.equal(getGuidedJinglePlan(replaced, available.map(asset => asset.id === part ? { ...asset, duration } : asset)).ready, true);
  }
}
const overlong = { ...block, jingle: { ...block.jingle, takes: { ...takes, intro: { assetId: 'long-intro', sourceStart: 0, sourceEnd: 10 } } } };
assert.equal(getBlockDuration(overlong, [...assets, { id: 'long-intro', duration: 10 }]), 0, 'Never cut the speech or musical ending to force a short bed.');
assert.equal(getBlockDuration(overlong, [...assets.map(asset => asset.id === 'music' ? { ...asset, duration: 35 } : asset), { id: 'long-intro', duration: 10 }]), 35, 'The longer bed keeps all seven recordings.');
console.log('Radio jingles: seven independent takes, half-second reply overlap, recording budgets, music breaks, retained prompts and no truncated speech verified.');
