// Elder_Move_OldWalk_Fwd_Loop: an old man's shuffle, stooped, small steps, from motion capture (Mixamo "Old Man Walk",
// ref/mixamo/old_man_walk.js) on the elder body: planted feet pinned to their prints, the body travelling at the speed
// the captured feet slid back. Mixamo batch 1 (V4 film).
import { gaitLoop } from '../../base.js';
import SRC from '../../ref/mixamo/old_man_walk.js';

const G = gaitLoop({ body: 'elder', kind: 'walk', mocap: SRC, loopIntro: true, bobLow: true });
export default { name: 'Elder_Move_OldWalk_Fwd_Loop', clip: 'Move_OldWalk_Fwd_Loop', body: 'elder', group: 'Move', loop: true, frames: G.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, ...G };
