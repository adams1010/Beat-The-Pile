// InternIQ backend — proxy to the Anthropic API for the homepage's AI features.
// Locked down: only our own pages may call it (no cross-site use), prompt/answer sizes are capped,
// and each visitor is rate-limited. The real backstop is the monthly spend limit in the Anthropic console.
const MAX_TOKENS = 3500;
const MAX_PROMPT = 24000;               // characters
const WINDOW_MS = 10 * 60 * 1000, PER_WINDOW = 25;
const hits = new Map();                 // ip -> [timestamps] (per server instance)

function sameSite(req) {
  const host = String(req.headers.host || "").toLowerCase();
  const from = req.headers.origin || req.headers.referer || "";
  try { return !!host && new URL(from).host.toLowerCase() === host; } catch { return false; }
}
function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > PER_WINDOW;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!sameSite(req)) return res.status(403).json({ error: "Not allowed" });
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "?";
  if (limited(ip)) return res.status(429).json({ error: "Too many requests — try again in a few minutes" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "AI is not configured" });

  try {
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    const prompt = typeof body?.prompt === "string" ? body.prompt : "";
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });
    if (prompt.length > MAX_PROMPT) return res.status(413).json({ error: "Prompt too long" });
    const max_tokens = Math.min(MAX_TOKENS, Math.max(1, Number(body?.max_tokens) || 1500));
    const temperature = typeof body?.temperature === "number" ? Math.min(1, Math.max(0, body.temperature)) : 1;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens, temperature, messages: [{ role: "user", content: prompt }] }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error?.message || "AI error" });
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
}
