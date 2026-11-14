// Child_Move_Run_Fwd_Loop: a scamper: quick steps, a little flight, arms pumping. Gravity owns the flight (motion.js ballistic, g = 9.8).
import { gaitLoop } from '../../base.js';

const G = gaitLoop({ body: 'child', kind: 'run' });
export default { name: 'Child_Move_Run_Fwd_Loop', clip: 'Move_Run_Fwd_Loop', body: 'child', group: 'Move', loop: true, frames: G.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, ...G };
