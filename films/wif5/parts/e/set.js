// wif5 part e: an open-plan office floor at night. One man still at his desk in the front row; behind him four rows of
// empty desks, chairs pushed back and turned away, monitors dark. At PHONES every desk phone lights up at once (a big red
// call lamp and a lit screen each, and a red light over each phone that throws its pool on the desk), and he stands.
// Blender metres: x right, y into the scene, z up; the camera on the y < 0 side. He faces -y (the camera side).
import { createKit, rng, tex, place, SURF } from '/styles/stick-man/kit/film.js';

export const SUN_DIR = [0.3, 0.6, -0.75];
export const SUN_CENTER = [0, 3, 1.0], SUN_HALF = 7;
export const PHONES = 60;                                              // every phone lights at once
export const DESK_H = 0.709;                                           // the kit desk's top
export const MY_H = 0.57;                                              // his own desk (code-built) at the seated clips' hands (dbg z 0.60)
export const UP = 84;                                                  // he stands (reel.js): his chair rolls back from then
export const MARKS = { him: [0, 1.25, 0] };
export const HIS_DESK = [0, 0.72];                                     // the desk in front of him (centre)
const COLS = [-3.2, -1.6, 0, 1.6, 3.2], ROWS = [0.72, 2.6, 4.3, 6.0];
export const PLACES = { desk: [0, 0.72, 0.75], screen: [-0.45, 0.72, 0.95], phones: [0, 4.3, 0.9], phonesL: [-2.4, 3.0, 0.9], camera0: [0, -2, 1.2],
  out: [0.35, -1.2, 1.55], outL: [-0.45, -1.4, 1.45] };   // out: up and out over the desk toward the ringing (his face to the room's front)
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-4, -4], [4, 0.3]]];
const PROPS = ['office/desk', 'office/office-chair', 'office/computer-screen'];
const by = 'ep-whatif1-v5-director', why = 'V5 stills, measure not built';
export const FLOOR = place('office', { light: 'office-night', props: PROPS, waivers: PROPS.map(p => ({ pair: `light|${p}|office-night`, why, by })) });
export const COLLIDE = FLOOR.COLLIDE;
const ENV_K = 0.4;

export async function build(stage) {
  const K = createKit(stage, { env: { top: [0.16, 0.18, 0.22], mid: [0.22, 0.22, 0.26], bottom: [0.12, 0.12, 0.14] }, envK: ENV_K });
  const T = K.THREE, r = rng(5);
  const M = (c, rough = 0.8, o = {}) => K.mat(c, rough, { env: ENV_K, ...o });
  const material = () => src => { const m = new T.MeshStandardMaterial({ color: src.color ? src.color.clone() : new T.Color(0.5, 0.5, 0.5), map: src.map || null,
    roughness: 0.75, metalness: 0, envMap: K.ENV, envMapIntensity: ENV_K }); m.userData.noToon = true; return m; };
  const { put } = await FLOOR.open(stage, { kit: K, material });

  // ---- the floor: blue-grey carpet tiles, a pale wall with a band, a dark ceiling grid, night windows at the back
  const carpet = tex(512, 512, (g, W) => { g.fillStyle = '#4a5260'; g.fillRect(0, 0, W, W); g.strokeStyle = 'rgba(20,24,32,0.35)'; g.lineWidth = 3;
    for (let i = 0; i <= W; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, W); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(W, i); g.stroke(); }
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '90,98,112' : '58,64,76'},0.5)`; g.fillRect(r() * W, r() * W, 2, 2); } });
  carpet.repeat.set(5, 5);
  K.box([-6, -5, -0.2], [6, 9, 0], M([1, 1, 1], 0.95, { map: carpet }), { r: 0, cast: false });
  const wall = M([0.56, 0.58, 0.60], 0.9, { map: SURF.plaster('#8e949c', 3) }), band = M([0.30, 0.36, 0.46], 0.7);
  K.box([-6.2, -5, 0], [-6, 9, 3.0], wall, { r: 0 }); K.box([6, -5, 0], [6.2, 9, 3.0], wall, { r: 0 });
  K.box([-6, -5, 2.9], [6, 9, 3.0], M([0.40, 0.41, 0.46], 0.95), { r: 0, cast: false });
  for (let y = -4; y < 9; y += 1.2) K.box([-6, y, 2.86], [6, y + 0.03, 2.9], M([0.32, 0.33, 0.36], 0.8), { r: 0, cast: false });
  // the back wall: a run of tall windows onto a city at night (a self-lit painted strip), mullions between
  K.box([-6, 8.0, 0], [6, 8.2, 0.9], wall, { r: 0 }); K.box([-6, 8.0, 2.5], [6, 8.2, 2.9], wall, { r: 0 });
  K.box([-6, 7.96, 0.86], [6, 8.0, 0.92], band, { r: 0.004 });
  const city = tex(2048, 512, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1a2140'); gr.addColorStop(1, '#3a3a5c'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { const x = r() * W, w = 40 + r() * 90, h = 120 + r() * 300; g.fillStyle = r() < 0.5 ? '#252a44' : '#2c3150'; g.fillRect(x, H - h, w, h);
      for (let k = 0; k < 16; k++) { g.fillStyle = r() < 0.7 ? '#e8b25c' : '#9cc0e8'; g.fillRect(x + 6 + r() * (w - 14), H - h + 10 + r() * (h - 20), 6, 8); } } });
  K.card([0, 8.6, 1.7], 12.5, 2.0, city, { emissive: 0.7 });
  for (let x = -6; x <= 6; x += 1.5) K.box([x - 0.04, 7.98, 0.9], [x + 0.04, 8.06, 2.5], band, { r: 0.004 });

  // ---- the desks: the kit desk in rows, chairs pushed back and turned, monitors dark; his own at the front, in use
  const phone = (x, y, rot, h = DESK_H) => {   // a desk phone (code-built): base, handset, a screen and a red call lamp; returns its lit parts
    const g = K.group([x, y, h], rot), dark = M([0.14, 0.15, 0.17], 0.5);
    K.cube([0, 0, 0.03], [0.22, 0.18, 0.06], dark, { parent: g, r: 0.012 });
    K.cube([-0.06, -0.01, 0.075], [0.05, 0.17, 0.035], dark, { parent: g, r: 0.015 });
    const off = M([0.10, 0.12, 0.12], 0.3), on = K.glow([1.0, 0.62, 0.56], 1.3), ledOff = M([0.22, 0.05, 0.05], 0.4), ledOn = K.glow([1.0, 0.14, 0.08], 2.6);
    const scr = K.cube([0.05, -0.02, 0.064], [0.09, 0.06, 0.006], off, { parent: g, r: 0.002 });
    const led = K.sphere([0.07, 0.065, 0.075], 0.024, ledOff, { parent: g });
    const light = K.point([x, y, h + 0.16], '#ff2a18', 0, 1.0);   // its call light: a red pool on its own desk
    return { scr, led, off, on, ledOff, ledOn, light };
  };
  const lit = [];
  for (const y of ROWS) for (const x of COLS) {
    const mine = x === 0 && y === ROWS[0];
    if (!mine) put('office/desk', [x, y, 0], 0);
    put('office/computer-screen', [x + (mine ? -0.45 : 0.25 * (r() - 0.5)), y + (mine ? 0 : 0.12), mine ? MY_H : DESK_H], 180);
    if (!mine) put('office/office-chair', [x + 0.5 * (r() - 0.5), y + 0.75 + 0.25 * r(), 0], [180, 90, 270, 180][Math.floor(r() * 4)]);
    lit.push(mine ? phone(x + 0.48, y + 0.05, 200, MY_H) : phone(x + 0.45, y - 0.05, 180 + 30 * (r() - 0.5)));
  }
  // his desk (code-built, lower than the kit's: the seated clips type at z 0.60): a laminate top, a modesty panel, legs
  const top = M([0.62, 0.50, 0.38], 0.6), leg = M([0.46, 0.44, 0.42], 0.6), [dx, dy] = HIS_DESK;
  K.box([dx - 0.7, dy - 0.33, MY_H - 0.03], [dx + 0.7, dy + 0.33, MY_H], top, { r: 0.01 });
  K.box([dx - 0.66, dy - 0.31, 0.12], [dx + 0.66, dy - 0.28, MY_H - 0.03], leg, { r: 0.004 });
  for (const sx of [-1, 1]) K.box([dx + sx * 0.66 - 0.025, dy - 0.3, 0], [dx + sx * 0.66 + 0.025, dy + 0.3, MY_H - 0.03], leg, { r: 0.006 });
  // his chair (code-built): a low office seat at the clips' seat height (0.38), a gas column, five feet, a mesh back
  const [hx, hy] = MARKS.him, ch = K.group([hx, hy + 0.03, 0], 0), ch0 = ch.position.clone(), black = M([0.12, 0.12, 0.14], 0.5), mesh = M([0.20, 0.22, 0.26], 0.9);
  K.cube([0, 0, 0.35], [0.46, 0.44, 0.06], mesh, { parent: ch, r: 0.02 });
  K.cyl([0, 0, 0.05], 0.025, 0.28, black, { parent: ch });
  for (let i = 0; i < 5; i++) { const a = i * 2 * Math.PI / 5; K.cube([0.13 * Math.cos(a), 0.13 * Math.sin(a), 0.04], [0.26, 0.03, 0.03], black, { parent: ch, rotZ: a * 180 / Math.PI }); }
  K.cube([0, 0.24, 0.66], [0.42, 0.04, 0.5], mesh, { parent: ch, r: 0.03 });
  // his keyboard and a mug, and his monitor's screen alive (a self-lit card, cool blue)
  K.anim('chair', ch, f => { const k = Math.min(1, Math.max(0, (f - UP - 6) / 24)); ch.position.copy(ch0).add(K.B(0.08 * k, 0.45 * k * (2 - k), 0)); ch.rotation.y = 0.35 * k; });
  K.cube([HIS_DESK[0] + 0.02, 0.84, MY_H + 0.012], [0.44, 0.15, 0.024], M([0.18, 0.19, 0.22], 0.5), { r: 0.006 });
  K.cyl([HIS_DESK[0] + 0.38, HIS_DESK[1] + 0.12, MY_H], 0.04, 0.1, M([0.75, 0.30, 0.22], 0.5));
  const glowScr = tex(256, 192, (g, W, H) => { g.fillStyle = '#5a86c8'; g.fillRect(0, 0, W, H); g.fillStyle = '#9cc0ee'; for (let i = 0; i < 9; i++) g.fillRect(16, 18 + i * 18, 60 + (i * 53) % 150, 8); });
  K.card([HIS_DESK[0] - 0.45, HIS_DESK[1] + 0.035, MY_H + 0.2], 0.44, 0.27, glowScr, { rotZ: 180, emissive: 0.9 });

  // ---- light: one strip still on over his desk, his monitor's cool spill; the room otherwise down to the city's blue
  K.point([0, 1.0, 2.25], '#f0e6d0', 7, 3.0);
  K.point([0.3, 0.55, 1.15], '#ffe2b8', 4, 1.8);
  K.point([0.2, -0.7, 0.7], '#a8b4d8', 8, 3.4);
  K.point([-0.4, 1.0, 1.0], '#8ab0f0', 4, 2.0);
  K.point([0, -1.8, 2.2], '#b0b8d8', 5, 5.0);
  K.point([0, 7.0, 2.0], '#7080c0', 10, 7.0);
  K.point([0.3, -0.9, 0.5], '#9aa6cc', 5, 2.6);   // a low cool bounce on the floor and his desk's front from the corridor
  // every phone rings from PHONES: its lamp and screen lit, its red light on its desk (flashing: a short dim every 12 frames)
  K.anim('phones', K.group([0, 0, 0]), f => {
    const on = f >= PHONES, dim = on && (f - PHONES) % 12 >= 10;
    for (const p of lit) { p.scr.material = on ? p.on : p.off; p.led.material = on && !dim ? p.ledOn : p.ledOff; p.light.intensity = !on ? 0 : dim ? 1.2 : 4; }
  });
  return { props: K.props };
}
