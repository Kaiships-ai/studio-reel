// wif5 part d: a stone embankment by dark water at dusk. The son walks the lit paper lantern down the bank; the father
// takes it at the water's edge; they let it go and it rises over the water into a sky of others. A dusk dome (indigo to
// peach), still water that carries the sky's colour, a far shore of lit windows, one street lamp's pool on the bank.
// Blender metres: x right, y into the scene (the water from y 1.8 on), z up; the camera on the y < 0 side.
import { createKit, rng, tex, place } from '/styles/stick-man/kit/film.js';
import { lantern } from './props.js';

export const SUN_DIR = [0.2, 0.9, -0.25];
export const SUN_CENTER = [0, 1, 1.0], SUN_HALF = 6;
export const EDGE = 1.8;                                               // the water's edge (the embankment's lip)
export const RELEASE = 146;                                            // the father lets go (the set lantern takes over)
export const MARKS = { dad: [0.3, 1.2, 0], son0: [-0.9, 1.45, 0], son1: [-0.065, 0.69, 0] };   // the son comes in along the path to his father's left
export const ONTO = [0.135, 0.79, 0.9];                               // the son's left fist on its paper, low on his side (dbg: lantern at the fists' middle)
export const LIFT0 = [0.247, 0.875, 0.86];                             // where it leaves his hands (dbg f62: the fists' middle)
export const PLACES = { lantern: [0.247, 0.875, 1.05], sky: [0.5, 14, 7], water: [0.3, 4, 0], son: [-0.5, 0.9, 1.0], camera0: [0.6, -2, 1.2] };
export const CAMERA_SIDE = [0, -1];
export const CAMERA_ROOM = [[[-4, -4], [4, 1.7]]];
const PROPS = [];
const by = 'ep-whatif1-v5-director', why = 'V5 stills, measure not built';
export const BANK = place('street', { light: 'lake-dusk', props: PROPS, waivers: PROPS.map(p => ({ pair: `light|${p}|lake-dusk`, why, by })) });
export const COLLIDE = BANK.COLLIDE;
const ENV_K = 0.4;

// where the released lantern is at film-part frame f: up first, clear of his face (drifting away from him), then
// speeding up and out over the water
export function liftAt(f) { const t = Math.max(0, (f - RELEASE) / 30); return [LIFT0[0] - 0.15 * t, LIFT0[1] - 0.2 * t + 0.4 * t * t, LIFT0[2] + 1.1 * t + 0.3 * t * t]; }

export async function build(stage) {
  const K = createKit(stage, { env: { top: [0.22, 0.20, 0.36], mid: [0.52, 0.36, 0.38], bottom: [0.14, 0.12, 0.16] }, envK: ENV_K });
  const T = K.THREE, r = rng(9);
  const M = (c, rough = 0.8, o = {}) => K.mat(c, rough, { env: ENV_K, ...o });
  const material = () => src => { const m = new T.MeshStandardMaterial({ color: src.color ? src.color.clone() : new T.Color(0.5, 0.5, 0.5), map: src.map || null,
    roughness: 0.75, metalness: 0, envMap: K.ENV, envMapIntensity: ENV_K }); m.userData.noToon = true; return m; };
  await BANK.open(stage, { kit: K, material });

  // ---- the dusk: indigo overhead, mauve, a peach band low over the far shore
  K.skyDome({ zenith: '#262a58', mid: '#7a5688', horizon: '#eea072', clouds: 0, r: 58 });

  // ---- the bank: worn grass going down to a paved path and a stone lip; the water below it
  const grass = tex(512, 512, (g, W) => { g.fillStyle = '#56633f'; g.fillRect(0, 0, W, W); for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${70 + r() * 50},${84 + r() * 50},${44 + r() * 30},0.55)`; g.fillRect(r() * W, r() * W, 2, 6); } });
  grass.repeat.set(6, 6);
  K.box([-30, -12, -0.2], [30, 0.6, 0], M([1, 1, 1], 0.95, { map: grass }), { r: 0, cast: false });
  const pave = tex(512, 512, (g, W) => { g.fillStyle = '#8a7a6c'; g.fillRect(0, 0, W, W); g.strokeStyle = 'rgba(40,30,30,0.55)'; g.lineWidth = 3;
    for (let y = 0; y < W; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let x = (y / 64) % 2 ? 32 : 0; x < W; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 64); g.stroke(); } } });
  pave.repeat.set(20, 2);
  K.box([-30, 0.6, -0.2], [30, EDGE - 0.25, 0], M([1, 1, 1], 0.85, { map: pave }), { r: 0, cast: false });
  const stone = M([0.52, 0.46, 0.42], 0.8);
  K.box([-30, EDGE - 0.25, -0.2], [30, EDGE, 0.08], stone, { r: 0.02 });               // the lip, a low kerb
  K.box([-30, EDGE, -0.9], [30, EDGE + 0.1, -0.2], M([0.30, 0.28, 0.30], 0.9), { r: 0 });   // the wall down to the water

  // ---- the water: still and deep, carrying the sky (peach far, violet near), a few long ripples of light
  const wtex = tex(256, 1024, (g, W, H) => { const gr = g.createLinearGradient(0, H, 0, 0); gr.addColorStop(0, '#1c2440'); gr.addColorStop(0.55, '#3a3460'); gr.addColorStop(0.85, '#8a5a70'); gr.addColorStop(1, '#d08a66');
    g.fillStyle = gr; g.fillRect(0, 0, W, H); for (let i = 0; i < 160; i++) { const y = r() * H; g.fillStyle = `rgba(240,170,120,${0.05 + 0.12 * (1 - y / H)})`; g.fillRect(r() * W, H - y, 20 + r() * 60, 2); } });
  const water = new T.MeshStandardMaterial({ color: new T.Color(0.10, 0.10, 0.16), emissive: new T.Color(1, 1, 1), emissiveMap: wtex, emissiveIntensity: 0.55, roughness: 0.12, metalness: 0.4, envMap: K.ENV, envMapIntensity: 0.8 });
  water.userData.noToon = true;
  const wm = new T.Mesh(new T.PlaneGeometry(90, 56), water); wm.rotation.x = -Math.PI / 2; wm.position.copy(K.B(0, EDGE + 28, -0.35)); wm.receiveShadow = true; wm.userData.noInk = true; K.root.add(wm);

  // ---- the far shore: low hills and a town line, lit windows (a self-lit painted strip)
  const shore = tex(2048, 256, (g, W, H) => { g.fillStyle = '#1e1a30'; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 32) g.lineTo(x, H * (0.35 + 0.25 * Math.sin(x / 210) + 0.1 * r())); g.lineTo(W, H); g.fill();
    for (let i = 0; i < 70; i++) { const x = r() * W, w = 18 + r() * 40, h = 30 + r() * 70; g.fillStyle = '#241e34'; g.fillRect(x, H - h, w, h); for (let k = 0; k < 4; k++) { g.fillStyle = r() < 0.6 ? '#f0b060' : '#d68a4a'; g.fillRect(x + 4 + r() * (w - 10), H - h + 6 + r() * (h - 14), 4, 5); } } });
  K.card([0, 44, 2.0], 110, 10, shore, { emissive: 0.6, transparent: true });

  // ---- the bank's light: a street lamp's pool from off shot
  K.point([-2.6, -0.6, 3.4], '#ffc888', 22, 6.5);   // a lamp off to the left, out of shot: its pool on the path

  // ---- the lantern that rises: hidden until they let go, then up and out over the water, its light with it
  const up = K.group([0, 0, 0]); const L = lantern(); up.add(L); up.visible = false;
  K.anim('rise', up, f => { up.visible = f >= RELEASE;
    stage.scene.traverse(o => { if (o.name === 'wif5_lantern2_held') o.visible = f < RELEASE; }); if (!up.visible) return; const p = liftAt(f); up.position.copy(K.B(...p)); L.rotation.y = 0.15 * (f - RELEASE) / 30; });

  // ---- the sky of lanterns: others already up over the water, drifting higher (seen once theirs goes)
  const sky = K.group([0, 0, 0]); sky.visible = false;
  for (let i = 0; i < 110; i++) {
    const y = 5 + Math.pow(r(), 0.7) * 34, x = (r() - 0.5) * (8 + y * 1.1), z = 2.2 + r() * (3 + y * 0.42);
    const s = 1.0 + r() * 0.6, l = lantern({ light: false, scale: s }); l.position.copy(K.B(x, y, z)); l.rotation.y = r() * 6; l.userData.z0 = z; l.userData.sp = 0.12 + r() * 0.2; sky.add(l);
  }
  K.anim('sky', sky, f => { sky.visible = f >= RELEASE; for (const l of sky.children) l.position.y = l.userData.z0 + l.userData.sp * f / 30; });
  const glow = [[-3, 10, 6], [3, 16, 9], [0, 26, 13]].map(p => K.point(p, '#ffa860', 14, 12));   // the sky's glow on the water
  K.anim('skyglow', K.group([0, 0, 0]), f => { for (const l of glow) l.intensity = f >= RELEASE ? 14 : 0; });
  // fill: the dusk sky on the bank (soft, cool-violet) and a warm low bounce from the water side
  K.point([0.5, -2.2, 2.4], '#b8b0e0', 6, 5);
  K.point([0.5, 3.2, 0.6], '#ff9a66', 6, 3.6);
  return { props: K.props };
}
