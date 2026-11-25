// Terrified on the spot: the hands fly up, the body hunches on bent knees, the head snaps round one way, then the other, and
// it rises warily.
import { ownClip } from '../base.js';
import { act } from './act.js';
import SRC from '../ref/mixamo/terrified.js';
import { cutSource, apartSource } from '../ref/perform.js';

const APART = { thin: 0.08 };
// the capture never stands back up: the way out is the rise from the crouch, 54 frames on the adult (1.8 s: a brisk sit-to-stand
// takes about 1 s, a frightened body rises warily; REVIEW-2: the child sprang up in 8 frames, the fear gone), on each body's
// clock (the child's 38 frames bring its head up at most 2.4 cm a frame)
const RISE = 54;
// the child takes 0.7 of its reach here: at its full reach its hands, low at its knees as it rose, sat in its rising thighs and
// the rig stretched its forearm 4.5 % (the rig test's limit is 3 %); the thin body 0.3 of its, so the two quick bodies' frights
// stay apart in size (8 %)
const ARM = { child: 0.7, thin: 0.3 };

export default act({ clip: 'React_Terrified_Once', loop: false }, body => ownClip({ body, src: apartSource(cutSource(SRC, 14, 128), APART[body]), head: 0.2, own: { arm: ARM[body] ?? 1 }, easeOut: RISE }));
