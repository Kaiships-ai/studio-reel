// Face changes stay smooth when keys come close together (films/hm-ep01-r2/review/face-research.md, rule 1): a new
// change blends from the face on screen, never from the previous target. SH240's keys (panic 0, shock 8, sad 12,
// happy 17) made the brow jump -12.1 -> -19.8 deg in one frame, away from the new target.
import test from 'node:test';
import assert from 'node:assert/strict';
import { faceStateAt } from '../../styles/stick-man/engine/acting.js';
import { mixFace, faceParams } from '../../styles/stick-man/engine/faces.js';

const SH240 = [{ f: 0, expr: 'panic' }, { f: 8, expr: 'shock' }, { f: 12, expr: 'sad' }, { f: 17, expr: 'happy' }];
const curve = (track, f0, f1) => {
  const out = [];
  for (let f = f0; f < f1; f++) { const s = faceStateAt(track, f, 7, null), { F } = mixFace(s); out.push({ f, tilt: F.brow[0], lid: F.lid, b: s.b }); }
  return out;
};

test('rule 1: an interrupted change blends from the face on screen (SH240 keys: no backward jump)', () => {
  const c = curve(SH240, 0, 50);
  for (let i = 1; i < c.length; i++) {
    const d = c[i].tilt - c[i - 1].tilt, toward = faceParams(c[i].b).brow[0] - c[i - 1].tilt;
    // a step away from the target of the change on screen, bigger than the hold drift, is a pop
    assert.ok(!(d * toward < 0 && Math.abs(d) > 1.0), `f${c[i].f}: brow ${c[i - 1].tilt.toFixed(1)} -> ${c[i].tilt.toFixed(1)} deg, away from ${c[i].b}`);
  }
  const worst = Math.max(...c.slice(1).map((x, i) => Math.abs(x.tilt - c[i].tilt)));
  assert.ok(worst < 5, `largest one-frame brow change ${worst.toFixed(1)} deg (main: 7.7 at f17)`);
});
