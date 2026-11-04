try {
 if(!('serviceWorker' in navigator))throw Error('Please use a browser with service worker support to load CANOPY.');
 const root=new URL('../',import.meta.url);await navigator.serviceWorker.register(new URL('asset-router.js',root));await navigator.serviceWorker.ready;
 if(!navigator.serviceWorker.controller)await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Asset connection timed out. Please reload.')),20000);navigator.serviceWorker.addEventListener('controllerchange',()=>{clearTimeout(t);resolve()},{once:true})});
 await import('./bootstrap.js');
} catch(error){document.getElementById('loading-title').textContent='Unable to connect';document.getElementById('pct').textContent=error.message;const a=document.createElement('a');a.href=location.href;a.textContent='Retry';document.querySelector('#loading .box').append(a);}
