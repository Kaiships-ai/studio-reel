// Each body performs a clip its own way (Kai 25/11: "every character looks the same, old or young, big or small"): a
// clip on another body is measured against the adult's clip of the same name, on the solved figure (cast.js, physics
// on), and has to be slower / quicker, smaller / bigger by at least these amounts, in that body's direction, AND move in
// another shape: a copy that is only retimed and resized is the same performance in another costume.
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
//   stride  on the move: the travel of a cycle against the leg. 20 % shorter for the elder, 10 % for heavy (bodies.js: "short
//           slow steps" both), 5 % longer for thin (bodies.js: "long light steps"; 5 % of a 0.55 m step is 12 px, every step)
//   cadence child on the move (Studio 25/11, replacing its stride >= 1.05 after measuring: bodies.js says "quick short
//           steps", and a 5 % longer stride for its leg contradicted it, both made child gaits failed it at 0.58 and 0.71):
//           its steps at least 15 % quicker than the adult's (steps a second; the same 15 % as its time), each step no
//           longer for its leg than the adult's (stride <= 1)
//   shape   (Studio 25/11, gate (a)) the paths of the hands, the head (both round the hips) and the hips (in the world, less
//           the travel) over the capture's frames, after the best uniform clock (one time scale, 0.8-1.25 of the length ratio)
//           and each path's size are taken out (each path less its mean, over its own rms: a posture held differently is
//           not a motion, a bigger or smaller copy is not another shape): what is left of the two normalised paths (the
//           share of one the other does not explain, 1 - correlation^2, square-rooted), weighted by how far the part moves
//           (the larger of the two, at the adult's size), at least SHAPE_REL, and the part that differs most at least
//           SHAPE_CM (rms, at that weight). SHAPE_REL 0.20: the arc check calls a 15 % change of size readable across a
//           cut; a change of shape is remembered less well than a change of size, so it has to be bigger, a fifth of the
//           motion. SHAPE_CM 1.4: READ_PX on the screen, 2 ink lines, or it is a number nobody sees. A pure retime and
//           resize of the adult leaves ~0 here (test/unit/stick-motionlib.test.mjs builds one and it must fail).
//           (Both paths normalised, as Studio's gate says, not the body's fitted to the adult's: fitted, a part the adult
//           keeps still could never differ by more than the adult's stillness)
//   near    a clip on the move that no adult clip shares a name with is held to the adult gait nearest it (NEAREST: the same
//           act, another capture): time (or cadence) and stride, a gait's tempo and step being comparable across captures;
//           its shape is another capture's, so it is not judged. A clip in place with no adult twin is held to the stated rule
//           instead: it never freezes (STILL below, for every clip a body performs) and keeps its body's posture (the
//           elder's stoop: test/unit/stick-motionlib.test.mjs); the made breathing idles (Idle_Breath_Loop) are their body's
//           breath (bodies.js) by construction. A loop's length set against another capture's says nothing
export const PX_PER_M = 430, READ_PX = 6;
export const SHAPE_REL = 0.20, SHAPE_CM = 1.4;
export const BODY_LIFE = {
  elder: { time: [1.20, Infinity], arc: [0, 0.85], stride: [0, 0.80], shape: [SHAPE_REL, Infinity] },
  heavy: { time: [1.10, Infinity], arc: [0, 0.92], onset: [0, 0.75], stride: [0, 0.90], shape: [SHAPE_REL, Infinity] },
  thin: { time: [0, 0.92], arc: [1.08, Infinity], stride: [1.05, Infinity], shape: [SHAPE_REL, Infinity] },
  child: { time: [0, 0.85], arc: [1.15, Infinity], bounce: [1.15, Infinity], stride: [0, 1.0], cadence: [1.15, Infinity], shape: [SHAPE_REL, Infinity] },
};
export const NEAREST = { Move_OldWalk_Fwd_Loop: 'Move_Walk_Fwd_Loop' };
export const BOUNCE_MIN = 0.02;

const pct = (v, p) => { const s = [...v].sort((a, b) => a - b), x = p * (s.length - 1), i = Math.floor(x); return s[i] + (s[Math.min(i + 1, s.length - 1)] - s[i]) * (x - i); };
// the size of a path: the middle 90 % of it on each axis (a one-frame spike, or how long a pose is held, does not change it)
const span = P => Math.hypot(...[0, 1, 2].map(i => { const v = P.map(p => p[i]); return pct(v, 0.95) - pct(v, 0.05); }));
const sub = (a, b) => a.map((v, i) => v - b[i]), dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const mean = P => P.reduce((s, p) => s.map((v, i) => v + p[i] / P.length), [0, 0, 0]);
// the lead part's peak acceleration (the 95th percentile, on a path smoothed over 3 frames), metres a frame a frame
const accel = P => { const S = P.map((p, i) => i && i < P.length - 1 ? p.map((v, j) => (P[i - 1][j] + 2 * v + P[i + 1][j]) / 4) : p), A = [];
  for (let i = 1; i < S.length - 1; i++) A.push(Math.hypot(...S[i].map((v, j) => S[i + 1][j] - 2 * v + S[i - 1][j]))); return A.length ? pct(A, 0.95) : 0; };
// steps on the move: a gait loop is two a cycle; anything else counts its landings (an ankle down under 2 cm after 4 cm up)
const stepsOf = (C, rows) => { if (C.advance) return 2; let n = 0;
  for (let i = 0; i < 2; i++) { let up = false; for (const r of rows) { const z = r.feet?.[i]?.[0] ?? 0; if (z > 0.04) up = true; else if (up && z < 0.02) { n++; up = false; } } } return Math.max(1, n); };
// rows: rigWorld() a frame (motionlib.mjs rigClip `paths`); scale, leg: the body's size and leg against the adult's
export function lifeOf(C, rows, { scale = 1, leg = 1 } = {}) {
  const cap = !C.advance && Array.isArray(C.captured) && typeof C.captured[0] === 'number' ? C.captured : null, hold = C.needs?.hands;
  if (cap) rows = rows.slice(cap[0], cap[1] + 1);
  const free = [['handL', hold === 'L' || hold === 'both'], ['handR', hold === 'R' || hold === 'both'], ['head', false]].filter(([, held]) => !held).map(([n]) => n);
  const parts = Object.fromEntries(free.map(n => [n, rows.map(r => sub(r[n], r.pelvis))]));
  const size = Object.fromEntries(Object.entries(parts).map(([n, P]) => [n, span(P) / scale]));
  const root = C.keys.map(k => k.pos || [0, 0]), travel = C.advance ?? Math.hypot(root[root.length - 1][0] - root[0][0], root[root.length - 1][1] - root[0][1]);
  const z = rows.map(r => r.pelvis[2]), moves = !!C.advance || travel > 1;
  // the shape's paths at the adult's size: the hips less the travel (a straight line from the first frame to the last)
  let hips = rows.map(r => r.pelvis.map(v => v / scale)); const h0 = hips[0], h1 = hips[hips.length - 1], n = Math.max(1, hips.length - 1);
  if (moves) hips = hips.map((p, i) => p.map((v, j) => v - (h0[j] + (h1[j] - h0[j]) * i / n)));
  const paths = { ...Object.fromEntries(Object.entries(parts).map(([k, P]) => [k, P.map(p => p.map(v => v / scale))])), hips };
  return { frames: C.frames, moves, stride: travel / leg, steps: stepsOf(C, rows), size, paths, accel: Object.fromEntries(Object.entries(parts).map(([k, P]) => [k, accel(P) / scale])), bounce: (pct(z, 0.95) - pct(z, 0.05)) / leg };
}
// B against A after the best uniform clock and each path's size: { shape (the weighted share of the motion the other path does
// not explain), cm (the part that differs most, rms at its weight), part, at (the time scale found, against the length ratio) }
const sampleAt = (P, t) => { const i = Math.min(P.length - 1, Math.floor(t)), w = t - i, q = P[Math.min(P.length - 1, i + 1)]; return P[i].map((v, j) => v + (q[j] - v) * w); };
const centred = P => { const m = mean(P); return P.map(p => sub(p, m)); }, rms = P => Math.sqrt(P.reduce((x, p) => x + dot(p, p), 0) / P.length);
export function shapeAgainst(A, B) {
  const names = Object.keys(A.paths).filter(n => B.paths[n]), nA = A.paths.hips.length, nB = B.paths.hips.length, r0 = (nB - 1) / Math.max(1, nA - 1);
  const ac = Object.fromEntries(names.map(n => [n, centred(A.paths[n])]));
  let best = null;
  for (let q = 0.8; q <= 1.25 + 1e-9; q += 0.01) {
    const s = q * r0; let R = 0, T = 0, worst = 0, part = null;
    for (const n of names) {
      const a = ac[n], b = centred(a.map((_, t) => sampleAt(B.paths[n], Math.min(nB - 1, t * s)))), sa = rms(a), sb = rms(b), w = Math.max(sa, sb);
      const c = sa > 1e-9 && sb > 1e-9 ? a.reduce((x, p, i) => x + dot(p, b[i]), 0) / a.length / (sa * sb) : 1, r = w * Math.sqrt(Math.max(0, 1 - Math.max(0, c) ** 2));
      R += r * r; T += w * w; if (r > worst) { worst = r; part = n; }
    }
    const shape = Math.sqrt(R / Math.max(T, 1e-12));
    if (!best || shape < best.shape) best = { shape, cm: 100 * worst, part, at: q };
  }
  return best;
}
// a body's clip against the adult's: { rows: [[measure, value, lo, hi, ok]] } (near: A is the nearest adult clip, not a twin)
export function lifeAgainst(body, A, B, { near = false } = {}) {
  const L = BODY_LIFE[body], out = [], put = (n, v, why = '', ok = null) => { const [lo, hi] = L[n]; out.push({ n, v: +v.toFixed(2), lo, hi, ok: ok ?? (v >= lo && v <= hi), why }); };
  if (!L) return out;
  const lead = Object.keys(A.size).reduce((a, b) => (A.size[b] > A.size[a] ? b : a));
  if (A.moves) {
    if (L.cadence) put('cadence', (B.steps / B.frames) / (A.steps / A.frames)); else put('time', B.frames / A.frames);
    put('stride', B.stride / A.stride);
  } else put('time', B.frames / A.frames);
  if (near) return out;
  if (!A.moves) {
    const need = READ_PX / PX_PER_M / Math.abs(1 - (L.arc[0] || L.arc[1]));
    if (A.size[lead] >= need) { put('arc', B.size[lead] / A.size[lead], lead); if (L.onset) put('onset', B.accel[lead] / A.accel[lead], lead); }
    if (L.bounce && A.bounce >= BOUNCE_MIN) put('bounce', B.bounce / A.bounce);
  }
  const s = shapeAgainst(A, B); put('shape', s.shape, `${s.part} ${s.cm.toFixed(1)} cm`, s.shape >= SHAPE_REL && s.cm >= SHAPE_CM);
  return out;
}
const want = r => (r.lo > 0 ? `>= ${r.lo}` : `<= ${r.hi}`);
export const lifeFails = (body, A, B, o) => lifeAgainst(body, A, B, o).filter(r => !r.ok).map(r => `body: ${body}'s ${r.n}${r.why ? ` (${r.why})` : ''} is ${r.v} of the adult's (${want(r)}${r.n === 'shape' ? `, and ${SHAPE_CM} cm` : ''})`);

// ------------------------------------------------------------------ a hold is never a freeze
// A figure that stops dead reads as a paused film, not a still person (REVIEW-2: Idle_Kneel frozen 176 frames, Idle_Sad
// 315). In every STILL_F frames (2 s) some part (the head, a hand, the hips) moves at least STILL_CM within STILL_IN frames
// (half a second). STILL_CM 1.0: 4 px at 720p, twice the anti-aliased edge of a line, the least a viewer sees move; within
// half a second, because a drift slower than 4 px in that time reads as a still picture, not as breathing (a first measure
// from where the window began passed Idle_Kneel, which the review saw frozen)
export const STILL_F = 60, STILL_IN = 15, STILL_CM = 1.0;
export function stillSpans(rows) {
  const P = ['head', 'handL', 'handR', 'pelvis'], v = [];
  for (let f = 0; f + STILL_IN < rows.length; f++) v.push(100 * Math.max(...P.map(p => Math.hypot(...sub(rows[f + STILL_IN][p], rows[f][p])))));
  const out = []; for (let a = 0; a + STILL_F - STILL_IN <= v.length; a++) { const m = Math.max(...v.slice(a, a + STILL_F - STILL_IN)); if (m < STILL_CM) out.push([a, +m.toFixed(2)]); }
  return out;
}
