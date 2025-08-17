// Simple offline-first service worker (app shell + topic JSON)
const CACHE = "elex1-cache-v3";
const APP_SHELL = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e)=>{
  e.waitUntil(
    caches.keys().then(keys=> Promise.all(keys.map(k=> k!==CACHE ? caches.delete(k) : null)))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e)=>{
  const url = new URL(e.request.url);
  // Cache JSON topics too
  const isTopicJson = url.pathname.includes("/data-Electronics1/") && url.pathname.endsWith(".json");

  if (e.request.method !== "GET") return;

  e.respondWith((async ()=>{
    const cache = await caches.open(CACHE);
    const cached = await cache.match(e.request);
    if (cached) {
      // Stale-while-revalidate
      fetch(e.request).then(res=>{ if(res && res.ok) cache.put(e.request, res.clone()); }).catch(()=>{});
      return cached;
    }
    try{
      const res = await fetch(e.request);
      if(res && res.ok && (APP_SHELL.includes(url.pathname) || isTopicJson)){
        cache.put(e.request, res.clone());
      }
      return res;
    }catch(_){
      // Fallback to offline if shell
      if (APP_SHELL.includes(url.pathname)) return cached || new Response("Offline", {status: 503});
      throw _;
    }
  })());
});
