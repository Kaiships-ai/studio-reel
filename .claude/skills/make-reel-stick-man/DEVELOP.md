# Development: the playbook (stage 0)

Stage 0 decides what the film is. Every later stage executes these decisions, so they are written down
(`DECISIONS.json`), checked by a tool (`develop.mjs`) and carried forward (`prepro.mjs` D1/D2 check every approved decision
against the shot list). Read `DIRECTOR.md` sections 1-4 (brief, benchmark, story, treatment) and the `million-views-rule`
skill before [0.1]; this file adds the standards and gate for a stick-man reel.

## 1. Steps

| Step | Do | Output |
|---|---|---|
| [0.0] Benchmark | Pick 3-5 short videos of the same format and audience. For each: the hook (first 3 s, muted), the shot sizes, the cutting rhythm, the sound, where you would swipe. Write what to learn and what not to take. | `TREATMENT.md` section "Benchmark" |
| [0.1] Brief + series bible | The brief (length, language, audience, platform). For a series: read `plot/bible.md` and the season file, and the state the last episode left (money, wounds, the audience's vote). | `BRIEF.md` |
| [0.2] Treatment | Logline; three structures compared and one chosen; 2-3 hooks; the intended intensity curve per beat with the climax; what only the picture says; the sound idea. | `TREATMENT.md` |
| [0.3] Hook test | A fresh agent sees the 2-3 hooks as a thumbnail + the first line each, picks the one it would keep watching and says why. When the channel exists, Kai can post a trial reel. | `review/hook-test.md` (`by: agent:<id>`) |
| [0.4] Beat board | The whole story in about 12 panels, one beat each, grey. | panels |
| [0.5] Decision log | Every decision the treatment and Kai's notes set, with a check where a tool can verify it. | `DECISIONS.json` |
| ◇1 | `stagegate.mjs films/<slug> 1` READY FOR KAI, then Kai approves. | `review/approvals.json` |

## 2. Standards (what `develop.mjs` and the gate check)

- **Logline**: one sentence, ≤ 40 words, naming who, the goal, the obstacle and what is at stake.
- **Three structures**: three real alternatives (not variations), each with what it gains and costs; one marked as the choice.
- **Benchmark**: 1-2 works that set the bar; what to learn (composition, pacing, camera grammar, sound) and what not to take.
- **Hooks**: at least two, of different hook types (`million-views-rule` R3). Each works muted in its first frame.
- **Intensity curve**: every beat with a story intensity 1-10, one climax, a release after it.
- **Decisions**: each approved decision has an id, the words, `by: kai`, the date, the source, `where` it lands (scenes) and,
  when a tool can verify it, a `check` (REEL_DATA.md, Decision log).

## 3. The structure is locked at ◇1

Changing the structure after ◇1 (a race becoming a knowledge series, a new ending) reopens ◇1: the treatment, the
decision log and the hook test are redone, and Kai approves again. A script change that keeps the structure is stage 1.

## 4. What only the picture says

The treatment lists the things the picture tells that no line says (the cop already walked past your door; the runs cost
more each time). They are decisions: they go in `DECISIONS.json` with `where`, so the board must place them.

## 5. The decision log

`DECISIONS.json` is the memory between stages. Its rules:

- An agent may add decisions as `proposed`; only Kai makes them `approved` (on the stage page; copy his pick and the date).
- A decision is dropped only by Kai (`status: dropped`, `droppedBy: kai`, why). Silently not doing it is a FAIL (D1/D2).
- When an approved decision conflicts with a skill rule (D3: Kai approved 2D explainer cards, the skill caps cards at
  25 %), the tool reports the conflict and Kai picks; the loser is recorded on the decision.

## 6. Fixes for each `develop.mjs` check

| Id | Check | Fix |
|---|---|---|
| T0 | no TREATMENT.md | write it ([0.2]) |
| T1 | logline missing, too long, or without goal and stakes | one sentence: who must do what, before what, or else |
| T2 | fewer than 3 structures, or none chosen | add real alternatives; mark the choice and why |
| T3 | no benchmark, or no learn / not-take | [0.0] |
| T4 | fewer than 2 hooks | write hooks of different types |
| T5 | no intensity curve | a beat table with 1-10 and the climax |
| D0 | DECISIONS.json missing or malformed; a decision approved by someone other than Kai | [0.5]; only Kai approves |

## 7. Mistakes we have paid for

- **The structure changed after the treatment** (Hot Money ep. 1: race → knowledge series) and the treatment's picture
  decisions (peephole hook, the visible cop, match cuts into the trunk, music cutting out at the climax) were lost.
- **Decisions lived only in prose.** The approved script said "first 3 s: one shot, no cut", "HUD IN CAR n/4", "split
  screen HIDE | SPEND"; the later boards (v3, and the v5 redesign) broke them because nothing checked them.
