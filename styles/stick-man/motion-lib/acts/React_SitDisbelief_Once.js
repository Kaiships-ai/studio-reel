// Seated, in disbelief: the hands to the face, the body thrown back with the hands on the head, then upright again (needs a seat with room behind).
import { ownClip, bridgeKeys, poleSpans } from '../base.js';
import { act, seated } from './act.js';
import SRC from '../ref/mixamo/sitting_disbelief.js';
import { apartSource } from '../ref/perform.js';

const APART = { thin: 0.22 }, ARM = { thin: 0.48 };      // (the hands are on the head: a bigger reach throws them past it; the thin body's
// reach kept at 1.12, where its forearm never turns through the pole of its roll)
// (lag: false: the hands go onto the face and the head, where a hand that drags or swings past turned the thin forearm
// through the pole its roll is measured from: 15 cm in a frame)

export default act({ clip: 'React_SitDisbelief_Once', loop: false, base: 'SIT' }, body => {
  const M = ownClip({ body, src: apartSource(SRC, APART[body]), ...seated(), head: 0.4, own: { arm: ARM[body] ?? 1, lag: false } });
  return { ...M, keys: bridgeKeys(M.keys, poleSpans(M.keys)) };
});
