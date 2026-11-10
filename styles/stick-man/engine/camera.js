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

export function createCamera({ aspect, side = [0, -1], bounds = null }) {
  const cam = new THREE.PerspectiveCamera(50, aspect, 0.05, 80), v = new THREE.Vector3();
  const set = (pos, aim, lens) => {
    cam.fov = 2 * Math.atan(18 / lens) / DEG; cam.position.copy(B(...pos)); cam.lookAt(B(...aim));
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  };
  const proj = p => { v.copy(B(...p)).project(cam); return [(v.x + 1) / 2, (1 - v.y) / 2]; };
  const tanV = lens => 18 / lens, tanH = lens => 18 / lens * aspect;

  // iterate distance and aim until the key point sits at (kx, ky) and the size metric hits its target
  function fit({ dir, h, lens, key, kx = 0.5, ky, metric, target, keepIn = [], extras = [], D0 = 3 }) {
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
        for (const s of [-1, 1]) { const [x] = proj([p[0] + r[0] * s, p[1] + r[1] * s, p[2]]); need = Math.max(need, Math.abs(x - 0.5) / 0.395); }
      }
      for (const p of extras) { const [x, y] = proj(p); need = Math.max(need, Math.abs(x - 0.5) / 0.40, (y - 0.5) / 0.11, (0.5 - y) / 0.40); }
      D = clamp(D * Math.pow(Math.min(need, 1.25), 0.7), 0.8, 9);
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

  // a solved camera for one shot at frame f; A(name) gives subject anchors at f
  function solve(S, f, A) {
    const K = { ...KIND[S.kind], ...S.opt }, t = f - S.f, k = Math.pow(1 + S.push, Math.max(0, t));   // push in = a growing size target,
    // so the framing rules (margins, extras) still hold while it pushes
    const drift = (S.drift ?? 0.05) * (S.i % 2 ? -1 : 1) * t;
    let c;
    if (S.kind === 'two' || S.kind === 'wide') {
      const subs = S.subjects.map(A), a = subs[0], b = subs[subs.length - 1];
      let dir = unit([-(b.head[1] - a.head[1]), b.head[0] - a.head[0]]);
      const sd = S.opt.from || side; if (dir[0] * sd[0] + dir[1] * sd[1] < 0) dir = [-dir[0], -dir[1]];
      dir = rot(dir, (S.opt.angle || 0) + drift);
      const key = [0, 1, 2].map(i => subs.reduce((s, x) => s + x.head[i], 0) / subs.length);
      c = fit({ dir, h: K.h, lens: K.lens, key, ky: K.headY, target: S.size0 * k, keepIn: subs.map(x => x.head),
        metric: () => Math.max(...subs.map(x => figFrac(x)())), D0: 3.5 });
    } else if (S.kind === 'ms' || S.kind === 'follow' || S.kind === 'cu') {
      const a = A(S.subjects[0]), extras = (S.opt.with || []).map(n => A(n).center);
      const yaw = S.opt.heading ?? a.yaw;                            // heading: frame from where he is about to face, not mid-turn
      const dir = rot([Math.sin(yaw * DEG), -Math.cos(yaw * DEG)], (S.opt.angle ?? (S.kind === 'cu' ? -18 : 12)) + drift);
      const key = a.head.slice();
      const metric = S.kind === 'cu' ? () => { const p = proj([a.head[0], a.head[1], a.head[2] + 0.30]), q = proj([a.head[0], a.head[1], a.head[2] - 0.30]); return q[1] - p[1]; } : figFrac(a);
      c = fit({ dir, h: K.h, lens: K.lens, key, kx: S.opt.kx ?? 0.5, ky: K.headY, target: (S.kind === 'cu' ? (S.opt.head ?? K.head) : S.size0) * k,
        keepIn: [a.head], extras, metric, D0: S.kind === 'cu' ? 2 : 3 });
      if (extras.length) {                                          // re-centre between the face and what is with it
        const all = [a.head, ...extras], cx = all.reduce((s, p) => s + p[0], 0) / all.length, cy = all.reduce((s, p) => s + p[1], 0) / all.length;
        const key2 = [lerp(a.head[0], cx, 0.45), lerp(a.head[1], cy, 0.45), a.head[2]];
        c = fit({ dir, h: K.h, lens: K.lens, key: key2, ky: K.headY + 0.04, target: (S.opt.head ?? K.head) * k, keepIn: [a.head], extras, metric,
          D0: Math.hypot(c.pos[0] - c.aim[0], c.pos[1] - c.aim[1]) });
      }
    } else if (S.kind === 'insert') {
      const p = A(S.subjects[0]).center, dir = rot(unit(S.opt.from || side), (S.opt.angle || 0) + drift), D = S.opt.dist ?? 0.9;
      c = { pos: [p[0] + dir[0] * D, p[1] + dir[1] * D, clamp(p[2] + 0.3, 1.1, 1.4)], aim: p.slice(), lens: K.lens };
    } else throw new Error(`camera: unknown shot ${S.kind}`);
    if (S.kind === 'insert') c.pos = lerp3(c.aim, c.pos, 1 / k);
    c.pos[2] = clamp(c.pos[2], 1.1, 1.4);
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
    c.dof = K.dof; c.focus = S.kind === 'insert' ? A(S.subjects[0]).center : A(S.subjects[0]).head;
    return c;
  }

  // shots: [{f, kind, subjects, opt}] sorted. Push rate and glide length are fixed here, once.
  function compile(shots, A, fEnd) {
    shots.forEach((S, i) => {
      S.i = i; const len = (shots[i + 1]?.f ?? fEnd) - S.f;
      const base = S.kind === 'wide' ? 0.0015 : (S.kind === 'two' || S.kind === 'ms') ? clamp(Math.log(1.13) / Math.max(1, len), 0.0015, 0.0035) : 0.0025;
      S.push = S.opt.push ?? base;
      S.size0 = clamp((S.opt.size ?? 0.46) / Math.pow(1 + S.push, len), KIND[S.kind].size ? 0.40 : 0, 0.46);
      if (S.kind === 'wide' || S.kind === 'follow') S.size0 = S.opt.size ?? KIND[S.kind].size;
      S.glide = 0;
      if (i > 0) {                                                  // pixel shift of the new key point at 720 wide
        const Af = n => A(n, S.f), a = solve(shots[i - 1], S.f, Af), b = solve(S, S.f, Af);
        set(a.pos, a.aim, a.lens); const pa = proj(b.aim);
        const scale = Math.abs(Math.log((Math.hypot(...a.pos.map((x, j) => x - a.aim[j])) / a.lens) / (Math.hypot(...b.pos.map((x, j) => x - b.aim[j])) / b.lens)));
        const shift = Math.hypot((pa[0] - 0.5) * 720, (pa[1] - 0.5) * 1280) + 640 * scale;
        S.glide = S.opt.glide ?? clamp(Math.ceil(1.875 * shift / 16), 18, 40);
      }
    });
    return shots;
  }

  // shot i at frame f, still blending out of shot i-1 (itself maybe still blending) during its glide
  function blended(shots, i, f, A) {
    const S = shots[i], c = solve(S, f, A);
    if (i === 0 || f >= S.f + S.glide) return c;
    const p = blended(shots, i - 1, f, A), u = smoother((f - S.f) / S.glide);
    return { pos: lerp3(p.pos, c.pos, u), aim: lerp3(p.aim, c.aim, u), lens: 18 / lerp(18 / p.lens, 18 / c.lens, u), dof: lerp(p.dof, c.dof, u),
      focus: lerp3(p.focus, c.focus, u) };
  }
  function at(shots, f, A, cues) {
    let i = 0; while (i + 1 < shots.length && shots[i + 1].f <= f) i++;
    const S = shots[i], c = blended(shots, i, f, A);
    // handheld breath + impact kick, as a sub-pixel-to-few-pixel view offset (px at 1920 tall)
    let ox = 0.9 * Math.sin(6.283 * f / 53 + 1.3) + 0.5 * Math.sin(6.283 * f / 23), oy = 0.7 * Math.sin(6.283 * f / 61) + 0.4 * Math.sin(6.283 * f / 29 + 2);
    for (const q of cues) { const d = f - q.fr; if (q.strength >= 0.6 && d >= 0 && d < 6) { const a = 9 * q.strength * KICK[d]; ox += a * 0.8; oy += a * 0.6; } }
    c.offset = [ox, oy]; c.shot = S.kind + '(' + S.subjects.join(',') + ')'; c.shotIndex = i;
    return c;
  }
  return { compile, at, solve, CAPTION, project: (c, p) => { set(c.pos, c.aim, c.lens); return proj(p); } };
}
