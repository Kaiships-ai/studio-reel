// Effects for the burst and the explainer. Each maker builds its meshes once and returns a THREE.Group with
// group.userData.set(t, opts): t = local time in seconds since the effect started (t < 0 hides it). Everything is
// a pure function of t and a seed (no Math.random), so any frame can be rendered alone.
// Groups are positioned by the caller (scene units); sizes are metres.
import * as THREE from 'three';
import { lin, toon, INK_RGB } from '../../engine/look.js';

const clamp01 = x => Math.max(0, Math.min(1, x));
const ease = x => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const easeOut = x => 1 - Math.pow(1 - clamp01(x), 3);
const hash = (i, k, seed) => { const s = Math.sin(i * 12.9898 + k * 78.233 + seed * 37.719) * 43758.5453; return s - Math.floor(s); };
const hullMat = new THREE.MeshBasicMaterial({ color: lin(...INK_RGB), side: THREE.BackSide });
export const DYE_RGB = [0.82, 0.05, 0.06];
export const BILL_GREEN = [0.40, 0.70, 0.38];

// ---------------------------------------------------------------- flash: white full frame for a few frames
// flashAt(t) -> 0..1, 1 on the first frame, gone after `frames` frames
export const flashAt = (t, { frames = 3, fps = 30 } = {}) => { if (t < 0) return 0; const f = t * fps; return f >= frames ? 0 : Math.pow(1 - f / frames, 0.7); };
// optional overlay the stage can use: a screen-filling white quad (no ink, no bloom); set(value 0..1)
export function makeFlash(stage) {
  const mat = new THREE.ShaderMaterial({ uniforms: { a: { value: 0 } }, transparent: true, depthTest: false, depthWrite: false,
    vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform float a; void main(){ gl_FragColor = vec4(1.0, 0.99, 0.96, a); }' });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  m.frustumCulled = false; m.renderOrder = 999; m.userData.noPrepass = true; m.visible = false; stage.scene.add(m);
  m.userData.set = v => { mat.uniforms.a.value = clamp01(v); m.visible = v > 0.001; };
  return m;
}

// ---------------------------------------------------------------- red powder burst
// opts at build: { seed, count, size } (size = radius of the full cloud, m). set(t): swells to full in ~1.2 s,
// keeps drifting up and out slowly, lingers; after `life` s it thins away. Puffs are toon balls with their own outline.
export function makePowderBurst(stage, { seed = 3, count = 18, size = 0.9, life = 7 } = {}) {
  const g = new THREE.Group(), puffs = [];
  const mats = [[0.84, 0.06, 0.07], [0.92, 0.16, 0.14], [0.74, 0.04, 0.08]].map(c => toon(c, { shade: [0.78, 0.52, 0.62], sheen: 0, rim: 0.2, broad: 0.15 }));
  const geo = new THREE.SphereGeometry(1, 28, 18), hull = new THREE.SphereGeometry(1, 28, 18);
  for (let i = 0; i < count; i++) {
    const az = 2 * Math.PI * (i / count + 0.3 * hash(i, 1, seed)), el = -0.25 + 1.2 * hash(i, 2, seed);
    const dir = new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
    const dist = size * (0.25 + 0.75 * hash(i, 3, seed)), r = size * (0.22 + 0.20 * hash(i, 4, seed));
    const m = new THREE.Mesh(geo, mats[i % 3]); m.castShadow = true; m.receiveShadow = false;
    const h = new THREE.Mesh(hull, hullMat); h.scale.setScalar(1 + 0.05 / Math.max(0.2, r)); m.add(h);
    g.add(m); puffs.push({ m, dir, dist, r, lag: 0.12 * hash(i, 5, seed), spin: hash(i, 6, seed) });
  }
  const set = (t, { up = 0.10, out = 0.05 } = {}) => {
    g.visible = t >= 0;
    if (t < 0) return;
    for (const p of puffs) {
      const tt = t - p.lag, gr = easeOut(tt / 1.2), fade = 1 - ease((t - life) / 2.0);
      p.m.visible = tt > 0 && fade > 0.01;
      const d = p.dist * gr + out * Math.max(0, tt);
      p.m.position.copy(p.dir).multiplyScalar(d); p.m.position.y += up * Math.max(0, tt) + 0.02 * Math.sin(1.3 * tt + p.spin * 6);
      p.m.scale.setScalar(Math.max(1e-3, p.r * (0.12 + 0.88 * gr) * (1 + 0.04 * Math.max(0, tt)) * fade));
    }
  };
  set(-1);
  g.userData.set = set;
  return g;
}

// ---------------------------------------------------------------- flying bills
// opts at build: { seed, n, scale }. set(t, { dyed, ground }): ballistic paths with paper drag, tumbling, landing flat
// on y = ground (group-local). dyed: number for all, or (i) => 0..1, or an array; 0 = green note, 1 = soaked red.
export function makeFlyingBills(stage, { seed = 5, n = 16, scale = 1 } = {}) {
  const g = new THREE.Group(), bills = [];
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 112; const c = cv.getContext('2d');
  c.fillStyle = '#fff'; c.fillRect(0, 0, 256, 112); c.strokeStyle = 'rgb(150,150,150)'; c.lineWidth = 7; c.strokeRect(8, 8, 240, 96);
  c.fillStyle = 'rgb(200,200,200)'; c.beginPath(); c.ellipse(128, 56, 26, 34, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgb(120,120,120)'; c.font = 'bold 30px Georgia, serif'; c.fillText('20', 22, 44); c.fillText('20', 196, 96);
  const map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const geo = new THREE.BoxGeometry(0.155 * scale, 0.0015 * scale, 0.066 * scale);
  const G = lin(...BILL_GREEN), R = lin(...DYE_RGB);
  for (let i = 0; i < n; i++) {
    const mat = new THREE.MeshStandardMaterial({ map, color: G.clone(), roughness: 0.75, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; g.add(m);
    const az = 2 * Math.PI * hash(i, 1, seed), sp = 1.8 + 2.2 * hash(i, 2, seed);
    bills.push({ m, mat, v: [Math.cos(az) * sp, 3.0 + 3.0 * hash(i, 3, seed), Math.sin(az) * sp],
      w: [6 * (hash(i, 4, seed) - 0.5), 8 * (hash(i, 5, seed) - 0.5), 10 * (hash(i, 6, seed) - 0.5)], ph: 6 * hash(i, 7, seed) });
  }
  const K = 1.4, GR = 4.5;                                       // drag, gravity (paper falls at ~3 m/s at most)
  const set = (t, { dyed = 0, ground = -1.6 } = {}) => {
    g.visible = t >= 0;
    if (t < 0) return;
    bills.forEach((b, i) => {
      // time of landing: march (pure, fixed steps) until y < ground
      const y = tt => (b.v[1] + GR / K) * (1 - Math.exp(-K * tt)) / K - GR * tt / K;
      let tl = Infinity;
      for (let s = 0.05; s < 8; s += 0.05) if (y(s) < ground) { tl = s; break; }
      const tt = Math.min(t, tl), e = (1 - Math.exp(-K * tt)) / K;
      const sway = 0.12 * Math.sin(3.1 * tt + b.ph) * Math.min(1, tt);
      b.m.position.set(b.v[0] * e + sway, Math.max(ground, y(tt)) + 0.001 * i, b.v[2] * e + 0.6 * sway);
      if (t >= tl) b.m.rotation.set(0, b.w[1] * tl, 0);
      else b.m.rotation.set(b.w[0] * tt + 0.4 * Math.sin(5 * tt + b.ph), b.w[1] * tt, b.w[2] * tt);
      const d = typeof dyed === 'function' ? dyed(i) : Array.isArray(dyed) ? (dyed[i] ?? 0) : dyed;
      b.mat.color.copy(G).lerp(R, clamp01(d));
    });
  };
  set(-1);
  g.userData.set = set; g.userData.count = n;
  return g;
}
// bills turn red one by one: bill i starts at start + i * step and takes `dur` s
export const dyeOrder = (t, { start = 0, step = 0.12, dur = 0.25 } = {}) => i => clamp01((t - start - i * step) / dur);

// ---------------------------------------------------------------- dye spray: short red streaks out of a point along +z
// opts at build: { seed, n, spread (rad), reach (m) }. set(t, { on }) on = 0..1 strength.
export function makeDyeSpray(stage, { seed = 9, n = 14, spread = 0.7, reach = 1.0 } = {}) {
  const g = new THREE.Group(), streaks = [];
  const mat = toon(DYE_RGB, { shade: [0.75, 0.50, 0.60], sheen: 0, rim: 0.1 }), geo = new THREE.CylinderGeometry(0.02, 0.008, 1, 8); geo.rotateX(Math.PI / 2); geo.translate(0, 0, -0.5);
  for (let i = 0; i < n; i++) {
    const a = 2 * Math.PI * hash(i, 1, seed), r = spread * Math.sqrt(hash(i, 2, seed));
    const dir = new THREE.Vector3(Math.sin(r) * Math.cos(a), Math.sin(r) * Math.sin(a), Math.cos(r));
    const m = new THREE.Mesh(geo, mat); m.castShadow = false; g.add(m);
    streaks.push({ m, dir, ph: hash(i, 3, seed), rate: 2.2 + 1.4 * hash(i, 4, seed) });
  }
  const Z = new THREE.Vector3(0, 0, 1);
  const set = (t, { on = 1 } = {}) => {
    g.visible = t >= 0 && on > 0.01;
    if (!g.visible) return;
    for (const s of streaks) {
      const u = (t * s.rate + s.ph) % 1, d = reach * u * (0.6 + 0.4 * on);
      s.m.position.copy(s.dir).multiplyScalar(d);
      s.m.scale.set(1, 1, Math.max(0.01, (0.06 + 0.16 * (1 - u)) * on));
      s.m.quaternion.setFromUnitVectors(Z, s.dir);                // streak points along its own direction (local frame)
    }
  };
  set(-1);
  g.userData.set = set;
  return g;
}

// ---------------------------------------------------------------- radio rings from A to B
// set(t, { from, to, dur, gap, face }): from/to in the group's parent space (scene units); ring i leaves at i * gap,
// travels for dur s, widening and fading. Rings face `face` (e.g. the camera position) when given, else their travel
// direction. Emissive, so it blooms.
export function makeRadioRings(stage, { count = 2, color = [0.55, 0.92, 1.0] } = {}) {
  const g = new THREE.Group(), rings = [];
  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: lin(...color).multiplyScalar(1.6), transparent: true, depthWrite: false });
    const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.13, 10, 48), mat); m.castShadow = false; m.userData.noPrepass = false;
    stage.glow(m, 0.8); g.add(m); rings.push({ m, mat, glow0: m.userData.glow.color.clone() });
  }
  const A = new THREE.Vector3(), Bv = new THREE.Vector3();
  const F = new THREE.Vector3();
  const set = (t, { from, to, dur = 0.9, gap = 0.35, r0 = 0.05, r1 = 0.30, face = null } = {}) => {
    A.set(...from); Bv.set(...to);
    rings.forEach((r, i) => {
      const u = (t - i * gap) / dur;
      r.m.visible = u >= 0 && u <= 1;
      if (!r.m.visible) return;
      r.m.position.copy(A).lerp(Bv, u);
      r.m.lookAt(face ? F.set(...face) : Bv); r.m.scale.setScalar(r0 + (r1 - r0) * u);
      const a = 1 - u * u; r.mat.opacity = a; r.m.userData.glow.color.copy(r.glow0).multiplyScalar(a);
    });
  };
  set(-1, { from: [0, 0, 0], to: [0, 0, 1] });
  g.userData.set = set;
  return g;
}

// ---------------------------------------------------------------- red glow inside the bag
// makeBagGlow(stage, bag?): if `bag` (the money bag group) is given the glow is put inside it and its sack blooms too.
// set(strength 0..1). pulseAt(t) gives the three pulses before the burst.
export function makeBagGlow(stage, bag = null) {
  const g = new THREE.Group();
  const blobMat = new THREE.MeshBasicMaterial({ color: lin(1.0, 0.10, 0.06).multiplyScalar(2.0) });
  const blob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14), blobMat); blob.castShadow = false; g.add(blob);
  stage.glow(blob, 1.0);
  const light = new THREE.PointLight(lin(1.0, 0.12, 0.06), 0, 2.4, 2); g.add(light);
  const sack = bag?.userData.sack || null, sackGlow = sack ? new THREE.MeshBasicMaterial({ color: lin(0, 0, 0) }) : null;
  if (bag) { g.position.set(0, -0.20, 0); bag.add(g); }
  if (sack) { sack.material.emissive = lin(1.0, 0.10, 0.06); sack.material.emissiveIntensity = 0; }
  const B0 = blobMat.color.clone(), G0 = blob.userData.glow.color.clone();
  const set = s => {
    const k = clamp01(s);
    blob.visible = k > 0.01; blob.scale.setScalar(0.6 + 0.5 * k);
    blobMat.color.copy(B0).multiplyScalar(0.5 + k); blob.userData.glow.color.copy(G0).multiplyScalar(k * 1.5);
    light.intensity = 3.0 * k;
    if (sack) {
      sack.material.emissiveIntensity = 0.55 * k;
      if (k > 0.01) { sackGlow.color.setRGB(1.0, 0.10, 0.06).multiplyScalar(0.6 * k); sack.userData.glow = sackGlow; } else delete sack.userData.glow;
    }
  };
  set(0);
  g.userData.set = set;
  return g;
}
export const pulseAt = (t, { count = 3, period = 0.7 } = {}) => (t < 0 || t > count * period ? 0 : Math.pow(Math.sin(Math.PI * t / period), 2));
