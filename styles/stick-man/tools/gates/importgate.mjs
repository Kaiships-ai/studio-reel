// The import gate: a film on the one way in (kit/film.js) takes nothing else from the kit, however it is spelled.
//   node styles/stick-man/tools/gates/importgate.mjs films/<slug> [--strict]
// On for a film once any of its files imports kit/film.js, or with --strict; a film that never does is reported and passes.
// Every .js, .mjs, .cjs and .html file under the film is parsed (acorn), used or not. Allowed, all else fails:
//   /styles/stick-man/kit/film.js   person(), place() and the few kit functions that go with them
//   the film's own files            ./x.js, /films/<slug>/x.js
//   three                           vectors, geometry and materials for the film's own set pieces, hair and paths
//   three/addons/...                geometry helpers (RoundedBoxGeometry, mergeGeometries); a loader can only load the film's own files
// Also fails: an import(), fetch() or setModule that is not a plain string; a kit or another film's URL in any string; import.meta
// other than new URL('<a film file>', import.meta.url); eval, Function, workers, XMLHttpRequest, script elements, import maps; a
// link out of the film; a file that does not parse. Zero files read fails.
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

const FILM_JS = '/styles/stick-man/kit/film.js', CODE = /\.([cm]?js|html?)$/i, WAY_IN = /(^|[/#])kit\/film\.js/;
const BANNED = new Set(['eval', 'Function', 'Worker', 'SharedWorker', 'XMLHttpRequest', 'importScripts', 'require', 'createRequire']), GLOBALS = new Set(['globalThis', 'window', 'self', 'document']);
const plain = n => (n?.type === 'Literal' && typeof n.value === 'string' ? n.value : n?.type === 'TemplateLiteral' && !n.expressions.length ? n.quasis[0].value.cooked : null);
const decode = s => { try { return decodeURIComponent(s); } catch { return s; } };

// where a specifier or URL lands, as the page's server reads it: a root-absolute path, or null (a package, another host)
function landing(spec, from) {
  if (!/^\.{0,2}[/\\]/.test(spec)) return null;
  const u = new URL(spec, 'http://film' + from);
  return u.origin === 'http://film' ? path.posix.normalize(decode(u.pathname).replace(/\\/g, '/')) : null;
}

export function importGate(dir, { strict = false } = {}) {
  const root = fs.existsSync(dir) ? fs.realpathSync(dir) : dir, slug = path.basename(path.resolve(dir)), own = `/films/${slug}/`, found = [], files = [];
  const say = (rel, line, why) => found.push({ rel, line, why });
  let on = strict;

  const walk = (d, rel = '') => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name), r = rel + e.name;
      if (e.isSymbolicLink()) {
        let to; try { to = fs.realpathSync(f); } catch { continue; }
        if (to !== root && !to.startsWith(root + path.sep) && (fs.statSync(to).isDirectory() || CODE.test(to) || CODE.test(r))) say(r, 1, `a link out of the film (${to})`);
      } else if (e.isDirectory()) walk(f, r + '/');
      else if (CODE.test(e.name)) files.push(r);
    }
  };
  if (fs.existsSync(root) && fs.statSync(root).isDirectory()) walk(root);

  const judge = (rel, line, spec, what = 'import') => {
    if (WAY_IN.test(spec)) on = true;
    if (what === 'import' && (spec === FILM_JS || spec === 'three' || (/^three\/addons\/[\w./-]+$/.test(spec) && !spec.includes('..')))) return;
    if (!landing(spec, own + rel)?.startsWith(own)) say(rel, line, `${what} '${spec}': only ${FILM_JS}, three, three/addons/* and the film's own files`);
  };
  const script = (rel, src, line0 = 0, type = 'module') => {
    let tree; try { tree = parse(src, { ecmaVersion: 'latest', sourceType: type, locations: true, allowHashBang: true }); } catch (e) { if (WAY_IN.test(src)) on = true; say(rel, line0 + (e.loc?.line ?? 1), `does not parse (${e.message})`); return; }
    const done = new Set(), at = n => line0 + n.loc.start.line;
    const spec = (n, what) => { const s = plain(n); done.add(n); n.quasis?.forEach(q => done.add(q)); if (s == null) say(rel, at(n), `${what} is not a plain string, so nobody can check it`); else judge(rel, at(n), s, what); };
    each(tree, (n, parent, grand) => {
      if (done.has(n)) return;
      switch (n.type) {
        case 'ImportDeclaration': case 'ExportNamedDeclaration': case 'ExportAllDeclaration': if (n.source) spec(n.source, 'import'); return;
        case 'ImportExpression': spec(n.source, 'import'); return;
        case 'NewExpression': if (n.callee.name === 'URL' && isMetaUrl(n.arguments[1])) spec(n.arguments[0], 'URL'); return;
        case 'MetaProperty': if (n.meta.name === 'import' && !(isMetaUrl(parent) && grand?.type === 'NewExpression' && grand.callee.name === 'URL' && grand.arguments[1] === parent)) say(rel, at(n), "import.meta: only new URL('<a file of the film>', import.meta.url)"); return;
        case 'Property': if (parent.type === 'ObjectPattern' && (BANNED.has(plain(n.key) ?? n.key.name) || (plain(n.key) ?? n.key.name) === 'fetch')) say(rel, at(n), `${plain(n.key) ?? n.key.name} taken under another name`);
          if ((n.key.name ?? n.key.value) === 'setModule') { if (n.value.type !== 'Literal') say(rel, at(n), 'setModule is not a plain string, so nobody can check it'); else judge(rel, at(n), String(n.value.value), 'setModule'), done.add(n.value); } return;
        case 'CallExpression': if (n.callee.name === 'fetch') {
          done.add(n.callee); const a = n.arguments[0], s = plain(a);
          // a fetch's own relative URL starts at the page, which is the kit's
          if (a?.type === 'NewExpression' && a.callee.name === 'URL' && isMetaUrl(a.arguments[1])) return;
          if (s != null) { done.add(a); if (!s.startsWith('/')) say(rel, at(n), `fetch '${s}': a relative URL starts at the kit's page; write ${own}... or new URL('./...', import.meta.url)`); else judge(rel, at(n), s, 'fetch'); } else say(rel, at(n), 'fetch is not given a plain string, so nobody can check it');
        } else if (n.callee.property?.name === 'createElement' && /^(script|iframe)$/i.test(plain(n.arguments[0]) ?? '')) say(rel, at(n), `createElement('${plain(n.arguments[0])}')`);
          else if (n.callee.property?.name === 'constructor') say(rel, at(n), 'a constructor called by name');
          return;
        case 'Identifier': if (!isName(n, parent) && (BANNED.has(n.name) || n.name === 'fetch')) say(rel, at(n), n.name === 'fetch' ? 'fetch is only called by its own name' : `${n.name} runs code nobody can check`); return;
        case 'MemberExpression': { const name = n.computed ? plain(n.property) : n.property.name;
          if (BANNED.has(name) || name === 'fetch') say(rel, at(n), `.${name}: only fetch(), by its own name`);
          else if (n.computed && name == null && GLOBALS.has(n.object.name)) say(rel, at(n), `${n.object.name}[...] is not a plain name, so nobody can check it`); return; }
        case 'Literal': case 'TemplateElement': { const s = n.type === 'Literal' ? n.value : n.value.cooked; if (typeof s !== 'string') return; const d = decode(s);
          if (/(^|\/)styles\//.test(d) || /^#(kit|engine|motion-lib|tools)\//.test(d) || [...d.matchAll(/\/films\/([^/'"`\s]+)\//g)].some(m => m[1] !== slug)) { if (WAY_IN.test(s)) on = true; say(rel, at(n), `'${s}' points into the kit or another film`); } }
      }
    });
  };

  for (const rel of files) {
    const src = fs.readFileSync(path.join(root, rel), 'utf8');
    if (!/html?$/i.test(rel)) { script(rel, src, 0, /\.cjs$/i.test(rel) ? 'script' : 'module'); continue; }
    for (const m of src.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
      const line = src.slice(0, m.index).split('\n').length, s = /\bsrc\s*=\s*["']?([^"'\s>]+)/i.exec(m[1])?.[1];
      if (/importmap/i.test(m[1])) say(rel, line, 'an import map');
      else if (s) judge(rel, line, s);
      else if (m[2].trim() && !/application\/(ld\+)?json/i.test(m[1])) script(rel, m[2], line - 1);
    }
  }
  return { on, files: files.length, findings: on ? found.map(f => `${f.rel}:${f.line}: ${f.why}`) : [] };
}
// every node, a parent before its children
function each(n, f, parent = null, grand = null) {
  f(n, parent, grand);
  for (const v of Object.values(n)) for (const c of Array.isArray(v) ? v : [v]) if (typeof c?.type === 'string') each(c, f, n, parent);
}
// an identifier that only names a property, a method or an import, not the global itself
const isName = (n, p) => (p.type === 'MemberExpression' && p.property === n && !p.computed) || (['Property', 'MethodDefinition', 'PropertyDefinition'].includes(p.type) && p.key === n && !p.computed && !p.shorthand) || /^(Import|Export).*Specifier$/.test(p.type);
const isMetaUrl = n => n?.type === 'MemberExpression' && n.object.type === 'MetaProperty' && n.object.meta.name === 'import' && !n.computed && n.property.name === 'url';

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), dir = args.find(a => !a.startsWith('--'));
  if (!dir || args.some(a => a.startsWith('--') && a !== '--strict')) { console.error('usage: node styles/stick-man/tools/gates/importgate.mjs films/<slug> [--strict]'); process.exit(2); }
  const r = importGate(dir, { strict: args.includes('--strict') });
  if (!r.files) { console.log(`FAIL importgate ${dir}: no .js, .mjs, .cjs or .html file read`); process.exit(1); }
  if (!r.on) { console.log(`PASS importgate ${dir}: not on the way in (no file imports kit/film.js; --strict checks it anyway), ${r.files} files`); process.exit(0); }
  console.log(r.findings.length ? `FAIL importgate ${dir}: ${r.findings.length} in ${r.files} files\n${r.findings.map(f => '  ' + f).join('\n')}` : `PASS importgate ${dir}: ${r.files} files import only kit/film.js, three and their own`);
  process.exit(r.findings.length ? 1 : 0);
}
