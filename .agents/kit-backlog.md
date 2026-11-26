# Stick-man kit backlog

These are kit gaps a film would want. Each one stopped a pair or a shot because no row passes yet. Entries come from real
builds, not wishes. Close an entry with the PR that measures it into `kit/compat.json` (or the table that owns it), then
delete the line.

Found by the kit showcase (whatif1-v5 `films/kit-showcase`, commit 94e69f7a, 27/11): six people in one lit plaza,
built only through `film.js`, using only `pass` or `accepted` pairs.

| # | Gap | What a film hits | Where it shows | Done when |
|---|---|---|---|---|
| 1 | Hand grip: lantern | `hand\|lantern\|adult\|hand` blocked, 2.43 cm off the hand | `tools/gates/handgrip.mjs` (limit 1.5 cm) | a pass row, measured |
| 2 | Hand grip: photo frame | `hand\|photo\|adult\|hand` blocked, 10.52 cm off | handgrip | a pass row, measured |
| 3 | Hand grip: baby on an elder | `hand\|baby\|elder\|hand` blocked, 3.03 cm off | handgrip | a pass row, measured |
| 4 | Hand grip: baby while pointing | the row passes, but handgrip fails at 1.82 cm in `Gest_Point_Once` | handgrip on real rows | handgrip passes the baby in every clip the row allows |
| 5 | Sitting while holding a prop | no `seat` rows exist (`hand\|tin\|adult\|seat` untested) | `kit/compat.json` | seat rows for the hand props, measured |
| 6 | Child clips beyond walk | `Idle_Breath_Loop` and `Move_Run_Fwd_Loop` blocked for child outfits | compat clip rows | idle and run pass for the child body |
| 7 | Thin and heavy bodies x clips | every `clip\|thin/...` and `clip\|heavy/...` row untested (films fake them with adult girth 0.9 / 1.35) | compat clip rows | the walk, run, sit, give and point rows measured for both bodies |
| 8 | Teen face | `face\|teen\|teen` blocked: no Kai approval of this face on this body | `review/faces-approved.json`, facesheet | Kai approves the teen face sheet |
| 9 | Marks under hats | e.g. `mark\|bold:gloom\|hat:hard` blocked (8.1 % of the mark under the hat); no clip rows for cap or hat outfits | compat mark and clip rows | the marks clear the brim; hat outfits get clip rows |
| 10 | Light rows writer | no `light\|<prop>\|<set>` rows can be written: fits says lights stay untested, and there is no writer | `tools/gates/fits.mjs`, `fits_kinds.mjs` | a kit writer fills light rows from valuegate per prop x light (approved by Studio 27/11; after hair B) |
