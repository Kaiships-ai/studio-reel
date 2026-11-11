// Inside the stomach (ep 1 l10-l12): a wet cave of pink folds (rugae) under a soft mucus sheen, lit like the endoscope's
// own lamp. Keys (allout/fx.js ao_anim):
//   lining   inflame 0..1 (red, swollen, glowing), heal 0..1 (back to healthy pink), ulcer 0..1 (a crater opens)
//   bugs     grow 0..1 (spiral bugs swim in and burrow), kill 0..1 (they shrivel and puff away)
//   pills    drop 0..1 (capsules fall through the frame and burst into foam)
// The camera looks along +y from the open end; the floor of the stomach (the lining patch) is at y 2.5, z 0.
import * as THREE from 'three';
import { createKit, rng, B, col } from '../kit.js';

export const SUN_DIR = [0.1, 0.4, -0.9];
export const SUN_CENTER = [0, 2.5, 0], SUN_HALF = 4;
export const PLACES = { floor: [0, 2.6, 0.05], ulcer: [0.25, 2.5, 0.0], wall: [0, 4.2, 1.0], bugs: [0, 2.5, 0.1], pills: [0.1, 2.4, 1.6] };
export const MARKS = {}; export const CAMERA_SIDE = [0, -1]; export const CAMERA_ROOM = [[[-4, -6], [4, 6]]]; export const COLLIDE = [];

export async function build(stage) {
  const K = createKit(stage, { env: { top: [0.95, 0.55, 0.50], mid: [0.75, 0.30, 0.32], bottom: [0.45, 0.12, 0.14], panels: [{ dir: [0, -1, 0.2], size: 2, color: [1, 0.92, 0.85], power: 5 }] }, envK: 0.9 });
  stage.scene.background = col([0.18, 0.03, 0.05]);
  const healthy = col([0.86, 0.52, 0.50]), sore = col([0.62, 0.10, 0.10]);
  const wet = K.mat([0.93, 0.50, 0.50], 0.35, { physical: true, clearcoat: 1, ccRough: 0.15, sheen: 0.5, sheenColor: [1, 0.8, 0.8] });
  // the cave: a stretched sphere seen from inside, its wall pushed in and out into long folds (rugae)
  const g = new THREE.SphereGeometry(4.2, 160, 100), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const a = Math.atan2(v.z, v.x), h = v.y;
    const fold = 0.22 * Math.pow(Math.abs(Math.sin(a * 9 + 0.6 * Math.sin(h * 0.9))), 0.6) + 0.06 * Math.sin(h * 3.1 + a * 4);
    v.multiplyScalar(1 - fold / 4.2); v.y *= 1.5; p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals();
  const cave = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: healthy.clone(), roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12, side: THREE.BackSide, envMap: K.ENV, envMapIntensity: 0.9,
    emissive: new THREE.Color(0, 0, 0), sheen: 0.6, sheenColor: col([1, 0.75, 0.7]) }));
  cave.material.userData.noToon = true; cave.rotation.z = Math.PI / 2; cave.position.copy(B(0, 2.6, 1.9)); K.add(cave, K.root, { cast: false });
  // the lining patch the story happens on: a mound of folds in the middle distance
  const lg = new THREE.PlaneGeometry(4, 4, 140, 140), lp = lg.attributes.position;
  for (let i = 0; i < lp.count; i++) { const x = lp.getX(i), y = lp.getY(i); const r = Math.hypot(x, y);
    lp.setZ(i, 0.12 * Math.sin(x * 5 + Math.sin(y * 3)) * Math.cos(y * 1.3) + 0.05 * Math.sin(y * 9 + x * 2) - 0.25 * Math.max(0, r - 1.2)); }
  lg.computeVertexNormals();
  const liningMat = wet.clone(); liningMat.userData.noToon = true; liningMat.emissive = new THREE.Color(0, 0, 0);
  const lining = new THREE.Mesh(lg, liningMat); lining.rotation.x = -Math.PI / 2; lining.position.copy(B(0, 2.6, 0)); K.add(lining, K.root, { cast: false });
  // mucus: a thin glossy sheet over it, and bubbles
  const mucus = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), K.glass([1, 0.9, 0.85], { opacity: 0.12 })); mucus.rotation.x = -Math.PI / 2; mucus.position.copy(B(0, 2.6, 0.16)); K.add(mucus, K.root, { cast: false });
  const R = rng(4);
  for (let i = 0; i < 26; i++) K.sphere([(R() - 0.5) * 3, 1.4 + R() * 2.6, 0.18 + R() * 1.6], 0.02 + 0.05 * R(), K.glass([1, 0.95, 0.95], { opacity: 0.35 }), { seg: 16 });
  // the ulcer: a raw crater that opens on the lining
  const ulcer = K.group(PLACES.ulcer);
  const crater = K.lathe([0, 0, -0.06], [[0, 0], [0.18, 0.02], [0.3, 0.1], [0.36, 0.14], [0.4, 0.12]], K.mat([0.45, 0.04, 0.05], 0.4, { physical: true, clearcoat: 1, emit: [0.6, 0.05, 0.02], emitK: 0.4 }), { parent: ulcer });
  K.torus([0, 0, 0.12], 0.38, 0.06, K.mat([0.85, 0.15, 0.14], 0.3, { physical: true, clearcoat: 1 }), { parent: ulcer, rx: Math.PI / 2 });
  K.anim('ulcer', ulcer, () => {});
  // spiral bugs: helix bodies with a tuft of flagella, each with its own swim path that ends burrowed in the lining
  const bugMat = K.mat([0.42, 0.78, 0.32], 0.35, { physical: true, clearcoat: 0.8, emit: [0.12, 0.3, 0.05], emitK: 0.6 });
  const tailMat = K.mat([0.62, 0.9, 0.5], 0.5);
  class Helix extends THREE.Curve { getPoint(t, o = new THREE.Vector3()) { return o.set(0.035 * Math.cos(t * Math.PI * 7), t * 0.32 - 0.16, 0.035 * Math.sin(t * Math.PI * 7)); } }
  const hg = new THREE.TubeGeometry(new Helix(), 80, 0.017, 10, false);
  const bugs = K.group([0, 0, 0]), list = [];
  for (let i = 0; i < 34; i++) {
    const b = new THREE.Group(); b.add(new THREE.Mesh(hg, bugMat));
    for (let k = 0; k < 3; k++) { const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.002, 0.16, 5), tailMat); fl.position.set(0.01 * (k - 1), -0.24, 0.01 * (k % 2)); fl.rotation.z = 0.25 * (k - 1); b.add(fl); }
    K.add(b, bugs); const rest = [(R() - 0.5) * 2.4, 1.8 + R() * 1.6, 0.12 + 0.05 * R()], from = [rest[0] + (R() - 0.5) * 3, rest[1] - 1.5 - R() * 2, rest[2] + 1 + R() * 1.5];
    list.push({ b, rest, from, ph: R() * 6.28, d: R() * 0.35 });
  }
  K.anim('bugs', bugs, (f, val) => {
    const gr = val('grow', 0), kill = val('kill', 0);
    for (const q of list) { const t = Math.min(1, Math.max(0, (gr * 1.35 - q.d))), e = 1 - Math.pow(1 - t, 3);
      const p0 = q.from.map((x, i) => x + (q.rest[i] - x) * e); const wob = 0.03 * Math.sin(f * 0.35 + q.ph);
      q.b.position.copy(B(p0[0] + wob, p0[1], p0[2] + wob * 0.5)); q.b.rotation.set(0.4 * Math.sin(f * 0.2 + q.ph), q.ph, Math.PI / 2 * e + 0.3 * (1 - e));
      const k = Math.min(1, Math.max(0, kill * 1.4 - q.d)); q.b.scale.setScalar(Math.max(0.001, (t > 0 ? 1 : 0) * (1 - k)) * (1.1 + 0.1 * Math.sin(f * 0.5 + q.ph))); q.b.visible = t > 0 && k < 0.98; }
  });
  // pills: white-and-blue capsules that tumble down and burst into a foam of bubbles
  const pills = K.group([0, 0, 0]), pl = [];
  const capA = K.mat([0.96, 0.96, 0.98], 0.25, { physical: true, clearcoat: 1 }), capB = K.mat([0.20, 0.45, 0.90], 0.25, { physical: true, clearcoat: 1 });
  for (let i = 0; i < 6; i++) { const c = new THREE.Group(); const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.12, 8, 16), capA); a.position.y = 0.06; const b2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.071, 0.12, 8, 16), capB); b2.position.y = -0.06;
    c.add(a, b2); K.add(c, pills); const foam = []; for (let k = 0; k < 10; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.03 + 0.04 * R(), 12, 8), K.glass([1, 1, 1], { opacity: 0.55 })); K.add(s, pills); foam.push(s); }
    pl.push({ c, foam, x: (R() - 0.5) * 2.2, y: 1.9 + R() * 1.4, d: i * 0.1, spin: R() * 6 }); }
  K.anim('pills', pills, (f, val) => {
    const dr = val('drop', 0);
    for (const q of pl) { const t = Math.min(1, Math.max(0, dr * 1.6 - q.d)), fall = Math.min(1, t * 1.6), z = 2.8 - 2.65 * fall * fall;
      q.c.visible = t > 0 && t < 0.85; q.c.position.copy(B(q.x, q.y, z)); q.c.rotation.set(t * 8 + q.spin, t * 5, q.spin);
      const burst = Math.max(0, (t - 0.6) / 0.4); q.foam.forEach((s, k) => { const a = k * 2.4 + q.spin; s.visible = burst > 0 && burst < 1; s.position.copy(B(q.x + Math.cos(a) * 0.4 * burst, q.y + Math.sin(a) * 0.4 * burst, 0.18 + 0.4 * burst * ((k % 3) / 3))); s.scale.setScalar(1 + burst); }); }
  });
  // the lining's colour: sore red and glowing when inflamed, healthy pink when healed
  K.anim('lining', lining, (f, val) => {
    const inf = val('inflame', 0) * (1 - val('heal', 0)), pulse = 0.5 + 0.5 * Math.sin(f * 0.25);
    const c = healthy.clone().lerp(sore, inf); liningMat.color.copy(c); cave.material.color.copy(healthy.clone().lerp(sore, inf * 0.7));
    liningMat.emissive.setRGB(0.22 * inf * (0.6 + 0.4 * pulse), 0.01 * inf, 0.01 * inf); cave.material.emissive.setRGB(0.04 * inf, 0, 0);
    lining.scale.z = 1 + 0.35 * inf;                                  // swollen
    const u = val('ulcer', 0) * (1 - val('heal', 0)); ulcer.visible = u > 0.01; ulcer.scale.setScalar(Math.max(0.01, u));
  });
  // the endoscope's lamp: a warm key from the camera side, a cool rim from deep inside
  K.spot([0, -0.6, 1.6], [0, 2.6, 0], [1, 0.92, 0.85], 16, { angle: 50, pen: 0.8, dist: 9 });
  K.point([0, 5.5, 2.4], [1, 0.45, 0.4], 3, 7); K.point([-1.8, 2.2, 1.6], [1, 0.6, 0.55], 2, 4);
  return { props: K.props };
}
