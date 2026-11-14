// Heavy_Idle_Breath_Loop: a heavy body (girth 1.9, 115 kg) standing, breathing, the weight drifting to one foot and back. Background idle.
import { stand, K, merge } from '../../base.js';
import { BODIES } from '../../bodies.js';

const Bd = BODIES.heavy.breath, N = 2 * Bd.per, S0 = stand('heavy');
const cycle = { 'spine.bend': [Bd.amp, Bd.per], 'neck.tilt': [Bd.amp * 0.8, Bd.per, 0] };
// the weight shift: the hips over the right foot, the shoulders a little the other way
const shift = merge(S0, { hip: { x: Bd.shift }, pelvis: { roll: 2 }, spine: { side: -2 }, neck: { tilt: 1.5 } });
export default { name: 'Heavy_Idle_Breath_Loop', clip: 'Idle_Breath_Loop', body: 'heavy', group: 'Idle', loop: true, frames: N, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null },
  keys: [K(0, merge(S0, { hip: { x: 0 } }), { cycle }), K(N / 2, shift, { cycle }), K(N, merge(S0, { hip: { x: 0 } }), { cycle })] };
