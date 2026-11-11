// Hand-directed camera for an act (`act.direct`, read by engine/play.js). Built from the reference breakdown
// (.claude/skills/make-reel-stick-man/DIRECTOR.md): the camera holds while a line is said, and moves only for a reason the
// shot names (`intent`), started by a word or an action (`move.from`). Shots inside a place change by a cut, a dissolve or
// a whip; nothing glides between shots on its own, nothing pushes in to fill time.
//
// A shot: { at, intent, why, cut: 'cut' | 'dissolve' | 'whip', n (frames of the dissolve / whip), cam, to, move, kick, dof }
//   at      a beat ref ({ line, on, offset } or { f }) where the shot starts
//   cut     'move' (default after the first shot: the camera travels from the last framing to this one over n frames,
//           16 by default), 'whip' (the same travel in ~8 frames, smeared), 'dissolve' (n frames), 'cut' (a hard cut:
//           the reference has one or two per film, keep it for a stop beat)
//   cam/to  camera specs; with `to` the camera moves from cam to to over `move` (from / to beat refs or dur frames, ease)
//   spec    { look, up, az, el, d, lens, kx, ky, roll, track } (orbit round a target) or { pos, aim, lens } (absolute)
//           look: an actor ('kip' = head, 'kip.chest', 'kip.hips', 'kip.feet'), a prop / place / effect name, or [x, y, z]
//           az: degrees round the target (0 = from -y, + = camera to the right), el: degrees above, d: metres,
//           kx / ky: where the target sits on screen (0..1, y down), track: follow the target every frame
//   move    { from, to, dur, ease: 'inout' | 'out' | 'in' | 'linear' | 'whip' }
//   kick    [{ at, amp }]: a short camera shake on an impact word
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
  land: t => { const u = 1 - Math.pow(1 - t, 3); return u + 0.06 * Math.sin(Math.PI * clamp(t * 1.15, 0, 1)) * (1 - t); },
};
const KICK = [1, -0.75, 0.5, -0.3, 0.15, -0.05];

export function createDirector(list, { frameOf, anchor, aspect, F1 }) {
  const shots = list.map((s, i) => ({ ...s, i, f: frameOf(s.at) })).sort((a, b) => a.f - b.f);
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
  const mixSpec = (a, b, t) => {
    if (a.pos || b.pos) return null;
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
    if (S.drift) { const k = 1 - S.drift * (f - f0) / 30; c.pos = c.aim.map((x, i) => x + (c.pos[i] - x) * k); }
    let ox = 0, oy = 0;
    for (const q of S.kicks) { const d = f - q.f; if (d >= 0 && d < KICK.length) { ox += 9 * q.amp * KICK[d]; oy += 6 * q.amp * KICK[d]; } }
    const D = S.dof;
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
      const p = camOf(shots[i - 1], f), t = (k === 'whip' ? EASE.whip : EASE.inout)(u), ta = (k === 'whip' ? EASE.whip : EASE.inout)(Math.min(1, u * 1.15));
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
