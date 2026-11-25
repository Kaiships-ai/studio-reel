// A tired stretch and yawn, a hand to the mouth.
import { ownClip, bridgeKeys, poleSpans, reachKeys } from '../base.js';
import { act } from './act.js';
import SRC from '../ref/mixamo/yawn.js';
import { cutSource } from '../ref/perform.js';
// the hand onto the mouth, baked on each body (tools/run/mocap_reach.mjs Gest_Yawn_Once L mouth +0.12 26 <out> <body>; the thin body's 34: its quick
// stretch out of the hand at the mouth unfolded the elbow 25.6 deg a frame over 26): this
// head is bigger than the capture's, so the captured hand stops short of it (REVIEW-2: the elder's 53 cm off the head's centre)
import MOUTH_ADULT from '../ref/reach/yawn_mouth.js';
import MOUTH_HEAVY from '../ref/reach/yawn_mouth_heavy.js';
import MOUTH_THIN from '../ref/reach/yawn_mouth_thin.js';
import MOUTH_ELDER from '../ref/reach/yawn_mouth_elder.js';

const MOUTH = { adult: MOUTH_ADULT, heavy: MOUTH_HEAVY, thin: MOUTH_THIN, elder: MOUTH_ELDER };
// one recipe on every body (the bodies' own way is bodies.js life and perform): the capture's stretch at 0.8 of its reach, the
// hands no faster than 6 cm a frame and the limbs 11 deg (a tired, slow stretch). The thin body's arms are straight at the top
// of the stretch, so its longer reach cannot show there: it stretches 1.3 times as far from the trunk; an old back barely
// arches back in a stretch (0.6 of its own small trunk move: it stays stooped)
const TRUNK = { thin: 1.3, elder: 0.6 };
export default act({ clip: 'Gest_Yawn_Once', loop: false }, body => {
  const M = ownClip({ body, src: cutSource(SRC, 78, 246), head: 0.7, trunk: TRUNK[body] ?? 1, own: { size: 0.8, hand: 0.06, limb: 11 } });
  return { ...M, keys: reachKeys(bridgeKeys(M.keys, poleSpans(M.keys)), MOUTH[body]) };
});
