// Terrified on the spot: the hands fly up, the body hunches on bent knees, the head snaps round one way, then the other, and
// it rises warily.
import { ownClip } from '../base.js';
import { act } from './act.js';
import SRC from '../ref/mixamo/terrified.js';
import { cutSource } from '../ref/perform.js';

// the capture never stands back up: the way out is the rise from the crouch, 54 frames on the adult (1.8 s: a brisk sit-to-stand
// takes about 1 s, a frightened body rises warily)
const RISE = 54;

export default act({ clip: 'React_Terrified_Once', loop: false }, body => ownClip({ body, src: cutSource(SRC, 14, 128), head: 0.2, easeOut: RISE }));
