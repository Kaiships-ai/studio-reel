# onion.py <out.png> <frame.png ...>: onion skin of a beat (first frame solid, the rest blended at 30 %) to eyeball the arc / any wobble
import sys
from PIL import Image
fs = sys.argv[2:]; base = Image.open(fs[0]).convert('RGB')
for f in fs[1:]: base = Image.blend(base, Image.open(f).convert('RGB'), 0.3)
base.save(sys.argv[1]); print(sys.argv[1], len(fs))
