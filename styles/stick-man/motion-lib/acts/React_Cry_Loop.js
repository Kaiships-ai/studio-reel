// Standing, crying: hunched, head down, the hands pressed to the eyes, an arm thrown out, wiping.
import { ownClip, bridgeKeys, poleSpans, reachKeys } from '../base.js';
import { act } from './act.js';
import SRC from '../ref/mixamo/crying.js';
import { apartSource } from '../ref/perform.js';
// the hands onto the eyes, baked on each body (tools/run/mocap_reach.mjs React_Cry_Loop <L|R> eye +0.14 20 <out> <body>; the
// thin body's 30: its quick arm leaves the eye faster): on this
// big head the captured hands stopped at the chin and read as worried, not crying (REVIEW-2)
import EYE_L_ADULT from '../ref/reach/cry_eye_l.js';
import EYE_R_ADULT from '../ref/reach/cry_eye_r.js';
import EYE_L_THIN from '../ref/reach/cry_eye_l_thin.js';
import EYE_R_THIN from '../ref/reach/cry_eye_r_thin.js';

const EYES = { adult: [EYE_L_ADULT, EYE_R_ADULT], thin: [EYE_L_THIN, EYE_R_THIN] };
// the thin body's shoulders are narrow: its forearms crossed, under 3 cm apart on 55 frames
const APART = { thin: 0.12 }, ARM = { thin: 1.4 };

export default act({ clip: 'React_Cry_Loop', loop: true }, body => {
  // (easeOut 22: the arms hang tucked in at the loop's end, and the library's 14 frames back to STAND, 11 on the thin body's clock,
  // swung the hand out 4 cm in the first; lag: false, the hands go to the eyes: a thin arm dragging behind turned its forearm
  // round 42 deg in a frame under the reach, and left the eye out of reach)
  const M = ownClip({ body, src: apartSource(SRC, APART[body]), own: { arm: ARM[body] ?? 1, size: 0.92, lag: false }, loop: true, head: 0.7, easeOut: 22 });
  return { ...M, keys: EYES[body].reduce((k, t) => reachKeys(k, t), bridgeKeys(M.keys, poleSpans(M.keys))) };
});
