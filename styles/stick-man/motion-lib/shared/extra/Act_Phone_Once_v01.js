// Act_Phone_Once: a call. The hand takes the phone from the hip pocket, up to the ear (the head tips toward it), the
// call held with small nods, then the phone back to the pocket.
import { stand, K, merge } from '../../base.js';

const S0 = stand('adult'), P = { x_hpR_phone: 1 }, NO = { x_hpR_phone: 0 }, L = { armL: { raise: 14, swing: 14, elbow: 55 } };
const R = (y, z, x) => ({ armR: { ik: [x, y, z], ikw: 1 } });
const EAR = merge(S0, P, L, R(2.36, 0.10, 0.64), { neck: { tilt: 4 } }), WAY = merge(S0, P, L, R(1.95, 0.30, 0.74));
export default { name: 'Act_Phone_Once', clip: 'Act_Phone_Once', group: 'Act', loop: false, frames: 100, base: 'STAND', style: 'kaiships',
  needs: { props: ['phone'], hands: 'R' },
  keys: [K(0, merge(S0, NO, { armR: { ik: [0.36, 1.30, 0.06], ikw: 0 } })), K(10, merge(S0, NO, R(1.30, 0.06, 0.36))), K(12, merge(S0, P, R(1.30, 0.06, 0.36))),
    K(19, WAY), K(28, EAR), K(66, merge(EAR, { neck: { nod: 3 } }), { cycle: { 'neck.nod': [2.5, 19] } }),
    K(78, WAY), K(86, merge(S0, P, R(1.30, 0.06, 0.36))), K(89, merge(S0, NO, R(1.30, 0.06, 0.36))), K(100, merge(S0, NO, { armR: { ik: [0.36, 1.30, 0.06], ikw: 0 } }))] };
