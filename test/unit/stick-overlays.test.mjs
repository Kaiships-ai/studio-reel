// The stick-man drawn overlays (styles/stick-man/engine/overlays.js): what reaches the canvas on each frame for a boxed
// label, a clock that ticks without re-popping, a meter, and a world path that draws on (Hot Money ep01 [3.2] KIT gaps).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createOverlays, envelope, valueAt } from '../../styles/stick-man/engine/overlays.js';

// a 2D context that records every draw with the scale and alpha in force; '1' is narrower than the other digits
function recorder() {
  const ops = [], stack = [];
  let st = { s: 1, a: 1 }, path = [];
  const g = {
    font: '', fillStyle: '', strokeStyle: '', lineWidth: 1, textAlign: '', textBaseline: '', lineJoin: '', lineCap: '', dash: [],
    get globalAlpha() { return st.a; }, set globalAlpha(v) { st.a = v; },
    save() { stack.push({ ...st }); }, restore() { st = stack.pop(); },
    translate() {}, rotate() {}, scale(s) { st.s *= s; }, clip() {},
    setLineDash(d) { g.dash = d; },
    measureText: t => ({ width: [...t].reduce((w, c) => w + (c === '1' ? 20 : 34), 0) }),
    beginPath() { path = []; }, moveTo(x, y) { path.push(['M', x, y]); }, lineTo(x, y) { path.push(['L', x, y]); },
    arc() {}, rect(x, y, w, h) { path.push(['R', x, y, w, h]); }, roundRect(x, y, w, h) { path.push(['R', x, y, w, h]); },
    fill() { ops.push({ op: 'fill', path, color: g.fillStyle, ...st }); },
    stroke() { ops.push({ op: 'stroke', path, color: g.strokeStyle, width: g.lineWidth, dash: g.dash, ...st }); },
    fillText(text, x, y) { ops.push({ op: 'fillText', text, x, y, color: g.fillStyle, font: g.font, ...st }); },
    strokeText(text) { ops.push({ op: 'strokeText', text, ...st }); },
    drawImage() { ops.push({ op: 'drawImage' }); },
  };
  return { g, ops };
}
const frame = (ov, f) => { const r = recorder(); ov.draw(r.g, f); return r.ops; };
const texts = ops => ops.filter(o => o.op === 'fillText');
const fontPx = op => Number(/(\d+(\.\d+)?)px/.exec(op.font)[1]);
function camera(x = 0) {
  const c = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.1, 100);
  c.position.set(x, 1.2, 6); c.lookAt(x, 0.8, 0); c.updateMatrixWorld(); c.updateProjectionMatrix();
  return c;
}
const make = (list, width = 1080, height = 1920, stage = { camera: camera() }) => createOverlays({ stage, width, height, list });

test('text: the default sound word still pops in from nothing and shrinks out', () => {
  const ov = make([{ kind: 'text', from: 10, to: 40, text: 'BANG', at: [0.5, 0.3] }]);
  assert.equal(texts(frame(ov, 10)).length, 0, 'nothing on the first frame of a pop');
  const mid = texts(frame(ov, 12))[0];
  assert.ok(mid.s > 0 && mid.s < 1.2, `popping scale ${mid.s}`);
  assert.equal(texts(frame(ov, 20))[0].s, 1);
  assert.ok(frame(ov, 20).some(o => o.op === 'strokeText'), 'the ink outline is kept');
  assert.equal(texts(frame(ov, 40)).length, 0, 'gone on the last frame');
});

test("text enter 'none': a label is at full size on its first and last frame", () => {
  const ov = make([{ kind: 'text', from: 0, to: 25, text: 'SUSPICION', at: [0.5, 0.2], enter: 'none' }]);
  for (const f of [0, 1, 12, 25]) { const t = texts(frame(ov, f)); assert.equal(t.length, 1, `drawn on f${f}`); assert.equal(t[0].s, 1); assert.equal(t[0].a, 1); }
  assert.equal(texts(frame(ov, 26)).length, 0);
});

test("text enter 'fade': alpha rises over 5 frames at full size", () => {
  const ov = make([{ kind: 'text', from: 0, to: 40, text: 'DAY 2', at: [0.5, 0.2], enter: 'fade' }]);
  const a = [1, 2, 3, 4, 5].map(f => texts(frame(ov, f))[0].a);
  for (let i = 1; i < a.length; i++) assert.ok(a[i] > a[i - 1]);
  assert.equal(a[4], 1);
  assert.equal(texts(frame(ov, 3))[0].s, 1);
});

test('text box: a rounded box is filled under the text, in its colour and alpha, and the outline goes', () => {
  const ov = make([{ kind: 'text', from: 0, to: 30, text: '0:56', at: [0.78, 0.18], size: 65, tilt: 0, enter: 'none', box: { color: '#c62828', alpha: 0.9, pad: 20 } }]);
  const ops = frame(ov, 5), i = ops.findIndex(o => o.op === 'fill'), t = ops.findIndex(o => o.op === 'fillText');
  assert.ok(i >= 0 && i < t, 'box before text');
  assert.equal(ops[i].color, '#c62828'); assert.ok(Math.abs(ops[i].a - 0.9) < 1e-9);
  assert.equal(ops[i].path[0][0], 'R');
  assert.equal(ops[t].color, '#ffffff', 'white text on a box by default');
  assert.equal(ops[t].a, 1, 'the text itself is opaque');
  assert.ok(!ops.some(o => o.op === 'strokeText'));
  const [, , , w] = ops[i].path[0];
  assert.ok(w >= 4 * 34 + 40 - 1e-9, `box ${w} px covers the text and the padding`);
});

test('a clock that ticks keeps the same box: 3:57 then 3:51 (a narrow 1) on consecutive entries, no pop at the tick', () => {
  const clock = (from, to, text) => ({ kind: 'text', from, to, text, at: [0.78, 0.18], size: 65, tilt: 0, enter: 'none', box: { color: '#c62828' } });
  const ov = make([clock(0, 29, '3:57'), clock(30, 59, '3:51')]);
  const box = f => frame(ov, f).find(o => o.op === 'fill').path[0];
  assert.deepEqual(box(29), box(30));
  assert.deepEqual(texts(frame(ov, 29)).map(t => t.text), ['3:57']);
  assert.deepEqual(texts(frame(ov, 30)).map(t => [t.text, t.s]), [['3:51', 1]]);
});

test('meter: the bar fills to the keyed value and moves smoothly between keys', () => {
  const W = 0.6 * 1080;
  const ov = make([{ kind: 'meter', from: 0, to: 90, at: [0.5, 0.2], label: 'SUSPICION', keys: [[10, 10], [40, 35]], enter: 'none' }]);
  const bar = f => { const fills = frame(ov, f).filter(o => o.op === 'fill'); return fills[fills.length - 1].path[0][3]; };
  assert.ok(Math.abs(bar(0) - 0.10 * W) < 1e-6, 'held at the first key before it');
  assert.ok(Math.abs(bar(40) - 0.35 * W) < 1e-6);
  assert.ok(Math.abs(bar(90) - 0.35 * W) < 1e-6, 'held after the last key');
  let last = bar(10);
  for (let f = 11; f <= 40; f++) { const b = bar(f); assert.ok(b >= last - 1e-9, `no step back at f${f}`); last = b; }
  assert.deepEqual(texts(frame(ov, 40)).map(t => t.text), ['SUSPICION', '35%']);
  assert.equal(valueAt([[10, 10], [40, 35]], 25), 22.5);
});

test('meter: label and value are at least 14 px on a 360 px wide phone, and the bar stays on screen', () => {
  const ov = make([{ kind: 'meter', from: 0, to: 30, at: [0.5, 0.2], label: 'SUSPICION', keys: [[0, 35]], unit: ' / 100', enter: 'none' }], 360, 640);
  const ops = frame(ov, 5);
  for (const t of texts(ops)) assert.ok(fontPx(t) >= 14, `${t.text} at ${fontPx(t)} px`);
  assert.equal(texts(ops)[1].text, '35 / 100');
  for (const o of ops.filter(x => x.op === 'fill')) { const [, x, , w] = o.path[0]; assert.ok(x >= 0 && x + w <= 360, 'inside the frame'); }
});

test('meter fades in by default', () => {
  const ov = make([{ kind: 'meter', from: 0, to: 30, at: [0.5, 0.2], label: 'S', keys: [[0, 50]] }]);
  assert.equal(frame(ov, 0).length, 0);
  assert.ok(texts(frame(ov, 2))[0].a < 1);
  assert.equal(envelope({ kind: 'meter', from: 0, to: 30 }, 10).a, 1);
});

const STEPS = { kind: 'path', from: 0, to: 60, world: [[-1, 0, 0], [0, 1, 0], [1.5, 1, 0]], dur: 30, labels: ['DOOR 9', 'CAR'], enter: 'none' };
const drawn = ops => { const s = ops.find(o => o.op === 'stroke' && o.dash.length); let len = 0;
  for (let i = 1; i < s.path.length; i++) if (s.path[i][0] === 'L') len += Math.hypot(s.path[i][1] - s.path[i - 1][1], s.path[i][2] - s.path[i - 1][2]);
  return { len, s }; };

test('path: a dotted line draws on over dur frames, ink under the colour', () => {
  const ov = make([STEPS]);
  const full = drawn(frame(ov, 30)).len, half = drawn(frame(ov, 15)).len;
  assert.ok(full > 100, `full path ${full} px`);
  assert.ok(Math.abs(half / full - 0.5) < 0.02, `half way at f15: ${half / full}`);
  assert.ok(drawn(frame(ov, 5)).len < half);
  assert.ok(Math.abs(drawn(frame(ov, 60)).len - full) < 1e-6, 'stays drawn');
  const dashed = frame(ov, 20).filter(o => o.op === 'stroke' && o.dash.length);
  assert.equal(dashed.length, 2);
  assert.ok(dashed[0].width > dashed[1].width && dashed[0].color === '#141414', 'ink underlay first');
  assert.ok(dashed[0].dash[0] < 1, 'dots: a near-zero dash with round caps');
});

test('path: the start label is on from the start, the end label only once the line arrives', () => {
  const ov = make([STEPS]);
  assert.deepEqual(texts(frame(ov, 10)).map(t => t.text), ['DOOR 9']);
  assert.deepEqual(texts(frame(ov, 29)).map(t => t.text), ['DOOR 9']);
  assert.deepEqual(texts(frame(ov, 36)).map(t => t.text), ['DOOR 9', 'CAR']);
});

test('path: world points are projected through the camera, so the line follows a camera move', () => {
  const stage = { camera: camera(0) }, ov = make([STEPS], 1080, 1920, stage);
  const a = drawn(frame(ov, 40)).s.path[0];
  stage.camera = camera(0.8);
  const b = drawn(frame(ov, 40)).s.path[0];
  assert.ok(a[1] - b[1] > 20, `the start point moves left on screen as the camera trucks right (${a[1]} -> ${b[1]})`);
});

test('path in screen space: at points as shares of the frame', () => {
  const ov = make([{ kind: 'path', from: 0, to: 30, at: [[0.2, 0.5], [0.8, 0.5]], dur: 10, enter: 'none' }]);
  const { s, len } = drawn(frame(ov, 10));
  assert.deepEqual(s.path[0], ['M', 216, 960]);
  assert.ok(Math.abs(len - 648) < 1e-6);
});
