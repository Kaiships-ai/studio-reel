// The motion library's standard poses and key builders. Every clip is written in CLIP SPACE: the actor starts at the
// origin facing +x (yaw 90), metres for pos and planted feet (footW), the figure frame (W) for arm ik targets. index.js
// moves a clip to where the actor is and the way it faces. Every clip starts and ends on a standard pose (STAND, SIT,
// CARRY) or is a seamless loop, so clips chain in any order.
import { BODIES } from './bodies.js';

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
export const stand = (body = 'adult', x = 0) => merge(STAND, BODIES[body].posture, { pos: [x, 0, 0], yaw: 90 }, feet(body, x));
// SIT on a knee-high seat (0.45 m) whose front edge is at x: the feet forward, the pelvis on the seat; the seat carries the
// weight, so balance is off (`fall` is the rig's switch for a body supported by something other than its feet)
export const sit = (body = 'adult', x = 0) => merge(STAND, BODIES[body].posture, { pos: [x, 0, 0], yaw: 90, bob: -0.56, fall: 1, spine: { bend: 4 },
  armL: { raise: 10, swing: 30, elbow: 40 }, armR: { raise: 10, swing: 30, elbow: 40 } }, feet(body, x + 0.40));
// CARRY one heavy bag (25 kg) in the right fist: the arm held out so the bag clears the leg, the body leaning away
// from it, the free arm out for balance
export const CARRY_KG = 25;
export const carry = (body = 'adult', x = 0) => merge(stand(body, x), { spine: { side: -7, bend: 4 }, neck: { tilt: 5 }, pelvis: { roll: 3 },
  armR: { raise: 26, swing: 4, elbow: 14 }, armL: { raise: 38, swing: 6, elbow: 30 }, x_hpR_bag: 1, x_kgR: CARRY_KG });
export const BASES = { STAND: stand, SIT: sit, CARRY: carry };

// a key: the whole pose named (so every key stands alone), ease 'slow' unless given
export const K = (f, pose, over = {}) => ({ f, ...merge(pose, over), ease: over.ease || 'slow' });

// a gait loop of two steps (left, then right) on planted feet, from the body's numbers (bodies.js) and overrides.
// walk, per step: contact (both feet down, the hips low), down (the back heel peels: the ankle rises, the toe stays),
// passing (the swing foot lifted beside the stance foot, the hips up), up (the swing heel above its print), contact.
// run, per step: contact, toe-off (the last frame on the ground), flight (both feet up: gravity times it), contact.
// A foot leaves the floor and reaches it straight up and down, so a foot on the floor never slides (motionlib.mjs).
// upper(sgn): the arms and anything else on top, sgn = +1 when the right arm swings forward.
// Returns { keys, frames, advance, intro, introFrames, introTravel, outro, outroTravel }: intro = the first step from the
// standard pose, outro = the closing step back to it.
export function gaitLoop({ body = 'adult', kind = 'walk', upper, base, ...over }) {
  const B = BODIES[body], G = { ...B[kind], ...over }, { S, T } = G, Y = fy(body), run = kind === 'run', L = G.lift;
  const pose0 = base ? base(body, 0) : stand(body, 0);
  const arms = sgn => ({ armL: { raise: G.raise ?? pose0.armL.raise, swing: (G.swing0 ?? 0) - sgn * G.swing, elbow: G.elbow + (sgn < 0 ? 10 : 0) },
    armR: { raise: G.raise ?? pose0.armR.raise, swing: (G.swing0 ?? 0) + sgn * G.swing, elbow: G.elbow + (sgn > 0 ? 10 : 0) } });
  const up = sgn => (upper ? upper(sgn) : arms(sgn));
  // knee: the hips held this much lower through the gait (W), so a leg is never quite straight: near straight a tiny
  // change of reach swings the knee tens of degrees in a frame
  const body0 = (x, bob, sgn, extra = {}) => merge(pose0, { pos: [x, 0, 0], bob: bob - (G.knee ?? 0.09), spine: { bend: (pose0.spine.bend || 0) + G.bend }, pelvis: { roll: G.sway * sgn },
    neck: { nod: (pose0.neck.nod || 0) + G.nod * (bob < 0 ? 1 : -1) } }, up(sgn), extra);
  const foot = (x, y, z = 0, pitch = 0) => ({ footW: [x, y, z], pitch });
  const keys = [], at = (f, pose) => keys.push(K(f, pose, { ease: 'flow' }));
  // contact k: the k-th foot lands at x = (k + 1/2) S; side L for even k; the body halfway between the feet
  const land = k => (k + 0.5) * S, sideOf = k => (k % 2 ? 'R' : 'L'), yOf = sd => (sd === 'L' ? -Y : Y);
  const px = t => S * t / T;                                            // the body's travel t frames into the loop
  for (let k = 0; k <= 2; k++) {
    const s = sideOf(k), o = s === 'L' ? 'R' : 'L', sg = s === 'L' ? 1 : -1, f = k * T, ls = 'leg' + s, lo = 'leg' + o, ys = yOf(s), yo = yOf(o);
    // at a walk's contact the back foot is still down (double support); at a run's it is already up behind
    const back = run ? foot(land(k - 1) + S / 2, yo, L * 0.7, -30) : foot(land(k - 1), yo);
    at(f, body0(k * S, G.bobC, sg, { [ls]: foot(land(k), ys, 0, 8), [lo]: back }));
    if (k === 2) break;
    if (!run) {
      // the swing takes most of the step (the foot leaves just after the other lands and lands at the next contact): a
      // short swing makes the foot outrun the hip and the leg over-reach
      const q = Math.max(1, Math.round(T * 0.12)), h = Math.round(T / 2), u = Math.min(T - 1, Math.round(T * 0.88));
      at(f + q, body0(px(f + q), G.bobC - 0.01, sg * 0.5, { [ls]: foot(land(k), ys), [lo]: foot(land(k - 1), yo, L * 0.3, -25) }));
      at(f + h, body0(px(f + h), G.bobP, 0, { [ls]: foot(land(k), ys), [lo]: foot(land(k), yo, L, -10) }));
      at(f + u, body0(px(f + u), G.bobP * 0.5, -sg * 0.5, { [ls]: foot(land(k), ys, 0, -6), [lo]: foot(land(k + 1), yo, L * 0.25, 10) }));
    } else {
      // toe-off: the stance heel up, the swing knee through and ahead; flight: both feet up, the body on gravity's arc
      const ts = G.ts, tf = T - ts, hgt = Math.max(0.021, 9.8 * (tf / 30) ** 2 / 8), fp = f + ts + Math.round(tf / 2);
      at(f + ts, body0(px(f + ts), G.bobP, sg * 0.5, { [ls]: foot(land(k), ys, 0, -20), [lo]: foot(land(k) + S * 0.15, yo, L, -10) }));
      at(fp, merge(body0(px(fp), G.bobP + 0.04, 0, { [ls]: foot(land(k) + 0.03, ys, L * 0.6, -25), [lo]: foot(land(k + 1), yo, L * 0.35, 4) }), { pos: [px(fp), 0, hgt] }));
    }
  }
  // the first step from STAND: the weight onto the right foot, the left heel peels, swings, lands at the loop's first
  // contact; the right stays where it stood (S/2 behind the loop's origin) and, for a run, peels last
  // the arms grow into the gait's swing over the first step and settle out of it over the last (a run's elbows fold a lot)
  const easeArms = (w, sgn = 0) => { const a = up(sgn); for (const sd of ['armL', 'armR']) if (a[sd]?.elbow != null) a[sd] = { ...a[sd], elbow: pose0[sd].elbow + w * (a[sd].elbow - pose0[sd].elbow), swing: (pose0[sd].swing || 0) + w * ((a[sd].swing ?? 0) - (pose0[sd].swing || 0)) }; return a; };
  const Ti = Math.round(T * (run ? 2 : 1.6)), s0 = -S / 2, fi = x => Math.round(Ti * x);
  const intro = [K(0, merge(pose0, { pos: [s0, 0, 0] }, feet(body, s0)), { ease: 'slow' }),
    K(fi(0.3), body0(s0 + 0.03, -0.03, 0, { ...easeArms(0.3), legL: foot(s0, -Y, L * 0.3, -25), legR: foot(s0, Y) }), { ease: 'flow' }),
    K(fi(0.6), body0(s0 + S / 4, G.bobP, 0, { ...easeArms(0.6), legL: foot(0, -Y, L, -10), legR: foot(s0, Y) }), { ease: 'flow' }),
    K(fi(0.85), body0(s0 + 0.42 * S, G.bobP * 0.5, 0, { ...easeArms(0.85, 0.5), legL: foot(S / 2, -Y, L * 0.3, 10), legR: run ? foot(s0, Y, L * 0.25, -25) : foot(s0, Y) }), { ease: 'flow' })];
  // the closing step: the back foot comes up beside the front one, the body settles over both
  const xe = 2 * S, xf = land(2), Te = Math.round(T * (run ? 2.2 : 1.6)), fo = x => Math.round(Te * x), rb = run ? land(1) + S / 2 : land(1);
  const outro = [K(fo(0.25), body0(xe + 0.1 * S, G.bobC * 0.6, 0, { ...easeArms(0.7, 0.5), legL: foot(xf, -Y), legR: foot(rb, Y, L * (run ? 0.6 : 0.3), -25) }), { ease: 'flow' }),
    K(fo(0.5), body0(xe + 0.3 * S, G.bobP * 0.4, 0, { ...easeArms(0.4), legL: foot(xf, -Y), legR: foot((rb + xf) / 2, Y, L * 0.8, -10) }), { ease: 'flow' }),
    K(fo(0.75), body0(xe + 0.45 * S, 0, 0, { ...easeArms(0.15), legL: foot(xf, -Y), legR: foot(xf, Y, L * 0.3, 6) }), { ease: 'flow' }),
    K(Te, merge(pose0, { pos: [xf, 0, 0] }, feet(body, xf)), { ease: 'slow' })];
  return { keys, frames: 2 * T, advance: 2 * S, intro, introFrames: Ti, introTravel: S / 2, outro, outroTravel: S / 2 };
}
