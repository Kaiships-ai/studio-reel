// cover.js: one still "diorama poster" cover. URL: cover.html?title=4 PLUGINS BEFORE YOU VIBE CODE&scene=plugins
// A miniature room (floor slab + 2 walls + night-city window), a hanging wooden sign with the title, Blocky Kai + Clawd.
// Add a scene: one more key in SCENES below (a function that adds props to the room and may pose Clawd).
import * as THREE from 'three';
import { createStage, V } from './stage.js';
import { loadKai } from './cast.js';
import { createClawd } from '../engine/clawd3d.js';
import { applyRole } from '../engine/clawd-roles.js';
import { applyRedesign, scaleHead } from './kai-redesign.js';

const Q = new URLSearchParams(location.search);
const TITLE = (Q.get('title') || '4 PLUGINS BEFORE YOU VIBE CODE').toUpperCase();
const SCENE = Q.get('scene') || 'desk';
const LAYOUT = Q.get('layout') || 'eye';               // eye = straight-on, eye-level desk shot + bottom title card (round 6) · poster = old tilted diorama with the hanging sign
const S = createStage(), scene = S.scene; scene.background = new THREE.Color('#0d1124');
const C = { navy: '#1b2340', navy2: '#252f55', orange: '#e8823a', cream: '#f3e6cc', wood: '#7a4a2a', wood2: '#5a331c' };
const ROOM = new THREE.Group(); ROOM.scale.setScalar(Number(Q.get('room') ?? 0.64)); ROOM.rotation.y = Number(Q.get('rry') ?? -0.45);
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0, ...o });
const box = (w, h, d, m, x = 0, y = 0, z = 0, p = ROOM) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'string' ? std(m) : m);
  b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; p.add(b); return b; };
const cyl = (r, h, m, x, y, z, p = ROOM, rt = r) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, r, h, 28), typeof m === 'string' ? std(m) : m);
  c.position.set(x, y, z); c.castShadow = c.receiveShadow = true; p.add(c); return c; };
function canvasTex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; return t; }
const label = (txt, w, h, bg, fg, font = 'Anton') => canvasTex(512, Math.round(512 * h / w), (g, W, H) => {
  g.fillStyle = bg; g.fillRect(0, 0, W, H); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  let s = H * 0.7; do { g.font = `${s}px ${font}`; s -= 2; } while (g.measureText(txt).width > W * 0.86); g.fillText(txt, W / 2, H / 2 + s * 0.04); });

// ---------------------------------------------------------------- room: floor slab, back + left wall, window with city lights
box(3.4, 0.16, 2.6, C.navy2, 0, -0.08, 0);                                            // slab
box(3.4, 0.03, 2.6, std('#3a2a22', { roughness: 0.9 }), 0, 0.005, 0);                  // floorboards (dark wood)
const rug = new THREE.Mesh(new THREE.CircleGeometry(0.9, 48), std('#8a4a2e')); rug.rotation.x = -Math.PI / 2; rug.position.set(0.05, 0.022, 0.25); rug.receiveShadow = true; ROOM.add(rug);
box(3.4, 2.9, 0.12, C.navy, 0, 1.45, -1.3);                                            // back wall
box(0.12, 2.9, 2.6, C.navy, -1.7, 1.45, 0);                                            // left wall
box(3.4, 0.12, 0.14, C.wood2, 0, 0.06, -1.22);                                         // skirting
const city = canvasTex(512, 512, (g, W, H) => {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0b1030'); gr.addColorStop(1, '#2c2350'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  let r = 7; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++) { const bw = 30 + rnd() * 60, bh = 120 + rnd() * 300, x = rnd() * W; g.fillStyle = `rgb(${18 + rnd() * 14},${20 + rnd() * 14},${45 + rnd() * 20})`; g.fillRect(x, H - bh, bw, bh);
    for (let y = H - bh + 10; y < H - 6; y += 14) for (let xx = x + 5; xx < x + bw - 6; xx += 11) if (rnd() < 0.35) { g.fillStyle = rnd() < 0.7 ? '#ffc977' : '#ffe9b8'; g.fillRect(xx, y, 5, 7); } }
  g.fillStyle = '#fff3d0'; g.beginPath(); g.arc(W * 0.78, H * 0.16, 22, 0, 7); g.fill(); });
const win = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshBasicMaterial({ map: city })); win.position.set(-1.635, 1.45, -0.25); win.rotation.y = Math.PI / 2; ROOM.add(win);
for (const [w, h, y, z] of [[0.06, 1.1, 1.45, 0.27], [0.06, 1.1, 1.45, -0.77], [0.06, 0.06, 2.0, -0.25], [0.06, 0.06, 0.9, -0.25], [0.04, 1.0, 1.45, -0.25]]) box(0.08, h, z === -0.25 && h < 0.1 ? 1.1 : w, C.cream, -1.62, y, z);
box(0.08, 0.04, 1.0, C.cream, -1.62, 1.45, -0.25);
const sill = box(0.2, 0.05, 1.2, C.wood, -1.56, 0.88, -0.25);
// framed poster + shelf on the back wall
box(0.6, 0.42, 0.03, C.orange, 1.0, 1.55, -1.23); box(0.5, 0.32, 0.031, C.cream, 1.0, 1.55, -1.225);
box(0.9, 0.04, 0.22, C.wood, 0.9, 1.05, -1.15);
[[0.62, '#e8823a'], [0.7, '#f3e6cc'], [0.77, '#3e5aa0'], [0.84, '#c4683a']].forEach(([x, c], i) => box(0.06, 0.22 - i * 0.02, 0.16, c, x, 1.18 - i * 0.01, -1.15));
cyl(0.07, 0.12, '#c4683a', 1.15, 1.13, -1.15); const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), std('#4f7a52')); leaf.position.set(1.15, 1.26, -1.15); ROOM.add(leaf);

// ---------------------------------------------------------------- lights: warm practicals + cool window
scene.add(new THREE.HemisphereLight('#8a96d0', '#2a1a14', 0.55));
const key = new THREE.DirectionalLight('#ffd2a0', 2.2); key.position.set(2.2, 4, 3); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 3, bottom: -1, near: 0.5, far: 12 }); key.shadow.bias = -0.0004; scene.add(key);
const front = new THREE.SpotLight('#ffe2c4', 10, 9, 0.5, 0.8, 1.5); front.position.set(0.2, 2.2, 3.4); front.target.position.set(0, 0.7, 0); scene.add(front, front.target);
const winL = new THREE.PointLight('#7f90ff', 3, 2.5, 1.5); winL.position.set(-1.3, 1.5, -0.25); scene.add(winL);
const warm = (x, y, z, i = 2.5, d = 1.6) => { const l = new THREE.PointLight('#ffae5c', i, d, 1.6); l.position.set(x, y, z); ROOM.add(l); return l; };
// string lights along the back wall top (bright bulbs → bokeh)
for (let i = 0; i < 13; i++) { const x = -1.55 + i * 0.25, y = 2.62 - Math.sin(i / 12 * Math.PI) * 0.12; const b = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc070').multiplyScalar(4) })); b.position.set(x, y, -1.2); ROOM.add(b); }
warm(0, 2.4, -0.9, 1.5, 2.5);

// ---------------------------------------------------------------- hanging wooden sign with the title (auto-fit 2 lines)
function signTex(text) {
  return canvasTex(2048, 1000, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#8a5532'); gr.addColorStop(1, '#6a3d22'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.globalAlpha = 0.18; for (let i = 0; i < 70; i++) { g.strokeStyle = i % 2 ? '#3d2010' : '#b07a50'; g.lineWidth = 2 + (i % 5); g.beginPath(); const y = (i * 137) % H; g.moveTo(0, y); g.bezierCurveTo(W * 0.3, y + 12, W * 0.6, y - 12, W, y + 4); g.stroke(); }
    g.globalAlpha = 1; g.strokeStyle = '#4a2814'; g.lineWidth = 26; g.strokeRect(13, 13, W - 26, H - 26);
    // split into ≤ 2 balanced lines
    const words = text.split(/\s+/); let best = [text];
    if (words.length > 1) { let bd = 1e9; for (let k = 1; k < words.length; k++) { const a = words.slice(0, k).join(' '), b = words.slice(k).join(' '); g.font = '100px Anton'; const d = Math.abs(g.measureText(a).width - g.measureText(b).width); if (d < bd) { bd = d; best = [a, b]; } } }
    const lines = best, maxW = W * 0.88, lh = H * 0.8 / lines.length;
    let s = lh * 0.95; g.font = `${s}px Anton`; while (Math.max(...lines.map(l => g.measureText(l).width)) > maxW) { s -= 4; g.font = `${s}px Anton`; }
    g.textAlign = 'center'; g.textBaseline = 'middle'; const y0 = H / 2 - (lines.length - 1) * s * 0.55;
    lines.forEach((l, i) => { const y = y0 + i * s * 1.1;
      g.fillStyle = 'rgba(30,12,4,.55)'; g.fillText(l, W / 2 + 8, y + 10); g.fillStyle = C.cream; g.fillText(l, W / 2, y); });
  });
}
const sign = new THREE.Group(); scene.add(sign);
scene.add(ROOM); sign.position.set(0.05, 1.62, 0.45);
const SW = 1.08, SH = SW * 1000 / 2048;
const board = box(SW, SH, 0.06, std(C.wood2), 0, 0, 0, sign);
const face = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshStandardMaterial({ map: signTex(TITLE), roughness: 0.85, emissive: '#ffffff', emissiveMap: null, emissiveIntensity: 0 }));
face.position.z = 0.031; sign.add(face);
for (const x of [-SW * 0.38, SW * 0.38]) { cyl(0.008, 1.4, '#d8c49a', x, SH / 2 + 0.7, 0, sign); cyl(0.02, 0.03, '#888', x, SH / 2 - 0.01, 0.035, sign); }
sign.rotation.z = -0.025;
const signLight = new THREE.SpotLight('#fff0d8', 14, 4, 0.55, 0.6, 1.2); signLight.position.set(0, 1.0, 2.6); signLight.target = face; scene.add(signLight);

// ---------------------------------------------------------------- cast
const K = await loadKai(scene, S.renderer);
const KAI_V = applyRedesign(K, Q.get('kai'));          // kai=v1|v2|v3 face redesign prototypes (src/kai-redesign.js)
console.log('LOG clips', Object.keys(K.clips).join(','));
K.holder.position.set(0.36, 0.02, 0.25); K.holder.rotation.y = -0.2;
const PROBE = Q.has('probe');
// Kai poses (never the neutral stand): a clip moment + bone turns in Kai's model space (+x his left, +y up, +z forward) + a mouth   // eye-layout covers: NEVER wave/point/thumbs — Kai 2026-10-20: the raised mitt hand looks creepy; hands stay down (typing or chin)
const X = V(1, 0, 0), Y = V(0, 1, 0), Z = V(0, 0, 1);
const POSES = {
  // casual set (round 5 default): relaxed, friendly
  wave:    { clip: ['agree', 0.3], turns: [['LeftArm', Z, 1.0], ['LeftArm', X, -0.3], ['LeftForeArm', Z, 1.7], ['LeftHand', Z, 0.2], ['RightArm', Z, -0.15], ['Head', Z, 0.12]], mouth: ['closed', 0] },
  hip:     { clip: ['agree', 0.3], turns: [['LeftArm', Z, 0.75], ['LeftForeArm', Z, -1.7], ['LeftForeArm', X, 0.4], ['RightArm', Z, -0.12], ['Spine', Z, -0.08], ['Head', Z, -0.1]], mouth: ['open', 0.35] },
  hips:    { clip: ['agree', 0.3], turns: [['LeftArm', Z, 0.75], ['LeftForeArm', Z, -1.7], ['LeftForeArm', X, 0.4], ['RightArm', Z, -0.75], ['RightForeArm', Z, 1.7], ['RightForeArm', X, 0.4], ['Head', Z, 0.1]], mouth: ['closed', 0] },
  crossed: { clip: ['agree', 0.3], turns: [['LeftArm', X, -0.9], ['LeftArm', Y, -0.5], ['LeftForeArm', Y, -1.9], ['RightArm', X, -0.9], ['RightArm', Y, 0.5], ['RightForeArm', Y, 1.9], ['Head', Z, 0.08]], mouth: ['closed', 0] },
  thumbs:  { clip: ['agree', 0.3], turns: [['RightArm', Z, -0.3], ['RightArm', X, -0.9], ['RightForeArm', X, -1.15], ['LeftArm', Z, 0.1], ['Head', Z, -0.1]], mouth: ['open', 0.35] },
  rest:    { clip: ['agree', 0.3], turns: [['RightArm', Z, -0.95], ['RightArm', X, -0.3], ['RightForeArm', Z, -0.3], ['LeftArm', Z, 0.1], ['Head', Z, 0.12], ['Head', Y, 0.15]], mouth: ['closed', 0] },
  cheer:   { clip: ['agree', 0.3], turns: [['LeftArm', Z, 2.5], ['RightArm', Z, -2.5], ['LeftForeArm', Z, 0.5], ['RightForeArm', Z, -0.5], ['Head', X, -0.12]], mouth: ['wide', 0.9] },
  point:   { clip: ['agree', 0.3], turns: [['RightArm', Y, (Q.get('flip') === '1' ? -1 : 1) * 0.6], ['RightArm', Z, -2.7], ['RightArm', X, -0.3], ['LeftArm', Z, 0.5], ['Head', X, -0.28], ['Head', Y, -0.15]], mouth: ['O', 0.8] },
  shocked: { clip: ['afraid', 0.9], turns: [['Spine', X, -0.22], ['Head', X, -0.1], ['LeftArm', Z, 0.6], ['RightArm', Z, -0.6]], mouth: ['O', 1] },
  excited: { clip: ['agree', 0.3], turns: [['Spine', X, 0.28], ['LeftArm', Z, 1.1], ['RightArm', Z, -1.1], ['LeftArm', X, 0.7], ['RightArm', X, 0.7], ['Head', X, -0.25]], mouth: ['wide', 1] },
  think:   { clip: ['agree', 0.3], turns: [['RightArm', Z, -0.35], ['RightArm', X, -1.2], ['RightArm', Y, 0.4], ['RightForeArm', X, -2.2], ['LeftArm', Z, 0.75], ['LeftForeArm', Z, -1.7], ['LeftForeArm', X, 0.4], ['Head', Z, -0.2], ['Head', X, -0.08]], mouth: ['wide', 0.8] },
};
const POSE = POSES[Q.get('pose')] ? Q.get('pose') : 'wave';
function applyPose(name) { const P = POSES[name]; K.pose([[P.clip[0], P.clip[1], 1]]); for (const [b, ax, a] of P.turns) K.turn(b, ax, a);
  K.root.updateMatrixWorld(true); K.talk.set({ shape: Q.get('mouth') || P.mouth[0], open: P.mouth[1], blink: 0 }); }
applyPose(POSE);
if (KAI_V) { scaleHead(K, Number(Q.get('khead') ?? KAI_V.headScale)); if (KAI_V.mouth && !Q.get('mouth')) K.talk.set({ shape: KAI_V.mouth, open: 1 }); }
const CRATE = 0.2; const crate = box(0.66, CRATE, 0.5, C.wood, -0.24, CRATE / 2 + 0.02, 0.3, scene);
const ROLE = Q.get('role') || '';
const CL_S = 0.042, CL = createClawd({ contact: true, style: 'flat', headband: !ROLE, jacket: false });
if (ROLE) applyRole(CL, ROLE, { noSet: true });
CL.group.traverse(m => { if (m.isMesh && m.material && !m.material.transparent) { m.castShadow = true; m.receiveShadow = true; } });
CL.group.scale.setScalar(CL_S); scene.add(CL.group);
for (const k of ['body', 'limb']) { const m = CL.materials[k]; if (!m) continue; m.color.set(Q.get('ccol') || '#ffb347');     // canon orange under warm light:
  if (m.emissive) { m.emissive.set(Q.get('cem') || '#ff9a1a'); m.emissiveIntensity = Number(Q.get('cei') ?? 0.3); } }      // a touch of self-light keeps hue ~25–32°
CL.group.position.set(-0.24, CRATE + 0.02, 0.3); CL.group.rotation.y = Number(Q.get('cyaw') ?? 0.2);
CL.update?.(0.3);
const kfill = new THREE.SpotLight('#ffdcc0', 6, 3, 0.35, 0.7, 2); kfill.position.set(0.2, 1.3, 1.6); kfill.target.position.set(0.48, 0.85, 0.15); scene.add(kfill, kfill.target);

// ---------------------------------------------------------------- scenes (props). Add one: SCENES.name = () => { ...props };
const desk = (x, z, w = 0.9) => { box(w, 0.04, 0.5, C.wood, x, 0.42, z); for (const dx of [-w / 2 + 0.05, w / 2 - 0.05]) for (const dz of [-0.2, 0.2]) box(0.04, 0.4, 0.04, C.wood2, x + dx, 0.2, z + dz); return 0.44; };
function laptop(x, y, z, scrTex, ry = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; ROOM.add(g);
  box(0.42, 0.02, 0.28, '#c9ccd4', 0, 0.01, 0, g); const lid = new THREE.Group(); lid.position.set(0, 0.02, -0.14); lid.rotation.x = -0.25; g.add(lid);
  box(0.42, 0.28, 0.015, '#c9ccd4', 0, 0.14, 0, lid); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.39, 0.25), new THREE.MeshBasicMaterial({ map: scrTex })); s.position.set(0, 0.14, 0.009); lid.add(s); return g; }
function lamp(x, y, z) { cyl(0.06, 0.02, '#222', x, y + 0.01, z); cyl(0.008, 0.3, '#222', x, y + 0.16, z); const sh = cyl(0.03, 0.09, std(C.orange, { side: THREE.DoubleSide }), x, y + 0.32, z, scene, 0.08);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd08a').multiplyScalar(5) })); bulb.position.set(x, y + 0.28, z); ROOM.add(bulb); warm(x, y + 0.25, z, 3, 1.4); }
function mug(x, y, z) { cyl(0.04, 0.09, C.cream, x, y + 0.045, z); }
function books(x, y, z, n = 3) { const cs = ['#3e5aa0', C.orange, C.cream, '#c4683a']; for (let i = 0; i < n; i++) { const b = box(0.24, 0.045, 0.17, cs[i % 4], x, y + 0.0225 + i * 0.047, z); b.rotation.y = (i - 1) * 0.15; } }
const codeTex = canvasTex(512, 330, (g, W, H) => { g.fillStyle = '#141a33'; g.fillRect(0, 0, W, H); const cs = ['#e8823a', '#f3e6cc', '#7f90ff', '#9fd18b'];
  for (let i = 0; i < 12; i++) { g.fillStyle = cs[i % 4]; g.fillRect(24 + (i % 3) * 20, 24 + i * 24, 120 + ((i * 73) % 260), 10); } });
const SCENES = {
  desk() { const y = desk(0.0, -0.75, 1.3); laptop(-0.05, y, -0.75, codeTex); mug(0.38, y, -0.68); books(-0.45, y, -0.75); lamp(0.5, y, -0.85); },
  plugins() { // Clawd holds 4 small labelled boxes (stack in his arms)
    const y = desk(0.1, -0.8, 1.2); laptop(0.1, y, -0.8, codeTex); lamp(-0.35, y, -0.9); mug(0.5, y, -0.75);
    const NB = Number(Q.get('boxes') || (TITLE.match(/(\d+)\s+PLUGINS/) || [0, 4])[1]);              // box count = the number in the title
    const cols = [C.orange, C.cream, '#3e5aa0', '#c4683a'], fg = [C.cream, C.navy, C.cream, C.cream], names = Array.from({ length: NB }, (_, i) => 'PLUGIN ' + (i + 1));
    const p = CL.group.position;
    names.forEach((n, i) => { const b = box(0.26, 0.11, 0.19, cols[i % 4], p.x + (i % 2 ? 0.015 : -0.015), p.y + 0.46 + i * 0.112, p.z, scene);
      b.rotation.y = 0.35 + (i % 2 ? -0.08 : 0.08);
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.23, 0.08), new THREE.MeshStandardMaterial({ map: label(n, 0.23, 0.08, cols[i % 4], fg[i % 4]), roughness: 0.8 })); l.position.z = 0.0955; b.add(l); });
    const A = CL.parts.arms; A[0].rotation.z = Number(Q.get('arm') ?? 1.3); A[1].rotation.z = -A[0].rotation.z;
  },
  compact() { // paper notes + a box + red "2%" screen
    const y = desk(0.05, -0.8, 1.3);
    const red = canvasTex(512, 330, (g, W, H) => { g.fillStyle = '#2a0c10'; g.fillRect(0, 0, W, H); g.fillStyle = '#ff3b3b'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '200px Anton'; g.fillText('2%', W / 2, H / 2 - 10); g.font = '44px Anton'; g.fillText('CONTEXT LEFT', W / 2, H - 50); });
    const mon = new THREE.Group(); mon.position.set(0.06, 0.5, -0.25); mon.rotation.y = -0.15; scene.add(mon);      // red 2% monitor between the two (world coords)
    box(0.5, 0.34, 0.03, '#1b1b22', 0, 0.24, 0, mon); box(0.04, 0.1, 0.04, '#1b1b22', 0, 0.03, -0.01, mon);
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.3), new THREE.MeshBasicMaterial({ map: red })); sc.position.set(0, 0.24, 0.016); mon.add(sc);
    const rl = new THREE.PointLight('#ff3b3b', 0.6, 0.5, 2); rl.position.set(0.06, 0.75, -0.05); scene.add(rl);
    lamp(-0.5, y, -0.9); books(0.5, y, -0.8, 2);
    const cb = box(0.3, 0.2, 0.24, '#b98a55', -0.12, 0.12, 0.72, scene); cb.rotation.y = 0.15;
    const kl = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.09), new THREE.MeshStandardMaterial({ map: label('KEEP', 0.24, 0.09, C.cream, C.navy), roughness: 0.8 })); kl.position.z = 0.121; cb.add(kl);
    for (let i = 0; i < 9; i++) { const n = box(0.13, 0.003, 0.17, i % 3 ? C.cream : '#f6d77a', -0.9 + (i * 0.37) % 1.7, 0.03 + i * 0.002, 0.2 + ((i * 0.53) % 0.9)); n.rotation.y = i * 0.7; }
    for (let i = 0; i < 3; i++) { const n = box(0.1, 0.003, 0.13, C.cream, -0.16 + i * 0.04, 0.222 + i * 0.004, 0.72, scene); n.rotation.y = i * 0.5; n.rotation.x = 0.05; }
  },
};
// ---------------------------------------------------------------- eye layout (round 7, gold = "The client said it's great."): own night set, close camera
let EYE = null;
const P = (k, d) => (Q.has(k) ? Number(Q.get(k)) : d);
const FL = Q.get('flip') === '1' ? -1 : 1;                                           // flip=1: mirror the SET (monitor, Clawd, window, props) — never Kai himself
if (LAYOUT === 'eye') {
  sign.visible = false; signLight.intensity = 0; crate.visible = false; ROOM.visible = false;
  scene.traverse(o => { if (o.isLight && !o.isHemisphereLight && o !== key) o.intensity = 0; });               // drop the diorama lights
  scene.traverse(o => { if (o.isHemisphereLight) { o.color.set('#3a4a78'); o.groundColor.set('#120c0a'); o.intensity = P('hemi', 0.1); } });
  scene.background = new THREE.Color('#050a18');
  // night set: deep navy back wall + big mullioned window with a lit city behind Kai's left shoulder
  const LOOK = { night: { wall: '#0b1530', rim: '#9fb6ff', key: '#ffe0c4' }, dusk: { wall: '#24163a', rim: '#ff9fb8', key: '#ffd0a0' }, rain: { wall: '#08161e', rim: '#7fe0d8', key: '#e6eeff' }, day: { wall: '#1c2a44', rim: '#ffffff', key: '#fff2e0' } }[Q.get('sky') || 'night'] || {};
  const NAVY = Q.get('navy') || LOOK.wall || '#0b1530';
  box(6, 4, 0.05, std(NAVY, { roughness: 0.95 }), 0, 1.4, -1.0, scene);
  const sky = (Q.get('sky') || 'night');
  const SKY = { night: ['#0b1a3e', '#1a3270'], dusk: ['#5a3a90', '#ff9a7a'], rain: ['#0a1c26', '#2a5060'], day: ['#5a9ee0', '#a8d4f4'] }[sky] || ['#0b1a3e', '#1a3270'];
  const BLD = { night: ['#060c1c', '#0a1328'], dusk: ['#2a1840', '#3a2254'], rain: ['#0a1a22', '#12262f'], day: ['#2f3b52', '#46546e'] }[sky] || ['#060c1c', '#0a1328'];
  const LIT = sky === 'day' ? 0.02 : sky === 'dusk' ? 0.08 : 0.14;
  const city2 = canvasTex(1024, 1024, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, SKY[0]); gr.addColorStop(1, SKY[1]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (sky === 'dusk') { g.fillStyle = 'rgba(255,200,140,.9)'; g.beginPath(); g.arc(W * 0.7, H * 0.62, 70, 0, 7); g.fill(); }
    let r = 11; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
    for (let L = 0; L < 2; L++) for (let i = 0; i < 18; i++) { const bw = 70 + rnd() * 140, bh = (L ? 220 + rnd() * 200 : 300 + rnd() * 260), x = rnd() * W - 40;
      g.fillStyle = BLD[L]; g.fillRect(x, H - bh, bw, bh);
      for (let y = H - bh + 18; y < H - 10; y += 34) for (let xx = x + 10; xx < x + bw - 14; xx += 26) if (rnd() < LIT * (L ? 1.15 : 0.75)) { g.fillStyle = rnd() < 0.75 ? '#ffcf7a' : '#fff1c4'; g.fillRect(xx, y, 11, 15); } }
    if (sky === 'rain') { g.strokeStyle = 'rgba(190,220,255,.55)'; g.lineWidth = 4; for (let i = 0; i < 260; i++) { const x = rnd() * W, y = rnd() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 8, y + 50); g.stroke(); } }
  });
  const WX = FL * P('wx', -0.25), WY = P('wy', 1.25), WW = P('ww', 2.2), WH = P('wh', 1.5);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(WW, WH), new THREE.MeshBasicMaterial({ map: city2 })); glass.position.set(WX, WY, -0.97); scene.add(glass);
  const frameM = std('#070d1f', { roughness: 0.6 });
  for (const [w, h, x, y] of [[WW + 0.08, 0.05, 0, WH / 2], [WW + 0.08, 0.05, 0, -WH / 2], [0.05, WH, -WW / 2, 0], [0.05, WH, WW / 2, 0], [0.035, WH, 0, 0], [WW, 0.035, 0, 0.12]])
    box(w, h, 0.05, frameM, WX + x, WY + y, -0.95, scene);
  // Kai
  K.pose([['sit', P('sitt', 0.5), 1]]); K.root.updateMatrixWorld(true);
  K.holder.position.set(FL * P('kx', -0.02), P('ky', 0.23), P('kz', -0.05)); K.holder.rotation.y = FL * P('kyaw', 0.18);
  const EP = Q.get('pose') && POSES[Q.get('pose')] ? POSES[Q.get('pose')] : null;                        // optional upper-body turns on top of sit
  if (EP) for (const [bn, ax, an] of EP.turns) if (!/Spine/.test(bn)) { const sw = FL < 0 && Q.get('pose') === 'wave'; K.turn(sw ? bn.replace(/^Left|^Right/, m => m === 'Left' ? 'Right' : 'Left') : bn, ax, sw && ax !== X ? -an : an); }   // flip: wave with the other arm, away from Clawd
  K.root.updateMatrixWorld(true);
  K.talk.set({ shape: Q.get('mouth') || 'closed', open: P('mopen', 0), blink: 0 });
  // desk: top only, deep, receding toward camera
  const DY = P('dy', 0.5), D0 = P('d0', 0.07), DD = P('dd', 1.1);                                          // top height · back edge z · depth
  box(2.4, 0.05, DD, std('#5a3a24', { roughness: 0.7 }), 0.05, DY - 0.025, D0 + DD / 2, scene);
  const kb = box(0.46, 0.018, 0.15, '#1d2234', 0.02, DY + 0.009, D0 + 0.2, scene);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 12; j++) box(0.028, 0.008, 0.026, '#2b3150', -0.17 + j * 0.035, DY + 0.022, D0 + 0.145 + i * 0.034, scene);
  const notes = [['#f6d77a', -0.25, 0.38, 0.3], ['#ff9a5a', -0.02, 0.4, -0.4], ['#f6d77a', 0.15, 0.36, 0.2]];
  for (const [c, x, z, r] of notes) { const n = box(0.09, 0.003, 0.09, c, FL * x, DY + 0.002, D0 + z, scene); n.rotation.y = r; }
  const mug = cyl(P('mugr', 0.032), P('mugh', 0.08), std('#d8d0c2', { roughness: 0.8 }), FL * P('mugx', 0.12), DY + P('mugh', 0.08) / 2, D0 + 0.12, scene);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 8, 20), std('#ece6da', { roughness: 0.55 })); handle.position.set(mug.position.x - FL * 0.036, DY + 0.042, mug.position.z); handle.rotation.y = Math.PI / 2; scene.add(handle);
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.028, 20), std('#2a160c', { roughness: 0.3 })); coffee.rotation.x = -Math.PI / 2; coffee.position.set(mug.position.x, DY + P('mugh', 0.08) + 0.001, mug.position.z); scene.add(coffee);
  // monitor: big, angled to camera, the scene's cool light source
  const mon = new THREE.Group(); mon.position.set(FL * P('mx', 0.42), DY, D0 + P('mz', -0.1)); mon.rotation.y = FL * P('mry', -0.55); scene.add(mon);
  box(0.66, 0.42, 0.03, '#0d0f16', 0, 0.33, 0, mon); box(0.06, 0.12, 0.06, '#0d0f16', 0, 0.06, -0.02, mon); box(0.26, 0.012, 0.18, '#0d0f16', 0, 0.006, -0.02, mon);
  const scrTex = canvasTex(1024, 640, (g, W, H) => { g.fillStyle = '#060b1e'; g.fillRect(0, 0, W, H);
    const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(0,0,40,.25)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const bars = [[60, 90, 380, 28], [60, 150, 240, 28], [100, 330, 300, 28]];
    for (const [x, y, w] of bars) { g.fillStyle = '#f4f8ff'; g.fillRect(FL < 0 ? W - x - w : x, y, w, 28); } });   // flip: right-align the bars so the half that peeks past Kai still shows text
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.38), new THREE.MeshBasicMaterial({ map: scrTex, color: new THREE.Color(1, 1, 1).multiplyScalar(P('scr', 6)) }));
  scr.position.set(0, 0.33, 0.016); mon.add(scr);
  const mlight = new THREE.PointLight('#7fa2ff', P('ml', 2.5), 2.2, 1.6); mlight.position.set(mon.position.x - FL * 0.12, DY + 0.4, mon.position.z + P('mlz', 0.1)); scene.add(mlight);
  // key: warm, screen-left, high → warm-left / cool-right split on the face
  key.color.set('#ffc890'); key.intensity = P('key', 2.6); key.position.set(FL * -2.0, 3.0, 2.6);
  const kspot = new THREE.SpotLight(LOOK.key || '#ffe0c4', P('ks', 8), 5, 0.42, 0.7, 1.4); kspot.position.set(FL * P('ksx', -0.7), 1.5, 1.7); scene.add(kspot, kspot.target);
  const rim = new THREE.SpotLight(LOOK.rim || '#9fb6ff', P('rim', 5), 4, 0.5, 0.6, 1.4); rim.position.set(FL * 0.9, 1.6, -0.8); scene.add(rim, rim.target);
  const lamp2 = new THREE.PointLight('#ffb070', P('lamp', 0.2), 1.2, 2); lamp2.position.set(-0.45, DY + 0.35, D0 + 0.35); scene.add(lamp2);
  // Clawd: foreground, bottom-left, sharp
  for (const k of ['body', 'limb']) { const m = CL.materials[k]; if (m && m.emissive) m.emissiveIntensity = P('cei', 0.2); }
  CL.group.scale.setScalar(P('cls', 0.0095)); CL.group.position.set(FL * P('clx', -0.12), DY, D0 + P('clz', 0.33)); CL.group.rotation.y = FL * P('cyaw', 0.25);
  K.root.updateMatrixWorld(true); const h = new THREE.Vector3(); K.bones.Head.getWorldPosition(h); EYE = h;
  const lift = Math.min(0.08, Math.max(0, (h.y - 0.68) * 1.25));                                  // upright pose = camera sits higher → Clawd stands on a book stack to stay above the title
  if (lift > 0.01) { const cs = ['#c4683a', '#e8dcc0', '#3e5aa0'], n = Math.max(1, Math.round(lift / 0.035)), bh = lift / n;
    for (let i = 0; i < n; i++) { const bk = box(0.16, bh, 0.13, cs[(n - 1 - i) % 3], CL.group.position.x + (i % 2 ? 0.01 : -0.01), DY + bh / 2 + i * bh, CL.group.position.z, scene); bk.rotation.y = 0.2 + (i % 2 ? 0.12 : -0.1); }
    CL.group.position.y += lift; }
  kspot.target.position.copy(h); rim.target.position.copy(h);
  console.log('LOG head', h.toArray().map(v => v.toFixed(2)).join(','));
}
if (LAYOUT !== 'eye' || SCENE === 'plugins') (SCENES[SCENE] || SCENES.desk)();
// eye layout title card (DOM over the canvas): small series tag + 2-line title, last `hl` words in Clawd orange
if (LAYOUT === 'eye') {
  const raw = Q.get('title') || '4 plugins that make Claude Code fly', words = raw.split(/\s+/), hl = Number(Q.get('hl') ?? 1);
  const esc = t => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const card = document.createElement('div'); card.id = 'card'; if (Q.get('col')) card.style.setProperty('--hl', Q.get('col'));
  card.innerHTML = (Q.get('tag') ? `<span class="tag">${esc(Q.get('tag'))}</span>` : '') +
    `<h1>${esc(words.slice(0, words.length - hl).join(' '))} <em>${esc(words.slice(-hl).join(' '))}</em></h1>`;
  document.body.appendChild(card);
}

// ---------------------------------------------------------------- camera: slightly above, tilt-shift DOF focused on the cast
let CAM = { pos: V(Number(Q.get('cx') ?? 0.3), Number(Q.get('cy') ?? 2.1), Number(Q.get('cz') ?? 4.8)), tgt: V(Number(Q.get('tx') ?? 0), Number(Q.get('ty') ?? 0.9), 0), fov: Number(Q.get('fov') ?? 30) };
if (EYE) { const fy = P('fy', 0.06), d = P('cd', 1.6);                                               // eye level (a touch above), straight on, close
  const hy = P('hy', 0.68 + (EYE.y - 0.68) * 1.25);                                                  // fixed eye line (chin pose head height) so every pose shares one frame
  CAM = { pos: V(FL * P('cx', 0.02), hy + fy, d), tgt: V(FL * P('tx', 0.02), hy - P('drop', 0.18), 0), fov: P('fov', 36) }; }
if (Q.has('facecam')) { const h = new THREE.Vector3(); K.bones.Head.getWorldPosition(h); h.y += 0.07; const d = CAM.pos.clone().sub(h).normalize();   // facecam: same angle, close on Kai's face
  CAM.tgt = h; CAM.pos = h.clone().addScaledVector(d, Number(Q.get('fd') ?? 0.75)); CAM.fov = 20; }
S.comp.uniforms.uExpo.value = EYE ? P('expo', 1.0) : 1.15; S.comp.uniforms.uVig.value = EYE ? P('vig', 0.35) : 0.6;
if (EYE) { S.comp.uniforms.uLift.value.set(0, 0, P('lift', 0.004)); S.comp.uniforms.uContrast.value = P('con', 0.3); S.comp.uniforms.uSat.value = P('sat', 0.88); S.comp.uniforms.uBloom.value = P('bloom', 0.15); }
else S.comp.uniforms.uLift.value.set(0.02, 0.02, 0.05);
S.run({ T_END: 0.1, prep: (t) => { if (PROBE) { K.pose([[Q.get('kclip'), t, 1]]); K.talk.set({ shape: 'O', open: 0.7, blink: 0 }); } return { ...CAM, focus: CAM.pos.distanceTo(EYE || V(0, 0.8, 0.2)), aperture: P('ap', EYE ? 0.12 : 0.5) }; } });
