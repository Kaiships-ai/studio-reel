# Token Diet

*A bonus playbook from the kaiships.ai Reel Kit*

Making a reel with Claude Code is a lot of back and forth: scripts, cuts, captions, renders, fixes. Every round trip costs tokens. These are three tools I use or recommend to keep that in check.

**Before you start:** you need Node.js 22.13 or newer (OmniRoute needs 22.22+ or 24+). Check with `node -v`. Get it from https://nodejs.org.

## 1. Caveman: make Claude talk less

**What it is.** A free skill that makes your agent answer in short, blunt "caveman" sentences. Code, commands, file paths and exact error messages stay untouched. Only the prose around them gets cut.

**How I use it.** I run it on full (the old name for today's default, `/caveman`).

**What its README says.** In the repo's own test, default `/caveman` cut output tokens by a median 3%, "inside the noise"; `/ultracave` cut 35% (length only, not correctness). Its rules add about 1,000 input tokens to every call, so on short one-line Q&A it can cost more than it saves. The README's advice: measure it yourself, and turn it off if it loses.

```bash
npx skills add JuliusBrussee/caveman -g
```

Type `/caveman` if it doesn't switch on by itself. Other modes: `/ultracave` strips the grammar, `/megacave` speaks classical Chinese. To turn it off, say `stop caveman`, `/caveman off` or `normal mode`.

Source: https://github.com/JuliusBrussee/caveman

## 2. CodeBurn: see where your tokens go

**What it is.** A free tool that reads the session files Claude Code already saves on your computer and shows what you spent, by tool, model, project and task. No account, no sign-up. On a subscription the dollar figure is an estimate: your measured tokens priced at published API rates.

**How I use it.** After a render session, to see which part of the work ate the tokens.

```bash
npm i -g codeburn@latest      # update to the latest version
codeburn                      # dashboard; arrow keys change the period
codeburn optimize             # lists what costs tokens without earning them
codeburn optimize --apply     # review and apply the fixes
codeburn act undo --last      # put the last fix back
```

`optimize` points out things like a file the agent re-reads every turn, an MCP server you installed and never call, or a `CLAUDE.md` that grew long enough to ride along in every request.

Source: https://github.com/getagentseal/codeburn

## 3. OmniRoute: my pick for when the quota runs out

**What it is.** A free, MIT-licensed AI gateway that runs on your own computer. One endpoint in front of many AI providers, with automatic fallback to another provider when one hits its limit. Claude Code is one of the supported tools.

**When to reach for it.** When your Claude quota runs out in the middle of a session and you still have a reel to finish.

```bash
npm install -g omniroute
omniroute                                  # window 1: gateway + dashboard, localhost:20128
omniroute run claude --model openai/gpt-5.4   # window 2
```

**Two windows:** `omniroute` keeps the first busy, so type `omniroute run` in a second. Connect a provider under **Providers** first, then swap `openai/gpt-5.4` (the README's example) for one of its models. No config files written.

**Know the trade-off.** Your prompts and files go to whatever provider you connect. You'll be on a different model, so output can differ. Check each provider's terms before connecting an account.

Source: https://github.com/diegosouzapw/OmniRoute

## A reel session routine

1. **Measure.** Open `codeburn` after a session. Run `codeburn optimize` now and then to clear out waste.
2. **Compress.** Caveman on, then check in CodeBurn that it actually helps on your work.
3. **Fall back.** If the quota runs out, launch Claude Code through OmniRoute and finish the reel.

---

*Tools I use or recommend. You install them yourself, from their official pages. Kaiships has no affiliation with any of them.*
