// Two toon cars of our own design: a police car with a red/blue light bar, and a small parked hatchback.
// Built in three's local frame: +x = the car's front, y up, z = its left side; the wheels stand on y = 0.
// The caller adds the group to the scene and marks it with stage.prop() for the ink line.
import * as THREE from 'three';
import { lin, std } from '../../engine/look.js';

function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const glassMat = () => new THREE.MeshBasicMaterial({ map: canvasTex(256, 128, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgb(150,190,226)'); gr.addColorStop(1, 'rgb(46,70,110)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(60, 0); g.lineTo(100, 0); g.lineTo(60, h); g.lineTo(20, h); g.closePath(); g.fill();
}) });

function part(g, geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m;
}
function wheels(g, L, Wd, r = 0.32) {
  const tyre = std([0.04, 0.04, 0.05], 0.7), hub = std([0.70, 0.72, 0.76], 0.3);
  const tg = new THREE.CylinderGeometry(r, r, 0.22, 28); tg.rotateX(Math.PI / 2);
  const hg = new THREE.CylinderGeometry(r * 0.5, r * 0.5, 0.235, 20); hg.rotateX(Math.PI / 2);
  for (const x of [L * 0.32, -L * 0.30]) for (const z of [Wd / 2 - 0.08, -Wd / 2 + 0.08]) { part(g, tg, tyre, x, r, z); part(g, hg, hub, x, r, z); }
}
// side panel texture: base colour plus an optional stripe and word (same material both sides)
function sideMats(base, stripe, word) {
  const t = canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    if (stripe) {
      g.fillStyle = stripe; g.fillRect(0, h * 0.40, w, h * 0.26);
      g.fillStyle = 'rgb(250,250,252)'; g.fillRect(0, h * 0.46, w, h * 0.03);
      if (word) { g.font = 'bold 74px Arial, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgb(250,250,252)'; g.fillText(word, w * 0.5, h * 0.565); }
    }
  });
  const L = new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 });
  return { L, R: L };                                              // box faces already read unmirrored from outside
}

// opts.body: linear rgb of the paint
export function makeHatchback(stage, opts = {}) {
  const g = new THREE.Group(), L = 3.7, Wd = 1.70;
  const paint = std(opts.body || [0.40, 0.66, 0.78], 0.35), trim = std([0.05, 0.05, 0.06], 0.6), glass = glassMat();
  const side = sideMats(`rgb(${(opts.body || [0.40, 0.66, 0.78]).map(c => Math.round(255 * Math.pow(c, 1 / 2.2))).join(',')})`, null, null);
  part(g, new THREE.BoxGeometry(L, 0.66, Wd), [paint, paint, paint, paint, side.L, side.R], 0, 0.30 + 0.33, 0);
  part(g, new THREE.BoxGeometry(L * 0.62, 0.58, Wd * 0.90), paint, -L * 0.12, 0.96 + 0.29, 0);
  // windows: windscreen, rear hatch glass, side glass
  const wind = part(g, new THREE.BoxGeometry(0.04, 0.46, Wd * 0.82), glass, L * 0.19 + 0.02, 1.22, 0); wind.rotation.z = 0.0;
  part(g, new THREE.BoxGeometry(0.04, 0.44, Wd * 0.80), glass, -L * 0.43 - 0.02, 1.22, 0);
  for (const s of [1, -1]) {
    part(g, new THREE.BoxGeometry(L * 0.27, 0.40, 0.04), glass, L * 0.03, 1.24, s * (Wd * 0.45 + 0.01));
    part(g, new THREE.BoxGeometry(L * 0.24, 0.40, 0.04), glass, -L * 0.28, 1.24, s * (Wd * 0.45 + 0.01));
    part(g, new THREE.BoxGeometry(0.05, 0.03, 0.12), trim, L * 0.02, 0.92, s * (Wd / 2 + 0.05));
    part(g, new THREE.BoxGeometry(0.06, 0.12, 0.30), new THREE.MeshBasicMaterial({ color: lin(1.0, 0.95, 0.80) }), L / 2 + 0.01, 0.78, s * 0.58);
    part(g, new THREE.BoxGeometry(0.06, 0.16, 0.22), std([0.70, 0.06, 0.06], 0.4), -L / 2 - 0.01, 0.82, s * 0.66);
  }
  part(g, new THREE.BoxGeometry(L + 0.10, 0.16, Wd + 0.04), trim, 0, 0.36, 0);
  wheels(g, L, Wd);
  return g;
}

// group.userData.set({ phase }): phase in flash cycles (1 = red then blue once); lights also tint the ground
export function makePoliceCar(stage, opts = {}) {
  const g = new THREE.Group(), L = 4.4, Wd = 1.80;
  const white = std([0.90, 0.91, 0.94], 0.3), trim = std([0.04, 0.04, 0.05], 0.55), glass = glassMat();
  const side = sideMats('rgb(240,242,246)', 'rgb(24,44,104)', opts.word || 'POLICE');
  part(g, new THREE.BoxGeometry(L, 0.70, Wd), [white, white, white, trim, side.L, side.R], 0, 0.32 + 0.35, 0);
  part(g, new THREE.BoxGeometry(L * 0.48, 0.60, Wd * 0.88), white, -L * 0.06, 1.02 + 0.30, 0);
  part(g, new THREE.BoxGeometry(0.04, 0.48, Wd * 0.80), glass, L * 0.18 + 0.02, 1.30, 0);
  part(g, new THREE.BoxGeometry(0.04, 0.46, Wd * 0.78), glass, -L * 0.30 - 0.02, 1.30, 0);
  for (const s of [1, -1]) {
    part(g, new THREE.BoxGeometry(L * 0.20, 0.42, 0.04), glass, L * 0.06, 1.32, s * (Wd * 0.44 + 0.01));
    part(g, new THREE.BoxGeometry(L * 0.20, 0.42, 0.04), glass, -L * 0.18, 1.32, s * (Wd * 0.44 + 0.01));
    part(g, new THREE.BoxGeometry(0.06, 0.12, 0.34), new THREE.MeshBasicMaterial({ color: lin(1.0, 0.95, 0.80) }), L / 2 + 0.01, 0.80, s * 0.60);
    part(g, new THREE.BoxGeometry(0.06, 0.15, 0.24), std([0.70, 0.06, 0.06], 0.4), -L / 2 - 0.01, 0.84, s * 0.66);
  }
  part(g, new THREE.BoxGeometry(L + 0.12, 0.18, Wd + 0.04), trim, 0, 0.38, 0);
  part(g, new THREE.BoxGeometry(0.10, 0.30, Wd * 0.7), trim, L / 2 + 0.06, 0.58, 0);    // push bar
  // light bar: black base, a red lamp on the left half, a blue lamp on the right half
  const top = 1.62;
  part(g, new THREE.BoxGeometry(0.34, 0.06, Wd * 0.80), trim, -L * 0.04, top + 0.03, 0);
  const red = new THREE.MeshBasicMaterial({ color: lin(1.0, 0.05, 0.04) }), blue = new THREE.MeshBasicMaterial({ color: lin(0.05, 0.22, 1.0) });
  const rl = part(g, new THREE.BoxGeometry(0.28, 0.13, Wd * 0.36), red, -L * 0.04, top + 0.12, Wd * 0.20);
  const bl = part(g, new THREE.BoxGeometry(0.28, 0.13, Wd * 0.36), blue, -L * 0.04, top + 0.12, -Wd * 0.20);
  rl.castShadow = bl.castShadow = false;
  stage.glow(rl, 1.0); stage.glow(bl, 1.0);
  const rp = new THREE.PointLight(lin(1.0, 0.1, 0.08), 0, 7, 2), bp = new THREE.PointLight(lin(0.1, 0.25, 1.0), 0, 7, 2);
  rp.position.set(-L * 0.04, top + 0.4, Wd * 0.3); bp.position.set(-L * 0.04, top + 0.4, -Wd * 0.3); g.add(rp, bp);
  wheels(g, L, Wd);
  const R0 = red.color.clone(), B0 = blue.color.clone(), RG = rl.userData.glow.color.clone(), BG = bl.userData.glow.color.clone();
  const set = ({ phase = 0, on = 1 } = {}) => {
    const c = Math.cos(2 * Math.PI * phase), r = on * Math.pow(Math.max(0, c), 0.35), b = on * Math.pow(Math.max(0, -c), 0.35);
    red.color.copy(R0).multiplyScalar(0.30 + 2.6 * r); rl.userData.glow.color.copy(RG).multiplyScalar(0.05 + 3.5 * r);
    blue.color.copy(B0).multiplyScalar(0.30 + 2.6 * b); bl.userData.glow.color.copy(BG).multiplyScalar(0.05 + 3.5 * b);
    rp.intensity = 2.2 * r; bp.intensity = 2.6 * b;
  };
  set({ phase: 0, on: 0 });
  g.userData.set = set;
  return g;
}
