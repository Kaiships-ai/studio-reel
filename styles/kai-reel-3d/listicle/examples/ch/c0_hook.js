// c0_hook · 0.00–4.10 · "Don't start vibe coding with Claude Code until you've installed these four plugins."
// Car already revving under the gantry → referee hops in, red card on "start" → engine cuts on "until" → car reverses into the
// pit box on "installed" → 4 crew slam 4 glowing crates (1 2 3 4) from "four" to "plugins".
import { THREE, V, W, ez, pulse, pop, pose, clawd, BL, plate, hsh, lerp, clamp, ring, yawTo, camPath, shake } from './kit.js';
import { std, box, PIT } from '../set.js';

export default async function build(ctx) {
  const { S, SET, car, driver } = ctx;
  const group = new THREE.Group();
  const T_DONT = W('hook', "Don't"), T_START = W('hook', 'start'), T_UNTIL = W('hook', 'until'),
    T_INST = W('hook', 'installed'), T_FOUR = W('hook', 'four'), T_PLUG = W('hook', 'plugins');
  const T_COD = W('hook', 'coding'), T_CLA = W('hook', 'Claude');
  const SLAM = [0, 1, 2, 3].map(i => lerp(T_FOUR, T_PLUG, i / 3));
  const GRID = V(0.7, 0, PIT.laneZ - 0.2);                 // car on the pit-exit line, nose under the gantry
  const HOME = V(0, 0, 0);

  // referee
  const ref = clawd(S.scene, 'referee'); group.add(ref.group);
  const REF_BL = BL(0, 4.1, 2.6, 11);
  const card = box(0.2, 0.28, 0.02, std('#e3241b', { emissive: new THREE.Color('#ff2a1a'), emissiveIntensity: 0.6 })); group.add(card);
  const whistle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.06, 10), std('#d6d9de', { metalness: 0.7, roughness: 0.25 }));
  whistle.rotation.z = Math.PI / 2; group.add(whistle);

  const barM = std('#1b1d22'); const bar = box(0.62, 0.1, 0.06, barM); group.add(bar);
  const bulbs = [0, 1, 2, 3, 4].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshStandardMaterial({ color: '#2a0d0d', emissive: new THREE.Color('#ff2a1a'), emissiveIntensity: 0 })); group.add(m); return m; });
  // smoke puffs behind the rear wheels
  const smokeM = new THREE.MeshStandardMaterial({ color: '#d9d4cc', roughness: 1, transparent: true, opacity: 0.7, depthWrite: false });
  const puffs = Array.from({ length: 14 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), smokeM.clone()); group.add(m); return m; });

  const lensPuff = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), smokeM.clone()); group.add(lensPuff);
  const sparkM = new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: new THREE.Color('#ffb02a'), emissiveIntensity: 3 });
  const sparks = Array.from({ length: 40 }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), sparkM); group.add(m); return m; });
  const revPuff = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), smokeM.clone()); group.add(revPuff);
  // crew + crates
  const CREW_X = [-0.78, -0.26, 0.26, 0.78], CREW_Z = 0.95, CRATE_Z = 1.9;
  const crew = CREW_X.map(() => { const c = clawd(S.scene, ''); group.add(c.group); return c; });
  const CREW_BL = CREW_X.map((_, i) => BL(0, 4.1, 2.4, 20 + i));
  const crates = CREW_X.map((x, i) => {
    const g = new THREE.Group();
    const b = box(0.28, 0.2, 0.24, std('#f08a3c', { emissive: new THREE.Color('#ff8a2a'), emissiveIntensity: 0.3, roughness: 0.5 }));
    b.position.y = 0.1; g.add(b);
    const n = plate(String(i + 1), { w: 0.22, h: 0.17, px: 820, bg: '#fffdf8', fg: '#2b2622' }); n.position.set(0, 0.1, 0.13); g.add(n);
    const glow = new THREE.PointLight('#ff9a3a', 0, 1.2, 2); glow.position.set(0, 0.35, 0.2); g.add(glow); g.userData.glow = glow;
    group.add(g); return g; });

  let heroP = null, heroC = ref;
  function carPos(t) {
    const k = ez(t, T_INST, 0.62);                         // reverse into the box
    return new THREE.Vector3().lerpVectors(GRID, HOME, k);
  }

  function update(t) {
    // ---- car: revving → engine cut → reverse
    const rev = 1 - ez(t, T_UNTIL, 0.12);
    const p = carPos(t); car.g.position.copy(p);
    const back = ez(t, T_INST, 0.62) - ez(t - 0.0001, T_INST, 0.62);
    car.body.position.y = rev * 0.008 * Math.sin(t * 95) + pulse(t, T_UNTIL, -0.02, 0.3) + pulse(t, T_INST + 0.62, 0.015, 0.3);
    car.body.rotation.z = rev * (0.012 + 0.006 * Math.sin(t * 41)) + 0.03 * ring(t, T_UNTIL, { f: 3, d: 6 }) - ring(t, T_INST + 0.6, { f: 3, d: 7, a: 0.03 });
    const spinR = rev * t * 45 + (t > T_UNTIL ? 0 : 0);
    const roll = (GRID.x - p.x) / 0.24;                      // reverse roll angle (positive = backward)
    car.wheels.forEach((w, i) => { w.rotation.z = (i >= 2 ? -spinR : 0) + roll; });
    car.g.updateMatrixWorld(true);

    SET.gantry.g.visible = false;                         // the hanging lamp bar stands in for it (no pole in the foreground)
    // ---- gantry: lamps light one by one while it revs, out when the engine cuts
    const C = cam(t), fwd = C.tgt.clone().sub(C.pos).normalize(), rgt = new THREE.Vector3().crossVectors(fwd, V(0, 1, 0)).normalize(), upv = new THREE.Vector3().crossVectors(rgt, fwd);
    const barOut = ez(t, T_INST - 0.2, 0.4), bc = C.pos.clone().add(fwd.clone().multiplyScalar(2)).add(upv.clone().multiplyScalar(0.36 + 0.5 * barOut));
    bar.position.copy(bc); bar.lookAt(C.pos); bar.position.add(V(0, 0.01 * Math.sin(t * 60) * (1 - ez(t, T_UNTIL, 0.1)), 0));
    for (let i = 0; i < 5; i++) { const k = ez(t, 0.02 + i * 0.32, 0.12) * (1 - ez(t, T_UNTIL, 0.1)); SET.gantry.set(i, k);
      bulbs[i].position.copy(bar.position).add(rgt.clone().multiplyScalar(-0.24 + i * 0.12)).add(C.pos.clone().sub(bar.position).normalize().multiplyScalar(0.04));
      bulbs[i].material.emissiveIntensity = (0.2 + 5 * k) * (1 - 0.7 * pulse(t, T_COD + 0.12 + 0.11 * ((i * 3) % 5), 1, 0.16)); bulbs[i].scale.setScalar(1 + 0.35 * pulse(t, 0.02 + i * 0.32, 1, 0.25)); }

    // ---- smoke: puffs stream back from the rear wheels, stop + fade on "until"
    const rear = car.g.localToWorld(V(-1.0, 0.1, 0));
    puffs.forEach((m, i) => {
      const per = 0.55, ph = ((t + i * per / puffs.length * 2) % per) / per, side = i % 2 ? 1 : -1;
      const born = t - ph * per; const alive = born < T_UNTIL ? 1 : 0;
      const fade = 1 - ez(t, T_UNTIL, 0.4);
      m.position.set(rear.x + 0.4 + ph * 2.0, 0.2 + ph * 1.0 + hsh(i, 3) * 0.08, rear.z - 0.55 + side * 0.2 - ph * 0.2);
      const s = (0.8 + ph * 2.4) * (0.8 + 0.4 * hsh(i, 5));
      m.scale.setScalar(s); m.material.opacity = 0.9 * (1 - ph) * fade * alive; m.visible = m.material.opacity > 0.01;
    });

    // ---- referee: springs in front of the nose, card up on "start", steps aside on "installed"
    const nose = car.g.localToWorld(V(2.05, 0, 0.25));
    const land = V(GRID.x + 1.8, 0, GRID.z + 1.3);
    const k0 = ez(t, -0.15, T_START + 0.15);
    const kx = ez(t, T_UNTIL + 0.05, 0.9);                   // exits left after "until", still facing camera
    const rpos = new THREE.Vector3(lerp(land.x + 0.45, land.x, k0) - 4.2 * kx, 0, lerp(land.z - 0.3, land.z, k0) + 0.6 * kx);
    const yawR = yawTo(rpos, C.pos) + 0.15 * Math.sin(t * 7) * (1 - ez(t, T_START, 0.2));
    const cardUp = ez(t, T_START, 0.1) * (1 - ez(t, T_FOUR - 0.1, 0.25));
    const rp = pose(ref, t, { pos: rpos, yaw: yawR, hops: [[-0.2, T_START, 0.3], [T_UNTIL - 0.05, T_UNTIL + 0.2, 0.06], [T_UNTIL + 0.25, T_UNTIL + 0.5, 0.1], [T_UNTIL + 0.55, T_UNTIL + 0.8, 0.1]],
      armR: cardUp, armL: 0.25 * pulse(t, T_START, 1, 0.5), expr: t > T_START ? 'squint' : 'wide', look: [-0.6, 0], blinkTimes: REF_BL, seed: 4,
      sq: pulse(t, T_START, 0.08, 0.3), bow: -0.12 * pulse(t, T_START, 1, 0.5) });
    const fw = V(Math.sin(yawR), 0, Math.cos(yawR)), rt = V(Math.cos(yawR), 0, -Math.sin(yawR));
    const cp = rp.top.clone().add(rt.clone().multiplyScalar(0.3)).add(V(0, -0.02 + 0.14 * cardUp, 0)).add(fw.clone().multiplyScalar(0.06));
    card.position.copy(cp); card.rotation.set(0.25 * Math.sin(t * 17) * cardUp, yawR + 0.3 * Math.sin(t * 11) * cardUp, ring(t, T_START, { f: 5, d: 8, a: 0.4 }) + 0.25 * Math.sin(t * 23) * cardUp);
    const ck = pop(t, T_START, 4, 8) * (1 - ez(t, T_FOUR - 0.1, 0.25)); card.scale.setScalar(Math.max(0.001, ck)); card.visible = ck > 0.01;
    whistle.position.copy(rp.face).add(fw.clone().multiplyScalar(0.03)).add(V(0, -0.07, 0)).add(rt.clone().multiplyScalar(-0.06));
    whistle.rotation.set(0, yawR, Math.PI / 2); whistle.visible = t > T_START - 0.1 && t < T_INST;

    // ---- driver flinch (rides the car)
    const seatW = car.g.localToWorld(car.seat.clone()); const dp = pose(driver, t, { pos: seatW, yaw: lerp(Math.PI / 2, yawTo(seatW, C.pos), 0.6 * ez(t, T_START, 0.15) + 0.4 * ez(t, T_UNTIL - 0.1, 0.15)), expr: t > T_START ? 'wide' : 'happy',
      bow: -0.55 * pulse(t, T_START + 0.04, 1, 0.55), sq: pulse(t, T_START + 0.04, -0.25, 0.35) + rev * 0.01 * Math.sin(t * 95),
      hops: [[T_START + 0.02, T_START + 0.3, 0.12]],
      look: [0.4, 0], blinkTimes: [2.6], seed: 2 });

    // ---- crew drop in after "installed", lift crates, slam one per beat
    let lastCrew = -1;
    crew.forEach((c, i) => {
      const tin = T_INST + 0.12 + i * 0.07, ts = SLAM[i];
      const fall = 1 - ez(t, tin, 0.18);
      const cp2 = pose(c, t, { pos: V(CREW_X[i], 1.6 * fall * fall, CREW_Z), yaw: yawTo(V(CREW_X[i], 0, CREW_Z), C.pos), hops: [[ts - 0.22, ts, 0.12], ...[0, 1, 2].map(k => { const h = T_PLUG + 0.2 + i * 0.07 + k * 0.24; return [h, h + 0.22, 0.24]; })],   // staggered cheer hops
        armL: (1 - ez(t, ts, 0.06)) * ez(t, tin, 0.2), armR: (1 - ez(t, ts, 0.06)) * ez(t, tin, 0.2),
        sq: pulse(t, tin + 0.18, -0.2, 0.25) + pulse(t, ts, -0.12, 0.25), expr: t > ts ? 'wide' : 'neutral', blinkTimes: CREW_BL[i], seed: i });
      c.group.visible = t > tin - 0.02;
      const g = crates[i];
      const held = V(CREW_X[i], cp2.top.y + 0.04, CREW_Z + 0.08);
      const down = V(CREW_X[i] * 0.8, 0, CRATE_Z);
      const ks = ez(t, ts - 0.05, 0.05);
      g.position.lerpVectors(held, down, ks); g.position.y += ks < 1 ? 0 : 0;
      const sl = pulse(t, ts, 1, 0.25);
      const seq = [0, 1, 2, 3, 4].reduce((a, k) => a + pulse(t, T_PLUG + 0.15 + (k * 4 + i) * 0.07, 1, 0.22), 0);   // glow pulse runs along the row
      const big = (1 + 0.4 * ks) * (1 + 0.08 * seq);                               // crates grow as they land (payoff read)
      g.scale.set(big * (1 + 0.18 * sl), big * (1 - 0.25 * sl), big * (1 + 0.18 * sl));
      g.rotation.set(0, 0.06 * (hsh(i, 9) - 0.5) + 0.12 * ring(t, ts, { f: 4, d: 9 }), 0);
      g.visible = t > tin - 0.02;
      g.userData.glow.intensity = t > ts ? 0.5 + 1.2 * pulse(t, ts, 1, 0.4) + 2.0 * seq : 0.1;
      if (t > tin) lastCrew = i; if (i === 1) { heroC = c; heroP = cp2; }
    });
    if (t < T_UNTIL - 0.1) { heroC = ref; heroP = rp; } else if (t < T_INST + 0.3) { heroC = driver; heroP = dp; }
    // sparks: 10 per crate slam, burst from the crate toward/past the lens edges (never through the centre where faces sit)
    sparks.forEach((m, j) => {
      const ci = j % 4, ts = SLAM[ci], age = t - ts, life = 0.7;
      m.visible = age > 0 && age < life; if (!m.visible) return;
      const k = age / life, o = crates[ci].position, side = hsh(j, 1) < 0.5 ? -1 : 1;
      const toward = C.pos.clone().sub(o).multiplyScalar(0.55 * k);
      m.position.copy(o).add(toward).add(rgt.clone().multiplyScalar(side * (0.3 + 1.2 * k) * (0.6 + hsh(j, 2)))).add(V(0, 0.15 + 1.4 * k * (0.5 + hsh(j, 3)) - 2.2 * k * k, 0));
      m.rotation.set(t * 9 + j, t * 7, 0); m.scale.setScalar((1 - k) * (0.8 + hsh(j, 4)));
    });
    // reverse smoke rolling at the lens (2.5–3.0) and a whistle puff after "start"
    { const a = clamp((t - T_INST - 0.1) / 0.7); revPuff.visible = a > 0 && a < 1;
      revPuff.position.copy(C.pos).add(fwd.clone().multiplyScalar(1.6 - 0.9 * a)).add(rgt.clone().multiplyScalar(0.45 + 0.2 * a)).add(upv.clone().multiplyScalar(-0.5 + 0.1 * a));
      revPuff.scale.setScalar(1 + 3 * a); revPuff.material.opacity = 0.7 * (1 - a); }
    // smoke puff blown across the lens on "until" (side of frame, never over the face)
    const pk = clamp((t - T_UNTIL) / 0.5); lensPuff.visible = pk > 0 && pk < 1;
    lensPuff.position.copy(C.pos).add(fwd.clone().multiplyScalar(0.9 - 0.3 * pk)).add(rgt.clone().multiplyScalar(-0.55 + 0.2 * pk)).add(upv.clone().multiplyScalar(-0.3 + 0.15 * pk));
    lensPuff.scale.setScalar(0.6 + 1.6 * pk); lensPuff.material.opacity = 0.75 * (1 - pk);
  }

  function final() { SET.gantry.off(); SET.gantry.g.visible = true; }

  // camera v2 (ADHD): moving from frame 0, a beat per word, ECU <-> WIDE alternation, jolts on every hit
  const K = [
    { t: -1, pos: V(6.4, 1.9, 6.4), tgt: V(1.9, 0.3, 1.8), fov: 42 },                                    // MED car + referee (opening framing)
    { t: T_DONT, d: 0.3, pos: V(4.6, 0.9, 4.6), tgt: V(2.3, 0.35, 1.9), fov: 34, roll: 0.07, orbit: 0.3 },  // f0 crash zoom CU nose + referee, smoke behind
    { t: T_START - 0.14, d: 0.26, pos: V(3.55, 0.8, 4.45), tgt: V(2.8, 0.38, 2.42), fov: 36, roll: -0.04, dolly: 0.5, orbit: 0.55 }, // whip ECU referee + card
    { t: T_COD, d: 0.28, pos: V(6.8, 2.0, 6.2), tgt: V(1.9, 0.25, 1.8), fov: 40, orbit: -0.7 },           // fast pull-back MED
    { t: T_CLA, d: 0.36, pos: V(2.8, 1.4, 6.9), tgt: V(2.0, 0.25, 1.8), fov: 38, roll: -0.05 },            // fast orbit round the nose
    { t: T_UNTIL - 0.08, d: 0.2, pos: V(2.1, 0.8, 2.3), tgt: V(0.9, 0.46, 1.05), fov: 34, dolly: 0.3 }, // snap-push ECU driver flinch
    { t: T_UNTIL + 0.36, d: 0.45, pos: V(2.2, 3.4, 7.6), tgt: V(0.3, 0.1, 1.0), fov: 42, dolly: 1.2, orbit: -0.6 },              // crane up WIDE, car reverses
    { t: T_FOUR - 0.08, d: 0.16, pos: V(-0.8, 0.7, 4.3), tgt: V(-0.55, 0.28, 1.55), fov: 44, roll: 0.05 },   // low crash zoom on crate 1
    { t: SLAM[1] - 0.03, d: SLAM[3] - SLAM[1] + 0.06, pos: V(0.1, 1.5, 6.3), tgt: V(0.1, 0.28, 1.5), fov: 59, dolly: 0.6, orbit: 0.2 }, // fast low track across the row, lands on 1 2 3 4
  ];
  const JOLT = [T_START, T_UNTIL, ...SLAM];
  function cam(t) {
    const c = camPath(t, K);
    const tgt = c.tgt.clone().add(shake(t, JOLT, 0.05));
    const focus = heroP ? heroP.face.clone() : tgt;
    return { pos: c.pos, tgt, fov: c.fov, roll: c.roll, focus, aperture: 0.45 };
  }
  function hero(t) { return heroP ? { c: heroC, face: heroP.face, top: heroP.top, sq: heroP.sq, blink: heroP.blink } : null; }

  const cues = [
    { t: 0, kind: 'rev', note: 'engine revving under the gantry' },
    ...[0, 1, 2, 3, 4].map(i => ({ t: 0.02 + i * 0.32, kind: 'click', note: `gantry lamp ${i + 1}` })),
    { t: T_DONT, kind: 'whoosh', note: 'referee springs in' },
    { t: T_DONT, kind: 'whoosh', note: 'f0 crash zoom on the rear wheel' },
    { t: T_START - 0.14, kind: 'whoosh', note: 'whip to referee' },
    { t: T_COD, kind: 'whoosh', note: 'pull-back' },
    { t: T_CLA, kind: 'whoosh', note: 'orbit round the nose' },
    { t: T_UNTIL, kind: 'whoosh', note: 'snap-push to driver' },
    { t: T_FOUR - 0.05, kind: 'whoosh', note: 'crash zoom crates' },
    { t: T_START, kind: 'whistle', note: 'whistle + red card' },
    { t: T_UNTIL, kind: 'impact', note: 'engine cut' },
    { t: T_INST, kind: 'whoosh', note: 'car reverses into the box' },
    { t: T_INST + 0.15, kind: 'land', note: 'crew drop in' },
    ...SLAM.map((s, i) => ({ t: s, kind: 'impact', note: `crate ${i + 1} slams down` })),
  ];
  return { group, update, final, cam, hero, cues };
}
