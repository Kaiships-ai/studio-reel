// Medical lecture theatre, 1983 (ep 1 l04-l05): warm tungsten, steep wooden tiers of desks (the experts stand behind
// them), a podium and a projector screen with the spiral-bug slide, dark panelled walls with portraits of old doctors.
// In the back corner, out of the main view, a reviewer's desk under a green banker's lamp: the paper and the stamp.
// Keys: stamp hit 0..1 (the stamp comes down at 1 and leaves "BOTTOM 10 %"), slide x 0..1 (a red X over the bug slide).
// The theatre faces -y (the audience looks at the stage at y > 3); the camera sits on the stage side or in the rows.
import * as THREE from 'three';
import { createKit, SURF, label, tex, rng, B } from '../kit.js';

export const SUN_DIR = [0.35, 0.6, -0.7];
export const SUN_CENTER = [0, 0, 1.5], SUN_HALF = 8;
export const PLACES = { screen: [0, 5.4, 2.6], podium: [-1.6, 3.6, 1.1], paper: [6.0, -6.0, 0.86], stamp: [6.2, -6.0, 0.86], row1: [0, 0.6, 0.7] };
export const MARKS = { kip: [-1.15, 3.3, 0.45], bram: [0.2, 0.15, 0], otis: [-1.5, -0.75, 0.38], june: [1.4, -0.75, 0.38], wren: [-0.3, -1.65, 0.76] };
export const CAMERA_SIDE = [0, -1]; export const CAMERA_ROOM = [[[-8, -9], [8, 6]]]; export const COLLIDE = [];

export async function build(stage) {
  const K = createKit(stage, { env: { top: [0.35, 0.25, 0.18], mid: [0.55, 0.40, 0.28], bottom: [0.25, 0.16, 0.10], panels: [{ dir: [0, 1, 0.6], size: 4, color: [1, 0.85, 0.6], power: 2.5 }] }, envK: 0.6 });
  stage.scene.background = null;
  const R = rng(31);
  const M = {
    panel: K.mat([0.42, 0.22, 0.12], 0.45, { map: SURF.wood([0.42, 0.22, 0.12], 3, 7) }), wood: K.mat([0.62, 0.38, 0.20], 0.4, { map: SURF.wood([0.62, 0.38, 0.20], 8, 2) }),
    floor: K.mat([0.5, 0.28, 0.14], 0.5, { map: SURF.wood([0.5, 0.28, 0.14], 10, 5), repeat: [3, 3] }), carpet: K.mat([0.45, 0.10, 0.10], 0.95),
    plaster: K.mat([0.90, 0.82, 0.66], 0.9, { map: SURF.plaster([0.90, 0.82, 0.66], 8) }), brass: K.mat([0.85, 0.65, 0.30], 0.3, { metal: 1 }),
    green: K.mat([0.12, 0.35, 0.22], 0.4, { physical: true, clearcoat: 0.6 }), black: K.mat([0.08, 0.07, 0.07], 0.5), paper: K.mat([0.95, 0.93, 0.86], 0.8),
  };
  // floor, stage platform, back wall panelled with plaster above, a coffered ceiling
  K.box([-12, -12, -0.2], [12, 8, 0], M.floor, { r: 0 });
  K.box([-6, 2.6, 0], [6, 6.0, 0.45], M.wood, { r: 0.02 }); K.box([-6, 2.55, 0], [6, 2.62, 0.45], M.panel, { r: 0.01 });
  K.box([-9, 6.0, 0], [9, 6.3, 6], M.plaster, { r: 0 }); K.box([-9, 5.95, 0], [9, 6.0, 1.6], M.panel, { r: 0 });
  for (const x of [-9, 9]) K.box([x - 0.15, -12, 0], [x + 0.15, 6.3, 6], M.panel, { r: 0 });
  K.box([-9, -9.4, 0], [9, -9.1, 6], M.plaster, { r: 0 }); K.box([-9, -9.12, 0], [9, -9.05, 2.6], M.panel, { r: 0 });
  for (const x of [-6, -2, 2, 6]) { K.box([x - 0.6, -9.1, 3.2], [x + 0.6, -9.0, 4.8], K.glow([1.0, 0.86, 0.6], 0.9), { r: 0 }); K.box([x - 0.7, -9.08, 3.1], [x + 0.7, -8.98, 3.2], M.panel, { r: 0.01 }); }
  K.box([-9, -12, 6], [9, 6.3, 6.2], M.plaster, { r: 0, cast: false });
  for (let x = -8; x <= 8; x += 2) K.box([x - 0.08, -12, 5.6], [x + 0.08, 6, 6], M.panel, { r: 0.01, cast: false });
  // projector screen with the slide: a pink stained section with spiral bugs and a title; the red X draws over it
  K.box([-2.3, 5.85, 1.3], [2.3, 5.9, 4.1], M.black, { r: 0.01 });
  const slide = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.6), new THREE.MeshBasicMaterial({ map: tex(1024, 600, (g, w, h) => {
    g.fillStyle = '#f2ece0'; g.fillRect(0, 0, w, h); g.fillStyle = '#1c2a44'; g.font = '900 64px InterReel, Arial Black'; g.textAlign = 'center'; g.fillText('SPIRAL BACTERIA IN GASTRITIS', w / 2, 84);
    g.fillStyle = '#e8a7c0'; g.beginPath(); g.arc(w * 0.3, h * 0.58, 190, 0, 7); g.fill(); g.strokeStyle = '#7b2d6b'; g.lineWidth = 9; const q = rng(6);
    for (let i = 0; i < 26; i++) { const x = w * 0.3 + (q() - 0.5) * 300, y = h * 0.58 + (q() - 0.5) * 300; if (Math.hypot(x - w * 0.3, y - h * 0.58) > 170) continue; g.beginPath(); for (let t = 0; t < 1; t += 0.05) g.lineTo(x + t * 40, y + 8 * Math.sin(t * 20)); g.stroke(); }
    g.fillStyle = '#1c2a44'; g.font = '700 40px InterReel, Arial'; g.textAlign = 'left'; ['• found in 58 of 100', '   stomach samples', '• Marshall & Warren', '   Perth, 1983'].forEach((s, i) => g.fillText(s, w * 0.56, h * 0.42 + i * 58)); }), toneMapped: true }));
  slide.material.userData.noToon = true; slide.material.color.setScalar(1.25); slide.position.copy(B(0, 5.84, 2.7)); slide.userData.noPrepass = true; K.add(slide, K.root, { cast: false });
  const X = K.group([0.0, 5.82, 2.7]); const xm = K.mat([0.85, 0.08, 0.06], 0.6, { emit: [0.6, 0.04, 0.02], emitK: 0.6 });
  const s1 = K.cube([0, 0, 0], [3.2, 0.02, 0.16], xm, { parent: X, r: 0.02 }), s2 = K.cube([0, 0, 0], [3.2, 0.02, 0.16], xm, { parent: X, r: 0.02 }); s1.rotation.z = 0.5; s2.rotation.z = -0.5;
  K.card([0, -0.03, -0.55], 3.0, 0.5, label('CONTAMINANT', { w: 1024, h: 170, bg: null, fg: '#d4140e' }), { parent: X, transparent: true, emissive: 1.2 });
  K.anim('slide', X, (f, v) => { const x = v('x', 0); X.visible = x > 0.01; s1.scale.x = Math.min(1, x * 2); s2.scale.x = Math.max(0.001, Math.min(1, x * 2 - 1)); X.children[2].visible = x > 0.9; });
  K.point([0, 4.6, 2.7], [0.95, 0.9, 1.0], 3, 5);
  // podium with a brass reading lamp and the beam of a projector across the room
  const pod = K.group([-1.6, 3.6, 0.45]); K.cube([0, 0, 0.55], [0.8, 0.55, 1.1], M.panel, { parent: pod, r: 0.03 }); K.cube([0, -0.05, 1.12], [0.9, 0.6, 0.05], M.wood, { parent: pod, r: 0.01 });
  K.card([0, -0.29, 0.75], 0.5, 0.5, tex(128, 128, (g, w, h) => { g.fillStyle = '#7a1f1a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d8b25a'; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, h / 2, 40, 0, 7); g.stroke(); g.fillStyle = '#d8b25a'; g.font = '900 40px Georgia'; g.textAlign = 'center'; g.fillText('M', w / 2, h / 2 + 14); }), { parent: pod });
  K.cyl([0.25, 0.1, 1.3], 0.01, 0.3, M.brass, { parent: pod }); K.cube([0.25, 0.02, 1.45], [0.25, 0.08, 0.06], M.green, { parent: pod, r: 0.02 });
  // the tiers: five rising rows of curved wooden desks, brass rails, with the hall's warm wall lamps
  for (let i = 0; i < 6; i++) { const y = 0.6 - i * 0.9, z = i * 0.38;
    K.box([-7, y - 0.9, 0], [7, y, z], M.panel, { r: 0.01 });
    K.box([-7, y - 0.05, z], [7, y + 0.35, z + 0.78], M.wood, { r: 0.02 }); K.box([-7.05, y - 0.08, z + 0.78], [7.05, y + 0.42, z + 0.83], M.wood, { r: 0.02 });
    K.box([-7, y + 0.33, z + 0.83], [7, y + 0.36, z + 0.86], M.brass, { r: 0.005 });
    for (let x = -6; x < 6.5; x += 1.3 + R() * 0.4) { K.cube([x, y + 0.15, z + 0.835], [0.3, 0.22, 0.01], M.paper, { r: 0.002, rotZ: R() * 20 - 10 }); if (R() > 0.6) K.cyl([x + 0.3, y + 0.1, z + 0.9], 0.035, 0.1, K.mat([0.9, 0.9, 0.86], 0.4)); }
  }
  for (const x of [-8.8, 8.8]) for (const y of [-6, -2, 2]) { const s = Math.sign(x); K.cube([x - s * 0.05, y, 2.8], [0.08, 0.25, 0.25], M.brass, { r: 0.02 }); K.sphere([x - s * 0.2, y, 3.0], 0.12, K.glow([1, 0.8, 0.5], 2.2)); K.point([x - s * 0.5, y, 3.0], [1, 0.72, 0.42], 2.2, 5); }
  // portraits of old doctors on the panelled walls
  for (const [x, y, ry] of [[-8.84, -1, 90], [-8.84, 2.5, 90], [8.84, -1, -90], [8.84, 2.5, -90]]) {
    const pg = K.group([x, y, 3.2], ry); K.cube([0, 0, 0], [1.0, 0.06, 1.3], M.brass, { parent: pg, r: 0.03 });
    K.card([0, -0.035, 0], 0.85, 1.15, tex(128, 160, (g, w, h) => { g.fillStyle = '#3b2a1e'; g.fillRect(0, 0, w, h); g.fillStyle = '#d8c7a8'; g.beginPath(); g.arc(w / 2, h * 0.42, 28, 0, 7); g.fill(); g.fillStyle = '#1d1d1d'; g.fillRect(w * 0.25, h * 0.62, w * 0.5, h * 0.4);
      g.fillStyle = '#eee'; g.beginPath(); g.moveTo(w / 2 - 10, h * 0.62); g.lineTo(w / 2, h * 0.75); g.lineTo(w / 2 + 10, h * 0.62); g.fill(); g.fillStyle = '#222'; g.fillRect(w / 2 - 12, h * 0.4, 8, 3); g.fillRect(w / 2 + 4, h * 0.4, 8, 3); }), { parent: pg });
  }
  for (const x of [-4, 0, 4]) for (const y of [-6, -2]) { K.sphere([x, y, 5.4], 0.18, K.glow([1, 0.9, 0.7], 2.5)); K.point([x, y, 5.0], [1, 0.85, 0.62], 6, 7); }
  // stage lights: a warm key from above the rows onto the stage, a cool rim from the screen side
  K.spot([0, -3, 5.5], [-1.2, 3.4, 1.2], [1, 0.82, 0.58], 60, { angle: 30, pen: 0.6, dist: 14 });
  K.spot([0, 4.5, 5.4], [0, -1, 1], [1, 0.78, 0.5], 45, { angle: 50, pen: 0.8, dist: 12 });
  // the reviewer's desk in the dark back corner: green banker's lamp, the paper, the stamp and pad
  const rd = K.group([6.1, -6.0, 0]);
  K.cube([0, 0, 0.42], [1.6, 0.9, 0.84], M.panel, { parent: rd, r: 0.02 }); K.cube([0, 0, 0.86], [1.7, 1.0, 0.04], K.mat([0.12, 0.28, 0.18], 0.7), { parent: rd, r: 0.01 });
  const lamp = K.group([0.5, 0.3, 0.88], 0, rd); K.cyl([0, 0, 0.02], 0.08, 0.03, M.brass, { parent: lamp }); K.cyl([0, 0, 0.18], 0.01, 0.3, M.brass, { parent: lamp });
  K.cyl([0, -0.05, 0.34], 0.07, 0.3, M.green, { parent: lamp, axis: 'x', r2: 0.07 }); K.spot([6.6, -6.6, 2.4], [6.1, -5.7, 1.0], [1, 0.9, 0.7], 14, { angle: 45, pen: 0.7, dist: 4 });
  const paper = K.card([0.08, 0.16, 0.885], 0.5, 0.66, tex(256, 340, (g, w, h) => { g.fillStyle = '#f6f2e6'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.textAlign = 'center';
    g.font = '700 14px Georgia'; g.fillText('Unidentified curved bacilli', w / 2, 34); g.fillText('in the stomach of patients', w / 2, 52); g.fillText('with gastritis and peptic ulceration', w / 2, 70);
    g.font = 'italic 12px Georgia'; g.fillText('B. J. Marshall, J. R. Warren', w / 2, 92); for (let y = 112; y < h - 14; y += 11) g.fillRect(20, y, w - 40 - ((y * 7) % 30), 3); }), { parent: rd, rotX: -90, env: 0.4 });
  const ink = K.card([0.08, 0.16, 0.887], 0.44, 0.22, label(['BOTTOM 10 %', { t: 'REVIEWERS 1983', s: 0.45 }], { w: 512, h: 256, bg: null, fg: '#c0140e', border: '#c0140e' }), { parent: rd, rotX: -90, transparent: true, env: 0.3 });
  ink.rotation.z = 0.15;
  const stamp = K.group([0.35, -0.2, 0.88], 0, rd); K.cube([0, 0, 0.03], [0.2, 0.12, 0.05], M.black, { parent: stamp, r: 0.01 }); K.cyl([0, 0, 0.12], 0.025, 0.14, M.wood, { parent: stamp }); K.sphere([0, 0, 0.21], 0.05, M.wood, { parent: stamp });
  K.cube([-0.6, 0.2, 0.89], [0.3, 0.2, 0.03], K.mat([0.6, 0.06, 0.05], 0.6), { parent: rd, r: 0.01 });
  K.anim('stamp', stamp, (f, v) => { const h = v('hit', 0); const down = h < 1 ? Math.sin(h * Math.PI / 2) : 1, lift = Math.max(0, h - 1);
    const pos = h <= 0 ? [0.35, -0.2, 0.88] : h < 1 ? [0.35 - 0.45 * down, -0.2 + 0.15 * down, 0.88 + 0.25 * Math.sin(h * Math.PI)] : [-0.1 + 0.4 * Math.min(1, lift * 2), -0.05 - 0.15 * Math.min(1, lift * 2), 0.88 + 0.2 * Math.sin(Math.min(1, lift * 2) * Math.PI)];
    stamp.visible = false; ink.visible = h >= 1; });
  K.anim('paper', paper, () => {});
  // ---- round 3 story props (added, the set's look unchanged)
  // the reviewer's pile: a tower of submitted papers on the left of her desk, taller than she is ("bottom ten percent":
  // theirs goes in at the very bottom). Keys: wobble (pulse: the tower sways), lift 0..1 (the bottom sheets part for it)
  const pile = K.group([5.55, -5.95, 0.88]), pr = rng(77), sheets = [];
  for (let i = 0; i < 44; i++) { const c = K.cube([(pr() - 0.5) * 0.04, (pr() - 0.5) * 0.04, 0.012 + i * 0.024], [0.46, 0.6, 0.02], i % 5 === 2 ? K.mat([0.92, 0.88, 0.76], 0.85) : M.paper, { parent: pile, r: 0.003, rotZ: (pr() - 0.5) * 8 }); sheets.push(c); }
  K.anim('pile', pile, (f, v) => { const w = v('wobble', 0), l = v('lift', 0);
    pile.rotation.z = 0.05 * w * Math.sin(f * 0.55); pile.rotation.x = 0.03 * w * Math.cos(f * 0.47);
    sheets.forEach((c, i) => { c.position.y = 0.012 + i * 0.024 + (i > 0 ? 0.035 * l : 0); }); });
  // their paper (the spiral bug on its cover): keys up 0..1 (off the desk, held up to read), under 0..1 (down and shoved in
  // under the tower)
  const th = K.group([6.2, -6.05, 0.885]);
  K.card([0, 0, 0], 0.42, 0.56, tex(256, 340, (g, w, h) => { g.fillStyle = '#fbf8ee'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8a7c0'; g.beginPath(); g.arc(w / 2, h * 0.38, 70, 0, 7); g.fill();
    g.strokeStyle = '#7b2d6b'; g.lineWidth = 7; for (const [x, y] of [[0.42, 0.33], [0.56, 0.42], [0.48, 0.47]]) { g.beginPath(); for (let t = 0; t < 1; t += 0.05) g.lineTo(w * x - 25 + t * 50, h * y + 7 * Math.sin(t * 20)); g.stroke(); }
    g.fillStyle = '#222'; for (let y = h * 0.66; y < h - 16; y += 13) g.fillRect(24, y, w - 48 - ((y * 7) % 30), 4); }), { parent: th, rotX: -90, env: 0.4 });
  K.anim('theirs', th, (f, v) => { const u = v('up', 0), d = v('under', 0), e = x => x * x * (3 - 2 * x);
    const held = [6.15, -5.78, 1.42], desk = [6.0, -6.0, 0.885], under = [5.55, -5.95, 0.905];
    let q, rx;
    if (d <= 0) { q = desk.map((x, i) => x + (held[i] - x) * e(u)); rx = -Math.PI / 2 + 1.35 * e(u); }
    else { const a = Math.min(1, d * 2), b = Math.max(0, d * 2 - 1); q = held.map((x, i) => x + (desk[i] - x) * e(a)); q = q.map((x, i) => x + (under[i] - desk[i]) * e(b)); rx = -Math.PI / 2 + 1.35 * (1 - e(a)); }
    th.position.copy(B(...q)); th.children[0].rotation.x = rx; });
  // the slide gets wiped like a smudge (key clean 0..1: a clean pink circle over the bugs) and the bugs crawl back
  // (key back 0..1: one by one, wriggling)
  const cl = new THREE.Mesh(new THREE.CircleGeometry(0.84, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color('#e8a7c0').multiplyScalar(1.25), transparent: true, opacity: 0, toneMapped: true }));
  cl.material.userData.noToon = true; cl.userData.noPrepass = true; cl.position.copy(B(-0.88, 5.835, 2.43)); K.add(cl, K.root, { cast: false });
  const bm = new THREE.MeshBasicMaterial({ color: new THREE.Color('#7b2d6b') }); bm.userData.noToon = true; const back = [], br = rng(12);
  for (let i = 0; i < 9; i++) { const pts = []; for (let k = 0; k <= 12; k++) pts.push(new THREE.Vector3(-0.07 + 0.14 * k / 12, 0.025 * Math.sin(k / 12 * 20), 0));
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.012, 6), bm); m.userData.noPrepass = true;
    const a = br() * 6.28, r = 0.15 + 0.55 * br(); m.position.copy(B(-0.88 + Math.cos(a) * r, 5.83, 2.43 + Math.sin(a) * r)); m.rotation.z = br() * 3; m.userData.k = i / 9; K.add(m, K.root, { cast: false }); back.push(m); }
  K.anim('wipe', cl, (f, v) => { const c = v('clean', 0), b = v('back', 0); cl.material.opacity = Math.min(1, c * 1.15) * (1 - 0.0 * b);
    back.forEach(m => { const t = Math.min(1, Math.max(0, (b - m.userData.k) * 4)); m.visible = t > 0 && c > 0.5; m.scale.setScalar(Math.max(0.01, t) * (1 + 0.15 * Math.sin(f * 0.6 + m.userData.k * 9))); }); });
  return { props: K.props };
}
