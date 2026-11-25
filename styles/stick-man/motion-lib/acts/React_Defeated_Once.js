// A frustrated slump after a loss: bends over, the fists swung down, then up, and the slump.
import { ownClip } from '../base.js';
import { act, own } from './act.js';
import SRC from '../ref/mixamo/defeated.js';
import { cutSource } from '../ref/perform.js';

export default act({ clip: 'React_Defeated_Once', loop: false }, body => ownClip({ body, src: cutSource(SRC, 20, 172), ...own(body) }));
