// Adult_Trans_SitDown_Once: sit down on a seat behind, from motion capture (Mixamo "Stand To Sit", ref/mixamo/stand_to_sit.js) on this body, every captured frame.
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/stand_to_sit.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'SIT', seated: true });
export default { name: 'Adult_Trans_SitDown_Once', clip: 'Trans_SitDown_Once', body: 'adult', group: 'Trans', loop: false, frames: M.frames, base: 'STAND', end: 'SIT', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured };
