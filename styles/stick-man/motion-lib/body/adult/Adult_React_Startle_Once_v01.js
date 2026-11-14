// Adult_React_Startle_Once: a start: surprised, looking off to the right, from motion capture (Mixamo "Reacting", ref/mixamo/reacting.js) on this body, every captured frame. Hot Money ep01.
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/reacting.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND' });
export default { name: 'Adult_React_Startle_Once', clip: 'React_Startle_Once', body: 'adult', group: 'React', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
