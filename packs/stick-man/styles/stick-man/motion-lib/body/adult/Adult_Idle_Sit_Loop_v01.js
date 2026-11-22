// Adult_Idle_Sit_Loop: sitting at rest on a seat, shifting a little, from motion capture (Quaternius UAL
// "Sitting_Idle_Loop", CC0, ref/ual/sitting_idle_loop.js) on this body, every captured frame.
import { mocapClip } from '../../base.js';
import SRC from '../../ref/ual/sitting_idle_loop.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'SIT', end: 'SIT', seated: true });
export default { name: 'Adult_Idle_Sit_Loop', clip: 'Idle_Sit_Loop', body: 'adult', group: 'Idle', loop: true, frames: M.frames, base: 'SIT', end: 'SIT', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
