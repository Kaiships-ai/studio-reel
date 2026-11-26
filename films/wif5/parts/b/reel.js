// wif5 part b (film 504-984, here 0-480): the nursery. A doctor in scrubs runs the aisle between two rows of cradles, every
// second one flat and empty, red alarm light pulsing (panic); he stops at the near-left cradle and finds the boy (worried);
// lifts him to his chest (a tender catch); the boy's card "23:59" and his mother's photo taped to the cradle (sad).
// Stills (film frame = 504 + local): beat 564 (run), 719 (finds him), 800 (lifted), contact 804 (the bundle in his arms),
// beat 954 (the card and the photo). Kit only through person()/place() (styles/stick-man/kit/film.js); the set is ./set.js.
import { person } from '/styles/stick-man/kit/film.js';
import './props.js';
import { MARKS } from './set.js';

const by = 'ep-whatif1-v5-director', why = 'V5 stills, measure not built';
const doc = person({ name: 'wif5_doc', body: 'adult', outfit: ['scrubs:teal', 'stethoscope', 'nametag', 'pens'], face: ['scared', 'sad'], hair: [],
  clips: ['Move_Run_Fwd_Loop', 'Idle_Stand_Loop', 'Idle_CarryBag_Loop'],
  waivers: [{ pair: 'hand|wif5_baby|adult|hand', why, by }] });

const AT = [MARKS.doc[0], MARKS.doc[1]];   // in the aisle at the boy's cradle; yaw 0 faces -y (the camera side), -90 faces -x
const BABY = { hugbag: 'wif5_baby' };
export const CUTS = [0, 150, 270, 298, 400];
export default {
  title: 'wif5 b: nursery', fps: 30, glasses: false, style: 'kaiships', directDrift: 0, name: 'nursery',
  frames: [0, 480], lines: [], show: [{ from: 0 }], beats: [], overlays: [],
  look: { ao: 0.6, aoRadius: 0.5, shadowRadius: 2.0, sat: 1.0, con: 1.05, vig: 0.05, bloom: 0.14, hot: 0.1, ink: 2.4 },
  light: { sun: [0.70, 0.78, 1.0], power: 0.55, sunDir: [-0.3, 0.5, -0.8], sky: [0.40, 0.46, 0.56], ground: [0.30, 0.32, 0.30], hemi: 0.26,
    fill: [0.80, 0.86, 1.0], fillPower: 0.2, background: [0.04, 0.05, 0.06], lit: [1.0, 0.90, 0.82], shade: [0.66, 0.62, 0.74], lamp: 0.6 },
  grade: { exp: 1.0, lift: 0.0, sat: 1.0, haze: 0, sky: { clouds: 0 } },
  haze: { color: [0.06, 0.07, 0.08], near: 14, far: 60 },
  set: 'nursery', setModule: '/films/wif5/parts/b/set.js',
  make: { pulse: { kind: 'ao_anim', prop: 'pulse' }, boy: { kind: 'ao_anim', prop: 'boy' } },
  cast: { doc: doc.cast({ at: [0.1, 7.6, 0], yaw: 0, focus: 'camera', lead: true }) },
  anim: { doc: [
    doc.clip('Move_Run_Fwd_Loop', { f: 0, pos: [0.1, 7.6], to: [0.1, -0.2], expr: 'panic', look: 'camera0' }),
    doc.clip('Idle_Stand_Loop', { f: 150, pos: AT, yaw: -62, expr: 'worried', look: 'cradle' }),
    doc.clip('Idle_CarryBag_Loop', { f: 262, pos: AT, yaw: -28, swap: BABY, expr: 'calm', look: 'baby' }),
    { f: 400, expr: 'sad', look: 'photo' },
  ] },
  direct: [
    { at: { f: 0 }, intent: 'high', why: 'B1 · half the cradles empty: the rows run away behind him, he runs at us in the lower third', cut: 'cut',
      cam: { pos: [0.25, -1.7, 2.7], aim: [0.05, 3.5, 0.35], lens: 20 } },
    { at: { f: 150 }, intent: 'low', why: 'B2 · he finds the boy: over the cradle, the bundle in front, his face up top', cut: 'cut',
      cam: { pos: [-1.55, -1.15, 1.3], aim: [-0.75, 0.45, 1.05], lens: 24 } },
    { at: { f: 270 }, intent: 'low', why: 'B3 · lifted to his chest', cut: 'cut',
      cam: { pos: [0.15, -1.45, 0.95], aim: [-0.45, 0.45, 1.3], lens: 28 } },
    { at: { f: 298 }, intent: 'insert', why: 'contact · the bundle in his arms', cut: 'cut',
      cam: { pos: [-0.1, -0.6, 1.2], aim: [-0.4, 0.4, 1.12], lens: 40 } },
    { at: { f: 400 }, intent: 'low', why: 'B4 · remember him: his card and her photo low, his face over them', cut: 'cut',
      cam: { pos: [-1.24, -0.27, 1.15], aim: [-0.86, 0.45, 1.06], lens: 18 } },
  ],
};
