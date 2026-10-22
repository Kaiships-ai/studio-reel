// c0_props.js: props shared by every chapter of this film, written once. Every chapter calls these; none draws its own
// version of a shared prop. Keep them pure functions of their arguments.
// Example: the continuity prop that fills a step at the end of each chapter.
function progressProp(x, y, k, col = PAL.ochre) {
  boilSeed('progress');
  paint(rrPts(x - 150, y - 22, 300, 44, 22), { wash: PAL.cream, ink: PAL.ink, sw: 1.4 });
  if (k > .02) paint(rrPts(x - 146, y - 18, 292 * clamp(k), 36, 18), { wash: col, ink: null });
}
