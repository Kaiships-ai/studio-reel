// Adult_Move_Run_Fwd_Loop: a run, from motion capture (Mixamo "Running", ref/mixamo/running.js) on this body: planted
// feet pinned to their prints, the body travelling at the speed the captured feet slid back.
import { gaitLoop } from '../../base.js';
import RUNNING from '../../ref/mixamo/running.js';

const G = gaitLoop({ body: 'adult', kind: 'run', mocap: RUNNING });
export default { name: 'Adult_Move_Run_Fwd_Loop', clip: 'Move_Run_Fwd_Loop', body: 'adult', group: 'Move', loop: true, frames: G.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, ...G };
