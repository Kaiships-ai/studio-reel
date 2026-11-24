// The head gate (styles/stick-man/tools/gates/headgate.mjs): the lead readable with its back to the lens for 2 s fails;
// shorter, smaller (far away) or with no lead does not.
import test from 'node:test';
import assert from 'node:assert/strict';
import { headgate, frameState, HOLD } from '../../styles/stick-man/tools/gates/headgate.mjs';

const row = (f, faceVis, h = 140, lead = true) => ({ f, px: [720, 1280], actors: { you: { lead, inFrame: true, head: [300, 400, 300 + h, 400 + h], faceVis } } });
const film = parts => { const out = []; let f = 0; for (const [n, vis, h] of parts) for (let i = 0; i < n; i++) out.push(row(f++, vis, h)); return out; };

test('the back of the head for 2 s at a readable size fails, with its frames', () => {
  const R = headgate(film([[30, 1], [HOLD + 10, 0.1], [30, 1]]));
  assert.equal(R.ok, false); assert.deepEqual(R.runs.map(r => [r.from, r.to]), [[30, 30 + HOLD + 9]]);
  assert.ok(R.faceShare > 0.4 && R.faceShare < 0.5, `${R.faceShare}`);
});

test('shorter than 2 s, or the lead too small to read, or a face to the lens, passes', () => {
  assert.equal(headgate(film([[HOLD - 1, 0.1], [10, 1], [HOLD - 1, 0.1]])).ok, true, 'two short runs never join across a face');
  assert.equal(headgate(film([[HOLD * 2, 0.1, 40]])).ok, true, 'a 40 px head in a 1280 frame is a far figure');
  assert.equal(headgate(film([[HOLD * 2, 0.9]])).ok, true);
});

test('no lead in the rows: nothing measured (PARTIAL), never a pass by default', () => {
  const R = headgate([0, 1, 2].map(f => ({ ...row(f, 0.1), actors: { x: { inFrame: true, head: [0, 0, 200, 200], faceVis: 0 } } })));
  assert.equal(R.measured, 0); assert.equal(frameState({ actors: {} }), null);
});
