/* TES "Brief It & Fly It" module v1 (prototype). Self-contained, works offline.
   Plates are ORIGINAL simplified drawings of a FICTIONAL airport — SAMPLE, NOT FOR NAVIGATION. */
(function(){
const LS="tes-briefit";let U=JSON.parse(localStorage.getItem(LS)||'{"tab":"brief","plate":0,"best":{},"fbest":{}}');const save=()=>localStorage.setItem(LS,JSON.stringify(U));
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const WARN='<div class="bf-warn">SAMPLE · FICTIONAL AIRPORT · NOT FOR NAVIGATION · Training drill only</div>';
/* ---------- plates (fictional "Sample Field, KXMP", elev 820) ---------- */
const PL=[
{id:"rnav27",name:"RNAV (GPS) RWY 27 — LPV",title:"RNAV (GPS) RWY 27",rwy:"27",crs:273,
 freq:"ATIS 127.25 · APP 124.6 · TWR 118.3 · GND 121.9",msa:"3100 within 25 NM of DELTA",
 fixes:[["ALPHA","IAF",80,40,"3000"],["BRAVO","IAF",80,260,"3000"],["CHARL","IF/IAF",150,150,"3000"],["DELTA","FAF",300,150,"2200"],["RW27","MAP",470,150,""]],
 legs:[[0,2],[1,2],[2,3],[3,4]],fafAlt:"2200",gs:"3.00° GP",
 mins:[["LPV","DA 1074","3/4"],["LNAV","MDA 1260","1"]],tdze:824,
 missed:"Climb to 3000 direct ECHO and hold (right turns).",notes:"Baro-VNAV NA. WAAS-only LPV. NoPT from ALPHA and BRAVO.",
 ck:{atis:"Get ATIS 127.25; set altimeter; check wx vs LPV 3/4 SM",freq:"APP 124.6 → TWR 118.3; GND 121.9",crs:"GPS on CDI, final course 273°",iaf:"ALPHA or BRAVO (NoPT) at 3000 → CHARL 3000",faf:"DELTA at 2200, capture glidepath at DELTA",mins:"LPV DA 1074 (3/4 SM) · LNAV MDA 1260 (1 SM) · TDZE 824",map:"RW27 threshold",ma:"Climb to 3000 direct ECHO, hold right",msa:"3100 within 25 NM of DELTA",notes:"WAAS needed for LPV; Baro-VNAV NA; NoPT from both IAFs"}},
{id:"ils9",name:"ILS or LOC RWY 9",title:"ILS or LOC RWY 9",rwy:"9",crs:93,
 freq:"ATIS 127.25 · APP 124.6 · TWR 118.3 · LOC I-XMP 109.5",msa:"3100 within 25 NM of XMP VOR",
 fixes:[["XMP","VOR/IAF",120,60,"3000"],["KILO","IF",120,150,"3000"],["ROMEO","FAF",280,150,"2400 (GS int.)"],["RW09","MAP (LOC)",470,150,""]],
 legs:[[0,1],[1,2],[2,3]],fafAlt:"2400",gs:"GS 3.00°",
 mins:[["S-ILS 9","DA 1012","1/2"],["S-LOC 9","MDA 1240","3/4"]],tdze:812,
 missed:"Climb to 1500, then climbing right turn to 3000 direct XMP VOR and hold.",notes:"DME or RADAR required. LOC MAP at 4.1 NM from ROMEO / I-XMP 0.6 DME.",
 ck:{atis:"Get ATIS; altimeter; wx vs ILS 1/2 SM / LOC 3/4",freq:"LOC 109.5 identified (I-XMP); APP 124.6 → TWR 118.3",crs:"CDI on VLOC (not GPS), inbound course 093°",iaf:"XMP VOR → KILO at 3000",faf:"ROMEO: GS intercept 2400 (LOC FAF)",mins:"ILS DA 1012 (1/2) · LOC MDA 1240 (3/4) · TDZE 812",map:"ILS: at DA · LOC: 0.6 DME / timing",ma:"1500, climbing right turn 3000 direct XMP, hold",msa:"3100 within 25 NM of XMP",notes:"DME or RADAR required"}},
{id:"rnav18",name:"RNAV (GPS) RWY 18 — HILPT",title:"RNAV (GPS) RWY 18",rwy:"18",crs:183,
 freq:"ATIS 127.25 · APP 124.6 · CTAF 122.8 after 2200L",msa:"3100 within 25 NM of GOLFF",
 fixes:[["FOXTR","IAF/IF",260,50,"2800"],["GOLFF","FAF",260,160,"2100"],["RW18","MAP",260,270,""]],
 legs:[[0,1],[1,2]],hold:true,fafAlt:"2100",gs:"3.00° GP",
 mins:[["LNAV/VNAV","DA 1180","1-1/4"],["LNAV","MDA 1300","1"]],tdze:830,
 missed:"Climb to 2800 direct FOXTR and hold.",notes:"Hold-in-lieu of PT at FOXTR (one circuit). When tower closed, use CTAF and KXMP altimeter.",
 ck:{atis:"ATIS / CTAF if tower closed; altimeter",freq:"APP 124.6; CTAF 122.8 after 2200L",crs:"GPS on CDI, final course 183°",iaf:"FOXTR 2800, hold-in-lieu one circuit unless NoPT/vectored",faf:"GOLFF at 2100",mins:"LNAV/VNAV DA 1180 (1-1/4) · LNAV MDA 1300 (1) · TDZE 830",map:"RW18 threshold",ma:"Climb to 2800 direct FOXTR, hold",msa:"3100 within 25 NM of GOLFF",notes:"HILPT one turn only; CTAF ops at night"}}];
const CK=[["atis","ATIS / weather / altimeter"],["freq","Frequencies & nav ID"],["crs","Nav source & final course"],["iaf","IAF / transition & altitudes"],["faf","FAF & altitude"],["mins","Minimums (DA/MDA, vis)"],["map","Missed approach point"],["ma","Missed approach procedure"],["msa","MSA"],["notes","Notes / equipment"]];
function svg(p){
 const fx=p.fixes,line=p.legs.map(([a,b])=>`<line x1="${fx[a][2]}" y1="${fx[a][3]}" x2="${fx[b][2]}" y2="${fx[b][3]}" stroke="#000" stroke-width="2.5" marker-end="url(#ar)"/>`).join("");
 const pts=fx.map(f=>`<g><polygon points="${f[2]},${f[3]-7} ${f[2]+7},${f[3]} ${f[2]},${f[3]+7} ${f[2]-7},${f[3]}" fill="#fff" stroke="#000" stroke-width="2"/><text x="${f[2]+10}" y="${f[3]-10}" font-size="13" font-weight="700">${f[0]}</text><text x="${f[2]+10}" y="${f[3]+20}" font-size="11">${f[1]}${f[4]?" · "+f[4]:""}</text></g>`).join("");
 const hold=p.hold?`<ellipse cx="290" cy="35" rx="40" ry="20" fill="none" stroke="#000" stroke-width="2"/><text x="335" y="30" font-size="11">HILPT 1 min</text>`:"";
 const last=fx[fx.length-1];
 const rw=p.rwy==="18"?`<rect x="${last[2]-5}" y="${last[3]}" width="10" height="45" fill="#000"/>`:`<rect x="${last[2]}" y="${last[3]-5}" width="60" height="10" fill="#000"/>`;
 const prof=`<line x1="40" y1="400" x2="560" y2="400" stroke="#000"/><polyline points="60,330 250,330 520,395" fill="none" stroke="#000" stroke-width="2.5"/><text x="60" y="322" font-size="12">${fx[fx.length-3]?fx[fx.length-3][0]:""}</text><text x="230" y="322" font-size="12" font-weight="700">${fx[fx.length-2][0]} (FAF) ${p.fafAlt}</text><text x="300" y="370" font-size="12">${p.gs} · ${String(p.crs).padStart(3,"0")}°</text><text x="470" y="415" font-size="11">TDZE ${p.tdze}</text><path d="M520,395 l20,-30" stroke="#000" stroke-dasharray="5 4" fill="none"/>`;
 const mins=p.mins.map((m,i)=>`<text x="${50+i*270}" y="460" font-size="14" font-weight="700">${m[0]}</text><text x="${50+i*270}" y="480" font-size="14">${m[1]} · vis ${m[2]}</text>`).join("");
 return `<svg viewBox="0 0 600 560" xmlns="http://www.w3.org/2000/svg" font-family="Arial,Helvetica,sans-serif"><defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10z"/></marker></defs>
 <rect x="0" y="0" width="600" height="560" fill="#fff"/><rect x="0" y="0" width="600" height="22" fill="#c00"/><text x="300" y="16" text-anchor="middle" fill="#fff" font-size="13" font-weight="700">SAMPLE — FICTIONAL — NOT FOR NAVIGATION</text>
 <text x="10" y="40" font-size="11">${esc(p.freq)}</text><text x="590" y="40" text-anchor="end" font-size="14" font-weight="700">${p.title}</text><text x="590" y="56" text-anchor="end" font-size="11">SAMPLE FIELD (KXMP) · Elev 820</text>
 <g transform="translate(0,40)"><rect x="5" y="5" width="590" height="240" fill="none" stroke="#000"/>${hold}${line}${pts}${rw}<circle cx="545" cy="62" r="30" fill="none" stroke="#000"/><text x="545" y="59" text-anchor="middle" font-size="10">MSA</text><text x="545" y="73" text-anchor="middle" font-size="11" font-weight="700">3100</text></g>
 <rect x="5" y="300" width="590" height="125" fill="none" stroke="#000"/>${prof}
 <rect x="5" y="440" width="590" height="50" fill="none" stroke="#000"/>${mins}
 <text x="10" y="510" font-size="12" font-weight="700">MISSED:</text><text x="70" y="510" font-size="12">${esc(p.missed)}</text>
 <text x="10" y="530" font-size="11">NOTES: ${esc(p.notes)}</text><text x="10" y="550" font-size="11">MSA ${esc(p.msa)}</text></svg>`}
/* ---------- GPS fault-finder scenarios ---------- */
const B=(t,why)=>({t,bad:1,why}),G=(t,why)=>({t,why});
const SC=[
{t:"Cleared via ALPHA",ctx:"ATC: \"Cleared direct ALPHA, cross ALPHA at 3000, cleared RNAV 27 approach.\"",L:[
 G("Loaded RNAV 27 with the ALPHA transition","Correct: the clearance is via the ALPHA IAF."),
 B("Then switched the transition to Vectors-to-Final to \"simplify\"","VTF deletes ALPHA/CHARL and draws an extended centerline. You'd no longer fly the cleared route."),
 G("Flew ALPHA → CHARL → DELTA straight in, no course reversal","Correct: NoPT from ALPHA."),
 B("Followed the glidepath down below 2200 ft 3 NM before DELTA","Stay at or above the published segment altitude until DELTA; intercept the glidepath at the FAF."),
 G("Checked LPV annunciated before DELTA","Correct: confirm the approach mode before the FAF.")]},
{t:"Hold-in-lieu at FOXTR",ctx:"Cleared direct FOXTR, cleared RNAV 18. No vectors, no 'straight-in' clearance.",L:[
 G("Planned one circuit in the hold-in-lieu","Correct: HILPT is required unless NoPT, vectored, or cleared straight-in."),
 B("GPS showed SUSP at FOXTR; pilot waited for it to sequence on its own","Many units suspend at a HILPT. Unsuspend (SUSP/OBS per your AFMS) when established inbound, or it won't sequence to GOLFF."),
 B("Flew two extra laps to lose altitude without telling ATC","Extra turns in a HILPT need ATC approval (AIM 5-4-9)."),
 G("Crossed GOLFF at 2100 and started descent","Correct.")]},
{t:"The missed approach",ctx:"RNAV 27, at LPV DA 1074 runway not in sight.",L:[
 G("Applied power, pitched up, cleaned up per POH","Correct: aviate first."),
 B("Climbed straight ahead waiting for the GPS to show the missed approach leg","After the MAP most units suspend. Press SUSP/OBS (or the GTN 'Activate Missed') to sequence to ECHO."),
 G("Climbed to 3000 direct ECHO and entered the hold","Correct per the published missed."),
 G("Told ATC 'missed approach' when able","Correct.")]},
{t:"Approach mode never came up",ctx:"Vectored to final, RNAV 27. 2 NM before DELTA.",L:[
 G("Activated Vectors-to-Final when ATC said 'vectors for RNAV 27'","Correct use of VTF."),
 B("Annunciator still shows TERM, no LPV/LNAV; pilot descended at DELTA anyway","If the approach mode isn't annunciated by the FAF, don't descend — go missed."),
 G("Verified final course 273° on the CDI","Correct.")]},
{t:"OBS left on",ctx:"Pilot used OBS mode to set up a hold at ECHO during an earlier delay. Now cleared for the approach.",L:[
 B("Left the GPS in OBS mode and loaded the approach","OBS mode stops automatic sequencing. Release OBS so the box sequences through the fixes."),
 G("Briefed the plate during the hold","Correct use of hold time."),
 B("Wondered why the GPS didn't sequence past CHARL","Symptom of OBS/SUSP still active.")]},
{t:"Database check",ctx:"Preflight for an IFR flight with an RNAV approach planned at the destination.",L:[
 B("Nav database expired 3 days ago; planned the RNAV approach anyway","Use a current database for GPS approaches. Expired = plan an approach that doesn't need it or update first."),
 G("Checked WAAS NOTAMs / RAIM prediction for the ETA","Correct (RAIM prediction needed for non-WAAS)."),
 B("Typed the approach waypoints in as user waypoints","Approaches must be loaded from the database, not built or modified by hand (AIM 1-1-17).")]},
{t:"LPV downgrade",ctx:"RNAV 27, inside DELTA, annunciation changes from LPV to LNAV.",L:[
 B("Kept flying the glidepath to the LPV DA 1074","With LNAV only, use LNAV MDA 1260 — or go missed if unsure."),
 G("Cross-checked minimums against the new annunciation","Correct."),
 G("Announced the change in the brief: 'LNAV, MDA 1260'","Good CRM habit.")]},
{t:"ILS on the wrong source",ctx:"ILS RWY 9, vectored to intercept the localizer.",L:[
 G("Tuned and identified I-XMP 109.5","Correct."),
 B("Left the CDI on GPS and flew the GPS magenta line down final","An ILS final must be flown on the localizer/glideslope: switch the CDI to VLOC."),
 G("Checked GS intercept at ROMEO 2400","Correct cross-check of the glideslope."),
 B("Flew the LOC MDA 1240 as a decision altitude","MDA is not a DA — level off at 1240 and fly to the MAP; don't go below without the runway.")]},
{t:"Direct-to the wrong way",ctx:"ATC: 'Proceed direct CHARL, cleared RNAV 27.' (Garmin 430W-style unit)",L:[
 B("Pressed Direct-To and typed CHARL from the waypoint page","On many units, direct-to outside the flight plan drops the approach sequence. Select CHARL inside the flight plan / approach, then Direct-To."),
 G("Verified the next leg CHARL → DELTA appeared","Correct check."),
 G("Crossed CHARL at 3000","Correct.")]}];
let st={ck:{},show:false,t0:0,ti:null,rec:null,chunks:[],aud:null,up:null,sc:0,fl:{},done:false};
function view(){return `<div id="bfW" style="padding-bottom:90px"></div>`}
function after(){draw()}
function score(){const v=Object.values(st.ck);return v.filter(x=>x===1).length}
function draw(){const h=$("bfW");if(!h)return;
 const tabs=`<div class="bf-tabs"><button class="bf-b ${U.tab==="brief"?"on":""}" onclick="BRIEFIT.tab('brief')">🎙 Brief It</button><button class="bf-b ${U.tab==="fly"?"on":""}" onclick="BRIEFIT.tab('fly')">🧭 Fly It (GPS faults)</button></div>`;
 h.innerHTML=tabs+(U.tab==="brief"?brief():fly())}
function brief(){const p=PL[U.plate];const own=U.plate==="own";const best=U.best[own?"own":p.id];
 const plate=st.up?(st.up.pdf?`<iframe src="${st.up.url}" style="width:100%;height:70vh;border:0"></iframe>`:`<img src="${st.up.url}" alt="your plate">`):svg(p);
 const sel=PL.map((x,i)=>`<option value="${i}" ${i===U.plate&&!st.up?"selected":""}>${x.name}</option>`).join("")+(st.up?`<option selected>Your plate: ${esc(st.up.name)}</option>`:"");
 const items=CK.map(([k,n])=>`<div class="bf-ck ${st.ck[k]===1?"ok":st.ck[k]===2?"miss":""}" onclick="BRIEFIT.mark('${k}')"><b>${st.ck[k]===1?"✓":st.ck[k]===2?"✗":"○"}</b><div><div>${n}</div>${st.up?"":`<div class="bf-ans">${esc(p.ck[k])}</div>`}</div></div>`).join("");
 const el=st.t0?Math.floor((Date.now()-st.t0)/1000):0;
 return WARN+`<div class="bf-grid"><div class="pnl"><div class="bf-row" style="margin-bottom:8px"><select class="bf-b" onchange="BRIEFIT.plate(this.value)">${sel}</select><label class="bf-b" style="display:inline-flex;align-items:center">📄 Use my plate<input type="file" accept="image/*,application/pdf" style="display:none" onchange="BRIEFIT.upload(this)"></label></div><div class="bf-plate">${plate}</div>${st.up?'<div class="small mut">Your plate stays on this device. Self-grade only — no answer key.</div>':""}</div>
 <div class="pnl"><h2>Brief it out loud</h2><div class="bf-row"><span class="bf-timer" id="bfT">${String(Math.floor(el/60)).padStart(1,"0")}:${String(el%60).padStart(2,"0")}</span><button class="bf-b" onclick="BRIEFIT.timer()">${st.ti?"⏹ Stop":"▶ Start"}</button><button class="bf-b ${st.rec?"rec":""}" onclick="BRIEFIT.rec()">${st.rec?"⏺ Stop rec":"🎤 Record"}</button></div>
 ${st.aud?`<audio controls src="${st.aud}" style="width:100%;margin-top:8px"></audio>`:""}
 <div class="small mut" style="margin:8px 0">Tap each item after you say it: once = ✓ got it, twice = ✗ missed. Goal: under 90 seconds.</div>
 <div class="${st.show?"bf-show":""}">${items}</div>
 <div class="bf-row" style="margin-top:8px">${st.up?"":`<button class="bf-b" onclick="BRIEFIT.show()">${st.show?"Hide":"Reveal"} answers</button>`}<button class="bf-b" onclick="BRIEFIT.reset()">↺ Reset</button><span class="bf-score">${score()}/${CK.length}</span>${best?`<span class="small mut">Best: ${best.s}/${CK.length} in ${best.t}s</span>`:""}</div></div></div>`}
function fly(){const s=SC[st.sc];const tot=s.L.filter(l=>l.bad).length;
 const lines=s.L.map((l,i)=>{let c=st.fl[i]?"flag":"";if(st.done)c=l.bad?(st.fl[i]?"hit":"missed"):(st.fl[i]?"wrong":"");
  return `<div class="bf-ln bf-fp ${c}" onclick="BRIEFIT.flag(${i})">${st.done?(l.bad?(st.fl[i]?"✓ ":"⚠ "):(st.fl[i]?"✗ ":"· ")):(st.fl[i]?"🚩 ":"")}${esc(l.t)}${st.done?`<div class="bf-why">${esc(l.why)}</div>`:""}</div>`}).join("");
 const hits=s.L.filter((l,i)=>l.bad&&st.fl[i]).length,fp=s.L.filter((l,i)=>!l.bad&&st.fl[i]).length,b=U.fbest[st.sc];
 const tot2=Object.keys(U.fbest).length;
 return WARN+`<div class="pnl"><div class="bf-row" style="justify-content:space-between"><h2 style="margin:0">Scenario ${st.sc+1}/${SC.length}: ${esc(s.t)}</h2><span class="small mut">${tot2}/${SC.length} perfect</span></div>
 <p>${esc(s.ctx)}</p><div class="small mut">Tap every step that's a mistake (${tot} planted). Then Check.</div>${lines}
 <div class="bf-row" style="margin-top:10px">${st.done?`<span class="bf-score">${hits}/${tot} found${fp?` · ${fp} false flag${fp>1?"s":""}`:""}</span>`:`<button class="bf-b on" onclick="BRIEFIT.check()">Check</button>`}<button class="bf-b" onclick="BRIEFIT.nav(-1)">◀ Prev</button><button class="bf-b" onclick="BRIEFIT.nav(1)">Next ▶</button>${b?'<span class="small" style="color:var(--grn)">★ perfect before</span>':""}</div>
 <div class="small mut" style="margin-top:8px">Button names (SUSP, OBS, Activate Missed) vary by unit — follow your GPS AFMS.</div></div>`}
function stopRec(){try{st.rec&&st.rec.state!=="inactive"&&st.rec.stop()}catch(e){}}
window.BRIEFIT={view,after,
 tab(t){U.tab=t;save();draw()},
 plate(v){if(st.up){URL.revokeObjectURL(st.up.url);st.up=null}if(isNaN(+v))return;U.plate=+v;save();st.ck={};st.show=false;draw()},
 upload(inp){const f=inp.files&&inp.files[0];if(!f)return;if(st.up)URL.revokeObjectURL(st.up.url);st.up={url:URL.createObjectURL(f),name:f.name,pdf:/pdf/.test(f.type)};st.ck={};draw()},
 mark(k){st.ck[k]=((st.ck[k]||0)+1)%3;const s=score();if(s===CK.length){const key=st.up?"own":PL[U.plate].id,t=st.t0?Math.floor((Date.now()-st.t0)/1000):0,o=U.best[key];if(!o||t<o.t||o.s<s){U.best[key]={s,t};save()}}draw()},
 show(){st.show=!st.show;draw()},
 reset(){st.ck={};st.show=false;clearInterval(st.ti);st.ti=null;st.t0=0;draw()},
 timer(){if(st.ti){clearInterval(st.ti);st.ti=null;draw();return}st.t0=Date.now();st.ti=setInterval(()=>{const e=$("bfT");if(!e){clearInterval(st.ti);st.ti=null;return}const s=Math.floor((Date.now()-st.t0)/1000);e.textContent=Math.floor(s/60)+":"+String(s%60).padStart(2,"0")},500);draw()},
 async rec(){if(st.rec){stopRec();return}
  if(!navigator.mediaDevices||!window.MediaRecorder){alert("Recording isn't supported on this browser.");return}
  try{const ms=await navigator.mediaDevices.getUserMedia({audio:true});const r=new MediaRecorder(ms);st.chunks=[];r.ondataavailable=e=>e.data.size&&st.chunks.push(e.data);
   r.onstop=()=>{ms.getTracks().forEach(t=>t.stop());if(st.aud)URL.revokeObjectURL(st.aud);st.aud=URL.createObjectURL(new Blob(st.chunks,{type:r.mimeType}));st.rec=null;draw()};r.start();st.rec=r;if(!st.ti)BRIEFIT.timer();else draw()}catch(e){alert("Mic not available: "+e.message)}},
 flag(i){if(st.done)return;st.fl[i]=!st.fl[i];draw()},
 check(){st.done=true;const s=SC[st.sc];if(s.L.every((l,i)=>!!l.bad===!!st.fl[i])){U.fbest[st.sc]=1;save()}draw()},
 nav(d){st.sc=(st.sc+d+SC.length)%SC.length;st.fl={};st.done=false;draw()},
 _data:{PL,SC}};
})();
