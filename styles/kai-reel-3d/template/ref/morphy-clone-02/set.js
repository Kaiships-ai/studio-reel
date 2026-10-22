// set.js (morphy-clone-02): Morphy reel #2's world at Blocky-Kai scale (metres; Kai ≈ 0.98 m): both characters on a giant
// keyboard, a giant monitor behind them (canvas screen = the website the models build), night room beyond.
// Kai sits on a popped-up key (his stool); Clawd stands on the key tops. Lights: violet ambient, warm key front-left,
// the screen as a big cool light from behind (rim), a soft fill.
import * as THREE from 'three';
import { V, hsh } from './stage.js';

export const DECK = 0.07;                                         // key-top height (characters stand here)
export const SCR = { x: 0, y: 0.95, z: -0.95, w: 2.6, h: 1.62 };  // monitor screen centre / size (16:10)
export const SEAT = { x: 0.2, z: 0.02, h: 0.215 };                // Kai's popped-up key: top = DECK + h
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0, ...o });
const box = (w, h, d, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.castShadow = b.receiveShadow = true; return b; };

export function buildSet(S) {
  const scene = S.scene, G = new THREE.Group(); scene.add(G);
  scene.background = new THREE.Color('#04050f');
  // ---------------------------------------------------------------- lights
  const hemi = new THREE.HemisphereLight('#6a70d8', '#141026', 0.7); scene.add(hemi);
  const key = new THREE.DirectionalLight('#ffd6b0', 2.2); key.position.set(-0.6, 1.5, 1.8); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -1.2, right: 1.2, top: 1.2, bottom: -0.6, near: 0.1, far: 6 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.01;
  key.target.position.set(0, 0.3, 0); scene.add(key, key.target);
  const scrLight = new THREE.DirectionalLight('#9fb0ff', 2.0); scrLight.position.set(0.1, 1.0, -1.6); scrLight.target.position.set(0, 0.3, 0.3); scene.add(scrLight, scrLight.target);
  const fill = new THREE.DirectionalLight('#8a7cff', 0.7); fill.position.set(1.4, 0.6, 1.2); fill.target.position.set(0, 0.35, 0); scene.add(fill, fill.target);
  const screenGlow = new THREE.PointLight('#c9d4ff', 0.6, 2.4, 2); screenGlow.position.set(0, 0.8, SCR.z + 0.35); scene.add(screenGlow);
  // ---------------------------------------------------------------- room: desk slab, back wall, a dark window with stars
  const desk = box(6, 0.04, 4, std('#191726', { roughness: 0.6 })); desk.position.set(0, -0.02, 0.2); G.add(desk);
  const wallM = std('#121027', { roughness: 0.95 }); const wall = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallM); wall.position.set(0, 2.0, -2.4); G.add(wall);
  const stars = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' }), 90), mtx = new THREE.Matrix4();
  for (let i = 0; i < 90; i++) { mtx.compose(V(-3 + 6 * hsh(i, 1), 1.75 + 1.6 * hsh(i, 2), -2.35), new THREE.Quaternion(), V(1, 1, 1).multiplyScalar(0.6 + 1.6 * hsh(i, 3))); stars.setMatrixAt(i, mtx);
    stars.setColorAt(i, new THREE.Color(hsh(i, 4) > 0.7 ? '#ffd9a0' : '#b9c6ff').multiplyScalar(1.5 + 3 * hsh(i, 5))); } G.add(stars);
  // ---------------------------------------------------------------- keyboard: dark keys, a violet underglow between them
  const KW = 0.25, GAP = 0.035, rows = [], keys = [];
  for (let r = 0; r < 7; r++) { const z = 0.75 - r * (KW + GAP); let x = -1.9 + (r % 2) * 0.12;
    while (x < 1.9) { const w = KW * (hsh(r, x * 9) > 0.86 ? 1.9 : 1); keys.push([x + w / 2, z, w]); x += w + GAP; } rows.push(z); }
  const kb = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.03, rows.length * (KW + GAP) + 0.1), std('#0c0b18', { emissive: new THREE.Color('#2b2a8a'), emissiveIntensity: 0.55 }));
  kb.position.set(0, 0.015, (rows[0] + rows[rows.length - 1]) / 2); kb.receiveShadow = true; G.add(kb);
  const capG = new THREE.BoxGeometry(1, 1, 1), capM = std('#25233a', { roughness: 0.55 });
  const caps = new THREE.InstancedMesh(capG, capM, keys.length); caps.castShadow = caps.receiveShadow = true;
  keys.forEach(([x, z, w], i) => { mtx.compose(V(x, DECK / 2 + 0.01, z), new THREE.Quaternion(), V(w, DECK - 0.02, KW)); caps.setMatrixAt(i, mtx); }); G.add(caps);
  // legend glyphs: faint light strokes on some caps (reads as a keyboard in the wides)
  const lg = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.06, 0.012), new THREE.MeshBasicMaterial({ color: new THREE.Color('#8f93d8').multiplyScalar(0.7) }), keys.length);
  keys.forEach(([x, z, w], i) => { mtx.compose(V(x - w * 0.25, DECK + 0.001, z - 0.06), new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -Math.PI / 2), V(1, 1, 1)); lg.setMatrixAt(i, mtx); }); G.add(lg);
  // Kai's stool: one popped-up key
  const seat = box(0.27, SEAT.h, 0.25, std('#2e2b48', { roughness: 0.5 })); seat.position.set(SEAT.x, DECK + SEAT.h / 2, SEAT.z); G.add(seat);
  // ---------------------------------------------------------------- monitor (canvas screen; the website lives here)
  const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 1000; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const bez = box(SCR.w + 0.08, SCR.h + 0.08, 0.05, std('#0b0a14', { roughness: 0.4, metalness: 0.3 })); bez.position.set(SCR.x, SCR.y, SCR.z - 0.03); G.add(bez);
  const scrMat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.25, 1.25, 1.3) });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(SCR.w, SCR.h), scrMat); scr.position.set(SCR.x, SCR.y, SCR.z); G.add(scr);
  const stand = box(0.3, SCR.y - SCR.h / 2, 0.08, std('#0b0a14')); stand.position.set(0, (SCR.y - SCR.h / 2) / 2, SCR.z - 0.08); G.add(stand);
  scene.updateMatrixWorld(true);
  const scrW = (u, v) => V(SCR.x + (u - 0.5) * SCR.w, SCR.y + (0.5 - v) * SCR.h, SCR.z + 0.002);
  return { G, key, scrLight, fill, hemi, screenGlow, scr, scrMat, tex, cv, ctx: cv.getContext('2d'), scrW, seat, kb, tick() {} };
}
