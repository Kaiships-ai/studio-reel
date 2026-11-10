// Shot solver: the reel names a shot (two, ms, cu, insert, wide, follow); this places camera and lens from where the
// subjects are on that frame, glides between shots (smootherstep, 18-40 frames, speed-capped), pushes in on holds,
// kicks on impacts and fades lens blur in for cu / insert. Blender coordinates; screen fractions are y-down.
import * as THREE from 'three';
import { B } from './look.js';
import { clamp, smoother, lerp, lerp3, DEG } from './verbs.js';

const KICK = [1, -0.78, 0.55, -0.33, 0.16, -0.05];               // flips sign every frame, gone in 6
const CAPTION = [0.66, 0.78];
const KIND = {
  two: { lens: 28, h: 1.25, size: 0.43, headY: 0.33, dof: 0 },
  ms: { lens: 30, h: 1.25, size: 0.43, headY: 0.32, dof: 0 },
  follow: { lens: 28, h: 1.22, size: 0.44, headY: 0.32, dof: 0 },
  cu: { lens: 38, h: 1.38, head: 0.25, headY: 0.30, dof: 0.6 },
  insert: { lens: 40, h: 1.30, dof: 1 },
  wide: { lens: 26, h: 1.30, size: 0.26, headY: 0.36, dof: 0 },
};

export function createCamera({ aspect, side = [0, -1], bounds = null, zRange = [1.1, 1.4], actors = [] }) {
  const cam = new THREE.PerspectiveCamera(50, aspect, 0.05, 80), v = new THREE.Vector3();
  const set = (pos, aim, lens) => {
    cam.fov = 2 * Math.atan(18 / lens) / DEG; cam.position.copy(B(...pos)); cam.lookAt(B(...aim));
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  };
  const proj = p => { v.copy(B(...p)).project(cam); return [(v.x + 1) / 2, (1 - v.y) / 2]; };
  const tanV = lens => 18 / lens, tanH = lens => 18 / lens * aspect;

  // iterate distance and aim until the key point sits at (kx, ky) and the size metric hits its target
  function fit({ dir, h, lens, key, kx = 0.5, ky, metric, target, keepIn = [], extras = [], D0 = 3, edge = 0.395 }) {
    let D = D0, aim = key.slice();
    for (let it = 0; it < 9; it++) {
      const pos = [aim[0] + dir[0] * D, aim[1] + dir[1] * D, h];
      set(pos, aim, lens);
      const m = metric();
      if (m > 1e-4) D = clamp(D * clamp(m / target, 0.6, 1.6), 0.8, 9);
      // back off just enough (continuous in the inputs, so a moving prop never makes the framing flicker)
      let need = 1;
      for (const p of keepIn) {                                    // head-box edges (not centres) inside x 10.5-89.5 %
        const r = [-dir[1] * 0.31, dir[0] * 0.31];
        for (const s of [-1, 1]) { const [x] = proj([p[0] + r[0] * s, p[1] + r[1] * s, p[2]]); need = Math.max(need, Math.abs(x - 0.5) / edge); }
      }
      for (const p of extras) { const [x, y] = proj(p); need = Math.max(need, Math.abs(x - 0.5) / 0.40, (y - 0.5) / 0.11, (0.5 - y) / 0.40); }
      D = clamp(D * Math.min(need, 1.6), 0.8, 9);                  // the margins win over the size target
      const pos2 = [aim[0] + dir[0] * D, aim[1] + dir[1] * D, h];
      set(pos2, aim, lens);
      const [x, y] = proj(key), depth = Math.hypot(key[0] - pos2[0], key[1] - pos2[1]);
      const R = [-dir[1], dir[0]];                                  // camera right (looking along -dir)
      const sx = (x - kx) * 2 * tanH(lens) * depth, sy = (y - ky) * 2 * tanV(lens) * depth;
      aim = [aim[0] + R[0] * sx * 0.9, aim[1] + R[1] * sx * 0.9, aim[2] - sy * 0.9];
    }
    return { pos: [aim[0] + dir[0] * D, aim[1] + dir[1] * D, h], aim, lens };
  }
  const rot = (d, deg) => { const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG); return [d[0] * c - d[1] * s, d[0] * s + d[1] * c]; };
  const unit = d => { const l = Math.hypot(d[0], d[1]) || 1; return [d[0] / l, d[1] / l]; };
  const figFrac = a => () => { const t = proj(a.top), s = proj(a.sole); return s[1] - t[1]; };

  const add = (a, b) => a.map((x, i) => x + b[i]);
  // edge rule: the subjects' head boxes stay inside x 9-91 % (a small pan of the aim, continuous in the inputs)
  function keep(c, S, A, w, f) {
    if (w <= 0 || S.kind === 'insert' || S.opt.edge === false) return c;
    set(c.pos, c.aim, c.lens);
    const dx = [c.aim[0] - c.pos[0], c.aim[1] - c.pos[1]], R = unit([dx[1], -dx[0]]);
    const box = h => { const a = proj([h[0] - R[0] * 0.31, h[1] - R[1] * 0.31, h[2]]), b = proj([h[0] + R[0] * 0.31, h[1] + R[1] * 0.31, h[2]]);
      v.copy(B(...h)).project(cam); return v.z < 1 ? [Math.min(a[0], b[0]), Math.max(a[0], b[0])] : null; };
    let lo = -0.2, hi = 0.2;
    for (const n of S.subjects) { const a = A(n); if (!a.top) continue; const bx = box(a.head); if (!bx) continue;
      lo = Math.max(lo, 0.09 - bx[0]); hi = Math.min(hi, 0.91 - bx[1]); }
    let d = lo > hi ? (lo + hi) / 2 : clamp(0, lo, hi);
    if (S.dplan && f != null) d = clamp(d + S.dplan[Math.max(0, Math.min(S.dplan.length - 1, f - S.f))], Math.min(lo, hi), Math.max(lo, hi));
    if (Math.abs(d) < 1e-5) return c;
    const a = Math.atan(2 * d * tanH(c.lens)) * w, co = Math.cos(a), si = Math.sin(a);
    const aim = [c.pos[0] + dx[0] * co - dx[1] * si, c.pos[1] + dx[0] * si + dx[1] * co, c.aim[2]];
    return { ...c, aim };
  }
  // other heads that straddled an edge when the shot settled: how far to pan so each is fully in or fully out
  function planDelta(c, S, A) {
    if (!S.plan?.length) return 0;
    set(c.pos, c.aim, c.lens);
    const dx = [c.aim[0] - c.pos[0], c.aim[1] - c.pos[1]], R = unit([dx[1], -dx[0]]); let d = 0;
    for (const [n, side, mode] of S.plan) {
      const h = A(n).head; v.copy(B(...h)).project(cam); if (v.z >= 1) continue;
      const a = proj([h[0] - R[0] * 0.31, h[1] - R[1] * 0.31, h[2]])[0], b = proj([h[0] + R[0] * 0.31, h[1] + R[1] * 0.31, h[2]])[0];
      const x0 = Math.min(a, b) + d, x1 = Math.max(a, b) + d;
      if (side < 0) d += mode === 'out' ? Math.min(0, -0.002 - x1) : Math.max(0, 0.09 - x0);
      else d += mode === 'out' ? Math.max(0, 1.002 - x0) : Math.min(0, 0.91 - x1);
    }
    return clamp(d, -0.16, 0.16);
  }
  // a solved camera for one shot at frame f; A(name) gives subject anchors at f
  function solve(S, f, A) {
    const K = { ...KIND[S.kind], ...S.opt }, t = f - S.f, k = Math.pow(1 + S.push, Math.max(0, t));   // push in = a growing size target,
    // so the framing rules (margins, extras) still hold while it pushes
    const drift = (S.drift ?? 0.05) * (S.i % 2 ? -1 : 1) * t;
    let c;
    if (S.kind === 'two' || S.kind === 'wide') {
      const subs = S.subjects.map(A), a = subs[0], b = subs[subs.length - 1];
      const sd = S.opt.from || side;
      let dir = Math.hypot(b.head[0] - a.head[0], b.head[1] - a.head[1]) < 0.3 || S.opt.dir ? unit(S.opt.dir || sd)
        : unit([-(b.head[1] - a.head[1]), b.head[0] - a.head[0]]);
      if (dir[0] * sd[0] + dir[1] * sd[1] < 0) dir = [-dir[0], -dir[1]];
      dir = rot(dir, (S.opt.angle || 0) + drift);
      const key = [0, 1, 2].map(i => subs.reduce((s, x) => s + x.head[i], 0) / subs.length);
      c = fit({ dir, h: K.h, lens: K.lens, key, ky: K.headY, target: S.size0 * k, keepIn: subs.map(x => x.head),
        metric: () => Math.max(...subs.map(x => figFrac(x)())), D0: 3.5, edge: S.kind === 'two' ? Math.min(0.36, 0.30 * k) : Math.min(0.39, 0.35 * k) });   // a two-shot leaves air at the edges
    } else if (S.kind === 'ms' || S.kind === 'follow' || S.kind === 'cu') {
      const a = A(S.subjects[0]), extras = (S.opt.with || []).map(n => A(n).center);
      const yaw = S.opt.heading ?? a.yaw;                            // heading: frame from where he is about to face, not mid-turn
      const dir = rot([Math.sin(yaw * DEG), -Math.cos(yaw * DEG)], (S.opt.angle ?? (S.kind === 'cu' ? -18 : 12)) + drift);
      // live (0..1): follow that share of the posed head's sideways drift (lean, tilts) instead of the body-channel head
      const lw = S.opt.live === true ? 0.5 : S.opt.live || 0, key = a.live && lw ? [lerp(a.head[0], a.live[0], lw), lerp(a.head[1], a.live[1], lw), a.head[2]] : a.head.slice();
      // track: { s, delay, ramp } = the camera follows only a share s of the subject's travel since the shot began, rising
      // to all of it over `ramp` frames after `delay`: he walks across the frame and the floor slides by under him
      if (S.opt.track && S.a0) {
        const T = S.opt.track, u = (T.s ?? 0.45) + (1 - (T.s ?? 0.45)) * smoother((t - (T.delay || 0)) / (T.ramp || 40));
        for (let j = 0; j < 2; j++) key[j] = S.a0[j] + (a.head[j] - S.a0[j]) * u;
      }
      const metric = S.kind === 'cu' ? () => { const p = proj([a.head[0], a.head[1], a.head[2] + 0.30]), q = proj([a.head[0], a.head[1], a.head[2] - 0.30]); return q[1] - p[1]; } : figFrac(a);
      c = fit({ dir, h: K.h, lens: K.lens, key, kx: S.opt.kx ?? 0.5, ky: K.headY, target: (S.kind === 'cu' ? (S.opt.head ?? K.head) : S.size0) * k,
        keepIn: [a.head], extras, metric, D0: S.kind === 'cu' ? 2 : 3 });
      if (extras.length) {                                          // re-centre between the face and what is with it
        const all = [a.head, ...extras], cx = all.reduce((s, p) => s + p[0], 0) / all.length, cy = all.reduce((s, p) => s + p[1], 0) / all.length;
        const key2 = [lerp(a.head[0], cx, 0.45), lerp(a.head[1], cy, 0.45), a.head[2]];
        c = fit({ dir, h: K.h, lens: K.lens, key: key2, ky: K.headY + 0.04, target: (S.kind === 'cu' ? (S.opt.head ?? K.head) : S.size0) * k, keepIn: [a.head], extras, metric,
          D0: Math.hypot(c.pos[0] - c.aim[0], c.pos[1] - c.aim[1]) });
      }
    } else if (S.kind === 'insert') {
      const p = add(A(S.subjects[0]).center, S.opt.at || [0, 0, 0]), dir = rot(unit(S.opt.from || side), (S.opt.angle || 0) + drift), D = S.opt.dist ?? 0.9;
      c = { pos: [p[0] + dir[0] * D, p[1] + dir[1] * D, S.opt.z ?? clamp(p[2] + (S.opt.rise ?? 0.3), zRange[0], zRange[1])], aim: p.slice(), lens: K.lens };
    } else throw new Error(`camera: unknown shot ${S.kind}`);
    if (S.kind === 'insert') c.pos = lerp3(c.aim, c.pos, 1 / k);
    c.pos[2] = clamp(c.pos[2], zRange[0], zRange[1]);
    if (c.pos.some(Number.isNaN)) throw new Error(`camera: no solution for ${S.kind}(${S.subjects}) at frame ${f}: ${JSON.stringify([...S.subjects, ...(S.opt.with || [])].map(n => A(n)))}`);
    if (bounds) {                                                   // walls: clamp into the nearest allowed box, then slide along
      let best = null, bd = 1e9, box = null;                        // the wall to keep the distance to the aim (no whip pan)
      for (const [lo, hi] of bounds) { const q = [clamp(c.pos[0], lo[0], hi[0]), clamp(c.pos[1], lo[1], hi[1])], d = Math.hypot(q[0] - c.pos[0], q[1] - c.pos[1]); if (d < bd) { bd = d; best = q; box = [lo, hi]; } }
      if (bd > 1e-6) {
        const R = Math.hypot(c.pos[0] - c.aim[0], c.pos[1] - c.aim[1]);
        for (const j of [0, 1]) if (best[j] !== c.pos[j]) {
          const k = 1 - j, dj = best[j] - c.aim[j], r2 = R * R - dj * dj;
          if (r2 > 0) best[k] = clamp(c.aim[k] + Math.sign(c.pos[k] - c.aim[k] || 1) * Math.sqrt(r2), box[0][k], box[1][k]);
        }
      }
      c.pos[0] = best[0]; c.pos[1] = best[1];
    }
    c.dof = K.dof; c.focus = S.kind === 'insert' ? c.aim.slice() : A(S.subjects[0]).head;
    return keep(c, S, A, 1, f);
  }

  // shots: [{f, kind, subjects, opt}] sorted. Push rate and glide length are fixed here, once.
  function compile(shots, A, fEnd) {
    shots.forEach((S, i) => {
      if (S.opt.track) S.a0 = A(S.subjects[0], S.f).head.slice();
      S.i = i; const len = (shots[i + 1]?.f ?? fEnd) - S.f;
      const base = S.kind === 'wide' ? 0.0017 : (S.kind === 'two' || S.kind === 'ms') ? clamp(Math.log(1.13) / Math.max(1, len), 0.0019, 0.0035) : 0.0025;
      S.push = S.opt.push ?? base;
      S.size0 = clamp((S.opt.size ?? 0.46) / Math.pow(1 + S.push, len), KIND[S.kind].size ? 0.30 : 0, 0.46);
      if (S.kind === 'wide' || S.kind === 'follow') S.size0 = S.opt.size ?? KIND[S.kind].size;
      S.glide = 0;
      if (i > 0) {                                                  // pixel shift of the new key point at 720 wide
        const Af = n => A(n, S.f), a = solve(shots[i - 1], S.f, Af), b = solve(S, S.f, Af);
        set(a.pos, a.aim, a.lens); const pa = proj(b.aim);
        const scale = Math.abs(Math.log((Math.hypot(...a.pos.map((x, j) => x - a.aim[j])) / a.lens) / (Math.hypot(...b.pos.map((x, j) => x - b.aim[j])) / b.lens)));
        const shift = Math.hypot((pa[0] - 0.5) * 720, (pa[1] - 0.5) * 1280) + 640 * scale;
        // long enough that the smootherstep peak stays near 18 px/frame; the speed limit wins over a short asked-for glide
        S.glide = Math.max(S.opt.glide ?? 0, clamp(Math.ceil(1.875 * shift / 18), 18, 40));
        if (S.opt.cut) S.glide = 0;                                  // a cut hidden by a flash: no glide
      }
    });
    shots.forEach((S, i) => {                                      // plan the other heads at the frame the shot has settled
      if (S.kind === 'insert' || !actors.length) return;
      const f = Math.min(S.f + S.glide, (shots[i + 1]?.f ?? fEnd) - 1), Af = n => A(n, f), c = solve(S, f, Af);
      set(c.pos, c.aim, c.lens); const plan = [];
      const dx = [c.aim[0] - c.pos[0], c.aim[1] - c.pos[1]], R = unit([dx[1], -dx[0]]);
      for (const n of actors) {
        if (S.subjects.includes(n)) continue; const h = Af(n).head;
        v.copy(B(...h)).project(cam); if (v.z >= 1) continue;
        const a = proj([h[0] - R[0] * 0.31, h[1] - R[1] * 0.31, h[2]])[0], b = proj([h[0] + R[0] * 0.31, h[1] + R[1] * 0.31, h[2]])[0];
        const x0 = Math.min(a, b), x1 = Math.max(a, b), xc = (x0 + x1) / 2;
        // a close-up keeps its subject centred: any other head on an edge is pushed out, never pulled in
        const cu = S.kind === 'cu';
        if (x0 < 0.085 && x1 > 0) plan.push([n, -1, cu || xc < 0.085 ? 'out' : 'in']);
        else if (x1 > 0.915 && x0 < 1) plan.push([n, 1, cu || xc > 0.915 ? 'out' : 'in']);
      }
      S.plan = plan; if (!plan.length) return;
      // the pan they need, frame by frame, then limited to 0.010 of the width per frame (both ways, so it starts early)
      const end = Math.min(fEnd, (shots[i + 1]?.f ?? fEnd) + 90), raw = [];
      for (let g = S.f; g <= end; g++) { const Ag = n => A(n, g); raw.push(planDelta(solve(S, g, Ag), S, Ag)); }
      const L = 0.010, q = raw.slice();
      for (let k = 1; k < q.length; k++) q[k] = clamp(q[k], q[k - 1] - L, q[k - 1] + L);
      for (let k = q.length - 2; k >= 0; k--) q[k] = clamp(q[k], q[k + 1] - L, q[k + 1] + L);
      S.dplan = q;
    });
    for (let i = 1; i < shots.length; i++) pace(shots, i, A);
    return shots;
  }

  // shot i at frame f, still blending out of shot i-1 (itself maybe still blending) during its glide
  function blended(shots, i, f, A, uSet) {
    const S = shots[i], c = solve(S, f, A);
    if (i === 0 || f >= S.f + S.glide) return c;
    const p = blended(shots, i - 1, f, A), u = uSet ?? (S.prog ? S.prog[f - S.f] ?? 1 : smoother((f - S.f) / S.glide));
    const m = { pos: lerp3(p.pos, c.pos, u), aim: lerp3(p.aim, c.aim, u), lens: 18 / lerp(18 / p.lens, 18 / c.lens, u), dof: lerp(p.dof, c.dof, u),
      focus: lerp3(p.focus, c.focus, u) };
    // mid-glide the straight blend can carry a head across the frame edge: re-apply the edge rule, faded in with the glide
    return { ...keep(m, S, A, smoother(Math.min(1, u / 0.3))), u };   // subjects only: the plan pan is already inside c
  }
  // screen move between two cameras: mean over a 3x3 grid at the aim's depth (0.8 of the half frame), px at 720 x 1280
  function move(c0, c1) {
    const d = Math.hypot(...c1.pos.map((x, i) => x - c1.aim[i])), fw = c1.aim.map((x, i) => (x - c1.pos[i]) / d);
    const rt = [fw[1], -fw[0], 0].map(x => x / (Math.hypot(fw[0], fw[1]) || 1)), up = [rt[1] * fw[2] - rt[2] * fw[1], rt[2] * fw[0] - rt[0] * fw[2], rt[0] * fw[1] - rt[1] * fw[0]];
    const hw = d * tanH(c1.lens), hh = d * tanV(c1.lens), Q = [];
    for (const i of [-0.8, 0, 0.8]) for (const j of [-0.8, 0, 0.8]) Q.push(c1.aim.map((x, k) => x + rt[k] * hw * i + up[k] * hh * j));
    set(c0.pos, c0.aim, c0.lens); const a = Q.map(proj); set(c1.pos, c1.aim, c1.lens);
    return Q.reduce((s, q, k) => { const b = proj(q); return s + Math.hypot((b[0] - a[k][0]) * 720, (b[1] - a[k][1]) * 1280) / 9; }, 0);
  }
  // speed cap: walk the glide frame by frame; where the smootherstep step would move the frame more than CAP px,
  // take the largest step under it (bisection). The glide then runs a little longer than asked, never faster.
  const CAP = 19;
  function pace(shots, i, A) {
    const S = shots[i]; if (!S.glide) return;
    const G = S.glide; S.glide = G + 400; S.prog = null;            // blended() must see the glide as running while it is paced
    const prog = [0]; let prev = blended(shots, i, S.f, n => A(n, S.f), 0), u = 0;
    for (let t = 1; t < G + 400 && u < 1 - 1e-4; t++) {
      const f = S.f + t, Af = n => A(n, f), want = Math.max(u, smoother(t / G));
      let c = blended(shots, i, f, Af, want), v = want;
      if (move(prev, c) > CAP) {
        let lo = u, hi = want;
        for (let k = 0; k < 7; k++) { const m = (lo + hi) / 2; if (move(prev, blended(shots, i, f, Af, m)) > CAP) hi = m; else lo = m; }
        v = lo; c = blended(shots, i, f, Af, v);
      }
      prog.push(v); u = v; prev = c;
    }
    if (u < 1 - 1e-4) prog.push(1);
    S.prog = prog; S.glide = prog.length - 1;
  }
  function at(shots, f, A, cues) {
    let i = 0; while (i + 1 < shots.length && shots[i + 1].f <= f) i++;
    const S = shots[i], c = blended(shots, i, f, A);
    // handheld breath + impact kick, as a sub-pixel-to-few-pixel view offset (px at 1920 tall)
    let ox = 0.9 * Math.sin(6.283 * f / 53 + 1.3) + 0.5 * Math.sin(6.283 * f / 23), oy = 0.7 * Math.sin(6.283 * f / 61) + 0.4 * Math.sin(6.283 * f / 29 + 2);
    for (const q of cues) { const d = f - q.fr; if (q.strength >= 0.6 && d >= 0 && d < 6) { const a = 7 * q.strength * KICK[d]; ox += a * 0.8; oy += a * 0.6; } }
    c.offset = [ox, oy]; c.shot = S.kind + '(' + S.subjects.join(',') + ')'; c.shotIndex = i;
    return c;
  }
  return { compile, at, solve, CAPTION, project: (c, p) => { set(c.pos, c.aim, c.lens); return proj(p); } };
}
