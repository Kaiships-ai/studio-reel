// Every head factory (hair, hats, the monocle) tags the builder it returns with { part, params }: the part's name and the
// arguments it was made with, so a spec's hair can be written down as data. A builder found without a tag fails, whether a
// cast spec wears it or a factory module exports it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { recordingDocument } from './look-fingerprint.mjs';

globalThis.document ??= recordingDocument();
const MODULES = { 'engine/cast.js': null, 'kit/cast/extras.js': null, 'kit/cast/rail.js': null, 'kit/cast/hair.js': null };
for (const p of Object.keys(MODULES)) MODULES[p] = await import(`../../styles/stick-man/${p}`);
const { SPECS } = await import('../../styles/stick-man/engine/play.js');

const plain = v => v == null || ['number', 'string', 'boolean'].includes(typeof v) || (Array.isArray(v) ? v.every(plain) : Object.getPrototypeOf(v) === Object.prototype && Object.values(v).every(plain));
const untagged = fns => fns.filter(f => typeof f.part !== 'string' || f.params?.constructor !== Object || !plain(f.params)).map(f => f.name || String(f).slice(0, 40));
// an export that takes no argument it must be given and hands back a function is a head factory
const factories = () => Object.entries(MODULES).flatMap(([p, M]) => Object.entries(M).filter(([, f]) => typeof f === 'function' && f.length === 0 && !/^class\b/.test(String(f))).flatMap(([name, f]) => {
  let made; try { made = f(); } catch { return []; }
  return typeof made === 'function' ? [{ at: `${p} ${name}`, name, made }] : [];
}));

test('every head factory the modules export returns a builder tagged with its own name and plain params', () => {
  const found = factories();
  assert.deepEqual(found.map(f => f.name).sort(), ['bandana', 'beanie', 'bowler', 'bun', 'curls', 'flatCap', 'guardCap', 'hairCap', 'monocle', 'railCap', 'sunHat', 'toonHair', 'topHat', 'visor']);
  for (const f of found) assert.equal(f.made.part, f.name, f.at);
  assert.deepEqual(untagged(found.map(f => f.made)), []);
});

test('every hair entry of every cast spec carries its tag', () => {
  assert.ok(Object.keys(SPECS).length >= 17, 'the rail and extras specs are registered');
  for (const [n, spec] of Object.entries(SPECS)) assert.deepEqual(untagged(spec.hair || []), [], n);
});

test('control: a bare closure, a tag with no params and a tag holding a function are found', () => {
  const bare = () => null, noParams = Object.assign(() => null, { part: 'x' }), fnParam = Object.assign(() => null, { part: 'x', params: { f: () => 1 } });
  assert.equal(untagged([bare, noParams, fnParam]).length, 3);
});
