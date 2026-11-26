// Pay Finder (Nov 26): reads only pay the EMPLOYER posted, never guesses; the pages that show it.
import assert from "node:assert/strict";
import fs from "node:fs";
import { parsePay, fromStructured, payText, toHourly, sane } from "../lib/pay.js";
const { tokenOf, buildStats, summarize } = await import("../scripts/pay-finder.mjs");

const P = (t) => { const p = parsePay(t); return p && payText(p); };
// real ad wording
assert.equal(P("The hourly pay range for this role is $25.00 - $32.00 per hour."), "$25–32/hr");
assert.equal(P("Annual Salary Range <span>$120,000</span><span>&mdash;</span><span>$150,000 USD</span>"), "$120k–150k/yr");
assert.equal(P("Pay: $20/hr"), "$20/hr");
assert.equal(P("Intern hourly rate: $28"), "$28/hr");
assert.equal(P("Base salary range: $70,000 to $90,000 annually"), "$70k–90k/yr");
assert.equal(P("Salary $4,000 - $5,000 per month"), "$4,000–5,000/mo", "the unit right after the number wins over 'salary'");
assert.equal(P("The monthly stipend is $3,000"), "$3,000/mo", "an intern stipend is pay");
assert.equal(P("Salary range $60,000-$75,000 + bonus"), "$60k–75k/yr");
assert.equal(P("Equity and $150k base salary"), "$150k/yr");
assert.equal(P("We raised $50 million in funding. Pay range $18 – $22 hourly"), "$18–22/hr", "only the pay sentence counts");
assert.equal(P("$2,000 relocation stipend. Compensation: $80K-$100K"), "$80k–100k/yr");
// never pay
for (const t of ["CAD $60,000 - $70,000 salary", "$500 signing bonus", "Housing stipend of $2,000 per month", "We offer a $1,000 referral bonus; pay is competitive",
                 "Our customers save $200 per year", "We manage $5 billion in assets", "Tuition reimbursement up to $5,250 a year", "Pay is competitive", "$1,200 a week travel allowance"])
  assert.equal(parsePay(t), null, t);
// no unit word: < $200 = hourly, 15k+ = yearly, in between is skipped
assert.equal(P("Pay range: $22 - $26"), "$22–26/hr");
assert.equal(parsePay("Pay range: $900 - $1,100"), null);
// sanity limits
assert.equal(sane(5, 6, "h"), false, "under minimum wage");
assert.equal(sane(20, 100, "h"), false, "top > 4x bottom");
assert.equal(sane(16, 22, "h"), true);
assert.equal(toHourly(83200, "y"), 40);
// structured pay (Ashby / Lever)
assert.deepEqual(fromStructured(211400, 290600, "1 YEAR", "USD"), { lo: 211400, hi: 290600, u: "y" });
assert.deepEqual(fromStructured(25, 30, "per-hour-wage", "USD"), { lo: 25, hi: 30, u: "h" });
assert.equal(fromStructured(60000, 70000, "1 YEAR", "CAD"), null);
assert.equal(fromStructured(null, null, "1 YEAR", "USD"), null);
assert.equal(payText([45.5, 45.5, "h"]), "$45.50/hr");

// board tokens from the public company feed
assert.equal(tokenOf({ ats: "greenhouse", detail: 'greenhouse "1800contacts" · board name matches', hint: "" }), "1800contacts");
assert.equal(tokenOf({ ats: "lever", detail: "", hint: "https://jobs.lever.co/2os/20fd/apply" }), "2os");
assert.equal(tokenOf({ ats: "ashby", detail: "", hint: "https://jobs.ashbyhq.com/ramp?x=1" }), "ramp");
assert.equal(tokenOf({ ats: "ashby", detail: "", hint: "" }), null);

// stats: medians from midpoints, small groups left out, "interns" over $100/hr kept off the top list
const row = (i, kind, field, state, pay, co = "c" + (i % 3)) => ({ id: `${co}:${i}`, company_id: co, company: co.toUpperCase(), title: "Intern " + i, field, kind, state, url: "https://x/" + i, pay });
const rows = [];
for (let i = 0; i < 10; i++) rows.push(row(i, "intern", "software", "CA", { lo: 30 + i, hi: 30 + i, u: "h" }));
for (let i = 10; i < 13; i++) rows.push(row(i, "intern", "marketing", "VA", { lo: 18, hi: 22, u: "h" }));
rows.push(row(99, "intern", "software", "NY", { lo: 300000, hi: 300000, u: "y" }));
rows.push(row(50, "fulltime", "software", "TX", { lo: 70000, hi: 90000, u: "y" }));
const s = buildStats(rows, "2026-11-26T00:00:00Z");
assert.equal(s.total, 15);
assert.equal(s.byKind.fulltime.med, Math.round(80000 / 2080 * 100) / 100);
assert.deepEqual(s.byField.map((f) => f.key), ["software"], "areas with < 5 postings are left out");
assert.ok(!s.topInterns.some((j) => j.id === "c0:99"), "no $144/hr 'intern'");
assert.equal(s.topInterns[0].hr, 39);
assert.equal(s.bands.reduce((a, b) => a + b.n, 0), 14);
assert.deepEqual(summarize([10, 20, 30]), { n: 3, p25: 15, med: 20, p75: 25 });

// pages + wiring
const read = (p) => fs.readFileSync(new URL("../" + p, import.meta.url), "utf8");
const jobs = read("jobs/index.html");
assert.ok(jobs.includes('id="payOnly"') && jobs.includes("/pay/jobs.json") && jobs.includes('p.set("pay", "1")'), "/jobs: pay tags + Shows pay filter in the URL");
assert.ok(read("pay/index.html").includes("/pay/stats.json"));
const nav = read("nav.js"); for (const h of ["/pay/", "/pulse/", "/help/"]) assert.ok(nav.includes(`["${h}"`), "Tools menu has " + h);
const foot = read("consent.js"); for (const h of ["/help/", "/contact/", "/press/", "/changelog/", "/status/", "/pay/", "/pulse/", "/privacy/", "/terms/"]) assert.ok(foot.includes(h), "footer links " + h);
for (const p of ["help", "contact", "press", "changelog", "status", "pay", "pulse"]) {
  const h = read(p + "/index.html");
  assert.ok(h.includes('<script src="/nav.js"></script>') && /<title>[^<]+ \| Beat the Pile<\/title>/.test(h) && h.includes(`canonical" href="https://www.beatthepile.com/${p}/"`), p + " page basics");
  assert.ok(!h.includes("—"), p + ": no em dashes");
}
const bots = await import("../lib/bots.js");
for (const id of ["pay", "pulse"]) { assert.ok(bots.BOT_IDS.includes(id)); assert.ok(bots.STALE_MIN[id] >= 24 * 60); assert.equal(bots.RESTART[id], "data-bots.yml"); }
assert.ok(read(".github/workflows/data-bots.yml").includes("scripts/pay-finder.mjs"));
console.log("✓ pay: posted pay only (units, US dollars, no bonuses/stipends-for-housing), stats, /jobs tags, new pages wired");
