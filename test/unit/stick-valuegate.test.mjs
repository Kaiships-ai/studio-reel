// Value gate (Kai 22/11, Hot Money ep01: a burnt glare patch round a door; subjects must read, never crushed to black).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frameValues, faults, subjectBoxes, W, H, FPS, GLARE, CRUSH } from '../../styles/stick-man/tools/gates/valuegate.mjs';

// a w x h rgb24 frame of grey g, with rectangles [x0, y0, x1, y1, grey] painted on
const frame = (g, rects = []) => {
  const px = new Uint8Array(W * H * 3).fill(g);
  for (const [a, b, e, d, v] of rects) for (let y = b; y < d; y++) for (let x = a; x < e; x++) px.fill(v, 3 * (y * W + x), 3 * (y * W + x) + 3);
  return px;
};
const run = (fr, boxes, n = 4) => Array.from({ length: n }, (_, i) => ({ t: (i + 0.5) / FPS, ...frameValues(fr, W, H, boxes) }));

test('a night frame with a hot pool round a door is glare; the same frame without it passes', () => {
  const night = frame(70), hot = frame(70, [[10, 80, 70, 170, 245]]);
  assert.ok(frameValues(hot, W, H).glare > GLARE.share);
  assert.deepEqual(faults(run(night, [])), []);
  assert.equal(faults(run(hot, []))[0].kind, 'glare');
});

test('an evenly bright day frame (a white lobby) is not glare', () => {
  assert.ok(frameValues(frame(205), W, H).glare <= GLARE.share);
});

test('a subject crushed to black in its box fails; a readable one passes; a short flash is not held long enough', () => {
  const box = [[60, 100, 120, 220]], dark = frame(90, [[60, 100, 120, 220, 4]]), lit = frame(90, [[60, 100, 120, 220, 60]]);
  assert.ok(frameValues(dark, W, H, box).crush[0] > CRUSH.share);
  assert.equal(faults(run(dark, box))[0].kind, 'crushed subject');
  assert.deepEqual(faults(run(lit, box)), []);
  assert.deepEqual(faults(run(frame(70, [[10, 80, 70, 170, 245]]), [], 1)), [], 'one sample (0.25 s) is a flash');
});

test("subject boxes come from the rows' head boxes (render pixels) scaled to the sample", () => {
  const [b] = subjectBoxes({ actors: { you: { head: [440, 400, 640, 600] } } });
  assert.ok(b[0] < 440 * W / 1080 && b[2] > 640 * W / 1080 && b[3] > 600 * H / 1920);
});
