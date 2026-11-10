import {enhanceGroundMaterial} from './ground-materials.js';
import {currentTerrain, terrainSurfaceGeometry, addHeightAttribute} from './corridor-terrain.js';
import * as THREE from 'three';
import {treeAssets} from './source-tree-assets.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export async function createVectorLandscape({url,onChange}) {
 const base='context/vector_landscape/';
 const get=async p=>{const r=await fetch(url(base+p));if(!r.ok)throw Error(`${p}: ${r.status}`);return r};
 const [meta,source]=await Promise.all([get('manifest.json').then(r=>r.json()),get('source/scene-meta.json').then(r=>r.json())]);
 const surface=new THREE.Group(),vegetation=new THREE.Group();surface.name='vector_landscape';vegetation.name='mapped_vegetation';
 await Promise.all(meta.layers.map(async l=>{
  const [original,r]=await Promise.all([get(l.file).then(r=>r.arrayBuffer()),fetch(url('context/terrain/'+(l.name==='unclassified-base'?'unclassified-base-exposed.f32.gz':l.file+'.gz')))]);
  if(!r.ok)throw Error(`Terrain vector surface ${l.name}: ${r.status}`);
  const elevated=await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const g=terrainSurfaceGeometry(new Float32Array(elevated));
  const flat=new THREE.BufferGeometry();flat.setAttribute('position',new THREE.BufferAttribute(new Float32Array(original),3));flat.setAttribute('canopyHeight',new THREE.BufferAttribute(new Float32Array(original.byteLength/12),1));flat.computeVertexNormals();
  const mesh=new THREE.Mesh(g,enhanceGroundMaterial(new THREE.MeshStandardMaterial({color:l.color,side:THREE.DoubleSide,roughness:1}),l.name));mesh.name=l.name;addHeightAttribute(mesh,(x,z)=>currentTerrain().sample(x,z));mesh.userData.terrainGeometry=g;mesh.userData.flatGeometry=flat;surface.add(mesh);
 }));
 const kit={rng(seed){let n=Math.floor(seed*2147483648)||1;return ()=>((n=n*16807%2147483647)-1)/2147483646},paintedMaterial(name,w,h,paint,opts){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;paint(canvas.getContext('2d'),w,h);const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=4;return new THREE.MeshStandardMaterial({map,...opts})}};
 const shares=[.4,.18,.14,.1,.08,.1],heights=[[13,26],[11,20],[10,18],[9,16],[10,19],[8,15]],sets=treeAssets.map(()=>[]);
 for(const t of source.trees){let v=t[2]*997%1,i=0;while(i<5&&v>=shares[i])v-=shares[i++];sets[i].push(t)}
 const dummy=new THREE.Object3D();
 treeAssets.forEach((asset,i)=>{const object=asset.build({THREE,kit,detail:'high'});object.updateMatrixWorld(true);const byMat=new Map();object.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone().applyMatrix4(o.matrixWorld).rotateX(-Math.PI/2);if(!byMat.has(o.material))byMat.set(o.material,[]);byMat.get(o.material).push(g)});for(const [material,geoms] of byMat){const g=mergeGeometries(geoms,false);const mesh=new THREE.InstancedMesh(g,material,sets[i].length);mesh.name=asset.id;sets[i].forEach(([x,y,seed],j)=>{const h=heights[i][0]+(heights[i][1]-heights[i][0])*(seed*7.13%1);dummy.position.set(x,0,-y);dummy.rotation.set(0,seed*6.283,0);dummy.scale.setScalar(h);dummy.updateMatrix();mesh.setMatrixAt(j,dummy.matrix)});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();vegetation.add(mesh)}});
 const segments=source.fixtures.hedge.flatMap(line=>line.slice(1).map((b,i)=>[line[i],b])).filter(([a,b])=>Math.hypot(b[0]-a[0],b[1]-a[1])>0);
 const hedges=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#49623a',roughness:1}),segments.length);hedges.name='mapped_hedges';segments.forEach(([a,b],i)=>{const len=Math.hypot(b[0]-a[0],b[1]-a[1]);dummy.position.set((a[0]+b[0])/2,.75,-(a[1]+b[1])/2);dummy.rotation.set(0,Math.atan2(b[1]-a[1],b[0]-a[0]),0);dummy.scale.set(len+.45,1.5,.9);dummy.updateMatrix();hedges.setMatrixAt(i,dummy.matrix)});hedges.computeBoundingSphere();vegetation.add(hedges);
 surface.userData.counts=meta;vegetation.userData.counts={trees:source.trees.length,hedges:source.fixtures.hedge.length,hedgeSegments:segments.length};onChange();return {surface,vegetation,meta,signalPlacements:source.placements?.traffic_signal,sourcePlacements:source.placements};
}
