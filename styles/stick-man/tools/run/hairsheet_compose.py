# hair look sheet: rows = styles, columns = views, labelled
import sys, os
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]; out = sys.argv[2]
rows = ['hairCap (today)', 'bun (today)', 'side part', 'crop', 'curly top', 'elder', 'woman (bun)', 'girl (buns)']
cols = ['beat-0 front', 'beat-0 low front', 'close front', 'close 3/4', 'close low front', 'close back']
T = 230; LW = 150; TH = 34
try: F = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 20)
except Exception: F = ImageFont.load_default()
S = Image.new('RGB', (LW + T * 6, TH + T * 8), (235, 235, 232)); g = ImageDraw.Draw(S)
for c, n in enumerate(cols): g.text((LW + c * T + 8, 7), n, fill=(20, 20, 20), font=F)
for r, n in enumerate(rows):
    g.text((8, TH + r * T + T // 2 - 10), n, fill=(20, 20, 20), font=F)
    for c in range(6):
        p = os.path.join(d, f'old_{r * 5 + c}.png') if r < 2 else os.path.join(d, f'h_{r * 6 + c}.png')
        if (r < 2 and c > 4) or not os.path.exists(p): continue
        im = Image.open(p).convert('RGB')
        box = (180, 440, 540, 800) if c < 2 else (110, 380, 610, 880)   # the figure / the head
        S.paste(im.crop(box).resize((T - 4, T - 4)), (LW + c * T + 2, TH + r * T + 2))
S.save(out, quality=88); print(out, S.size)
