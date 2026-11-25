// Toddler_Move_Run_Fwd_Loop: quick short steps on wide-set feet leaning ahead, the arms held out, a foot always on the floor. Two steps a loop on planted feet; with `to` it starts and ends on STAND.
import { gaitLoop } from '../../base.js';

const G = gaitLoop({ body: 'toddler', kind: 'run' });
export default { name: 'Toddler_Move_Run_Fwd_Loop', clip: 'Move_Run_Fwd_Loop', body: 'toddler', group: 'Move', loop: true, frames: G.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, ...G };
