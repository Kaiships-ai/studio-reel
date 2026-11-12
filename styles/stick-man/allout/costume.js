// Role costumes (study gap 5): layers a cast entry wears on top of its approved base design, parented to the rig so they
// move with it: a belt round the waist, a holster with a six-shooter on the hip, a hat that sits on the head and can fly
// off (x_hatfly from the verb `lose_hat`: an arc up and back, a spin, it lands and lies). Inked like the cast (the same
// hull), so they read as part of the character, never as set props. Base designs stay as they are when no costume is given.
//   import '/styles/stick-man/allout/costume.js'
//   cast: { kip: { spec: 'KAI', costume: ['belt', 'holster', 'hat:flat'] } }   beats: { f, who: 'kip', do: 'lose_hat' }
// layers: belt[:rgb hex], holster (on the figure's right hip), holster:L, hat:cowboy | hat:flat | hat:bowler | hat:top (+ :rrggbb)
import * as THREE from 'three';
import { solid, lathe, W_M, HEAD_H, HAT_LIFT } from '../engine/cast.js';
import { toon } from '../engine/look.js';
import { HOOKS } from '../engine/play.js';
import { ACT } from '../engine/verbs_fx.js';
import { POSE_VERBS } from '../engine/poses.js';

const W = W_M, HB = 0.5 * HEAD_H * W, DEG = Math.PI / 180;
const hex = (h, d) => { if (!h) return d; const n = parseInt(h, 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const mat = rgb => toon(rgb, { sheen: 0, rough: 1, char: 1 });

function belt(rgb = [0.30, 0.17, 0.08]) {
  const g = new THREE.Group();
  const band = solid(new THREE.CylinderGeometry(0.172, 0.168, 0.055, 40, 1, true), mat(rgb)); band.material.side = THREE.DoubleSide; band.scale.z = 0.92; g.add(band);
  const buckle = solid(new THREE.BoxGeometry(0.075, 0.06, 0.02), mat([0.92, 0.74, 0.30])); buckle.position.set(0, 0, 0.162); g.add(buckle);
  g.position.y = 0.03; return g;
}
function holster(side = 1, rgb = [0.40, 0.22, 0.10]) {
  const g = new THREE.Group();
  const pouch = solid(new THREE.BoxGeometry(0.07, 0.19, 0.06), mat(rgb)); pouch.position.set(0, -0.07, 0); pouch.rotation.z = side * 0.12; g.add(pouch);
  const grip = solid(new THREE.BoxGeometry(0.04, 0.09, 0.05), mat([0.45, 0.26, 0.12])); grip.position.set(side * 0.01, 0.07, -0.01); grip.rotation.z = -side * 0.35; g.add(grip);
  const drum = solid(new THREE.CylinderGeometry(0.024, 0.024, 0.04, 14), mat([0.30, 0.31, 0.35])); drum.position.set(0, 0.03, 0.0); g.add(drum);
  g.position.set(side * 0.19, -0.02, 0.02); return g;
}
// hats sit high (never over the brows) and a little back; the brim is wide like a cartoon's
function hat(kind = 'cowboy', rgb) {
  const g = new THREE.Group(), y0 = HB * 0.62;
  if (kind === 'cowboy') {
    const c = rgb || [0.90, 0.80, 0.58], pr = [[0, y0], [0.20, y0], [0.205, y0 + 0.05], [0.19, y0 + 0.15], [0.12, y0 + 0.2], [0.05, y0 + 0.17], [0, y0 + 0.19]];
    g.add(solid(lathe(pr, 48), mat(c)));
    const band = solid(new THREE.CylinderGeometry(0.205, 0.205, 0.035, 40, 1, true), mat([0.30, 0.17, 0.08])); band.material.side = THREE.DoubleSide; band.position.y = y0 + 0.03; g.add(band);
    const bp = []; for (let i = 0; i <= 12; i++) { const r = 0.2 + 0.24 * i / 12; bp.push([r, y0 + 0.004 + 0.06 * Math.pow(i / 12, 3)]); }
    const brim = solid(lathe(bp.concat([[0.44, y0 + 0.08], [0.2, y0 + 0.02]]), 64), mat(c.map(x => x * 0.92))); brim.scale.z = 0.86; g.add(brim);
  } else if (kind === 'flat') {
    const c = rgb || [0.10, 0.10, 0.12], pr = [[0, y0], [0.19, y0], [0.19, y0 + 0.13], [0, y0 + 0.13]];
    g.add(solid(lathe(pr, 48), mat(c)));
    const band = solid(new THREE.CylinderGeometry(0.193, 0.193, 0.03, 40, 1, true), mat([0.55, 0.12, 0.10])); band.material.side = THREE.DoubleSide; band.position.y = y0 + 0.025; g.add(band);
    const brim = solid(new THREE.CylinderGeometry(0.42, 0.42, 0.018, 64), mat(c)); brim.position.y = y0 + 0.004; brim.scale.z = 0.86; g.add(brim);
  } else if (kind === 'top') {                                    // the magnate's top hat (allout/rail.js): tall silk crown, red band, curled brim
    const c = rgb || [0.03, 0.03, 0.04], Hh = 0.57;
    g.add(solid(lathe([[0, y0], [0.24, y0], [0.222, y0 + Hh * 0.55], [0.258, y0 + Hh], [0, y0 + Hh]], 48), mat(c)));
    const band = solid(new THREE.CylinderGeometry(0.237, 0.243, 0.09, 40, 1, true), mat([0.30, 0.04, 0.06])); band.material.side = THREE.DoubleSide; band.position.y = y0 + 0.055; g.add(band);
    const bp = []; for (let i = 0; i <= 10; i++) bp.push([0.24 + 0.16 * i / 10, y0 + 0.05 * Math.pow(i / 10, 2.5)]);
    const brim = solid(lathe(bp.concat([[0.40, y0 + 0.06], [0.24, y0 + 0.012]]), 56), mat(c)); brim.scale.z = 0.86; g.add(brim);
  } else {
    const c = rgb || [0.16, 0.14, 0.12], pr = []; for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI / 2; pr.push([0.2 * Math.cos(a), y0 + 0.16 * Math.sin(a)]); }
    g.add(solid(lathe(pr, 48), mat(c))); const brim = solid(new THREE.CylinderGeometry(0.29, 0.29, 0.015, 48), mat(c)); brim.position.y = y0; g.add(brim);
  }
  g.rotation.x = -8 * DEG; return g;
}

HOOKS.costume = (S, list, { group }) => {
  const body = S.parts.torso.parent, head = S.parts.head.parent;
  let worn = null, flying = null;
  for (const item of list) {
    const [k, a, b] = String(item).split(':');
    if (k === 'belt') body.add(belt(hex(a)));
    else if (k === 'holster') body.add(holster(a === 'L' ? -1 : 1, hex(a === 'L' ? b : a)));
    else if (k === 'hat') { worn = hat(a, hex(b)); worn.position.y += HAT_LIFT; head.add(worn); flying = hat(a, hex(b)); flying.visible = false; group.add(flying); }
  }
  if (!worn) return;
  // the hat flies off: x_hatfly = frames since lose_hat + 1. An arc from where the head stands (the body channel's position
  // and yaw, not the tumbling root: a pure function of the frame), up and back off the head, spinning, then it lies
  const pose = S.pose;
  S.pose = P => {
    const r = pose(P), t = P.x_hatfly ? (P.x_hatfly - 1) / 30 : -1;
    worn.visible = t < 0; flying.visible = t >= 0;
    if (t >= 0) {
      const yaw = S.yaw, fw = [Math.sin(yaw), Math.cos(yaw)], p0 = P.pos, h0 = 1.62 + HB, vu = 3.0, vb = -1.1, T = (vu + Math.sqrt(vu * vu + 2 * 9.8 * (h0 - 0.02))) / 9.8, u = Math.min(t, T);
      const y = Math.max(0.02, h0 + vu * u - 4.9 * u * u), back = vb * u;
      flying.position.set(p0[0] + fw[0] * back, (p0[2] || 0) + y - y0Of(), -p0[1] + fw[1] * back);
      flying.rotation.set(-0.4 - 5.0 * u, yaw + 2.2 * u, 0.6 * u, 'YXZ');
      if (t >= T) flying.rotation.set(0, yaw + 2.2 * T, 0, 'YXZ');
    }
    return r;
  };
};
const y0Of = () => HB * 0.62;

// lose_hat: from this frame the hat flies off the head (x_hatfly counts frames)
POSE_VERBS.lose_hat = ACT.lose_hat = p => ({ end: p.at + 2, owners: [{ chan: 'add', start: p.at, verb: 'lose_hat', fn: f => (f >= p.at ? { x_hatfly: f - p.at + 1 } : {}) }] });
