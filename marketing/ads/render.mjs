// node render.mjs <video#> [stills t1,t2,...]  -> renders frames via Chrome DevTools, pipes JPEGs into ffmpeg
import { spawn } from "node:child_process";
import fs from "node:fs";
const [v, mode, times] = process.argv.slice(2);
const port = 9300 + Number(v);
const chrome = spawn("google-chrome", ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
  "--allow-file-access-from-files", `--remote-debugging-port=${port}`, "--window-size=1080,1920", "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let tabs; for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (tabs.find(t => t.type === "page")) break; } catch {} await sleep(200); }
const ws = new WebSocket(tabs.find(t => t.type === "page").webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Emulation.setDeviceMetricsOverride", { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false });
await send("Page.enable");
await send("Page.navigate", { url: "file:///home/claude/ads/anim.html" });
await sleep(1500);
const ev = async expr => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result;
const len = (await ev(`setup(${v})`)).result.value;
const shot = async t => { await ev(`render(${t})`); const r = await send("Page.captureScreenshot", { format: "jpeg", quality: 92 }); return Buffer.from(r.result.data, "base64"); };
if (mode === "stills") {
  for (const t of times.split(",")) fs.writeFileSync(`/tmp/s${v}_${t}.jpg`, await shot(Number(t)));
} else {
  const FPS = 30, n = Math.round(len * FPS);
  const out = `/home/claude/ads/f/v${v}.tmp.mp4`;
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
    "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-shortest", "-c:v", "libx264", "-crf", "18", "-preset", "veryfast",
    "-pix_fmt", "yuv420p", "-c:a", "aac", out], { stdio: ["pipe", "inherit", "inherit"] });
  for (let f = 0; f < n; f++) { const b = await shot(f / FPS); if (!ff.stdin.write(b)) await new Promise(r => ff.stdin.once("drain", r)); }
  ff.stdin.end(); const code = await new Promise(r => ff.on("close", r));
  if (code === 0) fs.renameSync(out, `/home/claude/ads/f/v${v}.mp4`);
  console.log("video", v, "frames", n, "ffmpeg", code);
}
ws.close(); chrome.kill();
process.exit(0);
