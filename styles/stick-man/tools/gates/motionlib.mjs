// The motion library's checker and proof renders (styles/stick-man/motion-lib, docs/MOTION-LIB.md).
//   node styles/stick-man/tools/gates/motionlib.mjs                       check every clip (exit 1 on a FAIL):
//        naming, the index lists every file, the record, loop seam, starts / ends on its standard pose, the joint gate
//        (<= 25 deg a frame after the 'kaiships' dose), planted feet that never slide, a physics line (flights, g), and the
//        clip through the real rig headless (cast.js): a gripping hand <= 2 cm off its target, a held prop <= 1 cm in the body,
//        no prop inside the set, the solved joints turning no more than 25 deg a frame beyond the motion's own (jointExcess),
//        feet on the floor under a body the floor carries, and each body told from the adult it shares a clip with: slower or
//        quicker, smaller or bigger, by the amounts in bodylife.mjs
//   node styles/stick-man/tools/gates/motionlib.mjs --only <clip> [--check '<json>']   one clip and its fitChecks / propChecks,
//        plus a film's own key as JSON: { swap, pos, yaw, body, fit fields, collide: [{ name, lo, hi }] } (a swap value is a
//        prop kind or a prop's contract { mode, grip, size }: props.js heldProp), so a film checks its prop and staging first
//   node styles/stick-man/tools/gates/motionlib.mjs --sheet <group> --out <dir>    a contact sheet of a group (Idle, Move, Act,
//        Trans, React, Gest): every clip of it on its bodies, 6 frames each, rendered through motion-lib/proof (540x960)
//   node styles/stick-man/tools/gates/motionlib.mjs --proof <dir> [--only <clip>]   every clip as mp4, physics on and off, the
//        shot.mjs --report numbers of each, and one sheet per group (one render process at a time)
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { run } from '../../../../kit/env.mjs';
import { ALL, placeClip, fitClip, propSize } from '#motion-lib/index.js';
import { BASES, turned, markColliders } from '#motion-lib/base.js';
import { BODIES } from '#motion-lib/bodies.js';
import { compileTrack, playActor, flatten } from '#engine/motion.js';
import { sizedBag, propSwap } from '#motion-lib/props.js';
import { jointSteps, JOINT_STEP_MAX } from './jointstep.mjs';
import { lifeOf, lifeFails, BODY_LIFE, NEAREST, stillSpans, faceHidden, STILL_F, STILL_IN, STILL_CM } from './bodylife.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../../..'), LIB = path.join(ROOT, 'styles/stick-man/motion-lib');
export const JOINT_MAX = 25, SLIDE_MM = 1, ARM_W = 1.025;
// a clip name that is an act on a thing: it must hold that thing (a prop)
// the root over the frames the library makes (the blends into and out of a capture, first and closing steps): a body
// moves its root no faster than this (Idle_Sleep's blend from LIE to the capture swept the root 1.15 m in 14 frames)
export const ROOT_CM = 4;
export const OBJECT_ACT = /Carry|Push|PutDown|PickUp|HandOver|Consume|Phone|Pistol|Torch|Flashlight|Drop/;
const GROUPS = ['Idle', 'Move', 'Act', 'Trans', 'React', 'Gest'], SHARED = { interact: ['Act'], transition: ['Trans'], react: ['React'], extra: GROUPS };
const PREFIX = { adult: 'Adult', heavy: 'Heavy', thin: 'Thin', child: 'Child', elder: 'Elder' };
export const NAME_RE = /^((Adult|Heavy|Thin|Child|Elder)_)?(Idle|Move|Act|Trans|React|Gest)_[A-Z][A-Za-z]*(_[A-Z][A-Za-z]*)*_(Loop|Once)_v\d\d\.js$/;
const ANGLE = /^(yaw|spine\.(bend|side|twist)|neck\.(nod|tilt|turn)|pelvis\.(pitch|roll|yaw)|arm[LR]\.(raise|swing|elbow|roll)|leg[LR]\.pitch)$/;

export function clipFiles() {
  const out = [];
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js')) out.push(path.relative(LIB, p)); } };
  for (const d of ['body', 'shared']) walk(path.join(LIB, d));
  return out.sort();
}
// every channel of every key, carried forward the way compileTrack does (a key names only what changes)
function full(keys) { let cur = {}; return keys.map(k => { cur = { ...cur, ...flatten(Object.fromEntries(Object.entries(k).filter(([n]) => !['f', 'ease', 'cycle', 'hold', 'antic', 't'].includes(n)))) }; return { ...cur }; }); }
// a pose made comparable across places: feet relative to the root, the root and the heading dropped, ik targets only
// when they hold the hand (ikw > 0); x_ channels only those the standard pose names
function body(m, ref) {
  const o = {};
  for (const [n, v] of Object.entries(m)) {
    if (/^pos\.|^yaw$/.test(n) || /\.(ik|pole)\.\d$/.test(n)) continue;
    if (n.startsWith('x_') && !(ref && n in ref)) continue;
    const fw = /^leg[LR]\.footW\.([01])$/.exec(n);
    o[n] = fw ? v - (m['pos.' + fw[1]] || 0) : v;
  }
  return o;
}
function diff(a, b) {
  let worst = null;
  for (const n of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const d = Math.abs((a[n] || 0) - (b[n] || 0)), tol = ANGLE.test(n) || /ikw|fall/.test(n) ? 0.5 : 0.005;
    if (d > tol && (!worst || d / tol > worst.r)) worst = { n, d: +d.toFixed(3), r: d / tol };
  }
  return worst;
}
// a fitted clip (index.js fitClip) is played through its clip key's fit
// (a fit that names a bag's size plays a kit bag of that size: motion-lib/props.js sizedBag, swapped in as a film's own is),
// and a keyed one (keyed below) through the rest of a film's key: its swap, pos and yaw
const fitOf = C => {
  const fit = C.fitted && !ALL.includes(C) ? { fit: C.fitted, ...(C.fitted.bag ? { swap: { bag: sizedBag(C.fitted.bag) } } : {}) } : {};
  return C.keyed ? { ...fit, ...C.keyed, swap: { ...fit.swap, ...C.keyed.swap } } : fit;
};
// A clip as a film's key plays it, for the gate: { swap?, pos?, yaw?, ...fit } (a swap value is a prop kind or a prop's
// contract, props.js heldProp). The kit's own clip plays only the kit's props in the open; a film's swapped prop or its
// placing beside a set piece is checked only this way (Hot Money ep01 SH245: the kit said PASS, the film's hand was 40 cm off).
export function keyed(C, { swap, pos, yaw, body, collide, ...fit } = {}) {
  const F = Object.keys(fit).length ? fitClip(C, fit) : C;
  return swap || pos || yaw != null ? { ...F, keyed: { ...(swap ? { swap: propSwap(swap) } : {}), ...(pos ? { pos } : {}), ...(yaw != null ? { yaw } : {}) } } : F;
}
// one clip: the checks, plus the offline physics numbers
export function checkClip(C, file) {
  const fails = [], info = {}, base = path.basename(file, '.js'), dir = file.split(path.sep);
  // naming: the file name, the record's name and lookup name, the folder it lives in
  if (!NAME_RE.test(path.basename(file))) fails.push(`name: ${path.basename(file)} is not <Body>_<Group>_<Action>_<Loop|Once>_v01.js`);
  if (C.name !== base.replace(/_v\d+$/, '')) fails.push(`name: record name ${C.name} != file ${base}`);
  const isBody = dir[0] === 'body', body0 = isBody ? dir[1] : null;
  if (isBody && (C.body !== body0 || !base.startsWith(PREFIX[body0] + '_'))) fails.push(`name: ${file} must be ${PREFIX[body0]}_... with body '${body0}'`);
  if (!isBody && /^(Adult|Heavy|Thin|Child|Elder)_/.test(base)) fails.push('name: a shared clip carries no body prefix');
  if (!isBody && !(SHARED[dir[1]] || []).includes(C.group)) fails.push(`name: group ${C.group} does not belong in shared/${dir[1]}`);
  if (C.clip !== C.name.replace(/^(Adult|Heavy|Thin|Child|Elder)_/, '')) fails.push(`record: clip ${C.clip} != the name without its body`);
  if (!base.includes(`_${C.group}_`) && !base.startsWith(`${C.group}_`)) fails.push(`record: group ${C.group} not in the name`);
  if (C.loop !== /_Loop_v/.test(base)) fails.push('record: loop does not match _Loop / _Once');
  for (const k of ['name', 'clip', 'group', 'frames', 'base', 'style', 'needs', 'keys']) if (C[k] == null) fails.push(`record: no ${k}`);
  if (C.style !== 'kaiships') fails.push(`record: style ${C.style} (the kit's dose is 'kaiships')`);
  if (!BASES[C.base] || (C.end && !BASES[C.end])) fails.push(`record: base ${C.base} / end ${C.end} is not a standard pose (${Object.keys(BASES)})`);
  if (C.keys[0].f !== 0 || C.keys[C.keys.length - 1].f !== C.frames) fails.push(`record: keys must run 0..frames (${C.keys[0].f}..${C.keys[C.keys.length - 1].f} vs ${C.frames})`);
  // props: every prop a key holds (x_hp<L|R|B|H>_<kind>) is declared (needs.props) on a declared hand (needs.hands), every
  // declared prop is held, and a clip whose name is an act on a thing (OBJECT_ACT) declares one: the ep01 run found
  // CarryBag, PushHeavy, PutDown, PhoneCall, HandOver, Consume, PistolShoot and TorchReady holding nothing, and a film's
  // bag sank into the body while this check said 0 failing
  const held = new Map();
  for (const k of [...C.keys, ...(C.intro || []), ...(C.outro || [])]) for (const [n, v] of Object.entries(k)) { const m = /^x_hp([LRBH])_(\w+)$/.exec(n); if (m && v > 0.5) held.set(m[2], new Set([...(held.get(m[2]) || []), m[1]])); }
  const props = C.needs?.props || [], hands = { L: ['L'], R: ['R'], both: ['B', 'L', 'R'], B: ['B', 'L', 'R'] }[C.needs?.hands] || [];
  for (const [kind, sides] of held) {
    if (!props.includes(kind)) fails.push(`props: the keys hold ${kind} but needs.props does not name it`);
    for (const sd of sides) if (sd !== 'H' && !hands.includes(sd)) fails.push(`props: ${kind} is held in hand ${sd} but needs.hands is ${C.needs?.hands}`);
  }
  for (const kind of props) if (!held.has(kind)) fails.push(`props: needs.props names ${kind} but no key holds it`);
  if (OBJECT_ACT.test(C.clip) && !props.length) fails.push(`props: ${C.clip} acts on a thing but declares no prop (needs.props)`);
  const bodies = C.body ? [C.body] : ['adult'], B = bodies[0];
  // loop seam: the last key is the first, moved on by the loop's advance
  const F = full(C.keys);
  if (C.loop) {
    const a = { ...F[0] }, b = { ...F[F.length - 1] };
    for (const n of Object.keys(b)) if (C.advance && (n === 'pos.0' || /^leg[LR]\.footW\.0$/.test(n))) b[n] -= C.advance;
    // an ik target with no weight on either side of the seam moves nothing (a reach baked into the middle of the loop)
    for (const s of ['L', 'R']) if (!(a[`arm${s}.ikw`] > 0) && !(b[`arm${s}.ikw`] > 0)) for (const n of Object.keys({ ...a, ...b })) if (n.startsWith(`arm${s}.ik.`) || n.startsWith(`arm${s}.pole.`)) { delete a[n]; delete b[n]; }
    const d = diff(a, b); if (d) fails.push(`loop seam: ${d.n} differs by ${d.d}`);
    if (JSON.stringify(C.keys[0].cycle || null) !== JSON.stringify(C.keys[C.keys.length - 1].cycle || null)) fails.push('loop seam: the first and last key cycle differently');
  }
  // a captured loop in place repeats its capture (index.js placeClip `times`): the capture's last frame meets its first
  if (C.loop && !C.advance && Array.isArray(C.captured) && typeof C.captured[0] === 'number') {
    const ia = C.keys.findIndex(k => k.f === C.captured[0]), ib = C.keys.findIndex(k => k.f === C.captured[1]);
    if (ia < 0 || ib < 0) fails.push(`loop seam: no keys at the capture's ends ${C.captured}`);
    else { const a = { ...F[ia] }, b = { ...F[ib] }; let w = 0, wn = '';
      for (const n of Object.keys(a)) if (ANGLE.test(n) && n in b) { const d = Math.abs(a[n] - b[n]); if (d > w) { w = d; wn = n; } }
      const dr = 100 * Math.hypot((a['pos.0'] || 0) - (b['pos.0'] || 0), (a['pos.1'] || 0) - (b['pos.1'] || 0));
      if (w > JOINT_MAX) fails.push(`loop seam: the capture's ends differ ${w.toFixed(1)} deg at ${wn} (max ${JOINT_MAX})`);
      if (dr > ROOT_CM) fails.push(`loop seam: the capture's ends stand ${dr.toFixed(1)} cm apart (max ${ROOT_CM})`);
      info.captureSeam = +w.toFixed(1); }
  }
  // standard poses: a one-off starts on its base and ends on its end; a travelling loop's first and closing steps too
  const ends = C.loop ? (C.advance ? [[full(C.intro)[0], C.base], [full([...C.keys, ...C.outro])[C.keys.length + C.outro.length - 1], C.end || C.base]] : [])
    : [[F[0], C.base], [F[F.length - 1], C.end || C.base]];
  for (const [i, [m, nm]] of ends.entries()) {
    // a clip that turns ends on its standard pose facing the new way (the pose turned with the root)
    const yw = (m.yaw ?? 90) - 90, ref = flatten(Math.abs(yw) > 1e-6 ? turned(BASES[nm](B, 0), yw, [m['pos.0'] || 0, m['pos.1'] || 0]) : BASES[nm](B, m['pos.0'] || 0));
    // SIT on a seat the clip names sits as deep as that seat (its height is the clip's): the hips' height is the seat's
    if (nm === 'SIT' && (C.needs?.marks || []).some(k => k.kind === 'seat')) ref.bob = m.bob;
    const d = diff(body(m, ref), body(ref, ref));
    if (d) fails.push(`${i ? 'ends' : 'starts'} off ${nm}: ${d.n} differs by ${d.d}`);
  }
  // playback with the dose: the joint gate, planted feet, flights
  const key = { ...(C.advance ? { f: 0, clip: C.clip, body: B, to: [C.introTravel + C.outroTravel + 2 * C.advance, 0] } : { f: 0, clip: C.clip, body: B, ...(C.loop ? { times: 2 } : {}) }), ...fitOf(C) };
  const placed = placeClip(key, { pos: [0, 0], yaw: 90 }, C), keys = placed.keys, last = keys[keys.length - 1].f;
  const track = compileTrack(keys, {}, { pos: [0, 0], yaw: 90 }, 'kaiships'), fr = playActor(track, 0, last + 10);
  let jMax = 0, jAt = null, slide = 0, slideAt = null, root = 0, rootAt = null; const over = [], tops = (C.needs?.marks || []).filter(m => m.kind === 'window').map(m => m.at[2]);
  for (let f = 1; f < fr.length; f++) {
    const p = fr[f - 1], q = fr[f];
    // a foot in the air hangs off its shin: its pitch is a world angle that turns with the leg, not a joint, so it is not
    // gated while the foot is up (the ankle's own bend is the rig's: ROM.ankleDF); the solved joints below catch a pop
    const airborne = n => { const m = /^leg([LR])\.pitch$/.exec(n); return m && Math.max(q[`leg${m[1]}.footW.2`] ?? 0, p[`leg${m[1]}.footW.2`] ?? 0) > 0.005; };
    // captured frames (C.captured, clip frames) are a real body's own speeds: a run's knee or a jump's arm swing turns
    // 30-50 deg a frame at 30 fps. They are measured (jointMax) but not gated; the frames the library makes around them
    // (first and closing steps, the blend from and to the standard pose) are
    // (one span [a, b] or a list of them: a gait's captured start, cycles and stop, the seams between them the library's)
    const cap = C.captured && (Array.isArray(C.captured[0]) ? C.captured : [C.captured]).some(([a, b]) => f > a && f <= b);
    if (!cap) { const d = 100 * Math.hypot((q['pos.0'] ?? 0) - (p['pos.0'] ?? 0), (q['pos.1'] ?? 0) - (p['pos.1'] ?? 0)); if (d > root) { root = d; rootAt = f; } }
    if (!cap) for (const n of Object.keys(q)) if (ANGLE.test(n) && n in p && !airborne(n)) { const d = Math.abs(q[n] - p[n]); if (d > jMax) { jMax = d; jAt = `${f} ${n}`; } if (d > JOINT_MAX) over.push(f); }
    // a hand on an ik target: the target's travel against the arm's length, as an angle
    if (!cap) for (const s of ['L', 'R']) if (`arm${s}.ik.0` in q && (q[`arm${s}.ikw`] ?? 1) > 0.5) {
      const d = Math.hypot(...[0, 1, 2].map(i => q[`arm${s}.ik.${i}`] - p[`arm${s}.ik.${i}`])) / ARM_W * 180 / Math.PI;
      if (d > jMax) { jMax = d; jAt = `${f} arm${s}.ik`; } if (d > JOINT_MAX) over.push(f); }
    // (a foot planted on the floor, or on a sill the clip names: a window mark's at[2]). A body lying on the floor (the
    // rig's fall, hips below the seated pose's: LIE) rests on its back or side, not its feet: a lying foot is not planted
    const lying = m => (m.fall ?? 0) >= 1 && (m.bob ?? 0) < -0.8;
    if (!(lying(p) && lying(q))) for (const s of ['L', 'R']) { const z0 = p[`leg${s}.footW.2`], z1 = q[`leg${s}.footW.2`], on = z => z <= 0.005 || tops.some(t => Math.abs(z - t) < 0.0005); if (z0 == null || !on(z0) || !on(z1)) continue;
      const d = 1000 * Math.hypot(q[`leg${s}.footW.0`] - p[`leg${s}.footW.0`], q[`leg${s}.footW.1`] - p[`leg${s}.footW.1`]); if (d > slide) { slide = d; slideAt = `${f} ${s}`; } }
  }
  if (jMax > JOINT_MAX) fails.push(`joint gate: ${jMax.toFixed(1)} deg/f at ${jAt} (max ${JOINT_MAX}); frames ${[...new Set(over)].slice(0, 8).join(' ')}`);
  if (slide > SLIDE_MM) fails.push(`planted foot slides ${slide.toFixed(2)} mm/f at ${slideAt}`);
  if (root > ROOT_CM && !C.advance) fails.push(`root: moves ${root.toFixed(1)} cm/f at ${rootAt} outside the capture (max ${ROOT_CM})`);
  // a clip starts at its own origin (index.js zeroes it), so a clip placed after another never jumps the actor
  { const k0 = C.advance ? C.intro[0] : C.keys[0], o = [C.advance ? 0 : k0.pos?.[0] || 0, k0.pos?.[1] || 0]; if (ALL.includes(C) && Math.hypot(...o) > 1e-6) fails.push(`root: the first key stands ${o.map(v => v.toFixed(3))} off the clip's origin`); }
  const fl = track.flights || [];
  Object.assign(info, { frames: last, jointMax: +jMax.toFixed(1), jointAt: jAt, slideMm: +slide.toFixed(2), rootCm: +root.toFixed(1), flights: fl.length,
    peakCm: fl.length ? +(100 * Math.max(...fl.map(x => 9.8 * ((x.f1 - x.f0) / 30) ** 2 / 8))).toFixed(1) : 0,
    carryKg: Math.max(0, ...keys.map(k => Math.max(k.x_kgR || 0, k.x_kgL || 0, k.x_kgB || 0))), fit: +placed.fit.toFixed(3), cycles: placed.n });
  return { fails, info };
}
// ------------------------------------------------------------------ the rig, headless (no browser: CI runs this)
// cast.js builds its textures on 2D canvases; here they are no-op canvases, so the figure's solve (contact, balance,
// carried props) runs exactly as on the page and only drawing is skipped
let RIG = null;
async function rig() {
  if (RIG) return RIG;
  if (!globalThis.document) {
    const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (t[k] = k === 'measureText' ? () => ({ width: 10 }) : /^create(Linear|Radial)Gradient$|^createPattern$/.test(String(k)) ? () => ({ addColorStop() {} })
      : k === 'getImageData' ? (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {})), set: (t, k, v) => { t[k] = v; return true; } });
    const canvas = () => ({ width: 1, height: 1, style: {}, getContext: () => ctx, addEventListener() {}, toDataURL: () => '' });
    globalThis.document = { createElement: canvas, createElementNS: canvas };
  }
  const cast = await import('#engine/cast.js'), body = await import('#engine/body.js'), { toPose } = await import('#engine/motion.js');
  await import('#motion-lib/props.js'); const { bodySpec } = await import('#motion-lib/bodies.js'), { propPlan } = await import('#engine/propobj.js');
  return (RIG = { cast, PHYS: body.PHYS, toPose, bodySpec, propPlan, THREE: await import('three') });
}
// a prop's drawn extent in the world (Blender metres): its solid meshes (not a torch's transparent cone)
function propWorldBox(p) {
  const T = RIG.THREE, b = new T.Box3(), m = new T.Box3(); p.updateMatrixWorld(true);
  p.traverse(c => { if (!c.isMesh || c.material?.transparent || c.material?.blending === T.AdditiveBlending) return; if (!c.geometry.boundingBox) c.geometry.computeBoundingBox(); b.union(m.copy(c.geometry.boundingBox).applyMatrix4(c.matrixWorld)); });
  return { lo: [b.min.x, -b.max.z, b.min.y], hi: [b.max.x, -b.min.z, b.max.y] };
}
// a figure built by cast.js (headless), for tests: { S, PHYS, toPose }
// (bare headed, as most films' casts are; a clip made for a capped figure (needs.cap: Hot Money's cop) wears the guard's cap,
// which held props stop on: cast.js headWear)
const guard = cap => (cap ? RIG.cast.GUARD : { ...RIG.cast.GUARD, hair: [] });
export async function rigStick(body = 'adult', cap = false) { const R = await rig(); return { S: R.cast.makeStick(R.bodySpec(guard(cap), body)), PHYS: R.PHYS, toPose: R.toPose }; }
export const GRIP_CM = 2, PROP_CM = 1;
// props as scene objects (engine/propobj.js) and the balance solve, per frame (Hot Money ep01: a bag that jumped 20 cm as
// it was set down, a crate that vanished, a pushing body that leapt 77 cm when a foot lifted):
//   PROP_SLIP_CM  a prop moves no more than the hand that holds it (times its attach weight), plus what gravity gives it
//                 when it is free, plus this
//   BAL_CM        the balance solve moves the pelvis no more than this a frame (pelvis with balance on minus off)
//   MASS_STEP     the carried mass changes no more than this share of its largest a frame (a load enters or leaves the
//                 hand over three frames at least: holdKeys ramps it over four)
export const PROP_SLIP_CM = 1, BAL_CM = 4, MASS_STEP = 0.35;
// how far (cm) a prop moved from its last seen state q to now ({ f, at, hand: Blender m, w, v: m/s }) beyond what its hand
// (times the attach weight) and gravity give it over those frames: over PROP_SLIP_CM it slid, popped or teleported
export function propExcess(q, now) {
  const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), t = Math.max(1, now.f - q.f) / 30;
  const allow = Math.max(now.w, q.w) * 100 * d3(now.hand, q.hand) + 100 * (Math.max(now.v, q.v) * t + 0.5 * 9.8 * t * t);
  return 100 * d3(now.at, q.at) - allow;
}
// the middle of the face, out from the head's centre along its look (m, at the adult's size)
const FACE_OUT = 0.17;
// one clip through the real rig, physics on: the hand off its target while it grips (shot.mjs (h)) and a held prop
// inside the body after the solve ((i)), per frame; and the props, the balance shift and the load frame to frame
// obstacles: more set pieces ([{ name, lo, hi }], Blender metres, clip space): a film's own (a counter beside the actor, a wall)
export async function rigClip(C, body = C.body || 'adult', { phys = true, obstacles = [], rest = null, each = null } = {}) {
  const R = await rig(), S = R.cast.makeStick(R.bodySpec(guard(C.needs?.cap), body)), was = R.PHYS.on; R.PHYS.on = phys;
  S.obstacles = [...markColliders(C.needs?.marks, C.body ? 1 : (BODIES[body]?.spec.scale ?? 1)), ...obstacles];   // the clip's set pieces: hands stop on them
  if (rest) S.rest = [...S.obstacles, ...rest];   // what a prop let go lands on: a set's solids as engine/solids.js reads them
  const key = { ...(C.advance ? { f: 0, clip: C.clip, body, to: [C.introTravel + C.outroTravel + 2 * C.advance, 0] } : { f: 0, clip: C.clip, body, ...(C.loop ? { times: 2 } : {}) }), ...fitOf(C) };
  const keys = placeClip(key, { pos: [0, 0], yaw: 90 }, C).keys, track = compileTrack(keys, {}, { pos: [0, 0], yaw: 90 }, 'kaiships'), fr = playActor(track, 0, keys[keys.length - 1].f + 6);
  const lastF = keys[keys.length - 1].f, Qat = f => R.toPose(fr[Math.max(0, Math.min(fr.length - 1, f))], S.root.scale.x), plan = R.propPlan(track, Qat, S);
  const o = { grip: 0, gripAt: null, prop0: 0, prop: 0, propAt: null, over: [], joint: 0, jointAt: null, heldFrames: 0, inSet: [],
    slip: 0, slipAt: null, gone: [], bal: 0, balAt: null, pelvis: 0, pelvisAt: null, massStep: 0, massAt: null, kgMax: 0,
    limbs: [], propInSet: [], paths: [] };
  const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]), V3 = new (S.root.position.constructor)();
  const gripW = p => { const g = p.userData.grip || [0, 0, 0]; V3.set(...(Array.isArray(g) ? g : [0, 0, 0])); p.localToWorld(V3); return [V3.x, -V3.z, V3.y]; };
  let prevP = {}, prevBal = null, prevPel = null, prevKg = null, kgs = [];
  try {
    fr.forEach((m, f) => {
      const Q = Qat(f); Q.propRest = plan.at(f);
      // the balance shift: the pelvis with balance on minus the same frame with it off (physics on only)
      let pel0 = null; if (phys && R.PHYS.balance) { R.PHYS.balance = false; S.pose2(Q); pel0 = S.rigWorld().skel.pelvis; R.PHYS.balance = true; }
      S.pose2(Q); const w = S.rigWorld(); each?.(f, S, w, keys);
      const pel = w.skel.pelvis, bal = pel0 ? pel.map((x, i) => x - pel0[i]) : [0, 0, 0];
      if (prevBal) { const d = 100 * d3(bal, prevBal); if (d > o.bal) { o.bal = +d.toFixed(2); o.balAt = f; } }
      if (prevPel) { const d = 100 * d3(pel, prevPel); if (d > o.pelvis) { o.pelvis = +d.toFixed(2); o.pelvisAt = f; } }
      prevBal = bal; prevPel = pel;
      const kg = S.carryKg || 0; kgs.push([f, kg - (prevKg ?? kg)]); prevKg = kg; o.kgMax = Math.max(o.kgMax, kg);
      // every prop the clip declares is on screen through the clip (held or resting), and moves no more than its hand lets it
      if (f <= lastF) for (const kind of C.needs?.props || []) if (!Object.entries(S.props).some(([id, p]) => id.slice(1) === (key.swap?.[kind] ?? kind) && p.visible)) o.gone.push(f);
      // (a prop that comes back after frames out of the scene is measured from where it was last seen: a teleport fails)
      for (const [id, p] of Object.entries(S.props)) {
        if (!p.visible || id[0] === 'H') continue;
        const st = S.propState?.[id] || { w: 1, v: 0 }, hand = id[0] === 'B' ? w.L.hand.map((x, i) => (x + w.R.hand[i]) / 2) : w[id[0]].hand;
        const now = { f, at: gripW(p), hand, w: st.w, v: st.v }, q = prevP[id]; prevP[id] = now;
        const e = q ? propExcess(q, now) : 0; if (e > o.slip) { o.slip = +e.toFixed(2); o.slipAt = `${f} ${id}`; }
      }
      // the solved figure, for the joint gate (jointExcess): what shot.mjs's report reads off the page (rigWorld)
      const lim = { torsoLean: w.torsoLean, torsoRoll: w.torsoRoll, ...Object.fromEntries(['L', 'R'].map(s => [s, { ...Object.fromEntries(LIMB_PTS.map(j => [j, w[s][j]])), kneeFlex: w[s].kneeFlex, elbowFlex: w[s].elbowFlex, footPitch: w[s].footPitch }])) };
      if (o.limbs.length) for (const [k, d] of jointSteps(o.limbs[o.limbs.length - 1], lim)) if (d > o.joint) { o.joint = +d.toFixed(1); o.jointAt = `${f} ${k}`; }
      o.limbs.push(lim);
      if (f <= lastF) { const e = S.parts.head.matrixWorld.elements, l = Math.hypot(e[8], e[9], e[10]) || 1, fwd = [e[8] / l, -e[10] / l, e[9] / l];
        o.paths.push({ pelvis: w.skel.pelvis, neck: w.skel.neck, head: w.skel.head, shL: w.L.shoulder, shR: w.R.shoulder, face: w.skel.head.map((x, i) => x + FACE_OUT * fwd[i]), handL: w.L.hand, handR: w.R.hand,
          yaw: Math.atan2(fwd[0], -fwd[1]) * 180 / Math.PI, down: -Math.asin(Math.max(-1, Math.min(1, fwd[2]))) * 180 / Math.PI, feet: ['L', 'R'].map(sd => [w[sd].ankle[2], w[sd].toe[2]]) }); }
      if (Object.values(S.props).some(p => p.visible)) o.heldFrames++;
      // the body inside the set's solid pieces (a window's wall, a trunk lip): the head (its centre and the crown), the
      // joints of the limbs (1 cm grace, as the render's (e)); the arms are solved against the set, the rest is not
      if (S.obstacles.length) { const pts = [['head', w.skel.head], ['crown', [w.skel.head[0], w.skel.head[1], w.skel.head[2] + 0.17]], ['pelvis', w.skel.pelvis], ['neck', w.skel.neck],
        ...['L', 'R'].flatMap(s => ['knee', 'ankle', 'toe', 'elbow'].map(j => [j + s, w[s][j]]))];
        for (const b of S.obstacles) { const hit = pts.find(([, p]) => [0, 1, 2].every(i => p[i] > b.lo[i] + 0.01 && p[i] < b.hi[i] - 0.01)); if (hit) { o.inSet.push(`${f} ${hit[0]} in ${b.name}`); } } }
      for (const s of ['L', 'R']) if (w[s].grip && w[s].targetGapCm > o.grip) { o.grip = w[s].targetGapCm; o.gripAt = `${f} ${s}`; }
      for (const s of ['L', 'R']) if (w[s].grip && w[s].targetGapCm > GRIP_CM) o.over.push(f);
      o.prop0 = Math.max(o.prop0, w.propPenCm0 || 0); if ((w.propPenCm || 0) > o.prop) { o.prop = w.propPenCm; o.propAt = f; o.propIn = w.propIn || 'body'; }
      // a prop in the scene (held, resting or falling) inside a solid piece of the set: its drawn box (lights and glows left
      // out) against each piece, 1 cm of grace (a crate pushed through a window wall, ep01 SH150 frame 48)
      if (S.obstacles.length) for (const [id, p] of Object.entries(S.props)) { if (!p.visible) continue; const bx = propWorldBox(p);
        for (const b of S.obstacles) { const d = Math.min(...[0, 1, 2].flatMap(i => [bx.hi[i] - b.lo[i], b.hi[i] - bx.lo[i]])); if (d > 0.01) { o.propInSet.push(`${f} ${id} in ${b.name} ${(100 * d).toFixed(1)} cm`); break; } } }
    });
  } finally { R.PHYS.on = was; }
  for (const [f, d] of kgs) if (o.kgMax > 0 && Math.abs(d) / o.kgMax > o.massStep) { o.massStep = +(Math.abs(d) / o.kgMax).toFixed(3); o.massAt = f; }
  return o;
}
// ------------------------------------------------------------------ the joint gate on the solved figure
// A solved joint turns at most JOINT_STEP_MAX a frame, measured as the film's report measures it (tools/gates/jointstep.mjs:
// flexes, foot pitches, the torso, the limbs' directions), so a clip the library passes is one the film passes. No
// allowance for a capture that turns faster: the film has none (Hot Money ep01 SH060 foot 36.6 deg/f and SH172 elbow
// 35.1 deg/f passed here). Run physics on and off: off catches the keys and the retarget, on everything physics adds.
const LIMB_PTS = ['shoulder', 'elbow', 'hand', 'hip', 'knee', 'ankle'];
// g: a rigClip result (physics on or off)
export function jointExcess(g) {
  const out = { joint: 0, jointAt: null, excess: 0, excessAt: null, over: [] };
  for (let f = 1; f < g.limbs.length; f++) for (const [k, v] of jointSteps(g.limbs[f - 1], g.limbs[f])) {
    if (v > out.joint) { out.joint = +v.toFixed(1); out.jointAt = `${f} ${k}`; }
    if (v > JOINT_STEP_MAX) { out.over.push(f); if (v - JOINT_STEP_MAX > out.excess) { out.excess = +(v - JOINT_STEP_MAX).toFixed(1); out.excessAt = `${f} ${k} ${v.toFixed(1)} deg/f`; } }
  }
  return out;
}
export function jointFails(g, tag = '') {
  const e = jointExcess(g), t = tag ? ` (${tag})` : '';
  return e.over.length ? [`solved joint${t}: ${e.excess} deg/f over ${JOINT_STEP_MAX} at ${e.excessAt}; frames ${[...new Set(e.over)].slice(0, 8).join(' ')}`] : [];
}
// Clips the joint gate fails today, each with its excess (deg/f over JOINT_STEP_MAX, the larger of physics on and off) and
// why. Such a row passes while its excess stays at or under that number and fails as soon as it grows; a row that passes
// clean while it is listed fails too ("fixed: delete it"), so this list only shrinks. PR D measured the rows against the
// motion as authored; PR G measures them as the film does (flat 25, foot pitch and torso too), which no clip's motion
// changed for: the seven numbers that grew are the same frames read the film's way (the run's foot pitch, the leap's knee).
export const JOINT_KNOWN = {
  Adult_Act_Jump_Once: [10, 'the take-off knee: the retargeted hips over the planted feet straighten it faster than the capture'],
  Adult_Gest_PhoneCall_Loop: [0.8, "the reach to the ear blends from STAND in the library's 14 frames: the forearm turns past the FK keys while the elbow plane turns to the pole"],
  Adult_Move_Run_Fwd_Loop: [30.4, 'captured run: a shin turns faster than the capture where the swing foot is eased onto its print'],
  Adult_Move_Sprint_Fwd_Loop: [26.5, 'captured sprint: as the run'],
  Adult_Trans_GetUp_Once: [12, 'lying, a knee on the floor straightens faster than the capture (the feet are pinned to their captured prints, the hips are not the capture\'s)'],
  Adult_Trans_LieDown_Once: [12, 'as GetUp, run backwards'],
  Adult_Trans_JumpWindow_Once: [35.3, 'the leap: the captured right leg kicks straight within a frame and the retarget folds it on this body'],
  'Adult_Trans_JumpWindow_Once fit {"sill":0.8,"top":1.9,"width":1}': [23.5, 'as the unfitted leap'],
  Child_Move_Run_Fwd_Loop: [3.4, 'made run: the closing step has no authored knee between its keys (25 deg/f applies)'],
  Elder_Move_Run_Fwd_Loop: [14.5, 'made run: the swing foot eased off its print holds the leg straight after toe-off, the authored knee is bent'],
  Heavy_Move_Run_Fwd_Loop: [20.2, 'made run: as the elder run'],
  Thin_Move_Run_Fwd_Loop: [8.2, 'made run: as the elder run'],
};
function jointGate(r, name, g, g0) {
  const f = [...jointFails(g), ...jointFails(g0, 'physics off')], ex = Math.max(jointExcess(g).excess, jointExcess(g0).excess), k = JOINT_KNOWN[name];
  if (!k) { r.fails.push(...f); return; }
  if (!f.length) r.fails.push(`solved joint: listed in JOINT_KNOWN but passes now: fixed, delete it`);
  else if (ex > k[0] + 0.05) r.fails.push(...f, `solved joint: JOINT_KNOWN allows ${k[0]} deg/f over (${k[1]}), now ${ex}`);
  else r.known = [`known: ${ex} deg/f over ${JOINT_STEP_MAX} (JOINT_KNOWN: ${k[1]})`, r.known].filter(Boolean).join('; ');
}
// a swapped prop lies the way the kit prop it stands in for does: its longest side along the same axis of the prop's own
// frame (a phone's up, a pistol's along the forearm). A film's desk handset modelled long side across put its ends in the
// head at the ear (Hot Money ep01 SH245: 15.7 cm in, the hand 40 cm off)
export function contractFails(F) {
  const out = [], long = d => { const v = [d.w, d.h, d.l]; return v.indexOf(Math.max(...v)); };
  for (const [from, to] of Object.entries(F.keyed?.swap || {})) {
    const a = propSize(from), b = propSize(to);
    if (a && b && long(a) !== long(b)) out.push(`contract: the swapped ${to} is longest along its ${'xyz'[long(b)]} (${+Math.max(b.w, b.h, b.l).toFixed(3)} m), the kit ${from} it stands in for along its ${'xyz'[long(a)]}: turn it (props.js)`);
  }
  return out;
}
// the props-as-objects and balance gates on one rigClip result (physics on or off): the lines that fail
export function physicsFails(g, tag = '') {
  const t = tag ? ` (${tag})` : '', out = [];
  if (g.slip > PROP_SLIP_CM) out.push(`prop${t}: moves ${g.slip} cm more than its hand and gravity allow at ${g.slipAt} (max ${PROP_SLIP_CM})`);
  if (g.gone.length) out.push(`prop${t}: a declared prop is not in the scene on ${g.gone.length} frames of the clip (${g.gone[0]}..${g.gone[g.gone.length - 1]})`);
  if (g.bal > BAL_CM) out.push(`balance${t}: the solve moves the pelvis ${g.bal} cm in a frame at ${g.balAt} (max ${BAL_CM})`);
  if (g.massStep > MASS_STEP) out.push(`load${t}: the carried mass steps ${Math.round(g.massStep * 100)} % of its ${+g.kgMax.toFixed(1)} kg in one frame at ${g.massAt} (max ${Math.round(MASS_STEP * 100)} %)`);
  return out;
}
// ------------------------------------------------------------------ a body's own way of doing it (bodylife.mjs)
// every clip on another body against the adult's clip of that name (the body's own or the shared one): the paths of the
// hands, the head and the hips through the rig, physics on (the shape: physics off, the keys as they are). A clip with no adult twin is held to the adult clip nearest it
// (bodylife.mjs NEAREST: time, or stride and cadence on the move); a clip with neither is not judged
const LIFE = new Map();
export async function clipLife(C, g = null, g0 = null) {
  if (!LIFE.has(C)) { const z = sizeOf(C.body || 'adult'); LIFE.set(C, { ...lifeOf(C, (g || await rigClip(C)).paths, z), paths: lifeOf(C, (g0 || await rigClip(C, undefined, { phys: false })).paths, z).paths }); }
  return LIFE.get(C);
}
// a body the floor carries (KNEEL, FLOOR: no foot is keyed as planted, so the sliding check never looks at one) rests its feet
// on that floor: a standing sole has its ankle 1.6 cm up and its toe 1.3 cm (the drawn line's half); more than FLOOR_CM is a
// foot in the air (2 px at 720p a centimetre: Idle_Kneel hung its feet 11 cm up for 155 frames and passed)
export const FLOOR_CM = 3, ON_FLOOR = ['KNEEL', 'FLOOR'];
export function floorFails(C, g) {
  if (!ON_FLOOR.includes(C.base)) return [];
  let worst = [0, '']; g.paths.forEach((r, f) => r.feet.forEach(([a, t], i) => { for (const [v, n] of [[a, 'ankle'], [t, 'toe']]) if (100 * v > worst[0]) worst = [100 * v, `${n}${'LR'[i]} at ${f}`]; }));
  return worst[0] > FLOOR_CM ? [`floor: a foot is ${worst[0].toFixed(1)} cm above the floor (${worst[1]}, max ${FLOOR_CM})`] : [];
}
export const adultTwin = C => (BODY_LIFE[C.body] ? ALL.find(A => A.clip === C.clip && (A.body || 'adult') === 'adult') : null);
export const adultNear = C => (BODY_LIFE[C.body] && !adultTwin(C) && NEAREST[C.clip] ? ALL.find(A => A.clip === NEAREST[C.clip] && (A.body || 'adult') === 'adult') : null);
// the adult's clip on this body's own figure (its keys, its metres with the body's size, as a shared clip is played), for the shape
const ONBODY = new WeakMap();
export async function onBody(A, body) {
  const M = ONBODY.get(A) || ONBODY.set(A, new Map()).get(A);
  if (!M.has(body)) M.set(body, lifeOf(A, (await rigClip({ ...A, body: undefined }, body, { phys: false })).paths, sizeOf(body)));
  return M.get(body);
}
const sizeOf = b => { const s = BODIES[b].spec, sc = s.scale ?? 1; return { scale: sc, leg: sc * (s.legScale ?? 1) }; };
export async function bodyFails(C, g = null, g0 = null) {
  const A = adultTwin(C), N = A ? null : adultNear(C);
  return A ? lifeFails(C.body, await clipLife(A), await clipLife(C, g, g0), { on: await onBody(A, C.body) }) : N ? lifeFails(C.body, await clipLife(N), await clipLife(C, g, g0), { near: true }).map(x => `${x} (near: ${N.name})`) : [];
}
// Clips on main before this check (25/11) that fail it, each with the measures it fails and why. A row passes while the clip
// fails exactly those measures and no other; a listed clip that passes, or fails another measure, fails ("fixed: delete
// it" / "changed"), so the list only shrinks. No clip made on or after 25/11 is ever listed (test/unit/stick-motionlib.test.mjs).
// Open faults for a follow-up ticket: these clips were never edited by the check's PR.
export const BODY_KNOWN_DATE = '25/11';
export const BODY_KNOWN = {
  Heavy_Act_TorchReady_Loop: [['time', 'shape'], 'the adult\'s torch loop on the heavy body at its clock and size: time 1, shape 0.05'],
  Thin_Act_TorchReady_Loop: [['time', 'shape'], 'as the heavy one: time 1, shape 0.01'],
  Heavy_Move_WalkFlashlight_Loop: [['shape'], 'the shared flashlight walk on the heavy step: shape 0.12, 2.0 cm'],
  Thin_Move_WalkFlashlight_Loop: [['time', 'shape'], 'time 0.94 (<= 0.92), shape 0.04'],
  Elder_Move_Run_Fwd_Loop: [['time'], 'made run: time 1.16 (>= 1.2)'],
  Heavy_Move_Run_Fwd_Loop: [['time'], 'made run: time 0.95 (>= 1.1), quicker than the adult\'s'],
  Thin_Move_Run_Fwd_Loop: [['stride'], 'made run: stride 0.58 (>= 1.05: bodies.js "long light steps")'],
  Thin_Move_Walk_Fwd_Loop: [['stride'], 'made walk: stride 0.73 (>= 1.05: bodies.js "long light steps")'],
};
const measures = fails => [...new Set(fails.map(f => f.match(/^body: \w+'s (\w+)/)?.[1]).filter(Boolean))].sort();
export function bodyGate(r, C, fails) {
  const k = BODY_KNOWN[C.name], body = fails.filter(f => /^body: /.test(f)), rest = fails.filter(f => !/^body: /.test(f));
  r.fails.push(...rest);
  if (!k) { r.fails.push(...body); return; }
  const got = measures(body), want = [...k[0]].sort();
  if (!got.length) r.fails.push(`body: listed in BODY_KNOWN (${BODY_KNOWN_DATE}) but passes now: fixed, delete it`);
  else if (got.join() !== want.join()) r.fails.push(...body, `body: BODY_KNOWN lists ${want.join(', ')} (${k[1]}), now fails ${got.join(', ')}`);
  else r.known = [r.known, `known (BODY_KNOWN ${BODY_KNOWN_DATE}): ${body.join('; ')}`].filter(Boolean).join('; ');
}
// a clip performed by a body (acts/: act.js sets `perform`) never stops dead: bodylife.mjs STILL_F, STILL_CM
export function stillFails(C, g) {
  if (!C.perform) return [];
  const s = stillSpans(g.paths); return s.length ? [`still: nothing moves ${STILL_CM} cm in ${STILL_IN} frames for ${STILL_F} frames from frame ${s[0][0]} (${s.length} windows, least ${Math.min(...s.map(x => x[1]))} cm)`] : [];
}
// the motion rules of one clip (its rigClip results, physics on and off)
export const motionFails = async (C, g, g0) => [...physicsFails(g), ...physicsFails(g0, 'physics off'), ...floorFails(C, g), ...stillFails(C, g), ...faceHidden(C.clip, g.paths), ...await bodyFails(C, g, g0)];

export async function checkAll({ only, check } = {}) {
  const mine = C => !only || C.clip === only || C.name === only;
  const files = clipFiles(), rows = [], listed = new Set();
  for (const f of files) {
    const C = (await import(path.join(LIB, f))).default;
    if (!mine(C)) { listed.add(C); continue; }
    if (!ALL.includes(C)) rows.push({ file: f, fails: ['index: index.js does not import this file'], info: {} });
    else {
      // the rig as the proof renders it: physics on (the hands' gap from their grip, a held prop after the solve) and off
      // (a held prop as keyed); a clip that declares props holds one on screen
      listed.add(C); const r = checkClip(C, f), g = await rigClip(C), g0 = await rigClip(C, undefined, { phys: false });
      if (g.grip > GRIP_CM) r.fails.push(`rig: a gripping hand is ${g.grip} cm off its target at ${g.gripAt} (max ${GRIP_CM}; frames ${[...new Set(g.over)].slice(0, 8).join(' ')})`);
      if (g.prop > PROP_CM) r.fails.push(`rig: a held prop is ${g.prop} cm inside the ${g.propIn === 'set' ? 'set' : 'body'} at frame ${g.propAt} (max ${PROP_CM})`);
      if (g.propInSet.length) r.fails.push(`rig: a prop is inside the set: ${g.propInSet.slice(0, 3).join('; ')}${g.propInSet.length > 3 ? ` (+${g.propInSet.length - 3} frames)` : ''}`);
      if (g0.prop > PROP_CM) r.fails.push(`rig (physics off): a held prop is ${g0.prop} cm inside the ${g0.propIn === 'set' ? 'set' : 'body'} at frame ${g0.propAt} (max ${PROP_CM})`);
      if (g.inSet.length) r.fails.push(`rig: the body is inside the set: ${g.inSet.slice(0, 3).join('; ')}${g.inSet.length > 3 ? ` (+${g.inSet.length - 3} frames)` : ''}`);
      if ((C.needs?.props || []).length && !g.heldFrames) r.fails.push(`rig: needs.props ${C.needs.props} but the rig shows no held prop on any frame`);
      bodyGate(r, C, await motionFails(C, g, g0)); jointGate(r, C.name, g, g0);
      Object.assign(r.info, { slipCm: g.slip, balCm: g.bal, massStep: g.massStep });
      Object.assign(r.info, { gripCm: g.grip, propCm0: g.prop0, propCm: g.prop, propOffCm: g0.prop, heldFrames: g.heldFrames, rigJoint: g.joint, rigJointAt: g.jointAt, rigExcess: Math.max(jointExcess(g).excess, jointExcess(g0).excess) });
      rows.push({ file: f, name: C.name, ...r });
    }
  }
  // every fit a clip lists (fitChecks: the sets films use), every film prop it lists (propChecks: a swap, props.js heldProp)
  // and a film's own key (--check: its swap, pos, yaw, body and the set pieces it plays beside, collide) is checked as its own clip
  for (const C of ALL) for (const fit of mine(C) ? [...(C.fitChecks || []), ...(C.propChecks || []).map(swap => ({ swap })), ...(check && only ? [check] : [])] : []) {
    const F = keyed(C, fit), f = clipFiles().find(x => path.basename(x, '.js').replace(/_v\d+$/, '') === C.name), r = checkClip(F, f), set = { obstacles: fit.collide || [] }, g = await rigClip(F, fit.body, set), g0 = await rigClip(F, fit.body, { ...set, phys: false });
    r.fails.push(...contractFails(F));
    // (a key that only swaps a prop or places the clip plays the clip's own motion: its JOINT_KNOWN row, if any, holds)
    const { swap: _s, pos: _p, yaw: _y, body: _b, collide: _c, ...fitOnly } = fit, jn = Object.keys(fitOnly).length ? `${C.name} fit ${JSON.stringify(fit)}` : C.name;
    if (g.grip > GRIP_CM) r.fails.push(`rig: a gripping hand is ${g.grip} cm off its target at ${g.gripAt} (max ${GRIP_CM})`);
    if (g.prop > PROP_CM) r.fails.push(`rig: a held prop is ${g.prop} cm inside the ${g.propIn === 'set' ? 'set' : 'body'} at frame ${g.propAt} (max ${PROP_CM})`);
    if (g.propInSet.length) r.fails.push(`rig: a prop is inside the set: ${g.propInSet.slice(0, 3).join('; ')}${g.propInSet.length > 3 ? ` (+${g.propInSet.length - 3} frames)` : ''}`);
    if (g0.prop > PROP_CM) r.fails.push(`rig (physics off): a held prop is ${g0.prop} cm inside the ${g0.propIn === 'set' ? 'set' : 'body'} at frame ${g0.propAt} (max ${PROP_CM})`);
    if (g.inSet.length) r.fails.push(`rig: the body is inside the set: ${g.inSet.slice(0, 3).join('; ')}${g.inSet.length > 3 ? ` (+${g.inSet.length - 3} frames)` : ''}`);
    r.fails.push(...physicsFails(g), ...physicsFails(g0, 'physics off')); jointGate(r, jn, g, g0);
    Object.assign(r.info, { slipCm: g.slip, balCm: g.bal, massStep: g.massStep });
    Object.assign(r.info, { gripCm: g.grip, propCm0: g.prop0, propCm: g.prop, propOffCm: g0.prop, heldFrames: g.heldFrames, rigJoint: g.joint, rigJointAt: g.jointAt, rigExcess: Math.max(jointExcess(g).excess, jointExcess(g0).excess) });
    rows.push({ file: f, name: `${C.name} fit ${JSON.stringify(fit)}`, ...r });
  }
  for (const C of ALL) if (!listed.has(C)) rows.push({ file: C.name, fails: ['index: listed in index.js but no file'], info: {} });
  return rows;
}

// ------------------------------------------------------------ the catalogue (docs/MOTION-LIB.md), made from the clips
// Written from the clip records and the first sentence of each clip file's header comment, so it never drifts from the
// library (the ep01 run found it listing 18 of 46 clips): node styles/stick-man/tools/gates/motionlib.mjs --catalogue
// rewrites it; test/unit/stick-motionlib.test.mjs fails when the committed file is not what this makes.
export const CATALOGUE = path.join(ROOT, 'styles/stick-man/docs/MOTION-LIB.md');
const what = file => {
  const head = []; for (const l of fs.readFileSync(path.join(LIB, file), 'utf8').split('\n')) { if (!l.startsWith('//')) break; head.push(l.replace(/^\/\/\s?/, '')); }
  const t = head.join(' ').replace(/\s+/g, ' '), b = t.indexOf(': '), r = b >= 0 ? t.slice(b + 2) : t, e = r.search(/[.;](\s|$)/);
  return (e >= 0 ? r.slice(0, e) : r).replace(/\|/g, '/').trim();
};
export function catalogue() {
  const files = new Map(clipFiles().map(f => [path.basename(f, '.js').replace(/_v\d+$/, ''), f]));
  const out = ['# Motion library catalogue', '',
    `The ${ALL.length} clips of \`styles/stick-man/motion-lib\` (rules and use: its README.md). An anim key \`{ f, clip, body, to?, times? }\``,
    'plays one (REEL_DATA.md). `frames` = one cycle or the whole one-off at 30 fps; `base` = the standard pose it starts (→ ends) on;',
    '`props` = what the hands hold (`x_hp<L|R|B>_<prop>`, motion-lib/props.js and kit/cast/handprops.js; a film swaps its own with',
    'the key\'s `swap`), on which hand; `set` = the set pieces it needs (the proof page builds them at the sizes the clip names in',
    '`needs.marks`).', '',
    'Made by `node styles/stick-man/tools/gates/motionlib.mjs --catalogue` from the clips themselves: do not edit by hand.', '',
    'Proof: `node styles/stick-man/tools/gates/motionlib.mjs --proof <dir>` (every clip at 540x960, physics on and off, `shot.mjs --report`',
    'numbers, one contact sheet per group).', '',
    'Physics gates (every clip, physics on and off, through the real rig): a prop moves no more than its hand (times its attach',
    'weight) and gravity allow plus 1 cm, also when it comes back after frames out of the scene; a declared prop is in the scene',
    'every frame of the clip; the balance solve moves the pelvis at most 4 cm a frame (the pelvis with balance on minus off: the',
    'raw pelvis speed is reported, not gated); the carried mass changes at most 35 % of its largest a frame.'];
  for (const g of GROUPS) {
    const cs = ALL.filter(c => c.group === g).sort((a, b) => a.clip.localeCompare(b.clip) || (a.body || '').localeCompare(b.body || ''));
    if (!cs.length) continue;
    out.push('', `## ${g}`, '', '| Clip | Body | Loop | Frames | Base | Props (hand) | Set | What |', '|---|---|---|---|---|---|---|---|');
    for (const C of cs) {
      const props = (C.needs?.props || []).length ? `${C.needs.props.join(', ')} (${C.needs.hands})` : '-';
      const set = [...new Set((C.needs?.marks || []).map(m => m.kind))].join(', ') || '-';
      out.push(`| \`${C.clip}\` | ${C.body || 'any (adult, scaled)'} | ${C.loop ? 'loop' : 'once'} | ${C.frames} | ${C.base}${C.end && C.end !== C.base ? ` → ${C.end}` : ''} | ${props} | ${set} | ${what(files.get(C.name))} |`);
    }
  }
  out.push('', '## Body types', '', '| Body | Rig (cast spec) | Mass | Walk: step, frames a step | Run: step, frames, on the ground |', '|---|---|---|---|---|');
  for (const [b, B] of Object.entries(BODIES)) out.push(`| ${b} | ${JSON.stringify(B.spec).replace(/"/g, '').replace(/:/g, ': ').replace(/,/g, ', ')} | ${B.kg} kg | ${B.walk.S} m, ${B.walk.T} | ${B.run.S} m, ${B.run.T}, ${B.run.ts} |`);
  return out.join('\n') + '\n';
}

// --------------------------------------------------------------- renders (motion-lib/proof, one process at a time)
const SHOT = path.join(HERE, '../render/shot.mjs'), PAGE = 'styles/stick-man/motion-lib/proof';
const shot = args => { const r = run('node', [SHOT, '--film', PAGE, ...args], { capture: true }); if (r.status) throw new Error(`shot.mjs ${args.join(' ')}\n${r.stderr || r.stdout}`); return r.stdout || ''; };
const clipBodies = C => (C.body ? [C.body] : ['adult']);
function lastFrame(C, body) {
  const key = { ...(C.advance ? { f: 6, clip: C.clip, body, to: [C.introTravel + C.outroTravel + 2 * C.advance, 0] } : { f: 6, clip: C.clip, body, ...(C.loop ? { times: 2 } : {}) }), ...fitOf(C) };
  const k = placeClip(key, { pos: [0, 0], yaw: 90 }).keys; return k[k.length - 1].f + 12;
}
function silence(dir, sec) { const w = path.join(dir, 'silence.wav'); if (!fs.existsSync(w)) run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', String(sec), w]); return w; }
export function sheet(group, out) {
  const clips = ALL.filter(c => c.group === group); if (!clips.length) throw new Error(`no clips in group ${group}`);
  fs.mkdirSync(out, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'motionlib-sheet-')), rows = [];
  for (const C of clips) for (const b of clipBodies(C)) {
    const L = lastFrame(C, b), fs6 = Array.from({ length: 6 }, (_, i) => Math.round(6 + (L - 12 - 6) * i / 5));
    shot(['--w', '540', '--h', '960', '--query', `clip=${C.clip}&body=${b}`, '--frames', fs6.join(','), '--out', path.join(tmp, `${C.name}_%d.jpg`)]);
    rows.push({ label: C.name, files: fs6.map(f => path.join(tmp, `${C.name}_${f}.jpg`)), frames: fs6 });
  }
  const spec = path.join(tmp, 'sheet.json'), dst = path.join(out, `sheet_${group}.jpg`);
  fs.writeFileSync(spec, JSON.stringify({ rows, out: dst, title: `motion-lib · ${group}` }));
  const py = run('python', [path.join(HERE, 'motionlib_sheet.py'), spec], { capture: true }); if (py.status) throw new Error(py.stderr);
  fs.rmSync(tmp, { recursive: true, force: true });
  return dst;
}
export function proof(out, only, fit) {
  fs.mkdirSync(out, { recursive: true });
  const wav = silence(out, 20), lines = [];
  for (const C of ALL) for (const b of clipBodies(C)) {
    if (only && C.clip !== only && C.name !== only) continue;
    const L = lastFrame(fit ? fitClip(C, JSON.parse(fit)) : C, b), tag = C.name;
    for (const ph of ['1', '0']) {
      const q = `clip=${C.clip}&body=${b}&phys=${ph}${fit ? `&fit=${encodeURIComponent(fit)}` : ''}`, ft = fit ? `_fit${fit.replace(/[^0-9a-z.]+/gi, '')}` : '';
      const mp4 = path.join(out, `${tag}${ft}_phys${ph}.mp4`), rep = path.join(out, `${tag}${ft}_phys${ph}.txt`);
      shot(['--frames', `0-${L}`, '--w', '540', '--h', '960', '--query', q, '--mp4', mp4, '--audio', wav]);
      shot(['--frames', `0-${L}`, '--w', '540', '--h', '960', '--query', q, '--report', rep, '--in', mp4, '--fast', '1']);
      lines.push(`${tag} phys ${ph}: ${mp4}`);
      process.stdout.write(`${tag} phys=${ph} done\n`);
    }
  }
  if (!only) for (const g of GROUPS) if (ALL.some(c => c.group === g)) lines.push(sheet(g, out));
  return lines;
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
  if ('catalogue' in A) { fs.writeFileSync(CATALOGUE, catalogue()); console.log(CATALOGUE); }
  else if (A.sheet) console.log(sheet(A.sheet, path.resolve(A.out || '.')));
  else if (A.proof) console.log(proof(path.resolve(A.proof), A.only, A.fit).join('\n'));
  else {
    if (A.check && !A.only) throw new Error('motionlib.mjs: --check needs --only <clip>');
    const rows = await checkAll({ only: A.only, check: A.check ? JSON.parse(A.check) : null }); let bad = 0;
    for (const r of rows) {
      const i = r.info, num = i.frames != null ? `  ${i.frames} f, joint ${i.jointMax} deg/f, slide ${i.slideMm} mm/f, flights ${i.flights}${i.flights ? ` (peak ${i.peakCm} cm, g 9.8)` : ''}${i.carryKg ? `, carries ${i.carryKg} kg` : ''}, rig: grip ${i.gripCm} cm, prop ${i.propCm0}>${i.propCm} cm (physics off ${i.propOffCm}), held ${i.heldFrames} f, solved joint ${i.rigJoint} deg/f (${i.rigJointAt}; over ${JOINT_STEP_MAX}: ${i.rigExcess})` : '';
      console.log(`${r.fails.length ? 'FAIL' : 'PASS'}  ${r.name || r.file}${num}`); for (const f of r.fails) console.log(`      ${f}`); if (r.known) console.log(`      ${r.known}`); bad += !!r.fails.length;
    }
    console.log(`${rows.filter(r => !/ fit /.test(r.name || '')).length} clips + ${rows.filter(r => / fit /.test(r.name || '')).length} fitted, ${bad} failing, ${rows.filter(r => r.known).length} known (JOINT_KNOWN, BODY_KNOWN)`); process.exit(bad ? 1 : 0);
  }
}
