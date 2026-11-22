// Adult_Gest_PhoneCall_Loop: standing, talking on a phone held to the ear, from motion capture (Quaternius UAL
// "Idle_TalkingPhone_Loop", CC0, ref/ual/idle_talkingphone_loop.js) on this body, every captured frame. The phone
// (kit/cast/handprops.js phone) is in the right fist all through. This figure's head is bigger than the capture's: the
// captured hand stopped at the chin; its stretch to the ear is baked (ref/reach/phonecall_ear.js, tools/run/mocap_reach.mjs
// Gest_PhoneCall_Loop R ear 0.42 10 <out>; re-run it when the clip changes). Hot Money ep01 (SH245).
import { mocapClip, reachKeys, holdKeys } from '../../base.js';
import SRC from '../../ref/ual/idle_talkingphone_loop.js';
import EAR from '../../ref/reach/phonecall_ear.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND' });
// checked too with a film's bigger phone (tools/gates/motionlib.mjs propChecks): Hot Money ep01's desk handset (0.41 m, at 1.4x)
// held the kit phone's way, long side up and the fist round its middle
const EP01_HANDSET = { mode: 'up', grip: [0, 0, 0], size: [0.098, 0.406, 0.07] };
export default { name: 'Adult_Gest_PhoneCall_Loop', clip: 'Gest_PhoneCall_Loop', body: 'adult', group: 'Gest', loop: true, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: ['phone'], hands: 'R', marks: M.marks }, keys: holdKeys(reachKeys(M.keys, EAR), 'R', 'phone'), captured: M.captured, rest: M.rest,
  propChecks: [{ phone: EP01_HANDSET }] };
