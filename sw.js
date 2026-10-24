const C='tes-ifr-v13e',A='tes-ifr-audio-1';
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'])).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&x!==A).map(x=>caches.delete(x)))).then(()=>self.clients.claim()).then(()=>{
  /* background: fetch all narration audio for offline use, a few at a time, without blocking the app */
  fetch('./a/index.json').then(r=>r.json()).then(async L=>{const c=await caches.open(A);for(let i=0;i<L.length;i+=4){await Promise.all(L.slice(i,i+4).map(async f=>{const u='./a/'+f;if(!(await c.match(u)))try{const r=await fetch(u);if(r.ok)await c.put(u,r)}catch(e){}}))}}).catch(()=>{})})));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
  if(u.pathname.includes('/a/')){e.respondWith(caches.open(A).then(c=>c.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).then(n=>{if(n.ok&&n.status===200)c.put(e.request,n.clone());return n}))));return}
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request)))});
