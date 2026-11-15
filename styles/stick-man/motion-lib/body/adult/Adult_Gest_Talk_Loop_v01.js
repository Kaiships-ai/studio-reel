// Adult_Gest_Talk_Loop: standing, talking with both hands, from motion capture (Mixamo "Talking", ref/mixamo/talking.js) on this body: a loop in place.
import { mocapLoop } from '../../base.js';
import SRC from '../../ref/mixamo/talking.js';

// (the blend from STAND into the capture over 16 frames, not the library's 14: at 14 the forearm turned 27.4 deg/f)
const M = mocapLoop({ body: 'adult', src: SRC, ease: 16 });
export default { name: 'Adult_Gest_Talk_Loop', clip: 'Gest_Talk_Loop', body: 'adult', group: 'Gest', loop: true, frames: M.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, keys: M.keys, captured: M.captured };
