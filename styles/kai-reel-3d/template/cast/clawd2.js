// clawd2.js: Clawd = boxy rounded-cube astronaut (avatar-v4). Slot eyes only. Pure function of t (seekable).
// Units ~ clawd3d (≈12 wide, ≈11 tall, origin between the feet, +z faces camera) so cast's clawdScale still works.
//   const c = createClawd2({ dome: false }); scene.add(c.group);
//   c.update(t, { action, expr, look:[x,y], squash, sweat })
//   action: idle hop happyHop doubleTake stomp pointSelf recoil wave jazz   expr: neutral happy wide squint worried wink
//   (expr defaults to the action's own mood; sweat 0..1 = blue drop; squash = external override, <1 squashed, >1 stretched)
// Meshes carry userData: emit (flat-lit colour, survives cast.js toonMat), noOutline (no hull), so cast keeps whites white.
import * as THREE from 'three';
import { blinkAt } from '../engine/clawd3d.js';

export const COLORS2 = { body: '#E8743B', belly: '#FFC79A', leg: '#C95A27', ink: '#2A1B1B', cheek: '#FF7F8E', band: '#D6252B', sweat: '#5BB8FF' };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = x => x * x * (3 - 2 * x), eo = x => 1 - Math.pow(1 - x, 3), lerp = (a, b, k) => a + (b - a) * k;
const fr = (x) => x - Math.floor(x);
const W = 10.4, HB = 7.4, D = 8, LEG = 2.3;

const mat = (c, o = {}) => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, ...o }); return m; };
function mesh(geo, color, o = {}) { const m = new THREE.Mesh(geo, mat(color)); m.castShadow = !o.noShadow; if (o.emit) m.userData.emit = o.emit === true ? color : o.emit; if (o.noOutline) m.userData.noOutline = true; return m; }
const sph = (r, c, o) => mesh(new THREE.SphereGeometry(r, 24, 16), c, o);

// hop curve: crouch → launch → air → land squash → recover. ph 0..1 → {y (units), sy}
function hopCurve(ph, h, crouch = 0.16, land = 0.84) {
  if (ph < crouch) return { y: 0, sy: 1 - 0.24 * ss(ph / crouch) };
  if (ph < crouch + 0.07) { const k = ss((ph - crouch) / 0.07); return { y: 0, sy: lerp(0.76, 1.18, k) }; }
  if (ph < land) { const a = (ph - crouch - 0.07) / (land - crouch - 0.07); return { y: h * 4 * a * (1 - a), sy: 1.18 - 0.1 * a - 0.08 * Math.sin(Math.PI * a) * 0 }; }
  const k = (ph - land) / (1 - land); return { y: 0, sy: k < 0.35 ? lerp(1.08, 0.72, ss(k / 0.35)) : 1 - 0.28 * Math.exp(-(k - 0.35) * 5) * Math.cos((k - 0.35) * 14) };
}

// ----- the pose: pure function of (t, action) → body channels
function pose(t, action) {
  const P = { y: 0, z: 0, x: 0, sy: 1, rx: 0, rz: 0, ry: 0, aR: 0.25, aL: 0.25, fR: 0, fL: 0, leg: 0.5, lift: -1, lookX: 0, lookY: 0, mood: 'neutral' };
  const br = Math.sin(t * 2.2);
  P.sy = 1 + 0.025 * br; P.rz = 0.025 * Math.sin(t * 1.1); P.aR = 0.25 + 0.06 * br; P.aL = 0.25 - 0.06 * br;
  if (action === 'hop' || action === 'happyHop') {
    const hp = action === 'hop', per = hp ? 1.1 : 0.85, c = hopCurve(fr(t / per), hp ? 3.4 : 4.6);
    P.y = c.y; P.sy = c.sy; P.mood = hp ? 'neutral' : 'happy'; P.leg = 1;
    const air = c.y > 0.2 ? 1 : 0; P.aR = P.aL = hp ? 0.25 + air * 0.7 : 0.5 + air * 1.6;
    if (!hp) { P.rz = 0.14 * Math.sin(t / per * Math.PI * 2); P.ry = 0.18 * Math.sin(t / per * Math.PI * 2 + 1); }
  } else if (action === 'recoil') {
    const per = 3, ph = fr(t / per), j = seg(ph, 0.25, 0.68), back = ph < 0.25 ? 0 : ph < 0.68 ? eo(j) : 1 - ss(seg(ph, 0.8, 1));
    P.z = -2.8 * back; P.y = 5 * 4 * j * (1 - j); P.rx = -0.5 * (ph < 0.25 ? 0 : ph < 0.7 ? Math.sin(Math.PI * Math.min(1, j * 1.2)) * 0.9 + 0.1 : 0.1 * (1 - ss(seg(ph, 0.8, 1))));
    P.sy = ph < 0.25 ? 1 - 0.2 * ss(seg(ph, 0.15, 0.25)) : ph < 0.68 ? 1.2 : ph < 0.76 ? lerp(1.15, 0.78, ss(seg(ph, 0.68, 0.76))) : lerp(0.78, 1, 1 - Math.exp(-(ph - 0.76) * 14)) + 0.02 * Math.sin(ph * 90);
    P.aR = P.aL = 0.25 + (ph > 0.25 && ph < 0.8 ? 1.5 : 0); P.mood = ph > 0.24 && ph < 0.9 ? 'wide' : 'neutral'; P.leg = 1;
    if (ph > 0.76 && ph < 0.95) P.rz = 0.07 * Math.sin(t * 60) * (0.95 - ph);
  } else if (action === 'doubleTake') {
    const per = 3.2, ph = fr(t / per), away = ss(seg(ph, 0.1, 0.2)) * (1 - ss(seg(ph, 0.36, 0.4))), snap = ss(seg(ph, 0.4, 0.46));
    P.lookX = -0.8 * away; P.ry = 0.35 * away; P.rz += 0.05 * away;
    const big = snap * (1 - ss(seg(ph, 0.62, 0.8)));
    P.sy = 1 + 0.26 * big + (ph > 0.42 && ph < 0.7 ? 0.04 * Math.sin(t * 50) : 0); P.y = 0.9 * big; P.mood = ph > 0.4 && ph < 0.8 ? 'wide' : 'neutral';
    P.aR = P.aL = 0.25 + 1.1 * big; P.ry = P.ry * (1 - snap) + 0.0;
  } else if (action === 'stomp') {
    const per = 1.3, cyc = Math.floor(t / per), ph = fr(t / per), side = cyc % 2, up = ss(seg(ph, 0.05, 0.4)) * (1 - ss(seg(ph, 0.4, 0.46)));
    P.lift = side ? 1 : 2; P.leg = 1; const hit = ph > 0.43 ? Math.exp(-(ph - 0.43) * 9) : 0;
    P.sy = 1 + 0.06 * up - 0.28 * hit * Math.cos((ph - 0.43) * 22); P.rz = (side ? 1 : -1) * (0.12 * up - 0.05 * hit); P.y = 0.8 * up; P.rx = -0.12 * up;
    P.aR = P.aL = 0.0 + 0.5 * hit; P.fR = P.fL = 0.5 * up; P.mood = 'squint'; P.lift = up * 0.9 * (side ? 1 : 2);
    P.liftIdx = side ? 0 : 1; P.liftAmt = up;
  } else if (action === 'pointSelf') {
    const per = 2.2, ph = fr(t / per), pt = ss(seg(ph, 0.05, 0.25)), tap = ph > 0.3 ? Math.max(0, Math.sin((ph - 0.3) * 34)) * 0.5 * (1 - seg(ph, 0.5, 0.9)) : 0;
    P.pointR = pt; P.tap = tap; P.rx = -0.12 * pt; P.sy = 1 + 0.03 * Math.sin(t * 3.3) + 0.06 * pt - 0.05 * tap; P.rz = 0.06 * pt * Math.sin(t * 2.5); P.mood = 'happy'; P.y = 0.25 * tap;
    P.aL = 0.35 + 0.1 * Math.sin(t * 3);
  } else if (action === 'wave') {
    P.aR = 1.55 + 0.35 * Math.sin(t * 9); P.fR = 0.25; P.rz = 0.07 * Math.sin(t * 2); P.mood = 'happy'; P.sy = 1 + 0.03 * Math.sin(t * 4.4); P.lookX = 0.2;
  } else if (action === 'jazz') {
    const w = t / 1.6 * Math.PI * 2, b = Math.abs(Math.sin(w));
    P.y = 1.1 * b; P.sy = 1 + 0.12 * Math.cos(w * 2) * 0 + 0.1 * (b - 0.5) * 0 + (b < 0.15 ? -0.1 : 0.06 * b); P.rz = 0.2 * Math.sin(w); P.ry = 0.25 * Math.sin(w + 1.2);
    P.aR = 1.2 + 0.5 * Math.sin(w * 2); P.aL = 1.2 - 0.5 * Math.sin(w * 2); P.fR = P.fL = 0.4; P.mood = 'happy'; P.leg = 1; P.lookX = 0.3 * Math.sin(w);
  }
  return P;
}

// rounded box: subdivided box with corners pushed onto a radius-r sphere (soft bevel, NOT a sphere body)
function rbox(w, h, d, r, seg = 6) {
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg), p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3(), hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); c.set(clamp(v.x, -hx, hx), clamp(v.y, -hy, hy), clamp(v.z, -hz, hz)); v.sub(c); if (v.lengthSq() > 1e-9) v.normalize().multiplyScalar(r); p.setXYZ(i, c.x + v.x, c.y + v.y, c.z + v.z); }
  g.computeVertexNormals(); return g;
}
const rb = (w, h, d, r, color, o) => mesh(rbox(w, h, d, r, 4), color, o);
function ring(rx, rz, tube, color, o) { const pts = Array.from({ length: 48 }, (_, i) => { const a = i / 48 * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * rx, 0, Math.sin(a) * rz); }); return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 64, tube, 8, true), color, o); }
const WHITE = '#EEE8DF', INK = '#2A1B1B';

const EXPR = { // slots: sy/sx scale, arcs per eye (1 = ^), tilt (inward lean), one-sided squint/wink via R overrides
  neutral: { sx: 1, sy: 1, arcL: 0, arcR: 0, tilt: 0, mouth: 'smile' },
  happy: { sx: 1, sy: 1, arcL: 1, arcR: 1, tilt: 0, mouth: 'grin' },
  wide: { sx: 1.25, sy: 1.3, arcL: 0, arcR: 0, tilt: 0, mouth: 'o' },
  squint: { sx: 1, sy: 1, syR: 0.34, arcL: 0, arcR: 0, tilt: 0.1, mouth: 'flat' },
  worried: { sx: 1, sy: 1.05, arcL: 0, arcR: 0, tilt: 0.38, mouth: 'wavy' },
  wink: { sx: 1, sy: 1, arcL: 0, arcR: 1, tilt: 0, mouth: 'smile' },
};

export function createClawd2(opts = {}) {
  const C = COLORS2, group = new THREE.Group(), bounce = new THREE.Group(), torso = new THREE.Group(); group.add(bounce); bounce.add(torso); torso.position.y = LEG;
  const FZ = D / 2;
  const body = rb(W, HB, D, 1.15, C.body); body.position.y = HB / 2; torso.add(body);
  // white suit trim framing the front face
  const frame = new THREE.Group(); frame.position.set(0, 3.75, FZ + 0.02); torso.add(frame);
  const fw = 8.6, fh = 5.4, bt = 0.42;
  const panel = rb(fw - 0.4, fh - 0.4, 0.2, 0.08, '#F08A50', { noShadow: true }); panel.position.z = 0.0; frame.add(panel);
  for (const [x, y, w, h] of [[0, fh / 2, fw, bt], [0, -fh / 2, fw, bt], [-fw / 2, 0, bt, fh], [fw / 2, 0, bt, fh]]) { const b = rb(w, h, 0.34, 0.15, WHITE, { noShadow: true }); b.position.set(x, y, 0.06); frame.add(b); }
  // chest badge (red/white)
  const badge = new THREE.Group(); badge.position.set(3.0, 1.45, FZ + 0.12); torso.add(badge);
  const bw = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.2, 24), mat(WHITE)); bw.rotation.x = Math.PI / 2; bw.userData.emit = WHITE; bw.userData.noOutline = true; badge.add(bw);
  const br = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.17, 8, 28), mat('#D6252B')); br.position.z = 0.1; br.userData.emit = '#D6252B'; br.userData.noOutline = true; badge.add(br);
  // slot eyes (vertical dark rounded bars) + ^ arcs
  const eyes = new THREE.Group(); eyes.position.set(0, 3.95, FZ + 0.2); torso.add(eyes); const E = {};
  const ink = (g) => { const m = new THREE.Mesh(g, mat(INK)); m.userData.emit = INK; m.userData.noOutline = true; return m; };
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.x = s * 2.05; eyes.add(e);
    const slot = ink(new THREE.CapsuleGeometry(0.46, 1.5, 6, 14)); slot.scale.z = 0.4; e.add(slot);
    const arc = ink(new THREE.TorusGeometry(0.85, 0.2, 8, 20, Math.PI)); arc.position.y = -0.45; arc.scale.z = 0.5; e.add(arc);
    E[s < 0 ? 'L' : 'R'] = { e, slot, arc };
  }
  // mouth: small line only
  const mouth = new THREE.Group(); mouth.position.set(0, 2.2, FZ + 0.2); torso.add(mouth); const MS = {};
  MS.smile = ink(new THREE.TorusGeometry(0.5, 0.12, 8, 18, Math.PI)); MS.smile.rotation.z = Math.PI; MS.smile.position.y = 0.3;
  MS.flat = ink(new THREE.CapsuleGeometry(0.11, 0.8, 4, 8)); MS.flat.rotation.z = Math.PI / 2;
  MS.o = ink(new THREE.TorusGeometry(0.28, 0.12, 8, 16)); MS.o.scale.set(0.9, 1.2, 1);
  const gs = new THREE.Shape(); gs.moveTo(-0.7, 0.3); gs.lineTo(0.7, 0.3); gs.absarc(0, 0.3, 0.7, 0, -Math.PI, true); gs.closePath();
  MS.grin = ink(new THREE.ShapeGeometry(gs, 16)); MS.grin.position.y = 0.1;
  MS.wavy = ink(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 13 }, (_, i) => new THREE.Vector3((i / 12 - 0.5) * 1.5, Math.sin(i / 12 * Math.PI * 3) * 0.13, 0))), 30, 0.1, 6));
  MS.talk = ink(new THREE.CircleGeometry(0.42, 24)); MS.talk.scale.set(1.3, 1, 1);   // morphy-clone: filled talking mouth
  for (const k in MS) { MS[k].visible = false; mouth.add(MS[k]); }
  // stub block arms
  const arms = new THREE.Group(); torso.add(arms); const A = {};
  for (const s of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(s * (W / 2 - 0.2), 3.3, 1.5); arms.add(g); g.rotation.order = 'YZX';
    const a = rb(2.3, 1.5, 1.6, 0.45, C.body); a.position.x = s * 1.0; g.add(a);
    const hnd = rb(0.9, 1.3, 1.4, 0.35, C.leg); hnd.position.x = s * 2.2; g.add(hnd);
    A[s < 0 ? 'L' : 'R'] = g;
  }
  // collar ring, red band at dome base, dome, pilot flame
  const collar = ring(4.35, 3.35, 0.42, WHITE, { noShadow: true }); collar.position.y = HB + 0.05; torso.add(collar);
  const band = new THREE.Group(); band.position.y = HB + 0.5; torso.add(band);
  band.add(ring(4.0, 3.05, 0.34, C.band, { noShadow: true }));
  const knot = rb(1.0, 0.9, 0.9, 0.3, C.band); knot.position.set(3.5, 0, -1.2); band.add(knot);
  const tails = []; const tg = new THREE.Group(); band.add(tg);
  for (const s of [-1, 1]) { const par = new THREE.Group(); par.position.set(3.7, 0, -1.0); par.rotation.y = 0; tg.add(par); const segs = [par];
    const w0 = s < 0 ? 1.0 : 0.85;
    for (let i = 0; i < 3; i++) { const L = 2.4 - i * 0.25; const m = mesh(new THREE.BoxGeometry(w0 - i * 0.15, 0.16, L), C.band, { noShadow: true }); m.position.z = -L / 2; segs[i].add(m);
      if (i < 2) { const nx = new THREE.Group(); nx.position.z = -L; segs[i].add(nx); segs.push(nx); } }
    tails.push({ s, segs }); }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.25, roughness: 0.05 }));
  dome.scale.set(4.2, 4.1, 3.25); dome.position.y = HB + 0.6; dome.userData.glass = true; dome.userData.noOutline = true; torso.add(dome);
  const flame = new THREE.Group(); flame.position.set(0, HB + 1.2, 0); torso.add(flame);
  const fm = (g, c) => { const m = new THREE.Mesh(g, mat(c)); m.userData.emit = c; m.userData.noOutline = true; return m; };
  const fbase = fm(new THREE.SphereGeometry(0.62, 14, 10), '#6FC0FF'); fbase.scale.set(1, 0.8, 0.5);
  const mk = (r, h, c, x, y, rz) => { const m = fm(new THREE.ConeGeometry(r, h, 3), c); m.position.set(x, y, 0); m.rotation.z = rz; m.scale.z = 0.4; return m; };
  flame.add(fbase, mk(0.5, 1.9, '#8FD0FF', 0, 1.0, 0), mk(0.3, 1.1, '#8FD0FF', -0.45, 0.8, 0.5), mk(0.3, 1.0, '#8FD0FF', 0.45, 0.75, -0.5), mk(0.26, 1.0, '#F2FBFF', 0, 0.6, 0));
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 12), new THREE.MeshBasicMaterial({ color: '#7FC8FF', transparent: true, opacity: 0.18 })); halo.position.y = 0.7; halo.userData.noOutline = true; flame.add(halo);
  // white backpack with red stripe
  const pack = new THREE.Group(); pack.position.set(0, 3.7, -FZ - 1.05); torso.add(pack);
  pack.add(rb(7.2, 5.4, 2.4, 0.7, WHITE)); const stripe = rb(7.4, 0.75, 2.55, 0.2, '#D6252B', { noShadow: true }); stripe.position.y = 1.2; pack.add(stripe);
  // stub block legs
  const legs = new THREE.Group(); bounce.add(legs); const LG = [];
  [[-3.1, 2.3], [3.1, 2.3], [-3.1, -2.3], [3.1, -2.3]].forEach(([x, z]) => { const g = new THREE.Group(); g.position.set(x, LEG + 0.4, z); legs.add(g); const m = rb(2.2, 2.7, 2.2, 0.55, C.leg); m.position.y = -1.0; g.add(m); LG.push(g); });
  // sweat drop (beside face, visible from front)
  const sweat = new THREE.Group(); torso.add(sweat); const dropM = fm(new THREE.SphereGeometry(0.5, 14, 10), C.sweat); const dropT = fm(new THREE.ConeGeometry(0.46, 0.9, 12), C.sweat); dropT.position.y = 0.55; dropM.add(dropT); sweat.add(dropM); sweat.visible = false;

  const parts = { body, eyes, arms, legs, torso, bounce, band, tails: tg, mouth };
  const dt = 1 / 30;
  function update(t, o = {}) {
    const action = o.action || 'idle', P = pose(t, action), Pm = pose(t - dt, action);
    const ex = EXPR[o.expr || P.mood] || EXPR.neutral, look = o.look || [P.lookX, P.lookY];
    const vy = (P.y - Pm.y) / dt, vz = (P.z - Pm.z) / dt;
    const sy = o.squash ?? P.sy, sxz = 1 / Math.sqrt(Math.max(0.3, sy));
    bounce.position.set(P.x, P.y, P.z); bounce.rotation.set(P.rx, P.ry, P.rz); torso.scale.set(sxz, sy, sxz);
    legs.scale.set(1, clamp(1 + (sy - 1) * 0.8, 0.6, 1.2), 1);
    LG.forEach((g, i) => { const lag = pose(t - 0.06 - 0.025 * i, action), w = (P.leg || 0.5), lv = (lag.y - P.y) * 0.1;
      g.rotation.x = -vy * 0.02 + 0.07 * Math.sin(t * 7 + i * 1.9) * w + lv; g.rotation.z = (i % 2 ? 1 : -1) * (0.05 + 0.5 * clamp(P.y / 4)) * (P.leg > 0.9 ? 1 : 0.3) + 0.04 * Math.sin(t * 5.3 + i * 2.3) * w;
      g.position.y = LEG + 0.4 + (P.liftIdx !== undefined && i === P.liftIdx ? 1.4 * P.liftAmt : 0); g.scale.y = 1 + 0.04 * Math.sin(t * 6 + i); });
    const setArm = (g, s, up, f) => { g.rotation.set(0, 0, 0); g.rotation.y = -s * f; g.rotation.z = s * (up - 0.5); g.position.set(s * (W / 2 - 0.2), 3.3, 1.5); };
    setArm(A.R, 1, P.aR, P.fR); setArm(A.L, -1, P.aL, P.fL);
    if (P.pointR) { const k = P.pointR; A.R.position.set(W / 2 - 0.2 - 0.9 * k, 3.3 - 0.4 * k, 1.5 + 2.2 * k); A.R.rotation.set(0, -2.0 * k, -0.2 * k + P.tap * 0.1); }
    // slot eyes
    const bl = o.blink ?? blinkAt(t), lx = clamp(look[0], -1, 1), ly = clamp(look[1], -1, 1);
    eyes.position.x = lx * 0.7; eyes.position.y = 3.95 + ly * 0.3;
    for (const k of ['L', 'R']) { const q = E[k], s = k === 'L' ? -1 : 1, arc = k === 'L' ? ex.arcL : ex.arcR, syk = (k === 'R' && ex.syR) ? ex.syR : ex.sy;
      q.slot.visible = arc < 0.5; q.arc.visible = arc >= 0.5;
      q.slot.scale.set(ex.sx, Math.max(0.07, syk * (1 - 0.93 * bl)), 0.4); q.arc.scale.set(ex.sx, ex.sx * 0.9 * (1 - 0.8 * bl), 0.5);
      q.e.rotation.z = -s * ex.tilt;
    }
    // morphy-clone: o.talk 0..1 = lip sync (VO loudness) → a filled mouth opens taller/wider; else the expression's mouth
    const tk = o.talk || 0, mk = tk > 0.12 ? 'talk' : (o.mouth || ex.mouth);
    for (const k in MS) MS[k].visible = k === mk; mouth.scale.set(1 + 0.05 * Math.sin(t * 5), 1, 1);
    if (tk > 0.12) mouth.scale.set(0.85 + 0.35 * tk, 0.25 + 1.05 * tk, 1);
    else if (mk === 'o') mouth.scale.setScalar(1 + 0.08 * Math.sin(t * 20));
    tails.forEach(({ s, segs }) => segs.forEach((g, i) => {
      const fl = Math.sin(t * 7.5 - i * 1.0 + s) * (0.1 + 0.05 * i);
      g.rotation.set(-0.15 - vy * 0.022 * (i + 1) * 0.6 + fl * (1 + clamp(Math.abs(vy) / 8)) - (i ? 0.2 : 0), (i ? 0 : -(0.55 + 0.55 * (s > 0 ? 1 : 0))) + Math.sin(t * 5 + i * 1.3 + s * 2) * 0.14 + vz * 0.01 * s, 0);
      g.rotation.x = clamp(g.rotation.x, -1.5, 1.2); }));
    const fk = 1 + 0.12 * Math.sin(t * 17) + 0.07 * Math.sin(t * 29 + 1); const fo = o.flame ?? 1; flame.visible = fo > 0.02; flame.scale.set(fo / Math.sqrt(fk), fo * fk, fo / Math.sqrt(fk));   // morphy-clone-02: o.flame 0..1 (power-down) flame.rotation.z = 0.08 * Math.sin(t * 9);
    const sw = o.sweat || 0; sweat.visible = sw > 0.01; if (sw > 0.01) { const f = fr(t * 0.9); sweat.position.set(W / 2 + 0.5, 6.4 - 1.5 * f, FZ - 0.6); sweat.scale.setScalar(sw * (1 - 0.3 * f) * 1.2); sweat.rotation.z = -0.3; }
  }
  const materials = []; group.traverse(m => m.isMesh && materials.push(m.material));
  update(0, {});
  return { group, update, parts, materials, COLORS: C };
}
