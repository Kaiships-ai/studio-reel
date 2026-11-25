// Standing sad, head and shoulders down, a little sway.
import { ownClip } from '../base.js';
import { act, own } from './act.js';
import SRC from '../ref/mixamo/sad_idle.js';

export default act({ clip: 'Idle_Sad_Loop', loop: true }, body => ownClip({ body, src: SRC, ...own(body), loop: true }));
