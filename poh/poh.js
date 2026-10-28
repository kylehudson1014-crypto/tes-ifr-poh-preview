/* TES POH Quick Tabs module v1 — self-contained. The POH PDF stays on this device (IndexedDB "tes-poh"); nothing is uploaded. */
(function(){
const DEF=[["Preflight","#1e88e5"],["Starting Engine","#43a047"],["Run-up","#00897b"],["Before Takeoff","#7cb342"],["Takeoff","#f9a825"],["Climb","#fb8c00"],["Cruise","#3949ab"],["Descent","#8e24aa"],["Before Landing","#d81b60"],["Landing","#6d4c41"],["After Landing","#546e7a"],["Performance","#0277bd"],["Max Glide","#00838f"],["Weight & Balance","#5d4037"]].map(([n,c])=>({n,c,e:false,p:null}))
 .concat(["Engine Fire","Engine Failure","Electrical Fire","Ditching","Icing","Emergency Landing"].map(n=>({n,c:"#c62828",e:true,p:null})));
const e_=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const LS="tes-poh-ui";let U=JSON.parse(localStorage.getItem(LS)||'{"mode":"use","night":"off","thumbs":false,"ack":false}');const saveU=()=>localStorage.setItem(LS,JSON.stringify(U));
/* ---- IndexedDB ---- */
let dbp;function db(){return dbp||(dbp=new Promise((r,j)=>{const q=indexedDB.open("tes-poh",1);q.onupgradeneeded=()=>{q.result.createObjectStore("profiles",{keyPath:"id"});q.result.createObjectStore("pdfs")};q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)}))}
async function tx(st,m,fn){const d=await db();return new Promise((r,j)=>{const t=d.transaction(st,m),s=t.objectStore(st),q=fn(s);t.oncomplete=()=>r(q&&q.result);t.onerror=()=>j(t.error)})}
const allP=()=>tx("profiles","readonly",s=>s.getAll()),putP=p=>tx("profiles","readwrite",s=>s.put(p)),delP=id=>tx("profiles","readwrite",s=>s.delete(id)),
 getPdf=id=>tx("pdfs","readonly",s=>s.get(id)),putPdf=(id,b)=>tx("pdfs","readwrite",s=>s.put(b,id)),delPdf=id=>tx("pdfs","readwrite",s=>s.delete(id));
/* ---- PDF.js (bundled, offline) ---- */
let lib;async function pdfjs(){if(!lib){lib=await import(new URL(BASE+"pdfjs/pdf.min.mjs",location.href).href);lib.GlobalWorkerOptions.workerSrc=new URL(BASE+"pdfjs/pdf.worker.min.mjs",location.href).href;0&&("")}return lib}
const BASE=(document.currentScript&&document.currentScript.src.replace(/[^/]*$/,""))||"./poh/";
let P=null,PL=[],doc=null,pg=1,zoom=1,rt=null,host=null;
const $q=id=>document.getElementById(id);
function view(){return `<div class="poh-wrap ${U.night}" id="pohW"><div class="small mut">Loading POH Quick Tabs…</div></div>`}
async function after(){host=$q("pohW");PL=await allP();PL.sort((a,b)=>a.tail.localeCompare(b.tail));if(!P||!PL.find(x=>x.id===P.id))P=PL.find(x=>x.id===U.last)||PL[0]||null;
 if(P){const b=await getPdf(P.id);if(b){const L=await pdfjs();if(!doc||doc._pid!==P.id){doc=await L.getDocument({data:new Uint8Array(await b.arrayBuffer())}).promise;doc._pid=P.id;pg=1}}else doc=null}else doc=null;
 draw();if(!U.ack)ack()}
function draw(){if(!host||!document.body.contains(host))return;host.className="poh-wrap "+U.night;const n=doc?doc.numPages:0,set=U.mode==="setup";
 host.innerHTML=`<div class="poh-bar"><select id="pohSel" aria-label="Aircraft">${PL.map(x=>`<option value="${x.id}" ${P&&x.id===P.id?"selected":""}>${e_(x.tail)} · ${e_(x.model)}</option>`).join("")}<option value="+">＋ Add aircraft…</option></select>
 <button class="poh-b ${set?"":"on"}" data-a="use">Use</button><button class="poh-b ${set?"on":""}" data-a="setup">Setup</button>
 <button class="poh-b" data-a="night" aria-label="Night mode">${U.night==="off"?"☀︎ Day":U.night==="dim"?"◐ Dim":"🔴 Red"}</button>
 <button class="poh-b ${U.thumbs?"on":""}" data-a="thumbs">▦ Pages</button><div style="flex:1"></div>
 <button class="poh-b poh-em" data-a="em">🚨 EMERGENCY</button></div>
 ${!P?`<div class="pnl"><h2>POH Quick Tabs</h2><p>Add your aircraft, load <b>your own</b> POH/AFM PDF, then tag the key pages once. Every tab then opens straight to its page — offline, in the cockpit.</p><button class="poh-b on" data-a="add">＋ Add aircraft</button></div>`:
 !doc?`<div class="pnl"><h2>${e_(P.tail)} · ${e_(P.model)}</h2><p>Load your POH PDF for this aircraft. It stays on this iPad only and is never uploaded.</p><label class="poh-b on" style="display:inline-flex;align-items:center">📄 Choose POH PDF<input type="file" accept="application/pdf" id="pohFile" hidden></label></div>`:
 `<div class="poh-main"><div class="poh-view" id="pohV"><canvas id="pohC"></canvas><div class="poh-pg">p ${pg} / ${n}</div></div>
 <div class="poh-rail">${P.tabs.map((t,i)=>`<button class="poh-tab ${t.p===pg?"cur":""} ${t.p?"":"un"}" style="background:${t.c}" data-t="${i}">${e_(t.n)}<span class="poh-n">${set?(t.p===pg?"✔ this page":t.p?"p"+t.p+" · tap to set":"tap to set p"+pg):(t.p?"p"+t.p:"not set")}</span></button>`).join("")}</div></div>
 <div class="poh-nav"><button class="poh-b" data-a="prev">◀</button><input type="range" min="1" max="${n}" value="${pg}" id="pohR" aria-label="Page"><button class="poh-b" data-a="next">▶</button><button class="poh-b" data-a="zo">−</button><button class="poh-b" data-a="zi">＋</button>${set?`<button class="poh-b" data-a="edit">✎ Tabs</button><button class="poh-b" data-a="more">⋯</button>`:""}</div>
 ${U.thumbs?`<div class="poh-thumbs" id="pohT"></div>`:""}`}
 <div class="poh-disc">⚠️ Reference aid only — not a replacement for the official POH/AFM. Verify against the approved POH/AFM for your aircraft serial number.${set?" Setup: flip to a page, then tap a tab to pin it there.":""}</div>`;
 host.onclick=click;const s=$q("pohSel");if(s)s.onchange=()=>{if(s.value==="+")return addAc();P=PL.find(x=>x.id===s.value);U.last=P.id;saveU();doc=null;after()};
 const f=$q("pohFile");if(f)f.onchange=()=>loadFile(f.files[0]);const r=$q("pohR");if(r)r.oninput=()=>go(+r.value);
 if(doc){render();if(U.thumbs)thumbs();pinch($q("pohV"))}}
async function render(){const c=$q("pohC"),v=$q("pohV");if(!c)return;const p=await doc.getPage(pg),w=v.clientWidth-4,vp0=p.getViewport({scale:1}),sc=w/vp0.width*zoom,dpr=Math.min(window.devicePixelRatio||1,2),vp=p.getViewport({scale:sc*dpr});
 if(rt)try{rt.cancel()}catch(e){}c.width=vp.width;c.height=vp.height;c.style.width=vp.width/dpr+"px";c.style.height=vp.height/dpr+"px";c.style.transform="";rt=p.render({canvasContext:c.getContext("2d"),viewport:vp});try{await rt.promise}catch(e){}}
async function thumbs(){const t=$q("pohT");for(let i=1;i<=doc.numPages;i++){if(!document.body.contains(t))return;const c=document.createElement("canvas");c.dataset.p=i;if(i===pg)c.className="cur";t.appendChild(c);const p=await doc.getPage(i),vp=p.getViewport({scale:1}),s=220/vp.height,v2=p.getViewport({scale:s});c.width=v2.width;c.height=v2.height;await p.render({canvasContext:c.getContext("2d"),viewport:v2}).promise}const cur=t.querySelector(".cur");cur&&cur.scrollIntoView({inline:"center",block:"nearest"})}
function go(n){if(!doc)return;pg=Math.max(1,Math.min(doc.numPages,n));draw()}
function pinch(v){let d0=0,z0=1;const dist=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
 v.addEventListener("touchstart",e=>{if(e.touches.length===2){d0=dist(e.touches);z0=zoom}},{passive:true});
 v.addEventListener("touchmove",e=>{if(e.touches.length===2&&d0){e.preventDefault();const z=Math.max(1,Math.min(4,z0*dist(e.touches)/d0));$q("pohC").style.transform=`scale(${z/zoom})`;$q("pohC").style.transformOrigin="top center";v._z=z}},{passive:false});
 v.addEventListener("touchend",e=>{if(d0&&e.touches.length<2){d0=0;if(v._z){zoom=v._z;v._z=0;render()}}});
 let sx=0;v.addEventListener("touchstart",e=>{if(e.touches.length===1)sx=e.touches[0].clientX},{passive:true});
 v.addEventListener("touchend",e=>{if(zoom>1||!sx)return;const dx=e.changedTouches[0].clientX-sx;sx=0;if(Math.abs(dx)>70)go(pg+(dx<0?1:-1))})}
async function click(ev){const t=ev.target.closest("[data-a],[data-t],canvas[data-p]");if(!t)return;
 if(t.dataset.p)return go(+t.dataset.p);
 if(t.dataset.t!=null){const tb=P.tabs[+t.dataset.t];if(U.mode==="setup"){tb.p=tb.p===pg?null:pg;await putP(P);draw()}else if(tb.p)go(tb.p);else toast2("“"+tb.n+"” not set — use Setup");return}
 const a=t.dataset.a;
 if(a==="use"||a==="setup"){U.mode=a;saveU();draw()}else if(a==="night"){U.night={off:"dim",dim:"red",red:"off"}[U.night];saveU();draw()}
 else if(a==="thumbs"){U.thumbs=!U.thumbs;saveU();draw()}else if(a==="prev")go(pg-1);else if(a==="next")go(pg+1);
 else if(a==="zi"){zoom=Math.min(4,zoom*1.25);render()}else if(a==="zo"){zoom=Math.max(1,zoom/1.25);render()}
 else if(a==="em")em();else if(a==="add")addAc();else if(a==="edit")edit();else if(a==="more")more()}
function ov(h){const o=document.createElement("div");o.className="poh-ov";o.innerHTML=`<div class="poh-card">${h}</div>`;o.onclick=e=>{if(e.target===o)o.remove()};document.body.appendChild(o);return o}
function toast2(m){typeof toast==="function"?toast(m):alert(m)}
function em(){if(!P||!doc)return toast2("Load a POH first");const E=P.tabs.map((t,i)=>[t,i]).filter(([t])=>t.e);
 const o=ov(`<h2 style="color:#ff6b6b">🚨 EMERGENCY</h2><div class="poh-emgrid">${E.map(([t,i])=>`<button class="poh-tab ${t.p?"":"un"}" style="background:${t.c}" data-i="${i}">${e_(t.n)}<span class="poh-n">${t.p?"p"+t.p:"not set"}</span></button>`).join("")}</div><p class="small mut">Memory items first. Fly the airplane.</p><button class="poh-b" data-x>Close</button>`);
 o.onclick=e=>{const b=e.target.closest("[data-i]");if(b){const t=P.tabs[+b.dataset.i];o.remove();if(t.p){U.mode="use";saveU();go(t.p)}else toast2("Not set — use Setup")}else if(e.target===o||e.target.closest("[data-x]"))o.remove()}}
function addAc(){const o=ov(`<h2>Add aircraft</h2><div class="poh-ed"><input type="text" id="pohTail" placeholder="N-number (e.g. N12345)"></div><div class="poh-ed"><input type="text" id="pohMod" placeholder="Model (e.g. Cessna 172M)"></div><p class="small mut">You'll load your own POH PDF next. It never leaves this device.</p><button class="poh-b on" id="pohOk">Add</button> <button class="poh-b" data-x>Cancel</button>`);
 o.querySelector("[data-x]").onclick=()=>{o.remove();draw()};o.querySelector("#pohOk").onclick=async()=>{const tail=o.querySelector("#pohTail").value.trim().toUpperCase()||"N-----",model=o.querySelector("#pohMod").value.trim()||"Aircraft";P={id:"a"+Date.now().toString(36),tail,model,tabs:JSON.parse(JSON.stringify(DEF))};await putP(P);U.last=P.id;U.mode="setup";saveU();o.remove();doc=null;after()}}
async function loadFile(f){if(!f)return;if(f.size>300e6)return toast2("PDF too large");await putPdf(P.id,new Blob([await f.arrayBuffer()],{type:"application/pdf"}));P.pdfName=f.name;await putP(P);doc=null;try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}after()}
function edit(){const o=ov("");const R=()=>{o.firstChild.innerHTML=`<h2>Edit tabs · ${e_(P.tail)}</h2>${P.tabs.map((t,i)=>`<div class="poh-ed" data-i="${i}"><input type="color" value="${t.c}" data-k="c"><input type="text" value="${e_(t.n)}" data-k="n"><label><input type="checkbox" data-k="e" ${t.e?"checked":""}>EMER</label><button class="poh-b" data-m="-1">▲</button><button class="poh-b" data-m="1">▼</button><button class="poh-b" data-d>✕</button></div>`).join("")}<button class="poh-b" id="pohAddT">＋ Add tab</button> <button class="poh-b" id="pohRst">Reset defaults</button> <button class="poh-b on" data-x>Done</button>`};R();
 o.oninput=e=>{const r=e.target.closest("[data-i]");if(!r)return;const t=P.tabs[+r.dataset.i],k=e.target.dataset.k;if(k==="e"){t.e=e.target.checked;if(t.e)t.c="#c62828"}else t[k]=e.target.value;putP(P);if(k==="e")R()};
 o.onclick=async e=>{const r=e.target.closest("[data-i]");if(e.target.closest("[data-x]")||e.target===o){o.remove();draw();return}
  if(e.target.id==="pohAddT"){P.tabs.push({n:"New tab",c:"#455a64",e:false,p:null});await putP(P);R();return}
  if(e.target.id==="pohRst"){if(confirm("Reset tab names/colors to defaults? Page pins are cleared.")){P.tabs=JSON.parse(JSON.stringify(DEF));await putP(P);R()}return}
  if(!r)return;const i=+r.dataset.i;if(e.target.dataset.m){const j=i+ +e.target.dataset.m;if(j<0||j>=P.tabs.length)return;[P.tabs[i],P.tabs[j]]=[P.tabs[j],P.tabs[i]]}else if(e.target.dataset.d!=null){if(!confirm("Delete tab “"+P.tabs[i].n+"”?"))return;P.tabs.splice(i,1)}else return;await putP(P);R()}}
function more(){const o=ov(`<h2>${e_(P.tail)} · ${e_(P.model)}</h2><p class="small mut">POH file: ${e_(P.pdfName||"—")} (stored on this device only)</p>
 <p><button class="poh-b" id="pohX">⬇ Export tab map (JSON)</button> <label class="poh-b" style="display:inline-flex;align-items:center">⬆ Import tab map<input type="file" accept=".json,application/json" id="pohI" hidden></label></p>
 <p class="small mut">Tab maps hold tab names, colors and page numbers — never the PDF — so a school can share one mapping for the same POH edition.</p>
 <p><label class="poh-b" style="display:inline-flex;align-items:center">📄 Replace POH PDF<input type="file" accept="application/pdf" id="pohRp" hidden></label> <button class="poh-b" id="pohDel" style="color:#ff6b6b">Delete aircraft</button></p><button class="poh-b on" data-x>Close</button>`);
 o.querySelector("[data-x]").onclick=()=>o.remove();
 o.querySelector("#pohX").onclick=()=>{const j={app:"tes-poh-tabs",v:1,model:P.model,pdfName:P.pdfName||"",pages:doc?doc.numPages:null,tabs:P.tabs};const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(j,null,1)],{type:"application/json"}));a.download=(P.model+" tabs").replace(/[^\w-]+/g,"_")+".json";document.body.appendChild(a);a.click();a.remove()};
 o.querySelector("#pohI").onchange=async e=>{try{const j=JSON.parse(await e.target.files[0].text());if(j.app!=="tes-poh-tabs"||!Array.isArray(j.tabs))throw 0;P.tabs=j.tabs.map(t=>({n:String(t.n).slice(0,40),c:/^#[0-9a-f]{6}$/i.test(t.c)?t.c:"#455a64",e:!!t.e,p:Number.isInteger(t.p)&&t.p>0?t.p:null}));await putP(P);o.remove();toast2("Tab map imported"+(j.pages&&doc&&j.pages!==doc.numPages?" — page count differs, check pins":""));draw()}catch(x){toast2("Not a valid tab map file")}};
 o.querySelector("#pohRp").onchange=e=>{o.remove();loadFile(e.target.files[0])};
 o.querySelector("#pohDel").onclick=async()=>{if(!confirm("Delete "+P.tail+" and its POH from this device?"))return;await delPdf(P.id);await delP(P.id);P=null;doc=null;o.remove();after()}}
function ack(){const o=ov(`<h2>Before you use POH Quick Tabs</h2><p>This is a <b>reference aid</b> that helps you find pages in <b>your own</b> POH/AFM faster. It is <b>not</b> a replacement for the official, FAA-approved POH/AFM for your aircraft, and it does not check that your PDF is current or matches your serial number.</p><p>Your PDF is stored only on this device. Tactical Edge Solutions never receives it.</p><button class="poh-b on" data-x>I understand</button>`);o.querySelector("[data-x]").onclick=()=>{U.ack=true;saveU();o.remove()}}
let rz;addEventListener("resize",()=>{clearTimeout(rz);rz=setTimeout(()=>{if(doc&&$q("pohC"))render()},250)});
window.POH={view,after};
})();
