# Ledger · <slug>

Filled by the agent during the run (one row per stage, after it ends). Tokens = the session's token count at the end of
the stage minus at its start (read it from the client's usage line, or `/cost`); minutes = wall clock. Budget per reel:
~170k tokens + new assets, render 1-7 min. Over 1.5x a stage's share: stop and tell Kai.

| # | Stage | Tokens | Minutes | Rounds | Output | Note |
|---|---|---|---|---|---|---|
| 1 | script | | | | vo/script.json | |
| | Kai approves script | | | | | date, words |
| 2 | voice | | | | vo/vo.wav | voice, words/s |
| | Kai approves voice | | | | | |
| 3 | align | | | | vo/words.json, vo/voice-qa.md | last frame |
| 4 | reel data | | | | reel.js, reel2.js | new sets/props |
| 5 | preview stills | | | | review/f_*.jpg | |
| 6 | sound | | | | audio/mix.wav, audio/levels.txt | |
| 7 | render | | | | renders/<slug>_vN.mp4 | ms/frame |
| 8 | gates | | | | review/<slug>_vN-gates.txt | PASS count |
| 9 | deliver | | | | review/<slug>_vN-sheet.jpg | |
| | **total** | | | | | |

Kit changes this run (new set, prop, verb, cast; file and one line why):

-
