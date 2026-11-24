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
//                   reaches 0, so a lit white bag keeps its gradient; the ceiling sits below the glare line), before both
//                   blooms and the tone mapper
//   GLOW_MAX        the glow bloom adds at most this much to a pixel: a lamp's halo never washes the subject next to it
// tools/gates/valuegate.mjs 'blown object' fails any one object that still goes flat near-white, whatever share of the frame.
export const BUDGET = { albedo: 0.8, emissive: 0.04 };
// ceil: after the tone mapper (Khronos neutral, renderer exposure 0.88) and the sRGB encode, 0.85 lands near 226 of 255,
// so a white surface is bright but never at the glare line (235); a ceiling of 1.15 put every white head at ~242
export const ROLL = { knee: 0.55, ceil: 0.85 };
export const GLOW_MAX = 0.35;
export const EXP_GAMMA = 2.2;

// a mesh is part of a stick figure (its own HDR cap in the toon shader) only if no prop sits between it and the figure's
// root: a hand prop (kit/cast/handprops.js names it hp_<kind>) or a held scene prop is parented under the figure, and it is a
// prop (the money bag in a hand is the bag Kai saw blow out)
export function isFigurePart(o, propLayer = null) {
  if (propLayer != null && o.layers?.isEnabled(propLayer)) return false;
  for (let p = o; p; p = p.parent) {
    if (/^hp_/.test(p.name || '') || p.userData?.prop || p.userData?.rest) return false;
    if (p.userData?.stick) return true;
  }
  return false;
}
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
// an act's grade.roll { knee, ceil } over the film's roll-off (`base`), for that act only: a close-up whose flat white head
// fills the frame takes a lower ceiling so the head keeps its shading. A ceiling at or under the knee would invert the
// curve, so it is ignored (with the reason).
export function actRoll(grade, base = ROLL) {
  const r = grade?.roll; if (!r) return base;
  const knee = r.knee ?? base.knee, ceil = r.ceil ?? base.ceil;
  if (!(ceil > knee + 0.02)) return { ...base, bad: `grade.roll ceil ${ceil} must sit above knee ${knee}` };
  return { knee, ceil };
}
