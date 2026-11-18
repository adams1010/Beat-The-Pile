#!/bin/bash
cd /home/claude/ads
names=$(grep -o 'S\["[^"]*"\]=' series.js | sed 's/S\["//;s/"\]=//')
i=0
for n in $names; do node render.mjs S "$n" > /dev/null & i=$((i+1)); if [ $((i%6)) -eq 0 ]; then wait; fi; done; wait
for n in $names; do
  slug=$(echo "$n" | sed 's/[^A-Za-z0-9]\+/_/g')
  python3 - "$n" "$slug" <<'P'
import json,sys,subprocess,os
n,slug=sys.argv[1],sys.argv[2]
m=json.load(open(f'f/{slug}.json'))
j=lambda k:",".join(str(x) for x in m.get(k,[]))
subprocess.run(["python3","audio3.py",f"f/{slug}.wav",str(m['len']),m['style'],f"cuts={j('cuts')}",f"taps={j('taps')}",f"impacts={j('imp')}"],check=True)
out=f"/mnt/user-data/outputs/Beat the Pile Videos/{n}.mp4"; os.makedirs(os.path.dirname(out),exist_ok=True)
subprocess.run(["ffmpeg","-y","-loglevel","error","-i",f"f/v{slug}.mp4","-i",f"f/{slug}.wav","-map","0:v","-map","1:a","-c:v","copy","-c:a","aac","-b:a","192k","-shortest","-movflags","+faststart",out],check=True)
print("ok",n,m['len'],m['kw'])
P
done
