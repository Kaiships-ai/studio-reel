// sf-ep01-allout v3, acts 2-8 (l02-l14). Round 3: one acted gag per beat, the doubter (Bram) in every act until he
// faints at the end, props that do something in the hands, effects at reference level (steam out of the ears, a face-plant
// in the straw, a tower of papers, a stink cloud with flies, red cracks, pill bombs, a faint, gold sparks). Places change by
// dissolve (time / place jump) or a camera travel; one hard cut ("Wait.") and one whip ("No surgery.").
// Light, grade and look per act are round 2's, unchanged.
const at = (line, on, offset = -2, nth) => ({ line, on, offset, ...(nth ? { nth } : {}) });
const anim = (...names) => Object.fromEntries(names.map(n => [n, { kind: 'ao_anim', prop: n }]));
const set = (who, key, to, dur = 0, b = {}) => ({ who, do: 'set', key, to, dur, ...b });
const fire = (who, b) => ({ ...b, who, do: 'fire' });
const sfx = (name, strength = 0.5) => ({ who: 'screen', do: 'sound', name, strength });
const S = n => `/styles/stick-man/allout/sets/${n}.js`;
const GAS = [0.50, 0.82, 0.22];

// l02 Perth 1982: craning down the street to the know-all; everyone nods; stress = Otis falling apart; spicy food = Bram's
// chilli, steam out of both ears and a puff of fire
const perth = {
  name: 'perth', set: 'perth', setModule: S('perth'), show: [{ from: at('l02', '1982,', 4), dissolve: 10 }],
  light: { sun: [1.0, 0.95, 0.85], power: 3.4, sky: [0.6, 0.75, 1.0], ground: [0.75, 0.65, 0.5], hemi: 0.55, fill: [0.85, 0.9, 1.0], fillPower: 0.45, lit: [1.05, 1.02, 0.95], shade: [0.68, 0.74, 1.0], lamp: 0 },
  grade: { exp: 1.1, lift: 0.03, sat: 1.08 },
  cast: {
    bram: { spec: 'BRAM', at: [0.55, 2.2, 0.14], yaw: 0, expr: 'smug', focus: 'camera', lead: true },
    otis: { spec: 'OTIS', at: [-4.6, 2.45, 0.14], yaw: 90, expr: 'nervous', focus: 'bram' },
    june: { spec: 'JUNE', at: [4.8, 2.55, 0.14], yaw: -90, expr: 'calm', focus: 'bram' },
  },
  make: {
    ...anim('banner'),
    steamL: { kind: 'steam', at: { head: 'bram', side: 0.30, up: 0.04 }, dir: [0.55, 0, 0.45], size: 0.10, rate: 9, seed: 3 },
    steamR: { kind: 'steam', at: { head: 'bram', side: -0.30, up: 0.04 }, dir: [-0.55, 0, 0.45], size: 0.10, rate: 9, seed: 5 },
    flame: { kind: 'smoke', at: { head: 'bram', fwd: 0.42, up: -0.2 }, size: 0.3, count: 9, color: [1.0, 0.5, 0.12], dark: [0.95, 0.2, 0.05], life: 0.7, rise: 0.5, seed: 8 },
  },
  beats: [
    { ...at('l02', '1982,', -4), ...sfx('whoosh', 0.6) },
    { ...at('l02', '1982,', -12), who: 'otis', do: 'walk_to', to: [-0.6, 2.3, 0.14], style: 'brisk', mark: 'sweat' },
    { ...at('l02', '1982,', -12), who: 'june', do: 'walk_to', to: [1.7, 2.35, 0.14], style: 'walk' },
    { ...at('l02', 'everyone', -14), who: 'otis', do: 'turn_to', yaw: 25, dur: 8 }, { ...at('l02', 'everyone', -14), who: 'june', do: 'turn_to', yaw: -25, dur: 8 },
    // "Everyone knows": the know-all lectures, the street nods along
    { ...at('l02', 'everyone', -6), who: 'bram', do: 'wag_finger', hold: 18, expr: 'smug', look: 'camera' },
    { ...at('l02', 'everyone', -2), who: 'otis', do: 'nod', hold: 14, expr: 'calm', look: 'bram' },
    { ...at('l02', 'everyone', 0), who: 'june', do: 'nod', hold: 30, expr: 'calm', look: 'bram' },
    // "ulcers come from stress": he jabs a finger at Otis, a nervous wreck clutching his belly
    { ...at('l02', 'ulcers', -6), who: 'bram', do: 'point_lean', to: [-0.6, 2.3, 1.0], hold: 22, expr: 'smug', look: 'otis' },
    { ...at('l02', 'stress', -8), who: 'otis', do: 'cower', hold: 26, expr: 'panic', look: 'camera', mark: 'sweat' },
    // "and spicy food": one bite of chilli, then steam out of both ears, fire out of the mouth, a jolt, the belly
    { ...at('l02', 'and', -8), who: 'bram', do: 'eat_chilli', hold: 16, expr: 'happy', look: 'camera' },
    { ...at('l02', 'food.', -3), who: 'bram', expr: 'furious', mark: 'steam' },
    { ...at('l02', 'food.', -3), ...set('steamL', 'on', 1, 3) }, { ...at('l02', 'food.', -3), ...set('steamR', 'on', 1, 3) },
    { ...at('l02', 'food.', -1), ...fire('flame') }, { ...at('l02', 'food.', -1), ...sfx('hiss', 0.8) },
    { ...at('l02', 'food.', 0), who: 'bram', do: 'startle', back: 0.15, hold: 10 },
    { ...at('l02', 'food.', 0), who: 'otis', do: 'lean_away', expr: 'shock', look: 'bram' }, { ...at('l02', 'food.', 2), who: 'june', do: 'lean_away', expr: 'shock', look: 'bram' },
  ],
  direct: [
    { at: at('l02', '1982,', -2), intent: 'establish', why: '"1982, Perth, Australia": from high above the street and its banner, crane down to the footpath as Otis hurries in',
      cam: { look: [0, 2.8, 1.2], az: 0, el: 38, d: 10.5, lens: 26, ky: 0.5 }, to: { look: [0.5, 2.3, 1.15], az: 6, el: -6, d: 4.4, lens: 26, ky: 0.55 }, move: { from: at('l02', 'perth,', -2), to: at('l02', 'everyone', 4), ease: 'inout' } },
    { at: at('l02', 'ulcers', -4), n: 14, intent: 'show-claim', why: '"ulcers come from stress": travel in to the finger and the wreck it points at',
      cam: { look: [0.0, 2.25, 1.15], az: 14, el: 0, d: 3.0, lens: 30, ky: 0.52 }, dof: { gain: 0.15 } },
    { at: at('l02', 'spicy', -4), n: 10, travel: 'rush', intent: 'react', why: '"spicy food": rush in on the bite; on "food" the steam blasts out of his ears',
      cam: { look: 'bram', up: -0.12, az: 10, el: -4, d: 2.0, lens: 34, ky: 0.42 }, kick: [{ at: at('l02', 'food.', 0), amp: 0.7 }], dof: { gain: 0.25 } },
  ],
};

// l03 1982 pathology lab (day): Warren hunched at the microscope (business), Marshall behind at the photo board; into the
// eyepiece and back out; "again and again": Warren pops up, Marshall slaps photo after photo on the board
const labday = {
  name: 'lab-day', set: 'lab-day', setModule: S('lab-night'), setOpts: { mode: 'day' },
  show: [{ from: at('l03', 'but', 2), dissolve: 8 }, { from: at('l03', 'sick', -4), dissolve: 16 }],
  light: { sun: [1.0, 0.97, 0.9], power: 2.8, sky: [0.65, 0.78, 1.0], ground: [0.55, 0.5, 0.45], hemi: 0.5, fill: [0.9, 0.95, 1.0], fillPower: 0.45, lit: [1.04, 1.02, 0.98], shade: [0.66, 0.72, 1.0], lamp: 0.3 },
  grade: { exp: 1.1, lift: 0.03, sat: 1.06 },
  cast: {
    kip: { spec: 'KAI', at: [0.55, 0.0, 0], yaw: -10, expr: 'happy', focus: 'camera', lead: true },
    warren: { spec: 'WARREN', at: [-0.95, 0.05, 0], yaw: -75, expr: 'calm', focus: 'eyepiece', lead: true },
  },
  make: anim('board'),
  beats: [
    { ...at('l03', 'but', -2), ...sfx('whoosh', 0.6) },
    { ...at('l03', 'but', -10), who: 'warren', do: 'scope_twiddle', hold: 36, expr: 'suspicious', look: 'eyepiece' },
    { ...at('l03', 'barry', -4), who: 'kip', do: 'thumb_self', hold: 20, expr: 'proud', look: 'camera' },
    { ...at('l03', 'pathologist', -2), who: 'warren', look: 'camera', expr: 'deadpan' },
    { ...at('l03', 'robin', -4), who: 'warren', do: 'wave_small', hand: 'L', n: 2 },
    { ...at('l03', 'keep', -8), who: 'warren', do: 'scope_twiddle', hold: 90, expr: 'suspicious', look: 'eyepiece' },
    { ...at('l03', 'keep', -6), who: 'kip', do: 'lean_in', look: 'eyepiece', expr: 'suspicious', hold: 40 },
    // "again and again": up from the eyepiece in shock, point; slap, a photo on the board; again, bigger
    { ...at('l03', 'again', -6), who: 'warren', do: 'recoil', expr: 'shock', look: 'camera', mark: 'exclaim' },
    { ...at('l03', 'again', 0), who: 'warren', do: 'point', to: [1.25, -0.15, 1.45], hold: 20, look: 'board' },
    { ...at('l03', 'again', -6), who: 'kip', do: 'reach', hand: 'R', to: [1.12, -0.1, 1.5], dur: 7, look: 'board', expr: 'excited' },
    { ...at('l03', 'again', 0), ...set('board', 'n', 3, 6, { sound: 'thud', strength: 0.5 }) },
    { ...at('l03', 'again', -6, 2), who: 'kip', do: 'reach', hand: 'R', to: [1.32, -0.2, 1.62], dur: 6 },
    { ...at('l03', 'again', 0, 2), ...set('board', 'n', 6, 8, { sound: 'thud', strength: 0.6 }) },
    { ...at('l03', 'again', -2, 2), who: 'warren', do: 'startle', expr: 'excited', mark: 'exclaim', hold: 14 },
  ],
  direct: [
    { at: at('l03', 'but', -4), intent: 'introduce', why: '"Barry Marshall and pathologist Robin Warren": low across the bench, Warren hunched at the eyepiece in front, Marshall behind',
      cam: { look: [-0.25, 0.0, 1.25], az: -18, el: -6, d: 3.8, lens: 28, ky: 0.5 } },
    { at: at('l03', 'keep', -4), n: 16, intent: 'go-inside', why: '"keep seeing": travel over Warren\'s shoulder, then into the eyepiece on "tiny" (we look where he looks)',
      cam: { look: 'eyepiece', az: -40, el: 20, d: 1.5, lens: 36, ky: 0.5 }, to: { look: 'eyepiece', az: -70, el: 55, d: 0.12, lens: 36, ky: 0.5 }, move: { from: at('l03', 'same', -6), to: at('l03', 'tiny', 0), ease: 'in' }, dof: { gain: 0.4 } },
    { at: at('l03', 'sick', -14), cut: 'cut', intent: 'pile-up', why: '"again and again": back in the room, both in depth: up from the scope, photo after photo slapped on the board',
      cam: { look: [0.15, 0.0, 1.35], az: -10, el: 2, d: 3.9, lens: 28, ky: 0.5 }, kick: [{ at: at('l03', 'again', 0, 2), amp: 0.35 }] },
  ],
};

// l03 cont.: a short look through the microscope (the spiral bug), then back to the room
const micro = {
  name: 'micro', set: 'micro', setModule: S('micro'), show: [{ from: at('l03', 'tiny', -2), dissolve: 6 }],
  light: { sun: [1, 0.97, 0.95], power: 1.5, hemi: 0.6, sky: [1, 0.95, 0.97], ground: [1, 0.9, 0.95], lit: [1, 1, 1], shade: [0.8, 0.8, 0.9], lamp: 0 },
  grade: { exp: 1.05, sat: 1.0 }, cast: {}, make: anim('field'), beats: [],
  direct: [
    { at: at('l03', 'tiny', -2), intent: 'arrive', why: 'out of the eyepiece: the field opens up (continues the push in)',
      cam: { look: [0, 0, 0], az: 0, el: 0, d: 0.75, lens: 50 }, to: { look: [0, 0, 0], az: 0, el: 0, d: 1.2, lens: 50 }, move: { dur: 14, ease: 'out' } },
  ],
};

// l04-l05 the lecture theatre: the experts laugh their heads off; the reviewer shoves their paper in under a tower of
// papers ("bottom ten percent"); Bram wipes the bug off the slide like a smudge, and it crawls back
const hall = {
  name: 'hall', set: 'hall', setModule: S('hall'), show: [{ from: at('l04', 'the', 3), dissolve: 10 }],
  light: { sun: [1.0, 0.88, 0.7], power: 2.0, sky: [0.75, 0.62, 0.5], ground: [0.45, 0.32, 0.22], hemi: 0.45, fill: [1, 0.88, 0.72], fillPower: 0.45, lit: [1.06, 0.98, 0.86], shade: [0.62, 0.6, 0.92], lamp: 0.5 },
  grade: { exp: 1.14, lift: 0.04, sat: 1.06 },
  cast: {
    kip: { spec: 'KAI', at: [-1.15, 3.3, 0.45], yaw: 10, expr: 'happy', focus: 'bram', lead: true },
    bram: { spec: 'BRAM', at: [0.2, 0.15, 0], yaw: 180, expr: 'smug', focus: 'kip', lead: true },
    otis: { spec: 'OTIS', at: [-1.5, -0.75, 0.38], yaw: 175, expr: 'smug', focus: 'kip' },
    wren: { spec: 'WREN', at: [-0.3, -1.65, 0.76], yaw: 180, expr: 'deadpan', focus: 'kip' },
    june: { spec: 'JUNE', at: [6.05, -5.45, 0], yaw: 0, expr: 'stern', focus: 'theirs', lead: true },
  },
  make: {
    ...anim('pile', 'theirs', 'wipe', 'stamp', 'slide', 'paper'),
    dust: { kind: 'smoke', at: [5.4, -6.1, 0.95], size: 0.22, count: 8, color: [0.86, 0.83, 0.76], life: 0.9, rise: 0.12, seed: 6, spread: 1.6 },
  },
  beats: [
    { ...at('l04', 'the', 0), ...sfx('whoosh', 0.5) },
    // "The experts scoff.": the tiers burst out laughing at the man on the podium
    { ...at('l04', 'scoff.', -12), who: 'bram', do: 'point_laugh', to: [-1.15, 3.3, 1.6], hold: 34, expr: 'laugh', look: 'kip' },
    { ...at('l04', 'scoff.', -8), who: 'otis', do: 'belly_laugh', hold: 22, expr: 'laugh' },
    { ...at('l04', 'scoff.', -4), who: 'wren', do: 'belly_laugh', hold: 34, expr: 'laugh' },
    { ...at('l04', 'scoff.', 16), who: 'otis', do: 'topple', deg: -32, hold: 16, expr: 'laugh' },
    { ...at('l04', 'scoff.', -6), who: 'kip', do: 'slump', expr: 'sad', look: 'bram' },
    // "Reviewers rank their paper": the reviewer holds it up, snorts
    { ...at('l04', 'reviewers', -4), ...set('theirs', 'up', 1, 12) },
    { ...at('l04', 'reviewers', -6), who: 'june', do: 'read_paper', hold: 14, expr: 'skeptic', look: 'theirs' },
    { ...at('l04', 'paper', -4), who: 'june', expr: 'laugh', look: 'theirs' },
    // "in the bottom ten percent": shoved in under the very bottom of the tower; the tower lifts, wobbles, a puff of dust
    { ...at('l04', 'in', -8), who: 'june', do: 'turn_to', yaw: -35, dur: 6 },
    { ...at('l04', 'in', -6), who: 'june', do: 'push', hold: 14, expr: 'smug', look: 'pile' },
    { ...at('l04', 'in', -6), ...set('theirs', 'under', 1, 18) },
    { ...at('l04', 'in', -2), ...set('pile', 'lift', 1, 5) }, { ...at('l04', 'bottom', 4), ...set('pile', 'lift', 0, 4, { sound: 'thud', strength: 0.7 }) },
    { ...at('l04', 'bottom', 4), who: 'pile', do: 'pulse', key: 'wobble', amp: 1, dur: 50 }, { ...at('l04', 'bottom', 4), ...fire('dust') },
    { ...at('l04', 'percent', -2), who: 'june', do: 'turn_to', yaw: 0, dur: 8 },
    { ...at('l04', 'percent', 0), who: 'june', do: 'dust_hands', hold: 26, expr: 'smug', look: 'camera' },
    // l05 "The bug?": Bram up at the projected slide, peering at the bug
    { ...at('l05', 'the', -8), ...sfx('whoosh', 0.5) },
    { ...at('l05', 'the', -6), who: 'bram', do: 'place', to: [-0.62, 5.28, 0.45], yaw: 180 },
    { ...at('l05', 'bug?', -6), who: 'bram', do: 'lean_in', hold: 14, expr: 'suspicious', look: [-0.88, 5.84, 2.4] },
    // "Just a contaminant, they say.": out with the hanky, he scrubs the bug off like a smudge; the rows nod
    { ...at('l05', 'just', -4), who: 'bram', do: 'wipe', hold: 26, expr: 'smug', look: [-0.88, 5.84, 2.3] },
    { ...at('l05', 'just', 0), ...set('wipe', 'clean', 1, 24, { sound: 'scratch', strength: 0.6 }) },
    // "Harmless.": he turns to the hall, shrugs; behind him the bugs crawl back, one by one
    { ...at('l05', 'say.', -2), who: 'bram', do: 'turn_to', yaw: 10, dur: 10 },
    { ...at('l05', 'harmless.', -8), who: 'bram', do: 'shrug', hold: 24, expr: 'smug', look: 'camera' },
    { ...at('l05', 'harmless.', -4), ...set('wipe', 'back', 1, 24, { ease: 'linear', sound: 'blip', strength: 0.4 }) },
  ],
  direct: [
    { at: at('l04', 'the', -4), intent: 'establish', why: '"The experts scoff": low over Marshall\'s shoulder at the podium, up the tiers of laughing experts',
      cam: { pos: [0.75, 4.95, 2.5], aim: [-0.55, -0.6, 1.15], lens: 26 } },
    { at: at('l04', 'scoff.', 4), n: 16, intent: 'react', why: 'the laugh gets bigger: travel down into the rows, the doubters doubled over, one falls back in his seat',
      cam: { look: [-0.75, -0.65, 1.3], az: 172, el: 2, d: 3.1, lens: 28, ky: 0.5 }, dof: { gain: 0.15 } },
    { at: at('l04', 'reviewers', -4), cut: 'dissolve', n: 8, intent: 'act', why: '"Reviewers rank their paper": the dark back corner, the reviewer under her lamp, the tower of papers beside her; she reads theirs',
      cam: { look: [5.85, -5.75, 1.3], az: 22, el: 4, d: 2.8, lens: 30, ky: 0.48 }, dof: { gain: 0.15 } },
    { at: at('l04', 'bottom', -6), n: 8, intent: 'tilt', why: '"in the bottom ten percent": tilt down the tower from its top to the very bottom, where theirs sticks out',
      cam: { look: [5.45, -5.8, 1.95], az: 20, el: 4, d: 2.2, lens: 32, ky: 0.45 }, to: { look: [5.45, -5.8, 1.0], az: 20, el: -2, d: 1.9, lens: 32, ky: 0.52 },
      move: { from: at('l04', 'bottom', -4), to: at('l04', 'ten', 6), ease: 'inout' }, kick: [{ at: at('l04', 'bottom', 4), amp: 0.4 }], dof: { gain: 0.2 } },
    { at: at('l05', 'the', -4), cut: 'dissolve', n: 8, intent: 'show-claim', why: '"The bug? Just a contaminant": low on the stage, Bram against the giant slide, scrubbing the bug off it',
      cam: { look: [-0.75, 5.45, 1.95], az: 35, el: -10, d: 3.0, lens: 28, ky: 0.5 }, dof: { gain: 0.1 } },
    { at: at('l05', 'harmless.', -8), n: 12, travel: 'rush', intent: 'irony', why: '"Harmless.": he turns to us and shrugs; behind him the bugs crawl back onto the slide',
      cam: { look: 'bram', up: -0.25, az: 14, el: -6, d: 2.7, lens: 30, ky: 0.48 }, dof: { gain: 0.1 } },
  ],
};

// l06 the animal house: six months fly off the calendar; he pours culture into the piglets' milk; they bounce about,
// perfectly well; he falls flat on his face; gets up, eeny-meeny over the piglets, and the finger turns on himself
const pigpen = {
  name: 'pigpen', set: 'pigpen', setModule: S('pigpen'), show: [{ from: at('l06', 'he', 3), dissolve: 10 }],
  light: { sun: [1.0, 0.92, 0.75], power: 3.0, sky: [0.85, 0.8, 0.7], ground: [0.7, 0.6, 0.4], hemi: 0.45, fill: [0.95, 0.9, 0.85], fillPower: 0.4, lit: [1.06, 1.0, 0.9], shade: [0.66, 0.66, 0.95], lamp: 0.4 },
  grade: { exp: 1.12, lift: 0.03, sat: 1.06 },
  cast: { kip: { spec: 'KAI', at: [-0.3, 0.25, 0], yaw: 20, expr: 'neutral', focus: 'camera', lead: true } },
  make: {
    ...anim('calendar', 'pigs', 'bowl'),
    straw: { kind: 'smoke', at: [-1.35, 0.3, 0.08], size: 0.42, count: 10, color: [0.93, 0.80, 0.45], life: 0.7, rise: 0.15, seed: 12, spread: 1.6 },
  },
  beats: [
    { ...at('l06', 'he', 0), ...sfx('whoosh', 0.5) },
    { ...at('l06', 'spends', -2), ...set('calendar', 'n', 6, 40, { ease: 'linear', sound: 'flutter', strength: 0.5 }) },
    { ...at('l06', 'six', -4), who: 'kip', look: 'calendar', expr: 'confused' },
    { ...at('l06', 'trying', -12), who: 'kip', do: 'turn_to', yaw: 90, dur: 8 },
    { ...at('l06', 'trying', -4), who: 'kip', do: 'pour', hold: 26, expr: 'suspicious', look: 'bowl' },
    { ...at('l06', 'piglets.', -2), ...set('bowl', 'green', 1, 12, { sound: 'pop', strength: 0.4 }) },
    { ...at('l06', 'infect', 0), ...set('pigs', 'trot', 1, 10) },
    // "It fails.": the piglets bounce about, perfectly well; he goes flat on his face in the straw
    { ...at('l06', 'it', -16), who: 'kip', do: 'turn_to', yaw: -80, dur: 6 },
    { ...at('l06', 'it', -8), who: 'kip', do: 'faceplant', hold: 22, expr: 'pain' },
    { ...at('l06', 'fails.', 4), ...fire('straw') },
    // "So, to win the argument, he picks one last test animal:": up, thinking, eeny-meeny over the pen...
    { ...at('l06', 'argument,', -6), who: 'kip', do: 'turn_to', yaw: 30, dur: 10 },
    { ...at('l06', 'argument,', -2), who: 'kip', do: 'think', hold: 14, expr: 'confused', look: 'pen' },
    { ...at('l06', 'picks', -4), who: 'kip', do: 'point', to: 'pig1', hold: 8, look: 'pig1', expr: 'suspicious' },
    { ...at('l06', 'last', -4), who: 'kip', do: 'point', to: 'pig2', hold: 8, look: 'pig2' },
    { ...at('l06', 'test', -2), who: 'kip', do: 'point', to: 'pig3', hold: 10, look: 'pig3' },
    // "himself.": the thumb turns on his own chest, the big grin
    { ...at('l06', 'animal:', 4), who: 'kip', look: 'camera', expr: 'suspicious' },
    { ...at('l06', 'himself.', -6), who: 'kip', do: 'thumb_self', hold: 24, expr: 'grin', look: 'camera', amp: 1.2 },
  ],
  direct: [
    { at: at('l06', 'he', -2), intent: 'time', why: '"six months": Kip by the pen, the calendar beside him shedding its pages',
      cam: { look: [-0.7, 1.0, 1.2], az: -4, el: 6, d: 4.6, lens: 26, ky: 0.5 } },
    { at: at('l06', 'trying', -8), n: 14, intent: 'act', why: '"trying to infect piglets": high over the trough as he pours the culture in and the piglets come running',
      cam: { look: [-0.05, 0.45, 0.75], az: 40, el: 34, d: 2.8, lens: 30, ky: 0.5 }, dof: { gain: 0.15 } },
    { at: at('l06', 'it', -12), n: 12, intent: 'gag', why: '"It fails.": low on the straw, side on: the piglets bounce, he goes down flat on his face',
      cam: { look: [-0.95, 0.25, 0.55], az: 2, el: -2, d: 3.3, lens: 26, ky: 0.55 } },
    { at: at('l06', 'so,', -4), n: 14, intent: 'anticipate', why: '"one last test animal": up again, eeny-meeny over the pen, a slow push while he picks',
      cam: { look: 'kip', up: -0.45, az: 20, el: 2, d: 3.4, lens: 30, ky: 0.48 }, to: { look: 'kip', up: -0.3, az: 12, el: 0, d: 2.6, lens: 32, ky: 0.45 }, move: { from: at('l06', 'one', -2), to: at('l06', 'animal:', 8), ease: 'inout' }, dof: { gain: 0.2 } },
    { at: at('l06', 'himself.', -8), n: 8, travel: 'rush', intent: 'payoff', why: '"himself.": a snap in, the answer is him', kick: [{ at: at('l06', 'himself.', 2), amp: 0.5 }],
      cam: { look: 'kip', up: -0.15, az: -8, el: -4, d: 1.9, lens: 38, ky: 0.42 }, dof: { gain: 0.35 } },
  ],
};

// l09 the kitchen, days later: out of the green cloud, a morning kiss; the breath rolls out, the flies buzz, she reels
// back holding her nose; then the sink, every morning, splash after splash, the days crossed off
const kitchen = {
  name: 'kitchen', set: 'kitchen', setModule: S('kitchen'), show: [{ from: at('l09', 'days', -4), dissolve: 12 }],
  light: { sun: [1.0, 0.88, 0.66], power: 3.2, sky: [0.95, 0.82, 0.62], ground: [0.65, 0.48, 0.32], hemi: 0.45, fill: [1, 0.9, 0.78], fillPower: 0.4, lit: [1.06, 0.99, 0.88], shade: [0.66, 0.62, 0.92], lamp: 0.5 },
  grade: { exp: 1.1, lift: 0.03, sat: 1.06 },
  cast: {
    kip: { spec: 'KAI', at: [-0.15, 0.25, 0], yaw: 35, expr: 'sleep', focus: 'mabel', lead: true },
    mabel: { spec: 'MABEL', at: [0.85, 0.15, 0], yaw: -45, expr: 'happy', focus: 'kip', lead: true },
  },
  make: {
    ...anim('breath', 'calendar', 'clock'),
    flies: { kind: 'ao_flies', at: { head: 'kip', up: 0.1 }, n: 5, r: 0.34 },
    splash: { kind: 'splash', at: [-1.6, 2.15, 0.86], size: 0.22, n: 12, color: GAS, seed: 4 },
  },
  beats: [
    { ...at('l09', 'days', -2), ...sfx('whoosh', 0.5) },
    { ...at('l09', 'days', -2), who: 'mabel', do: 'lean_in', hold: 24, expr: 'happy', look: 'kip' },
    { ...at('l09', 'wife', -2), who: 'kip', expr: 'happy', look: 'mabel' },
    { ...at('l09', 'breath', -6), ...set('breath', 'puff', 1, 36, { ease: 'linear', sound: 'hiss', strength: 0.6 }) },
    { ...at('l09', 'breath', -6), who: 'kip', do: 'present', hold: 20, expr: 'happy', look: 'mabel' },
    { ...at('l09', 'putrid.', -8), who: 'mabel', do: 'fan_nose', hold: 26, expr: 'disgust', look: 'kip' },
    { ...at('l09', 'putrid.', 6), who: 'kip', expr: 'confused', look: 'camera' },
    // "Then he's throwing up every morning.": the sink, side on; heave, splash; heave, splash; she taps her foot
    { ...at('l09', 'then', -6), who: 'kip', do: 'place', to: [-1.6, 1.55, 0], yaw: 180 },
    { ...at('l09', 'then', -6), who: 'mabel', do: 'place', to: [-2.6, 1.15, 0], yaw: 70 },
    { ...at('l09', 'then', -4), who: 'kip', do: 'retch', hold: 56, expr: 'pain' },
    { ...at('l09', 'then', -4), who: 'mabel', do: 'arms_crossed', hold: 22, expr: 'disgust', look: 'kip' },
    { ...at('l09', 'every', -4), who: 'mabel', do: 'fan_nose', hold: 30, expr: 'disgust', look: 'kip' },
    { ...at('l09', 'then', 13), ...fire('splash') }, { ...at('l09', 'then', 13), ...sfx('poof', 0.5) },
    { ...at('l09', 'then', 28), ...fire('splash') }, { ...at('l09', 'then', 28), ...sfx('poof', 0.5) },
    { ...at('l09', 'then', 43), ...fire('splash') }, { ...at('l09', 'then', 43), ...sfx('poof', 0.5) },
    { ...at('l09', 'throwing', -2), ...set('calendar', 'days', 7, 36, { ease: 'linear' }) },
    { ...at('l09', 'throwing', -2), ...set('clock', 'spin', 1, 36, { ease: 'linear', sound: 'tick', strength: 0.4 }) },
  ],
  direct: [
    { at: at('l09', 'days', -6), intent: 'two-shot', why: '"Days later": out of the green cloud, the two at breakfast in profile, so the stink can travel from him to her',
      cam: { look: [0.35, 0.2, 1.3], az: 0, el: 2, d: 3.1, lens: 32, ky: 0.48 }, dof: { gain: 0.15 } },
    { at: at('l09', 'putrid.', -6), n: 10, travel: 'rush', intent: 'react', why: '"putrid": rush in on her as she reels back, nose pinched, fanning', kick: [{ at: at('l09', 'putrid.', 0), amp: 0.3 }],
      cam: { look: 'mabel', up: -0.25, az: -28, el: 0, d: 2.4, lens: 34, ky: 0.45 }, dof: { gain: 0.25 } },
    { at: at('l09', 'then', -6), cut: 'dissolve', n: 10, intent: 'montage-in-one', why: '"every morning": time skips; side on at the sink: heave, splash, the days crossed off, the clock spinning, her foot tapping',
      cam: { look: [-1.35, 1.75, 1.05], az: 58, el: 8, d: 3.6, lens: 28, ky: 0.5 } },
  ],
};

// l10-l13 the clinic: "Wait." (the one hard cut); the endoscope fed down his throat; red cracks across the inflamed
// lining; the biopsy blooms; "not stress" wagged at the surgeon; pill bombs; a high five; no surgery
const clinic = {
  name: 'clinic', set: 'clinic', setModule: S('clinic'), show: [{ from: at('l10', 'wait.', -2), dissolve: 1 }],
  light: { sun: [1.0, 0.98, 0.94], power: 2.6, sky: [0.8, 0.88, 0.95], ground: [0.6, 0.58, 0.55], hemi: 0.5, fill: [0.92, 0.96, 1.0], fillPower: 0.45, lit: [1.04, 1.02, 0.98], shade: [0.64, 0.7, 1.0], lamp: 0.4 },
  grade: { exp: 0.97, lift: 0.0, sat: 1.08 },
  cast: {
    kip: { spec: 'KAI', at: [-0.6, 0.75, 0], yaw: 55, expr: 'nervous', focus: 'warren', lead: true },
    warren: { spec: 'WARREN', at: [0.35, 0.7, 0], yaw: -58, expr: 'calm', focus: 'kip', lead: true },
    bram: { spec: 'BRAM', at: [3.2, 0.75, 0], yaw: -35, expr: 'smug', focus: 'surgery' },
  },
  make: {
    ...anim('screen', 'biopsy', 'surgery', 'lining', 'bugs', 'pills', 'ulcer'),
    tube: { kind: 'ao_tube', from: [1.3, 1.6, 1.0], via: { head: 'warren', up: -0.32, fwd: 0.42 }, to: { head: 'kip', up: -0.17, fwd: 0.24 }, sag: 0.35, r: 0.026 },
    crack: { kind: 'crack', at: [-2.62, 0.98, 1.45], size: 0.55, branches: 10, color: [1.0, 0.16, 0.08], glowK: 2.0, face: 'wall', dust: false, width: 0.07, seed: 5 },
    boom1: { kind: 'explosion', at: [-2.78, 1.0, 1.62], size: 0.16, debris: 6, chunk: [0.35, 0.75, 0.25], smokeColor: [0.95, 0.95, 0.9], life: 1.0, seed: 3 },
    boom2: { kind: 'explosion', at: [-2.45, 1.0, 1.35], size: 0.16, debris: 6, chunk: [0.35, 0.75, 0.25], smokeColor: [0.95, 0.95, 0.9], life: 1.0, seed: 5 },
    boom3: { kind: 'explosion', at: [-2.65, 1.0, 1.15], size: 0.18, debris: 6, chunk: [0.35, 0.75, 0.25], smokeColor: [0.95, 0.95, 0.9], life: 1.0, seed: 7 },
  },
  beats: [
    { ...at('l10', 'wait.', -2), who: 'kip', expr: 'shock', look: 'camera', mark: 'exclaim' },
    { ...at('l10', 'wait.', -2), ...set('tube', 'show', 1) }, { ...at('l10', 'wait.', -2), ...set('tube', 'feed', 0) },
    { ...at('l10', 'wait.', -2), who: 'warren', expr: 'stern', look: 'kip' },
    // "A camera down his throat": hand over hand, the tube goes in and in; head back, arms flapping
    { ...at('l10', 'a', -4), who: 'warren', do: 'feed_tube', hold: 30, look: 'kip' },
    { ...at('l10', 'camera', -6), who: 'kip', do: 'gag_tube', hold: 30, expr: 'panic' },
    { ...at('l10', 'camera', -4), ...set('tube', 'feed', 1, 22, { ease: 'linear', sound: 'scratch', strength: 0.5 }) },
    { ...at('l10', 'down', -2), ...sfx('whoosh', 0.6) },
    { ...at('l10', 'finds', -6), ...set('screen', 'show', 1, 8, { sound: 'blip', strength: 0.5 }) },
    // to the model (the dissolve hides the move): the lining goes red and cracks spread over it
    { ...at('l10', 'stomach', -4), ...set('tube', 'show', 0) },
    { ...at('l10', 'stomach', -4), who: 'kip', do: 'place', to: [-1.85, 0.35, 0], yaw: -55 },
    { ...at('l10', 'stomach', -4), who: 'warren', do: 'place', to: [-3.35, 0.35, 0], yaw: 40 },
    { ...at('l10', 'stomach', 0), who: 'warren', do: 'point_lean', to: [-2.6, 0.9, 1.4], hold: 24, expr: 'suspicious', look: 'lining' },
    { ...at('l10', 'stomach', 2), who: 'kip', do: 'clutch', hold: 20, expr: 'pain', look: 'lining' },
    { ...at('l10', 'inflamed.', -6), ...set('lining', 'inflame', 1, 14, { sound: 'sizzle', strength: 0.6 }) },
    { ...at('l10', 'inflamed.', -2), ...fire('crack') },
    // the biopsy bench: Warren bent close over the dish under the lamp, the spirals bloom, he jumps back
    { ...at('l10', 'the', -4), who: 'warren', do: 'place', to: [1.85, 1.45, 0], yaw: 0 },
    { ...at('l10', 'the', -2), who: 'warren', do: 'peer', hold: 34, expr: 'suspicious', look: 'biopsy' },
    { ...at('l10', 'grows', -6), ...set('biopsy', 'grow', 1, 30, { sound: 'blip', strength: 0.4 }) },
    { ...at('l10', 'bug.', -4), who: 'warren', do: 'startle', expr: 'shock', mark: 'exclaim', hold: 14 },
    // l11 back at the model: "You see," Kip lectures; the bugs crawl in and dig the crater
    { ...at('l11', 'you', -6), who: 'warren', do: 'place', to: [-3.35, 0.35, 0], yaw: 40 },
    { ...at('l11', 'you', -2), who: 'kip', do: 'present', hold: 12, expr: 'happy', look: 'camera' },
    { ...at('l11', 'bug', -4), ...set('bugs', 'grow', 1, 34, { sound: 'blip', strength: 0.4 }) },
    { ...at('l11', 'bug', -2), who: 'kip', do: 'point_lean', to: [-2.5, 0.95, 1.35], hold: 26, expr: 'suspicious', look: 'lining' },
    { ...at('l11', 'ulcers,', -4), ...set('lining', 'ulcer', 1, 12, { sound: 'thud', strength: 0.6 }) },
    // "not stress.": he wags a finger across the room at the surgeon who said stress; the surgeon's face falls
    { ...at('l11', 'not', -8), who: 'kip', do: 'turn_to', yaw: 75, dur: 8 },
    { ...at('l11', 'not', -4), who: 'kip', do: 'wag_finger', hold: 20, expr: 'stern', look: 'bram' },
    { ...at('l11', 'not', -4), who: 'bram', expr: 'smug', look: 'kip' },
    { ...at('l11', 'stress.', -2), who: 'bram', do: 'lean_away', hold: 16, expr: 'shock', look: 'kip' },
    // "It keeps the stomach lining inflamed.": back at the model, the red lining throbs; he winces, Warren nods
    { ...at('l11', 'it', -8), who: 'kip', do: 'turn_to', yaw: -55, dur: 8 },
    { ...at('l11', 'keeps', -4), who: 'kip', do: 'clutch', hold: 18, expr: 'pain', look: 'lining' },
    { ...at('l11', 'it', -2), who: 'warren', do: 'nod', hold: 22, expr: 'calm', look: 'lining' },
    // l12 "Kill the bug,": pills dropped in like bombs; boom, boom, boom, the bugs pop
    { ...at('l12', 'kill', -10), who: 'kip', do: 'place', to: [-1.85, 0.05, 0], yaw: -60 },
    { ...at('l12', 'kill', -10), who: 'warren', do: 'place', to: [-3.4, 0.05, 0], yaw: 60 },
    { ...at('l12', 'heals', -16), who: 'kip', do: 'walk_to', to: [-2.15, 0.2, 0], style: 'brisk' }, { ...at('l12', 'heals', -16), who: 'warren', do: 'walk_to', to: [-3.15, 0.2, 0], style: 'brisk' },
    { ...at('l12', 'kill', -6), who: 'kip', do: 'point', to: [-3.0, 0.8, 2.0], hold: 20, expr: 'excited', look: 'lining' },
    { ...at('l12', 'kill', -6), ...set('pills', 'drop', 1, 40, { ease: 'linear', sound: 'whoosh', strength: 0.6 }) },
    { ...at('l12', 'bug,', -6), ...fire('boom1') }, { ...at('l12', 'bug,', 0), ...fire('boom2') }, { ...at('l12', 'and', 2), ...fire('boom3') },
    { ...at('l12', 'bug,', -6), ...sfx('thud', 0.7) }, { ...at('l12', 'bug,', 0), ...sfx('thud', 0.7) }, { ...at('l12', 'and', 2), ...sfx('thud', 0.7) },
    { ...at('l12', 'bug,', -6), ...set('bugs', 'kill', 1, 16, { sound: 'pop', strength: 0.6 }) },
    // "and the ulcer heals for good.": the pink comes back; a high five over the model
    { ...at('l12', 'heals', -4), ...set('lining', 'heal', 1, 22, { sound: 'ding', strength: 0.5 }) },
    { ...at('l12', 'heals', -4), who: 'kip', do: 'reach', hand: 'L', to: [-2.65, 0.25, 1.85], dur: 8, expr: 'excited', look: 'warren' },
    { ...at('l12', 'heals', -4), who: 'warren', do: 'reach', hand: 'R', to: [-2.65, 0.25, 1.85], dur: 8, expr: 'happy', look: 'kip' },
    { ...at('l12', 'heals', 4), ...sfx('pop', 0.7) },
    { ...at('l12', 'for', -2), who: 'kip', do: 'cheer_fist', hold: 18, expr: 'excited', look: 'camera' },
    { ...at('l12', 'for', 0), who: 'warren', do: 'celebrate', hold: 18, expr: 'happy' },
    // l13 "Two weeks of pills.": the 14-day pack held up, one popped back
    { ...at('l13', 'two', -8), who: 'kip', do: 'turn_to', yaw: -10, dur: 6 },
    { ...at('l13', 'two', -6), who: 'kip', do: 'show_pills', expr: 'proud', look: 'camera', hold: 14 },
    { ...at('l13', 'pills.', 0), who: 'kip', do: 'pop_pill', expr: 'happy', look: 'camera' },
    // "No surgery.": whip to the surgeon, his lamp goes out, he slumps
    { ...at('l13', 'no', -6), ...sfx('whoosh', 0.6) },
    { ...at('l13', 'no', -2), ...set('surgery', 'lamp', 0, 3, { sound: 'clunk', strength: 0.7 }) },
    { ...at('l13', 'no', -6), who: 'bram', do: 'slump', expr: 'sad', look: 'surgery' },
  ],
  direct: [
    { at: at('l10', 'wait.', -2), cut: 'cut', intent: 'stop', why: '"Wait.": the one hard cut of the film, held: patient and doctor in profile, the endoscope already in the doctor\'s hands',
      cam: { look: [-0.2, 0.7, 1.25], az: 0, el: 2, d: 3.5, lens: 30, ky: 0.5 } },
    { at: at('l10', 'camera', -6), n: 12, intent: 'act', why: '"A camera down his throat": low and closer, the tube going in hand over hand, his arms flapping',
      cam: { look: [-0.22, 0.7, 1.35], az: 8, el: -8, d: 2.8, lens: 32, ky: 0.48 }, dof: { gain: 0.15 } },
    { at: at('l10', 'finds', -8), n: 12, intent: 'go-inside', why: '"finds his stomach": travel to the monitor as it lights, then push into it',
      cam: { look: 'screen', az: 28, el: 3, d: 1.7, lens: 38, ky: 0.5 }, to: { look: 'screen', az: 18, el: 1, d: 0.3, lens: 38, ky: 0.5 }, move: { from: at('l10', 'finds', -2), to: at('l10', 'stomach', -4), ease: 'in' } },
    { at: at('l10', 'stomach', -4), cut: 'dissolve', n: 8, intent: 'show-inside', why: '"inflamed": out of the screen onto the big model; Warren points, the lining goes red and cracks spread over it',
      cam: { look: [-2.6, 0.75, 1.4], az: 6, el: 4, d: 2.7, lens: 30, ky: 0.5 } },
    { at: at('l10', 'the', -4), cut: 'dissolve', n: 8, intent: 'act', why: '"The biopsy grows the spiral bug": high over the dish under the lamp, Warren bent close; on "bug" he jumps back',
      cam: { look: [1.8, 0.85, 1.15], az: -8, el: 36, d: 2.3, lens: 32, ky: 0.5 }, dof: { gain: 0.2 } },
    { at: at('l11', 'you', -4), cut: 'dissolve', n: 8, intent: 'explain', why: '"You see, the bug": Kip lectures at the model as the bugs crawl in and dig the crater',
      cam: { look: [-2.45, 0.6, 1.4], az: 10, el: 4, d: 3.0, lens: 30, ky: 0.5 } },
    { at: at('l11', 'not', -4), n: 14, intent: 'follow', why: '"not stress.": travel with the wagging finger across the room to the surgeon who believed in stress',
      cam: { look: 'bram', up: -0.25, az: -14, el: 2, d: 2.8, lens: 32, ky: 0.48 }, dof: { gain: 0.15 } },
    { at: at('l11', 'it', -6), n: 14, intent: 'act', why: '"It keeps the stomach lining inflamed": back to the model, the red lining throbs, he winces',
      cam: { look: [-2.5, 0.6, 1.4], az: 6, el: 4, d: 2.8, lens: 30, ky: 0.5 } },
    { at: at('l12', 'kill', -8), n: 10, travel: 'rush', intent: 'high-angle', why: '"Kill the bug": high over the open model as the pills drop like bombs and burst on the bugs',
      cam: { look: [-2.62, 0.9, 1.4], az: 0, el: 36, d: 2.0, lens: 30, ky: 0.5 }, kick: [{ at: at('l12', 'bug,', -6), amp: 0.4 }, { at: at('l12', 'bug,', 0), amp: 0.4 }] },
    { at: at('l12', 'heals', -6), n: 12, intent: 'payoff', why: '"heals for good": back out front, the pink comes back, the high five over the model',
      cam: { look: [-2.62, 0.3, 1.5], az: 4, el: 0, d: 2.9, lens: 30, ky: 0.5 } },
    { at: at('l13', 'two', -8), n: 10, intent: 'show', why: '"Two weeks of pills": the 14-day pack held up to us, one popped back',
      cam: { look: 'kip', up: -0.2, az: -8, el: -2, d: 2.3, lens: 34, ky: 0.45 }, dof: { gain: 0.2 } },
    { at: at('l13', 'no', -4), cut: 'whip', n: 8, intent: 'react', why: '"No surgery.": whip across the room to the surgeon, his lamp goes out, he slumps',
      cam: { look: [2.95, 0.85, 1.2], az: -12, el: 10, d: 2.8, lens: 32, ky: 0.5 } },
  ],
};

// l14 Stockholm 2005: the hall; "that putrid drink" a little green burp (the motif); "the doctor they laughed at": the
// doubter in the front row faints flat on his back and Mabel laughs at him; the medal, confetti and sparks on "Prize."
const nobel = {
  name: 'nobel', set: 'nobel', setModule: S('nobel'), show: [{ from: at('l14', 'twenty-one', 5), dissolve: 10 }],
  light: { sun: [1.0, 0.9, 0.72], power: 2.4, sky: [0.45, 0.5, 0.85], ground: [0.3, 0.24, 0.22], hemi: 0.4, fill: [0.8, 0.85, 1], fillPower: 0.45, lit: [1.08, 1.0, 0.9], shade: [0.55, 0.6, 1.0], lamp: 0.5, rim: 1 },
  grade: { exp: 1.16, lift: 0.04, sat: 1.1 },
  cast: {
    kip: { spec: 'KAI', at: [-0.2, 1.0, 0.8], yaw: 0, expr: 'happy', focus: 'camera', lead: true },
    warren: { spec: 'WARREN', at: [-1.2, 1.35, 0.8], yaw: 15, expr: 'happy', focus: 'kip' },
    bram: { spec: 'BRAM', at: [1.0, -0.95, 0], yaw: 190, expr: 'smug', focus: 'kip', lead: true },
    mabel: { spec: 'MABEL', at: [0.05, -0.95, 0], yaw: 165, expr: 'excited', focus: 'kip' },
  },
  make: {
    ...anim('show', 'banner'), medal: { kind: 'ao_follow', prop: 'medal', at: { head: 'kip', up: -0.6, fwd: 0.3 } },
    burp: { kind: 'smoke', at: { head: 'kip', up: -0.32, fwd: 0.36 }, size: 0.2, count: 8, color: GAS, life: 0.4, rise: 0.15, seed: 11 },
    sparks: { kind: 'sparks', at: { head: 'kip', up: -0.55, fwd: 0.35 }, n: 28, speed: 2.4, color: [1.0, 0.84, 0.32], life: 0.9, seed: 14, light: { rgb: [1, 0.85, 0.45], power: 3, dist: 3 } },
  },
  beats: [
    { ...at('l14', 'twenty-one', 0), ...sfx('whoosh', 0.5) },
    // "after that putrid drink,": the motif comes back: a small green burp, he blushes
    { ...at('l14', 'that', -6), who: 'kip', do: 'pat_belly', hold: 16, expr: 'blush', look: 'camera' },
    { ...at('l14', 'that', -2), ...fire('burp') }, { ...at('l14', 'that', -2), who: 'kip', do: 'sound', name: 'pop', strength: 0.4 },
    { ...at('l14', 'doctor', -8), ...set('show', 'spot', 1, 6, { sound: 'clunk', strength: 0.6 }) },
    // "the doctor they laughed at": the doubter faints flat on his back; the wife who smelt it all laughs at him
    { ...at('l14', 'laughed', -6), ...sfx('whoosh', 0.5) },
    { ...at('l14', 'doctor', 2), who: 'bram', expr: 'shock', look: 'kip' },
    { ...at('l14', 'they', -4), who: 'bram', do: 'faint', deg: -72, hold: 60, expr: 'dizzy', mark: 'stars' },
    { ...at('l14', 'laughed', -2), who: 'mabel', do: 'point_laugh', to: [1.0, -2.1, 0.4], hold: 30, expr: 'laugh', look: 'bram' },
    // "collects the Nobel Prize.": the medal comes down onto him, a fist pump, confetti, gold sparks on the last word
    { ...at('l14', 'collects', -8), ...sfx('whoosh', 0.6) },
    { ...at('l14', 'collects', -6), ...set('medal', 'on', 1, 12, { ease: 'out', sound: 'ting', strength: 0.5 }) },
    { ...at('l14', 'collects', -2), who: 'kip', do: 'cheer_fist', hold: 20, expr: 'proud', look: 'camera' },
    { ...at('l14', 'collects', 0), who: 'warren', do: 'celebrate', hold: 30, expr: 'happy' },
    { ...at('l14', 'nobel', -4), ...set('show', 'fall', 1, 60, { ease: 'linear' }) },
    { ...at('l14', 'prize.', -2), ...fire('sparks') },
    { ...at('l14', 'prize.', -2), who: 'medal', do: 'pulse', key: 'glint', amp: 1, dur: 12 },
    { ...at('l14', 'prize.', -2), who: 'kip', do: 'sound', name: 'ding', strength: 0.9 },
  ],
  direct: [
    { at: at('l14', 'twenty-one', -4), intent: 'establish', why: '"Twenty-one years after": the jump in time is the whole hall at once; the camera settles in as the years pass',
      cam: { look: [0, 2.2, 2.4], az: 0, el: 9, d: 11.5, lens: 26, ky: 0.5 }, to: { look: [0, 2.0, 2.1], az: 0, el: 5, d: 8.0, lens: 26, ky: 0.5 }, move: { dur: 45, ease: 'inout' } },
    { at: at('l14', 'after', -2), n: 14, intent: 'callback', why: '"that putrid drink": low and closer on him: the little green burp, the blush (the motif comes back)',
      cam: { look: 'kip.chest', up: 0.1, az: -25, el: -4, d: 2.8, lens: 32, ky: 0.48 }, dof: { gain: 0.15 } },
    { at: at('l14', 'they', -10), cut: 'dissolve', n: 14, intent: 'react', why: '"they laughed at": from the stage down onto the front row: the doubter faints back into the seats, the wife points and laughs',
      cam: { look: [0.6, -1.65, 0.7], az: 142, el: 22, d: 3.1, lens: 28, ky: 0.52 }, dof: { gain: 0.1 } },
    { at: at('l14', 'collects', -6), cut: 'dissolve', n: 8, intent: 'payoff', why: '"collects the Nobel Prize": back up to him as the medal comes down; on "Prize" the camera lands on it in the sparks',
      cam: { look: 'kip.chest', az: -30, el: 6, d: 1.9, lens: 32, ky: 0.5 }, to: { look: 'medal', up: 0.05, az: -18, el: 0, d: 1.5, lens: 40, ky: 0.5 }, move: { from: at('l14', 'nobel', -2), to: at('l14', 'prize.', 4), ease: 'land' }, kick: [{ at: at('l14', 'prize.', 0), amp: 0.35 }], dof: { gain: 0.3 } },
  ],
};

export default {
  title: 'The Doctor Who Drank the Bug, acts 2-8',
  frames: [96, 1949],
  lines: ['l02', 'l03', 'l04', 'l05', 'l06', 'l07', 'l08', 'l09', 'l10', 'l11', 'l12', 'l13', 'l14'],
  acts: [perth, labday, micro, hall, pigpen, kitchen, clinic, nobel],
  amend: [],
};
