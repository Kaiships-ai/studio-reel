// One heavy render at a time per machine (tools/shot.mjs pixel tiers take it). The lock is a JSON file the holder rewrites
// every `beatMs`; a lock whose beat is older than `ttlMs`, or whose holder on this host is gone, is stale and taken over,
// so a killed render never blocks the machine for good. Waiters poll; the order among them is not a queue.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto';

export const LOCK = process.env.STICK_RENDER_LOCK || path.join(os.homedir(), '.cache', 'stick-man', 'render.lock');
const read = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

export function stale(L, now = Date.now(), ttlMs = 120000) {
  if (!L) return true;
  if (now - L.beat > ttlMs) return true;
  return L.host === os.hostname() && !alive(L.pid);
}

// one try: { ok, lock } or { ok: false, holder }
export function tryLock({ file = LOCK, what = '', ttlMs = 120000, now = Date.now() } = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const me = { token: crypto.randomUUID(), host: os.hostname(), pid: process.pid, what, started: now, beat: now };
  for (let i = 0; i < 3; i++) {
    try { fs.writeFileSync(file, JSON.stringify(me), { flag: 'wx' }); return { ok: true, lock: me }; }
    catch (e) { if (e.code !== 'EEXIST') throw e; }
    const L = read(file);
    if (!stale(L, now, ttlMs)) return { ok: false, holder: L };
    // take a stale lock over only if it is still the one we judged stale
    try { if (JSON.stringify(read(file)) === JSON.stringify(L)) fs.rmSync(file, { force: true }); } catch {}
  }
  return { ok: false, holder: read(file) };
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
