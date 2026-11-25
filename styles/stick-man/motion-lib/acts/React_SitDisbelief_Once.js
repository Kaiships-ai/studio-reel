// Seated, in disbelief: the hands to the face, the body thrown back with the hands on the head, then upright again (needs a seat with room behind).
import { ownClip, bridgeKeys, poleSpans } from '../base.js';
import { act, seated } from './act.js';
import SRC from '../ref/mixamo/sitting_disbelief.js';
import { apartSource } from '../ref/perform.js';

const APART = { thin: 0.22, elder: 0.19 }, ARM = { thin: 0.85, elder: 0.72 };      // (the hands are on the head: a bigger reach throws them past it)

export default act({ clip: 'React_SitDisbelief_Once', loop: false, base: 'SIT' }, body => {
  const M = ownClip({ body, src: apartSource(SRC, APART[body]), ...seated(body), head: 0.4, own: { arm: ARM[body] ?? 1 }, trunk: body === 'elder' ? 0.9 : 1 });
  return { ...M, keys: bridgeKeys(M.keys, poleSpans(M.keys)) };
});
