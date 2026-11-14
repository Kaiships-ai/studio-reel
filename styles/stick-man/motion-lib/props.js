// The hand props the motion library's clips name (needs.props), registered into the kit's BUILD (lib/cast/handprops.js).
// A film imports this, or maps a clip's prop to its own with the clip key's `swap: { bag: 'duffel' }`.
//   bag    one heavy duffel (25 kg in the clips: x_kg<side>), hung from the fist by its handle, long side forward
//   torch  a flashlight along the forearm, a dim lit lens and a soft spot
//   cash   a banded bundle of notes
//   cap    a peaked cap (soft: no contact push); worn on the head with x_hpH_cap (cast.js: the head slot), carried with x_hpR_cap
// Sizes in metres, Blender up = +y here (three.js), the figure's forward = +z.
import * as THREE from 'three';
import { BUILD } from '../lib/cast/handprops.js';
import { toon, lin } from '../engine/look.js';

const hullMat = new THREE.MeshBasicMaterial({ color: lin(0.05, 0.05, 0.07), side: THREE.BackSide });
const solid = (geo, col, ink = 0.012) => {
  const m = new THREE.Mesh(geo, toon(col, { sheen: 0.1, rough: 0.8 })); m.castShadow = true; m.receiveShadow = true;
  const h = new THREE.Mesh(geo, hullMat); h.scale.setScalar(1 + ink / 0.2); m.add(h); return m;
};
const round = (w, h, d, r) => { const s = new THREE.Shape(), x = w / 2 - r, y = h / 2 - r;
  s.moveTo(-x, -h / 2); s.lineTo(x, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -y); s.lineTo(w / 2, y); s.quadraticCurveTo(w / 2, h / 2, x, h / 2);
  s.lineTo(-x, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, y); s.lineTo(-w / 2, -y); s.quadraticCurveTo(-w / 2, -h / 2, -x, -h / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, -d / 2); return g; };

// the bag's body 0.20 wide, 0.26 tall, 0.46 long; the handle's top (the grip) 0.31 above its bottom
export const BAG = { w: 0.20, h: 0.26, l: 0.46, grip: 0.31 };
export function bagMesh(col = [0.16, 0.20, 0.30]) {
  const g = new THREE.Group();
  const body = solid(round(BAG.w, BAG.h, BAG.l, 0.07), col); body.position.y = BAG.h / 2; g.add(body);
  const zip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.006, BAG.l * 0.8), new THREE.MeshBasicMaterial({ color: lin(0.75, 0.70, 0.55) })); zip.position.y = BAG.h + 0.002; g.add(zip);
  const handle = solid(new THREE.TorusGeometry(0.055, 0.012, 8, 16, Math.PI), [0.08, 0.08, 0.10], 0.006); handle.rotation.y = Math.PI / 2; handle.position.y = BAG.h; g.add(handle);
  return g;
}
BUILD.bag = () => { const g = bagMesh(); g.userData = { mode: 'up', grip: [0, BAG.grip, 0], mass: 25 }; return g; };
BUILD.torch = () => {
  const g = new THREE.Group();
  const body = solid(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 16), [0.10, 0.10, 0.12]); body.position.y = 0.05; g.add(body);
  const head = solid(new THREE.CylinderGeometry(0.034, 0.024, 0.06, 16), [0.10, 0.10, 0.12]); head.position.y = 0.19; g.add(head);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.6, 2.2) })); lens.rotation.x = -Math.PI / 2; lens.position.y = 0.221; g.add(lens);
  const sp = new THREE.SpotLight(new THREE.Color(1, 0.96, 0.85), 18, 10, 0.3, 0.6, 2); sp.position.y = 0.22; const tg = new THREE.Object3D(); tg.position.y = 3; g.add(sp, tg); sp.target = tg;
  g.userData = { mode: 'along', grip: [0, 0, 0], mass: 0.4 }; return g;
};
BUILD.cash = () => {
  const g = new THREE.Group();
  const notes = solid(new THREE.BoxGeometry(0.07, 0.03, 0.16), [0.55, 0.70, 0.50], 0.006); notes.position.y = 0.015; g.add(notes);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.032, 0.03), new THREE.MeshBasicMaterial({ color: lin(0.85, 0.80, 0.70) })); band.position.y = 0.015; g.add(band);
  g.userData = { mode: 'up', grip: [0, 0.03, 0], mass: 0.2 }; return g;
};
// the cap fits a head 0.30 m across (W = 0.6, head half width 0.5 W); cast.js scales it with the head on the head slot
BUILD.cap = () => {
  const g = new THREE.Group();
  const dome = solid(new THREE.SphereGeometry(0.155, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), [0.78, 0.10, 0.08]); dome.scale.y = 0.62; g.add(dome);
  const brim = solid(new THREE.CylinderGeometry(0.11, 0.11, 0.01, 20, 1, false, -Math.PI / 2, Math.PI), [0.70, 0.08, 0.07], 0.004); brim.position.set(0, 0.004, 0.12); brim.scale.z = 0.8; g.add(brim);
  g.userData = { mode: 'up', grip: [0, 0.095, 0], mass: 0.1, soft: true }; return g;   // held by the crown; cloth: it gives way on the head (no contact push)
};
