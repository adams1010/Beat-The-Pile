// lib/filter.js — decides whether a posting is an ME internship worth showing.
// Rule: show it only if we're confident. Anything unclear is dropped, not guessed.

const INTERN = /\b(intern|internship|co-?op)\b/i;

// Strong ME signal in the title
const ME = /\b(mechanical|manufacturing|product (design|engineer)|design engineer|test engineer|quality engineer|maintenance engineer|structural|stress|thermal|propulsion|aerospace|mechatronic|robotics|tooling|process engineer|industrial engineer)/i;

// Generic engineering titles ("Engineering Intern") — still useful to an ME student
const GENERAL = /\bengineer(ing)?\b/i;

// Other disciplines / non-engineering — drop
const EXCLUDE = /\b(software|electrical|electronics|firmware|chemical|civil|nuclear criticality|health physics|neutronics|cyber|it\b|information technology|data (science|analyst|engineer)|finance|accounting|supply chain|procurement|buyer|communications|marketing|sales|human resources|hr\b|talent acquisition|legal|business development|graphic)/i;

// Old seasons. Keep anything that names 2027+ or names no year at all.
function isStaleSeason(title) {
  const years = (title.match(/20\d\d/g) || []).map(Number);
  if (!years.length) return false;
  return Math.max(...years) < 2027;
}

// Internships not meant for college students — never show
const NOT_STUDENTS = /\b(skill\s?bridge|high school|veteran|transitioning service)/i;

/** @returns {"me"|"general"|null}  null = don't show */
export function classify(title = "") {
  if (!INTERN.test(title)) return null;
  if (NOT_STUDENTS.test(title)) return null;
  if (isStaleSeason(title)) return null;
  if (EXCLUDE.test(title) && !ME.test(title)) return null;
  if (ME.test(title)) return "me";
  if (GENERAL.test(title)) return "general";
  return null;
}

const STATE_NAMES = { VA: "Virginia", PA: "Pennsylvania" };

/** Pull a 2-letter state out of a location string or a SuccessFactors URL slug. */
export function extractState(text = "") {
  const t = String(text);
  // SuccessFactors slug: /job/Salem-Intern-...-VA-24153/123/
  let m = t.match(/-([A-Z]{2})-\d{5}\//);
  if (m) return m[1];
  // "Salem, VA, US, 24153" / "Ridley Park, PA"
  m = t.match(/(?:^|[\s,(-])([A-Z]{2})(?=[\s,)]|$|-\s)/);
  if (m && m[1] !== "US") return m[1];
  // Workday style "USA - Ridley Park, PA" / "US-VA-Newport News"
  m = t.match(/US[A]?\s*-\s*([A-Z]{2})\s*-/);
  if (m) return m[1];
  for (const [abbr, name] of Object.entries(STATE_NAMES)) {
    if (t.toLowerCase().includes(name.toLowerCase())) return abbr;
  }
  return null;
}
