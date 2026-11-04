Vector landscape — local build, no physics simulation

Source: local Downloads/Imperial Corridor 3D (Copy)/data/scene-meta.json,
original-viewer.html and buildings-0/1/2.json copied into source/.
Source metadata identifies Overture release 2026-10-21.0 and ODbL-derived layers.
The existing 09 patch SUMO vector road network is reused without raising its elevation.

Loaded source records:
13,893 trees; 824 hedge polylines (3,238 nonzero segments);
4,983 area records; 252 water records (163 polygons and 89 width-bearing lines);
15,893 footway/cycleway/path/pedestrian/steps/bridleway/track records.
Source tree value #3 is a deterministic appearance seed, NOT height.
The six original procedural high-detail tree builders and original species,
height-range, rotation and PRNG rules are reused. Tree species and dimensions
are display inferences, not measurements. No original random area infill trees
are generated. Hedge dimensions reuse the original 1.5 m high / 0.9 m wide rule.

Source polygons and all original coordinates are saved unchanged. Holes are
triangulated; there is no contour extraction from imagery or classification
rasters and no geometric simplification. Double precision clipping subtracts
mapped building footprints, motor roads, paths and water from land polygons.
Overlapping area classifications are resolved as recorded in manifest.json.
GPU meshes use Float32 coordinates, as does the existing viewer; source JSON
preserves its full precision. The neutral base is an unclassified geometry plane.

Coverage limitation: source scene half_m=4000, while the physics grid spans
8192 m. The outer 96 m rim has no land/vegetation source in this package and is
left neutral. No attempt is made to infer missing trees, canopy measurements,
hedge dimensions, or new terrain elevations. Surface and vegetation are flat
ENU presentation consistent with existing buildings and traffic.

Runtime: all assets, original tree builders, Three.js and generated meshes are
local. No external service or Python dependency is needed to view the result.
Rebuilding geometry only: from the model root run
.surface-build-env/bin/python tools/build_vector_landscape.py
Build dependency versions are in tools/vector-landscape-requirements.txt and
installed locally in .surface-build-env. This does not invoke a physics solver.

Viewer: independent road, vector-land and mapped-vegetation checkboxes.
Physics view hides surfaces and vegetation; Overview restores prior choices.
Existing physical field arrays, wind history, colorbars, traffic and building
materials are retained. Old ground PNGs remain on disk but are not requested.
Temperature remains hidden.
