// lib/remind.js — follow-up reminder emails (Resend). Opt-in only (user_jobs.remind_email), at most one email
// every GAP_DAYS per student, one-click unsubscribe in every email. Does nothing until RESEND_API_KEY is set.
import { db } from "./db.js";
import { dueFollowUps, daysSince } from "./followups.js";

export const GAP_DAYS = 3;
const PER_RUN = 300;
const SITE = "https://www.beatthepile.com";
export const FROM = process.env.REMIND_FROM || "Beat the Pile <reminders@beatthepile.com>";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function emailFor(uid) {
  const r = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(uid)}`, { headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` } });
  if (!r.ok) return null;
  const u = await r.json();
  const primary = (u.email_addresses || []).find((e) => e.id === u.primary_email_address_id) || (u.email_addresses || [])[0];
  return primary?.verification?.status === "verified" || !primary?.verification ? primary?.email_address || null : null;
}

export function buildEmail(due, unsubToken, now = Date.now()) {
  const unsub = `${SITE}/api/me?unsub=${encodeURIComponent(unsubToken)}`;
  const n = due.length;
  const subject = n === 1 ? `Time to follow up with ${due[0].company}` : `${n} follow-ups are due`;
  const rows = due.slice(0, 10).map((a) => `<tr><td style="padding:8px 0;border-top:1px solid #E3E7ED"><b>${esc(a.company)}</b><br><span style="color:#5B6675">${esc(a.title || "Internship")} · applied ${daysSince(a.appliedAt, now)} days ago</span></td></tr>`).join("");
  const html = `<!doctype html><body style="margin:0;background:#F6F7F9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0B1220">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:520px;background:#fff;border:1px solid #E3E7ED;border-radius:12px" cellpadding="0" cellspacing="0"><tr><td style="padding:22px 24px">
<div style="font-weight:700;color:#0E8A5F;font-size:14px">Beat the Pile</div>
<h1 style="font-size:20px;margin:10px 0 6px">${esc(subject)}</h1>
<p style="margin:0 0 12px;color:#1A2230;font-size:15px;line-height:1.5">It's been 5+ days since you applied${n === 1 ? "" : " to these"}. A short, polite email to the recruiter keeps you on their radar.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14.5px;line-height:1.45">${rows}</table>
${n > 10 ? `<p style="color:#5B6675;font-size:13.5px">…and ${n - 10} more.</p>` : ""}
<p style="margin:18px 0 6px"><a href="${SITE}/season/" style="background:#0E8A5F;color:#fff;text-decoration:none;font-weight:600;padding:10px 16px;border-radius:8px;display:inline-block">Open My Season</a></p>
<p style="color:#5B6675;font-size:13px;margin:12px 0 0">Already followed up? Tap "I followed up" in My Season and we'll stop reminding you about it.</p>
</td></tr></table>
<p style="color:#9AA4B2;font-size:12px;margin:14px 0 0">You turned on follow-up reminders on Beat the Pile. <a href="${unsub}" style="color:#5B6675">Unsubscribe</a></p>
</td></tr></table></body>`;
  const text = `${subject}\n\n${due.slice(0, 10).map((a) => `- ${a.company}: ${a.title || "Internship"} (applied ${daysSince(a.appliedAt, now)} days ago)`).join("\n")}\n\nOpen My Season: ${SITE}/season/\n\nUnsubscribe: ${unsub}\n`;
  return { subject, html, text, unsub };
}

export async function sendEmail(to, mail) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject: mail.subject, html: mail.html, text: mail.text,
      headers: { "List-Unsubscribe": `<${mail.unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}`);
  return true;
}

/** The daily run. Returns stats for the bot log. */
export async function runReminders(now = Date.now()) {
  if (!process.env.RESEND_API_KEY) return { skipped: "no RESEND_API_KEY", sent: 0 };
  const rows = await db.selectAsAdmin(`user_jobs?select=clerk_user_id,apps,remind_unsub,remind_last_sent&remind_email=eq.true&limit=1000`);
  let sent = 0, due = 0, noEmail = 0, failed = 0, waiting = 0;
  for (const row of rows) {
    if (sent >= PER_RUN) break;
    const list = dueFollowUps(row.apps, now);
    if (!list.length) continue;
    due++;
    if (row.remind_last_sent && now - Date.parse(row.remind_last_sent) < GAP_DAYS * 864e5 - 36e5) { waiting++; continue; }
    if (!row.remind_unsub) continue;
    try {
      const to = await emailFor(row.clerk_user_id);
      if (!to) { noEmail++; continue; }
      await sendEmail(to, buildEmail(list, row.remind_unsub, now));
      await db.updateReturning(`user_jobs?clerk_user_id=eq.${encodeURIComponent(row.clerk_user_id)}`, { remind_last_sent: new Date(now).toISOString() });
      sent++;
    } catch (e) { failed++; console.warn("[remind]", e.message); }
  }
  return { optedIn: rows.length, due, sent, waiting, noEmail, failed };
}
