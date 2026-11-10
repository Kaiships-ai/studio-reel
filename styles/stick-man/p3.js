// P3 asset proof: the street and explainer sets, props, effects and extra cast. ?view=street | burst | cutaway | door | lineup
// window.__frame(f) renders frame f (30 fps; effects read t = f / 30 on top of each view's fixed moment) and returns page ms.
// window.__probe() gives screen boxes (% of frame) of the figures and key props, for framing without looking.
import * as THREE from 'three';
import { createStage, B } from './engine/look.js';
import { makeStick, KAI, W_M } from './engine/cast.js';
import * as STREET from './lib/sets/street.js';
import * as CUT from './lib/sets/cutaway.js';
import { makeDyePack } from './lib/props/dyepack.js';
import { makePowderBurst, makeFlyingBills, makeRadioRings, makeBagGlow, makeDyeSpray, makeFlash, flashAt, dyeOrder } from './lib/props/fx.js';
import { PASSERS, OFFICER, dye, newspaper, shoppingBag } from './lib/cast/extras.js';

const Q = new URLSearchParams(location.search);
const VIEW = Q.get('view') || 'street';
const stage = createStage({ width: innerWidth, height: innerHeight, exposure: Number(Q.get('expo') || 1.0) });
const SET = VIEW === 'cutaway' ? CUT : STREET;
const built = await SET.build(stage);
const { scene } = stage, P = built.props;
const toB = v => [v.x, -v.z, v.y];
const add = S => { scene.add(S.root); return S; };
const figs = {};                                                   // name -> stick, for the probe
const handW = (S, side) => S.parts.hands[side].getWorldPosition(new THREE.Vector3());
const hang = (o, S, side, yaw = 0) => { o.position.copy(handW(S, side)); o.position.y -= 0.01; o.rotation.y = yaw; o.updateMatrixWorld(true); };

let shot;                                                          // per-view setup -> { cam, tgt, lens, sun: [center, half], tick(t) }
if (VIEW === 'cutaway') {
  const spare = makeDyePack(stage); spare.position.copy(B(0.10, -0.21, 0)); spare.rotation.y = -0.15; scene.add(spare); stage.prop(spare);
  shot = { cam: [0.0, -0.40, 0.50], tgt: [0.04, 0.03, 0.03], lens: 30, sun: [CUT.SUN_CENTER, CUT.SUN_HALF],
    tick: t => {
      P.stack.userData.set({ lift: 0.5 });
      P.pack.userData.set({ awake: 0, snore: 0.75 });
      spare.userData.set({ awake: 1, alarm: 1, dial: 1, count: 7 });
      P.thermo.userData.set({ temp: Math.min(400, 70 + 330 * Math.min(1, 0.8 + t)) });
    } };
} else {
  P.police.userData.set({ phase: 0.0, on: 1 });
  const kai = add(makeStick(KAI));
  if (VIEW === 'street') {
    figs.kai = kai; dye(kai, 1);
    const [m1, m2, m3] = PASSERS.map(s => add(makeStick(s)));
    Object.assign(figs, { mabel: m1, otis: m2, june: m3 });
    const off = add(makeStick(OFFICER)); figs.officer = off;
    const bagS = shoppingBag(), paper = newspaper(); scene.add(bagS, paper); stage.prop(bagS); stage.prop(paper);
    const K = STREET.MARKS.burst;
    const { cam, tgt, lens } = STREET.CAMERA_WIDE;
    shot = { cam, tgt, lens, sun: [[0.6, -3.2, 0.5], 7.5],
      tick: () => {
        kai.pose({ pos: K, face: cam, expr: 'worried', look: 0.2, handR: [0.55, 1.15], bendR: 0.12 });
        m1.pose({ pos: STREET.MARKS.crowd_1, face: K, expr: 'shock', footL: [-0.30, 0.02], footR: [0.12, 0.02] });
        m2.pose({ pos: STREET.MARKS.crowd_2, face: K, expr: 'shock', front: ['armL'], handL: [-0.18, 1.85], bendL: -0.2, lean: 4 });
        m3.pose({ pos: STREET.MARKS.crowd_3, face: K, expr: 'worried', look: -0.3, handL: [-0.62, 1.95], bendL: -0.25 });
        off.pose({ pos: STREET.MARKS.officer, face: K, expr: 'stern' });
        hang(bagS, m1, 'R', 0.4); hang(P.bag, kai, 'R', 0.3);
        paper.position.copy(handW(m2, 'L')).add(new THREE.Vector3(0, -0.06, 0)); paper.lookAt(B(...cam));
        P.police.userData.set({ phase: 0.05, on: 1 });
      } };
  } else if (VIEW === 'burst') {
    figs.kai = kai; dye(kai, 0.5); P.police.visible = false;               // the car arrives later (l10)
    const burst = makePowderBurst(stage, { size: 0.75 }), bills = makeFlyingBills(stage, { n: 18, scale: 1.3 }), spray = makeDyeSpray(stage);
    const flash = makeFlash(stage), glowB = makeBagGlow(stage, P.bag);
    scene.add(burst, bills, spray);
    const K = STREET.MARKS.burst, t0 = 0.4;
    shot = { cam: [-0.9, -6.4, 1.55], tgt: [1.35, -1.9, 1.2], lens: 30, sun: [[1.2, -1.9, 0.8], 3.2],
      tick: t => {
        const tt = t0 + t;
        kai.pose({ pos: K, face: [-0.9, -6.4, 0], expr: 'shock', handR: [0.62, 1.20], bendR: 0.1, handL: [-0.75, 2.05], bendL: -0.3, lean: -4 });
        hang(P.bag, kai, 'R', 0.3);
        const c = P.bag.position.clone(); c.y -= 0.18;
        burst.position.copy(c); burst.userData.set(tt);
        bills.position.copy(c); bills.userData.set(tt, { ground: -c.y + 0.002, dyed: dyeOrder(tt, { start: 0.1, step: 0.06 }) });
        spray.position.copy(c); spray.lookAt(c.clone().add(new THREE.Vector3(-0.6, 0.4, 0.5))); spray.userData.set(tt, { on: 0.8 });
        glowB.userData.set(0); flash.userData.set(flashAt(tt));
      } };
  } else if (VIEW === 'door') {
    figs.kai = kai;
    const rings = makeRadioRings(stage); scene.add(rings);
    const glowB = makeBagGlow(stage, P.bag);
    shot = { cam: [2.0, -3.7, 1.55], tgt: [0.3, -0.45, 1.45], lens: 28, sun: [[0.2, -0.8, 1.0], 3.0],
      tick: t => {
        kai.pose({ pos: [0.05, -0.7, 0], face: [1.6, -3.6, 0], expr: 'grin', look: 0.3, handR: [0.48, 1.22], bendR: 0.12 });
        hang(P.bag, kai, 'R', 0.6);
        const bag = P.bag.position.clone(); bag.y -= 0.15;
        rings.userData.set(0.62 + t, { from: B(...STREET.PLACES.sensor).toArray(), to: bag.toArray(), dur: 0.9, gap: 0.42, r0: 0.08, r1: 0.30, face: B(2.0, -3.7, 1.55).toArray() });
        glowB.userData.set(0.25);
        P.sensor.set(1);
      } };
  } else {                                                         // lineup: back row the extras and the officer, front row the three Kais
    const back = [...PASSERS, OFFICER].map(s => add(makeStick(s)));
    const half = add(makeStick(KAI)), red = add(makeStick(KAI));
    dye(half, 0.5); dye(red, 1);
    Object.assign(figs, { mabel: back[0], otis: back[1], june: back[2], officer: back[3], kai, half, red });
    const bagS = shoppingBag(), paper = newspaper(); scene.add(bagS, paper); stage.prop(bagS); stage.prop(paper);
    P.bag.visible = false; P.police.visible = false;
    const cam = [0.3, -6.6, 3.9];
    shot = { cam, tgt: [0.3, -1.5, 0.75], lens: 30, sun: [[0.3, -1.6, 0.8], 3.6],
      tick: () => {
        back.forEach((S, i) => S.pose({ pos: [0.3 + (i - 1.5) * 0.78, -0.6, 0], face: cam, expr: ['happy', 'neutral', 'calm', 'stern'][i] }));
        [kai, half, red].forEach((S, i) => S.pose({ pos: [0.3 + (i - 1) * 0.78, -2.6, 0], face: cam, expr: ['grin', 'worried', 'shock'][i] }));
        hang(bagS, back[0], 'R', 0.2);
        paper.position.copy(handW(back[1], 'L')).add(new THREE.Vector3(0, -0.06, 0)); paper.lookAt(B(...cam));
      } };
  }
}

window.__frame = f => {
  const t = f / 30;
  shot.tick(t);
  stage.setSun(SET.SUN_DIR, shot.sun[0], shot.sun[1]);
  let { cam, tgt, lens } = shot;
  if (Q.get('cam')) { const c = Q.get('cam').split(',').map(Number); [cam, tgt, lens] = [c.slice(0, 3), c.slice(3, 6), c[6]]; }
  stage.setCamera(cam, tgt, lens);
  return stage.render();
};

window.__probe = () => {
  const cam = stage.camera, v = new THREE.Vector3();
  const pct = p => { v.copy(p).project(cam); return [+((v.x + 1) * 50).toFixed(1), +((1 - v.y) * 50).toFixed(1)]; };
  const out = {};
  for (const [k, S] of Object.entries(figs)) {
    const h = S.parts.head.getWorldPosition(new THREE.Vector3());
    out[k] = { head: pct(h), top: pct(h.clone().add(new THREE.Vector3(0, 0.3 * W_M, 0))), sole: pct(S.root.position) };
  }
  for (const k of ['bag', 'police', 'stack', 'thermo']) if (P[k]) out[k] = pct(P[k].getWorldPosition(new THREE.Vector3()));
  if (P.sensor) out.sensor = pct(P.sensor.mesh.getWorldPosition(new THREE.Vector3()));
  out.where = toB(cam.position).map(n => +n.toFixed(2));
  return out;
};
window.__frame(0);
window.__ready = true;
