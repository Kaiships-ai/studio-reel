// Elder_Gest_SitClap_Loop: seated, clapping, from motion capture (Mixamo "Sitting Clap", ref/mixamo/sitting_clap.js) on
// the elder body, every captured frame. Mixamo batch 1 (V4 film).
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/sitting_clap.js';

const M = mocapClip({ body: 'elder', src: SRC, base: 'SIT', end: 'SIT', seated: true, bones: true, wide: 6 });
export default { name: 'Elder_Gest_SitClap_Loop', clip: 'Gest_SitClap_Loop', body: 'elder', group: 'Gest', loop: true, frames: M.frames, base: 'SIT', end: 'SIT', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
