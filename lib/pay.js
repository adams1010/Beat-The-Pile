// lib/pay.js (Nov 26 2026) — reads the pay an EMPLOYER posted in a job ad ("$25.00 - $32.00 per hour", "$80K – $100K",
// "Hourly pay: $20") and turns it into one range with a unit. Used by the Pay Finder bot (scripts/pay-finder.mjs) and
// the pages that show it. Rules, so we never invent a number:
//   • only US dollars ("$" not followed/preceded by CAD, AUD, SGD…); never "$5 million", bonuses, stipends, relocation
//   • the unit is the one the ad says (hour / year / month / week); with no unit word, under $200 = hourly and
//     $15,000+ = yearly, anything in between is skipped (could be weekly, monthly, a bonus)
//   • the number must sit near a pay word (pay, salary, compensation, wage, rate, range, hourly, base, earn) unless the
//     ad's own pay field gave it (Ashby / Lever structured pay)
//   • hourly 7.25–250 and yearly 15k–600k, a range's top at most 4× its bottom
// Units: "h" hour · "y" year · "m" month · "w" week. Browser module too (no imports).

const UNIT = { h: 2080, y: 1, m: 12, w: 52 };          // per year
export const toHourly = (v, u) => u === "h" ? v : v * (UNIT[u] || 1) / 2080;

const NUM = String.raw`\$\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d{1,2})?)\s?([kK])?`;
const RANGE = new RegExp(`${NUM}(?:\\s*(?:USD|usd))?\\s*(?:-|–|—|to|and|\\/)\\s*(?:USD\\s*)?${NUM}`, "g");
const ONE = new RegExp(NUM, "g");
const FOREIGN = /\b(CAD|AUD|SGD|NZD|HKD|MXN|C\$|A\$|CA\$|AU\$|S\$|NZ\$|HK\$|Canadian|Australian|Singapore)\b/i;
const PAY_WORD = /\b(pay|paid|salary|salaries|compensation|wage|wages|rate|range|hourly|base|earn|earning|stipend|per hour|an hour|annual(?:ly)?)\b/i;
const NOT_PAY = /\b(bonus|bonuses|housing|lodging|meal|commut\w*|transportation|relocation|reimburs\w*|tuition|allowance|referral|sign[- ]?on|signing|401\s?\(?k|equity|stock|funding|raised|revenue|valuation|million|billion|budget|discount|credit|gift|per diem|travel|award|scholarship|fee|deposit|commission)\b/i;
const MAGNITUDE_AFTER = /^\s*(million|billion|mm|bn|[mb]\b)/i;

function num(raw, k) { const v = parseFloat(String(raw).replace(/,/g, "")); return k ? v * 1000 : v; }
function unitNear(after, before) {
  const a = after.slice(0, 40).toLowerCase(), b = before.slice(-60).toLowerCase();
  // the words right after the number win ("Salary $4,000 - $5,000 per month" = monthly)
  if (/^\s*(usd)?\s*(\/|per|an|a)?\s*(hr\b|hour|hourly)/.test(a)) return "h";
  if (/^\s*(usd)?\s*(\/|per|a|an)?\s*(yr\b|year|annum|annual)/.test(a)) return "y";
  if (/^\s*(usd)?\s*(\/|per|a)?\s*(mo\b|month)/.test(a)) return "m";
  if (/^\s*(usd)?\s*(\/|per|a)?\s*(wk\b|week)/.test(a)) return "w";
  if (/\bhourly\b[^$]{0,40}$/.test(b)) return "h";
  if (/\bmonthly\b[^$]{0,40}$/.test(b)) return "m";
  if (/\bweekly\b[^$]{0,40}$/.test(b)) return "w";
  if (/\b(annual|annually|salary|yearly)\b[^$]{0,40}$/.test(b)) return "y";
  return null;
}
function guessUnit(v) { return v < 200 ? "h" : v >= 15000 ? "y" : null; }
export function sane(lo, hi, u) {
  if (!(lo > 0) || !(hi > 0) || hi < lo || hi > lo * 4) return false;
  const h = toHourly(lo, u), H = toHourly(hi, u);
  return h >= 7.25 && H <= 300 && (u !== "y" || (lo >= 15000 && hi <= 600000));
}

/** Plain text of a job ad (HTML entities + tags removed). */
export function plain(html = "") {
  return String(html).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "'")
    .replace(/&mdash;|&ndash;/g, " – ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/\s+/g, " ");
}

/** The posted pay in a job ad's text → { lo, hi, u } or null. Several location ranges ("CA: $30–$40, NY: $28–$38") → widest. */
export function parsePay(text = "") {
  const t = plain(text);
  if (!t.includes("$")) return null;
  const found = [];
  const take = (lo, hi, at, end) => {
    const before = t.slice(Math.max(0, at - 160), at), after = t.slice(end, end + 60);
    if (MAGNITUDE_AFTER.test(after)) return;
    const near = t.slice(Math.max(0, at - 160), Math.min(t.length, end + 40));
    if (FOREIGN.test(near)) return;
    const clause = before.split(/[.;!?]\s/).pop();       // only this sentence counts ("We raised $50 million. Pay: $20/hr")
    // "$2,000 signing bonus", "Relocation: $5,000" are not pay; "Salary $60k–$75k + bonus", "Equity and $150k base" are
    const cut = /\band\b|\bplus\b|\+|,|\(|\bor\b/;
    if (NOT_PAY.test(clause.split(cut).pop().slice(-40)) || NOT_PAY.test(after.slice(0, 25).split(cut)[0])) return;
    if (!PAY_WORD.test(clause) && !PAY_WORD.test(after.slice(0, 40))) return;
    const u = unitNear(after, before) || guessUnit(hi);
    if (!u || !sane(lo, hi, u)) return;
    found.push({ lo, hi, u });
  };
  const used = [];
  for (const m of t.matchAll(RANGE)) {
    const lo = num(m[1], m[2]), hi = num(m[3], m[4] || (m[2] && !m[4] && num(m[3]) < 1000 ? m[2] : null));
    take(lo, hi, m.index, m.index + m[0].length); used.push([m.index, m.index + m[0].length]);
  }
  if (!found.length) {
    for (const m of t.matchAll(ONE)) {
      if (used.some(([a, b]) => m.index >= a && m.index < b)) continue;
      const v = num(m[1], m[2]); take(v, v, m.index, m.index + m[0].length);
    }
  }
  if (!found.length) return null;
  const u = found[0].u, same = found.filter((f) => f.u === u);
  const lo = Math.min(...same.map((f) => f.lo)), hi = Math.max(...same.map((f) => f.hi));
  return sane(lo, hi, u) ? { lo, hi, u } : { lo: found[0].lo, hi: found[0].hi, u };
}

/** Structured pay (Ashby compensation component / Lever salaryRange) → { lo, hi, u } or null. */
export function fromStructured(min, max, interval, currency) {
  if (currency && String(currency).toUpperCase() !== "USD") return null;
  const i = String(interval || "").toLowerCase();
  const u = /hour/.test(i) ? "h" : /year|annual/.test(i) ? "y" : /month/.test(i) ? "m" : /week/.test(i) ? "w" : null;
  const lo = Number(min) || Number(max), hi = Number(max) || Number(min);
  if (!u || !sane(lo, hi, u)) return null;
  return { lo, hi, u };
}

/** "$25–32/hr", "$80k–100k/yr", "$20/hr". */
export function payText(p) {
  if (!p) return "";
  const [lo, hi, u] = Array.isArray(p) ? p : [p.lo, p.hi, p.u];
  const f = (v) => u === "y" || v >= 10000 ? `${Math.round(v / 1000)}k` : v >= 1000 ? Math.round(v).toLocaleString("en-US") : (Math.round(v * 100) / 100).toFixed(v % 1 ? 2 : 0);
  const unit = { h: "hr", y: "yr", m: "mo", w: "wk" }[u] || "";
  return lo === hi ? `$${f(lo)}/${unit}` : `$${f(lo)}–${f(hi)}/${unit}`;
}

/** Percentiles of a sorted numeric list. */
export function pct(sorted, p) {
  if (!sorted.length) return null;
  const i = (sorted.length - 1) * p, a = Math.floor(i), b = Math.ceil(i);
  return Math.round((sorted[a] + (sorted[b] - sorted[a]) * (i - a)) * 100) / 100;
}
