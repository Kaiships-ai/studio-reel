// K1 story lock (prepro.mjs): what changed between Kai's locked scene feels / story scores and the shot list now.
// lock and now: { scenes: [[id, feel]], shots: [[id, story, scene]] } (locks.json keeps the lock's copy next to its hash;
// a lock written before scene ids were kept has [id, story] and skips the scene check, reported in `info`).
// changed: anything Kai must confirm again: a scene feel, an existing shot's score or scene, a removed or reordered shot,
// an added shot whose score is outside its two nearest locked neighbours' (inclusive; at either end of the film: equal
// to the one neighbour), or more than MAX_PER_GAP shots added between the same two locked shots.
// added: the shots added after the lock that pass. info: notes for the report.
export const MAX_PER_GAP = 2;

export function storyLockDiff(lock, now) {
  if (!Array.isArray(lock?.shots) || !Array.isArray(lock?.scenes)) return { changed: ['unknown'], added: [], info: [] };
  const changed = [], added = [], info = [];
  const lf = new Map(lock.scenes), nf = new Map(now.scenes);
  for (const [id, feel] of lf) if (!nf.has(id)) changed.push(`scene ${id} removed`); else if (nf.get(id) !== feel) changed.push(`scene ${id} feel`);
  for (const id of nf.keys()) if (!lf.has(id)) changed.push(`scene ${id} added`);
  const ls = new Map(lock.shots.map(s => [s[0], s])), cur = now.shots;
  const sceneIds = lock.shots.every(s => s.length >= 3);
  if (!sceneIds) info.push('the lock has no scene ids: moving a locked shot to another scene is not checked (re-lock with Kai to check it)');
  for (const [id, story, scene] of lock.shots) {
    const hit = cur.find(s => s[0] === id);
    if (!hit) { changed.push(`${id} removed`); continue; }
    if (String(hit[1]) !== String(story)) changed.push(`${id} story ${story} → ${hit[1]}`);
    if (sceneIds && String(hit[2]) !== String(scene)) changed.push(`${id} moved from scene ${scene} to ${hit[2]}`);
  }
  const order = lock.shots.map(s => s[0]).filter(id => cur.some(s => s[0] === id)), kept = cur.map(s => s[0]).filter(id => ls.has(id));
  if (order.join() !== kept.join()) changed.push('locked shots reordered');
  const gaps = new Map();
  cur.forEach(([id, story], i) => {
    if (ls.has(id)) return;
    const prev = cur.slice(0, i).reverse().find(s => ls.has(s[0])), next = cur.slice(i + 1).find(s => ls.has(s[0]));
    const gap = `${prev?.[0] ?? 'start'}…${next?.[0] ?? 'end'}`; gaps.set(gap, [...(gaps.get(gap) || []), id]);
    const near = [prev, next].filter(Boolean).map(s => Number(s[1])), v = Number(story);
    const ok = near.length && Number.isFinite(v) && v >= Math.min(...near) && v <= Math.max(...near);
    if (ok) added.push(id); else changed.push(`${id} added with story ${story} outside its neighbours (${[prev, next].filter(Boolean).map(s => `${s[0]} ${s[1]}`).join(', ') || 'none'})`);
  });
  for (const [gap, ids] of gaps) if (ids.length > MAX_PER_GAP) {
    changed.push(`too many shots added in one gap (${ids.length} between ${gap}, max ${MAX_PER_GAP}): re-lock with Kai`);
    for (const id of ids) { const k = added.indexOf(id); if (k >= 0) added.splice(k, 1); }
  }
  return { changed, added, info };
}
