// make.mjs: start, refresh and cast kai-reel-3d reels. Run from the library root. Dev only (Blocky Kai never ships).
//   node styles/kai-reel-3d/tools/make.mjs new <name> [--listicle]   films/<name>/ from template/ (+ the listicle kit on top)
//   node styles/kai-reel-3d/tools/make.mjs template <film>           refresh template/ from a finished skit reel
//   node styles/kai-reel-3d/tools/make.mjs cast <film> [role ids]     render the casting book (cast/img, cast/roles.json,
//                                                                    cast/clawd-casting.html) from a reel's engine
//   node styles/kai-reel-3d/tools/make.mjs covers                    films/covers/ from covers/ (once; the cover grid lives there)
// Inside a film, run its own tools through pixi so node, python and ffmpeg come from this folder:
//   cd films/<name> && pixi run node render/shot.mjs …   ·   pixi run python review/gate.py
import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, readdirSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, run, requireReady } from '../../../kit/env.mjs';

const STYLE = resolve(dirname(fileURLToPath(import.meta.url)), '..'), LIB = resolve(STYLE, '../..');
const T = join(STYLE, 'template'), CAST = join(STYLE, 'cast');
const argv = process.argv.slice(2), pos = argv.filter(a => !a.startsWith('--')), flags = argv.filter(a => a.startsWith('--'));
const die = m => { console.error('✗ ' + m); process.exit(1); };
const sh = (tool, args, o = {}) => {
  const r = run(tool, args, o);
  if (r.error || r.status !== 0) die(`failed: ${[tool, ...args].join(' ')}${r.error ? '\n  ' + r.error.message : ''}${o.capture ? '\n' + r.stderr : ''}`);
  return r;
};
const SKIP = new Set(['node_modules', 'frames', 'renders']);
const copyTree = (from, to, skip = SKIP) => cpSync(from, to, { recursive: true, dereference: true, filter: s => !skip.has(basename(s)) && basename(s) !== '.DS_Store' });
const filmArg = () => {
  const f = pos[1] && resolve(pos[1]);
  if (!f || !existsSync(join(f, 'reel.html'))) die(`usage: make.mjs ${pos[0]} <film folder with reel.html>`);
  return f;
};

const CMD = {
  // new-reel.sh: the template is the whole engine (Blocky Kai, Clawd, render, review tools); the listicle kit goes on top
  new() {
    const name = pos[1];
    if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) die('usage: make.mjs new <name> [--listicle]   (lowercase letters, digits and dashes, e.g. reel66-hooks)');
    const NEW = join(LIB, 'films', name);
    if (existsSync(NEW)) die(`already exists: ${NEW}`);
    copyTree(T, NEW);
    for (const d of ['frames', 'renders', 'vo/takes']) mkdirSync(join(NEW, d), { recursive: true });
    cpSync(join(STYLE, 'BRIEF.template.md'), join(NEW, 'BRIEF.md'));
    cpSync(join(STYLE, 'storyboard.template.html'), join(NEW, 'storyboard.html'));   // sketch storyboard (step 1b), reel62 as the example
    if (flags.includes('--listicle')) {   // LISTICLE.md step 1: blur stage, camPath kit, router, bg, levels, measuring tools, builder/verifier specs
      copyTree(join(STYLE, 'listicle'), NEW, new Set([...SKIP, 'examples']));
      mkdirSync(join(NEW, 'review/examples-ch'), { recursive: true });
      const ex = join(STYLE, 'listicle/examples/ch');
      for (const f of readdirSync(ex).filter(f => f.endsWith('.js'))) cpSync(join(ex, f), join(NEW, 'review/examples-ch', f));   // reel63 chapters: reference only
      console.log('listicle kit on top: rewrite src/set.js (the world), the CH table + titles + end-card keyword in src/reel.js, src/bg.js for the new world');
    }
    console.log(`✓ films/${name}/ ready. Fill BRIEF.md, then write vo/script.json (Kai approves it), then storyboard.html (Kai approves the direction) before any voice`);
  },

  // make-template.sh: a whitelist only (never frames/, renders/, node_modules/, vo/cache, voice takes)
  template() {
    const SRC = filmArg(), NAME = basename(SRC), has = f => existsSync(join(SRC, f));
    const cp = (f, to = f) => { if (has(f)) { mkdirSync(dirname(join(T, to)), { recursive: true }); cpSync(join(SRC, f), join(T, to), { dereference: true }); } };
    for (const d of ['src', 'engine', 'cast', 'render', 'vendor']) { rmSync(join(T, d), { recursive: true, force: true }); copyTree(join(SRC, d), join(T, d)); }
    cp('reel.html');
    for (const f of ['role-card.html', 'clawd-turn.html']) cp(f);   // casting book pages (make.mjs cast renders with them)
    cp('assets/blocky-kai-talk.glb'); cp('assets/kai/kai-library.json');
    for (const f of ['synth.py', 'score.py', 'sfx.py', 'our-music.json']) cp(`audio/${f}`);
    for (const f of ['audit.mjs', 'audio_audit.py', 'onion.py', 'clawd_speed.py', 'gate.py']) cp(`review/${f}`);
    cp('vo/env.py'); cp('vo/tighten.py');
    // the template's Gemini voice step is kept unless the source reel's make_vo.py is also the Gemini one
    if (has('vo/make_vo.py') && readFileSync(join(SRC, 'vo/make_vo.py'), 'utf8').includes('generativelanguage.googleapis.com')) cp('vo/make_vo.py');
    cp('ref/morphy-music.json');   // audio/score.py reads it
    for (const f of ['src/reel.js', 'src/set.js', 'KICKOFF.md', 'BRIEF.md', 'STORYBOARD.md', 'vo/script.json', 'vo/voice-qa.md', 'review/voice-qa.md']) cp(f, `ref/${NAME}/${basename(f)}`);
    console.log(`✓ template refreshed from ${NAME}. Commit styles/kai-reel-3d/template on a branch.`);
  },

  // cast/build.sh: every role in engine/roles/data.js + Kai's default Clawd; only <id> args = re-render just those roles
  cast() {
    requireReady(env());
    const SRC = filmArg(), at = { cwd: SRC };
    const js = code => sh('node', ['-e', code], { ...at, capture: true }).stdout;
    mkdirSync(join(CAST, 'img'), { recursive: true });
    writeFileSync(join(CAST, 'roles.json'), js("import('./engine/roles/data.js').then(m=>console.log(JSON.stringify(m.ROLES,null,1)))"));
    const ids = pos.slice(2).length ? pos.slice(2) : ['kai-default', ...js("import('./engine/roles/data.js').then(m=>console.log(m.ROLES.map(r=>r.id).join(' ')))").trim().split(/\s+/)];
    for (const id of ids) {
      const q = id === 'kai-default' ? [] : ['--q', `role=${id}`];
      sh('node', ['render/sheet.mjs', '--page', 'role-card.html', ...q, '--times', '0', '--size', '600x600', '--nolabel', '--out', `review/card-${id}.png`], { ...at, capture: true });
      sh('node', ['render/sheet.mjs', '--page', 'clawd-turn.html', ...q, '--times', '0', '--size', '1600x1000', '--nolabel', '--out', `review/turn-${id}.png`], { ...at, capture: true });
      sh('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(SRC, `review/card-${id}.png`), '-vf', 'scale=400:-1', '-q:v', '4', join(CAST, 'img', `${id}.jpg`)]);
      sh('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(SRC, `review/turn-${id}.png`), '-vf', 'crop=1600:620:0:150,scale=960:-1', '-q:v', '5', join(CAST, 'img', `${id}-turn.jpg`)]);
      console.log(`rendered ${id}`);
    }
    sh('python', [join(CAST, 'page.py'), join(CAST, 'roles.json'), join(CAST, 'clawd-casting.html')]);
  },

  covers() {
    const C = join(LIB, 'films', 'covers');
    if (existsSync(C)) return console.log(`films/covers/ already exists: render there (see styles/kai-reel-3d/covers/README.md)`);
    copyTree(join(STYLE, 'covers'), C);
    console.log('✓ films/covers/ ready: add a row to titles-eye.tsv, then  cd films/covers && pixi run python render/all.py titles-eye.tsv');
  },
};

(CMD[pos[0]] || (() => die('usage: make.mjs new <name> [--listicle] | template <film> | cast <film> [ids] | covers')))();
