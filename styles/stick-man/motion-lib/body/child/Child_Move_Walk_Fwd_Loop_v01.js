// Child_Move_Walk_Fwd_Loop: quick short steps with a lot of bounce, the head bobbing, arms swinging wide. Two steps a loop on planted feet; with `to` it starts and ends on STAND.
import { gaitLoop } from '../../base.js';

const G = gaitLoop({ body: 'child', kind: 'walk' });
export default { name: 'Child_Move_Walk_Fwd_Loop', clip: 'Move_Walk_Fwd_Loop', body: 'child', group: 'Move', loop: true, frames: G.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, ...G };
