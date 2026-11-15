// Adult_Act_Jump_Once: a standing jump straight up (crouch, spring, tuck, land, absorb, stand), from motion capture
// (Mixamo "Jump", ref/mixamo/jump.js) on this body; gravity times the flight (motion.js ballistic, g = 9.8).
import { mocapOnce } from '../../base.js';
import JUMP from '../../ref/mixamo/jump.js';

const M = mocapOnce({ body: 'adult', src: JUMP });
export default { name: 'Adult_Act_Jump_Once', clip: 'Act_Jump_Once', body: 'adult', group: 'Act', loop: false, frames: M.frames, base: 'STAND', style: 'kaiships',
  needs: { props: [], hands: null }, keys: M.keys, captured: M.captured };
