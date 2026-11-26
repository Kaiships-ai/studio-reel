// Elder_Idle_Sit_Loop: seated, glancing side to side, Mixamo "Sitting" (ref/mixamo/sitting_side_look.js) on the elder body, every captured frame.
import { ownClip } from '../../base.js';
import SRC from '../../ref/mixamo/sitting_side_look.js';

const M = ownClip({ body: 'elder', src: SRC, base: 'SIT', end: 'SIT', loop: true, ease: 20, seated: true, bones: true, seat: true });
export default { name: 'Elder_Idle_Sit_Loop', clip: 'Idle_Sit_Loop', body: 'elder', group: 'Idle', loop: true, frames: M.frames, base: 'SIT', end: 'SIT', style: 'kaiships', perform: true,
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
