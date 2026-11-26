// kit-showcase: six people from person() (the fits table), one dusk plaza lit as one set. Each person: a body build, an approved toon hair
// (#212), a wardrobe costume (#203), a face, a hand prop where a pass row exists (#209) and a Mixamo clip. Nothing here is a story.
import { person, toonHair, STYLE_PRESETS } from '/styles/stick-man/kit/film.js';
import { expandClips } from '/styles/stick-man/motion-lib/index.js';

const SKIN = [[0.86, 0.72, 0.60], [0.74, 0.56, 0.44], [0.60, 0.43, 0.33], [0.90, 0.78, 0.66]];
const P = {
  ana: person({ name: 'ks_ana', body: 'adult', outfit: ['sweater:coral'], face: ['excited'], skin: SKIN[0], hair: [toonHair('side', [0.28, 0.16, 0.08])], prop: 'tin', clips: ['Move_Walk_Fwd_Loop'] }),
  bo: person({ name: 'ks_bo', body: 'adult', girth: 1.35, outfit: ['shirt:work:crimson'], face: ['excited'], skin: SKIN[1], hair: [toonHair('crop', [0.10, 0.07, 0.05])], prop: 'tin', clips: ['Move_Run_Fwd_Loop'] }),
  chi: person({ name: 'ks_chi', body: 'adult', girth: 0.9, outfit: ['skirt:navy', 'sweater:teal'], face: ['confused'], skin: SKIN[3], hair: [toonHair('woman', [0.50, 0.30, 0.12])], prop: 'balloon', clips: ['Gest_Point_Once'] }),
  dan: person({ name: 'ks_dan', body: 'adult', girth: 1.12, outfit: ['cardigan:plum', 'shirt:work'], face: ['smug'], skin: SKIN[2], hair: [toonHair('curly', [0.55, 0.22, 0.10])], clips: ['Gest_SitClap_Loop'] }),
  ong: person({ name: 'ks_ong', body: 'elder', age: 'elder', outfit: ['cardigan:slate', 'shirt:office', 'tie'], face: ['proud'], skin: SKIN[1], hair: [toonHair('elder')], prop: 'tin', clips: ['Act_Give_Once'] }),
  mai: person({ name: 'ks_mai', body: 'child', age: 'child', outfit: ['scarf:mustard', 'sweater:sky'], face: ['excited'], skin: SKIN[3], hair: [toonHair('girl', [0.30, 0.16, 0.07])], prop: 'balloon', clips: ['Move_Walk_Fwd_Loop'] }),
};

// ---- an 8 s loop (L frames), the camera still: frame 0 is the frame after the last. Statics end where they begin; walkers and the runner go
// round closed circuits, a whole number of strides each (the stride is stretched <= 3 % to fit), so nobody pops at the seam.
const L = 240, DEG = Math.PI / 180;
const clone = k => JSON.parse(JSON.stringify(k));
const hold = (ks, prop, side) => { for (const x of ks) x[`x_hp${side}_${prop}`] = 1; return ks; };
const lerpK = (a, b, u) => typeof a === 'number' && typeof b === 'number' ? a + (b - a) * u
  : Array.isArray(a) && Array.isArray(b) && a.length === b.length ? a.map((x, i) => lerpK(x, b[i], u))
  : a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) ? Object.fromEntries(Object.keys(a).map(n => [n, n in b ? lerpK(a[n], b[n], u) : a[n]])) : (u < 0.5 ? a : b);
// an ellipse (centre C, axes ratio r = a / b) whose perimeter is exactly D: point and travel angle by the fraction u of its length, counter-clockwise from above
function ellipse(C, r, D) {
  const n = 2000, raw = []; let len = 0, prev = [r, 0];
  for (let i = 1; i <= n; i++) { const t = 2 * Math.PI * i / n, p = [r * Math.cos(t), Math.sin(t)]; len += Math.hypot(p[0] - prev[0], p[1] - prev[1]); raw.push(len); prev = p; }
  const k = D / len, tOf = u => { const s = ((u % 1) + 1) % 1 * len; let i = raw.findIndex(v => v >= s); if (i < 0) i = n - 1; const a = i ? raw[i - 1] : 0; return 2 * Math.PI * (i + (s - a) / (raw[i] - a)) / n; };
  return u => { const t = tOf(u); return { p: [C[0] + k * r * Math.cos(t), C[1] + k * Math.sin(t)], th: Math.atan2(Math.cos(t), -r * Math.sin(t)) }; };
}
// person p plays `clip` (a loop of `clen` frames, `N` strides) round the ellipse, starting a fraction `phase` of the way round
function circuit(p, clip, clen, N, E, phase, extra) {
  const len = N * clen, K = expandClips([p.clip(clip, { f: 0, pos: [0, 0], yaw: 90, to: [20, 0], times: N, ...extra })]).filter(k => k.f < len), out = [];
  for (let f = 0; f < L; f++) {
    const x = f * K.length / L, i = Math.floor(x) % K.length, j = (i + 1) % K.length, k = clone(lerpK(K[i], K[j], x - Math.floor(x)));
    const e = E(f / L + phase), d = e.th, c = Math.cos(d), s = Math.sin(d), p0 = k.pos;
    for (const l of ['legL', 'legR']) if (k[l]?.footW) { const w = k[l].footW, rx = w[0] - p0[0], ry = w[1] - p0[1]; k[l] = { ...k[l], footW: [e.p[0] + rx * c - ry * s, e.p[1] + rx * s + ry * c, w[2]] }; }
    k.pos = [e.p[0], e.p[1], p0[2] || 0]; k.yaw = 90 + d / DEG; k.f = f; delete k.ease; out.push(k);
  }
  return out;
}
// a clip that ends at frame L: the frames before it hold its first pose (a loop clip ends as it began)
function endAt(p, plays, pos, yaw, extra) {
  const total = plays.reduce((a, [n]) => a + p.frames(n), 0); let f = L - total;
  const ks = expandClips(plays.map(([n]) => { const k = p.clip(n, { f, pos, yaw, ...extra }); f += p.frames(n); return k; }));
  if (ks[0].f > 0) ks.unshift({ ...clone(ks[0]), f: 0 }); return ks.filter(k => k.f < L);
}
// the plaza: a shallow arc of three round the bench, the two circuits in front of it, the runner's lap round all of it
const DAN_AT = [-1.9, 2.7], CHI_AT = [0.0, 3.4], ONG_AT = [1.9, 2.7];
const DAN = endAt(P.dan, [['Gest_SitClap_Loop'], ['Gest_SitClap_Loop']], DAN_AT, 20);
const CHI = hold(endAt(P.chi, [['Gest_Point_Once'], ['Gest_Point_Once']], CHI_AT, -10, { x_hpL_balloon: 1 }), 'balloon', 'L');
const ONG = hold(endAt(P.ong, [['Act_Give_Once']], ONG_AT, -40, { x_hpR_tin: 1 }), 'tin', 'R');
const ANA = hold(circuit(P.ana, 'Move_Walk_Fwd_Loop', 31, 8, ellipse([0.0, 0.5], 2.1, 9.4), 0.0, { x_hpR_tin: 1 }), 'tin', 'R');
const MAI = hold(circuit(P.mai, 'Move_Walk_Fwd_Loop', 20, 12, ellipse([0.0, 0.5], 2.1, 6.9), 0.5, { x_hpL_balloon: 1 }), 'balloon', 'L');
const BO = hold(circuit(P.bo, 'Move_Run_Fwd_Loop', 19, 13, ellipse([0.0, 1.9], 2.0, 37), 0.76, { x_hpL_tin: 1 }), 'tin', 'L');
const AT = k => [...k[0].pos.slice(0, 2), 0];

const cam = (pos, aim, lens) => ({ at: { f: 0 }, intent: 'loop', why: 'one still camera: the loop closes on itself', cut: 'cut', cam: { pos, aim, lens }, to: { pos, aim, lens }, move: { from: { f: 0 }, dur: 1, ease: 'linear' } });
export const CAM = { wide: [[0.0, -3.4, 1.15], [0.0, 3.0, 1.95], 21], lineup: [[0.0, -4.6, 1.3], [0.0, 3.0, 1.95], 18] };
export default {
  title: 'kit-showcase', fps: 30, glasses: false, style: { ...STYLE_PRESETS.kaiships, life: 0.75 }, directDrift: 0, name: 'plaza',
  frames: [0, L - 1], lines: [], show: [{ from: 0 }], beats: [], overlays: [],
  look: { ao: 0.6, aoRadius: 0.5, shadowRadius: 2.0, sat: 1.0, con: 1.05, vig: 0.05, bloom: 0.14, hot: 0.1, ink: 2.4 },
  light: { sun: [0.62, 0.70, 1.0], power: 1.2, sunDir: [0.35, 0.50, -0.78], sky: [0.38, 0.42, 0.66], ground: [0.32, 0.26, 0.22], hemi: 0.6,
    fill: [1.0, 0.86, 0.70], fillPower: 0.5, background: [0.05, 0.06, 0.12], lit: [1.0, 0.90, 0.76], shade: [0.66, 0.62, 0.74], lamp: 0.6 },
  grade: { exp: 1.0, lift: 0.0, sat: 1.0, haze: 0, sky: { clouds: 0 } },
  haze: { color: [0.08, 0.09, 0.15], near: 18, far: 80 },
  set: 'plaza', setModule: '/films/kit-showcase/set.js',
  cast: { ana: P.ana.cast({ at: AT(ANA), yaw: ANA[0].yaw }), bo: P.bo.cast({ at: AT(BO), yaw: BO[0].yaw }), chi: P.chi.cast({ at: [...CHI_AT, 0], yaw: -10 }), dan: P.dan.cast({ at: [...DAN_AT, 0], yaw: 20 }),
    ong: P.ong.cast({ at: [...ONG_AT, 0], yaw: -40 }), mai: P.mai.cast({ at: AT(MAI), yaw: MAI[0].yaw }) },
  anim: { ana: ANA, bo: BO, chi: CHI, dan: DAN, ong: ONG, mai: MAI },
  direct: [cam(...CAM.wide)],
};
