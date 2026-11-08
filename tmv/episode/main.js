// main.js: the episode engine. It plays one episode folder (episode.json + vo/vo.json) in 3D, the Ten Million Views Ep1 way:
// the room at night (neon through the curtain, screen key, rim light), the cast from characters/rig.js, the rival in his own
// corner, the hand phone, cream cards, the HUD chip row, word-by-word captions, and the vote as the last frame (no end card).
// One beat per voiced line, cut every 2.6 s at most on word starts (its angle, then a cover angle). "shot": close | two | wide | phone | card. Who stands where: the first human of the room sits at the desk,
// bots stand on the desk, a cast entry with "role": "rival" (or "place": "corner") has the corner across town.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createStage, V, clamp, seg, ss, eout, lerp, hsh } from './stage.js';
import { buildWorld } from './world.js';
import { createHud, WHITE } from './hud.js';
import { makeCharacter } from '../characters/rig.js';
import { loadEpisode, cardsOf, timeline } from './timeline.js';

const { EP, VO } = await loadEpisode();
const PAL = { neon: '#FF3D8B', left: '#FF3D8B', right: '#29E0FF', card: '#EFE9DE', ...(EP.palette ?? {}) };
// every word the frame shows comes from episode.json (texts); these are only the fallbacks. {series} {ep} {next} fill in.
const TX = { handle: '@you', sign: 'SPEED WINS', kicker: '{series} · EP {ep}', phoneLabel: 'VIEWS', phoneHud: 'VIEWS', phoneFoot: 'last 24 h',
  or: 'or', voteFooter: 'COMMENT {a} OR {b} · EP {next} FOLLOWS', ...(EP.texts ?? {}) };
const fill = (s) => String(s).replace(/\{series\}/g, EP.series).replace(/\{ep\}/g, EP.ep).replace(/\{next\}/g, EP.ep + 1)
  .replace(/\{a\}/g, EP.vote.tagA ?? 'A').replace(/\{b\}/g, EP.vote.tagB ?? 'B');
// INKP = the accent on cream paper: palette.ink, else the neon, except the default pink neon, too light on cream, which inks deep pink
const NEON = PAL.neon, CREAM = PAL.card, INKC = '#111111', INKP = PAL.ink ?? (NEON.toUpperCase() === '#FF3D8B' ? '#E8226F' : NEON);
const KICKER = fill(TX.kicker).toUpperCase();

const S = createStage();
const Wd = await buildWorld(S, { neon: NEON });
const { R, RN, rig } = Wd;
// Ep1's story props in the room file stay hidden: the pinned buyer notes, the framed photo, the badge, the pizza logo
R.traverse(o => { if (/Buyer|Pin_Note|Photo_Pic|Badge|Pizza_Logo|^SM_Jay_/.test(o.name)) o.visible = false; });
const H2 = createHud(S.g2, S.fx.width, S.fx.height), g = S.g2, P = H2.P;

// ------------------------------------------------------------ cast
const SEEDS = window.TMV_SEEDS, CARDS = cardsOf(EP, SEEDS);
const CAST = {};
for (const m of EP.cast) CAST[m.id] = await makeCharacter(CARDS[m.id]);
for (const ch of Object.values(CAST)) S.scene.add(ch.root);
const inCorner = (ch) => (ch.c.place ?? (ch.c.role === 'rival' ? 'corner' : 'room')) === 'corner';
const roomHumans = Object.values(CAST).filter(ch => !inCorner(ch) && ch.kind === 'human');
const LEAD = roomHumans[0], EXTRA = roomHumans.slice(1), BOTS = Object.values(CAST).filter(ch => !inCorner(ch) && ch.kind === 'bot');
const SEAT = [0.28, -0.55], DESK_Y = 0.425, CX = 6;
// bots stand along the desk top (x -0.1..0.7), the lead's left and right first; other humans in the room stand behind the lead
const BOT_AT = BOTS.map((_, i) => i < 2 ? [[0.66, -0.86], [-0.08, -0.88]][i] : [0.05 + 0.5 * hsh(i, 7), -1.05]);
const STAND_AT = EXTRA.map((_, i) => [-0.35 - 0.45 * i, -0.05 - 0.15 * (i % 2)]);

const { LINES, DUR, SHOTS, shotOf, WORDS, hudAt, LAST } = timeline(EP, VO, CARDS);
const talking = (t, ch) => { const sh = shotOf(t); if (CAST[sh.who] !== ch) return 0;
  return WORDS.some(w => w.line === LINES[sh.i].id && t >= w.s && t < w.e) ? 0.35 + 0.65 * Math.abs(Math.sin(t * 15.5)) * (0.6 + 0.4 * Math.sin(t * 4.1)) : 0; };
function blink(t, o = 0) { const p = (t + 0.37 + o) % 3.1; return p < 0.16 ? Math.sin(p / 0.16 * Math.PI) : 0; }
const expOf = (t, ch, sh) => { const e = {}; const b = EP.beats[sh.i]; if (b.exp && CAST[b.who] === ch) e['exp_' + b.exp] = 0.7;
  e.exp_talk = 0.8 * talking(t, ch); e.exp_blink = blink(t, ch.c.name.length); return e; };

// ------------------------------------------------------------ screens: the laptop (code), monitors, the hand phone (the lead's views)
const lapTex = Wd.liveTex(1024, 640, (g_, w, h, t) => {
  g_.fillStyle = '#0a1230'; g_.fillRect(0, 0, w, h); g_.fillStyle = '#141b3d'; g_.fillRect(0, 0, w, 52);
  const cols = ['#7fb8f0', '#e98a4e', '#5ec4a8', '#c9a0f0', '#d8d8e0', '#ff7aa8'], sp = 40, sc = (t * sp) % 36;
  for (let i = 0; i < 18; i++) { const y = 80 + i * 36 - sc; let x = 30 + (hsh(i + Math.floor(t * sp / 36), 3) > .6 ? 48 : 0);
    for (let k = 0; k < 5; k++) { const ww = 40 + 170 * hsh(k, i + Math.floor(t * sp / 36)); g_.fillStyle = cols[Math.floor(hsh(i, k + 2) * 6)]; g_.fillRect(x, y, ww, 16); x += ww + 20; if (x > w - 60) break; } }
});
const roomLaptop = Wd.screens.SCREEN_Laptop?.[0]; if (roomLaptop) roomLaptop.material = Wd.screenMat(lapTex.tex, 2.0);
const monTex = Wd.liveTex(320, 200, (g_, w, h) => { g_.fillStyle = '#0d1530'; g_.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { g_.fillStyle = ['#7fb8f0', '#5ec4a8', '#ff7aa8', '#e9ba4f'][i % 4]; g_.fillRect(14, 16 + i * 22, 60 + 200 * hsh(i, 9), 10); } });
monTex.draw(monTex.g, 320, 200, 0); monTex.tex.needsUpdate = true;
for (const [k, ms] of Object.entries(Wd.screens)) if (/^SCREEN_(Monitor|Phone)/.test(k)) for (const m of ms) m.material = Wd.screenMat(monTex.tex, 1.6);
const phTex = Wd.liveTex(756, 1512, () => {}); phTex.tex.anisotropy = 8; const HP = createHud(phTex.g, 756, 1512);
const PH = new THREE.Group(); S.scene.add(PH);
{ const body = new THREE.Mesh(new RoundedBoxGeometry(0.076, 0.152, 0.009, 4, 0.011), new THREE.MeshStandardMaterial({ color: '#15171d', roughness: 0.32, metalness: 0.65 }));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.0712, 0.1424), Wd.screenMat(phTex.tex, 0.95)); scr.position.z = 0.00462;
  for (const m of [body, scr]) { m.castShadow = true; m.receiveShadow = false; } PH.add(body, scr); }
// the phone screen: the lead's post insights, the views count rolls when the HUD's VIEWS changes
function drawPhone(t) {
  const G = phTex.g, W_ = 756, H_ = 1512, h = hudAt(t), v = h.items.find(it => it.label === TX.phoneHud);
  G.fillStyle = '#0b0d14'; G.fillRect(0, 0, W_, H_);
  HP.txt(TX.handle, 540, 230, 44, 'rgba(247,245,242,.7)', { w: 700, mono: true });
  HP.txt(TX.phoneLabel, 540, 560, 44, 'rgba(247,245,242,.55)', { w: 700, mono: true, ls: 8 });
  const nz = Math.min(220, 660 / Math.max(3, String(v?.val ?? '0').length));   // a long count ("4,100") shrinks to stay on the screen
  if (v && v.from != null && v.k < 1) HP.roll(v.from, v.val, v.k, 540, 760, nz, WHITE, { w: 800 }); else HP.txt(v ? v.val : '0', 540, 760, nz, WHITE, { w: 800, mono: true });
  G.save(); G.strokeStyle = NEON; G.lineWidth = HP.P(10); G.lineJoin = 'round'; G.beginPath();
  for (let i = 0; i <= 24; i++) { const x = 140 + i * 33.3, y = 1340 - 260 * Math.pow(i / 24, 2.2) * (0.85 + 0.15 * hsh(i, 2)); i ? G.lineTo(HP.P(x), HP.P(y)) : G.moveTo(HP.P(x), HP.P(y)); }
  G.stroke(); G.restore(); HP.txt(TX.phoneFoot, 540, 1460, 36, 'rgba(247,245,242,.45)', { w: 600 });
  phTex.tex.needsUpdate = true;
}

// ------------------------------------------------------------ the rival's corner (far from the room): ring light, a neon sign, warm practicals
const CORNER = new THREE.Group(); S.scene.add(CORNER);
{
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(5, 3), new THREE.MeshStandardMaterial({ color: '#1b2433', roughness: 0.85 })); wall.position.set(CX, 1.2, -0.7); wall.receiveShadow = true; CORNER.add(wall);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(5, 4), new THREE.MeshStandardMaterial({ color: '#141821', roughness: 0.9 })); floor.rotation.x = -Math.PI / 2; floor.position.set(CX, 0, 0.6); floor.receiveShadow = true; CORNER.add(floor);
  const signC = document.createElement('canvas'); signC.width = 1024; signC.height = 256; const sg = signC.getContext('2d');
  sg.fillStyle = '#000'; sg.fillRect(0, 0, 1024, 256); sg.font = '900 150px "Inter Tight", Arial'; sg.textAlign = 'center'; sg.textBaseline = 'middle'; sg.shadowColor = PAL.right; sg.shadowBlur = 30; sg.fillStyle = '#d8f7ff';
  sg.fillText(TX.sign, 512, 132, 980);
  const stex = new THREE.CanvasTexture(signC); stex.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.11), new THREE.MeshBasicMaterial({ map: stex, color: new THREE.Color(2.2, 2.2, 2.2), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  CORNER.sign = sign; CORNER.add(sign);   // placed per shot in corner(), inside the frame above the head
  for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.018 + 0.01 * hsh(i, 2), 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(...(hsh(i, 5) > 0.5 ? [3.2, 1.9, 0.9] : [0.9, 1.6, 3.0])) }));
    b.position.set(CX - 1.0 + 2.1 * hsh(i, 1), 0.75 + 0.75 * hsh(i, 3), -0.62); CORNER.add(b); }
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 0.18), new THREE.MeshStandardMaterial({ color: '#2a3344', roughness: 0.7 })); shelf.position.set(CX - 0.55, 0.92, -0.6); CORNER.add(shelf);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.012, 16, 80), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 4, 4.2) })); CORNER.ring = ring; CORNER.add(ring);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.9, 8), new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.5 })); CORNER.pole = pole; CORNER.add(pole);
}

// ------------------------------------------------------------ the room's open side (behind the lead in her close-ups): a wall with string lights
const BACK = new THREE.Group(); R.add(BACK);
{
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.1), new THREE.MeshStandardMaterial({ color: '#232a44', roughness: 0.9 })); wall.rotation.y = Math.PI; wall.position.set(0, 1.05, 1.0); wall.receiveShadow = true; BACK.add(wall);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.1), new THREE.MeshStandardMaterial({ color: '#1e2540', roughness: 0.9 })); side.rotation.y = -Math.PI / 2; side.position.set(1.5, 1.05, -0.15); BACK.add(side);
  for (let i = 0; i < 22; i++) { const x = -1.3 + i * 0.12, y = 1.45 - 0.1 * Math.sin(i * 0.55) ** 2, warm = i % 3 !== 1;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), new THREE.MeshBasicMaterial({ color: warm ? new THREE.Color(3.4, 2.0, 0.9) : new THREE.Color(PAL.left).multiplyScalar(2.6) })); b.position.set(x, y, 0.97); BACK.add(b); }
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.16), new THREE.MeshStandardMaterial({ color: '#3a3346', roughness: 0.7 })); shelf.position.set(0.55, 0.95, 0.92); BACK.add(shelf);
  for (let i = 0; i < 6; i++) { const bk = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.14 + 0.06 * hsh(i, 4), 0.12), new THREE.MeshStandardMaterial({ color: ['#c9663a', '#29506e', '#e2a23b', '#6d3a5a', '#2f6b5a', '#d8d2c4'][i], roughness: 0.8 }));
    bk.position.set(0.25 + i * 0.05, 1.04 + 0.03 * hsh(i, 4), 0.92); BACK.add(bk); }
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), new THREE.MeshStandardMaterial({ color: PAL.right, emissive: new THREE.Color(PAL.right), emissiveIntensity: 0.25, roughness: 0.8 })); poster.rotation.y = Math.PI; poster.position.set(-0.55, 1.05, 0.985); BACK.add(poster);
  // a plant on the shelf, a note board with pinned cards, a desk lamp's warm wash: the wall reads as a lived-in room
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.09, 16), new THREE.MeshStandardMaterial({ color: '#e7dccb', roughness: 0.7 })); pot.position.set(0.88, 1.01, 0.92); BACK.add(pot);
  for (let i = 0; i < 7; i++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshStandardMaterial({ color: ['#3f8a5a', '#2f6b47', '#57a06c'][i % 3], roughness: 0.8 }));
    lf.scale.set(0.6, 1.6, 0.6); lf.position.set(0.88 + 0.05 * Math.cos(i * 0.9), 1.1 + 0.03 * hsh(i, 6), 0.92 + 0.04 * Math.sin(i * 0.9)); lf.rotation.z = 0.5 * Math.cos(i * 0.9); BACK.add(lf); }
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), new THREE.MeshStandardMaterial({ color: '#7a5a40', roughness: 0.95 })); board.rotation.y = Math.PI; board.position.set(-0.05, 1.12, 0.99); BACK.add(board);
  for (let i = 0; i < 6; i++) { const n = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.09), new THREE.MeshStandardMaterial({ color: ['#f4efe6', '#ffd36b', '#ff9cc0', '#9fe3ff'][i % 4], roughness: 0.9 }));
    n.rotation.set(0, Math.PI, 0.15 * (hsh(i, 8) - 0.5)); n.position.set(-0.25 + 0.14 * (i % 3) + 0.03 * hsh(i, 9), 1.2 - 0.15 * Math.floor(i / 3), 0.985); BACK.add(n); }
  const wash = new THREE.SpotLight('#ffb070', 1.1, 2.6, 0.9, 0.8, 1.4); wash.position.set(0.1, 1.9, 0.5); wash.target.position.set(0.1, 1.0, 1.0); BACK.add(wash, wash.target);
  const glow = new THREE.PointLight('#ffb070', 1.4, 2.2, 1.6); glow.position.set(0, 1.3, 0.75); BACK.add(glow);
  const glow2 = new THREE.PointLight(PAL.left, 0.9, 2.0, 1.6); glow2.position.set(-0.9, 1.2, 0.7); BACK.add(glow2);
}

// ------------------------------------------------------------ light looks
const NAVY = new THREE.Color('#070a1c');
function night(o = {}) {
  Wd.lightsOff(); Wd.occNeon.visible = true; Wd.occSun.visible = false;
  Wd.setStates({ ...Wd.ROOM_DEF, cash: 'low', pride: 'high', mom: 'mid', badge: 'hook', light: 'night' }); Wd.badgePivot.visible = false; if (RN.ST_badge_held) RN.ST_badge_held.visible = false;
  for (const b of Wd.lampBulbs) b.material.emissiveIntensity = 1.6;
  rig.screenKey.position.set(0.28, 0.72, -1.12); rig.screenKey.target.position.set(0.28, 0.66, -0.3); rig.screenKey.angle = 0.9; rig.screenKey.color.set('#86b6ff');
  rig.hemi.color.set('#3d4380'); rig.hemi.groundColor.set('#1a0f1c'); rig.hemi.intensity = o.hemi ?? 0.45;
  Wd.through(rig.neon, o.neonTgt ?? V(-0.2, 0.55, -0.3), 1.4, 0.3); rig.neon.intensity = o.neon ?? 7;
  rig.screenKey.intensity = 0.75 * (o.screen ?? 3.4); rig.amber.position.set(-0.06, 0.6, -0.92); rig.amber.distance = 1.4; rig.amber.intensity = o.amber ?? 0.25;
  for (const c of Wd.curtains) c.material.emissiveIntensity = 0.2;
  if (RN.SM_Env_Window_Glass_night) RN.SM_Env_Window_Glass_night.material = Wd.nightGlassMat;
  S.scene.background = NAVY;
}
// a face light: key from the front-below (the phone or screen glow), a cold rim from behind, the neon fill from the side
function faceLight(face, o = {}) {
  const kp = o.kp ?? face.clone().add(V(0, -0.08, o.front ?? -0.35));
  rig.key.color.set(o.keyCol ?? '#a9c0ff'); rig.key.position.copy(kp).lerp(face, 0.2); rig.key.target.position.copy(face); rig.key.angle = 0.75; rig.key.penumbra = 1; rig.key.distance = 3; rig.key.decay = 1.5;
  rig.key.intensity = 0.55 * (o.key ?? 2.2);
  rig.rimPink.color.set(o.rimCol ?? '#7f93ff'); rig.rimPink.position.copy(face).add(V(o.rimX ?? -0.9, 1.0, o.rimZ ?? 1.6)); rig.rimPink.target.position.copy(face); rig.rimPink.target.updateMatrixWorld(); rig.rimPink.intensity = o.rim ?? 2.0;
  rig.lapKey.color.set(o.fillCol ?? NEON); rig.lapKey.position.copy(face).add(V(o.fillX ?? 1.2, 0.3, -0.8)); rig.lapKey.target.position.copy(face); rig.lapKey.target.updateMatrixWorld(); rig.lapKey.intensity = 0.5 * (o.fill ?? 0.8);
}
function cornerLights(face) {
  Wd.lightsOff(); Wd.occNeon.visible = false; Wd.occSun.visible = false;
  rig.hemi.color.set('#5a6aa0'); rig.hemi.groundColor.set('#120c18'); rig.hemi.intensity = 0.55;
  rig.key.color.set('#f4f6ff'); rig.key.position.copy(face).add(V(-0.16, 0.05, 0.6)); rig.key.target.position.copy(face); rig.key.angle = 0.55; rig.key.penumbra = 0.9; rig.key.distance = 8; rig.key.decay = 1.2; rig.key.intensity = 3.5;
  rig.rimPink.color.set(NEON); rig.rimPink.position.set(CX + 3, 3, -4); rig.rimPink.target.position.set(CX, 0.8, 0); rig.rimPink.target.updateMatrixWorld(); rig.rimPink.intensity = 3.2;
  rig.lapKey.color.set(PAL.right); rig.lapKey.position.set(CX - 3, 2.5, -3); rig.lapKey.target.position.set(CX, 0.8, 0); rig.lapKey.target.updateMatrixWorld(); rig.lapKey.intensity = 1.6;
  rig.amber.position.set(CX - 0.6, 1.0, -0.4); rig.amber.distance = 2.0; rig.amber.intensity = 1.2;
  S.scene.background = new THREE.Color('#0b0e16');
}

// ------------------------------------------------------------ poses
function holdPhone(ch, t, o = {}) {   // the lead at the desk, the phone in both hands; o.dp moves it down to the chest for face shots
  const br = Math.sin(t * 2 * Math.PI * 0.25);
  const base = { at: SEAT, yaw: Math.PI, sit: 1, lean: (o.lean ?? 10) + br * 0.5, curl: o.curl ?? 6, head: [(o.pitch ?? 20) + br * 0.6, o.hy ?? 0, o.hr ?? 0], shrug: 3, exp: o.exp };
  ch.pose(base);
  const hd = ch.head(), c = hd.clone().add(V(0.0, -0.075, -0.22)).add(o.dp ?? V(0, 0, 0));
  c.y += 0.003 * Math.sin(t * 1.3); c.x += 0.002 * Math.sin(t * 0.9);
  PH.position.copy(c); PH.up.set(0, 1, 0); PH.lookAt(hd.clone().add(V(0, 0.03, 0))); PH.updateMatrixWorld(true);
  const hl = PH.localToWorld(V(-0.026, -0.075, -0.012)), hr = PH.localToWorld(V(0.03, -0.07, -0.008));
  ch.pose({ ...base, armL: { ik: hl, pole: ch.rootDir(0.9, -0.7, -0.3) }, armR: { ik: hr, pole: ch.rootDir(-0.9, -0.7, -0.3) } });
  PH.visible = true; drawPhone(t);
  return { hd, n: hd.clone().sub(c).normalize() };
}
function typing(ch, t, o = {}) {
  const a = Math.abs(Math.sin(t * 19)), b = Math.abs(Math.sin(t * 17 + 1));
  ch.pose({ at: SEAT, yaw: Math.PI, sit: 1, lean: 9, head: [o.pitch ?? 8, 2 * Math.sin(t * 0.7), 0],
    armL: { ik: V(0.2, DESK_Y + 0.03 + 0.012 * a, -0.9), pole: ch.rootDir(0.9, -0.6, 0) }, armR: { ik: V(0.37, DESK_Y + 0.03 + 0.012 * b, -0.9), pole: ch.rootDir(-0.9, -0.6, 0) }, exp: o.exp });
}
function cornerPose(ch, t, o = {}) {   // standing, phone up, talking to it (selfie)
  const base = { at: [CX, 0], yaw: 0, sit: 0, lean: 2, head: [-4 + 2 * Math.sin(t * 1.7), -6 + 4 * Math.sin(t * 0.9), 4 * Math.sin(t * 1.1)], shrug: 2, exp: o.exp };
  ch.pose(base); const hd = ch.head();
  ch.pose({ ...base, armR: { ik: hd.clone().add(V(-0.07, -0.08, 0.3)), pole: ch.rootDir(-0.7, -0.8, -0.2) }, armL: { up: ch.rootDir(0.25, -1, 0.05), fore: ch.rootDir(0.15, -0.6, 0.6) } });
  return ch.head();
}
const yawTo = (p, q) => Math.atan2(q.x - p.x, q.z - p.z);
function poseBots(t, sh, lookAt) {
  EXTRA.forEach((h, i) => { if (CAST[sh.who] === h && sh.shot !== 'wide' && sh.shot !== 'room') return; const [x, z] = STAND_AT[i]; h.pose({ at: [x, z], yaw: yawTo(V(x, 0, z), V(SEAT[0], 0, SEAT[1])), sit: 0, lean: 3, head: [4, 0, 0], exp: expOf(t, h, sh) }); });
  BOTS.forEach((b, i) => { const [x, z] = BOT_AT[i], p = V(x, DESK_Y, z);
    const speaking = talking(t, b), ex = EP.beats[sh.i].exp;
    b.pose({ at: [x, z], y: DESK_Y, yaw: yawTo(p, lookAt ?? V(SEAT[0], 0, SEAT[1])), t: t + i, talk: speaking, blink: blink(t, 1.3 + i), hop: speaking && /excited|proud/.test(ex ?? '') ? 1 : 0, wave: speaking ? 0.4 : 0, look: [-8, 0] }); });
}

// ------------------------------------------------------------ cameras
const camLook = (pos, tgt, fov, o = {}) => ({ pos, tgt, fov, ...o });
const drift = (t, a = 1) => V(a * (0.6 * Math.sin(t * 1.13) + 0.4 * Math.sin(t * 2.71 + 1)), a * (0.6 * Math.sin(t * 0.87 + 2) + 0.4 * Math.sin(t * 2.31)), a * 0.5 * Math.sin(t * 0.61 + 3));
const lin = (k) => 0.15 * ss(k) + 0.85 * k;
const WILD = []; R.traverse(o => { if (o.isMesh && /^SM_Env_(Mon|Laptop|Cable_Mon|Lamp_(Arm|Shade|Base)|Photo|Can2|Mug|Food|Rice|Chopstick)/.test(o.name)) WILD.push(o); });
const WILD_V = new Map(WILD.map(o => [o, o.visible]));
function wild(on) { for (const o of WILD) o.visible = on ? false : WILD_V.get(o); }
const ALT = (i) => (i % 2 ? 1 : -1);   // alternate the camera side shot to shot

const F3D = {
  // the lead in the room: phone insert, face close-up, a two-shot with the bot, the wide room
  phone(t, sh) {
    const k = lin(seg(t, sh.a, sh.b)), ph = holdPhone(LEAD, t, { exp: expOf(t, LEAD, sh) }); poseBots(t, sh);
    const n = ph.n, side = V(n.z, 0, -n.x).normalize(), d = lerp(0.2, 0.17, k), look = PH.position.clone();
    for (const m of WILD) if (/Laptop|Mon/.test(m.name)) m.visible = false;
    faceLight(ph.hd.clone().add(V(0, 0.075, -0.04)), { kp: PH.position.clone().add(V(0, 0.02, -0.02)) });
    const pos = look.clone().addScaledVector(n, d).addScaledVector(side, lerp(0.5, 0.35, k) * d).add(V(0, lerp(0.35, 0.25, k) * d, 0)).add(drift(t, 0.0025));
    return camLook(pos, look.clone().add(drift(t + 7, 0.0015)), 40, { roll: lerp(-0.05, 0.03, k), focus: d, aperture: 1.0 });
  },
  close(t, sh) {
    const ch = CAST[sh.who];
    if (ch.kind === 'bot') {   // the bot's close-up, on the desk, the lead soft behind it
      holdPhone(LEAD, t, { exp: expOf(t, LEAD, sh), dp: V(0, -0.2, 0.04), pitch: 8, lean: 6 }); PH.visible = false; poseBots(t, sh);
      const hd = ch.head(), k = lin(seg(t, sh.a, sh.b)), ld = LEAD.head(), dir = ld.clone().sub(hd).setY(0).normalize();
      const side = V(dir.z, 0, -dir.x).multiplyScalar(ALT(sh.i + sh.j));
      faceLight(hd, { kp: hd.clone().add(dir.clone().multiplyScalar(0.3)).add(V(0, -0.05, 0)), key: 2.6, rim: 2.4 });
      const pos = hd.clone().addScaledVector(dir, lerp(0.8, 0.68, k)).addScaledVector(side, 0.18).add(V(0, 0.02, 0)).add(drift(t, 0.002));
      return camLook(pos, hd.clone().add(V(0, -0.03, 0)), 34, { roll: 0.03 * ALT(sh.i + sh.j), focus: pos.distanceTo(hd), aperture: 1.0 });
    }
    if (inCorner(ch)) return corner(t, sh, ch, true);
    return face(t, sh, ch, { p0: [0.24 * ALT(sh.i + sh.j), -0.02, -0.5], p1: [0.2 * ALT(sh.i + sh.j), -0.02, -0.46], fov0: 52, fov1: 47, tg: [0, sh.i === LAST.i ? -0.17 : -0.11, 0] });
  },
  two(t, sh) {
    const ch = CAST[sh.who];
    if (inCorner(ch)) return corner(t, sh, ch, false);
    // the lead (phone at the chest) and the bot on the desk, from the bot's side
    holdPhone(LEAD, t, { exp: expOf(t, LEAD, sh), dp: V(0, -0.2, 0.04), pitch: 4, lean: 6, hy: 18 }); poseBots(t, sh);
    const k = lin(seg(t, sh.a, sh.b)), ld = LEAD.head(), bt = BOTS[0]?.head() ?? ld.clone().add(V(0.3, -0.2, -0.3)), mid = ld.clone().lerp(bt, 0.5);
    wild(true);
    faceLight(ld.clone().add(V(0, 0.075, -0.04)), { kp: PH.position.clone(), fill: 1.0 });
    const pos = V(lerp(-0.22, -0.14, k), lerp(0.98, 0.95, k), lerp(0.28, 0.2, k)).add(drift(t, 0.003));
    return camLook(pos, mid.clone().add(V(0, -0.04, 0)), 44, { roll: -0.03, focus: pos.distanceTo(mid), aperture: 0.6 });
  },
  wide(t, sh) {
    const ch = CAST[sh.who];
    if (inCorner(ch)) return corner(t, sh, ch, false);
    typing(LEAD, t, { exp: expOf(t, LEAD, sh) }); PH.visible = false; poseBots(t, sh);
    const k = lin(seg(t, sh.a, sh.b)), ld = LEAD.head();
    faceLight(ld.clone().add(V(0, 0.05, -0.05)), { key: 1.6, rim: 2.6 });
    const pos = V(lerp(-0.55, -0.45, k), 1.05, lerp(0.75, 0.6, k)).add(drift(t, 0.004)), tgt = V(0.3, 0.55, -0.75);
    return camLook(pos, tgt, 46, { focus: pos.distanceTo(ld), aperture: 0.4 });
  },
  // the establishing shot: the lit room, the lead at the laptop from the front, the bots on the desk, string lights behind
  room(t, sh) {
    const ch = CAST[sh.who];
    if (inCorner(ch)) return corner(t, sh, ch, false);
    typing(LEAD, t, { exp: expOf(t, LEAD, sh), pitch: -6 }); PH.visible = false; poseBots(t, sh);
    for (const m of WILD) if (/Mon/.test(m.name)) m.visible = false;
    const k = lin(seg(t, sh.a, sh.b)), ld = LEAD.head();
    faceLight(ld.clone().add(V(0, 0.05, -0.05)), { kp: ld.clone().add(V(-0.35, 0.3, -0.6)), key: 1.0, keyCol: '#ffe6d2', rim: 2.4, fill: 0.5 });
    rig.screenKey.intensity *= 0.35; rig.hemi.intensity = 0.8;
    // from the window over the laptop (Ep1's opening): the lead at her desk, the lit back wall (string lights, shelf, plant, notes) behind
    const pos = V(lerp(0.5, 0.46, k), lerp(0.9, 0.88, k), -1.27).add(drift(t, 0.002)), tgt = V(0.2, 0.6, 0.6);
    return camLook(pos, tgt, lerp(70, 64, k), { focus: pos.distanceTo(ld), aperture: 0.2 });
  },
  card(t, sh) { typing(LEAD, t, {}); return camLook(V(0, 1, 2), V(0, 1, 0), 40); },   // the 2D card covers the frame
  stats(t, sh) { return F3D.card(t, sh); },
  previously(t, sh) { return F3D.card(t, sh); },
};
function face(t, sh, ch, c) {
  const k = lin(seg(t, sh.a, sh.b)), r = holdPhone(ch, t, { pitch: -2, lean: 6, curl: 4, dp: V(0, -0.2, 0.04), exp: expOf(t, ch, sh) }); poseBots(t, sh);
  wild(true);
  const f = r.hd.clone().add(V(0, 0.075, -0.04));
  // key from the side and above, a step back (not the phone under the chin): the face keeps its shape, eyes and brows read
  faceLight(f, { kp: f.clone().add(V(0.32 * ALT(sh.i + sh.j), 0.22, -0.55)), key: 0.9, keyCol: '#ffe6d2', fill: 0.35, rim: 2.2 });
  rig.screenKey.intensity *= 0.3;
  const pos = f.clone().add(V(...c.p0).lerp(V(...c.p1), k)).add(drift(t, 0.003)); pos.z = Math.max(pos.z, -1.16);
  const tgt = f.clone().add(V(...c.tg)).add(drift(t + 5, 0.0015));
  return camLook(pos, tgt, lerp(c.fov0, c.fov1, k), { roll: 0.03 * ALT(sh.i + sh.j), focus: pos.distanceTo(f), aperture: 0.9 });
}
function corner(t, sh, ch, close) {
  R.visible = false; CORNER.visible = true; PH.visible = false;
  for (const o of Object.values(CAST)) o.root.visible = o === ch;
  const hd = cornerPose(ch, t, { exp: expOf(t, ch, sh) }); cornerLights(hd);
  CORNER.ring.position.copy(hd).add(V(-0.2, -0.02, 0.5)); CORNER.ring.lookAt(hd); CORNER.pole.position.copy(CORNER.ring.position).add(V(0, -0.62, 0));
  const k = lin(seg(t, sh.a, sh.b)), f = hd.clone().add(V(0, 0.11, 0.03));
  const n = SHOTS.filter(s => (s.i < sh.i || (s.i === sh.i && s.j < sh.j)) && CAST[s.who] === ch && s.shot === sh.shot).length, al = n % 2 ? -1 : 1;   // his next shot of the same kind mirrors
  const [p0, p1] = close ? [[0.18 * al, -0.04, 0.9 + (0.12 * n) % 0.24], [0.12 * al, -0.03, 0.72 + (0.12 * n) % 0.24]] : [[0.5 * al, 0.05, 1.7], [0.42 * al, 0.04, 1.5]];
  CORNER.sign.position.set(hd.x - (close ? 0.14 : 0.04) * al, hd.y + (close ? 0.36 : 0.2), -0.68);
  const pos = f.clone().add(V(...p0).lerp(V(...p1), k)).add(drift(t, 0.003)), tgt = f.clone().add(V(0, close ? -0.03 : -0.25, 0));
  return camLook(pos, tgt, close ? 34 : 38, { roll: lerp(0.03, 0, k), focus: pos.distanceTo(f), aperture: 0.9 });
}
function prep(t, tf) {
  const sh = shotOf(tf ?? t);
  wild(false); R.visible = true; CORNER.visible = false; PH.visible = false; Wd.dust.visible = false;
  for (const ch of Object.values(CAST)) ch.root.visible = !inCorner(ch);
  night(); lapTex.draw(lapTex.g, 1024, 640, t); lapTex.tex.needsUpdate = true;
  return (F3D[sh.shot] ?? F3D.close)(t, sh);
}

// ------------------------------------------------------------ 2D: HUD chips, captions, the title, cards, the vote
function wipeText(s, x, y, size, col, k, o = {}) {
  if (k <= 0) return; const w = H2.measure(s, size, o.w ?? 900);
  g.save(); g.beginPath(); g.rect(P(x - w / 2 - 20), P(y - size), P((w + 40) * eout(k)), P(size * 2)); g.clip(); H2.txt(s, x + 30 * (1 - eout(k)), y, size, col, { w: 900, ...o }); g.restore();
}
function band(y0, y1, a = 0.75) {   // a dark band behind white type laid over the scene
  g.save(); const bg = g.createLinearGradient(0, P(y0), 0, P(y1)); bg.addColorStop(0, 'rgba(6,7,14,0)'); bg.addColorStop(0.25, `rgba(6,7,14,${a})`); bg.addColorStop(0.75, `rgba(6,7,14,${a})`); bg.addColorStop(1, 'rgba(6,7,14,0)');
  g.fillStyle = bg; g.fillRect(0, P(y0), S.fx.width, P(y1 - y0)); g.restore();
}
function paper(col) {
  g.fillStyle = col; g.fillRect(0, 0, S.fx.width, S.fx.height);
  g.save(); for (let i = 0; i < 220; i++) { g.fillStyle = `rgba(80,60,40,${0.02 + 0.025 * hsh(i, 3)})`; g.fillRect(P(hsh(i, 1) * 1080), P(hsh(i, 2) * 1920), P(2 + 3 * hsh(i, 4)), P(2 + 3 * hsh(i, 5))); } g.restore();
}
const fitSize = (s, size, maxW) => Math.min(size, size * maxW / (H2.measure(s, size, 900) + 4 * s.length));
function card(t, sh) {
  paper(CREAM); const k = lin(seg(t, sh.a, sh.b)), s = lerp(1, 1.05, k);
  g.save(); g.translate(P(540), P(960 - 8 * k)); g.scale(s, s); g.translate(-P(540), -P(960));
  const L = sh.card ?? [], y0 = 860 - (L.length - 1) * 70;
  L.forEach((ln, i) => wipeText(ln, 540, y0 + i * 140, fitSize(ln, 118, 940), i === L.length - 1 ? INKP : INKC, seg(t, sh.a + 0.05 + i * 0.35, sh.a + 0.4 + i * 0.35)));
  H2.txt(KICKER, 540, 1800, 24, 'rgba(17,17,17,.42)', { w: 600, mono: true, ls: 6 });
  g.restore();
}
// a data card (Ep1's "WHERE YOU STAND"): "stats": [{ "label", "value", "extra", "bar" }], optional "head" and "source" lines
function stats(t, sh) {
  paper(CREAM); const k = lin(seg(t, sh.a, sh.b)), s = lerp(1, 1.04, k);
  g.save(); g.translate(P(540), P(960)); g.scale(s, s); g.translate(-P(540), -P(960));
  if (sh.head) H2.txt(sh.head.toUpperCase(), 540, 330, 34, 'rgba(17,17,17,.6)', { w: 700, mono: true, ls: 6, alpha: eout(seg(t, sh.a, sh.a + 0.25)) });
  const rows = sh.stats ?? [], gap = Math.min(250, 1000 / Math.max(rows.length, 1));
  rows.forEach((r, i) => { const y = 450 + i * gap, kk = eout(seg(t, sh.a + 0.15 + i * 0.35, sh.a + 0.4 + i * 0.35)); if (kk <= 0) return;
    g.save(); g.globalAlpha = kk; g.translate(P(-40 * (1 - kk)), 0);
    H2.txt(String(r.label).toUpperCase(), 130, y, 30, 'rgba(17,17,17,.55)', { align: 'left', w: 700, mono: true, ls: 4 });
    const v = String(r.value), vs = fitSize(v, 120, 560);
    H2.txt(v, 130, y + 95, vs, r.style === 'danger' ? INKP : INKC, { align: 'left', w: 900 });
    if (r.extra) H2.txt(String(r.extra), 130 + H2.measure(v, vs, 900) + 14, y + 108, 44, 'rgba(17,17,17,.45)', { align: 'left', w: 700 });
    if (r.bar != null) { H2.rr(130, y + 165, 820, 18, 9); g.fillStyle = 'rgba(17,17,17,.12)'; g.fill(); H2.rr(130, y + 165, Math.max(18, 820 * clamp(r.bar) * eout(seg(t, sh.a + 0.4 + i * 0.35, sh.a + 1.1 + i * 0.35))), 18, 9); g.fillStyle = r.style === 'danger' ? INKP : INKC; g.fill(); }
    g.fillStyle = 'rgba(17,17,17,.14)'; g.fillRect(P(130), P(y + gap - 40), P(820), P(3)); g.restore(); });
  if (sh.source) H2.txt(sh.source, 540, 1470, 28, 'rgba(17,17,17,.55)', { w: 600, alpha: eout(seg(t, sh.a + 0.3, sh.a + 0.6)) });
  H2.txt(KICKER, 540, 1800, 24, 'rgba(17,17,17,.42)', { w: 600, mono: true, ls: 6 });
  g.restore();
}
const T0 = (SHOTS.find(s => s.shot !== 'previously') ?? SHOTS[0]).a;   // Ep 2+: the title waits for the first scene after PREVIOUSLY
// Ep 2+ opens on this card (ST-79): PREVIOUSLY · EP N, last episode's question, the winning answer lit, the other one struck
function previously(t, sh) {
  paper(CREAM); const P_ = EP.previously, k = lin(seg(t, sh.a, sh.b)), s = lerp(1, 1.04, k);
  g.save(); g.translate(P(540), P(960)); g.scale(s, s); g.translate(-P(540), -P(960));
  H2.txt(fill(TX.previously ?? 'PREVIOUSLY · EP {prev}').replace(/\{prev\}/g, P_.ep).toUpperCase(), 540, 430, 34, INKP, { w: 800, mono: true, ls: 8, alpha: eout(seg(t, sh.a, sh.a + 0.25)) });
  wipeText(P_.question.toUpperCase(), 540, 560, fitSize(P_.question.toUpperCase(), 64, 900), INKC, seg(t, sh.a + 0.1, sh.a + 0.45));
  const pill = (y, tag, text, win, t0) => { const kk = eout(seg(t, t0, t0 + 0.3)); if (kk <= 0) return; const lab = `${tag} · ${String(text).toUpperCase()}`;
    g.save(); g.globalAlpha = kk * (win ? 1 : 0.4); H2.rr(160, y - 62, 760, 124, 62); g.fillStyle = win ? INKP : 'rgba(17,17,17,.18)'; g.fill();
    H2.txt(lab, 540, y + 3, fitSize(lab, 56, 680), win ? WHITE : INKC, { w: 900, ls: 2 });
    if (!win) { g.fillStyle = INKC; g.fillRect(P(200), P(y - 2), P(680 * eout(seg(t, t0 + 0.4, t0 + 0.7))), P(5)); }
    g.restore(); };
  pill(760, P_.winner.tag, P_.winner.text, true, sh.a + 0.5); pill(930, P_.loser.tag, P_.loser.text, false, sh.a + 0.6);
  H2.txt(fill(TX.youPicked ?? 'YOU PICKED {tag}').replace(/\{tag\}/g, P_.winner.tag).toUpperCase(), 540, 1120, 40, INKC, { w: 800, mono: true, ls: 6, alpha: eout(seg(t, sh.a + 1.0, sh.a + 1.3)) });
  H2.txt(KICKER, 540, 1800, 24, 'rgba(17,17,17,.42)', { w: 600, mono: true, ls: 6 });
  g.restore();
}
function title(t) {   // the kicker and the episode title over the first shot
  const a = ss(seg(t, T0 + 0.1, T0 + 0.4)) * (1 - ss(seg(t, T0 + 2.0, T0 + 2.4))); if (a <= 0) return;
  // over the establishing shot's ceiling, under the HUD: no band, the type carries its own dark edge
  H2.txt(KICKER, 540, 380, 30, NEON, { w: 700, mono: true, ls: 8, alpha: a, stroke: 6 });
  wipeText(EP.title.toUpperCase(), 540, 480, fitSize(EP.title.toUpperCase(), 100, 940), WHITE, seg(t, T0 + 0.2, T0 + 0.55), { alpha: a, stroke: 10 });
}
const wordAt = (re, d) => WORDS.find(w => w.line === LINES[LAST.i].id && re.test(w.w.replace(/[^\w]/g, '')))?.s ?? LAST.ls + d;
const TAG_A = EP.vote.tagA ?? 'A', TAG_B = EP.vote.tagB ?? 'B', esc = (x) => x.replace(/[^\w]/g, '');
const T_A = wordAt(new RegExp(`^${esc(TAG_A)}$`), 0.5), T_B = wordAt(new RegExp(`^${esc(TAG_B)}$`), 1.6);
function vote(t) {
  if (t < LAST.ls - 0.1) return;
  // everything sits inside the Reels/TikTok safe zone (y 250..1500, x 80..920): the bottom 20 % and the right edge carry the app's own UI
  const top = eout(seg(t, LAST.ls - 0.1, LAST.ls + 0.25)); band(940, 1520, 0.6 * top);
  H2.txt(EP.vote.question.toUpperCase(), 500, 1010, fitSize(EP.vote.question.toUpperCase(), 40, 820), 'rgba(247,245,242,.95)', { w: 800, mono: true, ls: 4, alpha: top, stroke: 6 });
  const glow = 0.5 + 0.5 * Math.sin(t * 6);
  const btn = (x, y, w, label, col, fg, t0) => { const k = seg(t, t0 - 0.03, t0 + 0.12); if (k <= 0) return; const s = k < 1 ? lerp(1.9, 1, eout(k)) : 1 + 0.025 * glow;
    g.save(); g.translate(P(x), P(y)); g.scale(s, s); g.save(); g.shadowColor = col; g.shadowBlur = P(50); H2.rr(-w / 2, -70, w, 140, 70); g.fillStyle = col; g.fill(); g.restore();
    H2.txt(label, 0, 4, fitSize(label, 64, w - 80), fg, { w: 900, ls: 2 }); g.restore(); };
  btn(500, 1135, 760, `${TAG_A} · ${EP.vote.a.toUpperCase()}`, PAL.left, WHITE, T_A); btn(500, 1355, 760, `${TAG_B} · ${EP.vote.b.toUpperCase()}`, PAL.right, '#062030', T_B);
  if (t > T_B + 0.2) H2.txt(TX.or, 500, 1245, 36, WHITE, { w: 800, alpha: eout(seg(t, T_B + 0.2, T_B + 0.4)), stroke: 6 });
  // the footer on its own dark pill in white: readable over a pink-lit sweater (it was neon on pink)
  const d2 = eout(seg(t, LAST.le, LAST.le + 0.3)), ft = fill(TX.voteFooter).toUpperCase(), fw = Math.min(800, H2.measure(ft, 30, 800, true) + 4 * ft.length) + 56;
  if (d2 > 0) { g.save(); g.globalAlpha = d2; H2.rr(500 - fw / 2, 1458, fw, 56, 28); g.fillStyle = 'rgba(6,7,12,.85)'; g.fill(); g.restore(); }
  H2.txt(ft, 500, 1487, 30, WHITE, { w: 800, mono: true, ls: 4, alpha: d2 });
  if (t > T_A) H2.veil(0.25 * Math.exp(-(t - T_A) * 10), '255,61,139');
}
function overlay(t) {
  const sh = shotOf(t);
  if (sh.shot === 'card') card(t, sh);
  else if (sh.shot === 'previously') previously(t, sh);
  else if (sh.shot === 'stats') stats(t, sh);
  else H2.chips(t, hudAt(t).items, { accent: NEON, alpha: ss(seg(t, 0.3, 0.6)) });
  title(t);
  const paperShot = sh.shot === 'card' || sh.shot === 'stats' || sh.shot === 'previously';
  if (sh.i !== LAST.i || t < LAST.le + 0.3) H2.captions(t, WORDS, paperShot ? 1620 : 1560, { paper: paperShot, size: 62, cut: sh.a, accent: NEON, ink: INKP });
  vote(t);
}
S.run({ prep, overlay, T_END: DUR });
