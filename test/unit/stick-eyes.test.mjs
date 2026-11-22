// Creepy eyes (Kai 22/11, Hot Money ep01 A v9: the hero's and the tellers' wide eyes "look creepy"): a small pupil floating in
// white reads as a stare. engine/eyegeom.js sets the pupil and the resting upper lid; s2 draws with it; eyegate.mjs holds
// every design to LIMITS. These tests fail when the drawing drifts from the numbers or a design brings the stare back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EYE, EYE_V9, judge, eyeGeom, pupil, LIMITS, squeezes } from '../../styles/stick-man/engine/eyegeom.js';
import { STYLE_DRAW, mixFace } from '../../styles/stick-man/engine/faces.js';
import { faceStateAt } from '../../styles/stick-man/engine/acting.js';
import { eyegate } from '../../styles/stick-man/tools/gates/eyegate.mjs';

const S2 = await import('../../styles/stick-man/engine/facestyles/s2.js');

test('every s2 design and every kit ring eye passes the creepy-eyes limits', async () => {
  const R = await eyegate();
  assert.ok(R.rows.length > 20);
  assert.deepEqual(R.rows.filter(r => !r.ok).map(r => `${r.name}: ${r.bad.join('; ')}`), []);
});

test("v9's eye (small pupil, no resting lid) fails the gate on the designs Kai called creepy", () => {
  for (const n of ['y_worried', 'y_fear', 'y_lens', 'c_shout']) assert.equal(judge(S2.DESIGNS[n], EYE_V9).ok, false, n);
});

test('a calm face: pupil over half the eye, the lid close to its top; fear keeps white above, never a pin-prick', () => {
  const calm = eyeGeom(S2.DESIGNS.y_lens), fear = eyeGeom(S2.DESIGNS.y_fear);
  assert.ok(calm.pupilW >= LIMITS.calm.pupilW && calm.whiteAbove <= LIMITS.calm.whiteAbove);
  assert.ok(fear.whiteAbove > calm.whiteAbove, 'fear shows more white above the pupil than calm');
  assert.ok(fear.pupilW >= LIMITS.shock.pupilW);
});

// draw the held design through s2 and catch the pupil's ellipse (the first INK ellipse inside an eye): its radii are
// pupil() at the design's white, so the gate measures what is drawn
test('s2 draws the pupil eyegeom.js computes', () => {
  S2.use();
  for (const name of ['y_lens', 'y_fear']) {
    const D = S2.DESIGNS[name], ell = [];
    let fill = null;
    const g = new Proxy({ canvas: { width: 512, height: 512 }, getTransform: () => ({}) }, {
      get(t, k) {
        if (k in t) return t[k];
        if (k === 'ellipse') return (x, y, rx, ry) => ell.push({ rx, ry });
        if (k === 'fill') return () => { if (fill === '__ink' && ell.length) ell[ell.length - 1].ink = true; };
        return () => {};
      },
      set(t, k, v) { if (k === 'fillStyle') fill = /^rgb\(250/.test(String(v)) ? 'white' : '__ink'; t[k] = v; return true; } });
    const { F } = mixFace(faceStateAt([{ f: -1e9, expr: name }], 100, 7, null));
    STYLE_DRAW.s2(g, { ...F, age: 60, hpx: 230 }, 0, 100, {});
    const want = pupil(D.white || 0, 1, 0), got = ell.find(e => e.ink);
    assert.ok(got, `${name}: a pupil was drawn`);
    assert.ok(Math.abs(got.rx - want.prx) < 1e-6 && Math.abs(got.ry - want.pry) < 1e-6, `${name}: drawn ${got.rx},${got.ry} want ${want.prx},${want.pry}`);
  }
  assert.ok(EYE.prx > EYE_V9.prx && EYE.shrink < EYE_V9.shrink);
});

// the lid and the pupil as drawn: the first moveTo of the face is the left eye's lid clip (its y is the lid's top for a
// design with no lid tilt at q 0), the first ink ellipse its pupil; their white-above share equals eyeGeom's
test('s2 draws the lid where eyegeom.js puts it: the white above the pupil matches, design by design', () => {
  S2.use();
  for (const name of ['y_alert', 'y_worried', 'y_focus', 'c_shout', 'y_fear']) {
    const D = S2.DESIGNS[name]; let top = null, pup = null, fill = null;
    const g = new Proxy({ canvas: { width: 512, height: 512 }, getTransform: () => ({}) }, {
      get(t, k) {
        if (k in t) return t[k];
        if (k === 'moveTo') return (x, y) => { if (top == null) top = y; };
        if (k === 'ellipse') return (x, y, rx, ry) => { if (!pup) pup = { y, ry, pending: true }; };
        if (k === 'fill') return () => { if (pup?.pending) { if (fill === 'ink') pup.pending = false; else pup = null; } };
        return () => {};
      },
      set(t, k, v) { if (k === 'fillStyle') fill = /^rgb\(250/.test(String(v)) ? 'white' : 'ink'; t[k] = v; return true; } });
    const { F } = mixFace(faceStateAt([{ f: -1e9, expr: name }], 100, 7, null));
    STYLE_DRAW.s2(g, { ...F, age: 60, hpx: 230 }, 0, 100, {});
    const h = D.ry * (1 + (D.x?.eSt || 0)), drawn = Math.max(0, top - (pup.y + pup.ry)) / (2 * h), want = eyeGeom(D).whiteAbove;
    assert.ok(Math.abs(drawn - want) < 0.01, `${name}: drawn white above ${drawn.toFixed(3)} vs eyegeom ${want.toFixed(3)}`);
  }
});

test('a design that squeezes is not judged as an open eye', () => {
  assert.ok(squeezes(S2.DESIGNS.y_set) && judge(S2.DESIGNS.y_set).squeeze);
  assert.ok(!squeezes(S2.DESIGNS.y_lens));
});
