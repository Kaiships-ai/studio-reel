// Gates for a stick-man reel: reads the shot.mjs report and measures the mp4 (loudness, colour), prints PASS/FAIL
// per gate and exits 1 on any FAIL. Thresholds and their sources: .claude/skills/make-reel-stick-man/GATES.md.
// Never loosen a threshold to make a reel pass: fix the reel, or ask Kai.
//   node styles/stick-man/tools/gates.mjs --report films/x/review/x-stats.txt --in films/x/renders/x.mp4 [--out films/x/review/x-gates.txt]
//     [--film films/x [--dbg films/x/review/x-dbg.jsonl]]
// The report comes from: node styles/stick-man/tools/shot.mjs --film films/x --frames 0-<last> --report <stats.txt> --in <mp4>
// --film adds the story gates (storyboard.json against __dbg: duration, sets, shot variety, props / fx use and presence,
// and the judged board verdict review/board-verdict.json). Without --dbg it runs shot.mjs --dbg itself (~1 min).
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { run } from '../../../kit/env.mjs';

const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
if (!A.report || !A.in) { console.error('usage: gates.mjs --report <stats.txt> --in <reel.mp4> [--out <gates.txt>]'); process.exit(2); }
for (const f of [A.report, A.in]) if (!fs.existsSync(f)) { console.error(`missing ${f}`); process.exit(2); }
const R = fs.readFileSync(A.report, 'utf8');

const G = [];                                             // [name, value text, pass, threshold text]
const gate = (name, ok, got, want) => G.push([name, got, ok, want]);
const num = (re, s = R) => { const m = re.exec(s); return m ? Number(m[1]) : null; };
const missing = name => gate(name, false, 'not in report', 're-run shot.mjs --report with --in and --frames');

// (a) clear and still frames
const clear = num(/clear \(>= 1\.0\) \d+\s+([\d.]+) %/), still = num(/still \(< 0\.2\) \d+\s+([\d.]+) %/);
clear == null ? missing('clear frames') : gate('clear frames', clear >= 94, `${clear} %`, '>= 94 %');
still == null ? missing('still frames') : gate('still frames', still < 1, `${still} %`, '< 1 %');

// (b) camera speed
const cam = /camera speed at 720p: peak ([\d.]+) px\/frame \(frame (\d+)\)/.exec(R);
cam ? gate('camera speed', Number(cam[1]) <= 25, `${cam[1]} px/f (frame ${cam[2]})`, '<= 25 px/f at 720p') : missing('camera speed');

// per actor: frozen run, arm ratio, joint change, head cut
const actors = [...R.matchAll(/^ {4}(\w+): blinks[^\n]*\n([\s\S]*?)(?=^ {4}\w+: blinks|^ {4}largest figure|^\(d\))/gm)];
if (!actors.length) missing('acting (per actor)');
const worst = (key, pick) => { let w = null; for (const [, n, body] of actors) { const v = pick(body); if (v && (!w || v.v > w.v)) w = { ...v, n }; } return w; };
const frozen = worst('frozen', b => { const m = /longest frozen run (\d+) frames(?: \(ends (\d+)\))?/.exec(b); return m && { v: +m[1], at: m[2] }; });
const ratio = worst('ratio', b => { const m = /largest arm length ratio ([\d.]+)(?: \(frame (\d+)\))?/.exec(b); return m && { v: +m[1], at: m[2] }; });
const joint = worst('joint', b => { const m = /largest one-frame joint change ([\d.]+) deg(?: \(frame (\d+), ([^)]+)\))?/.exec(b); return m && { v: +m[1], at: m[2] && `${m[2]}, ${m[3]}` }; });
const perActor = (label, w, limit, unit, want) => {
  if (!w) return missing(label);
  const bad = actors.map(([, n, b]) => [n, b]).filter(([, b]) => { const v = label === 'frozen run' ? num(/longest frozen run (\d+)/, b)
    : label === 'arm length ratio' ? num(/arm length ratio ([\d.]+)/, b) : num(/joint change ([\d.]+) deg/, b); return v > limit; }).map(([n]) => n);
  // joint change: the worst actor's five worst frames, so one fix round can take them all
  const top = label === 'joint change' ? /joint change top 5: ([^\n]*); frames over/.exec(actors.find(([, n]) => n === w.n)?.[2] || '')?.[1] : null;
  gate(label, w.v <= limit, `${w.v}${unit} (${w.n}${w.at ? ', frame ' + w.at : ''})${bad.length ? '; over: ' + bad.join(', ') : ''}${top && w.v > limit ? '; top 5: ' + top : ''}`, want);
};
if (actors.length) {
  perActor('frozen run', frozen, 8, ' f', '<= 8 f');
  perActor('arm length ratio', ratio, 1.03, '', '<= 1.03');
  perActor('joint change', joint, 25, ' deg', '<= 25 deg/f');
  const cut = actors.filter(([, , b]) => !/head cut by the top edge: never/.test(b)).map(([, n, b]) => `${n} ${/head cut by the top edge: (.*)/.exec(b)?.[1]}`);
  gate('head never cut', !cut.length, cut.length ? cut.join('; ') : 'never', 'never');
}

// small figures
const small = /largest figure under 30 % of frame height in ([\d-]+): longest run (\d+) frames(?: \(ends (\d+)\))?/.exec(R);
small ? gate('small-figure run', +small[2] <= 45, `${small[2]} f${small[3] ? ' (ends ' + small[3] + ')' : ''}, over ${small[1]}`, '<= 45 f') : missing('small-figure run');

// (d) hand to held prop
const holds = [...R.matchAll(/^ {4}(\w+): ([\d.]+) px(?: \(frame ([^)]+)\))? over (\d+) held frames/gm)];
if (/no held props on screen/.test(R)) gate('hand-prop gap', true, 'no held props', '<= 2 px at 1080p');
else if (!holds.length) missing('hand-prop gap');
else { const w = holds.reduce((a, b) => (+b[2] > +a[2] ? b : a)); gate('hand-prop gap', +w[2] <= 2, `${w[2]} px (${w[1]}${w[3] ? ', frame ' + w[3] : ''})`, '<= 2 px at 1080p'); }

// (e) collisions
const col = /\(e\) actor body inside set collision boxes \(target none\): (.*)/.exec(R);
col ? gate('collisions', col[1].trim() === 'none', col[1].trim(), 'none') : missing('collisions');

// (f) close-ups head x
const cus = [...R.matchAll(/^ {4}shot (.*), frames ([\d-]+): min ([\d.]+), median [\d.]+, max ([\d.]+)/gm)];
if (!/\(f\) close-ups/.test(R)) missing('close-up head x');
else if (!cus.length) gate('close-up head x', true, 'no close-ups', '45-55 %');
else {
  const bad = cus.filter(m => +m[3] < 45 || +m[4] > 55);
  const lo = Math.min(...cus.map(m => +m[3])), hi = Math.max(...cus.map(m => +m[4]));
  gate('close-up head x', !bad.length, `${lo}-${hi} % over ${cus.length} shots${bad.length ? '; out: ' + bad.map(m => `${m[1]} (${m[2]})`).join(', ') : ''}`, '45-55 %');
}

// loudness of the mp4's audio (ffmpeg ebur128, true peak)
const eb = run('ffmpeg', ['-hide_banner', '-nostats', '-i', path.resolve(A.in), '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-'], { capture: true });
const sum = (eb.stderr || '').split('Summary:').pop();
const I = num(/I:\s+(-?[\d.]+) LUFS/, sum), TP = num(/Peak:\s+(-?[\d.]+) dBFS/, sum);
I == null ? missing('mix loudness') : gate('mix loudness', Math.abs(I + 14) <= 0.5, `${I} LUFS`, '-14 +-0.5 LUFS');
TP == null ? missing('true peak') : gate('true peak', TP <= -1, `${TP} dBTP`, '<= -1 dBTP');

// colour: signalstats on 2 frames a second, median over the samples
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stick-gates-')), mt = path.join(tmp, 'c.txt');
run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', path.resolve(A.in), '-vf',
  `fps=2,signalstats,metadata=print:file=${mt.replace(/\\/g, '/').replace(/:/g, '\\:')}`, '-f', 'null', '-']);
const ct = fs.existsSync(mt) ? fs.readFileSync(mt, 'utf8') : ''; fs.rmSync(tmp, { recursive: true, force: true });
const col1 = k => ct.split('\n').filter(l => l.includes(`.${k}=`)).map(l => Number(l.split('=')[1])).sort((a, b) => a - b);
const med = v => v[v.length >> 1];
const Y = col1('YAVG'), S = col1('SATAVG');
if (!Y.length) missing('colour'); else {
  gate('colour YAVG', med(Y) >= 109 && med(Y) <=163, `median ${med(Y).toFixed(1)} (range ${Y[0].toFixed(0)}-${Y[Y.length - 1].toFixed(0)}, ${Y.length} samples)`, 'median 109-163');
  gate('colour SATAVG', med(S) >= 19 && med(S) <= 47, `median ${med(S).toFixed(1)} (range ${S[0].toFixed(0)}-${S[S.length - 1].toFixed(0)})`, 'median 19-47');
}

const pad = (s, n) => String(s).padEnd(n);
const fmt = ([n, got, ok, want]) => `${ok ? 'PASS' : 'FAIL'}  ${pad(n, 18)} ${pad(want, 20)} ${got}`;
const lines = [`gates for ${path.basename(A.in)} (report ${path.basename(A.report)})`, ...G.map(fmt)];
const fails = G.filter(g => !g[2]).length;
lines.push(fails ? `${fails} of ${G.length} gates FAIL` : `all ${G.length} gates PASS`);
const SG = A.film ? await story(A.film) : [];
if (SG.length) { const sf = SG.filter(g => !g[2]).length; lines.push('', `story gates (${A.film}/storyboard.json)`, ...SG.map(fmt), sf ? `${sf} of ${SG.length} story gates FAIL` : `all ${SG.length} story gates PASS`); }
const out = lines.join('\n') + '\n'; process.stdout.write(out);
if (A.out) { fs.mkdirSync(path.dirname(path.resolve(A.out)), { recursive: true }); fs.writeFileSync(A.out, out); }
process.exit(fails || SG.some(g => !g[2]) ? 1 : 0);

// ---------------------------------------------------------------- story gates (computed from the storyboard and __dbg)
// Thresholds: GATES.md "Story gates". A line's window = its first word to the next line's first word.
async function story(film) {
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), F = p => path.join(ROOT, film, p);
  const T = []; const sg = (name, ok, got, want) => T.push([name, got, ok, want]);
  if (!fs.existsSync(F('storyboard.json'))) { sg('storyboard', false, `no ${film}/storyboard.json`, 'one entry per line'); return T; }
  const SB = JSON.parse(fs.readFileSync(F('storyboard.json'), 'utf8')), script = JSON.parse(fs.readFileSync(F('vo/script.json'), 'utf8'));
  const words = JSON.parse(fs.readFileSync(F('vo/words.json'), 'utf8'));
  let dbg = A.dbg;
  if (!dbg) {
    const R1 = (await import(pathToFileURL(F('reel.js')).href)).default;
    const R2 = fs.existsSync(F('reel2.js')) ? (await import(pathToFileURL(F('reel2.js')).href)).default : null;
    const last = (R2 || R1).frames[1];
    dbg = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'stick-story-')), 'dbg.jsonl');
    const r = run('node', [path.join(ROOT, 'styles/stick-man/tools/shot.mjs'), '--film', film, '--frames', `0-${last}`, '--dbg', dbg, '--w', '540', '--h', '960'], { capture: true });
    if (r.status) { sg('story dbg', false, 'shot.mjs --dbg failed: ' + (r.stderr || '').slice(0, 200), 'runs'); return T; }
  }
  const rows = fs.readFileSync(dbg, 'utf8').trim().split('\n').map(l => JSON.parse(l)), fps = 30;
  const ids = script.lines.map(l => l.id), E = Object.fromEntries((SB.lines || []).map(e => [e.id, e]));
  const t0 = id => words.find(w => w.line === id)?.t0;
  const win = ids.map((id, i) => { const a = Math.round(t0(id) * fps), b = i + 1 < ids.length ? Math.round(t0(ids[i + 1]) * fps) : rows[rows.length - 1].f + 1; return { id, a, b }; });
  const inWin = w => rows.filter(r => r.f >= w.a && r.f < w.b);
  // 1 duration
  const dur = rows.length / fps;
  sg('duration', dur >= 27 && dur <= 33, `${dur.toFixed(1)} s (${rows.length} frames)`, '27-33 s');
  // 2 distinct sets (on screen >= 15 frames each)
  const setN = {}; for (const r of rows) if (r.set) setN[r.set] = (setN[r.set] || 0) + 1;
  const sets = Object.entries(setN).filter(([, n]) => n >= 15).map(([k]) => k);
  sg('distinct sets', sets.length >= 3, `${sets.length}: ${sets.join(', ')}`, '>= 3 sets or cutaways');
  // 3 shot variety: each line's main set + shot kind (most frames in its window); no run of more than 2 lines alike
  const kind = r => `${r.set}/${(r.camera?.shot || '?').split('(')[0]}`;
  const main = win.map(w => { const c = {}; for (const r of inWin(w)) c[kind(r)] = (c[kind(r)] || 0) + 1; return [w.id, Object.entries(c).sort((x, y) => y[1] - x[1])[0]?.[0] || '?']; });
  let run1 = 1, worst = 1, at = main[0]?.[0];
  for (let i = 1; i < main.length; i++) { run1 = main[i][1] === main[i - 1][1] ? run1 + 1 : 1; if (run1 > worst) { worst = run1; at = `${main[i - run1 + 1][0]}-${main[i][0]} ${main[i][1]}`; } }
  sg('shot variety', worst <= 2, `longest run ${worst} line(s) alike${worst > 1 ? ' (' + at + ')' : ''}`, '<= 2 lines same set + shot');
  // 4 + 5 every line has an entry; its props / fx are seen (>= 3 frames in its window); >= 40 % of lines use one
  const noEntry = ids.filter(id => !E[id]), unseen = [], using = [];
  for (const w of win) {
    const e = E[w.id]; if (!e) continue; const want = [...(e.props || []), ...(e.fx || [])], fr = inWin(w);
    const miss = want.filter(n => fr.filter(r => (r.seen || []).includes(n)).length < 3);
    if (miss.length) unseen.push(`${w.id}: ${miss.join(' ')}`);
    if (want.length && miss.length < want.length) using.push(w.id);
  }
  sg('storyboard entries', !noEntry.length, noEntry.length ? 'missing ' + noEntry.join(', ') : `${ids.length}/${ids.length} lines`, 'one entry per spoken line');
  const share = using.length / ids.length;
  sg('props / fx used', share >= 0.4, `${Math.round(100 * share)} % (${using.length}/${ids.length}: ${using.join(' ') || '-'})`, '>= 40 % of lines');
  sg('props / fx seen', !unseen.length, unseen.length ? 'not on screen: ' + unseen.join('; ') : 'every listed prop / fx on screen in its line', 'listed = in __dbg seen');
  // 6 judged: the board reviewer's verdict (GATES.md, reviewer prompt)
  const vf = F('review/board-verdict.json');
  if (!fs.existsSync(vf)) sg('board shown', false, 'no review/board-verdict.json: run board.mjs, then the reviewer (GATES.md)', '>= 85 % shown');
  else {
    const V = JSON.parse(fs.readFileSync(vf, 'utf8')), L = V.lines || [], ok = L.filter(x => x.shown === true), no = L.filter(x => x.shown !== true).map(x => x.id);
    const cover = ids.every(id => L.some(x => x.id === id)), pct = L.length ? ok.length / ids.length : 0;
    sg('board shown', cover && pct >= 0.85, `${Math.round(100 * pct)} % (${ok.length}/${ids.length})${no.length ? '; not shown: ' + no.join(', ') : ''}${cover ? '' : '; verdict misses lines'}`, '>= 85 % shown');
  }
  return T;
}
