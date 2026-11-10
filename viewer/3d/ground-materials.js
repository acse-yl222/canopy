import * as THREE from 'three';
// Analytic surface shading only: no image maps or invented land-cover boundaries.
export function enhanceGroundMaterial(material,kind){
 const green=['park','grass','wood','scrub','cemetery','pitch'].includes(kind),water=kind==='water';
 const colors={park:'#82956c',grass:'#96a276',wood:'#526b4d',scrub:'#748465',water:'#477d83',sand:'#c9bc98',bare:'#ac9b82',wetland:'#7b9180',plaza:'#b5b1a4',playground:'#a99f8c',railway:'#918d85',track:'#ab9981','walk-cycle-paths':'#bbb4a3','unclassified-base':'#aaa99b'};
 if(colors[kind])material.color.set(colors[kind]);material.roughness=water?.36:1;material.metalness=water?.15:0;
 const before=material.onBeforeCompile;
 material.onBeforeCompile=(shader,renderer)=>{before?.call(material,shader,renderer);
 shader.vertexShader='varying vec3 canopySurfacePosition;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','canopySurfacePosition = (modelMatrix * vec4(transformed,1.0)).xyz;\n#include <project_vertex>');
 shader.fragmentShader=`varying vec3 canopySurfacePosition;
 float canopyHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float canopyNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(canopyHash(i),canopyHash(i+vec2(1,0)),f.x),mix(canopyHash(i+vec2(0,1)),canopyHash(i+vec2(1,1)),f.x),f.y);}
 `+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 surfaceP=canopySurfacePosition.xz;
 float nearDetail=1.0-smoothstep(60.0,240.0,distance(cameraPosition,canopySurfacePosition));
 float surfaceVariation=canopyNoise(surfaceP*${green?'.055':'.09'})-.5;
 float fineVariation=(canopyNoise(surfaceP*${green?'2.8':'5.0'})-.5)*nearDetail;
 diffuseColor.rgb*=1.0+surfaceVariation*${green?'.19':water?'.08':'.09'}+fineVariation*${green?'.14':'.09'};
 ${water?'float ripple=sin(surfaceP.x*.85+sin(surfaceP.y*.6))*sin(surfaceP.y*1.1);diffuseColor.rgb*=1.0+.045*ripple*nearDetail;':''}
 `);
 };
 const key=material.customProgramCacheKey.bind(material);material.customProgramCacheKey=()=>key()+'|analytic-ground-'+kind+'-v1';material.needsUpdate=true;
 material.userData.groundDetail={kind,method:'Analytic colour/roughness variation, no raster assets; not measured surface condition'};
 return material;
}
