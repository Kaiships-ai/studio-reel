// Adult_Trans_SitDown_Once: sit down on a seat behind, from motion capture (Quaternius UAL "Sitting_Enter", CC0,
// ref/ual/sitting_enter.js) on this body, every captured frame.
import { mocapClip } from '../../base.js';
import SRC from '../../ref/ual/sitting_enter.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'SIT', seated: true });
export default { name: 'Adult_Trans_SitDown_Once', clip: 'Trans_SitDown_Once', body: 'adult', group: 'Trans', loop: false, frames: M.frames, base: 'STAND', end: 'SIT', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
