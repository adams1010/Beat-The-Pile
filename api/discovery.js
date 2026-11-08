// /api/discovery.js — the /discovery page's data.
//   GET  → public progress feed (every candidate company, its status, and any link already tried)
//   POST → admin only (InternIQ owner, signed in with Clerk):
//          { id, hint }                 paste a job-board link for a company the robot couldn't find
//          { company, domain, hint? }   add a brand-new company to the robot's list
//          A pasted link is never trusted by itself — the robot re-checks it and must still prove it's theirs.
import { db, isAuthorizedCron } from "../lib/db.js";
import { COMPANIES } from "../lib/companies.js";
import { normName, keyFor } from "../lib/simplify.js";
import { verifyClerkJWT, bearer } from "../lib/auth.js";
import { BOTS, BOT_IDS, logRun } from "../lib/bots.js";
import { aiSummary } from "../lib/aiusage.js";
import BACKLOG from "../data/backlog.json" with { type: "json" };

const ADMINS = (process.env.ADMIN_EMAILS || "shiloniadam10@gmail.com,mdxp21@gmail.com").toLowerCase().split(/[,\s]+/).filter(Boolean);
const slug = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const cleanUrl = (u) => { try { const x = new URL(String(u).trim()); return /^https?:$/.test(x.protocol) ? x.toString() : null; } catch { return null; } };
const cleanDomain = (d) => String(d || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");

async function adminEmail(req) {
  const uid = await verifyClerkJWT(bearer(req));
  if (!uid) return null;
  const r = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(uid)}`, { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } });
  if (!r.ok) return null;
  const u = await r.json();
  const emails = (u.email_addresses || []).filter((e) => e.verification?.status === "verified").map((e) => e.email_address.toLowerCase());
  return emails.find((e) => ADMINS.includes(e)) || null;
}

export default async function handler(req, res) {
  if (req.method === "POST") {
    res.setHeader("Cache-Control", "no-store");
    let fb = req.body; if (typeof fb === "string") { try { fb = JSON.parse(fb); } catch { fb = {}; } }
    // Public "Report a problem" button (any page). Stored privately; nobody can read it back through the API.
    if (fb?.action === "feedback") {
      const clip = (v, n) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
      const message = clip(fb.message, 2000);
      if (message.length < 3) return res.status(400).json({ error: "Tell us a bit more" });
      await db.insert("feedback", [{ page: clip(fb.page, 120), kind: clip(fb.kind, 40), message, contact: clip(fb.contact, 120) || null, listing_id: clip(fb.listingId, 200) || null }]);
      return res.status(200).json({ ok: true });
    }
    let who;
    // The nightly browser pass (GitHub Actions, holds CRON_SECRET) may also suggest links — they get the same proof checks
    if (isAuthorizedCron(req)) who = "robot";
    else try { who = await adminEmail(req); } catch { return res.status(503).json({ error: "Sign-in check unavailable" }); }
    if (!who) return res.status(403).json({ error: "Only the InternIQ owner can edit the robot's list" });

    let b = req.body; if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
    // ── Bot control room ──
    if (b?.action === "bot") {                            // owner flips a bot on/off on /bots
      if (who === "robot" || !BOT_IDS.includes(b.bot)) return res.status(400).json({ error: "Unknown bot" });
      await db.upsert("bot_settings", [{ bot: b.bot, enabled: b.on === true, updated_at: new Date().toISOString(), updated_by: who }], "bot");
      return res.status(200).json({ ok: true, bot: b.bot, enabled: b.on === true });
    }
    if (b?.action === "aicap") {                          // owner sets the monthly AI budget (0 = AI off)
      const cap = Math.round(Number(b.cap) * 100) / 100;
      if (who === "robot" || !(cap >= 0 && cap <= 500)) return res.status(400).json({ error: "Pick a budget between $0 and $500" });
      await db.upsert("bot_settings", [{ bot: "ai", enabled: cap > 0, cap_usd: cap, updated_at: new Date().toISOString(), updated_by: who }], "bot");
      return res.status(200).json({ ok: true, cap });
    }
    if (b?.action === "scout") {                          // Board Scout (GitHub) hands over boards that have internships
      if (who !== "robot") return res.status(403).json({ error: "Robot only" });
      const items = (Array.isArray(b.items) ? b.items : []).slice(0, 300);
      const rows = await db.selectAllAsAdmin("company_candidates?select=id,company");
      const ids = new Set(rows.map((r) => r.id));
      const names = new Set([...rows, ...COMPANIES].map((r) => normName(r.company)));
      const add = [];
      for (const it of items) {
        const company = String(it.company || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 80);
        const hint = cleanUrl(it.hint);
        const n = normName(company), id = "b-" + slug(company).slice(0, 60);
        if (company.length < 2 || n.length < 2 || !hint || ids.has(id) || names.has(n)) continue;
        const dom = it.domain ? cleanDomain(it.domain) : null;            // the website the board itself links to (Paylocity/UKG)
        add.push({ id, company, domain: dom && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(dom) ? dom : null, key: keyFor(company), hint, source: `Board Scout (${String(it.ats || "").slice(0, 20)})`, status: "pending",
                   priority: Math.max(0, Math.min(95, Math.round(Number(it.priority) || 0))) });
        ids.add(id); names.add(n);
      }
      for (let i = 0; i < add.length; i += 200) await db.insertIgnore("company_candidates", add.slice(i, i + 200));
      return res.status(200).json({ ok: true, received: items.length, added: add.length });
    }
    if (b?.action === "logos") {                          // 🖼 Logo Finder (GitHub) reports proven websites + icons
      if (who !== "robot") return res.status(403).json({ error: "Robot only" });
      const items = (Array.isArray(b.items) ? b.items : []).slice(0, 300), now = new Date().toISOString();
      let saved = 0;
      for (const it of items) {
        const id = String(it.id || ""); if (!/^[a-z0-9-]{2,90}$/.test(id)) continue;
        const domain = it.domain ? cleanDomain(it.domain) : null;
        const logo = it.logo === "fav" || it.logo === "none" ? it.logo : (/^https:\/\//.test(String(it.logo || "")) ? cleanUrl(it.logo) : null);
        if (domain && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) continue;
        const patch = { logo: domain ? (logo && logo !== "none" ? logo : "fav") : "none", logo_checked_at: now };
        if (domain) patch.domain = domain;
        await db.update(`company_candidates?id=eq.${encodeURIComponent(id)}`, patch); saved++;
      }
      return res.status(200).json({ ok: true, saved });
    }
    if (b?.action === "botlog") {                         // GitHub-run bots (browser pass, radar) report their runs
      if (who !== "robot" || !BOT_IDS.includes(b.bot)) return res.status(403).json({ error: "Robot only" });
      await logRun(b.bot, b.ok !== false, String(b.summary || "").slice(0, 300), b.stats && typeof b.stats === "object" ? b.stats : null);
      return res.status(200).json({ ok: true });
    }
    try {
      if (b?.id) {                                        // link for an existing company
        const hint = cleanUrl(b.hint);
        if (!hint) return res.status(400).json({ error: "That doesn't look like a link (needs https://…)" });
        await db.update(`company_candidates?id=eq.${encodeURIComponent(b.id)}`, { hint, status: "pending", checked_at: null,
          detail: who === "robot" ? "Browser pass found a job board — robot will verify it" : "Link added — robot will check it within the hour" });
        return res.status(200).json({ ok: true });
      }
      const company = String(b?.company || "").trim().slice(0, 80);
      const domain = cleanDomain(b?.domain);
      const hint = b?.hint ? cleanUrl(b.hint) : null;
      if (company.length < 2 || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return res.status(400).json({ error: "Need a company name and its website (like acme.com)" });
      const key = slug(company).replace(/-(inc|llc|corp|corporation|company|co|group)$/g, "").replace(/-/g, "");
      await db.insert("company_candidates", [{ id: "x-" + slug(company), company, domain, key, hint, source: "Added on /discovery", status: "pending" }]);
      return res.status(200).json({ ok: true });
    } catch (e) {
      const dup = /duplicate|23505/.test(String(e.message));
      if (!dup) console.error("[discovery save]", e);
      return res.status(dup ? 409 : 500).json({ error: dup ? "That company is already on the list" : "Couldn't save" });
    }
  }

  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  if (req.query?.boards !== undefined) {
    // Board Scout: which boards/companies we already know (so it only probes new ones)
    try {
      const rows = await db.selectAllAsAdmin("company_candidates?select=company,ats,config,hint");
      const known = new Set();
      const take = (ats, c) => {
        if (!ats || !c) return;
        if (ats === "workday" && c.tenant) known.add(`workday:${String(c.tenant).toLowerCase()}`);
        if (["greenhouse", "lever", "ashby", "smartrecruiters"].includes(ats) && c.token) known.add(`${ats}:${String(c.token).toLowerCase()}`);
        if (ats === "icims" && c.base) { try { known.add("icims:" + new URL(c.base).hostname.split(".")[0].toLowerCase()); } catch {} }
      };
      for (const r of rows) take(r.ats, r.config);
      for (const c of COMPANIES) take(c.ats, c);
      return res.status(200).json({ boards: [...known], names: [...new Set([...rows, ...COMPANIES].map((r) => normName(r.company)))] });
    } catch (e) { console.error("[discovery boards]", e); return res.status(500).json({ error: "Couldn't load boards" }); }
  }
  if (req.query?.logos === "todo") {                      // Logo Finder's work list (robot only)
    if (!isAuthorizedCron(req)) return res.status(403).json({ error: "Robot only" });
    try {
      const lim = Math.max(1, Math.min(600, +req.query.limit || 400));
      const old = new Date(Date.now() - 30 * 864e5).toISOString();
      const rows = await db.selectAsAdmin(`company_candidates?select=id,company,domain,ats,config,hint&status=eq.live&or=(logo_checked_at.is.null,and(logo.eq.none,logo_checked_at.lt.${old}))&order=intern_count.desc.nullslast&limit=${lim}`);
      // one listing link per company: if their job board lives on their own domain, that's the strongest lead
      const urls = {};
      for (let i = 0; i < rows.length; i += 80) {
        const ids = rows.slice(i, i + 80).map((r) => r.id).join(",");
        const ls = await db.selectAsAdmin(`listings?select=company_id,url&company_id=in.(${ids})&limit=400`);
        for (const l of ls) (urls[l.company_id] ||= []).length < 2 && urls[l.company_id].push(l.url);
      }
      return res.status(200).json({ companies: rows.map((r) => ({ ...r, urls: [...(urls[r.id] || []), r.hint].filter(Boolean) })) });
    } catch (e) { console.error("[discovery logos]", e); return res.status(500).json({ error: "Couldn't load the list" }); }
  }
  if (req.query?.bots !== undefined) {
    // Control room. Public callers (GitHub bots reading their switch) get ONLY the on/off switches.
    // Owners (Clerk admin sign-in) and the robot (CRON_SECRET) get everything: users, AI spend, run logs.
    res.setHeader("Cache-Control", "no-store");
    let owner = isAuthorizedCron(req);
    if (!owner && bearer(req)) owner = !!(await adminEmail(req).catch(() => null));
    if (!owner) {
      try {
        const settings = await db.selectAsAdmin("bot_settings?select=bot,enabled");
        const on = Object.fromEntries(settings.map((x) => [x.bot, x.enabled !== false]));
        return res.status(200).json({ public: true, bots: BOTS.map((x) => ({ id: x.id, name: x.name, enabled: on[x.id] !== false })) });
      } catch { return res.status(503).json({ error: "Couldn't load bot switches" }); }
    }
    try {
      const [settings, runs, cands, ai, listings, users, feedback] = await Promise.all([
        db.selectAsAdmin("bot_settings?select=bot,enabled,updated_at,updated_by"),
        db.selectAsAdmin(`bot_runs?select=bot,ran_at,ok,summary,stats&ran_at=gt.${new Date(Date.now() - 7 * 864e5).toISOString()}&order=ran_at.desc&limit=1500`),
        db.selectAllAsAdmin("company_candidates?select=id,company,status,verified_at,checked_at,detail"),
        aiSummary().catch(() => null),
        (async () => { const out = []; for (let off = 0; off < 10000; off += 1000) {           // Supabase returns ≤1000 rows per request
          const pg = await db.selectAsAdmin(`listings?select=company_id,match,field,first_seen&closed_at=is.null&or=(link_ok.is.null,link_ok.eq.true)&order=id.asc&limit=1000&offset=${off}`);
          out.push(...pg); if (pg.length < 1000) break; } return out; })().catch(() => []),
        db.selectAllAsAdmin("user_jobs?select=clerk_user_id,updated_at,apps,starred,resume_path&order=clerk_user_id.asc").catch(() => []),
        db.selectAsAdmin("feedback?select=created_at&limit=10000").catch(() => []),
      ]);
      // Whole-system numbers for the live map + "where to spend time"
      const unsupportedBy = {};
      for (const c of cands) if (c.status === "unsupported") { const m = /Uses (.+?) —/.exec(c.detail || ""); const k = m ? m[1] : "Other"; unsupportedBy[k] = (unsupportedBy[k] || 0) + 1; }
      const week = Date.now() - 7 * 864e5;
      const eng = listings.filter((l) => l.match);
      const byField = {}; for (const l of listings) byField[l.field || "untagged"] = (byField[l.field || "untagged"] || 0) + 1;
      const system = {
        listings: eng.length, me: eng.filter((l) => l.match === "me").length, allMajors: listings.length, byField,
        companiesWithJobs: new Set(eng.map((l) => l.company_id)).size,
        newListings24h: eng.filter((l) => Date.parse(l.first_seen) > Date.now() - 864e5).length,
        users: users.length, activeUsers7d: users.filter((u) => Date.parse(u.updated_at) > week).length,
        applications: users.reduce((n, u) => n + (Array.isArray(u.apps) ? u.apps.length : 0), 0),
        resumes: users.filter((u) => u.resume_path).length,
        feedback: feedback.length, feedback7d: feedback.filter((f) => Date.parse(f.created_at) > week).length,
        unsupportedBy,
      };
      const on = Object.fromEntries(settings.map((x) => [x.bot, x]));
      const counts = {}; for (const c of cands) counts[c.status] = (counts[c.status] || 0) + 1;
      const slugify = (n) => "s-" + String(n).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
      const ids = new Set(cands.map((c) => c.id));
      // Same rule as the finder's refill (api/discover.js): skip ids and exact names already in the queue
      const names = new Set(cands.map((c) => normName(c.company)));
      const backlogLeft = (BACKLOG.companies || []).filter((x) => { const n = normName(x.company); return n.length >= 3 && !ids.has(slugify(x.company)) && !names.has(n); }).length;
      const day = Date.now() - 864e5;
      const recentLive = cands.filter((c) => c.status === "live" && c.verified_at).sort((a, z) => String(z.verified_at).localeCompare(String(a.verified_at))).slice(0, 8).map((c) => ({ company: c.company, at: c.verified_at }));
      return res.status(200).json({
        ai, system,
        bots: BOTS.map((x) => ({ ...x, enabled: on[x.id]?.enabled !== false, changedAt: on[x.id]?.updated_at || null, changedBy: on[x.id]?.updated_by || null,
          runs: runs.filter((r) => r.bot === x.id).slice(0, 30) })),
        finder: { counts, queue: counts.pending || 0, backlogLeft, backlogTotal: (BACKLOG.companies || []).length,
          checked24h: cands.filter((c) => c.checked_at && Date.parse(c.checked_at) > day).length,
          live24h: cands.filter((c) => c.status === "live" && c.verified_at && Date.parse(c.verified_at) > day).length, recentLive },
      });
    } catch (e) { console.error("[discovery bots]", e); return res.status(500).json({ error: "Couldn't load the control room" }); }
  }
  try {
    const rows = await db.selectAll("company_candidates?select=id,company,domain,hint,status,ats,detail,intern_count,attempts,checked_at,verified_at,source&order=company.asc,id.asc");
    const counts = {};
    for (const r of rows) counts[r.status] = (counts[r.status] || 0) + 1;
    return res.status(200).json({
      handVerified: COMPANIES.filter((c) => c.enabled).map((c) => c.company),
      counts,
      rows,
    });
  } catch (e) {
    console.error("[discovery]", e);
    return res.status(500).json({ error: "Couldn't load the company list" });
  }
}
