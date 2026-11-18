import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { track, framing, moveEnds, boundaries, cameraKeys, rhythm, labelAt, warp } from '../../styles/stick-man/tools/previs-core.mjs';
import { filmShots, filmWorld, autoWorld, stagesFor, zonesOf } from '../../styles/stick-man/tools/previs.mjs';

const BANK = JSON.parse(fs.readFileSync(new URL('../../.claude/skills/make-reel-stick-man/templates/previs-bank.json', import.meta.url), 'utf8'));
const near = (a, b, eps = 1e-6) => a.every((v, i) => Math.abs(v - b[i]) < eps);

test('keys hold outside, ease between, and two keys at one time cut', () => {
  const k = [[1, 0], [2, 10], [2, 50], [3, 60]];
  assert.deepEqual(track(k, 0), [0]);
  assert.deepEqual(track(k, 1.5), [5]);
  assert.ok(track(k, 1.999)[0] < 10.01, 'just before the cut: the old shot');
  assert.deepEqual(track(k, 2), [50], 'at the cut: the new shot');
  assert.deepEqual(track(k, 9), [60]);
});

const shots = [
  { id: 'A', scene: 'S1', size: 'MS', lens: 27, angle: 'eye', move: 'push', t0: 0, t1: 4, from: [0, 0], to: [0, 0] },
  { id: 'B', scene: 'S1', size: 'WS', lens: 27, angle: 'eye', move: 'arc', t0: 4, t1: 9, from: [2, 0], to: [2, 0] },
  { id: 'C', scene: 'S2', size: 'CU', lens: 50, angle: 'low', move: 'static', t0: 9, t1: 12, from: [40, 0], to: [40, 0] },
];

test('the camera path is reproduced from storyboard keys: each shot opens and closes on its own framing', () => {
  const kinds = boundaries(shots, 'none'), cam = cameraKeys(shots, kinds);
  for (const s of shots) {
    const [e0, e1] = moveEnds(s.move);
    assert.ok(near(track(cam, s.t0), framing(s, s.from, e0)), `${s.id} opens on its first framing`);
    assert.ok(near(track(cam, s.t1 - 1e-9), framing(s, s.to, e1), 1e-3), `${s.id} closes on its last framing`);
  }
  const [a, b] = moveEnds('push');
  assert.ok(framing(shots[0], [0, 0], a)[2] > framing(shots[0], [0, 0], b)[2], 'a push ends closer than it starts');
  assert.ok(framing({ size: 'WS', lens: 27 }, [0, 0])[2] > framing({ size: 'CU', lens: 27 }, [0, 0])[2], 'a wide stands further back than a close-up');
});

test('inside a scene the camera flies between shots; between scenes it cuts', () => {
  const kinds = boundaries(shots, 'scene');
  assert.deepEqual(kinds, ['flight', 'cut']);
  const cam = cameraKeys(shots, kinds), step = t => Math.hypot(...track(cam, t + 1 / 30).slice(0, 3).map((v, i) => v - track(cam, t)[i]));
  const flightMax = Math.max(...Array.from({ length: 60 }, (_, i) => step(3 + i / 30)));
  assert.ok(flightMax < 0.5, `no jump during the flight A→B (largest step ${flightMax.toFixed(2)} m)`);
  assert.ok(step(9 - 1 / 60) > 20, 'a hard cut from S1 to S2 jumps the camera to the next set');
  assert.deepEqual(boundaries([{ scene: 'S1' }, { scene: 'S1', join: 'cut' }], 'scene'), ['cut'], 'a shot can ask for its own cut');
});

test('the bank hand spec keeps the hand-made camera: the truck stops at each window, then the push ends on teller 3', () => {
  for (const [t, x] of [[0, 154.7], [1.7, 156.55], [3.5, 156.55], [5.1, 160.15], [6.2, 160.15], [7.8, 163.7], [8.8, 163.7]])
    assert.ok(Math.abs(track(BANK.camera, t)[0] - x) < 1e-9, `camera x at ${t} s`);
  const end = track(BANK.camera, 13.27);
  assert.equal(end[6], 42, 'push-in ends at 42°');
  assert.ok(Math.abs(end[0] - 163.6) < 1e-9 && end[2] === 1.45, 'push-in ends in front of teller 3');
  assert.deepEqual(BANK.stages.map(s => s.t), [0, 1.6, 3.4, 6, 8.8]);
  assert.equal(Math.round(BANK.dur * 30), 398);
});

test('the label bar names the stage in Vietnamese, the clock and the voice line', () => {
  const world = { ...BANK, clock: { name: 'r4', t0: 60.26 }, lines: [[0, 'L22'], [3.04, 'L23']] };
  assert.deepEqual(labelAt(world, 2), { title: '2 QUẦY 1', sub: '– FIRST BANK', kind: 'flight', sinceStage: 2 - 1.6,
    right1: 'tốc độ thời gian 100%', right2: '2.0 s  ·  r4 62.3 s  ·  L22' });
  assert.equal(labelAt(world, 9).title, '5 PUSH-IN');
  assert.equal(labelAt(world, 9).sub, '– đẩy vào mặt cô giao dịch');
  const auto = stagesFor([{ id: 'A010', size: 'MS', move: 'push' }, { id: 'A020', size: 'WS', move: 'arc' }, { id: 'B010', size: 'CU', move: 'static' }], ['flight', 'cut']);
  assert.deepEqual(auto.map(s => `${s.title} ${s.sub}`), ['A010 TRUNG CẢNH đẩy vào · mở', 'A020 TOÀN CẢNH vòng cung · bay tiếp', 'B010 CẬN đứng yên · CẮT']);
});

const sb = { fps: 30, last: 300, shots: [
  { id: 'A', scene: 'S1', f0: 0, size: 'MS', move: 'push', set: 'room 9 (motel)', cast: ['you'], lines: ['L1'] },
  { id: 'B', scene: 'S1', f0: 100, size: 'WS', move: 'follow', set: 'back lot', cast: ['you'], lines: ['L2'] },
  { id: 'C', scene: 'S2', f0: 200, size: 'MS', move: 'static', set: 'bank lobby', cast: ['you', 't1'], lines: ['L3'] }] };
const words = [{ line: 'L1', t0: 0 }, { line: 'L2', t0: 4.5 }, { line: 'L3', t0: 8 }];

test('shots move onto the recorded voice: each line starts its first shot', () => {
  assert.deepEqual(filmShots(sb, words, 12).map(s => [s.id, s.t0, s.t1]), [['A', 0, 4.5], ['B', 4.5, 8], ['C', 8, 12]]);
  assert.equal(warp([[0, 0], [100, 4.5], [200, 8]])(150), 6.25);
  assert.deepEqual(filmShots(sb, null).map(s => s.t0), [0, 3.333, 6.667], 'no voice: storyboard frames');
});

test('the film animatic: a hand spec replaces the shots it claims, with a cut on each side', () => {
  const spec = { ...BANK, shots: ['B'], dur: 3.5 };
  const w = filmWorld(sb, words, 12, [spec], { join: 'scene' });
  assert.deepEqual(w.cuts, [4.5, 8], 'cut into the spec and out of it');
  assert.equal(w.stages.find(s => s.t === 4.5).title, '1 TRUCK');
  assert.deepEqual(w.lines, [[0, 'L1'], [4.5, 'L2'], [8, 'L3']]);
  assert.deepEqual(filmWorld(sb, words, 12, [], { join: 'none' }).cuts, [4.5, 8]);
  assert.deepEqual(filmWorld(sb, words, 12, [], { join: 'all' }).cuts, []);
  const a = autoWorld(filmShots(sb, words, 12), { join: 'scene' });
  assert.ok(a.figures.some(f => f.tag === 't1'), 'the cast stands in its set');
  assert.ok(a.blocks.some(b => b.label?.text === 'BANK LOBBY'), 'each set is a labelled zone');
});

test('rhythm is counted like refbench: cuts per minute, median and longest take, most cuts in any 15 s', () => {
  assert.deepEqual(rhythm([6.78, 16.52, 30.6, 35.73, 55.3, 60.26, 73.47], 90.1),
    { cuts: 7, takes: [6.78, 9.74, 14.08, 5.13, 19.57, 4.96, 13.21, 16.63], cutsPerMin: 4.7, medianTake: 11.5, longestTake: 19.6, worst15: 2 });
  assert.deepEqual(rhythm([], 60), { cuts: 0, takes: [60], cutsPerMin: 0, medianTake: 60, longestTake: 60, worst15: 0 });
});

test('set names for one place share a zone; different places do not', () => {
  const z = zonesOf(['back lot (motel)', 'motel back lot, the car', 'service lane behind the motel', 'service lane, inside the getaway car', 'motel front lot', 'room 9 (motel)', 'room2']);
  assert.deepEqual([...new Set(z.values())], ['back lot', 'service lane behind the motel', 'motel front lot', 'room 9', 'room2']);
  assert.equal(z.get('service lane, inside the getaway car'), 'service lane behind the motel');
});

test('a car in the props drives with the lead in a moving shot, and the cruiser chases it', () => {
  const chase = [{ id: 'X', scene: 'S5', size: 'WS', move: 'follow', set: 'service lane', cast: ['you'], props: ['getaway car', 'police cruiser'], t0: 0, t1: 3 }];
  const a = autoWorld(chase), car = a.props.find(p => p.c === '#5b2b28'), cop = a.props.find(p => p.c === '#1f2a3c');
  assert.ok(car && cop, 'both cars are in the blockout');
  assert.equal(car.keys.at(-1)[1] - car.keys[0][1], 10, 'the car drives 10 m with you');
  assert.ok(cop.keys[0][1] < car.keys[0][1], 'the cruiser follows behind');
});

test('a flight to a set 40 m away takes longer than a flight inside one set', () => {
  const two = (x) => [
    { id: 'A', scene: 'S1', size: 'MS', lens: 27, move: 'static', t0: 0, t1: 8, from: [0, 0], to: [0, 0] },
    { id: 'B', scene: 'S1', size: 'MS', lens: 27, move: 'static', t0: 8, t1: 16, from: [x, 0], to: [x, 0] }];
  const span = x => { const k = cameraKeys(two(x), ['flight']); return k[2][0] - k[1][0]; };
  assert.equal(span(1), 1, 'a short hop flies for 1 s');
  assert.ok(span(40) > 3, `a flight across 40 m takes ${span(40).toFixed(1)} s`);
});
