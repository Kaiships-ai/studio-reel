// Seated, typing on a keyboard in front.
import { ownClip } from '../base.js';
import { act, seated } from './act.js';
import SRC from '../ref/mixamo/typing.js';
import { apartSource } from '../ref/perform.js';

const APART = { thin: 0.1 };

export default act({ clip: 'Act_Type_Loop', loop: true, base: 'SIT' }, body => ownClip({ body, src: apartSource(SRC, APART[body], 2), ...seated(body), loop: true }));
