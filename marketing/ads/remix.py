"""Give every video its own track: python3 remix.py  (reads tracks.json + f/<slug>.json, rewrites the finals' audio only)"""
import json, re, subprocess, os
from concurrent.futures import ThreadPoolExecutor
import sys
tr = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "tracks.json"))
if "none" not in {v[0] for v in tr.values()}: assert len({tuple(v) for v in tr.values()}) == len(tr), "two videos share a track"
OUT = "/mnt/user-data/outputs/Beat the Pile Videos"
def one(name):
    g, v = tr[name]; slug = re.sub(r"[^A-Za-z0-9]+", "_", name); m = json.load(open(f"f/{slug}.json"))
    j = lambda k: ",".join(str(x) for x in m.get(k, []))
    subprocess.run(["python3", "music.py", f"f/{slug}.wav", str(m["len"]), g, str(v), f"cuts={j('cuts')}", f"taps={j('taps')}", f"impacts={j('imp')}"], check=True, capture_output=True)
    out = f"{OUT}/{name}.mp4"; tmp = out + ".tmp.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"f/v{slug}.mp4", "-i", f"f/{slug}.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", tmp], check=True)
    os.replace(tmp, out); return f"{name}: {g} {v}"
with ThreadPoolExecutor(6) as ex:
    for r in ex.map(one, tr): print(r)
