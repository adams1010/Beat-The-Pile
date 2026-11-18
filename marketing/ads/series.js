// Beat the Pile series: 8 app sections x 3 formats. Loaded by anim.html after its own helpers.
// Every job/company/count is live from beatthepile.com (Nov 17 2026). Anything illustrative carries an "Example" tag.
(function(){
const NAVY="#060A2C", LIME="#B0F701", DL="#4A7000", BLUE="#1E3A8A";
let BEATV=60/128;
const pumpV=t=>1;
const EXT=(top=60)=>`<div class="ex" style="top:${top}px">Example</div>`;
const st=document.createElement("style"); st.textContent=`
.cta{position:absolute;inset:0;background:${LIME};color:${NAVY};text-align:center}
.cta .k{display:inline-block;background:${NAVY};color:${LIME};font-size:190px;font-weight:900;letter-spacing:-6px;border-radius:28px;padding:20px 70px;margin:30px 0}
.cta .a{font-size:62px;font-weight:800;letter-spacing:-1.5px}
.cta .b{font-size:44px;font-weight:700;margin-top:26px;opacity:.85}
.bub{max-width:800px;font-size:50px;line-height:1.3;padding:26px 36px;border-radius:40px;margin:16px 0;display:inline-block}
.bub.l{background:#E4E7EE;color:${NAVY};border-bottom-left-radius:10px}
.bub.r{background:${BLUE};color:#fff;border-bottom-right-radius:10px}
.row{display:flex}.row.r{justify-content:flex-end}
.dots span{display:inline-block;width:18px;height:18px;border-radius:50%;background:#8A93A8;margin:0 5px}
.half{position:absolute;left:0;right:0;height:960px;overflow:hidden}
.tag{position:absolute;left:40px;top:40px;font-size:40px;font-weight:900;padding:10px 26px;border-radius:999px;z-index:5}
.sw{position:absolute;right:50px;top:110px;font-size:84px;font-weight:900;color:${LIME};background:${NAVY};border-radius:18px;padding:10px 26px;font-feature-settings:'tnum';z-index:60}
.chk{display:flex;align-items:center;gap:30px;font-size:52px;font-weight:800;margin-bottom:34px;color:#fff}
.chk i{flex:0 0 84px;height:84px;border-radius:22px;border:6px solid ${LIME};display:flex;align-items:center;justify-content:center;font-style:normal;color:${NAVY};font-size:44px}
.sheetT{position:absolute;left:40px;right:40px;top:520px;background:#fff;border-radius:14px;border:1px solid #DCE1EA;overflow:hidden;color:${NAVY}}
.sheetT .tr{display:grid;grid-template-columns:2.2fr 2.6fr 1fr 1fr 1fr;border-bottom:1px solid #EEF1F6;font-size:32px;align-items:center}
.sheetT .tr>div{padding:24px 16px}
.sheetT .th{background:#F1F3F8;font-weight:700;color:#5E6A80;font-size:28px}
.box6{width:56px;height:56px;border-radius:12px;border:4px solid #C9D0DD;margin:auto;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff}
.box6.on{background:${DL};border-color:${DL}}
.badge{display:inline-flex;flex-direction:column;align-items:center;width:300px;margin:20px 22px}
.badge .m{width:230px;height:230px;border-radius:50%;background:${NAVY};border:12px solid ${LIME};display:flex;align-items:center;justify-content:center;font-size:84px;font-weight:900;color:${LIME}}
.badge .n{font-size:38px;font-weight:800;margin-top:20px;text-align:center;color:#fff}
.ring{position:absolute;left:50%;transform:translateX(-50%)}
.swc{position:absolute;left:90px;width:900px;top:560px;background:#fff;border-radius:22px;border:1px solid #DCE1EA;padding:60px 54px;color:${NAVY};height:760px}
.swc .t{font-size:66px}
.stampS{position:absolute;top:70px;font-size:80px;font-weight:900;border:10px solid;border-radius:18px;padding:6px 30px}
.orb{position:absolute;border-radius:50%;border:3px dashed rgba(176,247,1,.35)}
.av{position:absolute;width:120px;height:120px;border-radius:50%;background:#fff;color:${NAVY};font-weight:800;font-size:40px;display:flex;align-items:center;justify-content:center;transform:translate(-50%,-50%);border:6px solid ${LIME}}
.pc{position:absolute;left:70px;right:70px;top:430px;background:#fff;border-radius:22px;padding:56px;color:${NAVY}}
.tagc{display:inline-block;font-size:36px;font-weight:700;background:#F2FADF;color:${DL};border:1px solid #DDF3A8;border-radius:999px;padding:12px 26px;margin:0 12px 16px 0}
.opt{background:#fff;color:${NAVY};border:3px solid #DCE1EA;border-radius:999px;font-size:46px;font-weight:700;padding:30px 44px;margin-bottom:24px}
.opt.on{background:${NAVY};color:#fff;border-color:${NAVY}}
`; document.head.appendChild(st);

// ---------- shared pieces ----------
function cta(t, kw, line="and I'll DM you the link"){
  const p=back(P(t,0,.3)), q=back(P(t,.25,.6)), a=0;
  return `<div class="cta"><div style="position:absolute;left:0;right:0;top:420px">
    <div class="a" style="transform:scale(${p})">Comment</div>
    <div class="k" style="transform:scale(${q*pumpV(t)})">${esc(kw)}</div>
    <div class="a" style="opacity:${out(P(t,.5,.8))}">${esc(line)}</div>
    <div class="b" style="opacity:${out(P(t,.8,1.1))}">beatthepile.com · free for students</div></div>
    <svg width="240" height="160" style="position:absolute;right:${150-a}px;top:1300px;opacity:${out(P(t,.9,1.2))}"><path d="M10 80 L190 80 M140 30 L200 80 L140 130" stroke="${NAVY}" stroke-width="26" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <img src="file:///home/claude/ads/logo.png" style="position:absolute;left:90px;top:150px;height:80px"></div>`;
}
function seq(t, C, capList, top=1250, size=100){
  let h="";
  for(const [a,b,fn] of C){ if(t>=a&&t<b){ const d=t-a, z=1;
    h=`<div class="sc" style="transform:scale(${z})">${fn(d)}</div>`; if(d<.06&&a>0) h+=`<div class="flash" style="opacity:${.55*(1-d/.06)}"></div>`; } }
  return h+(capList?caps(t,capList,top,size):"");
}
const lightPage=(title,sub,body,ex=false)=>`<div class="sc light">${appTop(title,sub)}${ex?EXT(260):""}${body}</div>`;
const cardList=(list,d,at=.15,gap=.14)=>`<div class="wrap">${list.map((j,i)=>card(j,d,at+i*gap)).join("")}</div>`;

// ---------- formats ----------
function split(t, beforeHtml, afterHtml){
  const show=out(P(t,1.6,2.0));
  return `<div class="sc" style="background:${NAVY}">
   <div class="half" style="top:0;background:#E4E7EE">${beforeHtml}<div class="tag" style="background:#C62828;color:#fff">Before</div></div>
   <div class="half" style="top:960px;background:${NAVY};transform:translateY(${(1-show)*960}px)">${afterHtml}<div class="tag" style="background:${LIME};color:${NAVY}">With Beat the Pile</div></div>
   <div style="position:absolute;left:0;right:0;top:952px;height:16px;background:${LIME};opacity:${show}"></div></div>`;
}
function texts(t, msgs, title="Example", hook=""){ // msgs: [side, text, at]
  let h=[]; for(const [s,txt,at] of msgs){ if(t<at-.6) break;
    if(t<at && s==="l"){ h.push(`<div class="row l"><div class="bub l dots"><span></span><span></span><span></span></div></div>`); break; }
    if(t<at) break; const p=back(P(t,at,at+.25));
    h.push(`<div class="row ${s}"><div class="bub ${s}" style="transform:scale(${p});transform-origin:${s==='r'?'right':'left'} bottom">${txt}</div></div>`); }
  h=h.slice(-4).join("");
  return `<div class="sc" style="background:#fff"><div style="position:absolute;left:0;right:0;top:0;height:300px;background:#F6F7FA;border-bottom:1px solid #DCE1EA;text-align:center;padding-top:150px"><div style="font-size:42px;font-weight:700;color:${NAVY}">${title}</div></div>${EXT(170)}
   <div style="position:absolute;left:50px;right:50px;bottom:480px;display:flex;flex-direction:column">${h}</div>${hook?`<div class="topbox" style="top:330px;background:${NAVY};color:#fff;transform:scale(${1+.08*(1-out(P(t,0,.25)))})">${hook}</div>`:""}</div>`;
}
function guess(t, q, answer, sub){
  const n=t<1.2?3:t<1.9?2:t<2.6?1:0, rev=P(t,2.6,3.6);
  return `<div class="sc navy"><div style="position:absolute;left:80px;right:80px;top:380px;text-align:center"><div style="font-size:76px;font-weight:900;letter-spacing:-2px;line-height:1.1">${q}</div>
   ${n?`<div style="font-size:420px;font-weight:900;color:${LIME};margin-top:60px;opacity:${out(P(t%0.7,0,.15))}">${n}</div>`:
   `<div style="font-size:300px;font-weight:900;color:${LIME};margin-top:80px;letter-spacing:-10px;transform:scale(${back(P(t,2.6,2.9))})">${Math.round(answer*out(rev))}</div><div style="font-size:54px;font-weight:700;opacity:${out(P(t,3.0,3.4))}">${sub}</div>`}</div></div>`;
}
function speedrun(t, steps, stepGap, bgHtml=""){
  const clock=Math.min(t,steps.length*stepGap+.2), s=Math.floor(clock), cs=Math.floor((clock%1)*100);
  return `<div class="sc navy">${bgHtml}<div class="sw">0:${String(s).padStart(2,"0")}.${String(cs).padStart(2,"0")}</div>
   <div style="position:absolute;left:90px;right:90px;top:430px">${steps.map((x,i)=>{const at=.4+i*stepGap, on=t>at+stepGap*.6, p=out(P(t,at,at+.3));
     return `<div class="chk" style="opacity:${p};transform:translateX(${(1-p)*-80}px)"><i style="background:${on?LIME:'transparent'}">${on?(i+1):""}</i>${esc(x)}</div>`;}).join("")}</div></div>`;
}
function swipe(t, list, dirs){ // one card per 1.1s, dir 1 = save (right), -1 = skip (left)
  const i=Math.min(list.length-1,Math.floor(t/1.1)), d=t-i*1.1, dir=dirs[i], m=io(P(d,.55,1.05));
  const j=list[i], nx=list[i+1];
  const cardH=(jj,x,rot,op)=>`<div class="swc" style="transform:translateX(${x}px) rotate(${rot}deg);opacity:${op}"><div class="tile" style="width:130px;height:130px;font-size:46px">${ini(jj.c)}</div><div class="t" style="font-weight:800;margin-top:40px;line-height:1.1">${esc(jj.t)}</div><div class="c" style="font-size:46px;margin-top:20px">${esc(jj.c)}</div><div class="c" style="font-size:40px;color:#5E6A80">${esc(jj.l)}</div><div class="pill" style="font-size:38px">${esc(jj.k||"Internship")}</div></div>`;
  const stamp=m>.05?`<div class="stampS" style="${dir>0?'left:150px;color:'+DL+';border-color:'+DL:'right:150px;color:#C62828;border-color:#C62828'};top:620px;transform:rotate(${dir>0?-14:14}deg);opacity:${cl(m*3)};z-index:9">${dir>0?'SAVE':'SKIP'}</div>`:"";
  return `<div class="sc light">${nx&&m>0?cardH(nx,0,0,.6+.4*m).replace('class="swc"','class="swc" style="transform:scale(.95)"'):""}${cardH(j,dir*m*1300,dir*m*22,1)}${stamp}
    <div style="position:absolute;left:0;right:0;top:1400px;display:flex;justify-content:center;gap:120px"><div style="width:150px;height:150px;border-radius:50%;background:#fff;border:4px solid #C62828;color:#C62828;font-size:70px;font-weight:900;display:flex;align-items:center;justify-content:center">×</div><div style="width:150px;height:150px;border-radius:50%;background:${DL};color:#fff;font-size:44px;font-weight:900;display:flex;align-items:center;justify-content:center">Save</div></div></div>`;
}
function orbitScene(t, people, label){
  const cx=540, cy=1000, R=[220,360,480];
  const rings=R.map((r,i)=>`<div class="orb" style="left:${cx-r}px;top:${cy-r}px;width:${2*r}px;height:${2*r}px;opacity:${out(P(t,.1+i*.15,.5+i*.15))}"></div>`).join("");
  const av=people.map(([ini2,ring,ang],i)=>{const a=ang+t*(0.35-ring*.08), r=R[ring], p=back(P(t,.6+i*.18,.9+i*.18));
    return `<div class="av" style="left:${cx+Math.cos(a)*r}px;top:${cy+Math.sin(a)*r}px;transform:translate(-50%,-50%) scale(${p})">${ini2}</div>`;}).join("");
  return `<div class="sc navy">${EXT(260)}<div class="band" style="background:transparent"><h2>${label[0]}</h2><p>${label[1]}</p></div>${rings}${av}
    <div class="av" style="left:${cx}px;top:${cy}px;width:170px;height:170px;background:${LIME};font-size:44px">You</div>
    <div style="position:absolute;left:0;right:0;top:1520px;text-align:center;font-size:40px;color:#C9CEE0">Inner orbit · Campus · Insiders</div></div>`;
}
function ring(t, from, to, at, label, sub, col=LIME){
  const v=from+(to-from)*out(P(t,at,at+1.0)), r=300, c=2*Math.PI*r;
  return `<svg class="ring" width="720" height="720" style="top:520px"><circle cx="360" cy="360" r="${r}" stroke="rgba(255,255,255,.15)" stroke-width="56" fill="none"/><circle cx="360" cy="360" r="${r}" stroke="${col}" stroke-width="56" fill="none" stroke-linecap="round" stroke-dasharray="${c*v/100} ${c}" transform="rotate(-90 360 360)"/>
   <text x="360" y="390" text-anchor="middle" fill="#fff" font-size="170" font-weight="900" font-family="Inter">${Math.round(v)}%</text></svg>
   <div style="position:absolute;left:0;right:0;top:1280px;text-align:center;font-size:56px;font-weight:800;color:#fff">${label}</div><div style="position:absolute;left:0;right:0;top:1360px;text-align:center;font-size:38px;color:#C9CEE0">${sub}</div>`;
}

// ---------- extra real listings (live Nov 17 2026) ----------
const M=[["Nursing",{t:"Student Nurse Emergency Room",c:"Universal Health Services",l:"Bradenton, FL"}],
 ["Finance",{t:"Accounting / Finance Intern",c:"DiLeonardo International",l:"Warwick, RI"}],
 ["Marketing",{t:"Digital Marketing Intern",c:"Oak View Group",l:"Austin, TX"}],
 ["Social work",{t:"Social Worker Intern",c:"Henry Ford Health",l:"Jackson, MI"}],
 ["Design",{t:"UX Designer Intern [Summer 2027]",c:"Zoox",l:"Foster City, CA"}],
 ["Pre-law",{t:"Legal Intern",c:"Minitab",l:"State College, PA"}],
 ["HR",{t:"Summer 2027 Internship Human Resources",c:"Thorlabs",l:"Newton, NJ"}],
 ["Supply chain",{t:"Supply Chain Management (Buyer) - Intern",c:"Lockheed Martin",l:"Marietta, GA"}],
 ["Data / AI",{t:"2027 Machine Learning Engineer Intern",c:"Anduril",l:"Santa Ana, CA"}],
 ["Civil",{t:"Transportation Engineering Intern",c:"Ardurra",l:"Miami, FL"}]];
function rapid(t){ const i=Math.min(M.length-1,Math.floor(t/0.62)), d=t-i*0.62, [maj,j]=M[i], lime=i%2==0;
  return `<div class="sc" style="background:${lime?LIME:NAVY}"><div style="position:absolute;left:70px;right:70px;top:430px;opacity:${out(P(d,0,.15))}">
    <div style="font-size:150px;font-weight:900;letter-spacing:-5px;color:${lime?NAVY:LIME}">${maj}?</div>
    <div class="card" style="margin-top:60px"><div class="tile">${ini(j.c)}</div><div><div class="t">${esc(j.t)}</div><div class="c">${esc(j.c)} <span>· ${esc(j.l)}</span></div><div class="pill">Internship</div></div></div></div></div>`; }
const SURPRISE=[["5","Golf shop attendant","Troon · Boerne, TX"],["4","Event staff at Virginia Tech games","Teall Sports & Entertainment · Blacksburg, VA"],["3","Volunteer law student","U.S. Attorneys' Offices · Lexington, KY"],["2","Park volunteer program assistant","National Park Service · West Glacier, MT"],["1","Student trainee (legal)","Veterans Affairs, Inspector General · Washington, DC"]];
function countdown(t){ const i=Math.min(4,Math.floor(t/1.5)), d=t-i*1.5, [n,ti,c]=SURPRISE[i];
  return `<div class="sc navy"><div style="position:absolute;left:80px;right:80px;top:420px"><div class="bignum" style="font-size:330px;opacity:${out(P(d,0,.15))}">#${n}</div>
   <div style="font-size:84px;font-weight:900;letter-spacing:-2px;line-height:1.05;margin-top:30px;opacity:${out(P(d,.15,.4))}">${esc(ti)}</div><div style="font-size:44px;color:#C9CEE0;margin-top:24px;opacity:${out(P(d,.3,.55))}">${esc(c)}</div></div></div>`; }
const TRK=[["Lockheed Martin","Software Engineering Intern",[1,1,0,0]],["Moog","Intern, Business",[1,1,1,0]],["Texas Instruments","Systems Engineering Intern",[1,0,0,0]],["Thorlabs","Marketing Internship",[1,1,1,1]],["Peraton","Software Engineer Intern",[1,0,0,0]]];
function tracker(t){
  const rows=TRK.map(([c,r,ch],i)=>{const p=out(P(t,.2+i*.15,.5+i*.15));
    return `<div class="tr" style="opacity:${p}"><div style="font-weight:700">${esc(c)}</div><div>${esc(r)}</div>${ch.slice(1).map((v,k)=>`<div><div class="box6 ${v&&t>1.4+i*.3+k*.25?'on':''}">${v&&t>1.4+i*.3+k*.25?'✓':''}</div></div>`).join("")}</div>`;}).join("");
  return `<div class="sc light">${appTop("Tracker","Every application in one sheet.")}${EXT(260)}<div class="sheetT"><div class="tr th"><div>Company</div><div>Role</div><div>Follow-up</div><div>Interview</div><div>Offer</div></div>${rows}</div></div>`;
}
function notesApp(t){ return `<div class="sc" style="background:#FFFBEA"><div style="position:absolute;left:70px;right:70px;top:300px;font-size:48px;line-height:1.5;color:#3b3b3b;font-family:Inter">${EXT(170)}<b style="font-size:62px">internships!!</b><br>lockheed - applied?? 10/2<br>moog - did i follow up<br>TI - apply by ??<br>thorlabs - INTERVIEW thurs<br>peraton - <span style="text-decoration:line-through">applied</span> idk</div></div>`; }
const BADGES=[["1","First application"],["10","10+ applications"],["1","First follow-up"],["1","First interview"],["1","First thank-you note"],["1","Got an offer"]];
function badges(t){ return `<div class="sc navy"><div style="position:absolute;left:30px;right:30px;top:360px;text-align:center">${BADGES.map(([n,l],i)=>{const p=back(P(t,.2+i*.45,.5+i*.45));return `<div class="badge" style="transform:scale(${p});opacity:${cl(p)}"><div class="m">${n}</div><div class="n">${l}</div></div>`;}).join("")}</div></div>`; }
function coffeeCard(t){ const tags=["Co-op at a big defense company","Switching majors","Getting a research spot","Career fair nerves"];
  return `<div class="sc navy">${EXT(260)}<div class="pc" style="transform:translateY(${(1-back(P(t,0,.45)))*900}px)"><div style="display:flex;gap:36px;align-items:center"><div class="av" style="position:static;transform:none;width:170px;height:170px;font-size:56px">JR</div><div><div style="font-size:60px;font-weight:900">Jordan R.</div><div style="font-size:38px;color:#5E6A80">Mechanical Engineering · Junior</div></div></div>
   <div style="margin-top:40px;font-size:40px;font-weight:800;color:${DL};opacity:${out(P(t,.6,.9))}">Open to coffee chats</div>
   <div style="margin-top:34px;font-size:36px;font-weight:700;color:#5E6A80">Ask me about</div><div style="margin-top:16px">${tags.map((x,i)=>`<span class="tagc" style="opacity:${out(P(t,1.0+i*.25,1.3+i*.25))}">${x}</span>`).join("")}</div>
   <div style="margin-top:30px;display:inline-block;background:${NAVY};color:#fff;border-radius:999px;font-size:42px;font-weight:800;padding:24px 50px;opacity:${out(P(t,2.2,2.5))}">Join orbit</div></div></div>`; }
function interviewChat(t, msgs){ return texts(t, msgs, "Interview practice · Lockheed Martin","AI interviewer 🎤"); }
function quizStep(t, q, opts, pick){ return `<div class="sc light">${appTop("Match quiz",q)}${EXT(260)}<div style="position:absolute;left:70px;right:70px;top:560px">${opts.map((o,i)=>`<div class="opt ${t>1.0&&i==pick?'on':''}" style="opacity:${out(P(t,.1+i*.1,.35+i*.1))}">${o}</div>`).join("")}</div>${finger(t,{pts:[[.4,800,1500],[.9,540,640+pick*150]],taps:[1.0],end:1.5})}</div>`; }

// ---------- the 24 videos (key = file name) ----------
const S={};
const V10=V[10].custom, V11=V[11].custom, V12=V[12].custom;
S["1-Jobs/01_no_internship_yet"]={kw:"JOBS",style:"house",len:19.2,cuts:[1.4,14.0,15.9],taps:[2.24,3.34],imp:[0,14],f:t=>t<15.9?V10(t):cta(t-15.9,"JOBS")};
S["1-Jobs/02_before_vs_after"]={kw:"JOBS",style:"trap",len:19,cuts:[1.4,3.0,10.6,15.8],imp:[0],f:t=>seq(t,[
  [0,1.4,d=>slam(d,"Still applying like this? 😩")],
  [1.4,3.0,d=>split(d+1.6,`<div style="padding:150px 60px;font-size:46px;line-height:1.6;color:#334">${EXT(40)}47 tabs open<br>Same job, 5 different sites<br>"This job is no longer accepting applications"</div>`,`<div style="padding:150px 60px;font-size:50px;font-weight:800;color:#fff;line-height:1.5">One search.<br><span style="color:${LIME}">${fmt(N.intern)} internships</span><br>Straight from each company.</div>`)],
  [3.0,10.6,d=>split(d+2.0,`<div style="padding:150px 60px;font-size:46px;line-height:1.6;color:#334">${EXT(40)}Reposts from weeks ago<br>Middleman sites<br>No idea if it's still open</div>`,`<div style="transform:scale(.5);transform-origin:0 0;width:1080px;height:1920px;position:relative;left:270px">${V[1].scenes[2][2](1.0+d*1.1)}</div>`)],
  [10.6,15.8,d=>counter(d,[[N.intern,"internships"],[N.companies,"companies, read every few hours"]],0)],
  [15.8,19,d=>cta(d,"JOBS")]],[[3.1,"Before:"],[3.6,"reposts."],[4.4,"After:"],[4.9,"the *real* job board."],[10.6,""]],1700,80)};
S["1-Jobs/03_group_chat"]={kw:"JOBS",style:"phonk",len:20,cuts:[8.2,12.4,16.8],imp:[0],f:t=>seq(t,[
  [0,8.2,d=>texts(d,[["l","bro how did you find that internship 😭",-0.3],["l","i've applied to like 40",1.4],["r","stopped using the big job sites",2.6],["r","beat the pile pulls every job straight from the company's own board",3.8],["l","wait so no reposts??",5.4],["r","nope. checked every few hours",6.5]],"Group chat","POV: your friend asks how you found your internship 👀")],
  [8.2,12.4,d=>`<div class="sc navy">${phone(V[1].scenes[2][2](1.0+d*1.3),d,196,330,.6)}</div>`],
  [12.4,16.8,d=>counter(d,[[N.intern,"internships"],[N.entry,"entry-level jobs"]],0)],
  [16.8,20,d=>cta(d,"JOBS")]],[[8.3,"This is it."],[9.5,"Every major."],[12.3,""]],1640,90)};

S["2-Map/01_stop_dead_listings"]={kw:"MAP",style:"trap",len:16.6,cuts:[0.94,1.9,3.0,3.9,9.5,12.0,13.4],taps:[8.05],imp:[0,1.9,12],f:t=>t<13.4?V11(t):cta(t-13.4,"MAP")};
S["2-Map/02_guess_the_number"]={kw:"MAP",style:"house",len:17,cuts:[4.4,11.4,13.8],taps:[9.85],imp:[0,2.6],f:t=>seq(t,[
  [0,4.4,d=>guess(d,"Guess how many jobs are within 10 miles of Virginia Tech 👇",N.near,"jobs within 10 miles. Right now.")],
  [4.4,11.4,d=>mapScene(.8+d*1.3)],
  [11.4,13.8,d=>slam(d,"What's near *your* campus?",false,"Comment your school 👇")],
  [13.8,17,d=>cta(d,"MAP")]],[[4.5,"Every dot"],[5.0,"is a real opening."],[7.5,"Zoom in."],[9.9,"Tap."],[10.4,"*35 jobs.*"],[11.3,""]],1250,100)};
S["2-Map/03_pov_walk_to_class"]={kw:"MAP",style:"phonk",len:16.6,cuts:[10.0,13.4],taps:[6.6],imp:[0],f:t=>seq(t,[
  [0,10.0,d=>`<div class="sc">${mapScene(2.4+d*0.95)}${topbox(d,"POV: you check what's hiring on your walk to class 🚶",0)}</div>`],
  [10.0,13.4,d=>counter(d,[[N.placed,"jobs on the map"],[N.near,"within 10 mi of Blacksburg"]],0)],
  [13.4,16.6,d=>cta(d,"MAP")]],[[2.0,"Internships,"],[2.6,"first jobs,"],[3.2,"part-time."],[4.4,"All on one map."],[9.9,""]],1250,96)};

S["3-Every-Major/01_your_major_in_6_seconds"]={kw:"MAJOR",style:"house",len:15.5,cuts:[1.3,7.5,9.4,12.3],imp:[0],f:t=>seq(t,[
  [0,1.3,d=>slam(d,"Not an engineer? *Good.*")],[1.3,7.5,d=>rapid(d)],[7.5,9.4,d=>slam(d,"Every major.",false,`${fmt(N.intern)} internships`)],
  [9.4,12.3,d=>counter(d,[[N.intern,"internships"],[N.companies,"companies"]],0)],[12.3,15.5,d=>cta(d,"MAJOR","and I'll DM you jobs for your major")]],null)};
S["3-Every-Major/02_jobs_you_didnt_know"]={kw:"JOBS",style:"trap",len:16.7,cuts:[1.4,2.6,4.1,5.6,7.1,8.6,10.1,13.5],imp:[0],f:t=>seq(t,[
  [0,1.4,d=>slam(d,"5 jobs you didn't know were on here 👀")],[1.4,9.0,d=>countdown(d)],
  [9.0,13.5,d=>counter(d,[[N.hourly,"part-time & hourly jobs"],[N.entry,"entry-level jobs"]],0)],[13.5,16.7,d=>cta(d,"JOBS")]],null)};
S["3-Every-Major/03_swipe"]={kw:"MAJOR",style:"phonk",len:14.8,cuts:[1.3,8.0,11.6],imp:[0],f:t=>seq(t,[
  [0,1.3,d=>slam(d,"Swipe your summer 👉",false)],
  [1.3,8.0,d=>swipe(d,[{t:"Digital Marketing Intern",c:"Oak View Group",l:"Austin, TX"},{t:"Social Worker Intern",c:"Henry Ford Health",l:"Jackson, MI"},{t:"UX Designer Intern",c:"Zoox",l:"Foster City, CA"},{t:"Accounting / Finance Intern",c:"DiLeonardo International",l:"Warwick, RI"},{t:"Mechanical Engineering Intern",c:"Intuitive Surgical",l:"Blacksburg, VA"},{t:"Legal Intern",c:"Minitab",l:"State College, PA"}],[1,-1,1,-1,1,1])],
  [8.0,11.6,d=>slam(d,"Save the ones you like.",true,"We email you new ones every week.")],[11.6,14.8,d=>cta(d,"MAJOR","and I'll DM you jobs for your major")]],null)};

S["4-Career-Fair/01_3_things"]={kw:"FAIR",style:"house",len:21.9,cuts:[1.3,2.6,7.3,12.3,17.3,18.7],imp:[0,17.3],f:t=>t<18.7?V12(t):cta(t-18.7,"FAIR","and I'll DM you Career Fair Mode")};
S["4-Career-Fair/02_speedrun"]={kw:"FAIR",style:"trap",len:15.5,cuts:[1.4,8.6,12.3],imp:[0],f:t=>seq(t,[
  [0,1.4,d=>slam(d,"Career fair prep speedrun ⏱️")],
  [1.4,8.6,d=>speedrun(d,["Find your school's next fair","Get your booth route","A brief on every company","QR code to your resume","Notes at every booth","Follow-up emails, drafted"],1.0)],
  [8.6,12.3,d=>`<div class="sc light">${appTop("Your booth route","Career Fair Mode")}${EXT(260)}<div style="position:absolute;inset:0;top:430px">${floor(d*1.3)}</div></div>`],
  [12.3,15.5,d=>cta(d,"FAIR","and I'll DM you Career Fair Mode")]],null)};
S["4-Career-Fair/03_fair_before_after"]={kw:"FAIR",style:"phonk",len:16.2,cuts:[1.4,9.6,13.0],imp:[0],f:t=>seq(t,[
  [0,1.4,d=>slam(d,"Me at the career fair 😬",false)],
  [1.4,9.6,d=>split(d,`<div style="padding:150px 60px;font-size:46px;line-height:1.6;color:#334">${EXT(40)}"Hi... so what does your company do?"<br>Wandering for 2 hours<br>Forgot who I talked to</div>`,`<div style="transform:scale(.5);transform-origin:0 0;width:2160px;height:1920px;position:relative">${floor(d*.8)}</div><div style="position:absolute;left:600px;top:120px;width:440px;font-size:42px;font-weight:800;color:#fff;line-height:1.35">Route planned.<br><span style="color:${LIME}">Brief on every booth.</span><br>Notes saved.</div>`)],
  [9.6,13.0,d=>slam(d,"Same fair. *Different you.*")],[13.0,16.2,d=>cta(d,"FAIR","and I'll DM you Career Fair Mode")]],null)};

S["5-Tracker/01_notes_app_to_tracker"]={kw:"TRACK",style:"house",len:16,cuts:[1.4,4.4,10.6,12.8],imp:[0],f:t=>seq(t,[
  [0,1.4,d=>slam(d,"Still tracking applications in your Notes app? 💀")],[1.4,4.4,notesApp],[4.4,10.6,tracker],
  [10.6,12.8,d=>slam(d,"Every application. *One sheet.*",false,"Export it whenever you want.")],[12.8,16,d=>cta(d,"TRACK","and I'll DM you the tracker")]],[[1.5,"This?"],[2.4,"*Chaos.*"],[4.5,"Try this."],[10.5,""]],1600,96)};
S["5-Tracker/02_badges"]={kw:"TRACK",style:"trap",len:15,cuts:[1.4,5.6,8.6,11.8],imp:[0],f:t=>seq(t,[
  [0,1.4,d=>slam(d,"Job hunting but make it a game 🎮")],[1.4,5.6,badges],
  [5.6,8.6,d=>`<div class="sc navy">${EXT(260)}${ring(d,0,40,.3,"Weekly goal: 4 of 10","Applications this week")}</div>`],
  [8.6,11.8,d=>slam(d,"Earn badges for *real effort.*",false,"Counted from your own Tracker.")],[11.8,15,d=>cta(d,"TRACK","and I'll DM you the tracker")]],null)};
S["5-Tracker/03_follow_up"]={kw:"TRACK",style:"phonk",len:16,cuts:[1.4,3.4,9.0,12.8],imp:[0],f:t=>seq(t,[
  [0,1.4,d=>slam(d,"Applied 5 days ago and heard nothing?")],[1.4,3.4,d=>slam(d,"Don't just wait. *Follow up.*",false)],
  [3.4,9.0,d=>lightPage("Follow-up ready","Moog · Intern, Business · applied 5 days ago",mailBody(d+.4,"Following up on my application","Hi, I applied to the Business Intern role last week and wanted to say how excited I am about it. Happy to share anything else that helps."),true)],
  [9.0,12.8,d=>slam(d,"We remind you *when it's time.*",true,"Drafted for you. You hit send.")],[12.8,16,d=>cta(d,"TRACK","and I'll DM you the tracker")]],null)};

S["6-Orbit/01_your_orbit"]={kw:"ORBIT",style:"house",len:15.5,cuts:[1.4,8.4,12.3],imp:[0],f:t=>seq(t,[
  [0,1.4,d=>slam(d,"Your classmates are already job hunting 👀")],
  [1.4,8.4,d=>orbitScene(d,[["AK",0,0],["MB",0,2.2],["JR",0,4.1],["SL",1,1.0],["TP",1,3.0],["DW",1,5.1],["NE",2,.4],["CH",2,2.6],["RV",2,4.6]],["Your orbit","Same major + school · Campus · Insiders"])],
  [8.4,12.3,d=>slam(d,"See who interned *where you want to.*",false,"Ask them how they got it.")],[12.3,15.5,d=>cta(d,"ORBIT","and I'll DM you an invite")]],[[1.6,"Inner orbit:"],[2.3,"*your major*"],[3.0,"at your school."],[4.6,"Insiders:"],[5.3,"interned at companies"],[6.0,"*you want.*"],[8.3,""]],1650,80)};
S["6-Orbit/02_who_interned_there"]={kw:"ORBIT",style:"trap",len:15.6,cuts:[7.2,9.4,12.4],imp:[0],f:t=>seq(t,[
  [0,7.2,d=>texts(d,[["l","does anyone know someone who interned at lockheed??",-0.3],["l","i have an interview next week 😭",1.4],["r","check Insiders on beat the pile",2.7],["r","it shows people who interned there. you can ask them for a coffee chat",3.9],["l","WAIT that's so useful",5.6]],"Group chat","POV: you need an insider before your interview 🤫")],
  [7.2,9.4,d=>slam(d,"Insiders.",false,"Students who interned where you want to go.")],
  [9.4,12.4,d=>coffeeCard(d+.6)],[12.4,15.6,d=>cta(d,"ORBIT","and I'll DM you an invite")]],null)};
S["6-Orbit/03_coffee_chat"]={kw:"ORBIT",style:"phonk",len:14.8,cuts:[1.4,5.6,8.6,11.6],imp:[0],f:t=>seq(t,[
  [0,1.4,d=>slam(d,"Networking is awkward. Unless... ☕")],[1.4,5.6,coffeeCard],
  [5.6,8.6,d=>slam(d,"They *said* to ask.",false,"\"Ask me about\" on every profile.")],
  [8.6,11.6,d=>orbitScene(d+3,[["AK",0,0],["MB",0,2.2],["JR",0,4.1],["SL",1,1.0],["TP",1,3.0],["NE",2,.4],["CH",2,2.6]],["Find people","Your major, your school, your target companies"])],
  [11.6,14.8,d=>cta(d,"ORBIT","and I'll DM you an invite")]],null)};

const IQ=[["l","Tell me about a time you worked on a team project that hit a problem.",-0.3],["r","In my design class our prototype failed testing two days before the deadline...",2.4],["r","I split the fixes, took the CAD rework myself, and we passed the retest.",4.0],["l","Good structure. Add what YOU learned and one number.",5.8]];
S["7-Interview/01_ai_interviewer"]={kw:"PRACTICE",style:"house",len:16.4,cuts:[1.4,8.8,13.2],imp:[0],f:t=>seq(t,[
  [0,1.4,d=>slam(d,"Practice your interview with the company you're interviewing at 🎯")],
  [1.4,8.8,d=>interviewChat(d,IQ)],[8.8,13.2,d=>slam(d,"Type any company.",false,"Questions about THAT company. Feedback on every answer.")],
  [13.2,16.4,d=>cta(d,"PRACTICE","and I'll DM you interview practice")]],null)};
S["7-Interview/02_interview_tomorrow"]={kw:"PRACTICE",style:"trap",len:14.4,cuts:[1.3,2.6,8.2,11.2],imp:[0,1.3],f:t=>seq(t,[
  [0,1.3,d=>slam(d,"Interview tomorrow? 😰")],[1.3,2.6,d=>slam(d,"Do *this* tonight.",false)],
  [2.6,8.2,d=>speedrun(d,["Type the company","Answer real questions out loud","Get feedback on each answer","Do it again"],1.2)],
  [8.2,11.2,d=>slam(d,"Walk in *warmed up.*",true)],[11.2,14.4,d=>cta(d,"PRACTICE","and I'll DM you interview practice")]],null)};
S["7-Interview/03_3_questions"]={kw:"PRACTICE",style:"phonk",len:18.4,cuts:[1.4,5.4,9.4,13.4,15.2],imp:[0],f:t=>seq(t,[
  [0,1.4,d=>slam(d,"3 questions to practice before ANY internship interview")],
  [1.4,5.4,d=>item(d,"1","\"Tell me about yourself.\"","30 seconds: what you study, what you've built, why this job.",`<div class="mail" style="top:620px;font-size:50px;line-height:1.4"><div class="h">Example start</div>\"I'm a junior in mechanical engineering. Last spring I built a test rig for my design team, and I want to do that at your company.\"</div>`)],
  [5.4,9.4,d=>item(d,"2","\"Why this company?\"","Name something real they make or do.",`<div class="mail" style="top:620px;font-size:50px;line-height:1.4"><div class="h">Example start</div>\"Your surgical robots are made a few miles from my campus, and I want to work on hardware that helps people.\"</div>`)],
  [9.4,13.4,d=>item(d,"3","\"A time something went wrong.\"","What happened, what you did, what you learned.",`<div class="mail" style="top:620px;font-size:50px;line-height:1.4"><div class="h">Example start</div>\"Our prototype failed testing two days before the deadline. I took the redesign, and we passed the retest.\"</div>`)],
  [13.4,15.2,d=>slam(d,"Practice all 3 with *AI feedback.*",false)],[15.2,18.4,d=>cta(d,"PRACTICE","and I'll DM you interview practice")]],null)};

S["8-Match-Quiz/01_your_interview_chance"]={kw:"QUIZ",style:"house",len:17.6,cuts:[1.4,3.0,4.6,6.2,10.4,14.4],taps:[2.4,4.0,5.6],imp:[0],f:t=>seq(t,[
  [0,1.4,d=>slam(d,"What are your odds of getting an interview? 🤔")],
  [1.4,3.0,d=>quizStep(d,"What's your major?",["Marketing","Nursing","Mechanical Engineering","Finance"],2)],
  [3.0,4.6,d=>quizStep(d,"What year are you?",["Freshman","Sophomore","Junior","Senior"],2)],
  [4.6,6.2,d=>quizStep(d,"How far from your ZIP?",["10 mi","50 mi","100 mi","Anywhere"],1)],
  [6.2,10.4,d=>`<div class="sc navy">${EXT(260)}<div class="band" style="background:transparent"><h2>Intuitive Surgical</h2><p>Mechanical Engineering Intern · Blacksburg, VA</p></div>${ring(d,0,18,.3,"Interview chance: Good shot","Estimate, based on your answers")}</div>`],
  [10.4,14.4,d=>slam(d,"Real jobs near you. *Your odds on each.*",false,"Estimates, labeled as estimates.")],[14.4,17.6,d=>cta(d,"QUIZ","and I'll DM you the match quiz")]],null)};
S["8-Match-Quiz/02_why_no_callbacks"]={kw:"QUIZ",style:"trap",len:16.4,cuts:[1.4,6.0,9.6,13.2],imp:[0],f:t=>seq(t,[
  [0,1.4,d=>slam(d,"Why your resume isn't getting callbacks 👀")],
  [1.4,6.0,d=>`<div class="sc navy">${EXT(260)}${ring(d,0,54,.2,"Resume match: 54%","Most recruiters' systems look for about 75%","#FF8A65")}</div>`],
  [6.0,9.6,d=>`<div class="sc light">${appTop("Missing from your resume","For: Mechanical Engineering Intern")}${EXT(260)}<div style="position:absolute;left:70px;right:70px;top:560px">${["SolidWorks","GD&T","Root cause analysis","Test plans","Excel"].map((x,i)=>`<span class="chipg" style="font-size:48px;opacity:${out(P(d,.3+i*.3,.6+i*.3))};transform:scale(${back(P(d,.3+i*.3,.6+i*.3))})">${x}</span>`).join("")}</div></div>`],
  [9.6,13.2,d=>`<div class="sc navy">${EXT(260)}${ring(d,54,78,.2,"After adding what fits: 78%","Only add what's true about you.")}</div>`],
  [13.2,16.4,d=>cta(d,"QUIZ","and I'll DM you the resume check")]],null)};
S["8-Match-Quiz/03_rate_my_chances"]={kw:"QUIZ",style:"phonk",len:15.4,cuts:[1.4,9.0,12.2],imp:[0],f:t=>seq(t,[
  [0,1.4,d=>slam(d,"Rating my chances at 3 internships 📊",false)],
  [1.4,9.0,d=>{const C=[["Intuitive Surgical","Mechanical Engineering Intern","Good shot",18],["Lockheed Martin","Software Engineering Intern","Worth applying",9],["Anduril","Machine Learning Engineer Intern","Long shot",4]];
    const i=Math.min(2,Math.floor(d/2.5)), dd=d-i*2.5, [c,r,lab,v]=C[i];
    return `<div class="sc navy">${EXT(260)}<div class="band" style="background:transparent"><h2>${esc(c)}</h2><p>${esc(r)}</p></div>${ring(dd,0,v,.2,"Interview chance: "+lab,"Estimate · Example student")}</div>`;}],
  [9.0,12.2,d=>slam(d,"Apply where you *actually* have a shot.")],[12.2,15.4,d=>cta(d,"QUIZ","and I'll DM you the match quiz")]],null)};

const STY={house:128,trap:140,phonk:130};
window.SERIES=S; window.btpCTA=cta; window.btpSlam=slam;
window.setupSeries=(name)=>{ const s=S[name]; BEATV=60/STY[s.style]; return s.len; };
window.renderSeries=(name,t)=>{ const s=S[name]; document.getElementById("st").innerHTML=s.f(t)+`<div class="prog"><i style="width:${100*t/s.len}%"></i></div>`; };
})();
