// Adult_Move_Walk_Fwd_Loop: an even walk, heel strike and roll, arms swinging opposite the legs. Two steps a loop on planted feet; with `to` it starts and ends on STAND.
import { gaitLoop } from '../../base.js';

const G = gaitLoop({ body: 'adult', kind: 'walk' });
export default { name: 'Adult_Move_Walk_Fwd_Loop', clip: 'Move_Walk_Fwd_Loop', body: 'adult', group: 'Move', loop: true, frames: G.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, ...G };
