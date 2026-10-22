import { THREE, BW, BH, D, EYE_Y0, EYE_Y1, mat, rb, at, shell, sleeves } from './kit.js';
// movie-history batch: 5 movie costume nods (no logos, no likeness) + 6 history roles. Patterns from pilot.js / ninjago.js.
const HY = (EYE_Y1 + BH) / 2;
const hand = (c, sx = 1) => c.parts.arms.find(a => a.userData.sx === sx);
const cyl = (r0, r1, h, m, n = 24) => { const x = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, n), m); x.castShadow = true; return x; };
const glow = (c, e, k = 1.2) => { const m = mat(c, 0.4, e); m.emissiveIntensity = k; return m; };
const cap = (T, m, extra = 0.6, r = 0.6) => T.add(at(rb(BW + 1.0, BH - EYE_Y1 + extra, D + 1.0, r, m), 0, (EYE_Y1 + BH + extra) / 2, 0));   // headwear above the eye band
const cape = (T, m, h = BH + 0.6) => T.add(at(rb(BW - 0.4, h, 0.35, 0.15, m), 0, h / 2 - 1.2, -D / 2 - 0.45));   // hangs close on the back, bottom above the ground
const belt = (T, m, y = 0.9) => T.add(at(rb(BW + 0.85, 0.7, D + 0.85, 0.2, m), 0, y, 0));
const FZ = D / 2 + 0.4;   // just in front of the shell

export const BUILD = {
  'terminator-nod'(c) {
    const T = c.parts.torso, lea = mat('#1E1E22', 0.45), lap = mat('#2E2E34', 0.4);
    shell(T, lea); sleeves(c.parts.arms, lea, lap);
    for (const sx of [-1, 1]) { const l = rb(1.3, 2.6, 0.2, 0.1, lap); l.rotation.z = sx * 0.35; T.add(at(l, sx * 1.6, 1.4, FZ + 0.05)); }   // lapels, low (below y 3)
    T.add(at(rb(BW + 1.0, 1.4, 1.6, 0.4, lea), 0, EYE_Y0 - 0.4, -D / 2 - 0.6));   // collar up on the back only
    for (const y of [0.6, 1.6, 2.6]) T.add(at(rb(0.35, 0.35, 0.15, 0.1, mat('#9AA0A8', 0.3)), 2.6, y, FZ + 0.05));   // zipper studs
    const red = glow('#E01818', '#C00000', 2.5); c.parts.eyes[0].traverse(o => { if (o.material) o.material = red; });   // ONE glowing red eye (this role only)
  },
  'iron-nod'(c) {
    const T = c.parts.torso, red = mat('#B3221E', 0.5), gold = mat('#E0B13A', 0.45);
    shell(T, red, -0.25, 3.0); sleeves(c.parts.arms, red, gold);
    T.add(at(rb(BW + 0.9, 0.5, D + 0.9, 0.2, gold), 0, 3.05, 0));   // gold plate edge, ends at y 3.3
    belt(T, gold, 0.6);
    for (const sx of [-1, 1]) T.add(at(rb(3.2, 1.6, 0.2, 0.3, gold), sx * 3.6, 1.7, FZ + 0.05));   // gold ab plates
    const disc = cyl(1.0, 1.0, 0.25, glow('#CFF6FF', '#7FE3FF', 1.6), 28); disc.rotation.x = Math.PI / 2; T.add(at(disc, 0, 1.9, FZ + 0.15));   // chest light below y 3
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.18, 10, 28), gold); T.add(at(ring, 0, 1.9, FZ + 0.2));
    cap(T, red, 0.5);   // red head plate above the eyes
    T.add(at(rb(BW + 1.1, 0.3, D + 1.1, 0.12, gold), 0, EYE_Y1 + 0.2, 0));
  },
  'matrix-nod'(c) {
    const T = c.parts.torso, coat = mat('#141416', 0.4), blk = mat('#0A0A0C', 0.25);
    shell(T, coat, -0.8); sleeves(c.parts.arms, coat, blk);   // long coat: hangs below the body to y -1.85
    for (const sx of [-1, 1]) { const l = rb(1.2, 2.5, 0.2, 0.1, mat('#26262A', 0.4)); l.rotation.z = sx * 0.3; T.add(at(l, sx * 1.5, 1.3, FZ + 0.05)); }
    T.add(at(rb(BW + 0.8, 1.6, 1.4, 0.4, coat), 0, EYE_Y0 - 0.5, -D / 2 - 0.5));   // high collar, back
    const sh = new THREE.Group(); sh.position.set(0, BH + 0.1, D / 2 - 1.5); sh.rotation.x = -0.9; T.add(sh);   // tiny shades ABOVE the eyes (pushed up on the brow)
    for (const sx of [-1, 1]) sh.add(at(rb(2.4, 0.75, 0.25, 0.2, blk), sx * 3.5, 0, 0));
    sh.add(at(rb(2.3, 0.2, 0.2, 0.08, blk), 0, 0.15, 0));
    for (const sx of [-1, 1]) sh.add(at(rb(0.2, 0.2, D * 0.6, 0.08, blk), sx * 4.75, 0.15, -D * 0.3));
    if (c.opts?.noSet !== true) { const rain = new THREE.Group(); rain.name = 'set-code-rain';
      const gm = glow('#5CFF7A', '#1FD24A', 1.3), dm = glow('#2E9E44', '#137A2C', 0.8);
      for (let i = 0; i < 14; i++) { const x = -9.1 + i * 1.4, n = 4 + (i * 7 % 9), top = 14.5 - (i * 5 % 6);   // thin dotted columns, varying length, head glyph brightest
        for (let k = 0; k < n; k++) rain.add(at(new THREE.Mesh(new THREE.PlaneGeometry(0.28, k % 3 === 1 ? 0.35 : 0.6), k === 0 ? gm : dm), x, top - k * 0.85, -12)); }
      c.group.add(rain); }
  },
  'jedi-nod'(c) {
    const T = c.parts.torso, robe = mat('#6B4A2E'), tan = mat('#D8C49A'), lth = mat('#3A2A1C');
    shell(T, robe); sleeves(c.parts.arms, robe, robe);
    for (const sx of [-1, 1]) { const s = rb(1.0, 3.0, 0.2, 0.1, tan); s.rotation.z = sx * 0.4; T.add(at(s, sx * 1.4, 1.35, FZ + 0.02)); }   // tunic crossover strips, top below y 3
    belt(T, lth, 1.2);
    T.add(at(rb(8, 2.4, 2.0, 0.9, robe), 0, EYE_Y0 - 0.2, -D / 2 - 1.1));   // hood down on the back
    const a = hand(c, 1), sw = new THREE.Group(); sw.position.set(2.9, 0.4, 0.8); a.add(sw);
    sw.add(at(cyl(0.35, 0.35, 2.0, mat('#B8BEC6', 0.3), 16), 0, 0, 0), at(cyl(0.42, 0.42, 0.3, mat('#2A2A2E'), 16), 0, 0.8, 0));
    sw.add(at(cyl(0.28, 0.28, 8, glow('#2E8BFF', '#4FA8FF', 1.2), 16), 0, 5.0, 0));   // glowing blade
  },
  'bond-nod'(c) {
    const T = c.parts.torso, tux = mat('#18181C', 0.5), shirt = mat('#F4F2EE', 0.7), sat = mat('#0E0E10', 0.3);
    shell(T, tux); sleeves(c.parts.arms, tux, shirt);
    T.add(at(rb(3.2, 2.9, 0.15, 0.1, shirt), 0, 1.25, FZ + 0.02));   // shirt front, top at y 2.7
    for (const sx of [-1, 1]) { const l = rb(1.1, 2.6, 0.15, 0.08, sat); l.rotation.z = sx * 0.3; T.add(at(l, sx * 2.1, 1.3, FZ + 0.08)); }
    const bow = new THREE.Group(); bow.position.set(0, 2.3, FZ + 0.2); T.add(bow);   // bow tie, below y 2.7
    for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.0, 4), sat); w.rotation.z = sx * Math.PI / 2; w.scale.z = 0.3; bow.add(at(w, sx * 0.5, 0, 0)); }
    bow.add(at(rb(0.35, 0.4, 0.3, 0.1, sat), 0, 0, 0.05));
    for (const y of [0.6, 1.4]) T.add(at(rb(0.25, 0.25, 0.1, 0.1, sat), 0, y, FZ + 0.12));   // shirt studs
    const g = new THREE.Group(); g.position.set(2.9, 0.9, 0.8); hand(c, 1).add(g);   // small gadget
    g.add(rb(1.0, 1.6, 0.5, 0.2, mat('#8E949C', 0.35)), at(new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), glow('#FF4040', '#E00000', 1.4)), 0, 0.5, 0.28));
  },
  pirate(c) {
    const T = c.parts.torso, coat = mat('#A6262A'), gold = mat('#E2B33C', 0.5), blk = mat('#1A1614', 0.6);
    shell(T, coat); sleeves(c.parts.arms, coat, gold);
    belt(T, mat('#2B2B6A'), 1.3);   // sash
    T.add(at(rb(1.4, 1.2, 0.3, 0.2, gold), 0, 1.3, FZ + 0.3));   // buckle
    for (const sx of [-1, 1]) T.add(at(rb(0.25, 2.4, 0.12, 0.05, gold), sx * 2.0, 1.2, FZ + 0.05));
    const hat = new THREE.Group(); hat.position.set(0, BH, 0); T.add(hat);   // tricorn: 3-sided brim + crown, sits on the head
    const brim = cyl(7.4, 7.4, 0.5, blk, 3); brim.rotation.y = 0; hat.add(at(brim, 0, 0.25, 0));
    const edge = cyl(7.6, 7.6, 0.25, gold, 3); edge.rotation.y = 0; hat.add(at(edge, 0, 0.05, 0));
    hat.add(at(cyl(2.8, 3.4, 2.0, blk, 28), 0, 1.4, 0));
    const a = hand(c, 1), cut = new THREE.Group(); cut.position.set(2.9, 0.3, 0.8); a.add(cut);   // cutlass
    cut.add(at(rb(0.5, 1.6, 0.5, 0.2, mat('#4A2E1C')), 0, 0, 0), at(rb(1.6, 0.3, 0.6, 0.1, gold), 0, 0.9, 0));
    const bl = new THREE.Mesh(new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(-0.3, 0); s.lineTo(0.3, 0); s.quadraticCurveTo(0.6, 3.5, -0.2, 6.5); s.quadraticCurveTo(0.0, 3.5, -0.3, 0); return s; })()), mat('#D9DDE2', 0.25));
    bl.material.side = THREE.DoubleSide; cut.add(at(bl, 0, 1.0, 0));
  },
  knight(c) {
    const T = c.parts.torso, st = mat('#B9C0C8', 0.35), dk = mat('#7D858F', 0.4), plume = mat('#C2382D');
    shell(T, st); sleeves(c.parts.arms, st, dk);
    for (const y of [0.8, 2.0]) T.add(at(rb(BW + 0.9, 0.3, D + 0.9, 0.12, dk), 0, y, 0));   // plate lines
    cap(T, st, 0.8, 0.8);   // helmet top above the eye band
    for (const sx of [-1, 1]) T.add(at(rb(0.5, EYE_Y1 - EYE_Y0 + 0.6, D + 0.7, 0.2, st), sx * (BW / 2 + 0.35), (EYE_Y0 + EYE_Y1) / 2, 0));   // cheek plates on the sides only
    const vis = rb(BW + 0.6, 1.6, 0.35, 0.2, dk); vis.rotation.x = -0.6; T.add(at(vis, 0, BH + 0.95, D / 2 + 0.2));   // visor raised open
    const pl = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), plume); pl.scale.set(0.8, 1.4, 2.6); T.add(at(pl, 0, BH + 1.9, -1.5));
    const sh = new THREE.Group(); sh.position.set(-3.1, 0.2, 1.4); hand(c, -1).add(sh);   // shield on the left arm
    const sg = new THREE.ExtrudeGeometry((() => { const s = new THREE.Shape(); s.moveTo(-2.2, 2); s.lineTo(2.2, 2); s.lineTo(2.2, -0.2); s.quadraticCurveTo(2.0, -2.2, 0, -3.2); s.quadraticCurveTo(-2.0, -2.2, -2.2, -0.2); s.lineTo(-2.2, 2); return s; })(), { depth: 0.4, bevelEnabled: false });
    const shield = new THREE.Mesh(sg, mat('#2F5FA8')); shield.castShadow = true; sh.add(shield);
    sh.add(at(rb(4.0, 0.6, 0.2, 0.1, mat('#E2B33C', 0.5)), 0, 0.2, 0.45), at(new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), mat('#E2B33C', 0.5)), 0, 0.2, 0.5));   // band + round boss
    const sw = new THREE.Group(); sw.position.set(2.9, 0.3, 0.8); hand(c, 1).add(sw);
    sw.add(at(rb(0.5, 1.6, 0.5, 0.2, mat('#4A2E1C')), 0, 0, 0), at(rb(2.2, 0.35, 0.6, 0.1, dk), 0, 0.9, 0), at(rb(0.6, 7, 0.18, 0.08, mat('#E3E7EC', 0.25)), 0, 4.6, 0));
  },
  samurai(c) {
    const T = c.parts.torso, kim = mat('#2B3550'), red = mat('#9E2A24', 0.6), cord = mat('#D8B56A', 0.6), hair = mat('#16120F', 0.7);
    shell(T, kim); sleeves(c.parts.arms, kim, red);
    for (let i = 0; i < 3; i++) T.add(at(rb(BW + 0.95, 0.65, D + 0.95, 0.15, red), 0, 0.35 + i * 0.75, 0));   // lacquered plate rows, top at y 2.2
    for (let i = 0; i < 3; i++) T.add(at(rb(BW + 1.0, 0.1, D + 1.0, 0.04, cord), 0, 0.72 + i * 0.75, 0));
    for (const a of c.parts.arms) for (let i = 0; i < 2; i++) a.add(at(rb(2.4, 0.55, 3.0, 0.2, red), a.userData.sx * 1.0, 1.3 - i * 0.65, 0));   // shoulder plates
    T.add(at(rb(5, 0.5, 4, 0.25, hair), 0, BH + 0.2, -0.5));   // hair cap on top
    const tk = cyl(0.8, 0.8, 3.2, hair, 16); tk.rotation.x = Math.PI / 2; T.add(at(tk, 0, BH + 1.2, 0.2));   // topknot
    T.add(at(rb(1.3, 0.3, 0.6, 0.1, cord), 0, BH + 0.65, 0.1));
    const k = new THREE.Group(); k.position.set(-1.7, 1.2, FZ + 0.4); k.rotation.set(0, 0, 1.3); T.add(k);   // katana at the waist, left hip
    k.add(at(rb(0.5, 6.5, 0.6, 0.2, hair), 0, -0.6, 0), at(rb(0.55, 2.2, 0.55, 0.2, mat('#EDE6D6')), 0, 3.6, 0), at(cyl(0.6, 0.6, 0.2, cord, 16), 0, 2.45, 0));
  },
  pharaoh(c) {
    const T = c.parts.torso, lin = mat('#F1ECE2'), gold = mat('#E2B33C', 0.45), blue = mat('#2E4E9E');
    shell(T, lin); sleeves(c.parts.arms, lin, gold);
    for (const [y, m] of [[2.6, gold], [2.1, blue], [1.6, gold]]) T.add(at(rb(BW + 1.0, 0.45, D + 1.0, 0.15, m), 0, y, 0));   // broad collar, top at y 2.85
    belt(T, gold, 0.4);
    cap(T, gold, 0.7, 0.6);   // nemes top above the eye band
    for (let i = 0; i < 5; i++) T.add(at(rb(BW + 1.08, 0.18, D + 1.08, 0.06, blue), 0, EYE_Y1 + 0.35 + i * 0.4, 0));   // stripes
    for (const sx of [-1, 1]) { const lap = new THREE.Group(); lap.position.set(sx * (BW / 2 + 0.5), 0, -2.6); T.add(lap);   // lappets hang at the sides
      lap.add(at(rb(0.6, BH - 1.5, 2.2, 0.25, gold), 0, (BH - 1.5) / 2 + 1.5, 0));
      for (let i = 0; i < 6; i++) lap.add(at(rb(0.66, 0.2, 2.25, 0.06, blue), 0, 2.0 + i * 0.85, 0)); }
    T.add(at(rb(BW - 1, 2.5, 0.4, 0.3, gold), 0, EYE_Y0 - 0.2, -D / 2 - 0.4));   // nemes tail on the back
    const a = hand(c, 1), cr = new THREE.Group(); cr.position.set(2.9, 0.3, 0.8); a.add(cr);   // crook
    for (let i = 0; i < 6; i++) cr.add(at(cyl(0.3, 0.3, 1.0, i % 2 ? blue : gold, 12), 0, -1.5 + i * 1.0, 0));
    const hk = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.3, 10, 20, Math.PI), gold); cr.add(at(hk, -0.9, 4.0, 0));
  },
  viking(c) {
    const T = c.parts.torso, tun = mat('#5C6B4A'), fur = mat('#8A6A4A', 1), ir = mat('#8E949C', 0.4), horn = mat('#EDE3CC', 0.7);
    shell(T, tun); sleeves(c.parts.arms, tun, fur);
    T.add(at(rb(BW + 1.1, 2.6, D + 1.1, 0.6, fur), 0, 1.6, 0));   // fur vest band, top at y 2.9
    for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 8), fur); b.scale.y = 0.7; T.add(at(b, -5.4 + i * 1.35, 0.35, FZ + 0.35)); }   // shaggy hem
    belt(T, mat('#3A2A1C'), 0.9);
    const helm = new THREE.Mesh(new THREE.SphereGeometry(5.0, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), ir); helm.scale.set(1.25, 0.55, 1.0); T.add(at(helm, 0, BH - 0.1, 0));
    T.add(at(rb(BW + 0.9, 0.7, D + 0.9, 0.25, ir), 0, BH - 0.2, 0));   // rim sits on the head
    for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.75, 4.2, 16), horn); h.position.set(sx * 6.6, BH + 1.6, 0); h.rotation.z = -sx * 0.9; T.add(h); }
    const a = hand(c, 1), ax = new THREE.Group(); ax.position.set(2.9, 0.3, 0.8); a.add(ax);
    ax.add(at(rb(0.45, 8, 0.45, 0.18, mat('#8A5A34')), 0, 2.0, 0));
    const hd = new THREE.Mesh(new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(0, 0.6); s.quadraticCurveTo(1.6, 1.4, 2.4, 2.0); s.quadraticCurveTo(2.0, 0, 2.4, -2.0); s.quadraticCurveTo(1.6, -1.0, 0, -0.6); s.lineTo(0, 0.6); return s; })()), ir);
    hd.material.side = THREE.DoubleSide; ax.add(at(hd, 0.2, 5.0, 0));
  },
  king(c) {
    const T = c.parts.torso, robe = mat('#A3202A'), fur = mat('#F4F1EA', 0.95), spot = mat('#1A1A1A', 0.6), gold = mat('#E2B33C', 0.4);
    shell(T, robe); sleeves(c.parts.arms, robe, fur);
    T.add(at(rb(BW + 1.1, 1.0, D + 1.1, 0.4, fur), 0, 0.3, 0));   // ermine hem
    for (let i = 0; i < 5; i++) T.add(at(rb(0.25, 0.4, 0.1, 0.08, spot), -4 + i * 2, 0.3, D / 2 + 0.95));
    T.add(at(rb(BW + 1.2, 0.9, 1.5, 0.4, fur), 0, BH - 0.3, -D / 2 - 0.2));   // fur mantle on the back shoulders
    cape(T, robe);
    T.add(at(rb(1.3, 1.3, 0.3, 0.3, gold), 0, 1.8, FZ + 0.05));   // clasp
    const cr = new THREE.Group(); cr.position.set(0, BH, 0); T.add(cr);   // crown sits on top
    cr.add(at(cyl(4.4, 4.4, 1.3, gold, 32), 0, 0.65, 0));
    for (let i = 0; i < 8; i++) { const ang = i / 8 * Math.PI * 2, p = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.8, 4), gold);
      p.position.set(Math.sin(ang) * 4.0, 2.1, Math.cos(ang) * 4.0); cr.add(p); }
    for (let i = 0; i < 4; i++) { const ang = i / 4 * Math.PI * 2 + Math.PI / 8, g = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), mat(i % 2 ? '#2E4E9E' : '#C2382D', 0.3));
      g.position.set(Math.sin(ang) * 4.45, 0.65, Math.cos(ang) * 4.45); cr.add(g); }
    const a = hand(c, 1), sc = new THREE.Group(); sc.position.set(2.9, 0.3, 0.8); a.add(sc);
    sc.add(at(cyl(0.3, 0.3, 7, gold, 16), 0, 1.5, 0), at(new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 12), gold), 0, 5.3, 0), at(new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), mat('#C2382D', 0.3)), 0, 6.2, 0));
  },
};
