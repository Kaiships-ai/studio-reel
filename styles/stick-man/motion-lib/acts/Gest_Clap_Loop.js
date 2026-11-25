// Standing, clapping: the hands open wide and meet.
import { ownClip } from '../base.js';
import { act } from './act.js';
import SRC from '../ref/mixamo/clapping.js';
import { BODIES } from '../bodies.js';
import { clapSource, retime } from '../ref/perform.js';

// the capture claps 3.3 times a second, the hands 11 to 27 cm apart: opened to twice that and slowed, every clap a meeting
// (by the root of the body's reach: opened by the whole of it, the child's hands, capped at a real hand's speed, clapped at the
// adult's tempo)
const clap = body => retime(clapSource(SRC, { open: 2 * Math.sqrt(BODIES[body].life.arm), meet: 0.12 }), { rate: 1.3, cap: false });

export default act({ clip: 'Gest_Clap_Loop', loop: true }, body => ownClip({ body, src: clap(body), own: { arm: 0, lag: false }, loop: true, ease: 20 }));
