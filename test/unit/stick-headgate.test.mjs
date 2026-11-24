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

const seq = (n, fn) => Array.from({ length: n }, (_, f) => fn(f));
test('a short dropout (a flicker of face, a frame off screen) does not end the run; a real cut away of 9 frames does', () => {
  assert.equal(headgate(seq(300, f => row(f, f % 60 === 59 ? 0.3 : 0.1))).runs.length, 1, 'one frame of face every 2 s');
  const off = seq(79, f => { const r = row(f, 0.1); if ([40, 47, 48, 49].includes(f)) r.actors.you.inFrame = false; return r; });
  assert.deepEqual(headgate(off).runs.map(r => [r.from, r.to]), [[0, 78]], 'four frames off screen inside 2.6 s');
  assert.equal(headgate(seq(100, f => row(f, f >= 45 && f < 54 ? 1 : 0.1))).ok, true, '45 + 46 frames apart by a 9-frame face');
});

test('a row without faceVis is not measured; an over-the-shoulder shot (another readable face on screen) does not count', () => {
  assert.equal(headgate(seq(90, f => { const r = row(f, 0.1); delete r.actors.you.faceVis; return r; })).measured, 0);
  const ots = seq(90, f => { const r = row(f, 0.1); r.actors.her = { inFrame: true, head: [400, 500, 520, 620], faceVis: 0.9 }; return r; });
  assert.equal(headgate(ots).ok, true);
  assert.equal(headgate(seq(90, f => row(f, 0.1, 140 - f))).ok, false, 'a readable walk away is still listed to look at');
});
