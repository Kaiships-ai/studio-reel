// kai-tripo.js: Kai's Tripo GLB (tripo/kai-final.glb) as a drop-in 3D Kai.
// - fixes 8 stray verts skinned to `neutral_bone` (they draw black spikes once the body moves)
// - scales to our world height, toon/ink look via ink.js (baked albedo as the base colour)
// - clips are made in-place: the Hip's horizontal root motion is removed per clip and exposed as rootAt(name, t)
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { toonMat, addOutline } from './look.js';

export const CLIP = {   // our names → Tripo clip names
  idle: 'standing_relax.001', walk: 'walk.001', run: 'run.001', dive: 'dive.001', guard: 'box_02.001',
  wave: 'wave_goodbye_02.001', kick: 'front_kick_01.001', agree: 'agree.001', afraid: 'afraid.001',
};

// the Pose Studio library (poses + pose clips) → use with kai.applyPose(lib.poses.x, w) / kai.applyClip(lib.clips.y, t, w)
export async function loadKaiLibrary(url = './assets/kai/kai-library.json') { return (await fetch(url)).json(); }

export async function makeKaiTripo(url = './assets/kai/kai-final.glb', o = {}) {
  const g = await new GLTFLoader().loadAsync(url);
  const root = new THREE.Group(), model = g.scene; root.add(model);
  let mesh; model.traverse(m => { if (m.isSkinnedMesh) mesh = m; });
  const bones = {}; mesh.skeleton.bones.forEach(b => bones[b.name] = b);

  // --- skin fix: drop neutral_bone influence, borrow the nearest clean vertex's weights when it was the only one
  const geo = mesh.geometry, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, pos = geo.attributes.position;
  const nb = mesh.skeleton.bones.findIndex(b => b.name === 'neutral_bone');
  const bad = [];
  for (let v = 0; v < si.count; v++) {
    let s = 0;
    for (let k = 0; k < 4; k++) if (si.getComponent(v, k) === nb) sw.setComponent(v, k, 0); else s += sw.getComponent(v, k);
    if (s > 1e-4) for (let k = 0; k < 4; k++) sw.setComponent(v, k, sw.getComponent(v, k) / s); else bad.push(v);
  }
  const p = new THREE.Vector3(), q = new THREE.Vector3();
  for (const v of bad) {
    p.fromBufferAttribute(pos, v); let best = -1, bd = 1e9;
    for (let u = 0; u < pos.count; u++) { if (bad.includes(u)) continue; const d = q.fromBufferAttribute(pos, u).distanceToSquared(p); if (d < bd) { bd = d; best = u; } }
    for (let k = 0; k < 4; k++) { si.setComponent(v, k, si.getComponent(best, k)); sw.setComponent(v, k, sw.getComponent(best, k)); }
  }
  si.needsUpdate = sw.needsUpdate = true;

  // --- scale to world height (bind bbox is 0.977 tall)
  const H = o.height ?? 1.62; model.scale.setScalar(H / 0.977);

  // --- look
  const src = mesh.material;
  if (o.look !== 'pbr') {
    geo.setAttribute('faceUv', geo.attributes.uv);
    src.map.colorSpace = THREE.SRGBColorSpace;
    mesh.material = toonMat('#ffffff', { map: src.map, faceUv: true, mapAll: true, hiAmt: o.hiAmt ?? 0.12, hatch: o.hatch ?? 0.35,
      side: THREE.DoubleSide, tint: o.tint ?? '#a493b0', shadeK: o.shadeK ?? 1.0 });
    addOutline(mesh, o.outline ?? 1.0);
  }
  mesh.castShadow = true; mesh.frustumCulled = false;

  // --- clips: in-place + root track (horizontal Hip motion, in model space before the scale)
  const hip = bones.Hip, parentM = new THREE.Matrix4();
  hip.parent.updateWorldMatrix(true, false);
  parentM.copy(model.matrixWorld).invert().multiply(hip.parent.matrixWorld);   // Hip parent → model space
  const toModel = parentM.clone(), toLocal = parentM.clone().invert();
  const roots = {}, clips = {};
  for (const c of g.animations) {
    const tr = c.tracks.find(t => t.name === 'Hip.position');
    const T = tr.times, V = tr.values, n = T.length, keys = [];
    const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) keys.push(v.fromArray(V, i * 3).applyMatrix4(toModel).clone());
    const k0 = keys[0], drift = keys.map(k => new THREE.Vector3(k.x - k0.x, 0, k.z - k0.z));
    for (let i = 0; i < n; i++) { const k = keys[i].clone().sub(drift[i]).applyMatrix4(toLocal); k.toArray(V, i * 3); }
    roots[c.name] = { T: Array.from(T), D: drift };
    clips[c.name] = c;
  }
  const mixer = new THREE.AnimationMixer(model);
  const scale = H / 0.977;
  const rootAt = (name, t) => {   // horizontal root displacement (world units, model facing) at clip time t
    const r = roots[CLIP[name] || name], T = r.T; t = THREE.MathUtils.clamp(t, T[0], T[T.length - 1]);
    let i = 0; while (i < T.length - 2 && T[i + 1] < t) i++;
    const a = (t - T[i]) / Math.max(1e-6, T[i + 1] - T[i]);
    return r.D[i].clone().lerp(r.D[i + 1], a).multiplyScalar(scale);
  };
  // sample one clip at time t (or a weighted blend: [[name, t, w], ...])
  const actions = {}; for (const k in clips) actions[k] = mixer.clipAction(clips[k]);
  const pose = (spec) => {
    const list = Array.isArray(spec) ? spec : [[spec.clip, spec.t, 1]];
    for (const k in actions) { actions[k].stop(); }
    for (const [name, t, w] of list) { const a = actions[CLIP[name] || name]; a.reset(); a.play(); a.setEffectiveWeight(w); a.time = t; a.paused = true; }
    mixer.update(0); model.updateMatrixWorld(true);
  };
  const dur = (name) => clips[CLIP[name] || name].duration;
  // additive layer on top of the sampled clips: {bone: [x, y, z]} local-axis rotations × w (this rig: z = flex axis;
  // L_Thigh/L_Calf +z = flex forward / knee bend, R side mirrored (-z); Spine01/02 -z = bend forward)
  const add = (o, w = 1) => {
    if (w < 1e-4) return;
    for (const k in o) { const b = bones[k], [x, y, z] = o[k]; if (x) b.rotateX(x * w); if (y) b.rotateY(y * w); if (z) b.rotateZ(z * w); }
    model.updateMatrixWorld(true);
  };
  // ---- pose library (Pose Studio → tripo/library/kai-library.json)
  // pose = { q: {bone: [x,y,z,w]} (local quaternions, all bones), hip: [x,y,z], mask: [edited bones] }
  // clip = { dur, loop, keys: [{ t, ease, pose }] }   (pose inline, same shape)
  const _q = new THREE.Quaternion(), _v = new THREE.Vector3();
  const snapshot = (mask = []) => {
    const q = {}; for (const b of mesh.skeleton.bones) q[b.name] = b.quaternion.toArray().map(x => +x.toFixed(5));
    return { q, hip: bones.Hip.position.toArray().map(x => +x.toFixed(5)), mask: [...mask] };
  };
  // overlay a pose: slerp toward it by w. full=false → only the pose's edited bones (mask), so it layers on any clip
  const applyPose = (P, w = 1, full = false) => {
    if (!P || w <= 0) return;
    const names = full ? Object.keys(P.q) : (P.mask || []);
    for (const n of names) { const b = bones[n], v = P.q[n]; if (b && v) b.quaternion.slerp(_q.fromArray(v), w); }
    if (P.hip && (full || P.mask?.includes('Hip'))) bones.Hip.position.lerp(_v.fromArray(P.hip), w);
    model.updateMatrixWorld(true);
  };
  const EASE = { linear: u => u, in: u => u * u * u, out: u => 1 - Math.pow(1 - u, 3), io: u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2,
    smooth: u => u * u * (3 - 2 * u), hold: () => 0, back: u => { const c = 1.70158; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); } };
  // sample a pose clip at time t → a blended pose (union of masks)
  const clipPose = (C, t) => {
    const K = C.keys; if (!K.length) return null;
    if (C.loop) t = ((t % C.dur) + C.dur) % C.dur; else t = Math.min(Math.max(t, K[0].t), K[K.length - 1].t);
    let i = 0; while (i < K.length - 2 && K[i + 1].t <= t) i++;
    const A = K[i], B = K[Math.min(i + 1, K.length - 1)];
    if (A === B || t <= A.t) return A.pose;
    const u = (EASE[B.ease || 'io'] || EASE.io)(Math.min(1, (t - A.t) / Math.max(1e-6, B.t - A.t)));
    const out = { q: {}, hip: [0, 0, 0], mask: [...new Set([...(A.pose.mask || []), ...(B.pose.mask || [])])] };
    const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
    for (const n in A.pose.q) { qa.fromArray(A.pose.q[n]); qb.fromArray(B.pose.q[n] || A.pose.q[n]); out.q[n] = qa.slerp(qb, u).toArray(); }
    out.hip = new THREE.Vector3().fromArray(A.pose.hip).lerp(new THREE.Vector3().fromArray(B.pose.hip), u).toArray();
    return out;
  };
  const applyClip = (C, t, w = 1, full = false) => applyPose(clipPose(C, t), w, full);
  const resetToBind = () => { for (const k in actions) actions[k].stop(); mesh.skeleton.pose(); model.updateMatrixWorld(true); };
  return { root, model, mesh, bones, mixer, pose, add, rootAt, dur, clips, CLIP, snapshot, applyPose, clipPose, applyClip, resetToBind, EASE };
}
