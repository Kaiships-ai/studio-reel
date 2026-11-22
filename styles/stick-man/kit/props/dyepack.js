// The explainer props: the dye pack with a face, the thermometer.
// Each maker returns a THREE.Group in three's local frame (y up, origin at the bottom centre, front = +z) with
// group.userData.set(params). Pure: the same params always give the same look. The caller adds the group to the
// scene and marks it with stage.prop() for the ink line; decals are noPrepass so the ink skips them.
import * as THREE from 'three';
import { lin, std, toon } from '#engine/look.js';
import { clamp } from '#engine/mathx.js';
import { canvasTex } from '#kit/sets/canvas.js';

function mesh(g, geo, mat, x, y, z) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; }
function decal(g, w, h, map, x, y, z, flat = true) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.6 }));
  if (flat) m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z); m.receiveShadow = true; m.userData.noPrepass = true; g.add(m); return m;
}
const ease = x => { const t = clamp(x); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- (b) the dye pack
// set({ awake, snore, alarm, dial, count }):
//   awake 0/1 (eyes snap: >= 0.5 is awake), snore 0..1 (size of the snore bubble, shown only asleep),
//   alarm 0..1 (LED green -> red, and a red glow), dial 0..1 (the countdown dial pops up), count integer 10..0.
export const PACK_SIZE = { x: 0.13, y: 0.022, z: 0.062 };
function packFace(awake) {
  return canvasTex(512, 320, (c, W, H) => {
    c.fillStyle = 'rgb(26,26,30)'; c.fillRect(0, 0, W, H);
    c.strokeStyle = c.fillStyle = 'rgb(244,244,240)'; c.lineCap = c.lineJoin = 'round';
    const ex = [W * 0.30, W * 0.62], ey = H * 0.42;
    for (const x of ex) {
      if (awake) {
        c.beginPath(); c.arc(x, ey, 50, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgb(16,16,18)'; c.beginPath(); c.arc(x + 6, ey + 4, 22, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgb(244,244,240)';
        c.lineWidth = 14; c.beginPath(); c.moveTo(x - 46, ey - 78); c.lineTo(x + 40, ey - 92); c.stroke();
      } else {
        c.lineWidth = 16; c.beginPath(); c.arc(x, ey - 14, 40, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
      }
    }
    const mx = (ex[0] + ex[1]) / 2, my = H * 0.78;
    if (awake) { c.beginPath(); c.ellipse(mx, my, 26, 32, 0, 0, Math.PI * 2); c.fill(); }
    else { c.lineWidth = 12; c.beginPath(); c.ellipse(mx, my, 14, 10, 0, 0, Math.PI * 2); c.stroke(); }
  });
}
function dialTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.userData.draw = n => {
    const c = cv.getContext('2d'), W = 256;
    c.clearRect(0, 0, W, W);
    c.fillStyle = 'rgb(250,248,240)'; c.beginPath(); c.arc(W / 2, W / 2, 124, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgb(222,40,36)'; c.lineWidth = 22; c.lineCap = 'butt';
    c.beginPath(); c.arc(W / 2, W / 2, 100, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * Math.max(0, n) / 10); c.stroke();
    c.strokeStyle = 'rgb(20,20,24)'; c.lineWidth = 8; c.beginPath(); c.arc(W / 2, W / 2, 122, 0, Math.PI * 2); c.stroke();
    c.fillStyle = 'rgb(20,20,24)'; c.font = 'bold 118px Arial, Helvetica, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(String(n), W / 2, W / 2 + 6);
    t.needsUpdate = true;
  };
  return t;
}
export function makeDyePack(stage) {
  const { x: PX, y: PY, z: PZ } = PACK_SIZE, g = new THREE.Group();
  // a red dye canister body (it reads as "dye"), the sleepy face on a dark panel on its lid
  mesh(g, new THREE.BoxGeometry(PX, PY, PZ), std([0.62, 0.05, 0.06], 0.45), 0, PY / 2, 0);
  const faces = [packFace(false), packFace(true)];
  const face = decal(g, PX * 0.66, PZ * 0.86, faces[0], -PX * 0.15, PY + 0.0006, 0);
  // LED on the right end of the lid
  const ledMat = new THREE.MeshBasicMaterial({ color: lin(0.1, 1.0, 0.2) });
  const led = mesh(g, new THREE.SphereGeometry(0.0075, 16, 10), ledMat, PX * 0.36, PY + 0.002, -PZ * 0.22); led.castShadow = false;
  stage.glow(led, 1.0);
  const halo = new THREE.PointLight(lin(1.0, 0.08, 0.06), 0, 0.6, 2); halo.position.set(PX * 0.36, PY + 0.03, 0); g.add(halo);
  // snore bubble (asleep only): translucent ball off the front-left corner
  const bubble = mesh(g, new THREE.SphereGeometry(0.014, 20, 12), new THREE.MeshStandardMaterial({ color: lin(0.70, 0.86, 1.0), roughness: 0.1,
    transparent: true, opacity: 0.75 }), -PX * 0.50, PY + 0.022, PZ * 0.30);
  bubble.castShadow = false; bubble.userData.noPrepass = true;
  // countdown dial: a disk on a short stem that pops up from the right end, facing front (+z)
  const dial = new THREE.Group(); dial.position.set(PX * 0.30, PY, 0); g.add(dial);
  mesh(dial, new THREE.CylinderGeometry(0.003, 0.003, 0.03, 8), std([0.05, 0.05, 0.06], 0.4), 0, 0.015, 0);
  const dt = dialTex(); dt.userData.draw(10);
  const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.006, 40), std([0.05, 0.05, 0.06], 0.4));
  disk.rotation.x = Math.PI / 2; disk.position.set(0, 0.062, 0); disk.castShadow = true; dial.add(disk);
  // the face is a circle just in front of the rim: its UVs are upright, so the number reads from the front
  const dface = new THREE.Mesh(new THREE.CircleGeometry(0.031, 40), new THREE.MeshStandardMaterial({ map: dt, roughness: 0.5, transparent: true }));
  dface.position.set(0, 0.062, 0.0032); dface.userData.noPrepass = true; dial.add(dface);
  const G0 = new THREE.Color(lin(0.1, 1.0, 0.2)), R0 = new THREE.Color(lin(1.0, 0.06, 0.04)), lg0 = led.userData.glow.color.clone();
  let last = 10, lastAwake = 0;
  const set = ({ awake = 0, snore = 0, alarm = 0, dial: d = 0, count = 10 } = {}) => {
    const a = awake >= 0.5 ? 1 : 0;
    if (a !== lastAwake) { face.material.map = faces[a]; face.material.needsUpdate = true; lastAwake = a; }
    const k = clamp(alarm);
    ledMat.color.copy(G0).lerp(R0, k).multiplyScalar(1.2 + 1.8 * k);
    led.userData.glow.color.copy(lg0).lerp(R0, k).multiplyScalar(1.0 + 2.5 * k);
    halo.intensity = 0.25 * k;
    bubble.visible = !a && snore > 0.02; bubble.scale.setScalar(0.4 + 1.2 * clamp(snore));
    const s = ease(d * 1.4) * (1 + 0.15 * Math.sin(Math.PI * clamp(d * 1.4))); dial.scale.setScalar(Math.max(1e-3, s)); dial.visible = d > 0.001;
    const n = Math.max(0, Math.min(10, Math.round(count)));
    if (n !== last) { dt.userData.draw(n); last = n; }
  };
  set({});
  g.userData.set = set;
  return g;
}
// snore bubble size over time: grows over `period` s, pops, repeats
export const snoreAt = (t, period = 1.6) => { const u = ((t % period) + period) % period / period; return u < 0.85 ? u / 0.85 : 0; };

// ---------------------------------------------------------------- (d) the thermometer
// set({ temp }) in degrees 70..400 (or { k } 0..1 over the same range): red column, reading card, the bulb glows hot
export function makeThermometer(stage, { H = 0.56 } = {}) {
  const g = new THREE.Group(), T0 = 50, T1 = 420, y0 = 0.10, y1 = H - 0.05;
  const yOf = t => y0 + (y1 - y0) * (t - T0) / (T1 - T0);
  // backing board with ticks every 50 degrees
  const board = canvasTex(256, 1024, (c, W, Hh) => {
    c.fillStyle = 'rgb(250,246,236)'; c.fillRect(0, 0, W, Hh);
    c.fillStyle = 'rgb(30,30,36)'; c.font = 'bold 40px Arial, Helvetica, sans-serif'; c.textAlign = 'right'; c.textBaseline = 'middle';
    for (let t = 100; t <= 400; t += 50) { const y = Hh * (1 - yOf(t) / H); c.fillRect(150, y - 3, 48, 6); c.fillText(String(t), 140, y); }
    for (let t = 75; t <= 400; t += 50) { const y = Hh * (1 - yOf(t) / H); c.fillRect(170, y - 2, 28, 4); }
  });
  const bw = 0.16, bd = 0.02;
  const bm = new THREE.MeshStandardMaterial({ map: board, roughness: 0.6 }), edge = std([0.80, 0.76, 0.68], 0.6);
  mesh(g, new THREE.BoxGeometry(bw, H, bd), [edge, edge, edge, edge, bm, edge], 0, H / 2, 0);
  const tx = bw * 0.30, tz = bd / 2 + 0.014;
  mesh(g, new THREE.CylinderGeometry(0.014, 0.014, y1 - y0 + 0.02, 20), std([0.96, 0.97, 1.0], 0.15), tx, (y0 + y1) / 2, tz - 0.008);
  mesh(g, new THREE.SphereGeometry(0.014, 20, 12), std([0.96, 0.97, 1.0], 0.15), tx, y1 + 0.01, tz - 0.008);
  const redMat = toon([0.86, 0.04, 0.04], { shade: [0.70, 0.50, 0.60], sheen: 0.3, rim: 0.1 }); redMat.emissive = lin(1.0, 0.08, 0.04); redMat.emissiveIntensity = 0;
  const col = mesh(g, new THREE.CylinderGeometry(0.0095, 0.0095, 1, 16), redMat, tx, 0, tz + 0.004);   // proud of the white tube
  const bulb = mesh(g, new THREE.SphereGeometry(0.030, 24, 16), redMat, tx, y0 - 0.012, tz);
  stage.glow(bulb, 0.0); stage.glow(col, 0.0);
  const bulbGlow = bulb.userData.glow.color, colGlow = col.userData.glow.color;
  // reading card above
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 192;
  const rt = new THREE.CanvasTexture(cv); rt.colorSpace = THREE.SRGBColorSpace;
  const card = new THREE.Mesh(new THREE.PlaneGeometry(0.20, 0.075), new THREE.MeshStandardMaterial({ map: rt, roughness: 0.6 }));
  card.position.set(0, H + 0.055, 0.002); card.userData.noPrepass = true; g.add(card);
  const back = mesh(g, new THREE.BoxGeometry(0.21, 0.085, 0.012), std([0.10, 0.10, 0.12], 0.5), 0, H + 0.055, -0.006);
  back.castShadow = false;
  let last = null;
  const draw = n => {
    const c = cv.getContext('2d'); c.fillStyle = 'rgb(20,20,24)'; c.fillRect(0, 0, 512, 192);
    c.fillStyle = n >= 300 ? 'rgb(255,90,70)' : 'rgb(250,248,240)'; c.font = 'bold 132px Arial, Helvetica, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(`${n}°`, 256, 104); rt.needsUpdate = true;
  };
  const set = ({ temp, k } = {}) => {
    const t = temp != null ? temp : 70 + 330 * clamp(k ?? 0), tt = Math.max(T0, Math.min(T1, t));
    const top = yOf(tt), h = Math.max(0.002, top - y0 + 0.01);
    col.scale.y = h; col.position.y = y0 - 0.01 + h / 2;
    const hot = clamp((tt - 200) / 200);
    redMat.emissiveIntensity = 0.12 * hot; bulbGlow.setRGB(1.0, 0.08, 0.04).multiplyScalar(0.5 * hot); colGlow.copy(bulbGlow);
    const n = Math.round(tt); if (n !== last) { draw(n); last = n; }
  };
  set({ temp: 70 });
  g.userData.set = set;
  return g;
}
