// One heavy render at a time per machine (tools/render/shot.mjs pixel tiers take it). The lock is a JSON file the holder rewrites
// every `beatMs`. On this host a lock is stale when its process is gone (a live holder is never taken over, whatever its
// beat); from another host, when its beat is older than `ttlMs`. A stale lock is taken over by one process at a time, under
// a `<lock>.takeover` guard created exclusively, so a killed render never blocks the machine and two takers never both win.
// The lock appears whole: written to a temp file, then hard-linked into place (link fails if the lock exists). A plain
// `wx` write shows an empty file for a moment, which a racer read as stale and removed (two holders on CI, 22/11).
// A taker removes only the exact text it judged stale; a lock that is gone is created again, never removed: a racer
// could link a new lock in between, and removing "nothing" took that new holder's lock (two holders, 22/11).
// Waiters poll; the order among them is not a queue.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto';

export const LOCK = process.env.STICK_RENDER_LOCK || path.join(os.homedir(), '.cache', 'stick-man', 'render.lock');
const text = f => { try { return fs.readFileSync(f, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } };
const parse = s => { try { return JSON.parse(s); } catch { return null; } };
const read = f => parse(text(f));
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

export function stale(L, now = Date.now(), ttlMs = 120000) {
  if (!L) return true;
  if (L.host === os.hostname()) return !alive(L.pid);
  return now - L.beat > ttlMs;
}

// one try: { ok, lock } or { ok: false, holder }
export function tryLock({ file = LOCK, what = '', ttlMs = 120000, now = Date.now() } = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const me = { token: crypto.randomUUID(), host: os.hostname(), pid: process.pid, what, started: now, beat: now };
  for (let i = 0; i < 3; i++) {
    if (create(file, me)) return { ok: true, lock: me };
    const was = text(file); if (was === null) continue;   // freed meanwhile: create again
    const L = parse(was);
    if (!stale(L, now, ttlMs)) return { ok: false, holder: L };
    if (!takeover(file, was)) return { ok: false, holder: L };
  }
  return { ok: false, holder: read(file) };
}

// put `me` at `file` whole, or false when a lock is already there
function create(file, me) {
  const tmp = `${file}.${me.token}.new`;
  fs.writeFileSync(tmp, JSON.stringify(me));
  try { fs.linkSync(tmp, file); return true; }
  catch (e) { if (e.code !== 'EEXIST') throw e; return false; }
  finally { fs.rmSync(tmp, { force: true }); }
}

// remove the stale lock whose text is `was`, holding the guard; false when another process is taking it over
const GUARD_MS = 30000;
function takeover(file, was) {
  const guard = file + '.takeover';
  try { fs.writeFileSync(guard, String(Date.now()), { flag: 'wx' }); }
  catch (e) {
    if (e.code !== 'EEXIST') throw e;
    // a guard left by a taker that died mid-takeover (a takeover takes milliseconds)
    let at = NaN; try { at = Number(fs.readFileSync(guard, 'utf8')) || NaN; } catch {}
    if (Date.now() - at > GUARD_MS) fs.rmSync(guard, { force: true });
    return false;
  }
  // only a guard holder removes a lock and the file exists while we hold it, so nobody can create between read and remove
  try { if (text(file) === was) fs.rmSync(file, { force: true }); }
  finally { fs.rmSync(guard, { force: true }); }
  return true;
}

export function beat(file, lock, now = Date.now()) {
  const L = read(file); if (L?.token !== lock.token) return false;
  const tmp = `${file}.${process.pid}.tmp`; fs.writeFileSync(tmp, JSON.stringify({ ...L, beat: now })); fs.renameSync(tmp, file); return true;
}

export function release(file, lock) { if (read(file)?.token === lock.token) fs.rmSync(file, { force: true }); }

// wait up to waitMs for the lock, then hold it with a heartbeat until release() or exit
export async function acquire({ file = LOCK, what = '', ttlMs = 120000, beatMs = 20000, waitMs = 3600000, pollMs = 2000, log = console.log } = {}) {
  const t0 = Date.now(); let said = false;
  for (;;) {
    const r = tryLock({ file, what, ttlMs });
    if (r.ok) {
      const timer = setInterval(() => beat(file, r.lock), beatMs); timer.unref();
      const done = () => { clearInterval(timer); release(file, r.lock); };
      process.once('exit', done);
      return { ...r.lock, release: done };
    }
    if (Date.now() - t0 > waitMs) throw new Error(`render lock ${file} held by ${r.holder?.what || '?'} (pid ${r.holder?.pid} on ${r.holder?.host}) for over ${Math.round(waitMs / 1000)} s`);
    if (!said) { log(`waiting for the render lock (${r.holder?.what || '?'}, pid ${r.holder?.pid} on ${r.holder?.host})`); said = true; }
    await new Promise(res => setTimeout(res, pollMs));
  }
}

// free disk in GB where `dir` lives
export function freeGB(dir) { const s = fs.statfsSync(dir); return s.bavail * s.bsize / 1e9; }
