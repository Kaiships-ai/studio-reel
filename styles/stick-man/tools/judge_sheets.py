"""Sheets for the style judge (tools/judge.mjs), built the same way for the reference and for our reel.

  python judge_sheets.py <job.json>

job.json: {"ref": [sheet.jpg, ...], "ref_grid": [10, 3], "ref_pick": [[sheet, index], ...],
           "ours": [frame.png, ...], "tile": [270, 480], "quality": 90, "cols": 6,
           "out": {"ref": [a.jpg, b.jpg], "ours": [c.jpg, d.jpg]}, "blind": {"dir": d, "ref": [k...], "ours": [k...], "order": [...]}}

Every tile, reference or ours, goes through the same steps: scaled to the tile size (ours from the full frame, LANCZOS; the
reference tiles are already that size), one JPEG pass at the reference's quality and 4:2:0 subsampling (read from the
reference file: IJG quality 90), decoded, then laid out on a sheet saved with the same JPEG settings. So neither side looks
sharper or blockier than the other because of the pipeline.
"""
import io
import json
import sys

from PIL import Image


def jpeg_pass(im, q):
    b = io.BytesIO()
    im.save(b, 'JPEG', quality=q, subsampling='4:2:0')
    b.seek(0)
    return Image.open(b).convert('RGB')


def main():
    job = json.load(open(sys.argv[1]))
    tw, th = job['tile']
    q = job['quality']
    cols = job['cols']
    sheets = [Image.open(p).convert('RGB') for p in job['ref']]
    gc, gr = job['ref_grid']
    ref_tiles = []
    for s, k in job['ref_pick']:
        im = sheets[s]
        w, h = im.width // gc, im.height // gr
        x, y = (k % gc) * w, (k // gc) * h
        t = im.crop((x, y, x + w, y + h))
        if t.size != (tw, th):
            t = t.resize((tw, th), Image.LANCZOS)
        ref_tiles.append(jpeg_pass(t, q))
    our_tiles = [jpeg_pass(Image.open(p).convert('RGB').resize((tw, th), Image.LANCZOS), q) for p in job['ours']]

    def sheet(tiles, path):
        rows = (len(tiles) + cols - 1) // cols
        S = Image.new('RGB', (cols * tw, rows * th), (255, 255, 255))
        for i, t in enumerate(tiles):
            S.paste(t, ((i % cols) * tw, (i // cols) * th))
        S.save(path, 'JPEG', quality=q, subsampling='4:2:0')

    n = len(job['out']['ref'])
    per_r, per_o = len(ref_tiles) // n, len(our_tiles) // n
    for i in range(n):
        sheet(ref_tiles[i * per_r:(i + 1) * per_r], job['out']['ref'][i])
        sheet(our_tiles[i * per_o:(i + 1) * per_o], job['out']['ours'][i])
    b = job.get('blind')
    if b:
        for j, (side, k) in enumerate(b['order']):
            t = ref_tiles[k] if side == 'ref' else our_tiles[k]
            t.save(f"{b['dir']}/tile_{j + 1:02d}.jpg", 'JPEG', quality=q, subsampling='4:2:0')
    print(json.dumps({'ref_tiles': len(ref_tiles), 'our_tiles': len(our_tiles)}))


if __name__ == '__main__':
    main()
