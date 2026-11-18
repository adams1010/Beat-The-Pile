// Long-form videos built from REAL screenshots of beatthepile.com (captured Nov 18 2026, shots/*.jpg, 800x1734).
// Layout: navy caption band on top (0..TOP), the real app screen below, panned/zoomed smoothly (no bounce),
// lime spotlight boxes, finger taps, step tags. Loaded by anim.html after series.js.
(function(){
const NAVY="#060A2C", LIME="#B0F701";
const TOP=400, SW=1080, SH=1920-TOP, IMGW=800;
const SHOT=n=>`file:///home/claude/ads/shots/${n}.jpg`;
const st=document.createElement("style"); st.textContent=`
.rcap{position:absolute;left:0;right:0;top:0;height:${TOP}px;background:${NAVY};color:#fff;padding:120px 70px 0 70px;z-index:20}
.rcap .rc1{font-size:70px;font-weight:900;letter-spacing:-2px;line-height:1.06}
.rcap .rc1 .l{color:${LIME}}
.rcap .rs1{font-size:36px;color:#C9CEE0;margin-top:14px;font-weight:600}
.rtag{position:absolute;right:60px;top:70px;background:${LIME};color:${NAVY};font-weight:900;font-size:40px;padding:8px 24px;border-radius:999px;z-index:25;font-feature-settings:'tnum'}
.rtag.d{background:#fff}
.rscr{position:absolute;left:0;top:${TOP}px;width:${SW}px;height:${SH}px;overflow:hidden;background:#EEF1F6}
.rscr img{position:absolute;left:0;top:0;transform-origin:0 0}
.rhl{position:absolute;border:7px solid ${LIME};border-radius:18px;z-index:5}
.rdim{position:absolute;inset:0;z-index:4}
.rex{position:absolute;left:50px;top:${TOP+30}px;font-size:30px;font-weight:800;background:#fff;color:${NAVY};padding:8px 20px;border-radius:999px;border:2px solid #DCE1EA;z-index:30}
.rnum{position:absolute;inset:0;background:${NAVY};color:#fff;display:flex;flex-direction:column;justify-content:center;padding:0 90px}
.rnum .n{font-size:300px;font-weight:900;color:${LIME};letter-spacing:-10px;line-height:.9}
.rnum .t{font-size:88px;font-weight:900;letter-spacing:-3px;line-height:1.02;margin-top:30px}
.rprog{position:absolute;left:70px;right:70px;top:${TOP-34}px;height:10px;border-radius:5px;background:rgba(255,255,255,.18);z-index:21}
.rprog i{position:absolute;left:0;top:0;bottom:0;border-radius:5px;background:${LIME}}
`; document.head.appendChild(st);
const lerp=(a,b,p)=>a+(b-a)*p;
// one real-screen beat
function screenBeat(t, b){
  const p=io(P(t, b.panAt?.[0] ?? .2, b.panAt?.[1] ?? Math.max(.4, b.d-.5)));
  const A=b.from, B=b.to||b.from;
  const w=lerp(A.w,B.w,p), x=lerp(A.x,B.x,p), y=lerp(A.y,B.y,p), s=SW/w;
  const map=(ix,iy)=>[(ix-x)*s,(iy-y)*s];
  let hl="", dim="";
  for(const h of (b.hl||[])){ const [hx,hy,hw,hh,at=0.6]=h; const q=out(P(t,at,at+.35)); if(q<=0) continue;
    const [X,Y]=map(hx,hy), W=hw*s, H=hh*s;
    hl+=`<div class="rhl" style="left:${X-10}px;top:${Y-10}px;width:${W+20}px;height:${H+20}px;opacity:${q}"></div>`;
    dim=`<svg class="rdim" width="${SW}" height="${SH}" style="opacity:${.6*q}"><defs><mask id="m"><rect width="100%" height="100%" fill="white"/><rect x="${X-10}" y="${Y-10}" width="${W+20}" height="${H+20}" rx="18" fill="black"/></mask></defs><rect width="100%" height="100%" fill="${NAVY}" mask="url(#m)"/></svg>`; }
  let f="";
  if(b.taps){ const pts=[], taps=[]; for(const [ix,iy,tt] of b.taps){ const [X,Y]=map(ix,iy); pts.push([tt-.45,X+40,Y+260>SH?Y-200:Y+220],[tt-.05,X,Y]); taps.push(tt); }
    pts.sort((a,b)=>a[0]-b[0]); f=finger(t,{pts:pts.map(([tt,X,Y])=>[tt,X,Y]),taps,end:Math.max(...taps)+.6}); }
  const img=`<img src="${SHOT(b.img)}" style="width:${IMGW}px;transform:translate(${-x*s}px,${-y*s}px) scale(${s})">`;
  const capIn=out(P(t,0,.25));
  const cap=`<div class="rcap"><div class="rc1" style="opacity:${capIn};transform:translateY(${(1-capIn)*20}px)">${b.cap}</div>${b.sub?`<div class="rs1" style="opacity:${out(P(t,.25,.5))}">${b.sub}</div>`:""}</div>`;
  return `<div class="sc">${cap}<div class="rscr">${img}${dim}${hl}${f}</div>${b.ex?`<div class="rex">Example</div>`:""}</div>`;
}
function numCard(t, n, title){ const p=out(P(t,0,.25)); return `<div class="rnum"><div class="n" style="opacity:${p}">#${n}</div><div class="t" style="opacity:${out(P(t,.12,.4))};transform:translateY(${(1-out(P(t,.12,.4)))*30}px)">${title}</div></div>`; }
function hookCard(t, lines, sub, lime=true){ const p=out(P(t,0,.2));
  return `<div class="sc" style="background:${lime?LIME:NAVY};color:${lime?NAVY:'#fff'}"><div style="position:absolute;left:80px;right:80px;top:520px">
   <div style="font-size:110px;font-weight:900;letter-spacing:-4px;line-height:1.02;opacity:${p}">${emo(lines)}</div>
   ${sub?`<div style="font-size:52px;font-weight:800;margin-top:44px;opacity:${out(P(t,.6,.9))}">${emo(sub)}</div>`:""}</div></div>`; }
// run a list of beats; each beat {d, kind:'screen'|'num'|'hook'|'cta'|'fn', ...}
function run(t, beats, opts={}){
  let a=0, h="";
  for(const b of beats){ if(t<a+b.d){ const d=t-a;
      h = b.kind==="num" ? numCard(d,b.n,b.title) : b.kind==="hook" ? hookCard(d,b.text,b.sub,b.lime!==false) : b.kind==="cta" ? btpCTA(d,b.kw,b.line) : b.kind==="fn" ? b.fn(d) : screenBeat(d,b);
      if(d<.06&&a>0) h+=`<div class="flash" style="opacity:${.35*(1-d/.06)}"></div>`;
      if(opts.tag) h+=opts.tag(t,b); break; }
    a+=b.d; }
  return h;
}
const full=(y=0)=>({x:0,y,w:800});
const zoom=(x,y,w)=>({x,y,w});
const lenOf=bs=>bs.reduce((s,b)=>s+b.d,0);
const R={};

// ---------- VIDEO A: "5 things on this site that feel illegal to know" (listicle countdown) ----------
// Window rule: never show image y > 1440 (the painted-out help button + tab bar live below that).
const A=[
 {kind:"hook", d:2.6, text:"5 things on this site that feel <span style='color:#fff'>illegal</span> to know as a college student 😳", sub:"#1 changes how you apply."},
 {kind:"num", d:1.0, n:5, title:"An AI interviewer that grades you"},
 {img:"interview_setup", d:2.6, from:full(140), to:full(300), cap:"Type <span class='l'>any company</span>.", sub:"Lockheed Martin, mechanical engineering intern.", hl:[[65,812,670,78,.9]]},
 {img:"interview_q", d:2.8, from:full(150), to:zoom(20,250,760), cap:"It asks you <span class='l'>real</span> questions.", sub:"About THAT company. On a clock.", hl:[[30,340,650,340,1.2]]},
 {img:"interview_coach", d:3.4, from:zoom(25,60,750), to:zoom(25,100,750), cap:"Then it <span class='l'>grades</span> every answer.", sub:"Example answer · grade is an AI estimate", hl:[[30,648,740,446,1.3]], ex:true},
 {kind:"num", d:1.0, n:4, title:"Know when internships open"},
 {img:"radar", d:3.4, from:full(80), to:zoom(10,300,780), cap:"<span class='l'>46%</span> of companies opened Summer 2027 earlier than last year.", sub:"The Opening Radar shows you when.", hl:[[30,389,740,195,.8]]},
 {img:"radar", d:2.4, from:zoom(10,300,780), to:full(314), cap:"Get reminded a week <span class='l'>before</span> it opens.", hl:[[61,1310,369,71,.6]]},
 {kind:"num", d:1.0, n:3, title:"Career Fair Mode"},
 {img:"fair_list", d:2.6, from:full(40), to:full(120), cap:"Every company at your fair.", sub:"Engineering Expo · 200 employers", hl:[[364,290,276,62,.8]]},
 {img:"fair_booz", d:3.0, from:full(60), to:full(300), cap:"Tap one. See <span class='l'>every internship</span> they have open.", sub:"Booz Allen: 68 right now.", taps:[[400,170,.5]], hl:[[30,120,740,130,.3]]},
 {kind:"num", d:1.0, n:2, title:"Every job near your campus"},
 {img:"jobs_near", d:2.8, from:full(80), to:zoom(20,330,760), cap:"<span class='l'>288 jobs</span> within 50 miles of Virginia Tech.", hl:[[55,615,630,80,.6],[150,858,150,48,1.6]]},
 {img:"map_dc_tap", d:3.4, from:full(200), to:full(300), cap:"Tap a dot on the map.", sub:"1,551 jobs within 10 mi of DC.", taps:[[398,662,.6]], hl:[[95,1056,610,370,1.4]]},
 {kind:"num", d:1.0, n:1, title:"Straight from the company"},
 {img:"map_dc", d:3.2, from:full(150), to:full(220), cap:"<span class='l'>112,659</span> jobs, pulled from <span class='l'>6,006</span> companies' own job boards.", sub:"No reposts. Checked every few hours.", hl:[[85,245,630,95,.6]]},
 {img:"jobs_golf", d:3.0, from:full(150), to:full(300), cap:"Internships. First jobs. <span class='l'>Summer jobs</span> too.", sub:"Every major.", hl:[[460,505,280,72,.7]]},
 {kind:"cta", d:3.6, kw:"JOBS", line:"and I'll DM you the link"},
];
R.A={len:lenOf(A), f:t=>run(t,A), cuts:[], taps:[]};

// ---------- VIDEO B: "Finding jobs near campus, speedrun" (stopwatch POV) ----------
const B=[
 {kind:"hook", d:2.4, text:"POV: you find <span style='color:#fff'>288 jobs</span> near campus before your coffee's ready ☕", sub:"Watch this 👇"},
 {img:"home_map", d:3.0, from:full(70), to:full(170), cap:"Open Beat the Pile.", sub:"Every dot is a real job.", hl:[[90,985,620,85,1.2]]},
 {img:"map_dc", d:2.6, from:full(220), to:zoom(80,500,640), cap:"Zoom in.", sub:"East coast, packed.", taps:[[279,896,.5]]},
 {img:"map_dc_tap", d:3.0, from:full(240), to:full(300), cap:"Tap a city.", sub:"1,551 jobs within 10 miles.", taps:[[398,662,.4]], hl:[[95,1056,610,370,1.1]]},
 {img:"jobs_near", d:3.4, from:full(60), to:full(220), cap:"Or search your <span class='l'>ZIP</span>.", sub:"288 jobs within 50 mi of 24060.", hl:[[55,615,630,80,.5],[150,858,150,48,1.6]]},
 {img:"jobs_marketing", d:3.2, from:full(60), to:full(250), cap:"Filter by <span class='l'>your major</span>.", sub:"Marketing: 734 internships.", hl:[[55,615,640,85,.6]]},
 {img:"jobs_golf", d:3.0, from:full(120), to:full(300), cap:"Need a summer job instead?", sub:"Golf courses, resorts, restaurants.", hl:[[150,765,470,55,.7]]},
 {img:"jobs_near", d:2.6, from:zoom(40,540,600), to:zoom(40,560,600), cap:"Tap Apply.", sub:"It goes to the <span class='l'>company's own site</span>.", taps:[[300,965,.8]], hl:[[57,930,495,70,.5]]},
 {kind:"fn", d:2.4, fn:t=>`<div class="sc navy"><div style="position:absolute;left:0;right:0;top:600px;text-align:center"><div style="font-size:90px;font-weight:900;letter-spacing:-3px;opacity:${out(P(t,0,.25))}">That's it.</div><div style="font-size:200px;font-weight:900;color:${LIME};letter-spacing:-8px;opacity:${out(P(t,.15,.4))}">288 jobs</div><div style="font-size:52px;color:#C9CEE0;font-weight:700;opacity:${out(P(t,.5,.8))}">near campus. Coffee's still brewing.</div></div></div>`},
 {kind:"cta", d:3.6, kw:"MAP", line:"and I'll DM you the map"},
];
const clockB=(t,b)=>{ if(b.kind) return ""; const c=Math.min(t-2.4,22); const s=Math.floor(c), cs=Math.floor((c%1)*100); return `<div class="rtag d">0:${String(s).padStart(2,"0")}.${String(cs).padStart(2,"0")}</div>`; };
R.B={len:lenOf(B), f:t=>run(t,B)};

// ---------- VIDEO C: "Watch an AI grade a Lockheed Martin interview answer" (tutorial with a payoff) ----------
const C=[
 {kind:"hook", d:2.6, text:"Watch an AI grade a <span style='color:#fff'>Lockheed Martin</span> interview answer 👀", sub:"Stay for the grade."},
 {img:"interview_setup", d:3.0, from:full(0), to:full(160), cap:"Step 1: type the company and role.", hl:[[65,812,670,78,.6],[65,960,670,78,1.3]]},
 {img:"interview_brief", d:3.2, from:full(120), to:zoom(40,420,720), cap:"It briefs you on the company first.", sub:"AI summary · check their site before you quote it", hl:[[66,480,668,576,.7]]},
 {img:"interview_setup", d:2.6, from:zoom(50,440,700), to:zoom(50,455,700), cap:"Pick behavioral, technical or mixed.", sub:"3, 5 or 8 questions.", hl:[[65,1109,670,80,.5],[65,1259,670,81,1.3]]},
 {img:"interview_q", d:3.4, from:full(100), to:zoom(20,320,760), cap:"Step 2: answer <span class='l'>on the clock</span>.", sub:"10 seconds to think. 1:30 to talk or type.", hl:[[40,720,720,80,1.0]]},
 {img:"interview_q", d:2.6, from:zoom(20,300,760), to:zoom(20,300,760), cap:"The question is about <span class='l'>that</span> company.", hl:[[30,340,650,340,.3]]},
 {img:"interview_coach", d:3.2, from:zoom(25,40,750), to:zoom(25,100,750), cap:"Our example answer:", sub:"Specific project, a number, a result.", hl:[[118,242,652,390,.5]], ex:true},
 {img:"interview_coach", d:3.6, from:zoom(25,100,750), to:zoom(25,100,750), cap:"Step 3: the grade.", sub:"A · 95% (AI estimate)", hl:[[30,648,740,446,.4]], ex:true},
 {img:"interview_coach", d:3.2, from:zoom(40,520,560), to:zoom(40,520,560), cap:"Scored on <span class='l'>structure, specifics, delivery</span>.", sub:"Plus exactly how to make it better.", hl:[[50,1040,590,45,.4]], ex:true},
 {kind:"fn", d:2.6, fn:t=>`<div class="sc" style="background:${LIME};color:${NAVY}"><div style="position:absolute;left:80px;right:80px;top:560px"><div style="font-size:104px;font-weight:900;letter-spacing:-4px;line-height:1.03;opacity:${out(P(t,0,.25))}">Do 5 questions tonight.</div><div style="font-size:104px;font-weight:900;letter-spacing:-4px;line-height:1.03;color:#fff;opacity:${out(P(t,.4,.7))}">Walk in warmed up.</div></div></div>`},
 {kind:"cta", d:3.6, kw:"PRACTICE", line:"and I'll DM you interview practice"},
];
R.C={len:lenOf(C), f:t=>run(t,C)};

// sound effect times: a whoosh on every cut, a click on every tap
for(const [k,bs] of [["A",A],["B",B],["C",C]]){ let a=0; const cuts=[], taps=[]; for(const b of bs){ if(a>0) cuts.push(+a.toFixed(2)); for(const tp of (b.taps||[])) taps.push(+(a+tp[2]).toFixed(2)); a+=b.d; } R[k].cuts=cuts; R[k].taps=taps; }
window.REAL=R;
window.setupReal=k=>R[k].len;
window.renderReal=(k,t)=>{ document.getElementById("st").innerHTML=R[k].f(t); };
})();
