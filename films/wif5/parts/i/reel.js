// wif5 part i (film frames 2111-2336): a care-home lounge, years on. Old men in sweaters round a cake with 80 on it
// (2170, words on screen); he leans in and blows: a puff, the flames bent away (2240, close, no words); then the chairs
// round him are empty, the paper hats left on them (2300, words). Elders play only Idle_Breath / Idle_Stooped (CAST.md):
// the stooped idle is his lean over the cake. Built through the kit way in: person() and place(); the set is ./set.js.
import { person } from '/styles/stick-man/kit/film.js';

const OLD = { body: 'elder', age: 'elder', hair: [] };
const M = person({ name: 'i_m', ...OLD, outfit: ['sweater:mustard'], face: ['happy'], clips: ['Idle_Stooped_Loop'] });
const A = person({ name: 'i_a', ...OLD, outfit: ['sweater:navy'], face: ['happy'], clips: ['Idle_Breath_Loop'] });
const B = person({ name: 'i_b', ...OLD, outfit: ['sweater:rose'], face: ['happy'], clips: ['Idle_Breath_Loop'] });

const PM = [0.0, 1.0], YM = 0, PA = [-0.56, 1.0], YA = 22, PB = [0.56, 1.0], YB = -22;
export default {
  title: 'wif5 i: eighty', fps: 30, glasses: false, style: 'kaiships', directDrift: 0, name: 'birthday',
  frames: [2111, 2336], lines: [], show: [{ from: 2111 }], overlays: [],
  beats: [
    { f: 2270, who: 'i_a', do: 'set', key: 'show', to: 0 }, { f: 2270, who: 'i_b', do: 'set', key: 'show', to: 0 },
  ],
  look: { ao: 0.6, aoRadius: 0.5, shadowRadius: 2.0, sat: 1.0, con: 1.05, vig: 0.05, bloom: 0.14, hot: 0.1, ink: 2.4 },
  light: { sun: [0.9, 0.8, 0.7], power: 0.4, sunDir: [0.3, 0.5, -0.81], sky: [0.42, 0.38, 0.34], ground: [0.30, 0.24, 0.20], hemi: 0.26,
    fill: [0.95, 0.88, 0.8], fillPower: 0.2, background: [0.06, 0.05, 0.04], lit: [1.0, 0.92, 0.80], shade: [0.66, 0.62, 0.70], lamp: 0.55 },
  grade: { exp: 1.0, lift: 0.0, sat: 1.0, haze: 0 },
  set: 'birthday', setModule: '/films/wif5/parts/i/set.js',
  make: { puff: { kind: 'ao_anim', prop: 'puff' }, hats: { kind: 'ao_anim', prop: 'hats' } },
  cast: {
    i_m: M.cast({ at: [...PM, 0], yaw: YM, focus: 'camera', lead: true }),
    i_a: A.cast({ at: [...PA, 0], yaw: YA, focus: 'i_m' }),
    i_b: B.cast({ at: [...PB, 0], yaw: YB, focus: 'i_m' }),
  },
  anim: {
    i_m: [
      M.clip('Idle_Stooped_Loop', { f: 2100, pos: PM, yaw: YM, expr: 'grin', look: 'camera' }),
      M.clip('Idle_Stooped_Loop', { f: 2222, pos: [0, 0.92], yaw: YM, expr: 'yawn', look: 'puff' }),
      M.clip('Idle_Stooped_Loop', { f: 2270, pos: PM, yaw: YM, expr: 'sad', look: 'camera' }),
    ],
    i_a: [A.clip('Idle_Breath_Loop', { f: 2100, pos: PA, yaw: YA, times: 3, expr: 'laugh', look: 'camera' })],
    i_b: [B.clip('Idle_Breath_Loop', { f: 2100, pos: PB, yaw: YB, times: 3, expr: 'happy', look: 'camera' })],
  },
  direct: [
    { at: { f: 2111 }, intent: 'medium', why: 'P1 · old men round a cake with 80 on it (faces over the words)', cut: 'cut',
      cam: { pos: [0.0, -1.45, 0.8], aim: [0.0, 0.6, 0.5], lens: 19 } },
    { at: { f: 2222 }, intent: 'close', why: 'P2 · he leans in and blows: the puff, the flames bending away', cut: 'cut',
      cam: { pos: [0.35, -0.25, 1.0], aim: [0.0, 0.75, 1.05], lens: 28 } },
    { at: { f: 2270 }, intent: 'wide', why: 'P3 · the chairs round him empty, the hats left on them (faces over the words)', cut: 'cut',
      cam: { pos: [0.0, -1.45, 0.7], aim: [0.0, 0.7, 0.42], lens: 18 } },
  ],
};
