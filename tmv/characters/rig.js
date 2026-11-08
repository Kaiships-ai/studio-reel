// rig.js: builds one 3D character from its cast.js parameters. The episode (episode/main.js) and the character designer
// (character-designer.html) both call it, so what you design is what the episode renders.
//   kind "human": our rigged base figure (characters/jay.glb), recoloured (skin, hair, top, legs), restyled (hair, top, extra)
//                 and posed by bone aiming + two-bone IK (the GLB has no animation clips); faces are morph targets (exp_*).
//   kind "bot":   a low-poly robot built here from three.js primitives (Blip).
// Every character answers the same calls: ch.pose(P), ch.head() (world position of the face), ch.root, ch.c (its parameters).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = THREE.MathUtils.lerp, ss = (x) => x * x * (3 - 2 * x);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const BUILD = { average: [1, 1], tall: [1.07, 1.0], small: [0.9, 1.0], round: [1.0, 1.13] };   // [height, girth]
let baseP = null;
export function loadBase(url = '/characters/jay.glb') { return baseP ??= new GLTFLoader().loadAsync(url); }

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0, ...o });
const shadowAll = (root) => root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });

export async function makeCharacter(c) {
  return c.kind === 'bot' ? makeBot(c) : makeHuman(c, await loadBase());
}

// ------------------------------------------------------------ human: the base figure, restyled
function makeHuman(c, base) {
  const root = SkeletonUtils.clone(base.scene); shadowAll(root);
  const N = {}; root.traverse(o => { N[o.name] = o; });
  const mats = {};   // one copy per material name, so two characters never share a colour
  root.traverse(o => { if (o.isMesh) o.material = [].concat(o.material).map(m => (mats[m.name] ??= m.clone()))[0]; });
  const tint = (re, col, k = 1) => { for (const [n, m] of Object.entries(mats)) if (re.test(n) && m.color) m.color.set(col).multiplyScalar(k); };
  // every colour applies to every figure; hair "jay" only keeps the base figure's hair shape
  if (c.skin) tint(/Skin/, c.skin);
  if (c.topColor) { tint(/Hoodie|Hood$/, c.topColor); tint(/B_Rib/, c.topColor, 0.55); }
  if (c.legs) tint(/Pants/, c.legs);
  if (c.hairColor) { tint(/HairFade|HairTop|HairLocks/, c.hairColor); tint(/BrowInk/, c.hairColor, 0.5); }
  // the hair and the extras hang on the head bone, sized from the head's own vertices (the ones the Head bone moves)
  const B = {}; root.traverse(o => { if (o.isBone) B[o.name.replace(/^mixamorig:?/, '')] = o; });
  root.updateMatrixWorld(true);
  const head = headBox(N.SM_Char_Jay_Body, B.Head), hc = head.getCenter(V()), hs = head.getSize(V());
  const acc = new THREE.Group(); acc.position.copy(hc); root.add(acc);
  const hairMat = std(c.hairColor, { roughness: 0.75 });
  const r = hs.x / 2;   // head half-width
  const cap = (k = 1.08, cut = 0.5) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI * cut), hairMat); m.scale.set(r * k, hs.y / 2 * k * 0.98, hs.z / 2 * k); m.position.y = hs.y * 0.08; return m; };
  if (c.hair !== 'jay') {
    for (const n of ['SM_Char_Jay_B_HairLocks', 'SM_Char_Jay_B_HairTop']) if (N[n]) N[n].visible = false;
    if (c.hair === 'none' && N.SM_Char_Jay_B_HairFade) N.SM_Char_Jay_B_HairFade.visible = false;
    if (c.hair !== 'none') acc.add(cap(c.hair === 'curly' ? 1.1 : 1.03, c.hair === 'long' ? 0.62 : 0.5));
    if (c.hair === 'bun') { const b = new THREE.Mesh(new THREE.SphereGeometry(r * 0.5, 20, 14), hairMat); b.position.set(0, hs.y * 0.55, -hs.z * 0.32); acc.add(b); }
    if (c.hair === 'long') { const b = new THREE.Mesh(new RoundedBoxGeometry(r * 2.05, hs.y * 1.05, r * 0.5, 3, r * 0.2), hairMat); b.position.set(0, -hs.y * 0.2, -hs.z * 0.38); acc.add(b); }
    if (c.hair === 'curly') for (let i = 0; i < 26; i++) { const a = i * 2.4, u = 0.25 + 0.7 * ((i * 0.618) % 1), b = new THREE.Mesh(new THREE.SphereGeometry(r * 0.26, 10, 8), hairMat);
      b.position.set(Math.cos(a) * Math.sin(u * 1.4) * r * 1.02, hs.y * 0.1 + Math.cos(u * 1.4) * hs.y * 0.5, Math.sin(a) * Math.sin(u * 1.4) * hs.z * 0.5); acc.add(b); }
    if (c.hair === 'spiky') for (let i = 0; i < 9; i++) { const a = -1.2 + i * 0.3, b = new THREE.Mesh(new THREE.ConeGeometry(r * 0.22, r * 0.7, 8), hairMat);
      b.position.set(Math.sin(a) * r * 0.75, hs.y * 0.5, Math.cos(a) * hs.z * 0.15 - hs.z * 0.05); b.rotation.set(-0.3, 0, -a * 0.5); acc.add(b); }
  }
  if (c.top === 'jacket' || c.top === 'tee' || c.top === 'vest') for (const n of ['SM_Char_Jay_B_Hood', 'SM_Char_Jay_B_Strings', 'SM_Char_Jay_B_Pocket']) if (N[n]) N[n].visible = false;
  if (c.top === 'jacket') { openFront(N.SM_Char_Jay_B_Hoodie.material, c.topColor ?? '#2B2733', '#F2EFE8'); if (N.SM_Char_Jay_B_Hem) N.SM_Char_Jay_B_Hem.visible = false; }
  const ex = std(c.extraColor ?? '#20242e', { roughness: 0.4, metalness: 0.3 });
  if (c.extra === 'headset') {
    const band = new THREE.Mesh(new THREE.TorusGeometry(r * 1.13, r * 0.07, 8, 32, Math.PI), ex); band.position.y = hs.y * 0.05; acc.add(band);
    for (const s of [-1, 1]) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.32, r * 0.32, r * 0.2, 20), ex); cup.rotation.z = Math.PI / 2; cup.position.set(s * r * 1.1, 0, 0); acc.add(cup); }
    // the boom runs outside the cheek: ear cup → forward along the jaw (clear of the face) → in to the mouth corner
    const pts = [V(r * 1.2, -hs.y * 0.02, 0), V(r * 1.18, -hs.y * 0.3, hs.z * 0.42), V(r * 0.62, -hs.y * 0.36, hs.z * 0.66)];
    for (let i = 0; i < 2; i++) { const a = pts[i], b = pts[i + 1], d = b.clone().sub(a);
      const seg_ = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.035, r * 0.035, d.length(), 6), ex);
      seg_.position.copy(a).add(b).multiplyScalar(0.5); seg_.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); acc.add(seg_); }
    const tip = new THREE.Mesh(new THREE.SphereGeometry(r * 0.08, 10, 8), ex); tip.position.copy(pts[2]); acc.add(tip);
  }
  if (c.extra === 'glasses') {
    for (const s of [-1, 1]) { const g = new THREE.Mesh(new THREE.TorusGeometry(r * 0.3, r * 0.05, 8, 24), ex); g.position.set(s * r * 0.4, hs.y * 0.02, hs.z * 0.52); acc.add(g); }
    const br = new THREE.Mesh(new THREE.BoxGeometry(r * 0.25, r * 0.05, r * 0.05), ex); br.position.set(0, hs.y * 0.05, hs.z * 0.53); acc.add(br);
  }
  if (c.extra === 'cap') {
    const cm = std(c.extraColor ?? c.topColor, { roughness: 0.7 }), k = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), cm);
    k.scale.set(r * 1.14, hs.y * 0.55, hs.z * 0.57); k.position.y = hs.y * 0.12; acc.add(k);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, r * 0.05, 20, 1, false, -Math.PI / 2, Math.PI), cm); brim.position.set(0, hs.y * 0.18, hs.z * 0.4); acc.add(brim);
  }
  if (c.extra === 'scarf') { const s = new THREE.Mesh(new THREE.TorusGeometry(r * 0.85, r * 0.28, 10, 24), std(c.extraColor ?? '#C8412F', { roughness: 0.9 })); s.rotation.x = Math.PI / 2; s.position.y = -hs.y * 0.62; acc.add(s); }
  shadowAll(acc); B.Head.attach(acc);
  const [hk, gk] = BUILD[c.build] ?? BUILD.average; root.scale.set(gk * hk, hk, gk * hk);
  const P = makePoser(root, B, { sweat: N.SM_Char_Jay_FX_Sweat, tear: N.SM_Char_Jay_FX_Tear });
  return { c, root, kind: 'human', ...P, pose: (o) => P.pose({ ...o, exp: { ...(c.face ?? {}), ...(o.exp ?? {}) } }) };
}
// a jacket is the hoodie's body opened down the front over a shirt. The opening is drawn per pixel from the rest-pose
// position (metres, the base figure faces +z), so its edges stay sharp on the coarse mesh and follow the torso as it bends.
function openFront(mat, top, shirt) {
  const lapel = new THREE.Color(top).multiplyScalar(0.5);
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uShirt: { value: new THREE.Color(shirt) }, uLapel: { value: lapel } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRest;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vRest;\nuniform vec3 uShirt, uLapel;').replace('#include <color_fragment>', `#include <color_fragment>
      float x = abs(vRest.x), w = 0.014 + 0.012 * clamp((vRest.y - 0.5) / 0.28, 0.0, 1.0);
      if (vRest.z > 0.02 && x < 0.1) diffuseColor.rgb = x < w ? uShirt : x < w + 0.005 ? uLapel : diffuseColor.rgb;`);
  };
}
function headBox(mesh, headBone) {
  const sk = mesh.skeleton, hi = sk.bones.indexOf(headBone), g = mesh.geometry, p = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight;
  const box = new THREE.Box3(), v = V();
  for (let i = 0; i < p.count; i++) {
    let w = 0; for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === hi) w += sw.getComponent(i, k);
    if (w > 0.6) box.expandByPoint(v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld));
  }
  return box;
}

// pose P = { at:[x,z], y, yaw, sit 0..1, seatY, lean (deg fwd), curl, twist, side, head:[pitch, yaw, roll], shrug, stance, bob,
//            armL/armR: {ik:Vector3, pole:Vector3} | {up:dir, fore:dir} | null, exp:{morph: weight}, fx:{sweat, tear} }
function makePoser(root, B, fxMeshes) {
  const REST = Object.fromEntries(Object.entries(B).map(([k, b]) => [k, { q: b.quaternion.clone(), p: b.position.clone() }]));
  const morphMeshes = []; root.traverse(o => { if (o.isMesh && o.morphTargetDictionary) morphMeshes.push(o); });
  const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _a = V(), _b = V();
  function rotWorld(bone, qW) { const P = bone.parent.getWorldQuaternion(_q2); bone.quaternion.premultiply(P.clone().invert().multiply(qW).multiply(P)); bone.updateMatrixWorld(true); }
  const rootDir = (x, y, z) => V(x, y, z).normalize().applyQuaternion(root.quaternion);
  function aim(bone, child, dirW) { bone.getWorldPosition(_a); child.getWorldPosition(_b); rotWorld(bone, _q.setFromUnitVectors(_b.sub(_a).normalize(), dirW.clone().normalize())); }
  function rotRoot(bone, axis, deg) { if (deg) rotWorld(bone, _q.setFromAxisAngle(rootDir(...axis), deg * Math.PI / 180)); }
  const lerpDir = (a, b, k) => V().lerpVectors(a, b, k).normalize();
  const wp = (b) => b.getWorldPosition(V());
  function ik(side, target, pole) {   // two-bone IK: shoulder→elbow→hand reaches `target` (world), elbow bends toward `pole` (world dir)
    const A = B[side + 'Arm'], F = B[side + 'ForeArm'], H = B[side + 'Hand'];
    const s = wp(A), l1 = wp(F).distanceTo(s), l2 = wp(H).distanceTo(wp(F));
    const d = target.clone().sub(s); let D = d.length(); D = clamp(D, Math.abs(l1 - l2) + 1e-3, (l1 + l2) * 0.999);
    const dn = d.normalize(); const a = (l1 * l1 - l2 * l2 + D * D) / (2 * D), hgt = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const pn = pole.clone().sub(dn.clone().multiplyScalar(pole.dot(dn))).normalize();
    const elbow = s.clone().addScaledVector(dn, a).addScaledVector(pn, hgt);
    aim(A, F, elbow.clone().sub(s)); aim(F, H, s.clone().addScaledVector(dn, D).sub(wp(F)));
  }
  function pose(P) {
    for (const [k, b] of Object.entries(B)) { b.quaternion.copy(REST[k].q); b.position.copy(REST[k].p); }
    root.position.set(P.at[0], P.y ?? 0, P.at[1]); root.rotation.set(0, P.yaw ?? 0, 0); root.updateMatrixWorld(true);
    const s = P.sit ?? 0;
    B.Hips.position.y = lerp(REST.Hips.p.y, P.seatY ?? 0.255, s) + (P.bob ?? 0);
    B.Hips.position.z = REST.Hips.p.z + lerp(0, -0.02, s);
    root.updateMatrixWorld(true);
    for (const [side, sx] of [['Left', 1], ['Right', -1]]) {
      const st = P.stance ?? 0.04;
      const down = rootDir(st * sx, -1, 0.02), thighS = rootDir(0.16 * sx, -0.12, 1), shinS = rootDir(0.03 * sx, -1, 0.12);
      aim(B[side + 'UpLeg'], B[side + 'Leg'], lerpDir(down, thighS, s));
      aim(B[side + 'Leg'], B[side + 'Foot'], lerpDir(down, shinS, ss(s)));
    }
    const lean = P.lean ?? 0, curl = P.curl ?? 0;
    rotRoot(B.Spine, [1, 0, 0], lean * 0.5); rotRoot(B.Spine1, [1, 0, 0], lean * 0.5 + curl * 0.4); rotRoot(B.Spine2, [1, 0, 0], curl * 0.6);
    if (P.twist) rotRoot(B.Spine1, [0, 1, 0], P.twist);
    if (P.side) rotRoot(B.Spine1, [0, 0, 1], P.side);
    const sh = P.shrug ?? 0; rotRoot(B.LeftShoulder, [0, 0, 1], -sh); rotRoot(B.RightShoulder, [0, 0, 1], sh);
    const [hp, hy, hr] = P.head ?? [0, 0, 0];
    rotRoot(B.Neck, [1, 0, 0], hp * 0.4); rotRoot(B.Head, [1, 0, 0], hp * 0.6); rotRoot(B.Neck, [0, 1, 0], hy); rotRoot(B.Head, [0, 0, 1], hr ?? 0);
    for (const [side, sx] of [['Left', 1], ['Right', -1]]) {
      const a = P['arm' + side[0]];
      if (a && a.ik) ik(side, a.ik, a.pole ?? rootDir(sx * 0.6, -0.4, -0.7));
      else {
        const d = a ?? { up: rootDir(0.18 * sx, -1, 0.02), fore: rootDir(0.08 * sx, -1, 0.18) };
        aim(B[side + 'Arm'], B[side + 'ForeArm'], d.up); aim(B[side + 'ForeArm'], B[side + 'Hand'], d.fore);
      }
    }
    for (const m of morphMeshes) { m.morphTargetInfluences.fill(0); for (const [k, v] of Object.entries(P.exp ?? {})) { const i = m.morphTargetDictionary[k]; if (i !== undefined) m.morphTargetInfluences[i] = v; } }
    for (const [k, m] of Object.entries(fxMeshes)) if (m) { const v = (P.fx ?? {})[k] ?? 0; m.visible = v > 0.01; if (m.morphTargetInfluences) m.morphTargetInfluences.fill(v); }
    root.updateMatrixWorld(true);
  }
  return { B, pose, rootDir, wp, head: () => wp(B.Head) };
}

// ------------------------------------------------------------ bot: a low-poly desk robot from primitives (about 30 cm tall)
// shell = c.skin, vest/accent = c.topColor, limbs = c.legs; eyes: visor (two light bars) | dot | wide | sleepy; extra antenna
function makeBot(c) {
  const root = new THREE.Group(), body = new THREE.Group(), headG = new THREE.Group(); root.add(body); body.add(headG);
  const shell = std(c.skin, { roughness: 0.35, metalness: 0.15 }), acc = std(c.topColor, { roughness: 0.5 }), limb = std(c.legs, { roughness: 0.5, metalness: 0.3 });
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(c.eyeColor ?? '#29E0FF').multiplyScalar(2.2) });
  const [hk, gk] = BUILD[c.build] ?? BUILD.average, S_ = 0.3 * hk;
  const add = (g, geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
  add(body, new RoundedBoxGeometry(0.5 * gk, 0.42, 0.36 * gk, 4, 0.08), shell, 0, 0.42, 0);           // torso
  add(body, new RoundedBoxGeometry(0.52 * gk, 0.2, 0.38 * gk, 3, 0.05), acc, 0, 0.34, 0);              // vest band
  add(body, new THREE.CircleGeometry(0.06, 20), glow, 0, 0.47, 0.185 * gk);                             // chest light
  for (const s of [-1, 1]) {
    const arm = add(body, new THREE.CapsuleGeometry(0.05, 0.2, 4, 10), limb, s * 0.31 * gk, 0.42, 0); arm.rotation.z = s * 0.25; arm.name = s < 0 ? 'armL' : 'armR';
    add(body, new RoundedBoxGeometry(0.15, 0.1, 0.2, 2, 0.04), limb, s * 0.13, 0.05, 0.02);            // feet
    add(body, new THREE.CylinderGeometry(0.045, 0.045, 0.14, 10), limb, s * 0.13, 0.15, 0);             // legs
  }
  headG.position.y = 0.68;
  add(headG, new RoundedBoxGeometry(0.62 * gk, 0.46, 0.46, 5, 0.12), shell, 0, 0.2, 0);
  const visor = add(headG, new RoundedBoxGeometry(0.5 * gk, 0.26, 0.04, 3, 0.06), std('#0A0D18', { roughness: 0.15, metalness: 0.4 }), 0, 0.2, 0.225);
  const eyes = [];
  const eyeGeo = { visor: new THREE.CapsuleGeometry(0.035, 0.06, 4, 8), dot: new THREE.SphereGeometry(0.045, 12, 8), wide: new THREE.SphereGeometry(0.065, 14, 10), sleepy: new THREE.CapsuleGeometry(0.02, 0.09, 4, 8) }[c.eyes] ?? new THREE.SphereGeometry(0.045, 12, 8);
  for (const s of [-1, 1]) { const e = add(headG, eyeGeo, glow, s * 0.11, 0.2, 0.25); if (c.eyes === 'sleepy') e.rotation.z = Math.PI / 2; eyes.push(e); }
  if (c.extra === 'antenna' || c.extra === 'none' || !c.extra) {
    if (c.extra !== 'none') { add(headG, new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6), limb, 0, 0.5, 0); add(headG, new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(c.lightColor ?? '#FF3D8B').multiplyScalar(2.5) }), 0, 0.6, 0); }
  }
  if (c.extra === 'headset') for (const s of [-1, 1]) { const cup = add(headG, new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16), acc, s * 0.33 * gk, 0.2, 0); cup.rotation.z = Math.PI / 2; }
  if (c.extra === 'scarf') { const sc = add(body, new THREE.TorusGeometry(0.2, 0.05, 8, 20), acc, 0, 0.66, 0); sc.rotation.x = Math.PI / 2; }
  if (c.extra === 'cap') { add(headG, new THREE.SphereGeometry(0.28, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), acc, 0, 0.42, 0); add(headG, new THREE.CylinderGeometry(0.2, 0.2, 0.02, 16, 1, false, -Math.PI / 2, Math.PI), acc, 0, 0.44, 0.22); }
  if (c.extra === 'glasses') for (const s of [-1, 1]) add(headG, new THREE.TorusGeometry(0.07, 0.012, 6, 16), limb, s * 0.11, 0.2, 0.26);
  root.scale.setScalar(S_); shadowAll(root);
  const arms = { L: body.getObjectByName('armL'), R: body.getObjectByName('armR') };
  // P = { at:[x,z], y, yaw, t, talk 0..1, hop 0..1, look:[pitch, yaw], wave 0..1, blink 0..1 }
  function pose(P) {
    const t = P.t ?? 0;
    root.position.set(P.at[0], (P.y ?? 0) + (P.hop ?? 0) * 0.06 * Math.abs(Math.sin(t * 7)), P.at[1]); root.rotation.set(0, P.yaw ?? 0, 0);
    body.rotation.z = 0.04 * Math.sin(t * 2.1); body.position.y = 0.01 * Math.sin(t * 3.3);
    const [lp, ly] = P.look ?? [0, 0]; headG.rotation.set((lp + 6 * Math.sin(t * 1.7) * (P.talk ?? 0)) * Math.PI / 180, (ly + 4 * Math.sin(t * 0.9)) * Math.PI / 180, 0.05 * Math.sin(t * 1.3));
    const talk = P.talk ?? 0, bl = P.blink ?? 0;
    for (const e of eyes) e.scale.set(1, Math.max(0.08, 1 - bl) * (1 + 0.25 * talk * Math.abs(Math.sin(t * 13))), 1);
    glow.color.set(c.eyeColor ?? '#29E0FF').multiplyScalar(2.2 * (1 + 0.5 * talk * Math.abs(Math.sin(t * 13))));
    arms.L.rotation.z = -0.25 - 0.2 * Math.sin(t * 2); arms.R.rotation.z = 0.25 + (P.wave ?? 0) * (2.2 + 0.35 * Math.sin(t * 12)) + 0.2 * Math.sin(t * 2 + 1);
    root.updateMatrixWorld(true);
  }
  pose({ at: [0, 0] });
  return { c, root, kind: 'bot', pose, head: () => headG.localToWorld(V(0, 0.2, 0)) };
}
