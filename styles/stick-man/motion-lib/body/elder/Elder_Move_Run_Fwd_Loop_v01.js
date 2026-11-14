// Elder_Move_Run_Fwd_Loop: a slow shuffling jog: long contact, a tiny flight. Gravity owns the flight (motion.js ballistic, g = 9.8).
import { gaitLoop } from '../../base.js';

const G = gaitLoop({ body: 'elder', kind: 'run' });
export default { name: 'Elder_Move_Run_Fwd_Loop', clip: 'Move_Run_Fwd_Loop', body: 'elder', group: 'Move', loop: true, frames: G.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, ...G };
