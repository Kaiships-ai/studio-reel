// Elder_Move_OldWalk_Fwd_Loop: an old man's shuffle, stooped, small steps, from motion capture (Mixamo "Old Man Walk",
// ref/mixamo/old_man_walk.js) on the elder body: planted feet pinned to their prints, the body travelling at the speed
// the captured feet slid back. Mixamo batch 1 (V4 film).
import { gaitLoop } from '../../base.js';
import SRC from '../../ref/mixamo/old_man_walk.js';

// (REVIEW-2: as captured, its hips pumped 9 cm a step on knees bending 28-70 deg, a crouched creep, not a frail walk: KNEE
// of the captured knees' bend kept, from straight, so the hips, solved from them, ride higher, as the elder's made walk's do
// (bodies.js walk.knees 16-34); and its steps STRIDE as long: with the feet that far apart the hips had to drop 8 cm in every
// double support for the back leg to reach its print)
const KNEE = 0.3, STRIDE = 0.55;
const G = gaitLoop({ body: 'elder', kind: 'walk', mocap: SRC, loopIntro: true, bobLow: true, stride: STRIDE, life: { knee: KNEE, loop: true } });
export default { name: 'Elder_Move_OldWalk_Fwd_Loop', clip: 'Move_OldWalk_Fwd_Loop', body: 'elder', group: 'Move', loop: true, frames: G.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, perform: true, ...G };
