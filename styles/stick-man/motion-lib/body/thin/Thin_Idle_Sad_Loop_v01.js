// Thin_Idle_Sad_Loop: standing sad, head and shoulders down, a little sway, from motion capture (Mixamo "Sad Idle",
// ref/mixamo/sad_idle.js) on the thin body, every captured frame. Mixamo batch 1 (V4 film).
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/sad_idle.js';

const M = mocapClip({ body: 'thin', src: SRC, base: 'STAND', end: 'STAND' });
export default { name: 'Thin_Idle_Sad_Loop', clip: 'Idle_Sad_Loop', body: 'thin', group: 'Idle', loop: true, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
