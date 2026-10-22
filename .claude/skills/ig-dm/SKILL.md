---
name: ig-dm
description: >-
  Set up comment-keyword to DM automation for a reel: someone comments the
  keyword, gets a public reply and a DM with the freebie. Writes the flow to
  workspace/dm/<slug>.md and, when the user's own ChatbotX account is connected
  through its MCP server, creates the tag, flow and keyword there. Also writes
  one-off DMs (reply to a hand raised, warm approach, collab pitch, follow-ups).
  Use when the user types /ig-dm, says "comment to DM", "auto DM", "set up the
  keyword", "lead magnet", or "what do I send them".
argument-hint: <slug | KEYWORD | nothing = newest script>
---

# /ig-dm

The comment-to-DM funnel for one reel, built on the user's own ChatbotX account. By Kaiships.
First time? Walk the user through `setup.md` in this folder.

```
pixi run python .claude/skills/ig-dm/flow.py workspace/dm/<slug>.md --check
pixi run python .claude/skills/ig-dm/flow.py workspace/dm/<slug>.md --start-id <id> -o workspace/dm/<slug>.nodes.json
```

## 1. Gather (never stop on a missing file)

`$ARGUMENTS`: a slug, or a keyword. Nothing → the newest `workspace/scripts/*.md` (not `.orig.md`).
- `workspace/scripts/<slug>.md`: `cta_keyword` and the CTA line (what the reel promises).
- `workspace/brand.md`: `cta_keyword`, `deliverable`, `deliverable_url`, Voice.
- Missing any of these four → ask once, in one message: the keyword (one word), what they get, the public link to
  it, and follow gate yes/no (default: no, instant delivery). Mention `/studio` saves keyword and freebie for next time.

The keyword in the flow must match the word the reel says and the caption asks for, exactly.

## 2. Write the flow file

Copy `flows/instant.md` (default) or `flows/follow-gate.md` to `workspace/dm/<slug>.md` (create the folder) and fill
it. Copy rules for the deliver message:
- **The thing first**, in message one, no "before I send it, what do you do?". That is a bait and switch.
- One line on how to use it, then one question they can answer in four words.
- Plain, warm, short; the user's voice. Never promise results.

Clean it: `pixi run python .claude/skills/ig-human/humanize.py workspace/dm/<slug>.md --in-place --section Gate --section Deliver --report`.
Then `flow.py --check` and fix every line it prints (labels over 20 characters, a keyword with spaces, a non-https
link). Check the link opens without a login before wiring it.

## 3. Build it in ChatbotX (only if the MCP is connected)

Connected = tools from the `chatbotx` MCP server are available (e.g. `flows_create`, `keywords_create`). Read each
tool's schema before calling it. Not connected → skip to step 4 and point the user to `setup.md` sections 3 and 5.

1. **Keyword taken?** `keywords_list`. If the word already exists, ask: point it at the new flow, or pick another
   word. Never create a second keyword with the same word (one DM would start two flows).
2. **Tag**: `tags_get` the file's `tag`; `tags_create` if missing.
3. **Flow**: `flows_create` named `<KEYWORD> · <slug>`, then `flows_get` to read the seeded start node id.
4. **Nodes**: run `flow.py ... --start-id <that id> -o workspace/dm/<slug>.nodes.json`, then `flows_publish` with its
   `nodes` and `edges`. A follow gate needs its edge; publishing with no edges gives a button that does nothing.
5. **Verify**: `flows_get` shows the latest version contains the link and one edge per gate button.
6. **Keyword**: `keywords_create` with `[KEYWORD, keyword, Keyword]` and the flow id; enabled.
7. Write `flow_id`, `keyword_id` and `status: built` into the file's front matter.

Any call fails → show the error, keep the file, and give the manual path (`setup.md` section 5). Never retry by
creating duplicates.

## 4. Hand off

```
DM FLOW READY  workspace/dm/<slug>.md
keyword:  GUIDE   mode: instant   link: checked
chatbotx: built (flow <id>, keyword <id>)   | or: not connected, build by hand: setup.md section 5
after you post the reel: turn on the comment automation (setup.md section 6), then test from a second account
next:     /make-reel workspace/scripts/<slug>.md   then /ig-caption <slug>
```

The comment automation has no API: the user always switches it on in the ChatbotX dashboard after posting.

## One-off DMs (no automation)

Only three kinds are worth writing: the **reply to a hand raised** (they commented, replied to a story, asked), the
**warm approach** (someone the user has genuinely been commenting on for weeks), the **collab pitch** (what you watched
them do, the idea, what they get, what you need). Ask who, the trigger (why today), and what the user wants. No
trigger, no message: say so.

Two to four sentences, reference the specific thing in their words, give before asking, one small ask, no link or
calendar in message one. Follow-ups: two at most, +4 days with something new, +10 days to close the loop. Run each
through `/ig-human`. The user sends them by hand.

**Never** automate outreach to people who did not interact, never invent a shared history, never put the pitch in
the same message as the compliment.
