// Load a film's reel data (reel.js / reel2.js) in Node for the tools (gates.mjs, board.mjs). Reel files may import the
// browser kit by absolute URL ('/styles/stick-man/allout/rail.js', a set's look preset): a resolve hook maps '/styles/...'
// to the library root, and a few browser globals are stubbed so those modules can be evaluated (only data is read).
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
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
