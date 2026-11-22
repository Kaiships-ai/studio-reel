// Adult_Gest_Talk_Loop: standing, talking with both hands, from motion capture (Quaternius UAL "Idle_Talking_Loop", CC0,
// ref/ual/idle_talking_loop.js) on this body: a loop in place.
import { mocapLoop } from '../../base.js';
import SRC from '../../ref/ual/idle_talking_loop.js';

const M = mocapLoop({ body: 'adult', src: SRC, ease: 16 });
export default { name: 'Adult_Gest_Talk_Loop', clip: 'Gest_Talk_Loop', body: 'adult', group: 'Gest', loop: true, frames: M.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, keys: M.keys, captured: M.captured };
