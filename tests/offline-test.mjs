import assert from "node:assert/strict";
const R = "../";
const { classify, extractState } = await import(R+"lib/filter.js");

// ---- filter
const cases = [
  ["Intern: Manufacturing Engineer (Summer 2027)", "me"],
  ["Intern: Product Mechanical Engineer (Summer 2027)", "me"],
  ["Engineering Intern- Virginia (Summer 2027)", "general"],
  ["Mechanical Analysis Intern", "me"],
  ["Engineering Intern Summer 2026", null],          // stale season
  ["Software Engineering Intern 2027", null],
  ["Electrical Engineer Intern Summer 2027", null],
  ["Nuclear Criticality Safety Engineering Intern - Virginia (Summer 2027)", null],
  ["Intern - Supply Chain, PMO", null],
  ["Senior Mechanical Engineer", null],              // not an intern
  ["Mechanical/Electrical/Structural Engineering Intern", "me"],
  ["Co-op Mechanical Engineer Spring 2027", "me"],
];
for (const [t, want] of cases) assert.equal(classify(t), want, t);
assert.equal(extractState("Salem, VA, US, 24153"), "VA");
assert.equal(extractState("https://jobs.volvogroup.com/job/Macungie-Intern-Ops-PA-18062/1367923755/"), "PA");
assert.equal(extractState("Ridley Park, Pennsylvania"), "PA");
assert.equal(extractState("Newport News, Virginia, United States"), "VA");
assert.equal(extractState("Dublin, OH, US, 43016"), "OH");
console.log("filter ✓");

// ---- fake network
const sfPage = (rows) => `<html><span>Results 1 – ${rows.length} of ${rows.length}</span><table id="searchresults">${rows.map(r=>`
<tr class="data-row"><td><span class="jobTitle hidden-phone"><a href="${r.h}" class="jobTitle-link">${r.t}</a></span></td>
<td><span class="jobLocation">${r.l}</span></td><td><span class="jobDate">${r.d}</span></td></tr>`).join("")}</table></html>`;
const VOLVO_ROWS = [
  {h:"/job/Salem-Intern-Product-Mechanical-Engineer-%28Summer-2027%29-VA-24153/1400000001/", t:"Intern: Product Mechanical Engineer (Summer 2027)", l:"Salem, VA, US, 24153", d:"Oct 1, 2026"},
  {h:"/job/Greensboro-Intern-ME-NC-27409/1400000002/", t:"Intern: Mechanical Engineer (Summer 2027)", l:"Greensboro, NC, US, 27409", d:"Oct 1, 2026"},
  {h:"/job/Macungie-Intern-Buyer-PA-18062/1400000003/", t:"Intern: Buyer (Summer 2027)", l:"Macungie, PA, US, 18062", d:"Oct 1, 2026"},
  {h:"/job/Dublin-Intern-Manufacturing-Engineer-VA-24084/1400000004/", t:"Intern: Manufacturing Engineer (Summer 2027)", l:"Dublin, VA, US, 24084", d:"Oct 2, 2026"},
];
let volvoRows = VOLVO_ROWS, bwxtBroken = false;
const pages = {
  "https://jobs.volvogroup.com/job/Salem-Intern-Product-Mechanical-Engineer-%28Summer-2027%29-VA-24153/1400000001/": {s:200, b:"<h1>Intern</h1> Apply now"},
  "https://careers.bwxt.com/job/Lynchburg-Mechanical-Analysis-Intern-VA-24501/900/": {s:200, b:"Mechanical Analysis Intern. Apply"},
  "https://jobs.volvogroup.com/job/Greensboro-Intern-ME-NC-27409/1400000002/": {s:200, b:"apply"},
  "https://jobs.volvogroup.com/job/Dublin-Intern-Manufacturing-Engineer-VA-24084/1400000004/": {s:200, b:"This job posting is no longer available to apply."},
};
globalThis.fetch = async (url, opts={}) => {
  const u = String(url);
  const mk = (status, body, finalUrl=u) => ({ ok: status<400, status, url: finalUrl, text: async()=>typeof body==="string"?body:JSON.stringify(body), json: async()=>typeof body==="string"?JSON.parse(body):body });
  if (u.startsWith("https://jobs.volvogroup.com/search/")) return mk(200, u.includes("q=intern")? sfPage(volvoRows) : sfPage([]));
  if (u.startsWith("https://careers.bwxt.com/search/")) return bwxtBroken ? mk(200, "<html>new layout</html>") : mk(200, sfPage([{h:"/job/Lynchburg-Mechanical-Analysis-Intern-VA-24501/900/", t:"Mechanical Analysis Intern", l:"Lynchburg, VA, US", d:""}]));
  if (u.includes("/search/")) return mk(200, sfPage([]));
  if (u.includes("boeing.wd1") && u.endsWith("/jobs")) {
    const body = JSON.parse(opts.body);
    if (body.searchText !== "intern") return mk(200, {total:0, jobPostings:[]});
    return mk(200, {total:2, jobPostings:[
      {title:"Boeing Summer 2027 Internship Program (Paid) - Mechanical Engineering", externalPath:"/job/USA---Ridley-Park-PA/Mech_JR2026000111", locationsText:"3 Locations", postedOn:"Posted 2 Days Ago"},
      {title:"Software Engineering Intern 2027", externalPath:"/job/USA---Arlington-VA/SW_JR2026000222", locationsText:"Arlington, VA", postedOn:"Posted Today"}]});
  }
  if (u.includes("boeing.wd1") && u.includes("/job/")) return mk(200, {jobPostingInfo:{canApply:true, location:"USA - Ridley Park, PA", additionalLocations:["USA - Seattle, WA"]}});
  if (u.includes("myworkdayjobs")) return mk(200, {total:0, jobPostings:[]});
  if (pages[u]) return mk(pages[u].s, pages[u].b);
  if (u.includes("/rest/v1/")) return fakeDb(u, opts);
  return mk(404, "not found");
};

// ---- fake Supabase (PostgREST subset)
const T = { listings: new Map(), feed_runs: [] };
function fakeDb(u, opts) {
  const url = new URL(u); const table = url.pathname.split("/").pop(); const m = opts.method||"GET";
  const mk = (s, b) => ({ ok:true, status:s, url:u, text: async()=> b===undefined?"":JSON.stringify(b) });
  const p = Object.fromEntries(url.searchParams);
  const rows = () => [...T.listings.values()].filter(r =>
    (!p.company_id || r.company_id === p.company_id.slice(3)) &&
    (p.closed_at !== "is.null" || !r.closed_at) &&
    (!p.last_seen || r.last_seen < p.last_seen.slice(3)) &&
    (!p.id || r.id === p.id.slice(3)));
  if (table === "bot_runs" || table === "bot_settings") return mk(m === "POST" ? 201 : 200, m === "POST" ? undefined : []);
  if (table === "feed_runs") { if (m==="POST") { T.feed_runs.push(...JSON.parse(opts.body)); return mk(201); } return mk(200, T.feed_runs.slice(-1)); }
  if (m === "POST") { for (const r of JSON.parse(opts.body)) T.listings.set(r.id, {...(T.listings.get(r.id)||{first_seen:new Date().toISOString(), link_ok:null}), ...r}); return mk(201); }
  if (m === "PATCH") { const patch = JSON.parse(opts.body); rows().forEach(r => Object.assign(r, patch)); return mk(204); }
  return mk(200, rows());
}

process.env.INTERNIQ_DB_URL="https://fake.supabase.co"; process.env.INTERNIQ_DB_SERVICE_KEY="svc"; process.env.INTERNIQ_DB_ANON_KEY="anon"; process.env.CRON_SECRET="s3cret";
const { COMPANIES } = await import(R+"lib/companies.js");
COMPANIES.forEach(c => c.enabled = ["volvo-group","bwxt","boeing"].includes(c.id));
const sync = (await import(R+"api/sync.js")).default;
const check = (await import(R+"api/check-links.js")).default;
const resObj = () => { const o={}; o.status=(s)=>{o.code=s;return o;}; o.json=(b)=>{o.body=b;return o;}; o.setHeader=()=>{}; return o; };
const cronReq = { headers: { authorization: "Bearer s3cret" } };

// unauthorized
let r = resObj(); await sync({headers:{}}, r); assert.equal(r.code, 401);

// Day 1
r = resObj(); await sync(cronReq, r);
const open = () => [...T.listings.values()].filter(x=>!x.closed_at && x.match).map(x=>x.id).sort();   // engineering view
assert.deepEqual(open(), ["boeing:JR2026000111","bwxt:900","volvo-group:1400000001","volvo-group:1400000002","volvo-group:1400000004"]);
const boeing = T.listings.get("boeing:JR2026000111");
assert.equal(boeing.company, "Boeing"); assert.equal(boeing.state, "PA,WA");
assert.equal(boeing.url, "https://boeing.wd1.myworkdayjobs.com/en-US/EXTERNAL_CAREERS/job/USA---Ridley-Park-PA/Mech_JR2026000111");
console.log("sync day1 ✓  kept:", open().join(", "));

// link check: Dublin page says "no longer available" → dead
r = resObj(); await check(cronReq, r);
assert.ok(r.body.dead.includes("volvo-group:1400000004")); assert.ok(!r.body.dead.includes("volvo-group:1400000001"));   // all majors' links are checked now
assert.equal(T.listings.get("volvo-group:1400000001").link_ok, true);
console.log("link check ✓  dead:", r.body.dead);

// Day 2: Salem job removed from Volvo's board; BWXT's site redesign breaks the scraper
await new Promise(s=>setTimeout(s,5));
volvoRows = VOLVO_ROWS.filter(x => !x.h.includes("1400000001")); bwxtBroken = true;
r = resObj(); await sync(cronReq, r);
assert.ok(T.listings.get("volvo-group:1400000001").closed_at, "removed job closed");
assert.ok(!T.listings.get("bwxt:900").closed_at, "broken feed did NOT wipe BWXT");
const bw = r.body.report.find(x=>x.company_id==="bwxt"); assert.equal(bw.ok, false); assert.equal(bw.closed_skipped, true);
console.log("sync day2 ✓  closed missing job; health guard kept BWXT and flagged:", bw.error);

// listings API applies closed + dead-link rules
const listings = (await import(R+"api/listings.js")).default;
globalThis.fetch = (orig => async (u, o) => {
  if (String(u).includes("/rest/v1/listings")) { const engOnly = String(u).includes("match=not.is.null"); const vis=[...T.listings.values()].filter(x=>!x.closed_at && x.link_ok!==false && (!engOnly || x.match)); return {ok:true,status:200,text:async()=>JSON.stringify(vis)}; }
  return orig(u,o);
})(globalThis.fetch);
r = resObj(); await listings({method:"GET", query:{state:"va,pa"}}, r);
assert.deepEqual(r.body.listings.map(x=>x.title).sort(), ["Boeing Summer 2027 Internship Program (Paid) - Mechanical Engineering","Mechanical Analysis Intern"]);
console.log("listings API ✓  shows:", r.body.listings.length, "| hidden: closed Salem + dead-link Dublin");
r = resObj(); await listings({method:"GET", query:{state:"va,pa", field:"all"}}, r);
assert.ok(r.body.listings.some((x) => /Software/.test(x.title) && x.field === "software"), "?field=all includes other majors, tagged");
console.log("listings API ✓  ?field=all adds other majors:", r.body.listings.map((x) => x.field).join(", "));
console.log("\nALL OFFLINE TESTS PASSED");
