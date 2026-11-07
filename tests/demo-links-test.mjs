// Story demo (/demo/story/): the tap-to-advance layer must never sit on top of links. Interactive demo (/demo/): steps + exits.
import { readFileSync } from "node:fs";
const h = readFileSync(new URL("../demo/story/index.html", import.meta.url), "utf8");
const d = readFileSync(new URL("../demo/index.html", import.meta.url), "utf8");
const fail = (m) => { console.error("FAIL demo-links:", m); process.exit(1); };
if (!/\.tapL,\.tapR\{[^}]*pointer-events:none/.test(h)) fail("tap zones must be pointer-events:none");
if (/getElementById\("tapR"\)\.onclick/.test(h)) fail("tapR click handler would steal link taps");
if (!/closest\("a,button/.test(h)) fail("frame click handler must ignore links/buttons");
for (const p of ["/demo/", "/fair/", "/jobs/", "/season/", "/radar/"]) if (!h.includes(`href="${p}"`)) fail("story end button missing " + p);
for (const k of ["find", "company", "alerts", "tailor", "fair", "meet", "follow", "season", "radar", "interview", "profile", "finale"]) if (!d.includes(`key: "${k}"`)) fail("tour missing chapter " + k);
for (const p of ["/jobs/?major=", "/fair/", "/season/", "/radar/", "/#interview", "/u/"]) if (!d.includes(`"${p}`)) fail("tour finale missing exit " + p);
if (!d.includes('href="/demo/story/"')) fail("tour must link the story version");
if (!/Example floor/.test(d) || !/Nothing you do here is saved/.test(d) || !/estimate/.test(d)) fail("tour must label examples/estimates and say nothing is saved");
if (/localStorage\.setItem\("btp_(saved|apps|resume)/.test(d)) fail("demo must not write real user data");
console.log("demo-links: ok");
