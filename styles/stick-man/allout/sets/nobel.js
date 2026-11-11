// Stockholm Concert Hall, 10 December 2005 (ep 1 l14): a deep blue stage with a huge gold medallion on the backdrop,
// banks of flowers along the stage edge, a blue carpet with a gold N, a lectern, rows of seated guests in the dark
// stalls, warm spotlights cutting the haze, a banner "STOCKHOLM · 2005". Keys: spot on 0..1 (the hero spot on Kip),
// confetti fall 0..1. The stage is at y 0..4 (z 0.8 high), the stalls in front (y < 0).
import * as THREE from 'three';
import { createKit, label, tex, rng, B, SURF } from '../kit.js';

export const SUN_DIR = [0.25, 0.55, -0.8];
export const SUN_CENTER = [0, 1, 1], SUN_HALF = 7;
export const PLACES = { medallion: [0, 4.6, 3.4], lectern: [1.6, 1.4, 0.8], front: [0, 0.4, 0.8], row1: [0, -1.4, 0] };
export const MARKS = { kip: [-0.2, 1.0, 0.8], warren: [-1.1, 1.3, 0.8], bram: [0.4, -1.6, 0], mabel: [-0.9, -1.6, 0] };
export const CAMERA_SIDE = [0, -1]; export const CAMERA_ROOM = [[[-9, -12], [9, 4]]]; export const COLLIDE = [];

export async function build(stage) {
  const K = createKit(stage, { env: { top: [0.10, 0.12, 0.30], mid: [0.22, 0.22, 0.40], bottom: [0.10, 0.08, 0.12], panels: [{ dir: [0, -1, 0.7], size: 2, color: [1, 0.85, 0.6], power: 6 }] }, envK: 0.7 });
  stage.scene.background = new THREE.Color().setRGB(0.02, 0.025, 0.06);
  const R = rng(41);
  const M = {
    blue: K.mat([0.10, 0.18, 0.55], 0.8, { physical: true, sheen: 0.8, sheenColor: [0.4, 0.5, 1.0] }), deep: K.mat([0.05, 0.08, 0.25], 0.85),
    gold: K.mat([1.0, 0.76, 0.32], 0.25, { metal: 1 }), stage: K.mat([0.30, 0.18, 0.10], 0.35, { map: SURF.wood([0.30, 0.18, 0.10], 12, 4), repeat: [2, 2] }),
    seat: K.mat([0.55, 0.08, 0.10], 0.7, { physical: true, sheen: 0.7, sheenColor: [1, 0.4, 0.4] }), white: K.mat([0.96, 0.95, 0.92], 0.5),
  };
  // the stage, its front edge, a carpet with a gold N
  K.box([-8, 0, 0], [8, 6, 0.8], M.stage, { r: 0.02 }); K.box([-8, -0.04, 0.0], [8, 0.02, 0.8], M.deep, { r: 0.01 });
  K.box([-1.2, 0.2, 0.8], [1.2, 3.8, 0.81], M.blue, { r: 0 });
  K.card([0, 2.4, 0.815], 1.2, 1.2, label('N', { w: 256, h: 256, bg: null, fg: '#e9c46a', font: 'Georgia', weight: 700 }), { rotX: -90, transparent: true, env: 1.2 });
  // backdrop: deep blue drapes in folds, the giant gold medallion with a profile and laurel
  const drape = new THREE.PlaneGeometry(18, 9, 220, 1), dp = drape.attributes.position; for (let i = 0; i < dp.count; i++) dp.setZ(i, 0.18 * Math.sin(dp.getX(i) * 3.2)); drape.computeVertexNormals();
  const dm = new THREE.Mesh(drape, M.blue); dm.position.copy(B(0, 5.6, 4.6)); K.add(dm);
  const med = K.group(PLACES.medallion, 0); K.cyl([0, 0, 0], 1.25, 0.12, M.gold, { parent: med, axis: 'y', seg: 64 }); K.torus([0, -0.07, 0], 1.18, 0.05, M.gold, { parent: med, rx: 0 });
  K.card([0, -0.075, 0], 2.0, 2.0, tex(512, 512, (g, w, h) => { g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(120,70,10,0.55)';
    g.beginPath(); g.moveTo(w * 0.42, h * 0.25); g.bezierCurveTo(w * 0.62, h * 0.2, w * 0.7, h * 0.45, w * 0.6, h * 0.55); g.lineTo(w * 0.66, h * 0.62); g.lineTo(w * 0.58, h * 0.66); g.bezierCurveTo(w * 0.56, h * 0.78, w * 0.4, h * 0.8, w * 0.36, h * 0.7); g.bezierCurveTo(w * 0.3, h * 0.5, w * 0.3, h * 0.3, w * 0.42, h * 0.25); g.fill();
    g.strokeStyle = 'rgba(120,70,10,0.6)'; g.lineWidth = 10; g.beginPath(); g.arc(w / 2, h / 2, w * 0.43, 2.2, 7.2); g.stroke(); }), { parent: med, transparent: true, env: 1.0 });
  // flowers along the stage edge: banks of white, yellow and red blooms with dark leaves
  const fl = new THREE.SphereGeometry(0.07, 10, 8), cols = [[1, 1, 0.97], [1, 0.85, 0.2], [0.9, 0.15, 0.2], [1, 0.7, 0.75]].map(c => K.mat(c, 0.6, { physical: true, sheen: 0.6, sheenColor: [1, 1, 1] }));
  const leaf = K.mat([0.12, 0.35, 0.15], 0.6);
  for (const side of [-1, 1]) for (let i = 0; i < 260; i++) { const x = side * (1.6 + R() * 5.5), y = 0.15 + R() * 0.5, z = 0.8 + 0.15 + R() * 0.45 * (1 - Math.abs(x) / 8);
    const m = new THREE.Mesh(fl, R() > 0.3 ? cols[Math.floor(R() * 4)] : leaf); m.position.copy(B(x, y, z)); m.scale.setScalar(0.7 + 0.8 * R()); K.add(m); }
  for (const side of [-1, 1]) K.box([side * 1.5, 0.05, 0.8], [side * 7.5, 0.8, 0.95], K.mat([0.08, 0.25, 0.10], 0.7), { r: 0.04 });
  // the lectern with the Nobel crest, two tall gold candelabra lamps
  const lec = K.group(PLACES.lectern, -15); K.cube([0, 0, 0.55], [0.6, 0.45, 1.1], M.deep, { parent: lec, r: 0.04 }); K.cube([0, -0.05, 1.12], [0.7, 0.55, 0.05], M.gold, { parent: lec, r: 0.02 });
  K.cyl([0, -0.23, 0.7], 0.15, 0.02, M.gold, { parent: lec, axis: 'y' });
  for (const x of [-3.2, 3.2]) { K.cyl([x, 3.0, 2.0], 0.05, 2.4, M.gold); K.sphere([x, 3.0, 3.25], 0.14, K.glow([1, 0.85, 0.55], 3)); K.point([x, 2.8, 3.2], [1, 0.75, 0.45], 4, 6); }
  // the banner over the stage
  const ban = K.card([0, 3.0, 5.0], 5.0, 0.85, label(['STOCKHOLM · 2005', { t: 'THE NOBEL PRIZE IN PHYSIOLOGY OR MEDICINE', s: 0.38, w: 700 }], { w: 1024, h: 180, bg: '#0d1b4f', fg: '#f2cf6b' }), { env: 0.6 });
  // the stalls: rows of red velvet seats with seated guests' silhouettes (the doubters, front row)
  for (let row = 0; row < 7; row++) for (let i = -10; i <= 10; i++) { const x = i * 0.62 + (row % 2) * 0.31, y = -1.2 - row * 0.95, z = row * 0.12;
    if (Math.abs(x) < 1.3 && row < 1) continue;
    K.cube([x, y - 0.25, z + 0.25], [0.52, 0.5, 0.5], M.seat, { r: 0.08 }); K.cube([x, y - 0.02, z + 0.62], [0.52, 0.12, 0.75], M.seat, { r: 0.06 });
    if (R() > 0.25 && row > 0) { K.sphere([x, y - 0.15, z + 1.05], 0.15, K.mat([0.35, 0.33, 0.32], 0.7), { seg: 16 }); K.cube([x, y - 0.15, z + 0.75], [0.36, 0.25, 0.4], K.mat([0.06, 0.06, 0.08], 0.6), { r: 0.1 }); } }
  // spotlights: the hero spot on the front of the stage, two warm side keys, a blue wash on the drapes
  const hero = K.spot([0.5, -5, 7.0], [-0.2, 1.0, 1.4], [1, 0.92, 0.75], 0, { angle: 9, pen: 0.45, dist: 14 });
  K.spot([-5, -3, 6], [0, 1.2, 1.2], [1, 0.8, 0.55], 40, { angle: 28, pen: 0.7, dist: 14 }); K.spot([5, -3, 6], [0, 1.2, 1.2], [1, 0.8, 0.55], 35, { angle: 28, pen: 0.7, dist: 14 });
  K.spot([0, 1.5, 7], [0, 5.5, 3], [0.35, 0.45, 1.0], 30, { angle: 60, pen: 0.9, dist: 12, shadow: false });
  const conf = K.group([0, 0, 0]), bits = [], cm = [[1, 0.85, 0.3], [1, 1, 1], [0.9, 0.2, 0.2], [0.3, 0.5, 1]].map(c => K.mat(c, 0.4, { metal: 0.6, side: 2 }));
  for (let i = 0; i < 140; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.08), cm[i % 4]); K.add(m, conf, { cast: false }); bits.push({ m, x: (R() - 0.5) * 6, y: R() * 3, s: R() * 6, d: R() }); }
  K.anim('show', conf, (f, v) => { hero.intensity = 160 * v('spot', 0); const t = v('fall', 0); conf.visible = t > 0;
    bits.forEach(q => { const z = 6 - 5.2 * Math.min(1, Math.max(0, t * 1.4 - q.d * 0.4)); q.m.position.copy(B(q.x + 0.2 * Math.sin(f * 0.1 + q.s), q.y, z)); q.m.rotation.set(f * 0.2 + q.s, f * 0.13, q.s); }); });
  K.anim('banner', ban, () => {});
  // the medal: lowered over Kip's head onto his chest on "collects", it flashes on "Prize" (keys on 0..1, glint 0..1)
  const md = K.group([-0.2, 0.74, 1.72]), gold = K.mat([1.0, 0.78, 0.30], 0.2, { metal: 1, emit: [1, 0.8, 0.4], emitK: 0 });
  K.cyl([0, 0, 0], 0.13, 0.02, gold, { parent: md, axis: 'y', seg: 48 }); K.torus([0, -0.012, 0], 0.13, 0.012, gold, { parent: md, rx: 0 });
  K.card([0, -0.022, 0], 0.2, 0.2, tex(256, 256, (g, w, h) => { g.fillStyle = 'rgba(0,0,0,0)'; g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(110,60,10,0.6)'; g.beginPath(); g.ellipse(w * 0.5, h * 0.45, 60, 80, 0.2, 0, 7); g.fill();
    g.font = '700 26px Georgia'; g.textAlign = 'center'; g.fillText('NOBEL', w / 2, h * 0.88); }), { parent: md, transparent: true, env: 1 });
  const rib = K.mat([0.1, 0.25, 0.7], 0.6); for (const sx of [-1, 1]) { const r1 = K.cube([sx * 0.07, 0.02, 0.17], [0.05, 0.01, 0.32], rib, { parent: md, r: 0.004 }); r1.rotation.z = sx * 0.4; }
  K.anim('medal', md, (f, v) => { const on = v('on', 0); md.visible = on > 0.01; md.position.y += 1.4 * (1 - on) * (1 - on); gold.emissiveIntensity = 0.8 * v('glint', 0); });
  return { props: K.props };
}
