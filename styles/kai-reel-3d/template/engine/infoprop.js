// infoprop.js: the "information props" of a listicle reel: a glowing sign / billboard / screen that shows a tool name,
// a number, a logo or a screenshot, placed in the city (flat space, carried by the bend) and popped on a spoken word.
//
//   const P = infoProp(scene, { w: 2.4, h: 1.3, title: 'CURSOR', sub: 'AI code editor', color: '#46e0ff' });
//   await P.image('./assets/logos/cursor.png') // optional: logo / screenshot (local file) drawn on the face
//   P.place(V(x, y, z), yaw, roll)             // flat-space spot; yaw 0 faces +z (the camera side of the street); roll spins it in its plane
//   P.show(t, VO.at('cursor'), VO.at('next'))  // pops in on the word, out at the second time (null = stays)
import * as THREE from 'three';
import { bendFrame } from './bend.js';

const backOut = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

export function infoProp(scene, o = {}) {
  const w = o.w ?? 2.4, h = o.h ?? 1.3, px = 512, cv = document.createElement('canvas');
  cv.width = px * 2; cv.height = Math.round(px * 2 * h / w);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.1), new THREE.MeshBasicMaterial({ color: '#15121e' }));
  frame.position.z = -0.06;
  const root = new THREE.Group(), pivot = new THREE.Group(); pivot.add(frame, face); root.add(pivot); scene.add(root);
  let img = null;
  const draw = () => {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height, col = o.color || '#ffc94a';
    g.fillStyle = o.bg || '#120c1c'; g.fillRect(0, 0, W, H);
    g.strokeStyle = col; g.lineWidth = W * 0.012; g.strokeRect(W * 0.03, H * 0.05, W * 0.94, H * 0.9);
    if (img) { const s = Math.min(W * 0.84 / img.width, H * (o.sub ? 0.56 : 0.8) / img.height); g.drawImage(img, W / 2 - img.width * s / 2, H * (o.sub ? 0.1 : 0.1), img.width * s, img.height * s); }
    g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (o.title) { let fs = H * (img ? 0.16 : 0.34); g.font = `900 ${fs}px "Arial Black", Impact, sans-serif`; while (g.measureText(o.title).width > W * 0.86) { fs *= 0.92; g.font = `900 ${fs}px "Arial Black", Impact, sans-serif`; }
      g.fillText(o.title, W / 2, H * (img ? 0.78 : o.sub ? 0.42 : 0.5)); }
    if (o.sub) { g.font = `700 ${H * 0.11}px "Helvetica Neue", Arial, sans-serif`; g.fillStyle = o.subColor || '#fff4e0'; g.fillText(o.sub, W / 2, H * (img ? 0.92 : 0.74)); }
    tex.needsUpdate = true;
  };
  draw();
  const flatPos = new THREE.Vector3(), flatQ = new THREE.Quaternion();
  return {
    root, set(p) { Object.assign(o, p); draw(); },
    image(url) { return new Promise((ok, no) => { const im = new Image(); im.onload = () => { img = im; draw(); ok(); }; im.onerror = no; im.src = url; }); },   // await it before S.run
    place(pos, yaw = 0, roll = 0) { flatPos.copy(pos); flatQ.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw); if (roll) flatQ.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll)); const f = bendFrame(flatPos, flatQ); root.position.copy(f.pos); root.quaternion.copy(f.quat); },
    // pop in at t0 (back-out scale + a tiny swing), out at t1
    show(t, t0, t1 = null) {
      if (t0 == null) { root.visible = false; return 0; }
      const a = clamp((t - t0) / 0.35), b = t1 == null ? 0 : clamp((t - t1) / 0.25);
      const k = Math.max(0, backOut(a) * (1 - b * b));
      root.visible = k > 0.01; pivot.scale.setScalar(Math.max(0.001, k)); pivot.rotation.z = 0.08 * Math.sin(Math.min(1, a) * 9) * (1 - a);
      return k;
    },
  };
}
