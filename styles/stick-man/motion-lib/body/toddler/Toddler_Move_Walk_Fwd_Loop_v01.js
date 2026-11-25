// Toddler_Move_Walk_Fwd_Loop: quick short steps on wide-set feet, rocking from side to side, the arms held out. Two steps a loop on planted feet; with `to` it starts and ends on STAND.
import { gaitLoop } from '../../base.js';

const G = gaitLoop({ body: 'toddler', kind: 'walk' });
export default { name: 'Toddler_Move_Walk_Fwd_Loop', clip: 'Move_Walk_Fwd_Loop', body: 'toddler', group: 'Move', loop: true, frames: G.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, ...G };
