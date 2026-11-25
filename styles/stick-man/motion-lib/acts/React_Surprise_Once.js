// A start at something in front: a dip, the hands thrown up and the body back, held, then easing.
import { ownClip, anticKeys } from '../base.js';
import { act, own } from './act.js';
import SRC from '../ref/mixamo/surprised.js';
import { BODIES } from '../bodies.js';
import { cutSource } from '../ref/perform.js';

// the capture stands 13 frames, starts (14-24), holds to 88, eases: half the hold is enough
const startle = cutSource(SRC, 8, 116);

export default act({ clip: 'React_Surprise_Once', loop: false }, body => {
  const M = ownClip({ body, src: startle, ...own(body), own: { size: 1.5, hand: 0.11, limb: 20 }, trunk: 1.5, give: 1.3, easeOut: 20 });
  // (the capture only starts: the antic is the other way for a fifth of a second, then the accent)
  const r = BODIES[body].life.rate, at = M.captured[0] + Math.round(7 * r);
  return { ...M, keys: anticKeys(M.keys, { at, n: Math.round(10 * r), peak: at + Math.round(16 * r), k: 0.28 }) };
});
