// Standing, crying: hunched, head down, the hands pressed to the eyes, an arm thrown out, wiping.
import { ownClip, bridgeKeys, poleSpans, reachKeys } from '../base.js';
import { act } from './act.js';
import SRC from '../ref/mixamo/crying.js';
// the hands onto the eyes, baked on the adult (tools/run/mocap_reach.mjs React_Cry_Loop <L|R> eye +0.14 20 <out>): on this
// big head the captured hands stopped at the chin and read as worried, not crying (REVIEW-2)
import EYE_L_ADULT from '../ref/reach/cry_eye_l.js';
import EYE_R_ADULT from '../ref/reach/cry_eye_r.js';

const EYES = { adult: [EYE_L_ADULT, EYE_R_ADULT] };

export default act({ clip: 'React_Cry_Loop', loop: true }, body => {
  // (easeOut 22: the arms hang tucked in at the loop's end, and the library's 14 frames back to STAND swung
  // the hand out 4 cm in the first; lag: false, the hands go to the eyes)
  const M = ownClip({ body, src: SRC, own: { size: 0.92, lag: false }, loop: true, head: 0.7, easeOut: 22 });
  return { ...M, keys: EYES[body].reduce((k, t) => reachKeys(k, t), bridgeKeys(M.keys, poleSpans(M.keys))) };
});
