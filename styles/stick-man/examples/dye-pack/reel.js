// stick01 "dye pack", lines l01-l04 (frames 0-344). Data only: beats name a word, the runtime does the timing.
export default {
  title: 'Dye pack',
  fps: 30,
  frames: [0, 344],
  set: 'bank-lobby',
  lines: ['l01', 'l02', 'l03', 'l04'],
  cast: {
    kai: { spec: 'KAI', at: 'customer', yaw: 20, expr: 'smug', focus: 'teller' },
    teller: { spec: 'TELLER', at: 'teller', yaw: -35, expr: 'calm', focus: 'kai' },
    guard: { spec: 'GUARD', at: 'bench', yaw: -100, posture: 'sit', expr: 'sleep', watch: false, focus: 'camera', head_tilt: 14 },
  },
  beats: [
    // frame 0 is already mid-action: bag held open on the counter, left hand pinning the note
    { f: 0, who: 'kai', do: 'hold', prop: 'bag', hand: 'R', to: 'bag_grip', offW: [0.10, -0.03, -0.01], fade: 0 },
    { f: 0, who: 'kai', do: 'reach', hand: 'L', to: { prop: 'note' }, dur: 0 },
    // l01 He robs a bank, and the teller HELPS him pack the bag.
    { line: 'l01', on: 'robs', who: 'kai', do: 'slide', prop: 'note', hand: 'L', to: 'note_end', handOn: true },
    { line: 'l01', on: 'bank', who: 'kai', expr: 'sly' },
    { line: 'l01', on: 'bank', who: 'teller', look: 'note' },
    { line: 'l01', on: 'teller', who: 'teller', expr: 'happy', do: 'gesture', kind: 'tilt', deg: -7, hold: 30 },
    { line: 'l01', on: 'helps', offset: -8, who: 'teller', do: 'drop_in', prop: 'b1', hand: 'L', look: 'kai' },
    { line: 'l01', on: 'helps', who: 'kai', expr: 'grin' },
    { line: 'l01', on: 'pack', offset: -6, who: 'teller', do: 'drop_in', prop: 'b2', hand: 'L' },
    { line: 'l01', on: 'bag', who: 'kai', do: 'gesture', kind: 'nod' },
    // l02 She doesn't scream. She smiles, lifts a stack of twenties off a little metal plate, and drops it in.
    { line: 'l02', on: 'scream', who: 'teller', expr: 'calm', look: 'camera' },
    { line: 'l02', on: 'scream', who: 'kai', expr: 'smug' },
    { line: 'l02', on: 'smiles', who: 'teller', expr: 'closed', do: 'gesture', kind: 'tilt', deg: 10, hold: 22 },
    { line: 'l02', on: 'lifts', who: 'teller', expr: 'happy', do: 'lift', prop: 'stack', hand: 'L', up: 0.26 },
    { line: 'l02', on: 'twenties', who: 'teller', expr: 'closed', do: 'gesture', kind: 'nod' },
    { line: 'l02', on: 'plate', who: 'plate', do: 'glint' },
    { line: 'l02', on: 'plate', who: 'teller', expr: 'happy', look: 'kai' },
    { line: 'l02', on: 'drops', offset: -4, who: 'teller', do: 'drop_in', prop: 'stack', hand: 'L', strength: 1.0 },
    { line: 'l02', on: 'drops', who: 'kai', expr: 'grin' },
    // l03 "Have a lovely day."
    { line: 'l03', on: 'have', who: 'teller', expr: 'happy', do: 'talk', look: 'kai' },
    { line: 'l03', on: 'have', offset: -6, who: 'teller', do: 'turn_to', yaw: -80 },
    { line: 'l03', on: 'lovely', who: 'teller', do: 'gesture', kind: 'finger_wave', hand: 'R' },
    { line: 'l03', on: 'day', who: 'teller', expr: 'closed' },
    { line: 'l03', on: 'day', who: 'kai', do: 'hold', prop: 'bag', hand: 'R', to: { l: [0.50, 1.45, 0.30] }, off: [0, -0.02, 0], fade: 12 },
    // l04 Easiest money he's ever made. He strolls out the door.
    { line: 'l04', on: 'easiest', who: 'kai', expr: 'grin', look: 'camera' },
    // he strolls off on "Easiest": the bag in his right hand, slung over the shoulder a step later
    { line: 'l04', on: 'easiest', who: 'kai', do: 'walk_to', to: 'street', style: 'stroll', carry: 'R', cheat: 35 },
    { line: 'l04', on: 'money', who: 'kai', do: 'sling', prop: 'bag', hand: 'R' },
    { line: 'l04', on: 'easiest', who: 'teller', expr: 'happy' },
    // the wave waits for the finger-wave hand to come down first (on "Easiest" its rest move would cut the wave short)
    { line: 'l04', on: 'money', who: 'teller', do: 'gesture', kind: 'wave', hand: 'R' },
    { line: 'l04', on: 'door', who: 'sensor', do: 'blink' },
  ],
  shots: [
    { f: 0, shot: 'two', of: ['kai', 'teller'], angle: -26 },
    { line: 'l02', on: 'she', shot: 'cu', of: ['teller'], with: ['plate', 'stack'], angle: 30 },
    { line: 'l02', on: 'drops', offset: -6, shot: 'cu', of: ['teller'], with: ['plate', 'bag'], angle: 22 },
    { line: 'l03', on: 'have', offset: -10, shot: 'cu', of: ['teller'], angle: 16, head: 0.16, lens: 40 },
    { line: 'l03', on: 'lovely', shot: 'ms', of: ['kai'], angle: 45, heading: -90, glide: 40, size: 0.42 },
    { line: 'l04', on: 'strolls', shot: 'follow', of: ['kai'], angle: 40, size: 0.41, heading: -90 },
  ],
};
