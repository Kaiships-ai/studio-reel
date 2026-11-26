// wif5 part h (film frames 1894-2111): the lab, month 6. Three scientists round a glass womb tank; the monitor beside it beats
// a big green trace (2000, hope: one points at it, one nods). At FLAT (2030) the trace goes flat and red light comes from
// the monitor and the tank's beacon (2040); one scientist bends, defeated (2090, words on screen). No lab coats (CAST.md).
// Built through the kit way in: person() and place() (styles/stick-man/kit/film.js); the set is ./set.js.
import { person } from '/styles/stick-man/kit/film.js';

const A = person({ name: 'h_a', body: 'adult', outfit: ['pens', 'shirt:office', 'tie'], face: ['happy'], hair: [],
  clips: ['Idle_Stand_Loop', 'Gest_Point_Once', 'React_Startle_Once', 'React_Defeated_Once'] });
const B = person({ name: 'h_b', body: 'adult', girth: 1.35, outfit: ['cardigan:plum', 'shirt:office'], face: ['happy'], hair: [],
  clips: ['Idle_Stand_Loop', 'Gest_NodYes_Once', 'React_Surprise_Once'] });
const C = person({ name: 'h_c', body: 'adult', outfit: ['sweater:teal'], face: ['happy'], hair: [],
  clips: ['Idle_Stand_Loop', 'React_Startle_Once'] });

const PA = [-0.85, 0.4], YA = 45, PB = [0.2, 1.45], YB = -8, PC = [1.05, 1.25], YC = -25;
export default {
  title: 'wif5 h: the flat line', fps: 30, glasses: false, style: 'kaiships', directDrift: 0, name: 'lab',
  frames: [1894, 2111], lines: [], show: [{ from: 1894 }], beats: [], overlays: [],
  look: { ao: 0.6, aoRadius: 0.5, shadowRadius: 2.0, sat: 1.0, con: 1.05, vig: 0.05, bloom: 0.14, hot: 0.1, ink: 2.4 },
  light: { sun: [0.70, 0.80, 0.95], power: 0.45, sunDir: [-0.2, 0.5, -0.84], sky: [0.38, 0.44, 0.50], ground: [0.26, 0.26, 0.26], hemi: 0.26,
    fill: [0.8, 0.85, 0.95], fillPower: 0.2, background: [0.04, 0.05, 0.06], lit: [0.96, 0.96, 0.92], shade: [0.6, 0.64, 0.74], lamp: 0.55 },
  grade: { exp: 1.0, lift: 0.0, sat: 1.0, haze: 0 },
  set: 'lab', setModule: '/films/wif5/parts/h/set.js',
  make: { screen: { kind: 'ao_anim', prop: 'screen' } },
  cast: {
    h_a: A.cast({ at: [...PA, 0], yaw: YA, focus: 'screen', lead: true }),
    h_b: B.cast({ at: [...PB, 0], yaw: YB, focus: 'screen' }),
    h_c: C.cast({ at: [...PC, 0], yaw: YC, focus: 'screen' }),
  },
  anim: {
    h_a: [
      A.clip('Idle_Stand_Loop', { f: 1880, pos: PA, yaw: YA, expr: 'happy', look: 'screen' }),
      A.clip('Gest_Point_Once', { f: 1965, pos: PA, yaw: YA, expr: 'excited', look: 'screen' }),
      A.clip('React_Startle_Once', { f: 2031, pos: PA, yaw: YA, expr: 'shock', look: 'screen' }),
      A.clip('React_Defeated_Once', { f: 2040, pos: PA, yaw: 10, expr: 'cry', look: 'h_c' }),
    ],
    h_b: [
      B.clip('Idle_Stand_Loop', { f: 1880, pos: PB, yaw: YB, expr: 'happy', look: 'screen' }),
      B.clip('Gest_NodYes_Once', { f: 1982, pos: PB, yaw: YB, expr: 'happy', look: 'screen' }),
      B.clip('React_Surprise_Once', { f: 2031, pos: PB, yaw: YB, expr: 'shock', look: 'screen' }),
      B.clip('Idle_Stand_Loop', { f: 2091, pos: PB, yaw: YB, expr: 'sad', look: 'h_a' }),
    ],
    h_c: [
      C.clip('Idle_Stand_Loop', { f: 1880, pos: PC, yaw: YC, expr: 'happy', look: 'screen' }),
      C.clip('React_Startle_Once', { f: 2032, pos: PC, yaw: YC, expr: 'shock', look: 'screen' }),
    ],
  },
  direct: [
    { at: { f: 1894 }, intent: 'wide', why: 'P1 · the tank, the green heartbeat, three hopeful faces', cut: 'cut',
      cam: { pos: [0.2, -1.75, 0.9], aim: [0.2, 0.8, 0.98], lens: 18 } },
    { at: { f: 2030 }, intent: 'close', why: 'P2 · the line goes flat: red monitor light on their faces', cut: 'cut',
      cam: { pos: [0.3, -0.95, 1.05], aim: [0.7, 0.6, 1.15], lens: 21 } },
    { at: { f: 2070 }, intent: 'medium', why: 'P3 · one of them bends, defeated (faces over the words)', cut: 'cut',
      cam: { pos: [-0.45, -1.2, 0.85], aim: [-0.55, 0.4, 0.6], lens: 20 } },
  ],
};
