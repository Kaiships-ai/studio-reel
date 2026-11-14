// Act_DropInTrunk_Once: from CARRY, heave the bag over a car's trunk lip (0.68 m) and let it drop in. The bag comes round to
// the front and turns crosswise as the left fist takes the handle too, a dip (the wind-up: knees give, the bag low), the
// heave up and forward over the lip with the hips back against the load, the release over the trunk (the bag falls on
// its own: the set drops it with gravity), the follow-through, STAND. The lip: clip space x 0.30 m, 0.68 m high; the
// trunk floor 0.55 m.
import { stand, carry, K, merge, CARRY_KG } from '../../base.js';

// elbows out and down (explicit poles): the wanted elbow already clears the body, so the solver never has to swing it
// round to the other side between two frames
const PR = [0.8, -0.6, -0.2], PL = [-0.8, -0.6, -0.2];
const S0 = stand('adult'), C1 = carry('adult');
const BAG = { x_hpR_bag: 1, x_kgR: CARRY_KG, x_yawR: 90 }, NONE = { x_hpR_bag: 0, x_kgR: 0, x_yawR: 90 };
// both fists on the handle: the right one holds the bag, the left 0.10 W to its left (figure frame, W)
const hands = (y, z, x = 0.05) => ({ armR: { ik: [x, y, z], ikw: 1, pole: PR }, armL: { ik: [x - 0.10, y, z], ikw: 1, pole: PL } });
// the FK under the ik is the arms forward (swing 50): after the release the targets come back to where those FK hands
// are, and only then does the ik weight go (no pop when the hands let go)
const FK = { armR: { raise: 12, swing: 50, elbow: 30 }, armL: { raise: 12, swing: 50, elbow: 30 } };
const FWD = (w = 1) => ({ armR: { ik: [0.33, 1.57, 0.88], ikw: w, pole: PR }, armL: { ik: [-0.33, 1.57, 0.88], ikw: w, pole: PL } });
export default { name: 'Act_DropInTrunk_Once', clip: 'Act_DropInTrunk_Once', group: 'Act', loop: false, frames: 80, base: 'CARRY', end: 'STAND', style: 'kaiships',
  needs: { props: ['bag'], hands: 'both', marks: [{ kind: 'trunk', at: [0.30, 0, 0.68], floor: 0.50 }, { kind: 'bag', drop: true, cross: true, from: 36, at: [0.45, 0.03, 0.77], v: [0.4, 0], fall: 0.50 }] },
  keys: [
    K(0, merge(C1, { x_yawR: 0, armR: { ik: [0.40, 1.30, 0.50], ikw: 0 }, armL: { ik: [0.30, 1.30, 0.50], ikw: 0 } })),
    K(6, merge(C1, { x_yawR: 45, shrugR: -0.04, spine: { side: -9 }, armR: { ik: [0.58, 1.30, 0.42], ikw: 1, pole: PR }, armL: { ik: [0.30, 1.30, 0.50], ikw: 0, raise: 40, swing: 35, elbow: 30 } })),          // the bag swung out ahead of the leg
    K(12, merge(S0, BAG, hands(1.30, 0.52, 0.22), { spine: { side: -3, bend: 2 }, hip: { z: -0.08 } })),           // round to the front, the left fist joins
    K(20, merge(S0, BAG, hands(1.15, 0.48), { bob: -0.16, hip: { z: -0.12 }, spine: { bend: 8 }, neck: { nod: 8 } })),   // the dip
    K(30, merge(S0, BAG, FK, hands(1.78, 0.74), { bob: 0.02, hip: { z: -0.12 }, spine: { bend: 20 }, neck: { nod: -10 } }), { t: 10 }),   // the heave over the lip
    K(32, merge(S0, BAG, FK, hands(1.80, 0.75), { bob: 0.02, hip: { z: -0.12 }, spine: { bend: 21 }, neck: { nod: -6 } })),
    K(33, merge(S0, BAG, FK, hands(1.80, 0.75), { x_kgR: 12, bob: 0.02, hip: { z: -0.10 }, spine: { bend: 21 }, neck: { nod: -2 } })),     // the fingers open: the load
    K(36, merge(S0, NONE, FK, hands(1.79, 0.76), { bob: 0.01, hip: { z: -0.08 }, spine: { bend: 20 }, neck: { nod: 4 } })),                  // leaves the fingers over 3 frames
    K(46, merge(S0, NONE, FK, FWD(), { bob: -0.04, hip: { z: -0.06 }, spine: { bend: 18 }, neck: { nod: 20 } })),    // follow-through: watching it land
    K(54, merge(S0, NONE, FK, FWD(0), { hip: { z: -0.02 }, spine: { bend: 10 }, neck: { nod: 12 } })),
    K(66, merge(S0, NONE, FWD(0), { hip: { z: 0 }, spine: { bend: 4 }, neck: { nod: 6 } })),
    K(80, merge(S0, NONE, FWD(0), { hip: { z: 0 } }))] };
