// Endoscopy clinic, Fremantle 1984 (ep 1 l10, l13): an exam couch, a scope cart with a CRT monitor that shows the
// camera's view of the stomach (the push into this screen is the way inside), a biopsy dish under a lamp, a pill
// blister "14 DAYS" on a tray, and a steel surgery tray with a scalpel under its own light (it goes dark: no surgery).
// Keys: screen show 0..1 (the stomach glows up on the monitor), biopsy grow 0..1, surgery lamp 1..0.
import * as THREE from 'three';
import { createKit, room, windowY, SURF, label, tex, rng, B } from '../kit.js';
import { daySky } from './lab-night.js';

export const SUN_DIR = [0.6, 0.55, -0.6];
export const SUN_CENTER = [0, 1, 1], SUN_HALF = 5;
export const PLACES = { model: [-2.6, 0.65, 1.4], modelIn: [-2.6, 0.72, 1.32], couch: [-0.7, 1.2, 0.62], screen: [0.95, 1.55, 1.42], dish: [1.75, 0.7, 0.96], blister: [-1.55, 0.55, 0.96], scalpel: [2.6, 1.0, 0.96], cart: [0.95, 1.55, 0] };
export const MARKS = { kip: [-0.55, 0.85, 0], warren: [0.35, 0.45, 0], bram: [2.65, 0.55, 0] };
export const CAMERA_SIDE = [0, -1]; export const CAMERA_ROOM = [[[-3.8, -8], [3.8, 0.4]]];
export const COLLIDE = [{ name: 'couch', lo: [-1.7, 1.0, 0], hi: [0.2, 1.8, 0.62] }];

export async function build(stage) {
  const K = createKit(stage, { env: { top: [0.82, 0.88, 0.92], mid: [0.75, 0.80, 0.78], bottom: [0.40, 0.42, 0.40], panels: [{ dir: [-0.3, 1, 0.4], size: 4, color: [1, 0.98, 0.92], power: 3 }] }, envK: 0.75 });
  stage.scene.background = null;
  const M = {
    wall: K.mat([0.80, 0.88, 0.88], 0.9, { map: SURF.plaster([0.80, 0.88, 0.88], 6) }), dado: K.mat([0.46, 0.66, 0.70], 0.6),
    floor: K.mat([1, 1, 1], 0.4, { map: SURF.tiles([0.86, 0.84, 0.78], [0.66, 0.64, 0.6], 6, 4), repeat: [3, 3] }),
    steel: K.mat([0.80, 0.82, 0.84], 0.25, { metal: 0.9 }), white: K.mat([0.95, 0.95, 0.93], 0.5), vinyl: K.mat([0.18, 0.42, 0.50], 0.45, { physical: true, clearcoat: 0.5 }),
    beige: K.mat([0.86, 0.80, 0.68], 0.55), black: K.mat([0.07, 0.07, 0.08], 0.45), sheet: K.mat([0.96, 0.96, 0.98], 0.8),
  };
  room(K, { x0: -3.8, x1: 3.8, y0: -8, y1: 2.6, h: 3.2, wall: M.wall, floor: M.floor, ceil: M.white });
  K.box([-3.8, 2.57, 0], [3.8, 2.6, 1.0], M.dado, { r: 0 });
  windowY(K, { cx: -2.2, y: 2.59, z0: 1.15, w: 1.5, h: 1.5, frame: M.white, view: daySky(3), viewK: 1.2, mull: [2, 2], blinds: { n: 6, mat: M.white, tilt: 0.9 } });
  K.area([-2.2, 2.3, 1.9], [0, 0, 0.8], 1.5, 1.5, [1, 0.97, 0.9], 7);
  // exam couch: steel frame, teal vinyl pad, a paper sheet roll
  K.box([-1.7, 1.0, 0.0], [0.2, 1.8, 0.08], M.steel, { r: 0.02 }); for (const x of [-1.6, 0.1]) for (const y of [1.08, 1.72]) K.cyl([x, y, 0.32], 0.025, 0.5, M.steel);
  K.box([-1.72, 0.98, 0.52], [0.22, 1.82, 0.62], M.vinyl, { r: 0.05 }); K.box([-1.2, 1.0, 0.62], [0.2, 1.8, 0.63], M.sheet, { r: 0.003 });
  K.box([-1.72, 1.0, 0.62], [-1.3, 1.8, 0.75], M.vinyl, { r: 0.05 });
  // scope cart: a beige 80s CRT on a trolley, the coiled black endoscope hanging on its hook
  const cart = K.group(PLACES.cart, -15);
  K.cube([0, 0, 0.45], [0.7, 0.55, 0.06], M.steel, { parent: cart, r: 0.01 }); K.cube([0, 0, 0.9], [0.7, 0.55, 0.05], M.steel, { parent: cart, r: 0.01 });
  for (const x of [-0.32, 0.32]) for (const y of [-0.24, 0.24]) { K.cyl([x, y, 0.5], 0.015, 0.92, M.steel, { parent: cart }); K.sphere([x, y, 0.04], 0.04, M.black, { parent: cart }); }
  K.cube([0, 0.02, 1.2], [0.62, 0.5, 0.52], M.beige, { parent: cart, r: 0.05 }); K.cube([0, -0.235, 1.2], [0.52, 0.03, 0.42], M.black, { parent: cart, r: 0.03 });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.34), new THREE.MeshBasicMaterial({ color: 0xffffff, map: tex(256, 196, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.6); gr.addColorStop(0, '#ff9a86'); gr.addColorStop(0.5, '#d2372e'); gr.addColorStop(1, '#2a0606'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,200,190,0.5)'; g.lineWidth = 6; for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(w / 2, h / 2 + 40, 20 + i * 22, 8 + i * 10, 0, Math.PI, 0); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1); }) }));
  scr.material.userData.noToon = true; scr.position.copy(B(0, -0.255, 1.2)); scr.userData.noPrepass = true; K.add(scr, cart, { cast: false });
  K.card([0, -0.256, 0.98], 0.4, 0.06, label('OLYMPUS GIF', { w: 512, h: 80, bg: '#d9d0bb', fg: '#333' }), { parent: cart });
  for (let i = 0; i < 3; i++) K.torus([0.38, 0.0, 1.0 - i * 0.04], 0.16, 0.014, M.black, { parent: cart, rx: 0.2 });
  const glow = K.point([0.95, 1.1, 1.2], [1, 0.4, 0.35], 0, 2.5);
  K.anim('screen', scr, (f, v) => { const s = v('show', 0); scr.material.color.setScalar(0.15 + 1.1 * s); glow.intensity = 1.5 * s; });
  // biopsy: a culture dish under a magnifier lamp on the side bench; spirals bloom in the agar
  K.box([1.3, 0.4, 0], [3.7, 1.2, 0.9], M.white, { r: 0.02 }); K.box([1.28, 0.38, 0.9], [3.72, 1.22, 0.96], K.mat([0.25, 0.3, 0.32], 0.3, { physical: true, clearcoat: 0.6 }), { r: 0.01 });
  const dish = K.group(PLACES.dish);
  K.cyl([0, 0, 0.012], 0.11, 0.022, K.glass([0.9, 0.95, 1], { opacity: 0.3 }), { parent: dish }); K.cyl([0, 0, 0.008], 0.105, 0.012, K.mat([0.62, 0.40, 0.16], 0.25, { physical: true, clearcoat: 1 }), { parent: dish });
  K.card([0, -0.115, 0.02], 0.16, 0.035, label('BIOPSY · B.M.', { w: 256, h: 56, bg: '#fff', fg: '#222' }), { parent: dish, rotX: -60 });
  const R = rng(8), spir = [];
  class Sp extends THREE.Curve { getPoint(t, o = new THREE.Vector3()) { return o.set(0.004 * Math.cos(t * 30), 0.004 * Math.sin(t * 30), t * 0.03 - 0.015); } }
  const sg = new THREE.TubeGeometry(new Sp(), 40, 0.0016, 5, false), sm = K.mat([0.30, 0.50, 0.18], 0.4);
  for (let i = 0; i < 140; i++) { const m = new THREE.Mesh(sg, sm), a = R() * 6.28, d = Math.sqrt(R()) * 0.09; m.position.set(Math.cos(a) * d, 0.02, Math.sin(a) * d); m.rotation.set(R() * 3, R() * 3, R() * 3); K.add(m, dish); spir.push({ m, d: d / 0.09 * 0.6 + R() * 0.3 }); }
  K.anim('biopsy', dish, (f, v) => { const g = v('grow', 0); for (const q of spir) { const t = Math.min(1, Math.max(0, (g * 1.3 - q.d) * 3)); q.m.visible = t > 0; q.m.scale.setScalar(Math.max(0.01, t) * 1.3); q.m.rotation.z += 0; } });
  const mag = K.group([2.0, 0.95, 0.96], 0); K.cyl([0, 0, 0.02], 0.08, 0.04, M.black, { parent: mag }); K.cyl([0, 0, 0.3], 0.012, 0.56, M.steel, { parent: mag });
  K.torus([-0.15, -0.1, 0.55], 0.1, 0.012, M.white, { parent: mag, rx: 1.2 }); K.spot([1.85, 0.85, 1.5], PLACES.dish, [1, 0.95, 0.85], 1.6, { angle: 30, pen: 0.7, dist: 3 });
  // pill blister "14 DAYS" on a tray by the couch
  const bl = K.group(PLACES.blister, 10); K.cube([0, 0, 0.005], [0.36, 0.26, 0.01], M.steel, { parent: bl, r: 0.004 });
  K.cube([0, 0, 0.015], [0.3, 0.16, 0.006], K.mat([0.82, 0.84, 0.88], 0.2, { metal: 0.8 }), { parent: bl, r: 0.002 });
  for (let i = 0; i < 14; i++) K.sphere([-0.12 + (i % 7) * 0.04, -0.035 + Math.floor(i / 7) * 0.07, 0.02], 0.014, K.mat([0.96, 0.96, 0.98], 0.3, { physical: true, clearcoat: 1 }), { parent: bl, sz: 0.5, seg: 12 });
  K.card([0, -0.1, 0.02], 0.3, 0.05, label('14 DAYS · 1 TWICE DAILY', { w: 512, h: 80, bg: '#1d4f8a', fg: '#fff' }), { parent: bl, rotX: -90 });
  bl.visible = false; K.anim('blister', bl, () => {});
  // surgery tray: steel tray, scalpel, forceps, a lamp above that goes out on "No surgery"
  const tr = K.group(PLACES.scalpel, 0); K.cube([0, 0, 0.01], [0.5, 0.32, 0.02], M.steel, { parent: tr, r: 0.008 });
  K.cube([-0.05, 0, 0.026], [0.26, 0.016, 0.006], M.steel, { parent: tr, r: 0.002 }); K.cube([0.11, 0.0, 0.026], [0.05, 0.012, 0.004], K.mat([0.9, 0.92, 0.95], 0.1, { metal: 1 }), { parent: tr, r: 0.001 });
  K.cube([0.0, 0.08, 0.026], [0.22, 0.02, 0.006], M.steel, { parent: tr, r: 0.002 });
  K.card([0, -0.17, 0.02], 0.34, 0.06, label('SURGERY', { w: 512, h: 90, bg: '#a01c16', fg: '#fff' }), { parent: tr, rotX: -70 });
  const op = K.spot([2.6, 0.7, 2.6], PLACES.scalpel, [1, 0.97, 0.92], 14, { angle: 22, pen: 0.4, dist: 4 });
  const opLamp = K.group([2.6, 0.75, 2.75]); K.lathe([0, 0, 0], [[0, 0.18], [0.3, 0], [0.32, -0.02], [0, -0.02]], M.white, { parent: opLamp }); const bulb = K.cyl([0, 0, -0.025], 0.22, 0.01, K.glow([1, 0.97, 0.9], 2.5), { parent: opLamp });
  K.cyl([0, 0.0, 0.5], 0.02, 1.0, M.steel, { parent: opLamp });
  K.anim('surgery', tr, (f, v) => { const l = v('lamp', 1); op.intensity = 14 * l; bulb.material.color.setRGB(2.5 * l + 0.1, 2.4 * l + 0.1, 2.25 * l + 0.1); });
  // wall: an anatomy poster of the stomach, an eye chart, a clock, a sink with a mirror
  K.card([0.2, 2.56, 2.0], 0.8, 1.0, tex(256, 320, (g, w, h) => { g.fillStyle = '#f5efe0'; g.fillRect(0, 0, w, h); g.fillStyle = '#c94a42'; g.beginPath(); g.ellipse(w * 0.5, h * 0.52, 70, 95, 0.5, 0, 7); g.fill();
    g.fillStyle = '#e88a7e'; g.beginPath(); g.ellipse(w * 0.5, h * 0.52, 50, 74, 0.5, 0, 7); g.fill(); g.fillStyle = '#c94a42'; g.fillRect(w * 0.38, h * 0.12, 22, 70);
    g.fillStyle = '#222'; g.font = '900 28px InterReel, Arial Black'; g.textAlign = 'center'; g.fillText('THE STOMACH', w / 2, 34); }));
  K.card([1.8, 2.56, 1.9], 0.5, 0.7, tex(128, 180, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.textAlign = 'center'; [48, 32, 24, 18, 14, 10].forEach((s, i) => { g.font = `900 ${s}px Arial`; g.fillText('EFPTOZ'.slice(0, i + 1), w / 2, 30 + i * 26); }); }));
  const clk = K.group([-0.9, 2.56, 2.5]); K.cyl([0, 0, 0], 0.2, 0.05, M.black, { parent: clk, axis: 'y' }); K.cyl([0, -0.03, 0], 0.18, 0.02, M.white, { parent: clk, axis: 'y' });
  K.cube([0, -0.045, 0.05], [0.012, 0.005, 0.11], M.black, { parent: clk }); K.cube([0.04, -0.045, 0], [0.08, 0.005, 0.01], M.black, { parent: clk });
  K.box([-3.6, 1.6, 0.8], [-3.2, 2.5, 0.95], M.white, { r: 0.03 }); K.box([-3.75, 1.7, 1.2], [-3.7, 2.4, 1.9], K.mat([0.8, 0.85, 0.9], 0.05, { metal: 1 }), { r: 0.01 });
  K.point([0, 0, 2.9], [1, 0.97, 0.9], 3, 6); K.area([0, 0.4, 3.1], [0, 0.4, 0], 4, 1.4, [1, 0.98, 0.95], 7);
  K.box([-1.5, 0.3, 3.15], [1.5, 0.6, 3.2], K.glow([1, 0.99, 0.95], 2.0), { r: 0 });
  // the teaching model: a big cutaway stomach on a pedestal, open toward the camera, its lining inside. Keys (lining):
  // inflame, ulcer, heal; (bugs) grow, kill; (pills) drop. Kip and Warren stand beside it and explain.
  const md = K.group([-2.6, 0.75, 0], 8);
  K.cyl([0, 0, 0.42], 0.09, 0.84, M.steel, { parent: md }); K.cyl([0, 0, 0.02], 0.35, 0.04, M.steel, { parent: md });
  const outer = K.mat([0.95, 0.62, 0.58], 0.45, { physical: true, clearcoat: 0.6 }), lin = K.mat([0.90, 0.48, 0.48], 0.3, { physical: true, clearcoat: 1, side: THREE.BackSide });
  const bowlG = new THREE.SphereGeometry(0.55, 64, 40, Math.PI, Math.PI);   // the back half: a bowl open to -y
  const shell = new THREE.Mesh(bowlG, outer); shell.scale.set(1.0, 1.15, 0.75); shell.position.copy(B(0, 0, 1.45)); K.add(shell, md);
  const ig = new THREE.SphereGeometry(0.53, 96, 60, Math.PI, Math.PI), ip = ig.attributes.position, v3 = new THREE.Vector3();
  for (let i = 0; i < ip.count; i++) { v3.fromBufferAttribute(ip, i); const a = Math.atan2(v3.y, v3.x); v3.multiplyScalar(1 - 0.05 * Math.pow(Math.abs(Math.sin(a * 7 + v3.y * 4)), 0.6)); ip.setXYZ(i, v3.x, v3.y, v3.z); }
  ig.computeVertexNormals(); const inner = new THREE.Mesh(ig, lin); inner.scale.set(1.0, 1.15, 0.75); inner.position.copy(B(0, 0, 1.45)); K.add(inner, md);
  const rim = K.torus([0, 0, 1.45], 0.55, 0.035, outer, { parent: md, rx: 0 }); rim.scale.set(1, 1.15, 1);
  K.torus([-0.42, 0.05, 2.0], 0.22, 0.09, outer, { parent: md, arc: Math.PI * 0.7, rx: 0 }).rotation.z = 1.2;      // gullet in at the top left
  K.torus([0.45, 0.05, 0.95], 0.2, 0.08, outer, { parent: md, arc: Math.PI * 0.8, rx: 0 }).rotation.z = -2.4;      // out to the gut, bottom right
  K.card([0, -0.25, 0.72], 0.6, 0.12, label('STOMACH · MODEL', { w: 512, h: 100, bg: '#20304a', fg: '#ffe7b0' }), { parent: md });
  const R2 = rng(12), wallY = (x, z) => 0.75 * 0.53 * Math.sqrt(Math.max(0, 1 - (x / 0.53) ** 2 - ((z - 1.45) / 0.61) ** 2)) - 0.03;
  // ulcer crater on the back wall
  const ul = K.group([0.12, 0.35, 1.32], 0, md); K.cyl([0, 0, 0], 0.11, 0.02, K.mat([0.42, 0.04, 0.05], 0.4, { physical: true, clearcoat: 1, emit: [0.5, 0.05, 0.02], emitK: 0.5 }), { parent: ul, axis: 'y' });
  K.torus([0, -0.01, 0], 0.11, 0.025, K.mat([0.85, 0.15, 0.14], 0.3, { physical: true, clearcoat: 1 }), { parent: ul, rx: 0 });
  K.anim('ulcer', ul, () => {});
  // spiral bugs that crawl over the inner wall
  class Hx extends THREE.Curve { getPoint(t, o = new THREE.Vector3()) { return o.set(t * 0.12 - 0.06, 0.012 * Math.sin(t * 22), 0.012 * Math.cos(t * 22)); } }
  const hg = new THREE.TubeGeometry(new Hx(), 50, 0.006, 6, false), bm = K.mat([0.30, 0.72, 0.22], 0.35, { physical: true, clearcoat: 0.8 }), bugs = K.group([0, 0, 0], 0, md), BL = [];
  for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(hg, bm), x = (R2() - 0.5) * 0.7, z = 1.45 + (R2() - 0.5) * 0.8, y = wallY(x, z);
    K.add(m, bugs); BL.push({ m, p: [x, y, z], from: [x * 0.3 - 0.42, -0.1, 2.05], d: R2() * 0.4, ph: R2() * 6 }); }
  K.anim('bugs', bugs, (f, v) => { const g = v('grow', 0), k = v('kill', 0);
    for (const q of BL) { const t = Math.min(1, Math.max(0, g * 1.4 - q.d)), e = 1 - Math.pow(1 - t, 3), kk = Math.min(1, Math.max(0, k * 1.4 - q.d));
      q.m.visible = t > 0 && kk < 0.98; q.m.position.copy(B(...q.from.map((x, i) => x + (q.p[i] - x) * e))); q.m.rotation.set(Math.PI / 2, 0, q.ph + 0.3 * Math.sin(f * 0.3 + q.ph)); q.m.scale.setScalar(Math.max(0.001, 1.6 * (1 - kk))); } });
  // pills that tumble in through the gullet and burst into foam
  const pills = K.group([0, 0, 0], 0, md), PL = [], ca = K.mat([0.96, 0.96, 0.98], 0.25, { physical: true, clearcoat: 1 }), cb = K.mat([0.2, 0.45, 0.9], 0.25, { physical: true, clearcoat: 1 });
  for (let i = 0; i < 5; i++) { const c = new THREE.Group(), a = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.04, 6, 12), ca), b2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0255, 0.04, 6, 12), cb); a.position.y = 0.02; b2.position.y = -0.02; c.add(a, b2); K.add(c, pills);
    const foam = []; for (let k = 0; k < 8; k++) { const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.015 + 0.02 * R2(), 10, 8), K.glass([1, 1, 1], { opacity: 0.6 })); K.add(s2, pills); foam.push(s2); }
    PL.push({ c, foam, x: -0.25 + 0.12 * i, d: i * 0.1, sp: R2() * 6 }); }
  K.anim('pills', pills, (f, v) => { const dr = v('drop', 0); for (const q of PL) { const t = Math.min(1, Math.max(0, dr * 1.5 - q.d)), fall = Math.min(1, t * 1.6);
    q.c.visible = t > 0 && t < 0.85; q.c.position.copy(B(-0.42 + (q.x + 0.42) * fall, 0.1 + 0.15 * fall, 2.05 - 0.95 * fall * fall)); q.c.rotation.set(t * 9 + q.sp, t * 5, q.sp);
    const bu = Math.max(0, (t - 0.6) / 0.4); q.foam.forEach((s2, k) => { const a = k * 2.4 + q.sp; s2.visible = bu > 0 && bu < 1; s2.position.copy(B(q.x + Math.cos(a) * 0.12 * bu, 0.28, 1.1 + Math.sin(a) * 0.12 * bu)); s2.scale.setScalar(1 + bu); }); } });
  const healthy = lin.color.clone(), sore = new THREE.Color().setRGB(0.62, 0.08, 0.08);
  K.anim('lining', inner, (f, v) => { const inf = v('inflame', 0) * (1 - v('heal', 0)), p = 0.5 + 0.5 * Math.sin(f * 0.25); lin.color.copy(healthy).lerp(sore, inf); lin.emissive.setRGB(0.35 * inf * (0.6 + 0.4 * p), 0.02 * inf, 0.02 * inf);
    const u = v('ulcer', 0) * (1 - v('heal', 0)); ul.visible = u > 0.01; ul.scale.setScalar(Math.max(0.01, u)); });
  K.spot([-1.6, -1.2, 2.6], [-2.6, 0.75, 1.4], [1, 0.97, 0.92], 22, { angle: 32, pen: 0.6, dist: 6 });
  return { props: K.props };
}
