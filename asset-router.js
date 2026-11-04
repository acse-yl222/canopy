const base=new URL('./',self.location.href);const upstream='https://imperial-corridor-8km-viewer.yueyan.chatgpt.site';
const routes=fetch(new URL('asset-routes.json',base),{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Asset index unavailable');return r.json()}).then(paths=>new Set(paths));
self.addEventListener('install',event=>event.waitUntil(routes.then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(u.origin!==base.origin||!u.pathname.startsWith(base.pathname)||event.request.method!=='GET')return;event.respondWith((async()=>{const path='/'+u.pathname.slice(base.pathname.length);if((await routes).has(path))return fetch(upstream+path,{mode:'cors',credentials:'omit',cache:'default'});return fetch(event.request)})())});
