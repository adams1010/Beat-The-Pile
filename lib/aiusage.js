// lib/aiusage.js — every AI call on the site goes through callClaude() here. It:
//   1. reserves the call's worst-case cost against the monthly cap ATOMICALLY (Postgres function ai_reserve,
//      one lock for the whole site, so 50 simultaneous requests can't all slip under the cap),
//   2. makes the call, then
//   3. replaces the reservation with the real cost (or $0 if the call failed).
// If the budget table can't be read, no AI call is made (fails closed).
// The cap lives in bot_settings (row bot="ai", column cap_usd; default $10) and is shown on /bots.
// Prices: Claude Haiku 4.5 = $1 per million input tokens, $5 per million output tokens
// (https://platform.claude.com/docs/en/about-claude/pricing). Update PRICES if the model changes.
import { db } from "./db.js";

export const MODEL = "claude-haiku-4-5-20251001";
const PRICES = { [MODEL]: { in: 1 / 1e6, out: 5 / 1e6 } };
export const DEFAULT_CAP_USD = 10;

const monthStart = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString(); };

export function costOf(model, usage) {
  const p = PRICES[model] || PRICES[MODEL];
  return (usage?.input_tokens || 0) * p.in + (usage?.output_tokens || 0) * p.out;
}
/** Worst case for a call: ~1 token per 3 characters of prompt, plus every output token allowed. */
export const estimateCost = (prompt, maxTokens, model = MODEL) =>
  costOf(model, { input_tokens: Math.ceil(String(prompt).length / 3) + 50, output_tokens: maxTokens });

export async function monthSpend() {
  const rows = await db.selectAllAsAdmin(`ai_usage?select=id,cost_usd&at=gte.${monthStart()}`);
  return rows.reduce((n, r) => n + Number(r.cost_usd || 0), 0);
}

export async function capUsd() {
  const r = await db.selectAsAdmin("bot_settings?select=cap_usd,enabled&bot=eq.ai&limit=1");
  if (r[0]?.enabled === false) return 0;                        // AI switched off on /bots
  return r[0]?.cap_usd != null ? Number(r[0].cap_usd) : DEFAULT_CAP_USD;
}

/** Quick pre-check (no reservation). Fails CLOSED: if spend can't be read, says no. */
export async function aiAllowed() {
  try { const [spent, cap] = await Promise.all([monthSpend(), capUsd()]); return spent < cap; }
  catch { return false; }
}

export class AIError extends Error { constructor(msg, status) { super(msg); this.status = status; } }

/** Shared, durable rate limit (Postgres function rate_take). true = allowed. Fails CLOSED. */
export async function rateOk(key, windowSeconds, max) {
  try { return (await db.rpc("rate_take", { p_key: String(key).slice(0, 200), p_window_s: windowSeconds, p_max: max })) === true; }
  catch (e) { console.warn("[rate] check failed:", e.message); return false; }
}

/**
 * The one way to call Claude. Returns the reply text.
 * Throws AIError with a student-friendly message (status 503 = paused/unavailable, 502 = AI failed).
 */
export async function callClaude({ feature, prompt, maxTokens = 700, temperature = 0.3, fetchImpl = fetch }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AIError("AI is not set up right now", 503);
  let rid;
  try { rid = await db.rpc("ai_reserve", { p_feature: feature, p_model: MODEL, p_est: Number(estimateCost(prompt, maxTokens).toFixed(6)) }); }
  catch (e) { console.warn("[ai] budget check failed:", e.message); throw new AIError("AI is unavailable right now, try again later", 503); }
  if (rid == null) throw new AIError("AI features are paused for the rest of the month", 503);

  let usage = null;
  try {
    const r = await fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      // Nov 13 (less AI): plain human writing, no em dashes, in everything students send or read
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, temperature, system: "Write the way a clear, plain-spoken person writes. Never use em dashes; use commas, periods or parentheses instead. No hype words.", messages: [{ role: "user", content: prompt }] }),
    });
    const d = await r.json().catch(() => ({}));
    usage = d.usage || null;
    if (!r.ok) throw new AIError("AI is busy, try again in a minute", 502);
    return (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").replace(/\s*—\s*/g, ", ");
  } catch (e) {
    if (e instanceof AIError) throw e;
    throw new AIError("AI is busy, try again in a minute", 502);
  } finally {
    // Swap the reservation for the real cost (a failed call that reported no usage costs $0).
    try {
      await db.update(`ai_usage?id=eq.${rid}`, { reserved: false, input_tokens: usage?.input_tokens || 0, output_tokens: usage?.output_tokens || 0,
        cost_usd: Number(costOf(MODEL, usage).toFixed(6)) });
    } catch (e) { console.warn("[ai] usage log failed (reservation kept, so spend is over-counted, never under):", e.message); }
  }
}

/** Summary for the control room */
export async function aiSummary() {
  const since = new Date(Date.now() - 31 * 864e5).toISOString();
  const rows = await db.selectAllAsAdmin(`ai_usage?select=id,at,feature,cost_usd,input_tokens,output_tokens&at=gte.${since}`);
  const ms = Date.parse(monthStart()), day = Date.now() - 864e5;
  const sum = (xs) => Number(xs.reduce((n, r) => n + Number(r.cost_usd || 0), 0).toFixed(4));
  const month = rows.filter((r) => Date.parse(r.at) >= ms);
  const byFeature = {};
  for (const r of month) { const f = byFeature[r.feature] || (byFeature[r.feature] = { calls: 0, usd: 0 }); f.calls++; f.usd += Number(r.cost_usd || 0); }
  for (const f of Object.values(byFeature)) f.usd = Number(f.usd.toFixed(4));
  const cap = await capUsd().catch(() => DEFAULT_CAP_USD);
  return { month: sum(month), today: sum(rows.filter((r) => Date.parse(r.at) >= day)), calls: month.length, byFeature, cap,
           paused: sum(month) >= cap, model: MODEL, priceNote: "$1 / $5 per million input / output tokens" };
}
