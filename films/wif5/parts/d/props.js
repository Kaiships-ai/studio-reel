// wif5 part d: the film's own prop (no kit shape): a lit paper sky lantern. One shape, two uses: in the father's two hands
// (the hugbag swap, both fists on its bamboo crossbar) and in the set (the one that rises, and the sky of others).
// Three.js y-up; a hand prop's forward is +z.
import * as THREE from 'three';
import { BUILD } from '/styles/stick-man/kit/cast/handprops.js';

const srgb = c => new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
export const RING = 0.12, TALL = 0.45, BAR = 0.25;
// thin rice paper lit from inside: bright warm gold low (by the flame), deeper orange up at the crown, the bamboo ribs
// showing through as faint darker lines; seen through (translucent), never near-white
const PAPER = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 256, 0, 0); gr.addColorStop(0, '#ffc860'); gr.addColorStop(0.35, '#ffad48'); gr.addColorStop(0.75, '#f07e2c'); gr.addColorStop(1, '#c95a22');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(120,50,20,0.35)'; g.lineWidth = 3;
  for (let x = 0; x <= 256; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
  for (const y of [64, 150]) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.lineWidth = 2; g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
// a Kongming sky lantern: an open ring at the bottom (r 0.12) widening to a round paper crown 0.34 across, 0.45 tall; a
// bamboo crossbar under it (0.50 long, the fuel cell burning at its middle); a warm point light inside
export function lantern({ light = true, scale = 1 } = {}) {
  const g = new THREE.Group();
  const prof = [[RING, 0.03], [0.15, 0.14], [0.168, 0.26], [0.17, 0.34], [0.15, 0.40], [0.10, 0.435], [0, TALL]].map(([r, y]) => new THREE.Vector2(r, y));
  const paper = new THREE.MeshBasicMaterial({ map: PAPER, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
  const shell = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), paper); shell.renderOrder = 3; g.add(shell);
  const bamboo = new THREE.MeshStandardMaterial({ color: srgb([0.62, 0.46, 0.24]), roughness: 0.7 }); bamboo.userData.noToon = true;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(RING, 0.008, 8, 32), bamboo); ring.rotation.x = Math.PI / 2; ring.position.y = 0.03; g.add(ring);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, BAR * 2, 10), bamboo); bar.rotation.z = Math.PI / 2; bar.position.y = 0.02; g.add(bar);
  const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 12), new THREE.MeshBasicMaterial({ color: srgb([0.55, 0.30, 0.14]) })); cell.position.y = 0.03; g.add(cell);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), new THREE.MeshBasicMaterial({ color: srgb([1.0, 0.82, 0.42]) })); flame.scale.y = 1.6; flame.position.y = 0.08; g.add(flame);
  if (light) { const l = new THREE.PointLight(srgb([1.0, 0.68, 0.36]), 6, 3.0, 2); l.position.y = 0.2; g.add(l); }
  g.scale.setScalar(scale);
  g.traverse(o => { if (o.isMesh) { o.userData.noInk = true; o.castShadow = false; } });
  return g;
}
// the father's: both fists on the bamboo crossbar's ends, the lantern standing upright between them (the hugbag swap)
BUILD.wif5_lantern2 = () => { const g = lantern(); g.userData = { mode: 'both', grip: [0, 0.02, 0], size: [0.5, TALL, 0.34], mass: 0.2 }; g.name = 'wif5_lantern2_held'; return g; };
