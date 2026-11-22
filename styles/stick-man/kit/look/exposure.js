// An act's grade.exp scales the whole linear scene by exp^2.2 before the highlight roll-off and the tone mapper
// (kit/look/highlights.js). Above EXP_MAX it pushes the lit half of the picture into the roll-off, where a white bag, a lamp
// and a wall all land near the same pale ceiling. Hot Money ep01 lit its night acts at x1.55-2.4 (then a post-tone-map
// multiply: 3-8 % clipped, graded flat). A dark place is brightened with its lights (light.power, hemi, fillPower, lamp,
// lamps); play.js warns on every act over the limit, with
// the [kit] prefix that tools/render/shot.mjs prints (it drops other page warnings).
export const EXP_MAX = 1.5;

export function exposureWarnings(act) {
  const e = act?.grade?.exp;
  if (!Number.isFinite(e) || e <= EXP_MAX) return [];
  return [`[kit] ${act.name || act.set || act.title || 'act'}: grade.exp ${e} > ${EXP_MAX} pushes the whole picture into the highlight roll-off, so ` +
    'bright objects lose their detail: brighten the place with its lights (light.power, hemi, fillPower, lamp, lamps) instead'];
}
