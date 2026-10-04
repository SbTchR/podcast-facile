import assert from 'node:assert/strict';
import { loadAudioEngine, typescriptModuleUrl } from './audio-test-module.mjs';
const { getGuidedJinglePlan, getGuidedJingleEndingPlan } = await import(await typescriptModuleUrl(new URL('../src/audio/jinglePlan.ts', import.meta.url)));
const { RADIO_JINGLE_PARTS } = await import(await typescriptModuleUrl(new URL('../src/audio/jingleParts.ts', import.meta.url)));
const { JINGLE_MUSIC_MINIMUMS, JINGLE_MINIMUM_MUSIC } = await import(await typescriptModuleUrl(new URL('../src/audio/adaptiveJinglePlan.ts', import.meta.url)));
const { getBlockDuration } = await loadAudioEngine();
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, actual + ' != ' + expected);
const fixture = (total, durations, scripts) => {
  const assets = [{ id: 'music', duration: total }, ...RADIO_JINGLE_PARTS.map((part, i) => ({ id: part, duration: durations[i] + .4 }))];
  const takes = Object.fromEntries(RADIO_JINGLE_PARTS.map((part, i) => [part, { assetId: part, sourceStart: .2, sourceEnd: durations[i] + .2 }]));
  return { assets, block: { type: 'jingle', jingle: { production: 'guided-v8', musicAssetId: 'music', style: 'modern-radio', takes, scripts } } };
};
const checkReady = ({ block, assets }) => {
  const plan = getGuidedJinglePlan(block, assets);
  assert.equal(plan.ready, true);
  close(getBlockDuration(block, assets), assets[0].duration);
  assert.equal(plan.voices.length, 7);
  for (const [main, echo] of [['title', 'title-echo'], ['intro', 'intro-echo'], ['title-alt', 'title-alt-echo']]) close(plan.starts[echo] - plan.starts[main], Math.max(.15, plan.durations[main] - .5));
  for (const segment of plan.timing.music) {
    assert.ok(segment.duration >= JINGLE_MUSIC_MINIMUMS[segment.slot] - 1e-6);
    assert.ok(segment.start >= 0 && segment.start + segment.duration <= plan.total + 1e-6);
    if (['opening', 'ending'].includes(segment.slot)) assert.ok(segment.duration <= 5 + 1e-6);
  }
  close(plan.timing.music.reduce((sum, segment) => sum + segment.duration, 0) + plan.used, plan.total);
  close(plan.outroStart + plan.timing.music.at(-1).duration, plan.total);
  const end = (main, echo) => Math.max(plan.starts[main] + plan.durations[main], plan.starts[echo] + plan.durations[echo]);
  close(plan.starts.intro - end('title', 'title-echo'), plan.musicBreaks.afterEcho);
  close(plan.starts['title-alt'] - end('intro', 'intro-echo'), plan.musicBreaks.afterIntro);
  close(plan.starts.hook - end('title-alt', 'title-alt-echo'), plan.musicBreaks.afterTitle);
  assert.ok(plan.musicBreaks.afterIntro > plan.musicBreaks.afterTitle || plan.used >= plan.window - .001, 'Presentation gets more breathing room than the second title.');
  return plan;
};
const short = [2, .9, 4, .8, 2, .9, 2.4];
for (const total of [25, 35]) checkReady(fixture(total, short));
const brief = checkReady(fixture(35, [1.4, 1.2, 2.9, .6, 1.4, 1.3, 2.7]));
assert.ok(brief.total - brief.outroStart <= 5 + 1e-6, 'Unused time cannot create a 14-second finale.');
assert.ok(brief.musicBreaks.afterEcho > 2 && brief.musicBreaks.afterIntro > 2 && brief.starts.title > 3);
const long = fixture(35, [2, .9, 9, .9, 2, .9, 5]);
checkReady(long);
assert.equal(getGuidedJinglePlan(long.block, long.assets.map(asset => asset.id === 'music' ? { ...asset, duration: 25 } : asset)).ready, false);
const swapped = checkReady(fixture(35, [2, .9, 3, .9, 2, .9, 11]));
assert.ok(getGuidedJinglePlan(long.block, long.assets).musicBreaks.afterIntro > swapped.musicBreaks.afterIntro, 'Music distribution follows the length of the preceding presentation.');
for (const total of [25, 35]) for (const fraction of [.3, .6, 1]) {
  const assets = [{ id: 'music', duration: total }], block = { type: 'jingle', jingle: { production: 'guided-v8', style: 'modern-radio', musicAssetId: 'music', takes: {}, scripts: { title: 'À la découverte du monde', intro: 'Le podcast qui nous fait découvrir le monde.', hook: 'Épisode un : les voyages de Christophe Colomb.' } } };
  const before = getGuidedJinglePlan(block, assets);
  assert.equal(before.timing.provisional, true);
  for (const part of RADIO_JINGLE_PARTS) {
    const limit = getGuidedJinglePlan(block, assets).limits[part];
    const duration = Math.floor(limit * fraction * 10) / 10;
    assert.ok(duration >= .15, part + ' needs time to speak.');
    assets.push({ id: part, duration });
    block.jingle.takes[part] = { assetId: part, sourceStart: 0, sourceEnd: duration };
    const next = getGuidedJinglePlan(block, assets);
    for (const previous of Object.keys(block.jingle.takes)) assert.ok(next.durations[previous] <= next.limits[previous] + .025, 'Do not invalidate ' + previous + ' after recording ' + part);
  }
  const plan = checkReady({ block, assets });
  assert.equal(plan.timing.provisional, false);
  const ending = getGuidedJingleEndingPlan({ ...block, jingle: { ...block.jingle, ending: { assetId: 'ending', volume: 100 } } }, [...assets, { id: 'ending', duration: 2.9 }]);
  assert.ok(ending.start >= plan.outroStart + .15 - 1e-6 && ending.start + ending.duration <= total - .15 + 1e-6);
}
const prompt = fixture(35, [0, 0, 0, 0, 0, 0, 0], { title: 'Voyage dans le temps', intro: 'Bonjour.', hook: 'Bienvenue.' });
const prepared = getGuidedJinglePlan(prompt.block, prompt.assets);
const verbose = getGuidedJinglePlan({ ...prompt.block, jingle: { ...prompt.block.jingle, scripts: { ...prompt.block.jingle.scripts, intro: 'Le podcast qui vous fait voyager à travers toute notre histoire pour découvrir les civilisations et comprendre notre monde.' } } }, prompt.assets);
assert.ok(verbose.timing.estimates.intro > prepared.timing.estimates.intro);
assert.ok(verbose.limits.hook < prepared.limits.hook, 'A longer prepared introduction reserves more speaking time.');
assert.ok(prepared.limits.title >= 5, 'A longer spoken title may fit even when its prepared text is short.');
assert.ok(prepared.limits.title < prepared.window / 2, 'The first title must leave room for the second version and the sentences.');
const recorded = fixture(35, [2, .9, 4, .8, 2, .9, 2.4], { intro: 'Bonjour.' });
close(checkReady(recorded).starts.hook, checkReady({ ...recorded, block: { ...recorded.block, jingle: { ...recorded.block.jingle, scripts: { intro: 'Un texte extrêmement long qui ne remplace jamais la durée réelle de la prise déjà enregistrée et gardée.' } } } }).starts.hook);
let seed = 16217;
const random = () => { seed = seed * 48271 % 2147483647; return seed / 2147483647; };
for (let i = 0; i < 160; i++) {
  const total = i % 2 ? 35 : 25;
  const durations = RADIO_JINGLE_PARTS.map(part => part.endsWith('-echo') ? .4 + random() * 1.7 : part === 'intro' || part === 'hook' ? 1 + random() * 9 : .8 + random() * 3);
  const data = fixture(total, durations), plan = getGuidedJinglePlan(data.block, data.assets);
  if (plan.used <= total - JINGLE_MINIMUM_MUSIC) checkReady(data);
  else { assert.equal(plan.ready, false); assert.equal(getBlockDuration(data.block, data.assets), 0, 'Overlong speech is never cut to fit.'); }
}
console.log('Adaptive jingles: measured speech, text-aware reservations, fair music distribution, protected 3–5-second edges, overlap, recording limits, legacy-independent timing and fixed-duration endings verified.');
