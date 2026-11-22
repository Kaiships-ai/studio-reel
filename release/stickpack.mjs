// release/stickpack.mjs: the stick-man pack that ships inside Starter and Pro (option B "Standard", Kai 22/11).
// styles/stick-man/ stays [dev] (the studio keeps changing it); kit.manifest picks what ships:
//   [stick]         globs of tracked files that ship as they are (`!glob` leaves one out), plus every file under
//                   packs/stick-man/, which ships at its own path (packs/stick-man/<p> -> <p>, replacing a [stick] file)
//   [stick_edit]    `<path> :: <regex> :: <replacement>` small edits to shipped files; each must match, so a moved line
//                   fails the build instead of shipping unedited
//   [stick_forbid]  regexes (any case) that must not appear in any pack file, path or bytes, binaries included
// Comments that name a [stick_forbid] word are dropped from shipped code (the engine's comments cite private films and
// people); code that names one fails the build. A clip file left out is also dropped from the motion library's registry.

export const OVERLAY = 'packs/stick-man/';
const TEXT = /\.(md|mjs|js|json|html|css|py|txt|toml|sh)$|(^|\/)(CREDITS|LICENSE[^/]*)$/;
const REGISTRY = 'styles/stick-man/motion-lib/index.js';
const glob = g => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\0').replace(/\*/g, '[^/]*').replace(/\0/g, '.*') + (g.endsWith('/') ? '.*' : '') + '$');

// the tracked files the pack is built from: [stick] picks (minus `!` globs) and the overlay
export function stickSources(files, m) {
  const inc = m.stick.filter(g => !g.startsWith('!')).map(glob), ex = m.stick.filter(g => g.startsWith('!')).map(g => glob(g.slice(1)));
  return { picked: files.filter(f => !f.startsWith(OVERLAY) && inc.some(r => r.test(f)) && !ex.some(r => r.test(f))), overlay: files.filter(f => f.startsWith(OVERLAY)) };
}

export function parseEdit(line) {
  const p = (line + ' ').split(' :: ');
  if (p.length !== 3 || !p[0] || !p[1]) throw new Error(`kit.manifest [stick_edit]: "${line}" is not "<path> :: <regex> :: <replacement>"`);
  return { path: p[0], re: p[1], to: p[2].replace(/ $/, '').replace(/\\n/g, '\n') };
}

// the comments of a JS module as acorn's onComment gives them ({ type: 'Line' | 'Block', value, start, end }), with no
// dependency (the release build runs on a bare node): strings, template literals (with nested ${}) and regex literals
// are skipped. test/unit/build-stickpack.test.mjs holds it to acorn on every shipped file.
export function jsComments(t) {
  const out = [], n = t.length, stack = [];   // stack: open template literals awaiting their closing ${ ... }
  let i = 0, prev = '';                       // prev: the last significant token kind, for regex vs division
  const isId = c => /[\w$\u0080-\uffff]/.test(c);
  const regexOK = () => prev === '' || prev === 'op' || prev === 'kw';
  const KW = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);
  while (i < n) {
    const c = t[i], d = t[i + 1];
    if (c === '/' && d === '/') { const e = t.indexOf('\n', i); const end = e < 0 ? n : e; out.push({ type: 'Line', value: t.slice(i + 2, end), start: i, end }); i = end; continue; }
    if (c === '/' && d === '*') { const e = t.indexOf('*/', i + 2); const end = e < 0 ? n : e + 2; out.push({ type: 'Block', value: t.slice(i + 2, end - 2), start: i, end }); i = end; continue; }
    if (c === '"' || c === "'") { i++; while (i < n && t[i] !== c) i += t[i] === '\\' ? 2 : 1; i++; prev = 'val'; continue; }
    if (c === '`' || (c === '}' && stack.length && stack[stack.length - 1] === 0)) {
      if (c === '}') stack.pop(); i++;
      while (i < n && t[i] !== '`') { if (t[i] === '\\') { i += 2; continue; } if (t[i] === '$' && t[i + 1] === '{') { stack.push(0); i += 2; break; } i++; }
      if (t[i] === '`') { i++; prev = 'val'; } else prev = 'op';
      continue;
    }
    if (c === '{') { if (stack.length) stack[stack.length - 1]++; i++; prev = 'op'; continue; }
    if (c === '}') { if (stack.length) stack[stack.length - 1]--; i++; prev = 'val'; continue; }
    if (c === '/' && regexOK()) {
      i++; let cls = false;
      while (i < n && (t[i] !== '/' || cls) && t[i] !== '\n') { if (t[i] === '\\') i++; else if (t[i] === '[') cls = true; else if (t[i] === ']') cls = false; i++; }
      i++; while (i < n && /[a-z]/i.test(t[i])) i++; prev = 'val'; continue;
    }
    if (/\s/.test(c)) { i++; continue; }
    if (isId(c)) { let j = i; while (j < n && isId(t[j])) j++; const w = t.slice(i, j); prev = KW.has(w) ? 'kw' : 'val'; i = j; continue; }
    prev = c === ')' || c === ']' ? 'val' : 'op'; i++;
  }
  return out;
}

// drop the comments (or the parts of them) that match `bad`; strings and regexes are never touched
export function scrubJs(text, bad) {
  const comments = jsComments(text);
  let out = text;
  for (const c of comments.reverse()) {
    if (!bad.some(r => r.test(c.value))) continue;
    if (c.type === 'Line') {
      const kept = clean(c.value, bad);
      const lineStart = out.lastIndexOf('\n', c.start - 1) + 1, before = out.slice(lineStart, c.start);
      if (kept != null) out = out.slice(0, c.start) + '//' + kept + out.slice(c.end);
      else if (!before.trim()) out = out.slice(0, lineStart) + out.slice(c.end + (out[c.end] === '\n' ? 1 : 0));
      else out = out.slice(0, c.start).replace(/[ \t]+$/, '') + out.slice(c.end);
    } else {
      const lines = c.value.split('\n').map(l => bad.some(r => r.test(l)) ? clean(l, bad) : l).filter(l => l != null);
      out = out.slice(0, c.start) + '/*' + lines.join('\n') + '*/' + out.slice(c.end);
    }
  }
  return out;
}
// a comment line without its bad parentheticals, or null when the bad word is in the sentence itself
function clean(s, bad) {
  let t = s, prev;
  do { prev = t; t = t.replace(/\s*\([^()]*\)/g, p => bad.some(r => r.test(p)) ? '' : p); } while (t !== prev);
  return bad.some(r => r.test(t)) ? null : t;
}
// python and shell: a `#` comment that names a bad word goes; code that does is left for the check to catch
export function scrubHash(text, bad) {
  return text.split('\n').flatMap(l => {
    if (!bad.some(r => r.test(l))) return [l];
    const i = l.search(/(^|\s)#/), at = i < 0 ? -1 : l.indexOf('#', i);
    if (at < 0) return [l];
    const code = l.slice(0, at), kept = clean(l.slice(at + 1), bad);
    if (kept != null) return [code + '#' + kept];
    return code.trim() ? [code.replace(/\s+$/, '')] : [];
  }).join('\n');
}

// the motion library registry without the clips the pack leaves out
export function pruneRegistry(text, has) {
  const gone = [];
  const kept = text.split('\n').filter(l => {
    const m = /^import (\w+) from '\.\/(.+\.js)';$/.exec(l);
    if (m && !has(`styles/stick-man/motion-lib/${m[2]}`)) { gone.push(m[1]); return false; }
    return true;
  });
  return kept.filter(l => !gone.some(g => new RegExp(`^\\s*${g},?\\s*$`).test(l))).join('\n');
}

// pack files { path -> Buffer } and the problems found; blob(repoPath) reads a tracked file
export function buildStick(files, m, blob) {
  const errors = [], own = new Map(), { picked, overlay } = stickSources(files, m);
  for (const f of picked) own.set(f, blob(f));
  for (const f of overlay) own.set(f.slice(OVERLAY.length), blob(f));
  for (const line of m.stick_edit) {
    const e = parseEdit(line);
    if (!own.has(e.path)) { errors.push(`[stick_edit] ${e.path} is not in the pack`); continue; }
    const t = own.get(e.path).toString('utf8'), re = new RegExp(e.re, 'g');
    if (!re.test(t)) { errors.push(`[stick_edit] ${e.path}: /${e.re}/ matches nothing (the line moved: fix the edit)`); continue; }
    own.set(e.path, Buffer.from(t.replace(re, e.to)));
  }
  if (own.has(REGISTRY)) own.set(REGISTRY, Buffer.from(pruneRegistry(own.get(REGISTRY).toString('utf8'), p => own.has(p))));
  const bad = m.stick_forbid.map(p => new RegExp(p, 'i'));
  for (const [f, b] of own) {
    try {
      if (/\.(m?js)$/.test(f)) own.set(f, Buffer.from(scrubJs(b.toString('utf8'), bad)));
      else if (/\.(py|sh|toml)$/.test(f)) own.set(f, Buffer.from(scrubHash(b.toString('utf8'), bad)));
    } catch (err) { errors.push(`${f}: cannot scrub (${err.message})`); }
  }
  for (const [f, b] of own) {
    // a binary is read as a person would read it: its printable runs of 10+ characters (short runs are noise)
    const t = TEXT.test(f) ? b.toString('utf8') : (b.toString('latin1').match(/[\x20-\x7e]{10,}/g) || []).join('\n');
    for (const [p, r] of m.stick_forbid.map(p => [p, new RegExp(p, 'i')])) if (r.test(f) || r.test(t)) errors.push(`${f}: names "${p}" ([stick_forbid])`);
  }
  return { files: own, errors };
}
