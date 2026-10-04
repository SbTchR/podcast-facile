import assert from 'node:assert/strict';
import { typescriptModuleUrl, loadAudioEngine } from './audio-test-module.mjs';
const { reorderNarrativeBlock, duplicateNarrativeBlock } = await import(await typescriptModuleUrl(new URL('../src/audio/narrativeEditing.ts', import.meta.url)));
const { resolveSectionLayers } = await import(await typescriptModuleUrl(new URL('../src/audio/sectionLayers.ts', import.meta.url)));
const { getTimeline, getProjectDuration } = await loadAudioEngine();

const voice = { id: 'voice', sectionId: 'part', title: 'Texte', type: 'voice', assetId: 'original', trimStart: 2, trimEnd: 7, duration: 5, volume: 'normal', fadeIn: 'none', fadeOut: 'none', voiceEffect: 'none', script: 'Texte conservé.', voiceCutStart: true, background: { assetId: 'bed', level: 'low' }, voiceCues: [{ id: 'cue', assetId: 'fx', at: 1, duration: .5, level: 'normal' }] };
const gap = { ...voice, id: 'gap', type: 'silence', title: 'Son seul', assetId: undefined, background: undefined, voiceCues: undefined, duration: 1, trimStart: 0, trimEnd: 0 };
const pause = { ...gap, id: 'pause', title: 'Pause', duration: 2 };
const transition = { ...gap, id: 'transition', type: 'transition', title: 'Transition', assetId: 'fx', transitionPreset: 'whoosh', duration: .5, trimEnd: .5 };
const before = { ...gap, id: 'before', sectionId: 'previous' }, after = { ...gap, id: 'after', sectionId: 'next' };
const music = { id: 'music', title: 'Fond', kind: 'music', assetId: 'bed', sourceStart: 0, sourceEnd: 20, start: { edge: 'start' }, end: { edge: 'end' }, volume: 32, pauseVolume: 75, repeat: true, fadeIn: 'none', fadeOut: 'none' };
const anchored = { ...music, id: 'anchored', kind: 'sfx', assetId: 'fx', sourceEnd: .5, repeat: false, start: { blockId: 'voice', edge: 'start', seconds: 1 } };
const linked = { ...anchored, id: 'linked', sourceEnd: 1, pauseBlockId: 'gap', afterBlockId: 'voice', start: { blockId: 'gap', edge: 'start' }, end: { blockId: 'gap', edge: 'end' } };
const project = { id: 'test', sections: [{ id: 'previous' }, { id: 'part', title: 'Partie', audioLayers: [music, anchored, linked] }, { id: 'next' }], blocks: [before, voice, gap, pause, transition, after], assets: [{ id: 'original', duration: 10 }, { id: 'bed', duration: 20 }, { id: 'fx', duration: 1 }] };
const original = JSON.stringify(project), ids = p => p.blocks.map(block => block.id);
const moved = reorderNarrativeBlock(project, 'voice');
assert.deepEqual(ids(moved), ['before', 'pause', 'transition', 'voice', 'gap', 'after'], 'A linked sound-only pause follows its moved voice.');
assert.equal(JSON.stringify(project), original, 'The original project remains available for undo.');
assert.equal(moved.assets, project.assets);
assert.equal(moved.sections[0], project.sections[0]);
assert.equal(moved.blocks[0], before); assert.equal(moved.blocks.at(-1), after);
assert.equal(getProjectDuration(moved), getProjectDuration(project), 'Reordering keeps the total duration.');
let timeline = getTimeline(moved), layers = resolveSectionLayers(moved, timeline);
assert.equal(layers.find(item => item.layer.id === 'anchored').start, timeline.find(item => item.block.id === 'voice').start + 1, 'A sound anchored in the voice moves with it.');
assert.equal(layers.find(item => item.layer.id === 'linked').start, timeline.find(item => item.block.id === 'gap').start);
assert.equal(layers.find(item => item.layer.id === 'music').end, timeline.find(item => item.block.id === 'gap').end, 'A whole-part bed still spans the part.');
assert.deepEqual(ids(reorderNarrativeBlock(moved, 'voice', 'pause')), ids(project), 'Dragging back restores the original sequence.');
for (const [id, target] of [['gap', 'pause'], ['voice', 'voice'], ['voice', 'after'], ['absent', 'pause']]) assert.equal(reorderNarrativeBlock(project, id, target), project, 'Invalid, managed or cross-part moves are ignored.');
assert.equal(reorderNarrativeBlock({ ...project, blocks: [before, pause, after] }, 'pause').blocks[1], pause, 'A lone clip cannot move into another part.');

const copyProject = duplicateNarrativeBlock(project, 'voice', 'copy'), copy = copyProject.blocks.find(item => item.id === 'copy');
assert.deepEqual(ids(copyProject), ['before', 'voice', 'gap', 'copy', 'pause', 'transition', 'after']);
assert.equal(copyProject.assets, project.assets, 'Duplicating reuses the original audio without copying or trimming it.');
assert.deepEqual([copy.assetId, copy.trimStart, copy.trimEnd, copy.script, copy.voiceCutStart], ['original', 2, 7, voice.script, true]);
assert.notEqual(copy.background, voice.background); assert.notEqual(copy.voiceCues[0], voice.voiceCues[0]);
assert.notEqual(copy.voiceCues[0].id, voice.voiceCues[0].id, 'Legacy sound cues have independent identities.');
copy.background.level = 'high'; copy.voiceCues[0].at = 2;
assert.equal(JSON.stringify(project), original, 'Editing a copy cannot change the original clip settings.');
for (const id of ['pause', 'transition']) {
  const duplicated = duplicateNarrativeBlock(project, id, `${id}-copy`);
  assert.equal(duplicated.blocks.find(item => item.id === `${id}-copy`).type, project.blocks.find(item => item.id === id).type);
  assert.equal(duplicated.assets, project.assets);
}
assert.equal(duplicateNarrativeBlock(project, 'gap', 'gap-copy'), project, 'Managed gaps remain attached to their sound rather than being copied alone.');
assert.equal(duplicateNarrativeBlock(project, 'voice', 'voice'), project);
console.log('Narrative editing: anchored sounds, managed pauses, exact source excerpts, independent copies, undo data and other sections preserved.');
