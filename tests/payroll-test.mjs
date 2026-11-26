// Nov 25 (owners): a Paylocity/UKG board's own distinctive registered name counts as proof
import assert from "node:assert/strict";
process.env.BTP_OFFLINE_TEST = "1";
const D = await import("../lib/discover.js");
for (const n of ["Primary Care Associates of Appleton", "Swickard Auto", "Farmers National Bank", "Jackson County Memorial Hospital Authority", "Red McCombs Toyota", "Quality Vision International"]) assert.ok(D.distinctiveName(n), n);
for (const n of ["DSO", "EMCS", "SECURA", "Home Health Services", "Medical Group, Inc.", "The Company", "Primary Care", "AB LLC"]) assert.ok(!D.distinctiveName(n), n);
const board = (title, jobs) => `<html><head><title>${title} - Job Opportunities</title></head><body><script>window.pageData = {"ModuleTitle":"${title}","Jobs":${JSON.stringify(jobs)}};\n</script></body></html>`;
const jobs = [{ JobId: 1, JobTitle: "Summer Intern", LocationName: "Appleton, WI", PublishedDate: "2026-11-01" }];
globalThis.fetch = async (u) => ({ ok: true, status: 200, headers: { get: () => "text/html" }, text: async () => board(String(u).includes("aaaaaaaa") ? "Swickard Auto" : "DSO", jobs) });
const g = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", h = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const ok = await D.discoverOne({ id: "b-x", company: "Swickard Auto", hint: `https://recruiting.paylocity.com/recruiting/jobs/All/${g}` }, { deadline: Date.now() + 20000 });
assert.equal(ok.status, "live", JSON.stringify(ok));
assert.match(ok.detail || ok.why || JSON.stringify(ok), /registered name/);
const no = await D.discoverOne({ id: "b-y", company: "DSO", hint: `https://recruiting.paylocity.com/recruiting/jobs/All/${h}` }, { deadline: Date.now() + 20000 });
assert.equal(no.status, "identity_failed", JSON.stringify(no));
console.log("payroll-test ok");
