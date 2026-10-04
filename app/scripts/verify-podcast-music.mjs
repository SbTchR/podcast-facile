import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { typescriptModuleUrl } from './audio-test-module.mjs';

const { AUDIO_LIBRARY, availableLibrarySounds, LIBRARY_CATEGORIES, resolveLibraryAudioUrl } = await import(await typescriptModuleUrl(new URL('../src/data/audioLibrary.ts', import.meta.url)));
const { usedLibraryCredits } = await import(await typescriptModuleUrl(new URL('../src/audio/libraryCredits.ts', import.meta.url)));
const sources = JSON.parse(await readFile(new URL('../public/audio/podcast-music/sources.json', import.meta.url), 'utf8'));
const credits = await readFile(new URL('../public/audio-credits.html', import.meta.url), 'utf8');
const visible = availableLibrarySounds('music');
assert.equal(visible.length, 52);
assert.equal(sources.length, visible.length);
assert.equal(new Set(sources.map(row => row.filename)).size, sources.length, 'Each selection has its own local file.');
assert.equal(new Set(sources.map(row => row.originalSha256)).size, sources.length, 'Different excerpts of the same recording must not inflate the selection.');
const rhythmic = sources.filter(row => row.sourceBpm !== undefined);
assert.equal(rhythmic.length, 20, 'Twenty new rhythmic recordings complement the previous selection.');
for (const row of rhythmic) {
  assert.ok(Number.isInteger(row.sourceBpm) && row.sourceBpm >= 90);
  assert.ok(row.tags.includes(row.sourceBpm + ' bpm') && row.tags.includes('rythmé'), 'Searchable tempo and rhythm tags.');
}
for (const category of ['Funk & hip-hop', 'Électro & dance', 'Rock & sport', 'Rythmes du monde', 'Rétro & jeux']) {
  assert.ok(LIBRARY_CATEGORIES.music.includes(category));
  assert.ok(rhythmic.some(row => row.category === category), 'The new styles have actual recordings.');
}
assert.equal(new Set(AUDIO_LIBRARY.map(preset => preset.id)).size, AUDIO_LIBRARY.length);
for (const id of ['music-medieval-dream', 'music-egyptian-crawl']) assert.ok(visible.some(preset => preset.id === id));
assert.ok(AUDIO_LIBRARY.find(preset => preset.id === 'music-breves-dies').retired, 'Older vocal music remains resolvable without cluttering the new picker.');
assert.equal(AUDIO_LIBRARY.filter(preset => preset.kind === 'music' && preset.retired).length, 57, 'All former references stay available.');
for (const category of LIBRARY_CATEGORIES.music) assert.ok(visible.some(preset => preset.category === category), `Non-empty category: ${category}`);
for (const preset of visible) {
  const row = sources.find(source => source.id === preset.id);
  assert.ok(row?.originalSha256 && row.originalDuration >= row.excerptStart + row.excerptDuration);
  assert.ok(credits.includes(preset.sourcePage) && credits.includes(row.originalTitle));
  assert.ok(preset.attribution.includes(row.originalTitle) && preset.attribution.includes(preset.author) && preset.attribution.includes(preset.licenseUrl));
  assert.ok(preset.duration >= 90 && preset.duration <= 120.1);
  assert.equal(preset.duration, row.preparedDuration);
  assert.equal(preset.clipStart, 0);
  assert.equal(preset.clipDuration, preset.duration, 'The complete prepared bed is available, including the two preserved favourites.');
  assert.ok(preset.license.startsWith('CC BY '));
  assert.equal(resolveLibraryAudioUrl(preset.audioUrl, '/podcast-facile/site/'), '/podcast-facile/site/' + preset.audioUrl);
  const bytes = await readFile(new URL('../public/' + preset.audioUrl, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sha256);
  assert.ok(bytes.length > 100_000 && bytes.length < 3_000_000);
}
const project = {
  sections: [{ id: 'part', audioLayers: [{ id: 'bed', kind: 'music', assetId: 'bed', sourceStart: 0, sourceEnd: 120, start: { edge: 'start' }, end: { edge: 'end' }, repeat: true, volume: 20 }] }],
  blocks: [{ id: 'voice', sectionId: 'part', type: 'voice', assetId: 'voice', duration: 30, trimStart: 0, trimEnd: 30, voiceEffect: 'none', background: { assetId: 'legacy' } }],
  assets: [{ id: 'voice', duration: 30 }, { id: 'bed', duration: 120, libraryId: 'music-podcast-sunday-smooth' }, { id: 'legacy', duration: 120, libraryId: 'music-egyptian-crawl' }, { id: 'unused', duration: 120, libraryId: 'music-podcast-moonlight' }],
};
assert.deepEqual(usedLibraryCredits(project).map(preset => preset.id).sort(), ['music-egyptian-crawl', 'music-podcast-sunday-smooth'].sort(), 'Credit section beds and old voice backgrounds; exclude unused imports.');
project.blocks[0].background.assetId = 'bed';
assert.equal(usedLibraryCredits(project).filter(preset => preset.id === 'music-podcast-sunday-smooth').length, 1, 'One credit per reused track.');
console.log('Podcast music: 52 local beds, two favourites, 57 preserved references, sources, licences, hashes, deployment paths and export credits verified.');
