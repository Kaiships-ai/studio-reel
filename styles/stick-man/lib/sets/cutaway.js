// The explainer stage: a plain warm backdrop (floor curving up into a wall, no seams), a soft floor gradient and a
// pool of light where the props stand. Tabletop scale: the cash stack is 0.30 m long. Blender coordinates, metres.
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
const COVE = { yWall: 0.9, r: 0.45, x: 3.2, back: 2.2, front: -3.0 };

function backdropTex() {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 1024; const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0, 1024, 0, 0);                // v = 0 front edge of the floor, v = 1 top of the wall
  gr.addColorStop(0.0, 'rgb(140,84,56)'); gr.addColorStop(0.42, 'rgb(160,100,66)'); gr.addColorStop(0.62, 'rgb(150,88,64)'); gr.addColorStop(1.0, 'rgb(120,66,56)');
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
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
  const { cv, g } = backdropTex(), vStack = (0 - front) / L;
  const cx = 512, cy = 1024 * (1 - vStack), rx = 1024 * 0.55 / (2 * X), ry = 1024 * 0.55 / L;
  g.save(); g.translate(cx, cy); g.scale(rx, ry);
  const pool = g.createRadialGradient(0, 0, 0, 0, 0, 1); pool.addColorStop(0, 'rgba(255,232,200,0.42)'); pool.addColorStop(0.55, 'rgba(255,226,190,0.25)'); pool.addColorStop(1, 'rgba(255,240,214,0)');
  g.fillStyle = pool; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill(); g.restore();
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const cyc = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  cyc.receiveShadow = true; scene.add(cyc);
  scene.background = lin(0.80, 0.62, 0.48);
  stage.addBounce([0, -0.2, 0.15], [1.0, 0.82, 0.62], 0.25, 1.2);

  const props = {};
  const put = (name, o, pB, rot = 0) => { o.position.copy(B(...pB)); o.rotation.y = rot; scene.add(o); prop(o); props[name] = o;
    o.userData.rest = { pos: pB.slice(), rot }; return o; };
  put('plate', makePlate(), PLACES.plate);
  const stack = put('stack', makeHollowStack(), PLACES.stack);
  const pack = makeDyePack(stage); pack.position.copy(stack.userData.slot); stack.add(pack); prop(pack);
  props.pack = pack;
  put('thermo', makeThermometer(stage), PLACES.thermo, -0.35);
  return { props };
}
