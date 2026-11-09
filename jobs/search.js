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
    medical: ["med", "medtech", "health", "healthcare", "clinical", "device", "devices", "surgical", "hospital", "patient", "pharma", "pharmaceutical", "biotech", "life sciences", "diagnostics"],
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
    biology: ["biological", "biotech", "life sciences", "lab", "research"],
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
  CO_SYN.health = CO_SYN.healthcare = CO_SYN.medtech = CO_SYN.medical;

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

  /** Parse a search box value into terms (each with its cousins). Empty → null. */
  function parse(q){
    const raw = words(q);
    const ts = raw.filter((w) => !STOP.has(w));
    const use = ts.length ? ts : raw;
    if (!use.length) return null;
    return use.slice(0, 8).map((w) => ({ w, syn: (SYN[w] || []).map(phrase).filter(Boolean), co: (CO_SYN[w] || []).map(phrase) }));
  }
  /** How well one job fits one term: 3 = the word itself, 2 = a cousin / company / typo, 1.5 = place, 0 = no. */
  function termScore(s, term, fieldLabel){
    const w = term.w;
    if (hasPhrase(s.t, w)) return 3;
    if (hasPhrase(s.c, w) || (w.length >= 3 && s.cw.some((x) => x.startsWith(w)))) return 2.5;
    if (w.length >= 4 && s.tw.some((x) => x.startsWith(w))) return 2.5;          // "mech" → mechanical
    if (term.syn.some((p) => hasPhrase(s.t, p))) return 2;
    if (term.co.some((p) => hasPhrase(s.c, p))) return 2;
    if (w.length >= 5 && s.tw.some((x) => x.length >= 5 && near1(x, w))) return 2;  // one typo
    if (hasPhrase(s.l, w) || (w.length === 2 && s.l.includes(" " + w + " "))) return 1.5;
    if (fieldLabel && w.length >= 4 && norm(fieldLabel).includes(w)) return 1;
    return 0;
  }
  /**
   * Rank jobs for a query. Returns { exact, similar, terms }: exact = fits every word (original order kept);
   * similar = fits some words (best first). similar is only filled when exact has fewer than `minExact` jobs.
   */
  function rank(jobs, q, { field = () => "", minExact = 12, maxSimilar = 300 } = {}){
    const terms = parse(q);
    if (!terms) return { exact: jobs.slice(), similar: [], terms: null };
    const exact = [], part = [];
    for (const j of jobs) {
      const s = prep(j); let all = true, sum = 0, hits = 0;
      for (const t of terms) { const v = termScore(s, t, field(j)); if (v < 1.5) all = false; if (v > 0) { sum += v; hits++; } }
      if (all) exact.push(j); else if (hits) part.push([j, sum + hits * 2]);   // more words matched beats one strong word
    }
    const similar = exact.length >= minExact ? [] : part.sort((a, b) => b[1] - a[1]).slice(0, maxSimilar).map((x) => x[0]);
    return { exact, similar, terms };
  }
  globalThis.btpJobSearch = { rank, parse, norm };
})();
