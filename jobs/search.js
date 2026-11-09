// /jobs/search.js (Nov 9) — job search that never comes back empty-handed.
// "medical sales" used to need those exact words in a row in the title, so it found nothing. Now:
//   1. Each word counts on its own, anywhere in the title, company or place ("Sales Intern" at "Stryker" fits "medical sales").
//   2. Common words have close cousins (sales → business development, account, commercial; medical → healthcare, medtech,
//      clinical, and the big medical-device companies), plurals and small typos ("enginering") still match.
//   3. Jobs that fit every word are the results. If there are only a few, jobs that fit some of the words come after,
//      under "Similar roles", best first — so a search shows something whenever anything is close.
// Plain browser script (also loaded by tests/jobsearch-test.mjs): sets globalThis.btpJobSearch.
(() => {
  const STOP = new Set("a an and or the of for in at to on with by intern interns internship internships job jobs role roles position positions opportunity opportunities program summer fall spring winter co op coop student students".split(" "));
  // Cousins of a word. Phrases are fine. Company names only ever match the company line.
  const SYN = {
    sale: ["business development", "account", "accounts", "commercial", "territory", "inside sales", "customer success", "revenue", "selling", "bdr", "sdr"],
    medical: ["med", "medtech", "healthcare", "clinical", "medical device", "surgical", "health", "hospital", "patient", "pharma", "pharmaceutical", "biotech", "life sciences", "diagnostics"],
    health: ["healthcare", "medical", "clinical", "hospital", "wellness", "patient"],
    healthcare: ["health", "medical", "clinical", "hospital", "patient"],
    pharma: ["pharmaceutical", "pharmacy", "drug", "biotech", "life sciences"],
    nurse: ["nursing", "rn", "clinical", "patient care"],
    software: ["developer", "swe", "programming", "full stack", "backend", "frontend", "web", "application", "coding"],
    developer: ["software", "engineer", "programmer", "swe"],
    programming: ["software", "developer", "coding"],
    data: ["analytics", "analyst", "data science", "machine learning", "bi", "business intelligence", "sql"],
    analytic: ["data", "analyst", "insights", "bi"],
    ai: ["machine learning", "ml", "artificial intelligence", "data science", "llm"],
    finance: ["financial", "accounting", "investment", "banking", "treasury", "fp a", "audit", "tax", "wealth"],
    financial: ["finance", "accounting", "investment"],
    accounting: ["accountant", "audit", "tax", "finance", "assurance"],
    bank: ["banking", "investment banking", "finance", "capital markets"],
    banking: ["bank", "finance", "capital markets"],
    marketing: ["brand", "digital marketing", "social media", "content", "communications", "advertising", "growth", "seo", "public relations"],
    media: ["social media", "content", "communications", "journalism", "video", "creative"],
    communication: ["communications", "pr", "public relations", "media", "content"],
    design: ["designer", "ux", "ui", "product design", "graphic", "creative", "visual"],
    designer: ["design", "ux", "ui", "graphic"],
    hr: ["human resources", "people", "talent", "recruiting", "recruiter"],
    recruiting: ["recruiter", "talent acquisition", "hr", "human resources"],
    consulting: ["consultant", "advisory", "strategy"],
    consultant: ["consulting", "advisory"],
    supply: ["supply chain", "logistics", "procurement", "operations", "purchasing", "sourcing"],
    logistic: ["logistics", "supply chain", "transportation", "warehouse", "distribution"],
    operation: ["operations", "ops", "supply chain", "production"],
    mechanical: ["mechanical engineering", "me", "aerospace", "manufacturing", "design engineer"],
    aerospace: ["aeronautical", "aviation", "space", "flight", "propulsion"],
    electrical: ["electronics", "ee", "hardware", "power", "controls"],
    civil: ["structural", "construction", "transportation", "geotechnical", "infrastructure"],
    construction: ["project engineer", "field engineer", "estimating", "estimator", "civil", "site"],
    chemical: ["process engineer", "chemistry", "materials"],
    manufacturing: ["production", "process", "industrial", "quality", "plant"],
    cyber: ["cybersecurity", "security", "infosec", "information security"],
    security: ["cybersecurity", "cyber", "infosec"],
    it: ["information technology", "help desk", "technical support", "systems", "network"],
    law: ["legal", "paralegal", "attorney", "compliance"],
    legal: ["law", "paralegal", "compliance", "contracts"],
    policy: ["government", "public policy", "legislative", "public affairs"],
    research: ["researcher", "r d", "laboratory", "lab", "scientist"],
    lab: ["laboratory", "research", "scientist", "technician"],
    biology: ["biological", "biotech", "life sciences", "lab", "laboratory", "microbiology", "molecular"],
    psychology: ["psychological", "behavioral", "mental health", "counseling", "counselor", "human factors", "clinical research", "user research", "therapy"],
    sociology: ["social services", "social work", "human services", "community", "nonprofit"],
    social: ["social media", "community", "social services", "social work", "nonprofit"],
    therapy: ["therapist", "rehab", "rehabilitation", "physical therapy", "occupational therapy", "clinical"],
    physical: ["physical therapy", "rehab", "rehabilitation", "physiotherapy"],
    kinesiology: ["exercise", "athletic", "physical therapy", "sports", "fitness", "rehab"],
    nutrition: ["dietetic", "dietitian", "food", "wellness"],
    english: ["writing", "writer", "editorial", "content", "communications", "copywriting"],
    writing: ["writer", "editorial", "content", "copywriter", "communications"],
    history: ["museum", "archive", "archival", "research", "education"],
    political: ["policy", "government", "public affairs", "legislative", "campaign"],
    economic: ["economics", "economist", "finance", "analyst", "policy"],
    economics: ["economist", "economic", "finance", "analyst"],
    math: ["mathematics", "quantitative", "actuarial", "statistics", "analyst"],
    mathematics: ["math", "quantitative", "actuarial", "statistics"],
    statistic: ["statistics", "statistical", "data", "analytics", "quantitative"],
    physic: ["physics", "optics", "research", "engineering"],
    chemistry: ["chemical", "chemist", "lab", "laboratory"],
    architecture: ["architectural", "design", "building", "construction"],
    hospitality: ["hotel", "events", "guest", "food beverage", "tourism"],
    fashion: ["apparel", "retail", "merchandising", "design"],
    film: ["video", "video production", "film production", "entertainment", "editing", "media"],
    device: ["medical device", "medtech", "instrument", "implant"],
    art: ["arts", "creative", "design", "museum", "gallery"],
    zoology: ["animal", "wildlife", "zoo", "aquarium", "marine", "ecology", "conservation", "veterinary", "biology"],
    ecology: ["environmental", "conservation", "wildlife", "field", "biology"],
    biomedical: ["biomedical engineering", "medical device", "medtech", "bioengineering", "clinical engineering", "biomechanical"],
    nursing: ["nurse", "rn", "patient care", "clinical", "healthcare", "hospital"],
    astronaut: ["space", "aerospace", "flight", "spacecraft", "launch"],
    space: ["aerospace", "spacecraft", "satellite", "launch", "propulsion"],
    pilot: ["aviation", "flight", "airline", "aircraft"],
    veterinary: ["animal", "vet", "veterinarian", "animal health"],
    environmental: ["environment", "sustainability", "energy", "ehs", "climate"],
    sustainability: ["environmental", "esg", "energy", "climate"],
    energy: ["power", "renewable", "utility", "solar", "wind", "oil", "gas"],
    education: ["teaching", "teacher", "tutor", "school", "curriculum"],
    teacher: ["teaching", "education", "tutor"],
    sport: ["sports", "athletics", "athletic"],
    product: ["product management", "product manager", "pm"],
    pm: ["product manager", "project manager", "product management"],
    project: ["project management", "project engineer", "project coordinator"],
    real: ["real estate", "property"],
    estate: ["real estate", "property"],
    insurance: ["underwriting", "actuarial", "claims", "risk"],
    actuarial: ["actuary", "insurance", "risk"],
    quality: ["qa", "quality assurance", "quality engineer", "testing"],
    remote: ["virtual", "work from home", "anywhere"],
  };
  // Medical companies whose titles rarely say "medical" (a Stryker sales intern is a medical sales intern).
  const CO_SYN = {
    medical: ["stryker", "medtronic", "boston scientific", "becton dickinson", "bd", "abbott", "zimmer", "smith nephew", "baxter", "intuitive",
      "edwards lifesciences", "hologic", "teleflex", "cardinal health", "mckesson", "owens minor", "henry schein", "cook medical", "steris",
      "dexcom", "insulet", "resmed", "olympus", "philips", "ge healthcare", "siemens healthineers", "johnson johnson", "j j", "medline",
      "integra", "globus medical", "nuvasive", "conmed", "arthrex", "penumbra", "masimo", "abiomed", "bausch", "alcon", "danaher", "beckman"],
  };
  CO_SYN.health = CO_SYN.healthcare = CO_SYN.medtech = CO_SYN.device = CO_SYN.medical;
  CO_SYN.pharma = CO_SYN.pharmaceutical = ["pfizer", "merck", "lilly", "eli lilly", "abbvie", "bristol myers squibb", "amgen", "gilead", "novartis",
    "astrazeneca", "sanofi", "gsk", "regeneron", "vertex", "biogen", "takeda", "bayer", "novo nordisk", "johnson johnson", "zoetis", "organon",
    "teva", "viatris", "genentech", "roche", "moderna", "boehringer", "otsuka", "daiichi", "astellas", "insmed", "jazz", "alkermes"];

  // A word → the job areas it belongs to (same rules as lib/geo.js fieldsForMajor), so a search always has a "closest
  // area" to fall back on: "zoology" → Science & Health, "psychology" → HR / Education / Science, "engineer" → engineering.
  const AREA = [
    [/^(mechanic|aerospace|aero|robotic|mechatronic|astronaut|space|satellite|aviation|pilot|flight)/, ["mechanical", "engineering"]], [/^(material|metallurg)/, ["chemical", "mechanical"]],
    [/^(electric|electronic|ee$|hardware|semiconductor|embedded)/, ["electrical", "engineering"]], [/^(civil|construct|structur|architect|surve|urban|transport)/, ["civil"]],
    [/^(chemical|process)/, ["chemical", "engineering"]], [/^(biomedical|bioengineer)/, ["mechanical", "electrical", "science_health"]],
    [/^(industrial|manufactur|production|quality|plant)/, ["industrial", "supply_chain"]], [/^(engineer)/, ["engineering", "mechanical", "electrical", "civil", "software"]],
    [/^(operation|supply|logistic|procure|purchas|warehouse)/, ["supply_chain", "industrial"]], [/^(computer|software|develop|program|cod|web|app|game)/, ["software", "data"]],
    [/^(data|statistic|analytic|math|actuar|quant|machine|ai$|ml$)/, ["data"]], [/^(cyber|security|it$|network|information|tech)/, ["cyber_it", "data"]],
    [/^(financ|account|econom|bank|invest|real$|estate|tax|audit|insur)/, ["finance", "consulting"]],
    [/^(market|advertis|brand|public|communica|journal|film|media|english|literat|linguist|writ|content|social)/, ["marketing"]],
    [/^(business|manage|entrepreneur|hospitality|sport|consult|strateg)/, ["consulting", "sales", "marketing", "supply_chain", "finance"]],
    [/^(sale|sell|account)/, ["sales"]], [/^(human|hr$|recruit|talent|people)/, ["people_hr"]],
    [/^(design|animat|art|photo|interior|fashion|graphic|ux|ui$|creative|product)/, ["product_design"]],
    [/^(bio|chemist|physic|astronom|health|nurs|pharm|medic|neuro|micro|nutrit|therap|veterin|dental|kinesio|exercis|athlet|physician|food|environment|sustainab|geolog|geograph|agricultur|forensic|cognitiv|zoolog|ecolog|clinic|lab|research|scien|marine|wildlife|animal)/, ["science_health"]],
    [/^(psych|sociolog|social|anthropolog|counsel|behavior)/, ["people_hr", "education_social", "science_health"]],
    [/^(educat|teach|tutor|school|childhood|nonprofit|communit)/, ["education_social"]],
    [/^(law|legal|politic|policy|government|international|criminal|philosoph|history|religio|classic|gender|spanish|liberal)/, ["legal_policy", "education_social"]],
    [/^(culinar|theat|danc|music)/, ["marketing", "education_social"]],
  ];
  const areasOf = (w) => { const out = new Set(); for (const [re, f] of AREA) if (re.test(w)) f.forEach((x) => out.add(x)); return [...out]; };
  function dist(a, b, max){   // edit distance with swaps (Damerau), stops early past `max`
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let p2 = null, p = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const c = [i]; let best = i;
      for (let j = 1; j <= b.length; j++) {
        let v = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (p2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, p2[j - 2] + 1);
        c.push(v); if (v < best) best = v;
      }
      if (best > max) return max + 1;
      p2 = p; p = c;
    }
    return p[b.length];
  }
  const norm = (s) => String(s || "").toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
  const stem = (w) => w.length > 4 && w.endsWith("ies") ? w.slice(0, -3) + "y" : w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w;
  const words = (s) => norm(s).split(" ").filter(Boolean).map(stem);
  const phrase = (s) => words(s).join(" ");
  // whole-word phrase match inside a " a b c " string
  const hasPhrase = (hay, p) => p && hay.includes(" " + p + " ");
  function near1(a, b){   // edit distance ≤ 1 (one typo), for words of 5+ letters
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0, j = 0, d = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++d > 1) return false;
      if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
    }
    return d + (a.length - i) + (b.length - j) <= 1;
  }
  const prep = (j) => j._s || (j._s = {
    t: " " + words(j.title).join(" ") + " ", tw: words(j.title),
    c: " " + words(j.company).join(" ") + " ", cw: words(j.company),
    l: " " + words(j.location || "").join(" ") + " ",
  });

  // Words people actually see in job titles (built from the jobs on the page) + every word we know a cousin for.
  let VOCAB = { key: "", freq: new Map() };
  function vocab(jobs){
    const key = jobs.length + ":" + (jobs[0]?.id || "") + ":" + (jobs[jobs.length - 1]?.id || "");
    if (VOCAB.key === key) return VOCAB.freq;
    const freq = new Map();
    for (const w of Object.keys(SYN)) freq.set(w, 50);
    for (const w of Object.keys(CO_SYN)) freq.set(w, 50);
    for (const v of Object.values(SYN)) for (const p of v) for (const w of words(p)) if (!freq.has(w)) freq.set(w, 5);
    for (const j of jobs) { const s = prep(j);   // title words count most; company and place words are real words too (never "fix" them)
      for (const w of s.tw) if (w.length >= 3 && !/\d/.test(w)) freq.set(w, (freq.get(w) || 0) + 1);
      for (const w of s.cw.concat(s.l.trim().split(" "))) if (w.length >= 3 && !/\d/.test(w) && !freq.has(w)) freq.set(w, 0); }
    VOCAB = { key, freq };
    return freq;
  }
  /** A misspelled word → the closest real word (1 typo for 5–7 letters, 2 for longer). null = it's fine as typed. */
  function correct(w, freq){
    if (w.length < 5 || freq.has(w) || STOP.has(w)) return null;
    for (const k of freq.keys()) if (k.length >= w.length + 3 && k.startsWith(w)) return null;   // a fragment ("mech")
    const max = w.length >= 8 ? 2 : 1;
    let best = null, bd = max + 1, bf = 0;
    for (const [k, f] of freq) {
      if (Math.abs(k.length - w.length) > max || k[0] !== w[0] && max < 2) continue;
      const d = dist(w, k, max);
      if (d < bd || (d === bd && f > bf)) { best = k; bd = d; bf = f; }
    }
    return bd <= max ? best : null;
  }
  /** Parse a search box value into terms (each with its cousins). Empty → null. */
  function parse(q, freq){
    const raw = words(q).map((w) => (freq && correct(w, freq)) || w);
    const ts = raw.filter((w) => !STOP.has(w));
    const use = ts.length ? ts : raw;
    if (!use.length) return null;
    const own = new Set(use);   // a cousin that is another word you typed can't stand in for this one ("biology research")
    return use.slice(0, 8).map((w) => ({ w, syn: (SYN[w] || []).map(phrase).filter((p) => p && !p.split(" ").some((x) => own.has(x))), co: (CO_SYN[w] || []).map(phrase), areas: areasOf(w) }));
  }
  /** How well one job fits one term: 3 = the word itself, 2 = a cousin / company / typo, 1.5 = place, 0 = no. */
  function termScore(s, term, fieldLabel, fieldKey){
    const w = term.w;
    if (hasPhrase(s.t, w)) return 3;
    // a word start counts only when it's clearly a fragment of a longer word: "mech" → mechanical, never "sales" → Salem
    if (hasPhrase(s.c, w) || (w.length >= 3 && s.cw.some((x) => x.length >= w.length + 3 && x.startsWith(w)))) return 2.5;
    if (w.length >= 4 && s.tw.some((x) => x.length >= w.length + 3 && x.startsWith(w))) return 2.5;
    const si = term.syn.findIndex((p) => hasPhrase(s.t, p));
    if (si >= 0) return 2.4 - Math.min(si, 8) * 0.05;                               // closer cousins are listed first
    if (term.co.some((p) => hasPhrase(s.c, p))) return 2;
    if (w.length >= 5 && s.tw.some((x) => x.length >= 5 && near1(x, w))) return 2;  // one typo
    if (hasPhrase(s.l, w) || (w.length === 2 && s.l.includes(" " + w + " "))) return 1.5;
    if (fieldLabel && w.length >= 4 && norm(fieldLabel).includes(w)) return 1;
    if (fieldKey && term.areas.includes(fieldKey)) return 0.8;                     // same job area: the closest thing we have
    return 0;
  }
  /**
   * Rank jobs for a query. Returns { exact, similar, terms }: exact = fits every word (original order kept);
   * similar = fits some words (best first). similar is only filled when exact has fewer than `minExact` jobs.
   */
  function rank(jobs, q, { field = () => "", fieldKey = (j) => j.field || "", minExact = 12, maxSimilar = 300 } = {}){
    const freq = vocab(jobs);
    const typed = words(q).filter((w) => !STOP.has(w));
    const terms = parse(q, freq);
    if (!terms) return { exact: jobs.slice(), similar: [], terms: null, fixed: null };
    // "Did you mean": the words we corrected (shown on the page so the change is never silent)
    const fixedWords = terms.map((t) => t.w), fixed = typed.length && typed.join(" ") !== fixedWords.join(" ") ? fixedWords.join(" ") : null;
    const exact = [], part = [];
    for (const j of jobs) {
      const s = prep(j); let all = true, sum = 0, hits = 0;
      for (const t of terms) { const v = termScore(s, t, field(j), fieldKey(j)); if (v < 1.5) all = false; if (v > 0) { sum += v; hits++; } }
      if (all) exact.push([j, sum]); else if (hits) part.push([j, sum + hits * 2]);   // more words matched beats one strong word
    }
    // Closest fits first: your exact words, then close cousins ("Medical Sales Intern" before "Sales Intern" at a medical
    // company; "Economics" before "Analyst"). Ties keep the page's order (newest / nearest) — sort is stable.
    exact.sort((a, b) => b[1] - a[1]);
    const similar = exact.length >= minExact ? [] : part.sort((a, b) => b[1] - a[1]).slice(0, maxSimilar).map((x) => x[0]);
    return { exact: exact.map((x) => x[0]), similar, terms, fixed };
  }
  globalThis.btpJobSearch = { rank, parse, norm };
})();
