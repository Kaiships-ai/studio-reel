// main.js · "Ten Million Views" Ep1 v3.1 = v3 + Kai's two notes: B2/C2 are flat cream cards (no faint print of him behind), and Clawd is
// Kai's default Clawd (kai-default: loadClawdDefault(scene, scale), no role), tiny, cute, whole in frame, neutral key, in A4 and E6.
// v3 header: "Ten Million Views" Ep1 v3 (one continuous voice take; 40 shots cut on its words). Pure function of t; timeline in
// tl3.json (gen_tl3.py, shared with audio/tmv3/build3.py and renders/shots_v3.json). Learned from saveo Ep1, beat by beat:
//   Problem 1 is explained OVER the scene: the 3D frame turns into a pale print on cream (stage.js paper mode), the ink on top;
//   one solid white card only. Problem 2 happens IN the scene (a pink ring on the caption link, the comments pile up), a short
//   black RULE 1 card. The smart move counts up (4 · 11 · 26 · 41, one picture per number). The trap's name (VANITY METRIC) slams
//   over the scene at the twist, then Theo. Where you stand is voiced. The vote sits on the scene of wanting (his face in the glow).
//   Clawd (v3.1: kai-default from src/cast.js) only decorates: beside You at night in the hook, and one reaction when Theo's copy works.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createStage, V, clamp, seg, ss, sio, eout, lerp, hsh } from './stage.js';
import { buildWorld, PINK } from './world.js';
import { createHud, WHITE } from './hud.js';
import { makePhoneUI, BLUE, CYAN } from './phoneui.js';
import { loadClawdDefault } from '../cast.js';

const Q = new URLSearchParams(location.search);
const TL = await (await fetch('tl3.json')).json();
await Promise.all(['800 20px Inter', '900 20px Inter', '500 20px Inter', '700 20px Inter', '800 20px "JetBrains Mono"', '500 20px "JetBrains Mono"'].map(f => document.fonts.load(f).catch(() => {})));
const S = createStage();
const Wd = await buildWorld(S);
const { R, kai, jay, RN, B, CAM, rig, PK, PJ } = Wd;
const H2 = createHud(S.g2, S.fx.width, S.fx.height), g = S.g2, P = H2.P;
const EV = TL.ev, SH = Object.fromEntries(TL.shots.map(s => [s.id, s]));
const shotOf = (t) => TL.shots.find(s => t >= s.a && t < s.b) ?? TL.shots[TL.shots.length - 1];
window.__SHOT = (t) => shotOf(t).id;
const CREAM = '#EFE9DE', PAPERW = '#FFFFFF', INKC = '#111111', PINKD = '#E8226F';

// ------------------------------------------------------------ voice words on the reel timeline (one take: vo3/words3.json + OFF, in tl3.json)
const WORDS = TL.words.map(w => ({ ...w }));
const HOT = new Set(['ten', 'million', 'half-life', "isn't", 'replays', 'eleven', 'people', 'tell', 'nobody', 'text', 'price', 'past', 'exist', 'smart', 'bio', 'four', 'twenty-six', 'forty-one', 'name', 'vanity', 'metric', 'nothing', 'someone', 'works', 'face', 'theo', 'half', 'selling', 'zero', 'copy', 'better', 'climbing', 'wave', 'dies', 'chase', 'answer', 'pick']);
for (const w of WORDS) w.hot = HOT.has(w.w.toLowerCase().replace(/[.,:?!]/g, ''));
window.__WORDS = WORDS;

// ------------------------------------------------------------ images (Theo's avatar: a render of Jay's face)
const IMG = { theo: new Image() }; IMG.theo.src = 'assets/tmv/theo_avatar.png';
await new Promise(r => { IMG.theo.onload = r; IMG.theo.onerror = r; });

// ------------------------------------------------------------ screens: laptop (code), monitors, desk phone, the hand phone
const lapTex = Wd.liveTex(1024, 640, (g_, w, h, t, mode) => {
  if (typeof mode === 'number') { dash(g_, w, h, t, mode); return; }
  g_.fillStyle = '#0a1230'; g_.fillRect(0, 0, w, h); g_.fillStyle = '#141b3d'; g_.fillRect(0, 0, w, 52);
  const cols = ['#7fb8f0', '#e98a4e', '#5ec4a8', '#c9a0f0', '#d8d8e0', '#ff7aa8'], sp = mode === 'fast' ? 140 : 40, sc = (t * sp) % 36;
  for (let i = 0; i < 18; i++) { const y = 80 + i * 36 - sc; let x = 30 + (hsh(i + Math.floor(t * sp / 36), 3) > .6 ? 48 : 0);
    for (let k = 0; k < 5; k++) { const ww = 40 + 170 * hsh(k, i + Math.floor(t * sp / 36)); g_.fillStyle = cols[Math.floor(hsh(i, k + 2) * 6)]; g_.fillRect(x, y, ww, 16); x += ww + 20; if (x > w - 60) break; } }
});
const roomLaptop = Wd.screens.SCREEN_Laptop?.[0]; if (roomLaptop) roomLaptop.material = Wd.screenMat(lapTex.tex, 2.0);
const monTex = Wd.liveTex(320, 200, (g_, w, h) => { g_.fillStyle = '#0d1530'; g_.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { g_.fillStyle = ['#7fb8f0', '#5ec4a8', '#ff7aa8', '#e9ba4f'][i % 4]; g_.fillRect(14, 16 + i * 22, 60 + 200 * hsh(i, 9), 10); } });
monTex.draw(monTex.g, 320, 200, 0); monTex.tex.needsUpdate = true;
for (const [k, ms] of Object.entries(Wd.screens)) if (/^SCREEN_Monitor/.test(k)) for (const m of ms) m.material = Wd.screenMat(monTex.tex, 1.6);
const deskTex = Wd.liveTex(540, 1080, () => {}); const HPd = createHud(deskTex.g, 540, 1080), UId = makePhoneUI(HPd, EV, IMG);
const deskPhone = Wd.screens.SCREEN_Phone?.[0]; if (deskPhone) deskPhone.material = Wd.screenMat(deskTex.tex, 1.7);
const deskBody = RN.SM_Env_Phone_Body; if (deskBody) { deskBody.position.add(V(0.13, 0, 0.04)); deskPhone.position.add(V(0.13, 0, 0.04)); }
const deskBody0 = deskBody?.position.clone(), deskScr0 = deskPhone?.position.clone();
const phTex = Wd.liveTex(756, 1512, () => {}); phTex.tex.anisotropy = 8; const HP = createHud(phTex.g, 756, 1512), UI = makePhoneUI(HP, EV, IMG);
const PH = new THREE.Group(); S.scene.add(PH);
{ const body = new THREE.Mesh(new RoundedBoxGeometry(0.076, 0.152, 0.009, 4, 0.011), new THREE.MeshStandardMaterial({ color: '#15171d', roughness: 0.32, metalness: 0.65 }));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.0712, 0.1424), Wd.screenMat(phTex.tex, 0.95)); scr.position.z = 0.00462;
  for (const m of [body, scr]) { m.castShadow = true; m.receiveShadow = false; } PH.add(body, scr); PH.scr = scr; }
const phoneGlow = new THREE.PointLight('#8fa6ff', 0, 0.8, 2); PH.add(phoneGlow); phoneGlow.position.set(0, 0.02, 0.16);
const THUMB = new THREE.Group(); PH.add(THUMB);
{ const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.0085, 0.11, 6, 14), new THREE.MeshStandardMaterial({ color: '#d9a07e', roughness: 0.55 }));
  m.position.y = -0.064; THUMB.add(m); const nail = new THREE.Mesh(new THREE.SphereGeometry(0.0062, 12, 8), new THREE.MeshStandardMaterial({ color: '#f0c9b4', roughness: 0.3 }));
  nail.scale.set(1, 1.3, 0.4); nail.position.set(0, -0.012, -0.0068); THUMB.add(nail); THUMB.visible = false; }
const uiLocal = (x, y) => V((x / 1080 - 0.5) * 0.0712, (0.5 - y / 2160) * 0.1424, 0.0047);
function thumbAt(x, y, k, press = 0) {
  THUMB.visible = k > 0.01; if (!THUMB.visible) return;
  const p = uiLocal(x, y); THUMB.position.copy(p).add(V(0.035 * (1 - k), -0.05 * (1 - k), 0.0095 + 0.03 * (1 - k) - 0.0015 * press));
  THUMB.rotation.set(-0.95, 0, 0.55); THUMB.scale.set(1, 1, 1 - 0.15 * press);
}
function tapCurve(t, t0, pre = 0.22, post = 0.25) { const d = t - t0; if (d < -pre || d > post) return [0, 0]; return d < 0 ? [ss(seg(d, -pre, 0)), 0] : [1 - ss(seg(d, 0.06, post)), Math.exp(-d * 25)]; }
function drawPhone(mode, t, o) { UI.draw(mode, t, o); phTex.tex.needsUpdate = true; }
function liveDraw(T, t, mode) { T.draw(T.g, T.c.width, T.c.height, t, mode); T.tex.needsUpdate = true; }

const glassDawn = Wd.liveTex(512, 512, (g_, w, h, t) => {
  const gr = g_.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0a1440'); gr.addColorStop(0.5, '#28286e'); gr.addColorStop(0.78, '#5a2f72'); gr.addColorStop(0.9, '#c0607a'); gr.addColorStop(1, '#ffa060');
  g_.fillStyle = gr; g_.fillRect(0, 0, w, h);
  for (let i = 0; i < 46; i++) { const x = hsh(i, 1) * w, y = h * (0.6 + 0.4 * hsh(i, 2)), r = 2 + 5 * hsh(i, 3); g_.fillStyle = hsh(i, 4) > 0.65 ? 'rgba(255,190,120,.6)' : 'rgba(120,150,255,.35)'; g_.fillRect(x, y, r, r * 1.4); }
  const fl = S.neonLevel ?? 1; g_.save(); g_.globalAlpha = fl; g_.shadowColor = PINK; g_.shadowBlur = 40; g_.strokeStyle = '#ffd1e4'; g_.lineWidth = 10; g_.lineCap = 'round';
  g_.beginPath(); g_.moveTo(w * 0.18, h * 0.34); g_.lineTo(w * 0.62, h * 0.34); g_.moveTo(w * 0.66, h * 0.34); g_.lineTo(w * 0.82, h * 0.34); g_.stroke(); g_.shadowBlur = 80; g_.strokeStyle = PINK; g_.lineWidth = 4; g_.stroke(); g_.restore();
});
const dawnGlassMat = Wd.screenMat(glassDawn.tex, 1.7);
Wd.badgePivot.visible = false; if (RN.ST_badge_held) RN.ST_badge_held.visible = false;

// ------------------------------------------------------------ light looks
const NAVY = new THREE.Color('#070a1c');
const ROOM_ST = { cash: 'low', pride: 'high', mom: 'mid', badge: 'hook' };
function roomCommon(o) { Wd.setStates('room', { ...Wd.ROOM_DEF, ...ROOM_ST, light: 'night', ...(o.states ?? {}) }); Wd.badgePivot.visible = false; for (const b of Wd.lampBulbs) b.material.emissiveIntensity = 1.6; }
function dawn(o = {}) {
  Wd.lightsOff(); Wd.occNeon.visible = true; Wd.occSun.visible = true; roomCommon(o);
  rig.hemi.color.set('#3c4a9c'); rig.hemi.groundColor.set('#170d1d'); rig.hemi.intensity = o.hemi ?? 0.5;
  Wd.through(rig.neon, o.neonTgt ?? V(0.25, 0.6, -0.35), 1.4, 0.3); rig.neon.intensity = (o.neon ?? 4.5) * (S.neonLevel ?? 1);
  Wd.through(rig.sun, o.skyTgt ?? V(0.35, 0.55, -0.2), 1.6, 0.7); rig.sun.color.set(o.skyCol ?? '#6876ff'); rig.sun.intensity = o.sky ?? 3.5;
  rig.screenKey.position.set(0.28, 0.72, -1.12); rig.screenKey.target.position.set(0.28, 0.66, -0.3); rig.screenKey.angle = 0.9; rig.screenKey.color.set('#86b6ff'); rig.screenKey.intensity = 0.75 * (o.screen ?? 3.0);
  rig.amber.position.set(-0.06, 0.6, -0.92); rig.amber.distance = 1.4; rig.amber.intensity = o.amber ?? 0.45;
  for (const c of Wd.curtains) c.material.emissiveIntensity = (o.curtain ?? 0.16) * (S.neonLevel ?? 1);
  if (RN.SM_Env_Window_Glass_night) RN.SM_Env_Window_Glass_night.material = dawnGlassMat;
  S.scene.background = NAVY;
}
function night(o = {}) {
  Wd.lightsOff(); Wd.occNeon.visible = true; Wd.occSun.visible = false; roomCommon(o);
  rig.screenKey.position.set(0.28, 0.72, -1.12); rig.screenKey.target.position.set(0.28, 0.66, -0.3); rig.screenKey.angle = 0.9; rig.screenKey.color.set('#86b6ff');
  rig.hemi.color.set('#3d4380'); rig.hemi.groundColor.set('#1a0f1c'); rig.hemi.intensity = o.hemi ?? 0.45;
  Wd.through(rig.neon, o.neonTgt ?? V(-0.2, 0.55, -0.3), 1.4, 0.3); rig.neon.intensity = o.neon ?? 7;
  rig.screenKey.intensity = 0.75 * (o.screen ?? 3.4); rig.amber.position.set(-0.06, 0.6, -0.92); rig.amber.distance = 1.4; rig.amber.intensity = o.amber ?? 0.25;
  for (const c of Wd.curtains) c.material.emissiveIntensity = 0.2;
  if (RN.SM_Env_Window_Glass_night) RN.SM_Env_Window_Glass_night.material = Wd.nightGlassMat;
  S.scene.background = NAVY;
}
const G_DAWN = { expo: 1.05, bloom: 0.95, bloomTh: 0.82, vig: 1.2, grain: 0.045, sat: 1.12, contrast: 0.3, lift: [0.022, 0.02, 0.055], shadow: [0.86, 0.9, 1.2], hi: [1.07, 0.98, 1.0] };
const G_NIGHT = { expo: 1.0, bloom: 0.9, bloomTh: 0.85, vig: 1.3, grain: 0.05, sat: 0.92, contrast: 0.3, lift: [0.025, 0.02, 0.05], shadow: [0.86, 0.92, 1.18], hi: [1.06, 0.97, 1.02] };
const G_INS = { expo: 1.0, bloom: 0.75, bloomTh: 0.95, vig: 1.0, grain: 0.04, sat: 1.1, contrast: 0.2, lift: [0.015, 0.014, 0.04], shadow: [0.9, 0.92, 1.12], hi: [1.03, 1.0, 1.0] };
const G_FACE = { expo: 0.92, bloom: 0.8, bloomTh: 0.9, vig: 1.25, grain: 0.04, sat: 1.06, contrast: 0.28, lift: [0.02, 0.018, 0.05], shadow: [0.86, 0.9, 1.2], hi: [1.05, 1.0, 0.98] };
S.neonLevel = 1;

// ------------------------------------------------------------ You (Kai's rig)
const SEAT = [0.28, -0.55], DESK_Y = 0.425;
function blink(t) { const p = (t + 0.37) % 3.1; return p < 0.16 ? Math.sin(p / 0.16 * Math.PI) : 0; }
function slump(t, k = 1) {
  const br = Math.sin(t * 2 * Math.PI * 0.22);
  Wd.poseKai({ at: SEAT, yaw: Math.PI, sit: 1, lean: 22 + br * 0.6, curl: 18 * k, head: [30 * k + br, -6, 4], shrug: -4,
    armL: { ik: V(0.14, DESK_Y + 0.02, -0.86), pole: Wd.rootDir(0.9, -0.5, -0.1) }, armR: { ik: V(0.44, DESK_Y + 0.02, -0.86), pole: Wd.rootDir(-0.9, -0.5, -0.1) },
    exp: { exp_tired: 0.9, exp_blink: 1 } });
}
function typing(t, o = {}) {
  const fast = o.fast ?? 0, f = fast ? 26 : 19, a = Math.abs(Math.sin(t * f)), b = Math.abs(Math.sin(t * (f - 2) + 1));
  Wd.poseKai({ at: SEAT, yaw: Math.PI, sit: 1, lean: o.lean ?? (fast ? 14 : 9), head: [o.pitch ?? (fast ? 12 : 8), (o.hy ?? 0) + 2 * Math.sin(t * 0.7), o.hr ?? 0],
    armL: { ik: V(0.2, DESK_Y + 0.03 + 0.012 * a, -0.9), pole: Wd.rootDir(0.9, -0.6, 0) }, armR: { ik: V(0.37, DESK_Y + 0.03 + 0.012 * b, -0.9), pole: Wd.rootDir(-0.9, -0.6, 0) },
    exp: o.exp ?? { exp_determined: 0.6, exp_blink: blink(t) } });
}
// the phone in his hands; o.dp moves it from in front of his eyes (default) down to his chest for the face shots
function holdPhone(t, o = {}) {
  const br = Math.sin(t * 2 * Math.PI * 0.25), fr = o.freeze ? 0 : 1;
  const base = { at: SEAT, yaw: Math.PI, sit: 1, lean: (o.lean ?? 10) + br * 0.5 * fr, curl: o.curl ?? 6, head: [(o.pitch ?? 20) + br * 0.6 * fr, o.hy ?? 0, o.hr ?? 0], shrug: o.shrug ?? 3, exp: o.exp ?? { exp_blink: 0 } };
  Wd.poseKai(base);
  const hd = Wd.head();
  const c = hd.clone().add(V(0.0, -0.075, -0.22)).add(o.dp ?? V(0, 0, 0));
  c.y += 0.003 * Math.sin(t * 1.3) * fr; c.x += 0.002 * Math.sin(t * 0.9) * fr;
  PH.position.copy(c); PH.up.set(0, 1, 0); PH.lookAt(o.look ?? hd.clone().add(V(0, 0.03, 0))); PH.rotateZ(o.roll ?? 0.0); PH.updateMatrixWorld(true);
  const thumb = o.tap ?? 0;
  const hl = PH.localToWorld(V(-0.026, -0.075, -0.012)), hr = PH.localToWorld(V(0.03 - 0.01 * thumb, -0.07 + 0.02 * thumb, -0.008 + 0.012 * thumb));
  Wd.poseKai({ ...base, armL: { ik: hl, pole: Wd.rootDir(0.9, -0.7, -0.3) }, armR: { ik: hr, pole: Wd.rootDir(-0.9, -0.7, -0.3) } });
  return { hd, c, n: hd.clone().sub(c).normalize() };
}
holdPhone(0); const KHEAD = Wd.head();
// expression track: keys [[t, {exp weights}], ...], 0.18 s cross-fade into each key; + a blink unless o.noBlink
function expTrack(t, keys, o = {}) {
  let cur = keys[0][1], prev = null, k = 1;
  for (let i = 0; i < keys.length; i++) if (t >= keys[i][0]) { cur = keys[i][1]; prev = i ? keys[i - 1][1] : null; k = ss(seg(t, keys[i][0], keys[i][0] + (o.fade ?? 0.18))); }
  const e = {}; for (const [n, w] of Object.entries(cur)) e[n] = (e[n] ?? 0) + w * (prev ? k : 1);
  if (prev && k < 1) for (const [n, w] of Object.entries(prev)) e[n] = (e[n] ?? 0) + w * (1 - k);
  if (!o.noBlink) e.exp_blink = Math.max(e.exp_blink ?? 0, blink(t + (o.bo ?? 0)));
  return e;
}

// ------------------------------------------------------------ Theo's corner (far from the room): ring light, a SPEED WINS neon, warm practicals
const TX = 6;
const THEO = new THREE.Group(); S.scene.add(THEO);
{
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(5, 3), new THREE.MeshStandardMaterial({ color: '#1b2433', roughness: 0.85 })); wall.position.set(TX, 1.2, -0.7); wall.receiveShadow = true; THEO.add(wall);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(5, 4), new THREE.MeshStandardMaterial({ color: '#141821', roughness: 0.9 })); floor.rotation.x = -Math.PI / 2; floor.position.set(TX, 0, 0.6); floor.receiveShadow = true; THEO.add(floor);
  const signC = document.createElement('canvas'); signC.width = 1024; signC.height = 256; const sg = signC.getContext('2d');
  sg.fillStyle = '#000'; sg.fillRect(0, 0, 1024, 256); sg.font = '900 150px Inter, Arial'; sg.textAlign = 'center'; sg.textBaseline = 'middle'; sg.shadowColor = '#38D6FF'; sg.shadowBlur = 30; sg.fillStyle = '#d8f7ff'; sg.fillText('SPEED WINS', 512, 132);
  const stex = new THREE.CanvasTexture(signC); stex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.225), new THREE.MeshBasicMaterial({ map: stex, color: new THREE.Color(2.2, 2.2, 2.2), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  sign.position.set(TX + 0.42, 1.28, -0.68); THEO.add(sign);
  for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.018 + 0.01 * hsh(i, 2), 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(...(hsh(i, 5) > 0.5 ? [3.2, 1.9, 0.9] : [0.9, 1.6, 3.0])) }));
    b.position.set(TX - 1.0 + 2.1 * hsh(i, 1), 0.75 + 0.75 * hsh(i, 3), -0.62); THEO.add(b); }
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 0.18), new THREE.MeshStandardMaterial({ color: '#2a3344', roughness: 0.7 })); shelf.position.set(TX - 0.55, 0.92, -0.6); THEO.add(shelf);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.012, 16, 80), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 4, 4.2) })); THEO.ring = ring; THEO.add(ring);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.9, 8), new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.5 })); THEO.pole = pole; THEO.add(pole);
}
THEO.visible = false;
// mode 'type': phone at his chest, thumbs going, head down a little (answering); 'cam': phone up, talking to it (selfie)
function theoPose(t, o = {}) {
  const typ = o.mode === 'type';
  const base = { at: [TX, 0], yaw: 0, sit: 0, lean: typ ? 6 : 2, head: [(typ ? 6 : -4) + 2 * Math.sin(t * 1.7), (typ ? -2 : -6) + 4 * Math.sin(t * 0.9), 4 * Math.sin(t * 1.1)], shrug: 2 };
  PJ.pose(base); const hd = PJ.head();
  if (typ) {
    const a = Math.abs(Math.sin(t * 17)), b = Math.abs(Math.sin(t * 15 + 1));
    PJ.pose({ ...base, armR: { ik: hd.clone().add(V(-0.06, -0.3 + 0.01 * a, 0.22)), pole: PJ.rootDir(-0.8, -0.6, -0.2) }, armL: { ik: hd.clone().add(V(0.06, -0.3 + 0.01 * b, 0.22)), pole: PJ.rootDir(0.8, -0.6, -0.2) }, exp: o.exp });
  } else {
    const hand = hd.clone().add(V(-0.07, -0.08, 0.3));
    PJ.pose({ ...base, armR: { ik: hand, pole: PJ.rootDir(-0.7, -0.8, -0.2) }, armL: { up: PJ.rootDir(0.25, -1, 0.05), fore: PJ.rootDir(0.15, -0.6, 0.6) }, exp: o.exp });
  }
  return PJ.head();
}
function theoLights(t, o = {}) {
  Wd.lightsOff(); Wd.occNeon.visible = false; Wd.occSun.visible = false;
  rig.hemi.color.set('#5a6aa0'); rig.hemi.groundColor.set('#120c18'); rig.hemi.intensity = 0.55;
  const hd = PJ.head();
  rig.clawdKey.color.set('#f4f6ff'); rig.clawdKey.position.copy(hd).add(V(-0.16, 0.05, 0.6)); rig.clawdKey.target.position.copy(hd); rig.clawdKey.angle = 0.55; rig.clawdKey.penumbra = 0.9; rig.clawdKey.intensity = o.key ?? 7;
  rig.rimPink.color.set(PINK); rig.rimPink.position.set(TX + 3, 3, -4); rig.rimPink.target.position.set(TX, 0.8, 0); rig.rimPink.target.updateMatrixWorld(); rig.rimPink.intensity = 3.2;
  rig.lapKey.color.set('#38D6FF'); rig.lapKey.position.set(TX - 3, 2.5, -3); rig.lapKey.intensity = 1.6;
  rig.amber.position.set(TX - 0.6, 1.0, -0.4); rig.amber.distance = 2.0; rig.amber.intensity = 1.2;
  S.scene.background = new THREE.Color('#0b0e16');
}

// ------------------------------------------------------------ cameras
const camLook = (pos, tgt, fov, o = {}) => ({ pos, tgt, fov, ...o });
const drift = (t, a = 1) => V(a * (0.6 * Math.sin(t * 1.13) + 0.4 * Math.sin(t * 2.71 + 1)), a * (0.6 * Math.sin(t * 0.87 + 2) + 0.4 * Math.sin(t * 2.31)), a * 0.5 * Math.sin(t * 0.61 + 3));
const lin = (k) => 0.15 * ss(k) + 0.85 * k;
function insert(t, sh, mode, o = {}) {
  dawn({ screen: 2.4, hemi: 0.42, neon: 3.6, amber: 0.5, sky: 2.8 }); liveDraw(lapTex, t, 'code');
  const k = lin(seg(t, sh.a, sh.b));
  const ph = holdPhone(t, { tap: o.tap ?? 0, roll: o.roll ?? 0 });
  drawPhone(mode, t, o.ui); PH.visible = true; phoneGlow.intensity = 0.0; kai.visible = false; for (const c of CLUTTER) c.visible = false;
  THUMB.visible = false; if (o.thumb) { const [k2, pr, x, y] = o.thumb(t); thumbAt(x, y, k2, pr); }
  const n = ph.n, side = V(n.z, 0, -n.x).normalize(), up = new THREE.Vector3().crossVectors(side, n).normalize().negate();
  const d = lerp(o.d0 ?? 0.27, o.d1 ?? 0.22, o.dk ? o.dk(t) : k);
  const look = PH.localToWorld(V(...(o.look ?? [0, 0, 0])));
  const pos = look.clone().addScaledVector(n, d).addScaledVector(side, lerp(o.x0 ?? 0, o.x1 ?? 0, k) * d).addScaledVector(up, lerp(o.y0 ?? 0, o.y1 ?? 0, k) * d).add(drift(t, 0.0025));
  return camLook(pos, look.clone().add(drift(t + 7, 0.0015)), o.fov ?? 40, { roll: lerp(o.r0 ?? 0, o.r1 ?? 0, k), focus: d, aperture: o.ap ?? 1.0, grade: { ...G_INS, ...(o.grade ?? {}) } });
}
// the wild walls: what stands between his face and a camera on the desk side
const WILD = []; R.traverse(o => { if (o.isMesh && /^SM_Env_(Mon|Laptop|Cable_Mon|Lamp_(Arm|Shade|Base)|Photo|Can2|Mug|Food|Rice|Chopstick)/.test(o.name)) WILD.push(o); });
const WILD_V = new Map(WILD.map(o => [o, o.visible]));
function wild(on) { for (const o of WILD) o.visible = on ? false : WILD_V.get(o); }
// You's face. o: { exp(t), cam: {p0, p1, tg, fov0, fov1, zoomT, r0, r1}, light: {...}, pose: {...}, phone: screen mode, typing }
function faceShot(t, sh, o) {
  const k = lin(seg(t, sh.a, sh.b)), L = o.light ?? {};
  (L.night ? night : dawn)({ screen: L.screen ?? 1.6, neon: L.neon ?? 0.6, hemi: L.hemi ?? 0.32, amber: L.amber ?? 0.55, sky: L.sky ?? 1.6, skyCol: L.skyCol, neonTgt: V(0.25, 0.5, 0.4) });
  liveDraw(lapTex, t, L.lap ?? 'code');
  const ex = o.exp(t), po = o.pose ?? {};
  let hd;
  if (o.typing) { typing(t, { ...po, exp: ex }); hd = Wd.head(); PH.visible = false; }
  else {
    const r = holdPhone(t, { pitch: po.pitch ?? 8, lean: po.lean ?? 6, curl: po.curl ?? 4, hy: po.hy ?? 0, hr: po.hr ?? 0, dp: po.dp ?? V(0.0, -0.2, 0.04), roll: po.roll ?? 0, tap: po.tap ? po.tap(t) : 0, exp: ex, freeze: po.freeze });
    hd = r.hd; PH.visible = true; drawPhone(o.phone ?? 'insights', t, o.ui ?? {});
  }
  wild(o.front !== false);
  const face = hd.clone().add(V(0, 0.075, -0.04));
  // key: the phone's light from below-front; rim: a cold edge from behind; the pink neon from the window side
  const kp = PH.visible ? PH.position.clone().add(V(0, 0.02, -0.02)) : face.clone().add(V(0.0, -0.08, -0.35));
  rig.clawdKey.color.set(L.keyCol ?? '#a9c0ff'); rig.clawdKey.position.copy(kp).lerp(face, 0.2).add(V(L.kx ?? 0, 0, -0.1)); rig.clawdKey.target.position.copy(face); rig.clawdKey.angle = 0.75; rig.clawdKey.penumbra = 1; rig.clawdKey.distance = 3; rig.clawdKey.decay = 1.5;
  rig.clawdKey.intensity = 0.55 * (L.key ?? 2.2) * (L.pulse ? L.pulse(t) : 1);
  rig.rimPink.color.set(L.rimCol ?? '#7f93ff'); rig.rimPink.position.copy(face).add(V(L.rimX ?? -0.9, 1.0, 1.6)); rig.rimPink.target.position.copy(face); rig.rimPink.target.updateMatrixWorld(); rig.rimPink.intensity = L.rim ?? 2.0;
  rig.lapKey.color.set(L.fillCol ?? '#ff6fae'); rig.lapKey.position.copy(face).add(V(L.fillX ?? 1.2, 0.3, -0.8)); rig.lapKey.target?.position?.copy(face); rig.lapKey.target?.updateMatrixWorld?.(); rig.lapKey.intensity = 0.5 * (L.fill ?? 0.7);
  phoneGlow.intensity = 0;
  const c = o.cam, zk = c.zoomT ? eout(seg(t, sh.a, sh.a + c.zoomT)) : k;
  const fov = lerp(c.fov0 ?? 34, c.fov1 ?? c.fov0 ?? 34, zk);
  const off = V(...c.p0).lerp(V(...c.p1 ?? c.p0), c.zoomT ? zk : k);
  const pos = face.clone().add(off).add(drift(t, c.shake ?? 0.003)); pos.z = Math.max(pos.z, -1.16);   // never through the window wall
  const tgt = face.clone().add(V(...(c.tg ?? [0, 0, 0]))).add(drift(t + 5, 0.0015));
  return camLook(pos, tgt, fov, { roll: lerp(c.r0 ?? 0, c.r1 ?? c.r0 ?? 0, k), focus: pos.distanceTo(face), aperture: c.ap ?? 0.9, grade: { ...G_FACE, ...(o.grade ?? {}) } });
}
// Theo's face in his corner
function theoShot(t, sh, o) {
  const k = lin(seg(t, sh.a, sh.b));
  R.visible = false; kai.visible = false; jay.visible = true; THEO.visible = true; PH.visible = false;
  const hd = theoPose(t, { mode: o.mode, exp: o.exp(t) }); theoLights(t, o.light ?? {});
  THEO.ring.position.copy(hd).add(V(-0.2, -0.02, 0.5)); THEO.ring.lookAt(hd); THEO.pole.position.copy(THEO.ring.position).add(V(0, -0.62, 0));
  THEO.ring.visible = o.ring !== false; THEO.pole.visible = o.ring !== false;
  const c = o.cam, face = hd.clone().add(V(0, 0.11, 0.03));
  const pos = face.clone().add(V(...c.p0).lerp(V(...c.p1 ?? c.p0), k)).add(drift(t, 0.003)), tgt = face.clone().add(V(...(c.tg ?? [0, 0, 0])));
  return camLook(pos, tgt, c.fov ?? 32, { roll: lerp(c.r0 ?? 0, c.r1 ?? 0, k), focus: pos.distanceTo(face), aperture: c.ap ?? 0.9, grade: { ...G_DAWN, expo: 1.0, sat: 1.12, ...(o.grade ?? {}) } });
}

// ------------------------------------------------------------ the 3D side, shot by shot
const CLUTTER = ['SM_Env_Can0', 'SM_Env_Can1', 'SM_Env_Can2', 'SM_Env_Mug', 'SM_Env_Mug_Coffee', 'SM_Env_Mug_Handle', 'SM_Env_Food_CupLow0', 'SM_Env_Food_CupLow1', 'SM_Env_Food_CupLow2', 'SM_Env_Food_CupMid', 'SM_Env_Food_CupMidLid', 'SM_Env_Food_Bowl', 'SM_Env_Food_Fruit0', 'SM_Env_Food_Fruit1', 'SM_Env_Food_Fruit2'].map(n => RN[n]).filter(Boolean);
function prep(t, tf) {
  const sh = shotOf(tf ?? t), id = sh.id;
  THUMB.visible = false; wild(false); rig.clawdKey.distance = 8; rig.clawdKey.decay = 1.2;
  for (const c of CLUTTER) c.visible = true;
  R.visible = true; kai.visible = true; jay.visible = false; THEO.visible = false; PH.visible = false; phoneGlow.intensity = 0; Wd.dust.visible = false; CL.group.visible = false; CLKEY.intensity = 0; for (const [b, v] of BULB_V) b.visible = v; PH.scale.setScalar(1);
  S.neonLevel = neonLevel(t);
  if (deskBody) { deskBody.position.copy(deskBody0); deskPhone.position.copy(deskScr0); deskBody.visible = true; deskPhone.visible = true; }
  if (F3D[id]) return F3D[id](t, sh);
  // 2D-only shots: render a black frame cheaply (the overlay covers it)
  R.visible = false; kai.visible = false; S.scene.background = new THREE.Color('#000');
  return camLook(V(0, -50, 0), V(0, -51, 0), 30, { grade: { expo: 0, grain: 0, vig: 0, bloom: 0 } });
}
function neonLevel(t) {   // the sign outside: steady; it gives out as the wave dies (G4)
  const a = EV.waveDies;
  if (t >= a && t < a + 0.6) { const k = t - a, fl = [0, 0.08, 0.15, 0.24, 0.3, 0.42]; let lv = 1; for (let i = 0; i < fl.length; i++) if (k >= fl[i]) lv = i % 2 ? 1 : 0.2; return k > 0.5 ? 0.1 : lv; }
  if (t >= a + 0.6) return 0.1;
  return 0.94 + 0.06 * Math.sin(t * 37) * Math.sin(t * 5.3);
}
const buzzAt = (t) => { for (let i = 0; i < 6; i++) { const b = EV.buzz0 + i * 0.2; if (t >= b && t < b + 0.12) return 1; } return 0; };
// ------------------------------------------------------------ Clawd (decoration only: no lines, no plot): a small desk buddy
// Kai's default Clawd (styles/kai-reel-3d cast: kai-default), as is: flat orange, red >>> headband, zipped red jacket, two slot eyes,
// no mouth. Never tinted; lit by its own neutral key (#fff1e0). Tiny: 0.0062 × ~10.6 units ≈ 6.6 cm tall = a third of the laptop lid
// (0.2 m), well under his head. Origin = between the feet; front = +z.
const CL_S = 0.0062;
const CL = loadClawdDefault(S.scene, CL_S); CL.group.visible = false;
const CLKEY = new THREE.SpotLight('#fff1e0', 0, 0.9, 0.5, 0.9, 1.4); S.scene.add(CLKEY, CLKEY.target);
const yawTo = (p, c) => Math.atan2(c.x - p.x, c.z - p.z);
const alerp = (a, b, k) => a + ((((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) * k;   // angles: the short way round
const BULB_V = new Map(Wd.lampBulbs.map(b => [b, b.visible]));
// cute, not loud: small bouncy hops (squash before take-off and on landing, stretch in the air), a side-to-side lean, arms
// o: { per (hop period), hop (height, body units), cheer (0..1 arms up), lean, look: [x, y], take: time of a double take, wide (0..1) }
function clawd(t, pos, yaw, o = {}) {
  CL.group.visible = true; CL.group.position.copy(pos); CL.group.rotation.set(0, yaw, 0); CL.group.scale.setScalar(CL_S);
  CL.update(t, { action: 'idle', look: o.look ?? [0, 0] });
  const { bounce, torso, arms, legs, eyes } = CL.parts, per = o.per ?? 0.52, k = ((t / per) % 1 + 1) % 1, H = o.hop ?? 1.4;
  let y = 0, sq = 1;
  if (k < 0.18) sq = 1 - 0.1 * Math.sin(Math.PI * k / 0.18);
  else if (k < 0.78) { const a = (k - 0.18) / 0.6; y = H * Math.sin(Math.PI * a); sq = 1 + 0.07 * Math.sin(Math.PI * a); }
  else sq = 1 - 0.13 * Math.sin(Math.PI * (k - 0.78) / 0.22);
  // the double take: a jolt up, eyes wide, then a little tremble
  const dt = t - (o.take ?? -99);
  if (dt >= 0 && dt < 0.45) { const a = dt / 0.45; y = Math.max(y, 3.2 * Math.sin(Math.PI * a)); sq = a < 0.12 ? 0.86 : 1 + 0.12 * Math.sin(Math.PI * a); }
  bounce.position.y = y; bounce.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  const sway = Math.sin(t * Math.PI / per);
  torso.rotation.z = (o.lean ?? 0.11) * sway + (dt > 0.45 && dt < 1.6 ? 0.025 * Math.sin(dt * 55) * Math.exp(-(dt - 0.45) * 2.5) : 0);
  torso.rotation.x = o.tip ?? 0;
  const ch = o.cheer ?? 0;
  if (ch > 0) { arms[0].position.y = lerp(3.0, 5.0 + 1.0 * sway, ch); arms[1].position.y = lerp(3.0, 5.0 - 1.0 * sway, ch);
    arms[0].rotation.z = -ch * (0.55 + 0.3 * sway); arms[1].rotation.z = ch * (0.55 - 0.3 * sway); }
  const air = y > 0.2 ? Math.min(1, y / H) : 0; legs.forEach((l, i) => l.rotation.x = (i % 2 ? -1 : 1) * 0.25 * air);
  const w = o.wide ?? 0; if (w > 0) eyes.forEach(e => { e.scale.y *= 1 + 0.35 * w; e.scale.x *= 1 + 0.2 * w; });
}
// its own neutral key, from the camera side and above, reaching ~0.9 m: lights Clawd (and a little desk), nothing else in frame
function clawdKey(cl, cam, gain = 1, up = 0.26) {
  const c = cl.clone().add(V(0, 0.035, 0)), d = cam.clone().sub(c).setY(0).normalize();
  CLKEY.position.copy(c).addScaledVector(d, 0.32).add(V(0.06, up, 0)); CLKEY.target.position.copy(c); CLKEY.target.updateMatrixWorld();
  CLKEY.angle = 0.19; CLKEY.penumbra = 0.7; CLKEY.distance = 0.9; CLKEY.decay = 1.4; CLKEY.intensity = gain;
}
window.__Wd = Wd; window.__kai = kai; window.__jay = jay; window.__CL = CL; window.__S = S; window.__TH = THREE;
// the laptop's analytics page (link clicks), for "Twenty-six"
function dash(g_, w, h, t, n) {
  g_.fillStyle = '#0b0f1e'; g_.fillRect(0, 0, w, h); g_.fillStyle = '#141b3d'; g_.fillRect(0, 0, w, 52);
  g_.textBaseline = 'middle'; g_.font = '700 26px Inter'; g_.fillStyle = '#9fb0d8'; g_.textAlign = 'left'; g_.fillText('reelstudio.app · link in bio', 24, 27);
  g_.textAlign = 'center'; g_.font = '600 34px "JetBrains Mono"'; g_.fillText('LINK CLICKS', w / 2, 140);
  g_.font = '800 230px "JetBrains Mono"'; g_.fillStyle = '#ff3d8b'; g_.fillText(String(n), w / 2, 320);
  for (let i = 0; i < 12; i++) { const hh = i === 11 ? 24 + n * 2.4 : 5 + 4 * hsh(i, 4); g_.fillStyle = i === 11 ? '#ff3d8b' : 'rgba(160,180,230,.35)'; g_.fillRect(80 + i * 72, 610 - hh, 44, hh); }
}
// paper print (Problem 1, the caption rule): the 3D frame re-inked on cream, no vignette, shallow DOF off
const G_PAPER = { paper: 1, vig: 0, bloom: 0.2, grain: 0.03, expo: 1.0, sat: 1, contrast: 0.1, paperEdge: 1 };

const F3D = {
  A1(t, sh) {   // macro: his phone face-up on the desk, buzzing, notifications stacking; his sleeping head soft behind
    const k = lin(seg(t, sh.a, sh.b));
    dawn({ screen: 1.4, hemi: 0.42, neon: 4.5, amber: 0.55, sky: 3 }); liveDraw(lapTex, t, 'code'); slump(t, 1.2);
    if (deskBody) { deskBody.visible = false; deskPhone.visible = false; }
    const tq = Math.round(t * 30) / 30, bz = buzzAt(tq), pp = deskScr0.clone().add(V(-0.02, 0.012, 0.02));
    PH.visible = true; PH.position.copy(pp).add(V(0.0006 * Math.sin(tq * 210), 0, 0.0006 * Math.cos(tq * 190)).multiplyScalar(bz)); PH.rotation.set(-Math.PI / 2, 0, 0.35 + 0.006 * bz * Math.sin(tq * 150)); PH.updateMatrixWorld(true);
    drawPhone('lock', (t - sh.a) * 0.92, {}); phoneGlow.intensity = 0.5 + 0.12 * bz;
    rig.clawdKey.color.set('#a8b4ff'); rig.clawdKey.position.copy(pp).add(V(0, 0.12, 0)); rig.clawdKey.target.position.copy(pp).add(V(0, 0.5, 0)); rig.clawdKey.angle = 1.0; rig.clawdKey.penumbra = 1; rig.clawdKey.intensity = 1.0 + 0.25 * bz;
    const tgt = pp.clone().add(V(0, 0, -0.005)), pos = pp.clone().add(V(lerp(0.03, 0.015, k), lerp(0.24, 0.17, k), lerp(0.09, 0.06, k))).add(drift(t, 0.0012));
    return camLook(pos, tgt, 40, { roll: lerp(0.06, 0.0, k), focus: pos.distanceTo(tgt), aperture: 1.4, grade: { ...G_DAWN, expo: 1.0 } });
  },
  A2: (t, sh) => faceShot(t, sh, {   // "…ten million views." snap zoom, he jolts awake
    exp: (t) => expTrack(t, [[sh.a, { exp_shock: 1 }]], { noBlink: true }),
    pose: { pitch: 2, lean: 2, dp: V(0, -0.21, 0.02) }, phone: 'insights',
    light: { key: 2.0, keyCol: '#c2d2ff', rim: 2.4, fill: 0.9, pulse: (t) => 1 + 0.4 * Math.exp(-(t - sh.a) * 6) },
    cam: { p0: [0.02, -0.02, -0.68], p1: [0.01, 0.0, -0.56], fov0: 44, fov1: 36, zoomT: 0.3, tg: [0, -0.045, 0], ap: 0.9, shake: 0.004 },
  }),
  A3: (t, sh) => insert(t, sh, 'player', { d0: 0.24, d1: 0.29, x0: -0.2, x1: 0.12, y0: 0.06, y1: -0.02, r0: -0.06, r1: 0.03, ui: { ct: (t - sh.a) * 4.2 + 0.4 } }),
  A4(t, sh) {   // flashback, the night he built it: typing at the laptop; tiny Clawd on the desk beside it, bouncing, cheering him on.
    // v3.1: a medium shot from the window side (the wall is a wild wall: the near plane clips it), so Clawd is ~12 % of the frame width,
    // whole, facing the camera, both eyes; his face (determined) above the laptop lid.
    const k = lin(seg(t, sh.a, sh.b));
    night({ screen: 3.2, neon: 1.4, amber: 0.3 }); liveDraw(lapTex, t, 'fast');
    typing(t, { exp: expTrack(t, [[sh.a, { exp_determined: 0.85 }]]), pitch: 6, lean: 8, hy: -6 });
    for (const o of WILD) if (!/Laptop/.test(o.name)) o.visible = false;
    for (const b of Wd.lampBulbs) b.visible = false;   // its lamp is hidden (wild): no floating bulb
    const hd = Wd.head(), face = hd.clone().add(V(0, 0.075, -0.04)), cl = V(0.02, DESK_Y, -0.87);
    const pos = V(lerp(-0.2, -0.14, k), 1.1, lerp(-3.08, -2.98, k)).add(drift(t, 0.002)), tgt = face.clone().lerp(cl, 0.45).add(V(-0.03, 0.08, 0));
    clawd(t, cl, alerp(yawTo(cl, pos), yawTo(cl, face), 0.3), { per: 0.5, hop: 1.5, cheer: 1, lean: 0.12, look: [0.5, 0.3] });
    clawdKey(cl, pos, 0.9, 0.12); rig.amber.intensity = 0.06;   // the amber practical sat 0.2 m from Clawd and burned him orange: down
    rig.clawdKey.color.set('#9fb8ff'); rig.clawdKey.position.copy(face).add(V(-0.12, -0.12, -0.35)); rig.clawdKey.target.position.copy(face); rig.clawdKey.angle = 0.5; rig.clawdKey.penumbra = 1; rig.clawdKey.intensity = 2.0;
    rig.rimPink.color.set('#ff3d8b'); rig.rimPink.position.copy(face).add(V(0.9, 1.0, 1.4)); rig.rimPink.target.position.copy(face); rig.rimPink.target.updateMatrixWorld(); rig.rimPink.intensity = 2.4;
    const dir = tgt.clone().sub(pos).normalize(), near = (-1.14 - pos.z) / dir.z;
    return camLook(pos, tgt, 30, { near, roll: lerp(-0.02, -0.01, k), focus: pos.distanceTo(face.clone().lerp(cl, 0.5)), aperture: 0.25, grade: {} });
  },
  A5: (t, sh) => faceShot(t, sh, {   // proud, then the HUD lands and "It starts now." turns it
    exp: (t) => expTrack(t, [[sh.a, { exp_proud: 0.9 }], [EV.hudIn[2] + 0.05, { exp_worried: 1 }]]),
    pose: { pitch: 6, lean: 4, dp: V(0.0, -0.2, 0.06) }, phone: 'insights',
    light: { key: 2.0, rim: 2.2, fill: 0.6, sky: 2.6 },
    cam: { p0: [0.04, -0.06, -0.5], p1: [0.03, -0.04, -0.66], fov0: 44, tg: [0, -0.08, 0], ap: 0.7 },
  }),
  A6(t, sh) {   // the tagline over the window: the neon outside, the sky turning; the camera rises over his silhouette
    const k = lin(seg(t, sh.a, sh.b));
    dawn({ screen: 2.8, neon: 6, amber: 0.45, sky: 3.6 }); liveDraw(lapTex, t, 'code'); holdPhone(t, { pitch: 24 }); drawPhone('insights', t + 4, {}); PH.visible = true; phoneGlow.intensity = 0.3;
    const pos = V(lerp(0.12, 0.4, k), lerp(0.86, 1.0, k), lerp(0.42, 0.2, k)).add(drift(t, 0.003)), tgt = V(0.3, lerp(0.78, 0.98, k), -1.27);
    return camLook(pos, tgt, 40, { focus: pos.distanceTo(V(0.3, 0.98, -1.27)), aperture: 0.5, grade: { ...G_DAWN, expo: 1.0 } });
  },
  B1(t, sh) {   // "Problem one": wide from behind him, the room cold; the title is laid over it
    const k = lin(seg(t, sh.a, sh.b));
    dawn({ screen: 2.6, neon: 4.5, amber: 0.5, sky: 3.6, skyCol: '#7f8cff' }); liveDraw(lapTex, t, 'code');
    holdPhone(t, { pitch: 26 }); drawPhone('insights', t + 6, {}); PH.visible = true; phoneGlow.intensity = 0.3;
    const tgt = V(0.3, 0.8, -1.0), pos = V(lerp(-0.1, 0.05, k), lerp(1.15, 1.1, k), lerp(0.75, 0.6, k)).add(drift(t, 0.003));
    return camLook(pos, tgt, 40, { focus: pos.distanceTo(KHEAD), aperture: 0.5, grade: { ...G_DAWN, expo: 1.1, sat: 0.9 } });
  },
  B4: (t, sh) => faceShot(t, sh, {   // "how many people actually saw it? You have no way to tell." doubt, a slow push from his left
    exp: (t) => expTrack(t, [[sh.a, { exp_thinking: 0.8 }], [sh.a + 0.5, { exp_doubt: 1 }]]),
    pose: { pitch: 9, lean: 6, hy: -6, hr: 6, dp: V(0.02, -0.2, 0.04) }, phone: 'rule1',
    light: { key: 2.1, rim: 2.4, rimX: 0.9, fill: 0.5, fillCol: '#ff7a3c', fillX: -1.2 },
    cam: { p0: [0.36, -0.02, -0.55], p1: [0.26, -0.02, -0.46], fov0: 40, tg: [0, -0.02, 0], r0: 0.04, r1: 0.06, ap: 0.9 },
  }),
  C1: (t, sh) => insert(t, sh, 'post', { d0: 0.2, d1: 0.17, look: [-0.004, -0.04, 0], x0: 0.04, x1: 0.0, y0: -0.08, y1: -0.04, r0: 0.03, r1: -0.01,
    ui: { ring: seg(t, EV.p2 + 0.75, EV.p2 + 1.15) }, tap: [EV.tap1, EV.tap2].some(tp => t > tp - 0.15 && t < tp + 0.2) ? 1 : 0,
    thumb: (t) => { let best = [0, 0]; for (const tp of [EV.tap1, EV.tap2]) { const c = tapCurve(t, tp, 0.25, 0.3); if (c[0] > best[0]) best = c; } return [best[0], best[1], 610, 1640]; } }),
  C3: (t, sh) => faceShot(t, sh, {   // the comments pile up: high angle, the phone pinging light on his face
    exp: (t) => expTrack(t, [[sh.a, { exp_nervous: 0.9 }]]),
    pose: { pitch: 7, lean: 6, dp: V(0, -0.22, 0.03), tap: (t) => 0.3 }, phone: 'insights',
    light: { key: 1.4, keyCol: '#ffffff', rim: 2.0, fill: 0.5, pulse: (t) => { let p = 0; for (const b of EV.pings) if (t >= b) p = Math.max(p, Math.exp(-(t - b) * 9)); return 1 + 0.8 * p; } },
    cam: { p0: [-0.08, 0.07, -0.56], p1: [-0.05, 0.05, -0.48], fov0: 42, tg: [0, -0.03, 0], r0: -0.05, r1: -0.07, ap: 0.8 },
  }),
  C4: (t, sh) => insert(t, sh, 'flood', { d0: 0.25, d1: 0.21, look: [0, 0.005, 0], x0: 0.08, x1: -0.06, y0: -0.04, y1: 0.03, r0: 0.02, r1: -0.03, ui: FLOOD(t) }),
  C5: (t, sh) => faceShot(t, sh, {   // he scrolls right past: tired eyes, the screen's light strobing with the scroll
    exp: (t) => expTrack(t, [[sh.a, { exp_tired: 0.9 }]], { bo: 1.2 }),
    pose: { pitch: 14, lean: 10, hy: 4, dp: V(0.01, -0.19, 0.06), tap: (t) => 0.5 + 0.5 * Math.abs(Math.sin(t * 7)) }, phone: 'flood', ui: FLOOD(t),
    light: { key: 1.8, keyCol: '#b8c8ff', rim: 1.6, fill: 0.4, pulse: (t) => 1 + 0.25 * Math.sin(t * 31) * Math.sin(t * 13) },
    cam: { p0: [0.06, -0.05, -0.5], p1: [0.05, -0.04, -0.44], fov0: 32, tg: [0, -0.035, 0], r0: 0.02, r1: 0.0, ap: 1.2 },
  }),
  D1: (t, sh) => faceShot(t, sh, {   // "So you get smart." he sits up, smirks; low angle, the camera rises with him
    exp: (t) => expTrack(t, [[sh.a, { exp_thinking: 0.7 }], [EV.smart - 0.25, { exp_smirk: 1 }]]),
    pose: { pitch: lerp(12, 2, ss(seg(t, sh.a, sh.a + 0.7))), lean: lerp(10, 0, ss(seg(t, sh.a, sh.a + 0.7))), hr: -4, dp: V(-0.02, -0.2, 0.05) }, phone: 'profile',
    light: { key: 2.4, keyCol: '#c8d4ff', rim: 2.4, rimCol: '#ffb070', rimX: 0.9, fill: 0.8 },
    cam: { p0: [-0.18, -0.2, -0.6], p1: [-0.14, -0.14, -0.6], fov0: 42, tg: [0, -0.02, 0], r0: -0.06, r1: -0.03, ap: 0.8 },
  }),
  D2: (t, sh) => insert(t, sh, 'profile', { d0: 0.3, d1: 0.22, x0: -0.08, x1: 0.06, y0: 0.08, y1: -0.02, r0: -0.03, r1: 0.02 }),
  D3: (t, sh) => faceShot(t, sh, {   // "Then you watch the clicks come in." leaning in, hopeful; warm light from the right
    exp: (t) => expTrack(t, [[sh.a, { exp_excited: 0.75 }]], { bo: 0.3 }),
    pose: { pitch: 10, lean: 9, hy: -3, dp: V(0.0, -0.19, 0.08) }, phone: 'clicks', ui: { n: 0 },
    light: { key: 2.5, keyCol: '#d6e0ff', rim: 2.2, rimCol: '#ffb070', rimX: 0.9, fill: 0.7, fillCol: '#ffb070', fillX: -1.2 },
    cam: { p0: [0.3, -0.1, -0.5], p1: [0.24, -0.08, -0.44], fov0: 40, tg: [0, -0.03, 0], r0: 0.03, r1: 0.05, ap: 0.9 },
  }),
  D4: (t, sh) => insert(t, sh, 'clicks', { d0: 0.26, d1: 0.22, look: [0, 0.01, 0], x0: -0.14, x1: -0.1, y0: 0.04, y1: 0.02, r0: -0.05, r1: -0.04, ui: { n: 4, j: Math.exp(-(t - EV.n4) * 8) } }),
  D5: (t, sh) => faceShot(t, sh, {   // "Eleven." a grin starting, the screen light up on his face
    exp: (t) => expTrack(t, [[sh.a, { exp_proud: 0.9 }]], { noBlink: true }),
    pose: { pitch: 6, lean: 5, dp: V(0.0, -0.2, 0.06) }, phone: 'clicks', ui: { n: 11 },
    light: { key: 2.8, keyCol: '#ffd9ef', rim: 2.4, rimCol: '#8fa6ff', fill: 0.6, pulse: (t) => 1 + 0.5 * Math.exp(-(t - EV.n11) * 7) },
    cam: { p0: [-0.24, 0.04, -0.46], p1: [-0.21, 0.03, -0.43], fov0: 36, tg: [0, -0.02, 0], r0: -0.04, r1: -0.05, ap: 1.0 },
  }),
  D6(t, sh) {   // "Twenty-six." over his shoulder: the laptop's analytics page
    const k = lin(seg(t, sh.a, sh.b));
    night({ screen: 3.2, neon: 3, amber: 0.4 }); liveDraw(lapTex, t, 26); typing(t, { pitch: 14, lean: 12, exp: { exp_excited: 0.6 } });
    roomLaptop?.updateMatrixWorld(true); const lp = roomLaptop ? roomLaptop.getWorldPosition(V(0, 0, 0)) : V(0.28, 0.55, -0.98);
    const hd = Wd.head(), pos = hd.clone().add(V(lerp(0.2, 0.17, k), lerp(0.1, 0.08, k), lerp(0.2, 0.15, k))), tgt = lp.clone().add(V(0, 0.01, 0));
    return camLook(pos, tgt, 38, { roll: lerp(0.04, 0.02, k), focus: pos.distanceTo(tgt), aperture: 1.2, grade: { ...G_NIGHT, expo: 1.15, sat: 1.05 } });
  },
  D7(t, sh) {   // "Forty-one." from above: the desk, him, the phone glow; the number stops
    const k = lin(seg(t, sh.a, sh.b));
    dawn({ screen: 2.2, neon: 4, amber: 0.5, sky: 3.0 }); liveDraw(lapTex, t, 41);
    holdPhone(t, { pitch: 30, exp: { exp_excited: 0.4 } }); drawPhone('clicks', t, { n: 41, j: Math.exp(-(t - EV.n41) * 6) }); PH.visible = true; phoneGlow.intensity = 0.6;
    const pos = V(0.36, lerp(1.95, 1.85, k), lerp(-0.42, -0.46, k)), tgt = V(0.29, 0.6, -0.68);
    return camLook(pos, tgt, 44, { roll: lerp(-0.2, -0.24, k), focus: pos.distanceTo(PH.position), aperture: 0.6, grade: { ...G_DAWN, expo: 1.15 } });
  },
  E1(t, sh) {   // "Forty-one, out of ten million." wide, from the window: him small at the desk, the room too big
    const k = lin(seg(t, sh.a, sh.b));
    dawn({ screen: 2.0, neon: 3.6, amber: 0.4, sky: 2.6 }); liveDraw(lapTex, t, 'code');
    holdPhone(t, { pitch: 22, exp: { exp_worried: 0.7 } }); drawPhone('clicks', t, { n: 41 }); PH.visible = true; phoneGlow.intensity = 0.5; wild(true);
    const pos = V(lerp(0.2, 0.26, k), lerp(1.12, 1.08, k), -1.14), tgt = V(0.28, 0.82, -0.3);
    return camLook(pos, tgt, lerp(64, 58, k), { focus: pos.distanceTo(KHEAD), aperture: 0.4, grade: { ...G_DAWN, expo: 1.05, sat: 0.85 } });
  },
  E2: (t, sh) => faceShot(t, sh, {   // "That number has a name." it sinks in: cold, still, a slow push
    exp: (t) => expTrack(t, [[sh.a, { exp_sad: 0.8, exp_worried: 0.3 }]], { bo: 0.6 }),
    pose: { pitch: 10, lean: 10, curl: 8, dp: V(0, -0.2, 0.04) }, phone: 'clicks', ui: { n: 41 },
    light: { key: 1.7, keyCol: '#9fb2ff', rim: 1.4, rimCol: '#5f77ff', fill: 0.2, sky: 1.2 },
    cam: { p0: [0.0, -0.03, -0.62], p1: [0.0, -0.03, -0.5], fov0: 36, tg: [0, -0.03, 0], ap: 0.8 },
    grade: { sat: 0.7, expo: 0.85, shadow: [0.8, 0.88, 1.25] },
  }),
  E3(t, sh) {   // VANITY METRIC over the scene: the 10M glowing in his hands, the camera circling slowly, the room dark
    const k = lin(seg(t, sh.a, sh.b));
    night({ screen: 1.6, neon: 5, amber: 0.2 }); liveDraw(lapTex, t, 'code');
    const r = holdPhone(t, { pitch: 16, exp: { exp_sad: 0.6 } }); drawPhone('insights', t + 6, {}); PH.visible = true; phoneGlow.intensity = 0.9; wild(true);
    const c = r.c, a = lerp(-0.7, -0.35, k), pos = c.clone().add(V(0.42 * Math.sin(a), 0.1, -0.42 * Math.cos(a)));
    return camLook(pos, c.clone().add(V(0, 0.06, 0)), 46, { focus: pos.distanceTo(c), aperture: 1.6, grade: { ...G_NIGHT, expo: 0.85, sat: 0.6 } });
  },
  E4: (t, sh) => theoShot(t, sh, {   // someone else was answering your comments: Theo grinning down at his phone, thumbs going
    mode: 'type', light: { key: 9 }, exp: (t) => ({ exp_grin: 0.75 + 0.2 * Math.sin(t * 2.3), exp_blink: blink(t + 1.1) }),
    cam: { p0: [0.18, -0.04, 0.9], p1: [0.12, -0.03, 0.72], fov: 36, tg: [0, -0.03, 0], r0: 0.03, r1: 0.0 },
  }),
  E6(t, sh) {   // his account, a link that works: the phone on the desk; tiny Clawd beyond it sees it first, double take, turns to You.
    // v3.1: over his right shoulder, high, so the phone reads and Clawd (~13 % of the frame width) stands whole on the desk past it.
    const k = lin(seg(t, sh.a, sh.b));
    dawn({ screen: 1.8, hemi: 0.45, neon: 4, amber: 0.6, sky: 3 }); liveDraw(lapTex, t, 'code'); typing(t, { pitch: 26, lean: 14, exp: { exp_doubt: 0.6 } });
    if (deskBody) { deskBody.visible = false; deskPhone.visible = false; }
    const pp = deskScr0.clone().add(V(-0.02, 0.012, 0.02));
    PH.visible = true; PH.position.copy(pp); PH.rotation.set(-Math.PI / 2, 0, 0.35); PH.updateMatrixWorld(true);
    drawPhone('theo', t, { ct: 3 + (t - sh.a) * 1.0 }); phoneGlow.intensity = 0.6;
    const pos = V(lerp(0.72, 0.69, k), lerp(1.26, 1.23, k), lerp(0.0, -0.06, k)).add(drift(t, 0.0015)), tgt = V(0.48, 0.48, -0.9);
    const cl = V(0.56, DESK_Y, -1.02), face = Wd.head().clone().add(V(0, 0.075, -0.04));
    const turn = ss(seg(t, EV.copies + 0.35, EV.copies + 0.7)), down = 1 - ss(seg(t, EV.copies - 0.05, EV.copies + 0.1));
    const yaw = alerp(alerp(yawTo(cl, pos), yawTo(cl, pp), 0.2), alerp(yawTo(cl, pos), yawTo(cl, face), 0.8), turn);
    clawd(t, cl, yaw, { per: t < EV.copies ? 0.9 : 0.45, hop: t < EV.copies ? 0.5 : 0.9, lean: 0.07, tip: 0.18 * down, take: EV.copies,
      look: [lerp(-0.2, -0.5, turn), lerp(-0.7, 0.4, 1 - down)], wide: seg(t, EV.copies, EV.copies + 0.1) * (1 - 0.5 * turn) });
    clawdKey(cl, pos, 0.9);
    rig.clawdKey.color.set('#ffd2a8'); rig.clawdKey.position.copy(pp).add(V(0.05, 0.25, 0.12)); rig.clawdKey.target.position.copy(pp); rig.clawdKey.angle = 0.6; rig.clawdKey.penumbra = 1; rig.clawdKey.intensity = 1.6;
    return camLook(pos, tgt, 48, { roll: lerp(0.02, 0.0, k), focus: pos.distanceTo(cl.clone().lerp(pp, 0.5)), aperture: 0.35, grade: { ...G_DAWN, expo: 1.05 } });
  },
  E7: (t, sh) => faceShot(t, sh, {   // "You know that face." anger: dutch angle, the pink neon on him, a hard push
    exp: (t) => expTrack(t, [[sh.a, { exp_surprise: 0.6 }], [sh.a + 0.25, { exp_angry: 1 }]], { noBlink: true }),
    pose: { pitch: 4, lean: 2, hr: -5, dp: V(0, -0.2, 0.05) }, phone: 'theo', ui: { ct: 8 },
    light: { key: 1.6, keyCol: '#ffc6e0', rim: 3.2, rimCol: PINK, rimX: 0.9, fill: 1.4, fillCol: PINK, neon: 4 },
    cam: { p0: [0.12, -0.03, -0.6], p1: [0.06, -0.02, -0.42], fov0: 38, fov1: 32, tg: [0, -0.01, 0], r0: 0.12, r1: 0.16, ap: 1.0 },
    grade: { sat: 1.15, contrast: 0.36 },
  }),
  E8: (t, sh) => theoShot(t, sh, {   // Theo to camera, the ring light in his eyes: smug
    mode: 'cam', light: { key: 9 }, exp: (t) => expTrack(t, [[sh.a, { exp_smirk: 1 }]], { bo: 2 }),
    cam: { p0: [0.12, -0.02, 0.7], p1: [0.08, -0.01, 0.56], fov: 32, tg: [0, 0, 0] },
    grade: { flash: t > EV.theoName ? 0.15 * Math.exp(-(t - EV.theoName) * 9) : 0, flashCol: [1, 0.3, 0.6] },
  }),
  F3(t, sh) {   // "one copy of your app that works better than yours": over his shoulder, his phone on Theo's checkout
    const k = lin(seg(t, sh.a, sh.b));
    dawn({ screen: 2.4, neon: 3.4, amber: 0.5, sky: 3.4, skyCol: '#8090ff' }); liveDraw(lapTex, t, 'code');
    const r = holdPhone(t, { pitch: 24, exp: { exp_tired: 0.6 } }); drawPhone('theo', EV.checkout + 1 + (t - sh.a) * 0.3, { ct: 6 }); PH.visible = true; phoneGlow.intensity = 0.5;
    const hd = r.hd, pos = hd.clone().add(V(lerp(0.2, 0.16, k), lerp(0.1, 0.08, k), lerp(0.24, 0.2, k))), tgt = r.c.clone().add(V(-0.02, 0, 0));
    return camLook(pos, tgt, 40, { roll: 0.03, focus: pos.distanceTo(r.c), aperture: 1.1, grade: { ...G_DAWN, expo: 1.05, sat: 0.95 } });
  },
  G1: (t, sh) => insert(t, sh, 'climb', { d0: 0.3, d1: 0.21, look: [0, 0.0, 0], x0: 0.12, x1: 0.0, y0: -0.14, y1: -0.04, r0: 0.05, r1: 0.0, ui: { k: seg(t, sh.a, sh.b) } }),
  G2: (t, sh) => faceShot(t, sh, {   // CHASE, the want: his face pressed to the glow, eyes wide, the pink "+ New reel" on him
    exp: (t) => expTrack(t, [[sh.a, { exp_excited: 1 }]], { noBlink: true }),
    pose: { pitch: 4, lean: 14, hy: 3, dp: V(0.0, -0.13, 0.1), tap: (t) => 0.5 + 0.4 * Math.sin(t * 6) }, phone: 'compose',
    light: { key: 3.4, keyCol: '#ff8fbe', rim: 2.6, rimCol: '#8fa6ff', fill: 0.7, fillCol: '#ff5fa0', fillX: -1.0, pulse: (t) => 1 + 0.15 * Math.sin(t * 9) },
    cam: { p0: [0.1, -0.1, -0.36], p1: [0.07, -0.09, -0.3], fov0: 44, tg: [0, -0.05, 0], r0: 0.05, r1: 0.03, ap: 1.2 },
    grade: { sat: 1.2, bloom: 1.1, bloomTh: 0.75 },
  }),
  G3: (t, sh) => faceShot(t, sh, {   // ANSWER: one reply at a time; head down, typing, the light goes cyan; the neon outside dies
    exp: (t) => expTrack(t, [[sh.a, { exp_thinking: 0.9 }], [EV.sent, { exp_relieved: 0.6, exp_tired: 0.3 }]], { bo: 1.6 }),
    pose: { pitch: 14, lean: 10, hy: -4, dp: V(-0.01, -0.2, 0.05), tap: (t) => 0.5 + 0.5 * Math.abs(Math.sin(t * 9)) }, phone: 'reply',
    light: { key: 2.2, keyCol: '#8fe6ff', rim: 1.8, rimCol: '#ffb070', rimX: 0.9, fill: 0.4, sky: 2.4, neon: 3 * (S.neonLevel ?? 1) },
    cam: { p0: [-0.34, 0.02, -0.55], p1: [-0.26, 0.0, -0.5], fov0: 42, tg: [0, -0.03, 0], r0: -0.03, r1: -0.01, ap: 0.9 },
  }),
  G4: (t, sh) => faceShot(t, sh, {   // THE VOTE on the scene of wanting: his face between the pink (chase) and the cyan (answer)
    exp: (t) => expTrack(t, [[sh.a, { exp_excited: 0.85 }], [EV.answer + 0.05, { exp_excited: 0.75, exp_thinking: 0.25 }]], { bo: 0.9 }),
    pose: { pitch: 6, lean: 10, hy: 0, dp: V(0.0, -0.15, 0.08), tap: (t) => 0.4 }, phone: 'compose',
    light: { key: 2.6, keyCol: '#ffd6ea', rim: 3.0, rimCol: CYAN, rimX: 0.9, fill: 1.6, fillCol: PINK, fillX: -1.2,
      pulse: (t) => 1 + 0.5 * (t > EV.chase ? Math.exp(-(t - EV.chase) * 6) : 0) + 0.5 * (t > EV.answer ? Math.exp(-(t - EV.answer) * 6) : 0) },
    cam: { p0: [0.0, 0.0, -0.66], p1: [0.0, -0.01, -0.54], fov0: 40, tg: [0, -0.06, 0], ap: 1.0, shake: 0.003 },
    grade: { sat: 1.15, bloom: 1.0 },
  }),
};
// the flood: comments arrive on the voice ("link, link, where's the link"), faster and faster; then "price?", ringed as it passes
const FLOOD_ROWS = [['jen.makes', 'link?'], ['marco_builds', 'link?'], ['dana.r', "where's the link?"], ['tobi.edits', 'link pls'], ['lisa.m', 'LINK???'], ['kevinvlogs', 'link?'],
  ['sam_creates', 'where do I get this'], ['ayo.studio', 'link?'], ['mara.designs', 'price?'], ['pj.films', 'link??'], ['nina.k', 'need this'], ['rob.shoots', 'link?']];
const FLOOD_T = (() => { const [l1, l2, l3] = EV.linkW, A = [l1 - 0.05, l2 - 0.05, l3 - 0.05]; let x = A[2]; for (let i = 3; i < 8; i++) { x += 0.42 - 0.05 * (i - 3); A.push(x); } A.push(EV.price - 0.08); A.push(EV.price + 0.4, EV.price + 0.62, EV.price + 0.8); return A; })();
const FLOOD = (t) => ({ arrivals: FLOOD_T, rows: FLOOD_ROWS.map(([n, c]) => ({ n, c, ago: 'now' })), ring: seg(t, EV.price + 0.05, EV.price + 0.4) });
// ============================================================ 2D: paper, graphics, HUD, captions. Layout in 1080 × 1920 units
function cam2(t, sh, z0 = 1, z1 = 1.06, dx = 0, dy = 0, cx = 540, cy = 960) {
  const k = lin(seg(t, sh.a, sh.b)), s = lerp(z0, z1, k);
  g.translate(P(cx + dx * k), P(cy + dy * k)); g.scale(s, s); g.translate(-P(cx), -P(cy));
}
function paper(col) {
  g.fillStyle = col; g.fillRect(0, 0, S.fx.width, S.fx.height);
  g.save(); for (let i = 0; i < 220; i++) { g.fillStyle = `rgba(80,60,40,${0.02 + 0.025 * hsh(i, 3)})`; g.fillRect(P(hsh(i, 1) * 1080), P(hsh(i, 2) * 1920), P(2 + 3 * hsh(i, 4)), P(2 + 3 * hsh(i, 5))); } g.restore();
}
function darkBg(c0 = '#0c0f1c', c1 = '#05060c') {
  const gr = g.createRadialGradient(P(540), P(860), P(100), P(540), P(960), P(1300)); gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(0, 0, S.fx.width, S.fx.height);
  g.save(); for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${0.01 + 0.02 * hsh(i, 3)})`; g.fillRect(P(hsh(i, 1) * 1080), P(hsh(i, 2) * 1920), P(2), P(2)); } g.restore();
}
function wipeText(s, x, y, size, col, k, o = {}) {
  if (k <= 0) return; const w = H2.measure(s, size, o.w ?? 900);
  g.save(); g.beginPath(); g.rect(P(x - w / 2 - 20), P(y - size), P((w + 40) * eout(k)), P(size * 2)); g.clip(); H2.txt(s, x + 30 * (1 - eout(k)), y, size, col, { w: 900, ...o }); g.restore();
}
function pill(label, x, y, k, bg = PINK, fg = WHITE, size = 34) {
  if (k <= 0) return; const lw = H2.measure(label, size, 700, true) + 64;
  g.save(); g.globalAlpha *= Math.min(1, k * 2); H2.rr(x - lw / 2, y - 34 - 24 * (1 - eout(k)), lw, 68, 34); g.fillStyle = bg; g.fill(); H2.txt(label, x, y - 24 * (1 - eout(k)) + 1, size, fg, { w: 700, mono: true, ls: 6 }); g.restore();
}
function realTag(t, t0, src, y = 300) {   // the two platform rules are real: a tag + its source (on paper)
  const k = eout(seg(t, t0, t0 + 0.25)); if (k <= 0) return;
  g.save(); g.globalAlpha *= k; const w1 = H2.measure('REAL RULE', 28, 800, true) + 56;
  H2.rr(540 - w1 / 2, y - 28, w1, 56, 28); g.lineWidth = P(4); g.strokeStyle = '#1A9E5C'; g.stroke();
  H2.txt('REAL RULE', 540, y + 1, 28, '#1A9E5C', { w: 800, mono: true, ls: 4 });
  H2.txt('source: ' + src, 540, y + 62, 26, 'rgba(17,17,17,.6)', { w: 600 });
  g.restore();
}
const epTag = (col = 'rgba(17,17,17,.42)') => H2.txt('TEN MILLION VIEWS · EP 1', 540, 1800, 24, col, { w: 600, mono: true, ls: 6 });
// flat drawings (ink on paper)
function playBtn(x, y, r, col = INKC, fill = false) { g.save(); g.lineJoin = 'round'; g.beginPath(); g.moveTo(P(x - r * 0.42), P(y - r * 0.62)); g.lineTo(P(x - r * 0.42), P(y + r * 0.62)); g.lineTo(P(x + r * 0.62), P(y)); g.closePath(); if (fill) { g.fillStyle = col; g.fill(); } else { g.lineWidth = P(r * 0.12); g.strokeStyle = col; g.stroke(); } g.restore(); }
function loopArrow(x, y, r, a0, a1, col = INKC, lw = 22) {
  g.save(); g.strokeStyle = col; g.lineWidth = P(lw); g.lineCap = 'round'; g.beginPath(); g.arc(P(x), P(y), P(r), a0, a1); g.stroke();
  const ex = x + r * Math.cos(a1), ey = y + r * Math.sin(a1), tx = -Math.sin(a1), ty = Math.cos(a1), s = lw * 1.9;
  g.fillStyle = col; g.beginPath(); g.moveTo(P(ex + tx * s), P(ey + ty * s)); g.lineTo(P(ex - ty * s * 0.9 - tx * s * 0.2), P(ey + tx * s * 0.9 - ty * s * 0.2)); g.lineTo(P(ex + ty * s * 0.9 - tx * s * 0.2), P(ey - tx * s * 0.9 - ty * s * 0.2)); g.closePath(); g.fill(); g.restore();
}
function person(x, y, s, col = INKC) { g.save(); g.fillStyle = col; g.beginPath(); g.arc(P(x), P(y - 34 * s), P(26 * s), 0, 7); g.fill(); g.beginPath(); g.ellipse(P(x), P(y + 40 * s), P(46 * s), P(40 * s), 0, Math.PI, 0); g.fill(); g.restore(); }
function phoneOutline(x, y, w, h, col = INKC, lw = 10) { g.save(); H2.rr(x - w / 2, y - h / 2, w, h, w * 0.14); g.lineWidth = P(lw); g.strokeStyle = col; g.stroke(); H2.rr(x - w * 0.12, y - h / 2 + 18, w * 0.24, 16, 8); g.fillStyle = col; g.fill(); g.restore(); }
function finger(x, y, s, press = 0) {   // a flat pointing hand (outline), tip at (x, y)
  g.save(); g.translate(P(x), P(y + 6 * press)); g.scale(s, s); g.rotate(-0.35);
  g.fillStyle = '#F5D3B8'; g.strokeStyle = INKC; g.lineWidth = P(6); g.lineJoin = 'round';
  g.beginPath(); g.moveTo(P(-22), P(10)); g.lineTo(P(-22), P(130)); g.quadraticCurveTo(P(-60), P(110), P(-74), P(140)); g.quadraticCurveTo(P(-80), P(170), P(-40), P(210));
  g.lineTo(P(-10), P(300)); g.lineTo(P(110), P(300)); g.quadraticCurveTo(P(130), P(220), P(126), P(170)); g.lineTo(P(126), P(120)); g.quadraticCurveTo(P(110), P(96), P(92), P(120));
  g.quadraticCurveTo(P(80), P(90), P(58), P(112)); g.quadraticCurveTo(P(46), P(84), P(22), P(108)); g.lineTo(P(22), P(10)); g.quadraticCurveTo(P(0), P(-22), P(-22), P(10)); g.closePath(); g.fill(); g.stroke(); g.restore();
}
function mirror(x, y, s, k) {   // a hand mirror, flat ink + pink shine
  g.save(); g.translate(P(x), P(y)); g.scale(s, s); g.rotate(-0.28);
  g.fillStyle = INKC; g.fillRect(P(-20), P(150), P(40), P(220));
  g.beginPath(); g.ellipse(0, 0, P(150), P(176), 0, 0, 7); g.fillStyle = INKC; g.fill();
  g.beginPath(); g.ellipse(0, 0, P(126), P(152), 0, 0, 7); const gr = g.createLinearGradient(P(-120), P(-150), P(120), P(150)); gr.addColorStop(0, '#FFE3EF'); gr.addColorStop(1, '#FFFFFF'); g.fillStyle = gr; g.fill();
  g.strokeStyle = PINK; g.lineWidth = P(14); g.lineCap = 'round'; g.globalAlpha = k;
  g.beginPath(); g.moveTo(P(-70), P(-40)); g.lineTo(P(-10), P(-100)); g.moveTo(P(-60), P(30)); g.lineTo(P(40), P(-70)); g.stroke(); g.restore();
  for (let i = 0; i < 3; i++) { const a = k * (0.6 + 0.4 * Math.sin(i * 2 + k * 6)); spark(x + [-190, 175, 150][i] * s, y + [-170, -120, 120][i] * s, [34, 24, 18][i] * s * a); }
}
function spark(x, y, r) { if (r <= 0) return; g.save(); g.fillStyle = PINK; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr_ = i % 2 ? r * 0.28 : r; g.lineTo(P(x + rr_ * Math.cos(a)), P(y + rr_ * Math.sin(a))); } g.closePath(); g.fill(); g.restore(); }
function cross(x, y, r, col = PINK, lw = 18) { g.save(); g.strokeStyle = col; g.lineWidth = P(lw); g.lineCap = 'round'; g.beginPath(); g.moveTo(P(x - r), P(y - r)); g.lineTo(P(x + r), P(y + r)); g.moveTo(P(x + r), P(y - r)); g.lineTo(P(x - r), P(y + r)); g.stroke(); g.restore(); }
function chainLink(x, y, s, col) { g.save(); g.translate(P(x), P(y)); g.rotate(-0.78); g.strokeStyle = col; g.lineWidth = P(14 * s); H2.rr(-70 * s, -26 * s, 90 * s, 52 * s, 26 * s); g.stroke(); H2.rr(-20 * s, -26 * s, 90 * s, 52 * s, 26 * s); g.stroke(); g.restore(); }
function titleCard(t, sh, bg, label, lines, o = {}) {
  paper(bg); g.save(); cam2(t, sh, 1.0, 1.06);
  pill(label, 540, 600, eout(seg(t, sh.a + 0.02, sh.a + 0.24)));
  lines.forEach((L, i) => wipeText(L.t, 540, 780 + i * 160, L.size ?? 140, L.pink ? PINKD : INKC, seg(t, sh.a + 0.1 + i * 0.09, sh.a + 0.4 + i * 0.09)));
  const rk = eout(seg(t, sh.a + 0.5, sh.a + 0.9)); g.fillStyle = INKC; g.fillRect(P(540 - 240 * rk), P(780 + lines.length * 160 - 40), P(480 * rk), P(8));
  if (o.draw) o.draw();
  epTag(); g.restore();
}
function counterBox(n, x, y, j, label = 'VIEWS') {
  H2.txt(label, x, y - 120, 36, 'rgba(17,17,17,.55)', { w: 800, mono: true, ls: 8 });
  g.save(); g.translate(P(x), P(y)); g.scale(1 + 0.22 * j, 1 + 0.22 * j); H2.txt(String(n), 0, 0, 190, j > 0.35 ? PINKD : INKC, { w: 800, mono: true }); g.restore();
}
const loopsAt = (t) => { const [a, b] = EV.loopRun; if (t < a) return 0; return Math.min(11, Math.floor((t - a) / ((b - a) / 11)) + 1); };
const loopT = (i) => EV.loopRun[0] + (i - 1) * (EV.loopRun[1] - EV.loopRun[0]) / 11;
function offPhone(handle, who) { const c = document.createElement('canvas'); c.width = 432; c.height = 864; const hp = createHud(c.getContext('2d'), 432, 864); return { c, ui: makePhoneUI(hp, EV, IMG), handle, who }; }
const OP = [offPhone('you.builds', null), offPhone('theo.ships', 'theo')];
const fitSize = (s, size, maxW) => Math.min(size, size * maxW / (H2.measure(s, size, 900) + 4 * s.length));   // never wider than maxW
function eyeIcon(x, y, s, a = 1) { g.save(); g.globalAlpha *= a; g.strokeStyle = WHITE; g.lineWidth = P(4 * s); g.beginPath(); g.moveTo(P(x - 30 * s), P(y)); g.quadraticCurveTo(P(x), P(y - 26 * s), P(x + 30 * s), P(y)); g.quadraticCurveTo(P(x), P(y + 26 * s), P(x - 30 * s), P(y)); g.stroke(); g.fillStyle = WHITE; g.beginPath(); g.arc(P(x), P(y), P(10 * s), 0, 7); g.fill(); g.restore(); }
const waveIcon = (x, y, s, col) => { g.save(); g.strokeStyle = col; g.lineWidth = P(14 * s); g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(P(x - 80 * s), P(y + 45 * s)); g.lineTo(P(x - 22 * s), P(y - 10 * s)); g.lineTo(P(x + 12 * s), P(y + 22 * s)); g.lineTo(P(x + 80 * s), P(y - 55 * s)); g.stroke(); g.beginPath(); g.moveTo(P(x + 34 * s), P(y - 57 * s)); g.lineTo(P(x + 82 * s), P(y - 57 * s)); g.lineTo(P(x + 82 * s), P(y - 10 * s)); g.stroke(); g.restore(); };
const chatIcon = (x, y, s, col) => { g.save(); g.strokeStyle = col; g.lineWidth = P(12 * s); g.lineJoin = 'round'; H2.rr(x - 80 * s, y - 60 * s, 160 * s, 110 * s, 30 * s); g.stroke(); g.beginPath(); g.moveTo(P(x - 34 * s), P(y + 50 * s)); g.lineTo(P(x - 50 * s), P(y + 88 * s)); g.lineTo(P(x + 4 * s), P(y + 50 * s)); g.stroke();
  g.fillStyle = col; for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(P(x + i * 38 * s), P(y - 6 * s), P(10 * s), 0, 7); g.fill(); } g.restore(); };
function pillBtn(x, y, s, w, c, fg, p) {
  g.save(); g.translate(P(x), P(y)); g.scale(s * (1 - 0.06 * p), s * (1 - 0.06 * p)); g.translate(-P(x), -P(y));
  g.save(); g.shadowColor = c; g.shadowBlur = P(30 + 40 * p); H2.rr(x - 190, y - 70, 380, 140, 70); g.fillStyle = c; g.fill(); g.restore();
  if (p > 0.05) { H2.rr(x - 190 - 14 * p, y - 70 - 14 * p, 380 + 28 * p, 140 + 28 * p, 84); g.lineWidth = P(5); g.strokeStyle = INKC; g.globalAlpha = p; g.stroke(); g.globalAlpha = 1; }
  H2.txt(w, x, y + 3, 64, fg, { w: 900, ls: 2 }); g.restore();
}
function probTag(label, t, t0, x = 60, y = 330) {   // saveo's small tag under the HUD: PROBLEM 1 / PROBLEM 2
  const k = eout(seg(t, t0, t0 + 0.2)); if (k <= 0) return; g.save(); g.globalAlpha *= k;
  const w = H2.measure(label, 30, 800, true) + 48; H2.rr(x, y - 27, w, 54, 10); g.fillStyle = PINK; g.fill(); H2.txt(label, x + w / 2, y + 1, 30, WHITE, { w: 800, mono: true, ls: 5 }); g.restore();
}
function band(y0, y1, a = 0.75) {   // a dark band behind white type laid over the scene
  g.save(); const bg = g.createLinearGradient(0, P(y0), 0, P(y1)); bg.addColorStop(0, 'rgba(6,7,14,0)'); bg.addColorStop(0.25, `rgba(6,7,14,${a})`); bg.addColorStop(0.75, `rgba(6,7,14,${a})`); bg.addColorStop(1, 'rgba(6,7,14,0)');
  g.fillStyle = bg; g.fillRect(0, P(y0), S.fx.width, P(y1 - y0)); g.restore();
}
function paperWash() {   // the top of a paper print gets a cream wash so the ink reads; he shows through below
  const gr = g.createLinearGradient(0, 0, 0, P(1000)); gr.addColorStop(0, 'rgba(239,233,222,.92)'); gr.addColorStop(0.72, 'rgba(239,233,222,.8)'); gr.addColorStop(1, 'rgba(239,233,222,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S.fx.width, P(1000));
}
function countTag(t, t0, n, x = 540, y = 1230) {   // saveo's deposit tag: one number per picture
  const k = seg(t, t0 - 0.02, t0 + 0.12), s = k < 1 ? lerp(1.7, 1, eout(k)) : 1 + 0.015 * Math.sin(t * 8);
  g.save(); g.globalAlpha *= Math.min(1, k * 3 + 0.001); g.translate(P(x), P(y)); g.scale(s, s);
  g.save(); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = P(30); H2.rr(-210, -125, 420, 250, 34); g.fillStyle = 'rgba(247,245,242,.97)'; g.fill(); g.restore();
  H2.txt('LINK CLICKS', 0, -72, 30, 'rgba(17,17,17,.55)', { w: 800, mono: true, ls: 6 });
  H2.txt(String(n), 0, 34, 150, n === 41 ? PINKD : INKC, { w: 900, mono: true }); g.restore();
}
const G2D = {
  A2(t, sh) { if (t > EV.viewsSlam) H2.veil(0.25 * Math.exp(-(t - EV.viewsSlam) * 8), '255,61,139'); },
  A6(t, sh) {   // the series line, like saveo's EVERY DOLLAR LEAVES A TRAIL
    const k = eout(seg(t, sh.a + 0.05, sh.a + 0.4)); band(560, 1180, 0.7 * k);
    H2.txt('TEN MILLION VIEWS · EP 1', 540, 640, 30, PINK, { w: 700, mono: true, ls: 8, alpha: k });
    wipeText('EVERY VIEW', 540, 770, 130, WHITE, seg(t, sh.a + 0.05, sh.a + 0.35));
    wipeText('HAS A', 540, 900, 130, WHITE, seg(t, EV.halfLife - 0.6, EV.halfLife - 0.3));
    wipeText('HALF-LIFE', 540, 1040, 150, PINK, seg(t, EV.halfLife - 0.05, EV.halfLife + 0.25), { glow: PINK, glowR: 30 });
  },
  B1(t, sh) {   // "Problem one: ten million isn't ten million." over the wide shot
    H2.veil(0.45 * Math.exp(-(t - sh.a) * 14), '255,255,255');
    probTag('PROBLEM 1', t, EV.p1);
    const k = eout(seg(t, EV.p1 + 0.3, EV.p1 + 0.6)); band(720, 1240, 0.72 * k);
    wipeText('TEN MILLION', 540, 830, 130, WHITE, seg(t, EV.p1 + 0.6, EV.p1 + 0.95));
    wipeText("ISN'T", 540, 970, 130, WHITE, seg(t, EV.isnt - 0.05, EV.isnt + 0.2));
    wipeText('TEN MILLION', 540, 1110, 130, PINK, seg(t, EV.isnt + 0.35, EV.isnt + 0.7), { glow: PINK, glowR: 24 });
  },
  B2(t, sh) {   // v3.1: a flat cream card (Kai: no faint print of him behind): every start = 1 view; replays too (real rule)
    paper(CREAM); g.save(); cam2(t, sh, 1.0, 1.05, 0, -8);
    realTag(t, sh.a + 0.1, 'Instagram Help Center, accessed Nov 2026', 430);
    wipeText('EVERY START', 540, 650, 124, INKC, seg(t, sh.a + 0.05, sh.a + 0.35));
    wipeText('= 1 VIEW', 540, 785, 124, INKC, seg(t, sh.a + 0.15, sh.a + 0.45));
    const starts = [...EV.plays, EV.replay[0]], n = starts.filter(p => t >= p).length, last = n ? starts[n - 1] : -9, j = n ? Math.exp(-(t - last) * 8) : 0, isRe = t >= EV.replay[0];
    g.save(); g.translate(P(300), P(1080)); g.scale(1 + 0.25 * (isRe ? 0 : j), 1 + 0.25 * (isRe ? 0 : j)); playBtn(0, 0, 118, isRe ? INKC : (n ? PINKD : INKC), true); g.restore();
    if (isRe) { const k = eout(seg(t, EV.replay[0], EV.replay[0] + 0.4)); g.save(); g.translate(P(300), P(1080)); g.rotate(k * Math.PI * 2); loopArrow(0, 0, 175, -Math.PI * 0.85, Math.PI * 0.55, PINKD, 22); g.restore();
      wipeText('REPLAYS TOO', 540, 1370, 96, PINKD, seg(t, EV.replay[0], EV.replay[0] + 0.25)); }
    H2.txt('VIEWS', 770, 950, 40, 'rgba(17,17,17,.55)', { w: 800, mono: true, ls: 8 });
    g.save(); g.translate(P(770), P(1085)); g.scale(1 + 0.22 * j, 1 + 0.22 * j); H2.txt(String(n), 0, 0, 190, j > 0.35 ? PINKD : INKC, { w: 800, mono: true }); g.restore();
    if (n) { const k = seg(t, last, last + 0.6); H2.txt('+1', 925, 960 - 90 * eout(k), 80, PINKD, { w: 900, alpha: 1 - ss(seg(k, 0.6, 1)) }); }
    epTag(); g.restore();
  },
  B3(t, sh) {   // the one solid white card: one person, eleven loops, eleven views
    paper(PAPERW); g.save(); cam2(t, sh, 1.0, 1.06, 0, -10);
    const n = loopsAt(t), last = n ? loopT(n) : -9;
    person(250, 640, 2.3); wipeText('1 PERSON', 250, 860, 64, INKC, seg(t, sh.a + 0.05, sh.a + 0.3));
    g.save(); g.strokeStyle = 'rgba(17,17,17,.35)'; g.lineWidth = P(8); g.setLineDash([P(16), P(14)]); g.beginPath(); g.moveTo(P(400), P(640)); g.lineTo(P(560), P(640)); g.stroke(); g.restore();
    const lk = n ? clamp((t - last) / ((EV.loopRun[1] - EV.loopRun[0]) / 11)) : 0;
    g.save(); g.translate(P(780), P(640)); g.rotate(lk * Math.PI * 2); loopArrow(0, 0, 150, -Math.PI * 0.8, Math.PI * 0.6, n >= 11 ? PINK : INKC, 20); g.restore();
    playBtn(790, 640, 80, INKC, true);
    for (let i = 1; i <= n; i++) { const x = 175 + (i - 1) * 62 + Math.floor((i - 1) / 5) * 36, k = eout(seg(t, loopT(i), loopT(i) + 0.1));
      g.fillStyle = i === 11 ? PINK : INKC; g.fillRect(P(x), P(1030 - 70 * k), P(18), P(140 * k)); }
    if (t >= EV.elevenSlam) { g.save(); const k = seg(t, EV.elevenSlam, EV.elevenSlam + 0.16), s = k < 1 ? lerp(2.2, 1, eout(k)) : 1; g.translate(P(540), P(1300)); g.scale(s, s);
      H2.txt('= 11 VIEWS', 0, 0, 150, PINKD, { w: 900 }); g.restore(); }
    else H2.txt(String(n), 540, 1300, 150, INKC, { w: 900, mono: true });
    epTag(); g.restore();
  },
  B4(t, sh) {   // people = ? : question marks pop around his head
    [[EV.people, 250, 600, 150], [EV.people + 0.35, 820, 520, 110], [EV.noWay, 760, 760, 170]].forEach(([t0, x, y, s]) => { const k = seg(t, t0, t0 + 0.2); if (k <= 0) return;
      g.save(); g.translate(P(x), P(y)); const sc = lerp(1.6, 1, eout(k)); g.scale(sc, sc); H2.txt('?', 0, 0, s, PINK, { w: 900, alpha: Math.min(1, k * 3), glow: PINK, glowR: 24, stroke: 8 }); g.restore(); });
  },
  C1(t, sh) { probTag('PROBLEM 2', t, EV.p2); },
  C2(t, sh) {   // v3.1: a flat cream card: a caption link is just text (real rule)
    paper(CREAM); g.save(); cam2(t, sh, 1.0, 1.05, 0, -8);
    realTag(t, sh.a + 0.1, 'Instagram app, tested Nov 2026', 430);
    wipeText('A CAPTION LINK', 540, 650, 108, INKC, seg(t, sh.a + 0.05, sh.a + 0.35));
    wipeText('IS JUST TEXT', 540, 775, 108, INKC, seg(t, sh.a + 0.15, sh.a + 0.45));
    const k = ss(seg(t, EV.justText - 0.5, EV.justText + 0.2));
    const col = `rgb(${Math.round(lerp(61, 154, k))},${Math.round(lerp(139, 154, k))},${Math.round(lerp(255, 162, k))})`;
    chainLink(215, 1070, 1.35, col); H2.txt('reelstudio.app', 345, 1070, 84, col, { align: 'left', w: 800 });
    const uw = H2.measure('reelstudio.app', 84, 800); g.save(); g.globalAlpha = 1 - k; g.fillStyle = col; g.fillRect(P(345), P(1124 + 120 * k * k), P(uw), P(8)); g.restore();
    if (t > EV.justText) { const j = eout(seg(t, EV.justText, EV.justText + 0.2)); g.save(); g.globalAlpha = j; H2.txt('= Aa', 540, 1340, 140, PINKD, { w: 900 }); g.restore(); }
    epTag(); g.restore();
  },
  C6(t, sh) {   // black RULE 1 card
    g.fillStyle = '#100d0c'; g.fillRect(0, 0, S.fx.width, S.fx.height); g.save(); cam2(t, sh, 1.0, 1.05);
    H2.txt('RULE 1', 540, 780, 36, PINK, { w: 800, mono: true, ls: 8, alpha: ss(seg(t, sh.a, sh.a + 0.25)) });
    wipeText("If they can't tap it,", 540, 900, 84, WHITE, seg(t, EV.ruleLine - 0.05, EV.ruleLine + 0.3));
    wipeText("it doesn't exist.", 540, 1010, 84, WHITE, seg(t, EV.ruleLine + 0.95, EV.ruleLine + 1.25));
    g.restore();
  },
  D4(t, sh) { countTag(t, EV.n4, 4); },
  D5(t, sh) { countTag(t, EV.n11, 11, 540, 1300); },
  D6(t, sh) { countTag(t, EV.n26, 26, 540, 1300); },
  D7(t, sh) { countTag(t, EV.n41, 41, 540, 1250); },
  E1(t, sh) {   // 41, out of ten million
    const k = eout(seg(t, sh.a + 0.05, sh.a + 0.3)), j = eout(seg(t, EV.outOf, EV.outOf + 0.3)); band(600, 1180, 0.6 * k);
    g.save(); g.globalAlpha = k; g.translate(P(540), P(830)); const s = lerp(1.4, 1, k); g.scale(s, s); H2.txt('41', 0, 0, 280, PINK, { w: 900, mono: true, glow: PINK, glowR: 40 }); g.restore();
    H2.txt('OUT OF 10,000,000', 540, 1050, 56, WHITE, { w: 800, mono: true, ls: 6, alpha: j });
  },
  E3(t, sh) {   // the trap's name, pink over the scene (saveo's STRUCTURING)
    band(560, 1420, 0.8 * eout(seg(t, sh.a, sh.a + 0.2)));
    H2.txt('THAT NUMBER HAS A NAME', 540, 650, 32, 'rgba(247,245,242,.7)', { w: 700, mono: true, ls: 6, alpha: ss(seg(t, sh.a, sh.a + 0.2)) });
    H2.slam([{ text: 'VANITY', size: 210, col: PINK, ls: 4, stroke: 0 }, { text: 'METRIC', size: 210, col: PINK, ls: 4, stroke: 0 }], t, EV.vanity, 860, { from: 2.4, shake: 34, dur: 0.14 });
    const w1 = eout(seg(t, EV.winning - 0.3, EV.winning)); H2.txt('looks like winning', 540, 1225, 52, WHITE, { w: 700, alpha: w1 });
    if (t > EV.paysNothing - 0.1) { const k = seg(t, EV.paysNothing - 0.1, EV.paysNothing + 0.06), s = k < 1 ? lerp(2.0, 1, eout(k)) : 1;
      g.save(); g.translate(P(540), P(1335)); g.rotate(-0.06); g.scale(s, s); H2.rr(-250, -48, 500, 96, 12); g.lineWidth = P(7); g.strokeStyle = PINK; g.stroke(); H2.txt('PAYS NOTHING', 0, 2, 54, PINK, { w: 900, mono: true, ls: 4 }); g.restore(); }
    if (t > EV.vanity) H2.veil(0.35 * Math.exp(-(t - EV.vanity) * 10), '255,61,139');
  },
  E4(t, sh) {   // his replies pop around him, one per comment
    const R_ = [['link??', 'Tap the blue button ↗', 40, 330], ['where is the link??', 'Sent it to your DMs 🙌', 500, 1250], ['how do I get this', 'Right here 👇 one tap', 40, 1420], ['link pls', 'Done ✓', 500, 500]];
    R_.forEach(([q, a, x, y], i) => { const k = seg(t, EV.replies[i], EV.replies[i] + 0.22); if (k <= 0) return; const s = lerp(0.7, 1, eout(k));
      g.save(); g.globalAlpha = Math.min(1, k * 3); g.translate(P(x + 260), P(y + 70)); g.scale(s, s); g.translate(-P(x + 260), -P(y + 70));
      H2.rr(x, y, 540, 150, 34); g.fillStyle = 'rgba(247,245,242,.96)'; g.fill();
      H2.txt(q, x + 32, y + 40, 28, 'rgba(17,17,17,.55)', { align: 'left', w: 700 });
      H2.txt('theo.ships ✓', x + 32, y + 84, 28, BLUE, { align: 'left', w: 800 }); H2.txt(a, x + 32, y + 122, 34, INKC, { align: 'left', w: 800 });
      g.restore(); });
  },
  E5(t, sh) {   // your reel and his repost, side by side, the same twelve seconds in sync
    darkBg('#101425', '#05060c'); g.save(); cam2(t, sh, 1.0, 1.05);
    const ct = (t - sh.a) * 1.6 + 2, k = eout(seg(t, sh.a, sh.a + 0.3));
    OP.forEach((op, i) => {
      op.ui.draw('player', t, { ct, handle: op.handle, who: op.who, caption: i ? 'Found the app everyone’s asking about 👇' : 'Reel Studio: any clip → a reel, in one tap.' });
      const x = i ? 580 : 70, y = 560 + 40 * (1 - k) * (i ? 1 : -1);
      g.save(); g.globalAlpha = k; H2.rr(x - 8, y - 8, 446, 878, 44); g.fillStyle = i ? PINK : 'rgba(247,245,242,.5)'; g.fill();
      H2.rr(x, y, 430, 862, 38); g.save(); g.clip(); g.drawImage(op.c, P(x), P(y), P(430), P(862)); g.restore(); g.restore();
      H2.txt(i ? '@theo.ships' : '@you.builds', x + 215, 1500, 44, i ? PINK : WHITE, { w: 800, mono: true, alpha: k });
    });
    if (t > EV.sideBySide + 0.8) { const j = eout(seg(t, EV.sideBySide + 0.8, EV.sideBySide + 1.0)); H2.txt('=', 540, 990, 120, WHITE, { w: 900, alpha: j, stroke: 10 }); }
    g.restore();
  },
  E8(t, sh) {   // his name
    if (t < EV.theoName) return;
    const k = eout(seg(t, EV.theoName, EV.theoName + 0.16));
    g.save(); g.globalAlpha = k; H2.rr(70, 1290 + 40 * (1 - k), 600, 200, 22); g.fillStyle = 'rgba(9,10,16,.85)'; g.fill(); g.fillStyle = PINK; g.fillRect(P(70), P(1290 + 40 * (1 - k)), P(12), P(200));
    H2.txt('THEO MARSH', 110, 1360 + 40 * (1 - k), 76, WHITE, { align: 'left', w: 900 }); H2.txt('ex-cofounder · @theo.ships', 112, 1442 + 40 * (1 - k), 32, PINK, { align: 'left', w: 700, mono: true }); g.restore();
  },
  E9(t, sh) {   // git blame: half the lines are his; and he's already selling it (orders land on top)
    darkBg('#0c101c', '#05060c'); g.save(); cam2(t, sh, 1.0, 1.06, 0, -40);
    H2.rr(50, 330, 980, 1300, 30); g.fillStyle = 'rgba(12,15,24,.97)'; g.fill(); H2.rr(50, 330, 980, 1300, 30); g.lineWidth = P(2); g.strokeStyle = 'rgba(255,255,255,.14)'; g.stroke();
    H2.txt('reel-studio / core.ts', 90, 385, 30, 'rgba(247,245,242,.75)', { align: 'left', w: 700, mono: true }); H2.txt('git blame', 990, 385, 26, 'rgba(247,245,242,.45)', { align: 'right', w: 500, mono: true });
    g.save(); H2.rr(50, 420, 980, 1060, 0); g.clip();
    const sc = (t - sh.a) * 60;
    const code = ['export function cutToBeat(clip, bpm) {', '  const beats = detectBeats(clip.audio);', '  for (const b of beats) {', '    splitAt(clip, b.t);', '  }', '  return autoReframe(clip, 9 / 16);', '}', 'function detectBeats(a) {', '  const env = onsetEnvelope(a);', '  return peaks(env, 0.32);', '}', 'export function makeReel(src) {', '  const c = trimSilence(src);', '  return cutToBeat(c, 120);', '}', 'function autoReframe(c, r) {', '  const face = trackFace(c);', '  return crop(c, face, r);', '}'];
    code.forEach((ln, i) => { const y = 470 + i * 62 - sc, theo = Math.floor(i / 3) % 2 === 0, on = t > sh.a + 0.05 + i * 0.025;
      if (!on) return; if (theo) { g.fillStyle = 'rgba(255,61,139,.14)'; g.fillRect(P(50), P(y - 28), P(980), P(58)); }
      H2.txt(theo ? 'theo' : 'you', 80, y, 24, theo ? PINK : 'rgba(143,179,255,.8)', { align: 'left', w: 700, mono: true });
      H2.txt(ln, 300, y, 26, theo ? WHITE : 'rgba(247,245,242,.7)', { align: 'left', w: 500, mono: true }); });
    g.restore();
    const bk = eout(seg(t, EV.blame, EV.blame + 0.5));
    H2.rr(90, 1520, 900, 44, 22); g.fillStyle = 'rgba(143,179,255,.35)'; g.fill(); H2.rr(90, 1520, 450 * bk, 44, 22); g.fillStyle = PINK; g.fill();
    H2.txt('theo 50%', 90, 1600, 34, PINK, { align: 'left', w: 800, mono: true, alpha: bk }); H2.txt('you 50%', 990, 1600, 34, 'rgba(143,179,255,.95)', { align: 'right', w: 800, mono: true, alpha: bk });
    g.restore();
    [0, 0.28, 0.52].forEach((d, i) => { const k = seg(t, EV.selling + d, EV.selling + d + 0.18); if (k <= 0) return; const y = 560 + i * 170 - 30 * (1 - eout(k));
      g.save(); g.globalAlpha = Math.min(1, k * 3); H2.rr(150, y, 780, 130, 30); g.fillStyle = 'rgba(247,245,242,.97)'; g.fill(); g.fillStyle = PINK; g.beginPath(); g.arc(P(225), P(y + 65), P(34), 0, 7); g.fill();
      H2.txt('$', 225, y + 67, 38, WHITE, { w: 900 }); H2.txt('Reel Studio Pro · new order ✓', 285, y + 48, 32, INKC, { align: 'left', w: 800 }); H2.txt('theo.ships · just now', 285, y + 92, 26, 'rgba(17,17,17,.5)', { align: 'left', w: 600 }); g.restore(); });
  },
  F1(t, sh) {   // black DAY 1 (saveo's DAY 3)
    g.fillStyle = '#100d0c'; g.fillRect(0, 0, S.fx.width, S.fx.height); g.save(); cam2(t, sh, 0.96, 1.04);
    H2.slam([{ text: 'DAY 1', size: 240, col: WHITE, stroke: 0 }], t, EV.day1, 960, { from: 1.5, shake: 10 }); g.restore();
  },
  F2(t, sh) {   // where you stand, voiced row by row
    paper('#EDE6D9'); g.save(); cam2(t, sh, 1.0, 1.04);
    H2.txt('DAY 1 · WHERE YOU STAND', 540, 400, 34, 'rgba(17,17,17,.6)', { w: 700, mono: true, ls: 6 });
    const rows = [['VIEWS', '10,000,000', INKC], ['CLICKS', '41', INKC], ['REVENUE', '$0', PINKD, ' / $10,000'], ['ATTENTION', '92%', INKC, '', 0.92]];
    rows.forEach(([l, v, c, extra, bar], i) => { const y = 560 + i * 250, k = eout(seg(t, EV.rows[i] - 0.08, EV.rows[i] + 0.17)); if (k <= 0) return;
      g.save(); g.globalAlpha = k; g.translate(P(-40 * (1 - k)), 0);
      H2.txt(l, 130, y, 30, 'rgba(17,17,17,.55)', { align: 'left', w: 700, mono: true, ls: 4 });
      H2.txt(v, 130, y + 95, 120, c, { align: 'left', w: 900 });
      if (extra) H2.txt(extra, 130 + H2.measure(v, 120, 900) + 10, y + 110, 48, 'rgba(17,17,17,.45)', { align: 'left', w: 700 });
      if (bar !== undefined) { H2.rr(560, y + 75, 390, 34, 17); g.fillStyle = 'rgba(17,17,17,.12)'; g.fill(); H2.rr(560, y + 75, 390 * bar, 34, 17); g.fillStyle = INKC; g.fill(); }
      g.fillStyle = 'rgba(17,17,17,.14)'; g.fillRect(P(130), P(y + 185), P(820), P(3)); g.restore(); });
    g.restore();
  },
  F3(t, sh) {   // the copy that works
    const k = eout(seg(t, EV.copyLine, EV.copyLine + 0.25)); if (k <= 0) return;
    g.save(); g.globalAlpha = k; H2.rr(110, 1180 - 30 * (1 - k), 560, 120, 26); g.fillStyle = 'rgba(9,10,16,.88)'; g.fill(); g.fillStyle = PINK; g.fillRect(P(110), P(1180 - 30 * (1 - k)), P(10), P(120));
    H2.txt('@theo.ships', 150, 1222 - 30 * (1 - k), 40, PINK, { align: 'left', w: 800, mono: true }); H2.txt('link works ✓', 150, 1270 - 30 * (1 - k), 32, WHITE, { align: 'left', w: 700 }); g.restore();
  },
  G4(t, sh) {   // THE VOTE over his face: CHASE (pink) / ANSWER (cyan) slam in on the words; Day 2 follows
    const sh_ = (t > EV.chase ? Math.exp(-(t - EV.chase) * 7) * 16 : 0) + (t > EV.answer ? Math.exp(-(t - EV.answer) * 7) * 16 : 0);
    g.save(); g.translate(P(sh_ * Math.sin(t * 90)), P(sh_ * 0.5 * Math.cos(t * 70)));
    const top = eout(seg(t, sh.a, sh.a + 0.25)); band(1060, 1740, 0.55 * top);
    H2.txt('COMMENT', 540, 1120, 40, 'rgba(247,245,242,.85)', { w: 800, mono: true, ls: 8, alpha: top });
    const glow = 0.5 + 0.5 * Math.sin(t * 6);
    const btn = (x, y, w, label, col, fg, t0) => { const k = seg(t, t0 - 0.03, t0 + 0.12); if (k <= 0) return; const s = k < 1 ? lerp(1.9, 1, eout(k)) : 1 + 0.025 * glow;
      g.save(); g.translate(P(x), P(y)); g.scale(s, s); g.save(); g.shadowColor = col; g.shadowBlur = P(50); H2.rr(-w / 2, -95, w, 190, 95); g.fillStyle = col; g.fill(); g.restore();
      H2.txt(label, 0, 4, fitSize(label, 110, w - 70), fg, { w: 900, ls: 3 }); g.restore(); };
    btn(300, 1300, 470, 'CHASE', PINK, WHITE, EV.chase); btn(780, 1470, 470, 'ANSWER', CYAN, '#062030', EV.answer);
    if (t > EV.answer + 0.2) H2.txt('or', 545, 1388, 46, WHITE, { w: 800, alpha: eout(seg(t, EV.answer + 0.2, EV.answer + 0.4)), stroke: 6 });
    const d2 = eout(seg(t, EV.day2 - 0.05, EV.day2 + 0.25)); H2.txt('DAY 2 FOLLOWS WHAT YOU PICK', 540, 1660, 36, PINK, { w: 800, mono: true, ls: 5, alpha: d2, stroke: 6 });
    g.restore();
    if (t > EV.chase) H2.veil(0.28 * Math.exp(-(t - EV.chase) * 10), '255,61,139');
    if (t > EV.answer) H2.veil(0.28 * Math.exp(-(t - EV.answer) * 10), '56,214,255');
  },
  G5(t, sh) {   // the last card
    g.fillStyle = '#07070b'; g.fillRect(0, 0, S.fx.width, S.fx.height); g.save(); cam2(t, sh, 1.0, 1.04);
    H2.txt('TEN MILLION VIEWS · EP 1', 540, 880, 40, 'rgba(247,245,242,.7)', { w: 700, mono: true, ls: 8, alpha: ss(seg(t, sh.a, sh.a + 0.4)) });
    H2.txt('Fiction. Real rules, real sources.', 540, 1000, 52, WHITE, { w: 700, alpha: ss(seg(t, EV.fiction - 0.6, EV.fiction - 0.2)) });
    g.restore();
  },
};

// HUD: REVENUE $0 / $10,000 · ATTENTION 100 → 92 · COPIES 0 → 1 (on the scene, never on paper or cards)
function attNow(t) {
  const K = [[0, 100], [12, 100], [24, 99], [36.4, 97.6], [48.3, 96.2], [55.2, 94.6], [61.8, 93.2], [66.2, 92.0], [79, 92.0], [82.8, 91.6], [90, 91.6]];
  for (let i = 1; i < K.length; i++) if (t < K[i][0]) return lerp(K[i - 1][1], K[i][1], seg(t, K[i - 1][0], K[i][0]));
  return K[K.length - 1][1];
}
const HUD_FROM = EV.hudIn[0];
function hud(t, sh) {
  if (!(sh.kind === 'story' || sh.kind === 'vote') || t < HUD_FROM || sh.id === 'E5' || sh.id === 'E9') return;
  const pop = sh.id === 'A5' ? EV.hudIn.map(h => seg(t, h, h + 0.16)) : null;
  const cop = t >= EV.copies ? 1 : 0, cj = t >= EV.copies ? Math.exp(-(t - EV.copies) * 3) : 0;
  const attD = sh.id === 'E1' || sh.id === 'E2' || sh.id === 'G3' ? 0.8 : 0;
  H2.chips(t, { att: attNow(t), attDanger: attD, copies: cop, copiesFlash: cj * (0.5 + 0.5 * Math.sin(t * 30)), pop, shake: (t >= EV.copies && t < EV.copies + 0.4 ? 1 - seg(t, EV.copies, EV.copies + 0.4) : 0) });
}
const CAPY = { A1: 1480, A3: 1560, B2: 1620, B3: 1600, C1: 1560, C2: 1620, C4: 1560, D2: 1560, D4: 1600, D6: 1600, D7: 1600, E1: 1500, E3: 1560, E5: 1640, E6: 1580, E9: 1760, F3: 1560, G1: 1560, G4: 1820 };
const NO_CAP = new Set(['B1', 'C6', 'F1', 'F2', 'G5']);
function overlay(t) {
  const sh = shotOf(t), id = sh.id;
  if (G2D[id]) { g.save(); G2D[id](t, sh); g.restore(); }
  hud(t, sh);
  if (!NO_CAP.has(id) && !(id === 'E3' && t < EV.winning - 0.35) && !(id === 'A6' && t > sh.a + 0.3)) {
    const paperCap = sh.kind === 'explain';
    H2.captions(t, WORDS, CAPY[id] ?? (sh.face ? 1560 : 1500), { paper: paperCap, size: paperCap ? 64 : 62, cut: sh.a });
  }
}
window.__ray = (t, x, y) => { window.__frame(t); const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2(x, y), S.camera);
  const hits = rc.intersectObjects(S.scene.children, true).filter(h => h.object.visible && h.object.isMesh).slice(0, 4);
  return { cam: S.camera.position.toArray().map(v => +v.toFixed(3)), hits: hits.map(h => [h.object.name || h.object.parent?.name, +h.distance.toFixed(3)]) }; };
S.run({ prep, overlay, T_END: TL.T });
