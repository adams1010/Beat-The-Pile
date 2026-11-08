// lib/alerts.js — weekly "new internships for you" emails (Resend). Opt-in only (user_jobs.alert_on), at most one
// email every ALERT_DAYS per student, nothing sent when there's nothing new, one-click unsubscribe in every email.
// What counts as "for you": the major + states the student picked on /jobs when they turned alerts on, plus any
// company they follow. Runs inside the daily Follow-up Emails cron (api/me.js?cron=remind) — no new function file.
import { db } from "./db.js";
import { emailFor, sendEmail } from "./remind.js";
import { FIELD_LABELS } from "./fields.js";

export const ALERT_DAYS = 7;
const PER_RUN = 300, MAX_ROWS = 12;
const SITE = "https://www.beatthepile.com";
const KEY_OK = /^(all|eng|[a-z_]{2,20})$/;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function cleanMajor(v) { const m = String(v || "all").toLowerCase(); return KEY_OK.test(m) && (m === "all" || m === "eng" || FIELD_LABELS[m]) ? m : "all"; }
export function cleanStates(v) {
  const list = (Array.isArray(v) ? v : String(v || "").split(",")).map((s) => String(s).trim().toUpperCase()).filter((s) => /^[A-Z]{2}$/.test(s));
  return [...new Set(list)].slice(0, 12).join(",");
}
export function majorLabel(m) { return m === "all" ? "every major" : m === "eng" ? "engineering" : FIELD_LABELS[m] || "your major"; }

/** Which of `listings` this student should hear about (newest first). Pure — tested offline. */
export function matchesFor(row, listings, now = Date.now()) {
  const since = Math.max(row.alert_last_sent ? Date.parse(row.alert_last_sent) : 0, now - ALERT_DAYS * 864e5);
  const major = cleanMajor(row.alert_major), states = row.alert_states ? row.alert_states.split(",") : [];
  const follow = new Set(row.starred || []);
  const fresh = listings.filter((l) => Date.parse(l.first_seen) > since);
  const inPlace = (l) => !states.length || String(l.state || "").split(",").some((s) => states.includes(s));
  const inMajor = (l) => major === "all" || (major === "eng" ? !!l.match : l.field === major);
  const out = fresh.filter((l) => follow.has(l.company_id) || (inMajor(l) && inPlace(l)));
  return out.sort((a, b) => Date.parse(b.first_seen) - Date.parse(a.first_seen) || String(a.id).localeCompare(String(b.id)));
}

export function jobsLink(row) {
  const q = new URLSearchParams(); const m = cleanMajor(row.alert_major);
  if (m !== "all") q.set("major", m); if (row.alert_states) q.set("state", row.alert_states);
  return `${SITE}/jobs/${q.toString() ? "?" + q : ""}`;
}

export function buildAlert(row, matches, unsubToken) {
  const unsub = `${SITE}/api/me?unsub=${encodeURIComponent(unsubToken)}&k=alerts`;
  const n = matches.length, label = majorLabel(cleanMajor(row.alert_major));
  const where = row.alert_states ? row.alert_states.split(",").join(", ") : "the US";
  const subject = `${n} new ${label === "every major" ? "" : label + " "}internship${n === 1 ? "" : "s"} this week`.replace(/\s+/g, " ");
  const all = jobsLink(row);
  const rows = matches.slice(0, MAX_ROWS).map((l) => `<tr><td style="padding:10px 0;border-top:1px solid #E3E7ED"><a href="${esc(l.url)}" style="color:#060A2C;font-weight:600;text-decoration:none">${esc(l.title)}</a><br><span style="color:#55627A">${esc(l.company)}${l.location ? " · " + esc(l.location) : ""}</span></td></tr>`).join("");
  const html = `<!doctype html><body style="margin:0;background:#EEF1F6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#060A2C">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:520px;background:#fff;border:1px solid #DCE2EC;border-radius:12px" cellpadding="0" cellspacing="0"><tr><td style="padding:22px 24px">
<div style="font-weight:700;color:#4A7000;font-size:14px">Beat the Pile</div>
<h1 style="font-size:20px;margin:10px 0 6px">${esc(subject)}</h1>
<p style="margin:0 0 8px;color:#1A2230;font-size:15px;line-height:1.5">Found on company job boards this week, for ${esc(label)} in ${esc(where)}${(row.starred || []).length ? ", plus companies you follow" : ""}. Early applications get read first.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14.5px;line-height:1.45">${rows}</table>
${n > MAX_ROWS ? `<p style="color:#55627A;font-size:13.5px">…and ${n - MAX_ROWS} more.</p>` : ""}
<p style="margin:18px 0 6px"><a href="${all}" style="background:#4A7000;color:#fff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:999px;display:inline-block">See all on Beat the Pile</a></p>
</td></tr></table>
<p style="color:#8590A6;font-size:12px;margin:14px 0 0">You turned on weekly job alerts on Beat the Pile. <a href="${unsub}" style="color:#55627A">Unsubscribe</a></p>
</td></tr></table></body>`;
  const text = `${subject}\n\n${matches.slice(0, MAX_ROWS).map((l) => `- ${l.title} — ${l.company}${l.location ? ", " + l.location : ""}\n  ${l.url}`).join("\n")}\n\nSee all: ${all}\n\nUnsubscribe: ${unsub}\n`;
  return { subject, html, text, unsub };
}

/** Listings first seen in the last ALERT_DAYS (+1 day slack), open only. Paged: PostgREST gives ≤1000 rows per request. */
export async function freshListings(now = Date.now()) {
  const since = new Date(now - (ALERT_DAYS + 1) * 864e5).toISOString();
  const q = `listings?select=id,company_id,company,title,location,state,url,match,field,first_seen&closed_at=is.null&or=(link_ok.is.null,link_ok.eq.true)&first_seen=gte.${since}&order=first_seen.desc,id.asc`;
  const out = [];
  for (let off = 0; off < 20000; off += 1000) { const page = await db.select(`${q}&limit=1000&offset=${off}`); out.push(...page); if (page.length < 1000) break; }
  return out;
}

/** The daily pass. Each student gets at most one email every ALERT_DAYS, and only when something new matched. */
export async function runAlerts(now = Date.now()) {
  if (!process.env.RESEND_API_KEY) return { skipped: "no RESEND_API_KEY", sent: 0 };
  const rows = await db.selectAsAdmin(`user_jobs?select=clerk_user_id,alert_major,alert_states,alert_last_sent,starred,remind_unsub&alert_on=eq.true&limit=1000`);
  const due = rows.filter((r) => !r.alert_last_sent || now - Date.parse(r.alert_last_sent) >= ALERT_DAYS * 864e5 - 36e5);
  let sent = 0, empty = 0, noEmail = 0, failed = 0;
  if (!due.length) return { optedIn: rows.length, due: 0, sent };
  const listings = await freshListings(now);
  for (const row of due) {
    if (sent >= PER_RUN) break;
    if (!row.remind_unsub) continue;
    const m = matchesFor(row, listings, now);
    if (!m.length) { empty++; continue; }                 // nothing new → no email (and the week keeps counting)
    try {
      const to = await emailFor(row.clerk_user_id);
      if (!to) { noEmail++; continue; }
      await sendEmail(to, buildAlert(row, m, row.remind_unsub));
      await db.updateReturning(`user_jobs?clerk_user_id=eq.${encodeURIComponent(row.clerk_user_id)}`, { alert_last_sent: new Date(now).toISOString() });
      sent++;
    } catch (e) { failed++; console.warn("[alerts]", e.message); }
  }
  return { optedIn: rows.length, due: due.length, sent, empty, noEmail, failed };
}
