// wif5 part j: a small warm room, the last one. A window on the back wall (the morning coming), an armchair, a night stand
// with a lamp and a box of keepsakes, pictures, a clock. He stands stooped in the middle holding a framed photo out to us:
// a young mother holding a newborn (him, 116 years ago). Toward the end (WARM) the window light warms and grows.
// Blender metres: x right, y into the scene, z up; camera on the y < 0 side. Light (LIGHT-RECIPE-V3): practicals 8-26.
import { createKit, rng, tex, place, SURF, windowY } from '/styles/stick-man/kit/film.js';
import { holder } from './lib.js';

export const SUN_DIR = [0.35, -0.45, -0.82];
export const SUN_CENTER = [0, 0.6, 1.0], SUN_HALF = 4;
export const STAND = [0.0, 0.62];
export const MARKS = { stand: [STAND[0], STAND[1], 0] };
export const PLACES = { window: [-0.7, 1.9, 1.5] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-1.9, -4], [1.9, 0.5]]];
export const WARM = [2700, 2790];          // the window light warms from the first frame to the second
const PROPS = ['care-home/armchair', 'care-home/night-stand', 'care-home/wall-clock', 'care-home/fancy-picture-frame', 'care-home/rug-round'];
const by = 'ep-whatif1-v5-director', why = 'V5 stills, measure not built';
export const ROOM = place('care-home', { light: 'room-dawn', props: PROPS, waivers: PROPS.map(p => ({ pair: `light|${p}|room-dawn`, why, by })) });
export const COLLIDE = ROOM.COLLIDE;
const ENV_K = 0.4;

// the photo: a faded colour print of a young mother (long hair, a yellow dress) smiling down at a newborn wrapped in blue,
// drawn in the film's own style (a round head, a calm face), a window behind her, a white border
function print(c, w, h) {
  c.fillStyle = '#e9dcc0'; c.fillRect(0, 0, w, h);                                   // the border (cream, not white)
  const b = w * 0.06, iw = w - 2 * b, ih = h - 2 * b, X = u => b + u * iw, Y = v => b + v * ih, S = s => s * iw;
  const g = c.createLinearGradient(0, b, 0, b + ih); g.addColorStop(0, '#c8a27a'); g.addColorStop(1, '#a77f5f'); c.fillStyle = g; c.fillRect(b, b, iw, ih);
  c.fillStyle = '#e6c98e'; c.fillRect(X(0.62), Y(0.08), S(0.3), S(0.36)); c.strokeStyle = '#7a5a40'; c.lineWidth = S(0.018); c.strokeRect(X(0.62), Y(0.08), S(0.3), S(0.36));
  c.beginPath(); c.moveTo(X(0.77), Y(0.08)); c.lineTo(X(0.77), Y(0.08) + S(0.36)); c.stroke();
  // her hair, her dress
  c.fillStyle = '#5a3524'; c.beginPath(); c.ellipse(X(0.42), Y(0.33), S(0.21), S(0.25), 0, 0, 7); c.fill();
  c.fillStyle = '#e2b54a'; c.beginPath(); c.moveTo(X(0.22), Y(1)); c.quadraticCurveTo(X(0.24), Y(0.56), X(0.42), Y(0.54)); c.quadraticCurveTo(X(0.62), Y(0.56), X(0.66), Y(1)); c.fill();
  // her head (the film's round head, a thick ink ring) and a calm smiling face looking down at him
  c.fillStyle = '#ece6dc'; c.strokeStyle = '#1e1714'; c.lineWidth = S(0.016);
  c.beginPath(); c.arc(X(0.42), Y(0.32), S(0.15), 0, 7); c.fill(); c.stroke();
  c.lineCap = 'round'; c.lineWidth = S(0.014);
  for (const dx of [-0.055, 0.045]) { c.beginPath(); c.arc(X(0.42 + dx), Y(0.33), S(0.03), 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
  c.beginPath(); c.arc(X(0.415), Y(0.37), S(0.05), 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
  c.fillStyle = 'rgba(226,120,110,0.4)'; for (const dx of [-0.09, 0.08]) { c.beginPath(); c.ellipse(X(0.42 + dx), Y(0.38), S(0.025), S(0.015), 0, 0, 7); c.fill(); }
  // her arms round the baby, the baby wrapped in blue, his tiny sleeping face
  c.fillStyle = '#7ea7cf'; c.beginPath(); c.ellipse(X(0.47), Y(0.68), S(0.2), S(0.1), -0.2, 0, 7); c.fill();
  c.fillStyle = '#6f93b8'; c.beginPath(); c.ellipse(X(0.6), Y(0.64), S(0.085), S(0.075), 0, 0, 7); c.fill();
  c.fillStyle = '#e8cbb0'; c.beginPath(); c.arc(X(0.6), Y(0.64), S(0.055), 0, 7); c.fill();
  c.strokeStyle = '#2a1a14'; c.lineWidth = S(0.008); for (const dx of [-0.02, 0.02]) { c.beginPath(); c.arc(X(0.6 + dx), Y(0.635), S(0.012), 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
  c.strokeStyle = '#1e1714'; c.lineWidth = S(0.016); c.beginPath(); c.moveTo(X(0.3), Y(0.6)); c.quadraticCurveTo(X(0.36), Y(0.78), X(0.62), Y(0.73)); c.stroke();
  c.beginPath(); c.moveTo(X(0.55), Y(0.58)); c.quadraticCurveTo(X(0.5), Y(0.66), X(0.42), Y(0.66)); c.stroke();
  // the faded corners of an old print
  const v = c.createRadialGradient(X(0.5), Y(0.5), S(0.3), X(0.5), Y(0.5), S(0.8)); v.addColorStop(0, 'rgba(120,80,40,0)'); v.addColorStop(1, 'rgba(120,80,40,0.35)');
  c.fillStyle = v; c.fillRect(b, b, iw, ih);
}

export async function build(stage) {
  const K = createKit(stage, { env: { top: [0.21, 0.18, 0.15], mid: [0.22, 0.18, 0.14], bottom: [0.11, 0.09, 0.07] }, envK: ENV_K });
  const T = K.THREE, r = rng(17), M = (c, rough = 0.8, o = {}) => K.mat(c, rough, { env: ENV_K, ...o });
  const material = () => src => { const m = new T.MeshStandardMaterial({ color: src.color ? src.color.clone() : new T.Color(0.5, 0.5, 0.5), map: src.map || null,
    roughness: 0.75, metalness: 0, envMap: K.ENV, envMapIntensity: ENV_K }); m.userData.noToon = true; return m; };
  const { put } = await ROOM.open(stage, { kit: K, material });
  const H = holder(stage, T);

  // ---- shell: a small room, warm wallpaper, wooden floor, a low ceiling
  const paper = M('#c09a74', 0.9, { map: SURF.plaster('#c09a74', 4) });
  K.box([-2.2, -4.5, -0.2], [2.2, 2.3, 0], M('#ffffff', 0.7, { map: SURF.wood('#9a7350', 6), repeat: [3, 4] }), { r: 0 });
  K.box([-2.2, 1.9, 0], [2.2, 2.2, 2.6], paper, { r: 0 });
  for (const sx of [-1.75, 1.55]) K.box([sx, -4.5, 0], [sx + 0.25, 2.2, 2.6], paper, { r: 0 });
  K.box([-2.2, -4.5, 2.3], [2.2, 2.3, 2.45], M('#6e5f4e', 0.95), { r: 0, cast: false });
  K.box([-1.95, 1.88, 0], [1.95, 1.9, 0.1], M('#6e4f36', 0.7), { r: 0 });
  // the window on the back wall: a dawn sky (self-lit), warming
  const dawn = tex(512, 512, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#6f86b0'); g.addColorStop(0.6, '#e9b48a'); g.addColorStop(1, '#f2c48a'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = '#6e7f6a'; for (let i = 0; i < 7; i++) c.fillRect(w * (0.02 + 0.14 * i), h * (0.78 + 0.06 * Math.sin(i * 1.7)), w * 0.12, h); });
  windowY(K, { cx: -0.75, y: 1.9, z0: 1.0, w: 0.9, h: 1.0, frame: M('#e0d4bc', 0.6), view: dawn, viewK: 0.8 });

  // ---- the kit's room: his armchair by the window, the night stand with the keepsake box and a cup, the clock, pictures
  put('care-home/rug-round', [0, 0.55, 0], 0); put('care-home/armchair', [-1.05, 1.15, 0], -25);
  put('care-home/night-stand', [1.1, 1.45, 0], 0);
  put('care-home/wall-clock', [0.55, 1.88, 1.85], 0); put('care-home/fancy-picture-frame', [0.95, 1.88, 1.4], 0);
  // the night stand's lamp (a warm shade) and its pool
  K.cyl([1.2, 1.55, 0.74], 0.06, 0.24, M('#8a6a4a', 0.5), { seg: 16 }); K.cyl([1.2, 1.55, 0.95], 0.16, 0.18, M('#e2b878', 0.8, { emit: '#c98a3a', emitK: 0.5 }), { r2: 0.1, open: true, seg: 24 });
  K.point([1.15, 1.35, 1.0], '#ffc07a', 12, 2.8);

  // ---- light: the window (cool then warming gold), a soft warm fill on his face and hands, a low bounce on the floor
  const win = K.point([-0.75, 1.5, 1.5], '#c7cde0', 10, 3.6), sun = K.point([-0.6, 1.2, 1.9], '#ffcf8a', 0, 3.4);
  K.point([0.3, -1.0, 1.5], '#ffd8b0', 10, 3.2);
  K.point([0.0, 0.0, 0.3], '#ffbf88', 6, 2.0);

  // ---- the photo in his hands: a dark wooden frame, the print, a stand-back; held at his two hands, the picture to the lens
  const photo = new T.Group(); K.root.add(photo);
  const W = 0.2, Hh = 0.25, fm = M('#5a3a26', 0.45);
  const f1 = new T.Mesh(new T.BoxGeometry(W + 0.03, Hh + 0.03, 0.018), fm); f1.userData.noInk = true; f1.castShadow = true; photo.add(f1);
  const pic = new T.Mesh(new T.PlaneGeometry(W, Hh), K.mat('#ffffff', 0.7, { env: 0.3, map: tex(512, 640, print) })); pic.position.z = 0.0095; pic.userData.noInk = true; photo.add(pic);
  // held in both hands at its two sides: the frame is as wide as his hands are apart (each hand's centre on an edge), level
  // between them, its picture to the lens and tipped back a little
  const V = () => new T.Vector3(), MB = new T.Matrix4();
  K.anim('photo', photo, f => { const a = H.at('j_m', 'L'), b = H.at('j_m', 'R'); if (!a || !b) { photo.visible = false; return; }
    const x = V().subVectors(b, a); const d = x.length(); x.normalize(); const z = V().subVectors(stage.camera.position, a); z.y = 0; z.normalize();
    const y = V().crossVectors(z, x).normalize(); z.crossVectors(x, y); photo.quaternion.setFromRotationMatrix(MB.makeBasis(x, y, z)); photo.rotateX(-0.2);
    photo.scale.setScalar((d - 0.045) / (W + 0.03)); photo.position.copy(a).add(b).multiplyScalar(0.5); photo.position.y += 0.02; photo.position.addScaledVector(z, 0.025); photo.visible = true; });   // gripped at its two edges, 2.5 cm proud of his palms: the forearms stay behind it
  // the window warming (WARM): the cool window light gives way to a low gold sun through it
  const warm = new T.Group(); K.root.add(warm);
  K.anim('warm', warm, f => { const u = Math.min(1, Math.max(0, (f - WARM[0]) / (WARM[1] - WARM[0]))), e = u * u * (3 - 2 * u);
    sun.intensity = 16 * e; win.intensity = 10 * (1 - 0.5 * e); });
  return { props: K.props };
}
