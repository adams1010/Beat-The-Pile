import assert from "node:assert/strict";
const R = "../";
const { scanHtml, discoverOne, isOwn } = await import(R + "lib/discover.js");

// ---------- scanner ----------
const s = scanHtml(`<a href="https://acme.wd5.myworkdayjobs.com/en-US/Acme_External/job/x">Jobs</a>
  <a href="https://acme.wd5.myworkdayjobs.com/Acme_Internal">emp</a>
  <script>var u="https://wd3.myworkdaysite.com/recruiting/beta/Beta_Careers";</script>
  <iframe src="https://boards.greenhouse.io/embed/job_board?for=gammaco"></iframe>
  <a href="https://jobs.lever.co/deltarobotics">Lever</a>
  <a href="/careers/students">Students &amp; Interns</a><a href="/about">About</a><a href="/privacy">Careers privacy</a>
  <a href="https://careers-acme.icims.com/jobs">old</a>`, "https://www.acme.com/careers");
assert.deepEqual(s.boards.map(b => b.ats + ":" + (b.config.tenant || b.config.token || b.config.base) + (b.config.site ? "/" + b.config.site : "")),
  ["workday:acme/Acme_External", "workday:beta/Beta_Careers", "greenhouse:gammaco", "lever:deltarobotics", "icims:https://careers-acme.icims.com"]);
assert.equal(s.boards[1].config.apiBase, "https://wd3.myworkdaysite.com/wday/cxs/beta/Beta_Careers");
assert.deepEqual(s.unsupported, ["iCIMS"]);
assert.deepEqual(s.links.filter((l) => isOwn(l, "acme.com")), ["https://www.acme.com/careers/students"]);
assert.ok(isOwn("https://careers.acme.com/x", "acme.com") && !isOwn("https://acme.com.evil.io", "acme.com"));
console.log("scanner ✓ (skips internal boards, privacy links; finds 4 systems + iCIMS)");

// ---------- fake internet ----------
const W = (total, posts, facets = []) => ({ total, jobPostings: posts, facets });
const sites = {};
const json = (status, body) => ({ ok: status < 400, status, url: "", text: async () => JSON.stringify(body), json: async () => body });
const html = (status, body, url) => ({ ok: status < 400, status, url, text: async () => body, json: async () => JSON.parse(body) });
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const h = sites[u];
  if (typeof h === "function") return h(u, opts);
  if (h) return h;
  return html(404, "not found", u);
};

// 1) Own careers page → Workday (proof: own site)
sites["https://www.corning.com/careers"] = html(200, `<a href="https://corning.wd1.myworkdayjobs.com/en-US/External">Search jobs</a>`, "https://www.corning.com/careers");
sites["https://corning.wd1.myworkdayjobs.com/wday/cxs/corning/External/jobs"] = (u, o) => {
  const b = JSON.parse(o.body);
  if (Object.keys(b.appliedFacets).length) return json(200, W(12, [{ title: "Mechanical Engineering Intern", externalPath: "/job/a_1" }]));
  return json(200, W(900, [{ title: "Engineer", externalPath: "/job/b_2" }], [{ facetParameter: "workerSubType", values: [{ descriptor: "Intern", id: "I" }] }]));
};
let r = await discoverOne({ company: "Corning", domain: "corning.com", key: "corning" });
assert.equal(r.status, "live"); assert.equal(r.intern_count, 12); assert.equal(r.config.tenant, "corning");
assert.match(r.detail, /own careers site/);
console.log("1 live via own site ✓   ", r.detail);

// 2) Hint board, tenant name doesn't match, proof from hiringOrganization
sites["https://xyz123.wd5.myworkdayjobs.com/wday/cxs/xyz123/Careers/jobs"] = (u, o) =>
  json(200, W(50, [{ title: "Co-op - Manufacturing", externalPath: "/job/c_3" }], []));
sites["https://xyz123.wd5.myworkdayjobs.com/wday/cxs/xyz123/Careers/job/c_3"] = json(200, { hiringOrganization: { name: "Stanley Black & Decker, Inc." }, jobPostingInfo: { jobDescription: "..." } });
r = await discoverOne({ company: "Stanley Black & Decker", domain: "sbd-nowhere.com", key: "stanley", hint: "https://xyz123.wd5.myworkdayjobs.com/Careers" });
assert.equal(r.status, "live"); assert.match(r.detail, /Stanley Black & Decker, Inc\./);
console.log("2 live via employer name ✓", r.detail);

// 3) Hint board that belongs to someone else → held back
sites["https://other.wd1.myworkdayjobs.com/wday/cxs/other/Jobs/jobs"] = json(200, W(30, [{ title: "Intern", externalPath: "/job/d_4" }]));
sites["https://other.wd1.myworkdayjobs.com/wday/cxs/other/Jobs/job/d_4"] = json(200, { hiringOrganization: { name: "Totally Different Corp" }, jobPostingInfo: { jobDescription: "We build boats." } });
r = await discoverOne({ company: "Garmin", domain: "garmin-nowhere.com", key: "garmin", hint: "https://other.wd1.myworkdayjobs.com/Jobs" });
assert.equal(r.status, "identity_failed");
console.log("3 wrong company held ✓  ", r.detail);

// 4a) Careers page uses iCIMS → now readable → live (proved: linked from own site)
sites["https://www.trex.com/careers"] = html(200, `<a href="https://careers-trex.icims.com/jobs/search">Open roles</a>`, "https://www.trex.com/careers");
sites["https://careers-trex.icims.com/jobs/search?ss=1&searchKeyword=intern&in_iframe=1&pr=0"] = html(200,
  `<title>Job Listings at Trex</title><a href="https://careers-trex.icims.com/jobs/77/engineering-intern/job?in_iframe=1"><h3>Engineering Intern</h3></a><dd>US-VA-Winchester</dd>`, "");
r = await discoverOne({ company: "Trex", domain: "trex.com", key: "trex" });
assert.equal(r.status, "live"); assert.equal(r.ats, "icims"); assert.equal(r.config.base, "https://careers-trex.icims.com"); assert.equal(r.intern_count, 1);
console.log("4a iCIMS live ✓          ", r.detail);
// 4c) Subsidiary linking to its parent's iCIMS portal → NOT live (would mislabel the parent's jobs)
sites["https://www.bahnson.com/careers"] = html(200, `<a href="https://careers-emcorgroup.icims.com/jobs">Jobs</a>`, "https://www.bahnson.com/careers");
sites["https://careers-emcorgroup.icims.com/jobs/search?ss=1&searchKeyword=intern&in_iframe=1&pr=0"] = html(200,
  `<title>Job Listings at EMCOR Group</title><a href="https://careers-emcorgroup.icims.com/jobs/9/hvac-intern/job"><h3>HVAC Intern</h3></a>`, "");
r = await discoverOne({ company: "Bahnson", domain: "bahnson.com", key: "bahnson" });
assert.equal(r.status, "identity_failed");
console.log("4c parent portal held ✓  ", r.detail);

// 4b) Careers page uses Taleo → unsupported (logged by system)
sites["https://www.oldco.com/careers"] = html(200, `<a href="https://oldco.taleo.net/careersection/2/jobsearch.ftl">Open roles</a>`, "https://www.oldco.com/careers");
r = await discoverOne({ company: "OldCo", domain: "oldco.com", key: "oldco" });
assert.equal(r.status, "unsupported"); assert.match(r.detail, /Taleo/);
console.log("4b unsupported ✓         ", r.detail);

// 5) Bot wall everywhere → blocked
for (const u of ["https://www.walled.com/careers", "https://walled.com/careers", "https://careers.walled.com", "https://jobs.walled.com"]) sites[u] = html(403, "Access Denied", u);
r = await discoverOne({ company: "Walled", domain: "walled.com", key: "walled" });
assert.equal(r.status, "blocked");
console.log("5 blocked ✓              ", r.detail);

// 6) careers.x.com is a SuccessFactors site (proof: own domain)
sites["https://careers.bwxt-test.com"] = html(200, `<link href="https://rmkcdn.successfactors.com/x.css"><form action="/search/">`, "https://careers.bwxt-test.com/");
sites["https://careers.bwxt-test.com/search/?q=intern"] = html(200,
  `<tr class="data-row"><td><a href="/job/Lynchburg-Mechanical-Intern-VA-24501/123/" class="jobTitle-link">Mechanical Intern</a><span class="jobLocation">Lynchburg, VA</span></td></tr>`, "x");
r = await discoverOne({ company: "BWXT test", domain: "bwxt-test.com", key: "bwxt" });
assert.equal(r.status, "live"); assert.equal(r.ats, "successfactors"); assert.equal(r.config.base, "https://careers.bwxt-test.com");
console.log("6 live SuccessFactors ✓  ", r.detail);

// 7) Follows a "Students & Interns" link one level deep
sites["https://www.deep.com/careers"] = html(200, `<a href="/careers/early-talent">Students &amp; Interns</a>`, "https://www.deep.com/careers");
sites["https://www.deep.com/careers/early-talent"] = html(200, `<a href="https://jobs.lever.co/deepco">See openings</a>`, "https://www.deep.com/careers/early-talent");
sites["https://api.lever.co/v0/postings/deepco?mode=json"] = json(200, [{ text: "Mechanical Engineering Intern" }, { text: "Engineer" }]);
r = await discoverOne({ company: "Deep Co", domain: "deep.com", key: "deep" });
assert.equal(r.status, "live"); assert.equal(r.ats, "lever"); assert.equal(r.intern_count, 1);
console.log("7 live via 2nd-level link ✓", r.detail);

// 8) Nothing anywhere
r = await discoverOne({ company: "Ghost", domain: "ghost-co.com", key: "ghost" });
assert.equal(r.status, "no_board");
r = await discoverOne({ company: "No site", key: "nosite" });
assert.equal(r.status, "no_domain");
console.log("8 no board / no domain ✓");

// 9) Short name keyword can't prove a foreign board by text alone
sites["https://zzz.wd1.myworkdayjobs.com/wday/cxs/zzz/Ext/jobs"] = json(200, W(5, [{ title: "Intern", externalPath: "/job/e_5" }]));
sites["https://zzz.wd1.myworkdayjobs.com/wday/cxs/zzz/Ext/job/e_5"] = json(200, { hiringOrganization: { name: "Fabbricato SpA" }, jobPostingInfo: { jobDescription: "abbreviated..." } });
r = await discoverOne({ company: "ABB", domain: "abb-nowhere.com", key: "abb", hint: "https://zzz.wd1.myworkdayjobs.com/Ext" });
assert.equal(r.status, "identity_failed");
console.log("9 short-name false match blocked ✓ ('abb' inside 'Fabbricato')");
const { nameMatch } = await import(R + "lib/discover.js");
assert.ok(nameMatch("ABB Inc.", "abb") && !nameMatch("Fabbricato SpA", "abb") && nameMatch("Stanley Black & Decker, Inc.", "stanley"));
assert.ok(nameMatch("General Dynamics Mission Systems", "generaldynamics") && !nameMatch("HII-ish Corp", "hiix") && nameMatch("HII Mission Technologies", "hii"));
console.log("10 name matching rules ✓");
console.log("\nALL DISCOVERY TESTS PASSED");

// 11) Short company names on iCIMS: whole-word only
{
  const { discoverOne } = await import("../lib/discover.js");
  const prev = globalThis.fetch;
  const page = { "https://www.mpr.com/careers": `<a href="https://careers-mpr.icims.com/jobs">Jobs</a>`,
                 "https://www.mbpce.com/careers": `<a href="https://careers-mbpce.icims.com/jobs">Jobs</a>`,
                 "https://www.zzz.com/careers": `<a href="https://careers-zzzbuilders.icims.com/jobs">Jobs</a>` };
  const list = (t) => `<title>${t}</title><a href="/jobs/1/engineering-intern/job"><h3>Engineering Intern</h3></a>`;
  const search = { "careers-mpr": list("Job Listings at MPR Associates, Inc."), "careers-mbpce": list("Job Listings at McDonough Bolyard Peck, Inc. (MBP)"), "careers-zzzbuilders": list("Job Listings at Zzzbuilders Holdings") };
  globalThis.fetch = async (u) => { u = String(u);
    if (page[u]) return { ok: true, status: 200, url: u, text: async () => page[u] };
    const m = u.match(/https:\/\/(careers-[a-z]+)\.icims\.com\/jobs\/search/); if (m && search[m[1]]) return { ok: true, status: 200, url: u, text: async () => search[m[1]] };
    return { ok: false, status: 404, url: u, text: async () => "", json: async () => ({}) }; };
  let r = await discoverOne({ company: "MPR Associates", domain: "mpr.com", key: "mpr" }); assert.equal(r.status, "live", "MPR " + r.detail);
  r = await discoverOne({ company: "MBP", domain: "mbpce.com", key: "mbp" }); assert.equal(r.status, "live", "MBP " + r.detail);
  r = await discoverOne({ company: "ZZZ", domain: "zzz.com", key: "zzz" }); assert.notEqual(r.status, "live", "zzz must not match inside 'Zzzbuilders'");
  globalThis.fetch = prev;
  console.log("11 short names on iCIMS ✓ (MPR, MBP live; 'zzz' inside a longer name held)");
}

// 12) Speed: a page with a huge embedded image must not freeze the robot (Jamerson Lewis took 110s)
{
  const { scanHtml } = await import("../lib/discover.js");
  const page = `<img src="data:image/png;base64,${"Ab3-".repeat(150000)}"><a href="https://careers-acme.icims.com/jobs">Jobs</a>`;
  const t = Date.now(); const s = scanHtml(page, "https://acme.com/careers");
  assert.ok(Date.now() - t < 500, `scan took ${Date.now() - t}ms`); assert.equal(s.boards[0]?.ats, "icims");
  console.log(`12 600KB page with embedded image scanned in ${Date.now() - t}ms ✓`);
}

// 13) Pasted Phenom careers site (careers.abb): robot goes to its search page and finds the Workday board in escaped JSON
{
  const { discoverOne } = await import("../lib/discover.js");
  const prev = globalThis.fetch;
  globalThis.fetch = async (u) => { u = String(u);
    if (u === "https://careers.abb/global/en/home") return { ok: true, status: 200, url: u, text: async () => `<script src="https://cdn.phenompeople.com/x.js"></script><a href="/global/en/about">About</a>` };
    if (u === "https://careers.abb/global/en/search-results?keywords=intern") return { ok: true, status: 200, url: u, text: async () => `phApp.ddo = {"applyUrl":"https:\\/\\/abb.wd3.myworkdayjobs.com\\/External_Career_Page\\/job\\/Cary\\/Intern_1"};` };
    if (/wday\/cxs\/abb\/External_Career_Page\/jobs$/.test(u)) return { ok: true, status: 200, url: u, json: async () => ({ total: 5, jobPostings: [{ title: "Mechanical Intern", externalPath: "/job/a" }], facets: [] }) };
    return { ok: false, status: 404, url: u, text: async () => "", json: async () => ({}) }; };
  const r = await discoverOne({ company: "ABB", domain: "abb.com", key: "abb", hint: "https://careers.abb/global/en/home" });
  assert.equal(r.status, "live", JSON.stringify(r)); assert.equal(r.config.tenant, "abb");
  globalThis.fetch = prev;
  console.log("13 pasted Phenom site → search page → Workday board in escaped JSON ✓", r.detail);
}
