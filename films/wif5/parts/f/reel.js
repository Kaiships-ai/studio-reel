// wif5 part f (film frames 1518-1671): the corner shop, month 3. Bare shelves and one tin of baby milk. Two fathers reach for
// it (1550), both grip it and strain (1605, no words on screen), then A sees the baby on B's chest, lets go and pushes the
// tin to him (1650). Built through the kit way in: person() and place() (styles/stick-man/kit/film.js); the set is ./set.js.
import { person } from '/styles/stick-man/kit/film.js';

const by = 'ep-whatif1-v5-director', why = 'V5 stills, measure not built';
// the clips' own hand props (cash, crate) swapped for a 4 mm stand-in hidden inside the tin: the tin is the set's (./set.js)
const NONE_UP = { mode: 'up', grip: [0, 0, 0], size: [0.004, 0.004, 0.004] }, NONE_BOTH = { mode: 'both', grip: [0, 0, 0], size: [0.004, 0.004, 0.004] };
const hw = body => ['prop_up_4x4x4_0x0x0', 'prop_both_4x4x4_0x0x0'].map(k => ({ pair: `hand|${k}|${body}|hand`, why, by }));
const A = person({ name: 'f_a', body: 'adult', outfit: ['sweater:coral'], face: ['angry'], hair: [],
  clips: ['Idle_Stand_Loop', 'Act_HandOver_Once', 'Move_PushHeavy_Loop'], waivers: hw('adult') });
const B = person({ name: 'f_b', body: 'adult', girth: 1.12, outfit: ['cardigan:forest', 'shirt:work'], face: ['angry'], hair: [],
  clips: ['Act_HandOver_Once', 'Move_PushHeavy_Loop', 'Idle_CarryBag_Loop'], waivers: hw('adult') });

// B (the baby on his chest) on the left facing right, A on the right facing left: A's left hand (the giving hand) is the near one
const PB1 = [-0.55, 0.62], PA1 = [0.55, 0.62], YB = 72, YA = -72;      // P1 reach: both left hands on the tin on its stand
const PB2 = [-0.99, 0.70], PA2 = [0.99, 0.70];                         // P2 the push: both pairs of hands meet at the tin
const PA3 = [0.60, 0.62], PB3 = [-0.50, 0.66];                          // P3 A holds the tin out to B
export const CUTS = [1518, 1580, 1603, 1615];
export default {
  title: 'wif5 f: the last tin', fps: 30, glasses: false, style: 'kaiships', directDrift: 0, name: 'shop',
  frames: [1518, 1671], lines: [], show: [{ from: 1518 }], beats: [], overlays: [],
  look: { ao: 0.6, aoRadius: 0.5, shadowRadius: 2.0, sat: 1.0, con: 1.05, vig: 0.05, bloom: 0.12, hot: 0.1, ink: 2.4 },
  light: { sun: [0.70, 0.80, 1.0], power: 0.5, sunDir: [-0.3, 0.6, -0.74], sky: [0.40, 0.44, 0.50], ground: [0.30, 0.27, 0.22], hemi: 0.28,
    fill: [0.85, 0.85, 0.9], fillPower: 0.2, background: [0.05, 0.05, 0.06], lit: [1.0, 0.94, 0.84], shade: [0.62, 0.64, 0.74], lamp: 0.55 },
  grade: { exp: 1.0, lift: 0.0, sat: 1.0, haze: 0 },
  set: 'shop', setModule: '/films/wif5/parts/f/set.js',
  make: { tin: { kind: 'ao_anim', prop: 'tin' }, baby: { kind: 'ao_anim', prop: 'baby' } },
  cast: { f_a: A.cast({ at: [...PA1, 0], yaw: YA, focus: 'f_b', lead: true }), f_b: B.cast({ at: [...PB1, 0], yaw: YB, focus: 'f_a' }) },
  anim: {
    f_a: [
      A.clip('Act_HandOver_Once', { f: 1500, pos: PA1, yaw: YA, swap: { cash: NONE_UP }, fit: { top: 0.85 }, expr: 'angry', look: 'tin' }),
      A.clip('Move_PushHeavy_Loop', { f: 1580, pos: PA2, yaw: YA, times: 1, swap: { crate: NONE_BOTH }, expr: 'furious', look: 'f_b' }),
      A.clip('Act_HandOver_Once', { f: 1615, pos: PA3, yaw: YA, swap: { cash: NONE_UP }, fit: { top: 0.85 }, expr: 'calm', look: 'baby' }),
    ],
    f_b: [
      B.clip('Act_HandOver_Once', { f: 1504, pos: PB1, yaw: YB, swap: { cash: NONE_UP }, fit: { top: 0.85 }, expr: 'angry', look: 'tin' }),
      B.clip('Move_PushHeavy_Loop', { f: 1580, pos: PB2, yaw: YB, times: 1, swap: { crate: NONE_BOTH }, expr: 'furious', look: 'f_a' }),
      B.clip('Idle_CarryBag_Loop', { f: 1615, pos: PB3, yaw: YB, swap: { hugbag: NONE_BOTH }, expr: 'sad', look: 'f_a' }),
    ],
  },
  direct: [
    { at: { f: 1518 }, intent: 'low', why: 'P1 · bare shelves, one tin: both men reach for it (faces over the words)', cut: 'cut',
      cam: { pos: [0, -1.0, 1.06], aim: [0, 0.55, 0.93], lens: 19 } },
    { at: { f: 1580 }, intent: 'medium', why: 'P2 · both grip the tin and strain, nose to nose', cut: 'cut',
      cam: { pos: [0.1, -1.2, 1.35], aim: [0, 0.5, 0.95], lens: 24 } },
    { at: { f: 1603 }, intent: 'close', why: 'contact · four hands on one tin', cut: 'cut',
      cam: { pos: [0.0, -0.6, 1.55], aim: [0.0, 0.38, 1.0], lens: 24 } },
    { at: { f: 1615 }, intent: 'medium', why: 'P3 · he sees the baby, lets go and holds the tin out to him', cut: 'cut',
      cam: { pos: [0.15, -1.0, 1.06], aim: [-0.05, 0.55, 0.93], lens: 19 } },
  ],
};
