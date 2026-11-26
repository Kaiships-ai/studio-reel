# Gate S · Script lock (SCRIPT.md)

**OPEN**

| Kind | Evidence | OK | Why |
| --- | --- | --- | --- |
| measured | scriptlint.mjs | FAIL | exit 1: FAIL 2 FAIL 6 WARN · 160 words ≈ 60.7 s → films/wif5/review/scriptlint.md |
| measured | run logs (logline.mjs --check) | PASS | append-only |
| made | vo/beats.json | PASS | ok |
| made | vo/facts.json | PASS | ok |
| judged | review/fact-check.md | PASS | of vo/script.json, vo/facts.json (V4 locked wording, byte-identical to umibozu films/wwr/tools/timeline.py) |
| judged | review/skeptic.md | PASS | of vo/script.json, vo/beats.json |
| judged | review/ear-retell.md | PASS | of vo/script.json (text read once, in order, never back) |
| judged | review/script-ab.md | PASS | of vo/script.json (Y, V5) against umibozu films/wwr/tools/timeline.py TEXT (X, the V4 lock) |
| approved | review/approvals.json | FAIL | reviewer agent:ep1-prepro-review says NOT READY, not READY |

measured = tools · made = the maker's files · judged = an independent reviewer · advisory = shown, never blocks · approved = an independent reviewer (verdict READY). LOCK needs all four.
