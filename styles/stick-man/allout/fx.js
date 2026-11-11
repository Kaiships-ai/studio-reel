// Allout effects: one MAKE kind that drives a set prop's own animation from keyed values, so every moving story prop
// (bugs, pills, a stamp, a calendar, a breath cloud) is a pure function of the frame. The prop gets
// `userData.anim(f, v)` from its set; v(key, default) reads keys set by beats ({ who, do: 'set', key, to, dur }).
//   make: { bugs: { kind: 'ao_anim', prop: 'bugs' } }   beats: { ...at('l11', 'bug'), who: 'bugs', do: 'set', key: 'grow', to: 1, dur: 20 }
import { MAKE } from '../engine/verbs_fx.js';

MAKE.ao_anim = (stage, o, ctx) => {
  const p = ctx.props[o.prop];
  if (!p) throw new Error(`ao_anim: no prop "${o.prop}" in this set`);
  return { obj: p, apply: (v, f) => p.userData.anim?.(f, v) };
};

// ao_follow: the prop rides an anchor every frame ({ head: 'kip', up, fwd, side } or a place), then runs its own anim.
//   make: { medal: { kind: 'ao_follow', prop: 'medal', at: { head: 'kip', up: -0.62, fwd: 0.32 } } }
MAKE.ao_follow = (stage, o, ctx) => {
  const p = ctx.props[o.prop];
  if (!p) throw new Error(`ao_follow: no prop "${o.prop}" in this set`);
  return { obj: p, apply: (v, f, env) => { const q = env.at(o.at); p.position.set(q[0], q[2], -q[1]); p.userData.anim?.(f, v); } };
};

// ao_tube (round 3): a flexible tube that runs from a fixed point (the scope cart's hook) through a live anchor (the
// doctor's hands) into another (the patient's mouth): the endoscope going down his throat. from / via / to: env.at specs
// ({ head: 'kip', up, fwd } follows the head); sag (m) droops each span; keys show 0..1, feed 0..1 (0 = the tip still
// hangs in front of the mouth, 1 = all the way in). Rebuilt each frame (one tube, cheap).
import * as THREE from 'three';
MAKE.ao_tube = (stage, o, ctx) => {
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.04, 0.04, 0.05, THREE.SRGBColorSpace), roughness: 0.3, metalness: 0.1 });
  m.userData.noToon = true;
  const g = new THREE.Group(); g.userData.noInk = true; ctx.group.add(g);
  let mesh = null;
  const V = p => new THREE.Vector3(p[0], p[2], -p[1]), mid = (a, b, s) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.min(a[2], b[2]) - s];
  return { obj: g, apply: (v, f, env) => {
    const show = v('show', 0), feed = Math.max(0, Math.min(1, v('feed', 0)));
    g.visible = show > 0.5; if (!g.visible) return;
    const a = env.at(o.from), b = o.via ? env.at(o.via) : null, t = env.at(o.to), sag = o.sag ?? 0.3;
    const mo = env.at({ ...o.to, fwd: (o.to.fwd || 0) + 0.28 * (1 - feed), up: (o.to.up || 0) - 0.1 * (1 - feed) });
    const pts = b ? [a, mid(a, b, sag), b, mid(b, mo, sag * 0.4), mo] : [a, mid(a, mo, sag), mo];
    if (mesh) { mesh.geometry.dispose(); g.remove(mesh); }
    mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(V)), 64, o.r ?? 0.02, 8), m); mesh.castShadow = true; mesh.userData.noInk = true; g.add(mesh);
  } };
};

// ao_flies (round 3): a few flies buzzing round an anchor on looping paths (the stink gag): a dark body, two flapping
// wings, a pure function of the frame. at: env.at spec; n; r (m) loop radius; key on 0..1 (they come and go)
MAKE.ao_flies = (stage, o, ctx) => {
  const g = new THREE.Group(); g.userData.noInk = true; ctx.group.add(g);
  const bm = new THREE.MeshBasicMaterial({ color: 0x111114 }), wm = new THREE.MeshBasicMaterial({ color: 0xdfe8ee, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
  bm.userData.noToon = wm.userData.noToon = true;
  const F = [];
  for (let i = 0; i < (o.n ?? 5); i++) {
    const f = new THREE.Group(), b = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), bm); b.scale.set(1.3, 1, 1); f.add(b);
    const wl = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.014), wm), wr = wl.clone(); wl.position.set(0, 0.006, 0.012); wr.position.set(0, 0.006, -0.012); f.add(wl, wr);
    f.userData = { wl, wr, a: 1.3 + 0.37 * i, b: 1.7 + 0.29 * i, ph: i * 2.1, r: (o.r ?? 0.32) * (0.7 + 0.15 * i % 0.6) };
    g.add(f); F.push(f);
  }
  return { obj: g, apply: (v, f, env) => {
    const on = v('on', o.on ?? 1); g.visible = on > 0.02; if (!g.visible) return;
    const p = env.at(o.at); g.position.set(p[0], p[2], -p[1]); const t = f / ctx.fps;
    for (const q of F) { const u = q.userData, x = u.r * Math.sin(t * u.a + u.ph), z = u.r * Math.sin(t * u.b * 1.3 + u.ph * 2), y = 0.12 * Math.sin(t * u.b * 2.1 + u.ph);
      q.position.set(x, y, z); q.rotation.y = t * u.a * 2 + u.ph; const w = 0.9 * Math.sin(t * 60 + u.ph); u.wl.rotation.x = w; u.wr.rotation.x = -w; q.scale.setScalar(on); }
  } };
};

// ao_bullet (study): a projectile along a straight path, big enough to read (cartoon scale), spinning, with a hot streak
// behind it. from / to: points or env.at specs; keys u 0..1 (where on the path), trail 0..1 (streak length, = speed),
// show (default: on while 0 < u). Orientation follows the path.
MAKE.ao_bullet = (stage, o, ctx) => {
  const g = new THREE.Group(); g.userData.noInk = true; ctx.group.add(g);
  const S = o.scale ?? 3, brass = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.98, 0.58, 0.30, THREE.SRGBColorSpace), roughness: 0.3, metalness: 0.35, emissive: new THREE.Color().setRGB(0.25, 0.10, 0.03) });   // cartoon copper: reads bright, not as a dark metal blob
  brass.userData.noToon = true;
  const body = new THREE.Group(); g.add(body);
  const case_ = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.016, 20), brass); case_.position.y = -0.004; body.add(case_);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), brass); nose.scale.y = 1.8; nose.position.y = 0.004; body.add(nose);
  const tm = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.78, 0.45), transparent: true, opacity: 0.55, depthWrite: false }); tm.userData.noToon = true;
  const trail = new THREE.Mesh(new THREE.ConeGeometry(0.005, 1, 16, 1, true), tm); trail.userData.noPrepass = true; body.add(trail); stage.glow(trail, 0.6);
  body.scale.setScalar(S);
  const up = new THREE.Vector3(0, 1, 0), V = p => new THREE.Vector3(p[0], p[2], -p[1]);
  return { obj: g, apply: (v, f, env) => {
    const u = v('u', 0), show = v('show', u > 0 && u < 1.5 ? 1 : 0); g.visible = show > 0.5; if (!g.visible) return;
    const a = V(env.at(o.from)), b = V(env.at(o.to)), d = b.clone().sub(a).normalize();
    g.position.copy(a.lerp(b, u)); body.quaternion.setFromUnitVectors(up, d); body.rotateY(f * 0.5);
    const L = 0.6 * Math.max(0, v('trail', 0)); trail.visible = L > 0.01; trail.scale.set(1, Math.max(0.001, L / S), 1); trail.position.y = -0.012 - L / S / 2;
  } };
};

// ---------------------------------------------------------------- soft effects (study gap 4)
// The reference's smoke, dust and fire are soft, see-through and textured, never outlined; ours were inked toon balls.
// Soft sprites: a noise-edged radial blob (smoke / dust) and a teardrop flame with a white-hot core, both camera-facing,
// alpha (smoke) or additive (fire), no ink, no depth write. Every one is a pure function of the frame (seeded).
const TEXC = {};
function softTex(kind) {
  if (TEXC[kind]) return TEXC[kind];
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'), r = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(kind.length * 977 + 3);
  if (kind === 'flame') {
    const gr = g.createRadialGradient(64, 84, 4, 64, 74, 60); gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.25, 'rgba(255,230,120,0.95)'); gr.addColorStop(0.6, 'rgba(255,140,30,0.6)'); gr.addColorStop(1, 'rgba(255,90,10,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(64, 4); g.bezierCurveTo(92, 40, 112, 70, 100, 98); g.bezierCurveTo(90, 122, 38, 122, 28, 98); g.bezierCurveTo(16, 70, 36, 40, 64, 4); g.fill();
  } else {
    for (let i = 0; i < 26; i++) { const x = 64 + (r() - 0.5) * 50, y = 64 + (r() - 0.5) * 50, rad = 18 + r() * 30, gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(255,255,255,${0.30 + 0.25 * r()})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return (TEXC[kind] = t);
}
const sprite = (kind, rgb, add) => { const m = new THREE.SpriteMaterial({ map: softTex(kind), color: new THREE.Color().setRGB(...rgb, THREE.SRGBColorSpace), transparent: true,
  depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, fog: !add }); m.userData.noToon = true; const sp = new THREE.Sprite(m); sp.userData.noPrepass = true; sp.userData.noInk = true; return sp; };
const lcg = seed => { let s = (seed * 9973 + 7) >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const easeOut = x => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

// ao_puff: soft smoke / dust / muzzle fire on `fire` (t0): puffs burst out, grow, drift up and fade. build { at, size (m),
// count, color, dark (a second shade), life (s), rise (m/s), spread, fire (additive hot core, lights nothing), seed, opacity }
MAKE.ao_puff = (stage, o, ctx) => {
  const g = new THREE.Group(); ctx.group.add(g); const r = lcg(o.seed ?? 3), P = [], n = o.count ?? 12, size = o.size ?? 0.6;
  for (let i = 0; i < n; i++) { const sp = sprite(o.fire ? 'flame' : 'smoke', i % 3 === 2 && o.dark ? o.dark : (o.color || [0.85, 0.82, 0.78]), !!o.fire); g.add(sp);
    const a = r() * Math.PI * 2, e = r(); P.push({ sp, dir: new THREE.Vector3(Math.cos(a) * (o.spread ?? 1), 0.25 + 0.6 * e, Math.sin(a) * (o.spread ?? 1)).normalize(),
      dist: size * (0.3 + 0.7 * r()), rad: size * (0.45 + 0.4 * r()), delay: r() * 0.12, spin: (r() - 0.5) * 2 }); }
  return { obj: g, apply: (v, f, env) => {
    const t0 = v('t0'); const t = t0 == null ? -1 : (f - t0) / ctx.fps, life = o.life ?? 1.5; g.visible = t >= 0 && t < life; if (!g.visible) return;
    const p = env.at(o.at); g.position.set(p[0], p[2], -p[1]);
    for (const q of P) { const u = t - q.delay; q.sp.visible = u > 0; if (u <= 0) continue; const k = easeOut(u / (life * 0.45)), fade = 1 - Math.min(1, u / life);
      q.sp.position.copy(q.dir).multiplyScalar(q.dist * k).add(new THREE.Vector3(0, (o.rise ?? 0.3) * u, 0));
      q.sp.scale.setScalar(Math.max(1e-3, q.rad * (0.4 + 0.9 * k))); q.sp.material.rotation = q.spin * u; q.sp.material.opacity = (o.opacity ?? 0.85) * Math.pow(fade, 1.3) * Math.min(1, u * 12); }
  } };
};

// ao_aura: speed flames licking up all round a figure: soft flame sprites with white-hot cores rising and flickering,
// and a warm light from them on the figure and the ground (the act needs light.lamp > 0 for the cast to take it).
// at: env.at spec ({ sole: 'kip' }); r (m) ring radius; h (m) height; n; light { power, dist }; key on 0..1
MAKE.ao_aura = (stage, o, ctx) => {
  const g = new THREE.Group(); g.userData.noInk = true; ctx.group.add(g);
  const T = [], n = o.n ?? 18, R = o.r ?? 0.42, H = o.h ?? 1.8;
  for (let i = 0; i < n; i++) { const t = sprite('flame', i % 3 ? [1.0, 0.97, 0.72] : [1.0, 0.82, 0.38], true); t.center.set(0.5, 0.05);
    t.userData.q = { a: i / n * Math.PI * 2 + (i % 2) * 0.3, ph: i * 1.7, hz: 0.07 + 0.02 * (i % 4), h0: (i % 5) / 5 }; g.add(t); T.push(t); }
  const pl = new THREE.PointLight(new THREE.Color(1.0, 0.75, 0.35), 0, o.light?.dist ?? 3.5, 1.5); pl.position.set(0, 1.0, 0); g.add(pl);
  return { obj: g, apply: (v, f, env) => {
    const on = v('on', 0); g.visible = on > 0.02; pl.intensity = g.visible ? (o.light?.power ?? 3) * on * (0.85 + 0.15 * Math.sin(f * 1.3)) : 0; if (!g.visible) return;
    const p = env.at(o.at); g.position.set(p[0], p[2], -p[1]);
    for (const t of T) { const q = t.userData.q, y = ((q.h0 + f * q.hz) % 1 + 1) % 1, rr = R * (1 + 0.15 * Math.sin(f * 0.4 + q.ph));
      t.position.set(Math.cos(q.a) * rr, H * y * 0.85, Math.sin(q.a) * rr);
      const s = on * (0.75 + 0.35 * Math.sin(f * 0.9 + q.ph)); t.scale.set(0.13 * s, 0.75 * s * (1 - 0.35 * y), 1); t.material.opacity = Math.sin(Math.PI * Math.min(1, y * 1.15)); }
  } };
};

// ao_debris: pebbles and grit thrown up at a figure's feet (secondary action: a scramble, a stamp, a fall): each fire throws
// a handful that arc, bounce once and lie. at: env.at spec; n; spread (m/s); up (m/s); size (m); color; key t0 (fire)
MAKE.ao_debris = (stage, o, ctx) => {
  const g = new THREE.Group(); g.userData.noInk = true; ctx.group.add(g); const r = lcg(o.seed ?? 9), B = [];
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(...(o.color || [0.62, 0.50, 0.38]), THREE.SRGBColorSpace), roughness: 0.9 }); m.userData.noToon = true;
  for (let i = 0; i < (o.n ?? 14); i++) { const b = new THREE.Mesh(new THREE.DodecahedronGeometry((o.size ?? 0.025) * (0.6 + 0.8 * r()), 0), m); b.castShadow = true; g.add(b);
    const a = r() * Math.PI * 2, sp = (o.spread ?? 1.4) * (0.4 + 0.8 * r()); b.userData.q = { vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: (o.up ?? 1.8) * (0.5 + 0.7 * r()), spin: r() * 12 }; B.push(b); }
  return { obj: g, apply: (v, f, env) => {
    const t0 = v('t0'); const t = t0 == null ? -1 : (f - t0) / ctx.fps; g.visible = t >= 0; if (!g.visible) return;
    const p = env.at(o.at); g.position.set(p[0], p[2], -p[1]);
    for (const b of B) { const q = b.userData.q, T1 = 2 * q.vy / 9.8; let x, y, z;
      if (t < T1) { x = q.vx * t; z = q.vz * t; y = q.vy * t - 4.9 * t * t; }
      else { const u = Math.min(t - T1, 0.25 * T1), v2 = q.vy * 0.25; x = q.vx * (T1 + 0.3 * u); z = q.vz * (T1 + 0.3 * u); y = Math.max(0, v2 * u - 4.9 * u * u); }
      b.position.set(x, y + 0.01, z); b.rotation.set(q.spin * Math.min(t, T1), q.spin * 0.6 * Math.min(t, T1), 0); }
  } };
};
