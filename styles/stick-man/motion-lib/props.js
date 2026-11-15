// The hand props the motion library's clips name (needs.props), registered into the kit's BUILD (lib/cast/handprops.js).
// A film imports this, or maps a clip's prop to its own with the clip key's `swap: { bag: 'duffel' }`.
//   bag    one heavy duffel (25 kg in the clips: x_kg<side>), hung from the fist by its handle, long side forward
//   torch  a flashlight along the forearm, a dim lit lens and a soft spot
//   cash   a banded bundle of notes
//   cap    a peaked cap (soft: no contact push); worn on the head with x_hpH_cap (cast.js: the head slot), carried with x_hpR_cap
//   hugbag a duffel hugged to the chest in both arms (x_hpB_hugbag), long side across: the hands hold its lower sides
//   crate  a heavy crate pushed along the floor with both hands on its back face (x_hpB_crate; floor: it stands on the
//          ground, the hands only move it along)
//   hotdog a hot dog in a bun, held at its back end, the front end out of the fist along the forearm (x_hp<L|R>_hotdog)
//   pistol a handgun, the barrel out of the fist along the forearm (x_hp<L|R>_pistol)
// Every prop's grip is the point the fist (or, for B, the midpoint of the two fists) holds, in the prop's own metres: a
// film's own prop (swap) sets its grip and mode the same way and needs no offset of its own.
// Sizes in metres, Blender up = +y here (three.js), the figure's forward = +z.
import * as THREE from 'three';
import { BUILD } from '../lib/cast/handprops.js';
import { lin } from '../engine/look.js';

const hullMat = new THREE.MeshBasicMaterial({ color: lin(0.05, 0.05, 0.07), side: THREE.BackSide });
// an opaque matte surface (a toon ramp on a hand prop read as glass: the legs showed through the bag)
const solid = (geo, col, ink = 0.012) => {
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(...col, THREE.SRGBColorSpace), roughness: 0.85 }); mat.userData.noToon = true;
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
  const h = new THREE.Mesh(geo, hullMat); h.scale.setScalar(1 + ink / 0.2); m.add(h); return m;
};
const round = (w, h, d, r) => { const s = new THREE.Shape(), x = w / 2 - r, y = h / 2 - r;
  s.moveTo(-x, -h / 2); s.lineTo(x, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -y); s.lineTo(w / 2, y); s.quadraticCurveTo(w / 2, h / 2, x, h / 2);
  s.lineTo(-x, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, y); s.lineTo(-w / 2, -y); s.quadraticCurveTo(-w / 2, -h / 2, -x, -h / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, -d / 2); return g; };

// the bag's body 0.20 wide, 0.26 tall, 0.46 long; the handle's top (the grip) 0.31 above its bottom
export const BAG = { w: 0.20, h: 0.26, l: 0.46, grip: 0.31 };
export function bagMesh(col = [0.16, 0.20, 0.30], d = BAG) {
  const g = new THREE.Group(), hr = 0.055 * (d.grip - d.h) / (BAG.grip - BAG.h);   // (the handle's arc: the kit bag's, as high as the grip is over the body)
  const body = solid(round(d.w, d.h, d.l, Math.min(0.07, d.w / 3, d.h / 3)), col); body.position.y = d.h / 2; g.add(body);
  const zip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.006, d.l * 0.8), new THREE.MeshBasicMaterial({ color: lin(0.75, 0.70, 0.55) })); zip.position.y = d.h + 0.002; g.add(zip);
  const handle = solid(new THREE.TorusGeometry(hr, 0.012, 8, 16, Math.PI), [0.08, 0.08, 0.10], 0.006); handle.rotation.y = Math.PI / 2; handle.position.y = d.h; g.add(handle);
  return g;
}
// A one-hand bag's size, the numbers the clips that hold it fit themselves to (index.js placeClip `fit.bag`): userData.size
// [w, h, l] (m: across, tall, long; its bottom at y 0) and userData.grip (the handle's top, the fist). A film's own bag
// (`swap: { bag: 'mine' }`) is read the same way: its size if it names one, else its meshes' box.
const bagData = d => ({ mode: 'up', grip: [0, d.grip, 0], size: [d.w, d.h, d.l], mass: 25 });
BUILD.bag = () => { const g = bagMesh(); g.userData = bagData(BAG); return g; };
// a kit bag of another size, registered once under a name of its own (bag_<w>x<l>x<h>_<grip>, mm): a clip key fitted with
// `fit: { bag: { w, l, h, grip } }` and no film prop of its own plays it (tools/motionlib.mjs fitChecks, the proof page)
export function sizedBag({ w = BAG.w, l = BAG.l, h = BAG.h, grip = BAG.grip } = {}) {
  const mm = v => Math.round(v * 1000), kind = `bag_${mm(w)}x${mm(l)}x${mm(h)}_${mm(grip)}`, d = { w, l, h, grip };
  BUILD[kind] ||= () => { const g = bagMesh(undefined, d); g.userData = bagData(d); return g; };
  return kind;
}
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
// a big cartoon cap, 0.46 m across over a head 0.30 m across (W = 0.6), so its rim stands out where a hand can hold it;
// cast.js scales it with the head on the head slot
BUILD.cap = () => {
  const g = new THREE.Group();
  const dome = solid(new THREE.SphereGeometry(0.23, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), [0.78, 0.10, 0.08]); dome.scale.y = 0.62; g.add(dome);
  const brim = solid(new THREE.CylinderGeometry(0.15, 0.15, 0.01, 20, 1, false, -Math.PI / 2, Math.PI), [0.70, 0.08, 0.07], 0.004); brim.position.set(0, 0.004, 0.18); brim.scale.z = 0.8; g.add(brim);
  g.userData = { mode: 'up', grip: [0.31, -0.076, 0.043], mass: 0.1, soft: true }; return g;   // held under its right rim; cloth: no contact push
};

// the hugged duffel: 0.38 across (the fists hold its sides), 0.26 tall, 0.24 deep; the fists' midpoint 0.07 up its front
// half, so its back rests on the chest (the captured carry: fists 0.44 apart, 0.29 m ahead of the hips)
export const HUG = { w: 0.38, h: 0.26, d: 0.24, grip: [0, 0.07, 0.03] };
BUILD.hugbag = () => {
  const g = new THREE.Group(), col = [0.16, 0.20, 0.30];
  const body = solid(round(HUG.w, HUG.h, HUG.d, 0.07), col); body.position.y = HUG.h / 2; g.add(body);
  const zip = new THREE.Mesh(new THREE.BoxGeometry(HUG.w * 0.8, 0.006, 0.012), new THREE.MeshBasicMaterial({ color: lin(0.75, 0.70, 0.55) })); zip.position.y = HUG.h + 0.002; g.add(zip);
  g.userData = { mode: 'both', grip: HUG.grip, mass: 20 }; return g;
};
// the pushed crate: 0.60 across, 0.95 tall, 0.55 deep, standing on the floor; the fists on its back face (z = -0.275)
export const CRATE = { w: 0.60, h: 0.95, d: 0.55 };
BUILD.crate = () => {
  const g = new THREE.Group(), wood = [0.50, 0.36, 0.22];
  const box = solid(new THREE.BoxGeometry(CRATE.w, CRATE.h, CRATE.d), wood); box.position.set(0, CRATE.h / 2, CRATE.d / 2 + 0.02); g.add(box);
  for (const y of [0.18, 0.5, 0.82]) { const slat = new THREE.Mesh(new THREE.BoxGeometry(CRATE.w + 0.004, 0.012, CRATE.d + 0.004), new THREE.MeshBasicMaterial({ color: lin(0.30, 0.20, 0.12) })); slat.position.set(0, y * CRATE.h, CRATE.d / 2 + 0.02); g.add(slat); }
  g.userData = { mode: 'both', floor: true, grip: [0, 0, 0], mass: 60 }; return g;
};
// the hot dog: a bun 0.18 long, the sausage showing at both ends; the fist round its back third
BUILD.hotdog = () => {
  const g = new THREE.Group();
  const bun = solid(new THREE.CapsuleGeometry(0.026, 0.13, 4, 12), [0.86, 0.62, 0.34]); bun.position.y = 0.09; bun.scale.set(1, 1, 0.8); g.add(bun);
  const dog = solid(new THREE.CapsuleGeometry(0.014, 0.17, 4, 10), [0.66, 0.24, 0.16], 0.006); dog.position.set(0, 0.09, 0.016); g.add(dog);
  g.userData = { mode: 'along', grip: [0, 0.04, 0], mass: 0.15 }; return g;
};
// the handgun: a slide 0.17 long out of the fist along the forearm, the grip in the fist
BUILD.pistol = () => {
  const g = new THREE.Group(), steel = [0.12, 0.12, 0.14];
  const slide = solid(new THREE.BoxGeometry(0.03, 0.17, 0.045), steel, 0.006); slide.position.set(0, 0.07, 0.03); g.add(slide);
  const grip = solid(new THREE.BoxGeometry(0.028, 0.05, 0.08), steel, 0.006); grip.position.set(0, 0, 0); g.add(grip);
  g.userData = { mode: 'along', grip: [0, 0, 0], mass: 0.9 }; return g;
};
