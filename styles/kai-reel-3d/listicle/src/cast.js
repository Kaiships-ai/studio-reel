// cast.js: Kai = his own Tripo "Blocky Kai" (assets/blocky-kai-talk.glb, PBR as exported) + the talking-mouth / blink
// rig (src/kai-talk.js); Clawd = Clawd2 (cast/clawd2.js) as is, its own MeshStandard materials (flat-lit ink + whites).
// Never mirror Kai: rotations only, positive uniform scale.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { addTalkRig } from './kai-talk.js';
import { createClawd2 } from '../cast/clawd2.js';

export async function loadKai(scene, renderer) {
  const gltf = await new GLTFLoader().loadAsync('./assets/blocky-kai-talk.glb');
  const root = gltf.scene, holder = new THREE.Group(); holder.add(root); scene.add(holder);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
  const bones = {}; root.traverse(o => { if (o.isBone) bones[o.name.replace(/^mixamorig:?/, '')] = o; });
  const mixer = new THREE.AnimationMixer(root), clips = {}; for (const c of gltf.animations) clips[c.name.replace('.001', '')] = c;
  clips.sitB = clips.sit.clone(); clips.sitB.name = 'sitB';      // 2nd copy: blend two moments of the sit clip (upright ↔ chin on hand)
  const act = {}; for (const k in clips) act[k] = mixer.clipAction(clips[k]);
  // one clip, or a cross-fade of two: pose([['sit', 1.2, 1]]) / pose([['sit', 1.2, 0.6], ['agree', 0.4, 0.4]])
  function pose(list) {
    mixer.stopAllAction();
    for (const [name, ct, w] of list) { const a = act[name]; a.reset(); a.play(); a.setEffectiveWeight(w); a.time = Math.min(Math.max(0, ct), clips[name].duration - 1e-3); }
    mixer.update(0); root.updateMatrixWorld(true);
  }
  pose([['agree', 0, 1]]);                           // the reference pose the talk anchors were measured in
  const talk = addTalkRig(root, { renderer });
  talk.decals.forEach(d => { d.receiveShadow = false; d.castShadow = false; });
  const _rq = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _aq = new THREE.Quaternion();
  // rotate a bone about an axis given in Kai's model space (+x his left, +y up, +z forward), on top of the clip
  function turn(name, axis, a) {
    if (Math.abs(a) < 1e-5) return; const b = bones[name]; if (!b) return;
    b.parent.updateWorldMatrix(true, false); root.getWorldQuaternion(_rq); b.parent.getWorldQuaternion(_pq);
    const rel = _rq.clone().invert().multiply(_pq); _aq.setFromAxisAngle(axis.clone().normalize(), a);
    b.quaternion.premultiply(rel.clone().invert().multiply(_aq).multiply(rel));
  }
  return { holder, root, bones, clips, pose, turn, talk };
}

const GLASS_V = 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }';
const GLASS_F = 'varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2); gl_FragColor = vec4(mix(vec3(.55,.66,.85),vec3(.9),f)*0.8, .06+.45*f); }';
export function loadClawd(scene, scale) {
  const c = createClawd2();
  c.group.traverse(m => {
    if (!m.isMesh) return; m.castShadow = !m.userData.emit && !m.userData.glass; m.receiveShadow = true;
    if (m.userData.glass) { m.material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, vertexShader: GLASS_V, fragmentShader: GLASS_F }); m.renderOrder = 5; return; }
    if (m.material.transparent) { m.visible = false; return; }
    if (m.userData.emit) { const col = new THREE.Color(m.userData.emit); m.material = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.35, roughness: 0.6 }); }
  });
  c.group.scale.setScalar(scale); scene.add(c.group);
  return c;
}

// morphy-clone-02 v2 (Kai: "switch to the default Clawd"): the plain brand Clawd (engine/clawd3d.js = the 18×10 pixel-grid mascot:
// orange box, two slot eyes, stub arms, four legs; no dome, backpack or band). Proportions locked (uniform scale only).
// reel.js drives it with small beats only: talk bob, blink, squash on emphasis, eye shapes, one arm raise.
import { createClawd } from '../engine/clawd3d.js';
import { applyRole } from '../engine/clawd-roles.js';
// Kai's Clawd (approved 2026-10-17): one flat orange, Kai's red >>> headband + zipped red jacket, eyes only. `role` = a costume from
// engine/clawd-roles.js ROLES (the casting sheet); a role replaces the jacket + headband, the body and eyes stay.
export function loadClawdDefault(scene, scale, role = '') {
  const plain = role === 'plain';   // v2 colour dry run: a bare Claude-orange Clawd (no jacket, no headband, no costume)
  const c = createClawd({ contact: true, style: 'flat', headband: !role, jacket: !role });
  if (role && !plain) applyRole(c, role, { noSet: true });
  c.group.traverse(m => { if (m.isMesh && m.material && !m.material.transparent) { m.castShadow = true; m.receiveShadow = true; } });
  c.group.scale.setScalar(scale); scene.add(c.group);
  return c;
}
