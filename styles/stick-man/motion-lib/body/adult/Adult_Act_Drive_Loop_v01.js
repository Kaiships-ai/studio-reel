// Adult_Act_Drive_Loop: seated driving, both hands on the wheel, from motion capture (Quaternius UAL "Driving_Loop", CC0, ref/ual/driving_loop.js) on this body, every captured frame. Hot Money ep01.
import { mocapClip } from '../../base.js';
import SRC from '../../ref/ual/driving_loop.js';

const M = mocapClip({ body: 'adult', src: SRC, base: 'SIT', end: 'SIT', seated: true });
export default { name: 'Adult_Act_Drive_Loop', clip: 'Act_Drive_Loop', body: 'adult', group: 'Act', loop: true, frames: M.frames, base: 'SIT', end: 'SIT', style: 'kaiships',
  needs: { props: [], hands: null, marks: M.marks }, keys: M.keys, captured: M.captured, rest: M.rest };
