// Heavy_Move_Run_Fwd_Loop: a heavy jog: long ground contact, a short low flight, a big roll. Gravity owns the flight (motion.js ballistic, g = 9.8).
import { gaitLoop } from '../../base.js';

const G = gaitLoop({ body: 'heavy', kind: 'run' });
export default { name: 'Heavy_Move_Run_Fwd_Loop', clip: 'Move_Run_Fwd_Loop', body: 'heavy', group: 'Move', loop: true, frames: G.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, ...G };
