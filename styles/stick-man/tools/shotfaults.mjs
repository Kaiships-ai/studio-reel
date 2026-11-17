// The measured shot gate's detectors (shotgate.mjs): the faults that live between frames, judged on __dbg rows in film
// order so a test can judge rows without a render. Kai's notes on Hot Money ep01 r2 v002 (16/11): a bag that appears from
// nothing, jumps to the trunk across a cut, floats when let go and is gone in the next shot; a figure that pops into
// frame, slides like a dragged mouse, walks through a truck; limbs that snap. None of them reached a gate: the report
// skipped every frame of a film directed one camera shot per frame (motion.cut is true on each), and nothing tracked a
// prop from frame to frame.
// A row: __dbg (engine/play.js) plus the film frame F (default f). A row with `edit: true` starts a shot the cut list
// names (a film assembled shot by shot); otherwise a cut is an act change, a dissolve, or a camera jump.
// Fault: { F, kind, who, what, d, limit, vis: 'in' | 'occluded' | 'off', watch?, pts? }. A seen fault blocks the gate
// unless it is watch-only; pts are Blender-world points for shotgate.mjs to ask the film camera about.
import { jointSteps, JOINT_STEP_MAX, stepPoints } from './jointstep.mjs';
import { GRIP_CM, PROP_CM, CORD_SHAKE_MAX, shakeOf } from './faults.mjs';

export const FPS = 30;
export const CAM_JUMP_M = 0.3;          // camera position + aim moved this far in one frame, and 3x its last step: a cut
export const LENS_JUMP = 0.15;          // or the lens changed by this share in one frame
export const STILL_CAM_M = 0.05;        // camera position + aim moved less than this in a frame: a still camera
export const EDGE = 0.03;               // a box within this share of the frame edge is entering or leaving through it
export const SEEN_AREA = 0.002;         // a prop covers this share of the frame to be seen (engine/play.js onScreen, the props-seen gate)
export const PROP_JUMP_M = 0.25;        // a prop's centre steps this much further than its last step in one frame
export const ACTOR_JUMP_M = 0.4;        // a figure's head does
export const SIZE_STEP = 0.15;          // a prop's size changes by this share in one frame, or a carried prop across a cut
export const G_FRAME = 9.81 / FPS ** 2; // gravity in m / frame^2
export const FLOAT_ERR = 0.6;           // a free prop's vertical acceleration off -g by more than this share of g
export const FLOAT_RUN = 3;             // ... for this many frames in a row while it moves up or down
export const FLOAT_AFTER = 15;          // ... within this many frames of a hand letting go of it
export const POP_SPIKE = 2;             // a joint pop: over JOINT_STEP_MAX and this many times the channel's step on either side
export const SLIDE_PX = 3;              // a planted foot moves this many px a frame at 720p
export const SKATE_SPEED = 0.02;        // m / frame (0.6 m/s): the body travels
export const SKATE_SHARE = 0.5;         // ... and even the stiller foot moves at more than this share of the body's speed
export const SKATE_RUN = 8;             // ... for this many frames (a run's flight phase, both feet off and moving, lasts <= 5)
export const CROSS_MIN_M = 0.02;        // a point that crosses a surface by less is resting on it
export const CROSS_MAX_M = 0.5;         // one that moved further in a frame jumped (figure / prop jumps), it did not pass through

const F_ = r => r.F ?? r.f;
const dist = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
const camStep = (a, b) => dist(a.camera.pos, b.camera.pos) + dist(a.camera.target, b.camera.target);

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

const overlaps = (box, W, H) => box[2] > 0 && box[0] < W && box[3] > 0 && box[1] < H;   // a head box off the frame: the camera moved past it
const inside = (box, W, H) => box && box[0] > EDGE * W && box[2] < (1 - EDGE) * W && box[1] > EDGE * H && box[3] < (1 - EDGE) * H;
const fmt = x => (Math.abs(x) >= 10 ? x.toFixed(0) : x.toFixed(2));

// what a prop is to the viewer in one row: 'none' (not in the scene or hidden), 'off', 'occluded', 'in'
const propState = p => (!p || !p.shown ? 'none' : p.on || 'off');
// a figure: 'none' when not drawn or out of the frame (the row cannot tell them apart), else 'in'
const actorState = a => (a && a.inFrame ? 'in' : 'none');

// presence: a thing that is there in one frame and not in the next, with no cut and not through the frame edge or
// from behind a cover, popped; one that moves further in a frame than its motion carries, jumped
function presence(rows, cut, W, H, out) {
  for (let i = 1; i < rows.length; i++) {
    if (cut[i]) continue;
    const r = rows[i], p = rows[i - 1], F = F_(r);
    const cs = camStep(p, r), cs0 = i > 1 && !cut[i - 1] ? camStep(rows[i - 2], p) : 0;
    if (r.edit != null && cs > CAM_JUMP_M && cs > 3 * cs0)
      out.push({ F, kind: 'camera jumps', who: 'camera', what: `the camera jumps ${fmt(cs)} m inside the shot (last step ${fmt(cs0)} m)`, d: cs, limit: CAM_JUMP_M, vis: 'in' });
    const big = box => box && (Math.min(box[2], W) - Math.max(box[0], 0)) * (Math.min(box[3], H) - Math.max(box[1], 0)) >= SEEN_AREA * W * H;
    const still = cs < STILL_CAM_M;   // a pan carries a prop across the frame edge in one frame; only a still camera tells
    for (const id of new Set([...Object.keys(p.track || {}), ...Object.keys(r.track || {})])) {
      const a = p.track?.[id], b = r.track?.[id], sa = propState(a), sb = propState(b);
      if (sb === 'in' && big(b.box) && (sa === 'none' || sa === 'off' && still && inside(b.box, W, H)))
        out.push({ F, kind: 'prop appears', who: id, what: `${id} appears in one frame (${sa === 'none' ? 'from nothing' : 'inside the frame'})`, d: 1, limit: 0, vis: 'in' });
      if (sa === 'in' && big(a.box) && (sb === 'none' || sb === 'off' && still && inside(a.box, W, H)))
        out.push({ F, kind: 'prop vanishes', who: id, what: `${id} vanishes in one frame`, d: 1, limit: 0, vis: 'in' });
      if (sa === 'none' || sb === 'none') continue;
      const vis = sb === 'in' || sa === 'in' ? 'in' : sb;
      if (a.size > 0 && Math.abs(b.size / a.size - 1) > SIZE_STEP)
        out.push({ F, kind: 'prop resizes', who: id, what: `${id} size ${fmt(a.size)} -> ${fmt(b.size)} m in one frame`, d: Math.abs(b.size / a.size - 1), limit: SIZE_STEP, vis });
      const q = rows[i - 2]?.track?.[id], last = q && !cut[i - 1] && q.shown ? dist(q.c, a.c) : 0, step = dist(a.c, b.c);
      if (step - last > PROP_JUMP_M)
        out.push({ F, kind: 'prop jumps', who: id, what: `${id} moves ${fmt(step)} m in one frame (last step ${fmt(last)} m)`, d: step - last, limit: PROP_JUMP_M, vis });
    }
    for (const n of Object.keys(r.actors)) {
      const a = p.actors[n], b = r.actors[n], sa = actorState(a), sb = actorState(b);
      if (sb === 'in' && sa === 'none' && inside(b.head, W, H) && !(a?.head && !overlaps(a.head, W, H)))
        out.push({ F, kind: 'figure appears', who: n, what: `${n} appears inside the frame in one frame`, d: 1, limit: 0, vis: 'in' });
      if (sa === 'in' && sb === 'none' && inside(a.head, W, H) && !(b?.head && !overlaps(b.head, W, H)))
        out.push({ F, kind: 'figure vanishes', who: n, what: `${n} vanishes inside the frame in one frame`, d: 1, limit: 0, vis: 'in' });
      if (sa === 'in' && sb === 'in' && a.headW && b.headW) {
        const q = rows[i - 2]?.actors[n], last = q?.headW && !cut[i - 1] ? dist(q.headW, a.headW) : 0, step = dist(a.headW, b.headW);
        if (step - last > ACTOR_JUMP_M) out.push({ F, kind: 'figure jumps', who: n, what: `${n} moves ${fmt(step)} m in one frame (last step ${fmt(last)} m)`, d: step - last, limit: ACTOR_JUMP_M, vis: 'in' });
      }
    }
  }
}

// where a Blender-world point lands in a row's frame, NDC -1..1 (null: behind the lens); three's fov is vertical
export function project(cam, P, W, H) {
  const f = cam.target.map((x, i) => x - cam.pos[i]), lf = Math.hypot(...f), fw = f.map(x => x / lf);
  const rt0 = [fw[1], -fw[0], 0], lr = Math.hypot(...rt0) || 1, rt = rt0.map(x => x / lr);
  const up = [rt[1] * fw[2] - rt[2] * fw[1], rt[2] * fw[0] - rt[0] * fw[2], rt[0] * fw[1] - rt[1] * fw[0]];
  const d = P.map((x, i) => x - cam.pos[i]), z = d.reduce((s, x, i) => s + x * fw[i], 0); if (z <= 0.05) return null;
  const t = Math.tan(cam.fov * Math.PI / 360);
  return [d.reduce((s, x, i) => s + x * rt[i], 0) / (z * t * W / H), d.reduce((s, x, i) => s + x * up[i], 0) / (z * t)];
}

// continuity across a cut in one place: a prop a figure carries out of one shot and into the next keeps its size, and a
// prop left free in the last frame is still there when the next shot looks at that spot
function acrossCuts(rows, cut, W, H, out) {
  const carried = (r, n) => Object.entries(r.track || {}).filter(([id, p]) => p.shown && p.held && id.startsWith(n + ':'));
  for (let i = 1; i < rows.length; i++) {
    if (!cut[i]) continue;
    const r = rows[i], p = rows[i - 1];
    if (r.act === p.act && r.set === p.set) for (const [id, a] of Object.entries(p.track || {})) {
      if (!a.shown || a.held || a.on !== 'in') continue;
      const q = project(r.camera, a.c, W, H);
      if (!q || Math.abs(q[0]) > 0.9 || Math.abs(q[1]) > 0.9) continue;
      if (Object.values(r.track || {}).some(b => b.shown && dist(b.c, a.c) < 0.6 && Math.abs(b.size / a.size - 1) < 0.5)) continue;
      out.push({ F: F_(r), kind: 'prop gone after cut', who: id, what: `${id} left free at (${a.c.map(x => x.toFixed(1)).join(', ')}) is not there when the next shot looks at that spot`, d: 1, limit: 0, vis: 'in' });
    }
    for (const n of Object.keys(r.actors)) {
      const a = carried(p, n), b = carried(r, n);
      if (a.length !== 1 || b.length !== 1) continue;
      const [ia, pa] = a[0], [ib, pb] = b[0], k = pb.size / pa.size - 1;
      if (Math.abs(k) > SIZE_STEP && (pa.on === 'in' || pb.on === 'in'))
        out.push({ F: F_(r), kind: 'prop changes at cut', who: n, what: `${n} carries ${ia} (${fmt(pa.size)} m) into the cut and ${ib} (${fmt(pb.size)} m) out of it`, d: Math.abs(k), limit: SIZE_STEP, vis: 'in' });
    }
  }
}

// a prop no hand holds falls under gravity: one that rises or sinks at a steady speed while free is floating
function floating(rows, cut, out) {
  const ids = new Set(rows.flatMap(r => Object.keys(r.track || {})));
  for (const id of ids) {
    // a prop counts as free once a hand let go of it in the last FLOAT_AFTER frames (a film may move a carried prop itself)
    const letGo = i => { for (let j = i; j >= Math.max(0, i - FLOAT_AFTER); j--) if (rows[j].track?.[id]?.held) return true; return false; };
    let run = [];
    const flush = () => { if (run.length >= FLOAT_RUN) { const w = run.reduce((x, y) => (y.err > x.err ? y : x));
      out.push({ F: run[0].F, kind: 'prop floats', who: id, what: `${id} free for ${run.length} f with vertical acceleration ${fmt(w.az / G_FRAME)} g (gravity: -1 g)`, d: w.err, limit: FLOAT_ERR, vis: run.some(x => x.on === 'in') ? 'in' : run[0].on }); }
      run = []; };
    for (let i = 2; i < rows.length; i++) {
      const [x, y, z] = [rows[i - 2], rows[i - 1], rows[i]].map(r => r.track?.[id]);
      if (cut[i] || cut[i - 1] || !x?.shown || !y?.shown || !z?.shown || x.held || y.held || z.held || !letGo(i)) { flush(); continue; }
      const vz = z.c[2] - y.c[2], az = z.c[2] - 2 * y.c[2] + x.c[2], err = Math.abs(az + G_FRAME) / G_FRAME;
      if (Math.abs(vz) > 0.005 && err > FLOAT_ERR) run.push({ F: F_(rows[i]), az, err, on: z.on }); else flush();
    }
    flush();
  }
}

// the figures: a joint over JOINT_STEP_MAX in one frame, a planted foot that slides, a body inside the set, a gripping
// hand off its target, a held prop inside the body, a hoodie cord that shakes
function bodies(rows, cut, out) {
  for (const n of Object.keys(rows[0].actors)) {
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i], a = r.actors[n], m = rows[i - 1].actors[n]?.limbs, l = a?.limbs, F = F_(r);
      if (!a?.inFrame || !l) continue;
      if (!cut[i] && m && a.expr !== 'sleep') {
        const side = (j, k) => { const p = rows[j - 1]?.actors[n]?.limbs, q = rows[j]?.actors[n]?.limbs;
          return p && q && !cut[j] ? (jointSteps(p, q).find(x => x[0] === k)?.[1] ?? 0) : 0; };
        const w = jointSteps(m, l).filter(([k, d]) => d > JOINT_STEP_MAX && d > POP_SPIKE * Math.max(side(i - 1, k), side(i + 1, k))).reduce((x, y) => (y[1] > x[1] ? y : x), ['', 0]);
        if (w[1]) out.push({ F, kind: 'joint pops', who: n, what: `${n} ${w[0]} turns ${fmt(w[1])} deg in one frame, over ${POP_SPIKE}x its steps either side`, d: w[1], limit: JOINT_STEP_MAX, vis: 'in', pts: [...stepPoints(w[0], m), ...stepPoints(w[0], l)] });
        for (const s of ['L', 'R']) { const ft = r.motion?.feet?.[n]?.[s];
          if (ft?.planted && ft.px > SLIDE_PX) out.push({ F, kind: 'foot slides', who: n, what: `${n} planted foot ${s} slides ${fmt(ft.px)} px in one frame at 720p`, d: ft.px, limit: SLIDE_PX, vis: 'in', pts: [l[s].ankle, l[s].toe].filter(Boolean) }); }
      }
      for (const s of ['L', 'R']) if (l[s]?.grip && l[s].targetGapCm > GRIP_CM) out.push({ F, kind: 'hand off its grip', who: n, what: `${n} hand ${s} ${fmt(l[s].targetGapCm)} cm off what it holds`, d: l[s].targetGapCm, limit: GRIP_CM, vis: 'in', pts: [l[s].hand, ...(l[s].target ? [l[s].target] : [])] });
      if (l.propPenCm > PROP_CM) out.push({ F, kind: 'prop in the body', who: n, what: `${n} held ${l.propIn || 'prop'} ${fmt(l.propPenCm)} cm inside the body`, d: l.propPenCm, limit: PROP_CM, vis: 'in', pts: l.propPts || [l.L.hand, l.R.hand] });
    }
    // a walk keeps one foot still on the ground while the body travels; a body dragged along carries both feet with it
    let skate = [];
    const flushSkate = () => { if (skate.length >= SKATE_RUN) { const v = skate.reduce((s, x) => s + x.v, 0) / skate.length;
      out.push({ F: skate[0].F, kind: 'figure skates', who: n, what: `${n} travels ${fmt(v * FPS)} m/s for ${skate.length} f with both feet moving along (stance foot at ${Math.round(100 * Math.min(...skate.map(x => x.k)))}-${Math.round(100 * Math.max(...skate.map(x => x.k)))} % of the body's speed)`, d: Math.min(...skate.map(x => x.k)), limit: SKATE_SHARE, vis: 'in', pts: skate[0].pts }); }
      skate = []; };
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i].actors[n], b = rows[i - 1].actors[n];
      if (cut[i] || !a?.inFrame || !b?.pos || !a.feet || !b.feet) { flushSkate(); continue; }
      const v = Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1]), u = ['L', 'R'].map(s => Math.hypot(a.feet[s][0] - b.feet[s][0], a.feet[s][1] - b.feet[s][1]));
      if (v > SKATE_SPEED && Math.min(...u) > SKATE_SHARE * v) skate.push({ F: F_(rows[i]), v, k: Math.min(...u) / v, pts: [a.feet.L, a.feet.R] }); else flushSkate();
    }
    flushSkate();
    const start = rows.map((r, i) => cut[i] || !!r.actors[n]?.cord?.fresh), shake = rows.map(() => 0);
    const tips = rows.find(r => r.actors[n]?.cord)?.actors[n].cord.tips.length || 0;
    for (let c = 0; c < tips; c++) shakeOf(rows.map(r => r.actors[n]?.cord?.tips[c] || null), start).forEach((v, i) => { shake[i] = Math.max(shake[i], v); });
    shake.forEach((v, i) => { if (v > CORD_SHAKE_MAX && rows[i].actors[n].inFrame) out.push({ F: F_(rows[i]), kind: 'cord shakes', who: n, what: `${n} hoodie cord shakes ${v.toFixed(4)} m/frame^2`, d: v, limit: CORD_SHAKE_MAX, vis: 'in', watch: true, pts: [rows[i].actors[n].headW] }); });
  }
  for (let i = 1; i < rows.length; i++) for (const c of cut[i] ? [] : rows[i].cross || []) {
    if (c.d > CROSS_MAX_M || c.d < CROSS_MIN_M) continue;
    const was = rows[i - 1].track?.[c.through]?.c, is = rows[i].track?.[c.through]?.c;   // riding in a car that moves is not passing through it
    if (was && is && dist(was, is) > 0.01) continue;
    const r = rows[i], prop = c.what.startsWith('prop '), n = prop ? c.what.slice(5) : c.what.split('.')[0];
    if (!prop && !r.actors[n]?.inFrame) continue;
    out.push({ F: F_(r), kind: prop ? 'prop passes through' : 'body passes through', who: n.split(':')[0], what: `${c.what} passes through ${c.through} (${fmt(c.d)} m this frame)`, d: c.d, limit: 0, vis: 'in', pts: [c.at] });
  }
  for (const r of rows) for (const c of r.collide || []) {
    const n = c.split('.')[0], l = r.actors[n]?.limbs;
    if (r.actors[n]?.inFrame) out.push({ F: F_(r), kind: 'body in the set', who: n, what: c, d: 1, limit: 0, vis: 'in', pts: l ? ['L', 'R'].flatMap(s => [l[s].hip, l[s].knee, l[s].ankle, l[s].shoulder]) : [] });
  }
}

// every fault of the rows, by frame; W, H: the frame size the rows were measured at
export function shotFaults(rows, { W = 1080, H = 1920 } = {}) {
  if (!rows.length) return [];
  const cut = cuts(rows), out = [];
  presence(rows, cut, W, H, out); acrossCuts(rows, cut, W, H, out); floating(rows, cut, out); bodies(rows, cut, out);
  return out.sort((a, b) => a.F - b.F);
}

export const blocks = x => x.vis === 'in' && !x.watch;

// one row per second of film that has a fault: the faults of a second are one place for a reviewer to look
export function bySecond(faults, fps = FPS) {
  const m = new Map();
  for (const x of faults) { const s = Math.floor(x.F / fps); (m.get(s) || m.set(s, []).get(s)).push(x); }
  return [...m].sort((a, b) => a[0] - b[0]).map(([s, list]) => ({ s, list, block: list.some(blocks) }));
}
