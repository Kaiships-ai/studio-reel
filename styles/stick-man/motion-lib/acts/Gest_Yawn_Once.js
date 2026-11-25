// A tired stretch and yawn, a hand to the mouth.
import { ownClip, bridgeKeys, poleSpans, reachKeys } from '../base.js';
import { act } from './act.js';
import SRC from '../ref/mixamo/yawn.js';
import { cutSource } from '../ref/perform.js';
// the hand onto the mouth, baked on the adult (tools/run/mocap_reach.mjs Gest_Yawn_Once L mouth +0.12 26 <out>): this
// head is bigger than the capture's, so the captured hand stops short of it
import MOUTH_ADULT from '../ref/reach/yawn_mouth.js';

const MOUTH = { adult: MOUTH_ADULT };
// the capture's stretch at 0.8 of its reach, the hands no faster than 6 cm a frame and the limbs 11 deg (a tired, slow stretch)
export default act({ clip: 'Gest_Yawn_Once', loop: false }, body => {
  const M = ownClip({ body, src: cutSource(SRC, 78, 246), head: 0.7, own: { size: 0.8, hand: 0.06, limb: 11 } });
  return { ...M, keys: reachKeys(bridgeKeys(M.keys, poleSpans(M.keys)), MOUTH[body]) };
});
