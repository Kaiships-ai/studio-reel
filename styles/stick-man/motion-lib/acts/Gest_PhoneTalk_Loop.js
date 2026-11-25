// Standing, a phone in the right hand held to the ear, talking, the left hand with it.
import { ownClip, reachKeys } from '../base.js';
import { act, own } from './act.js';
import SRC from '../ref/mixamo/talking_on_phone.js';
// the hand onto the ear, baked on each body (tools/run/mocap_reach.mjs Gest_PhoneTalk_Loop R earclose captured 22 <out> <body>)
import EAR_ADULT from '../ref/reach/phonetalk_ear.js';
import EAR_THIN from '../ref/reach/phonetalk_ear_thin.js';
import { loopSource } from '../ref/perform.js';

const EAR = { adult: EAR_ADULT, thin: EAR_THIN };
// the capture turns right round on the spot twice: the 4 s it faces front, the left hand talking
const call = loopSource(SRC, 866, 996, 14);

export default act({ clip: 'Gest_PhoneTalk_Loop', loop: true, needs: { props: ['phone'], hands: 'R' } }, body => {
  const M = ownClip({ body, src: call, ...own(body), loop: true, head: 0.6, ease: 30, dense: true });
  return { ...M, keys: (EAR[body] ? reachKeys(M.keys, EAR[body]) : M.keys).map(k => ({ ...k, x_hpR_phone: 1 })) };
});
