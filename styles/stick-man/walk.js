// Walk test page: Kai walks down the lobby with the reel's own walk_to verb (engine/verbs.js), so what this page
// shows is what the reel does. ?view=side | 34 | front, ?style=stroll | walk | brisk | run, &carry=1 = bag over the
// right shoulder. window.__frame(f) renders frame f; __dbg(f) gives the pose numbers; __motion(f) the foot slide.
import * as THREE from 'three';
import { createStage, B } from './engine/look.js';
import { makeStick, KAI } from './engine/cast.js';
import { VERBS, STAND, REST_ARM, GAIT, fwdB, rightB } from './engine/verbs.js';
import { buildBankLobby, SUN_DIR } from './lib/sets/bank-lobby.js';

const Q = new URLSearchParams(location.search);
const VIEW = Q.get('view') || 'side', STYLE = GAIT[Q.get('style')] ? Q.get('style') : 'walk', CARRY = Q.get('carry') === '1';
const stage = createStage({ width: innerWidth, height: innerHeight });
const { props } = await buildBankLobby(stage);
const kai = makeStick(KAI); stage.scene.add(kai.root);

// straight south down the open side of the lobby (counter is at x >= 1.3, the bench at y 4.2)
const FROM = [0.4, 2.6, 0], TO = [0.4, -4.2, 0], START = 12;
const st = { name: 'kai', pos: FROM.slice(), yaw: 0, posture: 'stand', hold: { L: null, R: CARRY ? 'bag' : null }, handW: {}, sling: CARRY ? 'R' : null };
const C = { point: s => s, yawTo: (a, b) => Math.atan2(b[0] - a[0], -(b[1] - a[1])) * 180 / Math.PI };
const walk = VERBS.walk_to({ at: START, to: TO, style: STYLE, carry: CARRY ? 'R' : null }, st, C);
const [bodyOwner, headOwner] = walk.owners;
const G = walk.gait, F_END = G.fe + 24;
const standBody = { pos: FROM, yaw: 0, bob: 0, lean: 0, pitch: 0, footL: STAND.footL, footR: STAND.footR };
// expression changes twice on the way, like the reference: a set jaw, a grin, then pleased with himself
const EXPRS = [[0, 'smug'], [G.fw + 2 * G.T, 'grin'], [G.fw + 6 * G.T, 'happy']];
const BLINKS = [START + 20, START + 70, START + 128];

let body = standBody;
function pose(f) {
  body = f >= START ? bodyOwner.fn(f) : standBody;
  const hp = headOwner.fn(f).head_pitch || 0, expr = EXPRS.filter(e => e[0] <= f).pop()[1];
  const b = BLINKS.find(s => f >= s && f < s + 4), blink = b != null ? [1, 2, 2, 1][f - b] : 0;
  const arm = side => ({ ...(body.arm?.[side] || REST_ARM), w: 1 });
  const P = { ...body, head_pitch: hp, expr, blink, look: VIEW === 'side' ? -0.2 : 0.15, handL: STAND.handL, handR: STAND.handR, armFKL: arm('L'), armFKR: arm('R') };
  if (CARRY) { P.handR = [0.30, 2.06, -0.10]; P.elbowR = [0.5, -0.6, 0.6]; P.armFKR = null; }
  kai.pose(P);
  if (CARRY) {                                                     // the bag hangs behind the back from the hand
    const h = kai.parts.hands.R.getWorldPosition(new THREE.Vector3()), yaw = body.yaw * Math.PI / 180;
    const R = rightB(body.yaw), F = fwdB(body.yaw), off = [0.03, -0.03, -0.32];
    const hb = [h.x, -h.z, h.y], pb = [hb[0] + R[0] * off[0] + F[0] * off[2], hb[1] + R[1] * off[0] + F[1] * off[2], hb[2] + off[1]];
    const ph = body.walking ?? 0, k = body.walking != null ? 1 : 0;
    props.bag.position.copy(B(...pb)); props.bag.rotation.set(0.10 * Math.sin(2 * Math.PI * ph) * k, yaw, 0.06 * Math.cos(2 * Math.PI * ph) * k, 'YXZ');
    props.bag.updateMatrixWorld(true);
  }
}

// tracking camera: holds the pelvis at a fixed offset (side: from the west, 34: from the south-west, front: ahead)
const lerp = (a, b, t) => a + (b - a) * t;
function cam(f) {
  const p0 = (f >= START ? bodyOwner.fn(Math.max(START, f)) : standBody).pos, p1 = (f - 3 >= START ? bodyOwner.fn(f - 3) : standBody).pos;
  const c = [lerp(p0[0], p1[0], 0.35), lerp(p0[1], p1[1], 0.35)];        // trails the figure by about a frame
  const off = { side: [-3.6, 0, 0], 34: [-2.4, -2.6, 0], front: [0, -3.5, 0] }[VIEW] || [-3.6, 0, 0];
  return { pos: [c[0] + off[0], c[1] + off[1], 1.05], aim: [c[0], c[1] - (VIEW === 'side' ? 0.25 : 0), 0.86], lens: 50 };
}

function update(f) {
  pose(f);
  const c = cam(f);
  stage.setSun(SUN_DIR, [c.aim[0], c.aim[1], 0.8], 4.5);
  stage.setDof(null);
  stage.setCamera(c.pos, c.aim, c.lens);
}
window.__frame = f => { update(f); return stage.render(); };

const toB = v => [v.x, -v.z, v.y].map(x => +x.toFixed(4));
const v = new THREE.Vector3();
const toPx720 = p => { v.set(p[0], p[2], -p[1]).project(stage.camera); return [(v.x + 1) / 2 * 720, (1 - v.y) / 2 * 720 * innerHeight / innerWidth]; };
window.__dbg = f => {
  update(f);
  const tau = (f - G.fw) / G.T;
  return JSON.stringify({ f, style: STYLE, view: VIEW, gait: { ...G, tau: +tau.toFixed(4), walking: tau > 0 && tau < G.n + 1, steady: tau >= 1 && tau <= G.n },
    actors: { kai: { pos: body.pos.map(x => +x.toFixed(4)), yaw: +body.yaw.toFixed(2), bob: +(body.bob || 0).toFixed(4),
      head: toB(kai.parts.head.getWorldPosition(new THREE.Vector3())), limbs: kai.rigWorld(),
      ...(CARRY ? { bag: toB(props.bag.position) } : {}) } } });
};
// foot slide under this frame's camera, px per frame at 720 wide: ankle and toe of each foot, planted = on the floor in both frames
window.__motion = f => {
  const pts = () => { const r = kai.rigWorld(); return Object.fromEntries(['L', 'R'].flatMap(s => [[s + 'ankle', r[s].ankle], [s + 'toe', r[s].toe]])); };
  update(Math.max(0, f - 1)); const a = pts(); update(f); const b = pts();
  const feet = {};
  for (const k in a) { const q0 = toPx720(a[k]), q1 = toPx720(b[k]);
    feet[k] = { planted: a[k][2] < (k.endsWith('toe') ? 0.0125 : 0.0140) && b[k][2] < (k.endsWith('toe') ? 0.0125 : 0.0140), px: +Math.hypot(q1[0] - q0[0], q1[1] - q0[1]).toFixed(3) }; }
  return { feet };
};
window.__T_END = F_END / 30;
window.__gait = () => ({ ...G, end: F_END, style: STYLE });
update(0); stage.render();
window.__ready = true;
