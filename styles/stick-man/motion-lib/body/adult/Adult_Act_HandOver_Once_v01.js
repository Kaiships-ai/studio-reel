// Adult_Act_HandOver_Once: reach forward and hand something over (slide it across a counter), from motion capture (Quaternius UAL "Interact", CC0, ref/ual/interact.js) on this body, every captured frame. Hot Money ep01.
import { mocapClip } from '../../base.js';
import SRC from '../../ref/ual/interact.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND' });
export default { name: 'Adult_Act_HandOver_Once', clip: 'Act_HandOver_Once', body: 'adult', group: 'Act', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
