# CANOPY
Physics Urban World — Imperial Corridor, London.

GitHub Pages serves the viewer and local vector assets. Original and compact physical data are stored in the upstream GitHub Release. A service worker routes large-asset requests through the existing CANOPY read-only data gateway for CORS compatibility. No full-dataset download or installation is required before entering Overview.

Open via HTTPS or a localhost server. Full building geometry is retained. Compact fields retain original sampled timestamps; spatial averaging smooths local extrema. Source provenance is included under scenes/imperial_corridor_8km/compact-provenance/.

The loading illustration is a stylized pixel-art campus, not a measured building model.

## Low-altitude UAV demo

Open `?shot=uavs` from the site root to update the local cache and enter the flight view. The 100 synthetic ground stations cover the 8 km domain. The workstation-computed export contains 336 directed neighbouring routes (80 with a building-blocked direct line), with approximately 24 m cruise height and a hard 40 m AGL limit. Use **At building** for a close replay of the default detour, or **100 stations** for the domain view.

Planning uses wind-weighted A* on an 8 m terrain-following surface, frozen 3-D model wind at 7,500 s, conservative obstacle padding, and independent checks against 2 m columns. This is a model demonstration: wind is transferred by AGL from the original flat scene; there is no new CFD validation, rotor dynamics, real landing-site survey, or all-pairs routing. See `assets/uav-low-altitude-20261111/evidence.json` for source identities and limitations. Only derived replay assets are included here; retained inputs and the reproducible run remain on `ese-yl222`.
