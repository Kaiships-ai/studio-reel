// Kit expressions (styles/stick-man/engine/expressions.js, Kai 25/11): a feeling is one asset, a face + an upper-body pose
// (+ a head mark), read together. Every expression names a face, a pose and marks that exist; its beats put the pose
// first, the face after the anticipation and hold the peak; the pairs viewers mix up have clearly different shapes; and
// every head mark is big and inked enough to read on a phone (head ~120 px).
import test from 'node:test';
import assert from 'node:assert/strict';
import { EXPRESSIONS, EXPRESSION_NAMES, expressionBeats, marksOf, MIN_HOLD, MARK_LAG, FACE_READ } from '../../styles/stick-man/engine/expressions.js';
import { EXPR_DESIGNS } from '../../styles/stick-man/engine/facestyles/s2expr.js';
import { judge } from '../../styles/stick-man/engine/eyegeom.js';
import { POSES } from '../../styles/stick-man/engine/poses.js';
import { BOLD_MARKS as MARK_NAMES, MARK_SIZE, MARK_POP, MARK_INK, GLYPH_INK, MARK_MIN, markAt } from '../../styles/stick-man/engine/headmarks.js';
import { EXPR_LEAD, markOwner, MARK_CLEAR, MOVE_T, faceStateAt, faceChanges } from '../../styles/stick-man/engine/acting.js';
import { DESIGNS, ALIASES } from '../../styles/stick-man/engine/facestyles/s2.js';
import { STAND } from '../../styles/stick-man/engine/verbs.js';
import { HEAD_C } from '../../styles/stick-man/engine/cast.js';

const BRIEF = ['proud', 'guilty', 'shy', 'bored', 'shocked', 'angry', 'scared', 'sad', 'confused', 'excited', 'embarrassed', 'smug', 'sleepy'];

test('the 13 expressions of the brief, each a face, a pose and marks that exist, with a purpose', () => {
  for (const n of BRIEF) assert.ok(EXPRESSIONS[n], n);
  for (const n of EXPRESSION_NAMES) {
    const E = EXPRESSIONS[n];
    assert.ok(DESIGNS[E.face] || ALIASES[E.face], `${n}: face ${E.face} is not a kit face`);
    assert.ok(POSES[E.pose], `${n}: pose ${E.pose} is not in POSES`);
    for (const m of marksOf(E)) assert.ok(MARK_NAMES.includes(m), `${n}: mark ${m}`);
    assert.ok(E.purpose && E.purpose.length > 8, `${n}: purpose`);
  }
});

test('the beats: pose first, the face after its anticipation, the mark at the peak, the peak held', () => {
  for (const n of EXPRESSION_NAMES) {
    const b = expressionBeats(n, { f: 100 }, 'kai', { hold: 4 }), P = POSES[EXPRESSIONS[n].pose];
    const pose = b.find(x => x.do), face = b.find(x => x.expr), marks = b.filter(x => x.mark);
    assert.equal(pose.f, 100); assert.ok(pose.hold >= MIN_HOLD, `${n}: hold ${pose.hold}`);
    assert.equal(face.f, 100 + (P.A ?? 3) + 2, `${n}: face lands 2 f into the action`);
    assert.equal(marks.length, marksOf(EXPRESSIONS[n]).length);
    // the mark lands MARK_LAG (2-4) frames after the face READS and is gone by the time the pose lets go
    assert.ok(MARK_LAG >= 2 && MARK_LAG <= 4);
    for (const m of marks) assert.ok(m.mark[1] >= MIN_HOLD && m.f + m.mark[1] <= pose.f + (P.A ?? 3) + Math.max(MOVE_T, P.T ?? 9) + pose.hold, `${n}: mark ${m.mark} outlives the pose`);
  }
  // word-anchored: the face lands where the engine puts it (EXPR_LEAD before the word, or earlier if asked), the pose
  // before it and the mark MARK_LAG after that, never the word's own frame
  for (const n of EXPRESSION_NAMES) for (const offset of [undefined, -2, 30, -40]) {
    const w = expressionBeats(n, { line: 'l01', on: 'gone', ...(offset != null ? { offset } : {}) }, 'kai'), A = POSES[EXPRESSIONS[n].pose].A ?? 3;
    const face = Math.min(w[1].offset, -EXPR_LEAD), b = expressionBeats(n, { f: 100 }, 'kai');
    assert.equal(w[1].offset, face, `${n}: the engine would pull the face to ${face}`); assert.equal(w[0].offset, face - A - 2);
    w.forEach((x, i) => assert.equal(x.offset - w[0].offset, b[i].f - 100, `${n}: the same spacing as at a frame`));
    if (offset === -40) assert.equal(w[0].offset, -40);
  }
  assert.throws(() => expressionBeats('meh', { f: 0 }, 'kai'), /unknown meh/);
});

// the face as the engine draws it (acting.js faceStateAt, s2's clocks), from a plain face and from every other expression's
test('the mark lands 2-4 frames after its face reads on screen (brows, lids and mouth >= 90 % there), never on the face before', async () => {
  (await import('../../styles/stick-man/engine/facestyles/s2.js')).use();
  for (const n of EXPRESSION_NAMES) for (const from of ['neutral', ...EXPRESSION_NAMES.filter(m => m !== n).map(m => EXPRESSIONS[m].face)]) {
    const b = expressionBeats(n, { f: 200 }, 'x'), face = b.find(x => x.expr);
    if (face.expr === from) continue;
    const track = [{ f: -1e9, expr: from }, { f: face.f, expr: face.expr, exprSpeed: face.exprSpeed }], c = faceChanges(track)[0];
    const there = f => { const s = faceStateAt(track, f, 7); return s.uf ? Math.min(s.uf.brow, s.uf.lid, s.uf.mouth) : s.phase === 'antic' ? 0 : s.u; };
    let reads = face.f; for (let f = c.s; f < face.f + 40; f++) if (there(f) < 0.9) reads = f + 1;
    for (const m of b.filter(x => x.mark)) {
      // (a take face coming from another take face is a plain fast change: it reads 4 f later, the mark lands with it)
      const lag = m.f - reads, least = c.cls === 'fast' && FACE_READ.take + MARK_LAG < FACE_READ.fast + 2 && m.f - face.f === FACE_READ.take + MARK_LAG ? -1 : 2;
      assert.ok(lag >= least && lag <= 4, `${from} -> ${n} (${c.cls}): ${m.mark[0]} lands ${lag} f after the face reads`);
    }
  }
});

// two expressions back to back, the second landing while the first still holds (as play.js compiles their beats: the mark
// beat's owner, cut MARK_CLEAR frames before the figure's next face key)
test('a mark never shows on the face before its own or the face after: every pair of expressions, however close', () => {
  for (const n of EXPRESSION_NAMES) for (const gap of [12, 25, 40, 80]) {
    const [p, q] = [expressionBeats(n, { f: 100 }, 'x', { hold: 45 }), expressionBeats('shocked', { f: 100 + gap }, 'x')];
    const faces = [...p, ...q].filter(b => b.expr).map(b => b.f);
    for (const m of p.filter(b => b.mark)) {
      assert.equal(m.f - m.markFace, faces[0], 'the mark knows its own face');
      const o = markOwner({ ...m, at: m.f }, () => Math.min(...faces.filter(f => f > m.f - m.markFace)) - MARK_CLEAR);   // (play.js)
      for (let f = 90; f < 320; f++) if (Object.keys(o.fn(f)).length) assert.ok(f >= faces[0] + FACE_READ.take + 2 && f <= faces[1] - MARK_CLEAR - 1, `${n} then shocked ${gap} f later: the mark shows at ${f}, faces at ${faces}`);
    }
  }
});

// a rough read of the black shape: where the two hands end up (figure frame, W units)
const handAt = (P, s) => { const h = P.hands?.[s]; if (!h) return STAND['hand' + s];
  if (h.h) return [h.h[0], h.h[1] + HEAD_C[1], h.h[2]]; return h.t || h.l || STAND['hand' + s]; };
const apart = (a, b) => Math.max(...['L', 'R'].map(s => Math.hypot(...handAt(POSES[a], s).map((v, i) => v - handAt(POSES[b], s)[i]))));
test('the pairs a viewer mixes up have different shapes (a hand >= 0.4 W elsewhere)', () => {
  for (const [x, y] of [['guilty', 'sad'], ['shy', 'embarrassed'], ['shocked', 'scared'], ['proud', 'smug'], ['proud', 'excited'], ['bored', 'confused'], ['guilty', 'embarrassed'], ['shy', 'proud'], ['shy', 'scared'], ['scared', 'proud']]) {
    const a = EXPRESSIONS[x].pose, b = EXPRESSIONS[y].pose;
    assert.notEqual(a, b, `${x} / ${y} share a pose`);
    if (POSES[a].hands || POSES[b].hands) assert.ok(apart(a, b) >= 0.4, `${x} / ${y}: hands only ${apart(a, b).toFixed(2)} W apart`);
  }
  assert.equal(new Set(EXPRESSION_NAMES.map(n => EXPRESSIONS[n].pose)).size, EXPRESSION_NAMES.length, 'one pose per expression');
});

test('head marks read on a phone: >= MARK_MIN of the head at rest, ink >= 3 px at a 120 px head, every mark pops in', () => {
  assert.ok(MARK_INK * 120 >= 3, `ink ${MARK_INK * 120} px`);
  assert.ok(GLYPH_INK * 120 >= 5, `the ! and ? carry the head ring's ink: ${GLYPH_INK * 120} px`);
  for (const m of ['sweat', 'anger', 'sparkle', 'question', 'exclaim', 'steam', 'stars', 'zzz', 'star', 'ellipsis', 'gloom', 'shake']) assert.ok(MARK_NAMES.includes(m), m);
  for (const m of MARK_NAMES) {
    assert.ok(MARK_SIZE[m] >= MARK_MIN, `${m}: rest size ${MARK_SIZE[m]}`);
    assert.ok(MARK_POP[m] >= 2 && MARK_POP[m] <= 7, `${m}: pop ${MARK_POP[m]} f`);
    // the biggest card the mark shows over its first second (after the pop) is at least the floor
    let big = 0; for (let a = 8; a < 38; a++) for (const c of markAt(m, 1, a, a)) big = Math.max(big, c[4]);
    if (m === 'ellipsis') assert.ok(big >= 0.08, `ellipsis dots ${big}`);
    else assert.ok(big >= MARK_MIN, `${m}: biggest card ${big.toFixed(2)} of the head`);
    // nothing over the face: a card is above the brows or past the head's rim
    for (let a = 8; a < 38; a++) for (const [, x, y] of markAt(m, 1, a, a)) assert.ok(y >= 0.3 || Math.abs(x) >= 0.5 || m === 'stars', `${m}: card at ${x.toFixed(2)}, ${y.toFixed(2)} over the face`);
  }
});

// a mock canvas that records every path point (card units: cardTex draws in -1..1 after its one translate / scale)
function recorder() {
  const pts = [], colours = new Set(), widths = [];
  const g = new Proxy({}, { get(t, k) { if (k === 'moveTo' || k === 'lineTo') return (x, y) => pts.push([x, y]); if (k in t) return t[k]; return () => {}; },
    set(t, k, v) { if (k === 'fillStyle' || k === 'strokeStyle') colours.add(v); if (k === 'lineWidth') widths.push(v); t[k] = v; return true; } });
  return { pts, colours, widths, cv: { width: 0, height: 0, getContext: () => g } };
}
test('marks are ink and white (one soft fill at most), and the anger vein is mirror-symmetric (never a pinwheel)', async () => {
  const { markTexture } = await import('../../styles/stick-man/engine/headmarks.js');
  const kinds = ['sweat', 'anger', 'sparkle', 'star', 'big_star', 'question', 'exclaim', 'zzz', 'steam', 'steam_l', 'dot', 'gloom', 'shake'];
  for (const k of kinds) {
    const R = recorder(); globalThis.document = { createElement: () => R.cv };
    markTexture(k);
    for (const c of R.colours) { const m = String(c).match(/(\d+),\s*(\d+),\s*(\d+)/); if (!m) continue;
      const [r, gg, b] = m.slice(1).map(Number); assert.ok(Math.max(r, gg, b) - Math.min(r, gg, b) <= 50, `${k}: colour ${c} (no emoji colours)`); }
    // the white shapes carry the '?'s own ink line, wholly outside the white (half of it under the white was near invisible
    // at 120 px): the visible half of the stroke, in card units, is MARK_INK of the head on the mark's card
    if (['sparkle', 'star', 'big_star', 'shake', 'sweat', 'question', 'exclaim'].includes(k)) {
      const size = MARK_SIZE[{ star: 'stars', big_star: 'star' }[k] || k], W = Math.max(...R.widths);
      // (shake is a plain ink line with no fill: its whole width shows; "!" and "?" lay a white stroke over a wider ink one)
      const glyph = k === 'question' || k === 'exclaim', px = (k === 'shake' ? W : glyph ? (W - Math.min(...R.widths)) / 2 : W / 2) * size / 2 * 120;
      assert.ok(px >= (glyph ? 5 : 4), `${k}: ${px.toFixed(1)} px of ink outside its fill at a 120 px head`);
      const ink = v => { const [r, g, b] = String(v).match(/\d+/g).map(Number); return 0.3 * r + 0.59 * g + 0.11 * b; };
      assert.ok([...R.colours].some(c => ink(c) < 40), `${k}: no dark ink`);
    }
    if (k !== 'anger') continue;
    // a swastika has 4-fold rotation but no mirror line: the vein must map onto itself in both mirrors
    const near = (p, q) => R.pts.some(([x, y]) => Math.hypot(x - p, y - q) < 0.03);
    assert.ok(R.pts.length > 20);
    for (const [x, y] of R.pts) { assert.ok(near(-x, y), `anger: (${x.toFixed(2)}, ${y.toFixed(2)}) has no left-right mirror`); assert.ok(near(x, -y), `anger: no up-down mirror`); }
  }
  delete globalThis.document;
});

test('the expression faces: new e_ designs (no catalogue design edited), no own marks, eyes that pass the eye gate', () => {
  for (const [n, D] of Object.entries(EXPR_DESIGNS)) {
    assert.ok(n.startsWith('e_'), n); assert.ok(!D.marks, `${n}: a face design carries no mark (the beat brings it after the face)`);
    const r = judge(D); assert.ok(r.squeeze || r.ok || (D.x?.eArc ?? 0) !== 0, `${n}: eye gate ${r.bad?.join('; ')}`);
  }
  for (const n of EXPRESSION_NAMES) { const f = EXPRESSIONS[n].face; assert.ok(!(DESIGNS[f]?.marks?.length), `${n}: face ${f} brings its own mark at the face change`); }
  // no flat lid bar over a big pupil (read as sunglasses): a half lid slopes at the outer corner, or the eyes are shut
  for (const n of ['proud', 'smug']) { const D = DESIGNS[EXPRESSIONS[n].face]; assert.ok((D.x?.eArc || 0) !== 0 || ((D.lid || 0) < 0.2 || Math.abs(D.lidTilt || 0) >= 10), `${n}: flat half lid`); }
  assert.ok(!(DESIGNS[EXPRESSIONS.guilty.face].x?.gloom), 'guilty: no forehead lines (they read as bangs)');
});

test('marks keep clear: steam never over the anger vein, sweat never on a shake arc, the gloom cloud never crosses the head outline', () => {
  const box = c => [c[1] - c[4] / 2, c[1] + c[4] / 2, c[2] - c[4] / 2, c[2] + c[4] / 2];
  for (let a = 0; a < 40; a++) {
    const v = box(markAt('anger', 1, a, a)[0]);
    for (const c of markAt('steam', 1, a, a)) { const b = box(c); const ix = Math.min(v[1], b[1]) - Math.max(v[0], b[0]), iy = Math.min(v[3], b[3]) - Math.max(v[2], b[2]); assert.ok(Math.min(ix, iy) <= 0.02, `steam over the vein at age ${a}`); }
    // (the drop's card and the arcs: the arc's ink starts 0.28 of its card from the middle)
    const d = box(markAt('sweat', 1, a, a)[0]), arc = markAt('shake', 1, a, a).find(c => c[1] > 0); assert.ok(d[1] - 0.2 * 0.36 <= arc[1] - 0.25 * arc[4] || d[2] >= arc[2] + 0.45 * arc[4], `sweat over a shake arc at age ${a}`);
    const gl = markAt('gloom', 1, a, a)[0], bottom = gl[2] - 0.5 * gl[4] * 0.86;   // the cloud and its rain reach 86 % down the card
    assert.ok(bottom >= 0.52, `gloom cloud reaches ${bottom.toFixed(2)} (the head's crown is ~0.5)`);
  }
});

test('e_proud, e_guilty and e_sleepy keep what the blind rounds asked for: no half lid on proud, no mark or sweat on guilty, no tear on sleepy', () => {
  const P = EXPR_DESIGNS.e_proud, G = EXPR_DESIGNS.e_guilty, S = EXPR_DESIGNS.e_sleepy;
  assert.ok((P.lid || 0) <= 0.1 && !P.x.eArc && Math.abs(P.brow[0]) <= 4 && !P.brow[3] && !P.brow[4] && !P.gx && P.mw >= 1.3, 'proud: open eyes straight on, level even brows, a big mouth');
  assert.equal(EXPRESSIONS.guilty.mark, null); assert.ok(!G.x.sw && !G.x.mWv && G.gx <= -1 && G.x.gY <= -0.9 && G.mw <= 0.5);
  assert.ok(!S.x.tear1 && Math.abs(S.brow[0]) <= 6);
});
