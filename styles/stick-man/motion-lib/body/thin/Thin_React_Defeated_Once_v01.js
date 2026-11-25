// Thin_React_Defeated_Once: a frustrated slump after a loss, from motion capture (Mixamo "Defeated",
// ref/mixamo/defeated.js) on the thin body, every captured frame. Mixamo batch 1 (V4 film).
import { mocapClip } from '../../base.js';
import { slowSource } from '../../ref/mocap.js';
import CAP from '../../ref/mixamo/defeated.js';

// the capture's limbs slowed to 14 deg/f where it moves faster (ref/mocap.js slowSource): its fastest frames turned
// a limb of the rig past the style's 25 deg/f
const SRC = slowSource(CAP, 14);

const M = mocapClip({ body: 'thin', src: SRC, base: 'STAND', end: 'STAND' });
export default { name: 'Thin_React_Defeated_Once', clip: 'React_Defeated_Once', body: 'thin', group: 'React', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
