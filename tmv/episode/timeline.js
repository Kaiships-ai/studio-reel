// timeline.js: what every episode engine (3D, paper, hand-draw; episode/engines.mjs) shares, with no drawing in it.
// loadEpisode() reads the episode the page is served from; timeline() turns it and its voice into shots cut on word
// starts, word-timed captions and the HUD at time t. The gates (episode/gates.py) measure these cuts.

// an episode of a series (episode/series.mjs) shares the show's name, cast, palette and texts from ../series.json
export async function loadEpisode() {
  const SER = await fetch('../series.json').then(r => r.ok ? r.json() : {}).catch(() => ({}));
  const EP0 = await (await fetch('episode.json')).json();
  const EP = { ...EP0, series: EP0.series ?? SER.series, cast: EP0.cast ?? SER.cast, style: EP0.style ?? SER.style ?? '3d',
    palette: { ...(SER.palette ?? {}), ...(EP0.palette ?? {}) }, texts: { ...(SER.texts ?? {}), ...(EP0.texts ?? {}) } };
  const VO = await (await fetch('vo/vo.json')).json();
  return { EP, VO };
}

// each cast entry over its seed (characters/cast.js TMV_SEEDS): the card core/character-card.mjs reads
export const cardsOf = (EP, seeds) => Object.fromEntries(EP.cast.map(m => [m.id, { ...(seeds[m.seed] ?? {}), ...m }]));
export const inCorner = (c) => (c.place ?? (c.role === 'rival' ? 'corner' : 'room')) === 'corner';
const isBot = (c) => c.kind === 'bot';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ss = (x) => x * x * (3 - 2 * x);
const lerp = (x, y, t) => (1 - t) * x + t * y;
const NUM = /^(\d[\d,.]*|one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand|million|half|zero)$/i;

export function timeline(EP, VO, cards) {
  const lead = Object.keys(cards).find(id => !inCorner(cards[id]) && !isBot(cards[id]));
  // one beat per voiced line, the vote holds 1.4 s after the last
  const LINES = VO.lines, DUR = VO.duration + 1.4;
  const BEATS = EP.beats.map((b, i) => ({ ...b, i, j: 0, a: i ? LINES[i].s - 0.12 : 0, b: i + 1 < LINES.length ? LINES[i + 1].s - 0.12 : DUR, ls: LINES[i].s, le: LINES[i].e }));
  // A cut every 2.6 s at most (the real season cut every 2 s): a story beat longer than that splits on word starts into
  // sub-shots that cut between its own angle and a cover angle, and the first beat cuts by 1.5 s. The vote card lies
  // over the last beat's shots.
  const MAXSHOT = 2.6, FIRSTCUT = 1.5;
  const coverOf = (b) => { const c = cards[b.who];
    if (!['close', 'two', 'wide', 'room', 'phone'].includes(b.shot)) return undefined;
    if (c && inCorner(c)) return { close: 'wide', two: 'close', wide: 'close' }[b.shot];
    if (c && isBot(c)) return b.shot === 'close' ? 'two' : 'close';
    if (c && b.who !== lead) return b.shot === 'wide' ? 'two' : 'wide';
    return { close: 'phone', phone: 'close', two: 'close', wide: 'close', room: 'close' }[b.shot]; };
  // A card holds up to 4 s (the season's cards held 2.5-3.6 s); a longer card beat opens on its speaker's close (cut like
  // any story shot) and the card lands on the first sentence that leaves it 2-4 s, else 2.6 s before the beat ends.
  const CARDMAX = 4.0;
  function cardSplit(b) {
    const ws = VO.words.filter(w => w.line === LINES[b.i].id), ok = x => x > b.a + 0.9 && x < b.b - 0.9;
    const at = ws.map((w, k) => ({ x: w.s - 0.12, sentence: k > 0 && /[.!?]$/.test(ws[k - 1].w) })).filter(c => ok(c.x));
    const cut = at.find(c => c.sentence && b.b - c.x >= 2 && b.b - c.x <= CARDMAX)?.x ?? at.sort((p, q) => Math.abs(p.x - b.b + MAXSHOT) - Math.abs(q.x - b.b + MAXSHOT))[0]?.x;
    if (cut === undefined) return [b];
    const head = split({ ...b, shot: 'close', b: cut });
    return [...head, { ...b, j: head.length, a: cut }];
  }
  function split(b) {
    if (['card', 'stats'].includes(b.shot) && b.b - b.a > CARDMAX) return cardSplit(b);
    const cover = coverOf(b);
    if (!cover || b.b - b.a <= (b.i ? MAXSHOT : FIRSTCUT)) return [b];
    const starts = VO.words.filter(w => w.line === LINES[b.i].id).map(w => w.s - 0.12);
    const n = Math.ceil((b.b - b.a) / MAXSHOT), cuts = [];
    let from = b.a;
    for (let k = 1; k < n; k++) {
      const want = b.i || k > 1 ? b.a + (b.b - b.a) * k / n : Math.min(b.a + FIRSTCUT, b.a + (b.b - b.a) / n);
      const at = starts.filter(x => x > from + 0.9 && x < b.b - 0.9).sort((x, y) => Math.abs(x - want) - Math.abs(y - want))[0];
      if (at !== undefined) { cuts.push(at); from = at; }
    }
    return [b.a, ...cuts].map((a, j, all) => ({ ...b, j, shot: j % 2 ? cover : b.shot, a, b: all[j + 1] ?? b.b }));
  }
  const SHOTS = BEATS.flatMap(split);
  const shotOf = (t) => SHOTS.find(s => t >= s.a && t < s.b) ?? SHOTS[SHOTS.length - 1];
  // caption words; a number, a vote tag or a beat's "hot" word is drawn in the accent
  const WORDS = VO.words.map(w => { const bi = LINES.findIndex(l => l.id === w.line), hot = (EP.beats[bi]?.hot ?? []).map(s => s.toLowerCase());
    const bare = w.w.replace(/[^\w'-]/g, '').toLowerCase(); return { ...w, hot: NUM.test(bare) || /^[AB]$/.test(w.w.replace(/[^\w]/g, '')) || hot.includes(bare) }; });
  function hudAt(t) {   // every HUD label seen so far, in order; a value that changed in this beat rolls in
    const sh = shotOf(t), cur = {}, prev = {}, order = [];
    // a HUD value is "212" or { "value": "212", "bar": 0.02 (a meter under it, 0..1), "style": "danger" (the accent colour) }
    const norm = (v) => typeof v === 'object' && v !== null ? { val: String(v.value), bar: v.bar, danger: v.style === 'danger' ? 1 : 0 } : { val: String(v) };
    for (const b of BEATS) { if (b.i > sh.i) break; for (const [k, v] of Object.entries(b.hud ?? {})) { if (!order.includes(k)) order.push(k); prev[k] = cur[k]; cur[k] = norm(v); } }
    const changed = new Set(Object.keys(EP.beats[sh.i].hud ?? {})), k_ = ss(seg(t, sh.ls, sh.ls + 0.5));
    return { items: order.map(k => ({ label: k, val: cur[k].val, from: changed.has(k) && prev[k] && prev[k].val !== cur[k].val ? prev[k].val : null, k: k_, danger: cur[k].danger ?? 0,
      bar: cur[k].bar == null ? undefined : (changed.has(k) && prev[k]?.bar != null ? lerp(prev[k].bar, cur[k].bar, k_) : cur[k].bar) })) };
  }
  return { lead, LINES, DUR, BEATS, SHOTS, shotOf, WORDS, hudAt, LAST: SHOTS[SHOTS.length - 1] };
}
