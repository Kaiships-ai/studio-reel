// Preload for a heavy test (`NODE_OPTIONS=--import=<this file>`, set by test/tier.mjs): appends every path the process
// reads to $TIER_TRACE, so test/heavy.json holds what the test really read, computed import() and fs reads included.
// Lines: `r <abs>` read, stat or probe; `l <abs>` directory listed; `o <command>` a channel this file cannot follow.
// Node children inherit NODE_OPTIONS and append to the same file.
import fs from 'node:fs';
import cp from 'node:child_process';
import wt from 'node:worker_threads';
import { registerHooks, syncBuiltinESMExports } from 'node:module';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = process.env.TIER_TRACE;
if (out) {
  if (typeof registerHooks !== 'function') throw new Error(`test/trace.mjs needs Node 22.15 or later (module.registerHooks), this is ${process.version}`);
  const fd = fs.openSync(out, 'a');
  const put = line => fs.writeSync(fd, `${line}\n`);
  const path = p => p instanceof URL ? fileURLToPath(p) : typeof p === 'string' ? resolve(p) : Buffer.isBuffer(p) ? resolve(String(p)) : null;
  const wrap = (o, names, kind) => {
    for (const n of names) {
      const orig = o[n];
      if (typeof orig !== 'function') continue;
      o[n] = function (p, ...rest) { const q = path(p); if (q) put(`${kind} ${q}`); return orig.call(this, p, ...rest); };
    }
  };
  const READ = ['readFile', 'readFileSync', 'open', 'openSync', 'createReadStream', 'stat', 'statSync', 'lstat', 'lstatSync', 'access', 'accessSync', 'existsSync', 'exists'];
  const LIST = ['readdir', 'readdirSync', 'opendir', 'opendirSync'];
  wrap(fs, READ, 'r'); wrap(fs, LIST, 'l');
  wrap(fs.promises, READ, 'r'); wrap(fs.promises, LIST, 'l');

  // A node child stays traced only when it keeps this environment; anything else is opaque.
  const traced = (cmd, opts) => (cmd === process.execPath || basename(String(cmd)) === 'node') && (!opts?.env || opts.env.TIER_TRACE === out);
  const optsOf = a => a.find(x => x && typeof x === 'object' && !Array.isArray(x));
  for (const n of ['spawn', 'spawnSync', 'execFile', 'execFileSync']) {
    const orig = cp[n];
    cp[n] = function (cmd, ...rest) { if (!traced(cmd, optsOf(rest))) put(`o ${cmd} ${(Array.isArray(rest[0]) ? rest[0] : []).join(' ')}`.trim()); return orig.call(this, cmd, ...rest); };
  }
  for (const n of ['exec', 'execSync']) {
    const orig = cp[n];
    cp[n] = function (cmd, ...rest) { put(`o ${cmd}`); return orig.call(this, cmd, ...rest); };
  }
  const fork = cp.fork;
  cp.fork = function (mod, ...rest) { if (!traced(process.execPath, optsOf(rest))) put(`o fork ${mod}`); return fork.call(this, mod, ...rest); };
  const W = wt.Worker;
  wt.Worker = class extends W { constructor(f, o) { put(`o worker ${f}`); super(f, o); } };
  syncBuiltinESMExports();

  registerHooks({ load(url, ctx, next) { if (url.startsWith('file:')) put(`r ${fileURLToPath(url)}`); return next(url, ctx); } });
}
