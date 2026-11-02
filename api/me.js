// /api/me.js — everything that belongs to one signed-in student.
// (One file on purpose: Vercel's free plan allows 12 backend files and we're at the limit.)
//
//   GET  /api/me                                   → { saved, applied, resume, notes }
//   POST /api/me { list, id, on }                  → save / mark-applied toggle for a listing
//   POST /api/me { action:"resume", name, data }   → upload resume PDF (base64) → gets a private QR link
//   POST /api/me { action:"share", on }            → turn the QR link on/off
//   POST /api/me { action:"note", note }           → add/update a career-fair conversation note
//   POST /api/me { action:"note_delete", id }
//   POST /api/me { action:"star", company, on }     → follow a company (fair game plan + new-job alerts)
//   POST /api/me { action:"seen" }                 → mark "new internships" as seen (jobs page)
//   POST /api/me { action:"brief", companyId }     → AI company brief (cached for everyone, 30 days)
//   POST /api/me { action:"polish", note }         → AI-written follow-up email from your notes
//   POST /api/me { action:"app", app }              → add/update an application on My Season (stage, dates)
//   POST /api/me { action:"app_delete", id }
//   POST /api/me { action:"goal", goal }            → weekly application goal
//   GET  /api/me?r=<token>   (no sign-in)          → the QR target: redirects to the resume if sharing is on
//                                                    (vercel.json maps /r/<token> here)
// Requires a genuine Clerk session token (signature-checked in lib/auth.js) for everything except ?r=.
import crypto from "node:crypto";
import { verifyClerkJWT, bearer } from "../lib/auth.js";
import { db } from "../lib/db.js";
import { aiAllowed, logAI, MODEL } from "../lib/aiusage.js";

const LISTS = ["saved", "applied"];
const MAX = 500;
const MAX_NOTES = 400;
const MAX_PDF = 3 * 1024 * 1024;             // 3 MB (Vercel caps request bodies at ~4.5 MB; base64 adds 33%)
const ID_OK = /^[a-z0-9-]+:.{1,200}$/;
const TOKEN_OK = /^[A-Za-z0-9_-]{16,64}$/;
const BUCKET = "resumes";
const CO_OK = /^[a-z0-9-]{1,80}$/;
const MAX_STARS = 300;
const MAX_APPS = 500;
const STAGES = ["applied", "interview", "offer", "rejected"];
function cleanApp(a) {
  const iso = (v) => { const d = new Date(v); return isNaN(d) ? null : d.toISOString(); };
  const id = String(a?.id || "");
  return {
    id: ID_OK.test(id) ? id : "m:" + crypto.randomUUID(),           // listing id, or m:<uuid> for one added by hand
    company: clean(a?.company, 100), title: clean(a?.title, 160),
    url: /^https?:\/\//.test(String(a?.url || "")) ? clean(a.url, 400) : null,
    stage: STAGES.includes(a?.stage) ? a.stage : "applied",
    appliedAt: iso(a?.appliedAt) || new Date().toISOString(),
    postedAt: iso(a?.postedAt),
    updatedAt: new Date().toISOString(),
  };
}
const BRIEF_DAYS = 30;
const AI_PER_HOUR = 30;
const aiHits = new Map();               // uid -> [timestamps] (per server instance)
function aiLimited(uid) {
  const now = Date.now(), list = (aiHits.get(uid) || []).filter((t) => now - t < 36e5);
  list.push(now); aiHits.set(uid, list); if (aiHits.size > 5000) aiHits.clear();
  return list.length > AI_PER_HOUR;
}
async function claude(prompt, max_tokens = 700, feature = "other") {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("AI is not configured");
  if (!(await aiAllowed())) throw new Error("AI features are paused for the rest of the month");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens, temperature: 0.3, messages: [{ role: "user", content: prompt }] }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error("AI is busy — try again in a minute");
  await logAI(feature, MODEL, d.usage);
  return (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
}
function parseJson(text) {
  const m = String(text).match(/\{[\s\S]*\}/);
  if (!m) throw new Error("AI gave an unreadable answer — try again");
  return JSON.parse(m[0]);
}
const strArr = (a, n, len) => (Array.isArray(a) ? a : []).map((x) => clean(x, len)).filter(Boolean).slice(0, n);

async function companyBrief(companyId) {
  const cached = await db.selectAsAdmin(`company_briefs?select=brief,created_at&company_id=eq.${encodeURIComponent(companyId)}&limit=1`);
  if (cached[0] && Date.now() - new Date(cached[0].created_at) < BRIEF_DAYS * 864e5) return { ...cached[0].brief, cached: true };
  const [cand, jobs] = await Promise.all([
    db.selectAsAdmin(`company_candidates?select=company,domain&id=eq.${encodeURIComponent(companyId)}&limit=1`),
    db.selectAsAdmin(`listings?select=company,title,location&company_id=eq.${encodeURIComponent(companyId)}&limit=20`),
  ]);
  const name = cand[0]?.company || jobs[0]?.company;
  if (!name) return null;
  const domain = cand[0]?.domain || "";
  const titles = [...new Set(jobs.map((j) => j.title))].slice(0, 12);
  const prompt = `You write short, factual company briefs for engineering students about to talk to a recruiter at a career fair.

Company: ${name}${domain ? `\nWebsite: ${domain}` : ""}
${titles.length ? `Internships they have open right now:\n- ${titles.join("\n- ")}` : "They have no internships posted right now."}

Reply with ONLY this JSON:
{"known": true|false, "about": "1-2 sentences: what the company does and who its customers are", "engineers": "1-2 sentences: what engineers (especially mechanical) typically work on there", "ask": ["3 specific, smart questions a student could ask their recruiter"]}

Rules: be factual and plain. If you are not confident you know this specific company (common for small or local firms), set "known": false, keep "about" to what the website domain and job titles clearly show, and do not invent facts like size, revenue, or projects.`;
  const j = parseJson(await claude(prompt, 700, "brief"));
  const brief = { known: j.known !== false, about: clean(j.about, 400), engineers: clean(j.engineers, 400), ask: strArr(j.ask, 3, 200) };
  if (!brief.about) throw new Error("AI gave an empty answer — try again");
  await db.upsert("company_briefs", [{ company_id: companyId, brief, created_at: new Date().toISOString() }], "company_id");
  return brief;
}

// ── Supabase Storage (private bucket; files are only ever handed out as short-lived signed links) ──
function storageHeaders(extra = {}) {
  const key = process.env.INTERNIQ_DB_SERVICE_KEY;
  const h = { apikey: key, ...extra };
  if (!String(key).startsWith("sb_")) h.Authorization = `Bearer ${key}`;
  return h;
}
const storageUrl = (p) => `${process.env.INTERNIQ_DB_URL}/storage/v1/${p}`;

async function putPdf(path, buf) {
  const r = await fetch(storageUrl(`object/${BUCKET}/${path}`), {
    method: "POST", headers: storageHeaders({ "Content-Type": "application/pdf", "x-upsert": "true", "Cache-Control": "no-store" }), body: buf,
  });
  if (!r.ok) throw new Error(`storage upload ${r.status}: ${(await r.text()).slice(0, 160)}`);
}
async function signedLink(path, seconds = 600) {
  const r = await fetch(storageUrl(`object/sign/${BUCKET}/${path}`), {
    method: "POST", headers: storageHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ expiresIn: seconds }),
  });
  if (!r.ok) throw new Error(`storage sign ${r.status}`);
  const d = await r.json();
  const rel = d.signedURL || d.signedUrl;
  return rel.startsWith("http") ? rel : storageUrl(rel.replace(/^\/+/, ""));
}

const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
function cleanNote(n) {
  const iso = (v) => { const d = new Date(v); return isNaN(d) ? null : d.toISOString(); };
  return {
    id: /^[a-z0-9-]{6,40}$/i.test(n?.id || "") ? n.id : crypto.randomUUID(),
    company: clean(n?.company, 100),
    companyId: clean(n?.companyId, 80) || null,
    fair: clean(n?.fair, 80) || null,
    contact: clean(n?.contact, 100),
    contactEmail: clean(n?.contactEmail, 120),
    said: clean(n?.said, 2000),
    feel: ["great", "good", "meh"].includes(n?.feel) ? n.feel : "good",
    roles: clean(n?.roles, 200),
    talkedAt: iso(n?.talkedAt) || new Date().toISOString(),
    followUpAt: iso(n?.followUpAt),
    done: n?.done === true,
  };
}

function publicResume(row) {
  if (!row?.resume_path) return null;
  return { name: row.resume_name || "resume.pdf", token: row.resume_token, share: row.resume_share !== false, uploadedAt: row.resume_uploaded_at };
}

async function resumeRedirect(req, res) {
  const t = String(req.query?.r || "");
  const notShared = () => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(404).send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Resume not shared</title>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;display:grid;place-items:center;min-height:90vh;margin:0;background:#F8FFFE;color:#1E293B">
<div style="text-align:center;padding:24px"><div style="color:#00C285;font-weight:800">InternIQ</div><h1 style="font-size:22px">This resume isn't shared right now</h1>
<p style="color:#64748B">The student turned off their QR link.</p></div>`);
  };
  if (!TOKEN_OK.test(t)) return notShared();
  const rows = await db.selectAsAdmin(`user_jobs?select=resume_path,resume_share&resume_token=eq.${encodeURIComponent(t)}&limit=1`);
  const row = rows[0];
  if (!row?.resume_path || row.resume_share === false) return notShared();
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Location", await signedLink(row.resume_path));
  return res.status(302).end();
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET" && req.query?.r !== undefined) {
    try { return await resumeRedirect(req, res); } catch { return res.status(503).send("Resume temporarily unavailable"); }
  }

  let uid;
  try { uid = await verifyClerkJWT(bearer(req)); }
  catch { return res.status(503).json({ error: "Sign-in check is temporarily unavailable" }); }
  if (!uid) return res.status(401).json({ error: "Not signed in" });

  const load = async () => {
    const rows = await db.selectAsAdmin(`user_jobs?select=*&clerk_user_id=eq.${encodeURIComponent(uid)}&limit=1`);
    return rows[0] || null;
  };
  const view = (row) => ({ saved: row?.saved || [], applied: row?.applied || [], resume: publicResume(row), notes: row?.fair_notes || [],
                            starred: row?.starred || [], seenAt: row?.seen_at || null, apps: row?.apps || [], goal: row?.weekly_goal ?? null });
  const save = (patch) => db.upsert("user_jobs", [{ clerk_user_id: uid, ...patch, updated_at: new Date().toISOString() }], "clerk_user_id");

  try {
    if (req.method === "GET") return res.status(200).json(view(await load()));
    if (req.method !== "POST") return res.status(405).json({ error: "GET or POST" });

    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    const row = await load();

    // ── Career fair: resume + QR ──
    if (body?.action === "resume") {
      const b64 = String(body.data || "").replace(/^data:[^,]*,/, "");
      const buf = Buffer.from(b64, "base64");
      if (!buf.length) return res.status(400).json({ error: "No file received" });
      if (buf.length > MAX_PDF) return res.status(400).json({ error: "Resume must be under 3 MB" });
      if (buf.subarray(0, 5).toString() !== "%PDF-") return res.status(400).json({ error: "Please upload a PDF" });
      const path = `${uid}/resume.pdf`;
      await putPdf(path, buf);
      const token = row?.resume_token || crypto.randomBytes(18).toString("base64url");
      const patch = { resume_path: path, resume_name: clean(body.name, 120) || "resume.pdf", resume_token: token,
                      resume_share: row?.resume_share ?? true, resume_uploaded_at: new Date().toISOString() };
      await save(patch);
      return res.status(200).json(view({ ...row, ...patch }));
    }
    if (body?.action === "share") {
      if (!row?.resume_path) return res.status(400).json({ error: "Upload a resume first" });
      await save({ resume_share: body.on === true });
      return res.status(200).json(view({ ...row, resume_share: body.on === true }));
    }

    // ── Follow companies (fair game plan + alerts) ──
    if (body?.action === "star") {
      const co = String(body.company || "");
      if (!CO_OK.test(co)) return res.status(400).json({ error: "Bad company" });
      const set = new Set(row?.starred || []);
      if (body.on === true) set.add(co); else set.delete(co);
      if (set.size > MAX_STARS) return res.status(400).json({ error: `You can follow up to ${MAX_STARS} companies` });
      await save({ starred: [...set] });
      return res.status(200).json(view({ ...row, starred: [...set] }));
    }
    if (body?.action === "seen") {
      await save({ seen_at: new Date().toISOString() });
      return res.status(200).json({ ok: true });
    }

    // ── My Season: applications pipeline + weekly goal ──
    if (body?.action === "app" || body?.action === "app_delete") {
      let apps = Array.isArray(row?.apps) ? row.apps : [];
      if (body.action === "app_delete") apps = apps.filter((a) => a.id !== body.id);
      else {
        const a = cleanApp(body.app);
        if (!a.company) return res.status(400).json({ error: "Which company?" });
        const i = apps.findIndex((x) => x.id === a.id);
        if (i >= 0) apps[i] = { ...apps[i], ...a, appliedAt: body.app?.appliedAt ? a.appliedAt : apps[i].appliedAt, postedAt: a.postedAt || apps[i].postedAt };
        else apps.unshift(a);
        if (apps.length > MAX_APPS) return res.status(400).json({ error: `Up to ${MAX_APPS} applications` });
      }
      // keep the jobs page's "Applied" marks in step with the pipeline
      const applied = new Set(row?.applied || []);
      if (body.action === "app_delete" && ID_OK.test(String(body.id)) && !String(body.id).startsWith("m:")) applied.delete(body.id);
      for (const a of apps) if (!a.id.startsWith("m:")) applied.add(a.id);
      await save({ apps, applied: [...applied] });
      return res.status(200).json(view({ ...row, apps, applied: [...applied] }));
    }
    if (body?.action === "goal") {
      const g = Math.round(Number(body.goal));
      if (!(g >= 1 && g <= 50)) return res.status(400).json({ error: "Pick a goal between 1 and 50" });
      await save({ weekly_goal: g });
      return res.status(200).json(view({ ...row, weekly_goal: g }));
    }

    // ── AI helpers ──
    if (body?.action === "brief") {
      const co = String(body.companyId || "");
      if (!CO_OK.test(co)) return res.status(400).json({ error: "Bad company" });
      const cached = await db.selectAsAdmin(`company_briefs?select=brief&company_id=eq.${encodeURIComponent(co)}&created_at=gt.${new Date(Date.now() - BRIEF_DAYS * 864e5).toISOString()}&limit=1`);
      if (cached[0]) return res.status(200).json({ brief: cached[0].brief });
      if (aiLimited(uid)) return res.status(429).json({ error: "That's a lot of briefs — try again in a bit" });
      const brief = await companyBrief(co);
      if (!brief) return res.status(404).json({ error: "We don't have that company yet" });
      return res.status(200).json({ brief });
    }
    if (body?.action === "polish") {
      const n = cleanNote(body.note);
      if (!n.company) return res.status(400).json({ error: "Which company was it?" });
      if (aiLimited(uid)) return res.status(429).json({ error: "Too many requests — try again in a bit" });
      const me = clean(body.name, 80) || "[Your name]", link = clean(body.resumeLink, 200);
      const prompt = `Write a short follow-up email from a college engineering student to a recruiter they just met at a career fair.

Student: ${me}
Company: ${n.company}
Recruiter: ${n.contact || "(name not noted)"}
Fair: ${n.fair || "a career fair"}
Roles discussed: ${n.roles || "(not noted)"}
Student's notes from the conversation: ${n.said || "(none)"}
${link ? `Resume link to include: ${link}` : "Say the resume is attached."}

Rules: under 130 words. Warm but professional, not over the top. Mention one or two specific things from the notes so the recruiter remembers them. Never invent details that aren't in the notes. Don't claim the student already applied unless the notes say so. Refer to "the fair" instead of saying "today" or "yesterday". Sign off with the student's name.
Reply with ONLY this JSON: {"subject": "...", "body": "..."}`;
      const j = parseJson(await claude(prompt, 600, "followup_email"));
      return res.status(200).json({ subject: clean(j.subject, 160), body: String(j.body || "").slice(0, 2000) });
    }

    // ── Career fair: conversation notes ──
    if (body?.action === "note" || body?.action === "note_delete") {
      let notes = Array.isArray(row?.fair_notes) ? row.fair_notes : [];
      if (body.action === "note_delete") notes = notes.filter((n) => n.id !== body.id);
      else {
        const n = cleanNote(body.note);
        if (!n.company) return res.status(400).json({ error: "Which company was it?" });
        const i = notes.findIndex((x) => x.id === n.id);
        if (i >= 0) notes[i] = n; else notes.unshift(n);
        if (notes.length > MAX_NOTES) return res.status(400).json({ error: `Notes are full (${MAX_NOTES})` });
      }
      await save({ fair_notes: notes });
      return res.status(200).json(view({ ...row, fair_notes: notes }));
    }

    // ── Save / applied toggles (jobs page) ──
    const list = body?.list, id = String(body?.id || ""), on = body?.on === true;
    if (!LISTS.includes(list) || !ID_OK.test(id)) return res.status(400).json({ error: "Bad request" });
    const set = new Set(row?.[list] || []);
    if (on) set.add(id); else set.delete(id);
    if (set.size > MAX) return res.status(400).json({ error: `List is full (${MAX})` });
    const next = { saved: row?.saved || [], applied: row?.applied || [], [list]: [...set] };
    let apps = Array.isArray(row?.apps) ? row.apps : null;
    if (list === "applied") {
      apps = apps || [];
      if (on && !apps.some((a) => a.id === id)) {
        const l = (await db.selectAsAdmin(`listings?select=company,title,url,first_seen&id=eq.${encodeURIComponent(id)}&limit=1`))[0];
        if (l) apps.unshift(cleanApp({ id, company: l.company, title: l.title, url: l.url, postedAt: l.first_seen }));
      }
      if (!on) apps = apps.filter((a) => !(a.id === id && a.stage === "applied"));   // un-marking only undoes a plain "applied"
    }
    await save({ saved: next.saved, applied: next.applied, ...(apps ? { apps } : {}) });
    return res.status(200).json({ saved: next.saved, applied: next.applied });
  } catch (e) {
    return res.status(500).json({ error: "Couldn't update your account", detail: String(e.message || e).slice(0, 160) });
  }
}
