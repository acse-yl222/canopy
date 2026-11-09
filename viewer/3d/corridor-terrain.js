import * as THREE from 'three';
let terrain=null;
const enabled={value:1};
const patched=new WeakSet();
function grid(data){
 const raw=Uint8Array.from(atob(data.z),c=>c.charCodeAt(0)),dv=new DataView(raw.buffer),h=new Float32Array(data.nx*data.ny);
 if(raw.length!==h.length*2)throw Error('Terrain sample count mismatch');
 for(let i=0;i<h.length;i++)h[i]=data.base_m+data.scale_m*dv.getInt16(i*2,true);
 return {data,h,sample(x,north){const u=Math.max(0,Math.min(data.nx-1,(x-data.x0)/data.dx)),v=Math.max(0,Math.min(data.ny-1,(north-data.y0)/data.dx)),a=Math.min(data.nx-2,Math.floor(u)),b=Math.min(data.ny-2,Math.floor(v)),fx=u-a,fy=v-b,k=b*data.nx+a;return h[k]*(1-fx)*(1-fy)+h[k+1]*fx*(1-fy)+h[k+data.nx]*(1-fx)*fy+h[k+data.nx+1]*fx*fy}};
}
export async function loadCorridorTerrain(url){
 const fetchOK=async path=>{const r=await fetch(url('context/terrain/'+path));if(!r.ok)throw Error(`Terrain ${path}: ${r.status}`);return r};
 const [data,network]=await Promise.all([fetchOK('terrain.json').then(r=>r.json()),fetchOK('road-network.json.gz').then(r=>new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).json())]);
 const dem=grid(data.terrain),road=grid(data.road_surface),segments=[],cells=new Map(),size=32;
 network.lanes.forEach((lane,laneIndex)=>{for(let i=1;i<lane.shape.length;i++){
  const a=lane.shape[i-1],b=lane.shape[i],dx=b[0]-a[0],dy=b[1]-a[1],len2=dx*dx+dy*dy;if(len2<.001)continue;
  const s={a,b,dx,dy,len2,width:lane.width,laneIndex},id=segments.length;segments.push(s);
  for(let x=Math.floor(Math.min(a[0],b[0])/size);x<=Math.floor(Math.max(a[0],b[0])/size);x++)for(let y=Math.floor(Math.min(a[1],b[1])/size);y<=Math.floor(Math.max(a[1],b[1])/size);y++){const k=x+','+y;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(id)}
 }});
 const previous=new Map();
 function match(x,north,heading,id,remember=true){
  const cx=Math.floor(x/size),cy=Math.floor(north/size),last=previous.get(id);let best=null,score=Infinity;
  for(let ix=cx-1;ix<=cx+1;ix++)for(let iy=cy-1;iy<=cy+1;iy++)for(const k of cells.get(ix+','+iy)||[]){
   const s=segments[k],t=Math.max(0,Math.min(1,((x-s.a[0])*s.dx+(north-s.a[1])*s.dy)/s.len2)),distance=Math.hypot(x-s.a[0]-t*s.dx,north-s.a[1]-t*s.dy);
   if(distance>Math.max(8,s.width+3))continue;
   const h=s.a[2]+t*(s.b[2]-s.a[2]),alignment=heading===undefined?1:(Math.cos(heading)*s.dx+Math.sin(heading)*s.dy)/Math.sqrt(s.len2);
   const continuity=last&&Math.hypot(x-last.x,north-last.north)<30?Math.min(8,Math.abs(h-last.height))*.6:0;
   const value=distance+Math.max(0,1-alignment)*4+continuity;
   if(value<score){score=value;best={height:h,distance,lane:s.laneIndex,grade:(s.b[2]-s.a[2])/Math.sqrt(s.len2),x,north}};
  }
  const result=best||{height:road.sample(x,north),distance:null,lane:null,grade:0,x,north};
  if(remember&&id!==undefined)previous.set(id,result);return result;
 }
 terrain={dem,road,network,segments,match,clearMatches:()=>previous.clear(),sample:(x,z)=>dem.sample(x,-z),get enabled(){return enabled.value===1},setEnabled(value){enabled.value=value?1:0},stats:{nx:data.terrain.nx,ny:data.terrain.ny,cell_m:data.terrain.dx,min:Math.min(...dem.h.slice(0,1)),source:data.terrain.source.name}};
 terrain.stats.min=dem.h.reduce((a,b)=>Math.min(a,b),Infinity);terrain.stats.max=dem.h.reduce((a,b)=>Math.max(a,b),-Infinity);window.corridorTerrain=terrain;return terrain;
}
export function currentTerrain(){return terrain}
function patch(material){if(patched.has(material))return;patched.add(material);const old=material.onBeforeCompile;
 material.onBeforeCompile=(shader,renderer)=>{old?.call(material,shader,renderer);shader.uniforms.canopyTerrainEnabled=enabled;shader.vertexShader='attribute float canopyHeight;\nuniform float canopyTerrainEnabled;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y += canopyHeight * canopyTerrainEnabled;')};
 const key=material.customProgramCacheKey.bind(material);material.customProgramCacheKey=()=>key()+'|canopy-terrain-v1';material.needsUpdate=true;
}
export function drapeBuildings(root){if(!terrain)return;root.updateWorldMatrix(true,true);const p=new THREE.Vector3();root.traverse(mesh=>{
 if(!mesh.isMesh||mesh.isInstancedMesh||!mesh.geometry.attributes.position)return;
 const g=mesh.geometry,pos=g.attributes.position,h=new Float32Array(pos.count),sy=mesh.matrixWorld.elements[5];
 if(Math.abs(mesh.matrixWorld.elements[4])+Math.abs(mesh.matrixWorld.elements[6])>1e-5)throw Error('Unsupported tilted source building transform');
 for(let i=0;i<pos.count;i++){p.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);h[i]=terrain.sample(p.x,p.z)/sy}
 g.setAttribute('canopyHeight',new THREE.BufferAttribute(h,1));(Array.isArray(mesh.material)?mesh.material:[mesh.material]).forEach(patch);
 g.computeBoundingBox();g.boundingBox.min.y-=5/Math.abs(sy);g.boundingBox.max.y+=75/Math.abs(sy);g.computeBoundingSphere();g.boundingSphere.radius+=75/Math.abs(sy);
 });}
function terrainNormals(g){const original=g.attributes.position,temporary=new Float32Array(original.count*3),h=g.attributes.canopyHeight;for(let i=0;i<original.count;i++){temporary[i*3]=original.getX(i);temporary[i*3+1]=original.getY(i)+h.getX(i);temporary[i*3+2]=original.getZ(i)}g.setAttribute('position',new THREE.BufferAttribute(temporary,3));g.computeVertexNormals();g.setAttribute('position',original);}
export function addHeightAttribute(mesh,sampler){const pos=mesh.geometry.attributes.position,h=new Float32Array(pos.count);for(let i=0;i<pos.count;i++)h[i]=sampler(pos.getX(i),pos.getZ(i),i);mesh.geometry.setAttribute('canopyHeight',new THREE.BufferAttribute(h,1));patch(mesh.material);terrainNormals(mesh.geometry);mesh.frustumCulled=false;}
// Split existing vector triangles; source boundary coordinates and holes remain intact.
export function terrainSurfaceGeometry(array,base=false){
 const out=[];function emit(a,b,c){const ab=(a[0]-b[0])**2+(a[2]-b[2])**2,bc=(b[0]-c[0])**2+(b[2]-c[2])**2,ca=(c[0]-a[0])**2+(c[2]-a[2])**2;
  if(Math.max(ab,bc,ca)<=400){out.push(...a,...b,...c);return}
  let u=a,v=b,w=c;if(bc>=ab&&bc>=ca){u=b;v=c;w=a}else if(ca>=ab&&ca>=bc){u=c;v=a;w=b}const mid=u.map((x,i)=>(x+v[i])/2);emit(u,mid,w);emit(mid,v,w);
 }
 if(base){const y=array[1];for(let x=-4096;x<4096;x+=20)for(let z=-4096;z<4096;z+=20){const xx=Math.min(x+20,4096),zz=Math.min(z+20,4096);out.push(x,y,z,xx,y,z,xx,y,zz,x,y,z,xx,y,zz,x,y,zz)}}
 else for(let i=0;i<array.length;i+=9)emit(Array.from(array.subarray(i,i+3)),Array.from(array.subarray(i+3,i+6)),Array.from(array.subarray(i+6,i+9)));
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(out,3));g.computeVertexNormals();return g;
}
export function elevateInstances(root,on){root.traverse(mesh=>{if(!mesh.isInstancedMesh)return;
 if(!mesh.userData.flatMatrices){mesh.userData.flatMatrices=mesh.instanceMatrix.array.slice();const heights=new Float32Array(mesh.count);for(let i=0;i<mesh.count;i++)heights[i]=terrain.sample(mesh.instanceMatrix.array[i*16+12],mesh.instanceMatrix.array[i*16+14]);mesh.userData.terrainHeights=heights}
 const flat=mesh.userData.flatMatrices;for(let i=0;i<mesh.count;i++)mesh.instanceMatrix.array[i*16+13]=flat[i*16+13]+(on?mesh.userData.terrainHeights[i]:0);mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
 });}
export function createElevatedRoads(){const root=new THREE.Group(),positions=[],heights=[],junctionP=[],junctionH=[],lineP=[],lineH=[],seamP=[],seamH=[];
 function vertex(out,hs,x,north,h){out.push(x,.22,-north);hs.push(h)}
 for(const lane of terrain.network.lanes){const pts=lane.shape,half=lane.width/2,edges=pts.map((p,i)=>{const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1;return [[p[0]-dy/len*half,p[1]+dx/len*half,p[2]],[p[0]+dy/len*half,p[1]-dx/len*half,p[2]]]});
  for(let i=1;i<pts.length;i++){const [a,b]=edges[i-1],[c,d]=edges[i];for(const v of [a,b,d,a,d,c])vertex(positions,heights,...v);for(const v of [a,c,b,d])vertex(lineP,lineH,...v);
   for(const [u,v] of [[a,c],[b,d]]){const hu=terrain.dem.sample(u[0],u[1]),hv=terrain.dem.sample(v[0],v[1]);if(hu>u[2]+.1||hv>v[2]+.1){const up=[u[0],u[1],Math.max(hu,u[2])],vp=[v[0],v[1],Math.max(hv,v[2])];for(const q of [u,v,vp,u,vp,up])vertex(seamP,seamH,...q)}}}
 }
 for(const junction of terrain.network.junctions){const shape=junction.shape;if(shape.length<3)continue;const points=shape.map(p=>new THREE.Vector2(p[0],p[1]));for(const triangle of THREE.ShapeUtils.triangulateShape(points,[]))for(const i of triangle)vertex(junctionP,junctionH,...shape[i])}
 function mesh(p,h,offset){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('canopyHeight',new THREE.Float32BufferAttribute(h,1));terrainNormals(g);const m=new THREE.MeshStandardMaterial({color:'#646c70',roughness:1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:offset,polygonOffsetUnits:offset});patch(m);const mesh=new THREE.Mesh(g,m);mesh.frustumCulled=false;root.add(mesh)}
 mesh(positions,heights,-2);mesh(junctionP,junctionH,-3);if(seamP.length){mesh(seamP,seamH,-1);const seam=root.children[root.children.length-1];seam.name='Terrain-to-road display seams';seam.material.color.set('#969183');}
 const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(lineP,3));lg.setAttribute('canopyHeight',new THREE.Float32BufferAttribute(lineH,1));const lm=new THREE.LineBasicMaterial({color:'#c9c9b6',depthWrite:false});patch(lm);const lines=new THREE.LineSegments(lg,lm);lines.position.y=.035;lines.name='lane_boundaries';lines.visible=false;lines.frustumCulled=false;root.add(lines);root.name='Source XYZ lane surfaces and junctions';root.userData={lanes:terrain.network.lanes.length,junctions:terrain.network.junctions.length};return root;
}
