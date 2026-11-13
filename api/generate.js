// /api/generate.js — the homepage's AI features. The browser NEVER sends a prompt: it names a feature and sends
// that feature's fields; the prompt is built here from fixed templates, with every field length-capped.
// So nobody can use this endpoint as a free general-purpose Claude.
//
//   POST /api/generate { feature, input }   → { text }
//   features: reasons · resume_builder · cover_letter · followup · score · interview_prep · interview_turn · intel · profile_fill · intern_bullets
//
// Controls (all shared across every server, stored in Postgres):
//   - Origin/Referer must be our own site. That only stops other websites' browsers — it is NOT authentication.
//   - Per-visitor rate limit (rate_take), plus a site-wide hourly ceiling.
//   - Every call reserves its worst-case cost against the monthly cap first (lib/aiusage.js callClaude). Fails closed.
import { callClaude, rateOk, AIError } from "../lib/aiusage.js";

const PER_IP_10MIN = 20;
const SITE_PER_HOUR = 400;

const str = (v, n) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ").trim().slice(0, n);
const list = (v, n, len) => (Array.isArray(v) ? v : []).map((x) => str(x, len)).filter(Boolean).slice(0, n);
const num = (v, lo, hi, d) => { const x = Number(v); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, Math.round(x))) : d; };

function student(s) {
  return { fullName: str(s?.fullName, 80), major: str(s?.major, 120), school: str(s?.school, 120), gradDate: str(s?.gradDate, 30),
           gpa: str(s?.gpa, 10), skills: str(s?.skills, 300), whyMe: str(s?.whyMe, 300) };
}

/** Each feature: (input) → { prompt, maxTokens, temperature } or throws a 400 message. */
export const FEATURES = {
  // /internship/ weekly log → resume bullets. Copy, never invent.
  intern_bullets(i) {
    const role = str(i?.role, 120), company = str(i?.company, 100);
    const entries = (Array.isArray(i?.entries) ? i.entries : []).slice(0, 20)
      .map((e, n) => `Week ${n + 1}: did: ${str(e?.did, 600)} | learned: ${str(e?.learned, 300)} | win: ${str(e?.win, 300)}`).join("\n");
    if (entries.length < 40) throw new AIError("Add a few weekly log entries first", 400);
    return { maxTokens: 900, temperature: 0.2, prompt: `A student wrote a weekly log during their internship as ${role || "an intern"} at ${company || "a company"}. Turn it into 4-6 strong resume bullet points.

Rules: use ONLY facts in the log, never invent numbers, tools, results or scope. Start each bullet with a strong past-tense verb. If a number would help but isn't in the log, write [number] as a placeholder for the student to fill in. Keep each bullet under 25 words.

LOG:
${entries}

Return ONLY a JSON array of strings. No other text.` };
  },

  // /u/ "Fill my profile from my resume": resume text → profile fields as JSON. Copy, never invent.
  profile_fill(i) {
    const resume = str(i?.resume, 12000);
    if (resume.length < 80) throw new AIError("We couldn't read enough of that resume", 400);
    return { maxTokens: 2500, temperature: 0, prompt: `Turn this resume into profile fields for a student's career profile page. COPY what the resume says, do not invent, guess or embellish anything. If something isn't in the resume, use "" (or [] for lists). Keep the student's own wording for bullet points; join a role's bullets into one or two plain sentences.

RESUME:
${resume}

Return ONLY this JSON (no other text):
{"name":"full name","headline":"short line like 'Mechanical Engineering student at Virginia Tech' built only from facts in the resume","school":"current college/university (not high school)","major":"major only, e.g. Mechanical Engineering","gradYear":2028,"location":"City, ST if listed","about":"2-3 sentences summarizing ONLY what the resume shows (objective/summary if present)","skills":["up to 20 skills, tools, languages listed"],"experience":[{"title":"role","org":"employer or organization","when":"dates as written, e.g. May 2025 – Aug 2025","desc":"what they did, from the bullets"}],"projects":[{"name":"project name","desc":"from the resume","link":"https link only if written in the resume"}],"links":{"linkedin":"https URL if listed","github":"https URL if listed","portfolio":"https URL if listed"}}
Rules: gradYear is the expected graduation year as a number, or null. Experience = jobs, internships, research, leadership roles (most recent first, at most 8). Projects at most 6. Links must start with https://, add https:// to a bare linkedin.com/github.com address from the resume; otherwise "".` };
  },

  reasons(i) {
    const resume = str(i?.resume, 3000);
    const cos = (Array.isArray(i?.companies) ? i.companies : []).slice(0, 30)
      .map((c, n) => `${n + 1}. ${str(c?.name, 100)}, ${str(c?.role, 120)} (${str(c?.industry, 60) || "—"})`);
    if (resume.length < 80 || !cos.length) throw new AIError("Add a resume first", 400);
    return { maxTokens: 3000, temperature: 0, prompt: `A college student has a resume and a list of internship companies. For each company, write ONE specific, honest sentence about why it fits THIS student based on their resume. Reference real things from the resume (specific skills, projects, classes, leadership). No generic "you'd be a great fit", be specific. Never invent anything that is not in the resume.

STUDENT RESUME:
${resume}

COMPANIES (in order):
${cos.join("\n")}

Return ONLY a JSON array, in the same order as the companies. Each entry: {"i":1,"reason":"one specific sentence tying their resume to this company"}. No other text.` };
  },

  resume_builder(i) {
    const majors = str(i?.majors, 160), skills = list(i?.skills, 30, 60).join(", ") || "(no skills listed yet)";
    const acts = (Array.isArray(i?.activities) ? i.activities : []).slice(0, 15).map((a) => `- ${str(a?.activity, 80)} (${str(a?.role, 60)})`).join("\n") || "- (no activities listed)";
    return { maxTokens: 2200, temperature: 0, prompt: `Generate a starter resume in plain text for this college student. This is a STARTING DRAFT, fill in their real info from below, and use square-bracketed placeholders like "[Add 2-3 bullet points about your role here]" for things you don't have.

DO NOT invent specific accomplishments, GPAs different from theirs, work experience, projects, courses, awards, or technical details. Only use what's given. Where details are missing, use bracketed placeholders that tell the student exactly what to add.

STUDENT INFO:
- Name: [Your Name]
- Email: [your.email@school.edu]
- Phone: [Your Phone]
- LinkedIn: [linkedin.com/in/yourprofile]
- Major: ${majors || "Undeclared"}
- University: ${str(i?.university, 120) || "[Your University]"}
- Expected Graduation: ${str(i?.gradYear, 20) || "[Graduation Year]"}
- GPA: ${str(i?.gpa, 10) || "[GPA]"}
- Skills: ${skills}
- Activities & Leadership:
${acts}

STRUCTURE (use this exact section order):
1. Header (name, contact info, use [bracketed] placeholders)
2. EDUCATION (university, major, graduation, GPA, use their real values; placeholder for relevant coursework: "[List 4-5 relevant courses, e.g. ...]")
3. SKILLS (group by category if applicable; use their listed skills, add placeholder "[Add additional skills like certifications, languages, software you know]")
4. LEADERSHIP & ACTIVITIES (one entry per activity they listed, with their role; under each: "[Add 2-3 bullets describing what you did, start with action verbs like Led, Organized, Coordinated]")
5. EXPERIENCE (header only with placeholder: "[Add work experience or internships here, even part-time jobs count]")
6. PROJECTS (header only with placeholder: "[Add 1-2 class or personal projects relevant to ${majors || "your major"}]")

Return ONLY the resume text. No preamble, no closing notes, no markdown, just the resume as if it were going in a plain text file.` };
  },

  cover_letter(i) {
    const p = student(i?.student), company = str(i?.company, 100), role = str(i?.role, 120);
    if (!company) throw new AIError("Which company?", 400);
    const resume = str(i?.resume, 2000), resumeName = str(i?.resumeName, 80);
    return { maxTokens: 800, temperature: 0.7, prompt: `Write a concise internship cover letter and 3 short, specific application tips. Return ONLY valid JSON, no markdown: {"coverLetter":"...","tips":["...","...","..."]}.
STUDENT: ${p.fullName || "a student"}, ${p.major} major at ${p.school}, graduating ${p.gradDate}, GPA ${p.gpa}. Top skills: ${p.skills || "general"}. Standout: ${p.whyMe || "motivated, eager to learn"}.${resume ? `\nTailor to this resume the student chose${resumeName ? ` ("${resumeName}")` : ""}:\n${resume}` : ""}
ROLE: ${role || "Intern"} at ${company} (${str(i?.industry, 60) || "industry not given"}). First person, under 170 words, specific to this company and role, ready to paste. Tips must be concrete. Never invent facts about the student or the company.` };
  },

  followup(i) {
    const p = student(i?.student), company = str(i?.company, 100), role = str(i?.role, 120), days = num(i?.days, 1, 120, 7);
    if (!company) throw new AIError("Which company?", 400);
    const resume = str(i?.resume, 2000);
    const resumeBlock = resume.length >= 80 ? `\n\nStudent's resume snippet (use this to make ONE specific, true detail land, don't fabricate anything not in here):\n"""\n${resume}\n"""` : "";
    return { maxTokens: 800, temperature: 0.7, prompt: `Write a short, professional internship application follow-up email. Return ONLY valid JSON, no markdown: {"coverLetter":"...","tips":["...","..."]}.
The student applied to the ${role || "internship"} role at ${company} about ${days} days ago and is checking in.
STUDENT: ${p.fullName || "a student"}, ${p.major} at ${p.school}.${resumeBlock}
Email must be first-person, under 120 words, warm but professional, reaffirm interest, politely ask about timeline. If a resume is provided, weave in ONE specific true detail (a project, skill, or experience from the resume), keep it natural, not forced. "coverLetter" is the email body, starting with "Subject: ..." on the first line. "tips" = 2 short sending tips.` };
  },

  score(i) {
    const resume = str(i?.resume, 4500), jd = str(i?.jd, 3500), pr = i?.profile || {};
    if (!resume && !jd) throw new AIError("Paste a resume and/or a job description to score.", 400);
    const acts = (Array.isArray(pr.activities) ? pr.activities : []).slice(0, 15).map((a) => `${str(a?.activity, 80)} (${str(a?.role, 60)})`).join("; ") || "none listed";
    const profileBlock = `The student's profile from their quiz: major ${str(pr.major, 120) || "unknown"}, GPA ${str(pr.gpa, 10) || "unknown"}, graduating ${str(pr.gradYear, 20) || "unknown"}. Standout activities/leadership: ${acts}.`;
    return { maxTokens: 2000, temperature: 0, prompt: `You are estimating how a job application might fare with typical hiring software and recruiters. This is an estimate to help a student improve, not a prediction from any real employer's system. Be honest, specific, and useful.

${profileBlock}${resume ? `\n\nRESUME PASTED:\n${resume}` : ""}${jd ? `\n\nJOB DESCRIPTION PASTED:\n${jd}` : ""}

Return ONLY a valid JSON object with this exact shape:

{
  "screenerScore": NUMBER_0_TO_100,
  "screenerVerdict": "one-line plain-English summary, e.g. 'Likely to pass automatic screening' or 'Probably gets filtered out'",
  "screenerFactors": [
    {"label": "Keyword match", "good": true_or_false, "note": "specific finding, e.g. 'Resume has 7 of 12 key terms from the posting' OR 'Missing: Python, SQL, Excel (top 3 most-mentioned in JD)'"},
    {"label": "Required qualifications", "good": true_or_false, "note": "specific"},
    {"label": "Resume parseability", "good": true_or_false, "note": "specific"},
    {"label": "Experience signals", "good": true_or_false, "note": "specific"}
  ],
  "humanScore": NUMBER_0_TO_100,
  "humanVerdict": "one-line, e.g. 'Strong human round, recruiter would likely interview'",
  "humanFactors": [
    {"label": "Profile strength", "good": true_or_false, "note": "specific"},
    {"label": "Leadership signals", "good": true_or_false, "note": "specific"},
    {"label": "Timing", "good": true_or_false, "note": "specific"},
    {"label": "Standout details", "good": true_or_false, "note": "specific"}
  ],
  "fixes": [
    "specific actionable improvement #1, e.g. 'Add a Skills section listing Python, SQL, Excel, these appear 5+ times in the posting'",
    "improvement #2",
    "improvement #3"
  ],
  "overallNote": "2-3 sentence honest summary: where they stand, what to do next"
}

In the actual JSON output, use real numbers for the scores (0-100) and real booleans (true or false), those placeholders above are just describing the format.

RULES:
- Base scores on what's actually in the materials. If they only gave a resume (no JD), the screenerScore is a general resume-readiness score and the screenerFactors should reflect that (no keyword match possible, say so).
- If they only gave a JD (no resume), screenerScore is the "bar to clear", what an applicant would need; don't fabricate a personal score.
- Be specific. "Missing Skills section" is good. "Could be stronger" is useless.
- No fluff. No "great job!" filler. Honest > nice.
- Match scores should be realistic: 50-90 range. Sub-40 means real red flags. 90+ means exceptional fit.` };
  },

  interview_prep(i) {
    const p = student(i?.student), company = str(i?.company, 100), role = str(i?.role, 120);
    if (!company) throw new AIError("Which company?", 400);
    const resume = str(i?.resume, 1800);
    const resumeBlock = resume.length >= 80 ? `\n\nStudent resume (tailor questions to their actual background where possible):\n"""\n${resume}\n"""` : "";
    return { maxTokens: 2000, temperature: 0, prompt: `You are an internship interview coach. Generate a realistic, specific interview prep guide for this student.

ROLE: ${role || "Intern"} at ${company} (${str(i?.industry, 60) || "industry"})
STUDENT: ${p.major}, ${p.school}, GPA ${p.gpa}, graduating ${p.gradDate}${resumeBlock}

Return ONLY valid JSON, no markdown:
{
  "questions": [
    {"q": "specific interview question", "framework": "2-3 sentence coaching note, how to answer this well, what to emphasize given this student's background"},
    ... (7 questions total: 2 behavioral, 2 technical/role-specific, 2 company-specific, 1 curveball)
  ],
  "tips": ["short actionable tip 1", "short actionable tip 2", "short actionable tip 3"]
}
Do not state facts about the company unless you are confident they are true.` };
  },

  // Interview practice: one turn at a time. The student answers (typed or spoken + auto-transcribed, against a timer);
  // we give short honest feedback, a rubric score for that answer, and the next question. The page turns scores into the grade.
  // "Tailor my resume to this job" (from user interview #1, Nov 2026). Suggestions only — never invents experience.
  tailor(i) {
    const resume = str(i?.resume, 6000), posting = str(i?.posting, 6000);
    const role = str(i?.role, 160), company = str(i?.company, 100), location = str(i?.location, 100), field = str(i?.field, 60);
    if (resume.length < 80) throw new AIError("Paste your resume first (at least a few lines)", 400);
    if (!role || !company) throw new AIError("Which job?", 400);
    return { maxTokens: 1800, temperature: 0, prompt: `A college student wants to tailor their resume to ONE internship. Give honest, specific edits.

RULES (follow all):
- Never invent experience, numbers, tools, courses or results the resume doesn't show. Rewrites may only rephrase, reorder or sharpen what is already there.
- Do not add new actions, teammates, scope or skills to a line (no "collaborated", "led", "optimized", "structural" etc. unless the resume says so). Stronger verbs are fine only when they describe the same thing.
- If a stronger version needs a number they didn't give, write the rewrite with a bracketed placeholder like [#] or [% faster] for them to fill in truthfully.
- "before" must be copied EXACTLY from the resume (one line or bullet).
- Keywords come only from the job title/posting below, and only ones the student can honestly claim from their resume. Put the rest in "gaps".
- If no posting text is given, say so in "note" and base it on the job title and field only.
- Plain, direct language. No buzzwords.

JOB: ${role} at ${company}${location ? ` (${location})` : ""}${field ? ` · field: ${field}` : ""}
POSTING TEXT:
${posting || "(not provided)"}

STUDENT RESUME:
${resume}

Return ONLY JSON, no other text:
{"fit":"one honest sentence on how well this resume fits this job now",
 "lead_with":["the 1-3 things from their resume to move to the top for THIS job"],
 "rewrites":[{"before":"exact resume line","after":"sharper version","why":"short reason"}],
 "keywords":["terms from the posting they can honestly add"],
 "gaps":["things the job wants that the resume doesn't show, don't fake these; how to address them honestly"],
 "note":"optional one-line caveat"}
At most 5 rewrites, 8 keywords, 4 gaps.` };
  },

  interview_turn(i) {
    const company = str(i?.company, 100) || "a company", role = str(i?.role, 120) || "intern", major = str(i?.major, 100);
    const kind = ["behavioral", "technical", "mixed"].includes(i?.kind) ? i.kind : "mixed";
    const total = num(i?.total, 3, 8, 5);
    const limit = num(i?.limit, 30, 300, 90);
    const spoken = i?.spoken === true;
    const hist = (Array.isArray(i?.history) ? i.history : []).slice(-8).map((h) => ({ q: str(h?.q, 400), a: str(h?.a, 2500), secs: num(h?.secs, 0, 600, 0), out: h?.timedOut === true })).filter((h) => h.q);
    const asked = hist.length, done = asked >= total;
    const transcript = hist.map((h, n) => `Q${n + 1}: ${h.q}\nStudent (${h.secs ? `${h.secs}s of ${limit}s` : "time not recorded"}${h.out ? ", ran out of time" : ""}): ${h.a || "(no answer)"}`).join("\n\n");
    const rubric = `"scores":{"relevance":0-5,"structure":0-5,"specifics":0-5,"delivery":0-5} for the LAST answer only, relevance: answers the actual question; structure: clear story (situation, action, result) or clear reasoning; specifics: names real details, tools, numbers; delivery: concise and confident, little filler, used the time well (an empty or "(no answer)" reply scores 0 on everything). Score like a real interviewer: 3 = solid, 5 = rare.`;
    return { maxTokens: done ? 800 : 520, temperature: 0.4, prompt: `You are a realistic, friendly but honest interviewer running a mock ${kind} interview for a ${role} internship at ${company}.${major ? ` The student studies ${major}; use that only to set the depth of technical questions.` : ""}
${company !== "a company" ? `Make this an interview AT ${company}, not a generic one for the major: most questions should be about ${company} specifically, what it does or makes, its products, customers, industry and challenges, why the student wants to work there, and how this ${role} role would fit into ${company}'s work. Use only facts about ${company} you are confident of; if you don't know it well, ask about it without inventing details.
` : ""}Ask one question at a time, like a real first-round interview. Technical questions should fit an intern (fundamentals, projects, how they'd approach a problem), not trivia. Each answer has a ${limit}-second limit.${spoken ? " Answers were spoken out loud and auto-transcribed, so ignore spelling and small transcription mistakes; do judge rambling and heavy filler words." : ""}
${asked ? `Transcript so far:\n${transcript}\n` : "No questions asked yet."}
${done ? `That was the last question. Reply with ONLY this JSON:
{"feedback":"2-3 sentences on the LAST answer",${rubric},"summary":{"strengths":["2-3 specific strengths seen in their answers"],"improve":["2-3 specific, actionable fixes"],"overall":"2 sentences, honest"}}`
: asked ? `Reply with ONLY this JSON: {"feedback":"2-3 sentences on the LAST answer: what worked, one concrete way to make it stronger (e.g. use STAR, add a number, name the tool)",${rubric},"next":"the next interview question (question ${asked + 1} of ${total})"}`
: `Reply with ONLY this JSON: {"next":"your opening question (question 1 of ${total})"}`}
Never invent facts about the student. If an answer is empty or off-topic, say so kindly and move on.` };
  },

  intel(i) {
    const name = str(i?.name, 100), role = str(i?.role, 120) || "intern";
    if (!name) throw new AIError("Which company?", 400);
    return { maxTokens: 250, temperature: 0, prompt: `Company: "${name}" | Industry: ${str(i?.industry, 60) || "unknown"} | Location: ${str(i?.location, 80) || "unknown"} | Hiring for: ${role}

Return ONLY this exact JSON structure, no markdown, no extra text:
{"description":"One specific sentence about what ${name} actually does or makes, be concrete, not generic","size":"Rough size if you are confident, e.g. ~500 employees or 10,000+; otherwise exactly: Unknown","internTasks":"One sentence starting with: A ${role} at ${name}, then describe what they typically work on day-to-day","culture":"3-6 word phrase, or exactly: Unknown"}
If you do not confidently know this specific company, keep "description" to what its name and industry clearly show and do not invent details.` };
  },
};

function sameSite(req) {
  const host = String(req.headers.host || "").toLowerCase();
  const from = req.headers.origin || req.headers.referer || "";
  try { return !!host && new URL(from).host.toLowerCase() === host; } catch { return false; }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!sameSite(req)) return res.status(403).json({ error: "Not allowed" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const feature = String(body?.feature || "");
  if (!Object.hasOwn(FEATURES, feature)) return res.status(400).json({ error: "Unknown AI feature" });

  try {
    const job = FEATURES[feature](body.input || {});
    const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "?";
    if (!(await rateOk(`gen-ip:${ip}`, 600, PER_IP_10MIN))) return res.status(429).json({ error: "Too many requests, try again in a few minutes" });
    if (!(await rateOk("gen-site", 3600, SITE_PER_HOUR))) return res.status(429).json({ error: "AI is very busy right now, try again later" });
    const text = await callClaude({ feature: `home_${feature}`, prompt: job.prompt, maxTokens: job.maxTokens, temperature: job.temperature });
    return res.status(200).json({ text });
  } catch (e) {
    if (e instanceof AIError) return res.status(e.status).json({ error: e.message });
    console.error("[generate]", e);
    return res.status(500).json({ error: "Something went wrong, try again" });
  }
}
