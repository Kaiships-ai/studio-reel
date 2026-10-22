import { THREE, BW, BH, D, EYE_Y0, EYE_Y1, mat, rb, at, shell, sleeves, flameShape } from './kit.js';
// ninjago batch: one ninja() helper (from the approved nj-kai pilot) + Wu + Garmadon. Own simple emblem shapes, no logos.
const HY = (EYE_Y1 + BH) / 2;
function shapeMesh(sh, m) { return new THREE.Mesh(new THREE.ShapeGeometry(sh), m); }
const EMBLEM = {
  bolt(s) { const p = [[0.2, 1.1], [-0.6, 0], [-0.05, 0], [-0.35, -1.1], [0.6, 0.15], [0.05, 0.15]]; const sh = new THREE.Shape(); sh.moveTo(p[0][0] * s, p[0][1] * s); p.slice(1).forEach(q => sh.lineTo(q[0] * s, q[1] * s)); return sh; },
  rock(s) { const p = [[-0.9, -0.8], [0.85, -0.8], [1.0, -0.1], [0.45, 0.85], [-0.3, 0.95], [-1.0, 0.1]]; const sh = new THREE.Shape(); sh.moveTo(p[0][0] * s, p[0][1] * s); p.slice(1).forEach(q => sh.lineTo(q[0] * s, q[1] * s)); return sh; },
  flame(s) { return flameShape(s); },
  wave(s) { const sh = new THREE.Shape(); sh.moveTo(-1.1 * s, -0.7 * s);   // two curls side by side over a flat base
    for (const x0 of [-1.1, 0]) { sh.bezierCurveTo((x0 + 0.05) * s, 0.3 * s, (x0 + 0.85) * s, 0.65 * s, (x0 + 1.0) * s, 0.15 * s); sh.bezierCurveTo((x0 + 0.85) * s, -0.15 * s, (x0 + 0.45) * s, 0.05 * s, (x0 + 0.6) * s, 0.25 * s); sh.bezierCurveTo((x0 + 0.5) * s, -0.2 * s, (x0 + 0.9) * s, -0.45 * s, (x0 + 1.1) * s, -0.4 * s); }
    sh.lineTo(1.1 * s, -0.7 * s); sh.lineTo(-1.1 * s, -0.7 * s); return sh; },
};
function emblem(kind, m, s = 1.15) {
  if (EMBLEM[kind]) return shapeMesh(EMBLEM[kind](s), m);
  const g = new THREE.Group();
  if (kind === 'snow') for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.28 * s, 2.1 * s), m); b.rotation.z = i * Math.PI / 3; g.add(b);
    for (const e of [-1, 1]) for (const sd of [-1, 1]) { const t = new THREE.Mesh(new THREE.PlaneGeometry(0.2 * s, 0.6 * s), m); const a = i * Math.PI / 3; const r = 0.7 * s * e;
      t.position.set(-Math.sin(a) * r, Math.cos(a) * r, 0.01); t.rotation.z = a + sd * 0.8; g.add(t); } }
  if (kind === 'glow') { const d = new THREE.Mesh(new THREE.CircleGeometry(1.0 * s, 4), m); d.scale.x = 0.7; g.add(d); }   // energy diamond
  return g;
}
const hand = (c, sx = 1) => c.parts.arms.find(a => a.userData.sx === sx);
function hood(T, m) {   // wrapped hood: rounded top, side flaps come down past the eye band only on the sides
  T.add(at(rb(BW + 0.9, BH - EYE_Y1 + 0.9, D + 0.9, 1.25, m), 0, (EYE_Y1 + BH + 0.9) / 2 + 0.02, 0));
  for (const sx of [-1, 1]) T.add(at(rb(0.6, 3.2, D + 0.6, 0.3, m), sx * (BW / 2 + 0.3), EYE_Y1 - 0.9, 0));
  T.add(at(rb(BW + 1.0, 0.35, D + 1.0, 0.17, m), 0, EYE_Y1 + 0.25, 0));   // wrap fold line
  T.add(at(rb(BW + 0.6, EYE_Y1 - EYE_Y0 + 0.4, 0.6, 0.25, m), 0, (EYE_Y0 + EYE_Y1) / 2, -D / 2 - 0.3));   // back panel: the hood wraps round, only the front slit is open
}
function ninja(c, { gi, dark, trim, emblemShape, weapon }) {
  const T = c.parts.torso, g = mat(gi), dk = mat(dark), tr = mat(trim, 0.5);
  shell(T, g); sleeves(c.parts.arms, g, dk); hood(T, g);
  T.add(at(rb(BW + 0.85, 0.7, D + 0.85, 0.2, dk), 0, 0.9, 0));
  const em = emblem(emblemShape, tr); T.add(at(em, -3.4, 2.15, D / 2 + 0.4));
  for (const sx of [-1, 1]) T.add(at(rb(0.25, EYE_Y0 + 0.3, 0.12, 0.05, tr), sx * 1.6, EYE_Y0 / 2 - 0.1, D / 2 + 0.42));
  T.add(at(rb(1.2, 1.2, 0.9, 0.3, g), -BW / 2 - 0.5, HY, -D / 2 + 1.2));
  for (const [k, a] of [[0, -0.5], [1, -0.95]]) { const t = new THREE.Group(); t.position.set(-BW / 2 - 0.6, HY, -D / 2 + 1.2 + k * 0.5); t.rotation.set(0, Math.PI * 0.75, a);
    t.add(at(rb(3.2, 1.0, 0.34, 0.15, g), 1.6, 0, 0)); T.add(t); }
  weapon(c, { tr, dk });
}
const steel = () => mat('#D9DDE2', 0.3), wood = () => mat('#8A5A34');
export const BUILD = {
  'nj-kai'(c) { ninja(c, { gi: '#C2382D', dark: '#7E1F1A', trim: '#E2B33C', emblemShape: 'flame', weapon(c, { tr }) {   // overrides pilot so the team shares one hood
    const sw = new THREE.Group(); sw.position.set(1.5, BH * 0.55, -D / 2 - 1.05); sw.rotation.z = 0.85; c.parts.torso.add(sw);
    sw.add(at(rb(0.55, 9.5, 0.16, 0.05, mat('#D9DDE2', 0.25)), 0, 2.4, 0), at(rb(0.6, 3.0, 0.5, 0.2, mat('#1F1A1A')), 0, -3.6, 0), at(rb(1.8, 0.3, 0.6, 0.1, tr), 0, -2.0, 0)); } }); },
  'nj-jay'(c) { ninja(c, { gi: '#2F6FC2', dark: '#1D4785', trim: '#F2D046', emblemShape: 'bolt', weapon(c, { tr }) {
    const a = hand(c, 1), n = new THREE.Group(); n.position.set(2.8, 0, 0.8); a.add(n);
    n.add(at(rb(0.7, 2.6, 0.7, 0.3, mat('#1F1A1A')), 0, 0.6, 0), at(rb(0.7, 2.6, 0.7, 0.3, mat('#1F1A1A')), 0.9, -2.4, 0.3));
    for (let i = 0; i < 4; i++) n.add(at(rb(0.22, 0.22, 0.22, 0.1, tr), 0.25 + i * 0.18, -0.9 - i * 0.2, 0.1)); } }); },
  'nj-cole'(c) { ninja(c, { gi: '#34343A', dark: '#1A1A1E', trim: '#B88B4A', emblemShape: 'rock', weapon(c, { tr }) {
    const s = new THREE.Group(); s.position.set(-1.5, BH * 0.55, -D / 2 - 0.75); s.rotation.z = -0.6; c.parts.torso.add(s);
    s.add(at(rb(0.5, 11, 0.5, 0.2, wood()), 0, 0, 0));
    const blade = shapeMesh((() => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(2.5, 0.8, 4.2, -1.4); sh.quadraticCurveTo(2.2, -0.6, 0, -1.0); return sh; })(), mat('#C9CED6', 0.3));
    blade.material.side = THREE.DoubleSide; s.add(at(blade, 0.2, 5.4, 0)); s.add(at(rb(0.8, 0.5, 0.8, 0.2, tr), 0, 4.6, 0)); } }); },
  'nj-zane'(c) { ninja(c, { gi: '#EDEFF2', dark: '#9FB3C8', trim: '#5FB7E6', emblemShape: 'snow', weapon(c) {
    const a = hand(c, 1), m = steel();
    const st = new THREE.Group(); st.position.set(3.6, 0.6, 0.9);   // one 4-point star facing the camera
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.4, 4), m); const ang = i * Math.PI / 2; b.position.set(Math.sin(ang) * 0.75, Math.cos(ang) * 0.75, 0); b.rotation.z = -ang; b.scale.z = 0.25; st.add(b); }
    st.add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16).rotateX(Math.PI / 2), mat('#5FB7E6'))); a.add(st); } }); },
  'nj-lloyd'(c) { ninja(c, { gi: '#3E9B4F', dark: '#25622F', trim: '#E2B33C', emblemShape: 'glow', weapon(c) {
    const a = hand(c, 1), orb = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 16), mat('#5FE05A', 0.5, '#3BD43A')); orb.material.emissiveIntensity = 0.7; a.add(at(orb, 3.1, 1.3, 0.8)); } }); },
  'nj-nya'(c) { ninja(c, { gi: '#1E8C72', dark: '#115646', trim: '#BFE9F0', emblemShape: 'wave', weapon(c, { tr }) {
    const a = hand(c, 1), sp = new THREE.Group(); sp.position.set(2.9, 0, 0.6); a.add(sp);
    sp.add(at(rb(0.4, 9, 0.4, 0.18, wood()), 0, 1.5, 0)); const tip = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.8, 4), steel()); sp.add(at(tip, 0, 6.9, 0)); sp.add(at(rb(0.8, 0.4, 0.8, 0.15, tr), 0, 5.9, 0)); } }); },
  'nj-wu'(c) {
    const T = c.parts.torso, robe = mat('#F1ECE2'), gold = mat('#C9A24A', 0.6), straw = mat('#D8B56A', 0.9), beard = mat('#F7F5F0', 0.9);
    shell(T, robe); sleeves(c.parts.arms, robe, gold);
    T.add(at(rb(BW + 0.85, 0.6, D + 0.85, 0.2, gold), 0, 1.4, 0));
    const hat = new THREE.Mesh(new THREE.ConeGeometry(9.5, 3.4, 40), straw); T.add(at(hat, 0, BH + 1.9, 0));
    T.add(at(new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.4, 0.5, 32), mat('#B8924E')), 0, BH + 0.35, 0));
    const bd = new THREE.Group(); bd.position.set(0, 0, D / 2 + 0.75); T.add(bd);   // beard: light, starts low (below the eyes), hangs below y 3
    const bb = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), beard); bb.scale.set(3.0, 1.75, 0.55); bd.add(at(bb, 0, 1.8, 0));   // soft wide beard, y ~0.05..3.55
    const tipB = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), beard); tipB.scale.set(1.5, 1.3, 0.5); bd.add(at(tipB, 0, 1.3, 0.15));
    const st = hand(c, -1); st.add(at(rb(0.5, 15, 0.5, 0.2, mat('#9C8A4A')), -2.9, 2.5, 0.6)); for (const y of [0, 3, 6]) st.add(at(rb(0.65, 0.2, 0.65, 0.1, mat('#6E6030')), -2.9, y, 0.6));
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.55, 0.9, 20), mat('#7FA88A', 0.5)); hand(c, 1).add(at(cup, 2.9, 0.9, 0.6));
    if (c.opts?.noSet !== true) { const pot = new THREE.Group(); pot.name = 'set-teapot'; const jade = mat('#7FA88A', 0.5);
      const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 20, 14), jade); body.scale.y = 0.8; pot.add(at(body, 0, 1.3, 0));
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 1.6, 10), jade); sp.rotation.z = -0.9; pot.add(at(sp, 1.8, 1.6, 0));
      const hd = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.16, 8, 20), jade); pot.add(at(hd, -1.7, 1.4, 0));
      pot.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.3, 20), jade), 0, 2.55, 0), at(new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), mat('#5E8468', 0.5)), 0, 2.8, 0));
      pot.position.set(9, 0, 4); c.group.add(pot); }
  },
  'nj-garmadon'(c) {
    const T = c.parts.torso, ar = mat('#2A1E2E', 0.7), dk = mat('#160F18', 0.7), bone = mat('#D9D2C3', 0.8), purple = mat('#5A2F63');
    shell(T, ar); sleeves(c.parts.arms, ar, dk);
    T.add(at(rb(BW + 1.0, BH - EYE_Y1 + 0.6, D + 1.0, 0.6, ar), 0, (EYE_Y1 + BH + 0.6) / 2, 0));   // helmet
    for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.7, 4.2, 16), bone); h.position.set(sx * 4.6, BH + 2.3, 0); h.rotation.z = -sx * 0.45; T.add(h); }
    T.add(at(rb(BW + 0.85, 0.7, D + 0.85, 0.2, purple), 0, 0.9, 0));
    for (const a of c.parts.arms) a.add(at(rb(2.4, 1.0, 3.0, 0.4, dk), a.userData.sx * 1.0, 1.4, 0));   // pauldrons on the arms (nothing dark under the eyes)
    const cape = rb(BW - 0.4, BH + 1.2, 0.3, 0.15, mat('#3B1E40')); cape.rotation.x = -0.04; T.add(at(cape, 0, (BH + 1.2) / 2 - 1.4, -D / 2 - 0.45));
    T.add(at(rb(BW + 1.2, 0.7, 1.2, 0.3, purple), 0, BH - 0.5, -D / 2 - 0.3));   // collar bar holding the cape
    const red = mat('#D41414', 0.6, '#B00000'); red.emissiveIntensity = 0.9; for (const e of c.parts.eyes) e.traverse(o => { if (o.material) o.material = red; });   // glowing red eyes (this role only)
  },
};
