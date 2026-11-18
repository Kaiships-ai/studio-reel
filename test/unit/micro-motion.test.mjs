// The moving hold (styles/stick-man/engine/motion.js playActor + acting.js holdLife): a figure animated from keys never
// freezes between them. It breathes, its head drifts, its weight shifts, and after a stop the head settles after the body.
import test from 'node:test';
import assert from 'node:assert/strict';
import { compileTrack, keyed, playActor } from '../../styles/stick-man/engine/motion.js';
import { blinkTrack, BLINK_GAP, BLINKS } from '../../styles/stick-man/engine/acting.js';

const poses = { stand: { spine: { bend: 4 }, neck: { nod: 2 } }, lean: { spine: { bend: 30 }, neck: { nod: 20 } } };
const CH = ['spine.bend', 'spine.side', 'neck.nod', 'neck.tilt', 'neck.turn'];
const hold = (style, pos = [0, 0]) => {
  const tr = compileTrack([{ f: 0, pose: 'stand', pos }, { f: 300, pose: 'stand', pos }], poses, {}, style);
  return { tr, frames: playActor(tr, 0, 300) };
};
const offsets = ({ tr, frames }, c) => frames.map((o, i) => (o[c] || 0) - (keyed(tr, i)[c] || 0));
const range = a => Math.max(...a) - Math.min(...a);

test('a held pose is never a statue: chest and head move by whole degrees over 10 s', () => {
  const h = hold();
  assert.ok(range(offsets(h, 'spine.bend')) >= 1.5, `chest ${range(offsets(h, 'spine.bend')).toFixed(2)} deg`);
  for (const c of ['neck.tilt', 'neck.turn']) assert.ok(range(offsets(h, c)) >= 2, `${c} ${range(offsets(h, c)).toFixed(2)} deg`);
});

test('breath and drift stay inside their bounds (a hold never swims or jitters)', () => {
  const h = hold();
  const lim = { 'spine.bend': 3, 'spine.side': 3, 'neck.nod': 4, 'neck.tilt': 5, 'neck.turn': 6 };
  for (const c of CH) { const a = offsets(h, c).map(Math.abs); assert.ok(Math.max(...a) <= lim[c], `${c} peaks at ${Math.max(...a).toFixed(2)} deg`); }
  // no frame-to-frame step larger than 0.6 deg: low frequency only
  for (const c of CH) { const a = offsets(h, c), st = Math.max(...a.slice(1).map((x, i) => Math.abs(x - a[i]))); assert.ok(st <= 0.6, `${c} steps ${st.toFixed(2)} deg a frame`); }
});

test('the breath cycle is 3-4 s, like a person at rest', () => {
  const b = offsets(hold(), 'spine.bend'), m = b.reduce((x, y) => x + y, 0) / b.length;
  const ups = b.slice(1).map((x, i) => (b[i] < m && x >= m ? i : null)).filter(x => x != null), gaps = ups.slice(1).map((x, i) => x - ups[i]);
  const mean = gaps.reduce((x, y) => x + y, 0) / gaps.length;
  assert.ok(mean >= 80 && mean <= 125, `breath every ${mean.toFixed(0)} frames`);
});

test('the layer off (style life 0) changes nothing: the hold is the keyed pose', () => {
  const h = hold({ life: 0 });
  for (const c of CH) assert.deepEqual(offsets(h, c).map(x => +x.toFixed(9)), Array(301).fill(0), c);
});

test('two figures do not breathe in step', () => {
  const a = offsets(hold(undefined, [0, 0]), 'neck.tilt'), b = offsets(hold(undefined, [1.3, -0.4]), 'neck.tilt');
  assert.ok(a.some((x, i) => Math.abs(x - b[i]) > 0.5), 'the same drift on both');
});

test('captured keys (mocap) carry their own life: no layer on top', () => {
  const tr = compileTrack([{ f: 0, pose: 'stand', raw: true }, { f: 120, pose: 'stand', raw: true }], poses, {});
  const fr = playActor(tr, 0, 120);
  for (const c of CH) assert.ok(Math.max(...fr.slice(30).map((o, i) => Math.abs((o[c] || 0) - (keyed(tr, i + 30)[c] || 0)))) < 1e-9, c);
});

test('after a stop the body overshoots and settles first, the head a few frames later', () => {
  const tr = compileTrack([{ f: 0, pose: 'stand' }, { f: 10, pose: 'lean' }, { f: 80, pose: 'lean' }], poses, {});
  const fr = playActor(tr, 0, 40), over = c => fr.map((o, i) => o[c] - keyed(tr, i)[c]);
  const peak = a => { let k = 10; for (let i = 10; i <= 30; i++) if (a[i] > a[k]) k = i; return k; };
  const body = peak(over('spine.bend')), head = peak(over('neck.nod'));
  assert.ok(over('spine.bend')[body] > 0.6, `the chest carries on ${over('spine.bend')[body].toFixed(2)} deg past the key`);
  assert.ok(head - body >= 2 && head - body <= 8, `body peaks at ${body}, head at ${head}`);
});

test('blinks keep their spacing: a listener every 90-150 frames, never two inside the minimum gap', () => {
  const t = blinkTrack(12345, 0, 3000, { gap: BLINK_GAP.listen }), s = t.starts;
  const per10 = s.length / 10;
  assert.ok(per10 >= 1.5 && per10 <= 3.6, `${per10.toFixed(1)} blinks per 10 s`);
  const gaps = s.slice(1).map((x, i) => x - s[i]);
  for (const g of gaps) assert.ok(g >= BLINK_GAP.listen[0] || g === BLINKS.regular.length + 2, `gap ${g}`);
});
