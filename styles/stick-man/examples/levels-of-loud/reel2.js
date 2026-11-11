// stick07-levels (forensic fixes on stick06): acts dissolve, own light per place, no floating text. stick05-q2-levels, l02-l08 (frames 116-852): stick04's acts, new body acting and faces (q2). A hard cut on each "Level".
const at = (line, on, offset = -2, nth) => ({ line, on, offset, ...(nth ? { nth } : {}) });

// ---- Level 1: a whisper in the park
const park = {
  name: 'park', set: 'park', zRange: [1.1, 1.9],
  grade: { exp: 0.9, tint: [0.9, 0.97, 1.08] },   // stick07: quiet morning, cool
  show: [{ from: 116 }],
  cast: {
    wren: { spec: 'WREN', at: [-0.32, -0.2, 0], yaw: 60, expr: 'sly', focus: 'kai' },
    kai: { spec: 'KAI', at: [0.40, -0.2, 0], yaw: -30, expr: 'confused', focus: 'camera' },
  },
  make: {
    lvl: { kind: 'sign', style: 'post', at: [1.55, 0.9, 0], text: 'LEVEL 1', sub: 'A WHISPER', w: 0.8, h: 0.42, pole: 1.4, bg: [0.12, 0.38, 0.22], fg: [1, 1, 0.92], yaw: -8 },
    // a real sound-level meter on a tripod beside Kai
    db: { kind: 'meter', style: 'db', at: [0.98, -0.45, 0], max: 180, unit: 'dB', label: 'SOUND LEVEL', h: 1.05, face: true },
    // the whisper is breath: little puffs drift from Wren's mouth to Kai's ear
    hush: { kind: 'steam', at: { head: 'wren', fwd: 0.14, up: -0.04 }, dir: [0.55, 0, 0.04], size: 0.05, rate: 7 },
  },
  beats: [
    { f: 116, who: 'lvl', do: 'set', key: 'show', from: 0.4, to: 1, dur: 6, ease: 'linear', sound: 'pop', strength: 0.5 },
    { f: 116, who: 'wren', do: 'talk', look: 'kai' },
    { f: 116, who: 'hush', do: 'set', key: 'on', from: 0, to: 1, dur: 6 },
    { ...at('l02', 'whisper'), who: 'screen', do: 'sound', name: 'blip', strength: 0.3 },
    { ...at('l02', 'thirty', -6), who: 'db', do: 'set', key: 'show', from: 0, to: 1, dur: 7, ease: 'linear', sound: 'ding', strength: 0.4 },
    { ...at('l02', 'thirty', -3), who: 'db', do: 'set', key: 'n', from: 0, to: 30, dur: 6, ease: 'linear' },
    { ...at('l02', 'barely'), who: 'hush', do: 'set', key: 'on', to: 1, dur: 2 },
    { ...at('l02', 'tickle', 6), who: 'hush', do: 'set', key: 'on', to: 0, dur: 8 },
    { ...at('l02', 'a', -6, 1), who: 'wren', do: 'lean_in', expr: 'sly', amp: 0.85 },
    { ...at('l02', 'Level', 4), who: 'kai', do: 'cup_ear', hand: 'L', expr: 'confused', look: 'wren' },
    { ...at('l02', 'thirty', -4), who: 'wren', do: 'hands_on_hips', expr: 'smug' },
    { ...at('l02', 'park', 2), who: 'kai', expr: 'blush', look: 'wren', do: 'laugh', amp: 1.3 },
    { ...at('l02', 'decibels', -4), who: 'kai', look: 'camera', expr: 'proud', do: 'present' },
    { ...at('l02', 'tickle', -6), who: 'kai', do: 'shrug', expr: 'closed', look: 'camera' },
  ],
  shots: [],   // stick07: planned (engine/shotplan.js),
};

// ---- Level 2: talking, and every 10 dB is 10x the power
const lab = {
  name: 'lab', set: 'classroom', zRange: [1.0, 1.9],
  grade: { exp: 0.82, gam: 1.05, tint: [1.0, 0.97, 0.9] },   // stick07: classroom lamps
  show: [{ from: 226 }],
  cast: {
    kai: { spec: 'KAI', at: 'left', yaw: 40, expr: 'smug', focus: 'bram' },
    bram: { spec: 'BRAM', at: 'right', yaw: -40, expr: 'deadpan', focus: 'kai' },
  },
  make: {
    lvl: { kind: 'sign', style: 'hang', at: [-1.9, 0.6, 2.35], text: 'LEVEL 2', sub: 'TALKING', w: 0.8, h: 0.42, bg: [0.95, 0.92, 0.86], fg: [0.10, 0.20, 0.45], drop: 1.4 },
    db: { kind: 'meter', style: 'db', at: [1.55, -0.2, 0], max: 180, unit: 'dB', label: 'SOUND LEVEL', h: 1.05, face: true },
    // the chalk chart is written on the real blackboard: 60 dB vs 70 dB, the 70 bar ten times taller
    chart: { kind: 'chalk', at: [-0.95, 3.06, 1.85], w: 2.0, h: 1.25, lines: ['60 dB  vs  70 dB'], bars: [1, 10], labels: ['60 dB = 1', '70 dB = 10'] },
    tenx: { kind: 'chalk', at: [1.15, 3.06, 1.9], w: 1.7, h: 1.0, lines: ['10x', 'POWER!'] },
    chat: { kind: 'steam', at: { head: 'kai', fwd: 0.14, up: -0.04 }, dir: [0.5, 0, 0.05], size: 0.05, rate: 7 },
  },
  beats: [
    { f: 226, who: 'lvl', do: 'set', key: 'show', from: 0.3, to: 1, dur: 7, ease: 'linear', sound: 'pop', strength: 0.5 },
    { f: 226, who: 'lvl', do: 'fire' },
    { ...at('l03', 'talking', -4), who: 'kai', do: 'talk', look: 'bram' },
    { ...at('l03', 'talking'), who: 'chat', do: 'set', key: 'on', from: 0, to: 1, dur: 4, sound: 'blip', strength: 0.3 },
    { ...at('l03', 'every', -3), who: 'chat', do: 'set', key: 'on', to: 0, dur: 6 },
    { ...at('l03', 'sixty', -6), who: 'db', do: 'set', key: 'show', from: 0, to: 1, dur: 7, ease: 'linear', sound: 'ding', strength: 0.4 },
    { ...at('l03', 'sixty', -3), who: 'db', do: 'set', key: 'n', from: 0, to: 60, dur: 6, ease: 'linear' },
    { ...at('l03', 'every', -3), who: 'chart', do: 'set', key: 'draw', to: 1, dur: 14, from: 0.02, ease: 'linear', sound: 'scratch', strength: 0.5 },
    { ...at('l03', 'ten', -2, 2), who: 'chart', do: 'set', key: 'grow', to: 1, dur: 22, from: 0, ease: 'smoother', sound: 'slide_whistle_up', strength: 0.5 },
    { ...at('l03', 'times', -4), who: 'tenx', do: 'set', key: 'draw', from: 0.02, to: 1, dur: 8, ease: 'linear', sound: 'scratch', strength: 0.5 },
    { ...at('l03', 'talking', -4), who: 'kai', do: 'present', expr: 'smug' },
    { ...at('l03', 'talking'), who: 'bram', do: 'arms_crossed', expr: 'deadpan' },
    { ...at('l03', 'sixty', -3), who: 'kai', expr: 'grin' },
    { ...at('l03', 'every', -5), who: 'kai', look: 'chart', expr: 'smug', do: 'point_lean', to: [0, -0.15, 1.0], hand: 'L', amp: 1.3 },
    { ...at('l03', 'every', -3), who: 'bram', look: 'chart', expr: 'confused', do: 'think' },
    { ...at('l03', 'times', -4), who: 'kai', expr: 'shock', do: 'recoil' },
    { ...at('l03', 'times', -2), who: 'bram', expr: 'shock', do: 'lean_away', amp: 1.3 },
    { ...at('l03', 'power', -4), who: 'kai', look: 'camera', expr: 'excited', do: 'arms_wide' },
  ],
  shots: [],   // stick07: planned (engine/shotplan.js),
};

// ---- Level 3: city traffic on the Halden street
const traffic = {
  name: 'traffic', set: 'halden-street', zRange: [1.1, 1.9],
  grade: { exp: 0.84, tint: [1.12, 0.9, 0.76] },   // stick07: rush hour at sunset
  show: [{ from: 353 }],
  cast: {
    kai: { spec: "KAI", at: [-5.6, -9.6, -0.16], yaw: 25, expr: "suspicious", focus: "camera" },
    june: { spec: "JUNE", at: [-4.2, -9.1, -0.16], yaw: -35, expr: 'nervous', focus: 'camera' },
  },
  make: {
    lvl: { kind: 'sign', style: 'post', at: [-3.4, -4.5, 0], text: 'LEVEL 3', sub: 'CITY TRAFFIC', w: 0.9, h: 0.46, pole: 1.6, bg: [0.95, 0.92, 0.86], fg: [0.10, 0.20, 0.45], face: true },
    // the honking car's blast lifts dust and litter off the road; its exhaust smokes
    honk: { kind: 'shock', at: [-6.9, -8.0, -0.12], size: 1.8, n: 14, bits: 12 },
    roar: { kind: 'smoke', at: [-11.4, -8.0, 0.25], size: 0.7, count: 12, color: [0.62, 0.62, 0.66], life: 2.5, rise: 0.3, seed: 8 },
    db: { kind: 'meter', style: 'db', at: [-6.35, -9.25, -0.16], max: 180, unit: 'dB', label: 'SOUND LEVEL', h: 1.05, face: true },
    // steam out of his sore ear
    ear: { kind: 'steam', at: { head: 'kai', side: 0.13, up: 0.02 }, dir: [0.25, 0, 0.55], size: 0.07, rate: 8, color: [0.95, 0.95, 0.97] },
  },
  beats: [
    { f: 353, who: 'lvl', do: 'set', key: 'show', from: 0.3, to: 1, dur: 7, ease: 'linear', sound: 'pop', strength: 0.5 },
    { f: 353, who: 'lvl', do: 'fire' },
    { ...at('l04', 'city'), who: 'roar', do: 'fire', sound: 'whoosh', strength: 0.6 },
    { ...at('l04', 'traffic', -4), who: 'honk', do: 'fire', sound: 'beep', strength: 0.6 },
    { ...at('l04', 'traffic'), who: "kai", do: "startle", expr: "shock", look: "honk", hold: 20 },
    { ...at('l04', 'eighty-five', -6), who: 'db', do: 'set', key: 'show', from: 0, to: 1, dur: 7, ease: 'linear', sound: 'ding', strength: 0.4 },
    { ...at('l04', 'eighty-five', -3), who: 'db', do: 'set', key: 'n', from: 0, to: 85, dur: 6, ease: 'linear' },
    { ...at('l04', 'hours'), who: 'roar', do: 'fire', sound: 'whoosh', strength: 0.5 },
    { ...at('l04', 'that'), who: 'ear', do: 'set', key: 'on', to: 1, dur: 6, from: 0, sound: 'hiss', strength: 0.4 },
    { ...at('l04', 'traffic', -1), who: 'june', expr: 'panic', look: 'honk', do: 'cower', amp: 1.2 },
    { ...at('l04', 'hours', -4), who: 'kai', expr: 'pain', look: 'camera', do: 'brace', amp: 1.2 },
    { ...at('l04', 'hours', -2), who: 'june', expr: 'sad', do: 'facepalm' },
    { ...at('l04', 'damages', -2), who: 'kai', expr: 'dizzy', do: 'wobble' },
  ],
  shots: [],   // stick07: planned (engine/shotplan.js),
};

// ---- Level 4: a rock concert in Halden plaza
const plaza = {
  name: 'plaza', set: 'halden-plaza', zRange: [1.1, 1.9], use: ['concert'],
  grade: { exp: 0.58, gam: 1.12, tint: [0.86, 0.84, 1.18] },   // stick07: the concert at night (dark shot)
  show: [{ from: 465 }],
  cast: {
    mabel: { spec: "MABEL", at: [-1.3, -1.6, 0], yaw: -35, expr: 'excited', focus: 'camera', lead: true },
    otis: { spec: "OTIS", at: [-0.3, -1.3, 0], yaw: -35, expr: 'manic', focus: 'camera' },
    june: { spec: "JUNE", at: [0.5, -2.4, 0], yaw: -35, expr: 'proud', focus: 'camera', lead: true },
    kai: { spec: "KAI", at: [1.4, -2.8, 0], yaw: -30, expr: 'excited', focus: 'camera' },
  },
  make: {
    lvl: { kind: 'sign', style: 'post', at: [2.5, -1.3, 0], text: 'LEVEL 4', sub: 'ROCK CONCERT', w: 0.9, h: 0.46, pole: 1.6, bg: [0.10, 0.08, 0.12], fg: [1.0, 0.80, 0.16], face: true },
    // stage pyro: a fountain of sparks off the stage front
    rock: { kind: 'sparks', at: [-3.6, 9.2, 0.85], n: 26, speed: 4.2, life: 0.9 },
    rock2: { kind: 'sparks', at: [3.6, 9.2, 0.85], n: 22, speed: 4.0, life: 0.9, seed: 5 },
    // the wall of sound: dust and confetti blown off the square from the speaker stack
    waves: { kind: 'shock', at: [-1.4, 0.4, 0.02], size: 3.6, n: 18, bits: 16 },
    db: { kind: 'meter', style: 'db', at: [2.05, -2.25, 0], max: 180, unit: 'dB', label: 'SOUND LEVEL', h: 1.05, face: true },
    // the pain threshold: hot red cracks race over the paving under him
    quake: { kind: 'crack', at: [1.4, -2.7, 0.012], face: 'ground', size: 2.6, branches: 11, color: [1.0, 0.15, 0.08], glowK: 1.4, width: 0.04, seed: 3 },
    ears: { kind: 'steam', at: { head: 'kai', side: 0.13, up: 0.02 }, dir: [0.25, 0, 0.55], size: 0.07, rate: 9 },
  },
  beats: [
    { f: 465, who: 'lvl', do: 'set', key: 'show', from: 0.3, to: 1, dur: 7, ease: 'linear', sound: 'pop', strength: 0.5 },
    { f: 465, who: 'lvl', do: 'fire' },
    { f: 470, who: 'waves', do: 'fire', sound: 'whoosh', strength: 0.5 },
    { ...at('l05', 'rock', -4), who: 'rock', do: 'fire', sound: 'sting', strength: 0.6 },
    { ...at('l05', 'rock', -2), who: 'rock2', do: 'fire' },
    { ...at('l05', 'concert', 4), who: 'rock', do: 'fire' },
    { ...at('l05', 'concert', 6), who: 'rock2', do: 'fire' },
    { ...at('l05', 'rock', -4), who: 'mabel', expr: 'excited' },
    { ...at('l05', 'a', -6, 1), who: 'kai', do: 'jump_joy', expr: 'excited', amp: 0.6 },
    { ...at('l05', 'concert', -4), who: 'june', do: 'jump_joy', expr: 'excited' },
    { ...at('l05', 'rock', -4), who: 'otis', expr: 'manic' },
    { ...at('l05', 'a', -4, 1), who: 'mabel', do: 'tiptoe' },
    { ...at('l05', 'concert', 4), who: 'otis', do: 'flail' },
    { ...at('l05', 'rock', 4), who: 'otis', do: 'gesture', kind: 'fist_pump' },
    { ...at('l05', 'rock', 8), who: 'june', do: 'gesture', kind: 'fist_pump' },
    { ...at('l05', 'concert'), who: 'waves', do: 'fire' },
    { ...at('l05', 'concert', -8), who: 'db', do: 'set', key: 'show', from: 0, to: 1, dur: 7, ease: 'linear', sound: 'ding', strength: 0.4 },
    { ...at('l05', 'concert', -4), who: 'db', do: 'set', key: 'n', from: 0, to: 120, dur: 6, ease: 'linear' },
    { ...at('l05', 'hundred', -6), who: 'kai', expr: 'scream' },
    { ...at('l05', 'twenty', -6), who: 'kai', do: 'cover_ears' },
    { ...at('l05', 'that\'s'), who: 'waves', do: 'fire', sound: 'whoosh', strength: 0.6 },
    { ...at('l05', 'that\'s', 2), who: 'mabel', do: 'celebrate' },
    { ...at('l05', 'that\'s', 6), who: 'otis', do: 'gesture', kind: 'fist_pump' },
    { ...at('l05', 'threshold', -3), who: 'kai', do: 'recoil', expr: 'shock', look: 'camera' },
    { ...at('l05', 'pain', -3), who: 'ears', do: 'set', key: 'on', from: 0, to: 1, dur: 4 },
    { ...at('l05', 'threshold', 2), who: 'quake', do: 'fire', sound: 'thud', strength: 0.6 },
    { ...at('l05', 'pain', -4), who: 'kai', expr: 'cry', do: 'facepalm', amp: 0.55 },
  ],
  shots: [],   // stick07: planned (engine/shotplan.js),
};

// ---- Level 5: Krakatoa, 1883 (prop-only island set)
const island = {
  name: 'island', set: 'island', zRange: [0.8, 9],
  grade: { exp: 0.8, tint: [1.12, 0.86, 0.78] },   // stick07: ash and fire
  show: [{ from: 576 }],
  cast: {},
  make: {
    lvl: { kind: 'sign', style: 'post', at: [-2.6, 0.7, 0.3], text: 'LEVEL 5', w: 1.1, h: 0.5, pole: 1.0, bg: [1.0, 0.80, 0.16], fg: [0.05, 0.05, 0.06], scale: 0.9 },
    year: { kind: 'sign', style: 'post', at: [2.4, 0.8, 0.3], text: 'KRAKATOA', sub: 'AUGUST 1883', w: 1.4, h: 0.6, pole: 1.0, bg: [0.30, 0.16, 0.06], fg: [1.0, 0.90, 0.70], scale: 0.9 },
    // the eruption: a fireball, rocks and lava bombs flung out, a rising ash column, lava sparks
    blast: { kind: 'explosion', at: 'crater', size: 2.6, debris: 22, chunk: [0.25, 0.18, 0.15], ground: 0.1, life: 5 },
    // glowing lava cracks split the cone's face
    lava: { kind: 'crack', at: [0.3, 2.85, 2.1], face: 'wall', size: 2.4, branches: 9, color: [1.0, 0.45, 0.05], glowK: 1.8, width: 0.06, seed: 9, dust: false },
    lava2: { kind: 'crack', at: [-1.6, 3.5, 1.5], face: 'wall', size: 1.6, branches: 6, color: [1.0, 0.35, 0.05], glowK: 1.8, width: 0.06, seed: 14, dust: false, yaw: 25 },
    pow: { kind: 'sparks', at: 'crater', n: 28, speed: 7, color: [1.0, 0.45, 0.08], life: 1.2 },
    blast2: { kind: 'smoke', at: [0, 6, 5.6], size: 3.4, count: 30, column: true, color: [0.50, 0.48, 0.48], life: 6, rise: 0.5, seed: 4 },
    // the bang rolls over the sea: a ring of white foam racing out from the island, a splash where the rocks land
    waves: { kind: 'shock', at: [0, 6, 0.05], size: 11, n: 30, bits: 0, color: [0.95, 0.97, 1.0], life: 2.2 },
    splash: { kind: 'splash', at: [-3.2, -1.2, 0.0], size: 1.0 },
    db: { kind: 'meter', style: 'db', at: [0.45, -0.3, 0.3], max: 180, unit: 'dB', label: 'SOUND LEVEL', h: 1.0, scale: 1.9, yaw: 12 },   // on the beach front
    gulls: { kind: 'flock', at: [0, 4, 7.5], n: 7, span: 34, speed: 2.2, dir: [1, 0.15], size: 0.5 },
    gulls2: { kind: 'flock', at: [2, 10, 10], n: 5, span: 40, speed: 1.6, dir: [-1, 0.1], size: 0.6, seed: 9 },
    // the volcano smokes from the first frame (it is about to blow): a steady grey plume over the crater
    plume: { kind: 'steam', at: 'crater', dir: [0.35, 0, 1.4], size: 0.75, rate: 3, color: [0.62, 0.60, 0.60], seed: 6 },
    far: { kind: 'sign', style: 'post', at: [2.3, 0.1, 0.3], text: '100 MI', sub: 'HEARD IT', w: 0.9, h: 0.5, pole: 1.75, bg: [0.95, 0.92, 0.86], fg: [0.6, 0.08, 0.06], scale: 1.5, yaw: -10 },
  },
  beats: [
    { f: 576, who: 'lvl', do: 'set', key: 'show', from: 0.3, to: 1, dur: 7, ease: 'linear', sound: 'pop', strength: 0.5 },
    { f: 576, who: 'lvl', do: 'fire' },
    { f: 576, who: 'plume', do: 'set', key: 'on', from: 1, to: 1, dur: 0 },
    { ...at('l06', 'eighteen', -6), who: 'year', do: 'set', key: 'show', from: 0, to: 1, dur: 8, ease: 'linear', sound: 'ding', strength: 0.5 },
    { ...at('l06', 'eighteen', 2), who: 'year', do: 'fire' },
    { ...at('l06', 'exploded'), who: 'lvl', do: 'set', key: 'show', to: 0, dur: 2 },
    { ...at('l06', 'exploded', 14), who: 'splash', do: 'fire', sound: 'poof', strength: 0.5 },
    { ...at('l06', 'volcano'), who: 'screen', do: 'sound', name: 'hiss', strength: 0.4 },
    { ...at('l06', 'exploded'), who: 'screen', do: 'flash', frames: 3 },
    { ...at('l06', 'exploded'), who: 'blast', do: 'fire', sound: 'poof', strength: 1.0 },
    { ...at('l06', 'exploded'), who: 'pow', do: 'fire' },
    { ...at('l06', 'volcano', 4), who: 'lava', do: 'fire', sound: 'scratch', strength: 0.4 },
    { ...at('l06', 'volcano', 10), who: 'lava2', do: 'fire' },
    { ...at('l06', 'exploded', 4), who: 'waves', do: 'fire' },
    { ...at('l06', 'exploded', 2), who: 'blast2', do: 'fire' },
    { ...at('l07', 'it'), who: 'pow', do: 'fire', sound: 'poof', strength: 0.7 },
    { ...at('l07', 'hit'), who: 'waves', do: 'fire', sound: 'whoosh', strength: 0.6 },
    { ...at('l07', 'it', -2), who: 'db', do: 'set', key: 'show', from: 0, to: 1, dur: 8, ease: 'linear', sound: 'ding', strength: 0.5 },
    { ...at('l07', 'it', -2), who: 'db', do: 'set', key: 'n', from: 0, to: 170, dur: 8, ease: 'linear' },
    { ...at('l07', 'decibels'), who: 'waves', do: 'fire' },
    { ...at('l07', 'hundred', -8, 2), who: 'far', do: 'set', key: 'show', from: 0, to: 1, dur: 8, ease: 'linear', sound: 'pop', strength: 0.5 },
    { ...at('l07', 'hundred', 0, 2), who: 'far', do: 'fire' },
  ],
  shots: [
    { f: 576, shot: 'est', of: ['volcano'], at: [0, 0, 1.4], from: [0, -1], width: 26, el: 10, lens: 24, dof: 0, push: 0.0012, drift: 0.3 },   // stick07: establishing on the island (wide share)
    { ...at('l07', 'it', -3), shot: 'insert', of: ['volcano'], at: [0, 0, 2.2], from: [0.35, -1], dist: 13, z: 2.2, lens: 24, dof: 0, dissolve: 9, push: 0.004, drift: -0.3 },
  ],
};

// ---- payoff: the police chief 3,000 miles away
const chief = {
  name: 'chief', set: 'street', zRange: [1.1, 1.9], use: ['police'],
  grade: { exp: 0.66, gam: 1.08, tint: [0.84, 0.92, 1.16] },   // stick07: night street, far away
  show: [{ from: 748 }],
  cast: {
    officer: { spec: "OFFICER", at: [0.8, -3.6, 0], yaw: -35, expr: 'smug', focus: 'camera' },
  },
  make: {
    lights: { kind: 'prop', prop: 'police', keys: ['on'], phaseRate: 2.2 },
    miles: { kind: 'sign', style: 'post', at: [1.75, -3.05, 0], text: '3,000 MI', sub: 'FROM KRAKATOA', w: 0.7, h: 0.4, pole: 1.5, bg: [0.08, 0.40, 0.20], fg: [1, 1, 1], face: true },
    // the bang arrives: dust whips round his feet and the bank's window glass bursts out
    waves: { kind: 'shock', at: [0.8, -3.4, 0.02], size: 2.2, n: 16, bits: 14 },
    // the bank's stone cracks beside the door
    wallcrack: { kind: 'crack', at: [1.1, -0.04, 1.9], face: 'wall', size: 0.9, branches: 7, width: 0.03, seed: 12 },
    glass: { kind: 'shatter', at: [0.80, -0.42, 1.05], w: 0.5, h: 1.25, n: 20, ground: -1.05, push: 1.2, show: 0, yaw: 90 },   // the open door leaf's glass
    bubble: { kind: 'sign', style: 'board', at: { head: 'officer', up: -1.45, side: -0.75, fwd: 0.25 }, text: 'CANNON FIRE?', sub: 'POLICE REPORT', w: 0.7, h: 0.32, face: true },   // stick07: a report board in the street, not a speech sticker
  },
  beats: [
    { f: 748, who: 'lights', do: 'set', key: 'on', to: 1, dur: 0 },
    { ...at('l08', 'three', -6), who: 'miles', do: 'set', key: 'show', from: 0, to: 1, dur: 8, ease: 'linear', sound: 'ding', strength: 0.5 },
    { ...at('l08', 'three', 2), who: 'miles', do: 'fire' },
    { ...at('l08', 'away'), who: 'waves', do: 'fire', sound: 'whoosh', strength: 0.5 },
    { f: 748, who: 'officer', do: 'hands_on_hips', expr: 'smug', amp: 1.2 },
    { ...at('l08', 'police', -3), who: 'officer', look: 'camera', expr: 'deadpan' },
    { ...at('l08', 'heard', -3), who: 'officer', do: 'startle', expr: 'shock', look: [-5.5, -1.2, 2.0], hold: 10 },
    { ...at('l08', 'heard'), who: 'waves', do: 'fire' },
    { ...at('l08', 'heard', -2), who: 'glass', do: 'fire', sound: 'pop', strength: 0.6 },
    { ...at('l08', 'heard'), who: 'wallcrack', do: 'fire' },
    { ...at('l08', 'thought', -3), who: 'officer', expr: 'confused', look: 'camera' },
    { ...at('l08', 'cannon', -4), who: 'officer', expr: 'panic', do: 'cower', amp: 1.2 },
    { ...at('l08', 'thought', -6), who: 'bubble', do: 'set', key: 'show', to: 1, dur: 10, from: 0, ease: 'back', sound: 'clunk', strength: 0.5 },
    { ...at('l08', 'cannon'), who: 'officer', do: 'talk', look: 'camera' },
    { ...at('l08', 'fire', 6), who: 'screen', do: 'sound', name: 'sting', strength: 0.8 },
  ],
  shots: [],   // stick07: planned (engine/shotplan.js),
};

export default {
  title: 'Levels of loud, levels 1-5',
  frames: [116, 852],
  lines: ['l02', 'l03', 'l04', 'l05', 'l06', 'l07', 'l08'],
  acts: [park, lab, traffic, plaza, island, chief],
  amend: [],
};
