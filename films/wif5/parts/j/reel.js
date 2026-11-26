// wif5 part j (film frames 2336-2876): the last man. The boy of 23:59, now 116, alone in a small warm room, stooped, holding
// a framed photo out to us (2400); his hands on it (contact, 2520); the photo: a young mother holding a newborn (2620); his
// face at peace as the window warms (2790). Every still sits between the words. Elders play only Idle_Stooped (CAST.md).
// Built through the kit way in: person() and place() (styles/stick-man/kit/film.js); the set is ./set.js.
import { person } from '/styles/stick-man/kit/film.js';

const MAN = person({ name: 'j_m', body: 'elder', age: 'elder', outfit: ['sweater:sand'], face: ['calm'], hair: [], clips: ['Idle_Stooped_Loop'] });
const P = [0.0, 0.62], Y = 0;
export default {
  title: 'wif5 j: the last man', fps: 30, glasses: false, style: 'kaiships', directDrift: 0, name: 'room',
  frames: [2336, 2876], lines: [], show: [{ from: 2336 }], beats: [], overlays: [],
  look: { ao: 0.6, aoRadius: 0.5, shadowRadius: 2.0, sat: 1.0, con: 1.05, vig: 0.05, bloom: 0.14, hot: 0.1, ink: 2.4 },
  light: { sun: [0.95, 0.82, 0.68], power: 0.4, sunDir: [0.35, -0.45, -0.82], sky: [0.42, 0.40, 0.38], ground: [0.30, 0.24, 0.19], hemi: 0.26,
    fill: [0.95, 0.88, 0.8], fillPower: 0.2, background: [0.06, 0.05, 0.04], lit: [1.0, 0.93, 0.82], shade: [0.66, 0.62, 0.70], lamp: 0.55 },
  grade: { exp: 1.0, lift: 0.0, sat: 1.0, haze: 0 },
  set: 'room', setModule: '/films/wif5/parts/j/set.js',
  make: { photo: { kind: 'ao_anim', prop: 'photo' }, warm: { kind: 'ao_anim', prop: 'warm' } },
  cast: { j_m: MAN.cast({ at: [...P, 0], yaw: Y, focus: 'photo', lead: true }) },
  anim: {
    j_m: [
      MAN.clip('Idle_Stooped_Loop', { f: 2320, pos: P, yaw: Y, expr: 'closed', look: 'photo' }),
      MAN.clip('Idle_Stooped_Loop', { f: 2505, pos: P, yaw: Y, expr: 'closed', look: 'photo' }),
      MAN.clip('Idle_Stooped_Loop', { f: 2700, pos: P, yaw: Y, expr: 'closed', look: 'camera' }),
    ],
  },
  direct: [
    { at: { f: 2336 }, intent: 'medium', why: 'P1 · alone in a small warm room, the photo in his hands', cut: 'cut',
      cam: { pos: [0.2, -1.0, 1.0], aim: [0.02, 0.7, 0.92], lens: 22 } },
    { at: { f: 2505 }, intent: 'close', why: 'contact · his two hands on the frame', cut: 'cut',
      cam: { pos: [0.1, -0.45, 1.05], aim: [0.06, 0.45, 1.0], lens: 22 } },
    { at: { f: 2600 }, intent: 'close', why: 'the photo: a young mother holding a newborn', cut: 'cut',
      cam: { pos: [0.08, -0.12, 0.82], aim: [0.07, 0.4, 0.77], lens: 30 } },
    { at: { f: 2700 }, intent: 'close', why: 'his face at peace; the window warms behind him', cut: 'cut',
      cam: { pos: [0.2, -0.75, 1.15], aim: [0.0, 0.7, 1.1], lens: 24 } },
  ],
};
