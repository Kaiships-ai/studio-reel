// Elder_Act_Give_Once: reach out and give, Mixamo "Reaching Out" (ref/mixamo/reaching_out.js) on the elder body, every captured frame.
import { ownClip } from '../../base.js';
import SRC from '../../ref/mixamo/reaching_out.js';

const M = ownClip({ body: 'elder', src: SRC, base: 'STAND', end: 'STAND', loop: false, ease: 20 });
export default { name: 'Elder_Act_Give_Once', clip: 'Act_Give_Once', body: 'elder', group: 'Act', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships', perform: true,
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
