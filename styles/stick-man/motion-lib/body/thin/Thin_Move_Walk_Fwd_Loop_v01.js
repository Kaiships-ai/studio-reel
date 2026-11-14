// Thin_Move_Walk_Fwd_Loop: long light steps on narrow feet, little roll. Two steps a loop on planted feet; with `to` it starts and ends on STAND.
import { gaitLoop } from '../../base.js';

const G = gaitLoop({ body: 'thin', kind: 'walk' });
export default { name: 'Thin_Move_Walk_Fwd_Loop', clip: 'Move_Walk_Fwd_Loop', body: 'thin', group: 'Move', loop: true, frames: G.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, ...G };
