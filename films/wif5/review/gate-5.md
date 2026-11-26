# Gate 5 · Deliver

**OPEN**

| Kind | Evidence | OK | Why |
| --- | --- | --- | --- |
| measured | postcheck.mjs | FAIL | exit 1: review/postcheck.md: FAIL · 6 FAIL, 1 WARN |
| measured | cutgate.mjs | FAIL | exit 1: /Users/kienbeovl/orca/workspaces/studio-reel/whatif1-v5/films/wif5: no final render in renders/ |
| measured | colourgate.mjs | FAIL | exit 1: /Users/kienbeovl/orca/workspaces/studio-reel/whatif1-v5/films/wif5: no final render in renders/ |
| measured | valuegate.mjs | FAIL | exit 1: /Users/kienbeovl/orca/workspaces/studio-reel/whatif1-v5/films/wif5: no final render in renders/ |
| measured | facegate.mjs | FAIL | exit 2: usage: facegate.mjs films/<slug> / --rows <rows.jsonl> [--rows-size 720x1280] [--json 1] |
| advisory | headgate.mjs | PASS | advisory only: exit 2: usage: headgate.mjs films/<slug> / --rows <rows.jsonl> [--json 1]  (no rows found) |
| measured | shotgate.mjs | FAIL | exit 2: Node.js v22.23.2 |
| measured | kituse.mjs --gate 5 | FAIL | exit 2: /Users/kienbeovl/orca/workspaces/studio-reel/whatif1-v5/films/wif5: no reel.js |
| measured | retakes.mjs --premise | PASS | PASS: no retake log yet, no premise to test |
| measured | readgate.mjs | FAIL | exit 1: /Users/kienbeovl/orca/workspaces/studio-reel/whatif1-v5/films/wif5: no final render in renders/ |
| advisory | floorgate.mjs | PASS | advisory only: exit 1: /Users/kienbeovl/orca/workspaces/studio-reel/whatif1-v5/films/wif5: no final render in renders/ |
| advisory | soundgate.mjs | PASS | advisory only: exit 1: /Users/kienbeovl/orca/workspaces/studio-reel/whatif1-v5/films/wif5: no final render in renders/ |
| advisory | textgate.mjs | PASS | advisory only: exit 2: usage: textgate.mjs films/<slug> / --rows <rows.jsonl> [--json 1]  (no rows found) |
| measured | run logs (logline.mjs --check) | PASS | append-only |
| judged | review/final-qa.md | FAIL | missing: full-speed, sound on, phone size, UI overlay on: retell + swipe test on the final |
| approved | review/approvals.json | FAIL | not approved yet: Kai (K2 whole film at 1x, notes per segment) approves this gate |

measured = tools · made = the maker's files · judged = an independent reviewer · advisory = shown, never blocks · approved = Kai at K2. LOCK needs all four.
