// Seated, in disbelief: the hands to the face, the body thrown back with the hands on the head, then upright again (needs a seat with room behind).
import { ownClip, bridgeKeys, poleSpans } from '../base.js';
import { act, seated } from './act.js';
import SRC from '../ref/mixamo/sitting_disbelief.js';

// (lag: false: the hands go onto the face and the head, where a hand that drags or swings past misses them)

export default act({ clip: 'React_SitDisbelief_Once', loop: false, base: 'SIT' }, body => {
  const M = ownClip({ body, src: SRC, ...seated(), head: 0.4, own: { lag: false } });
  return { ...M, keys: bridgeKeys(M.keys, poleSpans(M.keys)) };
});
