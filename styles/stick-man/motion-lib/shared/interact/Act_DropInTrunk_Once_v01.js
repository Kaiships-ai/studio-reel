// Act_DropInTrunk_Once: from CARRY, heave the bag over a car's trunk lip (0.68 m) and let it drop in. The bag comes round to
// the front and turns crosswise as the left fist takes the handle too, a dip (the wind-up: knees give, the bag low), the
// heave up and forward over the lip with the hips back against the load, the release over the trunk (the bag falls on
// its own: the set drops it with gravity), the follow-through, STAND. The lip: clip space x 0.30 m, 0.68 m high; the
// trunk floor 0.55 m.
import { stand, carry, K, merge, CARRY_KG } from '../../base.js';

const S0 = stand('adult'), C1 = carry('adult');
const BAG = { x_hpR_bag: 1, x_kgR: CARRY_KG, x_yawR: 90 }, NONE = { x_hpR_bag: 0, x_kgR: 0, x_yawR: 90 };
// both fists on the handle: the right one holds the bag, the left 0.10 W to its left (figure frame, W)
const hands = (y, z, x = 0.05) => ({ armR: { ik: [x, y, z], ikw: 1 }, armL: { ik: [x - 0.10, y, z], ikw: 1 } });
const free = { armR: { ikw: 0 }, armL: { ikw: 0 } };
const FKUP = { armR: { raise: 4, swing: 66, elbow: 30 }, armL: { raise: 4, swing: 66, elbow: 30 } };   // the FK under the ik while the fists hold
// after the release the arms are free (FK), already where the hands let go, so the switch does not move them
const LET = { armR: { ikw: 0, raise: 4, swing: 66, elbow: 30 }, armL: { ikw: 0, raise: 4, swing: 66, elbow: 30 } };
export default { name: 'Act_DropInTrunk_Once', clip: 'Act_DropInTrunk_Once', group: 'Act', loop: false, frames: 80, base: 'CARRY', end: 'STAND', style: 'kaiships',
  needs: { props: ['bag'], hands: 'both', marks: [{ kind: 'trunk', at: [0.30, 0, 0.68], floor: 0.50 }, { kind: 'bag', drop: true, cross: true, from: 33, at: [0.45, 0.03, 0.77], v: [0.4, 0], fall: 0.50 }] },
  keys: [
    K(0, merge(C1, { x_yawR: 0, armR: { ik: [0.40, 1.30, 0.50], ikw: 0 }, armL: { ik: [0.30, 1.30, 0.50], ikw: 0 } })),
    K(12, merge(S0, BAG, hands(1.30, 0.52, 0.30), { spine: { side: -3, bend: 2 }, hip: { z: -0.08 } })),           // round to the front, the left fist joins
    K(20, merge(S0, BAG, hands(1.15, 0.48), { bob: -0.16, hip: { z: -0.12 }, spine: { bend: 8 }, neck: { nod: 8 } })),   // the dip
    K(30, merge(S0, BAG, FKUP, hands(1.78, 0.74), { bob: 0.02, hip: { z: -0.12 }, spine: { bend: 20 }, neck: { nod: -10 } }), { t: 10 }),   // the heave over the lip
    K(32, merge(S0, BAG, FKUP, hands(1.80, 0.75), { bob: 0.02, hip: { z: -0.12 }, spine: { bend: 21 }, neck: { nod: -6 } })),
    K(33, merge(S0, NONE, FKUP, hands(1.80, 0.75), { bob: 0.02, hip: { z: -0.10 }, spine: { bend: 21 }, neck: { nod: -2 } })),     // let go
    K(34, merge(S0, NONE, hands(1.80, 0.75), LET, { bob: 0.02, hip: { z: -0.10 }, spine: { bend: 21 }, neck: { nod: 2 } })),
    K(46, merge(S0, NONE, LET, { armR: { swing: 50, elbow: 30 }, armL: { swing: 50, elbow: 30 }, bob: -0.04, hip: { z: -0.06 }, spine: { bend: 18 }, neck: { nod: 20 } })),    // follow-through: watching it land
    K(62, merge(S0, NONE, free, { hip: { z: 0 }, spine: { bend: 4 }, neck: { nod: 6 } })),
    K(80, merge(S0, NONE, free, { hip: { z: 0 } }))] };
