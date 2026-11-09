/* v15 Visual Lessons — framework. Each lesson file registers itself with VIS.reg({...}).
   Lesson scripts are loaded only when opened (keeps the app fast). Everything is offline SVG. */
(function(){
"use strict";
const LIST=[
 {id:"instr",file:"vis-instr.js",t:"Six-pack & PFD: when the gauges lie",ic:"🛩",les:"L2",acs:"IR.II.A · IR.VII.D",d:"Fly a six-pack and a glass PFD side by side, then fail the vacuum pump, pitot tube or static port and watch exactly what each instrument does."},
 {id:"vor",file:"vis-vor.js",t:"VOR, CDI & HSI",ic:"🧭",les:"L3",acs:"IR.V.A",d:"Drag the airplane around a VOR. Live CDI needle, TO/FROM flag, reverse sensing — and why the HSI fixes it."},
 {id:"hold",file:"vis-hold.js",t:"Holding entries & wind",ic:"⭕",les:"L4",acs:"IR.III.B",d:"Pick any heading to the fix and watch the direct, teardrop or parallel entry fly itself — with wind drift and correction."},
 {id:"ils",file:"vis-ils.js",t:"ILS / LPV approach",ic:"🛬",les:"L6",acs:"IR.VI.B",d:"Plan and profile views with live localizer and glideslope needles. Fly it to DA, then land or go missed."},
 {id:"plate",file:"vis-plate.js",t:"Approach plate anatomy",ic:"🗺",les:"P",acs:"IR.VI.A",d:"A SAMPLE plate of a fictional field. Tap any part to learn what it tells you and how to brief it."},
 {id:"compass",file:"vis-compass.js",t:"Compass & gyro errors",ic:"🧲",les:"L2",acs:"IR.II.A",d:"See UNOS turning error and ANDS acceleration error happen on a real-looking compass, plus why the heading indicator needs resetting."},
 {id:"sd",file:"vis-sd.js",t:"Spatial disorientation",ic:"🌀",les:"L2",acs:"IR.I.B · IR.IV.A",d:"The leans, the graveyard spiral and the somatogravic illusion: what the airplane does vs. what your inner ear tells you."}];
const REG={};let CUR=null,LOADING={};
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const PROG=(()=>{try{return JSON.parse(localStorage.getItem("tes-vis")||"{}")}catch(e){return {}}})();
const saveP=()=>{try{localStorage.setItem("tes-vis",JSON.stringify(PROG))}catch(e){}};
function load(meta){if(REG[meta.id])return Promise.resolve(REG[meta.id]);if(LOADING[meta.id])return LOADING[meta.id];
 LOADING[meta.id]=new Promise((ok,no)=>{const s=document.createElement("script");s.src="v15/"+meta.file+"?v=15";s.onload=()=>REG[meta.id]?ok(REG[meta.id]):no(new Error("lesson did not register"));s.onerror=()=>{delete LOADING[meta.id];no(new Error("Couldn't load this lesson (offline and not cached yet?)"))};document.head.appendChild(s)});return LOADING[meta.id]}
function lesT(id){try{const L=LBYID[id];return L?(L.supp?"Supplement "+id:"Lesson "+L.num)+": "+L.title:id}catch(e){return id}}
/* ---------- index ---------- */
function index(){return `<div class="vl-wrap"><div class="vl-hero"><div><div class="vl-kick">IFR TRAINING · VISUAL LESSONS</div><h2>See it. Fly it. Prove it.</h2><p>Interactive, animated lessons for the hardest IFR ideas. Each one follows the FAA handbooks, links to your lesson and ACS task, and works offline.</p></div><button class="btn" onclick="go('aids')">✎ Memory Aids</button></div>
 <div class="vl-grid">${LIST.map((m,i)=>{const p=PROG[m.id]||{};return `<button class="vl-card" onclick="go('vis/${m.id}')"><div class="vl-thumb">${thumb(m.id)}</div><div class="vl-body"><div class="vl-num">${String(i+1).padStart(2,"0")} · ${esc(lesT(m.les))}</div><b>${m.ic} ${esc(m.t)}</b><span>${esc(m.d)}</span><div class="vl-meta"><span class="chip c">ACS ${esc(m.acs)}</span>${p.quiz!=null?`<span class="chip ${p.quiz>=p.n?"g":"a"}">Check ${p.quiz}/${p.n}</span>`:""}${p.seen?`<span class="chip g">✓ viewed</span>`:""}</div></div></button>`}).join("")}</div>
 <div class="vl-foot">Simplified training visuals — technique and numbers follow the cited FAA handbooks and AIM. Always fly by your airplane's POH/AFM and current charts.</div></div>`}
function thumb(id){const g={instr:`<circle cx="50" cy="40" r="26" fill="#1b2a3a" stroke="#3a4a5e"/><path d="M24 44 A26 26 0 0 0 76 44 Z" fill="#7a4a24"/><path d="M24 44 A26 26 0 0 1 76 44 Z" fill="#2a6fb0"/><path d="M35 44h10l5 5 5-5h10" stroke="#ffb020" stroke-width="3" fill="none"/><circle cx="120" cy="40" r="26" fill="#111" stroke="#3a4a5e"/><path d="M120 40 L120 18" stroke="#fff" stroke-width="3"/><text x="146" y="78" fill="#ff4040" font-size="11" font-family="monospace">FAIL</text>`,
 vor:`<circle cx="70" cy="40" r="30" fill="#0b1118" stroke="#3a4a5e"/><line x1="70" y1="10" x2="70" y2="70" stroke="#e040fb" stroke-width="2"/><line x1="82" y1="18" x2="82" y2="62" stroke="#fff" stroke-width="3"/><path d="M64 22 l6-8 6 8z" fill="#3ce36b"/><text x="112" y="30" fill="#3cd6f0" font-size="12" font-family="monospace">TO</text><text x="112" y="50" fill="#8fa1b5" font-size="10" font-family="monospace">OBS 090</text>`,
 hold:`<path d="M60 20 h50 a20 20 0 0 1 0 40 h-50 a20 20 0 0 1 0-40z" fill="none" stroke="#3cd6f0" stroke-width="2.5"/><circle cx="110" cy="20" r="4" fill="#ffb020"/><path d="M160 70 L112 22" stroke="#e040fb" stroke-width="2" stroke-dasharray="4 3"/><path d="M40 22 l10-4 0 8z" fill="#3ce36b"/>`,
 ils:`<rect x="10" y="66" width="170" height="6" fill="#2a3747"/><path d="M20 20 L160 66" stroke="#3ce36b" stroke-width="2" stroke-dasharray="5 4"/><path d="M60 32 l14 -2 -3 6z" fill="#fff"/><text x="120" y="30" fill="#ffb020" font-size="11" font-family="monospace">DA 200</text>`,
 plate:`<rect x="30" y="6" width="130" height="68" rx="3" fill="#f3f1e8"/><rect x="34" y="10" width="122" height="10" fill="#d8dde3"/><circle cx="95" cy="44" r="14" fill="none" stroke="#333"/><path d="M60 50 L130 38" stroke="#111" stroke-width="2"/><text x="40" y="70" fill="#b00" font-size="8" font-family="monospace">SAMPLE · NOT FOR NAV</text>`,
 compass:`<rect x="45" y="18" width="100" height="44" rx="10" fill="#111" stroke="#3a4a5e"/><text x="60" y="47" fill="#fff" font-size="14" font-family="monospace">33 N 3</text><line x1="95" y1="18" x2="95" y2="62" stroke="#ffb020" stroke-width="2"/><text x="20" y="76" fill="#3cd6f0" font-size="10" font-family="monospace">UNOS · ANDS</text>`,
 sd:`<circle cx="60" cy="40" r="22" fill="none" stroke="#3cd6f0" stroke-width="3"/><path d="M60 18 a22 22 0 0 1 22 22" stroke="#e040fb" stroke-width="4" fill="none"/><path d="M110 50 l40 -16 M120 54 l40 -16" stroke="#ff4040" stroke-width="2"/><text x="108" y="72" fill="#8fa1b5" font-size="10" font-family="monospace">FEELS LEVEL</text>`};
 return `<svg viewBox="0 0 190 80" preserveAspectRatio="xMidYMid meet">${g[id]||""}</svg>`}
/* ---------- lesson shell ---------- */
function shell(id){const m=LIST.find(x=>x.id===id);if(!m)return index();
 setTimeout(()=>mount(m),0);
 return `<div class="vl-wrap"><div class="vl-top"><button class="btn sm" onclick="go('vis')">‹ Visual Lessons</button><div class="vl-tt"><div class="vl-kick">${esc(lesT(m.les))} · ACS ${esc(m.acs)}</div><h2>${m.ic} ${esc(m.t)}</h2></div><button class="btn sm" onclick="go('lesson/${m.les}')">Open lesson ${esc(m.les)} →</button></div>
 <div id="vlRoot" class="vl-root"><div class="vl-loading">Loading lesson…</div></div></div>`}
async function mount(m){const root=$("vlRoot");if(!root)return;let L;try{L=await load(m)}catch(e){root.innerHTML=`<div class="pnl">${esc(e.message)}</div>`;return}
 if(!$("vlRoot")||$("vlRoot")!==root)return;if(CUR&&CUR.destroy)try{CUR.destroy()}catch(e){}
 root.innerHTML=`<div class="vl-main"><div class="vl-stage" id="vlStage"></div><div class="vl-side"><div class="vl-nar"><div class="vl-steps" id="vlSteps"></div><div id="vlStepTxt" class="vl-txt"></div><div class="vl-nav"><button class="btn sm" id="vlPrev">◀ Back</button><span id="vlStepN" class="mono"></span><button class="btn pri sm" id="vlNext">Next ▶</button></div></div>
 <div class="vl-try" id="vlTry"></div></div></div>
 <div class="vl-low"><div class="vl-quiz" id="vlQuiz"></div><div class="vl-cite"><b>Sources</b>${L.cite.map(c=>`<div>📘 ${esc(c)}</div>`).join("")}</div></div>`;
 const api={stage:$("vlStage"),tryBox:$("vlTry"),alive:()=>document.body.contains(root),done:(msg)=>{const b=$("vlTryMsg");if(b){b.className="vl-trymsg ok";b.textContent="✓ "+msg}PROG[m.id]=Object.assign(PROG[m.id]||{},{tried:1});saveP()},msg:(t,cls)=>{const b=$("vlTryMsg");if(b){b.className="vl-trymsg "+(cls||"");b.textContent=t}}};
 CUR=L.build(api)||{};let i=0;const S=L.steps;
 const show=k=>{i=Math.max(0,Math.min(S.length-1,k));$("vlSteps").innerHTML=S.map((s,j)=>`<button class="${j===i?"on":j<i?"dn":""}" onclick="VIS.step(${j})" aria-label="Step ${j+1}">${j+1}</button>`).join("");
  $("vlStepTxt").innerHTML=`<h3>${esc(S[i].h)}</h3><p>${S[i].p}</p>`;$("vlStepN").textContent=(i+1)+" / "+S.length;$("vlPrev").disabled=i===0;$("vlNext").textContent=i===S.length-1?"Try it ▶":"Next ▶";
  try{CUR.step&&CUR.step(i,S[i])}catch(e){console.warn(e)}if(i===S.length-1){PROG[m.id]=Object.assign(PROG[m.id]||{},{seen:1});saveP()}};
 $("vlPrev").onclick=()=>show(i-1);$("vlNext").onclick=()=>{if(i===S.length-1){const t=$("vlTry");t&&t.scrollIntoView({behavior:"smooth",block:"center"});t&&t.classList.add("pulse");setTimeout(()=>t&&t.classList.remove("pulse"),1200)}else show(i+1)};
 VIS._show=show;show(0);quiz(m,L.quiz)}
function quiz(m,Q){const box=$("vlQuiz");if(!box)return;const A={};
 const draw=()=>{const n=Object.keys(A).length,ok=Q.filter((q,i)=>A[i]===q.c).length;
  box.innerHTML=`<h3>✅ Check yourself <small class="mut">${n}/${Q.length} answered</small></h3>${Q.map((q,i)=>`<div class="vl-q"><div class="vl-qq">${i+1}. ${esc(q.q)}</div>${q.a.map((a,j)=>{const pick=A[i]===j,show=A[i]!=null;const cls=show?(j===q.c?"ok":pick?"bad":""):"";return `<button class="vl-qa ${cls}" ${show?"disabled":""} onclick="VIS.ans(${i},${j})">${esc(a)}</button>`}).join("")}${A[i]!=null?`<div class="vl-why ${A[i]===q.c?"ok":"bad"}">${A[i]===q.c?"Correct.":"Not quite."} ${esc(q.why)}</div>`:""}</div>`).join("")}
  ${n===Q.length?`<div class="vl-score">Score ${ok}/${Q.length} ${ok===Q.length?"🎯":""} <button class="btn sm" onclick="VIS.retry()">Retry</button></div>`:""}`;
  if(n===Q.length){PROG[m.id]=Object.assign(PROG[m.id]||{},{quiz:ok,n:Q.length});saveP()}};
 VIS.ans=(i,j)=>{if(A[i]!=null)return;A[i]=j;draw()};VIS.retry=()=>{Object.keys(A).forEach(k=>delete A[k]);draw()};draw()}
function view(){try{let r={};try{r=route}catch(e){}if(CUR&&CUR.destroy&&!(r.a)){try{CUR.destroy()}catch(e){}CUR=null}return r.a?shell(r.a):index()}catch(e){console.warn(e);return `<div class="pnl">Visual lessons error: ${esc(e.message)}</div>`}}
/* ---------- shared helpers for lesson files ---------- */
const H={
 svg:(vb,cls,inner)=>`<svg viewBox="${vb}" class="${cls||""}" xmlns="http://www.w3.org/2000/svg" role="img">${inner||""}</svg>`,
 wrap:a=>((a%360)+360)%360, wrap180:a=>{a=((a+180)%360+360)%360-180;return a===-180?180:a},
 rad:d=>d*Math.PI/180, deg:r=>r*180/Math.PI, clamp:(v,a,b)=>Math.max(a,Math.min(b,v)), esc,
 hdg3:h=>String(Math.round(H.wrap(h))||360).padStart(3,"0"),
 loop(api,fn){let last=performance.now(),id=0;const f=t=>{if(!api.alive()){return}const dt=Math.min(0.1,(t-last)/1000);last=t;try{fn(dt,t)}catch(e){console.warn(e);return}id=requestAnimationFrame(f)};id=requestAnimationFrame(f);return ()=>cancelAnimationFrame(id)},
 /* drag helper: converts pointer to SVG coords */
 pt(svg,ev){const p=svg.createSVGPoint();const e=ev.touches?ev.touches[0]:ev;p.x=e.clientX;p.y=e.clientY;const m=svg.getScreenCTM();return m?p.matrixTransform(m.inverse()):{x:0,y:0}},
 drag(svg,el,onMove,onEnd){if(!el)return;el.style.touchAction="none";el.addEventListener("pointerdown",ev=>{ev.preventDefault();try{el.setPointerCapture(ev.pointerId)}catch(e){}const mv=e=>onMove(H.pt(svg,e),e);const up=()=>{el.removeEventListener("pointermove",mv);el.removeEventListener("pointerup",up);el.removeEventListener("pointercancel",up);onEnd&&onEnd()};el.addEventListener("pointermove",mv);el.addEventListener("pointerup",up);el.addEventListener("pointercancel",up);mv(ev)})},
 /* attitude ball + compass card builders reused by several lessons */
 compassTicks(r,opt){opt=opt||{};let s="";for(let a=0;a<360;a+=5){const big=a%30===0,mid=a%10===0;const r1=r-(big?r*.14:mid?r*.09:r*.05);const x1=Math.sin(H.rad(a))*r,y1=-Math.cos(H.rad(a))*r,x2=Math.sin(H.rad(a))*r1,y2=-Math.cos(H.rad(a))*r1;s+=`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${opt.c||"#e8eef5"}" stroke-width="${big?2:1}"/>`;if(big){const L={0:"N",90:"E",180:"S",270:"W"}[a]||String(a/10);const rr=r*.72;s+=`<text x="${(Math.sin(H.rad(a))*rr).toFixed(1)}" y="${(-Math.cos(H.rad(a))*rr+r*.06).toFixed(1)}" fill="${L.length===1&&isNaN(L)?(opt.nc||"#ffb020"):(opt.c||"#e8eef5")}" font-size="${r*.17}" font-family="ui-monospace,Menlo,monospace" font-weight="700" text-anchor="middle" transform="rotate(${a} ${(Math.sin(H.rad(a))*rr).toFixed(1)} ${(-Math.cos(H.rad(a))*rr).toFixed(1)})">${L}</text>`}}return s},
 btns:(name,opts,cur,fn)=>`<div class="vl-seg">${opts.map(([v,l])=>`<button class="${v===cur?"on":""}" onclick="${fn}('${v}')">${l}</button>`).join("")}</div>`};
window.VIS={reg:L=>{REG[L.id]=L},view,index,LIST,H,step:i=>VIS._show&&VIS._show(i),ans:()=>{},retry:()=>{},_prog:PROG};
})();
