// Props as scene objects (motion v2): a prop a library clip holds (x_hp<L|R|B>_<kind>) is one object for the whole span
// of the clip key(s) that hold it, parented to the hand by a keyed weight w (the x_hp value, 0..1), the way Unity's
// multi-parent constraint, Blender's Child Of with keyed influence or Maya's space switch do it:
//   w = 1   the prop is in the hand (cast.js handProps, as before)
//   w = 0   before a grab it rests where the hand will take it (the hand's transform at the grab, set down on what is
//           under it); after a release it starts where the hand let it go, with the hand's speed (and the clip's `toss`),
//           and falls on gravity (9.8 m/s2, 30 fps) until it lands on the floor or on the top of a set piece (S.obstacles)
//   0 < w < 1   the two transforms blended (position lerp, quaternion slerp): the grab and the release ramps
// Stateless per frame: the grab and release transforms are the rig's own at those frames, evaluated once per track and
// cached, so a frame seeked out of order renders the same. One place for the proof page (play.js), the headless check
// (tools/motionlib.mjs rigClip) and films: a track whose clips hold no props has no spans and renders as before.
//   track.props   [{ id, key, f0, f1, toss }] from motion-lib/index.js placeClip (one per prop a clip key holds)
//   Qat(f)        the figure's pose at track frame f (cast.js S.pose2 input)
//   plan.at(f)    { [id]: { p, q, v } } (three.js world: rest position, quaternion, its speed m/s) for cast.js (Q.propRest)
import * as THREE from 'three';

const G = 9.8, FPS = 30, SUB = 4, ON = 0.999;
const B2T = b => new THREE.Vector3(b[0], b[2], -b[1]);                     // Blender metres (z up) -> three.js world (y up)

// the highest surface under a point (three.js world) at most `tol` above `y`: the floor (0) or a set piece's top
function support(S, p, y, tol = 0.02) {
  let top = 0;
  for (const o of S.obstacles || []) {
    const bx = p.x, by = -p.z;
    if (bx > o.lo[0] && bx < o.hi[0] && by > o.lo[1] && by < o.hi[1] && o.hi[2] <= y + tol && o.hi[2] > top) top = o.hi[2];
  }
  return top;
}
// a point (three.js world) inside a set piece's footprint below its top: the side of a box a falling prop runs into
const blocked = (S, p, bottom) => (S.obstacles || []).some(o => -p.z > o.lo[1] && -p.z < o.hi[1] && p.x > o.lo[0] && p.x < o.hi[0] && bottom < o.hi[2] - 0.005 && bottom > o.lo[2] - 0.5);

// the prop's world transform with the hand holding it at frame f, and how far its lowest point is under its origin
function heldAt(S, Qat, id, f) {
  S.pose2(Qat(f));
  const o = S.props[id]; if (!o) return null;
  o.updateMatrixWorld(true);
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); o.matrixWorld.decompose(p, q, s);
  let low = 0; const bx = o.userData.box;
  if (bx && !bx.isEmpty()) { low = Infinity; const c = new THREE.Vector3();
    for (let i = 0; i < 8; i++) { c.set(i & 1 ? bx.max.x : bx.min.x, i & 2 ? bx.max.y : bx.min.y, i & 4 ? bx.max.z : bx.min.z).applyMatrix4(o.matrixWorld); low = Math.min(low, c.y - p.y); } }
  return { p, q, low, floor: !!o.userData.floor };
}

export function propPlan(track, Qat, S) {
  const spans = track?.props || [];
  if (!spans.length) return { at: () => undefined, spans };
  const cache = new Map();
  // one span's frames, once: the held runs (w = 1), the rest transform for every frame of the span that is not held
  const build = sp => {
    if (cache.has(sp)) return cache.get(sp);
    const w = f => Math.max(0, Math.min(1, Qat(f)[sp.key] ?? 0)), runs = [];
    for (let f = sp.f0, a = null; f <= sp.f1 + 1; f++) { const on = f <= sp.f1 && w(f) >= ON; if (on && a == null) a = f; if (!on && a != null) { runs.push([a, f - 1]); a = null; } }
    const R = { runs, falls: [], w };
    cache.set(sp, R);
    if (!runs.length) return R;
    const toss = sp.toss ? B2T(sp.toss) : new THREE.Vector3();
    // before the first grab: resting where the hand takes it, on what is under it
    const g = heldAt(S, Qat, sp.id, runs[0][0]);
    if (g) { const p = g.p.clone(); if (!g.floor) p.y = support(S, p, p.y + g.low) - g.low; R.first = { p, q: g.q, v: 0 }; }
    // after each release: falls from the hand with the hand's speed (and the clip's toss) until it lands
    for (const [a, b] of runs) {
      if (b >= sp.f1) continue;
      const r = heldAt(S, Qat, sp.id, b), r0 = heldAt(S, Qat, sp.id, Math.max(a, b - 1)); if (!r) continue;
      const end = runs.find(([a2]) => a2 > b)?.[0] ?? sp.f1;
      const p = r.p.clone(), v = r.p.clone().sub(r0.p).multiplyScalar(FPS).add(toss), dt = 1 / FPS / SUB;
      let still = r.floor; const path = [];
      if (r.floor) v.set(0, 0, 0);
      R.falls.push({ b, end, path });
      for (let f = b; f <= end; f++) {
        path.push({ p: p.clone(), q: r.q, v: still ? 0 : v.length() });
        if (still) continue;
        for (let i = 0; i < SUB && !still; i++) {
          v.y -= G * dt; const n = p.clone().addScaledVector(v, dt);
          if (blocked(S, n, n.y + r.low) && !blocked(S, p, p.y + r.low)) { v.x = 0; v.z = 0; n.x = p.x; n.z = p.z; }
          const top = support(S, n, p.y + r.low);
          if (n.y + r.low <= top && v.y <= 0) { n.y = top - r.low; v.set(0, 0, 0); still = true; }
          p.copy(n);
        }
      }
    }
    return R;
  };
  // a span that opens with the prop out of the hand has it there from the track's start (or the same prop's span before
  // it), one that ends with the prop let go keeps it where it lies to the track's end (or the same prop's next span):
  // an object in the scene does not vanish when the clip that used it is over
  const ext = spans.map(sp => { const same = spans.filter(o => o.id === sp.id); return { from: Math.max(...same.filter(o => o.f1 < sp.f0).map(o => o.f1 + 1)), to: Math.min(...same.filter(o => o.f0 > sp.f1).map(o => o.f0 - 1)) }; });
  return {
    spans,
    at(f) {
      const out = {};
      spans.forEach((sp, i) => {
        if (f < ext[i].from || f > ext[i].to) return;
        const R = build(sp), fc = Math.max(sp.f0, Math.min(sp.f1, f));
        if (!R.runs.length || R.w(fc) >= ON) return;                             // in the hand (or held past the span): cast.js places it
        const fl = R.falls.filter(x => x.b < fc).pop();                           // the latest release before this frame, else the first grab's rest
        const at = fl ? fl.path[Math.min(fc, fl.end) - fl.b] : R.first;
        if (at) out[sp.id] = { p: at.p.toArray(), q: at.q.toArray(), v: at.v };
      });
      return out;
    },
  };
}
