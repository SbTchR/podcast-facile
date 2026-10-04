import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { typescriptModuleUrl, loadAudioEngine } from './audio-test-module.mjs';

const directory = new URL('../public/audio/podcast-transitions/', import.meta.url);
const rows = JSON.parse(await readFile(new URL('sources.json', directory), 'utf8'));
const { PODCAST_TRANSITIONS, TRANSITION_RECORDINGS } = await import(await typescriptModuleUrl(new URL('../src/data/podcastTransitions.ts', import.meta.url)));
const { AUDIO_LIBRARY, availableLibrarySounds } = await import(await typescriptModuleUrl(new URL('../src/data/audioLibrary.ts', import.meta.url)));
const { transitionVolumeValue, getBlockDuration } = await loadAudioEngine();
assert.equal(rows.length, 27);
assert.equal(new Set(rows.map(row => row.sha256)).size, 27, 'Each choice must offer a distinct sound.');
assert.equal(new Set(AUDIO_LIBRARY.map(row => row.id)).size, AUDIO_LIBRARY.length, 'Library IDs must stay unique.');
assert.equal(TRANSITION_RECORDINGS.length, rows.length);
const rmsValues = [];
for (const row of rows) {
  const preset = PODCAST_TRANSITIONS.find(preset => preset.id === row.id);
  assert.ok(preset && availableLibrarySounds('sfx').some(preset => preset.id === row.id));
  assert.equal(row.license, 'CC0');
  assert.ok(row.downloadSha256.match(/^[a-f0-9]{64}$/));
  assert.ok(row.sourcePage.startsWith('https://'));
  assert.equal(preset.duration, row.preparedDuration);
  const bytes = await readFile(new URL(row.filename, directory));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sha256, row.id);
  const result = spawnSync('ffmpeg', ['-v', 'error', '-i', new URL(row.filename, directory).pathname, '-ar', '44100', '-ac', '2', '-f', 'f32le', '-'], { maxBuffer: 5e6 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr?.toString() ?? 'Audio decoding failed.');
  const samples = new Float32Array(result.stdout.buffer, result.stdout.byteOffset, result.stdout.length / 4);
  const seconds = samples.length / (44100 * 2);
  assert.ok(seconds > .2 && seconds <= 8, `${row.id}: ${seconds}s`);
  assert.ok(Math.abs(seconds - preset.duration) < .002, 'Preview and inserted durations must match.');
  let peak = 0;
  const windows = [];
  for (let i = 0; i < samples.length; i += 882) {
    let energy = 0;
    const end = Math.min(samples.length, i + 882);
    for (let j = i; j < end; j++) { energy += samples[j] ** 2; peak = Math.max(peak, Math.abs(samples[j])); }
    windows.push(Math.sqrt(energy / (end - i)));
  }
  const loudest = Math.max(...windows);
  const active = windows.filter(level => level >= loudest * .08);
  const rmsDb = 20 * Math.log10(Math.sqrt(active.reduce((sum, value) => sum + value ** 2, 0) / active.length));
  assert.ok(rmsDb >= -20 && rmsDb <= -16, `${row.id}: audible body ${rmsDb.toFixed(1)} dBFS`);
  assert.ok(peak < .95, `${row.id}: encoding needs peak headroom`);
  assert.ok(windows.slice(0, 10).some(value => value >= loudest * .015), `${row.id}: excessive leading silence`);
  rmsValues.push(rmsDb);
}
assert.ok(Math.max(...rmsValues) - Math.min(...rmsValues) < 2, 'Choices must have comparable listening levels.');
for (const id of ['sfx-dull-thud', 'sfx-pen-drop', 'sfx-car-horn', 'sfx-airplane-chime']) {
  assert.ok(AUDIO_LIBRARY.some(preset => preset.id === id && preset.retired), 'Keep saved-project sources: ' + id);
}
assert.equal(transitionVolumeValue('normal'), .34, 'Existing projects keep their previous gain.');
assert.equal(transitionVolumeValue('normal', rows[0].id), .75);
assert.ok(transitionVolumeValue('low', rows[0].id) < transitionVolumeValue('normal', rows[0].id));
assert.ok(transitionVolumeValue('high', rows[0].id) > transitionVolumeValue('normal', rows[0].id));
console.log(`27 distinct CC0 transitions decoded: 0.2–8s, active RMS ${Math.min(...rmsValues).toFixed(1)} to ${Math.max(...rmsValues).toFixed(1)} dBFS, no clipping; catalogue, hashes and legacy compatibility verified.`);

const longRadio = rows.filter(row => row.id.startsWith('sfx-transition-radio-'));
assert.equal(longRadio.length, 3);
for (const row of longRadio) {
  assert.ok(row.preparedDuration >= 5.5 && row.preparedDuration <= 8);
  const block = { type: 'transition', assetId: 'radio', duration: row.preparedDuration };
  assert.equal(getBlockDuration(block, [{id:'radio', libraryId:row.id}]), row.preparedDuration, 'Long radio transitions must not be truncated in the timeline.');
  assert.equal(getBlockDuration(block, [{id:'radio', libraryId:'sfx-airplane-chime'}]), 4, 'Keep the legacy duration cap.');
}

for (const id of ['page-slow', 'page-paper', 'page-flip', 'buzzer-show', 'buzzer-arcade', 'pop', 'boing', 'glitch', 'boom', 'ding']) {
  assert.ok(rows.some(row => row.id === 'sfx-transition-' + id), 'Keep the requested expanded palette: ' + id);
}
for (const id of ['page-slow', 'page-paper', 'page-flip']) {
  const row = rows.find(row => row.id === 'sfx-transition-' + id);
  assert.ok(row.preparedDuration > 1.2, 'New page turns must be longer than the original 0.45s clip.');
}
assert.ok(rows.find(row => row.id === 'sfx-transition-page-flip').preparedDuration > 5);
