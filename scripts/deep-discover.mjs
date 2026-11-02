// scripts/deep-discover.mjs — the robot's nightly BROWSER pass (runs on GitHub Actions, which can run Chromium).
// For companies whose careers pages load job links with JavaScript (status no_board / blocked), open the page in a
// real browser, collect every job-board link, and hand any board found to /api/discovery as a hint.
// Nothing goes live from here: the normal robot must still prove each board belongs to that company.
// Usage: node scripts/deep-discover.mjs [--dry] [--limit=40]
import { chromium } from "playwright";
import { scanHtml } from "../lib/discover.js";

const SITE = process.env.SITE || "https://intern-iq-psi.vercel.app";
const DRY = process.argv.includes("--dry");
const LIMIT = +(process.argv.find((a) => a.startsWith("--limit=")) || "--limit=40").split("=")[1];
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").split("=")[1];
const JOBWORD = /career|job|opening|position|search|student|universit|intern|early|graduate|join|opportunit/i;

const d = await fetch(`${SITE}/api/discovery`).then((r) => r.json());
let todo = d.rows.filter((r) => ["no_board", "blocked"].includes(r.status) && r.domain && !r.hint);
if (ONLY) todo = d.rows.filter((r) => ONLY.split(",").includes(r.id));
// Big, well-known companies first: fair attendees, then the rest; least-recently tried first
const rank = (r) => (/Expo|Fair/.test(r.source || "") ? 0 : 1);
todo.sort((a, b) => rank(a) - rank(b) || String(a.checked_at).localeCompare(String(b.checked_at)));
todo = todo.slice(0, LIMIT);
console.log(`Browser pass over ${todo.length} companies${DRY ? " (dry run)" : ""}`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36", viewport: { width: 1280, height: 900 } });

async function grab(page, url) {
  const seen = [];
  page.on("request", (q) => seen.push(q.url()));                    // boards loaded in iframes/XHR show up here
  try { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 }); } catch { return null; }
  await page.waitForTimeout(4000);
  const html = await page.content().catch(() => "");
  const frames = page.frames().map((f) => f.url());
  const links = await page.$$eval("a[href]", (as) => as.map((a) => ({ href: a.href, text: (a.innerText || "").slice(0, 80) }))).catch(() => []);
  return { html, extra: [page.url(), ...frames, ...seen].join("\n"), links };
}

const found = [];
for (const c of todo) {
  const page = await ctx.newPage();
  let boards = [];
  try {
    for (const start of [`https://www.${c.domain}/careers`, `https://${c.domain}`]) {
      const g = await grab(page, start);
      if (!g) continue;
      boards = [...scanHtml(g.html, start).boards, ...scanHtml(g.extra, null).boards];
      if (boards.length) break;
      // one more hop: the most job-looking link on their own site
      const own = g.links.filter((l) => { try { return new URL(l.href).hostname.endsWith(c.domain) && JOBWORD.test(l.href + " " + l.text); } catch { return false; } });
      const next = own.find((l) => /search|opening|job/i.test(l.href + l.text)) || own[0];
      if (next) {
        const g2 = await grab(page, next.href);
        if (g2) boards = [...scanHtml(g2.html, next.href).boards, ...scanHtml(g2.extra, null).boards];
      }
      if (boards.length) break;
    }
  } catch (e) { console.log(`  ! ${c.company}: ${String(e.message).slice(0, 80)}`); }
  await page.close();
  const b = boards[0];
  if (!b) { console.log(`  · ${c.company}: nothing`); continue; }
  const hint = b.ats === "workday" ? (b.config.jobBase || `https://${b.config.host}/${b.config.site}`)
    : b.ats === "greenhouse" ? `https://job-boards.greenhouse.io/${b.config.token}`
    : b.ats === "lever" ? `https://jobs.lever.co/${b.config.token}`
    : b.ats === "ashby" ? `https://jobs.ashbyhq.com/${b.config.token}`
    : b.ats === "smartrecruiters" ? `https://jobs.smartrecruiters.com/${b.config.token}`
    : b.ats === "icims" ? b.config.base
    : b.ats === "oracle" ? `https://${b.config.host}/hcmUI/CandidateExperience/en/sites/${b.config.site}`
    : b.ats === "eightfold" ? `https://${b.config.host}/careers?domain=${b.config.domain}`
    : b.ats === "successfactors" ? b.config.base : null;
  console.log(`  ✓ ${c.company}: ${b.ats} → ${hint}`);
  found.push({ id: c.id, company: c.company, hint });
  if (!DRY && hint) {
    const r = await fetch(`${SITE}/api/discovery`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CRON_SECRET}` }, body: JSON.stringify({ id: c.id, hint }) });
    if (!r.ok) console.log(`    ! save failed ${r.status}`);
  }
}
await browser.close();
console.log(`DONE: found ${found.length} of ${todo.length}`);
console.log("FOUND_JSON " + JSON.stringify(found));
