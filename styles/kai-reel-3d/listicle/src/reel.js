// reel.js · reel63 "4 plugins" PIT STOP (ksa-reel-3d listicle mode, words = reel11 CODING). Chapter router.
// The orchestrator owns this file, set.js and ch/kit.js. Each chapter lives in src/ch/cN_*.js (one builder each) and exports
//   default async function build(ctx) → { group, update(t), final(t), cam(t), hero(t), cues }
// Router per frame: reset the car + the driver → final(t) of every finished chapter (keeps its car upgrade on) → update(t) of
// the active chapter → its camera. Between chapters: a checkered-flag wipe (2D, ±0.12 s). On top: the taped-paper chapter
// title and word-locked paper-scrap captions. Pure function of t.
import * as THREE from 'three';
import { createStage, V, seg, ss, lerp, clamp, hsh } from './stage.js';
import { buildSet, makeCar, CL_S } from './set.js';
import { buildBg } from './bg.js';
import { W, WE, s_, e_, ez, win, pulse, pop, pose, clawd, BL, LN } from './ch/kit.js';

const Q = new URLSearchParams(location.search);
const S = createStage();
const U = S.comp.uniforms;                                                    // warm late-afternoon grade (the template is a night grade)
U.uLift.value.setRGB(0.03, 0.02, 0.012); U.uGain.value.setRGB(1.04, 1.0, 0.93); U.uExpo.value = 0.78; U.uVig.value = 0.55; U.uSat.value = 1.08;
// v2 brightness dry run (Kai 2026-10-18 "màu hơi tối"): ?grade=A|B|C previews a brighter grade; no param = the current grade
const GRADES = { A: { expo: 0.92, vig: 0.40 }, B: { expo: 1.0, vig: 0.30, lift: [0.05, 0.045, 0.035] },
  C: { expo: 1.1, vig: 0.20, sat: 1.15, gain: [1.02, 1.0, 0.98], lift: [0.05, 0.05, 0.05] } };
const GR = GRADES[Q.get('grade') || 'B'];   // Kai 2026-10-18 picked row 3 = B + neutral light + tint fix (?grade=v1&light=warm&tint=v1 = old look)
if (GR) { U.uExpo.value = GR.expo; U.uVig.value = GR.vig; if (GR.sat) U.uSat.value = GR.sat; if (GR.lift) U.uLift.value.setRGB(...GR.lift); if (GR.gain) U.uGain.value.setRGB(...GR.gain); }
const SET = buildSet(S);
SET.sign.visible = false;   // r1: the CLAWD RACING sign sat behind the chapter title in most shots (two text blocks fighting)
if ((Q.get('light') || 'neutral') === 'neutral') {   // v2 dry run: less orange light + a neutral grade, so Claude orange reads as orange (not red)
  SET.sun.color.set('#fff1e0'); SET.hemi.color.set('#fff6ec'); SET.rim.color.set('#fff0e2');
  S.scene.traverse(o => { if (o.isPointLight) o.color.set('#ffdcb8'); });
  U.uGain.value.setRGB(1.0, 1.0, 1.0); U.uLift.value.setRGB(0.04, 0.04, 0.04);
}
const car = makeCar(); S.scene.add(car.g);
const BG = buildBg(S);   // v2: rival cars on the apron + working bay crews with sparks (src/bg.js)
const driver = clawd(S.scene, '');
window.__CREW_ROLE = Q.get('crew') || '';   // set AFTER the driver: the driver always stays Kai's Clawd   // r1 #14: the f1 helmet visor hid the eyes all reel → Kai's own Clawd (red jacket, >>> headband) drives
const WHEEL0 = car.wheels.map(w => w.position.clone());
const DRV_BLINK = BL(0, 60, 2.8, 5);

// ---------------------------------------------------------------- chapters (boundaries from the voice)
const T_END = Math.round((VO_END + 1.3) * 30) / 30;
const CH = [
  { id: 'c0_hook', shot: 'C0', title: "DON'T START VIBE CODING", t0: 0 },
  { id: 'c1_ponytail', shot: 'C1', title: '1 · PONYTAIL', t0: VO_WORDS.find(w => w.line === 'p1a').s - 0.14 },
  { id: 'c2_omniroute', shot: 'C2', title: '2 · OMNIROUTE', t0: VO_WORDS.find(w => w.line === 'p2a').s - 0.14 },
  { id: 'c3_graphify', shot: 'C3', title: '3 · GRAPHIFY', t0: VO_WORDS.find(w => w.line === 'p3a').s - 0.14 },
  { id: 'c4_skills', shot: 'C4', title: '4 · AGENT SKILLS', t0: VO_WORDS.find(w => w.line === 'p4a').s - 0.14 },
  { id: 'c5_cta', shot: 'C5', title: 'COMMENT CODING', t0: VO_WORDS.find(w => w.line === 'cta').s - 0.14 },
];
CH.forEach((c, i) => { c.t0 = Math.round(c.t0 * 30) / 30; });
CH.forEach((c, i) => { c.t1 = i + 1 < CH.length ? CH[i + 1].t0 : T_END; });
const ctx = { S, SET, car, driver, CH, T_END, Q, driverPose: null };
// fallback when a chapter file is missing or broken: a slow orbit of the car (so the router renders while builders work)
const stub = (c) => ({ group: new THREE.Group(), update() {}, final() {}, hero: () => null, cues: [],
  cam: (t) => { const u = seg(t, c.t0, c.t1), a = -0.5 + 0.6 * u; const tgt = V(0.2, 0.45, 0); return { pos: V(Math.sin(a) * 4.2, 1.5, Math.cos(a) * 4.2), tgt, fov: 32, focus: tgt, aperture: 0.4 }; } });
for (const c of CH) {
  ctx.ch = c;
  try { const m = await import(`./ch/${c.id}.js`); c.mod = await m.default(ctx); }
  catch (e) { if (!/Failed to fetch|Cannot find|404|error loading/i.test(e.message)) console.log('ERR chapter', c.id, e.message); else console.warn('LOG stub chapter', c.id); c.mod = stub(c); }
  if (c.mod.group && !c.mod.group.parent) S.scene.add(c.mod.group);
}
const chAt = (t) => { let i = 0; while (i < CH.length - 1 && t >= CH[i + 1].t0) i++; return i; };

// ---------------------------------------------------------------- per-frame reset: car home, wheels still, driver in the seat
function baseline(t) {
  car.g.position.set(0, 0, 0); car.g.rotation.set(0, 0, 0); car.body.position.set(0, 0, 0); car.body.rotation.set(0, 0, 0); car.body.scale.set(1, 1, 1);
  car.wheels.forEach((w, i) => { w.rotation.set(0, 0, 0); w.scale.set(1, 1, 1); w.position.copy(WHEEL0[i]); });
  for (const k of ['p1', 'p2', 'p3', 'p4']) car.slot[k].visible = false;
  car.g.updateMatrixWorld(true);
  ctx.driverPose = pose(driver, t, { pos: car.g.localToWorld(car.seat.clone()), yaw: Math.PI / 2, blinkTimes: DRV_BLINK, seed: 2 });
}

// ---------------------------------------------------------------- frame
const CUTS = [...CH.map(c => c.t0), T_END], SHOTS = CH.map(c => c.shot);
const S_ = { pos: V(), face: V(-100, -100, -100), sq: 1, body: 1, expr: 'neutral', talk: 0, yaw: 0, blink: 0, arm: 0, flame: 1, y: 0 };
const FAKE_HEAD = new THREE.Object3D(); FAKE_HEAD.position.set(0, -100, 0); S.scene.add(FAKE_HEAD);   // no Kai in this reel: audit.mjs reads K.bones.Head
const K = { bones: { Head: FAKE_HEAD }, holder: { scale: { x: 1 } } };
let lastHero = null;
// IG safe zone (gate r1 on reel63: hero eyes past x 900 px in C0/C1/C2/C5): slide the camera sideways (pos + tgt along camera-right)
// until the hero's outer eye edge sits at x ≤ 0.80 of the frame. A continuous function of the shot, so no jitter.
const _tc = new THREE.PerspectiveCamera(32, S.W / S.H, 0.02, 400), _r = new THREE.Vector3();
function needShift(s, h) {                                 // metres along camera-right that bring the hero's outer eye to x ≤ 0.79
  _tc.fov = s.fov ?? 32; _tc.updateProjectionMatrix(); _tc.position.copy(s.pos); _tc.up.set(0, 1, 0); _tc.lookAt(s.tgt); _tc.updateMatrixWorld();
  _r.setFromMatrixColumn(_tc.matrixWorld, 0);
  const e = h.face.clone().addScaledVector(_r, 0.14).project(_tc), x = (e.x + 1) / 2;
  if (e.z > 1 || x <= 0.79) return 0;
  const d = s.pos.distanceTo(h.face), wHalf = d * Math.tan((_tc.fov * Math.PI / 180) / 2) * _tc.aspect;
  return (x - 0.79) * 2 * wHalf;
}
// r1 #3/#12/#21/#38: a per-frame slide jumped the camera on every hero switch (5 hidden cuts). Now ONE constant offset per chapter:
// the largest slide any of its frames needs (scanned once, 3 passes so the slide itself is accounted for). Continuous inside a chapter.
const _off = {};
function chapterOffset(i) {
  if (_off[i] !== undefined) return _off[i];
  const c = CH[i]; let off = 0;
  for (let pass = 0; pass < 3; pass++) {
    let need = 0;
    for (let k = 0; k <= 40; k++) {
      const t = lerp(c.t0 + 0.02, c.t1 - 0.02, k / 40); baseline(t);
      for (let j = 0; j < i; j++) CH[j].mod.final(t);
      c.mod.update(t); car.g.updateMatrixWorld(true);
      const s = c.mod.cam(t), h = c.mod.hero(t) || { c: driver, ...ctx.driverPose };
      _tc.position.copy(s.pos); _tc.lookAt(s.tgt); _tc.updateMatrixWorld(); _r.setFromMatrixColumn(_tc.matrixWorld, 0);
      s.pos.addScaledVector(_r, off); s.tgt.addScaledVector(_r, off);
      need = Math.max(need, needShift(s, h));
    }
    if (need < 0.005) break; off += need;
  }
  return (_off[i] = off);
}
function reframe(s, i) {
  const off = chapterOffset(i); if (!off) return;
  _tc.position.copy(s.pos); _tc.up.set(0, 1, 0); _tc.lookAt(s.tgt); _tc.updateMatrixWorld(); _r.setFromMatrixColumn(_tc.matrixWorld, 0);
  s.pos.addScaledVector(_r, off); s.tgt.addScaledVector(_r, off);
}
function prep(t) {
  baseline(t); BG.update(t);
  const i = chAt(t), c = CH[i];
  for (let j = 0; j < CH.length; j++) { const m = CH[j].mod; if (m.group) m.group.visible = j === i; if (j < i) m.final(t); }
  chapterOffset(i); baseline(t);
  for (let j = 0; j < CH.length; j++) { const m = CH[j].mod; if (j < i) m.final(t); }
  c.mod.update(t);
  car.g.updateMatrixWorld(true);
  const s = c.mod.cam(t); reframe(s, i);
  const h = c.mod.hero(t) || { c: driver, ...ctx.driverPose };
  lastHero = h; S_.pos.copy(h.c.group.position); S_.face.copy(h.face); S_.sq = h.sq ?? 1; S_.blink = h.blink ?? 0; S_.yaw = h.c.group.rotation.y;
  U.uVig.value = VIG0 + 0.9 * NUMT.reduce((m, n) => Math.max(m, pulse(t, n - 0.02, 1, 0.55)), 0);   // v2: the frame edges dim for 0.5 s on each number word
  const focus = s.focus instanceof THREE.Vector3 ? s.pos.distanceTo(s.focus) : (s.focus ?? 3);
  return { pos: s.pos, tgt: s.tgt, fov: s.fov ?? 32, roll: s.roll || 0, focus, aperture: Number(Q.get('ap') || (s.aperture ?? 0.5)), shot: c.shot, i, k: { m: { shape: 'closed', open: 0 }, bl: 0 } };
}

// ---------------------------------------------------------------- 2D overlay: chapter title (taped paper), paper-scrap captions, wipe, end card
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
const SERIF = 'Georgia, "Times New Roman", serif', SANS = 'Inter, "Helvetica Neue", Arial, sans-serif';
function tape(g, x, y, w, h, rot) { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = 'rgba(232,196,110,0.85)'; g.fillRect(-w / 2, -h / 2, w, h); g.restore(); }
function title(g, t, Wd, H) {
  const i = chAt(t), c = CH[i], k = i === 0 ? 1 : pop(t, c.t0 + 0.04, 3.2, 7);   // r1 #2: the hook title is there from frame 0
  if (k <= 0.001) return;
  const fs = Math.round(H * 0.03), y = H * 0.135, rot = (hsh(i, 3) - 0.5) * 0.04;
  g.save(); g.font = `800 ${fs}px ${SANS}`; let tw = g.measureText(c.title).width, pw = tw + fs * 1.6, ph = fs * 1.9;
  const fit = Math.min(1, Wd * 0.7 / pw); if (fit < 1) { g.font = `800 ${Math.round(fs * fit)}px ${SANS}`; tw = g.measureText(c.title).width; pw = tw + fs * 1.6 * fit; }   // r2 #49: ≤ 0.78 of frame
  g.translate(Wd * 0.46, y); g.rotate(rot); g.scale(k, k);
  g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = fs * 0.5; g.shadowOffsetY = fs * 0.15;
  g.fillStyle = '#fbf6ea'; rr(g, -pw / 2, -ph / 2, pw, ph, fs * 0.12); g.fill(); g.shadowColor = 'transparent';
  g.fillStyle = '#2b2622'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(c.title, 0, fs * 0.05);
  tape(g, -pw / 2 + fs * 0.4, -ph / 2, fs * 1.6, fs * 0.55, -0.5); tape(g, pw / 2 - fs * 0.4, -ph / 2, fs * 1.6, fs * 0.55, 0.5);
  g.restore();
  window.__titleBox = [Wd * 0.46 - pw / 2, y - ph / 2, Wd * 0.46 + pw / 2, y + ph / 2];
}
// v2 number emphasis (Kai 2026-10-18 "tô điểm thêm phần mấy con số"): number words get a yellow, bigger, bouncier scrap + an edge-dim pulse
const NUMW = new Set(['fifty-four', 'twenty', 'three', 'hundred', 'fifty', 'one', 'half', 'billion', 'twenty-five']);
const isNum = (w) => NUMW.has(String(w.w).toLowerCase().replace(/[^a-z-]/g, '')) || (w.line === 'hook' && /^four/i.test(w.w));
const NUMT = [WE('hook', 'four') - 0.3, W('p1b', 'fifty-four'), W('p1b', 'twenty'), W('p2b', 'three'), W('p2c', 'billion'), W('p4b', 'Twenty-five')];
const VIG0 = U.uVig.value;
const CAP_Y = 0.715;                                            // caption centre (frame fraction): inside the band y 1320–1470
const capY = () => CAP_Y;
const CAP = VO_LINES.map((l, i) => { const nx = VO_LINES[i + 1]; return { txt: l.text, s: l.s - 0.04, e: nx ? Math.min(nx.s - 0.04, l.e + 0.6) : l.e + 0.6, id: l.id }; });
function captions(g, t, Wd, H) {
  if (Q.has('nocap')) return;
  const c = CAP.find(c => t >= c.s && t < c.e); if (!c) return;
  const ws = VO_WORDS.filter(w => w.line === c.id && w.s - 0.03 <= t);
  if (!ws.length) return;
  const shown = ws.slice(-3); let fs = Math.round(H * 0.03);
  g.save(); g.font = `700 ${fs}px ${SERIF}`; g.textBaseline = 'middle'; g.textAlign = 'center';
  let pad = fs * 0.35, gap = fs * 0.3, widths = shown.map(w => (g.measureText(w.w).width + pad * 2) * (isNum(w) ? 1.28 : 1)), total = widths.reduce((a, b) => a + b, 0) + gap * (shown.length - 1);
  if (total > Wd * 0.6) { const k = Wd * 0.6 / total; fs = Math.floor(fs * k); g.font = `700 ${fs}px ${SERIF}`; pad = fs * 0.35; gap = fs * 0.3;   // final #1: stay inside x 0.2–0.8 (IG button column)
    widths = shown.map(w => (g.measureText(w.w).width + pad * 2) * (isNum(w) ? 1.28 : 1)); total = widths.reduce((a, b) => a + b, 0) + gap * (shown.length - 1); }
  let x = Wd / 2 - total / 2; const y = H * CAP_Y;
  shown.forEach((w, j) => {
    const nb = isNum(w), k = (w.s < 0.1 ? 1 : pop(t, w.s - 0.03, nb ? 3.2 : 4.2, nb ? 6 : 9)) * (nb ? 1.15 : 1), rot = (hsh(VO_WORDS.indexOf(w), 7) - 0.5) * 0.09, cx = x + widths[j] / 2;
    g.save(); g.translate(cx, y + (hsh(VO_WORDS.indexOf(w), 2) - 0.5) * fs * 0.25); g.rotate(rot); g.scale(k, k);
    g.shadowColor = 'rgba(0,0,0,0.3)'; g.shadowBlur = fs * 0.3; g.shadowOffsetY = fs * 0.08;
    g.fillStyle = nb ? '#f2c230' : '#e9b98a'; rr(g, -widths[j] / 2, -fs * 0.68, widths[j], fs * 1.36, fs * 0.08); g.fill(); g.shadowColor = 'transparent';
    g.fillStyle = '#2b2622'; g.fillText(w.w, 0, fs * 0.04); g.restore();
    x += widths[j] + gap;
  });
  g.restore();
}
function wipe(g, t, Wd, H) {                                   // checkered band sweeping right → left across each cut (±0.12 s)
  for (const c of CH.slice(1)) {
    const u = (t - (c.t0 - 0.12)) / 0.24; if (u < 0 || u > 1) continue;
    const x = lerp(Wd * 1.3, -Wd * 1.3, ss(u)), bw = Wd * 1.1, sq = Wd / 9;
    g.save(); g.translate(x, H / 2); g.rotate(-0.18);
    for (let r = -14; r < 14; r++) for (let q = 0; q < Math.ceil(bw / sq); q++) { g.fillStyle = (r + q) % 2 ? '#111' : '#f5f1e8'; g.fillRect(-bw / 2 + q * sq, r * sq, sq + 1, sq + 1); }
    g.restore();
  }
}
const CARD_T = WE('cta', 'links') + 0.1;   // after the launch has read (the card would hide it)
function card(g, t, Wd, H) {
  if (t < CARD_T) return;
  const k = pop(t, CARD_T, 3.2, 7), fs = Math.round(H * 0.058), f2 = Math.round(H * 0.024);
  g.save(); g.translate(Wd * 0.46, H * 0.42); g.scale(k, k); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `800 ${fs}px Menlo, "SF Mono", monospace`; const tw = g.measureText('CODING').width;
  const pw = tw + fs * 1.4, ph = fs * 2.7;
  g.fillStyle = '#1b1d22'; rr(g, -pw / 2, -ph / 2, pw, ph, fs * 0.25); g.fill();
  g.font = `600 ${f2}px ${SANS}`; g.fillStyle = '#ffffff'; g.fillText('Comment', 0, -fs * 0.78);
  g.font = `800 ${fs}px Menlo, "SF Mono", monospace`; g.fillStyle = '#d97757'; rr(g, -tw / 2 - fs * 0.3, -fs * 0.25, tw + fs * 0.6, fs * 1.2, fs * 0.2); g.fill();
  g.fillStyle = '#ffffff'; g.fillText('CODING', 0, fs * 0.36);
  g.restore(); window.__cardBox = [Wd * 0.46 - pw / 2, H * 0.42 - ph / 2, Wd * 0.46 + pw / 2, H * 0.42 + ph / 2];
}
function overlay(t, s) {
  const g = S.g2, Wd = g.canvas.width, H = g.canvas.height;
  title(g, t, Wd, H); captions(g, t, Wd, H); card(g, t, Wd, H); wipe(g, t, Wd, H);
}

// ---------------------------------------------------------------- audit contract (review/audit.mjs, gate.py) + SFX cues
const topsAt = () => lastHero ? [lastHero.top.clone()] : [];
const CUES = () => [
  ...CH.flatMap(c => (c.mod.cues || []).map(q => ({ ...q, ch: c.id }))),
  ...CH.slice(1).map(c => ({ t: c.t0 - 0.12, kind: 'wipe', ch: 'router' })),
  ...CH.map(c => ({ t: c.t0 + 0.06, kind: 'title', ch: 'router' })),
  { t: 0.0, kind: 'hookhit', ch: 'router' },                                   // r2 #48: a low hit + whoosh on frame 0 (skit rule: hook sound)
  { t: CARD_T, kind: 'card', ch: 'router' }];
window.__cues = () => CUES().filter(c => c.t >= 0 && c.t < T_END).sort((a, b) => a.t - b.t).map(c => ({ ...c, t: +c.t.toFixed(3) }));
window.__dbg = { capY, topsAt, CAP, CAP_CLEAR: 0.43, prep, CUTS, SHOTS, B: Object.fromEntries(CH.map(c => [c.id, c.t0])), S_, K, CL: driver, T_END, CH, LN,
  shotIdx: chAt, camera: S.camera, car, driver, WORK: [], STATE_T: [], OFF: chapterOffset };
S.run({ prep, T_END, overlay });
