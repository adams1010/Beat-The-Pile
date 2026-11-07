// Story demo (/demo/story/): the tap-to-advance layer must never sit on top of links. Interactive demo (/demo/): steps + exits.
import { readFileSync } from "node:fs";
const h = readFileSync(new URL("../demo/story/index.html", import.meta.url), "utf8");
const d = readFileSync(new URL("../demo/index.html", import.meta.url), "utf8");
const fail = (m) => { console.error("FAIL demo-links:", m); process.exit(1); };
if (!/\.tapL,\.tapR\{[^}]*pointer-events:none/.test(h)) fail("tap zones must be pointer-events:none");
if (/getElementById\("tapR"\)\.onclick/.test(h)) fail("tapR click handler would steal link taps");
if (!/closest\("a,button/.test(h)) fail("frame click handler must ignore links/buttons");
for (const p of ["/demo/", "/fair/", "/jobs/", "/season/", "/radar/"]) if (!h.includes(`href="${p}"`)) fail("story end button missing " + p);
for (const k of ["find", "fair", "meet", "follow", "tailor", "finish"]) if (!d.includes(`["${k}",`)) fail("interactive demo missing step " + k);
for (const p of ["/jobs/?major=", "/fair/", "/season/", "/#interview", "/demo/story/"]) if (!d.includes(`href="${p}`)) fail("interactive demo missing exit " + p);
if (!/Example fair/.test(d) || !/nothing you type here is saved/.test(d)) fail("demo must label examples and say nothing is saved");
if (/localStorage\.setItem\("btp_(saved|apps|resume)/.test(d)) fail("demo must not write real user data");
console.log("demo-links: ok");
