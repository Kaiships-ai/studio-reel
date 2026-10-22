import { THREE, BW, BH, D, EYE_Y0, EYE_Y1, mat, rb, at, shell, sleeves } from './kit.js';

// seasons batch (halloween + holiday): ghost, pumpkin, vampire, mummy, witch, santa, mua-lan, trung-thu, cupid, astronaut, cowboy, caveman
const hand = (c, sx) => c.parts.arms.find(x => x.userData.sx === sx);
const F = D / 2, S = BW / 2;
const cyl = (rt, rbm, h, m, seg = 24) => { const x = new THREE.Mesh(new THREE.CylinderGeometry(rt, rbm, h, seg), m); x.castShadow = true; return x; };
const ext = (shape, depth, m) => { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2 }); g.center(); const x = new THREE.Mesh(g, m); x.castShadow = true; return x; };
function star(R, r) { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r : R; i ? s.lineTo(Math.cos(a) * q, Math.sin(a) * q) : s.moveTo(Math.cos(a) * q, Math.sin(a) * q); } s.closePath(); return s; }
function heart(k) { const s = new THREE.Shape(); s.moveTo(0, -1 * k); s.bezierCurveTo(1.4 * k, -0.1 * k, 1.1 * k, 1.0 * k, 0, 0.45 * k); s.bezierCurveTo(-1.1 * k, 1.0 * k, -1.4 * k, -0.1 * k, 0, -1 * k); return s; }
// a back cape: thick panel behind the body plus side wraps, stops at y -1.8
function cape(T, m, lin, top = EYE_Y1 + 0.6) {
  const y0 = -1.8, h = top - y0, cy = (y0 + top) / 2;
  T.add(at(rb(BW + 1.6, h, 0.6, 0.3, m), 0, cy, -F - 0.6));
  if (lin) T.add(at(rb(BW + 1.0, h - 0.4, 0.12, 0.05, lin), 0, cy, -F - 0.24));
  for (const sx of [-1, 1]) { T.add(at(rb(0.6, h, 5.0, 0.3, m), sx * (S + 0.5), cy, -F + 1.8)); if (lin) T.add(at(rb(0.12, h - 0.4, 4.6, 0.05, lin), sx * (S + 0.17), cy, -F + 1.8)); }
}

export const BUILD = {
  ghost(c) {
    const T = c.parts.torso, w = mat('#F4F3EF', 0.95), z = F + 0.35, t = 0.4;
    const hx0 = 2.55, hx1 = 4.45, hy0 = EYE_Y0 - 0.15, hy1 = EYE_Y1 + 0.15, top = BH + 0.4, bot = -1.3;   // two eye holes exactly over the slots
    const box = (x0, x1, y0, y1) => T.add(at(rb(x1 - x0, y1 - y0, t, 0.15, w), (x0 + x1) / 2, (y0 + y1) / 2, z));
    box(-S - 0.4, S + 0.4, bot, hy0); box(-S - 0.4, S + 0.4, hy1, top);
    box(-S - 0.4, -hx1, hy0, hy1); box(-hx0, hx0, hy0, hy1); box(hx1, S + 0.4, hy0, hy1);
    const h = top - bot, cy = (top + bot) / 2;
    T.add(at(rb(BW + 0.8, h, t, 0.15, w), 0, cy, -F - 0.35));
    for (const sx of [-1, 1]) T.add(at(rb(t, h, D + 1.1, 0.15, w), sx * (S + 0.35), cy, 0));
    T.add(at(rb(BW + 1.2, 1.4, D + 1.1, 0.7, w), 0, top - 0.2, 0));                              // soft rounded top
    [[-4.9, 0.5, 2.0], [-2.6, 0.25, 1.8], [-0.2, 0.6, 2.1], [2.3, 0.3, 1.9], [4.8, 0.55, 2.0]].forEach(([x, d, wd]) => { for (const zz of [z, -F - 0.35]) T.add(at(rb(wd, 0.8, 0.55, 0.38, w), x, bot - 0.05 - d, zz)); });   // uneven hem, lowest tab y -1.95
    const fg = mat('#E6E6EA', 0.95); for (const [x, h] of [[-4.3, 2.6], [-1.3, 1.9], [1.6, 2.3], [4.5, 2.7]]) T.add(at(rb(2.3, h, 0.3, 0.6, fg), x, bot + h / 2, z + 0.25));   // very soft drape folds, lower half only (top < 1.5)
    sleeves(c.parts.arms, w);
  },
  pumpkin(c) {
    const T = c.parts.torso, blk = mat('#1B1B20'), lin = mat('#3A2E5A'), pm = mat('#E8781E', 0.7), pm2 = mat('#C9611A', 0.7);
    cape(T, blk, lin);
    T.add(at(rb(BW + 1.4, 0.7, 2.2, 0.3, blk), 0, BH - 0.2, -F + 0.5));                          // cape collar on the shoulders, behind the eyes
    const g = new THREE.Group(); g.position.set(0, BH + 2.8, 0); T.add(g);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, lobe = new THREE.Mesh(new THREE.SphereGeometry(2.5, 20, 14), i % 2 ? pm : pm2);
      lobe.scale.set(0.75, 1, 0.75); lobe.position.set(Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2); lobe.castShadow = true; g.add(lobe); }
    const core = new THREE.Mesh(new THREE.SphereGeometry(3.4, 24, 16), pm); core.scale.y = 0.75; g.add(core);
    g.add(at(cyl(0.45, 0.6, 1.6, mat('#4E6B2E')), 0, 2.7, 0));
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), mat('#6B8E3A')); leaf.scale.set(1.4, 0.3, 0.8); g.add(at(leaf, 1.0, 2.3, 0.3));
    g.add(at(cyl(3.4, 3.4, 0.6, pm2, 28), 0, -2.3, 0));                                          // seat so the pumpkin touches the head
  },
  vampire(c) {
    const T = c.parts.torso, blk = mat('#16161B'), red = mat('#B3202A'), hair = mat('#141418', 0.4);
    cape(T, blk, red, BH);
    T.add(at(rb(BW + 2.2, 4.2, 0.6, 0.3, blk), 0, BH + 1.6, -F - 0.7), at(rb(BW + 1.4, 3.6, 0.15, 0.05, red), 0, BH + 1.7, -F - 0.33));   // high collar standing behind the head, red inside
    for (const sx of [-1, 1]) { const cg = new THREE.Group(); cg.position.set(sx * (S + 0.6), BH + 1.6, -F - 0.4); cg.rotation.y = sx * 0.5; T.add(cg);   // side panels flare out like a cape collar
      cg.add(at(rb(0.6, 4.2, 3.0, 0.3, blk), 0, 0, 1.3), at(rb(0.15, 3.6, 2.6, 0.05, red), -sx * 0.36, 0.1, 1.3)); }
    T.add(at(rb(BW - 0.2, 0.6, D - 0.2, 0.28, hair), 0, BH + 0.2, 0));                            // slicked hair, flat on the top face
    const peak = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.2, 3), hair); peak.rotation.x = Math.PI / 2; peak.scale.y = 0.4; T.add(at(peak, 0, BH + 0.45, F - 0.6));   // widow's peak, on top only
    T.add(at(rb(BW + 0.6, 0.5, 3, 0.2, blk), 0, EYE_Y0 - 0.4, -F + 0.6));                         // cape tie line at the back only (nothing dark on the front)
  },
  mummy(c) {
    const T = c.parts.torso, b1 = mat('#E9E1CC', 0.95), b2 = mat('#D8CDB2', 0.95), t = 0.35;
    const band = (y, h, rot, m) => { const g = new THREE.Group(); g.position.y = y; g.rotation.z = rot;
      g.add(at(rb(BW + 2 * t, h, t, 0.12, m), 0, 0, F + t / 2), at(rb(BW + 2 * t, h, t, 0.12, m), 0, 0, -F - t / 2));
      for (const sx of [-1, 1]) g.add(at(rb(t, h, D + 2 * t, 0.12, m), sx * (S + t / 2), 0, 0)); T.add(g); };
    [[0.2, 1.1, 0.03], [1.15, 1.0, -0.04], [2.1, 1.05, 0.05], [3.0, 0.9, -0.02]].forEach(([y, h, r], i) => band(y, h, r, i % 2 ? b2 : b1));   // lower wraps, under the eye band
    [[6.9, 0.9, 0.03], [7.7, 0.9, -0.03]].forEach(([y, h, r], i) => band(y, h, r, i % 2 ? b1 : b2));   // upper wraps, above the eyes
    T.add(at(rb(BW + 0.6, 0.4, D + 0.6, 0.18, b1), 0, BH + 0.1, 0));
    for (const sx of [-1, 1]) T.add(at(rb(0.9, 2.6, 0.4, 0.15, b2), sx * (S - 0.2), (EYE_Y0 + EYE_Y1) / 2, F + 0.25));   // side strips at the edge of the face, eyes free
    const tail = rb(0.9, 3.0, 0.3, 0.12, b1); tail.rotation.z = 0.3; T.add(at(tail, -S - 0.3, 1.0, -F + 1));   // loose end
    for (const a of c.parts.arms) { const sx = a.userData.sx; a.add(at(rb(2.1, 2.3, 2.6, 0.5, b1), sx * 1.0, 0, 0), at(rb(0.45, 2.45, 2.75, 0.2, b2), sx * 1.6, 0, 0)); }
  },
  witch(c) {
    const T = c.parts.torso, pur = mat('#5B3A8C'), dk = mat('#432A6A'), hat = mat('#2A1F3D', 0.7), grn = mat('#6BAF5A');
    shell(T, pur, -1.0); sleeves(c.parts.arms, pur, dk);
    T.add(at(rb(BW + 0.9, 0.6, D + 0.9, 0.25, dk), 0, EYE_Y0 - 0.3, 0));                        // robe collar
    T.add(at(cyl(7.2, 7.2, 0.35, hat, 40), 0, BH + 0.2, 0));                                     // brim on the head
    T.add(at(cyl(3.4, 3.4, 0.9, grn, 32), 0, BH + 0.8, 0));                                     // hat band
    const cone = new THREE.Group(); cone.position.set(0, BH + 0.3, 0); T.add(cone);
    cone.add(at(cyl(1.6, 3.5, 4.0, hat, 32), 0, 2.0, 0));
    const tip = cyl(0.15, 1.6, 3.6, hat, 24); tip.rotation.z = -0.35; cone.add(at(tip, 0.6, 5.6, 0));
    const br = new THREE.Group(), a = hand(c, 1); br.rotation.z = 0.25; a.add(at(br, 2.9, 0.3, 0.9));   // broom
    br.add(at(cyl(0.3, 0.3, 9, mat('#8A5A2B')), 0, 0.6, 0), at(cyl(0.6, 1.8, 3.2, mat('#D8B25A')), 0, -4.0, 0), at(cyl(0.7, 0.7, 0.5, mat('#7A4A22')), 0, -2.3, 0));
  },
  santa(c) {
    const T = c.parts.torso, red = mat('#C6282B'), wt = mat('#F6F4EE', 0.95), blk = mat('#1E1E22', 0.6), gold = mat('#E2B33C', 0.5);
    shell(T, red, -0.8); sleeves(c.parts.arms, red, wt);
    T.add(at(rb(BW + 1.1, 0.9, D + 1.1, 0.4, wt), 0, -0.6, 0));                                  // white hem
    T.add(at(rb(BW + 1.1, 0.8, D + 1.1, 0.35, wt), 0, EYE_Y0 - 0.3, 0));                        // white collar
    T.add(at(rb(BW + 0.95, 0.8, D + 0.95, 0.2, blk), 0, 1.2, 0));                                // black belt, low
    T.add(at(rb(1.6, 1.1, 0.3, 0.15, gold), 0, 1.2, F + 0.6));
    T.add(at(rb(BW + 1.0, 1.0, D + 1.0, 0.45, wt), 0, BH + 0.3, 0));                             // hat fur band on the head
    const hat = new THREE.Group(); hat.position.set(0, BH + 0.7, 0); T.add(hat);
    hat.add(at(cyl(2.8, 5.6, 3.2, red, 32), 0, 1.6, 0));
    const tip = cyl(0.3, 2.8, 4.2, red, 24); tip.position.set(2.0, 4.2, 0); tip.rotation.z = -1.0; hat.add(tip);
    hat.add(at(new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 12), wt), 4.0, 5.0, 0));
    const sack = new THREE.Group(), a = hand(c, -1); a.add(at(sack, -3.6, -0.8, -1.0));          // gift sack
    const s = new THREE.Mesh(new THREE.SphereGeometry(2.6, 20, 14), mat('#8B5A34', 0.95)); s.scale.set(1, 1.15, 1); s.castShadow = true; sack.add(s);
    sack.add(at(cyl(0.6, 1.0, 1.0, mat('#7A4C2A')), 0, 3.0, 0), at(cyl(0.35, 0.35, 1.4, mat('#C6282B')), 0, 3.0, 0));
  },
  'mua-lan'(c) {
    const T = c.parts.torso, red = mat('#D12A22', 0.7), gold = mat('#F0B93A', 0.5), wt = mat('#FBF7EE'), blk = mat('#151515', 0.4), grn = mat('#3E9A5A');
    const H = new THREE.Group(); H.position.set(0, BH, 0.5); H.scale.setScalar(0.72); T.add(H);                           // big lion head on top, sits on the head (y >= 8)
    H.add(at(rb(BW + 2, 6.2, D + 2, 2.2, red), 0, 3.3, 0));
    H.add(at(rb(BW + 2.4, 0.9, D + 2.4, 0.4, gold), 0, 0.45, 0));                                 // gold jaw rim resting on the head
    for (const sx of [-1, 1]) {
      H.add(at(new THREE.Mesh(new THREE.SphereGeometry(1.7, 20, 14), wt), sx * 3.2, 4.0, F + 0.9));   // big lion eyes, high on the head
      H.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12), blk), sx * 3.2, 4.1, F + 2.3));
      H.add(at(rb(3.4, 0.7, 0.8, 0.3, gold), sx * 3.2, 5.9, F + 1.0));                              // brows
      const ear = rb(2.2, 2.6, 0.7, 0.4, gold); ear.rotation.z = sx * -0.5; H.add(at(ear, sx * 7.2, 5.8, 0));
      for (let k = 0; k < 3; k++) H.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 10), wt), sx * (S + 1.2), 1.6 + k * 1.4, F - 0.5));   // white fur on the cheeks
    }
    H.add(at(rb(3.0, 1.6, 1.6, 0.7, gold), 0, 2.4, F + 1.5));                                      // nose
    const horn = cyl(0.2, 1.0, 2.6, gold); H.add(at(horn, 0, 7.6, 0.5));
    H.add(at(new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 12), grn), 0, 6.9, F - 1.0));       // mirror-green forehead gem
    for (let i = 0; i < 5; i++) H.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 10), i % 2 ? gold : wt), -4 + i * 2, 6.5, -1.5));   // pompoms on top
    T.add(at(rb(BW + 1.6, BH + 1.6, 0.6, 0.3, red), 0, (BH - 1.6) / 2 + 0.8, -F - 0.6));           // the lion body cloth down the back
    for (let i = 0; i < 6; i++) T.add(at(rb(1.8, 0.6, 0.7, 0.25, gold), -5 + i * 2, -1.5, -F - 0.6));   // fringe, above ground
  },
  'trung-thu'(c) {
    const T = c.parts.torso, ao = mat('#EDE6D2', 0.95), qu = mat('#4A3C30'), red = mat('#D8262B', 0.6, '#7A0D10'), gold = mat('#F2C14E', 0.5);
    shell(T, ao); sleeves(c.parts.arms, ao, ao);
    T.add(at(rb(BW + 0.9, 0.5, D + 0.9, 0.22, ao), 0, EYE_Y0 - 0.2, 0));                         // round neck
    for (const sx of [-1, 1]) T.add(at(rb(2.6, 1.8, 0.3, 0.3, mat('#E2D9C0')), sx * 3.2, 0.8, F + 0.5));   // two low pockets of the áo bà ba
    T.add(at(rb(BW + 0.85, 0.7, D + 0.85, 0.25, qu), 0, -0.6, 0));                               // trouser band at the hem
    const L = new THREE.Group(), a = hand(c, 1); a.add(at(L, 2.9, 0.8, 0.9));                     // star lantern on a stick
    const stick = cyl(0.22, 0.22, 6, mat('#A8803C')); stick.rotation.z = -0.35; L.add(at(stick, 1.0, 2.6, 0));
    const st = ext(star(2.4, 1.0), 1.4, red); st.position.set(0.8, 6.6, 0.3); L.add(st);
    const glow = ext(star(1.3, 0.6), 1.6, mat('#FFD66B', 0.4, '#F2A800')); glow.position.set(0.8, 6.6, 0.45); L.add(glow);
  },
  cupid(c) {
    const T = c.parts.torso, wt = mat('#FBF9F4', 0.9), gold = mat('#F2C14E', 0.4), pk = mat('#E8577A', 0.6), wd = mat('#B07A3A');
    T.add(at(rb(BW + 0.9, 1.6, D + 0.9, 0.5, wt), 0, 0.3, 0));                                    // little white sash wrap, low
    for (const sx of [-1, 1]) {                                                                    // wings attached to the back, with thickness
      const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.bezierCurveTo(2, 3.5, 5, 4.2, 6.5, 3.2); sh.bezierCurveTo(5.5, 2.2, 5.8, 1.2, 4.6, 0.6); sh.bezierCurveTo(4.2, -0.6, 2.4, -1.2, 0, -1.2); sh.closePath();
      const w = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.7, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 2 }), wt); w.castShadow = true;
      w.scale.set(sx * 1.35, 1.35, 1); w.rotation.y = sx * 0.2; w.position.set(sx * 1.0, 5.0, -F - 0.7); T.add(w);
      T.add(at(rb(2.4, 2.4, 0.9, 0.4, wt), sx * 1.6, 4.4, -F - 0.3)); }                             // wing roots touch the back
    const halo = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.4, 12, 40), gold); halo.rotation.x = Math.PI / 2; T.add(at(halo, 0, BH + 0.4, 0));   // halo resting on the head
    const bow = new THREE.Group(), a = hand(c, -1); a.add(at(bow, -3.0, 0.5, 1.0));
    const arc = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.25, 8, 30, Math.PI), wd); arc.rotation.z = Math.PI / 2; bow.add(arc);
    bow.add(at(cyl(0.05, 0.05, 6.8, mat('#EDE6D2')), 0, 0, 0));
    const ar = new THREE.Group(), b = hand(c, 1); b.add(at(ar, 3.0, 0.6, 1.2)); ar.rotation.z = 0.5;
    ar.add(at(cyl(0.14, 0.14, 7, wd), 0, 0, 0)); const hh = ext(heart(1.2), 0.6, pk); ar.add(at(hh, 0, 4.0, 0));
    ar.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 3), pk), 0, -3.6, 0));
  },
  astronaut(c) {
    const T = c.parts.torso, wt = mat('#EEF0F2', 0.8), gr = mat('#B9C0C8', 0.7), bl = mat('#2F6FDB'), red = mat('#C2382D');
    shell(T, wt, -0.6); sleeves(c.parts.arms, wt, gr);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(8.9, 0.6, 14, 48), gr); ring.rotation.x = Math.PI / 2; ring.scale.y = 0.87; T.add(at(ring, 0, EYE_Y0 - 0.55, 0));   // neck seal ring, below the eyes
    const gm = mat('#CFE6FF', 0.2); gm.transparent = true; gm.opacity = 0.18; gm.depthWrite = false;
    const bub = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, 1.84), gm); bub.scale.set(9.2, 6.8, 8.0); bub.renderOrder = 2; T.add(at(bub, 0, 5.0, 0));   // clear bubble helmet, eyes seen through it
    T.add(at(rb(BW + 1.2, 0.8, D + 1.2, 0.35, gr), 0, EYE_Y0 - 0.3, 0));                         // suit neck seal
    T.add(at(rb(3.4, 1.6, 0.4, 0.3, gr), 3.2, 1.2, F + 0.55), at(rb(0.6, 0.6, 0.3, 0.1, bl), 2.4, 1.2, F + 0.8), at(rb(0.6, 0.6, 0.3, 0.1, red), 3.4, 1.2, F + 0.8));   // chest control box, low
    T.add(at(rb(BW - 2, 7, 3, 0.8, wt), 0, 3.6, -F - 1.9), at(rb(BW - 3, 1.0, 3.2, 0.3, gr), 0, 6.4, -F - 1.9));   // backpack
    T.add(at(rb(BW + 0.9, 0.7, D + 0.9, 0.25, gr), 0, 0.2, 0));                                  // waist ring
    const fl = new THREE.Group(), a = hand(c, -1); a.add(at(fl, -3.0, 0.6, 1.0));                // plain flag (no text)
    fl.add(at(cyl(0.18, 0.18, 10, gr), 0, 3.0, 0), at(rb(4.2, 2.6, 0.2, 0.05, red), -2.2, 6.6, 0), at(rb(1.4, 2.6, 0.24, 0.05, mat('#F6F4EE')), -3.6, 6.6, 0));
  },
  cowboy(c) {
    const T = c.parts.torso, tee = mat('#D9CBA8'), vest = mat('#7A4A26'), hat = mat('#A0703A', 0.7), band = mat('#5A3A1E'), red = mat('#C2382D'), rope = mat('#C9A86A');
    shell(T, tee); sleeves(c.parts.arms, tee, tee);
    for (const sx of [-1, 1]) T.add(at(rb(3.4, EYE_Y0 - 0.1, 0.35, 0.25, vest), sx * (S - 1.5), (EYE_Y0 - 0.25) / 2, F + 0.55));   // open vest front panels at the sides
    T.add(at(rb(BW + 1.0, EYE_Y0 - 0.1, 0.35, 0.25, vest), 0, (EYE_Y0 - 0.25) / 2, -F - 0.55));
    T.add(at(rb(BW + 1.0, 0.6, D + 1.0, 0.25, red), 0, EYE_Y0 - 0.3, 0));                        // bandana round the neck
    const knot = rb(1.6, 1.4, 0.5, 0.3, red); knot.rotation.z = 0.6; T.add(at(knot, -S - 0.5, EYE_Y0 - 0.6, 2));
    const brim = cyl(8.0, 8.0, 0.4, hat, 40); brim.scale.z = 0.8; T.add(at(brim, 0, BH + 0.3, 0));
    for (const sx of [-1, 1]) { const curl = rb(1.2, 1.4, 6.4, 0.5, hat); curl.rotation.z = sx * 0.45; T.add(at(curl, sx * 7.4, BH + 0.8, 0)); }   // brim curls
    T.add(at(rb(6.4, 4.6, 5.2, 1.0, hat), 0, BH + 2.8, 0), at(rb(7.2, 0.7, 5.8, 0.3, band), 0, BH + 1.0, 0));
    T.add(at(rb(0.6, 0.8, 3.6, 0.25, band), 0, BH + 5.0, 0));                                     // crown dent
    const la = new THREE.Group(), a = hand(c, 1); a.add(at(la, 3.0, 0.6, 1.0));                   // lasso
    const loop = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.25, 8, 36), rope); loop.position.set(1.2, 6.0, 0); loop.rotation.x = 1.1; la.add(loop);
    const r = cyl(0.22, 0.22, 4.4, rope); r.rotation.z = -0.4; la.add(at(r, 0.9, 2.2, 0));
    const coil = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.25, 8, 24), rope); coil.rotation.y = Math.PI / 2; la.add(coil);
  },
  caveman(c) {
    const T = c.parts.torso, pel = mat('#D9A24A'), spot = mat('#6A4422'), wd = mat('#8A5A2B', 0.95), wd2 = mat('#6E4520', 0.95);
    shell(T, pel, -0.8, 2.6);                                                                       // pelt, stops well below the eyes
    T.add(at(rb(0.4, BH - 2.4, 2.2, 0.2, pel), S + 0.2, (BH + 2.4) / 2, 0));                   // one-shoulder strap on the side face, eyes free
    T.add(at(rb(2.2, 0.4, D + 0.4, 0.15, pel), S - 0.7, BH + 0.2, 0));
    [[-4.5, 0.2], [-2.0, 1.4], [0.6, 0.0], [3.0, 1.2], [4.8, -0.2], [-0.8, 2.0]].forEach(([x, y]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), spot); s.scale.set(1.2, 0.8, 0.3); T.add(at(s, x, y, F + 0.42)); });
    for (const sx of [-1, 1]) for (const [z, y] of [[-2, 0.5], [1.5, 1.6]]) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), spot); s.scale.set(0.3, 0.8, 1.2); T.add(at(s, sx * (S + 0.42), y, z)); }
    for (let i = 0; i < 5; i++) { const tuft = rb(1.6, 0.9, 0.5, 0.3, pel); tuft.rotation.z = (i % 2 ? 0.3 : -0.3); T.add(at(tuft, -4.8 + i * 2.4, -0.9, F + 0.4)); }   // ragged hem
    const cl = new THREE.Group(), a = hand(c, 1); cl.rotation.z = -0.3; a.add(at(cl, 3.0, 0.6, 1.0));   // wooden club
    cl.add(at(cyl(0.4, 0.4, 3.6, wd2), 0, 0, 0), at(cyl(1.5, 0.6, 5, wd), 0, 4.2, 0), at(new THREE.Mesh(new THREE.SphereGeometry(1.5, 14, 10), wd), 0, 6.7, 0));
  },
};
