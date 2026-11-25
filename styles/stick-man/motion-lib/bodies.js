// The five body types of the motion library. One skeleton (engine/cast.js) for all of them: a body type is its
// proportions (the rig reads them from the cast spec) plus its own way of standing and moving (each body's clips are
// authored with these numbers, never an adult clip played on another body).
//   spec    the cast spec fields the rig reads: girth (torso width), scale (whole figure from the soles), headScale (head
//           against the body), legScale (leg length; the hip lowers with it), kg (body mass: a load's share of balance)
//   stance  feet spacing against the adult's; posture: the body's standing pose (motion v2 channels, on top of STAND)
//   walk    S step length (m), T frames per step, lift (m), bobC / bobP hip height at contact / passing (W), bend (spine
//           deg), swing (arm deg each way), elbow, sway (pelvis roll deg each way), nod (head bob deg per step)
//   run     the same, plus lean (deg: the trunk tipped forward from the hips, straight, not curled) and ts: frames on the ground per step (the rest is a flight that gravity times: g = 9.8)
//   knees   the stance knee (deg) the hips are solved from: walk [contact, down, passing, up, trail, toe-off], run
//           [contact, down, toe-off] (base.js gaitLoop)
//   breath  the idle's breath: spine bend amplitude (deg), its period (frames), the weight shift (hip, W)
//   life    how it performs a capture (ref/perform.js, base.js ownClip), against the adult, whose capture it is: rate its clock
//           (frames a captured frame), hold longer (shorter) where the body is still, drag longer into and out of a move,
//           top its fastest hand and limb against the adult's;
//           arm, trunk the size of the arms' and the trunk's and head's moves; sway the weight shift; give the knees' bend and
//           stretch (the bounce). tools/gates/bodylife.mjs holds each body to its own way
//   perform the SHAPE of its moves, not only their clock and size (Kai 25/11: "one performance replayed faster and slower";
//           ref/perform.js armLag on the capture, base.js ownFrames on its channels). Each part follows what drives it as
//           a spring does (Williams, The Animator's Survival Kit: overlapping action, drag, follow-through; Thomas and
//           Johnston: "follow through and overlapping action"):
//             arms, trunk, head  [hz, damp]: hz how quickly the part catches up (lower drags further behind and moves less
//                    on a quick beat), damp under 1 carries past the stop and swings back (follow-through, settle), 1
//                    eases in without overshoot. arms against the chest, trunk = spine and the hips' tilt, head = the neck
//             hesitate  frames an act takes longer as it leaves a hold: the move starts, hangs, then goes
//             settle    frames a one-off runs on past the capture's last frame, so what overshoots comes back on screen
//             stoop     the share of posture's bend and lifted head kept on every base: standing, seated, kneeling, the floor
//             fidget    [deg, frames]: a head turn and a weight shift that never stop (a body that is never still)
//             armOut    the share of posture's arm raise kept over a capture (arms held out round a belly)
//             leanIn    deg the trunk bends (and half that the head bows) to meet a hand coming to the face: a short reach lands
//             neck      the share of the head's nod and turn the trunk takes (a stiff or short neck: the chest goes with it)
//             weight    [side, fore-aft, fore-aft beats a side beat]: the path the hips take as the weight shifts, standing
//           and every captured act breathes (breath, below) and shifts its weight while standing, so a hold never freezes
export const BODIES = {
  adult: { spec: {}, kg: 70, stance: 1, posture: {},
    walk: { knees: [5, 26, 9, 5, 14, 36], S: 0.55, T: 15, lift: 0.10, bobC: -0.06, bobP: 0.02, bend: 4, swing: 27, elbow: 25, sway: 1.5, nod: 1.5 },
    run: { S: 1.0, T: 8, ts: 5, lift: 0.24, bobC: -0.14, bobP: -0.04, lean: 13, bend: 4, swing: 32, elbow: 72, sway: 1, nod: 2 },
    breath: { amp: 1.5, per: 40, shift: 0.025 },
    life: { rate: 1, hold: 0, drag: 0, arm: 1, trunk: 1, sway: 1, give: 1 },
    // the captures are an adult's performance: nothing reshaped, only the breath and weight shift a hold needs
    perform: { weight: [1, 0, 1] } },   // the weight from foot to foot, side to side (bodies.js breath shift)
  // heavy: wide feet, short slow steps, the body rolls over each foot, arms held out round the belly
  heavy: { spec: { girth: 1.9 }, kg: 115, stance: 1.4, posture: { armL: { raise: 22 }, armR: { raise: 22 } },
    walk: { knees: [8, 28, 11, 8, 16, 34], S: 0.42, T: 18, lift: 0.07, bobC: -0.05, bobP: 0.01, bend: 2, swing: 16, elbow: 22, sway: 5.5, nod: 1, raise: 22 },
    run: { knees: [16, 40, 18], kick: 80, S: 0.62, T: 9, ts: 8, lift: 0.14, bobC: -0.16, bobP: -0.07, lean: 9, bend: 4, swing: 30, elbow: 75, sway: 4, nod: 2.5, raise: 24 },
    breath: { amp: 2.2, per: 48, shift: 0.035 },
    life: { rate: 1.02, hold: 0, drag: 0.5, top: 0.7, arm: 0.84, trunk: 0.86, sway: 1.5, give: 0.8 },
    perform: {
      trunk: [1.5, 0.45],   // the mass leads and carries on past the stop, then settles back: an overshoot a fifth of the move
      arms: [2.0, 0.8],     // the arms come after the trunk that leads them, round the belly, and land without a bounce
      head: [2.4, 0.7],     // the head rides the heavy trunk, a beat behind it
      settle: 20,           // two thirds of a second for the mass to come to rest after the act
      armOut: 0.5,          // the arms work round the belly: half of posture's raise kept over a slim actor's capture
      neck: 0.4,            // a short thick neck: the chest goes with every nod and turn
      weight: [2, 1, 2] } },   // rolls onto each foot and settles forward there: a figure eight, twice the adult's width
  // thin: narrow feet, long light steps, little roll
  thin: { spec: { girth: 0.6 }, kg: 55, stance: 0.85, posture: {},
    walk: { knees: [4, 22, 7, 4, 12, 36], S: 0.62, T: 14, lift: 0.11, bobC: -0.05, bobP: 0.03, bend: 3, swing: 30, elbow: 22, sway: 1, nod: 1.5 },
    run: { S: 1.0, T: 8, ts: 5, lift: 0.26, bobC: -0.12, bobP: -0.02, lean: 13, bend: 3, swing: 35, elbow: 72, sway: 0.5, nod: 2 },
    breath: { amp: 1.3, per: 38, shift: 0.02 },
    life: { rate: 0.84, hold: -0.15, drag: 0, top: 0.82, arm: 1.25, trunk: 1.14, sway: 0.8, give: 1 },
    perform: {
      trunk: [1.0, 1.0],    // the limbs lead and the narrow trunk follows them late, never overshooting (gangly)
      arms: [2.2, 0.35],    // loose arms: the hands swing past each stop and back (light, long limbs)
      head: [2.4, 0.3],     // a light head on a long neck bobbles past the trunk's stops
      weight: [2, 2, 1] } },   // a long light body sways round from the ankles: a circle (its limbs settle in the way out)
  // child: a big head on a small body with short legs; quick short steps, a lot of bounce, the arms swing wide
  child: { spec: { scale: 0.62, headScale: 1.3, legScale: 0.8 }, kg: 25, stance: 0.9, posture: {},
    walk: { knees: [6, 32, 10, 6, 14, 36], S: 0.30, T: 10, lift: 0.07, bobC: -0.08, bobP: 0.04, bend: 2, swing: 34, elbow: 30, sway: 2, nod: 3 },
    run: { S: 0.5, T: 8, ts: 5, lift: 0.14, bobC: -0.16, bobP: -0.02, lean: 10, bend: 3, swing: 30, elbow: 70, sway: 2, nod: 4 },
    breath: { amp: 1.8, per: 30, shift: 0.03 },
    life: { rate: 0.76, hold: -0.15, drag: 0, arm: 1.5, trunk: 1.25, sway: 1.2, give: 1.6 },
    perform: {
      trunk: [3.4, 0.5],    // bouncy: the whole small body overshoots a little on every stop and is back at once
      arms: [3.8, 0.42],    // quick arms that bounce past the gesture's end
      head: [3.4, 0.45],    // the big head bobs after the body
      fidget: [7, 54],      // never frozen: the head turns about and the weight shifts all the time (no settle: a child does not wait)
      weight: [1.6, 1, 1.7] } },   // shifts on an uneven beat, side and fore-aft
  // elder: stooped (the spine bent, the head lifted to look ahead), short slow steps, feet barely off the floor, little
  // bounce, arms close
  elder: { spec: { scale: 0.96 }, kg: 62, stance: 1.1, posture: { spine: { bend: 24 }, neck: { nod: -20 }, armL: { raise: 10, swing: 6, elbow: 28 }, armR: { raise: 10, swing: 6, elbow: 28 } },
    walk: { knees: [16, 28, 18, 16, 22, 34], S: 0.30, T: 19, lift: 0.04, bobC: -0.05, bobP: -0.02, bend: 3, swing: 8, elbow: 30, sway: 2, nod: 1, swing0: 6 },
    run: { knees: [16, 32, 18], kick: 55, S: 0.42, T: 11, ts: 10, lift: 0.08, bobC: -0.12, bobP: -0.08, lean: 6, bend: 6, swing: 18, elbow: 60, sway: 2, nod: 1.5, swing0: 6 },
    breath: { amp: 2.0, per: 56, shift: 0.02 },
    life: { rate: 1.2, hold: 0.25, drag: 0.1, top: 0.7, arm: 0.72, trunk: 0.6, sway: 0.8, give: 0.7 },
    perform: {
      trunk: [1.3, 1.0],    // tremor-free: the stiff trunk eases after the act, never overshooting
      arms: [1.7, 1.0],     // the arms ease in and land, no bounce, no shake (a hand that must arrive still does: IK)
      head: [1.6, 1.0],     // the head eases after the trunk
      hesitate: 10,         // checks before it commits: a third of a second more as each move leaves a hold
      settle: 14,           // a slow body comes to rest slowly
      stoop: 1,             // the stoop (posture) is held standing, seated, kneeling and on the floor
      leanIn: 26,           // a short reach still lands on the face: the body leans in and bows to meet the hand
      neck: 0.5,            // a stiff old neck: the stooped trunk nods and turns with the head
      weight: [0.6, 2.4, 1] } },   // keeps both feet loaded: rocks forward and back for balance, hardly side to side
};
export const BODY_NAMES = Object.keys(BODIES);
// a cast spec in a body type: cast: { gran: { spec: 'GRAN' } } with SPECS.GRAN = bodySpec(SPECS.MAGNATE, 'elder')
export const bodySpec = (spec, body) => ({ ...spec, ...BODIES[body].spec, kg: BODIES[body].kg, motionBody: body });
