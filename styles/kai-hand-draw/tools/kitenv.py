# kitenv.py: paths shared by the Python tools. Every path is inside the film's folder, given as the first argument
# (make.mjs passes it): python make_vo.py <film>. ffmpeg comes from PATH, as for every core/ tool.
import os, sys

if len(sys.argv) < 2 or sys.argv[1].startswith('-') or not os.path.isfile(os.path.join(sys.argv[1], 'index.html')):
    sys.exit(f'usage: {os.path.basename(sys.argv[0])} <film folder with index.html>')
ROOT = os.path.abspath(sys.argv[1])

def path(*parts):
    return os.path.join(ROOT, *parts)

FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
