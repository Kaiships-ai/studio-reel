// The automatic acting layer: blinks, expression timing, idle life, eyes on whatever is moving, settle springs.
// Nothing here is written in the reel data; all of it is a pure function of the frame and a per-actor seed.
import { hash, clamp, smooth, smoother, settle, rightB, fwdB, angDiff } from './verbs.js';

const BLINK = [1, 2, 2, 1];                                       // half, shut, shut, half

// ---------------------------------------------------------------- micro-animation timing (FORENSIC.md section 3)
// Reference head moves: 12-15 f, a slow start (7 % of the travel in the first eighth: 0.07 0.21 0.34 0.48 0.63 0.75 0.86 1),
// then a long hold that still breathes. slowIn is that spacing (0.07 at 1/8, 0.50 at 1/2, 0.93 at 7/8).
export const MOVE_T = 13;
export const slowIn = x => { x = clamp(x, 0, 1); return 0.5 * x + 0.5 * smoother(x); };
// a move with a small overshoot that settles back (follow-through): 1 + over at ~85 %, back to 1 at the end
export const slowInOver = (x, over = 0.06) => slowIn(x) + over * Math.sin(Math.PI * clamp((x - 0.55) / 0.6, 0, 1)) * (x < 1.15 ? 1 : 0);

// blink starts: seeded gaps of 15-45 frames (0.5-1.5 s), plus one centred on each expression swap
export function blinkTrack(seed, f0, f1, swaps) {
  const forced = swaps.map(s => s - 2), starts = [];
  let f = f0 + Math.round(4 + 20 * hash(seed, 7));
  for (let i = 0; f < f1; i++) {
    if (!forced.some(s => Math.abs(s - f) < 10)) starts.push(f);
    f += 15 + Math.round(30 * hash(seed, i, 11));
  }
  starts.push(...forced);
  starts.sort((a, b) => a - b);
  return { starts, at: fr => { for (const s of starts) if (fr >= s && fr < s + 4) return BLINK[fr - s]; return 0; } };
}

// [{f, expr}] sorted; the expression in force at frame f
export const exprAt = (track, f) => { let e = track[0]?.expr || 'neutral'; for (const k of track) if (k.f <= f) e = k.expr; else break; return e; };

// idle life: breathing, a slow head drift, hands that never freeze. Amplitudes in W units / degrees.
export function idle(seed, f, posture) {
  const a = 6.283 * hash(seed, 1), b = 6.283 * hash(seed, 2), c = 6.283 * hash(seed, 3);
  const sleep = posture === 'sit';
  const br = Math.sin(6.283 * f / (sleep ? 96 : 78) + a);
  return {
    bob: (sleep ? 0.040 : 0.010) * br,                                // a sleeper breathes deep and his head lolls
    head_tilt: (sleep ? 4.5 : 1.4) * Math.sin(6.283 * f / 101 + b) + 0.6 * Math.sin(6.283 * f / 43 + c),
    head_dx: 0.006 * Math.sin(6.283 * f / 67 + c),
    head_dv: (sleep ? 0.018 : 0.006) * br,
    hand: [0.012 * Math.sin(6.283 * f / 53 + a), 0.010 * Math.sin(6.283 * f / 37 + b), 0.008 * Math.sin(6.283 * f / 61 + c)],
    shrug: (sleep ? 0.010 : 0.014) * Math.max(-0.4, br),           // the in-breath lifts the shoulders; the out-breath drops less
    snore: sleep && br > 0.55,
  };
}

// micro saccades: every 12-30 frames the gaze steps a little off the target and back, 2-frame moves
export function saccade(seed, f) {
  let t = 0, i = 0, prev = [0, 0];
  while (true) {
    const gap = 12 + Math.round(18 * hash(seed, i, 23));
    const cur = [0.10 * (hash(seed, i, 29) - 0.5), 0.25 * (hash(seed, i, 31) - 0.5)];
    if (f < t + gap) { const u = smoother((f - t) / 2); return [prev[0] + (cur[0] - prev[0]) * u, prev[1] + (cur[1] - prev[1]) * u]; }
    t += gap; i++; prev = cur;
  }
}

// focus: explicit look_at segments, overridden by props in motion (the hand that moves one, and everyone watching)
export function focusAt(actor, f, focus, active) {
  let best = null;
  for (const a of active) if (f >= a.from && f < a.to && (a.by === actor.name || actor.watch !== false) && (!best || a.from > best.from)) best = a;
  if (best) return { key: 'prop:' + best.prop, prop: best.prop, from: best.from };
  let seg = null;
  for (const s of focus) if (s.from <= f) seg = s;
  const t = seg ? seg.target : actor.focus;
  return { key: String(t), target: t, from: seg ? seg.from : -1e9 };
}

// face slide (look, look_v) from the head toward a world point, in the figure's own frame
export function gaze(headB, yaw, pB) {
  const d = [pB[0] - headB[0], pB[1] - headB[1], pB[2] - headB[2]], R = rightB(yaw), F = fwdB(yaw);
  const u = d[0] * R[0] + d[1] * R[1], z = d[0] * F[0] + d[1] * F[1];
  const ang = Math.atan2(u, Math.max(z, -0.3)), elev = Math.atan2(d[2], Math.hypot(u, z));
  return [clamp(ang / 0.85, -1.05, 1.05), clamp(elev / 0.25, -1.6, 1.6)];
}

// ---------------------------------------------------------------- the body acts (every reel gets this for free)
// Idle beats: every 36-75 frames (seeded per actor) the body moves to a new pose in MOVE_T frames with a slow start and
// a small overshoot, then HOLDS it (the hold still breathes: idle()). A weight shift, a look, or a hand move leads (the
// other two follow at under half size). The runtime staggers the channels (head first, body 2 f, arms 4 f later), so
// the head leads and the limbs follow through. Values add onto the pose keys (W, deg; arm = FK fwd/out/flex).
// (Was: a new small pose every 12-24 f held 1-3 f, a constant fidget: no head hold >= 6 f in the test scene.)
const IDLE_T0 = -400;
function beatPose(seed, i) {
  // the weight goes side to side (alternating), the rest is seeded; a value is 0.5-1 of its range so every beat moves
  const h = k => 2 * hash(seed, i, k) - 1, a = k => (h(k) < 0 ? -1 : 1) * (0.5 + 0.5 * Math.abs(h(k + 100))), alt = i % 2 ? 1 : -1;
  const kind = Math.floor(3 * hash(seed, i, 40)), big = k => (kind === k ? 1 : 0.45);
  return { dx: 0.14 * alt * (0.6 + 0.4 * Math.abs(h(41))) * big(0), lean: 4.5 * alt * big(0), hipTwist: 7 * a(43) * big(0), bob: -0.020 * Math.abs(h(54)) * big(0),
    head_tilt: 8 * a(44) * big(1), head_dx: 0.05 * a(45) * big(1), head_pitch: 7 * a(46) * big(1), look: 0.30 * a(47) * big(1),
    L: [14 * a(48) * big(2), 7 * a(49) * big(2), 24 * a(50) * big(2)], R: [14 * a(51) * big(2), 7 * a(52) * big(2), 24 * a(53) * big(2)] };
}
const mixPose = (a, b, u) => Object.fromEntries(Object.keys(a).map(k => [k, Array.isArray(a[k]) ? a[k].map((x, j) => x + (b[k][j] - x) * u) : a[k] + (b[k] - a[k]) * u]));
export const idleGap = (seed, i) => 36 + Math.round(39 * hash(seed, i, 61));
export function idleBeats(seed, f) {
  let t = IDLE_T0 + Math.round(20 * hash(seed, 60)), i = 0;
  for (;;) {
    const gap = idleGap(seed, i);
    if (f < t + gap) return mixPose(beatPose(seed, i - 1), beatPose(seed, i), slowInOver((f - t) / MOVE_T, 0.05));
    t += gap; i++;
  }
}

// An expression change comes with a body accent on the same frame: a head lift or dip, a shoulder shrug, a tilt.
const ACCENT = {
  shock: { head_dv: 0.05, head_pitch: -9, shrug: 0.08, pitch: -4 },
  worried: { shrug: 0.07, head_pitch: 6, head_dv: -0.02, tilt: 5 },
  happy: { head_dv: 0.03, shrug: 0.03, tilt: 7 }, grin: { head_dv: 0.03, shrug: 0.04, tilt: 7, pitch: -2 },
  closed: { head_pitch: 7, head_dv: -0.02, tilt: 6 }, calm: { head_pitch: 4, tilt: 4 },
  smug: { head_pitch: -5, tilt: 8, lean: 2 }, sly: { head_pitch: 3, tilt: -8, lean: -2 },
  stern: { head_pitch: 8, head_dv: -0.03, shrug: -0.02 }, neutral: { head_pitch: 4, head_dv: -0.015 },
};
// The accent is an attitude, not a twitch: a 3-frame anticipation the other way, a MOVE_T slow-in rise with a small
// overshoot, held (breathing) until the next change or ACC_HOLD frames, then released over ACC_OUT frames. 1.6x the old
// size (FORENSIC: our head moves travelled 0.5-0.7 W, the reference ~2.3 W on its big beats).
const ACC_A = 3, ACC_HOLD = 45, ACC_OUT = 24, ACC_K = 1.6;
export function exprAccent(track, f, seed) {
  const o = {};
  for (let j = 1; j < track.length; j++) {
    const k = track[j]; if (k.expr === track[j - 1].expr) continue;
    const d = f - k.f + ACC_A; if (d < 0) continue;
    const next = track.slice(j + 1).find(x => x.expr !== k.expr), end = Math.min(next ? next.f - k.f : 1e9, ACC_HOLD);
    if (d >= ACC_A + end + ACC_OUT) continue;
    const up = d < ACC_A ? -0.15 * smooth(d / ACC_A) : -0.15 + 1.15 * slowInOver((d - ACC_A) / MOVE_T, 0.08 / 1.15);
    const e = ACC_K * up * (d > ACC_A + end ? 1 - slowIn((d - ACC_A - end) / ACC_OUT) : 1), A = ACCENT[k.expr]; if (!A) continue;
    const sg = hash(seed, k.f, 71) < 0.5 ? -1 : 1;
    for (const [n, v] of Object.entries(A)) { const key = n === 'tilt' ? 'head_tilt' : n; o[key] = (o[key] || 0) + v * e * (n === 'tilt' || n === 'lean' ? sg : 1); }
  }
  return o;
}

// A hand action pulls the body: the torso leans and twists toward the busy hand, the weight goes onto the near leg,
// the free arm counter-swings, and the head follows a few frames late (it counter-tilts first, then catches up).
// off{L,R} = busy hand minus its rest spot (figure-local W, already weighted by how busy the hand is); late = the same
// LATE frames earlier. Returns pose-key adds plus arm{L,R} FK adds for a resting arm.
export const LATE = 4;
function lean3(oL, oR) {
  const u = oL[0] + oR[0], v = oL[1] + oR[1], z = oL[2] + oR[2];
  return { lean: clamp(9 * u, -8, 8), pitch: clamp(8 * Math.max(0, z) - 5 * Math.max(0, v - 0.7), -5, 9), shTwist: clamp(16 * (oR[2] - oL[2]), -14, 14),
    dx: clamp(0.10 * u, -0.06, 0.06), hipTwist: clamp(5 * (oR[2] - oL[2]), -5, 5) };
}
export function bodyFollow(off, late) {
  const a = lean3(off.L, off.R), b = lean3(late.L, late.R);
  const o = { ...a, head_tilt: -0.9 * (a.lean - b.lean), head_pitch: -0.8 * (a.pitch - b.pitch) + 4 * clamp(-(late.L[1] + late.R[1]), 0, 1), arm: {} };
  for (const [s, other, sg] of [['L', 'R', -1], ['R', 'L', 1]]) {
    const q = off[other];                                          // the free arm swings back against the busy one
    o.arm[s] = { fwd: clamp(-14 * q[2], -12, 6), out: clamp(6 * Math.abs(q[0]) + 4 * Math.max(0, q[1]), 0, 8), flex: clamp(10 * Math.hypot(...q), 0, 14) };
  }
  return o;
}

// sum of settle springs after impacts / stops: [{f, amp}]
export const springs = (events, f) => events.reduce((s, e) => s + e.amp * settle(f - e.f), 0);

export { angDiff };

// ---------------------------------------------------------------- faces lead the voice, marks, body acting (q2)
// An expression change lands EXPR_LEAD frames before its word (the face reads first, then the sound): a beat's expr
// frame = min(beat frame, word start - EXPR_LEAD). Gate: GATES.md "Acting gates" (>= 3 frames before the word).
export const EXPR_LEAD = 4;
// the expression key in force at f, with when it began and the word it belongs to
export const exprKeyAt = (track, f) => { let k = track[0] || { f: -1e9, expr: 'neutral' }; for (const x of track) if (x.f <= f) k = x; else break; return k; };

// a beat's `mark: 'question'` (or [kind, frames]) shows a head-attached emotion mark (faces.js MARK_NAMES) for `dur` frames
export function markOwner(b) {
  const [kind, dur] = Array.isArray(b.mark) ? b.mark : [b.mark, b.markDur ?? 36], t0 = b.at;
  return { chan: 'add', start: t0, verb: 'mark', fn: f => (f >= t0 && f < t0 + dur ? { ['x_mark_' + kind]: f - t0 + 1 } : {}) };
}

// Which verbs count as the body acting (the acting gate: >= 70 % of a lead's on-screen frames). Head-only and set-up
// verbs do not: idle, talk, look_at, place, hold, mark, and the nod / tilt gestures.
const NOT_BODY = new Set(['idle', 'talk', 'look_at', 'place', 'hold', 'mark', 'stand']);
export const isBodyVerb = v => !NOT_BODY.has(v.name) && !(v.name === 'gesture' && (v.kind === 'nod' || v.kind === 'tilt'));

// Auto-acting: every lead's frames that no body verb covers get key poses picked from the words spoken there (then the
// face in force, then a default rotation), one pose per ~1.3 s, each one released as the next one rises. Explicit beats
// always win: a gap is the time between them. A lead = cast `lead: true`, or a `talk` beat, or a shot subject
// (`lead: false` opts out). Turn it off per act with `auto: false`.
const TEXT_POSES = [
  [/^(whisper\w*|quiet\w*|secret\w*|hush|soft\w*|barely|tickle\w*|shh)$/, ['lean_in', 'shush', 'tiptoe']],
  [/^(hear|heard|hears|listen\w*|ears?|sound\w*|hearing)$/, ['cup_ear', 'lean_in']],
  [/^(loud\w*|boom\w*|bang|blast\w*|explod\w*|roar\w*|honk\w*|nois\w*|scream\w*|yell\w*)$/, ['cover_ears', 'recoil', 'brace', 'cower']],
  [/^(threshold|pain\w*|hurt\w*|damag\w*|ouch|ache)$/, ['clutch', 'cover_ears', 'facepalm']],
  [/^(rock|concert\w*|party|cheer\w*|win\w*|yes|best|fun)$/, ['celebrate']],
  [/^(think\w*|thought|wonder\w*|idea|why|how|maybe|guess\w*)$/, ['think']],
  [/^(big|bigger|huge|massive|ten|times|power\w*|every|more|levels?|five|whole)$/, ['arms_wide', 'present']],
  [/^(miles?|away|far|distance|across|world|island|volcano\w*|sea)$/, ['shade_eyes', 'point_lean']],
  [/^(police|chief|officer|boss|guard\w*|cannons?|fire)$/, ['hands_on_hips', 'arms_crossed']],
  [/^(talk\w*|say\w*|said|tell\w*|told|ask\w*|chat\w*|conversation)$/, ['present', 'lean_in']],
  [/^(decibels?|db|hundred|thousand|eighty\S*|sixty|thirty|seventy|twenty|forty|fifty|ninety|number\w*)$/, ['present', 'point_lean', 'arms_wide']],
  [/^(city|traffic|cars?|streets?|hours?)$/, ['hands_on_hips', 'brace']],
];
const EXPR_POSES = { panic: ['flail', 'cower'], scream: ['flail', 'cower'], angry: ['hands_on_hips', 'arms_crossed'], furious: ['hands_on_hips'],
  shock: ['recoil', 'lean_away'], worried: ['brace', 'shrug'], smug: ['arms_crossed', 'hands_on_hips'], sly: ['lean_in', 'arms_crossed'],
  happy: ['present', 'shrug'], grin: ['present', 'hands_on_hips'], excited: ['celebrate'], dizzy: ['wobble'], pain: ['clutch', 'cover_ears'],
  sad: ['shrug'], cry: ['facepalm'], confused: ['think', 'shrug'], blush: ['shrug'], proud: ['hands_on_hips'], nervous: ['shrug', 'lean_away'],
  suspicious: ['arms_crossed', 'think'], deadpan: ['arms_crossed'], manic: ['flail', 'laugh'], closed: ['laugh', 'shrug'] };
const DEFAULT_POSES = ['hands_on_hips', 'present', 'arms_crossed', 'shrug', 'think', 'lean_in'];
const norm = w => w.toLowerCase().replace(/[^a-z0-9'-]/g, '');
export function autoActing({ R, actors, words, fps, win }) {
  if (R.auto === false) return [];
  const out = [], subj = new Set((R.shots || []).flatMap(s => s.of || []));
  for (const a of actors) {
    a.lead = a.c.lead ?? (a.verbs.some(v => v.name === 'talk') || subj.has(a.name));
    if (!a.lead) continue;
    const busy = a.verbs.filter(isBodyVerb).map(v => [v.start, v.end]).sort((x, y) => x[0] - y[0]);
    for (const [wa, wb] of win) {
      let cur = wa - 12, prevPose = null, i = 0;
      const gaps = [];
      for (const [s, e] of busy) { if (e <= cur) continue; if (s > cur) gaps.push([cur, Math.min(s, wb), s < wb]); cur = Math.max(cur, e); if (cur >= wb) break; }
      if (cur < wb) gaps.push([cur, wb, false]);
      for (const [g0, g1, closes] of gaps) {
        const len = g1 - g0; if (len < 18) continue;
        const n = Math.max(1, Math.round(len / 48)), L = len / n;          // fewer, bigger poses, held longer
        for (let k = 0; k < n; k++) {
          const s = Math.round(g0 + k * L), e = Math.round(g0 + (k + 1) * L);
          const said = words.filter(w => w.t1 * fps > s && w.t0 * fps < e + 6).map(w => norm(w.word));
          const ex = exprKeyAt(a.exprs, s + 10).expr, cand = [];
          for (const w of said) for (const [re, ps] of TEXT_POSES) if (re.test(w)) cand.push(...ps);
          cand.push(...(EXPR_POSES[ex] || []), ...DEFAULT_POSES.slice((a.seed + i) % DEFAULT_POSES.length), ...DEFAULT_POSES);
          const pose = cand.find(c => c !== prevPose) || DEFAULT_POSES[0];
          const A = 4, T = MOVE_T, last = k === n - 1, Rl = 14;
          // the last pose before an explicit verb releases 3 frames before it: that verb's hands then take over from the
          // pose (never from a hand already on its way down, which would reverse the arm)
          const hold = Math.max(4, (e - s) - A - T - (last && closes ? 3 : 0));
          const hl = (a.holdLog || []).filter(h => h.f <= s).pop() || { L: null, R: null };
          const other = actors.find(o => o !== a);
          out.push({ f: s, who: a.name, do: pose, hold, dur: T, antic: A, out: Rl, hand: hash(a.seed, i, 91) < 0.3 ? 'L' : 'R',
            busy: { L: !!hl.L, R: !!hl.R }, ...(pose === 'point_lean' ? { to: other ? other.st0 : [a.st0[0] + 1, a.st0[1] - 2, 1.5] } : {}), auto: true });
          prevPose = pose; i++;
        }
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- the face, frame by frame (micro-animation layer)
// Visemes: the mouth follows the letters of each spoken word (a cheap phoneme guess, good enough for a cartoon): vowels
// open (a widest, e / i wide, o / u round), m b p close, f v show teeth, the rest half-open. Keys sit at the middle of
// each sound, spread over the word (vowels take twice as long), the mouth leads the sound by 1 frame, closes in pauses
// longer than 2 frames, and a 3-tap filter in-betweens every frame. Stressed words (the longest, or with ! / ?) open
// 1.25x. Returns f -> {open, wide, round, teeth} (open 0 = closed).
const V = { a: { open: 0.95, wide: 0.6 }, e: { open: 0.55, wide: 0.9 }, i: { open: 0.45, wide: 1 }, o: { open: 0.75, round: 1 },
  u: { open: 0.5, round: 1 }, w: { open: 0.22, round: 1 }, m: { open: 0 }, f: { open: 0.12, teeth: 1 }, th: { open: 0.2, wide: 0.4 },
  sh: { open: 0.28, round: 0.5 }, c: { open: 0.3, wide: 0.5 } };
const LET = ch => 'a'.includes(ch) ? 'a' : 'ei'.includes(ch) ? (ch === 'e' ? 'e' : 'i') : 'o' === ch ? 'o' : 'u' === ch ? 'u' : 'w' === ch ? 'w'
  : 'mbp'.includes(ch) ? 'm' : 'fv'.includes(ch) ? 'f' : 'c';
export function phonemes(word) {
  let w = word.toLowerCase().replace(/[^a-z]/g, ''); if (!w) return [];
  if (w.length > 3 && w.endsWith('e') && !/[aeiou]e$/.test(w)) w = w.slice(0, -1);       // silent final e
  w = w.replace(/ee|ea|ie/g, 'E').replace(/oo|ou/g, 'O').replace(/ai|ay/g, 'A').replace(/th/g, 'T').replace(/sh|ch/g, 'S').replace(/y$/, 'i');
  const o = [];
  for (const ch of w) {
    const k = ch === 'E' ? 'e' : ch === 'O' ? 'u' : ch === 'A' ? 'a' : ch === 'T' ? 'th' : ch === 'S' ? 'sh' : LET(ch);
    if (o.length && o[o.length - 1] === k && k === 'c') continue;                         // runs of consonants: one shape
    o.push(k);
  }
  return o;
}
export function visemeTrack(words, fps, lines) {
  const ws = words.filter(w => !lines || lines.includes(w.line));
  if (!ws.length) return () => null;
  const longest = Math.max(...ws.map(w => w.t1 - w.t0)), keys = [];
  for (let j = 0; j < ws.length; j++) {
    const w = ws[j], a = w.t0 * fps - 1, b = w.t1 * fps - 1, ph = phonemes(w.word); if (!ph.length) continue;
    const stress = (/[!?]/.test(w.word) || w.t1 - w.t0 >= longest - 1e-6) ? 1.25 : 1;
    const wt = ph.map(p => ('aeiou'.includes(p) ? 2 : 1)), tot = wt.reduce((x, y) => x + y, 0);
    let c = a; keys.push({ f: a - 1.5, open: 0 });
    ph.forEach((p, i) => { const d = (b - a) * wt[i] / tot, v = V[p]; keys.push({ f: c + d / 2, open: (v.open || 0) * stress, wide: v.wide || 0, round: v.round || 0, teeth: v.teeth || 0 }); c += d; });
    const nx = ws[j + 1]; if (!nx || nx.t0 * fps - 1 - b > 2) keys.push({ f: b + 1.5, open: 0 });
  }
  keys.sort((x, y) => x.f - y.f);
  const raw = f => {
    if (f <= keys[0].f || f >= keys[keys.length - 1].f) return { open: 0, wide: 0, round: 0, teeth: 0 };
    let i = 0; while (keys[i + 1].f < f) i++;
    const p = keys[i], q = keys[i + 1], u = smooth((f - p.f) / Math.max(1e-6, q.f - p.f));
    return Object.fromEntries(['open', 'wide', 'round', 'teeth'].map(k => [k, (p[k] || 0) + ((q[k] || 0) - (p[k] || 0)) * u]));
  };
  const f0 = keys[0].f - 2, f1 = keys[keys.length - 1].f + 2;
  return f => {
    if (f < f0 || f > f1) return null;
    const a = raw(f - 0.5), b = raw(f), c = raw(f + 0.5);
    return Object.fromEntries(Object.keys(b).map(k => [k, 0.25 * a[k] + 0.5 * b[k] + 0.25 * c[k]]));
  };
}

// The face state at frame f: the expression change is in-betweened over FACE_T frames with the slow-in spacing and a
// small overshoot (every frame a new drawing), the eyes squeeze and the mouth gasps through the swap (faces.js mixFace);
// in a hold the brows, lids and mouth width drift on slow seeded sines, so a held face is alive but never twitches.
export const FACE_T = 10;
export function faceStateAt(track, f, seed, talk = null) {
  const k = exprKeyAt(track, f), i = track.indexOf(k), prev = track.slice(0, Math.max(0, i)).reverse().find(x => x.expr !== k.expr);
  const age = f - k.f, ramp = prev && age >= 0 && age < FACE_T + 6;
  const u = ramp ? slowInOver(age / FACE_T, 0.10) : 1;
  const ph = q => 6.283 * hash(seed, q);
  const life = { brow: 0.007 * Math.sin(6.283 * f / 47 + ph(81)), tilt: 2.2 * Math.sin(6.283 * f / 71 + ph(82)),
    lid: 0.05 * (0.5 + 0.5 * Math.sin(6.283 * f / 59 + ph(83))), mw: 0.05 * Math.sin(6.283 * f / 37 + ph(84)) };
  return { a: ramp ? prev.expr : k.expr, b: k.expr, u, life, talk: talk ? talk(f) : null, key: k };
}
