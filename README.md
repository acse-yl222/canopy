# CANOPY
Physics Urban World — Imperial Corridor, London.

GitHub Pages serves the viewer and local vector assets. Original and compact physical data are stored in the upstream GitHub Release. A service worker routes large-asset requests through the existing CANOPY read-only data gateway for CORS compatibility. No full-dataset download or installation is required before entering Overview.

Open via HTTPS or a localhost server. Full building geometry is retained. Compact fields retain original sampled timestamps; spatial averaging smooths local extrema. Source provenance is included under scenes/imperial_corridor_8km/compact-provenance/.

The loading illustration is a stylized pixel-art campus, not a measured building model.

## Low-altitude UAV demo

Open `?shot=uavs` for 1,383 validated original WavePDE routes between 100 irregular synthetic stations, all shown in pale gold. **All routes** toggles the network; **100 stations** frames the domain; **At building** follows a selected avoidance example.

The solver grid is 4 × 4 × 4 m, with a 25 m AGL ceiling and 12 m takeoff/landing gates. Each station targets its nearest 30 destinations (3,000 directed attempts). Of these, 1,383 passed endpoint, original closed-voxel and independent 2 m terrain/building/tree-column checks. The displayed maximum is 22.95 m AGL. The 1,617 failed attempts remain in the retained run: 928 cycles, 264 blocked steps and 425 missing arrivals. The successful network connects all 100 stations. Station positions use seeded irregular sampling with at least 450 m separation, excluding buildings, trees, water and roads.

The original solver uses `gaussian_short`, a 0.1 s timestep, 4,000 steps, adaptive local crops and plain characteristic tracing. Native 8 m frozen wind at 7,500 s is interpolated onto the 4 m planner and transferred by height above terrain. This is not a new 4 m CFD simulation or a real flight validation. Kinematic replay time is separate from raw PDE first-peak time.

Browser paths are simplified for display with a maximum 0.25 m deviation and independently rechecked against the obstacle columns every 0.5 m. Full-resolution paths, arrival fields, failed attempts, source snapshot and provenance are retained on `ese-yl222` in `uav_wavepde_4m_20261111`. See `assets/uav-wavepde-4m-20261111/evidence.json`. Earlier exports remain archived in their original directories.
