// The stick-man motion library (styles/stick-man/motion-lib) and the two rig rules it leans on: a hand on a target stays
// there or says how far it is off (rig K4), and a carried prop is a solid with mass (rig K5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { checkAll, NAME_RE, clipFiles } from '../../styles/stick-man/tools/motionlib.mjs';
import { ALL, getClip, placeClip, expandClips } from '../../styles/stick-man/motion-lib/index.js';
import { BODIES } from '../../styles/stick-man/motion-lib/bodies.js';
import { compileTrack, playActor, toPose, STYLE_PRESETS } from '../../styles/stick-man/engine/motion.js';
import { DOSE_E } from '../../styles/stick-man/motion-lib/base.js';
import { ellipsoid, solveArm, armPenetration, propPush, centreOfMass } from '../../styles/stick-man/engine/body.js';

test('the library has 32 clips on 5 bodies, and every one passes motionlib.mjs (naming, seam, base, joint gate, feet)', async () => {
  assert.equal(ALL.length, 32);
  assert.equal(clipFiles().length, 32);
  assert.deepEqual(Object.keys(BODIES), ['adult', 'heavy', 'thin', 'child', 'elder']);
  for (const b of Object.keys(BODIES)) for (const c of ['Idle_Breath_Loop', 'Move_Walk_Fwd_Loop', 'Move_Run_Fwd_Loop']) assert.equal(getClip(c, b).body, b);
  const bad = (await checkAll()).filter(r => r.fails.length);
  assert.deepEqual(bad.map(r => `${r.name || r.file}: ${r.fails.join('; ')}`), []);
});

test('the naming rule: <Body>_<Group>_<Action>_<Loop|Once>_v01.js', () => {
  for (const ok of ['Elder_Move_Walk_Fwd_Loop_v01.js', 'Act_LiftHeavy_Once_v01.js', 'Adult_Move_CarryHeavy_Run_Loop_v01.js']) assert.ok(NAME_RE.test(ok), ok);
  for (const bad of ['walk.js', 'Elder_Walk_Loop_v01.js', 'Act_LiftHeavy_v01.js', 'Act_liftHeavy_Once_v01.js', 'Act_LiftHeavy_Once.js']) assert.ok(!NAME_RE.test(bad), bad);
});

test('a walk with `to` starts where the actor stands, heads for the target and ends standing on it', () => {
  const r = placeClip({ f: 10, clip: 'Move_Walk_Fwd_Loop', body: 'elder', to: [2, -3] }, { pos: [2, 1], yaw: 90 });
  const first = r.keys[0], last = r.keys[r.keys.length - 1];
  assert.deepEqual(first.pos.slice(0, 2).map(v => +v.toFixed(6)), [2, 1]);
  assert.deepEqual(last.pos.slice(0, 2).map(v => +v.toFixed(6)), [2, -3]);
  assert.equal(last.yaw, 0);                                           // toward -y: yaw 0 faces the camera side
  assert.equal(first.f, 10);
  assert.ok(Math.abs(r.fit - 1) < 0.15, `strides stretched by ${r.fit}`);
});

test('a planted foot stays put in the world along a turned, stretched walk (and a shared clip keeps its feet too)', () => {
  for (const key of [{ f: 0, clip: 'Move_Walk_Fwd_Loop', body: 'adult', to: [-2.3, 1.7] }, { f: 0, clip: 'Move_Run_Fwd_Loop', body: 'child', to: [0, 3] },
    { f: 0, clip: 'Act_LiftHeavy_Once', body: 'child' }]) {
    const ks = expandClips([key], { pos: [0, 0], yaw: 30 }), fr = playActor(compileTrack(ks, {}, { pos: [0, 0], yaw: 30 }, 'kaiships'), 0, ks[ks.length - 1].f + 5);
    for (let f = 1; f < fr.length; f++) for (const s of ['L', 'R']) {
      const p = fr[f - 1], q = fr[f]; if (p[`leg${s}.footW.2`] > 0.005 || q[`leg${s}.footW.2`] > 0.005) continue;
      const d = Math.hypot(q[`leg${s}.footW.0`] - p[`leg${s}.footW.0`], q[`leg${s}.footW.1`] - p[`leg${s}.footW.1`]);
      assert.ok(d < 0.001, `${key.clip} ${key.body} frame ${f} foot ${s} slides ${(d * 1000).toFixed(2)} mm`);
    }
  }
});

test('a shared clip on a smaller body scales its metres with the body; a clip key passes its face to the first key', () => {
  const a = placeClip({ f: 0, clip: 'Trans_ClimbWindow_Once' }), c = placeClip({ f: 0, clip: 'Trans_ClimbWindow_Once', body: 'child', expr: 'worried' });
  assert.ok(Math.abs(Math.hypot(...c.pos) / Math.hypot(...a.pos) - BODIES.child.spec.scale) < 1e-4);   // yaw 0: the climb travels toward -y
  assert.equal(c.keys[0].expr, 'worried');
  assert.throws(() => getClip('Idle_Frozen_Loop', 'child'), /no child version/);
});

test('toPose: a planted foot keyed in metres lands in the figure frame of a scaled figure', () => {
  const m = { 'pos.0': 0, 'pos.1': 0, yaw: 90, 'legL.footW.0': 0.6, 'legL.footW.1': 0, 'legL.footW.2': 0 };
  assert.ok(Math.abs(toPose(m).legL.foot[2] - 1) < 1e-9);
  assert.ok(Math.abs(toPose(m, 0.5).legL.foot[2] - 2) < 1e-9);
});

// ------------------------------------------------------------------ rig K4: a hand on its target
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function ik(root, end, l, pole) {
  const ax = end.clone().sub(root); const d = Math.min(ax.length(), 2 * l * 0.999); ax.normalize();
  const e = root.clone().addScaledVector(ax, d), perp = pole.clone().addScaledVector(ax, -pole.dot(ax)).normalize(), h = Math.sqrt(Math.max(0, l * l - (d / 2) ** 2));
  return { joint: root.clone().addScaledVector(ax, d / 2).addScaledVector(perp, h), end: e, flex: 2 * Math.acos(Math.min(1, d / (2 * l))) * 180 / Math.PI };
}
const head = ellipsoid(V(0, 2.4, 0), new THREE.Quaternion(), [0.5, 0.47, 0.5], 'head');
const torso = ellipsoid(V(0, 1.7, 0), new THREE.Quaternion(), [0.29, 0.45, 0.24], 'torso');
const l = 0.5125, sh = V(0.23, 2.0, 0);

test('K4: a gripping hand (keep) stays on a reachable target; the elbow finds another way round the body', () => {
  const hand = V(-0.15, 1.75, 0.4), pole = V(0, -1, 0), r0 = ik(sh, hand, l, pole);
  assert.ok(armPenetration(sh, r0.joint, r0.end, [head, torso]), 'the wanted elbow goes through the chest');
  const free = solveArm({ sh, elbow: r0.joint, hand: r0.end, pole, l, vols: [head, torso], ik, flex: r0.flex, limb: 0.023, handR: 0.05 });
  const grip = solveArm({ sh, elbow: r0.joint, hand: r0.end, pole, l, vols: [head, torso], ik, flex: r0.flex, limb: 0.023, handR: 0.05, keep: true });
  assert.ok(free.gap > 0.1, `a free hand may step off (${free.gap})`);
  assert.ok(grip.gap < 1e-9, `gap ${grip.gap}`);
  assert.equal(grip.pen, 0);
  assert.ok(grip.hand.distanceTo(r0.end) < 1e-9);
});

test('K4: a target the hand cannot keep (inside the head) is reported as a gap, never hidden', () => {
  const hand = V(0.1, 2.35, 0.2), pole = V(1, 0, 0), r0 = ik(sh, hand, l, pole);
  const s = solveArm({ sh, elbow: r0.joint, hand: r0.end, pole, l, vols: [head, torso], ik, flex: r0.flex, limb: 0.023, handR: 0.05, keep: true });
  assert.equal(s.pen, 0);
  assert.ok(Math.abs(s.gap - s.hand.distanceTo(r0.end)) < 1e-9 && s.gap > 0.05, `gap ${s.gap}`);
});

// ------------------------------------------------------------------ rig K5: a carried prop is a solid with mass
test('K5: a bag through a thigh is pushed out of it; a clear bag is left alone', () => {
  const thigh = [[V(0.14, 1.38, 0), V(0.15, 0.70, 0.05)]], q = new THREE.Quaternion();
  const box = { c: V(0.20, 1.0, 0.1), q, h: [0.17, 0.22, 0.38] };
  const r = propPush(box, thigh, [torso], { limb: 0.023 });
  assert.ok(r && r.depth > 0.05, 'overlap found');
  const moved = { ...box, c: box.c.clone().add(r.push) };
  const r2 = propPush(moved, thigh, [torso], { limb: 0.023 });
  assert.ok(!r2 || r2.depth < r.depth / 2, `after the push ${r2?.depth}`);
  assert.equal(propPush({ c: V(0.9, 1.0, 0.1), q, h: [0.17, 0.22, 0.38] }, thigh, [torso]), null);
});

test('K5: a bag inside the trunk is pushed out along the surface normal; turning it crosswise changes what it hits', () => {
  const r = propPush({ c: V(0, 1.6, 0.3), q: new THREE.Quaternion(), h: [0.1, 0.1, 0.1] }, [], [torso]);
  assert.ok(r && r.push.z > 0, 'out through the front');
  const thigh = [[V(0.14, 1.38, 0), V(0.15, 0.70, 0.05)]], along = { c: V(0.45, 1.0, 0.12), h: [0.17, 0.22, 0.38] };
  assert.equal(propPush({ ...along, q: new THREE.Quaternion() }, thigh, []), null);
  assert.ok(propPush({ ...along, q: new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.PI / 2) }, thigh, []), 'crosswise it reaches the thigh');
});

test('K5: a carried load pulls the centre of mass toward it by its share of the mass', () => {
  const s = (sg) => ({ shoulder: V(sg * 0.23, 2, 0), elbow: V(sg * 0.3, 1.5, 0), hand: V(sg * 0.32, 1.0, 0), hip: V(sg * 0.14, 1.38, 0), knee: V(sg * 0.15, 0.7, 0), ankle: V(sg * 0.15, 0.02, 0), toe: V(sg * 0.15, 0.02, 0.12) });
  const K = { head: V(0, 2.43, 0), trunk: V(0, 1.7, 0), L: s(-1), R: s(1) };
  const c0 = centreOfMass(K), c1 = centreOfMass({ ...K, extra: [{ p: V(0.8, 1.0, 0), w: 25 / 70 }] });
  assert.ok(Math.abs(c0.x) < 1e-9);
  const want = (0.8 * 25 / 70) / (1 + 25 / 70);
  assert.ok(Math.abs(c1.x - want) < 0.02, `com x ${c1.x.toFixed(3)} vs ${want.toFixed(3)}`);
});

// ------------------------------------------------------------------ the same rules through the real rig (cast.js, headless)
import { rigClip, rigStick, GRIP_CM, PROP_CM } from '../../styles/stick-man/tools/motionlib.mjs';

test('rig: the bag clips keep both hands on the handle and the bag out of the body through cast.js, physics on', async () => {
  for (const name of ['Act_LiftHeavy_Once', 'Act_DropInTrunk_Once', 'Act_PushThroughWindow_Once', 'Move_CarryHeavy_Walk_Loop', 'Move_CarryHeavy_Run_Loop', 'Act_WearCap_Once', 'Trans_ClimbWindow_Once']) {
    const C = getClip(name), r = await rigClip(C);
    assert.ok(r.grip <= GRIP_CM, `${name}: a gripping hand ${r.grip} cm off its target at ${r.gripAt}`);
    assert.ok(r.prop <= PROP_CM, `${name}: a held prop ${r.prop} cm inside the body at ${r.propAt}`);
  }
});

test('rig: a bag hung crosswise against the thigh is measured, and with physics on the hand moves it out', async () => {
  const { S, PHYS } = await rigStick('adult'), was = PHYS.on;
  const Q = { armR: { raise: 12, swing: 0, elbow: 6 }, x_hpR_bag: 1, x_kgR: 25, x_yawR: 90 };   // crosswise: it reaches the thigh
  try {
    PHYS.on = false; S.pose2(Q); const off = S.rigWorld();
    PHYS.on = true; S.pose2(Q); const on = S.rigWorld();
    assert.ok(off.propPenCm > PROP_CM, `physics off: the bag is ${off.propPenCm} cm in the leg`);
    assert.ok(on.propPenCm0 > PROP_CM && on.propPenCm <= PROP_CM, `physics on: ${on.propPenCm0} cm before, ${on.propPenCm} after`);
    assert.ok(on.R.grip && on.R.targetGapCm > 0, 'the hand that moved the bag out says how far it went');
    assert.equal(on.carryKg, 25);
  } finally { PHYS.on = was; }
});

test('rig: a hand keyed inside the head is reported off its target (targetGapCm), and a free hand is not a grip', async () => {
  const { S } = await rigStick('adult');
  S.pose2({ armR: { ik: [0.05, 2.45, 0.1], ikw: 1 } });
  const w = S.rigWorld();
  assert.ok(w.R.grip && w.R.targetGapCm > GRIP_CM, `gap ${w.R.targetGapCm}`);
  assert.equal(w.L.grip, false);
});

test('rig: a 25 kg bag on the right pulls the centre of mass right; the cap on the head is a worn prop, not a load in a hand', async () => {
  const { S } = await rigStick('adult');
  S.pose2({ armR: { raise: 24, swing: 4, elbow: 8 } }); const c0 = S.com.x;
  S.pose2({ armR: { raise: 24, swing: 4, elbow: 8 }, x_hpR_bag: 1, x_kgR: 25 }); const c1 = S.com.x;
  assert.ok(c1 - c0 > 0.05, `com x ${c0.toFixed(3)} -> ${c1.toFixed(3)} (W)`);
  S.pose2({ x_hpH_cap: 1 }); const w = S.rigWorld();
  assert.ok(S.props.Hcap.visible && w.propPenCm === 0 && !w.R.grip);
});

test('gait: the hips are solved on the kaiships dose as motion.js plays it (DOSE_E = 0.4 + 1.2 x exaggeration)', () => {
  assert.equal(DOSE_E, +(0.4 + 1.2 * STYLE_PRESETS.kaiships.exaggeration).toFixed(6));
});
test('gait: the walks of all five bodies keep every solved knee and elbow under 27 deg a frame through the real rig', async () => {
  for (const b of Object.keys(BODIES)) {
    const g = await rigClip(getClip('Move_Walk_Fwd_Loop', b), b);
    assert.ok(g.joint <= 27, `${b} walk: ${g.joint} deg/f at ${g.jointAt}`);
  }
});
