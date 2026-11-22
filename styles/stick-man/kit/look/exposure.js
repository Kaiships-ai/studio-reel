// An act's grade.exp multiplies the finished frame after the tone mapper (engine/look.js, the grade pass): above EXP_MAX
// it pushes the lit half of the picture to the clip, and the shoulder that rescues it flattens the highlights. Hot Money
// ep01 lit its night acts at x1.55-2.35: the renders came out 3-8 % clipped, then were graded flat in post. A dark place
// is brightened with its lights (light.power, hemi, fillPower, lamp, lamps); play.js warns on every act over the limit, with
// the [kit] prefix that tools/render/shot.mjs prints (it drops other page warnings).
export const EXP_MAX = 1.5;

export function exposureWarnings(act) {
  const e = act?.grade?.exp;
  if (!Number.isFinite(e) || e <= EXP_MAX) return [];
  return [`[kit] ${act.name || act.set || act.title || 'act'}: grade.exp ${e} > ${EXP_MAX} multiplies the finished frame after tone mapping, so it ` +
    'clips and the shoulder flattens it: brighten the place with its lights (light.power, hemi, fillPower, lamp, lamps) instead'];
}
