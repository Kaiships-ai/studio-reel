---
name: story
description: Build the user's show before episode 1. Premise, characters with a card each, a style picked from their own character drawn three ways, the world in that style, a season of votes. Use when the user says /story, "new show", "my story", "start a series", or has an idea and no episodes yet.
---

# /story [cook|step] <show> [idea]

Run from this folder. Type each command exactly as written (no `cd`, `export`, `2>&1` or pipes; if `pixi` is not found
use `~/.pixi/bin/pixi`): the allow-list only matches the plain command, and anything else makes Claude Code ask the user.

## Modes

If the user named no mode, ask once: cook (you run it all) or step (you stop at each choice).

- **step**: at every ◆ below, offer the options and wait for the user's answer.
- **cook**: never stop. At each ◆ pick yourself and name the pick in the progress line. Ask only for what you cannot
  make up: the idea, if the user gave none.

After each phase print one progress line, then go on (cook) or wait (step):

```
Story 2/5 · Characters ✓ · You, Rex (rival), Pip · next: Style
```

## Files

Everything goes in `episodes/<show>/` (`<show>` in kebab-case): `story/` is the story project, `cards/<id>.json` holds
one character card per character, `styles.png` is the style picture.

The story CLI: `story <command>` below means typing `pixi run node .claude/skills/story-maintenance/scripts/story.js
<command>` in full; a bare `story` is not a command. The story skills say to run it from the project folder with an
absolute path; here, run it from this folder and give the project as `episodes/<show>/story` (a positional path, or
`--path` where the command takes one).

## 1. Premise

Follow `premise-workshop` steps 1-3 and 7 in the user's language. The form is `serial`, one chapter per episode.

- ◆ Pick one to three of the 8-12 what-ifs, or combine them.
- ◆ Accept the logline after the tests.
- ◆ Pick the title.

Then create the project and check it:

```
pixi run node .claude/skills/story-maintenance/scripts/story.js init '<Title>' --form serial --pov second-person --tense present --dir episodes/<show>/story --genre '<genre>' --synopsis '<logline>' --theme '<theme>'
pixi run node .claude/skills/story-maintenance/scripts/story.js check episodes/<show>/story
```

Add `language`, `premise` and `counter-premise` to `story.md` as `story-init` step 2 says. On an error, fix what it
names and check again. Characters start only after `Checks passed`.

## 2. Characters

Follow `character-management`. The lead is **You**: the narrator says "You" ("You ship at 2 a.m."), never a name.

- ◆ You: what You want, what You fear, the lie You believe (`lie` and `truth` in `characters/you.md`).
- Check each new name first: `story names '<Name>' --path episodes/<show>/story`. ◆ An exact clash: pick another name.
- ◆ A rival and one or two supporting characters.

Add each one with `story add character '<Name>' --role <role> --path episodes/<show>/story`: You is `protagonist`, the
rival `antagonist`, the others `supporting`. Then write its card to `cards/<id>.json`: `"id"` plus the fields of one
`TMV_SEEDS` entry in `characters/cast.js`. `CARD` in `core/character-card.mjs` lists every allowed value; colours are
`#RRGGBB`. You's card starts `"id": "you", "name": "You"`. The user may design a card instead: `pixi run designer` in
the background, they press "Copy for Claude" and paste it. End with `story check` passing.

## 3. Style

```
pixi run node episode/make.mjs styles episodes/<show>/cards/you.json --out episodes/<show>/styles.png
```

It draws You in 3D, hand-draw and paper side by side in about a second. Open `styles.png` with the Read tool and show
it; under each panel is what that style draws differently.

- ◆ Pick one. Write `style: 3d`, `style: hand-draw` or `style: paper` in the `story.md` frontmatter. In cook mode, pick
  the panel with the fewest differences listed.
- A panel fails: fix what the error names and run it again. After a second failure, offer the styles that drew.
- It prints `usage: node episode/make.mjs <episode folder ...>`: this kit has no style picture yet. Say so, write
  `style: 3d` (the sample's style) and go on.

## 4. World

Follow `worldbuilding` and `research`. Everything here is described as the chosen style draws it.

- ◆ Two or three places: `story add location '<Place>' --path episodes/<show>/story`, each with a `## Look` section in
  the style's terms (3D: the room, the light, the props on the desk; hand-draw: the line and the paper; paper: the cut
  layers).
- The real rules of the user's field (their platform, market or trade) that the story leans on:
  `story add research '<rule>' --source '<url>' --path episodes/<show>/story`, one per rule, with a source you opened.
- ◆ A rule with no source: hold it. The user tries it and tells you what happened, or it is dropped. In cook mode,
  drop it. No unsourced rule reaches the season.

## 5. Season

Follow `interactive-fiction`. Six episodes, chapters 1-6:
`story add chapter 'Ep <N>: <title>' --number <N> --hook decision --path episodes/<show>/story`. Each chapter's body
ends with its vote question. Chapters 1-5 get two choices in their frontmatter, both to the next chapter, since the
winning comment decides what that episode follows:

```yaml
choices:
  - text: "A: <tag>"
    to: chapter-02
  - text: "B: <tag>"
    to: chapter-02
```

Chapter 6 has no `choices`: it ends the season, and its vote opens the next one.

- ◆ Agree on the six episodes and their votes.

End with `story check` passing (warnings are fine) and the line
`Story 5/5 · Season ✓ · 6 episodes, 6 votes · show 3/7 · next: /episode`.

## Hand-off

Make episode 1 with `/episode` from chapter 1. Each card in `cards/` is one `cast` entry as it is. The narrator says
"You" for the lead and the third person for everyone else, as `/episode` says. When its vote is in, `/series` makes the next one from the matching chapter.
