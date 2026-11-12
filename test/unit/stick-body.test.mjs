// The stick figure's body physics (styles/stick-man/engine/body.js): a hand never ends inside the head or the torso, bones
// keep their length, the elbow stays in its range.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ellipsoid, armPenetration, solveArm, limitArm, JOINTS } from '../../styles/stick-man/engine/body.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// two equal bones: elbow on the pole side, a target past reach is pulled in
function ik(root, end, l, pole) {
  const ax = end.clone().sub(root); let d = Math.min(ax.length(), 2 * l * 0.999); ax.normalize();
  const e = root.clone().addScaledVector(ax, d);
  const perp = pole.clone().addScaledVector(ax, -pole.dot(ax)).normalize();
  const h = Math.sqrt(Math.max(0, l * l - (d / 2) ** 2));
  return { joint: root.clone().addScaledVector(ax, d / 2).addScaledVector(perp, h), end: e, flex: 2 * Math.acos(Math.min(1, d / (2 * l))) * 180 / Math.PI };
}
const head = ellipsoid(V(0, 2.4, 0), new THREE.Quaternion(), [0.5, 0.47, 0.5], 'head');
const torso = ellipsoid(V(0, 1.7, 0), new THREE.Quaternion(), [0.29, 0.45, 0.24], 'torso');
const l = 0.5125, sh = V(0.23, 2.0, 0);

test('a hand reaching into the head stops on its surface', () => {
  const hand = V(0.2, 2.45, 0.1), r0 = ik(sh, hand, l, V(1, 0, 0));
  assert.ok(armPenetration(sh, r0.joint, r0.end, [head, torso]), 'the setup starts inside the head');
  const s = solveArm({ sh, elbow: r0.joint, hand: r0.end, pole: V(1, 0, 0), l, vols: [head, torso], ik, flex: r0.flex, limb: 0.023, handR: 0.05 });
  assert.equal(s.pen, 0);
  assert.ok(s.pen0 > 0);
  assert.ok(Math.abs(sh.distanceTo(s.elbow) - l) < 1e-6 && Math.abs(s.elbow.distanceTo(s.hand) - l) < 1e-6, 'bones keep their length');
  for (const p of [s.elbow, s.hand]) assert.ok(Number.isFinite(p.x + p.y + p.z));
});

test('an arm across the chest ends outside the torso', () => {
  const hand = V(-0.1, 1.75, 0.05), r0 = ik(sh, hand, l, V(0, 0, 1));
  const s = solveArm({ sh, elbow: r0.joint, hand: r0.end, pole: V(0, 0, 1), l, vols: [head, torso], ik, flex: r0.flex, limb: 0.023, handR: 0.05 });
  assert.equal(s.pen, 0);
});

test('the elbow never folds past its range', () => {
  const s = solveArm({ sh, elbow: V(0.6, 2.0, 0.2), hand: sh.clone().add(V(0.05, 0, 0.05)), pole: V(1, 0, 0), l, vols: [], ik, flex: 170, limb: 0.023, handR: 0.05 });
  assert.ok(s.flex <= JOINTS.elbow[1] + 0.5, `flex ${s.flex}`);
  assert.equal(s.limits, 1);
});

test('FK channels are held inside the joint ranges', () => {
  const { A, hits } = limitArm({ raise: 200, swing: 90, elbow: 170, roll: 30 });
  assert.deepEqual([A.raise, A.swing, A.elbow, A.roll, hits], [180, 60, 145, 30, 3]);
});

test('a hand sweeping into and across the torso moves smoothly (no pops) and never ends inside', () => {
  // the wanted arm slides 1 cm per step from the side, across the belly, to the far side; the solved hand and elbow may
  // move a little more than that, never jump (the old solver flipped the elbow behind the body between steps)
  let prev = null, worst = 0, deepest = 0;
  for (let i = 0; i <= 60; i++) {
    const w = ik(sh, V(0.45 - i * 0.01, 1.65, 0.12), l, V(1, 0, -0.3));
    const s = solveArm({ sh, elbow: w.joint, hand: w.end, pole: V(1, 0, -0.3), l, vols: [head, torso], ik, flex: w.flex, limb: 0.023, handR: 0.05, out: V(1, -0.3, 0.4) });
    deepest = Math.max(deepest, s.pen);
    if (prev) worst = Math.max(worst, s.hand.distanceTo(prev.hand), s.elbow.distanceTo(prev.elbow));
    prev = s;
  }
  assert.equal(deepest, 0);
  assert.ok(worst < 0.08, `largest step ${worst.toFixed(3)} W`);
});
