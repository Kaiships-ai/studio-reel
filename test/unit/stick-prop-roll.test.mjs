// A prop carried along the forearm keeps its top up (engine/cast.js handProps, userData.top). Hot Money ep01 r5 GUN (Kai
// 19/11 "cảnh sát cầm súng sai"): the pistol's +y followed the forearm by the shortest arc from up, so on an arm held
// forward its slide lay to the side; the kit's own Act_PistolShoot_Once held it on its side at every aim frame.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rigClip } from '../../styles/stick-man/tools/motionlib.mjs';
import { getClip } from '../../styles/stick-man/motion-lib/index.js';
import { BUILD } from '../../styles/stick-man/lib/cast/handprops.js';
import '../../styles/stick-man/motion-lib/props.js';

// 'along' props whose roll does not show (round, or symmetric about the forearm) or that no film has needed upright yet;
// this list only shrinks: a new 'along' prop declares `top` (the axis that faces up in the hand) or `round: true`
const ROLL_FREE = ['hammer', 'pencil', 'drumstick', 'megaphone', 'chilli', 'torch', 'hotdog'];

test('roll: the kit pistol is held slide up wherever the arm points (PistolShoot: aim frames up-ness >= 0.95)', async () => {
  const worst = { aim: 1, any: 1 };
  await rigClip(getClip('Act_PistolShoot_Once'), undefined, { each: (f, S) => {
    for (const [id, p] of Object.entries(S.props)) {
      if (!p.visible || !/pistol$/.test(id)) continue;
      p.updateMatrixWorld(true); const e = p.matrixWorld.elements, n = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
      const barrel = n([e[4], e[5], e[6]]), top = n([e[8], e[9], e[10]]), room = Math.sqrt(Math.max(0, 1 - barrel[1] ** 2));
      if (room < 0.8) continue;                                  // raised by the face or pointed down: the roll eases to the arc's (off the cap)
      const up = top[1] / room;                                  // 1 = the slide as far up as the barrel lets it
      worst.any = Math.min(worst.any, up); if (Math.abs(barrel[1]) < 0.3) worst.aim = Math.min(worst.aim, up);
    }
  } });
  assert.ok(worst.aim >= 0.95, `aim frames: the slide is ${worst.aim.toFixed(2)} of the way up (on its side at 0, upside down at -1)`);
  assert.ok(worst.any >= 0.5, `any frame under 37 deg off level: ${worst.any.toFixed(2)}`);
});

test('roll: every along-the-forearm prop says which way is up (userData.top) or that it has none (round)', () => {
  const along = Object.entries(BUILD).map(([k, f]) => [k, f().userData || {}]).filter(([, u]) => u.mode === 'along');
  const loose = along.filter(([k, u]) => !u.top && !u.round && !ROLL_FREE.includes(k)).map(([k]) => k);
  assert.deepEqual(loose, [], `give these a top axis (motion-lib/props.js pistol: top: [0, 0, 1]) or round: true: ${loose.join(', ')}`);
  const stale = ROLL_FREE.filter(k => !along.some(([n, u]) => n === k && !u.top && !u.round));
  assert.deepEqual(stale, [], `ROLL_FREE lists props that are gone or declare a top now: delete ${stale.join(', ')}`);
});
