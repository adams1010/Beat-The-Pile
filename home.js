/* built from src/home.jsx cc9491f7ee606651 — do not edit; run node scripts/build-home.mjs */
const {
  useState,
  useEffect,
  useRef,
  useCallback
} = React;
const G = "#0B7A55",
  GD = "#0A6647",
  GL = "#EAF7F1",
  GM = "#C6E8D8";
const AM = "#B45309",
  AL = "#FFF7ED";
const CR = "#B42318",
  CL = "#FEF3F2";
const PALETTE = Array(12).fill("#0B1220");
const LOAD_MSGS = ["Searching for internships near you...", "Tip: Apply Tuesday–Thursday morning — recruiter inboxes are cleanest then.", "Matching roles to your major...", "Tip: Many postings close once enough people apply, so earlier is better.", "Finding opportunities others overlook...", "Tip: A short, polite follow-up 5–7 days after applying keeps you on the recruiter's radar.", "Factoring in your timing and experience...", "Tip: Smaller regional firms often hire faster than the big names — and pay surprisingly well.", "Estimating your match scores...", "Tip: Don't filter by GPA cutoffs — many companies post them but rarely enforce them.", "Checking nearby states too...", "Tip: Customize your resume for each application. Even small tweaks beat a generic one.", "Reading company job boards...", "Tip: Your school's alumni network on LinkedIn is a hidden cheat code — message 1 per week.", "Ranking matches by realistic chance...", "Tip: Quality > quantity. 10 thoughtful applications beats 100 spray-and-pray every time.", "Polishing the list...", "Tip: After every rejection, ask for feedback. Most won't reply — the ones who do are gold."];
const SCHOOL_ABBR = {
  "umd": "Maryland",
  "psu": "Penn State",
  "fau": "Florida Atlantic",
  "fsu": "Florida State",
  "uf": "Florida",
  "ucf": "Central Florida",
  "usf": "South Florida",
  "fiu": "Florida International",
  "fgcu": "Florida Gulf Coast",
  "vt": "Virginia Tech",
  "uva": "Virginia",
  "jmu": "James Madison",
  "gmu": "George Mason",
  "odu": "Old Dominion",
  "vcu": "Virginia Commonwealth",
  "gwu": "George Washington",
  "gw": "George Washington",
  "uga": "Georgia",
  "gt": "Georgia Tech",
  "gatech": "Georgia Tech",
  "gsu": "Georgia State",
  "ucla": "UCLA",
  "usc": "Southern California",
  "ucb": "Berkeley",
  "cal": "Berkeley",
  "ucsd": "San Diego",
  "ucsb": "Santa Barbara",
  "uci": "Irvine",
  "ucd": "Davis",
  "ucr": "Riverside",
  "sdsu": "San Diego State",
  "sjsu": "San Jose State",
  "mit": "MIT",
  "bu": "Boston University",
  "bc": "Boston College",
  "neu": "Northeastern",
  "umass": "UMass",
  "uconn": "Connecticut",
  "uri": "Rhode Island",
  "unh": "New Hampshire",
  "uvm": "Vermont",
  "nyu": "NYU",
  "cmu": "Carnegie Mellon",
  "upenn": "Pennsylvania",
  "pitt": "Pittsburgh",
  "rit": "RIT",
  "rpi": "Rensselaer",
  "sbu": "Stony Brook",
  "ub": "Buffalo",
  "cu": "Colorado",
  "umich": "Michigan",
  "msu": "Michigan State",
  "osu": "Ohio State",
  "uiuc": "Illinois Urbana",
  "uic": "Illinois Chicago",
  "uw": "Washington",
  "wisc": "Wisconsin",
  "umn": "Minnesota",
  "iu": "Indiana",
  "nd": "Notre Dame",
  "nu": "Northwestern",
  "uchicago": "Chicago",
  "wsu": "Wayne State",
  "wvu": "West Virginia",
  "ut": "Texas at Austin",
  "utaustin": "Texas at Austin",
  "utd": "Texas at Dallas",
  "tamu": "Texas A&M",
  "ttu": "Texas Tech",
  "txst": "Texas State",
  "tcu": "Texas Christian",
  "smu": "Southern Methodist",
  "uh": "Houston",
  "unt": "North Texas",
  "ku": "Kansas",
  "ksu": "Kansas State",
  "mizzou": "Missouri",
  "asu": "Arizona State",
  "ua": "Arizona",
  "nau": "Northern Arizona",
  "unlv": "Las Vegas",
  "uo": "Oregon",
  "osu-oregon": "Oregon State",
  "uw-madison": "Wisconsin",
  "unc": "North Carolina at Chapel Hill",
  "uncc": "North Carolina at Charlotte",
  "ncsu": "NC State",
  "ecu": "East Carolina",
  "duke": "Duke",
  "clemson": "Clemson",
  "uofsc": "South Carolina",
  "bama": "Alabama",
  "lsu": "Louisiana State",
  "ole miss": "Mississippi",
  "olemiss": "Mississippi",
  "utk": "Tennessee",
  "vandy": "Vanderbilt",
  "uk": "Kentucky",
  "uofl": "Louisville",
  "rutgers": "Rutgers",
  "wustl": "Washington University",
  "slu": "Saint Louis",
  "byu": "Brigham Young",
  "scu": "Santa Clara",
  "lmu": "Loyola Marymount",
  "luc": "Loyola University Chicago",
  "du": "Denver",
  "ud": "Dayton",
  "uc": "Cincinnati"
};
function schoolMatches(option, query) {
  const o = option.toLowerCase(),
    q = query.toLowerCase().trim();
  if (!q) return true;
  if (o.includes(q)) return true;
  const mapped = SCHOOL_ABBR[q];
  if (mapped && o.includes(mapped.toLowerCase())) return true;
  const acr = option.split(/\s+/).filter(w => !/^(of|the|at|and|&)$/i.test(w)).map(w => w[0] || "").join("").toLowerCase();
  if (q.length >= 2 && acr.includes(q)) return true;
  return false;
}
const LiveStats = () => {
  const [d, setD] = React.useState(null),
    [err, setErr] = React.useState(false);
  React.useEffect(() => {
    fetch("/api/listings?summary=1").then(r => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    }).then(setD).catch(() => setErr(true));
  }, []);
  const fmt = n => n == null ? "—" : n.toLocaleString();
  const ago = t => {
    if (!t) return null;
    const m = Math.round((Date.now() - new Date(t)) / 6e4);
    return m < 60 ? `${Math.max(1, m)} min ago` : m < 1440 ? `${Math.round(m / 60)} hr ago` : `${Math.round(m / 1440)} days ago`;
  };
  const items = [{
    v: d?.allMajors,
    l: "open internships right now, every major",
    c: "#0B1220"
  }, {
    v: d?.hiringNow,
    l: "companies hiring interns right now",
    c: "#0B1220"
  }, {
    v: d?.companies,
    l: "company job boards we read directly",
    c: G
  }];
  return React.createElement("div", {
    style: {
      maxWidth: 760,
      margin: "0 auto"
    }
  }, React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
      gap: "1rem"
    }
  }, items.map((s, i) => React.createElement("div", {
    key: i,
    style: {
      background: "#fff",
      border: "1px solid #EEF6F2",
      borderRadius: 14,
      padding: "1.75rem 1.25rem",
      textAlign: "center",
      boxShadow: "0 1px 2px rgba(11,18,32,.06)"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 38,
      fontWeight: 700,
      color: s.c,
      lineHeight: 1,
      marginBottom: "0.5rem",
      letterSpacing: "-1.5px"
    }
  }, err ? "—" : fmt(s.v)), React.createElement("p", {
    style: {
      fontSize: 12,
      color: "#4A5568",
      lineHeight: 1.5,
      fontWeight: 500
    }
  }, s.l)))), React.createElement("p", {
    style: {
      textAlign: "center",
      fontSize: 12,
      color: "#6B7280",
      marginTop: 10
    }
  }, err ? "Live numbers are unavailable right now (that's on us, not a sign of zero jobs)." : d?.lastSync ? `Live from our database · last job-board sync ${ago(d.lastSync)}` : "Loading live numbers…"));
};
const JobPreview = () => {
  const [jobs, setJobs] = React.useState(null),
    [err, setErr] = React.useState(false);
  React.useEffect(() => {
    fetch("/api/listings?field=all&limit=80").then(r => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    }).then(d => {
      const co = new Set(),
        fi = new Set(),
        out = [];
      for (const l of d.listings || []) {
        if (co.has(l.company) || fi.has(l.field) || l.field === "other") continue;
        co.add(l.company);
        fi.add(l.field);
        out.push(l);
        if (out.length === 3) break;
      }
      setJobs(out);
    }).catch(() => setErr(true));
  }, []);
  const host = u => {
    try {
      return new URL(u).hostname.replace(/^www\./, "");
    } catch (e) {
      return "";
    }
  };
  const ago = t => {
    const d = Math.floor((Date.now() - new Date(t)) / 864e5);
    return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
  };
  if (err) return React.createElement("p", {
    style: {
      fontSize: 12.5,
      color: "#6B7280",
      marginTop: 22
    }
  }, "Live preview didn't load. ", React.createElement("a", {
    href: "/jobs/",
    style: {
      color: "#0B6E4B",
      fontWeight: 700
    }
  }, "See today's internships \u2192"));
  if (!jobs) return React.createElement("div", {
    style: {
      height: 150,
      marginTop: 22
    },
    "aria-hidden": "true"
  });
  if (!jobs.length) return null;
  return React.createElement("div", {
    style: {
      marginTop: 26,
      textAlign: "left",
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, React.createElement("p", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "#6B7280",
      margin: "0 0 2px"
    }
  }, "Open right now \xB7 real listings"), jobs.map(j => React.createElement("a", {
    key: j.id,
    href: j.url,
    target: "_blank",
    rel: "noopener noreferrer",
    style: {
      display: "block",
      background: "#fff",
      border: "1px solid #E3E7ED",
      borderRadius: 12,
      padding: "12px 14px",
      textDecoration: "none",
      color: "#0B1220"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: "#0B6E4B"
    }
  }, j.company), React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 700,
      lineHeight: 1.3,
      margin: "2px 0 3px"
    }
  }, j.title), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#6B7280"
    }
  }, String(j.location || j.state || "").split("|")[0], " \xB7 from ", host(j.url), " \xB7 found ", ago(j.first_seen)))), React.createElement("a", {
    href: "/jobs/",
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "#0B6E4B",
      textAlign: "center",
      marginTop: 4
    }
  }, "See all of them \u2192"));
};
const D_FIELD = {
  software: "Software & CS",
  data: "Data & AI",
  cyber_it: "Cybersecurity & IT",
  mechanical: "Mechanical & Aerospace",
  electrical: "Electrical & Computer",
  chemical: "Chemical & Materials",
  civil: "Civil & Construction",
  product_design: "Product & Design",
  industrial: "Industrial & Manufacturing",
  finance: "Finance & Accounting",
  legal_policy: "Legal & Policy",
  people_hr: "People & HR",
  consulting: "Consulting & Strategy",
  marketing: "Marketing & Media",
  sales: "Sales",
  supply_chain: "Supply Chain & Ops",
  science_health: "Science & Health",
  education_social: "Education & Social Impact"
};
const D_STATES = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC"
};
function dAgo(t) {
  const m = Math.max(0, Math.round((Date.now() - new Date(t)) / 6e4));
  return m < 60 ? `${m || 1}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
}
function dAgoLong(t) {
  const m = Math.max(0, Math.round((Date.now() - new Date(t)) / 6e4));
  return m < 60 ? `${m || 1} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
}
const DM = {
  fontVariantNumeric: "tabular-nums"
};
const FEATURES = [{
  k: "tailor",
  name: "Tailor resume",
  t: "Fit your resume to one posting.",
  d: "See what to lead with, which words they use, and honest gaps. Nothing invented.",
  h: "/jobs/"
}, {
  k: "alerts",
  name: "Weekly alerts",
  t: "New jobs, once a week.",
  d: "Pick a major and states. One email when something new opens, none when nothing does.",
  h: "/jobs/"
}, {
  k: "radar",
  name: "Opening Radar",
  t: "Know the week they open.",
  d: "Estimates from past seasons, with a reminder a week before.",
  h: "/radar/"
}, {
  k: "fair",
  name: "Career Fair Mode",
  t: "Walk in with a route.",
  d: "Booths, open roles, a QR resume and follow-ups in one place.",
  h: "/fair/"
}, {
  k: "season",
  name: "My Season",
  t: "Every application, one board.",
  d: "Saved, applied, interviewing, offer. Plus a weekly goal and follow-up nudges.",
  h: "/season/"
}, {
  k: "interview",
  name: "Interview practice",
  t: "Talk it out. Get a grade.",
  d: "Answer out loud against a timer, get scored on every answer and a letter grade at the end.",
  h: "/#interview"
}];
function FeatViz({
  k
}) {
  const box = {
    background: "#fff",
    border: "1px solid #DCE2EC",
    borderRadius: 10,
    boxShadow: "0 6px 18px rgba(10,20,38,.06)"
  };
  const bar = (w, c = "#DCE2EC", h = 7) => React.createElement("span", {
    style: {
      display: "block",
      height: h,
      width: w,
      background: c,
      borderRadius: 99
    }
  });
  if (k === "tailor") return React.createElement("div", {
    style: {
      ...box,
      width: "88%",
      padding: 12,
      display: "grid",
      gap: 8
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: 12,
      fontWeight: 600
    }
  }, React.createElement("span", null, "Fit for this role"), React.createElement("span", {
    style: {
      color: "#0B7A55",
      ...DM
    }
  }, "Strong")), React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap"
    }
  }, ["SolidWorks", "GD&T", "testing"].map(x => React.createElement("span", {
    key: x,
    style: {
      fontSize: 11,
      background: "#E6F4EE",
      color: "#0B7A55",
      padding: "3px 8px",
      borderRadius: 99
    }
  }, x)), React.createElement("span", {
    style: {
      fontSize: 11,
      background: "#FBEFE6",
      color: "#9A4B12",
      padding: "3px 8px",
      borderRadius: 99
    }
  }, "gap: FEA")), React.createElement("div", {
    style: {
      display: "grid",
      gap: 5
    }
  }, bar("100%"), bar("72%", "#BFE6D4")));
  if (k === "alerts") return React.createElement("div", {
    style: {
      ...box,
      width: "88%",
      padding: 12,
      display: "grid",
      gap: 8
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, React.createElement("span", {
    style: {
      width: 26,
      height: 26,
      borderRadius: 7,
      background: "#070F1E",
      color: "#2FD39A",
      fontSize: 11,
      fontWeight: 700,
      display: "grid",
      placeItems: "center"
    }
  }, "BP"), React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 600
    }
  }, "5 new internships this week")), [["Mechanical Intern", "Richmond, VA"], ["Test Engineering Co-op", "Arlington, VA"]].map(([a, b]) => React.createElement("div", {
    key: a,
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 11,
      borderTop: "1px solid #EEF1F6",
      paddingTop: 6
    }
  }, React.createElement("span", {
    style: {
      fontWeight: 500
    }
  }, a), React.createElement("span", {
    style: {
      color: "#55627A"
    }
  }, b))));
  if (k === "radar") {
    const m = ["Jul", "Aug", "Sep", "Oct", "Nov"];
    return React.createElement("div", {
      style: {
        ...box,
        width: "88%",
        padding: 12
      }
    }, React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        marginBottom: 10
      }
    }, "Usually opens ", React.createElement("span", {
      style: {
        color: "#0B7A55"
      }
    }, "~mid Aug")), React.createElement("div", {
      style: {
        position: "relative",
        height: 8,
        background: "#EEF1F6",
        borderRadius: 99
      }
    }, React.createElement("span", {
      style: {
        position: "absolute",
        left: "22%",
        width: "18%",
        top: 0,
        bottom: 0,
        background: "#BFE6D4",
        borderRadius: 99
      }
    }), React.createElement("span", {
      style: {
        position: "absolute",
        left: "30%",
        top: -4,
        width: 16,
        height: 16,
        marginLeft: -8,
        borderRadius: "50%",
        background: "#0B7A55",
        border: "3px solid #fff",
        boxShadow: "0 0 0 1px #0B7A55"
      }
    })), React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        fontSize: 10,
        color: "#8D9AB3",
        marginTop: 8
      }
    }, m.map(x => React.createElement("span", {
      key: x
    }, x))));
  }
  if (k === "fair") return React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      alignItems: "center",
      width: "88%"
    }
  }, React.createElement("svg", {
    viewBox: "0 0 140 100",
    style: {
      flex: 1,
      height: 110
    }
  }, React.createElement("rect", {
    x: "1",
    y: "1",
    width: "138",
    height: "98",
    rx: "10",
    fill: "#fff",
    stroke: "#DCE2EC"
  }), [[20, 20], [60, 20], [100, 20], [20, 55], [60, 55], [100, 55], [40, 82], [80, 82]].map(([x, y], i) => React.createElement("rect", {
    key: i,
    x: x,
    y: y - 6,
    width: "22",
    height: "12",
    rx: "3",
    fill: [0, 4, 7].includes(i) ? "#BFE6D4" : "#EEF1F6"
  })), React.createElement("path", {
    d: "M31 20 C 50 40, 60 40, 71 55 S 90 80, 91 82",
    fill: "none",
    stroke: "#0B7A55",
    strokeWidth: "2",
    strokeDasharray: "4 3"
  }), [[31, 20, 1], [71, 55, 2], [91, 82, 3]].map(([x, y, n]) => React.createElement("g", {
    key: n
  }, React.createElement("circle", {
    cx: x,
    cy: y,
    r: "7",
    fill: "#0B7A55"
  }), React.createElement("text", {
    x: x,
    y: y + 3.5,
    fontSize: "9",
    textAnchor: "middle",
    fill: "#fff",
    fontWeight: "700"
  }, n)))), React.createElement("svg", {
    viewBox: "0 0 7 7",
    style: {
      width: 56,
      height: 56,
      background: "#fff",
      padding: 5,
      border: "1px solid #DCE2EC",
      borderRadius: 8
    },
    shapeRendering: "crispEdges"
  }, "1110111101010111101111000000101101111010101110111".split("").map((b, i) => b === "1" && React.createElement("rect", {
    key: i,
    x: i % 7,
    y: Math.floor(i / 7),
    width: "1",
    height: "1",
    fill: "#0A1426"
  }))));
  if (k === "season") return React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 6,
      width: "92%"
    }
  }, [["Saved", 3], ["Applied", 2], ["Interview", 1], ["Offer", 0]].map(([c, n]) => React.createElement("div", {
    key: c,
    style: {
      background: "#EEF1F6",
      borderRadius: 8,
      padding: 6,
      minHeight: 96
    }
  }, React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 600,
      color: "#55627A",
      marginBottom: 6
    }
  }, c), Array.from({
    length: n
  }).map((_, i) => React.createElement("div", {
    key: i,
    style: {
      ...box,
      boxShadow: "none",
      borderRadius: 6,
      height: 18,
      marginBottom: 4,
      borderColor: c === "Interview" ? "#0B7A55" : "#DCE2EC",
      background: c === "Interview" ? "#E6F4EE" : "#fff"
    }
  })))));
  return React.createElement("div", {
    style: {
      ...box,
      width: "88%",
      padding: 12,
      display: "flex",
      gap: 14,
      alignItems: "center"
    }
  }, React.createElement("span", {
    style: {
      width: 56,
      height: 56,
      borderRadius: 12,
      background: "#070F1E",
      color: "#2FD39A",
      fontSize: 24,
      fontWeight: 700,
      display: "grid",
      placeItems: "center",
      flexShrink: 0
    }
  }, "B+"), React.createElement("div", {
    style: {
      flex: 1,
      display: "grid",
      gap: 6
    }
  }, [["Q1", 86], ["Q2", 74], ["Q3", 91]].map(([q, v]) => React.createElement("div", {
    key: q,
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center",
      fontSize: 11
    }
  }, React.createElement("span", {
    style: {
      width: 18,
      color: "#55627A"
    }
  }, q), React.createElement("span", {
    style: {
      flex: 1,
      height: 6,
      background: "#EEF1F6",
      borderRadius: 99
    }
  }, React.createElement("span", {
    style: {
      display: "block",
      height: 6,
      width: v + "%",
      background: "#0B7A55",
      borderRadius: 99
    }
  })), React.createElement("span", {
    style: {
      ...DM,
      width: 20
    }
  }, v)))));
}
const MILES_PX = 1.609 * 1300 / 6371;
function HeroMap({
  near,
  fresh,
  sum
}) {
  const [geo, setGeo] = React.useState(null),
    [pts, setPts] = React.useState(null),
    [err, setErr] = React.useState(false);
  React.useEffect(() => {
    const get = u => fetch(u).then(r => {
      if (!r.ok) throw 0;
      return r.json();
    });
    Promise.all([get("/map/us.json"), get("/api/listings?dots=1&field=all")]).then(([g, d]) => {
      setGeo(g);
      setPts(d);
    }).catch(() => setErr(true));
  }, []);
  const fmt = n => n == null ? "—" : Number(n).toLocaleString();
  const xy = near?.meta?.near?.xy,
    r = near?.meta ? near.meta.near.mi * MILES_PX : 0;
  return React.createElement("aside", {
    style: {
      position: "relative",
      boxSizing: "border-box",
      background: "#0D1A2F",
      border: "1px solid #2A3B5C",
      borderRadius: 16,
      padding: "18px 18px 14px",
      boxShadow: "0 24px 60px rgba(0,0,0,.45)",
      ...DM
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      gap: 12,
      fontFamily: "Geist,sans-serif"
    }
  }, React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: "#fff"
    }
  }, "Every dot is a real internship"), React.createElement("span", {
    style: {
      fontSize: 12,
      color: "#8D9AB3"
    }
  }, pts ? `${fmt(pts.placed)} on the map` : "")), React.createElement("div", {
    style: {
      position: "relative",
      marginTop: 8
    }
  }, err ? React.createElement("p", {
    style: {
      fontSize: 13,
      color: "#8D9AB3",
      padding: "40px 0",
      textAlign: "center",
      fontFamily: "Geist,sans-serif"
    }
  }, "Map didn't load. ", React.createElement("a", {
    href: "/jobs/",
    style: {
      color: "#2FD39A"
    }
  }, "See the internships \u2192")) : React.createElement("svg", {
    viewBox: "0 0 975 610",
    role: "img",
    "aria-label": pts ? `Map of the US with ${fmt(pts.placed)} open internships, one dot per city` : "Loading map",
    style: {
      width: "100%",
      height: "auto",
      display: "block"
    }
  }, geo && React.createElement("path", {
    d: geo.nation,
    fill: "#11203A",
    stroke: "#2A3B5C",
    strokeWidth: "1"
  }), geo && React.createElement("path", {
    d: geo.borders,
    fill: "none",
    stroke: "#1C2C48",
    strokeWidth: ".8"
  }), pts && pts.dots.map(([x, y, n], i) => React.createElement("circle", {
    key: i,
    cx: x,
    cy: y,
    r: 1.6 + Math.sqrt(n) * 1.05,
    fill: "#2FD39A",
    fillOpacity: n > 20 ? .8 : .55
  })), xy && React.createElement("g", null, React.createElement("circle", {
    cx: xy[0],
    cy: xy[1],
    r: r,
    fill: "#2FD39A",
    fillOpacity: ".1",
    stroke: "#fff",
    strokeWidth: "3",
    strokeDasharray: "7 5"
  }), React.createElement("circle", {
    cx: xy[0],
    cy: xy[1],
    r: "5",
    fill: "#fff"
  }))), near?.meta && React.createElement("div", {
    className: "d-mapbadge",
    style: {
      position: "absolute",
      left: 8,
      bottom: 6,
      background: "rgba(7,15,30,.88)",
      border: "1px solid #2A3B5C",
      borderRadius: 10,
      padding: "8px 12px",
      fontFamily: "Geist,sans-serif"
    }
  }, React.createElement("span", {
    style: {
      fontSize: 20,
      fontWeight: 600,
      color: "#fff"
    }
  }, fmt(near.meta.count)), " ", React.createElement("span", {
    style: {
      fontSize: 13,
      color: "#CFD7E6"
    }
  }, "within ", near.meta.near.mi, " mi of ", near.meta.near.q)), near?.bad && React.createElement("div", {
    style: {
      position: "absolute",
      left: 8,
      bottom: 6,
      fontSize: 13,
      color: "#F2B8A2",
      fontFamily: "Geist,sans-serif"
    }
  }, "We couldn't find that ZIP.")), React.createElement("div", {
    style: {
      borderTop: "1px solid #22304D",
      marginTop: 10,
      paddingTop: 8
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 12,
      color: "#8D9AB3",
      fontFamily: "Geist,sans-serif",
      marginBottom: 2
    }
  }, React.createElement("span", null, "Just found"), React.createElement("span", null, sum ? `${fmt(sum.allMajors)} open · ${fmt(sum.hiringNow)} companies hiring` : "")), (fresh || []).slice(0, 3).map(j => React.createElement("a", {
    key: j.id,
    href: j.url,
    target: "_blank",
    rel: "noopener noreferrer",
    style: {
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      padding: "7px 0",
      borderTop: "1px solid #1A2640",
      textDecoration: "none",
      fontSize: 13
    }
  }, React.createElement("span", {
    style: {
      color: "#fff",
      fontFamily: "Geist,sans-serif",
      minWidth: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, j.company, " ", React.createElement("span", {
    style: {
      color: "#8D9AB3"
    }
  }, "\xB7 ", j.title)), React.createElement("span", {
    style: {
      color: "#2FD39A",
      flexShrink: 0
    }
  }, dAgo(j.first_seen))))));
}
function LandingD({
  onQuiz,
  onPage
}) {
  const [sum, setSum] = React.useState(null),
    [sumErr, setSumErr] = React.useState(false),
    [fresh, setFresh] = React.useState(null);
  const [q, setQ] = React.useState(""),
    [where, setWhere] = React.useState(""),
    [near, setNear] = React.useState(null);
  React.useEffect(() => {
    const z = where.trim();
    if (!/^\d{5}$/.test(z)) {
      setNear(null);
      return;
    }
    let live = true;
    const t = setTimeout(() => {
      fetch(`/api/listings?near=${z}&mi=50&field=all&limit=1&offset=0`).then(r => r.ok ? r.json() : Promise.reject(r.status)).then(d => {
        if (live) setNear({
          meta: d.meta
        });
      }).catch(() => {
        if (live) setNear({
          bad: true
        });
      });
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [where]);
  React.useEffect(() => {
    const pre = window.__btpPre || {};
    window.__btpPre = null;
    const get = u => fetch(u).then(r => {
      if (!r.ok) throw 0;
      return r.json();
    });
    (pre.sum || get("/api/listings?summary=1")).then(setSum).catch(() => setSumErr(true));
    (pre.fresh || get("/api/listings?field=all&limit=80")).then(d => {
      const co = new Set(),
        out = [];
      for (const l of d.listings || []) {
        if (co.has(l.company)) continue;
        co.add(l.company);
        out.push(l);
        if (out.length === 5) break;
      }
      setFresh(out);
    }).catch(() => setFresh([]));
  }, []);
  const go = e => {
    e.preventDefault();
    analytics.track("home_search", {
      has_query: !!q.trim(),
      has_state: !!where.trim()
    });
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    const w = where.trim().toLowerCase();
    if (/^\d{5}$/.test(w)) {
      p.set("near", w);
      p.set("mi", "50");
      p.set("major", "all");
      analytics.track("home_search_zip");
      location.href = "/jobs/?" + p.toString();
      return;
    }
    const code = /^[a-z]{2}$/.test(w) ? w.toUpperCase() : D_STATES[w] || null;
    p.set("state", code && Object.values(D_STATES).includes(code) ? code : "all");
    if (w === "remote" && !q.trim()) p.set("q", "remote");
    location.href = "/jobs/?" + p.toString();
  };
  const fmt = n => n == null ? "—" : Number(n).toLocaleString();
  const fields = sum?.byField ? Object.entries(sum.byField).filter(([k]) => D_FIELD[k]).sort((a, b) => b[1] - a[1]).slice(0, 8) : null;
  const pills = ["finance", "software", "mechanical", "marketing", "civil", "science_health"];
  const card = {
    background: "#fff",
    border: "1px solid #DCE2EC",
    borderRadius: 14
  };
  const wrap = {
    maxWidth: 1240,
    margin: "0 auto",
    padding: "0 24px"
  };
  return React.createElement(React.Fragment, null, React.createElement("section", {
    style: {
      position: "relative",
      overflow: "hidden",
      background: "#070F1E",
      color: "#E8EDF5"
    }
  }, React.createElement("div", {
    style: {
      ...wrap,
      position: "relative",
      paddingTop: 64,
      paddingBottom: 48,
      display: "flex",
      gap: 48,
      flexWrap: "wrap",
      alignItems: "center"
    }
  }, React.createElement("div", {
    style: {
      flex: "1 1 480px",
      minWidth: 0
    }
  }, React.createElement("p", {
    style: {
      fontSize: 14,
      fontWeight: 500,
      color: "#9FE5C8",
      margin: "0 0 18px"
    }
  }, React.createElement("span", {
    style: {
      display: "inline-block",
      width: 7,
      height: 7,
      borderRadius: "50%",
      background: "#2FD39A",
      marginRight: 8,
      verticalAlign: 1
    }
  }), sum ? `${fmt(sum.companies)} company job boards${sum.lastSync ? `, last checked ${dAgoLong(sum.lastSync)}` : ""}` : sumErr ? "Live numbers unavailable right now" : "Loading the latest numbers…"), React.createElement("h1", {
    style: {
      fontSize: "clamp(2.3rem,5vw,3.6rem)",
      lineHeight: 1.03,
      letterSpacing: "-0.035em",
      fontWeight: 600,
      margin: "0 0 16px",
      color: "#fff"
    }
  }, "Find your internship", React.createElement("br", null), "before the ", React.createElement("span", {
    style: {
      color: "#2FD39A"
    }
  }, "pile"), " does."), React.createElement("p", {
    style: {
      fontSize: 18,
      lineHeight: 1.5,
      color: "#9FAAC0",
      margin: "0 0 28px",
      maxWidth: 560
    }
  }, "Every major. Pulled straight from each company's own job board \u2014 no reposts, and jobs drop off when the company takes them down."), React.createElement("form", {
    onSubmit: go,
    role: "search",
    className: "d-search",
    style: {
      display: "flex",
      alignItems: "stretch",
      background: "#fff",
      borderRadius: 14,
      padding: 6,
      boxShadow: "0 0 0 1px #2FD39A33, 0 20px 50px rgba(0,0,0,.35)",
      maxWidth: 760
    }
  }, React.createElement("label", {
    style: {
      flex: "3 1 0",
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "0 14px",
      minWidth: 0
    }
  }, React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#55627A",
    strokeWidth: "2",
    "aria-hidden": "true"
  }, React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7"
  }), React.createElement("path", {
    d: "M20 20l-3.5-3.5"
  })), React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    "aria-label": "Role, company or major",
    placeholder: "Role, company or major",
    style: {
      flex: 1,
      minWidth: 0,
      border: 0,
      font: "inherit",
      fontSize: 16,
      color: "#0A1426",
      height: 48,
      background: "transparent",
      outline: "none"
    }
  })), React.createElement("span", {
    className: "d-sep",
    style: {
      width: 1,
      background: "#DCE2EC",
      margin: "10px 0"
    }
  }), React.createElement("label", {
    style: {
      flex: "2 1 0",
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "0 14px",
      minWidth: 0
    }
  }, React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#55627A",
    strokeWidth: "2",
    "aria-hidden": "true"
  }, React.createElement("path", {
    d: "M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"
  }), React.createElement("circle", {
    cx: "12",
    cy: "10",
    r: "2.5"
  })), React.createElement("input", {
    value: where,
    onChange: e => setWhere(e.target.value),
    "aria-label": "ZIP code or state",
    placeholder: "ZIP code or state",
    inputMode: "text",
    autoComplete: "postal-code",
    style: {
      flex: 1,
      minWidth: 0,
      border: 0,
      font: "inherit",
      fontSize: 16,
      color: "#0A1426",
      height: 48,
      background: "transparent",
      outline: "none"
    }
  })), React.createElement("button", {
    type: "submit",
    style: {
      font: "inherit",
      fontSize: 16,
      fontWeight: 600,
      background: "#0B7A55",
      color: "#fff",
      border: 0,
      padding: "0 28px",
      borderRadius: 10,
      cursor: "pointer",
      minHeight: 48
    }
  }, "Search")), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      marginTop: 16,
      alignItems: "center"
    }
  }, React.createElement("span", {
    style: {
      fontSize: 13,
      color: "#8D9AB3",
      marginRight: 4
    }
  }, "Popular:"), pills.map(k => React.createElement("a", {
    key: k,
    href: `/jobs/?major=${k}&state=all`,
    style: {
      fontSize: 13,
      color: "#CFD7E6",
      textDecoration: "none",
      border: "1px solid #22304D",
      padding: "6px 12px",
      borderRadius: 999
    }
  }, D_FIELD[k].split(" & ")[0]))), React.createElement("p", {
    style: {
      fontSize: 13,
      color: "#8D9AB3",
      marginTop: 18
    }
  }, "Free \xB7 no account needed to browse \xB7 ", React.createElement("button", {
    onClick: onQuiz,
    style: {
      background: "none",
      border: 0,
      padding: 0,
      color: "#2FD39A",
      cursor: "pointer",
      font: "inherit",
      fontWeight: 600
    }
  }, "2-minute match quiz"), " \xB7 ", React.createElement("a", {
    href: "/demo/",
    style: {
      color: "#2FD39A",
      fontWeight: 600,
      textDecoration: "none"
    }
  }, "90-second demo"))), React.createElement("div", {
    style: {
      position: "relative",
      flex: "1 1 340px",
      maxWidth: 560,
      minWidth: 0,
      width: "100%"
    }
  }, React.createElement(HeroMap, {
    near: near,
    fresh: fresh,
    sum: sum
  })))), React.createElement("main", {
    style: {
      ...wrap,
      paddingTop: 40,
      paddingBottom: 64,
      display: "flex",
      flexDirection: "column",
      gap: 40
    }
  }, React.createElement("section", {
    "aria-labelledby": "how-h"
  }, React.createElement("h2", {
    id: "how-h",
    style: {
      fontSize: 24,
      fontWeight: 600,
      letterSpacing: "-0.02em",
      margin: "0 0 16px",
      color: "#0A1426"
    }
  }, "How a job gets here"), React.createElement("div", {
    className: "d-grid3"
  }, [["1", "Straight from the company", `We read ${sum ? fmt(sum.companies) : "thousands of"} company job boards directly, every few hours. Not scraped job sites, not reposts.`], ["2", "Proven to be theirs", "A board only counts when we can prove it belongs to that company: their own website links to it, or the board itself names them."], ["3", "You apply on their site", "Every Apply button goes to the employer. When they take a job down, it drops off here too."]].map(([n, t, d]) => React.createElement("div", {
    key: n,
    style: {
      ...card,
      borderRadius: 12,
      padding: 20,
      display: "flex",
      gap: 14
    }
  }, React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 32,
      height: 32,
      borderRadius: "50%",
      background: "#E6F4EE",
      color: "#0B7A55",
      fontWeight: 600,
      display: "grid",
      placeItems: "center",
      flexShrink: 0,
      ...DM
    }
  }, n), React.createElement("div", null, React.createElement("p", {
    style: {
      fontSize: 16,
      fontWeight: 600,
      margin: "4px 0 6px",
      color: "#0A1426"
    }
  }, t), React.createElement("p", {
    style: {
      fontSize: 14,
      lineHeight: 1.5,
      color: "#55627A",
      margin: 0
    }
  }, d)))))), React.createElement("section", null, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 16,
      gap: 12
    }
  }, React.createElement("h2", {
    style: {
      fontSize: 24,
      fontWeight: 600,
      letterSpacing: "-0.02em",
      margin: 0,
      color: "#0A1426"
    }
  }, "Explore by major"), React.createElement("a", {
    href: "/jobs/?major=all&state=all",
    style: {
      fontSize: 14,
      color: "#0B7A55",
      textDecoration: "none",
      fontWeight: 500
    }
  }, "Every major \u2192")), React.createElement("div", {
    className: "d-grid4"
  }, (fields || Object.keys(D_FIELD).slice(0, 8).map(k => [k, null])).map(([k, n]) => React.createElement("a", {
    key: k,
    href: `/jobs/?major=${k}&state=all`,
    style: {
      ...card,
      borderRadius: 12,
      textDecoration: "none",
      color: "#0A1426",
      padding: 18,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10
    }
  }, React.createElement("span", {
    style: {
      fontWeight: 500
    }
  }, D_FIELD[k]), React.createElement("span", {
    style: {
      ...DM,
      fontSize: 13,
      color: "#55627A"
    }
  }, n == null ? "" : fmt(n)))))), sum?.top?.length > 0 && React.createElement("section", null, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 16,
      gap: 12
    }
  }, React.createElement("h2", {
    style: {
      fontSize: 24,
      fontWeight: 600,
      letterSpacing: "-0.02em",
      margin: 0,
      color: "#0A1426"
    }
  }, "Hiring the most interns right now"), React.createElement("a", {
    href: "/radar/",
    style: {
      fontSize: 14,
      color: "#0B7A55",
      textDecoration: "none",
      fontWeight: 500
    }
  }, "When companies open \u2192")), React.createElement("div", {
    className: "d-grid4"
  }, sum.top.slice(0, 4).map(c => React.createElement("article", {
    key: c.id,
    style: {
      ...card,
      padding: 20,
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      alignItems: "center"
    }
  }, React.createElement("span", {
    "data-logo-id": c.id,
    style: {
      width: 44,
      height: 44,
      borderRadius: 10,
      background: "#F1F4F9",
      border: "1px solid #DCE2EC",
      display: "grid",
      placeItems: "center",
      fontWeight: 600,
      flexShrink: 0,
      color: "#0A1426"
    }
  }, coInitials(c.company)), React.createElement("p", {
    style: {
      fontWeight: 600,
      margin: 0,
      color: "#0A1426"
    }
  }, c.company)), React.createElement("div", {
    style: {
      fontSize: 13,
      borderTop: "1px solid #EEF1F6",
      paddingTop: 12,
      color: "#0A1426"
    }
  }, React.createElement("b", {
    style: {
      ...DM,
      fontWeight: 500
    }
  }, c.n), " open internships"), React.createElement("a", {
    href: `/c/${encodeURIComponent(c.id)}`,
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "#0B7A55",
      textDecoration: "none"
    }
  }, "See internships \u2192"))))), React.createElement("section", null, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 16,
      gap: 12
    }
  }, React.createElement("h2", {
    style: {
      fontSize: 24,
      fontWeight: 600,
      letterSpacing: "-0.02em",
      margin: 0,
      color: "#0A1426"
    }
  }, "Everything after you find the job"), React.createElement("a", {
    href: "/demo/",
    style: {
      fontSize: 14,
      color: "#0B7A55",
      textDecoration: "none",
      fontWeight: 500
    }
  }, "See it in the 2-minute tour \u2192")), React.createElement("div", {
    className: "d-grid3"
  }, FEATURES.map(f => React.createElement("a", {
    key: f.k,
    href: f.h,
    onClick: f.h === "/#interview" ? e => {
      e.preventDefault();
      onPage("interview");
    } : undefined,
    className: "d-feat",
    style: {
      ...card,
      textDecoration: "none",
      color: "#0A1426",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }
  }, React.createElement("div", {
    "aria-hidden": "true",
    style: {
      background: "#F6F8FB",
      borderBottom: "1px solid #EEF1F6",
      height: 150,
      position: "relative",
      display: "grid",
      placeItems: "center",
      padding: 16
    }
  }, React.createElement(FeatViz, {
    k: f.k
  })), React.createElement("div", {
    style: {
      padding: 20
    }
  }, React.createElement("p", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "#0B7A55",
      margin: "0 0 6px",
      display: "flex",
      justifyContent: "space-between"
    }
  }, f.name, React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 500,
      color: "#8D9AB3"
    }
  }, "Example preview")), React.createElement("p", {
    style: {
      fontSize: 17,
      fontWeight: 600,
      margin: "0 0 6px"
    }
  }, f.t), React.createElement("p", {
    style: {
      fontSize: 14,
      lineHeight: 1.5,
      color: "#55627A",
      margin: 0
    }
  }, f.d))))))), React.createElement("footer", {
    style: {
      textAlign: "center",
      padding: "1.5rem",
      color: "#55627A",
      fontSize: 13,
      borderTop: "1px solid #DCE2EC",
      background: "#fff"
    }
  }, "\xA9 2026 Beat the Pile \xB7 Built for students \xB7 ", React.createElement("a", {
    href: "/privacy/",
    style: {
      color: "#55627A"
    }
  }, "Privacy"), " \xB7 ", React.createElement("button", {
    type: "button",
    onClick: () => window.iqReport && window.iqReport(),
    style: {
      background: "none",
      border: "none",
      color: "#55627A",
      cursor: "pointer",
      font: "inherit",
      textDecoration: "underline",
      padding: 0
    }
  }, "Report a problem")));
}
const TESTIMONIALS = [];
const UNIVERSITIES = ["American University", "Appalachian State University", "Arizona State University", "Auburn University", "Ball State University", "Baylor University", "Binghamton University", "Boise State University", "Boston College", "Boston University", "Bowling Green State University", "Brandeis University", "Brigham Young University", "Brown University", "Bucknell University", "Butler University", "Cal Poly SLO", "California State University, Fullerton", "California State University, Long Beach", "Carnegie Mellon University", "Case Western Reserve University", "Chapman University", "Clemson University", "Colgate University", "College of Charleston", "College of William & Mary", "Colorado School of Mines", "Colorado State University", "Columbia University", "Cornell University", "Creighton University", "Dartmouth College", "DePaul University", "Drexel University", "Duke University", "East Carolina University", "Elon University", "Emory University", "Fairfield University", "Florida Atlantic University", "Florida Gulf Coast University", "Florida International University", "Florida State University", "Fordham University", "George Mason University", "George Washington University", "Georgetown University", "Georgia State University", "Georgia Tech", "Gonzaga University", "Harvard University", "High Point University", "Hofstra University", "Howard University", "Illinois State University", "Indiana University Bloomington", "Iowa State University", "James Madison University", "Johns Hopkins University", "Kansas State University", "Kennesaw State University", "Kent State University", "Lafayette College", "Lehigh University", "Louisiana State University", "Loyola Marymount University", "Loyola University Chicago", "Marquette University", "MIT", "Miami University (Ohio)", "Michigan State University", "Mississippi State University", "Missouri State University", "Montclair State University", "NC State University", "New York University (NYU)", "Northeastern University", "Northern Arizona University", "Northern Illinois University", "Northwestern University", "Notre Dame", "Oakland University", "Ohio State University", "Ohio University", "Oklahoma State University", "Old Dominion University", "Oregon State University", "Pace University", "Penn State University", "Pepperdine University", "Princeton University", "Purdue University", "Quinnipiac University", "Rensselaer Polytechnic Institute (RPI)", "Rice University", "RIT", "Rowan University", "Rutgers University", "Saint Joseph's University", "Saint Louis University", "Salisbury University", "San Diego State University", "San Jose State University", "Santa Clara University", "Seton Hall University", "Southern Methodist University (SMU)", "Stanford University", "Stevens Institute of Technology", "Stony Brook University", "SUNY Albany", "Syracuse University", "Temple University", "Texas A&M University", "Texas Christian University (TCU)", "Texas State University", "Texas Tech University", "Towson University", "Tufts University", "Tulane University", "UC Berkeley", "UC Davis", "UC Irvine", "UC Riverside", "UC San Diego", "UC Santa Barbara", "UCLA", "University at Buffalo", "University of Alabama", "University of Arizona", "University of Arkansas", "University of Central Florida", "University of Chicago", "University of Cincinnati", "University of Colorado Boulder", "University of Connecticut", "University of Dayton", "University of Delaware", "University of Denver", "University of Florida", "University of Georgia", "University of Houston", "University of Illinois Chicago", "University of Illinois Urbana-Champaign", "University of Iowa", "University of Kansas", "University of Kentucky", "University of Louisville", "University of Maryland", "UMass Amherst", "University of Miami", "University of Michigan", "University of Minnesota", "University of Mississippi (Ole Miss)", "University of Missouri", "University of Nebraska-Lincoln", "University of Nevada, Las Vegas", "University of New Hampshire", "UNC Chapel Hill", "University of North Carolina at Charlotte", "University of North Texas", "University of Oklahoma", "University of Oregon", "University of Pennsylvania", "University of Pittsburgh", "University of Rhode Island", "University of Richmond", "University of Rochester", "University of San Diego", "University of South Carolina", "University of South Florida", "University of Southern California", "University of Tennessee", "UT Austin", "University of Texas at Dallas", "University of Utah", "University of Vermont", "University of Virginia", "University of Washington", "UW-Madison", "Vanderbilt University", "Villanova University", "Virginia Commonwealth University", "Virginia Tech", "Wake Forest University", "Washington University in St. Louis", "Wayne State University", "West Virginia University", "Western Michigan University", "Yale University", "Borough of Manhattan Community College", "Broward College", "Cuyahoga Community College", "Dallas College", "De Anza College", "Foothill College", "Houston Community College", "Lone Star College", "Miami Dade College", "Mt. San Antonio College", "Northern Virginia Community College (NOVA)", "Pasadena City College", "Santa Monica College", "Tarrant County College", "Valencia College", "Wake Tech Community College", "Other Community College", "Other"].sort();
const MAJORS = ["Accounting", "Actuarial Science", "Advertising", "Aerospace Engineering", "Agricultural Science", "Animation", "Anthropology", "Applied Mathematics", "Architecture", "Art History", "Artificial Intelligence", "Astronomy", "Athletic Training", "Biochemistry", "Bioinformatics", "Biology", "Biomedical Engineering", "Business Administration", "Business Analytics", "Chemical Engineering", "Chemistry", "Civil Engineering", "Classics", "Cognitive Science", "Communications", "Computer Engineering", "Computer Science", "Construction Management", "Criminal Justice", "Culinary Arts", "Cybersecurity", "Dance", "Data Science", "Dental (Pre-Dental)", "Early Childhood Education", "Economics", "Education", "Electrical Engineering", "English / Literature", "Entrepreneurship", "Environmental Engineering", "Environmental Science", "Exercise Science / Kinesiology", "Fashion Design", "Film & Television", "Finance", "Fine Arts", "Food Science", "Forensic Science", "Game Design", "Geography", "Geology", "Graphic Design", "Health Sciences", "History", "Hospitality Management", "Human Resources", "Industrial Design", "Industrial Engineering", "Information Systems", "Information Technology", "Interior Design", "International Business", "International Relations", "Journalism", "Law (Pre-Law)", "Liberal Arts", "Linguistics", "Management", "Management Information Systems", "Marketing", "Materials Science", "Mathematics", "Mechanical Engineering", "Medicine (Pre-Med)", "Microbiology", "Music", "Music Production", "Neuroscience", "Nursing", "Nutrition & Dietetics", "Occupational Therapy", "Operations Management", "Pharmacy (Pre-Pharmacy)", "Philosophy", "Photography", "Physical Therapy", "Physician Assistant (Pre-PA)", "Physics", "Political Science", "Psychology", "Public Health", "Public Policy", "Public Relations", "Real Estate", "Religious Studies", "Robotics", "Social Work", "Sociology", "Software Engineering", "Spanish", "Sports Management", "Statistics", "Supply Chain Management", "Sustainability", "Theater Arts", "Urban Planning", "Veterinary (Pre-Vet)", "Women's & Gender Studies", "Other"].sort();
const EXT_CATS = [{
  id: "leadership",
  label: "Leadership & Orgs",
  icon: "",
  color: "#0B7A55",
  why: "Leadership roles are the #1 thing recruiters look for beyond GPA.",
  options: [{
    name: "Student Government",
    roles: ["Senator/Representative", "Committee Chair", "VP / Secretary", "President"]
  }, {
    name: "Pre-Professional Club",
    roles: ["General Member", "Committee Lead", "Officer (VP/Treasurer)", "President / Founder"]
  }, {
    name: "Resident Advisor (RA)",
    roles: ["RA", "Senior RA", "Head RA"]
  }, {
    name: "Greek Life",
    roles: ["General Member", "Committee Chair", "Executive Officer", "Chapter President"]
  }, {
    name: "Multicultural / Identity Org",
    roles: ["Member", "Event Coordinator", "Officer", "President"]
  }, {
    name: "Honors Program / Society",
    roles: ["Member", "Committee Lead", "Officer", "President"]
  }, {
    name: "Other Leadership Role",
    roles: ["Member", "Officer", "Vice President / Treasurer", "President / Founder"],
    custom: true
  }]
}, {
  id: "competitions",
  label: "Competitions & Challenges",
  icon: "",
  color: "#FF8C00",
  why: "Competitions signal initiative and real-world problem-solving — recruiters love this.",
  options: [{
    name: "Case Competition",
    roles: ["Participated", "Advanced to Finals", "Regional Winner", "National Winner"]
  }, {
    name: "Hackathon",
    roles: ["Participated", "Top 10 Finish", "Runner-up", "1st Place / Winner"]
  }, {
    name: "Investment / Stock Pitch",
    roles: ["Participated", "Finalist", "Runner-up", "Winner"]
  }, {
    name: "Business Plan / Pitch Comp",
    roles: ["Participated", "Finalist", "Runner-up", "Winner"]
  }, {
    name: "Research Poster / Conference",
    roles: ["Presented", "Regional", "National", "Published"]
  }, {
    name: "Debate / Model UN",
    roles: ["Participant", "Award Winner", "Officer", "Secretary-General"]
  }, {
    name: "Other Competition / Challenge",
    roles: ["Participated", "Finalist", "Runner-up", "Winner"],
    custom: true
  }]
}, {
  id: "research",
  label: "Research & Innovation",
  icon: "",
  color: "#2563EB",
  why: "Research experience proves analytical thinking — critical for technical and finance roles.",
  options: [{
    name: "Professor Research Lab",
    roles: ["Research Assistant", "Co-author", "Lead Researcher", "Published Author"]
  }, {
    name: "Independent Research Project",
    roles: ["Completed", "Presented", "Award Winning", "Published"]
  }, {
    name: "Teaching Assistant (TA)",
    roles: ["Grader", "Lab TA", "Lecture TA", "Head TA"]
  }, {
    name: "Peer Tutor",
    roles: ["Informal", "Certified Tutor", "Lead Tutor", "Program Director"]
  }, {
    name: "Patent / Innovation Project",
    roles: ["Contributed", "Co-inventor", "Lead Inventor", "Granted Patent"]
  }, {
    name: "Study Abroad / Global Program",
    roles: ["Attended", "Led Project", "Program Lead", "Founded Program"]
  }, {
    name: "Other Research / Academic Activity",
    roles: ["Participated", "Active", "Leadership Role", "Published / Awarded"],
    custom: true
  }]
}, {
  id: "work",
  label: "Work & Entrepreneurship",
  icon: "",
  color: "#7C3AED",
  why: "Paid work experience — especially with real responsibility — is often weighted higher than GPA.",
  options: [{
    name: "Prior Internship",
    roles: ["Completed", "Return Offer", "Multiple Internships", "Full-time Convert"]
  }, {
    name: "Part-time / Campus Job",
    roles: ["General", "Team Lead", "Supervisor", "Manager"]
  }, {
    name: "Freelance Work",
    roles: ["Side Projects", "Regular Clients", "$1K+ Revenue", "$10K+ Revenue"]
  }, {
    name: "Founded a Business / Startup",
    roles: ["Concept Stage", "Early Revenue", "Active Business", "Funded / Scaled"]
  }, {
    name: "Social Media / Content Creator",
    roles: ["Small Following", "1K+ Followers", "10K+ Followers", "100K+ Followers"]
  }, {
    name: "Side Project (App/Tool/Product)",
    roles: ["Built It", "Users / Customers", "Revenue", "Acquired / Scaled"]
  }, {
    name: "Other Work Experience",
    roles: ["Did the Work", "Team Contributor", "Led a Project", "Managed Others"],
    custom: true
  }]
}, {
  id: "athletics",
  label: "Sports & Athletics",
  icon: "",
  color: "#059669",
  why: "Sports show discipline, teamwork, and grit — qualities every employer wants.",
  options: [{
    name: "Varsity Sport (D1/D2/D3)",
    roles: ["Athlete", "Starter", "Captain (Nominated)", "Team Captain"]
  }, {
    name: "Club Sport",
    roles: ["Player", "Starter", "Officer", "Captain / President"]
  }, {
    name: "Intramural Sport",
    roles: ["Participated", "Competitive", "Championship", "Multiple Championships"]
  }, {
    name: "Personal Athletic Achievement",
    roles: ["Active", "Competitive", "Regional Level", "National / Elite Level"]
  }, {
    name: "Other Sport / Athletic Activity",
    roles: ["Participant", "Regular", "Leadership", "Elite Level"],
    custom: true
  }]
}, {
  id: "media",
  label: "Media, Marketing & Events",
  icon: "",
  color: "#DC2626",
  why: "Content creation, event management, and communications roles build skills employers pay for.",
  options: [{
    name: "Student Newspaper / Magazine",
    roles: ["Writer / Contributor", "Section Editor", "Managing Editor", "Editor-in-Chief"]
  }, {
    name: "Podcast or YouTube Channel",
    roles: ["Creator", "Regular Output", "1K+ Audience", "10K+ Audience"]
  }, {
    name: "Campus Event Planning",
    roles: ["Volunteer", "Coordinator", "Lead Organizer", "Director (Large Events)"]
  }, {
    name: "Marketing / PR for Org",
    roles: ["Contributor", "Social Media Manager", "Marketing Director", "Grew Significantly"]
  }, {
    name: "Graphic Design / Creative Work",
    roles: ["Hobbyist", "Freelance Projects", "Client Work", "Portfolio + Revenue"]
  }, {
    name: "Other Media / Creative Activity",
    roles: ["Contributed", "Regular Output", "Leadership", "Founded / Directed"],
    custom: true
  }]
}, {
  id: "service",
  label: "Community & Volunteering",
  icon: "",
  color: "#0EA5E9",
  why: "Shows character — especially leadership in service roles, not just participation.",
  options: [{
    name: "Nonprofit Volunteer",
    roles: ["Occasional", "Regular (Monthly+)", "Team Lead", "Founded / Directed"]
  }, {
    name: "Mentorship Program",
    roles: ["Mentee", "Peer Mentor", "Program Officer", "Program Director"]
  }, {
    name: "Fundraising Campaign",
    roles: ["Contributed", "Co-led", "Led Campaign", "Major Campaign ($10K+)"]
  }, {
    name: "Community Organizing",
    roles: ["Participant", "Organizer", "Lead Organizer", "Founded Initiative"]
  }, {
    name: "Other Community / Volunteer Activity",
    roles: ["Participated", "Regular Contributor", "Leadership Role", "Founded / Directed"],
    custom: true
  }]
}];
const SKILLS = ["Communication / Presenting", "Data Analysis", "Excel / Google Sheets", "Figma / UI Design", "Java", "JavaScript / TypeScript", "Leadership & Team Management", "Market Research", "Microsoft Office Suite", "Project Management", "Public Speaking", "Python", "R / MATLAB", "SQL / Databases", "Tableau / Power BI", "Video / Photo Editing"].sort();
const SKILLS_BY_FIELD = {
  cs: ["Python", "Java / C++", "C# / .NET", "Go / Rust", "Data Structures & Algorithms", "Git / Version Control", "SQL & Databases", "NoSQL (MongoDB)", "React / Front-End", "Vue / Angular", "Node.js / Backend", "REST APIs", "GraphQL", "Cloud (AWS / GCP / Azure)", "Docker / Kubernetes", "CI/CD Pipelines", "Unit Testing", "Agile / Scrum", "Linux / Command Line", "Mobile (iOS / Android)", "Machine Learning Basics", "Cybersecurity Basics", "Hackathon Experience", "Open Source Contributions"],
  data: ["Python (pandas, NumPy)", "SQL", "Statistics & Probability", "Machine Learning", "Deep Learning Basics", "Tableau / Power BI", "R", "A/B Testing", "Excel Modeling", "ETL / Data Pipelines", "Jupyter Notebooks", "Data Visualization", "Big Data (Spark)", "Cloud Data Warehouses", "Communicating Insights", "Data Cleaning / Wrangling", "Predictive Modeling", "Dashboarding"],
  ece: ["Circuit Design", "MATLAB / Simulink", "Embedded C", "Microcontrollers (Arduino / STM32)", "PCB Design (Altium / KiCad)", "Signal Processing", "FPGA / Verilog", "Oscilloscope & Lab Tools", "Power Systems", "Hardware Prototyping", "Robotics", "Soldering", "Control Systems", "RF / Communications", "Sensors & IoT", "CAD (Electrical)"],
  mech: ["SolidWorks / CAD", "ANSYS / FEA", "Thermodynamics", "Fluid Mechanics", "MATLAB", "3D Printing / Prototyping", "GD&T Tolerancing", "Manufacturing Processes", "Statics & Dynamics", "CNC Machining", "Project Management", "Technical Drawing", "CFD Analysis", "Heat Transfer", "Materials Selection", "SAE / Baja / Formula", "Robotics", "CAM Software"],
  civil: ["AutoCAD / Civil 3D", "Structural Analysis", "Revit / BIM", "Surveying", "Concrete & Steel Design", "Hydraulics", "Geotechnical Basics", "Project Estimating", "Site Inspection", "OSHA Awareness", "Technical Reporting", "ArcGIS", "Construction Management", "Transportation Design", "Environmental Compliance", "Load Calculations"],
  chem_e: ["Process Simulation (Aspen)", "Mass & Energy Balances", "Thermodynamics", "Reaction Kinetics", "Lab Safety / GMP", "P&ID Reading", "MATLAB", "Process Control", "Heat Transfer", "Pilot Plant Experience", "Data Analysis", "Separations / Distillation", "Fluid Dynamics", "Six Sigma Basics", "AIChE Membership"],
  bio: ["Lab Techniques (PCR, gels)", "Cell Culture", "Microscopy", "Data Analysis (R / Python)", "Aseptic Technique", "Pipetting", "Literature Review", "Lab Notebook Discipline", "Lab Safety Certification", "Scientific Writing", "Research Poster", "ELISA / Western Blot", "Flow Cytometry", "Bioinformatics Basics", "Microsoft Excel", "Clinical Research Basics"],
  chem: ["Wet Lab Techniques", "Spectroscopy (NMR, IR, MS)", "Titration & Analysis", "Lab Safety", "Organic Synthesis", "Chromatography (HPLC / GC)", "Data Analysis", "Lab Notebook Discipline", "Instrumentation", "Scientific Writing", "Undergrad Research", "Analytical Methods", "Quality Control (QA/QC)", "ACS Membership"],
  finance: ["Financial Modeling", "Excel (Advanced)", "Valuation (DCF, Comps)", "Accounting Fundamentals", "Bloomberg Terminal", "Pitch Deck Building", "Market Research", "PowerPoint", "Python for Finance", "Series Exam Prep", "Investment Club", "Financial Statement Analysis", "Risk Analysis", "M&A Basics", "Attention to Detail", "VBA / Macros"],
  accounting: ["GAAP Knowledge", "Excel (Advanced)", "Financial Statement Analysis", "QuickBooks / ERP", "Audit Basics", "Tax Fundamentals", "Reconciliation", "Attention to Detail", "Bookkeeping", "Data Entry Accuracy", "CPA Exam Track", "SAP / Oracle", "Cost Accounting", "Beta Alpha Psi"],
  econ: ["Econometrics", "STATA / R", "Excel Modeling", "Data Analysis", "Statistics", "Research & Writing", "Market Analysis", "Python", "Game Theory", "Presenting Findings", "Policy Analysis", "Forecasting", "Economics Club"],
  business: ["Excel & Data Analysis", "PowerPoint / Presentations", "Project Management", "Market Research", "CRM (Salesforce / HubSpot)", "Financial Literacy", "Public Speaking", "Leadership Experience", "Case Competitions", "Budgeting", "Stakeholder Communication", "Strategic Thinking", "Operations / Logistics", "Negotiation", "Process Improvement", "Agile / Scrum"],
  marketing: ["Social Media Strategy", "Content Creation", "SEO / SEM", "Google Analytics", "Copywriting", "Canva / Adobe Basics", "Email Marketing", "Brand Research", "A/B Testing", "Influencer Outreach", "CRM Tools", "Campaign Reporting", "Paid Ads (Meta / Google)", "Video Editing", "Marketing Automation", "Market Segmentation"],
  comms: ["Copywriting", "Public Speaking", "Media Relations", "Social Media Management", "Press Release Writing", "AP Style", "Event Planning", "Adobe Basics", "Storytelling", "Interviewing", "Crisis Messaging", "Podcast / Audio", "Video Production", "Campus Media Experience"],
  design: ["Figma", "Adobe Photoshop", "Adobe Illustrator", "Adobe InDesign", "Typography", "UI / UX Principles", "Prototyping", "Wireframing", "Brand Identity", "Motion (After Effects)", "User Research", "Design Systems", "3D (Blender)", "Web Design (HTML/CSS)", "Portfolio Site", "Accessibility Design"],
  psych: ["Research Methods", "SPSS / Statistics", "Survey Design", "Data Analysis", "APA Writing", "Literature Review", "Active Listening", "Behavioral Coding", "Lab / RA Experience", "Empathy & Rapport", "Presentation Skills", "Qualitative Interviewing", "Case Management Basics", "Psych Club"],
  polisci: ["Policy Research", "Persuasive Writing", "Public Speaking", "Data Analysis", "Polling / Survey Literacy", "Debate Experience", "Stakeholder Mapping", "Legislative Tracking", "Mock Trial / Model UN", "Op-Ed Writing", "Campaign Volunteering", "Grant Writing", "Constituent Communication"],
  english: ["Editing & Proofreading", "Copywriting", "Research", "AP / Chicago Style", "Content Writing", "Storytelling", "CMS (WordPress)", "Public Speaking", "Critical Analysis", "Grant / Proposal Writing", "Social Media Writing", "SEO Writing", "Technical Writing", "Campus Publication"],
  health: ["BLS / CPR Certification", "Patient Care Basics", "Vital Signs", "Medical Terminology", "EHR Systems", "HIPAA Awareness", "Clinical Rotations", "Bedside Manner / Communication", "Attention to Detail", "Time Management", "First Aid", "Phlebotomy Basics", "Shadowing Hours", "Care Coordination", "Health Sciences Org"],
  math: ["Proof Writing", "MATLAB", "Python / R", "Statistics", "Linear Algebra", "Numerical Methods", "LaTeX", "Modeling Competitions", "Data Analysis", "Problem Solving", "Logical Reasoning", "Optimization", "Actuarial Exam Prep", "Math Club / Tutoring"],
  envsci: ["Field Sampling", "GIS (ArcGIS)", "Data Analysis (R)", "Environmental Policy", "Lab Techniques", "Sustainability Reporting", "Water / Soil Testing", "Scientific Writing", "Statistics", "Conservation Club", "Grant Research", "Remote Sensing", "Environmental Compliance", "Public Outreach"],
  education: ["Lesson Planning", "Classroom Management", "Tutoring Experience", "Curriculum Design", "Public Speaking", "Google Classroom / LMS", "Differentiated Instruction", "Patience & Empathy", "Assessment Design", "Student Teaching", "Parent Communication", "Special Education Basics", "Education Club"],
  default: ["Communication / Presenting", "Microsoft Office Suite", "Excel / Google Sheets", "Data Analysis", "Project Management", "Leadership & Team Management", "Public Speaking", "Problem Solving", "Time Management", "Teamwork", "Adaptability", "Customer Service", "Writing", "Research", "Critical Thinking", "Organization", "Attention to Detail", "Multitasking", "Foreign Language", "Social Media"]
};
function fieldForMajor(major) {
  const m = (major || "").toLowerCase();
  if (m.includes("data science") || m.includes("statistic")) return "data";
  if (m.includes("computer science") || m.includes("software") || m.includes("cyber") || m.includes("information tech") || m.includes("artificial") || m.includes("management information")) return "cs";
  if (m.includes("computer engineer") || m.includes("electrical")) return "ece";
  if (m.includes("mechanical") || m.includes("aerospace") || m.includes("industrial") || m.includes("materials")) return "mech";
  if (m.includes("civil") || m.includes("construction") || m.includes("architecture") || m.includes("urban")) return "civil";
  if (m.includes("chemical engineer")) return "chem_e";
  if (m.includes("biomed") || m.includes("biology") || m.includes("neuroscience") || m.includes("biochem") || m.includes("pre-med") || m.includes("medicine")) return "bio";
  if (m.includes("chemistry") || m.includes("physics") || m.includes("forensic")) return "chem";
  if (m.includes("finance") || m.includes("real estate")) return "finance";
  if (m.includes("accounting")) return "accounting";
  if (m.includes("economics")) return "econ";
  if (m.includes("business") || m.includes("management") || m.includes("supply chain") || m.includes("operations") || m.includes("entrepreneur") || m.includes("hospitality") || m.includes("human resources") || m.includes("sports management")) return "business";
  if (m.includes("marketing") || m.includes("advertising")) return "marketing";
  if (m.includes("communication") || m.includes("journalism") || m.includes("public relations") || m.includes("media") || m.includes("film") || m.includes("theater")) return "comms";
  if (m.includes("graphic") || m.includes("fashion") || m.includes("design") || m.includes("art") || m.includes("music")) return "design";
  if (m.includes("psychology") || m.includes("sociology") || m.includes("social work") || m.includes("anthropology")) return "psych";
  if (m.includes("political") || m.includes("law") || m.includes("criminal") || m.includes("public policy") || m.includes("international relations")) return "polisci";
  if (m.includes("english") || m.includes("literature") || m.includes("writing") || m.includes("history") || m.includes("philosophy") || m.includes("liberal arts") || m.includes("linguistic")) return "english";
  if (m.includes("nursing") || m.includes("health") || m.includes("nutrition") || m.includes("kinesiology") || m.includes("exercise") || m.includes("physician assistant") || m.includes("pre-pa") || m.includes("physical therapy") || m.includes("occupational therapy") || m.includes("dental")) return "health";
  if (m.includes("math")) return "math";
  if (m.includes("environmental") || m.includes("geology")) return "envsci";
  if (m.includes("education")) return "education";
  return "default";
}
function skillsForMajor(major) {
  return SKILLS_BY_FIELD[fieldForMajor(major)] || SKILLS_BY_FIELD.default;
}
const GRAD_YEARS = ["May 2025", "Dec 2025", "May 2026", "Dec 2026", "May 2027", "Dec 2027", "May 2028", "Dec 2028", "May 2029", "Dec 2029", "May 2030", "Dec 2030", "Graduate Student"];
const GPA_OPTS = ["4.0", "3.7–3.9", "3.5–3.6", "3.0–3.4", "2.5–2.9", "Below 2.5"];
const TYPE_OPTS = ["Any", "Hybrid", "In-person", "Remote"];
const TERM_OPTS = ["Summer 2026", "Fall 2026", "Spring 2027", "Summer 2027"];
const STEP_HINTS = {
  university: "Your school's reputation and alumni network directly affect which companies recruit you.",
  gradYear: "Hiring timelines vary — we match you to companies currently recruiting for your graduation date.",
  term: "Timing is huge. Most summer internships fill the prior fall — applying late sharply lowers your real odds, and we show that honestly.",
  major: "The most important factor. We find companies that specifically hire your major.",
  gpa: "Honest answers give better matches. Many great firms don't require a 4.0.",
  extracurriculars: "Recruiters care more about leadership roles than participation. Be specific.",
  skills: "Technical skills get you past automated screening filters. Select what you actually know.",
  type: "Narrows results so you only see positions that actually fit your life.",
  zip: "This helps us factor location into your matches and tailor your search.",
  radius: "Cast wider for more options — especially in rural areas."
};
const STEPS = [{
  key: "resume",
  label: "Start with your resume?",
  type: "resume"
}, {
  key: "university",
  label: "Which university do you attend?",
  type: "search",
  options: UNIVERSITIES
}, {
  key: "gradYear",
  label: "When do you graduate?",
  type: "chips",
  options: GRAD_YEARS
}, {
  key: "targetTerm",
  label: "Which term are you applying for?",
  type: "chips",
  options: TERM_OPTS
}, {
  key: "major",
  label: "What's your major?",
  type: "search",
  multi: true,
  maxPicks: 3,
  options: MAJORS
}, {
  key: "gpa",
  label: "What's your GPA?",
  type: "chips",
  options: GPA_OPTS
}, {
  key: "extracurriculars",
  label: "What are you involved in?",
  type: "extracurricular"
}, {
  key: "skills",
  label: "What are your top skills?",
  type: "multi",
  options: SKILLS
}, {
  key: "type",
  label: "What type of internship?",
  subLabel: "Remote = nationwide search, no location filter. Hybrid/In-person = local to your ZIP. Any = mostly local, mixed in-person/hybrid.",
  type: "chips",
  options: TYPE_OPTS
}, {
  key: "zip",
  label: "What's your zip code?",
  type: "zip"
}];
const TIPS = [{
  cat: "Timing",
  icon: "",
  title: "Apply the fall before, not the spring of",
  text: "The single biggest mistake students make: applying in spring for that same summer. Most competitive summer internships open August–October the year before. If you're applying late, apply anyway — but know the strongest roles are usually gone, and target companies with rolling or later deadlines."
}, {
  cat: "Timing",
  icon: "",
  title: "Big tech opens earliest",
  text: "In software, the calendar roughly runs: Google and Microsoft open late summer, Meta in early fall, and Amazon reviews on a rolling basis. Apply to all of them at once rather than waiting to hear back from one before trying the next."
}, {
  cat: "Resume",
  icon: "",
  title: "A solid application beats a perfect GPA",
  text: "A 3.2 with two relevant projects you can talk about for five minutes will often beat a 3.9 with nothing to show. Recruiters hire for evidence you can do the work — build something, then make it the center of your resume and interviews."
}, {
  cat: "Resume",
  icon: "",
  title: "Mirror the job description's keywords",
  text: "Many companies screen resumes with software before a human sees them. Pull two or three exact phrases from the posting (tools, skills, responsibilities) and make sure they appear naturally in your resume. It's not gaming the system — it's speaking their language."
}, {
  cat: "Applications",
  icon: "",
  title: "Apply within 48 hours of a posting going live",
  text: "Early applicants get reviewed first, and many roles fill before the listed deadline. Set up alerts on the job boards and company pages for your target field so you catch postings while they're fresh."
}, {
  cat: "Applications",
  icon: "",
  title: "Don't just chase the famous names",
  text: "Everyone applies to the same ten brand-name companies, which makes them brutally competitive. The regional firms and mid-size companies most students overlook often have real openings and far less competition. Apply to your full list."
}, {
  cat: "Follow-up",
  icon: "",
  title: "A polite follow-up genuinely works",
  text: "Send a short, courteous follow-up email five to seven business days after applying or interviewing. It's not annoying — it signals genuine interest and puts you back on top of the pile. Keep it to a few sentences and reference the specific role."
}, {
  cat: "Networking",
  icon: "",
  title: "Referrals beat cold applications",
  text: "A referral can move your application past the first filter entirely. Find one alum or connection at a target company on LinkedIn, send a brief, specific, respectful message, and ask if they'd be open to referring you. A few referrals are worth dozens of cold applies."
}, {
  cat: "Interviews",
  icon: "",
  title: "Have three stories ready",
  text: "Most behavioral interviews come down to a handful of questions about teamwork, challenge, and leadership. Prepare three concrete stories from your experience that you can adapt on the fly, structured as situation → what you did → result. Practice them out loud."
}, {
  cat: "Mindset",
  icon: "",
  title: "Rejection is the default, not the exception",
  text: "Strong candidates routinely apply to 50+ roles to land a few. A rejection — or silence — usually means timing or volume, not that you're not good enough. Keep your pipeline full so no single 'no' carries too much weight."
}, {
  cat: "Resume",
  icon: "",
  title: "Lead bullet points with results, not duties",
  text: "\"Increased club membership 40% by launching a referral drive\" beats \"Responsible for membership.\" Numbers and outcomes catch a recruiter's eye in the six seconds they spend scanning. Start each bullet with a strong verb and end with an impact."
}, {
  cat: "Applications",
  icon: "",
  title: "Keep a simple application tracker",
  text: "Once you're applying to dozens of roles, you'll lose track of where you stand. A simple list of company, date applied, status, and follow-up date saves you from missing deadlines or following up twice. Beat the Pile's dashboard does this for you."
}, {
  cat: "Networking",
  icon: "",
  title: "Ask for advice, not a job",
  text: "\"Can you give me a job?\" puts people on the spot. \"Could I ask you two questions about how you got into this field?\" gets a yes far more often — and those conversations are where referrals quietly come from. Be genuinely curious, not transactional."
}, {
  cat: "Interviews",
  icon: "",
  title: "Always have questions to ask them",
  text: "\"Do you have any questions for us?\" is not optional — having none signals low interest. Prepare three: one about the team, one about the work itself, one about growth. Avoid asking things easily found on their website."
}, {
  cat: "Timing",
  icon: "",
  title: "Reapply — being early last year helps this year",
  text: "If you applied somewhere and didn't get it, applying again the next cycle isn't desperate, it's normal. Recruiters often view returning applicants favorably, especially if you've added skills or experience since. Persistence reads as genuine interest."
}, {
  cat: "Resume",
  icon: "",
  title: "Tailor your resume per role type",
  text: "You don't need 50 versions, but having 2-3 — say one for technical roles and one for business roles — lets you front-load the most relevant experience for each. Beat the Pile lets you save multiple named resumes and pick one per application."
}, {
  cat: "Mindset",
  icon: "",
  title: "Cast a wide net early, then focus",
  text: "Early on, apply broadly to learn what sticks and get interview reps. As you get callbacks, you'll see which roles fit — then concentrate your energy there. Don't over-optimize your first ten applications; treat them as practice."
}, {
  cat: "Networking",
  icon: "",
  title: "Your career center is underused gold",
  text: "Campus career centers have employer connections, resume reviews, and often exclusive postings most students ignore. They're already paid for by your tuition. Book one appointment this week — it's the highest-leverage hour you're not using."
}];
const TIP_CATS = ["All", "Timing", "Resume", "Applications", "Follow-up", "Networking", "Interviews", "Mindset"];
function MatchBar({
  pct,
  color,
  delay = 0
}) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(pct), delay + 200);
    return () => clearTimeout(t);
  }, [pct, delay]);
  return React.createElement("div", {
    style: {
      background: "#E8F5F0",
      borderRadius: 99,
      height: 6,
      overflow: "hidden"
    }
  }, React.createElement("div", {
    style: {
      width: `${w}%`,
      height: "100%",
      background: color,
      borderRadius: 99,
      transition: "width 1.4s cubic-bezier(0.4,0,0.2,1)"
    }
  }));
}
function AnimatedPct({
  target,
  color
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let start;
    const dur = 1000;
    const tick = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      setN(Math.round(p * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    const t = setTimeout(() => requestAnimationFrame(tick), 300);
    return () => clearTimeout(t);
  }, [target]);
  return React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 32,
      color,
      lineHeight: 1,
      letterSpacing: "-1.5px"
    }
  }, n, "%");
}
function Counter({
  target,
  suffix
}) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      let start;
      const tick = ts => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / 1400, 1);
        setN(Math.round(p * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      obs.disconnect();
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return React.createElement('span', {
    ref
  }, n + suffix);
}
function MatchChip({
  label,
  accent
}) {
  return React.createElement("span", {
    style: {
      background: `${accent}18`,
      color: accent,
      fontSize: 10,
      fontWeight: 700,
      padding: "3px 10px",
      borderRadius: 99,
      border: `1px solid ${accent}30`,
      whiteSpace: "nowrap",
      letterSpacing: "0.3px"
    }
  }, label);
}
function Confetti() {
  const pieces = Array.from({
    length: 24
  }, (_, i) => ({
    id: i,
    color: PALETTE[i % PALETTE.length],
    x: Math.random() * 100,
    delay: Math.random() * 1.5,
    size: 6 + Math.random() * 8,
    rot: Math.random() * 360
  }));
  return React.createElement("div", {
    style: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: 999,
      overflow: "hidden"
    }
  }, pieces.map(p => React.createElement("div", {
    key: p.id,
    style: {
      position: "absolute",
      left: `${p.x}%`,
      top: -20,
      width: p.size,
      height: p.size,
      background: p.color,
      borderRadius: p.id % 3 === 0 ? "50%" : 2,
      animation: `confettiFall 2.5s ${p.delay}s ease-in forwards`,
      transform: `rotate(${p.rot}deg)`
    }
  })));
}
function coInitials(n) {
  const w = String(n || "").replace(/[^A-Za-z0-9& ]/g, " ").split(/\s+/).filter(x => x && !/^(and|of|the|&|inc|llc|corp|co)$/i.test(x));
  if (!w.length) return "·";
  return (w.length === 1 ? w[0].slice(0, 2) : w[0][0] + w[1][0]).toUpperCase();
}
function BlurCard({
  company
}) {
  const accent = company?.match >= 70 ? G : company?.match >= 50 ? AM : CR;
  return React.createElement("div", {
    style: {
      position: "relative",
      borderRadius: var_rl,
      border: `1px solid ${GL}`,
      overflow: "hidden",
      background: "#fff",
      minHeight: 240
    }
  }, React.createElement("div", {
    style: {
      filter: "blur(8px)",
      opacity: 0.3,
      padding: "1.5rem",
      pointerEvents: "none",
      userSelect: "none"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: "0.75rem"
    }
  }, React.createElement("div", null, React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 16,
      color: "#0B1220"
    }
  }, company?.name || "Regional Company"), React.createElement("div", {
    style: {
      color: "#4A5568",
      fontSize: 13,
      marginTop: 2
    }
  }, company?.role || "Internship Role"), React.createElement("div", {
    style: {
      color: "#6B7280",
      fontSize: 12,
      marginTop: 2
    }
  }, company?.location || "City, ST")), React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 32,
      color: accent
    }
  }, company?.match || 74, "%")), React.createElement("div", {
    style: {
      background: "#E8F5F0",
      borderRadius: 99,
      height: 6,
      marginBottom: "0.75rem"
    }
  }, React.createElement("div", {
    style: {
      width: `${company?.match || 74}%`,
      height: "100%",
      background: accent,
      borderRadius: 99
    }
  })), React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#4A5568",
      lineHeight: 1.5
    }
  }, company?.reason || "Strong local fit for your major and profile.")), React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(255,255,255,0.5)"
    }
  }, React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "20px 28px",
      background: "white",
      borderRadius: var_rl,
      border: `1.5px solid ${GL}`,
      boxShadow: "0 1px 2px rgba(11,18,32,.06)"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 28,
      marginBottom: 8
    }
  }), React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: "#0B1220",
      marginBottom: 4
    }
  }, "Unlock with Pro"), React.createElement("div", {
    style: {
      fontSize: 12,
      color: "#4A5568"
    }
  }, "See this match + ", " ", React.createElement("span", {
    style: {
      color: G,
      fontWeight: 600
    }
  }, "7 more companies")))));
}
const var_r = "8px",
  var_rl = "10px",
  var_rxl = "14px";
function experienceFromGrad(gradYear) {
  if (!gradYear) return {
    factor: 0.6,
    label: ""
  };
  if (/grad/i.test(gradYear)) return {
    factor: 1.0,
    label: "As a graduate student, you bring the most experience — lean into that in applications."
  };
  const now = new Date(2026, 4, 21);
  const m = gradYear.match(/(May|Dec)\s+(\d{4})/i);
  if (!m) return {
    factor: 0.6,
    label: ""
  };
  const gradMonth = /may/i.test(m[1]) ? 4 : 11;
  const gradDate = new Date(parseInt(m[2], 10), gradMonth, 1);
  const monthsToGrad = (gradDate.getFullYear() - now.getFullYear()) * 12 + (gradDate.getMonth() - now.getMonth());
  let factor, label;
  if (monthsToGrad <= 2) {
    factor = 1.0;
    label = "You're about to graduate — you have the most coursework and experience behind you, which strengthens your odds.";
  } else if (monthsToGrad <= 14) {
    factor = 0.9;
    label = "As a rising senior, you're in the strongest position experience-wise — recruiters favor near-grads for internships.";
  } else if (monthsToGrad <= 26) {
    factor = 0.72;
    label = "As a junior-level student, you've got solid coursework behind you — a competitive spot for most internships.";
  } else if (monthsToGrad <= 38) {
    factor = 0.55;
    label = "As an underclassman, you're early — that's great for getting ahead, but expect more competition from older students for the same roles.";
  } else {
    factor = 0.42;
    label = "As a first-year, you're applying early in your journey — focus on roles open to underclassmen, and know your odds reflect competing against more experienced students.";
  }
  return {
    factor,
    label
  };
}
function termTiming(targetTerm) {
  const now = new Date(2026, 4, 21);
  const parts = (targetTerm || "").split(" ");
  const season = parts[0],
    yr = parseInt(parts[1], 10);
  const startMonth = {
    Summer: 5,
    Fall: 8,
    Spring: 0,
    Winter: 11
  }[season];
  if (startMonth === undefined || !yr) return {
    mult: 0.85,
    months: 12
  };
  const months = (yr - now.getFullYear()) * 12 + (startMonth - now.getMonth());
  let mult;
  if (months < 1) mult = 0.18;else if (months < 3) mult = 0.35;else if (months < 6) mult = 0.62;else if (months <= 10) mult = 1.0;else mult = 0.82;
  return {
    mult,
    months
  };
}
function timingNote(targetTerm) {
  const {
    months
  } = termTiming(targetTerm);
  const t = targetTerm || "that term";
  if (months < 1) return `You're applying for ${t} after the window has basically closed — most of these roles were filled months ago. The estimates below are intentionally low.`;
  if (months < 3) return `Heads up: applying now for ${t} is very late. Most of these internships fill the prior fall, so your odds are lower — and that's reflected honestly below.`;
  if (months < 6) return `You're a little behind the ideal window for ${t}. Some roles are still open, but the most competitive ones are likely gone.`;
  if (months <= 10) return `Good timing — you're applying in the sweet spot for ${t}. These estimates reflect a realistic, on-time application.`;
  return `You're applying early for ${t}. That's smart, but many postings aren't open yet, so treat these as a forward-looking estimate.`;
}
const EXCEPTIONAL_KEYWORDS = ["president", "founder", "founded", "captain", "chair", "head ", "national", "winner", "1st place", "published", "funded", "scaled", "secretary-general", "director", "editor-in-chief", "valedictorian", "executive", "ceo", "100k", "10k+ revenue", "$10k", "return offer", "full-time convert", "co-inventor", "granted patent", "lead "];
function exceptionalPicks(extPicks) {
  return (extPicks || []).filter(e => {
    const r = (e.role || "").toLowerCase();
    return EXCEPTIONAL_KEYWORDS.some(k => r.includes(k));
  });
}
function leadershipBonus(extPicks) {
  const n = exceptionalPicks(extPicks).length;
  if (n <= 0) return 0;
  if (n === 1) return 0.6;
  if (n === 2) return 0.85;
  return 1.0;
}
function profileScore(ans, extPicks) {
  const g = {
    "4.0": 1,
    "3.7–3.9": 0.9,
    "3.5–3.6": 0.8,
    "3.0–3.4": 0.65,
    "2.5–2.9": 0.5,
    "Below 2.5": 0.38
  }[ans.gpa] || 0.6;
  const sk = Math.min((ans.skills || []).length, 8) / 8;
  const ec = Math.min((extPicks || []).length, 5) / 5;
  const exp = experienceFromGrad(ans.gradYear).factor;
  const lead = leadershipBonus(extPicks);
  return 0.32 * g + 0.23 * exp + 0.20 * sk + 0.13 * ec + 0.12 * lead;
}
function companyFitScore(company) {
  if (typeof company.match === "number") return Math.max(0.12, Math.min(0.97, company.match / 100));
  let base = company.tier === "national" ? 0.32 : 0.65;
  const bandAdj = {
    "in-town": 0.05,
    "nearby": 0.025,
    "metro": 0,
    "regional": -0.04,
    "remote": 0
  }[company.locationBand] || 0;
  base += bandAdj;
  if (company.verified) base += 0.03;
  const seed = (company.name || "") + (company.role || "");
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = hash * 31 + seed.charCodeAt(i) >>> 0;
  }
  const rand = hash % 1000 / 1000;
  base += (rand - 0.5) * 0.18;
  return Math.max(0.12, Math.min(0.97, base));
}
function honestScore(company, ans, extPicks) {
  const fit = companyFitScore(company);
  const prof = profileScore(ans, extPicks);
  const {
    mult
  } = termTiming(ans.targetTerm);
  const profileSwing = company.tier === "national" ? 0.16 + 0.40 * prof + 0.85 * prof * prof : 0.60 + 0.40 * prof;
  let pct = Math.round(fit * profileSwing * mult * 100);
  pct = Math.max(1, Math.min(98, pct));
  const spread = mult < 0.4 ? 10 : 8;
  const low = Math.max(1, pct - spread),
    high = Math.min(99, pct + Math.round(spread * 0.7));
  return {
    pct,
    low,
    high,
    _profile: Math.round(prof * 100),
    _timing: Math.round(mult * 100),
    _fit: Math.round(fit * 100),
    _exp: Math.round(experienceFromGrad(ans.gradYear).factor * 100),
    _lead: Math.round(leadershipBonus(extPicks) * 100)
  };
}
function generateReason(c, ans, extPicks) {
  const band = {
    "in-town": "right in your area",
    "nearby": "close to you",
    "metro": "in your metro area",
    "regional": "within your radius",
    "remote": "fully remote"
  }[c.locationBand] || "hiring right now";
  const pct = c.match || 0;
  const lead = exceptionalPicks(extPicks);
  const exp = experienceFromGrad(ans.gradYear);
  const seed = (c.name || "").split("").reduce((h, ch) => h * 31 + ch.charCodeAt(0) >>> 0, 0);
  let assessment;
  if (pct >= 70) {
    const opts = [`Your profile lines up well with what they typically look for.`, `This is one of your stronger realistic shots based on your profile.`, `Your background fits their typical intern profile closely.`];
    assessment = opts[seed % opts.length];
  } else if (pct >= 50) {
    const opts = [`A solid shot — worth a strong application.`, `Realistic if you put care into your application.`, `Within reach, though you'll be one of several qualified applicants.`];
    assessment = opts[seed % opts.length];
  } else if (pct >= 35) {
    const opts = [`Competitive — they get more applicants than spots, so make your application stand out.`, `A reach, but reaches land when the application is sharp. Worth trying.`, `Tougher odds here — apply, but don't count on it as your only option.`];
    assessment = opts[seed % opts.length];
  } else {
    const opts = [`A long shot — popular employer with limited intern spots. Apply if it excites you.`, `Highly competitive; treat this as a reach and keep safer options in your list too.`, `The odds are steep here, but someone gets in — a standout application is your best bet.`];
    assessment = opts[seed % opts.length];
  }
  let opener;
  if (c.tier === "national") {
    opener = `${c.name} is a recognized name that recruits ${ans.major} interns.`;
  } else {
    const openers = [`${c.name} is ${band} and hires in ${ans.major}.`, `${c.name}, ${band}, works in ${c.industry || ans.major}.`, `${c.name} is a ${band} employer in ${c.industry || ans.major}.`];
    opener = openers[seed % openers.length];
  }
  let extra = "";
  if (lead.length > 0 && pct >= 45) {
    extra = ` Your ${lead[0].role.toLowerCase()} experience helps you stand out.`;
  } else if (exp.factor < 0.4 && pct < 50) {
    extra = ` Good early-career target to build experience.`;
  }
  return `${opener} ${assessment}${extra}`.trim();
}
function applyHonest(list, ans, extPicks) {
  return list.map(c => {
    const h = honestScore(c, ans, extPicks);
    const reason = c.reason || generateReason(c, ans, extPicks);
    const bandBonus = {
      "in-town": 6,
      "nearby": 4,
      "metro": 2,
      "regional": 0,
      "remote": 1
    }[c.locationBand] || 0;
    const tierPenalty = c.tier === "national" ? -3 : 0;
    const sortScore = h.pct + bandBonus + tierPenalty;
    return {
      ...c,
      match: h.pct,
      low: h.low,
      high: h.high,
      _profile: h._profile,
      _timing: h._timing,
      _fit: h._fit,
      _exp: h._exp,
      _lead: h._lead,
      reason,
      _sortScore: sortScore
    };
  }).sort((a, b) => b._sortScore - a._sortScore);
}
let memProfile = null;
const profileStore = {
  load() {
    try {
      const r = localStorage.getItem("iq_profile");
      return r ? JSON.parse(r) : memProfile;
    } catch (e) {
      return memProfile;
    }
  },
  save(p) {
    memProfile = p;
    try {
      localStorage.setItem("iq_profile", JSON.stringify(p));
    } catch (e) {}
  },
  clear() {
    memProfile = null;
    try {
      localStorage.removeItem("iq_profile");
    } catch (e) {}
  }
};
const EMPTY_PROFILE = {
  fullName: "",
  email: "",
  phone: "",
  linkedin: "",
  portfolio: "",
  school: "",
  major: "",
  gradDate: "",
  gpa: "",
  workAuth: "",
  relocate: "",
  topSkills: "",
  whyMe: "",
  resumeText: "",
  resumes: [],
  _init: false
};
const FREE_APPLICATIONS = 3;
let memSession = {};
if (new URLSearchParams(window.location.search).get("dev") === "1") {
  console.log("[iq] DEV MODE active — clearing all cached sessions and results");
  try {
    Object.keys(localStorage).filter(k => k.startsWith("iq_")).forEach(k => {
      localStorage.removeItem(k);
      console.log("[iq] cleared:", k);
    });
  } catch (e) {}
}
const APP_VERSION = "v62";
const sessionStore = {
  load() {
    try {
      const r = localStorage.getItem("iq_session");
      const o = r ? JSON.parse(r) : memSession;
      if (o && o._v !== APP_VERSION) return {
        ...o,
        results: []
      };
      return o;
    } catch (e) {
      return memSession;
    }
  },
  save(obj) {
    memSession = {
      ...memSession,
      ...obj,
      _v: APP_VERSION
    };
    try {
      localStorage.setItem("iq_session", JSON.stringify(memSession));
    } catch (e) {}
  },
  clear() {
    memSession = {};
    try {
      localStorage.removeItem("iq_session");
    } catch (e) {}
  }
};
let memStats = {};
const analytics = {
  track(event, props) {
    try {
      const s = JSON.parse(localStorage.getItem("iq_stats") || "{}");
      s[event] = (s[event] || 0) + 1;
      localStorage.setItem("iq_stats", JSON.stringify(s));
      memStats = s;
    } catch (e) {
      memStats[event] = (memStats[event] || 0) + 1;
    }
    try {
      if (typeof window !== "undefined") {
        if (window.btpTrack) window.btpTrack(event, props || {});else if (window.posthog) window.posthog.capture(event, props || {});
      }
    } catch (e) {}
    if (typeof console !== "undefined") console.log("[iq]", event, props || "");
  },
  read() {
    try {
      return JSON.parse(localStorage.getItem("iq_stats") || "{}");
    } catch (e) {
      return memStats;
    }
  }
};
const usageStore = {
  getApplied() {
    try {
      return JSON.parse(localStorage.getItem("iq_applied") || "[]");
    } catch (e) {
      return memStats._applied || [];
    }
  },
  addApplied(name) {
    const list = usageStore.getApplied();
    if (!list.includes(name)) {
      list.push(name);
      try {
        localStorage.setItem("iq_applied", JSON.stringify(list));
      } catch (e) {
        memStats._applied = list;
      }
    }
    return list;
  },
  bumpVisit() {
    try {
      const v = parseInt(localStorage.getItem("iq_visits") || "0", 10) + 1;
      localStorage.setItem("iq_visits", String(v));
      return v;
    } catch (e) {
      memStats._visits = (memStats._visits || 0) + 1;
      return memStats._visits;
    }
  }
};
function computeScoreFactors(profile, job) {
  profile = profile || {};
  job = job || {};
  const skills = profile.skills || [];
  const has = s => skills.some(ps => (ps || "").toLowerCase().includes((s || "").toLowerCase()));
  const factors = [];
  const reqMajors = Array.isArray(job.requiredMajors) ? job.requiredMajors : [];
  const majorKnown = reqMajors.length > 0;
  const majorMatch = !majorKnown || reqMajors.some(m => (profile.major || "").toLowerCase().includes(m.toLowerCase()));
  factors.push({
    id: 'major',
    label: 'Major / Field',
    status: majorMatch ? 'pass' : 'fail',
    impact: majorMatch ? +20 : -15,
    detail: !majorKnown ? `Your ${profile.major || 'field'} fits the general profile for this role.` : majorMatch ? `Your ${profile.major} is a strong fit for this role.` : `This role typically targets ${reqMajors.join(', ')}. Your major is a partial mismatch.`,
    fix: majorMatch ? null : 'Highlight relevant coursework and projects in your cover letter to bridge the gap.',
    scoreGain: majorMatch ? 0 : 18
  });
  const reqSkills = Array.isArray(job.requiredSkills) ? job.requiredSkills : [];
  const prefSkills = Array.isArray(job.preferredSkills) ? job.preferredSkills : [];
  const matchedSkills = reqSkills.filter(has);
  const missingRequired = reqSkills.filter(s => !has(s));
  const matchedPreferred = prefSkills.filter(has);
  const skillsKnown = reqSkills.length > 0;
  const skillRatio = skillsKnown ? matchedSkills.length / reqSkills.length : 1;
  factors.push({
    id: 'skills',
    label: 'Skills Match',
    status: skillRatio >= 0.75 ? 'pass' : skillRatio >= 0.4 ? 'partial' : 'fail',
    impact: skillsKnown ? Math.round((skillRatio - 0.5) * 30) : +8,
    detail: !skillsKnown ? skills.length ? `You've listed ${skills.length} skill${skills.length !== 1 ? 's' : ''}. We'll match them factor-by-factor once this role publishes its required skills.` : `Add skills in the quiz so we can match them against roles.` : missingRequired.length === 0 ? `You match all required skills. ${matchedPreferred.length} preferred skill${matchedPreferred.length !== 1 ? 's' : ''} also matched.` : `Missing required: ${missingRequired.join(', ')}. You have ${matchedSkills.length}/${reqSkills.length} required skills.`,
    fix: skillsKnown && missingRequired.length > 0 ? `Add ${missingRequired[0]} to your profile. Even beginner-level experience counts.` : null,
    scoreGain: skillsKnown && missingRequired.length > 0 ? Math.round(missingRequired.length * 6) : 0,
    matchedSkills,
    missingRequired,
    matchedPreferred
  });
  const gpaNum = parseFloat(profile.gpa) || 0;
  const gpaKnown = gpaNum > 0;
  const gpaThreshold = job.requiredGPA || 3.0;
  const gpaStatus = !gpaKnown ? 'pass' : gpaNum >= gpaThreshold + 0.3 ? 'pass' : gpaNum >= gpaThreshold - 0.1 ? 'partial' : 'fail';
  factors.push({
    id: 'gpa',
    label: 'GPA Signal',
    status: gpaStatus,
    impact: gpaStatus === 'pass' ? +12 : gpaStatus === 'partial' ? 0 : -10,
    detail: !gpaKnown ? `Add your GPA in the quiz to factor it into this match.` : gpaStatus === 'pass' ? `Your ${profile.gpa} GPA is at or above the typical bar for this role.` : gpaStatus === 'partial' ? `Your ${profile.gpa} GPA is within range but competitive. Address it proactively.` : `Your ${profile.gpa} GPA is below the typical ${gpaThreshold}+ for this company. This is pulling your score down.`,
    fix: gpaStatus === 'fail' ? `Mention GPA in context (upward trend, relevant coursework) or offset it with strong projects.` : null,
    scoreGain: gpaStatus === 'fail' ? 8 : 0
  });
  const targetYears = Array.isArray(job.targetYears) ? job.targetYears : [];
  const timingKnown = targetYears.length > 0;
  const gy = profile.gradYear || "";
  const yearMatch = !timingKnown || targetYears.includes(gy);
  const yearAdjacent = !yearMatch && targetYears.some(y => Math.abs((parseInt(y) || 0) - (parseInt(gy) || 0)) <= 1);
  factors.push({
    id: 'timing',
    label: 'Class Year / Timing',
    status: yearMatch ? 'pass' : yearAdjacent ? 'partial' : 'fail',
    impact: yearMatch ? +10 : yearAdjacent ? +4 : -8,
    detail: !timingKnown ? `Your graduation timing${gy ? ` (${gy})` : ''} looks compatible with this role.` : yearMatch ? `This role targets ${targetYears.join('/')} — you're in the right year.` : yearAdjacent ? `This role targets ${targetYears.join('/')}. You're adjacent — mention your timeline in the cover letter.` : `This role targets ${targetYears.join('/')}. You're a ${gy} — there's a timing mismatch.`,
    fix: timingKnown && !yearMatch ? `Apply anyway and briefly explain your timeline. Companies often flex for strong candidates.` : null,
    scoreGain: timingKnown && !yearMatch && !yearAdjacent ? 6 : 0
  });
  const styleKnown = !!job.workStyle;
  const locationMatch = !styleKnown || job.workStyle === 'remote' || profile.locationPref === 'anywhere' || (profile.locationPref || "").toLowerCase().includes((job.location || "").toLowerCase());
  factors.push({
    id: 'location',
    label: 'Location / Work Style',
    status: locationMatch ? 'pass' : 'partial',
    impact: locationMatch ? +8 : -5,
    detail: !styleKnown ? `Location and work style look compatible for this role.` : locationMatch ? `Location and work style are compatible.` : `You prefer ${profile.locationPref} but this role is ${job.workStyle} in ${job.location}. This is creating a mismatch.`,
    fix: styleKnown && !locationMatch ? `If you're open to relocating or this is a flexible remote role, update your preferences.` : null,
    scoreGain: styleKnown && !locationMatch ? 5 : 0
  });
  return factors;
}
function ScoreExplainerCard({
  job,
  profile,
  isPro,
  setShowProModal,
  isExpanded,
  onToggle
}) {
  const factors = computeScoreFactors(profile, job);
  const passing = factors.filter(f => f.status === 'pass').length;
  const failing = factors.filter(f => f.status === 'fail').length;
  const partial = factors.filter(f => f.status === 'partial').length;
  const downCount = failing + partial;
  const potentialGain = factors.reduce((s, f) => s + (f.scoreGain || 0), 0);
  const currentScore = job.matchScore || job.match || 50;
  const improvedScore = Math.min(95, currentScore + potentialGain);
  React.useEffect(() => {
    if (isExpanded && isPro) {
      factors.filter(f => f.fix).forEach(f => analytics.track('score_fix_viewed', {
        jobId: job.id || job.name,
        factorId: f.id,
        scoreGain: f.scoreGain
      }));
    }
  }, [isExpanded]);
  const statusIcon = status => React.createElement('span', {
    style: {
      color: status === 'pass' ? G : status === 'partial' ? AM : CR,
      fontWeight: 700
    }
  }, status === 'pass' ? '✓' : status === 'partial' ? '~' : '✗');
  const statusBg = status => status === 'pass' ? GL : status === 'partial' ? AL : CL;
  const statusBorder = status => status === 'pass' ? G : status === 'partial' ? AM : CR;
  return React.createElement('div', {
    style: {
      marginTop: 12,
      borderTop: `1px solid #F0F0F0`,
      paddingTop: 12
    }
  }, React.createElement('div', {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer'
    },
    onClick: e => {
      if (e && e.stopPropagation) e.stopPropagation();
      onToggle();
    }
  }, React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, React.createElement('span', {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: '#1a1a1a'
    }
  }, 'Score Breakdown'), React.createElement('span', {
    style: {
      fontSize: 11,
      background: GL,
      color: GD,
      borderRadius: 20,
      padding: '2px 8px',
      fontWeight: 600
    }
  }, `${passing} ✓  ${partial > 0 ? partial + ' ~  ' : ''}${failing} ✗`)), React.createElement('span', {
    style: {
      fontSize: 12,
      color: '#888'
    }
  }, isExpanded ? '▲ Hide' : '▼ Show')), isExpanded && React.createElement('div', {
    style: {
      marginTop: 12
    }
  }, isPro ? React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, ...factors.map(f => React.createElement('div', {
    key: f.id,
    style: {
      background: statusBg(f.status),
      border: `1px solid ${statusBorder(f.status)}30`,
      borderRadius: var_r,
      padding: '10px 12px'
    }
  }, React.createElement('div', {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    }
  }, React.createElement('div', {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, statusIcon(f.status), React.createElement('span', {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: '#1a1a1a'
    }
  }, f.label)), f.impact !== 0 && React.createElement('span', {
    style: {
      fontSize: 11,
      fontWeight: 700,
      color: f.impact > 0 ? GD : CR
    }
  }, f.impact > 0 ? `+${f.impact} pts` : `${f.impact} pts`)), React.createElement('p', {
    style: {
      fontSize: 12,
      color: '#555',
      margin: '6px 0 0 24px'
    }
  }, f.detail), f.fix && React.createElement('div', {
    style: {
      marginTop: 6,
      marginLeft: 24,
      fontSize: 11,
      color: GD,
      fontWeight: 500,
      background: '#fff',
      borderRadius: 6,
      padding: '4px 8px',
      border: `1px solid ${G}40`
    }
  }, 'Fix: ', f.fix), f.id === 'skills' && f.missingRequired && f.missingRequired.length > 0 && React.createElement('div', {
    style: {
      marginTop: 8,
      marginLeft: 24,
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4
    }
  }, ...f.missingRequired.map(s => React.createElement('span', {
    key: 'm' + s,
    style: {
      fontSize: 11,
      background: CL,
      color: CR,
      border: `1px solid ${CR}30`,
      borderRadius: 20,
      padding: '2px 8px'
    }
  }, '✗ ' + s)), ...(f.matchedSkills || []).map(s => React.createElement('span', {
    key: 'g' + s,
    style: {
      fontSize: 11,
      background: GL,
      color: GD,
      border: `1px solid ${G}30`,
      borderRadius: 20,
      padding: '2px 8px'
    }
  }, '✓ ' + s))))), potentialGain > 0 && React.createElement('div', {
    style: {
      marginTop: 8,
      background: GL,
      borderRadius: var_r,
      padding: '10px 14px',
      border: `1px solid ${G}30`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap'
    }
  }, React.createElement('span', {
    style: {
      fontSize: 13,
      color: GD,
      fontWeight: 600
    }
  }, `Fix the issues above → score could reach ${improvedScore}%`), React.createElement('span', {
    style: {
      fontSize: 12,
      color: '#888'
    }
  }, `+${potentialGain} pts available`))) : React.createElement('div', {
    style: {
      position: 'relative'
    }
  }, React.createElement('div', {
    style: {
      filter: 'blur(4px)',
      pointerEvents: 'none',
      opacity: 0.6
    }
  }, ...factors.slice(0, 3).map(f => React.createElement('div', {
    key: f.id,
    style: {
      background: statusBg(f.status),
      borderRadius: var_r,
      padding: '10px 12px',
      marginBottom: 6,
      border: `1px solid ${statusBorder(f.status)}30`
    }
  }, React.createElement('div', {
    style: {
      display: 'flex',
      gap: 8
    }
  }, statusIcon(f.status), React.createElement('span', {
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, f.label)), React.createElement('p', {
    style: {
      fontSize: 12,
      color: '#555',
      margin: '4px 0 0 24px'
    }
  }, f.detail)))), React.createElement('div', {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(255,255,255,0.85)',
      borderRadius: var_r
    }
  }, React.createElement('div', {
    style: {
      textAlign: 'center',
      padding: '16px 20px',
      background: '#fff',
      borderRadius: var_rl,
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      border: `1px solid ${G}30`
    }
  }, React.createElement('div', {
    style: {
      fontSize: 20,
      marginBottom: 4
    }
  }, ''), React.createElement('div', {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: '#1a1a1a',
      marginBottom: 4
    }
  }, downCount > 0 ? `${downCount} factor${downCount !== 1 ? 's' : ''} pulling your score down` : 'See your full factor-by-factor breakdown'), React.createElement('div', {
    style: {
      fontSize: 12,
      color: '#666',
      marginBottom: 12
    }
  }, downCount > 0 ? 'Pro shows you exactly what they are — and how to fix them.' : 'Pro shows every factor behind your score — and how to push it higher.'), React.createElement('button', {
    onClick: () => {
      analytics.track('score_explainer_upgrade_click', {
        jobId: job.id || job.name,
        failingFactors: failing
      });
      setShowProModal(true);
    },
    style: {
      background: G,
      color: '#fff',
      border: 'none',
      borderRadius: var_r,
      padding: '8px 20px',
      fontSize: 13,
      fontWeight: 700,
      cursor: 'pointer'
    }
  }, 'Unlock Breakdown'))))));
}
const IV = {
  ink: "#0A1426",
  dim: "#55627A",
  line: "#DCE2EC",
  soft: "#F1F4F9",
  acc: "#0B7A55",
  accSoft: "#EAF7F1",
  font: '"Geist",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'
};
const IV_KEYS = [["relevance", "Answered the question"], ["structure", "Structure (STAR)"], ["specifics", "Specifics & numbers"], ["delivery", "Delivery & time"]];
function ivPct(sc) {
  if (!sc) return null;
  let t = 0;
  for (const [k] of IV_KEYS) t += Math.max(0, Math.min(5, Number(sc[k]) || 0));
  return Math.round(t / 20 * 100);
}
function ivLetter(p) {
  if (p == null) return "—";
  const L = [[90, "A"], [80, "A-"], [72, "B+"], [64, "B"], [58, "B-"], [52, "C+"], [46, "C"], [40, "C-"], [30, "D"]];
  for (const [m, l] of L) if (p >= m) return l;
  return "F";
}
function ivGrade(turns) {
  const sc = turns.filter(t => t.scores);
  if (!sc.length) return null;
  const overall = Math.round(sc.reduce((a, t) => a + ivPct(t.scores), 0) / sc.length);
  const cats = IV_KEYS.map(([k, label]) => ({
    k,
    label,
    pct: Math.round(sc.reduce((a, t) => a + Math.max(0, Math.min(5, Number(t.scores[k]) || 0)), 0) / sc.length * 20)
  }));
  return {
    overall,
    letter: ivLetter(overall),
    cats,
    n: sc.length
  };
}
const ivClock = s => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
const IV_THINK = 10;
const IV_NOVELTY = /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|princess|deranged|hysterical|pipe|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley/i;
function ivVoiceScore(v) {
  const n = v.name || "";
  let s = 0;
  if (/natural|neural/i.test(n)) s += 60;
  if (/premium|enhanced/i.test(n)) s += 45;
  if (/online/i.test(n)) s += 20;
  if (/^google/i.test(n)) s += 30;
  if (/\b(ava|samantha|allison|susan|zoe|evan|nathan|aria|jenny|guy|davis|emma|brian|andrew|christopher|michelle|libby|sonia|ryan|tom|serena|daniel|karen|moira)\b/i.test(n)) s += 15;
  if (/^en[-_]US/i.test(v.lang)) s += 10;else if (/^en/i.test(v.lang)) s += 5;
  if (v.localService === false) s += 3;
  return s;
}
function ivVoices() {
  try {
    return window.speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang) && !IV_NOVELTY.test(v.name)).sort((a, b) => ivVoiceScore(b) - ivVoiceScore(a)).slice(0, 10);
  } catch (x) {
    return [];
  }
}
function ivVoiceLabel(v) {
  const region = {
    "en-US": "US",
    "en-GB": "UK",
    "en-AU": "Australia",
    "en-CA": "Canada",
    "en-IE": "Ireland",
    "en-IN": "India",
    "en-ZA": "South Africa",
    "en-NZ": "New Zealand"
  }[String(v.lang).replace("_", "-")] || v.lang;
  const nat = /natural|neural|premium|enhanced/i.test(v.name);
  const nm = v.name.replace(/^(Microsoft|Google|Apple)\s+/i, "").replace(/\s*Online\s*/i, " ").replace(/\s*\((Natural|Neural|Premium|Enhanced)\)/ig, "").replace(/\s*-\s*English.*$/i, "").replace(/\s+/g, " ").trim();
  return `${nm} · ${region}${nat ? " · most natural" : ""}`;
}
const IV_LINE = "Hi, thanks for coming in today. Let's start with you — tell me a little about yourself.";
function InterviewSim({
  major,
  defaultCompany,
  defaultRole
}) {
  const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
  const canTalk = !!SR,
    canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
  const ls = {
    get(k) {
      try {
        return localStorage.getItem(k);
      } catch (x) {
        return null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, v);
      } catch (x) {}
    }
  };
  const [setup, setSetup] = React.useState({
    company: defaultCompany || "",
    role: defaultRole || (major ? `${major.split(",")[0]} Intern` : "Summer Intern"),
    kind: "mixed",
    total: 5,
    limit: 90,
    mode: canTalk ? "talk" : "type",
    readAloud: canSpeak,
    voice: ls.get("btp_iv_voice") || "",
    rate: Number(ls.get("btp_iv_rate")) || 1.15
  });
  const [voices, setVoices] = React.useState([]);
  React.useEffect(() => {
    if (!canSpeak) return;
    const load = () => setVoices(ivVoices());
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", load);
  }, []);
  const pickVoice = () => {
    const all = voices.length ? voices : ivVoices();
    return all.find(v => v.voiceURI === setup.voice) || all[0] || null;
  };
  function say(text, onDone) {
    if (!canSpeak) {
      onDone && onDone();
      return;
    }
    hush();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    } else u.lang = "en-US";
    u.rate = setup.rate;
    u.pitch = 1;
    let moved = false;
    const go = () => {
      if (!moved) {
        moved = true;
        onDone && onDone();
      }
    };
    u.onend = go;
    u.onerror = go;
    if (onDone) setTimeout(go, Math.min(30000, 2000 + text.length * 70 / setup.rate));
    window.speechSynthesis.speak(u);
  }
  const [turns, setTurns] = React.useState([]);
  const [draft, setDraft] = React.useState("");
  const [interim, setInterim] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [micErr, setMicErr] = React.useState("");
  const [summary, setSummary] = React.useState(null);
  const [phase, setPhase] = React.useState(null);
  const [deadline, setDeadline] = React.useState(0);
  const [now, setNow] = React.useState(Date.now());
  const [recording, setRecording] = React.useState(false);
  const recRef = React.useRef(null),
    wantRec = React.useRef(false),
    answerStart = React.useRef(0),
    draftRef = React.useRef(""),
    interimRef = React.useRef(""),
    sentRef = React.useRef(false);
  draftRef.current = draft;
  interimRef.current = interim;
  const started = turns.length > 0;
  const endRef = React.useRef(null);
  const cur = turns[turns.length - 1];
  const waiting = started && !busy && !summary && cur && !cur.answered;
  React.useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({
      behavior: "smooth",
      block: "end"
    });
  }, [turns.length, summary, busy, phase]);
  function startRec() {
    if (!SR || recording) return;
    setMicErr("");
    try {
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      rec.onresult = e => {
        let fin = "",
          tmp = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) fin += t;else tmp += t;
        }
        if (fin) setDraft(d => (d + " " + fin).replace(/\s+/g, " ").trim());
        setInterim(tmp);
      };
      rec.onerror = e => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") {
          wantRec.current = false;
          setMicErr("Your microphone is blocked or missing — type your answer instead (or allow the mic in your browser and tap Talk).");
        }
      };
      rec.onend = () => {
        if (wantRec.current) {
          try {
            rec.start();
            return;
          } catch (x) {}
        }
        setRecording(false);
        setInterim("");
      };
      recRef.current = rec;
      wantRec.current = true;
      rec.start();
      setRecording(true);
    } catch (x) {
      setMicErr("Couldn't start the microphone — type your answer instead.");
    }
  }
  function stopRec() {
    wantRec.current = false;
    try {
      recRef.current && recRef.current.stop();
    } catch (x) {}
    setRecording(false);
  }
  function hush() {
    try {
      canSpeak && window.speechSynthesis.cancel();
    } catch (x) {}
  }
  React.useEffect(() => () => {
    stopRec();
    hush();
  }, []);
  React.useEffect(() => {
    if (!phase || phase === "reading") return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [phase]);
  const left = phase && phase !== "reading" ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
  function beginAnswer() {
    setPhase("answer");
    answerStart.current = Date.now();
    setDeadline(Date.now() + setup.limit * 1000);
    setNow(Date.now());
    if (setup.mode === "talk") startRec();
  }
  function beginThink() {
    setPhase("think");
    setDeadline(Date.now() + IV_THINK * 1000);
    setNow(Date.now());
  }
  React.useEffect(() => {
    if (phase === "think" && left <= 0) beginAnswer();
    if (phase === "answer" && left <= 0) submit(true);
  }, [left, phase]);
  React.useEffect(() => {
    if (!waiting) return;
    sentRef.current = false;
    setDraft("");
    setInterim("");
    if (setup.readAloud && canSpeak) {
      setPhase("reading");
      say(cur.q, beginThink);
    } else beginThink();
  }, [turns.length, waiting]);
  async function ask(history) {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          feature: "interview_turn",
          input: {
            company: setup.company,
            role: setup.role,
            kind: setup.kind,
            total: setup.total,
            limit: setup.limit,
            spoken: setup.mode === "talk",
            major,
            history: history.map(t => ({
              q: t.q,
              a: t.a,
              secs: t.secs,
              timedOut: !!t.timedOut
            }))
          }
        })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "The interviewer couldn't answer — try again.");
      const m = String(d.text || "").match(/\{[\s\S]*\}/);
      let j = null;
      try {
        j = m ? JSON.parse(m[0]) : null;
      } catch (x) {}
      if (!j) throw new Error("The interviewer gave an unreadable answer — try again.");
      const next = history.map((t, i) => i === history.length - 1 && t.answered ? {
        ...t,
        feedback: j.feedback || "",
        scores: j.scores && typeof j.scores === "object" ? j.scores : null
      } : t);
      if (j.summary) {
        setTurns(next);
        setSummary(j.summary);
        const g = ivGrade(next);
        analytics.track("interview_finished", {
          mode: setup.mode,
          kind: setup.kind,
          questions: setup.total,
          grade: g ? g.letter : null,
          overall: g ? g.overall : null,
          timed_out: next.filter(t => t.timedOut).length
        });
      } else if (j.next) setTurns([...next, {
        q: String(j.next),
        a: "",
        feedback: "",
        answered: false
      }]);else throw new Error("The interviewer gave an unreadable answer — try again.");
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }
  function start() {
    hush();
    setTurns([]);
    setSummary(null);
    setPhase(null);
    analytics.track("interview_started", {
      mode: setup.mode,
      kind: setup.kind,
      questions: setup.total,
      seconds: setup.limit,
      read_aloud: !!setup.readAloud
    });
    ask([]);
  }
  function submit(timedOut) {
    if (sentRef.current || busy || !waiting) return;
    const a = (draftRef.current + " " + interimRef.current).replace(/\s+/g, " ").trim();
    if (!a && !timedOut) return;
    sentRef.current = true;
    stopRec();
    hush();
    setPhase(null);
    const secs = phase === "answer" ? Math.min(setup.limit, Math.round((Date.now() - answerStart.current) / 1000)) : 0;
    const h = turns.map((t, i) => i === turns.length - 1 ? {
      ...t,
      a,
      secs,
      timedOut: !!timedOut,
      answered: true
    } : t);
    setTurns(h);
    setDraft("");
    setInterim("");
    ask(h);
  }
  function quit() {
    stopRec();
    hush();
    setPhase(null);
    setTurns([]);
    setSummary(null);
    setErr("");
  }
  const grade = summary ? ivGrade(turns) : null;
  const field = {
    width: "100%",
    padding: "10px 12px",
    border: `1px solid ${IV.line}`,
    borderRadius: 8,
    font: `400 15px ${IV.font}`,
    color: IV.ink,
    background: "#fff",
    boxSizing: "border-box"
  };
  const label = {
    display: "block",
    font: `600 13px ${IV.font}`,
    color: IV.ink,
    margin: "14px 0 6px"
  };
  const btn = primary => ({
    font: `600 14px ${IV.font}`,
    padding: "10px 16px",
    borderRadius: 999,
    cursor: "pointer",
    border: `1px solid ${primary ? IV.acc : IV.line}`,
    background: primary ? IV.acc : "#fff",
    color: primary ? "#fff" : IV.ink
  });
  const seg = on => ({
    font: `500 14px ${IV.font}`,
    padding: "9px 14px",
    borderRadius: 999,
    cursor: "pointer",
    border: `1px solid ${on ? IV.ink : IV.line}`,
    background: on ? IV.ink : "#fff",
    color: on ? "#fff" : IV.ink
  });
  const mono = {
    fontVariantNumeric: "tabular-nums"
  };
  const pctColor = p => p >= 64 ? IV.acc : p >= 46 ? "#B45309" : "#B42318";
  const lowTime = phase === "answer" && left <= 15;
  return React.createElement("main", {
    id: "main",
    style: {
      maxWidth: 780,
      margin: "0 auto",
      padding: "32px max(16px,env(safe-area-inset-right,0px)) 80px max(16px,env(safe-area-inset-left,0px))",
      fontFamily: IV.font,
      color: IV.ink
    }
  }, React.createElement("p", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: IV.acc,
      margin: 0
    }
  }, "Interview practice"), React.createElement("h1", {
    style: {
      font: `600 clamp(26px,4vw,34px)/1.15 ${IV.font}`,
      letterSpacing: "-.02em",
      margin: "6px 0 8px"
    }
  }, "Say it out loud. Beat the clock. Get a grade."), React.createElement("p", {
    style: {
      color: IV.dim,
      fontSize: 15.5,
      lineHeight: 1.6,
      margin: "0 0 22px",
      maxWidth: "64ch"
    }
  }, "An AI interviewer asks one question at a time. You get ", IV_THINK, " seconds to think, then the clock runs \u2014 talk (or type) your answer, and it sends itself when time's up. Every answer is scored, and you get a letter grade at the end. Grades are an AI estimate, not a hiring decision. Your answers go to our AI provider to write the feedback; nothing is saved", canTalk ? " (speech is turned into text by your browser)" : "", "."), !started && !busy ? React.createElement("section", {
    style: {
      border: `1px solid ${IV.line}`,
      borderRadius: 12,
      padding: "18px 18px 20px",
      background: "#fff"
    }
  }, React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
      gap: "0 14px"
    }
  }, React.createElement("div", null, React.createElement("label", {
    style: label,
    htmlFor: "ivCo"
  }, "Company"), React.createElement("input", {
    id: "ivCo",
    style: field,
    value: setup.company,
    placeholder: "e.g. Lockheed Martin",
    onChange: e => setSetup(s => ({
      ...s,
      company: e.target.value
    }))
  })), React.createElement("div", null, React.createElement("label", {
    style: label,
    htmlFor: "ivRole"
  }, "Role"), React.createElement("input", {
    id: "ivRole",
    style: field,
    value: setup.role,
    onChange: e => setSetup(s => ({
      ...s,
      role: e.target.value
    }))
  })), React.createElement("div", null, React.createElement("label", {
    style: label,
    htmlFor: "ivKind"
  }, "Interview type"), React.createElement("select", {
    id: "ivKind",
    style: field,
    value: setup.kind,
    onChange: e => setSetup(s => ({
      ...s,
      kind: e.target.value
    }))
  }, React.createElement("option", {
    value: "mixed"
  }, "Mixed (most first rounds)"), React.createElement("option", {
    value: "behavioral"
  }, "Behavioral"), React.createElement("option", {
    value: "technical"
  }, "Technical"))), React.createElement("div", null, React.createElement("label", {
    style: label,
    htmlFor: "ivN"
  }, "Length"), React.createElement("select", {
    id: "ivN",
    style: field,
    value: setup.total,
    onChange: e => setSetup(s => ({
      ...s,
      total: +e.target.value
    }))
  }, React.createElement("option", {
    value: 3
  }, "Quick \u2014 3 questions"), React.createElement("option", {
    value: 5
  }, "Standard \u2014 5 questions"), React.createElement("option", {
    value: 8
  }, "Full \u2014 8 questions"))), React.createElement("div", null, React.createElement("label", {
    style: label,
    htmlFor: "ivT"
  }, "Time per answer"), React.createElement("select", {
    id: "ivT",
    style: field,
    value: setup.limit,
    onChange: e => setSetup(s => ({
      ...s,
      limit: +e.target.value
    }))
  }, React.createElement("option", {
    value: 60
  }, "1 minute (tight)"), React.createElement("option", {
    value: 90
  }, "1.5 minutes (typical)"), React.createElement("option", {
    value: 120
  }, "2 minutes"), React.createElement("option", {
    value: 180
  }, "3 minutes"))), React.createElement("div", null, React.createElement("span", {
    style: label
  }, "How you'll answer"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    },
    role: "group",
    "aria-label": "How you'll answer"
  }, React.createElement("button", {
    type: "button",
    style: seg(setup.mode === "talk"),
    "aria-pressed": setup.mode === "talk",
    disabled: !canTalk,
    onClick: () => setSetup(s => ({
      ...s,
      mode: "talk"
    }))
  }, "Talk"), React.createElement("button", {
    type: "button",
    style: seg(setup.mode === "type"),
    "aria-pressed": setup.mode === "type",
    onClick: () => setSetup(s => ({
      ...s,
      mode: "type"
    }))
  }, "Type")), !canTalk && React.createElement("p", {
    style: {
      fontSize: 12.5,
      color: IV.dim,
      margin: "6px 0 0"
    }
  }, "This browser can't turn speech into text \u2014 try Chrome, Edge or Safari, or type."))), canSpeak && React.createElement("label", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginTop: 16,
      fontSize: 14,
      cursor: "pointer"
    }
  }, React.createElement("input", {
    type: "checkbox",
    checked: setup.readAloud,
    onChange: e => setSetup(s => ({
      ...s,
      readAloud: e.target.checked
    })),
    style: {
      accentColor: IV.acc,
      width: 16,
      height: 16
    }
  }), "Read each question out loud"), canSpeak && setup.readAloud && React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
      gap: "0 14px",
      alignItems: "end"
    }
  }, React.createElement("div", null, React.createElement("label", {
    style: label,
    htmlFor: "ivVoice"
  }, "Interviewer voice"), React.createElement("select", {
    id: "ivVoice",
    style: field,
    value: (pickVoice() || {}).voiceURI || "",
    onChange: e => {
      const v = e.target.value;
      ls.set("btp_iv_voice", v);
      setSetup(s => ({
        ...s,
        voice: v
      }));
    }
  }, voices.length ? voices.map(v => React.createElement("option", {
    key: v.voiceURI,
    value: v.voiceURI
  }, ivVoiceLabel(v))) : React.createElement("option", {
    value: ""
  }, "Your device's default voice"))), React.createElement("div", null, React.createElement("label", {
    style: label,
    htmlFor: "ivRate"
  }, "Speaking speed"), React.createElement("select", {
    id: "ivRate",
    style: field,
    value: setup.rate,
    onChange: e => {
      const r = +e.target.value;
      ls.set("btp_iv_rate", String(r));
      setSetup(s => ({
        ...s,
        rate: r
      }));
    }
  }, React.createElement("option", {
    value: 1
  }, "Normal"), React.createElement("option", {
    value: 1.15
  }, "A bit faster"), React.createElement("option", {
    value: 1.3
  }, "Fast"), React.createElement("option", {
    value: 1.45
  }, "Very fast"))), React.createElement("div", null, React.createElement("button", {
    type: "button",
    style: {
      ...btn(false),
      width: "100%",
      marginTop: 14
    },
    onClick: () => say(IV_LINE)
  }, "\u25B6 Hear it"))), canSpeak && setup.readAloud && React.createElement("p", {
    style: {
      fontSize: 12.5,
      color: IV.dim,
      margin: "8px 0 0"
    }
  }, "Voices come from your device. The ones marked \"most natural\" sound the most human \u2014 on a Mac or iPhone you can download better ones in Settings \u2192 Accessibility \u2192 Spoken Content \u2192 Voices."), React.createElement("button", {
    style: {
      ...btn(true),
      marginTop: 18,
      padding: "12px 22px"
    },
    onClick: start
  }, "Start the interview"), err && React.createElement("p", {
    role: "alert",
    style: {
      color: "#B42318",
      fontSize: 14,
      marginTop: 12
    }
  }, err)) : React.createElement("section", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 14
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: 13,
      color: IV.dim,
      gap: 10,
      flexWrap: "wrap"
    }
  }, React.createElement("span", null, setup.role, setup.company ? ` · ${setup.company}` : "", " \xB7 ", setup.kind, " \xB7 ", ivClock(setup.limit), " per answer"), React.createElement("span", {
    style: mono
  }, "Q ", Math.min(turns.length, setup.total), "/", setup.total)), turns.map((t, i) => {
    const p = ivPct(t.scores);
    return React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8
      }
    }, React.createElement("div", {
      style: {
        alignSelf: "flex-start",
        maxWidth: "88%",
        background: IV.soft,
        border: `1px solid ${IV.line}`,
        borderRadius: "12px 12px 12px 4px",
        padding: "12px 14px",
        fontSize: 15,
        lineHeight: 1.55
      }
    }, React.createElement("div", {
      style: {
        font: `600 12px ${IV.font}`,
        color: IV.dim,
        marginBottom: 4
      }
    }, "Interviewer"), t.q), t.answered && React.createElement("div", {
      style: {
        alignSelf: "flex-end",
        maxWidth: "88%",
        background: IV.ink,
        color: "#fff",
        borderRadius: "12px 12px 4px 12px",
        padding: "12px 14px",
        fontSize: 15,
        lineHeight: 1.55,
        whiteSpace: "pre-wrap"
      }
    }, t.a || React.createElement("i", {
      style: {
        opacity: .7
      }
    }, "No answer"), React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        opacity: .6,
        marginTop: 6
      }
    }, ivClock(t.secs || 0), " used", t.timedOut ? " · time ran out" : "")), t.feedback && React.createElement("div", {
      style: {
        borderLeft: `3px solid ${IV.acc}`,
        background: IV.accSoft,
        borderRadius: "0 8px 8px 0",
        padding: "10px 12px",
        fontSize: 14,
        lineHeight: 1.55
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        gap: 10,
        alignItems: "baseline",
        marginBottom: 3
      }
    }, React.createElement("span", {
      style: {
        font: `600 12px ${IV.font}`,
        color: IV.acc
      }
    }, "Coach"), p != null && React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: pctColor(p)
      },
      title: "AI estimate"
    }, ivLetter(p), " \xB7 ", p, "%")), t.feedback, t.scores && React.createElement("div", {
      style: {
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        marginTop: 8,
        ...mono,
        fontSize: 11.5,
        color: IV.dim
      }
    }, IV_KEYS.map(([k, l]) => React.createElement("span", {
      key: k
    }, l.split(" ")[0], " ", Math.max(0, Math.min(5, Number(t.scores[k]) || 0)), "/5")))));
  }), busy && React.createElement("div", {
    style: {
      color: IV.dim,
      fontSize: 14
    }
  }, turns.length && turns[turns.length - 1].answered ? "Grading your answer…" : "Interviewer is thinking…"), err && React.createElement("div", {
    role: "alert",
    style: {
      color: "#B42318",
      fontSize: 14
    }
  }, err, " ", React.createElement("button", {
    style: {
      ...btn(false),
      padding: "4px 12px",
      fontSize: 13
    },
    onClick: () => ask(turns)
  }, "Retry")), summary ? React.createElement("div", {
    style: {
      border: `1px solid ${IV.line}`,
      borderRadius: 14,
      padding: 20,
      background: "#fff"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      gap: 20,
      alignItems: "center",
      flexWrap: "wrap"
    }
  }, React.createElement("div", {
    style: {
      width: 96,
      height: 96,
      borderRadius: 16,
      background: "#070F1E",
      color: "#2FD39A",
      display: "grid",
      placeItems: "center",
      ...mono,
      fontSize: 40,
      fontWeight: 500
    },
    "aria-label": `Grade ${grade ? grade.letter : "not available"}`
  }, grade ? grade.letter : "—"), React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 200
    }
  }, React.createElement("h2", {
    style: {
      font: `600 22px ${IV.font}`,
      margin: "0 0 4px"
    }
  }, grade ? `${grade.overall}% overall` : "How it went"), React.createElement("p", {
    style: {
      fontSize: 12.5,
      color: IV.dim,
      margin: "0 0 8px"
    }
  }, "AI estimate from ", grade ? grade.n : 0, " graded answer", grade && grade.n === 1 ? "" : "s", " \xB7 not a hiring decision"), React.createElement("p", {
    style: {
      fontSize: 15,
      lineHeight: 1.6,
      margin: 0
    }
  }, summary.overall))), grade && React.createElement("div", {
    style: {
      marginTop: 18,
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, grade.cats.map(c => React.createElement("div", {
    key: c.k,
    style: {
      display: "grid",
      gridTemplateColumns: "minmax(120px,170px) 1fr 44px",
      gap: 12,
      alignItems: "center",
      fontSize: 14
    }
  }, React.createElement("span", null, c.label), React.createElement("div", {
    style: {
      height: 8,
      background: "#EEF1F6",
      borderRadius: 4
    }
  }, React.createElement("div", {
    style: {
      width: `${c.pct}%`,
      height: 8,
      borderRadius: 4,
      background: pctColor(c.pct)
    }
  })), React.createElement("span", {
    style: {
      ...mono,
      textAlign: "right"
    }
  }, c.pct, "%")))), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
      gap: 14,
      marginTop: 18
    }
  }, React.createElement("div", null, React.createElement("h3", {
    style: {
      font: `600 14px ${IV.font}`,
      margin: "0 0 6px"
    }
  }, "Strengths"), React.createElement("ul", {
    style: {
      margin: 0,
      paddingLeft: 18,
      fontSize: 14.5,
      lineHeight: 1.6
    }
  }, (summary.strengths || []).map((x, i) => React.createElement("li", {
    key: i
  }, x)))), React.createElement("div", null, React.createElement("h3", {
    style: {
      font: `600 14px ${IV.font}`,
      margin: "0 0 6px"
    }
  }, "Work on"), React.createElement("ul", {
    style: {
      margin: 0,
      paddingLeft: 18,
      fontSize: 14.5,
      lineHeight: 1.6
    }
  }, (summary.improve || []).map((x, i) => React.createElement("li", {
    key: i
  }, x))))), React.createElement("button", {
    style: {
      ...btn(true),
      marginTop: 16
    },
    onClick: quit
  }, "Practice again")) : waiting ? React.createElement("div", {
    style: {
      position: "sticky",
      bottom: 12,
      background: "#fff",
      border: `1px solid ${lowTime ? "#F4B4AE" : IV.line}`,
      borderRadius: 14,
      padding: 12,
      boxShadow: "0 6px 20px rgba(11,18,32,.08)"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 10
    }
  }, React.createElement("span", {
    style: {
      ...mono,
      fontSize: 22,
      minWidth: 64,
      color: phase === "think" ? "#B45309" : lowTime ? "#B42318" : IV.ink
    },
    "aria-live": "off"
  }, phase === "reading" ? "··" : ivClock(left)), React.createElement("div", {
    style: {
      flex: 1
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: IV.dim,
      marginBottom: 5
    },
    "aria-live": "polite"
  }, phase === "reading" ? "Listen to the question…" : phase === "think" ? "Think time — answer starts automatically" : lowTime ? "Wrap it up — sends when the clock hits 0:00" : "Answer now"), React.createElement("div", {
    style: {
      height: 6,
      background: "#EEF1F6",
      borderRadius: 3,
      overflow: "hidden"
    }
  }, React.createElement("div", {
    style: {
      height: 6,
      borderRadius: 3,
      transition: "width .2s linear",
      background: phase === "think" ? "#F59E0B" : lowTime ? "#DC2626" : IV.acc,
      width: `${phase === "think" ? left / IV_THINK * 100 : phase === "answer" ? left / setup.limit * 100 : 100}%`
    }
  }))), phase === "reading" && React.createElement("button", {
    style: {
      ...btn(false),
      padding: "6px 12px",
      fontSize: 13
    },
    onClick: () => {
      hush();
      beginThink();
    }
  }, "Skip"), phase === "think" && React.createElement("button", {
    style: {
      ...btn(true),
      padding: "8px 14px",
      fontSize: 13
    },
    onClick: beginAnswer
  }, "I'm ready")), phase === "answer" && React.createElement(React.Fragment, null, setup.mode === "talk" && canTalk && React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 8
    }
  }, React.createElement("button", {
    type: "button",
    onClick: () => recording ? stopRec() : startRec(),
    "aria-pressed": recording,
    style: {
      ...btn(recording),
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: recording ? "#B42318" : "#fff",
      borderColor: recording ? "#B42318" : IV.line,
      color: recording ? "#fff" : IV.ink
    }
  }, React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 9,
      height: 9,
      borderRadius: "50%",
      background: recording ? "#fff" : "#B42318",
      animation: recording ? "dblink 1.2s infinite" : "none"
    }
  }), recording ? "Listening — tap to pause" : "Tap to talk"), React.createElement("span", {
    style: {
      fontSize: 12.5,
      color: IV.dim
    }
  }, "Your words show up below \u2014 fix anything it misheard.")), micErr && React.createElement("p", {
    role: "alert",
    style: {
      fontSize: 13,
      color: "#B42318",
      margin: "0 0 8px"
    }
  }, micErr), React.createElement("label", {
    htmlFor: "ivA",
    style: {
      position: "absolute",
      left: -9999
    }
  }, "Your answer"), React.createElement("textarea", {
    id: "ivA",
    value: draft,
    onChange: e => setDraft(e.target.value),
    rows: 4,
    autoFocus: setup.mode === "type",
    placeholder: setup.mode === "talk" ? "Start talking — your answer appears here." : "Type your answer. Tip: situation, what you did, the result.",
    onKeyDown: e => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(false);
    },
    style: {
      ...field,
      resize: "vertical"
    }
  }), interim && React.createElement("p", {
    style: {
      fontSize: 14,
      color: IV.dim,
      fontStyle: "italic",
      margin: "6px 2px 0"
    }
  }, interim), React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
      marginTop: 8
    }
  }, React.createElement("span", {
    style: {
      fontSize: 12,
      color: IV.dim
    }
  }, setup.mode === "type" ? "Ctrl/⌘ + Enter to send" : "Done early? Send it — leftover time doesn't hurt you."), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, React.createElement("button", {
    style: btn(false),
    onClick: quit
  }, "End"), React.createElement("button", {
    style: btn(true),
    onClick: () => submit(false),
    disabled: !(draft + interim).trim()
  }, "Send answer"))))) : null, React.createElement("div", {
    ref: endRef
  })));
}
function SkillPicker({
  options,
  value,
  onToggle,
  major
}) {
  const [q, setQ] = React.useState("");
  const general = SKILLS_BY_FIELD.default.filter(o => !options.includes(o));
  const custom = value.filter(v => !options.includes(v) && !general.includes(v));
  const ink = "#0B1220",
    line = "#D5DBE3",
    dim = "#5B6675";
  const chip = o => {
    const on = value.includes(o);
    return React.createElement("button", {
      key: o,
      type: "button",
      "aria-pressed": on,
      onClick: () => onToggle(o),
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        minHeight: 40,
        padding: "8px 14px",
        borderRadius: 999,
        fontSize: 14.5,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "inherit",
        border: `1px solid ${on ? ink : line}`,
        background: on ? ink : "#fff",
        color: on ? "#fff" : ink,
        transition: "background .12s, color .12s"
      }
    }, on && React.createElement("svg", {
      width: "13",
      height: "13",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "3",
      "aria-hidden": "true"
    }, React.createElement("path", {
      d: "M5 12l5 5 9-10"
    })), o);
  };
  const add = () => {
    const v = q.trim().slice(0, 40);
    if (v && !value.some(x => x.toLowerCase() === v.toLowerCase())) onToggle(v);
    setQ("");
  };
  return React.createElement("div", null, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      gap: 12,
      marginBottom: 10
    }
  }, React.createElement("p", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: ink,
      margin: 0
    }
  }, "For ", major || "your major"), React.createElement("p", {
    "aria-live": "polite",
    style: {
      fontSize: 13,
      color: value.length ? "#0B7A55" : dim,
      margin: 0,
      fontWeight: value.length ? 600 : 400
    }
  }, value.length ? `${value.length} picked` : "Tap any that fit — skip the rest")), React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8
    }
  }, options.map(chip)), React.createElement("p", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: ink,
      margin: "20px 0 10px"
    }
  }, "Good for any major"), React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8
    }
  }, general.map(chip), custom.map(chip)), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 18
    }
  }, React.createElement("label", {
    htmlFor: "skillQ",
    style: {
      position: "absolute",
      left: -9999
    }
  }, "Add a skill that isn't listed"), React.createElement("input", {
    id: "skillQ",
    value: q,
    autoComplete: "off",
    placeholder: "Something missing? Type it and press Enter",
    onChange: e => setQ(e.target.value),
    onKeyDown: e => {
      if (e.key === "Enter") {
        e.preventDefault();
        add();
      }
    },
    style: {
      flex: 1,
      minWidth: 0,
      padding: "11px 14px",
      border: `1px solid ${line}`,
      borderRadius: 8,
      fontSize: 14.5,
      color: ink,
      background: "#fff",
      outline: "none",
      fontFamily: "inherit"
    }
  }), React.createElement("button", {
    type: "button",
    onClick: add,
    disabled: !q.trim(),
    style: {
      padding: "0 16px",
      borderRadius: 8,
      border: `1px solid ${line}`,
      background: "#fff",
      color: ink,
      fontWeight: 600,
      fontSize: 14,
      cursor: q.trim() ? "pointer" : "default",
      opacity: q.trim() ? 1 : .5,
      fontFamily: "inherit"
    }
  }, "Add")), React.createElement("p", {
    style: {
      fontSize: 13,
      color: dim,
      marginTop: 10
    }
  }, "Only pick what you'd be comfortable talking about in an interview. You can change these later."));
}
function App() {
  const ROUTES = ["landing", "quiz", "emailgate", "results", "resumebuilder", "profile", "wall", "community", "score", "dashboard", "interview"];
  const [page, setPageRaw] = useState(() => {
    try {
      const h = location.hash.slice(1);
      return ROUTES.includes(h) && !["results", "emailgate"].includes(h) ? h : "landing";
    } catch (e) {
      return "landing";
    }
  });
  const setPage = p => {
    setPageRaw(p);
    try {
      const h = p === "landing" ? "" : "#" + p;
      if (location.hash !== h) history.pushState(null, "", location.pathname + location.search + h);
    } catch (e) {}
  };
  useEffect(() => {
    const onPop = () => {
      const h = location.hash.slice(1);
      setPageRaw(ROUTES.includes(h) ? h : "landing");
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("hashchange", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("hashchange", onPop);
    };
  }, []);
  const [step, setStep] = useState(0);
  const [editStep, setEditStep] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [ans, setAns] = useState({
    university: "",
    gradYear: "",
    targetTerm: "",
    major: "",
    gpa: "",
    extracurriculars: [],
    skills: [],
    type: "",
    resume: "",
    needsResumeBuilder: false,
    zip: "",
    radius: 50
  });
  const [extPicks, setExtPicks] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState(LOAD_MSGS[0]);
  const [loadPct, setLoadPct] = useState(0);
  const [searchQ, setSearchQ] = useState("");
  const [addingMore, setAddingMore] = useState(false);
  const [hideResumeNudge, setHideResumeNudge] = useState(false);
  const [builderState, setBuilderState] = useState({
    loading: false,
    text: "",
    error: ""
  });
  const [wallPosts, setWallPosts] = useState([]);
  const [wallLoading, setWallLoading] = useState(false);
  const [wallDraft, setWallDraft] = useState("");
  const [wallCategory, setWallCategory] = useState("");
  const [wallSubmitting, setWallSubmitting] = useState(false);
  const [wallMessage, setWallMessage] = useState(null);
  const [wallNameMode, setWallNameMode] = useState(() => {
    try {
      return localStorage.getItem("iq_wall_name_mode") || "anon";
    } catch {
      return "anon";
    }
  });
  const [wallDisplayName, setWallDisplayName] = useState(() => {
    try {
      return localStorage.getItem("iq_wall_display_name") || "";
    } catch {
      return "";
    }
  });
  const [wallReplies, setWallReplies] = useState({});
  const [wallRepliesOpen, setWallRepliesOpen] = useState({});
  const [wallReplyDraft, setWallReplyDraft] = useState({});
  const [wallReplySubmitting, setWallReplySubmitting] = useState({});
  const [wallReplyMessage, setWallReplyMessage] = useState({});
  const [clerkInstance, setClerkInstance] = useState(null);
  const [clerkUser, setClerkUser] = useState(null);
  const [clerkLoading, setClerkLoading] = useState(false);
  const [clerkPromptDismissed, setClerkPromptDismissed] = useState(() => {
    try {
      return localStorage.getItem("iq_clerk_prompt_dismissed") === "1";
    } catch {
      return false;
    }
  });
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(() => {
    try {
      return localStorage.getItem("iq_insights_collapsed") !== "1";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("iq_insights_collapsed", insightsOpen ? "0" : "1");
    } catch {}
  }, [insightsOpen]);
  const [syncStatus, setSyncStatus] = useState(null);
  const [hydratedFromDb, setHydratedFromDb] = useState(false);
  const pendingPushRef = useRef({});
  const [showResultsHint, setShowResultsHint] = useState(() => {
    try {
      return localStorage.getItem("iq_results_hint_seen") !== "1";
    } catch {
      return true;
    }
  });
  function dismissResultsHint() {
    setShowResultsHint(false);
    try {
      localStorage.setItem("iq_results_hint_seen", "1");
    } catch {}
  }
  useEffect(() => {
    setAddingMore(false);
    setSearchQ("");
  }, [step, editStep]);
  const [expandedExt, setExpandedExt] = useState(null);
  const [roleModal, setRoleModal] = useState(null);
  const [customActText, setCustomActText] = useState("");
  const [tipCat, setTipCat] = useState("All");
  const [isPro, setIsPro] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [email, setEmail] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [profileSaved, setProfileSaved] = useState(false);
  const [applyModal, setApplyModal] = useState(null);
  const [scoreResume, setScoreResume] = useState("");
  const [scoreJD, setScoreJD] = useState("");
  const [scoreResult, setScoreResult] = useState(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreError, setScoreError] = useState("");
  const [adzunaLink, setAdzunaLink] = useState(null);
  const [adzunaVerified, setAdzunaVerified] = useState({});
  const [batchVerifying, setBatchVerifying] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [resultsError, setResultsError] = useState("");
  const [adzunaLoading, setAdzunaLoading] = useState(false);
  const [kit, setKit] = useState({
    loading: false,
    company: null,
    coverLetter: "",
    tips: []
  });
  const [copied, setCopied] = useState(null);
  const [appliedCos, setAppliedCos] = useState([]);
  const [proNudge, setProNudge] = useState(null);
  const [followUpModal, setFollowUpModal] = useState(null);
  const [sortBy, setSortBy] = useState("chance");
  const [expandedCard, setExpandedCard] = useState(null);
  const [expandedExplainer, setExpandedExplainer] = useState(null);
  const [cardIntel, setCardIntel] = useState({});
  const [chosenResumeId, setChosenResumeId] = useState(null);
  const [nudgeDone, setNudgeDone] = useState(false);
  const [profilePct, setProfilePct] = useState(0);
  const [tracked, setTracked] = useState([]);
  const [dragCompany, setDragCompany] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [addAppModal, setAddAppModal] = useState(false);
  const [addForm, setAddForm] = useState({
    company: "",
    role: "",
    status: "Saved",
    date: ""
  });
  const [appNotes, setAppNotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("iq_app_notes") || "{}");
    } catch {
      return {};
    }
  });
  const [notesOpen, setNotesOpen] = useState({});
  const [savedJobs, setSavedJobs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("iq_saved_jobs") || "[]");
    } catch {
      return [];
    }
  });
  const [prepModal, setPrepModal] = useState(null);
  const [prepResult, setPrepResult] = useState(null);
  const [prepLoading, setPrepLoading] = useState(false);
  const cur = STEPS[step];
  useEffect(() => {
    const fields = [ans.university, ans.gradYear, ans.major, ans.gpa, extPicks.length > 0 ? "x" : "", ans.skills.length > 0 ? "x" : "", ans.type, ans.zip];
    const filled = fields.filter(Boolean).length;
    setProfilePct(Math.round(filled / fields.length * 100));
  }, [ans, extPicks]);
  function setA(k, v, auto = false) {
    setAns(p => ({
      ...p,
      [k]: v
    }));
    if (auto && editStep === null) {
      setSearchQ("");
      setTimeout(() => {
        let i = step + 1;
        const willBeRemote = k === "type" ? v === "Remote" : ans.type === "Remote";
        while (i < STEPS.length) {
          const sk = STEPS[i].key;
          if (willBeRemote && (sk === "zip" || sk === "radius")) {
            i++;
            continue;
          }
          break;
        }
        if (i < STEPS.length) setStep(i);else setPage("emailgate");
      }, 300);
    }
  }
  function toggleSkill(v) {
    setAns(p => {
      const a = p.skills;
      return {
        ...p,
        skills: a.includes(v) ? a.filter(x => x !== v) : [...a, v]
      };
    });
  }
  function canNext() {
    if (cur?.type === "multi") return true;
    if (cur?.type === "slider") return true;
    if (cur?.type === "resume") return true;
    if (cur?.type === "zip") return /^\d{5}$/.test(ans.zip);
    if (cur?.type === "extracurricular") return extPicks.length > 0;
    return !!ans[cur?.key];
  }
  function nextStepIndex(fromStep) {
    let i = fromStep + 1;
    while (i < STEPS.length) {
      const k = STEPS[i].key;
      if (ans.type === "Remote" && (k === "zip" || k === "radius")) {
        i++;
        continue;
      }
      return i;
    }
    return -1;
  }
  function advanceQuiz() {
    if (!canNext()) return;
    if (editStep !== null) {
      saveEdit();
      return;
    }
    const ni = nextStepIndex(step);
    if (ni >= 0) setStep(ni);else setPage("emailgate");
  }
  useEffect(() => {
    if (page !== "quiz") return;
    const onKey = e => {
      if (e.key !== "Enter") return;
      const tag = e.target && e.target.tagName || "";
      if (tag === "TEXTAREA") return;
      if (e.defaultPrevented || tag === "BUTTON") return;
      e.preventDefault();
      advanceQuiz();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  function answerLabel(key) {
    if (key === "extracurriculars") return extPicks.length ? extPicks.map(e => `${e.activity} (${e.role})`).join(", ") : "None selected";
    if (key === "skills") return ans.skills.length ? ans.skills.join(", ") : "None selected";
    if (key === "radius") return `${ans.radius} miles`;
    if (key === "zip") return ans.zip || "—";
    return ans[key] || "—";
  }
  function editQuestion(i) {
    setShowReview(false);
    setEditStep(i);
    setStep(i);
    setSearchQ("");
    setPage("quiz");
    window.scrollTo(0, 0);
  }
  function saveEdit() {
    setEditStep(null);
    analytics.track("answer_edited");
    calcResults();
  }
  function pickRole(catId, actName, role, customLabel) {
    const isCustom = !!customLabel;
    const finalActivity = isCustom ? customLabel.trim() || actName : actName;
    setExtPicks(p => {
      const existing = p.find(x => x.activity === finalActivity || x.templateName === actName);
      if (existing) {
        return p.map(x => x.activity === finalActivity || x.templateName === actName ? {
          ...x,
          activity: finalActivity,
          role,
          templateName: isCustom ? actName : undefined
        } : x);
      }
      return [...p, {
        activity: finalActivity,
        role,
        catId,
        templateName: isCustom ? actName : undefined
      }];
    });
    setAns(p => ({
      ...p,
      extracurriculars: [...new Set([...p.extracurriculars.filter(a => a !== actName), finalActivity])]
    }));
    setRoleModal(null);
    setCustomActText("");
  }
  function removeExt(actName) {
    setExtPicks(p => p.filter(x => x.activity !== actName));
    setAns(p => ({
      ...p,
      extracurriculars: p.extracurriculars.filter(x => x !== actName)
    }));
  }
  async function calcResults() {
    analytics.track("quiz_completed", {
      major: ans.major,
      term: ans.targetTerm
    });
    setLoading(true);
    setPage("results");
    setShowConfetti(false);
    metaRef.current = null;
    let mi = 0,
      pct = 0;
    setLoadMsg(LOAD_MSGS[0]);
    setLoadPct(0);
    const iv = setInterval(() => {
      mi = (mi + 1) % LOAD_MSGS.length;
      setLoadMsg(LOAD_MSGS[mi]);
      pct = Math.min(pct + 10, 90);
      setLoadPct(pct);
    }, 3500);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 20000);
      const r = await fetch("/api/results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          zip: ans.zip,
          major: ans.major,
          type: ans.type || "Any"
        }),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Couldn't load internships right now — try again in a minute");
      metaRef.current = d.meta || null;
      const initial = applyHonest(Array.isArray(d.results) ? d.results : [], ans, extPicks);
      setResultsError("");
      setAiError(null);
      setResults(initial);
      if (initial.length && (ans.resume || "").trim().length >= 80) enrichWithPersonalizedReasons(initial);
    } catch (e) {
      const msg = e && e.name === "AbortError" ? "That took too long — check your connection and try again." : e && e.message || "Couldn't load internships right now.";
      console.warn("[iq] results failed:", msg);
      setResults([]);
      setResultsError(msg);
    }
    clearInterval(iv);
    setLoadPct(100);
    setTimeout(() => {
      setLoading(false);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }, 400);
  }
  async function enrichWithPersonalizedReasons(currentResults) {
    const resume = (ans.resume || "").trim();
    if (!resume || resume.length < 80 || !currentResults || currentResults.length === 0) return;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 25000);
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          feature: "reasons",
          input: {
            resume: resume.slice(0, 3000),
            companies: currentResults.slice(0, 30).map(c => ({
              name: c.name,
              role: c.role,
              industry: c.industry || ""
            }))
          }
        }),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (!resp.ok) throw new Error("backend " + resp.status);
      const data = await resp.json();
      const text = data.text || "";
      let reasons = null;
      try {
        reasons = JSON.parse(text.trim());
      } catch {
        const m = text.match(/\[[\s\S]*\]/);
        if (m) {
          try {
            reasons = JSON.parse(m[0]);
          } catch {
            reasons = null;
          }
        }
      }
      if (!Array.isArray(reasons) || reasons.length === 0) throw new Error("parse");
      console.log("[iq] B3: personalized", reasons.length, "reasons from resume");
      setResults(prev => prev.map((c, idx) => {
        const r = reasons.find(x => x.i === idx + 1);
        if (r && r.reason) return {
          ...c,
          reason: r.reason,
          personalized: true
        };
        return c;
      }));
      analytics.track("results_personalized", {
        count: reasons.length
      });
    } catch (e) {
      console.warn("[iq] personalization skipped:", e && e.message);
    }
  }
  async function fetchWallPosts() {
    setWallLoading(true);
    try {
      const r = await fetch("/api/community", {
        method: "GET"
      });
      const data = await r.json();
      if (r.ok && Array.isArray(data.posts)) {
        setWallPosts(data.posts);
      }
    } catch (e) {
      console.warn("[wall] fetch failed:", e.message);
    } finally {
      setWallLoading(false);
    }
  }
  async function submitWallPost() {
    const content = (wallDraft || "").trim();
    if (content.length < 4) {
      setWallMessage({
        type: "error",
        text: "Post is too short."
      });
      return;
    }
    if (content.length > 600) {
      setWallMessage({
        type: "error",
        text: "Post is too long (600 char max)."
      });
      return;
    }
    let displayName = null;
    if (wallNameMode === "named") {
      const trimmed = (wallDisplayName || "").trim();
      if (trimmed.length < 1) {
        setWallMessage({
          type: "error",
          text: "Add a display name or switch to anonymous."
        });
        return;
      }
      displayName = trimmed.slice(0, 30);
      try {
        localStorage.setItem("iq_wall_display_name", displayName);
      } catch {}
    }
    try {
      localStorage.setItem("iq_wall_name_mode", wallNameMode);
    } catch {}
    setWallSubmitting(true);
    setWallMessage(null);
    try {
      const r = await fetch("/api/community", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content,
          category: wallCategory || null,
          display_name: displayName
        })
      });
      const data = await r.json();
      if (!r.ok) {
        setWallMessage({
          type: "error",
          text: data.error || "Couldn't submit. Try again."
        });
      } else if (data.flagged) {
        if (data.post && data.post.id && data.deleteToken) {
          try {
            const st = JSON.parse(localStorage.getItem("iq_wall_tokens") || "{}");
            st[data.post.id] = data.deleteToken;
            localStorage.setItem("iq_wall_tokens", JSON.stringify(st));
          } catch (e) {}
        }
        setWallMessage({
          type: "flagged",
          text: data.message || "Your post is waiting for review before it shows up."
        });
        setWallDraft("");
      } else {
        if (data.post && data.post.id && data.deleteToken) {
          try {
            const stored = JSON.parse(localStorage.getItem("iq_wall_tokens") || "{}");
            stored[data.post.id] = data.deleteToken;
            localStorage.setItem("iq_wall_tokens", JSON.stringify(stored));
          } catch (e) {}
        }
        setWallMessage({
          type: "success",
          text: "Posted!"
        });
        setWallDraft("");
        setWallCategory("");
        fetchWallPosts();
      }
    } catch (e) {
      setWallMessage({
        type: "error",
        text: "Network error — try again."
      });
    } finally {
      setWallSubmitting(false);
    }
  }
  async function reportWallItem(kind, id) {
    if (!confirm("Report this for review? It will be checked by the Beat the Pile team.")) return;
    try {
      const r = await fetch("/api/community", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "report",
          kind,
          id
        })
      });
      setWallMessage(r.ok ? {
        type: "success",
        text: "Thanks — we'll take a look."
      } : {
        type: "error",
        text: "Couldn't send the report. Try again."
      });
    } catch (e) {
      setWallMessage({
        type: "error",
        text: "Couldn't send the report. Try again."
      });
    }
  }
  async function deleteOwnPost(postId) {
    if (!confirm("Delete this post? This can't be undone.")) return;
    let tokens = {};
    try {
      tokens = JSON.parse(localStorage.getItem("iq_wall_tokens") || "{}");
    } catch (e) {}
    const token = tokens[postId];
    if (!token) {
      alert("You don't have permission to delete this post on this device.");
      return;
    }
    try {
      const r = await fetch("/api/community", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "owner_delete",
          id: postId,
          token
        })
      });
      const data = await r.json();
      if (!r.ok) {
        alert(data.error || "Couldn't delete the post.");
        return;
      }
      delete tokens[postId];
      try {
        localStorage.setItem("iq_wall_tokens", JSON.stringify(tokens));
      } catch (e) {}
      fetchWallPosts();
    } catch (e) {
      alert("Network error — try again.");
    }
  }
  function ownsPost(postId) {
    try {
      const stored = JSON.parse(localStorage.getItem("iq_wall_tokens") || "{}");
      return !!stored[postId];
    } catch (e) {
      return false;
    }
  }
  async function toggleReplies(postId) {
    const isOpen = wallRepliesOpen[postId];
    if (isOpen) {
      setWallRepliesOpen(p => ({
        ...p,
        [postId]: false
      }));
      return;
    }
    setWallRepliesOpen(p => ({
      ...p,
      [postId]: true
    }));
    if (!wallReplies[postId]) {
      try {
        const r = await fetch(`/api/community?action=replies&post_id=${encodeURIComponent(postId)}`);
        const data = await r.json();
        if (r.ok && Array.isArray(data.replies)) {
          setWallReplies(p => ({
            ...p,
            [postId]: data.replies
          }));
        }
      } catch (e) {
        console.warn("[wall] reply fetch failed", e.message);
      }
    }
  }
  async function submitReply(postId) {
    const content = (wallReplyDraft[postId] || "").trim();
    if (content.length < 4) {
      setWallReplyMessage(p => ({
        ...p,
        [postId]: {
          type: "error",
          text: "Reply too short."
        }
      }));
      return;
    }
    if (content.length > 400) {
      setWallReplyMessage(p => ({
        ...p,
        [postId]: {
          type: "error",
          text: "Reply too long (400 max)."
        }
      }));
      return;
    }
    let displayName = null;
    if (wallNameMode === "named") {
      const trimmed = (wallDisplayName || "").trim();
      if (trimmed.length < 1) {
        setWallReplyMessage(p => ({
          ...p,
          [postId]: {
            type: "error",
            text: "Add a display name or switch to anonymous."
          }
        }));
        return;
      }
      displayName = trimmed.slice(0, 30);
      try {
        localStorage.setItem("iq_wall_display_name", displayName);
      } catch {}
    }
    try {
      localStorage.setItem("iq_wall_name_mode", wallNameMode);
    } catch {}
    setWallReplySubmitting(p => ({
      ...p,
      [postId]: true
    }));
    setWallReplyMessage(p => ({
      ...p,
      [postId]: null
    }));
    try {
      const r = await fetch("/api/community", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "reply",
          post_id: postId,
          content,
          display_name: displayName
        })
      });
      const data = await r.json();
      if (!r.ok) {
        setWallReplyMessage(p => ({
          ...p,
          [postId]: {
            type: "error",
            text: data.error || "Couldn't reply."
          }
        }));
      } else if (data.flagged) {
        setWallReplyMessage(p => ({
          ...p,
          [postId]: {
            type: "flagged",
            text: data.message || "Your reply is waiting for review before it shows up."
          }
        }));
        setWallReplyDraft(p => ({
          ...p,
          [postId]: ""
        }));
      } else {
        if (data.reply && data.reply.id && data.deleteToken) {
          try {
            const stored = JSON.parse(localStorage.getItem("iq_wall_reply_tokens") || "{}");
            stored[data.reply.id] = data.deleteToken;
            localStorage.setItem("iq_wall_reply_tokens", JSON.stringify(stored));
          } catch {}
        }
        setWallReplyDraft(p => ({
          ...p,
          [postId]: ""
        }));
        setWallReplyMessage(p => ({
          ...p,
          [postId]: null
        }));
        setWallReplies(p => ({
          ...p,
          [postId]: [...(p[postId] || []), data.reply]
        }));
        fetchWallPosts();
      }
    } catch (e) {
      setWallReplyMessage(p => ({
        ...p,
        [postId]: {
          type: "error",
          text: "Network error."
        }
      }));
    } finally {
      setWallReplySubmitting(p => ({
        ...p,
        [postId]: false
      }));
    }
  }
  async function deleteOwnReply(postId, replyId) {
    if (!confirm("Delete this reply?")) return;
    let tokens = {};
    try {
      tokens = JSON.parse(localStorage.getItem("iq_wall_reply_tokens") || "{}");
    } catch {}
    const token = tokens[replyId];
    if (!token) {
      alert("You can't delete this reply on this device.");
      return;
    }
    try {
      const r = await fetch("/api/community", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "owner_delete_reply",
          id: replyId,
          token
        })
      });
      const data = await r.json();
      if (!r.ok) {
        alert(data.error || "Couldn't delete.");
        return;
      }
      delete tokens[replyId];
      try {
        localStorage.setItem("iq_wall_reply_tokens", JSON.stringify(tokens));
      } catch {}
      setWallReplies(p => ({
        ...p,
        [postId]: (p[postId] || []).filter(x => x.id !== replyId)
      }));
      fetchWallPosts();
    } catch (e) {
      alert("Network error.");
    }
  }
  function ownsReply(replyId) {
    try {
      const stored = JSON.parse(localStorage.getItem("iq_wall_reply_tokens") || "{}");
      return !!stored[replyId];
    } catch {
      return false;
    }
  }
  useEffect(() => {
    if (page === "results" && !clerkInstance && !clerkLoading) {
      ensureClerkLoaded();
    }
  }, [page]);
  useEffect(() => {
    if (page === "wall") fetchWallPosts();
  }, [page]);
  async function buildStarterResume() {
    setBuilderState({
      loading: true,
      text: "",
      error: ""
    });
    analytics.track("resume_builder_started", {
      major: ans.major
    });
    const majors = (ans.major || "").split(",").map(s => s.trim()).filter(Boolean).join(" and ");
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 25000);
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          feature: "resume_builder",
          input: {
            majors,
            university: ans.university || "",
            gradYear: ans.gradYear || "",
            gpa: ans.gpa || "",
            skills: ans.skills || [],
            activities: extPicks.map(e => ({
              activity: e.activity,
              role: e.role
            }))
          }
        }),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (!resp.ok) throw new Error("backend " + resp.status);
      const data = await resp.json();
      const text = (data.text || "").trim();
      if (!text || text.length < 100) throw new Error("Got an unusually short response — try again.");
      setBuilderState({
        loading: false,
        text,
        error: ""
      });
      analytics.track("resume_builder_done", {
        chars: text.length
      });
    } catch (e) {
      setBuilderState({
        loading: false,
        text: "",
        error: String(e.message || e)
      });
    }
  }
  function saveBuilderResumeToProfile() {
    if (!builderState.text) return;
    const id = Date.now();
    const newResume = {
      id,
      name: `Starter Resume — ${(ans.major || "").split(",")[0].trim() || "Draft"}`,
      text: builderState.text
    };
    setProfile(p => ({
      ...p,
      resumes: [...(p.resumes || []), newResume]
    }));
    setAns(p => ({
      ...p,
      resume: builderState.text,
      needsResumeBuilder: false
    }));
    analytics.track("resume_builder_saved");
  }
  useEffect(() => {
    const s = profileStore.load();
    if (s) setProfile({
      ...EMPTY_PROFILE,
      ...s
    });
  }, []);
  useEffect(() => {
    ensureClerkLoaded();
  }, []);
  const restoredRef = useRef(false);
  const metaRef = useRef(null);
  useEffect(() => {
    const s = sessionStore.load();
    if (s) {
      if (s.ans) setAns(a => ({
        ...a,
        ...s.ans
      }));
      if (Array.isArray(s.extPicks)) setExtPicks(s.extPicks);
      if (Array.isArray(s.results) && s.results.length > 0) setResults(s.results);
      if (typeof s.email === "string") setEmail(s.email);
      if (Array.isArray(s.tracked) && s.tracked.length > 0) setTracked(s.tracked);
      if (typeof s.isPro === "boolean") setIsPro(s.isPro);
      if (typeof s.step === "number" && s.step >= 0) setStep(s.step);
    }
    try {
      if (location.hash === "#results" || location.hash === "#emailgate") {
        const to = s && Array.isArray(s.results) && s.results.length ? "results" : "quiz";
        setPageRaw(to);
        history.replaceState(null, "", location.pathname + location.search + "#" + to);
      }
    } catch (e) {}
    restoredRef.current = true;
  }, []);
  useEffect(() => {
    if (restoredRef.current) {
      sessionStore.save({
        ans,
        extPicks,
        results,
        email,
        tracked,
        isPro,
        step
      });
    }
  }, [ans, extPicks, results, email, tracked, isPro, step]);
  useEffect(() => {
    if (!results || results.length === 0) return;
    if (results.every(c => c.source === "db")) return;
    setAdzunaVerified({});
    setBatchVerifying(true);
    (async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 20000);
        const resp = await fetch("/api/jobs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            mode: "batch",
            companies: results.map(c => ({
              name: c.name,
              role: c.role,
              location: c.location
            })),
            zip: ans.zip
          }),
          signal: ctrl.signal
        });
        clearTimeout(timer);
        if (!resp.ok) throw new Error("batch " + resp.status);
        const data = await resp.json();
        if (data && data.results) {
          setAdzunaVerified(data.results);
        }
      } catch (e) {
        console.log("[iq] batch verify failed:", e && e.message);
      } finally {
        setBatchVerifying(false);
      }
    })();
  }, [results]);
  useEffect(() => {
    try {
      localStorage.setItem("iq_app_notes", JSON.stringify(appNotes));
    } catch {}
    ;
  }, [appNotes]);
  useEffect(() => {
    try {
      localStorage.setItem("iq_saved_jobs", JSON.stringify(savedJobs));
    } catch {}
    ;
  }, [savedJobs]);
  useEffect(() => {
    setAppliedCos(usageStore.getApplied());
    const v = usageStore.bumpVisit();
    if (v >= 2) {
      analytics.track("return_visit", {
        visit: v
      });
    }
  }, []);
  useEffect(() => {
    if (nudgeDone || isPro || proNudge) return;
    const v = (() => {
      try {
        return parseInt(localStorage.getItem("iq_visits") || "1", 10);
      } catch (e) {
        return 1;
      }
    })();
    if (v >= 2 && page === "results" && !loading) {
      const t = setTimeout(() => {
        setProNudge({
          reason: "welcome_back"
        });
        analytics.track("nudge_shown", {
          reason: "welcome_back"
        });
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [page, loading]);
  useEffect(() => {
    if (showProModal) analytics.track("pro_modal_opened");
  }, [showProModal]);
  useEffect(() => {
    if (page === "profile" && !profile._init) {
      setProfile(p => ({
        ...p,
        _init: true,
        email: p.email || email,
        school: p.school || ans.university,
        major: p.major || ans.major,
        gradDate: p.gradDate || ans.gradYear,
        gpa: p.gpa || ans.gpa,
        topSkills: p.topSkills || (ans.skills || []).join(", ")
      }));
    }
  }, [page]);
  function setP(k, v) {
    setProfile(p => ({
      ...p,
      [k]: v
    }));
  }
  function saveProfile() {
    profileStore.save(profile);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2200);
  }
  function addResume() {
    setProfile(p => ({
      ...p,
      resumes: [...(p.resumes || []), {
        id: Date.now(),
        name: `Resume ${(p.resumes || []).length + 1}`,
        text: ""
      }]
    }));
  }
  function updateResume(id, field, val) {
    setProfile(p => ({
      ...p,
      resumes: (p.resumes || []).map(r => r.id === id ? {
        ...r,
        [field]: val
      } : r)
    }));
  }
  const [resumeUploadErr, setResumeUploadErr] = useState("");
  const [resumeUploading, setResumeUploading] = useState(false);
  async function loadPdfJs() {
    if (window.pdfjsLib) return window.pdfjsLib;
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
    return window.pdfjsLib;
  }
  async function loadJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
    return window.jspdf && window.jspdf.jsPDF;
  }
  async function ensureClerkLoaded() {
    if (clerkInstance) return clerkInstance;
    if (clerkLoading) return null;
    setClerkLoading(true);
    try {
      const cfgResp = await fetch("/api/config");
      if (!cfgResp.ok) throw new Error("config fetch failed");
      const cfg = await cfgResp.json();
      const pubKey = cfg.clerkPublishableKey;
      if (!pubKey) throw new Error("no Clerk key configured");
      if (!window.Clerk) {
        const keyBody = pubKey.replace(/^pk_(test|live)_/, "");
        let frontendHost;
        try {
          const decoded = atob(keyBody);
          frontendHost = decoded.replace(/\$$/, "").trim();
        } catch {
          throw new Error("could not decode Clerk publishable key");
        }
        if (!frontendHost || !/clerk/.test(frontendHost)) throw new Error("decoded frontend host looks wrong: " + frontendHost);
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = `https://${frontendHost}/npm/@clerk/clerk-js@5/dist/clerk.browser.js`;
          s.setAttribute("data-clerk-publishable-key", pubKey);
          s.async = true;
          s.crossOrigin = "anonymous";
          s.onload = res;
          s.onerror = () => rej(new Error("Clerk SDK failed to load from " + s.src));
          document.head.appendChild(s);
        });
      }
      if (!window.Clerk) throw new Error("Clerk global not available after load");
      if (typeof window.Clerk.load === "function" && !window.Clerk.loaded) {
        await window.Clerk.load({});
      }
      const Clerk = window.Clerk;
      if (typeof Clerk.addListener === "function") {
        Clerk.addListener(({
          user
        }) => {
          setClerkUser(user || null);
          if (user && window.btpIdentify) window.btpIdentify(user.id);
        });
      }
      setClerkUser(Clerk.user || null);
      if (Clerk.user && window.btpIdentify) window.btpIdentify(Clerk.user.id);
      setClerkInstance(Clerk);
      return Clerk;
    } catch (e) {
      console.warn("[iq] Clerk load failed:", e.message);
      return null;
    } finally {
      setClerkLoading(false);
    }
  }
  async function openSignIn() {
    const Clerk = await ensureClerkLoaded();
    if (!Clerk) {
      alert("Sign-in couldn't load. Check your connection and try again.");
      return;
    }
    if (Clerk.user) {
      setClerkUser(Clerk.user);
      setPage("profile");
      return;
    }
    try {
      Clerk.openSignIn({});
    } catch (e) {
      alert("Sign-in couldn't open. Refresh and try again.");
    }
  }
  async function signOut() {
    if (!clerkInstance) return;
    await clerkInstance.signOut();
    setClerkUser(null);
    try {
      Object.keys(localStorage).filter(k => k.startsWith("iq_")).forEach(k => localStorage.removeItem(k));
    } catch (e) {}
    memSession = {};
    memProfile = null;
    window.location.reload();
  }
  function dismissClerkPrompt() {
    setClerkPromptDismissed(true);
    try {
      localStorage.setItem("iq_clerk_prompt_dismissed", "1");
    } catch {}
  }
  async function getClerkToken() {
    if (!clerkInstance || !clerkInstance.session) return null;
    try {
      return await clerkInstance.session.getToken();
    } catch (e) {
      return null;
    }
  }
  async function hydrateOrMigrate() {
    if (!clerkUser || !clerkInstance || hydratedFromDb) return;
    setSyncStatus("loading");
    try {
      const token = await getClerkToken();
      if (!token) {
        setSyncStatus("error");
        return;
      }
      const r = await fetch("/api/usersync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
          action: "migrate",
          profile,
          tracker: tracked,
          resumes: {
            list: profile.resumes || []
          }
        })
      });
      if (!r.ok) {
        setSyncStatus("error");
        console.warn("[sync] merge failed:", r.status);
        return;
      }
      const {
        data
      } = await r.json();
      if (data) {
        const rl = data.resumes && Array.isArray(data.resumes.list) ? data.resumes.list : null;
        if (data.profile || rl) setProfile(p => ({
          ...p,
          ...(data.profile || {}),
          resumes: rl || p.resumes || []
        }));
        if (Array.isArray(data.tracker)) setTracked(data.tracker);
      }
      setHydratedFromDb(true);
      setSyncStatus("synced");
    } catch (e) {
      console.warn("[sync] hydrateOrMigrate error:", e.message);
      setSyncStatus("error");
    }
  }
  async function pushSlice(kind, data) {
    if (!clerkUser || !clerkInstance) return;
    if (!hydratedFromDb) return;
    if (pendingPushRef.current[kind]) {
      clearTimeout(pendingPushRef.current[kind]);
    }
    pendingPushRef.current[kind] = setTimeout(async () => {
      setSyncStatus("saving");
      try {
        const token = await getClerkToken();
        if (!token) {
          setSyncStatus("error");
          return;
        }
        const r = await fetch("/api/usersync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
          },
          body: JSON.stringify({
            action: "set",
            kind,
            data
          })
        });
        if (r.ok) {
          setSyncStatus("synced");
        } else {
          setSyncStatus("error");
          console.warn("[sync] push failed for", kind);
        }
      } catch (e) {
        console.warn("[sync] push error:", e.message);
        setSyncStatus("error");
      }
    }, 800);
  }
  useEffect(() => {
    if (clerkUser && clerkInstance && !hydratedFromDb) {
      hydrateOrMigrate();
    }
    if (!clerkUser && hydratedFromDb) {
      setHydratedFromDb(false);
      setSyncStatus(null);
    }
  }, [clerkUser, clerkInstance]);
  useEffect(() => {
    if (clerkUser && hydratedFromDb) {
      pushSlice("profile", profile);
    }
  }, [profile]);
  useEffect(() => {
    if (clerkUser && hydratedFromDb) {
      pushSlice("tracker", tracked);
    }
  }, [tracked]);
  useEffect(() => {
    if (clerkUser && hydratedFromDb) {
      pushSlice("resumes", {
        list: profile.resumes || []
      });
    }
  }, [profile.resumes]);
  async function downloadResumeAsPdf() {
    const text = (builderState.text || "").trim();
    if (!text) {
      alert("No resume text to export.");
      return;
    }
    try {
      const jsPDF = await loadJsPDF();
      if (!jsPDF) {
        alert("Couldn't load PDF library. Check your connection.");
        return;
      }
      const doc = new jsPDF({
        unit: "pt",
        format: "letter"
      });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 54;
      const usableW = pageW - margin * 2;
      const lineH = 14;
      let y = margin;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      const sourceLines = text.split(/\r?\n/);
      for (const raw of sourceLines) {
        const trimmed = raw.trim();
        const isHeading = trimmed.length > 0 && trimmed.length < 60 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
        if (isHeading) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11.5);
        } else {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10.5);
        }
        const wrapped = doc.splitTextToSize(raw || " ", usableW);
        for (const line of wrapped) {
          if (y + lineH > pageH - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += lineH;
        }
      }
      const fname = `resume-starter-${(ans.major || "draft").split(",")[0].trim().replace(/\s+/g, "-").toLowerCase()}.pdf`;
      doc.save(fname);
      analytics.track("resume_builder_pdf_downloaded");
    } catch (e) {
      console.error("[iq] PDF generation failed:", e);
      alert("Couldn't generate the PDF. Try again, or use Download .txt instead.");
    }
  }
  async function extractTextFromFile(file) {
    const name = (file.name || "").toLowerCase();
    if (name.endsWith(".txt") || file.type === "text/plain") {
      return await file.text();
    }
    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      const pdfjs = await loadPdfJs();
      const buf = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({
        data: buf
      }).promise;
      let out = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const tc = await page.getTextContent();
        out += tc.items.map(it => it.str).join(" ") + "\n\n";
      }
      return out.trim();
    }
    if (name.endsWith(".docx")) {
      const buf = await file.arrayBuffer();
      const txt = new TextDecoder().decode(buf);
      const matches = txt.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
      if (matches && matches.length) {
        return matches.map(m => m.replace(/<[^>]+>/g, "")).join(" ").replace(/\s+/g, " ").trim();
      }
      throw new Error("Couldn't read this .docx — try pasting the text instead.");
    }
    throw new Error("Unsupported file type. Use .pdf, .docx, or .txt — or paste the text.");
  }
  async function handleResumeUpload(resumeId, fileList) {
    setResumeUploadErr("");
    const file = fileList && fileList[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setResumeUploadErr("File is larger than 4MB. Try pasting the text instead.");
      return;
    }
    setResumeUploading(true);
    try {
      const text = await extractTextFromFile(file);
      if (!text || text.length < 40) {
        throw new Error("Couldn't read much text from that file — try pasting instead.");
      }
      updateResume(resumeId, "text", text);
      const cleanName = (file.name || "").replace(/\.[^.]+$/, "").slice(0, 40);
      const cur = (profile.resumes || []).find(r => r.id === resumeId);
      if (cur && /^Resume \d+$/.test(cur.name) && cleanName) {
        updateResume(resumeId, "name", cleanName);
      }
      analytics.track("resume_uploaded", {
        type: file.name.split(".").pop().toLowerCase(),
        chars: text.length
      });
    } catch (e) {
      setResumeUploadErr(String(e.message || e));
    } finally {
      setResumeUploading(false);
    }
  }
  async function handleQuizResumeUpload(fileList) {
    setResumeUploadErr("");
    const file = fileList && fileList[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setResumeUploadErr("File is larger than 4MB. Try pasting the text instead.");
      return;
    }
    setResumeUploading(true);
    try {
      const text = await extractTextFromFile(file);
      if (!text || text.length < 40) {
        throw new Error("Couldn't read much text from that file — try pasting instead.");
      }
      setA("resume", text);
      analytics.track("resume_uploaded", {
        type: file.name.split(".").pop().toLowerCase(),
        chars: text.length,
        where: "quiz"
      });
    } catch (e) {
      setResumeUploadErr(String(e.message || e));
    } finally {
      setResumeUploading(false);
    }
  }
  function deleteResume(id) {
    setProfile(p => ({
      ...p,
      resumes: (p.resumes || []).filter(r => r.id !== id)
    }));
  }
  function clearProfile() {
    profileStore.clear();
    sessionStore.clear();
    setProfile({
      ...EMPTY_PROFILE,
      _init: true
    });
    setResults([]);
    setTracked([]);
    setEmail("");
    setExtPicks([]);
    setAns({
      university: "",
      gradYear: "",
      targetTerm: "",
      major: "",
      gpa: "",
      extracurriculars: [],
      skills: [],
      type: "",
      resume: "",
      needsResumeBuilder: false,
      zip: "",
      radius: 50
    });
  }
  function copyText(t, key) {
    try {
      navigator.clipboard.writeText(t);
    } catch (e) {}
    setCopied(key);
    setTimeout(() => setCopied(null), 1300);
  }
  const profileReady = () => !!(profile.fullName && (profile.email || email));
  function applyUrl(c) {
    const site = (c.website || "").trim();
    if (site) {
      const cleaned = site.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "");
      if (cleaned && cleaned.includes(".")) {
        return `https://${cleaned}`;
      }
    }
    const q = encodeURIComponent(`"${c.name || ""}" ${c.role || "internship"} internship apply`);
    return `https://www.google.com/search?q=${q}`;
  }
  function hasDirectApply(c) {
    const site = (c.website || "").trim();
    return !!(site && site.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "").includes("."));
  }
  function linkedinJobsUrl(c) {
    return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent((c.name || "") + " " + (c.role || "intern"))}`;
  }
  function indeedJobsUrl(c) {
    const q = encodeURIComponent(`${c.name || ""} ${c.role || "intern"} internship`);
    const loc = /^\d{5}$/.test(ans.zip) ? `&l=${encodeURIComponent(ans.zip)}` : "";
    return `https://www.indeed.com/jobs?q=${q}${loc}&jt=internship`;
  }
  function handshakeUrl(c) {
    const q = encodeURIComponent(`${c.name || ""} ${c.role || "intern"}`);
    return `https://app.joinhandshake.com/stu/postings?query=${q}`;
  }
  function companyWebsiteUrl(c) {
    const site = (c.website || "").trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    if (site && site.includes(".") && !site.includes(" ")) {
      return `https://${site}`;
    }
    return null;
  }
  function linkedinCompanyUrl(c) {
    const slug = (c.name || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, "-");
    return `https://www.linkedin.com/company/${slug}/jobs/`;
  }
  function indeedCompanyUrl(c) {
    const slug = (c.name || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, "-");
    return `https://www.indeed.com/cmp/${slug}/jobs`;
  }
  function handshakeUrl(c) {
    const q = encodeURIComponent(`${c.name || ""} ${c.role || "intern"}`);
    return `https://app.joinhandshake.com/stu/postings?query=${q}`;
  }
  function googleSearchUrl(c) {
    const q = encodeURIComponent(`"${c.name || ""}" ${c.role || "internship"} internship apply`);
    return `https://www.google.com/search?q=${q}`;
  }
  function googleJobsUrl(c) {
    return googleSearchUrl(c);
  }
  function companyWebsiteUrlFallback(c) {
    return companyWebsiteUrl(c) || googleSearchUrl(c);
  }
  function indeedJobsUrl(c) {
    return indeedCompanyUrl(c);
  }
  function mapDirectionsUrl(c) {
    const dest = adzunaLink && adzunaLink.location || c.location || c.name;
    if (!dest) return null;
    const origin = /^\d{5}$/.test(ans.zip) ? ans.zip : "";
    const params = new URLSearchParams({
      api: "1",
      destination: `${c.name}, ${dest}`
    });
    if (origin) params.set("origin", origin);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }
  function shouldShowMap(c) {
    if (ans.type === "Remote") return false;
    const loc = adzunaLink && adzunaLink.location || c.location || "";
    if (!loc || loc === "National employer" || loc === "Hires interns in your field" || loc === "Regional employer" || loc === "Regional facilities") return false;
    return true;
  }
  const appsLeft = () => Math.max(0, FREE_APPLICATIONS - appliedCos.length);
  const canApplyTo = c => isPro || appliedCos.includes(c.name) || appliedCos.length < FREE_APPLICATIONS;
  function openApply(c) {
    if (showResultsHint) {
      dismissResultsHint();
    }
    setKit({
      loading: false,
      company: null,
      coverLetter: "",
      tips: []
    });
    setApplyModal(c);
    setAdzunaLink(null);
    setAdzunaLoading(true);
    (async () => {
      if (c.source === "db" && c.applyUrl) {
        setAdzunaLoading(false);
        return;
      }
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const resp = await fetch("/api/jobs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            company: c.name,
            role: c.role || "intern",
            location: c.location || ans.zip || ""
          }),
          signal: ctrl.signal
        });
        clearTimeout(timer);
        if (!resp.ok) throw new Error("jobs " + resp.status);
        const data = await resp.json();
        if (data && data.found && data.applyUrl) {
          setAdzunaLink({
            applyUrl: data.applyUrl,
            title: data.title,
            location: data.location,
            browseUrl: null
          });
        } else if (data && data.browseUrl) {
          setAdzunaLink({
            applyUrl: null,
            title: null,
            location: null,
            browseUrl: data.browseUrl
          });
        }
      } catch (e) {
        console.log("[iq] no live Adzuna link found, using search fallback:", e && e.message);
      } finally {
        setAdzunaLoading(false);
      }
    })();
    if (canApplyTo(c) && !isPro && !appliedCos.includes(c.name)) {
      const list = usageStore.addApplied(c.name);
      setAppliedCos([...list]);
      analytics.track("application_started", {
        company: c.name,
        total: list.length
      });
    } else if (!canApplyTo(c)) {
      analytics.track("application_limit_hit", {
        company: c.name
      });
    }
  }
  function fallbackLetter(c) {
    const p = profile;
    const name = p.fullName || "[Your name]";
    const school = p.school || ans.university || "my university";
    const grad = p.gradDate || ans.gradYear || "soon";
    const skills = (ans.skills || []).slice(0, 3).join(", ") || p.topSkills || "relevant coursework";
    const standout = p.whyMe ? ` ${p.whyMe}` : "";
    return `Dear ${c.name} Hiring Team,\n\nI'm a ${p.major || ans.major || ""} student at ${school}, graduating ${grad}, writing to express my strong interest in the ${c.role} position. ${c.name}'s work in ${c.industry || "the field"} is exactly the kind of environment where I want to grow.\n\nThrough my coursework and experience with ${skills}, I've built a foundation I'm eager to apply in a real-world setting.${standout} I'm confident I'd bring genuine enthusiasm and a strong work ethic to your team.\n\nI'd welcome the opportunity to discuss how I can contribute. Thank you for your time and consideration.\n\nBest regards,\n${name}`;
  }
  async function generateKit(c) {
    setKit({
      loading: true,
      company: c.name,
      coverLetter: "",
      tips: []
    });
    const p = profile;
    const chosen = (p.resumes || []).find(r => r.id === chosenResumeId);
    const input = {
      student: {
        fullName: p.fullName || "",
        major: p.major || ans.major || "",
        school: p.school || ans.university || "",
        gradDate: p.gradDate || ans.gradYear || "",
        gpa: p.gpa || ans.gpa || "",
        skills: (ans.skills || []).join(", ") || p.topSkills || "",
        whyMe: p.whyMe || ""
      },
      resume: chosen && chosen.text ? chosen.text.slice(0, 2000) : "",
      resumeName: chosen ? chosen.name : "",
      role: c.role,
      company: c.name,
      industry: c.industry || ""
    };
    try {
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          feature: "cover_letter",
          input
        })
      });
      if (!resp.ok) throw new Error("backend " + resp.status);
      const data = await resp.json();
      const text = data.text || "";
      let obj;
      try {
        obj = JSON.parse(text.trim());
      } catch {
        const m = text.match(/\{[\s\S]*\}/);
        obj = m ? JSON.parse(m[0]) : null;
      }
      if (obj && obj.coverLetter) {
        setKit({
          loading: false,
          company: c.name,
          coverLetter: obj.coverLetter,
          tips: obj.tips || []
        });
        analytics.track("cover_letter_generated", {
          company: c.name
        });
        return;
      }
      throw new Error("parse");
    } catch (e) {
      console.error("[iq] cover letter backend failed, using template:", e && e.message);
      setKit({
        loading: false,
        company: c.name,
        coverLetter: fallbackLetter(c),
        tips: ["Apply within 48 hours of the posting going live — early applicants get reviewed first.", "Mirror 2–3 keywords from the job description so your resume passes screening filters.", "Send a short, polite follow-up email 5–7 business days after applying."]
      });
      analytics.track("cover_letter_generated", {
        company: c.name,
        fallback: true
      });
    }
  }
  function sendToMailerLite(addr) {
    try {
      const body = new URLSearchParams();
      body.append("fields[email]", addr);
      body.append("ml-submit", "1");
      body.append("anticsrf", "true");
      fetch("https://assets.mailerlite.com/jsonp/2371936/forms/188193161019917410/subscribe", {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body.toString()
      }).catch(() => {});
      analytics.track("email_captured");
    } catch (e) {}
  }
  function submitEmail() {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setEmailErr("That doesn't look like an email. Fix it, or tap Skip.");
      return;
    }
    setEmailErr("");
    sendToMailerLite(email);
    calcResults();
  }
  function track(c) {
    if (!tracked.find(t => t.company === c.name)) {
      const next = [...tracked, {
        company: c.name,
        role: c.role,
        status: "Applied",
        date: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric"
        }),
        appliedAt: Date.now(),
        followedUp: false
      }];
      setTracked(next);
      analytics.track("application_tracked", {
        company: c.name,
        total: next.length
      });
      if (!isPro && !nudgeDone && next.length >= 3) {
        setProNudge({
          reason: "followups"
        });
        setNudgeDone(true);
        analytics.track("nudge_shown", {
          reason: "followups"
        });
      }
    }
  }
  function followUpStatus(a) {
    if (a.followedUp) return {
      state: "done",
      label: "Followed up ✓",
      days: null
    };
    if (!a.appliedAt) return {
      state: "unknown",
      label: "",
      days: null
    };
    const days = Math.floor((Date.now() - a.appliedAt) / (1000 * 60 * 60 * 24));
    if (days >= 5) return {
      state: "due",
      label: "Follow up now",
      days
    };
    if (days >= 3) return {
      state: "soon",
      label: `Follow up in ${5 - days}d`,
      days
    };
    return {
      state: "wait",
      label: `Day ${days} of 5`,
      days
    };
  }
  function markFollowedUp(company) {
    setTracked(p => p.map(x => x.company === company ? {
      ...x,
      followedUp: true
    } : x));
    analytics.track("followup_marked_sent", {
      company
    });
  }
  async function scoreApplication() {
    const resume = (scoreResume || "").trim();
    const jd = (scoreJD || "").trim();
    if (!resume && !jd) {
      setScoreError("Paste a resume and/or a job description to score.");
      return;
    }
    setScoreError("");
    setScoreLoading(true);
    setScoreResult(null);
    analytics.track("score_started", {
      hasResume: !!resume,
      hasJD: !!jd
    });
    const input = {
      resume,
      jd,
      profile: {
        major: ans.major || "",
        gpa: ans.gpa || "",
        gradYear: ans.gradYear || "",
        activities: extPicks.map(e => ({
          activity: e.activity,
          role: e.role
        }))
      }
    };
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 28000);
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          feature: "score",
          input
        }),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (!resp.ok) throw new Error("backend " + resp.status);
      const data = await resp.json();
      const text = data.text || "";
      let obj;
      try {
        obj = JSON.parse(text.trim());
      } catch {
        const m = text.match(/\{[\s\S]*\}/);
        if (m) {
          try {
            obj = JSON.parse(m[0]);
          } catch {
            obj = null;
          }
        }
      }
      if (!obj || typeof obj.screenerScore === "undefined") throw new Error("parse");
      setScoreResult(obj);
      analytics.track("score_completed", {
        screenerScore: obj.screenerScore,
        humanScore: obj.humanScore
      });
    } catch (e) {
      console.error("[iq] score failed:", e && e.message);
      setScoreError("Something went wrong scoring this. Try again — or shorten your paste if it's very long.");
    } finally {
      setScoreLoading(false);
    }
  }
  async function generateFollowUp(a) {
    setKit({
      loading: true,
      company: a.company,
      coverLetter: "",
      tips: [],
      mode: "followup"
    });
    const p = profile;
    const days = followUpStatus(a).days || 7;
    const savedResume = (p.resumes || []).find(r => r.text && r.text.length > 80);
    const resumeText = savedResume ? savedResume.text.slice(0, 2000) : (ans.resume || "").slice(0, 2000);
    const input = {
      student: {
        fullName: p.fullName || "",
        major: p.major || ans.major || "",
        school: p.school || ans.university || ""
      },
      role: a.role,
      company: a.company,
      days,
      resume: resumeText
    };
    try {
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          feature: "followup",
          input
        })
      });
      if (!resp.ok) throw new Error("backend " + resp.status);
      const data = await resp.json();
      const text = data.text || "";
      let obj;
      try {
        obj = JSON.parse(text.trim());
      } catch {
        const m = text.match(/\{[\s\S]*\}/);
        obj = m ? JSON.parse(m[0]) : null;
      }
      if (obj && obj.coverLetter) {
        setKit({
          loading: false,
          company: a.company,
          mode: "followup",
          coverLetter: obj.coverLetter,
          tips: obj.tips || []
        });
        analytics.track("followup_generated", {
          company: a.company,
          personalized: resumeText.length >= 80
        });
        return;
      }
      throw new Error("parse");
    } catch (e) {
      console.error("[iq] follow-up backend failed, using template:", e && e.message);
      setKit({
        loading: false,
        company: a.company,
        mode: "followup",
        coverLetter: `Subject: Following up — ${a.role} application\n\nHi,\n\nI recently applied for the ${a.role} position at ${a.company} and wanted to reaffirm how excited I am about the opportunity. I'd love the chance to contribute to your team and keep growing my skills in ${p.major || ans.major || "the field"}.\n\nIf there's any update on the timeline or next steps, I'd be grateful to hear it. Thank you again for your time and consideration.\n\nBest regards,\n${p.fullName || "[Your name]"}`,
        tips: ["Send 5–7 business days after applying — Tuesday–Thursday mornings tend to land best.", "Reply to any confirmation email you received so it reaches the right inbox, or send to the recruiter directly if you have their address."]
      });
      analytics.track("followup_generated", {
        company: a.company,
        fallback: true
      });
    }
  }
  function addPost() {}
  async function generateInterviewPrep(a) {
    setPrepModal(a);
    setPrepResult(null);
    setPrepLoading(true);
    const p = profile;
    const savedResume = (p.resumes || []).find(r => r.text && r.text.length > 80);
    const resumeSnippet = savedResume ? savedResume.text.slice(0, 1800) : (ans.resume || "").slice(0, 1800);
    const input = {
      student: {
        major: p.major || ans.major || "",
        school: p.school || ans.university || "",
        gpa: ans.gpa || "",
        gradDate: ans.gradYear || ""
      },
      role: a.role,
      company: a.company,
      industry: a.industry || "",
      resume: resumeSnippet
    };
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 25000);
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          feature: "interview_prep",
          input
        }),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (!resp.ok) throw new Error("backend " + resp.status);
      const data = await resp.json();
      const text = data.text || "";
      let obj;
      try {
        obj = JSON.parse(text.trim());
      } catch {
        const m = text.match(/\{[\s\S]*\}/);
        obj = m ? JSON.parse(m[0]) : null;
      }
      if (!obj || !Array.isArray(obj.questions)) throw new Error("parse");
      setPrepResult(obj);
      analytics.track("interview_prep_generated", {
        company: a.company
      });
    } catch (e) {
      setPrepResult({
        questions: [{
          q: `Tell me about yourself and why you're interested in the ${a.role} role at ${a.company}.`,
          framework: "Lead with your major, a relevant project or experience, and close with why this company specifically. Keep it under 90 seconds."
        }, {
          q: "Walk me through a time you solved a difficult problem under pressure.",
          framework: "Use STAR format: Situation, Task, Action, Result. Pick something real — even a class project works."
        }, {
          q: `What do you know about ${a.company} and the ${a.industry || "industry"} right now?`,
          framework: "Research 2-3 recent news items or facts about the company before the interview. Showing you did homework is a massive differentiator."
        }, {
          q: "Where do you see yourself in 5 years?",
          framework: "Align your answer with the field you're interviewing for. You don't have to be specific — showing direction and ambition matters more."
        }, {
          q: "What's a weakness you've been actively working on?",
          framework: "Pick something real but not disqualifying for the role. Show the steps you're taking to improve it."
        }, {
          q: `What technical skills or tools are you most confident using that would help you in this role?`,
          framework: "Pull directly from your resume. Be specific — name a project or class where you used each skill."
        }, {
          q: "Do you have any questions for us?",
          framework: "Always ask something. Try: 'What does success look like in the first 90 days?' or 'What do the best interns do differently?'"
        }],
        tips: ["Research the company for 20 minutes the night before — look at their LinkedIn, recent news, and the team you'd be joining.", "Prepare 3 STAR stories from your resume that can be adapted to different behavioral questions.", "Send a thank-you email within 24 hours. Most interns don't — you will stand out."]
      });
      analytics.track("interview_prep_fallback", {
        company: a.company
      });
    } finally {
      setPrepLoading(false);
    }
  }
  const [saveNote, setSaveNote] = useState("");
  function toggleSaveJob(company) {
    const on = !savedJobs.some(j => j.name === company.name);
    setSavedJobs(prev => {
      const exists = prev.find(j => j.name === company.name);
      if (exists) return prev.filter(j => j.name !== company.name);
      return [...prev, {
        ...company,
        savedAt: new Date().toISOString()
      }];
    });
    if (clerkUser && company.listingId) {
      (async () => {
        try {
          const t = await getClerkToken();
          await fetch("/api/me", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + t
            },
            body: JSON.stringify({
              list: "saved",
              id: company.listingId,
              on
            })
          });
        } catch (e) {}
      })();
    }
    if (on) {
      setSaveNote(clerkUser ? "Saved ♥ — find it on your Dashboard here, or in My Season → Saved." : "Saved ♥ on this device — find it on your Dashboard. Sign in to keep it in My Season too.");
      setTimeout(() => setSaveNote(""), 4500);
    }
  }
  function isJobSaved(name) {
    return savedJobs.some(j => j.name === name);
  }
  async function fetchCardIntel(c) {
    const key = c.name;
    if (cardIntel[key]) return;
    setCardIntel(p => ({
      ...p,
      [key]: {
        loading: true
      }
    }));
    try {
      const resp = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          feature: "intel",
          input: {
            name: c.name,
            industry: c.industry || "",
            location: c.location || "",
            role: c.role || ""
          }
        })
      });
      if (!resp.ok) throw new Error("api " + resp.status);
      const data = await resp.json();
      const text = (data.text || "").trim();
      let obj = null;
      try {
        obj = JSON.parse(text);
      } catch {
        const m = text.match(/\{[^{}]*\}/);
        if (m) {
          try {
            obj = JSON.parse(m[0]);
          } catch {
            obj = null;
          }
        }
      }
      if (obj && obj.description && !obj.description.includes("One specific sentence")) {
        setCardIntel(p => ({
          ...p,
          [key]: {
            ...obj,
            loading: false
          }
        }));
      } else {
        throw new Error("bad or template response");
      }
    } catch (e) {
      const isNational = c.tier === "national";
      const ind = c.industry || "this sector";
      const role = c.role || "intern";
      const loc = c.location && !["National employer", "Regional employer", "Hires interns in your field"].includes(c.location) ? ` based in ${c.location}` : "";
      setCardIntel(p => ({
        ...p,
        [key]: {
          description: `We couldn't load a summary right now. The posting is for ${role}${loc ? loc : ""} — open it for details.`,
          loading: false
        }
      }));
    }
  }
  const ProModal = () => React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(10,22,40,0.6)",
      zIndex: 300,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem",
      backdropFilter: "blur(4px)"
    },
    onClick: () => setShowProModal(false)
  }, React.createElement("div", {
    style: {
      background: "#fff",
      borderRadius: var_rxl,
      padding: "2.5rem",
      maxWidth: 460,
      width: "100%",
      boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
      animation: "pop 0.3s ease",
      position: "relative",
      maxHeight: "90vh",
      overflowY: "auto"
    },
    onClick: e => e.stopPropagation()
  }, React.createElement("button", {
    onClick: () => setShowProModal(false),
    "aria-label": "Close",
    style: {
      position: "absolute",
      top: 14,
      right: 14,
      width: 32,
      height: 32,
      borderRadius: "50%",
      background: "#F1F5F4",
      border: "none",
      color: "#4A5568",
      fontSize: 18,
      lineHeight: 1,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font)"
    }
  }, "\xD7"), React.createElement("div", {
    style: {
      background: `${G}15`,
      borderRadius: var_rl,
      padding: "1.25rem",
      marginBottom: "1.25rem",
      border: `1px solid ${GL}`
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 6
    }
  }, React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 22,
      color: "#0B1220",
      letterSpacing: "-0.5px"
    }
  }, "Beat the Pile Pro"), React.createElement("span", {
    style: {
      marginLeft: "auto",
      background: GL,
      color: G,
      fontSize: 11,
      fontWeight: 700,
      padding: "3px 10px",
      borderRadius: 99
    }
  }, "Beta")), React.createElement("p", {
    style: {
      color: "#4A5568",
      fontSize: 14,
      lineHeight: 1.5
    }
  }, React.createElement("strong", {
    style: {
      color: G
    }
  }, "Free during the beta."), " No card needed. We'll tell you well before anything costs money.")), React.createElement("div", {
    style: {
      background: `#0B1220`,
      borderRadius: var_rl,
      padding: "1.25rem",
      marginBottom: "1.25rem",
      border: `1px solid #2563EB30`
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 8
    }
  }, React.createElement("span", {
    style: {
      fontSize: 22
    }
  }), React.createElement("p", {
    style: {
      fontWeight: 700,
      fontSize: 15,
      color: "#fff",
      letterSpacing: "-0.3px"
    }
  }, "AI Resume Builder"), React.createElement("span", {
    style: {
      marginLeft: "auto",
      background: "#2563EB",
      color: "#fff",
      fontSize: 10,
      fontWeight: 700,
      padding: "2px 9px",
      borderRadius: 99
    }
  }, "PRO")), React.createElement("p", {
    style: {
      fontSize: 13,
      color: "#94A3B8",
      lineHeight: 1.55,
      marginBottom: 10
    }
  }, "Most students applying for internships don't have a resume yet. Pro builds yours from your quiz answers in seconds \u2014 tailored to your major, activities, and skills. Edit it, download it as a PDF, and use it across every application."), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, ["Built from your quiz answers", "Editable in-app", "Download as PDF", "Saves to your profile"].map((t, i) => React.createElement("span", {
    key: i,
    style: {
      fontSize: 11.5,
      fontWeight: 700,
      color: G,
      background: `${G}15`,
      padding: "3px 10px",
      borderRadius: 99
    }
  }, "\u2713 ", t)))), React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12,
      marginBottom: "1.5rem"
    }
  }, [{
    icon: "",
    title: "Unlimited applications",
    desc: "Apply to as many companies as you want — auto-fill + cover letter for each"
  }, {
    icon: "",
    title: "Follow-up reminders",
    desc: "Your dashboard flags each application at the 5-day mark, with a draft email ready for you to send"
  }, {
    icon: "",
    title: "Full dashboard tracker",
    desc: "Every app, interview, offer, deadline, and note in one place"
  }].map((f, i) => React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 12,
      alignItems: "flex-start"
    }
  }, React.createElement("div", {
    "aria-hidden": "true",
    style: {
      width: 20,
      height: 20,
      borderRadius: 6,
      background: GL,
      color: G,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      fontSize: 12,
      fontWeight: 700,
      marginTop: 2
    }
  }, "\u2713"), React.createElement("div", null, React.createElement("p", {
    style: {
      fontWeight: 700,
      fontSize: 13.5,
      color: "#0B1220"
    }
  }, f.title), React.createElement("p", {
    style: {
      fontSize: 12.5,
      color: "#4A5568",
      marginTop: 2,
      lineHeight: 1.45
    }
  }, f.desc))))), React.createElement("button", {
    onClick: () => {
      analytics.track("pro_upgrade_clicked");
      setIsPro(true);
      setShowProModal(false);
      setProNudge(null);
    },
    style: {
      width: "100%",
      background: `${G}`,
      border: "none",
      color: "#fff",
      padding: "15px",
      borderRadius: var_rl,
      cursor: "pointer",
      fontFamily: "var(--font)",
      fontSize: 16,
      fontWeight: 700,
      letterSpacing: "-0.3px",
      boxShadow: "0 1px 2px rgba(11,18,32,.06)"
    }
  }, "Unlock Pro \u2014 free during beta"), React.createElement("p", {
    style: {
      textAlign: "center",
      fontSize: 12,
      color: "#6B7280",
      marginTop: 10
    }
  }, "Unlocks on this device right away. Nothing to pay.")));
  const RoleModalCmp = () => {
    if (!roleModal) return null;
    const cat = EXT_CATS.find(c => c.id === roleModal.catId);
    const act = cat?.options.find(o => o.name === roleModal.actName);
    const current = extPicks.find(x => x.activity === roleModal.actName || x.templateName === roleModal.actName);
    if (!act) return null;
    const isCustom = !!act.custom;
    const canConfirmCustom = !isCustom || customActText.trim().length > 0;
    return React.createElement("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(10,22,40,0.5)",
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        backdropFilter: "blur(3px)"
      },
      onClick: () => {
        setRoleModal(null);
        setCustomActText("");
      }
    }, React.createElement("div", {
      style: {
        background: "#fff",
        borderRadius: var_rxl,
        padding: "2rem",
        maxWidth: 380,
        width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        animation: "pop 0.25s ease"
      },
      onClick: e => e.stopPropagation()
    }, React.createElement("p", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: "#6B7280",
        marginBottom: 8
      }
    }, "Your Role"), React.createElement("h3", {
      style: {
        fontWeight: 700,
        fontSize: 18,
        color: "#0B1220",
        marginBottom: "0.25rem",
        letterSpacing: "-0.3px"
      }
    }, act.name), isCustom ? React.createElement(React.Fragment, null, React.createElement("p", {
      style: {
        color: "#4A5568",
        fontSize: 13,
        marginBottom: 10
      }
    }, "Type the actual name of your activity or organization."), React.createElement("input", {
      type: "text",
      value: customActText,
      onChange: e => setCustomActText(e.target.value),
      placeholder: "e.g. Robotics Club, Class President...",
      maxLength: 60,
      autoFocus: true,
      style: {
        width: "100%",
        padding: "11px 13px",
        borderRadius: var_r,
        border: `1.5px solid ${customActText ? G : "#E2E8F0"}`,
        background: "#FBFBFC",
        color: "#0B1220",
        fontFamily: "var(--font)",
        fontSize: 14,
        outline: "none",
        marginBottom: 14
      }
    })) : React.createElement("p", {
      style: {
        color: "#4A5568",
        fontSize: 13,
        marginBottom: "1.5rem"
      }
    }, "Select your level of involvement."), React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8,
        opacity: canConfirmCustom ? 1 : 0.5,
        pointerEvents: canConfirmCustom ? "auto" : "none"
      }
    }, act.roles.map((role, i) => {
      const isSel = current?.role === role;
      return React.createElement("button", {
        key: role,
        onClick: () => pickRole(roleModal.catId, act.name, role, isCustom ? customActText : undefined),
        disabled: !canConfirmCustom,
        style: {
          padding: "12px 16px",
          borderRadius: var_r,
          border: `1.5px solid ${isSel ? G : "#E2E8F0"}`,
          background: isSel ? GL : "#fff",
          cursor: canConfirmCustom ? "pointer" : "not-allowed",
          fontFamily: "var(--font)",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "all 0.15s"
        }
      }, React.createElement("div", null, React.createElement("span", {
        style: {
          fontWeight: isSel ? 700 : 500,
          fontSize: 14,
          color: isSel ? GD : "#0B1220"
        }
      }, role)), isSel && React.createElement("span", {
        style: {
          fontSize: 16,
          color: G
        }
      }, "\u2713"));
    })), isCustom && !canConfirmCustom && React.createElement("p", {
      style: {
        fontSize: 11.5,
        color: "#6B7280",
        marginTop: 8,
        textAlign: "center"
      }
    }, "Type a name above to continue."), current && React.createElement("button", {
      onClick: () => {
        removeExt(current.activity);
        setRoleModal(null);
        setCustomActText("");
      },
      style: {
        width: "100%",
        marginTop: 12,
        background: "#FFF5F5",
        border: "1px solid #FED7D7",
        color: CR,
        padding: "10px",
        borderRadius: var_r,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 13,
        fontWeight: 600
      }
    }, "Remove this activity")));
  };
  const BIG_NAMES = ["lockheed", "boeing", "northrop", "raytheon", "general dynamics", "tesla", "spacex", "ford", "general motors", "gm", "stellantis", "caterpillar", "john deere", "deere", "3m", "honeywell", "ge", "general electric", "siemens", "abb", "emerson", "parker hannifin", "eaton", "rockwell", "intel", "amd", "nvidia", "apple", "google", "microsoft", "amazon", "meta", "facebook", "oracle", "ibm", "cisco", "qualcomm", "texas instruments", "analog devices", "broadcom", "applied materials", "lam research", "jpmorgan", "goldman", "morgan stanley", "bank of america", "citi", "wells fargo", "blackrock", "fidelity", "vanguard", "american express", "capital one", "mastercard", "visa", "pwc", "deloitte", "ernst", "kpmg", "mckinsey", "bain", "bcg", "accenture", "pfizer", "merck", "johnson", "abbott", "medtronic", "stryker", "bd", "roche", "novartis", "astrazeneca", "gilead", "amgen", "biogen", "moderna", "p&g", "procter", "unilever", "colgate", "kraft", "heinz", "pepsi", "coca-cola", "kellogg", "nestle", "disney", "netflix", "nike", "adidas", "under armour", "target", "walmart", "costco", "home depot", "lowe", "cvs", "walgreens", "fedex", "ups", "exxon", "chevron", "shell", "bp", "conoco", "aecom", "jacobs", "wsp", "kbr", "fluor", "bechtel", "hdr", "stantec"];
  const isLikelyNational = c => {
    if (c.tier === "national") return true;
    const n = (c.name || "").toLowerCase();
    return BIG_NAMES.some(b => n.includes(b));
  };
  const safeHttpUrl = u => typeof u === "string" && /^https?:\/\//i.test(u.trim()) ? u.trim() : null;
  const ApplyModal = () => {
    if (!applyModal) return null;
    const c = applyModal;
    const ready = profileReady();
    const rows = [["Full name", profile.fullName], ["Email", profile.email || email], ["Phone", profile.phone], ["LinkedIn", profile.linkedin], ["Portfolio", profile.portfolio], ["School", profile.school || ans.university], ["Major", profile.major || ans.major], ["Expected graduation", profile.gradDate || ans.gradYear], ["GPA", profile.gpa || ans.gpa], ["Work authorization", profile.workAuth], ["Willing to relocate", profile.relocate]].filter(r => r[1]);
    const allText = rows.map(r => `${r[0]}: ${r[1]}`).join("\n");
    const gated = !canApplyTo(c);
    return React.createElement("div", {
      onClick: () => setApplyModal(null),
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(10,22,40,0.6)",
        zIndex: 400,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "1.5rem 1rem",
        backdropFilter: "blur(4px)",
        overflowY: "auto"
      }
    }, React.createElement("div", {
      onClick: e => e.stopPropagation(),
      style: {
        background: "#fff",
        borderRadius: var_rxl,
        padding: "1.75rem",
        maxWidth: 560,
        width: "100%",
        boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
        animation: "pop 0.25s ease",
        margin: "auto 0"
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 6
      }
    }, React.createElement("div", null, React.createElement("p", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: "#6B7280"
      }
    }, "Assisted Apply"), React.createElement("h3", {
      style: {
        fontWeight: 700,
        fontSize: 20,
        color: "#0B1220",
        letterSpacing: "-0.4px"
      }
    }, c.name), React.createElement("p", {
      style: {
        color: "#4A5568",
        fontSize: 13
      }
    }, c.role)), React.createElement("button", {
      onClick: () => setApplyModal(null),
      style: {
        background: "none",
        border: "none",
        fontSize: 22,
        color: "#6B7280",
        cursor: "pointer",
        lineHeight: 1
      }
    }, "\xD7")), gated ? React.createElement("div", {
      style: {
        background: `${GL}`,
        border: `1px solid ${G}25`,
        borderRadius: var_rl,
        padding: "1.75rem 1.5rem",
        textAlign: "center",
        marginTop: 10
      }
    }, React.createElement("p", {
      style: {
        fontSize: 30,
        marginBottom: 8
      }
    }), React.createElement("p", {
      style: {
        fontWeight: 700,
        fontSize: 18,
        color: "#0B1220",
        marginBottom: 6,
        letterSpacing: "-0.3px"
      }
    }, "You've used your ", FREE_APPLICATIONS, " free applications"), React.createElement("p", {
      style: {
        fontSize: 13.5,
        color: "#4A5568",
        lineHeight: 1.55,
        marginBottom: 16,
        maxWidth: 380,
        margin: "0 auto 16px"
      }
    }, "You applied to ", appliedCos.slice(0, FREE_APPLICATIONS).join(", "), " with Beat the Pile's help. Go Pro for ", React.createElement("strong", null, "unlimited applications"), " \u2014 auto-fill and a tailored cover letter for every job, plus follow-up reminders."), React.createElement("button", {
      onClick: () => {
        setApplyModal(null);
        setShowProModal(true);
      },
      style: {
        background: `${G}`,
        border: "none",
        color: "#fff",
        padding: "13px 30px",
        borderRadius: var_rl,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 15,
        fontWeight: 700,
        boxShadow: "0 1px 2px rgba(11,18,32,.06)"
      }
    }, "Go Pro \u2014 unlimited applications"), React.createElement("p", {
      style: {
        fontSize: 11.5,
        color: "#6B7280",
        marginTop: 12
      }
    }, "You can still open ", c.name, "'s site directly from your matches anytime.")) : React.createElement(React.Fragment, null, safeHttpUrl(c.applyUrl) ? React.createElement(React.Fragment, null, React.createElement("a", {
      href: safeHttpUrl(c.applyUrl),
      target: "_blank",
      rel: "noopener noreferrer",
      onClick: () => track(c),
      style: {
        display: "block",
        textAlign: "center",
        background: `${G}`,
        color: "#fff",
        padding: "13px",
        borderRadius: var_rl,
        fontWeight: 700,
        fontSize: 15,
        textDecoration: "none",
        boxShadow: "0 1px 2px rgba(11,18,32,.06)",
        margin: "10px 0 4px"
      }
    }, "\u2713 Apply to ", c.role || "this role", " at ", c.name, " \u2197"), React.createElement("p", {
      style: {
        fontSize: 11,
        color: GD,
        textAlign: "center",
        fontWeight: 700,
        marginBottom: 10
      }
    }, "Live posting", c.location ? ` · ${c.location}` : "", c.created ? ` · posted ${new Date(c.created).toLocaleDateString()}` : "")) : safeHttpUrl(adzunaLink && adzunaLink.applyUrl) ? React.createElement(React.Fragment, null, React.createElement("a", {
      href: safeHttpUrl(adzunaLink.applyUrl),
      target: "_blank",
      rel: "noopener noreferrer",
      onClick: () => track(c),
      style: {
        display: "block",
        textAlign: "center",
        background: `${G}`,
        color: "#fff",
        padding: "13px",
        borderRadius: var_rl,
        fontWeight: 700,
        fontSize: 15,
        textDecoration: "none",
        boxShadow: "0 1px 2px rgba(11,18,32,.06)",
        margin: "10px 0 4px"
      }
    }, "\u2713 Apply to ", adzunaLink.title || c.role + " at " + c.name, " \u2197"), React.createElement("p", {
      style: {
        fontSize: 11,
        color: GD,
        textAlign: "center",
        fontWeight: 700,
        marginBottom: 10
      }
    }, "Live posting", adzunaLink.location ? ` · ${adzunaLink.location}` : "")) : adzunaLoading ? React.createElement("div", {
      style: {
        background: GL,
        border: `1px solid ${GM}`,
        borderRadius: var_rl,
        padding: "11px",
        textAlign: "center",
        margin: "10px 0"
      }
    }, React.createElement("p", {
      style: {
        fontSize: 13,
        color: GD,
        fontWeight: 700
      }
    }, "Checking for live postings\u2026")) : null, React.createElement("div", {
      style: {
        background: "#FBFBFC",
        border: `1px solid ${GL}`,
        borderRadius: var_rl,
        padding: "12px 14px",
        marginBottom: 14
      }
    }, React.createElement("p", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: "#4A5568",
        marginBottom: 4
      }
    }, "Find this role on"), (() => {
      const isNat = c.tier === "national" || isLikelyNational(c);
      const siteHref = companyWebsiteUrl(c);
      const googleHref = googleSearchUrl(c);
      const btnStyle = {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "9px 8px",
        borderRadius: var_r,
        fontWeight: 700,
        fontSize: 13,
        textDecoration: "none"
      };
      const outline = {
        ...btnStyle,
        background: "#fff",
        color: "#0B1220",
        border: `1.5px solid #E2E8F0`
      };
      if (isNat) {
        return React.createElement(React.Fragment, null, React.createElement("p", {
          style: {
            fontSize: 11.5,
            color: "#6B7280",
            lineHeight: 1.5,
            marginBottom: 9
          }
        }, "Pick whichever you already use."), React.createElement("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6
          }
        }, React.createElement("a", {
          href: linkedinCompanyUrl(c),
          target: "_blank",
          rel: "noopener noreferrer",
          onClick: () => track(c),
          style: {
            ...btnStyle,
            background: "#fff",
            color: "#0A66C2",
            border: `1.5px solid #0A66C2`
          }
        }, "LinkedIn"), React.createElement("a", {
          href: handshakeUrl(c),
          target: "_blank",
          rel: "noopener noreferrer",
          onClick: () => track(c),
          style: outline
        }, "Handshake"), React.createElement("a", {
          href: indeedCompanyUrl(c),
          target: "_blank",
          rel: "noopener noreferrer",
          onClick: () => track(c),
          style: outline
        }, "Indeed"), siteHref ? React.createElement("a", {
          href: siteHref,
          target: "_blank",
          rel: "noopener noreferrer",
          onClick: () => track(c),
          style: outline
        }, "Company site") : React.createElement("a", {
          href: googleHref,
          target: "_blank",
          rel: "noopener noreferrer",
          onClick: () => track(c),
          style: outline
        }, "Google")));
      }
      return React.createElement(React.Fragment, null, React.createElement("p", {
        style: {
          fontSize: 11.5,
          color: "#6B7280",
          lineHeight: 1.5,
          marginBottom: 9
        }
      }, "This is a smaller company \u2014 reach them directly."), React.createElement("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 6
        }
      }, siteHref && React.createElement("a", {
        href: siteHref,
        target: "_blank",
        rel: "noopener noreferrer",
        onClick: () => track(c),
        style: {
          ...btnStyle,
          background: "#fff",
          color: "#0A66C2",
          border: `1.5px solid #0A66C2`
        }
      }, "Company Website"), React.createElement("a", {
        href: googleHref,
        target: "_blank",
        rel: "noopener noreferrer",
        onClick: () => track(c),
        style: outline
      }, "Search on Google")));
    })()), !isPro && React.createElement("p", {
      style: {
        fontSize: 11.5,
        fontWeight: 700,
        color: appsLeft() > 0 ? GD : AM,
        textAlign: "center",
        marginTop: -4,
        marginBottom: 14
      }
    }, appsLeft() > 0 ? `${appsLeft()} free application${appsLeft() !== 1 ? "s" : ""} left` : "Last free application"), !ready ? React.createElement("div", {
      style: {
        background: AL,
        border: `1px solid ${AM}40`,
        borderRadius: var_rl,
        padding: "1.25rem",
        textAlign: "center"
      }
    }, React.createElement("p", {
      style: {
        fontWeight: 700,
        fontSize: 15,
        color: "#0B1220",
        marginBottom: 6
      }
    }, "Finish your profile to auto-fill"), React.createElement("p", {
      style: {
        fontSize: 13,
        color: "#4A5568",
        marginBottom: 12,
        lineHeight: 1.5
      }
    }, "Save your info once and every application gets a copy-paste card plus a tailored cover letter."), React.createElement("button", {
      onClick: () => {
        setApplyModal(null);
        setPage("profile");
      },
      style: {
        background: `${G}`,
        border: "none",
        color: "#fff",
        padding: "11px 22px",
        borderRadius: var_r,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 14,
        fontWeight: 700
      }
    }, "Set up my profile \u2192")) : React.createElement(React.Fragment, null, React.createElement("div", {
      style: {
        border: `1.5px solid ${GL}`,
        borderRadius: var_rl,
        padding: "1rem 1.1rem",
        marginBottom: 14
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10
      }
    }, React.createElement("p", {
      style: {
        fontWeight: 700,
        fontSize: 14,
        color: "#0B1220"
      }
    }, "Your info \u2014 tap any field to copy"), React.createElement("button", {
      onClick: () => copyText(allText, "all"),
      style: {
        background: GL,
        border: `1px solid ${GM}`,
        color: GD,
        padding: "5px 12px",
        borderRadius: 99,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 12,
        fontWeight: 700
      }
    }, copied === "all" ? "✓ Copied all" : "Copy all")), React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
        gap: 6
      }
    }, rows.map((r, i) => React.createElement("button", {
      key: i,
      onClick: () => copyText(r[1], "r" + i),
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        background: "#FBFBFC",
        border: `1px solid ${GL}`,
        borderRadius: var_r,
        padding: "8px 11px",
        cursor: "pointer",
        fontFamily: "var(--font)",
        textAlign: "left"
      }
    }, React.createElement("span", {
      style: {
        minWidth: 0
      }
    }, React.createElement("span", {
      style: {
        display: "block",
        fontSize: 12,
        color: "#6B7280",
        fontWeight: 600
      }
    }, r[0]), React.createElement("span", {
      style: {
        display: "block",
        fontSize: 13,
        color: "#0B1220",
        fontWeight: 600,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, r[1])), React.createElement("span", {
      style: {
        fontSize: 12,
        color: copied === "r" + i ? G : "#6B7280",
        fontWeight: 700,
        flexShrink: 0
      }
    }, copied === "r" + i ? "✓" : "copy"))))), React.createElement("div", {
      style: {
        border: `1.5px solid ${GL}`,
        borderRadius: var_rl,
        padding: "1rem 1.1rem"
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10
      }
    }, React.createElement("p", {
      style: {
        fontWeight: 700,
        fontSize: 14,
        color: "#0B1220"
      }
    }, "Application kit"), kit.company === c.name && kit.coverLetter && !kit.loading && React.createElement("button", {
      onClick: () => generateKit(c),
      style: {
        background: "none",
        border: "none",
        color: GD,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 12,
        fontWeight: 700
      }
    }, "\u21BB Regenerate")), kit.company !== c.name && !kit.loading ? React.createElement(React.Fragment, null, (profile.resumes || []).filter(r => r.text).length > 0 && React.createElement("div", {
      style: {
        marginBottom: 10
      }
    }, React.createElement("label", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: "#4A5568",
        display: "block",
        marginBottom: 5
      }
    }, "Tailor from which resume?"), React.createElement("select", {
      value: chosenResumeId || "",
      onChange: e => setChosenResumeId(e.target.value ? Number(e.target.value) : null),
      style: {
        width: "100%",
        padding: "9px 11px",
        borderRadius: var_r,
        border: `1.5px solid #E2E8F0`,
        background: "#FBFBFC",
        color: "#0B1220",
        fontFamily: "var(--font)",
        fontSize: 13.5,
        outline: "none"
      }
    }, React.createElement("option", {
      value: ""
    }, "Profile info only"), (profile.resumes || []).filter(r => r.text).map(r => React.createElement("option", {
      key: r.id,
      value: r.id
    }, r.name)))), React.createElement("button", {
      onClick: () => generateKit(c),
      style: {
        width: "100%",
        background: "#fff",
        border: `1.5px solid ${G}`,
        color: GD,
        padding: "11px",
        borderRadius: var_r,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 14,
        fontWeight: 700
      }
    }, "Generate a cover letter + tips for this role")) : null, kit.loading && kit.company === c.name && React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 0",
        color: "#4A5568",
        fontSize: 14
      }
    }, React.createElement("div", {
      style: {
        width: 18,
        height: 18,
        border: `3px solid ${GL}`,
        borderTopColor: G,
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite"
      }
    }), " Writing your cover letter\u2026"), kit.company === c.name && kit.coverLetter && !kit.loading && React.createElement(React.Fragment, null, React.createElement("p", {
      style: {
        fontSize: 11.5,
        color: "#6B7280",
        margin: "0 0 6px",
        lineHeight: 1.45
      }
    }, React.createElement("b", null, "Draft"), " written by AI from your profile", chosenResumeId ? " and the resume you picked" : "", ". Edit it here before you paste it anywhere."), React.createElement("div", {
      style: {
        position: "relative",
        marginBottom: 10
      }
    }, React.createElement("textarea", {
      value: kit.coverLetter,
      onChange: e => setKit(k => ({
        ...k,
        coverLetter: e.target.value
      })),
      style: {
        width: "100%",
        minHeight: 160,
        background: "#FBFBFC",
        border: `1px solid ${GL}`,
        borderRadius: var_r,
        padding: "11px 12px",
        fontFamily: "var(--font)",
        fontSize: 13,
        lineHeight: 1.6,
        color: "#0B1220",
        resize: "vertical",
        outline: "none"
      }
    }), React.createElement("button", {
      onClick: () => copyText(kit.coverLetter, "cl"),
      style: {
        position: "absolute",
        top: 8,
        right: 8,
        background: GD,
        border: "none",
        color: "#fff",
        padding: "4px 12px",
        borderRadius: 99,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 11,
        fontWeight: 700
      }
    }, copied === "cl" ? "✓ Copied" : "Copy")), kit.tips && kit.tips.length > 0 && React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 6
      }
    }, kit.tips.map((t, i) => React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        gap: 8,
        fontSize: 12.5,
        color: "#4A5568",
        lineHeight: 1.5
      }
    }, React.createElement("span", {
      style: {
        color: G,
        fontWeight: 700
      }
    }, "\u203A"), React.createElement("span", null, t))))))))));
  };
  const ReviewPanel = () => {
    if (!showReview) return null;
    const icons = {
      university: "",
      gradYear: "",
      targetTerm: "",
      major: "",
      gpa: "",
      extracurriculars: "",
      skills: "",
      type: "",
      zip: "",
      radius: ""
    };
    return React.createElement("div", {
      onClick: () => setShowReview(false),
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(10,22,40,0.6)",
        zIndex: 380,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "1.5rem 1rem",
        backdropFilter: "blur(4px)",
        overflowY: "auto"
      }
    }, React.createElement("div", {
      onClick: e => e.stopPropagation(),
      style: {
        background: "#fff",
        borderRadius: var_rxl,
        padding: "1.75rem",
        maxWidth: 540,
        width: "100%",
        boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
        animation: "pop 0.25s ease",
        margin: "auto 0"
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 6
      }
    }, React.createElement("div", null, React.createElement("p", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: "#6B7280"
      }
    }, "Your Answers"), React.createElement("h3", {
      style: {
        fontWeight: 700,
        fontSize: 20,
        color: "#0B1220",
        letterSpacing: "-0.4px"
      }
    }, "Tap any answer to change it"), React.createElement("p", {
      style: {
        color: "#4A5568",
        fontSize: 13,
        marginTop: 2
      }
    }, "Update one thing and we'll instantly recalculate \u2014 no need to redo the quiz.")), React.createElement("button", {
      onClick: () => setShowReview(false),
      style: {
        background: "none",
        border: "none",
        fontSize: 22,
        color: "#6B7280",
        cursor: "pointer",
        lineHeight: 1
      }
    }, "\xD7")), React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 7,
        marginTop: 14
      }
    }, STEPS.map((s, i) => React.createElement("button", {
      key: s.key,
      onClick: () => editQuestion(i),
      className: "card-hover",
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "#FBFBFC",
        border: `1.5px solid ${GL}`,
        borderRadius: var_rl,
        padding: "12px 14px",
        cursor: "pointer",
        fontFamily: "var(--font)",
        textAlign: "left",
        width: "100%"
      }
    }, React.createElement("span", {
      style: {
        fontSize: 18,
        flexShrink: 0
      }
    }, icons[s.key] || "•"), React.createElement("span", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, React.createElement("span", {
      style: {
        display: "block",
        fontSize: 11,
        color: "#6B7280",
        fontWeight: 700
      }
    }, s.label), React.createElement("span", {
      style: {
        display: "block",
        fontSize: 14,
        color: "#0B1220",
        fontWeight: 600,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, answerLabel(s.key))), React.createElement("span", {
      style: {
        color: GD,
        fontSize: 13,
        fontWeight: 700,
        flexShrink: 0
      }
    }, "Change \u203A"))))));
  };
  const NudgeToast = () => {
    if (!proNudge) return null;
    const msg = {
      welcome_back: "Welcome back. Want reminders when each follow-up is due, with the email drafted for you?",
      followups: `You're tracking ${tracked.length} applications — Beat the Pile can remind you when each is due for a follow-up and draft it for you.`
    }[proNudge.reason] || "Unlock more with Pro.";
    return React.createElement("div", {
      style: {
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 16,
        zIndex: 350,
        display: "flex",
        justifyContent: "center",
        padding: "0 1rem",
        pointerEvents: "none"
      }
    }, React.createElement("div", {
      style: {
        pointerEvents: "auto",
        background: "#0B1220",
        color: "#fff",
        borderRadius: var_rl,
        padding: "13px 14px 13px 16px",
        maxWidth: 440,
        width: "100%",
        boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        animation: "fadeUp 0.3s ease"
      }
    }, React.createElement("span", {
      style: {
        fontSize: 13.5,
        lineHeight: 1.4,
        flex: 1
      }
    }, msg), React.createElement("button", {
      onClick: () => {
        setProNudge(null);
        setShowProModal(true);
      },
      style: {
        background: G,
        border: "none",
        color: "#fff",
        padding: "8px 14px",
        borderRadius: var_r,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: "nowrap"
      }
    }, "See Pro"), React.createElement("button", {
      onClick: () => {
        analytics.track("nudge_dismissed", {
          reason: proNudge.reason
        });
        setProNudge(null);
      },
      style: {
        background: "none",
        border: "none",
        color: "#6B7280",
        cursor: "pointer",
        fontSize: 18,
        lineHeight: 1
      }
    }, "\xD7")));
  };
  const SignInModal = () => {
    if (!showSignInModal) return null;
    return React.createElement("div", {
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(10,22,40,0.55)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem"
      },
      onClick: e => {
        if (e.target === e.currentTarget) {
          setShowSignInModal(false);
        }
      }
    }, React.createElement("div", {
      style: {
        background: "#fff",
        borderRadius: var_rl,
        padding: "1.5rem 1.25rem",
        maxWidth: 440,
        width: "100%",
        maxHeight: "92vh",
        overflow: "auto",
        position: "relative"
      }
    }, React.createElement("button", {
      onClick: () => setShowSignInModal(false),
      style: {
        position: "absolute",
        top: 10,
        right: 10,
        background: "#F1F5F9",
        border: "none",
        width: 32,
        height: 32,
        borderRadius: "50%",
        cursor: "pointer",
        fontSize: 16,
        fontWeight: 700,
        color: "#4A5568",
        lineHeight: 1
      }
    }, "\xD7"), React.createElement("div", {
      style: {
        textAlign: "center",
        marginBottom: 12
      }
    }, React.createElement("p", {
      style: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: 600
      }
    }, "Save your progress"), React.createElement("h3", {
      style: {
        fontSize: 20,
        fontWeight: 700,
        color: "#0B1220",
        margin: "4px 0 6px"
      }
    }, "Sign in to Beat the Pile"), React.createElement("p", {
      style: {
        fontSize: 12.5,
        color: "#4A5568",
        lineHeight: 1.5
      }
    }, "Your tracker, profile, and resumes sync across all your devices. Sign in once \u2014 pick up where you left off anywhere.")), React.createElement("div", {
      id: "clerk-signin-mount",
      style: {
        minHeight: 380
      }
    })));
  };
  const FollowUpsDueBanner = () => {
    const dueApps = tracked.filter(a => followUpStatus(a).state === "due");
    if (dueApps.length === 0) return null;
    return React.createElement("div", {
      onClick: () => setPage("dashboard"),
      style: {
        background: "#FEF3C7",
        border: "1px solid #F59E0B",
        borderRadius: var_rl,
        padding: "12px 16px",
        marginBottom: 18,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 2px 8px rgba(245,158,11,0.15)"
      }
    }, React.createElement("div", {
      style: {
        fontSize: 22,
        flexShrink: 0
      }
    }), React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, React.createElement("p", {
      style: {
        fontSize: 13.5,
        fontWeight: 700,
        color: "#92400E",
        marginBottom: 2
      }
    }, dueApps.length, " follow-up", dueApps.length === 1 ? "" : "s", " due"), React.createElement("p", {
      style: {
        fontSize: 12,
        color: "#78350F",
        lineHeight: 1.4
      }
    }, dueApps.slice(0, 3).map(a => a.company).join(", "), dueApps.length > 3 ? ` +${dueApps.length - 3} more` : "", " \u2014 tap to draft them.")), React.createElement("div", {
      style: {
        fontSize: 14,
        color: "#92400E",
        fontWeight: 700,
        flexShrink: 0
      }
    }, "\u2192"));
  };
  const FollowUpModal = () => {
    if (!followUpModal) return null;
    const a = followUpModal;
    return React.createElement("div", {
      onClick: () => setFollowUpModal(null),
      style: {
        position: "fixed",
        inset: 0,
        background: "rgba(10,22,40,0.6)",
        zIndex: 400,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "1.5rem 1rem",
        backdropFilter: "blur(4px)",
        overflowY: "auto"
      }
    }, React.createElement("div", {
      onClick: e => e.stopPropagation(),
      style: {
        background: "#fff",
        borderRadius: var_rxl,
        padding: "1.75rem",
        maxWidth: 560,
        width: "100%",
        boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
        animation: "pop 0.25s ease",
        margin: "auto 0"
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 6
      }
    }, React.createElement("div", null, React.createElement("p", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: "#6B7280"
      }
    }, "Follow-up email"), React.createElement("h3", {
      style: {
        fontWeight: 700,
        fontSize: 20,
        color: "#0B1220",
        letterSpacing: "-0.4px"
      }
    }, a.company), React.createElement("p", {
      style: {
        color: "#4A5568",
        fontSize: 13
      }
    }, a.role)), React.createElement("button", {
      onClick: () => setFollowUpModal(null),
      style: {
        background: "none",
        border: "none",
        fontSize: 22,
        color: "#6B7280",
        cursor: "pointer",
        lineHeight: 1
      }
    }, "\xD7")), React.createElement("div", {
      style: {
        background: GL,
        border: `1px solid ${GM}`,
        borderRadius: var_r,
        padding: "10px 12px",
        margin: "10px 0 14px",
        fontSize: 12.5,
        color: GD,
        lineHeight: 1.5
      }
    }, "You send this from your own email, as yourself \u2014 that's what makes a follow-up work. We just handle the timing and the first draft."), kit.loading && kit.company === a.company ? React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "20px 0",
        color: "#4A5568",
        fontSize: 14
      }
    }, React.createElement("div", {
      style: {
        width: 18,
        height: 18,
        border: `3px solid ${GL}`,
        borderTopColor: G,
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite"
      }
    }), " Drafting your follow-up\u2026") : kit.company === a.company && kit.coverLetter ? React.createElement(React.Fragment, null, React.createElement("p", {
      style: {
        fontSize: 11.5,
        color: "#6B7280",
        margin: "0 0 6px",
        lineHeight: 1.45
      }
    }, React.createElement("b", null, "Draft"), " \u2014 edit it before you send. Nothing is sent for you."), React.createElement("div", {
      style: {
        position: "relative",
        marginBottom: 10
      }
    }, React.createElement("textarea", {
      value: kit.coverLetter,
      onChange: e => setKit(k => ({
        ...k,
        coverLetter: e.target.value
      })),
      style: {
        width: "100%",
        minHeight: 200,
        background: "#FBFBFC",
        border: `1px solid ${GL}`,
        borderRadius: var_r,
        padding: "12px",
        fontFamily: "var(--font)",
        fontSize: 13,
        lineHeight: 1.6,
        color: "#0B1220",
        resize: "vertical",
        outline: "none"
      }
    }), React.createElement("button", {
      onClick: () => copyText(kit.coverLetter, "fu"),
      style: {
        position: "absolute",
        top: 8,
        right: 8,
        background: GD,
        border: "none",
        color: "#fff",
        padding: "5px 14px",
        borderRadius: 99,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 11,
        fontWeight: 700
      }
    }, copied === "fu" ? "✓ Copied" : "Copy")), (() => {
      const subjMatch = (kit.coverLetter || "").match(/^Subject:\s*(.+)$/m);
      const subject = subjMatch ? subjMatch[1].trim() : `Following up — ${a.role} application`;
      const body = (kit.coverLetter || "").replace(/^Subject:\s*.+\n?/m, "").trim();
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      return React.createElement("a", {
        href: mailtoUrl,
        style: {
          display: "block",
          textAlign: "center",
          background: "#fff",
          border: `1.5px solid ${G}`,
          color: GD,
          padding: "10px",
          borderRadius: var_r,
          fontFamily: "var(--font)",
          fontSize: 13.5,
          fontWeight: 700,
          textDecoration: "none",
          marginBottom: 14
        }
      }, "Open in email app");
    })(), kit.tips && kit.tips.length > 0 && React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
        marginBottom: 14
      }
    }, kit.tips.map((t, i) => React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        gap: 8,
        fontSize: 12.5,
        color: "#4A5568",
        lineHeight: 1.5
      }
    }, React.createElement("span", {
      style: {
        color: G,
        fontWeight: 700
      }
    }, "\u203A"), React.createElement("span", null, t)))), React.createElement("button", {
      onClick: () => {
        markFollowedUp(a.company);
        setFollowUpModal(null);
      },
      style: {
        width: "100%",
        background: `${G}`,
        border: "none",
        color: "#fff",
        padding: "13px",
        borderRadius: var_rl,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 14.5,
        fontWeight: 700,
        boxShadow: "0 1px 2px rgba(11,18,32,.06)"
      }
    }, "I sent it \u2014 mark as followed up \u2713")) : null));
  };
  const Nav = () => {
    const slot = typeof document !== "undefined" ? document.getElementById("btpRight") : null;
    const acct = clerkUser ? React.createElement("button", {
      onClick: () => {
        window.location.href = "/u/";
      },
      title: clerkUser.primaryEmailAddress?.emailAddress || "Account",
      "aria-label": "Your profile",
      style: {
        background: "#2FBF8A",
        border: "none",
        color: "#0B1220",
        width: 30,
        height: 30,
        borderRadius: 8,
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 700,
        fontFamily: "inherit"
      }
    }, (clerkUser.firstName || clerkUser.primaryEmailAddress?.emailAddress || "U").charAt(0).toUpperCase()) : React.createElement("button", {
      onClick: openSignIn,
      style: {
        background: "#2FBF8A",
        border: "1px solid #2FBF8A",
        color: "#0B1220",
        padding: "6px 12px",
        borderRadius: 7,
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "inherit",
        whiteSpace: "nowrap"
      }
    }, "Sign in");
    return React.createElement(React.Fragment, null, slot ? ReactDOM.createPortal(acct, slot) : null, saveNote && React.createElement("div", {
      role: "status",
      style: {
        position: "fixed",
        left: "50%",
        bottom: 22,
        transform: "translateX(-50%)",
        background: "#0B1220",
        color: "#fff",
        padding: "10px 16px",
        borderRadius: 10,
        fontSize: 13.5,
        fontWeight: 500,
        zIndex: 2000,
        maxWidth: "90vw",
        boxShadow: "0 6px 20px rgba(0,0,0,.25)"
      }
    }, saveNote));
  };
  if (page === "interview") {
    const lastApp = (tracked || []).slice(-1)[0];
    return React.createElement("div", {
      style: {
        background: "#EEF1F6",
        minHeight: "100vh"
      }
    }, React.createElement(Nav, null), React.createElement(InterviewSim, {
      major: ans.major || profile.major || "",
      defaultCompany: (() => {
        try {
          return new URLSearchParams(location.search).get("company") || "";
        } catch (e) {
          return "";
        }
      })().slice(0, 100) || lastApp?.company || "",
      defaultRole: lastApp?.role || ""
    }));
  }
  if (page === "landing") return React.createElement("div", {
    style: {
      background: "#EEF1F6",
      minHeight: "100vh"
    }
  }, showProModal && React.createElement(ProModal, null), React.createElement(SignInModal, null), React.createElement(Nav, null), React.createElement(LandingD, {
    onQuiz: () => {
      setStep(0);
      setPage("quiz");
    },
    onPage: setPage
  }));
  if (page === "quiz") {
    const answered = Object.entries(ans).filter(([k, v]) => {
      if (k === "extracurriculars") return extPicks.length > 0;
      if (Array.isArray(v)) return v.length > 0;
      return !!v && v !== 50;
    }).length;
    return React.createElement("div", {
      style: {
        background: "#fff",
        minHeight: "100vh"
      }
    }, showProModal && React.createElement(ProModal, null), React.createElement(SignInModal, null), roleModal && React.createElement(RoleModalCmp, null), React.createElement(Nav, null), React.createElement("div", {
      style: {
        background: GL,
        height: 4
      }
    }, React.createElement("div", {
      style: {
        height: "100%",
        background: `${G}`,
        width: `${step / STEPS.length * 100}%`,
        transition: "width 0.5s ease",
        borderRadius: "0 99px 99px 0"
      }
    })), React.createElement("div", {
      style: {
        background: "#FBFBFC",
        borderBottom: `1px solid ${GL}`,
        padding: "0.6rem 1.5rem",
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: GD,
        whiteSpace: "nowrap"
      }
    }, "Profile Strength"), React.createElement("div", {
      style: {
        flex: 1,
        background: GL,
        borderRadius: 99,
        height: 6,
        overflow: "hidden"
      }
    }, React.createElement("div", {
      style: {
        width: `${profilePct}%`,
        height: "100%",
        background: `${G}`,
        borderRadius: 99,
        transition: "width 0.6s ease"
      }
    })), React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: GD,
        minWidth: 32
      }
    }, profilePct, "%")), React.createElement("div", {
      style: {
        maxWidth: 540,
        margin: "0 auto",
        padding: "2.5rem 1.5rem"
      }
    }, editStep !== null ? React.createElement("p", {
      style: {
        fontSize: 12,
        color: GD,
        fontWeight: 600,
        marginBottom: "0.4rem"
      }
    }, "Editing one answer") : React.createElement("p", {
      style: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: 600,
        marginBottom: "0.4rem"
      }
    }, "Step ", step + 1, " of ", STEPS.length), React.createElement("h2", {
      className: "fade-up",
      key: step,
      style: {
        fontSize: "clamp(1.4rem,3vw,2rem)",
        fontWeight: 700,
        letterSpacing: "-0.8px",
        marginBottom: "0.5rem",
        lineHeight: 1.2,
        color: "#0B1220"
      }
    }, cur.label), STEP_HINTS[cur.key] && React.createElement("p", {
      style: {
        fontSize: 13,
        color: "#4A5568",
        marginBottom: "1.75rem",
        lineHeight: 1.5,
        padding: "8px 12px",
        background: "#FBFBFC",
        borderRadius: var_r,
        border: `1px solid ${GL}`
      }
    }, STEP_HINTS[cur.key]), cur.type === "search" && (() => {
      const picked = cur.multi ? (ans[cur.key] || "").split(",").map(s => s.trim()).filter(Boolean) : [];
      const showList = !cur.multi || picked.length === 0 || addingMore;
      const atMax = cur.multi && cur.maxPicks && picked.length >= cur.maxPicks;
      return React.createElement("div", {
        className: "fade-up"
      }, cur.multi && picked.length > 0 && React.createElement("div", {
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 10
        }
      }, picked.map(p => React.createElement("div", {
        key: p,
        style: {
          background: GL,
          border: `1px solid ${G}`,
          color: GD,
          padding: "7px 10px 7px 13px",
          borderRadius: 99,
          fontFamily: "var(--font)",
          fontSize: 13,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 7
        }
      }, React.createElement("span", {
        style: {
          color: G
        }
      }, "\u2713"), p, React.createElement("button", {
        onClick: () => {
          const next = picked.filter(x => x !== p).join(", ");
          setAns(prev => ({
            ...prev,
            [cur.key]: next
          }));
        },
        style: {
          background: "none",
          border: "none",
          color: GD,
          cursor: "pointer",
          fontSize: 13,
          padding: 0,
          marginLeft: 2,
          opacity: 0.6
        },
        "aria-label": "Remove"
      }, "\u2715")))), !cur.multi && ans[cur.key] && React.createElement("div", {
        style: {
          background: GL,
          border: `1px solid ${GM}`,
          borderRadius: var_r,
          padding: "10px 14px",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 8
        }
      }, React.createElement("span", {
        style: {
          color: G,
          fontWeight: 700
        }
      }, "\u2713"), React.createElement("span", {
        style: {
          fontSize: 14,
          fontWeight: 600,
          color: GD
        }
      }, ans[cur.key]), React.createElement("button", {
        onClick: () => setAns(p => ({
          ...p,
          [cur.key]: ""
        })),
        style: {
          marginLeft: "auto",
          background: "none",
          border: "none",
          color: GD,
          cursor: "pointer",
          fontSize: 12,
          fontFamily: "var(--font)",
          fontWeight: 600
        }
      }, "change")), showList && React.createElement(React.Fragment, null, React.createElement("div", {
        style: {
          position: "relative",
          marginBottom: 8
        }
      }, React.createElement("span", {
        style: {
          position: "absolute",
          left: 13,
          top: "50%",
          transform: "translateY(-50%)",
          fontSize: 16
        }
      }), React.createElement("input", {
        type: "text",
        value: searchQ,
        onChange: e => setSearchQ(e.target.value),
        placeholder: "Start typing...",
        autoFocus: true,
        style: {
          width: "100%",
          padding: "13px 14px 13px 42px",
          borderRadius: var_rl,
          border: `1.5px solid ${searchQ ? G : "#E2E8F0"}`,
          background: "#FBFBFC",
          color: "#0B1220",
          fontFamily: "var(--font)",
          fontSize: 15,
          outline: "none",
          transition: "border-color 0.2s"
        }
      })), React.createElement("div", {
        style: {
          maxHeight: 300,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 5
        }
      }, cur.options.filter(o => cur.key === "university" ? schoolMatches(o, searchQ) : o.toLowerCase().includes(searchQ.toLowerCase())).map(o => {
        if (cur.multi) {
          const isPicked = picked.includes(o);
          return React.createElement("button", {
            key: o,
            disabled: isPicked || atMax,
            onClick: () => {
              if (isPicked || atMax) return;
              const next = [...picked, o];
              setAns(prev => ({
                ...prev,
                [cur.key]: next.join(", ")
              }));
              setSearchQ("");
              setAddingMore(false);
              const wasFirstPick = picked.length === 0 && !addingMore && editStep === null;
              if (wasFirstPick) {
                setTimeout(() => {
                  const ni = nextStepIndex(step);
                  if (ni >= 0) setStep(ni);else setPage("emailgate");
                }, 250);
              }
            },
            style: {
              background: isPicked ? GL : "#fff",
              border: `1.5px solid ${isPicked ? G : "#E2E8F0"}`,
              color: isPicked ? GD : "#0B1220",
              padding: "11px 14px",
              borderRadius: var_r,
              cursor: isPicked || atMax ? "not-allowed" : "pointer",
              fontFamily: "var(--font)",
              fontSize: 14,
              textAlign: "left",
              transition: "all 0.1s",
              opacity: isPicked || atMax ? 0.55 : 1
            }
          }, isPicked ? "✓ Already picked · " : "", o);
        }
        return React.createElement("button", {
          key: o,
          onClick: () => setA(cur.key, o, true),
          style: {
            background: ans[cur.key] === o ? GL : "#fff",
            border: `1.5px solid ${ans[cur.key] === o ? G : "#E2E8F0"}`,
            color: ans[cur.key] === o ? GD : "#0B1220",
            padding: "11px 14px",
            borderRadius: var_r,
            cursor: "pointer",
            fontFamily: "var(--font)",
            fontSize: 14,
            textAlign: "left",
            transition: "all 0.1s"
          }
        }, ans[cur.key] === o && "✓ ", o);
      })), cur.multi && addingMore && React.createElement("button", {
        onClick: () => setAddingMore(false),
        style: {
          marginTop: 10,
          background: "none",
          border: "none",
          color: "#6B7280",
          fontSize: 12.5,
          cursor: "pointer",
          fontFamily: "var(--font)",
          padding: 0
        }
      }, "\u2190 Done adding")), cur.multi && picked.length > 0 && !addingMore && !atMax && React.createElement("button", {
        onClick: () => {
          setAddingMore(true);
          setSearchQ("");
        },
        style: {
          background: "none",
          border: `1.5px dashed #CBD5E1`,
          color: "#4A5568",
          padding: "9px 14px",
          borderRadius: var_r,
          cursor: "pointer",
          fontFamily: "var(--font)",
          fontSize: 13,
          fontWeight: 600,
          marginTop: 4,
          width: "100%",
          textAlign: "center"
        }
      }, "+ Add another major ", React.createElement("span", {
        style: {
          color: "#6B7280",
          fontWeight: 500,
          marginLeft: 4
        }
      }, "(optional)")), cur.multi && atMax && !addingMore && React.createElement("p", {
        style: {
          fontSize: 11,
          color: "#6B7280",
          textAlign: "center",
          marginTop: 6
        }
      }, "Max of ", cur.maxPicks, " reached \u2014 remove one to add another."));
    })(), cur.type === "chips" && React.createElement("div", {
      className: "fade-up"
    }, cur.subLabel && React.createElement("p", {
      style: {
        fontSize: 13,
        color: "#4A5568",
        lineHeight: 1.5,
        marginBottom: 12
      }
    }, cur.subLabel), React.createElement("div", {
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap: 8
      }
    }, cur.options.map((o, i) => {
      const c = PALETTE[i % PALETTE.length];
      const sel = ans[cur.key] === o;
      return React.createElement("button", {
        key: o,
        onClick: () => setA(cur.key, o, true),
        style: {
          background: sel ? c : "#fff",
          border: `1.5px solid ${sel ? c : "#E2E8F0"}`,
          color: sel ? "#fff" : "#0B1220",
          padding: "10px 20px",
          borderRadius: 99,
          cursor: "pointer",
          fontFamily: "var(--font)",
          fontSize: 14,
          fontWeight: sel ? 700 : 400,
          transition: "all 0.18s",
          boxShadow: sel ? `0 2px 10px ${c}40` : "none"
        }
      }, o);
    }))), cur.type === "extracurricular" && React.createElement("div", {
      className: "fade-up"
    }, extPicks.length > 0 && React.createElement("div", {
      style: {
        marginBottom: 12,
        padding: "10px 14px",
        background: GL,
        borderRadius: var_r,
        border: `1px solid ${GM}`
      }
    }, React.createElement("p", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        color: GD,
        marginBottom: 8
      }
    }, "Selected (", extPicks.length, ")"), React.createElement("div", {
      style: {
        display: "flex",
        flexWrap: "wrap",
        gap: 6
      }
    }, extPicks.map(ep => React.createElement("button", {
      key: ep.activity,
      onClick: () => {
        setRoleModal({
          catId: ep.catId,
          actName: ep.templateName || ep.activity
        });
        setCustomActText(ep.templateName ? ep.activity : "");
      },
      style: {
        background: "#fff",
        border: `1.5px solid ${G}`,
        color: GD,
        padding: "4px 10px",
        borderRadius: 99,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 12,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 6
      }
    }, ep.activity, " ", React.createElement("span", {
      style: {
        background: G,
        color: "#fff",
        padding: "0px 6px",
        borderRadius: 99,
        fontSize: 10
      }
    }, ep.role))))), React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8
      }
    }, EXT_CATS.map(cat => {
      const catSelected = extPicks.filter(x => x.catId === cat.id);
      const isExp = expandedExt === cat.id;
      return React.createElement("div", {
        key: cat.id,
        style: {
          borderRadius: var_rl,
          overflow: "hidden",
          border: `1.5px solid ${catSelected.length > 0 ? cat.color : "#E2E8F0"}`,
          transition: "border-color 0.2s"
        }
      }, React.createElement("button", {
        onClick: () => setExpandedExt(isExp ? null : cat.id),
        style: {
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "13px 16px",
          background: catSelected.length > 0 ? `${cat.color}10` : "#FBFBFC",
          cursor: "pointer",
          fontFamily: "var(--font)",
          border: "none"
        }
      }, React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 10
        }
      }, React.createElement("span", {
        style: {
          fontWeight: 700,
          fontSize: 14,
          color: "#0B1220"
        }
      }, cat.label), catSelected.length > 0 && React.createElement("span", {
        style: {
          background: cat.color,
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          padding: "2px 9px",
          borderRadius: 99
        }
      }, catSelected.length)), React.createElement("span", {
        style: {
          color: "#6B7280",
          fontSize: 13,
          fontWeight: 600
        }
      }, isExp ? "▲" : "▼")), isExp && React.createElement("div", {
        style: {
          padding: "0.75rem",
          background: "#fff",
          borderTop: `1px solid ${cat.color}20`
        }
      }, React.createElement("p", {
        style: {
          fontSize: 12,
          color: "#6B7280",
          fontWeight: 600,
          marginBottom: 8
        }
      }, "Tap to select role \u2192"), React.createElement("div", {
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: 7
        }
      }, cat.options.map(opt => {
        const picked = extPicks.find(x => x.activity === opt.name);
        return React.createElement("button", {
          key: opt.name,
          onClick: () => {
            setRoleModal({
              catId: cat.id,
              actName: opt.name
            });
            setCustomActText("");
          },
          style: {
            background: picked ? cat.color : "#fff",
            border: `1.5px solid ${picked ? cat.color : "#E2E8F0"}`,
            color: picked ? "#fff" : "#0B1220",
            padding: "8px 14px",
            borderRadius: 99,
            cursor: "pointer",
            fontFamily: "var(--font)",
            fontSize: 13,
            fontWeight: picked ? 700 : 400,
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "all 0.15s"
          }
        }, picked && "✓ ", opt.name, picked && React.createElement("span", {
          style: {
            background: "rgba(255,255,255,0.25)",
            padding: "0px 6px",
            borderRadius: 99,
            fontSize: 10
          }
        }, picked.role));
      }))));
    })), extPicks.length > 0 && React.createElement("p", {
      style: {
        fontSize: 13,
        color: GD,
        fontWeight: 700,
        marginTop: 10
      }
    }, "\u2713 ", extPicks.length, " activit", extPicks.length === 1 ? "y" : "ies", " selected")), cur.type === "multi" && React.createElement("div", {
      className: "fade-up"
    }, React.createElement(SkillPicker, {
      options: skillsForMajor(ans.major),
      value: ans.skills,
      onToggle: toggleSkill,
      major: ans.major
    })), cur.type === "resume" && React.createElement("div", {
      className: "fade-up"
    }, React.createElement("p", {
      style: {
        fontSize: 13.5,
        color: "#4A5568",
        lineHeight: 1.55,
        marginBottom: 14
      }
    }, React.createElement("strong", null, "Totally optional."), " If you already have a resume, dropping it in here lets us personalize every match with reasons tied to your actual background. If you don't \u2014 no worries, we'll help you build one after the quiz."), React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        marginBottom: 12
      }
    }, React.createElement("label", {
      style: {
        flex: "1 1 auto",
        background: `${G}`,
        color: "#fff",
        padding: "12px 16px",
        borderRadius: var_r,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 14,
        fontWeight: 700,
        textAlign: "center",
        boxShadow: "0 1px 2px rgba(11,18,32,.06)"
      }
    }, "Upload file (PDF, DOCX, TXT)", React.createElement("input", {
      type: "file",
      accept: ".pdf,.txt,.docx",
      onChange: e => {
        handleQuizResumeUpload(e.target.files);
        e.target.value = "";
      },
      style: {
        display: "none"
      }
    })), (profile.resumes || []).filter(r => r.text).length > 0 && React.createElement("button", {
      onClick: () => {
        const r = (profile.resumes || []).find(x => x.text);
        if (r) setA("resume", r.text);
      },
      style: {
        flex: "0 1 auto",
        background: "#fff",
        border: `1.5px solid ${GM}`,
        color: GD,
        padding: "12px 16px",
        borderRadius: var_r,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 13.5,
        fontWeight: 700,
        whiteSpace: "nowrap"
      }
    }, "\u21B3 Use saved resume")), resumeUploading && React.createElement("p", {
      style: {
        fontSize: 12,
        color: GD,
        fontWeight: 600,
        marginBottom: 8
      }
    }, "Reading file\u2026"), resumeUploadErr && React.createElement("p", {
      style: {
        fontSize: 12,
        color: CR,
        marginBottom: 8
      }
    }, resumeUploadErr), React.createElement("p", {
      style: {
        fontSize: 12,
        color: "#6B7280",
        margin: "10px 0",
        textAlign: "center"
      }
    }, "\u2014 or paste it below \u2014"), React.createElement("textarea", {
      value: ans.resume || "",
      onChange: e => setA("resume", e.target.value),
      placeholder: "Paste your resume text here\u2026",
      style: {
        width: "100%",
        minHeight: 170,
        padding: "12px 14px",
        borderRadius: var_rl,
        border: `1.5px solid ${(ans.resume || "").length > 40 ? G : "#E2E8F0"}`,
        background: "#FBFBFC",
        color: "#0B1220",
        fontFamily: "var(--font)",
        fontSize: 13.5,
        lineHeight: 1.5,
        outline: "none",
        resize: "vertical",
        transition: "border-color 0.2s"
      }
    }), (ans.resume || "").length > 40 && React.createElement("p", {
      style: {
        fontSize: 13,
        color: GD,
        fontWeight: 700,
        marginTop: 8
      }
    }, "\u2713 Got your resume (", (ans.resume || "").length.toLocaleString(), " chars) \u2014 we'll use it to tailor your matches"), (ans.resume || "").length <= 40 && React.createElement("div", {
      style: {
        marginTop: 18,
        padding: "14px 16px",
        background: "#F8FAFC",
        border: "1px dashed #CBD5E1",
        borderRadius: var_rl
      }
    }, React.createElement("p", {
      style: {
        fontSize: 13,
        color: "#0B1220",
        fontWeight: 700,
        marginBottom: 4
      }
    }, "Don't have a resume yet?"), React.createElement("p", {
      style: {
        fontSize: 12.5,
        color: "#4A5568",
        lineHeight: 1.5,
        marginBottom: 10
      }
    }, "That's fine \u2014 most freshmen and sophomores don't. We'll help you build a starter resume from your quiz answers right after."), React.createElement("button", {
      onClick: () => {
        setAns(p => ({
          ...p,
          needsResumeBuilder: true
        }));
        setTimeout(() => {
          const ni = nextStepIndex(step);
          if (ni >= 0) setStep(ni);else setPage("emailgate");
        }, 150);
      },
      style: {
        background: "#fff",
        border: `1.5px solid ${G}`,
        color: GD,
        padding: "9px 14px",
        borderRadius: var_r,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 13,
        fontWeight: 700,
        width: "100%"
      }
    }, "Skip \u2014 I don't have one yet \u2192"))), cur.type === "zip" && React.createElement("div", {
      className: "fade-up"
    }, React.createElement("input", {
      type: "text",
      inputMode: "numeric",
      maxLength: 5,
      value: ans.zip,
      onChange: e => setA("zip", e.target.value.replace(/\D/g, "")),
      placeholder: "19006",
      autoFocus: true,
      style: {
        width: "100%",
        fontSize: 36,
        fontWeight: 700,
        padding: "18px",
        borderRadius: var_rl,
        border: `2px solid ${/^\d{5}$/.test(ans.zip) ? G : "#E2E8F0"}`,
        background: "#FBFBFC",
        color: "#0B1220",
        fontFamily: "var(--font)",
        outline: "none",
        letterSpacing: 10,
        textAlign: "center",
        transition: "border-color 0.2s"
      }
    }), /^\d{5}$/.test(ans.zip) && React.createElement("p", {
      style: {
        fontSize: 14,
        color: GD,
        fontWeight: 700,
        marginTop: 10,
        textAlign: "center"
      }
    }, "\u2713 Got it"), !/^\d{5}$/.test(ans.zip) && React.createElement("p", {
      style: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 10,
        textAlign: "center"
      }
    }, "We use this to factor location into your matches")), cur.type === "slider" && React.createElement("div", {
      className: "fade-up"
    }, React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "1rem"
      }
    }, React.createElement("span", {
      style: {
        color: "#4A5568",
        fontSize: 15,
        fontWeight: 600
      }
    }, "Search radius"), React.createElement("span", {
      style: {
        fontWeight: 700,
        color: G,
        fontSize: 20,
        letterSpacing: "-0.5px"
      }
    }, ans.radius, " mi")), React.createElement("input", {
      type: "range",
      min: 10,
      max: 200,
      step: 5,
      value: ans.radius,
      onChange: e => setA("radius", +e.target.value),
      style: {
        width: "100%",
        accentColor: G,
        height: 6,
        cursor: "pointer"
      }
    }), React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginTop: 8,
        color: "#6B7280",
        fontSize: 12
      }
    }, React.createElement("span", null, "10 mi"), React.createElement("span", null, "200 mi")), React.createElement("p", {
      style: {
        fontSize: 13,
        color: "#4A5568",
        marginTop: 12,
        textAlign: "center"
      }
    }, ans.radius <= 30 ? "Great for highly local results" : ans.radius <= 75 ? "Good balance of local and regional" : "Wide net — more options, more competition")), React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        marginTop: "2.5rem"
      }
    }, editStep !== null ? React.createElement(React.Fragment, null, React.createElement("button", {
      onClick: () => {
        setEditStep(null);
        setPage("results");
      },
      style: {
        background: "#FBFBFC",
        border: `1.5px solid #E2E8F0`,
        color: "#4A5568",
        padding: "13px 16px",
        borderRadius: var_rl,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 14,
        fontWeight: 600
      }
    }, "Cancel"), React.createElement("button", {
      onClick: () => {
        if (!canNext()) return;
        setEditStep(null);
        analytics.track("answer_edited");
        setShowReview(true);
        setPage("results");
        window.scrollTo(0, 0);
      },
      disabled: !canNext(),
      style: {
        background: canNext() ? "#fff" : "#F1F5F4",
        border: `1.5px solid ${canNext() ? G : "#E2E8F0"}`,
        color: canNext() ? GD : "#6B7280",
        padding: "13px 16px",
        borderRadius: var_rl,
        cursor: canNext() ? "pointer" : "not-allowed",
        fontFamily: "var(--font)",
        fontSize: 14,
        fontWeight: 700
      }
    }, "Save & edit more"), React.createElement("button", {
      onClick: saveEdit,
      disabled: !canNext(),
      style: {
        flex: 1,
        background: canNext() ? `${G}` : "#E2E8F0",
        border: "none",
        color: canNext() ? "#fff" : "#6B7280",
        padding: "14px 20px",
        borderRadius: var_rl,
        cursor: canNext() ? "pointer" : "not-allowed",
        fontFamily: "var(--font)",
        fontSize: 15,
        fontWeight: 700,
        boxShadow: canNext() ? `0 4px 16px ${G}40` : "none"
      }
    }, "Save & see results \u2192")) : React.createElement(React.Fragment, null, step > 0 && React.createElement("button", {
      onClick: () => setStep(s => s - 1),
      style: {
        background: "#FBFBFC",
        border: `1.5px solid #E2E8F0`,
        color: "#4A5568",
        padding: "13px 18px",
        borderRadius: var_rl,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 16
      }
    }, "\u2190"), (cur.type === "multi" || cur.type === "zip" || cur.type === "slider" || cur.type === "extracurricular") && React.createElement("button", {
      onClick: advanceQuiz,
      disabled: !canNext(),
      style: {
        flex: 1,
        background: canNext() ? `${G}` : "#E2E8F0",
        border: "none",
        color: canNext() ? "#fff" : "#6B7280",
        padding: "14px 24px",
        borderRadius: var_rl,
        cursor: canNext() ? "pointer" : "not-allowed",
        fontFamily: "var(--font)",
        fontSize: 15,
        fontWeight: 700,
        transition: "all 0.2s",
        boxShadow: canNext() ? `0 4px 16px ${G}40` : "none"
      }
    }, step === STEPS.length - 1 ? "Find My Matches →" : cur.type === "multi" && !ans.skills.length ? "Skip for now →" : "Continue →")))));
  }
  if (page === "emailgate") return React.createElement("div", {
    style: {
      background: "#fff",
      minHeight: "100vh"
    }
  }, showProModal && React.createElement(ProModal, null), React.createElement(SignInModal, null), React.createElement(Nav, null), React.createElement("div", {
    style: {
      maxWidth: 480,
      margin: "0 auto",
      padding: "3rem 1.5rem"
    }
  }, React.createElement("div", {
    className: "fade-up",
    style: {
      background: "#fff",
      border: `1.5px solid ${GL}`,
      borderRadius: var_rxl,
      padding: "2.5rem 2rem",
      textAlign: "center",
      boxShadow: "0 1px 2px rgba(11,18,32,.06)"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 34,
      marginBottom: 8
    }
  }), React.createElement("h2", {
    style: {
      fontSize: "clamp(1.5rem,3.5vw,2rem)",
      fontWeight: 700,
      letterSpacing: "-1px",
      marginBottom: 10,
      color: "#0B1220"
    }
  }, "Want internship updates by email?"), React.createElement("p", {
    style: {
      color: "#4A5568",
      fontSize: 15,
      lineHeight: 1.6,
      marginBottom: "1.5rem"
    }
  }, React.createElement("b", null, "Optional."), " Your matches show up either way. Leave your email if you'd like occasional internship tips and updates from Beat the Pile."), React.createElement("input", {
    type: "email",
    value: email,
    autoFocus: true,
    placeholder: "you@email.com",
    onChange: e => {
      setEmail(e.target.value);
      setEmailErr("");
    },
    onKeyDown: e => {
      if (e.key === "Enter") submitEmail();
    },
    style: {
      width: "100%",
      padding: "14px 16px",
      borderRadius: var_rl,
      border: `1.5px solid ${emailErr ? CR : /.+@.+\..+/.test(email) ? G : "#E2E8F0"}`,
      background: "#FBFBFC",
      fontFamily: "var(--font)",
      fontSize: 16,
      textAlign: "center",
      outline: "none",
      marginBottom: 8
    }
  }), emailErr && React.createElement("p", {
    style: {
      color: CR,
      fontSize: 13,
      marginBottom: 8
    }
  }, emailErr), React.createElement("button", {
    onClick: submitEmail,
    style: {
      width: "100%",
      background: `${G}`,
      border: "none",
      color: "#fff",
      padding: "15px",
      borderRadius: var_rl,
      cursor: "pointer",
      fontFamily: "var(--font)",
      fontSize: 16,
      fontWeight: 700,
      boxShadow: "0 1px 2px rgba(11,18,32,.06)"
    }
  }, "Save email & show my matches \u2192"), React.createElement("button", {
    onClick: () => {
      setEmailErr("");
      calcResults();
    },
    style: {
      width: "100%",
      background: "#fff",
      border: "1.5px solid #E2E8F0",
      color: "#0B1220",
      padding: "13px",
      borderRadius: var_rl,
      cursor: "pointer",
      fontFamily: "var(--font)",
      fontSize: 15,
      fontWeight: 700,
      marginTop: 8
    }
  }, "Skip \u2014 just show my matches"), React.createElement("p", {
    style: {
      fontSize: 11.5,
      color: "#6B7280",
      marginTop: 14,
      lineHeight: 1.5
    }
  }, "Your email goes to our email-list provider (MailerLite). We only email about internships and Beat the Pile, never sell your info, and you can unsubscribe anytime. ", React.createElement("a", {
    href: "/privacy/",
    style: {
      color: "#4A5568"
    }
  }, "Privacy")))));
  if (page === "results") {
    const trackedNames = tracked.map(t => t.company);
    const pickScore = c => c.match + (c.tier === "national" ? 12 : 0);
    const topPicks = [...results].filter(c => c.match >= 42).sort((a, b) => pickScore(b) - pickScore(a)).slice(0, 3);
    const topNames = topPicks.map(c => c.name);
    const bandLabel = b => ({
      "in-town": {
        text: "IN TOWN",
        color: "#0d9488",
        bg: "#0d948815"
      },
      "nearby": {
        text: "NEARBY",
        color: "#0891b2",
        bg: "#0891b215"
      },
      "metro": {
        text: "METRO",
        color: "#4A5568",
        bg: "#4A556815"
      },
      "regional": {
        text: "REGIONAL",
        color: "#6B7280",
        bg: "#6B728015"
      },
      "remote": {
        text: "REMOTE",
        color: "#7c3aed",
        bg: "#7c3aed15"
      }
    })[b] || null;
    const bandOrder = {
      "in-town": 0,
      "nearby": 1,
      "metro": 2,
      "regional": 3,
      "remote": 4
    };
    const free = [...results].sort((a, b) => {
      if (sortBy === "firms") {
        const ta = isLikelyNational(a) ? 1 : 0,
          tb = isLikelyNational(b) ? 1 : 0;
        if (tb !== ta) return tb - ta;
        const ba = bandOrder[a.locationBand] ?? 3,
          bb = bandOrder[b.locationBand] ?? 3;
        if (ba !== bb) return ba - bb;
        return (a.name || "").localeCompare(b.name || "");
      }
      return b.match - a.match;
    });
    return React.createElement("div", {
      style: {
        background: "#fff",
        minHeight: "100vh"
      }
    }, showProModal && React.createElement(ProModal, null), React.createElement(SignInModal, null), showConfetti && React.createElement(Confetti, null), applyModal && ApplyModal(), showReview && ReviewPanel(), proNudge && NudgeToast(), React.createElement(Nav, null), React.createElement("div", {
      style: {
        maxWidth: 760,
        margin: "0 auto",
        padding: "2.5rem 1.5rem"
      }
    }, loading ? React.createElement("div", {
      style: {
        textAlign: "center",
        padding: "6rem 2rem"
      }
    }, React.createElement("div", {
      style: {
        position: "relative",
        width: 64,
        height: 64,
        margin: "0 auto 2rem"
      }
    }, React.createElement("div", {
      style: {
        width: 64,
        height: 64,
        border: `4px solid ${GL}`,
        borderTopColor: G,
        borderRadius: "50%",
        animation: "spin 0.9s linear infinite"
      }
    }), React.createElement("span", {
      style: {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 24
      }
    })), React.createElement("div", {
      style: {
        background: GL,
        borderRadius: var_rxl,
        padding: "1.5rem",
        maxWidth: 380,
        margin: "0 auto"
      }
    }, React.createElement("div", {
      style: {
        width: `${loadPct}%`,
        height: 4,
        background: G,
        borderRadius: 99,
        marginBottom: "1rem",
        transition: "width 1.8s ease"
      }
    }), React.createElement("p", {
      style: {
        fontWeight: 700,
        fontSize: 17,
        marginBottom: "0.5rem",
        color: "#0B1220"
      }
    }, loadMsg), React.createElement("p", {
      style: {
        color: "#4A5568",
        fontSize: 14
      }
    }, "Matching ", ans.major, " opportunities to your profile..."))) : React.createElement(React.Fragment, null, React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "2rem",
        flexWrap: "wrap",
        gap: 12
      }
    }, React.createElement("div", null, React.createElement("p", {
      style: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: 600
      }
    }, "Your Matches"), React.createElement("h2", {
      style: {
        fontSize: "clamp(1.8rem,4vw,2.6rem)",
        fontWeight: 700,
        letterSpacing: "-1.5px",
        marginTop: "0.2rem",
        color: "#0B1220"
      }
    }, "Here's where you stand."), React.createElement("p", {
      style: {
        color: "#4A5568",
        fontSize: 13,
        marginTop: 4
      }
    }, ans.major, " \xB7 ", ans.gpa, " GPA \xB7 ", ans.gradYear, ans.type && ans.type !== "Any" ? ` · ${ans.type}` : "")), React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        flexShrink: 0,
        flexWrap: "wrap",
        justifyContent: "flex-end"
      }
    }, React.createElement("button", {
      onClick: () => setShowReview(true),
      style: {
        background: `${G}`,
        border: "none",
        color: "#fff",
        padding: "10px 18px",
        borderRadius: var_rl,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: "nowrap",
        boxShadow: "0 1px 2px rgba(11,18,32,.06)"
      }
    }, "Edit answers"), React.createElement("button", {
      onClick: calcResults,
      style: {
        background: "#FBFBFC",
        border: `1.5px solid ${GL}`,
        color: "#0B1220",
        padding: "10px 18px",
        borderRadius: var_rl,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: "nowrap"
      }
    }, "\u21BB Refresh"), React.createElement("button", {
      onClick: () => {
        setEditStep(null);
        setShowReview(false);
        setStep(0);
        setSearchQ("");
        setPage("quiz");
        window.scrollTo(0, 0);
      },
      style: {
        background: "#fff",
        border: `1.5px solid #E2E8F0`,
        color: "#4A5568",
        padding: "10px 18px",
        borderRadius: var_rl,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: "nowrap"
      }
    }, "\u21BA Redo quiz"))), results.length > 0 && (() => {
      const top = results[0]?.match || 0;
      const strong = results.filter(r => r.match >= 70).length;
      const decent = results.filter(r => r.match >= 50 && r.match < 70).length;
      return React.createElement("div", {
        style: {
          background: "#fff",
          border: "1px solid #E3E7ED",
          borderRadius: var_rl,
          padding: "14px 18px",
          marginBottom: 16,
          display: "flex",
          alignItems: "baseline",
          gap: 22,
          flexWrap: "wrap"
        }
      }, React.createElement("div", null, React.createElement("span", {
        style: {
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: "#0B1220"
        }
      }, results.length), React.createElement("span", {
        style: {
          fontSize: 13,
          color: "#5B6675",
          marginLeft: 6
        }
      }, "open ", results.length === 1 ? "internship" : "internships", " for you")), React.createElement("div", null, React.createElement("span", {
        style: {
          fontSize: 18,
          fontWeight: 650,
          color: "#0B1220"
        }
      }, top, "%"), React.createElement("span", {
        style: {
          fontSize: 12.5,
          color: "#5B6675",
          marginLeft: 5
        }
      }, "top match (estimate)")), strong > 0 && React.createElement("div", null, React.createElement("span", {
        style: {
          fontSize: 18,
          fontWeight: 650,
          color: "#0B1220"
        }
      }, strong), React.createElement("span", {
        style: {
          fontSize: 12.5,
          color: "#5B6675",
          marginLeft: 5
        }
      }, "strong ", strong === 1 ? "match" : "matches")), decent > 0 && React.createElement("div", null, React.createElement("span", {
        style: {
          fontSize: 18,
          fontWeight: 650,
          color: "#0B1220"
        }
      }, decent), React.createElement("span", {
        style: {
          fontSize: 12.5,
          color: "#5B6675",
          marginLeft: 5
        }
      }, "worth a shot")));
    })(), React.createElement(FollowUpsDueBanner, null), (() => {
      const hasResume = (profile.resumes || []).filter(r => r.text).length > 0;
      const isSparse = (ans.type === "In-person" || ans.type === "Hybrid") && results.length < 15 && results.length > 0;
      const tt = ans.targetTerm ? termTiming(ans.targetTerm) : null;
      const late = tt && tt.months < 3;
      const exp = experienceFromGrad(ans.gradYear);
      const exc = exceptionalPicks(extPicks);
      const lines = [];
      lines.push({
        icon: "",
        text: ans.type === "Remote" ? React.createElement(React.Fragment, null, "Real openings that say ", React.createElement("strong", null, "remote"), ", from companies' own job boards.") : React.createElement(React.Fragment, null, "Real openings from companies' own job boards", metaRef.current?.studentState ? React.createElement(React.Fragment, null, ", starting in ", React.createElement("strong", null, metaRef.current.studentState)) : "", ". Each one was open when our robot last checked.")
      });
      if (metaRef.current?.radiusExpanded) lines.push({
        icon: "",
        text: React.createElement(React.Fragment, null, "Not enough openings in ", React.createElement("strong", null, metaRef.current.studentState || "your state"), ", so we widened the search to ", React.createElement("strong", null, metaRef.current.expansionLabel), ". Every listing shown is a real opening \u2014 check the location before applying.")
      });
      if (!hasResume && !hideResumeNudge) lines.push({
        icon: "",
        text: React.createElement(React.Fragment, null, React.createElement("strong", null, "Add your resume"), " to auto-fill applications. ", React.createElement("button", {
          onClick: () => setPage("profile"),
          style: {
            background: "none",
            border: "none",
            color: GD,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "var(--font)",
            fontSize: 12.5,
            textDecoration: "underline",
            padding: 0
          }
        }, "Add now"))
      });
      if (tt) lines.push({
        icon: late ? "" : "",
        text: timingNote(ans.targetTerm)
      });
      if (exp.label) lines.push({
        icon: "",
        text: exp.label
      });
      if (exc.length > 0) lines.push({
        icon: "",
        text: React.createElement(React.Fragment, null, "Your standout leadership \u2014 ", React.createElement("strong", null, exc.map(e => `${e.role} (${e.activity})`).join(", ")), " \u2014 is exactly what recruiters look for. Make sure it's front and center on your resume.")
      });
      if (lines.length === 0) return null;
      return React.createElement("div", {
        style: {
          background: "#F8FAFC",
          border: `1px solid #E2E8F0`,
          borderRadius: var_rl,
          marginBottom: 16,
          overflow: "hidden"
        }
      }, React.createElement("button", {
        onClick: () => setInsightsOpen(o => !o),
        style: {
          width: "100%",
          background: "transparent",
          border: "none",
          padding: "11px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          fontFamily: "var(--font)",
          textAlign: "left"
        }
      }, React.createElement("span", {
        style: {
          fontSize: 12.5,
          fontWeight: 700,
          color: "#0B1220",
          letterSpacing: "0.3px"
        }
      }, "Context for these results ", React.createElement("span", {
        style: {
          color: "#6B7280",
          fontWeight: 600,
          marginLeft: 6,
          fontSize: 11.5
        }
      }, "(", lines.length, " ", lines.length === 1 ? "note" : "notes", ")")), React.createElement("span", {
        style: {
          fontSize: 13,
          color: "#6B7280",
          transform: insightsOpen ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s"
        }
      }, "\u25BC")), insightsOpen && React.createElement("div", {
        style: {
          padding: "0 14px 12px",
          borderTop: `1px solid #E2E8F0`
        }
      }, React.createElement("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 9,
          paddingTop: 11
        }
      }, lines.map((l, i) => React.createElement("div", {
        key: i,
        style: {
          display: "flex",
          gap: 9,
          fontSize: 12.5,
          lineHeight: 1.5,
          color: "#4A5568"
        }
      }, React.createElement("span", {
        "aria-hidden": "true",
        style: {
          width: 5,
          height: 5,
          borderRadius: 3,
          background: "#9AA4B2",
          flexShrink: 0,
          marginTop: 8
        }
      }), React.createElement("span", {
        style: {
          flex: 1
        }
      }, l.text))), React.createElement("p", {
        style: {
          fontSize: 11,
          color: "#6B7280",
          lineHeight: 1.55,
          paddingTop: 8,
          borderTop: `1px solid #E2E8F0`,
          marginTop: 2
        }
      }, "Match % is our own estimate of your fit from your quiz answers (field, GPA, grad year, timing, leadership). It is not from the employer and is not a prediction of an offer. We'd rather show a low honest number than a high false one."))));
    })(), showResultsHint && topPicks.length > 0 && React.createElement("div", {
      style: {
        position: "relative",
        marginBottom: 14
      }
    }, React.createElement("div", {
      style: {
        background: "#F2F4F7",
        color: "#0B1220",
        borderRadius: var_rl,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, React.createElement("p", {
      style: {
        fontSize: 13.5,
        fontWeight: 650,
        marginBottom: 2,
        lineHeight: 1.3
      }
    }, "Open any card to apply"), React.createElement("p", {
      style: {
        fontSize: 12,
        color: "#5B6675",
        lineHeight: 1.4
      }
    }, "Each card links to the company's own posting. Mark it applied and it's tracked for follow-ups.")), React.createElement("button", {
      onClick: dismissResultsHint,
      "aria-label": "Dismiss",
      style: {
        background: "transparent",
        border: "none",
        color: "#5B6675",
        width: 28,
        height: 28,
        borderRadius: "50%",
        cursor: "pointer",
        fontSize: 14,
        fontWeight: 700,
        lineHeight: 1,
        flexShrink: 0
      }
    }, "\xD7"))), resultsError ? React.createElement("div", {
      role: "alert",
      style: {
        background: "#FFF5F5",
        border: "1.5px solid #FED7D7",
        borderLeft: "4px solid #E53E3E",
        borderRadius: var_rl,
        padding: "12px 16px",
        marginBottom: 14
      }
    }, React.createElement("p", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "#C53030",
        marginBottom: 4
      }
    }, "We couldn't load internships"), React.createElement("p", {
      style: {
        fontSize: 12.5,
        color: "#742A2A",
        lineHeight: 1.5,
        marginBottom: 8
      }
    }, resultsError, " This is a problem on our side or your connection, not a sign there are no openings."), React.createElement("button", {
      onClick: calcResults,
      style: {
        background: "#C53030",
        color: "#fff",
        border: "none",
        borderRadius: var_r,
        padding: "8px 14px",
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: "var(--font)"
      }
    }, "Try again")) : results.length === 0 ? React.createElement("div", {
      style: {
        background: "#F8FAFC",
        border: "1.5px solid #E2E8F0",
        borderRadius: var_rl,
        padding: "14px 16px",
        marginBottom: 14
      }
    }, React.createElement("p", {
      style: {
        fontSize: 13.5,
        fontWeight: 700,
        color: "#0B1220",
        marginBottom: 4
      }
    }, "No open ", ans.major || "", " internships found", ans.type === "Remote" ? " that are remote" : " in your area or anywhere in the US", " right now"), React.createElement("p", {
      style: {
        fontSize: 12.5,
        color: "#4A5568",
        lineHeight: 1.5,
        marginBottom: 8
      }
    }, "We only show real openings we found on companies' own job boards, so this list can be empty for some majors. New companies are added every day."), React.createElement("a", {
      href: "/jobs/?state=all",
      style: {
        color: GD,
        fontWeight: 700,
        fontSize: 13
      }
    }, "Browse every internship \u2192")) : null, (() => {
      const hasResume = (ans.resume || "").length > 80 || (profile.resumes || []).filter(r => r.text).length > 0;
      if (hasResume) return null;
      return React.createElement("div", {
        style: {
          background: `#0B1220`,
          borderRadius: var_rxl,
          padding: "1.25rem 1.5rem",
          marginBottom: 18,
          display: "flex",
          gap: 14,
          alignItems: "center",
          flexWrap: "wrap",
          boxShadow: "0 6px 24px rgba(10,22,40,0.2)"
        }
      }, React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 220
        }
      }, React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 5
        }
      }, React.createElement("span", {
        style: {
          fontSize: 20
        }
      }), React.createElement("p", {
        style: {
          fontWeight: 700,
          fontSize: 15,
          color: "#fff",
          letterSpacing: "-0.3px"
        }
      }, "No resume yet? Build one in 30 seconds.")), React.createElement("p", {
        style: {
          fontSize: 13,
          color: "#94A3B8",
          lineHeight: 1.5
        }
      }, "Beat the Pile generates a starter resume from your quiz answers \u2014 your major, activities, skills, all filled in. Edit it, then use it on every application.")), React.createElement("button", {
        onClick: () => setPage("resumebuilder"),
        style: {
          flexShrink: 0,
          background: `${G}`,
          border: "none",
          color: "#fff",
          padding: "12px 20px",
          borderRadius: var_rl,
          cursor: "pointer",
          fontFamily: "var(--font)",
          fontSize: 14,
          fontWeight: 700,
          whiteSpace: "nowrap",
          boxShadow: "0 1px 2px rgba(11,18,32,.06)"
        }
      }, "Build my resume \u2197"));
    })(), topPicks.length > 0 && React.createElement("div", {
      style: {
        background: `#fff`,
        border: `1.5px solid ${G}`,
        borderRadius: var_rxl,
        padding: "1.25rem 1.4rem",
        marginBottom: 18,
        boxShadow: "0 1px 2px rgba(11,18,32,.06)"
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 4
      }
    }, React.createElement("span", {
      style: {
        fontSize: 18
      }
    }), React.createElement("h3", {
      style: {
        fontWeight: 700,
        fontSize: 17,
        color: "#0B1220",
        letterSpacing: "-0.4px"
      }
    }, "Top picks for you")), React.createElement("p", {
      style: {
        fontSize: 12.5,
        color: "#4A5568",
        marginBottom: 12,
        lineHeight: 1.5
      }
    }, "Of all your matches, these are the strongest realistic shots \u2014 where your time is best spent first."), React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8
      }
    }, topPicks.map((c, i) => React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "#fff",
        border: `1px solid ${GM}`,
        borderRadius: var_rl,
        padding: "10px 14px"
      }
    }, React.createElement("span", {
      style: {
        fontSize: 20,
        fontWeight: 700,
        color: G,
        minWidth: 48
      }
    }, c.match, "%"), React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6
      }
    }, React.createElement("p", {
      style: {
        fontWeight: 600,
        fontSize: 14,
        color: "#0B1220",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, c.role || "Internship"), isLikelyNational(c) && React.createElement("span", {
      style: {
        flexShrink: 0,
        fontSize: 9.5,
        fontWeight: 700,
        color: "#2563EB",
        background: "#2563EB15",
        padding: "2px 7px",
        borderRadius: 99,
        letterSpacing: "0.3px"
      }
    }, "Big name"), c.personalized && React.createElement("span", {
      style: {
        flexShrink: 0,
        fontSize: 9.5,
        fontWeight: 700,
        color: GD,
        background: GL,
        padding: "2px 7px",
        borderRadius: 99,
        letterSpacing: "0.3px"
      }
    }, "Personalized"), (() => {
      const b = bandLabel(c.locationBand);
      return b ? React.createElement("span", {
        style: {
          flexShrink: 0,
          fontSize: 9.5,
          fontWeight: 700,
          color: b.color,
          background: b.bg,
          padding: "2px 7px",
          borderRadius: 99,
          letterSpacing: "0.3px"
        }
      }, b.text) : null;
    })()), React.createElement("p", {
      style: {
        fontSize: 12,
        color: "#4A5568",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, "at ", React.createElement("b", {
      style: {
        fontWeight: 600,
        color: "#0B1220"
      }
    }, c.name), c.location ? ` · ${c.location}` : "")), React.createElement("button", {
      onClick: () => openApply(c),
      style: {
        background: `${G}`,
        border: "none",
        color: "#fff",
        padding: "8px 16px",
        borderRadius: var_r,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 12.5,
        fontWeight: 700,
        flexShrink: 0
      }
    }, "Apply \u2197"))))), React.createElement("div", {
      style: {
        marginBottom: 12
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 8
      }
    }, React.createElement("p", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "#4A5568"
      }
    }, results.length, " matches"), React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6
      }
    }, React.createElement("span", {
      style: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: 600
      }
    }, "Sort:"), [["chance", "Highest chance"], ["firms", "Big Names"]].map(([v, l]) => React.createElement("button", {
      key: v,
      onClick: () => {
        setSortBy(v);
        setExpandedCard(null);
      },
      style: {
        background: sortBy === v ? GL : "#fff",
        border: `1.5px solid ${sortBy === v ? G : "#E2E8F0"}`,
        color: sortBy === v ? GD : "#4A5568",
        padding: "6px 12px",
        borderRadius: 99,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 12.5,
        fontWeight: 700
      }
    }, l)))), sortBy === "firms" && React.createElement("p", {
      style: {
        fontSize: 11.5,
        color: "#6B7280",
        marginTop: 6,
        textAlign: "right"
      }
    }, "Recognized brand names first \u2014 harder to get, but worth having on your resume.")), React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
        gap: 14,
        marginBottom: 16
      }
    }, free.map((c, i) => {
      const isStr = c.match >= 70,
        isDec = c.match >= 50 && c.match < 70;
      const accent = isStr ? G : isDec ? AM : CR;
      const label = isStr ? "Strong Match" : isDec ? "Decent Shot" : "Reach";
      const isTracked = trackedNames.includes(c.name);
      const saved = isJobSaved(c.name);
      const isFlipped = expandedCard === i;
      const locationBadge = (() => {
        const b = bandLabel(c.locationBand);
        return b ? React.createElement("span", {
          style: {
            fontSize: 9.5,
            fontWeight: 700,
            color: b.color,
            background: b.bg,
            padding: "2px 7px",
            borderRadius: 99,
            letterSpacing: "0.3px"
          }
        }, b.text) : null;
      })();
      const verified = c.source === "db" && c.applyUrl ? {
        verified: true,
        applyUrl: c.applyUrl,
        realLocation: c.location
      } : adzunaVerified[c.name] || null;
      const isVerified = verified && verified.verified && verified.applyUrl;
      const displayLocation = isVerified && verified.realLocation ? verified.realLocation : c.location;
      const hasRealLocation = displayLocation && !["National employer", "Hires interns in your field", "Regional employer", "Regional facilities"].includes(displayLocation);
      const liUrl = linkedinCompanyUrl(c);
      const indUrl = indeedCompanyUrl(c);
      const hsUrl = handshakeUrl(c);
      const gJobsUrl = googleSearchUrl(c);
      const mapUrl = ans.type !== "Remote" && hasRealLocation ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((c.name || "") + " " + displayLocation)}` : null;
      const cardStyle = {
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 460,
        transformStyle: "preserve-3d",
        transition: "transform 0.6s cubic-bezier(0.4,0.2,0.2,1)",
        transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
      };
      const faceBase = {
        position: "absolute",
        inset: 0,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        borderRadius: var_rl,
        overflow: "hidden"
      };
      return React.createElement("div", {
        key: i,
        style: {
          perspective: "1200px",
          minHeight: 460
        }
      }, React.createElement("div", {
        style: cardStyle
      }, React.createElement("div", {
        onClick: () => {
          setExpandedCard(i);
          fetchCardIntel(c);
        },
        style: {
          ...faceBase,
          background: "#fff",
          border: "1px solid #E3E7ED",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          boxShadow: "0 1px 2px rgba(11,18,32,.06)",
          cursor: "pointer",
          overflowY: "auto"
        }
      }, React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start"
        }
      }, React.createElement("div", {
        style: {
          flex: 1,
          minWidth: 0,
          paddingRight: 12
        }
      }, React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap"
        }
      }, React.createElement("p", {
        style: {
          fontWeight: 600,
          fontSize: 16,
          letterSpacing: "-0.2px",
          color: "#0B1220",
          lineHeight: 1.3
        }
      }, c.role || "Internship")), React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 6,
          flexWrap: "wrap"
        }
      }, React.createElement("span", {
        "aria-hidden": "true",
        style: {
          width: 24,
          height: 24,
          borderRadius: 6,
          background: "#F1F4F9",
          border: "1px solid #DCE2EC",
          display: "grid",
          placeItems: "center",
          fontSize: 10,
          fontWeight: 600,
          color: "#0B1220",
          flexShrink: 0
        }
      }, coInitials(c.name)), React.createElement("p", {
        style: {
          fontSize: 14,
          fontWeight: 500,
          color: "#0B1220"
        }
      }, React.createElement("span", {
        style: {
          position: "absolute",
          left: -9999
        }
      }, "Company: "), c.name), isLikelyNational(c) && React.createElement("span", {
        style: {
          fontSize: 9.5,
          fontWeight: 700,
          color: "#2563EB",
          background: "#2563EB15",
          padding: "2px 7px",
          borderRadius: 99,
          letterSpacing: "0.3px"
        }
      }, "Big name"), c.personalized && React.createElement("span", {
        style: {
          fontSize: 9.5,
          fontWeight: 700,
          color: GD,
          background: GL,
          padding: "2px 7px",
          borderRadius: 99,
          letterSpacing: "0.3px"
        }
      }, "Personalized"), locationBadge), React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginTop: 2,
          flexWrap: "wrap"
        }
      }, React.createElement("p", {
        style: {
          color: "#6B7280",
          fontSize: 12
        }
      }, [hasRealLocation ? displayLocation : c.location, c.industry].filter(Boolean).join(" · ")), typeof c.distanceMiles === "number" && c.distanceMiles > 0 ? React.createElement("span", {
        style: {
          fontSize: 10.5,
          color: "#94A3B8",
          background: "#F1F5F9",
          padding: "1px 7px",
          borderRadius: 99,
          fontWeight: 600,
          whiteSpace: "nowrap"
        }
      }, c.distanceMiles, " mi") : c.source === "ai" ? React.createElement("span", {
        style: {
          fontSize: 10.5,
          color: "#B45309",
          background: "#FEF3C7",
          padding: "1px 7px",
          borderRadius: 99,
          fontWeight: 600,
          whiteSpace: "nowrap"
        }
      }, "AI-suggested \xB7 distance unverified") : c.locationBand && c.locationBand !== "remote" && React.createElement("span", {
        style: {
          fontSize: 10.5,
          color: "#94A3B8",
          background: "#F1F5F9",
          padding: "1px 7px",
          borderRadius: 99,
          fontWeight: 600
        }
      }, {
        ["in-town"]: "< 3 mi",
        ["nearby"]: "3-15 mi",
        ["metro"]: "15-30 mi",
        ["regional"]: "30+ mi"
      }[c.locationBand] || ""))), React.createElement("div", {
        style: {
          textAlign: "right",
          flexShrink: 0
        }
      }, React.createElement(AnimatedPct, {
        target: c.match,
        color: accent
      }), typeof c.low === "number" && React.createElement("p", {
        style: {
          fontSize: 11,
          color: "#6B7280",
          fontWeight: 600,
          marginTop: -2
        }
      }, "range ", c.low, "\u2013", c.high, "%"), React.createElement("div", {
        style: {
          marginTop: 4
        }
      }, React.createElement(MatchChip, {
        label: label,
        accent: accent
      })))), React.createElement(MatchBar, {
        pct: c.match,
        color: accent,
        delay: 0
      }), React.createElement("div", {
        style: {
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          fontSize: 11,
          color: "#6B7280",
          fontWeight: 600
        }
      }, React.createElement("span", null, "GPA/Profile ", c._profile, "%"), React.createElement("span", null, "\xB7 Experience ", c._exp, "%"), c._lead > 0 && React.createElement("span", null, "\xB7 Leadership ", c._lead, "%"), React.createElement("span", null, "\xB7 Timing ", c._timing, "%"), React.createElement("span", null, "\xB7 Fit (est.) ", c._fit, "%")), React.createElement("div", {
        onClick: e => e.stopPropagation()
      }, React.createElement(ScoreExplainerCard, {
        job: c,
        profile: {
          major: ans.major,
          gpa: ans.gpa,
          skills: ans.skills || [],
          gradYear: ans.gradYear,
          locationPref: ans.zip,
          workStyle: ans.type === "Remote" ? "remote" : ans.type
        },
        isPro: isPro,
        setShowProModal: setShowProModal,
        isExpanded: expandedExplainer === c.name,
        onToggle: () => {
          const opening = expandedExplainer !== c.name;
          setExpandedExplainer(opening ? c.name : null);
          if (opening) analytics.track('score_explainer_opened', {
            jobId: c.name,
            score: c.match,
            isPro
          });
        }
      })), c.reason && React.createElement("div", {
        style: {
          background: c.personalized ? GL : "#FBFBFC",
          border: `1px solid ${c.personalized ? GM : "#E2E8F0"}`,
          borderRadius: var_r,
          padding: "9px 11px"
        }
      }, React.createElement("p", {
        style: {
          fontSize: 12,
          fontWeight: 600,
          color: c.personalized ? GD : "#6B7280",
          marginBottom: 4
        }
      }, c.personalized ? "Why this fits you" : "Why this is a realistic shot"), React.createElement("p", {
        style: {
          fontSize: 13,
          color: "#4A5568",
          lineHeight: 1.6,
          fontStyle: "italic"
        }
      }, c.reason)), isVerified && React.createElement("span", {
        style: {
          fontSize: 10,
          fontWeight: 700,
          color: GD,
          background: GL,
          padding: "3px 9px",
          borderRadius: 99,
          alignSelf: "flex-start"
        }
      }, "Open on the company's job board"), React.createElement("p", {
        style: {
          fontSize: 10.5,
          color: "#C3D1D8",
          textAlign: "center",
          marginTop: "auto",
          letterSpacing: "0.3px"
        }
      }, "tap anywhere to see company info \u2192"), React.createElement("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 6
        },
        onClick: e => e.stopPropagation()
      }, React.createElement("button", {
        onClick: () => openApply(c),
        style: {
          background: `${G}`,
          color: "#fff",
          padding: "13px 8px",
          borderRadius: var_r,
          fontSize: 14.5,
          fontWeight: 700,
          border: "none",
          cursor: "pointer",
          fontFamily: "var(--font)",
          textAlign: "center",
          width: "100%",
          boxShadow: "0 1px 2px rgba(11,18,32,.06)"
        }
      }, "Apply now \u2197"), React.createElement("div", {
        style: {
          display: "flex",
          gap: 6
        }
      }, React.createElement("button", {
        onClick: () => {
          toggleSaveJob(c);
          analytics.track(saved ? "job_unsaved" : "job_saved", {
            company: c.name
          });
        },
        style: {
          flex: 1,
          background: saved ? "#F5F3FF" : "#fff",
          border: `1.5px solid ${saved ? "#7C3AED" : "#E2E8F0"}`,
          color: saved ? "#7C3AED" : "#6B7280",
          padding: "9px 13px",
          borderRadius: var_r,
          cursor: "pointer",
          fontFamily: "var(--font)",
          fontSize: 13,
          fontWeight: 700
        }
      }, saved ? "Saved" : "Save"), React.createElement("button", {
        onClick: () => track(c),
        style: {
          flex: 1,
          background: isTracked ? GL : "#fff",
          border: `1.5px solid ${isTracked ? G : "#E2E8F0"}`,
          color: isTracked ? GD : "#6B7280",
          padding: "9px 13px",
          borderRadius: var_r,
          cursor: "pointer",
          fontFamily: "var(--font)",
          fontSize: 13,
          fontWeight: 700
        }
      }, isTracked ? "✓ Tracked" : "+ Track")))), React.createElement("div", {
        style: {
          ...faceBase,
          transform: "rotateY(180deg)",
          background: "#0B1220",
          padding: "1.4rem",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          overflowY: "auto"
        }
      }, React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 2
        }
      }, React.createElement("div", null, React.createElement("p", {
        style: {
          fontSize: 12,
          fontWeight: 600,
          color: G,
          marginBottom: 3
        }
      }, "Company intel"), React.createElement("p", {
        style: {
          fontWeight: 700,
          fontSize: 17,
          color: "#fff",
          letterSpacing: "-0.3px",
          lineHeight: 1.2
        }
      }, c.name), React.createElement("p", {
        style: {
          fontSize: 12,
          color: "#64748B",
          marginTop: 3
        }
      }, c.role, " \xB7 ", hasRealLocation ? displayLocation : c.industry)), React.createElement("button", {
        onClick: () => setExpandedCard(null),
        style: {
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#94A3B8",
          width: 32,
          height: 32,
          borderRadius: "50%",
          cursor: "pointer",
          fontSize: 16,
          fontFamily: "var(--font)",
          lineHeight: 1,
          flexShrink: 0
        }
      }, "\xD7")), (() => {
        const intel = cardIntel[c.name];
        if (!intel || intel.loading) return React.createElement("div", {
          style: {
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "1.5rem 0"
          }
        }, React.createElement("div", {
          style: {
            width: 22,
            height: 22,
            border: `2px solid rgba(255,255,255,0.1)`,
            borderTop: `2px solid ${G}`,
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite"
          }
        }), React.createElement("p", {
          style: {
            fontSize: 13,
            color: "#64748B"
          }
        }, "Loading company info\u2026"));
        return React.createElement(React.Fragment, null, intel.description && React.createElement("div", {
          style: {
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: var_r,
            padding: "10px 12px"
          }
        }, React.createElement("p", {
          style: {
            fontSize: 12,
            fontWeight: 600,
            color: "#475569",
            marginBottom: 4
          }
        }, "What they do"), React.createElement("p", {
          style: {
            fontSize: 13,
            color: "#CBD5E1",
            lineHeight: 1.6
          }
        }, intel.description)), (intel.size || intel.culture) && React.createElement("div", {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 7
          }
        }, intel.size && React.createElement("div", {
          style: {
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: var_r,
            padding: "9px 10px"
          }
        }, React.createElement("p", {
          style: {
            fontSize: 12,
            fontWeight: 600,
            color: "#475569",
            marginBottom: 4
          }
        }, "Company size"), React.createElement("p", {
          style: {
            fontSize: 12.5,
            color: "#CBD5E1"
          }
        }, intel.size)), intel.culture && React.createElement("div", {
          style: {
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: var_r,
            padding: "9px 10px"
          }
        }, React.createElement("p", {
          style: {
            fontSize: 12,
            fontWeight: 600,
            color: "#475569",
            marginBottom: 4
          }
        }, "Culture"), React.createElement("p", {
          style: {
            fontSize: 12.5,
            color: "#CBD5E1"
          }
        }, intel.culture))), intel.internTasks && React.createElement("div", {
          style: {
            background: "rgba(0,194,133,0.08)",
            border: `1px solid ${G}25`,
            borderRadius: var_r,
            padding: "10px 12px"
          }
        }, React.createElement("p", {
          style: {
            fontSize: 12,
            fontWeight: 600,
            color: G,
            marginBottom: 4
          }
        }, "What you'd actually do"), React.createElement("p", {
          style: {
            fontSize: 13,
            color: "#CBD5E1",
            lineHeight: 1.55
          }
        }, intel.internTasks)), React.createElement("p", {
          style: {
            fontSize: 10.5,
            color: "#94A3B8",
            lineHeight: 1.5
          }
        }, "AI-written summary. It can be wrong, so check the company's site."));
      })(), React.createElement("div", {
        style: {
          marginTop: "auto"
        }
      }, c.contactType === "cold_outreach" ? React.createElement("div", null, React.createElement("p", {
        style: {
          fontSize: 12,
          fontWeight: 600,
          color: G,
          marginBottom: 6
        }
      }, "Contact directly"), React.createElement("p", {
        style: {
          fontSize: 11.5,
          color: "#94A3B8",
          marginBottom: 8,
          lineHeight: 1.5
        }
      }, "This company doesn't post on job boards \u2014 reach out directly. Small companies hire this way all the time."), c.phone && React.createElement("p", {
        style: {
          fontSize: 12,
          color: "#CBD5E1",
          marginBottom: 8
        }
      }, c.phone), React.createElement("button", {
        onClick: () => {
          const subject = encodeURIComponent(`Internship Inquiry — ${c.role || "Internship"}`);
          const body = encodeURIComponent(`Hi,

My name is [Your Name] and I'm a [Year] student studying ${ans.major || "my field"} at [Your University]. I came across ${c.name} and was impressed by your work in ${c.industry || "this field"}.

I'm looking for a summer internship opportunity and would love to learn if you take interns. I'm a quick learner and would be happy to contribute to your team in any way that's helpful.

I've attached my resume for your reference. Would you be open to a brief conversation?

Thank you for your time,
[Your Name]
[Your Phone]
[Your LinkedIn]`);
          window.open(`mailto:?subject=${subject}&body=${body}`);
        },
        style: {
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          background: `${G}`,
          color: "#fff",
          padding: "11px",
          borderRadius: var_r,
          fontWeight: 700,
          fontSize: 13,
          border: "none",
          cursor: "pointer",
          fontFamily: "var(--font)",
          marginBottom: 6
        }
      }, "Open email template"), companyWebsiteUrl(c) && React.createElement("a", {
        href: companyWebsiteUrl(c),
        target: "_blank",
        rel: "noopener noreferrer",
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          background: "rgba(255,255,255,0.07)",
          color: "#E2E8F0",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "9px",
          borderRadius: var_r,
          fontWeight: 700,
          fontSize: 12,
          textDecoration: "none"
        }
      }, "Company Website"), React.createElement("a", {
        href: googleSearchUrl(c),
        target: "_blank",
        rel: "noopener noreferrer",
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          background: "rgba(255,255,255,0.07)",
          color: "#94A3B8",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "9px",
          borderRadius: var_r,
          fontWeight: 700,
          fontSize: 12,
          textDecoration: "none",
          marginTop: 6
        }
      }, "Search on Google")) : React.createElement("div", null, React.createElement("p", {
        style: {
          fontSize: 12,
          fontWeight: 600,
          color: "#475569",
          marginBottom: 6
        }
      }, "Find this role on"), React.createElement("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 5
        }
      }, isVerified && React.createElement("a", {
        href: verified.applyUrl,
        target: "_blank",
        rel: "noopener noreferrer",
        onClick: () => track(c),
        style: {
          gridColumn: "1/-1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          background: `${G}`,
          color: "#fff",
          padding: "11px",
          borderRadius: var_r,
          fontWeight: 700,
          fontSize: 13.5,
          textDecoration: "none",
          marginBottom: 2
        }
      }, "\u2713 Direct apply \u2014 live posting \u2197"), (() => {
        const isNat = c.tier === "national" || isLikelyNational(c);
        const btn = (href, label, style) => href ? React.createElement("a", {
          href: href,
          target: "_blank",
          rel: "noopener noreferrer",
          onClick: () => track(c),
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            padding: "9px 8px",
            borderRadius: var_r,
            fontWeight: 700,
            fontSize: 12,
            textDecoration: "none",
            ...style
          }
        }, label) : null;
        const siteHref = companyWebsiteUrl(c);
        const googleHref = googleSearchUrl(c);
        return React.createElement(React.Fragment, null, siteHref && btn(siteHref, "Company Website", {
          gridColumn: "1/-1",
          background: "rgba(255,255,255,0.1)",
          color: "#E2E8F0",
          border: "1px solid rgba(255,255,255,0.15)",
          marginBottom: 4
        }), isNat && c.hasLinkedin && btn(liUrl, "LinkedIn", {
          background: "#0A66C2",
          color: "#fff"
        }), isNat && btn(indUrl, "Indeed", {
          background: "rgba(255,255,255,0.07)",
          color: "#E2E8F0",
          border: "1px solid rgba(255,255,255,0.1)"
        }), isNat && btn(hsUrl, "Handshake", {
          background: "rgba(255,255,255,0.07)",
          color: "#E2E8F0",
          border: "1px solid rgba(255,255,255,0.1)"
        }), btn(googleHref, "Search on Google", {
          gridColumn: isNat ? "auto" : "1/-1",
          background: "rgba(66,133,244,0.12)",
          color: "#93C5FD",
          border: "1px solid rgba(66,133,244,0.25)",
          marginTop: isNat ? 0 : 4
        }));
      })(), mapUrl && React.createElement("a", {
        href: mapUrl,
        target: "_blank",
        rel: "noopener noreferrer",
        style: {
          gridColumn: "1/-1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          background: "rgba(31,122,77,0.3)",
          color: "#6EE7B7",
          border: "1px solid rgba(31,122,77,0.3)",
          padding: "9px",
          borderRadius: var_r,
          fontWeight: 700,
          fontSize: 12,
          textDecoration: "none",
          marginTop: 2
        }
      }, "Directions to ", displayLocation)))))));
    })), React.createElement("p", {
      style: {
        fontSize: 12,
        color: "#6B7280",
        lineHeight: 1.55,
        textAlign: "center",
        maxWidth: 560,
        margin: "20px auto 0"
      }
    }, "These are estimates based on your profile, company fit, and application timing \u2014 not a guarantee or an offer. We'd rather show you a low honest number than a high false one."))));
  }
  if (page === "resumebuilder") {
    return React.createElement("div", {
      style: {
        background: "#fff",
        minHeight: "100vh"
      }
    }, showProModal && React.createElement(ProModal, null), React.createElement(SignInModal, null), React.createElement(Nav, null), React.createElement("div", {
      style: {
        maxWidth: 760,
        margin: "0 auto",
        padding: "1.5rem 1rem 4rem"
      }
    }, React.createElement("button", {
      onClick: () => setPage(results.length > 0 ? "results" : "landing"),
      style: {
        background: "transparent",
        border: "none",
        color: GD,
        padding: 0,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 13,
        fontWeight: 600,
        marginBottom: 14
      }
    }, "\u2190 ", results.length > 0 ? "Back to results" : "Back to home"), React.createElement("p", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: G,
        marginBottom: 6
      }
    }, "Resume builder"), React.createElement("h1", {
      style: {
        fontSize: 30,
        fontWeight: 700,
        letterSpacing: "-1px",
        color: "#0B1220",
        marginBottom: 10
      }
    }, "Let's build your starter resume."), React.createElement("p", {
      style: {
        color: "#4A5568",
        fontSize: 14.5,
        lineHeight: 1.55,
        marginBottom: 22
      }
    }, "We'll use your quiz answers to build the structure with your real info filled in. There'll be ", React.createElement("strong", null, "[bracketed placeholders]"), " where you need to add specifics yourself \u2014 like bullets describing what you did in each activity. Honest start, not a finished resume."), !builderState.text && !builderState.loading && React.createElement("div", {
      style: {
        background: GL,
        border: `1px solid ${GM}`,
        borderRadius: var_rl,
        padding: "16px 18px",
        marginBottom: 16
      }
    }, React.createElement("p", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: GD,
        marginBottom: 10
      }
    }, "What we'll use"), React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
        fontSize: 13,
        color: "#0B1220"
      }
    }, React.createElement("p", null, React.createElement("strong", null, "Major:"), " ", ans.major || React.createElement("em", {
      style: {
        color: "#6B7280"
      }
    }, "(not set)")), React.createElement("p", null, React.createElement("strong", null, "University:"), " ", ans.university || React.createElement("em", {
      style: {
        color: "#6B7280"
      }
    }, "(not set)")), React.createElement("p", null, React.createElement("strong", null, "Graduation:"), " ", ans.gradYear || React.createElement("em", {
      style: {
        color: "#6B7280"
      }
    }, "(not set)"), " \xA0 ", React.createElement("strong", null, "GPA:"), " ", ans.gpa || React.createElement("em", {
      style: {
        color: "#6B7280"
      }
    }, "(not set)")), React.createElement("p", null, React.createElement("strong", null, "Skills:"), " ", (ans.skills || []).join(", ") || React.createElement("em", {
      style: {
        color: "#6B7280"
      }
    }, "(none listed)")), React.createElement("p", null, React.createElement("strong", null, "Activities:"), " ", extPicks.length > 0 ? extPicks.map(e => `${e.activity} (${e.role})`).join(", ") : React.createElement("em", {
      style: {
        color: "#6B7280"
      }
    }, "(none listed)")))), !builderState.text && !builderState.loading && React.createElement("button", {
      onClick: buildStarterResume,
      style: {
        width: "100%",
        background: `${G}`,
        border: "none",
        color: "#fff",
        padding: "15px",
        borderRadius: var_rl,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 15,
        fontWeight: 700,
        boxShadow: "0 1px 2px rgba(11,18,32,.06)"
      }
    }, "Build my starter resume"), builderState.error && React.createElement("p", {
      style: {
        color: CR,
        fontSize: 13,
        marginTop: 12,
        textAlign: "center"
      }
    }, builderState.error, " ", React.createElement("button", {
      onClick: buildStarterResume,
      style: {
        background: "none",
        border: "none",
        color: GD,
        textDecoration: "underline",
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 13,
        fontWeight: 700,
        marginLeft: 6
      }
    }, "Try again")), builderState.loading && React.createElement("div", {
      style: {
        textAlign: "center",
        padding: "3rem 1rem"
      }
    }, React.createElement("div", {
      style: {
        width: 42,
        height: 42,
        border: `4px solid ${GL}`,
        borderTop: `4px solid ${G}`,
        borderRadius: "50%",
        margin: "0 auto",
        animation: "spin 0.9s linear infinite"
      }
    }), React.createElement("p", {
      style: {
        marginTop: 14,
        fontSize: 14,
        color: "#4A5568",
        fontWeight: 600
      }
    }, "Drafting your resume\u2026"), React.createElement("p", {
      style: {
        marginTop: 4,
        fontSize: 12,
        color: "#6B7280"
      }
    }, "This usually takes 5\u201315 seconds.")), builderState.text && !builderState.loading && React.createElement("div", null, React.createElement("div", {
      style: {
        background: "#FEF7E6",
        border: `1px solid #F4D77E`,
        borderRadius: var_rl,
        padding: "12px 14px",
        marginBottom: 14,
        display: "flex",
        gap: 9,
        alignItems: "flex-start"
      }
    }, React.createElement("span", {
      style: {
        fontSize: 14,
        flexShrink: 0
      }
    }), React.createElement("p", {
      style: {
        fontSize: 12.5,
        lineHeight: 1.5,
        color: "#4A5568"
      }
    }, React.createElement("strong", null, "This is a starting structure \u2014 not a finished resume."), " Replace every ", React.createElement("code", {
      style: {
        background: "#fff",
        padding: "1px 5px",
        borderRadius: 3,
        fontSize: 11.5,
        color: CR
      }
    }, "[bracketed]"), " placeholder with your real information before sending it to employers. The fewer brackets, the stronger your resume.")), React.createElement("textarea", {
      value: builderState.text,
      onChange: e => setBuilderState(s => ({
        ...s,
        text: e.target.value
      })),
      spellCheck: "true",
      style: {
        width: "100%",
        minHeight: 520,
        padding: "14px",
        borderRadius: var_rl,
        border: `1.5px solid ${GM}`,
        background: "#fff",
        color: "#0B1220",
        fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
        fontSize: 13,
        lineHeight: 1.55,
        outline: "none",
        resize: "vertical",
        whiteSpace: "pre-wrap"
      }
    }), React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        marginTop: 14
      }
    }, React.createElement("button", {
      onClick: () => {
        navigator.clipboard.writeText(builderState.text);
        analytics.track("resume_builder_copied");
      },
      style: {
        flex: "1 1 140px",
        background: "#fff",
        border: `1.5px solid ${GM}`,
        color: GD,
        padding: "12px 16px",
        borderRadius: var_r,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 13.5,
        fontWeight: 700
      }
    }, "Copy text"), React.createElement("button", {
      onClick: () => {
        const blob = new Blob([builderState.text], {
          type: "text/plain"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `resume-starter-${(ans.major || "draft").split(",")[0].trim().replace(/\s+/g, "-").toLowerCase()}.txt`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 200);
        analytics.track("resume_builder_downloaded");
      },
      style: {
        flex: "1 1 140px",
        background: "#fff",
        border: `1.5px solid ${GM}`,
        color: GD,
        padding: "12px 16px",
        borderRadius: var_r,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 13.5,
        fontWeight: 700
      }
    }, "\u2B07 Download .txt"), React.createElement("button", {
      onClick: () => {
        if (isPro) {
          downloadResumeAsPdf();
        } else {
          setShowProModal(true);
          analytics.track("resume_pdf_paywall_shown");
        }
      },
      style: {
        flex: "1 1 140px",
        background: isPro ? "#fff" : "#FFF8E6",
        border: `1.5px solid ${isPro ? GM : AM}`,
        color: isPro ? GD : AM,
        padding: "12px 16px",
        borderRadius: var_r,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 13.5,
        fontWeight: 700,
        position: "relative"
      }
    }, isPro ? "⬇ Download PDF" : React.createElement(React.Fragment, null, "\u2B07 Download PDF ", React.createElement("span", {
      style: {
        fontSize: 10,
        marginLeft: 4
      }
    }, "Pro"))), React.createElement("button", {
      onClick: () => {
        saveBuilderResumeToProfile();
        setPage("results");
      },
      style: {
        flex: "1 1 100%",
        background: `${G}`,
        border: "none",
        color: "#fff",
        padding: "13px 16px",
        borderRadius: var_r,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 14,
        fontWeight: 700,
        boxShadow: "0 1px 2px rgba(11,18,32,.06)"
      }
    }, "Save to my profile & use for matches")), React.createElement("p", {
      style: {
        fontSize: 11.5,
        color: "#6B7280",
        textAlign: "center",
        marginTop: 10,
        lineHeight: 1.5
      }
    }, "Saving adds this to your saved resumes so it personalizes your match reasoning. You can edit it any time from Profile."))));
  }
  if (page === "profile") {
    if (typeof window !== "undefined" && !window.__btpToU) {
      window.__btpToU = true;
      window.location.replace("/u/#kit");
    }
    return React.createElement("div", {
      style: {
        padding: "3rem",
        textAlign: "center",
        color: "#55627A"
      }
    }, "Opening your profile\u2026");
  }
  if (page === "profile_old_unused") {
    const inp = {
      width: "100%",
      padding: "11px 13px",
      borderRadius: var_r,
      border: "1.5px solid #E2E8F0",
      background: "#FBFBFC",
      color: "#0B1220",
      fontFamily: "var(--font)",
      fontSize: 14,
      outline: "none",
      marginTop: 5
    };
    const lbl = {
      fontSize: 12,
      fontWeight: 700,
      color: "#4A5568"
    };
    const field = (label, key, placeholder, type = "text") => React.createElement("div", null, React.createElement("label", {
      style: lbl
    }, label), React.createElement("input", {
      type: type,
      value: profile[key] || "",
      placeholder: placeholder,
      onChange: e => setP(key, e.target.value),
      style: inp
    }));
    const yesno = (label, key) => React.createElement("div", null, React.createElement("label", {
      style: lbl
    }, label), React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        marginTop: 6
      }
    }, ["Yes", "No"].map(o => React.createElement("button", {
      key: o,
      onClick: () => setP(key, o),
      style: {
        flex: 1,
        background: profile[key] === o ? G : "#fff",
        border: `1.5px solid ${profile[key] === o ? G : "#E2E8F0"}`,
        color: profile[key] === o ? "#fff" : "#0B1220",
        padding: "10px",
        borderRadius: var_r,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 14,
        fontWeight: profile[key] === o ? 700 : 400
      }
    }, o))));
    return React.createElement("div", {
      style: {
        background: "#fff",
        minHeight: "100vh"
      }
    }, showProModal && React.createElement(ProModal, null), React.createElement(SignInModal, null), React.createElement(Nav, null), React.createElement("div", {
      style: {
        maxWidth: 640,
        margin: "0 auto",
        padding: "2.5rem 1.5rem"
      }
    }, React.createElement("p", {
      style: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: 600
      }
    }, "Your Profile"), React.createElement("h2", {
      style: {
        fontSize: "clamp(1.6rem,3.5vw,2.3rem)",
        fontWeight: 700,
        letterSpacing: "-1px",
        marginTop: "0.3rem",
        marginBottom: "0.4rem",
        color: "#0B1220"
      }
    }, "Fill it once. Apply faster everywhere."), React.createElement("p", {
      style: {
        color: "#4A5568",
        fontSize: 14,
        lineHeight: 1.6,
        marginBottom: "1.5rem"
      }
    }, "Save your info and Beat the Pile auto-fills a copy-paste card and a tailored cover letter on every application \u2014 so you stop retyping the same fields on fifty different sites."), React.createElement("div", {
      style: {
        background: clerkUser ? "#F0FDF4" : "#F8FAFC",
        border: `1px solid ${clerkUser ? "#86EFAC" : "#E2E8F0"}`,
        borderRadius: var_rl,
        padding: "14px 16px",
        marginBottom: 20,
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap"
      }
    }, React.createElement("div", {
      style: {
        fontSize: 24,
        flexShrink: 0
      }
    }, clerkUser ? "✓" : ""), React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 160
      }
    }, clerkUser ? React.createElement(React.Fragment, null, React.createElement("p", {
      style: {
        fontSize: 13.5,
        fontWeight: 700,
        color: "#166534"
      }
    }, "Signed in as ", clerkUser.primaryEmailAddress?.emailAddress || clerkUser.firstName || "you"), React.createElement("p", {
      style: {
        fontSize: 12,
        color: "#15803D",
        lineHeight: 1.4,
        marginTop: 2
      }
    }, syncStatus === "loading" ? "⟳ Loading your data…" : syncStatus === "saving" ? "⟳ Saving changes…" : syncStatus === "synced" ? "✓ All changes synced across your devices" : syncStatus === "error" ? "Sync had a hiccup — your changes are saved locally; we'll retry" : "Syncing your data…")) : React.createElement(React.Fragment, null, React.createElement("p", {
      style: {
        fontSize: 13.5,
        fontWeight: 700,
        color: "#0B1220"
      }
    }, "Not signed in"), React.createElement("p", {
      style: {
        fontSize: 12,
        color: "#4A5568",
        lineHeight: 1.4,
        marginTop: 2
      }
    }, "Sign in to sync your tracker, profile, and resumes across all your devices."))), clerkUser ? React.createElement("button", {
      onClick: signOut,
      style: {
        flexShrink: 0,
        background: "#fff",
        color: "#0B1220",
        border: "1.5px solid #E2E8F0",
        padding: "8px 14px",
        borderRadius: var_r,
        fontFamily: "var(--font)",
        fontSize: 12.5,
        fontWeight: 700,
        cursor: "pointer"
      }
    }, "Sign out") : React.createElement("button", {
      onClick: openSignIn,
      style: {
        flexShrink: 0,
        background: "#4F46E5",
        color: "#fff",
        border: "none",
        padding: "8px 14px",
        borderRadius: var_r,
        fontFamily: "var(--font)",
        fontSize: 12.5,
        fontWeight: 700,
        cursor: "pointer"
      }
    }, "Sign in")), React.createElement("div", {
      style: {
        background: "#FBFBFC",
        border: `1px solid ${GL}`,
        borderRadius: var_rl,
        padding: "1.5rem",
        marginBottom: 14
      }
    }, React.createElement("p", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: GD,
        marginBottom: 14
      }
    }, "Contact"), React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
        gap: 12
      }
    }, field("Full name", "fullName", "Adam Smith"), field("Email", "email", "you@email.com", "email"), field("Phone", "phone", "(555) 123-4567", "tel"), field("LinkedIn URL", "linkedin", "linkedin.com/in/you"), field("Portfolio / website (optional)", "portfolio", "yoursite.com"))), React.createElement("div", {
      style: {
        background: "#FBFBFC",
        border: `1px solid ${GL}`,
        borderRadius: var_rl,
        padding: "1.5rem",
        marginBottom: 14
      }
    }, React.createElement("p", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: GD,
        marginBottom: 14
      }
    }, "Academics"), React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
        gap: 12
      }
    }, field("School", "school", "Virginia Tech"), field("Major", "major", "Computer Science"), field("Expected graduation", "gradDate", "May 2027"), field("GPA", "gpa", "3.6"))), React.createElement("div", {
      style: {
        background: "#FBFBFC",
        border: `1px solid ${GL}`,
        borderRadius: var_rl,
        padding: "1.5rem",
        marginBottom: 14
      }
    }, React.createElement("p", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: GD,
        marginBottom: 14
      }
    }, "Common application answers"), React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
        gap: 12
      }
    }, yesno("Authorized to work in the U.S.?", "workAuth"), yesno("Willing to relocate?", "relocate"))), React.createElement("div", {
      style: {
        background: "#FBFBFC",
        border: `1px solid ${GL}`,
        borderRadius: var_rl,
        padding: "1.5rem",
        marginBottom: 14
      }
    }, React.createElement("p", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: GD,
        marginBottom: 14
      }
    }, "Make your applications stronger"), React.createElement("div", {
      style: {
        marginBottom: 12
      }
    }, React.createElement("label", {
      style: lbl
    }, "Top skills (comma separated)"), React.createElement("input", {
      value: profile.topSkills || "",
      placeholder: "Python, SQL, Excel",
      onChange: e => setP("topSkills", e.target.value),
      style: inp
    })), React.createElement("div", null, React.createElement("label", {
      style: lbl
    }, "What makes you stand out? (used in cover letters)"), React.createElement("textarea", {
      value: profile.whyMe || "",
      placeholder: "A sentence or two about your standout experience, project, or drive.",
      onChange: e => setP("whyMe", e.target.value),
      style: {
        ...inp,
        minHeight: 70,
        resize: "vertical"
      }
    }))), React.createElement("div", {
      style: {
        background: "#FBFBFC",
        border: `1px solid ${GL}`,
        borderRadius: var_rl,
        padding: "1.5rem",
        marginBottom: 14
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6
      }
    }, React.createElement("p", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: GD
      }
    }, "Your resumes"), React.createElement("button", {
      onClick: addResume,
      style: {
        background: GL,
        border: `1px solid ${GM}`,
        color: GD,
        padding: "6px 14px",
        borderRadius: var_r,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 13,
        fontWeight: 700
      }
    }, "+ Add resume")), React.createElement("p", {
      style: {
        fontSize: 12.5,
        color: "#4A5568",
        lineHeight: 1.5,
        marginBottom: 14
      }
    }, "Save multiple resumes for different kinds of roles (e.g. \"Software\" and \"Finance\"). When you apply, you'll pick which one to tailor the cover letter from."), (profile.resumes || []).length === 0 && React.createElement("div", {
      style: {
        textAlign: "center",
        padding: "1.25rem",
        border: `1.5px dashed ${GM}`,
        borderRadius: var_rl,
        color: "#6B7280",
        fontSize: 13.5
      }
    }, "No resumes yet. Tap \"+ Add resume\" to paste your first one."), React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 14
      }
    }, (profile.resumes || []).map(r => React.createElement("div", {
      key: r.id,
      style: {
        border: `1px solid ${GL}`,
        borderRadius: var_rl,
        padding: "1rem",
        background: "#fff"
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        alignItems: "center",
        marginBottom: 8
      }
    }, React.createElement("input", {
      value: r.name,
      onChange: e => updateResume(r.id, "name", e.target.value),
      placeholder: "Resume name",
      style: {
        flex: 1,
        padding: "8px 11px",
        borderRadius: var_r,
        border: `1.5px solid #E2E8F0`,
        background: "#FBFBFC",
        color: "#0B1220",
        fontFamily: "var(--font)",
        fontSize: 14,
        fontWeight: 700,
        outline: "none"
      }
    }), React.createElement("label", {
      style: {
        background: "#fff",
        border: "1.5px solid #E2E8F0",
        color: GD,
        padding: "7px 12px",
        borderRadius: var_r,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 12.5,
        fontWeight: 700,
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
        gap: 5
      }
    }, "Upload", React.createElement("input", {
      type: "file",
      accept: ".pdf,.txt,.docx",
      onChange: e => {
        handleResumeUpload(r.id, e.target.files);
        e.target.value = "";
      },
      style: {
        display: "none"
      }
    })), React.createElement("button", {
      onClick: () => deleteResume(r.id),
      "aria-label": "Delete resume",
      style: {
        background: "#fff",
        border: "1.5px solid #E2E8F0",
        color: CR,
        width: 34,
        height: 34,
        borderRadius: var_r,
        cursor: "pointer",
        fontSize: 15,
        flexShrink: 0
      }
    })), React.createElement("textarea", {
      value: r.text,
      onChange: e => updateResume(r.id, "text", e.target.value),
      placeholder: "Paste this resume's text here \u2014 or use the Upload button above to import a PDF / Word file.",
      style: {
        ...inp,
        minHeight: 90,
        resize: "vertical",
        marginTop: 0
      }
    }))), resumeUploading && React.createElement("p", {
      style: {
        fontSize: 12,
        color: GD,
        fontWeight: 600,
        marginTop: 4
      }
    }, "Reading file\u2026"), resumeUploadErr && React.createElement("p", {
      style: {
        fontSize: 12,
        color: CR,
        marginTop: 4
      }
    }, resumeUploadErr))), React.createElement("div", {
      style: {
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center"
      }
    }, React.createElement("button", {
      onClick: saveProfile,
      style: {
        background: `${G}`,
        border: "none",
        color: "#fff",
        padding: "13px 28px",
        borderRadius: var_rl,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 15,
        fontWeight: 700,
        boxShadow: "0 1px 2px rgba(11,18,32,.06)"
      }
    }, profileSaved ? "✓ Saved" : "Save profile"), React.createElement("button", {
      onClick: clearProfile,
      style: {
        background: "#fff",
        border: "1.5px solid #E2E8F0",
        color: "#4A5568",
        padding: "13px 20px",
        borderRadius: var_rl,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 14,
        fontWeight: 600
      }
    }, "Clear my data"), profileReady() && React.createElement("span", {
      style: {
        fontSize: 13,
        color: GD,
        fontWeight: 700
      }
    }, "Ready to auto-fill applications \u2713")), React.createElement("p", {
      style: {
        fontSize: 11.5,
        color: "#6B7280",
        marginTop: 16,
        lineHeight: 1.5
      }
    }, "Your profile is saved on this device only \u2014 we don't send it anywhere in this version. You can clear it anytime. (When accounts launch, this same info will sync securely to your account.)")));
  }
  if (page === "wall") {
    const relTime = iso => {
      if (!iso) return "";
      const d = new Date(iso);
      const s = Math.floor((Date.now() - d.getTime()) / 1000);
      if (s < 60) return "just now";
      if (s < 3600) return Math.floor(s / 60) + "m ago";
      if (s < 86400) return Math.floor(s / 3600) + "h ago";
      if (s < 604800) return Math.floor(s / 86400) + "d ago";
      return d.toLocaleDateString();
    };
    const remaining = 600 - (wallDraft || "").length;
    const tooShort = (wallDraft || "").trim().length < 4;
    return React.createElement("div", {
      style: {
        background: "#fff",
        minHeight: "100vh"
      }
    }, showProModal && React.createElement(ProModal, null), React.createElement(SignInModal, null), React.createElement(Nav, null), React.createElement("div", {
      style: {
        maxWidth: 680,
        margin: "0 auto",
        padding: "2rem 1.25rem 4rem"
      }
    }, React.createElement("p", {
      style: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: 600,
        marginBottom: 6
      }
    }, "Community Wall"), React.createElement("h1", {
      style: {
        fontSize: 30,
        fontWeight: 700,
        letterSpacing: "-0.8px",
        color: "#0B1220",
        marginBottom: 8
      }
    }, "You're not alone in this."), React.createElement("p", {
      style: {
        color: "#4A5568",
        fontSize: 14.5,
        lineHeight: 1.55,
        marginBottom: 22
      }
    }, "A space for the wins, the frustrations, and the questions. Posts are checked by AI moderation, so keep it real but keep it kind. Post anonymously or with your name \u2014 your choice on every post."), React.createElement("div", {
      style: {
        marginBottom: 26
      }
    }, TESTIMONIALS.length > 0 && React.createElement("p", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: "#6B7280",
        marginBottom: 10
      }
    }, "What students are saying"), React.createElement("div", {
      style: {
        display: "flex",
        gap: 10,
        overflowX: "auto",
        paddingBottom: 6,
        scrollbarWidth: "thin"
      }
    }, TESTIMONIALS.map((t, i) => React.createElement("div", {
      key: i,
      style: {
        background: "#FBFBFC",
        border: `1.5px solid ${GL}`,
        borderRadius: var_rl,
        padding: "1rem 1.1rem",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minWidth: 230,
        maxWidth: 230,
        flexShrink: 0
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        gap: 2
      }
    }, [...Array(t.stars)].map((_, j) => React.createElement("span", {
      key: j,
      style: {
        color: "#F59E0B",
        fontSize: 12
      }
    }, "\u2605"))), React.createElement("p", {
      style: {
        fontSize: 12.5,
        color: "#0B1220",
        lineHeight: 1.55,
        fontStyle: "italic",
        flex: 1
      }
    }, "\"", t.quote, "\""), React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8
      }
    }, React.createElement("div", {
      style: {
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: `${G}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10.5,
        fontWeight: 700,
        color: "#fff",
        flexShrink: 0
      }
    }, t.avatar), React.createElement("div", null, React.createElement("p", {
      style: {
        fontWeight: 700,
        fontSize: 11.5,
        color: "#0B1220"
      }
    }, t.name), React.createElement("p", {
      style: {
        fontSize: 10.5,
        color: "#6B7280"
      }
    }, t.detail))))))), React.createElement("div", {
      style: {
        background: "#FBFBFC",
        border: `1.5px solid ${GM}`,
        borderRadius: var_rl,
        padding: "16px",
        marginBottom: 24
      }
    }, React.createElement("p", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: GD,
        marginBottom: 8
      }
    }, "Share something"), React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        marginBottom: 10,
        alignItems: "center",
        flexWrap: "wrap"
      }
    }, React.createElement("button", {
      onClick: () => setWallNameMode("anon"),
      style: {
        background: wallNameMode === "anon" ? G : "transparent",
        color: wallNameMode === "anon" ? "#fff" : "#4A5568",
        border: `1.5px solid ${wallNameMode === "anon" ? G : "#E2E8F0"}`,
        padding: "5px 12px",
        borderRadius: 99,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 12.5,
        fontWeight: 700
      }
    }, "Anonymous"), React.createElement("button", {
      onClick: () => setWallNameMode("named"),
      style: {
        background: wallNameMode === "named" ? G : "transparent",
        color: wallNameMode === "named" ? "#fff" : "#4A5568",
        border: `1.5px solid ${wallNameMode === "named" ? G : "#E2E8F0"}`,
        padding: "5px 12px",
        borderRadius: 99,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 12.5,
        fontWeight: 700
      }
    }, "Use my name"), wallNameMode === "named" && React.createElement("input", {
      type: "text",
      value: wallDisplayName,
      onChange: e => setWallDisplayName(e.target.value),
      placeholder: "Display name",
      maxLength: 30,
      style: {
        flex: "1 1 140px",
        padding: "6px 10px",
        borderRadius: var_r,
        border: `1px solid #E2E8F0`,
        background: "#fff",
        color: "#0B1220",
        fontFamily: "var(--font)",
        fontSize: 13,
        outline: "none"
      }
    })), React.createElement("textarea", {
      value: wallDraft,
      onChange: e => setWallDraft(e.target.value),
      placeholder: wallNameMode === "anon" ? "Vent. Celebrate. Ask. (Anonymous.)" : "Vent. Celebrate. Ask. (Your name will be shown.)",
      maxLength: 600,
      style: {
        width: "100%",
        minHeight: 90,
        padding: "10px 12px",
        borderRadius: var_r,
        border: `1px solid #E2E8F0`,
        background: "#fff",
        color: "#0B1220",
        fontFamily: "var(--font)",
        fontSize: 14,
        lineHeight: 1.5,
        outline: "none",
        resize: "vertical"
      }
    }), React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        marginTop: 10,
        alignItems: "center",
        flexWrap: "wrap"
      }
    }, React.createElement("select", {
      value: wallCategory,
      onChange: e => setWallCategory(e.target.value),
      style: {
        padding: "7px 11px",
        borderRadius: var_r,
        border: `1px solid #E2E8F0`,
        background: "#fff",
        color: "#0B1220",
        fontFamily: "var(--font)",
        fontSize: 13,
        cursor: "pointer"
      }
    }, React.createElement("option", {
      value: ""
    }, "No category"), React.createElement("option", {
      value: "win"
    }, "Win"), React.createElement("option", {
      value: "vent"
    }, "Vent"), React.createElement("option", {
      value: "question"
    }, "Question"), React.createElement("option", {
      value: "advice"
    }, "Advice")), React.createElement("span", {
      style: {
        fontSize: 12,
        color: remaining < 50 ? remaining < 0 ? CR : AM : "#6B7280",
        marginLeft: "auto"
      }
    }, remaining, " chars left"), React.createElement("button", {
      onClick: submitWallPost,
      disabled: tooShort || wallSubmitting || remaining < 0,
      style: {
        background: tooShort || wallSubmitting || remaining < 0 ? "#E2E8F0" : `${G}`,
        color: tooShort || wallSubmitting || remaining < 0 ? "#6B7280" : "#fff",
        border: "none",
        padding: "9px 18px",
        borderRadius: var_r,
        cursor: tooShort || wallSubmitting || remaining < 0 ? "not-allowed" : "pointer",
        fontFamily: "var(--font)",
        fontSize: 13.5,
        fontWeight: 700
      }
    }, wallSubmitting ? "Posting…" : "Post")), wallMessage && React.createElement("div", {
      style: {
        marginTop: 10,
        padding: "9px 12px",
        borderRadius: var_r,
        fontSize: 12.5,
        lineHeight: 1.5,
        background: wallMessage.type === "success" ? GL : wallMessage.type === "flagged" ? "#FEF3C7" : "#FEE2E2",
        color: wallMessage.type === "success" ? GD : wallMessage.type === "flagged" ? "#92400E" : "#991B1B",
        border: `1px solid ${wallMessage.type === "success" ? GM : wallMessage.type === "flagged" ? "#FCD34D" : "#FCA5A5"}`
      }
    }, wallMessage.text)), wallLoading ? React.createElement("div", {
      style: {
        textAlign: "center",
        padding: "2rem 1rem",
        color: "#6B7280",
        fontSize: 13
      }
    }, "Loading the wall\u2026") : wallPosts.length === 0 ? React.createElement("div", {
      style: {
        background: "#F8FAFC",
        borderRadius: var_rl,
        border: `1px dashed #E2E8F0`,
        padding: "2rem 1.5rem"
      }
    }, React.createElement("p", {
      style: {
        fontSize: 28,
        textAlign: "center",
        marginBottom: 8
      }
    }), React.createElement("p", {
      style: {
        fontSize: 15,
        color: "#0B1220",
        fontWeight: 700,
        textAlign: "center",
        marginBottom: 6
      }
    }, "Quiet here right now"), React.createElement("p", {
      style: {
        fontSize: 13,
        color: "#4A5568",
        lineHeight: 1.55,
        textAlign: "center",
        marginBottom: 18,
        maxWidth: 380,
        marginLeft: "auto",
        marginRight: "auto"
      }
    }, "The first real story always feels weird to post, but it's what makes this a place. Try something like:"), React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: 420,
        margin: "0 auto"
      }
    }, React.createElement("div", {
      style: {
        background: "#fff",
        border: `1px solid #E2E8F0`,
        borderRadius: var_r,
        padding: "10px 13px"
      }
    }, React.createElement("p", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: GD,
        marginBottom: 4
      }
    }, "WIN"), React.createElement("p", {
      style: {
        fontSize: 13,
        color: "#4A5568",
        fontStyle: "italic",
        lineHeight: 1.5
      }
    }, "\"Just landed my first interview and I have no idea what I'm doing but I'm so hyped.\"")), React.createElement("div", {
      style: {
        background: "#fff",
        border: `1px solid #E2E8F0`,
        borderRadius: var_r,
        padding: "10px 13px"
      }
    }, React.createElement("p", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: GD,
        marginBottom: 4
      }
    }, "VENT"), React.createElement("p", {
      style: {
        fontSize: 13,
        color: "#4A5568",
        fontStyle: "italic",
        lineHeight: 1.5
      }
    }, "\"Applied to 47 places. Heard back from 2. Both rejections. Why is this so hard.\"")), React.createElement("div", {
      style: {
        background: "#fff",
        border: `1px solid #E2E8F0`,
        borderRadius: var_r,
        padding: "10px 13px"
      }
    }, React.createElement("p", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: GD,
        marginBottom: 4
      }
    }, "Question"), React.createElement("p", {
      style: {
        fontSize: 13,
        color: "#4A5568",
        fontStyle: "italic",
        lineHeight: 1.5
      }
    }, "\"Does anyone actually get internships from cold-emailing or is that just LinkedIn theater?\"")), React.createElement("div", {
      style: {
        background: "#fff",
        border: `1px solid #E2E8F0`,
        borderRadius: var_r,
        padding: "10px 13px"
      }
    }, React.createElement("p", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: GD,
        marginBottom: 4
      }
    }, "Advice"), React.createElement("p", {
      style: {
        fontSize: 13,
        color: "#4A5568",
        fontStyle: "italic",
        lineHeight: 1.5
      }
    }, "\"If you're stressing about the technical interview \u2014 practice OUT LOUD, not just in your head.\""))), React.createElement("p", {
      style: {
        fontSize: 11,
        color: "#6B7280",
        textAlign: "center",
        marginTop: 16,
        fontStyle: "italic"
      }
    }, "These are examples of post types \u2014 real posts from real students will appear here.")) : React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 10
      }
    }, wallPosts.map(p => {
      const author = p.display_name && p.display_name.trim() ? p.display_name : "anonymous";
      const isOpen = !!wallRepliesOpen[p.id];
      const replies = wallReplies[p.id] || [];
      const replyCount = p.reply_count || 0;
      const replyDraft = wallReplyDraft[p.id] || "";
      const replyMsg = wallReplyMessage[p.id];
      const replyTooShort = replyDraft.trim().length < 4;
      const replyRemaining = 400 - replyDraft.length;
      return React.createElement("div", {
        key: p.id,
        style: {
          background: "#fff",
          border: `1px solid #E2E8F0`,
          borderRadius: var_rl,
          padding: "14px 16px",
          position: "relative"
        }
      }, p.category && React.createElement("p", {
        style: {
          fontSize: 12,
          fontWeight: 600,
          color: GD,
          marginBottom: 6
        }
      }, p.category === "win" ? "Win" : p.category === "vent" ? "Vent" : p.category === "question" ? "Question" : p.category === "advice" ? "Advice" : p.category), React.createElement("p", {
        style: {
          fontSize: 14,
          lineHeight: 1.55,
          color: "#0B1220",
          whiteSpace: "pre-wrap"
        }
      }, p.content), React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 8,
          gap: 8,
          flexWrap: "wrap"
        }
      }, React.createElement("p", {
        style: {
          fontSize: 11,
          color: "#6B7280"
        }
      }, p.display_name ? React.createElement(React.Fragment, null, React.createElement("strong", {
        style: {
          color: "#4A5568"
        }
      }, author)) : "anonymous", " \xB7 ", relTime(p.created_at)), React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 10
        }
      }, React.createElement("button", {
        onClick: () => toggleReplies(p.id),
        style: {
          background: "none",
          border: "none",
          color: GD,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "var(--font)",
          padding: "2px 4px"
        }
      }, isOpen ? "Hide" : "Replies", replyCount > 0 ? ` (${replyCount})` : ""), !ownsPost(p.id) && React.createElement("button", {
        onClick: () => reportWallItem("post", p.id),
        style: {
          background: "none",
          border: "none",
          color: "#6B7280",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
          fontFamily: "var(--font)",
          padding: "2px 6px",
          borderRadius: 4
        },
        title: "Report this post"
      }, "Report"), ownsPost(p.id) && React.createElement("button", {
        onClick: () => deleteOwnPost(p.id),
        style: {
          background: "none",
          border: "none",
          color: "#6B7280",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
          fontFamily: "var(--font)",
          padding: "2px 6px",
          borderRadius: 4
        },
        title: "Delete your post"
      }, "Delete"))), isOpen && React.createElement("div", {
        style: {
          marginTop: 12,
          paddingTop: 12,
          borderTop: `1px solid #F1F5F4`
        }
      }, replies.length > 0 ? React.createElement("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 10
        }
      }, replies.map(r => {
        const rAuthor = r.display_name && r.display_name.trim() ? r.display_name : "anonymous";
        return React.createElement("div", {
          key: r.id,
          style: {
            background: "#F8FAFC",
            borderRadius: var_r,
            padding: "9px 12px",
            borderLeft: `3px solid ${GM}`
          }
        }, React.createElement("p", {
          style: {
            fontSize: 13,
            lineHeight: 1.5,
            color: "#0B1220",
            whiteSpace: "pre-wrap"
          }
        }, r.content), React.createElement("div", {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 5
          }
        }, React.createElement("p", {
          style: {
            fontSize: 10.5,
            color: "#6B7280"
          }
        }, r.display_name ? React.createElement("strong", {
          style: {
            color: "#4A5568"
          }
        }, rAuthor) : "anonymous", " \xB7 ", relTime(r.created_at)), ownsReply(r.id) && React.createElement("button", {
          onClick: () => deleteOwnReply(p.id, r.id),
          style: {
            background: "none",
            border: "none",
            color: "#6B7280",
            cursor: "pointer",
            fontSize: 10.5,
            fontWeight: 600,
            fontFamily: "var(--font)",
            padding: 0
          },
          title: "Delete reply"
        })));
      })) : React.createElement("p", {
        style: {
          fontSize: 12,
          color: "#6B7280",
          fontStyle: "italic",
          marginBottom: 10
        }
      }, "No replies yet. Be the first to chime in."), React.createElement("textarea", {
        value: replyDraft,
        onChange: e => setWallReplyDraft(prev => ({
          ...prev,
          [p.id]: e.target.value
        })),
        placeholder: wallNameMode === "anon" ? "Reply anonymously…" : "Reply with your name…",
        maxLength: 400,
        style: {
          width: "100%",
          minHeight: 55,
          padding: "8px 10px",
          borderRadius: var_r,
          border: `1px solid #E2E8F0`,
          background: "#fff",
          color: "#0B1220",
          fontFamily: "var(--font)",
          fontSize: 13,
          lineHeight: 1.5,
          outline: "none",
          resize: "vertical"
        }
      }), React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 6,
          flexWrap: "wrap"
        }
      }, React.createElement("span", {
        style: {
          fontSize: 11,
          color: replyRemaining < 40 ? replyRemaining < 0 ? CR : AM : "#6B7280"
        }
      }, replyRemaining, " left"), React.createElement("button", {
        onClick: () => submitReply(p.id),
        disabled: replyTooShort || wallReplySubmitting[p.id] || replyRemaining < 0,
        style: {
          marginLeft: "auto",
          background: replyTooShort || wallReplySubmitting[p.id] || replyRemaining < 0 ? "#E2E8F0" : G,
          color: replyTooShort || wallReplySubmitting[p.id] || replyRemaining < 0 ? "#6B7280" : "#fff",
          border: "none",
          padding: "6px 14px",
          borderRadius: var_r,
          cursor: replyTooShort || wallReplySubmitting[p.id] || replyRemaining < 0 ? "not-allowed" : "pointer",
          fontFamily: "var(--font)",
          fontSize: 12.5,
          fontWeight: 700
        }
      }, wallReplySubmitting[p.id] ? "Replying…" : "Reply")), replyMsg && React.createElement("div", {
        style: {
          marginTop: 6,
          padding: "6px 10px",
          borderRadius: var_r,
          fontSize: 11.5,
          lineHeight: 1.45,
          background: replyMsg.type === "flagged" ? "#FEF3C7" : "#FEE2E2",
          color: replyMsg.type === "flagged" ? "#92400E" : "#991B1B",
          border: `1px solid ${replyMsg.type === "flagged" ? "#FCD34D" : "#FCA5A5"}`
        }
      }, replyMsg.text)));
    })), React.createElement("p", {
      style: {
        fontSize: 11,
        color: "#6B7280",
        textAlign: "center",
        marginTop: 32,
        lineHeight: 1.5
      }
    }, "All posts are moderated by AI for harmful content. You can post anonymously or with a name \u2014 your choice per post. Be respectful \u2014 this is a space for honest conversation.")));
  }
  if (page === "community") {
    const shown = tipCat === "All" ? TIPS : TIPS.filter(t => t.cat === tipCat);
    return React.createElement("div", {
      style: {
        background: "#fff",
        minHeight: "100vh"
      }
    }, showProModal && React.createElement(ProModal, null), React.createElement(SignInModal, null), React.createElement(Nav, null), React.createElement("div", {
      style: {
        maxWidth: 680,
        margin: "0 auto",
        padding: "2.5rem 1.5rem"
      }
    }, React.createElement("p", {
      style: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: 600
      }
    }, "Tips & Resources"), React.createElement("h2", {
      style: {
        fontSize: "clamp(1.6rem,3.5vw,2.3rem)",
        fontWeight: 700,
        letterSpacing: "-1px",
        marginTop: "0.3rem",
        marginBottom: "0.5rem",
        color: "#0B1220"
      }
    }, "How to actually land the internship."), React.createElement("p", {
      style: {
        color: "#4A5568",
        fontSize: 14.5,
        lineHeight: 1.6,
        marginBottom: "1.5rem"
      }
    }, "Honest, no-fluff advice on timing, applications, and standing out \u2014 the stuff that actually moves the needle, in one place."), React.createElement("div", {
      style: {
        display: "flex",
        gap: 7,
        flexWrap: "wrap",
        marginBottom: "1.5rem"
      }
    }, TIP_CATS.map(c => React.createElement("button", {
      key: c,
      onClick: () => setTipCat(c),
      style: {
        background: tipCat === c ? `${G}` : "#FBFBFC",
        border: `1.5px solid ${tipCat === c ? G : "#E2E8F0"}`,
        color: tipCat === c ? "#fff" : "#4A5568",
        padding: "7px 15px",
        borderRadius: 99,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 13,
        fontWeight: tipCat === c ? 700 : 500,
        transition: "all 0.15s"
      }
    }, c))), React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 12
      }
    }, shown.map((t, i) => React.createElement("div", {
      key: i,
      className: "card-hover",
      style: {
        background: "#fff",
        border: `1px solid ${GL}`,
        borderLeft: `4px solid ${G}`,
        borderRadius: var_rl,
        padding: "1.25rem 1.4rem",
        boxShadow: "0 1px 2px rgba(11,18,32,.06)"
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 8
      }
    }, React.createElement("div", null, React.createElement("span", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: GD
      }
    }, t.cat), React.createElement("h3", {
      style: {
        fontSize: 16,
        fontWeight: 700,
        color: "#0B1220",
        letterSpacing: "-0.3px",
        lineHeight: 1.2
      }
    }, t.title))), React.createElement("p", {
      style: {
        fontSize: 14,
        color: "#4A5568",
        lineHeight: 1.65
      }
    }, t.text)))), React.createElement("div", {
      style: {
        background: `${GL}`,
        border: `1px solid ${G}25`,
        borderRadius: var_rl,
        padding: "1.5rem",
        marginTop: 18,
        textAlign: "center"
      }
    }, React.createElement("p", {
      style: {
        fontWeight: 700,
        fontSize: 17,
        color: "#0B1220",
        marginBottom: 6,
        letterSpacing: "-0.3px"
      }
    }, "Ready to put this into action?"), React.createElement("p", {
      style: {
        fontSize: 13.5,
        color: "#4A5568",
        lineHeight: 1.55,
        marginBottom: 14
      }
    }, "Get your honest odds and a tailored list of internships to apply to."), React.createElement("button", {
      onClick: () => {
        setStep(0);
        setEditStep(null);
        setPage("quiz");
        window.scrollTo(0, 0);
      },
      style: {
        background: `${G}`,
        border: "none",
        color: "#fff",
        padding: "12px 28px",
        borderRadius: var_rl,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 15,
        fontWeight: 700,
        boxShadow: "0 1px 2px rgba(11,18,32,.06)"
      }
    }, "Find my matches \u2192")), React.createElement("p", {
      style: {
        fontSize: 11.5,
        color: "#6B7280",
        lineHeight: 1.5,
        textAlign: "center",
        marginTop: 16
      }
    }, "More tips are added over time. Have one worth sharing? We'd love to hear it \u2014 reach out anytime.")));
  }
  if (page === "score") {
    const ScoreBar = ({
      label,
      value,
      verdict
    }) => {
      const pct = Math.max(0, Math.min(100, value || 0));
      const color = pct >= 70 ? G : pct >= 50 ? AM : "#E11D48";
      return React.createElement("div", {
        style: {
          marginBottom: 18
        }
      }, React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6
        }
      }, React.createElement("p", {
        style: {
          fontSize: 13,
          fontWeight: 700,
          color: "#0B1220"
        }
      }, label), React.createElement("p", {
        style: {
          fontSize: 24,
          fontWeight: 700,
          color: color,
          fontFamily: "var(--font)"
        }
      }, pct, "%")), React.createElement("div", {
        style: {
          height: 8,
          background: "#F1F5F4",
          borderRadius: 99,
          overflow: "hidden"
        }
      }, React.createElement("div", {
        style: {
          width: pct + "%",
          height: "100%",
          background: color,
          transition: "width 0.6s"
        }
      })), React.createElement("p", {
        style: {
          fontSize: 13,
          color: "#4A5568",
          marginTop: 8,
          lineHeight: 1.5
        }
      }, verdict));
    };
    const FactorList = ({
      factors
    }) => React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8
      }
    }, (factors || []).map((f, i) => React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        alignItems: "flex-start",
        gap: 9,
        padding: "10px 12px",
        background: f.good ? "#F0FDF4" : "#FEF2F2",
        border: `1px solid ${f.good ? "#86EFAC" : "#FECACA"}`,
        borderRadius: var_r
      }
    }, React.createElement("span", {
      style: {
        fontSize: 15,
        flexShrink: 0,
        marginTop: 1
      }
    }, f.good ? "✓" : "✗"), React.createElement("div", {
      style: {
        flex: 1
      }
    }, React.createElement("p", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "#0B1220"
      }
    }, f.label), React.createElement("p", {
      style: {
        fontSize: 12.5,
        color: "#4A5568",
        marginTop: 2,
        lineHeight: 1.5
      }
    }, f.note)))));
    return React.createElement("div", {
      style: {
        background: "#fff",
        minHeight: "100vh"
      }
    }, showProModal && React.createElement(ProModal, null), React.createElement(SignInModal, null), React.createElement(Nav, null), React.createElement("div", {
      style: {
        maxWidth: 760,
        margin: "0 auto",
        padding: "1.5rem 1rem 4rem"
      }
    }, React.createElement("p", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: G,
        marginBottom: 6
      }
    }, "Score a job"), React.createElement("h1", {
      style: {
        fontSize: 32,
        fontWeight: 700,
        letterSpacing: "-1px",
        color: "#0B1220",
        marginBottom: 10
      }
    }, "See what the screener sees."), React.createElement("p", {
      style: {
        color: "#4A5568",
        fontSize: 15,
        lineHeight: 1.55,
        marginBottom: 24
      }
    }, "Before a recruiter ever looks at you, software often does. Paste your resume, the job description, or both and our AI gives you an honest breakdown and real fixes. ", React.createElement("strong", null, "This is coaching: the scores are our AI's estimate, not a number from Workday, Greenhouse or any employer."), " What you paste is sent to our AI provider (Anthropic) to write the breakdown."), !scoreResult && React.createElement(React.Fragment, null, React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 18,
        marginBottom: 20
      }
    }, React.createElement("div", null, React.createElement("label", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "#0B1220",
        marginBottom: 6,
        display: "block"
      }
    }, "Your resume ", React.createElement("span", {
      style: {
        color: "#6B7280",
        fontWeight: 500
      }
    }, "(paste the text, optional but helps)")), React.createElement("textarea", {
      value: scoreResume,
      onChange: e => setScoreResume(e.target.value),
      placeholder: "Paste your resume text here...",
      style: {
        width: "100%",
        minHeight: 160,
        padding: "12px",
        borderRadius: var_r,
        border: `1.5px solid #E2E8F0`,
        background: "#FBFBFC",
        fontFamily: "var(--font)",
        fontSize: 13.5,
        lineHeight: 1.5,
        color: "#0B1220",
        resize: "vertical",
        outline: "none"
      }
    }), (profile.resumes || []).length > 0 && React.createElement("button", {
      onClick: () => {
        const r = (profile.resumes || []).find(x => x.id === chosenResumeId) || (profile.resumes || [])[0];
        if (r && r.text) setScoreResume(r.text);
      },
      style: {
        marginTop: 6,
        background: "transparent",
        border: "none",
        color: GD,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        padding: 0,
        fontFamily: "var(--font)"
      }
    }, "\u21B3 Use my saved resume")), React.createElement("div", null, React.createElement("label", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "#0B1220",
        marginBottom: 6,
        display: "block"
      }
    }, "Job description ", React.createElement("span", {
      style: {
        color: "#6B7280",
        fontWeight: 500
      }
    }, "(paste from the posting, optional but helps)")), React.createElement("textarea", {
      value: scoreJD,
      onChange: e => setScoreJD(e.target.value),
      placeholder: "Paste the job description here...",
      style: {
        width: "100%",
        minHeight: 160,
        padding: "12px",
        borderRadius: var_r,
        border: `1.5px solid #E2E8F0`,
        background: "#FBFBFC",
        fontFamily: "var(--font)",
        fontSize: 13.5,
        lineHeight: 1.5,
        color: "#0B1220",
        resize: "vertical",
        outline: "none"
      }
    }))), React.createElement("button", {
      onClick: scoreApplication,
      disabled: scoreLoading || !scoreResume.trim() && !scoreJD.trim(),
      style: {
        width: "100%",
        background: scoreLoading || !scoreResume.trim() && !scoreJD.trim() ? "#E2E8F0" : `${G}`,
        border: "none",
        color: scoreLoading || !scoreResume.trim() && !scoreJD.trim() ? "#6B7280" : "#fff",
        padding: "15px",
        borderRadius: var_rl,
        cursor: scoreLoading || !scoreResume.trim() && !scoreJD.trim() ? "not-allowed" : "pointer",
        fontFamily: "var(--font)",
        fontSize: 15,
        fontWeight: 700,
        boxShadow: scoreLoading || !scoreResume.trim() && !scoreJD.trim() ? "none" : `0 4px 16px ${G}40`
      }
    }, scoreLoading ? "Scoring your application..." : "Score this application →"), scoreError && React.createElement("p", {
      style: {
        color: "#E11D48",
        fontSize: 13,
        marginTop: 10,
        textAlign: "center"
      }
    }, scoreError), React.createElement("p", {
      style: {
        fontSize: 11.5,
        color: "#6B7280",
        textAlign: "center",
        marginTop: 12,
        lineHeight: 1.5
      }
    }, "Resume only \u2192 resume-readiness score. JD only \u2192 bar-to-clear breakdown. Both \u2192 full screener + recruiter score.")), scoreResult && React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 24
      }
    }, React.createElement("div", {
      style: {
        padding: "18px 20px",
        background: GL,
        border: `1px solid ${GM}`,
        borderRadius: var_rl
      }
    }, React.createElement("p", {
      style: {
        fontSize: 13,
        color: "#4A5568",
        lineHeight: 1.55
      }
    }, scoreResult.overallNote)), React.createElement("div", {
      style: {
        padding: "20px",
        background: "#fff",
        border: `1px solid #E2E8F0`,
        borderRadius: var_rl
      }
    }, React.createElement("p", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: "#4A5568",
        marginBottom: 6
      }
    }, "Screener round"), React.createElement("p", {
      style: {
        fontSize: 13.5,
        color: "#6B7280",
        marginBottom: 14,
        lineHeight: 1.5
      }
    }, "Many employers' application software filters before a person looks. This is our AI's estimate of how your application might do \u2014 not the employer's real score."), React.createElement(ScoreBar, {
      label: "Score",
      value: scoreResult.screenerScore,
      verdict: scoreResult.screenerVerdict
    }), React.createElement(FactorList, {
      factors: scoreResult.screenerFactors
    })), React.createElement("div", {
      style: {
        padding: "20px",
        background: "#fff",
        border: `1px solid #E2E8F0`,
        borderRadius: var_rl
      }
    }, React.createElement("p", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: "#4A5568",
        marginBottom: 6
      }
    }, "Human round"), React.createElement("p", {
      style: {
        fontSize: 13.5,
        color: "#6B7280",
        marginBottom: 14,
        lineHeight: 1.5
      }
    }, "If you pass the screener, this is how strong you look to a recruiter."), React.createElement(ScoreBar, {
      label: "Score",
      value: scoreResult.humanScore,
      verdict: scoreResult.humanVerdict
    }), React.createElement(FactorList, {
      factors: scoreResult.humanFactors
    })), scoreResult.fixes && scoreResult.fixes.length > 0 && React.createElement("div", {
      style: {
        padding: "20px",
        background: "#FEF7E6",
        border: `1px solid #F4D77E`,
        borderRadius: var_rl
      }
    }, React.createElement("p", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "#0B1220",
        marginBottom: 12
      }
    }, "Top fixes \u2014 do these before you apply"), React.createElement("ol", {
      style: {
        margin: 0,
        paddingLeft: 18,
        display: "flex",
        flexDirection: "column",
        gap: 8
      }
    }, scoreResult.fixes.map((f, i) => React.createElement("li", {
      key: i,
      style: {
        fontSize: 13,
        color: "#0B1220",
        lineHeight: 1.5
      }
    }, f)))), React.createElement("button", {
      onClick: () => {
        setScoreResult(null);
        setScoreError("");
      },
      style: {
        background: "#fff",
        border: `1.5px solid ${GL}`,
        color: "#0B1220",
        padding: "13px",
        borderRadius: var_rl,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 14,
        fontWeight: 700
      }
    }, "\u21BA Score another"))));
  }
  function moveCard(company, toStage) {
    if (!company) return;
    setTracked(p => p.map(a => {
      if (a.company !== company || (a.status || "Applied") === toStage) return a;
      analytics.track("tracker_card_moved", {
        company,
        from: a.status || "Applied",
        to: toStage
      });
      if (toStage === "Offer") {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
      return {
        ...a,
        status: toStage
      };
    }));
  }
  function toggleFlag(i) {
    setTracked(p => p.map((a, j) => {
      if (j !== i) return a;
      const on = !a.flag;
      if (on) analytics.track("tracker_followup_flagged", {
        company: a.company
      });
      return {
        ...a,
        flag: on
      };
    }));
  }
  function exportTrackerCsv() {
    if (!isPro) {
      setShowProModal(true);
      analytics.track("pro_modal_opened", {
        from: "csv_export"
      });
      return;
    }
    const cols = ["company", "role", "status", "date", "deadline", "flag"];
    const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [cols.join(","), ...tracked.map(a => cols.map(c => esc(c === "flag" ? a.flag ? "yes" : "" : a[c])).join(","))];
    const blob = new Blob([rows.join("\n")], {
      type: "text/csv"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "beatthepile-applications.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  function submitAddApp(e) {
    e.preventDefault();
    if (!addForm.company.trim()) return;
    if (!isPro && tracked.length >= 10) {
      setShowProModal(true);
      analytics.track("pro_modal_opened", {
        from: "tracker_limit"
      });
      return;
    }
    const today = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });
    setTracked(p => [...p, {
      company: addForm.company.trim(),
      role: addForm.role.trim() || "Intern",
      status: addForm.status,
      date: addForm.date || today,
      appliedAt: Date.now(),
      followedUp: false
    }]);
    analytics.track("tracker_card_added", {
      stage: addForm.status
    });
    setAddForm({
      company: "",
      role: "",
      status: "Saved",
      date: ""
    });
    setAddAppModal(false);
  }
  if (page === "dashboard") return React.createElement("div", {
    style: {
      background: "#fff",
      minHeight: "100vh"
    }
  }, showProModal && React.createElement(ProModal, null), React.createElement(SignInModal, null), followUpModal && FollowUpModal(), showConfetti && React.createElement(Confetti, null), React.createElement(Nav, null), React.createElement("div", {
    style: {
      maxWidth: 720,
      margin: "0 auto",
      padding: "2.5rem 1.5rem"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: "2rem"
    }
  }, React.createElement("div", null, React.createElement("p", {
    style: {
      fontSize: 12,
      color: "#6B7280",
      fontWeight: 600
    }
  }, "Dashboard"), React.createElement("h2", {
    style: {
      fontSize: "clamp(1.6rem,3.5vw,2.3rem)",
      fontWeight: 700,
      letterSpacing: "-1px",
      marginTop: "0.3rem",
      color: "#0B1220"
    }
  }, "Your applications.")), isPro ? React.createElement("span", {
    style: {
      background: GL,
      color: GD,
      border: `1px solid ${GM}`,
      padding: "6px 16px",
      borderRadius: 99,
      fontSize: 13,
      fontWeight: 700
    }
  }, "Pro Active") : React.createElement("button", {
    onClick: () => setShowProModal(true),
    style: {
      background: `${G}`,
      border: "none",
      color: "#fff",
      padding: "9px 20px",
      borderRadius: var_r,
      cursor: "pointer",
      fontFamily: "var(--font)",
      fontSize: 14,
      fontWeight: 700,
      boxShadow: "0 1px 2px rgba(11,18,32,.06)"
    }
  }, "Upgrade to Pro")), clerkUser ? React.createElement("a", {
    href: "/season/",
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      background: "#fff",
      border: "1px solid #E3E7ED",
      borderRadius: var_rl,
      padding: "12px 16px",
      marginBottom: 14,
      textDecoration: "none",
      color: "#0B1220"
    }
  }, React.createElement("span", {
    style: {
      fontSize: 13.5,
      lineHeight: 1.45
    }
  }, React.createElement("strong", null, "This tracker is part of My Season."), " ", React.createElement("span", {
    style: {
      color: "#5B6675"
    }
  }, "Everything here also shows there, with jobs you marked applied, follow-ups due and email reminders.")), React.createElement("span", {
    style: {
      fontSize: 13.5,
      fontWeight: 650,
      color: GD,
      whiteSpace: "nowrap"
    }
  }, "Open My Season \u2192")) : null, React.createElement(FollowUpsDueBanner, null), !clerkUser && (tracked.length > 0 || (profile.resumes || []).length > 0) && React.createElement("div", {
    style: {
      background: "#FFFBEB",
      border: "1px solid #FCD34D",
      borderLeft: `4px solid ${AM}`,
      borderRadius: var_rl,
      padding: "12px 14px",
      marginBottom: 14,
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, React.createElement("span", {
    style: {
      fontSize: 18,
      flexShrink: 0
    }
  }), React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, React.createElement("p", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: "#92400E",
      lineHeight: 1.4
    }
  }, "Your data is only on this device."), React.createElement("p", {
    style: {
      fontSize: 11.5,
      color: "#78350F",
      lineHeight: 1.4,
      marginTop: 2
    }
  }, "If you clear your browser or switch devices, your tracker and saved resumes disappear. ", React.createElement("strong", null, "Sign in to save them."))), React.createElement("button", {
    onClick: openSignIn,
    style: {
      flexShrink: 0,
      background: AM,
      color: "#fff",
      border: "none",
      padding: "8px 14px",
      borderRadius: var_r,
      fontFamily: "var(--font)",
      fontSize: 12.5,
      fontWeight: 700,
      cursor: "pointer"
    }
  }, "Sign in")), (() => {
    const dueFollowUps = tracked.filter(a => followUpStatus(a).state === "due");
    const interviews = tracked.filter(a => a.status === "Interview");
    const noApps = tracked.length === 0;
    const hasSaved = savedJobs.length > 0;
    let card = null;
    if (noApps && !hasSaved) {
      card = {
        icon: "",
        color: G,
        bg: GL,
        title: "Start by finding your matches",
        body: "You haven't tracked any applications yet. Take the quiz to get your personalized company list — then come back here to track everything in one place.",
        cta: "Find my matches →",
        action: () => {
          setStep(0);
          setPage("quiz");
        }
      };
    } else if (noApps && hasSaved) {
      card = {
        icon: "",
        color: G,
        bg: GL,
        title: `You have ${savedJobs.length} saved job${savedJobs.length > 1 ? "s" : ""} — ready to apply?`,
        body: "You've bookmarked companies from your results. The best time to apply is now — openings fill fast.",
        cta: "See saved jobs ↓",
        action: () => {
          document.getElementById("saved-jobs-section")?.scrollIntoView({
            behavior: "smooth"
          });
        }
      };
    } else if (interviews.length > 0) {
      card = {
        icon: "",
        color: AM,
        bg: AL,
        title: `You have ${interviews.length} interview${interviews.length > 1 ? "s" : ""} coming up`,
        body: "Use the Prep button on your interview entry to get tailored questions and coaching.",
        cta: "Go to tracker ↓",
        action: () => {
          document.getElementById("tracker-section")?.scrollIntoView({
            behavior: "smooth"
          });
        }
      };
    } else if (tracked.length > 0 && tracked.length < 5) {
      card = {
        icon: "",
        color: G,
        bg: GL,
        title: "Apply to more — volume matters",
        body: "Internship searches are a numbers game — most students need many applications to land a few interviews. Your results page has more matches waiting.",
        cta: "See all my matches →",
        action: () => setPage("results")
      };
    }
    if (!card) return null;
    return React.createElement("div", {
      style: {
        background: card.bg,
        border: `1.5px solid ${card.color}25`,
        borderLeft: `4px solid ${card.color}`,
        borderRadius: var_rl,
        padding: "14px 16px",
        marginBottom: "1.25rem",
        display: "flex",
        gap: 12,
        alignItems: "flex-start"
      }
    }, React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, React.createElement("p", {
      style: {
        fontWeight: 700,
        fontSize: 14,
        color: "#0B1220",
        lineHeight: 1.3
      }
    }, card.title), React.createElement("p", {
      style: {
        fontSize: 12.5,
        color: "#4A5568",
        lineHeight: 1.5,
        marginTop: 3
      }
    }, card.body), React.createElement("button", {
      onClick: card.action,
      style: {
        marginTop: 9,
        background: "none",
        border: `1.5px solid ${card.color}`,
        color: card.color,
        padding: "6px 14px",
        borderRadius: var_r,
        cursor: "pointer",
        fontFamily: "var(--font)",
        fontSize: 13,
        fontWeight: 700
      }
    }, card.cta)));
  })(), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,minmax(0,1fr))",
      gap: "0.75rem",
      marginBottom: "1.5rem"
    }
  }, [{
    l: "Applied",
    v: tracked.length,
    c: G
  }, {
    l: "Interviews",
    v: tracked.filter(a => a.status === "Interview").length,
    c: AM
  }, {
    l: "Follow-ups Due",
    v: tracked.filter(a => followUpStatus(a).state === "due").length,
    c: CR
  }].map((s, i) => React.createElement("div", {
    key: i,
    style: {
      background: "#FBFBFC",
      border: `1px solid ${GL}`,
      borderRadius: var_rl,
      padding: "1.25rem",
      position: "relative",
      overflow: "hidden"
    }
  }, React.createElement("p", {
    style: {
      fontSize: 32,
      fontWeight: 700,
      color: s.c,
      lineHeight: 1,
      letterSpacing: "-1.5px"
    }
  }, s.v), React.createElement("p", {
    style: {
      fontSize: 12,
      color: "#4A5568",
      marginTop: 6,
      fontWeight: 500
    }
  }, s.l)))), savedJobs.length > 0 && React.createElement("div", {
    id: "saved-jobs-section",
    style: {
      background: "#F5F3FF",
      border: `1.5px solid #7C3AED25`,
      borderRadius: var_rl,
      overflow: "hidden",
      marginBottom: "1rem"
    }
  }, React.createElement("div", {
    style: {
      padding: "1rem 1.25rem",
      borderBottom: "1px solid #E9D5FF",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, React.createElement("div", null, React.createElement("h3", {
    style: {
      fontWeight: 700,
      fontSize: 15,
      color: "#0B1220"
    }
  }, "Saved \u2014 haven't applied yet"), React.createElement("p", {
    style: {
      fontSize: 12,
      color: "#7C3AED",
      marginTop: 2
    }
  }, savedJobs.length, " job", savedJobs.length > 1 ? "s" : "", " saved from your matches", clerkUser ? " · also in My Season → Saved" : " on this device", " \xB7 ", React.createElement("a", {
    href: "/jobs/?view=saved",
    style: {
      color: "#7C3AED",
      fontWeight: 700
    }
  }, "Jobs-page saves \u2192"))), React.createElement("button", {
    onClick: () => setPage("results"),
    style: {
      background: "#7C3AED",
      color: "#fff",
      border: "none",
      padding: "6px 14px",
      borderRadius: var_r,
      cursor: "pointer",
      fontFamily: "var(--font)",
      fontSize: 13,
      fontWeight: 700
    }
  }, "View results \u2192")), savedJobs.map((j, i) => React.createElement("div", {
    key: i,
    style: {
      padding: "0.85rem 1.25rem",
      borderBottom: i < savedJobs.length - 1 ? "1px solid #E9D5FF" : "none",
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, React.createElement("p", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: "#0B1220",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, j.name), React.createElement("p", {
    style: {
      fontSize: 12.5,
      color: "#6B7280",
      marginTop: 2
    }
  }, j.role, " \xB7 ", j.location)), React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: "#7C3AED",
      background: "#EDE9FE",
      padding: "3px 10px",
      borderRadius: 99,
      flexShrink: 0
    }
  }, j.match, "% match"), React.createElement("button", {
    onClick: () => {
      const today = new Date().toISOString().split("T")[0];
      setTracked(p => [...p, {
        company: j.name,
        role: j.role,
        date: today,
        status: "Applied"
      }]);
      setSavedJobs(p => p.filter(x => x.name !== j.name));
      analytics.track("saved_job_applied", {
        company: j.name
      });
    },
    style: {
      flexShrink: 0,
      background: G,
      color: "#fff",
      border: "none",
      padding: "6px 13px",
      borderRadius: var_r,
      cursor: "pointer",
      fontFamily: "var(--font)",
      fontSize: 12.5,
      fontWeight: 700
    }
  }, "Mark applied"), React.createElement("button", {
    onClick: () => setSavedJobs(p => p.filter(x => x.name !== j.name)),
    title: "Remove",
    style: {
      background: "#fff",
      border: "1.5px solid #E9D5FF",
      color: "#6B7280",
      width: 30,
      height: 30,
      borderRadius: var_r,
      cursor: "pointer",
      fontSize: 13,
      flexShrink: 0,
      lineHeight: 1
    }
  }, "\u2715")))), React.createElement("div", {
    id: "tracker-section",
    style: {
      marginBottom: "1rem"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
      flexWrap: "wrap",
      gap: 8
    }
  }, React.createElement("h3", {
    style: {
      fontWeight: 700,
      fontSize: 15,
      color: "#0B1220"
    }
  }, "Application Tracker"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, React.createElement("button", {
    onClick: exportTrackerCsv,
    disabled: tracked.length === 0,
    title: isPro ? "Export as CSV" : "CSV export is a Pro feature",
    style: {
      background: "#fff",
      border: `1.5px solid ${GL}`,
      color: tracked.length === 0 ? "#CBD5E0" : GD,
      padding: "6px 14px",
      borderRadius: var_r,
      cursor: tracked.length === 0 ? "not-allowed" : "pointer",
      fontFamily: "var(--font)",
      fontSize: 13,
      fontWeight: 700,
      opacity: tracked.length === 0 ? 0.6 : 1
    }
  }, "\u2913 Export", !isPro && " "), React.createElement("button", {
    onClick: () => setAddAppModal(true),
    style: {
      background: `${G}`,
      border: "none",
      color: "#fff",
      padding: "6px 14px",
      borderRadius: var_r,
      cursor: "pointer",
      fontFamily: "var(--font)",
      fontSize: 13,
      fontWeight: 700,
      boxShadow: "0 1px 2px rgba(11,18,32,.06)"
    }
  }, "+ Add Application"))), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      overflowX: "auto",
      paddingBottom: 10,
      WebkitOverflowScrolling: "touch"
    }
  }, [{
    key: "Saved",
    tint: "#7C3AED",
    empty: "Find a role you like? Drop it here."
  }, {
    key: "Applied",
    tint: G,
    empty: "Applied somewhere? Track it."
  }, {
    key: "Interview",
    tint: AM,
    empty: "Got an interview? Move it over."
  }, {
    key: "Offer",
    tint: "#2563EB",
    empty: "Offers land here. You've got this."
  }, {
    key: "Rejected",
    tint: CR,
    empty: "Rejections happen. Keep going."
  }].map(col => {
    const items = tracked.filter(a => (a.status || "Applied") === col.key);
    const isOver = dragOverStage === col.key;
    return React.createElement("div", {
      key: col.key,
      onDragOver: e => {
        e.preventDefault();
        if (dragOverStage !== col.key) setDragOverStage(col.key);
      },
      onDragLeave: () => {
        if (dragOverStage === col.key) setDragOverStage(null);
      },
      onDrop: () => {
        moveCard(dragCompany, col.key);
        setDragCompany(null);
        setDragOverStage(null);
      },
      style: {
        flex: "0 0 230px",
        minWidth: 230,
        background: isOver ? col.tint + "12" : "#FBFBFC",
        border: `1.5px solid ${isOver ? col.tint : GL}`,
        borderRadius: var_rl,
        padding: 10,
        alignSelf: "flex-start",
        transition: "background 0.15s ease,border-color 0.15s ease"
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "2px 4px 10px"
      }
    }, React.createElement("span", {
      style: {
        width: 9,
        height: 9,
        borderRadius: "50%",
        background: col.tint,
        flexShrink: 0
      }
    }), React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: "#0B1220"
      }
    }, col.key), React.createElement("span", {
      style: {
        marginLeft: "auto",
        fontSize: 11,
        fontWeight: 700,
        color: "#6B7280",
        background: "#fff",
        border: `1px solid ${GL}`,
        borderRadius: 99,
        padding: "1px 8px"
      }
    }, items.length)), items.length === 0 && React.createElement("p", {
      style: {
        fontSize: 12,
        color: "#6B7280",
        textAlign: "center",
        padding: "18px 6px",
        lineHeight: 1.4
      }
    }, col.empty), React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 8
      }
    }, items.map(a => {
      const i = tracked.indexOf(a);
      const fu = followUpStatus(a);
      const noteText = appNotes[a.company] || "";
      const isNoteOpen = notesOpen[a.company];
      const isDragging = dragCompany === a.company;
      const dl = a.deadline ? Math.ceil((new Date(a.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null;
      return React.createElement("div", {
        key: i,
        draggable: true,
        onDragStart: e => {
          setDragCompany(a.company);
          if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
        },
        onDragEnd: () => {
          setDragCompany(null);
          setDragOverStage(null);
        },
        style: {
          background: "#fff",
          border: `1.5px solid ${GL}`,
          borderLeft: a.flag ? `3px solid ${AM}` : "3px solid transparent",
          borderRadius: var_r,
          padding: "9px 10px",
          cursor: "grab",
          opacity: isDragging ? 0.5 : 1,
          transform: isDragging ? "scale(1.02)" : "none",
          boxShadow: isDragging ? "0 10px 22px rgba(0,0,0,0.14)" : "0 1px 2px rgba(0,0,0,0.04)",
          transition: "box-shadow 0.12s ease,transform 0.12s ease"
        }
      }, React.createElement("div", {
        style: {
          display: "flex",
          justifyContent: "space-between",
          gap: 6,
          alignItems: "flex-start"
        }
      }, React.createElement("p", {
        style: {
          fontWeight: 700,
          fontSize: 13.5,
          color: "#0B1220",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0
        }
      }, a.company), React.createElement("div", {
        style: {
          display: "flex",
          gap: 3,
          flexShrink: 0
        }
      }, React.createElement("button", {
        onClick: () => toggleFlag(i),
        title: a.flag ? "Unflag" : "Flag for follow-up",
        style: {
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 13,
          color: a.flag ? AM : "#CBD5E0",
          padding: 0,
          lineHeight: 1
        }
      }), React.createElement("button", {
        onClick: () => {
          if (window.confirm(`Remove ${a.company}?`)) setTracked(p => p.filter((x, j) => j !== i));
        },
        title: "Remove",
        style: {
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 12,
          color: "#CBD5E0",
          padding: 0,
          lineHeight: 1
        }
      }, "\u2715"))), React.createElement("p", {
        style: {
          fontSize: 11.5,
          color: "#6B7280",
          marginTop: 2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }
      }, a.role), React.createElement("p", {
        style: {
          fontSize: 10.5,
          color: "#6B7280",
          marginTop: 3
        }
      }, col.key === "Saved" ? "Saved" : `Applied ${a.date || ""}`), a.deadline && React.createElement("p", {
        style: {
          fontSize: 10.5,
          fontWeight: 700,
          color: dl < 0 ? "#6B7280" : dl <= 2 ? CR : dl <= 5 ? AM : GD,
          marginTop: 2
        }
      }, a.deadline, dl !== null && (dl < 0 ? " (passed)" : dl === 0 ? " (today!)" : ` · ${dl}d`)), col.key === "Applied" && fu.state !== "unknown" && React.createElement("button", {
        onClick: () => {
          setFollowUpModal(a);
          generateFollowUp(a);
        },
        style: {
          marginTop: 7,
          width: "100%",
          background: fu.state === "due" ? `${G}` : "#fff",
          border: fu.state === "due" ? "none" : `1.5px solid ${G}`,
          color: fu.state === "due" ? "#fff" : GD,
          padding: "5px 8px",
          borderRadius: var_r,
          cursor: "pointer",
          fontFamily: "var(--font)",
          fontSize: 11.5,
          fontWeight: 700
        }
      }, fu.state === "due" ? "Follow up — due" : fu.state === "done" ? "Followed up ✓" : "Draft follow-up"), col.key === "Interview" && React.createElement("button", {
        onClick: () => generateInterviewPrep(a),
        style: {
          marginTop: 7,
          width: "100%",
          background: `${AM}`,
          border: "none",
          color: "#fff",
          padding: "5px 8px",
          borderRadius: var_r,
          cursor: "pointer",
          fontFamily: "var(--font)",
          fontSize: 11.5,
          fontWeight: 700
        }
      }, "Prep"), React.createElement("select", {
        value: col.key,
        onChange: e => moveCard(a.company, e.target.value),
        style: {
          marginTop: 7,
          width: "100%",
          fontFamily: "var(--font)",
          fontWeight: 600,
          color: "#6B7280",
          border: `1px solid ${GL}`,
          borderRadius: var_r,
          background: "#FBFBFC",
          padding: "4px 6px",
          cursor: "pointer"
        }
      }, ["Saved", "Applied", "Interview", "Offer", "Rejected"].map(s => React.createElement("option", {
        key: s,
        value: s
      }, s === col.key ? `● ${s}` : `→ Move to ${s}`))), React.createElement("button", {
        onClick: () => setNotesOpen(p => ({
          ...p,
          [a.company]: !isNoteOpen
        })),
        style: {
          marginTop: 6,
          background: "none",
          border: "none",
          color: noteText ? "#7C3AED" : "#6B7280",
          padding: 0,
          cursor: "pointer",
          fontFamily: "var(--font)",
          fontSize: 11,
          fontWeight: 600
        }
      }, isNoteOpen ? "Hide details" : noteText ? `Notes (${noteText.length})` : "+ Notes & deadline"), isNoteOpen && React.createElement("div", {
        style: {
          marginTop: 7
        }
      }, React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 5,
          marginBottom: 6
        }
      }, React.createElement("label", {
        style: {
          fontSize: 10.5,
          color: "#6B7280",
          fontWeight: 600
        }
      }, "Deadline"), React.createElement("input", {
        type: "date",
        value: a.deadline || "",
        onChange: e => setTracked(p => p.map((x, j) => j === i ? {
          ...x,
          deadline: e.target.value
        } : x)),
        style: {
          padding: "2px 6px",
          border: "1.5px solid #E2E8F0",
          borderRadius: var_r,
          color: "#0B1220",
          background: "#FBFBFC",
          fontFamily: "var(--font)",
          cursor: "pointer"
        }
      })), React.createElement("textarea", {
        value: noteText,
        onChange: e => setAppNotes(p => ({
          ...p,
          [a.company]: e.target.value
        })),
        placeholder: "Recruiter name, portal link, screen notes\u2026",
        style: {
          width: "100%",
          minHeight: 54,
          padding: "7px 9px",
          borderRadius: var_r,
          border: `1.5px solid #7C3AED30`,
          background: "#FAF5FF",
          color: "#0B1220",
          fontFamily: "var(--font)",
          lineHeight: 1.5,
          outline: "none",
          resize: "vertical"
        }
      })));
    })));
  }))), React.createElement("div", {
    style: {
      background: `${GL}`,
      border: `1.5px solid ${G}25`,
      borderRadius: var_rl,
      padding: "1.5rem 1.75rem"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 10
    }
  }, React.createElement("h3", {
    style: {
      fontWeight: 700,
      fontSize: 17,
      letterSpacing: "-0.4px",
      color: "#0B1220"
    }
  }, "Smart follow-ups")), React.createElement("p", {
    style: {
      color: "#4A5568",
      fontSize: 14,
      lineHeight: 1.6,
      marginBottom: 14
    }
  }, "Most students never follow up \u2014 and a short, polite one keeps you on the recruiter's radar. Beat the Pile tracks the timing for you and, when an application hits the 5-day mark, drafts a tailored follow-up email you send from your own inbox. You stay the sender; we handle the reminder and the words."), React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      flexWrap: "wrap",
      fontSize: 12.5,
      color: GD,
      fontWeight: 700
    }
  }, React.createElement("span", null, "\u2713 Timed automatically"), React.createElement("span", null, "\u2713 Drafted for each role"), React.createElement("span", null, "\u2713 Sent by you, as you")), React.createElement("div", {
    style: {
      background: "#fff",
      border: `1px solid ${GM}`,
      borderRadius: var_r,
      padding: "10px 12px",
      marginTop: 14
    }
  }, React.createElement("p", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: GD,
      marginBottom: 5
    }
  }, "How reminders work"), React.createElement("p", {
    style: {
      fontSize: 12.5,
      color: "#4A5568",
      lineHeight: 1.55
    }
  }, "Reminders show ", React.createElement("strong", null, "inside Beat the Pile"), " (the amber banner on your Dashboard and Results page + red badges on each due application). We don't send reminder emails yet, so check back every few days \u2014 or add each follow-up to your calendar from ", React.createElement("a", {
    href: "/season/",
    style: {
      color: GD
    }
  }, "My Season"), ". ", React.createElement("span", {
    style: {
      color: "#6B7280"
    }
  }, "Email reminders are on the roadmap."))), !isPro && React.createElement("p", {
    style: {
      fontSize: 12,
      color: "#6B7280",
      marginTop: 12,
      lineHeight: 1.5
    }
  }, "Free includes follow-up timing + drafts. Pro will add real email/text reminders so you don't have to check back manually.")), prepModal && React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(10,22,40,0.65)",
      zIndex: 500,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      padding: "1.5rem 1rem",
      backdropFilter: "blur(4px)",
      overflowY: "auto"
    },
    onClick: () => setPrepModal(null)
  }, React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      background: "#fff",
      borderRadius: var_rxl,
      padding: "2rem",
      maxWidth: 580,
      width: "100%",
      boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
      animation: "pop 0.25s ease",
      margin: "auto 0"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 16
    }
  }, React.createElement("div", null, React.createElement("p", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: "#6B7280"
    }
  }, "Interview Prep"), React.createElement("h3", {
    style: {
      fontWeight: 700,
      fontSize: 19,
      color: "#0B1220",
      letterSpacing: "-0.4px",
      marginTop: 2
    }
  }, prepModal.company), React.createElement("p", {
    style: {
      fontSize: 13,
      color: "#4A5568"
    }
  }, prepModal.role)), React.createElement("button", {
    onClick: () => setPrepModal(null),
    style: {
      background: "none",
      border: "none",
      fontSize: 22,
      color: "#6B7280",
      cursor: "pointer",
      lineHeight: 1
    }
  }, "\xD7")), prepLoading && React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "2.5rem 1rem"
    }
  }, React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      border: `3px solid ${GL}`,
      borderTop: `3px solid ${AM}`,
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
      margin: "0 auto 12px"
    }
  }), React.createElement("p", {
    style: {
      color: "#4A5568",
      fontSize: 14
    }
  }, "Generating prep questions for ", prepModal.company, "\u2026")), prepResult && !prepLoading && React.createElement(React.Fragment, null, prepResult.tips && prepResult.tips.length > 0 && React.createElement("div", {
    style: {
      background: AL,
      border: `1px solid ${AM}25`,
      borderRadius: var_r,
      padding: "12px 14px",
      marginBottom: 16
    }
  }, React.createElement("p", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      color: AM,
      marginBottom: 8
    }
  }, "Before you go in"), prepResult.tips.map((t, i) => React.createElement("p", {
    key: i,
    style: {
      fontSize: 13,
      color: "#0B1220",
      lineHeight: 1.5,
      marginBottom: i < prepResult.tips.length - 1 ? 6 : 0
    }
  }, "\u2192 ", t))), React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, prepResult.questions.map((q, i) => React.createElement("div", {
    key: i,
    style: {
      background: "#FBFBFC",
      border: `1.5px solid ${GL}`,
      borderRadius: var_r,
      padding: "12px 14px"
    }
  }, React.createElement("p", {
    style: {
      fontWeight: 700,
      fontSize: 14,
      color: "#0B1220",
      lineHeight: 1.4,
      marginBottom: 8
    }
  }, i + 1, ". ", q.q), React.createElement("p", {
    style: {
      fontSize: 12.5,
      color: "#4A5568",
      lineHeight: 1.55,
      background: GL,
      borderRadius: var_r,
      padding: "8px 10px"
    }
  }, q.framework)))), React.createElement("button", {
    onClick: () => setPrepModal(null),
    style: {
      width: "100%",
      marginTop: 16,
      background: AM,
      border: "none",
      color: "#fff",
      padding: "13px",
      borderRadius: var_rl,
      cursor: "pointer",
      fontFamily: "var(--font)",
      fontSize: 15,
      fontWeight: 700
    }
  }, "Got it \u2014 I'm ready ")))), addAppModal && React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(10,22,40,0.65)",
      zIndex: 500,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      padding: "1.5rem 1rem",
      backdropFilter: "blur(4px)",
      overflowY: "auto"
    },
    onClick: () => setAddAppModal(false)
  }, React.createElement("form", {
    onClick: e => e.stopPropagation(),
    onSubmit: submitAddApp,
    style: {
      background: "#fff",
      borderRadius: var_rxl,
      padding: "1.75rem",
      maxWidth: 420,
      width: "100%",
      boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
      animation: "pop 0.25s ease",
      margin: "auto 0"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 16
    }
  }, React.createElement("h3", {
    style: {
      fontWeight: 700,
      fontSize: 19,
      color: "#0B1220",
      letterSpacing: "-0.4px"
    }
  }, "Add Application"), React.createElement("button", {
    type: "button",
    onClick: () => setAddAppModal(false),
    style: {
      background: "none",
      border: "none",
      fontSize: 22,
      color: "#6B7280",
      cursor: "pointer",
      lineHeight: 1
    }
  }, "\xD7")), React.createElement("label", {
    style: {
      display: "block",
      fontSize: 12,
      fontWeight: 600,
      color: "#4A5568",
      marginBottom: 4
    }
  }, "Company *"), React.createElement("input", {
    value: addForm.company,
    onChange: e => setAddForm(f => ({
      ...f,
      company: e.target.value
    })),
    autoFocus: true,
    placeholder: "e.g. Google",
    style: {
      width: "100%",
      marginBottom: 12,
      padding: "9px 11px",
      border: `1.5px solid ${GL}`,
      borderRadius: var_r,
      color: "#0B1220",
      background: "#FBFBFC",
      fontFamily: "var(--font)",
      outline: "none"
    }
  }), React.createElement("label", {
    style: {
      display: "block",
      fontSize: 12,
      fontWeight: 600,
      color: "#4A5568",
      marginBottom: 4
    }
  }, "Role"), React.createElement("input", {
    value: addForm.role,
    onChange: e => setAddForm(f => ({
      ...f,
      role: e.target.value
    })),
    placeholder: "e.g. Marketing Intern",
    style: {
      width: "100%",
      marginBottom: 12,
      padding: "9px 11px",
      border: `1.5px solid ${GL}`,
      borderRadius: var_r,
      color: "#0B1220",
      background: "#FBFBFC",
      fontFamily: "var(--font)",
      outline: "none"
    }
  }), React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginBottom: 18
    }
  }, React.createElement("div", {
    style: {
      flex: 1
    }
  }, React.createElement("label", {
    style: {
      display: "block",
      fontSize: 12,
      fontWeight: 600,
      color: "#4A5568",
      marginBottom: 4
    }
  }, "Stage"), React.createElement("select", {
    value: addForm.status,
    onChange: e => setAddForm(f => ({
      ...f,
      status: e.target.value
    })),
    style: {
      width: "100%",
      padding: "9px 10px",
      border: `1.5px solid ${GL}`,
      borderRadius: var_r,
      color: "#0B1220",
      background: "#FBFBFC",
      fontFamily: "var(--font)",
      cursor: "pointer"
    }
  }, ["Saved", "Applied", "Interview", "Offer", "Rejected"].map(s => React.createElement("option", {
    key: s,
    value: s
  }, s)))), React.createElement("div", {
    style: {
      flex: 1
    }
  }, React.createElement("label", {
    style: {
      display: "block",
      fontSize: 12,
      fontWeight: 600,
      color: "#4A5568",
      marginBottom: 4
    }
  }, "Date"), React.createElement("input", {
    type: "date",
    value: addForm.date,
    onChange: e => setAddForm(f => ({
      ...f,
      date: e.target.value
    })),
    style: {
      width: "100%",
      padding: "8px 10px",
      border: `1.5px solid ${GL}`,
      borderRadius: var_r,
      color: "#0B1220",
      background: "#FBFBFC",
      fontFamily: "var(--font)",
      cursor: "pointer"
    }
  }))), React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-end",
      gap: 8
    }
  }, React.createElement("button", {
    type: "button",
    onClick: () => setAddAppModal(false),
    style: {
      background: "#fff",
      border: `1.5px solid ${GL}`,
      color: "#4A5568",
      padding: "10px 18px",
      borderRadius: var_r,
      cursor: "pointer",
      fontFamily: "var(--font)",
      fontSize: 14,
      fontWeight: 700
    }
  }, "Cancel"), React.createElement("button", {
    type: "submit",
    disabled: !addForm.company.trim(),
    style: {
      background: addForm.company.trim() ? `${G}` : "#CBD5E0",
      border: "none",
      color: "#fff",
      padding: "10px 20px",
      borderRadius: var_r,
      cursor: addForm.company.trim() ? "pointer" : "not-allowed",
      fontFamily: "var(--font)",
      fontSize: 14,
      fontWeight: 700
    }
  }, "Add")))), /[?&]dev=1/.test(location.search) && React.createElement("details", {
    style: {
      marginTop: 14,
      background: "#0B1220",
      borderRadius: var_rl,
      padding: "0.5rem 1rem",
      color: "#fff"
    }
  }, React.createElement("summary", {
    style: {
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      padding: "8px 0",
      listStyle: "none"
    }
  }, "Founder stats (this device only)"), React.createElement("div", {
    style: {
      paddingBottom: 12
    }
  }, (() => {
    const s = analytics.read();
    const keys = ["quiz_completed", "return_visit", "email_captured", "application_started", "application_tracked", "followup_generated", "followup_marked_sent", "cover_letter_generated", "pro_modal_opened", "pro_upgrade_clicked"];
    return React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
        gap: 8,
        marginBottom: 10
      }
    }, keys.map(k => React.createElement("div", {
      key: k,
      style: {
        background: "rgba(255,255,255,0.06)",
        borderRadius: var_r,
        padding: "8px 10px"
      }
    }, React.createElement("p", {
      style: {
        fontSize: 20,
        fontWeight: 700,
        color: "#fff",
        lineHeight: 1
      }
    }, s[k] || 0), React.createElement("p", {
      style: {
        fontSize: 10.5,
        color: "#6B7280",
        marginTop: 3
      }
    }, k.replace(/_/g, " ")))));
  })(), React.createElement("p", {
    style: {
      fontSize: 11,
      color: "#6B7280",
      lineHeight: 1.5
    }
  }, "These counts are from ", React.createElement("strong", null, "this browser only"), " \u2014 useful for testing that events fire. For real cross-user analytics, add Plausible or PostHog at the marked line in the analytics helper (one line). Remove this panel before public launch.")))));
  return null;
}
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      msg: ""
    };
  }
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      msg: error && error.message || "Unexpected error"
    };
  }
  componentDidCatch(error, info) {
    try {
      console.error("[iq] render error caught by boundary:", error, info && info.componentStack);
      if (typeof window !== "undefined" && window.btpTrack) {
        window.btpTrack("app_error", {
          message: error && error.message || "",
          stack: (error && error.stack || "").slice(0, 600)
        });
      }
    } catch (e) {}
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return React.createElement('div', {
      style: {
        minHeight: "100vh",
        background: "#FBFBFC",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
      }
    }, React.createElement('div', {
      style: {
        background: "#fff",
        border: "1px solid #EEF6F2",
        borderRadius: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
        padding: "2rem 1.75rem",
        maxWidth: 440,
        width: "100%",
        textAlign: "center"
      }
    }, React.createElement('div', {
      style: {
        width: 48,
        height: 48,
        margin: "0 auto 14px",
        background: "#0B7A55",
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 24
      }
    }, ""), React.createElement('h2', {
      style: {
        fontSize: 20,
        fontWeight: 700,
        color: "#0B1220",
        margin: "0 0 6px",
        letterSpacing: "-0.4px"
      }
    }, "Something went wrong"), React.createElement('p', {
      style: {
        fontSize: 13.5,
        color: "#4A5568",
        lineHeight: 1.55,
        margin: "0 0 18px"
      }
    }, "The app hit an unexpected error. Your saved progress is safe — try again, or reload the page."), React.createElement('div', {
      style: {
        display: "flex",
        gap: 8,
        justifyContent: "center",
        flexWrap: "wrap"
      }
    }, React.createElement('button', {
      onClick: () => this.setState({
        hasError: false,
        msg: ""
      }),
      style: {
        background: "#0B7A55",
        border: "none",
        color: "#fff",
        padding: "11px 22px",
        borderRadius: 10,
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 14,
        fontWeight: 700,
        boxShadow: "0 1px 2px rgba(11,18,32,.06)"
      }
    }, "Try again"), React.createElement('button', {
      onClick: () => {
        try {
          location.reload();
        } catch (e) {}
      },
      style: {
        background: "#fff",
        border: "1.5px solid #E2E8F0",
        color: "#4A5568",
        padding: "11px 22px",
        borderRadius: 10,
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 14,
        fontWeight: 700
      }
    }, "Reload page")), this.state.msg && React.createElement('p', {
      style: {
        fontSize: 11,
        color: "#6B7280",
        marginTop: 16,
        fontFamily: "monospace",
        wordBreak: "break-word"
      }
    }, this.state.msg)));
  }
}
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(AppErrorBoundary, null, React.createElement(App)));
