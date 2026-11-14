// Adult_Trans_GetUp_Once: get up off the floor from lying on the back, from motion capture (Quaternius UAL "LayToIdle", CC0, ref/ual/laytoidle.js) on this body, every captured frame. Hot Money ep01.
import { mocapClip } from '../../base.js';
import SRC from '../../ref/ual/laytoidle.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'LIE', end: 'STAND' });
export default { name: 'Adult_Trans_GetUp_Once', clip: 'Trans_GetUp_Once', body: 'adult', group: 'Trans', loop: false, frames: M.frames, base: 'LIE', end: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
