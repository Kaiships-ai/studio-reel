// Adult_Gest_NodYes_Once: a plain yes nod, from motion capture (Mixamo "Head Nod Yes", ref/mixamo/head_nod_yes.js) on
// this body, every captured frame. Mixamo batch 1 (V4 film).
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/head_nod_yes.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND' });
export default { name: 'Adult_Gest_NodYes_Once', clip: 'Gest_NodYes_Once', body: 'adult', group: 'Gest', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
