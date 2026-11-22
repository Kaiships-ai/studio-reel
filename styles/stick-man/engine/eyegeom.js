// The open eye's proportions, shared by the drawing (facestyles/s2.js eye4) and the creepy-eyes check
// (tools/gates/eyegate.mjs, test/unit/stick-eyes.test.mjs), so the check measures exactly what is drawn.
//
// Why (Kai 22/11, Hot Money ep01 A v9: "mắt nhìn creepy" on the hero in all four camera tiles, and on the tellers): a small
// dot pupil floating in a tall white almond, white showing above and below it, reads as a fixed stare. Animation practice
// draws the opposite: a pupil/iris that fills most of the eye's width, the upper lid resting on (or over) its top edge, and
// white above the pupil only for a moment of fear or shock (Preston Blair, Cartoon Animation, the eye construction pages;
// Disney's "appeal": large irises, lids that touch them; the "sclera show" of a fearful face is what reads as alarm,
// Whalen et al. 2004, Science 306:2061). So:
//   - the pupil is EYE.prx x EYE.pry (was 0.033 x 0.049) and a "white" (wide-eyed) design shrinks it by EYE.shrink of its
//     size (was 0.42: a wide-eyed face got a pin-prick pupil);
//   - the upper lid comes down to rest within EYE.capA of the eye's height above the pupil's top, EYE.capShock for a
//     design with white >= 0.6 (fear, panic, shock keep their white above the pupil, the scare is the point);
//   - the catch light is a small spot at the pupil's upper edge (centred, it read as a ring: the pupil looked hollow).
export const EYE = { prx: 0.042, pry: 0.058, shrink: 0.18, capA: 0.06, capShock: 0.28, shockWhite: 0.6, catch: [0.40, 0.48, 0.20, 0.16] };
// v9's numbers, kept only so a before|after sheet and the check's report can show what changed
export const EYE_V9 = { prx: 0.033, pry: 0.049, shrink: 0.42, capA: null, capShock: null, shockWhite: 0.6, catch: [0.34, 0.40, 0.28, 0.22] };

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = x => { const t = clamp(x); return t * t * (3 - 2 * t); };

// the pupil's radii for a design's white share wP, the small-face ink factor kp, the eye's squash q (0 open .. 1 a line)
export function pupil(wP, kp = 1, q = 0, E = EYE) {
  const s = (1 - E.shrink * clamp(wP)) * kp;
  return { prx: E.prx * s, pry: E.pry * s * (1 - 0.35 * q) };
}
// the white the upper lid may leave above the pupil's top, as a share of the eye's height: little for every face, more
// for fear and shock (a smooth step through white 0.45 .. 0.75 so a take into fear has no pop)
export const capShare = (wP, E = EYE) => E.capA == null ? null : E.capA + (E.capShock - E.capA) * sstep((clamp(wP) - 0.45) / 0.30);
// the lid share (from the top) that lets at most capShare of white show above a pupil centred at pyc (relative to the
// eye's centre) with height pry, in an eye of half height h; never less than the design's own lid
export function restLid(lid, h, pyc, pry, wP, E = EYE) {
  const cap = capShare(wP, E);
  if (cap == null || h <= 0) return lid;
  const need = (h - (pyc + pry) - cap * 2 * h) / (2 * h);
  return Math.max(lid, Math.min(0.6, need));
}

// the open, unblinking eye of a design as s2 draws it (eye stretch from x.eSt, no take, no blink), with its numbers:
//   pupilW  the pupil's width over the eye's width;  whiteAbove / whiteBelow  white between the pupil and the upper /
//   lower lid, as shares of the eye's height (the stare is white on both sides)
export function eyeGeom(D, E = EYE) {
  const st = clamp(1 + (D.x?.eSt || 0), 0.5, 1.5), wP = clamp(D.white || 0);
  const w = D.rx * st ** -0.6, h = D.ry * st;
  const { prx, pry } = pupil(wP, 1, 0, E);
  const pyc = -0.014 + (D.x?.gY || 0) * Math.max(0, h - pry - 0.01) * 0.8;
  const L = restLid(Math.min(0.89, clamp(D.lid || 0, 0, 0.92)), h, pyc, pry, wP, E);
  const top = h * (1 - 2 * L), low = -h + clamp(D.low || 0) * h * 1.2;
  const py = Math.min(Math.max(pyc, low + pry), top - pry);
  return { pupilW: prx / w, whiteAbove: Math.max(0, top - (py + pry)) / (2 * h), whiteBelow: Math.max(0, (py - pry) - low) / (2 * h), lid: L, wP };
}

// the limits the check holds every open-eyed design to. A calm face: the pupil fills more than half the eye and the lid
// all but touches it; a fear or shock face (white >= shockWhite) may show white above, never a pin-prick pupil
export const LIMITS = { calm: { pupilW: 0.55, whiteAbove: 0.10 }, shock: { pupilW: 0.42, whiteAbove: 0.30 } };
// a design-time check of the held, open eye: a design that squeezes (x.eCr, x.eCrR: drawn as a line or > <, no pupil) has
// no open eye to judge; takes, blinks and live gaze move the numbers for a few frames around the hold
export const squeezes = D => (D.x?.eCr || 0) > 0 || (D.x?.eCrR || 0) > 0;
export function judge(D, E = EYE) {
  if (squeezes(D)) return { pupilW: null, whiteAbove: null, whiteBelow: null, lid: null, wP: D.white || 0, ok: true, bad: [], squeeze: true };
  const g = eyeGeom(D, E), L = g.wP >= E.shockWhite ? LIMITS.shock : LIMITS.calm, bad = [];
  if (g.pupilW < L.pupilW) bad.push(`pupil ${(g.pupilW * 100).toFixed(0)}% of the eye's width (< ${L.pupilW * 100}%)`);
  if (g.whiteAbove > L.whiteAbove) bad.push(`white above the pupil ${(g.whiteAbove * 100).toFixed(0)}% of the eye (> ${L.whiteAbove * 100}%)`);
  return { ...g, ok: !bad.length, bad };
}
