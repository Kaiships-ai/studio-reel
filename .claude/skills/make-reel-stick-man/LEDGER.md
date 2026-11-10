# Ledger · <slug>

Filled by the agent during the run (one row per stage, after it ends). Tokens = the session's token count at the end of
the stage minus at its start (the client's usage line or `/cost`; a sub-agent has neither: estimate from context growth and
mark the number "(est.)"); minutes = wall clock. Budget per reel:
~170k tokens + new assets, render 1-7 min. Over 1.5x a stage's share: stop and tell Kai.

| # | Stage | Tokens | Minutes | Rounds | Output | Note |
|---|---|---|---|---|---|---|
| 1 | script | | | | vo/script.json | |
| | Kai approves script | | | | | date, words |
| 2 | voice | | | | vo/vo.wav | voice, words/s |
| | Kai approves voice | | | | | |
| 3 | align | | | | vo/words.json, vo/voice-qa.md | last frame |
| 4 | storyboard | | | | storyboard.json | sets, % lines with props/fx |
| 5 | reel data | | | | reel.js, reel2.js | new sets/props/fx |
| 6 | preview | | | | review/pre-stats.txt | joint top 5 |
| 7 | board | | | | review/board.jpg, review/board-verdict.json | % shown; reviewer tokens = `tokens` in the verdict (measured) |
| 8 | sound | | | | audio/music.json, audio/mix.wav, audio/levels.txt | |
| 9 | render | | | | renders/<slug>_vN.mp4 | ms/frame |
| 10 | gates | | | | review/<slug>_vN-gates.txt | PASS count (15 + 7 story) |
| 11 | deliver | | | | review/<slug>_vN-sheet.jpg (--n 30) | |
| | **total** | | | | | |

Kit changes this run (new set, prop, verb, cast; file and one line why):

-
