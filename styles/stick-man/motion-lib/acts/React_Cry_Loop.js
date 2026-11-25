// Standing, crying: hunched, head down, hands to the chin and cheek, an arm thrown out, wiping (on this big head the hands do not reach the eyes).
import { ownClip, bridgeKeys, poleSpans } from '../base.js';
import { act, own } from './act.js';
import SRC from '../ref/mixamo/crying.js';
import { apartSource } from '../ref/perform.js';

// the thin body's shoulders are narrow: its forearms crossed, under 3 cm apart on 55 frames
const APART = { thin: 0.12 }, ARM = { thin: 1.4 };

export default act({ clip: 'React_Cry_Loop', loop: true }, body => {
  const M = ownClip({ body, src: apartSource(SRC, APART[body]), own: { arm: ARM[body] ?? 1, size: 0.92 }, ...own(body), loop: true, head: 0.7 });
  return { ...M, keys: bridgeKeys(M.keys, poleSpans(M.keys)) };
});
