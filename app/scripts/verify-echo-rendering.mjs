import assert from 'node:assert/strict';
import { typescriptModuleUrl } from './audio-test-module.mjs';
const { connectEcho } = await import(await typescriptModuleUrl(new URL('../src/audio/echo.ts', import.meta.url)));
const { connectRadioJingleVoice } = await import(await typescriptModuleUrl(new URL('../src/audio/radioJingleVoice.ts', import.meta.url)));

function graph() {
  const nodes = [];
  const node = (kind) => {
    const n = { kind, outputs: [], connect(other) { this.outputs.push(other); return other; } };
    for (const key of ['gain', 'delayTime', 'frequency', 'Q', 'threshold', 'knee', 'ratio', 'attack', 'release']) n[key] = { value: 0 };
    nodes.push(n); return n;
  };
  const context = { sampleRate: 44100, createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; } };
  for (const type of ['Gain', 'Delay', 'BiquadFilter', 'Convolver', 'DynamicsCompressor', 'WaveShaper']) context[`create${type}`] = () => node(type);
  const verify = () => {
    const visit = (n, ancestors) => { assert(!ancestors.has(n), 'Safari offline rendering must never traverse a feedback cycle.'); for (const next of n.outputs) visit(next, new Set([...ancestors, n])); };
    for (const n of nodes) visit(n, new Set());
  };
  return { context, node, verify };
}
// Independently sum impulse paths: every audible repeat must retain the old
// feedback echo's delay and gain, without a graph cycle.
for (const [seconds, feedback] of [[.095, .18], [.22, .24]]) {
  const g = graph(), input = g.node('input'), output = g.node('output');
  connectEcho(g.context, input, output, seconds, feedback); g.verify();
  const impulses = [];
  const walk = (n, delay, gain) => {
    if (n === output) { impulses.push([delay, gain]); return; }
    for (const next of n.outputs) walk(next, delay + (next.kind === 'Delay' ? next.delayTime.value : 0), gain * (next.kind === 'Gain' ? next.gain.value : 1));
  };
  walk(input, 0, 1);
  assert(impulses.length > 4 && impulses.length < 10);
  impulses.sort((a, b) => a[0] - b[0]);
  impulses.forEach(([at, level], i) => { assert(Math.abs(at - (i + 1) * seconds) < 1e-10); assert(Math.abs(level - feedback ** i) < 1e-10); });
  assert(feedback ** impulses.length < .0001, 'Only the tail below -80 dB may be omitted.');
}
// Cover both default and customised reply processing: changing a slider must
// not silently reintroduce the cycle that crashes the next source creation.
for (const effects of [undefined, { reverb: 50, enhancement: 60, phone: 70 }]) {
  for (const part of ['title', 'title-echo', 'intro', 'intro-echo', 'title-alt', 'title-alt-echo', 'hook']) {
    const g = graph();
    connectRadioJingleVoice(g.context, g.node('input'), g.node('output'), 'modern-radio', part, true, effects);
    g.verify();
  }
}
console.log('Echo regression: acyclic default/custom jingle graphs, original repeat timing/gain and inaudible tail cutoff verified.');

const { createProjectOfflineContext } = await import(await typescriptModuleUrl(new URL('../src/audio/offlineContext.ts', import.meta.url)));
const events = [];
globalThis.OfflineAudioContext = class {
  constructor(...args) { assert.deepEqual(args, [2, 44100, 44100]); }
  createBufferSource() {
    assert(!events.some(event => event[0] === 'start'), 'Every source must be created before any is activated.');
    const source = { start(...args) { assert.equal(this, source); events.push(['start', ...args]); }, stop(...args) { assert.equal(this, source); events.push(['stop', ...args]); } };
    return source;
  }
  startRendering() { events.push(['render']); return Promise.resolve('rendered'); }
};
const context = createProjectOfflineContext(2, 44100, 44100);
const first = context.createBufferSource(); first.start(0, .2, .6); first.stop(.63);
const second = context.createBufferSource(); second.start(.4); second.stop(.9);
assert.deepEqual(events, [], 'Scheduling must not activate WebKit source tracking while the graph is being built.');
assert.equal(await context.startRendering(), 'rendered');
assert.deepEqual(events, [['start', 0, .2, .6], ['stop', .63], ['start', .4], ['stop', .9], ['render']]);
console.log('Offline rendering: graph construction finishes before activation; native bindings, offsets, durations and stop ordering preserved.');

const { createPcmCapture, pcmCaptureRenderLength, PCM_CAPTURE_FRAMES } = await import(await typescriptModuleUrl(new URL('../src/audio/pcmCapture.ts', import.meta.url)));
globalThis.AudioBuffer = class {
  constructor({ numberOfChannels, length, sampleRate }) { this.length = length; this.sampleRate = sampleRate; this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length)); }
  copyToChannel(data, channel) { this.channels[channel].set(data); }
};
for (const frames of [1, 333, 4096, 8193, 44100]) {
  let disconnected = false;
  const node = { connect() {}, disconnect() { disconnected = true; } };
  const context = { sampleRate: 44100, destination: {}, createScriptProcessor(...args) { assert.deepEqual(args, [PCM_CAPTURE_FRAMES, 2, 2]); return node; } };
  const capture = createPcmCapture(context, frames);
  assert.throws(() => capture.finish(), /incomplet/, 'An incomplete render must fail, never hang or return a truncated file.');
  const expected = [new Float32Array(frames), new Float32Array(frames)];
  const renderLength = pcmCaptureRenderLength(frames);
  assert(renderLength >= frames + PCM_CAPTURE_FRAMES);
  assert.equal(renderLength % PCM_CAPTURE_FRAMES, 0);
  for (let offset = 0; offset < renderLength; offset += PCM_CAPTURE_FRAMES) {
    const channels = [0, 1].map(channel => Float32Array.from({ length: PCM_CAPTURE_FRAMES }, (_, i) => offset + i < 128 ? 0 : Math.sin((offset + i) * .071) * (channel ? -.7 : .3)));
    for (let channel = 0; channel < 2; channel++) {
      if (offset < frames) expected[channel].set(channels[channel].subarray(0, Math.min(PCM_CAPTURE_FRAMES, frames - offset)), offset);
    }
    node.onaudioprocess({ inputBuffer: { length: PCM_CAPTURE_FRAMES, getChannelData: channel => channels[channel] } });
  }
  const result = capture.finish();
  assert.equal(result.length, frames); assert.equal(result.sampleRate, 44100);
  assert.deepEqual(result.channels, expected, 'Preserve leading silence, distinct stereo channels and final partial block, without padding.');
  capture.dispose(); assert(disconnected); assert.equal(node.onaudioprocess, null);
}
console.log('PCM capture: exact stereo signal, silent intro, short files, block boundaries, final partial block, incomplete-render error and cleanup verified.');
