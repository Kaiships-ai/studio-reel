// Heavy_Gest_ShakeNo_Once: an annoyed no, the head shaking, from motion capture (Mixamo "Annoyed Head Shake",
// ref/mixamo/annoyed_head_shake.js) on the heavy body, every captured frame. Mixamo batch 1 (V4 film).
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/annoyed_head_shake.js';

const M = mocapClip({ body: 'heavy', src: SRC, base: 'STAND', end: 'STAND' });
export default { name: 'Heavy_Gest_ShakeNo_Once', clip: 'Gest_ShakeNo_Once', body: 'heavy', group: 'Gest', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
