/* v14: Logbook — photo of a paper logbook page -> digital entries.
   On-device OCR (Tesseract.js, vendored in ./ocr, loaded only when used, cached for offline).
   A review grid is ALWAYS shown before anything is saved; low-confidence cells are highlighted. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const F=[ /* key, header, type, header keywords */
 ["date","Date","date",["DATE"]],["model","Make/Model","model",["MAKE","MODEL","TYPE"]],["ident","Ident","ident",["IDENT","IDENTIFICATION","REG","TAIL","N-NUMBER"]],
 ["from","From","apt",["FROM"]],["to","To","apt",["TO"]],["apr","Appr","int",["APP","APPR","APPROACH","APPROACHES","APPS","INST APP"]],
 ["tot","Total","num",["TOTAL","DURATION","TOT"]],["pic","PIC","num",["PIC","PILOT IN COMMAND"]],["dual","Dual","num",["DUAL","DUAL RECEIVED","RECEIVED"]],
 ["xc","XC","num",["XC","X-C","CROSS","CROSS COUNTRY","CROSS-COUNTRY"]],["night","Night","num",["NIGHT","NITE"]],["act","Actual","num",["ACT","ACTUAL","ACTUAL INST","IMC"]],
 ["sim","Sim inst","num",["SIM","SIMULATED","HOOD","SIM INST"]],["ldg","Ldg","int",["LDG","LDGS","LANDINGS","LAND","DAY LDG"]],["notes","Remarks","text",["REMARKS","REMARK","NOTES","ENDORSEMENTS","COMMENTS"]]];
const FK=F.map(f=>f[0]);const FT=Object.fromEntries(F.map(f=>[f[0],f[2]]));
const WL={date:"0123456789/-.",num:"0123456789.",int:"0123456789",ident:"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-",model:"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-",apt:"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",text:""};
let ST={busy:false,prog:0,msg:"",rows:null,img:"",mode:"",ok:false,err:""};
let W=null; /* tesseract worker */
const abs=p=>new URL(p,location.href).href;
function loadLib(){return window.Tesseract?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement("script");s.src="ocr/tesseract.min.js";s.onload=ok;s.onerror=()=>no(new Error("Could not load the OCR engine (offline and not cached yet?)"));document.head.appendChild(s)})}
async function worker(){if(W)return W;await loadLib();W=await Tesseract.createWorker("eng",1,{workerPath:abs("ocr/worker.min.js"),corePath:abs("ocr/"),langPath:abs("ocr/lang"),gzip:true});return W}
function setP(p,m){ST.prog=p;if(m)ST.msg=m;const b=$("lbBar"),t=$("lbMsg");if(b)b.style.width=Math.round(p*100)+"%";if(t)t.textContent=ST.msg}

/* ---------- image helpers ---------- */
function loadImg(src){return new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error("Could not read that image"));i.src=src})}
function toCanvas(img,maxD){const k=Math.min(1,maxD/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height));const c=document.createElement("canvas");c.width=Math.round((img.naturalWidth||img.width)*k);c.height=Math.round((img.naturalHeight||img.height)*k);const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);return c}
function gray(c){const d=c.getContext("2d").getImageData(0,0,c.width,c.height).data;const g=new Uint8Array(c.width*c.height);for(let i=0,j=0;j<g.length;i+=4,j++)g[j]=(d[i]*299+d[i+1]*587+d[i+2]*114)/1000;return g}
function otsu(g){const h=new Array(256).fill(0);g.forEach(v=>h[v]++);const n=g.length;let sum=0;for(let i=0;i<256;i++)sum+=i*h[i];let sb=0,wb=0,max=0,th=128;for(let i=0;i<256;i++){wb+=h[i];if(!wb)continue;const wf=n-wb;if(!wf)break;sb+=i*h[i];const mb=sb/wb,mf=(sum-sb)/wf;const v=wb*wf*(mb-mf)*(mb-mf);if(v>max){max=v;th=i}}return th}
/* adaptive-ish binarization: local mean on a coarse grid, combined with global Otsu, copes with uneven phone lighting */
function binar(c,lines){const g=gray(c),w=c.width,h=c.height,th=otsu(g);const B=new Uint8Array(w*h);const bs=Math.max(16,Math.round(Math.min(w,h)/24));const gw=Math.ceil(w/bs),gh=Math.ceil(h/bs),mean=new Float32Array(gw*gh);
 for(let by=0;by<gh;by++)for(let bx=0;bx<gw;bx++){let s=0,n=0;for(let y=by*bs;y<Math.min(h,(by+1)*bs);y+=2)for(let x=bx*bs;x<Math.min(w,(bx+1)*bs);x+=2){s+=g[y*w+x];n++}mean[by*gw+bx]=s/Math.max(1,n)}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const v=g[y*w+x];const m=mean[Math.min(gh-1,(y/bs)|0)*gw+Math.min(gw-1,(x/bs)|0)];B[y*w+x]=(lines?v<m-28:v<Math.min(th+10,m-18))?1:0}return B}
function skew(B,w,h){/* projection-profile deskew on a sample of dark pixels */const pts=[];const step=Math.max(1,Math.round(w*h/400000));for(let y=0;y<h;y++)for(let x=0;x<w;x+=step)if(B[y*w+x])pts.push(x,y);
 let best=0,bs=-1;for(let a=-5;a<=5.001;a+=0.2){const r=a*Math.PI/180,s=Math.sin(r),c=Math.cos(r);const H=new Float32Array(h*2+10);for(let i=0;i<pts.length;i+=2){const yy=Math.round(pts[i+1]*c-pts[i]*s)+h;if(yy>=0&&yy<H.length)H[yy]++}let sc=0;for(let i=0;i<H.length;i++)sc+=H[i]*H[i];if(sc>bs){bs=sc;best=a}}return best}
function rotate(c,deg){if(Math.abs(deg)<0.1)return c;const r=deg*Math.PI/180;const o=document.createElement("canvas");o.width=c.width;o.height=c.height;const g=o.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,o.width,o.height);g.translate(o.width/2,o.height/2);g.rotate(r);g.drawImage(c,-c.width/2,-c.height/2);return o}
function clusters(arr,minGap){const out=[];let s=-1,p=-1;arr.forEach(i=>{if(s<0){s=p=i;return}if(i-p<=minGap){p=i;return}out.push((s+p)/2);s=p=i});if(s>=0)out.push((s+p)/2);return out}
function findGrid(B,w,h){const rowC=new Uint32Array(h);for(let y=0;y<h;y++){let n=0;for(let x=0;x<w;x++)n+=B[y*w+x];rowC[y]=n}
 const hy=[];for(let y=0;y<h;y++)if(rowC[y]>w*0.4)hy.push(y);const HL=clusters(hy,4);if(HL.length<3)return null;
 const y0=Math.floor(HL[0]),y1=Math.ceil(HL[HL.length-1]),th=y1-y0;const colC=new Uint32Array(w);for(let x=0;x<w;x++){let n=0;for(let y=y0;y<=y1;y++)n+=B[y*w+x];colC[x]=n}
 const vx=[];for(let x=0;x<w;x++)if(colC[x]>th*0.55)vx.push(x);const VL=clusters(vx,4);if(VL.length<4)return null;
 /* drop near-duplicate lines */const ded=(L,m)=>L.filter((v,i)=>!i||v-L[i-1]>m);return {H:ded(HL,12),V:ded(VL,12)}}
function crop(c,x0,y0,x1,y1,B,w){/* inset from cell lines, measure ink, return padded upscaled canvas */const ix=1,iy=2;x0=Math.round(x0+ix);x1=Math.round(x1-ix);y0=Math.round(y0+iy);y1=Math.round(y1-iy);if(x1-x0<4||y1-y0<4)return null;
 let ink=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)ink+=B[y*w+x];const ratio=ink/((x1-x0)*(y1-y0));if(ratio<0.006)return {empty:true};
 const k=Math.min(3,Math.max(1,72/(y1-y0)));const o=document.createElement("canvas");o.width=Math.round((x1-x0)*k)+40;o.height=Math.round((y1-y0)*k)+40;const g=o.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,o.width,o.height);
 g.filter="grayscale(1) contrast(1.6)";g.drawImage(c,x0,y0,x1-x0,y1-y0,20,20,o.width-40,o.height-40);return {c:o,ratio}}
async function ocrCell(cv,type){const w=await worker();await w.setParameters({tessedit_pageseg_mode:"7",tessedit_char_whitelist:WL[type]||"",user_defined_dpi:"300",preserve_interword_spaces:"1"});const r=await w.recognize(cv);return {t:(r.data.text||"").replace(/\s+/g," ").trim(),conf:Math.round(r.data.confidence||0)}}

/* ---------- normalize / validate ---------- */
function norm(k,v){v=String(v||"").trim();const t=FT[k];
 if(t==="num"){v=v.replace(/,/g,".").replace(/[Oo]/g,"0").replace(/[^0-9.]/g,"");if(/^\d{2,}$/.test(v)&&+v>24)v=v.slice(0,-1)+"."+v.slice(-1);v=v.replace(/^\.+/,"0.").replace(/\.(?=.*\.)/g,"");return v}
 if(t==="int")return v.replace(/[Oo]/g,"0").replace(/[^0-9]/g,"");
 if(t==="date"){const m=v.replace(/[.\-]/g,"/").match(/^(\d{1,2})\/?(\d{1,2})\/?(\d{2,4})$/);if(m){let y=+m[3];if(y<100)y+=2000;const mo=+m[1],d=+m[2];if(mo>=1&&mo<=12&&d>=1&&d<=31)return y+"-"+String(mo).padStart(2,"0")+"-"+String(d).padStart(2,"0")}return v}
 if(t==="model"){v=v.toUpperCase().replace(/\s+/g,"");return v.replace(/^C(\d{3})[58]$/,"C$1S")}
 if(t==="ident"){v=v.toUpperCase().replace(/\s+/g,"");const m=v.match(/^N(.+?)([A-Z]{0,2})$/);if(m&&m[1]){const mid=m[1].replace(/S/g,"5").replace(/[IL]/g,"1").replace(/O/g,"0").replace(/Z/g,"2").replace(/B/g,"8");if(/^\d{1,5}$/.test(mid))return "N"+mid+m[2]}return v}
 if(t==="apt")return v.toUpperCase().replace(/\s+/g,"");return v}
function valid(k,v){if(v==="")return true;const t=FT[k];
 if(t==="num")return /^\d{1,2}(\.\d)?$/.test(v)&&+v<=24;if(t==="int")return /^\d{1,2}$/.test(v);if(t==="date")return /^\d{4}-\d{2}-\d{2}$/.test(v);
 if(t==="ident")return /^[A-Z0-9-]{3,7}$/.test(v);if(t==="apt")return /^[A-Z0-9]{3,4}$/.test(v);if(t==="model")return v.length>=2;return true}
function crossCheck(row){/* logbook arithmetic: parts can't exceed total */const tot=+row.tot.v;if(!(tot>0))return;["pic","dual","xc","night","act","sim"].forEach(k=>{if(+row[k].v>tot+0.05){row[k].low=true;row[k].why="more than Total"}})}

/* ---------- pipeline ---------- */
async function run(src){if(ST.busy)return;ST={busy:true,prog:0,msg:"Loading photo…",rows:null,img:"",mode:"",ok:false,err:""};rr();
 try{const img=await loadImg(src);let c=toCanvas(img,2000);ST.img=toCanvas(img,1100).toDataURL("image/jpeg",0.8);setP(0.03,"Straightening the page…");await tick();
  let L=binar(c,1);const a=skew(L,c.width,c.height);if(Math.abs(a)>=0.1){c=rotate(c,-a);L=binar(c,1)}const B=binar(c);
  setP(0.06,"Finding the logbook grid…");await tick();const G=findGrid(L,c.width,c.height);
  setP(0.08,"Starting the on-device reader (first time downloads ~4 MB, then works offline)…");await worker();
  let rows;if(G){ST.mode="grid";const g=c.getContext("2d");g.fillStyle="#fff";const x0=G.V[0],x1=G.V[G.V.length-1],y0=G.H[0],y1=G.H[G.H.length-1];G.H.forEach(y=>g.fillRect(x0-3,y-3,x1-x0+6,6));G.V.forEach(x=>g.fillRect(x-2.5,y0-3,5,y1-y0+6));const B2=binar(c);rows=await gridRead(c,B2,G)}else{ST.mode="free";rows=await freeRead(c)}
  rows=rows.filter(r=>FK.some(k=>r[k].v!==""));rows.forEach(crossCheck);
  ST.rows=rows.length?rows:[blank()];ST.msg=rows.length?`Read ${rows.length} row${rows.length===1?"":"s"}. Check every highlighted cell before saving.`:"Couldn't read any rows — type them in below, or try a sharper, flatter photo.";
 }catch(e){console.warn(e);ST.err=e.message||String(e);ST.rows=ST.rows||[blank()]}
 ST.busy=false;rr();setTimeout(()=>{const e=document.querySelector(".lb-rev");if(e)e.scrollIntoView({behavior:"smooth",block:"start"})},80)}
const tick=()=>new Promise(r=>setTimeout(r,0));
function cell(v,conf,low,why){return {v,conf,low:!!low,why:why||""}}
function blank(){const r={inc:true};FK.forEach(k=>r[k]=cell("",100,false));return r}
async function gridRead(c,B,G){const w=c.width;const H=G.H,V=G.V;const ncol=V.length-1;
 /* header: OCR the first band to map columns by name */
 const head=[];for(let j=0;j<ncol;j++){const cr=crop(c,V[j],H[0],V[j+1],H[1],B,w);let t="";if(cr&&cr.c){const r=await ocrCell(cr.c,"text");t=r.t.toUpperCase()}head.push(t);setP(0.1+0.1*(j+1)/ncol)}
 const map=new Array(ncol).fill(null);const used=new Set();let hits=0;
 head.forEach((t,j)=>{const clean=t.replace(/[^A-Z\- ]/g," ").replace(/\s+/g," ").trim();if(!clean)return;let best=null,bl=0;F.forEach(([k,,,kw])=>{if(used.has(k))return;kw.forEach(x=>{if((clean===x||clean.startsWith(x+" ")||clean.includes(x))&&x.length>bl){best=k;bl=x.length}})});if(best){map[j]=best;used.add(best);hits++}});
 const headerRow=hits>=3;if(!headerRow){for(let j=0;j<ncol&&j<FK.length;j++)map[j]=FK[j]}else{if(ncol===FK.length)map.forEach((m,j)=>{if(!m&&!map.includes(FK[j]))map[j]=FK[j]});const wd=V.slice(1).map((v,j)=>v-V[j]);const med=[...wd].sort((a,b)=>a-b)[wd.length>>1];if(!map.includes("notes")){const j=wd.indexOf(Math.max(...wd));if(!map[j]&&wd[j]>2*med)map[j]="notes"}}
 const start=headerRow?1:0;const rows=[];const tot=(H.length-1-start)*ncol;let done=0;
 for(let i=start;i<H.length-1;i++){const r=blank();let any=false;
  for(let j=0;j<ncol;j++){const k=map[j];done++;if(!k){continue}const cr=crop(c,V[j],H[i],V[j+1],H[i+1],B,w);
   if(cr&&cr.c){let o=await ocrCell(cr.c,FT[k]);let v=norm(k,o.t);if(k==="date"&&!valid(k,v)){const o2=await ocrCell(cr.c,"int");const d=o2.t.replace(/\D/g,"");const m=d.length===6?[d.slice(0,2),d.slice(2,4),d.slice(4)]:d.length===8?[d.slice(0,2),d.slice(2,4),d.slice(4)]:null;if(m){const v2=norm("date",m.join("/"));if(valid(k,v2)){v=v2;o={t:o2.t,conf:Math.min(o2.conf,60)}}}}let why=!valid(k,v)?"doesn't look like a "+FT[k]:"",low=o.conf<75||!valid(k,v)||v==="";if(FT[k]==="num"&&/^\d{2}$/.test(v)){v=v[0]+"."+v[1];low=true;why="decimal point added — check"}r[k]=cell(v,o.conf,low,why);if(v!=="")any=true}
   setP(0.2+0.8*done/Math.max(1,tot),`Reading row ${i-start+1} of ${H.length-1-start}…`)}
  if(any)rows.push(r)}
 ST.map=map;return rows}
async function freeRead(c){/* no grid found: whole-page read + best-effort token parsing; every cell is flagged */const w=await worker();await w.setParameters({tessedit_pageseg_mode:"6",tessedit_char_whitelist:"",preserve_interword_spaces:"1"});setP(0.3,"No grid lines found — reading the whole page…");
 const r=await w.recognize(c);setP(0.95);const lines=(r.data.text||"").split(/\n/).map(s=>s.trim()).filter(Boolean);const out=[];
 lines.forEach(L=>{const tk=L.split(/\s+/);const row=blank();let ok=false;const nums=[];const rest=[];
  tk.forEach(t=>{const T=t.toUpperCase();if(!row.date.v&&/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(t)){row.date.v=norm("date",t);ok=true}
   else if(!row.ident.v&&/^N[0-9][0-9A-Z]{1,4}$/.test(T)){row.ident.v=T;ok=true}
   else if(!row.model.v&&/^(C|PA|SR|BE|DA|M20|P)[\-]?\d{2,3}[A-Z]?$/.test(T))row.model.v=T;
   else if(/^K[A-Z0-9]{3}$/.test(T)){if(!row.from.v)row.from.v=T;else if(!row.to.v)row.to.v=T}
   else if(/^\d{1,2}([.,]\d)?$/.test(t))nums.push(t.replace(",","."));else rest.push(t)});
  if(!ok)return;["apr","tot","pic","dual","xc","night","act","sim","ldg"].forEach((k,i)=>{if(nums[i]!=null)row[k].v=norm(k,nums[i])});row.notes.v=rest.join(" ");
  FK.forEach(k=>{row[k].low=true;row[k].conf=40});out.push(row)});return out}

/* ---------- UI ---------- */
function rr(){if(typeof render==="function"&&location.hash.startsWith("#logbook"))render()}
function totals(){const L=(S.flights||[]);const s=k=>L.reduce((a,f)=>a+(+f[k]||0),0);return {n:L.length,tot:s("tot"),inst:s("act")+s("sim"),apr:s("apr"),xc:s("xc"),night:s("night"),dual:s("dual")}}
function view(){try{const t=totals();const demo=(()=>{try{return !!S.tk.demo}catch(e){return false}})();
 let h=`<div class="lb-wrap"><div class="lb-hd"><div><div class="small mut">IFR Training</div><h2>📓 Logbook</h2></div><div class="row"><button class="btn sm" onclick="go('flights')">61.65 tracker →</button></div></div>
 <div class="ac-glance four"><div><span>Flights</span><b>${t.n}</b></div><div><span>Total time</span><b>${t.tot.toFixed(1)}</b></div><div><span>Instrument (act + sim)</span><b>${t.inst.toFixed(1)}</b><small>of 40 for 61.65</small></div><div><span>Approaches</span><b>${t.apr}</b></div></div>
 <div class="lb-card"><h3>📷 Paper logbook → digital</h3><p class="small">Take a photo of a logbook page. It's read on this device and you check every row before anything is saved.</p>
 <div class="row lb-btns"><label class="btn pri">📷 Take photo<input type="file" accept="image/*" capture="environment" hidden onchange="LOGBK.file(this)"></label><label class="btn">🖼 Upload image<input type="file" accept="image/*" hidden onchange="LOGBK.file(this)"></label>${demo?`<button class="btn" onclick="LOGBK.sample()">✨ Demo: sample logbook page</button>`:`<button class="btn sm" onclick="LOGBK.sample()">Try a sample page</button>`}</div>
 <p class="small mut">Tips: flat page, good light, no shadows, fill the frame with the columns. Neat block printing reads best; cursive and messy handwriting often won't.</p></div>`;
 if(ST.busy)h+=`<div class="lb-card"><div class="lb-prog"><i id="lbBar" style="width:${Math.round(ST.prog*100)}%"></i></div><div id="lbMsg" class="small">${esc(ST.msg)}</div></div>`;
 if(ST.err)h+=`<div class="lb-card"><div class="sc-msg"><div class="bad">${esc(ST.err)}</div></div></div>`;
 if(ST.rows&&!ST.busy)h+=review();
 h+=list()+`</div>`;return h}catch(e){console.warn(e);return `<div class="pnl">Logbook error: ${esc(e.message)}</div>`}}
function review(){const low=ST.rows.reduce((a,r)=>a+(r.inc?FK.filter(k=>r[k].low).length:0),0);const inc=ST.rows.filter(r=>r.inc).length;
 return `<div class="lb-card lb-rev"><div class="ac-row"><h3>🔎 Review before saving <span class="chip ${low?"a":"g"}">${low} cell${low===1?"":"s"} to check</span></h3><button class="btn sm" onclick="LOGBK.discard()">Discard</button></div>
 <p class="small">${esc(ST.msg)} ${ST.mode==="free"?"<b>No grid found, so every cell is a guess.</b>":""} <span class="lb-key"><i class="low"></i> low confidence / check this</span></p>
 <div class="lb-split">${ST.img?`<div class="lb-photo"><img src="${ST.img}" alt="Logbook photo" onclick="this.classList.toggle('zoom')"><small class="mut">Tap photo to zoom</small></div>`:""}
 <div class="lb-gridwrap"><table class="lb-grid"><tr><th>✓</th>${F.map(f=>`<th>${f[1]}</th>`).join("")}<th></th></tr>
 ${ST.rows.map((r,i)=>`<tr class="${r.inc?"":"off"}"><td><input type="checkbox" ${r.inc?"checked":""} onchange="LOGBK.inc(${i},this.checked)" aria-label="Include row ${i+1}"></td>${FK.map(k=>`<td class="${r[k].low?"low":""}" title="${esc(r[k].why||(r[k].low?"Low confidence ("+r[k].conf+"%)":"Read with "+r[k].conf+"% confidence"))}"><input data-r="${i}" data-k="${k}" value="${esc(r[k].v)}" ${k==="date"?'placeholder="YYYY-MM-DD"':""} oninput="LOGBK.ed(this)" class="lb-${FT[k]}"></td>`).join("")}<td><button class="btn sm" onclick="LOGBK.delRow(${i})" aria-label="Delete row">✕</button></td></tr>`).join("")}</table>
 <button class="btn sm" onclick="LOGBK.addRow()">+ Add row</button></div></div>
 <label class="lb-confirm"><input type="checkbox" id="lbOk" ${ST.ok?"checked":""} onchange="LOGBK.ok(this.checked)"> I compared these ${inc} row${inc===1?"":"s"} with the paper logbook and fixed any mistakes</label>
 <div class="sc-act"><button class="btn pri" id="lbSave" ${ST.ok&&inc?"":"disabled"} onclick="LOGBK.commit()">Save ${inc} entr${inc===1?"y":"ies"} to training log</button></div></div>`}
function list(){const L=(S.flights||[]).map((f,i)=>({...f,i})).slice().reverse();if(!L.length)return `<div class="lb-card"><h3>Entries</h3><p class="small mut">No flights logged yet.</p></div>`;
 return `<div class="lb-card"><h3>Entries (${L.length})</h3><div class="lb-gridwrap"><table class="lb-list"><tr>${F.map(f=>`<th>${f[1]}</th>`).join("")}<th></th></tr>${L.slice(0,60).map(f=>`<tr>${FK.map(k=>{let v=f[k];if(k==="model"&&!v)v=f.ac||"";return `<td>${esc(v==null?"":v)}</td>`}).join("")}<td>${f.src==="photo"?'<span class="chip c" title="Imported from a logbook photo">📷</span>':""}</td></tr>`).join("")}</table></div></div>`}
function file(inp){const f=inp.files&&inp.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>run(rd.result);rd.readAsDataURL(f);inp.value=""}
function sample(){run("ocr/sample-logbook.jpg")}
function ed(el){const r=ST.rows[+el.dataset.r],k=el.dataset.k;if(!r)return;r[k].v=el.value;const v=norm(k,el.value);const ok=valid(k,v);el.parentElement.classList.toggle("bad",!ok);if(r[k].low){r[k].low=false;el.parentElement.classList.remove("low");el.parentElement.classList.add("fixed")}if(ST.ok){ST.ok=false;const c=$("lbOk");if(c)c.checked=false;const s=$("lbSave");if(s)s.disabled=true}}
function inc(i,on){ST.rows[i].inc=on;ST.ok=false;rr()}
function delRow(i){ST.rows.splice(i,1);if(!ST.rows.length)ST.rows=[blank()];ST.ok=false;rr()}
function addRow(){ST.rows.push(blank());ST.ok=false;rr()}
function ok(on){ST.ok=on;const inc=ST.rows.filter(r=>r.inc).length;const s=$("lbSave");if(s)s.disabled=!(on&&inc)}
function discard(){if(!confirm("Discard this photo's rows? Nothing has been saved."))return;ST={busy:false,prog:0,msg:"",rows:null,img:"",mode:"",ok:false,err:""};rr()}
function commit(){if(!ST.ok)return;const rows=ST.rows.filter(r=>r.inc);const bad=[];
 rows.forEach((r,i)=>{FK.forEach(k=>{const v=norm(k,r[k].v);if(!valid(k,v))bad.push(`Row ${i+1} ${F.find(f=>f[0]===k)[1]}`)});if(!norm("date",r.date.v))bad.push(`Row ${i+1} Date missing`)});
 if(bad.length){alert("Please fix these before saving:\n• "+bad.slice(0,8).join("\n• ")+(bad.length>8?"\n…":""));return}
 S.flights=S.flights||[];rows.forEach(r=>{const f={src:"photo",t:Date.now()};FK.forEach(k=>f[k]=norm(k,r[k].v));f.ac=[f.model,f.ident].filter(Boolean).join(" ");S.flights.push(f)});
 try{if(typeof touchStreak==="function")touchStreak()}catch(e){}save();ST={busy:false,prog:0,msg:"",rows:null,img:"",mode:"",ok:false,err:""};if(typeof toast==="function")toast(`Saved ${rows.length} entr${rows.length===1?"y":"ies"} to your training log`);rr()}
window.LOGBK={view,file,sample,ed,inc,delRow,addRow,ok,discard,commit,_st:()=>ST,_run:run};
})();
