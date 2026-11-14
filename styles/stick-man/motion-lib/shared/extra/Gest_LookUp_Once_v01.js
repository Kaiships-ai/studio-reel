// Gest_LookUp_Once: something above. A small dip of the head first, then the head and chest tip back to look up, the
// arms drift back with the lean, hold, and come back down.
import { stand, K, merge } from '../../base.js';

const S0 = stand('adult'), UP = merge(S0, { spine: { bend: -10 }, neck: { nod: -34 }, bob: -0.01, armL: { swing: -8, raise: 14 }, armR: { swing: -8, raise: 14 } });
export default { name: 'Gest_LookUp_Once', clip: 'Gest_LookUp_Once', group: 'Gest', loop: false, frames: 70, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null },
  keys: [K(0, S0), K(6, merge(S0, { neck: { nod: 6 } })), K(18, UP), K(48, merge(UP, { neck: { nod: -32, turn: 6 } }), { cycle: { 'neck.turn': [2, 30] } }), K(58, merge(S0, { neck: { nod: -6 } })), K(70, S0)] };
