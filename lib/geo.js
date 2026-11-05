// lib/geo.js — offline US geography for the homepage quiz: ZIP → state, and each state's neighbors.
// ZIP → state uses the USPS 3-digit prefix ranges (exact for nearly every ZIP; good enough to pick a state).

const RANGES = [
  [5, 5, "NY"], [10, 27, "MA"], [28, 29, "RI"], [30, 38, "NH"], [39, 49, "ME"], [50, 54, "VT"], [55, 55, "MA"], [56, 59, "VT"],
  [60, 69, "CT"], [70, 89, "NJ"], [100, 149, "NY"], [150, 196, "PA"], [197, 199, "DE"], [200, 200, "DC"], [201, 201, "VA"],
  [202, 205, "DC"], [206, 219, "MD"], [220, 246, "VA"], [247, 268, "WV"], [270, 289, "NC"], [290, 299, "SC"], [300, 319, "GA"],
  [320, 349, "FL"], [350, 369, "AL"], [370, 385, "TN"], [386, 397, "MS"], [398, 399, "GA"], [400, 427, "KY"], [430, 459, "OH"],
  [460, 479, "IN"], [480, 499, "MI"], [500, 528, "IA"], [530, 549, "WI"], [550, 567, "MN"], [569, 569, "DC"], [570, 577, "SD"],
  [580, 588, "ND"], [590, 599, "MT"], [600, 629, "IL"], [630, 658, "MO"], [660, 679, "KS"], [680, 693, "NE"], [700, 714, "LA"],
  [716, 729, "AR"], [730, 732, "OK"], [733, 733, "TX"], [734, 749, "OK"], [750, 799, "TX"], [800, 816, "CO"], [820, 831, "WY"],
  [832, 838, "ID"], [840, 847, "UT"], [850, 865, "AZ"], [870, 884, "NM"], [885, 885, "TX"], [889, 898, "NV"], [900, 961, "CA"],
  [967, 968, "HI"], [970, 979, "OR"], [980, 994, "WA"], [995, 999, "AK"],
];

export function zipToState(zip) {
  const z = String(zip || "").trim();
  if (!/^\d{5}$/.test(z)) return null;
  const p = Number(z.slice(0, 3));
  const r = RANGES.find(([a, b]) => p >= a && p <= b);
  return r ? r[2] : null;
}

export const NEIGHBORS = {
  AL: ["FL", "GA", "MS", "TN"], AK: [], AZ: ["CA", "CO", "NM", "NV", "UT"], AR: ["LA", "MO", "MS", "OK", "TN", "TX"],
  CA: ["AZ", "NV", "OR"], CO: ["AZ", "KS", "NE", "NM", "OK", "UT", "WY"], CT: ["MA", "NY", "RI"], DE: ["MD", "NJ", "PA"],
  DC: ["MD", "VA"], FL: ["AL", "GA"], GA: ["AL", "FL", "NC", "SC", "TN"], HI: [], ID: ["MT", "NV", "OR", "UT", "WA", "WY"],
  IL: ["IA", "IN", "KY", "MO", "WI"], IN: ["IL", "KY", "MI", "OH"], IA: ["IL", "MN", "MO", "NE", "SD", "WI"],
  KS: ["CO", "MO", "NE", "OK"], KY: ["IL", "IN", "MO", "OH", "TN", "VA", "WV"], LA: ["AR", "MS", "TX"], ME: ["NH"],
  MD: ["DC", "DE", "PA", "VA", "WV"], MA: ["CT", "NH", "NY", "RI", "VT"], MI: ["IN", "OH", "WI"], MN: ["IA", "ND", "SD", "WI"],
  MS: ["AL", "AR", "LA", "TN"], MO: ["AR", "IA", "IL", "KS", "KY", "NE", "OK", "TN"], MT: ["ID", "ND", "SD", "WY"],
  NE: ["CO", "IA", "KS", "MO", "SD", "WY"], NV: ["AZ", "CA", "ID", "OR", "UT"], NH: ["MA", "ME", "VT"], NJ: ["DE", "NY", "PA"],
  NM: ["AZ", "CO", "OK", "TX", "UT"], NY: ["CT", "MA", "NJ", "PA", "VT"], NC: ["GA", "SC", "TN", "VA"], ND: ["MN", "MT", "SD"],
  OH: ["IN", "KY", "MI", "PA", "WV"], OK: ["AR", "CO", "KS", "MO", "NM", "TX"], OR: ["CA", "ID", "NV", "WA"],
  PA: ["DE", "MD", "NJ", "NY", "OH", "WV"], RI: ["CT", "MA"], SC: ["GA", "NC"], SD: ["IA", "MN", "MT", "ND", "NE", "WY"],
  TN: ["AL", "AR", "GA", "KY", "MO", "MS", "NC", "VA"], TX: ["AR", "LA", "NM", "OK"], UT: ["AZ", "CO", "ID", "NM", "NV", "WY"],
  VT: ["MA", "NH", "NY"], VA: ["DC", "KY", "MD", "NC", "TN", "WV"], WA: ["ID", "OR"], WV: ["KY", "MD", "OH", "PA", "VA"],
  WI: ["IA", "IL", "MI", "MN"], WY: ["CO", "ID", "MT", "NE", "SD", "UT"],
};

/** Quiz major (e.g. "Mechanical Engineering") → listing fields from lib/fields.js. null = all engineering view. */
export function fieldsForMajor(major) {
  // Quiz major → internship fields (lib/fields.js keys). Several fields per major on purpose: a finance major also
  // fits consulting; an English major fits marketing/media. null = we don't know → show every major.
  // tests/geo-majors-test.mjs runs every major the homepage quiz offers through this.
  const m = String(major || "").toLowerCase();
  const out = new Set();
  const add = (re, ...f) => { if (re.test(m)) f.forEach((x) => out.add(x)); };
  add(/mechanical|aerospace|robotics/, "mechanical", "engineering");
  add(/materials/, "chemical", "mechanical", "engineering");
  add(/electrical|computer engineering/, "electrical", "engineering");
  add(/civil|construction|environmental engineering|urban planning|architecture/, "civil");
  add(/environmental engineering|civil/, "engineering");
  add(/chemical engineering/, "chemical", "engineering");
  add(/biomedical/, "mechanical", "electrical", "science_health", "engineering");
  add(/industrial engineering/, "industrial", "supply_chain", "engineering");
  add(/operations management|supply chain/, "supply_chain", "industrial");
  add(/computer science|software|game design|artificial intelligence/, "software", "data");
  add(/data science|statistics|analytics|mathematics|applied math|actuarial|bioinformatics/, "data");
  add(/actuarial/, "finance");
  add(/bioinformatics|biochem/, "science_health");
  add(/cyber|information (systems|technology)|management information/, "cyber_it", "data");
  add(/financ|accounting|economics|real estate/, "finance", "consulting");
  add(/marketing|advertising|public relations|communications|journalism|film|television|music production|english|literature|linguistics/, "marketing");
  add(/^management$|business|entrepreneur|international business|hospitality|sports management/, "consulting", "sales", "marketing", "supply_chain", "finance");
  add(/hospitality|sports management/, "sales", "marketing");
  add(/human resources/, "people_hr");
  add(/design|animation|fine arts|photography|interior|fashion|game design|industrial design|graphic/, "product_design");
  add(/biology|chemistry|physics|astronomy|health|nurs|pharm|medic|neuro|micro|public health|nutrition|therapy|veterin|dental|kinesiology|exercise|athletic training|physician|food science|environmental science|sustainab|geolog|geograph|agricultur|forensic|cognitive/, "science_health");
  add(/psychology|sociology|social work|anthropology/, "people_hr", "education_social");
  add(/psychology|cognitive|neuro/, "science_health");
  add(/education|early childhood|social work/, "education_social");
  add(/law|political|public policy|international relations|criminal|philosophy/, "legal_policy");
  add(/international relations|history|religious|classics|women|gender|spanish|liberal arts/, "education_social", "legal_policy");
  add(/sustainab|geograph|urban planning/, "civil");
  add(/culinary|theater|dance|music$|art history/, "marketing", "education_social");
  if (/engineering/.test(m)) out.add("engineering");
  return out.size ? [...out] : null;
}
