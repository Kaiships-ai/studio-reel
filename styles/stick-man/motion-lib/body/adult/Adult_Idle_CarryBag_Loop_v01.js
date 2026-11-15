// Adult_Idle_CarryBag_Loop: standing with a heavy load hugged in both arms, from motion capture (Mixamo "Carrying", ref/mixamo/carry_idle.js) on this body, every captured frame. Hot Money ep01.
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/carry_idle.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND' });
export default { name: 'Adult_Idle_CarryBag_Loop', clip: 'Idle_CarryBag_Loop', body: 'adult', group: 'Idle', loop: true, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
