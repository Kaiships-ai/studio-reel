// Body-acting verbs: whole-body key poses with anticipation -> action -> settle -> moving hold -> release, and overlap
// (the arms start LAG_A frames after the body, the head LAG_H frames after: they trail it in and out). A pose only ADDS
// to whatever the body channel is doing (stand, sit, after a walk), so poses layer and cross-fade: the next pose may start
// while the last one releases. Hands go through the normal hand channel (the runtime eases and arcs every hand-over).
//   pose keys (W units, deg): bob, lean (+ = toward the figure's right), pitch (+ = forward), dx, shTwist, hipTwist,
//   shrug, head_pitch (+ = chin down), head_tilt, head_dx, head_dv; feet {L, R}: absolute figure-local targets;
//   hands {L, R}: { l } figure frame | { t } torso frame (moves with the lean) | { h } head frame (moves with the head),
//   plus elbow (pole) and bend; props {L|R|B: kind} (lib/cast/handprops.js), tilt {L|R: deg}; cycle(t) = moving hold.
// Every verb takes `at` (frame), `hold` (frames held, default per pose), `dur` (action frames), `out` (release frames),
// `hand` ('L' mirrors a one-handed pose), `amp` (0..1.5 size). VERBS.md "Body acting" has one line and an example each.
import { STAND, SIT, clamp, smooth, smoother, lerp, toLocal } from './verbs.js';
import { HEAD_C, HIP_V } from './cast.js';
import { slowIn, MOVE_T } from './acting.js';

const DEG = Math.PI / 180;
export const LAG_A = 2, LAG_H = 4;
const BODY = ['bob', 'lean', 'pitch', 'dx', 'shTwist', 'hipTwist', 'shrug', 'footPitchL', 'footPitchR'];
const HEAD = ['head_pitch', 'head_tilt', 'head_dx', 'head_dv'];
const MIRROR = new Set(['lean', 'dx', 'shTwist', 'hipTwist', 'head_tilt', 'head_dx']);
const s2 = (x, e) => Math.sin(Math.PI * clamp(x, 0, 1)) ** e;

// rise curve: anticipation (opposite way, `antic` of the size) over A frames, then the action over T frames with the
// reference's slow start (acting.js slowIn: 7 % of the travel in the first eighth) and a small overshoot that settles into
// the hold; release eases back to 0 over R frames, also slow to start
export function envelope(t, A, T, antic = 0.15, over = 0.07) {
  if (t <= 0) return 0;
  if (t < A) return -antic * smooth(t / A);
  const x = (t - A) / T;
  if (x >= 1) return 1;
  return lerp(-antic, 1, slowIn(x / 0.85)) + over * Math.sin(Math.PI * clamp((x - 0.5) / 0.5, 0, 1));
}
const relEnv = (t, R) => 1 - slowIn(t / R);

// ---------------------------------------------------------------- the library
// one-handed poses are written for the right hand (u > 0 = the figure's right as the camera sees it)
const HIP_HAND = s => ({ t: [s * 0.37, 1.44, 0.04], elbow: [s * 1, 0.15, -0.35], bend: -0.2 * s });
const PAW = s => ({ t: [s * 0.17, 1.98, 0.44], elbow: [s * 0.8, -0.6, 0.1] });
const tremble = (t, a = 1) => ({ bob: 0.006 * a * Math.sin(t * 1.9), head_tilt: 1.2 * a * Math.sin(t * 2.3) });
export const POSES = {
  lean_in: { A: 4, T: 10, hold: 36, body: { pitch: 17, lean: 8, dx: 0.06, bob: -0.05, head_pitch: -8, head_tilt: 6, head_dv: 0.01, hipTwist: 4 },
    feet: { R: [0.22, 0.022, 0.20], L: [-0.24, 0.022, -0.10] }, hands: { R: { h: [0.34, -0.16, 0.36], elbow: [0.9, -0.5, 0] } },
    cycle: t => ({ pitch: 1.5 * Math.sin(t * 0.21) }) },
  lean_away: { A: 3, T: 8, hold: 30, body: { pitch: -13, lean: -10, dx: -0.06, bob: -0.04, head_pitch: -6, head_tilt: 9, head_dv: 0.02 },
    feet: { L: [-0.30, 0.022, -0.16] }, hands: { L: { t: [-0.46, 2.06, 0.38], elbow: [-0.7, -0.7, 0] }, R: { t: [0.44, 2.00, 0.36], elbow: [0.7, -0.7, 0] } } },
  brace: { A: 3, T: 8, hold: 30, body: { bob: -0.15, pitch: 10, shrug: 0.07, head_pitch: 8, head_dv: -0.03 },
    feet: { L: [-0.40, 0.022, 0.02], R: [0.40, 0.022, -0.02] }, hands: { L: { t: [-0.15, 2.30, 0.50], elbow: [-0.9, -0.5, 0.2] }, R: { t: [0.15, 2.36, 0.52], elbow: [0.9, -0.5, 0.2] } },
    cycle: t => tremble(t) },
  crouch: { A: 3, T: 10, hold: 34, body: { bob: -0.34, pitch: 24, head_pitch: -16, head_dv: 0.02 },
    feet: { L: [-0.32, 0.022, 0.04], R: [0.32, 0.022, 0.0] }, hands: { L: { l: [-0.30, 0.96, 0.54], elbow: [-0.9, -0.2, -0.3] }, R: { l: [0.30, 0.96, 0.54], elbow: [0.9, -0.2, -0.3] } } },
  recoil: { A: 2, T: 6, hold: 18, antic: 0.10, body: { pitch: -10, lean: 2, bob: -0.03, head_pitch: -12, head_dv: 0.03, shrug: 0.08 },
    hands: { L: { t: [-0.46, 2.12, 0.30], elbow: [-0.9, -0.5, 0] }, R: { t: [0.46, 2.12, 0.30], elbow: [0.9, -0.5, 0] } } },
  shrug: { A: 3, T: 8, hold: 18, body: { shrug: 0.10, head_tilt: 10, head_dv: -0.02, pitch: -3, lean: 2 },
    hands: { L: { t: [-0.62, 1.66, 0.36], elbow: [-0.3, -1, -0.3], bend: 0.3 }, R: { t: [0.62, 1.66, 0.36], elbow: [0.3, -1, -0.3], bend: -0.3 } } },
  facepalm: { A: 3, T: 9, hold: 30, body: { pitch: 10, bob: -0.03, head_pitch: 20, head_tilt: -6 },
    hands: { R: { h: [0.02, -0.02, 0.54], elbow: [0.9, -0.6, 0.1] }, L: HIP_HAND(-1) },
    cycle: t => ({ head_dx: 0.02 * Math.sin(t * 0.32), head_tilt: 3 * Math.sin(t * 0.32) }) },
  arms_crossed: { A: 3, T: 10, hold: 40, body: { pitch: -4, head_pitch: -6, head_tilt: 5, hipTwist: 6, dx: 0.05, lean: -2 },
    feet: { R: [0.30, 0.022, 0.06] },
    hands: { L: { t: [0.19, 1.80, 0.34], elbow: [-0.9, -0.5, 0.4] }, R: { t: [-0.17, 1.74, 0.38], elbow: [0.9, -0.5, 0.4] } },
    cycle: t => ({ head_tilt: 2 * Math.sin(t * 0.13) }) },
  hands_on_hips: { A: 3, T: 9, hold: 40, body: { pitch: -3, shrug: 0.03, head_pitch: -7, lean: 3, dx: 0.04 },
    feet: { L: [-0.30, 0.022, 0.02], R: [0.30, 0.022, 0.0] }, hands: { L: HIP_HAND(-1), R: HIP_HAND(1) },
    cycle: t => ({ lean: 1.5 * Math.sin(t * 0.15) }) },
  point_lean: { A: 4, T: 9, hold: 34, body: { pitch: 12, shTwist: 12, head_pitch: -4, bob: -0.04 },
    feet: { R: [0.24, 0.022, 0.20] }, hands: { R: { point: true, elbow: [0.7, -0.7, -0.1] }, L: HIP_HAND(-1) } },
  cower: { A: 2, T: 8, hold: 30, body: { bob: -0.28, pitch: 28, head_pitch: 14, shrug: 0.10, lean: -3 },
    feet: { L: [-0.18, 0.022, 0.04], R: [0.20, 0.022, -0.02] },
    hands: { L: { h: [-0.17, 0.06, 0.56], elbow: [-0.9, -0.4, 0.2] }, R: { h: [0.15, 0.12, 0.58], elbow: [0.9, -0.4, 0.2] } }, cycle: t => tremble(t, 1.6) },
  celebrate: { A: 4, T: 9, hold: 34, body: { head_pitch: -12, pitch: -6, shrug: 0.06 },
    hands: { L: { t: [-0.55, 2.55, 0.16], elbow: [-0.9, -0.3, 0] }, R: { t: [0.55, 2.55, 0.16], elbow: [0.9, -0.3, 0] } },
    cycle: t => ({ bob: -0.05 * (0.5 + 0.5 * Math.cos(t * 0.5)), lean: 3 * Math.sin(t * 0.25), hands: { L: [0, 0.07 * Math.sin(t * 0.5), 0], R: [0, -0.07 * Math.sin(t * 0.5), 0] } }) },
  // a jump for joy: dip, spring up with the feet off the floor and both arms up, land soft, bounce once more
  jump_joy: { A: 4, T: 10, hold: 40, keys: [
    { at: 0, body: { bob: -0.14, pitch: 8, head_pitch: 6 }, hands: { L: { t: [-0.40, 1.62, 0.30], elbow: [-0.6, -0.8, 0] }, R: { t: [0.40, 1.62, 0.30], elbow: [0.6, -0.8, 0] } } },
    { at: 12, body: { bob: 0.12, pitch: -6, head_pitch: -12, footPitchL: -24, footPitchR: -24 }, feet: { L: [-0.26, 0.15, 0.06], R: [0.26, 0.13, -0.02] },
      hands: { L: { t: [-0.55, 2.55, 0.16], elbow: [-0.9, -0.3, 0] }, R: { t: [0.55, 2.55, 0.16], elbow: [0.9, -0.3, 0] } } },
    { at: 24, body: { bob: -0.10, pitch: 5, head_pitch: -6, footPitchL: 0, footPitchR: 0 }, feet: { L: [-0.26, 0.022, 0.04], R: [0.26, 0.022, 0.0] } },
    { at: 34, body: { bob: 0.03, pitch: -3, head_pitch: -10 } },
    { at: 44, body: { bob: -0.03, pitch: 0, head_pitch: -8 } }] },
  tiptoe: { A: 3, T: 10, hold: 40, body: { bob: 0.045, pitch: 8, shrug: 0.05, head_pitch: -4, footPitchL: -24, footPitchR: -24 },
    feet: { L: [-0.18, 0.07, 0.04], R: [0.20, 0.07, -0.04] }, hands: { L: PAW(-1), R: PAW(1) },
    cycle: t => ({ bob: 0.012 * Math.sin(t * 0.24), head_tilt: 4 * Math.sin(t * 0.12), lean: 2 * Math.sin(t * 0.12) }) },
  sneak: { A: 3, T: 10, hold: 40, body: { bob: -0.18, pitch: 20, head_pitch: -10, shrug: 0.06 },
    feet: { L: [-0.26, 0.022, 0.24], R: [0.24, 0.022, -0.16] }, hands: { L: PAW(-1), R: { t: [0.20, 2.02, 0.48], elbow: [0.8, -0.6, 0.1] } },
    cycle: t => ({ dx: 0.04 * Math.sin(t * 0.2), lean: 2.5 * Math.sin(t * 0.2), head_dx: -0.02 * Math.sin(t * 0.2) }) },
  carry_heavy: { A: 4, T: 10, hold: 40, body: { bob: -0.10, pitch: -9, shrug: 0.07, head_pitch: -6 }, props: { B: 'box' },
    feet: { L: [-0.32, 0.022, 0.02], R: [0.32, 0.022, 0.0] },
    hands: { L: { l: [-0.32, 1.50, 0.40], elbow: [-0.9, -0.5, -0.2] }, R: { l: [0.32, 1.50, 0.40], elbow: [0.9, -0.5, -0.2] } }, cycle: t => tremble(t, 1.4) },
  // crouch, grip, strain, rise with it to the chest
  lift_heavy: { A: 3, T: 10, hold: 44, props: { B: 'box' }, keys: [
    { at: 0, body: { bob: -0.34, pitch: 26, head_pitch: -14 }, feet: { L: [-0.34, 0.022, 0.02], R: [0.34, 0.022, 0.0] },
      hands: { L: { l: [-0.34, 0.92, 0.56], elbow: [-0.9, -0.3, -0.2] }, R: { l: [0.34, 0.92, 0.56], elbow: [0.9, -0.3, -0.2] } } },
    { at: 14, body: { bob: -0.30, pitch: 22, head_pitch: -18, shrug: 0.06 } },
    { at: 30, body: { bob: -0.10, pitch: -8, shrug: 0.07, head_pitch: -6 },
      hands: { L: { l: [-0.32, 1.50, 0.40], elbow: [-0.9, -0.5, -0.2] }, R: { l: [0.32, 1.50, 0.40], elbow: [0.9, -0.5, -0.2] } } }],
    cycle: t => tremble(t, t > 10 && t < 30 ? 2.2 : 1) },
  push: { A: 4, T: 10, hold: 40, body: { pitch: 24, bob: -0.12, head_pitch: -14 },
    feet: { L: [-0.22, 0.022, 0.26], R: [0.24, 0.022, -0.34] },
    hands: { L: { t: [-0.20, 1.98, 0.68], elbow: [-0.8, -0.6, 0] }, R: { t: [0.20, 1.98, 0.68], elbow: [0.8, -0.6, 0] } },
    cycle: t => ({ pitch: 3 * Math.sin(t * 0.3), bob: 0.012 * Math.sin(t * 0.3) }) },
  pull: { A: 4, T: 10, hold: 40, body: { pitch: -18, bob: -0.12, head_pitch: -4, lean: -3 },
    feet: { L: [-0.22, 0.022, 0.30], R: [0.24, 0.022, -0.12] },
    hands: { L: { t: [-0.08, 1.80, 0.62], elbow: [-0.8, -0.6, 0] }, R: { t: [0.10, 1.76, 0.58], elbow: [0.8, -0.6, 0] } },
    cycle: t => ({ pitch: -4 * Math.max(0, Math.sin(t * 0.28)), hands: { L: [0, 0, -0.06 * Math.max(0, Math.sin(t * 0.28))], R: [0, 0, -0.06 * Math.max(0, Math.sin(t * 0.28))] } }) },
  // sit on a seat about knee high (SIT in verbs.js); held until stand_up (or `hold`)
  sit_down: { A: 3, T: 14, hold: 1e6, keep: true, keys: [
    { at: 0, body: { bob: -0.30, pitch: 22, head_pitch: -10 }, feet: { L: [-0.26, 0.022, 0.40], R: [0.26, 0.022, 0.38] } },
    { at: 10, body: { bob: SIT.bob, pitch: SIT.pitch, head_pitch: 0 }, feet: { L: SIT.footL, R: SIT.footR },
      hands: { L: { l: [-0.27, 0.98, 0.44], elbow: [-0.9, -0.3, -0.2] }, R: { l: [0.29, 1.0, 0.45], elbow: [0.9, -0.3, -0.2] } } }],
    cycle: t => ({ head_tilt: 2 * Math.sin(t * 0.1) }) },
  cover_ears: { A: 3, T: 8, hold: 30, body: { shrug: 0.08, head_pitch: 8, bob: -0.06, pitch: 6 },
    hands: { L: { h: [-0.52, 0.0, 0.04], elbow: [-1, 0.1, 0.1] }, R: { h: [0.52, 0.0, 0.04], elbow: [1, 0.1, 0.1] } },
    cycle: t => ({ head_tilt: 4 * Math.sin(t * 0.45), bob: 0.008 * Math.sin(t * 0.9) }) },
  cup_ear: { A: 3, T: 9, hold: 34, body: { lean: 5, head_tilt: 12, pitch: 5, dx: 0.03 },
    hands: { R: { h: [0.64, 0.04, 0.08], elbow: [1, 0.2, 0.2] } }, cycle: t => ({ lean: 1.5 * Math.sin(t * 0.18) }) },
  think: { A: 3, T: 10, hold: 40, body: { head_tilt: 9, head_pitch: -7, pitch: -2, lean: -2 },
    hands: { R: { h: [0.08, -0.30, 0.52], elbow: [0.6, -0.8, 0.3] }, L: { t: [0.10, 1.72, 0.38], elbow: [-0.8, -0.6, 0.3] } },
    cycle: t => ({ hands: { R: [0, 0.012 * Math.sin(t * 0.7), 0] }, head_tilt: 2 * Math.sin(t * 0.12) }) },
  shush: { A: 3, T: 8, hold: 30, body: { pitch: 10, head_tilt: -6, bob: -0.03 },
    hands: { R: { h: [0.02, -0.20, 0.58], elbow: [0.8, -0.7, 0.1] } } },
  present: { A: 3, T: 9, hold: 32, body: { shTwist: -10, head_tilt: 6, lean: -2, pitch: 2 },
    hands: { R: { t: [0.70, 1.82, 0.46], elbow: [0.4, -1, -0.2], bend: -0.3 }, L: { t: [-0.20, 1.80, 0.40], elbow: [-0.8, -0.6, 0.1] } },
    cycle: t => ({ hands: { R: [0.02 * Math.sin(t * 0.25), 0.03 * Math.sin(t * 0.25), 0] } }) },
  arms_wide: { A: 4, T: 9, hold: 30, body: { pitch: -6, head_pitch: -8, shrug: 0.05 },
    hands: { L: { t: [-0.78, 2.16, 0.22], elbow: [-0.3, -1, -0.2] }, R: { t: [0.78, 2.16, 0.22], elbow: [0.3, -1, -0.2] } } },
  shade_eyes: { A: 3, T: 9, hold: 34, body: { pitch: 6, bob: 0.02, head_pitch: -8, footPitchL: -10, footPitchR: -10 },
    feet: { L: [-0.20, 0.04, 0.02], R: [0.22, 0.04, 0.0] },
    hands: { R: { h: [0.14, 0.10, 0.46], elbow: [0.9, -0.3, 0.1] }, L: HIP_HAND(-1) }, cycle: t => ({ head_tilt: 4 * Math.sin(t * 0.1) }) },
  clutch: { A: 2, T: 8, hold: 30, body: { pitch: 30, bob: -0.14, head_pitch: -4, shrug: 0.06 },
    feet: { L: [-0.20, 0.022, 0.06], R: [0.24, 0.022, -0.04] },
    hands: { L: { t: [-0.12, 1.56, 0.42], elbow: [-0.9, -0.4, 0] }, R: { t: [0.12, 1.62, 0.42], elbow: [0.9, -0.4, 0] } }, cycle: t => tremble(t, 1.6) },
  laugh: { A: 3, T: 8, hold: 34, body: { pitch: 13, bob: -0.06, head_pitch: -12 },
    hands: { L: { t: [-0.14, 1.56, 0.42], elbow: [-0.9, -0.4, 0] }, R: { t: [0.16, 1.60, 0.42], elbow: [0.9, -0.4, 0] } },
    cycle: t => ({ bob: 0.014 * Math.sin(t * 1.3), pitch: 3 * Math.sin(t * 0.3), head_pitch: 3 * Math.sin(t * 1.3) }) },
  flail: { A: 2, T: 7, hold: 30, body: { shrug: 0.08, head_pitch: -8, bob: -0.04 },
    hands: { L: { t: [-0.52, 2.50, 0.20], elbow: [-0.9, -0.3, 0] }, R: { t: [0.52, 2.50, 0.20], elbow: [0.9, -0.3, 0] } },
    cycle: t => ({ bob: -0.02 * Math.abs(Math.sin(t * 0.5)), lean: 3 * Math.sin(t * 0.5), hands: { L: [0.10 * Math.sin(t * 0.5), 0.08 * Math.cos(t * 0.5), 0], R: [0.10 * Math.sin(t * 0.5 + 2), 0.08 * Math.cos(t * 0.5 + 2), 0] } }) },
  wobble: { A: 3, T: 10, hold: 40, body: { bob: -0.05, head_pitch: 4 },
    feet: { L: [-0.30, 0.022, 0.02], R: [0.30, 0.022, 0.0] }, hands: { L: { t: [-0.50, 1.66, 0.20], elbow: [-0.5, -1, 0] }, R: { t: [0.50, 1.66, 0.20], elbow: [0.5, -1, 0] } },
    cycle: t => ({ lean: 9 * Math.sin(t * 0.21), dx: 0.05 * Math.sin(t * 0.21), head_tilt: -7 * Math.sin(t * 0.21 - 0.8), pitch: 4 * Math.cos(t * 0.21) }) },
  // prop handling (hand props are the figure's own: lib/cast/handprops.js)
  pour: { A: 3, T: 10, hold: 40, props: { R: 'cup' }, body: { pitch: 8, head_pitch: 10, lean: 3 },
    hands: { R: { t: [0.36, 1.92, 0.56], elbow: [0.9, -0.5, -0.1] }, L: HIP_HAND(-1) },
    tiltKeys: { R: [[0, 0], [12, 0], [22, 75], [46, 75], [56, 0]] } },
  hammer: { A: 3, T: 9, hold: 44, props: { R: 'hammer' }, body: { pitch: 14, bob: -0.06, head_pitch: 14 },
    feet: { L: [-0.28, 0.022, 0.06], R: [0.28, 0.022, -0.04] }, hands: { R: { t: [0.32, 2.18, 0.48], elbow: [0.9, -0.4, -0.2] }, L: { t: [-0.10, 1.54, 0.62], elbow: [-0.8, -0.6, 0] } },
    tiltKeys: { R: [[0, -40]] }, strike: { per: 15, side: 'R', up: [0.36, 2.40, 0.30], down: [0.30, 1.62, 0.56], tiltUp: -70, tiltDown: 25, cue: 'clunk' } },
  write: { A: 3, T: 10, hold: 44, props: { R: 'pencil', L: 'pad' }, body: { pitch: 8, head_pitch: 18, head_tilt: 5 },
    hands: { L: { t: [-0.10, 1.70, 0.58], elbow: [-0.8, -0.6, 0.2] }, R: { t: [0.04, 1.76, 0.60], elbow: [0.8, -0.6, 0.2] } },
    cycle: t => ({ hands: { R: [0.035 * Math.sin(t * 0.9) + 0.03 * Math.sin(t * 0.13), 0.02 * Math.cos(t * 1.8), 0] }, head_dx: 0.01 * Math.sin(t * 0.13) }) },
  eat: { A: 3, T: 9, hold: 44, props: { R: 'drumstick' }, body: { head_pitch: -2, pitch: 3 },
    hands: { R: { t: [0.32, 1.86, 0.50], elbow: [0.9, -0.5, -0.1] }, L: { t: [-0.10, 1.52, 0.42], elbow: [-0.8, -0.6, 0] } },
    bite: { per: 22, side: 'R', mouth: [0.10, -0.16, 0.56] } },
  // show_medal: the prize held up high beside the head, chest out, chin up
  show_medal: { A: 4, T: 13, hold: 50, props: { R: 'medal' }, body: { pitch: -6, head_pitch: -10, lean: -3, shrug: 0.04, bob: 0.02 },
    hands: { R: { t: [0.46, 2.62, 0.30], elbow: [0.9, -0.5, 0] }, L: HIP_HAND(-1) }, cycle: t => ({ head_tilt: 3 * Math.sin(t * 0.18) }) },
  // toast: the cup raised high in front, chin up, a small proud lean back
  toast: { A: 3, T: 10, hold: 34, props: { R: 'beaker' }, body: { pitch: -4, head_pitch: -8, lean: -2, shrug: 0.02 },
    hands: { R: { t: [0.44, 2.20, 0.40], elbow: [0.9, -0.6, 0] }, L: HIP_HAND(-1) }, tiltKeys: { R: [[0, 0], [12, -8], [30, 6]] },   // beside the head, never over the eyes
    cycle: t => ({ head_tilt: 2 * Math.sin(t * 0.2) }) },
  // drink: the cup comes up to the mouth, the head tips back, the cup tilts past level and the fill drains (levelKeys:
  // [frame after the anticipation, 0..1]), three gulps bob the head, then the cup comes down empty
  drink: { A: 4, T: 12, hold: 42, props: { R: 'beaker' }, body: { pitch: -7, head_pitch: -20, lean: 2, shrug: 0.03 },
    hands: { R: { h: [0.16, -0.24, 0.42], elbow: [0.9, -0.5, 0.1] }, L: HIP_HAND(-1) },
    tiltKeys: { R: [[0, 0], [10, 15], [18, 95], [44, 115], [52, 20]] }, levelKeys: { R: [[0, 1], [16, 1], [42, 0]] },
    cycle: t => ({ head_dv: t < 30 ? -0.012 * Math.max(0, Math.sin(t * 0.75)) : 0, head_pitch: t < 30 ? 2.5 * Math.sin(t * 0.75) : 0 }) },
  phone: { A: 3, T: 9, hold: 40, props: { R: 'phone' }, body: { head_tilt: 10, lean: 3, head_pitch: 4 },
    hands: { R: { h: [0.46, -0.06, 0.12], elbow: [0.9, -0.6, 0.1] }, L: HIP_HAND(-1) }, cycle: t => ({ head_tilt: 3 * Math.sin(t * 0.15) }) },
};
POSES.eat_chilli = { ...POSES.eat, props: { R: 'chilli' } };   // the same bite cycle with a red hot chilli
export const POSE_NAMES = [...Object.keys(POSES), 'stand_up'];

// ---------------------------------------------------------------- compile
const mirrorPose = P => {
  const o = { ...P, body: P.body && Object.fromEntries(Object.entries(P.body).map(([k, v]) => [k === 'footPitchL' ? 'footPitchR' : k === 'footPitchR' ? 'footPitchL' : k, MIRROR.has(k) ? -v : v])) };
  const flipH = h => h && { ...h, t: h.t && [-h.t[0], h.t[1], h.t[2]], l: h.l && [-h.l[0], h.l[1], h.l[2]], h: h.h && [-h.h[0], h.h[1], h.h[2]], elbow: h.elbow && [-h.elbow[0], h.elbow[1], h.elbow[2]], bend: h.bend != null ? -h.bend : undefined };
  if (P.hands) o.hands = { L: flipH(P.hands.R), R: flipH(P.hands.L) };
  if (P.feet) o.feet = { L: P.feet.R && [-P.feet.R[0], P.feet.R[1], P.feet.R[2]], R: P.feet.L && [-P.feet.L[0], P.feet.L[1], P.feet.L[2]] };
  if (P.props) o.props = Object.fromEntries(Object.entries(P.props).map(([k, v]) => [k === 'L' ? 'R' : k === 'R' ? 'L' : k, v]));
  if (P.keys) o.keys = P.keys.map(mirrorPose);
  for (const k of ['tiltKeys', 'levelKeys']) if (P[k]) o[k] = { L: P[k].R, R: P[k].L };
  for (const k of ['strike', 'bite']) if (P[k]) o[k] = { ...P[k], side: P[k].side === 'R' ? 'L' : 'R', up: P[k].up && [-P[k].up[0], P[k].up[1], P[k].up[2]], down: P[k].down && [-P[k].down[0], P[k].down[1], P[k].down[2]], mouth: P[k].mouth && [-P[k].mouth[0], P[k].mouth[1], P[k].mouth[2]] };
  if (P.cycle) { const c = P.cycle; o.cycle = t => { const r = c(t), q = {}; for (const [k, v] of Object.entries(r)) q[k] = k === 'hands' ? { L: v.R && [-v.R[0], v.R[1], v.R[2]], R: v.L && [-v.L[0], v.L[1], v.L[2]] } : MIRROR.has(k) ? -v : v; return q; }; }
  return o;
};
// the key pose in force tt frames into the action (keys merge: a later key keeps what it does not name)
function keyed(spec) {
  const ks = spec.keys || [spec];
  const full = []; let acc = { body: {}, feet: {}, hands: {} };
  for (const k of ks) { acc = { at: k.at || 0, body: { ...acc.body, ...(k.body || {}) }, feet: { ...acc.feet, ...(k.feet || {}) }, hands: { ...acc.hands, ...(k.hands || {}) } }; full.push(acc); }
  return tt => {
    let i = 0; while (i + 1 < full.length && full[i + 1].at <= tt) i++;
    if (i + 1 >= full.length || tt <= full[0].at) return { ...full[Math.min(i, full.length - 1)], u: 1, next: null };
    const a = full[i], b = full[i + 1], u = smoother((tt - a.at) / (b.at - a.at));
    const body = {}; for (const k of new Set([...Object.keys(a.body), ...Object.keys(b.body)])) body[k] = lerp(a.body[k] || 0, b.body[k] || 0, u);
    return { body, feet: a.feet, feetB: b.feet, hands: a.hands, handsB: b.hands, u };
  };
}
const tableAt = (keys, t) => { if (!keys?.length) return 0; let i = 0; while (i + 1 < keys.length && keys[i + 1][0] <= t) i++;
  if (i + 1 >= keys.length) return keys[i][1]; const [t0, v0] = keys[i], [t1, v1] = keys[i + 1]; return lerp(v0, v1, smoother((t - t0) / (t1 - t0))); };

// torso frame -> figure frame, for a body leaning by the pose's own lean / pitch / dx / bob
function torsoPt(q, B) {
  const L = (B.lean || 0) * DEG, c = Math.cos(L), s = Math.sin(L), pt = (B.pitch || 0) * DEG, y = q[1] - HIP_V, z = q[2] || 0;
  const x = q[0] * c + y * s, yy = -q[0] * s + y * c;
  return [x + (B.dx || 0), yy * Math.cos(pt) - z * Math.sin(pt) + HIP_V + (B.bob || 0), yy * Math.sin(pt) + z * Math.cos(pt)];
}
function headPt(q, B) {
  const hc = torsoPt([HEAD_C[0] + (B.head_dx || 0), HEAD_C[1] + (B.head_dv || 0), 0], B), a = (0.6 * (B.pitch || 0) + (B.head_pitch || 0)) * DEG;
  return [hc[0] + q[0], hc[1] + q[1] * Math.cos(a) - q[2] * Math.sin(a), hc[2] + q[1] * Math.sin(a) + q[2] * Math.cos(a)];
}

export function compilePose(name, p, st, C) {
  let spec = POSES[name];
  if (!spec) throw new Error(`pose: unknown ${name}`);
  if (p.hand === 'L') spec = mirrorPose(spec);
  const amp = p.amp ?? 1, big = Math.max(0, ...(spec.keys || [spec]).flatMap(k => [Math.abs(k.body?.pitch || 0), 1.5 * Math.abs(k.body?.lean || 0)])) * amp;
  // the torso never turns faster than ~3.2 deg a frame on average (its arms hang off it): big poses take longer
  const t0 = p.at, A = p.antic ?? spec.A ?? 3, T = Math.max(p.dur ?? ((spec.T ?? 9) >= 8 ? Math.max(MOVE_T, spec.T ?? 9) : spec.T), Math.ceil(big / 3.2)), H = p.hold ?? spec.hold ?? 30, R = Math.max(p.out ?? Math.max(14, spec.R ?? 10), Math.ceil(big / 3.2));
  // (FORENSIC.md section 3: reference moves take 12-15 f; a pose with T >= 8 now moves in MOVE_T, the snaps under 8 f
  // (recoil, flail, startle) stay snaps)
  const inst = { name, t0, rel: spec.keep && p.hold == null ? 1e9 : t0 + A + T + H, R, rest: [] };
  if (spec.keep) st.sitPose = inst;
  const at = keyed(spec), antic = p.antic0 ?? spec.antic ?? 0.15;
  const env = (t, an = antic) => { const f = t0 + t; const e = envelope(t, A, T, an); return f < inst.rel ? e : e * relEnv(f - inst.rel, inst.R); };
  // feet and hip height move slower than the rest and never anticipate: a near-straight knee is a fast joint
  const fenv = t => { const f = t0 + t, e = smoother((t - 1) / (A + T + 6)); return f < inst.rel ? e : e * (1 - smoother((f - inst.rel) / (inst.R + 6))); };
  // the pose's own body numbers at frame f (lag = the head / arm trail)
  const bodyAt = (f, lag = 0) => {
    const t = f - t0 - lag, e = env(t) * amp, k = at(t - A), held = clamp(e, 0, 1), o = {};
    for (const [n, v] of Object.entries(k.body)) o[n] = v * (n === 'bob' || n.startsWith('footPitch') ? fenv(t) * amp : e);
    if (spec.cycle && held > 0) { const c = spec.cycle(t); for (const [n, v] of Object.entries(c)) if (n !== 'hands') o[n] = (o[n] || 0) + v * held; }
    return { o, e, held, k, t };
  };
  const busy = side => (p.busy ? !!p.busy[side] : !!st.hold[side]);        // auto beats pass the hands' state at their frame
  const owners = [{ chan: 'add', start: t0, pose: inst, fn: f => {
    if (f < t0 || f > inst.rel + inst.R + LAG_H + 2) return {};
    const b = bodyAt(f), h = bodyAt(f, LAG_H), out = {};
    for (const n of BODY) if (b.o[n]) out[n] = b.o[n];
    for (const n of HEAD) if (h.o[n]) out[n] = h.o[n];
    // feet: from the stand to the pose's marks (never through the anticipation), lifting a little on the way
    const fe = fenv(b.t), lift = s2(fe, 1);
    for (const s of ['L', 'R']) {
      const tgA = b.k.feet?.[s], tgB = b.k.feetB?.[s], base = STAND['foot' + s];
      const tg = tgA && tgB ? tgA.map((x, i) => lerp(x, tgB[i], b.k.u)) : tgB || tgA; if (!tg) continue;
      const d = tg.map((x, i) => (x - base[i]) * fe), dist = Math.hypot(d[0], d[2]);
      out['f' + s + 'x'] = d[0]; out['f' + s + 'y'] = d[1] + (dist > 0.04 ? 0.06 * lift * Math.min(1, dist / 0.2) : 0); out['f' + s + 'z'] = d[2];
    }
    for (const [s, kind] of Object.entries(spec.props || {})) if (b.t > 0 && (f < inst.rel || fe > 0.2) && (s === 'B' || !busy(s))) out[`x_hp${s}_${kind}`] = 1;
    for (const s of ['L', 'R']) {
      let tl = tableAt(spec.tiltKeys?.[s], b.t - A);
      if (spec.strike?.side === s) { const ph = strikePh(b.t - A - T); tl = lerp(spec.strike.tiltUp, spec.strike.tiltDown, ph.down); }
      if (tl) out['x_tilt' + s] = tl;
      if (spec.levelKeys?.[s]) out['x_lvl' + s] = tableAt(spec.levelKeys[s], b.t - A);
    }
    return out;
  } }];
  // strike / bite cycles: phase in the hold (raise slow, drop fast, a little bounce)
  const strikePh = t => { const S = spec.strike || spec.bite; if (!S || t < 0) return { down: 0, n: -1 }; const per = S.per, x = (t % per) / per, n = Math.floor(t / per);
    const down = spec.strike ? (x < 0.62 ? 0.15 * smooth(x / 0.62) : x < 0.86 ? smoother((x - 0.62) / 0.24) : 1 - 0.3 * Math.sin(Math.PI * (x - 0.86) / 0.14)) : Math.sin(Math.PI * x) ** 2;
    return { down, n }; };
  const cues = [];
  if (spec.strike) { const per = spec.strike.per; for (let t = A + T + Math.round(per * 0.86); t0 + t < inst.rel && t < 400; t += per) cues.push({ f: t0 + t, name: spec.strike.cue, strength: 0.5 }); }
  for (const side of ['L', 'R']) {
    const hs0 = spec.keys ? spec.keys.map(k => k.hands?.[side]).find(Boolean) : spec.hands?.[side];
    if (!hs0 || busy(side)) continue;
    const sg = side === 'L' ? -1 : 1;
    let pointL = null;
    if (hs0.point && p.to != null) { const l = toLocal(C.point(p.to), { pos: st.pos, yaw: st.yaw }), n = Math.hypot(l[0], l[2]) || 1; pointL = [l[0] / n, l[2] / n]; }
    const where = (hs, B) => hs.point ? torsoPt([sg * 0.22 + (pointL ? pointL[0] : 0.45) * 0.66, 2.20, (pointL ? pointL[1] : 0.7) * 0.66], B)
      : hs.h ? headPt(hs.h, B) : hs.t ? torsoPt(hs.t, B) : hs.l.slice();
    // a long hand move gets a long fade (the forearm must not swing more than ~20 deg a frame)
    // travel: from the rest spot, or from where the last pose still holds this hand
    const q = where(hs0, (spec.keys ? spec.keys[spec.keys.length - 1] : spec).body || {}), r = STAND['hand' + side], ph = st.poseHand?.[side];
    const dd = a => Math.hypot(q[0] - a[0], q[1] - a[1], q[2] - a[2]), far = Math.max(dd(r), ph && ph.until > t0 ? dd(ph.at) : 0);
    (st.poseHand ||= {})[side] = { at: q, get until() { return inst.rel + inst.R; } };
    // a path that passes close by the shoulder folds the elbow fast (the forearm whips round): slow that move down
    const from = ph && ph.until > t0 ? ph.at : r, sh = [sg * 0.228, 2.0, 0], dv = q.map((x, i) => x - from[i]), dl = Math.hypot(...dv) || 1;
    const u = clamp(dv.reduce((a2, x, i) => a2 + x * (sh[i] - from[i]), 0) / (dl * dl), 0, 1), near = Math.hypot(...sh.map((x, i) => x - (from[i] + dv[i] * u)));
    const hf = Math.round(clamp(5 + 9 * far, 8, 18) + (near < 0.45 ? 14 * (0.45 - near) / 0.45 + 3 : 0));   // the hand is there within ~half a second
    owners.push({ chan: 'hand' + side, start: t0 + LAG_A, fade: hf, smooth: true, fn: f => {
      const b = bodyAt(f, LAG_A), B = bodyAt(f).o, hA = b.k.hands?.[side] || hs0, hB = b.k.handsB?.[side];   // targets ride the body as it is now
      let l = where(hA, B);
      if (hB) l = l.map((x, i) => lerp(x, where(hB, B)[i], b.k.u));
      const c = spec.cycle && b.held > 0 ? spec.cycle(b.t)?.hands?.[side] : null;
      if (c) l = l.map((x, i) => x + c[i] * b.held);
      const S = spec.strike?.side === side ? spec.strike : spec.bite?.side === side ? spec.bite : null;
      if (S && b.t > A + T) { const ph = strikePh(b.t - A - T), to = spec.strike ? torsoPt(S.down, B) : headPt(S.mouth, B);
        const base = spec.strike ? torsoPt(S.up, B) : l, w = clamp((b.t - A - T) / 8, 0, 1); l = l.map((x, i) => lerp(x, lerp(base[i], to[i], ph.down), w)); }
      // moving hold: the hand drifts a little, never parks
      const dr = 0.010 * b.held; l = [l[0] + dr * Math.sin(f * 0.11 + sg), l[1] + dr * Math.sin(f * 0.07), l[2] + dr * Math.cos(f * 0.09)];
      return { l, elbow: hA.elbow, bend: hA.bend ?? -0.1 * sg };
    } });
    const rest = { chan: 'hand' + side, start: inst.rel + LAG_A, fade: Math.max(hf, inst.R), smooth: true, fn: () => ({ rest: true }) };
    inst.rest.push(rest); owners.push(rest);
  }
  // a later pose (or stand_up) moves this one's release: rel and the rest owners are read at evaluation time
  inst.release = f => { inst.rel = Math.min(inst.rel, f); for (const r of inst.rest) r.start = Math.min(r.start, f + LAG_A); };
  if (st.pose && st.pose !== inst && st.pose.t0 < t0 && st.pose.rel > t0) st.pose.release(t0);
  if (!spec.keep) st.pose = inst;
  return { end: inst.rel + inst.R, owners, cues, pose: inst };
}

// stand up from a sit_down: lean forward, push off, rise (the sit's release, plus a forward pitch on the way up)
function standUp(p, st) {
  const sit = st.sitPose; if (!sit) throw new Error(`stand_up: ${st.name} is not sitting (sit_down first)`);
  const t0 = p.at, R = p.dur ?? 14; sit.R = R; sit.release(t0 + 4); st.sitPose = null;
  return { end: t0 + R + 6, owners: [{ chan: 'add', start: t0, fn: f => { const t = f - t0; if (t < 0 || t > R + 8) return {};
    const k = s2(t / (R + 6), 1); return { pitch: 24 * k, head_pitch: -12 * k }; } }] };
}

export const POSE_VERBS = Object.fromEntries([...Object.keys(POSES).map(n => [n, (p, st, C) => compilePose(n, p, st, C)]), ['stand_up', standUp]]);
