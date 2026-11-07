import assert from "node:assert/strict";
const { guessJsonBoards, discoverOne } = await import("../lib/discover.js");
const J = (s, b) => ({ ok: s < 400, status: s, url: "", text: async () => JSON.stringify(b), json: async () => b });
const web = {
  "https://boards-api.greenhouse.io/v1/boards/geckorobotics": J(200, { name: "Gecko Robotics" }),
  "https://boards-api.greenhouse.io/v1/boards/geckorobotics/jobs": J(200, { jobs: [{ title: "Mechanical Engineering Intern" }, { title: "Engineer" }] }),
  "https://boards-api.greenhouse.io/v1/boards/scout": J(200, { name: "Scout RFP" }),                 // someone else's "scout" board
  "https://api.lever.co/v0/postings/xenergy?mode=json&limit=100": J(200, [{ text: "Mechanical Intern", descriptionPlain: "At X-energy we build reactors" }]),
  "https://api.lever.co/v0/postings/trex?mode=json&limit=100": J(200, [{ text: "Intern", descriptionPlain: "Join T-Rex Games!" }]),
};
globalThis.fetch = async (u) => web[String(u)] || { ok: false, status: 404, url: String(u), text: async () => "", json: async () => ({}) };

let r = await guessJsonBoards({ company: "Gecko Robotics", key: "gecko" });
assert.equal(r.status, "live"); assert.equal(r.config.token, "geckorobotics"); assert.equal(r.intern_count, 1);
console.log("gecko ✓", r.detail);
assert.equal(await guessJsonBoards({ company: "Scout Motors", key: "scout" }), null);
console.log("scout ✓ held: 'scout' board belongs to 'Scout RFP'");
r = await guessJsonBoards({ company: "X-energy", key: "xenergy" });
assert.equal(r.status, "live"); assert.equal(r.ats, "lever");
console.log("x-energy ✓", r.detail);
assert.equal(await guessJsonBoards({ company: "Trex", key: "trex" }), null);
console.log("trex ✓ held: Lever 'trex' postings don't name Trex");
assert.equal(await guessJsonBoards({ company: "ABB", key: "abb" }), null);
console.log("abb ✓ too-short name never guessed");
r = await discoverOne({ company: "Gecko Robotics", domain: "gecko-nosite.com", key: "gecko" });
assert.equal(r.status, "live");
console.log("discoverOne falls back to guess ✓\nALL GUESS TESTS PASSED");

// Paylocity board from Board Scout, no website on file: the likely website must link to THIS exact board (Nov 2026)
{
  const G = "0027d8f9-025e-4ed5-9c93-28e7e74478ae", OTHER = "11111111-2222-3333-4444-555555555555";
  const H = (s, html, url) => ({ ok: s < 400, status: s, url, headers: { get: () => "text/html" }, text: async () => html, json: async () => ({}) });
  const pay = (title) => `<title>Acme Plumbing - Job Opportunities</title><script>window.pageData = {"Jobs":[{"JobId":1,"JobTitle":"${title}","JobLocation":{"City":"Austin","State":"TX","Country":"USA"}}]};\n</script>`;
  const pages = {
    "https://www.acmeplumbing.com/": H(200, "<title>Acme Plumbing | Austin</title>", "https://www.acmeplumbing.com/"),
    [`https://recruiting.paylocity.com/recruiting/jobs/All/${G}`]: H(200, pay("Summer Intern"), ""),
    [`https://recruiting.paylocity.com/recruiting/jobs/All/${OTHER}`]: H(200, pay("Summer Intern"), ""),
  };
  const run = async (careersLinksTo) => {
    globalThis.fetch = async (u) => { u = String(u);
      if (/acmeplumbing\.com\/careers$/.test(u)) return H(200, `<a href="https://recruiting.paylocity.com/recruiting/jobs/All/${careersLinksTo}">Jobs</a>`, u);
      return pages[u] || { ok: false, status: 404, url: u, headers: { get: () => null }, text: async () => "", json: async () => ({}) }; };
    return discoverOne({ company: "Acme Plumbing", key: "acmeplumbing", domain: null, hint: `https://recruiting.paylocity.com/recruiting/jobs/All/${G}` });
  };
  let r = await run(G);
  assert.equal(r.status, "live", r.detail); assert.equal(r.domain, "acmeplumbing.com"); assert.match(r.detail, /links to this exact board/);
  r = await run(OTHER);
  assert.equal(r.status, "identity_failed", "their site links to a DIFFERENT Paylocity board → held back");
  console.log("✓ Paylocity from Board Scout: live only when the likely website links to this exact board");
}
