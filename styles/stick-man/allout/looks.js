// Look presets (study gaps 1, 2, 9): a whole act's light, grade, haze and lens habits in one object, spread into the act:
//   import { LOOKS } from '/styles/stick-man/allout/looks.js';   const street = { ...LOOKS.sunnyExterior, ...own }
// sunnyExterior is tuned against a reference exterior (study, 12 matched frames): exposure down (ours ran 25 % brighter),
// deep shade lifted toward mauve-violet (theirs sits near 0.25, ours near 0.05; the ink lines are left black), highlights
// rolled off, a gentle soften and grain (the painted finish), haze toward the sky with distance, a lower warm key from behind
// the lens (camKey: it follows the camera, so the face in every shot is lit, the cartoon cheat the reference uses), a warm bounce off the ground, a cool rim, lens blur on close shots, motion blur only on very fast camera moves.
export const LOOKS = {
  sunnyExterior: {
    light: { sun: [1.0, 0.86, 0.66], power: 3.0, sunDir: [0.36, 0.72, -0.59], sky: [0.55, 0.68, 1.0], ground: [0.98, 0.74, 0.46], hemi: 0.8,
      fill: [0.72, 0.80, 1.0], fillPower: 0.35, lit: [1.04, 1.0, 0.94], shade: [0.74, 0.66, 0.92], lamp: 0.6, rim: 1, camKey: { az: 28, el: 33 } },
    grade: { exp: 0.97, lift: 0.0, sat: 0.98, shadow: { c: [0.38, 0.28, 0.42], k: 0.6 }, shoulder: 0.15, soft: 0.15, grain: 0.02 },
    haze: { color: [0.70, 0.80, 0.96], near: 18, far: 170 },
    lookExtra: { dofAuto: { below: 2.4, gain: 0.35 }, mblur: { px: 60, k: 0.7 }, sat: 1.1 },   // sat: the reel-wide stage saturation (ep 1 runs 1.3)
  },
};
// fold a preset's lookExtra into an act's `look` (dofAuto, mblur ride on look)
export const withLook = (name, act) => { const L = LOOKS[name]; const { lookExtra, ...rest } = L;
  return { ...rest, ...act, light: { ...rest.light, ...(act.light || {}) }, grade: { ...rest.grade, ...(act.grade || {}) }, look: { ...(act.look || {}), ...lookExtra } }; };
