// Adult_Move_TurnLeft_Once: a quarter turn to the left on the spot, from motion capture (Mixamo "Left Turn 90", ref/mixamo/left_turn_90.js) on this body, every captured frame.
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/left_turn_90.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND', turn: true });
export default { name: 'Adult_Move_TurnLeft_Once', clip: 'Move_TurnLeft_Once', body: 'adult', group: 'Move', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured };
