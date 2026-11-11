// Allout hand props: the same grips as lib/cast/handprops.js (cast.js parents them to the hand dot), rebuilt as physically
// lit objects (glass, liquid, gold) without ink, to sit in the allout sets. Importing this module swaps them in.
import * as THREE from 'three';
import { BUILD } from '../lib/cast/handprops.js';

const std = (c, rough, o = {}) => { const m = new (o.phys ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial)({ color: new THREE.Color().setRGB(...c, THREE.SRGBColorSpace), roughness: rough, metalness: o.metal ?? 0, ...(o.phys ? { clearcoat: 1, clearcoatRoughness: 0.08 } : {}), transparent: o.op != null, opacity: o.op ?? 1, depthWrite: o.op == null, side: o.side ?? THREE.FrontSide }); m.userData.noToon = true; return m; };
const mesh = (g, m) => { const x = new THREE.Mesh(g, m); x.castShadow = true; x.receiveShadow = true; x.userData.noInk = true; return x; };

BUILD.beaker = () => {                                        // the beef-broth beaker: amber liquid, glass with a lip, paper label
  const g = new THREE.Group(), H = 0.2, R = 0.066; g.userData.noInk = true;
  const prof = [[0, 0], [R, 0], [R + 0.002, 0.004], [R + 0.002, H], [R + 0.01, H + 0.012], [R + 0.006, H + 0.016], [R - 0.002, H + 0.004], [R - 0.002, 0.006], [0, 0.006]].map(([a, b]) => new THREE.Vector2(a, b));
  const glass = mesh(new THREE.LatheGeometry(prof, 40), std([0.92, 0.96, 1.0], 0.04, { phys: true, op: 0.3, side: THREE.DoubleSide })); g.add(glass);
  const liq = mesh(new THREE.CylinderGeometry(R - 0.004, R - 0.004, 1, 32), std([0.62, 0.34, 0.10], 0.12, { phys: true, op: 0.9 })); g.add(liq);
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const c = cv.getContext('2d');
  c.fillStyle = '#f4efe2'; c.fillRect(0, 0, 256, 128); c.fillStyle = '#1b1b22'; c.textAlign = 'center'; c.font = '900 40px InterReel, Arial Black'; c.fillText('BEEF BROTH', 128, 56);
  c.font = '700 26px InterReel, Arial'; c.fillStyle = '#9a1c16'; c.fillText('+ H. pylori', 128, 98);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  const lab = mesh(new THREE.CylinderGeometry(R + 0.003, R + 0.003, 0.07, 32, 1, true, -0.9, 1.8), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.7 })); lab.material.userData.noToon = true; lab.position.y = H * 0.45; g.add(lab);
  const level = v => { const h = Math.max(0.004, (H - 0.02) * Math.max(0, Math.min(1, v)) * 0.8); liq.scale.y = h; liq.position.y = 0.007 + h / 2; liq.visible = v > 0.02; };
  level(1);
  g.userData = { mode: 'up', grip: [0, 0.06, 0.055], level, noInk: true }; return g;
};
BUILD.medal = () => {                                         // the Nobel medal: a gold disc on a short ribbon, catches the light
  const g = new THREE.Group(); g.userData.noInk = true;
  const disc = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.012, 48), std([1.0, 0.78, 0.30], 0.22, { metal: 1 })); disc.rotation.x = Math.PI / 2; disc.position.y = -0.11; g.add(disc);
  const rim = mesh(new THREE.TorusGeometry(0.07, 0.006, 10, 48), std([1.0, 0.82, 0.36], 0.18, { metal: 1 })); rim.position.y = -0.11; g.add(rim);
  const head = mesh(new THREE.SphereGeometry(0.035, 24, 16), std([0.95, 0.72, 0.26], 0.3, { metal: 1 })); head.scale.z = 0.25; head.position.set(0, -0.11, 0.008); g.add(head);
  const rib = mesh(new THREE.BoxGeometry(0.035, 0.1, 0.004), std([0.10, 0.22, 0.62], 0.5)); rib.position.y = -0.03; g.add(rib);
  g.userData = { mode: 'up', grip: [0, 0.02, 0], noInk: true }; return g;
};
