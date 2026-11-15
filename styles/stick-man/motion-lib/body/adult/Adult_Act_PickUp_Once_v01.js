// Adult_Act_PickUp_Once: bend down, pick the bag up off the floor in the right fist, stand up into CARRY, from motion
// capture (Mixamo "Picking Up", ref/mixamo/picking_up.js) on this body, every captured frame. The bag lies on the floor
// until the fist is lowest (GRAB), then hangs from it (motion-lib/props.js bag, 25 kg).
import { mocapClip, holdKeys, bagBend, CARRY_KG } from '../../base.js';
import SRC from '../../ref/mixamo/picking_up.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'CARRY' });
// (the fist's lowest frame and where it is then, from the clip's origin, its first key: measured through the rig with
// tools/motionlib.mjs rigClip; re-measure when the clip changes)
const GRAB = 105, o = M.keys[0].pos, AT = [o[0] + 0.424, o[1] + 0.478, 0];
// the bag arm wider over the bend, the knees deeper so the wider arm still reaches the floor, and the bag, lying across
// on the floor, turned to hang along the leg as it comes up (base.js bagBend)
const OUT = [35, 55, 170, 220], TURN = [110, 150];
const keys = bagBend(holdKeys(M.keys, 'R', 'bag', { from: GRAB, kg: CARRY_KG }), 'R', { out: OUT, deg: 35, dip: 0.17, turn: TURN, yaw: [90, 0] });
export default { name: 'Adult_Act_PickUp_Once', clip: 'Act_PickUp_Once', body: 'adult', group: 'Act', loop: false, frames: M.frames, base: 'STAND', end: 'CARRY', style: 'kaiships',
  needs: { props: ['bag'], hands: 'R', marks: [...M.marks, { kind: 'bag', at: AT, cross: true, until: GRAB }] }, keys, captured: M.captured, rest: M.rest };
