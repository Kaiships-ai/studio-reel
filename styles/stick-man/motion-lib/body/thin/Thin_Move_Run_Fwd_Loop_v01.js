// Thin_Move_Run_Fwd_Loop: a long light run, a high quick stride. Gravity owns the flight (motion.js ballistic, g = 9.8).
import { gaitLoop } from '../../base.js';

const G = gaitLoop({ body: 'thin', kind: 'run' });
export default { name: 'Thin_Move_Run_Fwd_Loop', clip: 'Move_Run_Fwd_Loop', body: 'thin', group: 'Move', loop: true, frames: G.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, ...G };
