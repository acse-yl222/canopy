/** Pure time sampler for recorded, independently validated UAV paths. */
export const enuToWorld = ([x,y,z]) => [x,z,-y];
export function sampleRoute(route, seconds) {
  const times=route.times_s;
  const t=Math.max(0,Math.min(times.at(-1),seconds));
  let lo=0,hi=times.length-1;
  while(hi-lo>1){const m=(lo+hi)>>1;if(times[m]<=t)lo=m;else hi=m;}
  const f=(t-times[lo])/(times[hi]-times[lo]);
  const a=enuToWorld(route.points_enu_m[lo]),b=enuToWorld(route.points_enu_m[hi]);
  const p=a.map((v,k)=>v+(b[k]-v)*f);
  const w=route.wind_enu_mps[lo].map((v,k)=>v+(route.wind_enu_mps[hi][k]-v)*f);
  return {position:p,wind:w,heading:Math.atan2(b[0]-a[0],b[2]-a[2]),time:t};
}
export function validateReplay(data) {
  if(!['canopy-wind-astar-demo-1','canopy-wavepde-demo-1'].includes(data.schema_version))throw Error('Unsupported UAV replay version');
  const ids=new Set(data.stations.map(s=>s.id));
  if(ids.size!==100||data.stations.length!==100)throw Error('Expected 100 unique stations');
  const routeIds=new Set();
  for(const r of data.routes){
    if(routeIds.has(r.id)||!ids.has(r.from)||!ids.has(r.to))throw Error('Invalid route identity');routeIds.add(r.id);
    const n=r.points_enu_m.length;
    if(n<2||r.times_s.length!==n||r.wind_enu_mps.length!==n||r.times_s[0]!==0||!r.audit.passed||r.audit.max_agl_m>40)throw Error('Invalid route evidence');
    if(!r.points_enu_m.flat().every(Number.isFinite)||!r.wind_enu_mps.flat().every(Number.isFinite)||!r.times_s.every(Number.isFinite))throw Error('Non-finite route data');
    if(r.times_s.some((v,i)=>i>0&&v<=r.times_s[i-1]))throw Error('Non-increasing flight time');
  }
  if(data.schema_version==='canopy-wavepde-demo-1'&&data.routes.some(r=>r.solver_status!=='reached'||!r.closed_voxel_clear))throw Error('WavePDE solver evidence missing');
  if(!data.routes.length)throw Error('No validated routes');
  return data;
}
