// stick07-robe (forensic fixes 1-10 on stick06-robe; stick06: combined kit: Q1 look, Q2 acting, Q3 shots, Q4 world fx; data from stick05-q3-robe), act 1: the park at noon, lines l01-l03 (frames 0-358). Data only: beats name a word, the runtime does the timing.
// Schema: .claude/skills/make-reel-stick-man/REEL_DATA.md · verbs: VERBS.md · sets, props, cast: SETS.md.
const at = (line, on, offset = -2, nth) => ({ line, on, offset, ...(nth ? { nth } : {}) });

export default {
  title: 'Black robe, white robe',
  fps: 30,
  glasses: false,                 // stick06: no rims, so brows and eye shapes carry the faces
  frames: [0, 358],
  set: 'park',
  grade: { exp: 1.0, tint: [1.03, 1.0, 0.95] },   // stick07: noon, the brightest place
  name: 'park',
  zRange: [1.1, 1.9],
  lines: ['l01', 'l02', 'l03'],
  cast: {
    wren: { spec: 'WREN', at: [-0.62, 0.35, 0], yaw: 20, expr: 'happy', focus: 'camera' },
    bram: { spec: 'BRAM', at: [0.62, 0.35, 0], yaw: -20, expr: 'smug', focus: 'camera' },
  },
  make: {
    // Q4 world fx: heat haze off the hot path, a park thermometer sign, a glint off white, warm wisps off black
    haze: { kind: 'steam', at: [0, -0.7, 0.02], dir: [0, 0, 0.45], size: 0.12, rate: 5, color: [0.99, 0.96, 0.90] },
    haze2: { kind: 'steam', at: [-1.2, -0.9, 0.02], dir: [0.05, 0, 0.4], size: 0.10, rate: 4, color: [0.99, 0.96, 0.90], seed: 5 },
    vs: { kind: 'sign', at: [1.35, 0.9, 0], text: '41°C', sub: 'HOTTEST DAY', style: 'post', w: 0.8, h: 0.42, pole: 1.5, face: true },
    bounce: { kind: 'sparks', at: { head: 'wren', up: -0.42, fwd: 0.16 }, n: 24, speed: 2.4, color: [1.0, 0.96, 0.62], life: 1.2 },
    soak: { kind: 'steam', at: { head: 'bram', up: -0.40, fwd: 0.14 }, dir: [0, 0, 0.45], size: 0.13, rate: 7, color: [1.0, 0.62, 0.30] },
    heat: { kind: 'steam', at: { head: 'bram', up: -0.55, fwd: -0.02 }, dir: [0, 0, 0.6], size: 0.16, rate: 6, color: [0.99, 0.93, 0.86], seed: 9 },
    plus6: { kind: 'sign', at: [1.25, -0.45, 0], text: '+6°C', sub: 'BLACK ROBE', style: 'post', w: 0.62, h: 0.36, pole: 1.25, face: true },   // stick07: a sign in the world, not a sticker
  },
  beats: [
    // frame 0 is mid-walk: both stride out onto the hot path
    { f: -14, who: 'wren', do: 'walk_to', to: [-0.62, -0.2, 0], stride: 0.5, step: 10 },
    { f: -14, who: 'bram', do: 'walk_to', to: [0.62, -0.2, 0], stride: 0.5, step: 10 },
    { f: 0, who: 'haze2', do: 'set', key: 'on', to: 1, dur: 1, from: 0 },
    // l01 The hottest day of the year. Wren wears white, Bram wears black. Who cooks first?
    { ...at('l01', 'hottest'), who: 'haze', do: 'set', key: 'on', to: 1, dur: 12, from: 0, sound: 'sizzle', strength: 0.4 },
    { ...at('l01', 'hottest', -6), who: 'bram', do: 'shade_eyes', expr: 'pain', look: 'sun' },
    { ...at('l01', 'year', -2), who: 'vs', do: 'set', key: 'show', to: 1, dur: 10, from: 0, ease: 'back', sound: 'clunk', strength: 0.5 },
    { ...at('l01', 'year'), who: 'wren', look: 'camera' },
    { ...at('l01', 'wren', 2), who: 'wren', do: 'present', expr: 'proud' },
    { ...at('l01', 'white'), who: 'bram', look: 'wren' },
    { ...at('l01', 'bram', -4), who: 'bram', do: 'hands_on_hips', expr: 'smug', look: 'camera' },
    { ...at('l01', 'black'), who: 'wren', look: 'bram', expr: 'sly' },
    { ...at('l01', 'cooks', -4), who: 'bram', look: 'sun', expr: 'worried', do: 'clutch' },
    { ...at('l01', 'first', -4), who: 'wren', do: 'shrug', expr: 'sly' },
    // l02 Everyone says Bram. White bounces sunlight away; black soaks it up.
    { ...at('l02', 'everyone', -4), who: 'wren', do: 'point_lean', to: [0.62, -0.2, 1.3], hand: 'R', expr: 'grin' },
    { ...at('l02', 'says', -3), who: 'bram', look: 'wren', expr: 'nervous', do: 'lean_away' },
    { ...at('l02', 'white', -3), who: 'bounce', do: 'fire', sound: 'ting', strength: 0.5 },
    { ...at('l02', 'white', -4), who: 'wren', look: 'sun', expr: 'happy', do: 'arms_wide', amp: 0.8 },
    { ...at('l02', 'away'), who: 'haze', do: 'set', key: 'on', to: 0.4, dur: 14 },
    { ...at('l02', 'black', -6), who: 'soak', do: 'set', key: 'on', to: 1, dur: 10, from: 0, sound: 'sizzle', strength: 0.5 },
    { ...at('l02', 'black', -4), who: 'bram', look: 'sun', expr: 'shock', do: 'recoil' },
    { ...at('l02', 'up', -4), who: 'bram', look: 'camera', expr: 'pain', do: 'clutch' },
    // l03 And yes, his robe gets six degrees hotter outside.
    { ...at('l03', 'and'), who: 'soak', do: 'set', key: 'on', to: 0, dur: 8 },
    { ...at('l03', 'and'), who: 'heat', do: 'set', key: 'on', to: 1, dur: 10, from: 0, sound: 'sizzle', strength: 0.4 },
    { ...at('l03', 'yes', -4), who: 'bram', do: 'facepalm', expr: 'sad', amp: 0.7 },
    { ...at('l03', 'six', -6), who: 'plus6', do: 'set', key: 'show', to: 1, dur: 10, from: 0, ease: 'back', sound: 'clunk', strength: 0.7 },
    { ...at('l03', 'degrees', -4), who: 'bram', expr: 'panic', do: 'flail', amp: 0.8 },
    { ...at('l03', 'outside', -4), who: 'bram', expr: 'worried', do: 'wobble' },
  ],
  shots: [],   // planned from the storyboard roles (engine/shotplan.js)
};
