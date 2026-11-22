# Stick-man colour gate

`styles/stick-man/tools/gates/colourgate.mjs` checks the final render of a stick-man film against the film's own colour
script, `films/<slug>/colour-script.json`, and blocks gate ◇5 (Deliver) through its row in
`styles/stick-man/tools/gates/GATES.json`. A look the script declares passes. A colour change the script does not motivate
fails.

The colour script is written at [1.7] from `.claude/skills/make-reel-stick-man/templates/colour-script.json`. It holds
one scene per place or time, back to back, with these fields:

- An `intent` line for each scene.
- `rb`, `sat` and `black` ranges.
- `hues`, the hue families a scene may show beyond the palette.
- `flood`, the families that may fill the frame.
- `luma`, the scene's brightness range (median luma). A night scene may be dark; there is no film-wide floor.
- `hero: false` where the white-clad hero is absent.
- `events`, the light events (a muzzle flash, a lamp switched off) that may jump.

`palette.signature` and `palette.offColor` name hue families. For Hot Money they are `warm` and `cool`, and the bible
tokens `palette.signature` and `palette.offColor` point at `color.amber` and `color.police.blue` (Kai 21/11).

## Sub-features

- Shots come from the hard cuts that `cutgate.mjs` finds on the mp4, the script's `cuts` and every scene start.
  Samples are taken at 10 a second, at 144x256, with the HUD bands cropped (script `crop`, default top 10 %, bottom 12 %).
- G1 cut step: shot-median luma and HSV saturation across a cut. In one scene the limit is 25 and .15. At a scene
  change it is 50 and .25.
- G2 in-shot step: a luma change over 25 within 0.5 s inside one shot.
- G3 cast: shot R/B (mean red over mean blue) outside the scene range (default 0.8-1.6).
- G4 saturation: shot S outside the scene range (default .25-.7).
- G5 hero white: where the white proxy (luma over 140, chroma under 15 %) covers 5 % of the frame or more, its luma
  must be at least 175 and its R/B within .95-1.10.
- G6 black level: the 2nd percentile luma outside the scene range (default 10-26).
- G7 flood: one hue family at 90 % of the coloured pixels for over 3 s, unless the scene lists it in `flood`.
- G8 palette: over 20 % of the coloured pixels in a family that is neither the palette's nor in the scene's `hues`.
- G9 brightness: each scene's median luma outside its `luma` range. A scene without `luma` is listed under the check
  table as unchecked. The film-wide floor (mean luma, dark seconds) runs only when the script sets `defaults.film`;
  the bible's Rick luma tokens are a reference, not a gate (Kai 22/11, look A).
- A light event (top-level `events` or a scene's) exempts G1 and G2 in its window.
- Verdicts: PASS, FAIL (a finding not waived) or DRAFT (no finding, but the script has no
  `approved: { by: "kai", at }`). Only PASS exits 0.
- Waiver: an approved `DECISIONS.json` entry `{ "waives": "colourgate.G9", "by": "kai", "at", "status": "approved" }`
  clears every finding of that check, read with `kituse.mjs`'s `waiverFor`.

## How to get to it (user POV)

At stage 5, `node styles/stick-man/tools/gates/stagegate.mjs films/<slug> 5` runs `colourgate.mjs` on the newest final
render in `renders/`, the same file `cutgate.mjs` checks. A film with no `colour-script.json` fails with the template
path. A FAIL or a DRAFT keeps ◇5 OPEN.

- Value gate (`tools/gates/valuegate.mjs`, Kai 22/11: a burnt glare patch round a door, subjects that must read): samples
  the mp4 at 4 fps, HUD bands cropped. Glare: the blurred picture is >= 200 luma and >= 90 above the frame's median on
  more than 3 % of the frame (a hot pool, not an evenly lit day lobby), or > 1 % of pixels at the clip, held >= 0.5 s.
  Crushed subject: > 8 % of a subject's box at luma <= 10 (boxes from the rows' head boxes, widened and run down for the
  body), held >= 0.5 s. It runs at ◇5 beside colourgate (`GATES.json`): `node styles/stick-man/tools/gates/valuegate.mjs
  films/<slug>` (final render, review/shot-rows.jsonl) or `--mp4 <file> --rows <rows.jsonl>`; exits 1 on a fault; `test/unit/stick-valuegate.test.mjs` covers a hot pool, an even bright frame, a crushed and a lit subject, a flash.

## Driving it

- Film: `node styles/stick-man/tools/gates/colourgate.mjs films/<slug>` writes `review/colourgate.md` (verdict, one row per
  check, every finding with its shot, time, number and limit, and a per-shot table) and `review/colour.json`.
- Any mp4: `node styles/stick-man/tools/gates/colourgate.mjs --mp4 <file> --script <colour-script.json> [--decisions <json>]`
  prints the same report, and `--json 1` prints JSON.
- Look for: Hot Money ep01 A v6 (`hm-ep01_A_v6.mp4`, 90.1 s) with the draft script in the PR that added the gate.
  It FAILs with LOAD-A R/B 1.98, the LOAD-A dim at 10.3 s, the LOAD-A to LOAD-B step at 16.7 s and the day-two hero
  white at 162-167. Its film mean luma of 95 no longer fails: brightness is per scene now. OPEN magenta and the night chase pass, because the script declares them.
  The run takes about 4 s.
- Regression: `node --test test/unit/stick-colourgate.test.mjs`. It has one synthetic clip per check that fails only
  that check, plus an approved-look pass, the waiver and the template.

## The look is lit, not graded

The script's look is made at render time in the acts (`light` colours and powers, practical lamps, `grade`). Post draws
the HUD and the locks only; a new look is a new render. `engine/play.js` warns on every act whose `grade.exp` is over
1.5 (`styles/stick-man/kit/look/exposure.js`): the multiply comes after tone mapping, so it clips and then the shoulder
flattens it. The warning shows in shot.mjs output as a `console` line. Regression: `node --test
test/unit/stick-exposure.test.mjs`.

## Gotchas

- The hero white proxy is any bright neutral pixel: white props and a white wall count as the hero. Set `hero: false`
  for a scene without the hero, or for one with a white set.
- The cut detector misses soft cuts and dissolves. A dissolve then reads as an in-shot step (G2). List the cut in the
  script's `cuts` or tag the dissolve as an event.
- HSV saturation of near-black pixels is noisy. A dark scene may need a lower `sat` floor in its script row, and the
  script records that choice where Kai approves it.
- Numbers are of the mp4 after the HUD is drawn. The HUD bands are cropped, so a HUD outside them counts as picture.
