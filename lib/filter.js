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
const NOT_STUDENTS = /\b(skill\s?bridge|high school|veteran|transitioning service|ph\.?\s?d|doctoral|doctorate|post-?doc|master'?s (only|students? only|degree (required|candidates?)))/i;

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

// Canadian province before the country code: "Milton, Ontario, CA" / "Calgary, AB, CA" (CA = Canada, not California).
// Needs a comma before the province so the US city "Ontario, CA" (California) still counts.
const CA_PROVINCE = /,\s*(ON|QC|BC|AB|MB|SK|NS|NB|NL|PE|YT|NT|NU|Ontario|Quebec|Québec|British Columbia|Alberta|Manitoba|Saskatchewan|Nova Scotia|New Brunswick|Newfoundland(?: and Labrador)?|Prince Edward Island)\s*,\s*CA\b/i;
// Workday "country | province | city" style: "CA | ON | Toronto - 380 Wellington Street West"
const CA_PIPED = /^\s*CA\s*\|\s*(ON|QC|BC|AB|MB|SK|NS|NB|NL|PE|YT|NT|NU)\s*\|/;

// "Krakow, MA, PL, 30-701" / "Pune, MH, IN, 411001": city, region code, then a foreign country code.
const FOREIGN_CC = /,\s*[A-Z]{2},\s*(PL|DE|GB|UK|MX|CN|JP|FR|IE|NL|SG|IL|PH|KR|IT|ES|BR|CZ|HU|RO|CH|SE|DK|BE|AT|PT|IN|TW|MY|VN|TH|CR|AR|CO|CL)\b/;

// Big non-US cities whose country code looks like a state ("Mumbai, IN" ≠ Indiana, "Düsseldorf, DE" ≠ Delaware).
// Leaves out names that are also US towns (Paris TX, London KY, Dublin OH, Melbourne FL, Birmingham AL, Cambridge MA…).
const FOREIGN_CITY = /\b(mumbai|bengaluru|bangalore|hyderabad|pune|chennai|new delhi|delhi|gurgaon|gurugram|noida|kolkata|ahmedabad|lodha|d[üu]sseldorf|m[üu]nchen|k[öo]ln|stuttgart|frankfurt|mississauga|montr[ée]al|calgary|toronto|vancouver,\s*(bc|british)|tokyo|osaka|shanghai|beijing|shenzhen|guangzhou|seoul|taipei|hsinchu|mexico city|ciudad de m[ée]xico|guadalajara|monterrey|tijuana|krak[óo]w|wroc[łl]aw|gda[ńn]sk|z[üu]rich|tel aviv|haifa|bucharest|budapest|s[ãa]o paulo|kuala lumpur|penang|bangkok|ho chi minh|hanoi|dubai|abu dhabi|riyadh|nairobi|lagos|johannesburg|cape town|bogot[aá]|medell[ií]n|buenos aires|herzliya|petah tikva|petach tikva|yokneam|ra.?anana|jerusalem|jakarta|casablanca|rabat|(berlin|hamburg|munich|cologne|warsaw|geneva|ottawa|sydney|milan|madrid|lisbon|cairo|manila|prague|london|paris|dublin|melbourne),\s*(de|germany|pl|poland|ch|switzerland|on|ontario|canada|au|nsw|vic|australia|it|italy|es|spain|pt|portugal|eg|egypt|ph|philippines|cz|czech|uk|gb|england|united kingdom|fr|france|ie|ireland)\b)/i;

function statesInOne(t) {
  if (!t || FOREIGN.test(t) || FOREIGN_CITY.test(t) || CA_PROVINCE.test(t) || FOREIGN_CC.test(t)) return [];
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

const ENT = { amp: "&", hellip: "…", nbsp: " ", ndash: "–", mdash: "—", quot: '"', apos: "'", "#39": "'", lt: "<", gt: ">" };
/** Readable location: HTML entities decoded, and for multi-site postings the US sites listed first
 *  ("Berlin, Germany | New York, NY" → "New York, NY | Berlin, Germany"). */
export function cleanLocation(text = "") {
  let t = String(text || "").replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") { const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
    return ENT[e.toLowerCase()] ?? m;
  }).replace(/\s*…\s*$/, "").replace(/\s+/g, " ").trim();
  if (t.includes("|")) {
    const parts = t.split("|").map((x) => x.trim()).filter(Boolean);
    const us = parts.filter((x) => statesInOne(x).length), other = parts.filter((x) => !statesInOne(x).length);
    t = [...us, ...other].join(" | ");
  }
  return t;
}

/** All US states in a location string. Multi-site postings use " | " between sites. */
export function extractStates(text = "") {
  const out = new Set();
  if (CA_PIPED.test(String(text))) return [];
  for (const part of String(text).split("|")) statesInOne(part.trim()).forEach((s) => out.add(s));
  return [...out];
}

/** First US state in a location string (or null). */
export function extractState(text = "") {
  return extractStates(text)[0] || null;
}

/** Season shown on job cards: "Summer 2027", "Fall 2026", "Spring 2027", "Co-op" … or null if the title doesn't say. */
export function seasonOf(title = "") {
  const t = String(title);
  const m = t.match(/\b(summer|fall|spring|winter|autumn)\b[\s/&,-]*(?:(summer|fall|spring|winter)\b[\s,-]*)?(20\d\d)?/i);
  const year = (t.match(/\b(20(2[6-9]|3\d))\b/) || [])[1];
  if (m) { const cap = (w) => w[0].toUpperCase() + w.slice(1).toLowerCase(); const s = cap(m[1] === "autumn" ? "fall" : m[1]) + (m[2] ? "/" + cap(m[2]) : ""); return year ? `${s} ${year}` : s; }
  if (/co-?op/i.test(t)) return year ? `Co-op ${year}` : "Co-op";
  return year ? String(year) : null;
}
