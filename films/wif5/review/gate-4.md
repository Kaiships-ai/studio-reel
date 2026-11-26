# Gate 4 · Shot lock

**OPEN**

| Kind | Evidence | OK | Why |
| --- | --- | --- | --- |
| measured | timing.mjs | PASS | review/timing.md: PASS · 0 FAIL, 1 WARN · |
| measured | facebeat.mjs | FAIL | exit 1: facebeat: no films/wif5/review/shot-rows.jsonl: run shot.mjs --film /Users/kienbeovl/orca/workspaces/studio-reel/whatif1-v5/films/wif5 --frames <first>-<last> --dbg films/wif5/review/shot-rows.jsonl first |
| measured | shotgate.mjs | FAIL | exit 2: Node.js v22.23.2 |
| measured | kituse.mjs --gate 4 | FAIL | exit 2: /Users/kienbeovl/orca/workspaces/studio-reel/whatif1-v5/films/wif5: no reel.js |
| measured | retakes.mjs --premise | PASS | PASS: no retake log yet, no premise to test |
| measured | importgate.mjs | FAIL | exit 1:   parts/j/reel.js:6: import '/styles/stick-man/motion-lib/index.js': only /styles/stick-man/kit/film.js, three, three/addons/* and the film's own files |
| advisory | clothgate.mjs | PASS | advisory only: exit 2: usage: clothgate.mjs films/<slug>  (a film folder with reel.js) |
| measured | run logs (logline.mjs --check) | PASS | append-only |
| made | review/acting.md | FAIL | missing: per acting shot: think → do → change, and the pose thumbnails the reviewer checked |
| made | review/acting.json | FAIL | missing: the same briefs as data (shot id → think, do, change) that timing.mjs checks for A5 |
| made | review/board-verdict.json | FAIL | missing: board.mjs --judge 3 (lines shown) |
| judged | review/feel-check.md | FAIL | missing: each scene scored 1-5 against its feel line, with frames |
| approved | review/approvals.json | FAIL | not approved yet: an independent reviewer approves this gate |

measured = tools · made = the maker's files · judged = an independent reviewer · advisory = shown, never blocks · approved = an independent reviewer (verdict READY). LOCK needs all four.
