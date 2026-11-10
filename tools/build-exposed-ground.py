"""Remove hidden unclassified ground below existing vector classes; preserve boundaries and holes."""
from pathlib import Path
import gzip,json,hashlib
import numpy as np
import shapely as S
root=Path(__file__).resolve().parents[1];base=root/'scenes/imperial_corridor_8km/context';terrain=base/'terrain';meta=json.loads((base/'vector_landscape/manifest.json').read_text());known=[];sources=[]
def polygon(l):
 p=terrain/(l['file']+'.gz');sources.append({'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()});a=np.frombuffer(gzip.decompress(p.read_bytes()),dtype='<f4').reshape(-1,3,3);xy=a[:,:,[0,2]].astype('f8');return S.union_all(S.make_valid(S.polygons(xy)))
for l in meta['layers']:
 shape=polygon(l)
 if l['name']=='unclassified-base':under=shape
 else:known.append(shape)
 print(l['name'],flush=True)
covered=S.union_all(known);exposed=S.difference(under,covered);parts=S.get_parts(exposed);parts=parts[S.get_type_id(parts)==3];tri=S.get_parts(S.constrained_delaunay_triangles(parts));xy=S.get_coordinates(tri).reshape(-1,4,2)[:,:3,:];a=np.zeros((len(xy),3,3),dtype='<f4');a[:,:,0]=xy[:,:,0];a[:,:,1]=-.15;a[:,:,2]=xy[:,:,1]
out=terrain/'unclassified-base-exposed.f32.gz';out.write_bytes(gzip.compress(a.tobytes(),mtime=0));report={'method':'Exact vector difference: existing unclassified terrain polygon minus union of all existing classified vector surfaces. No contour inference, simplification or raster image.','source_area_m2':float(S.area(under)),'exposed_area_m2':float(S.area(exposed)),'overlap_remaining_m2':float(S.area(S.intersection(exposed,covered))),'triangles':len(xy),'sources':sources,'output':out.name,'output_sha256':hashlib.sha256(out.read_bytes()).hexdigest()};(terrain/'exposed-ground-provenance.json').write_text(json.dumps(report,indent=2));print(json.dumps({k:v for k,v in report.items() if k!='sources'},indent=2))
