// Spanish UI: the dictionary loads, patterns compile, and the main page strings are covered.
import assert from "node:assert/strict";
import fs from "node:fs";
const d = JSON.parse(fs.readFileSync(new URL("../i18n/es.json", import.meta.url), "utf8"));
const S = d.strings, P = d.patterns.map(([re, to]) => [new RegExp(re), to]);
assert.ok(Object.keys(S).length > 400, "dictionary is filled");
for (const [k, v] of Object.entries(S)) { assert.equal(typeof v, "string", k); assert.ok(v.trim(), "empty translation for " + k); }
for (const k of ["Jobs", "Career Fair", "Orbit", "My Season", "Profile", "Tools", "Opening Radar", "Language", "City, state or ZIP", "Sign in", "Save profile"])
  assert.ok(S[k], "missing: " + k);
const one = (t) => { if (S[t] != null) return S[t]; for (const [re, to] of P) { const m = t.match(re); if (m) return to.replace(/\$(\d)/g, (_, i) => S[m[+i]] ?? m[+i]); } return null; };
assert.equal(one("12 open"), "12 abiertas");
assert.equal(one("Engineering CareerFest by CAMEO — Spring 2027"), "Engineering CareerFest by CAMEO — Primavera 2027");
assert.equal(one("Found yesterday (posting date not shown by employer)"), "Encontrada ayer (el empleador no muestra la fecha)");
assert.equal(one("Mechanical Engineering Intern"), null, "job titles are data — never translated");
assert.equal(one("Lockheed Martin"), null, "company names are data");
const js = fs.readFileSync(new URL("../i18n.js", import.meta.url), "utf8");
assert.ok(/localStorage\.getItem\("btp_lang"\)/.test(js) && /data-noi18n/.test(js));
assert.ok(fs.readFileSync(new URL("../nav.js", import.meta.url), "utf8").includes('"/i18n.js"'), "nav loads i18n on every page");
console.log(`✓ i18n: ${Object.keys(S).length} Spanish strings + ${P.length} patterns; data (titles, companies) untouched`);
