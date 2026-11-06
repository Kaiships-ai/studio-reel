# faceluma.py: are the faces blown out? Reads frames (PNG/JPG) and prints JSON {skin, clipped, pct, worst}.
# Skin = pixels whose red channel leads and that are not grey (R > 95, R = max, max - min > 12): faces under any of the
# episode's lights, pink neon included. Clipped = every channel at 185+: the face washed to a pale blank, no features.
# The episode check fails over 2 % (the show's rule). White type is grey (max - min <= 12), so captions do not count.
#   python episode/faceluma.py frame1.png frame2.png ...
import sys, json
import numpy as np
from PIL import Image

def measure(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = np.max(a, -1), np.min(a, -1)
    skin = (r > 95) & (r == mx) & (mx - mn > 12)
    clip = skin & (mn >= 185)
    return int(skin.sum()), int(clip.sum())

if __name__ == '__main__':
    tot_s = tot_c = 0; worst = (0.0, None)
    for f in sys.argv[1:]:
        s, c = measure(f); tot_s += s; tot_c += c
        if s > 2000 and c / s > worst[0]: worst = (c / s, f)
    pct = 100 * tot_c / max(tot_s, 1)
    print(json.dumps({'skin': tot_s, 'clipped': tot_c, 'pct': round(pct, 2), 'worst': worst[1], 'worstPct': round(100 * worst[0], 2)}))
