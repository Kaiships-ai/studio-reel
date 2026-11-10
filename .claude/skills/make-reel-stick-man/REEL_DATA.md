# Reel data (`films/<slug>/reel.js`, `reel2.js`)

Plain data modules, no code beyond small helpers. The runtime (`styles/stick-man/engine/play.js`) reads `reel.js`, then
`reel2.js` if present, and `vo/words.json`; every frame is a pure function of its number.

## `reel.js`: the first act

| Key | Type | Meaning |
|---|---|---|
| `title` | string | film title |
| `fps` | 30 | always 30 |
| `frames` | `[first, last]` | this file's frames; with one act, `last` = the last frame from `vo/voice-qa.md` |
| `set` | string | `bank-lobby`, `street`, `cutaway` (SETS.md) |
| `lines` | ids | the `vo/script.json` lines this file covers, in order (captions come from them) |
| `cast` | `{ name: { spec, at, yaw, expr, focus, posture, watch, head_tilt } }` | who is in the act |
| `beats` | list | what happens, on which word (VERBS.md) |
| `shots` | list | camera, on which word (VERBS.md, Shots) |
| `make` | `{ name: { kind, ... } }` | effects for this act (optional) |
| `name`, `show`, `zRange`, `sun` | optional | as in an act below (`name` defaults to `lobby`) |

## `reel2.js`: more acts

`export default { title, frames: [first, last], lines, acts: [act, ...], amend: [] }`. Each act is
`{ name, set, zRange, show, cast, make, beats, shots }`. `show: [{ from, dissolve }]` = the frames (or `{ line, on }`)
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
