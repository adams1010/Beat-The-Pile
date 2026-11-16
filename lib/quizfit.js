// lib/quizfit.js — the match quiz's fit score (Nov 15 2026). Real signals only, no randomness:
//   title fits your major (words in the job title) · your skills in the title · class year the posting asks for ·
//   the term you're applying for · distance · how new the posting is.
// Returns { fit: 0–100, why: ["Title matches Mechanical Engineering", "12 mi away", …] }. Shown as an estimate.

// Words a job title uses for each major (the major's own words are added automatically).
const KW = [
  [/mechanic/, ["mechanical", "mech", "design engineer", "manufacturing engineer", "product engineer", "thermal", "hvac", "cad"]],
  [/aerospace|aeronaut/, ["aerospace", "aero", "propulsion", "flight", "aircraft", "avionics", "space", "satellite", "structures"]],
  [/electrical|computer engineering/, ["electrical", "electronics", "hardware", "embedded", "firmware", "power", "controls", "circuit", "pcb", "rf"]],
  [/civil|construction|environmental engineering/, ["civil", "structural", "construction", "project engineer", "field engineer", "transportation", "water", "geotechnical", "site"]],
  [/chemical|materials/, ["chemical", "process", "materials", "polymer", "plant", "chemistry"]],
  [/biomedical/, ["biomedical", "medical device", "r&d", "quality", "clinical", "regulatory"]],
  [/industrial|operations|supply chain/, ["industrial", "operations", "supply chain", "logistics", "manufacturing", "lean", "procurement", "planning", "continuous improvement"]],
  [/robotic/, ["robotics", "automation", "controls", "mechatronics"]],
  [/computer science|software|artificial|cyber|information/, ["software", "developer", "swe", "engineer", "data", "it", "security", "cloud", "web", "machine learning"]],
  [/data|statistic|math|actuar|business analytics/, ["data", "analyst", "analytics", "statistics", "actuarial", "quantitative", "modeling", "machine learning"]],
  [/financ|accounting|econom|real estate/, ["finance", "financial", "accounting", "audit", "tax", "investment", "analyst", "banking", "treasury", "fp&a", "economics", "real estate"]],
  [/marketing|advertis|public relations|communication|journalism/, ["marketing", "brand", "social media", "communications", "content", "pr", "digital", "advertising", "media", "writer"]],
  [/business|management|entrepreneur|international business/, ["business", "operations", "strategy", "analyst", "sales", "marketing", "project", "consulting"]],
  [/human resources/, ["hr", "human resources", "talent", "recruiting", "people"]],
  [/kinesiology|exercise|athletic training|sports management|physical therapy|occupational therapy/, ["exercise", "fitness", "athletic", "sports", "strength", "rehab", "physical therapy", "occupational therapy", "wellness", "performance", "coach", "kinesiology"]],
  [/nursing/, ["nurse", "nursing", "patient", "clinical"]],
  [/health|public health|nutrition|pre-med|medicine|physician|pre-pa|dental|pharmacy|veterin/, ["health", "clinical", "patient", "medical", "research", "public health", "nutrition", "pharmacy", "hospital", "lab"]],
  [/biology|biochem|microbio|neuro|chemistry|physics|environmental science|geology|food science|forensic/, ["research", "lab", "science", "scientist", "biology", "chemistry", "environmental", "field"]],
  [/psychology|sociology|social work|cognitive/, ["psychology", "research", "behavioral", "counseling", "social", "case", "human services", "ux research"]],
  [/education|childhood/, ["teacher", "teaching", "education", "tutor", "classroom", "school", "youth"]],
  [/political|policy|law|pre-law|criminal|international relations/, ["policy", "legal", "law", "government", "public affairs", "legislative", "paralegal", "compliance"]],
  [/graphic|industrial design|interior|fashion|animation|fine arts|game design|photography|architecture/, ["design", "designer", "creative", "ux", "graphic", "visual", "architecture", "art"]],
  [/film|music|theater|dance/, ["production", "media", "film", "video", "music", "creative", "events"]],
  [/hospitality|culinary/, ["hospitality", "hotel", "events", "culinary", "guest", "food"]],
];
const GENERIC = new Set(["science", "sciences", "studies", "and", "of", "the", "pre", "arts", "management", "engineering", "systems", "administration", "general", "other"]);
const norm = (s) => String(s || "").toLowerCase();

/** The words a job title would use for this major (or several majors, comma-separated). */
export function majorWords(major) {
  const out = new Set();
  for (const m of norm(major).split(",").map((x) => x.trim()).filter(Boolean)) {
    for (const w of m.replace(/[()/&-]/g, " ").split(/\s+/)) if (w.length >= 4 && !GENERIC.has(w)) out.add(w);
    for (const [re, ws] of KW) if (re.test(m)) ws.forEach((w) => out.add(w));
  }
  return [...out];
}
const has = (t, w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\&]/g, "\\$&")}${w.length <= 3 ? "(?![a-z])" : ""}`, "i").test(t);   // short words (it, hr, ux) must stand alone

// Class year the posting asks for, from the title. 1 = freshman … 4 = senior, 5 = grad.
const YEAR_WORDS = [[/\b(freshm[ae]n|first[- ]year)\b/i, 1], [/\b(sophomore|second[- ]year)\b/i, 2], [/\b(rising junior|junior)\b/i, 3], [/\b(rising senior|senior year|seniors)\b/i, 4]];
/** Student's year at the time of the term they're applying for (from their graduation date). */
export function classYearAt(gradYear, term) {
  const g = String(gradYear || ""), m = g.match(/(May|Dec)\s+(\d{4})/i); if (/graduate/i.test(g)) return 5; if (!m) return 0;
  const t = String(term || "").match(/(Spring|Summer|Fall)\s+(\d{4})/i);
  const at = t ? new Date(+t[2], { spring: 0, summer: 5, fall: 8 }[t[1].toLowerCase()], 1) : new Date();
  const grad = new Date(+m[2], /may/i.test(m[1]) ? 4 : 11, 1);
  const yrsLeft = (grad - at) / (365.25 * 864e5);
  return yrsLeft <= 1 ? 4 : yrsLeft <= 2 ? 3 : yrsLeft <= 3 ? 2 : 1;
}

/** Score one listing for one student. ctx = { words, fields, skills, year, term, now } */
export function fitOf(l, ctx) {
  const t = norm(l.title), why = [];
  let s = 0;
  // 1. Title fits the major (0–40)
  const hit = ctx.words.find((w) => has(t, w));
  if (hit) { s += 40; why.push(`Title fits ${ctx.majorLabel || "your major"}`); }
  else if (ctx.fields && l.field && ctx.fields[0] === l.field) s += 24;
  else s += 14;                                                     // same job area, title doesn't say it
  // 2. Your skills named in the title (0–8)
  const sk = (ctx.skills || []).filter((k) => k.length >= 2 && has(t, norm(k)));
  if (sk.length) { s += Math.min(8, sk.length * 5); why.push(`Mentions ${sk.slice(0, 2).join(", ")}`); }
  // 3. Class year the posting asks for (−20 … +8)
  const asks = YEAR_WORDS.filter(([re]) => re.test(l.title || "")).map(([, y]) => y);
  if (asks.length && ctx.year) {
    if (asks.includes(ctx.year) || (ctx.year === 5 && asks.includes(4))) { s += 8; why.push("Open to your class year"); }
    else s -= 20;                                                   // asks for a different year
  }
  // 4. The term you're applying for (0–8)
  const tm = String(ctx.term || "").match(/(Spring|Summer|Fall)\s+(\d{4})/i);
  if (tm && new RegExp(`\\b${tm[1]}\\b`, "i").test(l.title || "") && (l.title || "").includes(tm[2])) { s += 8; why.push(`For ${tm[1]} ${tm[2]}`); }
  else if (tm && (l.title || "").includes(tm[2])) s += 4;
  // 5. Distance (0–16)
  if (l.mi != null) { s += l.mi <= 10 ? 16 : l.mi <= 25 ? 13 : l.mi <= 50 ? 9 : l.mi <= 100 ? 5 : 2; why.push(l.mi <= 1 ? "In your town" : `${l.mi} mi away`); }
  else if (l.remote) { s += 8; why.push("Remote"); }
  // 6. How new the posting is (0–12)
  const days = l.first_seen ? (ctx.now - Date.parse(l.first_seen)) / 864e5 : 99;
  if (days <= 7) { s += 12; why.push("New this week"); } else if (days <= 30) s += 8; else s += 3;
  return { fit: Math.max(5, Math.min(97, Math.round(s))), why };
}
