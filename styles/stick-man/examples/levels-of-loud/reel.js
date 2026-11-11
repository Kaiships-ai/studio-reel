// stick07-levels (forensic fixes 1-10 on stick06-levels). stick06-levels: combined kit. Q4 sets / physical fx data + Q2 body acting and faces (merged from stick05-q4-levels and stick05-q2-levels).
// Act 1 (l01, the hook) on the Halden City street. Data only: beats name a word.
const at = (line, on, offset = -2, nth) => ({ line, on, offset, ...(nth ? { nth } : {}) });
export default {
  title: 'Levels of loud',
  fps: 30,
  glasses: false,                 // stick06: no rims, so brows and eye shapes carry the faces
  frames: [0, 115],
  set: 'halden-street',
  grade: { exp: 1.02, tint: [1.03, 1.0, 0.95] },   // stick07: bright noon street
  name: 'hook',
  zRange: [1.1, 1.9],
  lines: ['l01'],
  cast: {
    kai: { spec: 'KAI', at: 'center', yaw: 0, expr: 'shock', focus: 'camera' },
    otis: { spec: 'OTIS', at: 'right', yaw: -30, expr: 'pain', focus: 'kai', lead: true },
  },
  make: {
    // the blast: a dust ring and flying leaves race over the pavement (in the world, not drawn rings)
    // the pavement splits under him
    split: { kind: 'crack', at: [-3.85, -2.45, 0.016], face: 'ground', size: 1.9, branches: 9, width: 0.04, color: [1.0, 0.12, 0.06], glowK: 1.3 },
    // the shop window behind him bursts out
    pane: { kind: 'shatter', at: [-5.9, -1.3, 0.75], w: 1.5, h: 1.4, n: 26, ground: -0.74, push: 1.8, show: 0 },
    boom: { kind: 'shock', at: [-3.6, -2.6, 0.02], size: 2.2, n: 16, bits: 14 },
    // a real signpost rises out of the pavement behind his shoulder
    miles: { kind: 'sign', style: 'post', at: [-4.46, -1.92, 0], text: '3,000 MI', sub: 'TO KRAKATOA', w: 0.42, h: 0.3, pole: 1.32, bg: [0.08, 0.40, 0.20], fg: [1, 1, 1], face: true },
    // five real speaker stacks, each taller: the five levels
    levels: { kind: 'speakers', at: [-5.0, -1.55, 0], n: 5, step: 0.27, h0: 0.22, dh: 0.2, labels: ['1', '2', '3', '4', '5'], yaw: 12 },
    five: { kind: 'sign', style: 'hang', at: [-5.0, -1.55, 1.55], text: '5 LEVELS', w: 0.9, h: 0.26, bg: [1.0, 0.80, 0.16], fg: [0.05, 0.05, 0.06], yaw: 12, drop: 1.6 },
  },
  beats: [
    // frame 0 lands mid-jump: the blast rings already rolling in, Kai flung back
    { f: -12, who: 'boom', do: 'fire' },
    { f: -8, who: 'kai', do: 'startle', expr: 'shock', look: 'camera', hold: 20 },
    { f: -6, who: 'split', do: 'fire' },
    { f: -9, who: 'pane', do: 'fire' },
    { f: 0, who: 'screen', do: 'sound', name: 'sting', strength: 0.6 },
    { ...at('l01', 'levels'), who: 'levels', do: 'set', key: 'grow', to: 1, dur: 18, from: 0, ease: 'linear', sound: 'slide_whistle_up', strength: 0.5 },
    { ...at('l01', 'levels'), who: 'levels', do: 'set', key: 'pump', to: 1, dur: 10, from: 0 },
    { ...at('l01', 'levels'), who: 'five', do: 'set', key: 'show', to: 1, from: 0, dur: 8, ease: 'linear', sound: 'pop', strength: 0.5 },
    { ...at('l01', 'levels'), who: 'five', do: 'fire' },
    { ...at('l01', 'heard'), who: 'boom', do: 'fire', sound: 'ping', strength: 0.4 },
    { ...at('l01', 'thousand', -3), who: 'miles', do: 'set', key: 'show', to: 1, from: 0, dur: 9, ease: 'linear', sound: 'ding', strength: 0.5 },
    { ...at('l01', 'thousand', 6), who: 'miles', do: 'fire' },
    { ...at('l01', 'loud', -4), who: 'otis', expr: 'pain', look: 'kai', do: 'cover_ears' },
    { ...at('l01', 'and'), who: 'kai', expr: 'nervous', look: 'otis' },
    { ...at('l01', 'level', -6, 1), who: 'kai', expr: 'sly', look: 'camera', do: 'present' },
    { ...at('l01', 'heard', -5), who: 'kai', expr: 'excited', do: 'cup_ear', hand: 'L', amp: 0.6 },
    { ...at('l01', 'five', -2, 1), who: 'otis', expr: 'suspicious', look: 'kai', do: 'arms_crossed' },
    { ...at('l01', 'thousand', -5), who: 'kai', expr: 'shock', look: 'miles' },
    { ...at('l01', 'miles', -4), who: 'kai', do: 'arms_wide', expr: 'manic', look: 'camera' },
  ],
  shots: [],   // stick07: planned (engine/shotplan.js): establishing open, a rush by frame 18
};
