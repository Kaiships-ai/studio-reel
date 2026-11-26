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
  clips: ['Idle_Stand_Loop', 'React_Startle_Once', 'Gest_Point_Once'] });   // the reach to the glass is the point's own arm (no prop)

const PA = [-0.65, 0.35], YA = 30, PB = [1.05, 1.3], YB = -30, PC = [0.42, 1.04], YC = -60;
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
      A.clip('Idle_Stand_Loop', { f: 1965, pos: PA, yaw: YA, expr: 'excited', look: 'screen' }),
      A.clip('React_Startle_Once', { f: 2026, pos: PA, yaw: YA, expr: 'sad', look: 'screen' }),
      A.clip('React_Defeated_Once', { f: 2034, pos: PA, yaw: 10, expr: 'sad', look: 'camera' }),
    ],
    h_b: [
      B.clip('Idle_Stand_Loop', { f: 1880, pos: PB, yaw: YB, expr: 'happy', look: 'screen' }),
      B.clip('Gest_NodYes_Once', { f: 1982, pos: PB, yaw: YB, expr: 'happy', look: 'screen' }),
      B.clip('Idle_Stand_Loop', { f: 2024, pos: PB, yaw: YB, expr: 'sad', look: 'screen' }),
      B.clip('Idle_Stand_Loop', { f: 2091, pos: PB, yaw: YB, expr: 'sad', look: 'h_a' }),
    ],
    h_c: [
      C.clip('Idle_Stand_Loop', { f: 1880, pos: PC, yaw: YC, expr: 'happy', look: 'screen' }),
      C.clip('Gest_Point_Once', { f: 2026, pos: PC, yaw: YC, expr: 'sad', look: 'camera' }),
    ],
  },
  direct: [
    { at: { f: 1894 }, intent: 'wide', why: 'P1 · the tank, the green heartbeat, three hopeful faces', cut: 'cut',
      cam: { pos: [0.05, -1.3, 1.15], aim: [0.05, 0.85, 1.1], lens: 17 } },
    { at: { f: 2030 }, intent: 'close', why: 'P2 · the line goes flat: red monitor light on their faces', cut: 'cut',
      cam: { pos: [-0.12, -1.1, 1.2], aim: [-0.05, 0.9, 1.15], lens: 17 } },
    { at: { f: 2054 }, intent: 'close', why: 'P2b · his palm on the glass, the child curled inside, the dead monitor above (hand and face over the words)', cut: 'cut',
      cam: { pos: [0.4, -0.35, 0.9], aim: [0.0, 0.9, 0.84], lens: 20 } },
    { at: { f: 2076 }, intent: 'medium', why: 'P3 · one of them bends, defeated (faces over the words)', cut: 'cut',
      cam: { pos: [-0.6, -1.2, 0.85], aim: [0.1, 1.0, 0.52], lens: 18 } },
  ],
};
