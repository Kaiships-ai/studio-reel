// K1 story lock (prepro.mjs): what changed between Kai's locked scene feels / story scores and the shot list now.
// lock and now: { scenes: [[id, feel]], shots: [[id, story]] } (locks.json keeps the lock's copy next to its hash).
// changed: anything Kai must confirm again (a scene feel, an existing shot's score, a removed or reordered shot, or an
// added shot whose score is outside its locked neighbours'). added: shots added after the lock whose score lies between
// the two nearest locked neighbours' scores, inclusive (at either end of the film: equal to the one neighbour).
export function storyLockDiff(lock, now) {
  if (!Array.isArray(lock?.shots) || !Array.isArray(lock?.scenes)) return { changed: ['unknown'], added: [] };
  const changed = [], added = [];
  const lf = new Map(lock.scenes), nf = new Map(now.scenes);
  for (const [id, feel] of lf) if (!nf.has(id)) changed.push(`scene ${id} removed`); else if (nf.get(id) !== feel) changed.push(`scene ${id} feel`);
  for (const id of nf.keys()) if (!lf.has(id)) changed.push(`scene ${id} added`);
  const ls = new Map(lock.shots), cur = now.shots;
  for (const [id, story] of ls) {
    const hit = cur.find(s => s[0] === id);
    if (!hit) changed.push(`${id} removed`); else if (String(hit[1]) !== String(story)) changed.push(`${id} story ${story} → ${hit[1]}`);
  }
  const order = lock.shots.map(s => s[0]).filter(id => cur.some(s => s[0] === id)), kept = cur.map(s => s[0]).filter(id => ls.has(id));
  if (order.join() !== kept.join()) changed.push('locked shots reordered');
  cur.forEach(([id, story], i) => {
    if (ls.has(id)) return;
    const prev = cur.slice(0, i).reverse().find(s => ls.has(s[0])), next = cur.slice(i + 1).find(s => ls.has(s[0]));
    const near = [prev, next].filter(Boolean).map(s => Number(s[1])), v = Number(story);
    const ok = near.length && Number.isFinite(v) && v >= Math.min(...near) && v <= Math.max(...near);
    if (ok) added.push(id); else changed.push(`${id} added with story ${story} outside its neighbours (${[prev, next].filter(Boolean).map(s => `${s[0]} ${s[1]}`).join(', ') || 'none'})`);
  });
  return { changed, added };
}
