// Adult_Move_CarryBag_Walk_Loop: walking with a heavy load hugged in both arms, from motion capture (Mixamo "Walking"
// carrying, in place, ref/mixamo/carry_walk.js; closing on Mixamo "Walk To Stop" carrying) on this body: the feet pinned
// to their prints, the body travelling at the speed the captured feet slid back. Hot Money ep01 (SH060, SH130).
import { gaitLoop } from '../../base.js';
import SRC from '../../ref/mixamo/carry_walk.js';
import STOP from '../../ref/mixamo/carry_walk_to_stop.js';

const G = gaitLoop({ body: 'adult', kind: 'walk', mocap: SRC, stop: STOP, loopIntro: true });
export default { name: 'Adult_Move_CarryBag_Walk_Loop', clip: 'Move_CarryBag_Walk_Loop', body: 'adult', group: 'Move', loop: true, frames: G.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, ...G };
