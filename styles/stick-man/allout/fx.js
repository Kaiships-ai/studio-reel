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

// ao_aura (study): speed flames licking up all round a figure (tongues of yellow-orange fire rising and flickering), an
// in-world effect that lights nothing but glows. at: env.at spec (use { sole: 'kip' }); r (m) ring radius; h (m) height;
// key on 0..1
MAKE.ao_aura = (stage, o, ctx) => {
  const g = new THREE.Group(); g.userData.noInk = true; ctx.group.add(g);
  const T = [], n = o.n ?? 14, R = o.r ?? 0.42, H = o.h ?? 1.7;
  for (let i = 0; i < n; i++) {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, i % 3 ? 0.78 : 0.5, i % 3 ? 0.18 : 0.06), transparent: true, opacity: 0.92, depthWrite: false });
    m.userData.noToon = true;
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.45, 8, 1), m); t.userData.noPrepass = true; stage.glow(t, 0.7);
    const a = i / n * Math.PI * 2 + (i % 2) * 0.3; t.userData = { a, ph: i * 1.7, hz: 0.18 + 0.05 * (i % 4), h0: (i % 5) / 5 };
    g.add(t); T.push(t);
  }
  return { obj: g, apply: (v, f, env) => {
    const on = v('on', 0); g.visible = on > 0.02; if (!g.visible) return;
    const p = env.at(o.at); g.position.set(p[0], p[2], -p[1]);
    for (const t of T) { const u = t.userData, k = ((f * u.hz + u.ph) % 1 + 1) % 1, y = (u.h0 + k) % 1;
      const r = R * (1 + 0.15 * Math.sin(f * 0.4 + u.ph)); t.position.set(Math.cos(u.a) * r, H * y, Math.sin(u.a) * r);
      const s = on * (0.6 + 0.6 * Math.sin(Math.PI * y)) * (0.9 + 0.2 * Math.sin(f * 0.9 + u.ph)); t.scale.set(s, s * (1.2 + 0.8 * Math.sin(f * 0.7 + u.ph)), s);
      t.material.opacity = 0.92 * Math.sin(Math.PI * Math.min(1, y * 1.15)); }
  } };
};
