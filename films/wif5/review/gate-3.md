# Gate 3 · Asset lock

**OPEN**

| Kind | Evidence | OK | Why |
| --- | --- | --- | --- |
| measured | assets.mjs | FAIL | exit 1: review/assets.md: FAIL · 12 FAIL, 0 WARN · 0 assets, 0 measures |
| measured | rigtest.mjs | PASS | rig test: 75 clips, 0 over a limit, 0 not in RIG_KNOWN |
| measured | run logs (logline.mjs --check) | PASS | append-only |
| made | review/layout-check.md | FAIL | missing: every locked shot rendered grey with the real assets beside its animatic panel (STAGE 2 [2.4]) |
| judged | review/asset-review.md | FAIL | missing: silhouette, phone-size read, colour separation, scale, per asset |
| approved | review/approvals.json | FAIL | not approved yet: an independent reviewer approves this gate |

measured = tools · made = the maker's files · judged = an independent reviewer · advisory = shown, never blocks · approved = an independent reviewer (verdict READY). LOCK needs all four.
