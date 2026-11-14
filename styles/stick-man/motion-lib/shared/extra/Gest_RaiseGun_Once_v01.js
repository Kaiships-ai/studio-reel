// Gest_RaiseGun_Once: the gun is implied, never shown: both fists come up together to eye line and push out at arm's
// length (a two-hand aim), hold, and come down. The film may hang its own gun prop on the right fist.
import { stand, K, merge } from '../../base.js';

const S0 = stand('adult');
const AIM = { armR: { ik: [0.10, 2.10, 0.86], ikw: 1 }, armL: { ik: [0.00, 2.06, 0.84], ikw: 1 } };
const OFF = { armR: { ik: [0.10, 2.10, 0.86], ikw: 0 }, armL: { ik: [0.00, 2.06, 0.84], ikw: 0 } };
export default { name: 'Gest_RaiseGun_Once', clip: 'Gest_RaiseGun_Once', group: 'Gest', loop: false, frames: 74, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: 'both', note: 'implied: no gun is shown' },
  keys: [K(0, merge(S0, OFF)), K(6, merge(S0, OFF, { spine: { bend: 2 }, armL: { swing: -6 }, armR: { swing: -6 } })),
    K(18, merge(S0, AIM, { spine: { bend: 6, twist: -6 }, neck: { nod: 4 } }), { t: 12 }),
    K(22, merge(S0, AIM, { spine: { bend: 5, twist: -6 }, neck: { nod: 5 } })),
    K(52, merge(S0, AIM, { spine: { bend: 5, twist: -6 }, neck: { nod: 5 } }), { cycle: { 'neck.turn': [1.2, 26] } }),
    K(64, merge(S0, OFF)), K(74, merge(S0, OFF))] };
