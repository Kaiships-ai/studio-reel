// c2_omniroute · "Two, OmniRoute." Fuel gauge hits LIMIT, the plumber's nozzle rig jumps to the next model,
// pull-out reveals 350+ nozzles, golden token coins pour in, a glowing fuel cell mounts on slot p2.
import { yawTo, THREE, V, W, ez, win, pulse, pop, pose, clawd, BL, plate, hsh, lerp, clamp, ss, seg, ring, step, camPath, shake } from './kit.js';
import { std, box, lbl } from '../set.js';

export default async function build(ctx) {
  const { car, driver, ch } = ctx;
  const T0 = ch.t0, T1 = ch.t1;
  const tOmni = W('p2a', 'OmniRoute.'), tLimit = W('p2b', 'limit'), tJump = W('p2b', 'jumps'), tNext = W('p2b', 'next');
  const tThree = W('p2b', 'three'), tFifty = W('p2b', 'fifty'), tBill = W('p2c', 'billion'), tFree = W('p2c', 'free'), tMonth = W('p2c', 'month.');
  const g = new THREE.Group();

  // ---------------- fuel gauge (right of the cockpit) with LIMIT plate
  const gauge = new THREE.Group(); gauge.position.set(0.58, 0, 0.5); g.add(gauge);
  const post = box(0.06, 0.66, 0.06, std('#2a2d33')); post.position.y = 0.33; gauge.add(post);
  const dial = new THREE.Group(); dial.position.y = 0.7; dial.scale.setScalar(0.55); gauge.add(dial);
  const fc = document.createElement('canvas'); fc.width = fc.height = 512; const fg = fc.getContext('2d');
  fg.fillStyle = '#fbf6ea'; fg.beginPath(); fg.arc(256, 256, 250, 0, 7); fg.fill();
  fg.lineWidth = 34; fg.strokeStyle = '#d23a2a'; fg.beginPath(); fg.arc(256, 256, 190, Math.PI * 0.75, Math.PI * 1.05); fg.stroke();
  fg.strokeStyle = '#3aa45a'; fg.beginPath(); fg.arc(256, 256, 190, Math.PI * 1.8, Math.PI * 2.25); fg.stroke();
  fg.strokeStyle = '#2b2622'; fg.lineWidth = 10;
  for (let i = 0; i <= 8; i++) { const a = Math.PI * 0.75 + i * Math.PI * 1.5 / 8; fg.beginPath(); fg.moveTo(256 + Math.cos(a) * 150, 256 + Math.sin(a) * 150); fg.lineTo(256 + Math.cos(a) * 225, 256 + Math.sin(a) * 225); fg.stroke(); }
  const ft = new THREE.CanvasTexture(fc); ft.colorSpace = THREE.SRGBColorSpace;
  const rimM = std('#1b1d22', { roughness: 0.4, metalness: 0.4 });
  const bez = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 40), rimM); bez.rotation.x = Math.PI / 2; dial.add(bez);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.27, 40), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.6 })); face.position.z = 0.032; dial.add(face);
  const needle = new THREE.Group(); needle.position.z = 0.04; dial.add(needle);
  const nm = box(0.03, 0.22, 0.01, std('#d23a2a', { emissive: '#d23a2a', emissiveIntensity: 0.3 })); nm.position.y = 0.1; needle.add(nm);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 16), rimM); hub.rotation.x = Math.PI / 2; needle.add(hub);
  const limitP = plate('LIMIT', { w: 0.34, h: 0.115, fg: '#ffffff', bg: '#d23a2a', px: 300 }); limitP.position.set(-0.05, 0.8, 0.04); gauge.add(limitP);   // orch r3: lower + toward the car (was under the title strip, off the right edge)

  // ---------------- the plumber on a crate, working the rig lever
  const crate = box(0.42, 0.38, 0.36, std('#8a5a34', { roughness: 0.85 })); crate.position.set(2.0, 0.19, -0.35); g.add(crate);
  const lever = new THREE.Group(); lever.position.set(1.77, 0.38, -0.35); g.add(lever);
  const lv = box(0.04, 0.4, 0.04, std('#c9ccd2', { metalness: 0.6, roughness: 0.3 })); lv.position.y = 0.2; lever.add(lv);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), std('#d23a2a')); knob.position.y = 0.42; lever.add(knob);
  const plumber = clawd(g, 'plumber-nod'); g.add(plumber.group);
  const PL_BLINK = BL(T0, T1, 2.7, 9);

  // ---------------- the nozzle rig: an overhead rail with N hoses, slides one notch on "jumps"
  const RAIL_Y = 1.5, RAIL_Z = 0.12, D = 0.42, N = 44, X0 = -0.1;
  const rig = new THREE.Group(); g.add(rig);
  const rail = box(D * N + 1, 0.08, 0.1, std('#3a3e46', { metalness: 0.5, roughness: 0.4 })); rail.position.set(X0 - D * N / 2 + 0.4, RAIL_Y + 0.06, RAIL_Z); g.add(rail);
  for (let i = 1; i < 12; i++) { const p = box(0.07, RAIL_Y + 0.1, 0.07, std('#3a3e46')); p.position.set(X0 + 0.5 - i * D * 4, (RAIL_Y + 0.1) / 2, RAIL_Z - 0.15); g.add(p); }
  const HOSE = ['#d97757', '#4a7bd0', '#3aa45a', '#8a5bd0', '#e0b030', '#2fa3a8', '#c94a7a'];
  const noz = [];
  for (let i = 0; i < N; i++) {
    const n = new THREE.Group(); rig.add(n);
    const col = HOSE[Math.floor(hsh(i, 5) * HOSE.length)];
    const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 10), std(col, { roughness: 0.5 })); hose.position.y = -0.5; n.add(hose);
    const head = new THREE.Group(); n.add(head);
    const hb = box(0.09, 0.14, 0.09, std('#2a2d33', { metalness: 0.3 })); head.add(hb);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.12, 10), std('#c9ccd2', { metalness: 0.6, roughness: 0.3 })); tip.position.y = -0.12; head.add(tip);
    const cap = box(0.1, 0.04, 0.1, std(col)); cap.position.y = 0.08; head.add(cap);
    noz.push({ n, hose, head, i });
  }
  const POD = V(-0.1, 0.42, 0.55);                                   // top of the left pod (world, car at origin)
  // gold coins = tokens
  const coinM = std('#f2c14e', { metalness: 0.8, roughness: 0.25, emissive: '#a07010', emissiveIntensity: 0.35 });
  const coins = []; for (let i = 0; i < 44; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.016, 20), coinM); g.add(c); coins.push(c); }
  // lens coins: burst from the pod toward the lens on "billion", passing to the sides (never over a face)
  const lensCoins = []; for (let i = 0; i < 12; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.016, 20), coinM); g.add(c); lensCoins.push(c); }
  // lens puffs: a sputter puff flies past the lens every ~0.4 s from "limit" to "jumps" (to the sides, never over a face)
  const lensPuffs = []; for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), std('#6b6b6b', { transparent: true, opacity: 0.55, roughness: 1 })); g.add(p); lensPuffs.push(p); }
  // smoke puffs (sputter)
  const puffs = []; for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), std('#6b6b6b', { transparent: true, opacity: 0.6, roughness: 1 })); g.add(p); puffs.push(p); }
  // plates
  const p350 = plate('350+', { w: 1.1, h: 0.46, fg: '#ffffff', bg: '#d97757', px: 330 }); p350.position.set(-0.55, 2.0, 0.9); g.add(p350);
  const pFree = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.135, 0.02), new THREE.MeshStandardMaterial({ map: lbl('free tokens / month', 2048, 328, 210, '#2b2622', '#f2c14e'), roughness: 0.7 })); pFree.position.set(0.33, 1.64, 3.6); g.add(pFree);
  const pBig = plate('1.5B', { w: 0.52, h: 0.22, fg: '#2b2622', bg: '#f2c14e', px: 330 }); pBig.position.set(0.33, 1.83, 3.6); g.add(pBig);

  // ---------------- fuel cell on slot p2 (left pod)
  const cell = new THREE.Group(); car.slot.p2.add(cell);
  const cellM = new THREE.MeshStandardMaterial({ color: '#7fe3ff', emissive: '#3fd0ff', emissiveIntensity: 1.2, roughness: 0.2, transparent: true, opacity: 0.9 });
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 24), cellM); core.rotation.z = Math.PI / 2; cell.add(core);
  for (const x of [-0.27, 0.27]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.05, 24), rimM); r.rotation.z = Math.PI / 2; r.position.x = x; cell.add(r); }
  const bolt = box(0.08, 0.02, 0.16, std('#f2c14e', { emissive: '#f2c14e', emissiveIntensity: 0.6 })); bolt.position.set(0, 0.0, 0.1); bolt.rotation.y = 0.5; cell.add(bolt);
  const glow = new THREE.PointLight('#5fd8ff', 0, 1.6, 2); cell.add(glow);
  function setCell(t, final) {
    car.slot.p2.visible = final || t >= tFree;
    const k = final ? 1 : pop(t, tFree, 3.4, 7);
    cell.scale.setScalar(Math.max(0.001, k));
    const fl = final ? 0 : pulse(t, tFree, 1.2, 0.5);
    cellM.emissiveIntensity = 1.0 + 0.15 * Math.sin(t * 5) + fl; glow.intensity = 1.2 + fl * 2;
  }

  let hero = null, dp = null;
  function update(t) {
    // gauge: pops in on OmniRoute, full → empty on limit → full on billion
    gauge.scale.setScalar(Math.max(0.001, pop(t, tOmni - 0.15, 3.2, 7)));
    const full = 1 - ez(t, tLimit, 0.35) + ez(t, tBill, 0.5);
    needle.rotation.z = lerp(Math.PI * 0.75, -Math.PI * 0.75, 0) + 0; // reset
    needle.rotation.z = lerp(Math.PI * 0.75, -Math.PI * 0.75, clamp(full)) + ring(t, tLimit + 0.35, { f: 6, d: 6, a: 0.25 }) + 0.18 * Math.sin(t * 31) * win(t, tLimit, tJump, 0.05, 0.1) + 0.03 * Math.sin(t * 40) * (t > tBill ? 1 : 0);
    const flash = t > tLimit && t < tBill ? 0.6 + 0.4 * Math.sin((t - tLimit) * 18) : 0;
    limitP.scale.setScalar(Math.max(0.001, 0.62 * (1 + 0.25 * pulse(t, tLimit, 1, 0.3) + 0.06 * flash) * (1 - ez(t, tLimit + 0.12, 0.2))));   // LIMIT leaves after its beat (no cut fragments later)
    limitP.rotation.z = 0.12 * ring(t, tLimit, { f: 5, d: 6 });
    dial.rotation.z = 0.08 * ring(t, tLimit + 0.05, { f: 7, d: 7 });

    // engine sputter between limit and jumps
    const sput = win(t, tLimit, tJump, 0.05, 0.15);
    car.body.position.y = sput * 0.02 * Math.abs(Math.sin(t * 47)) + 0.01 * pulse(t, tNext, 1, 0.3);
    car.body.rotation.x = sput * 0.02 * Math.sin(t * 33);
    puffs.forEach((p, i) => { const t0 = tLimit + 0.1 + i * 0.12, u = seg(t, t0, t0 + 0.8);
      p.visible = u > 0 && u < 1 && t < tJump + 0.5; p.position.set(-1.25 - u * 0.5, 0.35 + u * 0.5, 0.1 * (hsh(i, 3) - 0.5)); p.scale.setScalar(0.5 + u * 1.4); p.material.opacity = 0.6 * (1 - u); });

    // rig: rail slides one notch on "jumps" (swing), and a little shimmy on "next"
    const shift = D * step(t, tJump + 0.12, 2.6, 6.5);
    rig.position.set(shift, 0, 0); rig.rotation.x = 0.06 * ring(t, tJump + 0.12, { f: 3, d: 5 });
    for (const z of noz) {
      const x = X0 - z.i * D + shift, active = z.i === 0 ? t < tJump + 0.05 : z.i === 1 ? t >= tJump + 0.3 : false;
      let hang = 0.55 + 0.05 * Math.sin(t * 2.2 + z.i);                 // hose length when idle
      let px = X0 - z.i * D, py = RAIL_Y, pz = RAIL_Z, rx = 0, rz = 0.05 * Math.sin(t * 1.7 + z.i * 0.7);
      if (z.i === 0) {                                                 // empty nozzle: plugged in, sputters, pops off on "jumps"
        hang = RAIL_Y - POD.y - 0.05;
        if (t > tLimit) rz += 0.15 * Math.sin(t * 40) * sput;
        const u = seg(t, tJump, tJump + 0.9);
        if (u > 0) { hang = lerp(hang, 0.3, ez(t, tJump, 0.08)); px -= 0; py += 1.6 * u - 2.4 * u * u + 0.9 * u; pz += 0.9 * u; rz += 9 * u; rx = 4 * u; }
        z.n.visible = u < 1;
      } else if (z.i === 1) {                                          // next nozzle clicks in
        const k = step(t, tJump + 0.3, 4, 7);
        hang = lerp(hang, RAIL_Y - POD.y - 0.05, clamp(k, 0, 1.15));
      }
      // the plugged nozzle angles forward into the side pod (slot p2, z 0.55), clear of the driver's head
      let plug = 0;
      if (z.i === 0) plug = 1 - ez(t, tJump, 0.08); else if (z.i === 1) plug = clamp(step(t, tJump + 0.3, 4, 7), 0, 1);
      let qa = null;
      if (plug > 0) { px -= 1.0 * plug; pz = lerp(pz, POD.z + 0.2, plug); const dir = POD.clone().add(V(0, -0.1, 0.15)).sub(V(px, py, pz)); hang = lerp(hang, dir.length() - 0.08, plug); qa = new THREE.Quaternion().setFromUnitVectors(V(0, -1, 0), dir.normalize()); }
      z.n.position.set(px, py, pz); z.n.rotation.set(rx, 0, rz); if (qa) z.n.quaternion.slerp(qa, plug);   // comes in from the left, outside the driver's head
      z.hose.scale.y = hang; z.hose.position.y = -hang / 2; z.head.position.y = -hang - 0.07;
      // far nozzles bob in a wave on "three hundred fifty"
      if (z.i > 1) z.head.position.y += 0.14 * Math.sin((t - tThree) * 11 - z.i * 0.5) * win(t, tThree, T1, 0.2, 0.4);
      if (z.i > 1) { const tp = tThree + (z.i - 2) * 0.035; z.head.scale.setScalar(1 + 0.9 * pulse(t, tp, 1, 0.22)); z.head.rotation.y = 6.28 * ez(t, tp, 0.3); }   // nozzles pop in sequence along the row
      void x; void active;
    }

    // coins: from far along the rail, down the active hose into the pod (billion → end)
    const top = V(X0, RAIL_Y, RAIL_Z);
    coins.forEach((c, i) => {
      const t0 = tBill - 0.25 + i * 0.03, u = (t - t0) / 0.6;
      c.visible = u > 0 && u < 1 && t < T1 - 0.1;
      if (!c.visible) return;
      const far = V(X0 - 3.5, RAIL_Y + 0.1, RAIL_Z);
      const p = u < 0.55 ? far.clone().lerp(top, u / 0.55).add(V(0, 0.08 * Math.sin(u * 20 + i), 0)) : top.clone().lerp(POD, (u - 0.55) / 0.45);
      p.z += 0.12 + 0.05 * (hsh(i, 11) - 0.5);
      c.position.copy(p); c.rotation.set(Math.PI / 2 + t * 6 + i, t * 3, 0);
    });

    // lens coins fly at the camera, offset sideways
    const cp = cam(t).pos;
    lensPuffs.forEach((p, i) => {
      const t0 = tLimit + 0.05 + i * 0.4, u = (t - t0) / 0.45;
      p.visible = u > 0 && u < 0.9 && t < tJump + 0.6;
      if (!p.visible) return;
      const side = i % 2 ? 1 : -1, end = cp.clone().add(V(side * 0.4, -0.15, -0.5));
      p.position.copy(V(-0.6, 0.45, 0.4).lerp(end, u * u)); p.scale.setScalar(0.6 + 1.6 * u); p.material.opacity = 0.55 * (1 - u);
    });
    lensCoins.forEach((c, i) => {
      const t0 = tBill + i * 0.04, u = (t - t0) / 0.5;
      c.visible = u > 0 && u < 0.92;
      if (!c.visible) return;
      const side = i % 3 ? -1 : 1, end = cp.clone().add(V(side * (0.35 + 0.2 * hsh(i, 7)), -0.3 - 0.2 * hsh(i, 9), -0.6));   // low + mostly left: never over the plate text
      const p = POD.clone().add(V(0, 0.3, 0)).lerp(end, u * u); p.y += 0.5 * Math.sin(u * Math.PI);
      c.position.copy(p); c.rotation.set(t * 9 + i, t * 5, 0);
    });

    // plates
    p350.scale.setScalar(Math.max(0.001, pop(t, tThree, 3.0, 6.5) * (1 + 0.22 * pulse(t, tFifty, 1, 0.3) + 0.22 * pulse(t, tProv, 1, 0.3) + 0.15 * pulse(t, W('p2b', 'hundred'), 1, 0.25)) * (1 - ez(t, W('p2c', 'Up'), 0.25))));
    p350.rotation.z = -0.06 + 0.04 * Math.sin(t * 2);
    pFree.scale.setScalar(Math.max(0.001, pop(t, tFree + 0.1, 3.2, 7) * (1 - ez(t, tEvery - 0.05, 0.2))));
    pFree.rotation.z = 0.03 * Math.sin(t * 2.3);
    pBig.scale.setScalar(Math.max(0.001, pop(t, tFree + 0.05, 3.2, 7) * (1 - ez(t, tEvery - 0.05, 0.2)))); pBig.rotation.z = -0.04 + 0.03 * Math.sin(t * 2);

    setCell(t, false);

    // plumber: on the crate, yanks the lever on "jumps", nods on "three", cheers on "free"
    const yank = ez(t, tJump - 0.12, 0.12) * (1 - ez(t, tJump + 0.5, 0.3));
    lever.rotation.z = -0.6 * yank;
    const PLP = V(2.0, 0.38, -0.35);
    const pp = pose(plumber, t, { pos: PLP, yaw: yawTo(PLP, cam(t).pos),
      hops: [[tJump - 0.05, tJump + 0.3, 0.12], [tThree, tThree + 0.28, 0.08], [tFree, tFree + 0.32, 0.14]],
      armR: Math.max(yank, ez(t, tFree, 0.15)), armL: ez(t, tFree, 0.15) * 0.8, bow: 0.15 * pulse(t, tFifty, 1, 0.35) + 0.1 * yank,
      expr: t > tFree ? 'happy' : t > tLimit && t < tJump ? 'worried' : 'neutral', blinkTimes: PL_BLINK, seed: 4, look: [0.6, 0.2] });
    pp.c = plumber;

    // driver: neutral → wide on limit (sputter jolts) → happy on free
    const jolt = sput * 0.006 * Math.abs(Math.sin(t * 47)) + 0.15 * ez(t, tLimit, 0.15) * (1 - ez(t, tBill, 0.4));   // panic: half-stands on limit, sinks back on billion
    dp = pose(driver, t, { pos: car.g.localToWorld(car.seat.clone()).add(V(0, jolt, 0)), yaw: yawTo(car.g.localToWorld(car.seat.clone()), cam(t).pos),
      expr: t > tFree ? 'happy' : t > tLimit ? 'wide' : 'neutral', hops: [[tLimit + 0.02, tLimit + 0.22, 0.05], [tFree, tFree + 0.3, 0.07]],
      armL: ez(t, tFree, 0.15), armR: ez(t, tFree + 0.05, 0.15), roll: 0.1 * ring(t, tLimit, { f: 3, d: 5 }), look: [-0.4, 0.2], blinkTimes: BL(T0, T1, 2.9, 6), seed: 2 });
    dp.c = driver; ctx.driverPose = dp;
    hero = (t > tJump + 0.25 && t < W('p2b', 'best') + 0.05) ? pp : dp;   // plumber only in his MED shot
  }

  // v2 ADHD camera: one beat per word, ECU <-> WIDE every <= 2 s, live holds (dolly/orbit), shakes on hits
  const tWhen = W('p2b', 'When'), tAcross = W('p2b', 'across'), tTok = W('p2c', 'tokens,'), tTwo = W('p2a', 'Two,'), tOut = W('p2b', 'out,'), tBest = W('p2b', 'best'), tProv = W('p2b', 'providers.'), tOne = W('p2c', 'one'), tEvery = W('p2c', 'every');
  const K = [
    { t: T0, pos: V(1.6, 1.8, 7.8), tgt: V(-0.2, 0.95, 0.5), fov: 42, dolly: 3.0, orbit: 0.6 },                     // WIDE rig (Two)
    { t: tOmni - 0.12, d: 0.28, pos: V(1.35, 0.95, 1.65), tgt: V(0.55, 0.69, 0.5), fov: 34, dolly: 0.15, orbit: 0.25 },   // orch: crash zoom CU gauge + LIMIT (driver eyes are at the rim until 'limit')   // crash zoom CU gauge + driver eyes (front-right, high)
    { t: tWhen, d: 0.3, pos: V(0.95, 0.9, 1.75), tgt: V(0.42, 0.62, 0.4), fov: 34, roll: 0.07, dolly: 0.15, orbit: 0.3 },   // When: slide round the gauge
    { t: tLimit, d: 0.2, pos: V(0.0, 0.9, 2.0), tgt: V(0.12, 0.6, 0.25), fov: 38, roll: -0.2, dolly: 0.4 },   // orch: left of the gauge so it can't hide the lifting driver        // needle drops: dutch roll
    { t: tOut - 0.05, d: 0.22, pos: V(-0.1, 0.8, 1.75), tgt: V(0.07, 0.55, 0.19), fov: 35, dolly: 0.08, orbit: 0.15 },   // orch: eye-level-ish ECU (eyes ≈ y 0.56 with the panic lift)  // ECU driver wide eyes, looking down into cockpit
    { t: tJump - 0.05, d: 0.28, pos: V(2.3, 1.25, 3.6), tgt: V(1.85, 0.86, -0.35), fov: 38, orbit: -0.8 },            // whip to MED plumber + swing
    { t: tBest - 0.05, d: 0.45, pos: V(0.2, 1.2, 2.2), tgt: V(0.12, 0.6, 0.19), fov: 36, dolly: 0.9 },                // push-through the rig toward the driver
    { t: tAcross - 0.03, d: 0.35, pos: V(0.5, 1.8, 3.2), tgt: V(0.02, 0.85, 0.35), fov: 40, orbit: -0.4 },          // across: whip along the nozzle rig
    { t: tThree - 0.08, d: 0.4, pos: V(1.2, 2.9, 8.8), tgt: V(-0.3, 1.05, 0.3), fov: 44, dolly: 3.0, orbit: 0.35 },                // pull back WIDE row (350+)
    { t: tProv - 0.05, d: 0.6, pos: V(-0.3, 2.0, 6.6), tgt: V(-0.35, 1.0, 0.3), fov: 42, orbit: -0.95, dolly: 2.0 },     // lateral track along the row
    { t: tOne - 0.08, d: 0.4, pos: V(0.3, 0.85, 1.95), tgt: V(0.2, 0.55, 0.2), fov: 36, orbit: 0.3 },   // orch: from the gauge-free side                  // orbit in CU (driver + pod)
    { t: tFree - 0.06, d: 0.26, pos: V(0.6, 1.62, 8.0), tgt: V(0.3, 1.3, 3.6), fov: 34, dolly: 1.3, orbit: 0.12 },               // crash zoom on the 1.5B plate
    { t: tTok - 0.03, d: 0.25, pos: V(0.45, 1.5, 7.2), tgt: V(0.3, 1.26, 3.6), fov: 36, roll: -0.06, dolly: 1.1 },   // tokens: punch on the plate
    { t: tEvery - 0.05, d: 0.5, pos: V(1.6, 1.5, 6.4), tgt: V(0.1, 0.75, 0.4), fov: 38, dolly: 1.0, orbit: 0.5 },     // fuel cell mounts, pull out
  ];
  function cam(t) {
    const c = camPath(t, K);
    c.tgt.add(shake(t, [tLimit, tOut, tJump + 0.3, tBill, tFree], 0.035));
    const onPlate = win(t, tFree - 0.1, tEvery, 0.1, 0.2);
    return { pos: c.pos, tgt: c.tgt, fov: c.fov, roll: c.roll, focus: c.tgt.clone().lerp(V(0.36, 1.72, 3.6), onPlate), aperture: 0.5 };
  }

  const cues = [
    { t: tOmni - 0.15, kind: 'pop', note: 'fuel gauge pops in' },
    { t: tLimit, kind: 'needle', note: 'needle drops to LIMIT' },
    { t: tLimit + 0.08, kind: 'sputter', note: 'engine sputters' },
    { t: tLimit + 0.45, kind: 'sputter', note: 'puff past the lens' },
    { t: tJump, kind: 'pop', note: 'empty nozzle pops off' },
    { t: tJump + 0.3, kind: 'clunk', note: 'next nozzle clicks in' },
    { t: tOmni - 0.12, kind: 'whoosh', note: 'crash zoom on gauge' },
    { t: tOut - 0.05, kind: 'whoosh', note: 'snap to driver' },
    { t: tJump - 0.05, kind: 'whoosh', note: 'whip to plumber' },
    { t: tBest - 0.05, kind: 'whoosh', note: 'push through the rig' },
    { t: tThree - 0.08, kind: 'whoosh', note: 'pull-out reveals the nozzle row' },
    { t: tOne - 0.08, kind: 'whoosh', note: 'orbit in' },
    { t: tBill, kind: 'impact', note: 'coins burst at the lens' },
    { t: tFree - 0.06, kind: 'whoosh', note: 'crash zoom on 1.5B plate' },
    { t: tAcross - 0.03, kind: 'whoosh', note: 'whip along the rig' },
    { t: tEvery - 0.05, kind: 'whoosh', note: 'pull out' },
    { t: tThree, kind: 'pop', note: '350+ plate' },
    { t: tThree, kind: 'click', note: 'nozzles pop in sequence along the row' },
    { t: tFifty, kind: 'pop', note: '350+ punch' },
    { t: tProv, kind: 'pop', note: '350+ punch' },
    { t: tBill - 0.25, kind: 'coins', note: 'token coins pour through the hose' },
    { t: tFree, kind: 'glow', note: 'fuel cell mounts + 1.5B plate' },
  ];

  return { group: g, update, final(t) { setCell(t, true); }, cam, hero: () => hero, cues };
}
