// Ground and exact recorded SUMO frames in the scene's flattened ENU frame.
import * as THREE from 'three';
import {createVectorLandscape} from './vector-landscape.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export async function createCorridorContext({scene, config, url, onChange}) {
  const group = new THREE.Group(); group.name='corridor_context'; scene.add(group);
  const panel=document.createElement('details'); panel.open=true;
  panel.style.cssText='padding:10px;border-top:1px solid #567;color:inherit;font:12px sans-serif';
  panel.innerHTML=`<summary style="cursor:pointer;font-weight:bold">Ground & recorded traffic</summary><p>Ground projected to the buildings’ flat ENU plane.</p><label>Ground <select id="corridor-ground"><option value="surface">Roads / green / water</option><option value="elevation">Terrain elevation colour</option></select></label><p id="corridor-ground-key">Grey roads · green vegetation · blue water</p>${config.roads_mesh?'<p><label><input id="corridor-roads-visible" type="checkbox" checked> Vector road surfaces</label></p><p><label><input id="corridor-lane-boundaries" type="checkbox"> Lane-width boundaries (schematic)</label></p><p id="corridor-roads-status">Loading vector roads…</p>':''}<label><input id="corridor-traffic-visible" type="checkbox" checked> SUMO AM peak · saved subset</label><p><button id="corridor-traffic-play">Play traffic</button> <select id="corridor-traffic-rate" aria-label="Traffic playback speed"><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option><option value="8">8×</option><option value="10">10×</option></select> <span id="corridor-traffic-time">Loading…</span></p><input id="corridor-traffic-step" type="range" min="0" value="0" style="width:100%"><p>Independent traffic clock · exact 1 s saved frames · not observed traffic.</p><p>Wind speed magnitude · 16 m averaged grid · 100 sampled frames · float16. Original times retained (75–100 s gaps).</p>${config.temperature_hidden?'':'<p>Temperature: 32 m grid, sampled 8 m above ground.</p>'}`;
  const container=document.querySelector('#l-ground').closest('aside, .panel, #panel') || document.querySelector('#geometry-quality').parentElement.parentElement;
  container.querySelector('.quality-note').after(panel);
  const [landscape,roadAsset]=await Promise.all([createVectorLandscape({url,onChange}),new GLTFLoader().loadAsync(url(config.roads_mesh))]);
  const ground=landscape.surface;group.add(ground,landscape.vegetation);
  panel.querySelector('#corridor-ground').closest('label').remove();
  panel.querySelector('#corridor-ground-key').textContent='Vector land polygons and water · mapped trees and hedges · inferred vegetation sizes';
  const switches=document.createElement('div');switches.innerHTML='<p><label><input id="vector-surface-visible" type="checkbox" checked> Vector land / water / paths</label></p><p><label><input id="vector-vegetation-visible" type="checkbox" checked> Mapped trees / hedges</label></p><p id="vector-landscape-counts">'+landscape.meta.trees+' mapped trees · '+landscape.meta.hedges+' hedges · '+landscape.meta.areas+' areas · '+landscape.meta.water+' waters · '+landscape.meta.paths+' paths</p><p>Tree species/heights and hedge dimensions are inferred from original display rules. Source coverage: 8 km; outer 96 m rim unclassified.</p>';panel.querySelector('#corridor-ground-key').after(switches);
  switches.onchange=()=>{syncGround();onChange()};
  const roads=roadAsset?.scene ?? null, boundaries=[];
  if(roads){roads.name='vector_road_network';group.add(roads);roads.traverse(o=>{if(o.isMesh&&o.name==='lane_boundaries'){boundaries.push(o);o.visible=false}});
    panel.querySelector('#corridor-roads-status').textContent='70,076 source lanes · vector widths and junction outlines · flat ENU projection';
    panel.querySelector('#corridor-lane-boundaries').onchange=e=>{for(const mesh of boundaries)mesh.visible=e.target.checked;onChange()};
    panel.querySelector('#corridor-roads-visible').onchange=()=>syncGround();
  }
  const groundToggle=document.querySelector('#l-ground'),treesToggle=document.querySelector('#l-trees'),roadsToggle=panel.querySelector('#corridor-roads-visible'),surfaceToggle=panel.querySelector('#vector-surface-visible'),vegetationToggle=panel.querySelector('#vector-vegetation-visible');
  function syncGround(){const visible=groundToggle.checked,roadVisible=visible&&(roadsToggle?.checked??true),landVisible=visible&&surfaceToggle.checked,vegVisible=treesToggle.checked&&vegetationToggle.checked;if(ground.visible!==landVisible||roads&&roads.visible!==roadVisible||landscape.vegetation.visible!==vegVisible)onChange();ground.visible=landVisible;if(roads)roads.visible=roadVisible;landscape.vegetation.visible=vegVisible;}
  syncGround();
  const [meta,response]=await Promise.all([fetch(url(config.traffic_meta)).then(r=>{if(!r.ok)throw Error('Traffic metadata unavailable');return r.json()}),fetch(url(config.traffic_binary))]);
  if(!response.ok)throw Error('Traffic frames unavailable');
  const buffer=await response.arrayBuffer(), bytes=new DataView(buffer), frames=[];let offset=0,maxCount=0;
  for(let f=0;f<meta.frames;f++){if(offset+4>buffer.byteLength)throw Error('Truncated traffic frame');const count=bytes.getUint32(offset,true);offset+=4;frames.push({offset,count});offset+=count*16;if(offset>buffer.byteLength)throw Error('Truncated traffic records');maxCount=Math.max(maxCount,count)}
  if(offset!==buffer.byteLength)throw Error('Unexpected traffic bytes');
  const cars=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.65}),maxCount);cars.frustumCulled=false;group.add(cars);
  const dummy=new THREE.Object3D(),color=new THREE.Color();let frame=-1,playing=false,elapsed=0;
  const rate=panel.querySelector('#corridor-traffic-rate');rate.value=String(config.traffic_speed ?? 4);
  const slider=panel.querySelector('#corridor-traffic-step'), clock=panel.querySelector('#corridor-traffic-time'),button=panel.querySelector('#corridor-traffic-play');slider.max=frames.length-1;
  function show(index){index=Math.max(0,Math.min(frames.length-1,index));if(index===frame)return;frame=index;const f=frames[index];cars.count=f.count;
    for(let i=0;i<f.count;i++){const k=f.offset+i*16,id=bytes.getUint32(k,true),kind=meta.vehicles[id]?.type;if(!meta.vehicles[id])throw Error('Unknown traffic vehicle');const bus=kind==='bus';dummy.position.set(bytes.getFloat32(k+4,true),bus?1.65:.85,-bytes.getFloat32(k+8,true));dummy.rotation.set(0,bytes.getFloat32(k+12,true),0);dummy.scale.set(bus?11.5:4.5,bus?3:1.5,bus?2.5:1.85);dummy.updateMatrix();cars.setMatrixAt(i,dummy.matrix);cars.setColorAt(i,color.set(bus?0xf1b943:0xf47155));}
    cars.instanceMatrix.needsUpdate=true;if(cars.instanceColor)cars.instanceColor.needsUpdate=true;slider.value=index;const t=meta.t0+index*meta.dt;clock.textContent=`${String(Math.floor(t/3600)).padStart(2,'0')}:${String(Math.floor(t/60)%60).padStart(2,'0')}:${String(Math.floor(t)%60).padStart(2,'0')} · ${f.count} vehicles`;onChange();}
  button.onclick=()=>{playing=!playing;if(playing&&frame===frames.length-1){elapsed=0;show(0)}button.textContent=playing?'Pause traffic':'Play traffic';};
  slider.oninput=()=>{elapsed=Number(slider.value)*meta.dt;show(Number(slider.value));};
  panel.querySelector('#corridor-traffic-visible').onchange=e=>{cars.visible=e.target.checked;onChange()};show(0);
  return {group,ground,roads,vegetation:landscape.vegetation,landscapeMeta:landscape.meta,cars,meta,frames,get frame(){return frame},get playing(){return playing},show,
    tick(dt){syncGround();if(playing){elapsed=Math.min(elapsed+dt*Number(rate.value),(frames.length-1)*meta.dt);show(Math.floor(elapsed/meta.dt));if(frame===frames.length-1){playing=false;button.textContent='Play traffic'}}},
  };
}
