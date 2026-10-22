// c5_cta · the payoff: fully upgraded car rolls to the pit exit, 5 reds on "Comment", green on "CODING", launch, crew cheers,
// referee waves the checkered flag, dust settles while the end card holds. Pure function of t.
import { THREE, V, W, WE, ez, seg, ss, lerp, clamp, hsh, pose, clawd, BL, ring, yawTo, camPath, shake } from './kit.js';
import { PIT } from '../set.js';

export default async function build(ctx) {
  const { SET, car, driver, CH, T_END } = ctx;
  const ch = CH.find(c => c.id === 'c5_cta'), T0 = ch.t0;
  const group = new THREE.Group();
  const tC = W('cta', 'Comment'), tG = W('cta', 'CODING'), tCE = WE('cta', 'CODING'), tL = W('cta', 'links'), tAll = W('cta', 'all'), tS = W('cta', 'send');
  const LAMP = [0, 1, 2, 3, 4].map(i => lerp(tC - 0.04, tG - 0.06, i / 4));
  const STOP = 1.55, A = 9.0;                                   // car parks with its nose at the gantry; launch accel m/s²
  const carX = (t) => {
    if (t < tG) return STOP * ss(clamp((t - (T0 - 0.3)) / (tC + 0.1 - T0 + 0.3)));
    const d = t - tG; return STOP + 0.5 * A * d * d;
  };

  // crew (Kai's red jackets) on the lane side + referee with a checkered flag past the gantry
  const crewDef = [[0.5, 1.55, 0.35, 1], [1.3, 1.8, 0.1, 2], [2.1, 1.6, -0.15, 3]];
  const crew = [];
  for (const [x, z, yaw, s] of crewDef) { const c = clawd(ctx.S.scene, ''); group.add(c.group); crew.push({ c, x, z, yaw, s, bl: BL(T0, T_END, 2.6, 10 + s) }); }
  const ref = clawd(ctx.S.scene, 'referee'); group.add(ref.group); const refBL = BL(T0, T_END, 2.9, 21);
  const REF = V(3.7, 0, -1.25);                                  // far side of the lane: faces the camera, never in the lens path

  // checkered flag: pole + a subdivided plane we ripple
  const fc = document.createElement('canvas'); fc.width = 256; fc.height = 192; const fg = fc.getContext('2d');
  for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) { fg.fillStyle = (i + j) % 2 ? '#111' : '#f5f1e8'; fg.fillRect(i * 32, j * 32, 32, 32); }
  const ftex = new THREE.CanvasTexture(fc); ftex.colorSpace = THREE.SRGBColorSpace;
  const flag = new THREE.Group(); group.add(flag);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.75, 8), new THREE.MeshStandardMaterial({ color: '#c9ccd2', metalness: 0.5, roughness: 0.3 }));
  pole.position.y = 0.375; flag.add(pole);
  const fgeo = new THREE.PlaneGeometry(0.42, 0.3, 16, 8); fgeo.translate(0.21, 0.6, 0);
  const fbase = fgeo.attributes.position.array.slice();
  const cloth = new THREE.Mesh(fgeo, new THREE.MeshStandardMaterial({ map: ftex, side: THREE.DoubleSide, roughness: 0.8 })); cloth.castShadow = true; flag.add(cloth);

  // dust puffs: emitted from the rear wheels during the first 1.2 s of the launch, they drift up, grow, fade
  const dustM = [], dust = [];
  for (let i = 0; i < 26; i++) {
    const m = new THREE.MeshStandardMaterial({ color: '#d9c3a3', roughness: 1, transparent: true, opacity: 0, depthWrite: false });
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 9), m); group.add(s); dustM.push(m);
    dust.push({ s, te: tG + i * 0.045, side: i % 2 ? 1 : -1, j: hsh(i, 5), k: hsh(i, 9) });
  }
  // 4 little confetti-ish streamers? no: keep it clean. Speed lines on the lane instead (thin bright strips behind the car).
  const streak = []; for (let i = 0; i < 3; i++) { const m = new THREE.MeshBasicMaterial({ color: '#fff3dc', transparent: true, opacity: 0 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(1, 0.015, 0.015), m); group.add(b); streak.push({ b, m, y: 0.22 + i * 0.13, z: -0.35 + i * 0.35 }); }

  // lens props: a big checkered cloth swept across the lens's left edge on "send"; dust puffs that blow at the lens on "CODING"
  const lensFlag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.36, 8, 4), new THREE.MeshStandardMaterial({ map: ftex, side: THREE.DoubleSide, roughness: 0.8 }));
  group.add(lensFlag);
  const lensDustM = [], lensDust = [];
  for (let i = 0; i < 6; i++) { const m = new THREE.MeshStandardMaterial({ color: '#d9c3a3', roughness: 1, transparent: true, opacity: 0, depthWrite: false });
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 9), m); group.add(s); lensDustM.push(m); lensDust.push({ s, te: tG + 0.12 + i * 0.07, j: hsh(i, 31), k: hsh(i, 37) }); }
  const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3();
  const lensAt = (t, fx, fy, dist) => { const c = cam(t); _f.copy(c.tgt).sub(c.pos).normalize(); _r.crossVectors(_f, V(0, 1, 0)).normalize(); _u.crossVectors(_r, _f);
    const h = Math.tan(c.fov * Math.PI / 360) * dist; return c.pos.clone().addScaledVector(_f, dist).addScaledVector(_r, fx * h * 9 / 16).addScaledVector(_u, fy * h); };

  let heroP = null;
  function update(t) {
    // gantry: 5 reds one by one across "Comment", all out → green on "CODING"
    SET.gantry.off();
    if (t >= tG) SET.gantry.green(1 - 0.25 * ez(t, tG + 1.4, 0.8));
    else LAMP.forEach((a, i) => SET.gantry.set(i, ez(t, a, 0.03)));

    // car: roll to the line, rev (body shake), launch (squat + nose lift), wheels spin
    const x = carX(t); car.g.position.set(x, 0, 0);
    const rev = t > tC && t < tG ? 1 : 0;
    car.body.position.y = rev * 0.008 * Math.sin(t * 90);
    car.body.rotation.z = (t >= tG ? 0.06 * Math.exp(-3 * (t - tG)) * Math.min(1, (t - tG) * 12) : 0) - 0.02 * ring(t, tG, { f: 2, d: 5 });
    const spin = t < tG ? x / 0.24 + (rev ? (t - tC) * 40 : 0) : STOP / 0.24 + (tG - tC) * 40 + (x - STOP) / 0.24 + (t - tG) * 30;
    car.wheels.forEach(w => { w.rotation.z = -spin; });
    car.g.updateMatrixWorld(true);
    ctx.driverPose = pose(driver, t, { pos: car.g.localToWorld(car.seat.clone()), yaw: Math.PI / 2, expr: t > tG ? 'happy' : 'squint',
      armR: t > tG + 0.3 ? 0.9 * ez(t, tG + 0.3, 0.2) : 0, blinkTimes: [], seed: 2 });

    // crew: lean in during the reds, then hop + arms up on CODING, keep bouncing (staggered) through the end
    crew.forEach((m, i) => {
      const off = i * 0.09, hops = [];
      for (let k = 0; k < 6; k++) { const a = tG + 0.05 + off + k * 0.62; hops.push([a, a + 0.36, 0.16 - 0.015 * k]); }
      const look = t < tG ? [0.6, 0] : [clamp((carX(t) - m.x) * 0.15, -1, 1), 0.2];
      const up = ez(t, tG + off, 0.12), wave = 0.15 * Math.sin((t - tG) * 9 + i);
      const mx = m.x - 2.6 * (1 - ez(t, tG - 0.25 + off, 0.45)); const p = pose(m.c, t, { pos: V(mx, 0, m.z), yaw: lerp(m.yaw + 0.6, yawTo(V(mx, 0, m.z), cam(t).pos), 0.6 + 0.35 * ez(t, tG, 0.25)), hops, expr: t < tG ? 'wide' : 'happy', look,
        armL: up * (0.85 + wave), armR: up * (0.85 - wave), bow: t < tG ? 0.12 * ez(t, tC, 0.2) : 0, blinkTimes: m.bl, seed: m.s });
      if (i === 1) heroP = { c: m.c, ...p };
    });

    // referee: steps up on "Comment", waves the flag from CODING on
    const rp = pose(ref, t, { pos: REF, yaw: yawTo(REF, cam(t).pos), hops: [[tC - 0.05, tC + 0.25, 0.1], [tL, tL + 0.32, 0.1]], expr: t < tG ? 'neutral' : 'happy',
      armR: 0.4 + 0.5 * ez(t, tG, 0.15), look: [0.4, 0.2], blinkTimes: refBL, seed: 7 });
    const sw = t < tG ? 0 : Math.sin((t - tG) * 7.5);
    flag.position.copy(REF).add(V(0.24, 0.32 + 0.12 * ez(t, tG, 0.15), 0.05));
    flag.rotation.set(0, -0.6, -0.35 + 0.5 * sw * ez(t, tG, 0.2));
    const pa = fgeo.attributes.position.array;
    for (let i = 0; i < pa.length; i += 3) { const u = fbase[i] / 0.42; pa[i + 2] = fbase[i + 2] + u * 0.06 * Math.sin(t * 11 - u * 6); }
    fgeo.attributes.position.needsUpdate = true; fgeo.computeVertexNormals();

    // dust
    dust.forEach((d, i) => {
      const age = t - d.te;
      if (age < 0) { dustM[i].opacity = 0; d.s.visible = false; return; }
      d.s.visible = true;
      const ex = carX(d.te) - 0.85 - 0.6 * age;
      d.s.position.set(ex - d.j * 0.3, 0.12 + 0.35 * (1 - Math.exp(-age * 1.2)) + d.k * 0.1, d.side * (0.62 + 0.25 * age));
      d.s.scale.setScalar(0.4 + 1.4 * (1 - Math.exp(-age * 1.5)));
      dustM[i].opacity = 0.45 * Math.exp(-age * 0.9) * Math.min(1, age * 20);
    });
    // lens flag: sweeps down-left across the frame edge in 0.45 s on "send" (stays at x < 0.25, below the faces)
    { const k = seg(t, tS - 0.1, tS + 0.4); lensFlag.visible = k > 0 && k < 1;
      if (lensFlag.visible) { const P = lensAt(t, lerp(-1.25, -2.2, k), lerp(-0.2, -1.0, k), 1.2); lensFlag.position.copy(P); const c = cam(t); lensFlag.lookAt(c.pos); lensFlag.rotation.z += 0.6 * Math.sin(k * 6); } }
    lensDust.forEach((d, i) => { const age = t - d.te, L = 0.7; if (age < 0 || age > L) { d.s.visible = false; return; } d.s.visible = true;
      const k = age / L, P = lensAt(t, (d.j > 0.5 ? 1 : -1) * lerp(0.7, 1.3, k) , lerp(-0.5, -0.95, k) + d.k * 0.2, lerp(2.2, 0.5, k));
      d.s.position.copy(P); d.s.scale.setScalar(0.6 + 1.6 * k); lensDustM[i].opacity = 0.55 * Math.sin(Math.PI * k); });
    // speed streaks trail the car for the first second of the launch
    streak.forEach((s, i) => { const k = win(t, tG + 0.1, tG + 1.3, 0.1, 0.4);
      s.m.opacity = 0.7 * k; s.b.scale.x = 0.6 + 1.6 * ez(t, tG, 0.6); s.b.position.set(carX(t) - 1.4 - s.b.scale.x / 2, s.y, s.z); });
  }
  const win = (t, a, b, din, dout) => ez(t, a - din, din) * (1 - ez(t, b, dout));

  // camera v2 (ADHD): MED roll-in → crash zoom CU gantry on "Comment" → whip WIDE after the launch on "CODING" (dust at the lens) →
  // fast track along the cheering crew on "send" (flag across the lens edge) → settle into a lively drift on "links" (end card behind).
  const K = [
    { t: T0, pos: V(12.5, 3.4, 10.5), tgt: V(3.5, 2.0, 1.78), fov: 64 },   // wide on the pit exit, crash-zoomed at once,
    { t: T0 + 0.01, d: 0.2, pos: V(8.5, 2.1, 6.5), tgt: V(3.5, 2.0, 1.78), fov: 53, dolly: 0.12, roll: 0.03 },
    { t: tS - 0.05, d: 0.3, pos: V(0.4, 1.05, 4.6), tgt: V(1.4, 0.42, 1.8), fov: 40, orbit: -0.6, dolly: 1.0 },
    { t: tL, d: 0.9, pos: V(2.4, 1.7, 7.2), tgt: V(1.7, 0.6, 1.2), fov: 46, orbit: 0.46, dolly: 0.3 },
  ];
  function cam(t) {
    const c = camPath(t, K);
    // after the launch, the WIDE whip keeps panning with the car
    // on CODING hold the gantry shot 0.25 s (whole car under the green lamps), then whip into a broadside track that rides with the car
    const trk = win(t, tG + 0.5, tS - 0.05, 0.25, 0.25), cx = carX(t);
    c.pos.lerp(V(cx + 0.1, 2.0, 7.6), trk); c.tgt.lerp(V(cx - 0.35, 0.35, 0), trk); c.fov = lerp(c.fov, 44, trk); c.roll = lerp(c.roll, -0.03, trk);
    c.tgt.add(shake(t, [tC, ...LAMP.slice(1)], 0.035).add(shake(t, [tG], 0.012)));
    c.tgt.y += 0.05 * Math.sin(t * 13) * win(t, tC - 0.05, tG, 0.1, 0.1);          // engine-rev judder while the reds count
    c.pos.y += 0.12 * Math.sin(t * 3.1) * ez(t, tL, 0.6);                             // lively float behind the end card
    const focus = t < tG + 0.1 ? V(3.4, 2.2, 1.0) : V(1.6, 0.4, 1.9);
    return { pos: c.pos, tgt: c.tgt, fov: c.fov, roll: c.roll, focus, aperture: 0.45 };
  }
  const hero = (t) => t < tS - 0.15 ? { c: driver, ...ctx.driverPose } : heroP;
  const cues = [
    { t: T0 + 0.1, kind: 'rev', note: 'car rolls to the line' },
    ...LAMP.map((a, i) => ({ t: a, kind: 'lamp', note: `red ${i + 1} on Comment` })),
    { t: tC, kind: 'rev', note: 'engine revs at the line' },
    { t: tG, kind: 'launch', note: 'green on CODING, car launches' },
    { t: tG + 0.05, kind: 'whoosh', note: 'car tears off down the lane' },
    { t: tG + 0.08, kind: 'cheer', note: 'crew hop + arms up' },
    { t: tG + 0.1, kind: 'flag', note: 'referee waves checkered flag' },
    { t: tL, kind: 'cheer', note: 'second cheer hop as camera settles' },
    { t: T0 + 0.01, kind: 'whoosh', note: 'crash zoom into the gantry' },
    { t: tG + 0.25, kind: 'whoosh', note: 'whip into the broadside track (starts tG+0.25)' },
    { t: tS - 0.1, kind: 'whoosh', note: 'flag cloth swept across the lens' },
    { t: tS - 0.05, kind: 'flag', note: 'track along the crew' },
  ];
  return { group, update, final() {}, cam, hero, cues };
}
