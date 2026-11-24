// The kit's default face style is s2 (Kai 21/11: "s2 thành mặc định"): a reel.js without faceStyle gets s2, 'kit' is retired
// and draws s2 too (Kai 25/11: no dot faces), a name that is not a style fails before anything renders (engine/facestyles/index.js, read by play.js boot).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXPR, FACE_STYLE } from '../../styles/stick-man/engine/faces.js';
import { useFaceStyle, DEFAULT_FACE_STYLE } from '../../styles/stick-man/engine/facestyles/index.js';

test("faceStyle 'kit' is retired in the studio: it draws s2 (the H2 V2.1 faces) with a warning, never the dot faces", async () => {
  const warn = console.warn, said = []; console.warn = m => said.push(m);
  try { assert.equal(await useFaceStyle('kit'), 's2'); } finally { console.warn = warn; }
  assert.equal(FACE_STYLE.name, 's2'); assert.equal(EXPR.neutral.style, 's2'); assert.match(said.join(' '), /retired/);
});

test('an unknown faceStyle fails loudly and names the styles', async () => {
  for (const bad of ['s3', 'S2', null, 'toString']) await assert.rejects(useFaceStyle(bad), /not a face style \('kit', 's2'/);
});

test('faceStyle left out = s2: its designs are in EXPR and the engine runs as s2', async () => {
  assert.equal(DEFAULT_FACE_STYLE, 's2');
  assert.equal(await useFaceStyle(undefined), 's2');
  assert.equal(FACE_STYLE.name, 's2'); assert.equal(EXPR.y_alert.style, 's2');
});
