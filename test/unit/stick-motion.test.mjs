// Motion v2 (styles/stick-man/engine/motion.js): keys play back with the animation principles built in.
import test from 'node:test';
import assert from 'node:assert/strict';
import { compileTrack, keyed, playActor, toPose } from '../../styles/stick-man/engine/motion.js';

const poses = { rest: { armR: { raise: 10 } }, up: { armR: { raise: 90 } } };
const play = (keys, f0 = 0, f1 = 40, opt) => playActor(compileTrack(keys, poses, {}), f0, f1, opt).map(o => o['armR.raise']);

test('slow in and slow out: a move starts and ends slower than its middle', () => {
  const tr = compileTrack([{ f: 0, pose: 'rest' }, { f: 12, pose: 'up' }], poses, {});
  const v = Array.from({ length: 13 }, (_, f) => keyed(tr, f)['armR.raise']), sp = v.slice(1).map((x, i) => x - v[i]);
  assert.ok(sp[0] < sp[6] / 3 && sp[11] < sp[6] / 3, `edges ${sp[0].toFixed(1)}, ${sp[11].toFixed(1)} vs middle ${sp[6].toFixed(1)}`);
});

test('anticipation: the arm first moves against the coming move', () => {
  const v = play([{ f: 0, pose: 'rest' }, { f: 12, pose: 'up', antic: 0.3 }], 0, 12, { stiff: true });
  assert.ok(Math.min(...v) < 0, `lowest ${Math.min(...v).toFixed(1)} should dip well below the rest value 10`);
});

test('follow-through: after the keys stop the arm overshoots, then settles on the key', () => {
  const v = play([{ f: 0, pose: 'rest' }, { f: 8, pose: 'up' }], 0, 40);
  assert.ok(Math.max(...v) > 92, `peak ${Math.max(...v).toFixed(1)} should pass the key (90)`);
  assert.ok(Math.abs(v[40] - 90) < 1.5, `settles to ${v[40].toFixed(1)}`);
});

test('a hold keeps the pose between its key and the key after', () => {
  const tr = compileTrack([{ f: 0, pose: 'rest' }, { f: 10, pose: 'up', hold: 10 }, { f: 30, pose: 'rest' }], poses, {});
  assert.equal(keyed(tr, 15)['armR.raise'], 90);
  assert.equal(keyed(tr, 20)['armR.raise'], 90);
});

test('a channel a later key names is neutral before it, not the later value', () => {
  const tr = compileTrack([{ f: 0, pose: 'rest' }, { f: 10, neck: { turn: 55 } }], poses, {});
  assert.equal(keyed(tr, 0)['neck.turn'], 0);
});

test('a planted foot stays put in the world while the body moves', () => {
  const a = toPose({ 'pos.0': 1, 'pos.1': 0, yaw: 0, 'legL.footW.0': 1.2, 'legL.footW.1': 0, 'legL.footW.2': 0 });
  const b = toPose({ 'pos.0': 1.1, 'pos.1': 0, yaw: 0, 'legL.footW.0': 1.2, 'legL.footW.1': 0, 'legL.footW.2': 0 });
  assert.ok(Math.abs((a.legL.foot[0] - b.legL.foot[0]) * 0.6 - 0.1) < 1e-9, 'the foot moves back in the figure frame by exactly the root step');
});

test('a cut (snap key) starts the follow-through fresh: no arm still swinging from the shot before', () => {
  const keys = [{ f: 0, pose: 'rest' }, { f: 4, pose: 'up' }, { f: 10, pose: 'rest', ease: 'snap' }];
  const loose = play(keys, 0, 14), stiff = play(keys, 0, 14, { stiff: true });
  assert.equal(loose[10], stiff[10], `at the cut ${loose[10].toFixed(1)} should equal the key ${stiff[10].toFixed(1)}`);
});
