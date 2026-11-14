# Stick-man costume: the grey hoodie

A stick-man cast entry (or its spec) wears `costume: ['hoodie:grey']` (hood up) or `['hoodie:grey:down']` (hood folded
on the upper back). The garment replaces the torso's surface and bends with the spine; the hood is skinned between chest
and head; with `PHYS.on` the hood's back peak springs and the cords swing (`allout/cloth.js`). A cast entry without a
costume renders exactly as before.

## Sub-features

- `hoodie:grey`: garment, hood shell from `styles/stick-man/assets/costume/hoodie_grey.glb`, face rim, cowl, two cords.
- `hoodie:grey:down`: garment, rolled collar and the folded hood pad; a cap from the spec's `hair` sits on the head.
- A spec's own `costume` is worn by default (`engine/play.js`: `c.costume ?? SPECS[c.spec].costume`).
- `?hoodstats` in the page query logs `HOODIE {pen, p99, lag, cord, ...}` per frame (hood up only).

## How to get to it (user POV)

In a film's `reel.js`: `import '/styles/stick-man/allout/costume.js'; import '/styles/stick-man/allout/hoodie.js'`, then a
cast entry `{ spec: 'ENGINEER', costume: ['hoodie:grey'] }`. Give the spec `hair: []` for the hood up (a hair cap is bigger
than the hood's clearance).

## Driving it

- A sheet: a film with six static figures (hood up at yaw 0/45/90/180, hood down with a red `flatCap`), one direct shot per
  frame, then `node styles/stick-man/tools/shot.mjs --film films/<name> --frames 0-5 --w 540 --h 960 --out f_%d.png`.
- Numbers: add `--query hoodstats=1` on a moving shot and read the `HOODIE` lines: `pen` 0 (cm into the body), `p99`
  under 0.15 (edge stretch), `cord` about 0.
- Regression: `node --test test/unit/stick-cloth.test.mjs`; `node .claude/skills/verify/draft.mjs films/verify-smoke`.

## Gotchas

- `hoodie.js` loads the glb with top-level await from `/styles/stick-man/assets/...`: the page must be served from the
  library root (shot.mjs does this).
- A still that does not follow the previous frame starts the springs from rest, so a frame renders the same alone or in
  a run.
- Known open looks (the source build's self-check): a few-pixel background sliver at the back shoulder junction, busy
  throat lines at extreme close-up, and the far brow can read cut under the brim.
