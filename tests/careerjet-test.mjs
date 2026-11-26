// Nov 26: Careerjet JobBox on /jobs ("More jobs from Careerjet"). Their terms: live display only, never stored, and
// Careerjet's script sees the visitor's IP, so it loads by itself only when the cookie choice allows optional services.
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (p) => fs.readFileSync(new URL("../" + p, import.meta.url), "utf8");
const page = read("jobs/index.html");

// the box sits AFTER the list (outside #list, so re-renders don't wipe it) and is its own labeled section
assert.ok(/id="list">[\s\S]*?<\/div>\s*<section class="cjbox" id="cjBox" hidden/.test(page), "box right after the list");
const fn = page.slice(page.indexOf("function cjSync()"), page.indexOf('addEventListener("btp-consent"'));
assert.ok(fn.length > 200, "cjSync exists");
assert.ok(/btpConsent\?\.analytics\(\)/.test(page.slice(page.indexOf("function cjAllowed"))), "auto-load follows the cookie choice");
assert.ok(/Show jobs from Careerjet/.test(fn), "otherwise a tap loads it");
assert.ok(/state\.savedOnly \|\| state\.followOnly \|\| state\.company/.test(fn), "hidden in saved / following / company views");
assert.ok(!/fetch\(|localStorage\.setItem|api\/listings/.test(fn), "never stored or sent to our servers");
assert.ok(/static\.careerjet\.org\/js\/all_widget_job_box_3rd_party\.min\.js/.test(fn), "Careerjet's own loader");
assert.ok(!/\d+ (jobs|matching)/i.test(fn), "no job counts on /jobs");
assert.ok(!/—/.test(fn), "no em dashes");
assert.ok(/render\(\)[\s\S]*cjSync\(\)/.test(page), "render keeps it in step with the search");

// a 2+ word search is sent as one quoted phrase; full-time adds no extra word (checked live Nov 26)
const ph = eval(page.match(/const cjPhrase = ([^\n]+);/)[1]);
assert.equal(ph("medical assistant"), '"medical assistant"');
assert.equal(ph("nursing"), "nursing");
assert.equal(ph('"data analyst"'), '"data analyst"');
assert.ok(!/fulltime:/.test(page.match(/const CJ_KIND = [^\n]+/)[0]), "no 'entry level' word");

// disclosed where people read about outside services, and in the cookie banner
assert.ok(/Careerjet/.test(read("cookies/index.html")) && /Careerjet/.test(read("privacy/index.html")), "cookie + privacy pages");
assert.ok(/job listings from Careerjet/.test(read("consent.js")), "cookie banner says so");
for (const l of ["es", "fr", "de", "nl"]) {
  const s = JSON.parse(read(`i18n/${l}.json`)).strings;
  for (const k of ["More jobs from Careerjet", "Show jobs from Careerjet", "These open on Careerjet. We don't check them the way we check the jobs above."]) assert.ok(s[k], `${l}: ${k}`);
}
console.log("✓ careerjet: live box after the results, follows the cookie choice, never stored, disclosed");
