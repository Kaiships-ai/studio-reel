// Heavy_Gest_Yawn_Once: a tired stretch and yawn, from motion capture (Mixamo "Yawn", ref/mixamo/yawn.js) on the heavy
// body, every captured frame. Mixamo batch 1 (V4 film).
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/yawn.js';

const M = mocapClip({ body: 'heavy', src: SRC, base: 'STAND', end: 'STAND' });
export default { name: 'Heavy_Gest_Yawn_Once', clip: 'Gest_Yawn_Once', body: 'heavy', group: 'Gest', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
