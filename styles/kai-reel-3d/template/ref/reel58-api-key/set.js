// set.js (reel58-api-key): a giant laptop on a late-night desk at Blocky-Kai scale (metres; Kai ≈ 0.98 m). Kai sits on a giant
// computer mouse; Clawd stands on the key tops. Between them lies "the API key" as a giant gold door key with a paper tag (and later
// a second, new one). The laptop lid = the canvas screen (GitHub). The dark wall around the lid hides the bots: pairs of red LED
// eyes that reel.js switches on/off. Lights: teal night ambient, warm key front-left, the screen as a cool rim from behind, a desk
// lamp, and an alarm light reel.js pulses red while the key is live.
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

// a giant old-fashioned door key lying flat (bow ring + shaft + bit) with a paper tag; origin = the shaft centre on the deck
function makeKey(tagText) {
  const g = new THREE.Group(), m = std('#e9b443', { roughness: 0.32, metalness: 0.35, emissive: new THREE.Color('#5a3a08'), emissiveIntensity: 0.5 });
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.024, 14, 36), m); bow.rotation.x = -Math.PI / 2; bow.position.set(-0.23, 0.024, 0);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.34, 16), m); shaft.rotation.z = Math.PI / 2; shaft.position.set(0.0, 0.02, 0);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.03, 16), m); collar.rotation.z = Math.PI / 2; collar.position.set(-0.14, 0.022, 0);
  const bit1 = box(0.035, 0.03, 0.07, m); bit1.position.set(0.14, 0.017, 0.045); const bit2 = box(0.03, 0.03, 0.045, m); bit2.position.set(0.085, 0.017, 0.032);
  for (const o of [bow, shaft, collar]) { o.castShadow = o.receiveShadow = true; }
  g.add(bow, shaft, collar, bit1, bit2);
  const tagM = new THREE.MeshStandardMaterial({ map: lbl(tagText, 1024, 256, 64, '#2a2016', '#f4ead2'), roughness: 0.9 });
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.075), tagM); tag.rotation.set(-Math.PI / 2, 0, 0.12); tag.position.set(-0.27, 0.004, 0.13); tag.receiveShadow = true;
  const str = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.11, 6), std('#c9b28a')); str.rotation.set(Math.PI / 2, 0, -0.5); str.position.set(-0.25, 0.006, 0.07);
  g.add(tag, str);
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
  // ---------------------------------------------------------------- the API key (gold), the new key (hidden until l18)
  const apiKey = makeKey('sk-TOTALLY-REAL-123'); apiKey.g.position.set(-0.02, DECK, 0.34); apiKey.g.rotation.y = 0.42; G.add(apiKey.g);
  const newKey = makeKey('sk-TOTALLY-REAL-456'); newKey.g.position.set(-0.16, DECK + 0.004, 0.52); newKey.g.rotation.y = -0.3; G.add(newKey.g);
  // ---------------------------------------------------------------- bot eyes: red LED slot pairs in the dark around the laptop lid
  const NB = 22, BOTS = [];
  for (let i = 0; i < NB; i++) {
    const side = i % 3, z = -1.35 - 0.9 * hsh(i, 2);
    const x = side === 0 ? -1.55 - 0.7 * hsh(i, 3) : side === 1 ? 1.55 + 0.7 * hsh(i, 3) : -1.2 + 2.4 * hsh(i, 3);
    const y = side === 2 ? 1.9 + 0.6 * hsh(i, 4) : 0.35 + 1.9 * hsh(i, 4);
    BOTS.push({ p: V(x, y, z), s: 0.8 + 0.6 * hsh(i, 5), seed: i });
  }
  const eyeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 0.35, 0.25) });
  const botEyes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.022, 0.03, 0.004), eyeM, NB * 2); botEyes.frustumCulled = false; G.add(botEyes);
  // a warm desk lamp pool behind Kai, and Clawd's key glow (flashes when he lands on the keys)
  const lamp = new THREE.PointLight('#ffb36b', 1.3, 1.6, 2); lamp.position.set(0.75, 0.75, -0.3); scene.add(lamp);
  const keyGlow = new THREE.PointLight('#ffb36b', 0, 0.6, 2); scene.add(keyGlow);
  const keyShine = new THREE.PointLight('#ffd27a', 0.5, 0.5, 2); keyShine.position.set(-0.02, 0.22, 0.4); scene.add(keyShine);   // the gold key's little glow
  // ---------------------------------------------------------------- laptop lid (canvas screen; GitHub lives here)
  const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 1000; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const lid = box(SCR.w + 0.1, SCR.h + 0.1, 0.04, std('#4c525d', { roughness: 0.4, metalness: 0.3 })); lid.position.set(SCR.x, SCR.y, SCR.z - 0.03); G.add(lid);
  const bez = box(SCR.w + 0.05, SCR.h + 0.05, 0.01, std('#07080b', { roughness: 0.4 })); bez.position.set(SCR.x, SCR.y, SCR.z - 0.006); G.add(bez);
  const scrMat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.25, 1.25, 1.3) });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(SCR.w, SCR.h), scrMat); scr.position.set(SCR.x, SCR.y, SCR.z); G.add(scr);
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, SCR.w, 16), std('#3a3f48', { roughness: 0.4, metalness: 0.3 })); hinge.rotation.z = Math.PI / 2; hinge.position.set(0, 0.07, SCR.z + 0.01); G.add(hinge);
  scene.updateMatrixWorld(true);
  const scrW = (u, v) => V(SCR.x + (u - 0.5) * SCR.w, SCR.y + (0.5 - v) * SCR.h, SCR.z + 0.002);
  return { G, key, scrLight, fill, hemi, screenGlow, scr, scrMat, tex, cv, ctx: cv.getContext('2d'), scrW, seat, kb, lamp, keyGlow, keyShine, alarm, alarmF,
    apiKey, newKey, BOTS, botEyes, tick() {} };
}
