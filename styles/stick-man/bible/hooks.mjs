// Module hooks for bible/check.mjs: a film's modules load in node from the dev server's roots ('/films/', '/styles/'),
// and each film module that exports buildTrack, stepTurn or a function or value the catalog names (flyCam, nightBright,
// LOOK) loads through a shim that hands those exports to the checker's recorders (globalThis.__BIBLE.wrap), so every use
// is seen as the film wrote it. Written sync so the same functions serve module.registerHooks and module.register.
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

let FILMS = '', KIT = '', NAMED = {};   // NAMED: film-relative path -> { export name: catalog id }
export function initialize(data) { ({ films: FILMS, kit: KIT, named: NAMED } = data); }

const REAL = 'bible-real';
const exportsOf = src => new Set([...src.matchAll(/export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)].map(m => m[1]));

export function resolve(spec, ctx, next) {
  if (spec.startsWith('/films/')) return next(pathToFileURL(FILMS + spec.slice(6)).href, ctx);
  if (spec.startsWith('/styles/')) return next(pathToFileURL(KIT + spec).href, ctx);
  if (spec === 'three' || spec.startsWith('three/')) return next(spec, { ...ctx, parentURL: pathToFileURL(KIT + '/package.json').href });
  return next(spec, ctx);
}

export function load(url, ctx, next) {
  if (!url.startsWith('file:') || url.includes(REAL)) return next(url, ctx);
  const file = fileURLToPath(url.split('?')[0]);
  if (!file.startsWith(FILMS + '/') || !/\.m?js$/.test(file)) return next(url, ctx);
  const rel = file.slice(FILMS.length + 1), have = exportsOf(fs.readFileSync(file, 'utf8'));
  const wraps = [];
  if (have.has('buildTrack')) wraps.push(`export const buildTrack = W.track(R.buildTrack);`);
  if (have.has('stepTurn')) wraps.push(`export const stepTurn = W.step(R.stepTurn);`);
  for (const [name, id] of Object.entries(NAMED[rel] || {})) if (have.has(name) && !['buildTrack', 'stepTurn'].includes(name)) wraps.push(`export const ${name} = W.part(R.${name}, ${JSON.stringify(id)});`);
  if (!wraps.length) return next(url, ctx);
  const real = JSON.stringify(`${url}${url.includes('?') ? '&' : '?'}${REAL}`);
  return { format: 'module', shortCircuit: true,
    source: `export * from ${real};\nimport * as R from ${real};\nconst W = globalThis.__BIBLE.wrap;\n${wraps.join('\n')}\n` };
}
