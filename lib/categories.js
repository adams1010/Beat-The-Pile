// lib/categories.js — job categories the way job sites list them (Nov 14 2026). Shared by the server (/api/listings ?cat=)
// and /jobs (loaded as a browser module from /lib/categories.js). A job is in a category when its stored field is one of
// `fields` OR its title contains one of `words` (plain lowercase substrings, so the same list works as Postgres ILIKE and in JS).
// `ask` = words a student might type that mean "this whole category" ("healthcare", "nursing", "medical").

export const CATEGORIES = [
  { key: "healthcare", label: "Healthcare", fields: [],
    words: ["nurs", "medical", "patient", "clinic", "health", "pharm", "dental", "phlebot", "therap", "rehab", "caregiver", "care partner", "cna", "lpn", "hospital", "surgical", "radiolog", "sonograph", "veterinar", "physician", "paramedic", "respiratory", "dietitian", "nutrition", "behavior tech", "home care", "personal care", "x-ray", "ekg", "lab assistant", "scribe", "optometr", "audiolog", "midwife"],
    ask: ["healthcare", "health care", "health", "medical", "medicine", "hospital", "nursing", "nurse", "clinical", "clinic", "pharmacy", "dental", "doctor"] },
  { key: "retail", label: "Retail", fields: ["retail"],
    words: ["retail", "store", "cashier", "sales associate", "sales floor", "merchandis", "stocker", "stock associate", "beauty advisor", "key holder", "shift lead"],
    ask: ["retail", "store", "stores", "cashier", "shopping"] },
  { key: "customer_service", label: "Customer Service", fields: [],
    words: ["customer service", "customer support", "customer care", "customer success", "call center", "contact center", "member service", "client service", "guest service", "service representative", "service rep", "patient access", "help desk"],
    ask: ["customer service", "customer support", "call center", "support"] },
  { key: "food_hospitality", label: "Food & Hospitality", fields: ["hospitality"],
    words: ["restaurant", "cook", "chef", "food server", "restaurant server", "banquet server", "server assistant", "barista", "bartender", "hostess", "restaurant host", "dishwasher", "food", "kitchen", "hotel", "housekeep", "front desk", "banquet", "culinary", "catering", "busser", "dining", "bakery", "deli", "crew member", "valet", "concierge", "resort", "guest experience"],
    ask: ["food", "restaurant", "restaurants", "hospitality", "hotel", "hotels", "fast food", "cooking"] },
  { key: "admin", label: "Office & Admin", fields: [],
    words: ["administrative", "admin assistant", "office assistant", "office coordinator", "office manager", "receptionist", "data entry", "clerk", "secretary", "scheduler", "records", "file clerk", "front office", "executive assistant", "mailroom"],
    ask: ["admin", "administrative", "office", "receptionist", "secretary", "clerical"] },
  { key: "sales", label: "Sales", fields: ["sales"],
    words: ["sales", "account executive", "business development", "sdr", "bdr", "inside sales", "account manager", "territory"],
    ask: ["sales", "selling", "business development"] },
  { key: "education", label: "Education & Childcare", fields: ["education_social"],
    words: ["teacher", "teaching", "tutor", "educat", "school", "paraprofessional", "instructional", "childcare", "child care", "daycare", "preschool", "camp counselor", "youth", "classroom", "student teacher", "nanny", "early learning"],
    ask: ["education", "teaching", "teacher", "school", "tutoring", "childcare", "child care"] },
  { key: "warehouse", label: "Warehouse & Delivery", fields: ["supply_chain"],
    words: ["warehouse", "delivery", "driver", "package", "fulfillment", "logistic", "forklift", "material handler", "distribution", "shipping", "receiving", "courier", "loader", "picker", "packer", "inventory"],
    ask: ["warehouse", "delivery", "driving", "driver", "logistics", "shipping"] },
  { key: "tech", label: "Software & IT", fields: ["software", "cyber_it", "data"],
    words: ["software", "developer", "programmer", "it support", "it technician", "help desk", "network", "cyber", "data analyst", "data scien", "systems admin", "web develop", "devops", "cloud", "machine learning"],
    ask: ["tech", "it", "software", "coding", "programming", "computer", "computers", "cybersecurity", "data"] },
  { key: "engineering", label: "Engineering", fields: ["mechanical", "electrical", "chemical", "civil", "industrial", "engineering"],
    words: ["engineer"],
    ask: ["engineering", "engineer", "engineers"] },
  { key: "finance", label: "Finance & Accounting", fields: ["finance"],
    words: ["accounting", "accountant", "financ", "bank", "teller", "audit", "tax", "payroll", "bookkeep", "insurance", "underwrit", "loan", "credit", "invest"],
    ask: ["finance", "accounting", "banking", "bank", "money", "investment", "insurance"] },
  { key: "marketing", label: "Marketing & Media", fields: ["marketing"],
    words: ["marketing", "social media", "content", "communications", "media", "brand", "advertis", "public relations", "journalis", "writer", "editor", "video", "photograph"],
    ask: ["marketing", "media", "social media", "advertising", "communications", "journalism", "writing"] },
  { key: "hr", label: "HR & Recruiting", fields: ["people_hr"],
    words: ["human resources", "recruit", "talent acquisition", "people operations", "benefits"],
    ask: ["hr", "human resources", "recruiting", "recruiter"] },
  { key: "legal_gov", label: "Legal & Government", fields: ["legal_policy"],
    words: ["legal", "paralegal", "law clerk", "law firm", "lawyer", "attorney", "policy", "government", "public affairs", "legislat", "compliance", "court"],
    ask: ["legal", "law", "government", "policy", "politics", "paralegal"] },
  { key: "science", label: "Science & Research", fields: [],
    words: ["research", "laborator", "lab tech", "lab assistant", "scientist", "chemist", "biolog", "environment", "geolog", "field tech", "conservation", "wildlife"],
    ask: ["science", "research", "lab", "laboratory", "biology", "chemistry", "environmental"] },
  { key: "trades", label: "Trades & Maintenance", fields: [],
    words: ["technician", "maintenance", "electrician", "plumb", "hvac", "mechanic", "welder", "welding", "construction", "carpent", "installer", "apprentice", "machinist", "repair", "landscap", "groundskeep", "janitor", "custodian"],
    ask: ["trades", "trade", "maintenance", "construction", "technician", "mechanic"] },
  { key: "design", label: "Design & Product", fields: ["product_design"],
    words: ["design", "ux", "product manag", "graphic", "animat", "illustrat"],
    ask: ["design", "designer", "graphic design", "ux", "product"] },
  { key: "business", label: "Business & Operations", fields: ["consulting"],
    words: ["consult", "strategy", "operations", "business analyst", "project manag", "project coordinator", "program coordinator", "analyst program"],
    ask: ["business", "operations", "consulting", "management"] },
  { key: "security", label: "Security & Public Safety", fields: [],
    words: ["security officer", "security guard", "police", "firefight", "public safety", "loss prevention", "dispatcher", "corrections"],
    ask: ["security", "police", "public safety", "firefighter"] },
  // Nov 15: + golf courses & clubs, pools, ski resorts, theme parks, refs & umpires, marinas
  { key: "fitness", label: "Golf, Sports & Recreation", fields: ["exercise_sport"],
    words: ["fitness", "coach", "personal trainer", "lifeguard", "recreation", "athletic", "sports", "swim instructor", "gym",
      "golf", "caddie", "caddy", "cart attendant", "bag room", "pro shop", "course ranger", "groundskeeper", "greenskeeper", "clubhouse", "country club",
      "pool attendant", "pool staff", "ski instructor", "snowboard", "lift operator", "ride operator", "attraction", "amusement", "theme park", "water park",
      "referee", "umpire", "tennis", "marina", "dockhand", "deckhand", "bowling", "tour guide"],
    ask: ["fitness", "sports", "gym", "recreation", "coaching", "lifeguard", "golf", "golf course", "country club", "caddie", "pool", "ski", "theme park", "outdoors"] },
  // Nov 15: pet & animal care jobs (kennels, doggy daycare, pet stores' care roles, zoos, aquariums)
  { key: "pets", label: "Pets & Animal Care", fields: [],
    words: ["kennel", "pet care", "animal care", "dog walker", "dog bather", "dog handler", "doggy daycare", "dog daycare", "pet bather", "bather", "groomer", "grooming", "zoo", "aquarium", "veterinary assistant", "vet assistant", "animal shelter"],
    ask: ["pets", "pet", "animals", "animal", "dogs", "dog", "pet care", "animal care", "zoo"] },
];
// Nov 20: grad school paths (lib/gradpaths.js, /grad/). Hidden categories: not in the dropdown or the smart search, only
// reached by ?cat=path_<key> from /grad/. Same rule as any category (field or a title word). Words are plain substrings
// on the server (ILIKE), so short risky ones are written long ("emt-", "emt basic"; never a bare "emt" = "chemtech").
const CLIN = ["medical scribe", "scribe ", "scribe-", "scribe,", "medical assistant", "nursing assistant", "nurse aide", "nurse's aide", "nurse assistant", "cna", "patient care tech", "patient care assistant", "patient care associate", "emt-", "emt basic", "emt -", "emergency medical tech", "paramedic", "phlebotom", "patient sitter", "care partner", "unit secretary", "health unit coordinator", "ekg tech", "monitor tech", "ed tech", "emergency department tech", "er tech", "surgical tech", "sterile processing", "patient access", "medical receptionist", "hospital volunteer", "patient volunteer", "shadow", "observership", "pre-med", "premed", "pre-health", "clinical research", "clinical trial"];
const RESEARCH = ["research assistant", "research technician", "research tech", "research associate", "research intern", "research coordinator", "research aide", "lab assistant", "laboratory assistant", "lab technician", "laboratory technician", "lab tech", "undergraduate research", "summer research", "post-bacc", "postbacc", "post-baccalaureate", "reu "];
export const PATH_CATS = [
  { key: "path_premed", label: "Pre-med jobs", fields: [], words: [...CLIN, ...RESEARCH], ask: [], hidden: true },
  { key: "path_prepa", label: "Pre-PA jobs", fields: [], words: [...CLIN.filter((w) => !/research|trial|pre-med|premed/.test(w)), "physical therapy aide", "physical therapy tech", "rehab aide", "rehab tech", "athletic train", "ophthalmic tech", "dental assistant", "medical technician", "pharmacy tech"], ask: [], hidden: true },
  { key: "path_predental", label: "Pre-dental jobs", fields: [], words: ["dental assistant", "dental office", "dental front", "dental receptionist", "dental intern", "dental lab", "dental aide", "dental clinic", "dentist", "orthodont", "oral surgery", "oral surgeon", "periodont", "endodont", "pediatric dent", "shadow", "pre-dental", "predental", ...RESEARCH], ask: [], hidden: true },
  { key: "path_prept", label: "Pre-PT jobs", fields: [], words: ["physical therapy aide", "physical therapy tech", "pt aide", "pt tech", "rehab aide", "rehab tech", "rehabilitation aide", "rehabilitation tech", "therapy aide", "occupational therapy aide", "athletic train", "exercise physiolog", "strength and conditioning", "chiropract", "physical therapy student", "pre-pt", "shadow", "observership"], ask: [], hidden: true },
  { key: "path_prelaw", label: "Pre-law jobs", fields: [], words: ["paralegal", "legal assistant", "legal intern", "law clerk", "legal clerk", "legal secretary", "court ", "judicial", "legislative", "congressional", "public policy", "policy intern", "government affairs", "compliance", "litigation", "attorney", "public defender", "prosecutor", "district attorney", "docket", "legal", "law firm", "pre-law", "prelaw"], ask: [], hidden: true },
  { key: "path_research", label: "Research jobs", fields: [], words: [...RESEARCH, "research", "laboratory", "fellowship"], ask: [], hidden: true },
];
export const CAT = Object.fromEntries([...CATEGORIES, ...PATH_CATS].map((c) => [c.key, c]));

// Short words must match whole words in JS ("cna" in "CNA", never inside "acnaa"); long ones match anywhere.
const wordRe = (w) => w.length <= 3 ? new RegExp(`\\b${w.trim()}\\b`, "i") : new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
const RES = Object.fromEntries([...CATEGORIES, ...PATH_CATS].map((c) => [c.key, c.words.map(wordRe)]));

/** Is this listing in the category? (same rule the server uses) */
export function inCategory(key, l) {
  const c = CAT[key]; if (!c) return true;
  return c.fields.includes(l.field) || RES[key].some((r) => r.test(l.title || ""));
}

/** PostgREST group for ?cat= (goes inside and=(…)): or(field.in.(…),title.ilike.*w*,…) */
export function categoryGroup(key) {
  const c = CAT[key]; if (!c) return null;
  const parts = [];
  if (c.fields.length) parts.push(`field.in.(${c.fields.join(",")})`);
  for (const w of c.words) parts.push(`title.ilike.*${w.replace(/[(),*]/g, "").replace(/ /g, "%20")}*`);   // Nov 20: no trim, so "court " keeps its space
  return `or(${parts.join(",")})`;
}

/** What a typed search means: { cat, whole } — `whole` = the search IS the category ("healthcare jobs", "nursing"),
 *  otherwise the closest category for a "More … jobs near you" list ("medical assistant" → healthcare). */
export function categoryForQuery(q = "") {
  const t = String(q).toLowerCase().replace(/\b(jobs?|positions?|work|openings?|careers?|roles?|near me|part[- ]time|full[- ]time|entry[- ]level|interns?|internships?)\b/g, " ").replace(/[^a-z0-9 &-]/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return null;
  for (const c of CATEGORIES) if (c.ask.includes(t) || c.label.toLowerCase() === t) return { cat: c.key, whole: true };
  let best = null, bestN = 0;
  for (const c of CATEGORIES) {
    let n = 0;
    for (const a of c.ask) if (new RegExp(`\\b${a}\\b`).test(t)) n += 2;
    for (const r of RES[c.key]) if (r.test(t)) n += 1;
    if (n > bestN) { best = c.key; bestN = n; }
  }
  return best ? { cat: best, whole: false } : null;
}
