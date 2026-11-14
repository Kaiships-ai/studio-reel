// Adult_Idle_Tired_Loop: worn out. Shoulders slumped, head hanging, arms dead at the sides, slow deep breaths that lift
// the chest and drop it; the weight sinks into one hip.
import { stand, K, merge } from '../../base.js';

const N = 90, T0 = merge(stand('adult'), { bob: -0.05, spine: { bend: 14, side: 0 }, neck: { nod: 18 }, pelvis: { roll: 0 }, hip: { x: 0 },
  armL: { raise: 6, swing: -4, elbow: 10 }, armR: { raise: 6, swing: -4, elbow: 10 } });
const cycle = { 'spine.bend': [3, 45], 'neck.nod': [2, 45] };
export default { name: 'Adult_Idle_Tired_Loop', clip: 'Idle_Tired_Loop', body: 'adult', group: 'Idle', loop: true, frames: N, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null },
  keys: [K(0, T0, { cycle }), K(45, merge(T0, { hip: { x: 0.03 }, pelvis: { roll: 3 }, spine: { side: -2 }, neck: { nod: 14, tilt: 3 } }), { cycle }), K(N, T0, { cycle })] };
