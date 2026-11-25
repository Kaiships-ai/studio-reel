// Keys written one a frame by a film helper (`raw`: no drag, no moving hold) play dead: every part starts and stops on the
// same frame and a hold is a statue (What if 1, Kai: "character motion monotone, lacks emotion and life"). `acted` on those
// keys gives the overlap, the settle and the breathing back (engine/motion.js playActor).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { compileTrack, keyed, playActor, STYLE_PRESETS } from '../../styles/stick-man/engine/motion.js';
import { placeClip } from '../../styles/stick-man/motion-lib/index.js';

const F0 = 20, F1 = 26, END = 120;
const HI = { 'spine.bend': 30, 'neck.nod': 20, 'armR.raise': 60, 'armR.elbow': 60 };
const pose = u => ({ spine: { bend: 30 * u }, neck: { nod: 20 * u }, armR: { raise: 60 * u, elbow: 60 * u } });
// the whole body moves F0-F1 and stops dead, one key a frame
const keys = (x = {}, n = END) => Array.from({ length: n + 1 }, (_, f) => ({ f, ease: 'flow', raw: true, pos: [1, 2], ...pose(Math.min(1, Math.max(0, (f - F0) / (F1 - F0)))), ...x }));
const play = (ks, style) => playActor(compileTrack(ks, {}, {}, style), 0, END);
const quiet = { life: 0 };                                            // the breathing off: the springs alone
const half = (fr, c) => { let f = 0; while (fr[f][c] < HI[c] / 2) f++; return f - 1 + (HI[c] / 2 - fr[f - 1][c]) / (fr[f][c] - fr[f - 1][c]); };
const settled = (fr, c) => { let s = 0; fr.forEach((o, f) => { if (Math.abs(o[c] - HI[c]) > 0.05 * HI[c]) s = f + 1; }); return s - F1; };
const range = (fr, c, a, b) => { const v = fr.slice(a, b + 1).map(o => o[c]); return Math.max(...v) - Math.min(...v); };

test('acted: the neck comes about 2 frames after the spine, the upper arm about 4, the forearm about 5.5', () => {
  const fr = play(keys({ acted: true }), quiet), lag = c => half(fr, c) - half(fr, 'spine.bend');
  for (const [c, lo, hi] of [['neck.nod', 1.5, 3], ['armR.raise', 3, 5], ['armR.elbow', 4, 6]])
    assert.ok(lag(c) >= lo && lag(c) <= hi, `${c} ${lag(c).toFixed(1)} frames behind the spine, want ${lo}-${hi}`);
});

test('acted: after a sudden stop every part overshoots a little and settles', () => {
  const fr = play(keys({ acted: true }), quiet);
  for (const c of Object.keys(HI)) {
    const over = (Math.max(...fr.map(o => o[c])) / HI[c] - 1) * 100, s = settled(fr, c);
    assert.ok(over > 2 && over < 20, `${c} overshoots ${over.toFixed(1)} %`);
    assert.ok(s >= 3 && s <= 16, `${c} still ${s} frames after the stop`);
  }
  assert.ok(settled(fr, 'armR.elbow') > settled(fr, 'spine.bend'), 'the hand settles after the chest');
});

test('acted: a held pose breathes, two figures out of step; a lower dose is a held breath', () => {
  const fr = play(keys({ acted: true })), other = play(keys({ acted: true, pos: [2.3, 1.6] })), low = play(keys({ acted: 0.3 }));
  const hold = range(fr, 'spine.bend', 60, END), held = range(low, 'spine.bend', 60, END);
  assert.ok(hold > 1.5, `chest moves ${hold.toFixed(2)} deg in the hold`);
  assert.ok(fr.slice(60).some((o, i) => Math.abs(o['spine.bend'] - other[60 + i]['spine.bend']) > 0.5), 'both breathe in step');
  assert.ok(held < 0.4 * hold, `dose 0.3 moves ${held.toFixed(2)} deg of ${hold.toFixed(2)}`);
});

test('acted: a seated figure that travels with its car still breathes', () => {
  const ks = keys({ acted: true }).map(k => ({ ...k, pos: [1, 2 + 0.5 * k.f] }));
  const r = range(play(ks), 'spine.bend', 60, END);
  assert.ok(r > 1.5, `chest moves ${r.toFixed(2)} deg`);
});

test('a channel a per-frame key leaves out holds its last value, acted or not', () => {
  for (const x of [{}, { acted: true }]) {
    const ks = keys(x).map(k => { if (k.f <= 60) return k; const { neck: _n, armR: _a, ...o } = k; return o; });
    const fr = play(ks, quiet);
    for (const c of ['neck.nod', 'armR.raise', 'armR.elbow']) for (let f = 61; f <= END; f++) assert.ok(Math.abs(fr[f][c] - HI[c]) < 0.1, `${c} f${f} ${fr[f][c]}`);
  }
});

// guards the engine's channel table only; that the drawn hair and caps stay rigid on the head is stick-rigid-hair.test.mjs
test('acted: no hair or headwear channel is sprung', () => {
  const ks = keys({ acted: true }).map(k => ({ ...k, hair: { swing: k.f < 30 ? 0 : 20 }, hat: { tilt: k.f < 30 ? 0 : 20 } }));
  const tr = compileTrack(ks, {}, {}), fr = playActor(tr, 0, END);
  for (let f = 0; f <= END; f++) for (const c of ['hair.swing', 'hat.tilt']) assert.equal(fr[f][c], keyed(tr, f)[c], `${c} f${f}`);
  assert.deepEqual(Object.keys(play(keys({ acted: true }))[90]).filter(c => /hair|hat|cap|hood/.test(c)), []);
});

test('acted: a cut (snap key) starts every part on its key, nothing carried over', () => {
  const ks = keys({ acted: true }).map(k => (k.f === 24 ? { ...k, ease: 'snap', ...pose(0.2) } : k));
  const fr = play(ks, quiet);
  for (const c of Object.keys(HI)) assert.ok(Math.abs(fr[24][c] - 0.2 * HI[c]) < 1e-9, `${c} ${fr[24][c]}`);
});

test('a library clip never takes the layer: acted on a clip key changes nothing, and it is gone from a captured run after it', () => {
  const clip = { f: 0, clip: 'Gest_Talk_Loop', body: 'adult', pos: [0, 0], yaw: 0 };
  const at = k => playActor(compileTrack([k], {}, {}), 0, 80);
  assert.deepEqual(at({ ...clip, acted: true }), at(clip));
  const run = keys({ acted: true }, 10), cap = placeClip({ ...clip, f: 11 }).keys.map(k => ({ ...k, raw: true }));
  const tr = compileTrack([...run, ...cap], {}, {}), fr = playActor(tr, 0, 80);
  for (let f = 30; f <= 80; f++) assert.ok(Math.abs(fr[f]['neck.nod'] - keyed(tr, f)['neck.nod']) < 1e-9, `f${f}`);
});

test('acted: a dose that is not true, false or 0..1 is refused by name, never played', () => {
  for (const bad of [2, 5, -1, NaN, '1', Infinity]) assert.throws(() => compileTrack(keys({ acted: bad }), {}, {}), /acted .* at f 0: true, false or a dose 0\.\.1/, String(bad));
  for (const ok of [true, false, 0, 0.3, 1, null, undefined]) assert.doesNotThrow(() => compileTrack(keys({ acted: ok }), {}, {}), String(ok));
});

test('acted: an anticipation inside an acted move keeps the layer on', () => {
  const sparse = [{ f: 0, ...pose(0) }, { f: F0, ...pose(0) }, { f: 40, ...pose(1), antic: 0.5 }, { f: END, ...pose(1) }].map(k => ({ raw: true, acted: true, ...k }));
  const tr = compileTrack(sparse, {}, {}, quiet), fr = playActor(tr, 0, END);
  assert.ok(tr.some(t => t.antic), 'the move has its anticipation key');
  // the same curve written one key a frame has no antic key in it: it must play the same
  const dense = play(keys({ acted: true }).map(k => { const m = keyed(tr, k.f); return { ...k, spine: { bend: m['spine.bend'] }, neck: { nod: m['neck.nod'] }, armR: { raise: m['armR.raise'], elbow: m['armR.elbow'] } }; }), quiet);
  for (let f = 0; f <= END; f++) for (const c of Object.keys(HI)) assert.ok(Math.abs(fr[f][c] - dense[f][c]) < 1e-6, `${c} f${f}: ${fr[f][c].toFixed(1)}, one key a frame ${dense[f][c].toFixed(1)}`);
});

test('acted: at a snap the layer is on or off at once, on either side of the cut', () => {
  const cut = (a, b) => keys().map(k => ({ ...k, acted: k.f < F0 ? a : b, ...(k.f === F0 ? { ease: 'snap' } : {}) }));
  const whole = play(cut(true, true), quiet), onAtCut = play(cut(false, true), quiet), off = cut(true, false), tr = compileTrack(off, {}, {}), offAtCut = playActor(tr, 0, END);
  for (let f = F0; f <= END; f++) for (const c of Object.keys(HI)) {
    assert.ok(Math.abs(onAtCut[f][c] - whole[f][c]) < 1e-9, `raw to acted: ${c} f${f}`);
    assert.ok(Math.abs(offAtCut[f][c] - keyed(tr, f)[c]) < 1e-9, `acted to raw: ${c} f${f}`);
  }
});

test('acted: switched on or off in a hold nothing steps; switched on in a move nothing goes faster than an acted move', () => {
  const step = (fr, a, b) => Math.max(...['armR.raise', 'armR.elbow', 'neck.nod'].flatMap(c => fr.slice(a, b + 1).map((o, i) => Math.abs(o[c] - fr[a + i - 1][c]))));
  for (const on of [f => f >= 70, f => f < 70]) assert.ok(step(play(keys().map(k => ({ ...k, acted: on(k.f) })), quiet), 60, END) < 0.2);
  const swing = act => play(keys().map(k => ({ ...k, armR: { raise: 45 * Math.sin(2 * Math.PI * k.f / 28), elbow: 45 * Math.sin(2 * Math.PI * k.f / 28) }, acted: act(k.f) })), quiet);
  const pure = step(swing(() => true), 45, 110);
  for (let x = 50; x < 78; x++) { const s = step(swing(f => f >= x), 45, 110); assert.ok(s <= pure + 0.1, `on at f${x}: ${s.toFixed(1)} deg a frame, a pure acted swing ${pure.toFixed(1)}`); }
});

// digests of the playback on main a27faf07, before the flag: raw, baked, sparse and mixed tracks, default and kaiships dose
const BEFORE = ['592ed1d36ff4', '8b8c87714129', 'bc39593e1459', '9876eb7c7546', '3428b50f1af4', '97f836be42a8', '405609411631', 'df261db445b9'];
test('no acted key: the playback is what it was before the flag', () => {
  const sparse = [{ f: 0, pos: [1, 2], ...pose(0) }, { f: F0, ...pose(0) }, { f: F1, ...pose(1), hold: 20 }, { f: 70, ease: 'snap', ...pose(0.5) }, { f: 90, ...pose(0), antic: 0.2 }];
  const mixed = [...keys({}, 40), ...keys({ raw: false }).slice(41)];
  const sum = fr => createHash('sha1').update(JSON.stringify(fr.map(o => Object.keys(o).sort().map(c => [c, Math.round(o[c] * 1e6) / 1e6 + 0])))).digest('hex').slice(0, 12);
  assert.deepEqual([sparse, keys(), keys({ raw: false }), mixed].flatMap(ks => [sum(play(ks)), sum(play(ks, STYLE_PRESETS.kaiships))]), BEFORE);
});
