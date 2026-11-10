// Second-half verbs (street, explainer) and effect timelines. Actor verbs follow the verbs.js contract and only touch
// pose keys (body: pos/yaw/bob/lean/pitch/feet, hand targets, add: lean/pitch/head_*), so any limb rig renders them.
// Keyed values: beats `set` / `pulse` / `fire` / `flash` write per-frame numbers (or vectors) on an actor, a prop or an
// effect object; MAKE builds the effect objects named in an act's `make` table and maps those values onto them.
import * as THREE from 'three';
import { STAND, W, clamp, smooth, smoother, lerp, lerp3, add3, fwdB, rightB, toLocal, toWorld, settle, angDiff } from './verbs.js';
import { makePowderBurst, makeFlyingBills, makeDyeSpray, makeRadioRings, makeBagGlow, makeArm, makeBill, flashAt } from '../lib/props/fx.js';
import { makeDyePack, makeThermometer, snoreAt } from '../lib/props/dyepack.js';

const SIDE = { L: -1, R: 1 };
const rest = (chan, start, fade = 9) => ({ chan, start, fade, fn: () => ({ rest: true }) });
const EASE = { smoother, smooth, linear: x => clamp(x, 0, 1), step: x => (x >= 0 ? 1 : 0),
  out: x => 1 - Math.pow(1 - clamp(x, 0, 1), 3), back: x => { x = clamp(x, 0, 1); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); } };
const mix = (a, b, u) => (Array.isArray(a) ? lerp3(a, b, u) : lerp(a, b, u));
// a standing body at pos/yaw with optional extras (feet spread, pitch, bob)
const stand = (pos, yaw, o = {}) => ({ pos, yaw, bob: o.bob || 0, lean: o.lean || 0, pitch: o.pitch || 0,
  footL: o.footL || STAND.footL, footR: o.footR || STAND.footR });

// ---------------------------------------------------------------- actor verbs
export const ACT = {
  // jump the actor to a mark (off screen, or between acts' windows): no motion
  place(p, st, C) {
    const pos = C.point(p.to).slice(); pos[2] = pos[2] || 0; const yaw = p.yaw ?? st.yaw;
    st.pos = pos; st.yaw = yaw;
    return { end: p.at, owners: [{ chan: 'body', start: p.at, fade: 0, fn: () => stand(pos, yaw) }] };
  },

  // thrown by a blast: knocked back, a hop, arms flung up, then a stiff shocked stance with arms half raised
  startle(p, st) {
    const t0 = p.at, F = fwdB(st.yaw), p0 = st.pos.slice(), back = p.back ?? 0.22, yaw = st.yaw, hold = p.hold ?? 22;
    const p1 = [p0[0] - F[0] * back, p0[1] - F[1] * back, p0[2]];
    st.pos = p1;
    const feet = { footL: [-0.32, 0.022, 0.04], footR: [0.30, 0.022, -0.06] };
    const owners = [{ chan: 'body', start: t0, fade: 2, fn: f => {
      const t = f - t0, u = smoother(t / 5), pos = lerp3(p0, p1, u);
      const hop = t < 9 ? 0.16 * Math.sin(Math.PI * clamp(t / 9, 0, 1)) : -0.07 * settle(t - 9);
      const pitch = -11 * smooth(t / 3) * (1 - 0.6 * smooth((t - 10) / 14));
      return stand(pos, yaw, { bob: hop, pitch, lean: 3 * Math.sin(t * 0.9) * Math.exp(-t / 8), ...feet });
    } }];
    for (const s of ['L', 'R']) {
      const sg = SIDE[s], held = st.hold[s];
      owners.push({ chan: 'hand' + s, start: t0, fade: 2, fn: f => {
        const t = f - t0, up = held ? [sg * 0.62, 2.45, 0.05] : [sg * 0.86, 2.95, 0.22], half = held ? [sg * 0.55, 2.1, 0.18] : [sg * 0.74, 2.05, 0.42];
        const u = smoother((t - hold) / 10), j = 0.03 * Math.sin(t * 2.1 + sg) * Math.exp(-t / 10);
        const l = lerp3(up, half, u); l[1] += j; return { l, bend: -0.25 * sg };
      } });
    }
    return { end: t0 + hold + 10, owners };
  },

  // two dry coughs: chest and head jerk forward, the free hand comes up to the mouth
  cough(p, st) {
    const t0 = p.at, hand = p.hand || 'L', s = SIDE[hand], n = p.n ?? 2, per = p.per ?? 7;
    const owners = [{ chan: 'add', start: t0, fn: f => {
      const t = f - t0; let k = 0;
      for (let i = 0; i < n; i++) { const d = t - i * per; if (d >= 0 && d < per) k += Math.sin(Math.PI * d / per) * (i ? 0.8 : 1); }
      return { pitch: 7 * k, head_pitch: 12 * k, head_dv: -0.025 * k };
    } }];
    if (!st.hold[hand]) {
      owners.push({ chan: 'hand' + hand, start: t0 - 2, fade: 5, fn: f => ({ l: [s * 0.16, 2.22 - 0.03 * Math.sin((f - t0) * 0.9), 0.48], bend: -0.3 * s }) });
      owners.push(rest('hand' + hand, t0 + n * per + 4, 8));
    }
    return { end: t0 + n * per, owners, cues: [{ f: t0, name: 'cough', strength: 0.4 }] };
  },

  // turn to face `from` and back off two steps, hands up; then hold the guard for `hold` frames
  step_back(p, st, C) {
    const t0 = p.at, T = p.step ?? 7, D = p.dist ?? 0.45, tgt = C.point(p.from);
    const y0 = st.yaw, y1 = y0 + angDiff(y0, C.yawTo(st.pos, tgt)), F = fwdB(y1), p0 = st.pos.slice();
    const p1 = [p0[0] - F[0] * D, p0[1] - F[1] * D, p0[2]];
    st.pos = p1; st.yaw = y1;
    const foot = (side, a, t) => {
      const h0 = toWorld(STAND['foot' + side], { pos: p0, yaw: y0 }), h1 = toWorld(STAND['foot' + side], { pos: p1, yaw: y1 });
      const u = smoother((t - a) / T); const q = lerp3(h0, h1, u); q[2] = p0[2] + 0.09 * Math.sin(Math.PI * clamp((t - a) / T, 0, 1)); return q;
    };
    const lead = p.lead || 'R', other = lead === 'R' ? 'L' : 'R';
    const owners = [{ chan: 'body', start: t0, fade: 2, fn: f => {
      const t = f - t0, yaw = y0 + angDiff(y0, y1) * smoother(t / 6), pos = lerp3(p0, p1, smoother(t / (2 * T + 2)));
      const root = { pos, yaw }, ft = {};
      for (const [side, a] of [[lead, 1], [other, T + 1]]) { ft[side] = toLocal(foot(side, a, t), root); ft[side][1] += 0.022; }
      return { pos, yaw, bob: -0.05 * Math.sin(Math.PI * clamp(t / (2 * T), 0, 1)), lean: 0, pitch: -6 * smooth(t / 4) * (1 - smooth((t - 2 * T - 8) / 10)),
        footL: ft.L, footR: ft.R };
    } }];
    const hold = p.hold ?? 26;
    for (const s of ['L', 'R']) if (!st.hold[s]) {
      const sg = SIDE[s];
      owners.push({ chan: 'hand' + s, start: t0, fade: 4, fn: f => ({ l: [sg * 0.50, 2.18 + 0.03 * Math.sin((f - t0) * 0.7), 0.40], bend: -0.3 * sg }) });
      owners.push(rest('hand' + s, t0 + hold, 10));
    }
    return { end: t0 + 2 * T + 2, owners, cues: [{ f: t0 + T, name: 'step', strength: 0.3 }, { f: t0 + 2 * T, name: 'step', strength: 0.3 }] };
  },

  // point at a place with a straight arm, small jabs
  point(p, st, C) {
    const hand = p.hand || 'R', s = SIDE[hand], t0 = p.at, hold = p.hold ?? 40;
    const l = toLocal(C.point(p.to), { pos: st.pos, yaw: st.yaw }), n = Math.hypot(l[0], l[2]) || 1, d = [l[0] / n, l[2] / n];
    const owners = [{ chan: 'hand' + hand, start: t0, fade: 5, fn: f => {
      const t = f - t0, jab = 0.06 * Math.max(0, Math.sin(2 * Math.PI * t / 9)) * (t < 27 ? 1 : 0);
      return { l: [s * 0.22 + d[0] * (0.95 + jab), 2.30, d[1] * (0.95 + jab)], bend: -0.05 * s };
    } }, rest('hand' + hand, t0 + hold, 10)];
    return { end: t0 + hold + 10, owners };
  },

  // a small guilty wave at chest height, head tipped
  wave_small(p, st) {
    const hand = p.hand || 'L', s = SIDE[hand], t0 = p.at, per = p.per ?? 7, n = p.n ?? 3;
    const owners = [{ chan: 'hand' + hand, start: t0, fade: 5, fn: f => {
      const t = Math.max(0, f - t0 - 3), ph = Math.sin(2 * Math.PI * t / per) * (t < per * n ? 1 : 0);
      return { l: [s * (0.62 + 0.07 * ph), 2.18 + 0.02 * Math.abs(ph), 0.32], bend: -0.3 * s };
    } }, rest('hand' + hand, t0 + 3 + per * n + 6, 10),
    { chan: 'add', start: t0, fn: f => { const e = smoother((f - t0) / 6) * (1 - smoother((f - t0 - per * n - 8) / 10)); return { head_tilt: -7 * e * s, pitch: 3 * e, head_pitch: 5 * e }; } }];
    return { end: t0 + per * n + 16, owners };
  },

  // shoulders drop, chin down: the deflated stand (held until another body verb)
  slump(p, st) {
    const t0 = p.at, pos = st.pos.slice(), yaw = st.yaw, T = p.dur ?? 12;
    return { end: t0 + T, owners: [{ chan: 'body', start: t0, fade: 6, fn: f => { const u = smoother((f - t0) / T);
      return stand(pos, yaw, { pitch: 7 * u, bob: -0.05 * u, footL: [-0.20, 0.022, 0.02], footR: [0.24, 0.022, -0.03] }); } },
    { chan: 'add', start: t0, fn: f => ({ head_pitch: 8 * smoother((f - t0) / T) }) }] };
  },

  // pull a prop out of a bag (or off a place) and raise it to `to` (figure-local hand target)
  pluck(p, st, C) {
    const hand = p.hand || 'L', s = SIDE[hand], t0 = p.at, r = p.reach ?? 6, tg = t0 + r, up = p.dur ?? 10;
    const to = p.to || [s * 0.34, 2.42, 0.55];
    st.hold[hand] = p.prop; st.handL_to = to;
    const grab = p.grab || [0.22, 1.32, 0.22];                     // figure-local: the mouth of a bag hanging from the other hand
    const owners = [{ chan: 'hand' + hand, start: t0, fade: r, fn: f => {
      if (f < tg) return { l: grab, bend: -0.2 * s };
      const u = smoother((f - tg) / up), l = lerp3(grab, to, u); l[1] += 0.12 * Math.sin(Math.PI * u); return { l, bend: -0.2 * s };
    } }];
    const segs = [{ prop: p.prop, start: -1e8, mode: 'bag', bag: p.from || 'bag' },
      { prop: p.prop, start: tg, mode: 'hand', actor: st.name, side: hand, off: [0, 0.02, 0], tilt: [1.2, 0], yaw: 90 }];
    st.release = { pos: st.pos.slice(), yaw: st.yaw, l: to };
    return { end: tg + up, owners, segs, cues: [{ f: tg, name: 'rustle', strength: 0.3 }], active: [{ prop: p.prop, from: tg, to: tg + up + 20, by: st.name }] };
  },

  // open the hand: the held paper flutters down to the floor
  let_fall(p, st, C) {
    const hand = p.hand || 'L', t0 = p.at, R = st.release, fall = p.dur ?? 42;
    const start = R ? toWorld(R.l, { pos: R.pos, yaw: R.yaw }) : add3(st.pos, [0, 0, 1.5]);
    start[2] += 0.02;
    const ground = (p.ground ?? st.pos[2]) + 0.004, Fv = fwdB(st.yaw);
    st.hold[hand] = null;
    const segs = [{ prop: p.prop, start: t0, mode: 'fn', fn: f => {
      const t = f - t0, u = clamp(t / fall, 0, 1), z = lerp(start[2], ground, 1 - Math.pow(1 - u, 1.4));
      const sw = 0.16 * Math.sin(t * 0.32) * (1 - u * 0.5);
      return { pos: [start[0] + Fv[0] * 0.25 * u + sw * Fv[1], start[1] + Fv[1] * 0.25 * u - sw * Fv[0], z], rot: 1.2 + 0.05 * t * (1 - u),
        spin: u < 1 ? 0.7 * Math.sin(t * 0.28) : 0 };
    } }];
    return { end: t0 + fall, owners: [rest('hand' + hand, t0 + 2, 12)], segs, cues: [{ f: t0 + 4, name: 'flutter', strength: 0.3 }],
      active: [{ prop: p.prop, from: t0, to: t0 + fall, by: st.name }] };
  },
};

// ---------------------------------------------------------------- prop motion (segments)
export const PROPV = {
  // glide a prop from where it rests to `to` (place / point) or by `by` (metres)
  move(p, C) {
    const a = C.rest(p.who).slice(), b = p.to ? C.point(p.to).slice() : add3(a, p.by), dur = p.dur ?? 12, ez = EASE[p.ease || 'smoother'];
    const r0 = C.restRot(p.who) ?? 0, r1 = r0 + (p.turn ?? 0), t0 = p.at;
    C.setRest(p.who, b, r1);
    return { segs: [{ prop: p.who, start: t0, mode: 'fn', fn: f => { const u = ez((f - t0) / dur); return { pos: lerp3(a, b, u), rot: lerp(r0, r1, u) }; } },
      { prop: p.who, start: t0 + dur, mode: 'rest', pos: b, rot: r1 }] };
  },
  // a car drives in along x and stops at its rest mark with a small nose dip
  drive(p, C) {
    const b = (p.to ? C.point(p.to) : C.rest(p.who)).slice(), dist = p.dist ?? 12, dur = p.dur ?? 24, t0 = p.at, rot = p.rot ?? C.restRot(p.who) ?? 0;
    const a = [b[0] - dist * (p.dir ?? 1), b[1], b[2]];
    C.setRest(p.who, b, rot);
    return { segs: [{ prop: p.who, start: -1e8, mode: 'rest', pos: [b[0] - 60, b[1], b[2]], rot },
      { prop: p.who, start: t0, mode: 'fn', fn: f => { const u = 1 - Math.pow(1 - clamp((f - t0) / dur, 0, 1), 2.4); return { pos: lerp3(a, b, u), rot }; } },
      { prop: p.who, start: t0 + dur, mode: 'rest', pos: b, rot }],
    cues: [{ f: t0 + dur - 2, name: 'brake', strength: 0.5 }] };
  },
};

// ---------------------------------------------------------------- keyed values
// tracks[target][key] = { base: [{start, fn}], add: [fn] }; base = newest started wins, add = summed on top
export function keyTracks(fps) {
  const T = {}, last = {};
  const tr = (who, key) => ((T[who] ||= {})[key] ||= { base: [], add: [] });
  return {
    T,
    add(b) {
      const who = b.who, at = b.at, cues = [];
      if (b.do === 'set') {
        const from = b.from ?? last[who + '.' + b.key] ?? b.dflt ?? 0, to = b.to, dur = b.dur ?? 0, ez = EASE[b.ease || 'smoother'];
        last[who + '.' + b.key] = to;
        tr(who, b.key).base.push({ start: at, fn: f => (dur <= 0 ? to : mix(from, to, ez((f - at) / dur))) });
      } else if (b.do === 'pulse') {
        const dur = b.dur ?? 8, n = b.n ?? 1, gap = b.gap ?? dur, amp = b.amp ?? 1;
        tr(who, b.key).add.push(f => { let s = 0; for (let i = 0; i < n; i++) { const d = (f - at - i * gap) / dur; if (d >= 0 && d < 1) s += amp * Math.pow(Math.sin(Math.PI * d), 2); } return s; });
      } else if (b.do === 'shake') {
        const dur = b.dur ?? 14, amp = b.amp ?? 1;
        tr(who, b.key || 'shake').add.push(f => { const d = f - at; return d >= 0 && d < dur ? amp * (d % 2 ? -1 : 1) * (1 - d / dur) : 0; });
      } else if (b.do === 'fire') {
        tr(who, 't0').base.push({ start: at, fn: () => at });
      } else if (b.do === 'flash') {
        const n = b.frames ?? 3;
        tr('screen', 'flash').add.push(f => flashAt((f - at) / fps, { frames: n, fps }));
      }
      else if (b.do === 'sound') cues.push({ f: at, name: b.name, strength: b.strength ?? 0.5 });
      if (b.sound) cues.push({ f: at + (b.soundAt ?? 0), name: b.sound, strength: b.strength ?? 0.5 });
      return cues;
    },
    // value of who.key at f (undefined when nothing was keyed and no default)
    at(who, key, f, dflt) {
      const k = T[who]?.[key]; if (!k) return dflt;
      let v = dflt; for (const t of k.base) if (t.start <= f) v = t.fn(f);
      if (k.add.length) { const a = k.add.reduce((s, fn) => s + fn(f), 0); v = (v ?? 0) + a; }
      return v;
    },
    has: (who, key) => !!T[who]?.[key],
  };
}

// ---------------------------------------------------------------- effect objects
// MAKE[kind](stage, opts, ctx) -> { obj, apply(v, f, env), post?(camPos), pos?() }
//   v(key, dflt) = keyed value at f; env.at(spec) resolves a place / prop / {prop|head, off} to a Blender point
const tB = p => new THREE.Vector3(p[0], p[2], -p[1]);
const tSec = (v, f, fps) => { const t0 = v('t0'); return t0 == null ? -1 : (f - t0) / fps; };
function faceCam(o, camPos, extra = 0) { const p = o.position; o.rotation.set(0, Math.atan2(camPos[0] - p.x, -camPos[1] - p.z) + extra, 0); }
export const MAKE = {
  bagGlow: (stage, o, ctx) => { const g = makeBagGlow(stage, ctx.props[o.bag || 'bag']); return { obj: null, apply: v => g.userData.set(v('glow', 0)) }; },
  burst: (stage, o, ctx) => {
    const g = makePowderBurst(stage, o); ctx.group.add(g);
    return { obj: g, apply: (v, f, env) => { g.position.copy(tB(env.at(o.at))); g.userData.set(tSec(v, f, ctx.fps), { up: o.up ?? 0.10 }); } };
  },
  bills: (stage, o, ctx) => {
    const g = makeFlyingBills(stage, o); ctx.group.add(g); const n = g.userData.count;
    return { obj: g, apply: (v, f, env) => {
      const p = env.at(o.at); g.position.copy(tB(p)); const red = v('red', 0);
      g.userData.set(tSec(v, f, ctx.fps), { ground: -p[2] + 0.003 + (o.ground ?? 0), dyed: i => clamp((red * (n + 3) - i) / 3, 0, 1) });
    } };
  },
  spray: (stage, o, ctx) => {
    const g = makeDyeSpray(stage, o); ctx.group.add(g); const aim = new THREE.Vector3();
    return { obj: g, apply: (v, f, env) => {
      const p = env.at(o.at); g.position.copy(tB(p)); aim.copy(tB(add3(p, o.dir || [0, -0.6, 0.4]))); g.lookAt(aim);
      g.userData.set(tSec(v, f, ctx.fps), { on: v('on', 0) });
    } };
  },
  rings: (stage, o, ctx) => {
    const g = makeRadioRings(stage, o); ctx.group.add(g); let args = null;
    return { obj: g, apply: (v, f, env) => { args = { t: tSec(v, f, ctx.fps), from: tB(env.at(o.from)).toArray(), to: tB(env.at(o.to)).toArray() }; },
      post: cam => { if (args) g.userData.set(args.t, { ...args, dur: o.dur ?? 0.55, gap: o.gap ?? 0.22, r0: o.r0 ?? 0.06, r1: o.r1 ?? 0.24, face: tB(cam).toArray() }); } };
  },
  thermo: (stage, o, ctx) => {
    const g = makeThermometer(stage, o); stage.prop(g); ctx.group.add(g); const S = o.scale ?? 1;
    return { obj: g, apply: (v, f, env) => {
      const show = v('show', 0); g.visible = show > 0.01; g.position.copy(tB(env.at(o.at)));
      g.scale.setScalar(Math.max(1e-3, S * show)); g.userData.set({ temp: v('temp', 70) }); g.userData.shake = v('shake', 0);
    }, post: cam => { faceCam(g, cam); g.rotation.z = 0.05 * (g.userData.shake || 0); g.position.x += 0.012 * (g.userData.shake || 0); } };
  },
  pack: (stage, o, ctx) => {
    const g = makeDyePack(stage); stage.prop(g); ctx.group.add(g); g.scale.setScalar(o.scale ?? 1);
    return { obj: g, apply: (v, f, env) => {
      g.visible = v('show', 1) > 0.5; g.position.copy(tB(env.at(o.at)));
      g.userData.set({ awake: v('awake', 0), snore: v('snoring', 0) * snoreAt(f / ctx.fps), alarm: v('alarm', 0), dial: v('dial', 0), count: v('count', 10) });
    }, post: cam => faceCam(g, cam, o.turn ?? 0) };
  },
  bill: (stage, o, ctx) => {
    const g = makeBill(stage, o); stage.prop(g); ctx.group.add(g);
    const p = ctx.point(o.at); g.position.copy(tB(p)); g.userData.rest = { pos: p.slice(), rot: 0 };
    ctx.props[o.name] = g; const set = g.userData.set;
    return { obj: g, apply: v => set({ red: v('red', o.red ?? 1) }) };
  },
  arm: (stage, o, ctx) => {
    const g = makeArm(stage, o); ctx.group.add(g); stage.prop(g);
    return { obj: g, apply: v => g.userData.set({ shoulder: v('shoulder', o.shoulder), hand: v('hand'), bend: v('bend', 0.12) }) };
  },
  // an existing set prop with userData.set(params): every keyed value goes through as a param
  prop: (stage, o, ctx) => {
    const g = ctx.props[o.prop || o.name], keys = o.keys || [];
    return { obj: g, apply: (v, f) => {
      const P = {}; for (const k of keys) { const x = v(k); if (x != null) P[k] = x; }
      if (o.snore) P.snore = v('snoring', 0) * snoreAt(f / ctx.fps);
      if (o.phaseRate) P.phase = (f / ctx.fps) * o.phaseRate;
      (g.userData?.set || g.set)(P);
    } };
  },
};
