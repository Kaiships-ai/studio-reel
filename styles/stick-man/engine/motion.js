// Motion v2: characters animated pose to pose from keys, the way an animator works, with the 12 principles built into
// how the keys are played back. Reel data, per act:  anim: { eng: [key, key, ...], ... }  (cast.js S.pose2 draws a pose)
//
//   key = { f | at (beat ref), pose: 'name' | {...}, ...overrides, ease, hold, antic, expr, look, props }
//   pose  joint-space values (cast.js S.pose2): pos [x, y] (Blender m), yaw, bob, hip, pelvis, spine, sq, neck, headSq,
//         armL/armR, legL/legR (foot in the figure frame W, or footW = [x, y, z] Blender m: planted, never slides), props
//   ease  how the motion leaves and enters this key: 'slow' (slow in and out, the default: an extreme), 'flow' (passes
//         through at speed: a breakdown), 'out' (slow out only), 'in' (slow in only), 'snap' (no in-between: a cut)
//   hold  frames the pose is held (a moving hold: the secondary layer keeps it breathing)
//   antic share of the move (0..0.6) played backwards first; the move itself then takes the last 40 % of the gap (4 f at least)
//   cycle secondary business on top until the next key: { 'spine.bend': [amplitude, period frames, phase], ... }
//
// Playback, per channel: cubic Hermite through the keys (arcs: every joint swings on a curve, no straight lerps), the
// time between two keys warped by their ease (slow in / slow out); extremes get flat tangents (no overshoot from the
// curve itself). Then the secondary layer, run straight ahead from the act's first frame: springs drag the head, arms
// and hat behind the body (overlapping action), overshoot and settle when it stops (follow-through), the hip's vertical
// speed stretches the body and a landing squashes it (squash and stretch, volume kept), and a held pose breathes.
// the kit's named poses (a film adds its own: act `poses`, or import this and assign)
import { PHYS } from './body.js';
export const MOTION_POSES = {};
// the style dials: how far this film bends each of the 12 principles, 0 = toward live simulation, 1 = toward stylised
// animation, 0.5 = the kit as authored (a reel without `style` plays exactly as before). The body's physics (rig B1-B6)
// is the floor under all of them: a dial bends the performance, never the anatomy.
export const STYLE = { exaggeration: 0.5, timing: 0.5, squash: 0.5, anticipation: 0.5, followThrough: 0.5, slowInOut: 0.5, arcs: 0.5, secondary: 0.5 };
// named doses. kaiships: the dose Kai chose for the stick-man films (stage 2 · 2.0b, 2026-11-12): strong exaggeration for
// a phone screen, smooth on ones, crisp ends, a clean frame. real / verse: the two ends it was compared against.
export const STYLE_PRESETS = {
  kaiships: { exaggeration: 0.75, timing: 0.60, squash: 0.50, anticipation: 0.70, followThrough: 0.55, slowInOut: 0.45, arcs: 0.70, secondary: 0.35 },
  real: { exaggeration: 0.05, timing: 0.15, squash: 0.10, anticipation: 0.30, followThrough: 0.50, slowInOut: 0.60, arcs: 0.50, secondary: 0.80 },
  verse: { exaggeration: 0.95, timing: 0.90, squash: 0.60, anticipation: 0.70, followThrough: 0.50, slowInOut: 0.30, arcs: 0.70, secondary: 0.20 },
};
// an act's `style`: a preset name, an object of dials over the kit default, or nothing (the global STYLE)
export const resolveStyle = st => ({ ...STYLE, ...(typeof st === 'string' ? STYLE_PRESETS[st] || {} : st || {}) });
let CUR = STYLE;                                                       // the dials of the track being compiled / played
const dial = (k, lo = 0, hi = 2) => Math.max(lo, Math.min(hi, 2 * CUR[k]));
// gravity (rig B6): once a body leaves the ground nothing but gravity moves its centre, so between the first airborne
// key and the landing key the height follows a parabola with g = 9.8 m/s2 and the travel a straight line at constant
// speed, whatever keys an animator put in between. The time in the air is the animator's; the height it allows is not.
export const G = 9.8, FPS = 30;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// ---------------------------------------------------------------- poses as flat channel maps
// nested pose objects <-> flat maps ('armR.raise' -> 40); arrays index as 'legL.foot.0'
export function flatten(o, pre = '', out = {}) {
  for (const [k, v] of Object.entries(o || {})) {
    const n = pre ? `${pre}.${k}` : k;
    if (typeof v === 'number') out[n] = v;
    else if (Array.isArray(v)) v.forEach((x, i) => { if (typeof x === 'number') out[`${n}.${i}`] = x; });
    else if (v && typeof v === 'object') flatten(v, n, out);
  }
  return out;
}
export function unflatten(m) {
  const o = {};
  for (const [k, v] of Object.entries(m)) {
    const p = k.split('.'); let c = o;
    for (let i = 0; i < p.length - 1; i++) { const nx = /^\d+$/.test(p[i + 1]); c = c[p[i]] ??= nx ? [] : {}; }
    c[p[p.length - 1]] = v;
  }
  return o;
}
const DISCRETE = new Set(['expr', 'look', 'props', 'ik']);
const NON_POSE = new Set(['f', 'at', 'pose', 'ease', 'hold', 'antic', 'expr', 'look', 'props', 'cycle', 'line', 'on', 'offset', 'nth', 'cue', 'snap']);

// ---------------------------------------------------------------- the time warp between two keys
// cubic Hermite in time: e(0) = 0, e(1) = 1, start slope a, end slope b (0 = a full slow, 1 = passing through)
const warp = (s, a, b) => { const s2 = s * s, s3 = s2 * s; return (s3 - 2 * s2 + s) * a + (-2 * s3 + 3 * s2) + (s3 - s2) * b; };
const leaves = e => (e === 'flow' || e === 'in' ? 1 : 0), enters = e => (e === 'flow' || e === 'out' ? 1 : 0);

// ---------------------------------------------------------------- compile one actor's keys
// keys: resolved frames, sorted; poses: name -> pose object (the film's own, then the kit's)
export function compileTrack(keys, poses, base, style) {
  CUR = resolveStyle(style);
  const ks = keys.map(k => {
    const named = typeof k.pose === 'string' ? poses[k.pose] : k.pose;
    if (typeof k.pose === 'string' && !named) throw new Error(`anim: unknown pose "${k.pose}"`);
    const over = Object.fromEntries(Object.entries(k).filter(([n]) => !NON_POSE.has(n)));
    return { f: k.f, ease: k.ease || 'slow', hold: k.hold || 0, antic: Math.min(0.6, (k.antic || 0) * dial('anticipation')), expr: k.expr, look: k.look, props: k.props, cycle: k.cycle,
      m: { ...flatten(named), ...flatten(over) } };
  }).sort((a, b) => a.f - b.f);
  // carry every channel forward (a key names only what changes); before its first key a channel is neutral (0), except
  // a planted foot or an ik target, which waits where it is first put
  const first = { ...flatten(base) };
  for (const k of ks) for (const [n, v] of Object.entries(k.m)) if (!(n in first)) first[n] = /footW|\.ik\./.test(n) ? v : 0;
  let cur = { ...first };
  for (const k of ks) { cur = { ...cur, ...k.m }; k.m = cur; }
  // holds become a second key with the same pose; anticipation becomes a key before the move, against it
  const out = [];
  for (let i = 0; i < ks.length; i++) {
    const k = ks[i], prev = out[out.length - 1];
    if (k.antic && prev) {
      const gap = k.f - prev.f, fa = Math.round(k.f - Math.max(4, gap * 0.4));   // the action itself keeps at least 4 frames
      if (fa > prev.f + 2) {
        const m = {}; for (const n of Object.keys(k.m)) m[n] = n.startsWith('pos.') || n === 'yaw' ? prev.m[n] : prev.m[n] - k.antic * (k.m[n] - prev.m[n]);
        out.push({ f: fa, ease: 'slow', m, antic: true });
      }
    }
    out.push(k);
    if (k.hold) out.push({ ...k, f: k.f + k.hold, hold: 0, antic: 0, expr: undefined, look: undefined, held: true });
  }
  out.style = CUR;
  // flights: a run of keys off the ground (pos.2 > 2 cm), from the key before it (on the ground) to the next key on the ground
  out.flights = [];
  for (let i = 0; i < out.length; i++) {
    if (!((out[i].m['pos.2'] || 0) > 0.02) || (i && (out[i - 1].m['pos.2'] || 0) > 0.02)) continue;
    let j = i; while (j < out.length && (out[j].m['pos.2'] || 0) > 0.02) j++;
    if (j >= out.length) break;
    const a = i ? out[i - 1] : out[i], b = out[j];                                  // from the last key on the ground (the push-off)
    out.flights.push({ f0: a.f, f1: b.f, x0: a.m['pos.0'] || 0, y0: a.m['pos.1'] || 0, z0: a.m['pos.2'], x1: b.m['pos.0'] || 0, y1: b.m['pos.1'] || 0, z1: b.m['pos.2'] || 0 });
  }
  return out;
}
// where gravity puts the body at frame f of a flight (Blender m)
export function ballistic(fl, f) {
  const T = (fl.f1 - fl.f0) / FPS, t = (f - fl.f0) / FPS, u = t / T, v0 = (fl.z1 - fl.z0) / T + G * T / 2;
  return [fl.x0 + (fl.x1 - fl.x0) * u, fl.y0 + (fl.y1 - fl.y0) * u, fl.z0 + v0 * t - G * t * t / 2];
}

// ---------------------------------------------------------------- keyed value of every channel at frame f
export function keyed(track, f) {
  CUR = track.style || STYLE;
  const n = track.length;
  if (f <= track[0].f) return { ...track[0].m };
  if (f >= track[n - 1].f) return { ...track[n - 1].m };
  let i = 0; while (i + 1 < n && track[i + 1].f <= f) i++;
  const A = track[i], Bk = track[i + 1];
  if (Bk.ease === 'snap') return { ...A.m };
  const s = (f - A.f) / (Bk.f - A.f), w0 = warp(s, leaves(A.ease), enters(Bk.ease)), u = s + (w0 - s) * dial('slowInOut', 0, 1.6), out = {};
  const P = track[i - 1], N = track[i + 2], df = Bk.f - A.f;
  for (const c of Object.keys(A.m)) {
    const a = A.m[c], b = Bk.m[c];
    // Catmull-Rom tangents (per segment), flat at an extreme: the curve passes through every key without overshooting
    const ta = P ? tangent(P.m[c], a, b, P.f, A.f, Bk.f) * df : 0, tb = N ? tangent(a, b, N.m[c], A.f, Bk.f, N.f) * df : 0;
    const u2 = u * u, u3 = u2 * u;
    out[c] = (2 * u3 - 3 * u2 + 1) * a + (u3 - 2 * u2 + u) * ta + (-2 * u3 + 3 * u2) * b + (u3 - u2) * tb;
  }
  // a hand travelling to an ik target swings up through an arc (15 % of the way it goes), never down a straight rail
  for (const arm of ['armL', 'armR']) {
    const k0 = `${arm}.ik.0`; if (!(k0 in A.m)) continue;
    const d = Math.hypot(...[0, 1, 2].map(i => Bk.m[`${arm}.ik.${i}`] - A.m[`${arm}.ik.${i}`]));
    out[`${arm}.ik.1`] += ARC * dial('arcs') * d * Math.sin(Math.PI * u) * (A.m[`${arm}.ikw`] ?? 1);
  }
  if (PHYS.on && PHYS.gravity !== false) for (const fl of track.flights || []) if (f > fl.f0 && f < fl.f1) { const [x, y, z] = ballistic(fl, f); out['pos.0'] = x; out['pos.1'] = y; out['pos.2'] = z; }
  return out;
}
const ARC = 0.15;
// the channels exaggeration scales: the body's angles and its bob, not where it stands, its feet or its targets
const EXAG = /^(bob|spine\.|neck\.|pelvis\.|arm[LR]\.(raise|swing|elbow|roll)$|hip\.)/;
function tangent(p, c, n, fp, fc, fn) {
  if (p == null || n == null) return 0;
  if ((c - p) * (n - c) <= 0) return 0;                               // an extreme or a hold: flat
  return (n - p) / (fn - fp);
}

// ---------------------------------------------------------------- the secondary layer (straight ahead)
// a damped spring per channel: x'' = w^2 (target - x) - 2 z w x'; per frame, exact enough at w < 1.2 rad/frame
class Spring {
  constructor(w, z) { this.w = w; this.z = z; this.x = null; this.v = 0; }
  step(t) {
    if (this.x == null) { this.x = t; return t; }
    const n = 4, h = 1 / n;
    for (let i = 0; i < n; i++) { const a = this.w * this.w * (t - this.x) - 2 * this.z * this.w * this.v; this.v += a * h; this.x += this.v * h; }
    return this.x;
  }
}
// which channels drag and how loose they are (rad per frame, damping): further from the root = looser
const DRAG = [
  [/^neck\./, 0.55, 0.55], [/^arm[LR]\.(raise|swing)$/, 0.62, 0.5], [/^arm[LR]\.(elbow|roll)$/, 0.5, 0.45], [/^headSq$/, 0.7, 0.35],
];
// runs once per actor over [F0, F1]: returns the posed channel maps, one per frame
export function playActor(track, F0, F1, opt = {}) {
  CUR = track.style || STYLE;
  const springs = {}, hat = { p: new Spring(0.32, 0.28), r: new Spring(0.32, 0.28) }, sq = new Spring(0.6, 0.3);
  const frames = [];
  let prev = null, prev2 = null;
  // a 'snap' key is a cut: the secondary layer starts fresh there (no arm or hat still swinging from the last shot's pose)
  const cuts = new Set(track.filter(t => t.ease === 'snap').map(t => t.f));
  for (let f = F0; f <= F1; f++) {
    if (cuts.has(f)) { for (const sp of Object.values(springs)) { sp.x = null; sp.v = 0; } for (const sp of [hat.p, hat.r, sq]) { sp.x = null; sp.v = 0; } prev = prev2 = null; }
    const k = keyed(track, f);
    // exaggeration: every pose channel pushed further from (or pulled back toward) the act's rest pose
    const E = 0.4 + 1.2 * CUR.exaggeration, rest = track[0].m;
    if (E !== 1) for (const c of Object.keys(k)) if (EXAG.test(c) && c in rest) k[c] = rest[c] + (k[c] - rest[c]) * E;
    // secondary business: the latest key's cycle, faded in over 6 frames
    let ck = null; for (const t of track) if (t.f <= f && !t.held && !t.antic) ck = t;
    if (ck?.cycle) { const w = clamp((f - ck.f) / 6, 0, 1) * dial('secondary'); for (const [c, [amp, per, ph = 0]] of Object.entries(ck.cycle)) k[c] = (k[c] || 0) + w * amp * Math.sin(2 * Math.PI * (f - ck.f) / per + ph); }
    const o = { ...k };
    for (const [c, v] of Object.entries(k)) {
      const d = DRAG.find(([re]) => re.test(c)); if (!d || opt.stiff) continue;
      const sp = (springs[c] ||= new Spring(d[1], d[2])).step(v); o[c] = v + (sp - v) * dial('followThrough');
    }
    // hip vertical speed stretches the body, its sudden stop squashes it; the head follows a beat later
    const by = k.bob ?? 0, vy = prev ? by - (prev.bob ?? 0) : 0, vp = prev && prev2 ? (prev.bob ?? 0) - (prev2.bob ?? 0) : 0, ay = vy - vp;
    const want = clamp(1.0 * Math.abs(vy), 0, 0.10) - (vp < 0 ? clamp(5 * Math.max(0, ay), 0, 0.12) : 0);
    const auto = sq.step(want);
    const SQ = dial('squash'); o.sq = ((k.sq || 0) + auto) * SQ; o.headSq = ((o.headSq || 0) + 0.6 * auto) * SQ;
    // the hat lags the head's swing (nod, tilt, the body's bend under it), then overshoots and settles
    const hp = (k['neck.nod'] || 0) + (k['spine.bend'] || 0) + (k['pelvis.pitch'] || 0), hr = (k['neck.tilt'] || 0) + (k['spine.side'] || 0) + (k['pelvis.roll'] || 0);
    o['hat.pitch'] = clamp(hat.p.step(hp) - hp, -22, 22) * dial('followThrough') + (k['hat.pitch'] || 0);
    o['hat.roll'] = clamp(hat.r.step(hr) - hr, -18, 18) * dial('followThrough') + (k['hat.roll'] || 0);
    // a moving hold: a held pose breathes (chest up and down, the head drifts a little), never freezes
    const t = f / 30;
    const B2 = dial('secondary');
    o['spine.bend'] = (o['spine.bend'] || 0) + 0.8 * B2 * Math.sin(t * 2 * Math.PI * 0.28);
    o['neck.tilt'] = (o['neck.tilt'] || 0) + 0.9 * B2 * Math.sin(t * 2 * Math.PI * 0.17 + 1.3);
    frames.push(o); prev2 = prev; prev = k;
  }
  // timing: a stylised film holds each drawing for 2 frames ("on twos", 12 a second) or 3; a simulation runs on ones
  CUR = track.style || STYLE;                                          // keyed() above may have switched tracks
  const step = CUR.timing >= 0.95 ? 3 : CUR.timing >= 0.7 ? 2 : 1;
  if (step > 1) for (let i = 0; i < frames.length; i++) frames[i] = frames[i - (i % step)];
  return frames;
}

// ---------------------------------------------------------------- from channels to the figure's pose (cast.js S.pose2)
// footW (Blender world, planted) is turned into the figure frame from the frame's own root, so a planted foot stays put
const W_M = 0.60, DEG = Math.PI / 180;
export function toPose(m) {
  const Q = unflatten(m);
  const pos = Q.pos || [0, 0], yaw = (Q.yaw || 0) * DEG;
  for (const s of ['L', 'R']) {
    const G = Q['leg' + s]; if (!G?.footW) continue;
    // Blender world -> figure frame (x right as the camera in front sees it, y up, z forward), W units
    const dx = G.footW[0] - pos[0], dy = G.footW[1] - pos[1], tx = dx, tz = -dy;
    const c = Math.cos(yaw), sn = Math.sin(yaw);
    G.foot = [(tx * c - tz * sn) / W_M, (G.footW[2] || 0) / W_M + 0.022, (tx * sn + tz * c) / W_M];
    delete G.footW;
  }
  return { ...Q, pos: [pos[0], pos[1], Q.pos?.[2] || 0], yaw: Q.yaw || 0 };
}
