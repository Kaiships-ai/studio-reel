// stick04-levels-of-loud, l02-l08 (frames 116-852): one act per level, a hard cut on each "Level".
const at = (line, on, offset = -2, nth) => ({ line, on, offset, ...(nth ? { nth } : {}) });

// ---- Level 1: a whisper in the park
const park = {
  name: 'park', set: 'park', zRange: [1.1, 1.9],
  show: [{ from: 116, dissolve: 0 }],
  cast: {
    wren: { spec: 'WREN', at: [-0.32, -0.2, 0], yaw: 60, expr: 'sly', focus: 'kai' },
    kai: { spec: 'KAI', at: [0.40, -0.2, 0], yaw: -25, expr: 'neutral', focus: 'camera' },
  },
  make: {
    lvl: { kind: 'stamp', at: [0.05, -0.2, 2.35], text: 'LEVEL 1', h: 0.30, tilt: -6, life: 1.6 },
    db: { kind: 'stamp', at: { head: 'kai', up: 0.30, side: -0.30, fwd: 0.05 }, text: '{n} dB', h: 0.20, tilt: 6, life: 1.8 },
    hush: { kind: 'rings', from: { head: 'wren', fwd: 0.12 }, to: { head: 'kai' }, r0: 0.02, r1: 0.08 },
  },
  beats: [
    { f: 116, who: 'lvl', do: 'fire', sound: 'pop', strength: 0.5 },
    { f: 116, who: 'wren', do: 'talk', look: 'kai' },
    { ...at('l02', 'whisper'), who: 'hush', do: 'fire', sound: 'blip', strength: 0.3 },
    { ...at('l02', 'whisper'), who: 'wren', do: 'gesture', kind: 'tilt', deg: 10, hold: 24 },
    { ...at('l02', 'park'), who: 'hush', do: 'fire' },
    { ...at('l02', 'park'), who: 'kai', expr: 'happy', look: 'wren' },
    { ...at('l02', 'thirty', -3), who: 'db', do: 'fire', sound: 'ding', strength: 0.4 },
    { ...at('l02', 'thirty', -3), who: 'db', do: 'set', key: 'n', from: 0, to: 30, dur: 6, ease: 'linear' },
    { ...at('l02', 'decibels'), who: 'kai', look: 'camera', expr: 'grin' },
    { ...at('l02', 'barely'), who: 'hush', do: 'fire' },
    { ...at('l02', 'tickle', -4), who: 'kai', do: 'gesture', kind: 'shrug', expr: 'happy', look: 'camera' },
  ],
  shots: [
    { f: 116, shot: 'two', of: ['wren', 'kai'], angle: 0, push: 0.0012 },
    { ...at('l02', 'thirty', -4), shot: 'cu', of: ['kai'], angle: 20, head: 0.26, kx: 0.63, dof: 0, push: 0.0010, live: 0.35 },
  ],
};

// ---- Level 2: talking, and every 10 dB is 10x the power
const lab = {
  name: 'lab', set: 'lab', zRange: [1.0, 1.9],
  show: [{ from: 226, dissolve: 0 }],
  cast: {
    kai: { spec: 'KAI', at: 'left', yaw: 35, expr: 'happy', focus: 'bram' },
    bram: { spec: 'BRAM', at: 'right', yaw: -35, expr: 'calm', focus: 'kai' },
  },
  make: {
    lvl: { kind: 'stamp', at: [0, -0.35, 2.35], text: 'LEVEL 2', h: 0.30, tilt: -6, life: 1.0 },
    db: { kind: "stamp", at: [0.55, -0.35, 2.3], text: '{n} dB', h: 0.40, tilt: 5, life: 1.6 },
    tenx: { kind: 'stamp', at: [0.0, -0.3, 1.75], text: '10x POWER', h: 0.30, tilt: -6, life: 1.4 },
    chat: { kind: 'rings', from: { head: 'kai', fwd: 0.12 }, to: { head: 'bram' }, r0: 0.04, r1: 0.14 },
    chart: { kind: "bars", at: [0, -0.15, 0.03], values: [1, 10], labels: ['60 dB', '70 dB'], unit: "x", h: 1.5, w: 0.34, colors: [[0.30, 0.60, 1.0], [1.0, 0.55, 0.15]] },
  },
  beats: [
    { f: 226, who: 'lvl', do: 'fire', sound: 'pop', strength: 0.5 },
    { ...at('l03', 'talking', -4), who: 'kai', do: 'talk', look: 'bram' },
    { ...at('l03', 'talking'), who: 'chat', do: 'fire', sound: 'blip', strength: 0.3 },
    { ...at('l03', 'talking'), who: 'bram', do: 'gesture', kind: 'nod' },
    { ...at('l03', 'sixty', -3), who: 'db', do: 'fire', sound: 'ding', strength: 0.4 },
    { ...at('l03', 'sixty', -3), who: 'db', do: 'set', key: 'n', from: 0, to: 60, dur: 6, ease: 'linear' },
    { ...at('l03', 'decibels'), who: 'chat', do: 'fire' },
    { ...at('l03', 'every', -3), who: 'chart', do: 'set', key: 'show', to: 1, dur: 8, from: 0, ease: 'back', sound: 'whoosh', strength: 0.4 },
    { ...at('l03', 'every', -3), who: 'kai', look: 'chart', expr: 'neutral' },
    { ...at('l03', 'every', -3), who: 'bram', look: 'chart' },
    { ...at('l03', 'ten', -2, 2), who: 'chart', do: 'set', key: 'grow', to: 1, dur: 22, from: 0, ease: 'smoother', sound: 'slide_whistle_up', strength: 0.5 },
    { ...at('l03', 'times', -4), who: 'tenx', do: 'fire', sound: 'sting', strength: 0.5 },
    { ...at('l03', 'times'), who: 'kai', expr: 'shock' },
    { ...at('l03', 'power'), who: 'kai', look: 'camera' },
  ],
  shots: [
    { f: 226, shot: 'two', of: ['kai', 'bram'], angle: 0, push: 0.0012 },
    { ...at('l03', 'every', -5), shot: 'two', of: ['kai', 'bram'], with: ['chart'], angle: -14, size: 0.46, push: 0.0014 },
    { ...at("l03", "power", -10), shot: "cu", of: ["kai"], angle: 20, head: 0.24, kx: 0.5, dof: 0, push: 0.0010, live: 0.35 },
  ],
};

// ---- Level 3: city traffic on the Halden street
const traffic = {
  name: 'traffic', set: 'halden-street', zRange: [1.1, 1.9],
  show: [{ from: 353, dissolve: 0 }],
  cast: {
    kai: { spec: "KAI", at: [-5.6, -9.6, -0.16], yaw: 0, expr: "neutral", focus: "camera" },
    june: { spec: "JUNE", at: [-4.2, -9.1, -0.16], yaw: -15, expr: 'calm', focus: 'camera' },
  },
  make: {
    lvl: { kind: 'stamp', at: [-4.9, -9.4, 2.3], text: "LEVEL 3", h: 0.5, tilt: -6, life: 1.0 },
    honk: { kind: "stamp", at: [-8.4, -8.6, 2.0], text: 'HONK!', h: 0.36, tilt: 8, life: 1.2 },
    roar: { kind: 'rings', from: [-8.0, -8.3, 1.1], to: { head: "kai" }, r0: 0.15, r1: 0.5 },
    db: { kind: 'stamp', at: { head: 'kai', up: 0.32, side: 0.32, fwd: 0.05 }, text: '{n} dB', h: 0.22, tilt: 6, life: 1.6 },
    ear: { kind: 'callout', at: { head: 'kai', side: 0.11 }, r: 0.10, text: 'OUCH', dir: [-2.2, 1.6] },
  },
  beats: [
    { f: 353, who: 'lvl', do: 'fire', sound: 'pop', strength: 0.5 },
    { ...at('l04', 'city'), who: 'roar', do: 'fire', sound: 'whoosh', strength: 0.6 },
    { ...at('l04', 'traffic', -4), who: 'honk', do: 'fire', sound: 'beep', strength: 0.6 },
    { ...at('l04', 'traffic'), who: "kai", do: "startle", expr: "shock", look: "honk", hold: 20 },
    { ...at('l04', 'traffic', 3), who: 'june', expr: 'worried', look: 'honk' },
    { ...at('l04', 'eighty-five', -3), who: 'db', do: 'fire', sound: 'ding', strength: 0.4 },
    { ...at('l04', 'eighty-five', -3), who: 'db', do: 'set', key: 'n', from: 0, to: 85, dur: 6, ease: 'linear' },
    { ...at('l04', 'hours'), who: 'roar', do: 'fire', sound: 'whoosh', strength: 0.5 },
    { ...at('l04', 'hours'), who: 'kai', expr: 'worried', look: 'camera' },
    { ...at('l04', 'that'), who: 'ear', do: 'set', key: 'show', to: 1, dur: 8, from: 0, ease: 'back', sound: 'ting', strength: 0.4 },
    { ...at('l04', 'hearing'), who: 'kai', expr: 'closed', do: 'gesture', kind: 'tilt', deg: -9, hold: 14 },
  ],
  shots: [
    { f: 353, shot: 'wide', lens: 17, h: 1.7, headY: 0.56, size: 0.33, angle: 20, of: ['kai', 'june'], push: 0.0012 },
    { ...at('l04', 'hours', -4), shot: 'ms', of: ['kai'], with: ['ear'], angle: 10, size: 0.42, dof: 0, push: 0.0012 },
  ],
};

// ---- Level 4: a rock concert in Halden plaza
const plaza = {
  name: 'plaza', set: 'halden-plaza', zRange: [1.1, 1.9],
  show: [{ from: 465, dissolve: 0 }],
  cast: {
    mabel: { spec: "MABEL", at: [-1.3, -1.6, 0], yaw: 10, expr: 'happy', focus: 'camera' },
    otis: { spec: "OTIS", at: [-0.3, -1.3, 0], yaw: 0, expr: 'grin', focus: 'camera' },
    june: { spec: "JUNE", at: [0.5, -2.4, 0], yaw: -10, expr: 'happy', focus: 'camera' },
    kai: { spec: "KAI", at: [1.4, -2.8, 0], yaw: -15, expr: 'happy', focus: 'camera' },
  },
  make: {
    lvl: { kind: 'stamp', at: [0, -2.4, 2.75], text: 'LEVEL 4', h: 0.34, tilt: -6, life: 1.0 },
    rock: { kind: "stamp", at: { head: "june", up: 0.42, side: 0.1, fwd: 0.05 }, text: 'ROCK CONCERT!', h: 0.34, tilt: -10, life: 1.4 },
    waves: { kind: "rings", from: [-5, -2.0, 1.8], to: { head: "kai" }, r0: 0.15, r1: 0.5 },
    db: { kind: "stamp", at: [0.9, -2.6, 2.35], text: '{n} dB', h: 0.36, tilt: 6, life: 2.2 },
    pain: { kind: 'stamp', at: { head: 'kai', up: 0.32, side: -0.30, fwd: 0.05 }, text: 'PAIN!', h: 0.26, tilt: -8, color: [0.9, 0.2, 0.15], life: 1.0 },
  },
  beats: [
    { f: 465, who: 'lvl', do: 'fire', sound: 'pop', strength: 0.5 },
    { f: 470, who: 'waves', do: 'fire', sound: 'whoosh', strength: 0.5 },
    { ...at('l05', 'rock', -4), who: 'rock', do: 'fire', sound: 'sting', strength: 0.6 },
    { ...at('l05', 'rock'), who: 'mabel', do: 'gesture', kind: 'fist_pump' },
    { ...at('l05', 'rock', 4), who: 'otis', do: 'gesture', kind: 'fist_pump' },
    { ...at('l05', 'rock', 8), who: 'june', do: 'gesture', kind: 'fist_pump' },
    { ...at('l05', 'concert'), who: 'waves', do: 'fire' },
    { ...at('l05', 'concert', -4), who: 'db', do: 'fire', sound: 'ding', strength: 0.4 },
    { ...at('l05', 'concert', -4), who: 'db', do: 'set', key: 'n', from: 0, to: 120, dur: 6, ease: 'linear' },
    { ...at('l05', 'concert', 8), who: 'kai', expr: 'worried' },
    { ...at('l05', 'that\'s'), who: 'waves', do: 'fire', sound: 'whoosh', strength: 0.6 },
    { ...at('l05', 'that\'s', 2), who: 'mabel', do: 'gesture', kind: 'fist_pump' },
    { ...at('l05', 'that\'s', 6), who: 'otis', do: 'gesture', kind: 'fist_pump' },
    { ...at('l05', 'threshold'), who: 'kai', do: 'startle', expr: 'shock', look: 'camera', hold: 20 },
    { ...at('l05', 'pain', -3), who: 'pain', do: 'fire', sound: 'pop', strength: 0.6 },
    { ...at('l05', 'pain', 4), who: 'kai', expr: 'closed' },
  ],
  shots: [
    { f: 465, shot: "two", of: ["otis", "kai"], angle: 8, push: 0.0014 },
    { ...at("l05", "concert", 6), shot: "ms", of: ["kai"], angle: 14, size: 0.46, push: 0.0012 },
    { ...at('l05', 'that\'s', -4), shot: 'cu', of: ['kai'], angle: -12, head: 0.24, kx: 0.5, dof: 0, push: 0.0010, live: 0.35 },
  ],
};

// ---- Level 5: Krakatoa, 1883 (prop-only island set)
const island = {
  name: 'island', set: 'island', zRange: [0.8, 9],
  show: [{ from: 576, dissolve: 0 }],
  cast: {},
  make: {
    lvl: { kind: 'stamp', at: [-2.6, 0.5, 7.2], text: "LEVEL 5", h: 1.1, tilt: -6, life: 0.9 },
    year: { kind: 'stamp', at: [2.4, 0.5, 7.0], text: '1883', h: 1.2, tilt: 6, life: 2.4 },
    blast: { kind: 'burst', at: 'crater', size: 2.6, count: 24, life: 1.6, smoke: true },
    pow: { kind: 'star', at: 'crater', r: 3.2, back: 1.5, frames: 10 },
    blast2: { kind: 'burst', at: [0, 6, 5.6], size: 3.0, count: 22, life: 1.8, smoke: true, seed: 4 },
    waves: { kind: 'rings', from: 'crater', to: [7, 2, 2.0], r0: 0.8, r1: 2.6 },
    db: { kind: 'stamp', at: [1.6, 0.5, 6.4], text: '{n} dB', h: 0.9, tilt: -4, life: 2.6 },
    far: { kind: 'stamp', at: [1.6, -0.5, 3.4], text: "100 MILES AWAY", h: 0.4, tilt: 6, life: 1.2 },
  },
  beats: [
    { f: 576, who: 'lvl', do: 'fire', sound: 'pop', strength: 0.5 },
    { ...at('l06', 'eighteen', -3), who: 'year', do: 'fire', sound: 'ding', strength: 0.5 },
    { ...at('l06', 'volcano'), who: 'screen', do: 'sound', name: 'hiss', strength: 0.4 },
    { ...at('l06', 'exploded'), who: 'screen', do: 'flash', frames: 3 },
    { ...at('l06', 'exploded'), who: 'blast', do: 'fire', sound: 'poof', strength: 1.0 },
    { ...at('l06', 'exploded'), who: 'pow', do: 'fire' },
    { ...at('l06', 'exploded'), who: 'waves', do: 'fire' },
    { ...at('l07', 'it'), who: 'blast2', do: 'fire', sound: 'poof', strength: 0.7 },
    { ...at('l07', 'hit'), who: 'waves', do: 'fire', sound: 'whoosh', strength: 0.6 },
    { ...at('l07', 'it', -2), who: 'db', do: 'fire', sound: 'ding', strength: 0.5 },
    { ...at('l07', 'it', -2), who: 'db', do: 'set', key: 'n', from: 0, to: 170, dur: 8, ease: 'linear' },
    { ...at('l07', 'decibels'), who: 'waves', do: 'fire' },
    { ...at('l07', 'hundred', -4, 2), who: 'far', do: 'fire', sound: 'pop', strength: 0.5 },
  ],
  shots: [
    { f: 576, shot: 'insert', of: ['volcano'], at: [0, 0, 1.4], from: [0, -1], dist: 15, z: 2.6, lens: 24, dof: 0, push: 0.004, drift: 0.3 },
    { ...at('l07', 'it', -3), shot: 'insert', of: ['volcano'], at: [0, 0, 2.2], from: [0.35, -1], dist: 13, z: 2.2, lens: 24, dof: 0, cut: true, push: 0.004, drift: -0.3 },
  ],
};

// ---- payoff: the police chief 3,000 miles away
const chief = {
  name: 'chief', set: 'street', zRange: [1.1, 1.9], use: ['police'],
  show: [{ from: 748, dissolve: 0 }],
  cast: {
    officer: { spec: "OFFICER", at: [0.8, -3.6, 0], yaw: -20, expr: 'calm', focus: 'camera' },
  },
  make: {
    lights: { kind: 'prop', prop: 'police', keys: ['on'], phaseRate: 2.2 },
    miles: { kind: 'stamp', at: { head: 'officer', up: 0.38, side: 0, fwd: 0.05 }, text: '3,000 MILES AWAY', h: 0.15, tilt: -6, life: 3.4 },
    waves: { kind: 'rings', from: [-5.5, -1.2, 2.4], to: { head: 'officer' }, r0: 0.2, r1: 0.6 },
    bubble: { kind: 'stamp', at: { head: 'officer', up: 0.16, side: -0.24, fwd: 0.05 }, text: 'CANNON FIRE?!', h: 0.14, tilt: -4, tail: 'right', life: 1.2 },
  },
  beats: [
    { f: 748, who: 'lights', do: 'set', key: 'on', to: 1, dur: 0 },
    { ...at('l08', 'three', -3), who: 'miles', do: 'fire', sound: 'ding', strength: 0.5 },
    { ...at('l08', 'away'), who: 'waves', do: 'fire', sound: 'whoosh', strength: 0.5 },
    { ...at('l08', 'police'), who: 'officer', look: 'camera', expr: 'neutral' },
    { ...at('l08', 'heard', -3), who: 'officer', do: 'startle', expr: 'shock', look: [-5.5, -1.2, 2.0], hold: 20 },
    { ...at('l08', 'heard'), who: 'waves', do: 'fire' },
    { ...at('l08', 'thought'), who: 'officer', expr: 'worried', look: 'camera' },
    { ...at('l08', 'thought', -2), who: 'bubble', do: 'fire', sound: 'pop', strength: 0.5 },
    { ...at('l08', 'cannon'), who: 'officer', do: 'talk', look: 'camera' },
    { ...at('l08', 'fire', 6), who: 'screen', do: 'sound', name: 'sting', strength: 0.8 },
  ],
  shots: [
    { f: 748, shot: 'ms', of: ['officer'], with: ["police"], angle: 40, size: 0.5, push: 0.0012 },
    { ...at("l08", "away", -4), shot: "cu", of: ["officer"], angle: 0, head: 0.24, kx: 0.5, dof: 0, push: 0.0010, live: 0.35 },
  ],
};

export default {
  title: 'Levels of loud, levels 1-5',
  frames: [116, 852],
  lines: ['l02', 'l03', 'l04', 'l05', 'l06', 'l07', 'l08'],
  acts: [park, lab, traffic, plaza, island, chief],
  amend: [],
};
