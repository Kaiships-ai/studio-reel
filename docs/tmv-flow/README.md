# TMV buyer flow (approved spec)

The flow a buyer goes through to make a whole series of episodes like Ten Million Views, approved by Kai on
2026-11-08. Every TMV change follows it. Open `index.html` for the interactive charts (drag, zoom, click a state).

| Chart | Model | What it covers |
|---|---|---|
| Overview, 7 phases | `models/Flow2.tla` | install → story → style + world → script → build → review → post |
| ① Start | `models/A.tla` | unzip, trust prompt, pixi, background install, sample, Gemini key, doctor, cook or step mode |
| ② Story + ③ Style | `models/B.tla` (`B-step.cfg`, `B-cook.cfg`) | story-skills premise, characters, the buyer's own character drawn in 3 styles, world in that style, vote branches |
| ④ One episode | `models/C.tla` (`C-step.cfg`, `C-cook.cfg`); `Cs.tla` draws the chart | hook, sourced rules, per-second script, checks, reader panel, one-take voice, word timing, 720p render, 11 gates, safe shots, review, full render only after approval |
| ⑤ Post + vote | `models/D.tla` (`D-FALSE.cfg`, `D-TRUE.cfg`); `Dc.tla` draws the chart | cover, caption check, the buyer posts, vote count from pasted comments, next episode |

Decisions behind it: season 1 ships three styles (`kai-hand-draw`, the 3D episode engine, `paper-popup`);
story-skills (MIT) lives in the repo; narration is "You"; CC0 sound effects; cook and step modes with a progress line
at every stop; every render is medium (720p) and full quality needs an explicit approval.

Each model's invariants are the rules the product must keep. All hold (TLC, every reachable state).

## Re-check or redraw

```sh
statechart models/C.tla --config models/C-step.cfg --view views/C.view.mjs --out /tmp/c-chart
```

`statechart` is the pstack statechart skill's script. The interactive page is built from the charts with the
`statechart-html` skill (`node statechart-html.mjs manifest.json index.html`).
