// Adult_Idle_Stand_Loop: standing at rest, breathing, the weight settling, from motion capture (Quaternius UAL
// "Idle_Loop", CC0, ref/ual/idle_loop.js) on this body: a loop in place.
import { mocapLoop } from '../../base.js';
import SRC from '../../ref/ual/idle_loop.js';

const M = mocapLoop({ body: 'adult', src: SRC });
export default { name: 'Adult_Idle_Stand_Loop', clip: 'Idle_Stand_Loop', body: 'adult', group: 'Idle', loop: true, frames: M.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, keys: M.keys, captured: M.captured };
