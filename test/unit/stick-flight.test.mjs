// One camera flight (styles/stick-man/kit/camera/flight.js): through every waypoint on its frame without stopping or
// cutting, and the waypoints that keep a turning figure's face to the lens (H2 V2.1: "faces, not the back of the hood").
import test from 'node:test';
import assert from 'node:assert/strict';
import { flyCam, faceCam, faceAngle, pathOf } from '../../styles/stick-man/kit/camera/flight.js';
import { placeClip } from '../../styles/stick-man/motion-lib/index.js';

const WP = [{ f: 0, pos: [0, -4, 1.4], aim: [0, 0, 1.2], lens: 28 }, { f: 30, pos: [2, -3, 1.6], aim: [0, 0, 1.1], lens: 35 },
  { f: 60, pos: [3, 0, 1.5], aim: [0, 0, 1.0], lens: 24, roll: 4 }];
const dist = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));

test('flyCam: one entry a frame, through every waypoint on its frame, no cut inside the flight', () => {
  const D = flyCam(WP, 0, 60);
  assert.equal(D.length, 61); assert.deepEqual(D.map(d => d.at.f), [...Array(61).keys()]);
  for (const w of WP) { const c = D[w.f].cam; assert.ok(dist(c.pos, w.pos) < 1e-3 && dist(c.aim, w.aim) < 1e-3 && Math.abs(c.lens - w.lens) < 1e-2, JSON.stringify(c)); }
  assert.equal(D[60].cam.roll, 4); assert.equal(D[0].cam.roll, undefined, 'no roll key when there is none');
});

test('flyCam: the camera never stops at an inner waypoint (its speed carries through)', () => {
  const D = flyCam(WP, 0, 60), step = f => dist(D[f + 1].cam.pos, D[f].cam.pos);
  assert.ok(step(29) > 0.02 && step(30) > 0.02, `${step(29)} ${step(30)}`);
  assert.ok(step(30) / step(29) > 0.7 && step(30) / step(29) < 1.4, 'no jolt in speed at the waypoint');
});

test('flyCam: off and shake move both the camera and its aim; dof follows the frame', () => {
  const D = flyCam(WP, 0, 10, { off: f => [f, 0, 0], shake: () => [0, 0, 0.01], dof: f => ({ f }) });
  assert.ok(Math.abs(D[10].cam.pos[0] - flyCam(WP, 0, 10)[10].cam.pos[0] - 10) < 1e-3);
  assert.ok(Math.abs(D[10].cam.aim[2] - flyCam(WP, 0, 10)[10].cam.aim[2] - 0.01) < 1e-3);
  assert.deepEqual(D[7].dof, { f: 7 });
});

test('faceCam: a figure turning away keeps its face to the lens; a camera that stays put ends on the back of its head', () => {
  const at = f => [f / 60, 0, 0], yaw = f => 180 * Math.min(1, f / 60), F1 = 72;
  const D = flyCam(faceCam({ at, yaw, f0: 0, f1: F1, side: 25 }), 0, F1);
  const worst = Math.max(...D.map(d => faceAngle(at(d.at.f), yaw(d.at.f), d.cam.pos)));
  assert.ok(worst < 45, `the camera stays within 45 deg of the nose (worst ${worst.toFixed(1)})`);
  const still = D[0].cam.pos;
  assert.ok(faceAngle(at(F1), yaw(F1), still) > 135, 'the fixed camera sees the back of the head');
  for (const d of D) assert.ok(Math.abs(d.cam.pos[2] - 1.3) < 0.05, 'at eye height, never over the cap');
});

test('faceCam: a push in to the face (every number may be a function of the frame)', () => {
  const W = faceCam({ at: () => [0, 0, 0], yaw: () => 0, f0: 0, f1: 30, dist: f => 2 - f / 30, lens: f => 28 + f / 3, look: f => 1 + f / 100, eye: f => 1.2 + f / 100 });
  assert.equal(W.at(-1).aim[2], 1.3); assert.equal(W.at(-1).pos[2], 1.5);
  const d = w => Math.hypot(w.pos[0], w.pos[1]);
  assert.ok(Math.abs(d(W[0]) - 2) < 1e-9 && Math.abs(d(W.at(-1)) - 1) < 1e-9); assert.equal(W.at(-1).lens, 38);
});

test('pathOf: a placed library walk drives faceCam directly; the camera leads the walker and keeps the face', () => {
  const placed = placeClip({ f: 0, clip: 'Move_Walk_Fwd_Loop', body: 'adult', to: [3, 0] }, { pos: [0, 0], yaw: 90 }), F1 = placed.keys.at(-1).f;
  const path = pathOf(placed.keys);
  assert.ok(path.at(F1)[0] > 2.5 && Math.abs(path.yaw(F1 / 2) - 90) < 15, `${path.at(F1)} ${path.yaw(F1 / 2)}`);
  const D = flyCam(faceCam({ ...path, f0: 0, f1: F1 }), 0, F1);
  for (const d of D) assert.ok(faceAngle(path.at(d.at.f), path.yaw(d.at.f), d.cam.pos) < 45, `frame ${d.at.f}`);
  assert.deepEqual(pathOf([{ f: 10, yaw: 30 }, { f: 0, pos: [1, 2] }, { f: 20, pos: [3, 2, 0.5] }]).at(10), [2, 2, 0.25], 'keys in any order, z optional');
});
