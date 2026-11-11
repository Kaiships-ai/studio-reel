// Rail cast (built for the railroad short, rail-gaps): three hats that read at thumbnail size (the engineer's striped
// railroad cap, the boss's bowler, the magnate's top hat), the cast specs that wear them, five hand props (saw, cane,
// teacup, coin, sheet of paper, newspaper), the fx ao_drop / ao_caliper / ao_lower, and the whole-body poses their story needs (saw, sip, rage, gloat, lounge, jolt, perch,
// drop_coin, slide_sheet, wince), plus the rage fill (the head fills purple from the chin up, cast.js uFill).
//   import '/styles/stick-man/allout/rail.js'   then cast: { eng: { spec: 'ENGINEER' }, boss: { spec: 'BOSS' }, mag: { spec: 'MAGNATE' } }
//   beats: { who: 'boss', do: 'face_fill', dur: 14, hold: 60 }  (pair with expr 'angry', then 'furious' for the steam)
// Colours are linear (like cast.js). Units in poses: head widths (W = 0.6 m), figure-local (x right, y up, z forward).
import * as THREE from 'three';
import { solid, lathe, W_M, HEAD_H, hairCap } from '../engine/cast.js';
import { toon } from '../engine/look.js';
import { POSES, POSE_VERBS, compilePose } from '../engine/poses.js';
import { STAND, smooth, lerp } from '../engine/verbs.js';
import { ACT, MAKE } from '../engine/verbs_fx.js';
import { SPECS } from '../engine/play.js';
import { BUILD } from '../lib/cast/handprops.js';

const W = W_M, HA = 0.5 * W, HB = 0.5 * HEAD_H * W, DEG = Math.PI / 180;
const L = c => c.map(x => (x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));   // sRGB -> linear
const mat = (rgb, o = {}) => toon(rgb, { sheen: 0, rough: 1, char: 1, ...o });
const stripes = (a, b, n = 18) => { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 64; const g = cv.getContext('2d');
  for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * 512 / n, 0, 512 / n + 1, 64); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

// ---------------------------------------------------------------- hats (spec `hair` builders: () => Group on the head)
// railroad cap: a puffy round crown of blue-and-white pinstripe, wider than the head, a short stiff bill (rail f0-f120)
export function railCap(a = '#e9eef6', b = '#3b5f9e', tilt = 10) {
  return () => {
    const g = new THREE.Group(); g.rotation.x = -tilt * DEG;
    const y0 = 0.30 * W, R = 0.55 * W, Hc = 0.30 * W, pr = [[0, y0], [R * 0.88, y0]];
    for (let i = 0; i <= 16; i++) { const t = i / 16, ang = t * Math.PI / 2; pr.push([R * (1 + 0.10 * Math.sin(ang * 2)) * Math.pow(Math.cos(ang), 0.55), y0 + Hc * Math.sin(ang)]); }
    const crown = solid(lathe(pr, 64), mat([1, 1, 1], { map: stripes(a, b, 26) })); crown.position.z = -0.02 * W; g.add(crown);
    const band = solid(new THREE.CylinderGeometry(0.47 * W, 0.47 * W, 0.07 * W, 48, 1, true), mat(L([0.20, 0.30, 0.52]))); band.material.side = THREE.DoubleSide; band.position.y = y0 + 0.03 * W; g.add(band);
    const bill = new THREE.CylinderGeometry(0.40 * W, 0.40 * W, 0.03 * W, 40, 1, false, -0.95, 1.9); const bm = solid(bill, mat(L([0.16, 0.22, 0.38])));
    bm.scale.set(1.05, 1, 1.25); bm.position.set(0, y0 - 0.01 * W, 0.06 * W); bm.rotation.x = 0.18; g.add(bm);
    return g;
  };
}
// bowler: a round dome, a narrow brim curled up at the sides
export function bowler(c = [0.03, 0.03, 0.035], band = [0.012, 0.012, 0.014], tilt = 6) {
  return () => {
    const g = new THREE.Group(); g.rotation.x = -tilt * DEG; const y0 = 0.36 * W, pr = [[0, y0]];
    for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI / 2; pr.push([0.42 * W * Math.pow(Math.cos(a), 0.65), y0 + 0.50 * W * Math.sin(a)]); }
    g.add(solid(lathe(pr, 56), mat(c, { shade: [0.75, 0.75, 0.9] })));
    const bd = solid(new THREE.CylinderGeometry(0.425 * W, 0.42 * W, 0.09 * W, 48, 1, true), mat(band)); bd.material.side = THREE.DoubleSide; bd.position.y = y0 + 0.055 * W; g.add(bd);
    const bp = []; for (let i = 0; i <= 10; i++) { const r = 0.41 * W + 0.16 * W * i / 10; bp.push([r, y0 + 0.10 * W * Math.pow(i / 10, 2.2)]); }   // the brim curls up at the edge
    const brim = solid(lathe(bp.concat([[0.575 * W, y0 + 0.13 * W], [0.41 * W, y0 + 0.03 * W]]), 56), mat(c.map(x => x * 1.6 + 0.02))); brim.scale.z = 0.86; g.add(brim);
    return g;
  };
}
// top hat: a tall slightly flared silk crown, a ribbon band, a curled brim (the magnate)
export function topHat(c = [0.03, 0.03, 0.04], band = [0.30, 0.04, 0.06], tilt = 4) {
  return () => {
    const g = new THREE.Group(); g.rotation.x = -tilt * DEG; const y0 = 0.36 * W, Hh = 0.95 * W;
    const crown = solid(lathe([[0, y0], [0.40 * W, y0], [0.37 * W, y0 + Hh * 0.55], [0.43 * W, y0 + Hh], [0, y0 + Hh]], 48), mat(c, { shade: [0.7, 0.7, 0.9] })); g.add(crown);
    const bd = solid(new THREE.CylinderGeometry(0.395 * W, 0.405 * W, 0.15 * W, 48, 1, true), mat(band)); bd.material.side = THREE.DoubleSide; bd.position.y = y0 + 0.09 * W; g.add(bd);
    const bp = []; for (let i = 0; i <= 10; i++) { const r = 0.40 * W + 0.26 * W * i / 10; bp.push([r, y0 + 0.08 * W * Math.pow(i / 10, 2.5)]); }
    const brim = solid(lathe(bp.concat([[0.66 * W, y0 + 0.10 * W], [0.40 * W, y0 + 0.02 * W]]), 56), mat(c)); brim.scale.z = 0.86; g.add(brim);
    return g;
  };
}
// a monocle on its chain: a gold ring over the face's right eye (rides the head, not the face card)
export function monocle(c = L([0.95, 0.74, 0.25])) {
  return () => { const g = new THREE.Group(), r = solid(new THREE.TorusGeometry(0.075 * W, 0.010 * W, 8, 28), mat(c, { sheen: 0.6 }), 0.004);
    r.position.set(0.16 * W, 0.04 * W, HA * 0.98); g.add(r); return g; };
}

// ---------------------------------------------------------------- cast specs (registered into engine/play.js SPECS)
Object.assign(SPECS, {
  // the young engineer: striped railroad cap over brown hair, teal waistcoat on a cream shirt, a red neckerchief
  ENGINEER: { name: 'Engineer', shirt: [1, 1, 1], hair: [hairCap(L([0.40, 0.24, 0.12])), railCap()],
    clothes: [{ vest: L([0.12, 0.58, 0.52]) }, { kerchief: L([0.80, 0.12, 0.12]) }] },
  // the boss: bowler, mustard window-pane check waistcoat, brass buttons, grey hair; stocky
  BOSS: { name: 'Boss', shirt: [1, 1, 1], hair: [bowler()], girth: 1.18,
    clothes: [{ vest: L([0.86, 0.66, 0.14]), check: L([0.40, 0.26, 0.06]) }] },
  // the rival magnate: top hat, black suit with gold pinstripes, a monocle; slim
  MAGNATE: { name: 'Magnate', shirt: L([0.16, 0.12, 0.20]), hair: [monocle()], girth: 0.92,   // wears costume ['hat:top'] so lose_hat can fly it
    clothes: [{ vest: L([0.10, 0.08, 0.12]), pin: L([0.86, 0.66, 0.20]) }, { bowtie: L([0.70, 0.08, 0.10]) }] },
  // the rival's conductor: navy uniform and peaked cap (the guard cap in navy, brass badge)
  CONDUCTOR: { ...SPECS.GUARD, name: 'Conductor', shirt: L([0.16, 0.24, 0.50]) },
  // crew: flat caps and work shirts
  CREW1: { name: 'Crew 1', shirt: L([0.62, 0.46, 0.30]), hair: [hairCap(L([0.20, 0.14, 0.10])), bowler(L([0.42, 0.30, 0.18]), L([0.25, 0.16, 0.08]))], clothes: [{ vest: L([0.36, 0.42, 0.30]) }] },
  CREW2: { name: 'Crew 2', shirt: L([0.70, 0.70, 0.66]), hair: [hairCap(L([0.08, 0.06, 0.05])), railCap('#d9d1c3', '#7a5a3a')], clothes: [{ vest: L([0.55, 0.30, 0.18]) }] },
  CREW3: { name: 'Crew 3', shirt: L([0.60, 0.68, 0.80]), hair: [hairCap(L([0.62, 0.36, 0.16])), bowler(L([0.30, 0.26, 0.22]))], clothes: [{ vest: L([0.24, 0.30, 0.46]) }] },
});

// ---------------------------------------------------------------- hand props (origin = the grip; allout look: no ink)
const std = (c, rough, o = {}) => { const m = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(...c, THREE.SRGBColorSpace), roughness: rough, metalness: o.metal ?? 0, side: o.side ?? THREE.FrontSide }); m.userData.noToon = true; return m; };
const mesh = (g, m) => { const x = new THREE.Mesh(g, m); x.castShadow = true; x.receiveShadow = true; x.userData.noInk = true; return x; };
BUILD.saw = () => {                                   // a carpenter's rip saw, cartoon-chunky so it reads from any side: wooden grip in
  const g = new THREE.Group();                         // the fist, a wide steel blade out along the forearm, dark teeth on its lower edge
  const wood = std([0.70, 0.40, 0.16], 0.55), steel = std([0.86, 0.88, 0.92], 0.22, { metal: 0.75 }), dark = std([0.25, 0.25, 0.28], 0.5, { metal: 0.6 });
  const h = mesh(new THREE.BoxGeometry(0.05, 0.15, 0.11), wood); g.add(h);
  const sh = new THREE.Shape(); sh.moveTo(-0.07, 0.06); sh.lineTo(0.06, 0.06); sh.lineTo(0.035, 0.70); sh.lineTo(-0.07, 0.70); sh.closePath();
  const blade = mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.018, bevelEnabled: false }), steel); blade.position.z = -0.009; g.add(blade);
  const teeth = mesh(new THREE.BoxGeometry(0.02, 0.64, 0.022), dark); teeth.position.set(-0.075, 0.38, 0); g.add(teeth);
  g.userData = { mode: 'along', grip: [0, 0, 0], noInk: true }; return g;
};
BUILD.cane = () => {                                  // a dark walking cane with a gold knob, hanging from the fist to the ground
  const g = new THREE.Group(); g.userData.noInk = true;
  const s = mesh(new THREE.CylinderGeometry(0.013, 0.011, 0.86, 12), std([0.18, 0.10, 0.06], 0.4)); s.position.y = -0.43; g.add(s);
  const k = mesh(new THREE.SphereGeometry(0.03, 16, 12), std([0.95, 0.72, 0.25], 0.25, { metal: 0.8 })); k.position.y = 0.02; g.add(k);
  g.userData = { mode: 'up', grip: [0, 0, 0], noInk: true }; return g;
};
BUILD.teacup = () => {                                // a china teacup on its saucer, steam-free (the calm of the glide)
  const g = new THREE.Group(); g.userData.noInk = true; const china = std([0.97, 0.95, 0.92], 0.3);
  const cup = mesh(new THREE.LatheGeometry([[0, 0], [0.03, 0], [0.045, 0.02], [0.05, 0.055], [0.047, 0.055], [0.04, 0.02], [0, 0.008]].map(([a, b]) => new THREE.Vector2(a, b)), 28), china); g.add(cup);
  const tea = mesh(new THREE.CircleGeometry(0.045, 20), std([0.55, 0.30, 0.10], 0.2)); tea.rotation.x = -Math.PI / 2; tea.position.y = 0.045; g.add(tea);
  const band = mesh(new THREE.CylinderGeometry(0.051, 0.049, 0.008, 28, 1, true), std([0.85, 0.65, 0.20], 0.3, { metal: 0.6 })); band.position.y = 0.05; g.add(band);
  const hd = mesh(new THREE.TorusGeometry(0.018, 0.005, 8, 16, Math.PI * 1.4), china); hd.position.set(0.05, 0.03, 0); hd.rotation.z = -1.2; g.add(hd);
  g.userData = { mode: 'up', grip: [0.06, 0.03, 0], noInk: true }; return g;
};
BUILD.coin = () => {                                  // a big silver dollar held up between finger and thumb
  const g = new THREE.Group(); g.userData.noInk = true;
  const c = mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.006, 32), std([0.86, 0.86, 0.88], 0.2, { metal: 0.9 })); c.rotation.x = Math.PI / 2; c.position.y = 0.035; g.add(c);
  g.userData = { mode: 'up', grip: [0, 0, 0], noInk: true }; return g;
};
BUILD.sheet = () => {                                 // a sheet of paper pinched at its top edge
  const g = new THREE.Group(); g.userData.noInk = true;
  const p = mesh(new THREE.PlaneGeometry(0.21, 0.28), std([0.98, 0.97, 0.93], 0.8, { side: THREE.DoubleSide })); p.position.y = -0.13; g.add(p);
  g.userData = { mode: 'up', grip: [0, 0, 0], noInk: true }; return g;
};

BUILD.newspaper = () => {                             // a broadsheet held open in both hands, the headline facing out (text: our own)
  const g = new THREE.Group(); g.userData.noInk = true;
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 680; const c = cv.getContext('2d');
  c.fillStyle = '#efe8d6'; c.fillRect(0, 0, 512, 680); c.fillStyle = '#1d1a18'; c.textAlign = 'center';
  c.font = '700 40px Georgia, serif'; c.fillText('The Mesa Gazette', 256, 58); c.fillRect(24, 74, 464, 4); c.fillRect(24, 82, 464, 1.5);
  c.font = '900 64px Georgia, serif'; c.fillText('THE CLICKETY-', 256, 168); c.fillText('CLACK LINE!', 256, 236);
  c.font = 'italic 26px Georgia, serif'; c.fillText('Riders flee the noisy railroad', 256, 286);
  c.strokeStyle = '#1d1a18'; c.lineWidth = 3; c.strokeRect(150, 312, 212, 130);                                  // a little engraving of a loco
  c.beginPath(); c.moveTo(175, 410); c.lineTo(330, 410); c.moveTo(190, 410); c.lineTo(190, 360); c.lineTo(290, 360); c.lineTo(290, 410); c.moveTo(300, 410); c.lineTo(300, 340); c.lineTo(340, 340); c.lineTo(340, 410); c.stroke();
  for (const x of [205, 245, 285, 320]) { c.beginPath(); c.arc(x, 418, 12, 0, 7); c.stroke(); }
  c.fillStyle = '#3a3532'; for (let y = 470; y < 660; y += 16) { c.fillRect(30, y, 210, 5); c.fillRect(272, y, 210, 5); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const sheet = mesh(new THREE.PlaneGeometry(0.56, 0.74), new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, side: THREE.DoubleSide })); sheet.material.userData.noToon = true;
  sheet.position.set(0, -0.22, 0.05); g.add(sheet);
  g.userData = { mode: 'both', grip: [0, 0, 0], noInk: true }; return g;
};

// ---------------------------------------------------------------- poses
const sn = (t, w, a = 0) => Math.sin(t * w + a);
const HIP = s => ({ t: [s * 0.37, 1.44, 0.04], elbow: [s * 1, 0.15, -0.35], bend: -0.2 * s });
const RP = {
  // saw: crouched at the rail, the saw in the right fist driven back and forth along the rail, the left hand on the knee
  saw: { A: 3, T: 10, hold: 90, props: { R: 'saw' }, body: { bob: -0.52, pitch: 34, head_pitch: -26, lean: 4 },
    feet: { L: [-0.36, 0.022, 0.22], R: [0.30, 0.022, -0.20] }, tilt: { R: 40 },
    hands: { R: { l: [0.14, 0.62, 0.86], elbow: [0.9, 0.2, -0.6] }, L: { l: [-0.30, 0.98, 0.52], elbow: [-0.9, -0.2, -0.3] } },
    cycle: t => ({ hands: { R: [0, 0.03 * sn(t, 0.62), 0.22 * sn(t, 0.62)] }, pitch: 4 * sn(t, 0.62), shTwist: 6 * sn(t, 0.62), head_pitch: -1.5 * sn(t, 0.62), bob: 0.012 * sn(t, 1.24) }) },
  // sip: seated, saucer in the left hand, the cup up to the lips with the right, chin up, eyes closed in bliss
  sip: { A: 3, T: 10, hold: 60, props: { R: 'teacup' }, body: { pitch: -6, head_pitch: -8, head_tilt: 6 },
    hands: { R: { h: [0.10, -0.24, 0.42], elbow: [0.9, -0.5, 0.1] }, L: { t: [0.02, 1.82, 0.48], elbow: [-0.9, -0.5, 0.2] } },
    cycle: t => ({ hands: { R: [0, 0.03 * Math.max(0, sn(t, 0.18)), 0] }, head_pitch: -3 * Math.max(0, sn(t, 0.18)) }) },
  // rage: the shout from the boots up: lunging forward, fists clenched down and back, head thrust out, shaking
  rage: { A: 4, T: 8, hold: 40, body: { pitch: 18, bob: -0.08, head_pitch: -18, head_dv: 0.02, shrug: 0.12, dx: 0.04 },
    feet: { L: [-0.36, 0.022, -0.18], R: [0.30, 0.022, 0.26] },
    hands: { L: { t: [-0.60, 1.38, -0.30], elbow: [-1, 0.2, -0.3] }, R: { t: [0.60, 1.38, -0.30], elbow: [1, 0.2, -0.3] } },
    cycle: t => ({ bob: 0.012 * sn(t, 2.6), head_tilt: 2.5 * sn(t, 3.1), pitch: 1.5 * sn(t, 2.2), shrug: 0.02 * sn(t, 2.6) }) },
  // gloat: chest out, thumbs hooked in the waistcoat, rocking on the heels, chin up
  gloat: { A: 3, T: 9, hold: 50, body: { pitch: -11, head_pitch: -12, lean: 3, shrug: 0.05 },
    hands: { L: { t: [-0.20, 2.04, 0.34], elbow: [-1, -0.2, -0.1] }, R: { t: [0.20, 2.04, 0.34], elbow: [1, -0.2, -0.1] } },
    cycle: t => ({ pitch: -3 * sn(t, 0.26), bob: 0.012 * sn(t, 0.52), head_pitch: -2 * sn(t, 0.26) }) },
  // lounge: sunk back in a deck chair, hands laced behind the head, one knee up
  lounge: { A: 3, T: 12, hold: 1e6, keep: true, body: { bob: -0.78, pitch: -12, head_pitch: 2 },
    feet: { L: [-0.24, 0.022, 0.82], R: [0.24, 0.30, 0.56] },
    hands: { L: { h: [-0.34, 0.04, -0.14], elbow: [-1, 0.5, -0.2] }, R: { h: [0.34, 0.04, -0.14], elbow: [1, 0.5, -0.2] } },
    cycle: t => ({ head_tilt: 3 * sn(t, 0.09) }) },
  // jolt: a seated rider (cast posture 'sit') on a rough ride, bounced up and down, hat and cheeks wobbling (clickety-clack)
  jolt: { A: 2, T: 6, hold: 60, body: { pitch: -3 },
    hands: { L: { l: [-0.34, 1.02, 0.46], elbow: [-0.9, -0.3, -0.2] }, R: { l: [0.36, 1.04, 0.47], elbow: [0.9, -0.3, -0.2] } },
    cycle: t => { const k = Math.abs(sn(t, 0.85)); return { bob: -0.06 * k, head_dv: 0.02 * k, head_tilt: 6 * sn(t, 0.43), pitch: 3 * sn(t, 0.85) }; } },
  // perch: from a standing mark on a beam top, sit on the edge (hips just above the mark), legs dangling over the drop, a lunch in the lap (the crew on the beam)
  perch: { A: 3, T: 12, hold: 1e6, keep: true, body: { bob: -1.18, pitch: -4 }, feet: { L: [-0.24, -0.78, 0.42], R: [0.26, -0.70, 0.34] },
    hands: { L: { l: [-0.26, 0.96, 0.40], elbow: [-0.9, -0.3, -0.2] }, R: { l: [0.28, 0.98, 0.42], elbow: [0.9, -0.3, -0.2] } },
    cycle: t => ({ feet: { L: [0, 0.06 * sn(t, 0.2), 0.06 * sn(t, 0.2)], R: [0, 0.06 * sn(t, 0.2, 2), 0.06 * sn(t, 0.2, 2)] }, head_tilt: 3 * sn(t, 0.11) }) },
  // drop_coin: leaning over the gap, a coin held out at arm's length between finger and thumb (the set drops it)
  drop_coin: { A: 3, T: 9, hold: 34, props: { R: 'coin' }, body: { pitch: 30, bob: -0.10, head_pitch: 10 },
    feet: { L: [-0.30, 0.022, -0.10], R: [0.28, 0.022, 0.10] },
    hands: { R: { l: [0.16, 1.30, 0.80], elbow: [0.9, -0.3, -0.2] }, L: { t: [-0.36, 1.46, 0.10], elbow: [-1, 0.1, -0.3] } } },
  // slide_sheet: crouched, a sheet of paper fed down into the gap with both fingertips
  slide_sheet: { A: 3, T: 10, hold: 40, props: { R: 'sheet' }, body: { bob: -0.30, pitch: 30, head_pitch: -6 },
    feet: { L: [-0.32, 0.022, 0.06], R: [0.30, 0.022, -0.04] },
    hands: { R: { l: [0.12, 0.96, 0.78], elbow: [0.9, -0.2, -0.3] }, L: { l: [-0.10, 0.98, 0.74], elbow: [-0.9, -0.2, -0.3] } },
    cycle: t => ({ hands: { R: [0, -0.10 * Math.min(1, t / 30), 0], L: [0, -0.10 * Math.min(1, t / 30), 0] } }) },
  // read_news: the broadsheet held up open to the camera, the head peeking over it, chin up and smug
  read_news: { A: 3, T: 9, hold: 40, props: { B: 'newspaper' }, body: { pitch: -3, head_pitch: -4 },
    hands: { L: { t: [-0.40, 2.12, 0.56], elbow: [-0.9, -0.5, 0] }, R: { t: [0.40, 2.12, 0.56], elbow: [0.9, -0.5, 0] } },
    cycle: t => ({ head_dx: 0.02 * sn(t, 0.3), head_pitch: 2 * sn(t, 0.6), hands: { L: [0, 0.01 * sn(t, 0.6), 0], R: [0, 0.01 * sn(t, 0.6), 0] } }) },
  // kneel: down on one knee at a rail joint, leaning in to look at it close (his face near the rail)
  kneel: { A: 3, T: 10, hold: 60, body: { bob: -0.66, pitch: 30, head_pitch: -24, lean: 2 },
    feet: { L: [-0.30, 0.022, 0.34], R: [0.26, 0.022, -0.46] },
    hands: { L: { l: [-0.30, 0.90, 0.62], elbow: [-0.9, -0.2, -0.3] }, R: { l: [0.30, 0.86, 0.58], elbow: [0.9, -0.2, -0.3] } },
    cycle: t => ({ head_tilt: 4 * sn(t, 0.13), pitch: 2 * sn(t, 0.2) }) },
  // wince: a train roars past: the whole body cringes away, shoulders up, an arm over the face (rail f90)
  wince: { A: 2, T: 6, hold: 24, body: { lean: -12, pitch: -6, dx: -0.10, shrug: 0.12, head_tilt: 14, head_pitch: 6, bob: -0.06 },
    feet: { L: [-0.36, 0.022, -0.12] }, hands: { R: { h: [0.10, 0.02, 0.42], elbow: [0.9, -0.2, 0.2] }, L: { t: [-0.42, 1.80, 0.20], elbow: [-1, -0.3, 0] } },
    cycle: t => ({ head_tilt: 2 * sn(t, 2.2), bob: 0.006 * sn(t, 2.9) }) },
  // cane_wag: the boss points his cane at the culprit, leaning in, the free hand on the hip
  cane_wag: { A: 3, T: 8, hold: 34, props: { R: 'cane' }, body: { pitch: 10, head_pitch: 2, lean: 4 }, tilt: { R: -70 },
    hands: { R: { t: [0.36, 1.92, 0.70], elbow: [0.9, -0.4, -0.1] }, L: HIP(-1) },
    cycle: t => ({ hands: { R: [0.06 * sn(t, 0.9), 0.02 * sn(t, 1.8), 0] } }) },
};
for (const n of Object.keys(RP)) { POSES[n] = RP[n]; POSE_VERBS[n] = ACT[n] = (p, st, C) => compilePose(n, p, st, C); }

// face_fill: the rage fills the head from the chin up over `dur` frames, held `hold` frames, then drains over 12 f
POSE_VERBS.face_fill = ACT.face_fill = p => { const d = p.dur ?? 14, h = p.hold ?? 60, R = 12;
  return { end: p.at + d + h + R, owners: [{ chan: 'add', start: p.at, verb: 'face_fill', fn: f => {
    const t = f - p.at; if (t < 0) return {}; const up = Math.min(1, t / d), dn = t > d + h ? Math.max(0, 1 - (t - d - h) / R) : 1;
    return { x_fill: up * up * (3 - 2 * up) * dn }; } }] }; };

// ao_drop: a small thing (a bolt, a rivet, a lantern) falls from `from` with gravity, tumbling, and is gone into the haze;
// fire t0 starts it. { from: [x, y, z] or env.at spec, size (m), color (sRGB), fall (m), spin }
MAKE.ao_drop = (stage, o, ctx) => {
  const g = new THREE.Group(); g.userData.noInk = true; ctx.group.add(g); const s = o.size ?? 0.12;
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(...(o.color || [0.55, 0.52, 0.50]), THREE.SRGBColorSpace), roughness: 0.4, metalness: 0.6 }); m.userData.noToon = true;
  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.22, s * 0.22, s, 12), m); const head = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.42, s * 0.42, s * 0.25, 6), m);
  head.position.y = s * 0.5; bolt.add(head); g.add(bolt); bolt.castShadow = true;
  return { obj: g, apply: (v, f, env) => {
    const t0 = v('t0'); const t = t0 == null ? -1 : (f - t0) / ctx.fps; const p = env.at(o.from);
    const z = 0.5 * 9.8 * t * t; g.visible = t >= 0 && z < (o.fall ?? 120); if (!g.visible) return;
    g.position.set(p[0] + (o.drift ?? 0.3) * t, p[2] - z, -p[1]); bolt.rotation.set((o.spin ?? 7) * t, 0.5, (o.spin ?? 7) * 0.6 * t);
  } };
};

// ao_caliper: a steel caliper laid across a rail joint, its jaws on the two rail ends, so the gap reads as a measured size
// (the rail reference measures its gap the same way). { at: the joint (rail top centre), w0: gap (m) at w = 1, along: 'y' }
// keys: show 0..1, w 0..1 (the jaws follow the gap)
MAKE.ao_caliper = (stage, o, ctx) => {
  const g = new THREE.Group(); g.userData.noInk = true; ctx.group.add(g);
  const steel = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.80, 0.82, 0.86, THREE.SRGBColorSpace), roughness: 0.25, metalness: 0.85 }); steel.userData.noToon = true;
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 48; const c = cv.getContext('2d'); c.fillStyle = '#d6d9de'; c.fillRect(0, 0, 512, 48); c.fillStyle = '#1b1d22';
  for (let i = 0; i <= 100; i++) { const x = 6 + i * 5; c.fillRect(x, 0, 1.5, i % 10 ? (i % 5 ? 12 : 18) : 26); } c.font = '700 14px Arial'; for (let i = 0; i <= 10; i++) c.fillText(String(i), 2 + i * 50, 44);
  const scale = new THREE.CanvasTexture(cv); scale.colorSpace = THREE.SRGBColorSpace;
  const barM = new THREE.MeshStandardMaterial({ map: scale, roughness: 0.3, metalness: 0.6 }); barM.userData.noToon = true;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.22, 0.016), [steel, steel, steel, steel, barM, barM]); g.add(bar);   // faces: +x -x +y -y +z -z
  const jaw = () => { const j = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.045), steel); j.position.z = -0.018; return j; };
  const A = new THREE.Group(), Bj = new THREE.Group(); A.add(jaw()); Bj.add(jaw()); g.add(A, Bj);
  const slider = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.034, 0.02), steel); Bj.add(slider);
  for (const m of [bar, A.children[0], Bj.children[0], slider]) m.castShadow = true;
  return { obj: g, apply: (v, f, env) => {
    g.visible = v('show', 0) > 0.5; if (!g.visible) return;
    const p = env.at(o.at), w = (o.w0 ?? 0.04) * Math.max(0, v('w', 1)), h = (o.h ?? 0.035);
    g.position.set(p[0], p[2] + h, -p[1]);                 // Blender (x, y, z) -> three (x, z, -y): the bar runs along y
    bar.position.set(0, 0, 0); bar.rotation.set(Math.PI / 2, 0, 0);
    A.position.set(0, 0, w / 2 + 0.006); Bj.position.set(0, 0, -(w / 2 + 0.006)); A.rotation.x = Bj.rotation.x = Math.PI / 2;
  } };
};

// ao_lower: a load (a rail length) lowered on a cable from above to its place, swinging a little.
// { from: [x, y, z] the load's start (m), to: [x, y, z] its rest, len (m, along x), top (m above the load for the cable) }
// keys: u 0..1 (0 = at from, 1 = set down at to), show 0..1
MAKE.ao_lower = (stage, o, ctx) => {
  const g = new THREE.Group(); g.userData.noInk = true; ctx.group.add(g);
  const steel = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.62, 0.62, 0.66, THREE.SRGBColorSpace), roughness: 0.35, metalness: 0.8 }); steel.userData.noToon = true;
  const rope = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.15, 0.13, 0.12, THREE.SRGBColorSpace), roughness: 0.8 }); rope.userData.noToon = true;
  const L = o.len ?? 4, load = new THREE.Group(); g.add(load);
  const head = new THREE.Mesh(new THREE.BoxGeometry(L, 0.07, 0.075), steel); head.position.y = 0.11; const web = new THREE.Mesh(new THREE.BoxGeometry(L, 0.09, 0.02), steel); web.position.y = 0.055;
  const foot = new THREE.Mesh(new THREE.BoxGeometry(L, 0.015, 0.13), steel); load.add(head, web, foot); for (const m of [head, web, foot]) m.castShadow = true;
  const T = o.top ?? 14, cab = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6), rope); cab.position.y = 0.15; g.add(cab);
  const sling = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 5), rope); g.add(sling);
  return { obj: g, apply: (v, f, env) => {
    g.visible = v('show', 1) > 0.5 && v('u', 0) < 1.2; if (!g.visible) return;
    const u = Math.max(0, Math.min(1, v('u', 0))), a = env.at(o.from), b = env.at(o.to), e = 1 - Math.pow(1 - u, 2);
    const p = a.map((x, i) => x + (b[i] - x) * e), sw = 0.08 * Math.sin(f * 0.21) * (1 - u);
    g.position.set(p[0], p[2], -p[1]); load.rotation.set(0, sw, 0);
    cab.scale.y = T; cab.position.y = 0.15 + T / 2; sling.scale.y = 0.001;
  } };
};

// leap: a jump through space from where the figure stands to `to` (a mark, place or [x, y, z]): anticipation crouch (antic
// frames), a ballistic arc `h` m high over `dur` frames with the knees tucked and the body pitched into it, a landing squash
// (land frames) that settles to a stand. Cues: a whoosh at take-off, a thud on landing. (Kai 11/11: "motion = the whole body
// travels through space, jumps and landings with anticipation", stick-man-motion-bar.)
//   beats: { line, on, who: 'eng', do: 'leap', to: [2.3, -1.1, 0], h: 0.6, dur: 16 }
POSE_VERBS.leap = ACT.leap = (p, st, C) => {
  const from = st.pos.slice(), to = (C.mark || C.point)(p.to), A = p.antic ?? 6, T = p.dur ?? 16, Ld = p.land ?? 9, h = p.h ?? 0.55, t0 = p.at;
  const dx = to[0] - from[0], dy = to[1] - from[1], yaw = p.yaw ?? (Math.hypot(dx, dy) > 0.05 ? Math.atan2(dx, -dy) * 180 / Math.PI : st.yaw);
  const y0 = st.yaw; st.pos = [to[0], to[1], to[2] ?? from[2] ?? 0]; st.yaw = p.keepYaw ? y0 : yaw;
  const z0 = from[2] || 0, z1 = to[2] ?? z0, fy = p.keepYaw ? y0 : yaw;
  const fn = f => {
    const t = f - t0, base = { footL: STAND.footL, footR: STAND.footR };
    if (t < A) { const u = smooth(t / A); return { pos: from, yaw: lerp(y0, fy, u), bob: -0.32 * u, pitch: 16 * u, ...base, footL: [STAND.footL[0], STAND.footL[1], 0.06], footR: [STAND.footR[0], STAND.footR[1], -0.06] }; }
    if (t < A + T) {
      const u = (t - A) / T, arc = 4 * u * (1 - u), tuck = Math.sin(Math.PI * u);
      const out = 1 - smooth(u / 0.3), inn = smooth((u - 0.7) / 0.3);    // the take-off crouch unfolds, the landing crouch folds in
      return { pos: [lerp(from[0], to[0], u), lerp(from[1], to[1], u), lerp(z0, z1, u) + h * arc], yaw: fy, bob: -0.32 * out - 0.30 * inn - 0.06 * tuck, pitch: 16 * out + 12 * inn - 6 * tuck,
        footL: [-0.22, 0.022 + 0.30 * tuck, 0.06 * out + 0.14 * tuck], footR: [0.22, 0.022 + 0.22 * tuck, -0.06 * out - 0.14 * tuck] };
    }
    const u = smooth((t - A - T) / Ld);
    return { pos: st.pos, yaw: fy, bob: -0.30 * (1 - u), pitch: 12 * (1 - u), ...base };
  };
  return { end: t0 + A + T + Ld, owners: [{ chan: 'body', start: t0, fade: 1, fn }],
    cues: [{ f: t0 + A, name: 'whoosh', strength: 0.5 }, { f: t0 + A + T, name: 'thud', strength: 0.8 }] };
};
