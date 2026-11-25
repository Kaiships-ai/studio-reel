// A body's clip is not the adult's in another costume (Kai 25/11: "every character looks the same, old or young, big or small"):
// a clip on another body is measured against the adult's clip of the same name, on the solved figure (cast.js, physics
// on), and has to be slower / quicker, smaller / bigger by at least these amounts, in that body's direction, AND move in
// another shape: a copy that is only retimed and resized is the same performance in another costume. A clip that passes is told
// apart by these numbers; whether it acts like that body is for a viewer in motion, and no line here says it does.
// Not seen by any line here or in motionlib.mjs: a body sinking into the floor (a kneel's shins did, and passed), feet skating where no
// foot is keyed as planted or between keys (54 and 82 cm, and passed), how a start or a stop reads (a lurch, a step back, a snap:
// passed), and how a clip reads in a real set (25/11, the review of the five adult clips)
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
//   shape   the ACT: the paths of the hands (from the middle of the shoulders) and the face (from the neck), both in the chest's
//           own frame, and of the upper trunk (the neck from the hips), so a hip sway or a weight shift is in none of them and a
//           breath only in the trunk, over the capture's frames, against the
//           ADULT'S CLIP PLAYED ON THIS BODY'S OWN FIGURE (its keys on this body's bones), both with physics off, so what the figure
//           alone does to a copy (the heavy belly bending a hanging arm) is in neither. The best clock is taken out (any clock that runs on, between
//           half and twice the speed: a hold drawn out is a retime too) and each path's size (less its mean, over its own rms); a
//           part moving under SHAPE_CM in both, its rms, does not vote. What is left is the share of the one the other does not
//           explain, sqrt(1 - c^2) of their correlation c, weighted by how far each part moves: at least SHAPE_REL, and the part
//           that differs most at least SHAPE_CM.
//           SHAPE_C 0.85, chosen before any clip was measured with it, from the geometry of a resize alone: the library's biggest
//           gestures swing an arm 120 deg; the same swing 1.5 times as far (the largest size in bodies.js life) is correlated
//           0.855 with it, 0.72 times 0.954, 1.25 times 0.963, 0.84 times 0.985. A retimed and resized adult stays above 0.85 and
//           cannot pass. (It was 0.98, SHAPE_REL 0.20, against the adult on its own figure and with the hips voting: REVIEW-3 showed the
//           adult's own values put on a body pass it, the difference often only the sine of the hips' weight shift)
//           SHAPE_CM 1.4: READ_PX on the screen, 2 ink lines, or it is a number nobody sees.
//           What it cannot see: whether the difference reads as that body, or as acting at all; a difference of posture; the order
//           or meaning of what the hands do; a part that spins in place. A pass says the motion is not a copy, nothing more
//   near    a clip on the move that no adult clip shares a name with is held to the adult gait nearest it (NEAREST: the same
//           act, another capture): time (or cadence) and stride, a gait's tempo and step being comparable across captures;
//           its shape is another capture's, so it is not judged. A clip in place with no adult twin is held to the stated rule
//           instead: it never freezes (STILL below, for every clip a body performs) and keeps its body's posture (the
//           elder's stoop: test/unit/stick-motionlib.test.mjs); the made breathing idles (Idle_Breath_Loop) are their body's
//           breath (bodies.js) by construction. A loop's length set against another capture's says nothing
export const PX_PER_M = 430, READ_PX = 6;
export const SHAPE_C = 0.85, SHAPE_REL = Math.sqrt(1 - SHAPE_C ** 2), SHAPE_CM = 1.4;
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
// a direction in the chest's own frame (ahead, left, up): what the trunk does (a breath, a lean) moves nothing in it
const unitOf = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); }, cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const inChest = (r, v) => { const u = unitOf(sub(r.neck, r.pelvis)), s = sub(r.shL, r.shR), d = dot(s, u), l = unitOf(s.map((x, i) => x - d * u[i])); return [dot(v, cross(l, u)), dot(v, l), dot(v, u)]; };
// rows: rigWorld() a frame (motionlib.mjs rigClip `paths`); scale, leg: the body's size and leg against the adult's
export function lifeOf(C, rows, { scale = 1, leg = 1 } = {}) {
  const cap = !C.advance && Array.isArray(C.captured) && typeof C.captured[0] === 'number' ? C.captured : null, hold = C.needs?.hands;
  if (cap) rows = rows.slice(cap[0], cap[1] + 1);
  const free = [['handL', hold === 'L' || hold === 'both'], ['handR', hold === 'R' || hold === 'both'], ['head', false]].filter(([, held]) => !held).map(([n]) => n);
  const parts = Object.fromEntries(free.map(n => [n, rows.map(r => sub(r[n], r.pelvis))]));
  const size = Object.fromEntries(Object.entries(parts).map(([n, P]) => [n, span(P) / scale]));
  const root = C.keys.map(k => k.pos || [0, 0]), travel = C.advance ?? Math.hypot(root[root.length - 1][0] - root[0][0], root[root.length - 1][1] - root[0][1]);
  const z = rows.map(r => r.pelvis[2]), moves = !!C.advance || travel > 1;
  // the act's paths at the adult's size (see shape): no part of them carries the hips
  const held = { handL: hold === 'L' || hold === 'both', handR: hold === 'R' || hold === 'both' };
  const mid = r => r.shL.map((v, i) => (v + r.shR[i]) / 2);
  const act = { trunk: r => sub(r.neck, r.pelvis), face: r => inChest(r, sub(r.face, r.neck)), handL: r => inChest(r, sub(r.handL, mid(r))), handR: r => inChest(r, sub(r.handR, mid(r))) };
  const paths = Object.fromEntries(Object.entries(act).filter(([k]) => !held[k]).map(([k, fn]) => [k, rows.map(r => fn(r).map(v => v / scale))]));
  return { frames: C.frames, moves, stride: travel / leg, steps: stepsOf(C, rows), size, paths, accel: Object.fromEntries(Object.entries(parts).map(([k, P]) => [k, accel(P) / scale])), bounce: (pct(z, 0.95) - pct(z, 0.05)) / leg };
}
// B's act against A's (its adult, on the same figure): { shape (the weighted share of the motion the other does not explain), cm
// (the part that differs most, rms at its weight), part, c (the correlation the share says) }
const sampleAt = (P, t) => { const i = Math.min(P.length - 1, Math.floor(t)), w = t - i, q = P[Math.min(P.length - 1, i + 1)]; return P[i].map((v, j) => v + (q[j] - v) * w); };
const centred = P => { const m = mean(P); return P.map(p => sub(p, m)); }, rms = P => Math.sqrt(P.reduce((x, p) => x + dot(p, p), 0) / P.length);
// the best clock: both paths on N frames, then the cheapest way through their frame-to-frame distances in steps of one frame of
// each, or one against two (between half and twice the speed), ends on ends
const CLOCK_N = 120;
function clock(U, V) {
  const n = CLOCK_N, D = Array.from({ length: n }, () => new Float64Array(n).fill(Infinity)), B = Array.from({ length: n }, () => new Int8Array(n)), d = (i, j) => U.reduce((x, u, k) => { for (let q = 0; q < 3; q++) x += (u[i][q] - V[k][j][q]) ** 2; return x; }, 0);
  D[0][0] = d(0, 0);
  for (let i = 1; i < n; i++) for (let j = Math.max(1, i >> 1); j <= Math.min(n - 1, 2 * i); j++) {
    const c = d(i, j), o = [D[i - 1][j - 1] + 2 * c, i > 1 ? D[i - 2][j - 1] + 3 * c : Infinity, j > 1 ? D[i - 1][j - 2] + 3 * c : Infinity], b = o.indexOf(Math.min(...o));
    D[i][j] = o[b]; B[i][j] = b;
  }
  const path = []; for (let i = n - 1, j = n - 1; ;) { path.push([i, j]); if (!i && !j) break; const b = B[i][j]; if (b === 0) { i--; j--; } else if (b === 1) { i -= 2; j--; } else { i--; j -= 2; } }
  return path.reverse();
}
export function shapeAgainst(A, B) {
  const on = (P, m = CLOCK_N) => Array.from({ length: m }, (_, i) => sampleAt(P, i * (P.length - 1) / (m - 1)));
  let parts = Object.keys(A.paths).filter(n => B.paths[n]).map(n => { const a = on(A.paths[n]), b = on(B.paths[n]), ca = centred(a), cb = centred(b); return { n, a: ca, b: cb, sa: rms(ca), sb: rms(cb) }; });
  parts = parts.filter(p => 100 * Math.max(p.sa, p.sb) >= SHAPE_CM);
  if (!parts.length) return { shape: 0, cm: 0, part: 'no part moves', c: 1 };
  const unit = (P, s, w) => P.map(p => p.map(v => v / Math.max(s, 1e-9) * w)), W = p => Math.max(p.sa, p.sb);
  const path = clock(parts.map(p => unit(p.a, p.sa, W(p))), parts.map(p => unit(p.b, p.sb, W(p))));
  let R = 0, T = 0, worst = 0, part = parts[0].n;
  for (const p of parts) {
    const a = centred(path.map(([i]) => p.a[i])), b = centred(path.map(([, j]) => p.b[j])), sa = rms(a), sb = rms(b), w = W(p);
    const c = sa > 1e-9 && sb > 1e-9 ? a.reduce((x, q, i) => x + dot(q, b[i]), 0) / a.length / (sa * sb) : 0, r = w * Math.sqrt(Math.max(0, 1 - Math.max(0, c) ** 2));
    R += r * r; T += w * w; if (r > worst) { worst = r; part = p.n; }
  }
  const shape = Math.sqrt(R / T);
  return { shape, cm: 100 * worst, part, c: Math.sqrt(Math.max(0, 1 - shape ** 2)) };
}
// a body's clip against the adult's: [{ n: measure, v, lo, hi, ok }] (near: A is the nearest adult clip, not a twin; on: the adult's
// clip on this body's own figure, for the shape)
export function lifeAgainst(body, A, B, { near = false, on = A } = {}) {
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
  const s = shapeAgainst(on, B); put('shape', s.shape, `${s.part} ${s.cm.toFixed(1)} cm`, s.shape >= SHAPE_REL && s.cm >= SHAPE_CM);
  return out;
}
const want = r => (r.lo > 0 ? `>= ${+r.lo.toFixed(2)}` : `<= ${r.hi}`);
export const lifeFails = (body, A, B, o) => lifeAgainst(body, A, B, o).filter(r => !r.ok).map(r => `body: ${body}'s ${r.n}${r.why ? ` (${r.why})` : ''} is ${r.v} of the adult's (${want(r)}${r.n === 'shape' ? `, and ${SHAPE_CM} cm` : ''})`);

// ------------------------------------------------------------------ a hold is never a freeze
// A figure that stops dead reads as a paused film, not a still person (REVIEW-2: Idle_Kneel frozen 176 frames, Idle_Sad
// 315). In every STILL_F frames (2 s) some part (the head, a hand, the hips) moves at least STILL_CM within STILL_IN frames
// (half a second): a drift slower than that reads as a still picture, not as breathing. STILL_CM 2.0 was set before any clip was
// measured with it; it was raised to 2.8 after measuring (2.0 passes the old kneel a review saw still for 62 frames, 2.48 cm) and put
// back to 2.0, also after measuring (Studio 25/11). The first version of this check had 1.0. So: what it cannot see is a hold
// between 2 and 2.8 cm that a viewer calls still, and a slow loop of one sway, alive by this number and dull to watch
export const STILL_F = 60, STILL_IN = 15, STILL_CM = 2.0;
export function stillSpans(rows) {
  const P = ['head', 'handL', 'handR', 'pelvis'], v = [];
  for (let f = 0; f + STILL_IN < rows.length; f++) v.push(100 * Math.max(...P.map(p => Math.hypot(...sub(rows[f + STILL_IN][p], rows[f][p])))));
  const out = []; for (let a = 0; a + STILL_F - STILL_IN <= v.length; a++) { const m = Math.max(...v.slice(a, a + STILL_F - STILL_IN)); if (m < STILL_CM) out.push([a, +m.toFixed(2)]); }
  return out;
}

// ------------------------------------------------------------------ the face is seen
// A clip a film cuts to for its feeling shows its face to a lens in front at eye height. Off front (the head's look turned more than
// FACE_YAW from where the clip opens, the eyes gone round the side) or down (more than FACE_DOWN under level) it is hidden. FACE_YAW
// 40 (as before). FACE_DOWN 60 by the same measure: an eye sits 22 deg out on the face, so at 40 deg of turn the far one is seen at
// 62 deg, cos 0.47; a face looking down puts both there at cos d x cos 22 = 0.47, d = 60. [share off front, share hidden either way]
// allowed, and a limit on every frame's look down where the clip has one: SadWalk 35 (Studio 25/11: 70 deg down, the face never
// seen). A quarter for a fright that looks both ways, a cry's wiping hand and a slump that bows (FACE_AWAY). What it cannot see: a
// rim, a fringe or a hand over the face, or whether the face it can see is acting
// (SadWalk, RunTired and Idle_Sad are not in the library now; their marks stay as they were, for when one is made again)
export const FACE_YAW = 40, FACE_DOWN = 60, FACE_AWAY = 0.25;
export const FACE_SEEN = { Gest_SitTalk_Loop: [0, 0], Gest_SitClap_Loop: [0, 0], Gest_PhoneTalk_Loop: [0, 0], Move_RunTired_Once: [0, 0], Idle_Sad_Loop: [0, 0], Move_SadWalk_Fwd_Loop: [0, 0, 35],
  React_Defeated_Once: [0, FACE_AWAY], React_Terrified_Once: [FACE_AWAY, FACE_AWAY], React_Cry_Loop: [FACE_AWAY, FACE_AWAY] };
export function faceHidden(clip, rows) {
  const L = FACE_SEEN[clip]; if (!L) return [];
  const off = rows.map(r => Math.abs(((r.yaw - rows[0].yaw + 540) % 360) - 180) > FACE_YAW), n = rows.length, out = [];
  const share = a => a.filter(Boolean).length / n, pct100 = x => `${(100 * x).toFixed(0)} %`, y = share(off), any = share(rows.map((r, i) => off[i] || r.down > FACE_DOWN)), low = Math.max(...rows.map(r => r.down));
  if (y > L[0]) out.push(`face: turned over ${FACE_YAW} deg off front on ${pct100(y)} of its frames (max ${pct100(L[0])})`);
  if (any > L[1]) out.push(`face: hidden (off front, or looking over ${FACE_DOWN} deg down) on ${pct100(any)} of its frames (max ${pct100(L[1])})`);
  if (L[2] && low > L[2]) out.push(`face: looks ${low.toFixed(0)} deg down (max ${L[2]} on every frame)`);
  return out;
}
