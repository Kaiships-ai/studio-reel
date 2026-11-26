// wif5 part d (film 1134-1343, here 0-209): the lantern. The son walks the lit paper lantern down the bank to his father at
// the water's edge (a child only walks); the father holds it in both hands (grief); they let it go and it rises over the
// water into a sky of lanterns (lift). Stills (film = 1134 + local): beat 1174 (the son walks it down), contact 1178 (his
// hand on it), beat 1234 (the father holds it), contact 1238 (his hands on it), beat 1324 (it rises into the sky of others).
// Kit only through person()/place(); the set is ./set.js, the lantern ./props.js.
import { person } from '/styles/stick-man/kit/film.js';
import './props.js';
import { MARKS, RELEASE } from './set.js';

const by = 'ep-whatif1-v5-director', why = 'V5 stills, measure not built';
const dad = person({ name: 'wif5_dad', body: 'adult', outfit: ['sweater:forest'], face: ['sad'], hair: [],
  clips: ['Idle_Stand_Loop', 'Idle_CarryBag_Loop'], waivers: [{ pair: 'hand|wif5_lantern2|adult|hand', why, by }] });
const son = person({ name: 'wif5_son', body: 'child', age: 'child', outfit: ['scarf:coral', 'sweater:navy'], hair: [],
  clips: ['Move_Walk_Fwd_Loop'], waivers: [{ pair: 'hand|wif5_lantern|child|hand', why, by }] });

const D = MARKS.dad.slice(0, 2);
// the release: he stands facing the water; the lantern in his hands is hidden from then on (set.js 'rise') and the set's
// own lantern rises from where his hands held it
const DAD = [
  dad.clip('Idle_Stand_Loop', { f: 0, pos: D, yaw: -60, expr: 'sad', look: 'son' }),
  dad.clip('Idle_CarryBag_Loop', { f: 60, pos: D, yaw: 0, swap: { hugbag: 'wif5_lantern2' }, expr: 'cry', look: 'lantern' }),
  dad.clip('Idle_Stand_Loop', { f: RELEASE, pos: D, yaw: 180, props: {}, expr: 'calm', look: 'sky' }),
];
export const CUTS = [0, 42, 60, 102, RELEASE];
export default {
  title: 'wif5 d: lantern', fps: 30, glasses: false, style: 'kaiships', directDrift: 0, name: 'lake',
  frames: [0, 209], lines: [], show: [{ from: 0 }], beats: [], overlays: [],
  look: { ao: 0.6, aoRadius: 0.5, shadowRadius: 2.0, sat: 1.0, con: 1.05, vig: 0.05, bloom: 0.2, hot: 0.1, ink: 2.4 },
  // LIGHT-RECIPE-V3 at dusk: a low sky light, the sun under the horizon (weak, peach, from the far shore); lamp and lanterns
  light: { sun: [1.0, 0.66, 0.50], power: 0.45, sunDir: [0.2, 0.9, -0.25], sky: [0.42, 0.38, 0.62], ground: [0.22, 0.20, 0.22], hemi: 0.3,
    fill: [0.70, 0.66, 0.95], fillPower: 0.2, background: [0.10, 0.09, 0.16], lit: [1.0, 0.86, 0.74], shade: [0.56, 0.54, 0.74], lamp: 0.6 },
  grade: { exp: 1.0, lift: 0.0, sat: 1.0, haze: 0, sky: { clouds: 0 } },
  haze: { color: [0.30, 0.24, 0.34], near: 18, far: 70 },
  set: 'lake', setModule: '/films/wif5/parts/d/set.js',
  make: { rise: { kind: 'ao_anim', prop: 'rise' }, sky: { kind: 'ao_anim', prop: 'sky' }, skyglow: { kind: 'ao_anim', prop: 'skyglow' } },
  cast: {
    dad: dad.cast({ at: [...D, 0], yaw: -60, focus: 'son', lead: true }),
    son: son.cast({ at: [...MARKS.son0.slice(0, 2), 0], yaw: 60 }),
  },
  anim: {
    dad: DAD,
    son: [
      son.clip('Move_Walk_Fwd_Loop', { f: 0, pos: MARKS.son0.slice(0, 2), to: MARKS.son1.slice(0, 2), props: { R: 'wif5_lantern' }, expr: 'sad', look: 'lantern' }),
      son.clip('Move_Walk_Fwd_Loop', { f: RELEASE, pos: [-0.35, -0.2], to: [-0.05, 1.45], props: {}, expr: 'calm', look: 'sky' }),
    ],
  },
  direct: [
    { at: { f: 0 }, intent: 'low', why: 'D1 · the son walks the lit lantern down the path, the water and the dusk behind him', cut: 'cut',
      cam: { pos: [-0.6, -0.9, 0.75], aim: [-1.75, 0.45, 0.55], lens: 24 } },
    { at: { f: 42 }, intent: 'insert', why: 'contact · his fist on the lantern ring', cut: 'cut',
      cam: { pos: [-1.2, -0.1, 0.6], aim: [-1.72, 0.5, 0.5], lens: 40 } },
    { at: { f: 60 }, intent: 'low', why: 'D2 · the father holds it at the water: his face beside it up top, the lantern low', cut: 'cut',
      cam: { pos: [-0.7, -0.2, 1.2], aim: [0.3, 1.2, 1.05], lens: 30 } },
    { at: { f: 102 }, intent: 'insert', why: 'contact · his two fists on the lantern ring', cut: 'cut',
      cam: { pos: [0.39, -0.3, 0.8], aim: [0.39, 0.72, 0.98], lens: 24 } },
    { at: { f: RELEASE }, intent: 'high', why: 'D3 · let go: behind them, it rises over the water into a sky of lanterns', cut: 'cut',
      cam: { pos: [1.0, -1.6, 0.7], aim: [0.0, 6, 3.6], lens: 18 } },
  ],
};
