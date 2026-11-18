"""Original music for Beat the Pile videos: 12 genres x key/progression variants, all synthesized here (no samples, no licensed audio,
safe for business accounts). Every video gets its own track.
  python3 music.py out.wav <len> <genre> <variant> cuts=.. taps=.. impacts=..
genres: house trap phonk jersey dembow dnb lofi synthwave afro drill garage disco ; variant 0..3 (key + chord progression)"""
import sys, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter
SR = 44100
L = float(sys.argv[2]); G = sys.argv[3]; VAR = int(sys.argv[4]); A = dict(a.split("=") for a in sys.argv[5:])
ts = lambda k: [float(x) for x in A.get(k, "").split(",") if x]
n = int(L * SR); dr = np.zeros(n); mu = np.zeros(n); fx = np.zeros(n)
rng = np.random.default_rng(sum(map(ord, G)) * 7 + VAR)
T = lambda d: np.linspace(0, d, max(1, int(d * SR)), False)
E = lambda d, r: np.exp(-T(d) / r)
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
def add(b, s, t, g=1.0):
    i = int(t * SR); j = min(n, i + len(s))
    if 0 <= i < n and j > i: b[i:j] += g * s[: j - i]
def bp(x, lo, hi): b, a = butter(2, [lo / (SR / 2), min(hi, 20000) / (SR / 2)], "band"); return lfilter(b, a, x)
def lp(x, f): b, a = butter(2, min(f, 20000) / (SR / 2)); return lfilter(b, a, x)
def hp(x, f): b, a = butter(2, f / (SR / 2), "high"); return lfilter(b, a, x)
noise = lambda d: rng.standard_normal(max(1, int(d * SR)))
# ---- instruments ----
def kick(dec=.09, top=150, punch=1.8):
    d = .35; t = T(d); f = 45 + top * np.exp(-t * 35); s = np.sin(2 * np.pi * np.cumsum(f) / SR) * E(d, dec)
    s[:220] += bp(noise(220 / SR), 2000, 9000)[:220] * .4; return np.tanh(s * punch)
def snare(tone=190, dec=.07): d = .28; return bp(noise(d), 1200, 7000) * E(d, dec) + .45 * np.sin(2 * np.pi * tone * T(d)) * E(d, .05)
def clap():
    d = .25; e = E(d, .06).copy()
    for k in (.012, .024): e += .6 * np.roll(E(d, .008), int(k * SR))
    return bp(noise(d), 1000, 5000) * e * .9
def hat(o=False): d = .2 if o else .05; return bp(noise(d), 8000, 16000) * E(d, .07 if o else .012)
def shaker(): d = .08; return bp(noise(d), 5000, 12000) * np.sin(np.pi * T(d) / d) * .6
def rim(): d = .06; return bp(noise(d), 1500, 3500) * E(d, .01) + np.sin(2 * np.pi * 1700 * T(d)) * E(d, .008)
def saw(f, d, k=8): t = T(d); return sum(np.sin(2 * np.pi * f * h * t) / h for h in range(1, k))
def sq(f, d): t = T(d); return sum(np.sin(2 * np.pi * f * h * t) / h for h in (1, 3, 5, 7))
def b808(m, d, glide=None, drive=2.2):
    t = T(d); f = hz(m) * np.ones_like(t)
    if glide: f = hz(m) + (hz(glide) - hz(m)) * np.minimum(1, t / .1)
    return np.tanh(drive * np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.minimum(1, t / .005) * E(d, d * .7)
def reese(m, d): t = T(d); s = saw(hz(m) * .996, d, 6) + saw(hz(m) * 1.004, d, 6); return lp(s, 500) * np.minimum(1, t / .02)
def pad(ms, d, cut=2200): t = T(d); s = sum(saw(hz(m), d, 5) for m in ms) / len(ms); e = np.minimum(1, t / .25) * np.minimum(1, (d - t) / .25); return lp(s * e, cut)
def rhodes(ms, d): t = T(d); return sum(np.sin(2 * np.pi * hz(m) * t) + .25 * np.sin(2 * np.pi * hz(m) * 2 * t) * np.exp(-t * 6) for m in ms) / len(ms) * E(d, d * .5)
def pluck(m, d, cut=3000): return lp(saw(hz(m), d, 6), cut) * E(d, .1)
def bell(m, d): t = T(d); return (sq(hz(m), d) * .5 + np.sin(2 * np.pi * hz(m) * 1.5 * t) * .5) * E(d, .12)
def squeak(): d = .12; t = T(d); return np.sin(2 * np.pi * (2400 + 1600 * t / d) * t) * np.sin(np.pi * t / d) * .5
def logdrum(m): d = .4; t = T(d); return np.sin(2 * np.pi * hz(m) * (1 + .5 * np.exp(-t * 30)) * t) * E(d, .12)
# ---- harmony: key + progression per variant ----
KEYS = [57, 60, 55, 62]                       # A, C, G, D
PROGS = [[(0, 'm'), (8, 'M'), (3, 'M'), (10, 'M')], [(0, 'm'), (5, 'm'), (8, 'M'), (7, 'M')], [(0, 'M'), (7, 'M'), (9, 'm'), (5, 'M')], [(0, 'm'), (10, 'M'), (8, 'M'), (7, 'm')]]
root = KEYS[VAR % 4]; prog = PROGS[(VAR + len(G)) % 4]
def chord(b, oct=0):
    r, q = prog[b % 4]; base = root + r + 12 * oct; return [base, base + (3 if q == 'm' else 4), base + 7]
def bass(b, oct=-2): return root + prog[b % 4][0] + 12 * oct
# ---- genres ----
def bars(bpm, beats=4): B = 60 / bpm; return B, int(L / (beats * B)) + 1
def g_house(bpm=126):
    B, nb = bars(bpm)
    for b in range(nb):
        t0 = b * 4 * B
        for k in range(4):
            tb = t0 + k * B; add(dr, kick(), tb, 1)
            if k in (1, 3): add(dr, clap(), tb, .45)
            add(dr, hat(True), tb + B / 2, .22); add(dr, hat(), tb + B / 4, .1)
            add(mu, lp(saw(hz(bass(b)), B / 2) * E(B / 2, .12), 900), tb + B / 2, .32)
            add(mu, pad(chord(b, 1), B * .45, 3500) * E(B * .45, .09), tb + B / 2, .5)
        for k in range(16): add(mu, np.sin(2 * np.pi * hz(chord(b, 2)[k % 3]) * T(B / 4)) * E(B / 4, .04), t0 + k * B / 4, .1)
    return B
def g_trap(bpm=140):
    B, nb = bars(bpm)
    for b in range(nb):
        t0 = b * 4 * B
        add(dr, kick(.12), t0, 1); add(dr, kick(.12), t0 + 2.5 * B, .9); add(dr, snare(), t0 + 2 * B, .6)
        for k in range(8):
            add(dr, hat(), t0 + k * B / 2, .16)
            if b % 2 and k in (5, 6, 7):
                for r in range(3): add(dr, hat(), t0 + k * B / 2 + r * B / 6, .12)
        add(mu, b808(bass(b, -1), 2 * B, bass(b, -1) + 3 if b % 2 else None), t0, .55); add(mu, b808(bass(b, -1), 1.2 * B), t0 + 2.5 * B, .45)
        add(mu, pad(chord(b, 1), 4 * B, 2000), t0, .25)
        for k, s in enumerate([2, 1, 0, 1, 2, 1, 0, 2]): add(mu, bell(chord(b, 2)[s], B / 2) * .5, t0 + k * B / 2, .12)
    return B
def g_phonk(bpm=130):
    B, nb = bars(bpm)
    for b in range(nb):
        t0 = b * 4 * B
        for k in range(4):
            tb = t0 + k * B
            if k in (0, 2): add(dr, kick(.1, 160, 2.4), tb, .95)
            if k in (1, 3): add(dr, snare(220), tb, .55)
            add(dr, hat(), tb + B / 2, .15)
        add(mu, b808(bass(b, -1), 4 * B * .9, drive=3.5), t0, .5)
        for k, s in enumerate([0, 0, 2, 0, 1, 0, 2, 1]): add(mu, bell(chord(b, 1)[s] + 12, B / 2), t0 + k * B / 2, .2)
    return B
def g_jersey(bpm=140):
    B, nb = bars(bpm)
    for b in range(nb):
        t0 = b * 4 * B
        for pos in (0, 1, 1.75, 2.5, 3, 3.5): add(dr, kick(.08), t0 + pos * B, .9)
        add(dr, clap(), t0 + B, .5); add(dr, clap(), t0 + 3 * B, .5)
        for k in range(8): add(dr, hat(), t0 + k * B / 2, .14)
        if b % 2: add(fx, squeak(), t0 + 1.5 * B, .35); add(fx, squeak(), t0 + 3.25 * B, .3)
        add(mu, pad(chord(b, 1), 4 * B, 2600), t0, .3)
        for k in range(8): add(mu, pluck(chord(b, 2)[(k * 2) % 3], B / 2), t0 + k * B / 2, .12)
        add(mu, b808(bass(b, -1), B * 1.5), t0, .4)
    return B
def g_dembow(bpm=96):
    B, nb = bars(bpm)
    for b in range(nb):
        t0 = b * 4 * B
        for k in range(4):
            tb = t0 + k * B; add(dr, kick(.1), tb, .95); add(dr, rim(), tb + .75 * B, .5)
            if k % 2: add(dr, rim(), tb + .5 * B, .45)
            add(dr, hat(), tb + B / 2, .12)
        add(mu, b808(bass(b, -1), 2 * B), t0, .45); add(mu, b808(bass(b, -1), 2 * B), t0 + 2 * B, .4)
        for k in range(8): add(mu, pluck(chord(b, 1)[k % 3] + 12, B / 2, 2500), t0 + k * B / 2 + (B / 4 if k % 2 else 0), .14)
    return B
def g_dnb(bpm=172):
    B, nb = bars(bpm)
    for b in range(nb):
        t0 = b * 4 * B
        for pos in (0, 2.5): add(dr, kick(.08, 120), t0 + pos * B, .9)
        for pos in (1, 3): add(dr, snare(200, .09), t0 + pos * B, .7)
        for k in range(8): add(dr, hat(), t0 + k * B / 2, .13)
        add(mu, reese(bass(b, -1), 4 * B), t0, .45)
        add(mu, pad(chord(b, 1), 4 * B, 1800), t0, .22)
    return B
def g_lofi(bpm=84):
    B, nb = bars(bpm); sw = B * .58
    for b in range(nb):
        t0 = b * 4 * B
        add(dr, kick(.1, 90, 1.3), t0, .7); add(dr, kick(.1, 90, 1.3), t0 + 2.5 * B, .55)
        add(dr, snare(170, .1), t0 + B, .4); add(dr, snare(170, .1), t0 + 3 * B, .4)
        for k in range(4): add(dr, hat(), t0 + k * B, .07); add(dr, hat(), t0 + k * B + sw, .06)
        add(mu, rhodes(chord(b, 0) + [chord(b, 0)[0] + 10], 4 * B), t0, .35)
        add(mu, np.sin(2 * np.pi * hz(bass(b)) * T(2 * B)) * E(2 * B, B), t0, .35)
    add(mu, lp(noise(L), 3000)[:n] * .015, 0, 1)
    return B
def g_synthwave(bpm=110):
    B, nb = bars(bpm)
    for b in range(nb):
        t0 = b * 4 * B
        for k in range(4):
            add(dr, kick(.1), t0 + k * B, .9)
            if k in (1, 3): add(dr, snare(180, .12), t0 + k * B, .6)
            add(dr, hat(), t0 + k * B + B / 2, .12)
        add(mu, pad(chord(b, 0), 4 * B, 1600), t0, .3)
        for k in range(8): add(mu, lp(saw(hz(bass(b, -1)), B / 2), 700) * E(B / 2, .15), t0 + k * B / 2, .25)
        for k in range(16): add(mu, pluck(chord(b, 1)[[0, 1, 2, 1][k % 4]] + 12, B / 4, 4000), t0 + k * B / 4, .1)
    return B
def g_afro(bpm=106):
    B, nb = bars(bpm)
    for b in range(nb):
        t0 = b * 4 * B
        for pos in (0, 1.5, 2, 3.5): add(dr, kick(.08, 110, 1.4), t0 + pos * B, .7)
        for pos in (1, 3): add(dr, rim(), t0 + pos * B, .45)
        for k in range(16): add(dr, shaker(), t0 + k * B / 4, .18 if k % 2 else .1)
        for k, pos in enumerate((.5, 1.25, 2.75, 3.25)): add(mu, logdrum(bass(b, -1) + [0, 7, 12, 7][k]), t0 + pos * B, .45)
        add(mu, rhodes(chord(b, 1), 4 * B), t0, .22)
    return B
def g_drill(bpm=142):
    B, nb = bars(bpm)
    for b in range(nb):
        t0 = b * 4 * B
        for pos in (0, .75, 2.75): add(dr, kick(.1), t0 + pos * B, .85)
        add(dr, snare(200), t0 + 2 * B, .6); add(dr, snare(200), t0 + 3.5 * B, .35)
        for k in range(12): add(dr, hat(), t0 + k * B / 3, .12 if k % 3 else .17)
        add(mu, b808(bass(b, -1), 1.5 * B, bass(b, -1) - 2), t0, .55); add(mu, b808(bass(b, -1) + 5, 1.2 * B, bass(b, -1) + 3), t0 + 2.75 * B, .5)
        add(mu, pad(chord(b, 1), 4 * B, 1500), t0, .28)
    return B
def g_garage(bpm=132):
    B, nb = bars(bpm)
    for b in range(nb):
        t0 = b * 4 * B
        for pos in (0, 1.75, 2.5): add(dr, kick(.08), t0 + pos * B, .85)
        add(dr, clap(), t0 + B, .45); add(dr, clap(), t0 + 3 * B, .45)
        for k in range(8): add(dr, hat(), t0 + k * B / 2 + (B * .08 if k % 2 else 0), .14)
        for k, pos in enumerate((0, .75, 1.5, 2.5, 3.25)): add(mu, pad(chord(b, 1), B * .3, 3000) * E(B * .3, .06), t0 + pos * B, .5)
        add(mu, reese(bass(b, -1), 4 * B), t0, .3)
    return B
def g_disco(bpm=118):
    B, nb = bars(bpm)
    for b in range(nb):
        t0 = b * 4 * B
        for k in range(4):
            tb = t0 + k * B; add(dr, kick(.09), tb, .9); add(dr, hat(True), tb + B / 2, .25)
            if k in (1, 3): add(dr, snare(200), tb, .5)
            for o, pos in ((0, 0), (12, .5)): add(mu, lp(saw(hz(bass(b, -1) + o), B * .4), 1200) * E(B * .4, .1), tb + pos * B, .3)
        for k in (.5, 1.5, 2.5, 3.5): add(mu, pad(chord(b, 1), B * .35, 4000) * E(B * .35, .07), t0 + k * B, .45)
    return B
GEN = dict(house=g_house, trap=g_trap, phonk=g_phonk, jersey=g_jersey, dembow=g_dembow, dnb=g_dnb, lofi=g_lofi, synthwave=g_synthwave, afro=g_afro, drill=g_drill, garage=g_garage, disco=g_disco)
B = GEN[G]()
ph = (np.arange(n) / SR) % B; mu *= .45 + .55 * np.minimum(1, ph / (B * .5))           # light sidechain pump
def whoosh():
    d = .4; x = noise(d); out = np.zeros_like(x)
    for i in range(0, len(x), 441):
        f = 400 + 7000 * (i / len(x)); seg = bp(x[max(0, i - 441):i + 882], f, f * 1.7)[(441 if i else 0):][:len(out[i:i + 441])]; out[i:i + len(seg)] = seg
    return out * np.sin(np.pi * T(d) / d) ** 2
def impact(): d = 1.2; t = T(d); return np.tanh((np.sin(2 * np.pi * np.cumsum(40 + 120 * np.exp(-t * 12)) / SR) * E(d, .35) + bp(noise(d), 3000, 15000) * E(d, .3) * .6) * 1.6)
def tap(): return np.sin(2 * np.pi * 1900 * T(.05)) * E(.05, .008)
for c in ts("cuts"): add(fx, whoosh(), max(0, c - .28), .5)
for c in ts("taps"): add(fx, tap(), c, .8)
for c in ts("impacts"): add(fx, impact(), c, 1.0)
mix = dr * .9 + mu + fx; f = int(.6 * SR); mix[-f:] *= np.linspace(1, 0, f)
mix = hp(mix, 30); mix = np.tanh(mix / (np.abs(mix).max() + 1e-9) * 1.6) * .92
wavfile.write(sys.argv[1], SR, (np.stack([mix, mix], 1) * 32767).astype(np.int16))
print("music", G, VAR, round(60 / B), "bpm")
