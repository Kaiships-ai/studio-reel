// Adult_Act_PutDown_Once: from CARRY (the bag in the right fist), bend and set it down on the floor, stand up, from motion
// capture (Mixamo "Putting Down", ref/mixamo/putting_down.js) on this body, every captured frame. The bag leaves the fist
// at the frame the fist is lowest (RELEASE) and drops the last few cm to the floor, where it stays (engine/propobj.js).
// Hot Money ep01.
import { mocapClip, holdKeys, CARRY_KG } from '../../base.js';
import SRC from '../../ref/mixamo/putting_down.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'CARRY', end: 'STAND' });
// (the fist's lowest frame, measured through the rig with tools/motionlib.mjs rigClip; re-measure when the clip changes)
const RELEASE = 165;
const keys = holdKeys(M.keys, 'R', 'bag', { to: RELEASE, kg: CARRY_KG });
export default { name: 'Adult_Act_PutDown_Once', clip: 'Act_PutDown_Once', body: 'adult', group: 'Act', loop: false, frames: M.frames, base: 'CARRY', end: 'STAND', style: 'kaiships',
  needs: { props: ['bag'], hands: 'R', marks: M.marks }, keys, captured: M.captured, rest: M.rest };
