// lib/auth.js — verifies a Clerk session token the right way: check the RS256 signature against
// Clerk's published public keys (JWKS), then expiry. Returns the Clerk user id, or null.
// Never trusts the token's contents without a valid signature.
import crypto from "node:crypto";

let cache = { at: 0, keys: [] };
const HOUR = 3600000;

async function getKeys(force = false) {
  if (!force && cache.keys.length && Date.now() - cache.at < HOUR) return cache.keys;
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) throw new Error("Missing CLERK_SECRET_KEY");
  const r = await fetch("https://api.clerk.com/v1/jwks", { headers: { Authorization: `Bearer ${secret}` } });
  if (!r.ok) throw new Error(`Clerk JWKS fetch failed (${r.status})`);
  const d = await r.json();
  cache = { at: Date.now(), keys: d.keys || [] };
  return cache.keys;
}

const b64u = (s) => Buffer.from(String(s).replace(/-/g, "+").replace(/_/g, "/"), "base64");

/** @returns {Promise<string|null>} Clerk user id if the token is genuine and unexpired. Throws only if Clerk is unreachable. */
export async function verifyClerkJWT(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  let header, payload;
  try { header = JSON.parse(b64u(h).toString("utf8")); payload = JSON.parse(b64u(p).toString("utf8")); } catch { return null; }
  if (header.alg !== "RS256" || !header.kid) return null;

  let jwk = (await getKeys()).find((k) => k.kid === header.kid);
  if (!jwk) jwk = (await getKeys(true)).find((k) => k.kid === header.kid);   // key rotated
  if (!jwk) return null;

  let valid = false;
  try {
    valid = crypto.verify("RSA-SHA256", Buffer.from(`${h}.${p}`), crypto.createPublicKey({ key: jwk, format: "jwk" }), b64u(sig));
  } catch { return null; }
  if (!valid) return null;

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || now > payload.exp + 5) return null;
  if (typeof payload.nbf === "number" && now + 5 < payload.nbf) return null;
  return typeof payload.sub === "string" && payload.sub ? payload.sub : null;
}

/** Pull "Bearer <token>" from a request. */
export const bearer = (req) => String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "").trim();
