// Through the microscope (ep 1 l03): a round field of view on a stained stomach section (pink cells, purple nuclei),
// with spiral bugs on its surface; the black round vignette is the eyepiece. Keys: field slide 0..3 (the slide moves on
// to the next sample: "again and again"), bugs wiggle on their own. Camera: look at [0, 0, 0] from -y, d 1.2, lens 50.
import * as THREE from 'three';
import { createKit, tex, rng, B } from '../kit.js';

export const SUN_DIR = [0, 0.3, -1];
export const SUN_CENTER = [0, 0, 0], SUN_HALF = 2;
export const PLACES = { field: [0, 0, 0] };
export const MARKS = {}; export const CAMERA_SIDE = [0, -1]; export const CAMERA_ROOM = [[[-2, -3], [2, 1]]]; export const COLLIDE = [];

export async function build(stage) {
  const K = createKit(stage, { env: { top: [1, 0.95, 0.95], mid: [1, 0.9, 0.92], bottom: [0.9, 0.8, 0.85] }, envK: 0.6 });
  stage.scene.background = new THREE.Color(0, 0, 0);
  const R = rng(13);
  const tissue = seed => tex(1024, 1024, (g, w, h) => { const r = rng(seed); g.fillStyle = '#f3c9d8'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 520; i++) { const x = r() * w, y = r() * h, s = 18 + 26 * r(); g.fillStyle = `rgba(${225 + 20 * r()},${140 + 40 * r()},${175 + 30 * r()},0.7)`; g.beginPath(); g.ellipse(x, y, s, s * (0.6 + 0.4 * r()), r() * 3, 0, 7); g.fill();
      g.fillStyle = `rgba(${90 + 40 * r()},${40 + 30 * r()},${130 + 40 * r()},0.85)`; g.beginPath(); g.arc(x + 3, y - 2, s * 0.28, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(160,60,120,0.35)'; g.lineWidth = 10; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(0, r() * h); g.bezierCurveTo(w * 0.3, r() * h, w * 0.6, r() * h, w, r() * h); g.stroke(); } });
  // three samples side by side on one long slide; the field slides from one to the next
  const slide = K.group([0, 0.02, 0]);
  for (let i = 0; i < 4; i++) K.card([i * 1.4, 0, 0], 1.4, 1.4, tissue(20 + i), { parent: slide, env: 0.4, rough: 0.6 });
  // spiral bugs (dark purple, the stain), more in each sample
  class Sp extends THREE.Curve { getPoint(t, o = new THREE.Vector3()) { return o.set(t * 0.12 - 0.06, 0.012 * Math.sin(t * 22), 0.012 * Math.cos(t * 22)); } }
  const sg = new THREE.TubeGeometry(new Sp(), 60, 0.0055, 6, false), bm = K.mat([0.30, 0.10, 0.42], 0.5), bugs = [];
  for (let i = 0; i < 4; i++) for (let k = 0; k < 14 + i * 10; k++) { const m = new THREE.Mesh(sg, bm), x = i * 1.4 + (R() - 0.5) * 1.1, z = (R() - 0.5) * 1.1;
    m.position.copy(B(x, -0.02, z)); m.rotation.set(0, 0, R() * 6.28); K.add(m, slide, { cast: false }); bugs.push({ m, ph: R() * 6, rot: m.rotation.z }); }
  // the eyepiece: a black card with a soft round hole in front of everything, a glint ring
  const vg = tex(1024, 1024, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, w * 0.36, w / 2, h / 2, w * 0.46); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.8, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const ep = K.card([0, -0.35, 0], 0.4, 0.4, vg, { emissive: 1, transparent: true });
  const ep2 = K.card([0, -0.351, 0], 2, 2, tex(1024, 1024, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.clearRect(w / 2 - w * 0.095, h / 2 - h * 0.095, w * 0.19, h * 0.19); }), { emissive: 1, transparent: true });
  K.point([0, -0.8, 0.3], [1, 0.97, 0.95], 2.5, 3); K.point([0, 0.5, 0], [1, 0.95, 1], 2, 2);
  K.anim('field', slide, (f, v) => { const s = v('slide', 0); slide.position.copy(B(-s * 1.4, 0.02, 0.02 * Math.sin(f * 0.05)));
    for (const q of bugs) { q.m.rotation.z = q.rot + 0.25 * Math.sin(f * 0.3 + q.ph); } });
  return { props: K.props };
}
