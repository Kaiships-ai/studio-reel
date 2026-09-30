// kitenv.mjs: reads .kit-env.json (written by setup.mjs): where Chrome, ffmpeg and the Python venv live.
// Paths inside the kit are stored relative to it, so the folder can be moved or renamed.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = dirname(fileURLToPath(import.meta.url));
export const ENV_FILE = resolve(ROOT, '.kit-env.json');

export function loadEnv() {
  if (!existsSync(ENV_FILE)) return {};
  let raw;
  try { raw = JSON.parse(readFileSync(ENV_FILE, 'utf8')); } catch { return {}; }
  const env = {};
  for (const k of ['chrome', 'ffmpeg', 'python']) {
    if (!raw[k]) continue;
    // a bare command name ("ffmpeg") is looked up on PATH; anything else is a file that must still exist
    const bare = !/[\\/]/.test(raw[k]), p = bare || isAbsolute(raw[k]) ? raw[k] : resolve(ROOT, raw[k]);
    if (bare || existsSync(p)) env[k] = p;
  }
  return env;
}
