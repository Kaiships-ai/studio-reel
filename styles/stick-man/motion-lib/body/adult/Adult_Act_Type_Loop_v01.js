// Adult_Act_Type_Loop: seated, typing on a keyboard in front, from motion capture (Mixamo "Typing",
// ref/mixamo/typing.js) on this body, every captured frame. Mixamo batch 1 (V4 film).
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/typing.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'SIT', end: 'SIT', seated: true, bones: true });
export default { name: 'Adult_Act_Type_Loop', clip: 'Act_Type_Loop', body: 'adult', group: 'Act', loop: true, frames: M.frames, base: 'SIT', end: 'SIT', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
