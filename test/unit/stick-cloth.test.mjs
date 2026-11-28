// tier: heavy
// The costume cloth (styles/stick-man/kit/cast/cloth.js, the hoodie's cords): a pinned chain falls under gravity, stays
// outside a body volume it drapes over, keeps its length, and gives the same result from the same start.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Cloth, lerpRigid, bodyJump } from '../../styles/stick-man/kit/cast/cloth.js';
import { shakeOf, CORD_SHAKE_MAX } from '../../styles/stick-man/tools/gates/faults.mjs';

const N = 10, SEG = 0.04, C = new THREE.Vector3(0, -0.2, 0.05), R = 0.1;
// a sphere collider: a point inside (plus margin) goes to its surface
const ball = (p, m) => { const d = p.distanceTo(C); return d < R + m ? p.clone().sub(C).multiplyScalar((R + m) / Math.max(d, 1e-9)).add(C) : null; };
function chain() {
  const edges = [], bends = []; for (let i = 0; i < N - 1; i++) edges.push([i, i + 1, SEG]); for (let i = 0; i < N - 2; i++) bends.push([i, i + 2, 2 * SEG]);
  const pin = new Uint8Array(N); pin[0] = 1;
  const c = new Cloth(N, edges, bends, pin, { bend: 0.12, damp: 0.05, iters: 10, margin: 0.01 });
  for (let i = 0; i < N; i++) c.set(i, [0, 0, i * SEG]);   // starts horizontal, out from the pin
  return c;
}
function run(c, steps = 240) { for (let s = 0; s < steps; s++) c.sub(1 / 240, () => [0, 0, 0], [ball], []); return c; }

test('a pinned cord falls and drapes over a volume without going inside it', () => {
  const c = run(chain());
  assert.ok(c.x[3 * (N - 1) + 1] < -0.15, `the free end fell (y ${c.x[3 * (N - 1) + 1]})`);
  for (let i = 1; i < N; i++) assert.ok(new THREE.Vector3(c.x[3 * i], c.x[3 * i + 1], c.x[3 * i + 2]).distanceTo(C) >= R - 1e-3, `particle ${i} inside`);
  assert.equal(c.x[0] + c.x[1] + c.x[2], 0, 'the pin stays put');
});

test('the cord keeps its length (under 5 % stretch)', () => {
  assert.ok(run(chain()).stretch() < 0.05);
});

test('the same start gives the same result', () => {
  assert.deepEqual([...run(chain()).x], [...run(chain()).x]);
});

// A cord on a moving body (Hot Money ep01 r2 s4, Kai 17/11: "the hoodie cords jitter"): the hoodie steps its cords 8 times
// a frame with the anchor eased from last frame's pose to this one's. A collider held at this frame's pose for every
// sub-step is a whole frame ahead of the anchor on the first one; the push it gives the cord becomes speed (Verlet), and the
// tip flips between two shapes every frame. The colliders ride the same eased body frame as the anchor (cloth.js lerpRigid).

const CHEST = new THREE.Vector3(-0.07, -0.15, 0), CHEST_R = 0.1, SUB = 8, DT = 1 / (30 * SUB);
// the body frame at frame f: a walk at 1.0 m/s with a 3 cm bob, or a half turn in place over 15 frames (a stepped turn, 12 deg a frame)
const walk = f => new THREE.Matrix4().compose(new THREE.Vector3(f / 30, 0.03 * Math.sin(Math.PI * f / 15), 0), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
const turn = f => new THREE.Matrix4().compose(new THREE.Vector3(), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * Math.min(1, Math.max(0, (f - 10) / 15))), new THREE.Vector3(1, 1, 1));
// the chest, a sphere in the body frame, as a world collider for a body frame M
const chestAt = M => { const c = CHEST.clone().applyMatrix4(M); return (p, m) => { const d = p.distanceTo(c); return d < CHEST_R + m ? p.clone().sub(c).multiplyScalar((CHEST_R + m) / Math.max(d, 1e-9)).add(c) : null; }; };
// frames 0..n of a cord draped down the front of the chest (+x, the way the body walks) from a pin at the body origin; per frame its tip in the body frame
function cordOn(body, n, eased) {
  const edges = [], bends = []; for (let i = 0; i < N - 1; i++) edges.push([i, i + 1, 0.025]); for (let i = 0; i < N - 2; i++) bends.push([i, i + 2, 0.05]);
  const pin = new Uint8Array(N); pin[0] = 1;
  const c = new Cloth(N, edges, bends, pin, { bend: 0.12, damp: 0.05, iters: 10, margin: 0.006 });
  for (let i = 0; i < N; i++) c.set(i, [0.012 + 0.002 * i, -0.025 * i, 0]);
  for (let k = 0; k < 40 * SUB; k++) c.sub(DT, () => [0, 0, 0], [chestAt(body(0))], []);   // settle at rest
  const tips = [], M = new THREE.Matrix4();
  for (let f = 1; f <= n; f++) {
    const M0 = body(f - 1), M1 = body(f), end = chestAt(M1);
    for (let s = 1; s <= SUB; s++) {
      lerpRigid(M0, M1, s / SUB, M); const A = new THREE.Vector3().applyMatrix4(M).toArray();
      c.sub(DT, () => A, [eased ? chestAt(M) : end], []);
    }
    tips.push(new THREE.Vector3(c.x[3 * (N - 1)], c.x[3 * (N - 1) + 1], c.x[3 * (N - 1) + 2]).applyMatrix4(M1.clone().invert()));
  }
  return tips;
}
// the tip's shake against the body (tools/gates/faults.mjs, the shot report's cord number): the largest back-and-forth, m/frame^2
const shake = tips => Math.max(...shakeOf(tips.map(v => v.toArray())));

test('lerpRigid eases position, turn and scale between two body frames', () => {
  const A = new THREE.Matrix4().compose(new THREE.Vector3(0, 0, 0), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
  const B = new THREE.Matrix4().compose(new THREE.Vector3(2, 0, 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), new THREE.Vector3(3, 3, 3));
  const t = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); lerpRigid(A, B, 0.5, new THREE.Matrix4()).decompose(t, q, s);
  assert.ok(t.distanceTo(new THREE.Vector3(1, 0, 0)) < 1e-9 && Math.abs(s.x - 2) < 1e-9);
  assert.ok(Math.abs(2 * Math.acos(q.w) - Math.PI / 4) < 1e-9);
});

for (const [name, body] of [['a walk', walk], ['a turn', turn]]) {
  test(`a cord on ${name}: the chest eased with the anchor keeps the tip from shaking (under the report's limit)`, () => {
    const x = shake(cordOn(body, 60, true));
    assert.ok(x < CORD_SHAKE_MAX / 3, `shake ${x.toFixed(4)} m/frame^2`);
  });
}
test('a chest held at the end-of-frame pose shakes the cord on a walk (the fault this guards: the hoodie before the fix)', () => {
  const x = shake(cordOn(walk, 60, false));
  assert.ok(x > CORD_SHAKE_MAX, `shake ${x.toFixed(4)} m/frame^2`);
});
test('shakeOf: a swing is not a shake, a period-2 flip is, and a run break starts over', () => {
  const swing = Array.from({ length: 40 }, (_, i) => [0.05 * Math.sin(i / 3), 0, 0]), flip = swing.map((p, i) => [p[0] + (i % 2 ? 0.02 : 0), 0, 0]);
  assert.ok(Math.max(...shakeOf(swing)) < 0.002);
  assert.ok(Math.max(...shakeOf(flip)) > 0.03);
  const jump = Array.from({ length: 10 }, (_, i) => [i < 5 ? 0 : 1, 0, 0]);
  assert.ok(Math.max(...shakeOf(jump)) > 0.5); assert.equal(Math.max(...shakeOf(jump, jump.map((_, i) => i === 5))), 0);
});

// A cut that moves the wearer (Hot Money ep01 r2 s6, Kai 17/11: the cords still shake after the bank cuts): the wearer is
// 3.5 m away on the next frame, but the frames follow each other, so the hoodie eased the anchor and the chest across the
// jump in 8 sub-steps; the cord was flung sideways and shook for 15 frames (s6 f1634-1650, max 0.56 m/frame^2). A body jump
// (cloth.js bodyJump) re-seats the cords at rest on the new pose and settles them, as on a first frame.
const PRE = 40, REST = Array.from({ length: N }, (_, i) => [0.012 + 0.002 * i, -0.025 * i, 0]);
const at = (x, deg = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, 0, 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), deg * Math.PI / 180), new THREE.Vector3(1, 1, 1));
// held at the curb, then on the cut (frame 20) 3.5 m away and turned 30 deg: held there, or walking from there (a cut into motion)
const cutHeld = f => (f < 20 ? at(0) : at(3.5, 30));
const cutWalk = f => (f < 20 ? at(0) : walk(f - 20).premultiply(at(3.5, 30)));
// the hoodie's cord step (kit/cast/hoodie.js step) on a body frame per frame; reseat: what a body jump does. Returns the tip
// in the body frame per frame and the frames that re-seated
function cordStep(body, n, reseat) {
  const edges = [], bends = []; for (let i = 0; i < N - 1; i++) edges.push([i, i + 1, 0.025]); for (let i = 0; i < N - 2; i++) bends.push([i, i + 2, 0.05]);
  const pin = new Uint8Array(N); pin[0] = 1;
  const c = new Cloth(N, edges, bends, pin, { bend: 0.12, damp: 0.05, iters: 10, margin: 0.006 });
  const seat = M => { REST.forEach((p, i) => c.set(i, new THREE.Vector3(...p).applyMatrix4(M).toArray())); const A = new THREE.Vector3().applyMatrix4(M).toArray(); for (let k = 0; k < PRE * SUB; k++) c.sub(DT, () => A, [chestAt(M)], []); };
  seat(body(0));
  const tips = [], seated = [], M = new THREE.Matrix4(), q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  let dPrev = null, justSeated = false;
  for (let f = 1; f <= n; f++) {
    const M0 = body(f - 1), M1 = body(f), d = new THREE.Vector3().setFromMatrixPosition(M1).sub(new THREE.Vector3().setFromMatrixPosition(M0));
    M0.decompose(_p, q0, _s); M1.decompose(_p, q1, _s);
    if (reseat && bodyJump(d, dPrev, q0.angleTo(q1))) { seat(M1); seated.push(f); dPrev = null; justSeated = true; }
    else {
      if (justSeated) c.carry(d.clone().divideScalar(SUB).toArray());   // the frame after a re-seat: the cord moves off with the body
      justSeated = false;
      for (let s = 1; s <= SUB; s++) { lerpRigid(M0, M1, s / SUB, M); const A = new THREE.Vector3().applyMatrix4(M).toArray(); c.sub(DT, () => A, [chestAt(M)], []); }
      dPrev = d;
    }
    tips.push(new THREE.Vector3(c.x[3 * (N - 1)], c.x[3 * (N - 1) + 1], c.x[3 * (N - 1) + 2]).applyMatrix4(M1.clone().invert()));
  }
  return { tips, seated };
}
// the shake from frame `from` on, with no run break at the cut (the report's measure breaks it on a fresh frame; this one
// does not, so a cord flung by the cut cannot pass by being skipped)
const shakeFrom = (tips, from) => Math.max(...shakeOf(tips.map(v => v.toArray())).slice(from - 1));

for (const [name, body] of [['held there', cutHeld], ['walking from there', cutWalk]]) {
  test(`a cut that moves the wearer 3.5 m (${name}): the cord is re-seated on the cut and does not shake 2 frames after it`, () => {
    const { tips, seated } = cordStep(body, 60, true);
    assert.deepEqual(seated, [20], 'only the cut frame re-seats');
    const x = shakeFrom(tips, 20);
    assert.ok(x < CORD_SHAKE_MAX, `shake from the cut on ${x.toFixed(4)} m/frame^2`);
    const v = Math.max(...tips.slice(21, 60).map((p, i) => p.distanceTo(tips[20 + i])));
    assert.ok(v < (name === 'held there' ? 0.002 : 0.02), `tip speed against the body from 2 frames after the cut ${v.toFixed(4)} m/frame`);
  });
}
test('a cut that moves the wearer, eased across like a move (the fault this guards: the hoodie before the fix), shakes the cord', () => {
  const x = shakeFrom(cordStep(cutHeld, 60, false).tips, 20);
  assert.ok(x > CORD_SHAKE_MAX, `shake ${x.toFixed(4)} m/frame^2`);
});
// continuous motion is never a jump, so its cords run exactly as before: a walk, a 12 deg/frame turn, a car at a steady
// 20 m/s, a stepped run on twos that starts from a hold (0.2 / 0.4 m a frame, s5 f1213-1220), a deep bow
const car = f => at(0.67 * f);
const twos = f => at(f < 10 ? 0 : 0.2 * (f - 10) + 0.2 * (f % 2 ? 1 : 0));
// a hard stop: the car at 20 m/s stops dead on frame 20 (its travel changes by 0.67 m, the body stays put)
const stop = f => at(0.67 * Math.min(f, 20));
// a deep bow: the chest pitches from 60 to 120 deg over 20 frames (its heading alone flips 180 deg as it passes level)
const bow = f => new THREE.Matrix4().makeRotationX(Math.PI / 180 * (60 + 3 * Math.min(20, f)));
for (const [name, body] of [['a walk', walk], ['a turn', turn], ['a car at 20 m/s', car], ['a stepped run', twos], ['a hard stop', stop], ['a deep bow', bow]]) {
  test(`${name} is not a body jump: no frame re-seats the cord`, () => {
    assert.deepEqual(cordStep(body, 60, true).seated, []);
  });
}
test('bodyJump: a travel over 1 m in a frame, off last frame\'s by over 0.5 m (1.5 m with no history), or a turn over 90 deg is a jump; a change of travel alone is not', () => {
  const v = (x, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  assert.equal(bodyJump(v(3.5), v(0)), true);
  assert.equal(bodyJump(v(2.67), v(0.01)), true);    // s4 f816, the shortest of the four Hot Money cuts
  assert.equal(bodyJump(v(1.2), v(0)), true);
  assert.equal(bodyJump(v(3.5), null), true);
  assert.equal(bodyJump(v(1.2), null), false);
  assert.equal(bodyJump(v(0.97), v(0)), false);      // under a metre: eased across, as a move is
  assert.equal(bodyJump(v(0), v(0.67)), false);      // a hard stop
  assert.equal(bodyJump(v(0.67), v(0)), false);      // a launch
  assert.equal(bodyJump(v(0.43), v(0)), false);      // a stepped run on twos from a hold
  assert.equal(bodyJump(v(0.7), v(0.7)), false);
  assert.equal(bodyJump(v(1.3), v(1.2)), false);     // a fast car at a steady speed
  assert.equal(bodyJump(v(0), v(0), Math.PI), true);
  assert.equal(bodyJump(v(0), v(0), 12 * Math.PI / 180), false);
});

// the rule over real clips (tools/gates/cordjump.mjs runs it over the whole library: no clip-body run fires): the fastest
// library clips, played through the real rig in the real hoodie, never re-seat the cords
test('the sprint, jump and get-up clips in the real hoodie: no frame is a body jump', async () => {
  const { scanClip } = await import('../../styles/stick-man/tools/gates/cordjump.mjs'), { getClip } = await import('../../styles/stick-man/motion-lib/index.js');
  for (const name of ['Move_Sprint_Fwd_Loop', 'Act_Jump_Once', 'Trans_GetUp_Once']) {
    const r = await scanClip(getClip(name));
    assert.deepEqual(r.jumps, [], `${name}: frames ${r.jumps}`);
    assert.ok(r.maxD > 0.1, `${name} moves (max travel ${r.maxD.toFixed(3)} m/frame)`);
  }
});
