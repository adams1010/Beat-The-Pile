# Beat the Pile video ads (not deployed: .vercelignore)

Copy this folder to /home/claude/ads (paths are absolute), plus brand/logo-white.png and map/dots-all.json.
- `anim.html`: every ad is a timeline in `V[n]`; `render(t)` draws one frame. Helpers: hook, words, card, finger, counter, mapScene, floor, phone, topbox, caps, endShare.
- `node render.mjs <n> stills 1.0,4.5`: check frames (/tmp/s<n>_<t>.jpg); `node render.mjs <n>`: full 1080x1920 30 fps video → f/v<n>.mp4.
- `python3 audio.py out.wav <len> cuts=… taps=… thuds=…`: original synthesized beat + sound effects; mux with `ffmpeg -i f/v<n>.mp4 -i out.wav -map 0:v -map 1:a -c:v copy -c:a aac -shortest final.mp4`.
- Videos 7–9 (Nov 17 2026): A POV phone demo, B STOP + map, C "3 things before your career fair".
- `series.js` (Nov 17): 24 videos, 8 app sections × 3 formats, each ending on a "Comment KEYWORD" ManyChat screen; `./build_all.sh` renders all + `audio3.py` (house / trap / phonk originals). Give parallel renders different `PORT=` values.
Rules: real listings and live counts only (pull fresh from /api/listings before each batch), anything made up is labeled Example, no fake testimonials, text out of the bottom ~350 px and right ~150 px.
