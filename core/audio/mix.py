"""mix.py: a film's sound from its page events: voice + music + SFX + ambience -> <film>/out/mix.wav (48 kHz stereo).
Run from the library root:  pixi run python core/audio/mix.py <film>      (core/render/reel.mjs <film> audio runs it)

Reads, in the film's folder:
  events.json      {dur, ev: [{t, type, g?, pan?, t1?}]}, exported from window.EV by core/render/events.mjs
  vo/vo.wav        the voiceover (optional; without it the mix has no voice)
  audio/sound.py   the film's own sound, in the style's sound palette (optional). Every name is optional:
                     SFX = {'chunk': chunk, 'roller': (lambda: shhk(.45), .55)}   event type -> fn() or (fn, gain);
                                                                               fn returns mono float at 48 kHz
                     def music(dur, ev): ...   the score, (n,) or (n, 2); dur in s, ev = the events list
                     def bed(dur): ...         ambience (room tone, motor hum), (n,) or (n, 2)
                     LEVELS = {'music_db': -10, 'sfx': .35, 'bed': 1, 'duck_db': -8}
                   It can import the helpers of core/audio/sfx.py (`from sfx import bp, lp, noise, norm, add`).
                   Without it, an event type named like a function in sfx.py (click, whoosh, thump, ding, pop… as listed in SFX_DEFAULT)
                   plays that function, and there is no music.
Control events: 'section' (ignored here, for the score) and 'silence' {t, t1}: the music is cut from t to t1 and
comes back hard at t1 (DIRECTOR.md §6). Any other type with no sound is named in a warning.
Mix: the voice is compressed and set by RMS; the music sits music_db under it and ducks duck_db under speech; the
SFX bus is scaled by 'sfx', the ambience by 'bed'. The result is peak-normalised to -1 dBFS: core/render/mux.mjs sets the loudness.
"""
import importlib.util, json, os, sys
import numpy as np, soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sfx
from sfx import SR, lp, compress

CONTROL = {'section', 'silence'}
SFX_DEFAULT = ('click', 'clack', 'crash', 'whoosh', 'creak', 'thump', 'step', 'ding', 'pop', 'quindar', 'rumble', 'ignite', 'heartbeat')
DEFAULT_LEVELS = {'music_db': -10.0, 'sfx': .35, 'bed': 1.0, 'duck_db': -8.0}


def stereo(x, n):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1: x = np.stack([x, x], 1)
    if x.shape[0] == 2 and x.shape[1] != 2: x = x.T
    out = np.zeros((n, 2)); m = min(n, len(x)); out[:m] = x[:m]
    return out


def load_sound(film):
    p = os.path.join(film, 'audio', 'sound.py')
    if not os.path.isfile(p): return None
    sys.path.insert(0, os.path.dirname(p))
    spec = importlib.util.spec_from_file_location('film_sound', p)
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    return mod


def palette(sound):
    if sound is not None and hasattr(sound, 'SFX'):
        return {k: v if isinstance(v, tuple) else (v, 1.0) for k, v in sound.SFX.items()}
    return {k: (getattr(sfx, k), 1.0) for k in SFX_DEFAULT}


def rms(x, floor=0.0):
    a = x[np.abs(x) > floor] if floor else x
    return float(np.sqrt(np.mean(a ** 2))) if a.size else 0.0


def main():
    args = sys.argv[1:]
    if not args or args[0].startswith('-'): sys.exit('usage: python core/audio/mix.py <film> [--out file.wav]')
    film = os.path.abspath(args[0])
    out = os.path.abspath(args[args.index('--out') + 1]) if '--out' in args else os.path.join(film, 'out', 'mix.wav')
    evf = os.path.join(film, 'events.json')
    if not os.path.isfile(evf): sys.exit(f'{evf} is missing: export it first (node core/render/events.mjs {args[0]} --size 1080x1920)')
    with open(evf, encoding='utf-8') as f: E = json.load(f)
    dur, ev = float(E['dur']), E.get('ev') or []
    n = int(round(dur * SR))
    sound = load_sound(film)
    L = {**DEFAULT_LEVELS, **getattr(sound, 'LEVELS', {})}

    # SFX bus: one sound per event, panned by the event or spread by its index
    pal, missing, fx = palette(sound), {}, np.zeros((n, 2))
    for k, e in enumerate(ev):
        kind = e.get('type')
        if kind in CONTROL: continue
        if kind not in pal: missing[kind] = missing.get(kind, 0) + 1; continue
        fn, g = pal[kind]
        sfx.add(fx, np.asarray(fn(), dtype=np.float64), float(e['t']), g * float(e.get('g', 1)), float(e.get('pan', ((k * 37) % 7 - 3) / 10)))
    amb = stereo(sound.bed(dur), n) * L['bed'] if hasattr(sound, 'bed') else np.zeros((n, 2))

    # voice: compressed, then set to a fixed RMS
    vof = os.path.join(film, 'vo', 'vo.wav')
    if os.path.isfile(vof):
        vo, vsr = sf.read(vof, dtype='float64')
        if vsr != SR: sys.exit(f'{vof} is {vsr} Hz; the mix needs {SR} Hz')
        if vo.ndim > 1: vo = vo.mean(1)
        vo = np.pad(vo, (0, max(0, n - len(vo))))[:n]
        v = compress(vo); v *= .1 / (rms(v, .01) or 1)
    else:
        print('⚠ no vo/vo.wav: the mix has no voice'); v = np.zeros(n)

    # music: under the voice by music_db, ducked under speech, cut in every silence
    mus = np.zeros((n, 2))
    if hasattr(sound, 'music'):
        mus = stereo(sound.music(dur, ev), n)
        mus *= .1 * 10 ** (L['music_db'] / 20) / (rms(mus) or 1)
        ve = lp(np.abs(v), 6, 1); depth = 1 - 10 ** (L['duck_db'] / 20)
        mus *= (1 - depth * np.clip(ve / ((ve.max() or 1) * .25), 0, 1))[:, None]
        gate, fade = np.ones(n), int(.03 * SR)
        for e in ev:
            if e.get('type') != 'silence': continue
            i, j = int(e['t'] * SR), int(e['t1'] * SR)
            gate[i:j] = 0; gate[max(0, i - fade):i] = np.linspace(1, 0, min(fade, i))
        mus *= gate[:, None]
    else:
        print('⚠ no music: audio/sound.py has no music(dur, ev) (score in the style\'s sound palette, TECHNIQUE.md §5)')

    mix = mus + fx * L['sfx'] + amb + v[:, None]
    mix *= .89 / (np.abs(mix).max() or 1)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    sf.write(out, mix.astype(np.float32), SR)
    db = lambda x: f'{20 * np.log10(x):.1f} dB' if x > 0 else 'silent'
    print(f'{out}  {n / SR:.2f} s · {len(ev)} events · voice {db(rms(v))} · music {db(rms(mus))} · sfx {db(rms(fx * L["sfx"]))} (before the peak normalise)')
    for kind, c in sorted(missing.items()):
        print(f'⚠ no sound for event type "{kind}" ({c}×): add it to SFX in audio/sound.py (every visible action has a sound, DIRECTOR.md §6)')


if __name__ == '__main__':
    main()
