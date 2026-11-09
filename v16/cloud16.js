/* v16 shared data layer: syncs Scheduling, Customer Accounts, Logbook entries (with CFI review),
   visual-lesson progress and a staff member directory to Firestore (project tes-ifr-f5e73, free Spark plan —
   REST only, no Cloud Functions). Same document envelope as the existing sync:
   /schools/{school}/{kind}/{id} = {uid, sid, kind, updated:int, del:bool, json:string[, rv]}
   Offline-first: every change is saved on the device; a content hash per record decides what to upload,
   so anything changed while offline uploads on the next sync. SAMPLE/demo records are never uploaded. */
(function(){
"use strict";
const LS="tes-c16";
let M;try{M=JSON.parse(localStorage.getItem(LS)||"null")}catch(e){M=null}
if(!M||typeof M!=="object")M={};M.h=M.h||{};M.since=M.since||{};M.dir=M.dir||[];M.q=M.q||[];M.last=M.last||0;M.err=M.err||"";M.mig=M.mig||null;
const saveM=()=>{try{localStorage.setItem(LS,JSON.stringify(M))}catch(e){}};
const esc3=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const strip=n=>String(n||"").replace(/^SAMPLE\s+[–-]\s+/,"");
const isSample=r=>!!(r&&(r.sample||/^SAMPLE/.test(String(r.stu||r.name||r.sid||r.tail||""))));
const slug=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80)||"x";
const role=()=>{try{return (typeof fbOn==="function"&&fbOn()&&S.fb.role)||""}catch(e){return ""}};
const isStaffR=r=>r==="admin"||r==="cfii";
function hash(o){const s=JSON.stringify(o);let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36)+":"+s.length}
/* name → uid from the member directory (admin publishes it; CFIIs read it) */
function uidFor(name){const n=strip(name).trim().toLowerCase();if(!n)return "";const m=(M.dir||[]).find(x=>String(x.name||"").trim().toLowerCase()===n&&x.role==="student");return m?m.uid:""}
/* ---------- local collectors ---------- */
const schedU=()=>{try{return window.SCHED?SCHED._U():null}catch(e){return null}};
const acctU=()=>{try{return window.ACCT?ACCT._U():null}catch(e){return null}};
function ensureFlightIds(){const F=(S.flights||[]);let ch=false;F.forEach((f,i)=>{if(!f.id){f.id="f"+(f.t||Date.now())+"-"+i;ch=true}if(f.src==="photo"&&!f.rv){f.rv="pending";ch=true}});if(ch)try{save()}catch(e){}return F}
function visProg(){try{return JSON.parse(localStorage.getItem("tes-vis")||"{}")}catch(e){return {}}}
const KINDS={
 book:{who:r=>isStaffR(r),list(){const U=schedU();if(!U)return {};const o={};U.bk.filter(b=>!isSample(b)).forEach(b=>o[b.id]=b);return o},
  uid:(b)=>uidFor(b.stu)||S.fb.uid,sid:b=>strip(b.stu)},
 acct:{who:r=>r==="admin",list(){const U=acctU();if(!U)return {};const o={};const names=new Set([...Object.keys(U.pk||{}),...(U.use||[]).map(x=>x.name),...(U.led||[]).map(x=>x.name)]);
  names.forEach(n=>{if(!n||/^SAMPLE/.test(n))return;const pk=(U.pk||{})[n];if(pk&&pk.sample)return;o[slug(n)]={id:slug(n),name:n,pk:pk||null,use:(U.use||[]).filter(x=>x.name===n&&!x.sample),led:(U.led||[]).filter(x=>x.name===n&&!x.sample)}});return o},
  uid:a=>uidFor(a.name)||S.fb.uid,sid:a=>strip(a.name)},
 lbk:{who:r=>r==="student",list(){const o={};ensureFlightIds().filter(f=>!isSample(f)).forEach(f=>o[f.id]=f);return o},uid:()=>S.fb.uid,sid:()=>"uid:"+S.fb.uid,rv:f=>f.rv==="approved"||f.rv==="returned"?(f._pend?"pending":f.rv):"pending"},
 prog:{who:r=>r==="student",list(){const p=visProg();return Object.keys(p).length?{[S.fb.uid]:{id:S.fb.uid,vis:p}}:{}},uid:()=>S.fb.uid,sid:()=>"uid:"+S.fb.uid}};
/* ---------- push ---------- */
async function pushKind(kind,force){const K=KINDS[kind],r=role();if(!K.who(r))return 0;const L=K.list();M.h[kind]=M.h[kind]||{};let n=0;
 for(const id of Object.keys(L)){const rec=L[id];const {_pend,rv:_rv,rvNote:_rn,...clean}=rec;const h=hash(clean);if(!force&&M.h[kind][id]===h)continue;
  if(kind==="lbk"&&rec.rv==="approved"&&M.h[kind][id]){M.h[kind][id]=h;continue}/* approved entries are locked; edits stay on the device */
  const doc={uid:K.uid(rec),sid:K.sid(rec),kind,updated:Date.now(),del:false,json:JSON.stringify(clean)};if(kind==="lbk")doc.rv="pending";
  try{await fbDoc(`/schools/${S.fb.school}/${kind}/${encodeURIComponent(id)}`,doc);M.h[kind][id]=h;n++}catch(e){if(e.code===403&&kind==="lbk"){M.h[kind][id]=h;continue}throw e}}
 if(kind==="book"||kind==="acct"){for(const id of Object.keys(M.h[kind])){if(L[id])continue;const prev=M.dirRec&&M.dirRec[kind+"/"+id];
  await fbDoc(`/schools/${S.fb.school}/${kind}/${encodeURIComponent(id)}`,{uid:(prev&&prev.uid)||S.fb.uid,sid:"",kind,updated:Date.now(),del:true,json:JSON.stringify({id})});delete M.h[kind][id];n++}}
 saveM();return n}
/* ---------- pull ---------- */
function where(kind){const r=role();const own=!isStaffR(r);if(own)return {fieldFilter:{field:{fieldPath:"uid"},op:"EQUAL",value:{stringValue:S.fb.uid}}};
 return {fieldFilter:{field:{fieldPath:"updated"},op:"GREATER_THAN",value:{integerValue:String(M.since[kind]||0)}}}}
function canRead(kind,r){if(kind==="book")return isStaffR(r)||r==="student";if(kind==="acct")return r==="admin"||r==="student";if(kind==="lbk")return isStaffR(r)||r==="student";if(kind==="dir")return isStaffR(r);return false}
function merge(kind,d){let rec=null;try{rec=JSON.parse(d.json||"null")}catch(e){}if(!rec)return;const r=role();
 if(kind==="book"){const U=schedU();if(!U)return;const i=U.bk.findIndex(b=>b.id===rec.id);if(d.del){if(i>=0)U.bk.splice(i,1)}else if(i<0)U.bk.push(rec);else U.bk[i]=rec;M.h.book=M.h.book||{};if(isStaffR(r)){if(d.del)delete M.h.book[rec.id];else M.h.book[rec.id]=hash(rec)}localStorage.setItem("tes-sched",JSON.stringify(U));return}
 if(kind==="acct"){const U=acctU();if(!U)return;let n=rec.name;if(!n)return;
  if(r==="student"&&S.name){n=S.name;rec={...rec,name:n,use:(rec.use||[]).map(x=>({...x,name:n})),led:(rec.led||[]).map(x=>({...x,name:n}))}}U.use=(U.use||[]).filter(x=>x.name!==n);U.led=(U.led||[]).filter(x=>x.name!==n);if(d.del){delete U.pk[n]}else{if(rec.pk)U.pk[n]=rec.pk;else delete U.pk[n];U.use.push(...(rec.use||[]));U.led.push(...(rec.led||[]))}
  if(r==="admin"){M.h.acct=M.h.acct||{};if(d.del)delete M.h.acct[rec.id];else M.h.acct[rec.id]=hash(rec)}localStorage.setItem("tes-acct",JSON.stringify(U));return}
 if(kind==="lbk"){if(r==="student"){const f=(S.flights||[]).find(x=>x.id===rec.id);if(f&&d.rv&&d.rv!==f.rv){f.rv=d.rv;f.rvNote=rec.rvNote||"";try{save()}catch(e){}}return}
  const q=M.q.findIndex(x=>x.id===rec.id);const row={...rec,_uid:d.uid,_sid:d.sid,rv:d.rv||"pending",_upd:d.updated,del:!!d.del};if(q<0)M.q.push(row);else M.q[q]=row;return}
 if(kind==="dir"){if(Array.isArray(rec.members))M.dir=rec.members;return}}
async function pull(){const r=role();for(const kind of ["dir","book","acct","lbk"]){if(!canRead(kind,r))continue;let docs;try{docs=await fbQuery(kind,where(kind))}catch(e){if(e.code===403)continue;throw e}
 let mx=M.since[kind]||0;docs.forEach(d=>{mx=Math.max(mx,d.updated||0);merge(kind,d)});if(isStaffR(r))M.since[kind]=mx}saveM()}
/* ---------- member directory (admin) ---------- */
async function publishDir(){if(role()!=="admin"||!Array.isArray(S.fb.members))return;const members=S.fb.members.map(m=>({uid:m.uid,name:m.name||"",role:m.role||""}));M.dir=members;
 await fbDoc(`/schools/${S.fb.school}/dir/members`,{uid:S.fb.uid,sid:"",kind:"dir",updated:Date.now(),del:false,json:JSON.stringify({members})});saveM()}
/* ---------- sync orchestration ---------- */
let BUSY=false,SOON=0;
function soon(){clearTimeout(SOON);SOON=setTimeout(()=>{try{if(typeof fbOn==="function"&&fbOn())fbSync()}catch(e){}},1500)}
async function sync(loud){if(BUSY||typeof fbOn!=="function"||!fbOn())return;if(!navigator.onLine)return;BUSY=true;let n=0;try{await pull();for(const k of Object.keys(KINDS))n+=await pushKind(k,false);M.last=Date.now();M.err=""}catch(e){M.err=e.message||String(e);if(loud&&typeof toast==="function")toast("Sync (v16): "+M.err)}BUSY=false;saveM();return n}
function install(){
 if(install.done)return;install.done=1;
 if(typeof fbSync==="function"){const orig=fbSync;window.fbSync=fbSync=async function(loud){const r=await orig.apply(this,arguments);try{await sync(loud)}catch(e){}return r}}
 if(typeof fbMembers==="function"){const om=fbMembers;window.fbMembers=fbMembers=async function(){const r=await om.apply(this,arguments);try{await publishDir()}catch(e){}return r}}
 VIEWS.lbq=lbqView;VIEWS.data16=dataView;
 /* push soon after a save instead of waiting for the 1-minute timer */
 const hook=(obj,names)=>{if(!obj)return;names.forEach(n=>{const f=obj[n];if(typeof f!=="function")return;obj[n]=function(){const r=f.apply(this,arguments);soon();return r}})};
 hook(window.SCHED,["commit","cancel","del"]);hook(window.ACCT,["pkSave","pkDel","useSave","useDel","ledSave","ledDel"]);hook(window.LOGBK,["commit"]);
 if(VIEWS.myacct){const om=VIEWS.myacct;VIEWS.myacct=()=>myBookings()+om()}
}
/* ---------- Student: my upcoming bookings (from the school schedule) ---------- */
function myBookings(){const U=schedU();if(!U)return "";const me=strip((typeof S!=="undefined"&&S.name)||"").toLowerCase();const signed=role()==="student";
 const d=new Date(),td=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
 const L=U.bk.filter(b=>!isSample(b)&&b.st!=="cx"&&b.date>=td&&(signed||strip(b.stu).toLowerCase()===me)).sort((a,b)=>(a.date+a.s).localeCompare(b.date+b.s)).slice(0,6);if(!L.length)return "";
 const hm=m=>{const h=Math.floor(m/60),mm=m%60;return (h%12||12)+(mm?":"+String(mm).padStart(2,"0"):"")+(h>=12?"p":"a")};
 return `<div class="pnl" style="margin-bottom:10px"><h3 style="margin-top:0">📅 My upcoming bookings</h3>${L.map(b=>`<div class="ar-li"><b>${esc3(b.date)} ${hm(b.s)}–${hm(b.e)}</b> <span class="mut">· ${esc3(strip(b.cfi))} · ${esc3(strip(b.tail)||"sim")}${b.les?" · "+esc3(b.les):""}</span></div>`).join("")}<p class="small mut">From the school schedule. To change a booking, contact the front desk.</p></div>`}
/* ---------- Logbook review queue (CFII / admin) ---------- */
function demoQ(){try{if(!S.tk.demo)return []}catch(e){return []}const now=Date.now(),D=864e5;
 return [["SAMPLE – Alex Rivera","2026-11-02","C172S N738SP",1.4,0.8,"pending"],["SAMPLE – Jordan Lee","2026-11-03","C172S N5212K",1.1,1.1,"pending"],["SAMPLE – Casey Morgan","2026-10-30","PA-28 N4419T",1.6,0.5,"approved"],["SAMPLE – Taylor Brooks","2026-10-28","C172S N738SP",0.9,0.9,"returned"]]
  .map((x,i)=>({id:"smpq"+i,sample:true,_sid:x[0],date:x[1],ac:x[2],tot:x[3],act:x[4],apr:i%2?1:2,rv:x[5],src:"photo",rvNote:x[5]==="returned"?"SAMPLE — total time doesn't match the Hobbs entry":"",_upd:now-i*D}))}
const LQ={f:"pending"};
function nameOf(x){const m=(M.dir||[]).find(d=>d.uid&&d.uid===x._uid);if(m&&m.name)return m.name;const s=String(x._sid||"");return /^uid:/.test(s)?"Student "+s.slice(4,10):(s||"Student")}
function rows(){const R=(M.q||[]).filter(x=>!x.del).concat(demoQ().filter(d=>!(M.qs||{})[d.id]).concat(Object.values(M.qs||{})));return R}
function lbqView(){const all=rows();const R=all.filter(x=>LQ.f==="all"||x.rv===LQ.f).sort((a,b)=>String(b.date).localeCompare(String(a.date)));const cnt=k=>all.filter(x=>x.rv===k).length;
 const r=role()||(S.tk&&S.tk.demo?"demo":"");
 return `<div class="pnl"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><div><h2 style="margin:0">📓 Logbook review queue</h2><p class="small mut" style="margin:4px 0 0">Entries students saved from logbook photos (each one already passed the student's mandatory review screen). Approve, or return with a note.</p></div>
 <div class="vl-seg">${[["pending","Pending"],["approved","Approved"],["returned","Returned"],["all","All"]].map(([k,t])=>`<button class="${LQ.f===k?"on":""}" onclick="C16.lqf('${k}')">${t} (${k==="all"?all.length:cnt(k)})</button>`).join("")}</div></div>
 ${!r?`<p class="small mut">Sign in (or open Demo Mode) to see your students' entries.</p>`:""}
 <div class="lq-list">${R.length?R.map(x=>`<div class="lq-row ${x.rv}"><div class="lq-main"><b>${esc3(strip(nameOf(x)))}</b> <span class="mut">· ${esc3(x.date||"")}</span><div class="small">${esc3(x.ac||"")} · total <b>${esc3(x.tot)}</b> h${x.act?` · actual inst <b>${esc3(x.act)}</b>`:""}${x.sim?` · sim ${esc3(x.sim)}`:""}${x.apr?` · ${esc3(x.apr)} appr`:""} ${x.src==="photo"?'<span class="chip m">📷 photo</span>':""}</div>${x.rvNote?`<div class="small lq-note">“${esc3(x.rvNote)}”</div>`:""}</div>
  <div class="lq-act"><span class="chip ${x.rv==="approved"?"g":x.rv==="returned"?"r":"y"}">${x.rv.toUpperCase()}</span>${x.rv!=="approved"?`<button class="btn sm pri" onclick="C16.review('${esc3(x.id)}','approved')">Approve</button>`:""}${x.rv!=="returned"?`<button class="btn sm" onclick="C16.review('${esc3(x.id)}','returned')">Return…</button>`:""}</div></div>`).join(""):`<p class="mut">Nothing ${LQ.f==="all"?"":LQ.f} right now.</p>`}</div>
 <p class="small mut">${M.last?"Last sync "+new Date(M.last).toLocaleString():"Not synced yet"}${M.err?` · <span class="red">${esc3(M.err)}</span>`:""}</p></div>`}
async function review(id,rv){const all=rows();const x=all.find(y=>y.id===id);if(!x)return;let note="";if(rv==="returned"){note=prompt("Note for the student (what to fix):",x.rvNote||"");if(note===null)return}
 if(x.sample){M.qs=M.qs||{};M.qs[id]={...x,rv,rvNote:note};saveM();if(typeof toast==="function")toast(rv==="approved"?"Approved (SAMPLE)":"Returned (SAMPLE)");render();return}
 if(!isStaffR(role())){if(typeof toast==="function")toast("CFII or admin sign-in needed");return}
 const {_uid,_sid,_upd,del,...rec}=x;rec.rv=rv;rec.rvNote=note;
 try{await fbDoc(`/schools/${S.fb.school}/lbk/${encodeURIComponent(id)}`,{uid:_uid,sid:_sid||"",kind:"lbk",updated:Date.now(),del:false,rv,json:JSON.stringify(rec)});x.rv=rv;x.rvNote=note;const i=M.q.findIndex(y=>y.id===id);if(i>=0)M.q[i]={...M.q[i],rv,rvNote:note};saveM();if(typeof toast==="function")toast(rv==="approved"?"Entry approved":"Returned to student");render()}catch(e){if(typeof toast==="function")toast("Couldn't save review: "+e.message)}}
/* ---------- Data & migration (admin) ---------- */
function counts(){const c={};const r=role()||"admin";for(const k of Object.keys(KINDS)){try{c[k]=Object.keys(KINDS[k].list()).length}catch(e){c[k]=0}}return c}
function backup(){const o={exported:new Date().toISOString(),app:"TES IFR",v:16,data:{}};for(const k of ["tes-sched","tes-acct","tes-vis",LS])o.data[k]=localStorage.getItem(k);try{o.data.flights=S.flights||[];o.data.roster=S.roster||[]}catch(e){}
 const b=new Blob([JSON.stringify(o,null,1)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="tes-ifr-backup-"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);M.backup=Date.now();saveM()}
async function migrate(){const r=role();if(!r){if(typeof toast==="function")toast("Sign in first — Demo Mode data is never uploaded");return}
 if(!M.backup&&!confirm("Tip: download a backup first. Upload anyway?"))return;let n=0,out={};
 try{if(r==="admin"&&Array.isArray(S.fb.members)&&S.fb.members.length)await publishDir();for(const k of Object.keys(KINDS)){if(!KINDS[k].who(r))continue;const c=await pushKind(k,true);out[k]=c;n+=c}M.mig={t:Date.now(),by:S.fb.email||"",out};saveM();if(typeof toast==="function")toast(`Uploaded ${n} record(s) to the school cloud`);render()}catch(e){M.err=e.message;saveM();if(typeof toast==="function")toast("Upload stopped: "+e.message+" — nothing is lost; try again");render()}}
function dataView(){const c=counts();const r=role();const lbl={book:"Bookings (Scheduling)",acct:"Customer accounts (packages, usage, ledger)",lbk:"Logbook entries (student devices)",prog:"Visual-lesson progress (student devices)"};
 return `<div class="pnl" style="max-width:820px;margin:auto"><h2>🗄 Data &amp; migration</h2><p>Moves this device's records into the shared school database (Firebase project <b>tes-ifr-f5e73</b>) so the Admin portal and the Lessons app see the same data.</p>
 <table class="t small"><tr><th>Record type</th><th>On this device</th><th>Who uploads it</th></tr>${Object.keys(lbl).map(k=>`<tr><td>${lbl[k]}</td><td><b>${c[k]}</b></td><td>${{book:"CFII or admin",acct:"Admin",lbk:"Each student (automatic)",prog:"Each student (automatic)"}[k]}</td></tr>`).join("")}</table>
 <p class="small mut">SAMPLE/demo records are skipped. Uploads are safe to repeat — each record keeps its ID, so nothing duplicates.</p>
 <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" onclick="C16.backup()">⬇ Download backup (JSON)</button><button class="btn pri" onclick="C16.migrate()" ${r?"":"disabled"}>⬆ Upload this device's records</button><button class="btn" onclick="fbSync(true)" ${r?"":"disabled"}>↻ Sync now</button></div>
 ${!r?`<p class="small">Sign in to upload. ${S.tk&&S.tk.demo?"You're in Demo Mode — nothing here is uploaded.":""}</p>`:""}
 <p class="small">${M.backup?"Backup downloaded "+new Date(M.backup).toLocaleString()+" · ":""}${M.mig?`Last upload ${new Date(M.mig.t).toLocaleString()} by ${esc3(M.mig.by)}: ${Object.entries(M.mig.out).map(([k,v])=>k+" "+v).join(", ")}`:"Not uploaded yet"}${M.err?` · <span class="red">${esc3(M.err)}</span>`:""}</p>
 <details><summary>How the shared data is organised</summary><p class="small">/schools/{school}/book, /acct, /lbk, /prog, /dir — plus the existing records (squawks, aircraft, sign-offs, training logs…). Students can only read their own bookings, account, logbook and progress. Only admins write accounts. CFIIs approve logbook entries. Full rules: see the Google Doc “TES IFR — Firestore rules v16”.</p></details></div>`}
window.C16={install,soon,sync,pull,pushKind,migrate,backup,publishDir,review,lqf:f=>{LQ.f=f;render()},counts,_M:()=>M,_hash:hash,KINDS};
})();
