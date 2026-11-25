// An annoyed no, the head shaking.
import { ownClip } from '../base.js';
import { act, own } from './act.js';
import SRC from '../ref/mixamo/annoyed_head_shake.js';

export default act({ clip: 'Gest_ShakeNo_Once', loop: false }, body => ownClip({ body, src: SRC, ...own(body) }));
