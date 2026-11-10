import {createBirdLayer} from '../../agents/demo_rev02/birds.js';
export async function installBirdPreview(viewer,invalidate) {
 const panel=document.createElement('section');
 panel.style.cssText='position:fixed;z-index:1000;left:18px;top:180px;width:310px;padding:18px;background:#102832ed;color:white;border:1px solid #7ba99c;border-radius:14px;font:13px system-ui;box-shadow:0 8px 30px #0006';
 panel.innerHTML='<b>CANOPY · Bird simulation</b><p data-status>Loading local simulation results…</p>';
 document.body.append(panel);
 try {
 const base=new URL('../../assets/birds/',import.meta.url).href;
 const fetchOK=async p=>{const r=await fetch(base+p);if(!r.ok)throw Error(`${p}: HTTP ${r.status}`);return r;};
 const manifest=await (await fetchOK('bird_replay.json')).json();
 const [raw,st]=await Promise.all([manifest.display_float32_file??'bird_replay.i16','bird_states.u8'].map(async p=>{
  const response=await fetchOK(p+'.gz');
  return new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
 }));
 const count=manifest.frames*manifest.birds*6,e=manifest.encoding;
 if(raw.byteLength!==count*(manifest.display_float32_file?4:2)||st.byteLength!==manifest.frames*manifest.birds)throw Error('Replay size mismatch');
 const buffer=manifest.display_float32_file?new Float32Array(raw):new Float32Array(count);
 if(!manifest.display_float32_file){const q=new Int16Array(raw);for(let k=0;k<q.length;k+=6){for(let j=0;j<3;j++)buffer[k+j]=q[k+j]*e.position_scale_m+e.offset_m[j];buffer[k+3]=q[k+3]*e.angle_scale_rad;buffer[k+4]=q[k+4]*e.speed_scale_mps;buffer[k+5]=q[k+5]*e.angle_scale_rad;}}
 const layer=await createBirdLayer({scene:viewer.scene,manifest,buffer,states:new Uint8Array(st),modelURL:'./canopy-pigeon.glb'});
 layer.setMarkers(false);
 if(layer.stats.placeholder_model){layer.setVisible(false);throw Error(layer.stats.model_error);}
 panel.innerHTML=`<b>CANOPY · Bird simulation</b><p>${manifest.birds.toLocaleString()} birds · ${manifest.flocks.length} flocks<br>${manifest.frames.toLocaleString()} recorded frames</p><div style="display:flex;gap:8px"><button data-play>Play</button><select data-rate aria-label="Bird playback speed"><option value="1" selected>1×</option><option value="10">10×</option><option value="30">30×</option><option value="60">60×</option></select><select data-flock aria-label="Focus flock">${manifest.flocks.map((f,i)=>`<option value="${i}">Flock ${i+1}</option>`).join('')}</select><button data-focus>Locate</button></div><select data-moment aria-label="Bird activity" style="width:100%;margin-top:12px"></select><input data-time aria-label="Bird simulation time" type="range" min="0" max="${manifest.last_frame_t_s}" step="1.5" style="width:100%;margin-top:14px"><div data-clock></div><p style="font-size:11px;opacity:.85">Experimental flock behaviour on CANOPY terrain. Not species-calibrated. Column-based collision model.</p><label><input type="checkbox" data-visible checked> Show birds</label> <label><input type="checkbox" data-markers> Markers</label>`;
 const el=name=>panel.querySelector(`[data-${name}]`);
 let active=true;
 let t=0,playing=false,old=performance.now(),frame=0;
 function seek(value){t=Math.min(manifest.last_frame_t_s,Math.max(0,Number(value)));const s=layer.update(t);frame=s.frame;el('time').value=t;el('clock').textContent=`Simulation ${t.toFixed(1)} / ${manifest.last_frame_t_s.toFixed(0)} s · Frame ${frame+1}`;invalidate();}
 function focus(){
  const f=manifest.flocks[Number(el('flock').value)],p=[0,0,0],states=new Uint8Array(st),all=Array.from({length:f.birds},(_,i)=>f.first_bird+i);
  const swarm=all.filter(i=>states[frame*manifest.birds+i]===2),moving=all.filter(i=>[1,3].includes(states[frame*manifest.birds+i])&&buffer[(frame*manifest.birds+i)*6+4]>.5);
  let ids=swarm.length>10?swarm:moving.length?moving:all;
  if(manifest.config?.enable_murmuration===false&&ids.length>1){const k=(frame*manifest.birds+ids[0])*6;ids=ids.filter(i=>{const j=(frame*manifest.birds+i)*6;return Math.hypot(buffer[j]-buffer[k],buffer[j+1]-buffer[k+1],buffer[j+2]-buffer[k+2])<60;});}
  for(const i of ids){const k=(frame*manifest.birds+i)*6;for(let j=0;j<3;j++)p[j]+=buffer[k+j]/ids.length;}
  const damping=viewer.controls.enableDamping;viewer.controls.enableDamping=false;viewer.controls.update();
  viewer.controls.target.set(...p);const close=manifest.config?.enable_murmuration===false;viewer.camera.position.set(p[0]+(close?35:90),p[1]+(close?25:85),p[2]+(close?45:110));viewer.controls.update();viewer.controls.enableDamping=damping;invalidate();
 }
 function moments(){const f=manifest.flocks[Number(el('flock').value)];el('moment').innerHTML='<option value="">Jump to recorded activity…</option>'+f.moments.map(m=>`<option value="${m.mid_s}">${m.label}</option>`).join('');}
 el('flock').onchange=()=>{moments();focus();};el('moment').onchange=()=>{if(el('moment').value!==''){seek(el('moment').value);focus();}};
 el('play').onclick=()=>{playing=!playing;el('play').textContent=playing?'Pause':'Play';};
 el('time').oninput=()=>seek(el('time').value);el('focus').onclick=focus;
 el('visible').onchange=()=>{layer.setVisible(el('visible').checked);invalidate();};el('markers').onchange=()=>{layer.setMarkers(el('markers').checked);invalidate();};
 function tick(now){layer.setVisible(active && el('visible').checked && window.corridorTerrain?.enabled!==false);const dt=Math.min(.1,(now-old)/1000);old=now;if(active&&playing&&!document.hidden)seek((t+dt*Number(el('rate').value))%manifest.last_frame_t_s);else if(layer.group.visible){layer.update(t);invalidate();}requestAnimationFrame(tick);}requestAnimationFrame(tick);
 window.canopyBirds={manifest,layer,seek,focus,setActive(v){active=v;panel.hidden=!v;layer.setVisible(v&&el('visible').checked);invalidate();},toggle(){el('play').click();},setRate(v){el('rate').value=v;},get rate(){return Number(el('rate').value)},get time(){return t},get playing(){return playing}};
 moments();const moment=manifest.flocks[0].moments.find(m=>m.label==='Murmuration') ?? manifest.flocks[0].moments.find(m=>m.label==='Leaving the roost');seek(moment?.mid_s??0);return window.canopyBirds;
 }catch(err){panel.querySelector('[data-status]')?.replaceChildren(document.createTextNode('Bird replay failed: '+err.message));console.error(err);}
}
