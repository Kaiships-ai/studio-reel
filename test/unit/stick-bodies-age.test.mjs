// tier: heavy
// The teen and toddler bodies, the elder's stoop and the standing pose of every body (motion-lib/bodies.js, base.js stand),
// measured on the solved figure. Every limit was written with its reason before the bodies were measured (25/11) and none was
// moved after. What no line here sees: whether a body reads as its age. That is for a viewer, in motion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { rigStick, rigClip, clipLife, onBody, bodyFails } from '../../styles/stick-man/tools/gates/motionlib.mjs';
import { BODY_LIFE, lifeAgainst } from '../../styles/stick-man/tools/gates/bodylife.mjs';
import { scanClip, serveRoot } from '../../styles/stick-man/tools/gates/cordjump.mjs';
import { ALL, getClip } from '../../styles/stick-man/motion-lib/index.js';
import { BODIES, bodySpec } from '../../styles/stick-man/motion-lib/bodies.js';
import { stand, gaitLoop } from '../../styles/stick-man/motion-lib/base.js';
import { compileTrack, playActor, flatten } from '../../styles/stick-man/engine/motion.js';
const { makeStick, GUARD, HEAD_H, LIMB, W_M } = await (rigStick(), import('../../styles/stick-man/engine/cast.js'));

const sc = b => BODIES[b].spec.scale ?? 1, hk = b => BODIES[b].spec.headScale ?? 1, lk = b => BODIES[b].spec.legScale ?? 1;
const figure = b => makeStick(bodySpec({ ...GUARD, hair: [] }, b));
// a figure as it is built, nothing posed: its crown (the head's top, no ink) over the floor, its head, its legs (hip joint to ankle)
const size = b => { const S = figure(b); S.pose2({ yaw: 0 }); const w = S.rigWorld(), head = HEAD_H * W_M * sc(b) * hk(b);
  return { height: w.skel.head[2] + head / 2, head, leg: 2 * LIMB.thigh * lk(b) * W_M * sc(b) }; };
// a pose as a film plays it (a key held, the kaiships dose), on that body's figure, 15 frames in
async function played(b, pose, S = figure(b)) {
  const { toPose } = await rigStick(b), tr = compileTrack([{ f: 0, ...pose }, { f: 30, ...pose }], {}, { pos: pose.pos, yaw: pose.yaw }, 'kaiships');
  S.pose2(toPose(playActor(tr, 0, 20)[15], sc(b))); return S.rigWorld();
}
// world points in the figure's own frame for a heading (yaw 0 faces -y): [out to its left-to-right, ahead]
const own = yaw => { const a = yaw * Math.PI / 180, R = [Math.cos(a), Math.sin(a)], F = [Math.sin(a), -Math.cos(a)]; return p => [p[0] * R[0] + p[1] * R[1], p[0] * F[0] + p[1] * F[1]]; };

// the spec's heights (Studio 25/11). 1 % of the adult's 770 px is 8 px, about the 2 ink lines a viewer can see (bodylife.mjs READ_PX)
const RATIO_TOL = 0.01;
test('heights: the teen is 85 % of the adult, the toddler 70 % of the child', () => {
  const r = (a, b) => size(a).height / size(b).height;
  assert.ok(Math.abs(r('teen', 'adult') - 0.85) <= RATIO_TOL, `teen ${r('teen', 'adult')}`);
  assert.ok(Math.abs(r('toddler', 'child') - 0.70) <= RATIO_TOL, `toddler ${r('toddler', 'child')}`);
});
// 15 %: a difference that is remembered across a cut (bodylife.mjs arc)
test('proportions: stubby legs and a big head on the toddler, a teen a bit thinner than the adult', () => {
  const t = size('toddler'), c = size('child'), share = (x, n) => x[n] / x.height;
  assert.ok(share(t, 'leg') <= 0.85 * share(c, 'leg'), `leg / height ${share(t, 'leg')} vs child ${share(c, 'leg')}`);
  assert.ok(share(t, 'head') >= 1.15 * share(c, 'head'), `head / height ${share(t, 'head')} vs child ${share(c, 'head')}`);
  // a bit thinner: told from the adult's width (8 %), nowhere near the thin body (0.6)
  const g = BODIES.teen.spec.girth; assert.ok(g <= 0.92 && g >= 0.8, `teen girth ${g}`);
  assert.ok((BODIES.toddler.spec.girth ?? 1) >= 1, 'a toddler is no thinner than its size');
});
// Standing: two legs, not one thick one and not an X. The daylight between the two leg lines is at least two lines wide at the
// knee, the ankle and the toe (a line is the drawn leg's own width; at that gap the two read as two at phone size, 10 px on the
// smallest body), left stays left of right, and the feet are under the hips or wider (>= 0.9 of the hip joints' distance: the
// taste review's "feet under hips"), the two side by side (ahead of one another by no more than half a line)
const LINE = 0.046;
test('stand(): feet and knees apart, side by side, on every body, whichever way it faces and wherever it stands', async () => {
  for (const b of Object.keys(BODIES)) for (const [yaw, at] of [[90, [0, 0]], [0, [1.2, 0]], [-55, [-2, 3]], [180, [0.4, -1]]]) {
    const w = await played(b, stand(b, at[0], { y: at[1], yaw })), f = own(yaw), line = LINE * W_M * sc(b), d = j => { const L = f(w.L[j]), R = f(w.R[j]); return [R[0] - L[0], R[1] - L[1]]; };
    for (const j of ['knee', 'ankle', 'toe']) assert.ok(d(j)[0] >= 3 * line, `${b} facing ${yaw}: ${j}s ${(100 * d(j)[0]).toFixed(1)} cm apart, want ${(300 * line).toFixed(1)}`);
    assert.ok(d('ankle')[0] >= 0.9 * d('hip')[0], `${b} facing ${yaw}: ankles ${d('ankle')} hips ${d('hip')}`);
    assert.ok(Math.abs(d('ankle')[1]) <= 0.5 * line, `${b} facing ${yaw}: one foot ${(100 * d('ankle')[1]).toFixed(1)} cm ahead`);
    const mid = [0, 1].map(i => (w.L.ankle[i] + w.R.ankle[i]) / 2); assert.ok(Math.hypot(mid[0] - at[0], mid[1] - at[1]) < 0.02 * sc(b), `${b}: stands at ${mid}, asked ${at}`);
  }
});
test('stand(): the old call is unchanged; a heading put on top of it is the fault the line-up showed', async () => {
  for (const b of Object.keys(BODIES)) assert.deepEqual(stand(b, 0.3, { yaw: 90, y: 0 }), stand(b, 0.3));
  // the planted prints stay where a figure facing +x has them: seen from the front the two ankles are in one line, one behind the other
  for (const b of Object.keys(BODIES)) { const w = await played(b, { ...stand(b, 0), yaw: 0 }); assert.ok(Math.abs(w.R.ankle[0] - w.L.ankle[0]) < 0.01 && Math.abs(w.R.ankle[1] - w.L.ankle[1]) > 0.05, b); }
});
// Elder: a stoop a viewer can see from the side: the trunk 18 deg or more forward (the posture's 24 less the breath's 2 x 1.3 each
// way, and a margin), the head 8 cm or more ahead of the hips (34 px, five ink lines)
const STOOP_DEG = 18, STOOP_CM = 8;
test('elder: stooped in stand() and on every frame of Idle_Breath', async () => {
  const rows = []; { const w = await played('elder', stand('elder', 0, { yaw: 0 })); rows.push([w.torsoLean, own(0)(w.skel.head)[1] - own(0)(w.skel.pelvis)[1]]); }
  await rigClip(getClip('Idle_Breath_Loop', 'elder'), 'elder', { each: (f, S, w) => rows.push([w.torsoLean, own(90)(w.skel.head)[1] - own(90)(w.skel.pelvis)[1]]) });
  for (const [i, [lean, ahead]] of rows.entries()) { assert.ok(lean >= STOOP_DEG, `row ${i}: trunk ${lean} deg`); assert.ok(100 * ahead >= STOOP_CM, `row ${i}: head ${(100 * ahead).toFixed(1)} cm ahead`); }
});
test('teen: a little slouch, well under the elder\'s stoop', async () => {
  const lean = (await played('teen', stand('teen', 0))).torsoLean; assert.ok(lean >= 5 && lean <= STOOP_DEG - 5, `${lean} deg`);
});
// a figure nobody posed with stand() (S.pose2 with nothing named, the beat-posed S.pose) stood upright on every body. Opt-in:
// bodySpec(spec, body, { posture: true }); without it nothing changes
test('posture: a spec that opts in stands in its body\'s posture where a pose names no channel; without it nothing changes', () => {
  const at = (b, o, Q, fn = 'pose2') => { const S = makeStick(bodySpec({ ...GUARD, hair: [] }, b, o)); S[fn]({ yaw: 0, ...Q }); return S.rigWorld(); };
  assert.deepEqual(bodySpec(GUARD, 'elder'), bodySpec(GUARD, 'elder', {})); assert.ok(!('posture' in bodySpec(GUARD, 'elder')));
  for (const b of Object.keys(BODIES)) assert.equal(at(b, {}, {}).torsoLean, 0, b);
  const e = at('elder', { posture: true }, {}); assert.ok(e.torsoLean >= STOOP_DEG && 100 * (own(0)(e.skel.head)[1] - own(0)(e.skel.pelvis)[1]) >= STOOP_CM, JSON.stringify(e.skel));
  assert.equal(at('elder', { posture: true }, { spine: { bend: 3 } }).torsoLean, 3, 'a named channel is the pose\'s own');
  const beat = o => at('elder', o, { pitch: 2 }, 'pose').torsoLean; assert.equal(beat({}), 2); assert.ok(beat({ posture: true }) >= STOOP_DEG + 2);
  const t = at('toddler', { posture: true }, {}), f = own(0); assert.ok(f(t.R.ankle)[0] - f(t.L.ankle)[0] > 1.2 * (f(at('toddler', {}, {}).R.ankle)[0] - f(at('toddler', {}, {}).L.ankle)[0]), 'its own stance');
});

// ------------------------------------------------------------------ the walks and runs
const NEW = ALL.filter(C => C.body === 'teen' || C.body === 'toddler');
const rows = new Map(), walkRows = async b => { if (!rows.has(b)) { const L = []; await rigClip(getClip('Move_Walk_Fwd_Loop', b), b, { each: (f, S, w) => { const h = S.parts.head.matrixWorld.elements, l = Math.hypot(h[4], h[5], h[6]);
  L.push({ ...w, roll: Math.asin(Math.max(-1, Math.min(1, -h[6] / l))) * 180 / Math.PI, turn: Math.atan2(h[8], h[10]) * 180 / Math.PI - 90 }); } }); rows.set(b, L); } return rows.get(b); };
const pp = v => Math.max(...v) - Math.min(...v);
// wide: a one-year-old's feet are further apart than its hips, a grown walker's closer; 1.15: told apart across a cut
// arms: no swing at that age, held out: a hand half as far again out from its shoulder as a hanging one (sin 12 deg = 0.2 of the
// arm), its fore-aft travel at most half the adult's for its arm
// head: the face rolls at most 6 deg (the ends of a 120 px face move 6 px, READ_PX) and turns at most 10 deg (a quarter of FACE_YAW)
// waddle: the upper body goes from side to side 1.5 times as far for its leg as the child's
test('toddler walk: wide feet, arms out, a waddle, the head steady enough to read', async () => {
  const T = await walkRows('toddler'), f = own(90), leg = b => 2 * LIMB.thigh * lk(b) * W_M * sc(b), arm = b => 1.025 * W_M * sc(b), o = own(90);
  const wide = async b => { const L = await walkRows(b); return L.reduce((s, w) => s + (o(w.R.ankle)[0] - o(w.L.ankle)[0]) / (o(w.R.hip)[0] - o(w.L.hip)[0]) / L.length, 0); };
  const w = await wide('toddler'); assert.ok(w >= 1.15, `ankles ${w.toFixed(2)} of the hips apart`);
  assert.ok(w >= 1.15 * await wide('child'), `child ${await wide('child')}`);
  const body = T.slice(15, -15);
  for (const [i, r] of body.entries()) for (const [s, sg] of [['L', -1], ['R', 1]]) { const out = sg * (f(r[s].hand)[0] - f(r[s].shoulder)[0]) / arm('toddler'); assert.ok(out >= 0.3, `frame ${i + 15} ${s}: hand ${out.toFixed(2)} of the arm out`); }
  const swing = async b => { const L = (await walkRows(b)).slice(15, -15); return Math.max(...['L', 'R'].map(s => pp(L.map(r => f(r[s].hand)[1] - f(r.skel.neck)[1])) / arm(b))); };
  assert.ok(await swing('toddler') <= 0.5 * await swing('adult'), `swing ${await swing('toddler')} adult ${await swing('adult')}`);
  const sway = async b => pp((await walkRows(b)).slice(15, -15).map(r => f(r.skel.neck)[0])) / leg(b);
  assert.ok(await sway('toddler') >= 1.5 * await sway('child'), `sway ${await sway('toddler')} child ${await sway('child')}`);
  for (const [i, r] of body.entries()) { assert.ok(Math.abs(r.roll) <= 6, `frame ${i + 15}: face rolls ${r.roll.toFixed(1)}`); assert.ok(Math.abs(r.turn) <= 10, `frame ${i + 15}: face turns ${r.turn.toFixed(1)}`); }
});
test('the gate holds both bodies to their own lines, and every clip they have passes it', async () => {
  assert.deepEqual(BODY_LIFE.teen.stride, [1.05, Infinity]); assert.deepEqual(BODY_LIFE.teen.time, [1.08, Infinity]);
  assert.deepEqual(BODY_LIFE.toddler.cadence, [1.15, Infinity]); assert.deepEqual(BODY_LIFE.toddler.stride, [0, 0.80]);
  assert.deepEqual(NEW.map(C => C.name), ['Teen_Idle_Breath_Loop', 'Toddler_Idle_Breath_Loop', 'Toddler_Move_Walk_Fwd_Loop']);
  // the teen's made walk and run at its own numbers fail it, so they are not in the library, and nothing stands in for them
  const A = getClip('Move_Walk_Fwd_Loop', 'adult'), W = { name: 'Teen_Move_Walk_Fwd_Loop', clip: 'Move_Walk_Fwd_Loop', body: 'teen', loop: true, needs: { props: [], hands: null }, ...gaitLoop({ body: 'teen', kind: 'walk' }) };
  assert.deepEqual(lifeAgainst('teen', await clipLife(A), await clipLife(W), { on: await onBody(A, 'teen') }).filter(r => !r.ok).map(r => r.n), ['stride', 'shape']);
  for (const c of ['Move_Walk_Fwd_Loop', 'Move_Run_Fwd_Loop']) assert.throws(() => getClip(c, 'teen'), /has no teen version/);
  // the toddler's made run passed this gate and a reviewer who watched it move (26/11) read it as a walk: a pass here is not a look
  assert.throws(() => getClip('Move_Run_Fwd_Loop', 'toddler'), /has no toddler version/);
  for (const C of NEW) assert.deepEqual(await bodyFails(C), [], C.name);
  // none is the adult's clip under another name
  for (const C of NEW.filter(c => c.advance)) { const A = getClip(C.clip, 'adult'), s = lifeAgainst(C.body, await clipLife(A), await clipLife(C), { on: await onBody(A, C.body) }).find(r => r.n === 'shape'); assert.ok(s.ok, `${C.name} ${JSON.stringify(s)}`); }
});

// a short leg lowers the hip by what cast.js lowers it (base.js DROP), so a made gait shows the stance knee it was keyed: with the old
// DROP the toddler walked with its knees at 85-90 deg. 20 deg over the deepest keyed stance knee: the dose and the swing's start
test('toddler walk: the standing leg shows the knee it was given', async () => {
  const L = (await walkRows('toddler')), W = BODIES.toddler.walk, stance = L.slice(16, 50).flatMap(w => ['L', 'R'].filter(s => w[s].ankle[2] < 0.012).map(s => w[s].kneeFlex));
  assert.ok(stance.length > 20 && Math.max(...stance) <= Math.max(...W.knees) + 20, `${Math.max(...stance)} of ${W.knees}`);
});

// ------------------------------------------------------------------ the hoodie
// the hood's own numbers (kit/cast/hoodie.js stats, ?hoodstats) in stand() and over the idle: the hood stretches under 15 % (hoodie.js's own
// limit, p99); it, its cords and its opening stay as they sit on the adult, 2 mm (a pixel at 430 px a metre) and 2 deg at most; as much of the arms shows as on the adult, a tenth less at most
async function hood(body, clip = null) {
  serveRoot(); const was = [globalThis.location, console.error], out = []; let arms = 0;
  console.error = s => { const m = /^HOODIE (.*)$/.exec(s); if (m) out.push(JSON.parse(m[1])); };
  try { Object.defineProperty(globalThis, 'location', { value: { search: '?hoodstats' }, configurable: true });
    const { hoodie } = await import('../../styles/stick-man/kit/cast/hoodie.js');
    if (clip) await scanClip(getClip(clip, body), body);
    else { const { toPose } = await rigStick(body), S = figure(body); hoodie(S); const s = toPose(flatten(stand(body, 0, { yaw: 0 })), sc(body)); for (let t = 0; t < 12; t++) { S.pose2(s); S.face({ t }); } arms = armsOut(S); }
  } finally { console.error = was[1]; Object.defineProperty(globalThis, 'location', { value: was[0], configurable: true }); }
  const m = k => Math.max(...out.map(r => r[k])); assert.ok(out.length, 'no hood numbers'); return { pen: m('pen'), p99: m('p99'), rim: m('rimOff'), cord: m('cordPen'), arms };
}
// the share of the two arms outside the jersey (its mesh's widest at that height, 2 cm bands, 0.8 as deep): an arm that hangs inside
// the garment is a sleeve with no arm
function armsOut(S) {
  const g = S.root.children.find(c => c.name === 'hoodie').children[0].geometry.attributes.position, R = new Map(), band = y => Math.round(y / 0.02);
  for (let i = 0; i < g.count; i++) { const b = band(g.getY(i)), r = Math.hypot(g.getX(i), g.getZ(i) / 0.8); R.set(b, Math.max(R.get(b) || 0, r)); }
  const pts = ['L', 'R'].flatMap(s => { const r = S.rig[s]; return [[r.shoulder, r.elbow], [r.elbow, r.hand]].flatMap(([a, b]) => Array.from({ length: 20 }, (_, i) => a.clone().lerp(b, (i + 0.5) / 20).multiplyScalar(W_M))); });
  return pts.filter(p => Math.hypot(p.x, p.z / 0.8) > (R.get(band(p.y)) || 0)).length / pts.length;
}
const fits = (h, a) => ({ stretch: h.p99 < 0.15, hood: h.pen <= a.pen + 0.002, cords: h.cord <= a.cord + 0.002, opening: h.rim <= a.rim + 2, arms: h.arms >= 0.9 * a.arms });
test('the kit hoodie fits the teen, standing and breathing', async () => {
  const a = await hood('adult'), t = await hood('teen'); assert.deepEqual(fits(t, a), { stretch: true, hood: true, cords: true, opening: true, arms: true }, JSON.stringify({ a, t }));
  const i = await hood('teen', 'Idle_Breath_Loop'); assert.ok(i.p99 < 0.15 && i.pen <= a.pen + 0.002, JSON.stringify(i));
});

// the toddler's head is half as big again for its body: the hood takes the head's size at its top and the chest's at its hem, and is
// stretched past its own limit in between. Not offered on the toddler (hood down, 'hoodie:grey:down', was not measured)
test('the kit hoodie, hood up, does not fit the toddler: the hood stretches past its 15 %', async () => {
  const t = await hood('toddler'); assert.ok(!(t.p99 < 0.15), JSON.stringify(t));
});

// ------------------------------------------------------------------ the clips on main
// every clip main had at 0704de3e, its keys hashed there (numbers to 1e-6): this work changes none. A clip changed on purpose changes its line
const round = (k, v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 + 0 : typeof v === 'function' ? undefined : v);
const hash = C => crypto.createHash('sha256').update(JSON.stringify({ name: C.name, frames: C.frames, base: C.base, end: C.end, advance: C.advance, keys: C.keys, intro: C.intro, outro: C.outro }, round)).digest('hex').slice(0, 8);
const MAIN = {
  Adult_Move_Run_Fwd_Loop: 'ed09f263', Adult_Move_Walk_Fwd_Loop: 'c42b6386', Adult_Move_Sprint_Fwd_Loop: '312d97b4', Adult_Act_Jump_Once: '12ca8a60',
  Adult_Idle_Stand_Loop: 'f60a6e0d', Adult_Idle_LookAround_Loop: '0cc17652', Adult_Gest_Talk_Loop: 'a013d516', Adult_Gest_Wave_Loop: 'd59b019b',
  Adult_Trans_SitDown_Once: 'b354499f', Adult_Idle_Sit_Loop: '9924a775', Adult_Trans_StandUp_Once: '918718b9', Adult_Gest_PointSeated_Loop: 'aa23e471',
  Adult_Act_PickUp_Once: 'be9bd7aa', Adult_Move_TurnLeft_Once: '8449e152', Adult_Trans_LieDown_Once: '76ab4baa', Adult_Idle_Sleep_Loop: '8ed89e6b',
  Adult_Trans_GetUp_Once: '69025a28', Adult_Trans_JumpWindow_Once: '33abd098', Adult_Act_Phone_Once: '140a3a98',
  Adult_Move_CarryBag_Walk_Loop: 'a87d54e3', Adult_Move_PushHeavy_Loop: 'f9ca4745', Adult_Idle_CarryBag_Loop: '7678813b',
  Adult_Act_PutDown_Once: '2e5c3f5e', Adult_React_Startle_Once: 'dbb8e0c2', Adult_Gest_LookBack_Once: '645bba38',
  Adult_Act_PistolShoot_Once: '0c33bb6a', Adult_Act_TorchReady_Loop: 'f2155a5d', Adult_Act_Drive_Loop: '2cdee7f5', Adult_Act_HandOver_Once: '8ee2cca0',
  Adult_Act_Consume_Once: '3a044ee1', Adult_Gest_PhoneCall_Loop: '0d56e50c', Adult_Gest_LookBackCarry_Once: 'f9955a27',
  Heavy_Act_TorchReady_Loop: 'a1adc292', Thin_Act_TorchReady_Loop: 'edb2dd58', Heavy_Move_WalkFlashlight_Loop: 'a77cf960',
  Thin_Move_WalkFlashlight_Loop: 'c9e249b6', Child_Idle_Breath_Loop: '9fdb6193', Child_Move_Run_Fwd_Loop: '6cc14885',
  Child_Move_Walk_Fwd_Loop: 'cfd1dc9c', Elder_Idle_Breath_Loop: '3d6ea722', Elder_Move_Run_Fwd_Loop: 'cd6c3ee9', Elder_Move_Walk_Fwd_Loop: '399c2f03',
  Heavy_Idle_Breath_Loop: 'afc29552', Heavy_Move_Run_Fwd_Loop: '86a280a2', Heavy_Move_Walk_Fwd_Loop: 'a5eb1d29', Thin_Idle_Breath_Loop: '60db9959',
  Thin_Move_Run_Fwd_Loop: '7b3bb17f', Thin_Move_Walk_Fwd_Loop: '1e06eb4c', Gest_LookUp_Once: '96b9009f', Move_WalkFlashlight_Loop: 'f2d36fa6',
  Act_DropInTrunk_Once: '7a4aaac6', Act_PushBagOutWindow_Once: '71d6c7e2', };
test('the 52 clips of main are the same keys', () => {
  assert.equal(Object.keys(MAIN).length, 52);
  assert.deepEqual(Object.fromEntries(Object.keys(MAIN).map(n => [n, hash(ALL.find(C => C.name === n))])), MAIN);
});
