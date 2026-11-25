// A sad walk, head down, slow, at each body's own step and cadence.
import { ownGait } from '../base.js';
import { act } from './act.js';
import SRC from '../ref/mixamo/sad_walk.js';

export default act({ clip: 'Move_SadWalk_Fwd_Loop', loop: true }, body => ownGait({ body, mocap: SRC, loopIntro: true, strike: true }));
