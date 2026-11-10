// Reel runtime: one reel DATA module (plain object) + words.json -> every frame, as a pure function of its number.
// Beats name a word (`on`, nth occurrence in `line`, `offset` frames, default -2); verbs, acting, camera and captions
// do the rest. Exposes window.__frame / __dbg / __cues / __T_END / __ready (see boot()).
// A reel is one or more ACTS (reel.js is the first; reel2.js, when present, adds more): each act builds its own set,
// cast, beats and camera; boot() shows the act whose window holds the frame and dissolves between them.
import * as THREE from 'three';
import { createStage } from './look.js';
import { makeStick, KAI, TELLER, GUARD, EXPR, HEAD_C } from './cast.js';
import { VERBS, STAND, SIT, REST_ARM, W, lerp, lerp3, add3, angDiff, toLocal, smoother, hash, handEase } from './verbs.js';
import { blinkTrack, exprAt, idle, saccade, focusAt, gaze, springs } from './acting.js';
import { createCamera } from './camera.js';
import { createCaptions } from './captions.js';
import { ACT, PROPV, MAKE, keyTracks } from './verbs_fx.js';
import { MABEL, OTIS, JUNE, OFFICER, dye } from '../lib/cast/extras.js';

const SPECS = { KAI, TELLER, GUARD, MABEL, OTIS, JUNE, OFFICER };
const SETS = { 'bank-lobby': () => import('../lib/sets/bank-lobby.js'), street: () => import('../lib/sets/street.js'),
  cutaway: () => import('../lib/sets/cutaway.js') };
const KEYV = new Set(['set', 'pulse', 'shake', 'fire', 'flash', 'sound']);
const THICK = { b1: 0.045, b2: 0.045, stack: 0.07, note: 0.003 };
const toB = v => [v.x, -v.z, v.y];
const norm = w => w.toLowerCase().replace(/[^a-z0-9']/g, '');

async function getJSON(url) { try { const r = await fetch(url); return r.ok ? await r.json() : null; } catch { return null; } }

export function resolveBeatFrame(b, words, fps) {
  if (typeof b.f === 'number') return b.f;
  const ws = words.filter(w => w.line === b.line && norm(w.word) === norm(b.on));
  const w = ws[(b.nth || 1) - 1];
  if (!w) throw new Error(`beat: no "${b.on}" #${b.nth || 1} in ${b.line}`);
  return Math.max(0, Math.round(w.t0 * fps) + (b.offset ?? -2));
}

function mixObj(a, b, w) {
  if (w >= 1 || a == null) return b; if (w <= 0 || b == null) return a;
  const o = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k], y = b[k];
    if (x == null || y == null) o[k] = w < 0.5 ? (x ?? y) : (y ?? x);
    else if (k === 'yaw') o[k] = x + angDiff(x, y) * w;
    else if (typeof x === 'number' && typeof y === 'number') o[k] = lerp(x, y, w);
    else if (Array.isArray(x) && Array.isArray(y)) o[k] = lerp3(x, y, w);
    else if (typeof x === 'object' && typeof y === 'object') o[k] = mixObj(x, y, w);
    else o[k] = w < 0.5 ? x : y;
  }
  return o;
}
// hand hand-over: wind-up, an arc that bows up and out (never a straight line), ease out, small settle
function mixHand(a, b, x) {
  const w = handEase(x), o = mixObj(a, b, Math.min(1, Math.max(0, w)));
  const d = b.l.map((q, i) => q - a.l[i]), len = Math.hypot(...d);
  o.l = lerp3(a.l, b.l, w);
  if (len > 1e-4) {
    const up = [0.25 * Math.sign(a.l[0] + b.l[0] || 1), 1, 0.35], k = up.reduce((s, q, i) => s + q * d[i], 0) / (len * len);
    const n = up.map((q, i) => q - k * d[i]), nl = Math.hypot(...n) || 1, bow = 0.16 * len * Math.sin(Math.PI * Math.min(1, Math.max(0, x)));
    o.l = o.l.map((q, i) => q + n[i] / nl * bow);
  }
  return o;
}
// owners sorted by start; the newest started owner wins, cross-faded from the one before it over its fade
// (hands: over the fade plus a 35 % settle tail, see mixHand)
function chain(list, f, val, env, hand = false) {
  let i = list.length - 1; while (i > 0 && list[i].start > f) i--;
  const go = j => { const v = val(list[j].fn(f, env), j); const o = list[j]; const fd = o.fade || 0;
    if (j > 0 && fd > 0 && hand && f - o.start < fd * 1.35 + 1) return mixHand(go(j - 1), v, (f - o.start + 1) / (fd + 1));
    if (j > 0 && fd > 0 && f - o.start < fd) return mixObj(go(j - 1), v, smoother((f - o.start + 1) / (fd + 1))); return v; };
  return go(i);
}

async function buildAct(R, X) {
  const { stage, words, fps, F0, F1, width, height } = X;
  const SET = await SETS[R.set]();
  // the set's meshes and lights go into this act's group (shown only while the act is on screen)
  const group = new THREE.Group(), before = new Set(stage.scene.children), bg0 = stage.scene.background;
  const built = await SET.build(stage);
  for (const c of [...stage.scene.children]) if (!before.has(c)) group.add(c);
  const background = stage.scene.background; stage.scene.background = bg0; stage.scene.add(group); group.visible = false;
  const props = built.props;
  const sun = () => stage.setSun(SET.SUN_DIR, R.sun?.center || SET.SUN_CENTER, R.sun?.half || SET.SUN_HALF);

  // ---------------------------------------------------------------- compile
  const point = s => Array.isArray(s) ? s : SET.PLACES[s] || SET.MARKS[s] || (props[s] && props[s].userData.rest.pos) ||
    (() => { throw new Error(`unknown place ${s}`); })();
  const KT = keyTracks(fps), fxo = {};                              // keyed values and the act's effect objects
  for (const [name, o] of Object.entries(R.make || {})) fxo[name] = MAKE[o.kind](stage, { ...o, name }, { props, group, fps, point });
  const rest = {}, offs = {}, impacts = {};
  for (const [n, o] of Object.entries(props)) if (o.userData?.rest) rest[n] = { ...o.userData.rest };
  const C = {
    words, fps,
    point,
    target: (s, st) => s == null ? { rest: true } : typeof s === 'string' && props[s] ? { prop: s } : typeof s === 'string' ? { w: point(s) }
      : Array.isArray(s) ? { w: s } : s,
    rest: n => rest[n].pos, restRot: n => rest[n].rot, setRest: (n, p, r) => { rest[n] = { pos: p, rot: r }; },
    thick: n => THICK[n] ?? 0.04,
    lastOff: n => offs[n], setOff: (n, o) => { offs[n] = o; },
    impact: (bag, f, s) => (impacts[bag] ||= []).push({ f, amp: s }),
    bagDip: n => (impacts[n] !== undefined || n === 'bag') ? f => springs(impacts[n] || [], f) : null,
    yawTo: (from, to) => Math.atan2(to[0] - from[0], -(to[1] - from[1])) * 180 / Math.PI,
  };
  const frameOf = b => resolveBeatFrame(b, words, fps);
  const actors = [], byName = {};
  for (const [name, c] of Object.entries(R.cast)) {
    const S = makeStick(SPECS[c.spec]); group.add(S.root);
    const posture = c.posture || 'stand', base = posture === 'sit' ? SIT : STAND;
    const pos = point(c.at).slice(); pos[2] = pos[2] || 0;
    const st = { name, pos, yaw: c.yaw ?? 0, posture, hold: { L: null, R: null }, handW: {}, sling: null };
    const a = { name, S, c, st, posture, seed: Math.round(hash(name.length, name.charCodeAt(0), name.charCodeAt(1)) * 1e6),
      focus: c.focus, watch: c.watch, owners: { body: [], handL: [], handR: [], add: [] }, verbs: [], exprs: [{ f: -1e9, expr: c.expr || 'neutral' }],
      focusSegs: [], mouth: [] };
    const p0 = pos.slice(), y0 = st.yaw;
    a.owners.body.push({ start: -1e9, fade: 0, verb: 'stand', fn: () => ({ pos: p0, yaw: y0, bob: base.bob || 0, lean: 0, pitch: base.pitch || 0, footL: base.footL, footR: base.footR }) });
    for (const s of ['L', 'R']) a.owners['hand' + s].push({ start: -1e9, fade: 0, verb: 'rest', fn: () => ({ rest: true }) });
    actors.push(a); byName[name] = a;
  }
  const beats = R.beats.map((b, i) => ({ ...b, at: frameOf(b), i })).sort((x, y) => x.at - y.at || x.i - y.i);
  const segs = {}, active = [], cues = [], fx = [];
  for (const b of beats) {
    const a = byName[b.who];
    if (KEYV.has(b.do)) for (const q of KT.add(b)) cues.push({ fr: q.f, name: q.name, strength: q.strength });
    if (!a && PROPV[b.do]) { const out = PROPV[b.do](b, C); for (const s of out.segs) (segs[s.prop] ||= []).push(s); for (const q of out.cues || []) cues.push({ fr: q.f, name: q.name, strength: q.strength }); continue; }
    if (!a) { if (!KEYV.has(b.do)) fx.push(b); if (b.do === 'blink') cues.push({ fr: b.at, name: 'sensor_beep', strength: 0.4 }); if (b.do === 'glint') cues.push({ fr: b.at, name: 'glint', strength: 0.4 }); continue; }
    if (b.expr) a.exprs.push({ f: b.at, expr: b.expr });
    if (b.look) a.focusSegs.push({ from: b.at, target: b.look });
    if (!b.do || KEYV.has(b.do)) continue;
    const V = VERBS[b.do] || ACT[b.do]; if (!V) throw new Error(`unknown verb ${b.do}`);
    const out = V(b, a.st, C);
    a.verbs.push({ name: b.do, start: b.at, end: out.end });
    for (const o of out.owners || []) {
      o.verb = b.do;
      a.owners[o.chan].push(o);
    }
    for (const s of out.segs || []) (segs[s.prop] ||= []).push(s);
    for (const q of out.cues || []) cues.push({ fr: q.f, name: q.name, strength: q.strength, who: a.name });
    for (const q of out.active || []) active.push(q);
    if (out.focus) a.focusSegs.push(out.focus);
    if (out.mouth) a.mouth.push(...out.mouth);
  }
  for (const a of actors) {
    for (const k of Object.keys(a.owners)) a.owners[k].sort((x, y) => x.start - y.start);
    a.exprs.sort((x, y) => x.f - y.f);
    const swaps = a.exprs.slice(1).filter((e, i) => e.expr !== a.exprs[i].expr).map(e => e.f);
    a.blinks = blinkTrack(a.seed, F0 - 60, F1 + 60, swaps);
    a.focusSegs.sort((x, y) => x.from - y.from);
  }
  for (const n of Object.keys(props)) if (rest[n] || segs[n]) {
    const first = props[n].userData.rest;
    (segs[n] ||= []).unshift({ prop: n, start: -1e9, mode: 'rest', pos: first.pos, rot: first.rot });
    segs[n].sort((x, y) => x.start - y.start);
  }
  cues.sort((x, y) => x.fr - y.fr);

  // ---------------------------------------------------------------- per-frame evaluation
  const bodyAt = (a, f) => chain(a.owners.body, f, v => v, null);
  const headZ = a => (a.posture === 'sit' ? HEAD_C[1] + SIT.bob : HEAD_C[1]) * W;
  // camera anchors: from the body channel only (no idle bob), so the framing never chases a head wobble
  const anchor = (n, f, live) => {
    const a = byName[n];
    if (a) {
      const b = bodyAt(a, f), h = [b.pos[0], b.pos[1], b.pos[2] + headZ(a)];
      return { head: h, top: [h[0], h[1], h[2] + 0.36], sole: b.pos, yaw: b.yaw, center: h };
    }
    const p = live ? live(n) : (rest[n]?.pos || point(n));
    return { center: p, head: p };
  };

  let F = { f: -1, posed: new Set(), cache: new Map(), handWorld: {}, bodies: {} };
  const hv = new THREE.Vector3();
  const handWorld = (n, side) => { const k = n + side; if (!F.handWorld[k]) F.handWorld[k] = toB(byName[n].S.parts.hands[side].getWorldPosition(hv)); return F.handWorld[k]; };
  function propWorld(n) {
    if (F.cache.has(n)) return F.cache.get(n);
    const o = props[n], L = segs[n]; let i = L.length - 1; while (i > 0 && L[i].start > F.f) i--;
    const s = L[i], f = F.f; let pos, rot = s.rot ?? rest[n]?.rot ?? 0, vis = true, tilt = [0, 0], scale = 1;
    if (s.mode === 'rest') pos = s.pos;
    else if (s.mode === 'fn') { const r = s.fn(f, env); pos = r.pos; if (r.rot != null) rot = r.rot; if (r.spin) tilt = [r.spin, r.spin * 0.6]; rot = r.rot ?? (L[i - 1]?.rot ?? rot); }
    else if (s.mode === 'bag') { pos = propWorld(s.bag); vis = false; }
    else if (s.mode === 'hand') {
      if (!F.posed.has(s.actor)) throw new Error(`prop ${n} needs ${s.actor} posed first (cast order)`);
      const hw = handWorld(s.actor, s.side), body = F.bodies[s.actor];
      const u = s.blend ? smoother((f - s.start) / s.blend) : 1, off = s.offFrom ? lerp3(s.offFrom, s.off, u) : s.off;
      const Rv = [Math.cos(body.yaw * Math.PI / 180), Math.sin(body.yaw * Math.PI / 180)], Fv = [Rv[1], -Rv[0]];
      const ow = s.offW || [Rv[0] * off[0] + Fv[0] * off[2], Rv[1] * off[0] + Fv[1] * off[2], off[1]];
      pos = add3(hw, ow);
      if (!s.keepRot) rot = (body.yaw + (s.yaw || 0)) * Math.PI / 180;
      tilt = s.tilt || [0, 0];
      if (s.swing && body.walking != null) tilt = [tilt[0] + 0.10 * Math.sin(2 * Math.PI * body.walking), tilt[1] + 0.06 * Math.cos(2 * Math.PI * body.walking)];
    }
    if (n === 'bag' || impacts[n]) {                                // swells a little with every bundle, pops on impact
      const imp = impacts[n] || [], k = imp.filter(e => e.f <= f).length;
      scale = 1 + 0.035 * k + 0.035 * springs(imp, f);
    }
    o.position.set(pos[0], pos[2], -pos[1]); o.rotation.set(tilt[0], rot, tilt[1], 'YXZ'); o.scale.setScalar(scale); o.visible = vis;
    o.updateMatrixWorld(true);
    F.cache.set(n, pos); return pos;
  }
  const env = {
    prop: propWorld, mouth: n => propWorld(n),
    resolve: (t, f) => t.prop ? { w: add3(propWorld(t.prop), [0, 0, t.up ?? (C.thick(t.prop) + 0.035)]), bend: t.bend } : t.mouth ? { w: add3(propWorld(t.mouth), [0, 0, t.up ?? 0.12]) } : t,
  };

  function poseActor(a, f) {
    const body = bodyAt(a, f), root = { pos: body.pos, yaw: body.yaw };
    F.bodies[a.name] = body;
    const id = idle(a.seed, f, a.posture);
    const add = {};
    for (const o of a.owners.add) if (o.start <= f + 30) { const r = o.fn(f); for (const k in r) add[k] = (add[k] || 0) + r[k]; }
    const base = a.posture === 'sit' ? SIT : STAND, hands = {}, bends = {}, elbows = {}, fks = {};
    for (const side of ['L', 'R']) {
      const sg = side === 'L' ? -1 : 1;
      const v = chain(a.owners['hand' + side], f, spec => {
        const s = spec.w || spec.prop || spec.mouth ? env.resolve(spec, f) : spec;
        let l;
        if (s.rest) l = base['hand' + side].slice();
        else if (s.w) l = toLocal(s.w, root); else l = s.l.slice();
        if (s.dv) l[1] += s.dv;
        // a standing figure's resting arm hangs from the shoulder (FK, swung by the body verbs); fk blends it in
        return { l, bend: spec.bend ?? s.bend ?? 0.10 * sg, elbow: spec.elbow ?? s.elbow ?? [sg * 0.6, -0.2, -0.75], fk: s.rest && a.posture !== 'sit' ? 1 : 0 };
      }, env, true);
      hands[side] = add3(v.l, id.hand.map(x => x * sg)); bends[side] = v.bend; elbows[side] = v.elbow;
      const fk = body.arm?.[side] || REST_ARM;
      fks[side] = { fwd: fk.fwd + 60 * id.hand[2], out: fk.out + 40 * id.hand[0], flex: fk.flex + 40 * id.hand[1], w: v.fk };
    }
    const bob = (body.bob || 0) + id.bob, P = {
      pos: root.pos, yaw: root.yaw, bob, lean: (body.lean || 0) + (add.lean || 0), pitch: (body.pitch || 0) + (add.pitch || 0),
      head_tilt: id.head_tilt + (add.head_tilt || 0) + (a.c.head_tilt || 0), head_dv: id.head_dv + (add.head_dv || 0),
      head_dx: id.head_dx + (add.head_dx || 0), head_pitch: add.head_pitch || 0,
      footL: body.footL, footR: body.footR, toeL: body.toeL, toeR: body.toeR, toeF: body.toeF,
      handL: hands.L, handR: hands.R, bendL: bends.L, bendR: bends.R, expr: a.lastExpr || a.c.expr,
      elbowL: elbows.L, elbowR: elbows.R, armFKL: fks.L, armFKR: fks.R,
    };
    for (const k of ['dx', 'footPitchL', 'footPitchR', 'footYawL', 'footYawR', 'kneeDir', 'shTwist', 'hipTwist']) if (body[k] != null) P[k] = body[k];
    a.S.pose(P); F.posed.add(a.name); a.P = P;
  }

  function faceActor(a, f, camPos) {
    let e = exprAt(a.exprs, f);
    const talking = a.mouth.some(([s, t]) => f >= s && f < t);
    const id = idle(a.seed, f, a.posture);
    if (talking && EXPR[e + '_o']) e += '_o';
    else if (e === 'sleep' && id.snore) e = 'sleep_o';
    const tgtPos = t => t === 'camera' ? camPos : byName[t] ? toB(byName[t].S.parts.head.getWorldPosition(hv)) : Array.isArray(t) ? t : t ? livePos(t) : camPos;
    const cur = focusAt(a, f, a.focusSegs, active), head = toB(a.S.parts.head.getWorldPosition(new THREE.Vector3()));
    const yaw = F.bodies[a.name].yaw, gz = x => gaze(head, yaw, tgtPos(x.prop || x.target));
    let g = gz(cur), d = 0;
    while (d < 3 && focusAt(a, f - d - 1, a.focusSegs, active).key === cur.key) d++;
    if (d < 3) g = lerp3(gz(focusAt(a, f - d - 1, a.focusSegs, active)), g, smoother((d + 1) / 4));
    const sc = saccade(a.seed, f);
    const blink = a.blinks.at(f);
    const P = { expr: e, blink, look: g[0] + sc[0], look_v: g[1] + sc[1] };
    a.S.face(P); a.face = P; a.lastExpr = e;
  }

  // where a named thing is right now: effect objects and set props by their world position, places by name
  const livePos = n => fxo[n]?.obj ? toB(fxo[n].obj.getWorldPosition(hv)) : props[n] && segs[n] ? propWorld(n)
    : props[n]?.getWorldPosition ? toB(props[n].getWorldPosition(hv)) : point(n);
  const fenv = { at: spec => {
    if (Array.isArray(spec)) return spec;
    if (typeof spec === 'string') return livePos(spec);
    if (spec.head) { const a = byName[spec.head], h = toB(a.S.parts.head.getWorldPosition(hv)), y = F.bodies[spec.head].yaw * Math.PI / 180;
      return [h[0] + Math.sin(y) * (spec.fwd || 0), h[1] - Math.cos(y) * (spec.fwd || 0), h[2] + (spec.up || 0)]; }
    return add3(livePos(spec.prop), spec.off || [0, 0, 0]);
  } };
  const camera = createCamera({ aspect: width / height, side: SET.CAMERA_SIDE, bounds: R.cameraRoom || SET.CAMERA_ROOM, zRange: R.zRange, actors: actors.map(a => a.name) });
  // compile sees the real scene at each shot change (everything is a pure function of the frame)
  const shots = camera.compile(R.shots.map(s => ({ f: frameOf(s), kind: s.shot, subjects: s.of, opt: s })).sort((x, y) => x.f - y.f),
    (n, f) => { if (F.f !== f) poseAll(f); return anchor(n, f, livePos); }, F1 + 1);

  let cam = null, caption = null;

  function poseAll(f) {
    F = { f, posed: new Set(), cache: new Map(), handWorld: {}, bodies: {} };
    for (const a of actors) {
      poseActor(a, f);
      for (const n of Object.keys(segs)) { const L = segs[n]; let i = L.length - 1; while (i > 0 && L[i].start > f) i--; if (L[i].mode === 'hand' && L[i].actor === a.name) propWorld(n); }
    }
    for (const n of Object.keys(segs)) propWorld(n);
    for (const b of fx) {
      const d = f - b.at;
      if (b.do === 'blink') props[b.who].set(d >= 0 && d < 4 ? 1 : d >= 4 && d < 8 ? 1 - (d - 3) / 5 : 0);
      if (b.do === 'glint') { const k = d >= 0 && d < 14 ? Math.sin(Math.PI * d / 14) : 0; props[b.who].userData.top.material.emissive.setRGB(0.9 * k, 0.95 * k, 1.0 * k); }
    }
    for (const a of actors) {                                       // keyed: dye level 0..1, shown / hidden
      if (KT.has(a.name, 'dye')) dye(a.S, KT.at(a.name, 'dye', f, 0));
      if (KT.has(a.name, 'show')) a.S.root.visible = KT.at(a.name, 'show', f, 1) > 0.5;
    }
    for (const [n, h] of Object.entries(fxo)) h.apply((k, d) => KT.at(n, k, f, d), f, fenv);
  }
  function update(f) {
    sun(); poseAll(f);
    cam = camera.at(shots, f, n => anchor(n, f, livePos), cues);
    const px = height / 1920;
    stage.camera.setViewOffset(width, height, cam.offset[0] * px, cam.offset[1] * px, width, height);
    stage.setCamera(cam.pos, cam.aim, cam.lens);
    if (cam.dof > 0.02) { const d = Math.hypot(...cam.pos.map((x, i) => x - cam.focus[i])); stage.setDof({ near: d * 0.86, far: d * 1.22, gain: 2.4 * cam.dof, px: 14 }); }
    else stage.setDof(null);
    for (const h of Object.values(fxo)) h.post?.(cam.pos);
    for (const a of actors) faceActor(a, f, cam.pos);
    caption = X.cap.chunkAt(f)?.text ?? null;
  }

  const v = new THREE.Vector3();
  const toPx = p => { v.copy(p).project(stage.camera); return [(v.x + 1) / 2 * width, (1 - v.y) / 2 * height]; };
  function dbg(f) {
    update(f);
    const camM = stage.camera.matrixWorld, Rv = new THREE.Vector3().setFromMatrixColumn(camM, 0), Uv = new THREE.Vector3().setFromMatrixColumn(camM, 1);
    const out = { f, camera: { pos: cam.pos, target: cam.aim, fov: +stage.camera.fov.toFixed(3), lens: +cam.lens.toFixed(2), shot: cam.shot, offset: cam.offset, glide: cam.u ?? null }, actors: {}, caption };
    for (const a of actors) {
      const c = a.S.parts.head.getWorldPosition(new THREE.Vector3());
      const xs = [-1, 1].map(s => toPx(c.clone().addScaledVector(Rv, 0.5 * W * s))[0]), ys = [1, -1].map(s => toPx(c.clone().addScaledVector(Uv, 0.47 * W * s))[1]);
      v.copy(c).project(stage.camera);
      const feet = {}; for (const s of ['L', 'R']) feet[s] = toB(a.S.parts.ankles[s].getWorldPosition(new THREE.Vector3())).map(x => +x.toFixed(4));
      const box = [xs[0], ys[0], xs[1], ys[1]].map(x => +x.toFixed(1));
      out.actors[a.name] = { pos: F.bodies[a.name].pos.map(x => +x.toFixed(4)), yaw: +F.bodies[a.name].yaw.toFixed(2), expr: a.face.expr, blink: a.face.blink,
        verb: a.verbs.filter(x => x.start <= f && f < x.end).map(x => x.name), head: box, feet, limbs: a.S.rigWorld(),
        inFrame: v.z < 1 && box[2] > 0 && box[0] < width && box[3] > 0 && box[1] < height };
    }
    return out;
  }

  // camera speed = mean screen move of a 3x3 grid of world points fixed at the aim's depth (0.8 of the half frame), px at 720 wide
  // (camPeak = the worst of the nine, i.e. the frame corners during a zoom);
  // foot slide = how far a planted foot moves in the world between frames, seen through this frame's camera
  const feetW = () => Object.fromEntries(actors.map(a => [a.name, Object.fromEntries(['L', 'R'].map(s => [s, toB(a.S.parts.ankles[s].getWorldPosition(new THREE.Vector3()))]))]));
  const motion = f => {
    update(Math.max(F0, f - 1)); const c0 = { ...cam }, ft0 = feetW();
    update(f); const ft1 = feetW();
    const px = (c, p) => { const q = camera.project(c, p); return [q[0] * 720 + c.offset[0] * 720 / 1080, q[1] * 1280 + c.offset[1] * 720 / 1080]; };
    const d = Math.hypot(...cam.pos.map((x, i) => x - cam.aim[i])), fw = cam.aim.map((x, i) => (x - cam.pos[i]) / d);
    const rt = [fw[1], -fw[0], 0].map(x => x / (Math.hypot(fw[0], fw[1]) || 1)), up = [rt[1] * fw[2] - rt[2] * fw[1], rt[2] * fw[0] - rt[0] * fw[2], rt[0] * fw[1] - rt[1] * fw[0]];
    const hw = d * 18 / cam.lens * width / height, hh = d * 18 / cam.lens;
    let camPx = 0, camPeak = 0;
    for (const i of [-0.8, 0, 0.8]) for (const j of [-0.8, 0, 0.8]) {
      const q = cam.aim.map((x, k) => x + rt[k] * hw * i + up[k] * hh * j), a = px(c0, q), b = px(cam, q);
      const m = Math.hypot(b[0] - a[0], b[1] - a[1]); camPx += m / 9; camPeak = Math.max(camPeak, m);
    }
    const feet = {};
    for (const n in ft1) { feet[n] = {}; for (const s of ['L', 'R']) {
      const p0 = ft0[n][s], p1 = ft1[n][s], q0 = px(cam, p0), q1 = px(cam, p1);
      feet[n][s] = { planted: p0[2] < 0.014 && p1[2] < 0.014, px: +Math.hypot(q1[0] - q0[0], q1[1] - q0[1]).toFixed(3) }; } }
    return { cam: f === F0 ? 0 : +camPx.toFixed(3), camPeak: f === F0 ? 0 : +camPeak.toFixed(3), feet };
  };
  return { name: R.name || R.set, R, group, background, update, dbg, motion, cues, actors, frameOf, flash: f => KT.at('screen', 'flash', f, 0) || 0 };
}

// internal cue names -> the sound bank (tools/sound_bank.py); steps alternate left / right
const SOUND = { cash_lift: 'rustle', bundle_drop: 'thud', paper_slide: 'slide', swoosh: 'whoosh', sensor_beep: 'beep', glint: 'ting' };
const BANK = new Set(['slide', 'thud', 'rustle', 'ting', 'ding', 'whoosh', 'step_l', 'step_r', 'beep', 'tick', 'poof', 'hiss', 'scratch', 'pop', 'snore',
  'clunk', 'blip', 'ping', 'sizzle', 'slide_whistle_up', 'flutter', 'wah', 'siren', 'sting']);

export async function boot({ film, width, height }) {
  const R1 = (await import(`/${film}/reel.js`)).default;
  let R2 = null;
  try { R2 = (await import(`/${film}/reel2.js`)).default; } catch (e) { if (e instanceof SyntaxError || !/fetch|module|404/i.test(String(e))) throw e; }
  const words = (await getJSON(`/${film}/vo/words.json`)) || (await getJSON(`/${film}/words.json`));
  if (!words) throw new Error(`no words.json in ${film}/vo or ${film}`);
  const fps = R1.fps || 30, F0 = R1.frames[0], F1 = R2 ? R2.frames[1] : R1.frames[1];
  const stage = createStage({ width, height, ...(R1.look || {}) });
  try { await document.fonts.load('900 100px InterReel'); } catch { /* falls back to the system sans */ }
  const cap = createCaptions({ words, lines: [...R1.lines, ...(R2?.lines || [])], fps, width, height });
  const X = { stage, words, fps, F0, F1, width, height, cap }, bg0 = stage.scene.background;
  const defs = [{ ...R1, name: R1.name || 'lobby', show: R1.show || [{ from: R1.frames[0] }] }, ...(R2?.acts || [])];
  for (const am of R2?.amend || []) { const d = defs.find(x => x.name === am.act); d.shots = [...d.shots, ...(am.shots || [])]; d.beats = [...d.beats, ...(am.beats || [])]; }
  const acts = [];
  for (const d of defs) acts.push(await buildAct(d, X));
  // windows: act k is on screen from its `from`; a dissolve of n frames is centred on that frame
  const fr = x => typeof x === 'number' ? x : resolveBeatFrame(x, words, fps);
  const wins = acts.flatMap((A, k) => defs[k].show.map(w => ({ A, a: fr(w.from), n: w.dissolve ?? (A === acts[0] && w.from === F0 ? 0 : 7) }))).sort((x, y) => x.a - y.a);
  const at = f => {
    for (let k = 1; k < wins.length; k++) { const w = wins[k], h = w.n / 2; if (w.n && f >= w.a - h && f < w.a + h) return { cur: w.A, prev: wins[k - 1].A, u: (f - (w.a - h) + 0.5) / w.n }; }
    let k = 0; while (k + 1 < wins.length && wins[k + 1].a <= f) k++; return { cur: wins[k].A };
  };
  const show = A => { for (const x of acts) x.group.visible = x === A; stage.scene.background = A.background ?? bg0; };
  function frame(f) {
    const s = at(f); let ms = 0;
    if (s.prev) { show(s.prev); s.prev.update(f); ms += stage.render({ flash: s.prev.flash(f) }); stage.grab(); }
    show(s.cur); s.cur.update(f); ms += stage.render({ prev: s.prev ? 1 - s.u : 0, flash: s.cur.flash(f) });
    cap.draw(f); return ms;
  }
  window.__motion = f => { const s = at(f), p = at(Math.max(F0, f - 1)); show(s.cur); return { ...s.cur.motion(f), cut: !!s.prev || p.cur !== s.cur || !!p.prev || s.cur.flash(f) > 0.3 }; };   // dissolves and flash cuts
  window.__dbg = f => {
    const s = at(f); show(s.cur); const out = s.cur.dbg(f); out.act = s.cur.name; out.mix = s.prev ? +s.u.toFixed(2) : null;
    for (const A of acts) for (const a of A.actors) if (!out.actors[a.name]) out.actors[a.name] = { blink: 0, head: [0, 0, 0, 0], inFrame: false, verb: [] };
    return JSON.stringify(out);
  };
  // sound from the picture: every act's cues while that act is on screen, renamed to the sound bank
  window.__cues = () => {
    const out = []; let step = 0;
    for (const A of acts) for (const q of A.cues) {
      const s = at(q.fr); if (s.cur !== A && s.prev !== A) continue;
      if (q.fr > F1 - 2) continue;
      let name = SOUND[q.name] || q.name; if (name === 'step') { if (q.strength < 0.2 || (q.who && q.who !== 'kai')) continue; name = step++ % 2 ? 'step_r' : 'step_l'; }   // the hero's feet only
      if (!BANK.has(name)) continue;
      out.push({ t: +(q.fr / fps).toFixed(4), name, strength: +Math.min(1, Math.max(0.55, 0.55 + 0.6 * q.strength)).toFixed(2) });
    }
    return out.sort((a, b) => a.t - b.t);
  };
  window.__T_END = (F1 + 1) / fps;
  window.__frame = f => frame(f);
  frame(F0);
  window.__ready = true;
  return { R: R1, fps, F0, F1, stage, captions: cap, audio: `/${film}/vo/vo.wav` };
}
