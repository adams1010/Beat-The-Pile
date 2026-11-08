// lib/fields.js — tags every internship with a field (major area), so Beat the Pile can serve every major.
// The engineering view (filter.js classify → "me"/"general") stays exactly as it was; this is an extra tag.
// Order matters: the first rule that matches wins, most specific first.

// Internship-type titles for ALL majors. Banks call interns "Summer Analysts"; consulting/law "Summer Associates".
// "Apprentice" is left out on purpose: those are trade jobs (driver, piercer, electrician), not college internships.
const INTERN_ANY = /\b(intern|internship|interns|co-?op|summer (analyst|associate|scholar|program)|externship)\b/i;
const NOT_STUDENTS = /\b(skill\s?bridge|high school|veteran|transitioning service|ph\.?\s?d|doctoral|doctorate|post-?doc|medical student|residen(t|cy)\b|master'?s (only|students? only|degree (required|candidates?)))/i;
const STALE = (t) => { const ys = (t.match(/20\d\d/g) || []).map(Number); return ys.length > 0 && Math.max(...ys) < 2027; };

// Each rule: [key, label, test]. test is a RegExp or { test(title) }. FIRST MATCH WINS, so the order is the logic:
// specific job families first (software, data, IT, design), then engineering disciplines, then business areas,
// then broad catch-alls. Every change here must keep tests/fields-test.mjs green (≈200 real titles, hand-labeled).
const re = (src, extra) => { const r = new RegExp(src, "i"); return extra ? { test: (t) => r.test(t) && extra(t) } : r; };
const noEng = (t) => !/\bengineer/i.test(t);
// "Design" that is really engineering, or media production (those fall through to their own rule below)
const TECH_DESIGN = /\b(hvac|vlsi|pcb|circuit|fpga|asic|logic design|chip|mechanical|electrical|structural|civil|rf\b|antenna|production|marketing|brand)/i;
// Technicians in labs, clinics, farms are science/health, not manufacturing
const SCI_TECH = /\b(health|safety|environment|veterinar|vet\b|crop|agri|lab(oratory)?\b|pharm|medical|dental|surgical|clinical|patholog|radiolog|histolog)/i;
const IT_CAPS = /(?:^|[^A-Za-z])(IT|ICT)(?:[^A-Za-z]|$)/;           // "IT Intern" — case-sensitive so the word "it" never matches
export const FIELDS = [
  ["software",       "Software & Computer Science", re(String.raw`\b(sdet|\bslam\b|inference|tools programming|software|developer|swe\b|full[- ]?stack|front[- ]?end|back[- ]?end|mobile (app|developer|engineer|development)|ios\b|android|web (developer|development|engineer)|devops|site reliability|\bsre\b|cloud (engineer|developer|platform)|platform engineer|application(s)? (development|developer)|app development|cloud applications|computing (graduate|undergraduate|intern)|computer science|programmer|game (developer|programming))`)],
  ["data",           "Data & AI", re(String.raw`\b(data(?! cent(er|re))|analytics?\b|machine learning|\bml\b|\bai\b|artificial intelligence|deep learning|\bnlp\b|computer vision|statistic|business intelligence|applied scientist|quantitative research|\bllm)`)],
  ["product_design", "Product & Design", re(String.raw`\b(product (manag|owner|analyst|operations|planning|strategy)|program manager, product)`)],
  ["cyber_it",       "Cybersecurity & IT", { test: (t) => IT_CAPS.test(t) || /\b(cyber|security\b|business systems|\berp\b|application administrator|technology \(|vulnerab|infrastructure (support|deployment)|end user|information technology|network(ing)?\b|help ?desk|service desk|systems administrat|sys ?admin|infrastructure engineer|it support|technology support)/i.test(t) }],
  ["mechanical",     "Mechanical & Aerospace", re(String.raw`\b(missile|hypersonic|reentry|combustion|space (systems|algorithms|vehicle)|spacecraft|\brobot\b|mechanical|mechatronic|aerospace|aeronaut|propulsion|thermal|structural (design|analysis)|stress analys|hvac|design engineer|test engineer|robotics|vehicle (dynamics|engineer)|powertrain|turbine)`)],
  ["electrical",     "Electrical & Computer Eng.", re(String.raw`\b(\brtl\b|risc-?v|\bcpu\b|\bgpu\b|heterogeneous integration|\bhbm\b|sensor technolog|battery|batteries|electrical|electronics?|power systems?|power electronics|hardware engineer|\brf\b|antenna|semiconductor|asic|fpga|pcb|circuit|vlsi|controls engineer|embedded|firmware|photonics|signal integrity)`)],
  ["chemical",       "Chemical & Materials", re(String.raw`\b(chemical engineer|chemical engineering|materials? (science|engineer)|process engineer|metallurg|polymer|corrosion|ceramic)`)],
  ["civil",          "Civil, Construction & Architecture", re(String.raw`\b(bridge\b|land development|solid waste|civil|construction|field engineer|estimat(or|ing)|superintendent|survey(ing|or)?\b|geotechnical|transportation engineer|water resources|wastewater|environmental engineer|building|structural (engineer|intern|engineering)|(?<!(enterprise|solutions?|software|cloud|data|systems|technical) )architect(ure|ural)?\s+(intern|co-?op)|architectural|(?<!(enterprise|solutions?|software|cloud|data|systems|technical) )architecture\b|landscape architect|\bbim\b|\bmep\b|plumbing|fire protection|project controls|paving|heavy civil)`)],
  ["product_design", "Product & Design", re(String.raw`\b(product (intern|development|design)|\bux\b|\bui\b|user (experience|research)|animation|animator|\bartist\b|illustrat|graphic design|industrial design|interior design|level design|game design|visual design|motion design|designer|creative|design intern|\bdesign\b)`, (t) => noEng(t) && !TECH_DESIGN.test(t))],
  ["industrial",     "Industrial & Manufacturing", re(String.raw`\b(metrology|flexo|operational excellence|new product introduction|field service|service (installation|calibration)|calibration|industrial engineer|packaging|electrician|manufacturing|quality|operations engineer|production (engineer|supervisor|planning|planner|operations|control|co-?op|technician)|\blean\b|six sigma|reliability|continuous improvement|process improvement|maintenance|assembly|mechanic\b|machinist|\bcnc\b|technician|plant (operations|intern|engineer))`, (t) => !SCI_TECH.test(t))],
  ["finance",        "Finance, Accounting & Insurance", re(String.raw`\b(transfer agency|clearing|order execution|mortgage|private markets|investor (relations|center|services)|portfolio (manag|analy|executive|construction|operations)|record to report|invoice|cost containment|pricing|economist|examiner|realt(y|or)|financ|accounting|accountant|audit|\btax(ation)?\b|treasury|investment|banking|\bbank\b|summer analyst|equity|credit|risk|actuar|wealth|trading|trader|quant|underwrit|insurance|claims?\b|casualty|lending|\bloan|valuation|real estate|property management|brokerage|capital markets|fp&a|controller|m&a\b|mergers|private equity|venture capital|asset management|economics)`)],
  ["legal_policy",   "Legal, Policy & Government", re(String.raw`\b(federal affairs|political (intern|internship|affairs|campaign|organiz)|corporate governance|(?<!(process|market|business|competitive|customer|threat|sales) )intelligence intern|police|community affairs|government relations|corporate affairs|\bregulation\b|consumer affairs|legal|law clerk|\blaw\b|paralegal|compliance|policy|government affairs|public affairs|regulatory|\bcontracts\b|contract (administrat|manag|specialist|analyst|negotiat)|advocacy|legislative|lobby)`)],
  ["people_hr",      "HR & People", re(String.raw`\b(total rewards|organizational change|\bocm\b|technical training|training (project|and development|&)|benefit\b|culture (&|and) talent|people, culture|human resources?|\bhr\b|talent acquisition|talent management|recruiter|recruiting (coordinator|operations|intern)|people (ops|operations|team|analytics|partner)|employee (benefits|experience|relations)|\brecruiting\b|inclusion|diversity|\bdei\b|benefits|compensation|payroll|learning (&|and) development)`)],
  ["consulting",     "Consulting & Strategy", re(String.raw`\b(alliance management|strategic advisory|consult|corporate (development|strategy)|strategy (&|and) (operations|planning|transformation)|strategy intern|strategic (planning|initiatives|transactions|partnerships)|business analyst|summer associate|general management|business solutions|founders?'?s? associate|chief of staff|transformation)`)],
  ["marketing",      "Marketing, Media & Communications", re(String.raw`\b(market development|technical writ|sports (internship|media|marketing|broadcast|production|content)|lifestyle show|voice of customer|customer relations|community relations|editor|audience|e-?commerce|marketplace|message strategy|marketing|brand|communications?|social media|public relations|\bpr\b|content|advertis|journalis|\bnews\b|reporter|editorial|copywrit|media\b|influencer|broadcast|(creative|video|show|media|tv|film|news|sports|experiential|live|event|web)[\s/&-]+production|production assistant|film|video|photograph|community (manager|management)|\bevents?\b)`)],
  ["sales",          "Sales & Business Development", re(String.raw`\b(store (executive|leadership|management)|client (solutions|support|management)|sales|business development|account (manager|executive|development|representative|management)|customer success|client (service|success|services)|customer (experience|service)|inside sales|retail|merchandis)`, (t) => !/pharm|nurs|clinical/i.test(t))],
  ["supply_chain",   "Supply Chain, Operations & Projects", re(String.raw`\b(cross dock|procure|category manag|project manag|program manag|\bpmo\b|project coordinat|business process|supply chain|supply management|supplier|logistics|procurement|purchasing|buyer|buying|sourcing|operations|planning|inventory|warehouse|distribution|transportation|intermodal|fleet|\bdc\b|fulfillment|facilities)`, (t) => noEng(t) || /supply chain|logistics|procure|sourcing/i.test(t))],
  ["science_health", "Science, Health & Environment", re(String.raw`\b(occupational therap|physical therap|\bdvm\b|veterinar|hatchery|turfgrass|turf management|sensory|plasma|biometric|personal trainer|sports medicine|kinesiolog|athletic train|oncolog|cell (line|therapy|based|culture)|gene therapy|sequencing|biobank|vivarium|translational|patient|\bhse\b|archaeolog|biolog|biotech|bioanaly|bioinformat|clinical|pharma|pharmac|laborator|\blab\b|healthcare|health|medical|nurs|neuro|genetic|genomic|chemist|environmental|sustainab|ecolog|geolog|toxicolog|microbio|patholog|radiolog|respiratory|veterinar|immunolog|epidemiol|agri|agronom|\bcrop|\bseed|food science|dairy|animal|physics|physicist|\behs\b|eh&s|conservation|wildlife)`)],
  ["science_health", "Science, Health & Environment", re(String.raw`\b(research|sciences?\b|safety|energy)`, noEng)],
  ["education_social","Education & Social Impact", re(String.raw`\b(social services|refugee|outreach|school partnership|alumni|community program|resilience|educat|teach|tutor|youth|nonprofit|non-profit|social work|case manag|community (outreach|engagement|development)|counsel|camp counselor|ministry|library|volunteer)`)],
  ["engineering",    "Engineering (general)", re(String.raw`\b(draft(er|ing)|integration (&|and) test|engineer(ing)?|r&d|nuclear)\b`)],
];
export const FIELD_LABELS = Object.fromEntries(FIELDS.map(([k, label]) => [k, label]).concat([["other", "Other"]]));
/** One entry per field, in display order (a field can have more than one rule above). */
export const FIELD_LIST = Object.entries(FIELD_LABELS);

/** Is this title an internship-type role for college students (any major)? */
export function isInternship(title = "") {
  return INTERN_ANY.test(title) && !NOT_STUDENTS.test(title) && !STALE(title);
}

// ── Early-career full-time (Nov 2026): Beat the Pile leans internships, but new-grad jobs matter just as much ──
// Only roles meant for students about to graduate or recent grads. Anything senior, managerial or "II+" stays out.
const EARLY = /\b(new[- ]?grad(uate)?s?|recent (college )?grad(uate)?s?|entry[- ]level|early[- ]career|early in career|campus hire|university (grad(uate)?s?|hire)|college (grad(uate)?s?|hire)|graduate (program|engineer|analyst|trainee|scheme|rotational|development|associate|consultant|scientist|developer|software)|rotational (program|engineer|analyst|associate)|(leadership|engineering|technical|finance|operations|management) development program|(engineer|analyst|developer|scientist|accountant|designer|technician|specialist|consultant|associate)\s*(i|1)\b|associate( [a-z&/-]+){0,2} (engineer|analyst|consultant|scientist|developer|product manager|designer|accountant|auditor)|junior( [a-z&/-]+){0,2} (engineer|analyst|developer|designer|accountant|associate|consultant|scientist)|jr\.? (engineer|analyst|developer|designer|accountant))/i;
const NOT_EARLY = /\b(senior|sr\.?|lead|principal|staff|manager|director|head of|vp|vice president|chief|architect|(ii|iii|iv|2|3|4)\s*$|\b(ii|iii|iv)\b|[3-9]\+? years|10\+ years|experienced|intern|internship|co-?op)\b/i;
const STALE_FT = (t) => { const ys = (t.match(/20\d\d/g) || []).map(Number); return ys.length > 0 && Math.max(...ys) < 2026; };
/** Is this title an early-career FULL-TIME role (new grad, entry level, Engineer I…)? Internships are never this. */
export function isEarlyCareer(title = "") {
  const t = String(title || "");
  return EARLY.test(t) && !NOT_EARLY.test(t) && !NOT_STUDENTS.test(t) && !STALE_FT(t);
}
/** "intern" | "fulltime" | null — what kind of role a title is (null = we don't show it). */
export function kindOf(title = "", boardSaysIntern = false) {
  if (isInternship(title) || boardSaysIntern) return "intern";
  return isEarlyCareer(title) ? "fulltime" : null;
}
/** Extra keyword searches the job-board readers run for early-career roles (2 pages each, so syncs stay fast). */
export const EARLY_QUERIES = ["new grad", "entry level", "graduate"];
export const EARLY_PAGES = 2;
/** Postgres regex (PostgREST "imatch") that matches internship titles — /api/listings uses it for kind=intern|fulltime. */
export const INTERN_PG = "(^|[^a-z])(intern|interns|internship|internships|co-?op|co-?ops|externship|summer (analyst|associate|scholar|program))([^a-z]|$)";
/** Postgres version of the early-career rule (\\b → \\y). Full-time = matches this AND isn't an internship title, so
 *  internships a board flags without the word "intern" (BambooHR's employment type) never land under Full-time. */
export const EARLY_PG = EARLY.source.replace(/\\b/g, "\\y");

/** Field key for a title ("other" when nothing fits). */
export function fieldOf(title = "") {
  for (const [key, , rule] of FIELDS) if (rule.test(String(title || ""))) return key;
  return "other";
}
