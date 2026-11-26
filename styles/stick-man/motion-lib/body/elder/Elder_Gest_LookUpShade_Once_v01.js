// Elder_Gest_LookUpShade_Once: look up, a hand shading the eyes, Mixamo "Looking" (ref/mixamo/looking_shade.js) on the elder body, every captured frame.
import { ownClip } from '../../base.js';
import SRC from '../../ref/mixamo/looking_shade.js';

const M = ownClip({ body: 'elder', src: SRC, base: 'STAND', end: 'STAND', loop: false, ease: 20 });
export default { name: 'Elder_Gest_LookUpShade_Once', clip: 'Gest_LookUpShade_Once', body: 'elder', group: 'Gest', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships', perform: true,
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
