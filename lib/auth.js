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

/** The issuer our Clerk instance signs with, read from the publishable key (pk_live_<base64 "clerk.site.com$">). */
export function expectedIssuer(pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  const m = String(pk || "").match(/^pk_(live|test)_(.+)$/);
  if (!m) return null;
  const host = Buffer.from(m[2], "base64").toString("utf8").replace(/\$$/, "");
  return /^[a-z0-9.-]+$/i.test(host) ? `https://${host}` : null;
}
/** Sites allowed to hold our sign-in tokens ("azp" claim). Extra ones: ALLOWED_ORIGINS env, comma-separated. */
export function originAllowed(azp) {
  let u; try { u = new URL(azp); } catch { return false; }
  const extra = String(process.env.ALLOWED_ORIGINS || "").split(",").map((x) => x.trim().replace(/\/$/, "")).filter(Boolean);
  if (extra.includes(u.origin)) return true;
  if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) return true;
  if (u.protocol !== "https:") return false;
  return ["beatthepile.com", "www.beatthepile.com", "intern-iq-psi.vercel.app"].includes(u.hostname)
      || /^intern-iq-[a-z0-9-]+\.vercel\.app$/.test(u.hostname);          // this project's preview deployments (Vercel still names the project "intern-iq")
}

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
  const iss = expectedIssuer();
  if (iss && payload.iss !== iss) { console.warn("[auth] rejected token: issuer", payload.iss); return null; }          // different Clerk instance
  if (payload.azp && !originAllowed(payload.azp)) { console.warn("[auth] rejected token: azp", payload.azp); return null; }  // minted for another site
  return typeof payload.sub === "string" && payload.sub ? payload.sub : null;
}

/** Pull "Bearer <token>" from a request. */
export const bearer = (req) => String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "").trim();
