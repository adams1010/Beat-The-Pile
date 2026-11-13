// /api/me.js — everything that belongs to one signed-in student.
// (One file on purpose: Vercel's free plan allows 12 backend files and we're at the limit.)
//
//   GET  /api/me                                   → { saved, applied, resume, notes }
//   POST /api/me { list, id, on }                  → save / mark-applied toggle for a listing
//   POST /api/me { action:"resume", name, data }   → upload resume PDF (base64) → gets a private QR link
//   POST /api/me { action:"share", on }            → turn the QR link on/off (new uploads start OFF)
//   POST /api/me { action:"rotate" }               → new QR link; the old QR/link stops working
//   POST /api/me { action:"resume_delete" }        → delete the resume file and the link
//   POST /api/me { action:"delete_all", confirm:"DELETE" } → delete EVERYTHING we store for you (your sign-in itself lives at Clerk)
//   POST /api/me { action:"note", note }           → add/update a career-fair conversation note
//   POST /api/me { action:"note_delete", id }
//   POST /api/me { action:"star", company, on }     → follow a company (fair game plan + new-job alerts)
//   POST /api/me { action:"seen" }                 → mark "new internships" as seen (jobs page)
//   POST /api/me { action:"brief", companyId }     → AI company brief (cached for everyone, 30 days)
//   POST /api/me { action:"polish", note }         → AI-written follow-up email from your notes
//   POST /api/me { action:"app", app }              → add/update an application on My Season (stage, dates)
//   POST /api/me { action:"app_delete", id }
//   POST /api/me { action:"goal", goal }            → weekly application goal
//   POST /api/me { action:"profile", profile, handle, public } → your profile (public page /u/<handle> only if public:true)
//   POST /api/me { action:"remind", on }            → email me when a follow-up is due (needs RESEND_API_KEY on the server)
//   POST /api/me { action:"alerts", on, major, states } → weekly email of new internships for that major/places (+ followed companies)
//   POST /api/me { action:"alerts_test" }          → send yourself this week's alert now (3 a day)
//   POST /api/me { action:"orbit" }               → Orbit: classmates, people at companies you follow, activity (public profiles only)
//                                                   + your connections, requests, same-fair people, unread count
//   POST /api/me { action:"orbit_connect"|"orbit_accept"|"orbit_remove", to }  → two-way Connect (to = /u/ handle or peer key)
//   POST /api/me { action:"orbit_inbox" } / { action:"orbit_thread", to } / { action:"orbit_send", to, body }  → messages
//   POST /api/me { action:"orbit_fair", fair, on }  → "going to the same fair" (opt-in)
//   POST /api/me { action:"talent", q, major, school, gradYear } → employers only: opted-in student profiles
//   GET  /api/me?u=<handle>  (no sign-in)          → a PUBLIC profile (404 unless the student turned it on)
//   GET  /api/me?unsub=<token> (no sign-in)        → one-click unsubscribe from reminder emails
//   GET  /api/me?r=<token>   (no sign-in)          → the QR target: redirects to the resume if sharing is on
//                                                    (vercel.json maps /r/<token> here)
// Requires a genuine Clerk session token (signature-checked in lib/auth.js) for everything except ?r=.
// Every write goes through lib/userdata.js mutate(): versioned, so two tabs saving at once can't erase each other.
import crypto from "node:crypto";
import { verifyClerkJWT, bearer } from "../lib/auth.js";
import { db } from "../lib/db.js";
import { callClaude, rateOk, AIError } from "../lib/aiusage.js";
import { mutate, loadRow, Conflict } from "../lib/userdata.js";
import { postedInfo } from "../lib/dates.js";
import { isAuthorizedCron } from "../lib/db.js";
import { runReminders, emailFor, sendEmail, buildEmail } from "../lib/remind.js";
import { runAlerts, cleanMajor, cleanStates, buildAlert, freshListings, matchesFor } from "../lib/alerts.js";
import { dueFollowUps } from "../lib/followups.js";
import { botOn, logRun } from "../lib/bots.js";
import { orbitFor, schoolKey, majorKey, sameSchool, sameMajor } from "../lib/orbit.js";
import { orbitExtras, orbitAction, deleteOrbitData } from "../lib/orbitnet.js";
import { bizAction, publicCompany, isVerifiedEmployer, isAdmin } from "../lib/employer.js";
import { cleanInternship, internPeers } from "../lib/internship.js";
import { foundingCount, foundingFor } from "../lib/founding.js";
import { schoolIdFor } from "../lib/schools.js";
import { talentFor, roleOf } from "../lib/talent.js";

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
  const iso = (v) => { if (v == null || v === "") return null; const d = new Date(v); return isNaN(d) ? null : d.toISOString(); };
  const id = String(a?.id || "");
  return {
    id: ID_OK.test(id) ? id : "m:" + crypto.randomUUID(),           // listing id, or m:<uuid> for one added by hand
    company: clean(a?.company, 100), title: clean(a?.title, 160),
    url: /^https?:\/\//.test(String(a?.url || "")) ? clean(a.url, 400) : null,
    stage: STAGES.includes(a?.stage) ? a.stage : "applied",
    appliedAt: iso(a?.appliedAt) || new Date().toISOString(),
    postedAt: iso(a?.postedAt),                                    // the employer's posting date (null if unknown)
    postedEstimate: a?.postedEstimate === true,                    // true = worked out from "posted N days ago"
    firstSeenAt: iso(a?.firstSeenAt),                              // when our robot first saw it on their board
    followedUpAt: iso(a?.followedUpAt),                            // student said they followed up (stops reminders)
    // Nov 12 — Tracker tab (/tracker/): the spreadsheet columns, same record as My Season
    kind: a?.kind === "fulltime" ? "fulltime" : a?.kind === "intern" ? "intern" : null,
    pay: Number.isFinite(+a?.pay) && a?.pay !== "" && a?.pay != null && +a.pay >= 0 && +a.pay <= 10000000 ? Math.round(+a.pay * 100) / 100 : null,
    payUnit: ["hour", "week", "month", "year", "total"].includes(a?.payUnit) ? a.payUnit : null,
    location: clean(a?.location, 120) || null,
    deadline: iso(a?.deadline),
    contact: clean(a?.contact, 120) || null,
    notes: clean(a?.notes, 1000) || null,
    checks: Object.fromEntries(["submitted", "interviewed", "offered", "accepted", "thankyou"].map((k) => [k, k === "submitted" ? a?.checks?.[k] !== false : a?.checks?.[k] === true])),   // an entry counts as applied unless unticked
    updatedAt: new Date().toISOString(),
  };
}
const BRIEF_DAYS = 30;
const AI_PER_HOUR = 30;                 // per student, shared across all servers (Postgres rate_take)
const aiLimited = async (uid) => !(await rateOk(`me-ai:${uid}`, 3600, AI_PER_HOUR));
const claude = (prompt, maxTokens = 700, feature = "other") => callClaude({ feature, prompt, maxTokens, temperature: 0.3 });
function parseJson(text) {
  const m = String(text).match(/\{[\s\S]*\}/);
  if (!m) throw new AIError("AI gave an unreadable answer — try again", 502);
  try { return JSON.parse(m[0]); } catch { throw new AIError("AI gave an unreadable answer — try again", 502); }
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
  const prompt = `You write short, factual company briefs for college students (any major) about to talk to a recruiter at a career fair.

Company: ${name}${domain ? `\nWebsite: ${domain}` : ""}
${titles.length ? `Internships they have open right now:\n- ${titles.join("\n- ")}` : "They have no internships posted right now."}

Reply with ONLY this JSON:
{"known": true|false, "about": "1-2 sentences: what the company does and who its customers are", "engineers": "1-2 sentences: what interns typically work on there, based on the internships listed (name the teams or kinds of work)", "ask": ["3 specific, smart questions a student could ask their recruiter"]}

Rules: be factual and plain. If you are not confident you know this specific company (common for small or local firms), set "known": false, keep "about" to what the website domain and job titles clearly show, and do not invent facts like size, revenue, or projects.`;
  const j = parseJson(await claude(prompt, 700, "brief"));
  const brief = { known: j.known !== false, about: clean(j.about, 400), engineers: clean(j.engineers, 400), ask: strArr(j.ask, 3, 200) };
  if (!brief.about) throw new AIError("AI gave an empty answer — try again", 502);
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
async function dbDelete(path) {
  const key = process.env.INTERNIQ_DB_SERVICE_KEY;
  const h = { apikey: key, Prefer: "return=minimal" }; if (!String(key).startsWith("sb_")) h.Authorization = `Bearer ${key}`;
  const r = await fetch(`${process.env.INTERNIQ_DB_URL}/rest/v1/${path}`, { method: "DELETE", headers: h });
  if (!r.ok) throw new Error(`delete ${r.status}`);
}
async function deletePdf(path) {
  const r = await fetch(storageUrl(`object/${BUCKET}/${path}`), { method: "DELETE", headers: storageHeaders() });
  if (!r.ok && r.status !== 404 && r.status !== 400) throw new Error(`storage delete ${r.status}`);
}
// QR links hand out a 2-minute signed file link, so turning sharing off (or a new link) takes effect within 2 minutes.
async function signedLink(path, seconds = 120) {
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
  const iso = (v) => { if (v == null || v === "") return null; const d = new Date(v); return isNaN(d) ? null : d.toISOString(); };
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
  return { name: row.resume_name || "resume.pdf", token: row.resume_token, share: row.resume_share === true, uploadedAt: row.resume_uploaded_at };
}

// ── Profiles ──
const HANDLE_OK = /^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/;
const RESERVED = new Set(["admin", "api", "bots", "discovery", "jobs", "fair", "season", "radar", "demo", "privacy", "edit", "me", "new", "settings", "help", "support", "beatthepile", "beat-the-pile", "staff", "team", "official", "recruiter", "employer"]);
const httpsUrl = (v) => { try { const u = new URL(String(v || "").trim()); return u.protocol === "https:" && u.hostname.includes(".") ? u.toString().slice(0, 300) : ""; } catch { return ""; } };
const txt = (v, n) => clean(v, n);
// Profile photo: a small image the browser already resized (≤ ~65 KB), stored with the profile.
// Only real JPEG/PNG/WebP bytes pass (checked by magic number, not just the label) — never SVG or anything scriptable.
const PHOTO_MAX = 90000;   // characters of base64 (~65 KB)
export function cleanPhoto(v) {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(typeof v === "string" ? v : "");
  if (!m || v.length > PHOTO_MAX) return null;
  let b; try { b = Buffer.from(m[2], "base64"); } catch { return null; }
  const magic = { jpeg: b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, png: b.slice(0, 8).toString("hex") === "89504e470d0a1a0a",
    webp: b.slice(0, 4).toString("ascii") === "RIFF" && b.slice(8, 12).toString("ascii") === "WEBP" };
  return magic[m[1]] ? v : null;
}
/** A free link name from the person's name: jordan-lee, jordan-lee-2, … (Nov 9/10). */
async function autoHandle(uid, profile) {
  const stem = (String(profile.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || (profile.staff ? "staff" : "student")).padEnd(3, "0");
  for (let i = 0; i < 40; i++) {
    const h = i ? `${stem}-${i + 1}` : stem;
    if (!HANDLE_OK.test(h) || RESERVED.has(h)) continue;
    const taken = await db.selectAsAdmin(`user_jobs?select=clerk_user_id&handle=eq.${encodeURIComponent(h)}&limit=1`);
    if (!taken[0] || taken[0].clerk_user_id === uid) return h;
  }
  return `student-${crypto.randomBytes(3).toString("hex")}`;
}
const STAFF_ROLES = ["Professor", "Lecturer or instructor", "Academic advisor", "Career center", "Department staff", "Other school staff"];
function cleanProfile(p) {
  p = p && typeof p === "object" ? p : {};
  const arr = (a, n) => (Array.isArray(a) ? a : []).slice(0, n);
  const year = Number(p.gradYear); 
  return {
    name: txt(p.name, 80), headline: txt(p.headline, 140), school: txt(p.school, 100), major: txt(p.major, 80),
    gradYear: Number.isInteger(year) && year >= 2020 && year <= 2040 ? year : null,
    gradTerm: ["Spring", "Summer", "Fall", "Winter"].includes(p.gradTerm) ? p.gradTerm : null,    // Nov 9: December grads pick Winter/Fall
    schoolId: Number.isInteger(+p.schoolId) && +p.schoolId >= 100000 && +p.schoolId <= 999999 ? +p.schoolId : schoolIdFor(p.school),   // IPEDS id (schools/index.json); typed names/aliases resolve too
    education: arr(p.education, 20).map((x) => ({ school: txt(x?.school, 100), degree: txt(x?.degree, 60), major: txt(x?.major, 80), when: txt(x?.when, 40) })).filter((x) => x.school).slice(0, 5),
    location: txt(p.location, 80), lookingFor: txt(p.lookingFor, 140), about: txt(p.about, 1200),
    skills: [...new Set(arr(p.skills, 30).map((x) => txt(x, 40)).filter(Boolean))],
    experience: arr(p.experience, 10).map((x) => ({ title: txt(x?.title, 100), org: txt(x?.org, 100), when: txt(x?.when, 40), desc: txt(x?.desc, 600) })).filter((x) => x.title || x.org),
    projects: arr(p.projects, 8).map((x) => ({ name: txt(x?.name, 100), desc: txt(x?.desc, 600), link: httpsUrl(x?.link) })).filter((x) => x.name),
    links: { linkedin: httpsUrl(p.links?.linkedin), github: httpsUrl(p.links?.github), portfolio: httpsUrl(p.links?.portfolio) },
    // Nov 10: contact on the profile — shown (clickable) to signed-in Beat the Pile users only, never to anonymous visitors
    contact: (() => { const c = p.contact || {}; const email = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,180}\.[a-z]{2,}$/i.test(String(c.email || "").trim()) ? String(c.email).trim().slice(0, 120) : null;
      const phone = /^[+()\d][\d\s().+-]{6,22}$/.test(String(c.phone || "").trim()) ? String(c.phone).trim() : null;
      return email || phone ? { email, phone, show: c.show !== false } : null; })(),
    showResume: p.showResume === true,
    openToEmployers: p.openToEmployers === true,
    openTo: (Array.isArray(p.openTo) ? p.openTo : []).filter((x) => x === "intern" || x === "fulltime").slice(0, 2),   // "Open to" badges          // "Let employers find me" (Find talent); off unless the student turns it on
    photo: cleanPhoto(p.photo),
    staff: STAFF_ROLES.includes(p.staff) ? p.staff : null,   // Nov 9: faculty & staff (professor, advisor, career center…) — shown as a tag, never in Find talent
  };
}
async function clerkUser(uid) {
  if (!process.env.CLERK_SECRET_KEY) return null;
  const r = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(uid)}`, { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } });
  return r.ok ? r.json() : null;
}
async function publicProfile(req, res) {
  const h = String(req.query.u || "").toLowerCase();
  if (!HANDLE_OK.test(h)) return res.status(404).json({ error: "No profile here" });
  const rows = await db.selectAsAdmin(`user_jobs?select=clerk_user_id,profile,handle,profile_public,resume_token,resume_share,resume_path&handle=eq.${encodeURIComponent(h)}&limit=1`);
  const r = rows[0];
  if (!r || r.profile_public !== true || !r.profile) return res.status(404).json({ error: "No profile here" });
  const p = cleanProfile(r.profile);          // re-cleaned on the way out, too
  const resume = p.showResume && r.resume_path && r.resume_share === true && r.resume_token ? `/r/${r.resume_token}` : null;
  delete p.showResume; delete p.openToEmployers;
  // Contact info only for signed-in members (keeps emails/phones away from scrapers), and only if the student shows it
  let member = false; if (p.contact && p.contact.show) { try { member = !!(await verifyClerkJWT(bearer(req))); } catch {} }
  if (!member || !p.contact || !p.contact.show) delete p.contact; else delete p.contact.show;
  res.setHeader("Cache-Control", member ? "private, no-store" : "public, max-age=60"); res.setHeader("Vary", "Authorization");
  const founding = await foundingFor(r.clerk_user_id).catch(() => null);
  return res.status(200).json({ handle: r.handle, profile: p, resume, founding });
}
async function unsubscribe(req, res) {
  const t = String(req.query.unsub || "");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const alerts = req.query.k === "alerts";
  if (TOKEN_OK.test(t)) await db.updateReturning(`user_jobs?remind_unsub=eq.${encodeURIComponent(t)}`, alerts ? { alert_on: false } : { remind_email: false });
  return res.status(200).send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed</title>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;display:grid;place-items:center;min-height:90vh;margin:0;background:#FBFBFC;color:#060A2C">
<div style="text-align:center;padding:24px"><div style="color:#4A7000;font-weight:700">Beat the Pile</div><h1 style="font-size:22px">You're unsubscribed</h1>
<p style="color:#5B6675">${alerts ? `No more weekly job alert emails. Turn them back on anytime on <a href="/jobs/" style="color:#3A5A00">Jobs</a>.` : `No more follow-up reminder emails. Turn them back on anytime in <a href="/season/" style="color:#3A5A00">My Season</a>.`}</p></div>`);
}

async function resumeRedirect(req, res) {
  const t = String(req.query?.r || "");
  const notShared = () => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(404).send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Resume not shared</title>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;display:grid;place-items:center;min-height:90vh;margin:0;background:#F8FFFE;color:#1E293B">
<div style="text-align:center;padding:24px"><div style="color:#4A7000;font-weight:800">Beat the Pile</div><h1 style="font-size:22px">This resume isn't shared right now</h1>
<p style="color:#64748B">The student turned off this link or replaced it with a new one.</p></div>`);
  };
  if (!TOKEN_OK.test(t)) return notShared();
  const rows = await db.selectAsAdmin(`user_jobs?select=resume_path,resume_share&resume_token=eq.${encodeURIComponent(t)}&limit=1`);
  const row = rows[0];
  if (!row?.resume_path || row.resume_share !== true) return notShared();
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Location", await signedLink(row.resume_path));
  return res.status(302).end();
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET" && req.query?.r !== undefined) {
    try { return await resumeRedirect(req, res); } catch { return res.status(503).send("Resume temporarily unavailable"); }
  }
  // Public company page data (/co/<slug>): verified companies only
  if (req.method === "GET" && req.query?.co !== undefined) {
    try { const c = await publicCompany(String(req.query.co || ""));
      if (!c) return res.status(404).json({ error: "No company page here" });
      res.setHeader("Cache-Control", "public, max-age=120"); return res.status(200).json(c);
    } catch { return res.status(503).json({ error: "Company pages are temporarily unavailable" }); }
  }
  // Founding members counter (homepage, /start/): real count of student sign-ups, capped at 150
  if (req.method === "GET" && req.query?.founding !== undefined) {
    try { res.setHeader("Cache-Control", "public, max-age=120"); return res.status(200).json(await foundingCount()); }
    catch { return res.status(503).json({ error: "Founding count unavailable right now" }); }
  }
  if (req.method === "GET" && req.query?.u !== undefined) {
    try { return await publicProfile(req, res); } catch { return res.status(503).json({ error: "Profiles are temporarily unavailable" }); }
  }
  if (req.query?.cron === "remind") {             // daily Vercel cron (vercel.json: /api/remind → here)
    if (!isAuthorizedCron(req)) return res.status(401).json({ error: "cron only" });
    if (!(await botOn("remind"))) { await logRun("remind", true, "Switched off"); return res.status(200).json({ off: true }); }
    try {
      const st = await runReminders();
      let al = { sent: 0, optedIn: 0 };
      try { al = await runAlerts(); } catch (e) { al = { sent: 0, optedIn: 0, failed: 1, error: String(e.message).slice(0, 80) }; }
      const ok = !st.failed && !al.failed;
      await logRun("remind", ok, st.skipped ? "Waiting for RESEND_API_KEY" : `Sent ${st.sent} reminder email${st.sent === 1 ? "" : "s"} · ${st.optedIn} opted in · ${st.due} with follow-ups due · job alerts: ${al.sent} sent, ${al.optedIn} opted in`, { ...st, alerts: al });
      return res.status(200).json({ ...st, alerts: al });
    } catch (e) { await logRun("remind", false, "Run failed: " + String(e.message).slice(0, 120)); return res.status(500).json({ error: "reminder run failed" }); }
  }
  if ((req.method === "GET" || req.method === "POST") && req.query?.unsub !== undefined) {
    try { return await unsubscribe(req, res); } catch { return res.status(503).send("Try again in a minute"); }
  }

  let uid;
  try { uid = await verifyClerkJWT(bearer(req)); }
  catch { return res.status(503).json({ error: "Sign-in check is temporarily unavailable" }); }
  if (!uid) return res.status(401).json({ error: "Not signed in" });

  const view = (row) => ({ saved: row?.saved || [], applied: row?.applied || [], resume: publicResume(row), notes: row?.fair_notes || [],
                            starred: row?.starred || [], seenAt: row?.seen_at || null, apps: row?.apps || [], goal: row?.weekly_goal ?? null,
                            profile: row?.profile || null, handle: row?.handle || null, profilePublic: row?.profile_public === true,
                            remindEmail: row?.remind_email === true,
                            alerts: row?.alert_on === true ? { major: row.alert_major || "all", states: row.alert_states || "" } : null, emailReady: !!process.env.RESEND_API_KEY,
                            internship: row?.internship || null, internshipReady: row ? "internship" in row : true });
  const send = (out) => out.error ? res.status(out.status || 400).json({ error: out.error }) : res.status(200).json(view(out.row));
  const stop = (error, status = 400) => ({ error, status });

  try {
    if (req.method === "GET") return res.status(200).json({ ...view(await loadRow(uid)), founding: await foundingFor(uid).catch(() => null) });
    if (req.method !== "POST") return res.status(405).json({ error: "GET or POST" });

    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    const action = body?.action;

    // ── Career fair: resume + QR ──
    if (action === "resume") {
      const b64 = String(body.data || "").replace(/^data:[^,]*,/, "");
      const buf = Buffer.from(b64, "base64");
      if (!buf.length) return res.status(400).json({ error: "No file received" });
      if (buf.length > MAX_PDF) return res.status(400).json({ error: "Resume must be under 3 MB" });
      if (buf.subarray(0, 5).toString() !== "%PDF-") return res.status(400).json({ error: "Please upload a PDF" });
      const path = `${uid}/resume.pdf`;
      await putPdf(path, buf);
      return send(await mutate(uid, (row) => ({
        resume_path: path, resume_name: clean(body.name, 120) || "resume.pdf",
        resume_token: row.resume_token || crypto.randomBytes(18).toString("base64url"),
        // First upload starts PRIVATE. Replacing a file keeps whatever the student already chose.
        resume_share: row.resume_path ? row.resume_share === true : false,
        resume_uploaded_at: new Date().toISOString(),
      })));
    }
    if (action === "share") {
      return send(await mutate(uid, (row) => row.resume_path ? { resume_share: body.on === true } : stop("Upload a resume first")));
    }
    if (action === "rotate") {
      return send(await mutate(uid, (row) => row.resume_path ? { resume_token: crypto.randomBytes(18).toString("base64url") } : stop("Upload a resume first")));
    }
    if (action === "resume_delete") {
      const row = await loadRow(uid);
      if (row?.resume_path) await deletePdf(row.resume_path);
      return send(await mutate(uid, () => ({ resume_path: null, resume_name: null, resume_token: null, resume_share: false, resume_uploaded_at: null })));
    }

    // ── Delete everything we store for this student (resume file, saved/applied, notes, season, homepage sync) ──
    if (action === "delete_all") {
      if (body.confirm !== "DELETE") return res.status(400).json({ error: "Confirm by sending confirm: \"DELETE\"" });
      const row = await loadRow(uid);
      if (row?.resume_path) await deletePdf(row.resume_path);
      await deleteOrbitData(uid);
      await dbDelete(`user_jobs?clerk_user_id=eq.${encodeURIComponent(uid)}`);
      await dbDelete(`user_home?clerk_user_id=eq.${encodeURIComponent(uid)}`);
      return res.status(200).json({ ok: true, deleted: true });
    }

    // ── Orbit (/orbit/): read-only, public profiles only ──
    if (action === "orbit") {
      if (!(await rateOk(`orbit:${uid}`, 60, 30))) return res.status(429).json({ error: "Slow down a little and try again" });
      return res.status(200).json(await orbitFor(uid, await loadRow(uid), orbitExtras));
    }
    // ── Orbit part 2: connect / accept / remove, messages, same fair (lib/orbitnet.js) ──
    if (typeof action === "string" && /^orbit_(connect|accept|remove|thread|send|inbox|fair|count|state|search)$/.test(action)) {
      if (!(await rateOk(`orbit-act:${uid}`, 60, 60))) return res.status(429).json({ error: "Slow down a little and try again" });
      const out = await orbitAction(uid, action, body || {}, { roleOf, rateOk });
      return res.status(out.status).json(out.body);
    }

    // ── My Internship (/internship/, lib/internship.js): for students who already have an offer ──
    if (action === "intern_save") {
      const ix = body.internship === null ? null : cleanInternship(body.internship);
      if (body.internship !== null && !ix) return res.status(400).json({ error: "Add the company first" });
      try { return send(await mutate(uid, () => ({ internship: ix }))); }
      catch (e) { if (/internship/i.test(String(e?.message))) return res.status(503).json({ error: "My Internship is still being set up. Your changes are kept on this device for now.", setup: true }); throw e; }
    }
    if (action === "intern_peers") {
      if (!(await rateOk(`intern-peers:${uid}`, 60, 20))) return res.status(429).json({ error: "Slow down a little and try again" });
      const row = await loadRow(uid);
      return res.status(200).json(await internPeers(uid, row?.internship).catch(() => ({ alumni: [], incoming: [] })));
    }

    // ── Business side (lib/employer.js): company setup, work-email code, owner review, dashboard, business Orbit ──
    if (typeof action === "string" && /^biz_(get|save|email_start|email_confirm|fairs|fair_counts|home|orbit|admin_list|admin_review)$/.test(action)) {
      if (!(await rateOk(`biz:${uid}`, 60, 60))) return res.status(429).json({ error: "Slow down a little and try again" });
      const out = await bizAction(uid, action, body || {}, { rateOk, sendEmail, clerkUser });
      return res.status(out.status).json(out.body);
    }

    // ── Find talent (/business/talent/): VERIFIED employer accounts only; students who opted in only ──
    if (action === "talent") {
      if ((await roleOf(uid)) !== "employer") return res.status(403).json({ error: "Find talent is for employer accounts." });
      if (!(await isVerifiedEmployer(uid))) return res.status(403).json({ error: "Your company is still being verified. You can search students once it's approved.", pending: true });
      if (!(await rateOk(`talent:${uid}`, 3600, 120))) return res.status(429).json({ error: "That's a lot of searches — try again in a bit" });
      const t = (v, n) => String(v ?? "").slice(0, n);
      return res.status(200).json(await talentFor({ q: t(body.q, 120), major: t(body.major, 80), school: t(body.school, 100), gradYear: Number(body.gradYear) || null }));
    }

    // ── Profile (LinkedIn-style page at /u/<handle>, private until the student turns it on) ──
    if (action === "profile") {
      const profile = cleanProfile(body.profile);
      const pub = body.public === true;
      let handle = body.handle == null || body.handle === "" ? null : String(body.handle).trim().toLowerCase();
      if (handle !== null && (!HANDLE_OK.test(handle) || RESERVED.has(handle))) return res.status(400).json({ error: "Pick a link name: 3–30 letters, numbers or dashes" });
      if (pub && !profile.name) return res.status(400).json({ error: "Add your name before making your profile public" });
      if (pub && !handle) handle = await autoHandle(uid, profile);   // Nov 10: no link name yet → make one from their name
      if (handle) {
        const taken = await db.selectAsAdmin(`user_jobs?select=clerk_user_id&handle=eq.${encodeURIComponent(handle)}&limit=1`);
        if (taken[0] && taken[0].clerk_user_id !== uid) return res.status(409).json({ error: "That link name is taken — try another" });
      }
      try { return send(await mutate(uid, () => ({ profile, handle, profile_public: pub }))); }
      catch (e) { if (/23505|duplicate key/i.test(String(e?.message))) return res.status(409).json({ error: "That link name is taken — try another" }); throw e; }
    }
    // Sign-up step 3 (Nov 9): name, school, major, graduation — and "show me to students at my school" (checked by default,
    // in plain words on the screen). Keeps everything else already on the profile; picks a link name if there isn't one.
    if (action === "admin_orbit_why") {       // owners only (Nov 9): why isn't <name> in my orbit? Facts only — no ids, no emails
      if (!(await isAdmin(uid, { clerkUser }))) return res.status(403).json({ error: "Owners only" });
      const q = String(body.q || "").trim().toLowerCase(); if (q.length < 2) return res.status(400).json({ error: "Type a name" });
      const mine = (await loadRow(uid))?.profile || {};
      const rows = await db.selectAllAsAdmin("user_jobs?select=clerk_user_id,handle,profile,profile_public&profile=not.is.null&order=clerk_user_id.asc");
      const hits = rows.filter((r) => r.clerk_user_id !== uid && [r.profile?.name, r.handle].some((x) => String(x || "").toLowerCase().includes(q))).slice(0, 10)
        .map((r) => { const p = r.profile || {}; return { name: p.name || null, handle: r.handle || null, isPublic: r.profile_public === true, school: p.school || null, schoolId: p.schoolId || null,
          schoolKey: schoolKey(p.school) || null, major: p.major || null, majorKey: majorKey(p.major) || null, sameSchool: sameSchool(mine, p), sameMajor: sameMajor(mine.major, p.major) }; });
      const have = new Set(rows.filter((r) => [r.profile?.name, r.handle].some((x) => String(x || "").toLowerCase().includes(q))).map((r) => r.clerk_user_id));
      let kitOnly = 0;
      try { kitOnly = (await db.selectAllAsAdmin("user_home?select=clerk_user_id,profile&order=clerk_user_id.asc")).filter((r) => !have.has(r.clerk_user_id) && String(r.profile?.name || "").toLowerCase().includes(q)).length; } catch {}
      return res.status(200).json({ kitOnly, me: { school: mine.school || null, schoolId: mine.schoolId || null, schoolKey: schoolKey(mine.school) || null, major: mine.major || null, majorKey: majorKey(mine.major) || null }, hits });
    }
    if (action === "onboard") {
      const cur = await loadRow(uid);
      const base = cur?.profile && typeof cur.profile === "object" ? cur.profile : {};
      const pick = (k) => (body[k] !== undefined && body[k] !== null && body[k] !== "" ? body[k] : base[k]);
      const profile = cleanProfile({ ...base, name: pick("name"), school: pick("school"), schoolId: body.school !== undefined ? body.schoolId : base.schoolId,
        major: pick("major"), gradYear: body.staff ? null : pick("gradYear"), gradTerm: body.staff ? null : pick("gradTerm"), staff: body.staff !== undefined ? body.staff : base.staff });
      if (!profile.name) return res.status(400).json({ error: "Add your name" });
      if (!profile.school) return res.status(400).json({ error: "Pick your school" });
      const handle = cur?.handle || (await autoHandle(uid, profile));
      // Nov 10: public by default — only an explicit "no" (show:false) keeps a profile private
      const pub = body.show === false ? false : body.show === true ? true : cur?.handle ? cur?.profile_public === true : true;
      try { return send(await mutate(uid, () => ({ profile, handle, profile_public: pub }))); }
      catch (e) { if (/23505|duplicate key/i.test(String(e?.message))) return res.status(409).json({ error: "Try again in a moment" }); throw e; }
    }
    if (action === "remind_test") {            // send yourself one sample reminder (3 a day)
      if (!process.env.RESEND_API_KEY) return res.status(400).json({ error: "Email reminders aren't switched on yet" });
      if (!(await rateOk(`remind-test:${uid}`, 86400, 3))) return res.status(429).json({ error: "That's enough test emails for today" });
      const row = await mutate(uid, (r) => ({ remind_unsub: r.remind_unsub || crypto.randomBytes(18).toString("base64url") }));
      const to = await emailFor(uid);
      if (!to) return res.status(400).json({ error: "Your account has no verified email address" });
      const due = dueFollowUps(row.row.apps);
      const sample = due.length ? due : [{ company: "Example Company", title: "Example — Summer Intern", appliedAt: new Date(Date.now() - 6 * 864e5).toISOString() }];
      const mail = buildEmail(sample, row.row.remind_unsub);
      if (!due.length) mail.subject = "Test: this is what a follow-up reminder looks like";
      await sendEmail(to, mail);
      return res.status(200).json({ ok: true, to: to.replace(/^(.).*(@.*)$/, "$1…$2") });
    }
    if (action === "alerts") {                  // weekly new-internship email for one major + places
      const on = body.on === true;
      if (on && !process.env.RESEND_API_KEY) return res.status(400).json({ error: "Email alerts aren't switched on yet — check back soon" });
      return send(await mutate(uid, (row) => ({ alert_on: on, ...(on ? { alert_major: cleanMajor(body.major), alert_states: cleanStates(body.states) || null } : {}),
        remind_unsub: row.remind_unsub || crypto.randomBytes(18).toString("base64url") })));
    }
    if (action === "alerts_test") {             // this week's alert, now, to yourself (3 a day)
      if (!process.env.RESEND_API_KEY) return res.status(400).json({ error: "Email alerts aren't switched on yet" });
      if (!(await rateOk(`alerts-test:${uid}`, 86400, 3))) return res.status(429).json({ error: "That's enough test emails for today" });
      const row = (await mutate(uid, (r) => ({ remind_unsub: r.remind_unsub || crypto.randomBytes(18).toString("base64url") }))).row;
      if (!row.alert_on) return res.status(400).json({ error: "Turn on job alerts first" });
      const to = await emailFor(uid);
      if (!to) return res.status(400).json({ error: "Your account has no verified email address" });
      const m = matchesFor({ ...row, alert_last_sent: null }, await freshListings());
      if (!m.length) return res.status(200).json({ ok: true, none: true });
      await sendEmail(to, buildAlert(row, m, row.remind_unsub));
      return res.status(200).json({ ok: true, count: m.length, to: to.replace(/^(.).*(@.*)$/, "$1…$2") });
    }
    if (action === "remind") {
      const on = body.on === true;
      if (on && !process.env.RESEND_API_KEY) return res.status(400).json({ error: "Email reminders aren't switched on yet — check back soon" });
      return send(await mutate(uid, (row) => ({ remind_email: on, remind_unsub: row.remind_unsub || crypto.randomBytes(18).toString("base64url") })));
    }

    // ── Follow companies (fair game plan + alerts) ──
    if (action === "star") {
      const co = String(body.company || "");
      if (!CO_OK.test(co)) return res.status(400).json({ error: "Bad company" });
      return send(await mutate(uid, (row) => {
        const set = new Set(row.starred || []);
        if (body.on === true) set.add(co); else set.delete(co);
        if (set.size > MAX_STARS) return stop(`You can follow up to ${MAX_STARS} companies`);
        return { starred: [...set] };
      }));
    }
    if (action === "seen") {
      await mutate(uid, () => ({ seen_at: new Date().toISOString() }));
      return res.status(200).json({ ok: true });
    }

    // ── My Season: applications pipeline + weekly goal ──
    if (action === "app" || action === "app_delete") {
      const incoming = action === "app" ? cleanApp(body.app) : null;
      if (incoming && !incoming.company) return res.status(400).json({ error: "Which company?" });
      return send(await mutate(uid, (row) => {
        let apps = Array.isArray(row.apps) ? row.apps.slice() : [];
        if (action === "app_delete") apps = apps.filter((a) => a.id !== body.id);
        else {
          const i = apps.findIndex((x) => x.id === incoming.id);
          if (i >= 0) apps[i] = { ...apps[i], ...incoming, appliedAt: body.app?.appliedAt ? incoming.appliedAt : apps[i].appliedAt,
                                  postedAt: incoming.postedAt || apps[i].postedAt, firstSeenAt: incoming.firstSeenAt || apps[i].firstSeenAt,
                                  postedEstimate: incoming.postedAt ? incoming.postedEstimate : apps[i].postedEstimate,
                                  followedUpAt: body.app && "followedUpAt" in body.app ? incoming.followedUpAt : apps[i].followedUpAt || null };
          else apps.unshift(incoming);
          if (apps.length > MAX_APPS) return stop(`Up to ${MAX_APPS} applications`);
        }
        // keep the jobs page's "Applied" marks in step with the pipeline
        const applied = new Set(row.applied || []);
        if (action === "app_delete" && ID_OK.test(String(body.id)) && !/^[mh]:/.test(String(body.id))) applied.delete(body.id);
        for (const a of apps) if (!/^[mh]:/.test(a.id)) applied.add(a.id);
        return { apps, applied: [...applied] };
      }));
    }
    if (action === "goal") {
      const g = Math.round(Number(body.goal));
      if (!(g >= 1 && g <= 50)) return res.status(400).json({ error: "Pick a goal between 1 and 50" });
      return send(await mutate(uid, () => ({ weekly_goal: g })));
    }

    // ── AI helpers ──
    if (action === "brief") {
      const co = String(body.companyId || "");
      if (!CO_OK.test(co)) return res.status(400).json({ error: "Bad company" });
      const cached = await db.selectAsAdmin(`company_briefs?select=brief&company_id=eq.${encodeURIComponent(co)}&created_at=gt.${new Date(Date.now() - BRIEF_DAYS * 864e5).toISOString()}&limit=1`);
      if (cached[0]) return res.status(200).json({ brief: cached[0].brief });
      if (await aiLimited(uid)) return res.status(429).json({ error: "That's a lot of AI requests — try again in a bit" });
      const brief = await companyBrief(co);
      if (!brief) return res.status(404).json({ error: "We don't have that company yet" });
      return res.status(200).json({ brief });
    }
    if (action === "polish") {
      const n = cleanNote(body.note);
      if (!n.company) return res.status(400).json({ error: "Which company was it?" });
      if (await aiLimited(uid)) return res.status(429).json({ error: "Too many requests — try again in a bit" });
      const me = clean(body.name, 80) || "[Your name]", link = clean(body.resumeLink, 200);
      const prompt = `Write a short follow-up email from a college student to a recruiter they just met at a career fair.

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
    if (action === "note" || action === "note_delete") {
      const incoming = action === "note" ? cleanNote(body.note) : null;
      if (incoming && !incoming.company) return res.status(400).json({ error: "Which company was it?" });
      return send(await mutate(uid, (row) => {
        let notes = Array.isArray(row.fair_notes) ? row.fair_notes.slice() : [];
        if (action === "note_delete") notes = notes.filter((n) => n.id !== body.id);
        else {
          const i = notes.findIndex((x) => x.id === incoming.id);
          if (i >= 0) notes[i] = incoming; else notes.unshift(incoming);
          if (notes.length > MAX_NOTES) return stop(`Notes are full (${MAX_NOTES})`);
        }
        return { fair_notes: notes };
      }));
    }

    // ── Save / applied toggles (jobs page) ──
    const list = body?.list, id = String(body?.id || ""), on = body?.on === true;
    if (!LISTS.includes(list) || !ID_OK.test(id)) return res.status(400).json({ error: "Bad request" });
    let listing = null;
    if (list === "applied" && on) listing = (await db.selectAsAdmin(`listings?select=company,title,url,first_seen,posted_on&id=eq.${encodeURIComponent(id)}&limit=1`))[0] || null;
    const out = await mutate(uid, (row) => {
      const set = new Set(row[list] || []);
      if (on) set.add(id); else set.delete(id);
      if (set.size > MAX) return stop(`List is full (${MAX})`);
      const patch = { [list]: [...set] };              // only the list that changed — never rewrite the other one
      if (list === "applied") {
        let apps = Array.isArray(row.apps) ? row.apps.slice() : [];
        if (on && listing && !apps.some((a) => a.id === id)) {
          const p = postedInfo(listing.posted_on, listing.first_seen);
          apps.unshift(cleanApp({ id, company: listing.company, title: listing.title, url: listing.url,
                                  postedAt: p?.date || null, postedEstimate: !!p?.estimate, firstSeenAt: listing.first_seen }));
        }
        if (!on) apps = apps.filter((a) => !(a.id === id && a.stage === "applied"));   // un-marking only undoes a plain "applied"
        patch.apps = apps;
      }
      return patch;
    });
    if (out.error) return res.status(out.status || 400).json({ error: out.error });
    return res.status(200).json({ saved: out.row.saved || [], applied: out.row.applied || [] });
  } catch (e) {
    if (e instanceof AIError) return res.status(e.status).json({ error: e.message });
    if (e instanceof Conflict) return res.status(409).json({ error: e.message });
    console.error("[me]", e);
    return res.status(500).json({ error: "Couldn't update your account — try again" });
  }
}
