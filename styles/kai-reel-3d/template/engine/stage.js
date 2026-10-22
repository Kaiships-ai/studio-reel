// stage.js: one 3D reel page = renderer + scene + camera + post (ink lines, grade, motion blur) + flat-space shadow
// + a 2D overlay canvas (captions, speed lines, titles). Contract with render/shot.mjs:
//   window.__frame(t, sub, shutter, fps)  renders the frame at video time t (pure function of t, any order)
//   window.__T_END                        reel length in seconds
//   window.__cues()                       optional: event times for audio/score.py
// Everything is authored in FLAT space; bend.js maps it to the world (0 curvature = a normal flat world).
import * as THREE from 'three';
import { U, LAYER_OUTLINE, Shadow } from './look.js';
import { Post } from './post.js';
import { B, bendFrame, bendP } from './bend.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const ss = (x) => x * x * (3 - 2 * x), sio = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
export const eo = (x) => 1 - Math.pow(1 - x, 3), ei = (x) => x * x * x, lerp = THREE.MathUtils.lerp;
export const backOut = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
export const bump = (t, a, b, f) => Math.min(ss(seg(t, a - f, a + f)), 1 - ss(seg(t, b - f, b + f)));
export const hsh = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
export const shake = (t, t0, amp, k = 8) => { const d = t - t0; return d < 0 ? V(0, 0, 0) : V(Math.sin(t * 93), Math.sin(t * 71 + 1), Math.sin(t * 57 + 2)).multiplyScalar(amp * Math.exp(-d * k)); };

// a camera spec authored in flat space → world (rides the bend: the world turns, the frame does not)
export function flatCam(pos, tgt, o = {}) {
  const a = bendFrame(pos), b = bendP(tgt).p.clone();
  return { pos: a.pos, tgt: b, up: V(-Math.sin(a.th), Math.cos(a.th), 0), fov: o.fov ?? 50, roll: o.roll ?? 0 };
}

export function createStage() {
  const W = innerWidth, H = innerHeight, DPR = devicePixelRatio;
  const fx = document.getElementById('fx'), g2 = fx.getContext('2d'); fx.width = W * DPR; fx.height = H * DPR;
  const glc = document.getElementById('gl');
  const renderer = new THREE.WebGLRenderer({ canvas: glc, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(DPR); renderer.setSize(W, H, false); renderer.outputColorSpace = THREE.SRGBColorSpace;
  U.uRes.value.set(W * DPR, H * DPR);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.05, 3000); camera.layers.enable(LAYER_OUTLINE); camera.layers.enable(2);
  const post = new Post(renderer, W * DPR, H * DPR), shadow = new Shadow(renderer, 2048);
  const S = { W, H, DPR, fx, g2, glc, renderer, scene, camera, post, shadow, B, U };

  // apply a shot spec {pos, tgt, up?, fov, roll?}
  S.setCamera = (s) => {
    camera.fov = s.fov ?? 50; camera.updateProjectionMatrix();
    camera.position.copy(s.pos); camera.up.copy(s.up || V(0, 1, 0)); camera.lookAt(s.tgt); camera.rotateZ(s.roll || 0); camera.updateMatrixWorld();
    U.uCamPos.value.copy(camera.position); U.uOutlineRef.value = 2.6;
  };
  // radial speed lines on the overlay (k 0..1)
  S.speedLines = (t, k) => {
    if (k < 0.01) return; const w = fx.width, h = fx.height, f = Math.floor(t * 24), cx = w / 2, cy = h * 0.5;
    g2.fillStyle = `rgba(230,236,255,${0.55 * k})`;
    for (let i = 0; i < 80; i++) {
      const a = hsh(i, f) * 6.283, r0 = h * (0.28 + 0.25 * hsh(f, i)), r1 = h * 1.2, wd = 0.003 + 0.007 * hsh(i + 3, f);
      g2.beginPath(); g2.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      g2.lineTo(cx + Math.cos(a - wd) * r1, cy + Math.sin(a - wd) * r1); g2.lineTo(cx + Math.cos(a + wd) * r1, cy + Math.sin(a + wd) * r1); g2.fill();
    }
  };
  // 2-frame inverted ink impact frame at each time in `hits`
  S.impact = (t, hits, fps = 30) => { glc.style.filter = hits.some(t0 => t >= t0 && t < t0 + 2 / fps) ? 'invert(1) contrast(1.5) saturate(0)' : ''; };

  // the frame loop. prep(t) poses everything for time t and returns the shot spec {pos,tgt,...,lines}; overlay(t, s) draws 2D.
  // cuts: shot boundaries (the motion-blur shutter never crosses one).
  S.run = ({ prep, overlay = () => {}, cuts = [0], T_END, cues = null, shadowAt = null }) => {
    const frameFn = (t) => {
      const s = prep(t); S.setCamera(s);
      if (shadowAt) shadowAt(t, s); else shadow.update(scene, V(0, 0.9, 0), U.uKeyDir.value, 6, 30);
      return s;
    };
    window.__frame = (t, sub = 1, shutter = 0.5, fps = 30) => {
      let i = 0; while (i < cuts.length - 1 && t >= cuts[i + 1]) i++;
      const next = cuts[i + 1] ?? Infinity, sh = Math.min(shutter / fps, Math.max(1e-4, next - t - 1e-4));
      U.uBoil.value = Math.floor(t * 12); U.uTime.value = t;
      post.frame(scene, camera, frameFn, t, sh, sub);
      const s = frameFn(t);
      g2.clearRect(0, 0, fx.width, fx.height);
      overlay(t, s);
      return true;
    };
    window.__T_END = T_END;
    if (cues) window.__cues = cues;
    const Q = new URLSearchParams(location.search);
    if (!Q.has('norender')) { window.__frame(Number(Q.get('t') || 0), Number(Q.get('sub') || 1)); window.__done = true; }
  };
  return S;
}
