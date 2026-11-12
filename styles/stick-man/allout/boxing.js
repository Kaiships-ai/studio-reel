// Boxing for the stick cast (allout kit): a bladed guard that bounces on the balls of the feet, the four punches (jab,
// cross, hook, uppercut), the defence (slip, duck, high block), the hits taken (head snap, body fold), footwork that
// moves the fighter without touching the arms (`shuffle`), and gloves as a costume layer.
//   import '/styles/stick-man/allout/costume.js'; import '/styles/stick-man/allout/boxing.js'
//   cast: { kai: { spec: 'KAI', costume: ['gloves'] } }          gloves[:rrggbb]
//   beats: { f, who: 'kai', do: 'guard', hold: 300 }                the base stance; every punch returns to it by itself
//          { f, who: 'kai', do: 'jab' }  cross, hook, uppercut, slip, duck, block, hit_head, hit_body
//          { f, who: 'kai', do: 'shuffle', by: [dx, dy], dur: 8 }   a step in / out / round, arms untouched
// Every boxing pose keeps the torso pitch near the guard's (9-13 deg): a hand target is placed with its own pose's
// pitch while the shoulder carries the sum of the poses crossfading, so a big pitch change drags the shoulder over the
// glove and flips the elbow; ducks and body shots go down through the knees (bob) instead.
// Punches start with no anticipation (A 0-1): a hand anticipating backward passes through the shoulder and the elbow
// flips; the wind-up is the body's job. Punches are snaps (T <= 5, under the pose engine's MOVE_T): a fist travels in 3-4 frames like a real one, so a punch's
// own frames go over the 25 deg/f joint gate by design; everything around them stays on the eased engine.
import * as THREE from 'three';
import { POSES, POSE_VERBS, compilePose } from '../engine/poses.js';
import { ACT } from '../engine/verbs_fx.js';
import { STAND } from '../engine/verbs.js';
import { solid } from '../engine/cast.js';
import { toon } from '../engine/look.js';
import { HOOKS } from '../engine/play.js';

const sn = (t, w, a = 0) => Math.sin(t * w + a);
const BOUNCE = 2 * Math.PI * 2.2 / 30;            // 2.2 bounces a second
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smoother = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const stand = (pos, yaw) => ({ pos, yaw, bob: 0, lean: 0, pitch: 0, footL: STAND.footL, footR: STAND.footR });

// the guard: lead (L) hand at the cheekbone a little forward, rear (R) glove at the chin, elbows tucked, chin down,
// shoulders bladed, knees soft, lead foot forward; it breathes: a bounce, a small weave, the lead hand pawing
const GL = { t: [-0.18, 2.04, 0.40], elbow: [-0.7, -1, -0.4] }, GR = { t: [0.10, 1.96, 0.34], elbow: [0.7, -1, -0.4] };
const FEET = { L: [-0.20, 0.022, 0.26], R: [0.30, 0.022, -0.22] };
const guardBody = { pitch: 3, bob: -0.12, head_pitch: 8, shTwist: 16, hipTwist: 10, shrug: 0.05 };
const P = {
  guard: { handFade: 5, A: 2, T: 8, hold: 300, body: guardBody, feet: FEET, hands: { L: GL, R: GR },
    cycle: t => ({ bob: 0.035 * Math.abs(sn(t, BOUNCE / 2)) - 0.018, lean: 2.2 * sn(t, BOUNCE / 4), dx: 0.03 * sn(t, BOUNCE / 4, 0.6),
      head_tilt: 2.5 * sn(t, BOUNCE / 3), hands: { L: [0.015 * sn(t, BOUNCE / 2, 1), 0.02 * sn(t, BOUNCE / 2), 0.03 * sn(t, BOUNCE / 2, 2)], R: [0, 0.012 * sn(t, BOUNCE / 2, 1), 0] } }) },
  // jab: the lead hand straight out and back, the lead shoulder turns in, the rear glove stays home
  jab: { handFade: 3, A: 0, T: 3, hold: 2, R: 6, body: { ...guardBody, pitch: 4, shTwist: 18 }, feet: FEET,
    hands: { L: { t: [-0.06, 2.22, 0.84], elbow: [-0.7, -1, -0.4] }, R: GR } },
  // cross: the rear hand down the middle, hips and shoulders turned through, weight onto the lead leg
  cross: { handFade: 4, A: 0, T: 4, hold: 2, R: 7, body: { ...guardBody, pitch: 4, shTwist: -18, hipTwist: -12, lean: -3 }, feet: { L: FEET.L, R: [0.30, 0.10, -0.24] },
    hands: { R: { t: [0.04, 2.20, 0.86], elbow: [0.7, -1, -0.4] }, L: { t: [-0.20, 2.20, 0.30], elbow: [-0.7, -1, -0.4] } } },
  // hook: the lead arm bent at 90 deg, swung flat across, the whole trunk turning with it
  hook: { handFade: 4, A: 1, T: 5, hold: 2, R: 8, body: { ...guardBody, pitch: 4, shTwist: -20, hipTwist: -14, lean: 4 }, feet: FEET,
    hands: { L: { t: [0.18, 2.28, 0.62], elbow: [-0.7, -1, -0.4] }, R: GR } },
  // uppercut: dip, then drive up through the legs, the rear fist rising under the chin line
  uppercut: { handFade: 4, A: 0, T: 5, hold: 3, R: 8, body: { ...guardBody, pitch: 2, bob: 0.02, shTwist: -14, hipTwist: -10, head_pitch: -4 }, feet: FEET,
    hands: { R: { t: [0.10, 2.40, 0.52], elbow: [0.7, -1, -0.4] }, L: GL } },
  // slip: the head off the centre line to the outside, a bend at the waist, eyes on the opponent
  slip: { handFade: 5, A: 1, T: 4, hold: 4, R: 8, body: { ...guardBody, lean: 16, pitch: 3, bob: -0.18, dx: -0.10 }, feet: FEET, hands: { L: GL, R: GR } },
  // duck: knees bend deep under a hook, back stays straight-ish, gloves up
  duck: { handFade: 5, A: 1, T: 5, hold: 4, R: 9, body: { ...guardBody, pitch: 6, bob: -0.46, head_pitch: 2 }, feet: { L: [-0.26, 0.022, 0.28], R: [0.32, 0.022, -0.24] }, hands: { L: GL, R: GR } },
  // block: high shell, both gloves on the forehead, chin tucked, braced
  block: { handFade: 3, A: 1, T: 3, hold: 6, R: 8, body: { ...guardBody, pitch: 4, bob: -0.18, head_pitch: 14 }, feet: FEET,
    hands: { L: { t: [-0.14, 2.32, 0.46], elbow: [-0.7, -1, -0.4] }, R: { t: [0.12, 2.30, 0.46], elbow: [0.7, -1, -0.4] } } },
  // hit_head: the head snaps back and to the side, the body rocks after it, the gloves drift open
  hit_head: { handFade: 3, A: 0, T: 3, hold: 5, R: 12, body: { ...guardBody, pitch: 2, lean: -6, head_pitch: -30, head_tilt: 12, bob: -0.08 }, feet: FEET,
    hands: { L: { t: [-0.36, 2.00, 0.26], elbow: [-0.7, -1, -0.4] }, R: { t: [0.34, 1.96, 0.18], elbow: [0.7, -1, -0.4] } } },
  // hit_body: folds round a shot to the ribs, gloves drop to cover
  hit_body: { handFade: 3, A: 0, T: 3, hold: 6, R: 12, body: { ...guardBody, pitch: 7, bob: -0.28, head_pitch: 14, lean: 6 }, feet: FEET,
    hands: { L: { t: [-0.18, 1.70, 0.30], elbow: [-0.7, -1, -0.4] }, R: { t: [0.16, 1.66, 0.26], elbow: [0.7, -1, -0.4] } } },
};
for (const k of Object.keys(P)) P[k].noFollow = true;
Object.assign(POSES, P);
for (const n of Object.keys(P)) POSE_VERBS[n] = ACT[n] = (p, st, C) => compilePose(n, p, st, C);
// punches carry the body in: the fighter steps through the shot (`lunge` m along his facing, default per punch) and
// back out over the punch's release; a hit taken rocks him back the same way (negative)
const LUNGE = { jab: 0.15, cross: 0.18, hook: 0.10, uppercut: 0.10, hit_head: -0.16, hit_body: -0.10, slip: 0, duck: 0, block: -0.04 };
// Spacing: the heads are ~0.6 m wide and the arms reach ~0.5 m, so fighters work with their heads ~0.2 m apart (roots
// ~0.86 m), the torso nearly upright (a forward pitch pushes the big heads together) and only a short step into a punch.
// where each punch lands on the target (an env.at spec on the opponent's floor point: pure per frame): the glove's centre
// stops on the surface of the face / ribs facing the puncher (head radius 0.30 m + glove 0.06; the guard leans the head
// ~0.1 m forward). `fwd` is the target's own facing, so it points back at the puncher.
const AIM = {
  jab: { side: 'L', at: { up: 1.38, fwd: 0.40, side: 0.05 } }, cross: { side: 'R', at: { up: 1.36, fwd: 0.40, side: -0.04 } },
  hook: { side: 'L', at: { up: 1.40, fwd: 0.26, side: 0.27 } }, uppercut: { side: 'R', at: { up: 1.16, fwd: 0.34 } },
  body: { side: 'R', at: { up: 0.95, fwd: 0.30 } },
};
for (const [n, dist] of Object.entries(LUNGE)) {
  POSE_VERBS[n] = ACT[n] = (p, st, C) => {
    // the boxing poses are drawn with their own lead side; a punch thrown with the other hand mirrors the whole pose
    // (compilePose mirrors on hand 'L')
    const base = AIM[p.to === 'body' ? 'body' : n]?.side, flip = p.hand && base && p.hand !== base;
    const r = compilePose(n, { ...p, hand: flip ? 'L' : undefined }, st, C), sp = POSES[n], L = p.lunge ?? dist;
    const A = p.antic ?? sp.A ?? 1, T = sp.T ?? 4, H = p.hold ?? sp.hold ?? 2, t0 = p.at, inT = A + T, outT = inT + H, back = outT + 8;
    if (L) {
      const p0 = st.pos.slice(), y = st.yaw * Math.PI / 180, F = [Math.sin(y), -Math.cos(y)];
      const k = f => { const t = f - t0; return t < 0 ? 0 : t < inT ? smoother(t / inT) : t < outT ? 1 : 1 - smoother((t - outT) / (back - outT)); };
      r.owners.push({ chan: 'body', start: t0, fade: 0, verb: n, fn: f => { const e = k(f) * L; return stand([p0[0] + F[0] * e, p0[1] + F[1] * e, p0[2] || 0], st.yaw); } });
    }
    // aimed: `target` (an actor) puts the punching glove ON that actor, not at a spot in the air: the hand owner takes over
    // at the start of the strike (fast: no fade floor, no filter) and lands on the frame t0 + A + T; `to: 'body'` digs to the ribs
    const aim = p.target && AIM[p.to === 'body' ? 'body' : n];
    const mirror = aim && p.hand && p.hand !== aim.side;
    if (aim) {
      const side = p.hand || aim.side, sg = side === 'L' ? -1 : 1;
      r.owners.push({ chan: 'hand' + side, start: t0 + A, fade: T, fast: true, smooth: false, verb: n,
        fn: () => ({ at: { sole: p.target, ...aim.at, side: (mirror ? -1 : 1) * (aim.at.side || 0) }, elbow: [sg * 0.7, -1, -0.4] }) });
      // after the hit stop the glove comes home on its own (filtered, eased), even when no guard beat follows
      const home = side === 'L' ? [GL.t[0], GL.t[1] + guardBody.bob, GL.t[2]] : [GR.t[0], GR.t[1] + guardBody.bob, GR.t[2]];
      r.owners.push({ chan: 'hand' + side, start: t0 + inT + H, fade: 6, smooth: true, verb: n, fn: () => ({ l: home, elbow: [sg * 0.7, -1, -0.4] }) });
      r.contact = t0 + inT;
    }
    return r;
  };
}

// shuffle: footwork. The root slides `by` [dx, dy] (or `to`) over `dur` frames with a push-off dip and a light hop,
// the arms and the current pose untouched (a body-channel owner only)
POSE_VERBS.shuffle = ACT.shuffle = (p, st, C) => {
  const t0 = p.at, D = p.dur ?? 8, p0 = st.pos.slice(), y = st.yaw;
  const p1 = p.to ? (C.mark || C.point)(p.to).slice() : [p0[0] + (p.by?.[0] || 0), p0[1] + (p.by?.[1] || 0), p0[2] || 0];
  if (p1[2] == null) p1[2] = p0[2] || 0;
  st.pos = p1.slice();
  return { end: t0 + D + 2, owners: [
    { chan: 'body', start: t0, fade: 0, verb: 'shuffle', fn: f => { const u = smoother((f - t0) / D); return stand(p0.map((v, i) => v + (p1[i] - v) * u), y); } },
    { chan: 'add', start: t0, verb: 'shuffle', fn: f => { const u = (f - t0) / D; return u < 0 || u > 1 ? {} : { bob: 0.05 * Math.sin(Math.PI * u) - 0.03 * Math.sin(2 * Math.PI * u) }; } }] };
};

// gloves: a costume layer, one padded glove on each hand dot (scaled back from the dot's own size)
const glove = rgb => {
  const g = new THREE.Group(), m = toon(rgb, { sheen: 0.2, rough: 0.7, char: 1 });
  const fist = solid(new THREE.SphereGeometry(0.105, 24, 18), m); fist.scale.set(1, 1.05, 1.22); g.add(fist);
  const thumb = solid(new THREE.SphereGeometry(0.045, 16, 12), m); thumb.position.set(0, 0.07, 0.04); g.add(thumb);
  const cuff = solid(new THREE.CylinderGeometry(0.07, 0.075, 0.07, 20), toon([0.96, 0.95, 0.92], { sheen: 0, rough: 1, char: 1 })); cuff.position.set(0, -0.1, -0.02); g.add(cuff);
  return g;
};
const hexRGB = h => { const n = parseInt(h, 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const prevCostume = HOOKS.costume;
HOOKS.costume = (S, list, ctx) => {
  const rest = [];
  for (const item of list) {
    const [k, a] = String(item).split(':');
    if (k !== 'gloves') { rest.push(item); continue; }
    for (const side of ['L', 'R']) { const dot = S.parts.hands[side], g = glove(a ? hexRGB(a) : [0.82, 0.10, 0.10]); const s = dot.scale.x || 1; g.scale.setScalar(1 / s); dot.add(g); }
  }
  if (rest.length) { if (!prevCostume) throw new Error("costume: import '/styles/stick-man/allout/costume.js' before boxing.js"); prevCostume(S, rest, ctx); }
};
