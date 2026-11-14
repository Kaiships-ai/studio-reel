# Script: the playbook (step [1.1], gate ◇S)

The script is written, tested and locked before anyone draws a panel. This file is the script stage of the stick-man
process. It contains the whole of the former `million-views-rule` skill (rules R1-R10 and K1-K9 keep their ids, so old
notes still map) plus the steps, reviews and checks that turn those rules into a script that has been tested.

**Why a stage of its own.** Hot Money ep. 1 script v4 passed every check the process had (develop.mjs PASS, ◇1 READY)
and still had two logic holes a commenter would catch, a vote the script had already answered, a 27-second stop of the
clock it had just started, and a set-up it never used. Nothing in the process read the script itself.
The rules were there; the steps were missing (section 8).

## 1. Where it sits

```
◇1 treatment ─► [1.0] scene brief ─► [1.1a] beats ─► [1.1b] facts ─► [1.1c] draft + scriptlint ─► [1.1d] skeptic
   ─► [1.1e] table read + ear retell ─► [1.1f] punch-up (Kai picks) ─► [1.1g] blind A/B ─► ◇S script lock
   ─► [1.1p] picture pass ─► [1.4] storyboard
```

The structure was locked at ◇1. Here the words are written, tested and locked. A script change after ◇S reopens ◇S
(the tests are redone on the changed lines) and the voice is recorded again (`prepro.mjs` V1).

## 2. Steps

| Step | Do | Output | Who checks |
|---|---|---|---|
| [1.1a] Beat outline | One beat per story move: `want`, `obstacle`, `outcome`, and the `link` to the beat before (`but` / `so`) with `because` (what in the beat before causes it). List the plants (anything set up that must pay off) and the vote options with their planted costs. Write this before any sentence. | `vo/beats.json` (REEL_DATA.md) | `scriptlint.mjs` S7-S9 |
| [1.1b] Fact sheet | Every real fact: the claim, the lines that say it, a source you opened, the number recomputed, the wrong move by "you" it is tied to (K1), and **where else in the story this fact would catch you** (a fact you state must not be ignored later). | `vo/facts.json` | a fresh agent: `review/fact-check.md` |
| [1.1c] Draft | Write `vo/script.json` from the beats with the rules in section 3. Give each line a `class` (action, reaction, twist, fact, number, compare, rule, recap, CTA). Run `node styles/stick-man/tools/scriptlint.mjs films/<slug>` until it has no FAIL. Keep each draft (`review/script-drafts/vN.json`) with a 3-line changelog; every pass cuts. | script + `review/scriptlint.md` | the tool |
| [1.1d] Skeptic pass | A fresh agent reads the script as the viewer who argues in the comments: every "but why?", every beat that just happens, every set-up not used, whether the vote is truly open. Each note is answered in the script or written off with a reason. | `review/skeptic.md` | the agent |
| [1.1e] Table read + ear retell | Record a scratch take (`voice.py`) or, before a voice exists, give the timed text to a fresh agent who reads each line once, never back (simulated listening; say so in the file). It retells the story, the numbers it kept and lost, where it got lost, the words it would not get on first hearing. | `review/ear-retell.md` | the agent |
| [1.1f] Punch-up | For every line flagged in [1.1c]-[1.1e]: three rewrites (**safe**: fixes the note with the least change; **vivid**: a stronger picture in common words; **bold**: a different idea that still keeps the beat). Mark one **Em đề xuất**. Kai picks on the stage page. | `review/punchup.md` | Kai |
| [1.1g] Blind A/B | A fresh agent gets the last locked script and the new one as X and Y (order random, no labels, no notes) and judges which keeps a phone viewer watching, which is clearer, which vote splits comments more. If the new one does not win, keep the old one and write why. | `review/script-ab.md` | the agent |
| ◇S | `node styles/stick-man/tools/stagegate.mjs films/<slug> S`: scriptlint PASS, beats and facts made, the four reviews by agents and newer than the script, Kai approved. | `review/approvals.json` | Kai |
| [1.1p] Picture pass | PREPRO.md [1.1]: per line `see` and an explain device. Starts from the locked script. | `storyboard.json` `lines` | `prepro.mjs` |

The reviewer of [1.1b], [1.1d], [1.1e] and [1.1g] is never the writer, and gets only what a viewer would get (no notes,
no intentions, no earlier review). Prompts: section 5.

## 3. The writing rules

Check and rewrite with these. They raise the odds that people keep watching; they guarantee nothing. The only real score
is the retention graph (PUBLISH.md).

**Priority when rules conflict:** R1 Simple words > R2 Natural voice > everything else.

**Language:** the script stays in its own language (Hot Money: English). Notes to Kai in Vietnamese.

**Pace:** plan English at **3.1 words/s plus 0.35 s per line** (`scriptlint.mjs` S4); a script that fits the length only
because the voice reads faster fails (the audience learned English at school). Vietnamese ≈ 4-5 syllables/s. Count
words; never guess timestamps. When the voice is recorded, `review/script_timed.txt` shows the real pace.

### 3.0 Pick the format

| Format | What it is | Rules |
|---|---|---|
| **Survival prompt** | An impossible situation that ends by asking the viewer what they'd do. Comments are the payoff. | R1-R8, R10 |
| **Full story** | A mini-arc with a reveal and a hard choice. | All |
| **Knowledge series** (60-90 s episode) | "You" make a move in a big situation, learn a real fact the hard way, and it gets worse. Ends with a status recap and a vote that decides the next episode. | R1-R8, R10 + K1-K9 (they override where they conflict) |

Keep the original's format. Don't bolt a twist, a loved one and a kidnapping onto a survival prompt. A script with
section labels, a HUD, "Day 1/2/3" or a vote for Part 2 is a knowledge series. The format is chosen at ◇1.

### R1. Simple words
- A 10-year-old and someone who learned English at school understand every word instantly.
- The most common word wins: "bags" not "duffel bags", "running" not "sprinting", "small street" not "alley".
- No idioms ("at a snail's pace", "getaway car", "in the nick of time").
- One idea per sentence, mostly 4-12 words, never over 15. Active voice, present tense, "you" as the subject.
- Hard ideas are explained, not named: not "ransom" but "pay ten million, or you'll never see her again".
- **One word, one meaning.** A key word keeps its meaning for the whole script ("clean money" cannot mean laundered money
  in one line and legal money three lines later).
- **Simple is not flat.** Common words that paint a strong picture are wanted: "trapped", "black helicopter", "glows".
  Cut rare words and idioms, never imagery.

### R2. Natural voice
- A person telling a friend, not an AI or a trailer. Short complete sentences: "The door is locked." not "Door. Locked."
- One fragment for impact is allowed, once, at the peak ("Ten steps. Ten seconds.").
- No fragment lists ("No name. No memory."), no dashes, no italics, no ALL CAPS in the voiceover.
- Messages in plain speech: "A note says…".
- No formula lines: "Your move?", "Here's the thing", "Let that sink in".

### R3. Hook (first ~3 seconds)
- First sentence: 6-15 words, said in ≤ 4 s. **Danger AND reward.** A big number alone is not enough.
- **Picture first, threat second.** The first two lines let the viewer see where they are, what is in front of them, and
  something moving. The danger comes out of the picture rather than being announced.
- No vague pronouns ("someone", "they", "it") before the viewer has seen who or what. Never open with "You wake up…".
- The first frame and the on-screen text work with the sound off. The video delivers what the hook promises.
- Hook types (write 2-3 hooks of different types at ◇1; a fresh agent picks, DEVELOP.md [0.3]):

| Type | Example | Use when | Trap |
|---|---|---|---|
| 1. Scene in motion | "A black helicopter just left you on a locked roof with ten million dollars." | the setting is the danger | over 15 words |
| 2. Threat with a face | "Two men will kill you for this bag of ten million dollars." | a chaser | the threat must show up mid-video |
| 3. Done deed | "You just stole ten million dollars." | knowledge series | the next line brings danger fast |
| 4. Countdown | "You have ten seconds and a hundred-kilo bag of money." | built on time math | the numbers after must add up, razor-close |
| 5. Strange fact | "Ten million dollars weighs a hundred kilos." | knowledge-led | weak alone; line 2 adds danger |

**Open (≈10 s, up to 3 lines):** the scene (picture + reward + danger, ≤ 15 words); the strange detail; the theme line.

### R4. Rules and deadline
- By ~10 s the viewer knows the goal, the deadline, and what winning or losing means, given through something in the
  world (a note, a timer, a car key). If a viewer would ask "but why?", fix it. The goal and the ending question match.

### R5. Escalation (but / therefore)
- A new beat every 3-5 s: hope, then it dies, then worse. Each beat is caused by the one before: "but" or "so", never
  "and then" (Parker and Stone). **No random disasters**: more police arrive *because* of something.
- The character acts: grabs, runs, presses, drags. Each beat is bigger than the last. Rehook near the middle (~15-25 s):
  the threat set up in the hook shows up for real.

### R6. Specific numbers that add up
- Numbers, colours, sounds, distances instead of "very" or "a lot". They are true ($10M in $100 bills ≈ 100 kg).
- A time limit is razor-close and the math lines up, so viewers argue. Deadlines in seconds or minutes.
- **A razor-close sum must decide something.** If 238 of 240 s is set up, the race is won or lost by it.
- The setting fits the logistics (place, distance, weight, time, physics). Invent names; no real banks, brands or people.
- **For the ear:** one new number per sentence; the picture carries the sum, the voice says the result. Round where the
  exact number doesn't matter.

### R7. Plant and payoff
- Everything in the ending is set up earlier; nothing appears first at the end. Everything set up is used (or is a
  series plant named in `beats.json`).

### R8. Ending
- **Hard choice**: two options, both set up, both with a real cost, neither obviously right. **Nothing earlier may answer
  it** (a "Rule one: spend nothing" kills a "hide or spend" vote).
- **Open question** (short, easy to answer in a comment) or **loop** (the last line runs into the first).
- End right after the question. No "follow for Part 2".

### R9. Twist and personal stake (full story only)
One reveal that changes how everything before it reads; one personal detail shown through action.

### R10. Production and safety
- Production notes stay out of the voice lines. The picture shows what the words say at the same moment (muted viewers).
- Imply, don't show: no gore, no weapons aimed at a person on screen, no harm to children, no rooftop-edge shots.
- In a series, change the situation and the obstacle each time, not just the names.

### Knowledge series (K1-K9)

**Core loop (2-4 times):** you do X → what you don't know → consequence. Joined by "So", "Except", "But".

**K1. Real facts, densely.** About one real fact every 10-15 s, 4-6 per episode. **Every fact lands on a move by
"you"**; a fact told on its own is a lecture. Verify every fact and number ([1.1b]); mark anything unverified. Say how
it works in one plain sentence; jargon only when explained at once ("structuring", then what it means).

**K2. Structure** (rewritten Nov 2026: the old "Problems ~25 s" block contradicted K1 and stopped the clock):

| Part | Length | Job |
|---|---|---|
| Open | ~10 s | the big situation in the first sentence (R3), then a theme line that becomes the title card |
| Problems | ~20-25 s | 2 problems, each a fact that **hits you while you act** (you lift the first bag: a hundred kilos). The facts may come early so the viewer knows the names before the action (pre-training), but the clock keeps running and no more than 2 lines (≤ 8 s) pass without an action by "you" (`scriptlint` S3). Then "Rule one" as a title card. |
| Plan → flip → flip | ~30 s | "You" try something smart. A fact breaks it. You adapt. A second fact breaks that too (the rehook). |
| Recap + vote | ~15 s | a calm status line with numbers, **one human detail**, two choices, the vote |

**K3. One question at a time.** Each section opens one question and closes or upgrades it (curiosity is a gap the viewer
can almost close: Loewenstein). Never answer your own question early.

**K4. Visual spine.** A HUD or counters that change after every event, time stamps or "Day 1/2/3". Every new fact moves
at least one counter. Title cards for the theme, each rule, and the key number.

**K5. Signature lines** ("Problem one / Problem two") are a series device, once per section.

**K6. The vote** is allowed when it really decides Part 2: "Comment X or Y. Part two follows what you pick." Two short,
different words; both options set up and costly (R8).

**K7. Rules have a source.** "Rule one" is a lesson the viewer just learned from a fact. **A rule must not decide the
ending vote** (R8); if it does, reword the rule as a lesson ("every bill remembers where it came from") or give the
voted option its own cost.

**K8. Safety.** Every attempt to beat the law or the system fails, and the episode shows why. It explains how people get
caught, never how to get away with it. No step-by-step crime method.

**K9. Amnesia exception.** Where "who am I?" is the season mystery, "No memory" can stay in the open, but the first
sentence still leads with the money and the danger; each episode drops one small clue.

### Anti-patterns
- A hook with reward but no danger, or danger after second 5; a threat with no scene; "someone" before we see them.
- Simplifying until the imagery dies. "You wake up…", amnesia in line 1, fragment lists, trailer voice.
- Hard words, idioms, sentences over 15 words; one word in two meanings.
- No goal or deadline; danger stated in the hook and then nothing new; a long explanation with the clock stopped.
- A timeline or numbers that don't add up; a razor-close sum that decides nothing; a setting that breaks the logistics.
- A stated fact the story later ignores (bait bills, then a bank deposit with no check).
- A new faction or villain for drama; something new in the ending; an ending one rule already answered.
- A self-check that praises what the script doesn't do; fake scores ("98 % viral"). The only real score is retention.

## 4. Craft notes for the stick-man format
- The script is written for picture: a line whose only picture is a card is a script problem; rewrite it so the fact
  happens to someone (PREPRO.md 4.3, the explain ladder).
- The words and the picture land together (Mayer: temporal contiguity); on-screen text is a short key word, never the
  sentence the voice says (redundancy).
- The recap is a scene, not a summary (PREPRO.md 4.1).

## 5. Review prompts

Give each reviewer only the script (and the fact sheet for [1.1b]); never your notes, intentions or earlier reviews.
Save the answer with a header `by: agent:<id>` and `of: <script file>`.

- **[1.1b] Fact check.** "You are an independent fact checker; try to break it. For each factual claim (also implicit
  ones) search, open primary or official sources, verdict TRUE / CAVEAT / MISLEADING / FALSE / UNVERIFIABLE with the URL.
  Recompute every number and the time math. Name every place where a stated fact contradicts what happens later. List
  what a knowledgeable commenter would correct, ranked. Verdict PASS / FIX and the top 3 fixes."
- **[1.1d] Skeptic.** "You are a sharp viewer and story editor with no authority to rewrite. List every 'but why?'
  (lines, question, severity 1-3); every beat that does not follow by 'but' or 'therefore'; set-ups never used; whether
  both vote options are open and costly and whether anything earlier answers it; words that could mean two things or
  that a school-English viewer would miss; where you'd leave. Top 3 notes."
- **[1.1e] Ear retell.** "Listening test, simulated in text: read each timed line once, in order, never back. Then,
  without looking: retell; numbers kept / lost; where you got lost and what you guessed; words you wouldn't get; the two
  options and their costs; where attention dropped."
- **[1.1g] Blind A/B.** "Two scripts, X and Y, for the same 60-90 s vertical episode. For a half-attentive phone viewer:
  which hook holds better, which story is clearer, which explains the facts without stopping, which vote would split
  comments more, which you would finish. Pick one overall and say why; name what the loser does better."

## 6. Fixes for each `scriptlint.mjs` check

A FAIL Kai chooses to keep is never patched away: record it in `DECISIONS.json` as an approved decision whose `conflict` names the checks (`{"rule": "scriptlint S3 … S4 …", "winner": "<its id>", "by": "kai"}`); the lint then reports it as KAI, not FAIL.

| Id | Check | Fix |
|---|---|---|
| S1 | a sentence over 15 words | split it; one idea per sentence |
| S2 | 2+ new numbers in a line (FAIL at 3) | keep one number per sentence; the picture shows the sum, the voice says the result; mark the one sum line `math: true` |
| S3 | > 2 lines or > 8 s with no action by "you" | let the fact land while you act; move a fact into an action line; cut |
| S4 | longer than the approved maximum at 3.1 words/s | cut words, never speed the voice |
| S5 | hook: length, vague pronoun, waking up | R3 |
| S6 | dash, formula line, idiom, ALL CAPS, fragment list | R2 |
| S7 | no beat outline; a beat joined by "and then" or with no cause; a line in no beat | [1.1a]; find the cause, or cut the beat |
| S8 | a set-up never paid; a vote option not said or with no planted cost | R7, R8 |
| S9 | the recap has no human detail, or the detail is not in the lines | K2 |
| S10 | no fact sheet; a fact without a source URL, a check or a move by "you"; facts too sparse | [1.1b], K1 |
| S11 | 6 words in a row match a reference transcript | rewrite in your own words (the series is a remix of a structure, never of sentences) |

What no tool sees (two meanings of a word, a fact the story ignores, a rule that answers the vote, a joke that doesn't
land) is what [1.1b], [1.1d] and [1.1e] are for.

## 7. Files

| File | What |
|---|---|
| `vo/script.json` | `lines[]`: `id`, `who`, `style`, `beat`, `class`, `text`, optional `math: true`; optional `wps` |
| `vo/beats.json` | `beats[]` (`id`, `name`, `kind`, `lines`, `link`, `because`, `want`, `obstacle`, `outcome`, `human` on the recap), `plants[]` (`id`, `what`, `set`, `paid` = a line or `epN+`), `vote` (`lines`, `options[]` with `word` and `cost` = a plant id) |
| `vo/facts.json` | `facts[]`: `id`, `claim`, `lines`, `source` {`name`, `url`}, `check`, `move` |
| `review/scriptlint.md`, `fact-check.md`, `skeptic.md`, `ear-retell.md`, `punchup.md`, `script-ab.md` | the evidence of ◇S |
| `styles/stick-man/tools/scriptlint.mjs` | the checker |

## 8. Mistakes we have paid for (Hot Money ep. 1, script v4)

- **A stated fact the story ignored.** Line 10 says banks keep bait bills; day two takes the cash into three banks and
  the bank catches you for something else. → [1.1b] asks where else each fact would catch you.
- **A rule that answered the vote.** "Rule one: spend nothing in this town", then "hide or spend?". → R8, K7.
- **The clock stopped.** A 4:00 countdown, then 10 lines (≈ 27 s) of explanation with no action by "you". → K2, S3.
- **A razor-close sum that decided nothing.** 238 of 240 s was set up; the plan was broken by police who arrived for no
  reason. → R5, R6, S7, S8.
- **One word, two meanings.** "Clean money" meant laundered money, then legal money three lines later. → R1.
- **A rewrite that fixed the causes and lost the viewer.** v4.1 gave every beat a cause, then lost the blind A/B: it
  dropped the 34 steps (the sum could not be checked by ear), turned rule one into a metaphor and gave HIDE a cost nobody
  understood. v4.2 kept v4's plain numbers and v4.1's causes, and won 5 of 6. → [1.1g]: never ship a rewrite on the
  writer's word.
- **The script was never reviewed.** v2 had an independent review; v4 had none, and the structure changed in between. → ◇S.
- **Two rewrites lost the blind A/B to the old script** (v6 and v7 lost to v4). After one loss, merge: keep the winner and port
  only the loser's proven fixes (v8 = v4 + 5 fixes won). → [1.1g].
- **The real take had no climax pause.** The scratch voice carried a 2.4 s silence for the bullet shot; the TTS take did not,
  and every bullet-cam cut collided. → mark planned pauses in `vo/script.json` and insert them in `vo/vo.wav` before `align.py`.
- **Numbers read as digits.** Whisper wrote "238", "$9,000"; 28 words were estimated and ◇2a failed V2. → fill the
  script's `say` map (digits → the words the script uses) before `align.py`.

## 9. Example (survival prompt)

**Original**
> This is ten million dollars. It weighs a hundred kilos.
> You wake up next to it in an alley. No name. No memory.
> Someone shouts: "Grab him! Get the money!"
> You can't run with a hundred kilos. Leave it, or drag it?

**Problems:** a hook with reward but no danger; "wake up" and a fragment list; no goal, so "drag it" goes nowhere and
"leave it" is obviously right.

**Rewrite (≈30-35 s)**
> Two men will kill you for this bag of ten million dollars.
> It weighs a hundred kilos, and you're alone with it on a dark street.
> You find a car key in your pocket.
> You press it, and a red car beeps twenty steps away.
> You try to lift the bag, but you can't.
> So you drag it. One step every second.
> You're halfway there when a man shouts, "There he is!"
> Two men are running at you. They'll reach you in ten seconds.
> Ten steps. Ten seconds. Do you leave the money and run, or drag it to the car?

**Why it works:** danger and reward in 12 words; the car key gives a goal; each beat causes the next; the men from the
hook return as the rehook; 10 steps against 10 seconds is a razor-close tie that viewers will argue about.
