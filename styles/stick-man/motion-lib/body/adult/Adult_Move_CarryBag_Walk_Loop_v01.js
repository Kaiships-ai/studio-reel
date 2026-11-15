// Adult_Move_CarryBag_Walk_Loop: walking with a heavy duffel hugged to the chest in both arms, from motion capture (Mixamo
// "Walking" carrying, in place, ref/mixamo/carry_walk.js; closing on Mixamo "Walk To Stop" carrying) on this body: the
// feet pinned to their prints, the body travelling at the speed the captured feet slid back; opened and closed on HUG.
// The bag: motion-lib/props.js hugbag between the fists, 20 kg (x_kgB). Hot Money ep01 (SH060, SH130).
import { gaitLoop, hug, holdKeys, HUG_KG } from '../../base.js';
import SRC from '../../ref/mixamo/carry_walk.js';
import STOP from '../../ref/mixamo/carry_walk_to_stop.js';

const G = gaitLoop({ body: 'adult', kind: 'walk', mocap: SRC, stop: STOP, loopIntro: true, basePose: hug });
const held = ks => holdKeys(ks, 'B', 'hugbag', { kg: HUG_KG });
export default { name: 'Adult_Move_CarryBag_Walk_Loop', clip: 'Move_CarryBag_Walk_Loop', body: 'adult', group: 'Move', loop: true, frames: G.frames, base: 'HUG', style: 'kaiships',
  needs: { props: ['hugbag'], hands: 'both' }, ...G, keys: held(G.keys), intro: held(G.intro), outro: held(G.outro) };
