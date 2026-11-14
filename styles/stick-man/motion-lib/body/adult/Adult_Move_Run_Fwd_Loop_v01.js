// Adult_Move_Run_Fwd_Loop: a run: short ground contact, a flight on gravity, knees driving. Gravity owns the flight (motion.js ballistic, g = 9.8).
import { gaitLoop } from '../../base.js';

const G = gaitLoop({ body: 'adult', kind: 'run' });
export default { name: 'Adult_Move_Run_Fwd_Loop', clip: 'Move_Run_Fwd_Loop', body: 'adult', group: 'Move', loop: true, frames: G.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, ...G };
