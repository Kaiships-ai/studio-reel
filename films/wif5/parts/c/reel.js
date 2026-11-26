// wif5 part c (film 984-1134, here 0-150): the care home. An old man stands stooped at a table for two, his hand on his cup;
// hers is poured at the empty chair with her cardigan over its back (an ache). Behind him the one carer left crosses with
// four trays stacked in her arms, leaning. Stills (film = 984 + local): beat 1024 (him, the two cups, the chair),
// contact 1028 (his hand on his cup), beat 1094 (the carer and the trays), contact 1098 (the trays in her hands).
// Elder clips only (CAST.md): Idle_Stooped_Loop; the cup is a film prop in his hand. Kit only through person()/place().
import { person } from '/styles/stick-man/kit/film.js';
import './props.js';
import { MARKS } from './set.js';

const by = 'ep-whatif1-v5-director', why = 'V5 stills, measure not built';
const him = person({ name: 'wif5_old', body: 'elder', age: 'elder', outfit: ['sweater:sand'], face: ['sad'], hair: [],
  clips: ['Idle_Stooped_Loop'], waivers: [{ pair: 'hand|wif5_teacup|elder|hand', why, by }] });
const carer = person({ name: 'wif5_carer', body: 'adult', outfit: ['sweater:teal'], face: ['scared'], hair: [],
  clips: ['Move_CarryBag_Walk_Loop', 'Idle_CarryBag_Loop'], waivers: [{ pair: 'hand|wif5_trays|adult|hand', why, by }] });

const TRAYS = { hugbag: 'wif5_trays' };
export const CUTS = [0, 42, 70, 98];
export default {
  title: 'wif5 c: care home', fps: 30, glasses: false, style: 'kaiships', directDrift: 0, name: 'dayroom',
  frames: [0, 150], lines: [], show: [{ from: 0 }], beats: [], overlays: [],
  look: { ao: 0.6, aoRadius: 0.5, shadowRadius: 2.0, sat: 1.0, con: 1.05, vig: 0.05, bloom: 0.14, hot: 0.1, ink: 2.4 },
  // LIGHT-RECIPE-V3: the care home keeps the low window sun at 3.0; sky light low; the warmth from the lamps
  light: { sun: [1.0, 0.72, 0.46], power: 3.0, sunDir: [-0.75, 0.35, -0.45], sky: [0.46, 0.42, 0.52], ground: [0.36, 0.26, 0.18], hemi: 0.3,
    fill: [0.78, 0.82, 1.0], fillPower: 0.22, background: [0.10, 0.08, 0.08], lit: [1.0, 0.90, 0.78], shade: [0.62, 0.58, 0.70], lamp: 0.6 },
  grade: { exp: 1.0, lift: 0.0, sat: 1.0, haze: 0, sky: { clouds: 0 } },
  haze: { color: [0.10, 0.08, 0.07], near: 14, far: 60 },
  set: 'dayroom', setModule: '/films/wif5/parts/c/set.js',
  cast: {
    him: him.cast({ at: [...MARKS.him.slice(0, 2), 0], yaw: 0, focus: 'hercup', lead: true }),
    carer: carer.cast({ at: [...MARKS.carer.slice(0, 2), 0], yaw: -90 }),
  },
  anim: {
    him: [
      him.clip('Idle_Stooped_Loop', { f: 0, pos: MARKS.him.slice(0, 2), yaw: 0, props: { L: 'wif5_teacup' }, expr: 'sad', look: 'hercup' }),
      { f: 70, look: 'chair' },
    ],
    carer: [
      carer.clip('Move_CarryBag_Walk_Loop', { f: 0, pos: [2.9, 3.4], to: [-1.6, 3.4], swap: TRAYS, expr: 'scared', look: 'trays' }),
    ],
  },
  direct: [
    { at: { f: 0 }, intent: 'low', why: 'C1 · two cups, one empty chair: from above the table, him and her chair in the lower third, the carer crossing behind', cut: 'cut',
      cam: { pos: [0.02, -0.3, 1.9], aim: [0.02, 1.7, 1.5], lens: 20 } },
    { at: { f: 42 }, intent: 'insert', why: 'contact · his hand on his cup', cut: 'cut',
      cam: { pos: [0.02, 0.5, 1.0], aim: [-0.14, 1.25, 0.82], lens: 38 } },
    { at: { f: 70 }, intent: 'low', why: 'C2 · the carer behind with four trays, him in front', cut: 'cut',
      cam: { pos: [-0.85, 2.95, 1.2], aim: [0.45, 3.3, 0.92], lens: 24 } },
    { at: { f: 98 }, intent: 'insert', why: 'contact · the trays in her hands', cut: 'cut',
      cam: { pos: [-0.15, 2.35, 1.05], aim: [0.3, 3.4, 0.85], lens: 40 } },
  ],
};
