// An old man standing stooped, a slight sway.
import { mocapClip } from '../base.js';
import { act } from './act.js';
import SRC from '../ref/mixamo/old_man_idle.js';

export default act({ clip: 'Idle_Stooped_Loop', loop: true }, body => mocapClip({ body, src: SRC, closed: true }));
