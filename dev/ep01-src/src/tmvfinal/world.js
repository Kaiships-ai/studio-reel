// world.js (TMV ep1, from ep01 v2): loads the episode's GLBs (room, laptop, Kai) + Kai's Clawd, fixes what the export lacks (screen UVs, glass,
// area lights), builds the light rigs (night: cold screen key + #FF3D8B neon through the curtain + low amber; day: low gold sun
// through the window; laptop: screens + pink rim) and the pose kit for Kai (no actions in the GLB: bones are aimed / two-bone IK).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { V, clamp, seg, ss, lerp, hsh } from './stage.js';

export const PINK = '#FF3D8B';
const loader = new GLTFLoader();
const load = (u) => new Promise((res, rej) => loader.load(u, res, undefined, rej));
const LOG = (...a) => console.log('LOG ' + a.join(' '));

export async function buildWorld(S) {
  const { scene, renderer } = S;
  const [room, kaiG, jayG] = await Promise.all(['assets/ep01/scene-room.glb', 'assets/ep01/char-kai.glb', 'assets/ep01/char-jay.glb'].map(load));
  const R = room.scene, L = new THREE.Group(), kai = kaiG.scene, jay = jayG.scene;
  scene.add(R, kai, jay);
  const byName = (root) => { const m = {}; root.traverse(o => { m[o.name] = o; }); return m; };
  const RN = byName(R), LN = {}, KN = byName(kai), JN = byName(jay);
  for (const root of [R, kai, jay]) root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } if (o.isLight) o.visible = false; });
  for (const c of [kai, jay]) c.traverse(o => { if (o.isMesh) o.frustumCulled = false; });

  // ------------------------------------------------------------ states (states.json: exactly one value per group)
  const GROUPS = {
    room: { cash: ['high', 'mid', 'low'], listen: ['0', '2', '4'], pride: ['low', 'mid', 'high'], mom: ['low', 'mid', 'high'], light: ['day', 'night', 'zero', 'day60'], badge: ['hook', 'held'] },
    lap: { nine: ['full', 'ghost'], fireworks: ['on', 'off'] },
  };
  const ROOM_DEF = { cash: 'mid', listen: '0', pride: 'low', mom: 'mid', light: 'day', badge: 'hook' };
  function setStates(which, st) {
    const N = which === 'room' ? RN : LN, G = GROUPS[which];
    for (const [g, vals] of Object.entries(G)) for (const v of vals) { const n = N[`ST_${g}_${v}`]; if (n) n.visible = st[g] === v; }
  }

  // ------------------------------------------------------------ cameras from the GLBs
  const CAM = {};
  const camOf = (N, name) => {
    const c = N[name]; c.updateWorldMatrix(true, true);
    const cam = c.isCamera ? c : c.getObjectByProperty('isCamera', true);
    const pos = new THREE.Vector3(), q = new THREE.Quaternion(); (cam || c).matrixWorld.decompose(pos, q, new THREE.Vector3());
    return { pos, dir: new THREE.Vector3(0, 0, -1).applyQuaternion(q), fov: cam ? cam.fov : 50 };
  };
  for (const n of ['CAM_Wide', 'CAM_Mid', 'CAM_Desk', 'CAM_Door', 'CAM_States']) CAM[n] = camOf(RN, n);
  
  // ------------------------------------------------------------ screens: planar UVs (the export has none) + live canvas textures
  function planarUV(mesh) {
    const g = mesh.geometry; g.computeBoundingBox(); const bb = g.boundingBox, sz = bb.getSize(new THREE.Vector3());
    const ax = ['x', 'y', 'z'].sort((a, b) => sz[b] - sz[a]); let [u, v] = ax;            // two largest extents
    if (u === 'y') [u, v] = [v, u];                                                          // u = the horizontal one
    const p = g.attributes.position, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      const P = { x: p.getX(i), y: p.getY(i), z: p.getZ(i) };
      uv[i * 2] = (P[u] - bb.min[u]) / (sz[u] || 1); uv[i * 2 + 1] = (P[v] - bb.min[v]) / (sz[v] || 1);
      if (u === 'z') uv[i * 2] = 1 - uv[i * 2];
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
  const live = [];   // {canvas, tex, draw(g, w, h, t)}
  function liveTex(w, h, draw) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const L_ = { c, tex, draw, g: c.getContext('2d') }; live.push(L_); return L_;
  }
  function screenMat(tex, k = 2.2) {
    return new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: k, roughness: 0.35, metalness: 0 });
  }
  const screens = {};
  for (const root of [R]) root.traverse(o => { if (o.isMesh && o.material && /^SCREEN_/.test(o.material.name)) { planarUV(o); (screens[o.material.name] ??= []).push(o); } });
  LOG('screens', Object.keys(screens).join(','));

  // ------------------------------------------------------------ Kai: hair keeps its brown under any light (hue lock), badge on the hook instead
  const hairMats = new Set();
  for (const c of [kai, jay]) c.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material)) if (/Hair|BrowInk/.test(m.name)) hairMats.add(m); });
  for (const m of hairMats) {
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>',
        `{ float lo = dot(outgoingLight, vec3(.2126,.7152,.0722)); float la = max(dot(diffuseColor.rgb, vec3(.2126,.7152,.0722)), 1e-3);
           outgoingLight = mix(outgoingLight, diffuseColor.rgb * (lo / la), 0.85); }
         #include <opaque_fragment>`);
    };
    m.needsUpdate = true;
  }
  if (KN.SM_Char_Kai_Acc_Badge) KN.SM_Char_Kai_Acc_Badge.visible = false;
  function makePoser(root, fx) {
  const B = {}; root.traverse(o => { if (o.isBone) B[o.name.replace(/^mixamorig:?/, '')] = o; });
  const REST = Object.fromEntries(Object.entries(B).map(([k, b]) => [k, { q: b.quaternion.clone(), p: b.position.clone() }]));
  const morphMeshes = []; root.traverse(o => { if (o.isMesh && o.morphTargetDictionary) morphMeshes.push(o); });
  const fxMeshes = fx;

  const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
  function rotWorld(bone, qW) { const P = bone.parent.getWorldQuaternion(_q2); bone.quaternion.premultiply(P.clone().invert().multiply(qW).multiply(P)); bone.updateMatrixWorld(true); }
  const rootDir = (x, y, z) => new THREE.Vector3(x, y, z).normalize().applyQuaternion(root.quaternion);
  const rootVec = (x, y, z) => new THREE.Vector3(x, y, z).applyQuaternion(root.quaternion);   // an offset in Kai's space (not normalised)
  function aim(bone, child, dirW) { bone.getWorldPosition(_a); child.getWorldPosition(_b); rotWorld(bone, _q.setFromUnitVectors(_b.sub(_a).normalize(), dirW.clone().normalize())); }
  function rotRoot(bone, axis, deg) { if (deg) rotWorld(bone, _q.setFromAxisAngle(rootDir(...axis), deg * Math.PI / 180)); }
  const lerpDir = (a, b, k) => new THREE.Vector3().lerpVectors(a, b, k).normalize();
  const wp = (b) => b.getWorldPosition(new THREE.Vector3());
  function ik(side, target, pole) {   // two-bone IK: shoulder→elbow→hand reaches `target` (world), elbow bends toward `pole` (world dir)
    const A = B[side + 'Arm'], F = B[side + 'ForeArm'], H = B[side + 'Hand'];
    const s = wp(A), l1 = wp(F).distanceTo(s), l2 = wp(H).distanceTo(wp(F));
    const d = target.clone().sub(s); let D = d.length(); D = clamp(D, Math.abs(l1 - l2) + 1e-3, (l1 + l2) * 0.999);
    const dn = d.normalize(); const a = (l1 * l1 - l2 * l2 + D * D) / (2 * D), hgt = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const pn = pole.clone().sub(dn.clone().multiplyScalar(pole.dot(dn))).normalize();
    const elbow = s.clone().addScaledVector(dn, a).addScaledVector(pn, hgt);
    aim(A, F, elbow.clone().sub(s)); aim(F, H, s.clone().addScaledVector(dn, D).sub(wp(F)));
  }
  // P = { at:[x,z], yaw, sit 0..1, seatY, lean (deg fwd), curl (upper spine deg), head:[pitch, yaw, roll], shrug, legs:'stand'|'sit',
  //       armL/armR: {ik:Vector3, pole:Vector3} | {up:dir, fore:dir} | null, exp:{key:w}, fx:{sweat, tear} }
  function pose(P) {
    for (const [k, b] of Object.entries(B)) { b.quaternion.copy(REST[k].q); b.position.copy(REST[k].p); }
    root.position.set(P.at[0], P.y ?? 0, P.at[1]); root.rotation.set(0, P.yaw, 0); root.updateMatrixWorld(true);
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
    return { B, REST, pose, rootDir, rootVec, head: () => wp(B.Head), wp, ik, morphMeshes };
  }
  const PK = makePoser(kai, { sweat: KN.SM_Char_Kai_FX_Sweat, tear: KN.SM_Char_Kai_FX_Tear }), PJ = makePoser(jay, { sweat: JN.SM_Char_Jay_FX_Sweat, tear: JN.SM_Char_Jay_FX_Tear });
  const B = PK.B, poseKai = PK.pose, rootDir = PK.rootDir, rootVec = PK.rootVec, wp = PK.wp;
  const head = () => wp(B.Head);

  // ------------------------------------------------------------ badge on the hook (pivot at the knob) + the door (pivot at the hinge)
  const hookPos = wp(RN.SM_Env_Badge_HookKnob);
  const badgePivot = new THREE.Object3D(); badgePivot.position.copy(hookPos); R.add(badgePivot); badgePivot.updateMatrixWorld(true);
  for (const c of [...RN.ST_badge_hook.children]) badgePivot.attach(c);
  const card = RN.SM_Env_Badge_Card;
  const badgeMats = new Map();
  badgePivot.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); badgeMats.set(o.name, o.material); } });
  const door = RN.SM_Env_Door_Leaf; const doorBB = new THREE.Box3().setFromObject(door);
  const hinge = new THREE.Object3D(); hinge.position.set((doorBB.min.x + doorBB.max.x) / 2, 0, doorBB.max.z); R.add(hinge); hinge.updateMatrixWorld(true);
  hinge.attach(door); if (RN.SM_Env_Door_Knob) hinge.attach(RN.SM_Env_Door_Knob);

  // ------------------------------------------------------------ materials: glass you can see through to a sky / the neon outside
  const glassNight = liveTex(512, 512, (g, w, h, t) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0b0f2e'); gr.addColorStop(0.7, '#1a1440'); gr.addColorStop(1, '#2a1238');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { const x = hsh(i, 1) * w, y = h * (0.55 + 0.45 * hsh(i, 2)), r = 2 + 5 * hsh(i, 3);   // far windows
      g.fillStyle = hsh(i, 4) > 0.7 ? 'rgba(255,190,120,.55)' : 'rgba(120,150,255,.35)'; g.fillRect(x, y, r, r * 1.4); }
    const fl = S.neonLevel ?? 1;   // the neon tube itself (a sign across the street)
    g.save(); g.globalAlpha = fl; g.shadowColor = PINK; g.shadowBlur = 40; g.strokeStyle = '#ffd1e4'; g.lineWidth = 10; g.lineCap = 'round';
    g.beginPath(); g.moveTo(w * 0.18, h * 0.34); g.lineTo(w * 0.62, h * 0.34); g.moveTo(w * 0.66, h * 0.34); g.lineTo(w * 0.82, h * 0.34); g.stroke();
    g.shadowBlur = 80; g.strokeStyle = PINK; g.lineWidth = 4; g.stroke(); g.restore();
  });
  const glassDay = liveTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffe7b8'); gr.addColorStop(0.6, '#ffd08a'); gr.addColorStop(1, '#ffb877');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const nightGlassMat = screenMat(glassNight.tex, 1.6), dayGlassMat = screenMat(glassDay.tex, 2.4);
  for (const n of ['SM_Env_Window_Glass', 'SM_Env_Window_Glass_night', 'SM_Env_Window_Glass_zero', 'SM_Env_Window_Glass_day60']) if (RN[n]) { planarUV(RN[n]); RN[n].castShadow = false; }
  RN.SM_Env_Room_WallBack.castShadow = false;   // outside lights reach the room through the window (the cookie shapes them)
  RN.SM_Env_Room_WallLeft.castShadow = false;
  for (const n of ['SM_Env_Window_Frame', 'SM_Env_Curtain_Rod']) if (RN[n]) RN[n].castShadow = false;   // the frame is a solid panel behind the glass
  const curtains = [RN.SM_Env_Curtain_L, RN.SM_Env_Curtain_R].filter(Boolean);
  for (const c of curtains) { c.material = c.material.clone(); c.material.emissive = new THREE.Color(PINK); c.material.emissiveIntensity = 0; }
  const lampBulbs = ['SM_Env_Lamp_Bulb_high', 'SM_Env_Lamp_Bulb_mid', 'SM_Env_Lamp_Bulb_low'].map(n => RN[n]).filter(Boolean);
  for (const b of lampBulbs) { b.material = b.material.clone(); b.material.emissive = new THREE.Color('#ffae5a'); }

  // ------------------------------------------------------------ light rigs
  const hemi = new THREE.HemisphereLight('#4a4f8a', '#20121c', 0.4); scene.add(hemi);
  // outside lights (sun, neon) enter only through the window: an invisible occluder behind the back wall with a window-shaped hole
  // casts into the shadow maps (colorWrite off: the camera never sees it); the neon one adds blind slats across the hole
  const glassBB = new THREE.Box3().setFromObject(RN.SM_Env_Window_Glass);
  const winC = glassBB.getCenter(new THREE.Vector3());
  const ghost = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide });
  function occluder(slats = 0) {
    const g = new THREE.Group(), x0 = glassBB.min.x, x1 = glassBB.max.x, y0 = glassBB.min.y, y1 = glassBB.max.y;
    const sh = new THREE.Shape(); sh.moveTo(-4, -2); sh.lineTo(5, -2); sh.lineTo(5, 4); sh.lineTo(-4, 4); sh.lineTo(-4, -2);
    const hole = new THREE.Path(); hole.moveTo(x0, y0); hole.lineTo(x0, y1); hole.lineTo(x1, y1); hole.lineTo(x1, y0); hole.lineTo(x0, y0); sh.holes.push(hole);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), ghost); m.position.z = -1.42; g.add(m);
    for (let k = 0; k < slats; k++) { const y = lerp(y0, y1, (k + 0.5) / slats), b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 0.1, (y1 - y0) / slats * 0.42, 0.01), ghost);
      b.position.set(winC.x, y, -1.40); b.rotation.x = -0.5; g.add(b); }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; o.renderOrder = -1; } }); scene.add(g); return g;
  }
  const occSun = occluder(0), occNeon = occluder(8);
  function outSpot(color, angle, soft) {
    const sp = new THREE.SpotLight(color, 0, 0, angle, 0.35, 0); scene.add(sp, sp.target);
    sp.castShadow = true; sp.shadow.mapSize.set(2048, 2048); sp.shadow.bias = -0.0004; sp.shadow.normalBias = 0.01; sp.shadow.camera.near = 0.5; sp.shadow.radius = soft;
    return sp;
  }
  const sun = outSpot('#ffc27a', 0.5, 2), neon = outSpot(PINK, 0.5, 4);
  // aim an outside light through the window centre at a target inside: light = window + (window - target) * k (+ lift)
  function through(sp, tgt, k = 1.2, lift = 0) { sp.target.position.copy(tgt); sp.position.copy(winC).add(winC.clone().sub(tgt).multiplyScalar(k)); sp.position.y += lift; }
  const screenKey = new THREE.SpotLight('#86b6ff', 0, 2.4, 0.95, 0.9, 2); screenKey.position.set(0.28, 0.58, -0.96); screenKey.target.position.set(0.28, 0.62, -0.3);
  screenKey.castShadow = true; screenKey.shadow.mapSize.set(1024, 1024); screenKey.shadow.bias = -0.0006; screenKey.shadow.camera.near = 0.03; scene.add(screenKey, screenKey.target);
  const amber = new THREE.PointLight('#ff9a3c', 0, 1.4, 2); amber.position.set(-0.06, 0.62, -0.92); scene.add(amber);
  const bounce = new THREE.PointLight('#ffcf9a', 0, 3, 2); bounce.position.set(-0.6, 0.25, 0.2); scene.add(bounce);
  const badgeLight = new THREE.SpotLight('#ffd9e8', 0, 2.2, 0.22, 0.7, 1.5); badgeLight.position.set(-0.85, 1.05, 0.55); scene.add(badgeLight, badgeLight.target);
  const rimPink = new THREE.DirectionalLight(PINK, 0); rimPink.position.set(-3, 5, -6); scene.add(rimPink);
  const lapKey = new THREE.DirectionalLight('#9cc0ff', 0); lapKey.position.set(-2, 6, 7); scene.add(lapKey);
  const lapAmber = new THREE.PointLight('#ff9a3c', 0, 14, 1.4); lapAmber.position.set(-3.2, 1.0, 2.5); scene.add(lapAmber);
  const clawdKey = new THREE.SpotLight('#ffffff', 0, 8, 0.4, 0.6, 1.2); scene.add(clawdKey, clawdKey.target);
  const rig = { hemi, sun, neon, screenKey, amber, bounce, badgeLight, rimPink, lapKey, lapAmber, clawdKey };
  function lightsOff() { for (const l of Object.values(rig)) l.intensity = 0; }

  // ------------------------------------------------------------ dust in the beams
  const NM = 260, dpos = new Float32Array(NM * 3), dbase = [];
  for (let i = 0; i < NM; i++) dbase.push([hsh(i, 11), hsh(i, 12), hsh(i, 13), hsh(i, 14)]);
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const dustMat = new THREE.PointsMaterial({ size: 0.012, map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ffffff', opacity: 0.8 });
  const dust = new THREE.Points(dustGeo, dustMat); dust.frustumCulled = false; scene.add(dust);
  function dustIn(t, box, col, k = 1) {   // motes drifting inside an axis box [x0,y0,z0,x1,y1,z1]
    for (let i = 0; i < NM; i++) { const [a, b, c, d] = dbase[i];
      dpos[i * 3] = lerp(box[0], box[3], (a + 0.012 * t * (d - .5) + 0.004 * Math.sin(t * 0.7 + d * 9)) % 1);
      dpos[i * 3 + 1] = lerp(box[1], box[4], ((b + 0.02 * t * (0.3 + d)) % 1));
      dpos[i * 3 + 2] = lerp(box[2], box[5], (c + 0.006 * Math.sin(t * 0.5 + a * 7)) % 1); }
    dustGeo.attributes.position.needsUpdate = true; dustMat.color.set(col); dustMat.opacity = 0.75 * k; dust.visible = k > 0.01;
  }

  return { R, L, kai, jay, RN, LN, KN, JN, B, CAM, PK, PJ, setStates, ROOM_DEF, screens, screenMat, liveTex, live, poseKai, rootDir, rootVec, head, wp,
    hookPos, badgePivot, occSun, occNeon, through, card, badgeMats, hinge, curtains, lampBulbs, nightGlassMat, dayGlassMat, glassNight, glassDay, rig, lightsOff, dustIn, dust, winC };
}
