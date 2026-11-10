// P0 look test (v2 cameras). ?view=turn | a | b | front (| cast). window.__frame(f) renders frame f and returns page-side ms.
//   turn:  Kai standing; f % 4 picks front, 3/4, back, top-down
//   a:     medium two-shot (slow push-in over f)
//   b:     close-up on the Teller, lens blur on the room behind
//   front: near-orthographic front view of Kai for the proportion numbers (window.__probe)
import * as THREE from 'three';
import { createStage, B } from './engine/look.js';
import { makeStick, KAI, TELLER, GUARD, W_M } from './engine/cast.js';
import { buildBankLobby, SUN_DIR, STACK, TELLER_SPOT } from './lib/sets/bank-lobby.js';

const Q = new URLSearchParams(location.search);
const VIEW = Q.get('view') || 'a';
const stage = createStage({ width: innerWidth, height: innerHeight, exposure: Number(Q.get('expo') || 1.0) });
await buildBankLobby(stage);

const lerp = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const KAI_POS = [0.35, 1.30, 0.0];
const kai = makeStick(KAI); stage.scene.add(kai.root);
const tel = makeStick(TELLER); stage.scene.add(tel.root);
const grd = makeStick(GUARD); stage.scene.add(grd.root);

// framed with __probe: both heads inside x 8-92 %, Kai ~46 % and the Teller ~36 % of the frame height, feet in frame
function camA(f) { const t = Math.min(1, f / 96); return [lerp([-3.30, -1.60, 1.45], [-3.22, -1.55, 1.45], t), [1.18, 1.20, 1.00], 45]; }
// whole Teller head in frame, cash stack lower left
function camB(f) { const t = Math.min(1, f / 82); return [lerp([0.55, -0.75, 1.55], [0.58, -0.70, 1.55], t), [1.98, 0.92, 1.45], 37]; }

function poseCast(f, camPos) {
  const g = f / 30;                                              // gentle idle so speed runs are not a frozen frame
  kai.pose({ pos: KAI_POS, face: camPos, expr: 'smug', look: 0.75, front: ['armR'], handR: [0.78, 1.66 + 0.01 * Math.sin(g * 3)], bendR: -0.05,
    handL: [-0.41, 1.30], bendL: -0.10, blink: 0 });
  tel.place({ pos: TELLER_SPOT, face: camPos });
  const rest = tel.toLocal([STACK[0] + 0.30, STACK[1] + 0.20, STACK[2] + 0.13]);
  tel.pose({ pos: TELLER_SPOT, face: camPos, expr: 'sly', look: -0.75, front: ['armL'], handL: rest, contact: false,
    head_tilt: 2 * Math.sin(g * 2) });
  grd.root.visible = false;
}

const TURN = [
  { cam: [0.35, -1.90, 0.95], tgt: [0.35, 1.30, 0.86], lens: 42 },
  { cam: [0.35 - 3.2 * Math.sin(Math.PI / 4), 1.30 - 3.2 * Math.cos(Math.PI / 4), 1.10], tgt: [0.35, 1.30, 0.86], lens: 42 },
  { cam: [0.35, 4.50, 1.05], tgt: [0.35, 1.30, 0.86], lens: 42 },
  { cam: [0.36, 0.20, 4.20], tgt: [0.35, 1.30, 0.80], lens: 42 },
];

window.__frame = f => {
  let camPos, tgt, lens;
  stage.setDof(null);
  if (VIEW === 'turn') {
    ({ cam: camPos, tgt, lens } = TURN[((f % 4) + 4) % 4]);
    kai.pose({ pos: KAI_POS, yaw: 0, expr: 'happy', look: 0, blink: 0 });
    tel.pose({ pos: TELLER_SPOT, face: camPos, expr: 'neutral', contact: false });
    grd.root.visible = false;
    stage.setSun(SUN_DIR, KAI_POS, 3.5);
  } else if (VIEW === 'front') {
    [camPos, tgt, lens] = [[0.35, 1.30 - 40, 0.87], [0.35, 1.30, 0.87], 600];
    kai.pose({ pos: KAI_POS, yaw: 0, expr: 'neutral', look: 0, blink: 0 });
    tel.root.visible = grd.root.visible = false;
    stage.setSun(SUN_DIR, KAI_POS, 3.5);
  } else if (VIEW === 'cast') {
    [camPos, tgt, lens] = [[0.6, -2.4, 1.0], [0.6, 1.3, 0.9], 40];
    kai.pose({ pos: [-0.25, 1.3, 0], yaw: 0, expr: 'grin' });
    tel.pose({ pos: [0.55, 1.3, 0], yaw: 0, expr: 'sly', look: -0.5 });
    grd.pose({ pos: [1.35, 1.3, 0], yaw: 0, expr: 'stern' });
    stage.setSun(SUN_DIR, [0.5, 1.3, 0], 4);
  } else if (VIEW === 'b') {
    [camPos, tgt, lens] = camB(f);
    poseCast(150 + f, camPos);
    stage.setSun(SUN_DIR, [2.0, 1.2, 1.2], 3.0);
    stage.setDof({ near: 1.3, far: 2.9, gain: 2.5, px: 14 });
  } else {
    [camPos, tgt, lens] = camA(f);
    poseCast(f, camPos);
    stage.setSun(SUN_DIR, [1.2, 1.6, 0.8], 4.5);
  }
  if (Q.get('cam')) { const c = Q.get('cam').split(',').map(Number); [camPos, tgt, lens] = [c.slice(0, 3), c.slice(3, 6), c[6]]; }   // framing trials
  stage.setCamera(camPos, tgt, lens);
  return stage.render();
};

// screen boxes (px, y down) of the cast, and for the front view the proportion ratios in head widths
window.__probe = () => {
  const cam = stage.camera, Wp = innerWidth, Hp = innerHeight, v = new THREE.Vector3();
  const toPx = p => { v.copy(p).project(cam); return [(v.x + 1) / 2 * Wp, (1 - v.y) / 2 * Hp]; };
  const box = (o, deep = true) => {
    const b = new THREE.Box3();
    if (deep) b.setFromObject(o); else { o.geometry.computeBoundingBox(); b.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < 8; i++) { const [x, y] = toPx(new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z)); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
  };
  const out = {};
  for (const [k, s] of [['kai', kai], ['tel', tel]]) if (s.root.visible) {
    // camera-facing extents: head centre +- half a head width along the camera's right and up axes; sole to head top
    const c = s.parts.head.getWorldPosition(new THREE.Vector3()), R = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), U = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    const hx0 = toPx(c.clone().addScaledVector(R, -0.5 * W_M))[0], hx1 = toPx(c.clone().addScaledVector(R, 0.5 * W_M))[0];
    const top = toPx(c.clone().addScaledVector(U, 0.47 * W_M))[1], sole = toPx(s.root.getWorldPosition(new THREE.Vector3()))[1];
    out[k] = { headPct: [hx0 / Wp * 100, hx1 / Wp * 100].map(n => +n.toFixed(1)), bodyPct: [top / Hp * 100, sole / Hp * 100].map(n => +n.toFixed(1)),
      heightPct: +((sole - top) / Hp * 100).toFixed(1) };
  }
  out.cashPct = toPx(B(...STACK)).map((c, i) => +(c / (i ? Hp : Wp) * 100).toFixed(1));
  if (VIEW === 'front') {
    const head = box(kai.parts.head, false), hull = box(kai.parts.head.children[0], false), torso = box(kai.parts.torso, false), all = box(kai.root);
    const sole = Math.max(...Object.values(kai.parts.toes).map(t => box(t, false).y1)), hw = head.w;
    const eye = s => toPx(kai.parts.head.localToWorld(new THREE.Vector3(s * 0.15 * W_M, 0.02 * W_M, 0.5 * W_M)))[0];
    const r3 = n => +n.toFixed(3);
    out.ratios = { headPx: r3(hw), total: r3((sole - head.y0) / hw), totalWithHair: r3((sole - all.y0) / hw), legs: r3((sole - torso.y1) / hw),
      torsoW: r3(torso.w / hw), torsoH: r3(torso.h / hw), eyes: r3((eye(1) - eye(-1)) / hw), outline: r3((hull.w - hw) / 2 / hw) };
  }
  return out;
};
window.__frame(0);
window.__ready = true;
