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
  const tmp = new THREE.Vector3();
  const set = (t, { up = 0.10, out = 0.05, face = null, clear = 0 } = {}) => {
    g.visible = t >= 0;
    if (t < 0) return;
    for (const p of puffs) {
      const tt = t - p.lag, gr = easeOut(tt / 1.2), fade = 1 - ease((t - life) / 2.0);
      p.m.visible = tt > 0 && fade > 0.01;
      const d = p.dist * gr + out * Math.max(0, tt);
      p.m.position.copy(p.dir).multiplyScalar(d);
      if (face && clear > 0) {                                     // face = unit vector to the camera (group-local)
        const k = p.m.position.dot(face);
        if (k > 0) { tmp.copy(face).multiplyScalar(k); p.m.position.sub(tmp.multiplyScalar(0.75));
          tmp.copy(p.m.position).addScaledVector(face, -p.m.position.dot(face)); const l = tmp.length() || 1e-3;
          p.m.position.addScaledVector(tmp, clear * Math.max(0, 1 - l / clear) / l); }
      }
      p.m.position.y += up * Math.max(0, tt) + 0.02 * Math.sin(1.3 * tt + p.spin * 6);
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
  const set = (t, { dyed = 0, ground = -1.6, toward = null, push = 0 } = {}) => {
    g.visible = t >= 0;
    if (t < 0) return;
    bills.forEach((b, i) => {
      if (toward && push) {                                        // flung at the lens: no landing, they leave the frame
        const tt = t, e = (1 - Math.exp(-K * tt)) / K, sp = push * (0.7 + 0.6 * hash(i, 8, seed));
        // spread wide (they pass the lens to the sides, not over the face), a low arc that sinks as they come
        b.m.position.set(b.v[0] * 0.9 * e + toward[0] * sp * tt, 0.10 * b.v[1] * e - 0.9 * tt * tt + toward[1] * sp * tt, b.v[2] * 0.9 * e + toward[2] * sp * tt);
        b.m.rotation.set(b.w[0] * tt * 1.6 + b.ph, b.w[1] * tt, b.w[2] * tt * 1.6);
        const d = typeof dyed === 'function' ? dyed(i) : dyed; b.mat.color.copy(G).lerp(R, clamp01(d)); return;
      }
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

// ---------------------------------------------------------------- a bare stick arm reaching into a tabletop shot
// set({ shoulder, hand, bend }): Blender points (metres); bend lifts the elbow (fraction of the reach). No hand = hidden.
export function makeArm(stage, { r = 0.016, hand = 0.024 } = {}) {
  const g = new THREE.Group(), ink = new THREE.MeshBasicMaterial({ color: lin(...INK_RGB) });
  const seg = () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 14), ink); m.castShadow = true; g.add(m); return m; };
  const ball = rr => { const m = new THREE.Mesh(new THREE.SphereGeometry(rr, 16, 10), ink); m.castShadow = true; g.add(m); return m; };
  const up = seg(), lo = seg(), el = ball(r * 1.02), hd = ball(hand);
  const Bv = p => new THREE.Vector3(p[0], p[2], -p[1]), Y = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3();
  const place = (m, a, b) => { d.subVectors(b, a); const L = d.length() || 1e-4; m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(Y, d.normalize()); };
  const set = ({ shoulder, hand: h, bend = 0.12 } = {}) => {
    g.visible = !!(h && shoulder); if (!g.visible) return;
    const S = Bv(shoulder), H = Bv(h), M = S.clone().lerp(H, 0.5); M.y += bend * S.distanceTo(H);
    place(up, S, M); place(lo, M, H); el.position.copy(M); hd.position.copy(H);
  };
  set({}); g.userData.set = set;
  return g;
}

// ---------------------------------------------------------------- one bill (hand prop): origin at its centre; set({ red })
export function makeBill(stage, { scale = 1.3 } = {}) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 112; const c = cv.getContext('2d');
  c.fillStyle = '#fff'; c.fillRect(0, 0, 256, 112); c.strokeStyle = 'rgb(150,150,150)'; c.lineWidth = 7; c.strokeRect(8, 8, 240, 96);
  c.fillStyle = 'rgb(200,200,200)'; c.beginPath(); c.ellipse(128, 56, 26, 34, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgb(120,120,120)'; c.font = 'bold 30px Georgia, serif'; c.fillText('20', 22, 44); c.fillText('20', 196, 96);
  const map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace;
  const G = lin(...BILL_GREEN), R = lin(...DYE_RGB), mat = new THREE.MeshStandardMaterial({ map, color: G.clone(), roughness: 0.75, side: THREE.DoubleSide });
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.155 * scale, 0.002 * scale, 0.066 * scale), mat); m.castShadow = m.receiveShadow = true;
  const g = new THREE.Group(); g.add(m);
  g.userData.set = ({ red = 0 } = {}) => { mat.color.copy(G).lerp(R, clamp01(red)); };
  return g;
}

// ---------------------------------------------------------------- cartoon pow: a spiky star behind the burst
// set(t, { life }): t in s. Pops to full in 2 frames, holds, shrinks away by `life` s (8 frames at 30 fps). Flat,
// unlit, three layers (ink rim, yellow, white core) on the group's XY plane: the caller turns the group to the camera.
export function makeStarBurst(stage, { spikes = 12, r = 1.0, seed = 4 } = {}) {
  const g = new THREE.Group();
  const star = (ro, ri) => {
    const s = new THREE.Shape(), n = spikes * 2;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI * 2 * i / n + 0.1, k = i % 2 ? ri : ro * (0.82 + 0.36 * hash(i >> 1, 1, seed));
      const p = [Math.cos(a) * k, Math.sin(a) * k]; i ? s.lineTo(...p) : s.moveTo(...p);
    }
    return new THREE.ShapeGeometry(s);
  };
  const layer = (geo, rgb, z, glowK = 0) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: lin(...rgb), depthWrite: false, transparent: true, side: THREE.DoubleSide }));
    m.position.z = z; m.castShadow = false; m.userData.noPrepass = true; m.renderOrder = 1; g.add(m);
    if (glowK) stage.glow(m, glowK);
    return m;
  };
  const ink = layer(star(r * 1.07, r * 0.50), INK_RGB, 0), yel = layer(star(r, r * 0.44), [1.0, 0.80, 0.12], 0.004, 0.25),
    core = layer(star(r * 0.55, r * 0.26), [1.0, 0.98, 0.86], 0.008, 0.4);
  const mats = [ink, yel, core].map(m => m.material);
  const set = (t, { life = 8 / 30 } = {}) => {
    g.visible = t >= 0 && t < life;
    if (!g.visible) return;
    const f = t * 30, pop = f < 2 ? 0.55 + 0.45 * f / 2 : 1 + 0.08 * Math.sin(f * 1.7), out = 1 - ease((t - life * 0.6) / (life * 0.4));
    g.scale.setScalar(Math.max(1e-3, pop * (0.7 + 0.3 * out)));
    g.rotation.z = 0.05 * f;
    for (const m of mats) m.opacity = out;
  };
  set(-1); g.userData.set = set;
  return g;
}

// ---------------------------------------------------------------- dye droplets: outlined red drops thrown out
// set(t, { toward, ground }): ballistic, a bias `toward` (unit vector, group-local) for the drops that fly at the lens.
export function makeDroplets(stage, { seed = 13, n = 14, speed = 3.2 } = {}) {
  const g = new THREE.Group(), drops = [];
  const mat = toon(DYE_RGB, { shade: [0.75, 0.48, 0.58], sheen: 0.5, rim: 0.2 }), geo = new THREE.SphereGeometry(1, 20, 14), hull = new THREE.SphereGeometry(1, 20, 14);
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; g.add(m);
    const h = new THREE.Mesh(hull, hullMat); h.scale.setScalar(1.16); m.add(h);
    const az = 2 * Math.PI * hash(i, 1, seed), el = 0.25 + 0.9 * hash(i, 2, seed), sp = speed * (0.6 + 0.6 * hash(i, 3, seed));
    drops.push({ m, v: [Math.cos(el) * Math.cos(az) * sp, Math.sin(el) * sp, Math.cos(el) * Math.sin(az) * sp], r: 0.035 + 0.03 * hash(i, 4, seed),
      lens: hash(i, 5, seed) < 0.45, lag: 0.04 * hash(i, 6, seed) });
  }
  const set = (t, { toward = [0, 0, 1], ground = -1.5 } = {}) => {
    g.visible = t >= 0; if (t < 0) return;
    for (const d of drops) {
      const tt = Math.max(0, t - d.lag), v = d.lens ? d.v.map((x, k) => 0.4 * x + toward[k] * speed * 1.2) : d.v;
      const y = v[1] * tt - 4.9 * tt * tt;
      d.m.visible = t > d.lag && y > ground;
      d.m.position.set(v[0] * tt, y, v[2] * tt);
      const sq = 1 + 0.35 * Math.min(1, Math.hypot(v[0], v[1] - 9.8 * tt, v[2]) / 4);   // stretched along the flight a little
      d.m.scale.set(d.r, d.r * sq, d.r);
    }
  };
  set(-1); g.userData.set = set;
  return g;
}

// ---------------------------------------------------------------- floating countdown dial (time passing)
// set({ show 0..1, count, tick 0..1 }): an outlined clock disk that pops in, shows `count` (the red arc = count / of),
// jumps a little on each tick. Faces +z: the caller turns it to the camera.
export function makeCountdown(stage, { r = 0.15, of = 3 } = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const draw = n => {
    const c = cv.getContext('2d'), W = 256;
    c.clearRect(0, 0, W, W);
    c.fillStyle = 'rgb(252,250,242)'; c.beginPath(); c.arc(W / 2, W / 2, 124, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgb(222,40,36)'; c.lineWidth = 26; c.lineCap = 'round';
    if (n > 0) { c.beginPath(); c.arc(W / 2, W / 2, 98, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * n / of); c.stroke(); }
    c.fillStyle = 'rgb(20,20,24)'; c.font = '900 150px InterReel, Arial, Helvetica, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(String(n), W / 2, W / 2 + 8);
    tex.needsUpdate = true;
  };
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.10, r * 1.10, r * 0.16, 48), new THREE.MeshBasicMaterial({ color: lin(...INK_RGB) }));
  rim.rotation.x = Math.PI / 2; rim.userData.noPrepass = true; body.add(rim);
  const face = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  face.position.z = r * 0.085; face.userData.noPrepass = true; body.add(face);
  for (const s of [-1, 1]) {                                     // two little bells on top: it reads as a clock
    const b = new THREE.Mesh(new THREE.SphereGeometry(r * 0.24, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon([0.85, 0.12, 0.10], { sheen: 0.4 }));
    b.position.set(s * r * 0.62, r * 0.86, 0); b.rotation.z = -s * 0.55; b.castShadow = false; body.add(b);
    const h = new THREE.Mesh(b.geometry, hullMat); h.scale.setScalar(1.14); b.add(h);
  }
  let last = null;
  const set = ({ show = 0, count = 3, tick = 0 } = {}) => {
    g.visible = show > 0.01; if (!g.visible) return;
    const n = Math.max(0, Math.round(count)); if (n !== last) { draw(n); last = n; }
    body.scale.setScalar(Math.max(1e-3, show * (1 + 0.18 * tick)));
    body.rotation.z = 0.20 * tick * Math.sin(tick * 9);
  };
  set({}); g.userData.set = set;
  return g;
}
