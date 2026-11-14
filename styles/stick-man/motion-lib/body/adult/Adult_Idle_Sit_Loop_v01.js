// Adult_Idle_Sit_Loop: sitting at rest on a seat, shifting a little, from motion capture (Mixamo "Sitting Idle", ref/mixamo/sitting_idle.js) on this body, every captured frame.
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/sitting_idle.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'SIT', end: 'SIT', seated: true });
export default { name: 'Adult_Idle_Sit_Loop', clip: 'Idle_Sit_Loop', body: 'adult', group: 'Idle', loop: true, frames: M.frames, base: 'SIT', end: 'SIT', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured };
