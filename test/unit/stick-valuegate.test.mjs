// Value gate (Kai 22/11, Hot Money ep01: a burnt glare patch round a door; subjects must read, never crushed to black).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frameValues, faults, subjectBoxes, headBoxes, W, H, FPS, GLARE, CRUSH, BLOWN } from '../../styles/stick-man/tools/gates/valuegate.mjs';

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

test('the same bright patch is glare in a night frame and not in a bright day frame (the median sets the bar)', () => {
  const patch = [[10, 80, 70, 170, 238]];
  assert.ok(frameValues(frame(70, patch), W, H).glare > GLARE.share);
  assert.ok(frameValues(frame(185, patch), W, H).glare <= GLARE.share);
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

// Kai 22/11: "why do the money bags and the lamps keep blowing out?" A blown object is one object, not a share of the frame
const paint = (px, x0, y0, x1, y1, f) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const v = f(x, y); px.fill(v, 3 * (y * W + x), 3 * (y * W + x) + 3); } return px; };

test('a small flat white bag fails as a blown object though the glare share passes; the same bag with texture passes', () => {
  const bag = paint(frame(110), 80, 150, 96, 166, () => 222);                          // 16 x 16 px = 0.4 % of the frame
  const v = frameValues(bag, W, H);
  assert.ok(v.glare <= GLARE.share && v.clip <= 0.01, 'the frame-share checks pass');
  assert.ok(v.blown && v.blown.kind === 'white' && v.blown.n >= BLOWN.area, 'one blown object');
  assert.equal(faults(run(bag, [])).find(f => f.kind === 'blown object')?.where.kind, 'white');
  const textured = paint(frame(110), 80, 150, 96, 166, (x, y) => ((x + y) % 3 ? 222 : 180));   // the bundles' print: detail kept
  assert.equal(frameValues(textured, W, H).blown, null);
});

test('thin white strokes (a caption, a HUD digit) and a stick head inside its head box are not blown objects', () => {
  const text = frame(90); for (let k = 0; k < 6; k++) paint(text, 40 + 12 * k, 200, 42 + 12 * k, 214, () => 250);   // 2 px strokes
  assert.equal(frameValues(text, W, H).blown, null);
  const head = paint(frame(110), 80, 120, 110, 150, () => 235);
  assert.ok(frameValues(head, W, H).blown, 'an unmasked flat white disc is blown');
  const [hb] = headBoxes({ actors: { you: { head: [80 * 1080 / W, 120 * 1920 / H, 110 * 1080 / W, 150 * 1920 / H] } } });
  assert.equal(frameValues(head, W, H, [], undefined, [hb]).blown, null, 'inside the head box it is the head');
});

test('a few clipped pixels together fail; a lamp glowing at median + 80 in a dark room fails too', () => {
  assert.equal(frameValues(paint(frame(120), 50, 60, 54, 64, () => 255), W, H).blown?.kind, 'clipped');
  const lamp = paint(frame(60), 120, 100, 132, 112, () => 150);
  assert.equal(frameValues(lamp, W, H).blown?.kind, 'white');
  assert.equal(frameValues(paint(frame(60), 120, 100, 132, 112, () => 130), W, H).blown, null, 'a lamp at median + 70 keeps its glow');
});
