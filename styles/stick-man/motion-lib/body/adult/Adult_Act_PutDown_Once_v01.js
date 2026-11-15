// Adult_Act_PutDown_Once: from CARRY (the bag in the right fist), bend and set it down on the floor, stand up, from motion
// capture (Mixamo "Putting Down", ref/mixamo/putting_down.js) on this body, every captured frame. The bag leaves the fist
// at the frame the fist is lowest (RELEASE) and drops the last few cm to the floor where it was set.
// Hot Money ep01.
import { mocapClip, holdKeys, bagBend, CARRY_KG } from '../../base.js';
import SRC from '../../ref/mixamo/putting_down.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'CARRY', end: 'STAND' });
// (the fist's lowest frame and where it is then, from the clip's origin, its first key: measured through the rig with
// tools/motionlib.mjs rigClip; re-measure when the clip changes)
const RELEASE = 185, o = M.keys[0].pos, SET_AT = [o[0] + 0.580, o[1] + 0.160, 0];
// the bag turns across in front of the shins (base.js bagBend); the fist comes down to 0.29 m, the bag's bottom on the
// floor, and lets go: the bag stays there (a floor mark from that frame)
const keys = bagBend(holdKeys(M.keys, 'R', 'bag', { to: RELEASE, kg: CARRY_KG }), 'R', { turn: [120, 150] });
export default { name: 'Adult_Act_PutDown_Once', clip: 'Act_PutDown_Once', body: 'adult', group: 'Act', loop: false, frames: M.frames, base: 'CARRY', end: 'STAND', style: 'kaiships',
  needs: { props: ['bag'], hands: 'R', marks: [...M.marks, { kind: 'bag', cross: true, from: RELEASE + 1, at: SET_AT }] }, keys, captured: M.captured, rest: M.rest };
