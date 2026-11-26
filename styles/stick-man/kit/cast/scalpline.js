// The scalp: the part of a stick-man head that hair covers, one line for every hair style (Studio 26/11: the white scalp
// showed where hair should be three rounds running, because each style drew its own hairline and nothing held their sum to
// the head). A head point (W, the head's centre frame; lon = degrees round from the face, either side) is scalp when it
// stands above SCALP_LINE(lon): the forehead's top over the face, the temples down to the top of the ear, over the ear,
// behind it down to the nape. A style shows skin inside it only where it declares it (`bare`: [lonFrom, lonTo, yUnder]
// lists, e.g. a receded elder's temples), never by accident. Fixed 26/11, before any style was measured against it.
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const FOREHEAD = 0.36, EAR_TOP = 0.08, NAPE = -0.40;
export const SCALP_LINE = lon => {
  const a = Math.abs(lon);
  if (a <= 35) return FOREHEAD;
  if (a <= 75) return FOREHEAD + (EAR_TOP - FOREHEAD) * sm(35, 75, a);       // the temple, down to the ear's top
  if (a <= 105) return EAR_TOP;                                              // over the ear
  return EAR_TOP + (NAPE - EAR_TOP) * sm(105, 135, a);                       // behind the ear, down to the nape
};
export const bareAt = (bare, lon, y) => (bare || []).some(([l0, l1, yu]) => Math.abs(lon) >= l0 && Math.abs(lon) <= l1 && y <= yu);
export const inScalp = (lon, y, bare) => y > SCALP_LINE(lon) && !bareAt(bare, lon, y);
