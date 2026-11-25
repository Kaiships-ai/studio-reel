// Elder_Idle_Stooped_Loop: an old man standing stooped, a slight sway, from motion capture (Mixamo "Old Man Idle",
// ref/mixamo/old_man_idle.js) on the elder body, every captured frame. Mixamo batch 1 (V4 film).
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/old_man_idle.js';

const M = mocapClip({ body: 'elder', src: SRC, base: 'STAND', end: 'STAND' });
export default { name: 'Elder_Idle_Stooped_Loop', clip: 'Idle_Stooped_Loop', body: 'elder', group: 'Idle', loop: true, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
