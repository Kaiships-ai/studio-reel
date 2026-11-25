// Expressions (Kai 25/11, kit faces v4): a feeling is ONE kit asset, a face and an upper-body pose read together, plus an
// optional head mark. The face sells it in a close shot, the pose in a long one (it must read filled black), the mark is
// the loudest read after the pose. A film names the expression; expressionBeats() expands it into the beats play.js runs:
//   pose first (with its anticipation), the face 2 frames after the action starts, the mark MARK_LAG frames after the
//   face reads (FACE_READ) and gone as the pose releases (always before the next face), the peak held >= MIN_HOLD frames.
//   beats: [...expressionBeats('guilty', { line: 'l03', on: 'sorry' }, 'kai'), ...]
//   beats: [...expressionBeats('proud', { f: 120 }, 'wren', { hold: 50, amp: 0.8, hand: 'L' })]
// face: a kit face name (engine/facestyles/s2.js DESIGNS / ALIASES, or the expression faces in s2expr.js); pose: engine/poses.js POSES; mark: a head mark
// (engine/faces.js MARKS) or a list of them (one family: anger + steam); amp: the pose's size; speed: the face change's (fast | normal,
// left out); purpose: what it is for.
// The silhouette pairs a viewer mixes up are built apart: guilty (shoulders up, hands behind the back, a toe scuffing) vs sad
// (shoulders down, arms hanging); shy (hands clasped low, narrow) vs proud (hands on hips, wide); embarrassed (fists on the
// cheeks, elbows out) vs scared (low, knees bent, hands at the mouth, elbows in, shaking) vs shocked (tall, hands flung wide). tools/series/kitexpr renders the sheet.
// The marks are the bold set's (engine/headmarks.js): an act that uses expressions sets `headMarks: 'bold'` in reel.js. Without
// the switch sweat, anger, sparkle, question, exclaim, steam and zzz draw as the old small marks, and star, ellipsis, gloom
// and shake (proud, bored, sad, scared) stop the render with a message; give `mark: null` or an old mark in `o` to run without it.
import { POSES } from './poses.js';
import { EXPR_LEAD, FACE_CLASS, MOVE_T } from './acting.js';
import './facestyles/s2expr.js';   // the e_ faces (registered into s2 on import)

export const MIN_HOLD = 12, MARK_LAG = 3;
// frames from a face's key until it reads (brows, lids and mouth all >= 90 % there, s2's clocks in acting.js): a face change
// takes its time, and a mark counted from the key alone popped on the face before ("?" over a sad face)
export const FACE_READ = { take: 3, fast: 7, normal: 11 };
export const EXPRESSIONS = {
  proud: { face: 'e_proud', pose: 'proud_chin', mark: 'star', purpose: 'proud of it: round eyes, a big grin, chest out, chin up, hands on hips' },
  guilty: { face: 'e_guilty', pose: 'hands_behind', mark: null, purpose: 'caught, sorry: head down and turned away, eyes in the far corner, hands behind the back, a toe scuffing' },
  shy: { face: 'e_shy', pose: 'shy_twist', mark: null, purpose: 'bashful: eyes down, head tipped, hands clasped low, toe on the floor' },
  bored: { face: 'e_bored', pose: 'chin_prop', mark: 'ellipsis', purpose: 'bored: flat brows, half lids, head heavy on a fist at the jaw, "..."' },
  shocked: { face: 'e_shock', pose: 'jolt', mark: 'exclaim', purpose: 'shocked: jolts back, mouth open, hands fly up, "!"' },
  angry: { face: 'e_angry', speed: 'fast', pose: 'fume', mark: ['anger', 'steam'], purpose: 'angry: leaning forward, fists low and wide, steaming' },
  scared: { face: 'y_fear', speed: 'fast', pose: 'cringe', mark: ['shake', 'sweat'], purpose: 'scared: knees bent, hands up at the mouth, shaking' },
  sad: { face: 'sad', pose: 'droop', mark: 'gloom', purpose: 'sad: shoulders dropped, head a little down, arms hanging, a rain cloud' },
  confused: { face: 'e_confused', pose: 'head_scratch', mark: 'question', purpose: 'confused: scratching the head, "?"' },
  excited: { face: 'excited', speed: 'fast', pose: 'cheer', mark: 'sparkle', purpose: 'excited: arms flung up in a V, on the toes, bouncing' },
  embarrassed: { face: 'e_embarrassed', speed: 'fast', pose: 'cheeks_cover', mark: 'sweat', purpose: 'embarrassed: eyes squeezed, big blush, fists on the cheeks' },
  smug: { face: 'e_smug', pose: 'arms_folded_high', mark: null, purpose: 'smug: smirk, cocked brow, arms folded, chin up' },
  sleepy: { face: 'e_sleepy', pose: 'nod_off', mark: 'zzz', purpose: 'sleepy: yawning, the head tipped over to one side, nodding, Zzz' },
};
export const EXPRESSION_NAMES = Object.keys(EXPRESSIONS);
export const marksOf = e => (e.mark == null ? [] : [].concat(e.mark));

// a beat's place moved by d frames (an absolute frame, or the offset from its word)
const shift = (where, d) => (where.f != null ? { ...where, f: where.f + d } : { ...where, offset: where.offset + d });

// the beats of one expression at `where` ({ f } or { line, on, offset, nth }) for actor `who`; o: hold (frames at the
// peak, >= MIN_HOLD), amp, hand ('L' mirrors a one-handed pose), face / pose / mark (override the table's)
export function expressionBeats(name, where, who, o = {}) {
  const E = EXPRESSIONS[name];
  if (!E) throw new Error(`expression: unknown ${name} (${EXPRESSION_NAMES.join(' ')})`);
  const pose = o.pose ?? E.pose, P = POSES[pose];
  if (!P) throw new Error(`expression ${name}: unknown pose ${pose}`);
  const face = o.face ?? E.face, speed = E.speed ?? 'normal', read = FACE_READ[FACE_CLASS.take.has(face) ? 'take' : speed];
  const A = P.A ?? 3, T = (P.T ?? 9) >= 8 ? Math.max(MOVE_T, P.T ?? 9) : P.T, amp = o.amp ?? E.amp;   // (poses.js compilePose: how long the pose takes)
  // the peak holds long enough for the mark to be read too (MIN_HOLD frames of it before the pose releases)
  const marks = o.mark !== undefined ? [].concat(o.mark ?? []) : marksOf(E), lag = 2 + read + MARK_LAG;
  const hold = Math.max(MIN_HOLD, o.hold ?? P.hold ?? 30, marks.length ? MIN_HOLD + lag - T : 0);
  // on a word, the pose starts early enough for the face to land EXPR_LEAD frames before the word: the engine never lets a
  // face land later (a later offset would leave the pose and the mark behind the face)
  if (where.f == null) { const lead = -(EXPR_LEAD + A + 2); where = { ...where, offset: Math.min(where.offset ?? lead, lead) }; }
  const beats = [{ ...where, who, do: pose, hold, ...(amp != null ? { amp } : {}), ...(o.hand ? { hand: o.hand } : {}) },
    { ...shift(where, A + 2), who, expr: face, exprSpeed: speed }];
  // the mark lands MARK_LAG frames after the face reads and is gone as the pose releases, or before the figure's next face if
  // that comes first (markFace: play.js cuts it there)
  for (const m of marks) beats.push({ ...shift(where, A + lag), who, mark: [m, T + hold - lag], markFace: lag - 2 });
  return beats;
}
