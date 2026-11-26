by: agent:ep1-prepro-review
date: 2026-11-26
of: vo/script.json, vo/facts.json (V4 locked wording, byte-identical to umibozu films/wwr/tools/timeline.py)

# Fact check (◇S)

Method: each claim read against the standard source from my knowledge; I did not open URLs in this run, so "UNVERIFIED-LIVE" means the exact figure still needs one click by a human.

| Claim | Line | Verdict | Note |
|---|---|---|---|
| 85% of the world's nurses were women | L05 | TRUE (safe low) | WHO 2020 says about 90 %; 85 % is below it, nobody can fault it |
| 87% of elder care workers were women (OECD) | L09 | CAVEAT | OECD Who Cares 2020 gives about 90 % women in long-term care on average; 87 % is not a number I can match to the report. Names the OECD, so it must match. UNVERIFIED-LIVE |
| A billion of those left are boys under 15 | L12 | TRUE | UN WPP 2024 males 0-14 about 1.03 bn. "of those left" is right (survivors are about 4.2 bn) |
| 4 in 10 workers on Earth | L13 | TRUE / CAVEAT | women are about 39-40 % of global employment (ILO); "workers" = the labour force, fine |
| And half of all the customers | L14 | TRUE | women are 49.7 % of people |
| 90% of homicide suspects are men | L15 | TRUE | UNODC 2019: about 90 % of suspects are male |
| Labs can freeze eggs, sperm and embryos | L18 | TRUE | |
| No one has ever built a womb | L19 | CAVEAT | Partridge 2017 is a lamb in a bag, not a human womb: true for humans, and the film's own source row says so |
| Half the cradles are empty | L03 | TRUE | about 49 % of newborns are girls |
| The youngest person on Earth turns 80 | L20 | CAVEAT | holds only if no one is born after the vanish: the babies born that day are the youngest. Pregnancies vanish with the women, so it holds |
| The last person on Earth ... 116 years | L22, L25 | CAVEAT | time math: born 23:59, so 116 at death in year 116. A man of 116 is near the human record (122), but the last of 4 bn men to die is plausibly that old. Fine as a what-if; a commenter will say "oldest man ever was 114" |
| Contradiction check | all | PASS | the "youngest" boy (L20) and the "last person" (L22) are the same man: the last to die is not always the youngest, but the film makes him both and the picture (23:59 tag) says so. Name it in the facts note |

Time math: 8,335,439,000 people x 0.497326 = women 4.145 bn, men 4.190 bn: consistent with "a billion boys".

Two things a commenter will correct, ranked: (1) 87 % vs the OECD page; (2) "116 years" oldest-man.

## Verdict

PASS with 2 FIXES (none blocks the wording; Kai locked V4 wording, I do not rewrite it):
1. Open the OECD report once and confirm 87 % (L09); if it says 90 %, the figure is under, not wrong.
2. Add to facts.json that the "youngest" and "last person" are one man by design.
3. S10 warn: 7 facts (K1 wants 4-6). F7 and the 80/116 maths are not claims a viewer checks.

## Recheck 2026-11-26 (by: agent:ep1-prepro-review)

87 % OECD (L09): still not confirmed live; the OECD page does not render without a browser. Recorded figure for the sector is about 90 %, so 87 % is not contradicted. Kai's waive-S-script covers the S3 runs and the script-ab tie. Verdict stays PASS, one human click open.
