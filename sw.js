const C='tes-ifr-v13k-poh',A='tes-ifr-audio-1';
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./poh/poh.js','./poh/poh.css','./poh/pdfjs/pdf.min.mjs','./poh/pdfjs/pdf.worker.min.mjs'])).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&x!==A).map(x=>caches.delete(x)))).then(()=>self.clients.claim()).then(()=>{
  /* background: fetch all narration audio for offline use, a few at a time, without blocking the app */
  fetch('./a/index.json').then(r=>r.json()).then(async L=>{const c=await caches.open(A);for(let i=0;i<L.length;i+=4){await Promise.all(L.slice(i,i+4).map(async f=>{const u='./a/'+f;if(!(await c.match(u)))try{const r=await fetch(u);if(r.ok)await c.put(u,r)}catch(e){}}))}}).catch(()=>{})})));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
  if(u.pathname.includes('/a/')){e.respondWith(caches.open(A).then(c=>c.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).then(n=>{if(n.ok&&n.status===200)c.put(e.request,n.clone());return n}))));return}
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request)))});
/* Optional Instant alerts add-on (Firebase Blaze): show pushes and open the app on tap */
self.addEventListener('push',e=>{let j={};try{j=e.data?e.data.json():{}}catch(x){j={body:e.data?e.data.text():''}}const d=j.data||j.notification||j;e.waitUntil(self.registration.showNotification(d.title||'TES IFR alert',{body:d.body||'',tag:d.tag||'tes',data:{url:d.url||'./#tools/sq'},icon:'./icon-192.png'}))});
self.addEventListener('notificationclick',e=>{e.notification.close();const u=(e.notification.data||{}).url||'./';e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(L=>{for(const c of L){if('focus' in c){c.navigate(u);return c.focus()}}return clients.openWindow(u)}))});
