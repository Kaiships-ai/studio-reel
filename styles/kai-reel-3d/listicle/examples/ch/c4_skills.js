// ch/c4_skills.js · "4 · AGENT SKILLS": iron-nod engineer at a 5×5 tool rack; 5 stage lamps (SPEC PLAN BUILD TEST SHIP),
// five fast tool fits on the car, then the rear-wing kit drops onto slot p4 on "right".
import { yawTo } from './kit.js';
import { THREE, V, W, WE, ez, pulse, pop, pose, clawd, BL, plate, hsh, lerp, clamp, arc, ring, camPath, shake } from './kit.js';
import { std, box, lbl } from '../set.js';

export default async function build(ctx) {
  const { car, driver, ch } = ctx, T0 = ch.t0, T1 = ch.t1;
  const group = new THREE.Group();
  const tAgent = W('p4a', 'Agent'), t25 = W('p4b', 'Twenty-five'), tRight = W('p4b', 'right'), tPicks = W('p4b', 'picks');
  const STG = [['SPEC', W('p4b', 'spec')], ['PLAN', W('p4b', 'plan')], ['BUILD', W('p4b', 'build')], ['TEST', W('p4b', 'test')], ['SHIP', W('p4b', 'ship')]];

  // ---------------- tool rack (pit wall board), behind-left of the car, angled to camera
  const rack = new THREE.Group(); rack.position.set(-1.45, 0.78, 0.15); rack.rotation.y = 0.08; rack.scale.setScalar(0.55); group.add(rack);
  const board = box(1.25, 1.25, 0.06, std('#2a2d35', { roughness: 0.6 })); board.position.set(0, 0.95, 0); rack.add(board);
  for (const x of [-0.55, 0.55]) { const leg = box(0.06, 1.9, 0.06, std('#1b1d22')); leg.position.set(x, -0.6, 0); rack.add(leg); }
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), new THREE.MeshStandardMaterial({ map: lbl('25', 256, 128, 110, '#1b1d22', '#f2c230'), roughness: 0.6 }));
  tag.position.set(0, 0.42, 0.05); tag.scale.setScalar(1.1); rack.add(tag);
  const COLS = ['#ff3b6b', '#ffd21f', '#2f9bff', '#2fe07a', '#b46bff'];
  const slotM = [], slotPos = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    const m = new THREE.MeshStandardMaterial({ color: '#3a3e48', emissive: new THREE.Color(COLS[c]), emissiveIntensity: 0, roughness: 0.5 });
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.03), m); s.position.set(-0.44 + c * 0.22, 1.47 - r * 0.22, 0.04); rack.add(s); slotM.push(m); slotPos.push(s.position.clone());
  }
  // big '25' plate: pops on "Twenty-five" in front of the rack
  const big25 = plate('25', { w: 0.5, h: 0.32, px: 560, fg: '#1b1d22', bg: '#f2c230' }); big25.position.set(-1.45, 1.3, 0.75); group.add(big25);
  const LBP = [V(-1.38, 0.86, 0.9), V(-1.1, 0.6, 0.78), V(-1.38, 0.86, 0.9), V(-1.3, 0.66, 0.5), V(-1.12, 0.86, 0.9)]; const LBS = [1, 0.55, 1, 0.6, 1];   // label spot per stage shot
  const bigL = STG.map(([w]) => { const b = plate(w, { w: 0.5, h: 0.2, px: 300, bg: '#fffdf8' }); b.position.set(-1.38, 0.86, 0.9); b.visible = false; group.add(b); return b; });
  // stage lamps + labels in front of the rack
  const lampRow = new THREE.Group(); lampRow.position.set(-1.38, 1.46, 0.6); lampRow.scale.setScalar(0.4); lampRow.rotation.y = 0.08; group.add(lampRow);
  const beamL = box(1.16, 0.05, 0.05, std('#1b1d22')); beamL.position.set(0, 0.32, -0.04); lampRow.add(beamL);
  
  const lamps = STG.map(([w], i) => {
    const m = new THREE.MeshStandardMaterial({ color: '#2a0d0d', emissive: new THREE.Color('#ff7a2a'), emissiveIntensity: 0, roughness: 0.3 });
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), m); s.position.set(-0.46 + i * 0.23, 0.16, 0.04); lampRow.add(s);
    const p = plate(w, { w: 0.22, h: 0.13, px: 330, bg: '#fffdf8' }); p.position.set(-0.46 + i * 0.23, -0.01, 0.04); lampRow.add(p);
    return { m, s, p };
  });
  // the five tools (one per stage): wrench-ish bars, each lives in a rack slot then flies to the car
  const TOOL_SLOT = [2, 8, 12, 16, 22];                                     // which rack slot each stage pulls
  const TOOL_DST = [-1.17, -1.07, -1.22, -1.12, -1.02].map((x, i) => V(x, 0.5 + 0.05 * (i % 2), 0.32));
  const tools = STG.map((_, i) => {
    const g = new THREE.Group(), m = std(COLS[i % 5], { roughness: 0.35, metalness: 0.2, emissive: new THREE.Color(COLS[i % 5]), emissiveIntensity: 0 });
    const h = box(0.08, 0.26, 0.08, m), hd = box(0.2, 0.08, 0.09, m); hd.position.y = 0.15; g.add(h, hd); group.add(g); return { g, m };
  });
  rack.updateMatrixWorld(true);
  const rackW = (i) => rack.localToWorld(slotPos[i].clone().add(V(0, 0, 0.06)));

  // ---------------- engineer (iron-nod) between the rack and the car's tail
  const eng = clawd(group, 'iron-nod');
  if (eng.group.parent !== group) group.add(eng.group);
  const ENG_BL = BL(T0, T1, 2.6, 41);
  const ENG_POS = V(-1.32, 0, 0.66);

  // ---------------- rear-wing kit inside car.slot.p4
  const STOCK = car.body.children.filter(m => m.isMesh && Math.abs(m.position.x + 1.13) < 0.03 && m.position.y > 0.4);   // stock rear wing, post, endplates
  const kit = new THREE.Group(); car.slot.p4.add(kit);
  const wingM = std('#1b1d22', { roughness: 0.35, metalness: 0.3, emissive: new THREE.Color('#ffd21f'), emissiveIntensity: 0 });
  const redM = std('#e8342e', { roughness: 0.35, emissive: new THREE.Color('#ff5a3a'), emissiveIntensity: 0 });
  const whM = std('#fffdf8', { roughness: 0.5 }), yeM = std('#ffd21f', { roughness: 0.4, emissive: new THREE.Color('#ffd21f'), emissiveIntensity: 0.3 });
  const wing = box(0.34, 0.05, 1.2, wingM); wing.position.y = 0.3; wing.rotation.z = -0.12; kit.add(wing);           // main plane (thin, cambered)
  const flap = box(0.2, 0.04, 1.2, redM); flap.position.set(-0.17, 0.4, 0); flap.rotation.z = 0.45; kit.add(flap);    // upper flap
  const stripe = box(0.06, 0.012, 1.2, yeM); stripe.position.set(0.03, 0.33, 0); stripe.rotation.z = -0.12; kit.add(stripe);
  for (const z of [-0.12, 0.12]) { const po = box(0.05, 0.3, 0.04, wingM); po.position.set(0.04, 0.13, z); po.rotation.z = -0.2; kit.add(po); }   // swan-neck pylons
  for (const z of [-0.62, 0.62]) {                                                                                     // endplates
    const ep = box(0.5, 0.36, 0.025, redM); ep.position.set(-0.04, 0.3, z); kit.add(ep);
    const es = box(0.5, 0.06, 0.03, whM); es.position.set(-0.04, 0.26, z); kit.add(es);
  }
  const kitState = (t) => {
    const d = ez(t, tRight - 0.22, 0.22);
    kit.position.y = 1.2 * (1 - d) + 0.05 * ring(t, tRight, { f: 5, d: 10, a: -1 });
    kit.rotation.x = 0.4 * (1 - d);
    wingM.emissiveIntensity = 0.8 * pulse(t, tRight, 1, 0.5); redM.emissiveIntensity = 0.9 * pulse(t, tRight, 1, 0.5);
    car.slot.p4.visible = t >= tRight - 0.22;
  };

  function update(t) {
    // rack lights up on "Twenty-five" (a quick ripple)
    slotM.forEach((m, i) => { const r = Math.floor(i / 5), c = i % 5; m.emissiveIntensity = 1.4 * ez(t, t25 + 0.03 * (r + c), 0.12) + 1.5 * pulse(t, t25 + 0.03 * (r + c), 1, 0.3); });
    const kOut = ez(t, WE('p4b', 'ship') + 0.05, 0.6); lampRow.position.set(-1.38, 1.0 + 0.6 * kOut, 0.6); lampRow.scale.setScalar(0.65 * (1 - kOut) + 0.001);
    big25.scale.setScalar(Math.max(0.001, pop(t, t25) * (1 - ez(t, STG[0][1] - 0.25, 0.2))));
    STOCK.forEach(m => { m.visible = false; });   // the stock wing (cream endplates = the 'blank board') is what the kit replaces
    lamps.forEach((l, i) => { const on = ez(t, STG[i][1] - 0.04, 0.06); l.m.emissiveIntensity = (5 - 3.5 * ez(t, tRight - 0.4, 0.3)) * on + 4 * pulse(t, STG[i][1], 1, 0.3); l.p.visible = false; });
    // one big label for the current stage word (spec, build, ship: the shots that face the lamps); small strip labels stay hidden
    bigL.forEach((b, i) => { const a = STG[i][1] + 0.1, e = i < 4 ? STG[i + 1][1] + 0.02 : tPicks - 0.1; b.visible = t > a && t < e; b.position.copy(LBP[i]); b.rotation.y = 0.7 * yawTo(LBP[i], cam(t).pos); b.scale.setScalar(Math.max(0.001, LBS[i] * pop(t, a))); });
    // tools: rack → arc → car (0.28 s), then a click-in glow
    let busy = -1;
    tools.forEach(({ g, m }, i) => {
      const t0 = STG[i][1] - 0.08, d = 0.3, u = clamp((t - t0) / d), a = rackW(TOOL_SLOT[i]), b = TOOL_DST[i];
      if (u > 0 && u < 1) busy = i;
      g.position.lerpVectors(a, b, u * u * (3 - 2 * u)); g.position.y += arc(t, t0, t0 + d, 0.5);
      g.rotation.set(0, 0, u * Math.PI * 2 * (u < 1 ? 1 : 0) + (u >= 1 ? 0.3 : 0));
      g.scale.setScalar(1 + 0.4 * pulse(t, t0 + d, 1, 0.25));
      m.emissiveIntensity = 2.5 * pulse(t, t0 + d, 1, 0.3) + (u > 0 ? 0.6 : 0);
      slotM[TOOL_SLOT[i]].color.set(u > 0 ? '#14161a' : '#3a3e48');
    });
    // engineer: walks in for "Agent", nods on 25, spins rack ↔ car on each stage, cheers on "right"
    const hops = [[tAgent - 0.1, tAgent + 0.2, 0.18], [t25, t25 + 0.2, 0.12], ...STG.map(([, s]) => [s - 0.08, s + 0.12, 0.1]), [tRight, tRight + 0.3, 0.25]];
    let yaw = 0;
    STG.forEach(([, s]) => { yaw += (-0.35) * (ez(t, s - 0.2, 0.08) - ez(t, s, 0.1)); });
    yaw += -0.2 * ez(t, tRight, 0.2);
    const ep = ENG_POS.clone().add(V(0, 0, 0)); yaw = lerp(yaw, yawTo(ep, cam(t).pos), 0.8);
    const k = pose(eng, t, { pos: ep, yaw, hops, seed: 4,
      armL: busy >= 0 ? 1 : 0.2 * pulse(t, t25, 1, 0.5), armR: Math.max(ez(t, tRight, 0.15), busy >= 0 ? 0.4 : 0, pulse(t, t25, 1, 0.5)),
      bow: 0.25 * pulse(t, t25, 1, 0.5) + 0.15 * pulse(t, tAgent, 1, 0.4),
      expr: t >= tRight ? 'happy' : busy >= 0 ? 'squint' : 'neutral', look: [busy >= 0 ? 0.6 : 0, 0], blinkTimes: ENG_BL });
    engHero = { c: eng, ...k };
    // driver: peeks back at each fit, wide-eyed; bounces happy on "right"
    const look = STG.reduce((v, [, s]) => v + pulse(t, s, 1, 0.5), 0);
    ctx.driverPose = pose(driver, t, { pos: car.g.localToWorld(car.seat.clone()), yaw: lerp(Math.PI / 2, yawTo(car.g.localToWorld(car.seat.clone()), cam(t).pos), clamp(0.7 * clamp(look) + ez(t, tPicks, 0.2))),
      expr: t >= tRight ? 'happy' : look > 0.2 ? 'wide' : 'neutral', hops: [[tRight + 0.05, tRight + 0.3, 0.12]], armR: ez(t, tRight, 0.2), seed: 2, blinkTimes: BL(T0, T1, 2.8, 5) });
    // car: little shake on each fit
    car.body.position.y = STG.reduce((v, [, s]) => v + 0.012 * ring(t, s + 0.22, { f: 6, d: 12 }), 0) - 0.02 * ring(t, tRight, { f: 5, d: 9 });
    kitState(t);
  }
  let engHero = null;
  function final(t) { STOCK.forEach(m => { m.visible = false; }); kit.position.y = 0; kit.rotation.x = 0; wingM.emissiveIntensity = 0; redM.emissiveIntensity = 0; car.slot.p4.visible = true; }
  // camera v2 (ADHD): one move per word via camPath. Scales: MED → ECU face → CU rack → WIDE (25 lit) → rack/lamps MED ↔ fit CU ×5 → low CU
  // (wing drops past the lens) → WIDE car. Faces: engineer = hero until the pull-out, then the driver.
  const tFour = W('p4a', 'Four'), tAddy = W('p4a', 'Addy'), tSkills = W('p4b', 'skills');
  const RACK = (dx = 0) => ({ pos: V(-1.35 + dx, 0.62, 3.2), tgt: V(-1.45 + dx, 0.46, 0.4), fov: 38 });
  const FIT = (i) => ({ pos: V(-1.15, 0.48, 2.1), tgt: V(-1.32, 0.31, 0.45), fov: 38, roll: i % 2 ? 0.06 : -0.06 });
  const ZK = 1.8;
  const LAMP = (dx, roll) => ({ pos: V(-1.23 + dx, 0.76, 2.2), tgt: V(-1.38, 0.47, 0.6), fov: 38, roll, dolly: 0.5, orbit: 0.25 });
  const STAGE = [
    LAMP(0, 0.04),                                                                                                    // spec: lamp-row CU
    { pos: V(-0.55, 0.4, 1.2), tgt: V(-1.3, 0.38, 0.55), fov: 38, roll: -0.06, dolly: 0.4, orbit: -0.3 },              // plan: side fit CU
    LAMP(-0.35, -0.05),                                                                                               // build: lamp-row CU, other side
    { pos: V(-1.7, 0.3, 1.6), tgt: V(-1.25, 0.3, 0.5), fov: 36, roll: 0.07, dolly: 0.4, orbit: 0.35 },            // test: low fit CU from the left
    { pos: V(-0.6, 1.05, 3.1), tgt: V(-0.9, 0.55, 0.2), fov: 40, orbit: -0.15, dolly: 0.3 },                          // ship: true WIDE car + rack + engineer
  ];
  const K = [
    { t: T0, pos: V(-0.7, 0.9, 3.4), tgt: V(-1.2, 0.42, 0.4), fov: 38, dolly: 0.6 },
    { t: tFour, d: 0.25, pos: V(-0.95, 0.55, 2.6), tgt: V(-1.32, 0.38, 0.66), fov: 34, dolly: 0.35, roll: 0.05 },              // whip MED engineer
    { t: tAgent, d: 0.3, pos: V(-1.3, 0.25, 2.3), tgt: V(-1.42, 0.44, 0.4), fov: 44, dolly: 0.25, orbit: 0.2 },                 // low push to the rack
    { t: tAddy, d: 0.25, pos: V(-1.25, 0.42, 1.6), tgt: V(-1.31, 0.3, 0.85), fov: 34, dolly: 0.12, roll: -0.08 },             // ECU engineer
    { t: t25, d: 0.3, pos: V(-0.95, 1.05, 3.9), tgt: V(-1.3, 0.47, 0.3), fov: 38, orbit: -0.25, dolly: 0.4 },                              // crash pull-out WIDE, rack lights
    { t: tSkills + 0.05, d: 0.35, ...RACK(0.05), dolly: 0.8, orbit: -0.3 },                                                                 // drift in on the rack
    ...STG.map(([, s], i) => ({ t: s - 0.06, d: 0.2, ...STAGE[i] })),   // spec..ship whips
    { t: tPicks - 0.02, d: 0.28, pos: V(-0.95, 0.3, 2.1), tgt: V(-1.3, 0.45, 0.35), fov: 44, orbit: 0.5 },                  // fast orbit low on p4
    { t: tRight + 0.1, d: 0.42, pos: V(-0.2, 1.3, 5.4), tgt: V(-0.72, 0.42, 0), fov: 42, orbit: -0.04, dolly: 0.2 },           // crash pull-out WIDE car
  ];
  for (const k of K.slice(0, -1)) k.pos = k.tgt.clone().add(k.pos.clone().sub(k.tgt).multiplyScalar(ZK));     // pull back: Clawd is big
  const hits = [t25, ...STG.map(([, s]) => s + 0.22), tRight];
  function cam(t) {
    const c = camPath(t, K); c.tgt.add(shake(t, hits, 0.03));
    return { pos: c.pos, tgt: c.tgt, fov: c.fov, roll: c.roll, focus: c.tgt.clone(), aperture: 0.4 };
  }
  const cues = [
    { t: tFour, kind: 'whoosh', note: 'whip to engineer' }, { t: tAddy, kind: 'whoosh', note: 'snap ECU engineer' },
    { t: t25, kind: 'whoosh', note: 'crash pull-out' }, { t: tPicks, kind: 'whoosh', note: 'orbit' }, { t: tRight + 0.1, kind: 'whoosh', note: 'crash pull-out WIDE car' },
    ...STG.map(([w, s]) => ({ t: s - 0.06, kind: 'whoosh', note: `whip ${w}` })),
    { t: tAgent, kind: 'whoosh', note: 'engineer hops in' },
    { t: t25, kind: 'toggle', note: 'rack lights up' },
    ...STG.flatMap(([w, s]) => [{ t: s, kind: 'lamp', note: w }, { t: s + 0.22, kind: 'ratchet', note: `${w} tool fits` }]),
    { t: tRight - 0.22, kind: 'whoosh', note: 'wing falls' }, { t: tRight, kind: 'clank', note: 'rear wing lands on p4' },
  ];
  return { group, update, final, cam, hero: () => engHero, cues };
}
