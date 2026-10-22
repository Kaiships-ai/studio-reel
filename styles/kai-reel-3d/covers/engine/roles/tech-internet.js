import { THREE, BW, BH, D, EYE_Y0, EYE_Y1, mat, rb, at, shell, sleeves } from './kit.js';

// tech nods + internet roles (batch 2026-10-17). Real people = costume nod only (no face, no logo, no text).
const F = D / 2;
const hand = (c, sx = 1) => c.parts.arms.find(a => a.userData.sx === sx);
const cyl = (rt, rbt, h, m, seg = 24) => { const x = new THREE.Mesh(new THREE.CylinderGeometry(rt, rbt, h, seg), m); x.castShadow = true; return x; };
const tor = (r, t, m, arc = Math.PI * 2) => new THREE.Mesh(new THREE.TorusGeometry(r, t, 10, 36, arc), m);
const sph = (r, m) => { const x = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m); x.castShadow = true; return x; };
const hairCap = (T, m, h = 1.1) => T.add(at(rb(BW + 0.3, h, D + 0.3, 0.45, m), 0, BH + h / 2 - 0.25, 0));   // sits on the top face, sinks 0.25 so no gap
function cans(T, band, cup, pad) {                                                                  // over-ear headphones (developer pattern)
  const b = tor(BW / 2 + 0.55, 0.32, band, Math.PI); b.position.set(0, BH - 2.2, 0); T.add(b);
  for (const sx of [-1, 1]) { const k = cyl(1.25, 1.25, 0.8, cup); k.rotation.z = Math.PI / 2; T.add(at(k, sx * (BW / 2 + 0.45), BH - 2.2, 0));
    const p = cyl(0.95, 0.95, 0.2, pad, 20); p.rotation.z = Math.PI / 2; T.add(at(p, sx * (BW / 2 + 0.9), BH - 2.2, 0)); }
}
function phone(body, screen) { const g = new THREE.Group(); g.add(rb(0.4, 2.8, 1.5, 0.2, body), at(rb(0.06, 2.4, 1.2, 0.03, screen), 0.22, 0, 0)); return g; }

export const BUILD = {
  jensen(c) {
    const T = c.parts.torso, lea = mat('#1B1B1E', 0.45), lea2 = mat('#2A2A2E', 0.45);
    shell(T, lea); sleeves(c.parts.arms, lea, lea2);
    for (const sx of [-1, 1]) { const l = rb(2.6, 1.6, 0.35, 0.2, lea2); l.rotation.z = sx * 0.5; T.add(at(l, sx * 4.4, EYE_Y0 - 1.2, F + 0.55)); }   // wide collar flaps, out at the corners
    T.add(at(rb(BW + 0.95, 0.5, D + 0.95, 0.2, lea2), 0, 0.3, 0));                                   // jacket hem band
    hairCap(T, mat('#3C3C40')); T.add(at(rb(BW + 0.35, 0.5, 2.0, 0.2, mat('#6E6E72')), 0, BH + 0.95, F - 1.0));   // grey-black, lighter front edge
    const chip = new THREE.Group(), pcb = mat('#76B900', 0.6), sil = mat('#C8CDD3', 0.3);
    chip.add(rb(0.5, 3.0, 3.8, 0.12, pcb), at(rb(0.6, 2.2, 2.6, 0.1, sil), 0.25, 0.2, 0));
    for (let i = 0; i < 4; i++) chip.add(at(rb(0.2, 0.25, 2.4, 0.05, mat('#9AA0A8', 0.3)), 0.62, -0.6 + i * 0.5, 0));   // heat-sink fins
    hand(c, 1).add(at(chip, 2.9, 1.2, 0.6));
  },
  jobs(c) {
    const T = c.parts.torso, blk = mat('#141416', 0.9);
    shell(T, blk); sleeves(c.parts.arms, blk);
    T.add(at(rb(BW + 1.3, 0.9, D + 1.3, 0.4, blk), 0, EYE_Y0 - 0.5, 0));                             // rolled turtleneck collar
    T.add(at(rb(BW + 1.0, 0.6, D + 1.0, 0.25, blk), 0, 0.2, 0));
    const si = mat('#C8CDD3', 0.25);                                                                    // round rimless glasses: thin silver rims around the eyes, bridge above
    for (const sx of [-1, 1]) { T.add(at(tor(1.55, 0.11, si), sx * 3.5, (EYE_Y0 + EYE_Y1) / 2, F + 0.35));
      T.add(at(rb(0.18, 0.18, 4, 0.06, si), sx * (BW / 2 + 0.1), 5.0, F - 1.6), at(rb(1.3, 0.16, 0.16, 0.06, si), sx * 5.55, 5.0, F + 0.35)); }
    T.add(at(rb(3.8, 0.16, 0.16, 0.06, si), 0, 5.6, F + 0.35));
    hand(c, 1).add(at(phone(mat('#D9DDE2', 0.3), mat('#20242C', 0.2)), 2.7, 1.0, 0.5));
  },
  zuck(c) {
    const T = c.parts.torso, tee = mat('#8C9097'), hair = mat('#5A3E2B');
    shell(T, tee, -0.25, EYE_Y0 - 0.05, 0.22); sleeves(c.parts.arms, tee);
    T.add(at(rb(BW + 0.7, 0.4, D + 0.7, 0.15, mat('#7C8087')), 0, EYE_Y0 - 0.3, 0));              // crew-neck rib
    hairCap(T, hair, 0.7);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) T.add(at(sph(0.95, hair), -4.8 + i * 2.4, BH + 0.55, -3.4 + j * 2.3));   // short curls, sunk into the cap
    const vr = new THREE.Group(), wh = mat('#EDEEF0', 0.5);                                           // VR headset pushed up on the head (the one prop)
    vr.add(rb(7.0, 2.2, 2.6, 0.8, wh), at(rb(6.2, 1.6, 0.2, 0.5, mat('#3E6FB0', 0.4)), 0, 0, 1.35));
    vr.add(at(rb(BW - 0.4, 0.5, 0.5, 0.2, mat('#4A4D55')), 0, -0.2, -1.4));
    T.add(at(vr, 0, BH + 1.6, F - 1.2));
  },
  altman(c) {
    const T = c.parts.torso, sw = mat('#3F5E48', 0.95), rib = mat('#34503D', 0.95);
    shell(T, sw); sleeves(c.parts.arms, sw, rib);
    T.add(at(rb(BW + 1.0, 0.7, D + 1.0, 0.3, rib), 0, 0.15, 0), at(rb(BW + 1.0, 0.5, D + 1.0, 0.2, rib), 0, EYE_Y0 - 0.3, 0));   // ribbed hem + crew neck
    for (const y of [1.2, 2.1, 2.9]) T.add(at(rb(BW + 0.85, 0.12, D + 0.85, 0.05, rib), 0, y, 0));  // soft knit lines (horizontal only)
    hairCap(T, mat('#7A5A3E'), 0.8); T.add(at(rb(BW + 0.35, 0.45, 1.6, 0.2, mat('#8A6A4C')), 0, BH + 0.65, F - 0.8));
    const mug = new THREE.Group(), w = mat('#F1ECE2', 0.5);                                            // calm: a plain mug of tea
    mug.add(cyl(0.8, 0.7, 1.6, w)); const hd = tor(0.45, 0.13, w); hd.position.x = 0.85; mug.add(hd);
    mug.add(at(cyl(0.7, 0.7, 0.05, mat('#B7A26A'), 20), 0, 0.78, 0)); hand(c, 1).add(at(mug, 2.9, 1.0, 0.6));
  },
  musk(c) {
    const T = c.parts.torso, tee = mat('#18181A', 0.9);
    shell(T, tee, -0.25, EYE_Y0 - 0.05, 0.22); sleeves(c.parts.arms, tee);
    T.add(at(rb(BW + 0.7, 0.4, D + 0.7, 0.15, mat('#26262A')), 0, EYE_Y0 - 0.3, 0));
    const r = new THREE.Group(), wh = mat('#F2F2F0', 0.4), sv = mat('#AEB4BC', 0.3);
    r.add(at(cyl(0.6, 0.6, 3.6, wh), 0, 0, 0), at(cyl(0.02, 0.6, 1.3, sv), 0, 2.45, 0), at(cyl(0.62, 0.62, 0.3, mat('#2E3440')), 0, 1.1, 0));
    for (let i = 0; i < 4; i++) { const f = rb(0.15, 1.0, 0.9, 0.05, sv), g = new THREE.Group(); g.rotation.y = i * Math.PI / 2; g.add(at(f, 0, -1.45, 0.75)); r.add(g); }
    r.add(at(cyl(0.45, 0.05, 1.4, mat('#F7B23F', 0.5, '#E8522A')), 0, -2.5, 0));                      // exhaust flame
    r.scale.setScalar(1.3); hand(c, 1).add(at(r, 2.9, 1.6, 0.6));
  },
  gates(c) {
    const T = c.parts.torso, sw = mat('#5C7290', 0.95), sh = mat('#EEF1F5', 0.6);
    shell(T, sw); sleeves(c.parts.arms, sw, sh);
    T.add(at(rb(3.4, EYE_Y0 - 0.6, 0.2, 0.1, sh), 0, (EYE_Y0 - 0.6) / 2 + 0.6, F + 0.45));           // shirt in the V
    for (const sx of [-1, 1]) { const l = rb(2.0, EYE_Y0 - 0.2, 0.25, 0.1, sw); l.rotation.z = sx * 0.3; T.add(at(l, sx * 1.6, EYE_Y0 / 2 - 0.1, F + 0.55)); }   // V-neck edges
    const fr = mat('#4A4038', 0.5);                                                                     // square glasses: top bar + sides only (no bar under the eyes)
    for (const sx of [-1, 1]) { T.add(at(rb(3.4, 0.35, 0.3, 0.08, fr), sx * 3.5, EYE_Y1 + 0.35, F + 0.5));
      for (const k of [-1, 1]) T.add(at(rb(0.3, 2.6, 0.3, 0.08, fr), sx * 3.5 + k * 1.7, EYE_Y1 - 1.0, F + 0.5));
      T.add(at(rb(0.25, 0.25, 4, 0.1, fr), sx * 5.4, EYE_Y1 + 0.3, F - 1.6)); }
    T.add(at(rb(0.8, 0.3, 0.3, 0.08, fr), 0, EYE_Y1 + 0.35, F + 0.5));
    const hr = mat('#8A7A62');                                                                          // side part: low strip left, fuller swoop right
    T.add(at(rb(3.0, 0.6, D + 0.3, 0.25, hr), -4.6, BH + 0.05, 0), at(rb(8.6, 1.3, D + 0.3, 0.55, hr), 1.6, BH + 0.4, 0));
  },
  streamer(c) {
    const T = c.parts.torso, hd = mat('#5B2A86'), dk = mat('#231F38');
    shell(T, hd); sleeves(c.parts.arms, hd, dk);
    T.add(at(rb(6.2, 1.3, 0.2, 0.4, mat('#7A4AA8')), 0, 0.75, F + 0.5), at(rb(7.5, 2.4, 1.8, 0.8, hd), 0, EYE_Y0 - 0.1, -F - 1.1));
    cans(T, mat('#2B2B30', 0.5), mat('#2B2B30', 0.5), mat('#20E0E0', 0.5, '#20E0E0'));
    for (const sx of [-1, 1]) T.add(at(tor(1.3, 0.12, mat(sx < 0 ? '#FF3DCB' : '#20E0E0', 0.5, sx < 0 ? '#FF3DCB' : '#20E0E0')), sx * (BW / 2 + 0.88), BH - 2.2, 0).rotateY(Math.PI / 2));   // RGB rings
    const bm = mat('#2B2B30', 0.5), pts = [[-6.75, 5.8, 0], [-6.75, 5.5, 3.0], [-6.2, 4.3, 5.3]].map(v => new THREE.Vector3(...v));   // boom from the left cup, curving forward
    for (let i = 0; i < 2; i++) { const d = pts[i + 1].clone().sub(pts[i]), sg = cyl(0.2, 0.2, d.length() + 0.3, bm, 10);
      sg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()); sg.position.copy(pts[i]).add(d.multiplyScalar(0.5)); T.add(sg); }
    T.add(at(sph(0.55, mat('#9AF07A', 0.4, '#5ED04A')), -6.2, 4.3, 5.3));                              // lit mic tip on the boom end
    const pad = new THREE.Group(), g = mat('#3A3F4A', 0.5);
    pad.add(rb(0.9, 1.4, 3.0, 0.4, g)); for (const k of [-1, 1]) pad.add(at(rb(1.0, 1.5, 0.9, 0.4, g), 0, -0.6, k * 1.3));
    pad.add(at(rb(0.15, 0.3, 0.3, 0.1, mat('#FF3DCB', 0.4, '#FF3DCB')), 0.5, 0.2, 0.7), at(rb(0.15, 0.3, 0.3, 0.1, mat('#20E0E0', 0.4, '#20E0E0')), 0.5, 0.2, -0.7));
    hand(c, 1).add(at(pad, 2.6, 0.9, 0.6));
  },
  youtuber(c) {
    const T = c.parts.torso, tee = mat('#D8423A', 0.9);
    shell(T, tee, -0.25, EYE_Y0 - 0.05, 0.22); sleeves(c.parts.arms, tee);
    T.add(at(rb(BW + 0.7, 0.4, D + 0.7, 0.15, mat('#B8352E')), 0, EYE_Y0 - 0.3, 0));
    const cam = new THREE.Group(), bk = mat('#3A3F4A', 0.5);                                            // small vlog camera in hand
    cam.add(rb(1.4, 1.6, 2.2, 0.3, bk)); const lens = cyl(0.55, 0.55, 0.8, mat('#9AA0A8', 0.3)); lens.rotation.z = Math.PI / 2; cam.add(at(lens, 1.0, 0, 0));
    hand(c, 1).add(at(cam, 2.8, 1.2, 0.6));
    if (c.opts?.noSet !== true) {                                                                       // set: ring light on a stand behind-left
      const s = new THREE.Group(); s.name = 'set-ringlight'; const st = mat('#3A3F4A', 0.5);
      s.add(at(cyl(0.25, 0.25, 11, st, 12), 0, 5.5, 0), at(cyl(1.6, 1.8, 0.4, st), 0, 0.2, 0));
      const ring = tor(3.4, 0.55, mat('#FFFFFF', 0.4, '#FFF6E0')); s.add(at(ring, 0, 11.4, 0));
      s.position.set(-12.5, 0, -3); s.rotation.y = 0.6; c.group.add(s);
    }
  },
  podcaster(c) {
    const T = c.parts.torso, fl = mat('#A8433A'), ck = mat('#7A2E28');
    shell(T, fl); sleeves(c.parts.arms, fl, ck);
    for (const y of [0.6, 2.0]) T.add(at(rb(BW + 0.85, 0.45, D + 0.85, 0.1, ck), 0, y, 0));          // flannel check: horizontal bands
    for (const sx of [-1, 1]) T.add(at(rb(0.45, EYE_Y0 - 0.2, D + 0.85, 0.1, ck), sx * (BW / 2 + 0.25), (EYE_Y0 - 0.2) / 2 - 0.15, 0));   // and stripes on the sides
    for (const sx of [-1, 1]) { const l = rb(2.2, 1.2, 0.3, 0.1, mat('#B85448')); l.rotation.z = sx * 0.4; T.add(at(l, sx * 4.0, EYE_Y0 - 0.9, F + 0.5)); }   // collar points at the corners
    cans(T, mat('#1C1F26', 0.5), mat('#1C1F26', 0.5), mat('#C9A227'));
    if (c.opts?.noSet !== true) {                                                                       // set: big studio mic on a boom arm, front-right
      const s = new THREE.Group(); s.name = 'set-mic'; const ar = mat('#3A3F4A', 0.5);
      s.add(at(cyl(1.5, 1.7, 0.4, ar), 0, 0.2, 0), at(cyl(0.22, 0.22, 9, ar, 12), 0, 4.6, 0));
      const a0 = new THREE.Vector3(0, 9.1, 0), a1 = new THREE.Vector3(-2.9, 8.3, 3.9), ad = a1.clone().sub(a0), arm = cyl(0.22, 0.22, ad.length(), ar, 12);   // pole top -> mic body
      arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), ad.clone().normalize()); arm.position.copy(a0).add(ad.multiplyScalar(0.5)); s.add(arm, at(sph(0.3, ar), 0, 9.1, 0));
      const mic = new THREE.Group(); mic.add(cyl(1.0, 1.0, 3.2, mat('#AEB4BC', 0.4)), at(cyl(1.05, 1.05, 0.5, ar), 0, -1.2, 0), at(sph(1.0, mat('#AEB4BC', 0.4)), 0, 1.6, 0));
      mic.rotation.x = 0.5; s.add(at(mic, -3.2, 8.6, 4.4));
      s.position.set(11.5, 0, 2); c.group.add(s);
    }
  },
  'crypto-bro'(c) {
    const T = c.parts.torso, vest = mat('#26262B', 0.6), tee = mat('#E2B33C', 0.7);
    shell(T, tee, -0.25, EYE_Y0 - 0.05, 0.2); sleeves(c.parts.arms, tee);
    for (let i = 0; i < 3; i++) T.add(at(rb(BW + 1.4, 1.0, D + 1.4, 0.48, vest), 0, 0.6 + i * 1.05, 0));   // puffer rings (cto pattern)
    const red = new THREE.MeshBasicMaterial({ color: '#FF1414' });                                                       // laser eyes: recolour only, never covered
    for (const e of c.parts.eyes) e.traverse(m => { if (m.isMesh) m.material = red; });
    const ph = phone(mat('#15171C', 0.4), mat('#0E1A12', 0.3)), gr = mat('#2EE86A', 0.4, '#1FD15A');
    [0.5, 0.9, 0.7, 1.2, 1.5].forEach((h, i) => ph.add(at(rb(0.08, h, 0.16, 0.02, gr), 0.27, -1.2 + h / 2 + i * 0.2, -0.5 + i * 0.25)));   // green candles climbing
    ph.scale.setScalar(1.4); hand(c, 1).add(at(ph, 2.8, 1.6, 0.6));
  },
  influencer(c) {
    const T = c.parts.torso, jk = mat('#E7A9C4', 0.7), wh = mat('#F4F1EC', 0.7);
    shell(T, jk); sleeves(c.parts.arms, jk, wh);
    T.add(at(rb(BW + 1.0, 0.6, D + 1.0, 0.25, wh), 0, 0.2, 0));                                      // bomber hem
    for (const sx of [-1, 1]) T.add(at(rb(0.6, EYE_Y0 - 0.3, D + 1.0, 0.2, wh), sx * (BW / 2 + 0.35), (EYE_Y0 - 0.3) / 2, 0));   // side stripes
    const sg = new THREE.Group(), fr = mat('#E2B33C', 0.4), ln = mat('#2A2A30', 0.2);                  // sunglasses pushed up, lying on top of the head
    for (const sx of [-1, 1]) sg.add(at(rb(3.0, 0.3, 2.2, 0.15, ln), sx * 2.2, 0, 0));
    sg.add(at(rb(1.6, 0.25, 0.3, 0.1, fr), 0, 0.05, 0.9)); for (const sx of [-1, 1]) sg.add(at(rb(0.25, 0.25, 4.5, 0.1, fr), sx * 3.8, 0, -1.4));
    T.add(at(sg, 0, BH + 0.1, F - 1.6));
    const st = new THREE.Group(), sv = mat('#C8CDD3', 0.3);                                            // selfie stick angled up and forward, phone turned back at Clawd
    const pole = cyl(0.15, 0.15, 9, sv, 10); st.add(at(pole, 0, 4.5, 0));
    const p = phone(mat('#F4F1EC', 0.4), mat('#3A4A66', 0.3)); p.rotation.z = Math.PI / 2; p.rotation.y = Math.PI / 2; st.add(at(p, 0, 9.4, 0));
    st.rotation.set(0.45, 0, -0.2); hand(c, 1).add(at(st, 2.9, 0.5, 0.6));
  },
};
