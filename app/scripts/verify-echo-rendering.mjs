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

const { readFile } = await import('node:fs/promises');
const { runInNewContext } = await import('node:vm');
let Capture, captured, transfers;
runInNewContext(await readFile(new URL('../src/audio/pcmCapture.worklet.js', import.meta.url), 'utf8'), {
  Float32Array,
  AudioWorkletProcessor: class { port = { postMessage(data, buffers) { captured = data; transfers = buffers; } }; },
  registerProcessor(name, processor) { assert.equal(name, 'podcast-pcm-capture'); Capture = processor; },
});
const processor = new Capture({ processorOptions: { frames: 333 } });
const left = Float32Array.from({ length: 128 }, (_, i) => i / 128);
const right = Float32Array.from(left, value => -value);
const output = () => [[new Float32Array(128), new Float32Array(128)]];
processor.process([[]], output()); // Silent intro must retain its exact length.
processor.process([[left, right]], output());
assert.equal(captured, undefined);
processor.process([[left]], output()); // Mono input duplicates to stereo.
assert.equal(captured.length, 2);
assert.equal(captured[0].length, 333); assert.equal(captured[1].length, 333);
assert.deepEqual([...captured[0].slice(0, 128)], Array(128).fill(0));
assert.deepEqual([...captured[0].slice(128, 256)], [...left]);
assert.deepEqual([...captured[1].slice(128, 256)], [...right]);
assert.deepEqual([...captured[0].slice(256)], [...left.slice(0, 77)]);
assert.deepEqual([...captured[1].slice(256)], [...left.slice(0, 77)]);
assert.equal(transfers[0], captured[0].buffer); assert.equal(transfers[1], captured[1].buffer);
assert.equal(processor.process([[]], output()), false);
console.log('PCM capture: exact stereo signal, silence, mono fallback, partial last quantum and buffer transfer verified.');
