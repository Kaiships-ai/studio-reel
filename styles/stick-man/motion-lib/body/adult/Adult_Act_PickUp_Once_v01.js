// Adult_Act_PickUp_Once: bend down, pick the bag up off the floor in the right fist, stand up into CARRY, from motion
// capture (Mixamo "Picking Up", ref/mixamo/picking_up.js) on this body, every captured frame. The bag lies on the floor
// where the fist will take it (engine/propobj.js) until the fist is lowest (GRAB), then hangs from it (motion-lib/props.js
// bag, 25 kg).
import { mocapClip, holdKeys, bagBend, CARRY_KG } from '../../base.js';
import SRC from '../../ref/mixamo/picking_up.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'CARRY' });
// (the fist's lowest frame, measured through the rig with tools/motionlib.mjs rigClip; re-measure when the clip changes)
const GRAB = 105;
// the bag arm carried 35 deg wider over the bend and the knees 0.17 W deeper so the wider arm still reaches the floor
// (base.js bagBend), measured with tools/motionlib.mjs: without the wider arm the bag hangs into the leg on the way up
// (the fist 8 cm off its grip over frames 146-180, the bag 7 cm in the leg with physics off); without the deeper knees
// the fist stops short of the bag on the floor (it slides 2.3 cm a frame into the hand at the grab)
const keys = bagBend(holdKeys(M.keys, 'R', 'bag', { from: GRAB, kg: CARRY_KG }), 'R', { out: [35, 55, 170, 220], deg: 35, dip: 0.17 });
export default { name: 'Adult_Act_PickUp_Once', clip: 'Act_PickUp_Once', body: 'adult', group: 'Act', loop: false, frames: M.frames, base: 'STAND', end: 'CARRY', style: 'kaiships',
  needs: { props: ['bag'], hands: 'R', marks: M.marks }, keys, captured: M.captured, rest: M.rest };
