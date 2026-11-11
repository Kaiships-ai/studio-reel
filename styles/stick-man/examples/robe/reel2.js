// stick07-robe (forensic fixes on stick06-robe, from stick05-q3-robe), lines l04-l09 (frames 359-940): the lab (the 1980 test), a cutaway of the loose robe, back in the park
// for the chimney breeze and the twist. Data only, like reel.js.
const at = (line, on, offset = -2, nth) => ({ line, on, offset, ...(nth ? { nth } : {}) });

const lab = {
  name: 'lab', set: 'lab', zRange: [1.1, 1.9], zMax: 3.3,
  grade: { exp: 0.74, gam: 1.08, tint: [0.86, 0.94, 1.12] },   // stick07: own light per place - a cool, dim lab
  show: [{ from: 359 }],
  cast: {
    wren: { spec: 'WREN', at: [-0.6, -0.35, 0], yaw: 15, expr: 'calm', focus: 'camera' },
    bram: { spec: 'BRAM', at: [0.6, -0.35, 0], yaw: -15, expr: 'worried', focus: 'camera' },
  },
  make: {
    // Q4 world fx: a hanging 1980 lab sign drops in, real thermometers stand beside each body
    year: { kind: 'sign', at: [0, 0.55, 2.35], text: '1980', sub: 'FIELD TEST', style: 'hang', w: 0.9, h: 0.42 },
    thermoW: { kind: 'thermo', at: { head: 'wren', side: -0.30, up: -0.55, fwd: 0.05 }, scale: 1.5 },
    thermoB: { kind: 'thermo', at: { head: 'bram', side: 0.30, up: -0.55, fwd: 0.05 }, scale: 1.5 },
    same: { kind: 'sign', at: [0, -0.25, 1.75], text: 'SAME', style: 'hang', w: 0.8, h: 0.34 },   // stick07: a hanging lab sign, not a stamp
  },
  beats: [
    { f: 359, who: 'wren', look: 'bram' },
    // l04 But in nineteen eighty, scientists measured the heat reaching the body.
    { ...at('l04', 'but', -4), who: 'bram', do: 'think', expr: 'suspicious' },
    { ...at('l04', 'nineteen', -3), who: 'year', do: 'set', key: 'show', to: 1, dur: 10, from: 0, ease: 'back', sound: 'clunk', strength: 0.6 },
    { ...at('l04', 'nineteen', -4), who: 'wren', look: 'camera', expr: 'proud', do: 'present' },
    { ...at('l04', 'scientists'), who: 'bram', look: 'camera', expr: 'calm' },
    { ...at('l04', 'measured', -3), who: 'thermoW', do: 'set', key: 'show', to: 1, dur: 8, from: 0, ease: 'back', sound: 'blip', strength: 0.5 },
    { ...at('l04', 'measured', -1), who: 'thermoB', do: 'set', key: 'show', to: 1, dur: 8, from: 0, ease: 'back' },
    { ...at('l04', 'measured', -4), who: 'wren', do: 'hands_on_hips', expr: 'deadpan' },
    { ...at('l04', 'heat'), who: 'thermoW', do: 'set', key: 'temp', to: 210, dur: 20, from: 70, ease: 'smooth', sound: 'slide_whistle_up', strength: 0.4 },
    { ...at('l04', 'heat'), who: 'thermoB', do: 'set', key: 'temp', to: 210, dur: 20, from: 70, ease: 'smooth' },
    { ...at('l04', 'reaching', -4), who: 'bram', expr: 'nervous', do: 'clutch' },
    // l05 Black robe, white robe: exactly the same.
    { ...at('l05', 'black'), who: 'thermoB', do: 'shake', key: 'shake', amp: 1, dur: 12 },
    { ...at('l05', 'black', -4), who: 'bram', look: 'camera', do: 'point_lean', to: [0.95, -0.35, 1.2], hand: 'R', expr: 'confused' },
    { ...at('l05', 'white'), who: 'thermoW', do: 'shake', key: 'shake', amp: 1, dur: 12 },
    { ...at('l05', 'white', -4), who: 'wren', expr: 'confused', look: 'thermoW' },
    { ...at('l05', 'exactly', -2), who: 'wren', expr: 'shock' },
    { ...at('l05', 'exactly', -4), who: 'bram', expr: 'shock', do: 'recoil' },
    { ...at('l05', 'same', -6), who: 'same', do: 'set', key: 'show', to: 1, dur: 10, from: 0, ease: 'back', sound: 'sting', strength: 0.7 },
    { ...at('l05', 'same', 2), who: 'bram', expr: 'grin', look: 'wren', do: 'celebrate', amp: 0.8 },
    { ...at('l05', 'same', 4), who: 'wren', expr: 'worried', look: 'bram', do: 'arms_crossed' },
  ],
  shots: [],
};

const cut = {
  name: 'cutaway', set: 'cutaway', zRange: [0.08, 1.2],
  grade: { exp: 0.55, gam: 1.15, tint: [0.92, 0.9, 1.12] },   // stick07: the dark shot (inside the robe)
  show: [{ from: { line: 'l06', on: 'his', offset: -3 } }],
  cast: {},
  make: {
    // the black robe round the body: a cylinder shell that swings open, the body core with a wide gap round it
    robe: { kind: 'cutbox', at: [0, 0, 0.012], r: 0.12, h: 0.34, th: 0.014, shell: [0.13, 0.13, 0.15], coreR: 0.55 },
    gap: { kind: 'sign', at: [0.2, -0.04, 0.2], text: 'AIR GAP', style: 'plaque', w: 0.15, h: 0.06, yaw: -12 },   // stick07: a printed tag in the cutaway
  },
  beats: [
    { f: 0, who: 'thermo', do: 'move', to: [0.22, 6, 0], dur: 1 },
    { f: 0, who: 'stack', do: 'move', to: [-0.22, 6, 0], dur: 1 },
    { ...at('l06', 'his'), who: 'robe', do: 'set', key: 'open', to: 1, dur: 16, from: 0, ease: 'smoother', sound: 'whoosh', strength: 0.5 },
    { ...at('l06', 'is', -4), who: 'gap', do: 'set', key: 'show', to: 1, dur: 8, from: 0, ease: 'back', sound: 'pop', strength: 0.5 },
  ],
  shots: [
    { ...at('l06', 'his', -3), shot: 'insert', of: ['plate'], from: [0.25, -1], dist: 1.05, z: 0.36, at: [0, 0, 0.18], lens: 32, push: 0.004 },
  ],
};

const park = {
  name: 'park2', set: 'park', zRange: [1.1, 1.9],
  grade: { exp: 0.72, tint: [1.12, 0.9, 0.74] },   // stick07: late sun, warm
  show: [{ from: 562 }, { from: { line: 'l07', on: 'hot', offset: -3 } }],
  cast: {
    wren: { spec: 'WREN', at: 'left', yaw: 20, expr: 'calm', focus: 'bram' },
    bram: { spec: 'BRAM', at: 'right', yaw: -12, expr: 'sly', focus: 'camera' },
  },
  make: {
    // Q4 world fx: heat haze off the black cloth, a column of warm air out of the neck, cool air drifting in at the hem
    heat: { kind: 'steam', at: { head: 'bram', up: -0.55, fwd: -0.02 }, dir: [0, 0, 0.6], size: 0.16, rate: 6, color: [0.99, 0.93, 0.86], seed: 9 },
    rise: { kind: 'smoke', at: { head: 'bram', up: -0.12, fwd: 0.02 }, size: 0.5, count: 14, color: [1.0, 0.72, 0.48], column: true, rise: 0.6, life: 5.9, seed: 4 },
    inL: { kind: 'steam', at: { head: 'bram', up: -1.95, side: -0.42, fwd: 0.18 }, dir: [0.22, 0, 0.35], size: 0.13, rate: 6, color: [0.50, 0.80, 1.0], seed: 3 },
    inR: { kind: 'steam', at: { head: 'bram', up: -1.95, side: 0.42, fwd: 0.18 }, dir: [-0.22, 0, 0.35], size: 0.13, rate: 6, color: [0.50, 0.80, 1.0], seed: 6 },
    thermoC: { kind: 'thermo', at: { head: 'bram', side: 0.52, up: -0.45, fwd: 0.05 }, scale: 1.5 },
    // the payoff in the world: the hot path cracks red under Bram and a dust shock rings out as he slumps
    scorch: { kind: 'crack', at: [0.9, -0.1, 0.012], face: 'ground', size: 1.8, branches: 9, color: [1.0, 0.25, 0.06], glowK: 1.5, width: 0.04, seed: 5 },
    thud: { kind: 'shock', at: [0.9, -0.2, 0.02], size: 2.2, n: 16 },
  },
  beats: [
    // l06 Here's the trick: (close on Bram, sly)
    { ...at('l06', 'here\'s', -4), who: 'bram', expr: 'sly', look: 'camera', do: 'shush' },
    // l07 Hot black cloth heats the air inside, and hot air rises out the neck.
    { ...at('l07', 'hot'), who: 'heat', do: 'set', key: 'on', to: 1, dur: 10, from: 0, sound: 'sizzle', strength: 0.5 },
    { ...at('l07', 'hot', -4), who: 'bram', expr: 'calm', look: 'camera', do: 'present' },
    { ...at('l07', 'inside', -4), who: 'bram', do: 'clutch', expr: 'nervous' },
    { ...at('l07', 'and'), who: 'wren', look: 'bram', expr: 'worried', do: 'lean_in', amp: 0.7 },
    { ...at('l07', 'rises', -4), who: 'rise', do: 'fire', sound: 'whoosh', strength: 0.5 },
    { ...at('l07', 'rises', -4), who: 'bram', look: [0.95, -0.2, 2.9], expr: 'happy', do: 'arms_wide', amp: 0.7 },
    { ...at('l07', 'neck', 6), who: 'bram', look: 'camera' },
    // l08 That pulls cool air in from below: a breeze, under his robe.
    { ...at('l08', 'pulls', -3), who: 'inL', do: 'set', key: 'on', to: 1, dur: 8, from: 0, sound: 'whoosh', strength: 0.4 },
    { ...at('l08', 'pulls', 0), who: 'inR', do: 'set', key: 'on', to: 1, dur: 8, from: 0 },
    { ...at('l08', 'cool'), who: 'heat', do: 'set', key: 'on', to: 0.25, dur: 20 },
    { ...at('l08', 'below', -4), who: 'bram', look: [0.95, -0.5, 0.1], expr: 'calm', do: 'crouch', amp: 0.6 },
    { ...at('l08', 'breeze', -4), who: 'bram', expr: 'blush', look: 'camera', do: 'laugh' },
    { ...at('l08', 'robe', -4), who: 'wren', expr: 'shock', do: 'recoil' },
    // l09 Wear it tight, and the breeze stops. Then Bram cooks.
    { ...at('l09', 'tight', -4), who: 'bram', expr: 'worried', do: 'arms_crossed' },
    { ...at('l09', 'stops', -3), who: 'inL', do: 'set', key: 'on', to: 0, dur: 6 },
    { ...at('l09', 'stops', -3), who: 'inR', do: 'set', key: 'on', to: 0, dur: 6, sound: 'clunk', strength: 0.5 },
    { ...at('l09', 'stops', -4), who: 'bram', expr: 'shock', do: 'recoil' },
    { ...at('l09', 'stops'), who: 'heat', do: 'set', key: 'on', to: 1, dur: 16 },
    { ...at('l09', 'then', -4), who: 'thermoC', do: 'set', key: 'show', to: 1, dur: 8, from: 0, ease: 'back' },
    { ...at('l09', 'then'), who: 'thermoC', do: 'set', key: 'temp', to: 400, dur: 16, from: 90, ease: 'smooth', sound: 'slide_whistle_up', strength: 0.5 },
    { ...at('l09', 'bram'), who: 'thermoC', do: 'shake', key: 'shake', amp: 1, dur: 16 },
    { ...at('l09', 'cooks'), who: 'bram', do: 'slump', dur: 14, expr: 'cry' },
    { ...at('l09', 'cooks', -2), who: 'scorch', do: 'fire', sound: 'sizzle', strength: 0.7 },
    { ...at('l09', 'cooks', 4), who: 'thud', do: 'fire', sound: 'thud', strength: 0.6 },
    { ...at('l09', 'cooks', -4), who: 'wren', do: 'facepalm', expr: 'sad', amp: 0.6 },
  ],
  shots: [],
};

export default {
  title: 'Black robe, white robe, second half',
  frames: [359, 940],
  lines: ['l04', 'l05', 'l06', 'l07', 'l08', 'l09'],
  acts: [lab, cut, park],
  amend: [],
};
