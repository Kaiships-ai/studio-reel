// Motion verbs. A verb compiles (once, at load) into channel owners, prop segments and sound cues; every owner is a
// pure function of the absolute frame f, so any frame can be rendered alone. Blender metres, yaw in degrees.
//   channel owners: { chan: 'body' | 'handL' | 'handR' | 'add', start, fade, fn(f, env) }
//   hand targets:   { w: [x,y,z] } world, { l: [u,v,z] } figure-local (W units), { rest: true }, plus optional bend
//   prop segments:  { prop, start, mode: 'rest' | 'hand' | 'fn' | 'bag', ... }
import { W_M } from './cast.js';

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

// rest poses (W units, figure-local)
export const STAND = { footL: [-0.22, 0.022, 0], footR: [0.22, 0.022, 0], handL: [-0.41, 1.30, 0.03], handR: [0.41, 1.30, 0.03] };
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
      const u = smoother((f - tg) / tl);
      return { w: [lerp(top[0], up[0], u), lerp(top[1], up[1], u), lerp(top[2], up[2], u) + 0.04 * Math.sin(Math.PI * u)] };
    } }];
    const segs = [{ prop: p.prop, start: tg, mode: 'hand', actor: st.name, side: hand, off: [0, -(0.03 + th), 0], keepRot: true }];
    return { end: tg + tl, owners, segs, cues: [{ f: tg, name: 'cash_lift', strength: 0.4 }],
      active: [{ prop: p.prop, from: p.at, to: tg + tl + 4, by: st.name }] };
  },

  // carry a prop (grab it first if it is not in the hand) over the bag, let go: it falls in, the bag dips and swells
  drop_in(p, st, C) {
    const hand = p.hand || 'R', bag = p.into || 'bag', held = st.hold[hand] === p.prop, th = C.thick(p.prop);
    const r = held ? 0 : 7, carry = p.carry ?? 10, fall = 5;
    const tg = p.at + r, tr = tg + carry, ti = tr + fall;
    const rest = held ? null : C.rest(p.prop);
    const grab = held ? st.handW[hand] : [rest[0], rest[1], rest[2] + th + 0.03];
    const above = 0.13, owners = [
      { chan: 'hand' + hand, start: p.at, fade: held ? 3 : r, fn: (f, env) => {
        if (f < tg) return { w: grab };
        const m = env.mouth(bag), B = [m[0], m[1], m[2] + above];
        if (f >= tr) return { w: [B[0], B[1], B[2] + 0.02 * Math.min(4, f - tr)] };
        const u = smoother((f - tg) / carry);
        return { w: [lerp(grab[0], B[0], u), lerp(grab[1], B[1], u), lerp(grab[2], B[2], u) + 0.10 * Math.sin(Math.PI * u)] };
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
    const hand = p.hand || 'R', r = p.on ? 0 : 7, press = 2, dur = p.dur ?? 14;
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
      finger_wave: { at: [s * 0.52, 2.22, 0.38], amp: [0.07, 0.02], per: 6, n: 4, bend: -0.25 * s },
      wave: { at: [s * 0.78, 2.70, 0.18], amp: [0.16, 0.03], per: 10, n: 3, bend: -0.2 * s },
      fist_pump: { at: [s * 0.42, 2.78, 0.12], amp: [0, -0.22], per: 8, n: 2, bend: 0.25 * s },
      shrug: { at: [s * 0.78, 1.78, 0.28], amp: [0, 0.05], per: 18, n: 1, bend: 0.3 * s },
    }[k];
    if (!spec) throw new Error(`gesture: unknown kind ${k}`);
    const dur = spec.per * spec.n, lead = 6;
    owners.push({ chan: 'hand' + hand, start: t0, fade: lead, fn: f => {
      const t = Math.max(0, f - t0 - lead * 0.5), ph = Math.sin(2 * Math.PI * t / spec.per) * (t < dur ? 1 : 0);
      return { l: [spec.at[0] + spec.amp[0] * ph, spec.at[1] + spec.amp[1] * Math.abs(ph), spec.at[2]], bend: spec.bend };
    } });
    if (k === 'shrug') {
      owners.push({ chan: 'hand' + (hand === 'R' ? 'L' : 'R'), start: t0, fade: lead, fn: () => ({ l: [-spec.at[0], spec.at[1], spec.at[2]], bend: -spec.bend }) });
      owners.push(restOwner('hand' + (hand === 'R' ? 'L' : 'R'), t0 + lead + dur, 9));
    }
    if (st.hold[hand]) throw new Error(`gesture ${k}: ${st.name}'s ${hand} hand is holding ${st.hold[hand]}`);
    owners.push(restOwner('hand' + hand, t0 + lead + dur, 9));
    return { end: t0 + lead + dur + 9, owners };
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
    const y0 = st.yaw, y1 = p.yaw ?? C.yawTo(st.pos, C.point(p.to ?? p.target)), d = angDiff(y0, y1), T = p.dur ?? 12, pos = st.pos.slice();
    const posture = st.posture;
    st.yaw = y0 + d;
    const owners = [{ chan: 'body', start: p.at, fade: 1, fn: f => turnBody(f, p.at, T, pos, y0, d, posture) }];
    return { end: p.at + T, owners, cues: [{ f: p.at + 5, name: 'step', strength: 0.15 }, { f: p.at + 10, name: 'step', strength: 0.15 }] };
  },

  // planted-foot walk: optional turn on the spot, a 3-frame crouch, steps of `step` frames, a closing step, settle
  walk_to(p, st, C) {
    const to = C.point(p.to), from = st.pos.slice(), T = p.step ?? 10, w = 0.13;
    const dxy = [to[0] - from[0], to[1] - from[1]], D = Math.hypot(...dxy), head = C.yawTo(from, to);
    // cheat: the figure's plane turns toward the camera side while the feet keep the world path (reads better than profile)
    const posture0 = st.posture, dTurn = angDiff(st.yaw, head + (p.cheat || 0)), Tt = Math.abs(dTurn) > 15 ? (p.turn ?? 12) : 0, Tc = 3;
    const n = Math.max(1, Math.round(D / (p.stride ?? 0.6))), L = D / n;
    const f0 = p.at, fw = f0 + Tt + Tc - 1, fe = fw + (n + 1) * T;   // first step overlaps the crouch's last frame
    const y0 = st.yaw, F = fwdB(head), R = rightB(head), first = p.lead || 'R';
    const at = (s, side) => [from[0] + F[0] * s + R[0] * side * w, from[1] + F[1] * s + R[1] * side * w, from[2]];
    // pelvis distance along the path: accelerates through the first step, decelerates through the closing step
    const sPel = tau => {
      if (tau <= 0) return 0;
      if (tau < 1) return 0.5 * L * tau * tau;
      if (tau < n) return 0.5 * L + L * (tau - 1);
      if (tau < n + 1) { const u = tau - n; return (n - 0.5) * L + 0.5 * L * (1 - (1 - u) * (1 - u)); }
      return n * L;
    };
    // footprint index -> distance: foot that swings on step k lands at k*L (last closing step lands at n*L)
    const swingSide = k => ((k % 2 === 1) === (first === 'R') ? 'R' : 'L');
    // footprint 0 = where the stance (after the turn) left each foot; footprint k = k*L along the path
    const stance0 = side => { const q = toWorld((posture0 === 'sit' ? SIT : STAND)['foot' + side], { pos: from, yaw: y0 + dTurn }); q[2] = from[2]; return q; };
    const footW = (side, tau) => {      // [world pos, lift] of one foot at time tau (in steps)
      let pos = stance0(side), lift = 0;
      for (let k = 1; k <= n + 1; k++) {
        if (swingSide(k) !== side) continue;
        const target = at(Math.min(k, n) * L, SIDE[side]), u = tau - (k - 1);
        if (u <= 0) break;
        // the foot leaves the floor before it travels and lands before it stops: no skid at either end
        const up = clamp((u - 0.10) / 0.80, 0, 1), sw = smoother((u - 0.20) / 0.60);
        if (u < 1) { pos = lerp3(pos, target, sw); lift = Math.sin(Math.PI * up); break; }
        pos = target;
      }
      return [pos, lift];
    };
    const endPos = [to[0], to[1], from[2]];
    st.pos = endPos; st.yaw = y0 + dTurn;
    const posture = st.posture;
    const body = f => {
      if (f < f0 + Tt) return turnBody(f, f0, Tt, from, y0, dTurn, posture);
      const yaw = y0 + dTurn, tau = (f - fw) / T;
      const pel = sPel(tau), root = { pos: [from[0] + F[0] * pel, from[1] + F[1] * pel, from[2]], yaw };
      const ft = {};
      for (const side of ['L', 'R']) {
        const [p0, lift] = footW(side, tau), pw = p0.slice(); pw[2] += 0.10 * lift;
        ft[side] = toLocal(pw, root); ft[side][1] += 0.022;
      }
      const walking = tau > 0 && tau < n + 1, u = ((tau % 1) + 1) % 1;
      const amp = !walking ? 0 : (tau < 1 || tau > n) ? 0.6 : 1;
      const tc = f - (f0 + Tt), crouch = tc >= 0 && tc < 4 ? -0.08 * Math.sin(Math.PI * tc / 4) : 0;
      const bob = -0.108 * amp * (0.5 + 0.5 * Math.cos(2 * Math.PI * u)) + crouch - 0.05 * settle(f - fe);
      const stance = swingSide(Math.floor(tau) + 1) === 'R' ? 'L' : 'R';
      const sway = amp * 1.6 * Math.sin(Math.PI * u) * (stance === 'R' ? 1 : -1);
      const lean = smooth((f - fw) / 6) * (1 - smooth((f - fe + 6) / 8));
      return { pos: root.pos, yaw, bob, lean: sway, pitch: 5 * lean + (crouch ? 3 : 0) - 2.5 * settle(f - fe), footL: ft.L, footR: ft.R,
        toeL: -0.35, toeR: 0.35, toeF: 0.11, swing: { L: -0.8 * ft.R[2], R: -0.8 * ft.L[2] }, walking: amp > 0 ? u : null };
    };
    const cues = [];
    for (let k = 1; k <= n + 1; k++) cues.push({ f: Math.round(fw + (k - 1 + 0.88) * T), name: 'step', strength: k > n ? 0.2 : 0.35 });
    return { end: fe + 10, owners: [{ chan: 'body', start: f0, fade: 1, fn: body }], cues, door: { fw, T, n, L, from, F } };
  },

  // swing the held bag up and over the shoulder; it then hangs behind the back
  sling(p, st, C) {
    const hand = p.hand || 'R', prop = p.prop || st.hold[hand], T = p.dur ?? 12, t0 = p.at, s = SIDE[hand];
    const owners = [{ chan: 'hand' + hand, start: t0, fade: T, fn: f => {
      const u = clamp((f - t0) / T, 0, 1);
      return { l: [s * 0.30, 2.06 + 0.45 * Math.sin(Math.PI * u), -0.10 + 0.25 * Math.sin(Math.PI * u)], bend: 0.35 * s };
    } }];
    const off = [0.03 * s, -0.03, -0.32];
    const segs = [{ prop, start: t0 + 3, mode: 'hand', actor: st.name, side: hand, off, offFrom: C.lastOff(prop), blend: T - 3, tilt: [0, 0], swing: true }];
    C.setOff(prop, off);
    st.hold[hand] = prop; st.sling = hand;
    return { end: t0 + T, owners, segs, cues: [{ f: t0 + 4, name: 'swoosh', strength: 0.5 }],
      active: [{ prop, from: t0, to: t0 + T, by: st.name }] };
  },
};

function turnBody(f, f0, T, pos, y0, d, posture) {
  const base = posture === 'sit' ? SIT : STAND;
  if (T <= 0 || f >= f0 + T) return { pos, yaw: y0 + d, bob: base.bob || 0, pitch: base.pitch || 0, footL: base.footL, footR: base.footR };
  const t = f - f0, yaw = y0 + d * smoother(t / T);
  // shuffle: each foot lifts and re-plants at the new angle; until it moves it stays where it was in the world
  const foot = (side, a, b) => {
    const u = smoother((t - a) / (b - a)), yf = y0 + d * u, root = { pos, yaw };
    const home = toWorld(base['foot' + side], { pos, yaw: yf }), l = toLocal(home, root);
    l[1] += 0.10 * Math.sin(Math.PI * u) * 0.6; return l;
  };
  return { pos, yaw, bob: -0.03 * Math.sin(Math.PI * t / T), lean: 0, pitch: 0, footR: foot('R', 0, T * 0.55), footL: foot('L', T * 0.4, T) };
}
