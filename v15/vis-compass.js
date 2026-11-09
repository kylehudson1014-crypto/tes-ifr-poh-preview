/* Visual lesson: magnetic compass errors (UNOS / ANDS) and heading-indicator drift. Sources: FAA-H-8083-15B IFH Ch. 5; FAA-H-8083-25C PHAK Ch. 8. */
(function(){
const H=VIS.H,R=H.rad,W=H.wrap,W1=H.wrap180,C=H.clamp;
function build(api){
 const st={h:0,bank:0,lat:40,acc:0,accT:0,ci:0,cv:0,hi:0,drift:false,cov:false,sec:0,goal:0,ch:false};
 api.stage.innerHTML=`<div class="vc-grid"><svg id="vcIn" viewBox="0 0 620 300"></svg><svg id="vcTop" viewBox="-150 -150 300 300"></svg></div><div id="vcBar" class="vv-bar"></div>`;
 api.tryBox.innerHTML=`<h3>🎮 Try it</h3><div class="vl-ctl"><label>Bank <b id="vcBv">0°</b><input type="range" id="vcB" min="-25" max="25" step="1" value="0"></label>
 <div class="row"><button class="btn sm" id="vcL">◀ Std-rate left</button><button class="btn sm" id="vcLv">Wings level</button><button class="btn sm" id="vcR">Std-rate right ▶</button></div>
 <div class="row"><button class="btn sm" id="vcAcc">⏩ Accelerate</button><button class="btn sm" id="vcDec">⏪ Decelerate</button></div>
 <label>Latitude <b id="vcLatv">40°N</b><input type="range" id="vcLat" min="20" max="60" step="1" value="40"></label>
 <div class="row"><button class="btn sm" id="vcCov">Cover heading indicator</button><button class="btn sm" id="vcDr">Gyro drift: off</button><button class="btn sm" id="vcSet">Reset HI to compass</button></div>
 <div class="row"><button class="btn pri" id="vcGo">🎯 Start the challenge</button></div></div>
 <div id="vlTryMsg" class="vl-trymsg">Challenge: vacuum's gone (HI covered). Turn from 090 to <b>north</b> using only the compass, then hold wings level within 10° of 360 (true heading) for 3 seconds.</div>`;
 const $=id=>document.getElementById(id);
 const setB=b=>{st.bank=b;$("vcB").value=b};
 $("vcB").oninput=e=>st.bank=+e.target.value;$("vcL").onclick=()=>setB(-15);$("vcR").onclick=()=>setB(15);$("vcLv").onclick=()=>setB(0);
 $("vcAcc").onclick=()=>{st.acc=1;st.accT=5};$("vcDec").onclick=()=>{st.acc=-1;st.accT=5};
 $("vcLat").oninput=e=>st.lat=+e.target.value;
 const cov=v=>{st.cov=v;$("vcCov").textContent=v?"Uncover heading indicator":"Cover heading indicator"};
 $("vcCov").onclick=()=>cov(!st.cov);$("vcDr").onclick=()=>{st.drift=!st.drift;$("vcDr").textContent="Gyro drift: "+(st.drift?"ON":"off")};$("vcSet").onclick=()=>{st.hi=st.ci;api.msg(Math.abs(st.bank)>2||st.accT>0?"⚠ You reset the HI while turning/accelerating — the compass was wrong. Reset only in straight, level, unaccelerated flight.":"✓ HI set to the compass in straight-and-level, unaccelerated flight.",Math.abs(st.bank)>2||st.accT>0?"warn":"ok")};
 $("vcGo").onclick=()=>{st.h=90;st.ci=90;st.cv=0;st.hi=90;setB(0);cov(true);st.ch=true;st.goal=0;api.msg("Go: turn left toward north. Remember UNOS — roll out early when turning to north.")};
 /* static art */
 $("vcIn").innerHTML=`<defs><linearGradient id="vcGl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient><clipPath id="vcClip"><rect x="40" y="95" width="300" height="110" rx="50"/></clipPath><radialGradient id="vcCase" cx="50%" cy="40%"><stop offset="0" stop-color="#2b2f35"/><stop offset="1" stop-color="#0d0f12"/></radialGradient></defs>
 <rect x="20" y="40" width="340" height="220" rx="30" fill="url(#vcCase)" stroke="#3a3f47" stroke-width="3"/><g clip-path="url(#vcClip)"><rect x="40" y="95" width="300" height="110" fill="#14110c"/><g id="vcCard"></g><rect x="40" y="95" width="300" height="110" fill="url(#vcGl)"/></g><rect x="40" y="95" width="300" height="110" rx="50" fill="none" stroke="#000" stroke-width="4"/><line x1="190" y1="88" x2="190" y2="212" stroke="#ff9e2c" stroke-width="3"/><text x="190" y="70" fill="#8fa1b5" font-size="13" text-anchor="middle" font-family="system-ui">MAGNETIC COMPASS</text><text x="190" y="245" fill="#5c6a78" font-size="11" text-anchor="middle" font-family="system-ui">numbers increase to the LEFT — you see the back of the card</text>
 <g transform="translate(490 150)"><circle r="112" fill="#0d0f12" stroke="#2a2f36" stroke-width="6"/><g id="vcHi">${H.compassTicks(102)}</g><path d="M0 -14 L2 -5 L14 1 L14 4 L2 2 L1.5 9 L5 12 L5 13.5 L0 12.5 L-5 13.5 L-5 12 L-1.5 9 L-2 2 L-14 4 L-14 1 L-2 -5Z" fill="#ffb020"/><path d="M0 -110 l-7 -0 l7 14 l7 -14z" fill="#ff9e2c"/><g id="vcCv" style="display:none"><circle r="112" fill="#1a1d22"/><text y="6" fill="#ff6b6b" font-size="16" font-weight="700" text-anchor="middle" font-family="system-ui">COVERED</text><text y="26" fill="#8fa1b5" font-size="11" text-anchor="middle" font-family="system-ui">(vacuum failed)</text></g><text y="134" fill="#8fa1b5" font-size="12" text-anchor="middle" font-family="system-ui">HEADING INDICATOR (gyro)</text></g>`;
 let top=`<circle r="140" fill="#08111a" stroke="#1d2a38"/>`;for(let a=0;a<360;a+=30)top+=`<text x="${Math.sin(R(a))*128}" y="${-Math.cos(R(a))*128+4}" fill="#3a5066" font-size="11" text-anchor="middle" font-family="ui-monospace,monospace">${{0:"N",90:"E",180:"S",270:"W"}[a]||a/10}</text>`;
 $("vcTop").innerHTML=top+`<text y="116" fill="#5c6a78" font-size="10" text-anchor="middle" font-family="system-ui">TRUTH VIEW (from above)</text><g id="vcGhost"><line y1="0" y2="-95" stroke="#ff9e2c" stroke-width="3" stroke-dasharray="6 5"/><text y="-100" fill="#ff9e2c" font-size="10" text-anchor="middle" font-family="system-ui"></text></g><g id="vcAc"><line y1="0" y2="-95" stroke="#3cd6f0" stroke-width="2"/><path transform="scale(2.4)" d="M0 -14 L2 -5 L14 1 L14 4 L2 2 L1.5 9 L5 12 L5 13.5 L0 12.5 L-5 13.5 L-5 12 L-1.5 9 L-2 2 L-14 4 L-14 1 L-2 -5Z" fill="#fff" stroke="#000" stroke-width=".4"/></g><text y="136" fill="#8fa1b5" font-size="10.5" text-anchor="middle" font-family="system-ui"><tspan fill="#3cd6f0">━ actual</tspan>   <tspan fill="#ff9e2c">┅ compass says</tspan></text>`;
 const card=ind=>{let g="";const ppd=4.2,cx=190;const a0=Math.floor((ind-40)/5)*5;for(let a=a0;a<=ind+40;a+=5){const x=cx-(W1(a-ind))*ppd*-1*-1;const X=cx+(W1(ind-a))*ppd*-1;const xx=cx-(W1(a-ind))*ppd;const x2=cx+(W1(a-ind))*ppd*-1;}
  for(let a=a0;a<=ind+40;a+=5){const xx=cx-W1(a-ind)*ppd*-1;}
  /* numbers increase to the LEFT */
  for(let a=a0;a<=ind+45;a+=5){const xx=cx-(a-ind)*ppd;const v=W(a),big=v%30===0;g+=`<line x1="${xx.toFixed(1)}" y1="${big?170:178}" x2="${xx.toFixed(1)}" y2="200" stroke="#f3ead8" stroke-width="${big?2.4:1.3}"/>`;if(big)g+=`<text x="${xx.toFixed(1)}" y="158" fill="#f3ead8" font-size="${v%90===0?30:24}" font-weight="700" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">${{0:"N",90:"E",180:"S",270:"W"}[v]||v/10}</text>`}
  return g};
 const stop=H.loop(api,dt=>{
  const V=100;const rot=H.deg(9.81*Math.tan(R(st.bank))/(V*0.5144));st.h=W(st.h+rot*dt);
  if(st.accT>0){st.accT-=dt;if(st.accT<=0)st.acc=0}
  const turnE=-st.lat*Math.cos(R(st.h))*C(st.bank/15,-1.6,1.6);const accE=-18*st.acc*Math.sin(R(st.h))*(st.accT>0?Math.min(1,st.accT/1.2):0);
  const tgt=W(st.h+turnE+accE);const k=9,cdmp=4.2;const err=W1(tgt-st.ci);st.cv+=(k*err-cdmp*st.cv)*dt;st.ci=W(st.ci+st.cv*dt);
  if(st.drift)st.hi=W(st.hi+0.9*dt);else st.hi=W(st.hi+W1(st.h-st.hi)*Math.min(1,dt*6)*0); 
  if(!st.drift&&!st.ch)st.hi=st.h;
  $("vcCard").innerHTML=card(st.ci);$("vcHi").setAttribute("transform",`rotate(${-st.hi})`);$("vcCv").style.display=st.cov?"block":"none";
  $("vcAc").setAttribute("transform",`rotate(${st.h})`);$("vcGhost").setAttribute("transform",`rotate(${st.ci})`);
  $("vcBv").textContent=(st.bank>0?"R ":st.bank<0?"L ":"")+Math.abs(st.bank)+"°";$("vcLatv").textContent=st.lat+"°N";
  const ce=W1(st.ci-st.h);$("vcBar").innerHTML=`<span>Actual <b>${H.hdg3(st.h)}°</b></span><span>Compass <b>${H.hdg3(st.ci)}°</b></span><span>Compass error <b class="${Math.abs(ce)>5?"amb":""}">${ce>0?"+":""}${ce.toFixed(0)}°</b></span><span>HI <b>${st.cov?"—":H.hdg3(st.hi)+"°"}</b></span><span>${st.accT>0?(st.acc>0?"<b class=amb>ACCELERATING</b>":"<b class=amb>DECELERATING</b>"):Math.abs(st.bank)>1?"Turning":"Straight & level"}</span>`;
  if(st.ch){if(Math.abs(st.bank)<2&&Math.abs(W1(st.h))<=10){st.goal+=dt;if(st.goal>=3){st.ch=false;api.done(`Rolled out on ${H.hdg3(st.h)}° using only the compass. UNOS works.`);cov(false)}}else st.goal=0}
 });
 return {step(i,s){st.ch=false;if(s.set){s.set(st);setB(st.bank);$("vcLat").value=st.lat;cov(st.cov);$("vcDr").textContent="Gyro drift: "+(st.drift?"ON":"off")}},destroy(){stop()}};
}
VIS.reg({id:"compass",build,cite:["FAA-H-8083-15B Instrument Flying Handbook, Ch. 5 Flight Instruments (magnetic compass: variation, deviation, dip, northerly turning and acceleration errors; vertical-card compass; heading indicator)","FAA-H-8083-25C Pilot's Handbook of Aeronautical Knowledge, Ch. 8 Flight Instruments","Sim note: error sizes are illustrative (turning error ≈ latitude at N/S headings is a common rule of thumb, not an exact figure)"],
 steps:[
 {h:"Reading a whiskey compass",p:"The magnetic compass is your only self-contained heading reference — but it's honest only in <b>straight, level, unaccelerated</b> flight. On a floating-card compass the numbers seem backwards: you read the side of the card facing you.",set:s=>{s.h=0;s.ci=0;s.cv=0;s.bank=0;s.acc=0;s.accT=0;s.drift=false;s.cov=false}},
 {h:"Turning from north: it lags",p:"Northern hemisphere: start a right turn from <b>north</b>. Magnetic dip pulls the card — the compass first swings the <b>wrong way</b>, then lags behind. Watch the dashed orange 'compass says' line fall behind the blue airplane.",set:s=>{s.h=0;s.ci=0;s.cv=0;s.bank=15;s.acc=0;s.drift=false;s.cov=false}},
 {h:"Turning from south: it leads",p:"Start the same turn from <b>south</b>: now the compass <b>leads</b> the turn, showing more than you've actually turned.",set:s=>{s.h=180;s.ci=180;s.cv=0;s.bank=15;s.acc=0;s.drift=false;s.cov=false}},
 {h:"UNOS — Undershoot North, Overshoot South",p:"So when rolling out on a compass-only turn: to <b>north</b>, roll out <b>before</b> the compass gets there; to <b>south</b>, roll out <b>after</b> it passes. A common rule of thumb: by about your latitude, plus your lead for roll-out. Try the latitude slider.",set:s=>{s.h=270;s.ci=270;s.cv=0;s.bank=15;s.acc=0;s.drift=false;s.cov=false}},
 {h:"ANDS — Accelerate North, Decelerate South",p:"On <b>east or west</b> headings, speeding up makes the compass show a turn toward <b>north</b>; slowing down, toward <b>south</b>. You haven't turned at all. Tap Accelerate and Decelerate.",set:s=>{s.h=90;s.ci=90;s.cv=0;s.bank=0;s.acc=1;s.accT=5;s.drift=false;s.cov=false}},
 {h:"Heading indicator drift",p:"The gyro heading indicator doesn't have these errors, but it <b>precesses</b> (drifts) over time. Reset it to the compass — only in straight, level, unaccelerated flight. Drift is ON: watch it walk away, then tap Reset.",set:s=>{s.h=90;s.ci=90;s.cv=0;s.hi=90;s.bank=0;s.acc=0;s.accT=0;s.drift=true;s.cov=false}}],
 quiz:[{q:"Northern hemisphere, compass-only turn to NORTH. You should roll out…",a:["After the compass passes north","Before the compass reaches north","Exactly on north"],c:1,why:"UNOS: Undershoot North — the compass lags when turning to north (IFH Ch. 5)."},
 {q:"Heading 270, you accelerate. The compass shows…",a:["A turn toward north","A turn toward south","No change"],c:0,why:"ANDS: Accelerate North, Decelerate South, on east/west headings."},
 {q:"When should you reset the heading indicator to the compass?",a:["During a standard-rate turn","While climbing at full power","In straight, level, unaccelerated flight"],c:2,why:"Only then does the compass read correctly."}]});
})();
