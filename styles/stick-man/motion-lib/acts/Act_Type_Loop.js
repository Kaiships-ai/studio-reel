// Seated, typing on a keyboard in front.
import { ownClip, reachKeys } from '../base.js';
import { act, seated } from './act.js';
import SRC from '../ref/mixamo/typing.js';
import { loopSource } from '../ref/perform.js';

// the capture's hands hover and reach aside, one arm straight out for 2 s at a time, and its fingers do the typing: on a figure
// with no fingers nothing is typed. Its trunk and head are kept (the 5 s where the body works at the desk); the hands strike a keyboard
// that is not there, in front of the belly over the knees: figure W from the root (x to the right, y up, z ahead)
const FROM = 120, N = 150, BLEND = 16;
const HOME = { x: 0.17, y: 1.06, z: 0.72 }, DEEP = 0.11, HALF = 4, LAP = { x: 0.25, y: 0.82, z: 0.81 };
// the strikes: two bursts with a look between them, then the right hand out to a last hard key. [frame, how far aside (W), depth]
const STRIKES = {
  L: [[4, 0, 1], [14, -0.06, 0.9], [23, 0.04, 1], [33, -0.02, 0.85], [42, 0.05, 1], [52, -0.05, 1], [77, 0, 1], [86, 0.05, 0.9], [96, -0.06, 1], [105, 0, 0.85], [115, 0.04, 1], [124, -0.04, 1]],
  R: [[9, 0, 1], [18, 0.05, 1], [28, -0.04, 0.9], [38, 0.06, 1], [47, 0, 0.85], [57, -0.05, 1], [72, 0.04, 1], [81, -0.04, 0.9], [91, 0.06, 1], [100, 0, 1], [110, -0.05, 0.85], [119, 0.05, 1], [137, 0.16, 1.3]],
};
const ease = x => (x = Math.max(0, Math.min(1, x)), x * x * (3 - 2 * x));
// where a hand is t frames into the loop: over the key it goes to next, down on it and up over HALF frames each side
const hand = (side, t) => {
  const S = STRIKES[side], i = S.findIndex(s => s[0] + HALF > t), n = S.length, b = S[i < 0 ? 0 : i], a = S[((i < 0 ? n : i) + n - 1) % n];
  const tb = b[0] + (i < 0 ? N : 0), ta = a[0] - (i === 0 ? N : 0), x = a[1] + (b[1] - a[1]) * ease((t - ta - HALF) / Math.max(1, tb - ta - 2 * HALF));
  const d = S.reduce((m, s) => Math.max(m, ...[-N, 0, N].map(o => { const u = Math.abs(t - s[0] - o) / HALF; return u < 1 ? s[2] * Math.cos(Math.PI / 2 * u) ** 2 : 0; })), 0);
  return [(side === 'L' ? -1 : 1) * HOME.x + x, HOME.y - DEEP * d, HOME.z];
};
const rows = (side, M) => { const [a, b] = M.captured, sg = side === 'L' ? -1 : 1, out = [];
  for (let f = 1; f < M.frames; f++) {
    const w = ease(Math.min(f / a, (M.frames - f) / (M.frames - b))), p = hand(side, Math.max(0, Math.min(b - a, f - a))), q = [sg * LAP.x, LAP.y, LAP.z];
    out.push([f, ...p.map((v, i) => q[i] + (v - q[i]) * w), Math.min(1, 6 * w), sg * 0.8, -0.6, 0]);
  }
  return { hand: side, rows: out }; };

export default act({ clip: 'Act_Type_Loop', loop: true, base: 'SIT' }, body => {
  const M = ownClip({ body, src: loopSource(SRC, FROM, FROM + N, 14), ...seated(), loop: true, ease: BLEND, dense: true });
  return { ...M, keys: ['L', 'R'].reduce((k, s) => reachKeys(k, rows(s, M)), M.keys) };
});
