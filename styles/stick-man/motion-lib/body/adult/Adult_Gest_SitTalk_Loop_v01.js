// Adult_Gest_SitTalk_Loop: seated, talking to someone off to the left, small hand moves, from motion capture (Mixamo
// "Sitting Talking", ref/mixamo/sitting_talking.js) on this body, every captured frame. Mixamo batch 1 (V4 film).
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/sitting_talking.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'SIT', end: 'SIT', seated: true, bones: true });
export default { name: 'Adult_Gest_SitTalk_Loop', clip: 'Gest_SitTalk_Loop', body: 'adult', group: 'Gest', loop: true, frames: M.frames, base: 'SIT', end: 'SIT', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
