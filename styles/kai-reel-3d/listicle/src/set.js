// set.js · reel63 PIT STOP (ksa-reel-3d listicle): Clawd Racing's pit box on a warm late afternoon.
// Units = metres. Clawd at CL_S 0.045 ≈ 0.54 m wide × 0.45 m tall. The car sits in the pit box at the origin, nose to +x.
// Layout (top view): garage wall at z -2.6 (red, 3 open bays) · pit box (yellow lines) around the car · pit lane (white dashes)
// at z +1.2 · start-light gantry over the pit exit at x +3.4 · tyre stacks and a tool cart for depth.
// Shared props: makeCar() (the continuity prop: 4 upgrade slots filled chapter by chapter) and the light gantry (5 lamps).
import * as THREE from 'three';
import { V, hsh } from './stage.js';

export const CL_S = 0.045;                                         // every Clawd in the reel uses this scale
export const GROUND = 0;
export const PIT = { carX: 0, carZ: 0, laneZ: 1.2, exitX: 3.4, wallZ: -2.6 };
export const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0, ...o });
export const box = (w, h, d, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.castShadow = b.receiveShadow = true; return b; };
// a canvas-text texture (signs, plates). Only words and the script's numbers on screen.
export const lbl = (txt, w, h, px, fg, bg, fam = 'Inter, "Helvetica Neue", Arial, sans-serif', weight = 800) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); } g.fillStyle = fg; g.font = `${weight} ${px}px ${fam}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(txt, w / 2, h / 2 + px * 0.04); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

// ---------------------------------------------------------------- the race car (continuity prop)
// car.g = group at the car origin (ground, centre). car.slot.p1..p4 = empty groups where each chapter mounts its upgrade:
//   p1 (Ponytail)   rear deck, behind the cockpit        p2 (OmniRoute) left side pod (the fuel cell)
//   p3 (Graphify)   on the nose, in front of the cockpit p4 (Agent Skills) the rear wing
// car.seat = where the driver Clawd stands (inside the cockpit; his body shows above the rim). car.wheels = 4 wheel meshes (spin them).
export function makeCar() {
  const g = new THREE.Group(), red = std('#ece6da', { roughness: 0.3, metalness: 0.1 })   // livery: cream body (reads against the red suit + red garage), red stripe
  , stripeM = std('#d8622f', { roughness: 0.35 }), dark = std('#1b1d22', { roughness: 0.5 });
  const white = std('#f3efe6', { roughness: 0.45 }), tyre = std('#141414', { roughness: 0.85 }), rim = std('#c9ccd2', { roughness: 0.3, metalness: 0.6 });
  const body = new THREE.Group(); g.add(body);
  const tub = box(1.5, 0.26, 0.62, red); tub.position.set(0, 0.24, 0); body.add(tub);
  const nose = box(0.9, 0.14, 0.32, red); nose.position.set(1.12, 0.17, 0); body.add(nose);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.32, 4), red); tip.rotation.z = -Math.PI / 2; tip.rotation.x = Math.PI / 4; tip.position.set(1.7, 0.17, 0); tip.castShadow = true; body.add(tip);
  const fwing = box(0.26, 0.04, 1.2, dark); fwing.position.set(1.62, 0.07, 0); body.add(fwing);
  const stripe = box(1.52, 0.02, 0.18, stripeM); stripe.position.set(0, 0.375, 0); body.add(stripe);
  const pods = [-1, 1].map(s => { const p = box(0.9, 0.2, 0.22, red); p.position.set(-0.1, 0.2, s * 0.42); body.add(p); return p; });
  const engine = box(0.6, 0.3, 0.4, red); engine.position.set(-0.85, 0.3, 0); body.add(engine);
  const rwPost = box(0.06, 0.32, 0.06, dark); rwPost.position.set(-1.12, 0.5, 0); body.add(rwPost);
  const rwing = box(0.3, 0.05, 1.1, dark); rwing.position.set(-1.14, 0.68, 0); body.add(rwing);
  const plates = [-1, 1].map(s => { const p = box(0.36, 0.26, 0.03, red); p.position.set(-1.14, 0.62, s * 0.55); body.add(p); return p; });
  const num = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.18), new THREE.MeshStandardMaterial({ map: lbl('CLAWD', 512, 256, 120, '#d8622f', null), transparent: true, roughness: 0.6 }));
  num.position.set(0.25, 0.372, 0); num.rotation.x = -Math.PI / 2; num.rotation.z = -Math.PI / 2; body.add(num);
  // cockpit rim (the driver's body shows above it)
  const cockpit = box(0.62, 0.06, 0.5, dark); cockpit.position.set(0.18, 0.39, 0); cockpit.scale.set(1, 1, 1); body.add(cockpit);
  const wheels = [[0.95, 1], [0.95, -1], [-0.8, 1], [-0.8, -1]].map(([x, s]) => {
    const w = new THREE.Group(); w.position.set(x, 0.24, s * 0.62); g.add(w);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, x < 0 ? 0.3 : 0.24, 28), tyre); t.rotation.x = Math.PI / 2; t.castShadow = t.receiveShadow = true; w.add(t);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, (x < 0 ? 0.3 : 0.24) + 0.01, 16), rim); r.rotation.x = Math.PI / 2; w.add(r);
    const sp = box(0.05, 0.26, (x < 0 ? 0.3 : 0.24) + 0.02, rim); w.add(sp);                  // a spoke so the spin reads
    return w; });
  const slot = {};
  for (const [k, p] of Object.entries({ p1: [-0.55, 0.45, 0], p2: [-0.1, 0.3, 0.55], p3: [0.85, 0.25, 0], p4: [-1.14, 0.72, 0] })) {
    const s = new THREE.Group(); s.position.set(...p); g.add(s); slot[k] = s; }
  const seat = V(0.12, 0.14, 0);                                   // driver origin (Clawd's feet) in car space: head + eyes clear the rim
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { g, body, wheels, slot, seat, mats: { red, dark, white }, parts: { tub, nose, pods, engine, rwing, cockpit, fwing } };
}

// ---------------------------------------------------------------- the world
export function buildSet(S) {
  const scene = S.scene, G = new THREE.Group(); scene.add(G);
  scene.background = new THREE.Color('#f2c79a');   // warm sky
  scene.fog = new THREE.Fog('#f2c79a', 9, 22);
  // lights: warm low sun from front-left, sky fill, a cool bounce from the lane
  const hemi = new THREE.HemisphereLight('#ffe6c8', '#5a4f48', 1.0); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffcf9a', 3.0); sun.position.set(-3.5, 4.2, 4.5); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 4, bottom: -3, near: 0.5, far: 16 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
  sun.target.position.set(0.4, 0, -0.3); scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#9fc4ff', 0.7); fill.position.set(4, 2, 3); fill.target.position.set(0, 0.3, 0); scene.add(fill, fill.target);
  const rim = new THREE.DirectionalLight('#ffd9b0', 1.2); rim.position.set(1, 3, -5); rim.target.position.set(0, 0.4, 0); scene.add(rim, rim.target);
  // ground: asphalt + pit box + lane dashes
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), std('#4a4d55', { roughness: 0.92 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; G.add(ground);
  const paint = (w, d, c, x, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std(c, { roughness: 0.8 })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.002, z); m.receiveShadow = true; G.add(m); return m; };
  for (const [w, d, x, z] of [[3.4, 0.06, 0, -0.95], [3.4, 0.06, 0, 0.95], [0.06, 1.96, -1.7, 0], [0.06, 1.96, 1.7, 0]]) paint(w, d, '#f2c230', x, z);
  for (let x = -12; x < 14; x += 1.2) paint(0.6, 0.07, '#f3efe6', x, PIT.laneZ + 0.35);
  paint(40, 0.12, '#f3efe6', 0, PIT.laneZ + 1.6);
  // garage: red wall with 3 open bays, a sign
  const wallM = std('#2f5f73', { roughness: 0.6 });   // teal-blue wall: the cast is mostly red (crew jackets, roles), so the wall must not be
  const wall = box(16, 3.2, 0.2, wallM); wall.position.set(0, 1.6, PIT.wallZ); G.add(wall);
  for (const x of [-3.2, 0, 3.2]) { const bay = box(2.4, 2.0, 0.22, std('#16181d', { roughness: 0.9 })); bay.position.set(x, 1.0, PIT.wallZ + 0.02); G.add(bay);
    const shutter = box(2.4, 0.5, 0.25, std('#8a8f99', { roughness: 0.5, metalness: 0.3 })); shutter.position.set(x, 2.15, PIT.wallZ + 0.03); G.add(shutter); }
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.6), new THREE.MeshStandardMaterial({ map: lbl('CLAWD RACING', 1400, 200, 130, '#ffffff', '#1b1d22'), roughness: 0.6 }));
  sign.position.set(0, 2.75, PIT.wallZ + 0.12); G.add(sign);
  // a few garage lamps (warm pools inside the bays)
  for (const x of [-3.2, 0, 3.2]) { const l = new THREE.PointLight('#ffb36b', 1.2, 3, 2); l.position.set(x, 1.6, PIT.wallZ + 0.6); scene.add(l); }
  // tyre stacks + a tool cart (depth on both sides)
  const tyreM = std('#141414', { roughness: 0.85 });
  for (const [x, z, n] of [[-2.6, -1.6, 4], [-3.1, -1.2, 3], [2.6, -1.7, 4]]) for (let i = 0; i < n; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.09, 10, 24), tyreM); t.rotation.x = Math.PI / 2; t.position.set(x, 0.09 + i * 0.18, z); t.castShadow = t.receiveShadow = true; G.add(t); }
  const cart = box(0.7, 0.55, 0.4, std('#c8302c', { roughness: 0.4 })); cart.position.set(-2.2, 0.32, -0.9); G.add(cart);
  // the start-light gantry over the pit exit: a beam and 5 lamps (gantry.set(i, 0..1) lights lamp i red; gantry.green(k) all green)
  const gantry = new THREE.Group(); gantry.position.set(PIT.exitX, 0, PIT.laneZ - 0.2); G.add(gantry);
  for (const z of [-1.4, 1.4]) { const p = box(0.12, 2.4, 0.12, std('#2a2d35')); p.position.set(0, 1.2, z); gantry.add(p); }
  const beam = box(0.3, 0.36, 3.0, std('#1b1d22')); beam.position.set(0, 2.3, 0); gantry.add(beam);
  const lampM = [], lamps = [];
  for (let i = 0; i < 5; i++) { const m = new THREE.MeshStandardMaterial({ color: '#2a0d0d', emissive: new THREE.Color('#ff2a1a'), emissiveIntensity: 0, roughness: 0.3 });
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 14), m); s.position.set(0.16, 2.3, -1.0 + i * 0.5); gantry.add(s); lampM.push(m); lamps.push(s); }
  const gantryAPI = { g: gantry, lamps, set(i, k) { lampM[i].emissiveIntensity = 6 * k; lampM[i].emissive.set('#ff2a1a'); },
    green(k) { lampM.forEach(m => { m.emissive.set('#2aff6a'); m.emissiveIntensity = 6 * k; }); }, off() { lampM.forEach(m => { m.emissiveIntensity = 0; m.emissive.set('#ff2a1a'); }); } };
  // background: a grandstand silhouette and the sky gradient band
  const stand = box(18, 2.6, 2, std('#6d5a52', { roughness: 0.95 })); stand.position.set(0, 1.3, 9.5); stand.castShadow = false; G.add(stand);
  scene.updateMatrixWorld(true);
  return { G, sun, hemi, fill, rim, ground, wall, sign, gantry: gantryAPI, cart };
}
