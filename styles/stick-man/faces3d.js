// Face proof page: one real figure (cast.js makeStick, toon head, ink hull) in a close-up, one expression per frame, so a
// face sheet shows the faces as a film shows them. ?spec=KAI|BRAM  ?mode=sheet|beat|talk
//   sheet: frame f = the f-th base expression (window.__names lists them)
//   beat:  frame f = frame 2f of a 24 f beat (doubt -> shock -> laugh) through acting.js faceStateAt + faces.js mixFace
//   talk:  frame f = a viseme sweep on 'neutral' (open 0..1, wide, round, teeth)
//   node styles/stick-man/tools/shot.mjs --page styles/stick-man/faces3d.html --query spec=BRAM --frames 0-5 --out f_%d.jpg --w 540 --h 960
import * as THREE from 'three';
import { createStage, lin } from './engine/look.js';
import { makeStick, KAI, EXPR } from './engine/cast.js';
import { BRAM } from './lib/cast/extras.js';
import { faceStateAt } from './engine/acting.js';

const Q = new URLSearchParams(location.search);
const SPEC0 = { KAI, BRAM }[Q.get('spec') || 'KAI'] || KAI, MODE = Q.get('mode') || 'sheet';
const SPEC = Q.get('glasses') === '0' ? { ...SPEC0, glasses: false } : SPEC0;   // ?glasses=0: the face grammar without rims
const stage = createStage({ width: innerWidth, height: innerHeight });
stage.scene.background = lin(0.62, 0.66, 0.70);
const fig = makeStick(SPEC); stage.scene.add(fig.root);
const NAMES = Q.get('names') ? Q.get('names').split(',') : Object.keys(EXPR).filter(k => !/_(o|O)$/.test(k));   // ?names=a,b: just these
window.__names = NAMES;
// doubt -> shock -> laugh in 24 frames (two in-betweened changes; the strip samples every 2nd frame)
const BEAT = [{ f: -1e9, expr: 'suspicious' }, { f: 3, expr: 'shock' }, { f: 13, expr: 'laugh' in EXPR ? 'laugh' : 'grin' }];
const TALK = [[0, 0, 0, 0], [0.25, 0, 0, 0], [0.5, 0, 0, 0], [0.8, 0, 0, 0], [1, 0.3, 0, 0], [0.5, 0, 1, 0], [0.3, 0.6, 0, 1], [0.05, 0, 0, 0]];
const CAM = [0, -2.3, 1.47], TGT = [0, 0, 1.45];
stage.setSun([-0.55, -1.0, 1.25], [0, 0, 1.2], 2.5);

window.__frame = f => {
  const YAWS = Q.get('yaws') ? Q.get('yaws').split(',').map(Number) : null;   // ?yaws=0,35,70: one frame per turn (the 2D face slide)
  const P = { pos: [0, 0, 0], yaw: YAWS ? YAWS[f % YAWS.length] : 0, face: YAWS ? null : CAM, look: 0, blink: 0, t: f, age: 30, cam: CAM };
  if (MODE === 'beat') { const g = 2 * f; P.expr = BEAT.filter(k => k.f <= g).pop().expr; P.state = faceStateAt(BEAT, g, 7); P.t = g; P.age = g - BEAT.filter(k => k.f <= g).pop().f; }
  else if (MODE === 'talk') { const [open, wide, round, teeth] = TALK[f % TALK.length]; P.expr = 'neutral'; P.state = { a: 'neutral', b: 'neutral', u: 1, talk: { open, wide, round, teeth } }; }
  else P.expr = NAMES[f % NAMES.length];
  fig.pose(P);
  stage.setCamera(CAM, TGT, 50);
  return stage.render();
};
window.__ready = true;
