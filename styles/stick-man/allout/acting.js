// Allout acting: whole-body comedy poses for the reference look (round 3). Built on engine/poses.js (anticipation ->
// action -> settle -> moving hold -> release, arms and head trailing the body) and registered like handprops.js does, so a
// reel opts in with `import '/styles/stick-man/allout/acting.js'`. The reference sells every beat with a gag the
// characters act out with their whole body (FORENSIC.md sections 3 and 10): a chug, a slam, a burp, a belly laugh with a
// knee slap, a fall flat on the face, a faint, a retch over the sink, nose pinched and fanning, business while talking.
//
//   pose verbs (beat { who, do: '<name>', hold, amp, to, hand }) : chug, slam_beaker, pat_belly, nod, belly_laugh,
//     point_laugh, fan_nose, retch, wipe, wag_finger, thumb_self, feed_tube, gag_tube, dust_hands, pop_pill, peer,
//     blow, cheer_fist, scope_twiddle
//   tumble verbs (the whole figure tips about its soles; cast.js x_tumble / x_roll / x_lift): faceplant, faint,
//     topple (beat { deg, dur, hold }: the fall accelerates like a real one, bounces once, and gets up on release)
// Units: hands in head widths (W = 0.6 m), figure-local: x = the figure's right, y = up from the soles, z = forward.
//   { t } torso frame (rides the lean), { h } head frame (rides the head), { l } figure frame.
import { POSES, POSE_VERBS, compilePose } from '../engine/poses.js';
import { ACT } from '../engine/verbs_fx.js';

const HIP = s => ({ t: [s * 0.37, 1.44, 0.04], elbow: [s * 1, 0.15, -0.35], bend: -0.2 * s });
const BELLY = s => ({ t: [s * 0.06, 1.55, 0.44], elbow: [s * 0.9, -0.5, 0.1] });
const sn = (t, w, a = 0) => Math.sin(t * w + a);

const P = {
  // chug: the whole beaker upended over the mouth, head and back thrown back, free hand on the hip, gulping
  chug: { A: 4, T: 10, hold: 60, props: { R: 'beaker' }, body: { pitch: -15, lean: -3, head_pitch: -34, shrug: 0.05, bob: -0.02 },
    feet: { L: [-0.30, 0.022, -0.08], R: [0.27, 0.022, 0.12] },
    hands: { R: { h: [0.10, -0.06, 0.40], elbow: [0.9, -0.3, 0.2] }, L: HIP(-1) },
    tiltKeys: { R: [[0, 0], [6, 70], [12, 150], [200, 160]] }, levelKeys: { R: [[0, 1], [10, 0.95], [56, 0.04]] },
    cycle: t => ({ head_dv: -0.014 * Math.max(0, sn(t, 0.9)), head_pitch: 3 * sn(t, 0.9), bob: 0.008 * sn(t, 0.9), pitch: -1.5 * sn(t, 0.45) }) },
  // slam: up high, then the empty beaker crashes down onto the trolley in front (hand target = the trolley top)
  slam_beaker: { A: 2, T: 5, hold: 30, props: { R: 'beaker' }, levelKeys: { R: [[0, 0]] }, keys: [
    { at: 0, body: { pitch: -8, head_pitch: -10, shrug: 0.06, lean: -2 }, hands: { R: { t: [0.42, 2.62, 0.30], elbow: [0.9, -0.4, -0.2] }, L: HIP(-1) } },
    { at: 7, body: { pitch: 16, bob: -0.07, head_pitch: 8, shrug: 0.02, lean: 2 }, hands: { R: { l: [0.40, 1.56, 0.86], elbow: [0.9, -0.5, -0.1] } } }] },
  // pat_belly: satisfied, chest out, one hand pats the belly, the other a thumbs-up by the shoulder
  pat_belly: { A: 3, T: 9, hold: 36, body: { pitch: -6, lean: 3, head_pitch: -6, head_tilt: 6 },
    hands: { L: BELLY(-1), R: { t: [0.50, 2.18, 0.38], elbow: [0.9, -0.6, 0] } },
    cycle: t => ({ hands: { L: [0, 0.02 * sn(t, 0.7), 0.04 * Math.max(0, sn(t, 0.7))] }, bob: 0.006 * sn(t, 0.7) }) },
  // nod: arms crossed, the know-all's slow agreeing nod (everyone knows)
  nod: { A: 3, T: 9, hold: 40, body: { pitch: -4, head_pitch: 2, hipTwist: 6, dx: 0.04, lean: -2 },
    hands: { L: { t: [0.20, 1.80, 0.42], elbow: [-0.9, -0.6, 0.2], bend: -0.25 }, R: { t: [-0.18, 1.72, 0.46], elbow: [0.9, -0.6, 0.2], bend: 0.25 } },
    cycle: t => ({ head_pitch: 9 * Math.max(0, sn(t, 0.32)) ** 1.5, bob: -0.006 * Math.max(0, sn(t, 0.32)) }) },
  // belly_laugh: doubled over, face up, one hand slapping the knee, the other on the belly, the body shaking
  belly_laugh: { A: 3, T: 9, hold: 40, body: { pitch: 28, bob: -0.10, head_pitch: -22, shrug: 0.07 },
    feet: { L: [-0.30, 0.022, 0.0], R: [0.30, 0.022, 0.08] },
    hands: { R: { l: [0.34, 1.02, 0.50], elbow: [0.9, -0.2, -0.2] }, L: BELLY(-1) },
    cycle: t => ({ hands: { R: [0, 0.16 * Math.max(0, sn(t, 0.8)), 0] }, bob: -0.025 * Math.abs(sn(t, 0.8)), pitch: 4 * sn(t, 0.8), head_tilt: 5 * sn(t, 0.4) }) },
  // point_laugh: leaning back, pointing at the butt of the joke (beat `to`), the other hand on the belly, shaking
  point_laugh: { A: 3, T: 9, hold: 40, body: { pitch: -10, lean: -4, head_pitch: -10, shrug: 0.06 },
    hands: { R: { point: true, elbow: [0.7, -0.7, -0.1] }, L: BELLY(-1) },
    cycle: t => ({ bob: -0.02 * Math.abs(sn(t, 0.9)), pitch: -3 * sn(t, 0.9), head_pitch: -4 * sn(t, 0.9) }) },
  // fan_nose: reeling away, nose pinched, the other hand fanning the smell off
  fan_nose: { A: 2, T: 8, hold: 40, body: { pitch: -14, lean: -9, dx: -0.06, head_pitch: -6, head_tilt: 12, bob: -0.03 },
    feet: { L: [-0.30, 0.022, -0.16], R: [0.20, 0.022, 0.10] },
    hands: { L: { h: [-0.02, -0.08, 0.50], elbow: [-0.9, -0.5, 0.1] }, R: { t: [0.46, 2.30, 0.58], elbow: [0.9, -0.5, 0] } },
    cycle: t => ({ hands: { R: [0.13 * sn(t, 1.3), 0.03 * sn(t, 2.6), 0] }, head_tilt: 3 * sn(t, 0.5) }) },
  // retch: bent over the sink, both hands on its edge, the body heaving
  retch: { A: 3, T: 10, hold: 50, body: { pitch: 44, bob: -0.12, head_pitch: -14, shrug: 0.08 },
    feet: { L: [-0.30, 0.022, -0.10], R: [0.30, 0.022, -0.04] },
    hands: { L: { l: [-0.34, 1.56, 0.70], elbow: [-0.9, -0.2, -0.3] }, R: { l: [0.34, 1.56, 0.70], elbow: [0.9, -0.2, -0.3] } },
    cycle: t => { const h = Math.max(0, sn(t, 0.42)) ** 3; return { pitch: 10 * h, head_pitch: 8 * h, bob: -0.04 * h, shrug: 0.05 * h, head_dv: -0.02 * h }; } },
  // wipe: a cloth scrubbing a surface in front, up at head height (a slide, a screen)
  wipe: { A: 3, T: 9, hold: 40, props: { R: 'hanky' }, body: { pitch: 6, shTwist: 10, head_pitch: -8 },
    hands: { R: { t: [0.36, 2.42, 0.72], elbow: [0.9, -0.5, -0.1] }, L: HIP(-1) },
    cycle: t => ({ hands: { R: [0.11 * sn(t, 0.75), 0.07 * Math.cos(t * 0.75), 0] }, shTwist: 4 * sn(t, 0.75) }) },
  // wag_finger: "not that!": leaning in, index finger up and wagging, the other hand on the hip
  wag_finger: { A: 3, T: 8, hold: 34, body: { pitch: 8, head_pitch: 4, head_tilt: -6 },
    hands: { R: { t: [0.36, 2.40, 0.48], elbow: [0.9, -0.6, 0] }, L: HIP(-1) },
    cycle: t => ({ hands: { R: [0.07 * sn(t, 1.1), 0, 0] }, head_tilt: 4 * sn(t, 1.1) }) },
  // thumb_self: "me." a thumb jabbed into his own chest, chest out, chin up
  thumb_self: { A: 3, T: 8, hold: 36, body: { pitch: -7, head_pitch: -8, shrug: 0.05, head_tilt: 5 },
    hands: { R: { t: [0.10, 1.90, 0.34], elbow: [0.9, -0.5, 0.2] }, L: HIP(-1) },
    cycle: t => ({ hands: { R: [0, 0, 0.03 * Math.max(0, sn(t, 0.6))] } }) },
  // feed_tube: hand over hand, feeding a long tube forward (the endoscope going down)
  feed_tube: { A: 3, T: 9, hold: 60, body: { pitch: 12, head_pitch: 8 },
    hands: { L: { t: [-0.08, 1.95, 0.66], elbow: [-0.8, -0.6, 0] }, R: { t: [0.10, 1.85, 0.62], elbow: [0.8, -0.6, 0] } },
    cycle: t => ({ hands: { L: [0, 0, 0.14 * sn(t, 0.55)], R: [0, 0, -0.14 * sn(t, 0.55)] }, pitch: 2 * sn(t, 0.55) }) },
  // gag_tube: head tipped back, the tube going in, arms flapping
  gag_tube: { A: 2, T: 8, hold: 60, body: { pitch: -12, head_pitch: -30, shrug: 0.08, lean: -2 },
    hands: { L: { t: [-0.62, 2.10, 0.20], elbow: [-0.9, -0.3, 0] }, R: { t: [0.62, 2.10, 0.20], elbow: [0.9, -0.3, 0] } },
    cycle: t => ({ hands: { L: [0, 0.14 * sn(t, 1.4), 0], R: [0, 0.14 * sn(t, 1.4, 1.3), 0] }, bob: 0.01 * sn(t, 2.8), head_tilt: 4 * sn(t, 0.9) }) },
  // dust_hands: job done, brushing one palm off the other
  dust_hands: { A: 3, T: 8, hold: 30, body: { pitch: -3, head_pitch: -6, head_tilt: 4 },
    hands: { L: { t: [-0.06, 1.78, 0.52], elbow: [-0.8, -0.6, 0] }, R: { t: [0.08, 1.80, 0.52], elbow: [0.8, -0.6, 0] } },
    cycle: t => ({ hands: { L: [0.06 * sn(t, 1.2), 0, 0], R: [-0.06 * sn(t, 1.2), 0.02 * sn(t, 2.4), 0] } }) },
  // pop_pill: the pill tossed back into the mouth, head back to swallow
  pop_pill: { A: 3, T: 6, hold: 20, keys: [
    { at: 0, body: { head_pitch: 0, pitch: 0 }, hands: { R: { t: [0.30, 1.85, 0.50], elbow: [0.9, -0.5, 0] }, L: HIP(-1) } },
    { at: 8, body: { head_pitch: -24, pitch: -8 }, hands: { R: { h: [0.06, -0.20, 0.52], elbow: [0.9, -0.5, 0.1] } } }] },
  // peer: bent close over something at bench height, hands on the knees
  peer: { A: 3, T: 9, hold: 40, body: { pitch: 30, bob: -0.12, head_pitch: -10, shrug: 0.05 },
    hands: { L: { l: [-0.26, 1.02, 0.36], elbow: [-0.9, -0.2, -0.2] }, R: { l: [0.26, 1.02, 0.36], elbow: [0.9, -0.2, -0.2] } },
    cycle: t => ({ head_dx: 0.02 * sn(t, 0.15) }) },
  // blow: a puff of air at something held up in front of the mouth (dust it off)
  blow: { A: 3, T: 8, hold: 26, body: { pitch: 10, head_pitch: 4 }, props: { R: 'hanky' },
    hands: { R: { h: [0.10, -0.16, 0.70], elbow: [0.9, -0.5, 0.1] }, L: HIP(-1) } },
  // cheer_fist: a big fist pump, knee up, the other arm back
  cheer_fist: { A: 4, T: 8, hold: 30, keys: [
    { at: 0, body: { bob: -0.08, pitch: 8, head_pitch: 4 }, hands: { R: { t: [0.36, 1.70, 0.40], elbow: [0.9, -0.5, 0] }, L: HIP(-1) } },
    { at: 8, body: { bob: 0.04, pitch: -8, head_pitch: -14, shrug: 0.06, footPitchL: -10 }, feet: { L: [-0.20, 0.40, 0.30] },
      hands: { R: { t: [0.42, 2.80, 0.18], elbow: [0.9, -0.3, 0] }, L: { t: [-0.50, 1.60, -0.30], elbow: [-0.9, -0.3, 0] } } },
    { at: 18, body: { bob: 0.0, pitch: -6, head_pitch: -12, footPitchL: 0 }, feet: { L: [-0.24, 0.022, 0.04] } }] },
  // scope_twiddle: bent to an eyepiece in front, one hand turning the focus knob
  scope_twiddle: { A: 3, T: 9, hold: 40, body: { pitch: 22, bob: -0.08, head_pitch: 6, shrug: 0.04 },
    hands: { R: { t: [0.30, 1.78, 0.62], elbow: [0.9, -0.5, -0.1] }, L: { t: [-0.20, 1.74, 0.62], elbow: [-0.9, -0.5, -0.1] } },
    cycle: t => ({ hands: { R: [0.015 * sn(t, 0.9), 0.015 * Math.cos(t * 0.9), 0] }, head_dx: 0.01 * sn(t, 0.2) }) },
  // body under a tumble: arms flung up (faint / topple) or forward (faceplant); the verb below tips the whole figure
  tumble_back: { A: 2, T: 6, hold: 40, body: { pitch: -6, head_pitch: -10, shrug: 0.08 },
    hands: { L: { t: [-0.60, 2.55, 0.20], elbow: [-0.9, -0.3, 0] }, R: { t: [0.60, 2.55, 0.20], elbow: [0.9, -0.3, 0] } } },
  tumble_fwd: { A: 2, T: 6, hold: 40, body: { pitch: 4, head_pitch: -14, shrug: 0.06 },
    hands: { L: { t: [-0.40, 2.40, 0.62], elbow: [-0.9, -0.3, 0.2] }, R: { t: [0.40, 2.40, 0.62], elbow: [0.9, -0.3, 0.2] } } },
};
Object.assign(POSES, P);
for (const n of Object.keys(P)) POSE_VERBS[n] = ACT[n] = (p, st, C) => compilePose(n, p, st, C);

// tumble: the body pose plus the whole figure tipping about its soles. deg (+ = onto the face, - = onto the back), the fall
// accelerates (gravity), lands with one small bounce, holds; when the pose releases (a later pose, or `hold` frames) it
// gets back up over the release.
const smoother = x => { x = Math.min(1, Math.max(0, x)); return x * x * x * (x * (x * 6 - 15) + 10); };
function tumbleVerb(pose, D) {
  return (p, st, C) => {
    const r = compilePose(pose, p, st, C), inst = r.pose, t0 = p.at, A = p.antic ?? D.A, T = p.dur ?? D.T, deg = p.deg ?? D.deg, lift = p.lift ?? D.lift;
    r.owners.push({ chan: 'add', start: t0, verb: 'tumble', fn: f => {
      const t = f - t0; if (t < 0) return {};
      let e;
      if (t < A) e = -0.05 * Math.sin(Math.PI * t / A);                                     // a teeter the other way first
      else if (t < A + T) e = ((t - A) / T) ** 2;                                           // falling: faster and faster
      else { const d = t - A - T; e = 1 - 0.07 * Math.exp(-d / 2.5) * Math.abs(Math.sin(d * 0.9)); }   // thud, one bounce
      if (f > inst.rel) e *= 1 - smoother((f - inst.rel) / inst.R);
      return { x_tumble: deg * e, x_lift: lift * Math.sin(Math.min(1, Math.abs(e)) * Math.PI / 2), x_roll: (p.roll ?? 0) * e };
    } });
    r.cues = [...(r.cues || []), { f: t0 + A + T, name: 'thud', strength: 0.8 }];
    return r;
  };
}
POSE_VERBS.faceplant = ACT.faceplant = tumbleVerb('tumble_fwd', { A: 4, T: 9, deg: 86, lift: 0.12 });
POSE_VERBS.faint = ACT.faint = tumbleVerb('tumble_back', { A: 6, T: 10, deg: -84, lift: 0.12 });
POSE_VERBS.topple = ACT.topple = tumbleVerb('tumble_back', { A: 3, T: 8, deg: -40, lift: 0 });
