// Adult_Act_Consume_Once: bring food to the mouth, bite, lower it, from motion capture (Quaternius UAL "Consume", CC0, ref/ual/consume.js) on this body, every captured frame. Hot Money ep01.
import { mocapClip } from '../../base.js';
import SRC from '../../ref/ual/consume.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND' });
export default { name: 'Adult_Act_Consume_Once', clip: 'Act_Consume_Once', body: 'adult', group: 'Act', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
