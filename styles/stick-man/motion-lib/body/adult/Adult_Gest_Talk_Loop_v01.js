// Adult_Gest_Talk_Loop: standing, talking with both hands, from motion capture (Mixamo "Talking", ref/mixamo/talking.js) on this body: a loop in place.
import { mocapLoop } from '../../base.js';
import SRC from '../../ref/mixamo/talking.js';

const M = mocapLoop({ body: 'adult', src: SRC });
export default { name: 'Adult_Gest_Talk_Loop', clip: 'Gest_Talk_Loop', body: 'adult', group: 'Gest', loop: true, frames: M.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, keys: M.keys, captured: M.captured };
