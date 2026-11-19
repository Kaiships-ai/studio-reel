// A prop let go lands on what the set built, not only on what a hand list names (engine/solids.js, engine/propobj.js
// S.rest). Hot Money ep01 r5 ENDING-A (Kai 19/11 "xúc xích rơi xuyên bàn"): room 2's bed was in COLLIDE_ROOM2, the
// engine read COLLIDE (room 9's), and the hot dog let go over the bed fell through it to the floor (bottom -0.05 m).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { propPlan } from '../../styles/stick-man/engine/propobj.js';
import { solidBoxes, restBoxes, inBoxes } from '../../styles/stick-man/engine/solids.js';

// room 2's bed as the set builds it (films/hm-ep01-r2 setKit K.box: an axis-aligned BoxGeometry), Blender lo/hi
const B = (x, y, z) => new THREE.Vector3(x, z, -y);
function kbox(lo, hi, name) { const a = B(...lo), b = B(...hi), m = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(b.x - a.x), Math.abs(b.y - a.y), Math.abs(b.z - a.z)), new THREE.MeshBasicMaterial());
  m.position.copy(a).add(b).multiplyScalar(0.5); m.name = name; return m; }

test('solids: a box the set built is a solid and a rest surface though no list names it; a hollow one and an ink hull are not', () => {
  const scene = new THREE.Scene(), bed = kbox([0.3, -0.8, 0], [2.45, 0.8, 0.55], 'bed'), crate = kbox([3, 0, 0], [3.5, 0.5, 0.5], 'crate'), hull = kbox([0.3, -0.8, 0], [2.45, 0.8, 0.56], 'hull');
  crate.userData.hollow = true; hull.material.side = THREE.BackSide; scene.add(bed, crate, hull); scene.updateMatrixWorld(true);
  const S = solidBoxes(scene), R = restBoxes(S, [{ name: 'dresser', lo: [-2, 1, 0], hi: [-1, 1.5, 0.8] }]);
  assert.deepEqual(S.map(b => b.name.split(' at ')[0]), ['bed']);
  const top = R.find(b => b.name.startsWith('bed')); assert.ok(top && Math.abs(top.hi[2] - 0.55) < 1e-6 && Math.abs(top.lo[1] + 0.8) < 1e-6, JSON.stringify(R));
  assert.ok(R.some(b => b.name === 'dresser'), 'COLLIDE stays');
  const act = new THREE.Group(); act.visible = false; act.add(kbox([0, 0, 0], [1, 1, 0.7], 'table')); scene.add(act); scene.updateMatrixWorld(true);
  assert.ok(solidBoxes(act).length === 1 && restBoxes(solidBoxes(act)).length === 1, 'an act is built hidden (engine/play.js): its boxes are solids and rest surfaces all the same');
  const hit = inBoxes([B(1, 0, 0.45), B(1, 0, 0.6)], S); assert.equal(hit.length, 1); assert.ok(Math.abs(hit[0].depth - 0.1) < 1e-6, `${hit[0].depth}`);
});

// a hand that holds a 10 cm can at 1.0 m over the bed for 10 frames and lets go (propobj.js: S.pose2 places the prop in the
// hand, x_hpL_can is its hand weight)
function landing(S0, z = 1.0) {
  const o = new THREE.Object3D(); o.userData.box = new THREE.Box3(new THREE.Vector3(-0.05, -0.05, -0.05), new THREE.Vector3(0.05, 0.05, 0.05));
  const S = { ...S0, props: { Lcan: o }, pose2() { o.position.copy(B(1, 0, z)); o.updateMatrixWorld(true); } };
  const plan = propPlan({ props: [{ id: 'Lcan', key: 'x_hpL_can', f0: 0, f1: 60 }] }, f => ({ x_hpL_can: f < 10 ? 1 : 0 }), S);
  const [x, y, zz] = plan.at(60).Lcan.p; return { x, y: -zz, bottom: y - 0.05 };
}
const dropOver = S0 => landing(S0).bottom;

test('rest: a prop let go over a set piece only the geometry of the set has lands on its top; with no solids it falls to the floor', () => {
  const scene = new THREE.Scene(); scene.add(kbox([0.3, -0.8, 0], [2.45, 0.8, 0.55], 'bed')); scene.updateMatrixWorld(true);
  const floor = dropOver({ obstacles: [] }), bed = dropOver({ obstacles: [], rest: restBoxes(solidBoxes(scene)) });
  assert.ok(Math.abs(floor) < 0.005, `no solids: on the floor (bottom ${floor.toFixed(3)} m)`);
  assert.ok(Math.abs(bed - 0.55) < 0.005, `the bed only the geometry has: bottom ${bed.toFixed(3)} m, its top 0.55 m (Hot Money r5 v3: -0.05)`);
});

test('rest: a ceiling slab over the room neither stops nor shoves a prop let go just under it; the can falls straight to the floor', () => {
  const scene = new THREE.Scene(); scene.add(kbox([-3, -3, 2.4], [5, 3, 2.6], 'ceiling')); scene.updateMatrixWorld(true);
  const R = restBoxes(solidBoxes(scene)), can = landing({ obstacles: [], rest: R }, 2.0);
  assert.ok(Math.abs(can.bottom) < 0.005 && Math.hypot(can.x - 1, can.y) < 0.005, `let go at 2.0 m under a ceiling at 2.4 m: lands at (${can.x.toFixed(2)}, ${can.y.toFixed(2)}), bottom ${can.bottom.toFixed(3)} m; want (1, 0), 0`);
});
