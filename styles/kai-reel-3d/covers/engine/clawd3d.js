// Clawd 3D — glossy vinyl toy (ref: Opuscar98 z284 / z300 / g071–g072).
// Built 1:1 from the 18×10 pixel grid in /core/clawd-grid.js: 1 grid cell = 1 world unit,
// body = cols 3–14 × rows 0–7, slot eyes at cols 5 / 12 rows 2–3, stub arms rows 4–5, 4 legs (cols 4, 6, 11, 13) 2 rows tall.
// Origin = between the feet on the ground, +z faces the camera. Everything is a pure function of time t (seekable).
//
//   import { createClawd } from './clawd3d.js';
//   const clawd = createClawd({ googly: true, fannypack: true, hands: true, sunglasses: false });
//   scene.add(clawd.group);
//   clawd.update(t, { action: 'wave' });      // 'idle' | 'wave' | 'walk' | 'hop' | 'dance' | 'jazz' | 'demo'
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Brand pixels are #D97757; under studio light + clearcoat that base reads pale salmon, so the toy's albedo is
// pushed darker/more saturated (TOY) to land on the brand orange on screen, like the z284 vinyl.
export const COLORS = { body: '#D97757', bodyDark: '#B85F40', eye: '#2A2622', toy: '#D8622F' };

const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = x => x * x * (3 - 2 * x);
const eo = x => 1 - Math.pow(1 - x, 3);
const lerp = (a, b, k) => a + (b - a) * k;

// Deterministic blink: returns eyelid closure 0..1 at time t (blink every ~2.6–3.4 s, 0.16 s long).
export function blinkAt(t, seed = 0.37) {
  const period = 3.0, ph = ((t + seed * period) % period + period) % period;
  const b = ph < 0.16 ? Math.sin(Math.PI * ph / 0.16) : 0;
  // an occasional double blink
  const ph2 = ph - 0.24, b2 = (Math.floor((t + seed * period) / period) % 3 === 1 && ph2 > 0 && ph2 < 0.14) ? Math.sin(Math.PI * ph2 / 0.14) : 0;
  return Math.max(b, b2);
}

function vinyl(color, o = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color), roughness: o.roughness ?? 0.3, metalness: 0,
    clearcoat: o.clearcoat ?? 1, clearcoatRoughness: o.clearcoatRoughness ?? 0.08,
    envMapIntensity: o.env ?? 1, sheen: o.sheen ?? 0.25, sheenColor: new THREE.Color('#ffd2bd'), sheenRoughness: 0.5,
  });
}
function rbox(w, h, d, r, mat, seg = 5) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)), mat);
  m.castShadow = true; m.receiveShadow = true; return m;
}

// ---- hand-made looks (reel62 lab, Kai ref: painted toy boxes with hats) ---------------------------------
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
function rng(seed) { let x = seed >>> 0 || 1; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); }
function handTex(kind, seed = 7) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'), R = rng(seed);
  if (kind === 'painted') {
    g.fillStyle = '#D9773F'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 900; i++) { const h = 16 + R() * 10, l = 48 + R() * 14; g.fillStyle = `hsla(${h},68%,${l}%,${0.08 + R() * 0.12})`;
      g.save(); g.translate(R() * 512, R() * 512); g.rotate((R() - 0.5) * 0.6); g.fillRect(-20, -3, 30 + R() * 50, 4 + R() * 6); g.restore(); }
    for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(70,30,15,${0.05 + R() * 0.12})`; const x = R() < 0.5 ? R() * 60 : 512 - R() * 60; g.beginPath(); g.arc(R() < 0.5 ? x : R() * 512, R() < 0.5 ? R() * 512 : x, 2 + R() * 7, 0, 7); g.fill(); }
    if (seed === 99) { g.strokeStyle = '#E9C25A'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); let x = 512, y = 40; g.moveTo(x, y);
      for (const [dx, dy] of [[-40, 18], [-22, 30], [-38, 12], [-18, 34], [-30, 20]]) { x += dx; y += dy; g.lineTo(x, y); } g.stroke(); }
    for (const [x, y] of [[120, 330], [390, 330]]) { const rg = g.createRadialGradient(x, y, 2, x, y, 60); rg.addColorStop(0, 'rgba(225,95,110,.45)'); rg.addColorStop(1, 'rgba(225,95,110,0)'); g.fillStyle = rg; g.fillRect(x - 60, y - 60, 120, 120); }
  } else if (kind === 'flat' || kind === 'flatgrad') {   // simple: one orange, lighting does the shading (flatgrad: a soft top → bottom only)
    if (kind === 'flat') { g.fillStyle = '#DF7440'; g.fillRect(0, 0, 512, 512); }
    else { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#E57C46'); gr.addColorStop(1, '#CF6635'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  } else if (kind === 'tripo') {   // match Blocky Kai (Tripo PBR): soft painted albedo, big gentle blotches, baked light top → shade bottom
    const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#E8834A'); gr.addColorStop(0.55, '#D96A36'); gr.addColorStop(1, '#B7512A');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 60; i++) { const x = R() * 512, y = R() * 512, r = 30 + R() * 70, lt = R() < 0.5, rg = g.createRadialGradient(x, y, 2, x, y, r);
      rg.addColorStop(0, lt ? 'rgba(245,160,110,.10)' : 'rgba(150,60,30,.07)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
    const ed = (a, b, c, d) => { const e = g.createLinearGradient(a, b, c, d); e.addColorStop(0, 'rgba(110,40,20,.28)'); e.addColorStop(0.08, 'rgba(110,40,20,0)'); return e; };
    for (const [a, b, c, d] of [[0, 0, 512, 0], [512, 0, 0, 0], [0, 512, 0, 0], [0, 0, 0, 512]]) { g.fillStyle = ed(a, b, c, d); g.fillRect(0, 0, 512, 512); }
    for (const [x, y] of [[120, 340], [392, 340]]) { const rg = g.createRadialGradient(x, y, 2, x, y, 55); rg.addColorStop(0, 'rgba(230,105,110,.28)'); rg.addColorStop(1, 'rgba(230,105,110,0)'); g.fillStyle = rg; g.fillRect(x - 55, y - 55, 110, 110); }
  } else if (kind === 'cardorange') {   // kaiships: a shipped box, dyed Clawd orange, no labels
    g.fillStyle = '#D9773F'; g.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 7) { g.fillStyle = `rgba(110,45,15,${0.06 + 0.04 * Math.sin(x)})`; g.fillRect(x, 0, 3, 512); }
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(90,40,15,${R() * 0.09})`; g.fillRect(R() * 512, R() * 512, 1 + R() * 3, 1 + R() * 3); }
  } else if (kind === 'cardboard') {
    g.fillStyle = '#C99B62'; g.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 7) { g.fillStyle = `rgba(120,80,40,${0.05 + 0.04 * Math.sin(x)})`; g.fillRect(x, 0, 3, 512); }
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(90,60,30,${R() * 0.08})`; g.fillRect(R() * 512, R() * 512, 1 + R() * 3, 1 + R() * 3); }
    g.fillStyle = 'rgba(235,225,200,.55)'; g.fillRect(0, 200, 512, 70);                    // packing tape
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 204); g.lineTo(512, 206); g.stroke();
    g.save(); g.translate(330, 420); g.rotate(-0.08); g.strokeStyle = 'rgba(190,40,30,.75)'; g.lineWidth = 6; g.strokeRect(-95, -32, 190, 60);
    g.fillStyle = 'rgba(190,40,30,.75)'; g.font = 'bold 40px Arial'; g.textAlign = 'center'; g.fillText('FRAGILE', 0, 14); g.restore();
    g.fillStyle = 'rgba(40,30,20,.7)'; g.font = 'bold 30px Arial'; g.fillText('↑ THIS SIDE UP', 24, 470);
  } else if (kind === 'clay') {
    g.fillStyle = '#D8703A'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 14; i++) { const x = R() * 512, y = R() * 512; g.strokeStyle = `rgba(120,45,15,${0.06 + R() * 0.06})`; g.lineWidth = 1.5;
      for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(x, y, 6 + k * 4, 4 + k * 3, R(), 0.3, 2.8); g.stroke(); } }
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '255,220,190' : '90,30,10'},${R() * 0.05})`; g.fillRect(R() * 512, R() * 512, 2, 2); }
  }
  else if (kind === 'crochet') {
    g.fillStyle = '#D46A35'; g.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 16) for (let x = 0; x < 512; x += 16) { g.strokeStyle = `rgba(${R() < .5 ? '255,190,150' : '120,40,10'},.45)`; g.lineWidth = 3;
      g.beginPath(); g.moveTo(x + 2, y + 3); g.lineTo(x + 8, y + 13); g.lineTo(x + 14, y + 3); g.stroke(); }
  } else if (kind === 'wood') {
    g.fillStyle = '#C98A52'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 60; i++) { const y0 = R() * 512; g.strokeStyle = `rgba(110,60,25,${0.12 + R() * 0.2})`; g.lineWidth = 1 + R() * 3; g.beginPath();
      for (let x = 0; x <= 512; x += 16) g.lineTo(x, y0 + 10 * Math.sin(x / 60 + i) + 4 * Math.sin(x / 13 + i * 2)); g.stroke(); }
    g.fillStyle = 'rgba(217,119,63,.55)'; g.fillRect(0, 0, 512, 512);   // orange stain over the grain
  } else if (kind === 'paper') {
    g.fillStyle = '#E9824C'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9; i++) { const a = R() * 512, b = R() * 512; g.strokeStyle = 'rgba(255,240,220,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(a, 0); g.lineTo(b, 512); g.stroke();
      g.strokeStyle = 'rgba(120,50,20,.25)'; g.beginPath(); g.moveTo(a + 3, 0); g.lineTo(b + 3, 512); g.stroke(); }
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(255,255,255,${R() * 0.06})`; g.fillRect(R() * 512, R() * 512, 1, 1); }
  } else if (kind === 'sticky') {
    g.fillStyle = '#F29A5C'; g.fillRect(0, 0, 512, 512);
    const notes = ['fix later', 'TODO', 'v2 final', 'ship it', 'why??', '3am'];
    for (let i = 0; i < 9; i++) { g.save(); g.translate((i % 3) * 170 + 85, Math.floor(i / 3) * 170 + 85); g.rotate((R() - 0.5) * 0.3);
      g.fillStyle = ['#FFB27A', '#F7C86A', '#FF9A6B'][i % 3]; g.fillRect(-80, -80, 160, 160); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(-80, 70, 160, 10);
      g.fillStyle = 'rgba(40,30,80,.75)'; g.font = 'italic 26px Georgia'; g.textAlign = 'center'; g.fillText(notes[i % notes.length], 0, 8); g.restore(); }
  } else if (kind === 'terminal') {
    g.fillStyle = '#121614'; g.fillRect(0, 0, 512, 512); g.font = '18px Menlo, monospace';
    const L = ['$ claude', '> fix it', '✓ 3 files', '> ship', 'compact…', '$ git push', '> again', '✓ tests'];
    for (let y = 22, i = 0; y < 512; y += 24, i++) { g.fillStyle = `rgba(110,240,140,${0.25 + R() * 0.35})`; g.fillText(L[i % L.length], 10 + (i % 3) * 8, y); }
    g.fillStyle = 'rgba(217,119,63,.85)'; g.fillRect(0, 0, 512, 10); g.fillRect(0, 502, 512, 10); g.fillRect(0, 0, 10, 512); g.fillRect(502, 0, 10, 512);
  } else if (kind === 'loved') {
    g.fillStyle = '#C9764A'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(${R() < .5 ? '255,210,170' : '80,35,15'},${R() * 0.08})`; g.fillRect(R() * 512, R() * 512, 3, 3); }
    const patch = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); g.strokeStyle = '#3b2a20'; g.setLineDash([8, 6]); g.lineWidth = 3; g.strokeRect(x + 5, y + 5, w - 10, h - 10); g.setLineDash([]); };
    patch(300, 330, 120, 90, '#6E8FB8'); patch(60, 60, 80, 70, '#E3C46B');
    g.save(); g.translate(150, 400); g.rotate(0.5); g.fillStyle = '#F1D7B5'; g.fillRect(-70, -18, 140, 36); g.fillStyle = 'rgba(150,110,80,.4)';
    for (let k = -50; k <= 50; k += 14) { g.beginPath(); g.arc(k, 0, 2.5, 0, 7); g.fill(); } g.restore();
  } else if (kind === 'kintsugi') {
    g.fillStyle = '#D9773F'; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = '#E8C25A'; g.lineCap = 'round';
    for (let i = 0; i < 4; i++) { let x = R() * 512, y = 0; g.lineWidth = 4 + R() * 3; g.beginPath(); g.moveTo(x, y);
      while (y < 512) { x += (R() - 0.5) * 70; y += 20 + R() * 40; g.lineTo(x, y); } g.stroke(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function lumpy(geo, amp, seed = 3) {   // clay: low-frequency dents so edges look hand-pressed
  const p = geo.attributes.position, R = rng(seed), f = [R() * 6, R() * 6, R() * 6];
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(x * 0.9 + f[0]) * Math.sin(y * 1.1 + f[1]) * Math.sin(z * 0.8 + f[2]); const k = 1 + amp * n / Math.max(1, Math.hypot(x, y, z));
    p.setXYZ(i, x * k, y * k, z * k); }
  geo.computeVertexNormals(); return geo;
}

// ---- Kai's hand: Clawd as Kai draws him (brand kit: paper grain, ink line, watercolor) -------------------------
const PAL = { paper: '#F3EBDC', ink: '#2B2233', clay: '#D97757', clayDk: '#A84D33', clayLt: '#F2A283' };
function inkTex(kind, seed = 5) {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'), R = rng(seed);
  g.fillStyle = PAL.clay; g.fillRect(0, 0, 512, 512);
  if (kind === 'ink') {   // watercolor wash: blotches + pigment pooling at the edges of every face
    for (let i = 0; i < 40; i++) { const x = R() * 512, y = R() * 512, r = 40 + R() * 110, rg = g.createRadialGradient(x, y, 4, x, y, r), lt = R() < 0.55;
      rg.addColorStop(0, lt ? 'rgba(242,162,131,.22)' : 'rgba(168,77,51,.10)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
    const e = g.createLinearGradient(0, 0, 512, 0); e.addColorStop(0, 'rgba(168,77,51,.3)'); e.addColorStop(.04, 'rgba(168,77,51,0)'); e.addColorStop(.96, 'rgba(168,77,51,0)'); e.addColorStop(1, 'rgba(168,77,51,.3)');
    g.fillStyle = e; g.fillRect(0, 0, 512, 512); const f = g.createLinearGradient(0, 0, 0, 512); f.addColorStop(0, 'rgba(168,77,51,.3)'); f.addColorStop(.04, 'rgba(168,77,51,0)'); f.addColorStop(.96, 'rgba(168,77,51,0)'); f.addColorStop(1, 'rgba(168,77,51,.3)'); g.fillStyle = f; g.fillRect(0, 0, 512, 512);
  }
  if (kind === 'sketch') {  // marker: flat fill, loose diagonal hatching, a missed-paint gap
    g.strokeStyle = 'rgba(168,77,51,.45)'; g.lineWidth = 5; g.lineCap = 'round';
    for (let i = -512; i < 512; i += 26) { g.beginPath(); g.moveTo(i + R() * 8, 512); g.lineTo(i + 512 + R() * 8, 0); g.stroke(); }
    g.fillStyle = 'rgba(243,235,220,.85)'; g.beginPath(); g.ellipse(400, 110, 46, 16, -0.6, 0, 7); g.fill();
  }
  if (kind === 'paper') {   // cut paper: flat clay with fibres
    for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(255,240,220,${R() * 0.18})`; g.lineWidth = 1; g.beginPath(); const x = R() * 512, y = R() * 512; g.moveTo(x, y); g.lineTo(x + (R() - .5) * 30, y + (R() - .5) * 30); g.stroke(); }
  }
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${R() < .5 ? '255,250,240' : '60,30,20'},${R() * 0.07})`; g.fillRect(R() * 512, R() * 512, 1.5, 1.5); }   // paper grain
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function toonRamp(n) { const d = new Uint8Array(n * 4); for (let i = 0; i < n; i++) { const v = Math.round(255 * (0.72 + 0.28 * i / (n - 1))); d.set([v, v, v, 255], i * 4); }
  const t = new THREE.DataTexture(d, n, 1); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; }
function hullMat(w, wob) {   // inverted-hull ink outline, thickness wobbles like a brush pen
  const m = new THREE.MeshBasicMaterial({ color: PAL.ink, side: THREE.BackSide });
  m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>',
    `vec3 transformed = position + normal * ${w.toFixed(3)} * (1.0 + ${wob.toFixed(3)} * sin(position.x * 2.3 + position.y * 1.7) * sin(position.z * 1.9 - position.y * 2.9));`); };
  return m;
}

// ---- Kai's partner (Kai: "Kai = bùng cháy, khát vọng, hi vọng, mạnh mẽ"; same low-poly matte DNA as Blocky Kai) ----
function headbandTex() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#C9302A'; g.fillRect(0, 0, 1024, 128); g.fillStyle = '#F4EEE6';
  for (const x of [380, 470, 560]) { g.beginPath(); g.moveTo(x, 18); g.lineTo(x + 46, 64); g.lineTo(x, 110); g.lineTo(x + 26, 110); g.lineTo(x + 72, 64); g.lineTo(x + 26, 18); g.closePath(); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createClawd(opts = {}) {
  const o = { depth: 9, googly: false, googlyPos: [1.2, 7.6], fannypack: false, hands: false, sunglasses: false,
    color: COLORS.toy, eyeColor: COLORS.eye, roughness: 0.3, cute: 0, style: '', ...opts };
  // cute (reel62, Kai "cute hơn 1 tí"): 1 = rounder body + pill eyes · 2 = + eye catchlights · 3 = + blush. Slot eyes stay the canon.
  const ST = o.style;   // stylized variants (reel62 lab): 'voxel' | 'plush' | 'kawaii' — same silhouette, new surface/details
  const CU = ST === 'kawaii' ? Math.max(o.cute, 2) : ST === 'plush' ? Math.max(o.cute, 2) : o.cute;
  if (ST === 'plush') o.roughness = 0.95;
  const M = {
    body: vinyl(o.color, { roughness: o.roughness }),
    limb: vinyl(o.color, { roughness: o.roughness + 0.04 }),
    eye: new THREE.MeshPhysicalMaterial({ color: o.eyeColor, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 }),
    black: new THREE.MeshPhysicalMaterial({ color: '#1b1a1d', roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    white: new THREE.MeshPhysicalMaterial({ color: '#f7f4ef', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.02, transmission: 1, thickness: 0.4, ior: 1.45, transparent: true, opacity: 0.25, clearcoat: 1 }),
    metal: new THREE.MeshStandardMaterial({ color: '#d9d6cf', roughness: 0.25, metalness: 1 }),
    gold: new THREE.MeshStandardMaterial({ color: '#d4a63a', roughness: 0.25, metalness: 1 }),
    lens: new THREE.MeshPhysicalMaterial({ color: '#15363a', roughness: 0.05, clearcoat: 1, metalness: 0.2 }),
  };
  const FIRE = ['partner', 'flame', 'warrior'].includes(ST) ? ST : '';
  if (FIRE) {
    const vc = FIRE !== 'partner';
    for (const k of ['body', 'limb']) M[k] = new THREE.MeshStandardMaterial({ color: vc && k === 'body' ? '#ffffff' : '#DD6A35', roughness: 0.82, metalness: 0, flatShading: true, vertexColors: vc && k === 'body' });
    M.eye = new THREE.MeshStandardMaterial({ color: vc ? '#FFD36B' : '#2A2622', roughness: 0.6, emissive: new THREE.Color(vc ? '#FFB02E' : '#000'), emissiveIntensity: vc ? 2.2 : 0 });
  }
  const HAND = ['ink', 'sketch', 'paper'].includes(ST) ? ST : '';
  if (HAND) { const tex = inkTex(HAND), ramp = toonRamp(HAND === 'sketch' ? 3 : 2);
    for (const k of ['body', 'limb']) M[k] = new THREE.MeshToonMaterial({ map: tex, color: k === 'limb' && HAND === 'ink' ? '#E2A890' : '#ffffff', gradientMap: ramp });
    M.eye = new THREE.MeshBasicMaterial({ color: PAL.ink }); }
  const LOOK = ['flat', 'flatgrad', 'tripo', 'painted', 'cardorange', 'cardboard', 'clay', 'crochet', 'wood', 'paper', 'sticky', 'terminal', 'loved', 'kintsugi', 'brick', 'neon'].includes(ST) ? ST : '';
  if (LOOK) {
    const tex = ['brick', 'neon'].includes(LOOK) ? null : handTex(LOOK, o.mark === 'crack' ? 99 : 7);
    const ROUGH = { clay: 0.62, wood: 0.55, kintsugi: 0.18, terminal: 0.4, tripo: 0.78, flat: 0.78, flatgrad: 0.78 }[LOOK] ?? 0.9;
    for (const k of ['body', 'limb']) M[k] = new THREE.MeshPhysicalMaterial({ map: tex, color: tex ? '#ffffff' : LOOK === 'neon' ? '#1a1a22' : '#E0662C', roughness: LOOK === 'brick' ? 0.25 : ROUGH, metalness: 0,
      clearcoat: ['kintsugi', 'brick'].includes(LOOK) ? 1 : 0, clearcoatRoughness: 0.08, flatShading: LOOK === 'paper',
      emissiveMap: LOOK === 'terminal' ? tex : null, emissive: new THREE.Color(LOOK === 'terminal' ? '#ffffff' : '#000000'), emissiveIntensity: LOOK === 'terminal' ? 0.6 : 0 });
    M.eye = new THREE.MeshStandardMaterial({ color: { cardboard: '#120d08', terminal: '#6ef08c', neon: '#ffb070', tripo: '#24170F', flat: '#24170F', flatgrad: '#24170F' }[LOOK] ?? '#1d1612', roughness: ['tripo', 'flat', 'flatgrad'].includes(LOOK) ? 0.55 : 0.9,
      emissive: new THREE.Color(['terminal', 'neon'].includes(LOOK) ? ({ terminal: '#6ef08c', neon: '#ffb070' })[LOOK] : '#000'), emissiveIntensity: ['terminal', 'neon'].includes(LOOK) ? 1.6 : 0 }); }
  if (ST === 'plush') for (const k of ['body', 'limb']) { const m = M[k]; m.clearcoat = 0; m.roughness = 0.95; m.sheen = 1; m.sheenRoughness = 0.8; m.sheenColor = new THREE.Color('#ffc9a8'); }
  if (ST === 'plush') { M.eye.roughness = 0.85; M.eye.clearcoat = 0; }
  if (ST === 'kawaii') M.body.color = new THREE.Color('#E06A35');
  const D = o.depth, BW = 12, BH = 8, LEG = 2;
  const group = new THREE.Group(); group.name = 'clawd';
  const bounce = new THREE.Group(); group.add(bounce);           // squash/stretch pivot at the feet
  const torso = new THREE.Group(); torso.position.y = LEG; bounce.add(torso);   // y=0 = bottom of the body

  const body = rbox(BW, BH, D, HAND === 'ink' ? 0.15 : ST === 'plush' ? 2.7 : { tripo: 0.75, flat: 0.75, flatgrad: 0.75, clay: 1.6, crochet: 2.2, wood: 0.9, kintsugi: 1.4, brick: 0.3, loved: 1.2, paper: 0.05 }[LOOK] ?? (LOOK ? 0.22 : CU >= 1 ? 1.9 : 1.05), M.body, LOOK === 'paper' ? 1 : 7);
  if (ST === 'kai') {   // Kai's Clawd: built brick by brick (Lego/Minecraft kid → a ship to $1M). Missing bricks = the road left.
    body.visible = false; const H = 2, plastic = c => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.15 });
    const shades = ['#D9773F', '#CF6A33', '#E2834C', '#D46F38'], KAI = '#3D6FB6';
    const missing = new Set(o.missing ?? ['3-2', '3-3', '2-2']);   // course-index ids, removed in this order as Kai grows: '3-3' is the last brick ($1M)
    let n = 0;
    for (let row = 0; row < BH / H; row++) {
      const cuts = row % 2 ? [-6, -4, 0, 4, 6] : [-6, -2, 2, 6];
      for (let i = 0; i < cuts.length - 1; i++) {
        const id = `${row}-${i}`; n++; if (missing.has(id)) continue;
        const L = cuts[i + 1] - cuts[i], col = id === (o.kaiBrick ?? '0-0') ? KAI : shades[(row * 3 + i * 5) % shades.length];
        const b = rbox(L - 0.08, H - 0.08, D, 0.14, plastic(col), 3); b.position.set((cuts[i] + cuts[i + 1]) / 2, row * H + H / 2, 0); torso.add(b);
        const top = row === BH / H - 1 || missing.has(`${row + 1}-${i}`);
        if (top) for (let sx = cuts[i] + 1; sx < cuts[i + 1]; sx += 2) for (const sz of [-2.25, 2.25]) {
          const st = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.45, 24), plastic(col)); st.position.set(sx, row * H + H + 0.2, sz); st.castShadow = true; torso.add(st); }
      }
    }
    M.limb.color = new THREE.Color('#D9773F'); M.limb.clearcoat = 0.7; M.limb.roughness = 0.32;
  }
  if (FIRE) {   // hand-carved low-poly body (like Kai's hair facets); flame gradient rising from the feet for flame/warrior
    body.geometry.dispose(); const gq = new THREE.BoxGeometry(BW, BH, D, 7, 5, 6); lumpy(gq, 0.7, 17);
    const ng = gq.toNonIndexed(); ng.computeVertexNormals();
    if (FIRE !== 'partner') { const P = ng.attributes.position, cols = [], cA = new THREE.Color('#B8301C'), cB = new THREE.Color('#E8652A'), cC = new THREE.Color('#F39A3A'), cc = new THREE.Color();
      for (let i = 0; i < P.count; i++) { const k = (P.getY(i) + BH / 2) / BH; k < 0.55 ? cc.lerpColors(cA, cB, k / 0.55) : cc.lerpColors(cB, cC, (k - 0.55) / 0.45); cols.push(cc.r, cc.g, cc.b); }
      ng.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); }
    body.geometry = ng;
    torso.traverse(m => { if (m.isMesh) m.castShadow = true; });
  }
  if (o.jacket) {   // Kai's red jacket: open front (Clawd's orange shows like Kai's white tee), lapels, chest pocket flaps
    const jr = new THREE.MeshStandardMaterial({ color: '#C2382D', roughness: 0.85 }), jd = new THREE.MeshStandardMaterial({ color: '#9F2A22', roughness: 0.85 });
    const t = 0.38, top = 3.7, bot = -0.25, h = top - bot, cy = (top + bot) / 2, gap = 1.5;
    const pan = (w, d, x, z, m = jr) => { const b = rbox(w, h, d, 0.3, m, 3); b.position.set(x, cy, z); torso.add(b); return b; };
    pan(BW + 2 * t, t, 0, -D / 2 - t / 2);                                  // back
    const bc = rbox(BW + 2 * t, 0.55, t * 1.6, 0.2, jd, 2); bc.position.set(0, top + 0.1, -D / 2 - t / 2); torso.add(bc);   // collar
    for (const sx of [-1, 1]) {
      pan(t, D + 2 * t, sx * (BW / 2 + t / 2), 0);                           // sides
      if (sx === 1) { pan(BW + 2 * t, t, 0, D / 2 + t / 2);                 // closed front (Kai: zipped up)
        const zp = rbox(0.22, h - 0.3, 0.1, 0.06, jd, 2); zp.position.set(0, cy, D / 2 + t + 0.03); torso.add(zp);
        const tab = rbox(0.45, 0.7, 0.14, 0.08, new THREE.MeshStandardMaterial({ color: '#D9D4CC', roughness: 0.4, metalness: 0.5 }), 2); tab.position.set(0, top - 0.55, D / 2 + t + 0.1); torso.add(tab); }
      // no lapels (Kai 2026-10-17: they read as Clawd's whiskers)
      const col = rbox(t * 1.6, 0.55, D + 2 * t, 0.2, jd, 2); col.position.set(sx * (BW / 2 + t / 2), top + 0.1, 0); torso.add(col);
      const pk = rbox(1.9, 0.5, 0.16, 0.12, jd, 2); pk.position.set(sx * 3.2, top - 1.3, D / 2 + t + 0.06); torso.add(pk);
    }
  }
  if (FIRE || o.headband) {
    // the headband: the same red band with white chevrons Kai wears
    const hb = new THREE.MeshStandardMaterial({ map: headbandTex(), roughness: 0.8, flatShading: !['tripo', 'flat', 'flatgrad'].includes(ST) }), plain = new THREE.MeshStandardMaterial({ color: '#C9302A', roughness: 0.8, flatShading: !['tripo', 'flat', 'flatgrad'].includes(ST) });
    const by = BH - 1.25, bh = ['tripo', 'flat', 'flatgrad'].includes(ST) ? 1.2 : 1.05, th = ['tripo', 'flat', 'flatgrad'].includes(ST) ? 0.42 : 0.3;
    const front = new THREE.Mesh(new THREE.BoxGeometry(BW + 2 * th, bh, th, 1, 1, 1), [plain, plain, plain, plain, hb, plain]); front.position.set(0, by, D / 2 + th / 2); torso.add(front);
    const back = new THREE.Mesh(new THREE.BoxGeometry(BW + 2 * th, bh, th), plain); back.position.set(0, by, -D / 2 - th / 2); torso.add(back);
    for (const sx of [-1, 1]) { const sd = new THREE.Mesh(new THREE.BoxGeometry(th, bh, D), plain); sd.position.set(sx * (BW / 2 + th / 2), by, 0); torso.add(sd); }
    const L = FIRE === 'warrior' ? 4.2 : 2.8;
    const knot = rbox(1.0, 1.3, 0.8, 0.3, plain, 2); knot.position.set(-BW / 2 - 0.3, by, -D / 2 + 1.0); torso.add(knot);
    for (const [k, a] of [[0, -0.45], [1, -0.9]]) {   // two thick tails, each bent in two segments so they read as cloth
      const g1 = new THREE.Group(); g1.position.set(-BW / 2 - 0.35, by - 0.1, -D / 2 + 1.0 + k * 0.45); g1.rotation.set(0, Math.PI * 0.75, a); torso.add(g1);
      const t1 = rbox(L * 0.55, 1.0, 0.36, 0.16, plain, 2); t1.position.x = L * 0.275; g1.add(t1);
      const g2 = new THREE.Group(); g2.position.x = L * 0.52; g2.rotation.z = -0.45; g1.add(g2);
      const t2 = rbox(L * 0.5, 0.9, 0.34, 0.16, plain, 2); t2.position.x = L * 0.25; g2.add(t2); }
  }
  if (o.mark === 'chip' || o.mark === 'dent') {   // the signature mark on the top-right-front corner
    body.geometry.dispose(); body.geometry = new THREE.BoxGeometry(BW, BH, D, 36, 24, 27);   // subdivided, so the cut stays clean
    const pa = body.geometry.attributes.position, c = new THREE.Vector3(BW / 2, BH / 2, D / 2), n = new THREE.Vector3(1, 1, 1).normalize(), v = new THREE.Vector3();
    const t = o.mark === 'chip' ? 1.5 : 0;
    for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i);
      if (o.mark === 'chip') { const d = v.clone().sub(c).dot(n) + t; if (d > 0) v.addScaledVector(n, -d); }
      else { const q = new THREE.Vector3(BW / 2 - 2.4, BH / 2, D / 2), r = v.distanceTo(q), gg = Math.exp(-(r * r) / 3.0); v.y -= 1.0 * gg; v.z -= 0.8 * gg; }
      pa.setXYZ(i, v.x, v.y, v.z); }
    body.geometry.computeVertexNormals();
    if (o.mark === 'chip') { const k = t * Math.sqrt(3), tri = new THREE.BufferGeometry().setFromPoints([V3(c.x - k, c.y, c.z), V3(c.x, c.y - k, c.z), V3(c.x, c.y, c.z - k)].map(p => p.addScaledVector(n, 0.04)));
      tri.computeVertexNormals(); const core = new THREE.Mesh(tri, new THREE.MeshStandardMaterial({ color: '#F3DCC0', roughness: 0.95, side: THREE.DoubleSide })); core.position.y = BH / 2; torso.add(core); }
  }
  if (LOOK === 'clay') lumpy(body.geometry, 0.9);
  if (['tripo', 'flat', 'flatgrad'].includes(LOOK)) lumpy(body.geometry, 0.07, 29);
  if (LOOK === 'crochet') lumpy(body.geometry, 0.35, 11);
  if (LOOK === 'brick') for (let ix = -2.5; ix <= 2.5; ix += 2) for (let iz = -3; iz <= 3; iz += 3) {   // toy-brick studs
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.7, 24), M.body); st.position.set(ix * 2.0, BH + 0.35, iz * 1.0); st.castShadow = true; torso.add(st); }
  if (LOOK === 'neon') {   // neon tube outline on the front face
    const tm = new THREE.MeshStandardMaterial({ color: '#ff8a4c', emissive: new THREE.Color('#ff7a3c'), emissiveIntensity: 2.4 });
    const path = new THREE.CurvePath(), r = 0.9, w = BW / 2 - 0.5, h0 = 0.5, h1 = BH - 0.5, z = D / 2 + 0.25, P3 = (x, y) => new THREE.Vector3(x, y, z);
    path.add(new THREE.LineCurve3(P3(-w + r, h0), P3(w - r, h0))); path.add(new THREE.QuadraticBezierCurve3(P3(w - r, h0), P3(w, h0), P3(w, h0 + r)));
    path.add(new THREE.LineCurve3(P3(w, h0 + r), P3(w, h1 - r))); path.add(new THREE.QuadraticBezierCurve3(P3(w, h1 - r), P3(w, h1), P3(w - r, h1)));
    path.add(new THREE.LineCurve3(P3(w - r, h1), P3(-w + r, h1))); path.add(new THREE.QuadraticBezierCurve3(P3(-w + r, h1), P3(-w, h1), P3(-w, h1 - r)));
    path.add(new THREE.LineCurve3(P3(-w, h1 - r), P3(-w, h0 + r))); path.add(new THREE.QuadraticBezierCurve3(P3(-w, h0 + r), P3(-w, h0), P3(-w + r, h0)));
    torso.add(new THREE.Mesh(new THREE.TubeGeometry(path, 160, 0.22, 10, true), tm)); }
  if (LOOK === 'wood') for (const sx of [-1, 1]) { const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 20), new THREE.MeshStandardMaterial({ color: '#8a5a32', roughness: 0.6 }));
    peg.rotation.z = Math.PI / 2; peg.position.set(sx * 6.05, 3.0, 0.4); torso.add(peg); } body.position.y = BH / 2; torso.add(body);
  if (ST === 'voxel') {   // the 18×10 pixel origin made visible: the body is 12×8 soft voxels
    body.visible = false; const VS = 2, vg = new RoundedBoxGeometry(VS * 0.97, VS * 0.97, D, 4, 0.45);
    for (let ix = 0; ix < BW / VS; ix++) for (let iy = 0; iy < BH / VS; iy++) {
      const v = new THREE.Mesh(vg, M.body); v.position.set((ix + 0.5) * VS - BW / 2, (iy + 0.5) * VS, 0); v.castShadow = true; torso.add(v);
    }
  }
  if (ST === 'plush') {   // stitched seam around the face
    const sm = new THREE.MeshStandardMaterial({ color: '#7a3518', roughness: 1 }), ix = BW / 2 - 0.9, iy0 = 0.9, iy1 = BH - 0.9, z = D / 2 + 0.01;
    const dash = (x, y, rot) => { const d = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.11, 0.06), sm); d.position.set(x, y, z); d.rotation.z = rot; torso.add(d); };
    for (let x = -ix + 0.5; x <= ix - 0.5; x += 0.8) { dash(x, iy0, 0); dash(x, iy1, 0); }
    for (let y = iy0 + 0.6; y <= iy1 - 0.6; y += 0.8) { dash(-ix, y, Math.PI / 2); dash(ix, y, Math.PI / 2); }
  }
  if (LOOK === 'painted' && o.hat !== false) {   // a knit beanie: 4 a.m. at the desk
    const knit = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'); g.fillStyle = '#2f6f73'; g.fillRect(0, 0, 256, 128);
      for (let x = 0; x < 256; x += 12) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, 0, 4, 128); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const hm = new THREE.MeshStandardMaterial({ map: knit, roughness: 1 });
    const cap = rbox(BW * 0.82, 2.6, D * 0.82, 0.5, hm, 3); cap.position.set(-0.4, BH + 1.05, 0); cap.rotation.z = 0.06; torso.add(cap);
    const cuff = rbox(BW * 0.88, 1.0, D * 0.88, 0.3, hm, 3); cuff.position.set(-0.4, BH + 0.1, 0); cuff.rotation.z = 0.06; torso.add(cuff);
    const pom = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), new THREE.MeshStandardMaterial({ color: '#f1e6d2', roughness: 1, flatShading: true })); pom.position.set(-0.1, BH + 2.9, 0); torso.add(pom);
  }
  if (ST === 'kawaii') {  // cream belly patch + a tiny smile
    const patch = new THREE.Mesh(new THREE.CircleGeometry(1, 48), vinyl('#F4C9A8', { roughness: 0.35 })); patch.scale.set(2.5, 1.15, 1); patch.position.set(0, 1.9, D / 2 + 0.02); torso.add(patch);
    const sm = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.13, 8, 20, Math.PI), new THREE.MeshPhysicalMaterial({ color: '#2A2622', roughness: 0.3 }));
    sm.rotation.z = Math.PI; sm.position.set(0, 4.9, D / 2 + 0.05); torso.add(sm);
  }

  // slot eyes: grid cols 5 & 12 → x = ±3.5, rows 2–3 → y = 5..7 above the body bottom (centre 6)
  const eyes = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(sx * 3.5, 4.0, D / 2 - 0.12);
    const e = ['tripo', 'flat', 'flatgrad'].includes(ST) ? rbox(1.1, 2.1, 0.4, 0.45, M.eye, 5) : CU >= 1 ? rbox(1.2, 2.15, 0.36, 0.58, M.eye, 6) : rbox(1.0, 2.0, 0.36, 0.22, M.eye, 4); e.position.y = 1.0; e.castShadow = false;
    pivot.add(e);
    const X = o.expr;   // eye language: slot (default) · happy ^ ^ · sad — — · shock ▪ ▪
    if (ST === 'warrior' && !X) pivot.rotation.z = -sx * 0.32;
    if (X === 'happy') { e.visible = false; for (const k of [-1, 1]) { const b = rbox(1.5, 0.5, 0.36, 0.22, M.eye, 3); b.position.set(k * 0.55, 1.0, 0); b.rotation.z = -k * 0.75; pivot.add(b); } }
    if (X === 'sad') { e.visible = false; const b = rbox(1.7, 0.45, 0.36, 0.2, M.eye, 3); b.position.set(0, 0.6, 0); b.rotation.z = sx * 0.28; pivot.add(b); }
    if (X === 'star') { e.visible = false; const sh = new THREE.Shape(); for (let k = 0; k < 8; k++) { const a = Math.PI / 2 + k * Math.PI / 4, r = k % 2 ? 0.42 : 1.35; k ? sh.lineTo(r * Math.cos(a), r * Math.sin(a)) : sh.moveTo(r * Math.cos(a), r * Math.sin(a)); }
      const st = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: '#FFF5E2' })); st.position.set(0, 1.0, 0.2); pivot.add(st);
      const so = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: '#2B2233' })); so.scale.setScalar(1.28); so.position.set(0, 1.0, 0.19); pivot.add(so); }
    if (X === 'shock') { e.visible = false; const b = rbox(1.25, 1.25, 0.36, 0.25, M.eye, 4); b.position.y = 1.2; pivot.add(b); }
    if (CU >= 2) { const hl = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 10), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
      hl.position.set(sx * -0.18, 1.55, 0.2); hl.scale.z = 0.4; pivot.add(hl); }
    torso.add(pivot); eyes.push(pivot);
  }

  if (['happy', 'star'].includes(o.expr) && o.mouth === true) {   // Kai 2026-10-17: Clawd has eyes only (no mouth) by default   // open grin, like the hand-drawn reels
    const ms = new THREE.Shape(); ms.moveTo(-1.1, 0); ms.lineTo(1.1, 0); ms.quadraticCurveTo(1.0, -1.3, 0, -1.3); ms.quadraticCurveTo(-1.0, -1.3, -1.1, 0);
    const mo = new THREE.Mesh(new THREE.ShapeGeometry(ms), new THREE.MeshBasicMaterial({ color: '#2B2233' })); mo.position.set(0, 3.6, D / 2 + 0.03); torso.add(mo);
    const tg = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshBasicMaterial({ color: '#E27A92' })); tg.scale.y = 0.5; tg.position.set(0, 2.55, D / 2 + 0.04); torso.add(tg);
  }
  if (CU >= 3 || ST === 'plush' || ST === 'kawaii') for (const sx of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.85, 32), new THREE.MeshBasicMaterial({ color: '#ff8fa3', transparent: true, opacity: 0.55, depthWrite: false }));
    b.scale.y = 0.55; b.position.set(sx * 5.0, 3.55, D / 2 + 0.02); torso.add(b);
  }
  // googly third eye (EEAAO): white dome + pupil that rattles after impacts
  let googly = null;
  if (o.googly) {
    googly = new THREE.Group(); googly.position.set(o.googlyPos[0], o.googlyPos[1] - LEG, D / 2 + 0.05);
    const R = 1.75;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.5, 48), M.white); base.rotation.x = Math.PI / 2; base.castShadow = true;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.12, 12, 48), M.white); rim.position.z = 0.25;
    const pupil = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.55, R * 0.55, 0.12, 40), M.black); pupil.rotation.x = Math.PI / 2; pupil.position.z = 0.31;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(R * 1.02, 40, 20, 0, TAU, 0, Math.PI / 2), M.glass); dome.rotation.x = Math.PI / 2; dome.scale.set(1, 0.38, 1); dome.position.z = 0.25;
    googly.add(base, rim, pupil, dome); googly.userData.pupil = pupil; googly.userData.R = R;
    torso.add(googly);
  }

  // stub arms: rows 4–5 → centre y = 3 above body bottom; cols 1–2 / 15–16 → x = ±7. Pivot at the shoulder (x = ±6).
  const arms = [];
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sx * 5.75, 3.0, 0.4); sh.userData.sx = sx;
    const a = ST === 'warrior' ? rbox(3.0, 2.5, 2.6, 0.5, M.limb, 3) : rbox(2.7, 1.9, 2.2, 0.62, M.limb, 5); a.position.x = sx * 1.3; sh.add(a);
    if (o.hands) {
      for (const [k, dy, dz] of [[0, 0.55, 0.55], [1, -0.05, 0.75], [2, -0.6, 0.45]]) {
        const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.75, 6, 12), M.limb); f.castShadow = true;
        f.rotation.z = Math.PI / 2 + sx * (k - 1) * -0.35; f.position.set(sx * 2.95, dy, dz - 0.4); sh.add(f);
      }
    }
    if (o.jacket) {   // Kai's red jacket sleeve, rolled cuff; the hand stays Clawd orange
      const jr = new THREE.MeshStandardMaterial({ color: '#C2382D', roughness: 0.85 }), jd = new THREE.MeshStandardMaterial({ color: '#9F2A22', roughness: 0.85 });
      const sl = rbox(2.1, 2.3, 2.6, 0.5, jr, 3); sl.position.x = sx * 1.0; sh.add(sl);   // sleeve sticks out past the jacket side
      const cf = rbox(0.45, 2.45, 2.75, 0.2, jd, 2); cf.position.x = sx * 2.0; sh.add(cf);
    }
    if (ST === 'kai' && sx === 1 && o.scar !== false) {   // the bicep scar: stitched, healed, still there
      const sm = new THREE.MeshStandardMaterial({ color: '#F3DCC0', roughness: 0.8 });
      const line = rbox(2.1, 0.16, 0.06, 0.05, sm, 2); line.position.set(1.3, 0.15, 1.12); sh.add(line);
      for (let k = -0.8; k <= 0.81; k += 0.4) { const st = rbox(0.1, 0.55, 0.06, 0.03, sm, 2); st.position.set(1.3 + k, 0.15, 1.13); sh.add(st); }
    }
    torso.add(sh); arms.push(sh);
  }

  // legs: cols 4, 6, 11, 13 → x = ±4.5, ±2.5. Outer pair sits forward, inner pair back, so a 3/4 view reads as four legs
  // while the straight front view keeps the pixel silhouette. Pivot at the hip.
  const legs = [];
  for (const [x, z] of [[-4.5, 2.2], [-2.5, -2.2], [2.5, 2.2], [4.5, -2.2]]) {
    const hip = new THREE.Group(); hip.position.set(x, 0.25, z);
    const l = rbox(1.15, LEG + 0.5, 1.4, 0.36, M.limb, 4); l.position.y = -(LEG + 0.5) / 2; hip.add(l);
    torso.add(hip); legs.push(hip);
  }

  // props
  if (o.fannypack) {
    const strap = rbox(BW + 0.24, 0.7, D + 0.24, 0.3, M.black, 3); strap.position.y = 1.55; strap.castShadow = false; torso.add(strap);
    const pack = rbox(4.2, 1.9, 1.5, 0.55, M.black, 5); pack.position.set(2.6, 1.6, D / 2 + 0.55); torso.add(pack);
    const zip = rbox(3.4, 0.12, 0.1, 0.04, M.metal, 2); zip.position.set(2.6, 2.2, D / 2 + 1.31); torso.add(zip);
    const buckle = rbox(1.1, 0.75, 0.3, 0.12, M.metal, 3); buckle.position.set(-2.4, 1.55, D / 2 + 0.2); torso.add(buckle);
  }
  if (o.sunglasses) {
    const sg = new THREE.Group(); sg.position.set(0, BH + 0.25, D / 2 - 1.2); sg.rotation.x = -0.35;
    for (const sx of [-1, 1]) {
      const lens = rbox(2.4, 1.3, 0.2, 0.35, M.lens, 3); lens.position.x = sx * 1.6; sg.add(lens);
      const fr = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.09, 8, 32), M.gold); fr.scale.set(1.25, 0.7, 1); fr.position.set(sx * 1.6, 0, 0.08); sg.add(fr);
    }
    const bridge = rbox(0.9, 0.16, 0.16, 0.06, M.gold, 2); bridge.position.y = 0.3; sg.add(bridge);
    torso.add(sg);
  }

  // soft contact shadow (ambient occlusion under the feet); fades as he leaves the ground
  let contact = null;
  if (o.contact !== false) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const g = cv.getContext('2d'), rg = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    rg.addColorStop(0, 'rgba(0,0,0,0.55)'); rg.addColorStop(0.55, 'rgba(0,0,0,0.22)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    contact = new THREE.Mesh(new THREE.PlaneGeometry(BW + 5, D + 4), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    contact.rotation.x = -Math.PI / 2; contact.position.y = 0.03; contact.renderOrder = 1; group.add(contact);
  }

  // ---- pose solver ----------------------------------------------------------------------------
  const rest = () => {
    bounce.position.set(0, 0, 0); bounce.scale.set(1, 1, 1); bounce.rotation.set(0, 0, 0);
    torso.rotation.set(0, 0, 0);
    arms.forEach(a => { a.rotation.set(0, 0, 0); a.position.y = 3.0; }); legs.forEach(l => l.rotation.set(0, 0, 0));
    eyes.forEach(e => e.scale.set(1, 1, 1));
  };
  // squash-and-stretch about the feet, volume-preserving
  const squash = s => { bounce.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s)); };

  function poseIdle(t) {
    squash(1 + 0.012 * Math.sin(t * TAU / 2.4));
    torso.rotation.z = 0.015 * Math.sin(t * TAU / 3.1);
    arms[0].rotation.z = 0.06 * Math.sin(t * TAU / 2.4); arms[1].rotation.z = -0.06 * Math.sin(t * TAU / 2.4 + 0.4);
  }
  function poseWave(t, hand = 1) {
    poseIdle(t);
    // the pixel grid's 'wave' pose = arm moved up to rows 0–3 beside the body; in 3D it slides up and wags
    const up = eo(seg(t, 0, 0.3));
    const arm = arms[hand === 1 ? 1 : 0], s = hand;
    arm.position.y = lerp(3.0, 6.6, up);
    arm.rotation.z = s * (lerp(0, 0.75, up) + up * 0.3 * Math.sin(t * TAU * 2.6));
    torso.rotation.z = -s * 0.04 * up; torso.rotation.y = s * 0.05 * up;
  }
  function poseWalk(t, period = 0.62) {
    const ph = (t / period) * TAU, sw = 0.42;
    legs[0].rotation.x = sw * Math.sin(ph); legs[3].rotation.x = sw * Math.sin(ph);
    legs[1].rotation.x = -sw * Math.sin(ph); legs[2].rotation.x = -sw * Math.sin(ph);
    bounce.position.y = 0.28 * Math.abs(Math.sin(ph));
    torso.rotation.z = 0.04 * Math.sin(ph); torso.rotation.x = 0.03;
    arms[0].rotation.x = -0.35 * Math.sin(ph); arms[1].rotation.x = 0.35 * Math.sin(ph);
    arms[0].rotation.z = -0.12; arms[1].rotation.z = 0.12;
  }
  // one hop per `period` seconds: anticipation squash → arc with tucked legs → landing wobble
  function poseHop(t, period = 1.1) {
    const k = ((t % period) + period) % period / period;
    const anticip = seg(k, 0, 0.18), air = seg(k, 0.18, 0.72), land = seg(k, 0.72, 1);
    let y = 0, s = 1;
    if (k < 0.18) s = 1 - 0.16 * ss(anticip);
    else if (k < 0.72) { y = 5.2 * Math.sin(Math.PI * air); s = 1 + 0.14 * Math.sin(Math.PI * Math.min(1, air * 1.6)) * (1 - air); }
    else { const d = land; s = 1 - 0.2 * Math.exp(-6 * d) * Math.cos(d * 14); }
    bounce.position.y = y; squash(s);
    const tuck = k > 0.18 && k < 0.72 ? Math.sin(Math.PI * air) : 0;
    legs.forEach((l, i) => l.rotation.x = (i % 2 ? -1 : 1) * 0.35 * tuck);
    arms[0].rotation.z = -lerp(0.05, 0.85, tuck) + (k < 0.18 ? 0.25 * anticip : 0); arms[1].rotation.z = -arms[0].rotation.z;
    arms.forEach(a => a.position.y = 3.0 + 2.2 * tuck);
    torso.rotation.x = k > 0.18 && k < 0.72 ? -0.08 * Math.cos(Math.PI * air) : 0;
  }
  function poseDance(t, bpm = 112) {
    const b = t * bpm / 60, ph = b * Math.PI;
    bounce.position.y = 0.5 * Math.abs(Math.sin(ph));
    squash(1 - 0.06 * Math.cos(2 * ph));
    torso.rotation.z = 0.12 * Math.sin(ph); torso.rotation.y = 0.18 * Math.sin(ph * 0.5);
    arms[0].position.y = 4.6 + 1.6 * Math.sin(ph); arms[1].position.y = 4.6 - 1.6 * Math.sin(ph);
    arms[0].rotation.z = -(0.4 + 0.35 * Math.sin(ph)); arms[1].rotation.z = 0.4 - 0.35 * Math.sin(ph);
    legs.forEach((l, i) => l.rotation.x = 0.25 * Math.sin(ph + (i % 2) * Math.PI));
  }

  // z284 'jazz hands': arms out and a little raised, a quick shimmy
  function poseJazz(t) {
    poseIdle(t);
    const sh = Math.sin(t * TAU * 3.2);
    arms.forEach(a => { const sx = a.userData.sx; a.position.y = 4.1; a.rotation.z = sx * (0.32 + 0.07 * sh); a.rotation.y = -sx * 0.25; });
    torso.rotation.z = 0.02 * sh;
  }

  function update(t, { action = 'idle', blink = true, look = [0, 0], hand = 1, impact: impactAt = -99 } = {}) {
    rest();
    let impact = impactAt;   // opts.impact = time of an external jolt (rattles the googly pupil)
    if (action === 'idle') poseIdle(t);
    else if (action === 'wave') poseWave(t, hand);
    else if (action === 'walk') poseWalk(t);
    else if (action === 'dance') poseDance(t);
    else if (action === 'jazz') poseJazz(t);
    else if (action === 'hop') { poseHop(t); const per = 1.1, k = (t % per) / per; impact = k >= 0.72 ? t - (k - 0.72) * per : t - (k + 0.28) * per; }
    else if (action === 'scurry') poseHop(t, 0.38);
    else if (action === 'demo') {
      // 3 s reel beat: wave (0–1.5) → hop (1.5–2.6) → settle
      if (t < 1.5) poseWave(t, hand);
      else if (t < 2.6) { poseHop(t - 1.5, 1.1); impact = 1.5 + 0.72 * 1.1; }
      else { poseIdle(t); impact = 1.5 + 0.72 * 1.1; }
    }
    // eyes: blink + optional gaze shift
    const c = blink ? blinkAt(t) : 0;
    eyes.forEach(e => { e.scale.y = 1 - 0.88 * c; e.position.x = Math.sign(e.position.x) * 3.5 + look[0] * 0.5; e.position.y = 4.0 + look[1] * 0.4 + 0.88 * c; });
    if (contact) { const k = clamp(1 - bounce.position.y / 6); contact.material.opacity = 0.25 + 0.75 * k; contact.scale.setScalar(1.15 - 0.3 * k); }
    if (googly) {
      const p = googly.userData.pupil, R = googly.userData.R, dt = t - impact;
      let gx = 0.18 * Math.sin(t * 1.7) + look[0] * 0.5, gy = -0.45 + 0.08 * Math.sin(t * 2.3);
      if (dt >= 0 && dt < 1.2) { const e = Math.exp(-4 * dt); gx += 0.55 * e * Math.sin(dt * 31); gy += 0.4 * e * Math.cos(dt * 23); }
      const r = Math.hypot(gx, gy), lim = R * 0.42; if (r > lim) { gx *= lim / r; gy *= lim / r; }
      p.position.x = gx; p.position.y = gy;
    }
    return group;
  }

  if (HAND) {   // ink outline on every body part; sketch adds loose overshooting pencil edges
    const W = { ink: 0.32, sketch: 0.12, paper: 0.34 }[HAND], wob = { ink: 0.45, sketch: 0.3, paper: 0.25 }[HAND];
    const parts = []; torso.traverse(m => { if (m.isMesh && (m.material === M.body || m.material === M.limb)) parts.push(m); });
    for (const m of parts) { const h = new THREE.Mesh(m.geometry, hullMat(W * (m.material === M.limb ? 0.7 : 1), wob)); h.castShadow = false; m.add(h); }
    if (HAND === 'sketch') { const R = rng(21), lm = new THREE.MeshBasicMaterial({ color: PAL.ink }), E = new THREE.EdgesGeometry(new THREE.BoxGeometry(BW, BH, D)).attributes.position;
      for (let pass = 0; pass < 2; pass++) for (let i = 0; i < E.count; i += 2) {
        const a = new THREE.Vector3().fromBufferAttribute(E, i), b = new THREE.Vector3().fromBufferAttribute(E, i + 1), dir = b.clone().sub(a).normalize(), j = () => (R() - .5) * 0.35;
        const p0 = a.clone().addScaledVector(dir, -0.6 * R()).add(V3(j(), j(), j())), p1 = b.clone().addScaledVector(dir, 0.6 * R()).add(V3(j(), j(), j()));
        const tb = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(p0, p1), 1, 0.06, 5), lm); tb.position.y = BH / 2; torso.add(tb); } }
    if (HAND === 'paper') { const sh = rbox(BW, BH, 0.2, 0.3, new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.18 }), 2); sh.position.set(0.5, BH / 2 - 0.5, -D / 2 - 0.4); torso.add(sh); }
  }
  update(0);
  return { group, update, parts: { body, eyes, arms, legs, googly, torso, bounce }, materials: M };
}
