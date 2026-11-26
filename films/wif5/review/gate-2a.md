# Gate 2a · Story + timing lock

**OPEN**

| Kind | Evidence | OK | Why |
| --- | --- | --- | --- |
| measured | prepro.mjs --gate 2a | FAIL | exit 1: films/wif5/review/prepro.md: FAIL · 5 FAIL, 43 WARN · 46 shots, 100.5 s · review/intensity.svg, review/shots.csv |
| measured | run logs (logline.mjs --check) | PASS | append-only |
| made | review/watch-1x.md | PASS | ok |
| judged | review/retell.md | PASS | of review/previs/animatic.mp4 (100.5 s, grey blockout with set labels, no on-screen text), read as 40 frames at 2.5 s |
| judged | review/swipe.md | PASS | of review/previs/animatic.mp4 (100.5 s) with its audio (count 0-11 s, score under), sampled every 2.5 s plus the part-cut frames |
| approved | review/approvals.json | FAIL | reviewer agent:ep1-prepro-review says NOT READY, not READY |

measured = tools · made = the maker's files · judged = an independent reviewer · advisory = shown, never blocks · approved = an independent reviewer (verdict READY). LOCK needs all four.
