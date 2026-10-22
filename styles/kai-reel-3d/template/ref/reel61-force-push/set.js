// set.js (reel61-force-push, built from reel58-api-key): a giant laptop on a late-night desk at Blocky-Kai scale (metres; Kai ≈ 0.98 m).
// Kai sits on a giant computer mouse; Clawd stands on the key tops. The laptop lid = the canvas screen (terminal, team chat, README).
// Clawd's backup branch is a glowing green git-branch glyph with a name tag that pops up on the deck at l18.
// Lights: teal night ambient, warm key front-left, the screen as a cool rim, a desk lamp, an alarm light reel.js pulses red.
import * as THREE from 'three';
import { V, hsh } from './stage.js';

export const DECK = 0.07;                                         // key-top height (characters stand here)
export const SCR = { x: 0, y: 0.95, z: -0.95, w: 2.6, h: 1.62 };  // laptop screen centre / size (16:10)
export const SEAT = { x: 0.2, z: 0.02, h: 0.215 };                // the mouse: top = DECK + h
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0, ...o });
const box = (w, h, d, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.castShadow = b.receiveShadow = true; return b; };
const lbl = (txt, w, h, px, fg, bg, fam = 'Menlo, "SF Mono", monospace') => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); } g.fillStyle = fg; g.font = `700 ${px}px ${fam}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(txt, w / 2, h / 2 + px * 0.04); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

// a git branch glyph standing on the key tops (main line with 3 commit dots + a branch arc to a 4th, glowing green) and a name tag
function makeBranch(tagText) {
  const g = new THREE.Group(), m = std('#3fd27a', { roughness: 0.35, emissive: new THREE.Color('#1f8a48'), emissiveIntensity: 0.9 });
  const tube = (a, b) => { const c = new THREE.CatmullRomCurve3([a, a.clone().lerp(b, 0.5).add(V(0, 0, 0)), b]);
    const o = new THREE.Mesh(new THREE.TubeGeometry(c, 12, 0.012, 8), m); o.castShadow = true; return o; };
  const dot = (p) => { const o = new THREE.Mesh(new THREE.SphereGeometry(0.03, 20, 14), m); o.position.copy(p); o.castShadow = true; return o; };
  const p0 = V(0, 0.04, 0), p1 = V(0, 0.16, 0), p2 = V(0, 0.28, 0), pb = V(0.12, 0.33, 0);
  g.add(tube(p0, p2), dot(p0), dot(p1), dot(p2));
  const arc = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p1, V(0.12, 0.18, 0), pb), 14, 0.012, 8), m); g.add(arc, dot(pb));
  const tagM = new THREE.MeshStandardMaterial({ map: lbl(tagText, 1024, 200, 78, '#0d1117', '#3fd27a'), roughness: 0.8, emissive: new THREE.Color('#123'), emissiveIntensity: 0.2 });
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.0625), tagM); tag.position.set(0.06, 0.42, 0.0); g.add(tag);
  return { g, m, tagM };
}

export function buildSet(S) {
  const scene = S.scene, G = new THREE.Group(); scene.add(G);
  scene.background = new THREE.Color('#03070c');
  // ---------------------------------------------------------------- lights
  const hemi = new THREE.HemisphereLight('#5fa0c8', '#0c1014', 0.75); scene.add(hemi);
  const key = new THREE.DirectionalLight('#ffd6b0', 2.2); key.position.set(-0.6, 1.5, 1.8); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -1.2, right: 1.2, top: 1.2, bottom: -0.6, near: 0.1, far: 6 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.01;
  key.target.position.set(0, 0.3, 0); scene.add(key, key.target);
  const scrLight = new THREE.DirectionalLight('#a8c8ff', 2.0); scrLight.position.set(0.1, 1.0, -1.6); scrLight.target.position.set(0, 0.3, 0.3); scene.add(scrLight, scrLight.target);
  const fill = new THREE.DirectionalLight('#6fb4c9', 0.6); fill.position.set(1.4, 0.6, 1.2); fill.target.position.set(0, 0.35, 0); scene.add(fill, fill.target);
  const screenGlow = new THREE.PointLight('#d4e2ff', 0.6, 2.4, 2); screenGlow.position.set(0, 0.8, SCR.z + 0.35); scene.add(screenGlow);
  const alarm = new THREE.PointLight('#ff2a2a', 0, 3.2, 1.6); alarm.position.set(-0.1, 0.9, -0.55); scene.add(alarm);            // reel.js pulses it
  const alarmF = new THREE.PointLight('#ff3030', 0, 2.5, 1.8); alarmF.position.set(0.9, 0.5, 0.9); scene.add(alarmF);             // a softer red from the front-right
  // ---------------------------------------------------------------- room: desk slab, back wall
  const desk = box(6, 0.04, 4, std('#1a1512', { roughness: 0.6 })); desk.position.set(0, -0.02, 0.2); G.add(desk);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), std('#0b151b', { roughness: 0.95 })); wall.position.set(0, 2.0, -2.4); G.add(wall);
  // ---------------------------------------------------------------- laptop: aluminium deck, dark keys
  const KW = 0.25, GAP = 0.035, rows = [], keys = [], mtx = new THREE.Matrix4();
  for (let r = 0; r < 7; r++) { const z = 0.75 - r * (KW + GAP); let x = -1.9 + (r % 2) * 0.12;
    while (x < 1.9) { const w = KW * (hsh(r, x * 9) > 0.86 ? 1.9 : 1); keys.push([x + w / 2, z, w]); x += w + GAP; } rows.push(z); }
  const kb = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.03, rows.length * (KW + GAP) + 0.1), std('#5d6470', { roughness: 0.45, metalness: 0.2, emissive: new THREE.Color('#0f3a44'), emissiveIntensity: 0.35 }));
  kb.position.set(0, 0.015, (rows[0] + rows[rows.length - 1]) / 2); kb.receiveShadow = true; G.add(kb);
  const caps = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std('#1c2027', { roughness: 0.55 }), keys.length); caps.castShadow = caps.receiveShadow = true;
  keys.forEach(([x, z, w], i) => { mtx.compose(V(x, DECK / 2 + 0.01, z), new THREE.Quaternion(), V(w, DECK - 0.02, KW)); caps.setMatrixAt(i, mtx); }); G.add(caps);
  const lg = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.06, 0.012), new THREE.MeshBasicMaterial({ color: new THREE.Color('#8fc4d8').multiplyScalar(0.6) }), keys.length);
  keys.forEach(([x, z, w], i) => { mtx.compose(V(x - w * 0.25, DECK + 0.001, z - 0.06), new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -Math.PI / 2), V(1, 1, 1)); lg.setMatrixAt(i, mtx); }); G.add(lg);
  // ---------------------------------------------------------------- Kai's seat: a giant mouse (half-ellipsoid, wheel, teal light strip)
  const seat = new THREE.Group(); seat.position.set(SEAT.x, 0, SEAT.z); G.add(seat);
  const mouse = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2), std('#d6d9e0', { roughness: 0.35 }));
  mouse.scale.set(0.2, DECK + SEAT.h, 0.27); mouse.castShadow = mouse.receiveShadow = true; seat.add(mouse);
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.022, 20), std('#2a2d35', { roughness: 0.5 })); wheel.rotation.z = Math.PI / 2; wheel.position.set(0, 0.235, 0.16); seat.add(wheel);
  const strip = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 60), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 1.6, 1.8) })); strip.rotation.x = Math.PI / 2; strip.scale.set(0.2, 0.27, 1); strip.position.y = 0.02; seat.add(strip);
  // ---------------------------------------------------------------- Clawd's backup branch (hidden until "branch", l18)
  const branch = makeBranch('clawd/backup-main'); branch.g.position.set(-0.66, DECK, 0.02); branch.g.rotation.y = 0.35; G.add(branch.g);
  // a warm desk lamp pool behind Kai, and Clawd's key glow (flashes when he lands on the keys)
  const lamp = new THREE.PointLight('#ffb36b', 1.3, 1.6, 2); lamp.position.set(0.75, 0.75, -0.3); scene.add(lamp);
  const keyGlow = new THREE.PointLight('#ffb36b', 0, 0.6, 2); scene.add(keyGlow);
  const branchGlow = new THREE.PointLight('#5cff9a', 0, 0.9, 2); branchGlow.position.set(-0.62, 0.25, 0.15); scene.add(branchGlow);
  // ---------------------------------------------------------------- laptop lid (canvas screen: terminal, team chat, README)
  const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 1000; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const lid = box(SCR.w + 0.1, SCR.h + 0.1, 0.04, std('#4c525d', { roughness: 0.4, metalness: 0.3 })); lid.position.set(SCR.x, SCR.y, SCR.z - 0.03); G.add(lid);
  const bez = box(SCR.w + 0.05, SCR.h + 0.05, 0.01, std('#07080b', { roughness: 0.4 })); bez.position.set(SCR.x, SCR.y, SCR.z - 0.006); G.add(bez);
  const scrMat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.25, 1.25, 1.3) });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(SCR.w, SCR.h), scrMat); scr.position.set(SCR.x, SCR.y, SCR.z); G.add(scr);
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, SCR.w, 16), std('#3a3f48', { roughness: 0.4, metalness: 0.3 })); hinge.rotation.z = Math.PI / 2; hinge.position.set(0, 0.07, SCR.z + 0.01); G.add(hinge);
  scene.updateMatrixWorld(true);
  const scrW = (u, v) => V(SCR.x + (u - 0.5) * SCR.w, SCR.y + (0.5 - v) * SCR.h, SCR.z + 0.002);
  return { G, key, scrLight, fill, hemi, screenGlow, scr, scrMat, tex, cv, ctx: cv.getContext('2d'), scrW, seat, kb, lamp, keyGlow, branchGlow, alarm, alarmF, branch, tick() {} };
}
