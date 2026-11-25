// Sitting on the floor, the knees drawn up, the arms round them, looking about.
import { floorClip } from '../base.js';
import { act } from './act.js';
import './floor.js';

export default act({ clip: 'Idle_SitFloor_Loop', loop: true, base: 'FLOOR' }, body => floorClip('FLOOR', body));
