// lib/filter.js — decides whether a posting is an ME internship worth showing.
// Rule: show it only if we're confident. Anything unclear is dropped, not guessed.

const INTERN = /\b(intern|internship|co-?op)\b/i;

// Strong ME signal in the title
const ME = /\b(mechanical|manufacturing|product (design|engineer)|design engineer|test engineer|quality engineer|maintenance engineer|structural|stress|thermal|propulsion|aerospace|mechatronic|robotics|tooling|process engineer|industrial engineer)/i;

// Generic engineering titles ("Engineering Intern") — still useful to an ME student
const GENERAL = /\bengineer(ing)?\b/i;

// Never an ME role, even if "manufacturing" etc. appears ("Manufacturing Strategy & Business Development Intern")
const EXCLUDE_ALWAYS = /\b(software|firmware|embedded|cyber|it\b|information technology|data (science|scientist|analyst|analytics|engineer|engineering)|ai\/ml|machine learning|finance|accounting|audit|marketing|sales|human resources|hr\b|talent acquisition|legal|business development|strategy|communications|graphic|toxicology|biolog|immunology|clinical|regulatory affairs|proteins?\b|cell line|bioprocess|formulation|analytical chem)/i;

// Other engineering disciplines — drop unless the title ALSO has an ME signal ("Mechanical/Electrical Intern" stays)
const EXCLUDE = /\b(electrical|electronics|chemical|civil|nuclear criticality|health physics|neutronics|supply chain|procurement|buyer)/i;

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
  if (EXCLUDE_ALWAYS.test(title)) return null;
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
