import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transformBundle } from '../site/runtime-loader.js';

const bundle = await readFile(new URL('../site/assets/index-CoCR-8bA.js', import.meta.url), 'utf8');
const transformed = transformBundle(bundle);

assert.ok(transformed.includes('Les sons de la bibliothèque proviennent de sources libres ou sous licence.'), 'Le texte corrigé sur les sources doit être présent.');
assert.ok(!transformed.includes('Les sons intégrés sont produits directement par l’application.'), 'L’ancien texte trompeur doit être absent.');

for (const id of [
  'sfx-gunshots-simulated',
  'sfx-cannon-reveille',
  'sfx-large-crowd-cheering',
  'sfx-provence-market',
  'sfx-fireworks-detonations',
  'sfx-rotary-printing-press-1926',
  'sfx-military-drumbeat',
  'sfx-1960s-factory-civil-defense-siren',
  'sfx-19th-century-fire-brigade-bell'
]) {
  assert.ok(transformed.includes(`id:\`${id}\``), `Le bruitage ${id} doit être injecté.`);
}

assert.ok(transformed.includes('id:`sfx-explosion`,kind:`sfx`,title:`Explosion courte`,category:`Guerres & combats`'), 'L’explosion courte doit être conservée et reclassée.');
assert.ok(transformed.includes('id:`sfx-explosions`,kind:`sfx`,title:`Plusieurs explosions`,category:`Guerres & combats`'), 'La série d’explosions doit être conservée et reclassée.');
assert.ok(transformed.includes('t/=n;return e.type===`voice`&&e.background'), 'La durée de la voix doit suivre la vitesse de lecture.');
assert.ok(transformed.includes('Math.min(o*g,f.duration-h)'), 'La lecture doit consommer la bonne quantité de source audio.');
assert.ok(transformed.includes('g=u/q'), 'Les bruitages synchronisés doivent suivre la vitesse de la voix.');

new Function(transformed);
console.log('Correctifs audio vérifiés : bibliothèque, catégories, effets grave/aigu et syntaxe du bundle.');
