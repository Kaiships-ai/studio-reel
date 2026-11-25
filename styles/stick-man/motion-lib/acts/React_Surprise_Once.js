// A start at something in front: the hands thrown up and the body back at once, a short beat held, then easing.
import { ownClip } from '../base.js';
import { act } from './act.js';
import SRC from '../ref/mixamo/surprised.js';
import { cutSource, reachSource } from '../ref/perform.js';

// the capture stands bent forward and sinks before its hands rise, a bow that ate the first 0.7 s. Played from the frame its
// hands are on the way up (FROM), so the blend from STAND is the start itself and nothing bows first; held to TO, a beat, not
// the capture's 2 s; IN is the quickest way in that no hand or elbow snaps on
const FROM = 22, TO = 44, IN = 12, OUT = 26, BACK = 10;
const startle = cutSource(reachSource(cutSource(SRC, 8, 116), 1.5), FROM - 8, TO - 8);
const ease = x => (x = Math.max(0, Math.min(1, x)), x * x * (3 - 2 * x));

export default act({ clip: 'React_Surprise_Once', loop: false }, body => {
  const M = ownClip({ body, src: startle, trunk: 1.5, ease: IN, easeOut: OUT }), c0 = M.captured[0];
  // the trunk thrown back BACK deg with the hands, two fifths of it given back over the beat (the settle)
  const back = f => BACK * ease((f - c0 + 8) / 12) * (1 - 0.4 * ease((f - c0 - 6) / 20)) * ease((M.frames - f) / OUT);
  return { ...M, keys: M.keys.map(k => (k.f === 0 || k.f === M.frames ? k : { ...k, spine: { ...k.spine, bend: k.spine.bend - back(k.f) } })) };
});
