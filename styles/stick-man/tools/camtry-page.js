// The picture half of "thử góc máy": the film's own engine renders each frame (sets, cast, sky, air, bloom, grade, lens
// blur) and this page only swaps the camera for a variant's, then measures the variant against the set's walls.
// Places are Blender metres [x, y, z] (z up); three.js is [x, z, -y]. Driven by camtry.mjs through window.__ct.
import * as THREE from 'three';
import { boot } from '/styles/stick-man/engine/play.js';

const Q = new URLSearchParams(location.search), W = Number(Q.get('w') || 540), H = Number(Q.get('h') || 960);
const reel = await boot({ film: Q.get('film'), width: W, height: H });
const { stage } = reel, cam = stage.camera, scene = stage.scene, gl = stage.renderer.domElement;
document.getElementById('view').append(gl);
const T3 = p => new THREE.Vector3(p[0], p[2] ?? 0, -p[1]);

// the camera override: the variant's lens position and aim for every render the engine makes this frame; the film
// camera comes back after each, so the engine's next frame starts as the film
let over = null;
const kitRender = stage.render;
stage.render = (o = {}) => {
  if (!over) return kitRender(o);
  const pos = cam.position.clone(), q = cam.quaternion.clone(), up = cam.up.clone();
  cam.position.copy(T3(over.pos)); cam.up.set(0, 1, 0); cam.lookAt(T3(over.aim)); cam.updateMatrixWorld();
  try { return kitRender(o); } finally { cam.position.copy(pos); cam.quaternion.copy(q); cam.up.copy(up); cam.updateMatrixWorld(); }
};

const dbg = f => JSON.parse(window.__dbg(f));
// the subject: the lead (else the first actor in frame); head and lowest foot in Blender metres
function subjectOf(D) {
  const as = Object.values(D.actors).filter(a => a.headW && a.inFrame !== false), a = as.find(x => x.lead) ?? as[0];
  if (!a) return null;
  const foot = Math.min(a.feet?.L?.[2] ?? a.headW[2] - 1.6, a.feet?.R?.[2] ?? a.headW[2] - 1.6);
  return { head: a.headW, foot: [a.headW[0], a.headW[1], foot], aim: [a.headW[0], a.headW[1], (a.headW[2] + foot) / 2] };
}
function film(A, B) {
  const out = {};
  for (let f = A; f <= B; f++) { const D = dbg(f); out[f] = { pos: D.camera.pos, aim: D.camera.target, fov: D.camera.fov, subject: subjectOf(D) }; }
  return out;
}

// ---- walls: static meshes of the set (same place at the range's first, middle and last frame, visible in the middle,
// not a sky dome or box), copied as double-sided proxies so a ray from inside a building still hits it
let proxies = [], buildings = [];
const shown = m => { for (let p = m; p; p = p.parent) if (!p.visible) return false; const mt = m.material; return !Array.isArray(mt) && !(mt?.visible === false || (mt?.transparent && mt.opacity < 0.05)); };
function setup(A, B, pose) {
  const snaps = [];
  for (const f of [A, B, pose]) { dbg(f); scene.updateMatrixWorld(true); const s = new Map(); scene.traverse(m => { if (m.isMesh) s.set(m, m.matrixWorld.clone()); }); snaps.push(s); }
  const dbl = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  proxies = []; buildings = [];
  scene.traverse(m => {
    if (!m.isMesh || m.isInstancedMesh || m.isSkinnedMesh || !m.geometry?.attributes?.position || !shown(m)) return;
    if (!snaps.every(s => s.get(m)?.equals(snaps[2].get(m)))) return;
    const box = new THREE.Box3().setFromObject(m), s = box.getSize(new THREE.Vector3());
    if (box.max.y < 0.25 || !isFinite(s.x)) return;                         // ground, road, kerb paint
    if (s.y > 60 || Math.min(s.x, s.z) > 80) return;                         // a sky dome or sky box
    const p = new THREE.Mesh(m.geometry, dbl); p.matrixAutoUpdate = false; p.matrix.copy(m.matrixWorld); p.matrixWorld.copy(m.matrixWorld);
    const name = [m.name, m.parent?.name].filter(Boolean).join(' < ') || 'mesh';
    p.userData = { building: s.y > 2 && box.max.y > 2.5 && Math.max(s.x, s.z) > 1.5, name, top: +box.max.y.toFixed(2), box };
    proxies.push(p); if (p.userData.building) buildings.push(p);
  });
  return { proxies: proxies.length, buildings: buildings.length };
}

const rc = new THREE.Raycaster();
const near = (o, r) => buildings.filter(p => p.userData.box.distanceToPoint(o) < r);
// the horizontal direction off the nearest wall (32 rays, 12 m), Blender [x, y]; null when no wall is that close
function offWall(pos) {
  const o = T3(pos), bl = near(o, 12); let best = null;
  for (let k = 0; k < 32; k++) { const a = k / 32 * Math.PI * 2, d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    rc.set(o, d); rc.far = 12; const h = rc.intersectObjects(bl, false)[0]; if (h && (!best || h.distance < best.d)) best = { d: h.distance, dir: d }; }
  return best ? [-best.dir.x, best.dir.z] : null;
}

const sphere = Array.from({ length: 64 }, (_, i) => { const y = 1 - 2 * (i + 0.5) / 64, r = Math.sqrt(1 - y * y), a = i * 2.39996; return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r); });
const axes = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [1, 0, 1]].map(a => new THREE.Vector3(...a).normalize());
const pc = new THREE.PerspectiveCamera(40, W / H, 0.1, 80);
// one variant camera against the walls: nearest wall (64 rays, 15 m), inside a building (ray parity), the share of an
// 18 x 32 ray grid through the frame that hits a building closer than 4 m (wall fill) or at all (facade), the subject's
// height on screen
function metric(c, subject) {
  const o = T3(c.pos), loc = proxies.filter(p => p.userData.box.distanceToPoint(o) < 30), bl = loc.filter(p => p.userData.building);
  let minD = 99, who = '', top = 0;
  for (const d of sphere) { rc.set(o, d); rc.far = 15; const h = rc.intersectObjects(bl, false)[0]; if (h && h.distance < minD) { minD = h.distance; who = h.object.userData.name; top = h.object.userData.top; } }
  let odd = 0; for (const d of axes) { rc.set(o, d); rc.far = 60; if (rc.intersectObjects(bl, false).length % 2) odd++; }
  const inside = odd >= 4;
  pc.fov = c.fov; pc.aspect = W / H; pc.position.copy(o); pc.up.set(0, 1, 0); pc.lookAt(T3(c.aim)); pc.updateProjectionMatrix(); pc.updateMatrixWorld();
  let wall = 0, facade = 0, n = 0;
  for (let j = 0; j < 32; j++) for (let i = 0; i < 18; i++) {
    rc.setFromCamera(new THREE.Vector2((i + 0.5) / 18 * 2 - 1, (j + 0.5) / 32 * 2 - 1), pc); rc.far = 80;
    const h = rc.intersectObjects(loc, false)[0]; n++; if (h?.object.userData.building) { facade++; if (h.distance < 4) wall++; } }
  let subjectH = null;
  if (subject) { const a = T3([...subject.head.slice(0, 2), subject.head[2] + 0.12]).project(pc), b = T3(subject.foot).project(pc);
    subjectH = a.z < 1 && b.z < 1 ? +(Math.abs(a.y - b.y) / 2).toFixed(3) : 0; }
  return { minD: +minD.toFixed(2), who, top, inside, touch: inside || minD < 0.3, wallFill: +(wall / n).toFixed(2), facade: +(facade / n).toFixed(2), subjectH, z: +c.pos[2].toFixed(2) };
}

// one film frame, every variant side by side under a label bar; a null camera renders the film's own (keeps its roll)
function tile(f, cams, labels, TW, TH, BAR) {
  const cv = document.createElement('canvas'); cv.width = TW * cams.length; cv.height = TH + BAR; const g = cv.getContext('2d');
  g.fillStyle = '#111'; g.fillRect(0, 0, cv.width, cv.height); const m = [];
  cams.forEach((c, i) => {
    over = c.keep ? null : c; window.__frame(f); over = null;
    g.drawImage(gl, i * TW, BAR, TW, TH);
    m.push(metric(c, c.subject));
    g.fillStyle = '#fff'; g.font = '600 15px -apple-system, system-ui, sans-serif'; g.fillText(labels[i], i * TW + 8, 18);
    g.font = '500 11px ui-monospace, Menlo, monospace'; g.fillStyle = m[i].touch ? '#ff6b6b' : m[i].wallFill > 0.5 ? '#ffb84d' : '#9fe3c4';
    g.fillText(`khung ${f} · cách tường ${m[i].minD > 15 ? '>15' : m[i].minD.toFixed(1)} m${m[i].touch ? ' · CHẠM' : ''}`, i * TW + 8, 34);
    if (i) { g.fillStyle = '#333'; g.fillRect(i * TW - 1, 0, 2, cv.height); }
  });
  return { img: cv.toDataURL('image/jpeg', 0.9), m };
}

// ---- top view: the set's static meshes from straight above (orthographic, no film passes), buildings lighter the taller
// they are; then the camera path (yellow, red dots where it touches a wall), the subject path (green), the start (white)
let mapScene = null;
function buildMap() {
  mapScene = new THREE.Scene();
  const lowM = new THREE.MeshBasicMaterial({ color: 0x2b3036 }), mats = new Map();
  const shade = t => { const k = Math.round(Math.min(1, t / 15) * 10); if (!mats.has(k)) mats.set(k, new THREE.MeshBasicMaterial({ color: new THREE.Color(0x4a525c).lerp(new THREE.Color(0xb8c2cc), k / 10) })); return mats.get(k); };
  for (const p of proxies) { const m = new THREE.Mesh(p.geometry, p.userData.building ? shade(p.userData.top) : lowM); m.matrixAutoUpdate = false; m.matrix.copy(p.matrix); m.renderOrder = p.userData.top; mapScene.add(m); }
}
function map(path, touch, subject, label, TW, TH, BAR) {
  if (!mapScene) buildMap();
  const pts = [...path, ...subject.filter(Boolean)], xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const half = Math.max((Math.max(...xs) - Math.min(...xs)) / 2 * TH / TW, (Math.max(...ys) - Math.min(...ys)) / 2, 10) * 1.25, hw = half * TW / TH;
  const oc = new THREE.OrthographicCamera(-hw, hw, half, -half, 0.1, 400); oc.position.set(cx, 200, -cy); oc.up.set(0, 0, -1); oc.lookAt(cx, 0, -cy); oc.updateMatrixWorld();
  const R = stage.renderer, rt = new THREE.WebGLRenderTarget(TW, TH), cc = new THREE.Color(), ca = R.getClearAlpha(); R.getClearColor(cc);
  const buf = new Uint8Array(TW * TH * 4);
  try { R.setRenderTarget(rt); R.setClearColor(0x15171a, 1); R.clear(); R.render(mapScene, oc); R.readRenderTargetPixels(rt, 0, 0, TW, TH, buf); }
  finally { R.setRenderTarget(null); R.setClearColor(cc, ca); rt.dispose(); }
  const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH + BAR; const g = cv.getContext('2d'), img = g.createImageData(TW, TH);
  for (let y = 0; y < TH; y++) img.data.set(buf.subarray((TH - 1 - y) * TW * 4, (TH - y) * TW * 4), y * TW * 4);
  g.fillStyle = '#111'; g.fillRect(0, 0, TW, BAR); g.putImageData(img, 0, BAR);
  const px = p => [(p[0] - cx + hw) / (2 * hw) * TW, BAR + (cy + half - p[1]) / (2 * half) * TH];
  const line = (P, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); let on = false; for (const p of P) { if (!p) { on = false; continue; } const q = px(p); on ? g.lineTo(...q) : g.moveTo(...q); on = true; } g.stroke(); };
  line(subject, '#4dd0a0', 2); line(path, '#ffd84d', 2.5);
  path.forEach((p, k) => { if (touch[k]) { const q = px(p); g.fillStyle = '#ff3b3b'; g.beginPath(); g.arc(q[0], q[1], 3.5, 0, 7); g.fill(); } });
  const a = px(path[0]); g.fillStyle = '#fff'; g.beginPath(); g.arc(a[0], a[1], 4, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = '600 15px -apple-system, system-ui, sans-serif'; g.fillText(label, 8, 18);
  g.font = '500 11px ui-monospace, Menlo, monospace'; g.fillStyle = '#ccc'; g.fillText('vàng máy quay · xanh nhân vật · đỏ chạm', 8, 34);
  g.fillStyle = '#ccc'; g.fillText(`${Math.round(2 * hw)} m`, TW - 44, TH + BAR - 8);
  return cv.toDataURL('image/jpeg', 0.92);
}

window.__ct = { ready: true, W, H, F: [reel.F0, reel.F1], film, setup, offWall, tile, map };
