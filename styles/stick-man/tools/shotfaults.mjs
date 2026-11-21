// A row, rows in film order: __dbg (engine/play.js) plus the film frame F (default f). A row with `edit: true` starts a shot the cut list
// names (a film assembled shot by shot); otherwise a cut is an act change, a dissolve, or a camera jump.
// Fault: { F, kind, who, what, px, frames, seen, sev, vis: 'in' | 'occluded' | 'off', watch?, pts? }. Every size is what the viewer
// sees: px on a phone frame REF_H tall, after the motion the neighbouring frames predict is taken out; frames is how long it stays
// on screen. sev = px x frames (up to MAX_FRAMES) x the share in view ranks them.
// pts are Blender-world points for shotgate.mjs to ask the film camera about.
import { scaleFault } from '../lib/props/sizes.js';
import { jointSteps, JOINT_STEP_MAX, stepPoints } from './jointstep.mjs';
import { GRIP_CM, PROP_CM, CORD_SHAKE_MAX, shakeOf } from './faults.mjs';

export const FPS = 30;
export const REF_H = 720;               // px are counted on a frame this tall (a phone at review size)
export const HOLD_FRAMES = 3;           // a fault on screen this many frames is seen at 1x; a shorter one is watched
export const CONTACT_PX = 6;            // a contact this far into or off what it touches, in view, blocks
export const CHANGE_PX = 75;            // a change that stays blocks from this size in view
export const MAX_FRAMES = 5;            // sev counts a fault that lasts longer as this many frames
export const CAM_JUMP_M = 0.3;          // camera position + aim moved this far in one frame, and 3x its last step: a cut
export const LENS_JUMP = 0.15;          // or the lens changed by this share in one frame
export const STILL_CAM_M = 0.05;        // camera position + aim moved less than this in a frame: a still camera
export const STILL_PROP_M = 0.01;       // a prop that moved less than this in the frame before a cut was left there
export const EDGE = 0.03;               // a box within this share of the frame edge is entering or leaving through it
export const SEEN_AREA = 0.002;         // a prop covers this share of the frame to be seen
export const SIZE_STEP = 0.15;          // a prop's size changes by this share in one frame, or a carried prop across a cut
export const G_FRAME = 9.81 / FPS ** 2; // gravity in m / frame^2
export const FLOAT_ERR = 0.6;           // a free prop's vertical acceleration off -g by more than this share of g
export const FLOAT_RUN = 3;             // ... for this many frames in a row while it moves up or down
export const FLOAT_AFTER = 15;          // ... within this many frames of a hand letting go of it
export const PLANTED_Z = 0.03;          // an ankle (cast.js rigWorld; 1.6 cm up at rest) this close to the floor in two frames is planted
export const SKATE_SPEED = 0.02;        // m / frame (0.6 m/s): the body travels
export const SKATE_SHARE = 0.5;         // ... and even the stiller foot moves at more than this share of the body's speed
export const SKATE_RUN = 8;             // ... for this many frames
export const SKATE_FLOOR = 0.1;         // ... with that foot near the floor (a body carried in a car moves its feet along)
export const TORSO_R = 0.11;            // m: a stick figure's torso as a rod this thick hides what is behind it (engine/play.js torso box 0.15 x 0.11)
export const CROSS_MAX_M = 0.5;         // a point that moved further in a frame jumped (figure / prop jumps), it did not pass through
export const INSIDE_MAX = 30;           // frames a point through a surface is followed

export const ACROSS_CUT_M = 0.15;      // a held prop off where its holder's carry takes it across a cut by more than this jumps at the cut
export const HOLDER_M = 0.35;           // a prop this close to a hand of a figure in frame is in that hand
export const LOST_MAX = 45;             // frames a held prop may be out of the frame and still count as one that comes back
export const CONTACT = new Set(['prop passes through', 'body passes through', 'body in the set', 'hand off its grip', 'prop in the body', 'foot slides', 'figure skates', 'prop floats',
  'prop in the head', 'prop in the set', 'prop leaves view', 'prop out of scale']);

const F_ = r => r.F ?? r.f;
const add = (a, b) => a.map((x, i) => x + b[i]), sub = (a, b) => a.map((x, i) => x - b[i]), mid = (a, b) => a.map((x, i) => (x + b[i]) / 2);
const len = v => Math.hypot(...v), dist = (a, b) => len(sub(a, b));
const camStep = (a, b) => dist(a.camera.pos, b.camera.pos) + dist(a.camera.target, b.camera.target);
const fmt = x => (Math.abs(x) >= 10 ? x.toFixed(0) : x.toFixed(2));

// cut[i]: frame i does not continue frame i - 1 on screen
export function cuts(rows) {
  return rows.map((r, i) => {
    if (!i) return true;
    if (r.edit != null) return !!r.edit;
    const p = rows[i - 1];
    if (r.act !== p.act || r.mix != null || p.mix != null || F_(r) !== F_(p) + 1) return true;
    const d = camStep(p, r), d0 = i > 1 ? camStep(rows[i - 2], p) : 0;
    if (d > CAM_JUMP_M && d > 3 * d0) return true;
    return Math.abs(r.camera.lens - p.camera.lens) > LENS_JUMP * p.camera.lens;
  });
}

// where a Blender-world point lands in a row's frame, NDC -1..1 (null: behind the lens); three's fov is vertical
export function project(cam, P, W, H) {
  const f = sub(cam.target, cam.pos), lf = len(f), fw = f.map(x => x / lf);
  const rt0 = [fw[1], -fw[0], 0], lr = len(rt0) || 1, rt = rt0.map(x => x / lr);
  const up = [rt[1] * fw[2] - rt[2] * fw[1], rt[2] * fw[0] - rt[0] * fw[2], rt[0] * fw[1] - rt[1] * fw[0]];
  const d = sub(P, cam.pos), z = d.reduce((s, x, i) => s + x * fw[i], 0); if (z <= 0.05) return null;
  const t = Math.tan(cam.fov * Math.PI / 360);
  return [d.reduce((s, x, i) => s + x * rt[i], 0) / (z * t * W / H), d.reduce((s, x, i) => s + x * up[i], 0) / (z * t)];
}

// the screen length (px at REF_H) of world vector D laid at P, seen by cam
function screenPx(cam, P, D, W, H) {
  const a = project(cam, P, W, H), b = project(cam, add(P, D), W, H);
  return a && b ? Math.hypot((b[0] - a[0]) * W / H, b[1] - a[1]) * REF_H / 2 : 0;
}
// the screen length of m metres across the view at P
function metresPx(cam, P, m) {
  const fw = sub(cam.target, cam.pos), z = sub(P, cam.pos).reduce((s, x, i) => s + x * fw[i], 0) / len(fw);
  return z > 0.05 ? m / (2 * z * Math.tan(cam.fov * Math.PI / 360)) * REF_H : 0;
}
// a segment from A to B passes within r of the segment C-D (sampled; the figure's own head and torso)
const near = (A, B, C, D, r) => { for (let t = 0; t <= 1; t += 0.05) { const P = add(A, sub(B, A).map(x => x * t));
  const cd = sub(D, C), u = Math.max(0, Math.min(1, sub(P, C).reduce((s, x, k) => s + x * cd[k], 0) / (cd.reduce((s, x) => s + x * x, 0) || 1)));
  if (dist(P, add(C, cd.map(x => x * u))) < r) return true; } return false; };
// the share of pts inside the frame and, for a figure a, not behind its own head or torso (the engine's visibility test never
// lets a body hide its own fault: a stick figure seen from behind hides its arms all the same)
function seenShare(cam, pts, W, H, a) {
  if (!pts.length) return 0;
  const sk = a?.limbs?.skel, hp = a?.head && a.headW ? metresPx(cam, a.headW, 1) * H / REF_H : 0, rh = hp ? 0.45 * (a.head[3] - a.head[1]) / hp : 0;
  const behind = P => { if (!sk) return false; const toP = dist(cam.pos, P), cut = add(cam.pos, sub(P, cam.pos).map(x => x * Math.max(0, 1 - TORSO_R / toP)));
    return (rh && dist(P, a.headW) > rh && near(cam.pos, cut, a.headW, a.headW, rh)) || (dist(P, sk.pelvis) > TORSO_R && dist(P, sk.neck) > TORSO_R && near(cam.pos, cut, sk.pelvis, sk.neck, TORSO_R)); };
  return pts.filter(P => { const q = project(cam, P, W, H); return q && Math.abs(q[0]) <= 1 && Math.abs(q[1]) <= 1 && !behind(P); }).length / pts.length;
}

// per frame i, how far the step into frame i lies outside the steps on either side of it in the same shot (world vector, null:
// unknown): a speed-up, a landing or a turn changes the step between its neighbours' and is no jump; a jump out and back, or a
// jump to a new spot on the same path, is one; a move that starts at a cut is judged by the steps after it, never against zero
function excess(seq, cut) {
  const step = i => (i > 0 && i < seq.length && !cut[i] && seq[i] && seq[i - 1] ? sub(seq[i], seq[i - 1]) : null);
  return seq.map((_, i) => {
    const v = step(i), a = step(i - 1), b = step(i + 1); if (!v || !(a || b)) return null;
    if (!a || !b) return sub(v, a || b);
    const ab = sub(b, a), t = Math.max(0, Math.min(1, sub(v, a).reduce((s, x, k) => s + x * ab[k], 0) / (ab.reduce((s, x) => s + x * x, 0) || 1)));
    return sub(v, add(a, ab.map(x => x * t)));
  });
}
function holds(cut, n, i, dir, ok) {
  let k = 0;
  for (let j = i; j >= 0 && j < n && k < MAX_FRAMES && ok(j); j += dir) { k++; if (dir < 0 ? cut[j] : cut[j + 1]) break; }
  return k;
}
function jumps(seq, cut, rows, W, H) {
  const e = excess(seq, cut), shot = []; cut.forEach((c, i) => { shot[i] = (shot[i - 1] ?? 0) + (c ? 1 : 0); });
  const onScreen = (v, i) => (v ? screenPx(rows[i].camera, seq[i - 1], v, W, H) : null);
  const raw = e.map(onScreen), bg = raw.map((_, i) => Math.max(0, ...[i - 3, i - 2, i + 2, i + 3].map(j => (shot[j] === shot[i] ? raw[j] ?? 0 : 0))));
  const out = raw.map((x, i) => (x == null ? 0 : Math.max(0, x - bg[i])));
  return out.map((x, i) => {
    if (!(x > 0 && x > (out[i - 1] ?? 0) && x >= (out[i + 1] ?? 0))) return null;
    const left = [1, 2].every(k => shot[i + k] === shot[i]) ? [-1, 1, 2].reduce((s, k) => add(s, e[i + k] || [0, 0, 0]), e[i]) : null;
    const stay = left ? Math.max(0, onScreen(left, i) - bg[i]) : 0, n = holds(cut, seq.length, i, 1, j => seq[j] != null);
    return stay >= x / 2 && n >= HOLD_FRAMES ? { px: stay, frames: n } : { px: x, frames: 1 };
  });
}
const jumpWhat = j => (j.frames > 1 ? `jumps ${fmt(j.px)} px to a new place and stays ${j.frames} f` : `jumps ${fmt(j.px)} px off its path and back`);

const fault = o => ({ frames: 1, seen: 1, vis: 'in', ...o });

const offFrame = (box, W, H) => box[2] <= 0 || box[0] >= W || box[3] <= 0 || box[1] >= H;
const inside = (box, W, H) => box && box[0] > EDGE * W && box[2] < (1 - EDGE) * W && box[1] > EDGE * H && box[3] < (1 - EDGE) * H;
const boxPx = (box, W, H) => box ? Math.max(Math.min(box[2], W) - Math.max(box[0], 0), Math.min(box[3], H) - Math.max(box[1], 0), 0) * REF_H / H : 0;
const big = (box, W, H) => box && (Math.min(box[2], W) - Math.max(box[0], 0)) * (Math.min(box[3], H) - Math.max(box[1], 0)) >= SEEN_AREA * W * H;
const propState = p => (!p || !p.shown ? 'none' : p.on || 'off');
const actorState = a => (a && a.inFrame ? 'in' : 'none');
const reshapes = (a, b) => a?.dims && b?.dims && a.dims.some((x, k) => Math.abs(b.dims[k] - x) > SIZE_STEP * Math.max(x, b.dims[k], 1e-3));

function cameraJumps(rows, cut, W, H, out) {
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i], p = rows[i - 1]; if (r.edit == null || cut[i] || cut[i - 1]) continue;
    const cs = camStep(p, r), cs0 = camStep(rows[i - 2], p);
    if (cs > CAM_JUMP_M && cs > 3 * cs0) {
      const q = project(r.camera, p.camera.target, W, H);
      out.push(fault({ F: F_(r), kind: 'camera jumps', who: 'camera', what: `the camera jumps ${fmt(cs)} m inside the shot (last step ${fmt(cs0)} m)`,
        px: q ? Math.hypot(q[0] * W / H, q[1]) * REF_H / 2 : REF_H, frames: holds(cut, rows.length, i, 1, () => true) }));
    }
  }
}

function inOut(S, cut, i, now, was) {
  return Math.min(holds(cut, S.length, i, 1, j => now(S[j])), holds(cut, S.length, i - 1, -1, j => was(S[j])));
}

function props(rows, cut, W, H, out) {
  const ids = [...new Set(rows.flatMap(r => Object.keys(r.track || {})))];
  for (const id of ids) {
    const T = rows.map(r => r.track?.[id]), pos = T.map(t => (t?.shown ? t.c : null)), jump = jumps(pos, cut, rows, W, H), st = T.map(propState);
    for (let i = 1; i < rows.length; i++) {
      if (cut[i]) continue;
      const r = rows[i], a = T[i - 1], b = T[i], sa = st[i - 1], sb = st[i], F = F_(r);
      const stillCamera = camStep(rows[i - 1], r) < STILL_CAM_M;
      if (sb === 'in' && big(b.box, W, H) && (sa === 'none' || sa === 'off' && stillCamera && inside(b.box, W, H))) {
        const frames = inOut(st, cut, i, s => s !== 'none', s => s === sa);
        out.push(fault({ F, kind: 'prop appears', who: id, what: `${id} appears in one frame (${sa === 'none' ? 'from nothing' : 'inside the frame'}) for ${frames} f`, px: boxPx(b.box, W, H), frames }));
      }
      if (sa === 'in' && big(a.box, W, H) && (sb === 'none' || sb === 'off' && stillCamera && inside(a.box, W, H))) {
        const frames = inOut(st, cut, i, s => s === sb, s => s !== 'none');
        out.push(fault({ F, kind: 'prop vanishes', who: id, what: `${id} vanishes in one frame for ${frames} f`, px: boxPx(a.box, W, H), frames }));
      }
      if (sa === 'none' || sb === 'none') continue;
      const seen = sb === 'in' || sa === 'in' ? 1 : 0, vis = seen ? 'in' : sb;
      if (a.size > 0 && Math.abs(b.size / a.size - 1) > SIZE_STEP) {
        const near = (t, size) => t?.shown && Math.abs(t.size / size - 1) <= SIZE_STEP;
        const frames = Math.min(holds(cut, rows.length, i, 1, j => near(T[j], b.size)), holds(cut, rows.length, i - 1, -1, j => near(T[j], a.size)));
        out.push(fault({ F, kind: 'prop resizes', who: id, what: `${id} size ${fmt(a.size)} -> ${fmt(b.size)} m for ${frames} f`, px: metresPx(r.camera, b.c, Math.abs(b.size - a.size)), frames, seen, vis }));
      }
      if (jump[i] && !reshapes(a, b) && !reshapes(b, T[i + 1]))
        out.push(fault({ F, kind: 'prop jumps', who: id, what: `${id} ${jumpWhat(jump[i])}`, ...jump[i], seen, vis }));
    }
  }
}

function figures(rows, cut, W, H, out) {
  for (const n of Object.keys(rows[0].actors)) {
    const heads = rows.map(r => (r.actors[n]?.inFrame ? r.actors[n].headW || null : null)), jump = jumps(heads, cut, rows, W, H);
    const st = rows.map(r => actorState(r.actors[n]));
    for (let i = 1; i < rows.length; i++) {
      if (cut[i]) continue;
      const r = rows[i], a = rows[i - 1].actors[n], b = r.actors[n], sa = st[i - 1], sb = st[i], F = F_(r);
      if (sb === 'in' && sa === 'none' && inside(b.head, W, H) && !(a?.head && offFrame(a.head, W, H)))
        out.push(fault({ F, kind: 'figure appears', who: n, what: `${n} appears inside the frame in one frame`, px: (b.figH || 0) * REF_H, frames: inOut(st, cut, i, s => s === 'in', s => s === 'none') }));
      if (sa === 'in' && sb === 'none' && inside(a.head, W, H) && !(b?.head && offFrame(b.head, W, H)))
        out.push(fault({ F, kind: 'figure vanishes', who: n, what: `${n} vanishes inside the frame in one frame`, px: (a.figH || 0) * REF_H, frames: inOut(st, cut, i, s => s === 'none', s => s === 'in') }));
      if (jump[i]) out.push(fault({ F, kind: 'figure jumps', who: n, what: `${n} ${jumpWhat(jump[i])}`, ...jump[i], seen: seenShare(r.camera, [heads[i]], W, H), pts: [heads[i]] }));
    }
  }
}

function goneAfterCut(rows, cut, W, H, out) {
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i], p = rows[i - 1];
    if (!cut[i] || cut[i - 1] || r.act !== p.act || r.set !== p.set) continue;
    for (const [id, a] of Object.entries(p.track || {})) {
      const a0 = rows[i - 2].track?.[id];
      if (!a.shown || a.held || a.on !== 'in' || !a0?.shown || dist(a0.c, a.c) > STILL_PROP_M) continue;
      const q = project(r.camera, a.c, W, H);
      if (!q || Math.abs(q[0]) > 0.9 || Math.abs(q[1]) > 0.9) continue;
      if (Object.values(r.track || {}).some(b => b.shown && dist(b.c, a.c) < 0.6 && Math.abs(b.size / a.size - 1) < 0.5)) continue;
      out.push(fault({ F: F_(r), kind: 'prop gone after cut', who: id, what: `${id} left at rest at (${a.c.map(x => x.toFixed(1)).join(', ')}) is not there when the next shot looks at that spot`, px: metresPx(r.camera, a.c, a.size), frames: holds(cut, rows.length, i, 1, () => true) }));
    }
  }
}

// a held prop on screen at a cut inside one scene (same act and set, film time running on) that the next shot shows off
// its holder by more than the carry predicts (from the other hand, up over the head), or drops while its holder is still
// in frame and the next shot looks where it should be. A free prop may be cheated at a cut (an editor moves the train);
// one left at rest is goneAfterCut's, a carried prop swapped for another changedAtCut's
function acrossCut(rows, cut, W, H, out) {
  const holderOf = (r, id, t) => { const n = id.includes(':') ? id.split(':')[0] : null; if (n && r.actors[n]) return n;
    let best = null; for (const [k, a] of Object.entries(r.actors)) for (const sd of ['L', 'R']) { const h = a.limbs?.[sd]?.hand, d = h && dist(h, t.c); if (d != null && d < HOLDER_M && (!best || d < best.d)) best = { k, d }; }
    return best?.k ?? null; };
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i], p = rows[i - 1], q = rows[i - 2];
    if (!cut[i] || cut[i - 1] || r.act !== p.act || r.set !== p.set || F_(r) !== F_(p) + 1) continue;
    for (const [id, a] of Object.entries(p.track || {})) {
      const a0 = q.track?.[id], b = r.track?.[id], n = a.shown && a.held && a.c ? holderOf(p, id, a) : null;
      const P = k => rows[k].actors[n]?.pos;
      if (!n || !a0?.shown || !a0.c || !P(i - 2) || !P(i - 1) || !rows[i].actors[n]?.inFrame || !P(i)) continue;
      const off0 = sub(a0.c, P(i - 2)), off1 = sub(a.c, P(i - 1)), pred = add(P(i), add(off1, sub(off1, off0))), frames = holds(cut, rows.length, i, 1, () => true);
      if (!b?.shown) {
        const at = project(r.camera, pred, W, H);
        if (a.on !== 'in' || !at || Math.abs(at[0]) > 0.9 || Math.abs(at[1]) > 0.9) continue;
        out.push(fault({ F: F_(r), kind: 'prop vanishes at cut', who: id, what: `${id} in ${n}'s hand into the cut is gone in the next shot, which looks where it should be; fix: keep it shown across the cut`,
          px: metresPx(r.camera, pred, a.size), frames }));
        continue;
      }
      const d = dist(b.c, pred);
      if (d <= ACROSS_CUT_M || (a.on !== 'in' && b.on !== 'in')) continue;
      out.push(fault({ F: F_(r), kind: 'prop jumps at cut', who: id, what: `${id} is ${fmt(d * 100)} cm off where ${n}'s carry takes it across the cut; fix: match its place in the hand on both sides of the cut`,
        px: metresPx(r.camera, b.c, d), frames, seen: b.on === 'in' ? 1 : 0, vis: b.on === 'in' ? 'in' : b.on }));
    }
  }
}

function changedAtCut(rows, cut, out) {
  const carried = (r, n) => Object.entries(r.track || {}).filter(([id, p]) => p.shown && p.held && id.startsWith(n + ':'));
  for (let i = 1; i < rows.length; i++) {
    if (!cut[i]) continue;
    const r = rows[i], p = rows[i - 1];
    for (const n of Object.keys(r.actors)) {
      const a = carried(p, n), b = carried(r, n);
      if (a.length !== 1 || b.length !== 1) continue;
      const [ia, pa] = a[0], [ib, pb] = b[0], k = pb.size / pa.size - 1;
      if (Math.abs(k) > SIZE_STEP && (pa.on === 'in' || pb.on === 'in'))
        out.push(fault({ F: F_(r), kind: 'prop changes at cut', who: n, what: `${n} carries ${ia} (${fmt(pa.size)} m) into the cut and ${ib} (${fmt(pb.size)} m) out of it`, px: metresPx(r.camera, pb.c, Math.abs(pb.size - pa.size)), frames: holds(cut, rows.length, i, 1, () => true) }));
    }
  }
}

function floating(rows, cut, W, H, out) {
  const ids = new Set(rows.flatMap(r => Object.keys(r.track || {})));
  for (const id of ids) {
    const T = rows.map(r => r.track?.[id]);
    const releasedWithin = i => { for (let j = i; j >= Math.max(0, i - FLOAT_AFTER); j--) if (T[j]?.held) return true; return false; };
    let run = [];
    const flush = () => {
      if (run.length >= FLOAT_RUN) {
        const k = run.length + 1, i1 = run.at(-1).i, i0 = i1 - k, P0 = T[i0].c, v0 = sub(T[i0 + 1].c, P0);
        const fall = add(add(P0, v0.map(x => x * k)), [0, 0, -0.5 * G_FRAME * k * (k - 1)]), w = run.reduce((x, y) => (y.err > x.err ? y : x));
        out.push(fault({ F: F_(rows[run[0].i]), kind: 'prop floats', who: id, what: `${id} free for ${run.length} f with vertical acceleration ${fmt(w.az / G_FRAME)} g (gravity: -1 g)`,
          px: screenPx(rows[i1].camera, fall, sub(T[i1].c, fall), W, H), frames: run.length, seen: run.some(x => T[x.i].on === 'in') ? 1 : 0, vis: run.some(x => T[x.i].on === 'in') ? 'in' : T[run[0].i].on }));
      }
      run = [];
    };
    for (let i = 2; i < rows.length; i++) {
      const [x, y, z] = [T[i - 2], T[i - 1], T[i]];
      if (cut[i] || cut[i - 1] || !x?.shown || !y?.shown || !z?.shown || x.held || y.held || z.held || !releasedWithin(i)) { flush(); continue; }
      const vz = z.c[2] - y.c[2], az = z.c[2] - 2 * y.c[2] + x.c[2], err = Math.abs(az + G_FRAME) / G_FRAME;
      if (Math.abs(vz) > 0.005 && err > FLOAT_ERR) run.push({ i, az, err }); else flush();
    }
    flush();
  }
}

// consecutive frames where on(i) returns a measure: one fault per run, at its worst frame
function runs(rows, cut, on, emit) {
  let run = [];
  const flush = () => { if (run.length) emit(run.reduce((x, y) => (y.px > x.px ? y : x)), run.length, run); run = []; };
  for (let i = 0; i < rows.length; i++) { if (cut[i]) flush(); const m = on(i); if (m) run.push({ i, ...m }); else flush(); }
  flush();
}

function limbs(rows, cut, n, W, H, out) {
  const L = rows.map(r => (r.actors[n]?.inFrame && r.actors[n].expr !== 'sleep' ? r.actors[n].limbs || null : null));
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i], m = L[i - 1], l = L[i];
    if (cut[i] || !m || !l) continue;
    const side = (j, k) => (L[j - 1] && L[j] && !cut[j] ? (jointSteps(L[j - 1], L[j]).find(x => x[0] === k)?.[1] ?? 0) : 0);
    let w = null;
    for (const [k, d] of jointSteps(m, l)) {
      if (d <= JOINT_STEP_MAX) continue;
      const win = Array.from({ length: 11 }, (_, u) => i - 5 + u), pose = win.map(j => L[j] || null), wc = win.map((j, u) => !u || !!cut[j] || !rows[j]);
      const wr = win.map(j => rows[Math.min(Math.max(j, 0), rows.length - 1)]);
      const j = stepPoints(k, l).map((_, u) => jumps(pose.map(q => (q ? stepPoints(k, q)[u] : null)), wc, wr, W, H)[5]).filter(Boolean).sort((x, y) => y.px - x.px)[0];
      if (j && (!w || j.px > w.px)) w = { k, d, ...j, pts: [...stepPoints(k, m), ...stepPoints(k, l)], around: Math.max(side(i - 1, k), side(i + 1, k)) };
    }
    if (w) out.push(fault({ F: F_(r), kind: 'joint pops', who: n, what: `${n} ${w.k} turns ${fmt(w.d)} deg in one frame (${fmt(w.around)} deg either side), ${w.frames > 1 ? `snaps ${fmt(w.px)} px to a new pose for ${w.frames} f` : `${fmt(w.px)} px off its path and back`}`,
      px: w.px, frames: w.frames, seen: seenShare(r.camera, w.pts, W, H, r.actors[n]), pts: w.pts }));
  }
  const ankle = (i, s) => rows[i].actors[n]?.limbs?.[s]?.ankle;
  for (const s of ['L', 'R']) runs(rows, cut, i => {
    const a0 = i && !cut[i] && rows[i].actors[n]?.inFrame ? ankle(i - 1, s) : null, a1 = ankle(i, s);
    if (!a0 || !a1 || a0[2] >= PLANTED_Z || a1[2] >= PLANTED_Z) return null;
    const px = screenPx(rows[i].camera, a0, sub(a1, a0), W, H); return px > 0.5 ? { px } : null;
  }, (w, frames, run) => { const px = run.reduce((t, x) => t + x.px, 0);
    out.push(fault({ F: F_(rows[run[0].i]), kind: 'foot slides', who: n, what: `${n} planted foot ${s} slides ${fmt(px)} px over ${frames} f`, px, frames,
      seen: seenShare(rows[w.i].camera, [ankle(w.i, s)], W, H, rows[w.i].actors[n]), pts: [ankle(w.i, s)] })); });
  for (const s of ['L', 'R']) runs(rows, cut, i => {
    const h = rows[i].actors[n]?.inFrame && rows[i].actors[n].limbs?.[s]; if (!h?.grip || !(h.targetGapCm > GRIP_CM)) return null;
    return { px: h.target ? screenPx(rows[i].camera, h.hand, sub(h.target, h.hand), W, H) : metresPx(rows[i].camera, h.hand, h.targetGapCm / 100), cm: h.targetGapCm, pts: [h.hand, ...(h.target ? [h.target] : [])] };
  }, (w, frames) => out.push(fault({ F: F_(rows[w.i]), kind: 'hand off its grip', who: n, what: `${n} hand ${s} ${fmt(w.cm)} cm off what it holds for ${frames} f`, px: w.px, frames, seen: seenShare(rows[w.i].camera, w.pts, W, H, rows[w.i].actors[n]), pts: w.pts })));
  runs(rows, cut, i => {
    const l = rows[i].actors[n]?.inFrame && rows[i].actors[n].limbs; if (!l || !(l.propPenCm > PROP_CM)) return null;
    const pts = l.propPts || [l.L.hand, l.R.hand];
    return { px: metresPx(rows[i].camera, pts[0], l.propPenCm / 100), cm: l.propPenCm, what: l.propIn || 'prop', pts };
  }, (w, frames) => out.push(fault({ F: F_(rows[w.i]), kind: 'prop in the body', who: n, what: `${n} held ${w.what} ${fmt(w.cm)} cm inside the body for ${frames} f`, px: w.px, frames, seen: seenShare(rows[w.i].camera, w.pts, W, H, rows[w.i].actors[n]), pts: w.pts })));
}

function skating(rows, cut, n, W, H, out) {
  runs(rows, cut, i => {
    const a = rows[i].actors[n], b = rows[i - 1]?.actors[n];
    if (!i || cut[i] || !a?.inFrame || !b?.pos || !a.feet || !b.feet) return null;
    const v = Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1]), u = ['L', 'R'].map(s => Math.hypot(a.feet[s][0] - b.feet[s][0], a.feet[s][1] - b.feet[s][1]));
    const s = u[0] < u[1] ? 'L' : 'R';
    if (!(v > SKATE_SPEED && u[s === 'L' ? 0 : 1] > SKATE_SHARE * v && a.feet[s][2] < SKATE_FLOOR)) return null;
    return { px: screenPx(rows[i].camera, b.feet[s], sub(a.feet[s], b.feet[s]), W, H), v, k: Math.min(...u) / v, pts: [a.feet.L, a.feet.R] };
  }, (w, frames, run) => { if (frames < SKATE_RUN) return;
    const v = run.reduce((s, x) => s + x.v, 0) / frames, px = run.reduce((s, x) => s + x.px, 0);
    out.push(fault({ F: F_(rows[run[0].i]), kind: 'figure skates', who: n, what: `${n} travels ${fmt(v * FPS)} m/s for ${frames} f with both feet moving along (stance foot slides ${fmt(px)} px)`, px, frames, seen: seenShare(rows[w.i].camera, w.pts, W, H, rows[w.i].actors[n]), pts: w.pts })); });
}

function cordShakes(rows, cut, n, out) {
  const start = rows.map((r, i) => cut[i] || !!r.actors[n]?.cord?.fresh), shake = rows.map(() => 0);
  const tips = rows.find(r => r.actors[n]?.cord)?.actors[n].cord.tips.length || 0;
  for (let c = 0; c < tips; c++) shakeOf(rows.map(r => r.actors[n]?.cord?.tips[c] || null), start).forEach((v, i) => { shake[i] = Math.max(shake[i], v); });
  shake.forEach((v, i) => { if (v > CORD_SHAKE_MAX && rows[i].actors[n].inFrame) out.push(fault({ F: F_(rows[i]), kind: 'cord shakes', who: n, what: `${n} hoodie cord shakes ${v.toFixed(4)} m/frame^2`, px: 0, watch: true, pts: [rows[i].actors[n].headW] })); });
}

// where a crossing's point is in a row (engine/play.js names: <actor>.head | kneeL | kneeR | pelvis | chest, prop <id>)
function crossPoint(r, what) {
  if (what.startsWith('prop ')) { const t = r.track?.[what.slice(5)]; return t?.shown ? t.c : null; }
  const [n, k] = what.split('.'), a = r.actors[n], l = a?.limbs; if (!a?.inFrame || !l) return null;
  return { head: a.headW, kneeL: l.L.knee, kneeR: l.R.knee, pelvis: l.L.hip && mid(l.L.hip, l.R.hip), chest: l.L.shoulder && mid(l.L.shoulder, l.R.shoulder) }[k] || null;
}

// a point through a surface (engine/play.js reports the frame it crosses in, not its way out): the surface is taken as flat
// across the way it went in, so it stays inside while it is past the crossing spot along that way; as deep as the camera sees
function crossings(rows, cut, W, H, out) {
  for (let i = 1; i < rows.length; i++) for (const c of cut[i] ? [] : rows[i].cross || []) {
    if (c.d > CROSS_MAX_M) continue;
    const prop = c.what.startsWith('prop '), n = prop ? c.what.slice(5) : c.what.split('.')[0], P0 = crossPoint(rows[i - 1], c.what), P1 = crossPoint(rows[i], c.what);
    if (!P0 || !P1 || dist(P0, P1) < 1e-6) continue;
    const u = sub(P1, P0).map(x => x / dist(P0, P1));
    let j = i, px = 0, worst = i, deep = 0;
    for (; j < rows.length && j < i + INSIDE_MAX && (j === i || !cut[j]); j++) {
      const P = crossPoint(rows[j], c.what), d = P ? sub(P, c.at).reduce((t, x, k) => t + x * u[k], 0) : 0; if (d <= 0) break;
      const q = metresPx(rows[j].camera, c.at, d); if (q > px) { px = q; worst = j; deep = d; }
    }
    if (!prop && !rows[worst].actors[n]?.inFrame) continue;
    out.push(fault({ F: F_(rows[i]), kind: prop ? 'prop passes through' : 'body passes through', who: n.split(':')[0], what: `${c.what} goes ${fmt(deep * 100)} cm into ${c.through} for ${j - i} f (${fmt(px)} px)`,
      px, frames: j - i, seen: seenShare(rows[worst].camera, [c.at], W, H, prop ? null : rows[worst].actors[n]), pts: [c.at] }));
  }
  runs(rows, cut, i => {
    const c = (rows[i].collide || []).find(s => rows[i].actors[s.split('.')[0]]?.inFrame); if (!c) return null;
    const n = c.split('.')[0], l = rows[i].actors[n].limbs, pts = l ? ['L', 'R'].flatMap(s => [l[s].hip, l[s].knee, l[s].ankle, l[s].shoulder]) : [];
    return { px: CONTACT_PX, c, n, pts };
  }, (w, frames) => out.push(fault({ F: F_(rows[w.i]), kind: 'body in the set', who: w.n, what: `${w.c} for ${frames} f`, px: w.px, frames, seen: seenShare(rows[w.i].camera, w.pts, W, H, rows[w.i].actors[w.n]), pts: w.pts })));
}

// a prop inside a head or a solid the set built (engine/play.js out.propIn: its drawn box against the ellipsoid of each
// head and the box meshes and COLLIDE of the set), one fault per prop and piece and run of frames
function propInside(rows, cut, W, H, out) {
  const keys = [...new Set(rows.flatMap(r => (r.propIn || []).map(x => `${x.id}\t${x.in}`)))];
  for (const k of keys) {
    const [id, what] = k.split('\t'), head = what.endsWith('.head');
    runs(rows, cut, i => {
      const x = (rows[i].propIn || []).find(y => y.id === id && y.in === what); if (!x) return null;
      return { px: metresPx(rows[i].camera, x.at, x.cm / 100), cm: x.cm, at: x.at, on: propState(rows[i].track?.[id]) };
    }, (w, frames) => out.push(fault({ F: F_(rows[w.i]), kind: head ? 'prop in the head' : 'prop in the set', who: id,
      what: `${id} ${fmt(w.cm)} cm into ${what} for ${frames} f; fix: ${head ? 'carry it clear of the head (low in front or out to the side)' : `move its path off ${what}, or, if it is not solid, mark its mesh userData.hollow (or drop it from COLLIDE)`}`,
      px: w.px, frames, seen: w.on === 'in' ? seenShare(rows[w.i].camera, [w.at], W, H) : 0, vis: w.on === 'none' ? 'off' : w.on, pts: [w.at] })));
  }
}

// a prop in a hand leaves the frame while the figure holding it stays in frame, and comes back: the framing crops what the
// beat is about (Hot Money ep01 r5 LOAD-B 741-757: the bait bill held up over the head, out of the top of the frame)
function leavesView(rows, cut, W, H, out) {
  const ids = [...new Set(rows.flatMap(r => Object.keys(r.track || {})))];
  const holder = (r, t) => { let best = null;
    for (const [n, a] of Object.entries(r.actors)) { if (!a.inFrame || !a.limbs) continue;
      for (const s of ['L', 'R']) { const h = a.limbs[s]?.hand, d = h && dist(h, t.c); if (d != null && d < HOLDER_M && (!best || d < best.d)) best = { n, d }; } }
    return best?.n || null; };
  for (const id of ids) {
    const T = rows.map(r => r.track?.[id]), st = T.map(propState);
    for (let i = 1; i < rows.length; i++) {
      // seen whole before it went: big in one of the 6 frames before (it slides out through the edge, small on its way)
      const before = [1, 2, 3, 4, 5, 6].map(k => i - k).filter(k => k >= 0 && st[k] === 'in' && !cut[k + 1]);
      if (cut[i] || st[i - 1] !== 'in' || st[i] !== 'off' || !before.some(k => big(T[k].box, W, H))) continue;
      const n = (id.includes(':') && rows[i - 1].actors[id.split(':')[0]]?.inFrame ? id.split(':')[0] : null) || holder(rows[i - 1], T[i - 1]); if (!n) continue;
      let j = i; while (j < rows.length && !cut[j] && st[j] === 'off' && rows[j].actors[n]?.inFrame) j++;
      if (j >= rows.length || cut[j] || st[j] !== 'in' || j - i > LOST_MAX) continue;
      out.push(fault({ F: F_(rows[i]), kind: 'prop leaves view', who: id, what: `${id} in ${n}'s hand leaves the frame for ${j - i} f while ${n} stays in it, then comes back; fix: keep the hand and the prop in frame (lower the hand, or widen or tilt the shot)`,
        px: Math.max(...before.map(k => boxPx(T[k].box, W, H))), frames: j - i }));
      i = j;
    }
  }
}

// a prop whose kind has a real size (lib/props/sizes.js) drawn outside it while it is in view
function outOfScale(rows, cut, W, H, out) {
  const ids = [...new Set(rows.flatMap(r => Object.keys(r.track || {})))];
  for (const id of ids) runs(rows, cut, i => {
    const t = rows[i].track?.[id]; if (!t?.shown || t.on !== 'in') return null;
    const s = scaleFault(id, t.size); return s ? { px: metresPx(rows[i].camera, t.c, s.over), size: t.size, s, c: t.c } : null;
  }, (w, frames) => out.push(fault({ F: F_(rows[w.i]), kind: 'prop out of scale', who: id,
    what: `${id} is ${fmt(w.size * 100)} cm long, a real ${w.s.kind} is ${fmt(w.s.want[0] * 100)}-${fmt(w.s.want[1] * 100)} cm (${w.s.src}); fix: build it at real size, or scale the shot (lens, distance), not the prop`,
    px: w.px, frames, seen: seenShare(rows[w.i].camera, [w.c], W, H), pts: [w.c] })));
}

// an object the camera's far plane cuts inside the shot (engine/play.js out.farCut): a straight edge where the sky shows
// through or a card draws over the sky dome. Sky lives at infinity: the engine's dome (look.js) is the only sky, and a
// set's flat sky cards or far scenery come out or move inside far
function farCuts(rows, cut, W, H, out) {
  const names = [...new Set(rows.flatMap(r => (r.farCut || []).map(x => x.name)))];
  for (const n of names) runs(rows, cut, i => {
    const x = (rows[i].farCut || []).find(y => y.name === n); if (!x) return null;
    return { px: Math.sqrt(x.share ?? 0) * REF_H, x };                                // the side of a square as big as what is seen of it
  }, (w, frames) => out.push(fault({ F: F_(rows[w.i]), kind: 'cut by the far plane', who: n,
    what: `${n} (${w.x.size.join(' x ')} m, ${fmt(100 * (w.x.share ?? 0))} % of the frame near the cut) crosses the camera's far plane (${w.x.far} m) for ${frames} f; fix: the engine's sky dome is the sky: hide flat sky cards, or keep scenery inside ${w.x.far} m`,
    px: w.px, frames, pts: [w.x.at] })));
}

export const severity = x => x.px * Math.min(x.frames, MAX_FRAMES) * x.seen;
export const blocks = x => x.vis === 'in' && !x.watch && x.frames >= HOLD_FRAMES && x.px * x.seen >= (CONTACT.has(x.kind) ? CONTACT_PX : CHANGE_PX);

// every fault of the rows, by frame; W, H: the frame size the rows were measured at
export function shotFaults(rows, { W = 1080, H = 1920 } = {}) {
  if (!rows.length) return [];
  const cut = cuts(rows), out = [];
  cameraJumps(rows, cut, W, H, out); props(rows, cut, W, H, out); figures(rows, cut, W, H, out);
  goneAfterCut(rows, cut, W, H, out); acrossCut(rows, cut, W, H, out); changedAtCut(rows, cut, out); floating(rows, cut, W, H, out);
  for (const n of Object.keys(rows[0].actors)) { limbs(rows, cut, n, W, H, out); skating(rows, cut, n, W, H, out); cordShakes(rows, cut, n, out); }
  crossings(rows, cut, W, H, out); propInside(rows, cut, W, H, out); leavesView(rows, cut, W, H, out); outOfScale(rows, cut, W, H, out); farCuts(rows, cut, W, H, out);
  for (const x of out) x.sev = +severity(x).toFixed(2);
  return out.sort((a, b) => a.F - b.F);
}

// one row per second of film that has a fault
export function bySecond(faults, fps = FPS) {
  const m = new Map();
  for (const x of faults) { const s = Math.floor(x.F / fps); (m.get(s) || m.set(s, []).get(s)).push(x); }
  return [...m].sort((a, b) => a[0] - b[0]).map(([s, list]) => ({ s, list, block: list.some(blocks) }));
}
