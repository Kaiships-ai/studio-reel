// kai-talk.js: talking mouth + blink overlay for Kai's own Tripo "Blocky Kai" (assets/blocky-kai-talk.glb = the original GLB
// with the baked mouth line and pupils painted out by scripts/paint_face.py). Decals are flat planes parented to
// mixamorig:Head at the measured spots (src/kai-talk-anchors.js), lit by the scene like the face, so they ride every clip.
//   import { addTalkRig, voMouth } from './kai-talk.js';
//   const talk = addTalkRig(gltf.scene, { renderer });       // call in the reference pose (agree t = 0); skinned decals
//   talk.set({ shape: 'open', open: 0.8, blink: 0 });        // shape: closed small open wide O · open 0..1 · blink 0..1
//   talk.set(voMouth(t, VO_WORDS, ENV));                     // drive from VO word timings + per-frame loudness (src/vo_env.js)
//   talk.set({ ...voMouth(t, VO_WORDS, ENV), blink: blinkAt(t, [0.25, 3.3]) });
import * as THREE from 'three';
import { ANCHORS } from './kai-talk-anchors.js';

export const MOUTH = { PW: 0.07, PH: 0.035, LIFT: 0.0007, SIZE: 1.15, OPEN_MIN: 0.11, SMALL_MAX: 0.4, LEAD_F: 1, RELEASE: 0.6 };
export const SHAPES = ['closed', 'small', 'open', 'wide', 'O'];
const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
const COL = { lip: rgb(ANCHORS.mouth.col), in: '#2a0f0c', tongue: '#a8433b', teeth: '#f3ece2', pupil: rgb(ANCHORS.pupilL.col) };

// one canvas per mouth shape, drawn in metres on a PW × PH plane (512 × 256 px)
function shapeCanvas(name) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const g = cv.getContext('2d');
  const X = (x) => (x / MOUTH.PW + 0.5) * 512, Y = (y) => (0.5 - y / MOUTH.PH) * 256, S = 512 / MOUTH.PW;
  g.lineCap = 'round'; g.lineJoin = 'round';
  const inner = (path, teeth, tongue) => {
    g.save(); path(); g.fillStyle = COL.in; g.fill(); g.clip();
    if (teeth) { g.fillStyle = COL.teeth; g.fillRect(0, 0, 512, Y(teeth)); }
    if (tongue) { g.fillStyle = COL.tongue; g.beginPath(); g.ellipse(X(0), Y(tongue[0]), tongue[1] * S, tongue[2] * S, 0, 0, Math.PI * 2); g.fill(); }
    g.restore(); path(); g.strokeStyle = COL.lip; g.lineWidth = 0.0018 * S; g.stroke();
  };
  if (name === 'closed') {          // morphy-clone: neutral flat line (was the baked smile): 3.6 cm wide, 2.2 mm stroke, no corner lift
    g.strokeStyle = COL.lip; g.lineWidth = 0.0022 * S; g.beginPath(); g.moveTo(X(-0.018), Y(-0.0005)); g.quadraticCurveTo(X(0), Y(-0.0012), X(0.018), Y(-0.0005)); g.stroke();
  } else if (name === 'small') {
    inner(() => { g.beginPath(); g.ellipse(X(0), Y(-0.001), 0.011 * S, 0.0045 * S, 0, 0, Math.PI * 2); }, 0, [-0.004, 0.006, 0.003]);
  } else if (name === 'open') {     // D shape: flat top with teeth, round bottom with tongue
    inner(() => { g.beginPath(); g.moveTo(X(-0.018), Y(0.004)); g.quadraticCurveTo(X(0), Y(0.006), X(0.018), Y(0.004)); g.quadraticCurveTo(X(0.017), Y(-0.013), X(0), Y(-0.013)); g.quadraticCurveTo(X(-0.017), Y(-0.013), X(-0.018), Y(0.004)); g.closePath(); }, 0.0015, [-0.011, 0.011, 0.005]);
  } else if (name === 'wide') {     // ee / i: wide, short, teeth showing
    inner(() => { g.beginPath(); g.roundRect(X(-0.023), Y(0.004), 0.046 * S, 0.011 * S, 0.004 * S); }, -0.001, 0);
  } else if (name === 'O') {
    inner(() => { g.beginPath(); g.ellipse(X(0), Y(-0.003), 0.0085 * S, 0.0105 * S, 0, 0, Math.PI * 2); }, 0, [-0.01, 0.006, 0.004]);
  }
  return cv;
}
function pupilCanvas() {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = COL.pupil; g.beginPath(); g.roundRect(4, 4, 120, 120, 34); g.fill(); return cv;
}
const decalMat = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.center.set(0.5, 0.5);
  return new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: 0.85, metalness: 0, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }); };

// ---- skinning helpers (R1): a decal vertex copies the nearest skin vertex's joints/weights and is stored in bind space
const _m = new THREE.Matrix4(), _b = new THREE.Matrix4();
function skinMatrix(skinned, j, out) {            // world = matrixWorld · bindMatrixInverse · Σ w·(bone.matrixWorld · boneInverse) · bindMatrix
  const sk = skinned.skeleton, si = skinned.geometry.attributes.skinIndex, sw = skinned.geometry.attributes.skinWeight; _m.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  for (let k = 0; k < 4; k++) { const w = sw.getComponent(j, k); if (!w) continue; const bi = si.getComponent(j, k);
    _b.multiplyMatrices(sk.bones[bi].matrixWorld, sk.boneInverses[bi]); for (let e = 0; e < 16; e++) _m.elements[e] += w * _b.elements[e]; }
  return out.copy(skinned.matrixWorld).multiply(skinned.bindMatrixInverse).multiply(_m).multiply(skinned.bindMatrix);
}
// GPU world-position map of the skin seen along -n from just in front of a spot (conform decals onto the faceted face)
const WPMAT = new THREE.ShaderMaterial({ vertexShader: `#include <common>
#include <skinning_pars_vertex>
varying vec3 vW; void main(){
  #include <skinbase_vertex>
  #include <begin_vertex>
  #include <skinning_vertex>
  vec4 wp = modelMatrix * vec4(transformed, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
  fragmentShader: `varying vec3 vW; void main(){ gl_FragColor = vec4(vW, 1.); }`, side: THREE.DoubleSide });
function wpMap(renderer, skinned, center, n, up, half, R = 256) {
  const cam = new THREE.OrthographicCamera(-half, half, half, -half, 0.003, 0.03); cam.position.copy(center).addScaledVector(n, 0.012); cam.up.copy(up); cam.lookAt(center); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  let top = skinned; while (top.parent) top = top.parent;
  const hid = []; top.traverse(o => { if ((o.isMesh || o.isLight) && o !== skinned && o.visible) { hid.push(o); o.visible = false; } });
  const m0 = skinned.material, bg = top.background, rt = new THREE.WebGLRenderTarget(R, R, { type: THREE.FloatType }), tm = renderer.toneMapping;
  skinned.material = WPMAT; top.background = null; renderer.toneMapping = THREE.NoToneMapping;
  renderer.setRenderTarget(rt); renderer.setClearColor(0, 0); renderer.clear(); renderer.render(top, cam); renderer.setRenderTarget(null);
  const buf = new Float32Array(R * R * 4); renderer.readRenderTargetPixels(rt, 0, 0, R, R, buf); rt.dispose();
  skinned.material = m0; top.background = bg; renderer.toneMapping = tm; hid.forEach(o => o.visible = true);
  return (p) => { const q = p.clone().project(cam), x = Math.round((q.x + 1) / 2 * (R - 1)), y = Math.round((q.y + 1) / 2 * (R - 1));
    if (x < 0 || y < 0 || x >= R || y >= R) return null; const i = (y * R + x) * 4; return buf[i + 3] > 0 ? new THREE.Vector3(buf[i], buf[i + 1], buf[i + 2]) : null; };
}

// root must be in the reference pose (agree, t = 0: where the anchors were measured) when this runs
export function addTalkRig(root, { renderer }) {
  let head = null, skinned = null; root.traverse(o => { if (o.isBone && /Head$/.test(o.name)) head = o; if (o.isSkinnedMesh) skinned = o; });
  if (!head || !skinned) throw new Error('kai-talk: no Head bone / skinned mesh');
  root.updateMatrixWorld(true);
  const pos = skinned.geometry.attributes.position, NV = pos.count, VW = new Float32Array(NV * 3), v = new THREE.Vector3();
  for (let i = 0; i < NV; i++) { skinned.getVertexPosition(i, v); v.applyMatrix4(skinned.matrixWorld); VW[i * 3] = v.x; VW[i * 3 + 1] = v.y; VW[i * 3 + 2] = v.z; }
  const nearest = (p) => { let b = 1e9, bi = 0; for (let i = 0; i < NV; i++) { const dx = VW[i * 3] - p.x, dy = VW[i * 3 + 1] - p.y, dz = VW[i * 3 + 2] - p.z, d = dx * dx + dy * dy + dz * dz; if (d < b) { b = d; bi = i; } } return bi; };
  const hq = head.matrixWorld, nq = new THREE.Matrix3().getNormalMatrix(hq), track = [];
  function decal(a, w, h, sx, sy, name) {
    const n = new THREE.Vector3(...a.n).applyMatrix3(nq).normalize(), r = new THREE.Vector3(...a.right).applyMatrix3(nq).normalize(), u = new THREE.Vector3(...a.up).applyMatrix3(nq).normalize();
    const c = new THREE.Vector3(...a.c).applyMatrix4(hq).addScaledVector(r, a.cu).addScaledVector(u, a.cv);
    const look = wpMap(renderer, skinned, c, n, u, Math.max(w, h) * 0.6);
    const g = new THREE.PlaneGeometry(w, h, sx, sy), gp = g.attributes.position, idx = new Uint16Array(gp.count * 4), wt = new Float32Array(gp.count * 4), S = new THREE.Matrix4(), inv = new THREE.Matrix4();
    const si = skinned.geometry.attributes.skinIndex, sw = skinned.geometry.attributes.skinWeight, flat = [];
    for (let i = 0; i < gp.count; i++) {
      const P = c.clone().addScaledVector(r, gp.getX(i)).addScaledVector(u, gp.getY(i)), hit = look(P);
      if (hit) P.copy(hit).addScaledVector(n, MOUTH.LIFT); else P.addScaledVector(n, MOUTH.LIFT);
      const j = nearest(P); for (let k = 0; k < 4; k++) { idx[i * 4 + k] = si.getComponent(j, k); wt[i * 4 + k] = sw.getComponent(j, k); }
      inv.copy(skinMatrix(skinned, j, S)).invert(); const B = P.clone().applyMatrix4(inv); gp.setXYZ(i, B.x, B.y, B.z); flat.push(!hit);
      if ([0, sx, gp.count - 1 - sx, gp.count - 1, Math.floor(gp.count / 2)].includes(i)) track.push({ name, i, j, d0: P.distanceTo(new THREE.Vector3(VW[j * 3], VW[j * 3 + 1], VW[j * 3 + 2])) });
    }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wt, 4)); g.computeVertexNormals();
    const m = new THREE.SkinnedMesh(g, null); m.name = name; m.renderOrder = 2; m.frustumCulled = false;
    m.position.copy(skinned.position); m.quaternion.copy(skinned.quaternion); m.scale.copy(skinned.scale); skinned.parent.add(m); m.bind(skinned.skeleton, skinned.bindMatrix);
    m.userData.missed = flat.filter(Boolean).length; track.forEach(t => { if (t.name === name) t.mesh = m; });
    return m;
  }
  const texs = {}; for (const s of SHAPES) texs[s] = decalMat(shapeCanvas(s)).map;
  const mouth = decal(ANCHORS.mouth, MOUTH.PW, MOUTH.PH, 14, 7, 'mouth');
  mouth.material = new THREE.MeshStandardMaterial({ map: texs.closed, transparent: true, depthWrite: false, roughness: 0.85, metalness: 0, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const pupils = ['pupilL', 'pupilR'].map(k => { const m = decal(ANCHORS[k], ANCHORS[k].w, ANCHORS[k].h, 4, 4, k); m.material = decalMat(pupilCanvas()); return m; });
  const state = { shape: 'closed', open: 0, blink: 0 };
  function set(o = {}) {
    Object.assign(state, o);
    const e = state.open, s = state.shape, t = texs[s];
    if (mouth.material.map !== t) { mouth.material.map = t; mouth.material.needsUpdate = true; }
    // like the coded blocky mouth: opening = taller + a little narrower (O narrows more); texture scale about the centre
    const kx = s === 'closed' ? 1 : (1 - (s === 'O' ? 0.3 : 0.15) * e) * MOUTH.SIZE, ky = s === 'closed' ? 1 : (0.55 + 0.6 * e) * MOUTH.SIZE;
    t.repeat.set(1 / kx, 1 / ky);
    for (const p of pupils) p.material.map.repeat.set(1, 1 / Math.max(0.1, 1 - 0.9 * state.blink));
  }
  set();
  const _a = new THREE.Vector3(), _c = new THREE.Vector3();
  // attachment error now: max change (m) of the distance from each tracked decal vertex to the skin vertex it copies
  const attachError = () => Math.max(...track.map(t => Math.abs(t.mesh.getVertexPosition(t.i, _a).applyMatrix4(t.mesh.matrixWorld).distanceTo(skinned.getVertexPosition(t.j, _c).applyMatrix4(skinned.matrixWorld)) - t.d0)));
  return { head, mouth, pupils, set, state, track, attachError, decals: [mouth, ...pupils] };
}

// VO → mouth: loudness picks how open (attack 1 frame early, slow release), the current word's vowel picks the shape
const VOWEL = { i: 'open', asked: 'open', claude: 'O', to: 'O', fix: 'wide', one: 'O', tiny: 'open', bug: 'open' };
function wordShape(w) { const k = w.toLowerCase().replace(/[^a-z]/g, ''); if (VOWEL[k]) return VOWEL[k];
  return /oo|ou|o|u|w/.test(k) ? 'O' : /ee|ea|i|y/.test(k) ? 'wide' : 'open'; }
function rawMouth(f, words, env, fps) {
  const at = (i) => env[Math.min(env.length - 1, Math.max(0, i))] ?? 0;
  const open = Math.max(at(f + MOUTH.LEAD_F), MOUTH.RELEASE * at(f));
  if (open < MOUTH.OPEN_MIN) return { shape: 'closed', open: 0 };
  const tl = (f + MOUTH.LEAD_F) / fps, w = words.find(x => tl >= x.s - 0.03 && tl <= x.e + 0.03) || words.reduce((b, x) => Math.abs(x.s - tl) < Math.abs(b.s - tl) ? x : b, words[0]);
  const shp = wordShape(w.w);
  return { shape: open < MOUTH.SMALL_MAX && shp !== 'O' ? 'small' : shp, open };
}
// R2 hold rule: no shape lives a single frame. The whole line is filtered once, left to right (a 1-frame shape takes the
// previous frame's shape), and cached per (words, env), so voMouth stays a pure function of t.
const _seq = new WeakMap();
function mouthSeq(words, env, fps) {
  let c = _seq.get(env); if (c && c.words === words) return c.seq;
  const n = env.length + 4, seq = Array.from({ length: n }, (_, f) => rawMouth(f, words, env, fps));
  for (let i = 1; i < n - 1; i++) if (seq[i].shape !== seq[i - 1].shape && seq[i].shape !== seq[i + 1].shape) {
    const s = seq[i - 1].shape; seq[i] = { shape: s, open: s === 'closed' ? 0 : Math.max(seq[i].open, MOUTH.OPEN_MIN) }; }
  _seq.set(env, { words, seq }); return seq;
}
export function voMouth(t, words, env, fps = 30) {
  const f = Math.round(t * fps), seq = mouthSeq(words, env, fps);
  return f >= 0 && f < seq.length ? seq[f] : { shape: 'closed', open: 0 };
}
// blink 0..1 around each time in `times` (close 2 f, open 4 f, like the coded blocky Kai)
export function blinkAt(t, times, fps = 30) {
  let b = 0; for (const t0 of times) { const f = (t - t0) * fps; if (f > -2 && f <= 0) b = Math.max(b, (f + 2) / 2); else if (f > 0 && f < 4) b = Math.max(b, 1 - f / 4); }
  return b;
}
