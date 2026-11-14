// The motion library's standard poses and key builders. Every clip is written in CLIP SPACE: the actor starts at the
// origin facing +x (yaw 90), metres for pos and planted feet (footW), the figure frame (W) for arm ik targets. index.js
// moves a clip to where the actor is and the way it faces. Every clip starts and ends on a standard pose (STAND, SIT,
// CARRY) or is a seamless loop, so clips chain in any order.
import { BODIES } from './bodies.js';
import { legReach, SOFT } from '../engine/body.js';
import { mocapCycle } from './ref/mocap.js';
// the 'kaiships' dose's exaggeration (engine/motion.js: 0.4 + 1.2 x exaggeration 0.75); the gait solves its hips on played values
export const DOSE_E = 1.3;

export const FY = 0.132;                                  // half the feet spacing at STAND (m): 0.22 W
// the standard pose (REEL_DATA.md motion v2) and its moving hold; periods divide every idle loop's length
export const STAND = { bob: 0, sq: 0, spine: { bend: 0, side: 0, twist: 0 }, neck: { nod: 0, tilt: 0, turn: 0 }, pelvis: { pitch: 0, roll: 0, yaw: 0 },
  armL: { raise: 12, swing: 0, elbow: 15, roll: 0 }, armR: { raise: 12, swing: 0, elbow: 15, roll: 0 },
  legL: { foot: [-0.22, 0.022, 0], pitch: 0, knee: [-0.15, 0, 1] }, legR: { foot: [0.22, 0.022, 0], pitch: 0, knee: [0.15, 0, 1] } };
export const BREATH = { 'spine.bend': [1.5, 40], 'neck.tilt': [1.2, 80, 1] };

const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
export function merge(a, ...bs) {
  let o = { ...a };
  for (const b of bs) for (const [k, v] of Object.entries(b || {})) o[k] = isObj(v) && isObj(o[k]) ? merge(o[k], v) : v;
  return o;
}
const fy = body => FY * (BODIES[body].spec.scale ?? 1) * BODIES[body].stance;
const feet = (body, x, xl = x, xr = x) => ({ legL: { footW: [xl, -fy(body), 0], pitch: 0 }, legR: { footW: [xr, fy(body), 0], pitch: 0 } });
// STAND for a body at x (clip space)
export const stand = (body = 'adult', x = 0) => merge(STAND, BODIES[body].posture, { pos: [x, 0, 0], yaw: 90, shrugL: 0, shrugR: 0 }, feet(body, x));
// SIT on a knee-high seat (0.45 m) whose front edge is at x: the feet forward, the pelvis on the seat; the seat carries the
// weight, so balance is off (`fall` is the rig's switch for a body supported by something other than its feet)
export const sit = (body = 'adult', x = 0) => merge(STAND, BODIES[body].posture, { pos: [x, 0, 0], yaw: 90, bob: -0.56, fall: 1, spine: { bend: 4 },
  armL: { raise: 10, swing: 30, elbow: 40 }, armR: { raise: 10, swing: 30, elbow: 40 } }, feet(body, x + 0.40));
// CARRY one heavy bag (25 kg) in the right fist: the bag arm straight and dragged down a little out from the leg so the
// bag clears it, the whole body bent away from the load (the shoulders tip, the head counters), the knees soft, the
// free arm out wide for balance
export const CARRY_KG = 25;
export const carry = (body = 'adult', x = 0) => merge(stand(body, x), { bob: -0.06, shrugR: -0.08, spine: { side: -17, bend: 10 }, neck: { tilt: 13, nod: -4 }, pelvis: { roll: 7 },
  armR: { raise: 26, swing: 4, elbow: 6 }, armL: { raise: 72, swing: 10, elbow: 18 }, x_hpR_bag: 1, x_kgR: CARRY_KG });
export const BASES = { STAND: stand, SIT: sit, CARRY: carry };

// a key: the whole pose named (so every key stands alone), ease 'slow' unless given
export const K = (f, pose, over = {}) => ({ f, ...merge(pose, over), ease: over.ease || 'slow' });

// a gait loop of two steps (left, then right) on planted feet, from the body's numbers (bodies.js) and overrides: a key
// a frame, sampled from the curves below (docs/MOTION-RULES.md says which rule each one keeps). A planted foot never
// moves; a swing foot leaves its print and lands on the next. upper(sgn): the arms and anything else on top, sgn = +1
// when the right arm swings forward (continuous, -1..1). Returns { keys, frames, advance, intro, introFrames,
// introTravel, outro, outroTravel }: intro = the first step from the standard pose, outro = the closing step back to it.
// a one-off from motion capture (a jump in place): its frames on this body, from STAND and back to it (`ease` frames each
// way), the feet on the standing prints
export function mocapOnce({ body = 'adult', src, ease = 8 }) {
  const { keys, frames } = gaitLoop({ body, kind: 'walk', mocap: src, once: true }), s0 = stand(body, 0);
  const mid = keys.map(k => ({ ...k, f: k.f + ease }));
  const s1 = merge(s0, { hip: { x: 0 } });
  return { keys: [K(0, s1, { ease: 'slow' }), ...mid, K(frames + 2 * ease, s1, { ease: 'slow' })], frames: frames + 2 * ease, captured: [ease, ease + frames] };
}

export function gaitLoop({ body = 'adult', kind = 'walk', upper, base, ...over }) {
  const B = BODIES[body], G = { ...B[kind], ...over }, run = kind === 'run', L = G.lift;
  // a runner's feet land close to the line under the body (Kai's reference: inside the hips), a walker's a hip apart
  let Y = run ? (G.lane ?? 0.45) * fy(body) : fy(body);
  // a reference cycle (motion-lib/ref/: key poses taken from footage, ported 1:1) sets the step: its timing at 30 fps and
  // its stride scaled by this body's leg against the reference's
  const RF = G.ref, kR = RF ? (2 * 0.679 * (B.spec.legScale ?? 1) * 0.6 * (B.spec.scale ?? 1)) / RF.leg : 1;
  if (RF) { G.T = RF.cycle / 2 * 30 / RF.fps; G.S = RF.speed * kR * RF.cycle / 2; G.ts = RF.stance * 30 / RF.fps; G.reach = RF.pose(0).legs.L.a[0] * kR / G.S; }
  // a motion-capture cycle (ref/mocap.js): its frames on this body, its own step and travel
  const MC = G.mocap ? mocapCycle(G.mocap, { legM: 2 * 0.679 * (B.spec.legScale ?? 1) * 0.6 * (B.spec.scale ?? 1), once: !!G.once }) : null;
  if (MC) { Y = MC.lane; G.T = MC.cycle / 2; G.S = MC.advance / 2; G.ts = Math.round(G.T * (run ? 0.4 : 1.15)); G.reach = MC.firstPrint / G.S; }
  const { S, T } = G;
  const pose0 = base ? base(body, 0) : stand(body, 0);
  // A: the walk's size (1 = the body's numbers; <1 plainer, >1 broader): the hips' rise and fall, turn, tilt and shift,
  // the shoulders' counter and the arm swing all scale with it
  const A = G.char ?? 1, asym = G.asym ?? 0.08;
  // the arms: the forward arm bends more (continuous in sgn, so a swing through the middle never jumps the elbow); the two
  // sides are never twins (W: twinning): the right swings a little less and holds its elbow a little more bent
  const arms = sgn => ({ armL: { raise: G.raise ?? pose0.armL.raise, swing: (G.swing0 ?? 0) - sgn * G.swing * A * (1 + asym), elbow: G.elbow + 10 * Math.max(0, -sgn) },
    armR: { raise: G.raise ?? pose0.armR.raise, swing: (G.swing0 ?? 0) + sgn * G.swing * A * (1 - asym), elbow: G.elbow + 4 + 10 * Math.max(0, sgn) } });
  const up = sgn => (upper ? upper(sgn) : arms(sgn));
  // a runner leans from the hips with a straight back (pelvis pitch), never by curling the spine
  const body0 = (x, sgn, extra = {}) => merge(pose0, { pos: [x, 0, 0], spine: { bend: (pose0.spine.bend || 0) + G.bend }, pelvis: { roll: G.sway * sgn, pitch: (pose0.pelvis?.pitch || 0) + (G.lean ?? 0) } }, up(sgn), extra);
  const foot = (x, y, z = 0, pitch = 0) => ({ footW: [x, y, z], pitch });
  // print k: the k-th heel strike at x = (k + 1/2) S, left for even k; the body halfway between the feet. A run lands
  // its foot just ahead of the hips (reach, share of a step), not half a step out: a foot thrown far ahead lands on a
  // locked knee that then folds tens of degrees in a frame
  // print k (a captured cycle's own prints: left on even k, right on odd)
  const land = k => (MC ? (k % 2 === 0 ? MC.prints.L + (k / 2) * MC.advance : MC.prints.R + ((k - 1) / 2) * MC.advance) : (k + (run ? G.reach ?? 0.28 : 0.5)) * S), yOf = sd => (MC ? (sd === 'L' ? MC.prints.yL : MC.prints.yR) : sd === 'L' ? -Y : Y), Y0 = fy(body);
  // a print's sideways place: the gait's lane (a loop repeats, so every print is in it); the first and closing steps put
  // the standing feet at the standing width (Y0) themselves
  const yAt = sd => yOf(sd);
  const px = t => S * t / T;                                            // the body's travel t frames into the loop
  // THE HIPS COME FROM THE LEGS. A key names the knee flex a planted leg shows (deg); the hip height is solved from
  // where that foot is, so the knee follows the flex it was given and never snaps: near straight a centimetre of hip
  // height turns the knee tens of degrees, and a bob keyed by hand cannot hit that. Several legs: the hip sits where the
  // lowest one allows (the other is then a little more bent). Figure units (W, cast.js): legs 2 x 0.679 x legScale, the
  // hip joint 1.38 above the ground at bob 0 less the shorter legs' drop, 0.14 out from the middle, turned and tilted
  // with the pelvis; the ankle rides up on the heel or the toe as the foot pitches; metres / (0.6 x scale).
  // The 'kaiships' dose plays bob and the pelvis 1.3x further from the base pose (motion.js exaggeration 0.4 + 1.2 x 0.75):
  // the solve works on the played values and writes the bob back unexaggerated (test/unit/stick-motionlib.test.mjs pins it).
  const sc = B.spec.scale ?? 1, LK = B.spec.legScale ?? 1, legW = 2 * 0.679 * LK, DROP = (1 - LK) * legW, mW = 1 / (0.6 * sc), DEG = Math.PI / 180;
  const sole = p => 0.004 + (p > 0 ? 0.08 * Math.sin(p * DEG) : 0.122 * Math.sin(-p * DEG));
  const legBob = (P, want) => {
    const rb = pose0.bob || 0, yaw = (pose0.pelvis?.yaw || 0) + ((P.pelvis?.yaw || 0) - (pose0.pelvis?.yaw || 0)) * DOSE_E, roll = (pose0.pelvis?.roll || 0) + ((P.pelvis?.roll || 0) - (pose0.pelvis?.roll || 0)) * DOSE_E;
    let best = Infinity;
    for (const [s, fl] of Object.entries(want)) {
      const g = P['leg' + s]; if (fl == null || !g?.footW) continue;
      const out = s === 'L' ? -1 : 1, fwd = (g.footW[0] - P.pos[0]) * mW + out * 0.14 * Math.sin(yaw * DEG), lat = g.footW[1] * mW - (out * 0.14 * Math.cos(yaw * DEG) + (P.hip?.x || 0));
      const d = legW * legReach(fl), z = g.footW[2] * mW + 0.022 + sole(g.pitch || 0) + Math.sqrt(Math.max(0.25 * legW * legW, d * d - fwd * fwd - lat * lat));
      best = Math.min(best, z - 1.38 + DROP + out * 0.14 * Math.sin(roll * DEG));
    }
    return rb + (best - rb) / DOSE_E;
  };
  // The gait, sampled every frame from continuous curves (a key a frame: the curves are the animation, the keys only
  // carry them), layer by layer as an animator builds a walk (hips, legs, spine and shoulders, arms, head). Each leg runs
  // its own cycle c (in steps, 0 = its heel strike, 2 = the next): stance while c < cs (a walk's foot stays down a fifth
  // of a step past the other's contact: double support), then swing (docs/MOTION-RULES.md):
  //   knees (W3-W6): a stance knee near straight at contact, giving at Down just after it (the weight lands after the
  //     heel: the hips at their lowest), straight through passing and Up (the hips highest as the heel peels), bending as
  //     the leg trails to toe-off; a swing knee folds early and opens to near straight just before the heel lands.
  //     knees = [contact, down, passing, up, trail, toe-off] (walk) or [contact, down, toe-off] (run); Down grows with A
  //   hips up and down: solved from the stance leg's knee (legBob), so the knee shows the curve it was given
  //   swing foot: the hip-to-ankle line swung forward (its length from the knee's bend), eased onto the toe-off print and
  //     the next print so it leaves and lands exactly there
  //   hips sideways (W13): over the stance foot, most at passing; hips turn (rotate): the forward leg's side forward at
  //     contact; hips tilt (roll, the belt line, Williams p147): the lifted leg's side up, the planted side down, most at Down
  //   shoulders and spine (counter-rotation): turn and tilt against the hips, so the chest stays nearly square
  //   arms (W9-W10): opposite the legs, widest just after contact (at Down), not on it
  //   head: steadier than the hips (it counters the bob), facing ahead against the shoulders' turn
  const uD = run ? Math.max(1, Math.round(T * 0.2)) / T : 0.2, cs = run ? G.ts / T : G.stance ?? 1.15, toe = G.toe ?? 22;
  const kn = G.knees ?? (run ? [12, 34, 14] : [4, 18, 6, 4, 12, 36]), kD = kn[0] + (kn[1] - kn[0]) * A;
  const yaw0 = (G.yaw ?? 5) * A, shift0 = (G.shift ?? (run ? 0.012 : 0.022)) * A, cr = G.counter ?? 0.6, ct = G.counterTilt ?? 0.5, lag = G.lag ?? uD;
  const curve = (P, x) => { if (x <= P[0][0]) return P[0][1]; for (let i = 1; i < P.length; i++) if (x <= P[i][0]) { const [a, va] = P[i - 1], [b, vb] = P[i], w = (x - a) / (b - a); return va + (vb - va) * w * w * (3 - 2 * w); } return P[P.length - 1][1]; };
  const KS = run ? [[0, kn[0]], [cs / 2, kD], [cs, kn[2]]] : [[0, kn[0]], [0.2, kD], [0.5, kn[2]], [0.8, kn[3]], [1.0, kn[4]], [cs, kn[5]]];
  const KW = run ? [[0, kn[2]], [0.45, G.kick ?? 100], [0.7, 0.75 * (G.kick ?? 100)], [0.88, 35], [1, kn[0]]] : [[0, kn[5]], [0.35, G.kick ?? 60], [0.75, 25], [1, kn[0]]];
  // the stance heel: down from Down, peeling from Up so the stance toe lifts the body to its highest (Williams p108)
  const PS = run ? [[0, 6], [uD, 0], [cs, -(G.toeOff ?? 50)]] : [[0, 8], [0.2, 0], [0.55, 0], [0.75, -8], [1.0, -14], [cs, -toe]];
  const PHI = run ? [[0, -28], [0.5, -5], [1, 10]] : [[0, -18], [0.5, 4], [1, 18]];
  const hgt = run ? Math.max(0.021, 9.8 * ((T - G.ts) / 30) ** 2 / 8) : 0;
  const leg = (s, t) => { const c0 = t / T - (s === 'R' ? 1 : 0), n = Math.floor(c0 / 2); return { c: c0 - 2 * n, j: 2 * n + (s === 'R' ? 1 : 0) }; };
  // the body at frame t (any t: the loop's curves repeat, the travel does not), without its bob
  const torso = t => {
    const sl = leg('L', t), sr = leg('R', t), st = (run ? (sl.c < cs ? 'L' : sr.c < cs ? 'R' : (sl.c < sr.c ? 'L' : 'R')) : (sl.c < sr.c ? 'L' : 'R'));
    const u = (st === 'L' ? sl.c : sr.c) % 1, sg = st === 'L' ? 1 : -1, ph = (st === 'L' ? sl.c : sr.c);
    const yaw = yaw0 * sg * Math.cos(Math.PI * u), roll = -G.sway * A * sg * Math.cos(Math.PI * (u - uD)), armS = sg * Math.cos(Math.PI * (u - lag));
    const lu = run ? (((t / T) % 1) + 1) % 1 : 0, pz = run && lu > cs ? 4 * hgt * ((lu - cs) / (1 - cs)) * (1 - (lu - cs) / (1 - cs)) : 0;
    const P = merge(body0(px(t), armS), { pos: [px(t), 0, pz], hip: { x: -sg * shift0 * Math.sin(Math.PI * u) }, pelvis: { roll, yaw },
      spine: { twist: -(1 + cr) * yaw, side: (pose0.spine.side || 0) - (1 + ct) * roll, ...(run ? { bend: (pose0.spine.bend || 0) + G.bend + (G.curve ?? 4) * sg * Math.cos(Math.PI * u) } : {}) },
      neck: { turn: (pose0.neck.turn || 0) + 0.8 * cr * yaw, tilt: (pose0.neck.tilt || 0) + 0.8 * ct * roll } });
    return { P, st, sl, sr, ph, armS };
  };
  // the knee flex a leg shows at hip-to-ankle share r of its length (the inverse of legReach)
  const flexOf = r => { const fs = 2 * Math.acos(SOFT.leg) / DEG; if (r <= SOFT.leg) return 2 * Math.acos(Math.max(-1, r)) / DEG; const w = Math.min(1, (r - SOFT.leg) / (1 - SOFT.leg)); return fs * (1 - w * w * (3 - 2 * w)); };
  // a trailing foot (past the other's contact) peels its heel as far as the leg needs to keep the knee it was given:
  // the ankle rides up on the toe (0.122 W out), up to 60 deg of pitch
  const heelFor = (P, s, j, c) => {
    const out = s === 'L' ? -1 : 1, yaw = ((P.pelvis.yaw || 0) - (pose0.pelvis?.yaw || 0)) * DOSE_E + (pose0.pelvis?.yaw || 0), roll = ((P.pelvis.roll || 0) - (pose0.pelvis?.roll || 0)) * DOSE_E + (pose0.pelvis?.roll || 0);
    const bp = (pose0.bob || 0) + (P.bob - (pose0.bob || 0)) * DOSE_E, hz = 1.38 + bp - DROP - out * 0.14 * Math.sin(roll * DEG);
    const fwd = (land(j) - P.pos[0]) * mW + out * 0.14 * Math.sin(yaw * DEG), lat = yAt(s, j) * mW - (out * 0.14 * Math.cos(yaw * DEG) + (P.hip?.x || 0)), d = legW * legReach(curve(KS, c));
    const az = hz - Math.sqrt(Math.max(0, d * d - fwd * fwd - lat * lat)) - 0.022 - 0.004;
    return -Math.asin(Math.max(0, Math.min(Math.sin(60 * DEG), az / 0.122))) / DEG;
  };
  const planted = (s, j, c) => foot(land(j), yAt(s, j), 0, curve(PS, c));
  // the bob at frame t: from the stance leg's knee (the other planted foot only caps it, so that leg never over-reaches);
  // in a run's flight the bob runs straight from the push-off to the landing and gravity carries the body (pos.2)
  const bobOf = t => {
    const { P, st, sl, sr } = torso(t), L_ = { L: sl, R: sr }, a = L_[st];
    if (a.c >= cs) { const lu = (((t / T) % 1) + 1) % 1, t0 = t - (lu - cs) * T, t1 = t0 + (1 - cs) * T, w = (t - t0) / (t1 - t0); return bobOf(t0 - 1e-6) * (1 - w) + bobOf(t1 + 1e-6) * w; }
    const o = st === 'L' ? 'R' : 'L', b = L_[o], Q = merge(P, { ['leg' + st]: planted(st, a.j, a.c) });
    let bob = legBob(Q, { [st]: curve(KS, a.c) });
    if (b.c < cs) bob = Math.min(bob, legBob(merge(P, { ['leg' + o]: b.c >= 1 ? foot(land(b.j), yAt(o, b.j), 0, -60) : planted(o, b.j, b.c) }), { [o]: 2 }));
    return bob;
  };
  // a swing foot at frame t: the hip-to-ankle line at angle phi (deg from straight down, + forward), its length from the
  // knee's bend, eased onto the print it left and the one it lands on
  const fk = (s, t, kneeDeg, phi, pitch) => {
    const { P } = torso(t), bob = bobOf(t), out = s === 'L' ? -1 : 1;
    const yaw = ((P.pelvis.yaw || 0) - (pose0.pelvis?.yaw || 0)) * DOSE_E + (pose0.pelvis?.yaw || 0), roll = ((P.pelvis.roll || 0) - (pose0.pelvis?.roll || 0)) * DOSE_E + (pose0.pelvis?.roll || 0);
    const bp = (pose0.bob || 0) + (bob - (pose0.bob || 0)) * DOSE_E, hz = 1.38 + bp - DROP + P.pos[2] * mW - out * 0.14 * Math.sin(roll * DEG), hf = -out * 0.14 * Math.sin(yaw * DEG);
    const d = legW * legReach(kneeDeg);
    return [P.pos[0] + (hf + d * Math.sin(phi * DEG)) / mW, (hz - d * Math.cos(phi * DEG) - 0.022 - sole(pitch)) / mW];
  };
  // a planted foot at frame t: a walk's trailing foot peels its heel as the leg needs
  const plant = (s, t, j, c) => { const f0 = planted(s, j, c); if (c < (run ? uD : 0.55)) return f0; const P = merge(torso(t).P, { bob: bobOf(t) }); return { ...f0, pitch: Math.min(f0.pitch, heelFor(P, s, j, c)) }; };
  // the knee and the pitch a leg leaves the floor with (the swing starts from them, so nothing jumps at toe-off)
  const offL = (() => { const t0 = cs * T, P = merge(torso(t0).P, { bob: bobOf(t0) }), f0 = plant('L', t0, 0, cs);
    const out = -1, yaw = ((P.pelvis.yaw || 0) - (pose0.pelvis?.yaw || 0)) * DOSE_E + (pose0.pelvis?.yaw || 0), roll = ((P.pelvis.roll || 0) - (pose0.pelvis?.roll || 0)) * DOSE_E + (pose0.pelvis?.roll || 0);
    const bp = (pose0.bob || 0) + (P.bob - (pose0.bob || 0)) * DOSE_E, hz = 1.38 + bp - DROP - out * 0.14 * Math.sin(roll * DEG);
    const fwd = (land(0) - P.pos[0]) * mW + out * 0.14 * Math.sin(yaw * DEG), lat = -Y * mW - (out * 0.14 * Math.cos(yaw * DEG) + (P.hip?.x || 0)), az = 0.022 + sole(f0.pitch);
    return { knee: flexOf(Math.hypot(fwd, lat, hz - az) / legW), pitch: f0.pitch, phi: Math.atan2(fwd, hz - az) / DEG }; })();
  KW[0][1] = offL.knee;
  // the hip-to-ankle line at the heel strike (the left foot landing on its next print), so the swing ends where it lands
  const onL = (() => { const t1 = 2 * T, P = merge(torso(t1).P, { bob: bobOf(t1) }), yaw = ((P.pelvis.yaw || 0) - (pose0.pelvis?.yaw || 0)) * DOSE_E + (pose0.pelvis?.yaw || 0);
    const roll = ((P.pelvis.roll || 0) - (pose0.pelvis?.roll || 0)) * DOSE_E + (pose0.pelvis?.roll || 0), bp = (pose0.bob || 0) + (P.bob - (pose0.bob || 0)) * DOSE_E;
    const hz = 1.38 + bp - DROP + 0.14 * Math.sin(roll * DEG), fwd = (land(2) - P.pos[0]) * mW - 0.14 * Math.sin(yaw * DEG); return Math.atan2(fwd, hz - 0.022 - sole(8)) / DEG; })();
  // the swing line: a run's leg trails on back after the push-off while the knee folds, then reaches out ahead and comes
  // back onto the print; a walk's swings through
  PHI.splice(0, PHI.length, ...(run ? [[0, offL.phi], [0.15, offL.phi - 6], [0.6, (offL.phi + onL) / 2 + 10], [0.85, onL + 8], [1, onL]] : [[0, offL.phi], [0.5, (offL.phi + onL) / 2 + 2], [1, onL]]));
  const swing = (s, t, j, c) => {
    // a walk's foot picks up slowly, travels fast through the middle and puts down fast (Williams p139): the swing's own
    // clock runs slow at the start and fast at the end
    const w0 = (c - cs) / (2 - cs), w = run ? w0 : w0 * w0 * (2 - w0), t0 = t - (c - cs) * T, t1 = t0 + (2 - cs) * T, e = w * w * (3 - 2 * w), p0 = offL.pitch, pitch = p0 + (8 - p0) * e;
    const [x, z] = fk(s, t, curve(KW, w), curve(PHI, w), pitch), [x0, z0] = fk(s, t0, curve(KW, 0), curve(PHI, 0), p0), [x1, z1] = fk(s, t1, curve(KW, 1), curve(PHI, 1), 8);
    const fx = x + (land(j) - x0) * (1 - e) + (land(j + 2) - x1) * e, fz = z - z0 * (1 - e) - z1 * e;
    return foot(fx, yAt(s, j) * (1 - e) + yAt(s, j + 2) * e, Math.max(w > 0 && w < 1 ? 0.006 : 0, fz), pitch);
  };
  const frame = t => { const { P, sl, sr } = torso(t), legs = {};
    for (const [s, l] of [['L', sl], ['R', sr]]) legs['leg' + s] = l.c < cs ? plant(s, t, l.j, l.c) : swing(s, t, l.j, l.c);
    return merge(P, legs, { bob: bobOf(t) }); };
  // a reference cycle, frame by frame: the trunk tipped from the hips, the pelvis turned and tilted, the shoulders against
  // it, the arms (world angles in the reference: on the leaning trunk they swing that much further forward), the hips at the reference's height,
  // a planted foot fixed on its print and rolling heel to toe, a swing foot where the reference's leg puts it (eased off
  // the print it left). The 'kaiships' dose plays these channels DOSE_E further from the base pose, so they are written
  // back by that much: the film plays the reference as it is
  const un = (v, r = 0) => r + (v - r) / DOSE_E;
  const refFrame = t => {
    const tr = t * RF.fps / 30, p = RF.pose(tr), x = px(t), hipM = p.hip * kR, bob = hipM * mW - 1.38 + DROP;
    const P = merge(pose0, { pos: [x, 0, 0], bob: un(bob, pose0.bob || 0), hip: { x: -p.sway * kR * mW },
      pelvis: { pitch: un(p.lean, pose0.pelvis?.pitch || 0), roll: un(-p.roll, pose0.pelvis?.roll || 0), yaw: un(p.yaw, pose0.pelvis?.yaw || 0) },
      spine: { bend: pose0.spine.bend || 0, side: pose0.spine.side || 0, twist: un(p.shoulderYaw - p.yaw, pose0.spine.twist || 0) },
      neck: { nod: un((pose0.neck.nod || 0) - 0.55 * p.lean, pose0.neck.nod || 0), turn: un(-0.25 * p.shoulderYaw, pose0.neck.turn || 0), tilt: pose0.neck.tilt || 0 } });
    for (const sd of ['L', 'R']) { const [ua, el] = p.arms[sd], a0 = pose0['arm' + sd]; P['arm' + sd] = { ...a0, swing: un(ua + p.lean, a0.swing || 0), elbow: un(el, a0.elbow || 0) }; }
    for (const sd of ['L', 'R']) {
      const off = sd === 'R' ? RF.cycle / 2 : 0, tl = (((tr - off) % RF.cycle) + RF.cycle) % RF.cycle, j = 2 * Math.floor((tr - off) / RF.cycle) + (sd === 'R' ? 1 : 0);
      const { a, fa } = p.legs[sd], pitch = fa - 90;
      if (tl < RF.stance) { P['leg' + sd] = foot(land(j), yAt(sd, j), 0, pitch); continue; }
      // the swing: the reference's ankle, plus whatever separates it from this foot's print at the push-off, fading out
      const t0 = t - (tl - RF.stance) * 30 / RF.fps, p0 = RF.pose(t0 * RF.fps / 30), x0 = px(t0) + p0.legs[sd].a[0] * kR, w = Math.min(1, (tl - RF.stance) / 2.5), e = 1 - w * w * (3 - 2 * w);
      P['leg' + sd] = foot(x + a[0] * kR + (land(j) - x0) * e, yAt(sd, j) * e + yAt(sd, j + 2) * (1 - e), Math.max(0, (p.hip + a[1]) * kR - 0.022 * 0.6 * sc), pitch);
    }
    return P;
  };
  // a motion-capture frame: the captured body as the rig's channels (the dose written back out, as for a reference)
  const mcFrame = t => {
    const n = MC.cycle, i = ((t % n) + n) % n, c = Math.floor(t / n) * MC.advance, m = MC.frames[i], sh = p => [p[0] + c, p[1], p[2]];
    const bob = (m.hipZ + 0.022 * 0.6 * sc) * mW - 1.38 + DROP, P = merge(pose0, { pos: [m.pos[0] + c, 0, 0], bob: un(bob, pose0.bob || 0), hip: { x: m.hipY * mW },
      pelvis: { pitch: un(m.lean, pose0.pelvis?.pitch || 0), roll: un(m.roll, pose0.pelvis?.roll || 0), yaw: un(m.yaw, pose0.pelvis?.yaw || 0) },
      spine: { bend: pose0.spine.bend || 0, side: pose0.spine.side || 0, twist: un(m.twist, pose0.spine.twist || 0) },
      neck: { nod: un((pose0.neck.nod || 0) + m.nod, pose0.neck.nod || 0), turn: pose0.neck.turn || 0, tilt: pose0.neck.tilt || 0 } });
    for (const sd of ['L', 'R']) { const a = m['arm' + sd], a0 = pose0['arm' + sd]; P['arm' + sd] = { ...a0, raise: un(a.raise, a0.raise || 0), swing: un(a.swing, a0.swing || 0), elbow: un(a.elbow, a0.elbow || 0), roll: un(a.roll, a0.roll || 0) };
      P['leg' + sd] = { footW: sh(m['leg' + sd].footW), pitch: m['leg' + sd].pitch }; }
    // a one-off in place (a jump): a foot down stands on its standing print (the capture's stance is a little staggered),
    // and while both feet are up the hips' rise is the body's own height off the ground (pos.2), which gravity then owns
    if (G.once) {
      for (const sd of ['L', 'R']) if (m.down[sd] || m['leg' + sd].footW[2] < 0.012) P['leg' + sd] = { footW: [0, sd === 'L' ? -Y0 : Y0, 0], pitch: m['leg' + sd].pitch };
      if (!m.down.L && !m.down.R) { const z = Math.max(0, m.hipZ - MC.standHip); P.pos = [P.pos[0], 0, z]; P.bob = un(MC.standHip * mW + 0.022 * 0.6 * sc * mW - 1.38 + DROP, pose0.bob || 0); }
    }
    // the hips' height from the planted legs' captured knees (legBob), not the captured height: this leg is not the
    // capture's, and near straight a centimetre of height is tens of degrees of knee
    const want = {}; for (const sd of ['L', 'R']) if (m.down[sd]) want[sd] = m['knee' + sd];
    if (Object.keys(want).length) P.bob = legBob(P, want);
    return P;
  };
  const keys = [];
  if (G.once) { for (let t = 0; t < MC.cycle; t++) keys.push(K(t, mcFrame(t), { ease: 'flow' })); return { keys, frames: MC.cycle - 1 }; }
  for (let t = 0; t <= 2 * T; t++) keys.push(K(t, MC ? mcFrame(t) : RF ? refFrame(t) : frame(t), { ease: 'flow' }));
  // a heel never peels faster than PEEL deg a frame: where the leg asks for more, the peel starts earlier (the loop wraps)
  const PEEL = 16;
  const N = 2 * T;
  for (const s of ['L', 'R']) for (let pass = 0; pass < 3; pass++) for (let t = N; t > 0; t--) {
    const a = keys[t - 1]['leg' + s], b = keys[t % N]['leg' + s], dx = t === N ? 2 * S : 0;
    if (a.footW[2] > 0 || b.footW[2] > 0 || Math.abs(a.footW[0] - dx - b.footW[0]) > 1e-9) continue;
    if (a.pitch - b.pitch > PEEL) a.pitch = b.pitch + PEEL;
  }
  for (const s of ['L', 'R']) keys[N]['leg' + s].pitch = keys[0]['leg' + s].pitch;
  // the head rides steadier than the hips: it nods against the bob, most at the lowest and highest hips
  const bobs = keys.map(k => k.bob), bMid = (Math.max(...bobs) + Math.min(...bobs)) / 2, bHalf = Math.max(1e-3, (Math.max(...bobs) - Math.min(...bobs)) / 2);
  // a runner leans in from the hips and lifts the head back up to look ahead
  const look = run ? -0.8 * ((G.lean ?? 0) + G.bend) : 0;
  for (const k of keys) k.neck = { ...k.neck, nod: (pose0.neck.nod || 0) + look - G.nod * A * (k.bob - bMid) / bHalf };
  // the first step from STAND: the weight onto the right foot, the left heel peels, swings, lands at the loop's first
  // contact; the right stays where it stood (S/2 behind the loop's origin) and, for a run, peels last
  // the arms grow into the gait's swing over the first step and settle out of it over the last (a run's elbows fold a lot)
  const easeArms = (w, sgn = 0) => { const a = up(sgn); for (const sd of ['armL', 'armR']) if (a[sd]?.elbow != null) a[sd] = { ...a[sd], elbow: pose0[sd].elbow + w * (a[sd].elbow - pose0[sd].elbow), swing: (pose0[sd].swing || 0) + w * ((a[sd].swing ?? 0) - (pose0[sd].swing || 0)) }; return a; };
  const step = (f, x, legs, want, arms, ease = 'flow') => { const p = body0(x, 0, { ...arms, ...legs }); return K(f, merge(p, { bob: legBob(p, want) }), { ease }); };
  // the first step hands over to the loop's own last frames (moved back a cycle) before its start (a run's: from the back foot's push-off), so the gait never jumps into the loop
  // a captured run starts from the loop's own frames after a short settle (its first strides are the capture's)
  const mcRun = MC && run, upL = (() => { let n = 0; while (n < 2 * T - 1 && keys[2 * T - 1 - n].legL.footW[2] > 0.005) n++; return n; })(), nh = mcRun ? Math.max(2, Math.min(Math.round(T * 0.8), upL)) : run ? Math.ceil((1 - cs) * T) + 1 : 3, hand = Array.from({ length: nh }, (_, i) => nh - i);
  const Ti = mcRun ? nh + 12 : Math.round(T * (run ? 2 : 1.6)), s0 = land(-1), fi = x => Math.round(Ti * x), kS = run ? kn[0] : kn[2];
  const intro = [K(0, merge(pose0, { pos: [s0, 0, 0] }, feet(body, s0)), { ease: 'slow' }),
    // a captured run's first move: the left heel peels straight up off its standing print before it swings
    ...(mcRun ? [K(4, merge(pose0, { pos: [s0, 0, 0] }, feet(body, s0), { legL: { footW: [s0, -Y0, 0.03], pitch: -15 } }), { ease: 'flow' })] : []),
    ...(mcRun ? [] : [step(fi(0.3), s0 + 0.03, { legL: foot(s0, -Y0, L * 0.3, -25), legR: foot(s0, Y0) }, { R: kS + 2 }, easeArms(0.3)),
      step(fi(0.55), s0 + 0.3 * (-s0), { legL: foot((s0 + land(0)) / 2, -Y, L, -10), legR: foot(s0, Y0, 0, run ? -20 : 0) }, { R: kS }, easeArms(0.6, 0.6 * torso(-nh).armS))]),
    ...hand.map(d => { const k = keys[2 * T - d], m = merge(k, { pos: [k.pos[0] - 2 * S, k.pos[1], k.pos[2]] });
      // a foot still down on the print it stood on keeps the standing width (it has not been lifted to move in)
      for (const sd of ['legL', 'legR']) m[sd] = { ...k[sd], footW: [k[sd].footW[0] - 2 * S, k[sd].footW[2] <= 0.005 && k[sd].footW[0] - 2 * S <= s0 + 1e-6 ? (sd === 'legL' ? -Y0 : Y0) : k[sd].footW[1], k[sd].footW[2]] };
      delete m.f; delete m.ease; return K(Ti - d, m, { ease: 'flow' }); })];
  // the closing step. A walk: the back foot comes up beside the front one, the body settles over both. A run brakes: the
  // swinging right foot lands ahead (the knee takes the stop), the left pushes off and comes up beside it, the body
  // rises over both
  const xe = 2 * S, Te = Math.round(T * (run ? 2.8 : 1.6)), fo = x => Math.round(Te * x);
  const xf = run ? xe + 0.6 * S : land(2), rb = land(1);
  const outro = run ? [
    step(fo(0.2), xe + 0.3 * S, { legL: foot(land(2), yOf('L'), 0, -20), legR: foot(xf, Y0, L * 0.25, 6) }, { L: kn[2] + 6 }, easeArms(0.6, 0.4)),
    step(fo(0.4), xe + 0.48 * S, { legL: foot(land(2), yOf('L'), L * 0.4, -25), legR: foot(xf, Y0) }, { R: kD }, easeArms(0.4)),
    step(fo(0.65), xe + 0.57 * S, { legL: foot((land(2) + xf) / 2, -(Y + Y0) / 2, L * 0.5, -5), legR: foot(xf, Y0) }, { R: kn[0] }, easeArms(0.2)),
    step(fo(0.85), xf, { legL: foot(xf, -Y0, 0.01, 3), legR: foot(xf, Y0) }, { R: 6 }, easeArms(0.05)),
    K(Te, merge(pose0, { pos: [xf, 0, 0], hip: { x: 0 } }, feet(body, xf)), { ease: 'slow' })] : [
    step(fo(0.25), xe + 0.1 * S, { legL: foot(xf, yOf('L')), legR: foot(rb, yOf('R'), L * 0.3, -25) }, { L: kn[1] }, easeArms(0.7, 0.5)),
    step(fo(0.5), xe + 0.3 * S, { legL: foot(xf, yOf('L')), legR: foot((rb + xf) / 2, yOf('R'), L * 0.8, -10) }, { L: kS }, easeArms(0.4)),
    step(fo(0.75), xe + 0.45 * S, { legL: foot(xf, yOf('L')), legR: foot(xf, yOf('L') + 2 * Y0, L * 0.3, 6) }, { L: kS / 2 + 1 }, easeArms(0.15)),
    // the closing stance stands the right foot a standing width from the left, wherever the left came down (a captured
    // walk's lane is narrower than the standing width): the body ends that little to the side
    K(Te, merge(pose0, { pos: [xf, yOf('L') + Y0, 0], hip: { x: 0 }, legL: { footW: [xf, yOf('L'), 0], pitch: 0 }, legR: { footW: [xf, yOf('L') + 2 * Y0, 0], pitch: 0 } }), { ease: 'slow' })];
  return { keys, frames: 2 * T, advance: 2 * S, intro, introFrames: Ti, introTravel: -s0, outro, outroTravel: xf - xe,
    // the captured span as the checker plays it (first step, two cycles, closing step): the two cycles
    ...(MC ? { captured: [Ti, Ti + 4 * T] } : {}) };
}
