// UNSAFE_PAIRS (kit/cast/clothsafe.js): a pair of one body, what it wears and one clip that is known not to be clean, with the number
// that showed it. fits.mjs blocks the pair whatever a later measure says; a pair failing two fixes goes here.
import test from 'node:test';
import assert from 'node:assert/strict';

const { UNSAFE_PAIRS, unsafePair } = await import('../../styles/stick-man/kit/cast/clothsafe.js');
const F = await import('../../styles/stick-man/tools/gates/fits.mjs');
const clean = { frames: 100, faults: [], armMm: -20 };

test('every unsafe pair names a body, a clip, a number with its unit and why', () => {
  assert.ok(UNSAFE_PAIRS.length >= 10);
  for (const p of UNSAFE_PAIRS) {
    assert.match(p.body, /^(adult|elder|teen|child|toddler)$/, JSON.stringify(p)); assert.match(p.clip, /^([A-Z]\w+|\*)$/, JSON.stringify(p));
    assert.ok(Array.isArray(p.wears)); assert.equal(typeof p.number, 'number', JSON.stringify(p)); assert.ok(p.unit && p.why, JSON.stringify(p));
  }
});

test('a child playing Idle_Breath_Loop is blocked, in any outfit, with a clean measure', () => {
  for (const outfit of [[], ['sweater']]) {
    const r = F.verdictOf({ body: 'child', outfit }, 'Idle_Breath_Loop', clean);
    assert.equal(r.verdict, 'blocked'); assert.match(r.why, /pinned|Idle_Fidget/);
  }
  assert.equal(F.verdictOf({ body: 'adult', outfit: [] }, 'Idle_Breath_Loop', clean).verdict, 'pass', 'only the child');
  assert.equal(F.verdictOf({ body: 'child', outfit: [] }, 'Idle_Stand_Loop', clean).verdict, 'pass', 'only that clip');
});

test('a teen in a hoodie is blocked on every clip (the hood hides the face), not untested; an adult in one stays untested', () => {
  for (const clip of ['Idle_Stand_Loop', 'Gest_Wave_Loop']) {
    const r = F.verdictOf({ body: 'teen', outfit: ['hoodie:grey'] }, clip, clean);
    assert.equal(r.verdict, 'blocked', clip); assert.equal(r.number, 0.026); assert.match(r.why, /hood/);
  }
  assert.equal(F.verdictOf({ body: 'adult', outfit: ['hoodie:grey'] }, 'Idle_Stand_Loop', clean).verdict, 'untested');
});

test('a pair matches on the garments it names, whatever their colour or the other layers', () => {
  const p = UNSAFE_PAIRS.find(x => x.clip === 'Gest_Clap_Loop' && x.wears.length);
  assert.ok(p, 'Gest_Clap_Loop has a pair'); assert.ok(unsafePair({ body: p.body, girth: p.girth, outfit: [...p.wears.map(w => `${w}:red`), 'scarf'] }, 'Gest_Clap_Loop'));
  assert.equal(unsafePair({ body: p.body, girth: p.girth, outfit: [] }, 'Gest_Clap_Loop'), null, 'not without its garments');
  const r = F.verdictOf({ body: p.body, girth: p.girth, outfit: p.wears }, 'Gest_Clap_Loop', clean); assert.equal(r.verdict, 'blocked'); assert.equal(r.number, p.number);
});

test('the eight pairs of fits-main (25/11) are in the list', () => {
  const n = c => UNSAFE_PAIRS.filter(p => p.clip === c).length;
  assert.ok(n('React_Terrified_Once') >= 3); assert.ok(n('Gest_Clap_Loop') >= 3); assert.ok(n('Gest_SitClap_Loop') >= 2);
});

test('the table: a usable row of an unsafe pair is a fault of the table itself; the real table has none', async () => {
  const fs = await import('node:fs'), T = JSON.parse(fs.readFileSync(new URL('../../styles/stick-man/kit/compat.json', import.meta.url), 'utf8'));
  assert.deepEqual(F.tableFaults(T), []);
  const r = T.rows.find(x => x.pair.endsWith('|Gest_Clap_Loop') && x.verdict === 'blocked' && x.pair.includes('coat:lab'));
  const t = F.tableFaults({ ...T, rows: T.rows.map(x => (x === r ? { ...x, verdict: 'pass', number: 0, bad: 0 } : x)) });
  assert.equal(t.length, 1, t.join('\n')); assert.match(t[0], /UNSAFE_PAIRS/);
});
