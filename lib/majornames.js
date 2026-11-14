// lib/majornames.js — turns US Dept. of Education program titles (CIP) into the names students actually say.
// "Biology / Biological Sciences" → "Biology", "Registered Nursing / Registered Nurse" → "Nursing (RN)",
// "Biological and Biomedical Sciences, Other" → "Other Biological and Biomedical Sciences". Deterministic: same input, same name.
// Used by scripts/build-schools.mjs (schools/cip.json) and scripts/clean-major-names.mjs. Nov 14 2026.

// The most common programs, by how many colleges award them, named the way schools list them.
const NAMED = {
  "51.3801": "Nursing (RN)", "26.0101": "Biology", "24.0101": "Liberal Arts and Sciences", "52.1401": "Marketing",
  "50.0501": "Theatre Arts", "43.0104": "Criminal Justice", "52.0101": "Business", "50.0701": "Art",
  "11.1003": "Cybersecurity", "51.0701": "Health Care Administration", "50.0702": "Studio Art",
  "30.9999": "Interdisciplinary Studies", "30.0000": "Interdisciplinary Studies", "43.0103": "Criminal Justice and Law Enforcement",
  "31.0504": "Sport Management", "51.0000": "Health Sciences", "47.0604": "Automotive Technology",
  "51.0904": "Paramedic / EMT", "51.0911": "Radiologic Technology", "40.0601": "Geology", "22.0302": "Paralegal Studies",
  "52.0302": "Accounting Technology and Bookkeeping", "52.1001": "Human Resource Management", "38.0201": "Religious Studies",
  "13.1101": "School Counseling", "51.0909": "Surgical Technology", "51.0908": "Respiratory Therapy",
  "13.1305": "English Education", "52.1101": "International Business", "31.0501": "Kinesiology and Physical Education",
  "51.0801": "Medical Assisting", "11.0401": "Information Science", "48.0508": "Welding Technology", "43.0107": "Police Science",
  "52.0901": "Hospitality Management", "51.0602": "Dental Hygiene", "09.0702": "Digital Media", "24.0103": "Humanities",
  "52.0701": "Entrepreneurship", "24.0199": "General Studies", "15.0303": "Electrical Engineering Technology",
  "30.2001": "International Studies", "09.0102": "Mass Communication", "52.0203": "Supply Chain Management",
  "11.0201": "Computer Programming", "51.0913": "Athletic Training", "39.0601": "Theology", "51.1508": "Mental Health Counseling",
  "52.0299": "Business Administration", "51.0910": "Diagnostic Medical Sonography", "13.1203": "Middle School Education",
  "51.0707": "Health Information Technology", "51.0912": "Physician Assistant", "19.0709": "Child Care",
  "12.0503": "Culinary Arts", "13.0501": "Educational Technology", "51.1004": "Medical Laboratory Technician",
  "50.0602": "Film and Video Production", "39.0602": "Ministry", "51.1501": "Addiction Counseling",
  "51.1005": "Medical Laboratory Science", "47.0201": "HVAC Technology", "11.0801": "Web Design and Digital Media",
  "13.1401": "Teaching English as a Second Language (ESL)", "50.0601": "Film and Media Studies", "51.3805": "Family Nurse Practitioner",
  "01.8301": "Veterinary Technology", "51.0907": "Radiation Therapy", "13.0406": "Higher Education Administration",
  "16.1200": "Classics", "10.0304": "Animation and Special Effects", "52.1399": "Management Science",
  "39.0201": "Biblical Studies", "15.0613": "Manufacturing Engineering Technology", "51.0203": "Speech-Language Pathology",
  "15.0805": "Mechanical Engineering Technology", "15.1501": "Engineering Management", "15.0000": "Engineering Technology",
  "51.2306": "Occupational Therapy", "05.0201": "African American Studies", "51.9999": "Health Professions",
  "01.0102": "Agribusiness", "47.0605": "Diesel Technology", "43.0203": "Fire Science", "14.1401": "Environmental Engineering",
  "09.0900": "Public Relations and Advertising", "15.1301": "Drafting and Design Technology", "11.1001": "Network and System Administration",
  "13.1316": "Science Education", "09.0902": "Public Relations", "47.0303": "Industrial Maintenance Technology",
  "51.0204": "Audiology and Speech-Language Pathology", "51.1505": "Marriage and Family Therapy", "15.1001": "Construction Engineering Technology",
  "51.3101": "Dietetics", "50.0502": "Theatre Design and Technology", "05.0102": "American Studies", "43.0201": "Fire Prevention and Safety",
  "15.0612": "Industrial Technology", "13.1015": "Early Childhood Special Education", "52.0206": "Nonprofit Management",
  "48.0501": "Machining", "51.0716": "Medical Administrative Assistant", "04.0902": "Architectural Technology",
  "12.0401": "Cosmetology", "51.0601": "Dental Assisting", "47.0603": "Collision Repair Technology", "50.0402": "Graphic Design",
  "50.0407": "Fashion Design", "11.0101": "Computer and Information Sciences", "11.0701": "Computer Science",
  "52.0201": "Business Administration and Management", "42.0101": "Psychology", "45.0601": "Economics", "45.1001": "Political Science",
  "23.0101": "English", "09.0101": "Communication", "52.0801": "Finance", "52.0301": "Accounting",
  "31.0505": "Exercise Science", "13.1202": "Elementary Education", "13.1210": "Early Childhood Education", "44.0701": "Social Work",
  "14.1901": "Mechanical Engineering", "14.0801": "Civil Engineering", "14.1001": "Electrical Engineering", "14.0701": "Chemical Engineering",
  "40.0501": "Chemistry", "27.0101": "Mathematics", "40.0801": "Physics", "45.1101": "Sociology", "54.0101": "History",
  "26.0202": "Biochemistry", "26.0502": "Microbiology", "26.1501": "Neuroscience", "51.2201": "Public Health",
  "51.2001": "Pharmacy", "51.2308": "Physical Therapy", "52.1201": "Management Information Systems",
  "27.0501": "Statistics", "30.7001": "Data Science", "11.0104": "Informatics", "45.0201": "Anthropology",
  "16.0905": "Spanish", "16.0901": "French", "16.0501": "German", "38.0101": "Philosophy", "50.0901": "Music",
  "04.0201": "Architecture", "52.1501": "Real Estate", "52.1902": "Fashion Merchandising", "03.0104": "Environmental Science",
  "45.0701": "Geography", "40.0401": "Meteorology", "43.0302": "Emergency Management", "44.0401": "Public Administration",
  "13.1001": "Special Education", "13.1314": "Physical Education Teaching", "13.1311": "Math Education", "13.1328": "History Education",
};

// "Technology / Technician", "Therapy / Therapist", "Hygiene / Hygienist": the second half only renames the person
const ROLE_TAIL = /\s*\/\s*(technician|technologist|therapist|hygienist|assistant|aide|practitioner|counselor|nurse|programmer|welder|machinist|trainer|administrator|sonographer|dietitian|pathologist|audiologist|radiographer)\b.*$/i;

export function cleanMajorName(title = "", code = "") {
  if (NAMED[code]) return NAMED[code];
  let t = String(title || "").replace(/\s+/g, " ").trim().replace(/\.$/, "").replace(/,\s*General$/i, "");
  t = t.replace(ROLE_TAIL, "").trim();
  t = t.replace(/^Multi-\s*\/\s*Interdisciplinary/i, "Interdisciplinary");
  // "X / Xs" or "X Studies / X": two names for the same thing, keep the first
  const parts = t.split(/\s*\/\s*/);
  if (parts.length === 2) {
    const a = parts[0].toLowerCase(), b = parts[1].toLowerCase();
    if (a.slice(0, 5) === b.slice(0, 5) || b.startsWith(a.split(" ")[0]) || a.startsWith(b.split(" ")[0])) {
      // a one-word first half ("Cell / Cellular Biology…", "Theatre / Theatre Arts Management") says less: keep the longer half
      t = !/\s/.test(parts[0]) && parts[1].length > parts[0].length + 3 ? parts[1] : parts[0];
    }
  }
  t = t.replace(/\s*\(\s*\)\s*/g, " ").trim();
  const other = /,\s*Other$/i.exec(t);
  if (other) t = "Other " + t.slice(0, other.index);
  return t || String(title || "").trim();
}
