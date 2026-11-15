// Adult_Idle_LookAround_Loop: standing, looking round from side to side, wary, from motion capture (Mixamo "Look Around", ref/mixamo/look_around.js) on this body: a loop in place.
import { mocapLoop } from '../../base.js';
import SRC from '../../ref/mixamo/look_around.js';

const M = mocapLoop({ body: 'adult', src: SRC });
export default { name: 'Adult_Idle_LookAround_Loop', clip: 'Idle_LookAround_Loop', body: 'adult', group: 'Idle', loop: true, frames: M.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, keys: M.keys, captured: M.captured };
