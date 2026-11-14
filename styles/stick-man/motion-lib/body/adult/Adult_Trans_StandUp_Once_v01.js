// Adult_Trans_StandUp_Once: stand up from a seat, from motion capture (Mixamo "Sit To Stand", ref/mixamo/sit_to_stand.js) on this body, every captured frame.
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/sit_to_stand.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'SIT', end: 'STAND', seated: true });
export default { name: 'Adult_Trans_StandUp_Once', clip: 'Trans_StandUp_Once', body: 'adult', group: 'Trans', loop: false, frames: M.frames, base: 'SIT', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured };
