// Act_LiftHeavy_Once: heave one 25 kg bag off the floor. Look at it, a small rise (the wind-up), a squat with the hips
// back and the knees out, both fists land on the handle and hold, the strain (the floor gives the weight to the arms
// over 12 frames: the bag barely moves, the body trembles and sinks back, the head comes up), the rise with the bag
// crosswise in front of the thighs, the bag turned and carried out to the right side, the left fist lets go: CARRY.
// The bag hangs from the right fist (x_hpR_bag), the left fist on the handle beside it. Balance is the floor under
// it: the hips are keyed back so the body with its load stays over its feet (else the rig moves the hips and the fists
// leave the handle: shot.mjs (h)). The bag on the floor lies crosswise, its handle top at clip space [0.38, 0.03, 0.31]
// (the set's own bag hides at frame 31).
import { stand, carry, K, merge, CARRY_KG } from '../../base.js';

// elbows out and down (explicit poles): the wanted elbow already clears the body, so the solver never has to swing it
// round to the other side between two frames
const PR = [0.8, -0.6, -0.2], PL = [-0.8, -0.6, -0.2];
const S0 = stand('adult'), C1 = carry('adult');
// both fists on the handle (figure frame, W): the right one holds the bag, the left one 0.10 W to its left
const at = (y, z, x = 0.05, w = 0.10) => ({ armR: { ik: [x, y, z], ikw: 1, pole: PR }, armL: { ik: [x - w, y, z], ikw: 1, pole: PL } });
const SQUAT = merge(S0, { bob: -0.55, hip: { z: -0.14 }, spine: { bend: 38 }, neck: { nod: 4 }, legL: { knee: [-0.5, 0, 1] }, legR: { knee: [0.5, 0, 1] } }, at(0.53, 0.63));
const BAG = kg => ({ x_hpR_bag: 1, x_kgR: kg, x_yawR: 90 }), NONE = { x_hpR_bag: 0, x_kgR: 0, x_yawR: 90 };
const tremble = { 'spine.side': [0.8, 3], 'neck.tilt': [0.8, 4], bob: [0.006, 3] };
export default { name: 'Act_LiftHeavy_Once', clip: 'Act_LiftHeavy_Once', group: 'Act', loop: false, frames: 88, base: 'STAND', end: 'CARRY', style: 'kaiships',
  needs: { props: ['bag'], hands: 'both', marks: [{ kind: 'bag', at: [0.38, 0.03, 0], until: 31, cross: true }] },
  keys: [
    K(0, merge(S0, NONE, { hip: { z: 0 } })),
    K(8, merge(S0, { neck: { nod: 26 } })),                                                         // sees it
    K(16, merge(S0, { bob: 0.02, spine: { bend: -4 }, neck: { nod: 20 }, armL: { swing: -10 }, armR: { swing: -10 } })),   // the wind-up
    K(30, SQUAT),                                                                                   // fists land on the handle
    K(31, merge(SQUAT, BAG(0))), K(34, merge(SQUAT, BAG(0))),                                       // grip: held 4 f, the floor still carries it
    K(46, merge(SQUAT, BAG(CARRY_KG), at(0.57, 0.62), { bob: -0.52, hip: { z: -0.22 }, spine: { bend: 38 }, neck: { nod: -14 } }), { cycle: tremble }),   // the strain: it leaves the floor
    K(58, merge(S0, BAG(CARRY_KG), at(1.22, 0.46), { bob: -0.12, hip: { z: -0.16 }, spine: { bend: -6 }, neck: { nod: -4 } })),            // up, the bag in front
    K(68, merge(S0, BAG(CARRY_KG), at(1.30, 0.50, 0.36, 0.10), { x_yawR: 0, bob: -0.08, hip: { z: -0.10 }, spine: { bend: -2, side: -4 } })),  // turned, to the right
    K(70, merge(S0, BAG(CARRY_KG), at(1.30, 0.50, 0.38, 0.10), { x_yawR: 0, bob: -0.08, hip: { z: -0.09 }, spine: { bend: -2, side: -5 } })),   // the left lets go
    K(76, merge(S0, BAG(CARRY_KG), { x_yawR: 0, armR: { ik: [0.70, 1.16, 0.36], ikw: 1 }, armL: { ik: [0.30, 1.16, 0.55], ikw: 0, raise: 30, swing: 14, elbow: 35 }, bob: -0.08, hip: { z: -0.04 }, spine: { bend: 0, side: -7 }, pelvis: { roll: 3 } })),   // out to the side
    K(88, merge(C1, { x_yawR: 0, hip: { z: 0 }, armR: { ik: [0.70, 1.16, 0.36], ikw: 0 }, armL: { ik: [0.30, 1.16, 0.55], ikw: 0 } }))] };
