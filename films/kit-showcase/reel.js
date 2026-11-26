// kit-showcase: six people from person() (the fits table), one dusk plaza lit as one set. Each person: a body build, an approved toon hair
// (#212), a wardrobe costume (#203), a face, a hand prop where a pass row exists (#209) and a Mixamo clip. Nothing here is a story.
import { person, toonHair, STYLE_PRESETS } from '/styles/stick-man/kit/film.js';
import { expandClips } from '/styles/stick-man/motion-lib/index.js';

const SKIN = [[0.86, 0.72, 0.60], [0.74, 0.56, 0.44], [0.60, 0.43, 0.33], [0.90, 0.78, 0.66]];
const P = {
  ana: person({ name: 'ks_ana', body: 'adult', outfit: ['sweater:coral'], face: ['excited'], skin: SKIN[0], hair: [toonHair('side', [0.28, 0.16, 0.08])], prop: 'tin', clips: ['Move_Walk_Fwd_Loop', 'React_Surprise_Once'] }),
  bo: person({ name: 'ks_bo', body: 'adult', girth: 1.35, outfit: ['shirt:work:crimson'], face: ['excited'], skin: SKIN[1], hair: [toonHair('crop', [0.10, 0.07, 0.05])], prop: 'balloon', clips: ['Move_Run_Fwd_Loop'] }),
  chi: person({ name: 'ks_chi', body: 'adult', girth: 0.9, outfit: ['skirt:navy', 'sweater:teal'], face: ['confused'], skin: SKIN[3], hair: [toonHair('woman', [0.50, 0.30, 0.12])], prop: 'balloon', clips: ['Gest_Point_Once'] }),
  dan: person({ name: 'ks_dan', body: 'adult', girth: 1.12, outfit: ['cardigan:plum', 'shirt:work'], face: ['smug'], skin: SKIN[2], hair: [toonHair('curly', [0.55, 0.22, 0.10])], clips: ['Idle_Sit_Loop'] }),
  ong: person({ name: 'ks_ong', body: 'elder', age: 'elder', outfit: ['cardigan:slate', 'shirt:office', 'tie'], face: ['proud'], skin: SKIN[1], hair: [toonHair('elder')], prop: 'tin', clips: ['Act_Give_Once'] }),
  mai: person({ name: 'ks_mai', body: 'child', age: 'child', outfit: ['scarf:mustard', 'sweater:sky'], face: ['excited'], skin: SKIN[3], hair: [toonHair('girl', [0.30, 0.16, 0.07])], prop: 'balloon', clips: ['Move_Walk_Fwd_Loop'] }),
};
const at = (p, d, yaw) => { const a = yaw * Math.PI / 180; return [p[0] + Math.sin(a) * d, p[1] - Math.cos(a) * d]; };   // yaw 90 faces +x, 0 faces the camera (-y)
const keys = (ks, f0 = 0) => ks.map(k => ({ ...k, f: k.f + f0 }));
const hold = (k, prop, side) => { for (const x of k) x[`x_hp${side}_${prop}`] = 1; return k; };

// ana walks across with her tin, then startles at the end; bo runs the other way, a balloon in his fist; mai walks behind ana
const A0 = [-3.0, -0.9], B0 = [8.0, -2.0], M0 = [-2.8, 0.2];
let ANA = expandClips([P.ana.clip('Move_Walk_Fwd_Loop', { f: 0, pos: A0, yaw: 90, to: at(A0, 5.6, 90), x_hpR_tin: 1 })]);
ANA = hold(ANA, 'tin', 'R');
const aEnd = ANA.at(-1);
ANA = [...ANA.filter(k => k.f < 150), ...hold(expandClips([P.ana.clip('React_Surprise_Once', { f: 150, pos: [aEnd.pos[0], aEnd.pos[1]], yaw: 90, x_hpR_tin: 1 })]), 'tin', 'R')];
const BO = hold(expandClips([P.bo.clip('Move_Run_Fwd_Loop', { f: 50, pos: B0, yaw: -90, to: at(B0, 17, -90), x_hpR_balloon: 1 })]), 'balloon', 'R');
const MAI = hold(expandClips([P.mai.clip('Move_Walk_Fwd_Loop', { f: 0, pos: M0, yaw: 90, to: at(M0, 4.6, 90), x_hpL_balloon: 1 })]), 'balloon', 'L');
const CHI = expandClips([P.chi.clip('Gest_Point_Once', { f: 0, pos: [0.4, 3.6], yaw: 25, x_hpL_balloon: 1, times: 2 })]); hold(CHI, 'balloon', 'L');
const DAN = expandClips([P.dan.clip('Idle_Sit_Loop', { f: 0, pos: [-1.7, 3.3], yaw: 0, times: 2 })]);
const ONG = expandClips([P.ong.clip('Act_Give_Once', { f: 0, pos: [2.0, 3.0], yaw: -20, x_hpR_tin: 1 })]); hold(ONG, 'tin', 'R');

const cam = (f, why, pos, aim, lens, to) => ({ at: { f }, intent: 'still', why, cut: 'cut', cam: { pos, aim, lens }, to: to || { pos, aim, lens }, move: { from: { f }, dur: 1, ease: 'linear' } });
const MOVE = { at: { f: 0 }, intent: 'loop', why: 'a slow dolly in over the whole loop; nobody is cut', cut: 'cut', cam: { pos: [0.2, -5.4, 1.8], aim: [0.2, 3.0, 1.9], lens: 20 }, to: { pos: [0.2, -4.6, 1.7], aim: [0.2, 3.0, 1.8], lens: 20 }, move: { from: { f: 0 }, dur: 209, ease: 'linear' } };
export default {
  title: 'kit-showcase', fps: 30, glasses: false, style: { ...STYLE_PRESETS.kaiships, life: 0.75 }, directDrift: 0, name: 'plaza',
  frames: [0, 209], lines: [], show: [{ from: 0 }], beats: [], overlays: [],
  look: { ao: 0.6, aoRadius: 0.5, shadowRadius: 2.0, sat: 1.0, con: 1.05, vig: 0.05, bloom: 0.14, hot: 0.1, ink: 2.4 },
  light: { sun: [0.62, 0.70, 1.0], power: 1.2, sunDir: [0.35, 0.50, -0.78], sky: [0.38, 0.42, 0.66], ground: [0.32, 0.26, 0.22], hemi: 0.6,
    fill: [1.0, 0.86, 0.70], fillPower: 0.5, background: [0.05, 0.06, 0.12], lit: [1.0, 0.90, 0.76], shade: [0.66, 0.62, 0.74], lamp: 0.6 },
  grade: { exp: 1.0, lift: 0.0, sat: 1.0, haze: 0, sky: { clouds: 0 } },
  haze: { color: [0.08, 0.09, 0.15], near: 18, far: 80 },
  set: 'plaza', setModule: '/films/kit-showcase/set.js',
  cast: { ana: P.ana.cast({ at: [...A0, 0], yaw: 90 }), bo: P.bo.cast({ at: [...B0, 0], yaw: -90 }), chi: P.chi.cast({ at: [0.4, 3.6, 0], yaw: 25 }), dan: P.dan.cast({ at: [-1.7, 3.3, 0], yaw: 0 }),
    ong: P.ong.cast({ at: [2.0, 3.0, 0], yaw: -20 }), mai: P.mai.cast({ at: [...M0, 0], yaw: 90 }) },
  anim: { ana: ANA, bo: BO, chi: CHI, dan: DAN, ong: ONG, mai: MAI },
  direct: [MOVE],
};
