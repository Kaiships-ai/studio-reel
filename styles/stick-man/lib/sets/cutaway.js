// The explainer stage: the bank counter seen up close (marble top curving up into the lobby's tiled wall, no seams)
// and a pool of light where the props stand. Tabletop scale: the cash stack is 0.30 m long. Blender coordinates, metres.
// build() also places the explainer props (plate, hollow stack with the pack inside, thermometer) at their marks.
import * as THREE from 'three';
import { B, lin } from '../../engine/look.js';
import { makeHollowStack, makeDyePack, makePlate, makeThermometer } from '../props/dyepack.js';

export const SUN_DIR = [0.38, 0.55, -0.74];
export const SUN_CENTER = [0.0, 0.0, 0.08], SUN_HALF = 0.9;
export const MARKS = { stack: [0, 0, 0], hand: [0.06, -0.10, 0.26], lifter: [0.10, 0.45, 0] };
export const PLACES = { stack: [0, 0, 0.010], plate: [0, 0, 0], thermo: [0.22, 0.30, 0], hand_grip: [0.0, 0.0, 0.10] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-1.6, -2.4], [1.6, 0.2]]];
const COVE = { yWall: 0.50, r: 0.22, x: 3.2, back: 2.2, front: -3.0 };   // the tiled back wall close behind the props

// the explainer stands on the bank's own counter: marble top in front, the lobby's teal tile wainscot with its brass rail
// and the beige brick wall behind (v = 0 front edge of the floor, v = 1 top of the wall; u spans 2 * COVE.x metres)
function backdropTex(L, vFloor, vWall) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 1024; const g = cv.getContext('2d');
  const Y = v => 1024 * (1 - v), pxU = 1024 / (2 * COVE.x);
  // marble counter top (floor and cove): warm white, a few soft veins
  const mg = g.createLinearGradient(0, Y(0), 0, Y(vWall));
  mg.addColorStop(0, 'rgb(214,208,198)'); mg.addColorStop(0.7, 'rgb(236,232,224)'); mg.addColorStop(1, 'rgb(226,222,214)');
  g.fillStyle = mg; g.fillRect(0, Y(vWall), 1024, Y(0) - Y(vWall));
  let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  g.strokeStyle = 'rgba(150,140,130,0.22)'; g.lineWidth = 2;
  for (let i = 0; i < 26; i++) { let x = rnd() * 1024, y = Y(vFloor * rnd()); g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (rnd() - 0.3) * 60; y += (rnd() - 0.5) * 18; g.lineTo(x, y); } g.stroke(); }
  // brass edge where the counter top meets the back
  g.fillStyle = 'rgb(196,150,52)'; g.fillRect(0, Y(vWall + 0.012), 1024, Y(vWall) - Y(vWall + 0.012));
  // teal tiles up to the rail
  const vRail = vWall + 0.55 / L;                                 // 55 cm of tile
  g.fillStyle = 'rgb(38,128,128)'; g.fillRect(0, Y(vRail), 1024, Y(vWall + 0.012) - Y(vRail));
  g.strokeStyle = 'rgba(16,70,72,0.55)'; g.lineWidth = 2;
  for (let x = 0; x < 1024; x += 0.20 * pxU) { g.beginPath(); g.moveTo(x, Y(vRail)); g.lineTo(x, Y(vWall + 0.012)); g.stroke(); }
  for (let v = vWall + 0.012; v < vRail; v += 0.10 / L) { g.beginPath(); g.moveTo(0, Y(v)); g.lineTo(1024, Y(v)); g.stroke(); }
  g.fillStyle = 'rgb(206,160,60)'; g.fillRect(0, Y(vRail + 0.05 / L), 1024, Y(vRail) - Y(vRail + 0.05 / L));
  // beige brick above
  g.fillStyle = 'rgb(222,190,140)'; g.fillRect(0, 0, 1024, Y(vRail + 0.05 / L));
  g.strokeStyle = 'rgba(150,110,70,0.45)'; g.lineWidth = 2;
  for (let v = vRail + 0.05 / L, r = 0; v < 1; v += 0.12 / L, r++) {
    g.beginPath(); g.moveTo(0, Y(v)); g.lineTo(1024, Y(v)); g.stroke();
    for (let x = (r % 2) * 0.15 * pxU; x < 1024; x += 0.30 * pxU) { g.beginPath(); g.moveTo(x, Y(v)); g.lineTo(x, Y(v + 0.12 / L)); g.stroke(); }
  }
  return { cv, g };
}

export const build = stage => buildCutaway(stage);
export async function buildCutaway(stage) {
  const { scene, prop } = stage;
  // profile along y-z: floor from the front edge to the cove, quarter circle, wall up to `back`
  const prof = [], { yWall, r, x: X, back, front } = COVE, y0 = yWall - r;
  prof.push([front, 0]);
  for (let i = 0; i <= 12; i++) prof.push([front + (y0 - front) * i / 12, 0]);
  for (let i = 1; i <= 16; i++) { const a = (Math.PI / 2) * i / 16; prof.push([y0 + r * Math.sin(a), r - r * Math.cos(a)]); }
  for (let i = 1; i <= 10; i++) prof.push([yWall, r + (back - r) * i / 10]);
  const len = [0]; for (let i = 1; i < prof.length; i++) len.push(len[i - 1] + Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]));
  const L = len[len.length - 1], pos = [], uv = [], idx = [];
  for (let i = 0; i < prof.length; i++) for (const s of [0, 1]) { const v = B(s ? X : -X, prof[i][0], prof[i][1]); pos.push(v.x, v.y, v.z); uv.push(s, len[i] / L); }
  for (let i = 0; i < prof.length - 1; i++) { const a = 2 * i; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  // pool of light painted where the stack stands (u = 0.5, v at y = 0); ellipse so it reads round in metres
  const vFloor = len[13] / L, vWall = len[29] / L, { cv, g } = backdropTex(L, vFloor, vWall), vStack = (0 - front) / L;
  const cx = 512, cy = 1024 * (1 - vStack), rx = 1024 * 0.55 / (2 * X), ry = 1024 * 0.55 / L;
  g.save(); g.translate(cx, cy); g.scale(rx, ry);
  const pool = g.createRadialGradient(0, 0, 0, 0, 0, 1); pool.addColorStop(0, 'rgba(255,240,214,0.30)'); pool.addColorStop(0.55, 'rgba(255,236,206,0.16)'); pool.addColorStop(1, 'rgba(255,240,214,0)');
  g.fillStyle = pool; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill(); g.restore();
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const cyc = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  cyc.receiveShadow = true; scene.add(cyc);
  scene.background = lin(0.87, 0.75, 0.55);
  stage.addBounce([0, -0.2, 0.15], [1.0, 0.82, 0.62], 0.25, 1.2);

  const props = {};
  const put = (name, o, pB, rot = 0) => { o.position.copy(B(...pB)); o.rotation.y = rot; scene.add(o); prop(o); props[name] = o;
    o.userData.rest = { pos: pB.slice(), rot }; return o; };
  put('plate', makePlate(), PLACES.plate);
  const stack = put('stack', makeHollowStack(), PLACES.stack);
  const pack = makeDyePack(stage); pack.position.copy(stack.userData.slot); pack.scale.setScalar(1.25); stack.add(pack); prop(pack);   // fills the hollow: it reads
  props.pack = pack;
  put('thermo', makeThermometer(stage), PLACES.thermo, -0.35);
  return { props };
}
