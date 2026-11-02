// lib/aiusage.js — counts what every AI call costs (table ai_usage) and enforces a monthly spending cap.
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

export async function monthSpend() {
  const rows = await db.selectAsAdmin(`ai_usage?select=cost_usd&at=gte.${monthStart()}&limit=100000`);
  return rows.reduce((n, r) => n + Number(r.cost_usd || 0), 0);
}

export async function capUsd() {
  try {
    const r = await db.selectAsAdmin("bot_settings?select=cap_usd,enabled&bot=eq.ai&limit=1");
    if (r[0]?.enabled === false) return 0;                        // AI switched off on /bots
    return r[0]?.cap_usd != null ? Number(r[0].cap_usd) : DEFAULT_CAP_USD;
  } catch { return DEFAULT_CAP_USD; }
}

/** true = OK to make an AI call. Fails CLOSED on the cap check only if we can read spend and it's over. */
export async function aiAllowed() {
  try { const [spent, cap] = await Promise.all([monthSpend(), capUsd()]); return spent < cap; }
  catch { return true; }
}

export async function logAI(feature, model, usage) {
  try {
    await db.insert("ai_usage", [{ feature, model, input_tokens: usage?.input_tokens || 0, output_tokens: usage?.output_tokens || 0, cost_usd: Number(costOf(model, usage).toFixed(6)) }]);
  } catch (e) { console.warn("[ai] usage log failed:", e.message); }
}

/** Summary for the control room */
export async function aiSummary() {
  const since = new Date(Date.now() - 31 * 864e5).toISOString();
  const rows = await db.selectAsAdmin(`ai_usage?select=at,feature,cost_usd,input_tokens,output_tokens&at=gte.${since}&order=at.desc&limit=100000`);
  const ms = Date.parse(monthStart()), day = Date.now() - 864e5;
  const sum = (xs) => Number(xs.reduce((n, r) => n + Number(r.cost_usd || 0), 0).toFixed(4));
  const month = rows.filter((r) => Date.parse(r.at) >= ms);
  const byFeature = {};
  for (const r of month) { const f = byFeature[r.feature] || (byFeature[r.feature] = { calls: 0, usd: 0 }); f.calls++; f.usd += Number(r.cost_usd || 0); }
  for (const f of Object.values(byFeature)) f.usd = Number(f.usd.toFixed(4));
  const cap = await capUsd();
  return { month: sum(month), today: sum(rows.filter((r) => Date.parse(r.at) >= day)), calls: month.length, byFeature, cap,
           paused: sum(month) >= cap, model: MODEL, priceNote: "$1 / $5 per million input / output tokens" };
}
