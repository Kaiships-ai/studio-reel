import { THREE, BW, BH, D, EYE_Y0, EYE_Y1, mat, rb, at, shell, sleeves, flameShape } from './kit.js';

// pilot roles approved by Kai 2026-10-17 (the quality bar)
export const BUILD = {
  developer(c) {
    const T = c.parts.torso, hood = mat('#3B4252'), dk = mat('#2C323F');
    shell(T, hood); sleeves(c.parts.arms, hood, dk);
    T.add(at(rb(6.2, 1.3, 0.2, 0.4, mat('#454D5E')), 0, 0.75, D / 2 + 0.5));                    // kangaroo pocket, low and soft (a dark box under the eyes reads as a mouth)
    T.add(at(rb(7.5, 2.4, 1.8, 0.8, hood), 0, EYE_Y0 - 0.1, -D / 2 - 1.1));                 // the hood, down on the back
    const hp = mat('#1C1F26', 0.5), band = new THREE.Mesh(new THREE.TorusGeometry(BW / 2 + 0.55, 0.32, 10, 40, Math.PI), hp);   // headphones over the head
    band.position.set(0, BH - 2.2, 0); T.add(band);
    for (const sx of [-1, 1]) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.8, 24), hp); cup.rotation.z = Math.PI / 2; T.add(at(cup, sx * (BW / 2 + 0.45), BH - 2.2, 0));
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.2, 20), mat('#C2382D')); pad.rotation.z = Math.PI / 2; T.add(at(pad, sx * (BW / 2 + 0.9), BH - 2.2, 0)); }
  },
  'this-is-fine'(c) {
    const T = c.parts.torso, hat = mat('#3A2B22', 0.6);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 0.25, 32), hat); T.add(at(brim, -1.5, BH + 0.15, 0));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2.2, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), hat); dome.scale.y = 0.95; T.add(at(dome, -1.5, BH + 0.25, 0));
    T.add(at(rb(4.5, 0.4, 4.5, 0.15, mat('#1E1612')), -1.5, BH + 0.45, 0));                    // hat band
    const a = c.parts.arms.find(x => x.userData.sx === 1), mug = new THREE.Group(), w = mat('#F1ECE2', 0.5);
    mug.add(new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.7, 1.6, 24), w)); const hd = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.13, 8, 16), w); hd.position.x = 0.85; mug.add(hd);
    mug.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.05, 20), mat('#4A2C1A')), 0, 0.78, 0)); a.add(at(mug, 2.9, 1.0, 0.6));
    const fire = new THREE.Group(); fire.name = 'set-fire';                                   // set prop: the room on fire (reels can place it themselves)
    for (let i = 0; i < 9; i++) { const ang = Math.PI * (0.15 + 0.7 * i / 8) + Math.PI, r = 15 + (i % 3) * 1.5, h = 5 + (i * 37 % 5);
      for (const [col, k] of [['#E8522A', 1], ['#F7B23F', 0.6]]) { const f = new THREE.Mesh(new THREE.ShapeGeometry(flameShape(h * 0.5 * k)), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
        f.position.set(Math.cos(ang) * r, h * 0.5 * k, Math.sin(ang) * r + (k < 1 ? 0.2 : 0)); f.lookAt(0, h * 0.5 * k, 60); fire.add(f); } }
    if (c.opts?.noSet !== true) c.group.add(fire);
  },
  'nj-kai'(c) {
    const T = c.parts.torso, red = mat('#C2382D'), dk = mat('#7E1F1A'), gold = mat('#E2B33C', 0.5);
    shell(T, red); sleeves(c.parts.arms, red, dk);
    T.add(at(rb(BW + 0.9, BH - EYE_Y1 + 0.45, D + 0.9, 0.5, red), 0, (EYE_Y1 + BH + 0.45) / 2, 0));   // the hood above the eye slit
    T.add(at(rb(BW + 0.85, 0.7, D + 0.85, 0.2, dk), 0, 0.9, 0));                                     // belt
    const em = new THREE.Mesh(new THREE.ShapeGeometry(flameShape(1.15)), gold); T.add(at(em, -3.4, 2.15, D / 2 + 0.4));   // flame emblem (own design)
    for (const sx of [-1, 1]) T.add(at(rb(0.25, EYE_Y0 + 0.3, 0.12, 0.05, gold), sx * 1.6, EYE_Y0 / 2 - 0.1, D / 2 + 0.42));   // gold trim of the wrap
    const knot = rb(1.2, 1.2, 0.9, 0.3, red); T.add(at(knot, -BW / 2 - 0.5, (EYE_Y1 + BH) / 2, -D / 2 + 1.2));
    for (const [k, a] of [[0, -0.5], [1, -0.95]]) { const g = new THREE.Group(); g.position.set(-BW / 2 - 0.6, (EYE_Y1 + BH) / 2, -D / 2 + 1.2 + k * 0.5); g.rotation.set(0, Math.PI * 0.75, a);
      g.add(at(rb(3.2, 1.0, 0.34, 0.15, red), 1.6, 0, 0)); T.add(g); }
    const sw = new THREE.Group(); sw.position.set(1.5, BH * 0.55, -D / 2 - 0.75); sw.rotation.z = 0.85; T.add(sw);       // katana on the back
    sw.add(at(rb(0.55, 9.5, 0.16, 0.05, mat('#D9DDE2', 0.25)), 0, 2.4, 0), at(rb(0.6, 3.0, 0.5, 0.2, mat('#1F1A1A')), 0, -3.6, 0), at(rb(1.8, 0.3, 0.6, 0.1, gold), 0, -2.0, 0));
  },
};
