/* v14: Customer accounts "at a glance".
   PACKAGE: price is spread across included units at a per-unit package rate, so every completed
   hour/lesson draws the package value down at that rate. When all included units are used the
   package value remaining is exactly $0.00 ("Package complete").
   ACCOUNT CREDIT: real prepaid money outside the package, with a charges ledger and Amount Due.
   No payment processing. Local storage only. */
(function(){
"use strict";
const LS="tes-acct";let U;try{U=JSON.parse(localStorage.getItem(LS)||"null")}catch(e){U=null}
if(!U||typeof U!=="object")U={};U.pk=U.pk||{};U.use=Array.isArray(U.use)?U.use:[];U.led=Array.isArray(U.led)?U.led:[];U.sel=U.sel||"";U.cv=U.cv||"";
const save=()=>{try{localStorage.setItem(LS,JSON.stringify(U))}catch(e){}};
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const jsq=s=>esc(JSON.stringify(String(s)));
const strip=n=>String(n||"").replace(/^SAMPLE\s+[–-]\s+/,"");
const r2=n=>Math.round((+n||0)*100)/100;
const money=n=>(n<0?"−":"")+"$"+Math.abs(r2(n)).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const pad=n=>String(n).padStart(2,"0");const ymd=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const today=()=>ymd(new Date());const addD=(s,n)=>{const d=new Date(s+"T12:00");d.setDate(d.getDate()+n);return ymd(d)};
const fdate=s=>{try{return new Date(s+"T12:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}catch(e){return s}};
const nid=()=>"a"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const demoOn=()=>{try{return !!S.tk.demo}catch(e){return false}};
const TYPES=[["fl","Flight hours","flight hr","flight hrs"],["sim","Sim hours (AATD)","sim hr","sim hrs"],["gnd","Ground hours","ground hr","ground hrs"],["les","Lessons","lesson","lessons"]];
const TN=Object.fromEntries(TYPES.map(t=>[t[0],t]));
const fmtU=(k,q)=>{q=r2(q);const t=TN[k];return (Number.isInteger(q)?q:q.toFixed(1))+" "+(q===1?t[2]:t[3])};
const PLACEHOLDER="Package lessons are non-refundable once the package is complete; unused prepaid credit is shown under Account Credit.";

/* ---------- data ---------- */
function names(){const s=new Set([...Object.keys(U.pk),...U.led.map(x=>x.name),...U.use.map(x=>x.name)]);
 return [...s].filter(n=>demoOn()||!/^SAMPLE/.test(n)).sort((a,b)=>strip(a).localeCompare(strip(b)))}
function vis(a){return a.filter(x=>demoOn()||!x.sample)}
function autoUse(name,pk){if(!pk||!pk.auto||!window.SCHED)return [];let bk=[];try{bk=SCHED._U().bk}catch(e){return []}
 const now=new Date(),nm=now.getHours()*60+now.getMinutes(),td=today();
 return bk.filter(b=>(demoOn()||!b.sample)&&b.stu===name&&b.st!=="cx"&&b.date>=(pk.start||"0000")&&(b.st==="done"||b.date<td||(b.date===td&&b.e<=nm)))
  .map(b=>{const h=r2((b.e-b.s)/60);const t=b.tail?"fl":/sim|ground/i.test(b.les||"")?"sim":"fl";return {id:"auto-"+b.id,name,date:b.date,type:t,qty:h,note:(b.les||"Lesson")+(b.tail?" · "+strip(b.tail):""),auto:1,les:1}})}
function pkCalc(name){const pk=U.pk[name];if(!pk||(pk.sample&&!demoOn()))return null;
 const uses=[...vis(U.use).filter(u=>u.name===name&&u.date>=(pk.start||"0000")),...autoUse(name,pk)];
 const rows=TYPES.filter(([k])=>pk.items&&pk.items[k]&&+pk.items[k].inc>0).map(([k,label])=>{const it=pk.items[k];const inc=+it.inc,rate=+it.rate||0;
  let used=0;uses.forEach(u=>{if(u.type===k)used+=+u.qty||0;if(k==="les"&&u.les&&u.type!=="les")used+=1});used=r2(used);
  const drawn=Math.min(used,inc),rem=r2(inc-drawn),over=r2(Math.max(0,used-inc));return {k,label,inc,rate,used,rem,over,value:r2(inc*rate),remVal:r2(rem*rate)}});
 const price=r2(rows.reduce((a,r)=>a+r.value,0)),remVal=r2(rows.reduce((a,r)=>a+r.remVal,0));const pct=price?Math.round((1-remVal/price)*100):0;
 return {pk,rows,price,remVal,pct,complete:rows.length>0&&rows.every(r=>r.rem<=0),uses:uses.sort((a,b)=>b.date.localeCompare(a.date))}}
function ledger(name){let bal=0;return vis(U.led).filter(x=>x.name===name).sort((a,b)=>a.date.localeCompare(b.date)||(a.t||0)-(b.t||0)).map(x=>{bal=r2(bal+(+x.amt||0));return {...x,bal}})}
function balance(name){const L=ledger(name);return L.length?L[L.length-1].bal:0}
function remText(c){const p=c.rows.filter(r=>r.rem>0).map(r=>fmtU(r.k,r.rem));return p.length?p.join(" + "):"nothing left"}
function summary(){const N=names();let owing=0,due=0,credit=0,done=0;N.forEach(n=>{const b=balance(n);if(b<0){owing++;due+=-b}else credit+=b;const c=pkCalc(n);if(c&&c.complete)done++});return {n:N.length,owing,due:r2(due),credit:r2(credit),done}}

/* ---------- demo ---------- */
function seed(){if(!demoOn()||Object.values(U.pk).some(p=>p.sample)||U.led.some(x=>x.sample))return;
 const R=(()=>{try{return (S.roster||[]).map(r=>r.name).filter(n=>/^SAMPLE/.test(n))}catch(e){return []}})();if(R.length<4)return;
 const [alex,jordan,casey,taylor]=[R.find(n=>/Alex/.test(n))||R[0],R.find(n=>/Jordan/.test(n))||R[1],R.find(n=>/Casey/.test(n))||R[2],R.find(n=>/Taylor/.test(n))||R[3]];
 const t=today(),items={fl:{inc:40,rate:295},sim:{inc:20,rate:125},gnd:{inc:25,rate:85}};
 U.pk[alex]={sample:true,name:"Instrument Rating Package",start:addD(t,-60),paid:true,auto:true,items:JSON.parse(JSON.stringify(items))};
 U.pk[jordan]={sample:true,name:"Instrument Rating Package",start:addD(t,-120),paid:true,auto:false,items:JSON.parse(JSON.stringify(items))};
 const u=(name,d,type,qty,note)=>U.use.push({id:nid(),sample:true,name,date:addD(t,d),type,qty,note});
 [[-55,"gnd",6,"Ground school wk 1–2"],[-50,"sim",4,"AATD scan & holds"],[-44,"fl",6.5,"Dual IFR"],[-36,"gnd",8,"Ground school wk 3–5"],[-30,"sim",8,"AATD approaches"],[-21,"fl",9,"Dual IFR · approaches"],[-12,"fl",4,"XC IFR"]].forEach(x=>u(alex,...x));
 [[-115,"gnd",25,"Ground school complete"],[-100,"sim",20,"AATD block"],[-80,"fl",22,"Dual IFR"],[-30,"fl",18,"XC + checkride prep"]].forEach(x=>u(jordan,...x));
 const L=(name,d,item,hrs,rate,amt)=>U.led.push({id:nid(),sample:true,name,date:addD(t,d),item,hrs,rate,amt:r2(amt),t:Date.now()});
 L(jordan,-120,"Package paid in full (record only)","","",0);
 L(casey,-40,"Prepaid block-time deposit","","",3000);L(casey,-25,"Flight · SAMPLE-3 + CFI",1.5,245,-367.5);L(casey,-18,"Flight · SAMPLE-2 + CFI",1.8,245,-441);L(casey,-6,"AATD sim",2,95,-190);L(casey,-4,"Ground instruction",1,86.5,-86.5);
 L(taylor,-30,"Deposit","","",500);L(taylor,-20,"Flight · SAMPLE-3 + CFI",1.6,245,-392);L(taylor,-12,"Flight · SAMPLE-2 + CFI",2,245,-490);L(taylor,-5,"Flight · SAMPLE-3 + CFI",1.4,245,-343);L(taylor,-5,"Fuel surcharge","","",-115);
 save()}

/* ---------- shared pieces ---------- */
function pkCard(name,admin){const c=pkCalc(name);if(!c)return `<div class="ac-card"><h3>📦 Package</h3><p class="mut">No package on this account.</p>${admin?`<button class="btn sm" onclick="ACCT.pkEdit(${jsq(name)})">+ Set up a package</button>`:""}</div>`;
 const bar=`<div class="ac-bar"><i style="width:${c.pct}%"></i></div>`;
 return `<div class="ac-card ${c.complete?"done":""}"><div class="ac-row"><h3>📦 ${esc(c.pk.name||"Package")}</h3>${admin?`<button class="btn sm" onclick="ACCT.pkEdit(${jsq(name)})">Edit package</button>`:""}</div>
 <div class="ac-sub">Package price <b>${money(c.price)}</b>${c.pk.paid!==false?" · paid in full":""} · includes ${c.rows.map(r=>fmtU(r.k,r.inc)).join(" + ")}</div>
 ${c.complete?`<div class="ac-big ok">✅ Package complete · $0.00 remaining</div><div class="ac-sub">Every lesson and hour in this package has been used. The package value has been fully used for your training.</div>`
 :`<div class="ac-big"><span class="ac-lbl">Package value remaining</span>${money(c.remVal)}<span class="ac-eq">= ${esc(remText(c))}</span></div>`}
 ${bar}<div class="ac-sub">${c.pct}% of package used</div>
 <div class="ac-scroll"><table class="ac-t"><tr><th>Item</th><th>Included</th><th>Used</th><th>Remaining</th><th>Package rate</th><th>Value remaining</th></tr>
 ${c.rows.map(r=>`<tr><td>${esc(r.label)}</td><td>${r2(r.inc)}</td><td>${r2(Math.min(r.used,r.inc))}${r.over?` <span class="amb">(+${r.over} beyond)</span>`:""}</td><td><b>${r2(r.rem)}</b></td><td>${money(r.rate)}</td><td><b>${money(r.remVal)}</b></td></tr>`).join("")}
 <tr class="tot"><td colspan="5">Total package value remaining</td><td><b>${money(c.remVal)}</b></td></tr></table></div>
 ${c.rows.some(r=>r.over)?`<div class="ac-warn">Some time went beyond what the package includes. That extra time is billed separately${admin?" — add it under Account Credit as a charge":""}.</div>`:""}
 <div class="ac-how">How it works: the package price is spread across what it includes. Each completed hour or lesson uses its package rate, so the value remaining always matches the lessons and hours you have left.</div></div>`}
function creditCard(name,admin){const L=ledger(name);const b=L.length?L[L.length-1].bal:0;
 return `<div class="ac-card"><div class="ac-row"><h3>💵 Account Credit</h3>${admin?`<button class="btn sm" onclick="ACCT.ledEdit(${jsq(name)})">+ Credit / charge</button>`:""}</div>
 <div class="ac-sub">Prepaid money that is <b>not</b> part of a package (deposits, block-time credit).</div>
 ${b<0?`<div class="ac-big bad"><span class="ac-lbl">Amount due</span>${money(-b)}</div>`:`<div class="ac-big"><span class="ac-lbl">Available credit</span>${money(b)}</div>`}
 ${L.length?`<div class="ac-scroll"><table class="ac-t"><tr><th>Date</th><th>Item</th><th>Hours</th><th>Rate</th><th>Amount</th><th>Balance</th>${admin?"<th></th>":""}</tr>${L.slice().reverse().map(x=>`<tr><td>${esc(fdate(x.date))}</td><td>${esc(x.item)}</td><td>${x.hrs===""||x.hrs==null?"":esc(x.hrs)}</td><td>${x.rate===""||x.rate==null?"":money(x.rate)}</td><td class="${x.amt<0?"neg":"pos"}">${x.amt>0?"+":""}${money(x.amt)}</td><td>${money(x.bal)}</td>${admin?`<td><button class="btn sm" title="Delete" onclick="ACCT.ledDel('${esc(x.id)}')">✕</button></td>`:""}</tr>`).join("")}</table></div>`:`<p class="mut small">No credit or charges yet.</p>`}</div>`}
function noteBox(admin){const txt=U.note||PLACEHOLDER;return admin?`<div class="ac-card"><h3>📝 Note shown to customers</h3><div class="ac-warn">⚠ PLACEHOLDER wording — replace with ${esc((window.SCHOOL||{}).short||"the school")}'s actual refund policy before customers see this.</div><textarea id="acNote" rows="3">${esc(txt)}</textarea><button class="btn sm" onclick="ACCT.saveNote()">Save note</button></div>`
 :`<div class="ac-note">ℹ️ ${esc(txt)}</div>`}

/* ---------- customer (read-only) ---------- */
function myView(){try{seed();const N=names();let me="";try{me=S.name||""}catch(e){}
 let who=N.includes(me)?me:"";if(demoOn()){who=U.cv&&N.includes(U.cv)?U.cv:(who||N[0]||"")}
 const pick=demoOn()&&N.length?`<div class="ac-demo">Demo — view as: <select onchange="ACCT.cv(this.value)">${N.map(n=>`<option value="${esc(n)}"${n===who?" selected":""}>${esc(strip(n))}</option>`).join("")}</select></div>`:"";
 if(!who)return `<div class="ac-wrap"><div class="ac-card"><h2>💳 My account</h2><p>Your account hasn't been set up on this device yet. Ask the front desk.</p>${demoOn()?"":`<p class="small mut">Tip: turn on Demo Mode to see sample accounts.</p>`}</div></div>`;
 const b=balance(who),c=pkCalc(who);
 return `<div class="ac-wrap">${pick}<div class="ac-hd"><div><div class="small mut">${esc((window.SCHOOL||{}).name||"")}</div><h2>💳 ${esc(strip(who))} · account at a glance</h2></div></div>
 <div class="ac-glance"><div><span>Package value remaining</span><b class="${c&&c.complete?"ok":""}">${c?money(c.remVal):"—"}</b><small>${c?(c.complete?"Package complete":esc(remText(c))):"no package"}</small></div><div><span>${b<0?"Amount due":"Account credit"}</span><b class="${b<0?"bad":""}">${money(Math.abs(b))}</b><small>${b<0?"please see the front desk":"prepaid, outside the package"}</small></div></div>
 ${pkCard(who,false)}${creditCard(who,false)}${noteBox(false)}<div class="ac-foot">Read-only · questions about your account? Ask the front desk.</div></div>`}catch(e){console.warn(e);return `<div class="pnl">Account view error: ${esc(e.message)}</div>`}}

/* ---------- admin ---------- */
function adminView(){try{seed();const N=names();const sel=U.sel&&N.includes(U.sel)?U.sel:"";
 if(sel)return `<div class="ac-wrap"><div class="ac-hd"><button class="btn sm" onclick="ACCT.sel('')">‹ All accounts</button><h2>${esc(strip(sel))}</h2><button class="btn sm" onclick="ACCT.preview(${jsq(sel)})">👁 Customer view</button></div>
  ${pkCard(sel,true)}${usageCard(sel)}${creditCard(sel,true)}${noteBox(true)}</div><div id="acModal"></div>`;
 const rows=N.map(n=>{const c=pkCalc(n),b=balance(n);return `<tr onclick="ACCT.sel(${jsq(n)})"><td><b>${esc(strip(n))}</b></td><td>${c?esc(c.pk.name):"<span class=mut>—</span>"}</td><td>${c?(c.complete?`<span class="chip g">COMPLETE</span> $0.00`:`${money(c.remVal)}<div class="small mut">${esc(remText(c))}</div>`):"—"}</td><td>${c?`<div class="ac-bar sm"><i style="width:${c.pct}%"></i></div>`:""}</td><td class="${b<0?"neg":""}">${b<0?"Due "+money(-b):money(b)}</td></tr>`}).join("");
 const s=summary();
 return `<div class="ac-wrap"><div class="ac-hd"><div><div class="small mut">School Admin</div><h2>💳 Customer accounts</h2></div><button class="btn pri" onclick="ACCT.newAcct()">+ New account</button></div>
 <div class="ac-glance four"><div><span>Accounts</span><b>${s.n}</b></div><div><span>Packages complete</span><b class="ok">${s.done}</b></div><div><span>Credit held</span><b>${money(s.credit)}</b></div><div><span>Amount due</span><b class="${s.due?"bad":""}">${money(s.due)}</b><small>${s.owing} customer${s.owing===1?"":"s"}</small></div></div>
 ${N.length?`<div class="ac-card ac-scroll"><table class="ac-t click"><tr><th>Customer</th><th>Package</th><th>Package value remaining</th><th>Used</th><th>Credit / due</th></tr>${rows}</table></div>`:`<div class="ac-card"><p>No accounts yet. ${demoOn()?"":"Turn on Demo Mode to see sample accounts, or "}tap <b>+ New account</b>.</p></div>`}
 <div class="ac-how">Package value is shown in dollars <b>and</b> the hours/lessons it stands for, and reaches exactly $0.00 when the package is used up. Account Credit is only real prepaid money outside a package. No payments are processed here.</div></div><div id="acModal"></div>`}catch(e){console.warn(e);return `<div class="pnl">Accounts error: ${esc(e.message)}</div>`}}
function usageCard(name){const c=pkCalc(name);if(!c)return "";const L=c.uses.slice(0,12);
 return `<div class="ac-card"><div class="ac-row"><h3>⏱ Package usage</h3><button class="btn sm" onclick="ACCT.useEdit(${jsq(name)})">+ Log usage</button></div>
 <div class="ac-sub">${c.pk.auto?"✓ Completed schedule bookings are counted automatically (flight = aircraft booked; sim = ground/sim lesson).":"Auto-count from schedule is off for this package."}</div>
 ${L.length?`<div class="ac-scroll"><table class="ac-t"><tr><th>Date</th><th>Item</th><th>Qty</th><th>Note</th><th></th></tr>${L.map(u=>`<tr><td>${esc(fdate(u.date))}</td><td>${esc(TN[u.type][1])}</td><td>${r2(u.qty)}</td><td>${esc(u.note||"")}${u.auto?' <span class="chip c">schedule</span>':""}</td><td>${u.auto?"":`<button class="btn sm" onclick="ACCT.useDel('${esc(u.id)}')">✕</button>`}</td></tr>`).join("")}</table></div>`:`<p class="small mut">No usage logged yet.</p>`}</div>`}
function modal(h){const m=$("acModal");if(m)m.innerHTML=`<div class="sc-mask" onclick="if(event.target===this)ACCT.close()"><div class="sc-dlg">${h}</div></div>`}
function close(){const m=$("acModal");if(m)m.innerHTML=""}
function rr(){if(typeof render==="function")render()}
function pkEdit(name){const pk=U.pk[name]||{name:"Instrument Rating Package",start:today(),paid:true,auto:true,items:{fl:{inc:40,rate:295},sim:{inc:20,rate:125},gnd:{inc:25,rate:85}}};
 modal(`<div class="sc-dh"><h2>Package · ${esc(strip(name))}</h2><button class="btn sm" onclick="ACCT.close()">✕</button></div><div class="sc-form">
 <label>Package name<input id="pkN" value="${esc(pk.name||"")}"></label><div class="sc-2"><label>Start date<input id="pkS" type="date" value="${esc(pk.start||today())}"></label><label>Paid in full?<select id="pkP"><option value="1"${pk.paid!==false?" selected":""}>Yes</option><option value="0"${pk.paid===false?" selected":""}>No</option></select></label></div>
 <div class="ac-sub">Set what's included and the <b>package rate</b> per unit. Package price = included × rate, added up.</div>
 ${TYPES.map(([k,l])=>{const it=(pk.items||{})[k]||{inc:0,rate:0};return `<div class="sc-2"><label>${l} included<input id="pkI_${k}" type="number" min="0" step="0.5" value="${+it.inc||0}" oninput="ACCT.pkPrice()"></label><label>Package rate ($ per ${TN[k][2]})<input id="pkR_${k}" type="number" min="0" step="0.01" value="${+it.rate||0}" oninput="ACCT.pkPrice()"></label></div>`}).join("")}
 <label class="ac-chk"><input id="pkA" type="checkbox"${pk.auto?" checked":""}> Count completed schedule bookings automatically</label>
 <div class="sc-msg"><div class="good" id="pkTot"></div></div></div>
 <div class="sc-act">${U.pk[name]?`<button class="btn sc-danger" onclick="ACCT.pkDel(${jsq(name)})">Remove package</button>`:""}<button class="btn" onclick="ACCT.close()">Cancel</button><button class="btn pri" onclick="ACCT.pkSave(${jsq(name)})">Save package</button></div>`);pkPrice()}
function pkPrice(){const e=$("pkTot");if(!e)return;let t=0;TYPES.forEach(([k])=>t+=(+$("pkI_"+k).value||0)*(+$("pkR_"+k).value||0));e.textContent="Package price: "+money(t)}
function pkSave(name){const items={};TYPES.forEach(([k])=>{const inc=+$("pkI_"+k).value||0,rate=+$("pkR_"+k).value||0;if(inc>0)items[k]={inc,rate}});
 if(!Object.keys(items).length){if(typeof toast==="function")toast("Add at least one included item");return}
 const old=U.pk[name]||{};U.pk[name]={...old,name:$("pkN").value.trim()||"Package",start:$("pkS").value||today(),paid:$("pkP").value==="1",auto:$("pkA").checked,items};save();close();if(typeof toast==="function")toast("Package saved");rr()}
function pkDel(name){if(!confirm("Remove this package from the account?"))return;delete U.pk[name];save();close();rr()}
function useEdit(name){modal(`<div class="sc-dh"><h2>Log package usage</h2><button class="btn sm" onclick="ACCT.close()">✕</button></div><div class="sc-form">
 <div class="sc-2"><label>Date<input id="uD" type="date" value="${today()}"></label><label>Item<select id="uT">${TYPES.filter(([k])=>U.pk[name]&&U.pk[name].items[k]).map(([k,l])=>`<option value="${k}">${l}</option>`).join("")}</select></label></div>
 <label>Quantity (hours or lessons)<input id="uQ" type="number" min="0" step="0.1" value="1"></label><label>Note<input id="uN" maxlength="80" placeholder="e.g. Dual IFR, RNAV 27"></label></div>
 <div class="sc-act"><button class="btn" onclick="ACCT.close()">Cancel</button><button class="btn pri" onclick="ACCT.useSave(${jsq(name)})">Save</button></div>`)}
function useSave(name){const q=+$("uQ").value;if(!(q>0)){if(typeof toast==="function")toast("Enter a quantity");return}U.use.push({id:nid(),name,date:$("uD").value||today(),type:$("uT").value,qty:q,note:$("uN").value.trim()});save();close();rr()}
function useDel(id){U.use=U.use.filter(x=>x.id!==id);save();rr()}
function ledEdit(name){modal(`<div class="sc-dh"><h2>Account credit · ${esc(strip(name))}</h2><button class="btn sm" onclick="ACCT.close()">✕</button></div><div class="sc-form">
 <div class="sc-2"><label>Type<select id="lK" onchange="ACCT.ledAmt()"><option value="c">Credit (deposit / payment)</option><option value="d">Charge</option></select></label><label>Date<input id="lD" type="date" value="${today()}"></label></div>
 <label>Item<input id="lI" maxlength="80" placeholder="e.g. Block-time deposit, Flight N738PA + CFI"></label>
 <div class="sc-2"><label>Hours (optional)<input id="lH" type="number" min="0" step="0.1" oninput="ACCT.ledAmt()"></label><label>Rate (optional)<input id="lR" type="number" min="0" step="0.01" oninput="ACCT.ledAmt()"></label></div>
 <label>Amount ($)<input id="lA" type="number" min="0" step="0.01"></label></div>
 <div class="sc-act"><button class="btn" onclick="ACCT.close()">Cancel</button><button class="btn pri" onclick="ACCT.ledSave(${jsq(name)})">Save</button></div>`)}
function ledAmt(){const h=+$("lH").value,r=+$("lR").value;if(h>0&&r>0)$("lA").value=r2(h*r).toFixed(2)}
function ledSave(name){const a=r2(+$("lA").value);const item=$("lI").value.trim();if(!(a>0)||!item){if(typeof toast==="function")toast("Enter an item and an amount");return}
 const h=$("lH").value,r=$("lR").value;U.led.push({id:nid(),name,date:$("lD").value||today(),item,hrs:h?+h:"",rate:r?+r:"",amt:$("lK").value==="c"?a:-a,t:Date.now()});save();close();rr()}
function ledDel(id){if(!confirm("Delete this ledger line?"))return;U.led=U.led.filter(x=>x.id!==id);save();rr()}
function newAcct(){let R=[];try{R=(S.roster||[]).map(r=>r.name).filter(n=>n&&(demoOn()||!/^SAMPLE/.test(n)))}catch(e){}
 modal(`<div class="sc-dh"><h2>New customer account</h2><button class="btn sm" onclick="ACCT.close()">✕</button></div><div class="sc-form">
 ${R.length?`<label>From roster<select id="nR"><option value="">—</option>${R.map(n=>`<option value="${esc(n)}">${esc(strip(n))}</option>`).join("")}</select></label>`:""}<label>…or type a name<input id="nN" maxlength="60"></label></div>
 <div class="sc-act"><button class="btn" onclick="ACCT.close()">Cancel</button><button class="btn pri" onclick="ACCT.newSave()">Create & set up package</button></div>`)}
function newSave(){const n=(($("nN")||{}).value||"").trim()||(($("nR")||{}).value||"");if(!n){if(typeof toast==="function")toast("Choose or type a name");return}U.sel=n;save();close();rr();setTimeout(()=>pkEdit(n),60)}
function saveNote(){U.note=$("acNote").value.trim()||PLACEHOLDER;save();if(typeof toast==="function")toast("Note saved");rr()}
function preview(n){U.cv=n;save();go("myacct")}
window.ACCT={myView,adminView,summary,pkCalc,balance,ledger,sel:n=>{U.sel=n;save();rr()},cv:n=>{U.cv=n;save();rr()},preview,pkEdit,pkPrice,pkSave,pkDel,useEdit,useSave,useDel,ledEdit,ledAmt,ledSave,ledDel,newAcct,newSave,saveNote,close,_U:()=>U};
})();
