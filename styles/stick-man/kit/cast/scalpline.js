// The scalp: the part of a stick-man head that hair covers, one line for every hair style (Studio 26/11: the white scalp
// showed where hair should be three rounds running, because each style drew its own hairline and nothing held their sum to
// the head). A head point (W, the head's centre frame; lon = degrees round from the face, either side) is scalp when it
// stands above SCALP_LINE(lon): the forehead's top over the face, the temples down to the top of the ear, over the ear,
// behind it down to the nape. A style shows skin inside it only where it declares it (`bare`: [lonFrom, lonTo, yUnder]
// lists, e.g. a receded elder's temples), never by accident. Fixed 26/11, before any style was measured against it; made
// stricter once (26/11, after the first real render): behind the ear it reached the nape only at 135 deg and stopped at
// -0.40 W, and the render still showed a white crescent behind the jaw and a sliver over the collar on the thin styles.
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const FOREHEAD = 0.36, EAR_TOP = 0.08, NAPE = -0.44;
export const SCALP_LINE = lon => {
  const a = Math.abs(lon);
  if (a <= 35) return FOREHEAD;
  if (a <= 75) return FOREHEAD + (EAR_TOP - FOREHEAD) * sm(35, 75, a);       // the temple, down to the ear's top
  if (a <= 95) return EAR_TOP;                                               // over the ear
  return EAR_TOP + (NAPE - EAR_TOP) * sm(95, 120, a);                        // behind the ear, down to the nape
};
// (an entry { part, w, above }: a parting, |x - part| < w (W, x = + the figure's left) above y = `above`)
export const bareAt = (bare, lon, y, x = 0) => (bare || []).some(b => Array.isArray(b) ? Math.abs(lon) >= b[0] && Math.abs(lon) <= b[1] && y <= b[2] : y > b.above && Math.abs(x - b.part) < b.w);
export const inScalp = (lon, y, bare, x = 0) => y > SCALP_LINE(lon) && !bareAt(bare, lon, y, x);
