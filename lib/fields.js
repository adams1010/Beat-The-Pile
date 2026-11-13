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
  // Nov 13: exercise science / kinesiology majors — PT & rehab clinics, gyms, sports performance, athletics (before the
  // health catch-all, so "Physical Therapy Aide" isn't buried among nursing jobs). Engineers stay with their discipline.
  ["exercise_sport", "Exercise Science, Sports & Rehab", re(String.raw`\b(exercise|kinesiolog|strength (and|&) conditioning|athletic train|sports? (medicine|performance|science|scientist|physiolog|nutrition|rehab)|personal train(er|ing)|fitness|wellness coach|health coach|cardiac rehab|pulmonary rehab|physical therap|occupational therap|\bpt (aide|tech)|\bpta\b|\bota\b|rehab(ilitation)? (aide|tech|assistant|coordinator)|therapy (aide|tech)|athletics|recreation)`, noEng)],
  ["mechanical",     "Mechanical & Aerospace", re(String.raw`\b(missile|hypersonic|reentry(?! (justice|services?|programs?|project|support|coordinator|specialist|court|housing|navigat|case))|combustion|space (systems|algorithms|vehicle)|spacecraft|\brobot\b|mechanical|mechatronic|aerospace|aeronaut|propulsion|thermal|structural (design|analysis)|stress analys|hvac|design engineer|test engineer|robotics|vehicle (dynamics|engineer)|powertrain|turbine)`)],
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
  ["education_social","Education & Social Impact", re(String.raw`\b(social services|reentry|refugee|outreach|school partnership|alumni|community program|resilience|educat|teach|tutor|youth|nonprofit|non-profit|social work|case manag|community (outreach|engagement|development)|counsel|camp counselor|ministry|library|volunteer)`)],
  ["engineering",    "Engineering (general)", re(String.raw`\b(draft(er|ing)|integration (&|and) test|engineer(ing)?|r&d|nuclear)\b`)],
];
export const FIELD_LABELS = Object.fromEntries(FIELDS.map(([k, label]) => [k, label]).concat([["other", "Other"]]));
/** One entry per field, in display order (a field can have more than one rule above). */
export const FIELD_LIST = Object.entries(FIELD_LABELS);

/** Is this title an internship-type role for college students (any major)? */
export function isInternship(title = "") {
  return (INTERN_ANY.test(title) || isStudentRole(title)) && !NOT_STUDENTS.test(title) && !STALE(title);
}

// ── Student roles (Nov 12): health and education majors rarely see the word "intern". Hospitals post "Student Nurse",
// "Radiology Student Tech", "Physical Therapy Student", "Nurse Extern"; schools post "Student Teacher"; clinics post
// practicum / fieldwork / clinical rotations. Probed on 15 real hospital Workday boards: dozens per system, none of
// which we kept before. Staff jobs that only MENTION students stay out ("Student Services Coordinator",
// "Clinical Instruction for Radiology Students").
const HEALTH_ED = String.raw`(nurs\w*|radiolog\w*|rad|radiography|sonograph\w*|ultrasound|laboratory|lab|medical laboratory|respiratory( therapy)?|physical therap\w*|occupational therap\w*|speech( language)?( patholog\w*)?|surgical tech\w*|surgical technology|pharmacy|paramedic|ekg|dietetic|athletic training|social work|counseling|dental hygiene|diagnostic)`;
const STUDENT_ROLE = new RegExp(String.raw`\b(student (nurse|nursing|tech|technician|technologist|teacher|teaching|clinician|clinical|trainee|assistant|associate|researcher|research assistant|worker|${HEALTH_ED.slice(1, -1)})|${HEALTH_ED}( [a-z]+){0,2} students?\b(?! (services|affairs|success|accounts|financial|housing|life|recruit\w*|enrollment|loans?))|student teach(er|ing)|practicum|fieldwork|clinical (affiliation|rotation|placement)s?|(nurse|nursing|pharmacy|clinical|medical|dietetic|therapy) extern|\bextern\b|knowledge program)`, "i");
const NOT_STUDENT_ROLE = /\b(for (\w+ ){0,3}students|students? (services|affairs|success|accounts|financial|housing|life|recruit\w*|enrollment|loans?)|instructor|faculty|professor|preceptor|coordinator of|manager|director|supervisor)\b/i;
export function isStudentRole(title = "") { const t = String(title || ""); return STUDENT_ROLE.test(t) && !NOT_STUDENT_ROLE.test(t); }

// ── Early-career full-time (Nov 2026): Beat the Pile leans internships, but new-grad jobs matter just as much ──
// Only roles meant for students about to graduate or recent grads. Anything senior, managerial or "II+" stays out.
const EARLY = /\b(new[- ]?grad(uate)?s?|recent (college )?grad(uate)?s?|entry[- ]level|early[- ]career|early in career|campus hire|university (grad(uate)?s?|hire)|college (grad(uate)?s?|hire)|graduate (program|engineer|analyst|trainee|scheme|rotational|development|associate|consultant|scientist|developer|software)|rotational (program|engineer|analyst|associate)|(leadership|engineering|technical|finance|operations|management) development program|(engineer|analyst|developer|scientist|accountant|designer|technician|specialist|consultant|associate)\s*(i|1)\b|associate( [a-z&/-]+){0,2} (engineer|analyst|consultant|scientist|developer|product manager|designer|accountant|auditor)|junior( [a-z&/-]+){0,2} (engineer|analyst|developer|designer|accountant|associate|consultant|scientist)|jr\.? (engineer|analyst|developer|designer|accountant)|trainee\b|(graduate|leadership|analyst|associate|management|engineering) (training )?program|post-?grad(uate)? (fellow|fellowship)|fellowship program|staff (accountant|auditor)|(sales|business) development (representative|rep)\b|\b(sdr|bdr)\b|account (coordinator|associate)|assistant (account executive|media (planner|buyer)|buyer|editor|planner)|(marketing|communications|events?|program|project|recruiting|operations|hr|talent|social media|sales|research) coordinator|(level|grade) (i|1)\b)/i;
// Also out: hourly trade/retail/service roles ("Auto Repair Specialist I", "Technician (Entry Level)", sign-on bonuses) — not new-grad careers.
// (Stored rows that stop qualifying close on the next sync. The Postgres pattern only sorts stored rows, so it doesn't need these.)
// "Staff Accountant / Staff Auditor" are the classic first jobs in accounting — the word "staff" only means senior elsewhere
const STAFF_OK = /\bstaff (accountant|auditor)\b/i;
const NOT_EARLY = /\b(senior|sr\.?|lead|principal|staff|manager|director|head of|vp|avp|svp|vice president|chief|architect|specialist|technician|tech|repair|mechanic|installer|driver|cashier|warehouse|retail|store|crew|porter|detailer|custodian|housekeep\w*|server|cook|caregiver|sign-?on bonus|per hour|\$\d|(ii|iii|iv|2|3|4)\s*$|\b(ii|iii|iv)\b|[3-9]\+? years|10\+ years|experienced|intern|internship|co-?op)\b/i;
const STALE_FT = (t) => { const ys = (t.match(/20\d\d/g) || []).map(Number); return ys.length > 0 && Math.max(...ys) < 2026; };
// ── Entry-level jobs anyone can start in (Nov 13): no experience needed and common first jobs for students and grads of
// EVERY major — healthcare support (medical assistant, nursing aide, patient care tech, phlebotomy, pharmacy tech, scribe),
// office and front desk, customer service, banking, school and therapy aides, lab and research assistants, new-grad nurses.
// Retail, food service, warehouse, driving and skilled trades stay out (not first-career jobs). Anything senior, "II+",
// supervisory, travel or "N years" stays out.
const ENTRY = /\b(medical assistant|clinical (medical )?assistant|certified (nursing|medical) assistant|cna|nurse aide|nursing (assistant|aide)|patient care (tech|technician|associate|assistant)|patient (care|service|services|access|registration|financial) (rep|representative|associate|coordinator|specialist)|patient access|phlebotom\w*|pharmacy tech(nician)?|ekg tech(nician)?|monitor tech(nician)?|telemetry tech(nician)?|sterile processing tech(nician)?|emergency medical technician|emt|unit (secretary|clerk)|health unit coordinator|medical (receptionist|scribe|office assistant|records (clerk|specialist))|scribe|dental assistant|veterinary assistant|vet assistant|behavior(al)? (technician|tech)|registered behavior technician|rbt|direct support professional|mental health (tech|technician|worker)|psychiatric (tech|technician)|caregiver|home health aide|personal care (aide|assistant)|teacher'?s? (assistant|aide)|teaching assistant|paraprofessional|paraeducator|instructional aide|substitute teacher|tutor|front desk|receptionist|administrative assistant|office assistant|office clerk|data entry|customer (service|support|care|experience) (rep|representative|associate|specialist|agent|advocate)|call center|bank teller|teller|personal banker|universal banker|relationship banker|lab(oratory)? assistant|research assistant|clinical research (coordinator|assistant)|new grad(uate)? (rn|registered nurse|nurse)|graduate nurse|(rn|nurse) residency|registered nurse residen\w*|licensed practical nurse|lpn|physical therap(y|ist) (aide|tech|technician|assistant)|occupational therapy (aide|tech|technician)|(pt|ot) (aide|tech)|rehab(ilitation)? (aide|tech|technician)|therapy (aide|tech|technician)|exercise (physiologist|specialist|coach)|kinesiologist|personal trainer|fitness (coach|instructor|trainer|specialist|associate|attendant)|group (fitness|exercise) instructor|strength (and|&) conditioning (coach|assistant|coordinator)|athletic trainer|sports performance (coach|specialist)|wellness coach|health coach|cardiac rehab\w* (tech|technician|specialist|aide))\b/i;
const NOT_ENTRY = /\b(senior|sr\.?|lead|principal|manager|director|supervisor|head of|chief|vp|avp|travel|graduate research assistant|teaching assistant professor|(ii|iii|iv)|[2-9]\+? years|10\+ years|experienced)\b|\b(2|3|4)\s*$/i;
/** Entry-level job with no experience needed (medical assistant, front desk, bank teller…). */
export function isEntryRole(title = "") {
  const t = String(title || "");
  return ENTRY.test(t) && !NOT_ENTRY.test(t) && !NOT_STUDENTS.test(t.replace(/\b(rn|nurse|nursing) residency\b/ig, "")) && !STALE_FT(t) && !INTERN_ANY.test(t);
}
/** Is this title an early-career FULL-TIME role (new grad, entry level, Engineer I…, or an entry-level job)? Internships are never this. */
export function isEarlyCareer(title = "") {
  const t = String(title || "");
  return (EARLY.test(t) && !NOT_EARLY.test(t.replace(STAFF_OK, "$1")) && !NOT_STUDENTS.test(t) && !STALE_FT(t)) || isEntryRole(t);
}
/** "intern" | "fulltime" | null — what kind of role a title is (null = we don't show it). */
// ── Part-time & hourly (Nov 13): the no-experience jobs students work while in school or for the summer: retail and
// store jobs, food service, warehouse and delivery, hotels and front desks, recreation. Their own kind ("hourly") and
// their own switch on /jobs, so they never get mixed into internship or entry-level searches. Anything senior,
// supervisory, management, licensed (CDL truck driving) or "N years" stays out.
const HOURLY = /\b(cashiers?|sales (associate|floor associate|consultant|advisor)|retail (sales )?(associate|team member|specialist|clerk)|store (associate|team member|clerk)|team member|crew (member|trainer)|baristas?|servers?|host|hostess|busser|dishwasher|line cook|prep cook|cook|food service (worker|associate|aide)|dining (room )?(associate|attendant|aide)|food runner|bartender|baker|deli (associate|clerk|clerk)|stockers?|stock (associate|clerk)|merchandiser|overnight (associate|stocker|team member)|front end (associate|cashier)|sales floor associate|fulfillment (associate|specialist)|order (picker|selector|filler)|pickers?|packers?|package handlers?|warehouse (associate|worker|team member|clerk)|material handlers?|loaders?|unloaders?|delivery (driver|associate|helper)|courier|shopper|personal shopper|car wash (attendant|associate)|lot attendant|valet( attendant)?|cleaner|custodian|janitor|housekeeper|housekeeping (attendant|aide)|room attendant|front desk agent|guest services? (agent|associate|attendant)|lifeguard|swim instructor|camp counselor|recreation (aide|attendant|assistant)|usher|ticket taker|security officer|dietary aide|pharmacy (cashier|clerk|service associate)|beauty (advisor|consultant)|seasonal (associate|team member|worker)|part[- ]time (associate|team member|clerk))\b/i;
const NOT_HOURLY = /\b(engineer|engineering|developer|administrator|admin|analyst|architect|software|sql|data|network|systems?|cloud|linux|windows|devops|security engineer|nurse|technician|senior|sr\.?|lead|manager|management|supervisor|director|head|chief|vp|executive|(ii|iii|iv)|[2-9]\+? years|cdl|truck driver|tractor|owner operator|class a|travel)\b/i;
/** Part-time & hourly job anyone 16+ can start in (cashier, barista, warehouse associate…). */
export function isHourlyRole(title = "") {
  const t = String(title || "");
  return HOURLY.test(t) && !NOT_HOURLY.test(t) && !INTERN_ANY.test(t) && !isEarlyCareer(t) && !NOT_STUDENTS.test(t);
}
/** "intern" | "fulltime" (entry-level career job) | "hourly" (part-time & hourly) | null (not kept). */
export function kindOf(title = "", boardSaysIntern = false) {
  if (isInternship(title) || boardSaysIntern) return "intern";
  if (isEarlyCareer(title)) return "fulltime";
  return isHourlyRole(title) ? "hourly" : null;
}
/** Kept at all? (internship, entry-level, or part-time & hourly) */
export const isKept = (title = "") => isInternship(title) || isEarlyCareer(title) || isHourlyRole(title);
/** Extra keyword searches the job-board readers run for early-career roles (2 pages each, so syncs stay fast). */
/** Nov 13: entry-level job searches (hospitals, banks, clinics: "Medical Assistant" never says entry level). A search that finds nothing costs one request. */
export const ENTRY_QUERIES = ["medical assistant", "patient care", "nursing assistant", "pharmacy technician", "phlebotomist", "customer service", "teller", "receptionist", "administrative assistant", "new grad rn", "therapy aide", "rehab", "fitness", "exercise", "athletic trainer"];   // Nov 13: + exercise science / sports / rehab
/** Nov 13: part-time & hourly searches (stores, restaurants, warehouses only list these under their own words). */
export const HOURLY_QUERIES = ["sales associate", "cashier", "store associate", "team member", "crew member", "barista", "warehouse associate", "part time"];
export const EARLY_QUERIES = ["new grad", "entry level", "graduate", "associate", "early career", "rotational", "development program", "trainee", "student", "extern", "practicum", ...ENTRY_QUERIES, ...HOURLY_QUERIES];   // Nov 12: + student roles (isStudentRole) for health/education majors   // Nov 10: + 4 (a query that finds nothing costs one request)   // Nov 9: + "associate" (probed on 26 Workday boards: about as many new-grad roles again — "Associate Systems Engineer" etc.)
export const EARLY_PAGES = 4;      // Nov 10: 2 → 4 (keyword boards); Workday keeps paging while pages still hold early-career roles (EARLY_MAX_PAGES)
// ⚡ Turbo Sync (GitHub, no 60-second limit) reads deeper: up to 25 pages per search, so a big hospital or pharmacy board comes in whole
export const EARLY_MAX_PAGES = typeof process !== "undefined" && process.env && process.env.BTP_TURBO ? 25 : 8;
/** Postgres regex (PostgREST "imatch") that matches internship titles — /api/listings uses it for kind=intern|fulltime. */
const INTERN_PG_BASE = "(^|[^a-z])(intern|interns|internship|internships|co-?op|co-?ops|externship|summer (analyst|associate|scholar|program))([^a-z]|$)";
// Student roles too (stored rows already passed isStudentRole, so the Postgres side only needs the positive pattern)
export const INTERN_PG = `${INTERN_PG_BASE}|${STUDENT_ROLE.source.replace(/\\b/g, "\\y").replace(/\(\?! [^)]*\)\)/, "")}`;
/** Postgres version of the early-career rule (\\b → \\y). Full-time = matches this AND isn't an internship title, so
 *  internships a board flags without the word "intern" (BambooHR's employment type) never land under Full-time. */
export const EARLY_PG = `(${EARLY.source}|${ENTRY.source})`.replace(/\\b/g, "\\y");   // Nov 13: + entry-level jobs
/** One Postgres regex for "full-time": an early-career title that is NOT an internship title (negative lookahead).
 *  /api/listings uses title=imatch.<it> for full-time and title=not.imatch.<it> for internships — plain filters, no or()/and(). */
export const FULLTIME_PG = `^(?!.*${INTERN_PG}).*${EARLY_PG}`;

/** Field key for a title ("other" when nothing fits). */
export function fieldOf(title = "") {
  // Student roles: the job words ("Technician", "Program") would send them to the wrong area — the major decides
  const t0 = String(title || "");
  if (!INTERN_ANY.test(t0) && isStudentRole(t0)) {
    if (/\b(teach\w*|counsel\w*|social work|school|education)\b/i.test(t0)) return "education_social";
    if (/\b(physical therap\w*|occupational therap\w*|athletic train\w*|kinesiolog\w*|exercise)\b/i.test(t0)) return "exercise_sport";
    if (/\b(nurs\w*|radiolog\w*|rad tech|radiography|sonograph\w*|ultrasound|lab(oratory)?|respiratory|therap\w*|surgical|pharmacy|paramedic|ekg|dietetic|athletic|dental|diagnostic|clinical|extern|practicum|fieldwork|rotation|patient|medical|health)\b/i.test(t0)) return "science_health";
  }
  if (!INTERN_ANY.test(t0) && isEntryRole(t0) && !/\bengineer/i.test(t0) && /\b(therap\w*|rehab\w*|exercise|kinesiolog\w*|personal trainer|fitness|strength|athletic trainer|sports performance|wellness coach|health coach|\b(pt|ot) (aide|tech))\b/i.test(t0)) return "exercise_sport";
  // Entry-level health jobs (Nov 13): "Technician", "Representative" would send them to engineering/sales
  if (!INTERN_ANY.test(t0) && isEntryRole(t0) && /\b(medical|clinical|patient|nurs\w*|cna|rn|lpn|phlebotom\w*|pharmacy|ekg|monitor|telemetry|sterile|emt|emergency medical|unit (secretary|clerk)|health|scribe|dental|veterinary|vet|behavior\w*|rbt|mental health|psychiatric|caregiver|home health|personal care|direct support)\b/i.test(t0)) return "science_health";
  for (const [key, , rule] of FIELDS) if (rule.test(String(title || ""))) return key;
  return "other";
}
