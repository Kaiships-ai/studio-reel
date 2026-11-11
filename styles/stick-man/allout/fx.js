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

// ao_tube (round 3): a flexible tube between two live anchors that feeds along its path (the endoscope going down his
// throat). from / to: env.at specs ({ head: 'kip', up, fwd } follows the head); sag (m) droops the middle; keys show 0..1,
// feed 0..1 (share of the path drawn from `from`). Rebuilt each frame (one tube, cheap).
import * as THREE from 'three';
MAKE.ao_tube = (stage, o, ctx) => {
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.05, 0.05, 0.06, THREE.SRGBColorSpace), roughness: 0.25, metalness: 0.1 });
  m.userData.noToon = true;
  const tip = new THREE.Mesh(new THREE.SphereGeometry((o.r ?? 0.014) * 1.3, 12, 8), new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.2, metalness: 1 }));
  tip.material.userData.noToon = true;
  const g = new THREE.Group(); g.userData.noInk = true; ctx.group.add(g); g.add(tip);
  let mesh = null;
  const V = p => new THREE.Vector3(p[0], p[2], -p[1]);
  return { obj: g, apply: (v, f, env) => {
    const show = v('show', 0), feed = Math.max(0.02, Math.min(1, v('feed', 0)));
    g.visible = show > 0.5; if (!g.visible) return;
    const a = env.at(o.from), b = env.at(o.to), sag = o.sag ?? 0.35;
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.min(a[2], b[2]) - sag];
    const pts = [V(a), V([a[0] * 0.75 + mid[0] * 0.25, a[1] * 0.75 + mid[1] * 0.25, a[2] - sag * 0.6]), V(mid), V([b[0] * 0.75 + mid[0] * 0.25, b[1] * 0.75 + mid[1] * 0.25, b[2] - sag * 0.4]), V(b)];
    const full = new THREE.CatmullRomCurve3(pts), n = 40, P = [];
    for (let i = 0; i <= n; i++) P.push(full.getPoint(feed * i / n));
    if (mesh) { mesh.geometry.dispose(); g.remove(mesh); }
    mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P), 48, o.r ?? 0.014, 8), m); mesh.castShadow = true; mesh.userData.noInk = true; g.add(mesh);
    tip.position.copy(P[P.length - 1]);
  } };
};
