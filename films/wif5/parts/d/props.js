// wif5 part d: the film's own prop (no kit shape): a paper sky lantern, lit. One shape, three uses: in the son's right hand
// (held out in front by the near edge of its wire ring), in the father's two hands (the hugbag swap, both fists on the
// ring's sides), and in the set (the one that rises, and the sky of others). Three.js y-up; a hand prop's forward is +z.
import * as THREE from 'three';
import { BUILD } from '/styles/stick-man/kit/cast/handprops.js';

const srgb = c => new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
export const RING = 0.18, TALL = 0.47;
// paper: warm, self-lit from the flame inside (orange, never near-white); the ring and wires dark; a small flame cell
export function lantern({ light = true, scale = 1 } = {}) {
  const g = new THREE.Group();
  const prof = [[RING, 0.02], [0.205, 0.14], [0.22, 0.27], [0.21, 0.38], [0.18, 0.445], [0.09, TALL], [0, TALL]].map(([r, y]) => new THREE.Vector2(r, y));
  const paper = new THREE.MeshStandardMaterial({ color: srgb([0.95, 0.55, 0.22]), emissive: srgb([0.95, 0.42, 0.12]), emissiveIntensity: 1.0, roughness: 0.9, side: THREE.DoubleSide });
  paper.userData.noToon = true;
  const shell = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), paper); g.add(shell);
  const wire = new THREE.MeshStandardMaterial({ color: srgb([0.18, 0.14, 0.12]), roughness: 0.5 }); wire.userData.noToon = true;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(RING, 0.011, 8, 32), wire); ring.rotation.x = Math.PI / 2; ring.position.y = 0.02; g.add(ring);
  for (const r of [0, Math.PI / 2]) { const w = new THREE.Mesh(new THREE.BoxGeometry(RING * 2, 0.006, 0.006), wire); w.rotation.y = r; w.position.y = 0.03; g.add(w); }
  const flame = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12), new THREE.MeshBasicMaterial({ color: srgb([1.0, 0.62, 0.18]) })); flame.position.y = 0.05; g.add(flame);
  if (light) { const l = new THREE.PointLight(srgb([1.0, 0.66, 0.36]), 5, 2.8, 2); l.position.y = 0.3; g.add(l); }
  g.scale.setScalar(scale);
  g.traverse(o => { if (o.isMesh) { o.userData.noInk = true; o.castShadow = false; } });
  return g;
}
// the son's: by the near edge of the ring in his right fist, the lantern out in front of him
BUILD.wif5_lantern = () => { const g = lantern(); g.userData = { mode: 'up', grip: [0, 0.02, -RING], size: [0.44, TALL, 0.44], mass: 0.2 }; return g; };
// the father's: between both fists on the ring's sides (the hugbag's contract), upright
BUILD.wif5_lantern2 = () => { const g = lantern(); g.userData = { mode: 'both', grip: [0, 0.02, 0], size: [0.44, TALL, 0.44], mass: 0.2 }; g.name = 'wif5_lantern2_held'; return g; };
