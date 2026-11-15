// Adult_Act_PutDown_Once: bend and set something down on the floor, from motion capture (Mixamo "Putting Down", ref/mixamo/putting_down.js) on this body, every captured frame. Hot Money ep01.
import { mocapClip } from '../../base.js';
import SRC from '../../ref/mixamo/putting_down.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND' });
export default { name: 'Adult_Act_PutDown_Once', clip: 'Act_PutDown_Once', body: 'adult', group: 'Act', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
