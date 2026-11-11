// Physical FX kit (SETS.md "Physical effects"): effects that happen IN the world, not on a diagram layer. Smoke and dust
// with volume and an ink outline, explosions with flying debris, cracks that spread over a wall or the ground, glass that
// shatters, sparks, steam, splashes, objects that fall and land, and real gauges / meters / timers / signs / chalk that
// stand in the set and show a number. Every maker is a pure function of time t (s since `fire`) or keyed values, seeded,
// no Math.random, so any frame renders alone. Wired as MAKE kinds (engine/play.js registers PHYS):
//   smoke, explosion, crack, shatter, sparks, steam, splash, fall, shock, meter, sign, chalk, speakers, flock
// Positions: `at` is a Blender point / place / { head: who, ... } like every MAKE kind; sizes in metres.
import * as THREE from 'three';
import { lin, toon, INK_RGB } from '../../engine/look.js';
import { pieceGroup, signTex } from '../sets/dress.js';

const tB = p => new THREE.Vector3(p[0], p[2], -p[1]);
const tSec = (v, f, fps) => { const t0 = v('t0'); return t0 == null ? -1 : (f - t0) / fps; };
const clamp01 = x => Math.max(0, Math.min(1, x));
const easeOut = x => 1 - Math.pow(1 - clamp01(x), 3);
const back = x => { const t = clamp01(x), c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
function lcg(seed) { let s = (seed * 9973 + 7) >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const INK = lin(...INK_RGB);
const HULL = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
const MC = new Map();
const tmat = (rgb, o = {}) => { const k = rgb.join(',') + JSON.stringify(o); if (!MC.has(k)) MC.set(k, toon(rgb, { rough: 0.8, sheen: 0.02, rim: 0.10, ...o })); return MC.get(k); };
const emat = (rgb, k = 1.6) => { const key = 'e' + rgb.join(',') + k; if (!MC.has(key)) MC.set(key, new THREE.MeshBasicMaterial({ color: lin(...rgb).multiplyScalar(k) })); return MC.get(key); };
// an outlined ball: toon body + ink hull (thickness scales with the ball)
function puff(rgb, seg = 14) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, seg, Math.max(6, seg >> 1)), tmat(rgb)); m.castShadow = false; m.receiveShadow = false;
  const h = new THREE.Mesh(m.geometry, HULL); h.scale.setScalar(1.07); m.add(h); return m;
}
function faceYaw(o, cam) { const p = o.getWorldPosition(new THREE.Vector3()); return Math.atan2(cam[0] - p.x, -cam[1] - p.z); }

// ---------------------------------------------------------------- smoke / dust cloud with volume and outline
// build { size (m, full radius), count, color, dark (second shade), life (s), rise (m/s), column (a rising stem) }
export function makeSmoke(stage, { size = 1.0, count = 14, color = [0.86, 0.86, 0.88], dark = null, life = 4, rise = 0.5, column = false, seed = 3, spread = 1 } = {}) {
  const g = new THREE.Group(), r = lcg(seed), P = [], d = dark || color.map(c => c * 0.72);
  for (let i = 0; i < count; i++) {
    const m = puff(i % 3 ? color : d); g.add(m);
    const a = r() * Math.PI * 2, e = column ? 0.15 + 0.85 * (i / count) : r() * 0.9;
    P.push({ m, dir: new THREE.Vector3(Math.cos(a) * spread * (column ? 0.25 : 1), column ? 1 : 0.35 + e * 0.6, Math.sin(a) * spread * (column ? 0.25 : 1)), rad: size * (0.28 + 0.22 * r()) * (column && i > count * 0.7 ? 1.6 : 1),
      delay: (column ? i / count * 0.8 : r() * 0.25), dist: size * (column ? 2.2 * e + 0.2 : 0.5 + 0.6 * r()), wob: r() * 6 });
  }
  g.userData.set = t => {
    g.visible = t >= 0 && t < life + 1; if (!g.visible) return;
    for (const p of P) {
      const u = t - p.delay; p.m.visible = u > 0; if (!p.m.visible) continue;
      const grow = easeOut(u / 0.7), fade = 1 - clamp01((t - life) / 1.0);
      const s = Math.max(1e-3, p.rad * (0.35 + 0.65 * grow) * (1 + 0.25 * u / life) * (0.25 + 0.75 * fade));
      p.m.scale.setScalar(s);
      p.m.position.copy(p.dir).multiplyScalar(p.dist * grow).add(new THREE.Vector3(0.04 * Math.sin(u * 1.3 + p.wob), rise * u, 0.04 * Math.cos(u * 1.1 + p.wob)));
    }
  };
  g.userData.set(-1); return g;
}

// ---------------------------------------------------------------- explosion: fireball -> smoke, debris thrown out
// build { size, debris (count), chunk (rgb), ground (z, group-local: landing height), seed, smoke }
export function makeExplosion(stage, { size = 1.2, debris = 16, chunk = [0.32, 0.24, 0.20], ground = 0, seed = 5, smokeColor = [0.55, 0.52, 0.52], life = 3.5 } = {}) {
  const g = new THREE.Group(), r = lcg(seed), fire = [], bits = [];
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), emat(i % 3 === 0 ? [1.0, 0.95, 0.55] : i % 3 === 1 ? [1.0, 0.55, 0.10] : [0.95, 0.25, 0.05], 1.5));
    const h = new THREE.Mesh(m.geometry, HULL); h.scale.setScalar(1.06); m.add(h); g.add(m); stage.glow(m, 1.2);
    const a = r() * 6.28, e = r(); fire.push({ m, o: new THREE.Vector3(Math.cos(a) * e, 0.3 + r() * 0.8, Math.sin(a) * e).multiplyScalar(size * 0.5), rad: size * (0.35 + 0.3 * r()) }); }
  const smoke = makeSmoke(stage, { size: size * 1.3, count: 16, color: smokeColor, life, rise: 0.6 * size, seed: seed + 1 }); g.add(smoke);
  for (let i = 0; i < debris; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), tmat(i % 4 === 0 ? [0.95, 0.45, 0.10] : chunk)); m.castShadow = true;
    const h = new THREE.Mesh(m.geometry, HULL); h.scale.setScalar(1.18); m.add(h); g.add(m);
    const a = r() * 6.28, up = 0.5 + r() * 0.9, sp = size * (2.2 + 2.2 * r());
    bits.push({ m, v: new THREE.Vector3(Math.cos(a) * sp * 0.6, up * sp, Math.sin(a) * sp * 0.6), s: size * (0.06 + 0.08 * r()), spin: new THREE.Vector3(r() * 9, r() * 9, r() * 9) });
  }
  g.userData.set = t => {
    g.visible = t >= 0 && t < life + 2; if (!g.visible) return;
    for (const p of fire) { const k = t < 0.12 ? t / 0.12 : 1, out = 1 - clamp01((t - 0.35) / 0.4); p.m.visible = out > 0.01;
      p.m.scale.setScalar(Math.max(1e-3, p.rad * (0.3 + 0.9 * easeOut(k)) * out)); p.m.position.copy(p.o).multiplyScalar(0.5 + 0.8 * easeOut(t / 0.5)); }
    smoke.userData.set(t - 0.15);
    const G = 9.8;
    for (const b of bits) {
      const tl = Math.min(t, 3.0); let y = b.v.y * tl - 0.5 * G * tl * tl; const landed = y < ground && tl > 0.1;
      let tt = tl; if (landed) { tt = (b.v.y + Math.sqrt(b.v.y * b.v.y + 2 * G * -ground)) / G; y = ground; }
      b.m.position.set(b.v.x * tt, y + b.s / 2, b.v.z * tt); b.m.scale.setScalar(b.s);
      b.m.rotation.set(b.spin.x * tt, b.spin.y * tt, b.spin.z * tt);
    }
  };
  g.userData.set(-1); return g;
}

// ---------------------------------------------------------------- crack: zig-zag fractures spreading from a point
// build { size (m), branches, color (ink, or a hot colour that glows), face: 'wall' (plane facing -y) | 'ground', seed }.
// set(t): the lines race out in 0.18 s, dust puffs at the hit, three chips fall. Lines stay.
export function makeCrack(stage, { size = 1.0, branches = 7, color = INK_RGB, glowK = 0, face = 'wall', seed = 7, dust = true, width = 0.03 } = {}) {
  const g = new THREE.Group(), r = lcg(seed), segs = [], plane = new THREE.Group(); g.add(plane);
  if (face === 'ground') plane.rotation.x = -Math.PI / 2;
  const m = glowK ? emat(color, glowK) : new THREE.MeshBasicMaterial({ color: lin(...color) });
  const addSeg = (x0, y0, ang, len, depth, w, start) => {
    let x = x0, y = y0; const n = 3 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const a = ang + (r() - 0.5) * 0.9, l = len / n, x1 = x + Math.cos(a) * l, y1 = y + Math.sin(a) * l;
      const s = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); s.position.set((x + x1) / 2, (y + y1) / 2, 0.004); s.rotation.z = Math.atan2(y1 - y, x1 - x);
      s.userData = { L: Math.hypot(x1 - x, y1 - y), w: w * (1 - i / (n + 1)), at: start + i / n * 0.6 }; plane.add(s); segs.push(s);
      if (depth > 0 && r() < 0.45) addSeg(x1, y1, a + (r() < 0.5 ? -0.8 : 0.8), len * 0.5, depth - 1, w * 0.6, start + (i + 1) / n * 0.6);
      x = x1; y = y1;
    }
  };
  for (let b = 0; b < branches; b++) addSeg(0, 0, b / branches * Math.PI * 2 + r() * 0.5, size * (0.6 + 0.5 * r()), 2, width * size, 0);
  if (glowK) stage.glow(plane, 1);
  const cloud = dust ? makeSmoke(stage, { size: size * 0.14, count: 6, color: [0.80, 0.76, 0.70], life: 0.9, rise: 0.12, seed: seed + 3, spread: 1.6 }) : null;
  if (cloud) g.add(cloud);
  const chips = []; for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), tmat([0.6, 0.58, 0.55])); const h = new THREE.Mesh(c.geometry, HULL); h.scale.setScalar(1.2); c.add(h); g.add(c); chips.push({ c, vx: (r() - 0.5) * 1.2, vz: -0.4 - r() * 0.8, s: 0.04 + r() * 0.04 }); }
  g.userData.set = t => {
    g.visible = t >= 0; if (!g.visible) return;
    const k = clamp01(t / 0.18);
    for (const s of segs) { const u = clamp01((k - s.userData.at * 0.8) / 0.25); s.visible = u > 0; s.scale.set(Math.max(1e-3, s.userData.L * u), s.userData.w, 1); }
    if (cloud) cloud.userData.set(t);
    for (const c of chips) { const tt = Math.min(t, 0.9); c.c.visible = t < 1.4; c.c.scale.setScalar(c.s);
      if (face === 'ground') c.c.position.set(c.vx * tt, 0.05 + 1.2 * tt - 4.9 * tt * tt > 0 ? 0.05 + 1.2 * tt - 4.9 * tt * tt : 0.02, c.vz * tt * -0.6);
      else c.c.position.set(c.vx * tt * 0.4, -4.9 * tt * tt, -c.vz * tt * 0.4 + 0.05); c.c.rotation.set(tt * 8, tt * 5, 0); }
  };
  g.userData.set(-1); return g;
}

// ---------------------------------------------------------------- shattering glass pane
// build { w, h (m), seed, n shards }: a pane (visible before t = 0 when show = 1) that breaks into shards that fly
// toward -y (the camera side) and fall, glinting. ground = z of the floor relative to the pane's bottom (negative).
export function makeShatter(stage, { w = 1.2, h = 1.0, n = 18, seed = 11, ground = -0.9, push = 1.6, color = [0.62, 0.86, 0.96] } = {}) {
  const g = new THREE.Group(), r = lcg(seed), pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: lin(...color), transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  pane.position.y = h / 2; pane.userData.noPrepass = true; g.add(pane);
  const mat = tmat(color, { sheen: 0.6, rim: 0.6 }), shards = [];
  for (let i = 0; i < n; i++) {
    const cx = (r() - 0.5) * w, cy = r() * h, s = 0.08 + r() * 0.16;
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-s * r(), -s * 0.6, 0), new THREE.Vector3(s, -s * r(), 0), new THREE.Vector3(s * (r() - 0.5), s, 0)]);
    geo.setIndex([0, 1, 2, 2, 1, 0]); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat); g.add(m); stage.prop(m);
    shards.push({ m, p: new THREE.Vector3(cx, cy, 0), v: new THREE.Vector3((cx / w) * 1.5 + (r() - 0.5), 0.6 + r() * 1.4, push * (0.5 + r())), spin: new THREE.Vector3(r() * 12, r() * 12, r() * 12) });
  }
  g.userData.set = (t, { show = 1 } = {}) => {
    g.visible = t >= 0 || show > 0.5; pane.visible = t < 0; if (!g.visible) return;
    for (const s of shards) {
      s.m.visible = t >= 0; if (t < 0) continue;
      const tt = Math.min(t, 2.5); let y = s.p.y + s.v.y * tt - 4.9 * tt * tt, ft = tt; if (y < ground) { ft = (s.v.y + Math.sqrt(s.v.y * s.v.y + 19.6 * (s.p.y - ground))) / 9.8; y = ground; }
      s.m.position.set(s.p.x + s.v.x * ft, y + 0.005, s.p.z + s.v.z * ft);
      if (y > ground) s.m.rotation.set(s.spin.x * tt, s.spin.y * tt, s.spin.z * tt); else s.m.rotation.set(-Math.PI / 2, 0, s.spin.z);
    }
  };
  g.userData.set(-1, { show: 0 }); return g;
}

// ---------------------------------------------------------------- sparks: hot streaks thrown from a point
// light ({rgb, power, dist}): the burst lights the set and the faces near it (FORENSIC.md section 7: reference FX cast
// light and stay in the set) - a point light that flashes up in 2 frames and dies with the sparks, flickering
export function makeSparks(stage, { n = 16, speed = 3.0, color = [1.0, 0.80, 0.25], seed = 13, life = 0.7, light = null } = {}) {
  const g = new THREE.Group(), r = lcg(seed), S = [], m = emat(color, 2.0);
  const pl = light ? new THREE.PointLight(new THREE.Color(...(light.rgb || color)), 0, light.dist ?? 3, 1.6) : null;
  if (pl) { pl.position.set(0, 0.05, 0); g.add(pl); }
  for (let i = 0; i < n; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 1), m); g.add(s); stage.glow(s, 1.5);
    const a = r() * 6.28, e = 0.2 + r() * 0.9; S.push({ s, v: new THREE.Vector3(Math.cos(a) * speed * (0.4 + r()), e * speed, Math.sin(a) * speed * (0.4 + r())), d: r() * 0.12 }); }
  g.userData.set = t => {
    g.visible = t >= 0 && t < life + 0.2;
    if (pl) pl.intensity = g.visible ? (light.power ?? 4) * Math.min(1, t / 0.066) * Math.max(0, 1 - t / life) ** 1.5 * (0.75 + 0.25 * Math.sin(t * 97 + seed)) : 0;
    if (!g.visible) return;
    for (const p of S) { const u = t - p.d, on = u > 0 && u < life; p.s.visible = on; if (!on) continue;
      const pos = new THREE.Vector3(p.v.x * u, p.v.y * u - 4.9 * u * u, p.v.z * u), vel = new THREE.Vector3(p.v.x, p.v.y - 9.8 * u, p.v.z);
      p.s.position.copy(pos); p.s.lookAt(pos.clone().add(vel)); p.s.scale.set(1, 1, Math.max(0.01, 0.12 * vel.length() / 3 * (1 - u / life))); }
  };
  g.userData.set(-1); return g;
}

// ---------------------------------------------------------------- steam: little puffs rising while `on` (also breath)
// build { dir: [x, y, z] Blender drift (m/s), size, rate (puffs a second), color }. set({ on 0..1, t })
export function makeSteam(stage, { dir = [0, 0, 0.6], size = 0.09, rate = 6, color = [0.97, 0.97, 0.98], seed = 2 } = {}) {
  const g = new THREE.Group(), r = lcg(seed), N = 10, P = [], D = tB(dir);
  for (let i = 0; i < N; i++) { const m = puff(i % 2 ? color : color.map(c => c * 0.85), 10); g.add(m); P.push({ m, ph: i / N, wob: r() * 6, sc: 0.7 + 0.6 * r() }); }
  g.userData.set = ({ on = 0, t = 0 } = {}) => {
    g.visible = on > 0.02; if (!g.visible) return;
    const per = N / rate;
    for (const p of P) { const u = ((t / per + p.ph) % 1); p.m.visible = true;
      p.m.scale.setScalar(Math.max(1e-3, size * p.sc * on * (0.4 + 1.2 * u) * (1 - Math.pow(u, 3))));
      p.m.position.copy(D).multiplyScalar(u * per * 0.6).add(new THREE.Vector3(0.03 * Math.sin(u * 9 + p.wob), 0, 0.03 * Math.cos(u * 7 + p.wob))); }
  };
  g.userData.set({}); return g;
}

// ---------------------------------------------------------------- splash: a crown of drops and a ripple ring on water
export function makeSplash(stage, { size = 0.6, n = 14, color = [0.55, 0.80, 1.0], seed = 17 } = {}) {
  const g = new THREE.Group(), r = lcg(seed), D = [];
  for (let i = 0; i < n; i++) { const m = puff(color, 8); g.add(m); const a = i / n * 6.28; D.push({ m, v: new THREE.Vector3(Math.cos(a) * (0.8 + r()), 2.2 + r() * 1.5, Math.sin(a) * (0.8 + r())).multiplyScalar(size), s: size * (0.06 + 0.05 * r()) }); }
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 40), new THREE.MeshBasicMaterial({ color: lin(0.92, 0.97, 1.0), transparent: true, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; g.add(ring);
  g.userData.set = t => {
    g.visible = t >= 0 && t < 2.2; if (!g.visible) return;
    for (const d of D) { const tt = Math.min(t, 1.2), y = d.v.y * tt - 4.9 * tt * tt; d.m.visible = y > -0.05; d.m.position.set(d.v.x * tt, y, d.v.z * tt); d.m.scale.setScalar(d.s); }
    const k = easeOut(t / 1.6); ring.scale.setScalar(Math.max(1e-3, size * (0.3 + 1.8 * k))); ring.material.opacity = 0.9 * (1 - k);
  };
  g.userData.set(-1); return g;
}

// ---------------------------------------------------------------- fall: a real object drops, lands with a squash, dust
// build { piece: a lib/sets/dress.js PIECES kind ('pot', 'crate', 'sign', ...), opts, height (m), scale }
export function makeFall(stage, { piece = 'crate', opts = {}, height = 4, scale = 1, spin = 1.2 } = {}) {
  const g = new THREE.Group(), obj = pieceGroup(piece, opts); obj.scale.setScalar(scale); g.add(obj);
  obj.traverse(m => { if (m.isMesh) m.castShadow = true; }); stage.prop(obj);
  const dust = makeSmoke(stage, { size: 0.45 * scale, count: 9, color: [0.82, 0.78, 0.70], life: 1.0, rise: 0.12, seed: 21, spread: 1.6 }); g.add(dust);
  const T = Math.sqrt(2 * height / 9.8);
  g.userData.set = t => {
    g.visible = t >= 0; if (!g.visible) return;
    if (t < T) { obj.position.y = height - 4.9 * t * t; obj.rotation.z = spin * (T - t); obj.scale.set(scale * 0.94, scale * 1.08, scale * 0.94); dust.visible = false; }
    else { const u = t - T; obj.position.y = 0; obj.rotation.z = 0; const sq = Math.exp(-u * 9) * Math.cos(u * 30) * 0.25;
      obj.scale.set(scale * (1 + sq), scale * (1 - sq), scale * (1 + sq)); dust.visible = true; dust.userData.set(u); }
  };
  g.userData.set(-1); return g;
}

// ---------------------------------------------------------------- shock: a dust ring racing over the ground + flying bits
export function makeShock(stage, { size = 3, n = 18, color = [0.78, 0.70, 0.58], bits = 12, seed = 19, life = 1.6 } = {}) {
  const g = new THREE.Group(), r = lcg(seed), P = [], B2 = [];
  for (let i = 0; i < n * 2; i++) { const m = puff(i % 2 ? color : color.map(c => c * 0.8), 10); g.add(m); P.push({ m, a: i / (n * 2) * 6.28 + r() * 0.2, s: (0.03 + 0.04 * r()) * Math.max(1, size / 3), lag: r() * 0.15 }); }
  for (let i = 0; i < bits; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.01, 0.07), tmat([[1.0, 0.55, 0.15], [0.95, 0.85, 0.30], [0.96, 0.95, 0.90]][i % 3])); g.add(m); stage.prop(m);
    B2.push({ m, a: r() * 6.28, up: 1 + r() * 1.5, sp: 0.5 + r() }); }
  g.userData.set = t => {
    g.visible = t >= 0 && t < life + 0.5; if (!g.visible) return;
    const k = easeOut(t / life), fade = 1 - clamp01((t - life * 0.6) / (life * 0.5));
    for (const p of P) { const kk = easeOut((t - p.lag) / life), R = size * kk; p.m.visible = t > p.lag; p.m.position.set(Math.cos(p.a) * R, p.s * 0.5, Math.sin(p.a) * R); p.m.scale.setScalar(Math.max(1e-3, p.s * (0.5 + 1.1 * kk) * fade)); }
    for (const b of B2) { const tt = Math.min(t, 1.4), R = size * 0.8 * b.sp * easeOut(tt / 0.8); b.m.position.set(Math.cos(b.a) * R, Math.max(0.01, b.up * tt - 2.5 * tt * tt), Math.sin(b.a) * R); b.m.rotation.set(tt * 7, tt * 4, tt * 3); }
  };
  g.userData.set(-1); return g;
}

// ---------------------------------------------------------------- meter: a real instrument standing in the set
// style 'db' (sound level meter on a tripod: dial + needle + LCD), 'gauge' (round pressure dial on a post),
// 'lcd' (a digital timer box), 'thermo' (a tall wall thermometer). build { max, unit, label, scale, red (share of the
// dial in the red) }. set({ show 0..1 (rises out of the ground / pops on its post), n (the reading) })
export function makeMeter(stage, { style = 'db', max = 180, unit = 'dB', label = 'SOUND LEVEL', scale = 1, red = 0.3, h = 1.2 } = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const M = c => tmat(c), box = (w, hh, d, c, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), M(c)); m.position.set(x, y, z); m.castShadow = true; body.add(m); return m; };
  const cyl = (r, hh, c, x, y, z, rx = 0) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, hh, 24), M(c)); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = true; body.add(m); return m; };
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex })); lcd.userData.noPrepass = true;
  let needle = null, mercury = null, last = null;
  const draw = n => { const c = cv.getContext('2d'); c.fillStyle = 'rgb(150,200,150)'; c.fillRect(0, 0, 256, 96); c.fillStyle = 'rgb(20,40,20)';
    c.font = '900 64px InterReel, Arial, sans-serif'; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(String(Math.round(n)), style === 'lcd' ? 200 : 180, 52);
    c.font = '700 26px Arial'; c.textAlign = 'left'; c.fillText(unit, style === 'lcd' ? 206 : 186, 60); tex.needsUpdate = true; };
  if (style === 'db' || style === 'gauge') {
    if (style === 'db') { for (const a of [0, 2.1, 4.2]) { const leg = box(0.03, h, 0.03, [0.12, 0.12, 0.14], Math.sin(a) * 0.18, h / 2, Math.cos(a) * 0.18); leg.rotation.set(Math.cos(a) * 0.18, 0, -Math.sin(a) * 0.18); } }
    else cyl(0.04, h, [0.45, 0.46, 0.48], 0, h / 2, 0);
    const y0 = h + 0.28;
    box(0.5, 0.62, 0.16, style === 'db' ? [1.0, 0.80, 0.16] : [0.62, 0.66, 0.70], 0, y0, 0);
    cyl(0.2, 0.03, [0.96, 0.95, 0.90], 0, y0 + 0.08, 0.085, Math.PI / 2);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 8, 32), M([0.1, 0.1, 0.12])); ring.position.set(0, y0 + 0.08, 0.1); body.add(ring);
    const arc = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.185, 24, 1, -Math.PI * 0.25, Math.PI * 1.5 * red), new THREE.MeshBasicMaterial({ color: lin(0.9, 0.1, 0.08) })); arc.position.set(0, y0 + 0.08, 0.102); arc.userData.noPrepass = true; body.add(arc);
    for (let i = 0; i <= 8; i++) { const a = Math.PI * 1.25 - i / 8 * Math.PI * 1.5; const t = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.035, 0.004), M([0.05, 0.05, 0.06])); t.position.set(Math.cos(a) * 0.16, y0 + 0.08 + Math.sin(a) * 0.16, 0.103); t.rotation.z = a - Math.PI / 2; body.add(t); }
    needle = new THREE.Group(); needle.position.set(0, y0 + 0.08, 0.108); body.add(needle);
    const nd = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.17, 0.006), M([0.85, 0.08, 0.06])); nd.position.y = 0.085; needle.add(nd);
    cyl(0.022, 0.02, [0.1, 0.1, 0.12], 0, y0 + 0.08, 0.11, Math.PI / 2);
    lcd.position.set(0, y0 - 0.2, 0.082); lcd.scale.set(0.34, 0.13, 1); body.add(lcd);
    if (style === 'db') { const mic = cyl(0.05, 0.22, [0.15, 0.15, 0.17], 0, y0 + 0.42, 0); const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 8), M([0.25, 0.25, 0.28])); ball.position.set(0, y0 + 0.55, 0); body.add(ball); }
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.07), new THREE.MeshBasicMaterial({ map: signTex(label, { bg: [0.05, 0.05, 0.06], fg: [1, 1, 1], border: null, w: 512, h: 80 }) })); lab.position.set(0, y0 + 0.27, 0.082); lab.userData.noPrepass = true; body.add(lab);
  } else if (style === 'lcd') {
    box(0.6, 0.34, 0.2, [0.2, 0.2, 0.22], 0, 0.17, 0); lcd.position.set(0, 0.18, 0.102); lcd.scale.set(0.5, 0.2, 1); body.add(lcd);
    for (const [x, c] of [[-0.22, [0.9, 0.1, 0.1]], [0.0, [0.1, 0.5, 0.9]], [0.22, [0.95, 0.8, 0.2]]]) { const w = cyl(0.012, 0.5, c, x, 0.1, 0.12, Math.PI / 2); w.rotation.z = 1.3; }
  } else if (style === 'thermo') {
    box(0.24, h, 0.06, [0.96, 0.95, 0.9], 0, h / 2, 0); const tube = cyl(0.03, h * 0.8, [0.85, 0.9, 0.95], 0, h * 0.52, 0.04);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 8), M([0.9, 0.1, 0.08])); bulb.position.set(0, h * 0.1, 0.04); body.add(bulb);
    mercury = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 10), M([0.9, 0.1, 0.08])); mercury.position.set(0, h * 0.12, 0.05); body.add(mercury);
    for (let i = 0; i < 9; i++) box(0.06, 0.008, 0.01, [0.05, 0.05, 0.06], -0.07, h * (0.18 + i * 0.085), 0.035);
    lcd.position.set(0, h + 0.08, 0.04); lcd.scale.set(0.3, 0.11, 1); body.add(lcd);
  }
  stage.prop(body); body.scale.setScalar(scale);
  g.userData.set = ({ show = 1, n = 0, jit = 0 } = {}) => {
    g.visible = show > 0.01; if (!g.visible) return;
    body.position.y = -1.2 * scale * (1 - back(show)) * (style === 'thermo' ? 0 : 1); body.scale.setScalar(scale * (style === 'thermo' ? Math.max(1e-3, back(show)) : 1));
    const k = clamp01(n / max);
    if (needle) needle.rotation.z = Math.PI * 0.75 - k * Math.PI * 1.5 + 0.06 * Math.sin(jit * 40) * (k > 0.6 ? 1 : 0.2);
    if (mercury) { const L = Math.max(0.01, h * 0.72 * k); mercury.scale.y = L; mercury.position.y = h * 0.12 + L / 2; }
    const s = Math.round(n); if (s !== last) { draw(s); last = s; }
  };
  g.userData.set({ show: 0 }); return g;
}

// ---------------------------------------------------------------- sign: a real sign that arrives in the set
// style 'post' (a signpost rises out of the ground with dust), 'hang' (drops in on two chains from above), 'board'
// (an A-frame board slides in), 'plaque' (pops on a wall). text may hold {n}. set({ show 0..1, n, t })
export function makeSign(stage, { text = 'SIGN', sub = null, w = 1.0, h = 0.5, bg = [0.98, 0.96, 0.88], fg = [0.05, 0.05, 0.06], style = 'post', pole = 1.6, scale = 1, drop = 2.5 } = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const M = c => tmat(c), add = (geo, c, x, y, z) => { const m = new THREE.Mesh(geo, M(c)); m.position.set(x, y, z); m.castShadow = true; body.add(m); return m; };
  const y0 = style === 'hang' ? 0 : style === 'board' ? 0.5 : style === 'plaque' ? 0 : pole + h / 2;
  if (style === 'post') { add(new THREE.CylinderGeometry(0.04, 0.04, pole, 10), [0.2, 0.21, 0.24], 0, pole / 2, 0); }
  if (style === 'hang') for (const x of [-w * 0.4, w * 0.4]) add(new THREE.CylinderGeometry(0.01, 0.01, 3, 4), [0.2, 0.21, 0.24], x, h / 2 + 1.5, 0);
  if (style === 'board') { const a = add(new THREE.BoxGeometry(w, h * 2, 0.04), [0.3, 0.16, 0.06], 0, 0.5, 0.1); a.rotation.x = -0.2; }
  add(new THREE.BoxGeometry(w + 0.06, h + 0.06, 0.05), [0.12, 0.12, 0.14], 0, y0, 0);
  const cv = document.createElement('canvas'), tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  cv.width = 512; cv.height = Math.max(64, Math.round(512 * h / w));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 })); face.position.set(0, y0, 0.027); face.userData.noPrepass = true; body.add(face);
  let last = null; const css = c => `rgb(${c.map(x => Math.round(255 * Math.pow(clamp01(x), 1 / 2.2))).join(',')})`;
  const draw = s => { const c = cv.getContext('2d'), W = cv.width, H = cv.height; c.fillStyle = css(bg); c.fillRect(0, 0, W, H); c.strokeStyle = css(fg); c.lineWidth = H * 0.05; c.strokeRect(H * 0.05, H * 0.05, W - H * 0.1, H - H * 0.1);
    let px = Math.floor(H * (sub ? 0.46 : 0.62)); c.font = `900 ${px}px InterReel, Arial, sans-serif`; const tw = c.measureText(s).width; if (tw > W * 0.86) { px = Math.floor(px * W * 0.86 / tw); c.font = `900 ${px}px InterReel, Arial, sans-serif`; }
    c.fillStyle = css(fg); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, W / 2, H * (sub ? 0.42 : 0.53));
    if (sub) { c.font = `700 ${Math.floor(H * 0.18)}px InterReel, Arial, sans-serif`; c.fillText(sub, W / 2, H * 0.78); } tex.needsUpdate = true; };
  stage.prop(body); body.scale.setScalar(scale);
  const dust = style === 'post' || style === 'board' ? makeSmoke(stage, { size: 0.35 * scale, count: 8, color: [0.84, 0.80, 0.72], life: 0.9, rise: 0.1, seed: 31, spread: 1.4 }) : null; if (dust) g.add(dust);
  g.userData.set = ({ show = 0, n = 0, t = 0, t0 = null } = {}) => {
    g.visible = show > 0.01; if (!g.visible) return;
    const k = back(show);
    if (style === 'post') { body.position.y = -(pole + h) * scale * (1 - k); }
    else if (style === 'hang') { body.position.y = drop * (1 - k); body.rotation.z = 0.12 * Math.sin(t * 5) * Math.exp(-Math.max(0, show >= 1 ? t - (t0 ?? 0) : 0) * 1.5) * (show >= 1 ? 1 : 0); }
    else if (style === 'board') { body.position.x = -1.5 * (1 - k); }
    else { body.scale.setScalar(scale * Math.max(1e-3, k)); }
    if (dust) { const u = show >= 0.999 && t0 != null ? t - t0 : -1; dust.userData.set(u); }
    const s = text.replace('{n}', String(Math.round(n))); if (s !== last) { draw(s); last = s; }
  };
  g.userData.set({}); return g;
}

// ---------------------------------------------------------------- chalk: writing and drawing on a real board
// build { w, h (m, the drawn area), lines: [text...], bars: [values] + labels (a chalk bar chart), color }.
// set({ draw 0..1 (the hand writes, left to right, top to bottom), grow 0..1 (bars rise), n }) - lives on the board face
export function makeChalk(stage, { w = 2.4, h = 1.1, lines = [], bars = null, labels = [], color = [0.96, 0.96, 0.92], max = null, yellow = [1.0, 0.85, 0.30] } = {}) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = Math.round(1024 * h / w);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.userData.noPrepass = true; const g = new THREE.Group(); g.add(m);
  const css = (c, a = 1) => `rgba(${c.map(x => Math.round(255 * Math.pow(clamp01(x), 1 / 2.2))).join(',')},${a})`;
  let last = '';
  const draw = (dr, gr, n) => {
    const key = `${dr.toFixed(3)}|${gr.toFixed(3)}|${n}`; if (key === last) return; last = key;
    const c = cv.getContext('2d'), W = cv.width, H = cv.height; c.clearRect(0, 0, W, H);
    c.save(); const total = lines.length + (bars ? 1 : 0); let shown = dr * total;
    c.fillStyle = css(color, 0.92); c.strokeStyle = css(color, 0.9); c.lineCap = 'round'; c.lineJoin = 'round';
    const lh = bars ? H * 0.2 : H / Math.max(1, lines.length) * 0.8;
    lines.forEach((t, i) => { const k = clamp01(shown - i); if (k <= 0) return; const s = t.replace('{n}', String(Math.round(n)));
      c.font = `700 ${Math.floor(lh * 0.8)}px "Comic Sans MS", "Chalkboard SE", Arial, sans-serif`; c.textAlign = 'left'; c.textBaseline = 'middle';
      const tw = c.measureText(s).width, x0 = (W - tw) / 2, y = lh * (i + 0.6);
      c.save(); c.beginPath(); c.rect(x0 - 5, y - lh / 2, tw * k + 10, lh); c.clip(); c.fillText(s, x0, y); c.restore(); });
    if (bars && shown > lines.length) {
      const k = clamp01(shown - lines.length), top = lh * (lines.length + 0.2), base = H * 0.93, mx = max || Math.max(...bars), bw = W / (bars.length * 1.8);
      c.lineWidth = 6; c.beginPath(); c.moveTo(W * 0.08, top); c.lineTo(W * 0.08, base); c.lineTo(W * 0.08 + (W * 0.86) * k, base); c.stroke();
      bars.forEach((v, i) => { const x = W * 0.12 + i * (W * 0.84 / bars.length) + bw * 0.3, bh = (base - top - 30) * (v / mx) * easeOut(gr);
        if (bh > 2) { c.strokeStyle = css(i === bars.length - 1 ? yellow : color, 0.9); c.lineWidth = 7; c.strokeRect(x, base - bh, bw, bh);
          for (let yy = base - 12; yy > base - bh; yy -= 16) { c.beginPath(); c.moveTo(x + 4, yy); c.lineTo(x + bw - 4, yy - 10); c.stroke(); } }
        c.fillStyle = css(color, 0.9); c.font = `700 ${Math.floor(H * 0.08)}px "Comic Sans MS", Arial, sans-serif`; c.textAlign = 'center'; c.fillText(labels[i] || '', x + bw / 2, base + H * 0.0 - 6 - bh - H * 0.04); });
    }
    c.restore(); tex.needsUpdate = true;
  };
  g.userData.set = ({ draw: d = 0, grow = 0, n = 0 } = {}) => { g.visible = d > 0.001; if (g.visible) draw(d, grow, n); };
  g.userData.set({}); return g;
}

// ---------------------------------------------------------------- speakers: a row of real speaker stacks, each louder
// build { n, labels (painted on each base), step (m between) }. set({ grow 0..1 (stacks rise one after another), t, pump })
export function makeSpeakers(stage, { n = 5, step = 0.42, labels = [], h0 = 0.25, dh = 0.22 } = {}) {
  const g = new THREE.Group(), S = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Group(), H = h0 + i * dh, x = (i - (n - 1) / 2) * step; s.position.x = x; g.add(s);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.34, H, 0.3), tmat([0.10, 0.10, 0.12])); cab.position.y = H / 2; cab.castShadow = true; s.add(cab);
    const cones = [];
    for (let k = 0; k < Math.max(1, Math.round(H / 0.22)); k++) { const cy = 0.11 + k * 0.22; if (cy > H - 0.05) break;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 18), tmat([0.30, 0.30, 0.33])); c.rotation.x = Math.PI / 2; c.position.set(0, cy, 0.155); s.add(c);
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.025, 12), tmat([0.75, 0.76, 0.78])); d.rotation.x = Math.PI / 2; d.position.set(0, cy, 0.165); s.add(d); cones.push(c, d); }
    if (labels[i]) { const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.09), new THREE.MeshBasicMaterial({ map: signTex(labels[i], { bg: [1.0, 0.80, 0.16], fg: [0.05, 0.05, 0.06], w: 256, h: 90 }) }));
      lab.position.set(0, 0.06, 0.152); lab.userData.noPrepass = true; s.add(lab); }
    S.push({ s, cones, i }); stage.prop(s);
  }
  g.userData.set = ({ grow = 0, show = 1, t = 0, pump = 0 } = {}) => {
    g.visible = show > 0.01 && grow > 0.001; if (!g.visible) return;
    for (const p of S) { const k = back(clamp01(grow * n - p.i)); p.s.visible = k > 0.01; p.s.scale.set(1, Math.max(1e-3, k), 1);
      const z = 1 + (pump > 0 ? 0.25 * pump * (p.i + 1) / n * Math.max(0, Math.sin(t * 28 + p.i)) : 0); for (const c of p.cones) c.scale.set(z, 1, z); }
  };
  g.userData.set({}); return g;
}

// ---------------------------------------------------------------- flock: gulls / birds flapping across the sky
// build { n, span (m, the stretch they cross and wrap in), speed (m/s), dir: [x, y] (Blender), size, seed }. set(t): always on
export function makeFlock(stage, { n = 6, span = 30, speed = 2.5, dir = [1, 0.2], size = 0.35, seed = 23, color = [0.08, 0.08, 0.10] } = {}) {
  const g = new THREE.Group(), r = lcg(seed), B2 = [], m = new THREE.MeshBasicMaterial({ color: lin(...color), side: THREE.DoubleSide });
  const d = new THREE.Vector3(dir[0], 0, -dir[1]).normalize();
  for (let i = 0; i < n; i++) { const b = new THREE.Group(), wl = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 0.18), m), wr = wl.clone();
    wl.geometry = wl.geometry.clone(); wl.geometry.translate(-size / 2, 0, 0); wr.geometry = wr.geometry.clone(); wr.geometry.translate(size / 2, 0, 0);
    wl.rotation.x = wr.rotation.x = -Math.PI / 2; const hl = new THREE.Group(), hr = new THREE.Group(); hl.add(wl); hr.add(wr); b.add(hl, hr);
    b.userData = { hl, hr, off: r() * span, up: (r() - 0.5) * span * 0.12, side: (r() - 0.5) * span * 0.2, ph: r() * 6, sp: speed * (0.8 + 0.4 * r()) };
    g.add(b); B2.push(b); }
  g.userData.set = t => { for (const b of B2) { const u = b.userData, x = ((u.off + u.sp * t) % span) - span / 2;
    b.position.copy(d).multiplyScalar(x).add(new THREE.Vector3(-d.z * u.side, u.up + 0.1 * Math.sin(t * 2 + u.ph), d.x * u.side)); b.rotation.y = Math.atan2(-d.z, d.x);
    const a = 0.6 * Math.sin(t * 9 + u.ph); u.hl.rotation.z = a; u.hr.rotation.z = -a; } };
  g.userData.set(0); return g;
}

// ---------------------------------------------------------------- the MAKE kinds (engine/play.js registers them)
// IN_WORLD: every kind a storyboard `fx` may list (gates.mjs "fx in world"); LABELS: floating text kinds, counted by the
// label budget (<= 3 per 30 s, storyboard `labels`); DIAGRAM: floating marks that are neither (rings, arrows, rays, star)
export const LABELS = ['stamp', 'callout', 'bars', 'split'];
export const DIAGRAM = ['rings', 'flow', 'rays', 'star', 'shimmer'];
const groundZ = (o, p) => (o.ground ?? 0) - p[2];
export const PHYS = {
  smoke: (stage, o, ctx) => { const g = makeSmoke(stage, o); ctx.group.add(g); return { obj: g, apply: (v, f, env) => { g.position.copy(tB(env.at(o.at))); g.userData.set(tSec(v, f, ctx.fps)); } }; },
  explosion: (stage, o, ctx) => { const p0 = ctx.point(Array.isArray(o.at) || typeof o.at === 'string' ? o.at : [0, 0, 0]);
    const g = makeExplosion(stage, { ...o, ground: o.ground != null ? o.ground - p0[2] : -p0[2] }); ctx.group.add(g);
    return { obj: g, apply: (v, f, env) => { g.position.copy(tB(env.at(o.at))); g.userData.set(tSec(v, f, ctx.fps)); } }; },
  crack: (stage, o, ctx) => { const g = makeCrack(stage, o); ctx.group.add(g); g.rotation.y = (o.yaw ?? 0) * Math.PI / 180;
    return { obj: g, apply: (v, f, env) => { g.position.copy(tB(env.at(o.at))); g.userData.set(tSec(v, f, ctx.fps)); } }; },
  shatter: (stage, o, ctx) => { const g = makeShatter(stage, o); ctx.group.add(g); g.rotation.y = (o.yaw ?? 0) * Math.PI / 180;
    return { obj: g, apply: (v, f, env) => { g.position.copy(tB(env.at(o.at))); g.userData.set(tSec(v, f, ctx.fps), { show: v('show', o.show ?? 1) }); } }; },
  sparks: (stage, o, ctx) => { const g = makeSparks(stage, o); ctx.group.add(g); return { obj: g, apply: (v, f, env) => { g.position.copy(tB(env.at(o.at))); g.userData.set(tSec(v, f, ctx.fps)); } }; },
  steam: (stage, o, ctx) => { const g = makeSteam(stage, o); ctx.group.add(g); return { obj: g, apply: (v, f, env) => { g.position.copy(tB(env.at(o.at))); g.userData.set({ on: v('on', 0), t: f / ctx.fps }); } }; },
  splash: (stage, o, ctx) => { const g = makeSplash(stage, o); ctx.group.add(g); return { obj: g, apply: (v, f, env) => { g.position.copy(tB(env.at(o.at))); g.userData.set(tSec(v, f, ctx.fps)); } }; },
  fall: (stage, o, ctx) => { const g = makeFall(stage, o); ctx.group.add(g); g.rotation.y = (o.yaw ?? 0) * Math.PI / 180;
    return { obj: g, apply: (v, f, env) => { g.position.copy(tB(env.at(o.at))); g.userData.set(tSec(v, f, ctx.fps)); } }; },
  shock: (stage, o, ctx) => { const g = makeShock(stage, o); ctx.group.add(g); return { obj: g, apply: (v, f, env) => { g.position.copy(tB(env.at(o.at))); g.userData.set(tSec(v, f, ctx.fps)); } }; },
  // meter / sign: yaw fixed at build (`yaw` deg, Blender) or turned once toward the camera of the frame (face: true)
  meter: (stage, o, ctx) => { const g = makeMeter(stage, o); ctx.group.add(g); g.rotation.y = (o.yaw ?? 0) * Math.PI / 180;
    return { obj: g, apply: (v, f, env) => { g.position.copy(tB(env.at(o.at))); g.userData.set({ show: v('show', 0), n: v('n', 0), jit: f / ctx.fps }); },
      post: cam => { if (o.face) g.rotation.y = faceYaw(g, cam); } }; },
  sign: (stage, o, ctx) => { const g = makeSign(stage, o); ctx.group.add(g); g.rotation.y = (o.yaw ?? 0) * Math.PI / 180;
    return { obj: g, apply: (v, f, env) => { g.position.copy(tB(env.at(o.at))); g.userData.set({ show: v('show', 0), n: v('n', 0), t: f / ctx.fps, t0: v('t0') != null ? v('t0') / ctx.fps : null }); },
      post: cam => { if (o.face) g.rotation.y = faceYaw(g, cam); } }; },
  chalk: (stage, o, ctx) => { const g = makeChalk(stage, o); ctx.group.add(g); g.rotation.y = (o.yaw ?? 0) * Math.PI / 180;
    return { obj: g, apply: (v, f, env) => { g.position.copy(tB(env.at(o.at))); g.userData.set({ draw: v('draw', 0), grow: v('grow', 0), n: v('n', 0) }); } }; },
  flock: (stage, o, ctx) => { const g = makeFlock(stage, o); ctx.group.add(g); return { obj: g, apply: (v, f, env) => { g.position.copy(tB(env.at(o.at))); g.userData.set(f / ctx.fps); } }; },
  speakers: (stage, o, ctx) => { const g = makeSpeakers(stage, o); ctx.group.add(g); g.rotation.y = (o.yaw ?? 0) * Math.PI / 180;
    return { obj: g, apply: (v, f, env) => { g.position.copy(tB(env.at(o.at))); g.userData.set({ grow: v('grow', 0), show: v('show', 1), t: f / ctx.fps, pump: v('pump', 0) }); } }; },
};
