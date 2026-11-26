# Gate 2b · Shot lock (camera intent)

**OPEN**

| Kind | Evidence | OK | Why |
| --- | --- | --- | --- |
| measured | prepro.mjs --gate 2b | FAIL | exit 1: films/wif5/review/prepro.md: FAIL · 25 FAIL, 43 WARN · 46 shots, 100.5 s · review/intensity.svg, review/shots.csv |
| measured | run logs (logline.mjs --check) | PASS | append-only |
| made | review/previs/previs.md | PASS | of previs.mjs on wif5, 2026-11-26T14:27Z |
| made | review/camplan.md | PASS | ok |
| made | review/checklist7.md | PASS | ok |
| judged | review/campass1.md | PASS | of review/previs/animatic.mp4, review/shots.csv, review/camplan.md, review/checklist7.md (animation-camera-pass, OUT-1/3/4/5) |
| approved | review/approvals.json | FAIL | K1 is Kai's touchpoint: "agent:ep1-prepro-review" cannot lock it, an AI or agent verdict is advisory here |

measured = tools · made = the maker's files · judged = an independent reviewer · advisory = shown, never blocks · approved = Kai at K1. LOCK needs all four.
