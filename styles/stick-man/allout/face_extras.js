// PROPOSAL, off by default (study gap 6, for Kai to approve): "extreme beat" face extras laid over the approved faces only on
// a peak beat, the way the reference does it: bloodshot veins round ring eyes, glowing eyes, dirt smudges, a sweat burst.
// The face set itself is not touched: these are transparent cards on the face rig (they slide with the face), shown only
// while a beat asks for them.
//   import '/styles/stick-man/allout/face_extras.js'
//   beats: { f, who: 'kip', do: 'face_extra', kind: 'veins' | 'glow' | 'dirt' | 'sweat', dur }   (pair with expr 'panic' / 'manic')
import * as THREE from 'three';
import { W_M } from '../engine/cast.js';
import { ACT } from '../engine/verbs_fx.js';
import { POSE_VERBS } from '../engine/poses.js';
import { HOOKS } from '../engine/play.js';

const HA = 0.5 * W_M;
const draw = (kind) => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d'), r = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(kind.length * 31 + 7);
  const eyes = [[92, 118], [164, 118]];
  if (kind === 'veins') for (const [x, y] of eyes) for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + r() * 0.3; g.strokeStyle = 'rgba(205,30,30,0.85)'; g.lineWidth = 2.2; g.beginPath();
    let px = x + Math.cos(a) * 30, py = y + Math.sin(a) * 30; g.moveTo(px, py); for (let k = 0; k < 4; k++) { px -= Math.cos(a + (r() - 0.5) * 1.2) * 6; py -= Math.sin(a + (r() - 0.5) * 1.2) * 6; g.lineTo(px, py); } g.stroke(); }
  if (kind === 'glow') for (const [x, y] of eyes) { const gr = g.createRadialGradient(x, y, 2, x, y, 46); gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(0.3, 'rgba(255,230,120,0.9)'); gr.addColorStop(1, 'rgba(255,170,40,0)'); g.fillStyle = gr; g.fillRect(x - 50, y - 50, 100, 100);
    g.strokeStyle = 'rgba(255,250,210,0.9)'; g.lineWidth = 3; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; g.beginPath(); g.moveTo(x + Math.cos(a) * 20, y + Math.sin(a) * 20); g.lineTo(x + Math.cos(a) * 44, y + Math.sin(a) * 44); g.stroke(); } }
  if (kind === 'dirt') for (let i = 0; i < 26; i++) { const x = 40 + r() * 176, y = 60 + r() * 150, s = 6 + r() * 26, gr = g.createRadialGradient(x, y, 0, x, y, s);
    gr.addColorStop(0, `rgba(120,85,45,${0.35 + 0.3 * r()})`); gr.addColorStop(1, 'rgba(120,85,45,0)'); g.fillStyle = gr; g.fillRect(x - s, y - s, 2 * s, 2 * s); }
  if (kind === 'sweat') for (let i = 0; i < 6; i++) { const x = i % 2 ? 30 + r() * 20 : 206 + r() * 20, y = 50 + i * 22; g.fillStyle = 'rgba(120,200,255,0.95)'; g.strokeStyle = 'rgba(10,10,20,1)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x, y - 14); g.quadraticCurveTo(x + 10, y + 4, x, y + 8); g.quadraticCurveTo(x - 10, y + 4, x, y - 14); g.fill(); g.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };

const KINDS = ['veins', 'glow', 'dirt', 'sweat'];
HOOKS.faceExtras = S => {
  if (S.userData?.faceExtras) return;
  const rig = S.parts.face.parent, cards = {};
  for (const k of KINDS) { const m = new THREE.MeshBasicMaterial({ map: draw(k), transparent: true, depthWrite: false, blending: k === 'glow' ? THREE.AdditiveBlending : THREE.NormalBlending });
    m.userData.noToon = true; const c = new THREE.Mesh(new THREE.PlaneGeometry(0.62 * W_M * 1.0, 0.62 * W_M), m); c.position.set(0, 0.0, HA + 0.012); c.renderOrder = 3; c.userData.noPrepass = true; c.visible = false; rig.add(c); cards[k] = c; }
  const pose = S.pose; S.pose = P => { const r = pose(P); for (const k of KINDS) cards[k].visible = (P['x_fx_' + k] || 0) > 0; return r; };
  (S.userData ||= {}).faceExtras = true;
};
// face_extra: show one extra for `dur` frames (default 40)
POSE_VERBS.face_extra = ACT.face_extra = (p, st, C) => ({ end: p.at + (p.dur ?? 40), owners: [{ chan: 'add', start: p.at, verb: 'face_extra',
  fn: f => (f >= p.at && f < p.at + (p.dur ?? 40) ? { ['x_fx_' + p.kind]: 1 } : {}) }] });
