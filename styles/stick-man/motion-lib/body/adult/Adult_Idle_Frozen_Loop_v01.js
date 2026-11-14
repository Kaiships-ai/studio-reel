// Adult_Idle_Frozen_Loop: frozen in fear. The body pulled back and held rigid, hands half up, shallow fast breath and a
// fine tremble; the head barely moves. Use after a take (React_FreezeInLight) or for a background figure caught out.
import { stand, K, merge } from '../../base.js';

const N = 60, F = merge(stand('adult'), { bob: -0.03, spine: { bend: -4 }, neck: { nod: -4 }, hip: { x: 0 },
  armL: { raise: 22, swing: 18, elbow: 55 }, armR: { raise: 22, swing: 18, elbow: 55 } });
const cycle = { 'spine.bend': [0.7, 15], 'spine.side': [0.5, 6], 'neck.tilt': [0.6, 5], 'armR.elbow': [1.2, 6], 'armL.elbow': [1.2, 5] };
export default { name: 'Adult_Idle_Frozen_Loop', clip: 'Idle_Frozen_Loop', body: 'adult', group: 'Idle', loop: true, frames: N, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null },
  keys: [K(0, F, { cycle }), K(30, merge(F, { bob: -0.035, neck: { nod: -2 } }), { cycle }), K(N, F, { cycle })] };
