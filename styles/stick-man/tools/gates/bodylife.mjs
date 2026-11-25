// Each body performs a clip its own way (Kai 25/11: "every character looks the same, old or young, big or small"): a
// clip on another body is measured against the adult's clip of the same name, on the solved figure (cast.js, physics
// on), and has to be slower / quicker, smaller / bigger by at least these amounts, in that body's direction.
//
// The amounts, written before anything was measured. A full-length figure in a 720 x 1280 frame is ~770 px tall, 430 px a
// metre. Nobody sees two bodies side by side in a film, so a difference has to survive a cut:
//   time    two durations read as different from ~8 % when the one follows the other, ~20 % when they are remembered
//           across a cut: the bodies told by their tempo alone (elder, child) get 20 % / 15 %, the ones also told by their
//           outline (heavy, thin) 10 % / 8 %
//   arc     how far the part that moves most (a hand that holds nothing, or the head) travels round the hips over the performance
//           (a capture's own frames, not the library's blends into and out of it), against the figure's size: 15 %
//           for elder and child, 8 % for heavy and thin. Judged only where that is READ_PX or more on the screen (2 ink
//           lines): a smaller arc (a breath, a sway) is a number nobody sees
//   onset   heavy: a mass starts and stops slowly. The lead part's peak acceleration at most 0.75 of the adult's (a start
//           the adult makes in 6 frames takes it 7)
//   bounce  child: the hips' rise and fall 15 % more than the adult's, against the leg, where the adult's is 2 cm or more
//   stride  on the move: the travel of a cycle against the leg. 20 % shorter for the elder, 10 % for heavy, 5 % longer for
//           thin and child (5 % of a 0.55 m step is 12 px, every step)
export const PX_PER_M = 430, READ_PX = 6;
export const BODY_LIFE = {
  elder: { time: [1.20, Infinity], arc: [0, 0.85], stride: [0, 0.80] },
  heavy: { time: [1.10, Infinity], arc: [0, 0.92], onset: [0, 0.75], stride: [0, 0.90] },
  thin: { time: [0, 0.92], arc: [1.08, Infinity], stride: [1.05, Infinity] },
  child: { time: [0, 0.85], arc: [1.15, Infinity], bounce: [1.15, Infinity], stride: [1.05, Infinity] },
};
export const BOUNCE_MIN = 0.02;

const pct = (v, p) => { const s = [...v].sort((a, b) => a - b), x = p * (s.length - 1), i = Math.floor(x); return s[i] + (s[Math.min(i + 1, s.length - 1)] - s[i]) * (x - i); };
// the size of a path: the middle 90 % of it on each axis (a one-frame spike, or how long a pose is held, does not change it)
const span = P => Math.hypot(...[0, 1, 2].map(i => { const v = P.map(p => p[i]); return pct(v, 0.95) - pct(v, 0.05); }));
const sub = (a, b) => a.map((v, i) => v - b[i]);
// the lead part's peak acceleration (the 95th percentile, on a path smoothed over 3 frames), metres a frame a frame
const accel = P => { const S = P.map((p, i) => i && i < P.length - 1 ? p.map((v, j) => (P[i - 1][j] + 2 * v + P[i + 1][j]) / 4) : p), A = [];
  for (let i = 1; i < S.length - 1; i++) A.push(Math.hypot(...S[i].map((v, j) => S[i + 1][j] - 2 * v + S[i - 1][j]))); return A.length ? pct(A, 0.95) : 0; };
// rows: rigWorld() a frame (motionlib.mjs rigClip `paths`); scale, leg: the body's size and leg against the adult's
export function lifeOf(C, rows, { scale = 1, leg = 1 } = {}) {
  const cap = !C.advance && Array.isArray(C.captured) && typeof C.captured[0] === 'number' ? C.captured : null, hold = C.needs?.hands;
  if (cap) rows = rows.slice(cap[0], cap[1] + 1);
  const parts = Object.fromEntries([['handL', hold === 'L' || hold === 'both'], ['handR', hold === 'R' || hold === 'both'], ['head', false]].filter(([, held]) => !held).map(([n]) => [n, rows.map(r => sub(r[n], r.pelvis))]));
  const size = Object.fromEntries(Object.entries(parts).map(([n, P]) => [n, span(P) / scale]));
  const root = C.keys.map(k => k.pos || [0, 0]), travel = C.advance ?? Math.hypot(root[root.length - 1][0] - root[0][0], root[root.length - 1][1] - root[0][1]);
  const z = rows.map(r => r.pelvis[2]);
  return { frames: C.frames, moves: !!C.advance || travel > 1, stride: travel / leg, size, accel: Object.fromEntries(Object.entries(parts).map(([n, P]) => [n, accel(P) / scale])), bounce: (pct(z, 0.95) - pct(z, 0.05)) / leg };
}
// a body's clip against the adult's: { rows: [[measure, value, lo, hi, ok]] }
export function lifeAgainst(body, A, B) {
  const L = BODY_LIFE[body], out = [], put = (n, v, why = '') => { const [lo, hi] = L[n]; out.push({ n, v: +v.toFixed(2), lo, hi, ok: v >= lo && v <= hi, why }); };
  if (!L) return out;
  const lead = Object.keys(A.size).reduce((a, b) => (A.size[b] > A.size[a] ? b : a));
  put('time', B.frames / A.frames);
  if (A.moves) { put('stride', B.stride / A.stride); return out; }
  const need = READ_PX / PX_PER_M / Math.abs(1 - (L.arc[0] || L.arc[1]));
  if (A.size[lead] >= need) { put('arc', B.size[lead] / A.size[lead], lead); if (L.onset) put('onset', B.accel[lead] / A.accel[lead], lead); }
  if (L.bounce && A.bounce >= BOUNCE_MIN) put('bounce', B.bounce / A.bounce);
  return out;
}
const want = r => (r.lo > 0 ? `>= ${r.lo}` : `<= ${r.hi}`);
export const lifeFails = (body, A, B) => lifeAgainst(body, A, B).filter(r => !r.ok).map(r => `body: ${body}'s ${r.n}${r.why ? ` (${r.why})` : ''} is ${r.v} of the adult's (${want(r)})`);
