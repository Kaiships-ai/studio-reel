import { THREE, BW, BH, D, EYE_Y0, EYE_Y1, mat, rb, at, shell, sleeves } from './kit.js';

// creator + anime costume nods (no likeness, no names, no logos/symbols)
const arm = (c, sx) => c.parts.arms.find(a => a.userData.sx === sx);
const setOn = c => c.opts?.noSet !== true;
function spikes(T, m, list) {           // list of [x, z, h, tiltX, tiltZ]
  for (const [x, z, h, tx, tz] of list) { const s = new THREE.Mesh(new THREE.ConeGeometry(1.5, h, 4), m); s.castShadow = true; s.rotation.set(tx, Math.PI / 4, tz); T.add(at(s, x, BH + h / 2 - 0.3, z)); }
}
function hairCap(T, m, h = 0.9, front = 0.35) { T.add(at(rb(BW + 0.5, h, D + 0.5 + front, 0.4, m), 0, BH + h / 2 - 0.15, front / 2)); }
function beard(T, m) {                  // full beard: wide top, narrower rounded bottom, thin moustache, sideburns
  T.add(at(rb(BW - 1.2, 1.9, 0.8, 0.38, m), 0, 2.05, D / 2 + 0.4));
  for (const sx of [-1, 1]) T.add(at(rb(3.6, 1.3, 0.8, 0.55, m), sx * 2.2, 0.75, D / 2 + 0.42));
  T.add(at(rb(5.5, 1.0, 0.8, 0.45, m), 0, 0.15, D / 2 + 0.44));
  T.add(at(rb(5.2, 0.4, 0.5, 0.18, m), 0, 3.3, D / 2 + 0.3));
  for (const sx of [-1, 1]) T.add(at(rb(0.5, 2.1, 2.6, 0.2, m), sx * (BW / 2 + 0.45), 2.55, D / 2 - 1.0));
}
function node(col, s = 1) {             // a workflow node: rounded tile + port dots
  const g = new THREE.Group(); g.add(rb(2.6 * s, 1.8 * s, 0.6 * s, 0.35 * s, mat(col)));
  const w = mat('#F4F1EA'); for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.28 * s, 12, 8), w), sx * 1.35 * s, 0, 0));
  g.add(at(rb(1.4 * s, 0.25 * s, 0.1, 0.1, w), 0, 0.3 * s, 0.33 * s)); return g;
}
function link(a, b, m) {                // thin bar from point a to point b
  const v = new THREE.Vector3().subVectors(b, a), l = v.length(), bar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, l, 6), m);
  bar.position.copy(a).addScaledVector(v, 0.5); bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); return bar;
}
function board(w, h, face, frame) { const g = new THREE.Group(); g.add(rb(w + 0.6, h + 0.6, 0.4, 0.15, frame), at(rb(w, h, 0.2, 0.05, face), 0, 0, 0.25)); return g; }

export const BUILD = {
  hormozi(c) {
    const T = c.parts.torso, tee = mat('#1A1A1C'), m = mat('#6B4A35', 0.95);
    shell(T, tee); sleeves(c.parts.arms, tee);
    beard(T, m);
    const mk = new THREE.Group(); mk.add(rb(0.5, 2.2, 0.5, 0.2, mat('#F1ECE2')), at(rb(0.52, 0.6, 0.52, 0.2, mat('#C2382D')), 0, 1.2, 0)); mk.rotation.z = -0.4;
    arm(c, 1).add(at(mk, 2.9, 0.8, 0.6));
    { const hb = board(6, 4, mat('#F4F2EE', 0.6), mat('#9AA0A8', 0.5)); const ink = mat('#2B4C9A'); for (const [y, w] of [[1, 4], [0, 3], [-1, 4.5]]) hb.add(at(rb(w, 0.3, 0.05, 0.1, ink), -2.5 + w / 2, y, 0.4)); arm(c, -1).add(at(hb, -5.2, 2.2, 1.2)); }
  },
  'nate-herk'(c) {
    const T = c.parts.torso, tee = mat('#5E7A6A'), cap = mat('#2E3A4F');
    shell(T, tee); sleeves(c.parts.arms, tee);
    T.add(at(rb(BW + 0.6, 1.1, D + 0.6, 0.45, cap), 0, BH + 0.4, 0));
    T.add(at(rb(BW - 1, 0.35, 4.0, 0.15, mat('#4A6FA5')), 0, BH + 0.05, D / 2 + 1.9));           // brim forward, above the eyes
    arm(c, 1).add(at(node('#E2B33C', 0.8), 3.0, 1.0, 0.8));
    { const lk = mat('#B8BEC6'); const P = [[-6, 10.6, 0, '#D9774A'], [0, 11.6, 0, '#5B8DD6'], [6, 10.6, 0, '#7FB069']].map(([x, y, z, col]) => { T.add(at(node(col, 0.9), x, y, z)); return new THREE.Vector3(x, y, z); }); for (let i = 0; i < 2; i++) T.add(link(P[i], P[i + 1], lk)); }
  },
  'nick-saraev'(c) {
    const T = c.parts.torso, tee = mat('#2F3338');
    shell(T, tee); sleeves(c.parts.arms, tee);
    hairCap(T, mat('#4A3626', 0.95), 0.8, 0.4);
    { const lp = new THREE.Group(), al = mat('#C9CED6', 0.4); lp.add(rb(4.2, 0.25, 3, 0.1, al)); const scr = new THREE.Group(); scr.position.set(0, 0.1, -1.5); scr.rotation.x = -0.35; scr.add(at(rb(4.2, 2.9, 0.2, 0.1, al), 0, 1.45, 0), at(rb(3.7, 2.4, 0.05, 0.05, mat('#5B8DD6', 0.5)), 0, 1.45, 0.12)); lp.add(scr); arm(c, 1).add(at(lp, 3.6, 0.6, 1.2)); }
    if (setOn(c)) {
      const s = new THREE.Group(); s.name = 'set-desk';
      const wood = mat('#B58B5E', 0.7); s.add(at(rb(14, 0.6, 6, 0.2, wood), 22, 5, 2));
      for (const x of [16, 28]) for (const z of [0, 4]) s.add(at(rb(0.5, 5, 0.5, 0.1, wood), x, 2.5, z));
      s.add(at(rb(4, 2.6, 0.3, 0.2, mat('#2A2D33', 0.5)), 22, 6.8, 1.5), at(rb(0.8, 1, 0.6, 0.2, mat('#7FB069')), 26, 5.8, 3));
      const cb = board(10, 6.5, mat('#2F3F35', 0.95), mat('#8A6A48')); cb.position.set(-15, 10, -4); cb.rotation.y = 0.35;
      const ch = mat('#E9E6DC', 0.95); for (const [y, w] of [[1.8, 7], [0.3, 5], [-1.2, 6]]) cb.add(at(rb(w, 0.4, 0.05, 0.15, ch), -3.5 + w / 2, y, 0.4));
      cb.add(at(rb(0.4, 6, 0.4, 0.1, mat('#8A6A48')), 0, -6, -0.3)); s.add(cb);
      c.group.add(s);
    }
  },
  mrbeast(c) {
    const T = c.parts.torso, blue = mat('#2F6FD6'), dk = mat('#1F4E9E');
    shell(T, blue); sleeves(c.parts.arms, blue, dk);
    T.add(at(rb(6.2, 1.3, 0.2, 0.4, dk), 0, 0.75, D / 2 + 0.5));
    T.add(at(rb(7.5, 2.4, 1.8, 0.8, blue), 0, EYE_Y0 - 0.1, -D / 2 - 1.1));
    const hair = mat('#3A2A1E', 0.95); hairCap(T, hair, 1.0, 0.3);
    T.add(at(rb(5, 1.0, 2.2, 0.45, hair), 2.2, BH + 0.95, D / 2 - 0.6));             // front swoop
    const ch = new THREE.Group(); ch.add(rb(11, 5, 0.3, 0.2, mat('#F7F5EE', 0.6)), at(rb(11, 1.0, 0.05, 0.05, mat('#4FA36A')), 0, 1.9, 0.18));
    const ink = mat('#3A3F48'); for (const [x, y, w] of [[-2, 0.4, 6], [-3, -0.8, 4], [3, -1.7, 3]]) ch.add(at(rb(w, 0.25, 0.05, 0.1, ink), x, y, 0.18));
    ch.add(at(rb(2.4, 1.2, 0.05, 0.2, mat('#4FA36A')), 3.8, 0, 0.18));
    arm(c, 1).add(at(ch, 7.5, 1.8, 1.4));
  },
  'goku-nod'(c) {
    const T = c.parts.torso, gi = mat('#F08A24'), blue = mat('#2C4FA3');
    shell(T, gi); sleeves(c.parts.arms, blue, gi);
    T.add(at(rb(BW + 0.85, 0.8, D + 0.85, 0.2, blue), 0, 1.0, 0));
    { const l = rb(0.6, 3.6, 0.12, 0.1, blue); l.rotation.z = -0.85; T.add(at(l, 0.25, 2.0, D / 2 + 0.42)); }
    const h = mat('#151517', 0.9); hairCap(T, h, 0.9, 0.2);
    spikes(T, h, [[0, 0, 5, 0, 0], [-3.5, 0.5, 4.2, 0, 0.45], [3.5, 0.5, 4.2, 0, -0.45], [-5, -2, 3.5, 0, 0.9], [5, -2, 3.5, 0, -0.9], [0, -3, 4, -0.5, 0], [-2.5, 3, 3.2, 0.5, 0.2], [2.5, 3, 3.2, 0.5, -0.2], [-1.5, -1, 4.5, -0.2, 0.25], [1.8, -1, 4.6, -0.2, -0.25]]);
  },
  'naruto-nod'(c) {
    const T = c.parts.torso, or = mat('#F07A1E'), bk = mat('#1C1C1F');
    shell(T, or); sleeves(c.parts.arms, bk, or);
    for (const sx of [-1, 1]) T.add(at(rb(0.2, EYE_Y0 - 0.3, D + 0.9, 0.08, bk), sx * (BW / 2 + 0.5), EYE_Y0 / 2 - 0.1, 0));
    T.add(at(rb(0.35, EYE_Y0 - 0.4, 0.15, 0.05, bk), 0, EYE_Y0 / 2, D / 2 + 0.45));      // zip line
    const band = mat('#22305A'); T.add(at(rb(BW + 0.5, 0.9, D + 0.5, 0.2, band), 0, (EYE_Y1 + BH) / 2 + 0.05, 0));
    T.add(at(rb(4.6, 1.2, 0.3, 0.15, mat('#B9C0C9', 0.35)), 0, (EYE_Y1 + BH) / 2 + 0.05, D / 2 + 0.35));
    for (const k of [0, 1]) { const t = rb(0.7, 2.6, 0.2, 0.1, band); t.rotation.x = 0.3 + k * 0.3; T.add(at(t, -0.8 + k * 1.6, 6.0, -D / 2 - 0.5)); }
    const h = mat('#F2C641', 0.85); hairCap(T, h, 0.7, 0.1);
    spikes(T, h, [[0, 0, 3.8, 0, 0], [-3.5, 0, 3.4, 0, 0.5], [3.5, 0, 3.4, 0, -0.5], [-5, -2.5, 2.8, -0.3, 0.9], [5, -2.5, 2.8, -0.3, -0.9], [0, -3, 3.2, -0.6, 0], [-2, 3, 2.8, 0.6, 0.2], [2, 3, 2.8, 0.6, -0.2], [-2, -1.5, 3.6, -0.2, 0.3], [2, -1.5, 3.6, -0.2, -0.3]]);
  },
};
