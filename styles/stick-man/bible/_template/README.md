# New series template

A series is data. A kit gate (`tools/gates/GATES.json`, `tools/gates/WHOCHECKS.json`) holds every series to the same bar; the series
folder only says what is true of this show. Kit code never names a series, and no film imports from another film
(`test/unit/stick-boundary.test.mjs`).

Copy this folder to `styles/stick-man/bible/<series>/`, rename `series.template.json` to `series.json`, and replace
every `<fill>`. `node styles/stick-man/bible/series.mjs styles/stick-man/bible/<series>/series.json` lists what is left.
Do this in a series-setup run the day before the first episode, not inside an episode run.

| Section | What goes in it |
|---|---|
| `characters` | each character: id, name, body type, role, face design, costume |
| `facesApproved` | the hash of the face sheet the person approved (`tools/series/facesheet.mjs`), the sheet path, who and when. `hash: null` = no face reaches a film |
| `palette` | ink and hero colours, the accents, colours that may never appear |
| `colourScript` | per scene: mood, key light, hue, light events that excuse a colour move (what `tools/gates/colourgate.mjs` reads) |
| `sets` | each set: id, file, day or night, what is solid |
| `sound` | music bed, sound-effect bank, mix target |
| `voice` | engine, who speaks with which voice, delivery style |
| `episodeFrame` | the shape every episode repeats: hook, beats, outro, runtime |
| `referenceClips` | clips of the look and rhythm to match: id, where from, why it is the bar |

Rules for the files in a series folder (enforced by the boundary test): JSON only holds data, so no key named like
`limit`, `threshold`, `tolerance`, `min` or `max` (a token's `value: { min, max }` colour range is data and is allowed).
A number that decides pass or fail goes in a kit gate. The kit never names the series; the series folder may name itself.
`catalog.json` and `tokens.json` (parts the show may use, design tokens) sit beside `series.json`, as in `bible/hot-money/`.
