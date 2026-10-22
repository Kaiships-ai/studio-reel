// ch/c1_ponytail.js · "One, Ponytail. Claude Code writes fifty-four percent less code, and it's twenty percent cheaper."
// Bloated car buried in grey code blocks → crew knocks them off → −54% plate → car springs up light → −20% tag → orange fin clicks on p1.
import { yawTo, THREE, V, W, ez, win, pulse, pop, pose, clawd, BL, plate, hsh, lerp, clamp, ring, TR, SQ, seg, ss, camPath, shake } from './kit.js';
import { std, box } from '../set.js';

const codeTex = (seed) => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#7d828c'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#5c616b'; g.fillRect(0, 0, 256, 18);
  const cols = ['#c9ccd2', '#e8b46a', '#9fc4ff', '#d8622f'];
  for (let i = 0; i < 9; i++) { let x = 16 + 18 * Math.floor(hsh(i, seed) * 3); const y = 34 + i * 24;
    for (let j = 0; j < 3; j++) { const w = 20 + 60 * hsh(i * 7 + j, seed + 3); g.fillStyle = cols[Math.floor(hsh(i + j * 5, seed + 1) * 4)]; g.fillRect(x, y, w, 9); x += w + 10; if (x > 230) break; } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};

export default async function build(ctx) {
  const { car, driver } = ctx, group = new THREE.Group();
  const T = { pony: W('p1a', 'Ponytail'), writes: W('p1b', 'writes'), ff: W('p1b', 'fifty-four'), less: W('p1b', 'less'),
    code: W('p1b', 'code'), twenty: W('p1b', 'twenty'), cheaper: W('p1b', 'cheaper') };
  T.fin = T.cheaper; T.pct = T.twenty;
  const t0 = ctx.ch.t0, one = W('p1a', 'One,');

  // ------------------------------------------------ code blocks piled on the car (car space → world, car stays at origin)
  const N = 11, blocks = [];
  const mats = [0, 1, 2].map(s => std('#ffffff', { map: codeTex(s + 1), roughness: 0.75 }));
  for (let i = 0; i < N; i++) {
    const w = 0.34 + 0.16 * hsh(i, 4), h = 0.2 + 0.1 * hsh(i, 5), d = 0.3 + 0.12 * hsh(i, 6);
    const b = box(w, h, d, mats[i % 3]);
    const row = i < 5 ? 0 : i < 9 ? 1 : 2, k = row === 0 ? i : row === 1 ? i - 5 : i - 9;
    const nx = row === 0 ? 5 : row === 1 ? 4 : 2, x = -1.05 + (k + 0.5) * (2.1 / nx) + (hsh(i, 7) - 0.5) * 0.12;
    const home = V(x, 0.52 + row * 0.24, (hsh(i, 8) - 0.5) * 0.35 + (row === 0 ? 0.1 : -0.05));
    const rot = V((hsh(i, 9) - 0.5) * 0.3, (hsh(i, 10) - 0.5) * 0.6, (hsh(i, 11) - 0.5) * 0.3);
    group.add(b);
    // knocked off top-down: last-placed first, staccato across "writes … fifty-four"
    const order = N - 1 - i, tk = T.writes + order * 0.075;
    const dir = V(x * 0.6 + (hsh(i, 12) - 0.5) * 1.2, 0, hsh(i, 13) < 0.45 ? -1 : 0.9).normalize();
    blocks.push({ b, home, rot, tk, dir, spin: V(hsh(i, 14) * 9 - 4.5, hsh(i, 15) * 6 - 3, hsh(i, 16) * 9 - 4.5) });
  }
  const squashK = (t) => 1 - TR(t, [[0, 0], [T.less, 1, 2.6, 5.2]]);            // 1 = bloated, 0 = light (spring overshoots)

  // ------------------------------------------------ crew: 2 in front swinging mallets, 1 at the back
  const crew = [clawd(group, ''), clawd(group, ''), clawd(group, '')];
  crew.forEach(c => group.add(c.group));
  const mallet = () => { const g = new THREE.Group(); const h = box(0.03, 0.34, 0.03, std('#8a5a32')); h.position.y = 0.17; g.add(h);
    const hd = box(0.16, 0.09, 0.09, std('#2a2d35', { metalness: 0.4 })); hd.position.y = 0.34; g.add(hd); return g; };
  const mal = [mallet(), mallet(), mallet()]; mal.forEach(m => m.scale.setScalar(1.6)); mal.forEach(m => group.add(m));
  const CREW = [
    { pos: V(0.85, 0, 0.95), yaw: -0.5, seed: 3, bl: BL(4, 9, 2.6, 11) },
    { pos: V(-0.2, 0, 0.95), yaw: 0.3, seed: 5, bl: BL(4, 9, 2.9, 12) },
    { pos: V(0.2, 0, 0), p: (t) => { const u = ez(t, T.writes + 0.45, 0.35); return V(lerp(0.15, -0.6, u), lerp(0.95, 0.45, u) + 0.35 * Math.sin(Math.PI * u), lerp(0.1, 0, u)); }, yaw: 0.1, seed: 7, bl: BL(4, 9, 3.1, 13) }];

  // ------------------------------------------------ plates
  const p54 = plate('−54% CODE', { w: 1.2, h: 0.32, bg: '#fffdf8', fg: '#d8622f' }); group.add(p54);
  const p20 = new THREE.Group(); group.add(p20);
  const tag = plate('−20%', { w: 1.0, h: 0.5, bg: '#f2c230', fg: '#1b1d22' }); tag.position.y = -0.48; p20.add(tag);
  const str = box(0.012, 0.24, 0.012, std('#2b2622')); str.position.y = -0.12; p20.add(str);

  // ------------------------------------------------ the Ponytail fin (car upgrade, in slot p1)
  const fin = new THREE.Group(); car.slot.p1.add(fin);
  const sh = new THREE.Shape(); sh.moveTo(0.28, 0); sh.lineTo(-0.42, 0); sh.quadraticCurveTo(-0.5, 0.42, -0.62, 0.6); sh.quadraticCurveTo(-0.2, 0.3, 0.28, 0);
  const finM = std('#e8742a', { roughness: 0.3, metalness: 0.15, emissive: new THREE.Color('#ff7a2a'), emissiveIntensity: 0 });
  const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.035, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 }), finM);
  blade.position.z = -0.0175; blade.castShadow = true; fin.add(blade);
  const finPose = (t) => { const k = pop(t, T.fin, 3.6, 7.5), dr = 1 - ez(t, T.fin, 0.12);
    fin.position.set(0, 0.5 * dr, 0); fin.scale.setScalar(Math.max(0.001, 1.5 * k)); fin.rotation.x = 0.25 * ring(t, T.fin + 0.12, { f: 5, d: 10 });
    finM.emissiveIntensity = pulse(t, T.fin + 0.1, 1.6, 0.4); };

  const cues = [
    { t: T.pony, kind: 'impact', note: 'bloated car groans under code blocks' },
    ...blocks.map((o, i) => ({ t: o.tk, kind: i % 2 ? 'tumble' : 'impact', note: 'mallet knocks a code block off' })),
    { t: T.ff, kind: 'pop', note: '−54% CODE plate' },
    { t: T.less, kind: 'spring', note: 'car springs back up light' },
    { t: one + 0.12, kind: 'whoosh', note: 'punch-in on One' },
    { t: T.pony, kind: 'whoosh', note: 'crash zoom CU' },
    { t: T.writes - 0.04, kind: 'whoosh', note: 'low whip' },
    { t: T.less, kind: 'whoosh', note: 'crane orbit out' },
    { t: T.cheaper + 0.3, kind: 'whoosh', note: 'pull out' },
    { t: T.pct, kind: 'whoosh', note: '−20% tag swings onto the nose' },
    { t: T.fin, kind: 'click', note: 'Ponytail fin clicks onto p1' }];

  let heroP = null;
  function update(t) {
    const q = squashK(t);
    // car bloated: body squashed, sags, wheels flattened; idle groan wobble before the knock-off
    const wob = 0.02 * Math.sin(t * 9) * (1 - ez(t, T.writes, 0.3));
    car.body.scale.set(1 + 0.08 * q, 1 - 0.3 * q + wob, 1 + 0.1 * q); car.body.position.y = -0.06 * q;
    car.wheels.forEach(w => w.scale.set(1 + 0.25 * q, 1 - 0.3 * q, 1));   // wheel group y → squashed tyre
    car.wheels.forEach(w => { w.position.y = 0.24 - 0.07 * q; });
    car.body.rotation.z = 0.04 * ring(t, T.less + 0.08, { f: 3, d: 6 });
    car.g.updateMatrixWorld(true);
    // blocks
    for (const o of blocks) {
      const u = t - o.tk, sag = -0.12 * q;
      if (u <= 0) { o.b.visible = true; const jig = pulse(t, o.tk - 0.08, 0.03, 0.12);
        o.b.position.set(o.home.x, o.home.y + sag + jig + 0.008 * Math.sin(t * 7 + o.home.x * 5), o.home.z); o.b.rotation.set(o.rot.x, o.rot.y, o.rot.z); continue; }
      const sp = 3.2, x = o.home.x + o.dir.x * sp * u, z = o.home.z + o.dir.z * sp * u, y = o.home.y + sag + 2.6 * u - 6.5 * u * u;
      o.b.visible = y > -0.4 && u < 1.6; o.b.position.set(x, Math.max(y, 0.1), z);
      o.b.rotation.set(o.rot.x + o.spin.x * u, o.rot.y + o.spin.y * u, o.rot.z + o.spin.z * u);
    }
    // crew: mallet hits = alternate blocks; hop on each hit, cheer on "less", point at the fin on "cheaper"
    heroP = null;
    CREW.forEach((cfg, j) => {
      const hits = blocks.filter((_, i) => i % 3 === j).map(o => o.tk);
      const swing = Math.max(0, ...hits.map(h => pulse(t, h - 0.06, 1, 0.22)));
      const cheer = win(t, T.less, T.twenty, 0.1, 0.2), lookUp = win(t, T.fin - 0.05, 9, 0.12, 0.1);
      const cp = cfg.p ? cfg.p(t) : cfg.pos, cy = lerp(cfg.yaw, yawTo(cp, cam(t).pos), 0.75);
      const p = pose(crew[j], t, { pos: cp, yaw: cy + 0.25 * cheer * Math.sin(t * 8 + j), seed: cfg.seed, blinkTimes: cfg.bl,
        hops: [[T.pony + 0.05 * j, T.pony + 0.3 + 0.05 * j, 0.05], [T.less + 0.04 * j, T.less + 0.34 + 0.04 * j, 0.16], [T.fin + 0.1, T.fin + 0.36, 0.08]],
        armR: Math.max(0.3 + 0.7 * swing, cheer), armL: cheer, point: j === 0 ? lookUp : 0, bow: 0.25 * swing,
        expr: t < T.writes ? 'worried' : cheer > 0.3 || lookUp > 0.3 ? 'happy' : 'squint', look: [j === 2 ? 0 : -0.4, 0.2] });
      if (j === 0) heroP = { c: crew[0], ...p };
      { const m = mal[j], hand = crew[j].group.localToWorld(V(j ? 0.24 : 0.24, 0.2, 0.08));
        m.position.copy(hand); m.rotation.set(0, cy, -0.4 + 1.6 * swing * (j ? 1 : -1) * -1); m.visible = t < T.less + 0.3; }
    });
    // driver: squeezed and worried, then pops up happy
    car.g.updateMatrixWorld(true);
    ctx.driverPose = pose(driver, t, { pos: car.g.localToWorld(car.seat.clone()).add(V(0, -0.3 * q, 0)), yaw: Math.PI / 2, seed: 2,
      sq: -0.18 * q, expr: q > 0.5 ? 'worried' : t > T.twenty ? 'happy' : 'wide', hops: [[T.less + 0.02, T.less + 0.3, 0.1]], armL: win(t, T.less + 0.1, T.twenty, 0.1, 0.2), armR: win(t, T.less + 0.1, T.twenty, 0.1, 0.2), blinkTimes: [T.pony + 0.6, T.code + 0.3] });
    // −54% plate: pops on "fifty-four", above the car, gentle bob
    const k54 = pop(t, T.ff, 3.4, 7) * (1 - ez(t, T.pct - 0.3, 0.2));
    p54.visible = k54 > 0.01; p54.scale.setScalar(Math.max(0.001, 0.56 * k54));
    p54.position.set(1.36, 2.42 + 0.03 * Math.sin(t * 3), 2.08); p54.rotation.set(0, yawTo(p54.position, cam(t).pos) + 0.12 * Math.sin(t * 6), 0.08 * Math.sin(t * 8));
    // −20% tag: swings down from above onto the nose
    const kd = ez(t, T.pct - 0.05, 0.22);
    p20.visible = t > T.pct - 0.05 && t < T.cheaper; p20.position.set(0.42, lerp(2.05, 1.85, kd), 0.3); p20.scale.setScalar(Math.max(0.001, 0.45 * pop(t, T.pct - 0.05, 3.4, 7)));
    p20.rotation.set(0, yawTo(p20.position, cam(t).pos), (1 - kd) * 0.9 + 0.35 * ring(t, T.pct + 0.17, { f: 2.2, d: 3.2 }) + 0.14 * Math.sin(t * 7));
    // fin
    car.slot.p1.visible = t >= T.fin; finPose(t);
  }
  function final(t) { car.slot.p1.visible = true; finPose(Math.max(t, T.fin + 2));
    car.wheels.forEach(w => { w.scale.set(1, 1, 1); w.position.y = 0.24; }); }
  // camera v2 (ADHD): one move per word via camPath; jolts on knocks. Scales: WIDE → CU → low MED → CU → WIDE → CU → ECU → MED.
  const finW = car.slot.p1.getWorldPosition(V(0, 0, 0));
  const K = [
    { t: t0, pos: V(4.6, 2.6, 10.2), tgt: V(0.2, 0.55, 0), fov: 36, dolly: 2.0, orbit: 0.25 },                       // WIDE bloated car, dolly in
    { t: one + 0.12, d: 0.3, pos: V(3.4, 1.7, 7.2), tgt: V(0.15, 0.6, 0), fov: 34, roll: 0.03, orbit: -0.3, dolly: 0.9 },    // "One" punch-in
    { t: T.pony, d: 0.24, pos: V(1.6, 1.6, 3.6), tgt: V(-0.2, 1.25, -0.2), fov: 30, roll: -0.05, dolly: 0.6, orbit: 0.55 },    // crash zoom CU sagging car
    { t: T.writes - 0.04, d: 0.22, pos: V(0.6, 0.38, 3.9), tgt: V(0.3, 0.75, 0.2), fov: 36, roll: 0.07, orbit: -0.5 },          // low whip, blocks at lens
    { t: T.ff, d: 0.28, pos: V(2.4, 2.5, 5.6), tgt: V(1.22, 2.2, 2.15), fov: 34, dolly: 0.9, roll: 0.05, roll: 0.03 },               // push-through to −54% CU
    { t: T.less, d: 0.5, pos: V(4.4, 3.4, 7.6), tgt: V(0, 0.5, 0), fov: 36, roll: -0.04, orbit: -0.9, dolly: 1.0 },                      // crane + orbit WIDE
    { t: T.twenty - 0.04, d: 0.24, pos: V(1.4, 1.95, 3.2), tgt: V(0.12, 1.55, 0.3), fov: 32, roll: 0.04, dolly: 1.1, orbit: 0.4 },       // whip up to −20% tag CU
    { t: T.cheaper - 0.02, d: 0.2, pos: V(2.0, 1.5, -1.7), tgt: V(0.05, 0.6, 0), fov: 44, roll: -0.05, dolly: 0.5 }, // ECU fin click
    { t: T.cheaper + 0.3, d: 0.45, pos: V(3.0, 1.4, 6.2), tgt: V(0, 0.4, 0), fov: 34, orbit: 0.2 }];                        // pull out MED
  const hits = [T.pony, ...blocks.map(o => o.tk), T.ff, T.twenty, T.less, T.cheaper];
  function cam(t) {
    const c = camPath(t, K); c.tgt.add(shake(t, hits, 0.115)); 
    return { ...c, focus: c.tgt.clone(), aperture: 0.45 };
  }
  const hero = () => null;   // v2: driver is the hero (always in the car shots); crew stay supporting
  return { group, update, final, cam, hero, cues };
}
