// Ground and exact recorded SUMO frames in the scene's flattened ENU frame.
import {currentTerrain, elevateInstances, createElevatedRoads} from './corridor-terrain.js';
import * as THREE from 'three';
import {createCorridorVehicles} from './corridor-vehicles.js';
import {createCorridorSignals} from './corridor-signals.js';
import {createGroundFurniture} from './ground-furniture.js';
import {createVectorLandscape} from './vector-landscape.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export async function createCorridorContext({scene, config, url, onChange}) {
  const group = new THREE.Group(); group.name='corridor_context'; scene.add(group);
  const panel=document.createElement('details'); panel.open=true;
  panel.style.cssText='padding:10px;border-top:1px solid #567;color:inherit;font:12px sans-serif';
  panel.innerHTML=`<summary style="cursor:pointer;font-weight:bold">Ground & recorded traffic</summary><p>3D terrain · original 10 m heights</p><p id="corridor-terrain-status">Terrain aligned display. Physics views use the original flat simulation geometry. Bridge heights include source estimates; tunnel depths unavailable.</p><label>Ground <select id="corridor-ground"><option value="surface">Roads / green / water</option><option value="elevation">Terrain elevation colour</option></select></label><p id="corridor-ground-key">Grey roads · green vegetation · blue water</p>${config.roads_mesh?'<p><label><input id="corridor-roads-visible" type="checkbox" checked> Vector road surfaces</label></p><p><label><input id="corridor-lane-boundaries" type="checkbox"> Lane-width boundaries (schematic)</label></p><p id="corridor-roads-status">Loading vector roads…</p>':''}<label><input id="corridor-traffic-visible" type="checkbox" checked> SUMO AM peak · saved subset</label><p><button id="corridor-traffic-play">Play traffic</button> <select id="corridor-traffic-rate" aria-label="Traffic playback speed"><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option><option value="8">8×</option><option value="10">10×</option></select> <span id="corridor-traffic-time">Loading…</span></p><input id="corridor-traffic-step" type="range" min="0" value="0" style="width:100%"><p>Independent traffic clock · exact 1 s saved frames · not observed traffic. Generic car / coach styling; original trajectories unchanged.</p><p>Wind speed magnitude · 16 m averaged grid · 100 sampled frames · float16. Original times retained (75–100 s gaps).</p>${config.temperature_hidden?'':'<p>Temperature: 32 m grid, sampled 8 m above ground.</p>'}`;
  const container=document.querySelector('#l-ground').closest('aside, .panel, #panel') || document.querySelector('#geometry-quality').parentElement.parentElement;
  container.querySelector('.quality-note').after(panel);
  const [landscape,roadAsset]=await Promise.all([createVectorLandscape({url,onChange}),new GLTFLoader().loadAsync(url(config.roads_mesh))]);
  const signals=createCorridorSignals(landscape.signalPlacements);group.add(signals);
  const signalControl=document.createElement('div');signalControl.innerHTML=`<p><label><input id="corridor-signals-visible" type="checkbox" checked> Mapped traffic signals</label></p><p id="corridor-signals-status">${signals.userData.count.toLocaleString('en')} source placements · original detailed geometry. Static coloured aspects; signal timing is unavailable and is not linked to vehicle playback.</p>`;panel.querySelector('#corridor-traffic-visible').closest('label').before(signalControl);
  signalControl.onchange=()=>{signals.visible=signalControl.querySelector('input').checked;onChange()};
  const ground=landscape.surface;group.add(ground,landscape.vegetation);
  panel.querySelector('#corridor-ground').closest('label').remove();
  panel.querySelector('#corridor-ground-key').textContent='Vector land polygons and water · mapped trees and hedges · inferred vegetation sizes';
  const switches=document.createElement('div');switches.innerHTML='<p><label><input id="vector-surface-visible" type="checkbox" checked> Vector land / water / paths</label></p><p><label><input id="vector-vegetation-visible" type="checkbox" checked> Mapped trees / hedges</label></p><p id="vector-landscape-counts">'+landscape.meta.trees+' mapped trees · '+landscape.meta.hedges+' hedges · '+landscape.meta.areas+' areas · '+landscape.meta.water+' waters · '+landscape.meta.paths+' paths</p><p>Tree species/heights and hedge dimensions are inferred from original display rules. Source coverage: 8 km; outer 96 m rim unclassified.</p>';panel.querySelector('#corridor-ground-key').after(switches);
  switches.onchange=()=>{syncGround();onChange()};
  const terrain=currentTerrain(),elevatedRoads=createElevatedRoads();group.add(elevatedRoads);
  const furniture=createGroundFurniture(landscape.sourcePlacements,terrain);group.add(furniture);
  const detailControls=document.createElement('div');detailControls.innerHTML=`<p><label><input id="ground-furniture-visible" type="checkbox" checked> Source street furniture</label></p><p>${furniture.userData.total.toLocaleString('en')} source placements · benches, cycle stands, lamps and other fixtures. Generic inferred shapes/sizes; shown within 480 m. Position accuracy not independently verified.</p><p>Illustrative ground materials · no image textures.</p>`;
  switches.after(detailControls);detailControls.onchange=()=>{syncGround();onChange()};
  let terrainMode=null;
  const roads=roadAsset?.scene ?? null, boundaries=elevatedRoads.children.filter(o=>o.name==='lane_boundaries');
  if(roads){roads.name='vector_road_network';group.add(roads);roads.traverse(o=>{if(o.isMesh&&o.name==='lane_boundaries'){boundaries.push(o);o.visible=false}});
    panel.querySelector('#corridor-roads-status').textContent='70,076 source lanes · original XYZ elevations in 3D mode · source bridge ramps; no invented tunnel depths';
    panel.querySelector('#corridor-lane-boundaries').onchange=e=>{for(const mesh of boundaries)mesh.visible=e.target.checked;onChange()};
    panel.querySelector('#corridor-roads-visible').onchange=()=>syncGround();
  }
  const groundToggle=document.querySelector('#l-ground'),treesToggle=document.querySelector('#l-trees'),roadsToggle=panel.querySelector('#corridor-roads-visible'),surfaceToggle=panel.querySelector('#vector-surface-visible'),vegetationToggle=panel.querySelector('#vector-vegetation-visible');
  function syncGround(){const mode=terrain.enabled;
    if(terrainMode!==mode){terrainMode=mode;ground.children.forEach(m=>{m.geometry=mode?m.userData.terrainGeometry:m.userData.flatGeometry});elevateInstances(landscape.vegetation,mode);elevateInstances(signals,mode);onChange();}
    const visible=groundToggle.checked,roadVisible=visible&&(roadsToggle?.checked??true),landVisible=visible&&surfaceToggle.checked,vegVisible=treesToggle.checked&&vegetationToggle.checked;if(ground.visible!==landVisible||roads&&roads.visible!==roadVisible||landscape.vegetation.visible!==vegVisible)onChange();ground.visible=landVisible;if(roads)roads.visible=roadVisible&&!mode;elevatedRoads.visible=roadVisible&&mode;landscape.vegetation.visible=vegVisible;const furnitureVisible=mode&&visible&&detailControls.querySelector('input').checked;if(furniture.visible!==furnitureVisible)onChange();furniture.visible=furnitureVisible;}
  syncGround();
  const [meta,response]=await Promise.all([fetch(url(config.traffic_meta)).then(r=>{if(!r.ok)throw Error('Traffic metadata unavailable');return r.json()}),fetch(url(config.traffic_binary))]);
  if(!response.ok)throw Error('Traffic frames unavailable');
  const buffer=await response.arrayBuffer(), bytes=new DataView(buffer), frames=[];let offset=0,maxCount=0;
  for(let f=0;f<meta.frames;f++){if(offset+4>buffer.byteLength)throw Error('Truncated traffic frame');const count=bytes.getUint32(offset,true);offset+=4;frames.push({offset,count});offset+=count*16;if(offset>buffer.byteLength)throw Error('Truncated traffic records');maxCount=Math.max(maxCount,count)}
  if(offset!==buffer.byteLength)throw Error('Unexpected traffic bytes');
  const vehicles=createCorridorVehicles(maxCount),cars=vehicles.group;group.add(cars);
  let frame=-1,playing=false,elapsed=0;
  const rate=panel.querySelector('#corridor-traffic-rate');rate.value=String(config.traffic_speed ?? 4);
  const slider=panel.querySelector('#corridor-traffic-step'), clock=panel.querySelector('#corridor-traffic-time'),button=panel.querySelector('#corridor-traffic-play');slider.max=frames.length-1;
  let lastElevationMode=null;
  function show(index){index=Math.max(0,Math.min(frames.length-1,index));if(index===frame&&lastElevationMode===terrain.enabled)return;if(index!==frame+1)terrain.clearMatches();lastElevationMode=terrain.enabled;frame=index;const f=frames[index];vehicles.begin();
    for(let i=0;i<f.count;i++){const k=f.offset+i*16,id=bytes.getUint32(k,true),kind=meta.vehicles[id]?.type;if(!meta.vehicles[id])throw Error('Unknown traffic vehicle');const x=bytes.getFloat32(k+4,true),north=bytes.getFloat32(k+8,true),heading=bytes.getFloat32(k+12,true),road=terrain.enabled?terrain.match(x,north,heading,id):{height:0,grade:0};vehicles.set(id,kind,x,north,heading,road.height+.22,Math.atan(road.grade));}
    vehicles.finish();slider.value=index;const t=meta.t0+index*meta.dt;clock.textContent=`${String(Math.floor(t/3600)).padStart(2,'0')}:${String(Math.floor(t/60)%60).padStart(2,'0')}:${String(Math.floor(t)%60).padStart(2,'0')} · ${f.count} vehicles`;onChange();}
  function setPlaying(value){playing=value;if(playing&&frame===frames.length-1){elapsed=0;show(0)}button.textContent=playing?'Pause traffic':'Play traffic';}
  button.onclick=()=>setPlaying(!playing);
  slider.oninput=()=>{elapsed=Number(slider.value)*meta.dt;show(Number(slider.value));};
  panel.querySelector('#corridor-traffic-visible').onchange=e=>{cars.visible=e.target.checked;onChange()};show(0);
  return {group,ground,roads,elevatedRoads,terrain,signals,furniture,vegetation:landscape.vegetation,landscapeMeta:landscape.meta,cars,meta,frames,get frame(){return frame},get playing(){return playing},show,setPlaying,
    tick(dt){syncGround();if(lastElevationMode!==terrain.enabled)show(frame);if(playing){elapsed=Math.min(elapsed+dt*Number(rate.value),(frames.length-1)*meta.dt);show(Math.floor(elapsed/meta.dt));if(frame===frames.length-1){playing=false;button.textContent='Play traffic'}}},
  };
}
