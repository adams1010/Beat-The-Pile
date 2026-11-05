// The demo's tap-to-advance layer must never sit on top of the slide links (end-screen buttons, source links).
import { readFileSync } from "node:fs";
const h = readFileSync(new URL("../demo/index.html", import.meta.url), "utf8");
const fail = (m) => { console.error("FAIL demo-links:", m); process.exit(1); };
if (!/\.tapL,\.tapR\{[^}]*pointer-events:none/.test(h)) fail("tap zones must be pointer-events:none");
if (/getElementById\("tapR"\)\.onclick/.test(h)) fail("tapR click handler would steal link taps");
if (!/closest\("a,button/.test(h)) fail("frame click handler must ignore links/buttons");
for (const p of ["/jobs/", "/fair/", "/season/", "/radar/"]) if (!h.includes(`class="btn${p === "/jobs/" ? " go" : ""}" href="${p}"`)) fail("end button missing " + p);
console.log("demo-links: ok");
