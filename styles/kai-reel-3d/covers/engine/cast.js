// cast.js: Kai (Tripo GLB, 9 mocap clips + the Pose Studio library) and Clawd (vinyl toy, 2 slot eyes), both in the
// night toon/ink look, placed in FLAT space and carried by the bend (bend.js).
// Canon: headband knot on HIS right, bag at his right hip, strap over his left shoulder. Never mirror Kai (no negative
// scale, no flipped camera); rotations only.
//
//   const C = await makeCast(scene);
//   C.placeKai(V(x, 0, z), yaw)                 stand Kai at a flat-space spot (yaw: π/2 = facing +x, 0 = facing +z/camera)
//   C.kai.pose([['run', ct, 1], ['idle', t, w]])  sample clips (clip names: idle walk run dive guard wave kick agree afraid)
//   C.kai.add({ Spine01: [0, 0, -0.2] }, w)      additive bone layer (z = flex axis; see 5-kai-3d/HANDOFF.md)
//   C.kai.applyPose(C.lib.poses.count_3, w)      pose library overlay (20 poses: point_camera_R, thumbs_up_R, count_1..3, …)
//   C.turn('Head', V(1, 0, 0), -0.3)             rotate a bone about an axis in Kai's space (+x his left, +y up, +z forward)
//   C.placeClawd(V(x, 0, z), yaw, t, action)     Clawd at a flat spot; actions idle wave walk hop dance jazz scurry
//   makeCast(scene, { clawdModel: 'clawd2' })  swaps Clawd for the gumdrop mascot (cast/clawd2.js); default stays clawd3d
//   C.clawdOnAfro(t)                             Clawd rides the afro (call after placeKai)
import * as THREE from 'three';
import { toonMat, addOutline } from './look.js';
import { bendFrame } from './bend.js';
import { makeKaiTripo, loadKaiLibrary } from './kai-tripo.js';
import { createClawd } from './clawd3d.js';
import { createClawd2 } from '../cast/clawd2.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const qY = (a) => new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), a);

export async function makeCast(scene, o = {}) {
  const kai = await makeKaiTripo('./assets/kai/kai-final.glb', { look: 'pbr' });
  const src = kai.mesh.material; kai.mesh.geometry.setAttribute('faceUv', kai.mesh.geometry.attributes.uv); src.map.colorSpace = THREE.SRGBColorSpace;
  kai.mesh.material = toonMat('#ffffff', { map: src.map, faceUv: true, hiAmt: 0.15, hatch: 0.35, side: THREE.DoubleSide, tint: o.kaiTint ?? '#6d6cb8' });
  addOutline(kai.mesh, 1.0); kai.mesh.castShadow = true;
  scene.add(kai.root);
  const KAI_TOFLAT = kai.mesh.material.uniforms.uToFlat;
  const lib = await loadKaiLibrary('./assets/kai/kai-library.json');

  const clawd = o.clawdModel === 'clawd2' ? createClawd2(o.clawdOpts || {}) : createClawd({ googly: false, fannypack: false, hands: false, contact: false });
  const CL_TOFLAT = { value: new THREE.Matrix4() };
  clawd.group.traverse(m => { if (m.isMesh && !m.userData.outline) { const c = m.material.color ? '#' + m.material.color.getHexString() : '#d8622f';
    if (m.userData.glass) { m.material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.FrontSide, vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }', fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2); gl_FragColor = vec4(mix(vec3(.72,.86,1.),vec3(1.),f), .1+.55*f); }' }); m.renderOrder = 5; return; }
    if (m.material.transparent) { m.visible = false; return; }
    const em = m.userData.emit; m.material = toonMat(c, em ? { hatch: 0, hiAmt: 0, emit: em, emitAmt: 1, shadeK: 0 } : { hatch: 0.4, hiAmt: 0.45 }); m.material.uniforms.uToFlat = CL_TOFLAT; m.castShadow = m.castShadow || !em;
    if (!m.userData.noOutline) addOutline(m, 1.1); } });
  const CL_S = o.clawdScale ?? 0.026; clawd.group.scale.setScalar(CL_S); scene.add(clawd.group);

  const _mF = new THREE.Matrix4(), _mW = new THREE.Matrix4();
  // authored in flat space → world via the bend frame; uToFlat = M_flat · M_world⁻¹ keeps lighting/shadows in flat space
  function placeRigid(root, toFlatU, flatPos, flatQ) {
    root.position.copy(flatPos); root.quaternion.copy(flatQ); root.updateMatrixWorld(true); _mF.copy(root.matrixWorld);
    const f = bendFrame(flatPos, flatQ); root.position.copy(f.pos); root.quaternion.copy(f.quat); root.updateMatrixWorld(true); _mW.copy(root.matrixWorld);
    toFlatU.value.copy(_mF).multiply(_mW.clone().invert());
    return f;
  }
  const C = { kai, clawd, lib, KAI_TOFLAT, CL_TOFLAT, placeRigid, kaiFlat: { pos: V(0, 0, 0), q: new THREE.Quaternion() } };
  C.placeKai = (pos, yaw = 0) => { C.kaiFlat.pos.copy(pos); C.kaiFlat.q.copy(qY(yaw)); return placeRigid(kai.root, KAI_TOFLAT, pos, qY(yaw)); };
  C.placeClawd = (pos, yaw, t, action = 'idle', opts = {}) => { placeRigid(clawd.group, CL_TOFLAT, pos, qY(yaw)); clawd.update(t, { action, ...opts }); };
  C.headTop = (out = new THREE.Vector3()) => { const h = kai.bones.Head; h.updateWorldMatrix(true, false); return h.getWorldPosition(out).addScaledVector(V(0, 1, 0).applyQuaternion(kai.root.quaternion), 0.26); };
  C.clawdOnAfro = (t, action = 'idle') => {
    clawd.group.position.copy(C.headTop()); clawd.group.quaternion.copy(kai.root.quaternion); clawd.group.updateMatrixWorld(true);
    CL_TOFLAT.value.copy(KAI_TOFLAT.value); clawd.update(t, { action });
  };
  const _rq = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _aq = new THREE.Quaternion();
  C.turn = (name, axisKai, a) => {
    if (Math.abs(a) < 1e-5) return; const b = kai.bones[name];
    b.parent.updateWorldMatrix(true, false); kai.model.getWorldQuaternion(_rq); b.parent.getWorldQuaternion(_pq);
    const rel = _rq.clone().invert().multiply(_pq); _aq.setFromAxisAngle(axisKai.clone().normalize(), a);
    b.quaternion.premultiply(rel.clone().invert().multiply(_aq).multiply(rel));
  };
  // shadow pass helper: shadows are computed in flat space, so move the cast to their flat frames for the pass
  C.withFlatCast = (fn) => {
    const kp = kai.root.position.clone(), kq = kai.root.quaternion.clone(), cp = clawd.group.position.clone(), cq = clawd.group.quaternion.clone();
    kai.root.position.copy(C.kaiFlat.pos); kai.root.quaternion.copy(C.kaiFlat.q); kai.root.updateMatrixWorld(true);
    clawd.group.applyMatrix4(CL_TOFLAT.value.clone()); clawd.group.updateMatrixWorld(true);
    fn();
    kai.root.position.copy(kp); kai.root.quaternion.copy(kq); kai.root.updateMatrixWorld(true);
    clawd.group.position.copy(cp); clawd.group.quaternion.copy(cq); clawd.group.scale.setScalar(CL_S); clawd.group.updateMatrixWorld(true);
  };
  return C;
}
