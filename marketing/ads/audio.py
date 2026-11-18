"""Original backing beat + sound effects (synthesized here, no samples, no licensing issues).
python3 audio.py out.wav length cuts=1,2 taps=3,4 thuds=5"""
import sys, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter
SR = 44100
L = float(sys.argv[2]); args = dict(a.split("=") for a in sys.argv[3:])
ts = lambda k: [float(x) for x in args.get(k, "").split(",") if x]
n = int(L * SR); mix = np.zeros(n)
rng = np.random.default_rng(7)
def add(sig, t, g=1.0):
    i = int(t * SR); j = min(n, i + len(sig))
    if i < n: mix[i:j] += g * sig[: j - i]
def env(d, a=0.003, r=None):
    m = int(d * SR); e = np.ones(m); k = max(1, int(a * SR)); e[:k] = np.linspace(0, 1, k)
    e *= np.exp(-np.linspace(0, d, m) / (r or d / 4)); return e
def bp(x, lo, hi):
    b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], "band"); return lfilter(b, a, x)
def lp(x, f):
    b, a = butter(2, f / (SR / 2)); return lfilter(b, a, x)
t1 = lambda d: np.linspace(0, d, int(d * SR), False)
# drums
def kick():
    d = .35; t = t1(d); f = 50 + 110 * np.exp(-t * 28); return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(d, r=.12)
def clap():
    d = .22; return bp(rng.standard_normal(int(d * SR)), 900, 4000) * env(d, r=.05) * 1.6
def hat():
    d = .06; return bp(rng.standard_normal(int(d * SR)), 7000, 15000) * env(d, r=.015)
BPM = 100; beat = 60 / BPM
# chords Am F C G, one bar each
CH = [[57, 60, 64], [53, 57, 60], [48, 55, 64], [55, 59, 62]]
BASS = [45, 41, 48, 43]
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
def pad(m, d):
    t = t1(d); s = sum(np.sin(2 * np.pi * hz(x) * t + .3 * np.sin(2 * np.pi * .5 * t)) for x in m) / len(m)
    e = np.minimum(1, t / .4) * np.minimum(1, (d - t) / .4); return lp(s * e, 1800)
def bass(m, d):
    t = t1(d); s = np.sin(2 * np.pi * hz(m) * t) + .3 * np.sin(4 * np.pi * hz(m) * t); return s * env(d, a=.01, r=d / 2)
bar = 4 * beat; b = 0
while b * bar < L:
    t0 = b * bar
    add(pad(CH[b % 4], bar), t0, .16)
    for k in range(4):
        tb = t0 + k * beat
        if k in (0, 2): add(kick(), tb, .9)
        if k in (1, 3): add(clap(), tb, .32)
        add(hat(), tb + beat / 2, .22); add(hat(), tb, .12)
        add(bass(BASS[b % 4], beat * .9), tb, .35)
    b += 1
# sfx
def whoosh():
    d = .45; x = rng.standard_normal(int(d * SR)); t = t1(d)
    out = np.zeros_like(x)
    for i in range(0, len(x), 512):
        f = 300 + 5000 * (i / len(x)); out[i:i + 512] = bp(x[i:i + 1024], f, f * 1.8)[:len(out[i:i + 512])]
    return out * np.sin(np.pi * t / d) ** 2 * 1.2
def tap():
    d = .05; t = t1(d); return np.sin(2 * np.pi * 1800 * t) * env(d, a=.001, r=.008)
def thud():
    d = .4; t = t1(d); return (np.sin(2 * np.pi * (60 + 80 * np.exp(-t * 20)) * t) + .4 * bp(rng.standard_normal(len(t)), 100, 900)) * env(d, r=.1)
for c in ts("cuts"): add(whoosh(), max(0, c - .3), .5)
for c in ts("taps"): add(tap(), c, .7)
for c in ts("thuds"): add(thud(), c, 1.0)
fade = int(.8 * SR); mix[-fade:] *= np.linspace(1, 0, fade)
mix = mix / (np.abs(mix).max() + 1e-9) * .89
wavfile.write(sys.argv[1], SR, (np.stack([mix, mix], 1) * 32767).astype(np.int16))
print("audio", sys.argv[1], L)
