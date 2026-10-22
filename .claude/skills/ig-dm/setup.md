# ChatbotX setup for /ig-dm

`/ig-dm` writes your comment-to-DM flow as a file. To make it answer real comments you need your **own** ChatbotX
account; Kaiships Studio does not include or resell the service. One-time setup, about 15 minutes.

## 1. Instagram side

1. Your Instagram account must be a **professional account** (Creator or Business): Instagram app, Settings,
   Account type and tools.
2. Allow tools to answer your messages: Settings, Messages and story replies, Message controls, Connected tools,
   turn on **Allow access to messages**.

## 2. ChatbotX side

1. Create an account at ChatbotX and a workspace.
2. Connect your Instagram account as a channel (Channels, Instagram, follow the login).
3. Create an API key: Settings, Developer, API Keys. Copy it somewhere safe. Never paste it into a file in
   `workspace/` and never share it in a screenshot.

## 3. Connect ChatbotX to Claude Code (optional, recommended)

With the MCP connection, `/ig-dm` creates the flow, the tag and the keyword for you. Without it, `/ig-dm` still
writes the flow and you click it together by hand (step 5).

ChatbotX shows the MCP server address for your workspace next to your API key (Settings, Developer). If you cannot
find it, ask ChatbotX support for "the MCP server URL for my workspace". Then, in a terminal in this folder:

```
claude mcp add --transport http chatbotx <MCP server URL> --header "Authorization: Bearer <your API key>"
```

Name the server `chatbotx` so the tools show up as `chatbotx` tools. Restart Claude Code and type `/mcp`: `chatbotx`
should say connected. Instead of the command you can create `.mcp.json` in this folder:

```json
{
  "mcpServers": {
    "chatbotx": {
      "type": "http",
      "url": "<MCP server URL>",
      "headers": { "Authorization": "Bearer ${CHATBOTX_API_KEY}" }
    }
  }
}
```

and set `CHATBOTX_API_KEY` in your environment, so the key never sits in a file.

## 4. What /ig-dm builds through MCP

- a contact tag (e.g. `guide-lead`) for everyone who got the freebie
- the flow: a follow-gate message and a deliver message with your link button, or one instant message
- a keyword (`GUIDE`, `guide`, `Guide`) that starts the flow when someone **DMs** the word

A keyword alone fires on DMs only, **not on comments**. Comments need step 6.

## 5. Without MCP: build the flow by hand

Open `workspace/dm/<slug>.md`. In ChatbotX, Flows, New flow:
1. Start node: a Send Message node, channel Instagram, text = the `## Gate` text (or `## Deliver` for instant).
2. Follow gate only: add a button with the `button:` label, type **Start another node**, and connect it to a second
   Send Message node with the `## Deliver` text.
3. On the deliver message add a button with its label, type **Open website**, URL = `url` from the file.
4. After the message add an **Add tag** step with the `tag` from the file.
5. Publish. Then Keywords, New: the keyword in upper, lower and title case, pointing at this flow.

Button labels must be 20 characters or fewer.

## 6. Comment automation (in the ChatbotX dashboard, after the reel is posted)

This part has no API, so it is always a few clicks:

1. Open the Instagram comment automation page (Automation, Instagram comments; the address ends in `/ig-comments`)
   and create a new one.
2. Track: **Specific posts**, then choose your new reel. Thumbnails can be missing; match by caption and date.
3. Reply to comments that **contain** the keyword.
4. Private reply: **Flow**, pick the flow `/ig-dm` made (its name starts with the keyword).
5. Public reply: text, e.g. `Sent you a DM`.
6. Turn it on and save. Reopen it to check the flow is still selected.

If you delete and re-upload the reel, edit the automation and pick the new post; it does not follow automatically.

## 7. Test before you trust it

From a second Instagram account, comment the keyword on the reel. Expect the public reply under the comment and the
DM within a minute. Tap the buttons. If the gate button does nothing, the flow is missing the link between the two
messages: rebuild it with `/ig-dm`.

## Rules that keep the account safe

- Instagram allows one automatic private reply per comment, within 7 days of the comment.
- Only message people who commented or messaged first. Never send bulk or scheduled DMs to people who did not
  interact; it breaks Instagram's terms and restricts the account.
- The link must open without a login (test it in a private browser window).
