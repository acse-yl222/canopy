# CANOPY
Physics Urban World — Imperial Corridor, London.

GitHub Pages serves the viewer and local vector assets. Original and compact physical data are stored in the upstream GitHub Release. A service worker routes large-asset requests through the existing CANOPY read-only data gateway for CORS compatibility. No full-dataset download or installation is required before entering Overview.

Open via HTTPS or a localhost server. Full building geometry is retained. Compact fields retain original sampled timestamps; spatial averaging smooths local extrema. Source provenance is included under scenes/imperial_corridor_8km/compact-provenance/.

The loading illustration is a stylized pixel-art campus, not a measured building model.

## Low-altitude UAV demo

Open `?shot=uavs` from the site root to update the local cache and enter the flight view. The 100 synthetic ground stations cover the 8 km domain. The original WavePDE solver produced 336 directed neighbouring routes, all reaching their endpoints and passing collision checks. The hard ceiling is 40 m above ground; the exported maximum is 36.8 m. Use **At building** for a close replay, or **100 stations** for the domain view.

Planning calls the original project's `wavepde.torch_backend.solver.solve` and `tracing.trace_paths` on 8 × 8 × 4 m voxels, with a 2048 m local crop per source. The 3-D wind is included in both propagation and characteristic tracing. No A* path or graph-search fallback is used. Raw PDE first-peak arrivals are retained separately from the integrated kinematic replay times. All 336 rounded exports were independently checked against 2 m terrain/building/tree columns at intervals of at most 0.5 m.

This is a model demonstration: frozen wind at 7,500 s is transferred by AGL from the original flat scene; there is no new CFD validation, rotor dynamics, real landing-site survey, full-domain optimality proof, or all-pairs routing. The 280 building examples have an obstructed direct reference between the same 12 m flight gates; avoidance may be lateral or vertical. See `assets/uav-wavepde-20261111/evidence.json` for exact source identities and limitations. Only derived replay assets are included here; raw arrival fields, source snapshot and the reproducible run remain on `ese-yl222`. The earlier A* export remains archived under `assets/uav-low-altitude-20261111` and is no longer the active demo.
