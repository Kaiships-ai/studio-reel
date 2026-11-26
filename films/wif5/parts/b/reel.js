// wif5 part b (film 504-984, here 0-480): the nursery. A doctor in scrubs runs the aisle between two rows of cradles, every
// second one flat and empty, red alarm light pulsing (panic); he finds the boy's cradle, steps behind it and bends over him,
// his palm resting on the swaddled chest, his face close (worried, tender); the boy's card "23:59" and his mother's photo on
// the cradle's front under them. He does not carry the boy. Stills (film frame = 504 + local): beat 579 (run), 719 (he bends
// over him), contact 790 (his palm on the blanket, the card and photo under it), beat 954 (his face over the boy, the palm low). Kit only through
// person()/place(); the bend is Act_PickUp_Once's own keys held at its deepest reach (no prop), the palm by arm IK.
import { person, toonHair, W_M, STYLE_PRESETS } from '/styles/stick-man/kit/film.js';
import { expandClips } from '/styles/stick-man/motion-lib/index.js';
import './props.js';
import { MARKS, CHEST, RIM } from './set.js';

const by = 'ep-whatif1-v5-director', why = 'V5 stills, measure not built';
const doc = person({ name: 'wif5_doc', body: 'adult', outfit: ['scrubs:teal', 'stethoscope', 'nametag', 'pens'], face: ['scared', 'sad'], hair: [toonHair('crop', [0.30, 0.19, 0.10])],
  clips: ['Move_Run_Fwd_Loop', 'Act_PickUp_Once', 'Idle_Stand_Loop'] });

const DEG = Math.PI / 180, clone = k => JSON.parse(JSON.stringify(k));
const local = (P, pos, yaw, s) => { const d = [P[0] - pos[0], P[2], -(P[1] - pos[1])], c = Math.cos(yaw * DEG), n = Math.sin(yaw * DEG), k = W_M * s;
  return [(d[0] * c - d[2] * n) / k, d[1] / k, (d[0] * n + d[2] * c) / k]; };
const ramp = (f, a, b) => Math.max(0, Math.min(1, (f - a) / (b - a))), ease = u => u * u * (3 - 2 * u);
// motion v1 (blocking, 26/11): one chained track, no teleport. He runs straight down the aisle from the double door and
// stops behind the boy's cradle, just past its right end (the run's own outro plants him, heading ~-2 deg: no turn, as the
// kit has no right turn), he runs on past the B2 cut (150) into its frame and stops at 174; the PickUp bend starts on the frame he stops. The run line stays 0.15 m clear of
// the left row's cradles (their right edge x -0.8).
// his other hand on the back rim at the cradle's right corner, on his own side (the set's RIM sat across his body from this spot)
const RIM2 = [-0.79, 0.42, 1.025];   // his right hand on the cradle's near short end (rim z 1.02, rows 26/11); on the back rim it ran 2 cm into his left arm (arm through arm 201-240)
// his palm where it comes to rest on the blanket (rows 26/11: the swaddle holds the hand 2-3 cm over the set's CHEST point)
const PALM = [-1.02, 0.45, 1.03];
const RUN0 = [-0.32, 9.0], AT = [-0.62, 1.0], BEND = 175, DEEP = BEND + 40, sD = doc.spec.scale ?? 1;
// its body keys only (CAST.md: PickUp passes in scrubs); the clip's bag channels are dropped, as no bag is picked up
const TRACK = expandClips([{ f: 60, clip: 'Move_Run_Fwd_Loop', body: 'adult', pos: RUN0, to: AT }, { f: BEND, clip: 'Act_PickUp_Once', body: 'adult' }]);
const RUN = TRACK.filter(k => k.f < BEND), ALL = TRACK.filter(k => k.f >= BEND);
let BENT = ALL.filter(k => k.f <= DEEP);
const hold = clone(BENT.at(-1)); for (const f of [DEEP + 40, 329]) BENT.push({ ...clone(hold), f });
// from the B4 cut (words on screen) he is a little less bent, so his face clears the cradle's rim, high in frame
// (BEND + 30 left both hands 1.6-6 cm short of the blanket and the rim: a little deeper keeps them in reach, face still over the rim)
const up = clone(ALL.find(k => k.f >= BEND + 36)); for (const f of [330, 480]) BENT.push({ ...clone(up), f });
for (const k of BENT) { for (const n of Object.keys(k)) if (n.startsWith('x_') || n === 'clipProps') delete k[n];
  const u = ease(ramp(k.f, BEND + 20, DEEP)); k.neck = { nod: 8 * u + (k.neck?.nod ?? 0) * (1 - u), tilt: 8 * u, turn: 0 };
  // the hand comes up behind the cradle's back wall first, then forward over the rim and down onto the blanket (a straight
  // sweep cut through the wall: 6.5 cm off at 204); the other hand follows the same timing to the rim, clear above it
  const w = ease(ramp(k.f, BEND + 13, BEND + 29)); if (w <= 0) continue;
  const OVER = [-0.92, 0.72, 1.16], v = ease(ramp(k.f, BEND + 30, BEND + 47)), P = OVER.map((x, i) => x * (1 - v) + PALM[i] * v);
  const q = local(P, k.pos, k.yaw, sD), side = q[0] < 0 ? 'armL' : 'armR', other = side === 'armL' ? 'armR' : 'armL';
  k[side] = { ...k[side], ik: q, ikw: w }; const R2 = [RIM2[0], RIM2[1] + 0.12 * (1 - v), RIM2[2] + 0.10 * (1 - v)]; k[other] = { ...k[other], ik: local(R2, k.pos, k.yaw, sD), ikw: w }; }
BENT[0] = { ...BENT[0], expr: 'worried', look: 'baby' };
export const CUTS = [0, 150, 260, 330];
export default {
  title: 'wif5 b: nursery', fps: 30, glasses: false, style: { ...STYLE_PRESETS.kaiships, life: 0.75 }, directDrift: 0, name: 'nursery',
  frames: [0, 480], lines: [], show: [{ from: 0 }], beats: [], overlays: [],
  look: { ao: 0.6, aoRadius: 0.5, shadowRadius: 2.0, sat: 1.0, con: 1.05, vig: 0.05, bloom: 0.14, hot: 0.1, ink: 2.4 },
  light: { sun: [0.70, 0.78, 1.0], power: 0.55, sunDir: [-0.3, 0.5, -0.8], sky: [0.40, 0.46, 0.56], ground: [0.30, 0.32, 0.30], hemi: 0.26,
    fill: [0.80, 0.86, 1.0], fillPower: 0.2, background: [0.04, 0.05, 0.06], lit: [1.0, 0.90, 0.82], shade: [0.66, 0.62, 0.74], lamp: 0.6 },
  grade: { exp: 1.0, lift: 0.0, sat: 1.0, haze: 0, sky: { clouds: 0 } },
  haze: { color: [0.06, 0.07, 0.08], near: 14, far: 60 },
  set: 'nursery', setModule: '/films/wif5/parts/b/set.js',
  // kituse depth: far town rows past the back wall and the double door (night albedo, the A recipe); hidden while the door is shut
  backdrop: { tint: [0.17, 0.18, 0.24], rows: [{ piece: 'backdrop_skyline_a', at: [-8, 24, 0] }, { piece: 'backdrop_roofline', at: [8, 22, 0] }] },
  make: { pulse: { kind: 'ao_anim', prop: 'pulse' } },
  cast: { doc: doc.cast({ at: [...RUN0, 0], yaw: 0, focus: 'camera', lead: true }) },
  anim: { doc: [
    { ...RUN[0], expr: 'panic', look: 'camera0' }, ...RUN.slice(1),
    ...BENT,
    { f: 300, expr: 'calm', look: 'baby' },
  ] },
  direct: [
    { at: { f: 0 }, intent: 'high', why: 'B1 · he runs down the aisle (seen from the side of it): lit full cradles and dark empty ones alternate, red beacons overhead', cut: 'cut',
      cam: { pos: [-0.6, 1.4, 2.3], aim: [-0.1, 5.0, 0.45], lens: 34 } },
    { at: { f: 150 }, intent: 'low', why: 'B2 · he bends over the boy behind his cradle, his palm comes onto the swaddled chest, his face close', cut: 'cut',
      cam: { pos: [-1.85, -0.45, 1.25], aim: [-1.0, 0.6, 1.1], lens: 24 } },
    { at: { f: 260 }, intent: 'insert', why: 'contact · his palm resting on the blanket over the boy\'s chest, the 23:59 card and her photo on the cradle under it', cut: 'cut',
      cam: { pos: [-1.35, -1.0, 1.55], aim: [-1.0, 0.45, 1.12], lens: 26 } },
    { at: { f: 330 }, intent: 'low', why: 'B4 · remember him: his face over the boy, tender, high in frame; the card and her photo on the cradle front below', cut: 'cut',
      cam: { pos: [-1.0, -0.8, 0.95], aim: [-1.0, 0.5, 1.2], lens: 24 } },
  ],
};
