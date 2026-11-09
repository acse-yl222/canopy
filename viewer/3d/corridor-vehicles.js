import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Display-only generic bodies; vehicle positions, headings and timestamps remain
// the saved SUMO records. Colours and vehicle styling are illustrative.
export function createCorridorVehicles(capacity) {
  const group=new THREE.Group();group.name='Detailed recorded traffic';group.count=0;
  const material=(color)=>new THREE.MeshStandardMaterial({color,roughness:.65});
  const paint=material(0xffffff),glass=material('#25404b'),rubber=material('#25282b'),white=new THREE.MeshBasicMaterial({color:'#fff1c9'}),red=new THREE.MeshBasicMaterial({color:'#ae201b'});
  function model(bus){
    const buckets=new Map(),add=(g,m)=>{if(!buckets.has(m))buckets.set(m,[]);buckets.get(m).push(g)},box=(x,y,z,w,h,d,m)=>add(new THREE.BoxGeometry(w,h,d).translate(x,y,z),m);
    const length=bus?11.5:4.5,width=bus?2.5:1.85;
    box(0,bus?1.25:.66,0,length,bus?1.8:.72,width,paint);
    // Inset glazing, roof cap, bonnet and boot produce a readable silhouette.
    box(bus?0:-.18,bus?2.2:1.16,0,bus?10.9:2.35,bus?1.05:.58,width-.12,glass);
    box(bus?0:-.24,bus?2.79:1.49,0,bus?11.3:2.25,.12,width-.04,paint);
    if(bus){for(let x=-4.8;x<5.4;x+=1.15)box(x,2.2,0,.075,1.08,width-.08,paint)}
    else {for(const x of [-1.3,-.12,.98])box(x,1.16,0,.10,.6,width-.08,paint)}
    const radius=bus?.48:.32,axle=bus?3.65:1.42;
    for(const x of [-axle,axle])for(const z of [-width/2,width/2]){
      add(new THREE.CylinderGeometry(radius,radius,.20,10).rotateX(Math.PI/2).translate(x,radius,z),rubber);
      add(new THREE.CylinderGeometry(radius*.48,radius*.48,.215,8).rotateX(Math.PI/2).translate(x,radius,z),glass);
    }
    for(const z of [-width*.33,width*.33]){box(length/2+.012,bus?.8:.66,z,.035,.16,.30,white);box(-length/2-.012,bus?.8:.66,z,.035,.17,.26,red)}
    const meshes=[];
    for(const [m,gs] of buckets){const g=mergeGeometries(gs,false);gs.forEach(g=>g.dispose());const mesh=new THREE.InstancedMesh(g,m,capacity);mesh.count=0;mesh.frustumCulled=false;mesh.name=bus?'Coach detail':'Car detail';group.add(mesh);meshes.push(mesh)}
    return {meshes,count:0};
  }
  const car=model(false),bus=model(true),dummy=new THREE.Object3D(),color=new THREE.Color();
  const palette=[0xd45139,0xe5e8e5,0x647c8c,0x363d47,0x8c9d91,0xc6b89a];
  return {group,begin(){car.count=bus.count=0},set(id,kind,x,north,heading,height=0,pitch=0){const batch=kind==='bus'?bus:car,i=batch.count++;dummy.position.set(x,height+.1,-north);dummy.rotation.set(0,heading,pitch,'YXZ');dummy.updateMatrix();for(const mesh of batch.meshes){mesh.setMatrixAt(i,dummy.matrix);if(mesh.material===paint)mesh.setColorAt(i,color.set(kind==='bus'?0xe6b13c:palette[id%palette.length]))}},finish(){for(const b of [car,bus])for(const m of b.meshes){m.count=b.count;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true}group.count=car.count+bus.count;group.userData={cars:car.count,buses:bus.count,styling:'Generic illustrative car/coach bodies; original trajectories unchanged'}}};
}
