// lib/filter.js — decides whether a posting is an ME internship worth showing.
// Rule: show it only if we're confident. Anything unclear is dropped, not guessed.

const INTERN = /\b(intern|internship|co-?op)\b/i;

// Strong ME signal in the title
const ME = /\b(mechanical|manufacturing|product design|design engineer|test engineer|quality engineer|maintenance engineer|structural|stress|thermal|propulsion|aerospace|mechatronic|robotics|tooling|process engineer)/i;

// Generic engineering titles ("Engineering Intern") — still useful to an ME student
const GENERAL = /\bengineer(ing)?\b/i;

// Never an ME role, even if "manufacturing" etc. appears ("Manufacturing Strategy & Business Development Intern")
const EXCLUDE_ALWAYS = /\b(software|firmware|embedded|cyber|it\b|information technology|data (science|scientist|analyst|analytics|engineer|engineering)|ai\/ml|ai\b|artificial intelligence|ml\b|machine learning|llm|database|growth|full[- ]?stack|front[- ]?end|back[- ]?end|web\b|cloud|devops|site reliability|sre\b|security|solutions engineer|finance|accounting|audit|marketing|sales|human resources|hr\b|talent acquisition|legal|business development|strategy|communications|graphic|toxicology|biolog|immunology|clinical|regulatory affairs|proteins?\b|cell line|bioprocess|formulation|analytical chem)/i;

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
  // Mixed titles ("Manufacturing Electrical Engineering Co-op") stay visible but don't get the ME badge
  // unless they say "mechanical" outright.
  if (ME.test(title)) return EXCLUDE.test(title) && !/mechanical/i.test(title) ? "general" : "me";
  if (GENERAL.test(title)) return "general";
  return null;
}

export const STATE_NAMES = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",
  DC:"District of Columbia",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",
  KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",
  MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",
  NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",
  PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",
  VT:"Vermont",VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
};
const CODES = new Set(Object.keys(STATE_NAMES));
// Longest names first so "West Virginia" wins over "Virginia", "Washington DC" handled by DC rule
const NAMES = Object.entries(STATE_NAMES).sort((a, b) => b[1].length - a[1].length);
const FOREIGN = /\b(canada|united kingdom|england|germany|india|mexico|china|japan|australia|france|poland|brazil|ireland|netherlands|singapore|israel|philippines|korea|italy|spain|GBR|CAN|MEX|IND|DEU|AUS|CHN|JPN|FRA|POL)\b/i;

function statesInOne(t) {
  if (!t || FOREIGN.test(t)) return [];
  // SuccessFactors slug: /job/Salem-Intern-...-VA-24153/123/
  let m = t.match(/-([A-Z]{2})-\d{5}\//);
  if (m && CODES.has(m[1])) return [m[1]];
  // Workday style "US-VA-STERLING-291" / "USA - VA - Newport News"
  m = t.match(/\bUSA?\s*-\s*([A-Z]{2})\s*-/);
  if (m && CODES.has(m[1])) return [m[1]];
  // Codes first: "Salem, VA, US, 24153" / "Washington, PA" (city named Washington) / "Forest, VA"
  const codes = [...t.matchAll(/(?:^|[\s,(-])([A-Z]{2})(?=[\s,)]|$|-\s|\s*\d{5})/g)].map((x) => x[1]).filter((c) => CODES.has(c));
  if (codes.length) return [codes[codes.length - 1]];   // state comes after the city
  // Full names: "Newport News, Virginia" / "USA - Pennsylvania - West Point" / "United States-Virginia-Dulles"
  if (/washington,?\s*(d\.?\s?c\.?|district of columbia)\b/i.test(t)) return ["DC"];
  for (const [code, name] of NAMES) {
    if (new RegExp(`\\b${name}\\b`, "i").test(t)) return [code];
  }
  return [];
}

/** All US states in a location string. Multi-site postings use " | " between sites. */
export function extractStates(text = "") {
  const out = new Set();
  for (const part of String(text).split("|")) statesInOne(part.trim()).forEach((s) => out.add(s));
  return [...out];
}

/** First US state in a location string (or null). */
export function extractState(text = "") {
  return extractStates(text)[0] || null;
}
