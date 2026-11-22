// Stretched faces (Kai 22/11, Hot Money ep01 A v10a: the hero's face crammed onto his hood's edge at 0:23, a teller's eye
// a wide black band at 1:11, after eyegate PASSED on the designs). s2 held its marks back from a hood's rim by sliding the
// flat drawing across the canvas, then faces.js wrapped it round the head at the full yaw: a mark taken from the drawing's
// edge came out cos(a + yaw) / cos(a) wider, up to 7.5x. Now s2 names the yaw to wrap at (STYLE_DRAW.s2.wrap) and never
// slides; faces.js measures each frame's stretch (dbg rows faceStretch) and tools/gates/facegate.mjs fails a stretched face.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STYLE_DRAW, mixFace } from '../../styles/stick-man/engine/faces.js';
import { faceStateAt } from '../../styles/stick-man/engine/acting.js';
import { facegate, LIMIT, HOLD } from '../../styles/stick-man/tools/gates/facegate.mjs';

const S2 = await import('../../styles/stick-man/engine/facestyles/s2.js');
// Hot Money's plates (films/hm-ep01/r5/facestyle.js): a hood, a cap with its edge fade, and a bare head (the tellers)
const PLATES = { hood: { top: 0.20, topSide: 0.06, topKnee: 1.2, topUp: 0.18 }, cap: { top: 0.155, topSide: 0.18, topKnee: 0.66, topUp: 0.05, edge: [0.58, 0.12], edgeKnee: 0.66 }, bare: {} };
const R = 0.462;
// the widest a mark at flat x u comes out when the drawing is wrapped at yaw yw (the strips of faces.js), over the span a
// face's marks use (eyes, brows and the mouth sit within |u| <= 0.25) where the strip still faces the lens
const stretchAt = (u, yw) => { const a = Math.asin(u / R); return Math.cos(a + yw) / Math.cos(a); };

test('s2 never slides its drawing across the canvas: the face is wrapped at the yaw it names, at every turn', () => {
  S2.use();
  const { F } = mixFace(faceStateAt([{ f: -1e9, expr: 'y_worried' }], 100, 7, null));
  for (const [name, P] of Object.entries(PLATES)) for (let ya = -1.2; ya <= 1.2; ya += 0.1) {   // (past 1.22 the face fades on an offscreen canvas: no document in node)
    const tx = [];
    const g = new Proxy({ canvas: { width: 512, height: 512 }, getTransform: () => ({}) }, {
      get(t, k) { if (k in t) return t[k]; if (k === 'translate') return x => tx.push(x); return () => {}; } });
    const o = { ...P, sl: [ya, 0, 1, 0] };
    STYLE_DRAW.s2(g, { ...F, age: 60, hpx: 230 }, 0, 100, o);
    assert.ok(tx.every(x => x === 0), `${name} yaw ${ya.toFixed(1)}: the drawing slid by ${tx.find(x => x !== 0)}`);
    const yw = STYLE_DRAW.s2.wrap(o);
    assert.ok(Math.sign(yw) === Math.sign(ya) || ya === 0 || Math.abs(yw) < 1e-9, `${name} yaw ${ya}: wraps the other way (${yw})`);
    assert.ok(Math.abs(yw) <= Math.abs(ya) + 1e-9, `${name} yaw ${ya}: wraps further than the head turned (${yw})`);
  }
});

test('wrapped at the yaw s2 names, no mark comes out wider than the gate allows, at any turn', () => {
  S2.use();
  for (const [name, P] of Object.entries(PLATES)) for (let ya = 0; ya <= 1.34; ya += 0.02) {
    const yw = STYLE_DRAW.s2.wrap({ ...P, sl: [ya, 0, 1, 0] });
    for (let u = -0.25; u <= 0.25; u += 0.01) {
      if (Math.cos(Math.asin(u / R) + yw) < 0.08) continue;   // round the edge: faces.js does not draw that strip
      assert.ok(stretchAt(u, yw) < 1.2, `${name} yaw ${ya.toFixed(2)} x ${u.toFixed(2)}: ${stretchAt(u, yw).toFixed(2)}x`);
    }
  }
});

test("v10a's slide-then-wrap (the bug) stretches a teller's eye 4x at the turn Kai saw; the wrap does not", () => {
  const ya = 1.115, eff = 0.30 + (ya - 0.30) * 0.10, ux = R * Math.sin(eff - ya), eye = -0.084;   // a bare head: the hood's YK 0.30
  assert.ok(stretchAt(eye - 0.066 + ux, ya) > 3, 'the old law stretched the eye');
  assert.ok(stretchAt(eye - 0.066, eff) < 1.1, 'the wrap keeps it as drawn');
});

// faceStretch as the engine measured it on the teller (actor t) in v10a's banks part, frames 2140-2165, with the v10a kit
// (before) and with the wrap (after); the head is a readable 0.2 of the frame
const BEFORE = [1.124, 1.135, 1.147, 1.188, 1.301, 1.528, 2.046, 4.314, 7.43, 7.502, 7.473, 7.349, 4.296, 2.584, 2.354, 2.183, 1.931, 1.688, 1.576, 1.63, 1.758, 1.839, 1.76, 1.576, 1.447, 1.413];
const rowsOf = S => S.map((s, i) => ({ f: 2140 + i, actors: { t: { inFrame: true, head: [80, 300, 520, 700], faceVis: 1, faceStretch: s, faceLag: 0, faceRoll: 0, facePlate: null } } }));

test("facegate fails v10a's teller and names the frames", () => {
  const R = facegate(rowsOf(BEFORE), 1280);
  assert.equal(R.ok, false);
  assert.equal(R.faults.length, 1);
  assert.deepEqual([R.faults[0].who, R.faults[0].kind, R.faults[0].from, R.faults[0].to], ['t', 'stretched', 2144, 2165]);
  assert.ok(R.faults[0].peak > 7);
});

test('facegate passes a face as drawn, ignores a short blip, an unreadable head and the back of a head', () => {
  assert.equal(facegate(rowsOf(BEFORE.map(() => 1.05)), 1280).ok, true);
  const blip = BEFORE.map((_, i) => (i < HOLD - 1 ? LIMIT + 1 : 1));
  assert.equal(facegate(rowsOf(blip), 1280).ok, true);
  const tiny = rowsOf(BEFORE).map(r => ({ ...r, actors: { t: { ...r.actors.t, head: [0, 0, 10, 10] } } }));
  assert.equal(facegate(tiny, 1280).checked, 0);
  const back = rowsOf(BEFORE).map(r => ({ ...r, actors: { t: { ...r.actors.t, faceVis: 0 } } }));
  assert.equal(facegate(back, 1280).ok, true);
});

test('rows made before the gate (no faceStretch) never pass', () => {
  const old = rowsOf(BEFORE).map(r => ({ ...r, actors: { t: { ...r.actors.t, faceStretch: undefined } } }));
  const R = facegate(old, 1280);
  assert.equal(R.ok, false);
  assert.equal(R.unmeasured, BEFORE.length);
});

// faces.js itself (a stub canvas: node has no document): an s2 face on a turned head is wrapped at the yaw s2 names and
// its stretch is measured over the columns the drawing inks (a hooded head; the band of flat x -0.20..-0.10)
test('faces.js wraps an s2 face at the yaw s2 names and measures the stretch of the inked columns', async () => {
  const { faceRig, EXPR } = await import('../../styles/stick-man/engine/faces.js');
  S2.use();
  const inkU = [-0.20, -0.10], px = u => 256 + 512 * u;
  const ctx = () => new Proxy({ getTransform: () => ({}) }, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'getImageData') return (x, y, w, h) => { const d = new Uint8ClampedArray(w * h * 4);
        for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) if (x + c >= px(inkU[0]) && x + c < px(inkU[1])) d[4 * (r * w + c) + 3] = 255;
        return { data: d }; };
      return () => {};
    }, set(t, k, v) { t[k] = v; return true; } });
  const prev = globalThis.document;
  globalThis.document = { createElement: () => { const c = { width: 512, height: 512 }; const g = ctx(); g.canvas = c; c.getContext = () => g; return c; } };
  try {
    const FR = faceRig(1, { top: 0.20 }), ya = 1.115, sl = [ya, 0, 1, 0];
    assert.equal(EXPR.y_suspicious.style, 's2');
    FR.draw('y_suspicious', 0, 100, [], null, null, sl);
    const yw = STYLE_DRAW.s2.wrap({ top: 0.20, sl }), worst = yaw => { let m = 1;
      for (let u = inkU[0]; u <= inkU[1]; u += 0.002) { const a = Math.asin(u / R); if (Math.cos(a + yaw) >= 0.08) m = Math.max(m, Math.cos(a + yaw) / Math.cos(a)); } return m; };
    assert.ok(Math.abs(yw) < ya - 0.5, 'a hooded face is held back');
    assert.ok(Math.abs(FR.stats.stretch - worst(yw)) < 0.05, `measured ${FR.stats.stretch} vs wrapped at s2's yaw ${worst(yw).toFixed(3)}`);
    assert.ok(FR.stats.stretch < LIMIT);
  } finally { globalThis.document = prev; }
});

// Kai 23/11 (Ep1 v12, 1:12): the blond teller on the phone, her face held near-frontal while her bare head turned 0.4 -> 1.14
// rad and tilted 13 deg: faceLag and faceRoll as the engine measured them there (before the fix), and the gate's verdicts
const LAG12 = [0.07, 0.2, 0.46, 0.77, 0.73, 0.57, 0.47, 0.5, 0.44, 0.39, 0.33, 0.22, 0.12, 0.05];
test('facegate fails a bare head whose face turns less than the head (v12 teller), never a hood holding its marks back', () => {
  const rows = LAG12.map((g, i) => ({ f: 2142 + i, actors: { t: { inFrame: true, head: [80, 300, 520, 700], faceVis: 1, faceStretch: 1.06, faceLag: g, faceRoll: 0, facePlate: null } } }));
  const R = facegate(rows, 1280);
  assert.deepEqual(R.faults.map(f => [f.kind, f.from, f.to]), [['slides (turn)', 2143, 2153]]);
  const hood = rows.map(r => ({ ...r, actors: { t: { ...r.actors.t, facePlate: 'hood' } } }));
  assert.equal(facegate(hood, 1280).ok, true);
});

test('facegate fails a face that stays level while its head tilts', () => {
  const rows = [0, 3, 8, 11, 13, 13, 12, 9, 4, 1].map((d, i) => ({ f: 2160 + i, actors: { t: { inFrame: true, head: [80, 300, 520, 700], faceVis: 1, faceStretch: 1, faceLag: 0, faceRoll: d, facePlate: 'hood' } } }));
  const R = facegate(rows, 1280);
  assert.deepEqual(R.faults.map(f => [f.kind, f.from, f.to]), [['slides (tilt)', 2162, 2167]]);
});

test('a bare head (no hood or cap) turns its face all the way with the skull; a hood still holds its marks back', () => {
  S2.use();
  for (let ya = -1.2; ya <= 1.2; ya += 0.1) {
    assert.ok(Math.abs(STYLE_DRAW.s2.wrap({ ...PLATES.bare, sl: [ya, 0, 1, 0] }) - ya) < 1e-9, `bare yaw ${ya.toFixed(1)}`);
    if (Math.abs(ya) > 0.5) assert.ok(Math.abs(STYLE_DRAW.s2.wrap({ ...PLATES.hood, sl: [ya, 0, 1, 0] })) < Math.abs(ya) - 0.1, `hood yaw ${ya.toFixed(1)}`);
  }
});

// cast.js: the face shell is laid with the head's own up, whatever the lens direction (a tilted head sees the lens off its
// axes); faceRoll reads the frame the shell was actually laid with (Kai 23/11, Ep1 v12: the teller's head tilted 13 deg,
// her face stayed level)
test('the face shell takes the head\'s up: no roll from any lens direction; a level face on a tilted head reads 13 deg', async () => {
  const THREE = await import('three');
  const { faceShell, layFace, faceRollOf } = await import('../../styles/stick-man/engine/cast.js');
  const g = faceShell();
  for (const [x, y, z] of [[0, 0, 1], [0.3, 0.2, 0.9], [-0.6, -0.4, 0.7], [0.9, 0.1, 0.4], [0.2, 0.62, 0.76]]) {
    const d = new THREE.Vector3(x, y, z).normalize();
    assert.equal(layFace(g, d), 0, `lens ${[x, y, z]}`);
    const sy = new THREE.Vector3().fromArray(g.userData.sy), sx = new THREE.Vector3().crossVectors(sy, d);
    assert.ok(Math.abs(sx.y) < 1e-9, `lens ${[x, y, z]}: the face's horizontal leans off the head's (${sx.y})`);
  }
  const d = new THREE.Vector3(0.3, 0.2, 0.9).normalize();
  layFace(g, d);
  g.userData.sy = new THREE.Vector3().fromArray(g.userData.sy).applyAxisAngle(d, 13 * Math.PI / 180).toArray();
  assert.ok(Math.abs(faceRollOf(g, d) - 13) < 0.2, `${faceRollOf(g, d)}`);
});
