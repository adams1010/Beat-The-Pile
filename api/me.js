// /api/me.js — everything that belongs to one signed-in student.
// (One file on purpose: Vercel's free plan allows 12 backend files and we're at the limit.)
//
//   GET  /api/me                                   → { saved, applied, resume, notes }
//   POST /api/me { list, id, on }                  → save / mark-applied toggle for a listing
//   POST /api/me { action:"resume", name, data }   → upload resume PDF (base64) → gets a private QR link
//   POST /api/me { action:"share", on }            → turn the QR link on/off
//   POST /api/me { action:"note", note }           → add/update a career-fair conversation note
//   POST /api/me { action:"note_delete", id }
//   GET  /api/me?r=<token>   (no sign-in)          → the QR target: redirects to the resume if sharing is on
//                                                    (vercel.json maps /r/<token> here)
// Requires a genuine Clerk session token (signature-checked in lib/auth.js) for everything except ?r=.
import crypto from "node:crypto";
import { verifyClerkJWT, bearer } from "../lib/auth.js";
import { db } from "../lib/db.js";

const LISTS = ["saved", "applied"];
const MAX = 500;
const MAX_NOTES = 400;
const MAX_PDF = 3 * 1024 * 1024;             // 3 MB (Vercel caps request bodies at ~4.5 MB; base64 adds 33%)
const ID_OK = /^[a-z0-9-]+:.{1,200}$/;
const TOKEN_OK = /^[A-Za-z0-9_-]{16,64}$/;
const BUCKET = "resumes";

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
  const view = (row) => ({ saved: row?.saved || [], applied: row?.applied || [], resume: publicResume(row), notes: row?.fair_notes || [] });
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
    await save({ saved: next.saved, applied: next.applied });
    return res.status(200).json({ saved: next.saved, applied: next.applied });
  } catch (e) {
    return res.status(500).json({ error: "Couldn't update your account", detail: String(e.message || e).slice(0, 160) });
  }
}
