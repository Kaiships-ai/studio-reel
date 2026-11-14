// Adult_Gest_Wave_Loop: standing, waving one hand overhead, from motion capture (Mixamo "Waving", ref/mixamo/waving.js) on this body: a loop in place.
import { mocapLoop } from '../../base.js';
import SRC from '../../ref/mixamo/waving.js';

const M = mocapLoop({ body: 'adult', src: SRC, times: 4 });
export default { name: 'Adult_Gest_Wave_Loop', clip: 'Gest_Wave_Loop', body: 'adult', group: 'Gest', loop: true, frames: M.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, keys: M.keys, captured: M.captured };
