import { THREE, BW, BH, D, EYE_Y0, EYE_Y1, mat, rb, at, shell, sleeves } from './kit.js';

// office + job roles (batch 2026-10-17)
const F = D / 2;                                    // front face z
const hand = (c, sx = 1) => c.parts.arms.find(a => a.userData.sx === sx);
const cyl = (rt, rbt, h, m, seg = 24) => { const x = new THREE.Mesh(new THREE.CylinderGeometry(rt, rbt, h, seg), m); x.castShadow = true; return x; };
const tor = (r, t, m, arc = Math.PI * 2) => new THREE.Mesh(new THREE.TorusGeometry(r, t, 10, 36, arc), m);
function cup(m, lid) { const g = new THREE.Group(); g.add(cyl(0.8, 0.62, 1.9, m)); if (lid) g.add(at(cyl(0.86, 0.86, 0.3, lid), 0, 1.05, 0)); return g; }
function coatFront(T, m, y1 = EYE_Y0 - 0.05) {       // two lapels meeting in a V on the front
  for (const sx of [-1, 1]) { const l = rb(2.2, y1 + 0.2, 0.25, 0.1, m); l.rotation.z = sx * 0.28; T.add(at(l, sx * 1.6, y1 / 2, F + 0.55)); }
}

export const BUILD = {
  ceo(c) {
    const T = c.parts.torso, suit = mat('#1F2430'), shirt = mat('#F1ECE2'), tie = mat('#C2382D');
    shell(T, suit); sleeves(c.parts.arms, suit, shirt);
    T.add(at(rb(3.4, EYE_Y0 - 0.3, 0.2, 0.1, shirt), 0, (EYE_Y0 - 0.3) / 2 + 0.1, F + 0.45));   // shirt V
    coatFront(T, mat('#2A3040'));
    const knot = rb(0.9, 0.7, 0.4, 0.15, tie); T.add(at(knot, 0, EYE_Y0 - 0.55, F + 0.7));
    const blade = rb(0.9, 2.6, 0.3, 0.2, tie); T.add(at(blade, 0, EYE_Y0 - 2.15, F + 0.68));
    T.add(at(rb(0.2, 0.2, 0.6, 0.05, mat('#E2B33C', 0.4)), -3.6, 2.6, F + 0.7));                  // lapel pin
    const ph = new THREE.Group(); ph.add(rb(0.4, 3.0, 1.6, 0.2, mat('#15171C', 0.4)), at(rb(0.05, 2.6, 1.3, 0.05, mat('#3A4A66', 0.3)), 0.2, 0, 0));
    hand(c, 1).add(at(ph, 2.6, 0.9, 0.4));
  },
  intern(c) {
    const T = c.parts.torso, sh = mat('#E8E4DA'), blue = mat('#3E6FB0');
    shell(T, sh); sleeves(c.parts.arms, sh, mat('#D2CDC0'));
    const fr = mat('#2A2A2A', 0.5);                                                                // oversized glasses: rims around the eyes, bridge above
    for (const sx of [-1, 1]) { const r = tor(1.6, 0.2, fr); r.scale.set(0.95, 0.8, 1); T.add(at(r, sx * 3.5, (EYE_Y0 + EYE_Y1) / 2, F + 0.6));   // rims kept inside 3.75..6.3, in front of the shirt
      T.add(at(rb(0.25, 0.25, 4, 0.1, fr), sx * (BW / 2 + 0.1), 5.2, F - 1.6)); }                     // arms along the side faces
    T.add(at(rb(3.7, 0.28, 0.28, 0.1, fr), 0, 5.0, F + 0.6));                                         // bridge between the rims
    for (const sx of [-1, 1]) { const s = rb(0.25, 3.6, 0.15, 0.05, blue); s.rotation.z = sx * 0.35; T.add(at(s, sx * 0.7, 1.9, F + 0.5)); }   // lanyard
    const badge = new THREE.Group(); badge.add(rb(2.6, 1.5, 0.15, 0.15, mat('#FFFFFF', 0.5)), at(rb(2.6, 0.45, 0.17, 0.1, blue), 0, 0.5, 0));
    T.add(at(badge, 0, 0.55, F + 0.6));                                                            // badge, blank (no text needed at reel size)
    hand(c, 1).add(at(cup(mat('#F1ECE2', 0.5), mat('#6B4A33')), 2.9, 1.1, 0.6));
  },
  cto(c) {
    const T = c.parts.torso, vest = mat('#3E4C6A', 0.7), tee = mat('#9AA3B0');
    shell(T, tee, -0.25, EYE_Y0 - 0.05, 0.2); sleeves(c.parts.arms, tee);
    for (let i = 0; i < 3; i++) { const y = 0.6 + i * 1.05;                                         // puffy quilted rings
      T.add(at(rb(BW + 1.4, 1.0, D + 1.4, 0.48, vest), 0, y, 0)); }
    T.add(at(rb(0.12, EYE_Y0 - 0.2, 0.1, 0.04, mat('#B8C0CC', 0.3)), 0, (EYE_Y0 - 0.2) / 2, F + 0.72));   // zipper
    const w = mat('#FFFFFF', 0.3);                                                                  // white earbuds on the sides
    for (const sx of [-1, 1]) { T.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), w), sx * (BW / 2 + 0.35), EYE_Y1 + 0.2, 0));
      const stem = cyl(0.3, 0.3, 1.3, w, 12); stem.rotation.x = 0.5; T.add(at(stem, sx * (BW / 2 + 0.4), EYE_Y1 - 0.4, 0.3)); }
    const l = cup(mat('#FFFFFF', 0.5), mat('#E8DCC8')); l.scale.set(0.9, 1.25, 0.9); hand(c, 1).add(at(l, 2.9, 1.2, 0.6));
  },
  firefighter(c) {
    const T = c.parts.torso, coat = mat('#C9A227'), refl = mat('#E8E8E0', 0.3), red = mat('#C2382D', 0.6);
    shell(T, coat); sleeves(c.parts.arms, coat, refl);
    T.add(at(rb(BW + 0.95, 0.55, D + 0.95, 0.2, refl), 0, 0.9, 0), at(rb(BW + 0.95, 0.55, D + 0.95, 0.2, refl), 0, 2.6, 0));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(4.2, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), red); dome.scale.set(1.3, 0.8, 1.05); T.add(at(dome, 0, BH, 0));
    const brim = cyl(6.6, 6.6, 0.3, red, 40); brim.scale.set(1, 1, 0.85); T.add(at(brim, 0, BH + 0.1, -1.0));   // long back brim
    T.add(at(rb(2.4, 2.2, 0.3, 0.3, mat('#E2B33C', 0.4)), 0, BH + 1.6, F - 0.1));                           // front shield (blank)
    T.add(at(rb(0.6, 0.6, 4.5, 0.2, red), 0, BH + 2.9, 0));                                                  // top comb
    const hose = new THREE.Group(), hm = mat('#2B2B2B', 0.6);
    const h = cyl(0.45, 0.45, 3.2, hm); h.rotation.z = Math.PI / 2; hose.add(at(h, 0.8, 0, 0));
    const nz = cyl(0.3, 0.5, 1.4, mat('#B8B8B8', 0.3)); nz.rotation.z = -Math.PI / 2; hose.add(at(nz, 3.0, 0, 0));
    const loop = tor(2.2, 0.42, hm, Math.PI); loop.rotation.x = -Math.PI / 2; hose.add(at(loop, -1.4, -0.3, 0));   // hose loops back from the hand
    hand(c, 1).add(at(hose, 2.4, 0, 0.6));
  },
  doctor(c) {
    const T = c.parts.torso, white = mat('#F4F4F2', 0.7), scrub = mat('#5E9EA0');
    shell(T, white); sleeves(c.parts.arms, white, mat('#E2E2DE'));
    T.add(at(rb(3.0, EYE_Y0 - 0.4, 0.2, 0.1, scrub), 0, (EYE_Y0 - 0.4) / 2 + 0.15, F + 0.45));
    coatFront(T, mat('#E6E6E2'));
    T.add(at(rb(2.0, 1.2, 0.15, 0.1, mat('#E6E6E2')), 3.6, 1.0, F + 0.5));                                   // pocket
    const st = mat('#6F8296', 0.4), steel = mat('#C8CDD3', 0.25);                                             // stethoscope around the neck
    for (const sx of [-1, 1]) { const t = cyl(0.2, 0.2, 3.4, st, 10); t.rotation.z = sx * 0.45; T.add(at(t, sx * 2.3, EYE_Y0 - 1.75, F + 0.8)); }   // straight V drop (a curve under the eyes reads as a smile)
    const disc = cyl(0.8, 0.8, 0.35, steel); disc.rotation.x = Math.PI / 2; T.add(at(disc, 0, 0.35, F + 0.85));
    T.add(at(rb(0.35, 1.6, 0.35, 0.12, mat('#C8CDD3', 0.4)), 0, BH + 0.7, F - 1.2));                       // short stalk on top holds the mirror
    const mir = cyl(1.4, 1.4, 0.2, steel, 32); mir.rotation.x = Math.PI / 2 - 0.3; T.add(at(mir, 0, BH + 1.6, F - 0.8));
    T.add(at(cyl(0.3, 0.3, 0.15, mat('#2E3440')), 0, BH + 1.6, F - 0.68).rotateX(Math.PI / 2 - 0.3));
  },
  detective(c) {
    const T = c.parts.torso, coat = mat('#B89B6E'), dk = mat('#8E7550'), hat = mat('#5A4632', 0.7);
    shell(T, coat); sleeves(c.parts.arms, coat, dk);
    coatFront(T, dk);
    T.add(at(rb(BW + 0.85, 0.6, D + 0.85, 0.2, dk), 0, 1.3, 0));                                              // belt
    for (const sx of [-1, 1]) for (const y of [2.3, 3.1]) T.add(at(cyl(0.22, 0.22, 0.15, mat('#3A2B22')), sx * 2.6, y, F + 0.5).rotateX(Math.PI / 2));
    const brim = cyl(5.2, 5.2, 0.3, hat, 40); brim.scale.set(1.25, 1, 1); T.add(at(brim, 0, BH + 0.15, 0));
    const crown = cyl(3.4, 3.8, 2.6, hat, 32); crown.scale.set(1.2, 1, 1); T.add(at(crown, 0, BH + 1.6, 0));
    T.add(at(rb(3, 0.4, 6.5, 0.2, mat('#4A3A28')), 0, BH + 2.9, 0));                                           // pinch dent
    const band = cyl(3.82, 3.82, 0.55, mat('#2A1F17'), 32); band.scale.set(1.2, 1, 1); T.add(at(band, 0, BH + 0.6, 0));
    const mg = new THREE.Group(), rim = mat('#3A2B22', 0.5);
    mg.add(at(tor(1.3, 0.22, rim), 0, 1.9, 0)); const lens = cyl(1.15, 1.15, 0.08, new THREE.MeshStandardMaterial({ color: '#BFE0F0', roughness: 0.1, transparent: true, opacity: 0.45 })); lens.rotation.x = Math.PI / 2; mg.add(at(lens, 0, 1.9, 0));
    mg.add(at(cyl(0.25, 0.3, 1.8, rim, 12), 0, 0, 0)); mg.rotation.y = Math.PI / 2 * 0; hand(c, 1).add(at(mg, 2.9, 0.4, 1.0));
  },
  sensei(c) {
    const T = c.parts.torso, gi = mat('#E3D8C0', 0.8), blk = mat('#16161A', 0.7), beard = mat('#FFFFFF', 1);
    shell(T, gi); sleeves(c.parts.arms, gi, mat('#E4E1D8'));
    T.add(at(rb(BW + 0.9, 0.8, D + 0.9, 0.25, blk), 0, 0.85, 0));                                            // black belt
    for (const [x, r] of [[-0.6, 0.25], [0.6, -0.25]]) { const t = rb(0.7, 2.2, 0.3, 0.1, blk); t.rotation.z = r; T.add(at(t, x, -0.2, F + 0.7)); }
    T.add(at(rb(1.2, 0.9, 0.5, 0.2, blk), 0, 0.85, F + 0.7));
    const bd = new THREE.Group();                                                                              // long white beard, starts below the eye band
    bd.add(at(rb(8.0, 2.4, 1.8, 0.9, beard), 0, EYE_Y0 - 1.25, 0.3));
    bd.add(at(rb(5.6, 2.6, 1.6, 0.8, beard), 0, EYE_Y0 - 3.1, 0.35));
    bd.add(at(rb(3.0, 1.8, 1.4, 0.65, beard), 0, EYE_Y0 - 4.9, 0.4));
    for (const sx of [-1, 1]) bd.add(at(rb(1.8, 0.7, 0.6, 0.3, beard), sx * 2.6, EYE_Y0 - 0.45, 0.15));      // brushy moustache wings
    T.add(at(bd, 0, 0, F + 0.9));
    const st = cyl(0.3, 0.3, 14, mat('#C9B57A', 0.6), 12), staff = new THREE.Group(); staff.add(st);
    for (const y of [-4, 0, 4]) staff.add(at(cyl(0.38, 0.38, 0.3, mat('#9C8550'), 12), 0, y, 0));
    hand(c, 1).add(at(staff, 2.9, 2.5, 0.6));
  },
};
