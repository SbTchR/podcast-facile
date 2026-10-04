import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { typescriptModuleUrl, loadAudioEngine } from './audio-test-module.mjs';
const { AUDIO_LIBRARY, availableLibrarySounds, SOUND_CATEGORIES, resolveLibraryAudioUrl } = await import(await typescriptModuleUrl(new URL('../src/data/audioLibrary.ts', import.meta.url)));
const sources = JSON.parse(await readFile(new URL('../public/audio/curated-sounds/sources.json', import.meta.url), 'utf8'));
sources.push(...JSON.parse(await readFile(new URL('../public/audio/podcast-transitions/sources.json', import.meta.url), 'utf8')));
const credits = await readFile(new URL('../public/audio-credits.html', import.meta.url), 'utf8');
const effects = availableLibrarySounds('sfx');
const ambiences = availableLibrarySounds('sfx', 'ambience');
assert.ok(effects.length >= 100, 'Keep a broad palette of short actions and recognizable effects.');
assert.ok(ambiences.length >= 55, 'Keep a broad palette of historical scenes and background settings.');
assert.equal(sources.length, effects.length + ambiences.length, 'Every visible sound has a maintained local source.');
assert.ok(availableLibrarySounds('music').length >= 2, 'Music choices remain separate from the effects and ambiences.');
assert.equal(new Set(AUDIO_LIBRARY.map(p=>p.id)).size, AUDIO_LIBRARY.length);
assert.ok(AUDIO_LIBRARY.find(p=>p.id==='sfx-medieval-battle-ambience')?.retired, 'Former IDs remain readable but leave the new picker.');
assert.ok(!effects.some(p=>p.soundGroup==='ambience') && !ambiences.some(p=>p.soundGroup!=='ambience'));
for (const id of ['sfx-history-canon', 'sfx-history-fusil', 'sfx-history-choc-epees', 'sfx-history-rechargement', 'sfx-history-cheval-trot', 'sfx-history-rames', 'sfx-history-camions-ww2']) {
  assert.ok(effects.some(p=>p.id===id), `Recognizable historical action stays available: ${id}`);
}
for (const id of ['ambience-bataille-medievale', 'ambience-bataille-navale', 'ambience-marche-medieval', 'ambience-front-ww2', 'ambience-voilier', 'ambience-locomotive-vapeur', 'ambience-forge', 'ambience-manifestation', 'ambience-montagne-soir']) {
  assert.ok(ambiences.some(p=>p.id===id), `Requested historical/geography/current-affairs setting stays available: ${id}`);
}
assert.equal(effects[0].category, 'Batailles et armes', 'The enlarged historical selection is easy to find.');
assert.equal(ambiences[0].category, 'Histoire et batailles');
for (const preset of [...effects, ...ambiences]) {
  const row = sources.find(row=>row.id===preset.id);
  assert.ok(row && (row.originalSha256 || row.downloadSha256) && row.sourcePage===preset.sourcePage && credits.includes(preset.sourcePage));
  assert.equal(preset.license, 'CC0');
  assert.ok(SOUND_CATEGORIES[preset.soundGroup].includes(preset.category));
  assert.equal(preset.duration, row.preparedDuration);
  assert.ok(preset.duration > .2 && preset.duration <= (preset.soundGroup==='ambience' ? 30 : 12));
  assert.ok(preset.attribution.includes(row.author), 'Keep the actual recording author.');
  if (row.mix) {
    assert.equal(preset.origin, 'reconstruction');
    assert.ok(preset.title.includes('reconstitution'), 'A designed historical setting is explicitly labelled.');
    assert.ok(row.components.length >= 2);
    for (const component of row.components) {
      assert.equal(component.license, 'CC0');
      assert.ok(credits.includes(component.sourcePage) && credits.includes(component.author));
      assert.equal(component.sha256, sources.find(source=>source.id===component.id)?.sha256, 'Composite credits and recipes refer to the actual prepared source.');
    }
  }
  const file = await readFile(new URL(`../public/${preset.audioUrl}`, import.meta.url));
  assert.equal(createHash('sha256').update(file).digest('hex'),row.sha256);
  assert.ok(file.length > 1000 && file.length < 500000, 'Compact local excerpts avoid full-recording download delays.');
  assert.equal(resolveLibraryAudioUrl(preset.audioUrl, '/site/'), '/site/'+preset.audioUrl, 'Local playback must respect GitHub Pages base paths.');
}
assert.equal(resolveLibraryAudioUrl('https://example.test/a.mp3','/site/'),'https://example.test/a.mp3');
const { getTimeline } = await loadAudioEngine();
const { resolveSectionLayers } = await import(await typescriptModuleUrl(new URL('../src/audio/sectionLayers.ts', import.meta.url)));
const project = { sections: [{id:'part',audioLayers:[{id:'amb',kind:'sfx',soundGroup:'ambience',assetId:'sea',sourceStart:0,sourceEnd:30,start:{edge:'start'},end:{edge:'end'},repeat:true,volume:35}]}], blocks:[{id:'voice',sectionId:'part',type:'voice',duration:75,trimStart:0,trimEnd:75,voiceEffect:'none'}],assets:[{id:'sea',duration:30}] };
const layer=resolveSectionLayers(project,getTimeline(project))[0];
assert.equal(layer.end-layer.start,75,'A 30 s ambience can cover longer voices, including the last loop.');
assert.equal(layer.sourceEnd,30,'Coverage does not enlarge the source excerpt.');
console.log(`Curated sounds: ${effects.length} effects and ${ambiences.length} ambiences; historical coverage, local hashes, reconstruction sources, credits, deployment paths and long loops verified.`);
