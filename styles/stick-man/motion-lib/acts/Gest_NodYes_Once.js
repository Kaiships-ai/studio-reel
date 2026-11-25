// A plain yes nod.
import { ownClip } from '../base.js';
import { act } from './act.js';
import SRC from '../ref/mixamo/head_nod_yes.js';

// (a yes is a nod, not a tilt: the capture's head tilt to the side, which the elder's stoop and stiff neck turned into a lean of
// the whole head for 4 s, REVIEW-2, is kept to a fifth)
export default act({ clip: 'Gest_NodYes_Once', loop: false }, body => ownClip({ body, src: SRC, tilt: 0.2 }));
