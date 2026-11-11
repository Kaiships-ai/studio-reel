# allout: the reference-look build (ep 1 first)

Goal: a stick-man episode a viewer cannot tell from the reference. The kit's own sets, props, camera planner and gates
stay as they are; an act opts in with two keys.

| Key (act data) | What it does | File |
|---|---|---|
| `setModule: '/styles/stick-man/allout/sets/<name>.js'`, `setOpts` | builds the place from this folder instead of `lib/sets` | engine/play.js (hook) |
| `direct: [shots]` | hand-directed camera: every shot has `intent` + `why`, cuts are cuts, a move starts on a word | director.js |
| `make: { x: { kind: 'ao_anim', prop: 'x' } }` | keys a set prop's own animation (`set` beats) | fx.js |
| `make: { x: { kind: 'ao_follow', prop: 'x', at: { head: 'kip', up, fwd } } }` | a prop that rides an actor (the medal) | fx.js |
| reel `look: { ao, aoRadius, shadowRadius, shafts }` | GTAO contact shadows, softer sun shadow, light haze | engine/look.js (default off) |
| `import '/styles/stick-man/allout/handprops.js'` | glass beaker and gold medal hand props (no ink) | handprops.js |

Look rules the sets follow: physically lit standard materials (never toonified, never inked: only the cast is inked),
bevelled edges, an image-based fill per place (`envMap` panels = its windows and lamps), one warm key + practical
lamps against a cool fill, a painted self-lit backdrop for skies and streets, and story props built into the set
with their own keys.

Sets: `lab-night` (also `setOpts: { mode: 'day' }`), `perth`, `micro`, `hall`, `pigpen`, `kitchen`, `clinic`,
`stomach`, `nobel`. Film: `films/sf-ep01-allout/` (local data).
