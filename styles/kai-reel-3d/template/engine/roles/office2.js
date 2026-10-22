import { THREE, BW, BH, D, EYE_Y0, EYE_Y1, mat, rb, at, shell, sleeves } from './kit.js';

// office roles wave 2 (batch 2026-10-17): pm, hr, sales, marketing, data-scientist, designer, support, scrum-master, vc
const F = D / 2;
const hand = (c, sx = 1) => c.parts.arms.find(a => a.userData.sx === sx);
const cyl = (rt, rbt, h, m, seg = 24) => { const x = new THREE.Mesh(new THREE.CylinderGeometry(rt, rbt, h, seg), m); x.castShadow = true; return x; };
const tor = (r, t, m, arc = Math.PI * 2) => new THREE.Mesh(new THREE.TorusGeometry(r, t, 10, 36, arc), m);
function coatFront(T, m, y1 = 3.0) { for (const sx of [-1, 1]) { const l = rb(2.2, y1 + 0.2, 0.25, 0.1, m); l.rotation.z = sx * 0.28; T.add(at(l, sx * 1.6, y1 / 2, F + 0.55)); } }
const STICK = ['#F2C94C', '#EE7DA8', '#6FCF97', '#56A8E8', '#F2994A'];
// a board held up in a hand: face toward +z, centre at (0,0)
function board(w, h, frame = '#8A6A4A', face = '#FAFAF7') {
  const g = new THREE.Group(); g.add(rb(w + 0.5, h + 0.5, 0.4, 0.15, mat(frame)), at(rb(w, h, 0.2, 0.05, mat(face, 0.9)), 0, 0, 0.18)); return g;
}
const note = (s, col) => rb(s, s, 0.12, 0.04, mat(col, 0.9));
// headset: band over the top, ear cup on the side, boom to the front corner (kept on the side face, never under the eyes)
function headset(T, m, pad) {
  const band = tor(BW / 2 + 0.4, 0.25, m, Math.PI); band.position.set(0, BH - 2.2, 0.5); T.add(band);
  for (const sx of [-1, 1]) { const cp = cyl(1.1, 1.1, 0.7, m); cp.rotation.z = Math.PI / 2; T.add(at(cp, sx * (BW / 2 + 0.4), BH - 2.2, 0.5)); }
  const p = cyl(0.8, 0.8, 0.2, pad); p.rotation.z = Math.PI / 2; T.add(at(p, BW / 2 + 0.8, BH - 2.2, 0.5));
  const boom = rb(0.25, 0.25, 4.6, 0.1, m); boom.rotation.x = 0.35; T.add(at(boom, BW / 2 + 0.8, BH - 3.0, 2.6));
  T.add(at(rb(0.6, 0.6, 0.8, 0.25, m), BW / 2 + 0.8, BH - 3.8, F + 0.3));
}

export const BUILD = {
  pm(c) {   // roadmap board: time lanes + coloured sticky notes, a red "now" line
    const T = c.parts.torso, top = mat('#2F6F73'), shirt = mat('#EDEBE4');
    shell(T, top); sleeves(c.parts.arms, top, shirt);
    T.add(at(rb(0.15, 2.4, 0.1, 0.05, mat('#C9CDD2', 0.4)), 0, 1.6, F + 0.45));                 // short zip, ends at y 2.8
    const b = board(7.2, 5.2, '#5B6470');
    for (const y of [-1.3, 0, 1.3]) b.add(at(rb(6.8, 0.08, 0.05, 0.02, mat('#C8CCD2')), 0, y + 0.65, 0.3));   // lane lines
    for (const [x0, x1, y, k] of [[-3.0, -0.4, 1.95, 3], [-1.6, 1.6, 0.65, 0], [0.2, 2.9, -0.65, 2], [-2.4, 3.0, -1.95, 1]]) b.add(at(rb(x1 - x0, 0.85, 0.14, 0.12, mat(STICK[k])), (x0 + x1) / 2, y, 0.36));   // Gantt bars
    const blue = mat('#3E6FB0'); for (const sx of [-1, 1]) { const s = rb(0.25, 2.6, 0.15, 0.05, blue); s.rotation.z = sx * 0.35; T.add(at(s, sx * 0.6, 1.6, F + 0.5)); }   // lanyard, top below y 3.0
    T.add(at(rb(2.2, 1.3, 0.15, 0.12, mat('#FFFFFF', 0.5)), 0, 0.45, F + 0.6), at(rb(2.2, 0.4, 0.17, 0.08, blue), 0, 0.9, F + 0.6));
    b.add(at(rb(0.16, 5.0, 0.06, 0.03, mat('#D8433A')), 0.15, 0, 0.42));                         // "now" marker
    b.rotation.y = 0.45; b.scale.setScalar(0.65); hand(c, -1).add(at(b, -0.8, 2.8, 5.0));
    const pen = cyl(0.22, 0.22, 2.2, mat('#D8433A', 0.6), 12); pen.rotation.z = 0.6; hand(c, 1).add(at(pen, 2.7, 0.8, 0.6));
  },
  hr(c) {   // cardigan + clipboard
    const T = c.parts.torso, card = mat('#C98B9B'), dk = mat('#B07383'), blouse = mat('#F4EFE6');
    shell(T, card); sleeves(c.parts.arms, card, dk);
    T.add(at(rb(3.2, 3.0, 0.2, 0.1, blouse), 0, 1.4, F + 0.45));
    for (const sx of [-1, 1]) T.add(at(rb(0.35, 3.2, 0.2, 0.1, dk), sx * 1.75, 1.5, F + 0.55));       // button bands
    for (const y of [0.6, 1.5, 2.4]) T.add(at(cyl(0.22, 0.22, 0.15, mat('#F1E3C8', 0.5), 14).rotateX(Math.PI / 2), 1.75, y, F + 0.7));
    T.add(at(rb(BW + 0.9, 0.5, D + 0.9, 0.2, dk), 0, 0.0, 0));                                    // ribbed hem
    const cb = new THREE.Group(); cb.add(rb(3.4, 4.4, 0.25, 0.15, mat('#A57A4E')), at(rb(2.9, 3.6, 0.1, 0.05, mat('#FFFFFF', 0.9)), 0, -0.25, 0.16));
    cb.add(at(rb(1.6, 0.5, 0.4, 0.15, mat('#B9BEC5', 0.3)), 0, 2.1, 0.12));
    for (const y of [0.6, -0.1, -0.8, -1.5]) cb.add(at(rb(2.2, 0.12, 0.05, 0.02, mat('#B6C3D6')), 0, y, 0.24));
    cb.add(at(rb(0.55, 0.55, 0.06, 0.02, mat('#6FCF97')), -1.0, 0.95, 0.25));
    cb.scale.setScalar(1.3); cb.rotation.y = -0.2; hand(c, 1).add(at(cb, 3.0, 1.6, 1.0));
  },
  sales(c) {   // bright blue suit + headset
    const T = c.parts.torso, suit = mat('#2E6FE0'), shirt = mat('#FFFFFF', 0.8);
    shell(T, suit); sleeves(c.parts.arms, suit, shirt);
    T.add(at(rb(3.2, 2.9, 0.2, 0.1, shirt), 0, 1.45, F + 0.45));
    coatFront(T, mat('#2560C8'));
    T.add(at(rb(1.6, 0.5, 0.15, 0.1, mat('#F2C94C')), -3.6, 2.4, F + 0.5));                     // pocket square
    headset(T, mat('#20242C', 0.5), mat('#4A5160'));
    const ph = new THREE.Group(); ph.add(rb(0.4, 3.0, 1.6, 0.2, mat('#E8E8EA', 0.4)));           // light phone
    hand(c, 1).add(at(ph, 2.6, 0.9, 0.4));
  },
  marketing(c) {   // colourful blazer + megaphone
    const T = c.parts.torso, blz = mat('#E0457B'), tee = mat('#F2C94C');
    shell(T, blz); sleeves(c.parts.arms, blz, mat('#56A8E8'));
    T.add(at(rb(3.2, 2.9, 0.2, 0.1, tee), 0, 1.45, F + 0.45));
    coatFront(T, mat('#6FCF97'));                                                                  // contrast lapels
    for (const [x, col] of [[-4.2, '#56A8E8'], [4.2, '#F2994A']]) T.add(at(rb(1.8, 1.2, 0.15, 0.1, mat(col)), x, 1.0, F + 0.5));
    const mg = new THREE.Group(), w = mat('#FFFFFF', 0.6), r = mat('#D8433A', 0.6);
    const cone = cyl(1.7, 0.55, 3.4, w, 28); cone.rotation.z = -Math.PI / 2; mg.add(at(cone, 1.8, 0, 0));
    const rim = tor(1.7, 0.22, r); rim.rotation.y = Math.PI / 2; mg.add(at(rim, 3.5, 0, 0));
    mg.add(at(rb(0.6, 1.6, 0.6, 0.2, r), 0.3, -1.0, 0));
    mg.rotation.z = 0.35; hand(c, 1).add(at(mg, 2.4, 0.6, 1.2));
  },
  'data-scientist'(c) {   // lab coat + bar chart
    const T = c.parts.torso, coat = mat('#F4F4F2', 0.7), tee = mat('#7A5FC0');
    shell(T, coat); sleeves(c.parts.arms, coat, mat('#E2E2DE'));
    T.add(at(rb(3.0, 2.9, 0.2, 0.1, tee), 0, 1.45, F + 0.45));
    coatFront(T, mat('#E6E6E2'));
    T.add(at(rb(2.0, 1.2, 0.15, 0.1, mat('#E6E6E2')), 3.6, 1.0, F + 0.5));
    for (const [x, col] of [[3.2, '#56A8E8'], [3.8, '#F2994A']]) T.add(at(rb(0.22, 1.2, 0.2, 0.08, mat(col)), x, 1.7, F + 0.6));   // pens in pocket
    const b = board(5.6, 5.0, '#5B6470');
    b.add(at(rb(0.12, 4.2, 0.05, 0.02, mat('#5B6470')), -2.3, 0, 0.3), at(rb(4.8, 0.12, 0.05, 0.02, mat('#5B6470')), 0, -2.1, 0.3));
    [[1.4, '#56A8E8'], [2.4, '#6FCF97'], [3.1, '#F2C94C'], [3.9, '#E0457B']].forEach(([h, col], i) => b.add(at(rb(0.85, h, 0.15, 0.05, mat(col)), -1.4 + i * 1.15, -2.05 + h / 2, 0.35)));
    b.rotation.y = 0.45; b.scale.setScalar(0.7); hand(c, -1).add(at(b, -1.4, 2.8, 4.2));
  },
  designer(c) {   // beret + striped top + pencil
    const T = c.parts.torso, wht = mat('#F4F1EA'), navy = mat('#2B3A5C'), red = mat('#C2382D', 0.8);
    shell(T, wht); sleeves(c.parts.arms, wht, navy);
    for (const y of [0.4, 1.3, 2.2]) T.add(at(rb(BW + 0.9, 0.38, D + 0.9, 0.15, navy), 0, y, 0));   // stripes, all below y 2.5
    const ber = new THREE.Mesh(new THREE.SphereGeometry(4.6, 32, 16), red); ber.scale.set(1.15, 0.32, 1.0); ber.rotation.z = 0.12; T.add(at(ber, -0.8, BH + 0.9, 0));
    T.add(at(cyl(4.3, 4.3, 0.5, mat('#9E2A22'), 36).rotateZ(0.12), -0.8, BH + 0.25, 0));          // band sits on the head top
    T.add(at(cyl(0.2, 0.25, 0.8, red, 10), -1.4, BH + 2.3, 0));                                    // stalk
    const pc = new THREE.Group(); pc.add(cyl(0.3, 0.3, 3.0, mat('#F2C94C', 0.6), 6)); pc.add(at(cyl(0, 0.3, 0.7, mat('#E8C9A0'), 6), 0, 1.85, 0));
    pc.add(at(cyl(0.31, 0.31, 0.4, mat('#EE7DA8'), 6), 0, -1.65, 0)); pc.rotation.z = -0.4; hand(c, 1).add(at(pc, 2.8, 1.2, 0.6));
  },
  support(c) {   // headset + polo
    const T = c.parts.torso, polo = mat('#3FA37A'), lt = mat('#5FBF95');
    shell(T, polo); sleeves(c.parts.arms, polo, lt);
    T.add(at(rb(1.4, 2.2, 0.15, 0.1, lt), 0, 1.7, F + 0.45));                                       // placket, top at 2.8
    for (const y of [1.2, 2.1]) T.add(at(cyl(0.18, 0.18, 0.12, mat('#FFFFFF', 0.5), 12).rotateX(Math.PI / 2), 0, y, F + 0.58));
    for (const sx of [-1, 1]) { const cl = rb(2.6, 0.8, 0.2, 0.15, lt); cl.rotation.z = -sx * 0.2; T.add(at(cl, sx * 1.6, 2.6, F + 0.5)); }   // flat collar wings, light, below y 3
    headset(T, mat('#F4F4F2', 0.5), mat('#3FA37A'));
    const mug = new THREE.Group(), w = mat('#F1ECE2', 0.5); mug.add(cyl(0.8, 0.7, 1.6, w)); const hd = tor(0.45, 0.13, w); hd.position.x = 0.85; mug.add(hd);
    hand(c, 1).add(at(mug, 2.9, 1.0, 0.6));
  },
  'scrum-master'(c) {   // kanban: 3 columns with header colours, notes stacked in columns
    const T = c.parts.torso, tee = mat('#6B5BA8');   // purple hoodie
    shell(T, tee); sleeves(c.parts.arms, tee, mat('#5A4B94'));
    T.add(at(rb(6.2, 1.3, 0.2, 0.4, mat('#7A6BB6')), 0, 0.75, F + 0.5), at(rb(7.5, 2.4, 1.8, 0.8, tee), 0, EYE_Y0 - 0.1, -F - 1.1));
    T.add(at(note(1.4, '#F2C94C'), -3.4, 1.6, F + 0.45));                                          // a sticky note on the chest
    const b = board(6.4, 6.0, '#3E4654', '#F4F1E8');
    const cols = [['#D8433A', 3], ['#F2C94C', 2], ['#3FA37A', 1]];
    cols.forEach(([hc, n], i) => { const x = -2.15 + i * 2.15;
      b.add(at(rb(1.9, 0.55, 0.12, 0.04, mat(hc)), x, 2.55, 0.32));
      for (let k = 0; k < n; k++) b.add(at(note(1.15, '#FFF3A6'), x, 1.4 - k * 1.45, 0.34)); });
    for (const x of [-1.08, 1.08]) b.add(at(rb(0.1, 5.8, 0.05, 0.02, mat('#8A909A')), x, 0, 0.3));
    b.scale.setScalar(0.85); b.rotation.y = -0.25; hand(c, 1).add(at(b, 2.4, 2.8, 3.0));
  },
  vc(c) {   // flat fleece vest over a blue shirt + cheque book
    const T = c.parts.torso, shirt = mat('#9DBBE0'), fl = mat('#8C8A86', 0.95);
    shell(T, shirt, -0.25, EYE_Y0 - 0.05, 0.2); sleeves(c.parts.arms, shirt, mat('#86A6CF'));
    shell(T, fl, -0.25, 3.0, 0.55);                                                                 // vest ends below the eyes, no quilting
    T.add(at(rb(0.14, 3.0, 0.1, 0.04, mat('#5E5C58', 0.5)), 0, 1.35, F + 0.62));
    T.add(at(rb(BW + 1.25, 0.35, D + 1.25, 0.15, mat('#7A7874')), 0, 3.0, 0));                     // collar band, at y 3.0
    const bk = new THREE.Group(); bk.add(rb(4.0, 2.4, 0.3, 0.12, mat('#2F5A3E')), at(rb(3.7, 2.0, 0.08, 0.04, mat('#CFE8D2', 0.9)), 0, 0, 0.18));
    bk.add(at(rb(2.6, 0.1, 0.04, 0.02, mat('#7FA88A')), -0.2, -0.4, 0.24), at(rb(0.8, 0.45, 0.04, 0.02, mat('#7FA88A')), 1.2, 0.5, 0.24));
    bk.scale.setScalar(1.6); bk.rotation.y = -0.2; hand(c, 1).add(at(bk, 3.2, 0.9, 1.0));
  },
};
