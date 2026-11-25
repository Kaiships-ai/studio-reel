// Child_React_Terrified_Once: terrified on the spot: hunched on bent knees, the hands up, the head snapping round to
// look behind, over and over (0.2 m of drift, no step away), from motion capture (Mixamo "Terrified",
// ref/mixamo/terrified.js) on the child body, every captured frame. Mixamo batch 1 (V4 film).
import { mocapClip } from '../../base.js';
import { slowSource } from '../../ref/mocap.js';
import CAP from '../../ref/mixamo/terrified.js';

// the capture's limbs slowed to 18 deg/f where it moves faster (ref/mocap.js slowSource): its fastest frames turned
// a limb of the rig past the style's 25 deg/f
const SRC = slowSource(CAP, 18);

const M = mocapClip({ body: 'child', src: SRC, base: 'STAND', end: 'STAND' });
export default { name: 'Child_React_Terrified_Once', clip: 'React_Terrified_Once', body: 'child', group: 'React', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
