// Highlights that keep their detail (Kai 22/11, Hot Money ep01: "why do the money bags and the lamps keep blowing out? You
// have repeated this bug a billion times"). Every fix so far was one prop or one scene at a time (the cash's green glow, the
// duffel's reflective trim, OPEN's bloom 0.4 -> 0.2, a lamp's k.pts), while three things in the stage kept making it again:
//   1. a prop could be pure white (albedo 1) and could glow (emissive) though it is not a light, so a key on it went HDR;
//   2. an act's grade.exp multiplied the finished frame AFTER the tone mapper, and grade.shoulder (c - k c^2 / 2) then
//      folded every bright value onto one flat plateau: a bag at 200-211 with no texture, never clipped, never caught;
//   3. the highlight bloom (threshold 1.4) caught any surface pushed over it, and the glow bloom had no ceiling.
// engine/look.js now applies, for every film:
//   budgetMaterial  a lit surface reflects at most BUDGET.albedo; a lit surface that is not a light glows at most
//                   BUDGET.emissive (a stick figure is left alone: its own HDR cap is in the toon shader; a glow() mesh
//                   or a material with userData.light is a light)
//   exposure        grade.exp is scene-referred: x exp^2.2 on the linear scene before the tone mapper (the same mid-grey
//                   as the old display-space multiply), then the roll-off below; grade.shoulder is retired
//   rollLuma        luminance above ROLL.knee is compressed toward ROLL.ceil (Reinhard on the excess: the slope never
//                   reaches 0, so a lit white bag keeps its gradient), before both blooms and the tone mapper
//   GLOW_MAX        the glow bloom adds at most this much to a pixel: a lamp's halo never washes the subject next to it
// tools/gates/valuegate.mjs 'blown object' fails any one object that still goes flat near-white, whatever share of the frame.
export const BUDGET = { albedo: 0.8, emissive: 0.04 };
export const ROLL = { knee: 0.7, ceil: 1.15 };
export const GLOW_MAX = 0.35;
export const EXP_GAMMA = 2.2;

const lit = m => !!(m && (m.isMeshStandardMaterial || m.isMeshLambertMaterial || m.isMeshPhongMaterial || m.isMeshToonMaterial));

// once per material: scale a too-bright albedo down and a non-light's glow down; returns what it changed (for tests, logs)
export function budgetMaterial(m, { figure = false, light = false } = {}) {
  if (!lit(m) || m.userData?.budget) return null;
  (m.userData ||= {}).budget = 1;
  if (figure || light || m.userData.light) return null;
  const out = {};
  const a = m.color ? Math.max(m.color.r, m.color.g, m.color.b) : 0;
  if (a > BUDGET.albedo) { m.color.multiplyScalar(BUDGET.albedo / a); out.albedo = a; }
  const e = m.emissive ? Math.max(m.emissive.r, m.emissive.g, m.emissive.b) * (m.emissiveIntensity ?? 1) : 0;
  if (e > BUDGET.emissive) { m.emissiveIntensity = (m.emissiveIntensity ?? 1) * BUDGET.emissive / e; out.emissive = e; }
  return Object.keys(out).length ? out : null;
}

// the roll-off on a luminance (the shader in engine/look.js does the same per pixel)
export function rollLuma(L, k = ROLL.knee, c = ROLL.ceil) {
  if (L <= k) return L;
  const e = L - k;
  return k + e / (1 + e / (c - k));
}
export const ROLL_GLSL = `
  uniform float uRollK, uRollC, uExpLin;
  vec3 roll(vec3 c){ c *= uExpLin; float L = dot(c, vec3(0.2126, 0.7152, 0.0722));
    if (L > uRollK) { float e = L - uRollK; c *= (uRollK + e / (1.0 + e / (uRollC - uRollK))) / L; }
    return c; }`;
export const expLinear = exp => Math.pow(exp ?? 1, EXP_GAMMA);
