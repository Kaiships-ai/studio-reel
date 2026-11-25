// Adult_React_Cry_Loop: standing, crying: hunched, head down, hands to the chin and cheek, an arm thrown out, wiping
// (on this big head the hands do not reach the eyes), from motion capture (Mixamo "Crying", ref/mixamo/crying.js) on
// this body, every captured frame. Mixamo batch 1 (V4 film).
import { mocapClip, bridgeKeys } from '../../base.js';
import SRC from '../../ref/mixamo/crying.js';

// the right arm goes straight out to the side there, the pole of the rig's arm angles: base.js bridgeKeys
const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND' });
export default { name: 'Adult_React_Cry_Loop', clip: 'React_Cry_Loop', body: 'adult', group: 'React', loop: true, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: bridgeKeys(M.keys, [['armR', 116, 126]]), captured: M.captured, rest: M.rest };
