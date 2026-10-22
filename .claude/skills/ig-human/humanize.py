"""
humanize.py - strip the machine fingerprint out of a draft.

Three passes, in this order:

  1. INVISIBLE   delete or normalise the characters a human keyboard never
                 produces: zero-width joiners, word joiners, soft hyphens,
                 BOMs, Unicode tag characters, non-breaking and narrow spaces.
                 These survive copy-paste and are the most mechanical tell in
                 any generated text.
  2. TYPOGRAPHIC em dash -> comma, en dash -> hyphen, curly quotes -> straight,
                 ellipsis -> three dots, bullet -> hyphen.
  3. LEXICAL     replace the slop lexicon in slop.json with plain words,
                 preserving capitalisation and leaving URLs untouched.

Structural tells (rule-of-three, "not just X, it's Y", hashtag walls) are
REPORTED, never auto-rewritten - rewriting a sentence's shape needs judgement,
so that is the model's job, not a regex's.

Usage (from the project folder)
  pixi run python .claude/skills/ig-human/humanize.py workspace/scripts/<slug>.md --in-place --report
        cleans the "## Script" section in place, keeps <slug>.orig.md, sets status: humanized
  pixi run python .claude/skills/ig-human/humanize.py workspace/captions/<slug>.md --in-place --section Caption
  pixi run python .claude/skills/ig-human/humanize.py draft.txt -o clean.txt --report
  add --json to emit {text, report} as JSON
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path
import unicodedata

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

HERE = os.path.dirname(os.path.abspath(__file__))
LEX = os.path.join(HERE, "slop.json")

URL_RE = re.compile(r"https?://\S+|www\.\S+|\S+@\S+\.\S+")
SENT_RE = re.compile(r"[^.!?\n]+[.!?]*")



def strip_front_matter(raw):
    """Drop the leading --- ... --- block that workspace files carry."""
    m = re.match(r"---[ \t]*\r?\n.*?\r?\n---[ \t]*(?:\r?\n|$)", raw, re.S)
    return raw[m.end():] if m else raw


def md_span(raw, name):
    """(start, end) of the text under '## name', up to the next heading, or None."""
    m = re.search(r"(?im)^#{2,3}[ \t]+" + re.escape(name) + r"[ \t]*$", raw)
    if not m:
        return None
    nxt = re.search(r"(?m)^#{1,3}[ \t]", raw[m.end():])
    return m.end(), (m.end() + nxt.start()) if nxt else len(raw)


def md_section(raw, name):
    """Text under '## name' up to the next heading, or None if there is none."""
    span = md_span(raw, name)
    return raw[span[0]:span[1]] if span else None


def read_input(path, section=None, default_section=None):
    """Read a file or stdin. For a workspace .md file, keep only one section."""
    if path == "-":
        raw = sys.stdin.read()
    else:
        p = Path(path)
        if not p.is_file():
            print(f"file not found: {path}", file=sys.stderr)
            sys.exit(2)
        raw = p.read_text(encoding="utf-8")
    want = section or (default_section if path.lower().endswith(".md") else None)
    if not want:
        return raw
    body = md_section(raw, want)
    if body is None:
        if section:
            print(f"no '## {section}' section in {path}", file=sys.stderr)
            sys.exit(2)
        return strip_front_matter(raw)
    return body


def load_lexicon(path=LEX):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def _cp(spec):
    """'U+200B' -> '\\u200b';  'U+E0000-U+E007F' -> (start, end)."""
    if "-" in spec:
        a, b = spec.split("-")
        return (int(a[2:], 16), int(b[2:], 16))
    return int(spec[2:], 16)


def protect_urls(text):
    """Swap URLs for placeholders so no pass rewrites inside a link."""
    found = []

    def stash(m):
        found.append(m.group(0))
        return f"\x00URL{len(found) - 1}\x00"

    return URL_RE.sub(stash, text), found


def restore_urls(text, found):
    for i, url in enumerate(found):
        text = text.replace(f"\x00URL{i}\x00", url)
    return text


def pass_invisible(text, lex):
    """Delete or space-normalise invisible characters. Returns (text, hits)."""
    hits = []
    for entry in lex["invisible"]:
        cp = _cp(entry["cp"])
        if isinstance(cp, tuple):
            pattern = "[" + re.escape(chr(cp[0])) + "-" + re.escape(chr(cp[1])) + "]"
        else:
            pattern = re.escape(chr(cp))
        n = len(re.findall(pattern, text))
        if n:
            hits.append({"name": entry["cp"] + " " + entry["name"], "count": n,
                         "action": entry["action"]})
            text = re.sub(pattern, "" if entry["action"] == "delete" else " ", text)
    # Any remaining Cf (format) character is invisible by definition.
    stray = [c for c in text if unicodedata.category(c) == "Cf"]
    if stray:
        hits.append({"name": "other invisible format chars", "count": len(stray),
                     "action": "delete"})
        text = "".join(c for c in text if unicodedata.category(c) != "Cf")
    return text, hits


def pass_typographic(text, lex):
    hits = []
    for entry in lex["typographic"]:
        ch = entry["from"]
        n = text.count(ch)
        if not n:
            continue
        hits.append({"name": f"{ch} {entry['name']}", "count": n, "to": entry["to"].strip() or "(space)"})
        if ch == "—":
            # " word — word " and "word—word" both collapse to a comma + space.
            text = re.sub(r"\s*—\s*", ", ", text)
        elif ch == "–":
            text = re.sub(r"\s*–\s*(?=\d)", "-", text)      # 5–10  -> 5-10
            text = re.sub(r"\s+–\s+", ", ", text)            # used as em dash
            text = text.replace("–", "-")
        else:
            text = text.replace(ch, entry["to"])
    # A comma inserted before existing punctuation reads wrong.
    text = re.sub(r",\s*([,.;:!?])", r"\1", text)
    text = re.sub(r",\s*\n", "\n", text)
    return text, hits


def _match_case(src, repl):
    if not repl:
        return repl
    if src.isupper() and len(src) > 1:
        return repl.upper()
    if src[0].isupper():
        return repl[0].upper() + repl[1:]
    return repl


def pass_lexical(text, lex):
    """Replace slop words and phrases. Longest first so phrases win."""
    hits = []
    entries = sorted(lex["phrases"] + lex["words"],
                     key=lambda e: len(e["find"]), reverse=True)
    for entry in entries:
        find = entry["find"]
        pattern = re.compile(r"\b" + re.escape(find).replace(r"\ ", r"\s+") + r"\b",
                             re.IGNORECASE)
        found = pattern.findall(text)
        if not found:
            continue
        hits.append({"find": find, "replace": entry["replace"] or "(deleted)",
                     "count": len(found), "family": entry["family"]})
        text = pattern.sub(lambda m: _match_case(m.group(0), entry["replace"]), text)
    # Clean up after deletions. Deleting a whole clause leaves orphaned
    # punctuation behind ("system. ." or a line that now opens on a comma),
    # and that reads worse than the slop did.
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"(?m)^[ \t]*(?:[,.;:]+[ \t]*)+", "", text)
    text = re.sub(r"(?m)^[ \t](?=\S)", "", text)       # one space left by a deletion.
                                                      # Deeper indents are deliberate.
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    text = re.sub(r",\s*([,.;:!?])", r"\1", text)      # an em dash became a comma,
                                                      # then the clause after it went
    text = text.replace("...", "\x00ELL\x00")          # protect real ellipses
    text = re.sub(r"\.\s*\.+", ".", text)
    text = re.sub(r"([!?])\s*\.", r"\1", text)
    text = text.replace("\x00ELL\x00", "...")
    text = re.sub(r"(?m)^[ \t]+$", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    # An em dash that became a comma, followed by a sentence connective, leaves
    # a splice ("is important, also, it's proof"). Promote it to a full stop.
    text = re.sub(r",\s*(also|so|still|basically|in the end)\s*,\s*",
                  lambda m: ". " + m.group(1)[0].upper() + m.group(1)[1:] + ", ", text)
    return text, hits


def scan_structures(text, lex):
    flags = []
    for s in lex["structures"]:
        try:
            pattern = re.compile(s["regex"], re.MULTILINE)
        except re.error:
            continue
        found = pattern.findall(text)
        if found:
            flags.append({"name": s["name"], "count": len(found), "fix": s["fix"]})
    # Sentence-length uniformity is structural too.
    lens = [len(s.split()) for s in SENT_RE.findall(text) if len(s.split()) > 2]
    if len(lens) >= 4:
        mean = sum(lens) / len(lens)
        var = sum((n - mean) ** 2 for n in lens) / len(lens)
        cv = (var ** 0.5) / mean if mean else 0
        if cv < 0.35:
            flags.append({
                "name": f"Uniform sentence length (variation {cv:.2f})",
                "count": len(lens),
                "fix": "Break one sentence in half. Let another run long. Machines write even.",
            })
    return flags


def restore_capitals(original, text):
    """Deleting an opener leaves the next word lower case.

    Only fix it for writers who capitalise their sentences in the first place:
    a deliberately lower-case voice is a style, not an artefact, and shouting
    over it would be exactly the kind of thing this script exists to stop.
    """
    starts = re.findall(r"(?:^|[.!?]\s+|\n)\s*([A-Za-z])", original)
    if not starts or sum(1 for c in starts if c.isupper()) * 2 < len(starts):
        return text
    return re.sub(r"(?:^|(?<=[.!?] )|(?<=[.!?]\n)|(?<=\n))\s*([a-z])",
                  lambda m: m.group(0)[:-1] + m.group(1).upper(), text)


def humanize(text, lex):
    raw_for_case = text
    text, urls = protect_urls(text)
    text, inv = pass_invisible(text, lex)
    text, typo = pass_typographic(text, lex)
    text, lexi = pass_lexical(text, lex)
    text = restore_capitals(raw_for_case, text)
    text = restore_urls(text, urls)
    return text.strip() + "\n", {
        "invisible": inv,
        "typographic": typo,
        "lexical": lexi,
        "structures": scan_structures(text, lex),
    }


def render_report(report, out=sys.stderr):
    def head(title):
        print(f"\n{title}\n" + "-" * len(title), file=out)

    total = sum(h["count"] for h in report["invisible"]) \
        + sum(h["count"] for h in report["typographic"]) \
        + sum(h["count"] for h in report["lexical"])

    head("HUMANIZE REPORT")
    print(f"{total} machine artefacts removed, "
          f"{len(report['structures'])} structural tells flagged for rewrite", file=out)

    if report["invisible"]:
        head("1. INVISIBLE CHARACTERS")
        for h in report["invisible"]:
            print(f"  {h['count']:>3}x  {h['name']}  -> {h['action']}", file=out)
    if report["typographic"]:
        head("2. TYPOGRAPHY")
        for h in report["typographic"]:
            print(f"  {h['count']:>3}x  {h['name']}  -> {h['to']}", file=out)
    if report["lexical"]:
        head("3. SLOP LEXICON")
        for h in report["lexical"]:
            print(f"  {h['count']:>3}x  {h['find']}  -> {h['replace']}   [{h['family']}]", file=out)
    if report["structures"]:
        head("4. STRUCTURAL TELLS  (not auto-fixed - rewrite these yourself)")
        for h in report["structures"]:
            print(f"  {h['count']:>3}x  {h['name']}\n        {h['fix']}", file=out)
    if not any(report.values()):
        head("CLEAN")
        print("  Nothing to strip.", file=out)
    print("", file=out)


def merge_reports(reports):
    merged = {"invisible": [], "typographic": [], "lexical": [], "structures": []}
    for r in reports:
        for k in merged:
            merged[k].extend(r[k])
    return merged


def humanize_sections(raw, names, lex):
    """Clean only the named markdown sections; everything else stays byte for byte."""
    reports, done = [], []
    for name in names:
        span = md_span(raw, name)
        if not span:
            continue
        body = raw[span[0]:span[1]]
        if not body.strip():
            continue
        clean, rep = humanize(body, lex)
        raw = raw[:span[0]] + "\n" + clean.rstrip("\n") + "\n\n" + raw[span[1]:].lstrip("\n")
        reports.append(rep)
        done.append(name)
    fm = re.match(r"---[ \t]*\n.*?\n---[ \t]*\n", raw, re.S)
    if fm and done:
        head = re.sub(r"(?m)^status:.*$", "status: humanized", fm.group(0))
        raw = head + raw[fm.end():]
    return raw, merge_reports(reports), done


def main():
    ap = argparse.ArgumentParser(description="Strip the machine fingerprint out of a draft.")
    ap.add_argument("input", nargs="?", default="-", help="file, or - for stdin")
    ap.add_argument("-o", "--out", help="write cleaned text here instead of stdout")
    ap.add_argument("--in-place", action="store_true",
                    help="rewrite the file itself; the first run keeps a .orig copy next to it")
    ap.add_argument("--section", action="append",
                    help='markdown section(s) to clean (default for .md: "Script")')
    ap.add_argument("--report", action="store_true", help="print what changed, to stderr")
    ap.add_argument("--json", action="store_true", help="emit {text, report} as JSON")
    ap.add_argument("--lexicon", default=LEX, help="path to slop.json")
    args = ap.parse_args()

    lex = load_lexicon(args.lexicon)
    is_md = args.input.lower().endswith(".md")
    sections = args.section or (["Script"] if is_md else None)

    if args.in_place:
        if args.input == "-":
            print("--in-place needs a file, not stdin", file=sys.stderr)
            sys.exit(2)
        src = Path(args.input)
        if not src.is_file():
            print(f"file not found: {args.input}", file=sys.stderr)
            sys.exit(2)
        raw = src.read_text(encoding="utf-8")
        if sections:
            clean, report, done = humanize_sections(raw, sections, lex)
            if not done:
                print(f"no non-empty section {sections} in {args.input}; nothing changed",
                      file=sys.stderr)
                sys.exit(2)
        else:
            clean, report = humanize(raw, lex)
        backup = src.with_name(src.stem + ".orig" + src.suffix)
        if not backup.exists():
            backup.write_text(raw, encoding="utf-8")
            print(f"kept the original as {backup}", file=sys.stderr)
        src.write_text(clean, encoding="utf-8")
        print(f"rewrote {src}", file=sys.stderr)
    else:
        raw = read_input(args.input, args.section[0] if args.section else None)
        clean, report = humanize(raw, lex)
        if args.json:
            print(json.dumps({"text": clean, "report": report}, indent=2, ensure_ascii=False))
            return
        if args.out:
            Path(args.out).write_text(clean, encoding="utf-8")
            print(f"wrote {args.out}", file=sys.stderr)
        else:
            sys.stdout.write(clean)
    if args.json:
        print(json.dumps({"report": report}, indent=2, ensure_ascii=False))
    elif args.report:
        render_report(report)


if __name__ == "__main__":
    main()
