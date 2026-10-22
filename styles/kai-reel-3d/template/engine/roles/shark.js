import { THREE, BW, BH, D, EYE_Y0, EYE_Y1, mat, rb, at, shell, sleeves } from './kit.js';

// batch: shark (Shark Tank nods). Real people = costume nod only: clothes, hair colour, one prop. No faces, names or logos.
const FZ = D / 2 + 0.38;                                                                   // front face of a shell
const hand = c => c.parts.arms.find(x => x.userData.sx === 1);

function suit(c, col, tie = '#9A2A2A', shirt = '#EEF0F2') {                               // closed jacket shell, lapel-free front, shirt strip + tie
  const T = c.parts.torso, m = mat(col), dk = mat(new THREE.Color(col).multiplyScalar(0.7));
  shell(T, m); sleeves(c.parts.arms, m, mat(shirt));
  T.add(at(rb(2.2, 2.9, 0.12, 0.1, mat(shirt)), 0, 1.75, FZ + 0.06));                      // shirt strip (top 3.2, light)
  const t = mat(tie, 0.6);
  T.add(at(rb(0.9, 0.6, 0.3, 0.12, t), 0, 2.55, FZ + 0.2));                                // knot: top 2.85 < 3.0
  const blade = new THREE.Shape(); blade.moveTo(-0.35, 0); blade.lineTo(0.35, 0); blade.lineTo(0.6, -1.7); blade.lineTo(0, -2.2); blade.lineTo(-0.6, -1.7); blade.closePath();
  T.add(at(new THREE.Mesh(new THREE.ExtrudeGeometry(blade, { depth: 0.18, bevelEnabled: false }), t), 0, 2.3, FZ + 0.12));
  for (const sx of [-1, 1]) T.add(at(rb(0.35, 0.35, 0.1, 0.1, dk), sx * 1.6, 1.0, FZ + 0.06));   // two buttons, low
  return { T, m };
}
function hairTop(T, col, h = 0.9, over = 0.4) { const m = mat(col, 0.7); T.add(at(rb(BW + over, h, D + over, 0.4, m), 0, BH + h / 2 - 0.05, 0)); return m; }
function chair(c) {                                                                       // set prop: leather chair behind Clawd
  if (c.opts?.noSet === true) return;
  const g = new THREE.Group(); g.name = 'set-chair'; const lea = mat('#5A3524', 0.55), leg = mat('#2A2A2E', 0.4);
  g.add(at(rb(16, 2, 13, 0.9, lea), 0, -1.3, -1), at(rb(16, 15, 2.2, 1.0, lea), 0, 5.5, -7.2));
  for (const sx of [-1, 1]) g.add(at(rb(2, 5, 12, 0.8, lea), sx * 9, 1.0, -1.5));
  g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 3, 12), leg), 0, -3.8, -1));
  c.group.add(g);
}

export const BUILD = {
  shark(c) {
    const { T } = suit(c, '#1F2430', '#2F6FC2');
    const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(5, 0); fin.quadraticCurveTo(3.2, 1.2, 1.2, 5.2); fin.quadraticCurveTo(0.6, 2, 0, 0);
    const f = new THREE.Mesh(new THREE.ExtrudeGeometry(fin, { depth: 0.6, bevelEnabled: true, bevelSize: 0.15, bevelThickness: 0.15 }), mat('#6B7C8C'));
    f.rotation.y = Math.PI / 2.6; T.add(at(f, -0.3, BH - 0.2, 0.5));                         // fin rises from the top-back, sweeping backward
    chair(c);
  },
  'mr-wonderful'(c) {
    const { T } = suit(c, '#16181D', '#B23A48');
    T.add(at(rb(1.3, 0.7, 0.12, 0.1, mat('#E9E6DC')), -3.6, 2.6, FZ + 0.08));               // pocket square
    const cap = mat('#E8C9A8', 0.6); T.add(at(rb(BW, 0.4, D, 0.4, cap), 0, BH + 0.15, 0));   // bald cap
    const k = mat('#111114', 0.4);
    for (const sx of [-1, 1]) {                                                           // black frames: thick brow + sides + bridge, no bar under the eyes
      T.add(at(rb(2.9, 0.45, 0.25, 0.1, k), sx * 3.5, EYE_Y1 + 0.35, D / 2 + 0.15));
      for (const ex of [-1, 1]) T.add(at(rb(0.3, EYE_Y1 - EYE_Y0 + 0.4, 0.25, 0.1, k), sx * 3.5 + ex * 1.45, (EYE_Y0 + EYE_Y1) / 2 + 0.2, D / 2 + 0.15));
    }
    T.add(at(rb(4.1, 0.3, 0.25, 0.1, k), 0, EYE_Y1 + 0.1, D / 2 + 0.15));
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.3, 32), mat('#E2B33C', 0.35)); coin.rotation.x = Math.PI / 2;
    hand(c).add(at(coin, 2.9, 1.3, 0.6));
  },
  barbara(c) {
    const T = c.parts.torso, red = mat('#C2382D'); shell(T, red); sleeves(c.parts.arms, red, mat('#8E231C'));
    const p = mat('#F6F2EA', 0.3);
    const pg = new THREE.SphereGeometry(0.3, 12, 8), W2 = BW / 2 + 0.5, D2 = D / 2 + 0.5;          // pearl ring all round the collar: reads as a necklace, not a smile
    for (let i = 0; i < 64; i++) { const u = i / 64 * 2 * (2 * W2 + 2 * D2); let x, z, q = u;
      if (q < 2 * W2) { x = -W2 + q; z = D2; } else if ((q -= 2 * W2) < 2 * D2) { x = W2; z = D2 - q; } else if ((q -= 2 * D2) < 2 * W2) { x = W2 - q; z = -D2; } else { q -= 2 * W2; x = -W2; z = -D2 + q; }
      T.add(at(new THREE.Mesh(pg, p), x, EYE_Y0 - 0.2, z)); }
    const bl = hairTop(T, '#E9CF7A', 1.4, 0.8);                                           // blonde bob: top + side/back panels to the jaw
    for (const sx of [-1, 1]) T.add(at(rb(0.7, 2.0, D + 0.8, 0.35, bl), sx * (BW / 2 + 0.55), BH - 0.9, -0.2));
    T.add(at(rb(BW + 0.8, 2.0, 0.7, 0.35, bl), 0, BH - 0.9, -D / 2 - 0.55));
  },
  cuban(c) {
    const T = c.parts.torso, blue = mat('#1F5FA8'), w = mat('#F2F4F6');
    shell(T, blue); for (const a of c.parts.arms) a.add(at(rb(0.5, 2.5, 2.8, 0.2, w), a.userData.sx * 0.3, 0, 0));   // sleeveless: white trim at the shoulder
    T.add(at(rb(BW + 0.85, 0.35, D + 0.85, 0.1, w), 0, 0.2, 0));                             // white hem stripe
    for (const sx of [-1, 1]) T.add(at(rb(0.4, 3.4, 0.12, 0.1, w), sx * 2.4, 1.8, FZ + 0.06));  // side piping (no number, no logo)
    hairTop(T, '#2A211C', 0.7, 0.3);
    const ball = new THREE.Group(); ball.add(new THREE.Mesh(new THREE.SphereGeometry(1.6, 28, 18), mat('#D9732E', 0.8)));
    for (const r of [0, Math.PI / 2]) { const s = new THREE.Mesh(new THREE.TorusGeometry(1.61, 0.06, 6, 40), mat('#2A1A12')); s.rotation.y = r; ball.add(s); }
    const eq = new THREE.Mesh(new THREE.TorusGeometry(1.61, 0.06, 6, 40), mat('#2A1A12')); eq.rotation.x = Math.PI / 2; ball.add(eq);
    hand(c).add(at(ball, 3.4, 1.6, 0.6));
  },
  lori(c) {
    const T = c.parts.torso, teal = mat('#2F9E8F'); shell(T, teal); sleeves(c.parts.arms, teal);
    T.add(at(rb(BW + 1.8, 1.6, D + 1.8, 0.6, teal), 0, 0.4, 0));                               // flared skirt hem
    T.add(at(rb(BW + 1.0, 0.4, D + 1.0, 0.15, mat('#1F6E63')), 0, 2.3, 0));                    // waist band
    const br = hairTop(T, '#9A6A42', 1.2, 0.8);                                            // long brown hair: top + back to the waist + side locks
    T.add(at(rb(BW + 0.8, 3.5, 0.8, 0.4, br), 0, BH - 1.5, -D / 2 - 0.6));
    for (const sx of [-1, 1]) T.add(at(rb(0.7, 3.0, D - 2, 0.35, br), sx * (BW / 2 + 0.55), BH - 1.6, -1.2));
    const box = new THREE.Group(); box.add(rb(3.4, 3.4, 3.4, 0.15, mat('#F2EDE3')));
    box.add(rb(3.5, 3.5, 0.5, 0.1, mat('#E2B33C')), rb(0.5, 3.5, 3.5, 0.1, mat('#E2B33C')));  // ribbon cross
    hand(c).add(at(box, 3.8, 2.0, 0.6));
  },
  daymond(c) {
    const T = c.parts.torso, ol = mat('#4A5233'), rib = mat('#1E1F22'), or = mat('#E8822A');
    shell(T, ol); sleeves(c.parts.arms, ol, rib);
    T.add(at(rb(BW + 0.9, 0.7, D + 0.9, 0.2, rib), 0, 0.15, 0));                              // ribbed hem
    T.add(at(rb(0.35, 3.4, 0.12, 0.1, mat('#B9BCC0', 0.3)), 0, 1.8, FZ + 0.06));             // zip
    for (const sx of [-1, 1]) T.add(at(rb(0.25, 2.6, 2.7, 0.1, mat('#F2F4F6')), sx * (BW / 2 + 0.5), 1.8, 0));   // white side stripe
    const cap = mat('#1E1F22', 0.6);
    T.add(at(rb(BW - 1, 1.3, D - 1, 0.6, cap), 0, BH + 0.6, 0));                               // cap crown on top
    const brim = rb(BW - 1, 0.45, 3.6, 0.15, cap); brim.rotation.x = 0.35; T.add(at(brim, 0, BH + 0.45, D / 2 + 1.1));                             // brim forward, above the eyes
    T.add(at(rb(0.8, 0.4, 0.8, 0.2, or), 0, BH + 1.35, 0));                                   // button
  },
  herjavec(c) {
    const { T } = suit(c, '#7C838C', '#2B3A55');
    hairTop(T, '#1A1716', 0.8, 0.3); T.add(at(rb(BW - 0.6, 1.1, D - 1.5, 0.5, mat('#1A1716', 0.4)), 0, BH + 1.2, -0.6));   // slicked back: lift at the back
    const sh = new THREE.Shape(); sh.moveTo(0, 1.4); sh.lineTo(1.2, 1.0); sh.quadraticCurveTo(1.2, -0.6, 0, -1.5); sh.quadraticCurveTo(-1.2, -0.6, -1.2, 1.0); sh.closePath();
    const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.35, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.1 }), mat('#2F6FC2')));
    g.add(at(rb(0.8, 0.9, 0.2, 0.15, mat('#F2F4F6')), 0, -0.1, 0.5), at(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.09, 8, 16, Math.PI), mat('#F2F4F6')), 0, 0.35, 0.5));   // padlock mark
    hand(c).add(at(g, 3.2, 1.6, 0.8));
  },
};
