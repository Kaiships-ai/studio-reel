// A sad walk, head down, slow, the face still seen.
import { ownGait } from '../base.js';
import { act } from './act.js';
import SRC from '../ref/mixamo/sad_walk.js';

// (the capture walks bowed 41 deg with the head 70 deg down: from the front only the crown shows, no face and no sadness. The
// trunk and the neck come up until the face looks at most 35 deg down (test: "the face is seen"), still well below a level look,
// and the head lifts a little with every stride)
export default act({ clip: 'Move_SadWalk_Fwd_Loop', loop: true }, body => ownGait({ body, mocap: SRC, loopIntro: true, strike: true, life: { lift: { spine: 16, neck: 20, beat: 5 } } }));
