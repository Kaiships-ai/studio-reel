// Adult_Act_HandOver_Once: reach forward and hand a bundle of cash over a counter, leaving it there, from motion capture
// (Quaternius UAL "Interact", CC0, ref/ual/interact.js) on this body, every captured frame. The cash (motion-lib/props.js
// cash) is in the left fist until it comes down onto the counter (RELEASE), then lies there (engine/propobj.js). The counter:
// its front 0.60 m ahead, its top 0.94 m (the fist rises, the cash rides up over the counter's edge where it meets it: ref/reach/handover_counter.js,
// tools/mocap_contact.mjs Act_HandOver_Once L 4 <out>; re-run when the clip changes), reaches over and sets the cash down.
// Hot Money ep01.
import { mocapClip, holdKeys, reachKeys } from '../../base.js';
import SRC from '../../ref/ual/interact.js';
import EDGE from '../../ref/reach/handover_counter.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND' });
// (measured through the rig, tools/motionlib.mjs rigClip, from the clip's origin, its first key; re-measure when the clip changes)
const RELEASE = 48, o = M.keys[0].pos, COUNTER = [o[0] + 0.60, o[1], 0.94];
export default { name: 'Adult_Act_HandOver_Once', clip: 'Act_HandOver_Once', body: 'adult', group: 'Act', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: ['cash'], hands: 'L', marks: [...M.marks, { kind: 'counter', at: COUNTER }] }, keys: reachKeys(holdKeys(M.keys, 'L', 'cash', { to: RELEASE }), EDGE), captured: M.captured, rest: M.rest };
