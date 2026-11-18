#!/bin/bash
# Render every video in series.js, 6 at a time, each on its own Chrome port (same port = mixed frames).
cd /home/claude/ads
names=$(grep -o 'S\["[^"]*"\]=' series.js | sed 's/S\["//;s/"\]=//')
i=0; port=9500
for n in $names; do PORT=$port node render.mjs S "$n" > /dev/null & i=$((i+1)); port=$((port+7)); if [ $((i%6)) -eq 0 ]; then wait; fi; done; wait
