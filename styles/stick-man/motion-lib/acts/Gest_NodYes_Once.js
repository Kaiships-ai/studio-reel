// A plain yes nod.
import { ownClip } from '../base.js';
import { act, own } from './act.js';
import SRC from '../ref/mixamo/head_nod_yes.js';

export default act({ clip: 'Gest_NodYes_Once', loop: false }, body => ownClip({ body, src: SRC, ...own(body) }));
