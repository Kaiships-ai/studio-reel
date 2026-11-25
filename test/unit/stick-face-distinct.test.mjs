// The kit faces a viewer could mix up (s2.js LOOKALIKE: happy / grin / excited, sad / disappointed, shy / embarrassed / blush,
// ...) differ in at least two of eyes, brows, mouth and extras (Kai 25/11: "no two faces that read the same"). A feature
// differs when its mark changes kind or its numbers move past what reads at phone size.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { DESIGNS, ALIASES, LOOKALIKE } = await import('../../styles/stick-man/engine/facestyles/s2.js');
const on = (x, n) => (x[n] || 0) >= 0.5;
const EXTRAS = ['blush', 'sw', 'sw2', 'shiver', 'bags', 'puff', 'sigh', 'dots', 'gloom', 'scrunch', 'tear1'];

export function features(d) {
  const x = d.x || {}, tear = (x.tear || 0) < 0.03 ? '' : x.tear < 0.6 ? 'drop' : 'stream';
  const eye = on(x, 'eHeart') ? 'heart' : on(x, 'eSpiral') ? 'spiral' : Math.abs(x.eArc || 0) >= 0.5 ? `arc${Math.sign(x.eArc)}` : on(x, 'wink') ? 'wink'
    : (x.eCr || 0) >= 0.6 ? 'shut' : 'open';
  const mouth = on(x, 'mTongue') ? 'tongue' : on(x, 'mSnarl') ? 'snarl' : on(x, 'mKiss') ? 'kiss' : (x.mO || 0) >= 0.5 ? 'O' : (x.mGrim || 0) > 0.02 ? 'teeth' : (x.mOpen || 0) >= 0.06 ? 'open' : 'line';
  const [tilt, h, arch = 0, lL = 0, lR = 0] = d.brow;
  return {
    eyes: { kind: eye, lid: d.lid || 0, low: d.low || 0, white: d.white || 0, gx: d.gx || 0, gy: (d.gy || 0) + (x.gY || 0), star: on(x, 'eStar'), asym: x.eAsym || 0, tear },
    brows: { tilt, h: h + Math.max(arch, 0), cock: lR - lL },
    mouth: { kind: mouth, c: x.mC ?? 0, open: x.mOpen || 0, sk: x.mSk || 0, w: d.mw || 1, teeth: x.mTeeth || 0 },
    extras: [...EXTRAS.filter(n => (x[n] || 0) > 0.3), ...(d.marks || []).map(m => m[0]), ...(d.tint ? ['tint'] : [])].sort().join(' '),
  };
}
export function differs(a, b) {
  const E = a.eyes, F = b.eyes, M = a.mouth, N = b.mouth, out = [];
  if (E.kind !== F.kind || E.tear !== F.tear || E.star !== F.star || Math.abs(E.asym - F.asym) >= 0.12
    || (E.kind === 'open' && (Math.abs(E.lid - F.lid) >= 0.15 || Math.abs(E.low - F.low) >= 0.15 || Math.abs(E.white - F.white) >= 0.3 || Math.hypot(E.gx - F.gx, E.gy - F.gy) >= 0.5))) out.push('eyes');
  if (Math.abs(a.brows.tilt - b.brows.tilt) >= 10 || Math.abs(a.brows.h - b.brows.h) >= 0.02 || Math.abs(a.brows.cock - b.brows.cock) >= 0.02) out.push('brows');
  if (M.kind !== N.kind || Math.abs(M.c - N.c) >= 0.4 || Math.abs(M.open - N.open) >= 0.3 || Math.abs(M.sk - N.sk) >= 0.4 || Math.abs(M.w - N.w) >= 0.3 || Math.abs(M.teeth - N.teeth) >= 0.4) out.push('mouth');
  if (a.extras !== b.extras) out.push('extras');
  return out;
}
const design = n => DESIGNS[n] || DESIGNS[ALIASES[n]];

test('every look-alike pair names two faces a character can use', () => {
  for (const [a, b] of LOOKALIKE) { assert.ok(design(a), a); assert.ok(design(b), b); }
});

test('every look-alike pair differs in at least two of eyes, brows, mouth, extras', () => {
  const close = LOOKALIKE.map(([a, b]) => [a, b, differs(features(design(a)), features(design(b)))]).filter(([, , d]) => d.length < 2);
  assert.deepEqual(close.map(([a, b, d]) => `${a} / ${b}: only ${d.join(', ') || 'nothing'}`), []);
});
