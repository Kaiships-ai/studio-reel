// Kneeling on both knees, holding.
import { floorClip } from '../base.js';
import { act } from './act.js';
import './floor.js';

export default act({ clip: 'Idle_Kneel_Loop', loop: true, base: 'KNEEL' }, body => floorClip('KNEEL', body));
