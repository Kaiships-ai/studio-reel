// wif5 part c: the film's own props (no kit shape): a tea cup on its saucer held by its handle (the old man's hand on his
// cup), the same cup standing on the table (hers), and four meal trays stacked in a carer's two hands, leaning.
// Three.js y-up; a hand prop's forward is +z. Registered into the kit's BUILD under film-only names, waived in reel.js.
import * as THREE from 'three';
import { BUILD } from '/styles/stick-man/kit/cast/handprops.js';

const srgb = c => new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
const hull = new THREE.MeshBasicMaterial({ color: srgb([0.05, 0.05, 0.07]), side: THREE.BackSide });
function solid(geo, c, { ink = 0.008, rough = 0.6 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: srgb(c), roughness: rough }); m.userData.noToon = true;
  const x = new THREE.Mesh(geo, m); x.castShadow = true; x.receiveShadow = true;
  if (ink) { const h = new THREE.Mesh(geo, hull); h.scale.setScalar(1 + ink / 0.12); x.add(h); }
  return x;
}
const lathe = (pts, c, o) => solid(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 28), c, o);

// a cup of tea on its saucer, bottom at y 0; the handle on +x. China a warm cream with a blue band (no flat white)
const CHINA = [0.86, 0.80, 0.70], BAND = [0.28, 0.42, 0.72], TEA = [0.55, 0.30, 0.12];
// steam: three thin pale wisps curling up out of the tea (translucent, no ink)
const STEAM = new THREE.MeshBasicMaterial({ color: srgb([0.96, 0.94, 0.90]), transparent: true, opacity: 0.42, depthWrite: false });
function steam(g) {
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1, pts = [];
    for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push(new THREE.Vector3(Math.cos(a) * 0.018 + 0.016 * Math.sin(t * 7 + a), 0.09 + t * (0.16 + 0.03 * i), Math.sin(a) * 0.018 + 0.012 * Math.cos(t * 6 + a))); }
    const w = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.006 - i * 0.001, 6), STEAM); w.userData.noInk = true; w.renderOrder = 2; g.add(w);
  }
}
export function teacup(china = CHINA, { steam: hot = false } = {}) {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [0.05, 0], [0.085, 0.012], [0.086, 0.016], [0.05, 0.008], [0, 0.008]], china, { ink: 0.004 }));
  const cup = lathe([[0, 0.008], [0.028, 0.008], [0.03, 0.014], [0.05, 0.05], [0.054, 0.09], [0.05, 0.09], [0.046, 0.052], [0, 0.05]], china, { ink: 0.005 }); g.add(cup);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.004, 6, 28), new THREE.MeshStandardMaterial({ color: srgb(BAND), roughness: 0.5 })); band.rotation.x = Math.PI / 2; band.position.y = 0.078; g.add(band);
  const tea = new THREE.Mesh(new THREE.CircleGeometry(0.048, 24), new THREE.MeshStandardMaterial({ color: srgb(TEA), roughness: 0.3 })); tea.rotation.x = -Math.PI / 2; tea.position.y = 0.082; g.add(tea);
  const handle = solid(new THREE.TorusGeometry(0.026, 0.008, 8, 16), china, { ink: 0.004 }); handle.position.set(0.074, 0.058, 0); g.add(handle);
  if (hot) steam(g);
  g.traverse(o => { if (o.isMesh) o.userData.noInk = true; });
  return g;
}
// held by its handle: the fist closed on the handle's outer side (the ring shows between it and the cup), the saucer standing on the table under it
BUILD.wif5_teacup = () => { const g = teacup(CHINA, { steam: true }); g.userData = { mode: 'up', grip: [0.1, 0.058, 0], size: [0.17, 0.09, 0.17], mass: 0.3 }; return g; };

// one meal tray: a plate with food, a bowl and a small cup, on a tray 0.46 x 0.28 (bottom at y 0)
function tray(c) {
  const t = new THREE.Group();
  const base = solid(new THREE.BoxGeometry(0.46, 0.018, 0.28), c, { ink: 0.006 }); base.position.y = 0.009; t.add(base);
  for (const s of [-1, 1]) { const lip = solid(new THREE.BoxGeometry(0.46, 0.03, 0.012), c, { ink: 0.004 }); lip.position.set(0, 0.024, s * 0.135); t.add(lip); }
  const plate = lathe([[0, 0.018], [0.07, 0.018], [0.09, 0.03], [0.088, 0.032], [0, 0.026]], CHINA, { ink: 0.004 }); plate.position.x = -0.1; t.add(plate);
  const food = solid(new THREE.SphereGeometry(0.045, 12, 8), [0.80, 0.55, 0.20], { ink: 0.003 }); food.scale.y = 0.5; food.position.set(-0.1, 0.036, 0); t.add(food);
  const bowl = lathe([[0, 0.018], [0.03, 0.018], [0.05, 0.05], [0.046, 0.05], [0, 0.03]], CHINA, { ink: 0.004 }); bowl.position.set(0.04, 0, 0.02); t.add(bowl);
  const cup = teacup(); cup.scale.setScalar(0.6); cup.position.set(0.16, 0.018, -0.03); t.add(cup);
  return t;
}
// the meal trolley the carer pushes: a steel frame on four castors, two shelves with two trays each (four trays), the
// push bar across the back at the fists (HANDLE_Y, measured on Move_PushHeavy_Loop); the body runs forward (+z) from it
export const HANDLE_Y = 0.95;
export function trolley(handleY = HANDLE_Y) {
  const g = new THREE.Group(), STEEL = [0.56, 0.60, 0.64], W = 0.54, Z0 = 0.06, Z1 = 0.70;
  const bar = solid(new THREE.CylinderGeometry(0.018, 0.018, W + 0.06, 12), [0.22, 0.30, 0.42], { ink: 0.005 }); bar.rotation.z = Math.PI / 2; bar.position.set(0, handleY, 0); g.add(bar);
  for (const sx of [-1, 1]) {
    const arm = solid(new THREE.BoxGeometry(0.022, 0.022, Z0 + 0.02), STEEL, { ink: 0.004 }); arm.position.set(sx * W / 2, handleY, Z0 / 2); g.add(arm);
    for (const z of [Z0, Z1]) { const top = z === Z0 ? handleY : 0.74; const post = solid(new THREE.BoxGeometry(0.026, top - 0.08, 0.026), STEEL, { ink: 0.004 }); post.position.set(sx * W / 2, 0.08 + (top - 0.08) / 2, z); g.add(post);
      const wheel = solid(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 14), [0.16, 0.16, 0.18], { ink: 0.004 }); wheel.rotation.z = Math.PI / 2; wheel.position.set(sx * W / 2, 0.045, z); g.add(wheel); }
  }
  const TRAY = [[0.55, 0.62, 0.66], [0.62, 0.36, 0.22]];
  [0.30, 0.66].forEach((y, k) => {
    const shelf = solid(new THREE.BoxGeometry(W + 0.03, 0.02, Z1 - Z0 + 0.03), STEEL, { ink: 0.005 }); shelf.position.set(0, y, (Z0 + Z1) / 2); g.add(shelf);
    for (let j = 0; j < 2; j++) { const t = tray(TRAY[(j + k) % 2]); t.position.set(0, y + 0.01, Z0 + 0.165 + j * 0.31); g.add(t); }
  });
  g.traverse(o => { if (o.isMesh) o.userData.noInk = true; });
  return g;
}
// pushed along the floor by its bar (the kit crate's contract: floor, both fists on the bar, grip at the bar's middle)
BUILD.wif5_trolley = () => { const g = trolley(); g.userData = { mode: 'both', floor: true, grip: [0, HANDLE_Y, 0], mass: 40 }; return g; };
