// lib/heardmail.js — the one-time "How did you find Beat the Pile?" email (Nov 23 2026, owner) to students who signed up
// before the sign-up dropdown existed. Each option is a link to /heard/?t=<token>&s=<key>; that page only PRE-SELECTS the
// answer, the student taps Send (a POST) to record it, because email link scanners open every link in an email.
import { STUDENT } from "./heard.js";

const SITE = "https://www.beatthepile.com";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const HEARD_SUBJECT = "Quick question: how did you find Beat the Pile?";

export function buildHeardEmail({ token, unsubToken, firstName }) {
  const link = (k) => `${SITE}/heard/?t=${encodeURIComponent(token)}&s=${encodeURIComponent(k)}`;
  const unsub = unsubToken ? `${SITE}/api/me?unsub=${encodeURIComponent(unsubToken)}&k=alerts` : `${SITE}/u/#settings`;
  const hi = firstName ? `Hi ${esc(firstName)},` : "Hi,";
  const btn = ([k, l]) => `<tr><td style="padding:4px 0"><a href="${link(k)}" style="display:block;border:1px solid #CBD3DF;border-radius:8px;padding:10px 14px;color:#060A2C;text-decoration:none;font-size:15px">${esc(l)}</a></td></tr>`;
  const html = `<!doctype html><body style="margin:0;background:#F6F7F9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#060A2C">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:520px;background:#fff;border:1px solid #E3E7ED;border-radius:12px" cellpadding="0" cellspacing="0"><tr><td style="padding:22px 24px">
<div style="font-weight:700;color:#4A7000;font-size:14px">Beat the Pile</div>
<p style="margin:12px 0 6px;font-size:15px;line-height:1.5">${hi}</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.5">Thanks for being one of our first students. One quick question so we know where to find more students like you: <b>how did you hear about Beat the Pile?</b> Tap one.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${STUDENT.map(btn).join("")}</table>
<p style="color:#5B6675;font-size:13px;margin:14px 0 0">It takes one tap and one Send. We only ask once.</p>
</td></tr></table>
<p style="color:#5E6A80;font-size:12px;margin:14px 0 0">You're getting this because you have a Beat the Pile account. <a href="${unsub}" style="color:#3D4A60">Unsubscribe</a> · <a href="${SITE}/u/#settings" style="color:#3D4A60">Email settings</a><br>Beat the Pile, a service of CuzzoCore LLC${process.env.MAIL_ADDRESS ? " · " + esc(process.env.MAIL_ADDRESS) : ""}</p>
</td></tr></table></body>`;
  const text = `${firstName ? `Hi ${firstName},` : "Hi,"}\n\nThanks for being one of our first students. One quick question: how did you hear about Beat the Pile? Pick one:\n\n${STUDENT.map(([k, l]) => `- ${l}: ${link(k)}`).join("\n")}\n\nWe only ask once.\n\nUnsubscribe: ${unsub}\nBeat the Pile, a service of CuzzoCore LLC\n`;
  return { subject: HEARD_SUBJECT, html, text, unsub };
}
