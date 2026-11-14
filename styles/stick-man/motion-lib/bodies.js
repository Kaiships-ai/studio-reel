// The five body types of the motion library. One skeleton (engine/cast.js) for all of them: a body type is its
// proportions (the rig reads them from the cast spec) plus its own way of standing and moving (each body's clips are
// authored with these numbers, never an adult clip played on another body).
//   spec    the cast spec fields the rig reads: girth (torso width), scale (whole figure from the soles), headScale (head
//           against the body), legScale (leg length; the hip lowers with it), kg (body mass: a load's share of balance)
//   stance  feet spacing against the adult's; posture: the body's standing pose (motion v2 channels, on top of STAND)
//   walk    S step length (m), T frames per step, lift (m), bobC / bobP hip height at contact / passing (W), bend (spine
//           deg), swing (arm deg each way), elbow, sway (pelvis roll deg each way), nod (head bob deg per step)
//   run     the same, plus ts: frames on the ground per step (the rest is a flight that gravity times: g = 9.8)
//   breath  the idle's breath: spine bend amplitude (deg), its period (frames), the weight shift (hip, W)
export const BODIES = {
  adult: { spec: {}, kg: 70, stance: 1, posture: {},
    walk: { S: 0.55, T: 15, lift: 0.10, bobC: -0.06, bobP: 0.02, bend: 4, swing: 20, elbow: 25, sway: 1.5, nod: 1.5 },
    run: { S: 0.95, T: 10, ts: 4, lift: 0.24, bobC: -0.14, bobP: -0.04, bend: 14, swing: 45, elbow: 85, sway: 1, nod: 2 },
    breath: { amp: 1.5, per: 40, shift: 0.025 } },
  // heavy: wide feet, short slow steps, the body rolls over each foot, arms held out round the belly
  heavy: { spec: { girth: 1.9 }, kg: 115, stance: 1.4, posture: { armL: { raise: 22 }, armR: { raise: 22 } },
    walk: { S: 0.42, T: 18, lift: 0.07, bobC: -0.05, bobP: 0.01, bend: 2, swing: 12, elbow: 22, sway: 4.5, nod: 1, raise: 22 },
    run: { S: 0.62, T: 12, ts: 7, lift: 0.14, bobC: -0.16, bobP: -0.07, bend: 10, swing: 30, elbow: 75, sway: 4, nod: 2.5, raise: 24 },
    breath: { amp: 2.2, per: 48, shift: 0.035 } },
  // thin: narrow feet, long light steps, little roll
  thin: { spec: { girth: 0.6 }, kg: 55, stance: 0.85, posture: {},
    walk: { S: 0.62, T: 14, lift: 0.11, bobC: -0.05, bobP: 0.03, bend: 3, swing: 24, elbow: 22, sway: 1, nod: 1.5 },
    run: { S: 1.05, T: 10, ts: 4, lift: 0.26, bobC: -0.12, bobP: -0.02, bend: 12, swing: 50, elbow: 88, sway: 0.5, nod: 2 },
    breath: { amp: 1.3, per: 38, shift: 0.02 } },
  // child: a big head on a small body with short legs; quick short steps, a lot of bounce, the arms swing wide
  child: { spec: { scale: 0.62, headScale: 1.3, legScale: 0.8 }, kg: 25, stance: 0.9, posture: {},
    walk: { S: 0.30, T: 10, lift: 0.07, bobC: -0.08, bobP: 0.04, bend: 2, swing: 28, elbow: 30, sway: 2, nod: 3 },
    run: { S: 0.55, T: 8, ts: 3, lift: 0.14, bobC: -0.16, bobP: -0.02, bend: 10, swing: 40, elbow: 80, sway: 2, nod: 4 },
    breath: { amp: 1.8, per: 30, shift: 0.03 } },
  // elder: stooped (the spine bent, the head lifted to look ahead), short slow steps, feet barely off the floor, little
  // bounce, arms close
  elder: { spec: { scale: 0.96 }, kg: 62, stance: 1.1, posture: { spine: { bend: 24 }, neck: { nod: -20 }, armL: { raise: 10, swing: 6, elbow: 28 }, armR: { raise: 10, swing: 6, elbow: 28 } },
    walk: { S: 0.30, T: 19, lift: 0.04, bobC: -0.05, bobP: -0.02, bend: 3, swing: 8, elbow: 30, sway: 2, nod: 1, swing0: 6 },
    run: { S: 0.45, T: 13, ts: 8, lift: 0.08, bobC: -0.12, bobP: -0.08, bend: 6, swing: 18, elbow: 60, sway: 2, nod: 1.5, swing0: 6 },
    breath: { amp: 2.0, per: 56, shift: 0.02 } },
};
export const BODY_NAMES = Object.keys(BODIES);
// a cast spec in a body type: cast: { gran: { spec: 'GRAN' } } with SPECS.GRAN = bodySpec(SPECS.MAGNATE, 'elder')
export const bodySpec = (spec, body) => ({ ...spec, ...BODIES[body].spec, kg: BODIES[body].kg, motionBody: body });
