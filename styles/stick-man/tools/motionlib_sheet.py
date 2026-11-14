"""Contact sheet for tools/motionlib.mjs --sheet: one row per clip (6 stills, left to right in time), its name above it.

python motionlib_sheet.py <spec.json>   spec = { rows: [{ label, files, frames }], out, title }
"""
import json
import sys

from PIL import Image, ImageDraw, ImageFont

TW, TH, PAD, LBL = 216, 384, 8, 26


def main(spec_path):
    spec = json.load(open(spec_path))
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
