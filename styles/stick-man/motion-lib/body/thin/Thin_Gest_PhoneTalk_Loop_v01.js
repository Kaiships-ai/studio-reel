// Thin_Gest_PhoneTalk_Loop: standing, a phone in the right hand held to the ear, talking, turning right round on the
// spot, from motion capture (Mixamo "Talking On Phone", ref/mixamo/talking_on_phone.js) on the thin body, every
// captured frame. Mixamo batch 1 (V4 film).
import { mocapClip, reachKeys } from '../../base.js';
import SRC from '../../ref/mixamo/talking_on_phone.js';
// the hand onto this rig's ear (its head is bigger than the capture's), baked on the adult (tools/run/mocap_reach.mjs
// Gest_PhoneTalk_Loop R ear 0.48 10); the head is the same size on every body
import EAR from '../../ref/reach/phonetalk_ear.js';

const M = mocapClip({ body: 'thin', src: SRC, base: 'STAND', end: 'STAND', seam: true });
export default { name: 'Thin_Gest_PhoneTalk_Loop', clip: 'Gest_PhoneTalk_Loop', body: 'thin', group: 'Gest', loop: true, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: ['phone'], hands: 'R', marks: M.marks }, keys: reachKeys(M.keys, EAR).map(k => ({ ...k, x_hpR_phone: 1 })), captured: M.captured, rest: M.rest };
