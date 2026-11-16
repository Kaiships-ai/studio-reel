// Face changes stay smooth when keys come close together (films/hm-ep01-r2/review/face-research.md, rule 1): a new
// change blends from the face on screen, never from the previous target. SH240's keys (panic 0, shock 8, sad 12,
// happy 17) made the brow jump -12.1 -> -19.8 deg in one frame, away from the new target.
import test from 'node:test';
import assert from 'node:assert/strict';
import { faceStateAt } from '../../styles/stick-man/engine/acting.js';
import { mixFace, faceParams } from '../../styles/stick-man/engine/faces.js';

const SH240 = [{ f: 0, expr: 'panic' }, { f: 8, expr: 'shock' }, { f: 12, expr: 'sad' }, { f: 17, expr: 'happy' }];
const curve = (track, f0, f1) => {
  const out = [];
  for (let f = f0; f < f1; f++) { const s = faceStateAt(track, f, 7, null), { F } = mixFace(s); out.push({ f, tilt: F.brow[0], lid: F.lid, b: s.b }); }
  return out;
};

test('rule 1: an interrupted change blends from the face on screen (SH240 keys: no backward jump)', () => {
  const c = curve(SH240, 0, 50);
  for (let i = 1; i < c.length; i++) {
    const d = c[i].tilt - c[i - 1].tilt, toward = faceParams(c[i].b).brow[0] - c[i - 1].tilt;
    // a step away from the target of the change on screen, bigger than the hold drift, is a pop
    assert.ok(!(d * toward < 0 && Math.abs(d) > 1.0), `f${c[i].f}: brow ${c[i - 1].tilt.toFixed(1)} -> ${c[i].tilt.toFixed(1)} deg, away from ${c[i].b}`);
  }
  const worst = Math.max(...c.slice(1).map((x, i) => Math.abs(x.tilt - c[i].tilt)));
  assert.ok(worst < 5, `largest one-frame brow change ${worst.toFixed(1)} deg (main: 7.7 at f17)`);
});

// ---------------------------------------------------------------- rules 2-14: timing, overlap, takes, blinks, gaze
import * as acting from '../../styles/stick-man/engine/acting.js';
import { faceFaults } from '../../styles/stick-man/tools/faults.mjs';
const { exprAccent, blinkTrack } = acting;
const T0 = (...keys) => [{ f: -1e9, expr: keys[0] }, ...keys.slice(1).map(([f, expr, o]) => ({ f, expr, ...o }))];
const st = (track, f) => faceStateAt(track, f, 7, null);
// frames from the key until the brow clock first reaches q
const reach = (track, kf, q, n = 40) => { for (let a = 0; a < n; a++) if ((st(track, kf + a).uf?.brow ?? st(track, kf + a).u) >= q) return a; return null; };
// the engine's face as __dbg rows (play.js faceDbg), for the QA check
export const rowsOf = (track, f0, f1, extra = () => ({})) => {
  const rows = [];
  for (let f = f0; f < f1; f++) {
    const s = st(track, f), { F, blink } = mixFace(s), T = faceParams(s.b), c = s.change;
    rows.push({ f, act: 0, motion: { cut: false }, actors: { you: { inFrame: true, face: { v: [F.brow[0], F.brow[1], F.lid, F.white, F.ry, F.mw], tgt: [T.brow[0], T.brow[1], T.lid, T.white, T.ry, T.mw],
      cls: c?.cls ?? null, kf: c?.kf ?? null, phase: s.phase, blink, pupil: 0, look: 0, focus: 'camera', ...extra(f) } } } });
  }
  return rows;
};

test('rule 2: each class has its own length (fast 6 f, normal 10 f, slow 16 f)', () => {
  const fast = reach(T0('neutral', [30, 'angry']), 30, 0.9), normal = reach(T0('neutral', [30, 'happy']), 30, 0.9), slow = reach(T0('neutral', [30, 'sad']), 30, 0.9);
  assert.ok(fast <= 5, `fast at 90 % after ${fast} f`); assert.ok(normal >= 6 && normal <= 9, `normal ${normal} f`); assert.ok(slow >= 11, `slow ${slow} f`);
  assert.ok(reach(T0('panic', [30, 'calm']), 30, 0.9) >= 11, 'a tense face released into a calm one is slow');
});

test('rule 3: overshoot is soft on a normal change, bigger on a fast one, biggest on a take accent', () => {
  const peak = (tr, kf) => Math.max(...Array.from({ length: 30 }, (_, a) => st(tr, kf + a).u));
  const n = peak(T0('neutral', [30, 'happy']), 30), f = peak(T0('neutral', [30, 'angry']), 30), t = peak(T0('calm', [30, 'shock']), 30);
  assert.ok(n > 1.01 && n < 1.06, `normal ${n.toFixed(3)}`); assert.ok(f > 1.07 && f < 1.12, `fast ${f.toFixed(3)}`); assert.ok(t > 1.18, `take ${t.toFixed(3)}`);
});

test('rule 5: inside a change the pupils lead, the brows go first, the lids follow, the mouth comes last', () => {
  const tr = T0('neutral', [30, 'smug']);
  assert.ok(st(tr, 29).uf.gaze > 0 && st(tr, 29).uf.brow === 0, 'pupils move 1 f before the key');
  const s = st(tr, 33); assert.ok(s.uf.brow > s.uf.lid && s.uf.lid > s.uf.mouth, `brow ${s.uf.brow.toFixed(2)} lid ${s.uf.lid.toFixed(2)} mouth ${s.uf.mouth.toFixed(2)}`);
});

test('rule 6: a take is anticipation -> accent on ones -> hold -> settle on twos', () => {
  const tr = T0('calm', [75, 'shock']), { F: before } = mixFace(st(tr, 69));
  const ph = Array.from({ length: 25 }, (_, a) => st(tr, 70 + a).phase);
  assert.deepEqual(ph.slice(0, 5), Array(5).fill('antic'));
  assert.deepEqual(ph.slice(5, 9), Array(4).fill('accent'));
  assert.deepEqual(ph.slice(9, 12), Array(3).fill('hold'));
  assert.deepEqual(ph.slice(12, 20), Array(8).fill('settle'));
  const { F: antic } = mixFace(st(tr, 74));
  assert.ok(antic.lid > before.lid + 0.2 && antic.brow[1] < before.brow[1] - 0.015, 'the anticipation squints and drops the brows');
  const acc = [75, 76, 77, 78].map(f => st(tr, f).u); for (let i = 1; i < 4; i++) assert.ok(acc[i] > acc[i - 1], 'accent: a new value every frame (on ones)');
  const set = [82, 83, 84, 85].map(f => st(tr, f).u); assert.equal(set[0], set[1]); assert.equal(set[2], set[3]); assert.ok(set[2] < set[0], 'settle on twos, back toward the face');
});

test('rule 7: a small take has no anticipation and is done in 10 f', () => {
  const tr = T0('calm', [40, 'shock', { small: true }]);
  assert.equal(st(tr, 39).change, null, 'nothing moves before the key');
  assert.equal(st(tr, 50).u, 1); assert.ok(Math.max(...[40, 41, 42, 43].map(f => st(tr, f).u)) > 1.05);
});

test('rule 8: which keys are takes, fast, normal or slow (a key may override)', () => {
  const cls = (from, k) => acting.changeClass(from, { f: 0, ...k });
  assert.equal(cls('calm', { expr: 'shock' }), 'take'); assert.equal(cls('panic', { expr: 'shock' }), 'fast');
  assert.equal(cls('calm', { expr: 'angry' }), 'fast'); assert.equal(cls('calm', { expr: 'pain' }), 'fast');
  assert.equal(cls('calm', { expr: 'sad' }), 'slow'); assert.equal(cls('panic', { expr: 'calm' }), 'slow');
  assert.equal(cls('calm', { expr: 'worried' }), 'normal');
  assert.equal(cls('calm', { expr: 'shock', take: false }), 'fast'); assert.equal(cls('calm', { expr: 'worried', take: true }), 'take');
  assert.equal(cls('calm', { expr: 'shock', small: true }), 'small'); assert.equal(cls('calm', { expr: 'happy', exprSpeed: 'slow' }), 'slow');
});

test('rule 10: every take and fast face moves the head, on the take timing', () => {
  for (const e of ['panic', 'scream', 'pain', 'angry', 'furious']) {
    const tr = T0('calm', [60, e]), mag = f => Object.values(exprAccent(tr, f, 3)).reduce((s, v) => s + Math.abs(v), 0);
    assert.ok(mag(80) > 0.05, `${e}: a head accent`);
  }
  const tr = T0('calm', [60, 'shock']), hp = f => exprAccent(tr, f, 3).head_pitch || 0;
  assert.ok(hp(58) > 0, 'the head dips in the anticipation');
  const steps = Array.from({ length: 20 }, (_, a) => [55 + a, Math.abs(hp(56 + a) - hp(55 + a))]), big = steps.reduce((x, y) => (y[1] > x[1] ? y : x));
  assert.ok(big[0] >= 59 && big[0] <= 63, `the head's biggest step lands on the accent (frame ${big[0] + 1})`);
});

test('rule 11: a change of eye kind swaps inside the blink, or on a take\'s fastest frame', () => {
  const tr = T0('neutral', [30, 'closed']);
  let sw = null; for (let f = 25; f < 45; f++) if (mixFace(st(tr, f)).F.eye !== mixFace(st(tr, f - 1)).F.eye) { sw = f; break; }
  assert.ok(sw != null && st(tr, sw).blink >= 0.96 && st(tr, sw - 1).blink >= 0.96, `swap at f${sw} inside the shut frames`);
  const fa = T0('smug', [30, 'laugh']); let sw3 = null; for (let f = 25; f < 45; f++) if (mixFace(st(fa, f)).F.eye !== mixFace(st(fa, f - 1)).F.eye) { sw3 = f; break; }
  assert.ok(sw3 != null && st(fa, sw3).blink >= 0.96, `a fast change swaps on its blink's shut frame (f${sw3})`);
  const tk = T0('laugh', [30, 'shock']); let sw2 = null, big = [0, 0];
  for (let f = 22; f < 45; f++) { if (sw2 == null && mixFace(st(tk, f)).F.eye !== mixFace(st(tk, f - 1)).F.eye) sw2 = f; const d = st(tk, f).u - st(tk, f - 1).u; if (d > big[1]) big = [f, d]; }
  assert.equal(sw2, big[0], 'the take swaps on its fastest frame');
});

test('rule 12: blinks close faster than they open (regular 7 f, fast 5 f, long 9 f)', () => {
  for (const [k, n] of [['regular', 7], ['fast', 5], ['long', 9]]) {
    const b = acting.BLINKS[k], top = b.indexOf(1), last1 = b.lastIndexOf(1); assert.equal(b.length, n);
    assert.ok(top + 1 < b.length - 1 - last1, `${k}: close ${top + 1} f, open ${b.length - 1 - last1} f`);
  }
});

test('rule 13: 12-30 blinks a minute, one opens each normal change, none inside a take', () => {
  const sp = blinkTrack(5, 0, 1800, { gap: acting.BLINK_GAP.talk }), li = blinkTrack(5, 0, 1800, { gap: acting.BLINK_GAP.listen });
  assert.ok(sp.starts.length >= 12 && sp.starts.length <= 30, `speaker ${sp.starts.length} a minute`);
  assert.ok(li.starts.length >= 10 && li.starts.length < sp.starts.length, `listener ${li.starts.length} a minute`);
  const q = blinkTrack(5, 0, 1800, { gap: [20, 30], quiet: [[100, 400]] });
  assert.ok(q.list.every(b => b.f + 7 <= 100 || b.f >= 400), 'no free blink in a take window');
  const tr = T0('neutral', [30, 'happy']); assert.ok(st(tr, 29).blink > 0 && st(tr, 31).blink === 1, 'the change opens out of a blink');
  const tk = T0('neutral', [30, 'shock']); for (let f = 20; f < 40; f++) assert.equal(st(tk, f).blink, 0, `no blink in the take (f${f})`);
});

test('rule 14: on a focus change the pupils lead and the head follows 1-2 f later', () => {
  const on = k => { for (let d = 0; d < 12; d++) if (acting.focusEase(d)[k] > 0) return d; };
  const lead = on('head') - on('eye'); assert.ok(lead >= 1 && lead <= 2, `lead ${lead} f`);
  assert.equal(acting.focusEase(2).eye, 1, 'the pupils arrive in 3 f');
});

// ---------------------------------------------------------------- rule 15: the face QA check
test('rule 15: faceFaults passes a clean track and names every fault of a bad one', () => {
  const good = rowsOf(T0('calm', [30, 'worried'], [75, 'shock'], [100, 'panic'], [140, 'calm']), 0, 180);
  const g = faceFaults(good, 'you');
  assert.equal(g.pops.length, 0, JSON.stringify(g.pops.slice(0, 3)));
  assert.ok(g.rises.every(r => r.rise >= 6), JSON.stringify(g.rises)); assert.ok(g.holds.every(h => h.hold >= 6), JSON.stringify(g.holds));
  assert.equal(g.takes.n, 1); assert.deepEqual(g.faults, []);
  // SH240: keys 4-5 f apart never reach a hold (the film's data fault, named by the check)
  const sh = faceFaults(rowsOf(SH240, 0, 50), 'you');
  assert.equal(sh.pops.length, 0); assert.ok(sh.faults.some(x => /hold under/.test(x)), sh.faults.join('; '));
  // a jump back is a pop
  const bad = good.map(r => JSON.parse(JSON.stringify(r))); bad[40].actors.you.face.v[0] -= 8;
  assert.ok(faceFaults(bad, 'you').pops.length >= 1);
  // too many takes, too many changes
  const busy = T0('calm', ...Array.from({ length: 12 }, (_, i) => [20 + 25 * i, i % 2 ? 'calm' : 'shock']));
  const b = faceFaults(rowsOf(busy, 0, 330), 'you');
  assert.ok(b.faults.some(x => /takes in 10 s/.test(x)) && b.faults.some(x => /changes in 10 s/.test(x)), b.faults.join('; '));
});
