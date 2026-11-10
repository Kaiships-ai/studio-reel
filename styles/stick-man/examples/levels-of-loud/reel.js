// stick04-levels-of-loud, act 1 (l01, the hook) on the Halden City street. Data only: beats name a word.
const at = (line, on, offset = -2, nth) => ({ line, on, offset, ...(nth ? { nth } : {}) });
export default {
  title: 'Levels of loud',
  fps: 30,
  frames: [0, 115],
  set: 'halden-street',
  name: 'hook',
  zRange: [1.1, 1.9],
  lines: ['l01'],
  cast: {
    kai: { spec: 'KAI', at: 'center', yaw: 0, expr: 'shock', focus: 'camera' },
    otis: { spec: 'OTIS', at: 'right', yaw: -30, expr: 'neutral', focus: 'kai' },
  },
  make: {
    boom: { kind: 'rings', from: [-1.4, -3.4, 1.7], to: { head: 'kai' }, r0: 0.08, r1: 0.45 },
    loud: { kind: 'stamp', at: { head: 'kai', up: 0.42, side: -0.42, fwd: 0.05 }, text: 'LOUD!', h: 0.42, tilt: -8, life: 1.3 },
    miles: { kind: 'stamp', at: { head: 'kai', up: 0.34, side: 0, fwd: 0.05 }, text: '3,000 MILES AWAY', h: 0.15, tilt: 6, life: 2.0 },
    levels: { kind: 'bars', at: [-4.6, -2.25, 0.05], values: [30, 60, 85, 120, 170], labels: ['1', '2', '3', '4', '5'], unit: '', h: 1.0, w: 0.12, gap: 0.04, colors: [[0.30, 0.60, 1.0], [0.40, 0.80, 0.45], [1.0, 0.80, 0.20], [1.0, 0.55, 0.15], [0.95, 0.25, 0.20]] },
    five: { kind: 'stamp', at: [-4.6, -2.25, 1.38], text: '5 LEVELS', h: 0.22, tilt: -5, life: 1.2 },
  },
  beats: [
    // frame 0 lands mid-jump: the blast rings already rolling in, Kai flung back
    { f: -12, who: 'boom', do: 'fire' },
    { f: -8, who: 'kai', do: 'startle', expr: 'shock', look: 'camera', hold: 20 },
    { f: -3, who: 'loud', do: 'fire' },
    { f: 0, who: 'screen', do: 'sound', name: 'sting', strength: 0.6 },
    { f: 0, who: 'levels', do: 'set', key: 'show', to: 1, dur: 6, from: 0, ease: 'back' },
    { ...at('l01', 'levels'), who: 'levels', do: 'set', key: 'grow', to: 1, dur: 18, from: 0, ease: 'smoother', sound: 'slide_whistle_up', strength: 0.5 },
    { ...at('l01', 'levels'), who: 'five', do: 'fire', sound: 'pop', strength: 0.5 },
    { ...at('l01', 'level', -6), who: 'levels', do: 'set', key: 'show', to: 0, dur: 4 },
    { ...at('l01', 'loud'), who: 'otis', expr: 'shock', look: 'kai' },
    { ...at('l01', 'and'), who: 'kai', expr: 'worried', look: 'otis' },
    { ...at('l01', 'level', -2, 1), who: 'kai', expr: 'grin', look: 'camera', do: 'gesture', kind: 'tilt', deg: 8, hold: 14 },
    { ...at('l01', 'heard'), who: 'boom', do: 'fire', sound: 'ping', strength: 0.4 },
    { ...at('l01', 'thousand', -3), who: 'miles', do: 'fire', sound: 'ding', strength: 0.5 },
    { ...at('l01', 'thousand'), who: 'kai', expr: 'shock', look: 'miles' },
    { ...at('l01', 'away'), who: 'kai', do: 'gesture', kind: 'shrug', expr: 'grin', look: 'camera' },
  ],
  shots: [
    { f: 0, shot: 'ms', of: ['kai'], angle: 10, size: 0.42, push: 0.0012 },
    { ...at('l01', 'level', -4), shot: 'cu', of: ['kai'], angle: -8, head: 0.24, kx: 0.5, dof: 0, push: 0.0010, live: 0.35 },
  ],
};
