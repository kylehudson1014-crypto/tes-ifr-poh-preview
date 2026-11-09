/* TES Scheduling module v1 (preview). Local storage only. Books Student + CFI + Aircraft together,
   blocks double-booking, and blocks aircraft that are RED on the fleet board (grounded / overdue). */
(function(){
"use strict";
const LS="tes-sched";
let U;try{U=JSON.parse(localStorage.getItem(LS)||"null")}catch(e){U=null}
if(!U||typeof U!=="object")U={};
U.bk=Array.isArray(U.bk)?U.bk:[];U.cfis=Array.isArray(U.cfis)?U.cfis:[];U.studs=Array.isArray(U.studs)?U.studs:[];
U.view=U.view||"";if(!U.v2){U.view="tl";U.v2=1}U.days=U.days||1;U.filt=U.filt||{t:"",v:""};U.anchor=U.anchor||"";U.res=U.res||"acft";
const save=()=>{try{localStorage.setItem(LS,JSON.stringify(U))}catch(e){}};
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const jsq=s=>esc(JSON.stringify(String(s)));
const H0=6,H1=22,PXH=52; /* day window 06:00-22:00 */
const LESSONS=["Dual — IFR","Dual — VFR","Instrument approaches","Holds & partial panel","Cross-country (IFR)","Stage check","Checkride prep","Solo","Ground / sim (AATD)","Maintenance block"];
const SAMPLE_CFIS=["SAMPLE – Dana Price, CFII","SAMPLE – Mike Torres, CFII","SAMPLE – Rachel Kim, CFI"];
const pad=n=>String(n).padStart(2,"0");
const ymd=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const parse=s=>{const[a,b,c]=String(s).split("-").map(Number);return new Date(a,(b||1)-1,c||1,12)};
const addD=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return ymd(d)};
const monday=s=>{const d=parse(s);const k=(d.getDay()+6)%7;d.setDate(d.getDate()-k);return ymd(d)};
const hm=m=>{const h=Math.floor(m/60),mm=m%60;const ap=h>=12?"p":"a";const h12=h%12===0?12:h%12;return h12+(mm?":"+pad(mm):"")+ap};
const hm24=m=>pad(Math.floor(m/60))+":"+pad(m%60);
const toMin=s=>{const[a,b]=String(s||"").split(":").map(Number);return (a||0)*60+(b||0)};
const DOW=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const today=()=>ymd(new Date());
const isPhone=()=>window.innerWidth<700;
const strip=n=>String(n||"").replace(/^SAMPLE\s+[–-]\s+/,"");
const nid=()=>"bk"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const G=()=>window; /* app globals */
const demoOn=()=>{try{return !!(typeof S!=="undefined"&&S.tk&&S.tk.demo)}catch(e){return false}};

/* ---------- resources ---------- */
function students(){let r=[];try{r=(S.roster||[]).map(x=>x.name).filter(Boolean)}catch(e){}
 if(!demoOn())r=r.filter(n=>!/^SAMPLE/.test(n));return [...new Set([...r,...U.studs])].sort((a,b)=>strip(a).localeCompare(strip(b)))}
function cfis(){let r=[...U.cfis];try{if(S.tk.cfiiName)r.unshift(S.tk.cfiiName)}catch(e){}if(demoOn())r=r.concat(SAMPLE_CFIS);return [...new Set(r.filter(Boolean))]}
function planes(){let r=[];try{r=typeof tails==="function"?tails():[]}catch(e){}if(!demoOn())r=r.filter(t=>!/^SAMPLE/.test(t));return r}
function tstat(t){try{return typeof tailStatus==="function"?tailStatus(t):"g"}catch(e){return "g"}}
function tdue(t){try{return typeof acftDue==="function"?acftDue(t).filter(x=>x.s!=="g"):[]}catch(e){return []}}
function treason(t){const st=tstat(t);if(st==="g")return "";const due=tdue(t).filter(x=>x.s===st).map(x=>x.n+(x.s==="r"?" overdue":" due soon"));
 let sq=[];try{sq=tkAll("sq").filter(q=>q.tail===t&&!q.closed).map(q=>(q.sev==="inop"?"INOP: ":"")+(q.title||q.item||q.what||q.desc||q.txt||"open squawk"))}catch(e){}
 return [...sq,...due].slice(0,3).join(" · ")||(st==="r"?"Grounded on fleet board":"Open items on fleet board")}

/* ---------- bookings ---------- */
function visible(){return U.bk.filter(b=>demoOn()||!b.sample)}
function active(){return visible().filter(b=>b.st!=="cx")}
function conflicts(c,ignoreId){const out=[];active().forEach(b=>{if(b.id===ignoreId||b.date!==c.date)return;if(!(c.s<b.e&&b.s<c.e))return;
  const w=hm(b.s)+"–"+hm(b.e);
  if(c.stu&&b.stu===c.stu)out.push(`Student ${strip(c.stu)} already booked ${w} (${strip(b.tail)||"no aircraft"})`);
  if(c.cfi&&b.cfi===c.cfi)out.push(`CFI ${strip(c.cfi)} already booked ${w} with ${strip(b.stu)||"—"}`);
  if(c.tail&&b.tail===c.tail)out.push(`Aircraft ${strip(c.tail)} already booked ${w}`)});return out}
function demoSeed(){if(!demoOn()||U.bk.some(b=>b.sample&&b.week===monday(today())))return;
 U.bk=U.bk.filter(b=>!b.sample);const wk=monday(today());const st=students().filter(n=>/^SAMPLE/.test(n));const cf=SAMPLE_CFIS;const tl=planes().filter(t=>/^SAMPLE/.test(t));
 if(!st.length||!tl.length)return;const okT=tl.filter(t=>tstat(t)!=="r");const useT=okT.length?okT:[];
 const slots=[[7*60+30,120],[10*60,120],[13*60,90],[15*60,120],[17*60+30,90]];
 const L=["Instrument approaches","Holds & partial panel","Dual — IFR","Cross-country (IFR)","Stage check","Checkride prep","Ground / sim (AATD)"];let k=0;
 const tdi=Math.round((parse(today())-parse(wk))/864e5);for(let d=0;d<14;d++){const date=addD(wk,d);const sun=d%7===6;slots.forEach(([s,len],j)=>{if((d+j)%4===3||(sun&&j===4))return;k++;
   const les=L[(d*3+j)%L.length];const sim=les.startsWith("Ground");
   const c={date,s,e:s+len,stu:st[(d+j)%st.length],cfi:cf[(d+2*j)%cf.length],tail:sim?"":(useT[(d+j)%Math.max(1,useT.length)]||""),les};
   if(!sim&&!c.tail)return;if(conflicts(c).length)return;
   U.bk.push({id:"smp"+k,sample:true,week:wk,st:d<tdi?"done":"ok",...c})})}
 /* one booking on a grounded aircraft, to show the RED alert */
 const red=tl.find(t=>tstat(t)==="r");if(red){for(let d=tdi+1;d<tdi+5;d++){const c={date:addD(wk,d),s:8*60,e:10*60,stu:st[d%st.length],cfi:cf[(d+1)%cf.length],tail:red,les:"Dual — IFR",note:"SAMPLE — booked before the squawk grounded this aircraft"};if(!conflicts(c).length){U.bk.push({id:"smpR",sample:true,week:wk,st:"ok",...c});break}}}
 /* a cancelled one to show history */
 const cx=U.bk.find(b=>b.sample&&b.date===addD(wk,4)&&b.s===15*60);if(cx){cx.st="cx";cx.note="SAMPLE — student sick, cancelled 24h out"}
 save()}

/* ---------- filtering ---------- */
function passF(b){const f=U.filt;if(!f.t||!f.v)return true;return b[f.t]===f.v}
function colorOf(b){if(b.st==="cx")return "cx";if(b.st==="done")return "done "+(b.tail?"ok":"sim");if(!b.tail)return "sim";const s=tstat(b.tail);return s==="r"?"red":s==="y"?"amb":"ok"}

/* ---------- views ---------- */
function head(){const v=U.view,a=U.anchor;const wk=monday(a);
 const label=v==="tl"&&U.days>1?(parse(a).toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})+" – "+parse(addD(a,U.days-1)).toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})):v==="week"?(parse(wk).toLocaleDateString(undefined,{month:"short",day:"numeric"})+" – "+parse(addD(wk,6)).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})):parse(a).toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"});
 const fopt=(t,lab,list)=>`<optgroup label="${lab}">${list.map(x=>`<option value="${esc(t+"|"+x)}"${U.filt.t===t&&U.filt.v===x?" selected":""}>${esc(strip(x))}</option>`).join("")}</optgroup>`;
 return `<div class="sc-top"><div class="sc-title"><span class="sc-dot"></span>SCHEDULE <small>${esc(label)}</small></div>
 <div class="sc-nav"><button class="btn sm" onclick="SCHED.nav(-1)" aria-label="Previous">◀</button><button class="btn sm" onclick="SCHED.nav(0)">Today</button><button class="btn sm" onclick="SCHED.nav(1)" aria-label="Next">▶</button></div>
 <div class="sc-seg">${[["tl","Timeline"],["week","Week"],["day","Day"]].map(([k,l])=>`<button class="${v===k?"on":""}" onclick="SCHED.setView('${k}')">${l}</button>`).join("")}</div>
 ${v==="tl"?`<div class="sc-seg">${[1,3].map(n=>`<button class="${U.days===n?"on":""}" onclick="SCHED.setDays(${n})">${n} day${n>1?"s":""}</button>`).join("")}<button class="${U.tlStu?"on":""}" onclick="SCHED.togStu()" title="Show student rows">+ Students</button></div>`:""}<select id="scF" class="sc-sel" onchange="SCHED.setF(this.value)"><option value="">All bookings</option>${fopt("cfi","CFI",cfis())}${fopt("stu","Student",students())}${fopt("tail","Aircraft",planes())}</select>
 <button class="btn pri" id="scNew" onclick="SCHED.edit()">+ Book</button></div>`}
function chips(){const P=planes();if(!P.length)return "";return `<div class="sc-fleet">${P.map(t=>{const s=tstat(t);const r=treason(t);return `<span class="sc-chip ${s}" title="${esc(r)}">${s==="r"?"⛔":s==="y"?"⚠️":"✈"} ${esc(strip(t))}${s==="r"?" · GROUNDED":s==="y"?" · check":""}</span>`}).join("")}</div>`}
function stats(){const wk=monday(U.anchor);const L=active().filter(b=>b.date>=wk&&b.date<=addD(wk,6)&&passF(b));const hrs=L.reduce((a,b)=>a+(b.e-b.s),0)/60;
 const P=planes();const ok=P.filter(t=>tstat(t)!=="r").length;const td=active().filter(b=>b.date===today()).length;
 return `<div class="sc-stats"><div><b>${L.length}</b><span>bookings this week</span></div><div><b>${hrs.toFixed(1)}</b><span>hours scheduled</span></div><div><b>${td}</b><span>today</span></div><div><b>${ok}/${P.length}</b><span>aircraft bookable</span></div></div>`}
function block(b,style){const c=colorOf(b);return `<button class="sc-b ${c}" style="${style}" onclick="event.stopPropagation();SCHED.show('${esc(b.id)}')" data-id="${esc(b.id)}">
 <b>${hm(b.s)}–${hm(b.e)}</b><span>${esc(strip(b.stu)||"—")}</span><span class="m">${esc(strip(b.cfi).split(",")[0]||"")}${b.tail?" · "+esc(strip(b.tail)):" · sim"}</span>${b.les?`<span class="m">${esc(b.les)}</span>`:""}</button>`}
function lanes(L){/* side-by-side layout for overlaps (different resources) */const s=[...L].sort((a,b)=>a.s-b.s||a.e-b.e);const col=[];const out=[];
 s.forEach(b=>{let i=col.findIndex(e=>e<=b.s);if(i<0){i=col.length;col.push(0)}col[i]=b.e;out.push([b,i])});const n=Math.max(1,col.length);return out.map(([b,i])=>[b,i,n])}
function grid(days){const hrs=[];for(let h=H0;h<H1;h++)hrs.push(h);const tot=(H1-H0)*PXH;const td=today();
 const nowM=new Date().getHours()*60+new Date().getMinutes();
 return `<div class="sc-grid" style="--cols:${days.length}"><div class="sc-hd"><div></div>${days.map(d=>{const D=parse(d);return `<div class="${d===td?"td":""}">${DOW[(D.getDay()+6)%7]} <b>${D.getDate()}</b></div>`}).join("")}</div>
 <div class="sc-body"><div class="sc-hrs">${hrs.map(h=>`<div style="height:${PXH}px">${hm(h*60)}</div>`).join("")}</div>
 ${days.map(d=>{const L=lanes(visible().filter(b=>b.date===d&&passF(b)));return `<div class="sc-col${d===td?" td":""}" style="height:${tot}px" onclick="SCHED.slot('${d}',event)">${hrs.map(()=>`<div class="sc-ln" style="height:${PXH}px"></div>`).join("")}
  ${d===td&&nowM>H0*60&&nowM<H1*60?`<div class="sc-now" style="top:${(nowM-H0*60)/60*PXH}px"></div>`:""}
  ${L.map(([b,i,n])=>{const top=Math.max(0,(b.s-H0*60)/60*PXH),h=Math.max(22,(Math.min(b.e,H1*60)-Math.max(b.s,H0*60))/60*PXH-2);return block(b,`top:${top}px;height:${h}px;left:calc(${i*100/n}% + 2px);width:calc(${100/n}% - 4px)`)}).join("")}</div>`}).join("")}</div></div>`}
function resView(){const d=U.anchor;const kind=U.res;const rows=kind==="acft"?planes():kind==="cfi"?cfis():students();const key=kind==="acft"?"tail":kind==="cfi"?"cfi":"stu";
 const W=(H1-H0);const hrs=[];for(let h=H0;h<H1;h++)hrs.push(h);
 return `<div class="sc-seg sm">${[["acft","Aircraft"],["cfi","Instructors"],["stu","Students"]].map(([k,l])=>`<button class="${kind===k?"on":""}" onclick="SCHED.setRes('${k}')">${l}</button>`).join("")}</div>
 <div class="sc-res"><div class="sc-rrow sc-rhd"><div class="sc-rname">${kind==="acft"?"Aircraft":kind==="cfi"?"Instructor":"Student"}</div><div class="sc-rtrack">${hrs.map(h=>`<span style="left:${(h-H0)/W*100}%">${hm(h*60)}</span>`).join("")}</div></div>
 ${rows.length?rows.map(r=>{const L=visible().filter(b=>b.date===d&&b[key]===r);const st=kind==="acft"?tstat(r):"g";
  return `<div class="sc-rrow"><div class="sc-rname">${kind==="acft"?`<i class="sc-led ${st}"></i>`:""}${esc(strip(r))}${st==="r"?`<small class="red">GROUNDED</small>`:""}</div>
  <div class="sc-rtrack ${st==="r"?"gnd":""}" onclick="SCHED.resSlot(${jsq(key)},${jsq(r)},event)">${hrs.map(h=>`<i style="left:${(h-H0)/W*100}%"></i>`).join("")}
  ${L.map(b=>`<button class="sc-rb ${colorOf(b)}" style="left:${(b.s-H0*60)/60/W*100}%;width:${(b.e-b.s)/60/W*100}%" onclick="event.stopPropagation();SCHED.show('${esc(b.id)}')" title="${esc(hm(b.s)+"–"+hm(b.e))}">${esc(hm(b.s))} ${esc(strip(kind==="stu"?b.tail||"sim":b.stu))}</button>`).join("")}</div></div>`}).join(""):`<div class="sc-empty">No ${kind==="acft"?"aircraft":kind==="cfi"?"instructors":"students"} yet. ${kind==="acft"?"Add tails on the Fleet board.":"Add one from the + Book form."}</div>`}</div>`}
function agenda(){/* upcoming list (good on phone) */const nm=new Date().getHours()*60+new Date().getMinutes();const L=active().filter(b=>(b.date>today()||(b.date===today()&&b.e>nm))&&b.st!=="done"&&passF(b)).sort((a,b)=>(a.date+hm24(a.s)).localeCompare(b.date+hm24(b.s))).slice(0,6);
 if(!L.length)return "";return `<div class="sc-ag"><h3>Next up</h3>${L.map(b=>`<button class="sc-agi" onclick="SCHED.show('${esc(b.id)}')"><span class="sc-led ${colorOf(b)==="red"?"r":colorOf(b)==="amb"?"y":"g"}"></span><b>${esc(parse(b.date).toLocaleDateString(undefined,{weekday:"short",month:"numeric",day:"numeric"}))} ${hm(b.s)}</b> ${esc(strip(b.stu))} · ${esc(strip(b.cfi).split(",")[0])} · ${esc(strip(b.tail)||"sim")}</button>`).join("")}</div>`}


const TLPX=()=>isPhone()?46:(window.innerWidth<1100?54:68);
function hueOf(b){let h=7;const s=String(b.stu||b.id);for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))%360;return h}
function tlView(){const n=U.days||1;const days=[];for(let i=0;i<n;i++)days.push(addD(U.anchor,i));const px=TLPX(),dayW=(H1-H0)*px,W=dayW*n,td=today();
 const groups=[["✈ Aircraft","tail",planes()],["👤 Instructors","cfi",cfis()]];if(U.tlStu)groups.push(["🎓 Students","stu",students()]);
 const nowM=new Date().getHours()*60+new Date().getMinutes();const ti=days.indexOf(td);
 const nowX=ti>=0&&nowM>H0*60&&nowM<H1*60?ti*dayW+(nowM-H0*60)/60*px:-1;
 const bk=visible().filter(b=>days.includes(b.date)&&passF(b));
 const hdr=`<div class="tl-row tl-hd"><div class="tl-name">Resource</div><div class="tl-track" style="width:${W}px">${days.map((d,di)=>{const D=parse(d);let t="";for(let h=H0;h<H1;h++)t+=`<span style="left:${di*dayW+(h-H0)*px}px">${hm(h*60)}</span>`;return `<div class="tl-day${d===td?" td":""}" style="left:${di*dayW}px;width:${dayW}px"><b>${DOW[(D.getDay()+6)%7]} ${D.getMonth()+1}/${D.getDate()}</b></div>${t}`}).join("")}</div></div>`;
 const row=(key,r)=>{const st=key==="tail"?tstat(r):"g";const L=bk.filter(b=>b[key]===r);
  const blocks=L.map(b=>{const di=days.indexOf(b.date);const x=di*dayW+(Math.max(b.s,H0*60)-H0*60)/60*px,w=Math.max(18,(Math.min(b.e,H1*60)-Math.max(b.s,H0*60))/60*px-2);const c=colorOf(b);
   const other=key==="tail"?(strip(b.cfi).split(",")[0]||"solo"):key==="cfi"?(b.tail?strip(b.tail):"sim"):(b.tail?strip(b.tail):"sim");
   return `<button class="tl-b ${c}" data-id="${esc(b.id)}" style="left:${x}px;width:${w}px;--h:${hueOf(b)}" onclick="event.stopPropagation();SCHED.show('${esc(b.id)}')" title="${esc(hm(b.s)+"–"+hm(b.e)+" · "+strip(b.stu)+" · "+strip(b.cfi)+" · "+(strip(b.tail)||"sim"))}"><b>${hm(b.s)}–${hm(b.e)}</b><span>${esc(key==="stu"?strip(b.cfi).split(",")[0]:strip(b.stu))}</span><span class="m">🔗 ${esc(other)}</span></button>`}).join("");
  return `<div class="tl-row"><div class="tl-name">${key==="tail"?`<i class="sc-led ${st}"></i>`:""}<span>${esc(strip(r))}</span>${st==="r"?`<small class="red">GROUNDED</small>`:st==="y"?`<small class="amb">CHECK</small>`:""}</div><div class="tl-track${st==="r"?" gnd":""}" style="width:${W}px;--px:${px}px" onclick="SCHED.tlSlot(${jsq(key)},${jsq(r)},event)">${days.map((d,di)=>di?`<i class="tl-sep" style="left:${di*dayW}px"></i>`:"").join("")}${nowX>=0?`<i class="tl-now" style="left:${nowX}px"></i>`:""}${blocks}</div></div>`};
 const body=groups.map(([lab,key,list])=>`<div class="tl-row tl-grp"><div class="tl-name">${lab} <small>${list.length}</small></div><div class="tl-track" style="width:${W}px"></div></div>`+(list.length?list.map(r=>row(key,r)).join(""):`<div class="tl-row"><div class="tl-name mut">none yet</div><div class="tl-track" style="width:${W}px"></div></div>`)).join("");
 return `<div class="tl"><div class="tl-scroll">${hdr}${body}</div><div class="tl-help">Tap an empty spot on a row to book that aircraft or CFI · one booking shows on <b>both</b> its aircraft and CFI rows (same color, 🔗) — hover or tap to highlight the pair</div></div>`}
function tlSlot(key,val,ev){const r=ev.currentTarget.getBoundingClientRect();const x=ev.clientX-r.left;const px=TLPX(),dayW=(H1-H0)*px;const di=Math.max(0,Math.min((U.days||1)-1,Math.floor(x/dayW)));let m=H0*60+Math.round((x-di*dayW)/px*2)*30;m=Math.max(H0*60,Math.min(H1*60-60,m));edit(null,{date:addD(U.anchor,di),s:m,e:Math.min(H1*60,m+120),[key]:val})}
function view(){try{if(!U.view||U.view==="res")U.view="tl";if(!U.anchor)U.anchor=today();demoSeed();
 let body;if(U.view==="week")body=grid([0,1,2,3,4,5,6].map(i=>addD(monday(U.anchor),i)));else if(U.view==="day")body=grid([U.anchor]);else body=tlView();
 const empty=!visible().length?`<div class="sc-empty">No bookings yet. Tap <b>+ Book</b>, or tap an empty time on the calendar. ${demoOn()?"":"Turn on Demo Mode (Toolkit → Demo) to see a sample week."}</div>`:"";
 return `<div class="sc-wrap">${head()}${chips()}${empty}${U.view==="tl"?body+`<div style="height:10px"></div>`+stats():stats()+body}${agenda()}<div class="sc-foot">${(()=>{try{return typeof fbOn==="function"&&fbOn()?"☁️ Synced with the school cloud · saved on this device first, so it works offline":"Saved on this device · sign in to share bookings with your school"}catch(e){return ""}})()}</div></div><div id="scModal"></div>`}
 catch(e){console.warn("sched",e);return `<div class="pnl">Scheduling hit an error: ${esc(e.message)}</div>`}}
function after(){try{const tw=document.querySelector(".tl-scroll");if(tw){const px=TLPX();const h=new Date().getHours();const st=(U.anchor===today()&&h>=7&&h<=19?h-1:7)-H0;tw.scrollLeft=Math.max(0,st*px);
 const box=document.querySelector(".tl");const on=id=>{box.classList.add("linking");box.querySelectorAll(".tl-b").forEach(e=>e.classList.toggle("lk",e.dataset.id===id))};const off=()=>{box.classList.remove("linking");box.querySelectorAll(".tl-b.lk").forEach(e=>e.classList.remove("lk"))};
 box.addEventListener("pointerover",e=>{const b=e.target.closest(".tl-b");if(b)on(b.dataset.id)});box.addEventListener("pointerout",e=>{const b=e.target.closest(".tl-b");if(b&&!(e.relatedTarget&&e.relatedTarget.closest&&e.relatedTarget.closest(".tl-b")===b))off()});}}catch(e){}
/* scroll to ~7am */try{const b=document.querySelector(".sc-body");if(b&&U.view!=="res"){const h=new Date().getHours();b.scrollTop=Math.max(0,((U.view==="day"&&U.anchor===today()?Math.min(Math.max(h,7),17):7)-H0-0.5)*PXH)}}catch(e){}}
function rr(){if(typeof render==="function")render();else document.dispatchEvent(new Event("sched"))}

/* ---------- modal: editor ---------- */
let ED=null;
function edit(id,pre){const b=id?U.bk.find(x=>x.id===id):null;
 ED=b?{...b,...(pre||{})}:Object.assign({date:U.anchor||today(),s:9*60,e:11*60,stu:"",cfi:"",tail:"",les:LESSONS[0],note:""},pre||{});
 if(!b&&U.filt.t&&U.filt.v&&!(pre&&pre[U.filt.t]))ED[U.filt.t]=U.filt.v;
 const opt=(list,sel,lab,fmt)=>`<option value="">${lab}</option>`+list.map(x=>`<option value="${esc(x)}"${x===sel?" selected":""}>${esc(fmt?fmt(x):strip(x))}</option>`).join("");
 const pl=planes();const tfmt=t=>{const s=tstat(t);return strip(t)+(s==="r"?"  ⛔ GROUNDED":s==="y"?"  ⚠ check":"")};
 const times=[];for(let m=H0*60;m<=H1*60;m+=15)times.push(m);const topt=sel=>times.map(m=>`<option value="${m}"${m===sel?" selected":""}>${hm(m)}</option>`).join("");
 $("scModal").innerHTML=`<div class="sc-mask" onclick="if(event.target===this)SCHED.close()"><div class="sc-dlg" role="dialog" aria-label="Booking">
 <div class="sc-dh"><h2>${b?"Reschedule / edit":"New booking"}</h2><button class="btn sm" onclick="SCHED.close()" aria-label="Close">✕</button></div>
 <div class="sc-form">
  <label>Date<input type="date" id="scD" value="${esc(ED.date)}" oninput="SCHED.chk()"></label>
  <div class="sc-2"><label>Start<select id="scS" onchange="SCHED.chk(1)">${topt(ED.s)}</select></label><label>End<select id="scE" onchange="SCHED.chk()">${topt(ED.e)}</select></label></div>
  <label>Student<select id="scStu" onchange="SCHED.chk()">${opt(students(),ED.stu,"— choose student —")}</select></label>
  <label>Instructor<select id="scCfi" onchange="SCHED.chk()">${opt(cfis(),ED.cfi,"— choose CFI —")}</select></label>
  <label>Aircraft<select id="scT" onchange="SCHED.chk()">${opt(pl,ED.tail,"No aircraft (ground / sim)",tfmt)}</select></label>
  <label>Lesson type <small>(optional)</small><select id="scL" onchange="SCHED.chk()">${opt(LESSONS,ED.les,"—",x=>x)}</select></label>
  <label>Notes <small>(optional)</small><input id="scN" maxlength="140" value="${esc(ED.note||"")}" placeholder="e.g. RNAV 27 x2, hold at ECHO"></label>
  <details class="sc-add"><summary>+ Add a student or instructor not listed</summary><div class="sc-2"><input id="scAS" placeholder="Student name"><button class="btn sm" onclick="SCHED.addP('studs','scAS')">Add student</button></div><div class="sc-2"><input id="scAC" placeholder="CFI name"><button class="btn sm" onclick="SCHED.addP('cfis','scAC')">Add CFI</button></div></details>
 </div>
 <div id="scMsg" class="sc-msg"></div>
 <div class="sc-act"><button class="btn" onclick="SCHED.close()">Cancel</button><button class="btn pri" id="scSave" onclick="SCHED.commit()">${b?"Save changes":"Book it"}</button></div></div></div>`;chk()}
function read(){return {date:$("scD").value,s:+$("scS").value,e:+$("scE").value,stu:$("scStu").value,cfi:$("scCfi").value,tail:$("scT").value,les:$("scL").value,note:$("scN").value.trim()}}
function problems(c){const p=[],w=[];if(!c.date)p.push("Pick a date");if(!(c.e>c.s))p.push("End time must be after start");if(!c.stu)p.push("Choose a student");if(!c.cfi&&c.les!=="Solo")p.push("Choose an instructor (or lesson type Solo)");
 if(c.tail){const s=tstat(c.tail);if(s==="r")p.push(`⛔ ${strip(c.tail)} is GROUNDED on the fleet board — ${treason(c.tail)}`);else if(s==="y")w.push(`⚠ ${strip(c.tail)} has open items — ${treason(c.tail)}`)}
 p.push(...conflicts(c,ED&&ED.id).map(x=>"⛔ Conflict: "+x));return {p,w}}
function chk(startChanged){if(!$("scS"))return;if(startChanged){const s=+$("scS").value,e=+$("scE").value;const len=ED?Math.max(30,ED.e-ED.s):120;if(!(e>s)||startChanged)$("scE").value=String(Math.min(H1*60,s+len))}
 const c=read();ED&&(ED.s=c.s,ED.e=c.e);const {p,w}=problems(c);const m=$("scMsg");
 const hard=p.filter(x=>x.startsWith("⛔"));const soft=p.filter(x=>!x.startsWith("⛔"));
 m.innerHTML=hard.map(x=>`<div class="bad">${esc(x)}</div>`).join("")+w.map(x=>`<div class="warn">${esc(x)}</div>`).join("")+(!hard.length&&!soft.length?`<div class="good">✓ Student, CFI and aircraft are all free · ${hm(c.s)}–${hm(c.e)} (${((c.e-c.s)/60).toFixed(1)} h)</div>`:soft.length&&!hard.length?`<div class="mut">${esc(soft[0])}</div>`:"");
 $("scSave").disabled=p.length>0}
function commit(){const c=read();const {p}=problems(c);if(p.length){chk();return}
 if(ED&&ED.id){const b=U.bk.find(x=>x.id===ED.id);if(b){const moved=b.date!==c.date||b.s!==c.s;Object.assign(b,c);if(b.st==="cx")b.st="ok";b.hist=(b.hist||[]).concat([{t:Date.now(),a:moved?"Rescheduled":"Edited"}])}}
 else U.bk.push({id:nid(),st:"ok",...c,hist:[{t:Date.now(),a:"Booked"}]});
 save();close();if(c.date<monday(U.anchor)||c.date>addD(monday(U.anchor),6)||U.view==="day"||U.view==="res")U.anchor=c.date;save();
 if(typeof toast==="function")toast(ED&&ED.id?"Booking updated":"Booked ✓ "+strip(c.stu)+" · "+hm(c.s));ED=null;rr()}
function addP(k,inp){const v=($(inp).value||"").trim();if(!v)return;U[k]=[...new Set([...U[k],v])];save();const c=read();edit(ED&&ED.id,{...c,[k==="studs"?"stu":"cfi"]:v});if(typeof toast==="function")toast("Added "+v)}
function close(){const m=$("scModal");if(m)m.innerHTML="";try{const bx=document.querySelector(".tl");if(bx){bx.classList.remove("linking");bx.querySelectorAll(".tl-b.lk").forEach(e=>e.classList.remove("lk"))}}catch(e){}}

/* ---------- modal: detail ---------- */
function show(id){const b=U.bk.find(x=>x.id===id);if(!b)return;try{const bx=document.querySelector(".tl");if(bx){bx.classList.add("linking");bx.querySelectorAll(".tl-b").forEach(e=>e.classList.toggle("lk",e.dataset.id===id))}}catch(e){}const c=colorOf(b);const st=b.st==="cx"?"CANCELLED":b.st==="done"?"COMPLETED":c==="red"?"AIRCRAFT GROUNDED":"CONFIRMED";
 const row=(k,v)=>`<div class="sc-kv"><span>${k}</span><b>${v}</b></div>`;
 $("scModal").innerHTML=`<div class="sc-mask" onclick="if(event.target===this)SCHED.close()"><div class="sc-dlg" role="dialog" aria-label="Booking detail">
 <div class="sc-dh"><h2>${esc(strip(b.stu)||"Booking")}</h2><button class="btn sm" onclick="SCHED.close()" aria-label="Close">✕</button></div>
 <div class="sc-badge ${b.st==="cx"?"cx":c}">${st}</div>
 ${row("When",esc(parse(b.date).toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"}))+" · "+hm(b.s)+"–"+hm(b.e)+" ("+((b.e-b.s)/60).toFixed(1)+" h)")}
 ${row("Instructor",esc(strip(b.cfi)||"— (solo)"))}${row("Aircraft",b.tail?esc(strip(b.tail))+(tstat(b.tail)!=="g"?` <small class="${tstat(b.tail)==="r"?"red":"amb"}">${esc(treason(b.tail))}</small>`:""):"Ground / sim")}
 ${row("Lesson",esc(b.les||"—"))}${b.note?row("Notes",esc(b.note)):""}${b.sample?row("Data","SAMPLE (demo)"):""}
 ${c==="red"&&b.st!=="cx"?`<div class="sc-msg"><div class="bad">⛔ This aircraft went RED on the fleet board after it was booked. Reschedule to another aircraft or cancel.</div></div>`:""}
 ${(b.hist||[]).length?`<div class="sc-hist">${b.hist.map(h=>`${esc(h.a)} · ${esc(new Date(h.t).toLocaleString())}`).join("<br>")}</div>`:""}
 <div class="sc-act">${b.st==="cx"?`<button class="btn" onclick="SCHED.del('${esc(b.id)}')">Delete</button><button class="btn pri" onclick="SCHED.edit('${esc(b.id)}')">Rebook</button>`:`<button class="btn sc-danger" onclick="SCHED.cancel('${esc(b.id)}')">Cancel booking</button><button class="btn pri" onclick="SCHED.edit('${esc(b.id)}')">Reschedule</button>`}</div></div></div>`}
function cancel(id){const b=U.bk.find(x=>x.id===id);if(!b)return;if(!confirm(`Cancel ${strip(b.stu)} · ${hm(b.s)}–${hm(b.e)}? The student, CFI and aircraft become free.`))return;b.st="cx";b.hist=(b.hist||[]).concat([{t:Date.now(),a:"Cancelled"}]);save();close();if(typeof toast==="function")toast("Booking cancelled");rr()}
function del(id){U.bk=U.bk.filter(x=>x.id!==id);save();close();rr()}

/* ---------- interactions ---------- */
function slot(d,ev){const col=ev.currentTarget;const r=col.getBoundingClientRect();const y=ev.clientY-r.top;let m=H0*60+Math.floor(y/PXH*4)*15;m=Math.max(H0*60,Math.min(H1*60-60,Math.round(m/30)*30));edit(null,{date:d,s:m,e:Math.min(H1*60,m+120)})}
function resSlot(key,val,ev){const r=ev.currentTarget.getBoundingClientRect();const x=(ev.clientX-r.left)/r.width;let m=H0*60+Math.round(x*(H1-H0)*2)*30;m=Math.max(H0*60,Math.min(H1*60-60,m));edit(null,{date:U.anchor,s:m,e:Math.min(H1*60,m+120),[key]:val})}
function nav(n){if(!U.anchor)U.anchor=today();if(n===0)U.anchor=today();else U.anchor=addD(U.anchor,n*(U.view==="week"?7:U.view==="tl"?U.days:1));save();rr()}
function setDays(n){U.days=n;save();rr()}
function togStu(){U.tlStu=!U.tlStu;save();rr()}
function setView(v){U.view=v;save();rr()}
function setRes(v){U.res=v;save();rr()}
function setF(v){const i=v.indexOf("|");U.filt=i>0?{t:v.slice(0,i),v:v.slice(i+1)}:{t:"",v:""};save();rr()}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("scModal")&&$("scModal").innerHTML)close()});

window.SCHED={view,setDays,togStu,tlSlot,after,edit,chk,commit,close,show,cancel,del,slot,resSlot,nav,setView,setRes,setF,addP,_U:()=>U,_conflicts:conflicts};
})();
