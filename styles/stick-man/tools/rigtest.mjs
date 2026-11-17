// The rig test (QA area A2: "body and head keep shape in every pose"): every motion-library clip through the real rig
// (cast.js, headless, physics on, the same playback the motionlib.mjs gate uses), and per frame the head's shape, the
// bones' lengths and the knee and elbow flex against the rest pose. Kai 14/11 (S3-011, S3-012: "tự nhiên cái đầu thành
// cái gì đây?", a run with the head drawn as a tall thin ellipse) and 12/11 (S2-004, S2-010: bodies that do not read as a person).
//   node styles/stick-man/tools/rigtest.mjs                 every clip: one line each, exit 1 on a fault RIG_KNOWN does not list
//   node styles/stick-man/tools/rigtest.mjs --json <file>   the same, with every clip's numbers and worst frames
//   node styles/stick-man/tools/rigtest.mjs --sheet <dir>   plus the rig sheet: each clip's worst key pose seen from the
//        front, 3/4, side and back (motion-lib/proof &view=turn), one render at a time, 360x640 tiles -> <dir>/rig-sheet.jpg
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { run } from '../../../kit/env.mjs';
import { ALL } from '../motion-lib/index.js';
import { rigClip } from './motionlib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
// Limits, each with its source:
//   HEAD_PCT   the head's height-to-width ratio against the rest head, in %, for a head that does not keep its volume.
//              Judgement: a round head that turns a few percent oval reads as squashed on a still (S3-011).
//   HEAD_SQUASH_PCT  the same ratio while the head keeps its volume (x*y*z within HEAD_VOL_TOL of the clip's first frame; a body's head is not
//              always scale 1, the child's is 1.3): the engine's own
//              squash and stretch (motion.js headSq), intended motion. Kai chose this on 17/11 (option B): "it is one
//              frame; at real playback nobody notices".
//   HEAD_VOL_TOL  1 %: the measured squash keeps x*y*z at 1.000, so 1 % only absorbs float noise.
//   BONE_PCT   a bone's length against its rest length, in %. Kit: cast.js lets an arm stretch at most 3 % (ARM_STRETCH).
//   FLEX_MAX   knee and elbow flex, degrees (0 = straight). Inferred: a human knee or elbow folds to about 150-160 deg.
//   FLEX_MIN   a joint bent backward (hyperextended), degrees.
export const HEAD_PCT = 5, HEAD_SQUASH_PCT = 15, HEAD_VOL_TOL = 0.01, BONE_PCT = 3, FLEX_MAX = 160, FLEX_MIN = -2;
// Clips over a limit on main 17/11 (all leg stretch, until the leg-reach kit PR lands), each with how far over it is per metric (head and bone: percentage points; flex:
// degrees).
export const RIG_KNOWN = {
  Adult_Idle_Sleep_Loop: { bone: 0.3 },
  Adult_Trans_GetUp_Once: { bone: 0.3 },
  Adult_Trans_JumpWindow_Once: { bone: 8.4 },
  Heavy_Move_Run_Fwd_Loop: { bone: 1.4 },
  Act_DropInTrunk_Once: { bone: 2.6 },
  Act_PushBagOutWindow_Once: { bone: 2.4 },
};
const METRICS = ['head', 'bone', 'flex'];
const BONES = [['upper', 'shoulder', 'elbow'], ['fore', 'elbow', 'hand'], ['thigh', 'hip', 'knee'], ['shin', 'knee', 'ankle']];
// one frame's head scale: how far off round it is (%), whether it keeps the rest volume, the limit that applies
export function headShape({ x, y, z }, restVol = 1) {
  const pct = 100 * Math.abs(y / x - 1), kept = Math.abs(x * y * z / restVol - 1) <= HEAD_VOL_TOL, limit = kept ? HEAD_SQUASH_PCT : HEAD_PCT;
  return { pct, kept, limit, over: pct - limit };
}
const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// one clip: the worst frame of each metric over every frame; the pose the sheet shows
export async function measure(C, body = C.body || 'adult') {
  let rest = null, restVol = null, keyFrames = [];
  const worst = { head: { v: 0, f: null, limit: HEAD_PCT, kept: true, o: -Infinity }, bone: { v: 0, f: null, what: '' }, flex: { v: 0, f: null, what: '' } };
  const perFrame = [];
  await rigClip(C, body, { each: (f, S, w, keys) => {
    if (!keyFrames.length) keyFrames = [...new Set(keys.map(k => k.f))];
    const h = S.parts.head.parent.scale, len = Object.fromEntries(['L', 'R'].flatMap(s => BONES.map(([n, a, b]) => [`${n}${s}`, d3(w[s][a], w[s][b])])));
    rest ||= len;
    restVol ??= h.x * h.y * h.z;
    const hs = headShape(h, restVol), head = hs.pct;
    let bone = 0, boneWhat = ''; for (const [k, v] of Object.entries(len)) { const p = 100 * Math.abs(v / rest[k] - 1); if (p > bone) { bone = p; boneWhat = k; } }
    let flex = 0, flexWhat = '';
    for (const s of ['L', 'R']) for (const [j, v] of [['knee', w[s].kneeFlex], ['elbow', w[s].elbowFlex]]) {
      const over = Math.max(v - FLEX_MAX, FLEX_MIN - v, 0); if (over > flex) { flex = over; flexWhat = `${j}${s} ${v.toFixed(0)} deg`; }
    }
    perFrame.push({ f, head, bone, flex });
    if (hs.over > worst.head.o) worst.head = { v: head, f, limit: hs.limit, kept: hs.kept, o: hs.over };
    if (bone > worst.bone.v) worst.bone = { v: bone, f, what: boneWhat };
    if (flex > worst.flex.v) worst.flex = { v: flex, f, what: flexWhat };
  } });
  const r1 = x => Math.round(x * 10) / 10, over = { head: Math.max(0, r1(r1(worst.head.v) - worst.head.limit)), bone: Math.max(0, r1(r1(worst.bone.v) - BONE_PCT)), flex: r1(worst.flex.v) };
  const faults = [];
  if (over.head > 0) faults.push(`head ${worst.head.v.toFixed(1)} % off round at f ${worst.head.f} (max ${worst.head.limit} %, volume ${worst.head.kept ? 'kept' : 'not kept'})`);
  if (over.bone > 0) faults.push(`${worst.bone.what} ${worst.bone.v.toFixed(1)} % off its length at f ${worst.bone.f} (max ${BONE_PCT} %)`);
  if (over.flex > 0) faults.push(`${worst.flex.what} at f ${worst.flex.f} (allowed ${FLEX_MIN}..${FLEX_MAX})`);
  const pick = sheetFrame(worst, perFrame, keyFrames);
  return { name: C.name, clip: C.clip, body, frames: perFrame.length, keys: keyFrames.length, worst, over, faults, pick,
    head: +worst.head.v.toFixed(2), bone: +worst.bone.v.toFixed(2), flex: +worst.flex.v.toFixed(1) };
}

// the frame the rig sheet shows: the worst frame of the metric furthest over its limit, else the key pose furthest from rest
const share = { head: v => v / HEAD_PCT, bone: v => v / BONE_PCT, flex: v => v };
function sheetFrame(worst, perFrame, keyFrames) {
  const sw = (m, w) => m === 'head' ? w.v / w.limit : share[m](w.v);
  const [m, w] = Object.entries(worst).sort(([a, x], [b, y]) => sw(b, y) - sw(a, x))[0];
  if (sw(m, w) > 1 || m === 'flex' && w.v > 0) return w.f;
  const score = r => share.head(r.head) + share.bone(r.bone) + share.flex(r.flex);
  return perFrame.filter(r => keyFrames.includes(r.f)).sort((a, b) => score(b) - score(a))[0]?.f ?? 0;
}

// the RIG_KNOWN verdict for one measured clip: [] when it passes
export function knownFails(r, known = RIG_KNOWN) {
  const k = known[r.name];
  if (!r.faults.length) return k ? [`${r.name}: passes clean but RIG_KNOWN lists it (fixed: delete the row)`] : [];
  const grew = METRICS.filter(m => r.over[m] > (k?.[m] ?? 0));
  return grew.length ? [`${r.name}: ${grew.map(m => `${m} ${r.over[m]} over its limit${k?.[m] ? ` (RIG_KNOWN allows ${k[m]})` : ''}`).join(', ')} · ${r.faults.join('; ')}`] : [];
}

export async function measureAll() {
  const out = []; for (const C of ALL) out.push(await measure(C)); return out;
}

const VIEWS = [['front', 0], ['3/4', 45], ['side', 90], ['back', 180]];
const shot = args => { const r = run('node', [path.join(HERE, 'shot.mjs'), '--film', 'styles/stick-man/motion-lib/proof', ...args], { capture: true });
  if (r.status) throw new Error(`shot.mjs ${args.join(' ')}\n${r.stderr || r.stdout}`); };
const PROOF_F0 = 6;
export function sheet(rows, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rigtest-')), cells = [];
  for (const r of rows) {
    const f = r.pick + PROOF_F0, files = [];
    for (const [v, az] of VIEWS) {
      const file = path.join(tmp, `${r.name}_${az}_%d.jpg`);
      shot(['--w', '360', '--h', '640', '--query', `clip=${r.clip}&body=${r.body}&view=turn&az=${az}&at=${f}`, '--frames', String(f), '--out', file]);
      files.push(file.replace('%d', String(f)));
    }
    cells.push({ label: `${r.name} f${r.pick}`, sub: `head ${r.head} % · bone ${r.bone} % · flex +${r.flex}`, bad: r.faults.length > 0, files, tags: VIEWS.map(v => v[0]) });
    process.stdout.write(`sheet ${r.name} done\n`);
  }
  const spec = path.join(tmp, 'sheet.json'), out = path.join(dir, 'rig-sheet.jpg');
  fs.writeFileSync(spec, JSON.stringify({ grid: cells, cols: 3, tile: [150, 266], out,
    title: `rig sheet · ${rows.length} clips · worst key pose, front / 3-4 / side / back · red = over a limit (head ${HEAD_PCT} %, ${HEAD_SQUASH_PCT} % volume kept, bone ${BONE_PCT} %, flex ${FLEX_MIN}..${FLEX_MAX})` }));
  const py = run('python', [path.join(HERE, 'motionlib_sheet.py'), spec], { capture: true }); if (py.status) throw new Error(py.stderr);
  fs.rmSync(tmp, { recursive: true, force: true });
  return out;
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
  const rows = await measureAll(), fails = rows.flatMap(r => knownFails(r));
  for (const r of rows) console.log(`${r.faults.length ? (RIG_KNOWN[r.name] ? 'KNOWN' : 'FAIL ') : 'ok   '} ${r.name.padEnd(34)} head ${r.head.toFixed(1).padStart(5)} % (f ${r.worst.head.f})  bone ${r.bone.toFixed(1).padStart(5)} % ${r.worst.bone.what} (f ${r.worst.bone.f})  flex +${r.flex}${r.faults.length ? '  · ' + r.faults.join('; ') : ''}`);
  if (A.json) fs.writeFileSync(path.resolve(A.json), JSON.stringify({ limits: { HEAD_PCT, HEAD_SQUASH_PCT, HEAD_VOL_TOL, BONE_PCT, FLEX_MIN, FLEX_MAX }, rows }, null, 1) + '\n');
  if (A.sheet) console.log(sheet(rows, path.resolve(A.sheet)));
  console.log(`rig test: ${rows.length} clips, ${rows.filter(r => r.faults.length).length} over a limit, ${fails.length} not in RIG_KNOWN${fails.length ? '\n' + fails.join('\n') : ''}`);
  process.exit(fails.length ? 1 : 0);
}
