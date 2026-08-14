const CACHE="colosseum-restoration-v15";
const CORE=[
  "./","./index.html","./styles.css?v=15","./app.js?v=15","./pdf.js?v=15",
  "./manifest.webmanifest",
  "./assets/ho-oh.png","./assets/lugia.png","./assets/celebi.webp","./assets/title-jp.png",
  "./assets/pokeball-active.svg","./assets/pokeball-inactive.svg"
];

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE).then(cache=>
      Promise.allSettled(CORE.map(url=>cache.add(url)))
    ).then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  event.respondWith(
    fetch(event.request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
      return response;
    }).catch(()=>caches.match(event.request))
  );
});
