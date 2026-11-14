// Act_WearCap_Once: a cap from the hip up onto the head. The hand takes the cap, brings it up beside the head, sets it
// on the crown (the hand holds it there 4 frames, the head dips into it), lets go and gives the peak a tug; the cap
// stays on (cast.js head slot x_hpH_cap). The hand holds the cap by its crown, so the cap hangs onto the head. Starts STAND without a cap, ends STAND wearing it.
import { stand, K, merge } from '../../base.js';

const S0 = stand('adult'), INHAND = { x_hpR_cap: 1, x_hpH_cap: 0 }, ON = { x_hpR_cap: 0, x_hpH_cap: 1 }, NONE = { x_hpR_cap: 0, x_hpH_cap: 0 };
// the elbow goes out and up (pole) and the head tips into the hand: a stick arm is barely longer than the head is wide
const R = (y, z, x = 0.30) => ({ armR: { ik: [x, y, z], ikw: 1, pole: [1, 0.4, 0.1] } });
export default { name: 'Act_WearCap_Once', clip: 'Act_WearCap_Once', group: 'Act', loop: false, frames: 70, base: 'STAND', style: 'kaiships',
  needs: { props: ['cap'], hands: 'R', note: 'ends wearing the cap (x_hpH_cap 1): key it on every later key' },
  keys: [
    K(0, merge(S0, NONE, { armR: { ik: [0.36, 1.32, 0.06], ikw: 0 } })),
    K(10, merge(S0, NONE, R(1.32, 0.06, 0.36))), K(12, merge(S0, INHAND, R(1.32, 0.06, 0.36))),      // takes it from the hip
    K(22, merge(S0, INHAND, R(2.40, 0.30, 0.78), { neck: { tilt: 4 } })),
    K(28, merge(S0, INHAND, R(2.95, 0.25, 0.42), { neck: { tilt: 14, nod: 10 }, spine: { side: 4 } })),                          // up beside the head
    K(34, merge(S0, INHAND, R(2.90, 0.14, 0.22), { neck: { tilt: 16, nod: 14 }, spine: { side: 5 } })),                            // set on the crown
    K(37, merge(S0, ON, R(2.90, 0.14, 0.22), { neck: { tilt: 16, nod: 14 }, spine: { side: 5 } })), K(40, merge(S0, ON, R(2.90, 0.14, 0.22), { neck: { tilt: 14, nod: 12 }, spine: { side: 4 } })),
    K(48, merge(S0, ON, R(2.62, 0.62, 0.10), { neck: { nod: 2 } })),                                // the tug on the peak
    K(70, merge(S0, ON, { armR: { ik: [0.10, 2.62, 0.62], ikw: 0 } }))] };
