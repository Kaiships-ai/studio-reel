// Allout hand props: the same grips as lib/cast/handprops.js (cast.js parents them to the hand dot), rebuilt as physically
// lit objects (glass, liquid, gold) without ink, to sit in the allout sets. Importing this module swaps them in.
import * as THREE from 'three';
import { BUILD } from '../lib/cast/handprops.js';
import { POSES, POSE_VERBS, compilePose } from '../engine/poses.js';
import { ACT } from '../engine/verbs_fx.js';

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
  // the bacteria you can see (round 3): green spiral bugs swimming in the broth, so "a beaker of bacteria" reads without
  // the label; a bug above the liquid line is gone (drunk)
  const bugM = std([0.30, 0.92, 0.20], 0.35); bugM.emissive = new THREE.Color(0.10, 0.45, 0.05); bugM.emissiveIntensity = 0.9;
  const bugs = [];
  for (let i = 0; i < 9; i++) {
    const pts = []; for (let k = 0; k <= 16; k++) { const u = k / 16; pts.push(new THREE.Vector3(0.006 * Math.cos(u * 14), u * 0.03 - 0.015, 0.006 * Math.sin(u * 14))); }
    const b = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.0045, 6), bugM); b.scale.setScalar(1.5);
    const a = i * 2.4, r = 0.018 + 0.03 * ((i * 37) % 10) / 10, y = 0.025 + 0.13 * ((i * 53) % 10) / 10;
    b.position.set(Math.cos(a) * r, y, Math.sin(a) * r); b.rotation.set(i * 0.7, i * 1.3, i * 0.4); g.add(b); bugs.push(b);
  }
  const level = v => { const h = Math.max(0.004, (H - 0.02) * Math.max(0, Math.min(1, v)) * 0.8); liq.scale.y = h; liq.position.y = 0.007 + h / 2; liq.visible = v > 0.02;
    for (const b of bugs) b.visible = v > 0.02 && b.position.y < 0.03 + 2.2 * h; };   // the last ones cling to the glass
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

// the culture bottle (pour: into the piglets' trough, into the broth): a stoppered flask of green culture, label CULTURE
BUILD.cup = () => {
  const g = new THREE.Group(); g.userData.noInk = true;
  const prof = [[0, 0], [0.05, 0], [0.055, 0.01], [0.055, 0.07], [0.022, 0.12], [0.02, 0.15], [0.024, 0.155], [0, 0.155]].map(([a, b]) => new THREE.Vector2(a, b));
  g.add(mesh(new THREE.LatheGeometry(prof, 32), std([0.92, 0.96, 1.0], 0.05, { phys: true, op: 0.35, side: THREE.DoubleSide })));
  const liq = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 24), std([0.35, 0.78, 0.22], 0.2, { phys: true })); liq.position.y = 0.035; g.add(liq);
  const cork = mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.03, 16), std([0.72, 0.52, 0.30], 0.8)); cork.position.y = 0.165; g.add(cork);
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96; const c = cv.getContext('2d'); c.fillStyle = '#fff6dc'; c.fillRect(0, 0, 256, 96);
  c.fillStyle = '#1d5a2a'; c.textAlign = 'center'; c.font = '900 44px InterReel, Arial Black'; c.fillText('CULTURE', 128, 64);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  const lab = mesh(new THREE.CylinderGeometry(0.057, 0.057, 0.035, 24, 1, true, -0.9, 1.8), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.7 })); lab.material.userData.noToon = true; lab.position.y = 0.04; g.add(lab);
  g.userData = { mode: 'up', grip: [0, 0.05, 0.05], noInk: true }; return g;
};
// the reviewer's rubber stamp (hammer pose: up, then slammed down every 15 f)
BUILD.hammer = () => {
  const g = new THREE.Group(); g.userData.noInk = true;
  const h = mesh(new THREE.SphereGeometry(0.045, 20, 14), std([0.55, 0.32, 0.16], 0.5)); h.position.y = 0.02; g.add(h);
  const st = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 12), std([0.55, 0.32, 0.16], 0.5)); st.position.y = 0.09; g.add(st);
  const base = mesh(new THREE.BoxGeometry(0.15, 0.035, 0.09), std([0.12, 0.12, 0.14], 0.5)); base.position.y = 0.16; g.add(base);
  const pad = mesh(new THREE.BoxGeometry(0.14, 0.01, 0.08), std([0.75, 0.08, 0.06], 0.6)); pad.position.y = 0.182; g.add(pad);
  g.userData = { mode: 'along', grip: [0, 0.0, 0], noInk: true }; return g;
};
// a blister of 14 pills held up (show_pills, the show_medal pose with the pack)
BUILD.blister = () => {
  const g = new THREE.Group(); g.userData.noInk = true;
  const card = mesh(new THREE.BoxGeometry(0.2, 0.13, 0.008), std([0.80, 0.84, 0.90], 0.25, { metal: 0.7 })); card.position.y = -0.08; g.add(card);
  for (let i = 0; i < 14; i++) { const p = mesh(new THREE.SphereGeometry(0.011, 12, 8), std([0.98, 0.98, 1.0], 0.3, { phys: true })); p.scale.z = 0.6; p.position.set(-0.075 + (i % 7) * 0.025, -0.055 - Math.floor(i / 7) * 0.05, 0.006); g.add(p); }
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const c = cv.getContext('2d'); c.fillStyle = '#1d4f8a'; c.fillRect(0, 0, 256, 64); c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = '900 40px InterReel, Arial Black'; c.fillText('14 DAYS', 128, 48);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  const lb = mesh(new THREE.PlaneGeometry(0.2, 0.05), new THREE.MeshBasicMaterial({ map: tx })); lb.material.userData.noToon = true; lb.position.set(0, -0.01, 0.005); g.add(lb);
  g.userData = { mode: 'up', grip: [0, 0.02, 0], noInk: true }; return g;
};
// show_pills: the show_medal pose holding up the blister pack
POSES.show_pills = { ...POSES.show_medal, props: { R: 'blister' } };
POSE_VERBS.show_pills = ACT.show_pills = (p, st, C) => compilePose('show_pills', p, st, C);

// a white handkerchief bunched in the fist (wipe the bug off the slide like a smudge; dust it off)
BUILD.hanky = () => {
  const g = new THREE.Group(); g.userData.noInk = true; const m = std([0.97, 0.97, 0.95], 0.85);
  const a = mesh(new THREE.SphereGeometry(0.05, 12, 8), m); a.scale.set(1.2, 0.8, 1); g.add(a);
  for (let i = 0; i < 3; i++) { const t = mesh(new THREE.ConeGeometry(0.035, 0.09, 6), m); t.position.set(-0.03 + 0.03 * i, -0.06, 0.01 * i); t.rotation.set(3.0, 0.4 * i, 0.3 * (i - 1)); g.add(t); }
  g.userData = { mode: 'up', grip: [0, 0.0, 0], noInk: true }; return g;
};
