
const CACHE='worktrack-v2';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',()=>self.clients.claim());
self.addEventListener('fetch',event=>{
event.respondWith(
caches.open(CACHE).then(async cache=>{
try{
const response=await fetch(event.request);
if(event.request.method==='GET') cache.put(event.request,response.clone());
return response;
}catch(e){
return await cache.match(event.request);
}
})
);
});
