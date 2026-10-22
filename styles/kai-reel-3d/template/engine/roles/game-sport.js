import { THREE, BW, BH, D, EYE_Y0, EYE_Y1, mat, rb, at, shell, sleeves } from './kit.js';

// game + sport costume nods (no logos, no letters, no likeness)
const arm = (c, sx) => c.parts.arms.find(a => a.userData.sx === sx);
const setOn = c => c.opts?.noSet !== true;
const FZ = D / 2;                                   // front face z
function cap(T, crown, brim, front) {               // a cap sitting on the head, brim forward above the eyes
  T.add(at(rb(BW + 0.6, 1.3, D + 0.6, 0.5, crown), 0, BH + 0.5, 0));
  if (front) T.add(at(rb(6, 1.0, 0.3, 0.2, front), 0, BH + 0.55, FZ + 0.4));
  T.add(at(rb(BW - 1.5, 0.35, 3.6, 0.15, brim), 0, BH - 0.05, FZ + 1.8));
}
function band(T, m, y, h = 0.8) { T.add(at(rb(BW + 0.8, h, D + 0.8, 0.25, m), 0, y, 0)); }
function sph(r, m, ws = 20) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, ws, ws / 2 + 2), m); s.castShadow = true; return s; }
function cyl(r, h, m, n = 24) { const s = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, n), m); s.castShadow = true; return s; }
function digit7(m, s = 0.5) {                        // a plain block 7
  const g = new THREE.Group(); g.add(at(rb(4 * s, s, s * 0.6, 0.08, m), 0, 3.5 * s, 0));
  for (let i = 0; i < 4; i++) g.add(at(rb(s, s, s * 0.6, 0.08, m), (1.5 - i * 0.5) * s, (2.5 - i) * s, 0));
  return g;
}

export const BUILD = {
  'plumber-nod'(c) {
    const T = c.parts.torso, red = mat('#C2382D'), blue = mat('#2F5FB8'), yel = mat('#F2C641', 0.5);
    shell(T, red); sleeves(c.parts.arms, red);
    shell(T, blue, -0.3, 1.9, 0.5);                                                   // overall trousers
    T.add(at(rb(6.4, 1.3, 0.4, 0.2, blue), 0, 2.4, FZ + 0.65));                     // bib, low (stays under 3.0)
    for (const sx of [-1, 1]) { T.add(at(rb(1.0, 1.8, 0.35, 0.15, blue), sx * 4.1, 2.6, FZ + 0.6)); T.add(at(sph(0.42, yel), sx * 2.4, 2.45, FZ + 0.9)); }
    for (const sx of [-1, 1]) T.add(at(rb(1.0, 3.2, 0.35, 0.15, blue), sx * 4.1, 2.0, -FZ - 0.6));
    cap(T, red, red);
    const mu = mat('#C9955E', 0.95);                                                   // light brown fluffy moustache right under the eye band
    for (const [x, y, r] of [[-3.7, 2.75, 1.0], [-1.9, 2.95, 1.05], [1.9, 2.95, 1.05], [3.7, 2.75, 1.0]]) { const p = sph(r, mu); p.scale.set(1.15, 0.62, 0.6); T.add(at(p, x, y, FZ + 0.45)); }
  },
  'miner-nod'(c) {
    const T = c.parts.torso, cy = mat('#3FB6C8', 0.95), bl = mat('#3346A8', 0.95);
    shell(T, cy); sleeves(c.parts.arms, cy);
    shell(T, bl, -0.3, 1.6, 0.5);
    const pk = new THREE.Group(), wood = mat('#8A5A2E', 0.95), wd2 = mat('#6B4422', 0.95), st = mat('#9AA3AD', 0.9), st2 = mat('#C9D0D8', 0.9), s = 0.8;
    const px = (x, y, m) => pk.add(at(rb(s, s, s, 0.02, m), x * s, y * s, 0));
    for (let i = 0; i < 7; i++) px(i - 3, i - 3, i % 2 ? wood : wd2);                // diagonal handle
    for (const [x, y] of [[0, 4], [1, 4], [2, 4], [3, 3], [4, 2], [4, 1], [-1, 4], [-2, 3], [3, 4], [4, 3]]) px(x, y, (x + y) % 2 ? st : st2);   // pick head
    pk.rotation.z = 0.25; arm(c, 1).add(at(pk, 3.2, 1.0, 0.9));
  },
  'tunic-nod'(c) {
    const T = c.parts.torso, gr = mat('#3E8E3A'), dg = mat('#2D6A2A'), br = mat('#7A4E2A'), gold = mat('#E2B33C', 0.5);
    shell(T, gr); sleeves(c.parts.arms, gr, dg);
    T.add(at(rb(BW + 0.95, 0.8, D + 0.95, 0.2, br), 0, 1.0, 0));
    T.add(at(rb(1.4, 1.0, 0.3, 0.15, gold), 0, 1.0, FZ + 0.55));
    T.add(at(rb(BW + 0.6, 1.0, D + 0.6, 0.45, gr), 0, BH + 0.35, 0));               // cap crown on the head
    const tg = new THREE.ConeGeometry(3.6, 8, 4); tg.rotateY(Math.PI / 4); tg.translate(0, 4, 0); const tail = new THREE.Mesh(tg, gr); tail.castShadow = true;
    tail.scale.z = 0.55; tail.rotation.set(-(Math.PI / 2 + 0.6), 0.5, 0); T.add(at(tail, 0, BH + 0.7, -1.5));   // long floppy tip, down the back
    const sw = new THREE.Group(); sw.add(at(rb(0.55, 6.5, 0.2, 0.05, mat('#D9DDE2', 0.3)), 0, 3.6, 0), at(rb(2.2, 0.4, 0.6, 0.1, gold), 0, 0.3, 0), at(rb(0.55, 1.4, 0.55, 0.2, mat('#3A4FA0')), 0, -0.5, 0));
    arm(c, 1).add(at(sw, 3.0, 0.6, 0.8));
    const sh = new THREE.Group(), face = cyl(2.6, 0.5, mat('#3A4FA0')), rim = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.28, 8, 32), mat('#B9C0C9', 0.4));
    face.rotation.x = Math.PI / 2; sh.add(face, rim, at(rb(1.4, 1.4, 0.3, 0.2, mat('#C9D0D8', 0.4)), 0, 0.3, 0.35)); sh.rotation.y = -0.35;
    arm(c, -1).add(at(sh, -3.0, 0.5, 1.6));
  },
  'crewmate-nod'(c) {
    const T = c.parts.torso, suit = mat('#C51A1A'), dk = mat('#8E1212');
    shell(T, suit); sleeves(c.parts.arms, suit, dk);
    T.add(at(rb(BW + 0.9, BH - EYE_Y1 + 0.45, D + 0.9, 0.5, suit), 0, (EYE_Y1 + BH + 0.45) / 2, 0));   // helmet top above the eyes
    T.add(at(rb(8.6, 1.3, 0.6, 0.5, mat('#A9DCEB', 0.15)), 0, 7.35, FZ + 0.85));      // glass visor band ABOVE the eyes
    T.add(at(rb(3.0, 0.3, 0.1, 0.1, mat('#F4F8FA', 0.1)), 1.8, 7.65, FZ + 1.17));     // shine
    T.add(at(rb(7.5, 5.2, 2.4, 0.9, suit), 0, 3.6, -FZ - 1.4));                      // backpack
  },
  'trainer-nod'(c) {
    const T = c.parts.torso, tee = mat('#2B2B30'), vest = mat('#2F6FD6'), red = mat('#D33A2C'), wh = mat('#F4F1EA', 0.6);
    shell(T, tee); sleeves(c.parts.arms, wh);
    for (const sx of [-1, 1]) T.add(at(rb(3.6, EYE_Y0 - 0.2, 0.4, 0.2, vest), sx * 4.35, (EYE_Y0 - 0.5) / 2, FZ + 0.6));   // open vest panels
    shell(T, vest, -0.3, EYE_Y0 - 0.1, 0.55);
    for (const sx of [-1, 1]) T.add(at(rb(0.4, EYE_Y0 - 0.6, 0.3, 0.15, wh), sx * 2.6, (EYE_Y0 - 0.9) / 2, FZ + 0.75)); // tee edges show through the vest
    cap(T, red, red, wh);
    const ball = new THREE.Group(), top = new THREE.Mesh(new THREE.SphereGeometry(1.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), red), bot = new THREE.Mesh(new THREE.SphereGeometry(1.2, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), wh);
    ball.add(top, bot, cyl(1.22, 0.18, mat('#1C1C1F'))); const btn = cyl(0.38, 0.3, wh); btn.rotation.x = Math.PI / 2; ball.add(at(btn, 0, 0, 1.15));
    arm(c, 1).add(at(ball, 3.2, 0.9, 0.9));
  },
  'pacman-nod'(c) {
    const T = c.parts.torso, y = mat('#F7D21E', 0.6);
    T.add(at(rb(BW + 0.6, 0.9, D + 0.6, 0.35, mat('#2340B8')), 0, BH + 0.35, 0));  // maze-blue headband cap
    const pac = new THREE.Mesh(new THREE.SphereGeometry(1.4, 28, 16, 0.6, Math.PI * 2 - 1.2), y); pac.castShadow = true; pac.rotation.y = Math.PI / 2;
    pac.material.side = THREE.DoubleSide; arm(c, 1).add(at(pac, 3.4, 0.9, 1.0));
    if (setOn(c)) {
      const s = new THREE.Group(); s.name = 'set-pellets'; const pm = mat('#F7D21E', 0.5, '#7A6200'), wall = mat('#2340B8', 0.6);
      for (let i = 0; i < 6; i++) s.add(at(sph(0.45, pm, 14), -8.5 + i * 1.5, 1.0, 7.5));
      s.add(at(sph(0.9, pm), 2.0, 1.4, 7.5));                                         // power pellet
      s.add(at(rb(0.8, 10, 0.8, 0.3, wall), 9, 5.0, -6), at(rb(0.8, 10, 0.8, 0.3, wall), -9, 5.0, 2));   // two maze posts (top bar dropped: the posts no longer line up)
      c.group.add(s);
    }
  },
  'siuu-nod'(c) {
    const T = c.parts.torso, red = mat('#D21F26'), wh = mat('#F4F1EA', 0.7);
    shell(T, red); sleeves(c.parts.arms, red, wh);
    shell(T, wh, -0.3, 1.0, 0.5);                                                      // white shorts
    T.add(at(digit7(wh, 0.55), -3.4, 0.8, FZ + 0.55));                               // small 7 low on the front
    { const b = digit7(wh, 0.6); b.rotation.y = Math.PI; T.add(at(b, 0, 1.0, -FZ - 0.55)); }   // big 7 on the back
    const ball = new THREE.Group(); ball.add(sph(1.25, wh, 24)); const k = mat('#2A2A2E');
    for (const v of [[0, 0, 1], [0.9, 0.4, -0.2], [-0.9, 0.4, -0.2], [0, -0.9, 0.4], [0, 0.95, -0.3]]) { const p = sph(0.4, k, 10); p.scale.set(1, 1, 0.4); p.position.set(...v).normalize().multiplyScalar(1.1); p.lookAt(0, 0, 0); ball.add(p); }
    ball.rotation.set(0.6, 0.5, 0); arm(c, 1).add(at(ball, 3.2, 0.9, 0.9));
  },
  boxer(c) {
    const T = c.parts.torso, robe = mat('#E2B33C', 0.5), trim = mat('#F4F1EA', 0.7), rd = mat('#D0241E', 0.45);
    shell(T, robe); sleeves(c.parts.arms, robe, trim);
    T.add(at(rb(BW + 0.95, 0.7, D + 0.95, 0.2, trim), 0, 1.0, 0));                  // robe sash
    T.add(at(rb(7.5, 2.4, 1.8, 0.8, robe), 0, EYE_Y0 - 0.1, -D / 2 - 1.1));          // hood down
        for (const a of c.parts.arms) { const sx = a.userData.sx, g = rb(2.6, 2.8, 3.0, 1.1, rd); a.add(at(g, sx * 3.2, 0.1, 0.3)); a.add(at(rb(0.6, 2.6, 2.8, 0.25, trim), sx * 2.0, 0, 0.2)); }
  },
  referee(c) {
    const T = c.parts.torso, wh = mat('#F4F2EE', 0.8), bk = mat('#1C1C1F');
    shell(T, wh); sleeves(c.parts.arms, bk, wh);
    const y0 = -0.25, y1 = EYE_Y0 - 0.05, h = y1 - y0, cy = (y0 + y1) / 2;                      // stripes stop below 3.0
    for (let i = 0; i < 5; i++) { const x = -4.8 + i * 2.4; T.add(at(rb(1.0, h, 0.2, 0.08, bk), x, cy, FZ + 0.5), at(rb(1.0, h, 0.2, 0.08, bk), x, cy, -FZ - 0.5)); }
    for (const sx of [-1, 1]) for (const z of [-3, 0, 3]) T.add(at(rb(0.2, h, 1.0, 0.08, bk), sx * (BW / 2 + 0.5), cy, z));
    T.add(at(rb(BW + 0.6, 0.8, D + 0.6, 0.35, bk), 0, BH + 0.3, 0));                 // black cap crown
    T.add(at(rb(BW - 2, 0.3, 3.0, 0.12, bk), 0, BH, FZ + 1.5));
    const card = rb(2.0, 2.8, 0.2, 0.1, mat('#E0221B', 0.6)); card.rotation.z = -0.15; arm(c, 1).add(at(card, 3.2, 2.0, 0.8));
    const wsl = new THREE.Group(), sv = mat('#C9CED6', 0.3); const bd = cyl(0.55, 1.2, sv); bd.rotation.z = Math.PI / 2; wsl.add(bd, at(rb(0.9, 0.45, 0.6, 0.15, sv), 0.9, 0.3, 0));
    arm(c, -1).add(at(wsl, -3.0, 0.6, 0.9));
  },
  f1(c) {
    const T = c.parts.torso, suit = mat('#D0241E', 0.6), wh = mat('#F4F1EA', 0.6), dk = mat('#2A2D33');
    shell(T, suit); sleeves(c.parts.arms, suit, wh);
    T.add(at(rb(BW + 0.95, 0.5, D + 0.95, 0.15, wh), 0, 1.6, 0));                   // suit stripe
    T.add(at(rb(BW + 0.95, 0.6, D + 0.95, 0.2, dk), 0, 0.6, 0));                    // belt band
    for (const sx of [-1, 1]) T.add(at(rb(0.12, 0.6, D + 0.4, 0.05, wh), sx * (BW / 2 + 0.44), 1.6, 0));   // side stripes
    const hm = new THREE.Group(), shellM = mat('#F4F1EA', 0.35); const dome = sph(1.9, shellM, 28); dome.scale.set(1, 1.05, 1.1); hm.add(dome);
    hm.add(at(rb(2.8, 0.9, 1.0, 0.4, mat('#2A3A55', 0.15)), 0, 0.25, 1.6));          // visor (on the helmet, not the face)
    hm.add(at(rb(0.6, 0.5, 4.0, 0.2, suit), 0, 1.75, 0));                              // helmet stripe
    arm(c, -1).add(at(hm, -3.5, 0.6, 1.4));
    if (setOn(c)) {
      const s = new THREE.Group(); s.name = 'set-flag'; s.position.set(10, 2, -3);
      s.add(at(cyl(0.18, 13, mat('#B8BEC6', 0.4), 8), 0, 4.5, 0));
      for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) s.add(at(rb(1, 1, 0.15, 0.02, (i + j) % 2 ? dk : wh), -0.6 - i, 10.4 - j, 0));
      c.group.add(s);
    }
  },
  'gym-bro'(c) {
    const T = c.parts.torso, tank = mat('#5A6270'), sw = mat('#F4F1EA', 0.9), rd = mat('#C2382D');
    shell(T, tank);                                                                    // tank top: no sleeves, bare arms
    for (const sx of [-1, 1]) T.add(at(rb(0.25, EYE_Y0 - 0.5, D - 2, 0.08, mat('#474E5A')), sx * (BW / 2 + 0.55), (EYE_Y0 - 0.5) / 2, 0));   // arm-hole trim
    band(T, sw, 7.2, 1.0); T.add(at(rb(BW + 0.85, 0.25, D + 0.85, 0.1, rd), 0, 7.2, 0));   // sweatband above the eyes
    for (const sx of [-1, 1]) { for (const z of [FZ + 0.5, -FZ - 0.5]) T.add(at(rb(1.0, BH - 0.3 - EYE_Y0 + 0.1, 0.3, 0.12, tank), sx * 5.2, (EYE_Y0 - 0.1 + BH - 0.3) / 2, z)); }   // shoulder straps
    const db = new THREE.Group(), ir = mat('#6A707C', 0.5), bar = cyl(0.22, 4.2, mat('#B8BEC6', 0.3)); bar.rotation.z = Math.PI / 2; db.add(bar);
    for (const x of [-1.7, 1.7]) { const p = cyl(1.2, 0.7, ir); p.rotation.z = Math.PI / 2; db.add(at(p, x, 0, 0)); }
    arm(c, 1).add(at(db, 3.0, 0.8, 0.6));
  },
};
