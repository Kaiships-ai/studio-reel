// wif5 part g (film frames 1671-1894): 3 a.m. in the kitchen, month 4. A father walks a crying baby, sweating (1705); later
// he has fallen asleep in the chair with the baby on his chest while his son walks in with a blanket (1785); the blanket
// lies over both (1865, words on screen). Built through the kit way in: person() and place(); the set is ./set.js.
import { person } from '/styles/stick-man/kit/film.js';

const by = 'ep-whatif1-v5-director', why = 'V5 stills, measure not built';
// the clip's own hugged duffel swapped for a 4 mm stand-in hidden in the baby bundle (the set's, ./set.js)
const NONE_BOTH = { mode: 'both', grip: [0, 0, 0], size: [0.004, 0.004, 0.004] };
const hw = [{ pair: 'hand|prop_both_4x4x4_0x0x0|adult|hand', why, by }];
// one father, two takes of him: walking (g_dad) and asleep in the chair (g_dads), shown one at a time
const DAD = { body: 'adult', outfit: ['sweater:slate'], hair: [] };
const walk = person({ name: 'g_dad', ...DAD, face: ['sad'], clips: ['Move_CarryBag_Walk_Loop'], waivers: hw });
const sleep = person({ name: 'g_dads', ...DAD, face: ['sleepy'], clips: ['Idle_Sit_Loop'] });
const son = person({ name: 'g_son', body: 'child', age: 'child', outfit: ['scarf', 'sweater:mustard'], hair: [], clips: ['Move_Walk_Fwd_Loop'] });

const PW = [0.9, 1.0], YW = -30, PS = [-0.75, 0.25], PK = [1.4, 1.15], YK = -69;
export default {
  title: 'wif5 g: 3 a.m.', fps: 30, headMarks: 'bold', glasses: false, style: 'kaiships', directDrift: 0, name: 'kitchen',
  frames: [1671, 1894], lines: [], show: [{ from: 1671 }], overlays: [],
  beats: [
    { f: 1671, who: 'g_dads', do: 'set', key: 'show', to: 0 }, { f: 1745, who: 'g_dads', do: 'set', key: 'show', to: 1 },
    { f: 1745, who: 'g_dad', do: 'set', key: 'show', to: 0 },
    { f: 1671, who: 'g_son', do: 'set', key: 'show', to: 0 }, { f: 1755, who: 'g_son', do: 'set', key: 'show', to: 1 }, { f: 1830, who: 'g_son', do: 'set', key: 'show', to: 0 },
    { f: 1676, who: 'g_dad', mark: ['sweat', 68] },
    { f: 1750, who: 'g_dads', mark: ['zzz', 140] },
  ],
  look: { ao: 0.6, aoRadius: 0.5, shadowRadius: 2.0, sat: 1.0, con: 1.05, vig: 0.05, bloom: 0.12, hot: 0.1, ink: 2.4 },
  light: { sun: [0.55, 0.65, 1.0], power: 0.45, sunDir: [0.25, -0.5, -0.83], sky: [0.30, 0.34, 0.50], ground: [0.26, 0.21, 0.17], hemi: 0.24,
    fill: [0.75, 0.80, 1.0], fillPower: 0.2, background: [0.04, 0.045, 0.08], lit: [1.0, 0.92, 0.80], shade: [0.60, 0.62, 0.78], lamp: 0.55 },
  grade: { exp: 1.0, lift: 0.0, sat: 1.0, haze: 0 },
  set: 'kitchen', setModule: '/films/wif5/parts/g/set.js',
  make: { cry: { kind: 'ao_anim', prop: 'cry' }, calm: { kind: 'ao_anim', prop: 'calm' }, fold: { kind: 'ao_anim', prop: 'fold' }, blanket: { kind: 'ao_anim', prop: 'blanket' }, drop: { kind: 'ao_anim', prop: 'drop' } },
  cast: {
    g_dad: walk.cast({ at: [...PW, 0], yaw: YW, focus: 'camera', lead: true }),
    g_dads: sleep.cast({ at: [...PS, 0], yaw: 0, focus: 'camera' }),
    g_son: son.cast({ at: [...PK, 0], yaw: YK, focus: 'g_dads' }),
  },
  anim: {
    g_dad: [walk.clip('Move_CarryBag_Walk_Loop', { f: 1680, pos: PW, yaw: YW, times: 2, swap: { hugbag: NONE_BOTH }, expr: 'worried', look: 'cry' })],
    g_dads: [sleep.clip('Idle_Sit_Loop', { f: 1650, pos: PS, yaw: 0, times: 2, expr: 'sleep' })],
    g_son: [son.clip('Move_Walk_Fwd_Loop', { f: 1755, pos: PK, yaw: YK, times: 4, expr: 'worried', look: 'g_dads' })],
  },
  direct: [
    { at: { f: 1671 }, intent: 'medium', why: 'P1 · 3 a.m., he walks the crying baby, sweating', cut: 'cut',
      cam: { pos: [0.2, -1.6, 1.0], aim: [0.6, 0.6, 0.95], lens: 22 } },
    { at: { f: 1715 }, intent: 'close', why: 'contact · the crying baby in his arms, sweat on his temple', cut: 'cut',
      cam: { pos: [0.0, -1.2, 1.05], aim: [0.4, 0.0, 1.0], lens: 22 } },
    { at: { f: 1745 }, intent: 'medium', why: 'P2 · asleep in the chair with the baby on his chest; his son walks in with a blanket', cut: 'cut',
      cam: { pos: [0.0, -2.0, 0.95], aim: [-0.05, 0.4, 0.8], lens: 20 } },
    { at: { f: 1830 }, intent: 'close', why: 'P3 · the blanket over both (faces under the words)', cut: 'cut',
      cam: { pos: [-0.72, -1.2, 0.9], aim: [-0.72, 0.42, 0.38], lens: 20 } },
  ],
};
