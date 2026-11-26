# Gate 2c · Look + design lock

**OPEN**

| Kind | Evidence | OK | Why |
| --- | --- | --- | --- |
| measured | run logs (logline.mjs --check) | PASS | append-only |
| made | review/look.md | PASS | ok |
| made | review/colour-script.md | PASS | ok |
| made | colour-script.json | FAIL | section /"approved"\s*:\s*\{[^}]*"by"\s*:\s*"kai"/; section /"approved"\s*:\s*\{[^}]*"at"\s*:\s*"\d{4}-\d\d-\d\d/ |
| approved | review/approvals.json | PASS | agent:ep1-prepro-review READY, 2026-11-26T22:00 |

measured = tools · made = the maker's files · judged = an independent reviewer · advisory = shown, never blocks · approved = an independent reviewer (verdict READY). LOCK needs all four.
