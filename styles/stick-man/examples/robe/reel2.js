// stick03-robe, lines l04-l09 (frames 359-940): the lab (the 1980 test), a cutaway of the loose robe, back in the park
// for the chimney breeze and the twist. Data only, like reel.js.
const at = (line, on, offset = -2, nth) => ({ line, on, offset, ...(nth ? { nth } : {}) });

const lab = {
  name: 'lab', set: 'lab', zRange: [1.1, 1.9],
  show: [{ from: 359, dissolve: 0 }],
  cast: {
    wren: { spec: 'WREN', at: [-0.6, -0.35, 0], yaw: 15, expr: 'calm', focus: 'camera' },
    bram: { spec: 'BRAM', at: [0.6, -0.35, 0], yaw: -15, expr: 'worried', focus: 'camera' },
  },
  make: {
    year: { kind: 'stamp', at: [0, -0.2, 2.15], text: '1980', h: 0.42, life: 3.2 },
    hW: { kind: 'flow', at: { head: 'wren', up: -0.5, fwd: 0.2 }, medium: 'heat', path: [[-0.45, 0, 0.75], [-0.32, 0, 0.45], [-0.14, 0, 0.18], [0, 0, 0]], r: 0.045, grow: 0.5 },
    hB: { kind: 'flow', at: { head: 'bram', up: -0.5, fwd: 0.2 }, medium: 'heat', path: [[0.45, 0, 0.75], [0.32, 0, 0.45], [0.14, 0, 0.18], [0, 0, 0]], r: 0.045, grow: 0.5 },
    bodyheat: { kind: 'callout', at: { head: 'bram', up: -0.5 }, r: 0.17, text: 'HEAT IN', dir: [-1.6, -1.0], h: 0.11 },
    thermoW: { kind: 'thermo', at: { head: 'wren', side: -0.30, up: -0.55, fwd: 0.05 }, scale: 1.5 },
    thermoB: { kind: 'thermo', at: { head: 'bram', side: 0.30, up: -0.55, fwd: 0.05 }, scale: 1.5 },
    same: { kind: 'stamp', at: [0, -0.4, 1.05], text: 'SAME', h: 0.55 },
  },
  beats: [
    { f: 359, who: 'wren', look: 'bram' },
    // l04 But in nineteen eighty, scientists measured the heat reaching the body.
    { ...at('l04', 'but'), who: 'bram', do: 'gesture', kind: 'tilt', deg: 8, hold: 14 },
    { ...at('l04', 'nineteen', -3), who: 'year', do: 'fire', sound: 'clunk', strength: 0.6 },
    { ...at('l04', 'nineteen'), who: 'wren', look: 'camera', expr: 'happy' },
    { ...at('l04', 'scientists'), who: 'bram', look: 'camera', expr: 'calm' },
    { ...at('l04', 'measured', -3), who: 'thermoW', do: 'set', key: 'show', to: 1, dur: 8, from: 0, ease: 'back', sound: 'blip', strength: 0.5 },
    { ...at('l04', 'measured', -1), who: 'thermoB', do: 'set', key: 'show', to: 1, dur: 8, from: 0, ease: 'back' },
    { ...at('l04', 'heat'), who: 'thermoW', do: 'set', key: 'temp', to: 210, dur: 20, from: 70, ease: 'smooth', sound: 'slide_whistle_up', strength: 0.4 },
    { ...at('l04', 'heat'), who: 'thermoB', do: 'set', key: 'temp', to: 210, dur: 20, from: 70, ease: 'smooth' },
    { ...at('l04', 'heat'), who: 'wren', do: 'gesture', kind: 'nod' },
    { ...at('l04', 'heat', -4), who: 'hW', do: 'fire', sound: 'whoosh', strength: 0.4 },
    { ...at('l04', 'heat', -2), who: 'hB', do: 'fire' },
    { ...at('l04', 'reaching', -2), who: 'bodyheat', do: 'set', key: 'show', to: 1, dur: 8, from: 0, ease: 'back', sound: 'pop', strength: 0.4 },
    { ...at('l05', 'black', -2), who: 'bodyheat', do: 'set', key: 'show', to: 0, dur: 6 },
    { ...at('l04', 'reaching'), who: 'bram', expr: 'worried' },
    { ...at('l04', 'body'), who: 'bram', do: 'gesture', kind: 'nod' },
    // l05 Black robe, white robe: exactly the same.
    { ...at('l05', 'black'), who: 'thermoB', do: 'shake', key: 'shake', amp: 1, dur: 12 },
    { ...at('l05', 'black'), who: 'bram', look: 'camera', do: 'gesture', kind: 'shrug' },
    { ...at('l05', 'white'), who: 'thermoW', do: 'shake', key: 'shake', amp: 1, dur: 12 },
    { ...at('l05', 'white'), who: 'wren', do: 'gesture', kind: 'tilt', deg: -8, hold: 14 },
    { ...at('l05', 'exactly'), who: 'wren', expr: 'shock' },
    { ...at('l05', 'exactly'), who: 'bram', expr: 'shock' },
    { ...at('l05', 'same', -3), who: 'same', do: 'fire', sound: 'sting', strength: 0.7 },
    { ...at('l05', 'same', 4), who: 'bram', expr: 'grin', look: 'wren' },
    { ...at('l05', 'same', 6), who: 'wren', expr: 'worried', look: 'bram' },
  ],
  shots: [
    { f: 359, shot: 'wide', of: ['wren', 'bram'], with: ['thermoW', 'thermoB'], angle: -6, size: 0.42, cut: true },
    { ...at('l05', 'black', -4), shot: 'two', of: ['wren', 'bram'], with: ['thermoW', 'thermoB'], angle: 10, size: 0.5, cut: true, push: 0.0010 },
  ],
};

const cut = {
  name: 'cutaway', set: 'cutaway', zRange: [0.08, 1.2],
  show: [{ from: { line: 'l06', on: 'his', offset: -3 }, dissolve: 0 }],
  cast: {},
  make: {
    // the black robe round the body: a cylinder shell that swings open, the body core with a wide gap round it
    robe: { kind: 'cutbox', at: [0, 0, 0.012], r: 0.12, h: 0.34, th: 0.014, shell: [0.13, 0.13, 0.15], coreR: 0.55 },
    gap: { kind: 'callout', at: [0.088, -0.06, 0.20], r: 0.035, text: 'AIR GAP', dir: [0.9, 2.3], h: 0.035 },
    loose: { kind: 'stamp', at: [0, -0.06, 0.44], text: 'LOOSE', h: 0.08 },
  },
  beats: [
    { f: 0, who: 'thermo', do: 'move', to: [0.22, 6, 0], dur: 1 },
    { f: 0, who: 'stack', do: 'move', to: [-0.22, 6, 0], dur: 1 },
    { ...at('l06', 'his'), who: 'robe', do: 'set', key: 'open', to: 1, dur: 16, from: 0, ease: 'smoother', sound: 'whoosh', strength: 0.5 },
    { ...at('l06', 'is', -4), who: 'gap', do: 'set', key: 'show', to: 1, dur: 8, from: 0, ease: 'back', sound: 'pop', strength: 0.5 },
    { ...at('l06', 'loose', -2), who: 'loose', do: 'fire', sound: 'clunk', strength: 0.6 },
  ],
  shots: [
    { ...at('l06', 'his', -3), shot: 'insert', of: ['plate'], from: [0.25, -1], dist: 1.05, z: 0.36, at: [0, 0, 0.18], lens: 32, push: 0.004, cut: true },
  ],
};

const park = {
  name: 'park2', set: 'park', zRange: [1.1, 1.9],
  show: [{ from: 562, dissolve: 0 }, { from: { line: 'l07', on: 'hot', offset: -3 }, dissolve: 0 }],
  cast: {
    wren: { spec: 'WREN', at: 'left', yaw: 20, expr: 'calm', focus: 'bram' },
    bram: { spec: 'BRAM', at: 'right', yaw: -12, expr: 'sly', focus: 'camera' },
  },
  make: {
    heat: { kind: 'shimmer', at: { head: 'bram', up: -0.7, fwd: -0.18 }, w: 1.0, h: 1.2 },
    // the chimney: hot air out of the neck, cool air in under the hem
    rise: { kind: 'flow', at: { head: 'bram', up: -0.80, fwd: 0.22 }, medium: 'heat', path: [[0, 0, 0], [0.04, 0, 0.30], [0.16, 0, 0.62], [0.06, 0, 0.98], [0.16, 0, 1.35]], r: 0.05, life: 5.9 },
    hotair: { kind: 'callout', at: { head: 'bram', up: -0.72 }, r: 0.20, text: 'HOT AIR', dir: [-1.6, 0.9], h: 0.12 },
    coolin: { kind: 'callout', at: { head: 'bram', up: -1.35 }, r: 0.22, text: 'COOL AIR IN', dir: [-1.5, 0.9], h: 0.15 },
    inL: { kind: 'flow', at: { head: 'bram', up: -1.5, fwd: 0.2 }, medium: 'cold', path: [[-0.95, 0, 0.05], [-0.55, 0, 0.0], [-0.18, 0, 0.22], [-0.05, 0, 0.75]], r: 0.05, life: 4.4 },
    inR: { kind: 'flow', at: { head: 'bram', up: -1.5, fwd: 0.2 }, medium: 'cold', path: [[0.95, 0, 0.05], [0.55, 0, 0.0], [0.18, 0, 0.22], [0.05, 0, 0.75]], r: 0.05, life: 4.4 },
    nobreeze: { kind: 'stamp', at: [0.95, -0.45, 2.12], text: 'NO BREEZE', h: 0.15, tilt: -5 },
    tight: { kind: 'callout', at: { head: 'bram', up: -0.62 }, r: 0.30, text: 'TIGHT', dir: [-1.5, 1.3] },
    thermoC: { kind: 'thermo', at: { head: 'bram', side: 0.52, up: -0.45, fwd: 0.05 }, scale: 1.5 },
  },
  beats: [
    // l06 Here's the trick: (close on Bram, sly)
    { ...at('l06', 'here\'s'), who: 'bram', expr: 'sly', look: 'camera', do: 'gesture', kind: 'tilt', deg: -8, hold: 14 },
    // l07 Hot black cloth heats the air inside, and hot air rises out the neck.
    { ...at('l07', 'hot'), who: 'heat', do: 'set', key: 'heat', to: 1, dur: 10, from: 0, sound: 'sizzle', strength: 0.5 },
    { ...at('l07', 'hot'), who: 'bram', expr: 'calm', look: 'camera' },
    { ...at('l07', 'cloth'), who: 'bram', do: 'gesture', kind: 'nod' },
    { ...at('l07', 'inside'), who: 'bram', do: 'gesture', kind: 'tilt', deg: 7, hold: 14 },
    { ...at('l07', 'air', -3), who: 'hotair', do: 'set', key: 'show', to: 1, dur: 8, from: 0, ease: 'back', sound: 'pop', strength: 0.4 },
    { ...at('l08', 'that', -2), who: 'hotair', do: 'set', key: 'show', to: 0, dur: 6 },
    { ...at('l08', 'cool', -3), who: 'coolin', do: 'set', key: 'show', to: 1, dur: 8, from: 0, ease: 'back', sound: 'pop', strength: 0.4 },
    { ...at('l09', 'wear', -4), who: 'coolin', do: 'set', key: 'show', to: 0, dur: 6 },
    { ...at('l07', 'and'), who: 'wren', look: 'bram', expr: 'worried' },
    { ...at('l07', 'rises', -4), who: 'rise', do: 'fire', sound: 'whoosh', strength: 0.5 },
    { ...at('l07', 'rises'), who: 'bram', look: [0.95, -0.2, 2.9], expr: 'happy' },
    { ...at('l07', 'neck', 6), who: 'bram', look: 'camera' },
    // l08 That pulls cool air in from below: a breeze, under his robe.
    { ...at('l08', 'pulls', -3), who: 'inL', do: 'fire', sound: 'whoosh', strength: 0.4 },
    { ...at('l08', 'pulls', 0), who: 'inR', do: 'fire' },
    { ...at('l08', 'cool'), who: 'heat', do: 'set', key: 'heat', to: 0.25, dur: 20 },
    { ...at('l08', 'below'), who: 'bram', look: [0.95, -0.5, 0.1], expr: 'calm' },
    { ...at('l08', 'breeze'), who: 'bram', expr: 'closed', look: 'camera', do: 'gesture', kind: 'tilt', deg: -9, hold: 16 },
    { ...at('l08', 'robe'), who: 'bram', expr: 'grin' },
    { ...at('l08', 'robe'), who: 'wren', expr: 'shock' },
    // l09 Wear it tight, and the breeze stops. Then Bram cooks.
    { ...at('l09', 'tight', -3), who: 'tight', do: 'set', key: 'show', to: 1, dur: 8, from: 0, ease: 'back', sound: 'scratch', strength: 0.5 },
    { ...at('l09', 'tight'), who: 'bram', expr: 'worried' },
    { ...at('l09', 'stops'), who: 'bram', expr: 'shock', do: 'gesture', kind: 'tilt', deg: 8, hold: 12 },
    { ...at('l09', 'stops', -3), who: 'nobreeze', do: 'fire', sound: 'clunk', strength: 0.6 },
    { ...at('l09', 'stops'), who: 'heat', do: 'set', key: 'heat', to: 1, dur: 16 },
    { ...at('l09', 'then', -4), who: 'thermoC', do: 'set', key: 'show', to: 1, dur: 8, from: 0, ease: 'back' },
    { ...at('l09', 'then'), who: 'thermoC', do: 'set', key: 'temp', to: 400, dur: 16, from: 90, ease: 'smooth', sound: 'slide_whistle_up', strength: 0.5 },
    { ...at('l09', 'bram'), who: 'thermoC', do: 'shake', key: 'shake', amp: 1, dur: 16 },
    { ...at('l09', 'cooks'), who: 'bram', do: 'slump', dur: 14, expr: 'shock' },
    { ...at('l09', 'cooks'), who: 'heat', do: 'pulse', key: 'heat', amp: 0.6, dur: 10, sound: 'sizzle', strength: 0.6 },
  ],
  shots: [
    { f: 562, shot: 'cu', of: ['bram'], angle: -8, head: 0.22, kx: 0.5, live: 0.35, cut: true },
    { ...at('l07', 'hot', -3), shot: 'ms', of: ['bram'], with: ['rise'], angle: -8, size: 0.52, push: 0.0010, dof: 0, cut: true },
    { ...at('l08', 'pulls', -4), shot: 'ms', of: ['bram'], angle: 14, size: 0.58, dof: 0, cut: true },
    { ...at('l09', 'wear', -3), shot: 'cu', of: ['bram'], angle: -6, head: 0.17, kx: 0.5, live: 0.35, push: 0.0012, dof: 0, cut: true },
  ],
};

export default {
  title: 'Black robe, white robe, second half',
  frames: [359, 940],
  lines: ['l04', 'l05', 'l06', 'l07', 'l08', 'l09'],
  acts: [lab, cut, park],
  amend: [],
};
