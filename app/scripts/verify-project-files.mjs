import assert from 'node:assert/strict';
import { typescriptModuleUrl } from './audio-test-module.mjs';
const { serializeProject, deserializeProject } = await import(await typescriptModuleUrl(new URL('../src/storage/projectFile.ts', import.meta.url)));
const { saveFile } = await import(await typescriptModuleUrl(new URL('../src/storage/saveFile.ts', import.meta.url)));
const { audioBufferToWav, getBlockDuration } = await import(await typescriptModuleUrl(new URL('../src/audio/engine.ts', import.meta.url)));
const { recordingMimeType } = await import(await typescriptModuleUrl(new URL('../src/audio/recording.ts', import.meta.url)));
globalThis.FileReader = class {
  readAsDataURL(blob) {
    void blob.arrayBuffer().then(bytes => { this.result = `data:${blob.type};base64,${Buffer.from(bytes).toString('base64')}`; this.onload(); });
  }
};
const bytes = [0, 255, 127, 32, 1, 128];
const asset = id => ({ id, name: id, mimeType: 'audio/webm;codecs=opus', duration: 4.2, source: 'recording', blob: new Blob([new Uint8Array(bytes)], { type: 'audio/webm;codecs=opus' }) });
const project = {
 id: 'original', title: 'Émission à reprendre', author: 'Classe', templateId: 'guided', createdAt: '2026-10-01', updatedAt: '2026-10-05',
 sections: [{ id: 'part', title: 'Partie 1', collapsed: true, audioLayers: [{ id: 'layer', assetId: 'sound', start: { edge: 'start', blockId: 'voice', seconds: 2 }, volume: 23, sourceStart: .4, sourceEnd: 2.7 }] }],
 blocks: [
  { id: 'voice', sectionId: 'part', type: 'voice', assetId: 'voice-audio', script: 'Le texte français\nDie deutsche Stimme 🎙', speaker: 'voice-2', trimStart: .7, trimEnd: 3.8, voiceEffect: 'phone', background: { assetId: 'music', volume: 29 }, voiceCues: [{ assetId: 'sound', at: 1.4 }] },
  { id: 'draft', sectionId: 'part', type: 'voice', script: 'Texte sans enregistrement' },
  { id: 'jingle', sectionId: 'part', type: 'jingle', jingle: { production: 'guided-v9', musicAssetId: 'music', scripts: { title: 'Titre écrit', 'title-echo': 'Réponse personnalisée', intro: 'Introduction écrite', hook: 'Accroche écrite' }, takes: { title: { assetId: 'voice-audio', sourceStart: .2, sourceEnd: 2 }, hook: { assetId: 'disabled-take', sourceStart: 0, sourceEnd: 1.2 } }, enabledParts: { hook: false }, effects: { title: { reverb: 75, enhancement: 45, phone: 12 } }, ending: { assetId: 'sound', volume: 50, presetId: 'end' } } },
 ], assets: ['voice-audio', 'music', 'sound', 'disabled-take', 'unused-retained'].map(asset),
};
const file = await serializeProject(project);
const restored = await deserializeProject(new File([file], 'project.podfacile'));
assert.deepEqual(restored.blocks, project.blocks);
assert.deepEqual(restored.sections, project.sections);
assert.notEqual(restored.id, project.id);
for (const [i, audio] of restored.assets.entries()) {
 assert.deepEqual([...new Uint8Array(await audio.blob.arrayBuffer())], bytes);
 assert.equal(audio.mimeType, project.assets[i].mimeType);
}
assert.equal(JSON.parse(await file.text()).version, 1, 'Existing project format remains compatible.');
await assert.rejects(serializeProject({ ...project, assets: project.assets.filter(a => a.id !== 'disabled-take') }), /introuvable/);
await assert.rejects(serializeProject({ ...project, assets: [{ ...asset('voice-audio'), blob: new Blob() }, ...project.assets.slice(1)] }), /vide/);
await assert.rejects(deserializeProject(new File(['{}'], 'bad.podfacile')), /valide/);
const options = { filename: 'project.podfacile', description: 'Project', mimeType: 'application/json', extension: '.podfacile', createBlob: async () => { events.push('render'); return file; }, onReady: () => events.push('ready') };
let events = [];
globalThis.window = { isSecureContext: true, showSaveFilePicker: opts => { events.push('picker'); assert.equal(opts.startIn, 'downloads'); assert.equal(opts.suggestedName, options.filename); return Promise.resolve({ createWritable: async () => ({ write: async blob => { assert.equal(blob, file); events.push('write'); }, close: async () => events.push('close'), abort: async () => events.push('abort') }) }); } };
const operation = saveFile(options);
assert.deepEqual(events, ['picker'], 'Picker opens synchronously before asynchronous rendering.');
assert.equal(await operation, 'saved');
assert.deepEqual(events, ['picker', 'render', 'write', 'close']);
events = []; window.showSaveFilePicker = async () => { throw new DOMException('cancel', 'AbortError'); };
assert.equal(await saveFile(options), 'cancelled'); assert.deepEqual(events, []);
events = []; delete window.showSaveFilePicker;
assert.equal(await saveFile(options), 'ready'); assert.deepEqual(events, ['render', 'ready']);
events = []; window.showSaveFilePicker = async () => { throw new DOMException('frame', 'SecurityError'); };
assert.equal(await saveFile(options), 'ready'); assert.deepEqual(events, ['render', 'ready']);
events = []; window.showSaveFilePicker = async () => { throw new DOMException("Failed to execute 'showSaveFilePicker' on 'Window': Intercepted by Page.setInterceptFileChooserDialog().", 'AbortError'); };
assert.equal(await saveFile(options), 'ready'); assert.deepEqual(events, ['render', 'ready'], 'An intercepted native chooser must not silently cancel the download.');
events = []; window.showSaveFilePicker = async () => { throw new Error('Native chooser unavailable'); };
assert.equal(await saveFile(options), 'ready'); assert.deepEqual(events, ['render', 'ready']);
events = []; window.showSaveFilePicker = async () => ({ createWritable: async () => ({ write: async () => { throw new Error('disk full'); }, close: async () => events.push('close'), abort: async () => events.push('abort') }) });
await assert.rejects(saveFile(options), /disk full/); assert.deepEqual(events, ['render', 'abort']);
const supported = type => type.includes('opus') || type.includes('mp4');
assert.match(recordingMimeType('Version/26.0 Safari/605.1.15', supported), /mp4/);
assert.match(recordingMimeType('Chrome/140.0 Safari/537.36', supported), /opus/);
assert.match(recordingMimeType('iPhone CriOS/140.0 Safari/604.1', supported), /mp4/);
console.log('Portable backup: all texts, drafts, edits, disabled takes and exact audio bytes restored; save picker ordering, cancellation, fallback, write errors and Safari codec selection verified.');

const pcm = [new Float32Array([.5, -.5, 0, 2]), new Float32Array([.25, -.25, 0, 1])];
const wav = audioBufferToWav({ numberOfChannels: 2, sampleRate: 48000, length: 4, copyFromChannel: (destination, channel) => destination.set(pcm[channel]), getChannelData: () => { throw new Error('Never depend on live channel views.'); } });
const view = new DataView(await wav.arrayBuffer());
assert.equal(view.getUint32(24, true), 48000); assert.equal(view.getUint16(22, true), 2); assert.equal(view.getUint16(34, true), 16);
assert.equal(view.getUint32(40, true), 16); assert.equal(view.byteLength, 60);
assert.equal(view.getInt16(44, true), Math.trunc(.5 * .49 * 32767));
assert.equal(view.getInt16(46, true), Math.trunc(.25 * .49 * 32767));
assert.equal(view.getInt16(56, true), Math.trunc(.98 * 32767));
assert.throws(() => audioBufferToWav({ numberOfChannels: 1, sampleRate: 44100, length: 1, copyFromChannel: destination => destination.set([NaN]) }), /invalides/);
assert.equal(getBlockDuration({ type: 'voice', script: 'Text only', duration: 10 }), 0);
console.log('WAV: owned PCM buffers, valid stereo headers, linked peak protection, invalid samples and silent text drafts verified.');
