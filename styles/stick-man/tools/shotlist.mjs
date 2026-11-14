// The shot list as data: loads films/<slug>/storyboard.json (`scenes`, `shots`) with vo/script.json and vo/words.json and
// resolves every shot to frames. Shared by prepro.mjs (the checks) and animatic.mjs (the cut). Format: REEL_DATA.md, Shot list.
// A shot is placed by `f0` (frame), else `at` ("l03" = the line's first word, "l03:gap" = that word, "l03:gap#2" = its
// second time), else it starts where the previous shot's `dur` ends. It ends where the next shot starts; the last shot ends
// at `last` (storyboard `last`, else 12 frames after the voice, else its own `dur`).
import fs from 'node:fs'; import path from 'node:path';

export const SIZES = ['EWS', 'WS', 'FS', 'TWO', 'MS', 'OTS', 'MCU', 'CU', 'ECU', 'INS', 'POV', 'CARD'];
export const ANGLES = ['eye', 'high', 'low', 'top', 'dutch', 'pov'];
export const MOVES = ['static', 'push', 'pull', 'pan', 'tilt', 'truck', 'crane', 'follow', 'zoom', 'rack', 'handheld', 'whip'];
export const WIDE = new Set(['EWS', 'WS', 'FS']);
// text-safe box for 9:16, normalised (x right, y down): Meta's Reels/Stories diagram (14 % top, 35 % bottom, 6 % sides)
// joined with TikTok's right button column (~13 %). Action may go wider; words, numbers and faces stay inside.
export const TEXT_SAFE = { x0: 0.06, x1: 0.87, y0: 0.14, y1: 0.65 };
// the UI bands drawn on the animatic with --safe 1 (TikTok in-feed template, scaled): top 7 %, bottom 25 %, right 13 %
export const UI_BANDS = { top: 0.07, bottom: 0.25, right: 0.13, left: 0.04 };

const norm = w => String(w).toLowerCase().replace(/[^a-z0-9']/g, '');
export const lensN = s => Number(String(s.lens ?? '').replace(/mm$/i, ''));

export function loadFilm(DIR, opts = {}) {
  const F = p => path.join(DIR, p);
  const readJ = p => fs.existsSync(F(p)) ? JSON.parse(fs.readFileSync(F(p), 'utf8')) : null;
  const SB = readJ('storyboard.json'), script = readJ('vo/script.json'), words = readJ('vo/words.json');
  if (!SB) throw new Error(`missing ${DIR}/storyboard.json`);
  if (!Array.isArray(SB.shots) || !SB.shots.length) throw new Error('storyboard.json has no "shots": write the shot list first (REEL_DATA.md, Shot list)');
  const fps = Number(opts.fps || SB.fps || 30);
  const lineIds = script?.lines?.map(l => l.id) || [];
  const errors = [];
  function anchorFrame(at) {
    if (!words) throw new Error(`anchor "${at}" needs vo/words.json (or give the shot f0 / dur)`);
    const [lid, rest] = String(at).split(':');
    const ws = words.filter(w => w.line === lid);
    if (!ws.length) throw new Error(`anchor "${at}": no words for line ${lid}`);
    if (!rest) return Math.round(ws[0].t0 * fps);
    const [w, n] = rest.split('#'), hit = ws.filter(x => norm(x.word) === norm(w))[(Number(n) || 1) - 1];
    if (!hit) throw new Error(`anchor "${at}": "${w}" is not word #${n || 1} of ${lid}`);
    return Math.round(hit.t0 * fps);
  }
  // camera-intent options: a shot may carry `options: { safe: {...}, emo: {...}, bold: {...} }` (fields that replace the
  // shot's own) and `pick`; opts.opt ("SH040:emo,SH060:bold") renders other picks without editing the file
  const force = Object.fromEntries(String(opts.opt || '').split(',').filter(Boolean).map(x => x.split(':')));
  const shots = SB.shots.map(s => { const k = force[s.id] ?? s.pick, o = k && s.options?.[k];
    if (k && !o) errors.push({ where: s.id, msg: `option "${k}" not in options (${Object.keys(s.options || {}).join(', ') || 'none'})` });
    return o ? { ...s, ...o, picked: k } : { ...s }; });
  let cur = 0;
  for (const [i, s] of shots.entries()) {
    try {
      if (Number.isFinite(s.f0)) s.a = s.f0;
      else if (s.at) s.a = anchorFrame(s.at);
      else if (i === 0) s.a = 0;
      else if (Number.isFinite(shots[i - 1].dur)) s.a = shots[i - 1].a + shots[i - 1].dur;
      else throw new Error('no f0, at, or dur on the previous shot');
    } catch (e) { errors.push({ where: s.id || `#${i + 1}`, msg: `cannot place the shot: ${e.message}` }); s.a = cur; }
    cur = s.a;
  }
  const voEnd = words?.length ? Math.round(words.at(-1).t1 * fps) : null;
  const tail = shots.at(-1);
  const last = Number(opts.last ?? SB.last ?? (voEnd != null ? voEnd + 12 : tail.a + (tail.dur || fps * 2)));
  shots.forEach((s, i) => { s.b = i + 1 < shots.length ? shots[i + 1].a : last; s.n = s.b - s.a; s.sec = s.n / fps; });
  const lineWin = {};
  for (const id of lineIds) { const ws = (words || []).filter(w => w.line === id); lineWin[id] = ws.length ? [Math.round(ws[0].t0 * fps), Math.round(ws.at(-1).t1 * fps)] : null; }
  for (const s of shots) s.on = words ? lineIds.filter(id => lineWin[id] && lineWin[id][0] < s.b && lineWin[id][1] > s.a) : (s.lines || []);
  return { SB, script, words, fps, shots, last, voEnd, lineIds, lineWin, errors, F };
}

// visual intensity, 0-2 per factor (animation-camera-pass table): size, lens, angle, camera move, cut rhythm; max 10
export function visual(s) {
  const size = s.size === 'CARD' ? (s.cardPunch ? 1 : 0) : WIDE.has(s.size) || s.size === 'TWO' ? 0 : ['MS', 'OTS', 'MCU'].includes(s.size) ? 1 : 2;
  const L = lensN(s), lens = !L ? 0 : (L <= 21 || L >= 135) ? 2 : (L <= 28 || L >= 85) ? 1 : 0;
  const ang = s.angle === 'eye' || !s.angle ? 0 : ['high', 'low'].includes(s.angle) ? (s.extreme ? 2 : 1) : 2;
  const mv = !s.move || s.move === 'static' ? 0 : ['handheld', 'whip'].includes(s.move) || s.fast ? 2 : 1;
  const cut = s.sec > 4 ? 0 : s.sec >= 2 ? 1 : 2;
  return { size, lens, ang, mv, cut, v: size + lens + ang + mv + cut };
}
