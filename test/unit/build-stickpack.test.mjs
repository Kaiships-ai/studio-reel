// The stick-man pack (release/stickpack.mjs, kit.manifest [stick]) built from this checkout: it builds clean, it ships
// what option B promises and none of what stays private, and it is self-contained: every import of a shipped module
// resolves to a shipped file (a new import in the studio's engine that the pack lacks fails here, not on a buyer's Mac).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { parseManifest } from '../../release/build.mjs';
import { buildStick, scrubJs, scrubHash, pruneRegistry, parseEdit } from '../../release/stickpack.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const files = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' }).stdout.split('\0').filter(f => f && existsSync(join(ROOT, f)));
const m = parseManifest(readFileSync(join(ROOT, 'kit.manifest'), 'utf8'));
const pack = buildStick(files, m, f => readFileSync(join(ROOT, f)));
const P = pack.files, text = f => P.get(f).toString('utf8');

test('the pack builds with no problem', () => assert.deepEqual(pack.errors, []));

test('it ships option B: engine, buyer skill, guide, tools, three sets, characters, sample, sounds, licences', () => {
  for (const f of ['START-stick-man.md', '.claude/skills/make-reel-stick-man/SKILL.md', '.claude/skills/make-reel-stick-man/REFERENCE.md',
    'styles/stick-man/engine/play.js', 'styles/stick-man/reel.html', 'styles/stick-man/faces.html', 'styles/stick-man/README.md', 'styles/stick-man/LICENSES.md',
    'styles/stick-man/kit/sets/room.js', 'styles/stick-man/kit/sets/street.js', 'styles/stick-man/kit/sets/grey-room.js', 'styles/stick-man/kit/cast/characters.js',
    'styles/stick-man/tools/pack/render.mjs', 'styles/stick-man/tools/pack/check.mjs', 'styles/stick-man/tools/pack/export.mjs', 'styles/stick-man/tools/pack/new.mjs',
    'styles/stick-man/series-bible/SERIES.md', 'styles/stick-man/examples/sample/reel.js', 'styles/stick-man/examples/sample/vo/vo.wav', 'styles/stick-man/sound/CREDITS'])
    assert.ok(P.has(f), `${f} ships`);
  assert.equal([...P.keys()].filter(f => /^styles\/stick-man\/sound\/lib\/.+\.ogg$/.test(f)).length, 62, '62 sounds');
  const clips = [...P.keys()].filter(f => /^styles\/stick-man\/motion-lib\/(body|shared)\/.+_v\d+\.js$/.test(f));
  assert.ok(clips.length >= 36, `${clips.length} clips`);
  for (const c of ['Move_Walk_Fwd_Loop', 'Move_Run_Fwd_Loop', 'Idle_Stand_Loop', 'Gest_Talk_Loop', 'Trans_SitDown_Once', 'Idle_Sit_Loop', 'Trans_StandUp_Once', 'Act_PickUp_Once', 'Act_PutDown_Once']) {
    const f = `styles/stick-man/motion-lib/body/adult/Adult_${c}_v01.js`;
    assert.ok(P.has(f), `the adult ${c} clip`); assert.match(text(f), /ref\/ual\//, `${c} is built from the CC0 capture`);
  }
});

test('nothing private ships: s2 faces, the hand camera, the hoodie, gates, bibles, the reference bench, captured clips', () => {
  for (const f of P.keys()) assert.doesNotMatch(f, /facestyles\/s2|acting\/director|hoodie|cloth\.js|tools\/(gates\/(?!jointstep)|review|series)|bible\/hot|bench\/|ref\/mixamo/, f);
  assert.match(text('styles/stick-man/engine/facestyles/index.js'), /DEFAULT_FACE_STYLE = 'kit'/);
  assert.doesNotMatch(text('styles/stick-man/engine/cast.js'), /export const KAI\b/);
  assert.doesNotMatch(text('styles/stick-man/motion-lib/index.js'), /Adult_Act_Jump_Once|Adult_Gest_Wave_Loop/);
});

test('every shipped JS module parses and every import resolves inside the pack', () => {
  const acorn = createRequire(import.meta.url)('acorn'), SM = 'styles/stick-man/', miss = [];
  const alias = s => s.replace(/^#(engine|kit|motion-lib|tools)\//, `${SM}$1/`).replace(/^\//, '');
  for (const [f, b] of P) {
    if (!/\.m?js$/.test(f)) continue;
    const ast = acorn.parse(b.toString('utf8'), { ecmaVersion: 'latest', sourceType: 'module' });
    const specs = [];
    const walk = n => { if (!n || typeof n !== 'object') return; if ((n.type === 'ImportDeclaration' || n.type === 'ExportAllDeclaration' || n.type === 'ExportNamedDeclaration') && n.source) specs.push(n.source.value);
      if (n.type === 'ImportExpression' && n.source.type === 'Literal') specs.push(n.source.value); for (const k in n) if (k !== 'type') { const v = n[k]; Array.isArray(v) ? v.forEach(walk) : v && typeof v === 'object' && walk(v); } };
    walk(ast);
    for (const s of specs) {
      if (/^(node:|three|playwright-core|acorn)/.test(s)) continue;
      const to = s.startsWith('.') ? normalize(join(dirname(f), s)) : alias(s);
      if (to.startsWith('films/')) continue;
      if (!P.has(to) && !(to.startsWith('kit/') || to.startsWith('core/')) ) miss.push(`${f} -> ${s}`);
    }
  }
  assert.deepEqual(miss, []);
});

test('the scrub drops a bad comment or its bad parenthetical, never code', () => {
  const bad = [/\bkai\b/i, /mixamo/i];
  assert.equal(scrubJs("// a walk (Kai's reference, 11/11) planted\nconst a = 'x // Kai';\n", bad), "// a walk planted\nconst a = 'x // Kai';\n");
  assert.equal(scrubJs('const b = 1;   // from Mixamo\n// Kai said so\nconst c = 2;\n', bad), 'const b = 1;\nconst c = 2;\n');
  assert.equal(scrubHash('x = 1  # Kai tuned this\n# from mixamo\ny = 2\n', bad), 'x = 1\ny = 2\n');
  assert.equal(pruneRegistry("import A from './body/a.js';\nimport B from './body/b.js';\nexport const ALL = [\n  A,\n  B,\n];", p => p.endsWith('/a.js')), "import A from './body/a.js';\nexport const ALL = [\n  A,\n];");
  assert.deepEqual(parseEdit('a/b.js :: x => y :: z'), { path: 'a/b.js', re: 'x => y', to: 'z' });
});
