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
export function teacup(china = CHINA) {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [0.05, 0], [0.085, 0.012], [0.086, 0.016], [0.05, 0.008], [0, 0.008]], china, { ink: 0.004 }));
  const cup = lathe([[0, 0.008], [0.028, 0.008], [0.03, 0.014], [0.05, 0.05], [0.054, 0.09], [0.05, 0.09], [0.046, 0.052], [0, 0.05]], china, { ink: 0.005 }); g.add(cup);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.004, 6, 28), new THREE.MeshStandardMaterial({ color: srgb(BAND), roughness: 0.5 })); band.rotation.x = Math.PI / 2; band.position.y = 0.078; g.add(band);
  const tea = new THREE.Mesh(new THREE.CircleGeometry(0.048, 24), new THREE.MeshStandardMaterial({ color: srgb(TEA), roughness: 0.3 })); tea.rotation.x = -Math.PI / 2; tea.position.y = 0.082; g.add(tea);
  const handle = solid(new THREE.TorusGeometry(0.02, 0.006, 8, 16), china, { ink: 0.004 }); handle.position.set(0.068, 0.058, 0); g.add(handle);
  g.traverse(o => { if (o.isMesh) o.userData.noInk = true; });
  return g;
}
// held by its handle: the fist on the handle, the saucer standing on the table under it
BUILD.wif5_teacup = () => { const g = teacup(); g.userData = { mode: 'up', grip: [0.072, 0.06, 0], size: [0.17, 0.09, 0.17], mass: 0.3 }; return g; };

// four trays, each a plate, a bowl and a cup, stacked on little cups and leaning further each one up (they tilt)
export function trays() {
  const g = new THREE.Group(), TRAY = [[0.55, 0.62, 0.66], [0.62, 0.36, 0.22], [0.55, 0.62, 0.66], [0.62, 0.36, 0.22]];
  let y = 0, x = 0, rz = 0;
  for (let i = 0; i < 4; i++) {
    const t = new THREE.Group(); t.position.set(x, y, 0); t.rotation.z = rz; g.add(t);
    const base = solid(new THREE.BoxGeometry(0.48, 0.018, 0.32), TRAY[i], { ink: 0.006 }); base.position.y = 0.009; t.add(base);
    for (const s of [-1, 1]) { const lip = solid(new THREE.BoxGeometry(0.48, 0.03, 0.012), TRAY[i], { ink: 0.004 }); lip.position.set(0, 0.024, s * 0.155); t.add(lip); }
    const plate = lathe([[0, 0.018], [0.07, 0.018], [0.09, 0.03], [0.088, 0.032], [0, 0.026]], CHINA, { ink: 0.004 }); plate.position.x = -0.09; t.add(plate);
    const food = solid(new THREE.SphereGeometry(0.04, 12, 8), [0.80, 0.55, 0.20], { ink: 0.003 }); food.scale.y = 0.45; food.position.set(-0.09, 0.034, 0); t.add(food);
    const cup = teacup(); cup.scale.setScalar(0.7); cup.position.set(0.1, 0.018, -0.03); t.add(cup);
    y += 0.085; x += 0.018 * (i + 1); rz -= 0.035 * (i + 1);
  }
  g.traverse(o => { if (o.isMesh) o.userData.noInk = true; });
  return g;
}
// held in both hands under the bottom tray (the hugbag's contract: the two fists under its lower sides)
BUILD.wif5_trays = () => { const g = trays(); g.userData = { mode: 'both', grip: [0, 0.0, 0.0], size: [0.48, 0.36, 0.32], mass: 6 }; return g; };
