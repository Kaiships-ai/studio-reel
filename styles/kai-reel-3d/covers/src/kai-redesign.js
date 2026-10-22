// kai-redesign.js: 3 face/glasses redesign prototypes for Blocky Kai (cover.html?kai=v1|v2|v3). Runtime only: the GLB is untouched.
// The baked glasses + eyes are covered by one skin-coloured conformal decal (sampled from Kai's own texture), then new
// eyes / brows are decals and the new glasses are simple 3D geometry parented to the Head bone. Call right after loadKai
// (reference pose), before posing.
//   v1 "Toy minifig": head 1.3x, big toy dot eyes, thick rounded-square frame, simple smile
//   v2 "Round specs" (canwebuildthis-like): head 1.15x, big round thin-but-clear frame, bigger eyes inside, flatter skin
//   v3 "Glasses glint": head 1.2x, opaque glare lenses (no eyes), thick expressive brows, big mouth
import * as THREE from 'three';
import { ANCHORS } from './kai-talk-anchors.js';
import { MOUTH } from './kai-talk.js';

const VARIANTS = {
  v1: { head: 1.3, eye: 2.7, cheeks: true, frame: 'square', frameR: 0.0235, tube: 0.0042, glare: false, brows: false, mouthK: 1.2, flat: 0 },
  v2: { head: 1.15, eye: 2.3, cheeks: true, frame: 'round', frameR: 0.0255, tube: 0.0019, glare: false, brows: false, mouthK: 1.1, flat: 0.35 },
  v3: { head: 1.2, eye: 0, mouth: 'open', frame: 'round', frameR: 0.025, tube: 0.0042, glare: true, brows: true, mouthK: 1.45, flat: 0.15 },
};
const V3 = (a) => new THREE.Vector3(...a);
const cv = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };

function sampleSkin(talk) {      // Kai's own skin colour: texture texel at the vertex nearest the left cheek
  const sk = talk.skinned, map = sk.material.map, img = map?.image; if (!img) return '#e9b48a';
  const A = ANCHORS.pupilL, p = V3(A.c).addScaledVector(V3(A.up), -0.03).addScaledVector(V3(A.n), 0.002).applyMatrix4(talk.head.matrixWorld);
  const pos = sk.geometry.attributes.position, uv = sk.geometry.attributes.uv, v = new THREE.Vector3(); let b = 1e9, bi = 0;
  for (let i = 0; i < pos.count; i++) { sk.getVertexPosition(i, v); v.applyMatrix4(sk.matrixWorld); const d = v.distanceToSquared(p); if (d < b) { b = d; bi = i; } }
  const c = cv(img.width, img.height, (g) => g.drawImage(img, 0, 0)), g = c.getContext('2d');
  let x = uv.getX(bi) * img.width, y = (map.flipY ? 1 - uv.getY(bi) : uv.getY(bi)) * img.height;
  const d = g.getImageData(Math.max(0, x - 3), Math.max(0, y - 3), 6, 6).data; let r = 0, gg = 0, bb = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; bb += d[i + 2]; }
  const n = d.length / 4; return `rgb(${Math.round(r / n)},${Math.round(gg / n)},${Math.round(bb / n)})`;
}

// paint out the baked glasses in Kai's texture (a copy): inside the UV triangles of the eye band, every dark texel becomes skin.
function hideBakedGlasses(T, skin) {
  const sk = T.skinned, m = sk.material = sk.material.clone(), map = m.map, img = map.image, W = img.width, H = img.height;
  const Q = new URLSearchParams(location.search), thr = Number(Q.get('glum') ?? 75);
  const base = cv(W, H, (g) => g.drawImage(img, 0, 0)), mask = cv(W, H, () => {}), mg = mask.getContext('2d'); mg.fillStyle = '#fff';
  const pos = sk.geometry.attributes.position, uv = sk.geometry.attributes.uv, idx = sk.geometry.index, v = new THREE.Vector3(), N = pos.count;
  const inv = new THREE.Matrix4().copy(T.head.matrixWorld).invert(), L = ANCHORS.pupilL, R = ANCHORS.pupilR, mid = V3(L.c).add(V3(R.c)).multiplyScalar(0.5), inb = new Uint8Array(N);
  for (let i = 0; i < N; i++) { sk.getVertexPosition(i, v); v.applyMatrix4(sk.matrixWorld).applyMatrix4(inv);
    const dy = v.y - mid.y, dz = v.z - mid.z, dx = v.x - mid.x; inb[i] = Math.abs(dz) < 0.075 && dy < Number(Q.get('gtop') ?? 0.022) && dy > -0.028 && dx > -0.04 ? 1 : 0; }
  const U = (i) => [uv.getX(i) * W, (map.flipY === false ? uv.getY(i) : 1 - uv.getY(i)) * H]; let nt = 0;
  for (let t = 0; t < idx.count; t += 3) { const a = idx.getX(t), b = idx.getX(t + 1), c = idx.getX(t + 2); if (!(inb[a] && inb[b] && inb[c])) continue;
    nt++; mg.beginPath(); mg.moveTo(...U(a)); mg.lineTo(...U(b)); mg.lineTo(...U(c)); mg.closePath(); mg.fill(); mg.lineWidth = 2; mg.strokeStyle = '#fff'; mg.stroke(); }
  const bg = base.getContext('2d'), d = bg.getImageData(0, 0, W, H), md = mg.getImageData(0, 0, W, H).data, sc = skin.match(/\d+/g).map(Number); let np = 0;
  for (let k = 0; k < d.data.length; k += 4) { if (!md[k + 3]) continue; const p = d.data, lum = 0.3 * p[k] + 0.59 * p[k + 1] + 0.11 * p[k + 2];
    if (lum < thr) { p[k] = sc[0]; p[k + 1] = sc[1]; p[k + 2] = sc[2]; np++; } }
  bg.putImageData(d, 0, 0); const tex = new THREE.CanvasTexture(base); tex.flipY = map.flipY; tex.colorSpace = map.colorSpace; tex.anisotropy = 8; tex.wrapS = map.wrapS; tex.wrapT = map.wrapT; m.map = tex; m.needsUpdate = true;
  console.log('LOG redesign painted', np, 'px in', nt, 'tris; flipY', map.flipY);
}

export function applyRedesign(K, name) {
  const P = VARIANTS[name]; if (!P) return null;
  const T = K.talk, L = ANCHORS.pupilL, R = ANCHORS.pupilR;
  T.pupils.forEach(m => m.visible = !!P.cheeks && /Cheek/.test(m.name));                                   // old toy eyes + cheeks off
  const skin = sampleSkin(T); hideBakedGlasses(T, skin);
  console.log('LOG redesign', name, 'skin', skin);
  const mid = (k) => V3(L[k]).add(V3(R[k])).multiplyScalar(0.5);
  const right = V3(ANCHORS.mouth.right).normalize(), up = mid('up').normalize(), n = mid('n').normalize();
  // 1) skin patch over the baked glasses + eyes (feathered edge so it melts into the face)
  const patchCv = cv(512, 256, (g, W, H) => { g.filter = 'blur(10px)'; g.fillStyle = skin; g.beginPath(); g.roundRect(22, 26, W - 44, H - 52, 60); g.fill(); });
  const patch = T.decal({ c: mid('c').toArray(), n: n.toArray(), right: right.toArray(), up: up.toArray(), cu: 0, cv: 0.002 }, 0.118, 0.05, 24, 10, 'kaiPatch');
  patch.material = T.decalMat(patchCv); patch.material.roughness = 1; patch.renderOrder = 2;
  const add = [patch]; patch.visible = new URLSearchParams(location.search).has('patch');
  // 2) eyes (decals, on top of the patch)
  const eyeTex = () => cv(256, 256, (g) => { g.fillStyle = '#16100c'; g.beginPath(); g.ellipse(128, 128, 100, 116, 0, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(86, 80, 30, 32, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(160, 168, 12, 12, 0, 0, 7); g.fill(); });
  if (P.eye) for (const A of [L, R]) { const e = 0.0215 * P.eye / 2.2 * 1.0;
    const m = T.decal({ ...A, cv: A.cv + 0.0005 }, e * 0.88, e, 6, 6, 'kaiEye'); m.material = T.decalMat(eyeTex()); m.renderOrder = 3; add.push(m); }
  // brows: thick rounded bars above the frame (v3 = big expressive, raised + tilted)
  if (P.brows) [L, R].forEach((A, i) => { const s = i ? -1 : 1;
    const b = cv(256, 96, (g) => { g.strokeStyle = '#2e1a10'; g.lineCap = 'round'; g.lineWidth = 44; g.beginPath(); g.moveTo(30, 70 - s * 18); g.quadraticCurveTo(128, 6, 226, 70 + s * 18); g.stroke(); });
    const m = T.decal({ ...A, cv: A.cv + 0.036 }, 0.042, 0.016, 6, 3, 'kaiBrow'); m.material = T.decalMat(b); m.renderOrder = 3; add.push(m); });
  // 3) glasses: 3D frame parented to the Head bone (local = anchor space)
  const head = T.head, frameMat = new THREE.MeshStandardMaterial({ color: '#1d1512', roughness: 0.45, metalness: 0 });
  const G = new THREE.Group(); head.add(G);
  const lensC = [];
  for (const A of [L, R]) {
    const c = V3(A.c).addScaledVector(V3(A.n), P.frame === 'round' ? 0.017 : 0.011), nn = V3(A.n).normalize().lerp(n, 0.6).normalize();
    const g = new THREE.Group(); g.position.copy(c); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nn); G.add(g);
    if (P.frame === 'round') { const t = new THREE.Mesh(new THREE.TorusGeometry(P.frameR, P.tube, 12, 48), frameMat); g.add(t); }
    else { const s = P.frameR, sh = new THREE.Shape(); sh.absarc(0, 0, 0, 0, 0); const o = new THREE.Shape(), r = 0.009, w = s + P.tube, h = s * 0.78 + P.tube;
      o.moveTo(-w + r, -h); o.lineTo(w - r, -h); o.quadraticCurveTo(w, -h, w, -h + r); o.lineTo(w, h - r); o.quadraticCurveTo(w, h, w - r, h); o.lineTo(-w + r, h); o.quadraticCurveTo(-w, h, -w, h - r); o.lineTo(-w, -h + r); o.quadraticCurveTo(-w, -h, -w + r, -h);
      const hole = new THREE.Path(), wi = s - P.tube * 0.6, hi = s * 0.78 - P.tube * 0.6, ri = 0.007;
      hole.moveTo(-wi + ri, -hi); hole.lineTo(wi - ri, -hi); hole.quadraticCurveTo(wi, -hi, wi, -hi + ri); hole.lineTo(wi, hi - ri); hole.quadraticCurveTo(wi, hi, wi - ri, hi); hole.lineTo(-wi + ri, hi); hole.quadraticCurveTo(-wi, hi, -wi, hi - ri); hole.lineTo(-wi, -hi + ri); hole.quadraticCurveTo(-wi, -hi, -wi + ri, -hi);
      o.holes.push(hole); const m = new THREE.Mesh(new THREE.ExtrudeGeometry(o, { depth: 0.005, bevelEnabled: true, bevelSize: 0.0012, bevelThickness: 0.0012, bevelSegments: 3, curveSegments: 6 }), frameMat); m.position.z = -0.0025; g.add(m); }
    if (P.glare) {          // opaque anime glare lens: pale blue-white, two diagonal white streaks
      const tex = new THREE.CanvasTexture(cv(256, 256, (q) => { const gr = q.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#bcd6f2'); q.fillStyle = gr; q.beginPath(); q.arc(128, 128, 128, 0, 7); q.fill();
        q.save(); q.clip(); q.fillStyle = 'rgba(255,255,255,0.95)'; q.translate(128, 128); q.rotate(-0.7); q.fillRect(-150, -62, 300, 38); q.fillRect(-150, -6, 300, 16); q.restore(); }));
      tex.colorSpace = THREE.SRGBColorSpace;
      const lens = new THREE.Mesh(new THREE.CircleGeometry(P.frameR, 40), new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.55, roughness: 0.3 })); g.add(lens);
    }
    lensC.push(c);
  }
  // bridge between the lenses
  const dir = lensC[1].clone().sub(lensC[0]).normalize(), a = lensC[0].clone().addScaledVector(dir, P.frameR), b = lensC[1].clone().addScaledVector(dir, -P.frameR);
  const br = new THREE.Mesh(new THREE.CylinderGeometry(P.tube * 0.9, P.tube * 0.9, a.distanceTo(b), 10), frameMat);
  br.position.copy(a).add(b).multiplyScalar(0.5).addScaledVector(up, 0.003); br.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); G.add(br);
  G.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  // 4) mouth bigger; skin flatter (self-lit by its own texture)
  MOUTH.SIZE *= P.mouthK;
  if (P.flat) { const m = T.skinned.material; m.emissive = new THREE.Color('#ffffff'); m.emissiveMap = m.map; m.emissiveIntensity = P.flat; m.roughness = 1; m.needsUpdate = true; }
  return { headScale: P.head, mouth: P.mouth, add, glasses: G };
}
// after posing: bigger head (scales hair, headband, face decals and glasses together)
export function scaleHead(K, s) { K.bones.Head?.scale.setScalar(s); K.root.updateMatrixWorld(true); }
