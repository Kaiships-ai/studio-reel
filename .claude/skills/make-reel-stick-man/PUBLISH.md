# Publish + learn: the playbook (stage 5)

A film is not finished when it renders; it is finished when we know what the audience did with it and the next film is
better for it. Stage 5 turns retention and comments into named causes, and causes into rules.

## 1. Steps

| Step | Do | Output |
|---|---|---|
| [5.1] Publish | Post the delivery package (◇5): the final, the cover, the caption, the subtitles. Note the hook used, the time, the platform. If there is an alternative hook cut, say which one ran where. | `review/publish.md` |
| [5.2] Read the numbers at 24 h and 7 d | Kai pastes the analytics screenshots (retention curve, average view %, views, comments split). Transcribe the curve to `t,pct` points, about one per 2-5 s. | `review/retention-24h.csv`, `-7d.csv` |
| [5.3] Map to shots | `node styles/stick-man/tools/retention.mjs films/<slug> --csv review/retention-24h.csv --label 24h` puts each drop on a shot id. | `review/retention.md` |
| [5.4] Post-mortem | For the 3 steepest drops: DIAGNOSE.md (isolation tests, cause, the stage that caused it). Compare with the animatic's swipe test: did we predict it? | `review/retro.md` |
| [5.5] Rules | A cause seen twice (two films, or two drops) becomes a proposed rule or a tool check, with the evidence. Kai approves it into the skill. | `review/retro.md` "Rules proposed" |
| [5.6] Series state | Update the series bible: what the audience voted, what the world now holds (money, wounds, the face on TV). The next episode's [0.1] reads it. | `plot/` |
| ◇6 | `stagegate.mjs films/<slug> 6` READY FOR KAI, then Kai approves. | `review/approvals.json` |

## 2. Reading a retention curve (starting points)

| Shape | Usually means | Look at |
|---|---|---|
| Steep fall in the first 1-3 s | the first frame or line does not promise danger and reward | the hook (DEVELOP.md, SCRIPT.md R3) |
| A cliff at one shot | confusion or a dead stretch there | that shot's purpose; the muted retell; cards |
| A slow steady slide | no rehook; nothing new on screen | the intensity curve; rehooks every 10-15 s |
| A bump up | rewatches: a moment people replay | keep and repeat the device |
| Strong to the end, few comments | the vote is weak | the two choices: both must cost something |

## 3. The reference set grows from our own films

The `reference` gate profile was measured from one outside short. Each published film adds its numbers (shot lengths,
card share, hook length) next to its retention; after a few films the targets come from what worked on this channel.
