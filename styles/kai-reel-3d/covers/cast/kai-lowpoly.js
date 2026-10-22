// Low-poly code-built Kai v2 (avatar-v4 look: cute stylised human, soft faceted). Feet y=0, faces +z. His right = -x.
import * as THREE from 'three';
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.8, metalness: 0, ...o });
const MAT = { skin: M('#eab493'), hair: M('#4b2a1b'), red: M('#d4392b'), redD: M('#a9271d'), white: M('#f3eee8'), black: M('#191514'),
  strap: M('#2d2420'), pants: M('#2b2b36'), shoe: M('#3b302d'), sole: M('#ece6de'), brow: M('#2a1a12'), eyeW: M('#ffffff'), lip: M('#8a3a30') };
const add = (geo, mat, p, x = 0, y = 0, z = 0, s) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (s) m.scale.set(...s); m.castShadow = true; p.add(m); return m; };
const ball = (r, d = 1) => new THREE.IcosahedronGeometry(r, d);
const cap = (r, len, rs = 7) => new THREE.CapsuleGeometry(r, len, 2, rs);
const pivot = (name, x, y, z, p) => { const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); p.add(g); return g; };
const lathe = (pts, seg = 8) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
// a flat bar between two points (strap)
const bar = (a, b, w, t, mat, p) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
  const m = add(new THREE.BoxGeometry(w, d.length(), t), mat, p); m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m; };

export function makeKaiLowpoly() {
  const root = new THREE.Group(); root.name = 'kaiLowpoly';
  const parts = {};
  // ---------- legs (hip → knee → shoe)
  for (const [s, nm] of [[-1, 'legR'], [1, 'legL']]) {
    const hip = pivot(nm, s * 0.085, 0.84, 0, root); parts[nm] = hip;
    add(cap(0.075, 0.26), MAT.pants, hip, 0, -0.19, 0);
    const knee = pivot(nm + 'Knee', 0, -0.4, 0, hip); parts[nm + 'Knee'] = knee;
    add(cap(0.062, 0.26), MAT.pants, knee, 0, -0.17, 0);
    add(ball(0.07, 1), MAT.shoe, knee, 0, -0.38, 0.045, [0.85, 0.55, 1.5]);
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.025, 8), MAT.sole, knee, 0, -0.415, 0.045, [1, 1, 1.75]);
  }
  // ---------- torso (waist pivot)
  const torso = pivot('torso', 0, 0.84, 0, root); parts.torso = torso;
  add(ball(0.15, 1), MAT.pants, torso, 0, 0.02, 0, [1.05, 0.6, 0.75]);                               // pelvis
  const jacket = add(lathe([[0.0, 0.02], [0.145, 0.03], [0.14, 0.12], [0.16, 0.28], [0.175, 0.4], [0.15, 0.47], [0.07, 0.52], [0, 0.53]]), MAT.red, torso);
  jacket.scale.z = 0.72;
  add(lathe([[0, 0.12], [0.07, 0.13], [0.085, 0.3], [0.07, 0.46], [0, 0.47]], 6), MAT.white, torso, 0, 0, 0.055, [1, 1, 1.1]); // tee panel
  for (const s of [-1, 1]) {
    const lap = add(new THREE.BoxGeometry(0.06, 0.2, 0.02), MAT.redD, torso, s * 0.07, 0.39, 0.112); lap.rotation.z = s * -0.4; lap.rotation.y = s * 0.3; // lapels
    const col = add(new THREE.BoxGeometry(0.1, 0.05, 0.03), MAT.redD, torso, s * 0.06, 0.5, 0.05); col.rotation.z = s * -0.5; col.rotation.y = s * 0.6;  // collar
    add(new THREE.BoxGeometry(0.075, 0.07, 0.015), MAT.redD, torso, s * 0.1, 0.31, 0.118);          // chest pocket
    add(new THREE.BoxGeometry(0.08, 0.025, 0.02), MAT.red, torso, s * 0.1, 0.35, 0.122);             // flap
  }
  // crossbody strap: his LEFT shoulder (+x) → bag at his RIGHT hip (-x)
  const strapPts = [[0.11, 0.5, 0.06], [0.1, 0.44, 0.115], [-0.02, 0.27, 0.13], [-0.15, 0.08, 0.12]];
  parts.strap = new THREE.Group(); torso.add(parts.strap);
  for (let i = 0; i < strapPts.length - 1; i++) bar(strapPts[i], strapPts[i + 1], 0.035, 0.012, MAT.strap, parts.strap);
  bar([0.11, 0.5, 0.06], [0.1, 0.44, -0.1], 0.035, 0.012, MAT.strap, parts.strap);
  bar([0.1, 0.44, -0.1], [-0.15, 0.1, -0.1], 0.035, 0.012, MAT.strap, parts.strap);
  bar([-0.15, 0.1, -0.1], [-0.17, 0.06, 0.04], 0.035, 0.012, MAT.strap, parts.strap);
  const bag = pivot('bag', -0.17, 0.02, 0.08, torso); bag.rotation.y = -0.35; parts.bag = bag;
  add(new THREE.BoxGeometry(0.17, 0.14, 0.07), MAT.strap, bag);
  add(new THREE.BoxGeometry(0.175, 0.07, 0.075), M('#3a2f2a'), bag, 0, 0.04, 0.003);
  // ---------- arms (shoulder → elbow → hand)
  for (const [s, nm] of [[-1, 'armR'], [1, 'armL']]) {
    const sh = pivot(nm, s * 0.175, 0.44, 0, torso); sh.rotation.z = s * 0.1; parts[nm] = sh;
    add(ball(0.05, 1), MAT.red, sh, -0.01 * s, -0.01, 0);
    add(cap(0.058, 0.2), MAT.red, sh, 0, -0.13, 0);
    const el = pivot(nm + 'Elbow', 0, -0.26, 0, sh); el.rotation.x = 0.15; parts[nm + 'Elbow'] = el;
    add(cap(0.053, 0.08), MAT.red, el, 0, -0.04, 0);
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.045, 7), MAT.redD, el, 0, -0.1, 0);               // rolled cuff
    add(cap(0.036, 0.1), MAT.skin, el, 0, -0.17, 0);
    const hand = pivot(nm + 'Hand', 0, -0.25, 0, el); parts[nm + 'Hand'] = hand;
    add(ball(0.04, 1), MAT.skin, hand, 0, -0.01, 0, [0.6, 1, 1.05]);                                  // palm
    add(ball(0.035, 1), MAT.skin, hand, 0, -0.055, 0.005, [0.55, 0.9, 1.05]);                        // fingers block
    const th = add(cap(0.013, 0.03, 5), MAT.skin, hand, -s * 0.0, -0.025, 0.04); th.rotation.x = 0.6;  // thumb (forward)
  }
  // ---------- head (neck pivot)
  const neck = pivot('neck', 0, 0.5, 0, torso);
  add(new THREE.CylinderGeometry(0.042, 0.05, 0.08, 7), MAT.skin, neck, 0, 0.02, 0);
  const head = pivot('head', 0, 0.05, 0.005, neck); parts.head = head;
  add(ball(0.105, 1), MAT.skin, head, 0, 0.13, 0, [0.95, 1.05, 1.0]);                                 // skull
  const jaw = add(ball(0.085, 1), MAT.skin, head, 0, 0.065, 0.018, [1.0, 0.9, 1.0]); parts.jawBone = jaw;   // jaw/cheeks
  for (const s of [-1, 1]) add(ball(0.024, 0), MAT.skin, head, s * 0.1, 0.11, -0.005, [0.5, 1, 0.75]);  // ears
  add(new THREE.ConeGeometry(0.016, 0.04, 4), MAT.skin, head, 0, 0.095, 0.105).rotation.x = 1.25;       // nose plane
  // eyes: white almond + dark iris (separate for blink)
  for (const [s, k] of [[-1, 'R'], [1, 'L']]) {
    const eye = pivot('eye' + k, s * 0.038, 0.125, 0.093, head); parts['eye' + k] = eye;
    add(ball(0.019, 1), MAT.eyeW, eye, 0, 0, 0, [1.15, 0.8, 0.45]);
    add(ball(0.012, 1), MAT.black, eye, 0, -0.001, 0.007, [1, 1.1, 0.5]);
    const br = add(new THREE.BoxGeometry(0.05, 0.014, 0.014), MAT.brow, head, s * 0.04, 0.163, 0.093); br.rotation.z = s * -0.08; parts['brow' + k] = br;
  }
  const mouth = pivot('mouth', 0.004, 0.058, 0.098, head); parts.mouth = parts.jaw = mouth;
  const smile = add(new THREE.TorusGeometry(0.017, 0.0045, 3, 6, Math.PI), MAT.lip, mouth); smile.rotation.z = Math.PI;
  // glasses
  const glasses = pivot('glasses', 0, 0.125, 0.11, head); parts.glasses = glasses;
  for (const s of [-1, 1]) {
    const cx = s * 0.039, w = 0.062, h = 0.045, t = 0.008;
    add(new THREE.BoxGeometry(w, t, t), MAT.black, glasses, cx, h / 2); add(new THREE.BoxGeometry(w, t, t), MAT.black, glasses, cx, -h / 2);
    add(new THREE.BoxGeometry(t, h, t), MAT.black, glasses, cx - w / 2); add(new THREE.BoxGeometry(t, h, t), MAT.black, glasses, cx + w / 2);
    add(new THREE.BoxGeometry(0.006, 0.008, 0.11), MAT.black, glasses, s * 0.098, 0.01, -0.055);
  }
  add(new THREE.BoxGeometry(0.018, 0.007, 0.007), MAT.black, glasses, 0, 0.008);
  // headband + zigzag + tails on HIS right (-x)
  const band = pivot('headband', 0, 0.2, 0.0, head); band.rotation.x = -0.12; parts.headband = band;
  add(new THREE.CylinderGeometry(0.108, 0.108, 0.036, 10), MAT.red, band, 0, 0, 0, [1, 1, 1.03]);
  for (let i = 0; i < 6; i++) {
    const a = -0.65 + i * 0.26, x = Math.sin(a) * 0.111, z = Math.cos(a) * 0.111;
    const c = add(new THREE.BoxGeometry(0.03, 0.008, 0.006), MAT.white, band, x, 0, z); c.rotation.y = a; c.rotateZ(i % 2 ? 0.7 : -0.7);
  }
  add(ball(0.02, 0), MAT.red, band, -0.105, -0.005, 0.03);                                                   // knot
  for (const [rz, len, dz] of [[-0.5, 0.13, 0.04], [-0.95, 0.11, 0.02]]) {
    const tail = pivot('tail', -0.11, -0.005, dz, band); tail.rotation.z = rz; tail.rotation.y = -0.3;
    add(new THREE.BoxGeometry(len, 0.03, 0.008), MAT.red, tail, -len / 2);
  }
  // afro: round cloud of faceted clumps hugging the skull (deterministic golden spiral), full back coverage
  const afro = pivot('afro', 0, 0.2, -0.045, head); parts.afro = afro;
  add(ball(0.15, 1), MAT.hair, afro, 0, 0.02, 0, [1.12, 0.95, 1.0]);
  const N = 90, ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 1.8, r = Math.sqrt(Math.max(0, 1 - Math.min(1, y * y))), th = i * ga;
    const nx = Math.cos(th) * r, nz = Math.sin(th) * r;
    if (nz > -0.05 && y < 0.5) continue;                // keep forehead+face clear
    if (y < -0.35 && nz > -0.3) continue;               // only the back drops low (nape)
    const sz = 0.045 + ((i * 37) % 11) / 11 * 0.022;
    const lump = add(new THREE.DodecahedronGeometry(sz, 0), MAT.hair, afro, nx * 0.165, y * 0.14 + 0.02, nz * 0.15);
    lump.rotation.set(i * 1.3, i * 0.7, i * 2.1);
  }
  for (let i = 0; i < 7; i++) { const a = -1.2 + i * 0.4; add(new THREE.DodecahedronGeometry(0.05, 0), MAT.hair, head, Math.sin(a) * 0.09, 0.07 + (i % 2) * 0.03, -0.06 - Math.cos(a) * 0.04).rotation.set(i, i * 2, i * 3); } // nape
  return { root, parts };
}
