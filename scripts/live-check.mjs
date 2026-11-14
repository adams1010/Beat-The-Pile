// Live check (Nov 14 2026): after every deploy, open the real site in a browser and make sure each page loads with no
// script errors, the job tabs and search return jobs, and the APIs answer. Exits 1 on any failure (the GitHub run turns red
// and GitHub emails the repo owner). Run: node scripts/live-check.mjs [https://www.beatthepile.com]
import { chromium } from "playwright";

const SITE = process.argv[2] || "https://www.beatthepile.com";
const bust = `v=${Date.now()}`;
const fails = [], notes = [];
const fail = (what) => { fails.push(what); console.log("✗ " + what); };
const ok = (what) => console.log("✓ " + what);

// 1) APIs
async function api(path, check, label) {
  try {
    const r = await fetch(`${SITE}${path}${path.includes("?") ? "&" : "?"}${bust}`);
    const j = await r.json().catch(() => null);
    if (!r.ok) return fail(`${label}: HTTP ${r.status}`);
    const why = check(j);
    if (why) fail(`${label}: ${why}`); else ok(label);
    return j;
  } catch (e) { fail(`${label}: ${e.message}`); }
}
const sum = await api("/api/listings?summary=1&field=all", (j) => (j?.allMajors > 1000 ? null : `only ${j?.allMajors} internships`), "summary counts");
if (sum) notes.push(`${sum.allMajors} internships · ${sum.fulltime} entry-level · ${sum.hourly ?? "?"} hourly · ${sum.companies} companies`);
for (const kind of ["intern", "fulltime", "hourly", "all"])
  await api(`/api/listings?field=all&kind=${kind}&limit=50`, (j) => (j?.listings?.length ? null : "no jobs"), `jobs list (${kind})`);
await api("/api/listings?field=all&kind=all&q=medical%20assistant&limit=50", (j) => (j?.listings?.length && j.listings.every((l) => /medical/i.test(l.title + l.company + l.location)) ? null : "search words not applied"), "server search");
await api("/api/listings?field=all&kind=all&near=Washington%2C%20DC&mi=25&limit=50", (j) => (j?.listings?.length ? null : "no jobs near DC"), "near search");
await api("/api/listings?field=all&kind=all&near=washingdon%20dc&mi=25&limit=5", (j) => (j?.meta?.near?.fixedTo ? null : "typo not fixed"), "typo place search");
// Nov 14: security headers stay on (vercel.json)
try { const h = (await fetch(`${SITE}/jobs/?${bust}`)).headers; const miss = ["strict-transport-security", "x-content-type-options", "x-frame-options", "content-security-policy", "referrer-policy", "permissions-policy"].filter((k) => !h.get(k));
  if (miss.length) fail("security headers missing: " + miss.join(", ")); else ok("security headers"); } catch (e) { fail("security headers: " + e.message); }
await api("/api/discovery?bots=1", (j) => (j?.bots?.length ? null : "no bot switches"), "bot switches");

// 2) Pages in a real browser (phone-sized too)
const PAGES = ["/", "/jobs/", "/jobs/?kind=fulltime", "/jobs/?kind=hourly", "/jobs/?kind=all&q=nurse", "/tracker/", "/season/", "/fair/", "/orbit/",
  "/u/", "/start/", "/radar/", "/majors/", "/demo/", "/business/", "/privacy/", "/terms/", "/cookies/", "/accessibility/"];
const browser = await chromium.launch();
for (const vp of [{ width: 1280, height: 900, name: "desktop" }, { width: 390, height: 844, name: "phone" }]) {
  const ctx = await browser.newContext({ viewport: vp });
  for (const path of PAGES) {
    const page = await ctx.newPage(), errs = [];
    page.on("pageerror", (e) => errs.push(String(e.message || e).slice(0, 160)));
    try {
      const r = await page.goto(`${SITE}${path}${path.includes("?") ? "&" : "?"}${bust}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      if (!r || r.status() >= 400) { fail(`${vp.name} ${path}: HTTP ${r?.status()}`); await page.close(); continue; }
      await page.waitForTimeout(path.startsWith("/jobs") ? 9000 : 3500);
      if (path.startsWith("/jobs")) {
        const s = await page.evaluate(() => ({ cards: document.querySelectorAll("#list .title").length, err: document.querySelector("#list .err")?.textContent || "" }));
        if (s.err) fail(`${vp.name} ${path}: shows "couldn't load"`);
        else if (!s.cards) fail(`${vp.name} ${path}: no job cards`);
      }
      const nav = await page.evaluate(() => !!document.querySelector(".btpnav"));
      if (!nav) fail(`${vp.name} ${path}: top bar missing`);
      if (errs.length) fail(`${vp.name} ${path}: script error: ${errs[0]}`);
      else if (nav) ok(`${vp.name} ${path}`);
    } catch (e) { fail(`${vp.name} ${path}: ${e.message.slice(0, 120)}`); }
    await page.close();
  }
  await ctx.close();
}
await browser.close();

console.log("\n" + notes.join("\n"));
console.log(fails.length ? `\n${fails.length} PROBLEM(S) ON THE LIVE SITE` : "\nLive site OK");
process.exit(fails.length ? 1 : 0);
