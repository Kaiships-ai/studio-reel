// Elder_Gest_Yawn_Once: a tired stretch and yawn, from motion capture (Mixamo "Yawn", ref/mixamo/yawn.js) on the elder
// body, every captured frame. Mixamo batch 1 (V4 film).
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/yawn.js';

const M = mocapClip({ body: 'elder', src: SRC, base: 'STAND', end: 'STAND', stoop: 1 });
export default { name: 'Elder_Gest_Yawn_Once', clip: 'Gest_Yawn_Once', body: 'elder', group: 'Gest', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
