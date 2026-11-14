// Adult_Gest_PointSeated_Loop: seated, pointing ahead with the right hand, from motion capture (Mixamo "Pointing (seated)", ref/mixamo/pointing_seated.js) on this body, every captured frame.
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/pointing_seated.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'SIT', end: 'SIT', seated: true });
export default { name: 'Adult_Gest_PointSeated_Loop', clip: 'Gest_PointSeated_Loop', body: 'adult', group: 'Gest', loop: true, frames: M.frames, base: 'SIT', end: 'SIT', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
