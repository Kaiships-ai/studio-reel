# Reel data (`films/<slug>/storyboard.json`, `reel.js`, `reel2.js`)

## Storyboard (`storyboard.json`, written after align, before reel data)

One entry per `vo/script.json` line; the reel data is built to it and the story gates check it (GATES.md).

```json
{ "film": "<slug>", "lines": [
  { "id": "l05", "see": "On the street a countdown clock ticks beside his bag, the bag glows red, then explodes.",
    "shot": "ms", "set": "street", "props": ["bag"], "fx": ["dial", "glow", "burst"], "still": "explodes" } ] }
```

| Key | Meaning |
|---|---|
| `see` | one sentence: what a viewer with the sound off must see on this line |
| `shot` | two, ms, cu, insert, wide, follow, cutaway (plan; the gate reads the real shot from `__dbg`) |
| `set` | the set the line plays on |
| `props`, `fx` | set prop names and `make` effect names on screen in this line (each must be seen ≥ 3 frames) |
| `still` (`on` also read) | optional: the word board still A is taken on (default the middle word); pick the word the key thing is on screen (reel 1 l05: `explodes`, not `later`) |
| (B) | board still B is the line's fx peak: the frame where most of its `props` / `fx` are seen, so list what carries the line |

Plan it so: ≥ 3 sets or cutaways in 30 s, never 3 lines in a row on the same set + shot, ≥ 40 % of lines with a prop or fx,
and every process the words describe drawn with an explainer fx (VERBS.md). Full example: `examples/dye-pack/storyboard.json`.

Plain data modules, no code beyond small helpers. The runtime (`styles/stick-man/engine/play.js`) reads `reel.js`, then
`reel2.js` if present, and `vo/words.json`; every frame is a pure function of its number.

## `reel.js`: the first act

| Key | Type | Meaning |
|---|---|---|
| `title` | string | film title |
| `fps` | 30 | always 30 |
| `frames` | `[first, last]` | this file's frames; with one act, `last` = the last frame from `vo/voice-qa.md` |
| `set` | string | `bank-lobby`, `street`, `cutaway`, `park`, `lab` (SETS.md) |
| `use` | list | opt-in set props, e.g. street `['police', 'bag']` (none by default) |
| `lines` | ids | the `vo/script.json` lines this file covers, in order (captions come from them) |
| `cast` | `{ name: { spec, at, yaw, expr, focus, posture, watch, head_tilt } }` | who is in the act |
| `beats` | list | what happens, on which word (VERBS.md) |
| `shots` | list | camera, on which word (VERBS.md, Shots) |
| `make` | `{ name: { kind, ... } }` | effects for this act (optional) |
| `name`, `show`, `zRange`, `sun` | optional | as in an act below (`name` defaults to `lobby`) |

## `reel2.js`: more acts

`export default { title, frames: [first, last], lines, acts: [act, ...], amend: [] }`. Each act is
`{ name, set, use, zRange, show, cast, make, beats, shots }`. `show: [{ from, dissolve }]` = the frames (or `{ line, on }`)
where this act comes on; `dissolve` frames (default 7, `0` = hard cut). An act can come back (`show` with two entries).
`amend: [{ act, beats, shots }]` adds to an earlier act. Helper for word-timed entries:
`const at = (line, on, offset = -2, nth) => ({ line, on, offset, ...(nth ? { nth } : {}) });` then `{ ...at('l05', 'ten'), who: ..., do: ... }`.

## Minimal worked example (from `styles/stick-man/examples/dye-pack/reel.js`)

Two script lines ("He robs a bank, and the teller HELPS him pack the bag." / "She doesn't scream. ...") become:

```js
export default {
  title: 'Dye pack', fps: 30, frames: [0, 344], set: 'bank-lobby', lines: ['l01', 'l02'],
  cast: {
    kai: { spec: 'KAI', at: 'customer', yaw: 30, expr: 'smug', focus: 'teller' },
    teller: { spec: 'TELLER', at: 'teller', yaw: -35, expr: 'calm', focus: 'kai' },
  },
  beats: [
    { f: 0, who: 'kai', do: 'hold', prop: 'bag', hand: 'R', to: 'bag_grip', offW: [0.10, -0.03, -0.01], fade: 0 },
    { line: 'l01', on: 'robs', who: 'kai', do: 'slide', prop: 'note', hand: 'L', to: 'note_end', handOn: true },
    { line: 'l01', on: 'helps', offset: -8, who: 'teller', do: 'drop_in', prop: 'b1', hand: 'L', look: 'kai', carry: 19 },
    { line: 'l02', on: 'lifts', who: 'teller', expr: 'happy', do: 'lift', prop: 'stack', hand: 'L', up: 0.13 },
    { line: 'l02', on: 'drops', offset: -4, who: 'teller', do: 'drop_in', prop: 'stack', hand: 'L', strength: 0.8 },
  ],
  shots: [
    { f: 0, shot: 'two', of: ['kai', 'teller'], angle: -26 },
    { line: 'l02', on: 'she', shot: 'cu', of: ['teller'], angle: 8, head: 0.27, push: 0.0010, live: 0.35, kx: 0.52 },
  ],
};
```

## Craft rules from reel 1

| Rule | Why |
|---|---|
| Every spoken line gets one visible action on its key word; a beat every 1-2 s | clear frames ≥ 94 %, frozen ≤ 8 f |
| Frame 0 is mid-action (a prop already in hand) | the hook lands on frame 0 |
| New shot every 2-4 s; `cu` on a reaction, `two` for an exchange, `ms` + `track` for a walk | camera ≤ 25 px/f, no dead holds |
| A change of place = a new act with a hard cut (`dissolve: 0`) on the word | no double exposure |
| An explainer (how a thing works) = a `cutaway` act with props only, kept ≤ 45 frames per insert, or with a figure in frame | small-figure gate |
| Gestures only with an empty hand; `hold` a prop before a `walk_to` with `carry` | gesture throws on a busy hand |
| Read the error: `beat: no "<word>" #1 in l03` = `on` is not a spoken word of that line | |
| A syntax error in `reel.js` / `reel2.js`: `shot.mjs` runs `node --check` first and prints the line; by hand `node --check films/<slug>/reel.js` | the page only says `pageerror` |
| A quoted line (someone speaks): show the speaker saying it to the listener, both in frame, with a `stamp` speech bubble (`tail`) | reel 1 l03: a smile alone was "not shown" 6/6 |
| Estimated words (`est: true` in words.json, whisper heard them differently) can carry beats but are ±3 f off; prefer the next real word | timing |

## Music (`audio/music.json`, read by `tools/sound.py`)

Section starts as seconds or `[line, word]`: `{ "playful_end": 17.6, "build": 17.7, "build_end": 21.0, "wait": ["l07", "Same"],
"see": ["l08", "Here's"], "urgent": ["l08", "warm"], "so": ["l09", "So"] }`. playful A runs to `playful_end`, a build rises
`build`-`build_end`, the bed stops dead on `wait` (the twist beat) until `see`, `urgent` drives to `so`, which resolves to the
last word. What each sounds like: `playful` = bouncy opening tune (to `playful_end`); `build` = rising riser (`build`-`build_end`);
`wait` = full stop, silence on the twist word; `see` = music back, light and curious (the explainer); `urgent` = driving
drums; `so` = two playful bars, then the resolve chord lands on the last word. Missing keys fall back to reel 1's anchors (which name reel 1's words: always write the file). `audio/levels.txt`
prints the sections it used.
