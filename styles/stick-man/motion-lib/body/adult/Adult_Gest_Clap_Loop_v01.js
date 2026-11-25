// Adult_Gest_Clap_Loop: standing, clapping, from motion capture (Mixamo "Clapping", ref/mixamo/clapping.js) on this
// body, every captured frame. Mixamo batch 1 (V4 film).
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/clapping.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND', wide: 6 });
export default { name: 'Adult_Gest_Clap_Loop', clip: 'Gest_Clap_Loop', body: 'adult', group: 'Gest', loop: true, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
