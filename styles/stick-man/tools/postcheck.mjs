// Post checks (◇5): a sound plan with intent (silences, sound transitions), the delivery package a platform needs, and
// the final file's spec. The judged half (final QA on a phone by a fresh reviewer) is evidence in GATES.json.
//   node styles/stick-man/tools/postcheck.mjs films/<slug>        -> review/postcheck.md, exit 1 on a FAIL
// audio/sound-plan.json: { "scenes": [ { "scene": "S5", "bed": "...", "foley": ["..."], "music": "build|hold|silence|drop|...",
//   "silence": "why", "transition": "J|L|none" } ] }
import fs from 'node:fs'; import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const film = process.argv[2];
if (!film) { console.error('usage: postcheck.mjs films/<slug>'); process.exit(2); }
const DIR = path.resolve(ROOT, film), F = p => path.join(DIR, p);
const out = [], add = (lvl, id, msg) => out.push({ lvl, id, msg });
const J = p => fs.existsSync(F(p)) ? JSON.parse(fs.readFileSync(F(p), 'utf8')) : null;
// ---- sound plan (DIRECTOR.md §6): three layers per scene, at least two real silences, at least two sound transitions
const plan = J('audio/sound-plan.json'), SB = J('storyboard.json') || {};
if (!plan) add('FAIL', 'S1', 'audio/sound-plan.json is missing: bed, foley and music state per scene, from the animatic cue map');
else {
  const sc = plan.scenes || [];
  for (const c of SB.scenes || []) if (!sc.some(x => x.scene === c.id)) add('FAIL', 'S1', `scene ${c.id} has no sound plan`);
  for (const x of sc) if (!x.bed || !(x.foley || []).length || !x.music) add('FAIL', 'S1', `${x.scene}: needs bed, foley and a music state`);
  const sil = sc.filter(x => x.silence || x.music === 'silence' || x.music === 'drop').length;
  if (sil < 2) add('FAIL', 'S2', `${sil} planned silence(s): at least two, before the turn or the peak`);
  const tr = sc.filter(x => /^[JL]$/.test(x.transition || '')).length;
  if (tr < 2) add('WARN', 'S3', `${tr} sound transition(s) (J/L cut): use sound to cross at least two cuts`);
  const mj = J('audio/music.json');
  if (mj && sil && !JSON.stringify(mj).match(/silence|drop|wait/)) add('FAIL', 'S4', 'the sound plan has silences but audio/music.json has no silence, drop or wait section: the music arc ignores the plan');
}
// ---- the delivery package
const finals = fs.existsSync(F('renders')) ? fs.readdirSync(F('renders')).filter(f => /final.*\.mp4$|_v\d+\.mp4$/.test(f)).sort() : [];
const final = finals.at(-1);
if (!final) add('FAIL', 'P1', 'no final render in renders/');
for (const [f, why] of [['deliver/cover.jpg', 'the cover frame, chosen on purpose'], ['deliver/caption.txt', 'caption + hashtags (skill ig-caption)'],
  ['deliver/subtitles.srt', 'subtitles file'], ['CREDITS', 'voice, music samples, fonts and their licences (DIRECTOR.md §11)']])
  if (!fs.existsSync(F(f))) add('FAIL', 'P2', `${f} missing: ${why}`);
const hooks = fs.existsSync(F('deliver')) ? fs.readdirSync(F('deliver')).filter(f => /^hook-.*\.mp4$/.test(f)) : [];
if (!hooks.length) add('WARN', 'P3', 'no alternative hook cut (deliver/hook-*.mp4) for an A/B test');
// ---- the final file's spec
if (final) {
  const p = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration', '-of', 'json', F(`renders/${final}`)], { encoding: 'utf8' });
  if (p.status === 0) {
    const j = JSON.parse(p.stdout), v = j.streams.find(s => s.codec_type === 'video'), a = j.streams.find(s => s.codec_type === 'audio');
    if (!v || v.width !== 1080 || v.height !== 1920) add('FAIL', 'P4', `${final} is ${v?.width}x${v?.height}, not 1080x1920`);
    if (v && v.r_frame_rate !== '30/1') add('FAIL', 'P4', `${final} runs at ${v.r_frame_rate}, not 30 fps`);
    if (!a) add('FAIL', 'P4', `${final} has no audio`);
  } else add('WARN', 'P4', 'ffprobe not available: file spec not checked');
  const lv = fs.existsSync(F('audio/levels.txt')) ? fs.readFileSync(F('audio/levels.txt'), 'utf8') : '';
  const lufs = Number(lv.match(/(-?\d+(?:\.\d+)?)\s*LUFS/i)?.[1]);
  if (!lv) add('FAIL', 'P5', 'audio/levels.txt missing: run sound.py');
  else if (Number.isFinite(lufs) && Math.abs(lufs + 14) > 0.5) add('FAIL', 'P5', `mix at ${lufs} LUFS (target −14 ± 0.5)`);
}
const nF = out.filter(o => o.lvl === 'FAIL').length;
fs.mkdirSync(F('review'), { recursive: true });
fs.writeFileSync(F('review/postcheck.md'), [`# Post check · ${path.basename(DIR)}`, '', `**${nF ? 'FAIL' : 'PASS'}**: ${nF} FAIL, ${out.length - nF} WARN`, '',
  '| Level | Check | What |', '| --- | --- | --- |', ...out.map(o => `| ${o.lvl} | ${o.id} | ${o.msg} |`)].join('\n') + '\n');
console.log(`review/postcheck.md: ${nF ? 'FAIL' : 'PASS'} · ${nF} FAIL, ${out.length - nF} WARN${final ? ` · final ${final}` : ''}`);
process.exit(nF ? 1 : 0);
