import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Original source positions/yaw; generic metric display models, not surveyed hardware.
export function createGroundFurniture(placements,terrain){
 const group=new THREE.Group();group.name='Source street furniture';const steel=new THREE.MeshStandardMaterial({color:'#4c5556',roughness:.72}),wood=new THREE.MeshStandardMaterial({color:'#947454',roughness:1}),light=new THREE.MeshStandardMaterial({color:'#d4d3bd',roughness:.6});
 const materials=[steel,wood,light];for(const m of materials){m.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <project_vertex>',`vec4 fixtureWorld=modelMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0);
 float fixtureScale=1.0-smoothstep(320.0,480.0,distance(cameraPosition,fixtureWorld.xyz));
 transformed*=fixtureScale;
 #include <project_vertex>`);};m.customProgramCacheKey=()=> 'canopy-furniture-distance-v1';}
 const counts={},dummy=new THREE.Object3D();
 function build(kind,construct){const rows=placements[kind]??[];if(!rows.length)return;const sets=[[],[],[]];
 const box=(w,h,d,x,y,z,mat=0)=>{const g=new THREE.BoxGeometry(w,h,d).toNonIndexed();g.translate(x,y,z);sets[mat].push(g);};
 const pole=(r,h,x,y,z,mat=0)=>{const g=new THREE.CylinderGeometry(r,r,h,6).toNonIndexed();g.translate(x,y,z);sets[mat].push(g);};
 construct(box,pole);
 sets.forEach((gs,k)=>{if(!gs.length)return;const g=mergeGeometries(gs,false);gs.forEach(x=>x.dispose());const mesh=new THREE.InstancedMesh(g,materials[k],rows.length);mesh.name=kind;rows.forEach(([east,north,yaw=0],i)=>{if(![east,north,yaw].every(Number.isFinite))throw Error('Invalid source fixture '+kind);dummy.position.set(east,terrain.sample(east,-north),-north);dummy.rotation.set(0,yaw,0);dummy.scale.setScalar(1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)});mesh.computeBoundingSphere();group.add(mesh)});counts[kind]=rows.length;}
 build('bench',(b,p)=>{for(const x of [-.65,.65]){b(.075,.43,.5,x,.215,0);b(.075,.45,.065,x,.65,-.2)}for(let i=0;i<4;i++)b(1.75,.055,.09,0,.46,-.17+i*.11,1);for(let i=0;i<3;i++)b(1.75,.085,.055,0,.59+i*.12,-.23,1)});
 build('bicycle_stand',(b,p)=>{p(.025,.72,-.35,.36,0);p(.025,.72,.35,.36,0);b(.75,.05,.05,0,.72,0)});
 build('bollard',(b,p)=>{p(.065,.85,0,.425,0);b(.14,.07,.14,0,.72,0,2)});
 build('waste_basket',(b,p)=>{p(.21,.75,0,.375,0);p(.23,.05,0,.775,0,2)});
 build('post_box',(b,p)=>{p(.22,1.1,0,.55,0);p(.25,.08,0,1.14,0);b(.24,.045,.02,0,.88,.22,2)});
 build('street_lamp',(b,p)=>{p(.055,6.5,0,3.25,0);b(.08,.08,.85,0,6.47,.35);b(.26,.08,.5,0,6.44,.68,2)});
 build('bus_stop',(b,p)=>{p(.035,2.6,0,1.3,0);b(.38,.48,.06,0,2.35,0,2)});
 build('cycle_hire_dock',(b,p)=>{b(.18,.7,.3,0,.35,0);b(.22,.08,.34,0,.74,0,2)});
 group.userData={counts,total:Object.values(counts).reduce((a,b)=>a+b,0),source:'scene-meta.json placements (original positions and yaw)',dimensions:'Generic inferred display sizes; source placement accuracy is not independently verified',distance_m:480};return group;
}
