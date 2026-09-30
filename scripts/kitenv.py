# kitenv.py: paths shared by the Python scripts. Tool locations come from .kit-env.json (written by setup.mjs).
import json, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

def path(*parts):
    return os.path.join(ROOT, *parts)

def _tool(name):
    try:
        with open(path('.kit-env.json'), encoding='utf-8') as f:
            v = json.load(f).get(name)
    except (OSError, ValueError):
        v = None
    if not v:
        return name                      # fall back to PATH
    if os.sep not in v and '/' not in v:
        return v                         # a bare command name
    return v if os.path.isabs(v) else path(*v.split('/'))

FFMPEG = _tool('ffmpeg')
