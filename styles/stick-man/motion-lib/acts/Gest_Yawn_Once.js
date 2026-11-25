// A tired stretch and yawn, a hand to the mouth.
import { ownClip, bridgeKeys, poleSpans } from '../base.js';
import { act, own } from './act.js';
import SRC from '../ref/mixamo/yawn.js';
import { BODIES } from '../bodies.js';
import { cutSource } from '../ref/perform.js';

const ARM = { elder: 1.2, thin: 1.8 }, TRUNK = { thin: 1.3 }, HAND = { thin: 0.052 }, LIMB = { heavy: 7 }, CLOCK = { heavy: { drag: 0.8 }, elder: { rate: 1.34 } };

export default act({ clip: 'Gest_Yawn_Once', loop: false }, body => {
  const M = ownClip({ body, src: cutSource(SRC, 78, 246), ...own(body), head: 0.7, own: { arm: ARM[body] ?? 1, size: 0.8, hand: HAND[body] ?? 0.06 * Math.min(1, BODIES[body].life.arm), limb: LIMB[body] ?? 11, ...CLOCK[body] }, trunk: TRUNK[body] ?? 1 });
  return { ...M, keys: bridgeKeys(M.keys, poleSpans(M.keys)) };
});
