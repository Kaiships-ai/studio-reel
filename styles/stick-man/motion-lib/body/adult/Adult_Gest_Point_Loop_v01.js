// Adult_Gest_Point_Loop: standing, pointing ahead with the right hand, then the arm drops, from motion capture (Mixamo "Pointing", ref/mixamo/pointing.js) on this body: a loop in place.
import { mocapLoop } from '../../base.js';
import SRC from '../../ref/mixamo/pointing.js';

const M = mocapLoop({ body: 'adult', src: SRC });
export default { name: 'Adult_Gest_Point_Loop', clip: 'Gest_Point_Loop', body: 'adult', group: 'Gest', loop: true, frames: M.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, keys: M.keys, captured: M.captured };
