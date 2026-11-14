// The motion library's checker and proof renders (styles/stick-man/motion-lib, docs/MOTION-LIB.md).
//   node styles/stick-man/tools/motionlib.mjs                       check every clip (exit 1 on a FAIL):
//        naming, the index lists every file, the record, loop seam, starts / ends on its standard pose, the joint gate
//        (<= 25 deg a frame after the 'kaiships' dose), planted feet that never slide, a physics line (flights, g), and the
//        clip through the real rig headless (cast.js): a gripping hand <= 2 cm off its target, a held prop <= 1 cm in the body
//   node styles/stick-man/tools/motionlib.mjs --sheet <group> --out <dir>    a contact sheet of a group (Idle, Move, Act,
//        Trans, React, Gest): every clip of it on its bodies, 6 frames each, rendered through motion-lib/proof (540x960)
//   node styles/stick-man/tools/motionlib.mjs --proof <dir> [--only <clip>]   every clip as mp4, physics on and off, the
//        shot.mjs --report numbers of each, and one sheet per group (one render process at a time)
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { run } from '../../../kit/env.mjs';
import { ALL, placeClip } from '../motion-lib/index.js';
import { BASES, turned } from '../motion-lib/base.js';
import { BODIES } from '../motion-lib/bodies.js';
import { compileTrack, playActor, flatten } from '../engine/motion.js';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..'), LIB = path.join(ROOT, 'styles/stick-man/motion-lib');
export const JOINT_MAX = 25, SLIDE_MM = 1, ARM_W = 1.025;
const GROUPS = ['Idle', 'Move', 'Act', 'Trans', 'React', 'Gest'], SHARED = { interact: ['Act'], transition: ['Trans'], react: ['React'], extra: GROUPS };
const PREFIX = { adult: 'Adult', heavy: 'Heavy', thin: 'Thin', child: 'Child', elder: 'Elder' };
export const NAME_RE = /^((Adult|Heavy|Thin|Child|Elder)_)?(Idle|Move|Act|Trans|React|Gest)_[A-Z][A-Za-z]*(_[A-Z][A-Za-z]*)*_(Loop|Once)_v\d\d\.js$/;
const ANGLE = /^(yaw|spine\.(bend|side|twist)|neck\.(nod|tilt|turn)|pelvis\.(pitch|roll|yaw)|arm[LR]\.(raise|swing|elbow|roll)|leg[LR]\.pitch)$/;

export function clipFiles() {
  const out = [];
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js')) out.push(path.relative(LIB, p)); } };
  for (const d of ['body', 'shared']) walk(path.join(LIB, d));
  return out.sort();
}
// every channel of every key, carried forward the way compileTrack does (a key names only what changes)
function full(keys) { let cur = {}; return keys.map(k => { cur = { ...cur, ...flatten(Object.fromEntries(Object.entries(k).filter(([n]) => !['f', 'ease', 'cycle', 'hold', 'antic', 't'].includes(n)))) }; return { ...cur }; }); }
// a pose made comparable across places: feet relative to the root, the root and the heading dropped, ik targets only
// when they hold the hand (ikw > 0); x_ channels only those the standard pose names
function body(m, ref) {
  const o = {};
  for (const [n, v] of Object.entries(m)) {
    if (/^pos\.|^yaw$/.test(n) || /\.(ik|pole)\.\d$/.test(n)) continue;
    if (n.startsWith('x_') && !(ref && n in ref)) continue;
    const fw = /^leg[LR]\.footW\.([01])$/.exec(n);
    o[n] = fw ? v - (m['pos.' + fw[1]] || 0) : v;
  }
  return o;
}
function diff(a, b) {
  let worst = null;
  for (const n of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const d = Math.abs((a[n] || 0) - (b[n] || 0)), tol = ANGLE.test(n) || /ikw|fall/.test(n) ? 0.5 : 0.005;
    if (d > tol && (!worst || d / tol > worst.r)) worst = { n, d: +d.toFixed(3), r: d / tol };
  }
  return worst;
}
// one clip: the checks, plus the offline physics numbers
export function checkClip(C, file) {
  const fails = [], info = {}, base = path.basename(file, '.js'), dir = file.split(path.sep);
  // naming: the file name, the record's name and lookup name, the folder it lives in
  if (!NAME_RE.test(path.basename(file))) fails.push(`name: ${path.basename(file)} is not <Body>_<Group>_<Action>_<Loop|Once>_v01.js`);
  if (C.name !== base.replace(/_v\d+$/, '')) fails.push(`name: record name ${C.name} != file ${base}`);
  const isBody = dir[0] === 'body', body0 = isBody ? dir[1] : null;
  if (isBody && (C.body !== body0 || !base.startsWith(PREFIX[body0] + '_'))) fails.push(`name: ${file} must be ${PREFIX[body0]}_... with body '${body0}'`);
  if (!isBody && /^(Adult|Heavy|Thin|Child|Elder)_/.test(base)) fails.push('name: a shared clip carries no body prefix');
  if (!isBody && !(SHARED[dir[1]] || []).includes(C.group)) fails.push(`name: group ${C.group} does not belong in shared/${dir[1]}`);
  if (C.clip !== C.name.replace(/^(Adult|Heavy|Thin|Child|Elder)_/, '')) fails.push(`record: clip ${C.clip} != the name without its body`);
  if (!base.includes(`_${C.group}_`) && !base.startsWith(`${C.group}_`)) fails.push(`record: group ${C.group} not in the name`);
  if (C.loop !== /_Loop_v/.test(base)) fails.push('record: loop does not match _Loop / _Once');
  for (const k of ['name', 'clip', 'group', 'frames', 'base', 'style', 'needs', 'keys']) if (C[k] == null) fails.push(`record: no ${k}`);
  if (C.style !== 'kaiships') fails.push(`record: style ${C.style} (the kit's dose is 'kaiships')`);
  if (!BASES[C.base] || (C.end && !BASES[C.end])) fails.push(`record: base ${C.base} / end ${C.end} is not a standard pose (${Object.keys(BASES)})`);
  if (C.keys[0].f !== 0 || C.keys[C.keys.length - 1].f !== C.frames) fails.push(`record: keys must run 0..frames (${C.keys[0].f}..${C.keys[C.keys.length - 1].f} vs ${C.frames})`);
  const bodies = C.body ? [C.body] : ['adult'], B = bodies[0];
  // loop seam: the last key is the first, moved on by the loop's advance
  const F = full(C.keys);
  if (C.loop) {
    const a = { ...F[0] }, b = { ...F[F.length - 1] };
    for (const n of Object.keys(b)) if (C.advance && (n === 'pos.0' || /^leg[LR]\.footW\.0$/.test(n))) b[n] -= C.advance;
    const d = diff(a, b); if (d) fails.push(`loop seam: ${d.n} differs by ${d.d}`);
    if (JSON.stringify(C.keys[0].cycle || null) !== JSON.stringify(C.keys[C.keys.length - 1].cycle || null)) fails.push('loop seam: the first and last key cycle differently');
  }
  // standard poses: a one-off starts on its base and ends on its end; a travelling loop's first and closing steps too
  const ends = C.loop ? (C.advance ? [[full(C.intro)[0], C.base], [full([...C.keys, ...C.outro])[C.keys.length + C.outro.length - 1], C.end || C.base]] : [])
    : [[F[0], C.base], [F[F.length - 1], C.end || C.base]];
  for (const [i, [m, nm]] of ends.entries()) {
    // a clip that turns ends on its standard pose facing the new way (the pose turned with the root)
    const yw = (m.yaw ?? 90) - 90, ref = flatten(Math.abs(yw) > 1e-6 ? turned(BASES[nm](B, 0), yw, [m['pos.0'] || 0, m['pos.1'] || 0]) : BASES[nm](B, m['pos.0'] || 0)), d = diff(body(m, ref), body(ref, ref));
    if (d) fails.push(`${i ? 'ends' : 'starts'} off ${nm}: ${d.n} differs by ${d.d}`);
  }
  // playback with the dose: the joint gate, planted feet, flights
  const key = C.advance ? { f: 0, clip: C.clip, body: B, to: [C.introTravel + C.outroTravel + 2 * C.advance, 0] } : { f: 0, clip: C.clip, body: B, ...(C.loop ? { times: 2 } : {}) };
  const placed = placeClip(key, { pos: [0, 0], yaw: 90 }), keys = placed.keys, last = keys[keys.length - 1].f;
  const track = compileTrack(keys, {}, { pos: [0, 0], yaw: 90 }, 'kaiships'), fr = playActor(track, 0, last + 10);
  let jMax = 0, jAt = null, slide = 0, slideAt = null; const over = [];
  for (let f = 1; f < fr.length; f++) {
    const p = fr[f - 1], q = fr[f];
    // a foot in the air hangs off its shin: its pitch is a world angle that turns with the leg, not a joint, so it is not
    // gated while the foot is up (the ankle's own bend is the rig's: ROM.ankleDF); the solved joints below catch a pop
    const airborne = n => { const m = /^leg([LR])\.pitch$/.exec(n); return m && Math.max(q[`leg${m[1]}.footW.2`] ?? 0, p[`leg${m[1]}.footW.2`] ?? 0) > 0.005; };
    // captured frames (C.captured, clip frames) are a real body's own speeds: a run's knee or a jump's arm swing turns
    // 30-50 deg a frame at 30 fps. They are measured (jointMax) but not gated; the frames the library makes around them
    // (first and closing steps, the blend from and to the standard pose) are
    // (one span [a, b] or a list of them: a gait's captured start, cycles and stop, the seams between them the library's)
    const cap = C.captured && (Array.isArray(C.captured[0]) ? C.captured : [C.captured]).some(([a, b]) => f > a && f <= b);
    if (!cap) for (const n of Object.keys(q)) if (ANGLE.test(n) && n in p && !airborne(n)) { const d = Math.abs(q[n] - p[n]); if (d > jMax) { jMax = d; jAt = `${f} ${n}`; } if (d > JOINT_MAX) over.push(f); }
    // a hand on an ik target: the target's travel against the arm's length, as an angle
    if (!cap) for (const s of ['L', 'R']) if (`arm${s}.ik.0` in q && (q[`arm${s}.ikw`] ?? 1) > 0.5) {
      const d = Math.hypot(...[0, 1, 2].map(i => q[`arm${s}.ik.${i}`] - p[`arm${s}.ik.${i}`])) / ARM_W * 180 / Math.PI;
      if (d > jMax) { jMax = d; jAt = `${f} arm${s}.ik`; } if (d > JOINT_MAX) over.push(f); }
    for (const s of ['L', 'R']) { const z0 = p[`leg${s}.footW.2`], z1 = q[`leg${s}.footW.2`]; if (z0 == null || z0 > 0.005 || z1 > 0.005) continue;
      const d = 1000 * Math.hypot(q[`leg${s}.footW.0`] - p[`leg${s}.footW.0`], q[`leg${s}.footW.1`] - p[`leg${s}.footW.1`]); if (d > slide) { slide = d; slideAt = `${f} ${s}`; } }
  }
  if (jMax > JOINT_MAX) fails.push(`joint gate: ${jMax.toFixed(1)} deg/f at ${jAt} (max ${JOINT_MAX}); frames ${[...new Set(over)].slice(0, 8).join(' ')}`);
  if (slide > SLIDE_MM) fails.push(`planted foot slides ${slide.toFixed(2)} mm/f at ${slideAt}`);
  const fl = track.flights || [];
  Object.assign(info, { frames: last, jointMax: +jMax.toFixed(1), jointAt: jAt, slideMm: +slide.toFixed(2), flights: fl.length,
    peakCm: fl.length ? +(100 * Math.max(...fl.map(x => 9.8 * ((x.f1 - x.f0) / 30) ** 2 / 8))).toFixed(1) : 0,
    carryKg: Math.max(0, ...keys.map(k => Math.max(k.x_kgR || 0, k.x_kgL || 0, k.x_kgB || 0))), fit: +placed.fit.toFixed(3), cycles: placed.n });
  return { fails, info };
}
// ------------------------------------------------------------------ the rig, headless (no browser: CI runs this)
// cast.js builds its textures on 2D canvases; here they are no-op canvases, so the figure's solve (contact, balance,
// carried props) runs exactly as on the page and only drawing is skipped
let RIG = null;
async function rig() {
  if (RIG) return RIG;
  if (!globalThis.document) {
    const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (t[k] = k === 'measureText' ? () => ({ width: 10 }) : /^create(Linear|Radial)Gradient$|^createPattern$/.test(String(k)) ? () => ({ addColorStop() {} })
      : k === 'getImageData' ? (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => {})), set: (t, k, v) => { t[k] = v; return true; } });
    const canvas = () => ({ width: 1, height: 1, style: {}, getContext: () => ctx, addEventListener() {}, toDataURL: () => '' });
    globalThis.document = { createElement: canvas, createElementNS: canvas };
  }
  const cast = await import('../engine/cast.js'), body = await import('../engine/body.js'), { toPose } = await import('../engine/motion.js');
  await import('../motion-lib/props.js'); const { bodySpec } = await import('../motion-lib/bodies.js');
  return (RIG = { cast, PHYS: body.PHYS, toPose, bodySpec });
}
// a figure built by cast.js (headless), for tests: { S, PHYS, toPose }
export async function rigStick(body = 'adult') { const R = await rig(); return { S: R.cast.makeStick(R.bodySpec({ ...R.cast.GUARD, hair: [] }, body)), PHYS: R.PHYS, toPose: R.toPose }; }
export const GRIP_CM = 2, PROP_CM = 1;
// one clip through the real rig, physics on: the hand off its target while it grips (shot.mjs (h)) and a held prop
// inside the body after the solve ((i)), per frame
export async function rigClip(C, body = C.body || 'adult', { phys = true } = {}) {
  const R = await rig(), S = R.cast.makeStick(R.bodySpec({ ...R.cast.GUARD, hair: [] }, body)), was = R.PHYS.on; R.PHYS.on = phys;
  const key = C.advance ? { f: 0, clip: C.clip, body, to: [C.introTravel + C.outroTravel + 2 * C.advance, 0] } : { f: 0, clip: C.clip, body, ...(C.loop ? { times: 2 } : {}) };
  const keys = placeClip(key, { pos: [0, 0], yaw: 90 }).keys, fr = playActor(compileTrack(keys, {}, { pos: [0, 0], yaw: 90 }, 'kaiships'), 0, keys[keys.length - 1].f + 6);
  const o = { grip: 0, gripAt: null, prop0: 0, prop: 0, propAt: null, over: [], joint: 0, jointAt: null };
  // the solved joints' largest change a frame (shot.mjs "largest one-frame joint change"): flexes and limb directions
  const SEG = [['shoulder', 'elbow'], ['elbow', 'hand'], ['hip', 'knee'], ['knee', 'ankle']], dir = (a, b) => { const v = b.map((x, i) => x - a[i]), l = Math.hypot(...v) || 1; return v.map(x => x / l); };
  let last = null;
  try {
    fr.forEach((m, f) => {
      S.pose2(R.toPose(m, S.root.scale.x)); const w = S.rigWorld();
      if (last) for (const s of ['L', 'R']) {
        for (const k of ['kneeFlex', 'elbowFlex']) { const d = Math.abs(w[s][k] - last[s][k]); if (d > o.joint) { o.joint = +d.toFixed(1); o.jointAt = `${f} ${k}${s}`; } }
        for (const [a, b] of SEG) { const u = dir(last[s][a], last[s][b]), v = dir(w[s][a], w[s][b]), d = Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2]))) * 180 / Math.PI;
          if (d > o.joint) { o.joint = +d.toFixed(1); o.jointAt = `${f} ${a}-${b}${s}`; } }
      }
      last = w;
      for (const s of ['L', 'R']) if (w[s].grip && w[s].targetGapCm > o.grip) { o.grip = w[s].targetGapCm; o.gripAt = `${f} ${s}`; }
      for (const s of ['L', 'R']) if (w[s].grip && w[s].targetGapCm > GRIP_CM) o.over.push(f);
      o.prop0 = Math.max(o.prop0, w.propPenCm0 || 0); if ((w.propPenCm || 0) > o.prop) { o.prop = w.propPenCm; o.propAt = f; }
    });
  } finally { R.PHYS.on = was; }
  return o;
}
export async function checkAll() {
  const files = clipFiles(), rows = [], listed = new Set();
  for (const f of files) {
    const C = (await import(path.join(LIB, f))).default;
    if (!ALL.includes(C)) rows.push({ file: f, fails: ['index: index.js does not import this file'], info: {} });
    else {
      listed.add(C); const r = checkClip(C, f), g = await rigClip(C);
      if (g.grip > GRIP_CM) r.fails.push(`rig: a gripping hand is ${g.grip} cm off its target at ${g.gripAt} (max ${GRIP_CM}; frames ${[...new Set(g.over)].slice(0, 8).join(' ')})`);
      if (g.prop > PROP_CM) r.fails.push(`rig: a held prop is ${g.prop} cm inside the body at frame ${g.propAt} (max ${PROP_CM})`);
      Object.assign(r.info, { gripCm: g.grip, propCm0: g.prop0, propCm: g.prop, rigJoint: g.joint, rigJointAt: g.jointAt });
      rows.push({ file: f, name: C.name, ...r });
    }
  }
  for (const C of ALL) if (!listed.has(C)) rows.push({ file: C.name, fails: ['index: listed in index.js but no file'], info: {} });
  return rows;
}

// --------------------------------------------------------------- renders (motion-lib/proof, one process at a time)
const SHOT = path.join(HERE, 'shot.mjs'), PAGE = 'styles/stick-man/motion-lib/proof';
const shot = args => { const r = run('node', [SHOT, '--film', PAGE, ...args], { capture: true }); if (r.status) throw new Error(`shot.mjs ${args.join(' ')}\n${r.stderr || r.stdout}`); return r.stdout || ''; };
const clipBodies = C => (C.body ? [C.body] : ['adult']);
function lastFrame(C, body) {
  const key = C.advance ? { f: 6, clip: C.clip, body, to: [C.introTravel + C.outroTravel + 2 * C.advance, 0] } : { f: 6, clip: C.clip, body, ...(C.loop ? { times: 2 } : {}) };
  const k = placeClip(key, { pos: [0, 0], yaw: 90 }).keys; return k[k.length - 1].f + 12;
}
function silence(dir, sec) { const w = path.join(dir, 'silence.wav'); if (!fs.existsSync(w)) run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', String(sec), w]); return w; }
export function sheet(group, out) {
  const clips = ALL.filter(c => c.group === group); if (!clips.length) throw new Error(`no clips in group ${group}`);
  fs.mkdirSync(out, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'motionlib-sheet-')), rows = [];
  for (const C of clips) for (const b of clipBodies(C)) {
    const L = lastFrame(C, b), fs6 = Array.from({ length: 6 }, (_, i) => Math.round(6 + (L - 12 - 6) * i / 5));
    shot(['--w', '540', '--h', '960', '--query', `clip=${C.clip}&body=${b}`, '--frames', fs6.join(','), '--out', path.join(tmp, `${C.name}_%d.jpg`)]);
    rows.push({ label: C.name, files: fs6.map(f => path.join(tmp, `${C.name}_${f}.jpg`)), frames: fs6 });
  }
  const spec = path.join(tmp, 'sheet.json'), dst = path.join(out, `sheet_${group}.jpg`);
  fs.writeFileSync(spec, JSON.stringify({ rows, out: dst, title: `motion-lib · ${group}` }));
  const py = run('python', [path.join(HERE, 'motionlib_sheet.py'), spec], { capture: true }); if (py.status) throw new Error(py.stderr);
  fs.rmSync(tmp, { recursive: true, force: true });
  return dst;
}
export function proof(out, only) {
  fs.mkdirSync(out, { recursive: true });
  const wav = silence(out, 20), lines = [];
  for (const C of ALL) for (const b of clipBodies(C)) {
    if (only && C.clip !== only && C.name !== only) continue;
    const L = lastFrame(C, b), tag = C.name;
    for (const ph of ['1', '0']) {
      const q = `clip=${C.clip}&body=${b}&phys=${ph}`, mp4 = path.join(out, `${tag}_phys${ph}.mp4`), rep = path.join(out, `${tag}_phys${ph}.txt`);
      shot(['--frames', `0-${L}`, '--w', '540', '--h', '960', '--query', q, '--mp4', mp4, '--audio', wav]);
      shot(['--frames', `0-${L}`, '--w', '540', '--h', '960', '--query', q, '--report', rep, '--in', mp4, '--fast', '1']);
      lines.push(`${tag} phys ${ph}: ${mp4}`);
      process.stdout.write(`${tag} phys=${ph} done\n`);
    }
  }
  if (!only) for (const g of GROUPS) if (ALL.some(c => c.group === g)) lines.push(sheet(g, out));
  return lines;
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
  if (A.sheet) console.log(sheet(A.sheet, path.resolve(A.out || '.')));
  else if (A.proof) console.log(proof(path.resolve(A.proof), A.only).join('\n'));
  else {
    const rows = await checkAll(); let bad = 0;
    for (const r of rows) {
      const i = r.info, num = i.frames != null ? `  ${i.frames} f, joint ${i.jointMax} deg/f, slide ${i.slideMm} mm/f, flights ${i.flights}${i.flights ? ` (peak ${i.peakCm} cm, g 9.8)` : ''}${i.carryKg ? `, carries ${i.carryKg} kg` : ''}, rig: grip ${i.gripCm} cm, prop ${i.propCm0}>${i.propCm} cm, solved joint ${i.rigJoint} deg/f (${i.rigJointAt}; not gated: rig K6/K9)` : '';
      console.log(`${r.fails.length ? 'FAIL' : 'PASS'}  ${r.name || r.file}${num}`); for (const f of r.fails) console.log(`      ${f}`); bad += !!r.fails.length;
    }
    console.log(`${rows.length} clips, ${bad} failing`); process.exit(bad ? 1 : 0);
  }
}
