// /api/community.js — the homepage's student tips wall. Lives in the main database (community_posts / _replies).
//
// Nothing goes public until it's reviewed. Every post and reply starts "pending":
//   - the AI moderator approves it, or hides it with a reason;
//   - if the AI is unavailable, over budget, or gives an unreadable answer, it STAYS pending for the owner to review
//     (it never slips through).
// Rate limits are durable and shared across servers (Postgres rate_take). Anyone can report a post; 3 reports hide it
// until the owner looks. Only id, content, display_name, category and created_at are ever public.
//
// Routes:
//   GET  /api/community                              → approved posts with reply counts
//   GET  /api/community?action=replies&post_id=N     → approved replies for one post
//   POST /api/community                              → new post        { content, category?, display_name? }
//   POST /api/community?action=reply                 → new reply       { post_id, content, display_name? }
//   POST /api/community?action=report                → report          { kind:"post"|"reply", id }
//   POST /api/community?action=owner_delete          → delete own post  { id, token }
//   POST /api/community?action=owner_delete_reply    → delete own reply { id, token }
//   POST /api/community?action=admin_list            → owner: everything incl. pending/hidden (Clerk admin sign-in)
//   POST /api/community?action=admin_review          → owner: { kind, id, status:"approved"|"hidden" }
//   POST /api/community?action=delete                → owner: delete a post (replies cascade)
import crypto from "node:crypto";
import { db } from "../lib/db.js";
import { callClaude, rateOk, AIError } from "../lib/aiusage.js";
import { verifyClerkJWT, bearer } from "../lib/auth.js";

const MAX_POST_CHARS = 600, MAX_REPLY_CHARS = 400, MIN_CHARS = 4, MAX_NAME_CHARS = 30;
const HIDE_AFTER_REPORTS = 3;
const PUBLIC_POST = "id,content,display_name,category,created_at";
const ADMINS = (process.env.ADMIN_EMAILS || "shiloniadam10@gmail.com,mdxp21@gmail.com").toLowerCase().split(/[,\s]+/).filter(Boolean);

const clip = (v, n) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, n);
const cleanName = (raw) => { const c = clip(raw, MAX_NAME_CHARS); return c.length ? c : null; };
const genToken = () => crypto.randomBytes(18).toString("base64url");
const idOk = (v) => /^\d{1,15}$/.test(String(v ?? ""));
const ipOf = (req) => String(req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "unknown").split(",")[0].trim();
const sameToken = (a, b) => { const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || "")); return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y); };

/** → { status: "approved" | "hidden" | "pending", note } — "pending" whenever the AI can't give a clear answer. */
export async function moderate(content) {
  const prompt = `You are a content moderator for a college student community wall. Decide if the following content should be HIDDEN from a public student-facing feed.

HIDE if it contains:
- Hate speech, slurs, or targeted harassment
- Sexually explicit content
- Threats of violence or self-harm
- Doxxing (real names, addresses, phone numbers or emails of specific people)
- Spam (URLs to commercial sites, crypto schemes, "make money fast")
- Promoting illegal activity

DO NOT HIDE for:
- Frustration, venting, strong opinions about employers/internships
- Casual swearing — students vent and that's fine
- Disagreement, debate, criticism of companies or schools
- Personal struggles
- Normal advice-seeking

CONTENT:
"""
${content}
"""

Respond with ONLY a JSON object: {"hide": true_or_false, "reason": "brief one-phrase reason if hiding, empty string if not"}`;
  try {
    const text = await callClaude({ feature: "moderation", prompt, maxTokens: 120, temperature: 0 });
    const m = text.match(/\{[\s\S]*\}/);
    const j = m ? JSON.parse(m[0]) : null;
    if (j?.hide === true) return { status: "hidden", note: clip(j.reason || "moderation flagged", 120) };
    if (j?.hide === false) return { status: "approved", note: null };
    return { status: "pending", note: "AI answer unclear — waiting for review" };
  } catch (e) {
    return { status: "pending", note: e instanceof AIError ? `AI unavailable (${e.message}) — waiting for review` : "AI error — waiting for review" };
  }
}

async function isAdmin(req) {
  const uid = await verifyClerkJWT(bearer(req)).catch(() => null);
  if (!uid) return false;
  const r = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(uid)}`, { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } });
  if (!r.ok) return false;
  const u = await r.json();
  return (u.email_addresses || []).some((e) => e.verification?.status === "verified" && ADMINS.includes(String(e.email_address).toLowerCase()));
}

const visibleMsg = (status) => status === "approved" ? null
  : status === "hidden" ? "Your post was hidden by our filter. If you think that's a mistake, use Report a problem."
  : "Thanks! Your post is waiting for a quick review before it shows up.";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") {
      if (req.query?.action === "replies") {
        if (!idOk(req.query.post_id)) return res.status(400).json({ error: "Missing post_id" });
        const replies = await db.selectAsAdmin(`community_replies?select=id,post_id,content,display_name,created_at&post_id=eq.${req.query.post_id}&status=eq.approved&order=created_at.asc&limit=100`);
        return res.status(200).json({ replies });
      }
      const posts = await db.selectAsAdmin(`community_posts?select=${PUBLIC_POST}&status=eq.approved&order=created_at.desc&limit=50`);
      // reply counts: approved replies only (one small query instead of an embedded count)
      const ids = posts.map((p) => p.id);
      const reps = ids.length ? await db.selectAsAdmin(`community_replies?select=post_id&status=eq.approved&post_id=in.(${ids.join(",")})&limit=5000`) : [];
      const n = {}; for (const r of reps) n[r.post_id] = (n[r.post_id] || 0) + 1;
      return res.status(200).json({ posts: posts.map((p) => ({ ...p, reply_count: n[p.id] || 0 })) });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body || {};
    const action = req.query?.action || body.action || "post";
    const ip = ipOf(req);

    // ── owner tools (Clerk sign-in with an admin email) ──
    if (["admin_list", "admin_review", "delete"].includes(action)) {
      if (!(await isAdmin(req))) return res.status(401).json({ error: "Owner sign-in required" });
      if (action === "admin_list") {
        const [posts, replies] = await Promise.all([
          db.selectAsAdmin("community_posts?select=id,content,display_name,category,status,review_note,reports,created_at&order=created_at.desc&limit=200"),
          db.selectAsAdmin("community_replies?select=id,post_id,content,display_name,status,review_note,reports,created_at&order=created_at.desc&limit=300"),
        ]);
        return res.status(200).json({ posts, replies });
      }
      if (action === "admin_review") {
        const table = body.kind === "reply" ? "community_replies" : "community_posts";
        if (!idOk(body.id) || !["approved", "hidden"].includes(body.status)) return res.status(400).json({ error: "Bad review" });
        await db.update(`${table}?id=eq.${body.id}`, { status: body.status, review_note: "owner review" });
        return res.status(200).json({ ok: true });
      }
      if (!idOk(body.id)) return res.status(400).json({ error: "Missing post id" });
      await fetchDelete(`community_posts?id=eq.${body.id}`);
      return res.status(200).json({ ok: true, deleted: body.id });
    }

    // ── report ──
    if (action === "report") {
      const table = body.kind === "reply" ? "community_replies" : "community_posts";
      if (!idOk(body.id)) return res.status(400).json({ error: "Missing id" });
      if (!(await rateOk(`community-report:${ip}:${table}:${body.id}`, 86400, 1))) return res.status(200).json({ ok: true });   // one report per person per item
      if (!(await rateOk(`community-report-ip:${ip}`, 3600, 20))) return res.status(429).json({ error: "Too many reports — try later" });
      const row = (await db.selectAsAdmin(`${table}?select=id,reports,status&id=eq.${body.id}&limit=1`))[0];
      if (!row) return res.status(404).json({ error: "Not found" });
      const reports = Number(row.reports || 0) + 1;
      const patch = { reports };
      if (reports >= HIDE_AFTER_REPORTS && row.status === "approved") { patch.status = "pending"; patch.review_note = `${reports} reports — waiting for owner review`; }
      await db.update(`${table}?id=eq.${body.id}`, patch);
      await db.insert("feedback", [{ page: "/ (community)", kind: "community_report", message: `${table} #${body.id} reported (${reports} total)` }]).catch(() => null);
      return res.status(200).json({ ok: true });
    }

    // ── delete your own ──
    if (action === "owner_delete" || action === "owner_delete_reply") {
      const table = action === "owner_delete" ? "community_posts" : "community_replies";
      if (!idOk(body.id) || !body.token) return res.status(400).json({ error: "Missing id or token" });
      const row = (await db.selectAsAdmin(`${table}?select=id,delete_token&id=eq.${body.id}&limit=1`))[0];
      if (!row) return res.status(404).json({ error: "Not found" });
      if (!sameToken(row.delete_token, body.token)) return res.status(403).json({ error: "You can only delete your own posts" });
      await fetchDelete(`${table}?id=eq.${body.id}`);
      return res.status(200).json({ ok: true, deleted: body.id });
    }

    // ── new post / reply ──
    const isReply = action === "reply";
    const content = clip(body.content, 5000);
    const maxLen = isReply ? MAX_REPLY_CHARS : MAX_POST_CHARS;
    if (content.length < MIN_CHARS) return res.status(400).json({ error: `Too short (min ${MIN_CHARS} characters).` });
    if (content.length > maxLen) return res.status(400).json({ error: `Too long (max ${maxLen} characters).` });
    if (isReply && !idOk(body.post_id)) return res.status(400).json({ error: "Missing post_id" });
    if (!(await rateOk(`community-post:${ip}`, 60, 3)) || !(await rateOk(`community-post-day:${ip}`, 86400, 30)))
      return res.status(429).json({ error: "Posting too fast — wait a minute." });
    if (isReply) {
      const parent = (await db.selectAsAdmin(`community_posts?select=id&id=eq.${body.post_id}&status=eq.approved&limit=1`))[0];
      if (!parent) return res.status(404).json({ error: "That post isn't available" });
    }

    const mod = await moderate(content);
    const deleteToken = genToken();
    const row = { content, display_name: cleanName(body.display_name), status: mod.status, review_note: mod.note, delete_token: deleteToken,
                  ...(isReply ? { post_id: Number(body.post_id) } : { category: clip(body.category, 40) || null }) };
    const inserted = await insertReturning(isReply ? "community_replies" : "community_posts", row);
    const pub = { id: inserted.id, content, display_name: row.display_name, created_at: inserted.created_at, ...(isReply ? { post_id: row.post_id } : { category: row.category }) };
    return res.status(200).json({ ok: true, [isReply ? "reply" : "post"]: pub, deleteToken, status: mod.status,
                                  visible: mod.status === "approved", flagged: mod.status !== "approved", message: visibleMsg(mod.status) });
  } catch (e) {
    console.error("[community]", e);
    return res.status(500).json({ error: "Something went wrong — try again" });
  }
}

// small helpers that need representation / DELETE (lib/db.js keeps its surface tiny)
function svcHeaders(extra = {}) {
  const key = process.env.INTERNIQ_DB_SERVICE_KEY;
  const h = { apikey: key, "Content-Type": "application/json", ...extra };
  if (!String(key).startsWith("sb_")) h.Authorization = `Bearer ${key}`;
  return h;
}
async function insertReturning(table, row) {
  const r = await fetch(`${process.env.INTERNIQ_DB_URL}/rest/v1/${table}`, { method: "POST", headers: svcHeaders({ Prefer: "return=representation" }), body: JSON.stringify(row) });
  if (!r.ok) throw new Error(`insert ${table} ${r.status}`);
  return (await r.json())[0];
}
async function fetchDelete(path) {
  const r = await fetch(`${process.env.INTERNIQ_DB_URL}/rest/v1/${path}`, { method: "DELETE", headers: svcHeaders({ Prefer: "return=minimal" }) });
  if (!r.ok) throw new Error(`delete ${r.status}`);
}
