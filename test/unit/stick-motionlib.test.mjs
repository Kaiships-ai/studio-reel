// The stick-man motion library (styles/stick-man/motion-lib) and the two rig rules it leans on: a hand on a target stays
// there or says how far it is off (rig K4), and a carried prop is a solid with mass (rig K5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import fs from 'node:fs';
import { checkAll, checkClip, NAME_RE, clipFiles, catalogue, CATALOGUE, OBJECT_ACT } from '../../styles/stick-man/tools/motionlib.mjs';
import { ALL, getClip, placeClip, expandClips } from '../../styles/stick-man/motion-lib/index.js';
import { BODIES } from '../../styles/stick-man/motion-lib/bodies.js';
import { compileTrack, playActor, toPose, STYLE_PRESETS } from '../../styles/stick-man/engine/motion.js';
import { DOSE_E, markColliders } from '../../styles/stick-man/motion-lib/base.js';
import { ellipsoid, solveArm, armPenetration, propPush, centreOfMass } from '../../styles/stick-man/engine/body.js';

test('the library has 52 clips on 5 bodies, and every one passes motionlib.mjs (naming, seam, base, joint gate, feet)', async () => {
  assert.equal(ALL.length, 52);
  assert.equal(clipFiles().length, 52);
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
import { rigClip, rigStick, GRIP_CM, PROP_CM, physicsFails, BAL_CM, propExcess, PROP_SLIP_CM } from '../../styles/stick-man/tools/motionlib.mjs';
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
  assert.equal(fs.readFileSync(CATALOGUE, 'utf8'), catalogue(), 'run: node styles/stick-man/tools/motionlib.mjs --catalogue');
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

// ------------------------------------------------------------------ PR D: the solved-joint gate and the faults it found
import { jointExcess, jointFails, JOINT_MAX } from '../../styles/stick-man/tools/motionlib.mjs';

test('joint gate: a solver jump fails it, a capture turning as fast as it does passes, physics on and off', async () => {
  // ep01 SH245: the phone call at a 1.12 m counter right beside the arm (the render: hand 18.65 cm off, elbow 97 deg/f)
  const C = getClip('Gest_PhoneCall_Loop'), counter = { name: 'counter', lo: [-0.5, 0.22, 0], hi: [0.5, 0.77, 1.12] };
  const on = await rigClip(C, undefined, { obstacles: [counter] }), off = await rigClip(C, undefined, { phys: false, obstacles: [counter] });
  assert.ok(off.prop > 15 && off.propIn === 'set', `the phone is in the counter, named so: ${off.prop} cm in ${off.propIn}`);
  assert.ok(on.grip > 15, `and with physics on the hand is off its grip: ${on.grip} cm`);
  assert.match(jointFails(on, off).join(), /solved joint: .* over the motion as authored/);
  // a counter half a metre off adds nothing to the clip on its own (JOINT_KNOWN: its 0.8 deg/f blend into the reach)
  const ex = async obstacles => { const a = await rigClip(C, undefined, { obstacles }), b = await rigClip(C, undefined, { phys: false, obstacles });
    return [jointExcess(a, b).excess, jointExcess(b, b).excess, a.grip, b.prop]; };
  assert.deepEqual(await ex([{ ...counter, lo: [-0.5, 0.5, 0], hi: [0.5, 1.05, 1.12] }]), await ex([]));
  // a capture that turns a joint past JOINT_MAX itself (talking hands): the motion as authored, allowed
  const S = getClip('Gest_Talk_Loop'), s1 = await rigClip(S), s0 = await rigClip(S, undefined, { phys: false });
  assert.ok(s1.joint > JOINT_MAX && jointExcess(s1, s0).over.length === 0, `talk ${s1.joint} deg/f at ${s1.jointAt}`);
});

test('joint gate: the reference is the motion as authored (the raw capture), so a retarget jump fails it', async () => {
  // Move_CarryBag_Walk_Loop frame 231: the trailing knee folded 33.4 deg/f as the foot lifted (the capture: 9.8); its
  // heel now peels as the captured knee needs (base.js peelFor)
  const C = getClip('Move_CarryBag_Walk_Loop'), g = await rigClip(C), g0 = await rigClip(C, undefined, { phys: false });
  assert.ok(g.raw.filter(Boolean).length > 200, 'the captured frames carry the capture\'s own joints');
  assert.deepEqual([...jointFails(g, g0), ...jointFails(g0, g0, 'physics off')], []);
  // the same clip with one captured foot pulled 15 cm toward the hips for one frame (a retarget fault): the gate sees it
  const keep = C.keys, i = keep.findIndex(k => k.f > 20 && k.legL.footW[2] > 0.05);
  C.keys = keep.map((k, j) => (j === i ? { ...k, legL: { ...k.legL, footW: [k.legL.footW[0], k.legL.footW[1], k.legL.footW[2] + 0.15] } } : k));
  try { const b = await rigClip(C, undefined, { phys: false }); assert.match(jointFails(b, b).join(), /over the motion as authored/); } finally { C.keys = keep; }
  // PistolShoot's baked reach keeps the forearm within the capture's speed (main: 26.9 deg/f at frame 70, the capture 19.1)
  const P = getClip('Act_PistolShoot_Once'), p1 = await rigClip(P), p0 = await rigClip(P, undefined, { phys: false });
  assert.deepEqual([...jointFails(p1, p0), ...jointFails(p0, p0)], []);
  assert.ok(p1.grip <= GRIP_CM && p1.prop <= PROP_CM && p0.prop <= PROP_CM, 'the gun stays out of the head, the grip on it');
});

test('joint gate: JOINT_KNOWN only shrinks', async () => {
  const { JOINT_KNOWN } = await import('../../styles/stick-man/tools/motionlib.mjs');
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
  const { BUILD } = await import('../../styles/stick-man/lib/cast/handprops.js'), { bagMesh, sizedBag } = await import('../../styles/stick-man/motion-lib/props.js');
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
  const { BUILD } = await import('../../styles/stick-man/lib/cast/handprops.js');
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
