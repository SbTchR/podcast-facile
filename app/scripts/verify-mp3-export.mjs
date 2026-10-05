import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import { execFileSync } from 'node:child_process';

// Run the production worker and decode its output with an independent codec.
const code = stripTypeScriptTypes(await readFile(new URL('../src/audio/mp3.worker.ts', import.meta.url), 'utf8'))
  .replace("'@breezystack/lamejs'", JSON.stringify(import.meta.resolve('@breezystack/lamejs')));
let response;
globalThis.self = { postMessage: message => { response = message; } };
await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const sampleRate = 44100;
const duration = 1.137; // Does not end on an MP3 frame boundary.
const channels = [440, 660].map(frequency => Float32Array.from({ length: Math.round(sampleRate * duration) }, (_, index) => 1.2 * Math.sin(2 * Math.PI * frequency * index / sampleRate)));
self.onmessage({ data: { channels, sampleRate } });
assert(response.blob instanceof Blob && response.blob.size > 1000, response.error);
assert.equal(response.blob.type, 'audio/mpeg');
const directory = await mkdtemp(join(tmpdir(), 'podcast-mp3-check-'));
try {
  const file = join(directory, 'stereo.mp3');
  await writeFile(file, new Uint8Array(await response.blob.arrayBuffer()));
  const meta = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,sample_rate,channels,bit_rate', '-show_entries', 'format=duration', '-of', 'json', file], { encoding: 'utf8' }));
  assert.equal(meta.streams[0].codec_name, 'mp3'); assert.equal(meta.streams[0].sample_rate, '44100');
  assert.equal(meta.streams[0].channels, 2); assert.equal(meta.streams[0].bit_rate, '192000');
  assert(Math.abs(Number(meta.format.duration) - duration) < .1);
  const decoded = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-acodec', 'pcm_f32le', 'pipe:1']);
  const samples = new DataView(decoded.buffer, decoded.byteOffset, decoded.byteLength);
  for (const [channel, frequency] of [440, 660].entries()) {
    let crossings = 0, peak = 0;
    const from = Math.round(sampleRate * .3), to = from + Math.round(sampleRate * .5);
    let previous = 0;
    for (let frame = from; frame < to; frame++) {
      const sample = samples.getFloat32((frame * 2 + channel) * 4, true);
      assert(Number.isFinite(sample)); peak = Math.max(peak, Math.abs(sample));
      if (previous < 0 && sample >= 0) crossings++;
      previous = sample;
    }
    assert(Math.abs(crossings / .5 - frequency) < 5, 'Pitch and stereo channels must survive export.');
    assert(peak > .8 && peak < 1.01, 'Linked attenuation must preserve headroom.');
  }
  self.onmessage({ data: { channels: [new Float32Array([NaN])], sampleRate } });
  assert.match(response.error, /invalides/);
  console.log('MP3 worker: independent decoding confirms 192 kbps stereo, duration, pitch, distinct channels, peak protection and invalid-data errors.');
} finally { await rm(directory, { recursive: true, force: true }); }
