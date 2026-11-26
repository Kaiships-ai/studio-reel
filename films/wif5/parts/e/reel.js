// wif5 part e (film 1343-1518, here 0-175): the office. One man types at his desk on a floor of empty desks (alone); every
// phone on the floor lights up at once (shock); he stands and turns to them (alarm). Stills (film = 1343 + local): beat
// 1373 (him alone among the empty desks), beat 1418 (every phone lit, he looks up), beat 1511 (he has stood, turning).
// Clips from CAST.md (adult/g1/pens+shirt:office+tie): Act_Type_Loop, Trans_StandUp_Once, Move_TurnLeft_Once. The loops
// run longer than their slot: each is cut where the next begins (expanded keys; no hand props in this part).
import { person } from '/styles/stick-man/kit/film.js';
import { expandClips } from '/styles/stick-man/motion-lib/index.js';
import { MARKS, PHONES, UP } from './set.js';

const man = person({ name: 'wif5_officer', body: 'adult', outfit: ['shirt:office', 'tie:crimson', 'pens'], face: ['scared'], hair: [],
  clips: ['Act_Type_Loop', 'Trans_StandUp_Once', 'Move_TurnLeft_Once'] });

const AT = MARKS.him.slice(0, 2), TURN = 142;
const span = (keys, from, to) => keys.filter(k => k.f >= from && k.f < to);
const MAN = [
  ...span(expandClips([man.clip('Act_Type_Loop', { f: 0, pos: AT, yaw: 0, expr: 'sad', look: 'screen' })]), 0, UP),
  { f: PHONES, expr: 'shock', look: 'phones' },
  ...span(expandClips([man.clip('Trans_StandUp_Once', { f: UP, pos: AT, yaw: 0, expr: 'worried', look: 'phones' })]), UP, TURN),
  ...expandClips([man.clip('Move_TurnLeft_Once', { f: TURN, pos: AT, yaw: 0, expr: 'panic', look: 'phonesL' })], { pos: AT, yaw: 0 }),
];
export const CUTS = [0, PHONES, 120];
export default {
  title: 'wif5 e: office', fps: 30, glasses: false, style: 'kaiships', directDrift: 0, name: 'office',
  frames: [0, 175], lines: [], show: [{ from: 0 }], beats: [], overlays: [],
  look: { ao: 0.6, aoRadius: 0.5, shadowRadius: 2.0, sat: 1.0, con: 1.05, vig: 0.05, bloom: 0.16, hot: 0.1, ink: 2.4 },
  // LIGHT-RECIPE-V3 at night indoors: no sun to speak of, a low cool sky light; the strip over his desk and the phones do the work
  light: { sun: [0.70, 0.76, 1.0], power: 0.45, sunDir: [0.3, 0.6, -0.75], sky: [0.36, 0.40, 0.52], ground: [0.24, 0.24, 0.28], hemi: 0.26,
    fill: [0.76, 0.82, 1.0], fillPower: 0.2, background: [0.06, 0.07, 0.10], lit: [1.0, 0.94, 0.86], shade: [0.60, 0.62, 0.76], lamp: 0.6 },
  grade: { exp: 1.0, lift: 0.0, sat: 1.0, haze: 0, sky: { clouds: 0 } },
  haze: { color: [0.08, 0.09, 0.12], near: 14, far: 60 },
  set: 'office', setModule: '/films/wif5/parts/e/set.js',
  make: { phones: { kind: 'ao_anim', prop: 'phones' }, chair: { kind: 'ao_anim', prop: 'chair' } },
  cast: { man: man.cast({ at: [...AT, 0], yaw: 0, focus: 'screen', lead: true }) },
  anim: { man: MAN },
  direct: [
    { at: { f: 0 }, intent: 'high', why: 'E1 · alone: him at the front desk, the empty rows running back behind him', cut: 'cut',
      cam: { pos: [0.45, -0.6, 2.0], aim: [0.0, 1.0, 0.35], lens: 26 } },
    { at: { f: PHONES }, intent: 'low', why: 'E2 · every phone lit behind him, his head comes up', cut: 'cut',
      cam: { pos: [0.3, -0.8, 1.4], aim: [0.0, 1.25, 0.66], lens: 30 } },
    { at: { f: 120 }, intent: 'low', why: 'E3 · he stands and turns to them', cut: 'cut',
      cam: { pos: [-0.9, -0.1, 1.3], aim: [0.05, 1.4, 1.05], lens: 24 } },
  ],
};
