"""
flow.py - turn a workspace DM flow (workspace/dm/<slug>.md) into the nodes and
edges JSON a ChatbotX flow is published with, and check it before you do.

The flow file has front matter (keyword, mode, url, tag, ...) and one section
per message: "## Gate" (only for mode: follow-gate) and "## Deliver". In each
section, the line starting with "button:" is the button label; every other
line is the message text.

Checks (all reported together):
  - keyword is one word, letters and digits only
  - button labels are 20 characters or fewer (ChatbotX rejects longer ones)
  - message text is 1000 characters or fewer (Instagram's DM limit)
  - url, when given, starts with https://
  - a follow-gate flow has both a Gate and a Deliver section

Usage (from the project folder)
  pixi run python .claude/skills/ig-dm/flow.py workspace/dm/<slug>.md --check
  pixi run python .claude/skills/ig-dm/flow.py workspace/dm/<slug>.md --start-id <id> -o workspace/dm/<slug>.nodes.json

--start-id is the id of the start node ChatbotX seeds when a flow is created
(read it with flows_get). Without it, a new id is generated.
"""

import argparse
import json
import random
import re
import sys
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

LABEL_MAX = 20
TEXT_MAX = 1000
NODE_SIZE = {"width": 288, "height": 282}


def parse(raw):
    meta, body = {}, raw
    m = re.match(r"---[ \t]*\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n|$)", raw, re.S)
    if m:
        body = raw[m.end():]
        for line in m.group(1).splitlines():
            if ":" in line and not line.lstrip().startswith("#"):
                k, v = line.split(":", 1)
                meta[k.strip().lower()] = re.sub(r"\s+#.*$", "", v).strip()
    sections = {}
    for part in re.split(r"(?m)^##[ \t]+", body)[1:]:
        title, _, text = part.partition("\n")
        text_lines, button = [], None
        for line in text.splitlines():
            b = re.match(r"\s*button:\s*(.*)$", line, re.I)
            if b:
                button = b.group(1).strip()
            else:
                text_lines.append(line)
        sections[title.strip().lower()] = {
            "text": "\n".join(text_lines).strip(),
            "button": button,
        }
    return meta, sections


def check(meta, sections):
    problems = []
    kw = meta.get("keyword", "")
    if not kw:
        problems.append("keyword is missing from the front matter")
    elif not re.fullmatch(r"[A-Za-z0-9]+", kw):
        problems.append(f"keyword '{kw}' must be one word, letters and digits only")
    mode = meta.get("mode", "follow-gate").lower()
    if mode not in ("follow-gate", "instant"):
        problems.append(f"mode '{mode}' must be follow-gate or instant")
    needed = ["gate", "deliver"] if mode == "follow-gate" else ["deliver"]
    for name in needed:
        sec = sections.get(name)
        if not sec or not sec["text"]:
            problems.append(f"'## {name.title()}' section is missing or empty")
            continue
        if len(sec["text"]) > TEXT_MAX:
            problems.append(f"{name}: text is {len(sec['text'])} characters, over {TEXT_MAX}")
        if name == "gate" and not sec["button"]:
            problems.append("gate: needs a 'button:' line (e.g. button: I follow you)")
    for name, sec in sections.items():
        if sec["button"] and len(sec["button"]) > LABEL_MAX:
            problems.append(f"{name}: button '{sec['button']}' is {len(sec['button'])} characters, "
                            f"over {LABEL_MAX}")
    url = meta.get("url", "")
    if url and not url.startswith("https://"):
        problems.append(f"url '{url}' must start with https://")
    if not url:
        problems.append("note: no url, so the deliver message carries no button; put the link in its text")
    return [p for p in problems if not p.startswith("note:")], [p for p in problems if p.startswith("note:")]


def build(meta, sections, start_id=None, seed=None):
    rng = random.Random(seed)
    new_id = lambda: str(rng.randrange(10 ** 16, 10 ** 17))
    mode = meta.get("mode", "follow-gate").lower()
    tag = meta.get("tag") or (meta.get("keyword", "dm").lower() + "-lead")
    url = meta.get("url", "")

    def channel():
        return {"id": new_id(), "channel": "instagram", "stepType": "chooseChannel"}

    deliver_sec = sections["deliver"]
    deliver_id = new_id() if mode == "follow-gate" else (start_id or new_id())
    deliver_step = {"id": new_id(), "text": deliver_sec["text"], "stepType": "sendText", "buttons": []}
    if url:
        deliver_step["buttons"].append({
            "id": new_id(),
            "label": deliver_sec["button"] or "Open it",
            "steps": [{"id": new_id(), "stepType": "enableBot"}],
            "beforeStep": {"id": new_id(), "url": url, "stepType": "openWebsite", "browserSize": 100},
            "buttonType": "openWebsite",
        })
    deliver = {
        "id": deliver_id,
        "type": "sendMessage",
        "data": {
            "name": "Deliver",
            "isStartNode": mode != "follow-gate",
            "details": {
                "beforeStep": channel(),
                # The tag sits on the node, not on the URL button: Instagram opens
                # links without telling the bot, so button steps may never run.
                "steps": [deliver_step,
                          {"id": new_id(), "tags": [tag], "stepType": "addContactTag"}],
                "quickReplies": [],
            },
        },
        "measured": dict(NODE_SIZE),
        "position": {"x": 600 if mode == "follow-gate" else 100, "y": 300},
    }
    nodes, edges = [], []
    if mode == "follow-gate":
        gate_sec = sections["gate"]
        gate_id = start_id or new_id()
        button_id = new_id()
        nodes.append({
            "id": gate_id,
            "type": "sendMessage",
            "data": {
                "name": "Follow gate",
                "isStartNode": True,
                "details": {
                    "beforeStep": channel(),
                    "steps": [{
                        "id": new_id(),
                        "text": gate_sec["text"],
                        "stepType": "sendText",
                        "buttons": [{
                            "id": button_id,
                            "label": gate_sec["button"],
                            "steps": [],
                            "beforeStep": {"id": new_id(), "nodeId": deliver_id,
                                           "stepType": "startAnotherNode", "viewOnly": True},
                            "buttonType": "sendMessage",
                        }],
                    }],
                    "quickReplies": [],
                },
            },
            "measured": dict(NODE_SIZE),
            "position": {"x": 100, "y": 300},
        })
        # Without this edge the button shows but does nothing.
        edges.append({"id": button_id, "source": gate_id, "target": deliver_id,
                      "sourceHandle": button_id, "targetHandle": deliver_id})
    nodes.append(deliver)
    return {"nodes": nodes, "edges": edges}


def main():
    ap = argparse.ArgumentParser(description="Build ChatbotX flow JSON from a workspace DM file.")
    ap.add_argument("input", help="workspace/dm/<slug>.md")
    ap.add_argument("--start-id", help="id of the start node ChatbotX seeded for the flow")
    ap.add_argument("-o", "--out", help="write the JSON here instead of stdout")
    ap.add_argument("--check", action="store_true", help="only run the checks")
    args = ap.parse_args()

    src = Path(args.input)
    if not src.is_file():
        print(f"file not found: {args.input}", file=sys.stderr)
        sys.exit(2)
    meta, sections = parse(src.read_text(encoding="utf-8"))
    problems, notes = check(meta, sections)
    for n in notes:
        print(n, file=sys.stderr)
    if problems:
        print("FLOW CHECK  FIX", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        sys.exit(1)
    mode = meta.get("mode", "follow-gate")
    if args.check:
        print(f"FLOW CHECK  OK  keyword {meta['keyword']}  mode {mode}  "
              f"messages {len([s for s in ('gate', 'deliver') if s in sections])}")
        return
    flow = build(meta, sections, args.start_id, seed=meta.get("slug") or src.stem)
    text = json.dumps(flow, indent=2, ensure_ascii=False)
    if args.out:
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out).write_text(text + "\n", encoding="utf-8")
        print(f"wrote {args.out}  ({len(flow['nodes'])} nodes, {len(flow['edges'])} edges)",
              file=sys.stderr)
    else:
        print(text)


if __name__ == "__main__":
    main()
