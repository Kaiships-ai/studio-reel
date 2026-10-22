# median hue of Clawd's body: saturated pixels in the box x0,y0,x1,y1 (fractions) of a cover PNG
import sys, colorsys; from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB'); W, H = im.size; x0, y0, x1, y1 = map(float, sys.argv[2:6])
hs = []
for y in range(int(y0*H), int(y1*H), 3):
    for x in range(int(x0*W), int(x1*W), 3):
        r, g, b = [c/255 for c in im.getpixel((x, y))]; h, s, v = colorsys.rgb_to_hsv(r, g, b)
        if s > 0.45 and v > 0.35 and (h < 0.15 or h > 0.95): hs.append((h*360 + 180) % 360 - 180)
hs.sort(); print(f'{sys.argv[1]}: median hue {hs[len(hs)//2]:.1f} deg over {len(hs)} px')
