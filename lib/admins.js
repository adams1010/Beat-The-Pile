// lib/admins.js — who counts as an owner/admin.
// Set ADMIN_EMAILS in Vercel (comma-separated). When it isn't set, the built-in owners are matched by
// SHA-256 of the email, so the addresses never sit in this public repo.
import crypto from "node:crypto";

const DEFAULT_HASHES = new Set([
  "7e0e6d788cbedd0fa1b145da9c5e1a5f54f1769029fa55b9cdce9e91036d785d",
  "4c74a9e8d91e60af91dbd0e2e1b6ecdeebb2c48590d4f642efdaae30e417bb5c",
]);

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");

export function isAdminEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return false;
  const env = process.env.ADMIN_EMAILS;
  if (env && env.trim()) return env.toLowerCase().split(/[,\s]+/).filter(Boolean).includes(e);
  return DEFAULT_HASHES.has(sha(e));
}
