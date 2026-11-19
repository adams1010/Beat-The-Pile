// Nov 18: employer career fair packages (business/packages.json + /business/packages/) and paid placements on /fair (fair/featured.json).
import fs from "node:fs";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const P = JSON.parse(fs.readFileSync("business/packages.json", "utf8"));
assert.ok(Array.isArray(P.tiers) && P.tiers.length >= 1, "tiers");
const ids = new Set();
for (const t of P.tiers) {
  assert.ok(/^[a-z]+$/.test(t.id) && !ids.has(t.id), "tier id " + t.id); ids.add(t.id);
  assert.ok(Number.isFinite(t.price) && t.price > 0, "price " + t.id);
  assert.ok(["fair", "school"].includes(t.scope), "scope " + t.id);
  assert.ok(Array.isArray(t.features) && t.features.length, "features " + t.id);
  assert.ok(t.stripe === "" || /^https:\/\/(buy|checkout)\.stripe\.com\//.test(t.stripe), "stripe link must be a Stripe https link: " + t.id);
  for (const s of [t.name, t.pitch, ...t.features]) { assert.ok(!/—/.test(s), "no em dashes: " + s); assert.ok(!/\bfree\b|no fee/i.test(s), "no free wording on the business side: " + s); }
}
assert.equal(P.tiers.filter((t) => t.pick).length <= 1, true, "one recommended tier at most");
const F = JSON.parse(fs.readFileSync("fair/featured.json", "utf8"));
const fairs = new Set(JSON.parse(fs.readFileSync("fair/fairs.json", "utf8")).fairs.map((f) => f.id));
for (const x of F.featured) {
  assert.ok(/^[a-z0-9-]+$/.test(x.slug), "slug " + x.slug);
  assert.ok(["featured", "spotlight"].includes(x.tier), "tier " + x.tier);
  assert.ok((x.fairs || []).every((id) => fairs.has(id)) && ((x.fairs || []).length || (x.school && x.term)), "fair or school+term for " + x.slug);
}
const page = fs.readFileSync("business/packages/index.html", "utf8");
assert.ok(page.includes("client_reference_id") && page.includes("/business/packages.json"), "page reads the config and tags Stripe links");
assert.ok(!/secure checkout/i.test(page) && !/—/.test(page.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, "")), "plain copy");
assert.ok(fs.readFileSync("nav.js", "utf8").includes('["/business/packages/", "Packages", "pkg"]'), "employer tab");
assert.ok(fs.readFileSync("fair/index.html", "utf8").includes("/fair/featured.json"), "/fair shows featured companies");
assert.ok(/career fair packages/i.test(fs.readFileSync("refunds/index.html", "utf8")), "refund policy covers packages");
console.log("✓ packages: " + P.tiers.map((t) => `${t.name} $${t.price}`).join(" · ") + `; ${F.featured.length} featured placements`);
