/* Visual lesson: ILS / LPV — profile + plan view, needles, DA, missed approach. SAMPLE data only.
   Sources: AIM 1-1-9 (ILS), AIM 5-4-5 (approach minima, LPV), 14 CFR 91.175, FAA-H-8083-16B IPH Ch. 4, FAA-H-8083-15B IFH Ch. 9. */
(function(){
const H=VIS.H,R=H.rad,C=H.clamp;
const TDZE=812,TCH=50,DA=1012,FAF=2400,GSft=Math.tan(R(3))*6076; /* ≈318 ft per nm */
function build(api){
 const st={src:"ILS",mode:"auto",run:false,spd:6,vis:0.5,ceil:200,sc:"lights",trk:0,vs:0,dec:null,max:{l:0,g:0},fafd:null};
 let s;
 api.stage.innerHTML=`<div class="vs-grid"><svg id="viPro" class="vs-pro" viewBox="0 0 760 230"></svg><svg id="viPlan" class="vs-plan" viewBox="0 0 760 150"></svg><svg id="viOtw" class="vs-otw" viewBox="0 0 400 230"></svg><svg id="viInd" class="vs-ind" viewBox="-110 -110 220 236"></svg></div><div id="viBar" class="vv-bar"></div><div id="viDec" class="vs-dec" hidden></div>`;
 api.tryBox.innerHTML=`<h3>🎮 Try it</h3><div class="vl-ctl"><div class="row"><span class="vl-lbl">Guidance</span><span class="vl-seg" id="viSrc"><button data-v="ILS">ILS</button><button data-v="LPV">RNAV (GPS) LPV</button></span></div>
 <div class="row"><span class="vl-lbl">Weather</span><span class="vl-seg wrap" id="viWx"><button data-v="lights">½ sm · lights at DA</button><button data-v="rwy">1 sm · runway</button><button data-v="none">¼ sm · nothing</button></span></div>
 <div class="row"><button class="btn pri" id="viAuto">▶ Watch it (coupled)</button><button class="btn" id="viHand">✋ Hand-fly it</button></div>
 <div id="viHandCtl" hidden><label>Track correction <b id="viTv">0°</b><input type="range" id="viT" min="-15" max="15" step="1" value="0"></label><label>Vertical speed <b id="viVv">0 fpm</b><input type="range" id="viV" min="-1200" max="400" step="50" value="0"></label><div class="small mut">Hint: on a 3° path, descent rate ≈ groundspeed × 5 (90 kt → ~450 fpm).</div></div></div>
 <div id="vlTryMsg" class="vl-trymsg">Challenge: <b>Hand-fly it</b> from ROMEO to DA with both needles within 1 dot, then make the right call at DA.</div>`;
 const $=id=>document.getElementById(id);
 const seg=(id,key,cb)=>{const el=$(id);const upd=()=>el.querySelectorAll("button").forEach(b=>b.classList.toggle("on",st[key]===b.dataset.v));el.querySelectorAll("button").forEach(b=>b.onclick=()=>{st[key]=b.dataset.v;upd();cb&&cb()});upd();return upd};
 const uSrc=seg("viSrc","src",()=>drawStatic()),uWx=seg("viWx","sc",()=>{wx();reset()});
 const wx=()=>{st.vis={lights:0.5,rwy:1,none:0.25}[st.sc];st.ceil={lights:200,rwy:400,none:100}[st.sc]};
 $("viAuto").onclick=()=>{st.mode="auto";$("viHandCtl").hidden=true;reset();st.run=true};
 $("viHand").onclick=()=>{st.mode="hand";$("viHandCtl").hidden=false;reset();st.vs=0;st.trk=0;$("viT").value=0;$("viV").value=0;lbl();st.run=true;api.msg("Hand-flying: hold the needles centered. Intercept the glideslope from below at 2400.")};
 $("viT").oninput=e=>{st.trk=+e.target.value;lbl()};$("viV").oninput=e=>{st.vs=+e.target.value;lbl()};
 const lbl=()=>{$("viTv").textContent=(st.trk>0?"+":"")+st.trk+"°";$("viVv").textContent=st.vs+" fpm"};
 /* geometry */
 const PX=d=>40+(6.6-d)*(680/7.4),PY=a=>205-(a-700)*(180/2100),LY=y=>75+y*(60/1500);
 const gpAlt=d=>TDZE+TCH+d*GSft;
 const gsDev=()=>{const den=Math.max(200,(s.d*6076+0))*1;const ang=H.deg(Math.atan2(s.alt-TDZE-TCH,den));return ang-3};
 const locAng=()=>H.deg(Math.atan2(s.y,s.d*6076+5000));
 function drawStatic(){const P=[],G=[];
  const band=(off)=>[[6.6,0],[0,0]].map(([d])=>[PX(d),PY(TDZE+TCH+d*6076*Math.tan(R(3+off)))]);
  const up=band(0.7),lo=band(-0.7),c=band(0);const col=st.src==="ILS"?"#3ce36b":"#e040fb";
  $("viPro").innerHTML=`<defs><linearGradient id="viSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e1a28"/><stop offset="1" stop-color="#132232"/></linearGradient></defs><rect width="760" height="230" fill="url(#viSky)"/><rect x="0" y="${PY(TDZE)}" width="760" height="${230-PY(TDZE)}" fill="#1d2a1a"/>
  <polygon points="${up[0]} ${up[1]} ${lo[1]} ${lo[0]}" fill="${col}" fill-opacity=".12" stroke="${col}" stroke-opacity=".35"/><line x1="${c[0][0]}" y1="${c[0][1]}" x2="${c[1][0]}" y2="${c[1][1]}" stroke="${col}" stroke-width="1.5" stroke-dasharray="6 5"/>
  <line x1="0" x2="760" y1="${PY(DA)}" y2="${PY(DA)}" stroke="#ffb020" stroke-dasharray="4 4"/><text x="8" y="${PY(DA)-5}" fill="#ffb020" font-size="12" font-family="ui-monospace,monospace">DA ${DA} (200 HAT)</text>
  <line x1="${PX(4.83)}" x2="${PX(4.83)}" y1="${PY(FAF)-14}" y2="${PY(TDZE)}" stroke="#8fa1b5" stroke-dasharray="2 4"/><path d="M${PX(4.83)} ${PY(FAF)-24} l7 12 h-14z" fill="none" stroke="#fff" stroke-width="1.5"/><text x="${PX(4.83)+10}" y="${PY(FAF)-26}" fill="#fff" font-size="12" font-family="ui-monospace,monospace">ROMEO · GS int 2400 ⚡</text>
  <rect x="${PX(0)}" y="${PY(TDZE)-3}" width="${PX(-0.8)-PX(0)}" height="5" fill="#cfd8e3"/><text x="${PX(0)-2}" y="${PY(TDZE)+18}" fill="#8fa1b5" font-size="11" font-family="ui-monospace,monospace">RWY 9 · TDZE ${TDZE}</text>
  <polyline id="viProTr" fill="none" stroke="#3cd6f0" stroke-width="2"/><g id="viProAc"><circle r="5" fill="#fff" stroke="#3cd6f0" stroke-width="2"/></g><text x="752" y="18" fill="#8fa1b5" font-size="11" text-anchor="end" font-family="system-ui">PROFILE VIEW · vertical scale exaggerated</text>`;
  const lw=Math.tan(R(2.5));const lp=d=>(d*6076+5000)*lw;
  $("viPlan").innerHTML=`<rect width="760" height="150" fill="#0b131c"/><polygon points="${PX(6.6)},${LY(-lp(6.6))} ${PX(-0.8)},${LY(0)} ${PX(6.6)},${LY(lp(6.6))}" fill="${col}" fill-opacity=".10" stroke="${col}" stroke-opacity=".35"/><line x1="${PX(6.6)}" x2="${PX(-0.8)}" y1="75" y2="75" stroke="${col}" stroke-dasharray="6 5"/>
  <rect x="${PX(0)}" y="70" width="${PX(-0.8)-PX(0)}" height="10" fill="#cfd8e3"/><path d="M${PX(4.83)} 62 l7 12 h-14z" fill="none" stroke="#fff" stroke-width="1.5"/><polyline id="viPlTr" fill="none" stroke="#3cd6f0" stroke-width="2"/><g id="viPlAc"><path d="M8 0 L-6 -6 L-3 0 L-6 6Z" fill="#fff"/></g><text x="752" y="16" fill="#8fa1b5" font-size="11" text-anchor="end" font-family="system-ui">PLAN VIEW · ${st.src==="ILS"?"localizer ≈ ±2.5° shown":"LPV lateral guidance"} · lateral scale exaggerated</text><text x="8" y="142" fill="#ff6b6b" font-size="11" font-family="ui-monospace,monospace">SAMPLE — NOT FOR NAVIGATION</text>`;
  $("viInd").innerHTML=ind(col);
 }
 function ind(col){let d="";for(let i=-4;i<=4;i++)if(i){d+=`<circle cx="${i*15}" cy="0" r="3.5" fill="none" stroke="#fff" stroke-width="1.5"/><circle cx="88" cy="${i*15}" r="3" fill="none" stroke="#fff" stroke-width="1.3"/>`}
  return `<circle r="104" fill="#0d0f12" stroke="#2a2f36" stroke-width="5"/><circle r="70" fill="rgba(0,0,0,.3)"/><g transform="rotate(-90)">${H.compassTicks(98)}</g><rect x="-22" y="-128" width="44" height="0" /><path d="M0 -14 L2 -5 L14 1 L14 4 L2 2 L1.5 9 L5 12 L5 13.5 L0 12.5 L-5 13.5 L-5 12 L-1.5 9 L-2 2 L-14 4 L-14 1 L-2 -5Z" fill="#ffb020"/>${d}<g transform="rotate(0)"><path d="M0 -96 l-8 14 h5 v14 h6 v-14 h5z" fill="${col}"/></g><g id="viLoc"><rect x="-3" y="-60" width="6" height="120" fill="${col}"/></g><g id="viGs"><path d="M80 0 l-12 -8 v16z" fill="${col}"/></g><text id="viGsF" x="80" y="-74" fill="#ff4040" font-size="11" text-anchor="middle" font-family="ui-monospace,monospace" display="none">GS</text><text y="124" fill="#8fa1b5" font-size="11" text-anchor="middle" font-family="system-ui">${st.src==="ILS"?"HSI · LOC + GS (green = ground based)":"HSI · LPV (magenta = GPS)"}</text>`}
 function otw(){const h=s.alt-TDZE,D=s.d*6076,f=330,cx=200,cy=96,th=R(3);let fog=h>st.ceil?1:0;const V=st.vis*5280;
  const pr=(a,l)=>{const z=D+a,up=-h,rt=l-s.y;const zc=z*Math.cos(th)-up*Math.sin(th),yc=up*Math.cos(th)+z*Math.sin(th);if(zc<20)return null;return [cx+f*rt/zc,cy-f*yc/zc,Math.hypot(z,up,rt)]};
  const vo=dist=>fog?0:C((V-dist)/(0.35*V),0,1);let g="";
  const c=[pr(0,-75),pr(0,75),pr(8000,75),pr(8000,-75)];
  if(c.every(Boolean)){const o=vo(c[0][2]);if(o>0)g+=`<polygon points="${c.map(p=>p[0].toFixed(1)+","+p[1].toFixed(1)).join(" ")}" fill="#2a2d31" opacity="${o}"/><line x1="${c[0][0]}" y1="${c[0][1]}" x2="${c[1][0]}" y2="${c[1][1]}" stroke="#3ce36b" stroke-width="2" opacity="${o}"/>`;for(let a=200;a<8000;a+=400){const p=pr(a,0),q=pr(a+120,0);if(p&&q){const o2=vo(p[2]);if(o2>0)g+=`<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="#fff" stroke-width="1.5" opacity="${o2}"/>`}}}
  for(let a=-2400;a<0;a+=100){const p=pr(a,0);if(!p)continue;const o=vo(p[2]);if(o<=0)continue;const r=Math.max(1.6,Math.min(6,1400/p[2]));g+=`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${(r*2.6).toFixed(2)}" fill="#fff3a0" opacity="${(o*.25).toFixed(2)}"/><circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${r.toFixed(2)}" fill="${a>-200?"#ff4040":"#fff7c0"}" opacity="${o}"/>`;if(a%1000===0){for(const l of[-50,-25,25,50]){const pp=pr(a,l);if(pp)g+=`<circle cx="${pp[0].toFixed(1)}" cy="${pp[1].toFixed(1)}" r="${(r*.8).toFixed(2)}" fill="#fff7c0" opacity="${o}"/>`}}}
  const hz=pr(1e7,0);const hy=hz?hz[1]:cy;
  $("viOtw").innerHTML=`<rect width="400" height="230" fill="#8b98a6"/><rect y="${hy}" width="400" height="${Math.max(0,230-hy)}" fill="#4e5a50"/>${g}<rect width="400" height="230" fill="#b7c0c9" opacity="${fog?0.97:0.35}"/><text x="10" y="20" fill="#0b1118" font-size="12" font-family="system-ui" font-weight="700">OUT THE WINDOW · ${st.vis===0.25?"¼":st.vis===0.5?"½":"1"} sm · ceiling ${st.ceil} ft</text><text x="390" y="222" text-anchor="end" fill="#0b1118" font-size="11" font-family="ui-monospace,monospace">${Math.round(h)} ft above TDZE</text>`}
 function reset(){s={d:6.6,y:st.mode==="hand"?350:220,alt:FAF,ph:"app",tr:[],pl:[],tt:0,t:0,clb:0,turn:0,x2:0};st.dec=null;st.max={l:0,g:0};st.fafd=null;$("viDec").hidden=true;drawStatic();draw()}
 function step(dt){const gs=90,fts=gs*6076/3600;
  if(s.ph==="app"){const dev=gsDev(),la=locAng();let trk,vs;
   if(st.mode==="auto"){trk=C(-la*10,-12,12);vs=s.alt>gpAlt(s.d)+5||dev>-0.05?C(-gs*5.31-dev*2500,-1400,0):0;if(s.alt>=FAF&&dev<-0.02)vs=0}else{trk=st.trk;vs=st.vs}
   s.y+=fts*Math.sin(R(trk))*dt;s.d-=gs/3600*dt;s.alt+=vs/60*dt;
   if(s.d<=4.83){if(st.fafd==null)st.fafd=1;st.max.l=Math.max(st.max.l,Math.abs(la/2.5)*4);st.max.g=Math.max(st.max.g,Math.abs(dev/0.7)*4)}
   if(s.alt<=DA&&s.d<4.5){s.alt=DA;s.ph="da";st.run=false;atDA()}
   if(s.alt<TDZE+80&&s.d>0.6){s.ph="cfit";st.run=false;api.msg("⚠ Too low — you'd have hit terrain/obstacles. Keep the glideslope needle centered.","warn")}}
  else if(s.ph==="land"){const vs=-gs*5.31;s.d-=gs/3600*dt;s.alt=Math.max(TDZE,s.alt+vs/60*dt);s.y*=0.98;if(s.d<-0.3){s.ph="done";st.run=false}}
  else if(s.ph==="miss"){s.d-=gs/3600*dt*1.1;s.alt=Math.min(3000,s.alt+700/60*dt);if(s.alt>=1500)s.turn=Math.min(1,s.turn+dt/40);s.y+=fts*Math.sin(R(s.turn*90))*dt*1.1;if(s.d<-2.2||s.y>4000){s.ph="done";st.run=false}}
  s.tt+=dt;if(s.tt>1){s.tt=0;s.tr.push([PX(s.d),PY(s.alt)]);s.pl.push([PX(s.d),LY(s.y)])}}
 function atDA(){const D=s.d*6076,slant=Math.hypot(D+(-2400),DA-TDZE);const V=st.vis*5280;const lights=(DA-TDZE)<=st.ceil&&V>Math.hypot(D-2400,DA-TDZE);const rwy=(DA-TDZE)<=st.ceil&&V>Math.hypot(D,DA-TDZE);st.dec={ok:lights||rwy,what:rwy?"the runway":lights?"the approach lights":"nothing"};draw();
  const el=$("viDec");el.hidden=false;el.innerHTML=`<b>DECISION ALTITUDE ${DA}</b><span>What do you see out the window? Required visual references in sight?</span><div class="row"><button class="btn pri" id="viLand">Continue — I have the references</button><button class="btn" id="viMiss">Go missed</button></div>`;
  $("viLand").onclick=()=>decide(true);$("viMiss").onclick=()=>decide(false)}
 function decide(cont){const right=cont===st.dec.ok;const el=$("viDec");
  el.innerHTML=`<b class="${right?"grn":"red"}">${right?"✓ Good call":"✗ Wrong call"}</b><span>${st.dec.ok?`You can see ${st.dec.what}. `:"No runway environment in sight. "}${st.dec.what==="the approach lights"?"Approach lights alone let you descend to 100 ft above TDZE; below that you need the red terminating/side-row bars or the runway itself (14 CFR 91.175(c)(3)(i)).":st.dec.ok?"Runway environment in sight — continue to land if you can do so normally.":"Execute the missed approach at DA: climb to 1500, then climbing right turn to 3000 direct XMP and hold (SAMPLE)."}</span>`;
  s.ph=cont&&st.dec.ok?"land":cont?"cfit2":"miss";if(s.ph==="cfit2"){s.ph="miss";el.innerHTML+=`<span class="red">Continuing without references is how CFIT accidents happen — the sim flies the missed for you.</span>`}st.run=true;
  if(st.mode==="hand"){const good=st.max.l<=1.05&&st.max.g<=1.05;if(good&&right)api.done(`Within 1 dot all the way (max LOC ${st.max.l.toFixed(1)}, GS ${st.max.g.toFixed(1)} dots) and the right call at DA.`);else api.msg(`Max deviation after ROMEO: LOC ${st.max.l.toFixed(1)} dots, GS ${st.max.g.toFixed(1)} dots${right?"":" · wrong call at DA"}. Try again — goal ≤ 1 dot.`,"warn")}}
 function draw(){const dev=gsDev(),la=locAng();const lp=C(-la/2.5,-1,1)*60,gp=C(-dev/0.7,-1,1)*60;
  $("viLoc").setAttribute("transform",`translate(${lp.toFixed(1)} 0)`);$("viGs").setAttribute("transform",`translate(0 ${(-gp).toFixed(1)})`);
  /* needle shows where the path is: above you => needle up */
  $("viProAc").setAttribute("transform",`translate(${PX(s.d).toFixed(1)} ${PY(s.alt).toFixed(1)})`);$("viPlAc").setAttribute("transform",`translate(${PX(s.d).toFixed(1)} ${LY(s.y).toFixed(1)}) rotate(${s.ph==="miss"?s.turn*90:0})`);
  $("viProTr").setAttribute("points",s.tr.map(p=>p.join(",")).join(" "));$("viPlTr").setAttribute("points",s.pl.map(p=>p.join(",")).join(" "));otw();
  const dl=Math.abs(la/2.5)*4,dg=Math.abs(dev/0.7)*4;
  $("viBar").innerHTML=`<span>${st.src}</span><span>Dist <b>${Math.max(0,s.d).toFixed(1)} nm</b></span><span>Alt <b>${Math.round(s.alt)}</b></span><span>LOC <b>${dl<0.3?"centered":(dl>=4?"full ":dl.toFixed(1)+" dots ")+(la>0?"(you're right)":"(you're left)")}</b></span><span>GS <b>${dg<0.3?"centered":(dg>=4?"full ":dg.toFixed(1)+" dots ")+(dev>0?"(high)":"(low)")}</b></span><span>Phase <b>${{app:s.d>4.83?"Intercept":"Final",da:"At DA",land:"Landing",miss:"Missed approach",done:"Done",cfit:"STOP"}[s.ph]||s.ph}</b></span>`}
 wx();reset();
 const stop=H.loop(api,dt=>{if(st.run){const n=4;for(let i=0;i<n;i++)step(dt*st.spd/n)}draw()});
 return {step(i,S){st.run=false;st.mode="auto";$("viHandCtl").hidden=true;if(S.set){S.set(st);uSrc();uWx();wx();reset();if(S.pos)S.pos(s);drawStatic();draw();if(S.go)st.run=true}},destroy(){stop()}};
}
VIS.reg({id:"ils",build,cite:["AIM 1-1-9 Instrument Landing System (localizer course width tailored to ~700 ft at threshold, typically 3°–6°; glideslope normally 3°, about 1.4° thick)","FAA-H-8083-15B Instrument Flying Handbook, Ch. 9 (ILS; localizer ≈ 4× as sensitive as a VOR CDI)","FAA-H-8083-16B Instrument Procedures Handbook, Ch. 4 Approaches (DA, missed approach, LPV)","14 CFR 91.175(c) — descent below DA and required visual references","AIM 5-4-5 Instrument Approach Procedure Charts (LPV minima)","SAMPLE approach data (KXMP) — fictional, not for navigation"],
 steps:[
 {h:"Two needles, two views",p:"An ILS gives you <b>lateral</b> guidance (localizer — vertical needle) and <b>vertical</b> guidance (glideslope — horizontal needle). Top: the profile. Below: the plan view. Right: the HSI and the view out the window. Press Next or watch it fly coupled.",set:s=>{s.src="ILS";s.sc="lights"},go:1},
 {h:"Localizer: 4× as sensitive",p:"The localizer is tailored to about 700 ft wide at the threshold — typically 3°–6° total, so full scale is a few degrees, not the VOR's 10°. Here you're right of course: the needle sits <b>left</b>. Fly toward it, with small corrections.",set:s=>{s.src="ILS";s.sc="lights"},pos:s=>{s.y=900;s.d=5.6}},
 {h:"Glideslope: intercept from below",p:"The glideslope is normally 3° and only about 1.4° thick. Arrive at the published altitude (2400 at ROMEO here) <b>below</b> the path; when the needle centers, start down. On a 3° path, descent rate ≈ groundspeed × 5.",set:s=>{s.src="ILS";s.sc="lights"},go:1},
 {h:"Decision altitude",p:"At DA (1012 here, 200 ft above touchdown) you decide: <b>with the required visual references</b> you may continue; without them you go missed — immediately. Watch it to DA in ½ mile.",set:s=>{s.src="ILS";s.sc="lights"},pos:s=>{s.d=1.3;s.alt=812+50+1.3*318.4},go:1},
 {h:"Missed approach",p:"¼ mile and a 100-ft ceiling: nothing at DA. Go missed — climb, then fly the published missed approach. On this SAMPLE plate: climb to 1500, then climbing right turn to 3000 direct XMP and hold.",set:s=>{s.src="ILS";s.sc="none"},pos:s=>{s.d=1.3;s.alt=812+50+1.3*318.4},go:1},
 {h:"LPV flies like an ILS",p:"An RNAV (GPS) approach with <b>LPV</b> minima uses WAAS for angular lateral and vertical guidance that looks and flies like an ILS, down to a DA — no ground localizer or glideslope antenna. Magenta = GPS on most glass panels.",set:s=>{s.src="LPV";s.sc="rwy"},go:1}],
 quiz:[{q:"At DA you see only the approach lights. You may…",a:["Land","Descend to 100 ft above TDZE, then need the red bars or runway references to go lower","Hold at DA until the runway appears","Nothing — go missed"],c:1,why:"14 CFR 91.175(c)(3)(i): the approach light system lets you continue to 100 ft above TDZE unless red terminating or side-row bars are also distinctly visible."},
 {q:"The glideslope needle is above center. You are…",a:["Above the glidepath","Below the glidepath — fly up","On the glidepath","Left of course"],c:1,why:"The needle shows where the glidepath is. Needle up means the path is above you."},
 {q:"Compared with a VOR CDI, a localizer is…",a:["Less sensitive","About the same","Roughly four times more sensitive"],c:2,why:"IFH Ch. 9: localizer full scale is a few degrees versus 10° for a VOR, so it's about four times as sensitive."}]});
})();
