// Adult_Trans_LieDown_Once: lie down on the back on the floor, from motion capture (Quaternius UAL "LayToIdle" played backwards, CC0, ref/ual/laytoidle.js) on this body, every captured frame. Hot Money ep01.
import { mocapClip } from '../../base.js';
import SRC from '../../ref/ual/laytoidle.js';

const M = mocapClip({ body: 'adult', src: { ...SRC, frames: [...SRC.frames].reverse() }, base: 'STAND', end: 'LIE' });
export default { name: 'Adult_Trans_LieDown_Once', clip: 'Trans_LieDown_Once', body: 'adult', group: 'Trans', loop: false, frames: M.frames, base: 'STAND', end: 'LIE', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
