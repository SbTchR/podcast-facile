import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { loadAudioEngine } from './audio-test-module.mjs';

const sourceUrl = new URL('../src/audio/libraryPreview.ts', import.meta.url);
const libraryUrl = new URL('../src/data/audioLibrary.ts', import.meta.url);
const code = stripTypeScriptTypes(await readFile(sourceUrl, 'utf8')).replace("'../data/audioLibrary'", JSON.stringify(libraryUrl.href));
const { createLibraryPreviewSession, getLibraryPreviewDuration } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const { getBlockDuration } = await loadAudioEngine();

globalThis.window = { setTimeout, clearTimeout };
const instances = [];
let behavior = 'ready';
class FakeAudio {
  currentTime = 0;
  duration = 30;
  src = '';
  pauses = 0;
  released = false;
  constructor() { instances.push(this); }
  setAttribute() {}
  removeAttribute() { this.src = ''; this.released = true; }
  pause() { this.pauses++; }
  load() {}
  play() {
    if (behavior === 'pending') return new Promise(() => {});
    if (behavior === 'blocked') return Promise.reject(new DOMException('blocked', 'NotAllowedError'));
    if (this.src.includes('missing')) return Promise.reject(new Error('HTTP 404'));
    this.onloadedmetadata?.();
    return Promise.resolve();
  }
}
globalThis.Audio = FakeAudio;
const preset = { id: 'regression', duration: 1200, audioUrl: 'https://example.test/audio.mp3', fallbackUrl: 'https://example.test/fallback.ogg', clipStart: 4, clipDuration: 15 };
assert.equal(getLibraryPreviewDuration(preset), 12);
assert.equal(getLibraryPreviewDuration({ ...preset, duration: 1.5, clipDuration: undefined }), 1.5);

const controller = new AbortController();
const session = await createLibraryPreviewSession(preset, controller.signal);
const audio = instances.at(-1);
assert.equal(audio.src, preset.audioUrl, 'Preview must stream directly, without waiting for a full Blob.');
assert.equal(audio.currentTime, 4, 'Suggested excerpt start must be respected.');
assert.equal(session.totalDuration, 12);
audio.currentTime = 7;
assert.equal(session.getElapsed(), 3);
controller.abort();
assert.ok(audio.released && audio.pauses > 0, 'Cancellation must release the media source.');
assert.equal(session.getElapsed(), 12);

const fallback = await createLibraryPreviewSession({ ...preset, audioUrl: 'https://example.test/missing.mp3' }, new AbortController().signal);
assert.equal(instances.at(-1).src, preset.fallbackUrl);
assert.ok(instances.at(-2).released, 'Failed primary media must be released before fallback.');
fallback.stop();

behavior = 'pending';
const pendingController = new AbortController();
const pending = createLibraryPreviewSession(preset, pendingController.signal);
pendingController.abort();
await assert.rejects(pending, { name: 'AbortError' });
assert.ok(instances.at(-1).released);

behavior = 'blocked';
const before = instances.length;
await assert.rejects(createLibraryPreviewSession(preset, new AbortController().signal), { name: 'NotAllowedError' });
assert.equal(instances.length, before + 1, 'Permission failure must not try more remote URLs.');

behavior = 'pending';
globalThis.window.setTimeout = (callback) => setTimeout(callback, 0);
await assert.rejects(createLibraryPreviewSession(preset, new AbortController().signal), /Vérifie ta connexion/);
assert.ok(instances.slice(-2).every((item) => item.released), 'Both timeout attempts must release their sources.');

const jingle = { type: 'jingle', duration: 10, jingle: { style: 'dynamic', musicLevel: 'low' } };
assert.equal(getBlockDuration(jingle, []), 0, 'Unprepared jingles must not create silence.');
assert.equal(getBlockDuration({ ...jingle, jingle: { ...jingle.jingle, musicAssetId: 'music' } }, [{ id: 'music', duration: 40 }]), 10);
assert.equal(getBlockDuration({ ...jingle, jingle: { ...jingle.jingle, voiceAssetId: 'voice' } }, [{ id: 'voice', duration: 8 }]), 13);
console.log('Streaming, excerpt timing, fallback, cancellation, permission failure, timeouts and empty jingles verified.');
