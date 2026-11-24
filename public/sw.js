const CACHE='campussaathi-shell-v1';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/','/campus-icon.svg','/offline.html']))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(name=>name.startsWith('campussaathi-shell-') && name!==CACHE).map(name=>caches.delete(name))))));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/socket.io/'))return;
  if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')));
  else if(url.pathname.startsWith('/assets/')) event.respondWith(caches.open(CACHE).then(async cache=>{
    const old=await cache.match(event.request);
    if(old)return old;
    const response=await fetch(event.request);
    if(response.ok)await cache.put(event.request,response.clone());
    return response;
  }));
});

