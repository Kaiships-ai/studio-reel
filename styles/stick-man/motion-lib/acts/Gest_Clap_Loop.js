// Standing, clapping: the hands open wide and meet.
import { ownClip } from '../base.js';
import { act, own } from './act.js';
import SRC from '../ref/mixamo/clapping.js';
import { BODIES } from '../bodies.js';
import { clapSource, retime } from '../ref/perform.js';

// the capture claps 3.3 times a second, the hands 11 to 27 cm apart: opened to twice that and slowed, every clap a meeting
const clap = body => retime(clapSource(SRC, { open: 2 * BODIES[body].life.arm, meet: 0.12 }), { rate: 1.3, cap: false });

export default act({ clip: 'Gest_Clap_Loop', loop: true }, body => ownClip({ body, src: clap(body), own: { arm: 0, hand: 0.14, limb: 22 }, ...own(body), loop: true, ease: 20 }));
