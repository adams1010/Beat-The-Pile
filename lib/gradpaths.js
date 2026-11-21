// lib/gradpaths.js — grad school paths (Nov 20 2026, owner: "lets do them all"). Shared by /grad/ (loaded as a browser
// module) and the tests. Three things per path:
//   1. jobs: a /jobs category key (lib/categories.js PATH_CATS) = the jobs that count toward that school
//   2. hours: what to log, with targets that come from a cited source (never made up)
//   3. timeline(): dated steps from the grad year, built from the 2026 cycle's published dates (labeled that way)
// Every number shown to students has a `src` with a link. Advice without a source is labeled "Our advice" on the page.

export const SRC = {
  nwShadow: { label: "Northwestern Health Professions Advising, 2025-26", url: "https://www.northwestern.edu/health-professions-advising/advising-tools/experiences/25-26-volunteering-and-shadowing-hours.pdf" },
  nwVol: { label: "Northwestern Health Professions Advising, accepted MD applicants 2022-23", url: "https://www.northwestern.edu/health-professions-advising/docs/volunteering-and-shadowing-hours.pdf" },
  aamcService: { label: "AAMC, record enrollment news, 2025", url: "https://www.aamc.org/news/us-medical-schools-enroll-record-number-students-2025" },
  aamcGap: { label: "UConn Pre-Med (AAMC Matriculating Student Questionnaire 2023)", url: "https://premed.uconn.edu/growth-years/" },
  aamcAlt: { label: "AAMC, Five ways to gain experience without shadowing", url: "https://students-residents.aamc.org/choosing-medical-career/article/five-ways-gain-experience-without-shadowing/" },
  amcas2027: { label: "AAMC 2027 AMCAS webinar slides", url: "https://cdn.ocs.yale.edu/wp-content/uploads/sites/77/2026/04/2027-AMCAS-Opening-Webinar-for-Applicants-Slides-2.pdf" },
  mcatReg: { label: "AAMC, 2027 MCAT registration opening", url: "https://students-residents.aamc.org/register-mcat-exam/2027-mcat-registration-opening" },
  mcatYear: { label: "AAMC, Register for the MCAT exam", url: "https://students-residents.aamc.org/register-mcat-exam" },
  aapaHours: { label: "AAPA, PA Education: Preparation for Excellence", url: "https://www.aapa.org/download/95921" },
  caspa: { label: "CASPA Applicant Help Center, cycle dates", url: "https://help.liaisonedu.com/CASPA_Applicant_Help_Center/Starting_Your_CASPA_Application/Getting_Started_with_Your_CASPA_Application/2_CASPA_Application_Cycle_Dates" },
  uscPa: { label: "USC Keck PA program, application cycle updates", url: "https://keck.usc.edu/physician-assistant-program/admission/application/" },
  aadsas: { label: "ADEA, Applying to dental school with ADEA AADSAS", url: "https://www.adea.org/godental/Apply/apply-to-adea-aadsas" },
  dentShadow: { label: "University of Minnesota School of Dentistry, Preparing to apply", url: "https://dentistry.umn.edu/doctor-dental-surgery/preparing-apply" },
  ptcasSummary: { label: "PTCAS 2026-27 application requirements summary", url: "https://www.bard.edu/wwwmedia/files/1594169/4/DPT Application Summary 2026-2027.pdf" },
  ptcasOpen: { label: "UCSF Physical Therapy, application timeline", url: "https://ptrehab.ucsf.edu/node/5146" },
  ptWisc: { label: "UW-Madison DPT, shadowing and observation", url: "https://www.med.wisc.edu/education/physical-therapy-program/how-to-apply/shadowing-and-observation" },
  lsat: { label: "LSAC, upcoming LSAT dates", url: "https://www.lsac.org/jd/lsat/test-dates-deadlines/" },
  lsacEarly: { label: "LSAC, Keeping Up to Data, April 2026", url: "https://www.lsac.org/podcast/keeping-data-april-2026" },
  lsacVolume: { label: "LSAC, Keeping Up to Data, September 2026", url: "https://www.lsac.org/index%2ephp/podcast/keeping-data-september-2026" },
  hlsWork: { label: "The Harvard Crimson, Law School admissions and work experience", url: "https://www.thecrimson.com/article/2015/4/9/hls-admissions-work-experience" },
  aba509: { label: "ABA Standard 509 Required Disclosures", url: "https://www.abarequireddisclosures.org/" },
  grfp: { label: "NSF GRFP solicitation (FY 2027)", url: "https://www.nsf.gov/funding/opportunities/grfp-nsf-graduate-research-fellowship-program/nsf26-526/solicitation" },
  phdDeadlines: { label: "Yale Graduate School, dates and deadlines", url: "https://gsas.yale.edu/admissions/phdmasters-application-process/dates-deadlines" },
  msar: { label: "AAMC MSAR (official medical school profiles)", url: "https://students-residents.aamc.org/medical-school-admission-requirements/medical-school-admission-requirements-reports-applicants-and-advisors" },
};

// Kinds of hours a student can log. `cas` = the experience type name the application service uses (for the export).
export const HOUR_TYPES = [
  { key: "clinical", label: "Clinical (paid)", cas: "Paid Employment, Clinical" },
  { key: "clinical_vol", label: "Clinical (volunteer)", cas: "Community Service/Volunteer, Medical/Clinical" },
  { key: "patient_care", label: "Patient care", cas: "Patient Care Experience" },
  { key: "shadowing", label: "Shadowing", cas: "Physician Shadowing/Clinical Observation" },
  { key: "volunteer", label: "Volunteer (non-clinical)", cas: "Community Service/Volunteer, Not Medical/Clinical" },
  { key: "research", label: "Research", cas: "Research/Lab" },
  { key: "work", label: "Work (other)", cas: "Paid Employment, Not Military" },
  { key: "leadership", label: "Leadership", cas: "Leadership, Not Listed Elsewhere" },
];
export const HOUR_KEYS = HOUR_TYPES.map((h) => h.key);

export const PATHS = [
  { key: "premed", label: "Pre-med", school: "Medical school (MD/DO)", jobs: "path_premed",
    blurb: "Clinical jobs, research and shadowing that count toward medical school.",
    jobsNote: "Scribe, CNA, EMT, medical assistant, phlebotomy, patient care tech, research assistant and shadowing.",
    targets: [
      { types: ["shadowing"], hours: 50, label: "Shadowing", note: "Around 25 to 50 hours of shadowing is a good goal.", src: "nwShadow" },
      { types: ["clinical_vol"], hours: 100, label: "Clinical volunteering", note: "More than 100 hours of clinical volunteering is a good goal.", src: "nwVol" },
      { types: ["volunteer"], hours: 100, label: "Non-clinical volunteering", note: "More than 100 hours of non-clinical volunteering is a good goal.", src: "nwVol" },
    ],
    facts: [
      { text: "73.2% of medical students took at least one gap year before medical school (2023 survey).", src: "aamcGap" },
      { text: "2025 matriculants averaged 717 community service hours each.", src: "aamcService" },
      { text: "87% of admissions officers surveyed accept another activity in place of physician shadowing.", src: "aamcAlt" },
    ],
    cas: "AMCAS" },
  { key: "prepa", label: "Pre-PA", school: "Physician assistant school", jobs: "path_prepa",
    blurb: "Hands-on patient care jobs. PA programs count these hours closely.",
    jobsNote: "CNA, EMT, medical assistant, patient care tech, scribe, phlebotomy, surgical tech and rehab aides.",
    targets: [
      { types: ["patient_care", "clinical", "clinical_vol"], hours: 1000, label: "Patient care", note: "Some programs now require at least 1,000 patient care hours (USC, starting 2027-28).", src: "uscPa" },
      { types: ["shadowing"], hours: 50, label: "PA shadowing", note: "Programs set their own shadowing rules. Check each program; 50 is a starting goal.", src: null },
    ],
    facts: [
      { text: "Incoming PA students bring an average of more than 3,000 hours of patient contact.", src: "aapaHours" },
      { text: "Some PA programs no longer count roles like pharmacy technician or patient escort as patient care.", src: "uscPa" },
    ],
    cas: "CASPA" },
  { key: "predental", label: "Pre-dental", school: "Dental school", jobs: "path_predental",
    blurb: "Dental assisting, front office and shadowing at dental offices.",
    jobsNote: "Dental assistant, dental front desk, orthodontic and oral surgery offices, plus research.",
    targets: [
      { types: ["shadowing"], hours: 40, label: "Dental shadowing", note: "Some schools require 40 hours, half in general dentistry (Minnesota).", src: "dentShadow" },
    ],
    facts: [{ text: "Each dental school sets its own shadowing rule, so check the schools you're applying to.", src: "dentShadow" }],
    cas: "AADSAS" },
  { key: "prept", label: "Pre-PT", school: "Physical therapy school (DPT)", jobs: "path_prept",
    blurb: "Rehab, PT aide and athletic training jobs plus observation hours.",
    jobsNote: "Physical therapy aide or tech, rehab aide, athletic training, occupational therapy aide.",
    targets: [
      { types: ["shadowing"], hours: 40, label: "PT observation", note: "40 hours is a common minimum (UW-Madison); 67% of PTCAS programs require shadowing hours.", src: "ptWisc" },
    ],
    facts: [{ text: "67% of PTCAS programs require PT shadowing hours and 30% recommend them (2026-27).", src: "ptcasSummary" }],
    cas: "PTCAS" },
  { key: "prelaw", label: "Pre-law", school: "Law school (JD)", jobs: "path_prelaw",
    blurb: "Paralegal, legal assistant, court and government jobs, plus law school numbers.",
    jobsNote: "Paralegal, legal assistant, law clerk, court and legislative jobs, compliance and policy.",
    targets: [],
    facts: [
      { text: "82,487 people applied to law school in the 2026 cycle, up 7.9% from 2025.", src: "lsacVolume" },
      { text: "Roughly three-fourths of each incoming Harvard Law class has some work experience after college.", src: "hlsWork" },
      { text: "Applicants are applying earlier in the cycle, with many more applications in before January.", src: "lsacEarly" },
    ],
    cas: "LSAC" },
  { key: "research", label: "PhD & research", school: "PhD programs", jobs: "path_research",
    blurb: "Research assistant, lab tech and research internships that lead to a PhD.",
    jobsNote: "Research assistant, lab technician, research intern, post-bacc and REU-style programs.",
    targets: [],
    facts: [
      { text: "NSF Graduate Research Fellowship deadlines run October 19 to 23, 2026, by field.", src: "grfp" },
      { text: "Many PhD programs close December 1 or December 15 for fall entry.", src: "phdDeadlines" },
    ],
    cas: null },
];
export const PATH = Object.fromEntries(PATHS.map((p) => [p.key, p]));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const at = (y, m, when = "") => ({ y, m, when: `${when ? when + " " : ""}${MONTHS[m - 1]} ${y}` });

/** Dated steps for a path. gradYear = the spring the student finishes college. gap = take a year off before starting.
 *  The cycle opens in the year BEFORE you'd start the program, so: start = gradYear (+1 with a gap year) + ... see below.
 *  Days come from the 2026 cycle's published dates (src); later years follow the same pattern, so they're "around". */
export function timeline(pathKey, gradYear, gap = true) {
  const g = +gradYear; if (!PATH[pathKey] || !(g >= 2024 && g <= 2040)) return [];
  const start = g + (gap ? 1 : 0) + (pathKey === "research" || pathKey === "prelaw" ? 0 : 0);   // program starts the fall after you finish (+gap)
  const A = start - 1;            // the application cycle opens the spring/summer of the year before you start
  const S = [];
  const add = (d, title, detail, src, kind = "step") => S.push({ ...d, title, detail, src, kind });
  if (pathKey === "premed") {
    add(at(A - 1, 10, "Late"), "Register for the MCAT", "Registration for a whole testing year opens in late October the year before.", "mcatReg");
    add(at(A, 1, ""), "Take the MCAT (Jan to Sep)", "The MCAT runs January through September. Testing in spring leaves time to retake.", "mcatYear");
    add(at(A, 3), "Ask for recommendation letters", "Give writers a couple of months before you submit.", null, "advice");
    add(at(A, 5, "Early"), "AMCAS opens", "In the 2026 cycle it opened May 5, with submission from May 28.", "amcas2027");
    add(at(A, 6), "Submit early", "Schools start receiving verified applications in late June (June 26 in 2026).", "amcas2027");
    add(at(A, 7), "Secondary applications", "Schools send their own essays after your AMCAS is verified.", null, "advice");
    add(at(A, 9), "Interviews (Sep to Mar)", "Most interviews happen in the fall and winter.", null, "advice");
    add(at(start, 8), "Start medical school", gap ? "After your gap year." : "Right after graduation.", null, "goal");
  } else if (pathKey === "prepa") {
    add(at(A - 2, 9), "Start patient care hours", "Paid patient care takes time to add up, so start early.", "aapaHours", "advice");
    add(at(A, 4, "Late"), "CASPA opens", "The 2026-27 cycle opened April 30, 2026.", "caspa");
    add(at(A, 5), "Submit early", "Many programs review on a rolling basis, and deadlines can be months before the cycle closes.", "caspa");
    add(at(A, 9), "Interviews (fall)", "Most programs interview in the fall and winter.", null, "advice");
    add(at(start, 6), "Start PA school", "Start dates vary by program (summer or fall).", null, "goal");
  } else if (pathKey === "predental") {
    add(at(A, 3), "Take the DAT", "Take it by spring of the year you apply so scores are in when you submit.", null, "advice");
    add(at(A, 5, "Mid"), "AADSAS opens", "The 2026-27 cycle opened May 12, 2026.", "aadsas");
    add(at(A, 6, "Early"), "Submit early", "Submission opens about three weeks after the cycle opens.", "aadsas");
    add(at(A, 12, "Mid"), "First acceptances", "Schools could start sending acceptances December 15 in the 2026-27 cycle.", "aadsas");
    add(at(start, 8), "Start dental school", "", null, "goal");
  } else if (pathKey === "prept") {
    add(at(A - 1, 9), "Finish observation hours", "Many programs want observation verified by a licensed PT.", "ptWisc", "advice");
    add(at(A, 6, "Mid"), "PTCAS opens", "The cycle opened June 15, 2026 for 2027 starts.", "ptcasOpen");
    add(at(A, 8), "Early deadlines (Aug to Oct)", "Many programs have priority deadlines in the fall.", "ptcasSummary");
    add(at(start, 6), "Start PT school", "Start dates vary by program (summer or fall).", null, "goal");
  } else if (pathKey === "prelaw") {
    add(at(A, 5), "Plan your LSAT", "The LSAT runs August through June. Summer and early fall dates leave time to retake.", "lsat", "advice");
    add(at(A, 8), "Take the LSAT (Aug to Nov)", "The 2026-27 LSAT dates start in August.", "lsat");
    add(at(A, 9), "Applications open", "Most schools use rolling admissions, so earlier is better.", "lsacEarly");
    add(at(A, 11), "Submit before January", "Applicants are applying earlier; many more applications come in before January.", "lsacEarly");
    add(at(start, 8), "Start law school", gap ? "Many students work a year or more first." : "", "hlsWork", "goal");
  } else if (pathKey === "research") {
    add(at(A, 5), "Line up letters and research", "Ask your research mentor for a letter early.", null, "advice");
    add(at(A, 10, "Mid"), "NSF GRFP deadline", "October 19 to 23, 2026, depending on your field.", "grfp");
    add(at(A, 12, "Early"), "PhD deadlines (Dec 1 to 15)", "Many programs close December 1 or 15.", "phdDeadlines");
    add(at(start, 8), "Start your PhD", "", null, "goal");
  }
  return S.sort((a, b) => a.y - b.y || a.m - b.m);
}

/** Totals by hour type from a hours log. */
export function totals(log = []) {
  const t = Object.fromEntries(HOUR_KEYS.map((k) => [k, 0]));
  for (const h of log) if (t[h?.type] != null) t[h.type] += Math.max(0, +h.hours || 0);
  return t;
}
/** Progress against a path's targets: [{label, have, goal, pct, note, src}] */
export function progress(pathKey, log = []) {
  const p = PATH[pathKey]; if (!p) return [];
  const t = totals(log);
  return p.targets.map((x) => { const have = x.types.reduce((n, k) => n + (t[k] || 0), 0);
    return { label: x.label, have, goal: x.hours, pct: Math.min(100, Math.round((have / x.hours) * 100)), note: x.note, src: x.src }; });
}

/** CSV rows ready to copy into an application's Experiences section. */
export function exportRows(log = []) {
  const T = Object.fromEntries(HOUR_TYPES.map((h) => [h.key, h]));
  const head = ["Experience type", "Organization", "Role", "Start", "End", "Total hours", "Contact", "Description"];
  const rows = log.map((h) => [T[h.type]?.cas || "", h.org || "", h.role || "", h.start || "", h.end || "", String(+h.hours || 0), h.contact || "", h.notes || ""]);
  return [head, ...rows];
}

/** Server-side cleaning for user_jobs.grad (api/me.js grad_save). */
export function cleanGrad(g) {
  if (!g || typeof g !== "object") return null;
  const s = (v, n) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
  const ym = (v) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(v || "")) ? String(v) : "";
  const hours = (Array.isArray(g.hours) ? g.hours : []).slice(0, 60).map((h) => ({
    id: /^[a-z0-9-]{4,40}$/i.test(String(h?.id || "")) ? String(h.id) : Math.random().toString(36).slice(2, 12),
    type: HOUR_KEYS.includes(h?.type) ? h.type : "clinical",
    org: s(h?.org, 120), role: s(h?.role, 120), hours: Math.max(0, Math.min(20000, Math.round((+h?.hours || 0) * 10) / 10)),
    start: ym(h?.start), end: ym(h?.end) || (h?.end === "present" ? "present" : ""), contact: s(h?.contact, 160), notes: s(h?.notes, 700),
  })).filter((h) => h.org || h.role || h.hours);
  const gpa = +g.gpa, lsat = +g.lsat;
  return { path: PATH[g.path] ? g.path : null, gradYear: +g.gradYear >= 2024 && +g.gradYear <= 2040 ? +g.gradYear : null, gap: g.gap !== false,
    gpa: gpa >= 0 && gpa <= 4.33 ? Math.round(gpa * 100) / 100 : null, lsat: lsat >= 120 && lsat <= 180 ? Math.round(lsat) : null, hours };
}
