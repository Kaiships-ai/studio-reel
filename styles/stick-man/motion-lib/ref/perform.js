// A capture played the way one body plays it, before it goes onto the rig (ref/mocap.js mocapCycle): the same table of
// joints, its arms' reach scaled and its clock bent by the body's own numbers (bodies.js `life`). One capture on five
// bodies at one clock and one size reads as one person in five costumes (Kai 25/11). Everything here works on a
// capture's frames and returns a capture; the adult's numbers change nothing.
//   ownSource   the arms' reach, then the clock: slower or quicker, held longer or shorter where the body is still, slow
//               into and out of a move, hesitating as a move leaves a hold, and never faster than a real hand or limb (the
//               cap); then the shape (bodies.js perform): a one-off runs on to settle, and the arms follow the chest as
//               springs do (armLag: drag, overshoot, settle), so a body's hands drag and settle their own way (how little that changes the act: tools/gates/bodylife.mjs shape)
//   follow      a channel following what drives it as a spring does (the trunk and head channels use it too, base.js)
//   cutSource   a span of a long capture; loopSource a span closed into a loop; clapSource a clap that opens wide and meets
const DEG = 180 / Math.PI, V = (a, b) => [b[0] - a[0], b[1] - a[1], b[2] - a[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const add = (a, b) => a.map((v, i) => v + b[i]), mul = (a, k) => a.map(v => v * k), len = a => Math.hypot(...a), nrm = a => mul(a, 1 / (len(a) || 1)), mix = (a, b, w) => a.map((v, i) => v + (b[i] - v) * w);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const isDir = n => /_[fu]$/.test(n), ease3 = w => (w = Math.max(0, Math.min(1, w)), w * w * (3 - 2 * w));
const each = (f, fn) => Object.fromEntries(Object.entries(f).map(([n, p]) => [n, fn(p, n)]));
const blend = (a, b, w) => each(a, (p, n) => (isDir(n) ? nrm(mix(p, b[n], w)) : mix(p, b[n], w)));
const ARMS = ['Left', 'Right'].map(s => [s + 'Arm', s + 'ForeArm', s + 'Hand']);
const LIMBS = [...ARMS, ...['Left', 'Right'].map(s => [s + 'UpLeg', s + 'Leg', s + 'Foot'])];
const turnOf = (u, v) => Math.acos(Math.max(-1, Math.min(1, dot(nrm(u), nrm(v))))) * DEG;

export const cutSource = (src, a, b) => ({ ...src, frames: src.frames.slice(a, b + 1) });
// frames a..b closed into a loop: the last `x` frames run over into the x frames that lead to frame a
export const loopSource = (src, a, b, x = 14) => ({ ...src, frames: src.frames.slice(a, b + 1).map((f, i, F) => { const j = i - (F.length - 1 - x); return j <= 0 ? f : blend(f, src.frames[a - x + j], ease3(j / x)); }) });

// ------------------------------------------------------------ the chest's frame (the arms turn and reach in it)
const chest = f => { const u = nrm(f.Spine2_u), fw = nrm(add(f.Spine2_f, mul(u, -dot(f.Spine2_f, u)))); return { f: fw, u, l: cross(u, fw) }; };
const toC = (C, v) => [dot(v, C.f), dot(v, C.l), dot(v, C.u)], fromC = (C, v) => add(add(mul(C.f, v[0]), mul(C.l, v[1])), mul(C.u, v[2]));
// a direction turned `k` times as far from `ref` as `d` is (k > 1 past it)
const reach = (ref, d, k) => { const a = turnOf(ref, d) / DEG; if (a < 1e-6) return d; const t = nrm(add(d, mul(ref, -dot(ref, d)))), x = Math.min(a * k, Math.PI * 0.9); return add(mul(ref, Math.cos(x)), mul(t, Math.sin(x))); };
// the arms' reach round their resting place (the first frame's, or a loop's mean): each bone of the arm turned k times as far
export function reachSource(src, k, { loop = false } = {}) {
  if (Math.abs(k - 1) < 1e-9) return src;
  const D = src.frames.map(f => { const C = chest(f); return ARMS.map(([s, e, h]) => [toC(C, nrm(V(f[s], f[e]))), toC(C, nrm(V(f[e], f[h])))]); });
  const ref = ARMS.map((_, a) => [0, 1].map(b => (loop ? nrm(D.map(d => d[a][b]).reduce(add)) : D[0][a][b])));
  return { ...src, frames: src.frames.map((f, i) => { const C = chest(f), g = { ...f };
    ARMS.forEach(([s, e, h], a) => { const [l1, l2] = [len(V(f[s], f[e])), len(V(f[e], f[h]))];
      g[e] = add(g[s], mul(fromC(C, reach(ref[a][0], D[i][a][0], k)), l1)); g[h] = add(g[e], mul(fromC(C, reach(ref[a][1], D[i][a][1], k)), l2)); });
    return g; }) };
}

// ------------------------------------------------------------ the clock
// between captured frames: a smooth curve through them (straight lines kink at every one)
const at = (F, t, wrap) => { const n = F.length, i = Math.min(Math.floor(t), n - 1), w = t - i, g = j => F[wrap ? ((j % (n - 1)) + n - 1) % (n - 1) : Math.max(0, Math.min(n - 1, j))];
  if (w < 1e-9) return F[i];
  const [p0, p1, p2, p3] = [g(i - 1), F[i], F[Math.min(i + 1, n - 1)], g(i + 2)];
  return each(p1, (_, n2) => { const v = p1[n2].map((b, q) => { const a = p0[n2][q], c = p2[n2][q], d = p3[n2][q]; return b + 0.5 * w * (c - a + w * (2 * a - 5 * b + 4 * c - d + w * (3 * (b - c) + d - a))); }); return isDir(n2) ? nrm(v) : v; }); };
const smooth = (v, r) => v.map((_, i) => { let s = 0, w = 0; for (let d = -r; d <= r; d++) { const j = Math.max(0, Math.min(v.length - 1, i + d)), k = r + 1 - Math.abs(d); s += k * v[j]; w += k; } return s / w; });
const widest = (v, r) => v.map((_, i) => Math.max(...v.slice(Math.max(0, i - r), i + r + 1)));
// no hand faster than HAND_MAX metres a frame (8 cm: 2.4 m/s, a quick gesture) and no limb bone or bend faster than LIMB_MAX deg a
// frame, on the clock the clip plays
export const HAND_MAX = 0.08, LIMB_MAX = 16;
const HES_HOLD = 8, HES_W = 4;
export function retime(src, { rate = 1, hold = 0, drag = 0, hesitate = 0, cap = true, to = null, hand = HAND_MAX, limb = LIMB_MAX } = {}) {
  let F = src.frames;
  const n = F.length - 1, mid = i => mul(add(F[i].LeftUpLeg, F[i].RightUpLeg), 0.5);
  const rel = (i, j) => Math.max(...['LeftHand', 'RightHand', 'Head'].map(p => len(V(V(mid(i), F[i][p]), V(mid(j), F[j][p])))));
  const v = Array.from({ length: n }, (_, i) => rel(i, i + 1)), top = [...v].sort((a, b) => a - b)[Math.floor(0.9 * (n - 1))] || 1;
  const e = smooth(v.map(x => Math.min(1, x / Math.max(top, 1e-4))), 3), de = e.map((_, i) => Math.abs((e[Math.min(n - 1, i + 2)] - e[Math.max(0, i - 2)]) / 4)), dm = Math.max(1e-6, ...de);
  let d = e.map((x, i) => rate * (1 + hold * (1 - x)) + drag * de[i] / dm);
  // hesitate: where a move leaves a hold (the energy rises through 0.35 after HES_HOLD frames under 0.3), the frames round its
  // start take `hesitate` frames longer between them (a raised-cosine share over HES_W each side): it starts, hangs, goes
  if (hesitate) for (let i = HES_HOLD; i < n; i++) if (e[i] >= 0.35 && e[i - 1] < 0.35 && Math.max(...e.slice(i - HES_HOLD, i)) < 0.3) {
    const w = Array.from({ length: 2 * HES_W + 1 }, (_, j) => 0.5 - 0.5 * Math.cos(Math.PI * 2 * (j + 1) / (2 * HES_W + 2))), sw = w.reduce((a, b) => a + b, 0);
    w.forEach((x, j) => { const q = i - HES_W + j; if (q >= 0 && q < n) d[q] += hesitate * x / sw; });
  }
  if (to) { const k = to / d.reduce((a, b) => a + b, 0); d = d.map(x => x * k); }
  if (cap && !to) {
    const need = Array.from({ length: n }, (_, i) => { const a = F[i], b = F[i + 1];
      return Math.max(...['LeftHand', 'RightHand'].map(p => len(V(a[p], b[p])) / hand), ...LIMBS.flatMap(([s, m, h]) => { const ua = V(a[s], a[m]), fa = V(a[m], a[h]), ub = V(b[s], b[m]), fb = V(b[m], b[h]);
        return [turnOf(ua, ub), turnOf(fa, fb), Math.abs(turnOf(ua, fa) - turnOf(ub, fb))].map(x => x / limb); })); });
    const k = smooth(widest(need.map((x, i) => Math.max(1, x / d[i])), 2), 2); d = d.map((x, i) => x * k[i]);
  }
  const T = [0]; for (const x of d) T.push(T[T.length - 1] + x);
  const M = Math.max(2, Math.round(T[n])), same = F.length > 2 && Object.keys(F[0]).every(q => len(V(F[0][q], F[n][q])) < 1e-3), out = [];
  for (let m = 0, i = 0; m <= M; m++) { const t = m * T[n] / M; while (i < n - 1 && T[i + 1] < t) i++; out.push(at(F, Math.min(n, i + (t - T[i]) / (T[i + 1] - T[i])), same)); }
  return { ...src, frames: out };
}
// ------------------------------------------------------------ the shape: parts that follow (bodies.js perform)
// a channel x (one value a frame) followed by a damped spring [hz, damp] at 30 fps: the part lags what drives it and, with
// damp under 1, carries past a stop and swings back. A loop (its last frame repeats its first) runs three laps and keeps
// the last, so it closes on itself
export function follow(x, [hz, damp], loop = false) {
  const n = x.length, P = loop ? n - 1 : n, w = 2 * Math.PI * hz, SUB = 4, h = 1 / 30 / SUB, out = new Array(n);
  if (n < 2 || P < 1) return [...x];
  let y = x[0], v = 0;
  for (let lap = 0; lap < (loop ? 3 : 1); lap++) for (let i = 0; i < P; i++) {
    const a = x[(i - 1 + P) % P], b = x[i];
    for (let k = 1; k <= SUB; k++) { const xi = (i || loop) ? a + (b - a) * k / SUB : b; v += (w * w * (xi - y) - 2 * damp * w * v) * h; y += v * h; }
    out[i] = y;
  }
  if (loop) out[n - 1] = out[0]; else if (P < n) out[n - 1] = out[n - 2];
  return out;
}
// the arms following the chest: each hand's place against its shoulder, in the chest's frame, followed (follow), and the arm
// turned onto that line at the captured hand's distance (its bones' lengths and the elbow's bend kept, the elbow on the side
// the capture bent it): the hand drags and swings past, the elbow never locks straight on an overshoot (it did, and the
// capture's elbow roll, faded out as an arm straightens, swung the forearm round). (Followed as bone directions, a forearm
// turning fast went through a near-zero vector and snapped: 32 cm a frame, the thin body's SitDisbelief)
export function armLag(src, lag, { loop = false } = {}) {
  if (!lag) return src;
  const F = src.frames, H = F.map(f => { const C = chest(f); return ARMS.map(([s, , h]) => toC(C, V(f[s], f[h]))); });
  const G = ARMS.map((_, a) => { const c = [0, 1, 2].map(q => follow(H.map(x => x[a][q]), lag, loop)); return F.map((_, i) => c.map(x => x[i])); });
  return { ...src, frames: F.map((f, i) => { const C = chest(f), g = { ...f };
    ARMS.forEach(([s, e, h], a) => { const r = len(V(f[s], f[h])), q = fromC(C, G[a][i]), l = len(q); if (l > 1e-6) [g[e], g[h]] = reachTurned(f[s], f[e], f[h], add(f[s], mul(q, r / l))); });
    return g; }) };
}
// a body's own way through a capture: L = its life (bodies.js), P its perform; opts.arm: how much of its reach goes on (a hand
// that has to meet something keeps the capture's: 0); size: the act's own reach on every body; settle: the frames a one-off
// runs on (default the body's); lag: false keeps the arms as captured (a clap whose hands must meet)
export function ownSource(src, L, { loop = false, arm = 1, size = 1, P = {}, settle = P.settle ?? 0, lag = true, ...clock } = {}) {
  const s = reachSource(src, size * (1 + (L.arm - 1) * arm), { loop });
  let r = retime(s, { rate: L.rate, hold: L.hold, drag: L.drag, hesitate: P.hesitate ?? 0, hand: HAND_MAX * (L.top ?? 1), limb: LIMB_MAX * (L.top ?? 1), ...clock });
  if (!loop && settle) r = { ...r, frames: [...r.frames, ...Array(settle).fill(r.frames[r.frames.length - 1])] };
  r = lag && P.arms ? armLag(r, P.arms, { loop }) : r;
  // where a hand comes to the face (within LEAN_AT of the captured head, fully at LEAN_AT - LEAN_W): base.js ownFrames leans the
  // body in by perform.leanIn to meet it
  return P.leanIn ? { ...r, lean: r.frames.map(f => Math.max(...['LeftHand', 'RightHand'].map(h => ease3((LEAN_AT - len(V(f.Head, f[h]))) / LEAN_W)))) } : r;
}
const LEAN_AT = 0.40, LEAN_W = 0.10;

// ------------------------------------------------------------ a capture set right for this kit
// a two-bone arm reaching T, the elbow on the side it was bent to
// (reachTurned: the captured arm's bend plane turned with the shoulder-to-hand line onto the new one, so a target off the
// captured line never swings the elbow round: reach2's plane, taken from the captured elbow against the new line, flipped
// 100 deg in a frame when that elbow lay near it, and the hand jumped 21 cm, the thin body's SitDisbelief)
const reachTurned = (S, E, H, T) => {
  const l1 = len(V(S, E)), l2 = len(V(E, H)), d = V(S, T), L = Math.max(1e-6, Math.min(len(d), l1 + l2 - 1e-4)), dn = nrm(d), dh = nrm(V(S, H)), pe = V(S, E);
  let b = add(pe, mul(dh, -dot(pe, dh))); if (len(b) < 1e-6) b = cross(dh, [0, 0, 1]); b = nrm(b);
  const ax = cross(dh, dn), sn = len(ax), cs = dot(dh, dn); if (sn > 1e-9) { const k = mul(ax, 1 / sn); b = add(add(mul(b, cs), mul(cross(k, b), sn)), mul(k, dot(k, b) * (1 - cs))); }
  b = nrm(add(b, mul(dn, -dot(b, dn))));
  const a = (l1 * l1 - l2 * l2 + L * L) / (2 * L), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)); return [add(add(S, mul(dn, a)), mul(b, h)), add(S, mul(dn, L))];
};
const reach2 = (S, E, H, T) => { const l1 = len(V(S, E)), l2 = len(V(E, H)), d = V(S, T), L = Math.max(1e-6, Math.min(len(d), l1 + l2 - 1e-4)), dn = nrm(d);
  const a = (l1 * l1 - l2 * l2 + L * L) / (2 * L), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)), pe = V(S, E), pp = nrm(add(pe, mul(dn, -dot(pe, dn)))); return [add(add(S, mul(dn, a)), mul(pp, h)), add(S, mul(dn, L))]; };
// a clap: between two meetings the hands open `open` times as wide, every meeting at `meet` metres apart (the captured
// hands stop 9-13 cm apart, a palm's width, on frames that miss the contact), `up` metres higher. Both hands open and
// close the same way round one place in front of the chest (the meeting point's side-to-side place held at its mean over
// the capture): the captured right hand did most of the work, and from a three-quarter front the clap read as one hand
// flapping (REVIEW-2)
export function clapSource(src, { open = 1, meet = 0.1, up = 0 } = {}) {
  const F = src.frames, sep = F.map(f => Math.abs(dot(V(f.LeftHand, f.RightHand), chest(f).l)));
  const lows = sep.map((_, i) => i).filter(i => sep[i] < 0.16 && sep.slice(Math.max(0, i - 3), i + 4).every(x => x >= sep[i] - 1e-9));
  const low = i => { const a = lows.findLast(j => j <= i), b = lows.find(j => j > i); return a == null ? sep[b] : b == null ? sep[a] : sep[a] + (sep[b] - sep[a]) * (i - a) / (b - a); };
  const side = f => dot(V(f.Hips, mul(add(f.LeftHand, f.RightHand), 0.5)), chest(f).l), mid = F.reduce((a, f) => a + side(f), 0) / F.length;
  return { ...src, frames: F.map((f, i) => { const C = chest(f), m = add(mul(add(f.LeftHand, f.RightHand), 0.5), mul(C.l, mid - side(f))), h = Math.max(0, sep[i] - low(i)) * open + meet, sg = Math.sign(dot(V(f.RightHand, f.LeftHand), C.l)) || 1, g = { ...f };
    for (const [[s, e, hd], k] of [[ARMS[0], sg], [ARMS[1], -sg]]) { const along = dot(V(m, f[hd]), C.l), T = add(add(f[hd], mul(C.l, k * h / 2 - along)), mul(C.u, up)); [g[e], g[hd]] = reach2(f[s], f[e], f[hd], T); }
    return g; }) };
}
