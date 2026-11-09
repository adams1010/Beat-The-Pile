// tests/fakedb.mjs — an in-memory stand-in for everything the API talks to, so tests run offline:
// Supabase REST (PostgREST filters we use, upsert, PATCH with filters, count, rpc rate_take / ai_reserve),
// Supabase Storage, Clerk (JWKS + users), and Anthropic. Install with `const f = installFake()`.
import crypto from "node:crypto";

export function makeKeys() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "k1" };
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const tok = (sub, extra = {}) => { const h = b64({ alg: "RS256", kid: "k1" }), p = b64({ sub, exp: Math.floor(Date.now() / 1000) + 60, ...extra });
    return `${h}.${p}.${crypto.sign("RSA-SHA256", Buffer.from(h + "." + p), privateKey).toString("base64url")}`; };
  return { jwk, tok };
}

const DEFAULTS = {
  user_jobs: () => ({ saved: [], applied: [], fair_notes: [], starred: [], apps: [], version: 0, resume_share: false, seen_at: null, weekly_goal: null,
                      resume_path: null, resume_token: null, resume_name: null, resume_uploaded_at: null }),
  user_home: () => ({ profile: null, tracker: null, resumes: null, version: 0 }),
  community_posts: () => ({ status: "pending", reports: 0, created_at: new Date().toISOString(), category: null, review_note: null }),
  community_replies: () => ({ status: "pending", reports: 0, created_at: new Date().toISOString(), review_note: null }),
  ai_usage: () => ({ at: new Date().toISOString(), input_tokens: 0, output_tokens: 0, cost_usd: 0, reserved: false }),
  listings: () => ({ closed_at: null, link_ok: null, link_fails: 0 }),
  orbit_links: () => ({ created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  orbit_messages: () => ({ created_at: new Date(Date.now() + (++tick)).toISOString(), read_at: null }),
};
let tick = 0;
const KEY = { user_jobs: "clerk_user_id", user_home: "clerk_user_id", bot_settings: "bot", company_briefs: "company_id" };

function parseVal(v) { if (v === "null") return null; if (v === "true") return true; if (v === "false") return false; return v; }
function test(row, col, expr) {
  const v = row[col];
  const [op, ...rest] = expr.split("."); const arg = rest.join(".");
  if (op === "not") return !test(row, col, arg);
  if (op === "eq") { const a = parseVal(decodeURIComponent(arg)); return String(v) === String(a) || v === a; }
  if (op === "neq") return String(v) !== decodeURIComponent(arg);
  if (op === "is") return arg === "null" ? v == null : v === parseVal(arg);
  if (op === "gt" || op === "gte" || op === "lt" || op === "lte") {
    const a = decodeURIComponent(arg); const x = isNaN(Number(a)) ? Date.parse(a) : Number(a); const y = isNaN(Number(v)) ? Date.parse(v) : Number(v);
    return op === "gt" ? y > x : op === "gte" ? y >= x : op === "lt" ? y < x : y <= x; }
  if (op === "in") { const list = decodeURIComponent(arg).replace(/^\(|\)$/g, "").split(",").map((x) => x.replace(/^"|"$/g, "")); return list.includes(String(v)); }
  if (op === "imatch" || op === "match") {   // Postgres regex ≈ JS here (\y = word boundary in Postgres)
    let src = decodeURIComponent(arg); if (src.startsWith('"') && src.endsWith('"')) src = src.slice(1, -1).replace(/\\(["\\])/g, "$1");
    return new RegExp(src.replace(/\\y/g, "\\b"), op === "imatch" ? "i" : "").test(String(v ?? "")); }
  if (op === "ilike") { const pat = decodeURIComponent(arg).toLowerCase().replace(/\*/g, ""); return String(v ?? "").toLowerCase().includes(pat); }
  return true;
}
function logic(row, expr) {        // or=(a.eq.1,b.is.null)  and=(or(state.ilike.*VA*,...))
  const inner = expr.replace(/^\(|\)$/g, "");
  const parts = []; let depth = 0, cur = "";
  let q = false, esc = false;      // PostgREST: "double-quoted" values may hold , ( ) — \" and \\ escape inside them
  for (const ch of inner) {
    if (q) { if (esc) { cur += ch; esc = false; } else if (ch === "\\") esc = true; else if (ch === '"') q = false; else cur += ch; continue; }
    if (ch === '"') { q = true; continue; }
    if (ch === "(") depth++; if (ch === ")") depth--; if (ch === "," && depth === 0) { parts.push(cur); cur = ""; } else cur += ch; }
  if (cur) parts.push(cur);
  return parts.map((p) => {
    if (p.startsWith("or(")) return { or: p.slice(2) };
    if (p.startsWith("and(")) return { and: p.slice(3) };
    const i = p.indexOf("."); return { col: p.slice(0, i), expr: p.slice(i + 1) };
  });
}
function evalLogic(row, expr, mode) {
  const parts = logic(row, expr).map((p) => p.or ? evalLogic(row, p.or, "or") : p.and ? evalLogic(row, p.and, "and") : test(row, p.col, p.expr));
  return mode === "or" ? parts.some(Boolean) : parts.every(Boolean);
}
const RESERVED = new Set(["select", "limit", "offset", "order", "on_conflict"]);
function filterRows(rows, sp) {
  return rows.filter((r) => {
    for (const [k, v] of sp) {
      if (RESERVED.has(k) || k.includes(".")) continue;
      if (k === "or") { if (!evalLogic(r, v, "or")) return false; continue; }
      if (k === "and") { if (!evalLogic(r, v, "and")) return false; continue; }
      if (!test(r, k, v)) return false;
    }
    return true;
  });
}

export function installFake({ jwk, anthropic, clerkUsers = {} } = {}) {
  const tables = new Map(), files = new Map(), seq = new Map(), calls = { anthropic: 0, prompts: [] };
  const T = (n) => { if (!tables.has(n)) tables.set(n, []); return tables.get(n); };
  const resp = (status, body, headers = {}) => ({ ok: status < 300, status, headers: { get: (k) => headers[k.toLowerCase()] ?? null },
    text: async () => (body === undefined ? "" : JSON.stringify(body)), json: async () => body });
  const f = { tables, files, calls, T, failNext: null, slowPatch: null };

  globalThis.fetch = async (u, o = {}) => {
    u = String(u); const m = (o.method || "GET").toUpperCase();
    if (u.startsWith("https://api.clerk.com/v1/jwks")) return resp(200, { keys: jwk ? [jwk] : [] });
    if (u.startsWith("https://api.clerk.com/v1/users/")) { const id = decodeURIComponent(u.split("/").pop()); const em = clerkUsers[id];
      if (em && typeof em === "object") return resp(200, { id, first_name: em.first_name || null, last_name: em.last_name || null, unsafe_metadata: em.role ? { role: em.role } : {},
        email_addresses: [{ email_address: em.email, verification: { status: "verified" } }] });
      return em ? resp(200, { email_addresses: [{ email_address: em, verification: { status: "verified" } }] }) : resp(404, {}); }
    if (u.startsWith("https://api.resend.com/emails")) { calls.emails = calls.emails || []; const b = JSON.parse(o.body); calls.emails.push(b);
      return calls.resendFail ? resp(500, {}) : resp(200, { id: "em_" + calls.emails.length }); }
    if (u.includes("api.anthropic.com")) { calls.anthropic++; const body = JSON.parse(o.body); calls.prompts.push(body.messages[0].content);
      const out = anthropic ? await anthropic(body) : { text: "ok" };
      if (out.status && out.status >= 300) return resp(out.status, { error: { message: "nope" } });
      return resp(200, { content: [{ type: "text", text: out.text }], usage: out.usage || { input_tokens: 100, output_tokens: 50 } }); }

    const url = new URL(u);
    if (url.pathname.startsWith("/storage/v1/object/sign/")) { const p = url.pathname.replace("/storage/v1/object/sign/", "");
      if (!files.has(p)) return resp(400, { error: "not found" }); return resp(200, { signedURL: `/object/sign/${p}?token=SIGNED&exp=${JSON.parse(o.body).expiresIn}` }); }
    if (url.pathname.startsWith("/storage/v1/object/")) { const p = url.pathname.replace("/storage/v1/object/", "");
      if (m === "DELETE") { files.delete(p); return resp(200, {}); } files.set(p, o.body); return resp(200, {}); }
    if (!url.pathname.startsWith("/rest/v1/")) throw new Error("unexpected fetch " + u);
    if (f.failNext && f.failNext(url, m)) { f.failNext = null; return resp(500, { message: "boom" }); }

    const name = url.pathname.slice("/rest/v1/".length);
    const prefer = String(o.headers?.Prefer || o.headers?.prefer || "");
    if (name.startsWith("rpc/")) {
      const fn = name.slice(4), a = JSON.parse(o.body || "{}");
      if (fn === "rate_take") { const rows = T("rate_hits"), now = Date.now();
        const n = rows.filter((r) => r.key === a.p_key && now - r.at < a.p_window_s * 1000).length;
        if (n >= a.p_max) return resp(200, false); rows.push({ key: a.p_key, at: now }); return resp(200, true); }
      if (fn === "ai_reserve") { const s = T("bot_settings").find((r) => r.bot === "ai");
        if (s?.enabled === false) return resp(200, null);
        const cap = s?.cap_usd != null ? Number(s.cap_usd) : 10;
        const ms = new Date(); const start = Date.UTC(ms.getUTCFullYear(), ms.getUTCMonth(), 1);
        const spent = T("ai_usage").filter((r) => Date.parse(r.at) >= start).reduce((x, r) => x + Number(r.cost_usd || 0), 0);
        if (spent + Number(a.p_est) > cap) return resp(200, null);
        const id = (seq.get("ai_usage") || 0) + 1; seq.set("ai_usage", id);
        T("ai_usage").push({ ...DEFAULTS.ai_usage(), id, feature: a.p_feature, model: a.p_model, cost_usd: Number(a.p_est), reserved: true });
        return resp(200, id); }
      throw new Error("unknown rpc " + fn);
    }
    const rows = T(name), sp = url.searchParams;
    if (m === "GET") {
      let out = filterRows(rows, sp);
      const order = sp.get("order");
      if (order) { const [col, dir] = order.split(",")[0].split("."); out = [...out].sort((a, b) => (String(a[col] ?? "") < String(b[col] ?? "") ? -1 : 1) * (dir === "desc" ? -1 : 1)); }
      const total = out.length, off = Number(sp.get("offset") || 0), lim = sp.get("limit") ? Number(sp.get("limit")) : 1e9;
      out = out.slice(off, off + lim).map((r) => ({ ...r }));
      const sel = sp.get("select") || "";
      const emb = sel.match(/(\w+)\(count\)/);
      if (emb) { const child = emb[1]; const fk = "post_id"; const childFilter = [...sp].filter(([k]) => k.startsWith(child + "."));
        for (const r of out) { let kids = T(child).filter((c) => String(c[fk]) === String(r.id));
          for (const [k, v] of childFilter) kids = kids.filter((c) => test(c, k.split(".")[1], v)); r[child] = [{ count: kids.length }]; } }
      if (sel && sel !== "*") {
        const cols = []; let depth = 0, cur = "";
        for (const ch of sel) { if (ch === "(") depth++; if (ch === ")") depth--; if (ch === "," && depth === 0) { cols.push(cur); cur = ""; } else cur += ch; }
        if (cur) cols.push(cur);
        const keep = cols.map((x) => x.replace(/\(.*\)$/, ""));
        out = out.map((r) => Object.fromEntries(keep.filter((k) => k in r).map((k) => [k, r[k]])));
      }
      return resp(prefer.includes("count=exact") ? 206 : 200, out, { "content-range": `0-0/${total}` });
    }
    if (m === "POST") {
      const items = [].concat(JSON.parse(o.body)); const key = sp.get("on_conflict") || KEY[name] || "id"; const out = [];
      for (const it of items) {
        const ex = it[key] != null ? rows.find((r) => String(r[key]) === String(it[key])) : null;
        if (ex) { if (prefer.includes("ignore-duplicates")) continue; if (prefer.includes("merge-duplicates")) { Object.assign(ex, it); out.push(ex); continue; }
          return resp(409, { code: "23505", message: "duplicate" }); }
        const row = { ...(DEFAULTS[name]?.() || {}), ...it };
        if (row.id == null && ["community_posts", "community_replies", "ai_usage", "feedback", "orbit_messages"].includes(name)) { const id = (seq.get(name) || 0) + 1; seq.set(name, id); row.id = id; }
        rows.push(row); out.push(row);
      }
      return resp(201, prefer.includes("return=representation") ? out.map((r) => ({ ...r })) : undefined);
    }
    if (m === "PATCH") {
      if (f.slowPatch) await f.slowPatch();
      const patch = JSON.parse(o.body); const hit = filterRows(rows, sp);
      for (const r of hit) Object.assign(r, patch);
      return resp(200, prefer.includes("return=representation") ? hit.map((r) => ({ ...r })) : undefined);
    }
    if (m === "DELETE") {
      const hit = new Set(filterRows(rows, sp)); tables.set(name, rows.filter((r) => !hit.has(r)));
      if (name === "community_posts") tables.set("community_replies", T("community_replies").filter((c) => !rows.some((p) => hit.has(p) && String(p.id) === String(c.post_id))));
      return resp(204, undefined);
    }
    throw new Error("unsupported " + m);
  };
  return f;
}

/** Fake Vercel req/res pair. */
export async function invoke(handler, { method = "GET", query = {}, headers = {}, body } = {}) {
  const r = { headers: {}, setHeader(k, v) { r.headers[k] = v; } };
  r.status = (s) => (r.code = s, r); r.json = (b) => (r.body = b, r); r.send = (b) => (r.body = b, r); r.end = () => r;
  await handler({ method, query, headers, body }, r);
  return r;
}
export function env() {
  Object.assign(process.env, { CLERK_SECRET_KEY: "sk", INTERNIQ_DB_URL: "https://f.co", INTERNIQ_DB_SERVICE_KEY: "s", INTERNIQ_DB_ANON_KEY: "a", ANTHROPIC_API_KEY: "k" });
  delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}
