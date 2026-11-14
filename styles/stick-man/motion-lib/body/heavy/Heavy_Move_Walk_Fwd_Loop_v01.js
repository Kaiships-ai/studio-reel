// Heavy_Move_Walk_Fwd_Loop: short slow steps on wide feet, the body rolling over each foot, arms out round the belly. Two steps a loop on planted feet; with `to` it starts and ends on STAND.
import { gaitLoop } from '../../base.js';

const G = gaitLoop({ body: 'heavy', kind: 'walk' });
export default { name: 'Heavy_Move_Walk_Fwd_Loop', clip: 'Move_Walk_Fwd_Loop', body: 'heavy', group: 'Move', loop: true, frames: G.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, ...G };
