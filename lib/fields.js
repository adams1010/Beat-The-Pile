// lib/fields.js — tags every internship with a field (major area), so InternIQ can serve every major.
// The engineering view (filter.js classify → "me"/"general") stays exactly as it was; this is an extra tag.
// Order matters: the first rule that matches wins, most specific first.

// Internship-type titles for ALL majors. Banks call interns "Summer Analysts"; consulting/law "Summer Associates".
const INTERN_ANY = /\b(intern|internship|interns|co-?op|summer (analyst|associate|scholar|program)|apprentice(ship)?|externship)\b/i;
const NOT_STUDENTS = /\b(skill\s?bridge|high school|veteran|transitioning service|ph\.?\s?d|doctoral|doctorate|post-?doc|medical student|residen(t|cy)\b|master'?s (only|students? only|degree (required|candidates?)))/i;
const STALE = (t) => { const ys = (t.match(/20\d\d/g) || []).map(Number); return ys.length > 0 && Math.max(...ys) < 2027; };

export const FIELDS = [
  ["mechanical",   "Mechanical & Aerospace", /\b(mechanical|mechatronic|aerospace|aeronaut|propulsion|thermal|structural (design|analysis)|stress analys|hvac|product design engineer|design engineer|test engineer|robotics)/i],
  ["electrical",   "Electrical & Computer Eng.", /\b(electrical|electronics?|power systems?|hardware engineer|rf\b|antenna|semiconductor|asic|fpga|pcb|circuit|controls engineer|embedded|firmware)/i],
  ["civil",        "Civil & Construction", /\b(civil|construction|field engineer|project engineer|estimat(or|ing)|superintendent|surveying|geotechnical|transportation engineer|water resources|environmental engineer|building|structural engineer)/i],
  ["chemical",     "Chemical & Materials", /\b(chemical engineer|materials? (science|engineer)|process engineer|metallurg|polymer|chemistry)/i],
  ["software",     "Software & Computer Science", /\b(software|developer|swe\b|full[- ]?stack|front[- ]?end|back[- ]?end|mobile|ios\b|android|web\b|devops|site reliability|sre\b|cloud|platform engineer|computer science)/i],
  ["data",         "Data & AI", /\b(data|analytics?|machine learning|\bml\b|\bai\b|artificial intelligence|deep learning|nlp|computer vision|quantitative research|statistic)/i],
  ["cyber_it",     "Cybersecurity & IT", /\b(cyber|security|information technology|\bit\b|network|systems administrat|help ?desk|infrastructure)/i],
  ["industrial",   "Industrial & Manufacturing", /\b(industrial engineer|manufacturing|quality|operations engineer|production|lean|six sigma|supply chain engineer|reliability)/i],
  ["finance",      "Finance & Accounting", /\b(finance|financial|accounting|accountant|audit|tax|treasury|investment|banking|summer analyst|equity|credit|risk|actuar|wealth|trading|quant)/i],
  ["consulting",   "Consulting & Strategy", /\b(consult|strategy|strategic|corporate development|business analyst|management|summer associate)/i],
  ["marketing",    "Marketing & Communications", /\b(marketing|brand|communications?|social media|public relations|\bpr\b|content|advertis|journalism|media)/i],
  ["sales",        "Sales & Business Development", /\b(sales|business development|account (manager|executive)|customer success)/i],
  ["product_design","Product & Design", /\b(product manag|product owner|\bux\b|\bui\b|user experience|graphic design|designer|creative)/i],
  ["supply_chain", "Supply Chain & Operations", /\b(supply chain|logistics|procurement|purchasing|operations|planning|inventory|warehouse)/i],
  ["science_health","Science & Health", /\b(biolog|biotech|clinical|pharma|research|laborator|lab\b|healthcare|health|medical|nurs|neuro|genetic|chemist|environmental|sustainability)/i],
  ["people_hr",    "HR & People", /\b(human resources|\bhr\b|talent|recruit|people (ops|operations|team))/i],
  ["legal_policy", "Legal & Policy", /\b(legal|law clerk|paralegal|compliance|policy|government affairs|regulatory)/i],
  ["engineering",  "Engineering (general)", /\bengineer(ing)?\b/i],
];
export const FIELD_LABELS = Object.fromEntries(FIELDS.map(([k, label]) => [k, label]).concat([["other", "Other"]]));

/** Is this title an internship-type role for college students (any major)? */
export function isInternship(title = "") {
  return INTERN_ANY.test(title) && !NOT_STUDENTS.test(title) && !STALE(title);
}

/** Field key for a title ("other" when nothing fits). */
export function fieldOf(title = "") {
  for (const [key, , re] of FIELDS) if (re.test(title)) return key;
  return "other";
}
