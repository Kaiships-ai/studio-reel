// Adult_Move_Sprint_Fwd_Loop: a fast run, from motion capture (Mixamo "Fast Run", ref/mixamo/fast_run.js) on this body.
import { gaitLoop } from '../../base.js';
import FAST_RUN from '../../ref/mixamo/fast_run.js';
import STOP from '../../ref/mixamo/run_to_stop.js';

const G = gaitLoop({ body: 'adult', kind: 'run', mocap: FAST_RUN, stop: STOP });
export default { name: 'Adult_Move_Sprint_Fwd_Loop', clip: 'Move_Sprint_Fwd_Loop', body: 'adult', group: 'Move', loop: true, frames: G.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, ...G };
