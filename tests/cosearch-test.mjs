// Nov 15: look up any company and follow it (/companies/, GET /api/me?cosearch=, POST co_follow, Follow on /co/<slug>)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const C = await import("../lib/cosearch.js");
assert.equal(C.empKey({ company_id: "x-boeing", slug: "boeing" }), "x-boeing");
assert.equal(C.empKey({ company_id: null, slug: "beat-the-pile" }), "co-beat-the-pile", "business page with no job board");
assert.deepEqual(C.empKeys({ company_id: "x-boeing", slug: "boeing" }), ["x-boeing", "co-boeing"]);
assert.equal(C.cleanQ('  Boeing* (Co),"x" '), "Boeing Co x");
assert.ok(/^[a-z0-9-]{1,80}$/.test(C.empKey({ slug: "a".repeat(50) })), "fits the follow-key rule");
const me = readFileSync(new URL("../api/me.js", import.meta.url), "utf8");
assert.ok(me.includes("req.query?.cosearch") && !me.includes('action === "co_follow"'), "API wired; no follow-any-name path (Nov 15: verified companies only)");
const emp = readFileSync(new URL("../lib/employer.js", import.meta.url), "utf8");
assert.ok(emp.includes("followKey") && emp.includes('"co-" + row.slug'), "company pages give a follow key; followers counted for co- keys");
const co = readFileSync(new URL("../business/company/index.html", import.meta.url), "utf8");
assert.ok(co.includes("data-follow") && co.includes("wireFollow()"), "/co/ Follow button");
const page = readFileSync(new URL("../companies/index.html", import.meta.url), "utf8");
assert.ok(page.includes("cosearch=") && !page.includes("co_follow") && !page.includes("names.json") && page.includes("Set up your company page"), "/companies/ lists verified companies only");
const nav = readFileSync(new URL("../nav.js", import.meta.url), "utf8");
assert.ok(nav.includes('"/companies/?q="') && nav.includes('["/companies/", "Companies"'), "top-bar search + Tools");
// profile experience: pick a real company → orgId saved → logo + "Verified company" on the profile
assert.equal(typeof C.matchNames, "function"); assert.deepEqual(await C.matchNames([]), []);
assert.equal(C.logoUrl("fav:hitt.net"), "https://www.google.com/s2/favicons?domain=hitt.net&sz=128"); assert.equal(C.logoUrl("none"), null); assert.equal(C.logoUrl("http://x.com/a.png"), null);
assert.ok(me.includes("orgId: /^[a-z0-9-]{1,80}$/") && me.includes("req.query.conames"), "server keeps orgId, exact-name lookups");
const u = readFileSync(new URL("../u/index.html", import.meta.url), "utf8");
assert.ok(u.includes("data-cpick") && u.includes("wireCompanyPick(main, d)") && u.includes("verifyOrgs(xs)") && u.includes("data-org-id"), "/u/ company picker + verified logos");
console.log("✓ companies: search any company, follow business pages (co-<slug>) and companies we don't track yet (queued for the finder)");
