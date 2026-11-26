// Elder_Trans_SitDown_Once: sit down on a seat behind, Mixamo "Sitting" (ref/mixamo/sit_down_elder.js) on the elder body, every captured frame.
import { ownClip } from '../../base.js';
import SRC from '../../ref/mixamo/sit_down_elder.js';

const M = ownClip({ body: 'elder', src: SRC, base: 'STAND', end: 'SIT', loop: false, ease: 20, seated: true, bones: true, seat: true });
export default { name: 'Elder_Trans_SitDown_Once', clip: 'Trans_SitDown_Once', body: 'elder', group: 'Trans', loop: false, frames: M.frames, base: 'STAND', end: 'SIT', style: 'kaiships', perform: true,
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
