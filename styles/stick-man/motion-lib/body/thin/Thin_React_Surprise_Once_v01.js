// Thin_React_Surprise_Once: a small start on bent knees at something in front, the hands up a little, then easing, from
// motion capture (Mixamo "Surprised", ref/mixamo/surprised.js) on the thin body, every captured frame. Mixamo batch 1
// (V4 film).
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/surprised.js';

const M = mocapClip({ body: 'thin', src: SRC, base: 'STAND', end: 'STAND' });
export default { name: 'Thin_React_Surprise_Once', clip: 'React_Surprise_Once', body: 'thin', group: 'React', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
