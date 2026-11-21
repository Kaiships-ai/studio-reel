// The kit's default face style is s2 (Kai 21/11: "s2 thành mặc định"): a reel.js without faceStyle gets s2, 'kit' keeps the
// kit's own faces, a name that is not a style fails before anything renders (engine/facestyles/index.js, read by play.js boot).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXPR, FACE_STYLE } from '../../styles/stick-man/engine/faces.js';
import { useFaceStyle, DEFAULT_FACE_STYLE } from '../../styles/stick-man/engine/facestyles/index.js';

test("faceStyle 'kit' keeps the kit faces: no style on, no s2 design", async () => {
  assert.equal(await useFaceStyle('kit'), 'kit');
  assert.equal(FACE_STYLE.name, null); assert.ok(!('y_alert' in EXPR));
});

test('an unknown faceStyle fails loudly and names the styles', async () => {
  for (const bad of ['s3', 'S2', null, 'toString']) await assert.rejects(useFaceStyle(bad), /not a face style \('kit', 's2'/);
  assert.equal(FACE_STYLE.name, null);
});

test('faceStyle left out = s2: its designs are in EXPR and the engine runs as s2', async () => {
  assert.equal(DEFAULT_FACE_STYLE, 's2');
  assert.equal(await useFaceStyle(undefined), 's2');
  assert.equal(FACE_STYLE.name, 's2'); assert.equal(EXPR.y_alert.style, 's2');
});
