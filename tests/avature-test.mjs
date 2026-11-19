// Avature reader (Nov 18): parse search pages, stay on the company's own host, detect boards, keep US internships + new-grad.
import assert from "node:assert/strict";
const { parseAvature, avatureTotal, avatureName, avatureSearch } = await import("../lib/fetchers/avature.js");
const { scanHtml } = await import("../lib/discover.js");
const cfg = { id: "acme", host: "acme.avature.net", portal: "careers" };
const art = (id, title, loc, host = "acme.avature.net") => `<article class="article article--result" id="article--${id}"><div class="article__header"><h3 class="article__header__text__title"><a class="link" href="https://${host}/careers/JobDetail/${title.replace(/\W+/g, "-")}/${id}"> ${title} </a></h3>
  <div class="article__header__text__subtitle"><span class="list-item-location">${loc}</span></div></div><div class="article__footer"><a class="button" href="https://${host}/careers/JobDetail/x/${id}">Apply</a></div></article>`;
const page = `<html><head><title>
  Acme Robotics Careers </title></head><body><span>1-12</span> of <span>3 results</span>
  ${art(101, "Mechanical Engineering Intern", "Pittsburgh, Pennsylvania, United States")}
  ${art(102, "Software Engineer I &amp; New Grad", "Austin, TX, United States")}
  ${art(103, "Data Intern", "London, United Kingdom")}
  ${art(104, "Phishing Intern", "Pittsburgh, PA", "evil.example.com")}
  <article class="article article--result"><a class="link" href="/careers/JobDetail/Relative-Intern/105">Relative Intern</a><span class="list-item-location">Erie, PA</span></article>
</body></html>`;
const jobs = parseAvature(page, cfg);
assert.deepEqual(jobs.map((j) => j.sourceId), ["101", "102", "103", "105"], "links to other hosts are dropped; relative links resolve");
assert.equal(jobs[0].url, "https://acme.avature.net/careers/JobDetail/Mechanical-Engineering-Intern/101");
assert.equal(jobs[0].location, "Pittsburgh, Pennsylvania, United States");
assert.equal(jobs[1].title, "Software Engineer I & New Grad", "entities decoded");
assert.equal(jobs[3].url, "https://acme.avature.net/careers/JobDetail/Relative-Intern/105");
assert.equal(avatureTotal(page), 3);
assert.equal(avatureName(page), "Acme Robotics");
assert.equal(avatureSearch(cfg, "co-op", 50), "https://acme.avature.net/careers/SearchJobs/?search=co-op&jobRecordsPerPage=50&jobOffset=50");
// detection: tenant boards, custom domains only when the page is Avature, never Avature's own careers site
const b1 = scanHtml('<a href="https://acme.avature.net/careers">Jobs</a> <a href="https://careers.avature.net/main">Work at Avature</a> <a href="https://acme.avature.net/InternalCareers">staff</a>', null).boards;
assert.deepEqual(b1.map((x) => x.ats + ":" + x.config.host + "/" + x.config.portal), ["avature:acme.avature.net/careers"]);
const b2 = scanHtml('<script src="https://cdn.avature.net/x.js"></script><a href="https://careers.acme.com/global/en/SearchJobs">Search</a>', null).boards;
assert.ok(b2.some((x) => x.ats === "avature" && x.config.host === "careers.acme.com" && x.config.portal === "global/en"), "custom domain board found when the page is Avature");
assert.ok(!scanHtml('<a href="https://careers.other.com/en/SearchJobs">Search</a>', null).boards.some((x) => x.ats === "avature"), "no Avature mention → not guessed");
// end to end through the shared filter
let calls = 0;
globalThis.fetch = async (u) => { calls++; const s = String(u); const body = /search=intern&/.test(s) && /jobOffset=0/.test(s) ? page : "<html></html>";
  return { ok: true, status: 200, text: async () => body, json: async () => ({}), headers: new Map() }; };
const { fetchCompany } = await import("../lib/fetchers/index.js");
const out = await fetchCompany({ id: "acme", company: "Acme Robotics", ats: "avature", host: "acme.avature.net", portal: "careers" });
assert.deepEqual(out.listings.map((l) => l.title).sort(), ["Mechanical Engineering Intern", "Relative Intern", "Software Engineer I & New Grad"], "US internships + new grad kept; London dropped");
console.log("✓ Avature: search pages parsed, own host only, boards detected, US internships + new-grad kept");
