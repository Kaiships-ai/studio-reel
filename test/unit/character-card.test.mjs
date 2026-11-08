// core/character-card.mjs: one card, the same character in the 3D and hand-draw styles.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkCard, toHandDraw, CARD } from '../../core/character-card.mjs';

const window = {};
new Function('window', readFileSync(new URL('../../tmv/characters/cast.js', import.meta.url), 'utf8'))(window);
const kaip = readFileSync(new URL('../../styles/kai-hand-draw/engine/kaip.js', import.meta.url), 'utf8');
const partsOf = (key) => JSON.parse(kaip.match(new RegExp(`${key}: (\\[[^\\]]*\\])`))[1].replace(/'/g, '"'));

test('the card options are the 3D cast options, and every seed is a valid card', () => {
  assert.deepEqual(CARD, window.TMV_PARTS);
  for (const seed of Object.values(window.TMV_SEEDS)) assert.deepEqual(checkCard(seed), []);
});

test('a bad card names each problem', () => {
  assert.match(checkCard({ name: 'X', hair: 'mohawk' })[0], /"hair": "mohawk" is not one of/);
  assert.match(checkCard({ name: 'X', skin: 'tan' })[0], /"skin": "tan" is not a colour/);
  assert.match(checkCard({})[0], /"name" must be a text/);
  assert.throws(() => toHandDraw({ name: 'X', top: 'cape' }), /character card: "top"/);
});

test('Nova in hand-draw: bun, orange hoodie, headphones, her colours, every value one kaip.js accepts', () => {
  const { character, lost } = toHandDraw(window.TMV_SEEDS.nova);
  assert.equal(character.hair, 'bun');
  assert.equal(character.top, 'hoodie');
  assert.equal(character.top_color, '#C9663A');
  assert.equal(character.accessory, 'headphones');
  assert.equal(character.glasses, 'none');
  assert.deepEqual(lost, ['build "small": one body size in hand-draw']);
  for (const k of ['eyes', 'brows', 'hair', 'facial_hair', 'glasses', 'accessory', 'top']) assert.ok(partsOf(k).includes(character[k]), `${k}: ${character[k]}`);
  for (const k of ['skin', 'hair_color', 'accessory_color', 'top_color', 'pants_color']) assert.match(character[k], /^#[0-9A-F]{6}$/);
});

test('what hand-draw cannot show is listed, never silently dropped', () => {
  assert.ok(toHandDraw(window.TMV_SEEDS.blip).lost.some((l) => /robot/.test(l)));
  assert.ok(toHandDraw(window.TMV_SEEDS.theo).lost.some((l) => /jay/.test(l)));
});
