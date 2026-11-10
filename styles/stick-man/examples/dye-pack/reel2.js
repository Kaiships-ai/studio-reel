// stick01 "dye pack", lines l05-l10 (frames 345-910). Data only, like reel.js: acts (a set, its cast, beats, shots) and
// the frames each act is on screen; a change of place is a 7-frame dissolve centred on its `from` frame.
// Keyed values: { who, do: 'set', key, to, dur } tweens a number or a point; 'pulse' / 'shake' add on top; 'fire' starts
// an effect's clock; 'flash' whites out the frame; 'sound' adds a cue. `make` builds the act's effect objects.
const W = (line, on, offset = -2, nth) => ({ line, on, offset, ...(nth ? { nth } : {}) });
const at = (line, on, offset, nth) => W(line, on, offset, nth);

const street = {
  name: 'street', set: 'street', zRange: [1.1, 1.9],
  show: [{ from: 345, dissolve: 0 }, { from: 631, dissolve: 0 }],   // hard cuts: no double exposure
  cast: {
    kai: { spec: 'KAI', at: 'door', yaw: 0, expr: 'smug', focus: 'camera' },
    mabel: { spec: 'MABEL', at: [-3.6, -2.8, 0], yaw: 92, expr: 'happy', focus: 'camera' },
    // on the pavement in front of the right column's base (base spans x 1.32-2.08, y -0.86..-0.10), not against it
    otis: { spec: 'OTIS', at: [2.85, -1.20, 0], yaw: -60, expr: 'neutral', focus: 'camera' },
    june: { spec: 'JUNE', at: [-5.6, -1.15, 0], yaw: 90, expr: 'calm', focus: 'camera' },
    officer: { spec: 'OFFICER', at: [0.5, -4.25, -0.16], yaw: 40, expr: 'stern', focus: 'kai', watch: false },
  },
  make: {
    glow: { kind: 'bagGlow', bag: 'bag' },
    // the burst rings Kai and the bag: cloud round the bag, a pow star behind it, big bills and dye drops at the lens
    burst: { kind: 'burst', at: { prop: 'bag', off: [0, 0, 0.10] }, size: 0.70, count: 20, life: 0.7, clear: 0.85, smoke: true },
    star: { kind: 'star', at: { prop: 'bag', off: [0, 0, 0.25] }, r: 1.35, back: 1.0, frames: 8 },
    bigbills: { kind: 'bills', at: { prop: 'bag', off: [0, 0, 0.1] }, n: 9, scale: 4.2, seed: 21, push: 3.6 },
    drops: { kind: 'drops', at: { prop: 'bag', off: [0, 0, 0.1] }, n: 26, seed: 13, rs: 0.45, lens: 0.12 },
    // the countdown clock beside his head, on the side away from the bag: 10 to 0 from "ten" to the burst
    dial: { kind: 'dial', at: { head: 'kai', side: -0.84, up: -0.02, fwd: 0.10 }, r: 0.21, of: 10 },
    bills: { kind: 'bills', at: [1.05, -1.3, 1.7], n: 18, scale: 2.0, seed: 5 },
    bills2: { kind: 'bills', at: [1.1, -1.95, 1.7], n: 14, scale: 1.3, seed: 11 },
    puff: { kind: 'burst', at: { head: 'kai', fwd: 0.34, up: -0.14 }, size: 0.13, count: 7, life: 0.45, seed: 8 },
    spray: { kind: 'spray', at: { prop: 'bag', off: [0, 0, -0.05] }, dir: [-0.5, -0.7, 0.5], n: 16, reach: 1.2 },
    thermo: { kind: 'thermo', at: [0.45, -2.25, 1.0], scale: 1.5 },
    bill: { kind: 'bill', at: 'bag_rest', red: 1 },
    lights: { kind: 'prop', prop: 'police', keys: ['on'], phaseRate: 2.2 },
  },
  beats: [
    // set-up before the cut: the bag hanging from his right hand, already walking out of the bank door
    { f: 300, who: 'kai', do: 'hold', prop: 'bag', hand: 'R', fade: 0 },
    { f: 328, who: 'kai', do: 'walk_to', to: 'burst', stride: 0.6, step: 10, cheat: -25, gait: { stanceFlex: [[0, 24], [0.1, 27], [0.45, 10]] } },
    { f: 330, who: 'mabel', do: 'walk_to', to: [-0.80, -2.65, 0], stride: 0.6, step: 10 },
    { f: 335, who: 'june', do: 'walk_to', to: [-2.2, -1.15, 0], stride: 0.6, step: 10 },
    { f: 338, who: 'kai', expr: 'grin', look: 'camera' },
    // l05 About ten seconds later, his bag EXPLODES.
    { ...at('l05', 'about'), who: 'kai', expr: 'smug' },
    // time passing: on "ten" the countdown clock pops up by his head and runs 10 -> 0 (one number every ~4 frames) into the burst
    { ...at('l05', 'ten', -1), who: 'dial', do: 'set', key: 'show', to: 1, dur: 5, from: 0, ease: 'back' },
    { ...at('l05', 'ten', 0), who: 'dial', do: 'set', key: 'count', to: 0, dur: 36, from: 10, ease: 'linear' },
    { ...at('l05', 'ten', 0), who: 'dial', do: 'pulse', key: 'tick', amp: 0.6, dur: 3, n: 10, gap: 3.6 },
    { ...at('l05', 'bag', -1), who: 'dial', do: 'pulse', key: 'tick', amp: 1.3, dur: 8 },
    { ...at('l05', 'explodes'), who: 'dial', do: 'set', key: 'show', to: 0, dur: 0 },
    { ...at('l05', 'ten'), who: 'glow', do: 'pulse', key: 'glow', amp: 0.8, dur: 9, sound: 'tick', strength: 0.5 },
    { ...at('l05', 'ten', 2), who: 'otis', expr: 'calm', look: 'kai' },
    { ...at('l05', 'seconds'), who: 'glow', do: 'pulse', key: 'glow', amp: 0.9, dur: 9, sound: 'tick', strength: 0.5 },
    { ...at('l05', 'seconds'), who: 'kai', expr: 'sly' },
    { ...at('l05', 'later'), who: 'glow', do: 'pulse', key: 'glow', amp: 1.0, dur: 10, sound: 'tick', strength: 0.5 },
    { ...at('l05', 'later'), who: 'kai', look: 'bag', expr: 'neutral' },
    { ...at('l05', 'later', 8), who: 'kai', look: 'camera', expr: 'smug' },
    { ...at('l05', 'his'), who: 'kai', expr: 'grin' },
    { ...at('l05', 'bag'), who: 'glow', do: 'set', key: 'glow', to: 1, dur: 8, from: 0 },
    { ...at('l05', 'bag'), who: 'kai', look: 'bag', expr: 'worried' },
    // the bag swells and shakes for 8 frames, then bursts (it stays in his hand, torn open and smoking)
    { ...at('l05', 'explodes', -10), who: 'bag', do: 'set', key: 'swell', to: 0.42, dur: 9, from: 0, ease: 'smooth' },
    { ...at('l05', 'explodes', -10), who: 'bag', do: 'pulse', key: 'swell', amp: 0.06, dur: 3, n: 3, gap: 3 },
    { ...at('l05', 'explodes'), who: 'bag', do: 'set', key: 'swell', to: 0, dur: 6, from: -0.08 },
    { ...at('l05', 'explodes'), who: 'glow', do: 'set', key: 'glow', to: 0, dur: 0 },
    { ...at('l05', 'explodes'), who: 'screen', do: 'flash', frames: 3 },
    { ...at('l05', 'explodes'), who: 'burst', do: 'fire', sound: 'poof', strength: 1.0 },
    { ...at('l05', 'explodes'), who: 'bills', do: 'fire', sound: 'hiss', strength: 0.5 },
    { ...at('l05', 'explodes'), who: 'star', do: 'fire' },
    { ...at('l05', 'explodes'), who: 'bigbills', do: 'fire' },
    { ...at('l05', 'explodes', 1), who: 'drops', do: 'fire' },
    { ...at('l05', 'explodes'), who: 'kai', do: 'startle', expr: 'shock', look: 'camera', hold: 20 },
    { ...at('l05', 'explodes', 3), who: 'otis', do: 'turn_to', to: 'burst', expr: 'shock', dur: 11 },
    { ...at('l05', 'explodes', 5), who: 'mabel', do: 'turn_to', to: 'burst', expr: 'shock', dur: 9 },
    { ...at('l05', 'explodes', 9), who: 'june', do: 'turn_to', to: 'burst', expr: 'shock', dur: 10 },
    { ...at('l05', 'explodes', 14), who: 'kai', expr: 'worried', look: 'bag' },
    { ...at('l05', 'explodes', 24), who: 'kai', expr: 'shock', look: 'camera' },
    // l06 Wait, what?
    { ...at('l06', 'wait', -10), who: 'kai', expr: 'neutral' },
    { ...at('l06', 'wait'), who: 'kai', expr: 'worried', look: 'camera', do: 'gesture', kind: 'tilt', deg: 9, hold: 12 },
    { ...at('l06', 'wait'), who: 'screen', do: 'sound', name: 'scratch', strength: 0.5 },
    { ...at('l06', 'what'), who: 'kai', do: 'cough', expr: 'closed', n: 2, per: 6 },
    { ...at('l06', 'what'), who: 'puff', do: 'fire' },
    { ...at('l06', 'what', 8), who: 'kai', expr: 'shock' },
    // ---- second window: back at the burst spot
    // l09 Now it's burning at four hundred degrees, spraying red dye on every single bill, and on him.
    { ...at('l09', 'now'), who: 'kai', expr: 'worried', look: 'bag' },
    { ...at('l09', 'burning'), who: 'glow', do: 'set', key: 'glow', to: 0.8, dur: 6, from: 0, sound: 'sizzle', strength: 0.5 },
    { ...at('l09', 'burning'), who: 'thermo', do: 'set', key: 'show', to: 1, dur: 8, ease: 'back', from: 0 },
    { ...at('l09', 'burning', 2), who: 'thermo', do: 'set', key: 'temp', to: 400, dur: 14, from: 70, ease: 'smooth', sound: 'slide_whistle_up', strength: 0.5 },
    { ...at('l09', 'burning', 2), who: 'kai', look: 'thermo', expr: 'shock' },
    { ...at('l09', 'four'), who: 'thermo', do: 'shake', key: 'shake', amp: 1, dur: 18 },
    { ...at('l09', 'degrees'), who: 'kai', expr: 'worried', look: 'camera' },
    { ...at('l09', 'degrees', 6), who: 'thermo', do: 'set', key: 'show', to: 0, dur: 8 },
    { ...at('l09', 'spraying'), who: 'spray', do: 'fire' },
    { ...at('l09', 'spraying'), who: 'spray', do: 'set', key: 'on', to: 1, dur: 5, from: 0, sound: 'hiss', strength: 0.5 },
    { ...at('l09', 'spraying'), who: 'kai', expr: 'shock', do: 'gesture', kind: 'nod' },
    // he turns red only once the spray is named
    { ...at('l09', 'red'), who: 'kai', do: 'set', key: 'dye', to: 0.55, dur: 16, from: 0, ease: 'smooth' },
    { ...at('l09', 'spraying'), who: 'mabel', do: 'step_back', from: 'burst', expr: 'worried', dist: 0.45 },
    { ...at('l09', 'red'), who: 'kai', look: 'bag' },
    { ...at('l09', 'dye'), who: 'bills2', do: 'fire', sound: 'flutter', strength: 0.4 },
    { ...at('l09', 'every'), who: 'bills2', do: 'set', key: 'red', to: 1, dur: 26, from: 0, ease: 'linear' },
    { ...at('l09', 'every'), who: 'bills', do: 'set', key: 'red', to: 1, dur: 30, from: 0, ease: 'linear' },
    { ...at('l09', 'every'), who: 'otis', do: 'step_back', from: 'burst', expr: 'shock', dist: 0.5 },
    { ...at('l09', 'every', 4), who: 'kai', expr: 'worried', look: 'bills' },
    { ...at('l09', 'single'), who: 'kai', expr: 'shock' },
    { ...at('l09', 'bill'), who: 'kai', look: 'camera', expr: 'worried' },
    { ...at('l09', 'on', -2, 2), who: 'kai', do: 'set', key: 'dye', to: 1, dur: 16, ease: 'linear' },
    { ...at('l09', 'on', -2, 2), who: 'kai', expr: 'closed' },
    { ...at('l09', 'on', -2, 2), who: 'june', do: 'step_back', from: 'burst', expr: 'shock', dist: 0.5 },
    { ...at('l09', 'him'), who: 'kai', expr: 'shock' },
    { ...at('l09', 'him', 8), who: 'spray', do: 'set', key: 'on', to: 0, dur: 8 },
    // l10 So he's standing in the street with a bag of worthless paper, the only bright red man in town.
    { ...at('l10', 'so'), who: 'kai', expr: 'worried', look: 'camera' },
    { ...at('l10', 'he\'s'), who: 'kai', do: 'idle', fade: 14 },
    { ...at('l10', 'standing'), who: 'kai', do: 'slump', dur: 14 },
    { ...at('l10', 'standing'), who: 'mabel', expr: 'stern', look: 'kai' },
    { ...at('l10', 'street'), who: 'otis', do: 'turn_to', to: 'burst', dur: 8 },
    { ...at('l10', 'street', 6), who: 'otis', do: 'point', to: [1.15, -1.95, 2.0], hand: 'R', hold: 34, expr: 'shock' },
    { ...at('l10', 'with'), who: 'june', expr: 'worried', look: 'kai' },
    { ...at('l10', 'bag'), who: 'kai', expr: 'neutral', look: 'bag' },
    { ...at('l10', 'of'), who: 'kai', do: 'pluck', prop: 'bill', from: 'bag', hand: 'L', dur: 9 },
    { ...at('l10', 'worthless'), who: 'kai', look: 'bill', expr: 'worried' },
    { ...at('l10', 'worthless'), who: 'screen', do: 'sound', name: 'wah', strength: 0.6 },
    { ...at('l10', 'paper'), who: 'kai', expr: 'stern' },
    { ...at('l10', 'paper', 8), who: 'kai', do: 'let_fall', prop: 'bill', hand: 'L', dur: 40 },
    { ...at('l10', 'the', -2, 2), who: 'kai', expr: 'worried', look: 'camera' },
    { ...at('l10', 'only'), who: 'police', do: 'drive', dist: 14, dur: 22, rot: 0, to: [-5.2, -4.85, -0.16] },   // pulls up off to the left: heard and lit, never a block in frame
    { ...at('l10', 'only'), who: 'lights', do: 'set', key: 'on', to: 1, dur: 0 },
    { ...at('l10', 'bright'), who: 'mabel', look: 'police', expr: 'shock' },
    { ...at('l10', 'red'), who: 'screen', do: 'sound', name: 'siren', strength: 0.3 },
    { ...at('l10', 'red'), who: 'kai', look: 'police', expr: 'shock' },
    { ...at('l10', 'man', 0), who: 'officer', do: 'set', key: 'show', to: 1, dur: 0, from: 0 },
    { f: 0, who: 'officer', do: 'set', key: 'show', to: 0, dur: 0 },
    { ...at('l10', 'man', 2), who: 'officer', do: 'walk_to', to: [1.0, -3.95, -0.16], stride: 0.4, step: 9 },
    { ...at('l10', 'in'), who: 'kai', do: 'wave_small', hand: 'L', expr: 'grin', look: 'officer', n: 3, per: 6 },
    { ...at('l10', 'town'), who: 'june', expr: 'stern' },
    { ...at('l10', 'town', 3), who: 'screen', do: 'sound', name: 'sting', strength: 0.8 },
  ],
  shots: [
    // from the cut: one medium shot that already holds Kai, his bag and the spot where the clock pops up
    { f: 336, shot: 'ms', of: ['kai'], with: ['bag', 'dial'], angle: 8, size: 0.38 },
    { ...at('l05', 'explodes'), shot: 'cu', of: ['kai'], angle: -10, head: 0.15, cut: true, live: true },   // cut hidden in the white flash
    { ...at('l06', 'wait', -6), shot: 'cu', of: ['kai'], angle: -16, head: 0.26 },
    // one steady medium shot through "Now it's burning at four hundred degrees": Kai, the bag in his hand, the thermometer
    { f: 631, shot: 'ms', of: ['kai'], with: ['thermo'], angle: 6, size: 0.40, push: 0.0012, cut: true },   // a cut, on the act change
    { ...at('l09', 'spraying', -3), shot: 'ms', of: ['kai'], angle: -10, size: 0.36 },
    { ...at('l09', 'every', -3), shot: 'wide', of: ['kai', 'otis'], size: 0.32 },
    { ...at('l09', 'on', -4, 2), shot: 'ms', of: ['kai'], angle: 49, size: 0.42 },
    // l10 is one composition to the end: seen along the pavement, Kai holding his bag, the car pulling up on the road behind
    // him, the officer; it pushes in slowly to the last word (no swing round: the car never becomes a foreground block)
    { ...at('l10', 'so', -2), shot: 'insert', of: ['kai'], at: [0.0, 0.0, -0.32], from: [1, -0.55], dist: 5.0, z: 1.4, lens: 30, dof: 0, push: 0.0024 },
  ],
};

const cutaway = {
  name: 'cutaway', set: 'cutaway', zRange: [0.08, 1.2],
  show: [{ from: 439, dissolve: 0 }],
  cast: {},
  make: {
    stack: { kind: 'prop', prop: 'stack', keys: ['lift'] },
    pack: { kind: 'prop', prop: 'pack', keys: ['awake', 'alarm', 'dial', 'count'], snore: true },
    plate: { kind: 'prop', prop: 'plate', keys: ['pulse'] },
    // her arm reaches in from above and behind: the elbow shows, the hand dot lands on the end wall of the stack
    arm: { kind: 'arm', shoulder: [0.56, 0.02, 0.42] },
  },
  beats: [
    { f: 0, who: 'thermo', do: 'move', to: [0.22, 6, 0], dur: 1 },
    { f: 0, who: 'arm', do: 'set', key: 'bend', to: 0.16, dur: 0 },   // the elbow up and out: a whole forearm and upper arm in frame
    // l07 You see, that stack was hollow. Inside, a dye pack sat asleep on its magnet until she picked it up.
    { ...at('l07', 'hollow'), who: 'stack', do: 'set', key: 'lift', to: 1, dur: 10, from: 0, ease: 'back', sound: 'pop', strength: 0.6 },
    { ...at('l07', 'asleep', -4), who: 'pack', do: 'set', key: 'snoring', to: 1, dur: 4, from: 0, sound: 'snore', strength: 0.5 },
    { ...at('l07', 'magnet'), who: 'plate', do: 'pulse', key: 'pulse', n: 3, dur: 9, gap: 8, sound: 'clunk', strength: 0.5 },
    { ...at('l07', 'until', -6), who: 'arm', do: 'set', key: 'hand', from: [0.52, 0.0, 0.36], to: [0.133, 0.0, 0.074], dur: 16 },
    { ...at('l07', 'picked'), who: 'pack', do: 'set', key: 'snoring', to: 0, dur: 0 },
    { ...at('l07', 'picked'), who: 'stack', do: 'move', by: [0, 0, 0.18], dur: 12 },
    { ...at('l07', 'picked'), who: 'arm', do: 'set', key: 'hand', to: [0.133, 0.0, 0.254], dur: 12 },
    { ...at('l07', 'picked', 3), who: 'pack', do: 'set', key: 'awake', to: 1, dur: 0, sound: 'blip', strength: 0.5 },
    { ...at('l07', 'picked', 4), who: 'pack', do: 'set', key: 'alarm', to: 1, dur: 6, from: 0 },
  ],
  shots: [
    { f: 434, shot: 'insert', of: ['stack'], from: [0.3, -1], dist: 0.80, z: 0.42, at: [0, 0, 0.03], lens: 32, push: 0.005, drift: 0.35 },
    { ...at('l07', 'hollow', -2), shot: 'insert', of: ['stack'], from: [0.2, -1], dist: 0.56, z: 0.36, at: [0, 0, 0.04], lens: 34 },
    { ...at('l07', 'dye', -2), shot: 'insert', of: ['pack'], from: [0.1, -1], dist: 0.38, z: 0.26, at: [0, 0, 0.01], lens: 38, cut: true },
    { ...at('l07', 'magnet', -3), shot: 'insert', of: ['plate'], from: [-0.25, -1], dist: 0.40, z: 0.25, at: [-0.17, -0.10, 0.02], lens: 38, cut: true },
    // the pick-up: one wider frame (a cut on "until") that holds the arm coming in, the hand on the stack and the lift
    { ...at('l07', 'until', -6), shot: 'insert', of: ['plate'], from: [0.25, -1], dist: 0.95, z: 0.56, at: [0.09, 0, 0.17], lens: 30, cut: true },
  ],
};

const door = {
  name: 'door', set: 'street', zRange: [1.1, 1.9],
  show: [{ from: 596, dissolve: 0 }],
  cast: { kai: { spec: 'KAI', at: [0.0, 1.9, 0], yaw: 0, expr: 'grin', focus: 'camera' } },
  make: {
    // the door's timer: a clock face mounted on the casing under the sensor (bolted to the stone, faces the street)
    timer: { kind: 'dial', at: [1.12, -0.09, 2.18], r: 0.17, of: 10, mount: true },
    rings: { kind: 'rings', from: 'sensor', to: { prop: 'bag', off: [0, 0, -0.1] } },
  },
  beats: [
    { f: 540, who: 'kai', do: 'hold', prop: 'bag', hand: 'R', fade: 0 },
    { f: 545, who: 'kai', do: 'walk_to', to: [0.0, -0.95, 0], stride: 0.62, step: 9, gait: { stanceFlex: [[0, 16], [0.1, 20], [0.45, 5]] } },
    { ...at('l08', 'door', 4), who: 'kai', do: 'walk_to', to: [-2.2, -1.5, 0], stride: 0.62, step: 9, turn: 12, gait: { stanceFlex: [[0, 16], [0.1, 20], [0.45, 5]] } },
    // l08 The door started its timer.
    { ...at('l08', 'the'), who: 'kai', expr: 'smug' },
    { ...at('l08', 'door'), who: 'sensor', do: 'blink' },
    { ...at('l08', 'door'), who: 'rings', do: 'fire', sound: 'ping', strength: 0.5 },
    { ...at('l08', 'door', 6), who: 'screen', do: 'sound', name: 'ping', strength: 0.4 },
    { ...at('l08', 'started'), who: 'kai', expr: 'grin', look: 'camera' },
    { f: 0, who: 'timer', do: 'set', key: 'show', to: 1, dur: 0 },
    { ...at('l08', 'door', 2), who: 'timer', do: 'pulse', key: 'tick', amp: 1.0, dur: 6 },
    { ...at('l08', 'started'), who: 'timer', do: 'set', key: 'count', to: 8, dur: 24, from: 10, ease: 'linear', sound: 'tick', strength: 0.5 },
    { ...at('l08', 'started'), who: 'timer', do: 'pulse', key: 'tick', amp: 0.8, dur: 4, n: 3, gap: 10 },
  ],
  shots: [
    { f: 588, shot: 'ms', of: ['kai'], with: ['timer'], angle: 22, size: 0.34, heading: 0, push: 0.0010 },
  ],
};

export default {
  title: 'Dye pack, second half',
  frames: [345, 910],
  lines: ['l05', 'l06', 'l07', 'l08', 'l09', 'l10'],
  acts: [street, cutaway, door],
  // first-half framing fix: the plate gets its own insert while it is named
  // (the plate insert that used to sit on "of twenties" is gone: its push cut her head and the lifted stack at the top
  // edge; the close-up on "She" already holds her, the plate and the stack)
  amend: [],
};
