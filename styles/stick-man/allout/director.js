// Hand-directed camera for an act (`act.direct`, read by engine/play.js). Built from the reference breakdown
// (.claude/skills/make-reel-stick-man/DIRECTOR.md): the camera holds while a line is said, and moves only for a reason the
// shot names (`intent`), started by a word or an action (`move.from`). Shots inside a place change by a cut, a dissolve or
// a whip; nothing glides between shots on its own, nothing pushes in to fill time.
//
// A shot: { at, intent, why, cut: 'cut' | 'dissolve' | 'whip', n (frames of the dissolve / whip), cam, to, move, kick, dof }
//   at      a beat ref ({ line, on, offset } or { f }) where the shot starts
//   travel  the travel's ease for cut 'move' / 'whip': 'inout' (default), 'rush' (hold, then rush), 'land', 'out'
//   cut     'move' (default after the first shot: the camera travels from the last framing to this one over n frames,
//           16 by default), 'whip' (the same travel in ~8 frames, smeared), 'dissolve' (n frames), 'cut' (a hard cut:
//           the reference has one or two per film, keep it for a stop beat)
//   cam/to  camera specs; with `to` the camera moves from cam to to over `move` (from / to beat refs or dur frames, ease)
//   spec    { look, up, az, el, d, lens, kx, ky, roll, track } (orbit round a target) or { pos, aim, lens } (absolute) or
//           { chase: { a, b, ax, ay, bx, by, back, up }, lens } (two subjects pinned to two screen points)
//   preset  'hero' | 'macro' | 'wide' (PRESETS: lens, distance, height and focus defaults the cam / to leave out)
//           look: an actor ('kip' = head, 'kip.chest', 'kip.hips', 'kip.feet'), a prop / place / effect name, or [x, y, z]
//           az: degrees round the target (0 = from -y, + = camera to the right), el: degrees above, d: metres,
//           kx / ky: where the target sits on screen (0..1, y down), track: follow the target every frame
//   move    { from, to, dur, ease: 'inout' | 'out' | 'in' | 'linear' | 'whip' }
//   kick    [{ at, amp }]: a short camera shake on an impact word
//   drift   share of the camera-to-aim distance closed per second (a slow push); act `directDrift` sets it for every shot
//   dof     { gain, band }: lens blur round the look target
// Blender coordinates (x right, y into the set, z up), like the rest of the engine.
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => a.map((x, i) => lerp(x, b[i], t));
const DEG = Math.PI / 180;
const EASE = {
  linear: t => t,
  inout: t => t * t * t * (t * (t * 6 - 15) + 10),
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  // a whip: almost all of the travel in the middle third (the eye can't follow it; the smear covers it)
  whip: t => { const u = clamp((t - 0.3) / 0.4, 0, 1); return u * u * (3 - 2 * u); },
  // ease-out with a small settle past the end and back (a punch that lands)
  // hold, then rush (FORENSIC section 2: the reference holds, then moves at 40-100 px/f and settles): no smear, a crisp travel
  rush: t => { const u = clamp((t - 0.12) / 0.7, 0, 1); return u * u * u * (u * (u * 6 - 15) + 10); },
  land: t => { const u = 1 - Math.pow(1 - t, 3); return u + 0.06 * Math.sin(Math.PI * clamp(t * 1.15, 0, 1)) * (1 - t); },
};
const KICK = [1, -0.75, 0.5, -0.3, 0.15, -0.05];

// lens presets (study gap 3): `preset` on a shot fills what its cam / to leave out
//   hero: close and low on a wide lens, looking up a little (the reference's big heads and foreshortened hands)
//   macro: an insert on a long lens with a thin band of focus (the room melts away)
//   wide: an establishing frame on a wide lens
export const PRESETS = {
  hero: { cam: { lens: 22, d: 1.55, el: -14, ky: 0.42 }, dof: { gain: 0.4 } },
  macro: { cam: { lens: 45, d: 0.45, el: 4, ky: 0.5 }, dof: { gain: 1.0, band: [0.93, 1.08] } },
  wide: { cam: { lens: 24, el: 4, ky: 0.5 } },
};
const withPreset = s => { const P = PRESETS[s.preset]; if (!P) return s;
  const fill = c => c && !c.pos && !c.chase ? { ...P.cam, ...c } : c;
  return { ...s, cam: fill(s.cam), to: fill(s.to), dof: s.dof ?? P.dof }; };

export function createDirector(list, { frameOf, anchor, aspect, F1, dofAuto, drift = 0 }) {
  // drift (act `directDrift`, share of the distance per second): every shot without its own `drift` breathes in slowly, so the
  // camera is never dead still between moves (the rail reference drifts a median 2.9 px/f at 1080; a held three.js shot is 0)
  const shots = list.map(withPreset).map((s, i) => ({ drift, ...s, i, f: frameOf(s.at) })).sort((a, b) => a.f - b.f);
  shots.forEach((s, i) => {
    s.end = i + 1 < shots.length ? shots[i + 1].f : F1 + 1;
    if (s.to) {
      const m = s.move || {};
      s.m0 = m.from ? frameOf(m.from) : s.f;
      s.m1 = m.to ? frameOf(m.to) : s.m0 + (m.dur ?? (s.end - s.m0));
      s.ease = EASE[m.ease || 'inout'];
    }
    s.kicks = (s.kick || []).map(k => ({ f: frameOf(k.at), amp: k.amp ?? 1 }));
  });
  const idx = f => { let i = 0; while (i + 1 < shots.length && shots[i + 1].f <= f) i++; return i; };

  const point = (look, f) => {
    if (Array.isArray(look)) return look;
    const [n, part] = String(look).split('.');
    const a = anchor(n, f);
    if (!a.sole) return a.center || a.head;                     // a prop, an effect or a place
    const h = a.head, z0 = a.sole[2] || 0;
    if (part === 'chest') return [h[0], h[1], z0 + 1.10];
    if (part === 'hips') return [h[0], h[1], z0 + 0.80];
    if (part === 'feet') return [h[0], h[1], z0 + 0.10];
    if (part === 'top') return a.top;
    return h;
  };
  // one camera from a spec at frame f (target frozen at fFreeze unless the spec tracks)
  function solve(sp, f, fFreeze) {
    if (sp.pos) return { pos: sp.pos, aim: sp.aim, lens: sp.lens ?? 35, roll: sp.roll || 0, focus: sp.focus || sp.aim };
    if (sp.chase) return chase(sp.chase, sp.lens ?? 26, f);
    let tg = point(sp.look, sp.track ? f : fFreeze);
    tg = [tg[0] + (sp.dx || 0), tg[1] + (sp.dy || 0), tg[2] + (sp.up || 0)];
    const az = (sp.az ?? 0) * DEG, el = (sp.el ?? 0) * DEG, d = sp.d ?? 3, lens = sp.lens ?? 35;
    const dir = [Math.sin(az) * Math.cos(el), -Math.cos(az) * Math.cos(el), Math.sin(el)];
    const pos = tg.map((x, i) => x + dir[i] * d);
    // put the target at (kx, ky) on screen: shift the aim along the camera's right / up axes
    const fw = dir.map(x => -x), R = [Math.cos(az), Math.sin(az), 0];
    const U = [R[1] * fw[2] - R[2] * fw[1], R[2] * fw[0] - R[0] * fw[2], R[0] * fw[1] - R[1] * fw[0]];
    const tv = 18 / lens, th = tv * aspect;
    const dx = ((sp.kx ?? 0.5) - 0.5) * 2 * th * d, dy = -((sp.ky ?? 0.5) - 0.5) * 2 * tv * d;
    const aim = tg.map((x, i) => x - R[i] * dx - U[i] * dy);
    return { pos, aim, lens, roll: sp.roll || 0, focus: tg };
  }
  // chase (study gap 11): pin two moving things to two screen points (the bullet big low-left, the far gunfighter at the
  // centre): the camera rides behind A away from B at `back` m and `up` m; side and height offsets are solved (Newton, numeric
  // Jacobian) so A lands on (ax, ay) while the aim keeps B on (bx, by). c: { a, b, ax, ay, bx, by, back, up }
  const Z = [0, 0, 1], sub = (a, b) => a.map((x, i) => x - b[i]), nrm = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const aimFor = (pos, B, bx, by, lens) => { const fw = nrm(sub(B, pos)), R = nrm(cross(fw, Z)), U = cross(R, fw), d = Math.hypot(...sub(B, pos)), tv = 18 / lens, th = tv * aspect;
    const dx = (bx - 0.5) * 2 * th * d, dy = -(by - 0.5) * 2 * tv * d; return B.map((x, i) => x - R[i] * dx - U[i] * dy); };
  const project = (pos, aim, lens, P) => { const F = nrm(sub(aim, pos)), R = nrm(cross(F, Z)), U = cross(R, F), v = sub(P, pos), z = dot(v, F), tv = 18 / lens, th = tv * aspect;
    return [0.5 + 0.5 * dot(v, R) / z / th, 0.5 - 0.5 * dot(v, U) / z / tv]; };
  function chase(c, lens, f) {
    const A = point(c.a, f), B = point(c.b, f), back = nrm([A[0] - B[0], A[1] - B[1], 0]), side = nrm(cross(Z, back));
    const at = (s, h) => { const pos = A.map((x, i) => x + back[i] * (c.back ?? 0.6) + side[i] * s + Z[i] * ((c.up ?? 0.1) + h)); return { pos, aim: aimFor(pos, B, c.bx ?? 0.5, c.by ?? 0.4, lens) }; };
    const res = (s, h) => { const q = at(s, h), p = project(q.pos, q.aim, lens, A); return [p[0] - (c.ax ?? 0.3), p[1] - (c.ay ?? 0.7)]; };
    let s = 0, h = 0;
    for (let it = 0; it < 8; it++) { const r = res(s, h); if (Math.hypot(...r) < 1e-3) break; const e = 0.01, rs = res(s + e, h), rh = res(s, h + e);
      const J = [[(rs[0] - r[0]) / e, (rh[0] - r[0]) / e], [(rs[1] - r[1]) / e, (rh[1] - r[1]) / e]], det = J[0][0] * J[1][1] - J[0][1] * J[1][0]; if (Math.abs(det) < 1e-9) break;
      s = clamp(s - (J[1][1] * r[0] - J[0][1] * r[1]) / det, -2, 2); h = clamp(h - (-J[1][0] * r[0] + J[0][0] * r[1]) / det, -1.5, 2); }
    const q = at(s, h); return { pos: q.pos, aim: q.aim, lens, roll: 0, focus: A };
  }
  const mixSpec = (a, b, t) => {
    if (a.pos || b.pos || a.chase || b.chase) return null;
    const o = { ...b };
    for (const k of ['az', 'el', 'd', 'lens', 'kx', 'ky', 'up', 'roll', 'dx', 'dy']) {
      const x = a[k] ?? (k === 'kx' || k === 'ky' ? 0.5 : k === 'lens' ? 35 : k === 'd' ? 3 : 0), y = b[k] ?? (k === 'kx' || k === 'ky' ? 0.5 : k === 'lens' ? 35 : k === 'd' ? 3 : 0);
      o[k] = k === 'lens' ? 18 / lerp(18 / x, 18 / y, t) : k === 'd' ? Math.exp(lerp(Math.log(x), Math.log(y), t)) : lerp(x, y, t);
    }
    return o;
  };
  function camOf(S, f) {
    const f0 = S.f;
    let c;
    if (!S.to) c = solve(S.cam, f, f0);
    else {
      const t = S.ease(clamp((f - S.m0) / Math.max(1, S.m1 - S.m0), 0, 1));
      const ms = S.cam.look === S.to.look || (!S.cam.look && !S.to.look) ? mixSpec(S.cam, S.to, t) : null;
      if (ms) c = solve(ms, f, S.to.track ? f : f0);
      else {                                                    // two targets (follow the ball to the frog): blend the cameras
        const a = solve(S.cam, f, f0), b = solve(S.to, f, S.to.track ? f : Math.max(f0, S.m0));
        c = { pos: lerp3(a.pos, b.pos, t), aim: lerp3(a.aim, b.aim, t), lens: 18 / lerp(18 / a.lens, 18 / b.lens, t), roll: lerp(a.roll, b.roll, t), focus: lerp3(a.focus, b.focus, t) };
      }
    }
    // a slow breath on a held shot only where the shot asks for it (drift: share of the distance per second)
    // the push is measured on min(distance, 4 m), so a far aim point (an absolute pos / aim shot) does not fly the camera
    if (S.drift) { const d = Math.hypot(...c.pos.map((x, i) => x - c.aim[i])), step = Math.min(0.5 * d, S.drift * (f - f0) / 30 * Math.min(d, 4));
      c.pos = c.pos.map((x, i) => x + (c.aim[i] - x) * step / Math.max(d, 1e-6)); }
    let ox = 0, oy = 0;
    for (const q of S.kicks) { const d = f - q.f; if (d >= 0 && d < KICK.length) { ox += 9 * q.amp * KICK[d]; oy += 6 * q.amp * KICK[d]; } }
    // dofAuto (act look.dofAuto: { below (m), gain }): a shot without its own dof gets a lens blur when the camera is close
    const near = dofAuto && !S.dof ? Math.hypot(...c.pos.map((x, i) => x - c.focus[i])) < (dofAuto.below ?? 2.2) : false;
    const D = S.dof || (near ? { gain: dofAuto.gain ?? 0.35 } : null);
    return { ...c, offset: [ox, oy], dof: D ? (D.gain ?? 0.8) : 0, band: D?.band || null, shot: S.intent || 'shot', shotIndex: S.i, why: S.why || '' };
  }
  const kind = S => S.i === 0 ? 'cut' : (S.cut || 'move');
  const travel = (S, f) => { const n = S.n ?? (kind(S) === 'whip' ? 8 : 16), d = f - S.f; return d >= 0 && d < n ? (d + 0.5) / n : null; };
  return {
    shots,
    at(f, force = null) {
      const i = force ?? idx(f), S = shots[i], c = camOf(S, f);
      const k = kind(S), u = force == null && (k === 'move' || k === 'whip') ? travel(S, f) : null;
      if (u == null) return c;
      // the camera travels from where the last shot is now to this one (no cut): eased, the aim leads a little
      // S.travel picks the travel's ease ('rush' = hold then rush, crisp; 'land' = arrive with a small settle past the mark)
      const te = EASE[S.travel || (k === 'whip' ? 'whip' : 'inout')], p = camOf(shots[i - 1], f), t = te(u), ta = te(Math.min(1, u * 1.15));
      return { ...c, pos: lerp3(p.pos, c.pos, t), aim: lerp3(p.aim, c.aim, ta), lens: 18 / lerp(18 / p.lens, 18 / c.lens, t), roll: lerp(p.roll || 0, c.roll || 0, t),
        focus: lerp3(p.focus, c.focus, t), dof: lerp(p.dof, c.dof, t) };
    },
    // a dissolve crossfades from the shot before over its first n frames; a whip smears the travel (u 1 = no crossfade)
    mixAt(f) {
      const i = idx(f), S = shots[i], k = kind(S);
      if (k === 'dissolve') { const n = S.n ?? 10, d = f - S.f; return d < n ? { i: i - 1, u: (d + 0.5) / n, whip: 0 } : null; }
      if (k === 'whip') { const u = travel(S, f); return u == null ? null : { i, u: 1, ws: u, whip: S.dir ?? 1 }; }
      return null;
    },
    cutAt(f) { const i = idx(f); return (i > 0 && f === shots[i].f && kind(shots[i]) === 'cut') || kind(shots[i]) === 'dissolve' && !!this.mixAt(f); },
  };
}
