"""Contact sheet for tools/motionlib.mjs --sheet: one row per clip (6 stills, left to right in time), its name above it.

python motionlib_sheet.py <spec.json>   spec = { rows: [{ label, files, frames }], out, title }
Grid (tools/rigtest.mjs): spec = { grid: [{ label, sub, bad, files, tags }], cols, tile: [w, h], out, title }: each cell is
one clip's tiles side by side under its label, cols cells a line, a red label when bad.
"""
import json
import sys

from PIL import Image, ImageDraw, ImageFont

TW, TH, PAD, LBL = 216, 384, 8, 26


def grid(spec):
    cells, cols = spec["grid"], spec.get("cols", 3)
    tw, th = spec.get("tile", [TW, TH])
    n = max(len(c["files"]) for c in cells)
    cw, ch = n * tw + (n - 1) * 2, 46 + th
    W = PAD + cols * (cw + 2 * PAD)
    H = 44 + -(-len(cells) // cols) * (ch + PAD)
    sheet = Image.new("RGB", (W, H), (236, 236, 238))
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("Helvetica", 16)
        small = ImageFont.truetype("Helvetica", 12)
    except OSError:
        font = small = ImageFont.load_default()
    d.text((PAD, 10), spec.get("title", ""), fill=(20, 20, 24), font=font)
    for i, c in enumerate(cells):
        x0, y0 = PAD + (i % cols) * (cw + 2 * PAD), 44 + (i // cols) * (ch + PAD)
        ink = (196, 30, 30) if c.get("bad") else (20, 20, 24)
        d.text((x0, y0), c["label"], fill=ink, font=font)
        d.text((x0, y0 + 22), c.get("sub", ""), fill=ink, font=small)
        for j, (f, tag) in enumerate(zip(c["files"], c.get("tags", [""] * n))):
            x = x0 + j * (tw + 2)
            sheet.paste(Image.open(f).convert("RGB").resize((tw, th)), (x, y0 + 42))
            d.text((x + 4, y0 + 46), tag, fill=(255, 255, 255), font=small)
    sheet.save(spec["out"], quality=88)


def main(spec_path):
    spec = json.load(open(spec_path))
    if "grid" in spec:
        return grid(spec)
    rows = spec["rows"]
    n = max(len(r["files"]) for r in rows)
    W = PAD + n * (TW + PAD)
    H = 44 + len(rows) * (LBL + TH + PAD)
    sheet = Image.new("RGB", (W, H), (236, 236, 238))
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("Helvetica", 18)
        small = ImageFont.truetype("Helvetica", 13)
    except OSError:
        font = small = ImageFont.load_default()
    d.text((PAD, 10), spec.get("title", ""), fill=(20, 20, 24), font=font)
    y = 44
    for r in rows:
        d.text((PAD, y + 4), r["label"], fill=(20, 20, 24), font=font)
        for i, (f, fr) in enumerate(zip(r["files"], r["frames"])):
            im = Image.open(f).convert("RGB").resize((TW, TH))
            x = PAD + i * (TW + PAD)
            sheet.paste(im, (x, y + LBL))
            d.text((x + 6, y + LBL + 6), f"f{fr}", fill=(255, 255, 255), font=small)
        y += LBL + TH + PAD
    sheet.save(spec["out"], quality=88)


if __name__ == "__main__":
    main(sys.argv[1])
