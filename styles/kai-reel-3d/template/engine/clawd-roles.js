// clawd-roles.js: Clawd's casting. Data = roles/data.js (the casting sheet); builds = one file per batch in roles/.
export { ROLES } from './roles/data.js';
// ---- builds: one file per batch in engine/roles/, merged here
import { BUILD as pilot } from './roles/pilot.js';
const BATCHES = [pilot];
const ROLE_FILES = ['office-job', 'meme-culture', 'shark', 'ninjago', 'creator-anime', 'tech-internet', 'seasons', 'game-sport', 'movie-history', 'office2', 'life-vn'];
const loaded = await Promise.all(ROLE_FILES.map(f => import(`./roles/${f}.js`).then(m => m.BUILD).catch(() => ({}))));
const BUILD = Object.assign({}, ...BATCHES, ...loaded);
export const builtRoles = () => Object.keys(BUILD);
export function applyRole(clawd, id, opts = {}) { clawd.opts = opts; const f = BUILD[id]; if (!f) throw new Error('role not built yet: ' + id); f(clawd); return clawd; }
