// Adult_Idle_CarryBag_Loop: standing with a heavy duffel hugged to the chest in both arms, from motion capture (Mixamo
// "Carrying", ref/mixamo/carry_idle.js) on this body, every captured frame, opened and closed on HUG (the capture's own
// first frame). The bag: motion-lib/props.js hugbag between the fists, 20 kg (x_kgB). Hot Money ep01.
import { mocapClip, holdKeys, HUG_KG } from '../../base.js';
import SRC from '../../ref/mixamo/carry_idle.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'HUG', end: 'HUG' });
export default { name: 'Adult_Idle_CarryBag_Loop', clip: 'Idle_CarryBag_Loop', body: 'adult', group: 'Idle', loop: true, frames: M.frames, base: 'HUG', end: 'HUG', style: 'kaiships',
  needs: { props: ['hugbag'], hands: 'both', marks: M.marks }, keys: holdKeys(M.keys, 'B', 'hugbag', { kg: HUG_KG }), captured: M.captured, rest: M.rest };
