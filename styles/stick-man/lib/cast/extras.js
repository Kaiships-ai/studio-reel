// Extra cast for the street: three passers-by, a police officer, Kai dyed red. Specs for makeStick() from
// engine/cast.js as it is; the new hats are built here the same way cast.js builds its own (solid + ink hull).
//   const S = makeStick(PASSERS[0]);  dye(S, k) recolours a live figure (head first, then body, then limbs).
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon, lin, INK_RGB } from '../../engine/look.js';
import { KAI, W_M, HEAD_H, hairCap, guardCap, curls, bandana } from '../../engine/cast.js';

const W = W_M, HA = 0.5 * W, HB = 0.5 * HEAD_H * W, INK_T = 0.036 * W, DEG = Math.PI / 180;
const hullMat = new THREE.MeshBasicMaterial({ color: lin(...INK_RGB), side: THREE.BackSide });
function hullGeo(geo, t) {
  let g = geo.clone();
  for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);
  g = mergeVertices(g, 1e-5); g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * t, p.getY(i) + n.getY(i) * t, p.getZ(i) + n.getZ(i) * t);
  return g;
}
function solid(geo, mat, t = INK_T) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
  const h = new THREE.Mesh(hullGeo(geo, t), hullMat); h.castShadow = false; m.add(h); return m;
}
function lathe(profile, seg = 64) { const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), seg); g.rotateY(Math.PI); return g; }
// dome over the head from latitude lat0 up to the crown, `out` metres off the head surface
function dome(lat0, out) {
  const pr = [[0, -0.2 * W]];
  for (let i = 0; i <= 16; i++) { const la = (lat0 + (90 - lat0) * i / 16) * DEG; pr.push([(HA + out) * Math.cos(la), (HB + out) * Math.sin(la)]); }
  return lathe(pr, 48);
}
const flat = col => toon(col, { shade: [0.80, 0.76, 0.92], sheen: 0.1, rough: 0.8, rim: 0.15 });

// knitted beanie with a folded cuff and a pom-pom
export function beanie(col = [0.95, 0.60, 0.10], pom = [1, 1, 1], tilt = 10) {
  return () => {
    const g = new THREE.Group(); g.rotation.x = -tilt * DEG;
    g.add(solid(dome(14, 0.035 * W), flat(col)));
    const cuff = []; for (let i = 0; i <= 8; i++) { const la = (8 + 22 * i / 8) * DEG; cuff.push([(HA + 0.075 * W) * Math.cos(la), (HB + 0.06 * W) * Math.sin(la)]); }
    cuff.push([HA * Math.cos(30 * DEG), HB * Math.sin(30 * DEG)], [HA * Math.cos(8 * DEG), HB * Math.sin(8 * DEG)], cuff[0]);
    g.add(solid(lathe(cuff), flat(col.map(c => c * 0.78))));
    const p = solid(new THREE.SphereGeometry(0.11 * W, 20, 14), flat(pom)); p.position.set(0, HB + 0.12 * W, 0); g.add(p);
    return g;
  };
}
// wide-brim sun hat with a ribbon
export function sunHat(col = [0.95, 0.80, 0.46], ribbon = [0.10, 0.18, 0.45], tilt = 8) {
  return () => {
    const g = new THREE.Group(); g.rotation.x = -tilt * DEG;
    const y = HB * Math.sin(22 * DEG), rIn = HA * Math.cos(22 * DEG) + 0.03 * W, R = 0.95 * W;
    g.add(solid(dome(22, 0.05 * W), flat(col)));
    const band = []; for (let i = 0; i <= 8; i++) { const la = (22 + 14 * i / 8) * DEG; band.push([(HA + 0.065 * W) * Math.cos(la), (HB + 0.065 * W) * Math.sin(la)]); }
    band.push([HA * Math.cos(36 * DEG), HB * Math.sin(36 * DEG)], [HA * Math.cos(22 * DEG), HB * Math.sin(22 * DEG)], band[0]);
    g.add(solid(lathe(band), flat(ribbon)));
    const brim = lathe([[rIn, y + 0.01 * W], [R, y - 0.05 * W], [R, y - 0.075 * W], [rIn, y - 0.02 * W], [rIn, y + 0.01 * W]], 64);
    g.add(solid(brim, flat(col.map(c => c * 0.95))));
    return g;
  };
}
// short cap of hair plus a round bun on the crown
export function bun(col = [0.16, 0.09, 0.05], tilt = 16) {
  const cap = hairCap(col, tilt);
  return () => {
    const g = cap();
    const b = solid(new THREE.SphereGeometry(0.20 * W, 24, 16), toon(col, { shade: [0.82, 0.79, 0.93], sheen: 0, rough: 1, rim: 0.12 }));
    b.position.set(0, HB + 0.10 * W, -0.22 * W); g.add(b);
    return g;
  };
}

// ---------------------------------------------------------------- specs
export const MABEL = { name: 'Mabel', shirt: [0.80, 0.74, 0.96], hair: [sunHat()], clothes: [{ vest: [0.18, 0.52, 0.56] }] };
export const OTIS = { name: 'Otis', shirt: [0.64, 0.80, 0.96], hair: [beanie([0.96, 0.62, 0.10])],
  clothes: [{ tie: [0.08, 0.12, 0.36], stripe: [0.80, 0.86, 1.0] }] };
export const JUNE = { name: 'June', shirt: [0.74, 0.94, 0.82], glasses: true, hair: [bun()], clothes: [{ vest: [0.44, 0.16, 0.34] }] };
export const PASSERS = [MABEL, OTIS, JUNE];
export const OFFICER = { name: 'Officer', shirt: [0.44, 0.60, 0.90], hair: [guardCap([0.04, 0.06, 0.16])],
  clothes: [{ tie: [0.04, 0.06, 0.16], stripe: [0.04, 0.06, 0.16] }, { uniform: { seam: [0.16, 0.26, 0.52] } }] };
// static red versions (when a live recolour is not wanted)
export const KAI_HALF_RED = { ...KAI, name: 'Kai half red', skin: [1.0, 0.50, 0.48], shirt: [1.0, 0.55, 0.52],
  hair: [curls([0.42, 0.10, 0.05]), bandana()], clothes: [{ vest: [0.95, 0.16, 0.05], strap: [0.30, 0.20, 0.08] }] };
export const KAI_RED = { ...KAI, name: 'Kai red', skin: [0.95, 0.10, 0.09], shirt: [0.92, 0.12, 0.10],
  hair: [curls([0.36, 0.03, 0.02]), bandana([0.70, 0.02, 0.03])], clothes: [{ vest: [0.70, 0.04, 0.03], strap: [0.30, 0.02, 0.02] }] };

// ---------------------------------------------------------------- live dye: recolour a figure made by makeStick
// dye(S, k): k 0..1. Head and hair go red first (k 0..0.5), then the torso (0.3..0.8), then limbs (0.6..1.0).
// Works on the figure's own toon materials; limbs get their own material the first time (the ink one is shared).
const DYE_TINT = [1.0, 0.10, 0.09], LIMB_RED = [0.36, 0.01, 0.02];
const ease = x => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
export function dye(S, k) {
  let D = S.root.userData.dye;
  if (!D) {
    D = S.root.userData.dye = { head: [], torso: [], limbs: [] };
    const headGroup = S.parts.head.parent, seen = new Set();
    S.root.traverse(o => {
      if (!o.isMesh || !o.material?.userData?.toon || seen.has(o.material)) return;
      seen.add(o.material);
      let p = o, inHead = false; while (p) { if (p === headGroup) { inHead = true; break; } p = p.parent; }
      (inHead ? D.head : D.torso).push({ m: o.material, c0: o.material.color.clone() });
    });
    const ink = lin(...INK_RGB);
    for (const o of S.root.children) {
      if (!o.isMesh || !o.material?.isMeshBasicMaterial || o.material.transparent || !o.material.color.equals(ink)) continue;
      if (!D.limbMat) D.limbMat = o.material.clone();
      o.material = D.limbMat;
    }
  }
  const tint = (list, kk) => { for (const e of list) e.m.color.setRGB(e.c0.r * (1 + (DYE_TINT[0] - 1) * kk), e.c0.g * (1 + (DYE_TINT[1] - 1) * kk), e.c0.b * (1 + (DYE_TINT[2] - 1) * kk)); };
  tint(D.head, ease(k / 0.5)); tint(D.torso, ease((k - 0.3) / 0.5));
  if (D.limbMat) D.limbMat.color.copy(lin(...INK_RGB)).lerp(lin(...LIMB_RED), ease((k - 0.6) / 0.4));
  return S;
}

// ---------------------------------------------------------------- hand props (origin at the grip; caller marks them with stage.prop)
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// folded newspaper held by its bottom edge, front page facing +z
export function newspaper() {
  const g = new THREE.Group();
  const map = canvasTex(256, 360, (c, w, h) => {
    c.fillStyle = 'rgb(240,238,228)'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgb(28,28,32)'; c.font = 'bold 30px Georgia, serif'; c.textAlign = 'center'; c.fillText('THE HALDEN POST', w / 2, 40);
    c.fillRect(14, 52, w - 28, 4); c.font = 'bold 36px Georgia, serif'; c.fillText('RAIN? NOT', w / 2, 100); c.fillText('TODAY', w / 2, 140);
    c.fillStyle = 'rgb(150,150,156)'; c.fillRect(18, 160, 106, 90);
    for (let y = 165; y < h - 14; y += 12) { c.fillStyle = 'rgb(120,120,126)'; c.fillRect(y < 255 ? 134 : 18, y, y < 255 ? 104 : w - 36, 4); }
  });
  const paper = new THREE.MeshStandardMaterial({ color: lin(0.86, 0.85, 0.80), roughness: 0.9 }), front = new THREE.MeshStandardMaterial({ map, roughness: 0.9 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.012), [paper, paper, paper, paper, front, paper]);
  m.position.set(0, 0.15, 0); m.castShadow = m.receiveShadow = true; g.add(m);
  return g;
}
// paper shopping bag hanging from its handles (origin at the top of the handles)
export function shoppingBag(col = [0.72, 0.50, 0.30]) {
  const g = new THREE.Group(), kraft = new THREE.MeshStandardMaterial({ color: lin(...col), roughness: 0.9 });
  const label = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = `rgb(${col.map(v => Math.round(255 * Math.pow(v, 1 / 2.2))).join(',')})`; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgb(176,64,82)'; c.beginPath(); c.arc(w / 2, h * 0.52, 70, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgb(250,246,236)'; c.font = 'bold 34px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('LARKSPUR', w / 2, h * 0.52);
  });
  const face = new THREE.MeshStandardMaterial({ map: label, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.32, 0.14), [kraft, kraft, kraft, kraft, face, kraft]);
  body.position.set(0, -0.12 - 0.16, 0); body.castShadow = body.receiveShadow = true; g.add(body);
  const hm = new THREE.MeshStandardMaterial({ color: lin(0.20, 0.10, 0.05), roughness: 0.8 });
  for (const z of [0.05, -0.05]) {
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.008, 6, 20, Math.PI), hm); h.position.set(0, -0.12, z); h.castShadow = true; g.add(h);
  }
  return g;
}
