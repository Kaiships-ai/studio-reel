// The heads-up overlay kinds (styles/stick-man/engine/hud.js through engine/overlays.js): a countdown clock, a threat
// track, a two-way vote card, an edge flash, the 'slam' entrance and a box outline, and the boxes a text check reads.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createOverlays, envelope } from '../../styles/stick-man/engine/overlays.js';
import { clockValue, clockSecs, clockText, clockEvents, threatState, stepValue } from '../../styles/stick-man/engine/hud.js';
import { TEXT_SAFE, UI_BANDS } from '../../styles/stick-man/tools/run/shotlist.mjs';

function recorder() {
  const ops = [], stack = []; let st = { s: 1, a: 1, tx: 0, ty: 0 };
  const g = {
    font: '', fillStyle: '', strokeStyle: '', lineWidth: 1, textAlign: '', textBaseline: '', lineJoin: '', lineCap: '', shadowColor: '', shadowBlur: 0, letterSpacing: '',
    get globalAlpha() { return st.a; }, set globalAlpha(v) { st.a = v; },
    save() { stack.push({ st: { ...st }, font: g.font }); }, restore() { const p = stack.pop(); st = p.st; g.font = p.font; },
    translate(x, y) { st.tx += x * st.s; st.ty += y * st.s; }, rotate() {}, scale(s) { st.s *= s; }, clip() {}, setLineDash() {},
    measureText: t => ({ width: [...String(t)].length * 0.6 * Number(/(\d+(\.\d+)?)px/.exec(g.font)?.[1] ?? 10) }),
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc(x, y, r) { ops.push({ op: 'arc', x: st.tx + x * st.s, y: st.ty + y * st.s, r: r * st.s }); }, ellipse() {}, rect() {}, roundRect() {},
    fill() { ops.push({ op: 'fill', color: g.fillStyle, ...st }); }, stroke() { ops.push({ op: 'stroke', color: g.strokeStyle, ...st }); },
    fillRect(x, y, w, h) { ops.push({ op: 'fillRect', x, y, w, h, ...st }); },
    createLinearGradient: () => ({ addColorStop() {} }),
    fillText(text, x, y) { ops.push({ op: 'fillText', text, x: st.tx + x * st.s, y: st.ty + y * st.s, color: g.fillStyle, font: g.font, ...st }); },
    strokeText() {}, drawImage() {},
  };
  return { g, ops };
}
globalThis.document ??= { createElement: () => ({ getContext: () => ({ clearRect() {}, drawImage() {} }) }) };
const cam = () => { const c = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.1, 100); c.position.set(0, 1.2, 6); c.lookAt(0, 0.8, 0); c.updateMatrixWorld(); c.updateProjectionMatrix(); return c; };
const make = (list, w = 1080, h = 1920) => createOverlays({ stage: { camera: cam() }, width: w, height: h, list });
const frame = (ov, f) => { const r = recorder(); ov.draw(r.g, f); return r.ops; };
const texts = ops => ops.filter(o => o.op === 'fillText').map(o => o.text);
const textOp = (ops, t) => ops.find(o => o.op === 'fillText' && o.text === t);
const boxes = (ov, f) => ov.boxes(f, recorder().g);

const CLOCK = { kind: 'clock', from: 0, to: 300, label: 'MOM', alarm: 60, keys: [[0, 240], [53, 239], [100, 200], [101, 63], [150, 60], [200, 30]], tags: [[150, 170, '>> LATER']] };

test('clock: the time runs between keys and shows as m:ss, rounded up', () => {
  assert.equal(clockText(clockSecs(CLOCK.keys, 0)), '4:00');
  assert.equal(clockValue(CLOCK.keys, 26.5), 239.5);
  assert.equal(clockText(clockSecs(CLOCK.keys, 300)), '0:30');
  assert.ok(texts(frame(make([CLOCK]), 20)).includes('4:00'), 'the time is drawn');
  assert.ok(texts(frame(make([CLOCK]), 20)).includes('MOM'), 'the label is drawn');
});

test('clock: it slams in on its first frame and settles by frame 8', () => {
  const ov = make([CLOCK]), first = textOp(frame(ov, 0), '4:00'), later = textOp(frame(ov, 9), '4:00');
  assert.ok(first.s > 1.5, `slam scale ${first.s}`); assert.equal(later.s, 1);
});

test('clock: under the alarm second it turns red and punches on each tick; a big drop shakes it and slides a chip out', () => {
  const ov = make([{ ...CLOCK, keys: [[0, 70], [30, 59], [31, 58], [60, 57], [61, 0]] }]);
  const yellow = textOp(frame(ov, 20), '1:03'), red = textOp(frame(ov, 31), '0:58');
  assert.notEqual(yellow.color, red.color, 'red under the alarm');
  assert.ok(red.s > 1.05, `the tick punches (${red.s})`); assert.equal(textOp(frame(ov, 40), '0:58').s, 1);
  assert.deepEqual(clockEvents({ ...CLOCK, keys: [[0, 70], [60, 57], [61, 0]] }, 63).drop, { age: 2, by: 57 });
  assert.ok(texts(frame(ov, 63)).includes('-0:57'), 'the chip names the drop');
});

test('clock: a tagged jump (a time skip) shows its tag and no chip', () => {
  const ov = make([{ ...CLOCK, keys: [[0, 240], [150, 240], [151, 160]], tags: [[151, 170, '>> 1:20 LATER']] }]);
  const t = texts(frame(ov, 153));
  assert.ok(t.includes('>> 1:20 LATER') && !t.some(x => x.startsWith('-')), t.join(' | '));
});

test('clock slots: the count steps on its key frames and the newest slot pops', () => {
  assert.equal(stepValue([[10, 1], [40, 2]], 39), 1); assert.equal(stepValue([[10, 1], [40, 2]], 40), 2);
  const ov = make([{ ...CLOCK, slots: { n: 4, keys: [[10, 1], [40, 2]], icon: 'bag' } }]);
  assert.ok(texts(frame(ov, 41)).filter(t => t === '$').length >= 2, 'filled bags carry a $');
});

test('threat: nothing before its first step, then the word holds until the next step and the marker eases up', () => {
  const steps = [{ f: 10, who: 'MOM', word: 'NEAR', level: 0.2 }, { f: 60, who: 'MOM', word: 'AT THE DOOR', level: 0.8 }];
  const ov = make([{ kind: 'threat', from: 0, to: 200, steps }]);
  assert.deepEqual(texts(frame(ov, 5)), []);
  assert.ok(texts(frame(ov, 40)).includes('NEAR')); assert.ok(texts(frame(ov, 120)).includes('AT THE DOOR'), 'never leaves the screen');
  assert.ok(threatState(steps, 62).level < threatState(steps, 70).level && threatState(steps, 70).level < threatState(steps, 90).level);
  assert.equal(threatState(steps, 90).level, 0.8);
});

test('vote: each choice lands on its own word, the rows come and go on their frames', () => {
  const v = { kind: 'vote', from: 0, to: 120, choices: ['STAY', 'RUN'], hits: [10, 30], or: 20,
    lines: [{ f: 50, text: 'COMMENT', cta: true }, { f: 70, to: 89, text: 'AND YOUR ANSWER', row: 2 }, { f: 90, text: 'PICKS PART 2', row: 2 }] };
  const ov = make([v]);
  assert.deepEqual(texts(frame(ov, 5)), []);
  assert.ok(texts(frame(ov, 12)).includes('STAY') && !texts(frame(ov, 12)).includes('RUN'));
  const t = texts(frame(ov, 95)); assert.ok(['STAY', 'RUN', 'or', 'COMMENT', 'PICKS PART 2'].every(x => t.includes(x)) && !t.includes('AND YOUR ANSWER'), t.join(' | '));
});

test('vote at its default place: every box sits inside the text-safe box and off the app bands', () => {
  const ov = make([{ kind: 'vote', from: 0, to: 120, choices: ['STAY', 'RUN'], hits: [0, 0], lines: [{ f: 0, text: 'COMMENT', cta: true }, { f: 0, text: 'PICKS PART 2', row: 2 }] }]);
  for (const b of boxes(ov, 60)) {
    assert.ok(b.box[1] >= TEXT_SAFE.y0 && b.box[3] <= TEXT_SAFE.y1 && b.box[0] >= TEXT_SAFE.x0 && b.box[2] <= TEXT_SAFE.x1, `${b.text} ${b.box}`);
    assert.ok(b.box[3] <= 1 - UI_BANDS.bottom, `${b.text} clear of the bottom band`);
  }
});

test('vote: long choices shrink until the pair fits the text-safe width', () => {
  const ov = make([{ kind: 'vote', from: 0, to: 60, choices: ['FIX IT', 'BLAME THE DOG FOR EVERYTHING'], hits: [0, 0] }]);
  for (const b of boxes(ov, 30)) assert.ok(b.box[0] >= TEXT_SAFE.x0 && b.box[2] <= TEXT_SAFE.x1, `${b.text} ${b.box}`);
});

test("vote: the 'or' chip never covers a letter, short or long choices, through the heartbeat", () => {
  const px = op => Number(/(\d+(\.\d+)?)px/.exec(op.font)[1]) * op.s, half = op => [...op.text].length * 0.6 * px(op) / 2;
  for (const choices of [['HIDE', 'SPEND'], ['FIX IT', 'BLAME THE DOG'], ['YES', 'BLAME THE DOG FOR EVERYTHING']]) {
    const ov = make([{ kind: 'vote', from: 0, to: 120, choices, hits: [0, 6], or: 3 }]);
    for (let f = 20; f <= 120; f++) {
      const ops = frame(ov, f), chip = ops.find(o => o.op === 'arc'), a = textOp(ops, choices[0]), b = textOp(ops, choices[1]);
      assert.ok(a.x + half(a) <= chip.x - chip.r && b.x - half(b) >= chip.x + chip.r, `${choices} f${f}: ${a.x + half(a)} | ${chip.x - chip.r}..${chip.x + chip.r} | ${b.x - half(b)}`);
    }
  }
});

test('threat: steps in any order give the same track; a step without a word never draws "undefined"', () => {
  const A = [{ f: 0, who: 'MOM', word: 'NEAR', level: 0.3 }, { f: 30, word: 'HERE', level: 0.9 }];
  for (const f of [10, 35, 60]) assert.deepEqual(threatState([A[1], A[0]], f), threatState(A, f));
  const ops = frame(make([{ kind: 'threat', from: 0, to: 40, steps: [{ f: 0, who: 'MOM', level: 0.4 }] }]), 20);
  assert.ok(!texts(ops).some(t => /undefined/.test(t)) && texts(ops).includes('MOM'));
});

test('boxes leave the canvas font as it was (the dbg rows measure on the caption canvas)', () => {
  const ov = make([{ ...CLOCK }, { kind: 'threat', from: 0, to: 300, steps: [{ f: 0, who: 'MOM', word: 'NEAR', level: 0.3 }] },
    { kind: 'vote', from: 0, to: 300, choices: ['STAY', 'RUN'], hits: [0, 0], lines: [{ f: 0, text: 'COMMENT', cta: true }] }]);
  const r = recorder(); r.g.font = '40px caption'; ov.boxes(20, r.g); assert.equal(r.g.font, '40px caption');
});

test('boxes: a text label, a meter, a clock and a threat give boxes in shares of the frame, tagged with their overlay', () => {
  const ov = make([{ kind: 'text', from: 0, to: 40, text: 'HELLO', at: [0.5, 0.3], tilt: 0, enter: 'none' }, { ...CLOCK }, { kind: 'meter', from: 0, to: 40, at: [0.5, 0.5], label: 'HEAT', keys: [[0, 10]], enter: 'none' },
    { kind: 'threat', from: 0, to: 40, steps: [{ f: 0, who: 'MOM', word: 'NEAR', level: 0.3 }] }]);
  const B = boxes(ov, 20);
  const t = B.find(b => b.text === 'HELLO'); assert.ok(t.box[0] < 0.5 && t.box[2] > 0.5 && t.box[1] < 0.3 && t.box[3] > 0.3);
  assert.ok(B.find(b => b.kind === 'clock' && b.text === '4:00')); assert.ok(B.find(b => b.kind === 'meter'));
  const th = B.find(b => b.kind === 'threat'); assert.ok(th.box[1] >= UI_BANDS.top, `the threat's words clear the top band (${th.box})`);
  assert.deepEqual([...new Set(B.map(b => b.i))].sort(), [0, 1, 2, 3]);
  assert.deepEqual(boxes(make([{ kind: 'text', from: 0, to: 40, text: 'X', at: [0.5, 0.5] }]), 41), [], 'nothing after `to`');
});

test("enter 'slam': it lands from 1.8x over 5 frames and shrinks out like a pop", () => {
  const o = { kind: 'text', from: 0, to: 40, enter: 'slam' };
  assert.ok(Math.abs(envelope(o, 0).s - 1.8) < 1e-9); assert.equal(envelope(o, 5).s, 1); assert.ok(envelope(o, 39).s < 1);
});

test('a box outline is stroked only when asked for; a plain box is filled as before', () => {
  const draws = list => frame(make(list), 10).filter(o => o.op === 'stroke').length;
  const base = { kind: 'text', from: 0, to: 40, text: 'LOST', at: [0.5, 0.2], enter: 'none' };
  assert.equal(draws([{ ...base, box: { color: '#000' } }]), 0);
  assert.equal(draws([{ ...base, box: { color: '#000', outline: '#46e68c' } }]), 1);
});

test('edge: a flash in the outer band that decays over its span', () => {
  const ov = make([{ kind: 'edge', from: 0, to: 10, color: '#ff3028', peak: 0.3 }]);
  const a0 = frame(ov, 0).filter(o => o.op === 'fillRect'), a9 = frame(ov, 9).filter(o => o.op === 'fillRect');
  assert.equal(a0.length, 4, 'four sides'); assert.ok(a0[0].a > a9[0].a);
  assert.ok(a0.every(r => r.w <= 0.12 * 1080 + 1 || r.h <= 0.08 * 1920 + 1), 'only the outer band');
});

test('endcard: by default every card sits inside the text-safe box and off the app bands; long lines shrink to fit', () => {
  const lines = [{ f: 0, text: 'COMMENT YOUR GUESS', cta: true }, { f: 4, text: 'PART 2 DECIDES WHO WAS RIGHT ALL ALONG' }];
  for (const at of [undefined, [0.465, 0.8], [0.95, 0.55]]) {
    const B = boxes(make([{ kind: 'endcard', from: 0, to: 60, lines, ...(at ? { at } : {}) }]), 30);
    assert.equal(B.length, 2);
    for (const b of B) assert.ok(b.box[0] >= TEXT_SAFE.x0 && b.box[2] <= TEXT_SAFE.x1 && b.box[1] >= TEXT_SAFE.y0 && b.box[3] <= TEXT_SAFE.y1, `${at} ${b.text} ${b.box}`);
  }
});

test("endcard: a card appears on its frame without moving the others; free keeps the film's own place", () => {
  const o = { kind: 'endcard', from: 0, to: 60, lines: [{ f: 0, text: 'FOLLOW', cta: true }, { f: 20, text: 'FOR PART 2' }] };
  const at10 = boxes(make([o]), 10), at30 = boxes(make([o]), 30);
  assert.equal(at10.length, 1); assert.equal(at30.length, 2); assert.deepEqual(at10[0].box, at30[0].box);
  const low = boxes(make([{ ...o, at: [0.465, 0.8], free: true }]), 30);
  assert.ok(low[1].box[3] > TEXT_SAFE.y1, 'a free stack stays where the film put it (the text gate then says so)');
});

test('endcard: a stack taller than the text-safe box shrinks until its last card is above the app bottom bar', () => {
  const inSafe = b => b.box[0] >= TEXT_SAFE.x0 && b.box[2] <= TEXT_SAFE.x1 && b.box[1] >= TEXT_SAFE.y0 && b.box[3] <= TEXT_SAFE.y1;
  const seven = Array.from({ length: 7 }, (_, i) => ({ f: 0, text: `CARD ${i + 1}`, cta: true }));
  const B = boxes(make([{ kind: 'endcard', from: 0, to: 60, lines: seven }]), 30);
  assert.equal(B.length, 7);
  for (const b of B) assert.ok(inSafe(b), `${b.text} ${b.box}`);
  const five = boxes(make([{ kind: 'endcard', from: 0, to: 60, lines: seven.slice(0, 5) }]), 30);
  assert.ok(Math.abs(five[0].box[1] - 0.2525) < 0.001 && Math.abs(five[4].box[3] - 0.64) < 0.001, `a stack that fits keeps its size: ${five[0].box[1]} ${five[4].box[3]}`);
});

test('endcard: a line too wide for the safe box even at the smallest size stays on the frame', () => {
  const text = 'X'.repeat(56);
  const [b] = boxes(make([{ kind: 'endcard', from: 0, to: 60, lines: [{ f: 0, text }] }]), 30);
  assert.ok(b.box[0] >= 0 && b.box[2] <= 1, `${b.box}`);
});
