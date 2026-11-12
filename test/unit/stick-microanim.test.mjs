// The stick-man micro-animation layer (styles/stick-man/engine/acting.js): the reference's move spacing (slow start, 12-15 f),
// held idle beats instead of a constant fidget, word-driven mouths that open and close, and in-betweened face changes
// (FORENSIC.md section 3 and fixes 8, 14).
import test from 'node:test';
import assert from 'node:assert/strict';
import { slowIn, MOVE_T, idleBeats, idleGap, phonemes, visemeTrack, faceStateAt, exprAccent, FACE_T, TAKE_T } from '../../styles/stick-man/engine/acting.js';

test('slowIn: 7 % of the travel in the first eighth, half at the middle, monotone', () => {
  assert.ok(Math.abs(slowIn(1 / 8) - 0.07) < 0.01);
  assert.ok(Math.abs(slowIn(0.5) - 0.5) < 1e-9);
  assert.equal(slowIn(0), 0); assert.equal(slowIn(1), 1);
  for (let i = 1; i <= 64; i++) assert.ok(slowIn(i / 64) >= slowIn((i - 1) / 64));
  assert.ok(MOVE_T >= 12 && MOVE_T <= 15);
});

test('idle beats: a move of MOVE_T frames, then a hold of at least 20 frames that does not move', () => {
  for (const seed of [11, 4242, 987654]) {
    assert.ok(idleGap(seed, 3) >= 36);
    // find a beat boundary: the frame after which the head channel stops changing
    let f = 0, moving = 0, held = 0, best = 0;
    for (; f < 600; f++) { const a = idleBeats(seed, f), b = idleBeats(seed, f + 1), d = Math.abs(a.head_tilt - b.head_tilt) + Math.abs(a.dx - b.dx);
      if (d < 1e-9) { held++; best = Math.max(best, held); } else { held = 0; moving++; } }
    assert.ok(best >= 20, `seed ${seed}: longest still idle stretch ${best} f`);
  }
});

test('phonemes: vowels, closures and teeth', () => {
  assert.deepEqual(phonemes('Wait.'), ['w', 'a', 'c']);
  assert.ok(phonemes('maybe').includes('m'));
  assert.ok(phonemes('five').includes('f'));
  assert.deepEqual(phonemes('...'), []);
});

test('visemes: the mouth opens on the words, closes in a pause, and swings a lot (CV >= 0.4)', () => {
  const words = [{ line: 'l01', word: 'Wait.', t0: 1.0, t1: 1.32 }, { line: 'l01', word: 'It', t0: 1.52, t1: 1.62 }, { line: 'l01', word: 'actually', t0: 1.62, t1: 2.02 }, { line: 'l01', word: 'works!', t0: 2.02, t1: 2.5 }];
  const v = visemeTrack(words, 30, ['l01']);
  assert.equal(v(0), null);
  const xs = []; for (let f = 28; f <= 76; f++) xs.push(v(f)?.open ?? 0);
  const m = xs.reduce((a, b) => a + b, 0) / xs.length, cv = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length) / m;
  assert.ok(Math.max(...xs) > 0.7, 'a wide-open vowel');
  assert.ok(v(42).open < 0.1, 'closed in the pause after "Wait."');
  assert.ok(cv >= 0.4, `mouth CV ${cv.toFixed(2)}`);
  assert.equal(visemeTrack(words, 30, ['l99'])(40), null);
});

test('face: a change is in-betweened over FACE_T frames (a new mix every frame), then holds', () => {
  const track = [{ f: -1e9, expr: 'neutral' }, { f: 20, expr: 'happy' }];
  const us = []; for (let f = 20; f < 20 + FACE_T; f++) { const s = faceStateAt(track, f, 7); assert.equal(s.a, 'neutral'); assert.equal(s.b, 'happy'); us.push(s.u); }
  assert.equal(new Set(us.map(u => u.toFixed(4))).size, FACE_T);
  assert.ok(us[0] < 0.1);
  const late = faceStateAt(track, 60, 7); assert.equal(late.a, 'happy'); assert.equal(late.u, 1);
  assert.notDeepEqual(faceStateAt(track, 60, 7).life, faceStateAt(track, 75, 7).life, 'a held face still drifts');
});

test('face: a take (shock) lands in TAKE_T frames, and the eyes move in GAZE_T frames ahead of the face', () => {
  const track = [{ f: -1e9, expr: 'neutral' }, { f: 20, expr: 'shock' }];
  assert.ok(faceStateAt(track, 20 + TAKE_T, 7).u > 0.95, 'landed by frame 3');
  const slow = [{ f: -1e9, expr: 'neutral' }, { f: 20, expr: 'smug' }], s3 = faceStateAt(slow, 23, 7);
  assert.ok(s3.ug > 0.95 && s3.u < 0.6, `eyes ${s3.ug.toFixed(2)} ahead of the face ${s3.u.toFixed(2)}`);
});

test('expression accent: anticipation, a slow rise, a hold, a release', () => {
  const track = [{ f: -1e9, expr: 'neutral' }, { f: 30, expr: 'shock' }];
  const at = f => exprAccent(track, f, 5).head_pitch || 0;
  assert.equal(at(20), 0);
  assert.ok(at(28) > 0, 'anticipation goes the other way (shock pitches the head back, so first forward)');
  assert.ok(at(50) < -10, 'risen');
  assert.ok(Math.abs(at(55) - at(65)) < 0.5, 'held');
  assert.equal(at(200), 0, 'released');
});
