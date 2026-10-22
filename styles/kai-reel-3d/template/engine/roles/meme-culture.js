import { THREE, BW, BH, D, EYE_Y0, EYE_Y1, mat, rb, at, shell, sleeves } from './kit.js';

// meme + culture batch (stonks, gigachad, npc, galaxy-brain, sigma, ong-do, ao-dai)
const hand = (c, sx) => c.parts.arms.find(x => x.userData.sx === sx);
const tint = (c, col) => { for (const k of ['body', 'limb']) if (c.materials?.[k]) { const m = c.materials[k]; m.color.set(col); m.map = null; m.vertexColors = false; m.sheen = 0; m.needsUpdate = true; } };

export const BUILD = {
  stonks(c) {
    const T = c.parts.torso, suit = mat('#1F2430'), dk = mat('#151922');
    shell(T, suit); sleeves(c.parts.arms, suit, dk);
    T.add(at(rb(3.2, 2.2, 0.15, 0.3, mat('#F1ECE2')), 0, EYE_Y0 - 1.25, D / 2 + 0.46));          // shirt front, light (never dark under the eyes)
    T.add(at(rb(0.8, 2.6, 0.2, 0.2, mat('#2F6FDB')), 0, EYE_Y0 - 1.6, D / 2 + 0.58));            // tie
    for (const sx of [-1, 1]) T.add(at(rb(0.35, EYE_Y0, 0.12, 0.1, mat('#2C3242')), sx * 2.0, EYE_Y0 / 2 - 0.1, D / 2 + 0.45));   // lapels
    const pin = new THREE.Group(), po = mat('#F08A24', 0.6); pin.add(at(rb(0.5, 1.6, 0.2, 0.1, po), 0, -0.3, 0)); const ph = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.9, 3), po); pin.add(at(ph, 0, 0.9, 0));
    pin.rotation.z = -0.5; T.add(at(pin, -3.6, 1.9, D / 2 + 0.55));                                  // worn sign: orange up-arrow pin (the big arrow is a set prop)
    const arrow = new THREE.Group(); arrow.name = 'set-arrow';                                  // set prop: the big orange arrow going up
    const o = mat('#F08A24', 0.6), pts = [[-14, 1], [-7, 7], [-2, 4], [6, 13]];
    for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], L = Math.hypot(x1 - x0, y1 - y0);
      const s = rb(L + 1.4, 1.8, 1.2, 0.3, o); s.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0); s.rotation.z = Math.atan2(y1 - y0, x1 - x0); arrow.add(s); }
    const head = new THREE.Mesh(new THREE.ConeGeometry(2.6, 4, 3), o); head.position.set(7.4, 14.6, 0); head.rotation.z = -Math.atan2(8, 9); arrow.add(head);
    arrow.position.set(-3, 2, -9);
    if (c.opts?.noSet !== true) c.group.add(arrow);
  },
  gigachad(c) {
    const T = c.parts.torso; tint(c, '#A9ADB3');                                                  // black-and-white grade (this role only)
    const g = mat('#E4E8EE'), lt = mat('#F4F6F8');
    T.add(at(rb(BW - 2.5, 1.8, 0.6, 0.25, mat('#B9BDC3')), 0, 1.3, D / 2 + 0.3));                             // the square chin plate, jutting forward
    // (no chin cleft: any dark/vertical line there read as teeth)
    for (const sx of [-1, 1]) T.add(at(rb(1.6, 1.0, D - 2, 0.3, g), sx * (BW / 2 - 0.4), 2.3, 0)); // jaw corners
  },
  npc(c) {
    const T = c.parts.torso; tint(c, '#9DA3AB');                                                  // grey tint (this role only)
    const tee = mat('#6E747C'); shell(T, tee, -0.25, EYE_Y0 - 0.6); sleeves(c.parts.arms, tee);
  },
  'galaxy-brain'(c) {
    const T = c.parts.torso, m = mat('#A35CFF', 0.4, '#7A2BE0'), m2 = mat('#D9B8FF', 0.4, '#B67CFF');
    const dome = new THREE.Mesh(new THREE.SphereGeometry(4.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), m); dome.scale.set(1.15, 0.9, 1); T.add(at(dome, 0, BH, 0));
    for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 2.2 + (i % 3) * 0.7, b = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 10), i % 2 ? m2 : m);
      T.add(at(b, Math.cos(a) * r, BH + 2.4 + (i % 2) * 0.6, Math.sin(a) * r * 0.8)); }
    T.add(at(rb(0.3, 1.2, 8, 0.12, mat('#3A1466', 0.6)), 0, BH + 3.8, 0));                     // middle groove: reads as a brain
    T.add(at(new THREE.PointLight('#B67CFF', 40, 25), 0, BH + 5, 2));
    for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshBasicMaterial({ color: '#F4E9FF' }));
      T.add(at(s, Math.cos(i) * 6.5, BH + 1 + (i % 3) * 1.6, Math.sin(i) * 5)); }                 // orbiting stars
  },
  sigma(c) {
    const T = c.parts.torso, coat = mat('#17171B'), lin = mat('#2A2A30');
    shell(T, coat, -0.9, EYE_Y0 - 0.05);                                                          // long coat, below the body
    sleeves(c.parts.arms, coat, lin);
    T.add(at(rb(BW + 1.2, 0.9, D + 1.2, 0.3, coat), 0, EYE_Y0 - 0.65, 0));                         // collar
    const sh = mat('#0B0B0D', 0.3);                                                              // shades pushed up on the head, eyes stay free
    const gl = new THREE.Group(); for (const sx of [-1, 1]) gl.add(at(rb(3.0, 1.4, 0.3, 0.4, sh), sx * 2.2, 0, 0)); gl.add(at(rb(1.6, 0.3, 0.3, 0.1, sh), 0, 0.3, 0));
    gl.rotation.x = -Math.PI / 2; T.add(at(gl, 0, BH + 0.15, D / 2 - 1.6));                             // shades lying flat on the top face
  },
  'ong-do'(c) {
    const T = c.parts.torso, the = mat('#2B2B3A'), dk = mat('#1E1E2A'), kh = mat('#1B1B24', 0.7);
    shell(T, the); sleeves(c.parts.arms, the, dk);
    for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(4.2 - i * 0.15, 0.55, 10, 40), kh);    // khăn xếp: stacked wraps
      r.rotation.x = Math.PI / 2; r.rotation.z = i * 0.3; T.add(at(r, 0, BH + 0.4 + i * 0.75, 0)); }
    T.add(at(new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, 0.4, 28), kh), 0, BH + 2.9, 0));
    const w = mat('#F4F1EA');                                                                    // thin white beard from the lower face edge
    // no beard: every beard shape on the dark coat read as a fang or teeth; khăn xếp + brush + red paper carry the role
    const br = new THREE.Group(), a = hand(c, 1);
    br.add(at(rb(0.6, 3.6, 0.6, 0.2, mat('#B07A3A')), 0, 0, 0)); const tip = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 12), mat('#141414')); tip.rotation.x = Math.PI; br.add(at(tip, 0, -2.2, 0));
    br.rotation.z = -0.4; a.add(at(br, 2.9, 1.2, 0.8));
    const p = hand(c, -1); p.add(at(rb(0.15, 4.5, 2.6, 0.05, mat('#C8232B', 0.9)), -3.0, -1.4, 0.6));   // red paper
  },
  'ao-dai'(c) {
    const T = c.parts.torso, red = mat('#C2382D'), gold = mat('#E2B33C', 0.5);
    shell(T, red); sleeves(c.parts.arms, red, gold);
    T.add(at(rb(BW + 0.9, 0.6, D + 0.9, 0.25, red), 0, EYE_Y0 - 0.25, 0));                      // collar
    for (const z of [1, -1]) T.add(at(rb(BW - 6, 3.2, 0.7, 0.25, red), 0, -0.3, z * (D / 2 + 0.45)));   // long front/back flaps
    T.add(at(rb(0.3, 0.3, 0.12, 0.05, gold), 2.6, EYE_Y0 - 1.3, D / 2 + 0.45));
    const non = new THREE.Mesh(new THREE.ConeGeometry(7.5, 4.6, 40, 1, true), mat('#E3CF98', 0.9)); non.material.side = THREE.DoubleSide;
    T.add(at(non, 0, BH + 2.0, 0));
    T.add(at(new THREE.Mesh(new THREE.TorusGeometry(7.4, 0.12, 6, 48), mat('#C9B27A')), 0, BH - 0.3, 0)).children;
    T.children[T.children.length - 1].rotation.x = Math.PI / 2;
  },
};
