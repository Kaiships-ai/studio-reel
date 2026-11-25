// Terrified on the spot: the hands fly up, the body hunches on bent knees, the head snaps round one way, then the other.
import { ownClip } from '../base.js';
import { act, own } from './act.js';
import SRC from '../ref/mixamo/terrified.js';
import { cutSource, apartSource } from '../ref/perform.js';

const APART = { thin: 0.08 };

export default act({ clip: 'React_Terrified_Once', loop: false }, body => ownClip({ body, src: apartSource(cutSource(SRC, 14, 128), APART[body]), ...own(body), head: 0.25, easeOut: 24 }));
