// Act_WearCap_Once: a cap from the hip pocket onto the head, set from the side with the elbow high. The hand takes the
// cap under its right rim, swings it up and out round the head, the head tips away and the hand lowers the cap onto the
// crown, holds it there 4 frames, lets go and drops; the head comes back up straight wearing it (cast.js head slot
// x_hpH_cap). From the side because a stick arm is barely longer than the head is wide: no hand reaches the crown from
// above or the brow from the front without passing through the head. Starts STAND without a cap, ends STAND wearing it.
import { stand, K, merge } from '../../base.js';

const S0 = stand('adult');
// the cap in the hand matches the head's roll at the hand-off (the head tipped 12 deg away rolls the crown 19 deg)
const INHAND = roll => ({ x_hpR_cap: 1, x_hpH_cap: 0, x_tiltR: roll }), ON = { x_hpR_cap: 0, x_hpH_cap: 1, x_tiltR: 0 }, NONE = { x_hpR_cap: 0, x_hpH_cap: 0, x_tiltR: 0 };
// the elbow out to the side (pole): the arm goes round the head, never through it
const R = (y, z, x, w = 1) => ({ armR: { ik: [x, y, z], ikw: w, pole: [1, 0, 0] } });
const AWAY = { neck: { tilt: -12 }, spine: { side: -3 } }, SET = R(2.82, 0.08, 0.29);
export default { name: 'Act_WearCap_Once', clip: 'Act_WearCap_Once', group: 'Act', loop: false, frames: 76, base: 'STAND', style: 'kaiships',
  needs: { props: ['cap'], hands: 'R', note: 'ends wearing the cap (x_hpH_cap 1): key it on every later key' },
  keys: [
    K(0, merge(S0, NONE, R(1.32, 0.06, 0.36, 0))),
    K(10, merge(S0, NONE, R(1.32, 0.06, 0.36))), K(12, merge(S0, INHAND(0), R(1.32, 0.06, 0.36))),     // takes it from the pocket
    K(26, merge(S0, INHAND(-8), R(2.45, 0.25, 0.66), { neck: { tilt: -4 } })),                       // up and out, round the head
    K(31, merge(S0, INHAND(-12), R(2.72, 0.14, 0.52), { neck: { tilt: -9 }, spine: { side: -2 } })),                 // over the rim
    K(36, merge(S0, INHAND(-19), SET, AWAY)),                                                        // the head tips away, the cap goes on
    K(37, merge(S0, ON, SET, AWAY)), K(40, merge(S0, ON, SET, AWAY)),                                 // let go, the hand stays a beat
    K(50, merge(S0, ON, R(2.45, 0.20, 0.66), { neck: { tilt: -6 } })),                               // the hand away, out round the head
    K(57, merge(S0, ON, R(1.85, 0.28, 0.62), { neck: { tilt: -2 } })),
    K(64, merge(S0, ON, R(1.01, 0.13, 0.41), { neck: { tilt: 0 } })),                                // down to where the free arm hangs
    K(68, merge(S0, ON, R(1.01, 0.13, 0.41, 0))),
    K(76, merge(S0, ON, R(1.01, 0.13, 0.41, 0)))] };
