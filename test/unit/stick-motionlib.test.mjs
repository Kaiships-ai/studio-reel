// The stick-man motion library (styles/stick-man/motion-lib) and the two rig rules it leans on: a hand on a target stays
// there or says how far it is off (rig K4), and a carried prop is a solid with mass (rig K5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import fs from 'node:fs';
import { checkAll, checkClip, NAME_RE, clipFiles, catalogue, CATALOGUE, OBJECT_ACT } from '../../styles/stick-man/tools/gates/motionlib.mjs';
import { ALL, getClip, placeClip, expandClips } from '../../styles/stick-man/motion-lib/index.js';
import { BODIES } from '../../styles/stick-man/motion-lib/bodies.js';
import { compileTrack, playActor, toPose, STYLE_PRESETS } from '../../styles/stick-man/engine/motion.js';
import { DOSE_E, markColliders } from '../../styles/stick-man/motion-lib/base.js';
import { ellipsoid, solveArm, armPenetration, propPush, centreOfMass } from '../../styles/stick-man/engine/body.js';

test('the library has 87 clips on 5 bodies, and every one passes motionlib.mjs (naming, seam, base, joint gate, feet)', async () => {
  assert.equal(ALL.length, 87);
  assert.equal(clipFiles().length, 87);
  assert.deepEqual(Object.keys(BODIES), ['adult', 'heavy', 'thin', 'child', 'elder']);
  // every body stands, walks and runs (the adult's standing idle is the captured Idle_Stand_Loop)
  for (const b of Object.keys(BODIES)) for (const c of [b === 'adult' ? 'Idle_Stand_Loop' : 'Idle_Breath_Loop', 'Move_Walk_Fwd_Loop', 'Move_Run_Fwd_Loop']) assert.equal(getClip(c, b).body, b);
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
    { f: 0, clip: 'Gest_LookUp_Once', body: 'child' }]) {
    const ks = expandClips([key], { pos: [0, 0], yaw: 30 }), fr = playActor(compileTrack(ks, {}, { pos: [0, 0], yaw: 30 }, 'kaiships'), 0, ks[ks.length - 1].f + 5);
    for (let f = 1; f < fr.length; f++) for (const s of ['L', 'R']) {
      const p = fr[f - 1], q = fr[f]; if (p[`leg${s}.footW.2`] > 0.005 || q[`leg${s}.footW.2`] > 0.005) continue;
      const d = Math.hypot(q[`leg${s}.footW.0`] - p[`leg${s}.footW.0`], q[`leg${s}.footW.1`] - p[`leg${s}.footW.1`]);
      assert.ok(d < 0.001, `${key.clip} ${key.body} frame ${f} foot ${s} slides ${(d * 1000).toFixed(2)} mm`);
    }
  }
});

test('a shared clip on a smaller body scales its metres with the body; a clip key passes its face to the first key', () => {
  const a = placeClip({ f: 0, clip: 'Gest_LookUp_Once' }, { pos: [0, 0], yaw: 90 }), c = placeClip({ f: 0, clip: 'Gest_LookUp_Once', body: 'child', expr: 'worried' }, { pos: [0, 0], yaw: 90 });
  assert.ok(Math.abs(c.keys[0].legR.footW[1] / a.keys[0].legR.footW[1] - BODIES.child.spec.scale) < 1e-4);   // the feet's spacing scales
  assert.equal(c.keys[0].expr, 'worried');
  assert.throws(() => getClip('Idle_Stand_Loop', 'child'), /no child version/);
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
import { rigClip, rigStick, GRIP_CM, PROP_CM, physicsFails, BAL_CM, propExcess, PROP_SLIP_CM } from '../../styles/stick-man/tools/gates/motionlib.mjs';
import { holdKeys } from '../../styles/stick-man/motion-lib/base.js';

// props as scene objects (engine/propobj.js) and the balance solve (Hot Money ep01: the bag jumped 20 cm as it was set
// down, 11 cm as it was picked up, the dropped bag vanished a frame, the pushing body leapt 77 cm when a foot lifted)
test('props: the clips that take, set down, push or drop a load keep it in the scene, moving no more than the hand or gravity lets it, the pelvis and the load continuous, physics on and off', async () => {
  for (const name of ['Move_PushHeavy_Loop', 'Act_PutDown_Once', 'Move_CarryBag_Walk_Loop', 'Act_PickUp_Once', 'Act_DropInTrunk_Once', 'Act_HandOver_Once']) {
    const C = getClip(name), on = await rigClip(C), off = await rigClip(C, undefined, { phys: false });
    assert.deepEqual([...physicsFails(on), ...physicsFails(off, 'physics off')], [], name);
    assert.ok(on.bal <= BAL_CM && on.gone.length === 0, name);
  }
});

test('props: a prop let go falls on gravity and lands on what is under it, the same whichever order the frames are asked in', async () => {
  const { S, toPose } = await rigStick('adult'), { propPlan } = await import('../../styles/stick-man/engine/propobj.js');
  const C = getClip('Act_DropInTrunk_Once'), keys = placeClip({ f: 0, clip: C.clip }, { pos: [0, 0], yaw: 90 }).keys;
  S.obstacles = markColliders(C.needs.marks);
  const track = compileTrack(keys, {}, { pos: [0, 0], yaw: 90 }, 'kaiships'), fr = playActor(track, 0, 90), Qat = f => toPose(fr[Math.min(fr.length - 1, f)]);
  assert.deepEqual(track.props.map(p => [p.id, p.toss.map(v => +v.toFixed(2))]), [['Rbag', [1.2, 0, 0]]], 'the clip names its toss, turned with the heading');
  const A = propPlan(track, Qat, S), B = propPlan(track, Qat, S), late = A.at(70), early = B.at(5);
  assert.deepEqual(B.at(70), late, 'stateless: a plan asked for frame 5 first gives frame 70 the same rest');
  assert.ok(!early?.Rbag, 'in the hand at the start');
  const [x, y] = late.Rbag.p, floor = C.needs.marks[0].floor;   // three.js world: y up
  assert.ok(x > 0.53 && Math.abs(y - floor) < 0.03 && late.Rbag.v === 0, `lands on the trunk floor past the lip: ${late.Rbag.p}`);
  let prev = null;
  for (let f = 34; f < 60; f++) { const r = A.at(f).Rbag; if (!r) continue; if (prev) assert.ok(r.p[1] <= prev[1] + 1e-9, `falls, never rises (frame ${f})`); prev = r.p; }
});

test('props: a prop that teleports fails the slip gate, also when it comes back after frames out of the scene', () => {
  const held = { f: 184, at: [0.58, 0.17, 0.30], hand: [0.58, 0.17, 0.30], w: 1, v: 0 };
  // in the hand, moving with it: no excess
  assert.ok(propExcess(held, { f: 185, at: [0.60, 0.17, 0.29], hand: [0.60, 0.17, 0.29], w: 1, v: 0 }) <= PROP_SLIP_CM);
  // main's set-down: the hand prop hidden at 186, the floor mark 20 cm off where it was let go (seen again from 186)
  assert.ok(propExcess(held, { f: 186, at: [0.58, 0.36, 0.31], hand: [0.57, 0.23, 0.27], w: 0, v: 0 }) > PROP_SLIP_CM);
  // a resting prop that jumps 5 cm in a frame
  const rest = { f: 10, at: [1, 0, 0], hand: [0, 0, 1], w: 0, v: 0 };
  assert.ok(propExcess(rest, { f: 11, at: [1.05, 0, 0], hand: [0, 0.1, 1], w: 0, v: 0 }) > PROP_SLIP_CM);
  // falling: gravity gives it room
  assert.ok(propExcess({ ...rest, v: 2 }, { f: 11, at: [1, 0, -0.07], hand: [0, 0, 1], w: 0, v: 2.3 }) <= PROP_SLIP_CM);
  assert.match(physicsFails({ slip: 18.4, slipAt: '186 Rbag', gone: [], bal: 0, massStep: 0 }).join(), /prop: moves 18.4 cm more than its hand and gravity allow at 186 Rbag/);
});

test('props: a load enters the hand over a ramp (holdKeys), the floor carries a pushed crate, and a hard switch fails the gates', async () => {
  const k = holdKeys([0, 1, 2, 3, 4, 5, 6].map(f => ({ f })), 'R', 'bag', { from: 3, kg: 25 });
  assert.deepEqual(k.map(x => x.x_hpR_bag), [0, 0, 0.25, 0.5, 0.75, 1, 1]);
  assert.ok(k.every(x => x.x_kgR === 25), 'the load is kg times the attach weight: x_kg stays');
  const { S } = await rigStick('adult');
  S.pose2({ armL: { ik: [-0.2, 1.2, 0.6], ikw: 1 }, armR: { ik: [0.2, 1.2, 0.6], ikw: 1 }, x_hpB_crate: 1 });
  assert.equal(S.carryKg, 0, 'a crate on the floor is no weight on the body');
  S.pose2({ armR: { raise: 24, swing: 4, elbow: 8 }, x_hpR_bag: 0.5, x_kgR: 25, propRest: { Rbag: { p: [0.3, 0, 0], q: [0, 0, 0, 1], v: 0 } } });
  assert.ok(Math.abs(S.carryKg - 12.5) < 1e-9 && S.props.Rbag.visible, `half held: ${S.carryKg} kg, still in the scene`);
  // the clip as it was: the bag switched out of the hand in one frame
  const C = getClip('Act_PutDown_Once'), keep = C.keys; C.keys = keep.map(x => ({ ...x, x_hpR_bag: x.f <= 185 ? 1 : 0 }));
  try { assert.match(physicsFails(await rigClip(C)).join('; '), /load: the carried mass steps 100 %/); } finally { C.keys = keep; }
});

test('rig: the bag clips keep both hands on the handle and the bag out of the body through cast.js, physics on', async () => {
  for (const name of ['Act_DropInTrunk_Once', 'Move_CarryBag_Walk_Loop', 'Idle_CarryBag_Loop', 'Act_PutDown_Once', 'Act_Phone_Once']) {
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

test('rig: a hand that reaches into the set stops on it (a sill: on its top), with physics on', async () => {
  const { S, PHYS } = await rigStick('adult'), was = PHYS.on;
  // the right arm straight ahead at hip height, into a sill 0.3 m ahead whose top is 5 cm over the free hand
  const Q = { pos: [0, 0, 0], yaw: 90, armR: { raise: 10, swing: 80, elbow: 5 } };
  try {
    PHYS.on = true; S.obstacles = []; S.pose2(Q); const free = S.rigWorld().R.hand;
    const sill = { name: 'wall-low', lo: [free[0] - 0.1, -1, 0], hi: [free[0] + 0.05, 1, free[2] + 0.05], ledge: 0.35 };
    S.obstacles = [sill]; S.pose2(Q); const on = S.rigWorld().R.hand;
    assert.ok(on[2] >= sill.hi[2] + 0.02, `the hand rests on the sill's top: ${on[2].toFixed(3)} vs ${sill.hi[2].toFixed(3)}`);
    // a wall the hand has just reached into (its near face 3 cm behind the free hand): the hand stops on that face
    const wall = { name: 'wall', lo: [free[0] - 0.03, -1, 0], hi: [free[0] + 0.3, 1, 2.4] };
    S.obstacles = [wall]; S.pose2(Q); const off = S.rigWorld().R.hand;
    const inside = p => [0, 1, 2].every(i => p[i] > wall.lo[i] + 0.01 && p[i] < wall.hi[i] - 0.01);
    assert.ok(inside(free) && !inside(off), `a wall (not a ledge) puts the hand outside it: ${off.map(v => v.toFixed(3))} (wall from x ${wall.lo[0].toFixed(3)})`);
  } finally { PHYS.on = was; S.obstacles = []; }
});

test('docs/MOTION-LIB.md is the catalogue the clips make (motionlib.mjs --catalogue), every clip in it', () => {
  assert.equal(fs.readFileSync(CATALOGUE, 'utf8'), catalogue(), 'run: node styles/stick-man/tools/gates/motionlib.mjs --catalogue');
  for (const C of ALL) assert.ok(catalogue().includes(`| \`${C.clip}\` | ${C.body || 'any'}`), C.name);
});

test('props: a clip that acts on a thing holds a declared prop; holding an undeclared one, or none, fails the check', () => {
  for (const C of ALL.filter(c => OBJECT_ACT.test(c.clip))) assert.ok(C.needs.props.length, `${C.name} declares its prop`);
  const C = getClip('Idle_CarryBag_Loop'), file = 'body/adult/Adult_Idle_CarryBag_Loop_v01.js';
  const undeclared = checkClip({ ...C, needs: { ...C.needs, props: [] } }, file).fails.join('; ');
  assert.match(undeclared, /the keys hold hugbag but needs\.props does not name it/);
  assert.match(undeclared, /acts on a thing but declares no prop/);
  const unheld = checkClip({ ...C, keys: C.keys.map(k => ({ ...k, x_hpB_hugbag: 0 })) }, file).fails.join('; ');
  assert.match(unheld, /names hugbag but no key holds it/);
});

test('a loop in place plays `times` captures between one blend in and one out; a clip starts at its own origin, so chained clips never jump', () => {
  const C = getClip('Gest_PhoneCall_Loop'), [a, b] = C.captured, k = placeClip({ f: 0, clip: 'Gest_PhoneCall_Loop', times: 3 }, { pos: [2, 1], yaw: 90 }).keys;
  assert.equal(k[k.length - 1].f, C.frames + 2 * (b - a));
  // the phone stays at the ear through the repeats (the arm's ik weight never drops between the first capture and the last)
  const mid = k.filter(x => x.f > a + 20 && x.f < a + 2 * (b - a));
  assert.ok(mid.every(x => x.armR.ikw > 0.99), 'the hand stays on the ear across the seams');
  const W = getClip('Gest_Wave_Loop'); assert.equal(placeClip({ f: 0, clip: 'Gest_Wave_Loop', times: 1 }).keys.at(-1).f, W.frames);
  for (const c of ALL) { const k0 = c.advance ? c.intro[0] : c.keys[0]; assert.ok(Math.abs(k0.pos?.[1] || 0) < 1e-9 && (c.advance || Math.abs(k0.pos?.[0] || 0) < 1e-9), c.name); }
  const chain = expandClips([{ f: 0, clip: 'Idle_Stand_Loop' }, { f: 400, clip: 'Idle_Sleep_Loop' }], { pos: [1, 2], yaw: 90 });
  const track = playActor(compileTrack(chain, {}, { pos: [1, 2], yaw: 90 }, 'kaiships'), 0, 700);
  let worst = 0; for (let f = 1; f < track.length; f++) worst = Math.max(worst, Math.hypot(track[f]['pos.0'] - track[f - 1]['pos.0'], track[f]['pos.1'] - track[f - 1]['pos.1']));
  assert.ok(worst < 0.04, `the root moves ${worst.toFixed(3)} m in a frame across Idle_Stand into Idle_Sleep`);
});

test('the set pieces a clip names are solid in the headless check as in the render: a trunk lip, a counter, a window', () => {
  const names = markColliders([{ kind: 'trunk', at: [0.45, 0, 0.68] }, { kind: 'counter', at: [0.6, 0, 0.94] }, { kind: 'window', at: [1, 0, 0.8], top: 2, width: 1 }]).map(b => b.name);
  assert.deepEqual(names, ['trunk-lip', 'trunk-floor', 'counter', 'wall-low', 'wall-top', 'wall-right', 'wall-left']);
});

test('fit: a clip key fits a clip to the film set (a trunk lip, a window), and the fitted clip is checked as its own', () => {
  const T = placeClip({ f: 0, clip: 'Act_DropInTrunk_Once', fit: { lip: 0.85 } }).clip;
  assert.equal(T.needs.marks.find(m => m.kind === 'trunk').at[2], 0.85);
  const J = placeClip({ f: 0, clip: 'Trans_JumpWindow_Once', fit: { sill: 0.8, top: 1.9, width: 1.0 } }).clip, w = J.needs.marks.find(m => m.kind === 'window');
  assert.deepEqual([w.at[2], w.top, w.width], [0.8, 1.9, 1.0]);
  assert.throws(() => placeClip({ f: 0, clip: 'Act_DropInTrunk_Once', fit: { lip: 1.2 } }), /outside 0.60..0.90/);
  assert.throws(() => placeClip({ f: 0, clip: 'Gest_Wave_Loop', fit: { lip: 0.8 } }), /takes no fit/);
  for (const C of ALL.filter(c => c.fitChecks)) assert.ok(C.fitChecks.length, C.name);
});

test('support: a clip played on a surface (a clip key pos [x, y, h]) rests on it, never a flight; the next clip carries it', () => {
  const keys = expandClips([{ f: 0, clip: 'Idle_Sleep_Loop', pos: [1, 2, 0.55] }, { f: 300, clip: 'Idle_Sleep_Loop' }], { pos: [0, 0], yaw: 90 });
  const track = compileTrack(keys, {}, { pos: [0, 0], yaw: 90 }, 'kaiships');
  assert.equal(track.flights.length, 0);
  const fr = playActor(track, 0, 560);
  assert.ok(fr.every(m => Math.abs(m['pos.2'] - 0.55) < 1e-6), 'the sleeper stays on the bed');
});

// ------------------------------------------------------------------ the solved-joint gate: the film's own measure
import { jointExcess, jointFails, JOINT_KNOWN } from '../../styles/stick-man/tools/gates/motionlib.mjs';
import { jointSteps, JOINT_STEP_MAX } from '../../styles/stick-man/tools/gates/jointstep.mjs';

test('joint gate: the library judges joints with the film report\'s measure, one copy of it', () => {
  // Hot Money ep01: the film report read foot pitch 36.6 deg/f (SH060, SH130) and elbow 35.1 (SH172) on clips the gate
  // passed: the gate had its own, shorter list of joints and let a joint turn as fast as its capture did
  for (const f of ['faults.mjs', 'motionlib.mjs']) {
    const src = fs.readFileSync(new URL(`../../styles/stick-man/tools/gates/${f}`, import.meta.url), 'utf8');
    assert.match(src, /from '\.\/jointstep\.mjs'/, `${f} uses tools/gates/jointstep.mjs`);
    assert.doesNotMatch(src, /\[\['shoulder', 'elbow'\], \['elbow', 'hand'\]/, `${f} keeps no joint list of its own`);
  }
  const m = { torsoLean: 0, torsoRoll: 0, L: {}, R: {} }, l = { torsoLean: 0, torsoRoll: 30, L: {}, R: {} };
  for (const P of [m, l]) for (const s of ['L', 'R']) Object.assign(P[s], { kneeFlex: 0, elbowFlex: 0, footPitch: 0, shoulder: [0, 0, 1.4], elbow: [0, 0, 1.1], hand: [0, 0, 0.8], hip: [0, 0, 0.9], knee: [0, 0, 0.5], ankle: [0, 0, 0.1] });
  l.L.footPitch = 36.6;
  const st = Object.fromEntries(jointSteps(m, l));
  assert.equal(st.footPitchL, 36.6); assert.equal(st.torsoRoll, 30); assert.equal(st.kneeFlexR, 0);
});

test('joint gate: every clip the gate passes turns no joint over 25 deg a frame on the film\'s measure, physics on and off', async () => {
  const film = g => { let w = 0; for (let f = 1; f < g.limbs.length; f++) for (const [, d] of jointSteps(g.limbs[f - 1], g.limbs[f])) w = Math.max(w, d); return w; };
  const over = [];
  for (const C of ALL) {
    if (JOINT_KNOWN[C.name]) continue;
    for (const phys of [true, false]) { const g = await rigClip(C, undefined, { phys });
      assert.ok(g.limbs.every(l => Number.isFinite(l.L.footPitch) && Number.isFinite(l.torsoLean)), `${C.name}: the rig gives the gate foot pitch and torso`);
      const w = film(g); if (w > JOINT_STEP_MAX) over.push(`${C.name} physics ${phys ? 'on' : 'off'}: ${w.toFixed(1)}`); }
  }
  assert.deepEqual(over, []);
});

test('joint gate: a carried bag lifts its peeled heel off at a heel\'s speed, and a foot pop fails the gate', async () => {
  // Move_CarryBag_Walk_Loop frame 231: the heel peeled to -37.8 deg on its print, the swing foot began at the capture's
  // pitch (2.1): 39.9 deg/f (the film: SH060 frame 198, SH130 frame 145, 36.6)
  const C = getClip('Move_CarryBag_Walk_Loop'), g = await rigClip(C), g0 = await rigClip(C, undefined, { phys: false });
  assert.deepEqual([...jointFails(g), ...jointFails(g0, 'physics off')], []);
  // the same clip with one captured foot pulled 15 cm toward the hips for one frame: the gate sees it
  const keep = C.keys, i = keep.findIndex(k => k.f > 20 && k.legL.footW[2] > 0.05);
  C.keys = keep.map((k, j) => (j === i ? { ...k, legL: { ...k.legL, footW: [k.legL.footW[0], k.legL.footW[1], k.legL.footW[2] + 0.15] } } : k));
  try { const b = await rigClip(C, undefined, { phys: false }); assert.match(jointFails(b).join(), /solved joint: .* over 25/); } finally { C.keys = keep; }
});

test('joint gate: a phone call at a counter beside the arm fails it, one half a metre off adds nothing', async () => {
  // ep01 SH245: the phone call at a 1.12 m counter right beside the arm (the render: hand 18.65 cm off, elbow 97 deg/f)
  const C = getClip('Gest_PhoneCall_Loop'), counter = { name: 'counter', lo: [-0.5, 0.22, 0], hi: [0.5, 0.77, 1.12] };
  const on = await rigClip(C, undefined, { obstacles: [counter] }), off = await rigClip(C, undefined, { phys: false, obstacles: [counter] });
  assert.ok(off.prop > 15 && off.propIn === 'set', `the phone is in the counter, named so: ${off.prop} cm in ${off.propIn}`);
  assert.ok(on.grip > 15, `and with physics on the hand is off its grip: ${on.grip} cm`);
  assert.match(jointFails(on).join(), /solved joint: .* over 25/);
  const ex = async obstacles => { const a = await rigClip(C, undefined, { obstacles }), b = await rigClip(C, undefined, { phys: false, obstacles });
    return [jointExcess(a).excess, jointExcess(b).excess, a.grip, b.prop]; };
  assert.deepEqual(await ex([{ ...counter, lo: [-0.5, 0.5, 0], hi: [0.5, 1.05, 1.12] }]), await ex([]));
});

test('a held prop stops on what the head wears: the cop\'s pistol stays out of his cap', async () => {
  // Hot Money ep01 SH172 frames 72-88: the barrel up through the cop's peaked cap while the check read 0.00 cm (only the
  // skull was solid; the library's figure wore no cap)
  const C = getClip('Act_PistolShoot_Once'), strip = k => { const a = { ...k.armL }; delete a.ik; delete a.ikw; delete a.pole; return { ...k, armL: a }; };
  // the captured arm with no reach table: the gun goes up beside the head; capped, it reads inside the cap
  const keep = C.keys; C.keys = keep.map(strip);
  const fk = cap => rigClip({ ...C, needs: { ...C.needs, cap } }, undefined, { phys: false });
  let capped, bare; try { [capped, bare] = [await fk(true), await fk(false)]; } finally { C.keys = keep; }
  assert.ok(capped.prop > 10 && capped.propIn === 'hat', `the captured gun in the cap: ${capped.prop} cm in ${capped.propIn}`);
  assert.ok(bare.prop < capped.prop - 5, `bare headed it is not: ${bare.prop} cm`);
  // the clip as it ships (needs.cap: checked and proved wearing the cap): its reach table keeps the gun out, the grip on it
  assert.equal(C.needs.cap, true);
  const g = await rigClip(C), g0 = await rigClip(C, undefined, { phys: false });
  assert.ok(g.grip <= GRIP_CM && g.prop <= PROP_CM && g0.prop <= PROP_CM, `grip ${g.grip} cm, gun in the head ${g.prop} / ${g0.prop} cm`);
  assert.deepEqual([...jointFails(g), ...jointFails(g0)], []);
});

test('a cap\'s peak is solid only where it is: a point under it, in front of the face, is clear', async () => {
  const { headWear, wearVolume } = await import('../../styles/stick-man/engine/body.js');
  const ha = 0.3, hb = 0.28, crown = [], peak = [];
  for (let i = 0; i < 400; i++) { const a = (i % 40) / 40 * 2 * Math.PI, e = Math.floor(i / 40) / 10 * Math.PI / 2; crown.push(new THREE.Vector3(1.1 * ha * Math.cos(e) * Math.sin(a), 0.03 + 1.1 * hb * Math.sin(e), 1.1 * ha * Math.cos(e) * Math.cos(a))); }
  const P = (x, z) => new THREE.Vector3(x, 0.06, z); peak.push([P(-0.2, 0.25), P(0.2, 0.25), P(0, 0.5)]);
  const v = wearVolume(new THREE.Vector3(), new THREE.Quaternion(), [0.5, 0.47, 0.5], headWear(crown, peak, ha, hb)), at = (x, y, z) => v.test(new THREE.Vector3(x / 0.6, y / 0.6, z / 0.6));
  assert.ok(at(0, 0.3, 0.05), 'inside the crown, above the skull');
  assert.ok(at(0, 0.06, 0.4), 'in the peak');
  assert.equal(at(0, -0.06, 0.4), null, 'under the peak, in front of the face');
  assert.equal(at(0, 0.45, 0), null, 'above the cap');
});

test('joint gate: JOINT_KNOWN only shrinks', () => {
  assert.ok(Object.keys(JOINT_KNOWN).length <= 12, 'no clip is added to the known list');
  for (const [n, [x, why]] of Object.entries(JOINT_KNOWN)) assert.ok(x > 0 && why.length > 10, n);
});

test('props survive a copied anim: a film that maps, spreads or copies the placed keys keeps the prop it lets go', async () => {
  const r = placeClip({ f: 0, clip: 'Act_DropInTrunk_Once' }, { pos: [0, 0], yaw: 90 });
  // copied, spread, shifted, its first key dropped, re-sorted backwards
  for (const copy of [r.keys.map(k => ({ ...k })), [...r.keys], r.keys.map(k => ({ ...k, f: k.f + 10 })), r.keys.slice(1), [...r.keys].reverse()]) {
    const track = compileTrack(copy, {}, { pos: [0, 0], yaw: 90 }, 'kaiships');
    assert.deepEqual(track.props.map(p => [p.id, p.f1 - p.f0]), [['Rbag', 80]], 'one span, the clip key\'s');
    const { S, toPose } = await rigStick('adult'), { propPlan } = await import('../../styles/stick-man/engine/propobj.js');
    S.obstacles = markColliders(getClip('Act_DropInTrunk_Once').needs.marks);
    const fr = playActor(track, 0, 100), plan = propPlan(track, f => toPose(fr[Math.min(fr.length - 1, f)]), S);
    assert.ok(plan.at(Math.min(...copy.map(k => k.f)) + 70)?.Rbag, 'the bag let go is still in the scene');
  }
});

test('set pieces stop held props: a crate pushed at a wall stops on it, never inside', async () => {
  const wall = { name: 'wall', lo: [1.6, -2, 0], hi: [1.74, 2, 2.4] };
  const g = await rigClip(getClip('Move_PushHeavy_Loop'), undefined, { obstacles: [wall] });
  assert.deepEqual(g.propInSet, [], 'the crate never ends up inside the wall');
  assert.ok(g.grip > GRIP_CM, `the body walking on into the wall is reported (the hands left behind: ${g.grip} cm)`);
});

test('bed: lie down, sleep and get up on a raised surface (clip key pos [x, y, h]), the sleeper never sits up', async () => {
  const { S, toPose } = await rigStick('adult'), h = 0.55;
  const ks = expandClips([{ f: 0, clip: 'Trans_LieDown_Once', pos: [0, 0, h] }, { f: 80, clip: 'Idle_Sleep_Loop' }, { f: 360, clip: 'Trans_GetUp_Once' }], { pos: [0, 0], yaw: 90 });
  const track = compileTrack(ks, {}, { pos: [0, 0], yaw: 90 }, 'kaiships'), fr = playActor(track, 0, ks[ks.length - 1].f);
  assert.equal(track.flights.length, 0, 'held up by the surface, never a flight');
  assert.ok(ks.every(k => k.support === h), 'every clip after the first carries the surface on');
  let lowPelvis = 9, lyingHead = 0;
  fr.forEach((m, f) => { S.pose2(toPose(m, 1)); const w = S.rigWorld(); lowPelvis = Math.min(lowPelvis, w.skel.pelvis[2]); if (f > 100 && f < 360) lyingHead = Math.max(lyingHead, w.skel.head[2] - h); });
  assert.ok(Math.abs(lowPelvis - h) < 0.06, `the pelvis rests on the surface: lowest ${lowPelvis.toFixed(3)} m`);
  assert.ok(lyingHead < 0.32, `asleep, the head stays down (rolling onto the side and back): ${lyingHead.toFixed(2)} m over the surface`);
});

test('HandOver fit { top }: the cash is set down on a 1.12 m counter', async () => {
  const { S, toPose } = await rigStick('adult'), { propPlan } = await import('../../styles/stick-man/engine/propobj.js');
  const C = getClip('Act_HandOver_Once', 'adult', { top: 1.12 }); S.obstacles = markColliders(C.needs.marks);
  const keys = placeClip({ f: 0, clip: C.clip, fit: { top: 1.12 } }, { pos: [0, 0], yaw: 90 }).keys, track = compileTrack(keys, {}, { pos: [0, 0], yaw: 90 }, 'kaiships'), fr = playActor(track, 0, 90);
  const at = propPlan(track, f => toPose(fr[Math.min(fr.length - 1, f)]), S).at(70).Lcash.p;
  assert.ok(Math.abs(at[1] - 1.12) < 0.01, `the cash lies on the counter's top: ${at[1].toFixed(3)} m`);
});

// ------------------------------------------------------------------ PR E: the clips that hold a bag take its size

test('bag size: a clip key that swaps in a film bag fits the clip to that bag, read off the prop (no numbers in the film)', async () => {
  const { BUILD } = await import('../../styles/stick-man/kit/cast/handprops.js'), { bagMesh, sizedBag } = await import('../../styles/stick-man/motion-lib/props.js');
  const { propSize } = await import('../../styles/stick-man/motion-lib/index.js');
  assert.deepEqual(propSize('bag'), { w: 0.2, h: 0.26, l: 0.46, grip: 0.31 }, 'the kit bag names its size');
  // a film's bag with no size of its own: measured from its meshes (the ink hull too), the grip from the box's bottom
  BUILD.test_duffel = () => { const g = bagMesh(undefined, { w: 0.36, l: 0.62, h: 0.30, grip: 0.415 }); g.userData = { mode: 'up', grip: [0, 0.415, 0], mass: 25 }; return g; };
  const d = propSize('test_duffel');
  assert.ok(Math.abs(d.w - 0.36) < 0.04 && Math.abs(d.l - 0.62) < 0.05 && Math.abs(d.grip - 0.415) < 0.015, JSON.stringify(d));
  const T = placeClip({ f: 0, clip: 'Act_DropInTrunk_Once', fit: { lip: 0.85 }, swap: { bag: 'test_duffel' } }).clip;
  assert.ok(T.fitted.bag, 'the swapped bag is in the fit');
  assert.ok(T.needs.marks[0].at[0] > 0.6, `a deeper bag is heaved from further off the lip (${T.needs.marks[0].at[0]} m)`);
  // an explicit fit.bag wins over the prop; a clip that takes no bag size ignores the swap
  assert.equal(placeClip({ f: 0, clip: 'Act_DropInTrunk_Once', fit: { lip: 0.85, bag: { w: 0.2, l: 0.46, grip: 0.31 } }, swap: { bag: 'test_duffel' } }).clip.needs.marks[0].at[0], 0.45);
  assert.doesNotThrow(() => placeClip({ f: 0, clip: 'Act_PutDown_Once', swap: { bag: 'test_duffel' } }));
  assert.equal(sizedBag({ w: 0.36, l: 0.62, h: 0.30, grip: 0.415 }), 'bag_360x620x300_415');
  delete BUILD.test_duffel;
});

test('bag size: a swapped bag with no size yet (its mesh is built later) fails the fitted clip, never plays the kit bag\'s keys', async () => {
  const { BUILD } = await import('../../styles/stick-man/kit/cast/handprops.js');
  const empty = size => () => { const g = new THREE.Group(); g.userData = { mode: 'up', grip: [0, 0.415, 0], mass: 25, ...(size ? { size } : {}) }; return g; };
  BUILD.test_late_bag = empty();
  BUILD.test_late_bag_sized = empty([0.36, 0.30, 0.62]);
  for (const [clip, fit] of [['Act_DropInTrunk_Once', { lip: 0.85 }], ['Act_PushBagOutWindow_Once', { sill: 0.8, top: 1.9, width: 1, depth: 0.138 }]])
    assert.throws(() => placeClip({ f: 0, clip, fit, swap: { bag: 'test_late_bag' } }), e => /test_late_bag/.test(e.message) && /userData\.size/.test(e.message), clip);
  const T = placeClip({ f: 0, clip: 'Act_DropInTrunk_Once', fit: { lip: 0.85 }, swap: { bag: 'test_late_bag_sized' } }).clip;
  assert.deepEqual(T.fitted.bag, { w: 0.36, h: 0.3, l: 0.62, grip: 0.415 });
  assert.ok(Math.abs(T.needs.marks[0].at[0] - 0.65) < 1e-9, `the trunk mark at ${T.needs.marks[0].at[0]} m`);
  delete BUILD.test_late_bag;
  delete BUILD.test_late_bag_sized;
});

test('bag size: at Hot Money ep01\'s duffel the bag goes into the trunk (0.85 m lip) and out of the window, never onto the lip or sill', async () => {
  const { sizedBag } = await import('../../styles/stick-man/motion-lib/props.js'), { propPlan } = await import('../../styles/stick-man/engine/propobj.js');
  const bag = { w: 0.36, l: 0.62, h: 0.30, grip: 0.415 }, swap = { bag: sizedBag(bag) };
  for (const [clip, fit, where] of [['Act_DropInTrunk_Once', { lip: 0.85, bag }, 'trunk'], ['Act_PushBagOutWindow_Once', { sill: 0.8, top: 1.9, width: 1.0, depth: 0.138, bag }, 'window']]) {
    const r = placeClip({ f: 0, clip, fit, swap }, { pos: [0, 0], yaw: 90 }), m = r.clip.needs.marks[0];
    const track = compileTrack(r.keys, {}, { pos: [0, 0], yaw: 90 }, 'kaiships'), fr = playActor(track, 0, 90);
    const { S, toPose } = await rigStick('adult'); S.obstacles = markColliders(r.clip.needs.marks);
    const plan = propPlan(track, f => toPose(fr[Math.min(fr.length - 1, f)]), S), at = plan.at(85)['R' + swap.bag];
    const x = at.p[0], z = at.p[1];
    if (where === 'trunk') assert.ok(x > m.at[0] + 0.08 && Math.abs(z - m.floor) < 0.02, `in the trunk: x ${x}, z ${z}`);
    else {
      assert.ok(x > m.at[0] + m.depth && Math.abs(z) < 0.02, `outside on the ground: x ${x}, z ${z}`);
      // the bag's edges, not its centre (held crosswise: half its depth w along x, and its ink): over the wall its bottom
      // clears the sill, and once below the sill its back is past the wall's outer face, each by 4 cm at least
      const half = bag.w / 2 + 0.012, X0 = m.at[0], X1 = m.at[0] + m.depth;
      let over = Infinity, back = Infinity;
      for (let f = 30; f <= 85; f++) { const q = plan.at(f)['R' + swap.bag]; if (!q) continue; const [px, pz] = q.p;
        if (px + half > X0 && px - half < X1) over = Math.min(over, pz - m.at[2]);
        if (pz < m.at[2]) back = Math.min(back, px - half - X1); }
      assert.ok(over >= 0.04, `the bag's bottom clears the sill by ${(100 * over).toFixed(1)} cm`);
      assert.ok(back >= 0.04, `the bag's back clears the wall's outer face by ${(100 * back).toFixed(1)} cm`);
    }
  }
});

// Faults the gate passed and the batch 1 contact sheets and review showed (25/11)
import { lifeFails, lifeAgainst, shapeAgainst, BODY_LIFE, READ_PX, PX_PER_M, SHAPE_C, SHAPE_REL, SHAPE_CM, NEAREST, stillSpans, STILL_F, STILL_IN, STILL_CM, faceHidden, FACE_SEEN } from '../../styles/stick-man/tools/gates/bodylife.mjs';
import { clipLife, onBody, adultTwin, adultNear, bodyFails, motionFails, floorFails, FLOOR_CM, BODY_KNOWN, BODY_KNOWN_DATE, bodyGate, stillFails } from '../../styles/stick-man/tools/gates/motionlib.mjs';
import { act } from '../../styles/stick-man/motion-lib/acts/act.js';
import { mocapClip, captureBase, floorClip, bridgeKeys, poleSpans, BASES } from '../../styles/stick-man/motion-lib/base.js';
import { ownSource, retime, follow, HAND_MAX } from '../../styles/stick-man/motion-lib/ref/perform.js';
import { mocapCycle } from '../../styles/stick-man/motion-lib/ref/mocap.js';
const acts = fs.readdirSync(new URL('../../styles/stick-man/motion-lib/acts/', import.meta.url)).map(f => f.replace('.js', '')).filter(n => n !== 'act');
const MINE = ALL.filter(C => acts.includes(C.clip)), of = clip => MINE.filter(C => C.clip === clip);
// every clip PR 202 made (the acts, and the elder's old walk): none may sit on the baseline of older faults
const NEW = [...MINE, getClip('Move_OldWalk_Fwd_Loop', 'elder')];
const ROWS = new Map();
const rigRows = async (clip, body) => { const id = `${body} ${clip}`; if (!ROWS.has(id)) { const rows = [], C = getClip(clip, body);
  await rigClip(C, body, { each: (f, S, w) => { const h = S.parts.head, e = h.matrixWorld.elements, up = new THREE.Vector3(e[4], e[5], e[6]).normalize();
    const P = v => { const q = h.localToWorld(new THREE.Vector3(...v)); return [q.x, -q.z, q.y]; };
    rows.push({ ...w, face: Math.atan2(e[8], e[10]) * 180 / Math.PI, roll: Math.asin(Math.max(-1, Math.min(1, -up.z))) * 180 / Math.PI, mouth: P([0, -0.10, 0.34]), eyeL: P([-0.12, 0, 0.33]), eyeR: P([0.12, 0, 0.33]) }); } }); ROWS.set(id, rows); } return ROWS.get(id); };
const once = async C => (await rigRows(C.clip, C.body)).slice(0, C.frames + 1);
const capOf = async C => (await rigRows(C.clip, C.body)).slice(C.captured[0], C.captured[1] + 1);
const d3 = (a, b) => Math.hypot(...a.map((x, i) => x - b[i])), sub = (a, b) => a.map((x, i) => x - b[i]), dot = (a, b) => a.reduce((t, x, i) => t + x * b[i], 0);
// how close two limb lines come (sampled along one)
const segs = (p, q, a, b) => { let m = 9; const d = sub(b, a); for (let i = 0; i <= 10; i++) { const x = p.map((v, k) => v + (q[k] - v) * i / 10), t = Math.max(0, Math.min(1, dot(sub(x, a), d) / (dot(d, d) || 1))); m = Math.min(m, d3(x, a.map((v, k) => v + d[k] * t))); } return m; };
const armGap = w => Math.min(segs(w.L.shoulder, w.L.elbow, w.R.shoulder, w.R.elbow), segs(w.L.elbow, w.L.hand, w.R.elbow, w.R.hand), segs(w.L.shoulder, w.L.elbow, w.R.elbow, w.R.hand), segs(w.L.elbow, w.L.hand, w.R.shoulder, w.R.elbow));
const speed = rows => Math.max(...rows.slice(1).flatMap((w, i) => ['L', 'R'].map(s => 100 * d3(w[s].hand, rows[i][s].hand))));
const offFront = rows => rows.map(w => Math.abs(((w.face - rows[0].face + 540) % 360) - 180));

test('each body performs its own way: the gate fails one capture on five bodies at one clock and one size', async () => {
  // the fixture: batch 1 as first made (one mocapClip recipe, every frame on every body). The check, run on cdc0a51a before any
  // clip was touched, failed all 38 of its clips that have an adult twin (time 1 on each; the list is in PR 202)
  const { default: YAWN } = await import('../../styles/stick-man/motion-lib/ref/mixamo/yawn.js'), { default: CRY } = await import('../../styles/stick-man/motion-lib/ref/mixamo/crying.js'), { default: WALK } = await import('../../styles/stick-man/motion-lib/ref/mixamo/sad_walk.js');
  const { gaitLoop } = await import('../../styles/stick-man/motion-lib/base.js');
  const same = (src, o = {}) => body => act({ clip: 'Gest_Same_Once', loop: false }, b => mocapClip({ body: b, src, ...o }))(body);
  for (const src of [YAWN, CRY]) { const C = same(src), A = C('adult');
    for (const b of Object.keys(BODY_LIFE)) { const f = lifeFails(b, await clipLife(A), await clipLife(C(b)), { on: await onBody(A, b) }); for (const r of [/time is 1 of/, /arc/, /shape/]) assert.ok(f.some(x => r.test(x)), `${b} passes ${r}: ${f}`); } }
  const G = b => ({ name: `${b} walk`, clip: 'Move_Same_Loop', needs: {}, loop: true, ...gaitLoop({ body: b, kind: 'walk', mocap: WALK, loopIntro: true, strike: true }), body: b }), A = G('adult');
  for (const b of ['thin', 'elder', 'heavy']) assert.deepEqual(lifeFails(b, await clipLife(A), await clipLife(G(b)), { on: await onBody(A, b) }).map(x => x.match(/'s (\w+)/)[1]), ['time', 'stride', 'shape']);
});
// Studio 25/11 after REVIEW-3, gate (a): a body's clip made of the ADULT's own values (bodies.js life and perform, the recipe and the
// body's own gait numbers as they are) fails, and so does the adult's performance on the body's own clock and reach (its life) alone:
// both by their shape, on every body. (REVIEW-3: Heavy and Elder SadWalk and Heavy NodYes passed the first shape mark this way.)
// SHAPE_C was set from the geometry of a resize (bodylife.mjs) before these were measured
test('gate (a): the adult\'s own values, and the adult retimed and resized, fail the shape check on every body', async () => {
  assert.equal(SHAPE_C, 0.85); assert.ok(Math.abs(SHAPE_REL - Math.sqrt(1 - 0.85 ** 2)) < 1e-12); assert.equal(SHAPE_CM, 1.4);
  for (const clip of ['Move_SadWalk_Fwd_Loop', 'Gest_NodYes_Once', 'React_Defeated_Once', 'React_Terrified_Once', 'Gest_Point_Once', 'Gest_ShakeNo_Once']) {
    const { default: recipe } = await import(`../../styles/stick-man/motion-lib/acts/${clip}.js`), A = getClip(clip, 'adult');
    for (const body of Object.keys(BODY_LIFE)) for (const life of [BODIES.adult.life, BODIES[body].life]) {
      const B = BODIES[body], was = [B.life, B.perform]; let C;
      try { B.life = life; B.perform = BODIES.adult.perform; C = recipe(body); } finally { [B.life, B.perform] = was; }
      const L = await clipLife(C), on = await onBody(A, body), s = shapeAgainst(on, L), f = lifeFails(body, await clipLife(A), L, { on });
      assert.ok(f.some(x => /'s shape/.test(x)), `${clip} ${body} (${life === B.life ? 'retimed' : 'adult values'}): the gate passes a copy (${s.shape.toFixed(2)}, ${s.cm.toFixed(1)} cm ${s.part})`);
      assert.ok(s.c > 0.9, `${clip} ${body}: a copy's correlation ${s.c.toFixed(3)}`);
    } }
});
test('the shape check passes another performance: an act of its own on the same body, and one drawn-out hold is not another shape', async () => {
  const A = getClip('Gest_Point_Once', 'adult'), on = await onBody(A, 'heavy');
  const s = shapeAgainst(on, await onBody(getClip('Gest_Yawn_Once', 'adult'), 'heavy')); assert.ok(s.shape >= SHAPE_REL && s.cm >= SHAPE_CM, JSON.stringify(s));
  const P = on.paths.handL.length >> 1, held = { paths: Object.fromEntries(Object.entries(on.paths).map(([n, p]) => [n, [...p.slice(0, P), ...Array(P >> 1).fill(p[P]), ...p.slice(P)]])) };
  assert.ok(shapeAgainst(on, held).shape < 0.15, JSON.stringify(shapeAgainst(on, held)));
});
// REVIEW-3: rigClip played the registered clip of that name, so altered keys could not be checked: it plays the record it is given
test('the rig plays the clip it is given', async () => {
  const C = getClip('Gest_NodYes_Once', 'adult'), bowed = { ...C, keys: C.keys.map(k => ({ ...k, neck: { ...k.neck, nod: 40 } })) };
  const low = async X => Math.max(...(await rigClip(X)).paths.map(r => r.down)); assert.ok(await low(bowed) > await low(C) + 30);
  assert.match(checkClip({ ...C, keys: C.keys.map(k => (k.f === 0 ? { ...k, armR: { ...k.armR, raise: 170, elbow: 0 } } : k)) }, 'body/adult/Adult_Gest_NodYes_Once_v01.js').fails.join(), /joint gate/);
});
test('each body performs its own way: every body against the adult, and every two bodies against each other', async () => {
  for (const C of NEW) assert.deepEqual(await bodyFails(C), [], C.name);
  // two bodies of one clip, in time (on the move: how fast they cover ground) and, where it is big enough to read, in the size
  // of the arc: 8 % at least, the least difference seen across a cut (bodylife.mjs)
  for (const clip of acts) { const L = []; for (const C of of(clip)) L.push([C.body, await clipLife(C)]);
    for (const [i, [a, A]] of L.entries()) for (const [b, B] of L.slice(i + 1)) {
      const t = A.moves ? (A.stride / A.frames) / (B.stride / B.frames) : A.frames / B.frames; assert.ok(Math.max(t, 1 / t) >= 1.08, `${clip} ${a} ${b}: time ${t.toFixed(3)}`);
      const lead = Object.keys(A.size).reduce((x, y) => (A.size[y] > A.size[x] ? y : x)); if (A.moves || Math.max(A.size[lead], B.size[lead]) * 0.08 * PX_PER_M < READ_PX) continue;
      const r = A.size[lead] / B.size[lead]; assert.ok(Math.max(r, 1 / r) >= 1.08, `${clip} ${a} ${b}: ${lead} arc ${r.toFixed(3)}`); } }
});
test('each body performs its own way: the gate itself runs the check (no clip passes motionlib.mjs without it)', async () => {
  // the adult's yawn handed to the heavy body as its own: what checkAll pushes for it
  const A = getClip('Gest_Yawn_Once', 'adult'), g = await rigClip(A, 'adult'), f = await motionFails({ ...A, body: 'heavy', name: 'Heavy_Gest_Yawn_Once' }, g, g);
  assert.match(f.join('; '), /heavy's time is 1 of the adult's \(>= 1.1\).*heavy's arc.*heavy's shape/);
  assert.match(fs.readFileSync(new URL('../../styles/stick-man/tools/gates/motionlib.mjs', import.meta.url), 'utf8'), /bodyGate\(r, C, await motionFails\(C, g, g0\)\)/);
  assert.ok(MINE.some(C => C.body !== 'adult' && adultTwin(C)));
});
// Studio 25/11, gate (b): the child's stride limit became cadence after measuring. Old: stride >= 1.05 of the adult's for its leg;
// new: steps >= 15 % quicker, stride <= 1. Old -> new on each child gait: Move_Walk 0.71 FAIL -> cadence 1.55, stride 0.71 PASS;
// Move_Run 0.58 FAIL -> cadence 1.19, stride 0.58 PASS. Thin keeps its stride >= 1.05 (bodies.js "long light steps")
test('gate (b): a child is held to quick steps (cadence) and steps no longer than the adult\'s; thin keeps its stride', async () => {
  assert.deepEqual(BODY_LIFE.child.stride, [0, 1.0]); assert.deepEqual(BODY_LIFE.child.cadence, [1.15, Infinity]); assert.deepEqual(BODY_LIFE.thin.stride, [1.05, Infinity]);
  for (const clip of ['Move_Walk_Fwd_Loop', 'Move_Run_Fwd_Loop']) { const r = lifeAgainst('child', await clipLife(getClip(clip, 'adult')), await clipLife(getClip(clip, 'child')), { on: await onBody(getClip(clip, 'adult'), 'child') });
    assert.deepEqual(r.map(x => [x.n, x.ok]), [['cadence', true], ['stride', true], ['shape', true]], `${clip}: ${JSON.stringify(r)}`); }
  // a child that strides out like the adult, at the adult's cadence, fails both
  const A = await clipLife(getClip('Move_Walk_Fwd_Loop', 'adult')); assert.deepEqual(lifeFails('child', A, { ...A, stride: A.stride * 1.1 }).map(x => x.match(/'s (\w+)/)[1]), ['cadence', 'stride', 'shape']);
});
// Studio 25/11, gate (c): the clips on main before 25/11 that still fail the body check, named and dated; each must fail exactly
// as listed (motionlib.mjs bodyGate, run by checkAll in the first test), a fixed one must leave, and none is a clip PR 202 made
test('gate (c): the baseline lists only older clips, dated, each failing as listed', async () => {
  assert.equal(BODY_KNOWN_DATE, '25/11');
  const names = new Set(NEW.map(C => C.name)); for (const n of Object.keys(BODY_KNOWN)) { assert.ok(!names.has(n), `${n} is a new clip`); assert.ok(ALL.some(C => C.name === n), n); }
  for (const [n, [want]] of Object.entries(BODY_KNOWN)) { const C = ALL.find(c => c.name === n), r = { fails: [] }; bodyGate(r, C, await bodyFails(C)); assert.deepEqual(r.fails, [], n); assert.match(r.known, new RegExp(want.join('|'))); }
  // a listed clip that passes, or fails another way, fails
  const C = ALL.find(c => c.name === 'Thin_Move_Walk_Fwd_Loop'), r1 = { fails: [] }, r2 = { fails: [] };
  bodyGate(r1, C, []); assert.match(r1.fails[0], /fixed, delete it/);
  bodyGate(r2, C, ["body: thin's time is 1 of the adult's (<= 0.92)"]); assert.match(r2.fails.join(), /BODY_KNOWN lists stride/);
});
// a twinless clip on the move is held to its nearest adult gait; in place, to the stated rule (never still, its posture)
test('a clip with no adult twin: the old walk against the adult walk, the stooped idle never still', async () => {
  assert.deepEqual(NEAREST, { Move_OldWalk_Fwd_Loop: 'Move_Walk_Fwd_Loop' });
  const O = getClip('Move_OldWalk_Fwd_Loop', 'elder'); assert.equal(adultNear(O).name, 'Adult_Move_Walk_Fwd_Loop');
  assert.deepEqual((await bodyFails(O)).filter(x => !/near/.test(x)), []);
  const fake = { ...O, keys: O.keys, frames: Math.round(O.frames * 0.5) }; assert.match((await bodyFails(fake, await rigClip(O))).join(), /elder's time .*near: Adult_Move_Walk_Fwd_Loop/);
  assert.deepEqual(stillSpans((await rigClip(getClip('Idle_Stooped_Loop', 'elder'))).paths), []);
});
// REVIEW-2 FIX (Gest_Clap child): both hands open and close (the captured right did the work: from three-quarter front, one hand
// flapping), each travelling at least 40 % of the opening, and a child opens 15 % wider for its size than the adult (bodies.js:
// "bigger gestures for its size", 15 % the size change the arc check calls readable for a child)
test('a clap: the hands meet and never pass through each other, both open wide between two meetings, a child\'s wider for its size', async () => {
  const opens = {};
  for (const [clip, body, open] of [['Gest_Clap_Loop', 'adult', 25], ['Gest_Clap_Loop', 'child', 18], ['Gest_SitClap_Loop', 'adult', 20]]) {
    const C = getClip(clip, body), R = await capOf(C), axis = w => { const a = sub(w.R.shoulder, w.L.shoulder), l = Math.hypot(...a); return a.map(x => x / l); }, mid = w => w.L.shoulder.map((x, i) => (x + w.R.shoulder[i]) / 2);
    const gap = R.map(w => 100 * dot(sub(w.R.hand, w.L.hand), axis(w)));
    assert.ok(Math.min(...gap) > -2 && Math.min(...gap) < 2, `${body} ${clip}: ${Math.min(...gap).toFixed(1)} cm`);
    const meets = gap.filter((g, i) => i && i < gap.length - 1 && g < 6 && g <= gap[i - 1] && g < gap[i + 1]).length, wide = Math.max(...gap);
    assert.ok(meets >= 3, `${body} ${clip}: ${meets} meetings`); assert.ok(wide >= open, `${body} ${clip}: opens ${wide.toFixed(0)} cm`);
    const travel = s => { const v = R.map(w => 100 * dot(sub(w[s].hand, mid(w)), axis(w))); return Math.max(...v) - Math.min(...v); };
    for (const s of ['L', 'R']) assert.ok(travel(s) >= 0.4 * wide, `${body} ${clip}: the ${s} hand travels ${travel(s).toFixed(0)} of ${wide.toFixed(0)} cm`);
    opens[`${clip} ${body}`] = wide / (BODIES[body].spec.scale ?? 1);
  }
  assert.ok(opens['Gest_Clap_Loop child'] >= 1.15 * opens['Gest_Clap_Loop adult'], JSON.stringify(opens));
});
test('seated claps are at the chest, not the knees', async () => {
  for (const C of of('Gest_SitClap_Loop')) { const R = (await once(C)).slice(C.captured[0], C.captured[1]); for (const w of R) assert.ok(Math.min(w.L.hand[2], w.R.hand[2]) > w.L.knee[2] + 0.12, `${C.name}: hand ${w.L.hand[2]} knee ${w.L.knee[2]}`); }
});
// (played twice, so the frame after the capture's last is the next lap's first: played once it is the blend back to the standard
// pose, whose first frame the engine plays its own way, which this test is not about)
test('a loop in place repeats without skipping a frame: the hands move on at the seam as they did before it', async () => {
  for (const C of MINE.filter(C => C.loop && !C.advance)) { const r = placeClip({ f: 0, clip: C.clip, body: C.body, times: 2 }, { pos: [0, 0], yaw: 90 }), R = [];
    await rigClip({ ...C, keys: r.keys, frames: r.keys.at(-1).f }, C.body, { each: (f, S, w) => R.push(w) });
    const [, b] = C.captured, v = f => Math.max(...['L', 'R'].map(s => 100 * d3(R[f][s].hand, R[f - 1][s].hand)));
    assert.ok(v(b + 1) < 1.35 * Math.max(v(b), v(b + 2)) + 0.6, `${C.name}: ${v(b + 1).toFixed(1)} cm after ${v(b).toFixed(1)}`); }
});
test('a kneeling or floor-sitting body has its feet on the floor', async () => {
  for (const clip of ['Idle_Kneel_Loop', 'Idle_SitFloor_Loop']) for (const C of of(clip)) for (const w of await once(C)) for (const s of ['L', 'R']) assert.ok(100 * Math.max(w[s].ankle[2], w[s].toe[2]) <= FLOOR_CM, `${C.name}: ankle ${w[s].ankle[2]} toe ${w[s].toe[2]}`);
  assert.match(floorFails({ base: 'KNEEL' }, { paths: [{ feet: [[0.116, 0.105], [0.016, 0.013]] }] })[0], /11\.6 cm above the floor/);
});
test('a capture that kneels stands on its knees: hips over them, the shins back along the floor', async () => {
  for (const body of ['adult']) for (const w of (await rigRows('Idle_Kneel_Loop', body)).slice(30, 60)) for (const s of ['L', 'R']) {
    assert.ok(w[s].kneeFlex > 80, `${body} knee ${w[s].kneeFlex}`);
    assert.ok(Math.abs(w[s].knee[0] - w[s].hip[0]) < 0.12 && w[s].knee[2] < 0.1, `${body} knee at ${w[s].knee}`);
  }
});
test('an elder stays stooped through a standing clip (it stood up to 3 deg for a nod)', async () => {
  for (const clip of ['Idle_Sad_Loop', 'Idle_Stooped_Loop']) {
    const lean = (await rigRows(clip, 'elder')).map(w => w.torsoLean); assert.ok(Math.min(...lean) > 12, `${clip}: ${Math.min(...lean)} deg`);
  }
});
test('an arm keeps 3 cm off the other one (thin shoulders brought the arms of five clips together)', async () => {
  for (const C of MINE.filter(C => !/Clap/.test(C.clip))) { const n = (await once(C)).filter(w => 100 * armGap(w) < 3).length; assert.equal(n, 0, `${C.name}: ${n} frames`); }
});
test('a seated body keeps its hips on the seat', async () => {
  for (const C of MINE.filter(C => C.base === 'SIT')) { const z = (await once(C)).map(w => 100 * w.skel.pelvis[2]); assert.ok(Math.max(...z) - Math.min(...z) < 1, `${C.name}: ${(Math.max(...z) - Math.min(...z)).toFixed(1)} cm`); }
});
// Limits re-set from principle (Studio 25/11, gate (d)), written before the clips were measured against them:
// HAND_CM (was 12, "from seen values"): the library's own cap on a hand, perform.js HAND_MAX (8 cm a frame, 2.4 m/s, a quick
// gesture), as the 'kaiships' dose plays it (DOSE_E: every angle 1.3 times as far from the act's first key): 10.4 cm a frame
const HAND_CM = 100 * HAND_MAX * DOSE_E;
test('no hand snaps', async () => {
  assert.ok(Math.abs(HAND_CM - 10.4) < 1e-9);
  for (const C of NEW) { const v = speed(await once(C)); assert.ok(v <= HAND_CM, `${C.name}: ${v.toFixed(1)} cm/f`); }
});
// the clap caps (were hand 0.14, limb 22, raised for the claps): the library's own, HAND_MAX and LIMB_MAX: a clap is no faster than any
// other quick gesture (a clapping hand meets the other at 1.5-2 m/s, under the cap's 2.4)
test('the claps keep the library\'s speed caps', () => {
  for (const f of ['Gest_Clap_Loop', 'Gest_SitClap_Loop']) assert.doesNotMatch(fs.readFileSync(new URL(`../../styles/stick-man/motion-lib/acts/${f}.js`, import.meta.url), 'utf8'), /hand: 0\.1|limb: 2/);
});
// ONCE (Terrified was <= 5.3 s, its own 5.23): the adult's Terrified is its act (the capture's span) plus the library's way in (14
// frames) and the rise out of the crouch, which may take no more than 60 frames (2 s: twice a brisk sit-to-stand; the capture never
// stands up, so the rise is the clip's own). RISE: the head never comes up faster than 2.5 cm a frame (0.75 m/s, a brisk
// sit-to-stand's), whatever the body's size (the legs push a light body up as fast).
// (Set after the first measure, unlike the others: the first rise limit scaled with the root of the body's size and assumed an
// easing whose peak is 1.5 times its mean; the library's 'slow' ease peaks at 2.3, and no child rise fitted both that and the
// child's quick clock. ONCE in seconds is longer than before, 6.2 s against 5.3: the rise was 8 frames, now it is acted)
const ONCE_IN = 14, ONCE_RISE = 60, RISE_CM = 2.5;
// the gate's face check (bodylife.mjs FACE_SEEN) reads the head's turn and its look down. REVIEW-3: it read the turn only, and left
// out SadWalk (70 deg down), Cry and Sad
test('a clip a film cuts to shows its face: turned away or bowed is the exception, the last frame is front, and a once is short', async () => {
  for (const C of MINE.filter(C => FACE_SEEN[C.clip])) { const g = await rigClip(C); assert.deepEqual(faceHidden(C.clip, g.paths), [], C.name); }
  for (const clip of ['Move_RunTired_Once', 'React_Defeated_Once', 'React_Terrified_Once']) for (const C of of(clip)) { const off = offFront(await once(C)); assert.ok(off[off.length - 1] < 5, `${C.name} ends ${off[off.length - 1].toFixed(0)} deg off`); }
  assert.ok(getClip('Gest_SitTalk_Loop', 'adult').frames <= 8 * 30);
  const T = getClip('React_Terrified_Once', 'adult'); assert.ok(T.frames <= T.captured[1] - T.captured[0] + ONCE_IN + ONCE_RISE, `Terrified: ${T.frames} f for a ${T.captured[1] - T.captured[0]} f act`);
});
test('the face check reads the look down as well as the turn', async () => {
  for (const n of ['Move_SadWalk_Fwd_Loop', 'React_Cry_Loop', 'Idle_Sad_Loop']) assert.ok(FACE_SEEN[n], n);
  // a bowed head fails, a turned one too, and SadWalk at its old 70 deg
  const W = getClip('Move_SadWalk_Fwd_Loop', 'adult'), bow = o => ({ ...W, keys: W.keys.map(k => ({ ...k, neck: { ...k.neck, ...o(k) } })) });
  assert.match(faceHidden(W.clip, (await rigClip(bow(k => ({ nod: k.neck.nod + 45 })))).paths).join(), /hidden .* looks \d+ deg down \(max 35/);
  assert.match(faceHidden('Idle_Sad_Loop', [0, 1, 2].map(() => ({ yaw: 0, down: 70 }))).join(), /hidden .* 100 %/);
  assert.match(faceHidden('React_Cry_Loop', [0, 60, 60].map(yaw => ({ yaw, down: 0 }))).join(), /turned over 40/);
});
// REVIEW-2 FIX (React_Terrified child: folded into a ball 2 s, sprang up in 8 frames, head 6 cm a frame, the fear gone)
test('a frightened body rises out of its crouch, never springs up', async () => {
  for (const C of of('React_Terrified_Once')) { const z = (await once(C)).map(w => w.skel.head[2]), v = Math.max(...z.slice(1).map((x, i) => 100 * (x - z[i])));
    assert.ok(v <= RISE_CM, `${C.name}: the head rises ${v.toFixed(2)} cm/f`); }
});
// REVIEW-3 (Surprise: a 0.7 s bow first, then a near-still 2 s hold): the hands are up (nine tenths of their way) within the first half
// second, nothing bows before they are (the trunk within 3 deg of upright, forward), and they hold for a beat: 0.4 to 1.2 s
test('a surprise is an accent: hands up and body back within half a second, no bow first, a short beat held', async () => {
  for (const C of of('React_Surprise_Once')) { const R = await once(C), z = R.map(w => (w.L.hand[2] + w.R.hand[2]) / 2), top = Math.max(...z), up = z.findIndex(x => x > z[0] + 0.9 * (top - z[0]));
    assert.ok(top - z[0] > 0.32, `${C.name}: the hands rise ${(100 * (top - z[0])).toFixed(0)} cm`); assert.ok(up <= 15, `${C.name}: up at ${up}`);
    const lean = R.slice(0, up + 1).map(w => w.torsoLean); assert.ok(Math.max(...lean) < 3, `${C.name}: bows ${Math.max(...lean).toFixed(0)} deg first`); assert.ok(Math.min(...R.map(w => w.torsoLean)) < -8, `${C.name}: never goes back`);
    const held = z.filter(x => x > top - 0.06).length; assert.ok(held >= 12 && held <= 36, `${C.name}: held ${held} f`); }
});
// REVIEW-3 (Type: an arm held straight out for 2 s, no key struck): on a figure with no fingers the hand itself goes down and up, 3 cm
// or more (13 px on a full-height figure), two strikes a second or more over the loop, from both hands, the elbows bent
test('typing: both hands strike down and up, no arm held straight out', async () => {
  for (const C of of('Act_Type_Loop')) { const R = await capOf(C), hit = [];
    for (const s of ['L', 'R']) { const z = R.map(w => 100 * w[s].hand[2]); let n = 0;
      for (let i = 1; i < z.length - 1; i++) if (z[i] < z[i - 1] && z[i] <= z[i + 1] && Math.min(Math.max(...z.slice(Math.max(0, i - 6), i)), Math.max(...z.slice(i, i + 7))) - z[i] >= 3) n++;
      hit.push(n); const el = Math.min(...R.map(w => w[s].elbowFlex)); assert.ok(el > 45, `${C.name} ${s}: elbow ${el.toFixed(0)} deg`); }
    assert.ok(Math.min(...hit) >= 8 && (hit[0] + hit[1]) / R.length * 30 >= 2, `${C.name}: ${hit} strikes in ${R.length} f`); }
});
// REVIEW-3 (RunTired: no run reads): at least six steps no more than 18 frames apart, a swinging foot 20 cm up, less than half of it with
// both feet down (the old one: 65 %), and it ends standing within 6 s
test('a tired run runs, then stops', async () => {
  for (const C of of('Move_RunTired_Once')) { const R = (await once(C)).slice(0, C.frames - 50), land = [];
    for (const s of ['L', 'R']) { let up = false; R.forEach((w, f) => { const z = w[s].ankle[2]; if (z > 0.06) up = true; else if (up && z < 0.03) { land.push(f); up = false; } }); }
    land.sort((a, b) => a - b); assert.ok(land.length >= 6 && land.slice(1).every((f, i) => f - land[i] <= 18), `${C.name}: steps ${land}`);
    assert.ok(Math.max(...R.map(w => Math.max(w.L.ankle[2], w.R.ankle[2]))) > 0.2, C.name); assert.ok(C.frames <= 180);
    const both = R.filter(w => ['L', 'R'].every(s => Math.min(w[s].ankle[2], w[s].toe[2]) < 0.03)).length / R.length; assert.ok(both < 0.5, `${C.name}: both feet down ${(100 * both).toFixed(0)} %`); }
});
test('a phone at the ear stays against the head all through the call (it hung 7 cm off it)', async () => {
  for (const C of of('Gest_PhoneTalk_Loop')) { const [a, b] = C.captured; let worst = 0;
    // the phone's corners in the head's own frame, against the head (0.30 x 0.282 x 0.30 m)
    await rigClip(C, C.body, { each: (f, S, w) => { if (f < a || f > b) return; const h = S.parts.head;
      worst = Math.max(worst, 100 * 0.3 * (Math.min(...w.R.heldPts.map(p => { const v = h.worldToLocal(new THREE.Vector3(p[0], p[2], -p[1])); return Math.hypot(v.x / 0.3, v.y / 0.282, v.z / 0.3); })) - 1)); } });
    assert.ok(worst < 4, `${C.name}: ${worst.toFixed(1)} cm off the head`); }
});
test('a retime keeps the capture\'s ends and its limbs\' lengths, slows a hand to its cap, and a body at 1 changes nothing', async () => {
  const { default: YAWN } = await import('../../styles/stick-man/motion-lib/ref/mixamo/yawn.js'), len = (f, a, b) => d3(f[a], f[b]);
  const N = ownSource(YAWN, BODIES.adult.life, { cap: false }); assert.equal(N.frames.length, YAWN.frames.length); assert.ok(d3(N.frames[100].LeftHand, YAWN.frames[100].LeftHand) < 1e-9);
  const E = ownSource(YAWN, BODIES.elder.life), n = E.frames.length; assert.ok(n > 1.2 * YAWN.frames.length);
  assert.ok(d3(E.frames[n - 1].Hips, YAWN.frames.at(-1).Hips) < 1e-6);
  for (const f of E.frames) assert.ok(Math.abs(len(f, 'LeftArm', 'LeftForeArm') / len(YAWN.frames[0], 'LeftArm', 'LeftForeArm') - 1) < 0.03);
  const v = F => Math.max(...F.slice(1).map((f, i) => d3(f.RightHand, F[i].RightHand))); assert.ok(v(YAWN.frames) > 0.07 && v(retime(YAWN, { hand: 0.05 }).frames) <= 0.055);
});
test('a standard pose taken from a capture belongs to that capture; bridgeKeys takes frames between two keys', () => {
  const src = {}; assert.throws(() => captureBase('KNEEL', src), /taken from another capture/);
  const K = [0, 4, 8, 12].map(f => ({ f, armR: { raise: 80, swing: f * 10, elbow: 0, roll: f } })), B = bridgeKeys(K, [['armR', 1, 11]]);
  assert.equal(B[0].armR.swing, 0); assert.equal(B[3].armR.swing, 120); assert.ok(B[1].armR.swing > 0 && B[1].armR.swing < B[2].armR.swing);
  assert.deepEqual(poleSpans([0, 1, 2].map(f => ({ f, armL: { raise: 0, swing: 0, roll: 0 }, armR: { raise: 88, swing: f === 2 ? 200 : 0, roll: 0 } }))), [['armR', -4, 7]]);
});
// REVIEW-2 FIX (holds froze: Idle_Kneel 176 frames, Idle_Sad 315, Idle_SitFloor 209-293, Gest_SitTalk elder "nearly frozen"): no
// clip a body performs stops dead (bodylife.mjs STILL_F, STILL_IN, STILL_CM; the gate's stillFails), and the talking hand of a
// seated talk keeps talking
test('a hold never freezes: every new clip moves within each 2 s, the talking hand too', async () => {
  for (const C of NEW) { assert.ok(C.perform, C.name); assert.deepEqual(stillSpans((await once(C)).map(w => ({ head: w.skel.head, handL: w.L.hand, handR: w.R.hand, pelvis: w.skel.pelvis }))), [], C.name); }
  for (const C of of('Gest_SitTalk_Loop')) { const R = await capOf(C), v = R.slice(STILL_IN).map((w, i) => 100 * d3(w.R.hand, R[i].R.hand)), lazy = [];
    for (let a = 0; a + STILL_F - STILL_IN <= v.length; a++) if (Math.max(...v.slice(a, a + STILL_F - STILL_IN)) < STILL_CM) lazy.push(a);
    assert.deepEqual(lazy.slice(0, 3), [], C.name); }
});
test('the still check: a frozen figure fails, and so does the kneel REVIEW-3 saw still', async () => {
  // the kneel REVIEW-3 saw still for 62 frames (the capture alone, no breath or weight of the act's own) fails
  const K = getClip('Idle_Kneel_Loop', 'adult'), old = { ...K, keys: floorClip('KNEEL', 'adult').keys }; assert.equal(STILL_CM, 2.8); assert.match(stillFails(old, await rigClip(old))[0], /^still/);
  assert.match(stillFails({ perform: true }, { paths: Array.from({ length: 90 }, () => ({ head: [0, 0, 1], handL: [0, 0, 1], handR: [0, 0, 1], pelvis: [0, 0, 0.6] })) })[0], /^still: nothing moves/);
});
// REVIEW-2 FIX (Gest_NodYes elder: the head tilted to one side f21-133, read as a tilt): a yes keeps its head within 10 deg of
// upright to the side (a head rolled further reads as a tilt, a question, not a nod)
test('a yes is a nod, not a tilt', async () => {
  for (const C of of('Gest_NodYes_Once')) { const r = Math.max(...(await capOf(C)).map(w => Math.abs(w.roll))); assert.ok(r <= 10, `${C.name}: the head rolls ${r.toFixed(0)} deg`); }
});
// REVIEW-2 FIX (Gest_Yawn: the elder's hand never reached the face, 53 cm off the head's centre; the heavy's 49; per-body tables and
// no check): the yawning hand covers the mouth (its centre within 5 cm of where it covers it, mocap_reach.mjs 'mouth', the fist's
// own radius) for at least half a second, on every body
test('a yawn: the hand comes to the mouth on every body', async () => {
  for (const C of of('Gest_Yawn_Once')) { const n = (await capOf(C)).filter(w => 100 * d3(w.L.hand, w.mouth) < 5).length; assert.ok(n >= 15, `${C.name}: ${n} frames at the mouth`); }
});
// REVIEW-2 FIX (React_Cry: the hands went to the chin, read worried or thinking): the hands press on the eyes, each within 6 cm of
// where it covers its eye (mocap_reach.mjs 'eye') for at least 30 % of the loop, and while a hand is at the face it is at the
// eye, not the chin
test('a cry: the hands go to the eyes', async () => {
  for (const C of of('React_Cry_Loop')) { const R = await capOf(C);
    for (const s of ['L', 'R']) { const at = R.filter(w => 100 * d3(w[s].hand, w['eye' + s]) < 6).length / R.length; assert.ok(at >= 0.3, `${C.name} ${s}: ${(100 * at).toFixed(0)} % at the eye`);
      for (const w of R) if (100 * d3(w[s].hand, w.mouth) < 6) assert.ok(d3(w[s].hand, w['eye' + s]) < d3(w[s].hand, w.mouth), `${C.name} ${s}: a hand at the chin`); } }
});
// REVIEW-2 FIX (Move_OldWalk elder: the hips pumped 9 cm a step, the knees 28-70 deg, a crouched creep, not frail): over its cycles
// the old walk's hips rise and fall less than the adult's sad walk's (the slowest adult gait in the library), and no knee bends past
// 50 deg (the elder's own made walk, swing included)
test('an old walk is frail, not a crouched creep', async () => {
  const hips = async C => { const R = await capOf(C), z = R.map(w => w.skel.pelvis[2]); return [100 * (Math.max(...z) - Math.min(...z)), Math.max(...R.flatMap(w => [w.L.kneeFlex, w.R.kneeFlex]))]; };
  const [h, k] = await hips(getClip('Move_OldWalk_Fwd_Loop', 'elder')), [ha] = await hips(getClip('Move_SadWalk_Fwd_Loop', 'adult'));
  assert.ok(h < ha, `old walk hips ${h.toFixed(1)} cm, adult sad walk ${ha.toFixed(1)}`); assert.ok(k <= 50, `old walk knee ${k.toFixed(0)} deg`);
});
// the shape layer: a spring that follows, a loop that closes on itself, a body that leans in to a hand at its face
test('perform: a part follows as a spring (lag, overshoot on stop), a loop closes, the adult is not reshaped', () => {
  const x = [...Array(30).fill(0), ...Array(60).fill(1)], y = follow(x, [1.5, 0.45]); assert.ok(y[31] < 0.2 && Math.max(...y) > 1.1 && Math.abs(y.at(-1) - 1) < 0.02);
  const c = follow(Array.from({ length: 61 }, (_, i) => Math.sin(i / 60 * 2 * Math.PI)), [2, 0.5], true); assert.ok(Math.abs(c[0] - c[60]) < 1e-12 && Math.abs(c[1] - c[0]) < 0.2);
  assert.deepEqual(Object.keys(BODIES.adult.perform), ['weight']);
  for (const b of ['heavy', 'thin', 'child', 'elder']) for (const k of ['trunk', 'arms', 'head']) assert.equal(BODIES[b].perform[k].length, 2, `${b} ${k}`);
});
// REVIEW-2 code findings: KNEEL and FLOOR exist as soon as the library loads, before any clip (they existed only after a clip
// that used them was imported; index.js now imports acts/floor.js first); mocap.js's second pass (a walk whose capture does not
// open on a left strike) keeps `closed` and `strike`
test('KNEEL and FLOOR are standard poses from the start; mocapCycle\'s second pass keeps its options', async () => {
  assert.equal(typeof BASES.KNEEL, 'function'); assert.equal(typeof BASES.FLOOR, 'function');
  const idx = fs.readFileSync(new URL('../../styles/stick-man/motion-lib/index.js', import.meta.url), 'utf8');
  assert.ok(idx.indexOf("from './acts/floor.js'") < idx.indexOf("from './body/"), 'index.js registers the floor poses before it imports a clip');
  const { default: SW } = await import('../../styles/stick-man/motion-lib/ref/mixamo/sad_walk.js'), a = mocapCycle(SW, { legM: 0.8, strike: true }), b = mocapCycle(SW, { legM: 0.8, strike: true, closed: true });
  assert.ok(d3(SW.frames[0].Hips, SW.frames.at(-1).Hips) < 1e-3); assert.equal(b.cycle, a.cycle + 1);
});
// Studio 25/11 after REVIEW-3: a body clip that did not pass in motion is gone, and nothing stands in for it
test('a (clip, body) with no own clip throws: the adult clip is never a hidden stand-in', () => {
  for (const [clip, body] of [['Act_Type_Loop', 'thin'], ['Gest_NodYes_Once', 'elder'], ['React_Terrified_Once', 'heavy'], ['Move_SadWalk_Fwd_Loop', 'child']]) assert.throws(() => getClip(clip, body), new RegExp(`has no ${body} version`));
  for (const C of NEW) assert.ok(C.body && getClip(C.clip, C.body) === C, C.name);
});
// REVIEW-3: the reach tool's way round the head had changed what the older tables bake to
test('mocap_reach bakes an older table (near in metres) as it did', async () => {
  const { spawnSync } = await import('node:child_process'), os = await import('node:os'), path = await import('node:path');
  const root = new URL('../../', import.meta.url), out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'reach-')), 'phone_ear.js');
  const r = spawnSync(process.execPath, ['styles/stick-man/tools/run/mocap_reach.mjs', 'Act_Phone_Once', 'R', 'ear', '0.42', '10', out], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const rows = t => JSON.parse(t.match(/rows: (\[.*\])/)[1]), a = rows(fs.readFileSync(out, 'utf8')), b = rows(fs.readFileSync(new URL('styles/stick-man/motion-lib/ref/reach/phone_ear.js', root), 'utf8'));
  assert.equal(a.length, b.length); a.forEach((row, i) => row.forEach((v, j) => assert.ok(Math.abs(v - b[i][j]) < 1e-3, `row ${i} ${j}: ${v} ${b[i][j]}`)));
});
