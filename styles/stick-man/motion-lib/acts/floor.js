// The standard poses the floor carries, KNEEL (on both knees) and FLOOR (sitting on it, the knees drawn up), each held all
// through by its own capture (base.js floorBase), registered as soon as this loads: index.js imports it first, so a film that
// keys either pose finds it whatever clip it imported (REVIEW-2: they existed only after a clip that used them was imported)
import { floorBase } from '../base.js';
import KNEELING from '../ref/mixamo/kneeling_idle.js';
import SITTING_FLOOR from '../ref/mixamo/sitting_idle_floor.js';

export default [floorBase('KNEEL', KNEELING), floorBase('FLOOR', SITTING_FLOOR)];
