// Three automatic checks on a stick-man film, read from every frame of the real page (render.mjs --dbg):
//   1. joints    no joint snaps (turns more than POP deg in one frame) and no arm or leg passes through the body, where the
//                camera sees it; cuts are not counted (a new shot may start in any pose)
//   2. feet      a foot planted on the floor does not slide (more than SLIDE px a frame at 720 wide, where the camera sees it)
//   3. captions  every spoken word is captioned while it is said, each caption stays up long enough to read (READ frames),
//                and no caption is wider than the frame's safe width
//   node styles/stick-man/tools/pack/check.mjs films/<name>            (renders the data first when reel.js or the words changed)
// Exit 1 when a check fails; each fault names the frame, so you can look at it: render.mjs --frames <f>.
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { jointSteps } from '../gates/jointstep.mjs';
import { chunkWords } from '../../engine/captions.js';

export const POP = 40, WARN_POP = 25, PEN_CM = 3, SLIDE = 2, READ = 8;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

// joints: [{ who, f, what, deg }] snaps and limbs in the body
export function jointFaults(rows) {
  const out = [], warn = [];
  for (let i = 1; i < rows.length; i++) {
    const p = rows[i - 1], q = rows[i]; if (q.motion?.cut || q.f !== p.f + 1) continue;
    for (const [who, a] of Object.entries(q.actors)) {
      const b = p.actors[who]; if (!a.inFrame || !a.limbs || !b?.limbs) continue;
      const [k, d] = jointSteps(b.limbs, a.limbs).reduce((m, x) => (x[1] > m[1] ? x : m), ['', 0]);
      if (d > POP) out.push({ who, f: q.f, what: `${k} turns ${d.toFixed(0)} deg in one frame` });
      else if (d > WARN_POP) warn.push({ who, f: q.f, what: `${k} ${d.toFixed(0)} deg/f` });
      for (const s of ['L', 'R']) { const cm = a.limbs[s]?.penCm ?? 0; if (cm > PEN_CM) out.push({ who, f: q.f, what: `${s === 'L' ? 'left' : 'right'} limb ${cm.toFixed(1)} cm inside the body` }); }
    }
  }
  return { out, warn };
}
// feet: a planted foot that slides on screen
export function footFaults(rows) {
  const out = [];
  for (const r of rows) {
    if (r.motion?.cut) continue;
    for (const [who, ft] of Object.entries(r.motion?.feet || {})) {
      if (!r.actors[who]?.inFrame) continue;
      for (const s of ['L', 'R']) if (ft[s]?.planted && ft[s].px > SLIDE) out.push({ who, f: r.f, what: `${s === 'L' ? 'left' : 'right'} foot slides ${ft[s].px.toFixed(1)} px` });
    }
  }
  return out;
}
// captions: words never shown, captions too short to read, text too wide
export function captionFaults(rows, words, lines, fps = 30) {
  const out = [], shown = new Map(rows.map(r => [r.f, r.caption || '']));
  const norm = s => s.toLowerCase().replace(/[^a-z0-9']/g, '');
  for (const w of words) {
    if (!lines.includes(w.line) || !norm(w.word)) continue;
    const a = Math.floor(w.t0 * fps), b = Math.max(a, Math.ceil(w.t1 * fps) - 1);
    const seen = [...Array(b - a + 1).keys()].some(i => shown.has(a + i) && shown.get(a + i).split(/\s+/).map(norm).includes(norm(w.word)));
    const inRange = [...Array(b - a + 1).keys()].some(i => shown.has(a + i));
    if (inRange && !seen) out.push({ who: 'captions', f: a, what: `"${w.word}" (${w.line}) is not on screen while it is said` });
  }
  let run = null;
  const flush = end => { if (run && end - run.f < READ) out.push({ who: 'captions', f: run.f, what: `"${run.text}" is up ${end - run.f} frames (under ${READ}: too fast to read)` }); };
  for (const r of rows) { const t = r.caption || ''; if (t !== run?.text) { flush(r.f); run = t ? { f: r.f, text: t } : null; } }
  for (const c of chunkWords(words, lines, 'word')) if (c.text.length > 22) out.push({ who: 'captions', f: Math.round(c.t0 * fps), what: `"${c.text}" is ${c.text.length} characters (keep a caption under 22)` });
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const film = process.argv[2]?.replace(/\/$/, '');
  if (!film) { console.error('usage: node styles/stick-man/tools/pack/check.mjs films/<name>'); process.exit(2); }
  const dir = path.join(ROOT, film), data = path.join(dir, 'review', 'frames.jsonl');
  const stamp = f => fs.existsSync(f) ? fs.statSync(f).mtimeMs : 0;
  if (stamp(data) < Math.max(...['reel.js', 'storyboard.json', 'vo/words.json'].map(f => stamp(path.join(dir, f))))) {
    console.log('reading every frame of the film (render.mjs --dbg) ...');
    const r = spawnSync(process.execPath, [path.join(ROOT, 'styles/stick-man/tools/pack/render.mjs'), '--film', film, '--dbg', data], { cwd: ROOT, stdio: 'inherit' });
    if (r.status) process.exit(1);
  }
  const rows = fs.readFileSync(data, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const words = JSON.parse(fs.readFileSync(path.join(dir, 'vo', 'words.json'), 'utf8'));
  // (reel.js imports by site path, so it loads only in the page: the spoken lines come from vo/script.json)
  const lines = JSON.parse(fs.readFileSync(path.join(dir, 'vo', 'script.json'), 'utf8')).lines.map(l => l.id);
  const J = jointFaults(rows), checks = [['joints', J.out], ['feet', footFaults(rows)], ['captions', captionFaults(rows, words, lines)]];
  let bad = 0;
  for (const [name, list] of checks) {
    console.log(`${list.length ? '✗' : '✓'} ${name}: ${list.length ? `${list.length} fault(s)` : 'clean'}`);
    const seen = new Set();
    for (const x of list) { const k = `${x.who} ${x.what.replace(/[\d.]+/g, '#')}`; if (seen.has(k) && seen.size > 12) continue; seen.add(k); console.log(`    frame ${x.f}  ${x.who}: ${x.what}`); }
    bad += list.length;
  }
  if (J.warn.length) console.log(`  (note: ${J.warn.length} frame(s) where a joint turns ${WARN_POP}-${POP} deg in a frame: fast, but not a snap; first at frame ${J.warn[0].f})`);
  fs.writeFileSync(path.join(dir, 'review', 'check.json'), JSON.stringify({ when: new Date().toISOString(), frames: rows.length, ...Object.fromEntries(checks) }, null, 1));
  process.exit(bad ? 1 : 0);
}
