// Motion verbs. A verb compiles (once, at load) into channel owners, prop segments and sound cues; every owner is a
// pure function of the absolute frame f, so any frame can be rendered alone. Blender metres, yaw in degrees.
//   channel owners: { chan: 'body' | 'handL' | 'handR' | 'add', start, fade, fn(f, env) }
//   hand targets:   { w: [x,y,z] } world, { l: [u,v,z] } figure-local (W units), { rest: true }, plus optional bend
//   prop segments:  { prop, start, mode: 'rest' | 'hand' | 'fn' | 'bag', ... }
import { W_M, LIMB, legReach } from './cast.js';

export const W = W_M, DEG = Math.PI / 180;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
export const smoother = x => { x = clamp(x, 0, 1); return x * x * x * (x * (x * 6 - 15) + 10); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const lerp3 = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
export const add3 = (a, b) => a.map((x, i) => x + b[i]);
export const angDiff = (a, b) => ((b - a) % 360 + 540) % 360 - 180;
// settle after a stop or an impact: quick dip, one small rebound, gone in ~12 frames
export const settle = d => (d < 0 ? 0 : Math.exp(-d / 3.2) * Math.cos(d * 0.85));
export const fwdB = yaw => [Math.sin(yaw * DEG), -Math.cos(yaw * DEG)];
export const rightB = yaw => [Math.cos(yaw * DEG), Math.sin(yaw * DEG)];
export function toLocal(p, root) {
  const r = [p[0] - root.pos[0], p[1] - root.pos[1], p[2] - root.pos[2]], R = rightB(root.yaw), F = fwdB(root.yaw);
  return [(r[0] * R[0] + r[1] * R[1]) / W, r[2] / W, (r[0] * F[0] + r[1] * F[1]) / W];
}
export function toWorld(l, root) {
  const R = rightB(root.yaw), F = fwdB(root.yaw), u = l[0] * W, z = (l[2] || 0) * W;
  return [root.pos[0] + R[0] * u + F[0] * z, root.pos[1] + R[1] * u + F[1] * z, root.pos[2] + l[1] * W];
}
// integer hash -> [0, 1): the only source of "randomness", so blinks and drift are the same on every run
export function hash(...n) {
  let h = 2166136261 >>> 0;
  for (const x of n) { h ^= (x | 0) + 0x9e3779b9; h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0; h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0; }
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// rest poses (W units, figure-local). Standing arms hang by REST_ARM (FK from the shoulder, see cast.js armFK);
// handL/R here is the same hand position, for verbs that need a number.
export const REST_ARM = { fwd: 3, out: 12, flex: 30 };
export const STAND = { footL: [-0.22, 0.022, 0], footR: [0.22, 0.022, 0], handL: [-0.34, 1.25, 0.24], handR: [0.34, 1.25, 0.24] };
// Walk styles. T = frames per step, L = step length (W), lean = torso forward (deg), arm = upper-arm swing (deg each
// way), elbow = [flex (deg), extra flex as the arm comes forward], ds = a foot's stance share of its cycle (< 0.5 =
// flight; just over 0.5 = the rear foot leaves as the front one lands: with these short stub feet a longer double
// support would straighten the rear leg), lift = swing-foot clearance (W), heel / toe = foot pitch at heel strike / toe-off (deg), hoff = how early
// the heel peels (steps), sway = pelvis shift over the stance foot (W), twist = shoulder counter-rotation (deg).
export const GAIT = {
  stroll: { T: 11, L: 0.92, lean: 5, arm: 40, elbow: [22, 30], ds: 0.54, lift: 0.22, heel: 18, toe: 34, hoff: 0.55, sway: 0.06, twist: 11, out: 10, stanceFlex: [[0, 15], [0.1, 20], [0.45, 5]] },
  walk: { T: 9, L: 0.98, lean: 7, arm: 22, elbow: [26, 26], ds: 0.52, lift: 0.21, heel: 22, toe: 38, hoff: 0.55, sway: 0.045, twist: 8 },
  brisk: { T: 7, L: 1.04, lean: 10, arm: 28, elbow: [34, 26], ds: 0.51, lift: 0.22, heel: 24, toe: 42, hoff: 0.55, sway: 0.04, twist: 10 },
  run: { T: 6, L: 1.45, lean: 17, arm: 40, elbow: [80, 12], ds: 0.38, lift: 0.24, heel: 8, toe: 46, hoff: 0.30, sway: 0.03, twist: 12, run: true },
};
// hand-move easing: a short wind-up the other way, ease out, then (x in 1..1+s) a small overshoot that settles
export const handEase = (x, s = 0.35) => (x < 0 ? 0 : x < 1 ? smoother(x) - 0.25 * Math.sin(Math.PI * x) * (1 - x) ** 2
  : x < 1 + s ? 1 + 0.035 * Math.sin(Math.PI * (x - 1) / s) ** 2 : 1);
export const SIT = { bob: -0.56, pitch: -7, footL: [-0.26, 0.022, 0.72], footR: [0.26, 0.022, 0.70],
  handL: [-0.27, 0.90, 0.48], handR: [0.29, 0.92, 0.50] };

const SIDE = { L: -1, R: 1 };
const restOwner = (chan, start, fade = 9) => ({ chan, start, fade, fn: () => ({ rest: true }) });

// ---------------------------------------------------------------- the verbs
// Each takes (p, st, C): p = beat params with p.at (frame), st = the actor's running state (mutated to the end
// state), C = compile context. Returns { end, owners, segs, cues, active } (active = prop motion windows for the eyes).
export const VERBS = {
  idle(p, st) {
    const owners = [restOwner('handL', p.at, p.fade ?? 10), restOwner('handR', p.at, p.fade ?? 10)];
    st.hold.L = st.hold.R = null;
    return { end: p.at + 10, owners };
  },

  // put a prop in a hand (no grab), hand goes to `to`; off = prop origin relative to the hand in the holder's frame (m)
  hold(p, st, C) {
    const hand = p.hand || 'R', fade = p.fade ?? 10, to = C.target(p.to, st);
    st.hold[hand] = p.prop;
    let off = p.off || [0, -0.02, 0];
    if (p.offW) { const R = rightB(st.yaw), F = fwdB(st.yaw), o = p.offW; off = [o[0] * R[0] + o[1] * R[1], o[2], o[0] * F[0] + o[1] * F[1]]; }
    const segs = [{ prop: p.prop, start: p.at, mode: 'hand', actor: st.name, side: hand, off,
      offFrom: C.lastOff(p.prop), blend: fade, tilt: p.tilt || [0, 0], yaw: p.yaw || 0 }];
    C.setOff(p.prop, segs[0].off);
    const dip = C.bagDip(p.prop);
    const owners = [{ chan: 'hand' + hand, start: p.at, fade, fn: (f, env) => {
      const t = env.resolve(to, f); const d = dip ? dip(f) : 0;
      return { ...t, dv: -d * 0.05, bend: p.bend ?? -0.05 * SIDE[hand] }; } }];
    return { end: p.at + fade, owners, segs };
  },

  reach(p, st, C) {
    const hand = p.hand || 'R', to = C.target(p.to, st), fade = p.dur ?? 9;
    return { end: p.at + fade, owners: [{ chan: 'hand' + hand, start: p.at, fade, fn: (f, env) => env.resolve(to, f) }] };
  },

  lift(p, st, C) {
    const hand = p.hand || 'R', r = 7, tl = p.dur ?? 9, tg = p.at + r, rest = C.rest(p.prop), th = C.thick(p.prop);
    const top = [rest[0], rest[1], rest[2] + th + 0.03];
    const up = p.to ? C.point(p.to) : [top[0] + (p.dx || 0), top[1] + (p.dy || 0), top[2] + (p.up ?? 0.22)];
    st.hold[hand] = p.prop; st.handW[hand] = up;
    const owners = [{ chan: 'hand' + hand, start: p.at, fade: r, fn: f => {
      if (f < tg) return { w: top };
      // grip (a 2-frame press down), then the lift on an arc with a wind-up and a small settle at the top
      const t = f - tg, press = t < 3 ? -0.012 * Math.sin(Math.PI * t / 3) : 0, x = (t - 2) / tl, u = handEase(x), a = Math.sin(Math.PI * clamp(x, 0, 1));
      return { w: [lerp(top[0], up[0], u) - 0.03 * a, lerp(top[1], up[1], u), lerp(top[2], up[2], Math.max(0, u)) + 0.05 * a + press] };
    } }];
    const segs = [{ prop: p.prop, start: tg, mode: 'hand', actor: st.name, side: hand, off: [0, -(0.03 + th), 0], keepRot: true }];
    return { end: tg + tl, owners, segs, cues: [{ f: tg, name: 'cash_lift', strength: 0.4 }],
      active: [{ prop: p.prop, from: p.at, to: tg + tl + 4, by: st.name }] };
  },

  // carry a prop (grab it first if it is not in the hand) over the bag, let go: it falls in, the bag dips and swells
  drop_in(p, st, C) {
    const hand = p.hand || 'R', bag = p.into || 'bag', held = st.hold[hand] === p.prop, th = C.thick(p.prop);
    const r = held ? 0 : 9, carry = p.carry ?? 16, fall = 5;
    const tg = p.at + r, tr = tg + carry, ti = tr + fall;
    const rest = held ? null : C.rest(p.prop);
    const grab = held ? st.handW[hand] : [rest[0], rest[1], rest[2] + th + 0.03];
    const above = 0.13, owners = [
      { chan: 'hand' + hand, start: p.at, fade: held ? 3 : r, fn: (f, env) => {
        if (f < tg) return { w: grab };
        const m = env.mouth(bag), B = [m[0], m[1], m[2] + above];
        // let go: the hand flicks up and back a little (follow-through), then the rest owner takes it down on an arc
        if (f >= tr) { const d = f - tr; return { w: [B[0], B[1], B[2] + 0.05 * Math.sin(Math.PI * Math.min(1, d / 6)) * Math.exp(-d / 8)] }; }
        const x = (f - tg) / carry, u = handEase(x), a = Math.sin(Math.PI * clamp(x, 0, 1));
        return { w: [lerp(grab[0], B[0], u), lerp(grab[1], B[1], u), lerp(grab[2], B[2], clamp(u, 0, 1)) + 0.10 * a] };
      } },
      restOwner('hand' + hand, tr + 2, 10),
    ];
    const segs = [
      { prop: p.prop, start: tg, mode: 'hand', actor: st.name, side: hand, off: [0, -(0.03 + th), 0], keepRot: true },
      { prop: p.prop, start: tr, mode: 'fn', fn: (f, env) => {
        const u = clamp((f - tr) / fall, 0, 1), m = env.mouth(bag);
        return { pos: [m[0], m[1], m[2] + above - 0.03 - th - 0.24 * u * u], spin: 0.6 * u }; } },
      { prop: p.prop, start: ti, mode: 'bag', bag },
    ];
    st.hold[hand] = null; st.handW[hand] = null;
    C.impact(bag, ti, p.strength ?? 0.8);
    return { end: tr + 12, owners, segs,
      cues: [...(held ? [] : [{ f: tg, name: 'cash_grab', strength: 0.3 }]), { f: ti, name: 'bundle_drop', strength: p.strength ?? 0.8 }],
      active: [{ prop: p.prop, from: p.at, to: ti + 2, by: st.name }], impact: ti };
  },

  // push a prop along the counter; on = the hand is already resting on it when the beat starts
  slide(p, st, C) {
    const hand = p.hand || 'R', r = p.on || p.handOn ? 0 : 7, press = 2, dur = p.dur ?? 14;
    const ts = p.at + r + press, te = ts + dur, a = C.rest(p.prop), b = C.point(p.to), th = C.thick(p.prop);
    const r0 = C.restRot(p.prop), r1 = r0 + (p.turn ?? 0.3);
    const pos = f => { const u = smoother((f - ts) / dur); return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), a[2]]; };
    const owners = [
      { chan: 'hand' + hand, start: p.at, fade: r || 1, fn: f => {
        const q = pos(f), dip = f < ts ? 0.012 * smooth((f - p.at - r) / press) : 0.012;
        return { w: [q[0], q[1], q[2] + th + 0.035 - dip], bend: -0.08 * SIDE[hand] }; } },
      restOwner('hand' + hand, te + 3, 10),
    ];
    C.setRest(p.prop, b, r1);
    const segs = [{ prop: p.prop, start: ts, mode: 'fn', fn: f => ({ pos: pos(f), rot: lerp(r0, r1, smoother((f - ts) / dur)) }) },
      { prop: p.prop, start: te, mode: 'rest', pos: b, rot: r1 }];
    if (st.hold[hand] === p.prop) st.hold[hand] = null;
    return { end: te + 12, owners, segs, cues: [{ f: ts, name: 'paper_slide', strength: 0.5 }],
      active: [{ prop: p.prop, from: ts - 2, to: te + 6, by: st.name }] };
  },

  gesture(p, st) {
    const k = p.kind, t0 = p.at, owners = [];
    if (k === 'nod' || k === 'tilt') {
      const hold = p.hold ?? 40, deg = p.deg ?? 9;
      owners.push({ chan: 'add', start: t0, fn: f => {
        const t = f - t0;
        if (k === 'nod') { const e = t >= 0 && t < 16 ? Math.sin(Math.PI * t / 16) : 0; return { head_pitch: 9 * e * Math.abs(Math.sin(Math.PI * t / 8)), head_dv: -0.02 * e }; }
        const e = smoother(t / 6) * (1 - smoother((t - hold) / 10));
        return { head_tilt: deg * e, head_dx: 0.02 * Math.sign(deg) * e };
      } });
      return { end: t0 + (k === 'nod' ? 16 : hold + 10), owners };
    }
    const hand = p.hand || 'R', s = SIDE[hand];
    const spec = {
      // hand targets inside the arm's reach so the elbow stays bent; elbow = which way it points (figure-local)
      finger_wave: { at: [s * 0.52, 2.22, 0.38], amp: [0.07, 0.02], per: 6, n: 4, elbow: [s * 0.4, -1, 0] },
      wave: { at: [s * 0.62, 2.05, 0.15], arc: 0.40, amp: [24, 0], per: 10, n: 3, elbow: [s * 0.8, -0.6, 0] },
      fist_pump: { at: [s * 0.40, 2.62, 0.14], amp: [0, -0.20], per: 8, n: 2, elbow: [s * 0.7, -0.7, 0] },
      shrug: { at: [s * 0.74, 1.80, 0.26], amp: [0, 0.05], per: 18, n: 1, elbow: [s * 0.3, -1, -0.3] },
    }[k];
    if (!spec) throw new Error(`gesture: unknown kind ${k}`);
    const dur = spec.per * spec.n, lead = 8;
    // the hand leads the wave and the forearm trails it: the side-to-side motion is on a small arc, not a line
    owners.push({ chan: 'hand' + hand, start: t0, fade: lead, fn: f => {
      const t = Math.max(0, f - t0 - lead * 0.5), on = t < dur ? 1 : 0, ph = Math.sin(2 * Math.PI * t / spec.per) * on;
      if (spec.arc) { const a = spec.amp[0] * ph * DEG; return { l: [spec.at[0] + s * spec.arc * Math.sin(a), spec.at[1] + spec.arc * Math.cos(a), spec.at[2]], elbow: spec.elbow }; }   // the forearm swings about the elbow
      return { l: [spec.at[0] + spec.amp[0] * ph, spec.at[1] + spec.amp[1] * Math.abs(ph) - 0.03 * ph * ph * on, spec.at[2]], elbow: spec.elbow };
    } });
    if (k === 'shrug') {
      const o = spec.elbow;
      owners.push({ chan: 'hand' + (hand === 'R' ? 'L' : 'R'), start: t0, fade: lead, fn: () => ({ l: [-spec.at[0], spec.at[1], spec.at[2]], elbow: [-o[0], o[1], o[2]] }) });
      owners.push(restOwner('hand' + (hand === 'R' ? 'L' : 'R'), t0 + lead + dur, 12));
    }
    if (st.hold[hand]) throw new Error(`gesture ${k}: ${st.name}'s ${hand} hand is holding ${st.hold[hand]}`);
    owners.push(restOwner('hand' + hand, t0 + lead + dur, 12));
    return { end: t0 + lead + dur + 12, owners };
  },

  // mouth opens on each spoken word of a line (from words.json); a nod-ish head beat on the stressed ones
  talk(p, st, C) {
    const ws = C.words.filter(w => w.line === p.line), fps = C.fps, opens = [];
    for (const w of ws) {
      const a = Math.round(w.t0 * fps) - 1, b = Math.round(w.t1 * fps), n = b - a > 9 ? 2 : 1;
      for (let i = 0; i < n; i++) { const s = a + Math.round((b - a) * i / n), e = s + Math.max(2, Math.round((b - a) / n * 0.6)); opens.push([s, e]); }
    }
    const owners = [{ chan: 'add', start: opens.length ? opens[0][0] : p.at, fn: f => {
      let dv = 0;
      for (const [s, e] of opens) if (f >= s && f < e + 3) dv += -0.014 * Math.sin(Math.PI * (f - s) / (e + 3 - s));
      return { head_dv: dv, head_pitch: dv * 120 };
    } }];
    return { end: opens.length ? opens[opens.length - 1][1] : p.at, owners, mouth: opens };
  },

  look_at(p, st) { return { end: p.at + 3, owners: [], focus: { from: p.at, target: p.target ?? p.to } }; },

  turn_to(p, st, C) {
    const y0 = st.yaw, y1 = p.yaw ?? C.yawTo(st.pos, C.point(p.to ?? p.target)), d = angDiff(y0, y1), T = p.dur ?? 10, pos = st.pos.slice();
    const posture = st.posture;
    st.yaw = y0 + d;
    const owners = [{ chan: 'body', start: p.at, fade: 1, fn: f => turnBody(f, p.at, T, pos, y0, d, posture) }];
    return { end: p.at + T + 8, owners, cues: [{ f: p.at + Math.round(T * 0.5), name: 'step', strength: 0.15 }, { f: p.at + T, name: 'step', strength: 0.15 }] };
  },

  // Phase-driven walk (styles in GAIT): optional stepped turn, weight shift + dip, then per step contact -> down ->
  // passing -> up on planted prints (heel strike, roll, toe-off pivoting on the toe: a stance foot never moves),
  // a closing step and a settle. style: stroll | walk | brisk | run; step (frames) and stride (m) override the
  // style; cheat (deg) turns the figure's plane toward the camera while the feet keep the world path;
  // carry: 'L' | 'R' = that hand is busy (the other arm swings more).
  walk_to(p, st, C) {
    const G = { ...GAIT[p.style || 'walk'], ...(p.gait || {}) }, T = p.step ?? G.T;
    const to = C.point(p.to), from = st.pos.slice(), w = p.width ?? 0.10;
    const dxy = [to[0] - from[0], to[1] - from[1]], D = Math.hypot(...dxy), head = C.yawTo(from, to);
    const posture0 = st.posture, cheat = p.cheat || 0, dTurn = angDiff(st.yaw, head + cheat);
    const Tt = Math.abs(dTurn) > 15 ? (p.turn ?? Math.round(clamp(Math.abs(dTurn) / 7, 8, 12))) : 0, Tc = 3;
    const n = Math.max(1, Math.round(D / (p.stride ?? G.L * W))), L = D / n, Lw = L / W;
    const f0 = p.at, fw = f0 + Tt + Tc - 1, fe = fw + (n + 1) * T;
    const y0 = st.yaw, yaw = y0 + dTurn, F = fwdB(head), R = rightB(head), first = p.lead || 'R';
    const at = (s, side) => [from[0] + F[0] * s + R[0] * side * w, from[1] + F[1] * s + R[1] * side * w];
    const sw = Math.min(1.5, 2 * (1 - G.ds)), phi = G.run ? 0.35 : 0, tauMin = -(Tc - 1) / T, stub = 0.122 * W;
    // pelvis distance along the path (m): eases in over the first step and out over the closing step
    const sPel = tau => {
      if (tau <= 0) return 0;
      if (tau < 1) return L * ((0.5 + 3 * phi) * tau * tau - 2 * phi * tau ** 3);
      if (tau < n) return L * (tau - 0.5 + phi);
      if (tau < n + 1) {                                         // Hermite to a stop, short enough never to back up
        const dl = Math.min(1, 3 * (0.5 - phi)), x = Math.min(1, (tau - n) / dl);
        return L * (n - 0.5 + phi + (3 * x * x - 2 * x ** 3) * (0.5 - phi) + (x ** 3 - 2 * x * x + x) * dl);
      }
      return D;
    };
    const swingSide = k => ((k % 2 === 1) === (first === 'R') ? 'R' : 'L');
    const stance0 = side => { const q = toWorld((posture0 === 'sit' ? SIT : STAND)['foot' + side], { pos: from, yaw }); return [q[0], q[1]]; };
    // each foot's plants: p (world xy), tc (heel strike, in steps), to (toe-off), heel (foot pitch at the strike),
    // a (toe heading, deg in the figure's frame: the first plant keeps the standing splay, the rest point down the path)
    const SPLAY = Math.atan2(0.10, 0.07) / DEG;
    const plant0 = side => ({ p: stance0(side), tc: -1e9, to: 1e9, heel: 0, a: SIDE[side] * SPLAY });
    const plants = { L: [plant0('L')], R: [plant0('R')] };
    for (let k = 1; k <= n + 1; k++) {
      const s = swingSide(k), list = plants[s];
      list[list.length - 1].to = k === 1 ? Math.max(0.25, 1 - sw) : k - sw;   // the first heel peels over the weight shift
      list.push({ p: at(Math.min(k, n) * L, SIDE[s]), tc: k, to: 1e9, heel: k > n ? G.heel * 0.4 : G.heel, soft: k === 1 || k > n, a: -cheat });
    }
    const stanceFoot = (pl, tau) => {                             // -> { xy, z (W off the floor), pitch (deg, + toe up), a }
      const pitch = pl.heel * (1 - smooth((tau - pl.tc) / 0.3));
      if (pl.to < 1e8) {
        const h0 = Math.max(pl.to - G.hoff, pl.tc + 0.3, tauMin);
        if (tau > h0) {                                           // heel peels off, the foot pivots on its planted toe
          const q = smooth((tau - h0) / Math.max(1e-3, pl.to - h0)), a = -G.toe * q * DEG, back = stub * Math.cos(a), d = fwdB(yaw + pl.a);
          return { xy: [pl.p[0] + d[0] * (stub - back), pl.p[1] + d[1] * (stub - back)], z: -0.122 * Math.sin(a), pitch: -G.toe * q, a: pl.a };
        }
      }
      return { xy: pl.p, z: 0, pitch, a: pl.a };
    };
    const footAt = (side, tau) => {
      const list = plants[side];
      let j = list.length - 1; while (j > 0 && list[j].tc > tau) j--;
      const pl = list[j];
      if (tau <= pl.to) return stanceFoot(pl, tau);
      const nx = list[j + 1], A = stanceFoot(pl, pl.to), x = (tau - pl.to) / (nx.tc - pl.to);
      // foot eases out from behind (the shin trails), clears the floor highest early in the swing, lands heel first
      const hs = G.run ? smooth(x) : smoother(x), lift = G.lift * (nx.soft ? 0.75 : 1);
      return { xy: [lerp(A.xy[0], nx.p[0], hs), lerp(A.xy[1], nx.p[1], hs)],
        z: A.z * (1 - x) + lift * Math.pow(Math.sin(Math.PI * Math.pow(x, G.run ? 0.9 : 0.75)), G.run ? 1.5 : 1.2),
        pitch: lerp(-G.toe, nx.heel, smooth(x)), a: lerp(A.a, nx.a, hs), swing: true, x };
    };
    // hip height (walk): from the stance leg, so its knee follows a set flex through the step: near straight at
    // contact, gives at "down", straight through passing and "up", the heel then peels. Keys -> periodic spline.
    const l2 = 2 * LIMB.thigh, lat = Math.max(0, w / W - 0.14), toU = 2 - sw, h0U = toU - G.hoff;
    const hipAt = (u, flex) => {
      let az = 0, shift = 0;
      if (u > h0U) { const a = G.toe * smooth((u - h0U) / (toU - h0U)) * DEG; az = 0.122 * Math.sin(a); shift = 0.122 * (1 - Math.cos(a)); }
      const h = (0.5 - u) * Lw + shift;
      return az + 0.022 + Math.sqrt(Math.max(0.3, (l2 * legReach(flex)) ** 2 - h * h - lat * lat)) - 1.38;
    };
    const KEYS = (G.stanceFlex || [[0, 8], [0.1, 15], [0.45, 2]]).map(([u, fl]) => [u, hipAt(u, fl)]);
    const spline = u => {
      const m = KEYS.length, Pk = j => { const q = ((j % m) + m) % m; return [KEYS[q][0] + Math.floor(j / m), KEYS[q][1]]; };
      let i = m - 1; while (i > 0 && KEYS[i][0] > u) i--;
      const [u0, z0] = Pk(i), [u1, z1] = Pk(i + 1), [um, zm] = Pk(i - 1), [u2, z2] = Pk(i + 2), d = u1 - u0, x = (u - u0) / d;
      const t0 = (z1 - zm) / (u1 - um) * d, t1 = (z2 - z0) / (u2 - u0) * d;
      return (2 * x ** 3 - 3 * x * x + 1) * z0 + (x ** 3 - 2 * x * x + x) * t0 + (-2 * x ** 3 + 3 * x * x) * z1 + (x ** 3 - x * x) * t1;
    };
    // run: lowest at mid-stance, highest in the flight
    const cyc = u => { const x = ((u - 0.22) % 1 + 1) % 1, up = 0.5;
      return x < up ? lerp(-0.09, 0.03, smooth(x / up)) : lerp(0.03, -0.09, smooth((x - up) / (1 - up))); };
    const legFrontR = tau => (first === 'R' ? -1 : 1) * Math.cos(Math.PI * tau);   // +1 when the right foot leads
    const springIn = d => (d < 0 ? 0 : Math.exp(-d / 3.2) * Math.sin(0.85 * d));
    const travel = -cheat * DEG, sg1 = swingSide(1) === 'R' ? -1 : 1;
    const endPos = [to[0], to[1], from[2]];
    st.pos = endPos; st.yaw = yaw;
    const posture = st.posture;
    const body = f => {
      if (f < f0 + Tt) return turnBody(f, f0, Tt, from, y0, dTurn, posture);
      const tau = (f - fw) / T, u = ((tau % 1) + 1) % 1, tc = f - (f0 + Tt);
      const pel = sPel(tau), root = { pos: [from[0] + F[0] * pel, from[1] + F[1] * pel, from[2]], yaw };
      const envB = smooth(tau) * (1 - smooth((tau - n - 0.4) / 1.1)), envA = smooth((tau + 0.2) / 1.2) * (1 - smooth((tau - n) / 1.2)), stop = springIn(f - fe);
      const o = { pos: root.pos, yaw, kneeDir: [Math.sin(travel), 0, Math.cos(travel)], toeL: 0, toeR: 0, toeF: 1 };
      const dip = tc >= 0 && tc < Tc + 4 ? -0.03 * Math.sin(Math.PI * tc / (Tc + 4)) ** 2 : 0;
      o.bob = (G.run ? cyc(u) : spline(u)) * envB + dip - 0.025 * stop;
      const stanceSg = swingSide(Math.floor(tau) + 1) === 'R' ? -1 : 1;
      o.dx = tau < 0.5 ? sg1 * G.sway * smooth(tc / Tc) : G.sway * Math.sin(Math.PI * u) * stanceSg * (1 - smooth(tau - n));
      o.lean = 1.5 * o.dx / G.sway;
      for (const side of ['L', 'R']) {
        const ft = footAt(side, tau), q = toLocal([ft.xy[0], ft.xy[1], from[2] + ft.z * W], root);
        q[1] += 0.022;
        if (ft.swing) {                                           // a swinging leg reaches forward but never locks straight in the air
          // (the clamp lets go over the last part of the swing, so the heel reaches the floor without a drop)
          const hip = [SIDE[side] * 0.14 + o.dx, 1.38 + o.bob, 0], v = q.map((x, i) => x - hip[i]), d = Math.hypot(...v),
            mx = lerp((G.run ? 0.95 : 0.97) * l2, 1.02 * l2, smooth((ft.x - 0.25) / 0.75));
          if (d > mx) for (let i = 0; i < 3; i++) q[i] = hip[i] + v[i] * mx / d;
        }
        o['foot' + side] = q; o['footPitch' + side] = ft.pitch; o['footYaw' + side] = ft.a;
      }
      o.pitch = G.lean * envA * (1 + 0.15 * Math.cos(2 * Math.PI * (u - 0.6))) + (dip ? -40 * dip : 0) - 2.5 * stop;
      const ra = -legFrontR(tau - 1 / T);                          // right arm forward-ness, a frame behind the legs
      o.shTwist = G.twist * ra * envA; o.hipTwist = 0.6 * G.twist * legFrontR(tau) * envA;
      o.arm = {};
      for (const side of ['L', 'R']) {
        const sg = SIDE[side], amp = G.arm * (p.carry && p.carry !== side ? 1.3 : 1);
        const fr = s => sg * -legFrontR(s);
        const fe2 = Math.max(0, fr(tau - 2.5 / T));                // the forearm folds as the arm comes forward, late
        o.arm[side] = { fwd: REST_ARM.fwd + amp * fr(tau - 1 / T) * envA + 6 * stop, out: REST_ARM.out + (G.out ?? (G.run ? 10 : 6)) * envA,   // a little wider while walking: the swing reads outside the torso
          flex: lerp(REST_ARM.flex, G.elbow[0] + G.elbow[1] * fe2, envA) };
      }
      o.walking = tau > 0 && tau < n + 1 ? (tau / 2) % 1 : null; o.walkT = T;
      return o;
    };
    const cues = [];
    for (let k = 1; k <= n + 1; k++) cues.push({ f: Math.round(fw + k * T), name: 'step', strength: k > n ? 0.2 : 0.35 });
    // the head stays near level while the torso leans: it leads instead of nodding down
    const headOwner = { chan: 'add', start: f0, fn: f => (f < f0 || f > fe + 20 ? {} : { head_pitch: -0.4 * (body(f).pitch || 0) }) };
    return { end: fe + 10, owners: [{ chan: 'body', start: f0, fade: 1, fn: body }, headOwner], cues, door: { fw, T, n, L, from, F }, gait: { fw, T, n, fe } };
  },

  // swing the held bag up and over the shoulder; it then hangs behind the back
  sling(p, st, C) {
    const hand = p.hand || 'R', prop = p.prop || st.hold[hand], T = p.dur ?? 18, t0 = p.at, s = SIDE[hand];
    const owners = [{ chan: 'hand' + hand, start: t0, fade: T, fn: f => {
      // up and over on an arc, then the fist rests above the shoulder on the strap (never folded onto the shoulder: the
      // elbow would flip), the elbow forward
      const u = smoother((f - t0) / T), a = Math.sin(Math.PI * u);
      return { l: [s * (0.34 + 0.30 * a), 2.34 + 0.20 * a, -0.06 + 0.42 * a], elbow: [s * 0.9, -0.3, 0.2] };
    } }];
    const off = [0.03 * s, -0.20, -0.34];
    const segs = [{ prop, start: t0 + 3, mode: 'hand', actor: st.name, side: hand, off, offFrom: C.lastOff(prop), blend: T - 3, tilt: [0, 0], swing: true }];
    C.setOff(prop, off);
    st.hold[hand] = prop; st.sling = hand;
    return { end: t0 + T, owners, segs, cues: [{ f: t0 + 4, name: 'swoosh', strength: 0.5 }],
      active: [{ prop, from: t0, to: t0 + T, by: st.name }] };
  },
};

// Stepped turn on the spot: each foot lifts and re-plants at the new angle (first one, then the other, each over
// ~T/2 frames); a foot on the floor stays where it was in the world and keeps its own heading (never a pivot on a
// sliding foot). The hips dip, the hanging arms lag the turn by two frames and swing back.
function turnBody(f, f0, T, pos, y0, d, posture) {
  const base = posture === 'sit' ? SIT : STAND, sit = posture === 'sit';
  const t = f - f0, yawAt = tt => y0 + d * smoother(tt / T);
  if (sit || T <= 0) {
    if (T <= 0 || t >= T) return { pos, yaw: y0 + d, bob: base.bob || 0, pitch: base.pitch || 0, footL: base.footL, footR: base.footR };
    return { pos, yaw: yawAt(t), bob: base.bob || 0, pitch: base.pitch || 0, footL: base.footL, footR: base.footR };
  }
  const yaw = t >= T ? y0 + d : yawAt(t), om = yawAt(t - 2) - yawAt(t - 3);   // deg / frame, two frames late
  const out = { pos, yaw, bob: -0.06 * smooth(t / (0.3 * T)) * (1 - smooth((t - 0.72 * T) / (0.28 * T))), lean: -1.5 * Math.sign(d) * Math.sin(Math.PI * clamp(t / T, 0, 1)), pitch: 0, arm: {} };
  const lead = d > 0 ? 'R' : 'L';
  for (const side of ['L', 'R']) {
    const [a, b] = side === lead ? [T * 0.2, T * 0.7] : [T * 0.5, T], x = clamp((t - a) / (b - a), 0, 1), yf = y0 + d * smoother(x);   // the knees give before a foot lifts
    const l = toLocal(toWorld(base['foot' + side], { pos, yaw: yf }), { pos, yaw });
    l[1] += 0.05 * Math.sin(Math.PI * x) ** 2; out['foot' + side] = l; out['footYaw' + side] = yf - yaw;
    out.arm[side] = { fwd: REST_ARM.fwd + 0.9 * SIDE[side] * om, out: REST_ARM.out + 0.6 * Math.abs(om), flex: REST_ARM.flex + 0.8 * Math.abs(om) };
  }
  return out;
}
