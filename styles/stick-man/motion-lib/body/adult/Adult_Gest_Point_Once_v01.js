// Adult_Gest_Point_Once: standing, pointing ahead, from motion capture (Mixamo "Pointing", ref/mixamo/pointing_stand.js)
// on this body, every captured frame. Mixamo batch 1 (V4 film).
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/pointing_stand.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND' });
export default { name: 'Adult_Gest_Point_Once', clip: 'Gest_Point_Once', body: 'adult', group: 'Gest', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
