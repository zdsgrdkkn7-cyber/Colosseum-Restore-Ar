const CACHE="colosseum-restoration-v18-4-1";
const CORE=[
  "./","./index.html","./styles.css?v=18","./rev18.css?v=18.4.1","./app.js?v=16.1","./pdf-v17.js?v=18.4.1",
  "./rev18.js?v=18.4.1","./pdf-rev18.js?v=18.4.1","./batch-budget-v17.js","./pricing-v17-2.js",
  "./manifest.webmanifest","./assets/ho-oh.png","./assets/lugia.png","./assets/celebi.webp","./assets/title-jp.png",
  "./assets/pokeball-active.svg","./assets/pokeball-inactive.svg"
];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(CORE.map(url=>cache.add(url)))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{if(event.request.method!=="GET")return;event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});return response}).catch(()=>caches.match(event.request)))});
