import { THREE, BW, BH, D, EYE_Y0, EYE_Y1, mat, rb, at, shell, sleeves } from './kit.js';

// everyday Vietnam batch (xe-om, shipper, bao-ve, co-giao, sinh-vien, tra-da). Collars/knots stay below y 3.0, all hems stop at y >= -1.9.
const hand = (c, sx) => c.parts.arms.find(x => x.userData.sx === sx);
const helmetDome = (T, m, r = 6.9, y = BH - 0.6) => { const d = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), m); d.scale.set(1, 0.62, (D + 1.4) / (BW + 1.4)); T.add(at(d, 0, y, 0)); return d; };
const cyl = (rt, rbm, h, m, s = 24) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rbm, h, s), m);
const nonLa = (T) => {
  const non = new THREE.Mesh(new THREE.ConeGeometry(7.5, 4.6, 40, 1, true), mat('#E3CF98', 0.9)); non.material.side = THREE.DoubleSide; T.add(at(non, 0, BH + 2.0, 0));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(7.4, 0.12, 6, 48), mat('#C9B27A')); ring.rotation.x = Math.PI / 2; T.add(at(ring, 0, BH - 0.3, 0));
};

export const BUILD = {
  'xe-om'(c) {
    const T = c.parts.torso, g = mat('#2E8B3E'), dk = mat('#1F6B2E'), lt = mat('#DDE6D8');
    shell(T, g); sleeves(c.parts.arms, g, dk);
    T.add(at(rb(BW + 0.95, 0.55, D + 0.95, 0.2, dk), 0, 0.5, 0));                                 // jacket hem band
    helmetDome(T, g);                                                                               // green half-face helmet on top
    T.add(at(rb(BW + 1.6, 0.5, D + 1.6, 0.25, dk), 0, BH - 0.05, 0));                                // helmet rim, touches the head
    T.add(at(rb(BW - 1, 0.35, 1.6, 0.15, dk), 0, BH - 0.25, D / 2 + 1.2));                           // short visor peak, above the eyes
  },
  shipper(c) {
    const T = c.parts.torso, o = mat('#B9461A'), dk = mat('#8E3412'), cap = mat('#B9461A'), box = mat('#F2C230', 0.8), bx = mat('#3A3A3A');
    shell(T, o); sleeves(c.parts.arms, o, dk);
    T.add(at(rb(BW + 0.95, 0.55, D + 0.95, 0.2, dk), 0, 0.5, 0));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3.6, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), cap); dome.scale.y = 0.7; T.add(at(dome, 0, BH, -0.5));
    T.add(at(rb(5.5, 0.3, 3.2, 0.12, dk), 0, BH + 0.15, 3.6));                                      // cap brim, flat on the head
    const B = new THREE.Group(); B.add(rb(10, 9, 7, 0.5, box));                                       // big delivery box on the back
    B.add(at(rb(10.1, 0.5, 7.1, 0.15, bx), 0, 3.0, 0), at(rb(0.5, 9.05, 7.1, 0.15, bx), 0, 0, 0)); B.add(at(rb(8.5, 0.3, 7.05, 0.1, bx), 0, -3.0, 0));
    T.add(at(B, 0, 5.2, -D / 2 - 3.7));
    for (const sx of [-1, 1]) T.add(at(rb(0.6, 6, 0.3, 0.1, mat('#3A3A3A')), sx * 3.5, 3.5, -D / 2 - 0.2));   // straps on the back only
    const p = hand(c, 1); p.add(at(rb(2.6, 2.0, 2.6, 0.2, mat('#C9A06A')), 2.9, 0.4, 0.8));                   // parcel in hand
    p.children[p.children.length - 1].add(at(rb(2.65, 0.3, 0.5, 0.05, mat('#E8DCC2')), 0, 0, 0));
  },
  'bao-ve'(c) {
    const T = c.parts.torso, b = mat('#2F5D9E'), dk = mat('#20457A'), gold = mat('#E2B33C', 0.5), blk = mat('#1C1F26', 0.6);
    shell(T, b); sleeves(c.parts.arms, b, dk);
    T.add(at(rb(BW + 0.95, 0.7, D + 0.95, 0.2, dk), 0, 0.9, 0));                                     // belt
    T.add(at(rb(1.0, 0.6, 0.15, 0.1, gold), 0, 0.9, D / 2 + 0.85));                                   // buckle
    T.add(at(rb(1.1, 1.3, 0.15, 0.3, gold), -3.5, 2.2, D / 2 + 0.45));                                 // badge on the chest, low
    const crown = cyl(5.6, 5.0, 2.6, b, 32); crown.scale.z = 0.82; T.add(at(crown, 0, BH + 1.3, -0.4));      // peaked guard cap
    const band = cyl(5.05, 5.05, 0.7, blk, 32); band.scale.z = 0.82; T.add(at(band, 0, BH + 0.35, -0.4));
    const top = cyl(5.7, 5.7, 0.3, b, 32); top.scale.z = 0.82; T.add(at(top, 0, BH + 2.6, -0.4));
    T.add(at(rb(7, 0.5, 3.6, 0.2, blk), 0, BH + 0.15, D / 2 + 0.9));                                   // black peak
    T.add(at(rb(1.2, 0.9, 0.2, 0.2, gold), 0, BH + 1.4, 4.25));                                       // cap badge
    const a = hand(c, 1), bt = new THREE.Group(); bt.add(cyl(0.35, 0.35, 6, blk, 14), at(cyl(0.5, 0.5, 1.2, mat('#3A3A3A'), 14), 0, -2.6, 0));
    bt.rotation.z = -0.35; a.add(at(bt, 2.9, 1.5, 0.8));                                               // baton
  },
  'co-giao'(c) {
    const T = c.parts.torso, w = mat('#F6F3EC'), w2 = mat('#E6E1D6'), pants = mat('#F1EEE6');
    shell(T, w); sleeves(c.parts.arms, w, w2);
    for (const z of [1, -1]) { T.add(at(rb(4.2, 4.4, 0.6, 0.3, w), 0, 0.3, z * (D / 2 + 0.7)));
      for (const sx of [-1, 1]) T.add(at(rb(0.25, 4.2, 0.65, 0.1, mat('#9CC3E0')), sx * 2.05, 0.35, z * (D / 2 + 0.72))); }   // pale-blue piping on the flap edges // long front/back flaps, thick, hem at y -1.9
    const non = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.6, 32, 1, true), mat('#E3CF98', 0.9)); non.material.side = THREE.DoubleSide;
    non.rotation.x = -Math.PI / 2 + 0.35; T.add(at(non, 0, 4.4, -D / 2 - 1.6));                        // nón lá hanging on her back
    const book = rb(0.6, 3.6, 2.8, 0.15, mat('#2F5D9E')); hand(c, -1).add(at(book, -3.0, -0.6, 0.6));
    hand(c, -1).add(at(rb(0.62, 3.3, 0.15, 0.05, mat('#F1ECE2')), -3.0, -0.6, 2.0));
    const ptr = cyl(0.12, 0.2, 4.5, mat('#B07A3A'), 10); ptr.rotation.z = -0.6; hand(c, 1).add(at(ptr, 3.6, 2.6, 0.8));   // pointer stick
  },
  'sinh-vien'(c) {
    const T = c.parts.torso, w = mat('#F6F5F0'), w2 = mat('#E2E0D8'), red = mat('#D0312D'), navy = mat('#2B3A5C');
    shell(T, w, 0.9); sleeves(c.parts.arms, w, w2);
    shell(T, navy, -0.25, 0.95, 0.42);                                                                  // navy trousers band at the bottom
    for (const sx of [-1, 1]) { const tri = rb(5, 0.9, 0.3, 0.2, red); tri.rotation.z = sx * 0.4; T.add(at(tri, sx * 1.8, 1.7, D / 2 + 0.55)); }   // red scarf ends crossing low
    T.add(at(rb(1.3, 1.0, 0.5, 0.35, red), 0, 1.7, D / 2 + 0.7));                                       // knot at y 1.7 (below 3.0)
    for (const sx of [-1, 1]) { const tail = rb(0.9, 2.0, 0.3, 0.25, red); tail.rotation.z = sx * 0.25; T.add(at(tail, sx * 0.7, 0.6, D / 2 + 0.6)); }
    T.add(at(rb(BW + 0.4, 0.8, 0.3, 0.2, red), 0, EYE_Y0 - 0.9, -D / 2 - 0.55));                        // scarf going round the back
    const bp = new THREE.Group(); bp.add(rb(8, 7, 3.2, 1.0, mat('#3E6FB8'))); bp.add(at(rb(5.5, 3, 0.8, 0.6, mat('#2F5A99')), 0, -1.4, -1.8));
    T.add(at(bp, 0, 3.8, -D / 2 - 2.0));                                                                 // backpack
    for (const sx of [-1, 1]) T.add(at(rb(0.7, 5.5, 0.35, 0.1, mat('#2F5A99')), sx * (BW / 2 - 1.2), 3.6, -D / 2 - 0.35));
  },
  'tra-da'(c) {
    const T = c.parts.torso, bb = mat('#7A5A9E'), dk = mat('#5E4480'), pants = mat('#1F1F26');
    shell(T, bb, 0.6); sleeves(c.parts.arms, bb, dk);                                                    // áo bà ba (purple), short
    shell(T, pants, -0.25, 0.7, 0.42);                                                                   // dark trousers below
    for (let i = 0; i < 3; i++) T.add(at(rb(0.45, 0.45, 0.15, 0.2, mat('#EDE6D6')), 1.2, 0.9 + i * 0.75, D / 2 + 0.46));   // buttons, low
    for (const sx of [-1, 1]) T.add(at(rb(2.4, 1.3, 0.15, 0.2, dk), sx * 3.4, 1.3, D / 2 + 0.46));       // two front pockets
    nonLa(T);
    const gl = new THREE.Group(), glass = new THREE.MeshStandardMaterial({ color: '#E9F3F5', roughness: 0.3, transparent: true, opacity: 0.55 });
    gl.add(cyl(0.95, 0.75, 2.4, glass), at(cyl(0.85, 0.7, 1.6, mat('#B9772E', 0.5)), 0, -0.3, 0));        // iced tea
    for (let i = 0; i < 3; i++) gl.add(at(rb(0.45, 0.45, 0.45, 0.08, mat('#F4FBFC', 0.3)), (i - 1) * 0.4, 0.55, (i % 2) * 0.3));   // ice
    gl.scale.setScalar(1.3); hand(c, 1).add(at(gl, 3.1, 1.2, 0.8));
    const st = new THREE.Group(); st.name = 'set-stool'; const sm = mat('#2F7FD0', 0.7);                        // set prop: low blue plastic stool
    st.add(at(rb(4.4, 0.5, 4.4, 0.35, sm), 0, 2.6, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = rb(0.6, 2.6, 0.6, 0.15, sm); l.rotation.set(sz * 0.12, 0, -sx * 0.12); st.add(at(l, sx * 1.75, 1.3, sz * 1.75)); }
    st.position.set(9.5, -2, 1);
    if (c.opts?.noSet !== true) c.group.add(st);
  },
};
