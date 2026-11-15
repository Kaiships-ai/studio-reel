// Adult_Move_PushHeavy_Loop: pushing something heavy along, bent low, from motion capture (Quaternius UAL "Push_Loop",
// CC0, in place, ref/ual/push_loop.js) on this body: the feet pinned to their prints, the body travelling at the speed
// the captured feet slid back. Hot Money ep01 (SH150).
import { gaitLoop } from '../../base.js';
import SRC from '../../ref/ual/push_loop.js';

const G = gaitLoop({ body: 'adult', kind: 'walk', mocap: SRC, loopIntro: true });
export default { name: 'Adult_Move_PushHeavy_Loop', clip: 'Move_PushHeavy_Loop', body: 'adult', group: 'Move', loop: true, frames: G.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, ...G };
