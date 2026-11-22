# Stick-man kit use gate

`styles/stick-man/tools/gates/kituse.mjs` blocks ◇4 and ◇5 of a stick-man film that skips a kit feature every film needs.
One row per feature in `KIT`; `stagegate.mjs` runs it from `GATES.json` (gate 4 with `--gate 4`, gate 5 with `--gate 5`).

## Sub-features

- `life` (◇4, ◇5): every act's `style` sets the moving-hold dial `life` above 0, as an object
  (`{ ...STYLE_PRESETS.kaiships, life: 0.75 }`) or a preset that carries it. A preset name without it fails, though the
  engine's default 0.75 would play: the dose is a choice on record.
- `depth` (◇4, ◇5): at least one act has `backdrop: { rows, tint }` with rows, or its `setModule` calls `backdrop(`.
- `sound-plan` (◇5): `audio/sound-plan.json` exists (its contents are `postcheck.mjs` S1-S4).
- `music` (◇5): `audio/levels.txt` was written by the kit mixer (`mix.py`), its line 2 names a `track`, not a placed stem
  or none, and every track file's name (without extension) is in `CREDITS`.
- `refbench` (◇5): `review/refbench.json` is the `refbench.mjs` row of the final render (`renders.mjs` `finalRender`),
  its `source` is that file and it is newer. On PASS, `review/kituse.md` ends with the film vs Rick gap table.
- Waiver: an approved `DECISIONS.json` entry `{ "waives": "<feature>", "by": "kai", "at": "<date>", "status": "approved" }`
  turns that FAIL into a PASS that prints who waived it and when. Only Kai can waive: `by` must be `kai` (an agent's name does not count), with a date and `approved`.

## How to get to it (user POV)

`node styles/stick-man/tools/gates/stagegate.mjs films/<slug> 4` (or `5`); alone: `node styles/stick-man/tools/gates/kituse.mjs films/<slug> --gate 4|5`.

## Driving it

- `node --test test/unit/stick-kituse.test.mjs`: a complete film passes ◇5 with its bench table; each missing feature
  fails with its reason; ◇4 checks only `life` and `depth`; a waiver passes only when approved, signed and dated.
- Hot Money ep01 (`films/hm-ep01`, its imports in `shared/r2` to `r4`):
  `kituse.mjs films/hm-ep01 --gate 5` passes `life` and `depth`; it fails `sound-plan`, `music` and `refbench` until
  their files are written. About 1 s.

## Gotchas

- The acts load through `reel_load.mjs`, so every film a reel imports (`/films/<other>/...`) must be on disk.
- `finalRender` picks the highest `_vN` by name: in a folder with `head_v2.mp4` and `tail_v2.mp4` beside the joined cut it
  can pick a part. Name the joined cut `final*.mp4`.
