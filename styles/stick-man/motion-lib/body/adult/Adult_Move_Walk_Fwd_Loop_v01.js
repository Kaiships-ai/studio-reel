// Adult_Move_Walk_Fwd_Loop: a walk, from motion capture (Mixamo "Walking", ref/mixamo/walking.js) on this body: planted
// feet pinned to their prints, the body travelling at the speed the captured feet slid back.
import { gaitLoop } from '../../base.js';
import WALKING from '../../ref/mixamo/walking.js';

const G = gaitLoop({ body: 'adult', kind: 'walk', mocap: WALKING });
export default { name: 'Adult_Move_Walk_Fwd_Loop', clip: 'Move_Walk_Fwd_Loop', body: 'adult', group: 'Move', loop: true, frames: G.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, ...G };
