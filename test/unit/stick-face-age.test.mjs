// The s2 face's age layer (styles/stick-man/engine/facestyles/s2age.js, kit faces v4): adult is today's face, every other
// age draws differently, and the V2.1 designs themselves are untouched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { STYLE_DRAW, mixFace } from '../../styles/stick-man/engine/faces.js';
import { faceStateAt } from '../../styles/stick-man/engine/acting.js';

const S2 = await import('../../styles/stick-man/engine/facestyles/s2.js');
const { AGES, AGE_NAMES, ageOf, ageFace } = await import('../../styles/stick-man/engine/facestyles/s2age.js');
S2.use();

// a 2D context that logs every call and property set, numbers rounded, so two drawings compare exactly
function recorder() {
  const log = [], r = v => typeof v === 'number' ? Math.round(v * 1e5) / 1e5 : v;
  const g = new Proxy({ canvas: { width: 512, height: 512 }, getTransform: () => ({}) }, {
    get(t, k) { if (k in t) return t[k]; return (...a) => { log.push(`${String(k)}(${JSON.stringify(a, (_, v) => r(v))})`); if (/^create.*Gradient$/.test(k)) return { addColorStop() {} }; }; },
    set(t, k, v) { log.push(`${String(k)}=${JSON.stringify(r(v))}`); return true; } });
  return { g, log };
}
const held = name => { const { F } = mixFace(faceStateAt([{ f: -1e9, expr: name }], 100, 7, null)); return { ...F, age: 60, hpx: 300 }; };
const draw = (name, o) => { const { g, log } = recorder(); STYLE_DRAW.s2(g, held(name), 0, 0, o); return log.join('\n'); };
const NAMES = Object.keys(S2.DESIGNS);

test('the age comes from spec.faceAge only (never the body type); a plain child or toddler is a variant; a wrong name throws', () => {
  assert.equal(ageOf({}), null); assert.equal(ageOf({ faceAge: 'adult' }), null);
  for (const motionBody of ['child', 'elder', 'heavy']) assert.equal(ageOf({ motionBody }), null, `${motionBody} body, no faceAge`);
  assert.equal(ageOf({ faceAge: 'elder' }), AGES.elder); assert.equal(ageOf({ faceAge: 'teen', motionBody: 'elder' }), AGES.teen);
  assert.equal(ageOf({ faceAge: 'child' }), AGES.child_hi);
  assert.equal(ageOf({ faceAge: 'toddler' }), AGES.toddler_lo);
  assert.throws(() => ageOf({ faceAge: 'baby' }), /faceAge 'baby'/);
});

test('adult is a no-op on every design: the same face object, the same drawing call for call', () => {
  const F = held('happy'); assert.equal(ageFace(F, null), F);
  for (const n of NAMES) assert.equal(draw(n, { faceAge: 'adult' }), draw(n, {}), n);
  for (const n of NAMES) for (const motionBody of ['heavy', 'child', 'elder']) assert.equal(draw(n, { motionBody }), draw(n, {}), `${n}: a ${motionBody} body alone is today's face`);
});

test('every other age changes the drawing of every design', () => {
  for (const a of AGE_NAMES.filter(a => a !== 'adult')) for (const n of NAMES) assert.notEqual(draw(n, { faceAge: a }), draw(n, {}), `${a} ${n}`);
});

test('an elder adds ink (lines), a child and a toddler draw bigger eyes lower or higher on the head', () => {
  const strokes = s => s.split('\n').filter(l => l.startsWith('fill(')).length;
  assert.ok(strokes(draw('neutral', { faceAge: 'elder' })) >= strokes(draw('neutral', {})) + 6, 'two crow\'s feet ticks a side, two forehead lines');
  const F = held('neutral');
  for (const a of ['child_hi', 'toddler_lo', 'toddler_hi']) { const G = ageFace(F, AGES[a]); assert.ok(G.rx > F.rx * 1.2 && G.ry > F.ry * 1.2 && G.mw < F.mw * 0.7, a); }
  assert.ok(AGES.child_hi.eY > 0 && AGES.toddler_hi.eY > 0 && AGES.toddler_lo.eY < 0);
  assert.ok(AGES.toddler_lo.eye[0] > AGES.child_hi.eye[0] && AGES.child_hi.eye[0] > AGES.teen.eye[0] && AGES.teen.eye[0] === 1);
  assert.ok(!('child_lo' in AGES) && !AGE_NAMES.includes('child_lo'), 'child_lo is gone (the same read as child_hi)');
  const E = ageFace(F, AGES.elder); assert.ok(E.lid >= 0.3 && E.lidTilt <= -8 && E.aLw < 0.8 && E.bw < F.bw, 'an elder: heavy lids sagging at the outer end (a level thick bar is a spectacle rim), thinner brows');
  // a child's brows keep the design's weight at ~66 % of the length (hairlines took the anger out); a toddler's are near gone
  // at rest, and both are there, steeper and lower, for a scowl
  for (const a of ['child_hi', 'toddler_lo', 'toddler_hi']) { const G = ageFace(F, AGES[a]), N = ageFace(held('angry'), AGES[a]), tot = /toddler/.test(a);
    assert.ok(tot ? G.bw * G.aBl < 0.25 * F.bw : G.bw >= 0.78 * F.bw && G.aBl >= 0.58 && G.aBl <= 0.68, a);
    assert.ok(N.bw >= 0.78 * held('angry').bw && N.aBl >= 0.58 && N.brow[0] > 24 && N.brow[1] - N.ry < G.brow[1] - G.ry - 0.02, `${a}: an angry kid's brows are there, steeper and lower`); }
  const T = ageFace(F, AGES.teen); assert.ok(T.rx === F.rx && T.ry === F.ry && T.lid >= 0.3 && T.bw < F.bw && T.x.mSk > 0.2, 'a teen: the adult\'s eyes under sleepy lids, thinner brows, a lopsided mouth');
  assert.ok(T.lid < E.lid + 0.02 && T.lidTilt === 0, 'a teen\'s lids are level, an elder\'s sag');
});

// every ellipse drawn, [x, y, rx, ry]
const ellipses = s => s.split('\n').filter(l => l.startsWith('ellipse(')).map(l => JSON.parse(l.slice(8, -1)));
test('kid mouths in shock, anger and sleep are at least 0.8 of an eye wide; the shocked one is a tall oval clear of the eyes and the chin', () => {
  for (const a of ['child_hi', 'toddler_lo', 'toddler_hi']) {
    for (const n of ['shock', 'angry', 'sleep', 'y_fear', 'scream', 'cry']) { const G = ageFace(held(n), AGES[a]); assert.ok(0.105 * G.mw >= 0.8 * G.rx, `${a} ${n}: mouth ${(0.105 * G.mw / G.rx).toFixed(2)} of an eye`); }
    const Y = ageFace(held('yawn'), AGES[a]); assert.ok(0.064 * Y.mw >= 0.8 * Y.rx, `${a} yawn`);
    const G = ageFace(held('shock'), AGES[a]), [, y, w, h] = ellipses(draw('shock', { faceAge: a })).pop(), eyeLow = G.x.eY - G.ry * (1 + G.x.eSt);
    assert.ok(h > w, `${a}: a tall oval`); assert.ok(y + h < eyeLow - 0.01, `${a}: mouth top ${(y + h).toFixed(3)}, eyes end ${eyeLow.toFixed(3)}`); assert.ok(y - h > -0.39, `${a}: inside the chin`);
  }
});

test('a toddler at rest shows one tooth in a small round open mouth, a teen braces on an open smile and pimples on one cheek, nobody else', () => {
  for (const a of ['toddler_lo', 'toddler_hi']) { const [x, , w, h] = ellipses(draw('neutral', { faceAge: a })).pop(); assert.ok(x === 0 && w <= 0.06 && h / w > 0.8 && h / w < 1.2, `${a}: round`); assert.ok(2 * w < 2 * ageFace(held('neutral'), AGES[a]).rx * 0.8, `${a}: small`); }
  assert.equal(AGES.teen.mouth, 'braces'); assert.deepEqual(AGES.teen.ink, ['pimples']);
  const side = ellipses(draw('neutral', { faceAge: 'teen' })).filter(([x, , r]) => Math.abs(x) > 0.17 && r < 0.03).map(([x]) => Math.sign(x));
  assert.ok(side.length >= 4 && new Set(side).size === 1, 'pimples on one cheek');
  assert.notEqual(draw('happy', { faceAge: 'teen' }).split('\n').length, draw('happy', {}).split('\n').length);
  for (const a of ['elder', 'child_hi']) assert.ok(!['braces', 'tooth'].includes(AGES[a].mouth));
});

test('the V2.1 designs stay as they are (the age layer never writes a design)', () => {
  for (const a of AGE_NAMES) for (const n of NAMES) draw(n, { faceAge: a });
  const v21 = NAMES.filter(n => /^[yc]_/.test(n) && n !== 'y_calm').sort();
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(v21.map(n => [n, S2.DESIGNS[n]]))).digest('hex').slice(0, 12), 'e3573a542db6');
});

test('a faceAge the face style cannot draw (the dot-eye kit faces: the buyer pack default) warns once; s2 never warns', async () => {
  const { faceRig, FACE_STYLE } = await import('../../styles/stick-man/engine/faces.js');
  const doc = globalThis.document, warn = console.warn, said = [], name = FACE_STYLE.name;
  globalThis.document = { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => recorder().g }) };
  console.warn = m => said.push(String(m));
  try {
    faceRig(1, { faceAge: 'elder' }); faceRig(1, {}); assert.deepEqual(said, [], 's2 draws the age');
    FACE_STYLE.name = null;
    faceRig(1, {}); faceRig(1, { faceAge: 'adult' }); assert.deepEqual(said, [], 'no age asked, no warning');
    faceRig(1, { faceAge: 'elder' }); faceRig(1, { faceAge: 'child' });
    assert.equal(said.length, 1, said.join('\n')); assert.match(said[0], /faceAge 'elder'.*face style/);
  } finally { FACE_STYLE.name = name; console.warn = warn; globalThis.document = doc; }
});
