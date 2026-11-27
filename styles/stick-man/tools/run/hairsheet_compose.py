# hair look sheet: rows = styles, columns = views, labelled
import sys, os
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]; out = sys.argv[2]
TYPES = {'mw': ['side part', 'pompadour', 'buzz cut', 'afro', 'pixie', 'high ponytail', 'crop', 'curly top', 'elder', 'woman', 'girl']}
STYLE = {'mw': ['side', 'pompadour', 'buzz', 'afro', 'pixie', 'ponytail', 'crop', 'curly', 'elder', 'woman', 'girl']}
# the face check's share per close view (tools/gates/facegate-hair.mjs --json), printed in the cell
FACE = __import__('json').load(open(sys.argv[4])) if len(sys.argv) > 4 else {}
# the bowed column's nod, read from the head bone by hairsheet.html (its '[kit] nod <style>: head pitched X deg' lines, shot.mjs's
# stderr saved as <dir>/nod.txt), printed in the bowed cell
import re
NOD = {m.group(1): m.group(2) for m in re.finditer(r'nod (\S+): head pitched ([\d.]+) deg', open(os.path.join(d, 'nod.txt')).read())} if os.path.exists(os.path.join(d, 'nod.txt')) else {}
FV = {2: 'front', 3: 'q34s', 4: 'low'}   # q34s: the face check's view of this sheet's 3/4 (az 38)
rows = TYPES[sys.argv[3]] if len(sys.argv) > 3 else ['hairCap (today)', 'bun (today)', 'side part', 'crop', 'curly top', 'elder', 'woman (bun)', 'girl (buns)']
cols = ['beat-0 front', 'beat-0 low front', 'close front', 'close 3/4', 'close low front', 'close back', 'close top', 'close bowed', 'silhouette front', 'silhouette side']; NC = len(cols)
T = 230; LW = 170; TH = 34
try: F = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 20)
except Exception: F = ImageFont.load_default()
S = Image.new('RGB', (LW + T * NC, TH + T * len(rows)), (235, 235, 232)); g = ImageDraw.Draw(S)
for c, n in enumerate(cols): g.text((LW + c * T + 8, 7), n, fill=(20, 20, 20), font=F)
for r, n in enumerate(rows):
    g.text((8, TH + r * T + T // 2 - 10), n, fill=(20, 20, 20), font=F)
    for c in range(NC):
        p = os.path.join(d, f'h_{r * NC + c}.png')   # every row from hairsheet.html (the two caps of today included)
        if not os.path.exists(p): continue
        im = Image.open(p).convert('RGB')
        if im.width != 720: im = im.resize((720, 1280))   # (a full-size render: the crops are in 720 x 1280)
        box = (180, 440, 540, 800) if c < 2 else (110, 380, 610, 880) if len(sys.argv) <= 3 else (10, 330, 710, 1030)   # the figure / the head (a type's sheet: head and shoulders, for the long styles)
        S.paste(im.crop(box).resize((T - 4, T - 4)), (LW + c * T + 2, TH + r * T + 2))
        st = STYLE.get(sys.argv[3], [None] * 99)[r] if len(sys.argv) > 3 else None
        if c == 7 and st in NOD: x, y = LW + c * T + 8, TH + r * T + 6; g.rectangle((x - 4, y - 2, x + 130, y + 24), fill=(255, 255, 255)); g.text((x, y), f'nod {NOD[st]} deg', fill=(20, 20, 20), font=F)
        if st in FACE and c in FV:
            f = FACE[st][FV[c]]; v = f['face']; m = min(f['eyeL'], f['eyeR'], f['mouth']); t = f'face {100 * v:.0f}  eye/mth {100 * m:.0f}'; x, y = LW + c * T + 8, TH + r * T + T - 32
            g.rectangle((x - 4, y - 2, x + 200, y + 24), fill=(255, 255, 255) if v >= 0.85 and m >= 0.95 else (255, 205, 200)); g.text((x, y), t, fill=(20, 20, 20), font=F)
S.save(out, quality=88); print(out, S.size)
