// Nov 21: name guesses on Ashby / Workable / BambooHR / SmartRecruiters / Jobvite + Common Crawl helpers
import assert from "node:assert/strict";
const { guessMoreBoards, guessTokens } = await import("../lib/discover.js");
const { pickCaptures, warcHtml, readCapture } = await import("../lib/ccfind.js");
const J = (s, b) => ({ ok: s < 400, status: s, url: "", headers: { get: () => "application/json" }, text: async () => JSON.stringify(b), json: async () => b });
const H = (s, t) => ({ ok: s < 400, status: s, url: "", headers: { get: () => "text/html" }, text: async () => t, json: async () => ({}) });
const web = {
  "https://apply.workable.com/api/v1/widget/accounts/planetfitness": J(200, { name: "Planet Fitness", jobs: [{ title: "Front Desk Team Member" }, { title: "Marketing Intern" }] }),
  "https://apply.workable.com/api/v1/widget/accounts/acmegym": J(200, { name: "Acme Gym Holdings LLC", jobs: [{ title: "Intern" }] }),
  "https://apply.workable.com/api/v1/widget/accounts/river": J(200, { name: "River Health", jobs: [{ title: "Intern" }] }),
  "https://kessler.bamboohr.com/careers/company-info": J(200, { result: { name: "Someone Else Inc" } }),
  "https://jobs.ashbyhq.com/novacare": H(200, "<title>Jobs at NovaCare Rehabilitation</title><script src='https://cdn.ashbyhq.com/x.js'></script>"),
  "https://api.ashbyhq.com/posting-api/job-board/novacare?includeCompensation=false": J(200, { jobs: [{ title: "PT Aide" }, { title: "Rehab Intern" }] }),
};
globalThis.fetch = async (u) => web[String(u)] || { ok: false, status: 404, url: String(u), headers: { get: () => "" }, text: async () => "", json: async () => ({}) };

assert.deepEqual(guessTokens({ company: "Planet Fitness", key: "planetfitness", domain: "planetfitness.com" }), ["planetfitness"]);
assert.deepEqual(guessTokens({ company: "Kessler Rehabilitation Center", key: "kessler", domain: "kesslerrehab.com" }), ["kesslerrehabilitationcenter", "kessler", "kesslerrehab"]);
let r = await guessMoreBoards({ company: "Planet Fitness", key: "planetfitness", domain: "planetfitness.com" });
assert.equal(r.status, "live"); assert.equal(r.ats, "workable"); assert.equal(r.intern_count, 1);
console.log("planet fitness ✓", r.detail);
r = await guessMoreBoards({ company: "NovaCare Rehabilitation", key: "novacare", domain: "novacare.com" });
assert.equal(r.ats, "ashby"); console.log("novacare ✓", r.detail);
assert.equal(await guessMoreBoards({ company: "Kessler Rehabilitation Center", key: "kessler", domain: "kesslerrehab.com" }), null);
console.log("kessler ✓ held: the 'kessler' board is registered to someone else");
assert.equal(await guessMoreBoards({ company: "River", key: "river", domain: "river.com" }), null);
console.log("river ✓ held: 'River Health' isn't River");

// Common Crawl: careers captures on their own domain only, index-like pages first
const lines = [
  { url: "https://www.acme.com/careers/", timestamp: "20251001", status: "200", mime: "text/html", filename: "a", offset: "1", length: "2" },
  { url: "https://www.acme.com/careers/2019/old-posting-title-here", timestamp: "20251001", status: "200", mime: "text/html", filename: "b", offset: "1", length: "2" },
  { url: "https://www.acme.com/blog/careers-advice", timestamp: "20251001", status: "200", mime: "text/html", filename: "c", offset: "1", length: "2" },
  { url: "https://evil-acme.com/careers", timestamp: "20251001", status: "200", mime: "text/html", filename: "d", offset: "1", length: "2" },
  { url: "https://jobs.acme.com/", timestamp: "20251001", status: "200", mime: "text/html", filename: "e", offset: "1", length: "2" },
  { url: "https://www.acme.com/about", timestamp: "20251001", status: "200", mime: "text/html", filename: "f", offset: "1", length: "2" },
  { url: "https://www.acme.com/careers/", timestamp: "20250101", status: "404", mime: "text/html", filename: "g", offset: "1", length: "2" },
].map((x) => JSON.stringify(x)).join("\n");
const caps = pickCaptures(lines, "acme.com", 3);
assert.deepEqual(caps.map((c) => c.filename), ["e", "a", "b"]);
assert.ok(!caps.some((c) => /evil|blog|about/.test(c.url)));
const warc = "WARC/1.0\r\nWARC-Type: response\r\n\r\nHTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<a href=\"https://boards.greenhouse.io/acmeco\">Open roles</a>";
const x = readCapture(warcHtml(warc), "https://www.acme.com/careers/");
assert.equal(x.boards[0].ats, "greenhouse"); assert.equal(x.boards[0].config.token, "acmeco");
console.log("common crawl helpers ✓\nALL GUESS-MORE TESTS PASSED");

// Careers Finder: hint rules + archived own-site link
{
  const { ccHint } = await import("../lib/ccfind.js");
  const { ccOwn } = await import("../lib/discover.js");
  const row = { id: "x", domain: "acme.com", status: "no_board", hint: null, config: { triedHint: null } };
  let h = ccHint(row, { boards: [{ url: "https://acme.wd5.myworkdayjobs.com/External" }], page: "https://www.acme.com/careers/", at: "20260901000000", careers: "https://www.acme.com/about/join-us" });
  assert.equal(h.hint, "https://acme.wd5.myworkdayjobs.com/External"); assert.equal(h.config.ccSeen.at, "2026-09-01");
  assert.equal(ccOwn({ domain: "acme.com", hint: h.hint, config: h.config }), true);
  assert.equal(ccOwn({ domain: "acme.com", hint: h.hint, config: { ccSeen: { ...h.config.ccSeen, at: "2023-01-01" } } }), false, "too old");
  assert.equal(ccOwn({ domain: "other.com", hint: h.hint, config: h.config }), false, "page not on their domain");
  h = ccHint(row, { boards: [{ url: "https://www.google.com/" }], careers: "https://www.acme.com/about/join-us" });
  assert.equal(h.hint, "https://www.acme.com/about/join-us"); assert.deepEqual(h.config, {});
  assert.equal(ccHint(row, { boards: [], careers: "https://www.acme.com/careers" }), null, "the finder already tries /careers");
  assert.equal(ccHint(row, { boards: [], careers: "https://evil.com/careers/acme" }), null, "careers page must be on their domain");
  assert.equal(ccHint({ ...row, config: { triedHint: "https://www.acme.com/jobs-list" } }, { careers: "https://www.acme.com/jobs-list" }), null, "already tried");
  const off = ccHint(row, { boards: [{ url: "https://boards.greenhouse.io/acme" }], page: "https://evil.com/x", at: "20260901" });
  assert.equal(off.hint, "https://boards.greenhouse.io/acme"); assert.equal(off.config.ccSeen, undefined, "a board seen off their site is only a hint, needs normal proof");
  console.log("careers finder hint rules ✓");
}
{
  const { INTERNAL_BOARD } = await import("../lib/discover.js");
  const t = (c) => INTERNAL_BOARD.test(JSON.stringify(c));
  assert.ok(t({ host: "internaljobs.centurylink.com" }) && t({ tenant: "acme", site: "Internal" }));
  assert.ok(!t({ host: "jobs.centurylink.com" }) && !t({ token: "internationalpaper" }) && !t({ site: "External" }) && !t({ token: "internalmed" }));
  console.log("employees-only boards never go live ✓");
}
