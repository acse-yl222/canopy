"""Clip vector surfaces where source road elevations intersect terrain; no simulations or raster contours."""
from pathlib import Path
import json,gzip,base64,time
import numpy as np
import shapely as S
r=Path(__file__).resolve().parents[1];base=r/'scenes/imperial_corridor_8km/context';out=base/'terrain';d=json.loads((out/'terrain.json').read_text())['terrain'];h=np.frombuffer(base64.b64decode(d['z']),dtype='<i2').reshape(d['ny'],d['nx'])*d['scale_m']+d['base_m']
def height(x,y):
 u=np.clip((x-d['x0'])/d['dx'],0,d['nx']-1);v=np.clip((y-d['y0'])/d['dx'],0,d['ny']-1);a=np.minimum(np.floor(u).astype(int),d['nx']-2);b=np.minimum(np.floor(v).astype(int),d['ny']-2);fx=u-a;fy=v-b
 return h[b,a]*(1-fx)*(1-fy)+h[b,a+1]*fx*(1-fy)+h[b+1,a]*(1-fx)*fy+h[b+1,a+1]*fx*fy
D=json.loads(gzip.decompress((out/'road-network.json.gz').read_bytes()));cuts=[]
for lane in D['lanes']:
 p=np.array(lane['shape']);a=np.vstack([p[:1],p[:-1]]);b=np.vstack([p[1:],p[-1:]]);t=b[:,:2]-a[:,:2];lens=np.maximum(np.linalg.norm(t,axis=1),1e-8);normal=np.column_stack([-t[:,1],t[:,0]])/lens[:,None]*(lane['width']/2);left=p[:,:2]+normal;right=p[:,:2]-normal
 for i in range(1,len(p)):
  xy=np.array([left[i-1],right[i-1],right[i],left[i]]);z=p[[i-1,i-1,i,i],2]
  if np.any(z<height(xy[:,0],xy[:,1])+.4):cuts.append(S.make_valid(S.Polygon(xy)))
for j in D['junctions']:
 p=np.array(j['shape'])
 if len(p)>2 and np.any(p[:,2]<height(p[:,0],p[:,1])+.4):cuts.append(S.make_valid(S.Polygon(p[:,:2])))
print('Cut polygons',len(cuts),flush=True);roadcut=S.union_all(cuts);print('Road footprint union ready',flush=True)
manifest=json.loads((base/'vector_landscape/manifest.json').read_text());report=[]
for layer in manifest['layers']:
 p=base/'vector_landscape'/layer['file'];data=np.fromfile(p,dtype='<f4').reshape(-1,3,3);xy=data[:,:,[0,2]].copy();xy[:,:,1]*=-1
 polygons=S.polygons(xy);surface=S.union_all(S.make_valid(polygons));clipped=S.difference(surface,roadcut)
 # GEOS constrained triangulation respects every polygon boundary and hole.
 parts=S.get_parts(clipped);parts=parts[S.get_type_id(parts)==3]
 triangles=S.get_parts(S.constrained_delaunay_triangles(parts));coords=S.get_coordinates(triangles).reshape(-1,4,2)[:,:3,:]
 arr=np.zeros((len(coords),3,3),dtype='<f4');arr[:,:,0]=coords[:,:,0];arr[:,:,1]=float(np.median(data[:,:,1]));arr[:,:,2]=-coords[:,:,1]
 filename=layer['file']+'.gz';(out/filename).write_bytes(gzip.compress(arr.tobytes(),mtime=0));report.append({'name':layer['name'],'file':filename,'vertices':int(arr.shape[0]*3),'source_area_m2':float(S.area(surface)),'clipped_area_m2':float(S.area(clipped))});print(layer['name'],arr.shape[0],'triangles',flush=True)
(out/'surface-manifest.json').write_text(json.dumps({'method':'Exact polygon difference against source lane/junction footprints where road XYZ intersects terrain; constrained triangulation preserves boundaries and holes. No raster masks.','layers':report},indent=2)+'\n')
