// Adult_Gest_LookBack_Once: a quick nervous look over the right shoulder, from motion capture (Mixamo "Look Over Shoulder", ref/mixamo/look_over_shoulder.js) on this body, every captured frame. Hot Money ep01.
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/look_over_shoulder.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND' });
export default { name: 'Adult_Gest_LookBack_Once', clip: 'Gest_LookBack_Once', body: 'adult', group: 'Gest', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
