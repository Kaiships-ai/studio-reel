# reel57 · skit · "Permission"  — keyword YOLO

Make one 3D skit reel for @kaiships.ai with Blocky Kai and Clawd, end to end. Read
`kaiship-business/.agents/skills/ksa-reel-skit/SKILL.md` first (and its SKIT-WRITING, VOICE, MOTION, SFX files).
Stop once: after the script, until Kai approves it. At the end, hand over the MP4 and the results table; don't wait for anything else.

## The seed (Kai picked it, 2026-10-15)
Every Claude Code user knows the permission dance: Claude asks "Do you want to proceed?" for every tiny command, you press
Yes, Yes, Yes until your finger hurts, then you get fed up and turn on **skip permissions** ("YOLO mode")… and that is
exactly when it runs the scary command. Kai: "phần hỏi quyền liên tục đúng đúng rồi đấy … joke nó phải dựa trên fact,
sad fact, hoặc 1 lần tồi tệ nhưng mà biến nó thành chuyện cười."

## Facts to respect (the joke stands on these; don't invent more)
- Dec 2025: a user asked Claude Code to tidy packages in an old repo; the log showed `rm -rf tests/patches/plan/ ~/` — one
  stray `~/` wiped the Mac's home directory. (https://gigazine.net/gsc_news/en/20251216-claude-code-cli-mac-deleted)
- Oct 2025: GitHub issue "CRITICAL: Claude Code executed rm -rf deleting entire home directory" (WSL).
  (https://claudeissues.com/issue/10077-bug-critical-claude-code-executed-rm-rf-deleting-entire-home-directory)
- Claude Code has a real flag `--dangerously-skip-permissions`; people call it YOLO mode.
- Do NOT: name real people, show real numbers we can't source, or make Clawd/Claude look evil. Clawd is cheerful and
  oblivious; the comedy is the timing (it asks about `ls` 20 times, then deletes everything without asking once).
- The on-screen command may be a stylised `rm -rf … ~/`; keep it readable for a non-coder (e.g. the folders vanishing).

## CTA (decided by Kai)
- Keyword **YOLO** (one uppercase word, Skool free, decision 0003). Not spoken: the last spoken line stays the joke.
  It goes in `CAPTION.md` and an end-card text after the button. The gift (for ksa-ig-magnet, not this reel): a safe
  Claude Code `settings.json` — allow the harmless commands, block `rm -rf`.
- ChatbotX was unreachable on 2026-10-15, so "YOLO is unused" is checked only in the repo (dm-flows, weeks, posts.csv).
  Re-check in ChatbotX before posting (ksa-ig-magnet's job).

## The creative part is yours
- Story, escalation, button, every line (SKIT-WRITING.md). 30–45 s, 12–20 lines.
- The set (Kai at his desk/keyboard with Clawd; your call on the place), screen content (the permission prompts are the
  visual gag), camera, cut rhythm, motion and reactions (MOTION.md), SFX design (SFX.md).
- This is the FIRST skit: also build `audio/sfx.py` + the first library in `kaiship-business/assets/sfx/` with licensed
  sounds (SFX.md "Workflow"). Production quality, not synth blips.
- Beat morphy-clone-02 clearly. "Hơi đơ và đơn giản" = not done.

## What is fixed
- Blocky Kai + default Clawd, sitting together, 9:16, cut to the speaker.
- Gemini voice: Kai = Achird, Clawd = Puck, one call (VOICE.md). No pitch/stretch/per-line speed.
- Every hit keyed to a spoken word. Captions clear of heads. Hook ≥ 8/10. Never post.
- Kai's rules this session: show what you will do before heavy steps; run heavy jobs one at a time (16 GB Mac); Opus
  medium effort (weekly quota ~98 % used), a high-effort verifier only for the voice and the final video check.

## Gate
Script table (# · who · style · line) + length estimate + one sentence on the idea and the button → Kai approves → build.

## Hand-over
`renders/reel57-permission.mp4`, `renders/cover.png`, `CAPTION.md` (with YOLO CTA), `REVIEW.md` (no ❌),
`vo/voice-qa.md` clean, QA-REPORT, results table for Kai. When done, the folder moves to `projects/backlog/`.
