// The stick-man face layer (styles/stick-man/engine/faces.js): the reference face grammar (restrained ink faces: two
// eyes, two brows, one mouth; no red eyes, veins, sparkle eyes), the stable expression names films call, and the
// in-between / lip-sync API (faceParams, mixFace, drawFaceState).
import test from 'node:test';
import assert from 'node:assert/strict';
import { EXPR, EXPR_NAMES, MARK_NAMES, baseExpr, faceParams, mixFace, drawFaceState, drawFace, LAYOUT } from '../../styles/stick-man/engine/faces.js';

// every name that existed before the reference pass (films, acting.js EXPR_POSES and play.js call them)
const OLD = ['neutral', 'calm', 'happy', 'grin', 'closed', 'smug', 'sly', 'stern', 'worried', 'shock', 'sleep', 'manic', 'panic', 'blush',
  'angry', 'furious', 'nervous', 'sad', 'cry', 'dizzy', 'confused', 'excited', 'deadpan', 'suspicious', 'scream', 'pain', 'proud', 'disgust'];
const BASE = Object.keys(EXPR).filter(k => !/_(o|O)$/.test(k));

// a 2D-context stand-in that records every colour the face paints with and every primitive it fills or strokes
function mockCtx() {
  const colours = new Set(), ops = { fill: 0, stroke: 0 };
  const grad = { addColorStop: (_, c) => colours.add(c) };
  const g = new Proxy({}, {
    get(t, k) {
      if (k === 'fill') return () => ops.fill++;
      if (k === 'stroke') return () => ops.stroke++;
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => grad;
      if (k in t) return t[k];
      return () => {};
    },
    set(t, k, v) { if (k === 'fillStyle' || k === 'strokeStyle') { if (typeof v === 'string') colours.add(v); } t[k] = v; return true; },
  });
  return { g, colours, ops };
}
const rgb = c => { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c); return m ? m.slice(1, 4).map(Number) : null; };
const redHot = c => { const v = rgb(c); return v && v[0] > 180 && v[1] < 90 && v[2] < 90; };   // the old glowing-eye / vein red

test('every pre-existing expression name still resolves, with its _o and _O twins', () => {
  for (const n of OLD) {
    assert.ok(EXPR[n], n); assert.ok(EXPR[n + '_o'], n + '_o'); assert.ok(EXPR[n + '_O'], n + '_O');
    assert.equal(baseExpr(n + '_o'), n); assert.equal(baseExpr(n + '_O'), n);
    assert.ok(EXPR_NAMES.includes(n)); assert.ok(!EXPR_NAMES.includes(n + '_o'));
  }
  for (const m of ['sweat', 'anger', 'sparkle', 'question', 'exclaim', 'steam', 'stars', 'zzz']) assert.ok(MARK_NAMES.includes(m), m);
});

test('the reference grammar: ink eyes only, no veins / sockets / gloom, no emoji marks on the presets', () => {
  for (const n of BASE) {
    const E = EXPR[n];
    assert.ok(['oval', 'happy', 'content', 'pinch'].includes(E.eye), `${n}: eye kind ${E.eye}`);
    assert.ok(!E.skin || (!E.skin.veins && !E.skin.socket && !E.skin.gloom), `${n}: skin effects`);
    for (const [m] of E.marks || []) assert.ok(['sweat', 'steam', 'zzz'].includes(m), `${n}: mark ${m}`);
    const P = faceParams(n);
    assert.equal(P.skin.veins + P.skin.socket + P.skin.gloom, 0, n);
  }
  // rage is a head tint (purple), never a red one
  const [r, g, b] = EXPR.furious.tint; assert.ok(b > r && b > g, 'furious tint is purple');
});

test('drawing: every expression x glasses x blink x talk paints without a hot red and with few marks', () => {
  for (const n of Object.keys(EXPR)) for (const glasses of [false, true]) for (const blink of [0, 1, 2]) {
    const { g, colours, ops } = mockCtx();
    drawFace(g, n, blink, 5, { glasses });
    for (const c of colours) assert.ok(!redHot(c), `${n}: paints ${c}`);
    assert.ok(ops.fill + ops.stroke <= 22, `${n}: ${ops.fill + ops.stroke} paint calls (restraint; teeth lines count one each)`);
  }
  for (const open of [0, 0.3, 0.7, 1.1]) for (const n of ['neutral', 'smug', 'angry', 'shock']) {
    const { g } = mockCtx(); const { F, blink } = mixFace({ a: n, b: n, u: 1, talk: { open, wide: 0.3, round: 0.2, teeth: 0.5 } });
    drawFaceState(g, F, blink, 3, {});
    assert.ok(F.talk && F.talk.open >= open * 0.99 || open < 0.05);
  }
});

test('mixFace: numbers in-between, ends match, oval -> ring is continuous (no forced blink)', () => {
  const a = faceParams('deadpan'), b = faceParams('shock');
  const s0 = mixFace({ a: 'deadpan', b: 'shock', u: 0 }).F, s1 = mixFace({ a: 'deadpan', b: 'shock', u: 1 }).F;
  for (const k of ['rx', 'ry', 'white', 'pupil', 'mw']) { assert.ok(Math.abs(s0[k] - a[k]) < 1e-9, k); assert.ok(Math.abs(s1[k] - b[k]) < 1e-9, k); }
  const whites = [], blinks = [];
  for (let i = 0; i <= 10; i++) { const { F, blink } = mixFace({ a: 'deadpan', b: 'shock', u: i / 10 }); whites.push(F.white); blinks.push(blink); }
  for (let i = 1; i < whites.length; i++) assert.ok(whites[i] >= whites[i - 1] - 1e-9, 'white opens monotonically');
  assert.deepEqual([...new Set(blinks)], [0], 'same eye kind: no hidden blink');
  // a change of eye kind (oval -> ^ arcs) hides inside a squeeze
  assert.ok([1, 2].includes(mixFace({ a: 'neutral', b: 'laugh', u: 0.5 }).blink));
  // lip-sync: the talking mouth opens with the viseme
  const m = o => mixFace({ a: 'neutral', b: 'neutral', u: 1, talk: { open: o, wide: 0, round: 0, teeth: 0 } }).F.talk.open;
  assert.ok(m(0.9) > m(0.4) && m(0.4) > m(0.1));
});

test('layout: eyes in the glasses rims, features inside the head and clear of the mouth probe', () => {
  const G = LAYOUT.glasses;
  assert.ok(Math.abs(G.dx - 0.15) < 1e-9 && Math.abs(G.ey - 0.02) < 1e-9, 'rim centres (cast.js glasses)');
  assert.ok(G.maxR < 0.112 - 0.013, 'ring eye fits inside the rim');
  assert.ok(LAYOUT.dx * 2 > 0.22 && LAYOUT.dx * 2 < 0.26, 'eye spacing ~0.24 W (face v2, Kai gate A)');
  // faceRig's dark-mouth probe reads v -0.121 .. -0.414: every resting mouth sits inside it
  assert.ok(LAYOUT.my < -0.13 && LAYOUT.my > -0.30 && G.my < -0.13);
});

test('hold drift never draws a lid line across a ring eye (Kai: the floating ruler line)', () => {
  const ring = mixFace({ a: 'panic', life: { lid: 0.05 } }).F, dot = mixFace({ a: 'neutral', life: { lid: 0.05 } }).F;
  assert.equal(ring.lid, 0, 'ring eye: no lid from the drift');
  assert.ok(dot.lid > 0.04, 'dot eye still breathes its lid');
});
