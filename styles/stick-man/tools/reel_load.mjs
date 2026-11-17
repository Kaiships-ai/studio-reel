// Load a film's reel data (reel.js / reel2.js) in Node for the tools (gates.mjs, board.mjs). Reel files may import the
// browser kit by absolute URL ('/styles/stick-man/allout/rail.js', a set's look preset): a resolve hook maps '/styles/...'
// to the library root, and a few browser globals are stubbed so those modules can be evaluated (only data is read).
import { register } from 'node:module';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { run } from '../../../kit/env.mjs';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
register('data:text/javascript,' + encodeURIComponent(`
const ROOT = ${JSON.stringify(pathToFileURL(ROOT + '/').href)};
export async function resolve(spec, ctx, next) {
  if (spec.startsWith('/styles/') || spec.startsWith('/lib/')) return { url: new URL('.' + spec, ROOT).href, shortCircuit: true };
  return next(spec, ctx);
}`));
const stub = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : stub()), apply: () => stub(), construct: () => stub() });
for (const k of ['window', 'document', 'navigator', 'self', 'requestAnimationFrame', 'HTMLCanvasElement', 'Image', 'ImageData', 'OffscreenCanvas'])
  if (!(k in globalThis)) globalThis[k] = stub();
export const loadReel = async (film, f) => (await import(pathToFileURL(path.join(film, f)).href + `?t=${Date.now()}`)).default;

export async function reelSpan(film) {
  const R1 = await loadReel(film, 'reel.js'), R2 = fs.existsSync(path.join(film, 'reel2.js')) ? await loadReel(film, 'reel2.js') : null;
  return [R1.frames[0], (R2 || R1).frames[1]];
}
export const DBG_W = 540, DBG_H = 960;
export function cachedReelDbg(film, last) {
  const F = p => path.join(film, p), out = F('review/board-dbg.jsonl');
  const newest = Math.max(...['reel.js', 'reel2.js', 'storyboard.json', 'vo/words.json'].filter(p => fs.existsSync(F(p))).map(p => fs.statSync(F(p)).mtimeMs));
  if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < newest) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const r = run('node', [path.join(ROOT, 'styles/stick-man/tools/shot.mjs'), '--film', path.relative(ROOT, film), '--frames', `0-${last}`, '--dbg', out, '--w', String(DBG_W), '--h', String(DBG_H)]);
    if (r.status) throw new Error(`shot.mjs --dbg exited ${r.status}`);
  }
  return fs.readFileSync(out, 'utf8').trim().split('\n').map(l => JSON.parse(l));
}
