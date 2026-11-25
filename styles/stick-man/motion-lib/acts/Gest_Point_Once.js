// Standing, pointing ahead.
import { ownClip } from '../base.js';
import { act, own } from './act.js';
import SRC from '../ref/mixamo/pointing_stand.js';

export default act({ clip: 'Gest_Point_Once', loop: false }, body => ownClip({ body, src: SRC, ...own(body) }));
