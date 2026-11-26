// Small props a figure carries in its hand for the prop-handling verbs (verbs_fx.js POSE: pour, hammer, write, eat,
// carry_heavy, lift_heavy, phone). They belong to the figure, not the set: cast.js parents one to the hand dot each
// frame, so the grip never leaves the hand (the hand-prop gap is 0 by construction). Toon solids with an ink hull.
//   mode 'up'    = stays upright in the figure's frame, tilts about its facing axis (cup, apple, phone)
//   mode 'along' = its +y follows the forearm out of the fist (hammer, pencil, drumstick, megaphone)
//   mode 'both'  = held between both hands, upright (box, crate)
import * as THREE from 'three';
import { toon, lin } from '#engine/look.js';
import { solid as inkSolid } from '#engine/cast.js';

const W = 0.60, INK_T = 0.032 * W;          // W = cast.js W_M, written out: cast.js imports this file, so W_M is not set yet here
// a toon solid with the engine's light-aware ink hull (cast.js imports this file: inkSolid is only called after both load)
function solid(geo, col, o = {}) {
  const m = inkSolid(geo, toon(col, { sheen: 0.25, rough: 0.5, ...o }), INK_T); m.layers.enable(1); return m;
}
const cyl = (r0, r1, h, n = 24) => new THREE.CylinderGeometry(r0, r1, h, n);

export const BUILD = {
  cup() {                                                       // a mug: the fist round its middle, handle out the side
    const g = new THREE.Group(), body = solid(cyl(0.055, 0.048, 0.12), [0.95, 0.35, 0.25]); g.add(body);
    const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.048, 20), toon([0.30, 0.16, 0.08])); coffee.rotation.x = -Math.PI / 2; coffee.position.y = 0.052; g.add(coffee);
    const handle = solid(new THREE.TorusGeometry(0.03, 0.009, 8, 16, Math.PI), [0.95, 0.35, 0.25]); handle.rotation.z = -Math.PI / 2; handle.position.x = 0.055; g.add(handle);
    g.userData = { mode: 'up', grip: [0, 0.0, 0.05] }; return g;
  },
  hammer() {
    const g = new THREE.Group(), stick = solid(cyl(0.013, 0.015, 0.30, 12), [0.70, 0.45, 0.20]); stick.position.y = 0.10; g.add(stick);
    const head = solid(new THREE.BoxGeometry(0.13, 0.05, 0.05), [0.55, 0.58, 0.64], { sheen: 0.6, rough: 0.3 }); head.position.y = 0.25; g.add(head);
    g.userData = { mode: 'along', grip: [0, -0.02, 0] }; return g;
  },
  pencil() {
    const g = new THREE.Group(), body = solid(cyl(0.010, 0.010, 0.16, 6), [1.0, 0.78, 0.12]); body.position.y = -0.03; g.add(body);
    const tip = solid(new THREE.ConeGeometry(0.010, 0.03, 6), [0.95, 0.82, 0.62]); tip.rotation.x = Math.PI; tip.position.y = -0.125; g.add(tip);
    const rub = solid(cyl(0.011, 0.011, 0.02, 8), [0.95, 0.55, 0.6]); rub.position.y = 0.06; g.add(rub);
    g.userData = { mode: 'along', grip: [0, 0, 0], flip: true }; return g;
  },
  pad() {                                                        // a notepad held flat-ish in the other hand
    const g = new THREE.Group(), p = solid(new THREE.BoxGeometry(0.16, 0.012, 0.21), [0.98, 0.96, 0.86]); g.add(p);
    const top = solid(new THREE.BoxGeometry(0.165, 0.02, 0.03), [0.20, 0.45, 0.85]); top.position.set(0, 0.006, -0.10); g.add(top);
    g.rotation.x = 0; g.userData = { mode: 'up', grip: [0, 0, -0.07], tilt0: [-50, 0] }; return g;
  },
  drumstick() {                                                  // food: a chicken leg
    const g = new THREE.Group(), bone = solid(cyl(0.010, 0.010, 0.10, 8), [0.98, 0.96, 0.9]); bone.position.y = -0.02; g.add(bone);
    const meat = new THREE.SphereGeometry(0.05, 18, 12); meat.scale(1, 1.4, 1); const m = solid(meat, [0.80, 0.45, 0.16]); m.position.y = 0.08; g.add(m);
    g.userData = { mode: 'along', grip: [0, -0.04, 0] }; return g;
  },
  apple() {
    const g = new THREE.Group(), a = solid(new THREE.SphereGeometry(0.055, 18, 14), [0.90, 0.12, 0.14]); g.add(a);
    const st = solid(cyl(0.005, 0.005, 0.03, 6), [0.35, 0.22, 0.1]); st.position.y = 0.06; g.add(st);
    g.userData = { mode: 'up', grip: [0, -0.03, 0.03] }; return g;
  },
  phone() {
    const g = new THREE.Group(), p = solid(new THREE.BoxGeometry(0.075, 0.15, 0.012), [0.10, 0.10, 0.12], { sheen: 0.6 }); g.add(p);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.064, 0.13), new THREE.MeshBasicMaterial({ color: lin(0.45, 0.75, 1.0) })); scr.position.z = 0.0065; g.add(scr);
    g.userData = { mode: 'up', grip: [0, -0.03, 0] }; return g;
  },
  megaphone() {
    const g = new THREE.Group(), c = solid(cyl(0.07, 0.025, 0.24, 20), [0.98, 0.85, 0.15]); c.position.y = 0.12; g.add(c);
    g.userData = { mode: 'along', grip: [0, -0.01, 0] }; return g;
  },
  beaker() {                                                     // a lab beaker of green broth with a printed label; level 0..1
    const g = new THREE.Group(), H = 0.21, R = 0.068;   // big enough to read in a medium shot
    const glass = solid(cyl(R, R * 0.96, H, 28), [0.82, 0.93, 0.96], { sheen: 0.7, rough: 0.2 });
    glass.material.transparent = true; glass.material.opacity = 0.45; glass.material.depthWrite = false; glass.position.y = H / 2; g.add(glass);
    const lip = solid(new THREE.TorusGeometry(R, 0.006, 8, 28), [0.82, 0.93, 0.96]); lip.rotation.x = Math.PI / 2; lip.position.y = H; g.add(lip);
    const liq = new THREE.Mesh(cyl(R * 0.9, R * 0.88, 1, 24), toon([0.42, 0.82, 0.18], { sheen: 0.4 }));
    liq.material.emissive = lin(0.05, 0.16, 0.02); g.add(liq);
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96; const c = cv.getContext('2d');
    c.fillStyle = '#f6f1e2'; c.fillRect(0, 0, 256, 96); c.fillStyle = '#16161c'; c.font = '900 34px InterReel, Arial Black, sans-serif'; c.textAlign = 'center';
    c.fillText('H. PYLORI', 128, 42); c.font = '700 22px InterReel, Arial, sans-serif'; c.fillText('LIVE CULTURE', 128, 76);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.01, R * 1.01, 0.055, 24, 1, true, -0.9, 1.8), toon([1, 1, 1], { map: tex, sheen: 0 }));
    label.position.y = H * 0.42; g.add(label);
    const level = v => { const h = Math.max(0.004, (H - 0.012) * Math.max(0, Math.min(1, v)) * 0.85); liq.scale.y = h; liq.position.y = 0.006 + h / 2; liq.visible = v > 0.02; };
    level(1);
    g.userData = { mode: 'up', grip: [0, 0.06, 0.055], level }; return g;
  },
  chilli() {                                                     // a red hot chilli, stalk in the fist
    const g = new THREE.Group(), pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector2(0.028 * Math.sin(Math.PI * Math.pow(1 - t, 0.7)) + 0.002, t * 0.16)); }
    const pod = solid(new THREE.LatheGeometry(pts, 16), [0.90, 0.10, 0.08], { sheen: 0.6, rough: 0.3 }); pod.rotation.z = 0.25; pod.position.y = 0.02; g.add(pod);
    const stalk = solid(cyl(0.008, 0.01, 0.04, 8), [0.20, 0.60, 0.15]); stalk.position.y = 0.0; g.add(stalk);
    g.userData = { mode: 'along', grip: [0, -0.01, 0] }; return g;
  },
  medal() {                                                      // a gold medal held up by its ribbon
    const g = new THREE.Group(), disc = solid(cyl(0.07, 0.07, 0.014, 32), [1.0, 0.76, 0.18], { sheen: 0.9, rough: 0.2 }); disc.rotation.x = Math.PI / 2; disc.position.y = -0.10; g.add(disc);
    const rib = solid(new THREE.BoxGeometry(0.035, 0.11, 0.006), [0.12, 0.30, 0.78]); rib.position.y = -0.03; g.add(rib);
    g.userData = { mode: 'up', grip: [0, 0.02, 0] }; return g;
  },
  box() {                                                        // a heavy crate between both hands
    const g = new THREE.Group(), b = solid(new THREE.BoxGeometry(0.42, 0.30, 0.30), [0.78, 0.55, 0.30]); g.add(b);
    for (const y of [-0.08, 0.08]) { const s = solid(new THREE.BoxGeometry(0.43, 0.035, 0.305), [0.62, 0.40, 0.20]); s.position.y = y; g.add(s); }
    g.userData = { mode: 'both', grip: [0, 0, 0] }; return g;
  },
  // whatif1 v5 (26/11): the five props its films faked with a 4 mm stand-in in the hand and a loose set prop beside it.
  // Code-built: the 3D library (assets/props) has no baby, tin, sky lantern or balloon, and its picture frames are .glb
  // files, which load async and so cannot be a hand prop here. A two-hand (both) prop names where each fist holds it,
  // userData.hands { L, R } (prop metres, the figure's left at -x), measured by engine/grip.js and tools/gates/handgrip.mjs;
  // the one-hand props' grip is the point the fist closes on.
  baby() {                                                       // a swaddled baby across both arms, its face out
    const g = new THREE.Group(), L = 0.50, R = 0.12;
    const wrap = solid(new THREE.CapsuleGeometry(R, L - 2 * R, 6, 18), [0.66, 0.82, 0.95]); wrap.rotation.z = Math.PI / 2; g.add(wrap);
    const fold = solid(new THREE.TorusGeometry(R * 0.86, 0.022, 8, 24), [0.86, 0.93, 0.99]); fold.rotation.y = Math.PI / 2; fold.position.x = L / 2 - R * 0.9; g.add(fold);
    const face = solid(new THREE.SphereGeometry(R * 0.66, 18, 12), [0.98, 0.84, 0.72]); face.scale.set(0.8, 1, 0.55); face.position.set(L / 2 - R * 0.95, 0.01, R * 0.55); g.add(face);
    for (const x of [-0.025, 0.025]) { const eye = new THREE.Mesh(new THREE.CircleGeometry(0.007, 10), toon([0.08, 0.06, 0.06])); eye.position.set(L / 2 - R * 0.95 + x * 0.8, 0.025, R * 0.55 + R * 0.66 * 0.55 + 0.002); g.add(eye); }
    g.userData = { mode: 'both', grip: [0, -0.07, 0], hands: { L: [-0.22, -0.07, 0], R: [0.22, -0.07, 0] }, mass: 4 }; return g;
  },
  tin() {                                                        // a formula tin, 18 cm tall: the fist round its back
    const g = new THREE.Group(), H = 0.18, R = 0.055;
    const can = solid(cyl(R, R, H, 28), [0.94, 0.94, 0.90], { sheen: 0.6, rough: 0.3 }); can.position.y = H / 2; g.add(can);
    const label = solid(cyl(R * 1.01, R * 1.01, H * 0.5, 28), [0.30, 0.62, 0.92]); label.position.y = H * 0.48; g.add(label);
    const lid = solid(cyl(R * 1.04, R * 1.04, 0.016, 28), [0.98, 0.86, 0.30]); lid.position.y = H; g.add(lid);
    g.userData = { mode: 'up', grip: [0, 0.08, -(R + 0.016)], mass: 0.9 }; return g;
  },
  lantern() {                                                    // a paper sky lantern 45 cm tall, a warm flame inside, held at its sides
    const g = new THREE.Group(), H = 0.45, pts = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.13 + 0.07 * Math.sin(Math.PI * 0.5 * t) + 0.02 * Math.sin(Math.PI * t), t * H)); }
    const paper = solid(new THREE.LatheGeometry(pts, 24), [1.0, 0.72, 0.34], { sheen: 0.2 }); paper.material.emissive = lin(0.55, 0.28, 0.06); paper.position.y = -H / 2; g.add(paper);
    const top = solid(new THREE.CircleGeometry(0.2, 24), [1.0, 0.72, 0.34]); top.rotation.x = -Math.PI / 2; top.position.y = H / 2; top.material.emissive = lin(0.5, 0.25, 0.05); g.add(top);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.4, 0.5), blending: THREE.AdditiveBlending, depthWrite: false })); flame.position.y = -H / 2 + 0.06; g.add(flame);
    const lamp = new THREE.PointLight(new THREE.Color(1, 0.62, 0.28), 1.6, 2.2, 2); lamp.position.y = -H / 2 + 0.08; g.add(lamp);
    g.userData = { mode: 'both', grip: [0, -0.02, 0], hands: { L: [-0.21, -0.02, 0], R: [0.21, -0.02, 0] }, mass: 0.2 }; return g;
  },
  photo() {                                                      // a framed photo 25 x 30 cm, held up by its sides, the picture out
    const g = new THREE.Group(), Wf = 0.25, Hf = 0.30, D = 0.022;
    const frame = solid(new THREE.BoxGeometry(Wf, Hf, D), [0.55, 0.36, 0.20]); g.add(frame);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(Wf - 0.05, Hf - 0.05), toon([0.62, 0.78, 0.90])); pic.position.z = D / 2 + 0.001; g.add(pic);
    const sun = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), toon([1.0, 0.85, 0.35])); sun.position.set(0.04, 0.06, D / 2 + 0.002); g.add(sun);
    g.userData = { mode: 'both', grip: [0, 0, 0], hands: { L: [-Wf / 2 - 0.01, 0, 0], R: [Wf / 2 + 0.01, 0, 0] }, mass: 0.6 }; return g;
  },
  balloon() {                                                    // a balloon on a string, held at the string's end, the balloon above
    const g = new THREE.Group(), S = 0.80, R = 0.15;
    const str = new THREE.Mesh(cyl(0.0025, 0.0025, S, 5), toon([0.92, 0.92, 0.92])); str.position.y = S / 2; g.add(str);
    const ball = new THREE.SphereGeometry(R, 22, 16); ball.scale(1, 1.18, 1); const b = solid(ball, [0.95, 0.20, 0.25], { sheen: 0.7, rough: 0.25 }); b.position.y = S + R * 1.1; g.add(b);
    const knot = solid(new THREE.ConeGeometry(0.018, 0.03, 8), [0.95, 0.20, 0.25]); knot.position.y = S + 0.01; g.add(knot);
    g.userData = { mode: 'up', grip: [0, 0, 0], mass: 0.01 }; return g;
  },
};
export const HAND_PROPS = Object.keys(BUILD);
export function makeHandProp(kind) {
  if (!BUILD[kind]) throw new Error(`hand prop: unknown kind ${kind} (${HAND_PROPS.join(', ')})`);
  const g = BUILD[kind](); g.name = 'hp_' + kind; return g;
}
