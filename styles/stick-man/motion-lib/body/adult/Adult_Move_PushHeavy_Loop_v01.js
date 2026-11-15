// Adult_Move_PushHeavy_Loop: pushing a heavy crate along, bent low, from motion capture (Quaternius UAL "Push_Loop",
// CC0, in place, ref/ual/push_loop.js) on this body: the feet pinned to their prints, the body travelling at the speed
// the captured feet slid back. Hot Money ep01 (SH150).
// The crate (motion-lib/props.js crate, x_hpB_crate) stands on the floor where the fists take it in the first step (GRAB),
// moves with them through the cycles and stays where they leave it as the closing step begins (engine/propobj.js; floor:
// the floor carries it, so it is no weight on the body). A film swaps in its own crate.
import { gaitLoop, holdKeys } from '../../base.js';
import SRC from '../../ref/ual/push_loop.js';

const G = gaitLoop({ body: 'adult', kind: 'walk', mocap: SRC, loopIntro: true });
const GRAB = 22, held = (ks, o) => holdKeys(ks, 'B', 'crate', o);
export default { name: 'Adult_Move_PushHeavy_Loop', clip: 'Move_PushHeavy_Loop', body: 'adult', group: 'Move', loop: true, frames: G.frames, base: 'STAND', style: 'kaiships',
  needs: { props: ['crate'], hands: 'both' }, ...G, intro: held(G.intro, { from: GRAB }), keys: held(G.keys), outro: held(G.outro, { to: 0 }) };
