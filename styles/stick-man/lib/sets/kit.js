// Building blocks for a set file (SETS.md "Add a new set in 15 minutes"): boxes, cylinders, spheres and painted cards in
// Blender metres (x right, y into the scene, z up), each added to the scene with shadows and, for solid pieces, the ink
// line. A set's build(stage, opts) starts with `const k = setKit(stage)` and returns { props }.
import * as THREE from 'three';
import { B, lin, std } from '../../engine/look.js';

export function canvasTex(w, h, draw, repeat = false) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function setKit(stage) {
  const { scene, prop } = stage;
  const add = (m, ink = true, cast = true) => { m.castShadow = cast; m.receiveShadow = true; scene.add(m); if (ink) prop(m); return m; };
  const mat = (rgb, rough = 0.7, o) => std(rgb, rough, o);
  return {
    mat, add,
    // an axis-aligned box from corner lo to corner hi
    box(lo, hi, m, ink = true) {
      const a = B(...lo), b = B(...hi);
      const x = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(b.x - a.x), Math.abs(b.y - a.y), Math.abs(b.z - a.z)), m);
      x.position.copy(a).add(b).multiplyScalar(0.5); return add(x, ink);
    },
    // an upright cylinder centred at loc (r2 = top radius)
    cyl(loc, r, h, m, { r2 = r, seg = 28, ink = true } = {}) {
      const x = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, h, seg), m); x.position.copy(B(...loc)); return add(x, ink);
    },
    sphere(loc, r, m, { ink = true, sz = 1 } = {}) {
      const x = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 16), m); x.scale.y = sz; x.position.copy(B(...loc)); return add(x, ink);
    },
    // a painted card facing the camera side (-y): signs, posters, a chalkboard face. No ink, no shadow.
    card(loc, w, h, map) {
      const x = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.8 }));
      x.position.copy(B(...loc)); x.receiveShadow = true; x.userData.noPrepass = true; scene.add(x); return x;
    },
    // sky dome: a vertical gradient (top, horizon) with soft painted clouds; no ink, no fog
    sky(top = [40, 108, 204], horizon = [170, 202, 234], clouds = 14) {
      const t = canvasTex(2048, 1024, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, `rgb(${top})`); gr.addColorStop(0.5, `rgb(${horizon})`); gr.addColorStop(1, `rgb(${horizon})`);
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        let s = 29; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
        for (let i = 0; i < clouds; i++) { const cx = rnd() * w, cy = h * (0.16 + 0.24 * rnd()), r0 = 30 + 50 * rnd();
          for (let k = 0; k < 6; k++) { const x = cx + (k - 2.5) * r0 * 0.9, r = r0 * (0.7 + 0.6 * Math.sin(k * 1.7 + i));
            g.fillStyle = 'rgb(214,228,244)'; g.beginPath(); g.ellipse(x, cy, r * 1.2, r * 0.8, 0, Math.PI, 0); g.fill();
            g.fillStyle = 'rgb(243,247,252)'; g.beginPath(); g.ellipse(x, cy - r * 0.12, r * 1.05, r * 0.64, 0, Math.PI, 0); g.fill(); } }
      });
      const m = new THREE.Mesh(new THREE.SphereGeometry(60, 48, 24), new THREE.MeshBasicMaterial({ map: t, color: lin(0.8, 0.8, 0.8), side: THREE.BackSide, fog: false }));
      m.rotation.y = 0.6; scene.add(m); return m;
    },
  };
}
