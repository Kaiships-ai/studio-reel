// Adult_Trans_JumpWindow_Once: a bag in the right fist, a sprint from standing and a flying leap out through a window
// (sill 0.80 m, top 2.0 m in the capture's metres; 0.74 m and 1.84 m on this body), a landing at a run and a stop, from three Mixamo captures joined
// (ref/mocap.js mocapJoin, each carrying on where the one before leaves the body): "Idle To Sprint", "Jumping" (genre
// Superhero), "Run To Stop". Hot Money ep01 (SH155: out of room 9's back window with the money).
// The window stands where the leap's whole body crosses highest: at 4.1 m every captured joint goes over 1.02 m and under
// 1.83 m (the right hand, with the bag, over at 1.65 m: the bag hangs clear of the sill; the left one would drag it
// through). On this body (its big head, its legs) the right foot trails over at 0.75 m and the head's top at 1.79 m:
// the sill and top are set to clear them
import { mocapClip, carry, reachKeys, CARRY_KG, DOSE_E } from '../../base.js';
import { mocapJoin } from '../../ref/mocap.js';
import SPRINT from '../../ref/mixamo/idle_to_sprint.js';
import LEAP from '../../ref/mixamo/jumping_superhero.js';
import STOP from '../../ref/mixamo/run_to_stop.js';
import SILL from '../../ref/reach/jumpwindow_sill.js';

const SRC = mocapJoin([{ src: SPRINT }, { bridge: 2 }, { src: LEAP, follow: true }, { bridge: 3 }, { src: STOP, follow: true }], {
  source: 'Mixamo "Idle To Sprint" + "Jumping" + "Run To Stop", joined (mocapJoin)',
  marks: [{ kind: 'window', at: [4.1, 0, 0.80], top: 2.0, depth: 0.15, width: 1.5 }] });
const M = mocapClip({ body: 'adult', src: SRC, base: 'STAND', end: 'STAND' });
// the bag (~10 kg) in the right fist all through. A sprinter's pumping arm would swing it into the legs: on the ground
// the bag arm is mostly CARRY's held 8 deg wider (straight, out from the leg), the capture's swing a fifth of it; eased
// from STAND's arm at the start and back to it at the end. L0..L1: the leap's frames in this clip (ease, sprint, bridge)
const BAG = { x_hpR_bag: 1, x_kgR: Math.round(CARRY_KG * 0.4) }, CA = { ...carry('adult').armR, raise: carry('adult').armR.raise + 8 }, ease = w => (w = Math.max(0, Math.min(1, w)), w * w * (3 - 2 * w));
const L0 = 14 + SPRINT.frames.length + 2, L1 = L0 + LEAP.frames.length, T = M.frames;
// in the leap the legs tuck and the right one kicks out under the bag: the bag arm goes out wide to the side (OUT),
// the bag clear of the knee, then back to CARRY's for the landing
const OUT = { raise: 60, swing: 20, elbow: 10, roll: 0 }, inLeap = f => Math.min(ease((f - L0) / 6), ease((L1 - f) / 6));
const armed = (out = OUT) => k => { const g = 0.8 * Math.min(ease(k.f / 14), ease((T - k.f) / 14)), l = inLeap(k.f), a = k.armR, w = g * (1 - l) + 0.7 * l;
  const tgt = n => CA[n] + (out[n] - CA[n]) * l;
  return { ...k, ...BAG, armR: { ...a, raise: a.raise + (tgt('raise') - a.raise) * w, swing: a.swing + (tgt('swing') - a.swing) * w, elbow: a.elbow + (tgt('elbow') - a.elbow) * w, roll: a.roll * (1 - w) } }; };
// the left hand, flung low as the body goes over, comes down on the sill and pushes off it (the set's physics, baked:
// ref/reach/jumpwindow_sill.js, tools/run/mocap_contact.mjs; re-run it when the clip or the window changes)
// Fitted to the set's window (the clip key's `fit: { sill, top, width }`, metres on this body; index.js placeClip): the
// flight (the frames both feet are off the floor, FLY) rises by the sill's height over the capture's (the hips, the feet
// in the air, the left hand's rest on the sill), so the trailing foot clears a higher sill by as much; the window mark
// takes the set's numbers, and tools/gates/motionlib.mjs checks the body against its walls (a top too low for the head, a
// width too narrow for the legs fail there, by name)
// the left leg's tuck at take-off (the capture: knee 3 deg straight, then 65 a frame later, foot up 23 cm): its foot's
// path between TUCK[0] and TUCK[1] re-timed as one eased move, so the knee folds over the span (a hit-in, not a pop)
const TUCK = [47, 58];
const tuck = keys => { const a = keys.find(k => k.f === TUCK[0]), b = keys.find(k => k.f === TUCK[1]);
  return keys.map(k => { if (k.f <= TUCK[0] || k.f >= TUCK[1]) return k; const w = ease((k.f - TUCK[0]) / (TUCK[1] - TUCK[0]));
    return { ...k, legL: { ...k.legL, footW: a.legL.footW.map((v, i) => v + (b.legL.footW[i] - v) * w), pitch: a.legL.pitch + (b.legL.pitch - a.legL.pitch) * w } }; }); };
const W0 = M.marks.find(m => m.kind === 'window'), FLY = [49, 69], RAMP = 4;
function make({ sill = W0.at[2], top = W0.top, width = W0.width } = {}) {
  const dz = sill - W0.at[2], up = f => (f <= FLY[0] || f >= FLY[1] ? 0 : Math.min(ease((f - FLY[0]) / RAMP), ease((FLY[1] - f) / RAMP)));
  // (bob is in W before the dose: the hips rise dz metres; a foot off the floor rises with them)
  // and a foot in the air kept inside the opening's width (the leap kicks the right one out sideways), less a foot's
  // half-width: the leg drawn in toward its hip (the foot's sideways and forward offset from the hip scaled down, its
  // height kept), as far as its widest reach needs, eased over the frames that foot is off the floor. The leg keeps the
  // capture's heading round the hip and folds instead of straightening out sideways. (A clamp pinned the foot on the
  // edge while the capture's swept on: the hip-ankle line swung 49 deg in a frame, the knee 60, frame 60 at width 1.0.)
  // The capture's own when the window is as wide as its
  const cy = W0.at[1], hw = width / 2 - 0.10, sgn = { legL: -1, legR: 1 };
  // (the hip over the floor: the root, out to that side, shifted with the hips: hip.x is W, dosed)
  const hipAt = (q, sd) => [q.pos[0], q.pos[1] + sgn[sd] * 0.084 + (q.hip?.x || 0) * 0.6 * DOSE_E];
  const span = sd => { const mid = Math.round((FLY[0] + FLY[1]) / 2), z = f => M.keys.find(q => q.f === f)?.[sd].footW[2] ?? 0; let a = mid, b = mid;
    while (z(a - 1) > 0.005) a--; while (z(b + 1) > 0.005) b++; return [a - 1, b + 1]; };
  const air = Object.fromEntries(['legL', 'legR'].map(sd => [sd, span(sd)]));
  const inAir = (sd, f) => { const [a, b] = air[sd]; return f <= a || f >= b ? 0 : Math.min(ease((f - a) / RAMP), ease((b - f) / RAMP)); };
  const draw = Object.fromEntries(['legL', 'legR'].map(sd => { let k = 1;
    if (width < W0.width) for (const q of M.keys) if (inAir(sd, q.f) > 0) { const h = hipAt(q, sd), dy = q[sd].footW[1] - h[1], lim = (dy > 0 ? cy + hw : cy - hw) - h[1];
      if (Math.abs(q[sd].footW[1] - cy) > hw && Math.sign(lim) === Math.sign(dy)) k = Math.min(k, lim / dy); }
    return [sd, Math.max(0, k)]; }));
  const lift = q => { const u = up(q.f), o = { ...q, bob: q.bob + u * dz / (0.6 * DOSE_E) };
    for (const sd of ['legL', 'legR']) { const [x, y, z] = q[sd].footW, w = inAir(sd, q.f), s = 1 - w * (1 - draw[sd]), h = hipAt(q, sd);
      if (w || (u && z > 0.005)) o[sd] = { ...q[sd], footW: [h[0] + (x - h[0]) * s, h[1] + (y - h[1]) * s, z + (z > 0.005 ? u * dz : 0)] }; }
    return o; };
  // a narrower window: the bag goes through ahead of the body, the arm thrust forward (FWD) instead of out to the side,
  // by as much as the window is narrower (all of it 0.4 m narrower). Out wide, the 0.46 m bag met the side wall of a 1.0 m
  // opening (the set's walls stop a held prop: engine/body.js worldBox boxPush; the hand then 7 cm off it), and held
  // lower the drawn-in right leg met the bag
  const FWD = { raise: 20, swing: 95, elbow: 10, roll: 0 }, t = Math.max(0, Math.min(1, (W0.width - width) / 0.4));
  const out = Object.fromEntries(Object.keys(OUT).map(n => [n, OUT[n] + (FWD[n] - OUT[n]) * t]));
  // (the hand on the sill rises with it; on its way there and back with the body, as far as the flight has risen)
  const rest = { ...SILL, rows: SILL.rows.map(r => [r[0], r[1], r[2] + up(r[0]) * dz / 0.6, ...r.slice(3)]) };
  return { name: 'Adult_Trans_JumpWindow_Once', clip: 'Trans_JumpWindow_Once', body: 'adult', group: 'Trans', loop: false, frames: M.frames, base: 'STAND', end: 'STAND', style: 'kaiships',
    fit: make, fitted: { sill, top, width }, fitChecks: [{ sill: 0.8, top: 1.9, width: 1.0 }],
    needs: { props: ['bag'], hands: 'R', marks: M.marks.map(m => (m === W0 ? { ...m, at: [m.at[0], m.at[1], sill], top, width } : m)) },
    keys: reachKeys(tuck(M.keys).map(armed(out)).map(lift), rest), captured: M.captured, rest: M.rest };
}
export default make();
