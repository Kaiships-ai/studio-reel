// Act_SlideCash_Once: a bundle of notes from the pocket, laid on a counter and slid across, the hand stays on it a beat,
// lets go, comes back. The other hand rests on the counter's edge. The counter: clip space x 0.45 m, 0.90 m high.
import { stand, K, merge } from '../../base.js';

const S0 = stand('adult'), C = { x_hpR_cash: 1 }, NO = { x_hpR_cash: 0 };
// elbows out and down (explicit poles: no elbow flip as a hand passes the shoulder's plane)
const R = (y, z, x = 0.24) => ({ armR: { ik: [x, y, z], ikw: 1, pole: [0.8, -0.8, -0.2] } }), L = { armL: { ik: [-0.24, 1.56, 0.78], ikw: 1, pole: [-0.8, -0.8, -0.2] } }, LOFF = { armL: { ik: [-0.24, 1.56, 0.78], ikw: 0, pole: [-0.8, -0.8, -0.2] } };
export default { name: 'Act_SlideCash_Once', clip: 'Act_SlideCash_Once', group: 'Act', loop: false, frames: 76, base: 'STAND', style: 'kaiships',
  needs: { props: ['cash'], hands: 'R', marks: [{ kind: 'counter', at: [0.45, 0, 0.90] }, { kind: 'cash', at: [0.60, 0.15, 0.90], from: 47 }] },
  keys: [
    K(0, merge(S0, NO, LOFF, { armR: { ik: [0.36, 1.30, 0.08], ikw: 0, pole: [0.8, -0.8, -0.2] } })),
    K(10, merge(S0, NO, LOFF, R(1.30, 0.08, 0.36), { neck: { nod: 6 } })),                     // into the pocket
    K(12, merge(S0, C, LOFF, R(1.30, 0.08, 0.36), { neck: { nod: 6 } })), K(14, merge(S0, C, LOFF, R(1.31, 0.09, 0.36), { neck: { nod: 6 } })),
    K(26, merge(S0, C, L, R(1.57, 0.80), { spine: { bend: 12 }, neck: { nod: 14 } })),         // on the counter
    K(36, merge(S0, C, L, R(1.57, 0.95), { spine: { bend: 18 }, neck: { nod: 8 } })),          // slid across
    K(46, merge(S0, C, L, R(1.57, 0.96), { spine: { bend: 18 }, neck: { nod: 4 } })),          // the beat
    K(47, merge(S0, NO, L, R(1.60, 0.95), { spine: { bend: 18 }, neck: { nod: 4 } })),
    K(60, merge(S0, NO, L, R(1.62, 0.60), { spine: { bend: 6 }, neck: { nod: 2 } })),
    K(76, merge(S0, NO, LOFF, { armR: { ik: [0.24, 1.62, 0.60], ikw: 0 } }))] };
