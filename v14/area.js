/* v14: split the app into two areas — "IFR Training" and "School Admin" (staff PIN).
   Every old hash route still works; it simply lands in the area it belongs to. */
(function(){
"use strict";
const BUILD=(window.TES_BUILD||"combined");/* v16: "admin" = web School Admin portal, "lessons" = IFR Lessons app, "combined" = test copy */
const ADMIN_V=new Set(["admin","sched","school","signs","ckrec","roi","compare","cloud","setup","acct","lbq","data16"]);
if(BUILD==="lessons")ADMIN_V.delete("cloud");
const ADMIN_T=new Set(["acft","owner","cloud","setup14","vlib14"]);
const SHARED_V=new Set(["help","demo"]);
const SHARED_T=new Set(["sq","sqnew","safety","em"]);
const NAV={
 train:[["dash","⌂","HOME"],["lessons","▤","LESSONS"],["review","↻","REVIEW"],["lab","🎲","LAB"],["oral","🎙","ORAL"],["acs","▦","ACS"],["logbook","📓","LOGBOOK"],["flights","✈","FLIGHTS"],["tools","🧰","TOOLKIT"],["poh","📖","POH"],["brief","🎯","BRIEF"],["vis","👁","VISUAL"],["aids","✎","AIDS"],["lib","📚","LIBRARY"],["myacct","💳","ACCOUNT"],["cfii","🔒","CFII"],["help","?","HELP"]].concat(BUILD==="lessons"?[["cloud","☁️","SYNC"]]:[]),
 admin:[["admin","🏢","HOME"],["sched","📅","SCHEDULE"],["tools/sq","🛠","FLEET"],["tools/acft","🔧","MX"],["acct","💳","ACCOUNTS"],["school","📈","STUDENTS"],["tools/owner","📊","OWNER"],["tools/safety","🛡","SAFETY"],["lbq","📓","LOGBOOK Q"],["cloud","👥","MEMBERS"],["data16","🗄","DATA"],["tools/setup14","⚙️","SETUP"],["demo","🎬","DEMO"],["help","?","HELP"]]};
/* v16 role-based admin nav: which admin routes each signed-in role may open */
const ROLE_NAV={admin:null,cfii:["admin","sched","lbq","tools/sq","tools/acft","school","signs","help","demo"],maintenance:["admin","tools/sq","tools/acft","help"],safety:["admin","tools/safety","tools/sq","help"]};
const STAFF_ROLES=["admin","cfii","maintenance","safety"];
const fbRole=()=>{try{return (typeof fbOn==="function"&&fbOn()&&S.fb.role)||""}catch(e){return ""}};
const demoAdm=()=>{try{return !!(S.tk&&S.tk.demo&&sessionStorage.getItem("tes-demo16")==="1")}catch(e){return false}};
const effRole=()=>demoAdm()?"admin":fbRole();
function routeOK(r){const role=effRole();if(BUILD!=="admin")return true;if(!role||role==="admin")return true;const L=ROLE_NAV[role];if(!L)return false;const k=r.v+(r.a?"/"+r.a:"");return L.includes(k)||L.includes(r.v)}
let AREA=BUILD==="admin"?"admin":BUILD==="lessons"?"train":(()=>{try{return sessionStorage.getItem("tes-area")||"train"}catch(e){return "train"}})();
const setArea=a=>{if(BUILD==="admin")a="admin";if(BUILD==="lessons")a="train";AREA=a;try{sessionStorage.setItem("tes-area",a)}catch(e){}};
function areaOf(r){const v=r.v||"dash",a=r.a||"";
 if(ADMIN_V.has(v))return "admin";if(v==="tools"&&ADMIN_T.has(a))return "admin";
 if(SHARED_V.has(v)||(v==="tools"&&SHARED_T.has(a))||v==="emergency")return AREA;return "train"}
const staff=()=>{if(BUILD==="admin"){const r=effRole();return STAFF_ROLES.includes(r)}try{return typeof staffOK==="function"?staffOK():!!CFII}catch(e){return false}};
const esc2=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function bar(){if(BUILD!=="combined")return bar16();let b=document.getElementById("areaBar");const h=document.querySelector("header.top");
 if(!b&&h){b=document.createElement("div");b.id="areaBar";b.className="ar-bar";h.insertAdjacentElement("afterend",b)}
 if(!b)return;const lock=AREA==="admin"&&staff();
 b.innerHTML=`<div class="ar-seg" role="tablist" aria-label="App area"><button role="tab" class="${AREA==="train"?"on":""}" onclick="AREA14.to('train')">🎓 IFR Training</button><button role="tab" class="${AREA==="admin"?"on adm":""}" onclick="AREA14.to('admin')">🏢 School Admin${staff()?"":" 🔒"}</button></div>${lock?`<button class="ar-lock" onclick="AREA14.lock()" title="Lock School Admin">Lock</button>`:""}`;
 document.body.classList.toggle("area-admin",AREA==="admin")}
function bar16(){let b=document.getElementById("areaBar");const h=document.querySelector("header.top");
 if(!b&&h){b=document.createElement("div");b.id="areaBar";b.className="ar-bar";h.insertAdjacentElement("afterend",b)}if(!b)return;
 document.body.classList.toggle("area-admin",AREA==="admin");document.body.classList.add("build-"+BUILD);
 if(BUILD==="lessons"){b.innerHTML=`<div class="ar-seg one"><button class="on">🎓 IFR Lessons</button></div>`;return}
 const r=effRole();const who=demoAdm()?`<span class="chip y">DEMO MODE · sample data</span> <button class="ar-lock" onclick="AREA14.demoOff()">Exit demo</button>`:r?`<span class="chip m">${esc2(((S.fb||{}).name)||"")} · ${esc2(({admin:"School admin",cfii:"CFII",maintenance:"Maintenance",safety:"Safety Officer",student:"Student"})[r]||r)}</span> <button class="ar-lock" onclick="AREA14.signOut()">Sign out</button>`:"";
 b.innerHTML=`<div class="ar-seg one"><button class="on adm">🏢 School Admin portal</button></div>${who}`}
function gate16(){const r=fbRole();
 if(r==="student")return `<div class="pnl ar-gate"><div class="ar-gico">🎓</div><h2>This portal is for school staff</h2><p>You're signed in as a student. Your lessons, logbook, bookings and account live in the <b>IFR Lessons</b> app.</p><a class="btn pri" href="${esc2(window.TES_LESSONS_URL||"https://kylehudson1014-crypto.github.io/tes-ifr-lessons/")}">Open IFR Lessons →</a> <button class="btn" onclick="AREA14.signOut()">Sign out</button></div>`;
 if(r&&!STAFF_ROLES.includes(r))return `<div class="pnl ar-gate"><h2>No admin access</h2><p>Your role (${esc2(r)}) can't open the School Admin portal.</p><button class="btn" onclick="AREA14.signOut()">Sign out</button></div>`;
 if(r)return `<div class="pnl ar-gate"><h2>Not available for your role</h2><p>Ask your school admin if you need this screen.</p><button class="btn pri" onclick="go('admin')">← Admin home</button></div>`;
 const f=S.fb||{};
 return `<div class="pnl ar-gate ar-sign"><div class="ar-gico">🏢</div><h2>${esc2((window.SCHOOL||{}).short||"School")} Admin portal</h2><p class="small mut">Scheduling · accounts & packages · fleet & squawks · owner report · members & roles · logbook review</p>
 <form onsubmit="event.preventDefault();fbSignIn()"><label>Email<input id="fbE" type="email" autocomplete="username" required></label><label>Password<input id="fbP" type="password" autocomplete="current-password" required></label><button class="btn pri" type="submit">Sign in</button> <button class="btn" type="button" onclick="fbReset()">Forgot password</button></form>
 <details><summary>New staff member? Join with a school code</summary><label>Your full name<input id="fbN"></label><label>School code (from your admin)<input id="fbC"></label><p class="small mut">Uses the email and password above.</p><button class="btn" type="button" onclick="fbSignUp()">Create account &amp; join</button></details>
 <p id="fbM" class="small">${esc2(f.msg||"")}</p>
 <div class="ar-or"><span>or</span></div><button class="btn big" onclick="AREA14.demoOn()">🎬 Explore Demo Mode — no sign-in</button><p class="small mut">Demo Mode uses a SAMPLE school on this device only. Nothing is uploaded.</p></div>`}
function demoOn(){try{sessionStorage.setItem("tes-demo16","1")}catch(e){}try{if(!S.tk.demo){CFII=true;demoLoad()}}catch(e){}CFII=true;go("admin");render()}
function demoOff(){try{sessionStorage.removeItem("tes-demo16")}catch(e){}try{if(S.tk.demo&&typeof demoReset==="function"){const c=window.confirm;window.confirm=()=>true;try{demoReset()}finally{window.confirm=c}}}catch(e){}CFII=false;render()}
function signOut(){try{if(typeof fbOut==="function")fbOut()}catch(e){}CFII=false;render()}
function gate(){if(BUILD==="admin")return gate16();return `<div class="pnl ar-gate"><div class="ar-gico">🏢</div><h2>School Admin</h2><p>Scheduling, fleet & maintenance, customer accounts, owner report, safety reports and members are for ${esc2((window.SCHOOL||{}).short||"school")} staff.</p>
 <form onsubmit="event.preventDefault();AREA14.unlock()"><input id="arPin" type="password" inputmode="numeric" autocomplete="off" placeholder="Staff PIN" aria-label="Staff PIN"><button class="btn pri" type="submit">Unlock</button></form>
 <p class="small mut">Same PIN as instructor (CFII) mode. Students stay in IFR Training.</p><button class="btn" onclick="AREA14.to('train')">← Back to IFR Training</button></div>`}
function unlock(){const p=(document.getElementById("arPin")||{}).value||"";let ok=false;try{ok=p===(S.pin||SCHOOL.cfiiPin)}catch(e){}
 if(!ok){if(typeof toast==="function")toast("WRONG PIN");const i=document.getElementById("arPin");if(i){i.value="";i.focus()}return}
 CFII=true;if(typeof toast==="function")toast("School Admin unlocked");render()}
function lock(){CFII=false;setArea("train");go("dash");if(typeof toast==="function")toast("School Admin locked")}
function to(a){if(a==="admin"){setArea("admin");if(location.hash==="#admin")render();else go("admin")}else{setArea("train");if(location.hash==="#dash")render();else go("dash")}}

/* ---------- Admin home ---------- */
function adminHome(){let bk=[],P=[],sq=[],signs=[],roster=[],fl=[];
 try{if(window.SCHED){SCHED.view();bk=SCHED._U().bk.filter(b=>(S.tk.demo||!b.sample)&&b.st!=="cx")}}catch(e){}
 try{P=(typeof tails==="function"?tails():[]).filter(t=>S.tk.demo||!/^SAMPLE/.test(t))}catch(e){}
 try{sq=tkAll("sq").filter(q=>!q.closed)}catch(e){}
 try{signs=tkAll("signs").sort((a,b)=>(b.t||0)-(a.t||0)).slice(0,5)}catch(e){}
 try{roster=(S.roster||[])}catch(e){}
 try{fl=(S.flights||[]).filter(f=>f.src==="photo").slice(-5).reverse()}catch(e){}
 const d=new Date(),td=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
 const today=bk.filter(b=>b.date===td).sort((a,b)=>a.s-b.s);const st=t=>{try{return tailStatus(t)}catch(e){return "g"}};
 const gnd=P.filter(t=>st(t)==="r");const acc=window.ACCT?ACCT.summary():{owing:0,due:0,credit:0,n:0,done:0};
 const hm=m=>{const h=Math.floor(m/60),mm=m%60;return (h%12||12)+(mm?":"+String(mm).padStart(2,"0"):"")+(h>=12?"p":"a")};
 const strip=n=>String(n||"").replace(/^SAMPLE\s+[–-]\s+/,"");const money=n=>"$"+Math.abs(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
 const tile=(h,i,t,s)=>`<button class="ar-tile" onclick="go('${h}')"><span class="i">${i}</span><b>${t}</b><small>${s}</small></button>`;
 return `<div class="ar-home"><div class="ar-hd"><div><div class="small mut">${esc2(SCHOOL.name)}</div><h2>🏢 School Admin</h2></div><span class="chip m">STAFF</span></div>
 <div class="ar-kpi">
  <button onclick="go('sched')"><b>${today.length}</b><span>bookings today</span></button>
  <button onclick="go('tools/sq')" class="${gnd.length?"bad":""}"><b>${P.length-gnd.length}/${P.length}</b><span>aircraft bookable${gnd.length?` · ${gnd.length} grounded`:""}</span></button>
  <button onclick="go('tools/sq')" class="${sq.length?"warn":""}"><b>${sq.length}</b><span>open squawks</span></button>
  <button onclick="go('acct')" class="${acc.owing?"warn":""}"><b>${acc.owing}</b><span>customers with amount due${acc.owing?" · "+money(acc.due):""}</span></button>
  <button onclick="go('school')"><b>${roster.length}</b><span>students on roster</span></button></div>
 <div class="ar-cols"><div class="pnl"><h3>Today on the schedule</h3>${today.length?today.slice(0,8).map(b=>`<div class="ar-li" onclick="go('sched')"><b>${hm(b.s)}</b> ${esc2(strip(b.stu))} <span class="mut">· ${esc2(strip(b.cfi).split(",")[0])} · ${esc2(strip(b.tail)||"sim")}</span>${b.tail&&st(b.tail)==="r"?' <span class="chip r">GROUNDED</span>':""}</div>`).join(""):`<p class="mut small">Nothing booked today.</p>`}<button class="btn sm" onclick="go('sched')">Open schedule →</button></div>
 <div class="pnl"><h3>From IFR Training <small class="mut">(shared records)</small></h3>${signs.length?signs.map(s=>`<div class="ar-li">✍️ <b>${esc2(s.les||"")}</b> ${esc2(strip(s.student||""))} <span class="mut">· ${esc2(s.res||"")} · ${esc2(s.name||"")}</span></div>`).join(""):""}${fl.map(f=>`<div class="ar-li">📓 Logbook photo entry <b>${esc2(f.date)}</b> <span class="mut">${esc2(f.ac)} · ${esc2(f.tot)} h</span></div>`).join("")}${!signs.length&&!fl.length?`<p class="mut small">Lesson sign-offs and logbook entries from IFR Training show up here.</p>`:""}<button class="btn sm" onclick="go('signs')">Sign-off audit →</button></div></div>
 <div class="ar-tiles">${tile("sched","📅","Scheduling","aircraft · CFI · student")}${tile("tools/sq","🛠","Fleet & Squawks","go / no-go board")}${tile("tools/acft","🔧","Maintenance","Hobbs · tach · due dates")}${tile("acct","💳","Customer Accounts","packages · credit · due")}${tile("school","📈","Student Progress","roster · flags · readiness")}${tile("tools/owner","📊","Owner Report","monthly PDF")}${tile("tools/safety","🛡","Safety Reports","close calls · anonymous")}${tile("cloud","👥","Members & Roles","sign-in · access codes")}${tile("signs","✍️","Sign-off Audit","every CFII sign-off")}${tile("tools/setup14","⚙️","School Setup","logo · aircraft · POH")}${tile("demo","🎬","Demo Mode","sample school")}${tile("roi","💲","ROI","sim-hour value")}</div></div>`}

function install(){
 if(install.done)return;install.done=1;
 VIEWS.admin=adminHome;VIEWS.__gate14=gate;
 const inner=render;
 window.render=render=function(){let r;try{r=route}catch(e){r={v:"dash"}}let ar=areaOf(r);
  if(BUILD==="admin"&&ar==="train"){route.v="admin";route.a="";r=route;ar="admin";try{history.replaceState(null,"","#admin")}catch(e){}}
  if(BUILD==="lessons"&&ar==="admin"){const t=r.v;route.v="dash";route.a="";r=route;ar="train";try{history.replaceState(null,"","#dash")}catch(e){}setTimeout(()=>{if(typeof toast==="function")toast("That's in the School Admin portal")},50)}
  if(BUILD==="admin"){try{CFII=staff()}catch(e){}}
  if(ar!==AREA)setArea(ar);
  try{SK.length=0;NAV[AREA].filter(x=>BUILD!=="admin"||staff()).filter(x=>AREA!=="admin"||BUILD!=="admin"||routeOK({v:x[0].split("/")[0],a:x[0].split("/")[1]||""})).forEach(x=>SK.push(x))}catch(e){}
  const needGate=BUILD==="admin"?(!staff()||!routeOK(r)):(AREA==="admin"&&!staff()&&r.v!=="help"&&r.v!=="demo"&&!(r.v==="tools"&&SHARED_T.has(r.a||"")));
  const sv=r.v;if(needGate)route.v="__gate14";
  try{inner()}finally{if(needGate)route.v=sv}
  bar();
  /* highlight nav buttons for sub-routes like tools/sq */
  try{const cur=sv+(r.a?"/"+r.a:"");document.querySelectorAll("#sk button").forEach((b,i)=>{const k=SK[i]&&SK[i][0];if(!k)return;if(k.includes("/"))b.classList.toggle("on",cur===k);else if(k==="tools"&&sv==="tools")b.classList.toggle("on",!NAV.admin.some(x=>x[0]===cur))})}catch(e){}
  if(needGate)setTimeout(()=>{const i=document.getElementById("arPin")||document.getElementById("fbE");if(i&&!i.value)i.focus()},50)};
}
window.AREA14={install,to,unlock,lock,areaOf,demoOn,demoOff,signOut,routeOK,effRole,BUILD,get area(){return AREA}};
})();
