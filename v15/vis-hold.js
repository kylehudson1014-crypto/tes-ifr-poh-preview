/* Visual lesson: holding entries from any heading, with wind. Sources: AIM 5-3-8; FAA-H-8083-15B IFH Ch. 10; FAA-H-8083-16B IPH Ch. 3. */
(function(){
const H=VIS.H,R=H.rad,D=H.deg,W=H.wrap,W1=H.wrap180,C=H.clamp;
const TAS=120,NMS=TAS/3600,RATE=3,KP=74,FX=320,FY=240,LEGT=60;const RAD=(NMS*60)/Math.PI; /* standard-rate radius, nm */
function entryOf(rel){rel=W(rel);return (rel>=290||rel<=110)?"Direct":rel<=180?"Teardrop":"Parallel"}
function build(api){
 const st={C:360,turn:"R",H:40,wd:270,ws:0,corr:true,spd:12,run:false,quiz:null,streak:0,showSec:true};
 let sim=null;
 api.stage.innerHTML=`<svg id="vhMap" viewBox="0 0 640 520"><defs><radialGradient id="vhBg" cx="50%" cy="48%" r="70%"><stop offset="0" stop-color="#101c29"/><stop offset="1" stop-color="#06090d"/></radialGradient><marker id="vhAr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#ffb020"/></marker></defs><rect width="640" height="520" fill="url(#vhBg)"/><g id="vhSec"></g><g id="vhPat"></g><polyline id="vhTrail" fill="none" stroke="#3cd6f0" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/><g id="vhFix"></g><g id="vhWind"></g><g id="vhAc"><path d="M0 -13 L2.5 -5 L13 1.5 L13 4 L2.5 1.6 L1.6 9 L5 11.5 L5 13 L0 12 L-5 13 L-5 11.5 L-1.6 9 L-2.5 1.6 L-13 4 L-13 1.5 L-2.5 -5 Z" fill="#fff" stroke="#000"/></g><g id="vhHud"><rect x="10" y="10" width="300" height="56" rx="10" fill="rgba(0,0,0,.6)" stroke="#2a3644"/><text id="vhH1" x="22" y="33" fill="#3cd6f0" font-size="15" font-weight="700" font-family="system-ui"></text><text id="vhH2" x="22" y="54" fill="#cfd8e3" font-size="12.5" font-family="system-ui"></text></g></svg>`;
 api.tryBox.innerHTML=`<h3>🎮 Try it</h3><div class="vl-ctl">
 <label>Inbound course <b id="vhCv"></b><input type="range" id="vhC" min="0" max="350" step="10"></label>
 <label>Your heading to the fix <b id="vhHv"></b><input type="range" id="vhH" min="0" max="355" step="5"></label>
 <div class="row"><span class="vl-lbl">Turns</span><span class="vl-seg" id="vhT"><button data-v="R">Right (std)</button><button data-v="L">Left</button></span></div>
 <label>Wind from <b id="vhWv"></b><input type="range" id="vhWd" min="0" max="350" step="10"></label>
 <label>Wind speed <b id="vhSv"></b><input type="range" id="vhWs" min="0" max="40" step="5"></label>
 <div class="row"><button class="btn sm" id="vhCorr"></button><span class="vl-seg" id="vhSp"><button data-v="6">6×</button><button data-v="12">12×</button><button data-v="24">24×</button></span></div>
 <div class="row"><button class="btn pri" id="vhGo">▶ Fly the entry</button><button class="btn" id="vhQ">🎯 Entry quiz</button></div><div id="vhQa" class="row"></div></div>
 <div id="vlTryMsg" class="vl-trymsg">Challenge: tap <b>Entry quiz</b> and pick the right entry <b>3 times in a row</b> — sectors are hidden until you answer.</div>`;
 const $=id=>document.getElementById(id);const M=$("vhMap");
 const seg=(id,key,num)=>{const el=$(id);const upd=()=>el.querySelectorAll("button").forEach(b=>b.classList.toggle("on",String(st[key])===b.dataset.v));el.querySelectorAll("button").forEach(b=>b.onclick=()=>{st[key]=num?+b.dataset.v:b.dataset.v;upd();if(key!=="spd")reset()});upd();return upd};
 const uT=seg("vhT","turn"),uS=seg("vhSp","spd",1);
 const sync=()=>{$("vhC").value=st.C%360;$("vhH").value=st.H;$("vhWd").value=st.wd;$("vhWs").value=st.ws;uT();uS();lbl()};
 const lbl=()=>{$("vhCv").textContent=H.hdg3(st.C)+"°";$("vhHv").textContent=H.hdg3(st.H)+"°";$("vhWv").textContent=H.hdg3(st.wd)+"°";$("vhSv").textContent=st.ws+" kt";$("vhCorr").textContent=st.corr?"✓ Wind correction ON":"✗ Wind correction OFF";$("vhCorr").classList.toggle("on",!st.corr)};
 [["vhC","C"],["vhH","H"],["vhWd","wd"],["vhWs","ws"]].forEach(([id,k])=>$(id).oninput=e=>{st[k]=+e.target.value;if(k==="C"&&st.C===0)st.C=360;lbl();reset()});
 $("vhCorr").onclick=()=>{st.corr=!st.corr;lbl();reset()};
 $("vhGo").onclick=()=>{if(st.quiz)return;reset();st.run=true};
 $("vhQ").onclick=()=>newQuiz();
 /* frames */
 const m=()=>st.turn==="L"?-1:1;
 const toW=(x,y)=>{const c=R(st.C),xp=m()*x;const E=xp*Math.cos(c)+y*Math.sin(c),N=-xp*Math.sin(c)+y*Math.cos(c);return [FX+E*KP,FY-N*KP]};
 const hW=hl=>W(st.C+m()*hl);
 const windL=()=>{const to=R(st.wd+180),E=Math.sin(to)*st.ws/3600,N=Math.cos(to)*st.ws/3600,c=R(st.C);const xp=E*Math.cos(c)-N*Math.sin(c),y=E*Math.sin(c)+N*Math.cos(c);return [m()*xp,y]};
 const pts=a=>a.map(p=>toW(p[0],p[1]).map(v=>v.toFixed(1)).join(",")).join(" ");
 function drawStatic(){
  /* sectors (relB = bearing from fix, clockwise from inbound direction, canonical right-turn frame) */
  const wedge=(a0,a1,col,name,am)=>{const p=[[0,0]];for(let a=a0;a<=a1;a+=5)p.push([Math.sin(R(a))*3.1,Math.cos(R(a))*3.1]);const [lx,ly]=toW(Math.sin(R(am))*2.5,Math.cos(R(am))*2.5);return `<polygon points="${pts(p)}" fill="${col}" fill-opacity=".10" stroke="${col}" stroke-opacity=".45"/><text x="${lx}" y="${ly}" fill="${col}" font-size="14" font-weight="800" text-anchor="middle" font-family="system-ui" opacity=".9">${name.toUpperCase()}</text>`};
  $("vhSec").innerHTML=st.showSec?wedge(110,290,"#3ce36b","Direct",200)+wedge(290,360,"#ffb020","Teardrop",325)+wedge(0,110,"#e040fb","Parallel",55)+(()=>{const a=toW(Math.sin(R(110))*3.1,Math.cos(R(110))*3.1),b=toW(Math.sin(R(290))*3.1,Math.cos(R(290))*3.1);return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#fff" stroke-opacity=".5" stroke-dasharray="6 5"/>`})():"";
  /* nominal pattern */const L=NMS*LEGT,r=RAD;const p=[];for(let a=-90;a<=90;a+=6)p.push([r+r*Math.sin(R(a))*-1*-1*Math.cos(0)+0,0]);
  const pat=[];for(let a=0;a<=180;a+=6)pat.push([r-r*Math.cos(R(a)),r*Math.sin(R(a))]);for(let a=0;a<=180;a+=6)pat.push([r+r*Math.cos(R(a)),-L-r*Math.sin(R(a))]);pat.push([0,0]);
  const [a1,b1]=toW(0,-L*.55),[a2,b2]=toW(0,-L*.35);
  $("vhPat").innerHTML=`<polygon points="${pts(pat)}" fill="none" stroke="#e8eef5" stroke-opacity=".55" stroke-width="2" stroke-dasharray="7 6"/><line x1="${a1}" y1="${b1}" x2="${a2}" y2="${b2}" stroke="#ffb020" stroke-width="3" marker-end="url(#vhAr)"/>`+(()=>{const q=toW(0,-L-.15);return `<text x="${q[0]}" y="${q[1]}" fill="#ffb020" font-size="12" text-anchor="middle" font-family="ui-monospace,monospace">IN ${H.hdg3(st.C)}°</text>`})();
  const [fx,fy]=toW(0,0);$("vhFix").innerHTML=`<path d="M${fx} ${fy-9} l8 14 h-16z" fill="#0b1118" stroke="#3cd6f0" stroke-width="2"/><text x="${fx+12}" y="${fy-10}" fill="#3cd6f0" font-size="12" font-family="ui-monospace,monospace">FIX</text>`;
  const wa=st.wd;$("vhWind").innerHTML=st.ws?`<g transform="translate(590 60)"><circle r="34" fill="rgba(0,0,0,.5)" stroke="#2a3644"/><g transform="rotate(${wa+180})"><line y1="-22" y2="20" stroke="#ffb020" stroke-width="3" marker-end="url(#vhAr)" transform="rotate(180)"/></g><text y="52" fill="#ffb020" font-size="12" text-anchor="middle" font-family="ui-monospace,monospace">${H.hdg3(st.wd)}/${st.ws}</text></g>`:"";
 }
 function reset(){st.run=false;const hl=m()*W1(st.H-st.C);const d=2.8;sim={x:-Math.sin(R(hl))*d,y:-Math.cos(R(hl))*d,h:hl,q:plan(W(hl)),k:0,t:0,trail:[],tt:0,laps:0,msg:["Ready",`Heading ${H.hdg3(st.H)}° to the fix → ${entryOf(hl)} entry`],tOut:LEGT};drawStatic();draw()}
 function plan(rel){const e=entryOf(rel),q=[{c:"tofix",m:["Inbound to the fix",`Heading ${H.hdg3(st.H)}° — ${e} entry ahead`]}];
  if(e==="Direct")q.push({c:"turn",dir:1,to:"OUT",m:["Direct entry","Cross the fix, turn right to the outbound heading"]});
  if(e==="Teardrop"){q.push({c:"turn",dir:0,to:150,m:["Teardrop entry","Turn to 30° off the outbound course, holding side"]},{c:"hdg",h:150,t:LEGT,m:["Teardrop outbound","Fly about 1 minute"]},{c:"turn",dir:1,to:0,m:["Teardrop","Turn right (holding direction) to intercept inbound"]})}
  if(e==="Parallel"){q.push({c:"turn",dir:-1,to:180,m:["Parallel entry","Turn left to parallel the course outbound (non-holding side)"]},{c:"hdg",h:180,t:LEGT,m:["Parallel outbound","Fly about 1 minute"]},{c:"turn",dir:-1,to:330,m:["Parallel","Turn LEFT more than 180° back toward the course"]})}
  if(e!=="Direct")q.push({c:"icpt",m:["Intercept inbound","Track the inbound course to the fix"]});
  else q.push({c:"out",m:["Outbound","Time from abeam the fix"]},{c:"turn",dir:1,to:0,m:["Turn inbound","Right turn to the inbound course"]},{c:"icpt",m:["Inbound","Track the course to the fix"]});
  for(let i=0;i<2;i++)q.push({c:"turn",dir:1,to:"OUT",m:["In the hold",`Lap ${i+1}: turn right to outbound`]},{c:"out",m:["Outbound",`Lap ${i+1}: timing from abeam the fix`]},{c:"turn",dir:1,to:0,m:["Turn inbound",`Lap ${i+1}`]},{c:"icpt",m:["Inbound",`Lap ${i+1}: 1 minute inbound to the fix`]});
  q.push({c:"end",m:["Holding established","Re-run with wind, or change your heading"]});return q}
 const wcaIn=()=>st.corr?D(Math.asin(C(-windL()[0]/NMS,-0.9,0.9))):0;
 const outH=()=>st.corr?W(180-3*wcaIn()):180;
 const outT=()=>{if(!st.corr)return LEGT;const wy=windL()[1];return C(LEGT*(NMS+wy)/(NMS-wy),25,140)};
 function stepSim(dt){const s=sim;const c=s.q[s.k];if(!c)return;s.msg=c.m;let hc=s.h,done=false;
  const turnTo=(tgt,dir)=>{const d=W1(tgt-s.h);if(!dir)dir=d>=0?1:-1;const need=dir>0?W(tgt-s.h):W(s.h-tgt);const stp=RATE*dt;if(need<=stp||need>359.5){s.h=tgt;return true}s.h=W(s.h+dir*stp);return false};
  if(c.c==="tofix"){const b=D(Math.atan2(-s.x,-s.y));turnTo(W(b),0);if(Math.hypot(s.x,s.y)<0.06||(s.y>0&&Math.abs(s.x)<.2&&s.passed))done=true}
  else if(c.c==="turn"){done=turnTo(c.to==="OUT"?outH():W(c.to),c.dir)}
  else if(c.c==="hdg"){c.e=(c.e||0)+dt;turnTo(c.h,0);if(c.e>=c.t)done=true;s.msg=[c.m[0],`${c.m[1]} — 0:${String(Math.floor(c.e)).padStart(2,"0")}`]}
  else if(c.c==="out"){turnTo(outH(),0);if(s.y<=0.02||c.e!=null)c.e=(c.e||0)+dt;const T=outT();if(c.e!=null)s.msg=[c.m[0],`${c.m[1]} — ${Math.floor(c.e/60)}:${String(Math.floor(c.e%60)).padStart(2,"0")} of ${Math.floor(T/60)}:${String(Math.round(T%60)).padStart(2,"0")}${st.corr&&st.ws?" (wind-adjusted)":""}`];if(c.e>=T)done=true}
  else if(c.c==="icpt"){if(st.corr||c.k){const cmd=C(-s.x*90,-45,45)+wcaIn();turnTo(W(cmd),0)}else{const cmd=C(-s.x*90,-45,45);turnTo(W(cmd),0)}if(s.y>=0&&s.y<0.5&&Math.abs(s.x)<0.4){done=true}}
  else if(c.c==="end"){st.run=false;done=false}
  const [wx,wy]=windL();s.x+=(Math.sin(R(s.h))*NMS+wx)*dt;s.y+=(Math.cos(R(s.h))*NMS+wy)*dt;if(s.y>0)s.passed=1;
  s.tt+=dt;if(s.tt>0.6){s.tt=0;s.trail.push(toW(s.x,s.y));if(s.trail.length>900)s.trail.shift()}
  if(done)s.k++}
 function draw(){const s=sim;const [X,Y]=toW(s.x,s.y);$("vhAc").setAttribute("transform",`translate(${X.toFixed(1)} ${Y.toFixed(1)}) rotate(${hW(s.h).toFixed(1)})`);$("vhTrail").setAttribute("points",s.trail.concat([[X,Y]]).map(p=>p[0].toFixed(1)+","+p[1].toFixed(1)).join(" "));$("vhH1").textContent=s.msg[0];$("vhH2").textContent=s.msg[1]+"  ·  HDG "+H.hdg3(hW(s.h))}
 function newQuiz(){const ents=["Direct","Teardrop","Parallel"];let C0,H0,rel;do{C0=(1+Math.floor(Math.random()*36))*10;H0=Math.floor(Math.random()*72)*5;st.turn=Math.random()<.25?"L":"R";rel=W((st.turn==="L"?-1:1)*W1(H0-C0))}while([110,180,290,0,360].some(b=>Math.abs(W1(rel-b))<10));
  st.C=C0;st.H=H0;st.ws=0;st.showSec=false;st.quiz=entryOf(rel);sync();reset();sim.msg=["Which entry?",`Inbound ${H.hdg3(C0)}°, ${st.turn==="L"?"LEFT":"right"} turns, heading ${H.hdg3(H0)}° to the fix`];draw();
  $("vhQa").innerHTML=ents.map(e=>`<button class="btn" data-e="${e}">${e}</button>`).join("");$("vhQa").querySelectorAll("button").forEach(b=>b.onclick=()=>{const ok=b.dataset.e===st.quiz;st.streak=ok?st.streak+1:0;$("vhQa").innerHTML=`<span class="${ok?"grn":"red"}" style="font-weight:700">${ok?"✓ Correct":"✗ It's "+st.quiz}</span><span class="small mut">Streak ${st.streak}/3</span>`;st.quiz=null;st.showSec=true;drawStatic();st.run=true;if(st.streak>=3){api.done("Three in a row — you can pick a holding entry from any heading.");st.streak=0}else api.msg(ok?`Nice. Streak ${st.streak}/3 — tap Entry quiz again.`:"Watch it fly, then try another.")})}
 sync();reset();
 const stop=H.loop(api,dt=>{if(st.run){const n=6,sd=dt*st.spd/n;for(let i=0;i<n;i++)stepSim(sd)}draw()});
 return {step(i,s){$("vhQa").innerHTML="";st.quiz=null;st.showSec=true;if(s.set){s.set(st);sync();reset();if(s.go)st.run=true}},destroy(){stop()}};
}
VIS.reg({id:"hold",build,cite:["AIM 5-3-8 Holding (entry procedures: parallel, teardrop, direct; leg timing 1 min at or below 14,000 ft MSL; outbound timing begins over/abeam the fix, whichever is later)","FAA-H-8083-15B Instrument Flying Handbook, Ch. 10 IFR Flight (holding, wind correction)","FAA-H-8083-16B Instrument Procedures Handbook, Ch. 3 En Route Operations (holding)","Sim model: 120 KTAS, standard-rate (3°/s) turns; wind-corrected outbound uses the IFH 'triple the inbound drift correction' technique — a training approximation"],
 steps:[
 {h:"Anatomy of a hold",p:"A hold is a racetrack anchored to a <b>fix</b>. You fly the <b>inbound leg</b> to the fix, turn (standard = <b>right</b>), fly outbound, turn back. At or below 14,000 ft MSL the inbound leg is <b>1 minute</b>. Press <b>Fly the entry</b> to watch a lap.",set:s=>{s.C=360;s.turn="R";s.H=10;s.ws=0}},
 {h:"The 70° line and three sectors",p:"Draw a line through the fix at 70° to the holding course on the holding side. It splits arrivals into three sectors: <b>direct</b> (the big one, 180°), <b>teardrop</b> (70°) and <b>parallel</b> (110°). Which sector you come <b>from</b> picks the entry — AIM 5-3-8.",set:s=>{s.C=360;s.turn="R";s.H=100;s.ws=0}},
 {h:"Direct entry",p:"Arriving from the direct sector: cross the fix and simply turn right onto the outbound leg. Outbound timing starts abeam the fix (or wings level, whichever is later).",set:s=>{s.C=360;s.turn="R";s.H=60;s.ws=0},go:1},
 {h:"Teardrop entry",p:"From the teardrop sector: cross the fix, fly outbound about 30° off the course on the <b>holding side</b> for about a minute, then turn in the holding direction to join inbound.",set:s=>{s.C=360;s.turn="R";s.H=150;s.ws=0},go:1},
 {h:"Parallel entry",p:"From the parallel sector: cross the fix, turn to parallel the course outbound on the <b>non-holding side</b> for a minute, then turn <b>toward the holding side</b> more than 180° and intercept or return to the fix.",set:s=>{s.C=360;s.turn="R";s.H=250;s.ws=0},go:1},
 {h:"Left turns mirror everything",p:"Non-standard holds (left turns) are published or assigned. The sectors flip to the other side — same logic, mirrored. Here: inbound 090, left turns.",set:s=>{s.C=90;s.turn="L";s.H=40;s.ws=0},go:1},
 {h:"Wind: drift and the 3× rule",p:"Now a 25-knot wind. With correction <b>OFF</b> the racetrack is blown apart. With it <b>ON</b> the outbound heading uses <b>three times</b> the inbound drift correction and outbound time is adjusted so the inbound leg stays about 1 minute (IFH Ch. 10). Toggle it and fly again.",set:s=>{s.C=360;s.turn="R";s.H=10;s.wd=270;s.ws=25;s.corr=false},go:1}],
 quiz:[{q:"Inbound course 360, standard (right) turns. You're heading 250° to the fix. Which entry?",a:["Direct","Teardrop","Parallel"],c:2,why:"Relative to the inbound course you're 250° around — the 110° parallel sector (AIM 5-3-8)."},
 {q:"At or below 14,000 ft MSL, the inbound leg of a hold (no DME) is…",a:["30 seconds","1 minute","1½ minutes","2 minutes"],c:1,why:"AIM 5-3-8: 1 minute at or below 14,000 ft MSL; 1½ minutes above 14,000."},
 {q:"With a crosswind, the outbound heading correction is typically…",a:["The same as inbound","Twice the inbound correction","Three times the inbound correction, opposite direction relative to the course","No correction — just time it"],c:2,why:"IFH Ch. 10: on the outbound leg, use about three times the inbound drift correction, then adjust timing."}]});
})();
