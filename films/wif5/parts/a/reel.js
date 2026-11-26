// wif5 part a, first slice (frames 0-330): the New Year countdown in a lit square, one person. The dad cheers from frame 0
// (wave, a jump, claps) and looks up on ONE (frame 300, the count is one tick a second from frame 30; zero at 330).
// Built through the kit way in: person() and place() (styles/stick-man/kit/film.js); the set is ./set.js.
import { person } from '/styles/stick-man/kit/film.js';

const dad = person({ name: 'wif5_dad', body: 'adult', outfit: ['sweater:coral'], face: ['excited'], hair: [],
  clips: ['Gest_Wave_Loop', 'Act_Jump_Once', 'Gest_Clap_Loop', 'Gest_LookUp_Once'] });

const POS = [0, 0], YAW = -20;   // a quarter towards the camera's side
export const CUTS = [0, 330];
export default {
  title: 'wif5 a: countdown', fps: 30, glasses: false, style: 'kaiships', directDrift: 0, name: 'square',
  frames: [0, 330], lines: [], show: [{ from: 0 }], beats: [], overlays: [],
  look: { ao: 0.6, aoRadius: 0.5, shadowRadius: 2.0, sat: 1.0, con: 1.05, vig: 0.05, bloom: 0.14, hot: 0.1, ink: 2.4 },
  // LIGHT-RECIPE-V3: moon 0.45-1.2, sky light 0.18-0.35; the colour comes from the set's practicals
  light: { sun: [0.62, 0.70, 1.0], power: 0.8, sunDir: [0.35, 0.55, -0.76], sky: [0.34, 0.40, 0.62], ground: [0.26, 0.21, 0.18], hemi: 0.28,
    fill: [0.75, 0.80, 1.0], fillPower: 0.2, background: [0.035, 0.045, 0.095], lit: [1.0, 0.92, 0.80], shade: [0.62, 0.62, 0.80], lamp: 0.55 },
  grade: { exp: 1.0, lift: 0.0, sat: 1.0, haze: 0, sky: { clouds: 0 } },
  haze: { color: [0.065, 0.08, 0.125], near: 16, far: 80 },
  set: 'square', setModule: '/films/wif5/parts/a/set.js',
  make: { clock: { kind: 'ao_anim', prop: 'clock' }, snow: { kind: 'ao_anim', prop: 'snow' } },
  cast: { dad: dad.cast({ at: [...POS, 0], yaw: YAW, focus: 'camera', lead: true }) },
  anim: { dad: [
    dad.clip('Gest_Wave_Loop', { f: 0, times: 1, pos: POS, yaw: YAW, expr: 'excited', look: 'camera' }),
    dad.clip('Act_Jump_Once', { f: 80 }),
    dad.clip('Gest_Clap_Loop', { f: 172, times: 1 }),
    dad.clip('Gest_LookUp_Once', { f: 252, look: 'sky' }),
  ] },
  // one low glide from frame 0: in towards him, the tower clock over his head
  direct: [{ at: { f: 0 }, intent: 'low', why: 'P1 · the square is alive and he is happy: a low glide in, the clock above him', cut: 'cut',
    cam: { pos: [-2.5, -5.4, 0.7], aim: [0.1, 0.4, 2.05], lens: 28 }, to: { pos: [-0.95, -3.1, 0.8], aim: [0, 0.6, 2.0], lens: 30 },
    move: { from: { f: 0 }, dur: 330, ease: 'linear' } }],
};
