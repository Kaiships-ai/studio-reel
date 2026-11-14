// Act_PushThroughWindow_Once: from CARRY, lift the bag to a window sill with both hands and shove it through. The bag
// comes to the front as the left fist joins, a dip, the bag up to sill height and onto it (the sill takes its weight), the shove (the arms through the opening,
// the hips back against the load), the release (the bag slides on and falls on the far side), the arms come back,
// STAND. The wall: clip space x 0.30-0.45 m, the opening 0.85-1.60 m high, 0.8 m wide.
import { stand, carry, K, merge, CARRY_KG } from '../../base.js';

const S0 = stand('adult'), C1 = carry('adult'), BAG = { x_hpR_bag: 1, x_kgR: CARRY_KG, x_yawR: 0 }, NONE = { x_hpR_bag: 0, x_kgR: 0, x_yawR: 0 };
const hands = (y, z, x = 0.10) => ({ armR: { ik: [x, y, z], ikw: 1 }, armL: { ik: [x - 0.10, y, z], ikw: 1 } });
const free = { armR: { ikw: 0 }, armL: { ikw: 0 } };
const FKUP = { armR: { raise: 4, swing: 80, elbow: 18 }, armL: { raise: 4, swing: 80, elbow: 18 } };   // the FK under the ik while the fists hold
const LET = { armR: { ikw: 0, raise: 4, swing: 80, elbow: 18 }, armL: { ikw: 0, raise: 4, swing: 80, elbow: 18 } };
export default { name: 'Act_PushThroughWindow_Once', clip: 'Act_PushThroughWindow_Once', group: 'Act', loop: false, frames: 82, base: 'CARRY', end: 'STAND', style: 'kaiships',
  needs: { props: ['bag'], hands: 'both', marks: [{ kind: 'window', at: [0.30, 0, 0.85], top: 1.60, depth: 0.15, width: 0.8 }, { kind: 'bag', drop: true, from: 39, at: [0.49, 0.06, 0.88], v: [0.9, 0], fall: 0 }] },
  keys: [
    K(0, merge(C1, { armR: { ik: [0.40, 1.30, 0.55], ikw: 0 }, armL: { ik: [0.30, 1.30, 0.55], ikw: 0 } })),
    K(12, merge(S0, BAG, hands(1.30, 0.55, 0.24), { spine: { side: -3, bend: 2 }, hip: { z: -0.08 } })),
    K(20, merge(S0, BAG, hands(1.20, 0.56), { bob: -0.14, hip: { z: -0.12 }, spine: { bend: 6 }, neck: { nod: -6 } })),       // the dip
    K(30, merge(S0, BAG, FKUP, hands(1.98, 0.60), { bob: 0.02, hip: { z: -0.08 }, spine: { bend: -2 }, neck: { nod: -16 } }), { t: 10 }),   // up to the sill
    // the bag's front end is on the sill now: the sill takes most of its weight, the arms only shove (x_kgR: what the hands carry)
    K(33, merge(S0, BAG, FKUP, hands(1.98, 0.66), { x_kgR: 8, bob: 0, hip: { z: -0.06 }, spine: { bend: 4 }, neck: { nod: -14 } })),
    K(38, merge(S0, BAG, { x_kgR: 5 }, FKUP, hands(1.98, 0.80), { bob: -0.02, hip: { z: -0.04 }, spine: { bend: 18 }, neck: { nod: -14 } })),       // the shove
    K(39, merge(S0, NONE, FKUP, hands(1.98, 0.82), { bob: -0.02, hip: { z: -0.03 }, spine: { bend: 18 }, neck: { nod: -12 } })),
    K(40, merge(S0, NONE, LET, hands(1.98, 0.82), LET, { bob: -0.02, hip: { z: -0.03 }, spine: { bend: 18 }, neck: { nod: -10 } })),      // let go
    K(52, merge(S0, NONE, LET, { armR: { swing: 55, elbow: 35 }, armL: { swing: 55, elbow: 35 }, hip: { z: -0.06 }, spine: { bend: 6 }, neck: { nod: -8 } })),                   // the arms back out
    K(66, merge(S0, NONE, free, { hip: { z: 0 } })),
    K(82, merge(S0, NONE, free, { hip: { z: 0 } }))] };
