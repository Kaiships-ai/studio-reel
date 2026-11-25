// Seated, talking, small hand moves.
import { ownClip } from '../base.js';
import { act, seated } from './act.js';
import SRC from '../ref/mixamo/sitting_talking.js';
import { loopSource } from '../ref/perform.js';

// the capture is 45 s, most of it still: the 6 s where the hands talk; its actor talks to someone 35 deg to the left, this
// one faces front
const talk = loopSource(SRC, 516, 700, 14);

export default act({ clip: 'Gest_SitTalk_Loop', loop: true, base: 'SIT' }, body => ownClip({ body, src: talk, ...seated(body), loop: true, head: 0.45 }));
