// Load a film's reel data (reel.js / reel2.js) in Node for the tools (board.mjs, kituse.mjs, cutgate.mjs). Reel files may import the
// browser kit or another film by absolute URL ('/styles/stick-man/kit/cast/rail.js', '/films/<other>/s4/face2.js'): a resolve
// hook maps '/styles/', '/lib/' and '/films/' to the library root, fetch and Request read root-absolute URLs from disk (a
// costume's .glb loads at import), and a few browser globals are stubbed so those modules evaluate (only data is read).
import { register } from 'node:module';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { run } from '../../../../kit/env.mjs';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
register('data:text/javascript,' + encodeURIComponent(`
const ROOT = ${JSON.stringify(pathToFileURL(ROOT + '/').href)};
export async function resolve(spec, ctx, next) {
  if (['/styles/', '/lib/', '/films/'].some(p => spec.startsWith(p))) return { url: new URL('.' + spec, ROOT).href, shortCircuit: true };
  return next(spec, ctx);
}`));
const stub = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : stub()), apply: () => stub(), construct: () => stub() });
for (const k of ['window', 'document', 'navigator', 'self', 'requestAnimationFrame', 'HTMLCanvasElement', 'Image', 'ImageData', 'OffscreenCanvas', 'ProgressEvent'])
  if (!(k in globalThis)) globalThis[k] = stub();
const atRoot = u => typeof u === 'string' && u.startsWith('/') ? pathToFileURL(path.join(ROOT, u)).href : u;
const WebRequest = globalThis.Request, webFetch = globalThis.fetch;
globalThis.Request = class extends WebRequest { constructor(u, o) { super(atRoot(u), o); } };
globalThis.fetch = (req, o) => {
  const u = atRoot(typeof req === 'string' ? req : req.url);
  return u.startsWith('file:') ? fs.promises.readFile(new URL(u)).then(b => new Response(b)) : webFetch(req, o);
};
export const loadReel = async (film, f) => (await import(pathToFileURL(path.join(film, f)).href + `?t=${Date.now()}`)).default;

export async function reelSpan(film) {
  const R1 = await loadReel(film, 'reel.js'), R2 = fs.existsSync(path.join(film, 'reel2.js')) ? await loadReel(film, 'reel2.js') : null;
  return [R1.frames[0], (R2 || R1).frames[1]];
}
export const DBG_W = 540, DBG_H = 960;
const readJsonl = f => fs.readFileSync(f, 'utf8').trim().split('\n').map(l => JSON.parse(l));
export function cachedReelDbg(film, first, last) {
  const F = p => path.join(film, p), out = F('review/board-dbg.jsonl');
  const newest = Math.max(...['reel.js', 'reel2.js', 'storyboard.json', 'vo/words.json'].filter(p => fs.existsSync(F(p))).map(p => fs.statSync(F(p)).mtimeMs));
  const covers = () => { const f = readJsonl(out).map(r => r.f); return Math.min(...f) <= first && Math.max(...f) >= last; };
  if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < newest || !covers()) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const r = run('node', [path.join(ROOT, 'styles/stick-man/tools/render/shot.mjs'), '--film', path.relative(ROOT, film), '--frames', `${first}-${last}`, '--dbg', out, '--w', String(DBG_W), '--h', String(DBG_H)]);
    if (r.status) throw new Error(`shot.mjs --dbg exited ${r.status}`);
  }
  return readJsonl(out);
}
