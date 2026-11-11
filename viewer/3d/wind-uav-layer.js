import * as THREE from 'three';
import {createActorLayer} from '../../agents/demo_rev02/actors/actor-layer.js';
import {currentTerrain} from './corridor-terrain.js';
import {createFlightCorridors} from './flight-corridors.js';
import {enuToWorld,sampleRoute,validateReplay} from './wind-uav-route.mjs';

export async function createWindUavLayer({scene,camera,controls,config,configURL}){
 const response=await fetch(new URL(config.routes,configURL));if(!response.ok)throw Error(`UAV routes: HTTP ${response.status}`);
 const data=validateReplay(await response.json());
 const wavepde=config.mode==='wavepde';
 if(wavepde&&data.schema_version!=='canopy-wavepde-demo-1')throw Error('WavePDE configuration requires WavePDE evidence');
 const group=new THREE.Group();group.name=wavepde?'Original WavePDE low altitude UAV':'Wind-aware low altitude UAV';scene.add(group);
 const actors=await createActorLayer({scene:group,carCapacity:1,uavCapacity:1,uavURL:new URL('../../agents/demo_rev02/assets/hexacopter_cargo.glb',import.meta.url).href});
 actors.updateCars([]);actors.setVisible({cars:false});
 const stationGeo=new THREE.BufferGeometry();stationGeo.setAttribute('position',new THREE.Float32BufferAttribute(data.stations.flatMap(s=>{const p=enuToWorld(s.position_enu_m);p[1]+=4;return p;}),3));
 const dots=new THREE.Points(stationGeo,new THREE.PointsMaterial({color:0x67e5cf,size:7,sizeAttenuation:false,depthTest:false}));dots.name='100 synthetic stations';group.add(dots);
 const pads=new THREE.Group();group.add(pads);
 const endpointLabels=['#ffbe66','#67e5cf'].map(color=>{const canvas=document.createElement('canvas');canvas.width=256;canvas.height=96;const texture=new THREE.CanvasTexture(canvas);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));sprite.scale.set(28,10.5,1);sprite.renderOrder=22;pads.add(sprite);return {canvas,texture,sprite,color};});
 const startPad=new THREE.Mesh(new THREE.CylinderGeometry(5,5,.25,32),new THREE.MeshBasicMaterial({color:0xffbe66}));
 const endPad=startPad.clone();endPad.material=new THREE.MeshBasicMaterial({color:0x67e5cf});pads.add(startPad,endPad);
 const marker=new THREE.Mesh(new THREE.SphereGeometry(.18,12,8),new THREE.MeshBasicMaterial({color:0xffffff}));marker.name='UAV locator';group.add(marker);
 const arrows=new THREE.Group();group.add(arrows);
 const panel=document.createElement('section');panel.className='uav-route-panel';panel.hidden=true;
 panel.innerHTML=`<div class="uav-eyebrow">CANOPY / LOW ALTITUDE</div><h2>${wavepde?'WavePDE UAV':'Wind-aware UAV'}</h2><div class="uav-sub">100 stations · 40 m flight ceiling<br>${data.routes.length} validated routes</div><div class="uav-selectors"><label>Departure<select data-from aria-label="UAV departure"></select></label><span>→</span><label>Arrival<select data-to aria-label="UAV arrival"></select></label></div><label class="uav-example">Explore a building detour<select data-example aria-label="Building detour example"></select></label><div data-metrics class="uav-metrics"></div><div class="uav-actions"><button data-focus>Frame route</button><button data-close>Find UAV</button><button data-detour>At building</button><button data-restart>Restart</button><button data-network>100 stations</button></div><div class="uav-options"><label><input type="checkbox" data-follow> Follow UAV</label><label><input type="checkbox" data-wind checked> Wind arrows</label></div><p data-live class="uav-live"></p><p class="uav-legend"><i></i> Planned route <span>●</span> Departure / arrival<br>Mint arrows: wind direction, length ∝ speed</p><details><summary>Model & collision evidence</summary><p>${wavepde?'Original WavePDE solver: convected wave equation, followed by characteristic path extraction on 8 × 8 × 4 m voxels. 12 m takeoff / landing gates; hard limit 40 m above ground.':'Wind-weighted A* on an 8 m terrain-following surface. Approximately 24 m above ground; hard limit 40 m.'} 4 m horizontal padding and 3 m vertical clearance in the cruise planner. Checked against 2 m obstacle columns.</p><p>Frozen model wind at 7,500 s, transferred by height above terrain. Wind was not recomputed for the terrain-restored geometry. Synthetic stations; kinematic flight replay. Flight time is integrated separately from the PDE first-peak arrival time. Only the listed neighbouring pairs are precomputed.</p><a data-evidence target="_blank" rel="noopener">View run evidence ↗</a></details>`;
 document.body.append(panel);const el=k=>panel.querySelector(`[data-${k}]`);
 el('evidence').href=new URL(config.evidence,configURL).href;
 for(const s of data.stations){const available=data.routes.some(r=>r.from===s.id);const option=new Option(s.id+(available?'':' · no validated route'),s.id);option.disabled=!available;el('from').add(option);}
 const examples=data.routes.filter(r=>r.building_detour&&(!wavepde||r.lateral_avoidance_example)).sort((a,b)=>a.id===config.default_route?-1:b.id===config.default_route?1:b.direct_building_obstruction_m-a.direct_building_obstruction_m).slice(0,16);
 for(const r of examples)el('example').add(new Option(`${r.from} → ${r.to} · ${(r.distance_m/1000).toFixed(2)} km`,r.id));
 let routeLine=null,current=null,active=false,follow=false;
 const R={group,data,actors,uavMode:wavepde?'wavepde':'wind_astar',flightSelection:true,t:0,speed:1,playing:true,duration:1,uavs:[],stats:'',
  get selectedRoute(){return current;},
  get viewPose(){const pts=current.points_enu_m.map(p=>new THREE.Vector3(...enuToWorld(p)));const box=new THREE.Box3().setFromPoints(pts);const target=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());const d=Math.max(220,size.x,size.z);return {target,pos:target.clone().add(new THREE.Vector3(d*.3,d*.75,d*.75))};},
  select(id){
   current=data.routes.find(r=>r.id===id);if(!current)throw Error('Route unavailable');R.duration=current.times_s.at(-1);R.playing=true;
   el('from').value=current.from;destinations(current.to);el('example').value=current.id;
   if(routeLine){routeLine.geometry.dispose();routeLine.material.dispose();routeLine.removeFromParent();}
   routeLine=createFlightCorridors([{points_m:current.points_enu_m.map(enuToWorld)}],{route_width_px:3,route_opacity:.95});routeLine.material.color.set(0xffbd63);routeLine.name='Validated wind-aware route';group.add(routeLine);
   startPad.position.fromArray(enuToWorld(data.stations.find(s=>s.id===current.from).position_enu_m));endPad.position.fromArray(enuToWorld(data.stations.find(s=>s.id===current.to).position_enu_m));
   endpointLabels.forEach((l,i)=>{const c=l.canvas.getContext('2d');c.clearRect(0,0,256,96);c.fillStyle='#142e2b';c.fillRect(0,0,256,96);c.fillStyle=l.color;c.font='bold 48px system-ui';c.textAlign='center';c.fillText(i?current.to:current.from,128,64);l.texture.needsUpdate=true;l.sprite.position.copy(i?endPad.position:startPad.position).add(new THREE.Vector3(0,9,0));});
   while(arrows.children.length){const child=arrows.children[0];child.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});arrows.remove(child);}
   for(let i=3;i<current.points_enu_m.length-3;i+=Math.max(4,Math.floor(current.points_enu_m.length/20))){const w=enuToWorld(current.wind_enu_mps[i]);const v=new THREE.Vector3(...w);const speed=v.length();if(speed<.05)continue;arrows.add(new THREE.ArrowHelper(v.normalize(),new THREE.Vector3(...enuToWorld(current.points_enu_m[i])).add(new THREE.Vector3(0,4,0)),speed*12,0x68e7cb,3,1.5));}
   el('metrics').innerHTML=`<div><b>${(current.distance_m/1000).toFixed(2)}<small> km</small></b><span>Flight distance</span></div><div><b>${current.duration_s.toFixed(0)}<small> s</small></b><span>Model flight time</span></div><div><b>${current.audit.max_agl_m.toFixed(1)}<small> m</small></b><span>Highest above ground</span></div><div><b>${current.straight_blocked?'Detour':'Clear'}</b><span>${current.straight_blocked?'Direct line obstructed':'Direct line check'}</span></div>`;
   el('detour').disabled=!current.building_detour;
   R.stats=`${current.from} → ${current.to} · ${data.routes.length} checked routes · ${data.stations.length} stations`;R.update(0);
   const slider=document.querySelector('#step');if(slider){slider.min=0;slider.max=R.duration;slider.step=.1;slider.disabled=false;}
  },
  update(t){R.t=Math.max(0,Math.min(R.duration,t));const s=sampleRoute(current,R.t);R.uavs=[{idIndex:0,x:s.position[0],y:s.position[1],z:s.position[2],headingRadians:s.heading}];actors.updateUavs(R.uavs);marker.position.fromArray(s.position).add(new THREE.Vector3(0,.85,0));el('live').textContent=`${R.t.toFixed(1)} / ${R.duration.toFixed(1)} s · ${(s.position[1]-(currentTerrain()?.sample(s.position[0],s.position[2])??s.position[1])).toFixed(1)} m AGL · wind ${Math.hypot(...s.wind).toFixed(2)} m/s`;},
  tick(dt){const ready=R.geometryReady?.()??true;el('detour').disabled=!current.building_detour||!ready;if(!ready){el('live').textContent='Loading buildings along this route…';return;}if(R.playing&&!document.hidden){R.update(Math.min(R.duration,R.t+Math.min(dt,.15)*R.speed));if(R.t>=R.duration)R.playing=false;}if(follow&&active)R.focus(true);},
  focus(close=false){if(!controls)return;const p=close?{target:marker.position.clone(),pos:marker.position.clone().add(new THREE.Vector3(20,12,26))}:R.viewPose;controls.enabled=true;const damping=controls.enableDamping;controls.enableDamping=false;controls.update();controls.target.copy(p.target);camera.position.copy(p.pos);controls.update();controls.enableDamping=damping;},
  applyLayers({uavs=true,stations=true,routes=true}={}){actors.setVisible({uavs});marker.visible=uavs;dots.visible=stations;pads.visible=stations;if(routeLine)routeLine.visible=uavs&&routes;arrows.visible=uavs&&el('wind').checked;},
  setVisible(value){active=value;group.visible=value;panel.hidden=!value;document.body.classList.toggle('uav-mode',value);},
  dispose(){document.body.classList.remove('uav-mode');panel.remove();actors.dispose();group.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose();m.dispose();}});group.removeFromParent();}
 };
 function destinations(selected){const opts=data.routes.filter(r=>r.from===el('from').value);el('to').replaceChildren(...opts.map(r=>new Option(r.to,r.to)));if(selected)el('to').value=selected;}
 function change(){R.select(el('from').value+'-'+el('to').value);follow=false;el('follow').checked=false;R.focus();}
 el('from').onchange=()=>{destinations();change();};el('to').onchange=change;
 el('example').onchange=()=>{R.select(el('example').value);follow=false;el('follow').checked=false;R.focus();};
 el('focus').onclick=()=>{follow=false;el('follow').checked=false;R.focus();};el('close').onclick=()=>R.focus(true);
 el('detour').onclick=()=>{const f=current.obstruction_focus_enu_m;if(!f)return;let best=0,distance=Infinity;current.points_enu_m.forEach((p,i)=>{const d=Math.hypot(p[0]-f[0],p[1]-f[1]);if(d<distance){distance=d;best=i;}});R.update(Math.max(0,current.times_s[best]-3));R.playing=true;follow=true;el('follow').checked=true;R.focus(true);};
 el('network').onclick=()=>{follow=false;el('follow').checked=false;controls.enabled=true;controls.target.set(0,20,0);camera.position.set(0,9000,9000);controls.update();};
 el('restart').onclick=()=>{R.update(0);R.playing=true;};el('follow').onchange=()=>{follow=el('follow').checked;};el('wind').onchange=()=>arrows.visible=el('wind').checked;
 R.select(data.routes.some(r=>r.id===config.default_route)?config.default_route:(examples[0]??data.routes[0]).id);return R;
}
