// A leg keeps its length (Hot Money rig test 17/11: Trans_JumpWindow_Once frame 32 shin +11.4 %, the left leg a stub
// under the hip; Act_DropInTrunk_Once and Act_PushBagOutWindow_Once thigh +5.5 %, both feet flat on the floor).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIMB } from '../../styles/stick-man/engine/cast.js';
import { getClip } from '../../styles/stick-man/motion-lib/index.js';
import { rigClip, rigStick } from '../../styles/stick-man/tools/gates/motionlib.mjs';

const BONE_PCT = 3, d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const bones = g => [d3(g.hip.toArray(), g.knee.toArray()), d3(g.knee.toArray(), g.ankle.toArray())];

test('leg reach: a foot in the air past the leg\'s reach stops short on the hip-to-target line; the hips stay', async () => {
  const { S } = await rigStick('adult'), want = [-0.14, 0.9, -1.4];
  S.pose2({ legL: { foot: want } }); const g = S.rig.L;
  for (const b of bones(g)) assert.ok(Math.abs(b / LIMB.thigh - 1) < 1e-3, `bone ${b.toFixed(4)} W, length ${LIMB.thigh}`);
  const toWant = d3(g.hip.toArray(), want), toAnkle = d3(g.hip.toArray(), g.ankle.toArray());
  assert.ok(toWant > 2 * LIMB.thigh * 1.05, `the target is out of reach (${toWant.toFixed(3)} W)`);
  assert.ok(d3(g.ankle.toArray(), want) - (toWant - toAnkle) < 1e-3, 'the ankle lies on the line from the hip to its target');
  S.pose2({}); assert.ok(d3(S.rig.L.hip.toArray(), g.hip.toArray()) < 1e-6, 'a swing foot does not move the hips');
});

test('leg reach: hips keyed too high over planted feet come down to them; the feet stay where they were keyed', async () => {
  const { S } = await rigStick('adult');
  S.pose2({}); const rest = ['L', 'R'].map(s => S.rig[s].ankle.clone());
  S.pose2({ bob: 0.25 });
  ['L', 'R'].forEach((s, i) => {
    for (const b of bones(S.rig[s])) assert.ok(b / LIMB.thigh - 1 < 1e-3, `${s} bone ${b.toFixed(4)} W`);
    assert.ok(S.rig[s].ankle.distanceTo(rest[i]) < 1e-3, `${s} ankle moved ${S.rig[s].ankle.distanceTo(rest[i]).toFixed(4)} W`);
  });
});

test('leg reach: the clips that keyed feet past reach keep every leg bone within 3 % and their planted feet still', async () => {
  for (const name of ['Trans_JumpWindow_Once', 'Act_DropInTrunk_Once', 'Act_PushBagOutWindow_Once']) {
    let rest = null, worst = 0, at = null; const ankles = [];
    await rigClip(getClip(name), undefined, { each: (f, S, w) => {
      const len = ['L', 'R'].flatMap(s => [d3(w[s].hip, w[s].knee), d3(w[s].knee, w[s].ankle)]); rest ||= len;
      len.forEach((l, i) => { const p = 100 * Math.abs(l / rest[i] - 1); if (p > worst) { worst = p; at = f; } });
      ankles.push(['L', 'R'].map(s => w[s].ankle));
    } });
    assert.ok(worst <= BONE_PCT, `${name}: a leg bone ${worst.toFixed(2)} % off its length at frame ${at}`);
    if (name.startsWith('Act_')) for (let f = 29; f <= 38; f++) for (const s of [0, 1])
      assert.ok(100 * d3(ankles[f][s], ankles[28][s]) < 0.5, `${name}: the planted ${'LR'[s]} foot slid ${(100 * d3(ankles[f][s], ankles[28][s])).toFixed(2)} cm by frame ${f}`);
  }
});
